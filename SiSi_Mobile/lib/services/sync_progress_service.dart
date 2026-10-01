import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../db/db_provider.dart';

const syncDatasetLabels = <String, String>{
  'db_Global_Header': 'Master Laporan Utama',
  'db_ROW_Realisasi': 'Master Realisasi ROW',
  'db_ROW_Eksekusi': 'Master Realisasi Pekerjaan ROW',
  'db_Hartek_PenyulangGardu': 'Master Realisasi Hartek',
  'db_Hartek_Pekerjaan': 'Master Pekerjaan Hartek',
  'db_Hartek_Material': 'Master Material Hartek',
  'db_InsJar_Realisasi': 'Master Realisasi Inspeksi Jaringan',
  'db_InsDu_Realisasi': 'Master Realisasi Inspeksi Gardu',
  'db_INS_Temuan': 'Master Temuan Inspeksi',
  'db_Yandal_Shift': 'Master Shift Yandal',
  'db_Yandal_P0': 'Master P0 Yandal',
  'db_Yandal_Pengecekan_Switching': 'Master Switching Yandal',
  'db_Yandal_Pengukuran_Gardu': 'Master Gardu Yandal',
  'Teknik_Laporan_Harian': 'Master Laporan Harian Teknik',
  'db_Users': 'Master User',
  'db_Tim': 'Master Tim',
  'db_Penyulang': 'Master Penyulang',
  'db_List_Temuan': 'Master List Temuan',
  'db_Hartek_List_Pekerjaan': 'Master List Pekerjaan Hartek',
  'db_Material': 'Master List Material',
  'db_Yandal_List_P0': 'Master List P0',
  'db_List_Petugas_Yandal': 'Master List Petugas Yandal',
  'db_Section': 'Master Section',
  'Master_Gardu': 'Master Data Gardu',
};

String syncDatasetLabel(String? dataset) => dataset == null || dataset.isEmpty
    ? ''
    : syncDatasetLabels[dataset] ?? dataset;

/// Allowlisted diagnostics only. Never persist exception.toString(), HTTP
/// bodies, URLs, session objects, account identifiers, or database row payloads.
@immutable
class SyncFailureLog {
  static const summaries = <String, String>{
    'MASTER_LEASE_BUSY': 'Kunci master sedang dimiliki proses lain. Belum dapat dipastikan aktif atau tertinggal.',
    'TIMEOUT': 'Batas waktu permintaan terlampaui.',
    'NETWORK': 'Koneksi jaringan gagal.',
    'INVALID_RESPONSE': 'Respons server kosong atau tidak valid.',
    'SESSION': 'Sesi atau otorisasi ditolak.',
    'SNAPSHOT': 'Snapshot kedaluwarsa, berubah, atau tidak lengkap.',
    'EMPTY_PAGE': 'Halaman download kosong sebelum selesai.',
    'LOCAL_DATABASE': 'Operasi database lokal gagal.',
    'OUTBOX_FAILED': 'Satu atau lebih antrean pengiriman gagal.',
    'UNKNOWN': 'Kegagalan belum terklasifikasi. Periksa lokasi kode dan tahap terakhir.',
  };
  static const phases = <String>{
    'master_lease', 'refresh_session', 'read_local_state', 'download_snapshot',
    'materialize', 'save_sync_status', 'send_outbox', 'finalize',
  };
  static const modules = <String>{
    'dasar', 'row', 'hartek', 'inspeksi', 'yandal', 'laporan', 'semua',
  };
  final DateTime? occurredAt;
  final DateTime? leaseExpiresAt;
  final String code, phase;
  final String? module, dataset;
  final int transferredRows, totalRows, datasetTransferredRows, datasetTotalRows;
  final List<String> locations;
  const SyncFailureLog._({
    this.occurredAt, this.leaseExpiresAt, required this.code,
    required this.phase, this.module, this.dataset,
    required this.transferredRows, required this.totalRows,
    required this.datasetTransferredRows, required this.datasetTotalRows,
    required this.locations,
  });

