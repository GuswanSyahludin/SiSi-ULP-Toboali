import '../../services/api_service.dart';
import '../../services/sync_error_message.dart';
import '../../services/sync_progress_service.dart';
import '../db_provider.dart';
import 'delta_sync_repository.dart';
import 'gardu_sync_repository.dart';
import 'inspeksi_gardu_repository.dart';
import 'laporan_repository.dart';
import 'local_master_materializer.dart';
import 'p0_repository.dart';
import 'teknik_to_repository.dart';

class SyncRepository {
  static const modulMasterData='masterData',modulLaporanTeknik='laporanTeknik',modulVerifikasiP0='verifikasiP0',modulSinkronSemua='sinkronSemua';
  static final Set<String> _kunci={};
  bool sedangProses(String modul)=>_kunci.contains(modul);
  Future<String> perangkatId()=>DbProvider.instance.syncDao.ambilAtauBuatPerangkatId();
  Future<String> _tokenAktif(String token)async{try{final refreshed=await ApiService.cekPerangkat();if(refreshed['success']==true){final fresh=(refreshed['token']??'').toString().trim();if(fresh.isNotEmpty)return fresh;}}catch(_){}return token;}
  Future<Map<String,dynamic>> sinkronSemua(String token)async{
    const modul=modulSinkronSemua;final progress=SyncProgressService.instance;if(_kunci.contains(modul))return{'ok':false,'message':'Sinkron data sedang berjalan.'};_kunci.add(modul);progress.begin(total:10);
    try{
      progress.update('Memperbarui sesi',completed:0,total:10);final activeToken=await _tokenAktif(token);final deltaRepo=DeltaSyncRepository();final initial=!await deltaRepo.sudahPernah();
      progress.update('Mengirim antrean P0',completed:1,total:10);final p0=await P0Repository().kirimAntrean();
      progress.update('Mengirim perubahan Gardu',completed:2,total:10);final garduEdit=await GarduSyncRepository().kirim(activeToken);
      progress.update('Mengirim inspeksi Gardu',completed:3,total:10);final inspeksi=await InspeksiGarduRepository().syncSemua(activeToken);
      progress.update('Mengirim penugasan tim',completed:4,total:10);try{await TeknikToRepository().flushOutbox(activeToken);}catch(_){}
      progress.update('Menyiapkan Data Master',completed:5,total:10);final delta=await deltaRepo.sync(activeToken,onProgress:(transfer){progress.update('Mengunduh Data Master',dataset:transfer.dataset,completed:0,total:1,transferredRows:transfer.overallTransferred,totalRows:transfer.overallTotal,datasetTransferredRows:transfer.datasetTransferred,datasetTotalRows:transfer.datasetTotal);});final changed=delta.changed.toSet();final materializer=LocalMasterMaterializer();
      progress.update('Menyusun data lokal',completed:9,total:10);if(initial||changed.contains('db_Penyulang'))await materializer.penyulang(await deltaRepo.rows('db_Penyulang'));if(initial||changed.contains('Master_Gardu'))await materializer.gardu(await deltaRepo.rows('Master_Gardu'));if(initial||changed.contains('db_List_Temuan'))await materializer.listTemuan(await deltaRepo.rows('db_List_Temuan'));
      if(changed.contains('db_INS_Temuan')){try{await Future.wait([TeknikToRepository().refreshList(activeToken,'assignment'),TeknikToRepository().refreshList(activeToken,'move')]);}catch(_){}}if(changed.contains('db_Users')){try{await TeknikToRepository().refreshTeams(activeToken);}catch(_){}}
      final ok=p0['ok']==true&&garduEdit['ok']==true&&inspeksi['ok']==true;await DbProvider.instance.syncDao.tandaiTersinkron(modul,jumlah:delta.changed.length,keterangan:delta.message);final message='${delta.message} • Outbox: P0 ${p0['terkirim']??0}, Gardu ${garduEdit['terkirim']??0}, Inspeksi ${inspeksi['terkirim']??0}';if(ok)progress.success(message);else progress.failure(message);return{'ok':ok,'initial':initial,'changed':delta.changed,'message':message};
    }catch(error){final message=friendlySyncMessage(error);progress.failure(message);return{'ok':false,'message':message};}finally{_kunci.remove(modul);}
  }
  Future<Map<String,dynamic>> downloadMasterData(String token,{bool reportProgress=true})=>sinkronSemua(token);
  Future<Map<String,dynamic>> sinkronLaporanTeknik(String tanggal)async{const modul=modulLaporanTeknik;if(_kunci.contains(modul))return{'ok':false,'message':'Sinkron berjalan.'};_kunci.add(modul);try{final hasil=await LaporanRepository().bacaUp3Uiw(tanggal);return hasil['ok']==true?{'ok':true}:hasil;}finally{_kunci.remove(modul);}}
  Future<Map<String,dynamic>> sinkronVerifikasiP0()async{const modul=modulVerifikasiP0;if(_kunci.contains(modul))return{'ok':false,'message':'Pengiriman berjalan.'};_kunci.add(modul);try{return await P0Repository().kirimAntrean();}finally{_kunci.remove(modul);}}
}
