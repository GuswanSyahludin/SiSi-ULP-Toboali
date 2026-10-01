import 'package:shared_preferences/shared_preferences.dart';

import '../../services/api_service.dart';
import '../../services/sync_error_message.dart';
import '../../services/sync_progress_service.dart';
import '../db_provider.dart';
import 'delta_sync_repository.dart';
import 'gardu_sync_repository.dart';
import 'inspeksi_gardu_repository.dart';
import 'laporan_repository.dart';
import 'local_master_materializer.dart';
import 'p0_repository.dart';
import 'teknik_to_repository.dart';

const _manualSyncModeKey = 'manualSyncMode';

class SyncRepository {
  static const modulMasterData = 'masterData',
      modulLaporanTeknik = 'laporanTeknik',
      modulVerifikasiP0 = 'verifikasiP0',
      modulSinkronSemua = 'sinkronSemua';
  static const moduleLabels = <String, String>{
    'dasar': 'Data Dasar',
    'row': 'ROW',
    'hartek': 'Hartek',
    'inspeksi': 'Inspeksi',
    'yandal': 'Yandal',
    'laporan': 'Laporan'
  };
  static const moduleDescriptions = <String, String>{
    'dasar':
        'User, tim, penyulang, section, dan data gardu untuk kebutuhan dasar aplikasi.',
    'row': 'Realisasi dan eksekusi pekerjaan ROW.',
    'hartek':
        'Penyulang-gardu, pekerjaan, material, dan daftar pekerjaan Hartek.',
    'inspeksi': 'Realisasi inspeksi jaringan/gardu serta master temuan.',
    'yandal': 'Shift, P0, switching, pengukuran gardu, dan petugas Yandal.',
    'laporan': 'Header laporan utama dan laporan harian teknik.',
  };
  static const moduleDatasets = <String, Set<String>>{
    'dasar': {
      'db_Users',
      'db_Tim',
      'db_Penyulang',
      'db_Section',
      'Master_Gardu'
    },
    'row': {'db_ROW_Realisasi', 'db_ROW_Eksekusi'},
    'hartek': {
      'db_Hartek_PenyulangGardu',
      'db_Hartek_Pekerjaan',
      'db_Hartek_Material',
      'db_Hartek_List_Pekerjaan',
      'db_Material'
    },
    'inspeksi': {
      'db_InsJar_Realisasi',
      'db_InsDu_Realisasi',
      'db_INS_Temuan',
      'db_List_Temuan'
    },
    'yandal': {
      'db_Yandal_Shift',
      'db_Yandal_P0',
      'db_Yandal_Pengecekan_Switching',
      'db_Yandal_Pengukuran_Gardu',
      'db_Yandal_List_P0',
      'db_List_Petugas_Yandal'
    },
    'laporan': {'db_Global_Header', 'Teknik_Laporan_Harian'},
  };
  static final Set<String> _kunci = {};
  DateTime? _masterLeaseExpiresAt;

  bool sedangProses(String modul) => _kunci.contains(modul);
  Future<String> perangkatId() =>
      DbProvider.instance.syncDao.ambilAtauBuatPerangkatId();

  Future<bool> _ambilLeaseMaster(String owner) async {
    _masterLeaseExpiresAt = null;
    final db = DbProvider.instance, now = DateTime.now().millisecondsSinceEpoch;
    await db.transaction(() async {
      await db.customStatement(
          'CREATE TABLE IF NOT EXISTS master_sync_lease_v1 (id INTEGER PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL)');
      await db.customStatement(
          'DELETE FROM master_sync_lease_v1 WHERE id=1 AND expires<=?', [now]);
      await db.customStatement(
          'INSERT OR IGNORE INTO master_sync_lease_v1(id,owner,expires) VALUES(1,?,?)',
          [owner, now + const Duration(hours: 1).inMilliseconds]);
    });
    final rows = await db
        .customSelect('SELECT owner, expires FROM master_sync_lease_v1 WHERE id=1')
        .get();
    final expires = rows.isEmpty ? null : rows.first.data['expires'];
    if (expires is int) {
      _masterLeaseExpiresAt = DateTime.fromMillisecondsSinceEpoch(expires, isUtc: true);
    }
    return rows.isNotEmpty && rows.first.data['owner'] == owner;
  }

