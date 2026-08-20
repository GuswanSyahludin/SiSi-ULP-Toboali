// lib/widgets/sync_section_pengaturan.dart
// ─────────────────────────────────────────────────────────────
// Bagian "Data & Server Lokal" di menu Pengaturan (Project Dart).
//
//  1) Card DOWNLOAD MASTER DATA — ketuk: siapkan database lokal + tarik
//     master data secara online. Penanda di kanan kartu:
//       ✅ hijau = data & server lokal SUDAH ada
//       ❌ merah = BELUM ada (menu modul masih terkunci / interlock)
//  2) Card STATUS SYNC per modul — 3 kriteria:
//       Update      = sudah tersinkron HARI INI (hijau)
//       Proses Sync = sedang berjalan (amber + spinner)
//       Belum Update= belum/bukan hari ini (merah)
//     Ketuk kartu untuk sinkron. Proses DIKUNCI 1x per modul — klik berulang
//     saat proses berjalan ditolak, jadi server tidak menerima request berlipat.
// ─────────────────────────────────────────────────────────────

import 'dart:async';

import 'package:flutter/material.dart';

import '../db/app_database.dart';
import '../db/db_provider.dart';
import '../db/repositories/sync_repository.dart';
import '../theme/app_colors.dart';

class SyncSectionPengaturan extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const SyncSectionPengaturan({super.key, required this.sesi});

  @override
  State<SyncSectionPengaturan> createState() => _SyncSectionPengaturanState();
}

class _SyncSectionPengaturanState extends State<SyncSectionPengaturan> {
  final _repo = SyncRepository();
  StreamSubscription<List<SyncInfo>>? _sub;
  Map<String, SyncInfo> _status = {};
  String _perangkatId = '…';
  final Set<String> _proses = {};

  String get _token => (widget.sesi['token'] ?? '').toString();

  String _todayString() {
    final now = DateTime.now();
    final y = now.year.toString().padLeft(4, '0');
    final m = now.month.toString().padLeft(2, '0');
    final d = now.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  @override
  void initState() {
    super.initState();
    // Reaktif: tiap sync selesai, status kartu berubah otomatis tanpa refresh.
    _sub = DbProvider.instance.syncDao.pantauSemua().listen((rows) {
      if (!mounted) return;
      setState(() => _status = {for (final r in rows) r.key: r});
    });
    _repo.perangkatId().then((id) {
      if (mounted) setState(() => _perangkatId = id);
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  // Kriteria "Update" = sudah tersinkron HARI INI; selain itu "Belum Update".
  bool _syncHariIni(String iso) {
    if (iso.isEmpty) return false;
    final t = DateTime.tryParse(iso);
    if (t == null) return false;
    final now = DateTime.now();
    return t.year == now.year && t.month == now.month && t.day == now.day;
  }

  String _formatJam(String iso) {
    final t = DateTime.tryParse(iso);
    if (t == null) return '-';
    final hh = t.hour.toString().padLeft(2, '0');
    final mm = t.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  // Jalankan aksi sync dengan KUNCI 1x per modul (anti-spam klik).
  Future<void> _jalankan(
    String modul,
    Future<Map<String, dynamic>> Function() aksi,
    String pesanSukses,
  ) async {
    if (_proses.contains(modul)) return; // sedang berjalan -> tolak klik baru
    setState(() => _proses.add(modul));
    final res = await aksi();
    if (!mounted) return;
    setState(() => _proses.remove(modul));
    final ok = res['ok'] == true;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(ok
            ? pesanSukses
            : (res['message'] ?? 'Proses gagal').toString()),
        backgroundColor: ok ? const Color(0xFF059669) : Colors.redAccent,
      ),
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
              color: AppColors.navy700),
        ),
        const SizedBox(height: 4),
        Text(
          'ID server lokal HP ini: $_perangkatId',
          style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 10),
        _buildCardMasterData(),
        const SizedBox(height: 10),
        _buildCardModul(
          modul: SyncRepository.modulLaporanTeknik,
          nama: 'Laporan Harian Teknik',
          ikon: Icons.assessment_outlined,
          aksi: () => _repo.sinkronLaporanTeknik(_todayString()),
        ),
        const SizedBox(height: 6),
        Text(
          'Ketuk kartu untuk sinkron • Update = sudah hari ini • Belum Update = perlu sinkron',
          style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
        ),
      ],
    );
  }

  // ═══ CARD 1: DOWNLOAD MASTER DATA (+ penanda ✅ / ❌) ═══
  Widget _buildCardMasterData() {
    final info = _status[SyncRepository.modulMasterData];
    final siap = info != null && info.lastSyncAt.isNotEmpty;
    final proses = _proses.contains(SyncRepository.modulMasterData);

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: siap ? const Color(0xFFBBF7D0) : const Color(0xFFFECACA),
        ),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.navy700.withOpacity(0.08),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.cloud_download_rounded,
              color: AppColors.navy700, size: 22),
        ),
        title: const Text(
          'Download Master Data',
          style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: AppColors.navy700),
        ),
        subtitle: Text(
          proses
              ? 'Menyiapkan server lokal & menarik data…'
              : siap
                  ? '${info.jumlahData} penyulang • terakhir ${_formatJam(info.lastSyncAt)}'
                  : 'Belum ada data — ketuk untuk download (butuh internet)',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
        // Penanda: spinner saat proses, ✅ hijau bila siap, ❌ merah bila belum
        trailing: proses
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Icon(
                siap ? Icons.check_circle_rounded : Icons.cancel_rounded,
                color:
                    siap ? const Color(0xFF059669) : const Color(0xFFDC2626),
                size: 26,
              ),
        onTap: proses
            ? null
            : () => _jalankan(
                  SyncRepository.modulMasterData,
                  () => _repo.downloadMasterData(_token),
                  'Master data tersimpan — menu modul terbuka',
                ),
      ),
    );
  }

  // ═══ CARD 2: STATUS SYNC PER MODUL (Update / Proses Sync / Belum Update) ═══
  Widget _buildCardModul({
    required String modul,
    required String nama,
    required IconData ikon,
    required Future<Map<String, dynamic>> Function() aksi,
  }) {
    final info = _status[modul];
    final update = info != null && _syncHariIni(info.lastSyncAt);
    final proses = _proses.contains(modul);

    final label =
        proses ? 'Proses Sync' : (update ? 'Update' : 'Belum Update');
    final warna = proses
        ? const Color(0xFFD97706) // amber
        : (update ? const Color(0xFF059669) : const Color(0xFFDC2626));

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.navy700.withOpacity(0.08),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(ikon, color: AppColors.navy700, size: 22),
        ),
        title: Text(
          nama,
          style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: AppColors.navy700),
        ),
        subtitle: Text(
          update
              ? 'Sinkron terakhir hari ini ${_formatJam(info!.lastSyncAt)}'
              : (info != null && info.lastSyncAt.isNotEmpty
                  ? 'Sinkron terakhir bukan hari ini (${_formatJam(info.lastSyncAt)})'
                  : 'Belum pernah sinkron'),
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: warna.withOpacity(0.10),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: warna, width: 1),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (proses)
                const SizedBox(
                  width: 10,
                  height: 10,
                  child: CircularProgressIndicator(strokeWidth: 1.5),
                )
              else
                Icon(
                  update ? Icons.check_rounded : Icons.sync_rounded,
                  size: 12,
                  color: warna,
                ),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                    fontSize: 10, fontWeight: FontWeight.bold, color: warna),
              ),
            ],
          ),
        ),
        onTap:
            proses ? null : () => _jalankan(modul, aksi, '$nama tersinkron'),
      ),
    );
  }
}
