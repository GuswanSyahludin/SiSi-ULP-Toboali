import '../../services/api_service.dart';
import '../../services/sync_progress_service.dart';
import '../db_provider.dart';
import 'gardu_sync_repository.dart';
import 'inspeksi_gardu_repository.dart';
import 'laporan_repository.dart';
import 'master_gardu_repository.dart';
import 'master_repository.dart';
import 'p0_repository.dart';
import 'teknik_to_repository.dart';
import 'delta_sync_repository.dart';

class SyncRepository {
  static const modulMasterData = 'masterData';
  static const modulLaporanTeknik = 'laporanTeknik';
  static const modulVerifikasiP0 = 'verifikasiP0';
  static const modulSinkronSemua = 'sinkronSemua';
  static final Set<String> _kunci = {};

  bool sedangProses(String modul) => _kunci.contains(modul);
  Future<String> perangkatId() => DbProvider.instance.syncDao.ambilAtauBuatPerangkatId();

  Future<String> _tokenAktif(String token) async {
    try {
      final refreshed = await ApiService.cekPerangkat();
      if (refreshed['success'] == true) {
        final fresh = (refreshed['token'] ?? '').toString().trim();
        if (fresh.isNotEmpty) return fresh;
      }
    } catch (_) {}
    return token;
  }

  Future<Map<String, dynamic>> sinkronSemua(String token) async {
    const modul = modulSinkronSemua;
    final progress = SyncProgressService.instance;
    if (_kunci.contains(modul)) return {'ok':false,'message':'Sinkron data sedang berjalan.'};
    _kunci.add(modul);
    progress.begin(total: 10);
    try {
      progress.update('Memperbarui sesi', completed: 0, total: 10);
      final activeToken = await _tokenAktif(token);
      final deltaRepo = DeltaSyncRepository();
      final initial = !await deltaRepo.sudahPernah();
      progress.update('Mengirim antrean P0', completed: 1, total: 10);
      final p0 = await P0Repository().kirimAntrean();
      progress.update('Mengirim perubahan Gardu', completed: 2, total: 10);
      final garduEdit = await GarduSyncRepository().kirim(activeToken);
      progress.update('Mengirim inspeksi Gardu', completed: 3, total: 10);
      final inspeksi = await InspeksiGarduRepository().syncSemua(activeToken);
      progress.update('Mengirim penugasan tim', completed: 4, total: 10);
      try { await TeknikToRepository().flushOutbox(activeToken); } catch (_) {}

      Map<String,dynamic> firstMaster={'ok':true};
      if(initial) {
        progress.update('Mengunduh master awal', completed: 5, total: 10);
        firstMaster=await downloadMasterData(activeToken, reportProgress: false);
      }

      progress.update('Menghitung total baris database', completed: 6, total: 10);
      final delta = await deltaRepo.sync(activeToken, onProgress: (transfer) {
        progress.update(
          'Mengunduh data',
          dataset: transfer.dataset,
          completed: 0,
          total: 1,
          transferredRows: transfer.overallTransferred,
          totalRows: transfer.overallTotal,
          datasetTransferredRows: transfer.datasetTransferred,
          datasetTotalRows: transfer.datasetTotal,
        );
      });
      final changed=delta.changed.toSet();

      if(!initial && changed.contains('db_Penyulang')){
        final rp=await ApiService.getDropdownRow(token:activeToken);
        if(rp['success']==true) await MasterRepository().simpanDariApi(List<String>.from(rp['penyulang']??[]),Map<String,dynamic>.from(rp['sectionByPenyulang']??{}));
      }
      if(!initial && changed.contains('Master_Gardu')) await MasterGarduRepository().download(activeToken);
      if(!initial && changed.contains('db_List_Temuan')) await InspeksiGarduRepository().downloadListTemuan(activeToken);
      if(changed.contains('db_INS_Temuan')){try {await Future.wait([TeknikToRepository().refreshList(activeToken,'assignment'),TeknikToRepository().refreshList(activeToken,'move')]);} catch (_) {}}
      if(changed.contains('db_Users')){try {await TeknikToRepository().refreshTeams(activeToken);} catch (_) {}}

      final ok=p0['ok']==true&&garduEdit['ok']==true&&inspeksi['ok']==true&&firstMaster['ok']==true;
      await DbProvider.instance.syncDao.tandaiTersinkron(modul,jumlah:delta.changed.length,keterangan:delta.message);
      final message='${delta.message} • Outbox: P0 ${p0['terkirim']??0}, Gardu ${garduEdit['terkirim']??0}, Inspeksi ${inspeksi['terkirim']??0}';
      if(ok){progress.success(message);}else{progress.failure(message);}
      return {'ok':ok,'initial':initial,'changed':delta.changed,'message':message};
    } catch(e) {
      final message='Koneksi bermasalah: $e';progress.failure(message);return {'ok':false,'message':message};
    } finally {_kunci.remove(modul);}
  }

