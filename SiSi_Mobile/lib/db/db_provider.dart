// lib/db/db_provider.dart
// ─────────────────────────────────────────────────────────────
// SATU instance database untuk seluruh aplikasi (singleton).
// Semua repository/DAO mengambil koneksi dari sini — jangan
// membuat AppDatabase() baru di sembarang tempat.
// ─────────────────────────────────────────────────────────────

import 'app_database.dart';

class DbProvider {
  DbProvider._();

  static final AppDatabase instance = AppDatabase();
}