  static String _classify(Object? error) {
    final text = error?.toString().toLowerCase() ?? '';
    if (text.contains('timeout') || text.contains('timed out')) return 'TIMEOUT';
    if (text.contains('socketexception') || text.contains('failed host lookup') ||
        text.contains('koneksi internet')) return 'NETWORK';
    if (text.contains('sesi') || text.contains('akses ditolak') ||
        text.contains('unauthorized')) return 'SESSION';
    if (text.contains('snapshot')) return 'SNAPSHOT';
    if (text.contains('halaman kosong')) return 'EMPTY_PAGE';
    if (text.contains('tidak mengirim respons') ||
        text.contains('respons') && text.contains('tidak valid')) return 'INVALID_RESPONSE';
    if (text.contains('sqlite') || text.contains('database is locked')) return 'LOCAL_DATABASE';
    if (text.contains('sinkron data sedang berjalan di proses lain')) return 'MASTER_LEASE_BUSY';
    return 'UNKNOWN';
  }

  factory SyncFailureLog.capture({
    required SyncProgressState progress,
    Object? error, StackTrace? stackTrace, String? code,
    String phase = 'finalize', DateTime? leaseExpiresAt, DateTime? now,
  }) {
    final matches = RegExp(r'package:[A-Za-z0-9_]+/[A-Za-z0-9_/.\-]+\.dart:\d+(?::\d+)?')
        .allMatches(stackTrace?.toString() ?? '')
        .take(8).map((match) => match.group(0)!).toList();
    return SyncFailureLog.fromJson({
      'occurredAt': (now ?? DateTime.now()).toUtc().toIso8601String(),
      'leaseExpiresAt': leaseExpiresAt?.toUtc().toIso8601String(),
      'code': code ?? _classify(error), 'phase': phase,
      'module': progress.module, 'dataset': progress.dataset,
      'transferredRows': progress.transferredRows, 'totalRows': progress.totalRows,
      'datasetTransferredRows': progress.datasetTransferredRows,
      'datasetTotalRows': progress.datasetTotalRows, 'locations': matches,
    });
  }

  // Revalidate stored data as well as newly captured data before display/copy.
  factory SyncFailureLog.fromJson(Map<String, dynamic> j) {
    DateTime? date(Object? v) => v is String ? DateTime.tryParse(v)?.toUtc() : null;
    int count(Object? v) => v is num && v.isFinite ? v.toInt().clamp(0, 1000000000).toInt() : 0;
    final rawLocations = j['locations'];
    return SyncFailureLog._(
      occurredAt: date(j['occurredAt']), leaseExpiresAt: date(j['leaseExpiresAt']),
      code: summaries.containsKey(j['code']) ? j['code'] as String : 'UNKNOWN',
      phase: phases.contains(j['phase']) ? j['phase'] as String : 'unknown',
      module: modules.contains(j['module']) ? j['module'] as String : null,
      dataset: syncDatasetLabels.containsKey(j['dataset']) ? j['dataset'] as String : null,
      transferredRows: count(j['transferredRows']), totalRows: count(j['totalRows']),
      datasetTransferredRows: count(j['datasetTransferredRows']),
      datasetTotalRows: count(j['datasetTotalRows']),
      locations: List<String>.unmodifiable(rawLocations is List
          ? rawLocations.whereType<String>().where((v) => v.length < 200 &&
              RegExp(r'^package:[A-Za-z0-9_]+/[A-Za-z0-9_/.\-]+\.dart:\d+(?::\d+)?$').hasMatch(v)).take(8)
          : const <String>[]),
    );
  }

  Map<String, dynamic> toJson() => {
    'occurredAt': occurredAt?.toUtc().toIso8601String(),
    'leaseExpiresAt': leaseExpiresAt?.toUtc().toIso8601String(),
    'code': code, 'phase': phase, 'module': module, 'dataset': dataset,
    'transferredRows': transferredRows, 'totalRows': totalRows,
    'datasetTransferredRows': datasetTransferredRows,
    'datasetTotalRows': datasetTotalRows, 'locations': locations,
  };