  Future<Map<String, dynamic>> downloadMasterData(String token,{bool reportProgress=true}) async {
    const modul=modulMasterData;
    if(_kunci.contains(modul))return {'ok':false,'message':'Sinkron master sedang berjalan.'};
    _kunci.add(modul);
    final progress=SyncProgressService.instance;
    if(reportProgress)progress.begin(stage:'Menyiapkan master data',total:4);
    try {
      if(reportProgress)progress.update('Memperbarui sesi',completed:0,total:4);
      final activeToken=await _tokenAktif(token);
      final edit=await GarduSyncRepository().kirim(activeToken);
      if(edit['ok']!=true)return {'ok':false,'message':'Edit Gardu gagal: ${edit['message']}'};
      final inspeksi=await InspeksiGarduRepository().syncSemua(activeToken);
      if(inspeksi['ok']!=true)return {'ok':false,'message':'Paket inspeksi gagal: ${inspeksi['message']}'};
      if(reportProgress)progress.update('Mengunduh Penyulang',dataset:'db_Penyulang',completed:1,total:4);
      final rp=await ApiService.getDropdownRow(token:activeToken);
      if(rp['success']!=true)return {'ok':false,'message':'Gagal menarik penyulang: ${rp['message']??'respons server tidak valid'}'};
      final listP=List<String>.from(rp['penyulang']??[]);final mapS=Map<String,dynamic>.from(rp['sectionByPenyulang']??{});
      if(listP.isEmpty)return {'ok':false,'message':'Master Penyulang dari server kosong. Periksa db_Penyulang.'};
      await MasterRepository().simpanDariApi(listP,mapS);
      if(reportProgress)progress.update('Mengunduh Master Gardu',dataset:'Master_Gardu',completed:2,total:4);
      final rg=await MasterGarduRepository().download(activeToken);
      if(rg['success']!=true)return {'ok':false,'message':(rg['message']??'Gagal menarik Master Gardu').toString()};
      if(reportProgress)progress.update('Mengunduh daftar temuan',dataset:'db_List_Temuan',completed:3,total:4);
      await InspeksiGarduRepository().downloadListTemuan(activeToken);
      final jumlahGardu=(rg['jumlah']??0) as int;
      await DbProvider.instance.syncDao.tandaiTersinkron(modul,jumlah:jumlahGardu,keterangan:'${listP.length} penyulang · $jumlahGardu gardu');
      final message='${edit['terkirim']??0} edit Gardu, ${inspeksi['terkirim']??0} laporan inspeksi, ${listP.length} penyulang, dan $jumlahGardu Master Gardu.';
      if(reportProgress)progress.success(message);return {'ok':true,'message':message};
    } catch(e) {
      final message='Koneksi bermasalah: $e';if(reportProgress)progress.failure(message);return {'ok':false,'message':message};
    } finally {_kunci.remove(modul);}
  }

  Future<Map<String,dynamic>> sinkronLaporanTeknik(String tanggal) async {const modul=modulLaporanTeknik;if(_kunci.contains(modul))return {'ok':false,'message':'Sinkron berjalan.'};_kunci.add(modul);try{final hasil=await LaporanRepository().bacaUp3Uiw(tanggal);return hasil['ok']==true?{'ok':true}:hasil;}finally{_kunci.remove(modul);}}
  Future<Map<String,dynamic>> sinkronVerifikasiP0() async {const modul=modulVerifikasiP0;if(_kunci.contains(modul))return {'ok':false,'message':'Pengiriman berjalan.'};_kunci.add(modul);try{return await P0Repository().kirimAntrean();}finally{_kunci.remove(modul);}}
}
