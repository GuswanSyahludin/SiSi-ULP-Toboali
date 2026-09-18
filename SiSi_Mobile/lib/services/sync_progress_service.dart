import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
  'Teknik_Laporan_Harian': 'Master Laporan Harian',
  'db_Users': 'Master User',
  'db_Tim': 'Master Tim',
  'db_Penyulang': 'Master Penyulang',
  'db_List_Temuan': 'Master List Temuan',
  'db_Hartek_List_Pekerjaan': 'Master List Pekerjaan Hartek',
  'db_Material': 'Master List Material',
  'db_Yandal_List_P0': 'Master List P0',
  'db_List_Petugas_Yandal': 'Master Petugas Yandal',
  'db_Section': 'Master Section',
  'Master_Gardu': 'Master Data Gardu',
};

String syncDatasetLabel(String? dataset) => dataset == null || dataset.isEmpty
    ? ''
    : syncDatasetLabels[dataset] ?? dataset;

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
      this.message});
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
        'message': message
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
          message: j['message']?.toString());
}

class SyncProgressService {
  SyncProgressService._() {
    Timer.periodic(const Duration(milliseconds: 700), (_) => restore());
  }
  static final instance = SyncProgressService._();
  static const _key = 'syncProgressStateV3';
  String _last = '';
  Future<void> _pendingWrite = Future.value();
  final ValueNotifier<SyncProgressState> state =
      ValueNotifier(const SyncProgressState());
  Future<void> restore() async {
    final p = await SharedPreferences.getInstance();
    await p.reload();
    final raw = p.getString(_key) ?? '';
    if (raw.isEmpty || raw == _last) return;
    try {
      state.value = SyncProgressState.fromJson(
          Map<String, dynamic>.from(jsonDecode(raw) as Map));
      _last = raw;
    } catch (_) {}
  }

  Future<void> _set(SyncProgressState next) {
    state.value = next;
    final raw = jsonEncode(next.toJson());
    _last = raw;
    final write = _pendingWrite.then((_) async {
      final p = await SharedPreferences.getInstance();
      await p.setString(_key, raw);
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
  Future<void> failure(String message) => _set(SyncProgressState(
      failed: true,
      stage: 'Sinkronisasi dijadwalkan ulang',
      module: state.value.module,
      message: message));
}
