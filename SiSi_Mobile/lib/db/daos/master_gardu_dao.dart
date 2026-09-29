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

  String _norm(String value) => value.trim().toLowerCase();
  String _key(String ulp, String gardu) => '${_norm(ulp)}|${_norm(gardu)}';

  Future<void> gantiSemua(
    List<MasterGardusCompanion> data, {
    List<Map<String, dynamic>> revisions = const [],
    String? ulpScope,
  }) => transaction(() async {
        // Conflict rows are still local edits and must survive a snapshot.
        final pending = await antrean(includeConflict: true);
        final pendingKeys = pending.map((row) => _key(row.ulp, row.gardu)).toSet();
        final incomingKeys = data
            .map((row) => _key(row.ulp.value, row.gardu.value))
            .toSet();
        if (data.isNotEmpty) {
          await batch((b) => b.insertAllOnConflictUpdate(masterGardus, data));
        }
        final scope = ulpScope == null ? null : _norm(ulpScope);
        final existing = await select(masterGardus).get();
        for (final row in existing) {
          final inScope = scope == null || _norm(row.ulp) == scope;
          if (inScope &&
              !incomingKeys.contains(_key(row.ulp, row.gardu)) &&
              !pendingKeys.contains(_key(row.ulp, row.gardu))) {
            await (delete(masterGardus)
                  ..where((t) => t.ulp.equals(row.ulp) & t.gardu.equals(row.gardu)))
                .go();
          }
        }
        for (final row in pending) {
          await _replayPatch(row);
        }
        for (final revision in revisions) {
          final gardu = '${revision['gardu'] ?? ''}'.trim();
          final ulp = '${revision['ulp'] ?? ''}'.trim();
          if (gardu.isEmpty || !revision.containsKey('serverRevision')) continue;
          final value = revision['serverRevision'];
          final parsed = value is int ? value : int.tryParse('$value');
          if (parsed == null || parsed < 0) continue;
          await setServerRevision(gardu, ulp, parsed);
        }
      });

  Future<void> _replayPatch(GarduOutbox outbox) async {
    final decoded = jsonDecode(outbox.perubahanJson);
    if (decoded is! Map) return;
    final patch = Map<String, dynamic>.from(decoded);
    final columns = <String, String>{
      'alamat': 'alamat', 'penyulang': 'penyulang', 'section': 'section',
      'jenisGardu': 'jenis_gardu', 'merk': 'merk', 'kapasitasKva': 'kapasitas_kva',
      'noSeri': 'no_seri', 'tahunTrafo': 'tahun_trafo', 'typeSeal': 'type_seal',
      'beratTrafo': 'berat_trafo', 'volumeMinyak': 'volume_minyak',
      'merkPhbTr': 'merk_phb_tr', 'nomorSeriPhbTr': 'nomor_seri_phb_tr',
      'tahunPhbTr': 'tahun_phb_tr', 'jamUkurWbp': 'jam_ukur_wbp',
      'tanggalPengukuran': 'tanggal_pengukuran', 'kepemilikan': 'kepemilikan',
      'wbpRs': 'wbp_rs', 'wbpSt': 'wbp_st', 'wbpTr': 'wbp_tr', 'wbpRn': 'wbp_rn',
      'wbpSn': 'wbp_sn', 'wbpTn': 'wbp_tn', 'wbpR': 'wbp_r', 'wbpS': 'wbp_s',
      'wbpT': 'wbp_t', 'wbpN': 'wbp_n', 'lwbpRs': 'lwbp_rs', 'lwbpSt': 'lwbp_st',
      'lwbpTr': 'lwbp_tr', 'lwbpRn': 'lwbp_rn', 'lwbpSn': 'lwbp_sn',
      'lwbpTn': 'lwbp_tn', 'lwbpR': 'lwbp_r', 'lwbpS': 'lwbp_s', 'lwbpT': 'lwbp_t',
      'lwbpN': 'lwbp_n', 'arusMaxPerFasa': 'arus_max_per_fasa',
      'pembebananKva': 'pembebanan_kva', 'pembebananKw': 'pembebanan_kw',
      'persentaseBeban': 'persentase_beban', 'kategoriBeban': 'kategori_beban',
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
      'UPDATE master_gardu SET ${assignments.join(', ')} WHERE ulp = ? AND gardu = ?',
      [...values, outbox.ulp, outbox.gardu],
    );
  }

  Future<int> serverRevision(String gardu, {String ulp = ''}) async {
    final rows = await customSelect(
      'SELECT revision FROM gardu_server_revision WHERE gardu=? AND ulp=?',
      variables: [Variable<String>(gardu), Variable<String>(ulp)],
    ).get();
    return rows.isEmpty ? 0 : (rows.first.data['revision'] as int? ?? 0);
  }

  Future<void> setServerRevision(String gardu, String ulp, int revision) async {
    await customStatement(
      'INSERT INTO gardu_server_revision(gardu,ulp,revision) VALUES(?,?,?) '
      'ON CONFLICT(ulp,gardu) DO UPDATE SET revision=excluded.revision',
      [gardu, ulp, revision],
    );
  }

  Future<int> jumlah({String? ulp}) async {
    final q = selectOnly(masterGardus);
    final count = masterGardus.gardu.count();
    if (ulp != null && ulp.trim().isNotEmpty) {
      q.where(masterGardus.ulp.equals(ulp.trim()));
    }
    final row = await (q..addColumns([count])).getSingle();
    return row.read(count) ?? 0;
  }

  Future<List<MasterGardu>> cari(String kata,
      {String ulp = '', int limit = 500}) {
    final q = select(masterGardus);
    final k = kata.trim();
    if (k.isNotEmpty) q.where((t) => t.gardu.contains(k) | t.alamat.contains(k));
    if (ulp.isNotEmpty) q.where((t) => t.ulp.equals(ulp));
    q..orderBy([(t) => OrderingTerm.asc(t.gardu)])..limit(limit);
    return q.get();
  }

  Future<MasterGardu?> detail(String nomor, {String ulp = ''}) {
    final q = select(masterGardus)..where((t) => t.gardu.equals(nomor));
    if (ulp.isNotEmpty) q.where((t) => t.ulp.equals(ulp));
    return q.getSingleOrNull();
  }

  Future<List<GarduOutbox>> antrean({bool includeConflict = true}) {
    final q = select(garduOutboxes);
    if (!includeConflict) {
      q.where((t) => t.status.equals('konflik').not());
    }
    q.orderBy([(t) => OrderingTerm.asc(t.diubahPada)]);
    return q.get();
  }

  Stream<List<GarduOutbox>> pantauAntrean() => select(garduOutboxes).watch();

  Future<void> simpanEditLokal({required String gardu, required String ulp, required MasterGardusCompanion data, required GarduOutboxesCompanion outbox}) =>
      transaction(() async {
        await (update(masterGardus)
              ..where((t) => t.ulp.equals(ulp) & t.gardu.equals(gardu)))
            .write(data);
        await into(garduOutboxes).insertOnConflictUpdate(outbox);
      });

  Future<void> hapusAntrean(String ulp, String gardu, String diubahPada) =>
      (delete(garduOutboxes)
            ..where((t) => t.ulp.equals(ulp) & t.gardu.equals(gardu) & t.diubahPada.equals(diubahPada)))
          .go();

  Future<void> tandaiGagal(String ulp, String gardu, String diubahPada, int percobaan, String pesan) =>
      (update(garduOutboxes)
            ..where((t) => t.ulp.equals(ulp) & t.gardu.equals(gardu) & t.diubahPada.equals(diubahPada)))
          .write(GarduOutboxesCompanion(
            status: const Value('gagal'),
            percobaan: Value(percobaan),
            pesanGagal: Value(pesan),
          ));

  Future<void> tandaiKonflik(String ulp, String gardu, String diubahPada, String pesan) =>
      (update(garduOutboxes)
            ..where((t) => t.ulp.equals(ulp) & t.gardu.equals(gardu) & t.diubahPada.equals(diubahPada)))
          .write(GarduOutboxesCompanion(
            status: const Value('konflik'),
            pesanGagal: Value(pesan),
          ));
}
