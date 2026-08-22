// lib/db/tables/p0_lokal.dart
// ───────────────────────────────────────────────────
// Cermin LOKAL kartu Verifikasi P0 (sumber: db_Yandal_P0 lewat
// getMobileApprovalP0List). SATU BARIS per Kode P0.
//
// Kenapa menyimpan `dataJson` utuh, bukan 25 kolom terpisah?
//   Kartu P0 punya sangat banyak field (3 foto + jarak + durasi + catatan +
//   koordinat + hasil keputusan). Menyalin semuanya jadi kolom berarti setiap
//   penambahan field di backend memaksa migrasi skema. Dengan menyimpan balasan
//   server APA ADANYA sebagai JSON, kartu bisa dirender persis seperti mode
//   online dan backend bebas menambah field tanpa mengubah tabel ini.
//
// Kolom terpisah HANYA untuk yang dipakai memfilter/mengurutkan daftar.
//
// Rev 22 Agu 2026 — Project Dart: Verifikasi P0 offline-first.
// ───────────────────────────────────────────────────

import 'package:drift/drift.dart';

@DataClassName('P0Lokal')
class P0Lokals extends Table {
  @override
  String get tableName => 'p0_lokal';

  @override
  Set<Column> get primaryKey => {kodeP0};

  /// Kode P0 — kunci utama, sama dengan kolom Kode P0 di sheet.
  TextColumn get kodeP0 => text()();

  /// ULP pemilik baris (filter daftar).
  TextColumn get ulp => text().withDefault(const Constant(''))();

  /// Tanggal pekerjaan, TEXT ISO "yyyy-MM-dd" (filter daftar).
  TextColumn get tanggal => text().withDefault(const Constant(''))();

  /// Status MENURUT SERVER: Menunggu / Approved / Rejected.
  /// Keputusan yang belum terkirim TIDAK menimpa kolom ini — status lokal
  /// dibaca dari p0_outbox agar keduanya bisa dibandingkan.
  TextColumn get statusServer => text().withDefault(const Constant('Menunggu'))();

  /// Balasan server untuk kartu ini, utuh, hasil jsonEncode.
  TextColumn get dataJson => text().withDefault(const Constant('{}'))();

  /// ISO datetime kapan baris ini ditarik dari server.
  TextColumn get diambilPada => text().withDefault(const Constant(''))();
}
