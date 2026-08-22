// lib/db/daos/p0_dao.dart
// ───────────────────────────────────────────────────
// DAO Verifikasi P0 — melayani DUA tabel:
//   • p0_lokal  : cermin kartu dari server (baca daftar saat offline)
//   • p0_outbox : antrean keputusan yang belum dikirim ke Apps Script
//
// Rev 22 Agu 2026 — Project Dart: Verifikasi P0 offline-first.
// ───────────────────────────────────────────────────

import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/p0_lokal.dart';
import '../tables/p0_outbox.dart';

part 'p0_dao.g.dart'; // hasil generate build_runner

@DriftAccessor(tables: [P0Lokals, P0Outboxes])
class P0Dao extends DatabaseAccessor<AppDatabase> with _$P0DaoMixin {
  P0Dao(super.db);

  // ═════ CERMIN KARTU (p0_lokal) ═════

  /// Ganti isi cermin untuk SATU kombinasi ulp+tanggal.
  ///
  /// Sengaja "hapus lalu tulis" pada lingkup sempit itu saja: baris yang sudah
  /// hilang di server (mis. dipindah ke ARSIP) ikut lenyap dari HP, tapi cermin
  /// tanggal lain TIDAK tersentuh sehingga data offline hari sebelumnya aman.
  Future<void> gantiCermin(
    String ulp,
    String tanggal,
    List<P0LokalsCompanion> baris,
  ) {
    return transaction(() async {
      await (delete(p0Lokals)
            ..where((t) => t.ulp.equals(ulp) & t.tanggal.equals(tanggal)))
          .go();
      if (baris.isNotEmpty) {
        await batch((b) => b.insertAllOnConflictUpdate(p0Lokals, baris));
      }
    });
  }

  /// Baca cermin untuk 1 tanggal (semua status; penyaringan status dilakukan
  /// repository karena keputusan lokal ikut diperhitungkan).
  Future<List<P0Lokal>> bacaCermin(String ulp, String tanggal) {
    final q = select(p0Lokals)
      ..where((t) => t.tanggal.equals(tanggal))
      ..orderBy([(t) => OrderingTerm.asc(t.kodeP0)]);
    if (ulp.isNotEmpty) {
      q.where((t) => t.ulp.equals(ulp) | t.ulp.equals(''));
    }
    return q.get();
  }

  /// Setelah keputusan benar-benar terkirim, status server di cermin ikut
  /// diperbarui supaya kartu langsung pindah tab tanpa perlu tarik ulang.
  Future<void> setStatusServer(String kodeP0, String status) {
    return (update(p0Lokals)..where((t) => t.kodeP0.equals(kodeP0)))
        .write(P0LokalsCompanion(statusServer: Value(status)));
  }

  // ═════ ANTREAN KEPUTUSAN (p0_outbox) ═════

  /// Catat / ralat keputusan. insertOnConflictUpdate + primary key kodeP0 =
  /// keputusan terbaru selalu menang, antrean tidak menumpuk.
  Future<void> simpanKeputusan(P0OutboxesCompanion data) {
    return into(p0Outboxes).insertOnConflictUpdate(data);
  }

  Future<P0Outbox?> keputusan(String kodeP0) {
    return (select(p0Outboxes)..where((t) => t.kodeP0.equals(kodeP0)))
        .getSingleOrNull();
  }

  /// Semua keputusan yang belum tuntas (pending + gagal), tertua dulu supaya
  /// urutan pengiriman mengikuti urutan pengambilan keputusan.
  Future<List<P0Outbox>> antrean() {
    return (select(p0Outboxes)
          ..orderBy([(t) => OrderingTerm.asc(t.dibuatPada)]))
        .get();
  }

  /// Versi reaktif — dipakai kartu Pengaturan & spanduk di layar Verifikasi P0
  /// agar jumlah antrean berubah sendiri tanpa refresh manual.
  Stream<List<P0Outbox>> pantauAntrean() {
    return (select(p0Outboxes)
          ..orderBy([(t) => OrderingTerm.asc(t.dibuatPada)]))
        .watch();
  }

  /// Batalkan keputusan yang belum terkirim (admin salah tekan).
  Future<void> batalkan(String kodeP0) {
    return (delete(p0Outboxes)..where((t) => t.kodeP0.equals(kodeP0))).go();
  }

  /// Sukses terkirim → baris dibuang dari antrean.
  Future<void> hapusTerkirim(String kodeP0) => batalkan(kodeP0);

  /// Gagal terkirim → tetap di antrean, dengan jejak percobaan & pesannya.
  Future<void> tandaiGagal(String kodeP0, int percobaan, String pesan) {
    return (update(p0Outboxes)..where((t) => t.kodeP0.equals(kodeP0))).write(
      P0OutboxesCompanion(
        status: const Value('gagal'),
        percobaan: Value(percobaan),
        pesanGagal: Value(pesan),
      ),
    );
  }
}
