// lib/widgets/sync_section_pengaturan.dart
// ─────────────────────────────────────────────────────────────
// Bagian "Data & Server Lokal" di menu Pengaturan (Project Dart).
//
//  Card DOWNLOAD MASTER DATA — ketuk: siapkan database lokal + tarik
//  master data secara online. Penanda di kanan kartu:
//    ✅ hijau = data & server lokal SUDAH ada
//    ❌ merah = BELUM ada (menu modul masih terkunci / interlock)
//
//  Rev 21 Agu 2026: card status sync per modul (Laporan Harian Teknik)
//  DIHAPUS dari Pengaturan — sinkron modul berjalan otomatis saat menu
//  dibuka (prinsip "sinkron per menu"), bukan lewat kartu di sini.
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
      ],
    );
  }

  // ═══ CARD DOWNLOAD MASTER DATA (+ penanda ✅ / ❌) ═══
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
}
