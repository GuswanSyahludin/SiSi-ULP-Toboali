import 'dart:async';

import 'package:flutter/material.dart';

import '../db/app_database.dart';
import '../db/db_provider.dart';
import '../db/repositories/master_gardu_repository.dart';
import '../db/repositories/p0_repository.dart';
import '../db/repositories/sync_repository.dart';
import '../services/auto_sync_service.dart';
import '../services/sync_progress_service.dart';
import '../theme/app_colors.dart';

class SyncSectionPengaturan extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const SyncSectionPengaturan({super.key, required this.sesi});

  @override
  State<SyncSectionPengaturan> createState() => _State();
}

class _State extends State<SyncSectionPengaturan> {
  final repo = SyncRepository();
  StreamSubscription<List<SyncInfo>>? _syncSub;
  StreamSubscription<int>? _p0Sub;
  StreamSubscription<List<GarduOutbox>>? _garduSub;
  Map<String, SyncInfo> status = {};
  int p0 = 0;
  List<GarduOutbox> gardu = [];
  String device = '…';

  @override
  void initState() {
    super.initState();
    _syncSub = DbProvider.instance.syncDao.pantauSemua().listen((rows) {
      if (mounted) setState(() => status = {for (final x in rows) x.key: x});
    });
    _p0Sub = P0Repository().pantauJumlahAntrean().listen((n) {
      if (mounted) setState(() => p0 = n);
    });
    _garduSub = MasterGarduRepository().pantauAntrean().listen((rows) {
      if (mounted) setState(() => gardu = rows);
    });
    repo.perangkatId().then((value) {
      if (mounted) setState(() => device = value);
    });
    SyncProgressService.instance.restore();
  }

  @override
  void dispose() {
    _syncSub?.cancel();
    _p0Sub?.cancel();
    _garduSub?.cancel();
    super.dispose();
  }

  Future<void> _download(String module) async {
    if (SyncProgressService.instance.state.value.running) return;
    final result = await AutoSyncService.startModuleSync(module);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${result['message']}')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Data & Server Lokal',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: AppColors.navy700,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'ID server lokal HP: $device',
          style: const TextStyle(fontSize: 11, color: AppColors.neutral500),
        ),
        const SizedBox(height: 12),
        ValueListenableBuilder<SyncProgressState>(
          valueListenable: SyncProgressService.instance.state,
          builder: (context, progress, _) => Column(
            children: [
              _summary(progress),
              const SizedBox(height: 12),
              for (final entry in SyncRepository.moduleLabels.entries)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _moduleTile(entry.key, entry.value, progress),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _summary(SyncProgressState progress) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (progress.running)
                const _Spin()
              else
                const Icon(Icons.cloud_done_outlined, color: AppColors.navy700),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      progress.running ? 'Download Data Master' : 'Data Master',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      progress.running
                          ? progress.stage
                          : 'Pilih modul untuk download',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.neutral500,
                      ),
                    ),
                  ],
                ),
              ),
              if (progress.running)
                Text(
                  '${progress.percent}%',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppColors.navy700,
                  ),
                ),
            ],
          ),
          if (progress.running) ...[
            const SizedBox(height: 12),
            LinearProgressIndicator(value: progress.fraction, minHeight: 7),
            if (progress.datasetLabel.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                progress.datasetLabel,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.neutral500,
                ),
              ),
            ],
          ],
          if (!progress.running && progress.message != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                progress.message!,
                style: TextStyle(
                  fontSize: 11,
                  color: progress.failed
                      ? AppColors.red600
                      : AppColors.success700,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _moduleTile(
    String key,
    String label,
    SyncProgressState progress,
  ) {
    final active = progress.running && progress.module == key;
    final info = status['master:$key'];
    final last = DateTime.tryParse(info?.lastSyncAt ?? '')?.toLocal();
    final subtitle = active
        ? (progress.datasetLabel.isEmpty
            ? progress.stage
            : progress.datasetLabel)
        : last == null
            ? 'Belum didownload'
            : 'Terakhir ${last.day}/${last.month} '
                '${last.hour.toString().padLeft(2, '0')}:'
                '${last.minute.toString().padLeft(2, '0')}';

    return Material(
      color: active ? AppColors.navy100 : Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: progress.running ? null : () => _download(key),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          child: Column(
            children: [
              Row(
                children: [
                  Icon(
                    active
                        ? Icons.downloading_rounded
                        : Icons.folder_copy_outlined,
                    color: AppColors.navy700,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          subtitle,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.neutral500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (active)
                    Text(
                      '${progress.percent}%',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.navy700,
                      ),
                    )
                  else
                    const Icon(Icons.download_rounded, color: AppColors.navy700),
                ],
              ),
              if (active) ...[
                const SizedBox(height: 10),
                LinearProgressIndicator(
                  value: progress.fraction,
                  minHeight: 5,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Spin extends StatefulWidget {
  const _Spin();

  @override
  State<_Spin> createState() => _SpinState();
}

class _SpinState extends State<_Spin>
    with SingleTickerProviderStateMixin {
  late final AnimationController controller;

  @override
  void initState() {
    super.initState();
    controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 950),
    )..repeat();
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => RotationTransition(
        turns: controller,
        child: const Icon(Icons.sync, color: AppColors.navy700),
      );
}
