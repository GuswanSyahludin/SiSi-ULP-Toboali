// lib/db/tables/global_header.dart
// ─────────────────────────────────────────────────────────────
// Tabel lokal: cermin sheet `db_Global_Header` (kakek semua modul).
// Sumber kolom: COL_INS.HEADER di SiSi_BackEnd/Core/Code.js
//
// Keputusan desain (disetujui 20 Agu 2026):
//  1) Kunci utama = Kode Header (kolom No hanya nomor urut sheet)
//  2) Tanggal = TEXT ISO "yyyy-MM-dd" (konsisten dgn _normTgl backend)
//  3) Km Awal/Akhir = TEXT (sheet menyimpan gaya Indonesia: "4,1")
//  4) Kolom teks default '' (sheet sering punya sel kosong)
//  5) Nama tabel SQLite = global_header
//
// Catatan: di dalam SQLite, Drift menulis nama kolom sebagai snake_case
// (kodeHeader -> kode_header). Di kode Dart selalu pakai camelCase.
// ─────────────────────────────────────────────────────────────

import 'package:drift/drift.dart';

@TableIndex(name: 'idx_global_header_tanggal', columns: {#tanggal})
@TableIndex(name: 'idx_global_header_tim', columns: {#tim})
@TableIndex(name: 'idx_global_header_sub_tim', columns: {#subTim})
class GlobalHeaders extends Table {
  @override
  String get tableName => 'global_header';

  // Kunci utama tabel = Kode Header (dipakai relasi ke semua tabel anak)
  @override
  Set<Column> get primaryKey => {kodeHeader};

  /// A — No: nomor urut di sheet (bukan kunci; bisa bergeser)
  IntColumn get no => integer().nullable()();

  /// B — Kode Header: kunci utama & kunci relasi (FK) ke tabel anak
  TextColumn get kodeHeader => text()();

  /// C — ULP
  TextColumn get ulp => text().withDefault(const Constant(''))();

  /// D — Hari (Senin..Minggu)
  TextColumn get hari => text().withDefault(const Constant(''))();

  /// E — Tanggal, TEXT format ISO "yyyy-MM-dd"
  TextColumn get tanggal => text().withDefault(const Constant(''))();

  /// F — Tim (ROW / Hartek / Inspeksi Jaringan / ...)
  TextColumn get tim => text().withDefault(const Constant(''))();

  /// G — Sub-Tim (dipakai filter di mobile)
  TextColumn get subTim => text().withDefault(const Constant(''))();

  /// H — Koordinat Awal
  TextColumn get koordinatAwal => text().withDefault(const Constant(''))();

  /// I — Koordinat Akhir
  TextColumn get koordinatAkhir => text().withDefault(const Constant(''))();

  /// J — Km Awal (teks; bisa berisi "4,1")
  TextColumn get kmAwal => text().withDefault(const Constant(''))();

  /// K — Km Akhir (teks)
  TextColumn get kmAkhir => text().withDefault(const Constant(''))();

  /// L — Kendala
  TextColumn get kendala => text().withDefault(const Constant(''))();

  /// M — WA Text (laporan hasil generate; teks panjang)
  TextColumn get waText => text().withDefault(const Constant(''))();

  /// N — Timestamp input (string ISO)
  TextColumn get timestamp => text().withDefault(const Constant(''))();

  /// O — Input By (username penginput)
  TextColumn get inputBy => text().withDefault(const Constant(''))();

  /// P — Timestamp Update terakhir (di-stempel WA engine)
  TextColumn get timestampUpdate => text().withDefault(const Constant(''))();

  /// Q — Status TextWA (mis. "Update")
  TextColumn get statusTextWa => text().withDefault(const Constant(''))();
}
