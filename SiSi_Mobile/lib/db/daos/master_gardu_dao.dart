import 'dart:convert';

import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/gardu_outbox.dart';
import '../tables/master_gardu.dart';

part 'master_gardu_dao.g.dart';

@DriftAccessor(tables: [MasterGardus, GarduOutboxes])
class MasterGarduDao extends DatabaseAccessor<AppDatabase>
    with _$MasterGarduDaoMixin {
  MasterGarduDao(super.db);

  /// Materialize a new server snapshot without deleting rows that have a
  /// pending local edit. The server snapshot is authoritative only for rows
  /// without an outbox entry; pending patches are replayed on top atomically.
  Future<void> gantiSemua(List<MasterGardusCompanion> data) =>
      transaction(() async {
        final pending = await antrean();
        final pendingGardus = pending.map((row) => row.gardu).toSet();
        final incomingGardus = data.map((row) => row.gardu.value).toSet();

        if (data.isNotEmpty) {
          await batch((b) =>
              b.insertAllOnConflictUpdate(masterGardus, data));
        }

        // Remove only stale rows that are not protected by a local outbox.
        // Never do a full-table delete: a missing server row must not erase a
        // user's offline edit before its patch is uploaded.
        final existing = await select(masterGardus).get();
        for (final row in existing) {
          if (!incomingGardus.contains(row.gardu) &&
              !pendingGardus.contains(row.gardu)) {
            await (delete(masterGardus)
                  ..where((t) => t.gardu.equals(row.gardu)))
                .go();
          }
        }

        for (final row in pending) {
          await _replayPatch(row);
        }
      });

  Future<void> _replayPatch(GarduOutbox outbox) async {
    final decoded = jsonDecode(outbox.perubahanJson);
    if (decoded is! Map) return;
    final patch = Map<String, dynamic>.from(decoded);
    final columns = <String, String>{
      'alamat': 'alamat',
      'penyulang': 'penyulang',
      'section': 'section',
      'jenisGardu': 'jenis_gardu',
      'merk': 'merk',
      'kapasitasKva': 'kapasitas_kva',
      'noSeri': 'no_seri',
      'tahunTrafo': 'tahun_trafo',
      'typeSeal': 'type_seal',
      'beratTrafo': 'berat_trafo',
      'volumeMinyak': 'volume_minyak',
      'merkPhbTr': 'merk_phb_tr',
      'nomorSeriPhbTr': 'nomor_seri_phb_tr',
      'tahunPhbTr': 'tahun_phb_tr',
      'jamUkurWbp': 'jam_ukur_wbp',
      'tanggalPengukuran': 'tanggal_pengukuran',
      'kepemilikan': 'kepemilikan',
      'wbpRs': 'wbp_rs',
      'wbpSt': 'wbp_st',
      'wbpTr': 'wbp_tr',
      'wbpRn': 'wbp_rn',
      'wbpSn': 'wbp_sn',
      'wbpTn': 'wbp_tn',
      'wbpR': 'wbp_r',
      'wbpS': 'wbp_s',
      'wbpT': 'wbp_t',
      'wbpN': 'wbp_n',
      'lwbpRs': 'lwbp_rs',
      'lwbpSt': 'lwbp_st',
      'lwbpTr': 'lwbp_tr',
      'lwbpRn': 'lwbp_rn',
      'lwbpSn': 'lwbp_sn',
      'lwbpTn': 'lwbp_tn',
      'lwbpR': 'lwbp_r',
      'lwbpS': 'lwbp_s',
      'lwbpT': 'lwbp_t',
      'lwbpN': 'lwbp_n',
      'arusMaxPerFasa': 'arus_max_per_fasa',
      'pembebananKva': 'pembebanan_kva',
      'pembebananKw': 'pembebanan_kw',
      'persentaseBeban': 'persentase_beban',
      'kategoriBeban': 'kategori_beban',
    };
    final assignments = <String>[];
    final values = <Object?>[];
    for (final entry in patch.entries) {
      final column = columns[entry.key];
      if (column == null) continue;
      assignments.add('$column = ?');
      values.add('${entry.value ?? ''}');
    }
    if (assignments.isEmpty) return;
    await customStatement(
      'UPDATE master_gardu SET ${assignments.join(', ')} WHERE gardu = ?',
      [...values, outbox.gardu],
    );
  }

  Future<int> jumlah() async {
    final c = masterGardus.gardu.count();
    final row = await (selectOnly(masterGardus)..addColumns([c])).getSingle();
    return row.read(c) ?? 0;
  }

  Future<List<MasterGardu>> cari(String kata,
      {String ulp = '', int limit = 500}) {
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
