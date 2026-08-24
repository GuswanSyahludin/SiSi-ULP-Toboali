import 'dart:async';
import 'package:flutter/material.dart';

import '../db/app_database.dart';
import '../db/db_provider.dart';
import '../db/repositories/master_gardu_repository.dart';
import '../db/repositories/p0_repository.dart';
import '../db/repositories/sync_repository.dart';
import '../theme/app_colors.dart';
import '../services/auto_sync_service.dart';

class SyncSectionPengaturan extends StatefulWidget {
  final Map<String, dynamic> sesi;

  const SyncSectionPengaturan({super.key, required this.sesi});

  @override
  State<SyncSectionPengaturan> createState() => _State();
}

class _State extends State<SyncSectionPengaturan> {
  final repo = SyncRepository();

  StreamSubscription<List<SyncInfo>>? _syncSub;
  StreamSubscription<List<P0Outbox>>? _p0Sub;
  StreamSubscription<List<GarduOutbox>>? _garduSub;

  Map<String, SyncInfo> status = {};
  List<P0Outbox> p0 = [];
  List<GarduOutbox> gardu = [];
  String device = '…';
  bool proses = false;

  String get token => (widget.sesi['token'] ?? '').toString();

  @override
  void initState() {
    super.initState();
    _syncSub = DbProvider.instance.syncDao.pantauSemua().listen((rows) {
      if (mounted) setState(() => status = {for (final x in rows) x.key: x});
    });
    _p0Sub = P0Repository().pantauAntrean().listen((rows) {
      if (mounted) setState(() => p0 = rows);
    });
    _garduSub = MasterGarduRepository().pantauAntrean().listen((rows) {
      if (mounted) setState(() => gardu = rows);
    });
    repo.perangkatId().then((value) {
      if (mounted) setState(() => device = value);
    });
  }

  @override
  void dispose() {
    _syncSub?.cancel();
    _p0Sub?.cancel();
    _garduSub?.cancel();
    super.dispose();
  }

  Future<void> _sinkronSemua() async {
    if (proses) return;
    setState(() => proses = true);

    final hasil = await repo.sinkronSemua(token);
    if (!mounted) return;

    setState(() => proses = false);
    final ok = hasil['ok'] == true;
    if (ok) await AutoSyncService.activate();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content:
            Text((hasil['message'] ?? (ok ? 'Selesai' : 'Gagal')).toString()),
        backgroundColor: ok ? AppColors.success700 : AppColors.red600,
        duration: const Duration(seconds: 5),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final info = status[SyncRepository.modulMasterData];
    final sudahPernahSinkron = info != null && info.lastSyncAt.isNotEmpty;
    final totalAntrean = p0.length + gardu.length;
    final warna = totalAntrean > 0 ? AppColors.amber700 : AppColors.navy700;

    final subtitle = proses
        ? 'Proses Sinkron....'
        : totalAntrean > 0
            ? '${p0.length} keputusan P0 · ${gardu.length} edit Gardu menunggu kirim'
            : sudahPernahSinkron
                ? 'Sinkron otomatis aktif · data siap offline'
                : 'Upload Data & Proses Sinkron';

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
          'ID server lokal HP ini: $device',
          style: const TextStyle(fontSize: 11, color: AppColors.neutral500),
        ),
        const SizedBox(height: 10),
        Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: warna.withOpacity(.25)),
          ),
          child: ListTile(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: warna.withOpacity(.10),
                borderRadius: BorderRadius.circular(9),
              ),
              child: Icon(
                sudahPernahSinkron
                    ? Icons.sync_rounded
                    : Icons.cloud_download_rounded,
                color: warna,
              ),
            ),
            title: const Text(
              'Sinkron Semua Data',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: AppColors.navy700,
              ),
            ),
            subtitle: Padding(
              padding: const EdgeInsets.only(top: 3),
              child: Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.neutral500,
                ),
              ),
            ),
            trailing: proses
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : totalAntrean > 0
                    ? Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '$totalAntrean',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: AppColors.amber700,
                          ),
                        ),
                      )
                    : Icon(Icons.chevron_right_rounded, color: warna),
            onTap: proses ? null : _sinkronSemua,
          ),
        ),
      ],
    );
  }
}
