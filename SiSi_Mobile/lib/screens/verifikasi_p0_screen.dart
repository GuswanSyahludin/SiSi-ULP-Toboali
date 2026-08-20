import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../widgets/custom_loading_widget.dart';

class VerifikasiP0Screen extends StatefulWidget {
  final Map<String, dynamic> sesi;

  const VerifikasiP0Screen({super.key, required this.sesi});

  @override
  State<VerifikasiP0Screen> createState() => _VerifikasiP0ScreenState();
}

class _VerifikasiP0ScreenState extends State<VerifikasiP0Screen> {
  String _selectedStatus = 'Menunggu';
  DateTime _selectedDate =
      DateTime.now(); // Filter tanggal 1 hari (default: hari ini)
  bool _isLoading = false; // tidak auto-load — menunggu tombol "Cari"
  bool _sudahCari =
      false; // true setelah pencarian pertama (ganti tanggal/tab ikut memuat ulang)
  List<dynamic> _listP0 = [];
  Map<String, dynamic> _counts = {};

  String get _currentUlp => widget.sesi['ulp'] ?? 'Toboali';
  String get _currentUsername => widget.sesi['username'] ?? 'Admin';

  static const List<String> _statusTabs = ['Menunggu', 'Approved', 'Rejected'];
  static const List<String> _bulanPendek = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];

  @override
  void initState() {
    super.initState();
    // TIDAK auto-load: halaman dibuka KOSONG sampai pengguna menekan tombol "Cari"
    // (hemat backend — sebelumnya tiap buka halaman langsung membaca sheet penuh).
  }

  // Tanggal terpilih → format API (yyyy-MM-dd)
  String get _tanggalApi {
    final d = _selectedDate;
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  String get _labelTanggal {
    final d = _selectedDate;
    return '${d.day} ${_bulanPendek[d.month - 1]} ${d.year}';
  }

  bool get _isToday {
    final now = DateTime.now();
    return _selectedDate.year == now.year &&
        _selectedDate.month == now.month &&
        _selectedDate.day == now.day;
  }

  String _fmtTglId(String iso) {
    if (iso.isEmpty) return '-';
    try {
      final d = DateTime.parse(iso);
      return '${d.day} ${_bulanPendek[d.month - 1]} ${d.year}';
    } catch (_) {
      return iso;
    }
  }

  String _timLabel(String tim) {
    if (tim.isEmpty) return '-';
    return tim.toLowerCase().startsWith('tim') ? tim : 'Tim $tim';
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    final res = await ApiService.getApprovalP0List(
      ulp: _currentUlp,
      status: _selectedStatus,
      tanggal: _tanggalApi,
    );
    if (mounted) {
      setState(() {
        _isLoading = false;
        if (res['ok'] == true) {
          _listP0 = res['list'] ?? [];
          _counts = Map<String, dynamic>.from(res['counts'] ?? {});
        } else {
          _listP0 = [];
        }
      });
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2025, 1, 1),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
      if (_sudahCari)
        _fetchData(); // setelah pencarian pertama, ganti tanggal langsung memuat ulang
    }
  }

  void _kembaliKeHariIni() {
    setState(() => _selectedDate = DateTime.now());
    if (_sudahCari) _fetchData();
  }

  // TOMBOL CARI (Rev 19 Agu malam 3): satu-satunya pemicu muat data saat pertama masuk halaman.
  // Setelah pencarian pertama, ganti tanggal / ganti tab / ikon refresh memuat ulang otomatis.
  void _cariData() {
    setState(() => _sudahCari = true);
    _fetchData();
  }

  Future<void> _prosesApproval(
    String kodeP0,
    String keputusan, {
    String alasan = '',
  }) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Dialog(
        backgroundColor: Colors.transparent,
        child: CustomLoadingWidget(message: 'Memproses keputusan...'),
      ),
    );

    Map<String, dynamic> res;
    try {
      res = await ApiService.setApprovalP0(
        kodeP0: kodeP0,
        keputusan: keputusan,
        username: _currentUsername,
        alasan: alasan,
      );
    } catch (e) {
      // WAJIB tutup loader saat error/timeout — jangan biarkan loading selamanya
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Gagal memproses (timeout/jaringan). Coba lagi.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (mounted) {
      Navigator.pop(context); // Tutup loader
      if (res['ok'] == true) {
        // OPTIMISTIC: keputusan sudah tercatat di antrean backend — hapus card dari
        // daftar & geser badge SEGERA, tanpa menunggu proses backend (±1 menit).
        setState(() {
          _listP0.removeWhere((e) => (e['kodeP0'] ?? '').toString() == kodeP0);
          final asal = _counts[_selectedStatus];
          if (asal is int && asal > 0) _counts[_selectedStatus] = asal - 1;
          final tujuan = _counts[keputusan];
          if (tujuan is int) _counts[keputusan] = tujuan + 1;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              keputusan == 'Approved'
                  ? 'Data $kodeP0 disetujui!.'
                  : 'Data $kodeP0 ditolak.',
            ),
            backgroundColor: keputusan == 'Approved'
                ? const Color(0xFF10B981)
                : const Color(0xFFEF4444),
          ),
        );
        // Tidak perlu _fetchData(): card sudah hilang secara lokal. Refresh manual bila perlu.
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal: ${res['error']}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _konfirmasiApprove(String kodeP0) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Setujui P0 ini?',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        content: Text(
          'Data $kodeP0 akan ditandai Approved dan poinnya dihitung otomatis.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _prosesApproval(kodeP0, 'Approved');
            },
            child: const Text(
              'Ya, Setujui',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  void _showRejectDialog(String kodeP0) {
    final TextEditingController reasonCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          top: 20,
          left: 20,
          right: 20,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Tolak Verifikasi P0',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Kode P0: $kodeP0',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: Color(0xFF0284C7),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              maxLines: 3,
              decoration: InputDecoration(
                hintText:
                    'Tuliskan alasan penolakan (Wajib disimpan di kolom AQ)...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                onPressed: () {
                  if (reasonCtrl.text.trim().isEmpty) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(
                        content: Text('Alasan penolakan wajib diisi!'),
                      ),
                    );
                    return;
                  }
                  Navigator.pop(ctx);
                  _prosesApproval(
                    kodeP0,
                    'Rejected',
                    alasan: reasonCtrl.text.trim(),
                  );
                },
                child: const Text(
                  'Konfirmasi Tolak',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // DETAIL (Rev 19 Agu sore) — modal LANGSUNG terbuka dengan data dasar dari card
  // (selalu tampil, tanpa menunggu API). Lampiran Switching/Gardu dimuat terpisah DI DALAM
  // modal (lazy) dengan status loading/error + tombol Coba Lagi — kegagalan lampiran
  // TIDAK PERNAH lagi menghalangi detail dasar.
  void _showDetailModal(Map<String, dynamic> item) {
    final kodeP0 = (item['kodeP0'] ?? '').toString();
    final status = (item['status'] ?? 'Menunggu').toString();

    // State lampiran — closure di luar builder agar bertahan saat StatefulBuilder rebuild
    Map<String, dynamic>? lampiranRes;
    String? lampiranError;
    var lampiranLoading = true;
    var lampiranStarted = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          Future<void> muatLampiran() async {
            try {
              final res = await ApiService.getLampiranPengecekanP0(kodeP0);
              if (!ctx.mounted) return;
              setSheetState(() {
                lampiranLoading = false;
                if (res['ok'] == true) {
                  lampiranRes = res;
                  lampiranError = null;
                } else {
                  lampiranError =
                      (res['error'] ?? 'Lampiran tidak tersedia').toString();
                }
              });
            } catch (e) {
              if (!ctx.mounted) return;
              setSheetState(() {
                lampiranLoading = false;
                lampiranError = 'timeout/jaringan — $e';
              });
            }
          }

          // Mulai fetch SEKALI saat sheet pertama dibangun
          if (!lampiranStarted) {
            lampiranStarted = true;
            muatLampiran();
          }

          final List switching = lampiranRes != null
              ? (lampiranRes!['switching'] ?? <dynamic>[])
              : <dynamic>[];
          final List gardu = lampiranRes != null
              ? (lampiranRes!['gardu'] ?? <dynamic>[])
              : <dynamic>[];

          return Container(
            height: MediaQuery.of(ctx).size.height * 0.88,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Detail Verifikasi P0',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              kodeP0,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF0284C7),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      _buildStatusChip(status),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      _buildSectionHeader(
                        Icons.info_outline,
                        '1. Informasi Pekerjaan',
                      ),
                      _buildDetailRow('Pekerjaan',
                          (item['namaPekerjaan'] ?? '-').toString()),
                      _buildDetailRow(
                        'Penyulang / Section',
                        _gabungPenyulangSection(item),
                      ),
                      _buildDetailRow(
                        'Hari / Tanggal',
                        '${item['hari'] ?? '-'}, ${_fmtTglId((item['tanggal'] ?? '').toString())}',
                      ),
                      _buildDetailRow(
                          'Tim', _timLabel((item['tim'] ?? '').toString())),
                      _buildDetailRow(
                          'Petugas', (item['petugas'] ?? '-').toString()),
                      _buildDetailRow(
                          'Daerah', (item['daerah'] ?? '-').toString()),
                      _buildDetailRow(
                          'Durasi', (item['durasi'] ?? '-').toString()),
                      _buildDetailRow('Jarak Antar P0',
                          (item['jarakAntarP0'] ?? '-').toString()),
                      _buildDetailRow('Jarak Closing',
                          (item['jarakClosing'] ?? '-').toString()),
                      _buildDetailRow(
                          'Koordinat', (item['koordinat'] ?? '-').toString()),
                      if (status != 'Menunggu') ...[
                        _buildDetailRow('Diputuskan oleh',
                            (item['approvedBy'] ?? '-').toString()),
                        _buildDetailRow('Tanggal Keputusan',
                            (item['timestampApprove'] ?? '-').toString()),
                        if ((item['point'] ?? '').toString().isNotEmpty)
                          _buildDetailRow(
                              'Point', (item['point'] ?? '-').toString()),
                        if ((item['alasanRejected'] ?? '')
                            .toString()
                            .isNotEmpty)
                          _buildDetailRow('Alasan Rejected',
                              (item['alasanRejected'] ?? '-').toString()),
                      ],
                      const SizedBox(height: 16),
                      _buildSectionHeader(
                          Icons.notes_rounded, '2. Catatan Inputan'),
                      const SizedBox(height: 6),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Text(
                          (item['catatan'] ?? '').toString().isNotEmpty
                              ? (item['catatan']).toString()
                              : 'Tidak ada catatan.',
                          style: TextStyle(
                            fontSize: 12,
                            color: (item['catatan'] ?? '').toString().isNotEmpty
                                ? const Color(0xFF0F172A)
                                : const Color(0xFF94A3B8),
                            fontStyle:
                                (item['catatan'] ?? '').toString().isNotEmpty
                                    ? FontStyle.normal
                                    : FontStyle.italic,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildSectionHeader(
                        Icons.photo_library_outlined,
                        '3. Tiga Foto Watermark P0',
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          _buildPhotoBox(
                              'Sebelum', item['fotoSebelum']?['thumb'],
                              height: 100),
                          const SizedBox(width: 8),
                          _buildPhotoBox(
                              'Pekerjaan', item['fotoPekerjaan']?['thumb'],
                              height: 100),
                          const SizedBox(width: 8),
                          _buildPhotoBox(
                              'Sesudah', item['fotoSesudah']?['thumb'],
                              height: 100),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _buildSectionHeader(
                        Icons.tune,
                        '4. Lampiran Pengecekan (Switching / Gardu)',
                      ),
                      const SizedBox(height: 8),
                      if (lampiranLoading)
                        _buildLampiranLoading()
                      else if (lampiranError != null)
                        _buildLampiranError(lampiranError!, () {
                          setSheetState(() {
                            lampiranLoading = true;
                            lampiranError = null;
                          });
                          muatLampiran();
                        })
                      else ...[
                        ...switching.map((s) => _buildSwitchingCard(s)),
                        ...gardu.map((g) => _buildGarduCard(g)),
                        if (switching.isEmpty && gardu.isEmpty)
                          _buildLampiranKosong(),
                      ],
                    ],
                  ),
                ),
                if (status == 'Menunggu')
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFFEF4444),
                              side: const BorderSide(color: Color(0xFFEF4444)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            onPressed: () {
                              Navigator.pop(ctx);
                              _showRejectDialog(kodeP0);
                            },
                            child: const Text(
                              'Tolak (Reject)',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            onPressed: () {
                              Navigator.pop(ctx);
                              _konfirmasiApprove(kodeP0);
                            },
                            child: const Text(
                              'Setujui (Approve)',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── Lampiran pengecekan: status loading / error (dgn Coba Lagi) / kosong ──
  Widget _buildLampiranLoading() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: const Row(
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          SizedBox(width: 10),
          Text(
            'Memuat data pengecekan...',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
        ],
      ),
    );
  }

  Widget _buildLampiranError(String pesan, VoidCallback onRetry) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.error_outline, size: 15, color: Color(0xFFDC2626)),
              SizedBox(width: 6),
              Text(
                'Data pengecekan gagal dimuat',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFDC2626),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            pesan,
            style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 30,
            child: OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 14),
              label: const Text('Coba Lagi', style: TextStyle(fontSize: 12)),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFDC2626),
                side: const BorderSide(color: Color(0xFFDC2626)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLampiranKosong() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: const Text(
        'Tidak ada data pengecekan Switching/Gardu untuk pekerjaan ini.',
        style: TextStyle(
          fontSize: 12,
          color: Color(0xFF94A3B8),
          fontStyle: FontStyle.italic,
        ),
      ),
    );
  }

  String _gabungPenyulangSection(Map<String, dynamic> item) {
    final penyulang = (item['penyulang'] ?? '').toString();
    final section = (item['section'] ?? '').toString();
    if (section.isEmpty) return penyulang.isEmpty ? '-' : penyulang;
    return '$penyulang / $section';
  }

  // ══════════ KOMPONEN UI ══════════

  Widget _buildStatusChip(String status) {
    Color bg, fg;
    IconData icon;
    switch (status) {
      case 'Approved':
        bg = const Color(0xFFDCFCE7);
        fg = const Color(0xFF15803D);
        icon = Icons.check_circle_outline_rounded;
        break;
      case 'Rejected':
        bg = const Color(0xFFFEE2E2);
        fg = const Color(0xFFB91C1C);
        icon = Icons.cancel_outlined;
        break;
      default:
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFFB45309);
        icon = Icons.access_time_rounded;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: fg),
          const SizedBox(width: 3),
          Text(
            status,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCell(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 9,
            letterSpacing: 0.4,
            color: Colors.grey.shade500,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value.isEmpty ? '-' : value,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  Widget _buildSectionHeader(IconData icon, String title) {
    return Row(
      children: [
        Icon(icon, size: 16, color: const Color(0xFF0284C7)),
        const SizedBox(width: 6),
        Text(
          title,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Color(0xFF334155),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // POPUP FOTO — ketuk thumbnail → tampil layar penuh + pinch-zoom (InteractiveViewer)
  void _showPhotoPopup(String url, String title) {
    // Thumbnail Drive default sz=w400 → minta resolusi lebih besar saat popup
    final bigUrl = url.replaceAll('sz=w400', 'sz=w1600');
    showDialog(
      context: context,
      barrierColor: Colors.black.withOpacity(0.92),
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(10),
        child: Stack(
          alignment: Alignment.center,
          children: [
            InteractiveViewer(
              maxScale: 5.0,
              child: Image.network(
                bigUrl,
                fit: BoxFit.contain,
                loadingBuilder: (context, child, progress) {
                  if (progress == null) return child;
                  return const SizedBox(
                    height: 120,
                    child: Center(
                      child: CircularProgressIndicator(color: Colors.white),
                    ),
                  );
                },
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.broken_image,
                  color: Colors.white,
                  size: 48,
                ),
              ),
            ),
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                color: Colors.black54,
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            Positioned(
              top: 0,
              right: 0,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 26),
                onPressed: () => Navigator.pop(ctx),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoBox(String title, String? url, {double height = 75}) {
    return Expanded(
      child: GestureDetector(
        // Ketuk foto → popup layar penuh (tidak ikut membuka detail card)
        onTap: (url != null && url.isNotEmpty)
            ? () => _showPhotoPopup(url, title)
            : null,
        child: Container(
          height: height,
          decoration: BoxDecoration(
            color: Colors.grey.shade200,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (url != null && url.isNotEmpty)
                Image.network(
                  url,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const Icon(Icons.broken_image),
                )
              else
                const Icon(Icons.image, color: Colors.grey),
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  color: Colors.black.withOpacity(0.65),
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Text(
                    title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Label kecil untuk kelompok metrik di dalam card lampiran (Rev malam 2 — tampilan lega).
  Widget _buildMiniLabel(String text) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 10,
        letterSpacing: 0.8,
        fontWeight: FontWeight.w700,
        color: Colors.grey.shade500,
      ),
    );
  }

  // Sel metrik ber-label (label kecil di atas, nilai tebal di bawah, latar tinted) — menggantikan
  // baris teks rapat agar lampiran lebih lega & mudah dibaca.
  Widget _buildMetricCell(String label, String value) {
    final v = value.trim();
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade500,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              v.isEmpty ? '-' : v,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // CARD SWITCHING (Rev malam 2): header berikon + chip jam, kelompok metrik ber-label
  // (Arus R/S/T, 4 Indikator), dan 6 FOTO pengecekan (Arus + Gangguan 1-5) dalam grid 3×2
  // — ketuk foto untuk popup zoom (memakai _showPhotoPopup yang sama dgn foto P0).
  Widget _buildSwitchingCard(dynamic s) {
    String str(String k) => (s[k] ?? '').toString().trim();
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFBAE6FD)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.electric_bolt_rounded,
                  size: 16, color: Color(0xFF0284C7)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  str('namaSwitching').isEmpty
                      ? 'Pengecekan Switching'
                      : str('namaSwitching'),
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0369A1)),
                ),
              ),
              if (str('jamPengecekan').isNotEmpty)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE0F2FE),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.schedule_rounded,
                          size: 11, color: Color(0xFF0284C7)),
                      const SizedBox(width: 3),
                      Text(
                        str('jamPengecekan'),
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0284C7)),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          if (str('penyulang').isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(str('penyulang'),
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ],
          const SizedBox(height: 12),
          _buildMiniLabel('ARUS (A)'),
          const SizedBox(height: 6),
          Row(
            children: [
              _buildMetricCell('R', str('arusR')),
              const SizedBox(width: 8),
              _buildMetricCell('S', str('arusS')),
              const SizedBox(width: 8),
              _buildMetricCell('T', str('arusT')),
            ],
          ),
          const SizedBox(height: 12),
          _buildMiniLabel('INDIKATOR'),
          const SizedBox(height: 6),
          Row(
            children: [
              _buildMetricCell('REMOTE', str('indikatorRemote')),
              const SizedBox(width: 8),
              _buildMetricCell('LOCAL', str('indikatorLocal')),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildMetricCell('PROTECTION', str('indicatorProtection')),
              const SizedBox(width: 8),
              _buildMetricCell('RECLOSE', str('indicatorReclose')),
            ],
          ),
          const SizedBox(height: 12),
          _buildMiniLabel('FOTO PENGECEKAN (6)'),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildPhotoBox('Arus', s['fotoArus']?['thumb'], height: 90),
              const SizedBox(width: 8),
              _buildPhotoBox('Gangguan 1', s['fotoG1']?['thumb'], height: 90),
              const SizedBox(width: 8),
              _buildPhotoBox('Gangguan 2', s['fotoG2']?['thumb'], height: 90),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildPhotoBox('Gangguan 3', s['fotoG3']?['thumb'], height: 90),
              const SizedBox(width: 8),
              _buildPhotoBox('Gangguan 4', s['fotoG4']?['thumb'], height: 90),
              const SizedBox(width: 8),
              _buildPhotoBox('Gangguan 5', s['fotoG5']?['thumb'], height: 90),
            ],
          ),
        ],
      ),
    );
  }

  // CARD GARDU (Rev malam 2): header berikon + chip jam ukur, konteks (penyulang/section/petugas),
  // Beban R/S/T/N dan Tegangan 6 nilai LENGKAP (R-S, R-T, S-T, R-N, S-N, T-N — sebelumnya hanya 3).
  Widget _buildGarduCard(dynamic g) {
    String str(String k) => (g[k] ?? '').toString().trim();
    final konteks = [
      if (str('penyulang').isNotEmpty)
        str('section').isEmpty
            ? str('penyulang')
            : '${str('penyulang')} / ${str('section')}',
      if (str('petugas').isNotEmpty) 'Petugas: ${str('petugas')}',
    ].join('  •  ');
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.electrical_services_rounded,
                  size: 16, color: Color(0xFFD97706)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Gardu ${str('noGardu').isEmpty ? '-' : str('noGardu')}',
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFFB45309)),
                ),
              ),
              if (str('jamUkur').isNotEmpty)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.schedule_rounded,
                          size: 11, color: Color(0xFFB45309)),
                      const SizedBox(width: 3),
                      Text(
                        str('jamUkur'),
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFB45309)),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          if (str('alamat').isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(str('alamat'),
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ],
          if (konteks.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(konteks,
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ],
          const SizedBox(height: 12),
          _buildMiniLabel('BEBAN UTAMA (A)'),
          const SizedBox(height: 6),
          Row(
            children: [
              _buildMetricCell('R', str('bebanR')),
              const SizedBox(width: 8),
              _buildMetricCell('S', str('bebanS')),
              const SizedBox(width: 8),
              _buildMetricCell('T', str('bebanT')),
              const SizedBox(width: 8),
              _buildMetricCell('N', str('bebanN')),
            ],
          ),
          const SizedBox(height: 12),
          _buildMiniLabel('TEGANGAN (V)'),
          const SizedBox(height: 6),
          Row(
            children: [
              _buildMetricCell('R-S', str('tegRS')),
              const SizedBox(width: 8),
              _buildMetricCell('R-T', str('tegRT')),
              const SizedBox(width: 8),
              _buildMetricCell('S-T', str('tegST')),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildMetricCell('R-N', str('tegRN')),
              const SizedBox(width: 8),
              _buildMetricCell('S-N', str('tegSN')),
              const SizedBox(width: 8),
              _buildMetricCell('T-N', str('tegTN')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildP0Card(Map<String, dynamic> item) {
    final status = (item['status'] ?? 'Menunggu').toString();
    final kodeP0 = (item['kodeP0'] ?? '').toString();
    final durasi = (item['durasi'] ?? '').toString();
    final jarakP0 = (item['jarakAntarP0'] ?? '').toString();
    final durasiJarak = [
      if (durasi.isNotEmpty) durasi,
      if (jarakP0.isNotEmpty) jarakP0,
    ].join(' • ');

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0.5,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _showDetailModal(item),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      kodeP0,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0284C7),
                      ),
                    ),
                  ),
                  _buildStatusChip(status),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '${item['hari'] ?? ''}, ${_fmtTglId((item['tanggal'] ?? '').toString())} • ${_timLabel((item['tim'] ?? '').toString())}',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 8),
              Text(
                (item['namaPekerjaan'] ?? '-').toString(),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _buildInfoCell(
                      'PENYULANG / SECTION',
                      _gabungPenyulangSection(item),
                    ),
                  ),
                  Expanded(
                    child: _buildInfoCell(
                      'PETUGAS LAPANGAN',
                      (item['petugas'] ?? '').toString(),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildInfoCell('DURASI / JARAK P0', durasiJarak),
                  ),
                  Expanded(
                    child: _buildInfoCell(
                      'JARAK CLOSING',
                      (item['jarakClosing'] ?? '').toString(),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              _buildInfoCell('CATATAN', (item['catatan'] ?? '').toString()),
              const SizedBox(height: 10),
              Row(
                children: [
                  _buildPhotoBox('Sebelum', item['fotoSebelum']?['thumb']),
                  const SizedBox(width: 6),
                  _buildPhotoBox('Pekerjaan', item['fotoPekerjaan']?['thumb']),
                  const SizedBox(width: 6),
                  _buildPhotoBox('Sesudah', item['fotoSesudah']?['thumb']),
                ],
              ),
              if (status == 'Menunggu') ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFEF4444),
                          side: const BorderSide(color: Color(0xFFEF4444)),
                          backgroundColor: const Color(0xFFFEE2E2),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        icon: const Icon(Icons.cancel_outlined, size: 16),
                        label: const Text(
                          'Reject',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        onPressed: () => _showRejectDialog(kodeP0),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        icon: const Icon(
                          Icons.check_circle_outline_rounded,
                          size: 16,
                          color: Colors.white,
                        ),
                        label: const Text(
                          'Approve',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        onPressed: () => _konfirmasiApprove(kodeP0),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
        elevation: 0.5,
        title: const Text(
          'Verifikasi P0',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 17,
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF0284C7)),
            onPressed: _cariData,
          ),
        ],
      ),
      body: Column(
        children: [
          // TAB STATUS + BADGE JUMLAH
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: _statusTabs.map((status) {
                final isSelected = _selectedStatus == status;
                final jumlah = _counts[status];
                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _selectedStatus = status);
                      if (_sudahCari) _fetchData();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFF0284C7)
                            : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        jumlah == null ? status : '$status ($jumlah)',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isSelected
                              ? Colors.white
                              : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          // FILTER TANGGAL (1 hari) + TOMBOL CARI (data hanya dimuat saat tombol ditekan)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Column(
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.calendar_today_rounded,
                      size: 14,
                      color: Color(0xFF0284C7),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Tanggal:',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(width: 6),
                    GestureDetector(
                      onTap: _pickDate,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE0F2FE),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _labelTanggal,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0284C7),
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Icon(
                              Icons.keyboard_arrow_down_rounded,
                              size: 16,
                              color: Color(0xFF0284C7),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const Spacer(),
                    if (!_isToday)
                      TextButton.icon(
                        onPressed: _kembaliKeHariIni,
                        icon: const Icon(Icons.today_rounded, size: 14),
                        label: const Text(
                          'Hari ini',
                          style: TextStyle(fontSize: 11),
                        ),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF0284C7),
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                // TOMBOL CARI — satu-satunya pemicu muat data saat pertama masuk halaman
                SizedBox(
                  width: double.infinity,
                  height: 38,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0284C7),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    icon: const Icon(
                      Icons.search_rounded,
                      size: 18,
                      color: Colors.white,
                    ),
                    label: const Text(
                      'Cari',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    onPressed: _cariData,
                  ),
                ),
              ],
            ),
          ),
          // DAFTAR CARD
          Expanded(
            child: !_sudahCari
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'Pilih tanggal lalu tekan tombol Cari untuk memuat data. Halaman sengaja dibuka kosong agar tidak membebani server.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 12,
                          height: 1.5,
                        ),
                      ),
                    ),
                  )
                : _isLoading
                    ? const CustomLoadingWidget(
                        message: 'Memuat data verifikasi...',
                      )
                    : _listP0.isEmpty
                        ? Center(
                            child: Text(
                              'Tidak ada data "$_selectedStatus" pada $_labelTanggal',
                              style: const TextStyle(color: Color(0xFF94A3B8)),
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _fetchData,
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _listP0.length,
                              itemBuilder: (ctx, i) => _buildP0Card(_listP0[i]),
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
