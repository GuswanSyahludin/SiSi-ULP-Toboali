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
  @override State<SyncSectionPengaturan> createState() => _State();
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

  String _jamSinkron(SyncInfo? info) {
    if (info == null || info.lastSyncAt.trim().isEmpty) return '';
    final waktu = DateTime.tryParse(info.lastSyncAt)?.toLocal();
    if (waktu == null) return '';
    return '${waktu.hour.toString().padLeft(2, '0')}:${waktu.minute.toString().padLeft(2, '0')} WIB';
  }

  Future<void> _sinkronSemua() async {
    if (proses) return;
    setState(() => proses = true);
    Map<String, dynamic> hasil;
    try {
      hasil = await repo.sinkronSemua(token);
      final ok = hasil['ok'] == true;
      if (ok) await AutoSyncService.activate();
    } catch (error) {
      hasil = {'ok': false, 'message': 'Sinkron gagal: $error'};
    } finally {
      if (mounted) setState(() => proses = false);
    }
    if (!mounted) return;
    final ok = hasil['ok'] == true;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text((hasil['message'] ?? (ok ? 'Sinkron selesai' : 'Sinkron gagal')).toString()),
      backgroundColor: ok ? AppColors.success700 : AppColors.red600,
      duration: const Duration(seconds: 5),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final info = status[SyncRepository.modulMasterData];
    final sudahPernahSinkron = info != null && info.lastSyncAt.isNotEmpty;
    final totalAntrean = p0.length + gardu.length;
    final warna = totalAntrean > 0 ? AppColors.amber700 : AppColors.navy700;
    final subtitle = proses
        ? 'Proses sinkron...'
        : totalAntrean > 0
            ? '${p0.length} keputusan P0 · ${gardu.length} edit Gardu menunggu kirim'
            : sudahPernahSinkron
                ? 'Sinkron selesai · data siap offline'
                : 'Upload data dan mulai sinkron';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Data & Server Lokal', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.navy700)),
        const SizedBox(height: 4),
        Text('ID server lokal HP ini: $device', style: const TextStyle(fontSize: 11, color: AppColors.neutral500)),
        const SizedBox(height: 10),
        Card(
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: warna.withOpacity(.25))),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(color: warna.withOpacity(.10), borderRadius: BorderRadius.circular(9)),
              child: Icon(proses ? Icons.sync_rounded : Icons.cloud_done_outlined, color: warna),
            ),
            title: Text(proses ? 'Sinkronisasi berjalan' : 'Sinkron Semua Data', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.navy700)),
            subtitle: Padding(
              padding: const EdgeInsets.only(top: 3),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.neutral500)),
                if (sudahPernahSinkron && !proses) ...[
                  const SizedBox(height: 3),
                  Text('Terakhir sinkron ${_jamSinkron(info)}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.success700)),
                ],
              ]),
            ),
            trailing: proses
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                : totalAntrean > 0
                    ? Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(20)),
                        child: Text('$totalAntrean', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.amber700)),
                      )
                    : const Icon(Icons.check_circle_rounded, color: AppColors.success700),
            onTap: proses ? null : _sinkronSemua,
          ),
        ),
      ],
    );
  }
}
