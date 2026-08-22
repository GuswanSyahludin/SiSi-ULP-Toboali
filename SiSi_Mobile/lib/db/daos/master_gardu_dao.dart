// lib/db/daos/master_gardu_dao.dart

import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/master_gardu.dart';

part 'master_gardu_dao.g.dart'; // hasil generate build_runner

@DriftAccessor(tables: [MasterGardus])
class MasterGarduDao extends DatabaseAccessor<AppDatabase>
    with _$MasterGarduDaoMixin {
  MasterGarduDao(super.db);

  Future<void> gantiSemua(List<MasterGardusCompanion> data) {
    return transaction(() async {
      await delete(masterGardus).go();
      if (data.isNotEmpty) {
        await batch((b) => b.insertAllOnConflictUpdate(masterGardus, data));
      }
    });
  }

  Future<int> jumlah() async {
    final c = masterGardus.gardu.count();
    final row = await (selectOnly(masterGardus)..addColumns([c])).getSingle();
    return row.read(c) ?? 0;
  }

  Future<List<MasterGardu>> cari(String kata, {String ulp = '', int limit = 100}) {
    final q = select(masterGardus);
    final k = kata.trim();
    if (k.isNotEmpty) {
      q.where((t) => t.gardu.contains(k) | t.alamat.contains(k));
    }
    if (ulp.isNotEmpty) q.where((t) => t.ulp.equals(ulp));
    q
      ..orderBy([(t) => OrderingTerm.asc(t.gardu)])
      ..limit(limit);
    return q.get();
  }

  Future<MasterGardu?> detail(String nomorGardu) {
    return (select(masterGardus)..where((t) => t.gardu.equals(nomorGardu)))
        .getSingleOrNull();
  }
}
