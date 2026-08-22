// lib/db/repositories/sync_repository.dart
// ───────────────────────────────────────────────────
// Pusat kendali sinkronisasi — dipanggil UI (kartu di Pengaturan).
//
// ATURAN KUNCI: setiap proses DIKUNCI 1x per modul (Set _kunci). Klik
// berulang saat proses masih berjalan DITOLAK, sehingga server tidak
// menerima request berlipat saat kartu di-spam.
//
// Rev 22 Agu 2026: + modulVerifikasiP0 — arah sinkronnya KE ATAS (kirim), bukan
// tarik seperti modul lain: keputusan Approve/Reject yang sudah tersimpan di
// server lokal dikirim ke Apps Script lalu diteruskan ke gsheet.
// ───────────────────────────────────────────────────

import '../../services/api_service.dart';
import '../db_provider.dart';
import 'laporan_repository.dart';
import 'master_repository.dart';
import 'p0_repository.dart';

class SyncRepository {
  static const modulMasterData = 'masterData';
  static const modulLaporanTeknik = 'laporanTeknik';
  static const modulVerifikasiP0 = 'verifikasiP0';

  /// Kunci proses yang sedang berjalan (in-memory, satu per modul).
  static final Set<String> _kunci = {};

  bool sedangProses(String modul) => _kunci.contains(modul);

  /// Kode server lokal (perangkat) — dibuat sekali, disimpan di sync_info.
  Future<String> perangkatId() =>
      DbProvider.instance.syncDao.ambilAtauBuatPerangkatId();

  /// Download master data (penyulang + section) dari server ke SQLite lokal.
  /// Dipakai kartu "Download Master Data" di Pengaturan + interlock menu.
  Future<Map<String, dynamic>> downloadMasterData(String token) async {
    const modul = modulMasterData;
    if (_kunci.contains(modul)) {
      return {
        'ok': false,
        'message': 'Download sedang berjalan — tunggu sampai selesai.'
      };
    }
    _kunci.add(modul);
    try {
      final res = await ApiService.getDropdownRow(token: token);
      if (res['success'] == true) {
        final listP = List<String>.from(res['penyulang'] ?? []);
        final mapS = Map<String, dynamic>.from(res['sectionByPenyulang'] ?? {});
        await MasterRepository().simpanDariApi(listP, mapS);
        await DbProvider.instance.syncDao.tandaiTersinkron(
          modul,
          jumlah: listP.length,
          keterangan: 'penyulang & section',
        );
        return {'ok': true, 'jumlah': listP.length};
      }
      return {
        'ok': false,
        'message': (res['message'] ?? 'Gagal menarik master data').toString()
      };
    } catch (e) {
      return {'ok': false, 'message': 'Koneksi bermasalah: $e'};
    } finally {
      _kunci.remove(modul);
    }
  }

  /// Sinkron modul Laporan Harian Teknik: tarik baris tanggal tsb ke cache
  /// lokal (lewat LaporanRepository — server dulu, hasilnya ditulis ke SQLite).
  Future<Map<String, dynamic>> sinkronLaporanTeknik(String tanggal) async {
    const modul = modulLaporanTeknik;
    if (_kunci.contains(modul)) {
      return {'ok': false, 'message': 'Sinkron modul ini sedang berjalan.'};
    }
    _kunci.add(modul);
    try {
      final res = await LaporanRepository().bacaUp3Uiw(tanggal);
      // offline:true = data dari cache lokal, BUKAN hasil sinkron — jangan
      // tandai tersinkron.
      if (res['ok'] == true && res['offline'] != true) {
        await DbProvider.instance.syncDao.tandaiTersinkron(
          modul,
          jumlah: 1,
          keterangan: tanggal,
        );
        return {'ok': true};
      }
      if (res['offline'] == true) {
        return {
          'ok': false,
          'message': 'Tidak ada koneksi — sinkron membutuhkan internet.'
        };
      }
      return {
        'ok': false,
        'message': (res['message'] ?? 'Gagal sinkron').toString()
      };
    } catch (e) {
      return {'ok': false, 'message': 'Koneksi bermasalah: $e'};
    } finally {
      _kunci.remove(modul);
    }
  }

  /// KIRIM keputusan Verifikasi P0 dari server lokal ke Apps Script + gsheet.
  ///
  /// Berbeda dari modul lain: ini sinkron KE ATAS. Baris yang gagal tetap
  /// tersimpan di antrean beserta pesannya, jadi menekan kartu lagi hanya
  /// mengulang sisa yang belum tuntas — tidak ada risiko keputusan terkirim
  /// dobel karena baris yang sukses langsung dihapus dari antrean.
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
          modul,
          jumlah: terkirim,
          keterangan: 'keputusan P0 terkirim',
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
