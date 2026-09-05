import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import '../lib/services/local_watermark_renderer.dart';
import '../lib/services/watermark_photo_export.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  LocalWatermarkResult photo() => LocalWatermarkResult(jpeg: Uint8List.fromList([255,216,255,217]), metadata: const {'code':'TEMUAN/001','tahap':'Temuan','capturedAt':'2026-09-06T01:00:00Z'});
  setUp(() { debugDefaultTargetPlatformOverride = TargetPlatform.android; });
  tearDown(() {
    messenger.setMockMethodCallHandler(WatermarkPhotoExport.channel, null);
    debugDefaultTargetPlatformOverride = null;
  });
  test('safe filename retains record identity', () {
    expect(WatermarkPhotoExport.filename(photo().metadata), startsWith('SiSi_TEMUAN_001_Temuan_'));
    expect(WatermarkPhotoExport.filename({'code':'../x'}), isNot(contains('/')));
    expect(WatermarkPhotoExport.filename({'code':List.filled(200,'x').join()}).length, lessThanOrEqualTo(114));
  });
  test('sends watermark bytes and reports confirmed save', () async {
    messenger.setMockMethodCallHandler(WatermarkPhotoExport.channel, (call) async {
      expect(call.method, 'saveWatermarkedJpeg');
      expect(call.arguments['bytes'], orderedEquals(photo().jpeg));
      expect(call.arguments['filename'], endsWith('.jpg'));
      return {'saved': true};
    });
    expect(await WatermarkPhotoExport.save(photo()), true);
  });
  test('cancel is not a successful download', () async {
    messenger.setMockMethodCallHandler(WatermarkPhotoExport.channel, (_) async => {'saved':false});
    expect(await WatermarkPhotoExport.save(photo()), false);
  });
  test('invalid image never opens save dialog', () async {
    var calls = 0;
    messenger.setMockMethodCallHandler(WatermarkPhotoExport.channel, (_) async { calls++; return {'saved':true}; });
    await expectLater(WatermarkPhotoExport.save(LocalWatermarkResult(jpeg:Uint8List(4),metadata:const {})), throwsFormatException);
    expect(calls, 0);
  });
  test('native errors are visible and do not lock the next attempt', () async {
    messenger.setMockMethodCallHandler(WatermarkPhotoExport.channel, (_) async => throw PlatformException(code:'WRITE_FAILED',message:'Penyimpanan penuh'));
    await expectLater(WatermarkPhotoExport.save(photo()), throwsStateError);
    messenger.setMockMethodCallHandler(WatermarkPhotoExport.channel, (_) async => {'saved':true});
    expect(await WatermarkPhotoExport.save(photo()), true);
  });
}
