// lib/db/daos/laporan_dao.dart
// ─────────────────────────────────────────────────────────────
// DAO untuk tabel laporan_harian (cermin sheet Teknik_Laporan Harian).
// Satu baris per tanggal — kunci utama = tanggal.
// ─────────────────────────────────────────────────────────────

import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/laporan_harian.dart';

part 'laporan_dao.g.dart'; // hasil generate build_runner

@DriftAccessor(tables: [LaporanHarians])
class LaporanDao extends DatabaseAccessor<AppDatabase> with _$LaporanDaoMixin {
  LaporanDao(super.db);

  /// Baca baris laporan untuk 1 tanggal (null bila belum ada di lokal).
  Future<LaporanHarian?> bacaPerTanggal(String tanggal) {
    return (select(laporanHarians)..where((t) => t.tanggal.equals(tanggal)))
        .getSingleOrNull();
  }

  /// Tulis/timpa baris laporan (upsert by tanggal).
  Future<void> tulisLaporan(LaporanHariansCompanion data) {
    return into(laporanHarians).insertOnConflictUpdate(data);
  }
}
