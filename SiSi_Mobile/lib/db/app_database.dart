import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

import 'tables/global_header.dart';
import 'tables/master_penyulang.dart';
import 'tables/laporan_harian.dart';
import 'tables/sync_info.dart';
import 'tables/p0_lokal.dart';
import 'tables/p0_outbox.dart';
import 'tables/master_gardu.dart';
import 'tables/gardu_outbox.dart';
import 'tables/inspeksi_gardu_lokal.dart';
import 'daos/master_dao.dart';
import 'daos/laporan_dao.dart';
import 'daos/sync_dao.dart';
import 'daos/header_dao.dart';
import 'daos/p0_dao.dart';
import 'daos/master_gardu_dao.dart';
import 'daos/inspeksi_gardu_dao.dart';

export 'daos/p0_dao.dart' show P0Dao;
export 'daos/master_gardu_dao.dart' show MasterGarduDao;

part 'app_database.g.dart';

@DriftDatabase(
  tables: [
    GlobalHeaders,
    MasterPenyulangs,
    LaporanHarians,
    SyncInfos,
    P0Lokals,
    P0Outboxes,
    MasterGardus,
    GarduOutboxes,
    InsGarduHeaders,
    InsGarduRealisasis,
    InsGarduTemuans,
    ListTemuans,
  ],
  daos: [
    MasterDao,
    LaporanDao,
    SyncDao,
    HeaderDao,
    P0Dao,
    MasterGarduDao,
    InspeksiGarduDao,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(driftDatabase(name: 'sisi_db'));

  @override
  int get schemaVersion => 9;

  Future<Set<String>> _columns(String table) async {
    final rows = await customSelect('PRAGMA table_info($table)').get();
    return rows
        .map((row) => row.data['name']?.toString() ?? '')
        .where((name) => name.isNotEmpty)
        .toSet();
  }

  Future<Set<String>> _tables() async {
    final rows = await customSelect(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    ).get();
    return rows
        .map((row) => row.data['name']?.toString() ?? '')
        .where((name) => name.isNotEmpty)
        .toSet();
  }

  Future<void> _ensureLocalMirrorTables() async {
    await customStatement('CREATE TABLE IF NOT EXISTS local_dataset_state (dataset TEXT PRIMARY KEY NOT NULL, version TEXT NOT NULL, updated_at TEXT NOT NULL, row_count INTEGER NOT NULL DEFAULT 0, kind TEXT NOT NULL DEFAULT "main")');
    await customStatement('CREATE TABLE IF NOT EXISTS local_dataset_rows (dataset TEXT NOT NULL, row_key TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(dataset,row_key))');
    await customStatement('CREATE INDEX IF NOT EXISTS idx_local_dataset ON local_dataset_rows(dataset)');
  }

  Future<void> _ensureTeknikToTables() async {
    await customStatement('CREATE TABLE IF NOT EXISTS teknik_to_cache (kode_pekerjaan TEXT NOT NULL, mode TEXT NOT NULL, tanggal TEXT NOT NULL DEFAULT "", payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (kode_pekerjaan, mode))');
    await customStatement('CREATE INDEX IF NOT EXISTS idx_teknik_to_mode_tanggal ON teknik_to_cache(mode, tanggal DESC)');
    await customStatement('CREATE TABLE IF NOT EXISTS teknik_to_team (nama TEXT PRIMARY KEY NOT NULL, updated_at TEXT NOT NULL)');
    await customStatement('CREATE TABLE IF NOT EXISTS teknik_to_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, kode_pekerjaan TEXT NOT NULL, mode TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)');
  }

  @override
  MigrationStrategy get migration => MigrationStrategy(
        beforeOpen: (_) async {
          await _ensureTeknikToTables();
          await _ensureLocalMirrorTables();
        },
        onUpgrade: (m, from, to) async {
          var tables = await _tables();

          if (from < 2) {
            if (!tables.contains('p0_lokal')) await m.createTable(p0Lokals);
            if (!tables.contains('p0_outbox')) await m.createTable(p0Outboxes);
          }
          if (from < 3 && !tables.contains('master_gardu')) {
            await m.createTable(masterGardus);
          }

          tables = await _tables();
          if (from < 4 && !tables.contains('gardu_outbox')) {
            await m.createTable(garduOutboxes);
          }

          if (from < 5 || from < 6) {
            final columns = await _columns('master_gardu');
            if (!columns.contains('arus_max_per_fasa')) {
              await m.addColumn(masterGardus, masterGardus.arusMaxPerFasa);
            }
            if (!columns.contains('pembebanan_kva')) {
              await m.addColumn(masterGardus, masterGardus.pembebananKva);
            }
            if (!columns.contains('pembebanan_kw')) {
              await m.addColumn(masterGardus, masterGardus.pembebananKw);
            }
            if (!columns.contains('persentase_beban')) {
              await m.addColumn(masterGardus, masterGardus.persentaseBeban);
            }
            if (!columns.contains('kategori_beban')) {
              await m.addColumn(masterGardus, masterGardus.kategoriBeban);
            }
            if (!columns.contains('penyulang')) {
              await m.addColumn(masterGardus, masterGardus.penyulang);
            }
            if (!columns.contains('section')) {
              await m.addColumn(masterGardus, masterGardus.section);
            }
            if (!columns.contains('berat_trafo')) {
              await m.addColumn(masterGardus, masterGardus.beratTrafo);
            }
            if (!columns.contains('volume_minyak')) {
              await m.addColumn(masterGardus, masterGardus.volumeMinyak);
            }
          }

          if (from < 7) {
            final columns = await _columns('master_gardu');
            if (!columns.contains('latitude')) {
              await m.addColumn(masterGardus, masterGardus.latitude);
            }
            if (!columns.contains('longitude')) {
              await m.addColumn(masterGardus, masterGardus.longitude);
            }
          }

          if (from < 6) {
            tables = await _tables();
            if (!tables.contains('ins_gardu_header')) {
              await m.createTable(insGarduHeaders);
            }
            if (!tables.contains('ins_gardu_realisasi')) {
              await m.createTable(insGarduRealisasis);
            }
            if (!tables.contains('ins_gardu_temuan')) {
              await m.createTable(insGarduTemuans);
            }
            if (!tables.contains('list_temuan')) {
              await m.createTable(listTemuans);
            }
          }
        },
      );
}