  Future<void> _lepasLeaseMaster(String owner) =>
      DbProvider.instance.customStatement(
          'DELETE FROM master_sync_lease_v1 WHERE id=1 AND owner=?', [owner]);
  Future<String> _tokenAktif(String token) async {
    try {
      final r = await ApiService.cekPerangkat();
      final fresh = (r['token'] ?? '').toString().trim();
      if (r['success'] == true && fresh.isNotEmpty) return fresh;
    } catch (_) {}
    return token;
  }

  Future<void> _materialize(
      Set<String> changed, bool initial, DeltaSyncRepository delta) async {
    final m = LocalMasterMaterializer();
    if (initial || changed.contains('db_Penyulang')) {
      await m.penyulang(await delta.rows('db_Penyulang'));
    }
    if (initial || changed.contains('Master_Gardu')) {
      await m.gardu(await delta.rows('Master_Gardu'));
    }
    if (initial || changed.contains('db_List_Temuan')) {
      await m.listTemuan(await delta.rows('db_List_Temuan'));
    }
  }

  Future<bool> _isInManualSyncMode() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      // Check if any manual sync mode key exists; if it does, we're in manual mode
      final keys = prefs.getKeys();
      return keys.any((k) => k.endsWith(_manualSyncModeKey));
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> sinkronModul(
    String token,
    String module, {
    bool finalizeProgress = true,
  }) async {
    final datasets = moduleDatasets[module];
    if (datasets == null) {
      return {'ok': false, 'message': 'Modul Data Master tidak dikenal.'};
    }
    final key = 'module:$module';
    if (_kunci.contains(key)) {
      return {'ok': false, 'message': 'Modul sedang diunduh.'};
    }
    _kunci.add(key);
    final progress = SyncProgressService.instance,
        lease = DateTime.now().microsecondsSinceEpoch.toString();
    final progressScope = progress.accountScope;
    var phase = 'master_lease';
    var diagnostic = SyncProgressState(module: module);
    await progress.begin(
        stage: 'Menyiapkan ${moduleLabels[module]}', module: module, total: 1);
    try {
      if (!await _ambilLeaseMaster(lease)) {
        const message = 'Sinkron data sedang berjalan di proses lain.';
        await progress.failure(message, code: 'MASTER_LEASE_BUSY',
            phase: phase, leaseExpiresAt: _masterLeaseExpiresAt,
            context: diagnostic, expectedScope: progressScope);
        return {'ok': false, 'message': message};
      }
      phase = 'refresh_session';
      final active = await _tokenAktif(token), delta = DeltaSyncRepository();
      phase = 'read_local_state';
      final initial = !await delta.sudahPernah();
      phase = 'download_snapshot';
      final result = await delta.sync(active,
          datasetNames: datasets,
          onProgress: (t) {
            progress.update(
              'Mengunduh ${moduleLabels[module]}',
              module: module,
              dataset: t.dataset,
              completed: 0,
              total: 1,
              transferredRows: t.overallTransferred,
              totalRows: t.overallTotal,
              datasetTransferredRows: t.datasetTransferred,
              datasetTotalRows: t.datasetTotal);
            diagnostic = progress.state.value;
          });
      phase = 'materialize';
      await _materialize(result.changed.toSet(), initial, delta);
      phase = 'save_sync_status';
      await DbProvider.instance.syncDao.tandaiTersinkron('master:$module',
          jumlah: result.changed.length, keterangan: result.message);
      // Check if in manual sync mode; if not, finalize based on parameter
      final inManualMode = await _isInManualSyncMode();
      if (finalizeProgress && !inManualMode) {
        await progress.success('${moduleLabels[module]} selesai diperbarui.');
      }
      return {
        'ok': true,
        'message': '${moduleLabels[module]} selesai diperbarui.'
      };
    } catch (e, stack) {
      final message = friendlySyncMessage(e);
      await progress.failure(message, error: e, stackTrace: stack,
          phase: phase, context: diagnostic, expectedScope: progressScope);
      return {'ok': false, 'message': message};
    } finally {
      await _lepasLeaseMaster(lease);
      _kunci.remove(key);
    }
  }