  String get text => [
    'SiSi | Log gagal download | v1',
    'Waktu (UTC): ${occurredAt?.toUtc().toIso8601String() ?? "Tidak terekam (kegagalan lama)"}',
    'Kode: $code', 'Pesan: ${summaries[code]}',
    'Modul: ${module ?? "Belum diketahui"}',
    'Dataset: ${dataset ?? "Belum memasuki dataset"}',
    'Tahap: $phase',
    'Baris total: $transferredRows/$totalRows',
    'Baris dataset: $datasetTransferredRows/$datasetTotalRows',
    if (code == 'MASTER_LEASE_BUSY') ...[
      'Kunci berakhir (UTC): ${leaseExpiresAt?.toUtc().toIso8601String() ?? "Tidak terekam"}',
      'Waktu kunci bukan bukti proses masih aktif. Log ini tidak melepas kunci.',
    ],
    'Lokasi kode: ${locations.isEmpty ? "Tidak tersedia" : locations.join("\n")}',
    'Privasi: token, password, URL, respons mentah, identitas akun, dan isi data tidak direkam.',
  ].join('\n');
}

SyncFailureLog syncFailureLogFor(SyncProgressState progress) =>
    progress.failureLog ?? SyncFailureLog.fromJson({
      'code': SyncFailureLog._classify(progress.message),
      'module': progress.module, 'dataset': progress.dataset,
      // Legacy failures have no reliable failure time or stack.
    });

@immutable
class SyncProgressState {
  final bool running;
  final bool failed;
  final String stage;
  final String? module;
  final String? dataset;
  final int completed;
  final int total;
  final int transferredRows;
  final int totalRows;
  final int datasetTransferredRows;
  final int datasetTotalRows;
  final String? message;
  final SyncFailureLog? failureLog;
  const SyncProgressState(
      {this.running = false,
      this.failed = false,
      this.stage = 'Siap sinkron',
      this.module,
      this.dataset,
      this.completed = 0,
      this.total = 1,
      this.transferredRows = 0,
      this.totalRows = 0,
      this.datasetTransferredRows = 0,
      this.datasetTotalRows = 0,
      this.message,
      this.failureLog});
  String get datasetLabel => syncDatasetLabel(dataset);
  double get fraction => totalRows > 0
      ? (transferredRows / totalRows).clamp(0, 1)
      : (total <= 0 ? 0 : (completed / total).clamp(0, 1));
  int get percent => (fraction * 100).round();
  int get datasetPercent => datasetTotalRows <= 0
      ? 0
      : ((datasetTransferredRows / datasetTotalRows).clamp(0, 1) * 100).round();
  Map<String, dynamic> toJson() => {
        'running': running,
        'failed': failed,
        'stage': stage,
        'module': module,
        'dataset': dataset,
        'completed': completed,
        'total': total,
        'transferredRows': transferredRows,
        'totalRows': totalRows,
        'datasetTransferredRows': datasetTransferredRows,
        'datasetTotalRows': datasetTotalRows,
        'message': message,
        if (failureLog != null) 'failureLog': failureLog!.toJson(),
      };
  factory SyncProgressState.fromJson(Map<String, dynamic> j) =>
      SyncProgressState(
          running: j['running'] == true,
          failed: j['failed'] == true,
          stage: '${j['stage'] ?? 'Siap sinkron'}',
          module: j['module']?.toString(),
          dataset: j['dataset']?.toString(),
          completed: (j['completed'] as num?)?.toInt() ?? 0,
          total: (j['total'] as num?)?.toInt() ?? 1,
          transferredRows: (j['transferredRows'] as num?)?.toInt() ?? 0,
          totalRows: (j['totalRows'] as num?)?.toInt() ?? 0,
          datasetTransferredRows:
              (j['datasetTransferredRows'] as num?)?.toInt() ?? 0,
          datasetTotalRows: (j['datasetTotalRows'] as num?)?.toInt() ?? 0,
          message: j['message']?.toString(),
          failureLog: j['failureLog'] is Map
              ? SyncFailureLog.fromJson(Map<String, dynamic>.from(j['failureLog'] as Map))
              : null);

