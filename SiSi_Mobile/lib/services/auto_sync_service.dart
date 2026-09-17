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
const _manualModuleKey = 'manualSyncModule';
const _manualModulesKey = 'manualSyncModules';

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, data) async {
    final manual = task == _manualTaskName;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.reload();
      if (!manual && prefs.getBool(_enabledKey) != true) {
        return true;
      }
      await SyncProgressService.instance.restore();
      final sesi = await SesiStore.muat();
      final token = (sesi?['token'] ?? '').toString();
      if (token.isEmpty) return true;
      if (!manual)
        return (await SyncRepository().sinkronSemua(token))['ok'] == true;

      final fallback =
          (data?['module'] ?? prefs.getString(_manualModuleKey))?.toString();
      var modules = _queuedModules(prefs, fallback: fallback);
      while (modules.isNotEmpty) {
        final module = modules.first;
        if ((await SyncRepository().sinkronModul(token, module))['ok'] !=
            true) {
          return false;
        }
        await prefs.reload();
        modules = _queuedModules(prefs, fallback: fallback)
            .where((item) => item != module)
            .toList();
        await _saveQueuedModules(prefs, modules);
      }
      await prefs.setBool(_enabledKey, true);
      return true;
    } catch (_) {
      return false;
    }
  });
}

List<String> _queuedModules(SharedPreferences prefs, {String? fallback}) {
  final stored = prefs.getStringList(_manualModulesKey) ?? const <String>[];
  return <String>[...stored, if (stored.isEmpty && fallback != null) fallback]
      .where(SyncRepository.moduleDatasets.containsKey)
      .toSet()
      .toList();
}

Future<void> _saveQueuedModules(
    SharedPreferences prefs, List<String> modules) async {
  if (modules.isEmpty) {
    await prefs.remove(_manualPendingKey);
    await prefs.remove(_manualModuleKey);
    await prefs.remove(_manualModulesKey);
    return;
  }
  await prefs.setBool(_manualPendingKey, true);
  await prefs.setStringList(_manualModulesKey, modules);
  await prefs.setString(_manualModuleKey, modules.first);
}

class AutoSyncService {
  AutoSyncService._();
  static bool _running = false;

  static Future<void> initialize() async {
    await SyncProgressService.instance.restore();
    await Workmanager().initialize(callbackDispatcher);
    final prefs = await SharedPreferences.getInstance();
    final modules =
        _queuedModules(prefs, fallback: prefs.getString(_manualModuleKey));
    if (prefs.getBool(_manualPendingKey) == true && modules.isNotEmpty) {
      await _saveQueuedModules(prefs, modules);
      await _registerManual(modules.first);
    }
    if (await enabled()) await _registerPeriodic();
  }

  static Future<bool> enabled() async =>
      (await SharedPreferences.getInstance()).getBool(_enabledKey) == true;

  static Future<Map<String, dynamic>> startModuleSync(String module) =>
      startModulesSync([module]);

  static Future<Map<String, dynamic>> startModulesSync(
      Iterable<String> requestedModules) async {
    final requested = requestedModules
        .where(SyncRepository.moduleDatasets.containsKey)
        .toSet()
        .toList();
    if (requested.isEmpty) {
      return {'ok': false, 'message': 'Pilih minimal satu Data Master.'};
    }
    final prefs = await SharedPreferences.getInstance();
    final queued =
        _queuedModules(prefs, fallback: prefs.getString(_manualModuleKey));
    final modules = <String>{...queued, ...requested}.toList();
    await _saveQueuedModules(prefs, modules);
    SyncProgressService.instance.begin(
        stage: '${modules.length} kelompok Data Master menunggu download',
        module: modules.first,
        total: modules.length);
    await _registerManual(modules.first);
    return {
      'ok': true,
      'message':
          '${requested.length} kelompok Data Master masuk antrean download.'
    };
  }

  static Future<void> _registerManual(String module) =>
      Workmanager().registerOneOffTask(
        _manualUniqueName,
        _manualTaskName,
        inputData: {'module': module},
        // Antrean sudah disimpan sebelum worker didaftarkan. Jangan batalkan
        // worker aktif saat pengguna menambahkan pilihan lain.
        existingWorkPolicy: ExistingWorkPolicy.keep,
        constraints: Constraints(networkType: NetworkType.connected),
        backoffPolicy: BackoffPolicy.exponential,
        backoffPolicyDelay: const Duration(minutes: 1),
        foregroundServiceConfig: ForegroundServiceConfig(
          notificationTitle: 'SiSi sedang mengunduh data',
          notificationText:
              'Download Data Master tetap berjalan di latar belakang.',
          notificationChannelId: 'sisi_master_data_sync',
          notificationChannelName: 'Download Data Master',
        ),
      );

  static Future<void> activate() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledKey, true);
    await _registerPeriodic();
  }

  static Future<void> deactivate() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledKey, false);
    await Workmanager().cancelByUniqueName(_periodicUniqueName);
    await Workmanager().cancelByUniqueName(_manualUniqueName);
    await _saveQueuedModules(prefs, const []);
  }

  static Future<void> _registerPeriodic() => Workmanager().registerPeriodicTask(
        _periodicUniqueName,
        _periodicTaskName,
        frequency: const Duration(minutes: 15),
        existingWorkPolicy: ExistingPeriodicWorkPolicy.update,
        constraints: Constraints(networkType: NetworkType.connected),
      );

  static Future<void> syncNow(Map<String, dynamic> sesi) async {
    if (_running || !await enabled()) return;
    _running = true;
    try {
      await SyncRepository().sinkronSemua('${sesi['token'] ?? ''}');
    } finally {
      _running = false;
    }
  }
}
