import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../db/app_database.dart';
import '../db/db_provider.dart';
import '../db/repositories/sync_repository.dart';
import '../services/auto_sync_service.dart';
import '../services/sync_progress_service.dart';
import '../theme/app_colors.dart';

class SyncSectionPengaturan extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final Listenable? refreshListenable;
  const SyncSectionPengaturan({super.key, required this.sesi, this.refreshListenable});
  @override State<SyncSectionPengaturan> createState() => _State();
}

class _State extends State<SyncSectionPengaturan> {
  StreamSubscription<List<SyncInfo>>? _syncSub;
  Timer? _statusPoll;
  Map<String, SyncInfo> status = {};
  bool _reloadingStatus = false;
  bool _wasRunning = false;
  int _pendingDownloadCount = 0;
  final Set<String> _selectedModules = {};
  bool _expanded = true;

  List<String> get _moduleKeys {
    final role = '${widget.sesi['role'] ?? ''}'.trim().toLowerCase();
    final team = '${widget.sesi['subTim'] ?? widget.sesi['tim'] ?? ''}'.trim().toLowerCase();
    if (role.contains('admin') || role.contains('super')) return SyncRepository.moduleLabels.keys.toList(growable: false);
    if (team.contains('yandal')) return const ['dasar', 'yandal'];
    if (team.contains('hartek')) return const ['dasar', 'hartek'];
    if (team.contains('row')) return const ['dasar', 'row', 'laporan'];
    if (team.contains('inspeksi')) return const ['dasar', 'inspeksi'];
    return const ['dasar'];
  }

  String get _teamName {
    final role = '${widget.sesi['role'] ?? ''}'.trim().toLowerCase();
    final team = '${widget.sesi['subTim'] ?? widget.sesi['tim'] ?? ''}'.trim();
    if (role.contains('admin') || role.contains('super')) return 'Admin';
    if (team.isEmpty) return 'Tim Operasional';
    if (team.toLowerCase().contains('yandal')) return 'Yandal';
    if (team.toLowerCase().contains('hartek')) return 'Hartek';
    if (team.toLowerCase().contains('row')) return 'ROW';
    if (team.toLowerCase().contains('inspeksi')) return 'Inspeksi';
    return team;
  }

  IconData get _teamIcon => switch (_teamName.toLowerCase()) {
    'admin' => Icons.admin_panel_settings_rounded,
    'yandal' => Icons.bolt_rounded,
    'hartek' => Icons.handyman_rounded,
    'row' => Icons.grid_view_rounded,
    'inspeksi' => Icons.fact_check_rounded,
    _ => Icons.groups_rounded,
  };

  Color get _teamColor => switch (_teamName.toLowerCase()) {
    'admin' => AppColors.navy700,
    'yandal' => AppColors.plnRed,
    'hartek' => AppColors.amber700,
    'row' => AppColors.success700,
    'inspeksi' => AppColors.cyan600,
    _ => AppColors.navy700,
  };

  @override
  void initState() {
    super.initState();
    _syncSub = DbProvider.instance.syncDao.pantauSemua().listen((rows) {
      if (mounted) setState(() => status = {for (final x in rows) x.key: x});
    });
    SyncProgressService.instance.state.addListener(_onProgress);
    widget.refreshListenable?.addListener(_reloadStatus);
    _statusPoll = Timer.periodic(const Duration(seconds: 2), (_) {
      if (SyncProgressService.instance.state.value.running) _reloadStatus();
    });
    SyncProgressService.instance.restore();
    _reloadStatus();
  }

