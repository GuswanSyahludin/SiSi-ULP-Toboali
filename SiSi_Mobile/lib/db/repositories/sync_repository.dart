import '../../services/api_service.dart';
import '../db_provider.dart';
import 'gardu_sync_repository.dart';
import 'laporan_repository.dart';
import 'master_gardu_repository.dart';
import 'master_repository.dart';
import 'p0_repository.dart';

class SyncRepository {
  static const modulMasterData='masterData';
  static const modulLaporanTeknik='laporanTeknik';
  static const modulVerifikasiP0='verifikasiP0';
  static final Set<String> _kunci={};
  bool sedangProses(String modul)=>_kunci.contains(modul);
  Future<String> perangkatId()=>DbProvider.instance.syncDao.ambilAtauBuatPerangkatId();

  Future<Map<String,dynamic>> downloadMasterData(String token) async {
    const modul=modulMasterData;
    if(_kunci.contains(modul))return {'ok':false,'message':'Sinkron sedang berjalan.'};
    _kunci.add(modul);
    try{
      final up=await GarduSyncRepository().kirim(token);
      if(up['ok']!=true)return {'ok':false,'message':'Edit Gardu belum terkirim: ${up['message']}'};
      final rp=await ApiService.getDropdownRow(token:token);
      if(rp['success']!=true)return {'ok':false,'message':(rp['message']??'Gagal menarik penyulang').toString()};
      final listP=List<String>.from(rp['penyulang']??[]);
      final mapS=Map<String,dynamic>.from(rp['sectionByPenyulang']??{});
      await MasterRepository().simpanDariApi(listP,mapS);
      final rg=await MasterGarduRepository().download(token);
      if(rg['success']!=true)return {'ok':false,'message':(rg['message']??'Gagal menarik Master Gardu').toString()};
      final j=(rg['jumlah']??0) as int;
      await DbProvider.instance.syncDao.tandaiTersinkron(modul,jumlah:j,keterangan:'${listP.length} penyulang · $j gardu');
      return {'ok':true,'message':'Sinkron selesai: ${up['terkirim']??0} edit dikirim, ${listP.length} penyulang & $j gardu diperbarui.'};
    }catch(e){return {'ok':false,'message':'Koneksi bermasalah: $e'};}
    finally{_kunci.remove(modul);}
  }

  Future<Map<String,dynamic>> sinkronLaporanTeknik(String tanggal) async {
    const modul=modulLaporanTeknik;if(_kunci.contains(modul))return {'ok':false,'message':'Sinkron sedang berjalan.'};
    _kunci.add(modul);try{final r=await LaporanRepository().bacaUp3Uiw(tanggal);
      if(r['ok']==true&&r['offline']!=true){await DbProvider.instance.syncDao.tandaiTersinkron(modul,jumlah:1,keterangan:tanggal);return {'ok':true};}
      return {'ok':false,'message':(r['message']??'Gagal sinkron').toString()};
    }catch(e){return {'ok':false,'message':'Koneksi bermasalah: $e'};}finally{_kunci.remove(modul);}
  }

  Future<Map<String,dynamic>> sinkronVerifikasiP0() async {
    const modul=modulVerifikasiP0;if(_kunci.contains(modul))return {'ok':false,'message':'Pengiriman sedang berjalan.'};
    _kunci.add(modul);try{final r=await P0Repository().kirimAntrean();
      final n=(r['terkirim']??0) as int;if(n>0)await DbProvider.instance.syncDao.tandaiTersinkron(modul,jumlah:n,keterangan:'keputusan P0 terkirim');return r;
    }catch(e){return {'ok':false,'message':'Koneksi bermasalah: $e'};}finally{_kunci.remove(modul);}
  }
}
