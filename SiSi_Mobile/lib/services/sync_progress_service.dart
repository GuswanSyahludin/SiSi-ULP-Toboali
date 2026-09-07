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

String syncDatasetLabel(String? dataset) {
  if (dataset == null || dataset.isEmpty) return '';
  return syncDatasetLabels[dataset] ?? dataset;
}

@immutable
class SyncProgressState {
  final bool running;
  final bool failed;
  final String stage;
  final String? dataset;
  final int completed;
  final int total;
  final int transferredRows;
  final int totalRows;
  final int datasetTransferredRows;
  final int datasetTotalRows;
  final String? message;

  const SyncProgressState({
    this.running = false,
    this.failed = false,
    this.stage = 'Siap sinkron',
    this.dataset,
    this.completed = 0,
    this.total = 1,
    this.transferredRows = 0,
    this.totalRows = 0,
    this.datasetTransferredRows = 0,
    this.datasetTotalRows = 0,
    this.message,
  });

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
        'dataset': dataset,
        'completed': completed,
        'total': total,
        'transferredRows': transferredRows,
        'totalRows': totalRows,
        'datasetTransferredRows': datasetTransferredRows,
        'datasetTotalRows': datasetTotalRows,
        'message': message,
      };

  factory SyncProgressState.fromJson(Map<String, dynamic> json) =>
      SyncProgressState(
        running: json['running'] == true,
        failed: json['failed'] == true,
        stage: '${json['stage'] ?? 'Siap sinkron'}',
        dataset: json['dataset']?.toString(),
        completed: (json['completed'] as num?)?.toInt() ?? 0,
        total: (json['total'] as num?)?.toInt() ?? 1,
        transferredRows: (json['transferredRows'] as num?)?.toInt() ?? 0,
        totalRows: (json['totalRows'] as num?)?.toInt() ?? 0,
        datasetTransferredRows:
            (json['datasetTransferredRows'] as num?)?.toInt() ?? 0,
        datasetTotalRows: (json['datasetTotalRows'] as num?)?.toInt() ?? 0,
        message: json['message']?.toString(),
      );
}

class SyncProgressService {
  SyncProgressService._() {
    _poller = Timer.periodic(const Duration(milliseconds: 700), (_) => restore());
  }
  static final instance = SyncProgressService._();
  static const _key = 'syncProgressStateV2';
  late final Timer _poller;
  String _lastEncoded = '';

  final ValueNotifier<SyncProgressState> state =
      ValueNotifier(const SyncProgressState());

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.reload();
    final encoded = prefs.getString(_key) ?? '';
    if (encoded.isEmpty || encoded == _lastEncoded) return;
    try {
      state.value = SyncProgressState.fromJson(
        Map<String, dynamic>.from(jsonDecode(encoded) as Map),
      );
      _lastEncoded = encoded;
    } catch (_) {}
  }

  void _set(SyncProgressState next) {
    state.value = next;
    final encoded = jsonEncode(next.toJson());
    _lastEncoded = encoded;
    unawaited(_persist(encoded));
  }

  Future<void> _persist(String encoded) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, encoded);
  }

  void begin({String stage = 'Menyiapkan sinkronisasi', int total = 10}) {
    final previous = state.value;
    _set(SyncProgressState(
      running: true,
      stage: stage,
      total: total,
      transferredRows: previous.running ? previous.transferredRows : 0,
      totalRows: previous.running ? previous.totalRows : 0,
    ));
  }

  void update(
    String stage, {
    String? dataset,
    required int completed,
    required int total,
    int transferredRows = 0,
    int totalRows = 0,
    int datasetTransferredRows = 0,
    int datasetTotalRows = 0,
  }) {
    final previous = state.value;
    final candidatePercent = totalRows > 0 ? transferredRows / totalRows : 0.0;
    final keepPrevious = previous.running &&
        previous.totalRows > 0 &&
        candidatePercent < previous.fraction;
    _set(SyncProgressState(
      running: true,
      stage: stage,
      dataset: dataset,
      completed: completed,
      total: total,
      transferredRows:
          keepPrevious ? previous.transferredRows : transferredRows,
      totalRows: keepPrevious ? previous.totalRows : totalRows,
      datasetTransferredRows: datasetTransferredRows,
      datasetTotalRows: datasetTotalRows,
    ));
  }

  void success(String message) => _set(SyncProgressState(
        stage: 'Sinkronisasi selesai',
        completed: 1,
        total: 1,
        message: message,
      ));

  void failure(String message) => _set(SyncProgressState(
        failed: true,
        stage: 'Sinkronisasi dijadwalkan ulang',
        message: message,
      ));
}
