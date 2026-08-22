// lib/db/repositories/sync_repository.dart
// Pusat kendali sinkronisasi — dipanggil UI kartu Pengaturan.

import '../../services/api_service.dart';
import '../db_provider.dart';
import 'laporan_repository.dart';
import 'master_gardu_repository.dart';
import 'master_repository.dart';
import 'p0_repository.dart';

class SyncRepository {
  static const modulMasterData = 'masterData';
  static const modulLaporanTeknik = 'laporanTeknik';
  static const modulVerifikasiP0 = 'verifikasiP0';

  static final Set<String> _kunci = {};
  bool sedangProses(String modul) => _kunci.contains(modul);

  Future<String> perangkatId() =>
      DbProvider.instance.syncDao.ambilAtauBuatPerangkatId();

  /// Download SEMUA master yang dibutuhkan aplikasi:
  ///   1. db_Penyulang (nama + section)
  ///   2. Master_Gardu (identitas, trafo/PHB, WBP/LWBP)
  ///
  /// Full-replace dilakukan per tabel hanya setelah respons masing-masing
  /// berhasil, sehingga data lama tidak hilang saat koneksi putus di tengah.
  Future<Map<String, dynamic>> downloadMasterData(String token) async {
    const modul = modulMasterData;
    if (_kunci.contains(modul)) {
      return {'ok': false, 'message': 'Download sedang berjalan — tunggu sampai selesai.'};
    }
    _kunci.add(modul);
    try {
      // 1) Penyulang + section
      final resP = await ApiService.getDropdownRow(token: token);
      if (resP['success'] != true) {
        return {
          'ok': false,
          'message': (resP['message'] ?? 'Gagal menarik master penyulang').toString(),
        };
      }
      final listP = List<String>.from(resP['penyulang'] ?? []);
      final mapS = Map<String, dynamic>.from(resP['sectionByPenyulang'] ?? {});
      await MasterRepository().simpanDariApi(listP, mapS);

      // 2) Master Gardu. Endpoint otomatis membatasi ke ULP sesi login;
      // Super User tanpa filter menerima seluruh ULP.
      final resG = await MasterGarduRepository().download(token);
      if (resG['success'] != true) {
        return {
          'ok': false,
          'message': (resG['message'] ?? 'Penyulang tersimpan, tapi Master Gardu gagal ditarik').toString(),
        };
      }
      final jumlahGardu = (resG['jumlah'] ?? 0) as int;

      await DbProvider.instance.syncDao.tandaiTersinkron(
        modul,
        jumlah: jumlahGardu,
        keterangan: '${listP.length} penyulang · $jumlahGardu gardu',
      );
      return {
        'ok': true,
        'jumlah': listP.length + jumlahGardu,
        'penyulang': listP.length,
        'gardu': jumlahGardu,
        'message': 'Sinkron selesai — ${listP.length} penyulang & $jumlahGardu gardu tersimpan di HP.',
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
      return {'ok': false, 'message': 'Sinkron modul ini sedang berjalan.'};
    }
    _kunci.add(modul);
    try {
      final res = await LaporanRepository().bacaUp3Uiw(tanggal);
      if (res['ok'] == true && res['offline'] != true) {
        await DbProvider.instance.syncDao.tandaiTersinkron(
          modul, jumlah: 1, keterangan: tanggal,
        );
        return {'ok': true};
      }
      if (res['offline'] == true) {
        return {'ok': false, 'message': 'Tidak ada koneksi — sinkron membutuhkan internet.'};
      }
      return {'ok': false, 'message': (res['message'] ?? 'Gagal sinkron').toString()};
    } catch (e) {
      return {'ok': false, 'message': 'Koneksi bermasalah: $e'};
    } finally {
      _kunci.remove(modul);
    }
  }

  Future<Map<String, dynamic>> sinkronVerifikasiP0() async {
    const modul = modulVerifikasiP0;
    if (_kunci.contains(modul)) {
      return {'ok': false, 'message': 'Pengiriman keputusan sedang berjalan.'};
    }
    _kunci.add(modul);
    try {
      final res = await P0Repository().kirimAntrean();
      if (res['kosong'] == true) {
        return {'ok': true, 'message': 'Tidak ada keputusan yang menunggu.'};
      }
      final terkirim = (res['terkirim'] ?? 0) as int;
      if (terkirim > 0) {
        await DbProvider.instance.syncDao.tandaiTersinkron(
          modul, jumlah: terkirim, keterangan: 'keputusan P0 terkirim',
        );
      }
      return res;
    } catch (e) {
      return {'ok': false, 'message': 'Koneksi bermasalah: $e'};
    } finally {
      _kunci.remove(modul);
    }
  }
}