  Future<Map<String, dynamic>> sinkronSemua(String token) async {
    const key = modulSinkronSemua;
    if (_kunci.contains(key)) {
      return {'ok': false, 'message': 'Sinkron data sedang berjalan.'};
    }
    _kunci.add(key);
    final progress = SyncProgressService.instance,
        lease = DateTime.now().microsecondsSinceEpoch.toString();
    final progressScope = progress.accountScope;
    var phase = 'master_lease';
    var diagnostic = const SyncProgressState(module: 'semua');
    await progress.begin(
        stage: 'Menyiapkan semua Data Master', module: 'semua', total: 1);
    try {
      if (!await _ambilLeaseMaster(lease)) {
        const message = 'Sinkron data sedang berjalan di proses lain.';
        await progress.failure(message, code: 'MASTER_LEASE_BUSY',
            phase: phase, leaseExpiresAt: _masterLeaseExpiresAt,
            context: diagnostic, expectedScope: progressScope);
        return {'ok': false, 'message': message};
      }
      phase = 'refresh_session';
      final active = await _tokenAktif(token), delta = DeltaSyncRepository();
      phase = 'read_local_state';
      final initial = !await delta.sudahPernah();
      phase = 'send_outbox';
      final p0 = await P0Repository().kirimAntrean(),
          gardu = await GarduSyncRepository().kirim(active),
          inspeksi = await InspeksiGarduRepository().syncSemua(active);
      try {
        await TeknikToRepository().flushOutbox(active);
      } catch (_) {}
      phase = 'download_snapshot';
      final result = await delta.sync(active,
          onProgress: (t) {
            progress.update('Mengunduh semua Data Master',
              module: 'semua',
              dataset: t.dataset,
              completed: 0,
              total: 1,
              transferredRows: t.overallTransferred,
              totalRows: t.overallTotal,
              datasetTransferredRows: t.datasetTransferred,
              datasetTotalRows: t.datasetTotal);
            diagnostic = progress.state.value;
          });
      phase = 'materialize';
      await _materialize(result.changed.toSet(), initial, delta);
      final ok =
          p0['ok'] == true && gardu['ok'] == true && inspeksi['ok'] == true;
      if (ok) {
        await progress.success(result.message);
      } else {
        await progress.failure(result.message, code: 'OUTBOX_FAILED',
            phase: 'send_outbox', context: diagnostic, expectedScope: progressScope);
      }
      return {'ok': ok, 'message': result.message};
    } catch (e, stack) {
      final message = friendlySyncMessage(e);
      await progress.failure(message, error: e, stackTrace: stack,
          phase: phase, context: diagnostic, expectedScope: progressScope);
      return {'ok': false, 'message': message};
    } finally {
      await _lepasLeaseMaster(lease);
      _kunci.remove(key);
    }
  }

  Future<Map<String, dynamic>> downloadMasterData(String token,
          {bool reportProgress = true}) =>
      sinkronSemua(token);
  Future<Map<String, dynamic>> sinkronLaporanTeknik(String tanggal) async {
    final r = await LaporanRepository().bacaUp3Uiw(tanggal);
    return r['ok'] == true ? {'ok': true} : r;
  }

  Future<Map<String, dynamic>> sinkronVerifikasiP0() =>
      P0Repository().kirimAntrean();
}
