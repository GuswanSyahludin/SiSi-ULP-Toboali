import 'package:flutter/foundation.dart';

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

  double get fraction {
    if (totalRows > 0) {
      return (transferredRows / totalRows).clamp(0, 1);
    }
    return total <= 0 ? 0 : (completed / total).clamp(0, 1);
  }

  int get percent => (fraction * 100).round();

  int get datasetPercent => datasetTotalRows <= 0
      ? 0
      : ((datasetTransferredRows / datasetTotalRows).clamp(0, 1) * 100)
          .round();
}

class SyncProgressService {
  SyncProgressService._();
  static final instance = SyncProgressService._();

  final ValueNotifier<SyncProgressState> state =
      ValueNotifier(const SyncProgressState());

  void begin({String stage = 'Menyiapkan sinkronisasi', int total = 10}) {
    state.value = SyncProgressState(running: true, stage: stage, total: total);
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
    state.value = SyncProgressState(
      running: true,
      stage: stage,
      dataset: dataset,
      completed: completed,
      total: total,
      transferredRows: transferredRows,
      totalRows: totalRows,
      datasetTransferredRows: datasetTransferredRows,
      datasetTotalRows: datasetTotalRows,
    );
  }

  void success(String message) {
    state.value = SyncProgressState(
      stage: 'Sinkronisasi selesai',
      completed: 1,
      total: 1,
      message: message,
    );
  }

  void failure(String message) {
    state.value = SyncProgressState(
      failed: true,
      stage: 'Sinkronisasi gagal',
      message: message,
    );
  }
}
