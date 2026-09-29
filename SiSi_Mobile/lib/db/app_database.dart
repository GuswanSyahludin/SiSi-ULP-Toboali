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

void _configureNativeDatabase(dynamic database) {
  database.execute('PRAGMA busy_timeout = 10000');
  database.execute('PRAGMA journal_mode = WAL');
}

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
    InspeksiGarduDao
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase({required String name})
      : super(
          driftDatabase(
            name: name,
            native: const DriftNativeOptions(
              shareAcrossIsolates: true,
              setup: _configureNativeDatabase,
            ),
          ),
        );
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
            "SELECT name FROM sqlite_master WHERE type = 'table'")
        .get();
    return rows
        .map((row) => row.data['name']?.toString() ?? '')
        .where((name) => name.isNotEmpty)
        .toSet();
  }

  Future<void> _ensureLocalMirrorTables() async {
    await customStatement(
        'CREATE TABLE IF NOT EXISTS local_dataset_state (dataset TEXT PRIMARY KEY NOT NULL, version TEXT NOT NULL, updated_at TEXT NOT NULL, row_count INTEGER NOT NULL DEFAULT 0, kind TEXT NOT NULL DEFAULT "main")');
    await customStatement(
        'CREATE TABLE IF NOT EXISTS local_dataset_rows (dataset TEXT NOT NULL, row_key TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(dataset,row_key))');
    await customStatement(
        'CREATE INDEX IF NOT EXISTS idx_local_dataset ON local_dataset_rows(dataset)');
    await customStatement(
        'CREATE TABLE IF NOT EXISTS sync_download_checkpoint (dataset TEXT PRIMARY KEY NOT NULL, version TEXT NOT NULL, snapshot_id TEXT NOT NULL DEFAULT "", total_rows INTEGER NOT NULL DEFAULT 0, downloaded_rows INTEGER NOT NULL DEFAULT 0, kind TEXT NOT NULL DEFAULT "main", updated_at TEXT NOT NULL)');
    final checkpointColumns = await _columns('sync_download_checkpoint');
    if (!checkpointColumns.contains('snapshot_id')) {
      await customStatement(
          'ALTER TABLE sync_download_checkpoint ADD COLUMN snapshot_id TEXT NOT NULL DEFAULT ""');
    }
    await customStatement(
        'CREATE TABLE IF NOT EXISTS sync_download_staging (dataset TEXT NOT NULL, row_key TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(dataset,row_key))');
    await customStatement(
        'CREATE INDEX IF NOT EXISTS idx_sync_staging_dataset ON sync_download_staging(dataset)');
  }

  Future<void> _ensureGarduRevisionTable() async {
    final tables = await _tables();
    const create = 'CREATE TABLE IF NOT EXISTS gardu_server_revision (ulp TEXT NOT NULL DEFAULT "", gardu TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (ulp, gardu))';
    if (!tables.contains('gardu_server_revision')) {
      await customStatement(create);
      return;
    }
    final info = await customSelect('PRAGMA table_info(gardu_server_revision)').get();
    final primary = info
        .where((row) => (row.data['pk'] as num? ?? 0) > 0)
        .toList()
      ..sort((a, b) => ((a.data['pk'] as num?) ?? 0)
          .compareTo((b.data['pk'] as num?) ?? 0));
    final primaryNames = primary.map((row) => row.data['name']).toList();
    if (primaryNames.length == 2 &&
        primaryNames[0] == 'ulp' &&
        primaryNames[1] == 'gardu') return;
    await customStatement('DROP TABLE IF EXISTS gardu_server_revision_v2');
    await customStatement('CREATE TABLE gardu_server_revision_v2 (ulp TEXT NOT NULL DEFAULT "", gardu TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (ulp, gardu))');
    await customStatement('INSERT OR REPLACE INTO gardu_server_revision_v2(ulp,gardu,revision) SELECT COALESCE(ulp,""), gardu, revision FROM gardu_server_revision');
    await customStatement('DROP TABLE gardu_server_revision');
    await customStatement('ALTER TABLE gardu_server_revision_v2 RENAME TO gardu_server_revision');
  }

  Future<void> _rebuildScopedGarduTable(String table) async {
    final staged = '${table}_scoped_v2';
    final create = table == 'master_gardu'
        ? 'CREATE TABLE $staged (ulp TEXT NOT NULL DEFAULT "", gardu TEXT NOT NULL, alamat TEXT NOT NULL DEFAULT "", latitude TEXT NOT NULL DEFAULT "", longitude TEXT NOT NULL DEFAULT "", penyulang TEXT NOT NULL DEFAULT "", section TEXT NOT NULL DEFAULT "", jenis_gardu TEXT NOT NULL DEFAULT "", merk TEXT NOT NULL DEFAULT "", kapasitas_kva TEXT NOT NULL DEFAULT "", no_seri TEXT NOT NULL DEFAULT "", tahun_trafo TEXT NOT NULL DEFAULT "", type_seal TEXT NOT NULL DEFAULT "", berat_trafo TEXT NOT NULL DEFAULT "", volume_minyak TEXT NOT NULL DEFAULT "", merk_phb_tr TEXT NOT NULL DEFAULT "", nomor_seri_phb_tr TEXT NOT NULL DEFAULT "", tahun_phb_tr TEXT NOT NULL DEFAULT "", jam_ukur_wbp TEXT NOT NULL DEFAULT "", tanggal_pengukuran TEXT NOT NULL DEFAULT "", kepemilikan TEXT NOT NULL DEFAULT "", wbp_rs TEXT NOT NULL DEFAULT "", wbp_st TEXT NOT NULL DEFAULT "", wbp_tr TEXT NOT NULL DEFAULT "", wbp_rn TEXT NOT NULL DEFAULT "", wbp_sn TEXT NOT NULL DEFAULT "", wbp_tn TEXT NOT NULL DEFAULT "", wbp_r TEXT NOT NULL DEFAULT "", wbp_s TEXT NOT NULL DEFAULT "", wbp_t TEXT NOT NULL DEFAULT "", wbp_n TEXT NOT NULL DEFAULT "", lwbp_rs TEXT NOT NULL DEFAULT "", lwbp_st TEXT NOT NULL DEFAULT "", lwbp_tr TEXT NOT NULL DEFAULT "", lwbp_rn TEXT NOT NULL DEFAULT "", lwbp_sn TEXT NOT NULL DEFAULT "", lwbp_tn TEXT NOT NULL DEFAULT "", lwbp_r TEXT NOT NULL DEFAULT "", lwbp_s TEXT NOT NULL DEFAULT "", lwbp_t TEXT NOT NULL DEFAULT "", lwbp_n TEXT NOT NULL DEFAULT "", arus_max_per_fasa TEXT NOT NULL DEFAULT "", pembebanan_kva TEXT NOT NULL DEFAULT "", pembebanan_kw TEXT NOT NULL DEFAULT "", persentase_beban TEXT NOT NULL DEFAULT "", kategori_beban TEXT NOT NULL DEFAULT "", PRIMARY KEY (ulp, gardu))'
        : 'CREATE TABLE $staged (gardu TEXT NOT NULL, ulp TEXT NOT NULL DEFAULT "", perubahan_json TEXT NOT NULL DEFAULT "{}", diubah_oleh TEXT NOT NULL DEFAULT "", diubah_pada TEXT NOT NULL DEFAULT "", status TEXT NOT NULL DEFAULT "pending", percobaan INTEGER NOT NULL DEFAULT 0, pesan_gagal TEXT NOT NULL DEFAULT "", PRIMARY KEY (ulp, gardu))';
    final columns = table == 'master_gardu'
        ? 'ulp,gardu,alamat,latitude,longitude,penyulang,section,jenis_gardu,merk,kapasitas_kva,no_seri,tahun_trafo,type_seal,berat_trafo,volume_minyak,merk_phb_tr,nomor_seri_phb_tr,tahun_phb_tr,jam_ukur_wbp,tanggal_pengukuran,kepemilikan,wbp_rs,wbp_st,wbp_tr,wbp_rn,wbp_sn,wbp_tn,wbp_r,wbp_s,wbp_t,wbp_n,lwbp_rs,lwbp_st,lwbp_tr,lwbp_rn,lwbp_sn,lwbp_tn,lwbp_r,lwbp_s,lwbp_t,lwbp_n,arus_max_per_fasa,pembebanan_kva,pembebanan_kw,persentase_beban,kategori_beban'
        : 'gardu,ulp,perubahan_json,diubah_oleh,diubah_pada,status,percobaan,pesan_gagal';
    await customStatement('DROP TABLE IF EXISTS $staged');
    await customStatement(create);
    await customStatement('INSERT INTO $staged($columns) SELECT $columns FROM $table');
    await customStatement('DROP TABLE $table');
    await customStatement('ALTER TABLE $staged RENAME TO $table');
    if (table == 'master_gardu') {
      await customStatement('CREATE INDEX IF NOT EXISTS idx_master_gardu_ulp ON master_gardu(ulp)');
      await customStatement('CREATE INDEX IF NOT EXISTS idx_master_gardu_nomor ON master_gardu(gardu)');
    }
  }

  Future<void> _ensureScopedGarduTables() async {
    for (final table in ['master_gardu', 'gardu_outbox']) {
      final info = await customSelect('PRAGMA table_info($table)').get();
      if (info.isEmpty) continue;
      final primary = info
          .where((row) => (row.data['pk'] as num? ?? 0) > 0)
          .toList()
        ..sort((a, b) => ((a.data['pk'] as num?) ?? 0)
            .compareTo((b.data['pk'] as num?) ?? 0));
      final names = primary.map((row) => row.data['name']?.toString()).toList();
      if (names.length == 2 && names[0] == 'ulp' && names[1] == 'gardu') {
        continue;
      }
      await _rebuildScopedGarduTable(table);
    }
  }

  Future<void> _ensureTeknikToTables() async {
    await customStatement(
        'CREATE TABLE IF NOT EXISTS teknik_to_cache (kode_pekerjaan TEXT NOT NULL, mode TEXT NOT NULL, tanggal TEXT NOT NULL DEFAULT "", payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (kode_pekerjaan, mode))');
    await customStatement(
        'CREATE INDEX IF NOT EXISTS idx_teknik_to_mode_tanggal ON teknik_to_cache(mode, tanggal DESC)');
    await customStatement(
        'CREATE TABLE IF NOT EXISTS teknik_to_team (nama TEXT PRIMARY KEY NOT NULL, updated_at TEXT NOT NULL)');
    await customStatement(
        'CREATE TABLE IF NOT EXISTS teknik_to_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, kode_pekerjaan TEXT NOT NULL, mode TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)');
  }

  @override
  MigrationStrategy get migration => MigrationStrategy(
        beforeOpen: (_) async {
          await _ensureTeknikToTables();
          await _ensureLocalMirrorTables();
          await _ensureGarduRevisionTable();
          await _ensureScopedGarduTables();
        },
        onUpgrade: (m, from, to) async {
          var tables = await _tables();
          if (from < 2) {
            if (!tables.contains('p0_lokal')) await m.createTable(p0Lokals);
            if (!tables.contains('p0_outbox')) await m.createTable(p0Outboxes);
          }
          if (from < 3 && !tables.contains('master_gardu'))
            await m.createTable(masterGardus);
          tables = await _tables();
          if (from < 4 && !tables.contains('gardu_outbox'))
            await m.createTable(garduOutboxes);
          if (from < 5 || from < 6) {
            final columns = await _columns('master_gardu');
            if (!columns.contains('arus_max_per_fasa'))
              await m.addColumn(masterGardus, masterGardus.arusMaxPerFasa);
            if (!columns.contains('pembebanan_kva'))
              await m.addColumn(masterGardus, masterGardus.pembebananKva);
            if (!columns.contains('pembebanan_kw'))
              await m.addColumn(masterGardus, masterGardus.pembebananKw);
            if (!columns.contains('persentase_beban'))
              await m.addColumn(masterGardus, masterGardus.persentaseBeban);
            if (!columns.contains('kategori_beban'))
              await m.addColumn(masterGardus, masterGardus.kategoriBeban);
            if (!columns.contains('penyulang'))
              await m.addColumn(masterGardus, masterGardus.penyulang);
            if (!columns.contains('section'))
              await m.addColumn(masterGardus, masterGardus.section);
            if (!columns.contains('berat_trafo'))
              await m.addColumn(masterGardus, masterGardus.beratTrafo);
            if (!columns.contains('volume_minyak'))
              await m.addColumn(masterGardus, masterGardus.volumeMinyak);
          }
          if (from < 7) {
            final columns = await _columns('master_gardu');
            if (!columns.contains('latitude'))
              await m.addColumn(masterGardus, masterGardus.latitude);
            if (!columns.contains('longitude'))
              await m.addColumn(masterGardus, masterGardus.longitude);
          }
          if (from < 6) {
            tables = await _tables();
            if (!tables.contains('ins_gardu_header'))
              await m.createTable(insGarduHeaders);
            if (!tables.contains('ins_gardu_realisasi'))
              await m.createTable(insGarduRealisasis);
            if (!tables.contains('ins_gardu_temuan'))
              await m.createTable(insGarduTemuans);
            if (!tables.contains('list_temuan'))
              await m.createTable(listTemuans);
          }
          await _ensureGarduRevisionTable();
          await _ensureScopedGarduTables();
        },
      );
}
