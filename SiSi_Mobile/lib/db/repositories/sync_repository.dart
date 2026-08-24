import '../../services/api_service.dart';
import '../db_provider.dart';
import 'gardu_sync_repository.dart';
import 'inspeksi_gardu_repository.dart';
import 'laporan_repository.dart';
import 'master_gardu_repository.dart';
import 'master_repository.dart';
import 'p0_repository.dart';
import 'teknik_to_repository.dart';

class SyncRepository {
  static const modulMasterData = 'masterData';
  static const modulLaporanTeknik = 'laporanTeknik';
  static const modulVerifikasiP0 = 'verifikasiP0';
  static const modulSinkronSemua = 'sinkronSemua';

  static final Set<String> _kunci = {};

  bool sedangProses(String modul) => _kunci.contains(modul);

  Future<String> perangkatId() =>
      DbProvider.instance.syncDao.ambilAtauBuatPerangkatId();

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
    if (_kunci.contains(modul)) {
      return {'ok': false, 'message': 'Sinkron data sedang berjalan.'};
    }

    _kunci.add(modul);
    try {
      final activeToken = await _tokenAktif(token);
      final p0 = await P0Repository().kirimAntrean();
      final master = await downloadMasterData(activeToken);
      Map<String, dynamic> teknikTo = {'ok': true};
      try { await TeknikToRepository().syncAll(activeToken); }
      catch (e) { teknikTo = {'ok': false, 'message': e.toString()}; }

      final p0Ok = p0['ok'] == true;
      final masterOk = master['ok'] == true;
      final teknikToOk = teknikTo['ok'] == true;
      final p0Terkirim = p0['terkirim'] ?? 0;
      final p0Gagal = p0['gagal'] ?? 0;

      final bagian = <String>[
        'P0: $p0Terkirim terkirim${p0Gagal == 0 ? '' : ', $p0Gagal gagal'}',
        'Data: ${masterOk ? master['message'] ?? 'sinkron selesai' : master['message'] ?? 'gagal'}',
        'TO: ${teknikToOk ? 'offline siap' : teknikTo['message'] ?? 'gagal'}',
      ];

      return {
        'ok': p0Ok && masterOk && teknikToOk,
        'p0Ok': p0Ok,
        'masterOk': masterOk,
        'p0Terkirim': p0Terkirim,
        'p0Gagal': p0Gagal,
        'message': bagian.join(' • '),
      };
    } catch (e) {
      return {'ok': false, 'message': 'Koneksi bermasalah: $e'};
    } finally {
      _kunci.remove(modul);
    }
  }

  Future<Map<String, dynamic>> downloadMasterData(String token) async {
    const modul = modulMasterData;
    if (_kunci.contains(modul)) {
      return {'ok': false, 'message': 'Sinkron master sedang berjalan.'};
    }

    _kunci.add(modul);
    try {
      final activeToken = await _tokenAktif(token);
      final edit = await GarduSyncRepository().kirim(activeToken);
      if (edit['ok'] != true) {
        return {
          'ok': false,
          'message': 'Edit Gardu gagal: ${edit['message']}',
        };
      }

      final inspeksi = await InspeksiGarduRepository().syncSemua(activeToken);
      if (inspeksi['ok'] != true) {
        return {
          'ok': false,
          'message': 'Paket inspeksi gagal: ${inspeksi['message']}',
        };
      }

      final rp = await ApiService.getDropdownRow(token: activeToken);
      if (rp['success'] != true) {
        final reason = (rp['message'] ?? 'respons server tidak valid').toString();
        return {'ok': false, 'message': 'Gagal menarik penyulang: $reason'};
      }

      final listP = List<String>.from(rp['penyulang'] ?? []);
      final mapS = Map<String, dynamic>.from(
        rp['sectionByPenyulang'] ?? {},
      );
      if (listP.isEmpty) {
        return {
          'ok': false,
          'message': 'Master Penyulang dari server kosong. Periksa db_Penyulang.',
        };
      }
      await MasterRepository().simpanDariApi(listP, mapS);

      final rg = await MasterGarduRepository().download(activeToken);
      if (rg['success'] != true) {
        return {
          'ok': false,
          'message':
              (rg['message'] ?? 'Gagal menarik Master Gardu').toString(),
        };
      }

      await InspeksiGarduRepository().downloadListTemuan(activeToken);

      final jumlahGardu = (rg['jumlah'] ?? 0) as int;
      await DbProvider.instance.syncDao.tandaiTersinkron(
        modul,
        jumlah: jumlahGardu,
        keterangan: '${listP.length} penyulang · $jumlahGardu gardu',
      );

      return {
        'ok': true,
        'message':
            '${edit['terkirim'] ?? 0} edit Gardu, ${inspeksi['terkirim'] ?? 0} laporan inspeksi, ${listP.length} penyulang, dan $jumlahGardu Master Gardu.',
      };
    } catch (e) {
      return {'ok': false, 'message': 'Koneksi bermasalah: $e'};
    } finally {
      _kunci.remove(modul);
    }
  }

  Future<Map<String, dynamic>> sinkronLaporanTeknik(String tanggal) async {
    const modul = modulLaporanTeknik;
    if (_kunci.contains(modul)) {
      return {'ok': false, 'message': 'Sinkron berjalan.'};
    }

    _kunci.add(modul);
    try {
      final hasil = await LaporanRepository().bacaUp3Uiw(tanggal);
      return hasil['ok'] == true ? {'ok': true} : hasil;
    } finally {
      _kunci.remove(modul);
    }
  }

  Future<Map<String, dynamic>> sinkronVerifikasiP0() async {
    const modul = modulVerifikasiP0;
    if (_kunci.contains(modul)) {
      return {'ok': false, 'message': 'Pengiriman berjalan.'};
    }

    _kunci.add(modul);
    try {
      return await P0Repository().kirimAntrean();
    } finally {
      _kunci.remove(modul);
    }
  }
}
