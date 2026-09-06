import 'package:flutter/foundation.dart';

@immutable
class SyncProgressState {
  final bool running;
  final bool failed;
  final String stage;
  final String? dataset;
  final int completed;
  final int total;
  final int rows;
  final String? message;

  const SyncProgressState({
    this.running = false,
    this.failed = false,
    this.stage = 'Siap sinkron',
    this.dataset,
    this.completed = 0,
    this.total = 1,
    this.rows = 0,
    this.message,
  });

  double get fraction => total <= 0 ? 0 : (completed / total).clamp(0, 1);
  int get percent => (fraction * 100).round();
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
    int rows = 0,
  }) {
    state.value = SyncProgressState(
      running: true,
      stage: stage,
      dataset: dataset,
      completed: completed,
      total: total,
      rows: rows,
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
