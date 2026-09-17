import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/gardu_outbox.dart';
import '../tables/master_gardu.dart';

part 'master_gardu_dao.g.dart';

@DriftAccessor(tables: [MasterGardus, GarduOutboxes])
class MasterGarduDao extends DatabaseAccessor<AppDatabase>
    with _$MasterGarduDaoMixin {
  MasterGarduDao(super.db);

  Future<void> gantiSemua(List<MasterGardusCompanion> data) =>
      transaction(() async {
        // Jangan hapus perubahan lokal yang belum tersinkron. Download mengganti
        // master, lalu repository menumpuk ulang patch outbox di atasnya.
        await delete(masterGardus).go();
        if (data.isNotEmpty)
          await batch((b) => b.insertAllOnConflictUpdate(masterGardus, data));
      });

  Future<int> jumlah() async {
    final c = masterGardus.gardu.count();
    final row = await (selectOnly(masterGardus)..addColumns([c])).getSingle();
    return row.read(c) ?? 0;
  }

  Future<List<MasterGardu>> cari(String kata,
      {String ulp = '', int limit = 500}) {
    final q = select(masterGardus);
    final k = kata.trim();
    if (k.isNotEmpty)
      q.where((t) => t.gardu.contains(k) | t.alamat.contains(k));
    if (ulp.isNotEmpty) q.where((t) => t.ulp.equals(ulp));
    q
      ..orderBy([(t) => OrderingTerm.asc(t.gardu)])
      ..limit(limit);
    return q.get();
  }

  Future<MasterGardu?> detail(String nomor) =>
      (select(masterGardus)..where((t) => t.gardu.equals(nomor)))
          .getSingleOrNull();

  Future<List<GarduOutbox>> antrean() =>
      (select(garduOutboxes)..orderBy([(t) => OrderingTerm.asc(t.diubahPada)]))
          .get();
  Stream<List<GarduOutbox>> pantauAntrean() => select(garduOutboxes).watch();

  Future<void> simpanEditLokal({
    required String gardu,
    required MasterGardusCompanion data,
    required GarduOutboxesCompanion outbox,
  }) =>
      transaction(() async {
        await (update(masterGardus)..where((t) => t.gardu.equals(gardu)))
            .write(data);
        await into(garduOutboxes).insertOnConflictUpdate(outbox);
      });

  Future<void> hapusAntrean(String gardu, String diubahPada) =>
      (delete(garduOutboxes)
            ..where(
              (t) => t.gardu.equals(gardu) & t.diubahPada.equals(diubahPada),
            ))
          .go();

  Future<void> tandaiGagal(
    String gardu,
    String diubahPada,
    int percobaan,
    String pesan,
  ) =>
      (update(garduOutboxes)
            ..where(
              (t) => t.gardu.equals(gardu) & t.diubahPada.equals(diubahPada),
            ))
          .write(
        GarduOutboxesCompanion(
          status: const Value('gagal'),
          percobaan: Value(percobaan),
          pesanGagal: Value(pesan),
        ),
      );
}
