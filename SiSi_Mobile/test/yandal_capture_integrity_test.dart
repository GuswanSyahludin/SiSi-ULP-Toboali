import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:shared_preferences/shared_preferences.dart';

import '../lib/db/repositories/delta_sync_repository.dart';
import '../lib/db/repositories/yandal_local_repository.dart';
import '../lib/screens/yandal_photo_screen.dart';
import '../lib/services/local_watermark_data.dart';
import '../lib/services/local_watermark_renderer.dart';
import '../lib/services/petugas_photo_store.dart';
import '../lib/services/photo_bytes_validator.dart';

// Local draft persistence must not access the server mirror or activate a DB.
class _UnusedMirror implements DeltaSyncRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('id.co.ulptoboali.sisi/photo_export');
  const owner = 'petugas|ulp toboali';
  const shiftKey = 'ULP Toboali|Yandal 13|2026-09-30|1';
  const slots = {
    'sebelum': 'fotoSebelum',
    'pekerjaan': 'fotoPekerjaan',
    'selesai': 'fotoSelesai',
  };
  final jpeg = Uint8List.fromList(img.encodeJpg(img.Image(width: 1200, height: 900)));
  late Directory temp;
  late Directory privateBase;
  late YandalLocalRepository repository;
  var directoryCalls = 0;

  Map<String, dynamic> capture(String slot) => PetugasPhotoStore.descriptor(
    team: WatermarkTeam.yandal,
    slot: slot,
    fields: {
      'createdAt': '2026-09-30T01:00:00Z',
      'capturedAt': '2026-09-30T01:05:00Z',
      'captureTimeSource': 'camera-return',
      'gpsCapturedAt': '2026-09-30T01:05:01Z',
      'latitude': -3.0, 'longitude': 106.0,
      'accuracyMeters': 4.0, 'isMocked': false,
      'ulp': 'ULP Toboali', 'subTim': 'Yandal 13',
      'petugas': 'Petugas uji', 'penyulang': 'Palas', 'section': 'Section 1',
      'jenisPekerjaan': 'Pengecekan Gardu', 'daerah': 'Palas',
      'photoSource': 'camera',
    },
  );

  Map<String, dynamic> draftFor(String slot, PetugasPhoto saved) => {
    'localId': 'LOCAL-P0-test', 'shiftKey': shiftKey,
    'createdAt': saved.metadata['createdAt'],
    slots[slot]!: saved.path,
    'photoMetadata': {slot: Map<String, dynamic>.from(saved.metadata)},
  };

  Future<PetugasPhoto> saveCapture(String slot) async {
    final source = File('${temp.path}/camera-$slot.jpg');
    await source.writeAsBytes(jpeg, flush: true);
    final saved = await PetugasPhotoStore.saveOriginal(
      owner: owner, source: source, metadata: capture(slot),
    );
    // Simulate picker/cache cleanup; subsequent work must use the private copy.
    await source.delete();
    return saved;
  }

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    temp = await Directory.systemTemp.createTemp('sisi-yandal-capture-');
    privateBase = await Directory('${temp.path}/private').create();
    directoryCalls = 0;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      if (call.method != 'privatePhotoDirectory') {
        throw StateError('Unexpected platform method: ${call.method}');
      }
      directoryCalls++;
      return privateBase.path;
    });
    repository = YandalLocalRepository(mirror: _UnusedMirror());
  });

  tearDown(() async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
    await temp.delete(recursive: true);
  });

  for (final slot in slots.keys) {
    test('$slot: private capture survives draft reload and feeds verified render bytes', () async {
      final saved = await saveCapture(slot);
      final hash = sha256.convert(jpeg).toString();
      expect(saved.path, startsWith('${privateBase.path}/${PetugasPhotoStore.key(owner)}/'));
      expect(saved.metadata['originalSha256'], hash);
      expect(saved.metadata['team'], 'yandal');
      expect(saved.metadata['tahap'], slot);
      final sidecar = File('${File(saved.path).parent.path}/capture.json');
      final frozenSidecar = await sidecar.readAsString();
      expect(jsonDecode(frozenSidecar)['originalSha256'], hash);
      final pending = await PetugasPhotoStore.pendingOutbox(owner);
      expect(pending, hasLength(1));
      expect(pending.single['path'], saved.path);
      expect(pending.single['metadata']['originalSha256'], hash);
      expect(pending.single['state'], 'pending');

      await repository.saveDraft(draftFor(slot, saved));
      final reloadedRepository = YandalLocalRepository(mirror: _UnusedMirror());
      final reloaded = (await reloadedRepository.drafts(shiftKey)).single;
      expect(reloaded[slots[slot]], saved.path);
      expect(YandalPhotoMetadata.missing(reloaded, slot), contains('Kode P0'));
      // Simulate receipt assignment only, never regenerate capture metadata.
      reloaded['kodeP0'] = 'Y13-P0.001';
      await reloadedRepository.saveDraft(reloaded);
      final accepted = (await reloadedRepository.drafts(shiftKey)).single;
      final metadata = YandalPhotoMetadata.fromDraft(accepted, slot);
      expect(YandalPhotoMetadata.missing(accepted, slot), isEmpty);
      expect(metadata['originalSha256'], hash);
      expect(metadata['capturedAt'], saved.metadata['capturedAt']);
      expect(metadata['gpsCapturedAt'], saved.metadata['gpsCapturedAt']);
      expect(metadata['latitude'], saved.metadata['latitude']);
      expect(metadata['petugas'], saved.metadata['petugas']);
      expect(YandalPhotoMetadata.fromDraft(accepted, 'absent')['originalSha256'], isNull);
      final verified = await PhotoBytesValidator.readVerifiedOriginal(
        File(accepted[slots[slot]] as String), metadata['originalSha256'],
      );
      expect(verified, orderedEquals(jpeg));
      // Real renderer integration, not only an assertion about a source string.
      final result = await LocalWatermarkRenderer.render(
        originalBytes: verified, data: PetugasPhotoStore.toData(metadata),
      );
      PhotoBytesValidator.validateJpeg(result.jpeg);
      expect(result.metadata['originalSha256'], hash);
      expect(result.metadata['code'], 'Y13-P0.001');
      expect(await File(saved.path).readAsBytes(), orderedEquals(jpeg));
      expect(await sidecar.readAsString(), frozenSidecar);
    });
  }

  test('replaced private original fails after reload without rewriting frozen metadata', () async {
    final saved = await saveCapture('sebelum');
    await repository.saveDraft(draftFor('sebelum', saved));
    final originalPreferences = (await SharedPreferences.getInstance()).getString('yandal_local_drafts_v1');
    final sidecar = File('${File(saved.path).parent.path}/capture.json');
    final before = await sidecar.readAsString();
    final replacement = Uint8List.fromList(img.encodePng(img.Image(width: 320, height: 320)));
    await File(saved.path).writeAsBytes(replacement, flush: true);
    final reloaded = (await repository.drafts(shiftKey)).single;
    final metadata = YandalPhotoMetadata.fromDraft(reloaded, 'sebelum');
    await expectLater(PhotoBytesValidator.readVerifiedOriginal(
      File(reloaded['fotoSebelum'] as String), metadata['originalSha256'],
    ), throwsFormatException);
    expect(await sidecar.readAsString(), before);
    expect((await SharedPreferences.getInstance()).getString('yandal_local_drafts_v1'), originalPreferences);
    expect(await File(saved.path).readAsBytes(), orderedEquals(replacement));
  });

  test('legacy draft without checksum is rejected and never backfilled', () async {
    final saved = await saveCapture('sebelum');
    final legacy = draftFor('sebelum', saved);
    ((legacy['photoMetadata'] as Map)['sebelum'] as Map).remove('originalSha256');
    await repository.saveDraft(legacy);
    final before = (await SharedPreferences.getInstance()).getString('yandal_local_drafts_v1');
    final reloaded = (await repository.drafts(shiftKey)).single;
    final metadata = YandalPhotoMetadata.fromDraft(reloaded, 'sebelum');
    expect(metadata['originalSha256'], isNull);
    await expectLater(PhotoBytesValidator.readVerifiedOriginal(
      File(reloaded['fotoSebelum'] as String), metadata['originalSha256'],
    ), throwsFormatException);
    expect((await SharedPreferences.getInstance()).getString('yandal_local_drafts_v1'), before);
    expect(await File(saved.path).readAsBytes(), orderedEquals(jpeg));
  });

  test('invalid replacement cannot overwrite an existing capture or append its outbox', () async {
    final saved = await saveCapture('sebelum');
    await repository.saveDraft(draftFor('sebelum', saved));
    final before = (await SharedPreferences.getInstance()).getString('yandal_local_drafts_v1');
    final callsBefore = directoryCalls;
    final invalid = File('${temp.path}/invalid.jpg');
    await invalid.writeAsBytes([1, 2, 3, 4]);
    await expectLater(PetugasPhotoStore.saveOriginal(
      owner: owner, source: invalid, metadata: capture('sebelum'),
    ), throwsFormatException);
    expect(directoryCalls, callsBefore);
    expect((await SharedPreferences.getInstance()).getString('yandal_local_drafts_v1'), before);
    expect(await File(saved.path).readAsBytes(), orderedEquals(jpeg));
    final pending = await PetugasPhotoStore.pendingOutbox(owner);
    expect(pending, hasLength(1));
    expect(pending.single['path'], saved.path);
  });

  test('screen publishes saved path and metadata only after successful persistence', () {
    final source = File('lib/screens/yandal_screen.dart').readAsStringSync();
    final take = source.substring(source.indexOf('Future<void> _take('), source.indexOf('Future<void> _save('));
    final persist = take.indexOf('final saved=await PetugasPhotoStore.saveOriginal(');
    final publish = take.indexOf('photos[slot]=File(saved.path)');
    expect(persist, greaterThanOrEqualTo(0));
    expect(publish, greaterThan(persist));
    expect(take.substring(persist, publish), contains('if(!mounted)return;'));
    expect(take, contains('owner:owner,source:File(image.path),metadata:metadata'));
    expect(take, contains('captureMetadata[slot]=Map<String,dynamic>.from(saved.metadata)'));
    expect(take, isNot(contains('photos[slot]=File(image.path)')));
    expect(take.indexOf('final owner=PetugasPhotoStore.owner(session)'), lessThan(take.indexOf('await AccurateLocationService.capture()')));
    expect(source, contains("'photoMetadata':{for(final e in captureMetadata.entries)e.key:Map<String,dynamic>.from(e.value)}"));
  });
}
