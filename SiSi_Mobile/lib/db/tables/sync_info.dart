// lib/db/tables/sync_info.dart
// ─────────────────────────────────────────────────────────────
// Tabel status sinkronisasi — SATU BARIS per modul/kunci.
// Dipakai untuk:
//   • penanda kartu Pengaturan (kapan modul terakhir di-sync)
//   • interlock menu (master data sudah di-download atau belum)
//   • menyimpan kode server lokal (perangkatId)
// ─────────────────────────────────────────────────────────────

import 'package:drift/drift.dart';

class SyncInfos extends Table {
  @override
  String get tableName => 'sync_info';

  @override
  Set<Column> get primaryKey => {key};

  /// Nama modul/kunci: 'masterData', 'laporanTeknik', 'perangkatId', dst
  TextColumn get key => text()();

  /// ISO datetime terakhir sinkron ('' = belum pernah)
  TextColumn get lastSyncAt => text().withDefault(const Constant(''))();

  /// Jumlah data hasil sinkron terakhir
  IntColumn get jumlahData => integer().withDefault(const Constant(0))();

  /// Catatan/nilai bebas (mis. nilai perangkatId disimpan di kolom ini)
  TextColumn get keterangan => text().withDefault(const Constant(''))();
}
