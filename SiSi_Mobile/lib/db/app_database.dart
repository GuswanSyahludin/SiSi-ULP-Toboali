// lib/db/app_database.dart
// ───────────────────────────────────────────────────
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
//
// Rev 21 Agu 2026: + HeaderDao (akses tabel global_header utk menu Laporan
// Harian). Tambah DAO TIDAK mengubah skema tabel → schemaVersion tetap 1.
//
// Rev 22 Agu 2026: + P0Lokals & P0Outboxes + P0Dao — menu Teknik → Verifikasi P0
// jadi offline-first: keputusan Approve/Reject ditulis ke server lokal dulu,
// lalu dikirim ke Apps Script + gsheet lewat Pengaturan → Sinkron.
// Karena ADA tabel baru, schemaVersion 1 → 2 dengan migrasi createTable.
// ───────────────────────────────────────────────────

import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

import 'tables/global_header.dart';
import 'tables/master_penyulang.dart';
import 'tables/laporan_harian.dart';
import 'tables/sync_info.dart';
import 'tables/p0_lokal.dart';
import 'tables/p0_outbox.dart';
import 'daos/master_dao.dart';
import 'daos/laporan_dao.dart';
import 'daos/sync_dao.dart';
import 'daos/header_dao.dart';
import 'daos/p0_dao.dart';

part 'app_database.g.dart'; // file hasil generate build_runner (jangan diedit manual)

@DriftDatabase(
  tables: [
    GlobalHeaders,
    MasterPenyulangs,
    LaporanHarians,
    SyncInfos,
    P0Lokals,
    P0Outboxes,
  ],
  daos: [MasterDao, LaporanDao, SyncDao, HeaderDao, P0Dao],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(driftDatabase(name: 'sisi_db'));

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onUpgrade: (m, from, to) async {
          // v1 → v2: dua tabel Verifikasi P0. Hanya MENAMBAH tabel, jadi seluruh
          // data lokal yang sudah ada (master penyulang, laporan, sync_info)
          // tetap utuh — pengguna TIDAK perlu download master data lagi.
          if (from < 2) {
            await m.createTable(p0Lokals);
            await m.createTable(p0Outboxes);
          }
        },
      );
}
