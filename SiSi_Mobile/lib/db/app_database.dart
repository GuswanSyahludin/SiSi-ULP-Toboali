// lib/db/app_database.dart
// Database lokal SiSi Mobile (Drift / SQLite).

import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

import 'tables/global_header.dart';
import 'tables/master_penyulang.dart';
import 'tables/laporan_harian.dart';
import 'tables/sync_info.dart';
import 'tables/p0_lokal.dart';
import 'tables/p0_outbox.dart';
import 'tables/master_gardu.dart';
import 'daos/master_dao.dart';
import 'daos/laporan_dao.dart';
import 'daos/sync_dao.dart';
import 'daos/header_dao.dart';
import 'daos/p0_dao.dart';
import 'daos/master_gardu_dao.dart';

part 'app_database.g.dart'; // file hasil generate build_runner (jangan diedit manual)

@DriftDatabase(
  tables: [
    GlobalHeaders,
    MasterPenyulangs,
    LaporanHarians,
    SyncInfos,
    P0Lokals,
    P0Outboxes,
    MasterGardus,
  ],
  daos: [MasterDao, LaporanDao, SyncDao, HeaderDao, P0Dao, MasterGarduDao],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(driftDatabase(name: 'sisi_db'));

  @override
  int get schemaVersion => 3;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onUpgrade: (m, from, to) async {
          if (from < 2) {
            await m.createTable(p0Lokals);
            await m.createTable(p0Outboxes);
          }
          if (from < 3) {
            await m.createTable(masterGardus);
          }
        },
      );
}
