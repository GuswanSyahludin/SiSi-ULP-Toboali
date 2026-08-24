import 'dart:async';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:workmanager/workmanager.dart';

import '../db/repositories/sync_repository.dart';
import 'sesi_store.dart';

const _taskName = 'sisi.sync.periodik';
const _uniqueName = 'sisi-background-sync';
const _enabledKey = 'autoSyncEnabled';

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((_, __) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.reload();
      if (prefs.getBool(_enabledKey) != true) return true;
      final sesi = await SesiStore.muat();
      final token = (sesi?['token'] ?? '').toString();
      if (token.isEmpty) return true;
      final result = await SyncRepository().sinkronSemua(token);
      return result['ok'] == true;
    } catch (_) {
      // false meminta WorkManager menjadwalkan retry sesuai backoff.
      return false;
    }
  });
}

class AutoSyncService {
  AutoSyncService._();
  static bool _running = false;

  static Future<void> initialize() async {
    await Workmanager().initialize(callbackDispatcher);
    if (await enabled()) await _register();
  }

  static Future<bool> enabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_enabledKey) == true;
  }

  /// Dipanggil hanya setelah sinkron manual pertama berhasil.
  static Future<void> activate() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledKey, true);
    await _register();
  }

  static Future<void> _register() {
    return Workmanager().registerPeriodicTask(
      _uniqueName,
      _taskName,
      frequency: const Duration(minutes: 15),
      existingWorkPolicy: ExistingPeriodicWorkPolicy.update,
      constraints: Constraints(networkType: NetworkType.connected),
      backoffPolicy: BackoffPolicy.exponential,
      backoffPolicyDelay: const Duration(minutes: 10),
    );
  }

  /// Sinkron cepat saat aplikasi dibuka/kembali aktif. No-op sebelum sinkron pertama.
  static Future<void> syncNow(Map<String, dynamic> sesi) async {
    if (_running || !await enabled()) return;
    final token = (sesi['token'] ?? '').toString();
    if (token.isEmpty) return;
    _running = true;
    try {
      await SyncRepository().sinkronSemua(token);
    } finally {
      _running = false;
    }
  }

  static Future<void> deactivate() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_enabledKey);
    await Workmanager().cancelByUniqueName(_uniqueName);
  }
}
