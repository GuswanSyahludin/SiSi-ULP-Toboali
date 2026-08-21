// lib/db/repositories/header_repository.dart
// ─────────────────────────────────────────────────────────────
// Repository Laporan Harian (db_Global_Header) — lapisan yang dipanggil UI.
// Pola: SERVER dulu (server = sumber kebenaran) → segarkan cache SQLite →
// saat offline, baca cache. Cache di-replace per pasangan (tanggal, subTim).
// ─────────────────────────────────────────────────────────────

import 'package:drift/drift.dart' show Value;

import '../../services/api_service.dart';
import '../app_database.dart';
import '../db_provider.dart';

class HeaderRepository {
  /// Baca laporan harian utk 1 sub-tim + 1 tanggal.
  /// Return map berbentuk SAMA seperti ApiService.getLaporanHarian,
  /// plus flag 'offline': true bila data berasal dari cache lokal.
  Future<Map<String, dynamic>> bacaLaporanHarian({
    required String token,
    required String subTim,
    required String tanggal,
  }) async {
    // 1) Server dulu — hasil sukses langsung di-cache ke SQLite.
    try {
      final res = await ApiService.getLaporanHarian(
        token: token,
        subTim: subTim,
        tanggal: tanggal,
      );
      if (res['success'] == true) {
        final data = (res['data'] as List? ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        await _cacheKeLokal(tanggal, subTim, data);
        await DbProvider.instance.syncDao.tandaiTersinkron(
          'laporanHarian',
          jumlah: data.length,
          keterangan: '$subTim • $tanggal',
        );
        res['offline'] = false;
        return res;
      }
    } catch (_) {}

    // 2) Offline / server gagal → baca cache SQLite.
    final lokal =
        await DbProvider.instance.headerDao.daftarPerTanggal(tanggal, subTim);
    if (lokal.isEmpty) {
      return {
        'success': false,
        'offline': true,
        'message':
            'Tidak ada koneksi & belum ada data tersimpan di HP untuk tanggal ini.',
      };
    }
    return {
      'success': true,
      'offline': true,
      'count': lokal.length,
      'data': lokal.map(_keMap).toList(),
    };
  }

  Future<void> _cacheKeLokal(
      String tanggal, String subTim, List<Map<String, dynamic>> data) async {
    final daftar = data
        .map((m) => GlobalHeadersCompanion(
              kodeHeader: Value((m['kodeHeader'] ?? '').toString()),
              ulp: Value((m['ulp'] ?? '').toString()),
              hari: Value((m['hari'] ?? '').toString()),
              tanggal: Value((m['tanggal'] ?? tanggal).toString()),
              tim: Value((m['tim'] ?? '').toString()),
              subTim: Value((m['subTim'] ?? subTim).toString()),
              koordinatAwal: Value((m['koordinatAwal'] ?? '').toString()),
              koordinatAkhir: Value((m['koordinatAkhir'] ?? '').toString()),
              kmAwal: Value((m['kmAwal'] ?? '').toString()),
              kmAkhir: Value((m['kmAkhir'] ?? '').toString()),
              kendala: Value((m['kendala'] ?? '').toString()),
              waText: Value((m['waText'] ?? '').toString()),
              timestamp: Value((m['timestamp'] ?? '').toString()),
              inputBy: Value((m['inputBy'] ?? '').toString()),
              timestampUpdate: Value((m['timestampUpdate'] ?? '').toString()),
              statusTextWa: Value((m['statusTextWa'] ?? '').toString()),
            ))
        .where((c) => c.kodeHeader.value.isNotEmpty)
        .toList();
    await DbProvider.instance.headerDao
        .gantiPerTanggalSubTim(tanggal, subTim, daftar);
  }

  Map<String, dynamic> _keMap(GlobalHeader r) => {
        'kodeHeader': r.kodeHeader,
        'ulp': r.ulp,
        'hari': r.hari,
        'tanggal': r.tanggal,
        'tim': r.tim,
        'subTim': r.subTim,
        'koordinatAwal': r.koordinatAwal,
        'koordinatAkhir': r.koordinatAkhir,
        'kmAwal': r.kmAwal,
        'kmAkhir': r.kmAkhir,
        'kendala': r.kendala,
        'waText': r.waText,
        'timestamp': r.timestamp,
        'inputBy': r.inputBy,
        'timestampUpdate': r.timestampUpdate,
        'statusTextWa': r.statusTextWa,
      };
}
