// lib/db/tables/master_penyulang.dart
// ─────────────────────────────────────────────────────────────
// Master data: PENYULANG (isi dropdown di form-form mobile).
// Sumber server: sheet db_Penyulang (kolom C = Penyulang).
// Di HP tabel ini diisi saat download master data (getMasterData).
// ─────────────────────────────────────────────────────────────

import 'package:drift/drift.dart';

class MasterPenyulangs extends Table {
  @override
  String get tableName => 'master_penyulang';

  /// id lokal (auto-increment; bukan dari server)
  IntColumn get id => integer().autoIncrement()();

  /// Nama penyulang, mis. "Berao" — tampil sebagai opsi dropdown
  TextColumn get nama => text()();
}
