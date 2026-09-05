import 'package:flutter_test/flutter_test.dart';
import '../lib/screens/yandal_photo_screen.dart';

void main(){
  Map<String,dynamic> complete()=>{
    'localId':'LOCAL-P0-1','kodeP0':'Y13-P0.001','createdAt':'2026-09-06T00:00:00Z',
    'photoMetadata':{'sebelum':{
      'capturedAt':'2026-09-06T00:05:00Z','latitude':-3.0,'longitude':106.0,'accuracyMeters':4.0,'isMocked':false,
      'ulp':'Toboali','subTim':'Yandal 13','petugas':'Petugas A, Petugas B','penyulang':'Palas','section':'Section 1',
      'jenisPekerjaan':'Pengecekan Gardu','daerah':'Palas','photoSource':'camera',
    }},
  };
  test('complete official record can prepare watermark',(){expect(YandalPhotoMetadata.missing(complete(),'sebelum'),isEmpty);});
  test('local IDs are never substituted for official P0',(){final d=complete()..remove('kodeP0');expect(YandalPhotoMetadata.fromDraft(d,'sebelum')['code'],'');expect(YandalPhotoMetadata.missing(d,'sebelum'),contains('Kode P0'));});
  test('historical drafts cannot invent capture time, GPS or crew',(){final d={'localId':'LOCAL-P0-1','createdAt':'2026-09-06T00:00:00Z','petugas':['Current person'],'penyulang':'Palas'};final m=YandalPhotoMetadata.fromDraft(d,'sebelum');expect(m['capturedAt'],isNull);expect(m['isMocked'],isNull);expect(m['petugas'],isNull);expect(YandalPhotoMetadata.missing(d,'sebelum'),isNotEmpty);});
  test('metadata is slot-specific and frozen',(){final d=complete();d['penyulang']='Other feeder';expect(YandalPhotoMetadata.fromDraft(d,'sebelum')['penyulang'],'Palas');expect(YandalPhotoMetadata.missing(d,'pekerjaan'),isNotEmpty);});
  test('mock GPS blocks export path',(){final d=complete();((d['photoMetadata'] as Map)['sebelum'] as Map)['isMocked']=true;expect(YandalPhotoMetadata.missing(d,'sebelum'),contains('GPS non-simulasi'));});
}
