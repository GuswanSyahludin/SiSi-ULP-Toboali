// lib/db/app_database.dart
// ─────────────────────────────────────────────────────────────
// Jantung database lokal SiSi Mobile (Project Dart / offline-first).
// Semua tabel didaftarkan di @DriftDatabase(tables: [...]) dan
// semua DAO di @DriftDatabase(daos: [...]).
//
// Cara pakai:
//   final db = AppDatabase();        // buka/buat file SQLite di HP
//   ... baca/tulis via db.<namaTabel> atau db.<namaDao> ...
//
// Setelah mengubah/tambah tabel:
//   1) daftarkan tabelnya di bawah
//   2) jalankan: dart run build_runner build   (file .g.dart dibuat ulang)
//   3) bila struktur berubah (tambah/hapus kolom), naikkan schemaVersion
//      dan tulis migrasinya di migration()
// ─────────────────────────────────────────────────────────────

import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

import 'tables/global_header.dart';
import 'tables/master_penyulang.dart';
import 'tables/laporan_harian.dart';
import 'tables/sync_info.dart';
import 'daos/master_dao.dart';
import 'daos/laporan_dao.dart';
import 'daos/sync_dao.dart';

part 'app_database.g.dart'; // file hasil generate build_runner (jangan diedit manual)

@DriftDatabase(
  tables: [GlobalHeaders, MasterPenyulangs, LaporanHarians, SyncInfos],
  daos: [MasterDao, LaporanDao, SyncDao],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(driftDatabase(name: 'sisi_db'));

  @override
  int get schemaVersion => 1;

  // Contoh migrasi untuk versi berikutnya:
  // @override
  // MigrationStrategy get migration => MigrationStrategy(
  //   onUpgrade: (m, from, to) async {
  //     if (from < 2) { /* await m.addColumn(...); */ }
  //   },
  // );
}
