import 'dart:async';
import 'dart:convert';

import 'package:drift/drift.dart';

import '../../services/api_service.dart';
import '../../services/apps_script_http.dart' as http;
import '../db_provider.dart';

class DeltaSyncResult {
  final bool ok, initial;
  final List<String> changed;
  final String message;
  const DeltaSyncResult({
    required this.ok,
    required this.initial,
    required this.changed,
    required this.message,
  });
}

class DeltaTransferProgress {
  final String dataset;
  final int datasetTransferred, datasetTotal, overallTransferred, overallTotal;
  const DeltaTransferProgress({
    required this.dataset,
    required this.datasetTransferred,
    required this.datasetTotal,
    required this.overallTransferred,
    required this.overallTotal,
  });
}

typedef DeltaSyncProgress = void Function(DeltaTransferProgress progress);
typedef RowProgress = void Function(int rows);

class _SnapshotExpired implements Exception {
  final String message;
  const _SnapshotExpired(this.message);
  @override
  String toString() => message;
}

class DeltaSyncRepository {
  final db = DbProvider.instance;

  // Keep this list in the same order as the backend registry. A null request is
  // split locally so a single Drive snapshot never contains every dataset.
  static const _allDatasetNames = <String>[
    'db_Global_Header',
    'db_ROW_Realisasi',
    'db_ROW_Eksekusi',
    'db_Hartek_PenyulangGardu',
    'db_Hartek_Pekerjaan',
    'db_Hartek_Material',
    'db_InsJar_Realisasi',
    'db_InsDu_Realisasi',
    'db_INS_Temuan',
    'db_Yandal_Shift',
    'db_Yandal_P0',
    'db_Yandal_Pengecekan_Switching',
    'db_Yandal_Pengukuran_Gardu',
    'Teknik_Laporan_Harian',
    'db_Users',
    'db_Tim',
    'db_Penyulang',
    'db_List_Temuan',
    'db_Hartek_List_Pekerjaan',
    'db_Material',
    'db_Yandal_List_P0',
    'db_List_Petugas_Yandal',
    'db_Section',
    'Master_Gardu',
  ];
  static const _snapshotBatchSize = 4;