  SyncProgressState withFailure(SyncFailureLog log) => SyncProgressState(
      failed: true, stage: 'Sinkronisasi dijadwalkan ulang',
      module: module, dataset: dataset, completed: completed, total: total,
      transferredRows: transferredRows, totalRows: totalRows,
      datasetTransferredRows: datasetTransferredRows,
      datasetTotalRows: datasetTotalRows,
      message: SyncFailureLog.summaries[log.code], failureLog: log);
}

class SyncProgressService {
  SyncProgressService._() {
    Timer.periodic(const Duration(milliseconds: 700), (_) => restore());
  }

  static final instance = SyncProgressService._();
  static const _key = 'syncProgressStateV3';
  String _last = '';
  String? _loadedScope;
  Future<void> _pendingWrite = Future.value();
  final ValueNotifier<SyncProgressState> state =
      ValueNotifier(const SyncProgressState());

  String? get _scopedKey {
    try {
      return DbProvider.scopedKey(_key, {
        'username': DbProvider.activeDatabaseName,
        'ulp': 'active',
      });
    } catch (_) {
      return null;
    }
  }

  String? get accountScope => _scopedKey;

  void _resetScope(String? scope) {
    if (_loadedScope == scope) return;
    _loadedScope = scope;
    _last = '';
    state.value = const SyncProgressState();
  }

  Future<void> restore() async {
    final storageKey = _scopedKey;
    _resetScope(storageKey);
    if (storageKey == null) return;
    final p = await SharedPreferences.getInstance();
    await p.reload();
    if (_scopedKey != storageKey) return;
    final raw = p.getString(storageKey) ?? '';
    if (raw.isEmpty || raw == _last) return;
    try {
      state.value = SyncProgressState.fromJson(
          Map<String, dynamic>.from(jsonDecode(raw) as Map));
      _last = raw;
    } catch (_) {}
  }

  Future<void> _set(SyncProgressState next) {
    final storageKey = _scopedKey;
    _resetScope(storageKey);
    if (storageKey == null) return Future.value();
    state.value = next;
    final raw = jsonEncode(next.toJson());
    _last = raw;
    final write = _pendingWrite.then((_) async {
      final p = await SharedPreferences.getInstance();
      await p.setString(storageKey, raw);
    }).catchError((_) {});
    _pendingWrite = write;
    return write;
  }

  Future<void> begin(
          {String stage = 'Menyiapkan sinkronisasi',
          String? module,
          int total = 10}) =>
      _set(SyncProgressState(
          running: true, stage: stage, module: module, total: total));

  void update(String stage,
      {String? module,
      String? dataset,
      required int completed,
      required int total,
      int transferredRows = 0,
      int totalRows = 0,
      int datasetTransferredRows = 0,
      int datasetTotalRows = 0}) {
    final old = state.value;
    unawaited(_set(SyncProgressState(
        running: true,
        stage: stage,
        module: module ?? old.module,
        dataset: dataset,
        completed: completed,
        total: total,
        transferredRows: transferredRows,
        totalRows: totalRows,
        datasetTransferredRows: datasetTransferredRows,
        datasetTotalRows: datasetTotalRows)));
  }

  Future<void> success(String message) => _set(SyncProgressState(
      stage: 'Sinkronisasi selesai',
      module: state.value.module,
      completed: 1,
      total: 1,
      message: message));

  Future<void> failure(String message, {
    Object? error, StackTrace? stackTrace, String? code,
    String phase = 'finalize', DateTime? leaseExpiresAt,
    SyncProgressState? context, String? expectedScope,
  }) {
    if (expectedScope != null && expectedScope != _scopedKey) return Future.value();
    final previous = context ?? state.value;
    final log = SyncFailureLog.capture(
        progress: previous, error: error ?? message, stackTrace: stackTrace,
        code: code, phase: phase, leaseExpiresAt: leaseExpiresAt);
    return _set(previous.withFailure(log));
  }
}
