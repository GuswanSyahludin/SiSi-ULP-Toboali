// lib/db/daos/master_dao.dart
// ─────────────────────────────────────────────────────────────
// DAO (Data Access Object) untuk tabel master_penyulang.
// Hanya DAO yang menulis query — UI/repository tinggal memanggil.
// ─────────────────────────────────────────────────────────────

import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/master_penyulang.dart';

part 'master_dao.g.dart'; // hasil generate build_runner

@DriftAccessor(tables: [MasterPenyulangs])
class MasterDao extends DatabaseAccessor<AppDatabase> with _$MasterDaoMixin {
  MasterDao(super.db);

  /// Daftar nama penyulang UNIK, urut A-Z (untuk dropdown Penyulang).
  Future<List<String>> daftarPenyulang() async {
    final q = selectOnly(masterPenyulangs, distinct: true)
      ..addColumns([masterPenyulangs.namaPenyulang])
      ..orderBy([OrderingTerm.asc(masterPenyulangs.namaPenyulang)]);
    final rows = await q.get();
    return rows
        .map((r) => r.read(masterPenyulangs.namaPenyulang) ?? '')
        .where((s) => s.isNotEmpty)
        .toList();
  }

  /// Peta { namaPenyulang: [section, ...] } — untuk dropdown Section
  /// bertingkat (section mengikuti penyulang terpilih).
  Future<Map<String, List<String>>> sectionByPenyulang() async {
    final rows = await (select(masterPenyulangs)
          ..orderBy([(t) => OrderingTerm.asc(t.section)]))
        .get();
    final map = <String, List<String>>{};
    for (final r in rows) {
      if (r.namaPenyulang.isEmpty) continue;
      final list = map.putIfAbsent(r.namaPenyulang, () => []);
      if (r.section.isNotEmpty && !list.contains(r.section)) {
        list.add(r.section);
      }
    }
    return map;
  }

  /// Ganti SELURUH isi master penyulang (full replace saat sync master data).
  Future<void> gantiSemuaPenyulang(
      List<MasterPenyulangsCompanion> daftar) async {
    await batch((b) {
      b.deleteAll(masterPenyulangs);
      b.insertAll(masterPenyulangs, daftar);
    });
  }
}