  @override
  void didUpdateWidget(covariant SyncSectionPengaturan oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshListenable != widget.refreshListenable) {
      oldWidget.refreshListenable?.removeListener(_reloadStatus);
      widget.refreshListenable?.addListener(_reloadStatus);
    }
  }

  void _onProgress() {
    final progress = SyncProgressService.instance.state.value;
    if (_wasRunning && !progress.running && _pendingDownloadCount > 0) {
      final count = _pendingDownloadCount;
      _pendingDownloadCount = 0;
      if (mounted && !progress.failed) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _showDownloadSuccess(count);
        });
      }
    }
    _wasRunning = progress.running;
    if (mounted) setState(() {});
  }

  Future<void> _reloadStatus() async {
    if (_reloadingStatus) return;
    _reloadingStatus = true;
    try {
      await SyncProgressService.instance.restore();
      final rows = await DbProvider.instance.syncDao.pantauSemua().first;
      if (mounted) setState(() => status = {for (final x in rows) x.key: x});
    } finally { _reloadingStatus = false; }
  }

  @override
  void dispose() {
    _syncSub?.cancel();
    _statusPoll?.cancel();
    SyncProgressService.instance.state.removeListener(_onProgress);
    widget.refreshListenable?.removeListener(_reloadStatus);
    super.dispose();
  }

  Future<void> _downloadSelected() async {
    final progress = SyncProgressService.instance.state.value;
    if (progress.running || _selectedModules.isEmpty) return;
    final count = _selectedModules.length;
    _pendingDownloadCount = count;
    final result = await AutoSyncService.startModulesSync(_selectedModules);
    if (!mounted) return;
    if (result['ok'] != true) {
      _pendingDownloadCount = 0;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${result['message']}')));
    }
  }

  Future<void> _showDownloadSuccess(int count) async {
    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        contentPadding: const EdgeInsets.fromLTRB(24, 24, 24, 18),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 54, height: 54, decoration: const BoxDecoration(color: AppColors.cyan100, shape: BoxShape.circle), child: const Icon(Icons.check_rounded, color: AppColors.cyan600, size: 32)),
          const SizedBox(height: 14),
          const Text('Database berhasil di-download', textAlign: TextAlign.center, style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text('$count paket Database dari $_teamName sudah tersimpan dan siap digunakan offline.', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: AppColors.neutral500)),
          const SizedBox(height: 17),
          SizedBox(width: double.infinity, child: FilledButton(onPressed: () { Navigator.pop(context); setState(_selectedModules.clear); }, child: const Text('Selesai'))),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => _packageCard(_moduleKeys, SyncProgressService.instance.state.value, _selectedModules.length);

  Widget _packageCard(List<String> moduleKeys, SyncProgressState progress, int selectedCount) {
    final color = _teamColor;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.neutral200), boxShadow: [BoxShadow(color: AppColors.navy950.withOpacity(.055), blurRadius: 14, offset: const Offset(0, 5))]),
      child: Column(children: [
        Padding(padding: const EdgeInsets.all(15), child: Row(children: [
          Container(width: 44, height: 44, decoration: BoxDecoration(color: color.withOpacity(.12), borderRadius: BorderRadius.circular(14)), child: Icon(_teamIcon, color: color, size: 24)),
          const SizedBox(width: 11),
          Expanded(child: Text(_teamName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800))),
          Text('${moduleKeys.length}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(width: 4),
          const Text('Database', style: TextStyle(fontSize: 9, color: AppColors.neutral500)),
          const SizedBox(width: 9),
          SizedBox.square(dimension: 35, child: OutlinedButton(onPressed: () => setState(() => _expanded = !_expanded), style: OutlinedButton.styleFrom(padding: EdgeInsets.zero, side: const BorderSide(color: AppColors.neutral200), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))), child: AnimatedRotation(turns: _expanded ? .125 : 0, duration: const Duration(milliseconds: 180), child: const Icon(Icons.add_rounded, size: 21)))),
        ])),
        if (_expanded) ...[
          const Divider(height: 1),
          Container(color: AppColors.neutral50, padding: const EdgeInsets.fromLTRB(13, 11, 13, 12), child: Column(children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Database tersedia', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700)), Text('Sync terakhir', style: TextStyle(fontSize: 9, color: AppColors.neutral500))]),
            const SizedBox(height: 8),
            ...moduleKeys.map((key) => _moduleTile(key, progress)),
          ])),
        ],
        const Divider(height: 1),
        Container(color: AppColors.neutral50, padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11), child: Row(children: [
          Expanded(child: Text(selectedCount == 0 ? 'Pilih Database' : '$selectedCount Database siap', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700))),
          SizedBox(height: 38, child: FilledButton(onPressed: progress.running || selectedCount == 0 ? null : _downloadSelected, style: FilledButton.styleFrom(backgroundColor: color, padding: const EdgeInsets.symmetric(horizontal: 13), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11))), child: Text(progress.running ? '${progress.percent}%' : 'Download', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)))),
        ])),
        if (progress.running) Padding(padding: const EdgeInsets.fromLTRB(13, 0, 13, 11), child: Column(children: [LinearProgressIndicator(value: progress.fraction, minHeight: 5, color: color), const SizedBox(height: 4), Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Expanded(child: Text(progress.datasetLabel.isEmpty ? progress.stage : progress.datasetLabel, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 8, color: AppColors.neutral500))), Text('${progress.percent}%', style: const TextStyle(fontSize: 8, color: AppColors.neutral500))])])),
      ]),
    );
  }

  Widget _moduleTile(String key, SyncProgressState progress) {
    final active = progress.running && progress.module == key;
    final info = status['master:$key'];
    final last = DateTime.tryParse(info?.lastSyncAt ?? '')?.toLocal();
    final label = SyncRepository.moduleLabels[key] ?? key;
    final date = last == null ? 'Belum tersinkron' : DateFormat('dd MMM yyyy, HH:mm', 'id_ID').format(last);
    return Padding(padding: const EdgeInsets.only(bottom: 6), child: Material(color: active ? AppColors.navy100 : Colors.white, borderRadius: BorderRadius.circular(10), child: InkWell(onTap: progress.running ? null : () => _toggle(key), borderRadius: BorderRadius.circular(10), child: Padding(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 8), child: Row(children: [
      Checkbox(value: _selectedModules.contains(key), visualDensity: VisualDensity.compact, onChanged: progress.running ? null : (_) => _toggle(key)),
      const SizedBox(width: 4),
      Expanded(child: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600))),
      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [Text(active ? 'Menyinkronkan' : (last == null ? 'Belum tersinkron' : 'Tersinkron'), style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: active || last != null ? AppColors.success700 : AppColors.neutral500)), const SizedBox(height: 2), Text(active ? '${progress.percent}%' : date, style: const TextStyle(fontSize: 8, color: AppColors.neutral500))]),
    ])))));
  }

  void _toggle(String key) => setState(() { if (!_selectedModules.add(key)) _selectedModules.remove(key); });
}
