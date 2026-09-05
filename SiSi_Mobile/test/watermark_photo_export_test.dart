import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import '../lib/services/local_watermark_data.dart';
import '../lib/services/local_watermark_renderer.dart';
import '../lib/services/watermark_photo_export.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  Map<String,dynamic> metadata(WatermarkTeam team) => LocalWatermarkData(
    team:team,code:team==WatermarkTeam.yandal?'Y-P0.001':team==WatermarkTeam.row?'EXE-001':'TEM-001',
    ulp:'Toboali',capturedAt:DateTime.utc(2026,9,6,1),createdAt:DateTime.utc(2026,9,6),
    latitude:-3,longitude:106,isMocked:false,penyulang:'Palas',section:'Section 1',
    jenisPekerjaan:'Pemeliharaan',daerah:'Palas',subTim:'Yandal 13',petugas:'Petugas uji',nomorGardu:'TB-021',segmen:'Segmen 1',temuan:'Sambungan longgar',
  ).toJson()..['renderer']='flutter-local';
  LocalWatermarkResult photo({Map<String,dynamic>? data, Uint8List? bytes}) {
    final jpeg=bytes??Uint8List.fromList([255,216,255,217]);
    return LocalWatermarkResult(jpeg:jpeg,metadata:{...metadata(WatermarkTeam.inspeksiGardu),'watermarkSha256':sha256.convert(jpeg).toString(),...?data});
  }
  setUp(() { debugDefaultTargetPlatformOverride = TargetPlatform.android; });
  tearDown(() { messenger.setMockMethodCallHandler(WatermarkPhotoExport.channel, null); debugDefaultTargetPlatformOverride = null; });
  test('all requested team formats pass when complete',(){
    for(final t in WatermarkTeam.values)expect(WatermarkPhotoExport.missingIndicators(metadata(t)),isEmpty);
  });
  test('all common required values block when absent',(){
    for(final field in ['code','ulp','capturedAt','createdAt','latitude','longitude','isMocked','penyulang','section']){
      final m=metadata(WatermarkTeam.row)..remove(field);
      expect(WatermarkPhotoExport.missingIndicators(m),isNotEmpty,reason:field);
    }
  });
  test('only the relevant team indicators are required',(){
    final required={WatermarkTeam.yandal:['jenisPekerjaan','daerah','subTim','petugas'],WatermarkTeam.row:['jenisPekerjaan'],WatermarkTeam.inspeksiGardu:['nomorGardu','temuan'],WatermarkTeam.inspeksiJaringan:['segmen','temuan']};
    for(final e in required.entries){for(final field in e.value){
      expect(WatermarkPhotoExport.missingIndicators(metadata(e.key)..[field]=' '),isNotEmpty,reason:'${e.key}: $field');
    }}
    final row=metadata(WatermarkTeam.row)..remove('temuan')..remove('nomorGardu')..remove('segmen')..remove('daerah')..remove('petugas')..remove('subTim');
    expect(WatermarkPhotoExport.missingIndicators(row),isEmpty);
  });
  test('placeholders, local IDs and mock locations are not complete',(){
    for(final value in ['-','Belum tersedia','null','N/A'])expect(WatermarkPhotoExport.missingIndicators(metadata(WatermarkTeam.row)..['penyulang']=value),isNotEmpty);
    for(final value in ['LOCAL-P0-12','DRAF-1','DRAFT_123'])expect(WatermarkPhotoExport.missingIndicators(metadata(WatermarkTeam.yandal)..['code']=value),isNotEmpty);
    expect(WatermarkPhotoExport.missingIndicators(metadata(WatermarkTeam.row)..['isMocked']=true),contains('GPS non-simulasi'));
  });
  test('zero coordinates allowed, invalid coordinates and naive dates blocked',(){
    expect(WatermarkPhotoExport.missingIndicators(metadata(WatermarkTeam.row)..['latitude']=0..['longitude']=0),isEmpty);
    expect(WatermarkPhotoExport.missingIndicators(metadata(WatermarkTeam.row)..['latitude']=double.nan),isNotEmpty);
    expect(WatermarkPhotoExport.missingIndicators(metadata(WatermarkTeam.row)..['capturedAt']='2026-09-06'),isNotEmpty);
  });
  test('incomplete metadata never opens native export',()async{
    var calls=0;messenger.setMockMethodCallHandler(WatermarkPhotoExport.channel,(_)async{calls++;return {'saved':true};});
    await expectLater(WatermarkPhotoExport.save(photo(data:{'temuan':''})),throwsStateError);expect(calls,0);
  });
  test('save sends watermark bytes only after checks',()async{
    messenger.setMockMethodCallHandler(WatermarkPhotoExport.channel,(call)async{expect(call.method,'saveWatermarkedJpeg');expect(call.arguments['bytes'],orderedEquals(photo().jpeg));return {'saved':true};});
    expect(await WatermarkPhotoExport.save(photo()),true);
  });
  test('cancel is not reported as download success',()async{
    messenger.setMockMethodCallHandler(WatermarkPhotoExport.channel,(_)async=>{'saved':false});expect(await WatermarkPhotoExport.save(photo()),false);
  });
  test('invalid JPEG and mismatched render hash are blocked',()async{
    await expectLater(WatermarkPhotoExport.save(photo(bytes:Uint8List(4))),throwsFormatException);
    await expectLater(WatermarkPhotoExport.save(photo(data:{'watermarkSha256':'wrong'})),throwsStateError);
  });
  test('native failure allows retry',()async{
    messenger.setMockMethodCallHandler(WatermarkPhotoExport.channel,(_)async=>throw PlatformException(code:'WRITE_FAILED',message:'Penuh'));
    await expectLater(WatermarkPhotoExport.save(photo()),throwsStateError);
    messenger.setMockMethodCallHandler(WatermarkPhotoExport.channel,(_)async=>{'saved':true});expect(await WatermarkPhotoExport.save(photo()),true);
  });
  test('filename sanitization',(){
    expect(WatermarkPhotoExport.filename({'code':'../x'}),isNot(contains('/')));
    expect(WatermarkPhotoExport.filename({'code':List.filled(200,'x').join()}).length,lessThanOrEqualTo(114));
  });
}
