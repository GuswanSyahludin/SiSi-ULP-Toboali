// lib/db/tables/laporan_harian.dart
// ─────────────────────────────────────────────────────────────
// Cermin sheet `Teknik_Laporan Harian` — SATU BARIS per TANGGAL.
//
// Sumber kolom: LH.COL + header _lhSheet di SiSi_BackEnd
// (Tek-LapUP3UIWHarian.js):
//   A=No, B=Tanggal, C=Penyulang, D=Panjang kmS Inspeksi,
//   E=Temuan, F=Eksekusi, G=Laporan UP3, H=Laporan UIW
//
// Peran kolom:
//   C..F = input manual "E. C4A" (petugas, harian)
//   G,H  = teks WA hasil generate server (Laporan UP3 & UIW/Wilayah)
// ─────────────────────────────────────────────────────────────

import 'package:drift/drift.dart';

class LaporanHarians extends Table {
  @override
  String get tableName => 'laporan_harian';

  // Satu baris per tanggal -> Tanggal adalah kunci utama
  @override
  Set<Column> get primaryKey => {tanggal};

  /// A — No: nomor urut di sheet (bukan kunci)
  IntColumn get no => integer().nullable()();

  /// B — Tanggal, TEXT ISO "yyyy-MM-dd" (kunci utama)
  TextColumn get tanggal => text()();

  /// C — Penyulang (input manual C4A)
  TextColumn get penyulang => text().withDefault(const Constant(''))();

  /// D — Panjang kmS Inspeksi (teks gaya Indonesia, mis. "4,1")
  TextColumn get panjangKms => text().withDefault(const Constant(''))();

  /// E — Temuan (input manual C4A)
  TextColumn get temuan => text().withDefault(const Constant(''))();

  /// F — Eksekusi (input manual C4A)
  TextColumn get eksekusi => text().withDefault(const Constant(''))();

  /// G — Laporan UP3 (teks WA hasil generate server; panjang)
  TextColumn get laporanUp3 => text().withDefault(const Constant(''))();

  /// H — Laporan UIW (teks WA hasil generate server; panjang)
  TextColumn get laporanUiw => text().withDefault(const Constant(''))();
}
