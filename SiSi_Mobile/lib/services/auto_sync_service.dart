import 'dart:async';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:workmanager/workmanager.dart';

import '../db/repositories/sync_repository.dart';
import 'sesi_store.dart';
import 'sync_progress_service.dart';

const _periodicTaskName = 'sisi.sync.periodik';
const _periodicUniqueName = 'sisi-background-sync';
const _manualTaskName = 'sisi.sync.manual.resume';
const _manualUniqueName = 'sisi-manual-master-sync';
const _enabledKey = 'autoSyncEnabled';
const _manualPendingKey = 'manualSyncPending';

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, _) async {
    final manual = task == _manualTaskName;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.reload();
      if (!manual && prefs.getBool(_enabledKey) != true) return true;
      await SyncProgressService.instance.restore();
      final sesi = await SesiStore.muat();
      final token = (sesi?['token'] ?? '').toString();
      if (token.isEmpty) {
        if (manual) await prefs.setBool(_manualPendingKey, false);
        return true;
      }
      final result = await SyncRepository().sinkronSemua(token);
      final ok = result['ok'] == true;
      if (manual && ok) {
        await prefs.setBool(_manualPendingKey, false);
        await prefs.setBool(_enabledKey, true);
      }
      return ok;
    } catch (_) {
      return false;
    }
  });
}

class AutoSyncService {
  AutoSyncService._();
  static bool _running = false;

  static Future<void> initialize() async {
    await SyncProgressService.instance.restore();
    await Workmanager().initialize(callbackDispatcher);
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_manualPendingKey) == true) {
      await _registerManual();
    }
    if (await enabled()) await _registerPeriodic();
  }

  static Future<bool> enabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_enabledKey) == true;
  }

  static Future<Map<String, dynamic>> startManualSync() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_manualPendingKey, true);
    SyncProgressService.instance.begin(stage: 'Menunggu worker latar belakang');
    await _registerManual();
    return {
      'ok': true,
      'message': 'Download dijadwalkan dan akan dilanjutkan otomatis.',
    };
  }

  static Future<void> _registerManual() {
    return Workmanager().registerOneOffTask(
      _manualUniqueName,
      _manualTaskName,
      existingWorkPolicy: ExistingWorkPolicy.replace,
      constraints: Constraints(networkType: NetworkType.connected),
      backoffPolicy: BackoffPolicy.exponential,
      backoffPolicyDelay: const Duration(minutes: 1),
    );
  }

  static Future<void> activate() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledKey, true);
    await _registerPeriodic();
  }

  static Future<void> _registerPeriodic() {
    return Workmanager().registerPeriodicTask(
      _periodicUniqueName,
      _periodicTaskName,
      frequency: const Duration(minutes: 15),
      existingWorkPolicy: ExistingPeriodicWorkPolicy.update,
      constraints: Constraints(networkType: NetworkType.connected),
      backoffPolicy: BackoffPolicy.exponential,
      backoffPolicyDelay: const Duration(minutes: 10),
    );
  }

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
    await prefs.remove(_manualPendingKey);
    await Workmanager().cancelByUniqueName(_periodicUniqueName);
    await Workmanager().cancelByUniqueName(_manualUniqueName);
  }
}
