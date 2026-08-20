// lib/db/repositories/master_repository.dart
// ─────────────────────────────────────────────────────────────
// Repository master data — lapisan yang dipanggil UI.
// Pola: LOKAL (SQLite) dulu → fallback server → cache ke lokal.
// Sync/download master data penuh (getMasterData) menyusul di Fase 2.
// ─────────────────────────────────────────────────────────────

import 'package:drift/drift.dart' show Value;

import '../db_provider.dart';
import '../tables/master_penyulang.dart';

class MasterRepository {
  /// Daftar nama penyulang unik (dropdown Penyulang). Baca lokal.
  Future<List<String>> daftarPenyulang() =>
      DbProvider.instance.masterDao.daftarPenyulang();

  /// Peta penyulang -> daftar section (dropdown Section bertingkat). Baca lokal.
  Future<Map<String, List<String>>> sectionByPenyulang() =>
      DbProvider.instance.masterDao.sectionByPenyulang();

  /// true bila master data sudah terisi di lokal.
  Future<bool> sudahAdaData() async => (await daftarPenyulang()).isNotEmpty;

  /// Simpan hasil API getMobileDropdownRow ke lokal (read-through cache),
  /// supaya buka aplikasi berikutnya dropdown jalan tanpa internet.
  /// CATATAN: respons API hanya memuat nama+section; kolom ulp/namaSwitching
  /// dilengkapi nanti oleh sync getMasterData (Fase 2).
  Future<void> simpanDariApi(
      List<String> penyulang, Map<String, dynamic> sectionByPenyulang) async {
    final daftar = <MasterPenyulangsCompanion>[];
    for (final nama in penyulang) {
      final sections = List<String>.from(sectionByPenyulang[nama] ?? const []);
      if (sections.isEmpty) {
        daftar.add(MasterPenyulangsCompanion.insert(namaPenyulang: Value(nama)));
      } else {
        for (final sec in sections) {
          daftar.add(MasterPenyulangsCompanion.insert(
              namaPenyulang: Value(nama), section: Value(sec)));
        }
      }
    }
    if (daftar.isNotEmpty) {
      await DbProvider.instance.masterDao.gantiSemuaPenyulang(daftar);
    }
  }
}
