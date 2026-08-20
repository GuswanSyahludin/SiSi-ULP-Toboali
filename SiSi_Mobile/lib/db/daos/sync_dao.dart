// lib/db/daos/sync_dao.dart
// ─────────────────────────────────────────────────────────────
// DAO untuk tabel sync_info — status sinkron per modul +
// kode server lokal (perangkatId).
// ─────────────────────────────────────────────────────────────

import 'dart:math' as math;

import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/sync_info.dart';

part 'sync_dao.g.dart'; // hasil generate build_runner

@DriftAccessor(tables: [SyncInfos])
class SyncDao extends DatabaseAccessor<AppDatabase> with _$SyncDaoMixin {
  SyncDao(super.db);

  /// Baca status 1 modul (null bila belum pernah dicatat).
  Future<SyncInfo?> baca(String key) {
    return (select(syncInfos)..where((t) => t.key.equals(key)))
        .getSingleOrNull();
  }

  /// Pantau semua status secara REAKTIF — UI auto-update tiap sync selesai.
  Stream<List<SyncInfo>> pantauSemua() => select(syncInfos).watch();

  /// Tandai modul baru saja tersinkron (dipanggil repository setelah sukses).
  Future<void> tandaiTersinkron(String key,
      {int jumlah = 0, String keterangan = ''}) {
    return into(syncInfos).insertOnConflictUpdate(
      SyncInfosCompanion(
        key: Value(key),
        lastSyncAt: Value(DateTime.now().toIso8601String()),
        jumlahData: Value(jumlah),
        keterangan: Value(keterangan),
      ),
    );
  }

  /// Kode server lokal (ID unik instalasi HP ini) — dibuat SEKALI lalu
  /// dipakai terus; dikirim saat sinkron agar server mengenali pengirim.
  Future<String> ambilAtauBuatPerangkatId() async {
    const kunci = 'perangkatId';
    final ada = await baca(kunci);
    if (ada != null && ada.keterangan.isNotEmpty) return ada.keterangan;
    final ms = DateTime.now().millisecondsSinceEpoch;
    final acak = math.Random().nextInt(0x7fffffff);
    final id =
        'LOC-${ms.toRadixString(36)}-${acak.toRadixString(36)}'.toUpperCase();
    await into(syncInfos).insertOnConflictUpdate(
      SyncInfosCompanion(key: const Value(kunci), keterangan: Value(id)),
    );
    return id;
  }
}
