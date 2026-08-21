// lib/db/daos/header_dao.dart
// ─────────────────────────────────────────────────────────────
// DAO untuk tabel global_header (cermin sheet db_Global_Header).
// Kunci baris = Kode Header; cache lokal di-replace per pasangan
// (tanggal, subTim) setiap menu Laporan Harian dibuka online.
// ─────────────────────────────────────────────────────────────

import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/global_header.dart';

part 'header_dao.g.dart'; // hasil generate build_runner

@DriftAccessor(tables: [GlobalHeaders])
class HeaderDao extends DatabaseAccessor<AppDatabase> with _$HeaderDaoMixin {
  HeaderDao(super.db);

  /// Daftar header utk 1 tanggal + 1 sub-tim, terbaru dulu (by kodeHeader).
  Future<List<GlobalHeader>> daftarPerTanggal(String tanggal, String subTim) {
    return (select(globalHeaders)
          ..where((t) => t.tanggal.equals(tanggal) & t.subTim.equals(subTim))
          ..orderBy([
            (t) =>
                OrderingTerm(expression: t.kodeHeader, mode: OrderingMode.desc)
          ]))
        .get();
  }

  /// Ganti cache utk pasangan (tanggal, subTim) dengan hasil terbaru server.
  /// Full-replace per pasangan: baris tanggal+subTim ini dihapus dulu,
  /// lalu diisi hasil terbaru — tidak ada baris basi tertinggal.
  Future<void> gantiPerTanggalSubTim(String tanggal, String subTim,
      List<GlobalHeadersCompanion> daftar) async {
    await batch((b) {
      b.deleteWhere(globalHeaders,
          (t) => t.tanggal.equals(tanggal) & t.subTim.equals(subTim));
      b.insertAll(globalHeaders, daftar);
    });
  }
}
