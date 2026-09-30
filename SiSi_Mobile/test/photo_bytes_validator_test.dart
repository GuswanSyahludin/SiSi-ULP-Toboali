import 'dart:io';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import '../lib/services/photo_bytes_validator.dart';
import '../lib/services/petugas_photo_store.dart';

/// Only the stat/stream boundary is mocked, never the validation implementation.
class _ReadFixture implements File {
  final int declaredLength;
  final List<List<int>> chunks;
  int lengthCalls = 0;
  int openCalls = 0;
  int yielded = 0;
  bool cancelled = false;
  _ReadFixture(this.declaredLength, this.chunks);
  @override
  Future<int> length() async { lengthCalls++; return declaredLength; }
  @override
  Stream<List<int>> openRead([int? start, int? end]) async* {
    openCalls++;
    try {
      for (final chunk in chunks) { yielded++; yield chunk; }
    } finally { cancelled = true; }
  }
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final image = img.Image(width: 320, height: 320);
  final jpeg = Uint8List.fromList(img.encodeJpg(image, quality: 90));
  final digest = sha256.convert(jpeg).toString();

  test('accepts a decodable original image', () {
    expect(() => PhotoBytesValidator.validateOriginal(jpeg), returnsNormally);
  });

  test('rejects SOI-only or truncated JPEG bytes', () {
    final truncated = Uint8List.fromList([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(() => PhotoBytesValidator.validateJpeg(truncated), throwsFormatException);
  });

  test('rejects non-image bytes even when named as JPEG', () {
    expect(() => PhotoBytesValidator.validateOriginal(Uint8List.fromList([1, 2, 3, 4])), throwsFormatException);
  });

  test('rejects a JPEG without a complete EOI marker', () {
    final noEoi = Uint8List.fromList(jpeg.sublist(0, jpeg.length - 2));
    expect(() => PhotoBytesValidator.validateJpeg(noEoi), throwsFormatException);
  });

  test('oversized or empty declared file is rejected before opening bytes', () async {
    for (final size in [0, PhotoBytesValidator.maxBytes + 1]) {
      final file = _ReadFixture(size, []);
      await expectLater(PhotoBytesValidator.readBoundedFile(file), throwsFormatException);
      expect(file.openCalls, 0);
    }
  });

  test('growth beyond byte budget cancels stream before retaining excess', () async {
    final chunk = Uint8List(1024 * 1024);
    final file = _ReadFixture(1, List<List<int>>.filled(42, chunk));
    await expectLater(PhotoBytesValidator.readBoundedFile(file), throwsFormatException);
    expect(file.yielded, 41);
    expect(file.cancelled, isTrue);
  });

  test('stat and streamed length must agree including shrink and empty', () async {
    for (final file in [
      _ReadFixture(3, [[1, 2]]),
      _ReadFixture(1, [[1, 2]]),
      _ReadFixture(1, []),
    ]) {
      await expectLater(PhotoBytesValidator.readBoundedFile(file), throwsFormatException);
    }
  });

  test('reads chunks in order with no unbounded readAsBytes fallback', () async {
    final file = _ReadFixture(4, [[1, 2], [3, 4]]);
    expect(await PhotoBytesValidator.readBoundedFile(file), orderedEquals([1, 2, 3, 4]));
    expect(file.openCalls, 1);
  });

  test('missing or malformed checksum rejects before file access', () async {
    for (final hash in <Object?>[null, '', 'abc123', 42, 'z' * 64]) {
      final file = _ReadFixture(jpeg.length, [jpeg]);
      await expectLater(PhotoBytesValidator.readVerifiedOriginal(file, hash), throwsFormatException);
      expect(file.lengthCalls, 0);
      expect(file.openCalls, 0);
    }
  });

  test('valid frozen checksum returns the exact verified image bytes', () async {
    final file = _ReadFixture(jpeg.length, [jpeg.sublist(0, 10), jpeg.sublist(10)]);
    final bytes = await PhotoBytesValidator.readVerifiedOriginal(file, digest.toUpperCase());
    expect(bytes, orderedEquals(jpeg));
    expect(file.openCalls, 1);
  });

  test('different valid image with old checksum is rejected', () async {
    final png = Uint8List.fromList(img.encodePng(image));
    final file = _ReadFixture(png.length, [png]);
    await expectLater(PhotoBytesValidator.readVerifiedOriginal(file, digest), throwsFormatException);
  });

  test('matching hash cannot authorize undecodable image bytes', () async {
    final bytes = Uint8List.fromList([1, 2, 3, 4]);
    final file = _ReadFixture(bytes.length, [bytes]);
    await expectLater(PhotoBytesValidator.readVerifiedOriginal(file, sha256.convert(bytes).toString()), throwsFormatException);
  });

  test('real file replacement is rejected without changing file or metadata', () async {
    final dir = await Directory.systemTemp.createTemp('sisi-photo-integrity-test-');
    try {
      final file = File('${dir.path}/original.jpg');
      await file.writeAsBytes(jpeg);
      final frozen = <String, dynamic>{'originalSha256': digest};
      expect(await PhotoBytesValidator.readVerifiedOriginal(file, frozen['originalSha256']), orderedEquals(jpeg));
      final replacement = Uint8List.fromList(img.encodePng(image));
      await file.writeAsBytes(replacement);
      await expectLater(PhotoBytesValidator.readVerifiedOriginal(file, frozen['originalSha256']), throwsFormatException);
      expect(await file.readAsBytes(), orderedEquals(replacement));
      expect(frozen['originalSha256'], digest);
    } finally { await dir.delete(recursive: true); }
  });

  test('oversize capture never requests private storage or appends an outbox', () async {
    const channel = MethodChannel('id.co.ulptoboali.sisi/photo_export');
    var calls = 0;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (_) async {
      calls++; throw StateError('must not request a directory');
    });
    try {
      final file = _ReadFixture(PhotoBytesValidator.maxBytes + 1, []);
      await expectLater(PetugasPhotoStore.saveOriginal(
        owner: 'petugas|ulp toboali', source: file, metadata: {'team': 'yandal'},
      ), throwsFormatException);
      expect(calls, 0); expect(file.openCalls, 0);
    } finally {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
    }
  });

  test('Yandal render consumes verified bytes instead of reopening source path', () {
    final source = File('lib/screens/yandal_photo_screen.dart').readAsStringSync();
    final check = source.indexOf('PhotoBytesValidator.readVerifiedOriginal(');
    final render = source.indexOf('LocalWatermarkRenderer.render(');
    expect(check, greaterThanOrEqualTo(0));
    expect(render, greaterThan(check));
    expect(source, contains("m['originalSha256']"));
    expect(source, contains('originalBytes: originalBytes'));
    expect(source, isNot(contains('readAsBytes()')));
  });
}