  Future<Map<String, dynamic>> _send(
    String token,
    Map<String, dynamic> payload,
  ) async {
    final uri = Uri.parse('${ApiService.baseUrl}?mobile=1');
    final timeoutSeconds = payload['cmd'] == 'snapshotCreate' ? 330 : 90;
    http.Response? response;
    Object? lastError;
    for (var attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await http
            .post(
              uri,
              headers: const {'Content-Type': 'application/json'},
              body: jsonEncode({
                'action': 'getMasterGarduMobile',
                'token': token,
                'ulp': 'DELTA_SYNC:${jsonEncode(payload)}',
              }),
            )
            .timeout(Duration(seconds: timeoutSeconds));
        if (response.body.trim().isNotEmpty) break;
        lastError = 'respons kosong (HTTP ${response.statusCode})';
      } catch (error) {
        lastError = error;
      }
      if (attempt == 1) await Future<void>.delayed(const Duration(seconds: 1));
    }
    final body = response?.body.trim() ?? '';
    if (body.isEmpty) {
      throw Exception(
          'Server tidak mengirim respons setelah 2 percobaan: $lastError');
    }
    dynamic decoded;
    try {
      decoded = jsonDecode(body);
    } on FormatException {
      throw Exception('Respons server untuk sinkronisasi tidak valid.');
    }
    if (decoded is! Map) throw Exception('Respons sinkronisasi tidak valid.');
    final out = Map<String, dynamic>.from(decoded);
    if (out['success'] != true) {
      final code = '${out['code'] ?? ''}';
      if (code == 'SNAPSHOT_EXPIRED' || code == 'SNAPSHOT_INVALID') {
        throw _SnapshotExpired('${out['message'] ?? 'Snapshot kedaluwarsa.'}');
      }
      throw Exception(out['message'] ?? 'Sinkronisasi gagal.');
    }
    return out;
  }

  Future<Map<String, String>> _versions() async {
    final rows = await db
        .customSelect(
          'SELECT dataset, version FROM local_dataset_state',
        )
        .get();
    return {
      for (final row in rows)
        row.data['dataset'].toString(): row.data['version'].toString(),
    };
  }

  Future<bool> sudahPernah() async => (await _versions()).isNotEmpty;

  Future<DeltaSyncResult> sync(
    String token, {
    bool force = false,
    Set<String>? datasetNames,
    DeltaSyncProgress? onProgress,
  }) async {
    try {
      return await _syncSnapshot(
        token,
        force: force,
        datasetNames: datasetNames,
        onProgress: onProgress,
      );
    } on _SnapshotExpired {
      await _clearExpiredSnapshots();
      return _syncSnapshot(
        token,
        force: force,
        datasetNames: datasetNames,
        onProgress: onProgress,
        allowResume: false,
      );
    }
  }

  List<Set<String>> _snapshotBatches(Set<String>? datasetNames) {
    if (datasetNames != null) {
      // Preserve the public API: an explicit selection remains one request.
      return datasetNames.isEmpty ? const <Set<String>>[] : [datasetNames];
    }
    final batches = <Set<String>>[];
    for (var start = 0; start < _allDatasetNames.length; start += _snapshotBatchSize) {
      final end = (start + _snapshotBatchSize > _allDatasetNames.length)
          ? _allDatasetNames.length
          : start + _snapshotBatchSize;
      batches.add(_allDatasetNames.sublist(start, end).toSet());
    }
    return batches;
  }

  Future<DeltaSyncResult> _syncSnapshot(
    String token, {
    required bool force,
    Set<String>? datasetNames,
    DeltaSyncProgress? onProgress,
    bool allowResume = true,
  }) async {
    final local = await _versions();
    final batches = _snapshotBatches(datasetNames);
    final changed = <String>[];
    final warnings = <dynamic>[];
    var finishedRows = 0;
    var overallTotal = 0;

    for (final batchNames in batches) {
      // Each batch gets its own immutable snapshot and is released as soon as
      // its datasets are committed. Existing checkpoints can reopen that same
      // snapshot through _openSnapshot when a previous run was interrupted.
      final manifest = await _openSnapshot(
        token,
        batchNames,
        allowResume: allowResume,
      );
      final batch = manifest['batch'];
      if (batch is Map) {
        final requestedCount = batch['requestedCount'];
        final completedCount = batch['completedCount'];
        if (requestedCount is num &&
            completedCount is num &&
            completedCount < requestedCount) {
          final warningsCount = manifest['warnings'] is List
              ? (manifest['warnings'] as List).length
              : 0;
          throw Exception(
            'Snapshot batch parsial: $completedCount/$requestedCount selesai; '
            '$warningsCount warning.',
          );
        }
      }
      final snapshotId = manifest['snapshotId'].toString();
      final datasets = List.from(manifest['datasets'] ?? const [])
          .map((raw) => Map<String, dynamic>.from(raw as Map))
          .where((item) {
        final name = item['name'].toString();
        return batchNames.contains(name) &&
            (datasetNames == null || datasetNames.contains(name)) &&
            (force || local[name] != item['version'].toString());
      }).toList();
      final batchTotal = datasets.fold<int>(
        0,
        (sum, item) =>
            sum + (num.tryParse('${item['count']}')?.toInt() ?? 0),
      );
      // The denominator grows as later batch manifests arrive; transferred
      // rows stay aggregate and never reset at a batch boundary.
      overallTotal += batchTotal;
      warnings.addAll(List.from(manifest['warnings'] ?? const []));

      for (final item in datasets) {
        final name = item['name'].toString();
        final version = item['version'].toString();
        final kind = item['kind'].toString();
        final datasetTotal = num.tryParse('${item['count']}')?.toInt() ?? 0;
        final offset = await _resumeOffset(
          name,
          version,
          datasetTotal,
          kind,
          snapshotId,
        );
        onProgress?.call(
          DeltaTransferProgress(
            dataset: name,
            datasetTransferred: offset,
            datasetTotal: datasetTotal,
            overallTransferred: finishedRows + offset,
            overallTotal: overallTotal,
          ),
        );
        final downloaded = await _download(
          token,
          snapshotId,
          name,
          version,
          kind,
          datasetTotal,
          offset,
          onRows: (rows) => onProgress?.call(
            DeltaTransferProgress(
              dataset: name,
              datasetTransferred: rows,
              datasetTotal: datasetTotal,
              overallTransferred: finishedRows + rows,
              overallTotal: overallTotal,
            ),
          ),
        );
        finishedRows += downloaded;
        changed.add(name);
      }
      // Do not release on an interrupted/failed download: the checkpoint can
      // reopen this immutable snapshot and continue before its TTL expires.
      await _releaseSnapshot(token, snapshotId);
    }

    final warningText =
        warnings.isEmpty ? '' : ' · ${warnings.length} sumber dilewati';
    return DeltaSyncResult(
      ok: true,
      initial: local.isEmpty,
      changed: changed,
      message: changed.isEmpty
          ? 'Tidak ada perubahan server$warningText.'
          : '${changed.length} data master diperbarui$warningText.',
    );
  }

  Future<Map<String, dynamic>> _openSnapshot(
    String token,
    Set<String>? datasetNames, {
    required bool allowResume,
  }) async {
    if (allowResume) {
      final ids = await db
          .customSelect(
            "SELECT snapshot_id FROM sync_download_checkpoint "
            "WHERE snapshot_id IS NOT NULL AND snapshot_id <> '' "
            'ORDER BY updated_at DESC',
          )
          .get();
      for (final row in ids) {
        final id = row.data['snapshot_id']?.toString() ?? '';
        if (id.isEmpty) continue;
        try {
          final manifest = await _send(token, {
            'cmd': 'snapshotManifest',
            'snapshotId': id,
          });
          final names = List.from(manifest['datasets'] ?? const [])
              .map((item) => (item as Map)['name'].toString())
              .toSet();
          final coversRequest = datasetNames == null
              ? names.length >= _allDatasetNames.length
              : names.containsAll(datasetNames);
          if (coversRequest) return manifest;
        } on _SnapshotExpired {
          await _clearSnapshot(id);
        }
      }
    }
    return _send(token, {
      'cmd': 'snapshotCreate',
      if (datasetNames != null) 'datasets': datasetNames.toList(),
    });
  }

  Future<void> _releaseSnapshot(String token, String snapshotId) async {
    try {
      await _send(token, {
        'cmd': 'snapshotRelease',
        'snapshotId': snapshotId,
      });
    } catch (_) {
      // Cleanup backend juga menghapus snapshot yatim setelah 24 jam.
    }
  }

  Future<void> _clearExpiredSnapshots() async {
    final rows = await db
        .customSelect(
          "SELECT snapshot_id FROM sync_download_checkpoint "
          "WHERE snapshot_id IS NOT NULL AND snapshot_id <> ''",
        )
        .get();
    for (final row in rows) {
      await _clearSnapshot(row.data['snapshot_id'].toString());
    }
  }

  Future<void> _clearSnapshot(String snapshotId) async {
    await db.transaction(() async {
      await db.customStatement(
        'DELETE FROM sync_download_staging WHERE dataset IN '
        '(SELECT dataset FROM sync_download_checkpoint WHERE snapshot_id=?)',
        [snapshotId],
      );
      await db.customStatement(
        'DELETE FROM sync_download_checkpoint WHERE snapshot_id=?',
        [snapshotId],
      );
    });
  }

  Future<int> _resumeOffset(
    String name,
    String version,
    int total,
    String kind,
    String snapshotId,
  ) async {
    final rows = await db.customSelect(
      'SELECT version, snapshot_id, downloaded_rows '
      'FROM sync_download_checkpoint WHERE dataset=?',
      variables: [Variable.withString(name)],
    ).get();
    if (rows.isNotEmpty &&
        rows.first.data['version'] == version &&
        rows.first.data['snapshot_id'] == snapshotId) {
      return (rows.first.data['downloaded_rows'] as int)
          .clamp(0, total)
          .toInt();
    }
    await db.transaction(() async {
      await db.customStatement(
        'DELETE FROM sync_download_staging WHERE dataset=?',
        [name],
      );
      await db.customStatement(
        'INSERT OR REPLACE INTO sync_download_checkpoint('
        'dataset,version,snapshot_id,total_rows,downloaded_rows,kind,updated_at'
        ') VALUES(?,?,?,?,?,?,?)',
        [
          name,
          version,
          snapshotId,
          total,
          0,
          kind,
          DateTime.now().toIso8601String(),
        ],
      );
    });
    return 0;
  }

  Future<int> _download(
    String token,
    String snapshotId,
    String name,
    String expected,
    String kind,
    int total,
    int start, {
    RowProgress? onRows,
  }) async {
    var offset = start;
    while (offset < total) {
      final page = await _send(token, {
        'cmd': 'snapshotFetch',
        'snapshotId': snapshotId,
        'dataset': name,
        'offset': offset,
        'limit': 250,
      });
      if ('${page['version']}' != expected ||
          '${page['snapshotId']}' != snapshotId) {
        throw const _SnapshotExpired(
            'Snapshot download berubah dan harus dibuat ulang.');
      }
      if (int.tryParse('${page['total']}') != total) {
        throw const _SnapshotExpired(
            'Jumlah data snapshot berubah dan harus dibuat ulang.');
      }
      final pageRows = List.from(page['rows'] ?? const []);
      if (pageRows.isEmpty) {
        throw Exception(
            'Server mengirim halaman kosong sebelum download selesai. Data lokal sebelumnya tetap digunakan.');
      }
      if (offset + pageRows.length > total) {
        throw const _SnapshotExpired(
            'Jumlah baris snapshot tidak konsisten dan harus dibuat ulang.');
      }
      await db.transaction(() async {
        for (var i = 0; i < pageRows.length; i++) {
          await db.customStatement(
            'INSERT OR REPLACE INTO sync_download_staging('
            'dataset,row_key,payload) VALUES(?,?,?)',
            [name, (offset + i).toString(), jsonEncode(pageRows[i])],
          );
        }
        offset += pageRows.length;
        await db.customStatement(
          'UPDATE sync_download_checkpoint '
          'SET downloaded_rows=?, updated_at=? WHERE dataset=?',
          [offset, DateTime.now().toIso8601String(), name],
        );
      });
      onRows?.call(offset);
    }
    if (offset != total) {
      throw Exception(
          'Download snapshot tidak lengkap. Data lokal sebelumnya tetap digunakan.');
    }
    await db.transaction(() async {
      await db.customStatement(
        'DELETE FROM local_dataset_rows WHERE dataset=?',
        [name],
      );
      await db.customStatement(
        'INSERT INTO local_dataset_rows(dataset,row_key,payload) '
        'SELECT dataset,row_key,payload FROM sync_download_staging WHERE dataset=?',
        [name],
      );
      await db.customStatement(
        'INSERT OR REPLACE INTO local_dataset_state('
        'dataset,version,updated_at,row_count,kind) VALUES(?,?,?,?,?)',
        [name, expected, DateTime.now().toIso8601String(), offset, kind],
      );
      await db.customStatement(
        'DELETE FROM sync_download_staging WHERE dataset=?',
        [name],
      );
      await db.customStatement(
        'DELETE FROM sync_download_checkpoint WHERE dataset=?',
        [name],
      );
    });
    return offset;
  }

  Future<List<dynamic>> rows(String dataset) async {
    final rows = await db.customSelect(
      'SELECT payload FROM local_dataset_rows '
      'WHERE dataset=? ORDER BY CAST(row_key AS INTEGER)',
      variables: [Variable.withString(dataset)],
    ).get();
    return rows
        .map((row) => jsonDecode(row.data['payload'].toString()))
        .toList();
  }
}
