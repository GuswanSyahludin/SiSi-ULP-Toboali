import 'dart:async';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:workmanager/workmanager.dart';

import '../db/db_provider.dart';
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
const _accountKey = 'accountKey';

String _key(String base, Map<String, dynamic> session) =>
    DbProvider.scopedKey(base, session);

String _account(Map<String, dynamic> session) =>
    DbProvider.databaseNameForSession(session);

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, data) async {
    final manual = task == _manualTaskName;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.reload();
      final sesi = await SesiStore.muat();
      if (sesi == null) return true;
      if (data?[_accountKey]?.toString() != _account(sesi)) return true;
      final enabledKey = _key(_enabledKey, sesi);
      if (!manual && prefs.getBool(enabledKey) != true) return true;
      await SyncProgressService.instance.restore();
      final token = (sesi['token'] ?? '').toString();
      if (token.isEmpty) return true;
      if (!manual) {
        return (await SyncRepository().sinkronSemua(token))['ok'] == true;
      }

      final moduleKey = _key(_manualModuleKey, sesi);
      final modulesKey = _key(_manualModulesKey, sesi);
      final pendingKey = _key(_manualPendingKey, sesi);
      final fallback =
          (data?['module'] ?? prefs.getString(moduleKey))?.toString();
      var modules = _queuedModules(prefs, modulesKey, fallback: fallback);
      while (modules.isNotEmpty) {
        final module = modules.first;
        if ((await SyncRepository().sinkronModul(token, module))['ok'] != true) {
          return false;
        }
        await prefs.reload();
        modules = _queuedModules(prefs, modulesKey, fallback: fallback)
            .where((item) => item != module)
            .toList();
        await _saveQueuedModules(
          prefs,
          pendingKey,
          moduleKey,
          modulesKey,
          modules,
        );
      }
      await prefs.setBool(enabledKey, true);
      return true;
    } catch (_) {
      return false;
    }
  });
}

List<String> _queuedModules(
  SharedPreferences prefs,
  String modulesKey, {
  String? fallback,
}) {
  final stored = prefs.getStringList(modulesKey) ?? const <String>[];
  return <String>[...stored, if (stored.isEmpty && fallback != null) fallback]
      .where(SyncRepository.moduleDatasets.containsKey)
      .toSet()
      .toList();
}

Future<void> _saveQueuedModules(
  SharedPreferences prefs,
  String pendingKey,
  String moduleKey,
  String modulesKey,
  List<String> modules,
) async {
  if (modules.isEmpty) {
    await prefs.remove(pendingKey);
    await prefs.remove(moduleKey);
    await prefs.remove(modulesKey);
    return;
  }
  await prefs.setBool(pendingKey, true);
  await prefs.setStringList(modulesKey, modules);
  await prefs.setString(moduleKey, modules.first);
}

class AutoSyncService {
  AutoSyncService._();
  static bool _running = false;

  static Future<void> initialize() async {
    await SyncProgressService.instance.restore();
    await Workmanager().initialize(callbackDispatcher);
    final sesi = await SesiStore.muat();
    if (sesi == null) return;
    final prefs = await SharedPreferences.getInstance();
    final pendingKey = _key(_manualPendingKey, sesi);
    final moduleKey = _key(_manualModuleKey, sesi);
    final modulesKey = _key(_manualModulesKey, sesi);
    final modules = _queuedModules(
      prefs,
      modulesKey,
      fallback: prefs.getString(moduleKey),
    );
    if (prefs.getBool(pendingKey) == true && modules.isNotEmpty) {
      await _saveQueuedModules(
        prefs,
        pendingKey,
        moduleKey,
        modulesKey,
        modules,
      );
      await _registerManual(modules.first, sesi);
    }
    if (await enabled(sesi)) await _registerPeriodic(sesi);
  }

  static Future<bool> enabled(Map<String, dynamic> session) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_key(_enabledKey, session)) == true;
  }

  static Future<Map<String, dynamic>> startModuleSync(String module) =>
      startModulesSync([module]);

  static Future<Map<String, dynamic>> startModulesSync(
      Iterable<String> requestedModules) async {
    final sesi = await SesiStore.muat();
    if (sesi == null || (sesi['token'] ?? '').toString().isEmpty) {
      return {'ok': false, 'message': 'Sesi tidak aktif.'};
    }
    final requested = requestedModules
        .where(SyncRepository.moduleDatasets.containsKey)
        .toSet()
        .toList();
    if (requested.isEmpty) {
      return {'ok': false, 'message': 'Pilih minimal satu Data Master.'};
    }
    final prefs = await SharedPreferences.getInstance();
    final pendingKey = _key(_manualPendingKey, sesi);
    final moduleKey = _key(_manualModuleKey, sesi);
    final modulesKey = _key(_manualModulesKey, sesi);
    final queued = _queuedModules(
      prefs,
      modulesKey,
      fallback: prefs.getString(moduleKey),
    );
    final modules = <String>{...queued, ...requested}.toList();
    await _saveQueuedModules(
      prefs,
      pendingKey,
      moduleKey,
      modulesKey,
      modules,
    );
    await SyncProgressService.instance.begin(
        stage: '${modules.length} kelompok Data Master menunggu download',
        module: modules.first,
        total: modules.length);
    await _registerManual(modules.first, sesi);
    return {
      'ok': true,
      'message':
          '${requested.length} kelompok Data Master masuk antrean download.'
    };
  }

  static Future<void> _registerManual(
    String module,
    Map<String, dynamic> session,
  ) {
    final inputData = {'module': module};
    inputData[_accountKey] = _account(session);
    return Workmanager().registerOneOffTask(
      _manualUniqueName,
      _manualTaskName,
      inputData: inputData,
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
  }

  static Future<void> activate() async {
    final sesi = await SesiStore.muat();
    if (sesi == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key(_enabledKey, sesi), true);
    await _registerPeriodic(sesi);
  }

  static Future<void> deactivate() async {
    final sesi = await SesiStore.muat();
    if (sesi != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_key(_enabledKey, sesi), false);
      await _saveQueuedModules(
        prefs,
        _key(_manualPendingKey, sesi),
        _key(_manualModuleKey, sesi),
        _key(_manualModulesKey, sesi),
        const [],
      );
    }
    await cancelAllWorkers();
  }

  static Future<void> cancelAllWorkers() async {
    await Workmanager().cancelByUniqueName(_periodicUniqueName);
    await Workmanager().cancelByUniqueName(_manualUniqueName);
  }

  static Future<void> _registerPeriodic(Map<String, dynamic> session) =>
      Workmanager().registerPeriodicTask(
        _periodicUniqueName,
        _periodicTaskName,
        inputData: {_accountKey: _account(session)},
        frequency: const Duration(minutes: 15),
        existingWorkPolicy: ExistingPeriodicWorkPolicy.update,
        constraints: Constraints(networkType: NetworkType.connected),
      );

  static Future<void> syncNow(Map<String, dynamic> sesi) async {
    if (_running || !await enabled(sesi)) return;
    _running = true;
    try {
      await SyncRepository().sinkronSemua('${sesi['token'] ?? ''}');
    } finally {
      _running = false;
    }
  }
}
