import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_colors.dart';
import '../services/api_service.dart';
import '../widgets/custom_loading_widget.dart';

// Laporan UP3 / UIW (Rev 19 Agu 2026 malam) — data dari sheet "Teknik_Laporan Harian"
// (1 baris per tanggal): kolom G = Laporan UP3, kolom H = Laporan UIW, kolom C..F = input C4A.
// Tab 1 UIW: ROW 01-04, Hartek, Inspeksi Jaringan. Tab 2 UP3: sama + Inspeksi Gardu.
class LaporanUp3UiwScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const LaporanUp3UiwScreen({super.key, required this.sesi});

  @override
  State<LaporanUp3UiwScreen> createState() => _LaporanUp3UiwScreenState();
}

class _LaporanUp3UiwScreenState extends State<LaporanUp3UiwScreen> {
  bool _isLoading = true;
  String? _errorMessage;

  Map<String, dynamic> _c4a = {};
  Map<String, dynamic> _statusTim = {};
  String _waUiw = '';
  String _waUp3 = '';
  bool _editable = true;
  late String _tanggal;

  static const List<String> _timUiw = [
    'ROW 01',
    'ROW 02',
    'ROW 03',
    'ROW 04',
    'Hartek',
    'Inspeksi Jaringan',
  ];
  static const List<String> _timUp3 = [
    'ROW 01',
    'ROW 02',
    'ROW 03',
    'ROW 04',
    'Hartek',
    'Inspeksi Jaringan',
    'Inspeksi Gardu',
  ];

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
    _tanggal = _todayString();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final res = await ApiService.getLaporanUp3Uiw(tanggal: _tanggal);
      if (!mounted) return;
      if (res['ok'] == true) {
        setState(() {
          _c4a = Map<String, dynamic>.from(res['c4a'] ?? {});
          _statusTim = Map<String, dynamic>.from(res['statusTim'] ?? {});
          _waUiw = (res['waUiw'] ?? '').toString();
          _waUp3 = (res['waUp3'] ?? '').toString();
          _editable = res['editable'] == true;
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage =
              (res['message'] ?? res['error'] ?? 'Gagal memuat laporan')
                  .toString();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Koneksi bermasalah: $e';
        _isLoading = false;
      });
    }
  }

  // Kirim teks WA — pola sama dgn card Laporan Harian ROW (whatsapp:// lalu fallback web).
  Future<void> _kirimPesanWa(String waText) async {
    if (waText.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Teks laporan WA belum tersedia')),
      );
      return;
    }
    final encodedText = Uri.encodeComponent(waText);
    final waUri = Uri.parse('whatsapp://send?text=$encodedText');
    final webWaUri =
        Uri.parse('https://api.whatsapp.com/send?text=$encodedText');
    try {
      if (await canLaunchUrl(waUri)) {
        await launchUrl(waUri);
      } else if (await canLaunchUrl(webWaUri)) {
        await launchUrl(webWaUri, mode: LaunchMode.externalApplication);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Aplikasi WhatsApp tidak ditemukan')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal membuka WhatsApp: $e')),
      );
    }
  }

  // C4A terisi bila salah satu kolom C..F berisi → tombol + berubah jadi edit.
  bool get _c4aTerisi => ['penyulang', 'realisasi', 'temuan', 'eksekusi']
      .any((k) => (_c4a[k] ?? '').toString().trim().isNotEmpty);

  void _bukaFormC4A() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FormC4aSheet(
        token: _token,
        tanggal: _tanggal,
        c4a: _c4a,
        onSaved: _fetchData,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppColors.neutral100,
        appBar: AppBar(
          backgroundColor: AppColors.navy700,
          foregroundColor: Colors.white,
          iconTheme: const IconThemeData(color: Colors.white),
          elevation: 0,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Laporan UP3 / UIW',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              Text(
                'Hari ini • $_tanggal',
                style: const TextStyle(fontSize: 12, color: Colors.white70),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: Colors.white),
              onPressed: _fetchData,
            ),
          ],
          bottom: const TabBar(
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            tabs: [
              Tab(text: 'Laporan UIW'),
              Tab(text: 'Laporan UP3'),
            ],
          ),
        ),
        body: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const CustomLoadingWidget(message: 'Memuat laporan UP3 / UIW...');
    }
    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded,
                  size: 48, color: Colors.redAccent),
              const SizedBox(height: 12),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.navy700,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: _fetchData,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      );
    }
    return TabBarView(
      children: [
        // TAB 1 — UIW (pesan dari kolom H)
        ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildInfoBanner(
                'Pesan WA dari kolom H (Laporan UIW) • Teknik_Laporan Harian • hari ini ($_tanggal).'),
            const SizedBox(height: 12),
            ..._timUiw
                .map((t) => _buildTimCard(t, _waUiw, bisaInputC4A: false)),
          ],
        ),
        // TAB 2 — UP3 (pesan dari kolom G) + input C4A
        ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildInfoBanner(
                'Pesan WA dari kolom G (Laporan UP3) • hari ini ($_tanggal). Ikon + / pensil = input C4A (kolom C–F).'),
            const SizedBox(height: 12),
            ..._timUp3.map((t) => _buildTimCard(t, _waUp3, bisaInputC4A: true)),
          ],
        ),
      ],
    );
  }

  Widget _buildInfoBanner(String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.navy700.withOpacity(0.06),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline_rounded,
              size: 14, color: AppColors.navy700),
          const SizedBox(width: 6),
          Expanded(
            child: Text(text,
                style: const TextStyle(fontSize: 11, color: AppColors.navy700)),
          ),
        ],
      ),
    );
  }

  Widget _buildTimCard(String tim, String waText,
      {required bool bisaInputC4A}) {
    final sudahAda = _statusTim[tim] == true;
    final siapKirim = waText.trim().isNotEmpty;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  tim,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.navy700,
                  ),
                ),
              ),
              if (bisaInputC4A && _editable)
                IconButton(
                  tooltip: _c4aTerisi ? 'Edit input C4A' : 'Tambah input C4A',
                  icon: Icon(
                    _c4aTerisi ? Icons.edit_rounded : Icons.add_rounded,
                    color: AppColors.navy700,
                  ),
                  onPressed: _bukaFormC4A,
                ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: sudahAda
                      ? const Color(0xFFECFDF5)
                      : const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      sudahAda
                          ? Icons.check_circle_rounded
                          : Icons.cancel_rounded,
                      size: 12,
                      color: sudahAda
                          ? const Color(0xFF059669)
                          : const Color(0xFFDC2626),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      sudahAda ? 'Sudah ada laporan' : 'Belum ada laporan',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: sudahAda
                            ? const Color(0xFF059669)
                            : const Color(0xFFDC2626),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: siapKirim
                    ? const Color(0xFF25D366)
                    : const Color(0xFFE2E8F0),
                foregroundColor:
                    siapKirim ? Colors.white : const Color(0xFF94A3B8),
                disabledBackgroundColor: const Color(0xFFE2E8F0),
                disabledForegroundColor: const Color(0xFF94A3B8),
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: siapKirim ? () => _kirimPesanWa(waText) : null,
              icon: Icon(
                siapKirim ? Icons.send_rounded : Icons.lock_clock_rounded,
                size: 15,
              ),
              label: Text(
                siapKirim ? 'Kirim Pesan ke WA' : 'Laporan belum tergenerate',
                style:
                    const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ==========================================
// FORM INPUT C4A (kolom C..F Teknik_Laporan Harian)
// Simpan -> simpanMobileLaporanC4A -> server menulis C..F + me-regenerate
// kolom G (UP3) & H (UIW), lalu layar memuat ulang teks terbaru.
// ==========================================
class _FormC4aSheet extends StatefulWidget {
  final String token;
  final String tanggal;
  final Map<String, dynamic> c4a;
  final VoidCallback onSaved;

  const _FormC4aSheet({
    required this.token,
    required this.tanggal,
    required this.c4a,
    required this.onSaved,
  });

  @override
  State<_FormC4aSheet> createState() => _FormC4aSheetState();
}

class _FormC4aSheetState extends State<_FormC4aSheet> {
  late final TextEditingController _penyulangCtrl;
  late final TextEditingController _realisasiCtrl;
  late final TextEditingController _temuanCtrl;
  late final TextEditingController _eksekusiCtrl;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _penyulangCtrl =
        TextEditingController(text: (widget.c4a['penyulang'] ?? '').toString());
    _realisasiCtrl =
        TextEditingController(text: (widget.c4a['realisasi'] ?? '').toString());
    _temuanCtrl =
        TextEditingController(text: (widget.c4a['temuan'] ?? '').toString());
    _eksekusiCtrl =
        TextEditingController(text: (widget.c4a['eksekusi'] ?? '').toString());
  }

  @override
  void dispose() {
    _penyulangCtrl.dispose();
    _realisasiCtrl.dispose();
    _temuanCtrl.dispose();
    _eksekusiCtrl.dispose();
    super.dispose();
  }

  Future<void> _simpan() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final res = await ApiService.simpanLaporanC4A(
        token: widget.token,
        tanggal: widget.tanggal,
        penyulang: _penyulangCtrl.text.trim(),
        realisasi: _realisasiCtrl.text.trim(),
        temuan: _temuanCtrl.text.trim(),
        eksekusi: _eksekusiCtrl.text.trim(),
      );
      if (!mounted) return;
      if (res['ok'] == true) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Tersimpan — laporan UIW & UP3 di-generate ulang dari data ini.'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
        widget.onSaved();
      } else {
        setState(() {
          _error = (res['message'] ?? 'Gagal menyimpan data').toString();
          _saving = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Koneksi bermasalah: $e';
        _saving = false;
      });
    }
  }

  Widget _field(String label, TextEditingController ctrl,
      {String? hint, int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        TextField(
          controller: ctrl,
          maxLines: maxLines,
          decoration: InputDecoration(
            hintText: hint,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        top: 14,
        left: 20,
        right: 20,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Input C4A — Laporan Hari Ini',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.navy700,
                        ),
                      ),
                      Text(
                        'Kolom C–F • Teknik_Laporan Harian • ${widget.tanggal}',
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const Divider(height: 20),
            if (_error != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_error!,
                    style: const TextStyle(color: Colors.red, fontSize: 12)),
              ),
              const SizedBox(height: 12),
            ],
            _field('Penyulang (kolom C)', _penyulangCtrl,
                hint: 'Mis. Paku / LBS Air Sampik'),
            _field('Panjang kmS Inspeksi (kolom D)', _realisasiCtrl,
                hint: 'Mis. 4,6'),
            _field('Temuan (kolom E)', _temuanCtrl,
                hint: 'Mis. 2 Titik', maxLines: 2),
            _field('Eksekusi (kolom F)', _eksekusiCtrl,
                hint: 'Mis. 1 Titik', maxLines: 2),
            const SizedBox(height: 4),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.navy700,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: _saving ? null : _simpan,
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.save_rounded,
                        size: 18, color: Colors.white),
                label: Text(
                  _saving ? 'Menyimpan...' : 'Simpan & Generate Ulang Laporan',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
