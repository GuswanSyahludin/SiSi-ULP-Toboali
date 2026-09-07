import 'dart:async';
import 'dart:convert';

import 'package:drift/drift.dart';
import '../../services/apps_script_http.dart' as http;
import '../../services/api_service.dart';
import '../db_provider.dart';

class DeltaSyncResult {
  final bool ok;
  final bool initial;
  final List<String> changed;
  final String message;
  const DeltaSyncResult({required this.ok, required this.initial, required this.changed, required this.message});
}
class DeltaTransferProgress {
  final String dataset;
  final int datasetTransferred;
  final int datasetTotal;
  final int overallTransferred;
  final int overallTotal;
  const DeltaTransferProgress({required this.dataset, required this.datasetTransferred, required this.datasetTotal, required this.overallTransferred, required this.overallTotal});
}
typedef DeltaSyncProgress = void Function(DeltaTransferProgress progress);
typedef RowProgress = void Function(int rows);

class DeltaSyncRepository {
  final db = DbProvider.instance;

  Future<Map<String, dynamic>> _send(String token, Map<String, dynamic> payload) async {
    final uri = Uri.parse('${ApiService.baseUrl}?mobile=1');
    http.Response? response;
    Object? lastError;
    for (var attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await http.post(uri, headers: const {'Content-Type': 'application/json'}, body: jsonEncode({'action': 'getMasterGarduMobile', 'token': token, 'ulp': 'DELTA_SYNC:${jsonEncode(payload)}'})).timeout(const Duration(seconds: 90));
        if (response.body.trim().isNotEmpty) break;
        lastError = 'respons kosong (HTTP ${response.statusCode})';
      } catch (error) { lastError = error; }
      if (attempt == 1) await Future<void>.delayed(const Duration(seconds: 1));
    }
    final body = response?.body.trim() ?? '';
    if (body.isEmpty) throw Exception('Server tidak mengirim respons setelah 2 percobaan: $lastError');
    dynamic decoded;
    try { decoded = jsonDecode(body); } on FormatException {
      final preview = body.length > 140 ? '${body.substring(0, 140)}…' : body;
      throw Exception('Respons sinkron bukan JSON valid (HTTP ${response?.statusCode}): $preview');
    }
    if (decoded is! Map) throw Exception('Respons delta sync tidak valid.');
    final out = Map<String, dynamic>.from(decoded);
    if (out['success'] != true) throw Exception(out['message'] ?? 'Delta sync gagal.');
    return out;
  }

  Future<Map<String, String>> _versions() async {
    final rows = await db.customSelect('SELECT dataset, version FROM local_dataset_state').get();
    return {for (final row in rows) row.data['dataset'].toString(): row.data['version'].toString()};
  }
  Future<bool> sudahPernah() async => (await _versions()).isNotEmpty;

  Future<DeltaSyncResult> sync(String token, {bool force = false, DeltaSyncProgress? onProgress}) async {
    final local = await _versions();
    final manifest = await _send(token, {'cmd': 'manifest', 'force': force});
    final datasets = List.from(manifest['datasets'] ?? const []).map((raw) => Map<String, dynamic>.from(raw as Map)).where((item) => force || local[item['name'].toString()] != item['version'].toString()).toList();
    final overallTotal = datasets.fold<int>(0, (sum, item) => sum + (num.tryParse('${item['count']}')?.toInt() ?? 0));
    final changed = <String>[];
    var finishedRows = 0;

    for (final item in datasets) {
      final name = item['name'].toString();
      final version = item['version'].toString();
      final datasetTotal = num.tryParse('${item['count']}')?.toInt() ?? 0;
      final offset = await _resumeOffset(name, version, datasetTotal, item['kind'].toString());
      onProgress?.call(DeltaTransferProgress(dataset: name, datasetTransferred: offset, datasetTotal: datasetTotal, overallTransferred: finishedRows + offset, overallTotal: overallTotal));
      final downloaded = await _download(token, name, version, item['kind'].toString(), datasetTotal, offset, onRows: (rows) => onProgress?.call(DeltaTransferProgress(dataset: name, datasetTransferred: rows, datasetTotal: datasetTotal, overallTransferred: finishedRows + rows, overallTotal: overallTotal)));
      finishedRows += downloaded;
      changed.add(name);
    }

    final warnings = List.from(manifest['warnings'] ?? const []);
    final warningText = warnings.isEmpty ? '' : ' · ${warnings.length} dataset dilewati';
    return DeltaSyncResult(ok: true, initial: local.isEmpty, changed: changed, message: changed.isEmpty ? 'Tidak ada perubahan server$warningText.' : '${changed.length} tabel diperbarui$warningText.');
  }

  Future<int> _resumeOffset(String name, String version, int total, String kind) async {
    final rows = await db.customSelect('SELECT version, downloaded_rows FROM sync_download_checkpoint WHERE dataset=?', variables: [Variable.withString(name)]).get();
    if (rows.isNotEmpty && rows.first.data['version'] == version) return (rows.first.data['downloaded_rows'] as int).clamp(0, total);
    await db.transaction(() async {
      await db.customStatement('DELETE FROM sync_download_staging WHERE dataset=?', [name]);
      await db.customStatement('INSERT OR REPLACE INTO sync_download_checkpoint(dataset,version,total_rows,downloaded_rows,kind,updated_at) VALUES(?,?,?,?,?,?)', [name, version, total, 0, kind, DateTime.now().toIso8601String()]);
    });
    return 0;
  }

  Future<int> _download(String token, String name, String expected, String kind, int total, int start, {RowProgress? onRows}) async {
    var offset = start;
    while (offset < total || (total == 0 && offset == 0)) {
      final page = await _send(token, {'cmd': 'fetch', 'dataset': name, 'offset': offset, 'limit': 250});
      if ('${page['version']}' != expected) {
        await db.customStatement('DELETE FROM sync_download_checkpoint WHERE dataset=?', [name]);
        throw Exception('Dataset $name berubah saat diunduh. Menjadwalkan ulang dari versi terbaru.');
      }
      final pageRows = List.from(page['rows'] ?? const []);
      await db.transaction(() async {
        for (var i = 0; i < pageRows.length; i++) {
          await db.customStatement('INSERT OR REPLACE INTO sync_download_staging(dataset,row_key,payload) VALUES(?,?,?)', [name, (offset + i).toString(), jsonEncode(pageRows[i])]);
        }
        offset += pageRows.length;
        await db.customStatement('UPDATE sync_download_checkpoint SET downloaded_rows=?, updated_at=? WHERE dataset=?', [offset, DateTime.now().toIso8601String(), name]);
      });
      onRows?.call(offset);
      if (page['hasMore'] != true) break;
      if (pageRows.isEmpty) throw Exception('Server tidak memajukan halaman $name.');
    }
    await db.transaction(() async {
      await db.customStatement('DELETE FROM local_dataset_rows WHERE dataset=?', [name]);
      await db.customStatement('INSERT INTO local_dataset_rows(dataset,row_key,payload) SELECT dataset,row_key,payload FROM sync_download_staging WHERE dataset=?', [name]);
      await db.customStatement('INSERT OR REPLACE INTO local_dataset_state(dataset,version,updated_at,row_count,kind) VALUES(?,?,?,?,?)', [name, expected, DateTime.now().toIso8601String(), offset, kind]);
      await db.customStatement('DELETE FROM sync_download_staging WHERE dataset=?', [name]);
      await db.customStatement('DELETE FROM sync_download_checkpoint WHERE dataset=?', [name]);
    });
    return offset;
  }

  Future<List<dynamic>> rows(String dataset) async {
    final rows = await db.customSelect('SELECT payload FROM local_dataset_rows WHERE dataset=? ORDER BY CAST(row_key AS INTEGER)', variables: [Variable.withString(dataset)]).get();
    return rows.map((row) => jsonDecode(row.data['payload'].toString())).toList();
  }
}
