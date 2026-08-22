import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:drift/drift.dart' show Value;
import 'package:http/http.dart' as http;
import '../../services/api_service.dart';
import '../app_database.dart';
import '../db_provider.dart';

class InspeksiGarduRepository {
  final dao=DbProvider.instance.inspeksiGarduDao;
  String _id(String p)=>'$p-${DateTime.now().microsecondsSinceEpoch}-${Random().nextInt(1<<32).toRadixString(36)}';

  Future<void> downloadListTemuan(String token) async {
    final uri=Uri.parse('${ApiService.baseUrl}?mobile=1&action=getMasterGarduMobile&token=${Uri.encodeComponent(token)}&ulp=LIST_TEMUAN');
    final r=await http.get(uri).timeout(const Duration(seconds:30));final res=Map<String,dynamic>.from(jsonDecode(r.body));if(res['success']!=true)throw Exception(res['message']);
    final rows=<ListTemuansCompanion>[];for(final raw in List.from(res['list']??[])){final m=Map<String,dynamic>.from(raw);rows.add(ListTemuansCompanion(no:Value(int.tryParse('${m['no']}')),tier:Value('${m['tier']}'),objekInspeksi:Value('${m['objekInspeksi']}'),temuan:Value('${m['temuan']}')));}
    await dao.gantiListTemuan(rows);
  }

  Future<String> buatLaporan({required String ulp,required String hari,required String tanggal,required String koordinatAwal,required String koordinatAkhir,required String inputBy,String kmAwal='',String kmAkhir='',String kendala=''}) async {
    final id=_id('H');await dao.simpanHeader(InsGarduHeadersCompanion(localId:Value(id),ulp:Value(ulp),hari:Value(hari),tanggal:Value(tanggal),koordinatAwal:Value(koordinatAwal),koordinatAkhir:Value(koordinatAkhir),kmAwal:Value(kmAwal),kmAkhir:Value(kmAkhir),kendala:Value(kendala),inputBy:Value(inputBy),dibuatPada:Value(DateTime.now().toIso8601String()),status:const Value('draft')));
    final gardus=await DbProvider.instance.masterGarduDao.cari('',ulp:ulp,limit:5000);
    for(final g in gardus){if(_dateKey(g.tanggalPengukuran)!=tanggal)continue;final snap=<String,dynamic>{'ulp':g.ulp,'nomorGardu':g.gardu,'alamat':g.alamat,'penyulang':g.penyulang,'section':g.section,'merkTrafo':g.merk,'dayaKva':g.kapasitasKva,'beratTrafo':g.beratTrafo,'volumeMinyak':g.volumeMinyak,'merkPhbTr':g.merkPhbTr,'nomorSeriPhbTr':g.nomorSeriPhbTr,'tahunPhbTr':g.tahunPhbTr,'tanggalPengukuran':g.tanggalPengukuran};await dao.simpanRealisasi(InsGarduRealisasisCompanion(localId:Value(_id('G')),localHeaderId:Value(id),nomorGardu:Value(g.gardu),snapshotJson:Value(jsonEncode(snap))));}
    return id;
  }

  String _dateKey(String s){final x=s.trim();final iso=RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(x);if(iso!=null)return '${iso[1]}-${iso[2]}-${iso[3]}';final dmy=RegExp(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})').firstMatch(x);if(dmy!=null)return '${dmy[3]}-${dmy[2]!.padLeft(2,'0')}-${dmy[1]!.padLeft(2,'0')}';return x;}
  Stream<List<InsGarduHeader>> pantauLaporan()=>dao.pantauHeader();
  Future<List<InsGarduRealisasi>> garduLaporan(String id)=>dao.realisasi(id);
  Future<List<InsGarduTemuan>> temuan(String id)=>dao.temuan(id);
  Future<List<ListTemuan>> pilihan(String tier){final tiers=tier=='Tier 1 & Tier 2'?['Tier 1','Tier 2']:[tier];return dao.pilihanTier(tiers);}

  Future<void> setGardu({required InsGarduRealisasi gardu,required String tier,required List<Map<String,String>> temuan}) async {
    await dao.simpanRealisasi(InsGarduRealisasisCompanion(localId:Value(gardu.localId),localHeaderId:Value(gardu.localHeaderId),nomorGardu:Value(gardu.nomorGardu),tier:Value(tier),snapshotJson:Value(gardu.snapshotJson),status:const Value('draft')));
    await dao.hapusTemuanRealisasi(gardu.localId);final rows=<InsGarduTemuansCompanion>[];for(final t in temuan){rows.add(InsGarduTemuansCompanion(localId:Value(_id('T')),localRealisasiId:Value(gardu.localId),tier:Value(t['tier']??tier),temuan:Value(t['temuan']??''),deskripsi:Value(t['deskripsi']??''),fotoTemuanPath:Value(t['fotoTemuanPath']??''),fotoGarduPath:Value(t['fotoGarduPath']??'')));}if(rows.isNotEmpty)await dao.simpanTemuan(rows);
  }

  Future<Map<String,dynamic>> syncSemua(String token) async {final headers=await dao.antrean();var ok=0,gagal=0;for(final h in headers){try{await dao.setHeaderSync(h.localId,h.kodeHeader,'mengirim');final gs=await dao.realisasi(h.localId);final paket={'header':{'localId':h.localId,'ulp':h.ulp,'tanggal':h.tanggal,'koordinatAwal':h.koordinatAwal,'koordinatAkhir':h.koordinatAkhir,'kmAwal':h.kmAwal,'kmAkhir':h.kmAkhir,'kendala':h.kendala},'gardus':[]};for(final g in gs){if(g.tier.isEmpty)continue;final ts=await dao.temuan(g.localId),arr=[];for(final t in ts){arr.add({'localId':t.localId,'temuan':t.temuan,'deskripsi':t.deskripsi,'fotoTemuanB64':await _b64(t.fotoTemuanPath),'fotoGarduB64':await _b64(t.fotoGarduPath),'fotoTemuanMime':'image/jpeg','fotoGarduMime':'image/jpeg'});}paket['gardus'].add({'localId':g.localId,'nomorGardu':g.nomorGardu,'tier':g.tier,'temuan':arr});}
      final r=await http.post(Uri.parse('${ApiService.baseUrl}?mobile=1'),headers:{'Content-Type':'application/json'},body:jsonEncode({'action':'getMasterGarduMobile','token':token,'ulp':'INSPEKSI:${jsonEncode(paket)}'})).timeout(const Duration(seconds:120));final res=Map<String,dynamic>.from(jsonDecode(r.body));if(res['success']!=true)throw Exception(res['message']);await dao.setHeaderSync(h.localId,'${res['kodeHeader']}','tersinkron');for(final rg in List.from(res['gardus']??[])){await dao.setRealisasiSync('${rg['localId']}','${rg['kodePekerjaanGardu']}');for(final rt in List.from(rg['temuan']??[]))await dao.setTemuanSync('${rt['localId']}','${rt['kodeTemuan']}');}ok++;
    }catch(e){gagal++;await dao.setHeaderSync(h.localId,h.kodeHeader,'gagal',pesan:'$e');}}
    return{'ok':gagal==0,'terkirim':ok,'gagal':gagal,'message':'$ok laporan terkirim, $gagal gagal.'};}
  Future<String> _b64(String path)async{if(path.isEmpty)return'';final f=File(path);if(!await f.exists())return'';return base64Encode(await f.readAsBytes());}
}
