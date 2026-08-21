import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_colors.dart';
import '../db/repositories/header_repository.dart';
import '../widgets/custom_loading_widget.dart';

// Laporan Harian (Rev 21 Agu 2026) — db_Global_Header dibaca lewat
// HeaderRepository (Project Dart): server dulu → cache SQLite (global_header)
// → fallback offline (banner oranye). Layar tidak memanggil API langsung.
class LaporanHarianScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String? targetSubTim;
  final String? targetTim;

  const LaporanHarianScreen({
    super.key,
    required this.sesi,
    this.targetSubTim,
    this.targetTim,
  });

  @override
  State<LaporanHarianScreen> createState() => _LaporanHarianScreenState();
}

class _LaporanHarianScreenState extends State<LaporanHarianScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _laporanList = [];
  bool _offline = false; // true bila data berasal dari cache SQLite

  String get _activeSubTim =>
      widget.targetSubTim ??
      widget.sesi['subTim'] ??
      widget.sesi['tim'] ??
      'ROW 01';

  String _getTodayString() {
    final now = DateTime.now();
    final y = now.year.toString().padLeft(4, '0');
    final m = now.month.toString().padLeft(2, '0');
    final d = now.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  @override
  void initState() {
    super.initState();
    _fetchLaporanHarian();
  }

  Future<void> _fetchLaporanHarian() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final token = widget.sesi['token'] ?? '';
      // Project Dart: lewat HeaderRepository — server dulu, hasilnya di-cache
      // ke SQLite (global_header); saat offline, baca cache lokal.
      final response = await HeaderRepository().bacaLaporanHarian(
        token: token,
        subTim: _activeSubTim,
        tanggal: _getTodayString(),
      );

      if (response['success'] == true) {
        setState(() {
          _laporanList = response['data'] ?? [];
          _offline = response['offline'] == true;
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = response['message'] ?? 'Gagal memuat data laporan';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Koneksi bermasalah: $e';
        _isLoading = false;
      });
    }
  }

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

  bool _isFilled(dynamic val) {
    if (val == null) return false;
    final str = val.toString().trim();
    return str.isNotEmpty && str != '-' && str != 'null';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
              'Laporan Harian',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white),
            ),
            Text(
              _activeSubTim,
              style: const TextStyle(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            onPressed: _fetchLaporanHarian,
          ),
        ],
      ),
      body: _buildBody(),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.navy700,
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Form input laporan harian baru akan dibuka')),
          );
        },
        child: const Icon(Icons.add_rounded, size: 28, color: Colors.white),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const CustomLoadingWidget(
          message: 'Memuat data laporan harian...');
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
                onPressed: _fetchLaporanHarian,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      );
    }

    if (_laporanList.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_busy_rounded,
                size: 56, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text(
              'Belum ada laporan hari ini untuk $_activeSubTim',
              style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Banner mode offline — data berasal dari cache SQLite di HP
        if (_offline)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF7ED),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFFED7AA)),
            ),
            child: const Text(
              'Mode offline — menampilkan data yang tersimpan di HP. Data diperbarui otomatis saat online.',
              style: TextStyle(fontSize: 11, color: Color(0xFF9A3412)),
            ),
          ),

        // Summary Header Card
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.navy700,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: AppColors.navy700.withOpacity(0.2),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'LAPORAN HARI INI',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.white.withOpacity(0.7),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${_laporanList.length} Data',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
              Container(
                height: 36,
                width: 1,
                color: Colors.white.withOpacity(0.2),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'TIM LAPANGAN',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.white.withOpacity(0.7),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _activeSubTim,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // List Laporan Items
        ..._laporanList.map((item) => _buildLaporanCard(item)),
      ],
    );
  }

  Widget _buildLaporanCard(Map<String, dynamic> item) {
    final kodeHeader = item['kodeHeader'] ?? '-';
    final hari = item['hari'] ?? '';
    final tanggal = item['tanggal'] ?? '-';
    final subTim = item['subTim'] ?? _activeSubTim;
    final koorAwal = item['koordinatAwal'] ?? '-';
    final koorAkhir = item['koordinatAkhir'] ?? '-';
    final kmAwal = item['kmAwal'] ?? '-';
    final kmAkhir = item['kmAkhir'] ?? '-';
    final kendala = item['kendala'] ?? '';
    final waText = item['waText'] ?? '';
    final inputBy = item['inputBy'] ?? '-';

    final rawStatusWa = (item['statusTextWa'] ?? '').toString().trim();
    final isStatusUpdate = rawStatusWa.toLowerCase() == 'update';
    final isKmAwalFilled = _isFilled(kmAwal);
    final isKmAkhirFilled = _isFilled(kmAkhir);
    final isKoorAwalFilled = _isFilled(koorAwal);
    final isKoorAkhirFilled = _isFilled(koorAkhir);

    final bool isReadyToSendWa = isStatusUpdate &&
        isKmAwalFilled &&
        isKmAkhirFilled &&
        isKoorAwalFilled &&
        isKoorAkhirFilled;

    String statusDisplay;
    if (isReadyToSendWa) {
      statusDisplay = 'Update';
    } else if (!isStatusUpdate) {
      statusDisplay = 'Proses Sinkron Data';
    } else {
      statusDisplay = 'Menunggu KM & Koordinat';
    }

    return InkWell(
      onTap: () => _showDetailTextWaModal(item, isReadyToSendWa),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
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
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.navy700.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    subTim,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.navy700,
                    ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isReadyToSendWa
                        ? const Color(0xFFECFDF5)
                        : const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isReadyToSendWa
                            ? Icons.check_circle_rounded
                            : Icons.sync_rounded,
                        size: 12,
                        color: isReadyToSendWa
                            ? const Color(0xFF059669)
                            : const Color(0xFFD97706),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        statusDisplay,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isReadyToSendWa
                              ? const Color(0xFF059669)
                              : const Color(0xFFD97706),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),

            Text(
              kodeHeader,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.navy700,
              ),
            ),
            const SizedBox(height: 10),

            // Metadata Grid (Tanpa Baris Kelengkapan)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFF1F5F9)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildMetaText('Hari / Tanggal', '$hari, $tanggal'),
                      _buildMetaText('Petugas Input', '$inputBy'),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildMetaText('KM Awal / Akhir', '$kmAwal / $kmAkhir'),
                      _buildMetaText('Koor. Awal', '$koorAwal'),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildMetaText('Koor. Akhir', '$koorAkhir'),
                    ],
                  ),
                ],
              ),
            ),

            if (kendala.toString().trim().isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFEF3C7)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline_rounded,
                        size: 14, color: Color(0xFFD97706)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        kendala,
                        style: const TextStyle(
                            fontSize: 11, color: Color(0xFF92400E)),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isReadyToSendWa
                          ? const Color(0xFF25D366)
                          : const Color(0xFFE2E8F0),
                      foregroundColor: isReadyToSendWa
                          ? Colors.white
                          : const Color(0xFF94A3B8),
                      disabledBackgroundColor: const Color(0xFFE2E8F0),
                      disabledForegroundColor: const Color(0xFF94A3B8),
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: isReadyToSendWa
                        ? () => _kirimPesanWa(
                            waText.isNotEmpty ? waText : kodeHeader)
                        : null,
                    icon: Icon(
                      isReadyToSendWa
                          ? Icons.send_rounded
                          : Icons.lock_clock_rounded,
                      size: 15,
                    ),
                    label: Text(
                      isReadyToSendWa
                          ? 'Kirim Pesan ke WA'
                          : 'Menunggu KM, Koordinat & Sync',
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showDetailTextWaModal(Map<String, dynamic> item, bool isReadyToSendWa) {
    final kodeHeader = item['kodeHeader'] ?? '-';
    final subTim = item['subTim'] ?? _activeSubTim;
    final waText = (item['waText'] ?? '').toString().trim();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.75,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
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
                        Text(
                          kodeHeader,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.navy700,
                          ),
                        ),
                        Text(
                          'Detail Pesan WA — $subTim',
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
              const Divider(height: 24),
              Expanded(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: SingleChildScrollView(
                    child: SelectableText(
                      waText.isNotEmpty
                          ? waText
                          : '(Teks format WhatsApp belum ter-generate / masih proses sinkronisasi)',
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.5,
                        fontFamily: 'monospace',
                        color: waText.isNotEmpty
                            ? const Color(0xFF1E293B)
                            : Colors.grey.shade500,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isReadyToSendWa
                        ? const Color(0xFF25D366)
                        : Colors.grey.shade400,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: isReadyToSendWa
                      ? () {
                          Navigator.pop(context);
                          _kirimPesanWa(
                              waText.isNotEmpty ? waText : kodeHeader);
                        }
                      : null,
                  icon: const Icon(Icons.send_rounded, size: 18),
                  label: Text(
                    isReadyToSendWa
                        ? 'Kirim ke WhatsApp'
                        : 'Syarat WA Belum Lengkap',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMetaText(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            color: Color(0xFF64748B),
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontSize: 11,
            color: Color(0xFF1E293B),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
