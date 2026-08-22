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
import 'daos/master_dao.dart';
import 'daos/laporan_dao.dart';
import 'daos/sync_dao.dart';
import 'daos/header_dao.dart';
import 'daos/p0_dao.dart';
import 'daos/master_gardu_dao.dart';

part 'app_database.g.dart';

@DriftDatabase(
  tables: [GlobalHeaders, MasterPenyulangs, LaporanHarians, SyncInfos,
    P0Lokals, P0Outboxes, MasterGardus, GarduOutboxes],
  daos: [MasterDao, LaporanDao, SyncDao, HeaderDao, P0Dao, MasterGarduDao],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(driftDatabase(name: 'sisi_db'));
  @override int get schemaVersion => 4;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onUpgrade: (m, from, to) async {
      if (from < 2) { await m.createTable(p0Lokals); await m.createTable(p0Outboxes); }
      if (from < 3) await m.createTable(masterGardus);
      if (from < 4) await m.createTable(garduOutboxes);
    },
  );
}
