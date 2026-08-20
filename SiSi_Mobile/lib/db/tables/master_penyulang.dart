// lib/db/tables/master_penyulang.dart
// ─────────────────────────────────────────────────────────────
// Master data: PENYULANG — cermin penuh sheet `db_Penyulang` (A–E).
//
// Sifat data: SATU BARIS = SATU PASANGAN (Nama Penyulang, Section).
// Nama penyulang yang sama bisa muncul berkali-kali dengan Section
// berbeda — karena itu sheet ini tidak punya kolom kunci unik, dan
// tabel lokal memakai id lokal auto-increment.
//
// Dipakai untuk DUA dropdown sekaligus:
//   - Dropdown Penyulang : SELECT DISTINCT namaPenyulang
//   - Dropdown Section   : SELECT section WHERE namaPenyulang = ?
// Kolom Section menyimpan label "Induk - Anak" yang juga dipakai
// membangun topologi (padanan _sectionRange di server).
//
// Sumber kolom: sheet db_Penyulang (dikonfirmasi 20 Agu 2026):
//   A=No, B=ULP, C=Nama Penyulang, D=Nama Switching, E=Section
// ─────────────────────────────────────────────────────────────

import 'package:drift/drift.dart';

@TableIndex(name: 'idx_master_penyulang_nama', columns: {#namaPenyulang})
class MasterPenyulangs extends Table {
  @override
  String get tableName => 'master_penyulang';

  /// id lokal (auto-increment; sheet tidak punya kunci unik)
  IntColumn get id => integer().autoIncrement()();

  /// A — No: nomor urut di sheet (bukan kunci)
  IntColumn get no => integer().nullable()();

  /// B — ULP
  TextColumn get ulp => text().withDefault(const Constant(''))();

  /// C — Nama Penyulang (bisa muncul berulang: 1 baris per section)
  TextColumn get namaPenyulang => text().withDefault(const Constant(''))();

  /// D — Nama Switching
  TextColumn get namaSwitching => text().withDefault(const Constant(''))();

  /// E — Section (label "Induk - Anak" untuk topologi)
  TextColumn get section => text().withDefault(const Constant(''))();
}
