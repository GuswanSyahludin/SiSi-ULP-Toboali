import 'dart:convert';
import 'package:drift/drift.dart' show Value;
import 'package:http/http.dart' as http;
import '../../services/api_service.dart';
import '../app_database.dart';
import '../db_provider.dart';

class MasterGarduRepository{
  MasterGarduDao get _dao=>DbProvider.instance.masterGarduDao;
  Future<Map<String,dynamic>> download(String token,{String ulp=''})async{try{
    final uri=Uri.parse('${ApiService.baseUrl}?mobile=1&action=getMasterGarduMobile&token=${Uri.encodeComponent(token)}&ulp=${Uri.encodeComponent(ulp)}');
    final r=await http.get(uri).timeout(const Duration(seconds:60));final res=Map<String,dynamic>.from(jsonDecode(r.body));if(res['success']!=true)return res;
    final rows=<MasterGardusCompanion>[];for(final raw in List<dynamic>.from(res['list']??const[])){final m=Map<String,dynamic>.from(raw as Map);if((m['gardu']??'').toString().trim().isNotEmpty)rows.add(_companion(m));}
    await _dao.gantiSemua(rows);return{'success':true,'jumlah':rows.length};
  }catch(e){return{'success':false,'message':'Gagal sinkron Master Gardu: $e'};}}

  MasterGardusCompanion _companion(Map<String,dynamic> m){String s(String k)=>(m[k]??'').toString();return MasterGardusCompanion.insert(
    ulp:Value(s('ulp')),gardu:s('gardu'),alamat:Value(s('alamat')),jenisGardu:Value(s('jenisGardu')),merk:Value(s('merk')),kapasitasKva:Value(s('kapasitasKva')),noSeri:Value(s('noSeri')),tahunTrafo:Value(s('tahunTrafo')),typeSeal:Value(s('typeSeal')),merkPhbTr:Value(s('merkPhbTr')),nomorSeriPhbTr:Value(s('nomorSeriPhbTr')),tahunPhbTr:Value(s('tahunPhbTr')),jamUkurWbp:Value(s('jamUkurWbp')),tanggalPengukuran:Value(s('tanggalPengukuran')),kepemilikan:Value(s('kepemilikan')),
    wbpRs:Value(s('wbpRs')),wbpSt:Value(s('wbpSt')),wbpTr:Value(s('wbpTr')),wbpRn:Value(s('wbpRn')),wbpSn:Value(s('wbpSn')),wbpTn:Value(s('wbpTn')),wbpR:Value(s('wbpR')),wbpS:Value(s('wbpS')),wbpT:Value(s('wbpT')),wbpN:Value(s('wbpN')),
    lwbpRs:Value(s('lwbpRs')),lwbpSt:Value(s('lwbpSt')),lwbpTr:Value(s('lwbpTr')),lwbpRn:Value(s('lwbpRn')),lwbpSn:Value(s('lwbpSn')),lwbpTn:Value(s('lwbpTn')),lwbpR:Value(s('lwbpR')),lwbpS:Value(s('lwbpS')),lwbpT:Value(s('lwbpT')),lwbpN:Value(s('lwbpN')),
    arusMaxPerFasa:Value(s('arusMaxPerFasa')),pembebananKva:Value(s('pembebananKva')),pembebananKw:Value(s('pembebananKw')),persentaseBeban:Value(s('persentaseBeban')),kategoriBeban:Value(s('kategoriBeban')));}

  Future<Map<String,dynamic>> editLokal({required MasterGardu asli,required Map<String,dynamic> perubahan,required String username})async{
    String s(String k)=>(perubahan[k]??'').toString();Value<String> v(String k)=>perubahan.containsKey(k)?Value(s(k)):const Value.absent();
    final update=MasterGardusCompanion(alamat:v('alamat'),jenisGardu:v('jenisGardu'),merk:v('merk'),kapasitasKva:v('kapasitasKva'),noSeri:v('noSeri'),tahunTrafo:v('tahunTrafo'),typeSeal:v('typeSeal'),merkPhbTr:v('merkPhbTr'),nomorSeriPhbTr:v('nomorSeriPhbTr'),tahunPhbTr:v('tahunPhbTr'),jamUkurWbp:v('jamUkurWbp'),tanggalPengukuran:v('tanggalPengukuran'),kepemilikan:v('kepemilikan'),
      wbpRs:v('wbpRs'),wbpSt:v('wbpSt'),wbpTr:v('wbpTr'),wbpRn:v('wbpRn'),wbpSn:v('wbpSn'),wbpTn:v('wbpTn'),wbpR:v('wbpR'),wbpS:v('wbpS'),wbpT:v('wbpT'),wbpN:v('wbpN'),lwbpRs:v('lwbpRs'),lwbpSt:v('lwbpSt'),lwbpTr:v('lwbpTr'),lwbpRn:v('lwbpRn'),lwbpSn:v('lwbpSn'),lwbpTn:v('lwbpTn'),lwbpR:v('lwbpR'),lwbpS:v('lwbpS'),lwbpT:v('lwbpT'),lwbpN:v('lwbpN'),
      arusMaxPerFasa:v('arusMaxPerFasa'),pembebananKva:v('pembebananKva'),pembebananKw:v('pembebananKw'),persentaseBeban:v('persentaseBeban'),kategoriBeban:v('kategoriBeban'));
    final out=GarduOutboxesCompanion.insert(gardu:asli.gardu,ulp:Value(asli.ulp),perubahanJson:Value(jsonEncode(perubahan)),diubahOleh:Value(username),diubahPada:Value(DateTime.now().toIso8601String()));
    await _dao.simpanEditLokal(gardu:asli.gardu,data:update,outbox:out);return{'ok':true};
  }
  Future<int> jumlah()=>_dao.jumlah();Future<List<MasterGardu>> cari(String k,{String ulp='',int limit=500})=>_dao.cari(k,ulp:ulp,limit:limit);Future<MasterGardu?> detail(String n)=>_dao.detail(n);Stream<List<GarduOutbox>> pantauAntrean()=>_dao.pantauAntrean();
}
