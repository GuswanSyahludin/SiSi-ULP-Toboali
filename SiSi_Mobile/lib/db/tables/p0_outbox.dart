// lib/db/tables/p0_outbox.dart
// ───────────────────────────────────────────────────
// ANTREAN KELUAR (outbox) keputusan Verifikasi P0.
//
// Inti pola offline-first menu Teknik → Verifikasi P0:
//   1. Admin menekan Approve / Reject → keputusan ditulis DI SINI (lokal).
//      Tidak ada permintaan jaringan sama sekali pada tahap ini.
//   2. Pengaturan → Sinkron → antrean dikirim ke Apps Script
//      (setMobileApprovalP0) lalu diteruskan ke gsheet oleh backend.
//
// PRIMARY KEY = kodeP0 (BUKAN baris log). Konsekuensinya: satu P0 hanya punya
// satu keputusan menggantung, dan admin bisa MERALAT keputusannya berkali-kali
// sebelum sync tanpa menumpuk baris atau mengirim keputusan basi ke server.
//
// Rev 22 Agu 2026 — Project Dart.
// ───────────────────────────────────────────────────

import 'package:drift/drift.dart';

@DataClassName('P0Outbox')
class P0Outboxes extends Table {
  @override
  String get tableName => 'p0_outbox';

  @override
  Set<Column> get primaryKey => {kodeP0};

  /// Kode P0 yang diputuskan.
  TextColumn get kodeP0 => text()();

  /// 'Approved' atau 'Rejected' — nilai yang dikirim ke kolom Status Approval.
  TextColumn get keputusan => text()();

  /// Alasan penolakan (wajib untuk Rejected, kolom AQ di sheet).
  TextColumn get alasan => text().withDefault(const Constant(''))();

  /// Username pemutus (diambil dari sesi login saat keputusan dibuat, BUKAN
  /// saat sync — supaya jejaknya tetap benar walau HP dipakai berganti akun).
  TextColumn get username => text().withDefault(const Constant(''))();

  /// Tanggal pekerjaan P0 — dipakai UI untuk mengelompokkan antrean.
  TextColumn get tanggal => text().withDefault(const Constant(''))();

  /// ISO datetime saat keputusan dibuat di HP.
  TextColumn get dibuatPada => text().withDefault(const Constant(''))();

  /// 'pending' = belum terkirim, 'gagal' = percobaan terakhir ditolak server.
  /// Baris yang sudah 'terkirim' langsung DIHAPUS, jadi nilai itu hampir tidak
  /// pernah tersimpan — tabel ini memang hanya menampung yang belum tuntas.
  TextColumn get status => text().withDefault(const Constant('pending'))();

  /// Berapa kali sudah dicoba kirim (untuk diagnosa di kartu Pengaturan).
  IntColumn get percobaan => integer().withDefault(const Constant(0))();

  /// Pesan galat percobaan terakhir — ditampilkan apa adanya ke admin.
  TextColumn get pesanGagal => text().withDefault(const Constant(''))();
}
