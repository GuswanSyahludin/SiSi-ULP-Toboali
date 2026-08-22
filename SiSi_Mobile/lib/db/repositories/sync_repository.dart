import '../../services/api_service.dart';
import '../db_provider.dart';
import 'gardu_sync_repository.dart';
import 'inspeksi_gardu_repository.dart';
import 'laporan_repository.dart';
import 'master_gardu_repository.dart';
import 'master_repository.dart';
import 'p0_repository.dart';

class SyncRepository{
 static const modulMasterData='masterData',modulLaporanTeknik='laporanTeknik',modulVerifikasiP0='verifikasiP0';static final Set<String>_kunci={};bool sedangProses(String m)=>_kunci.contains(m);Future<String>perangkatId()=>DbProvider.instance.syncDao.ambilAtauBuatPerangkatId();
 Future<Map<String,dynamic>>downloadMasterData(String token)async{const m=modulMasterData;if(_kunci.contains(m))return{'ok':false,'message':'Sinkron sedang berjalan.'};_kunci.add(m);try{
  final edit=await GarduSyncRepository().kirim(token);if(edit['ok']!=true)return{'ok':false,'message':'Edit Gardu gagal: ${edit['message']}'};
  final inspeksi=await InspeksiGarduRepository().syncSemua(token);if(inspeksi['ok']!=true)return{'ok':false,'message':'Paket inspeksi gagal: ${inspeksi['message']}'};
  final rp=await ApiService.getDropdownRow(token:token);if(rp['success']!=true)return{'ok':false,'message':'Gagal menarik penyulang'};final listP=List<String>.from(rp['penyulang']??[]),mapS=Map<String,dynamic>.from(rp['sectionByPenyulang']??{});await MasterRepository().simpanDariApi(listP,mapS);
  final rg=await MasterGarduRepository().download(token);if(rg['success']!=true)return{'ok':false,'message':(rg['message']??'Gagal menarik Master Gardu').toString()};await InspeksiGarduRepository().downloadListTemuan(token);
  final j=(rg['jumlah']??0)as int;await DbProvider.instance.syncDao.tandaiTersinkron(m,jumlah:j,keterangan:'${listP.length} penyulang · $j gardu');return{'ok':true,'message':'Sinkron selesai: ${edit['terkirim']??0} edit Gardu, ${inspeksi['terkirim']??0} laporan inspeksi, dan $j Master Gardu.'};
 }catch(e){return{'ok':false,'message':'Koneksi bermasalah: $e'};}finally{_kunci.remove(m);}}
 Future<Map<String,dynamic>>sinkronLaporanTeknik(String t)async{const m=modulLaporanTeknik;if(_kunci.contains(m))return{'ok':false,'message':'Sinkron berjalan.'};_kunci.add(m);try{final r=await LaporanRepository().bacaUp3Uiw(t);return r['ok']==true?{'ok':true}:r;}finally{_kunci.remove(m);}}
 Future<Map<String,dynamic>>sinkronVerifikasiP0()async{const m=modulVerifikasiP0;if(_kunci.contains(m))return{'ok':false,'message':'Pengiriman berjalan.'};_kunci.add(m);try{return await P0Repository().kirimAntrean();}finally{_kunci.remove(m);}}
}
