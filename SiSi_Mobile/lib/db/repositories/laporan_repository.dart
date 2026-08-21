// lib/db/repositories/laporan_repository.dart
// ─────────────────────────────────────────────────────────────
// Repository laporan harian (Teknik_Laporan Harian / UP3-UIW).
// Pola: SERVER dulu (statusTim hanya bisa dihitung server) → segarkan
// cache SQLite → saat offline, baca cache SQLite.
// ─────────────────────────────────────────────────────────────

import 'package:drift/drift.dart' show Value;

import '../../services/api_service.dart';
import '../app_database.dart'; // wajib: Companion class hasil generate ada di sini
import '../db_provider.dart';

class LaporanRepository {
  /// Baca laporan UP3/UIW untuk 1 tanggal.
  /// Return map berbentuk SAMA seperti ApiService.getLaporanUp3Uiw,
  /// plus flag 'offline': true bila data berasal dari cache lokal.
  Future<Map<String, dynamic>> bacaUp3Uiw(String tanggal) async {
    // 1) Coba server dulu (statusTim hanya tersedia di server).
    try {
      final res = await ApiService.getLaporanUp3Uiw(tanggal: tanggal);
      if (res['ok'] == true) {
        await _cacheKeLokal(tanggal, res); // segarkan cache lokal
        return res;
      }
    } catch (_) {}

    // 2) Offline / server gagal -> baca cache SQLite.
    final lokal = await DbProvider.instance.laporanDao.bacaPerTanggal(tanggal);
    if (lokal == null) {
      return {
        'ok': false,
        'offline': true,
        'message':
            'Tidak ada koneksi & belum ada data tersimpan di HP untuk tanggal ini.',
      };
    }
    return {
      'ok': true,
      'offline': true,
      'tanggal': lokal.tanggal,
      // offline = baca saja; input C4A butuh server untuk regenerate G/H
      'editable': false,
      'exists': true,
      'c4a': {
        'penyulang': lokal.penyulang,
        'realisasi': lokal.panjangKms,
        'temuan': lokal.temuan,
        'eksekusi': lokal.eksekusi,
      },
      'waUp3': lokal.laporanUp3,
      'waUiw': lokal.laporanUiw,
      'statusTim': <String, bool>{}, // status per tim tidak tersedia offline
    };
  }

  Future<void> _cacheKeLokal(String tanggal, Map<String, dynamic> res) async {
    if (res['exists'] != true) return;
    final c4a = Map<String, dynamic>.from(res['c4a'] ?? {});
    await DbProvider.instance.laporanDao.tulisLaporan(
      LaporanHariansCompanion(
        tanggal: Value((res['tanggal'] ?? tanggal).toString()),
        penyulang: Value((c4a['penyulang'] ?? '').toString()),
        panjangKms: Value((c4a['realisasi'] ?? '').toString()),
        temuan: Value((c4a['temuan'] ?? '').toString()),
        eksekusi: Value((c4a['eksekusi'] ?? '').toString()),
        laporanUp3: Value((res['waUp3'] ?? '').toString()),
        laporanUiw: Value((res['waUiw'] ?? '').toString()),
      ),
    );
  }
}
