import 'package:flutter_test/flutter_test.dart';
import '../lib/services/local_watermark_data.dart';
import '../lib/services/petugas_photo_store.dart';

void main(){
  Map<String,dynamic> sample(WatermarkTeam team)=>PetugasPhotoStore.descriptor(team:team,slot:'Temuan',fields:{'ulp':'Toboali','createdAt':'2026-09-06T00:00:00Z','capturedAt':'2026-09-06T00:10:00Z','latitude':-3.0,'longitude':106.0,'isMocked':false,'penyulang':'Palas','section':'1','jenisPekerjaan':'Pemeliharaan','daerah':'Palas','subTim':'Yandal 13','petugas':'Petugas','nomorGardu':'TB-021','segmen':'3','temuan':'Sambungan longgar','photoSource':'camera','originalSha256':'original-test-hash'});
  test('official receipt fills only the record code',(){
    final frozen=sample(WatermarkTeam.inspeksiGardu);
    final bound=PetugasPhotoStore.withReceipt(frozen,'TEM-001');
    expect(frozen['code'],'');expect(bound['code'],'TEM-001');
    for(final k in frozen.keys.where((k)=>k!='code'))expect(bound[k],frozen[k]);
    expect(bound['codeLabel'],'Kode Temuan');expect(PetugasPhotoStore.missing(bound),isEmpty);
  });
  test('each domain keeps its own code label',(){
    expect(sample(WatermarkTeam.row)['codeLabel'],'Kode Eksekusi');
    expect(sample(WatermarkTeam.yandal)['codeLabel'],'Kode P0');
    expect(sample(WatermarkTeam.inspeksiJaringan)['codeLabel'],'Kode Temuan');
  });
  test('gallery import and legacy metadata never gain artificial capture values',(){
    final m=PetugasPhotoStore.withReceipt(sample(WatermarkTeam.row),'ROW-1')..remove('capturedAt')..remove('isMocked')..['photoSource']='gallery';
    final missing=PetugasPhotoStore.missing(m);
    expect(missing,contains('Jam, hari, dan tanggal pengambilan'));
    expect(missing,contains('GPS non-simulasi'));
    expect(missing,contains('Foto kamera dengan waktu pengambilan tersimpan'));
  });
  test('empty and provisional official codes stay blocked',(){
    for(final id in ['', 'LOCAL-P0-1','DRAFT-1'])expect(PetugasPhotoStore.missing(PetugasPhotoStore.withReceipt(sample(WatermarkTeam.yandal),id)),isNotEmpty);
  });
  test('account and reference keys do not share paths',(){
    expect(PetugasPhotoStore.key('a|Toboali'),isNot(PetugasPhotoStore.key('b|Toboali')));
    expect(PetugasPhotoStore.key('row|ID|Sebelum'),isNot(PetugasPhotoStore.key('row|ID|Sesudah')));
  });
  test('required finding and segment remain mandatory',(){
    final m=PetugasPhotoStore.withReceipt(sample(WatermarkTeam.inspeksiJaringan),'TEM-2')..['segmen']=''..['temuan']='';
    expect(PetugasPhotoStore.missing(m),containsAll(['Segmen','Temuan']));
  });
}
