import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/accurate_location_service.dart';
import '../widgets/accurate_gps_button.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_colors.dart';
import '../services/api_service.dart';
import '../db/repositories/master_repository.dart';
import '../widgets/custom_loading_widget.dart';

// Eksekusi ROW (Rev 21 Agu 2026) — SISTEM PROGRES 3 TAHAP:
// input baru cukup FOTO SEBELUM → card chip amber "1/3"; lanjut FOTO PEKERJAAN
// dari detail card → chip biru "2/3"; FOTO SESUDAH → chip hijau "3/3 • Selesai".
// Tahap diturunkan dari kelengkapan foto (tanpa kolom status baru).
class EksekusiRowScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String? targetSubTim;
  final String? targetTim;

  const EksekusiRowScreen({
    super.key,
    required this.sesi,
    this.targetSubTim,
    this.targetTim,
  });

  @override
  State<EksekusiRowScreen> createState() => _EksekusiRowScreenState();
}

class _EksekusiRowScreenState extends State<EksekusiRowScreen> {
  bool _isLoading =
      false; // tidak auto-load untuk Admin/Super User — menunggu tanggal dimasukkan
  String? _errorMessage;
  List<dynamic> _eksekusiList = [];

  // Tanggal yang sedang ditampilkan.
  // - Admin/Super User: NULL saat halaman dibuka — WAJIB masukkan tanggal
  //   dahulu untuk melihat data (meminimalisir beban server).
  // - Role user (petugas biasa): selalu today() agar data langsung tampil.
  DateTime? _tanggalDipilih;

  // true setelah pencarian pertama (tanggal dimasukkan / tombol "Cari"):
  // halaman dibuka KOSONG agar tidak membebani server; setelah itu ganti
  // tanggal ikut memuat ulang otomatis.
  bool _sudahCari = false;

  static const List<String> _namaBulan = [
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

  String get _activeSubTim =>
      widget.targetSubTim ??
      widget.sesi['subTim'] ??
      widget.sesi['tim'] ??
      'ROW 01';

  // Filter tanggal HANYA untuk role Admin & Super User — role user (petugas
  // biasa) selalu melihat hari ini (today) dan datanya langsung tampil.
  bool get _bisaFilterTanggal {
    final role = (widget.sesi['role'] ?? '').toString().toLowerCase();
    return role == 'admin' || role == 'super user';
  }

  String _formatApiTanggal(DateTime t) {
    final y = t.year.toString().padLeft(4, '0');
    final m = t.month.toString().padLeft(2, '0');
    final d = t.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  bool get _adalahHariIni {
    final t = _tanggalDipilih;
    if (t == null) return false;
    final now = DateTime.now();
    return t.year == now.year && t.month == now.month && t.day == now.day;
  }

  // Label ramah untuk subtitle AppBar & kartu ringkasan
  String get _labelTanggal {
    final t = _tanggalDipilih;
    if (t == null) return 'Pilih Tanggal';
    return _adalahHariIni
        ? 'Hari Ini'
        : '${t.day} ${_namaBulan[t.month - 1]} ${t.year}';
  }

  // Label chip tanggal di bar filter (kosong = wajib pilih tanggal dulu)
  String get _labelTanggalChip {
    final t = _tanggalDipilih;
    if (t == null) return 'Pilih Tanggal';
    return '${t.day} ${_namaBulan[t.month - 1]} ${t.year}';
  }

  // ═══ SISTEM PROGRES 3 TAHAP (Rev 21 Agu 2026) ═══
  // Tahap diturunkan dari kelengkapan foto: 1 = sebelum, 2 = pekerjaan,
  // 3 = sesudah (SELESAI). 0 = belum ada foto sama sekali (data lama).
  int _tahapOf(Map<String, dynamic> item) {
    final s = (item['fotoSebelumUrl'] ?? '').toString().trim().isNotEmpty;
    final p = (item['fotoPekerjaanUrl'] ?? '').toString().trim().isNotEmpty;
    final d = (item['fotoSesudahUrl'] ?? '').toString().trim().isNotEmpty;
    if (d) return 3;
    if (p) return 2;
    if (s) return 1;
    return 0;
  }

  String _labelTahap(int t) => const [
        'Belum Ada Foto',
        'Foto Sebelum',
        'Foto Pekerjaan',
        'Selesai',
      ][t];

  Color _warnaTahap(int t) => const [
        Color(0xFF94A3B8), // abu — belum ada foto
        Color(0xFFD97706), // amber — tahap 1
        Color(0xFF0284C7), // biru — tahap 2
        Color(0xFF059669), // hijau — selesai
      ][t];

  // Buka sheet lanjut progres (tahap 2 / 3) dari detail card.
  void _lanjutProgres(Map<String, dynamic> item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _LanjutProgresSheet(
        sesi: widget.sesi,
        item: item,
        onSuccess: _fetchEksekusiList,
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    if (_bisaFilterTanggal) {
      // Admin/Super User: halaman dibuka KOSONG tanpa tanggal default —
      // wajib masukkan tanggal dahulu untuk melihat data (hemat server).
      _tanggalDipilih = null;
    } else {
      // Role user: set tanggal today() agar data langsung tampil.
      _tanggalDipilih = DateTime.now();
      _fetchEksekusiList();
    }
  }

  // Pemilih tanggal (khusus Admin/Super User). Batas kanan = hari ini,
  // karena laporan harian tidak punya data masa depan.
  Future<void> _pilihTanggal() async {
    final dipilih = await showDatePicker(
      context: context,
      initialDate: _tanggalDipilih ?? DateTime.now(),
      firstDate: DateTime(2025, 1, 1),
      lastDate: DateTime.now(),
    );
    if (dipilih == null) return;
    setState(() {
      _tanggalDipilih = dipilih;
      _sudahCari = true;
    });
    // Masukkan tanggal = pemicu melihat data: pencarian pertama maupun ganti
    // tanggal berikutnya sama-sama langsung memuat dari server.
    _fetchEksekusiList();
  }

  // TOMBOL CARI — bila tanggal belum diisi, wajib masukkan tanggal dulu.
  void _cariData() {
    if (_tanggalDipilih == null) {
      _pilihTanggal();
      return;
    }
    setState(() => _sudahCari = true);
    _fetchEksekusiList();
  }

  Future<void> _fetchEksekusiList() async {
    final tgl = _tanggalDipilih;
    if (tgl == null) return; // belum masukkan tanggal — jangan query server
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final token = widget.sesi['token'] ?? '';
      final response = await ApiService.getEksekusiRow(
        token: token,
        subTim: _activeSubTim,
        tanggal: _formatApiTanggal(tgl),
      );

      if (response['success'] == true) {
        setState(() {
          _eksekusiList = response['data'] ?? [];
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = response['message'] ?? 'Gagal memuat data eksekusi';
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

  void _openInputForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FormEksekusiSheet(
        sesi: widget.sesi,
        subTim: _activeSubTim,
        onSuccess: () {
          _fetchEksekusiList();
        },
      ),
    );
  }

  void _openMaps(String koordinat) async {
    if (koordinat.trim().isEmpty || koordinat == '-') return;
    final cleanKoor = koordinat.replaceAll(' ', '');
    final uri =
        Uri.parse('https://www.google.com/maps/search/?api=1&query=$cleanKoor');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  // ═══ BAR FILTER TANGGAL + STATUS SINKRON (khusus Admin/Super User) ═══
  // Bar putih di bawah AppBar — chip tanggal (wajib diisi dulu), STATUS
  // SINKRON sebaris, lalu tombol CARI full-width.
  Widget _buildFilterBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.calendar_today_rounded,
                  size: 14, color: AppColors.navy700),
              const SizedBox(width: 6),
              const Text(
                'Tanggal:',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              const SizedBox(width: 6),
              GestureDetector(
                onTap: _pilihTanggal,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.navy700.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _labelTanggalChip,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.navy700,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.keyboard_arrow_down_rounded,
                          size: 16, color: AppColors.navy700),
                    ],
                  ),
                ),
              ),
              const Spacer(),
              _buildSyncChip(),
            ],
          ),
          const SizedBox(height: 8),
          // TOMBOL CARI — pemicu muat data (konsep P0: hemat server)
          SizedBox(
            width: double.infinity,
            height: 38,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy700,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              icon: const Icon(Icons.search_rounded,
                  size: 18, color: Colors.white),
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
    );
  }

  // ═══ CHIP STATUS SINKRON — sebaris dengan tanggal ═══
  // Update (hijau) = data baru saja ditarik dari server • Proses Sync (amber)
  // = sedang memuat • Belum Update (merah) = belum pernah cari / gagal.
  Widget _buildSyncChip() {
    final String label;
    final Color warna;
    final Widget ikon;

    if (_isLoading) {
      label = 'Proses Sync';
      warna = const Color(0xFFD97706); // amber
      ikon = const SizedBox(
        width: 10,
        height: 10,
        child: CircularProgressIndicator(strokeWidth: 1.5),
      );
    } else if (_sudahCari && _errorMessage == null) {
      label = 'Update';
      warna = const Color(0xFF059669); // hijau
      ikon = const Icon(Icons.check_circle_rounded,
          size: 11, color: Color(0xFF059669));
    } else {
      label = 'Belum Update';
      warna = const Color(0xFFDC2626); // merah
      ikon = const Icon(Icons.sync_rounded, size: 11, color: Color(0xFFDC2626));
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: warna.withOpacity(0.10),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: warna, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ikon,
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: warna,
            ),
          ),
        ],
      ),
    );
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
              'Eksekusi Pekerjaan',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white),
            ),
            Text(
              '$_activeSubTim • $_labelTanggal',
              style: const TextStyle(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            // Admin/Super User: refresh = jalankan Cari (konsep P0)
            onPressed: _bisaFilterTanggal ? _cariData : _fetchEksekusiList,
          ),
        ],
      ),
      body: Column(
        children: [
          // Bar filter tanggal + status sinkron + tombol Cari — HANYA
          // untuk Admin & Super User
          if (_bisaFilterTanggal) _buildFilterBar(),
          Expanded(child: _buildBody()),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.amber600,
        foregroundColor: AppColors.navy950,
        onPressed: _openInputForm,
        icon: const Icon(Icons.add_a_photo_rounded),
        label: const Text('Input Eksekusi',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildBody() {
    // Tampilan Admin/Super User dibuka KOSONG sampai tanggal dimasukkan
    if (_bisaFilterTanggal && !_sudahCari) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Masukkan tanggal terlebih dahulu untuk melihat data. Halaman sengaja dibuka kosong agar tidak membebani server.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 12,
              height: 1.5,
            ),
          ),
        ),
      );
    }

    if (_isLoading) {
      return const CustomLoadingWidget(message: 'Memuat data eksekusi...');
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
              Text(_errorMessage!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: Colors.grey)),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.navy700,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: _bisaFilterTanggal ? _cariData : _fetchEksekusiList,
                icon: const Icon(Icons.refresh_rounded,
                    size: 18, color: Colors.white),
                label: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      );
    }

    if (_eksekusiList.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.nature_people_rounded,
                size: 56, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text(
                'Belum ada eksekusi pekerjaan untuk $_activeSubTim ($_labelTanggal)',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Summary Header Card — aksen gradasi navy agar lebih hidup
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.navy700, AppColors.navy950],
            ),
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: AppColors.navy700.withOpacity(0.25),
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
                    'TOTAL ${_labelTanggal.toUpperCase()}',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.white.withOpacity(0.7),
                        letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 2),
                  Text('${_eksekusiList.length} Titik',
                      style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white)),
                ],
              ),
              Container(
                  height: 36, width: 1, color: Colors.white.withOpacity(0.2)),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'TANGGAL DATA',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.white.withOpacity(0.7),
                        letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(Icons.event_rounded,
                          size: 14, color: AppColors.cyan600),
                      const SizedBox(width: 4),
                      Text(_labelTanggal,
                          style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.white)),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ..._eksekusiList.map((item) => _buildCardEksekusi(item)),
      ],
    );
  }

  Widget _buildCardEksekusi(Map<String, dynamic> item) {
    final kodeEksekusi = item['kodeEksekusi'] ?? '-';
    final penyulang = item['penyulang'] ?? '-';
    final section = item['section'] ?? '-';
    final koorPekerjaan =
        item['koordinatPekerjaan'] ?? item['koordinatTiang'] ?? '-';
    final diameter = item['diameter'] ?? 0;
    final jenis = item['jenisPekerjaan'] ?? '-';
    final fotoSbl = item['fotoSebelumUrl'] ?? '';
    final fotoPkj = item['fotoPekerjaanUrl'] ?? '';
    final fotoSsd = item['fotoSesudahUrl'] ?? '';
    final inputBy = item['inputOleh'] ?? '-';

    // Sistem progres: tahap & warna indikator dari kelengkapan foto
    final tahap = _tahapOf(item);
    final warnaTahap = _warnaTahap(tahap);

    return InkWell(
      onTap: () => _showDetailModal(item),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          // Garis aksen warna tahap di tepi kiri card
          border: Border(
            left: BorderSide(color: warnaTahap, width: 4),
            top: BorderSide(color: Colors.grey.shade200),
            right: BorderSide(color: Colors.grey.shade200),
            bottom: BorderSide(color: Colors.grey.shade200),
          ),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 6,
                offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    kodeEksekusi,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: AppColors.navy700),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                // Chip tahap progres — warna berbeda per tahap
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: warnaTahap.withOpacity(0.10),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: warnaTahap, width: 1),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        tahap >= 3
                            ? Icons.check_circle_rounded
                            : Icons.timelapse_rounded,
                        size: 12,
                        color: warnaTahap,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$tahap/3 • ${_labelTahap(tahap)}',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: warnaTahap,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Info Grid dengan Safe Overflow
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 6,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Penyulang / Section',
                                style: TextStyle(
                                    fontSize: 10, color: Color(0xFF64748B))),
                            const SizedBox(height: 2),
                            Text(
                              '$penyulang / $section',
                              style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF1E293B)),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 4,
                        child: InkWell(
                          onTap: () => _openMaps(koorPekerjaan),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text('Koordinat Pekerjaan',
                                  style: TextStyle(
                                      fontSize: 10, color: Color(0xFF64748B))),
                              const SizedBox(height: 2),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.location_on,
                                      size: 12, color: Color(0xFFEF4444)),
                                  const SizedBox(width: 2),
                                  Flexible(
                                    child: Text(
                                      koorPekerjaan,
                                      style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF0284C7)),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: _buildMetaText(
                            'Diameter & Jenis', '$diameter cm ($jenis)'),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('Petugas Input',
                                style: TextStyle(
                                    fontSize: 10, color: Color(0xFF64748B))),
                            const SizedBox(height: 2),
                            Text(inputBy,
                                style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF1E293B))),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // Progress bar 3 segmen — terisi mengikuti tahap
            Row(
              children: List.generate(3, (i) {
                final terisi = tahap > i;
                return Expanded(
                  child: Container(
                    height: 4,
                    margin: EdgeInsets.only(right: i < 2 ? 4 : 0),
                    decoration: BoxDecoration(
                      color: terisi ? warnaTahap : const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 10),

            // Foto Preview Row (3 Foto)
            Row(
              children: [
                Expanded(child: _buildFotoThumb('Sebelum', fotoSbl)),
                const SizedBox(width: 8),
                Expanded(child: _buildFotoThumb('Pekerjaan', fotoPkj)),
                const SizedBox(width: 8),
                Expanded(child: _buildFotoThumb('Sesudah', fotoSsd)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showDetailModal(Map<String, dynamic> item) {
    final tahap = _tahapOf(item);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        height: MediaQuery.of(context).size.height * 0.8,
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: ListView(
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Text(item['kodeEksekusi'] ?? '-',
                style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.navy700)),
            const Divider(height: 20),
            _buildDetailSection('1. Kode Pekerjaan', [
              _buildDetailItem('Kode Eksekusi', item['kodeEksekusi']),
              _buildDetailItem('Tanggal / Waktu',
                  '${item['hari'] ?? ''}, ${item['tanggal'] ?? ''} ${item['timestamp'] ?? ''}'),
            ]),
            const SizedBox(height: 12),
            _buildDetailSection('2. Data Penyulang', [
              _buildDetailItem('Penyulang', item['penyulang']),
              _buildDetailItem('Section', item['section']),
              _buildDetailItem('Nomor Tiang', item['nomorTiang'] ?? '-'),
              _buildDetailItem('Koordinat Tiang', item['koordinatTiang']),
              _buildDetailItem(
                  'Koordinat Pekerjaan', item['koordinatPekerjaan']),
            ]),
            const SizedBox(height: 12),
            _buildDetailSection('3. Data Pekerjaan', [
              _buildDetailItem('Diameter Pohon', '${item['diameter']} cm'),
              _buildDetailItem('Jenis Pekerjaan', item['jenisPekerjaan']),
              _buildDetailItem('Progres', '$tahap/3 • ${_labelTahap(tahap)}'),
            ]),
            const SizedBox(height: 16),
            const Text('Foto Dokumentasi',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                    child: _buildFotoThumb(
                        'Sebelum', item['fotoSebelumUrl'] ?? '')),
                const SizedBox(width: 8),
                Expanded(
                    child: _buildFotoThumb(
                        'Pekerjaan', item['fotoPekerjaanUrl'] ?? '')),
                const SizedBox(width: 8),
                Expanded(
                    child: _buildFotoThumb(
                        'Sesudah', item['fotoSesudahUrl'] ?? '')),
              ],
            ),
            // Tombol lanjut progres — tampil selama belum selesai (tahap < 3)
            if (tahap < 3) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _warnaTahap(tahap + 1),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.add_a_photo_rounded,
                      size: 18, color: Colors.white),
                  label: Text(
                    tahap <= 1
                        ? 'Lanjutkan — Foto Pekerjaan'
                        : 'Selesaikan — Foto Sesudah',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  onPressed: () {
                    Navigator.pop(context);
                    _lanjutProgres(item);
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDetailSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0284C7))),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _buildDetailItem(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          Flexible(
            child: Text(
              value?.toString() ?? '-',
              textAlign: TextAlign.right,
              style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF0F172A)),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFotoThumb(String label, String url) {
    return Column(
      children: [
        Container(
          height: 64,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          clipBehavior: Clip.antiAlias,
          child: url.isNotEmpty
              ? Image.network(
                  url,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  errorBuilder: (_, __, ___) => const Icon(Icons.broken_image,
                      size: 20, color: Colors.grey),
                )
              : const Center(
                  child: Icon(Icons.image_not_supported_outlined,
                      size: 20, color: Colors.grey)),
        ),
        const SizedBox(height: 4),
        Text(label,
            style: const TextStyle(
                fontSize: 10,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _buildMetaText(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 10,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w500)),
        const SizedBox(height: 2),
        Text(value,
            style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF1E293B),
                fontWeight: FontWeight.w600)),
      ],
    );
  }
}

// ==========================================
// FORM INPUT SHEET — TAHAP 1 (Foto Sebelum saja)
// ==========================================
class _FormEksekusiSheet extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String subTim;
  final VoidCallback onSuccess;

  const _FormEksekusiSheet({
    required this.sesi,
    required this.subTim,
    required this.onSuccess,
  });

  @override
  State<_FormEksekusiSheet> createState() => _FormEksekusiSheetState();
}

class _FormEksekusiSheetState extends State<_FormEksekusiSheet> {
  final _tiangCtrl = TextEditingController();
  final _koorTiangCtrl = TextEditingController();
  final _koorPekerjaanCtrl = TextEditingController();
  final _diameterCtrl = TextEditingController(text: '0');

  bool _loadingDropdown = true;
  bool _saving = false;
  String? _error;

  List<String> _listPenyulang = [];
  Map<String, dynamic> _sectionMap = {};
  String? _selectedPenyulang;
  String? _selectedSection;

  // Sistem progres: input baru cukup FOTO SEBELUM; foto pekerjaan & sesudah
  // dilanjutkan bertahap dari card (_LanjutProgresSheet).
  File? _fotoSebelum;

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadDropdown();
  }

  Future<void> _loadDropdown() async {
    // OFFLINE-FIRST (Project Dart): baca master penyulang/section dari SQLite
    // lokal dulu — instan & jalan tanpa internet. Fallback ke server hanya bila
    // lokal kosong (HP baru / belum pernah download master data).
    try {
      final repo = MasterRepository();
      final listLokal = await repo.daftarPenyulang();
      final mapLokal = await repo.sectionByPenyulang();
      if (listLokal.isNotEmpty) {
        if (!mounted) return;
        setState(() {
          _listPenyulang = listLokal;
          _sectionMap = mapLokal;
          _loadingDropdown = false;
        });
        return;
      }
    } catch (_) {}

    // Fallback ke server (perilaku lama), lalu cache hasilnya ke lokal agar
    // buka berikutnya dropdown jalan offline.
    try {
      final token = widget.sesi['token'] ?? '';
      final res = await ApiService.getDropdownRow(token: token);
      if (res['success'] == true) {
        final listP = List<String>.from(res['penyulang'] ?? []);
        final mapS = Map<String, dynamic>.from(res['sectionByPenyulang'] ?? {});
        if (!mounted) return;
        setState(() {
          _listPenyulang = listP;
          _sectionMap = mapS;
          _loadingDropdown = false;
        });
        // READ-THROUGH: simpan ke SQLite untuk pemakaian offline berikutnya.
        MasterRepository().simpanDariApi(listP, mapS);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingDropdown = false);
    }
  }

  Future<void> _getCurrentLocation(
    TextEditingController targetCtrl,
  ) async {
    try {
      final result = await AccurateLocationService.capture();
      if (!mounted) return;
      setState(() => targetCtrl.text = result.coordinates);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Akurasi GPS ${result.accuracyLabel}')),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      }
    }
  }

  Future<void> _pickImage() async {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded,
                  color: AppColors.navy700),
              title: const Text('Ambil dari Kamera Lapangan'),
              onTap: () async {
                Navigator.pop(ctx);
                final picked = await _picker.pickImage(
                    source: ImageSource.camera, imageQuality: 70);
                if (picked != null) {
                  setState(() => _fotoSebelum = File(picked.path));
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded,
                  color: AppColors.navy700),
              title: const Text('Pilih dari Galeri'),
              onTap: () async {
                Navigator.pop(ctx);
                final picked = await _picker.pickImage(
                    source: ImageSource.gallery, imageQuality: 70);
                if (picked != null) {
                  setState(() => _fotoSebelum = File(picked.path));
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  String _hitungJenisPekerjaan(num diameter) {
    if (diameter > 50) return 'Tebang Besar';
    if (diameter > 0) return 'Tebang Sedang';
    return 'Rabas / Pangkas';
  }

  Future<void> _handleSimpan() async {
    if (_selectedPenyulang == null || _selectedSection == null) {
      setState(() => _error = 'Penyulang dan Section wajib dipilih');
      return;
    }

    if (_koorTiangCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Koordinat tiang wajib diisi');
      return;
    }

    // Sistem progres: tahap 1 hanya mewajibkan FOTO SEBELUM.
    if (_fotoSebelum == null) {
      setState(
          () => _error = 'Foto Sebelum wajib diisi (tahap 1 dari 3 progres)');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final token = widget.sesi['token'] ?? '';
      String b64Sbl = base64Encode(await _fotoSebelum!.readAsBytes());

      final diaNum = num.tryParse(_diameterCtrl.text.trim()) ?? 0;

      final res = await ApiService.simpanEksekusiRow(
        token: token,
        penyulang: _selectedPenyulang!,
        section: _selectedSection!,
        nomorTiang: _tiangCtrl.text.trim(),
        koordinatTiang: _koorTiangCtrl.text.trim(),
        koordinatPekerjaan: _koorPekerjaanCtrl.text.trim().isNotEmpty
            ? _koorPekerjaanCtrl.text.trim()
            : _koorTiangCtrl.text.trim(),
        diameter: diaNum,
        fotoSebelumBase64: b64Sbl,
      );

      if (res['success'] == true) {
        if (!mounted) return;
        Navigator.pop(context);
        // BACKLOG + PROGRES: tahap 1 tertulis; rantai Realisasi/Header/WA
        // diproses backend (recalcTick ±1 menit). Foto berikutnya dari card.
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Tahap 1/3 tersimpan (Kode: ${res['kodeEksekusi'] ?? '-'}). Lanjutkan Foto Pekerjaan dari card kapan saja.',
            ),
          ),
        );
        widget.onSuccess();
      } else {
        setState(() {
          _error = res['message'] ?? 'Gagal menyimpan data';
          _saving = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error koneksi: $e';
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final curDiameter = num.tryParse(_diameterCtrl.text.trim()) ?? 0;
    final curJenis = _hitungJenisPekerjaan(curDiameter);

    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Input Eksekusi ROW — Tahap 1/3',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.navy700)),
                  Text(widget.subTim,
                      style:
                          TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                ],
              ),
              IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context)),
            ],
          ),
          const Divider(height: 20),
          Expanded(
            child: _loadingDropdown
                ? const CustomLoadingWidget(message: 'Memuat Form Inputan.')
                : ListView(
                    children: [
                      if (_error != null) ...[
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(8)),
                          child: Text(_error!,
                              style: const TextStyle(
                                  color: Colors.red, fontSize: 12)),
                        ),
                        const SizedBox(height: 12),
                      ],

                      // Dropdown Penyulang
                      const Text('Penyulang',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        isExpanded: true,
                        decoration: InputDecoration(
                          hintText: '--Pilih Penyulang--',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                        ),
                        value: _selectedPenyulang,
                        items: _listPenyulang
                            .map((p) => DropdownMenuItem(
                                  value: p,
                                  child:
                                      Text(p, overflow: TextOverflow.ellipsis),
                                ))
                            .toList(),
                        onChanged: (val) {
                          setState(() {
                            _selectedPenyulang = val;
                            _selectedSection = null;
                          });
                        },
                      ),
                      const SizedBox(height: 12),

                      // Dropdown Section
                      const Text('Section',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        isExpanded: true,
                        decoration: InputDecoration(
                          hintText: '--Pilih Section--',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                        ),
                        value: _selectedSection,
                        items: (_selectedPenyulang != null
                                ? List<String>.from(
                                    _sectionMap[_selectedPenyulang] ?? [])
                                : <String>[])
                            .map((s) => DropdownMenuItem(
                                  value: s,
                                  child:
                                      Text(s, overflow: TextOverflow.ellipsis),
                                ))
                            .toList(),
                        onChanged: (val) {
                          setState(() => _selectedSection = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      // No Tiang (Opsional)
                      const Text('Nomor Tiang',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _tiangCtrl,
                        decoration: InputDecoration(
                          hintText: 'Optional',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Koordinat Tiang
                      const Text('Koordinat Tiang',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _koorTiangCtrl,
                        decoration: InputDecoration(
                          hintText: '-2.xxxx, 106.xxxx',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                          suffixIcon:
                              AccurateGpsButton(controller: _koorTiangCtrl),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Koordinat Pekerjaan
                      const Text('Koordinat Pekerjaan',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _koorPekerjaanCtrl,
                        decoration: InputDecoration(
                          hintText: '-2.xxxx, 106.xxxx',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                          suffixIcon:
                              AccurateGpsButton(controller: _koorPekerjaanCtrl),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Diameter & Auto Jenis Pekerjaan — SATU BARIS (Rev 19 Agu malam):
                      // input diameter di kiri, chip jenis (read-only) di kanan; jenis berubah
                      // otomatis mengikuti diameter (0 = Rabas/Pangkas, <=50 = Tebang Sedang,
                      // >50 = Tebang Besar — aturan sama dgn backend _jenisPekerjaan).
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Diameter (cm)',
                                    style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: _diameterCtrl,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    hintText: '0',
                                    border: OutlineInputBorder(
                                        borderRadius:
                                            BorderRadius.circular(10)),
                                    contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 12),
                                  ),
                                  onChanged: (_) => setState(() {}),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Jenis Pekerjaan',
                                    style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                Container(
                                  width: double.infinity,
                                  height: 48,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE0F2FE),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                        color: const Color(0xFFBAE6FD)),
                                  ),
                                  child: Text(
                                    curJenis,
                                    style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF0369A1)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Foto Tahap 1 — SISTEM PROGRES (Rev 21 Agu 2026): input
                      // baru cukup FOTO SEBELUM; 2 foto berikutnya dari card.
                      const Text('Foto Sebelum — Tahap 1 dari 3 (Wajib)',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          _buildImagePickerBtn(
                              'Sebelum', _fotoSebelum, _pickImage),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Foto Pekerjaan & Foto Sesudah diunggah bertahap dari card setelah tersimpan.',
                        style: TextStyle(
                            fontSize: 10, color: Colors.grey.shade500),
                      ),
                      const SizedBox(height: 24),

                      // Submit Button
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.navy700,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: _saving ? null : _handleSimpan,
                          child: _saving
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white),
                                )
                              : const Text('Simpan & Mulai Progres',
                                  style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white)),
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePickerBtn(String label, File? file, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          height: 80,
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
                color: file != null
                    ? const Color(0xFF10B981)
                    : const Color(0xFFCBD5E1)),
          ),
          child: file != null
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(9),
                  child: Image.file(file, fit: BoxFit.cover),
                )
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.add_a_photo,
                        size: 22, color: Color(0xFF64748B)),
                    const SizedBox(height: 4),
                    Text(label,
                        style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF64748B))),
                  ],
                ),
        ),
      ),
    );
  }
}

// ==========================================
// SHEET LANJUTKAN PROGRES — TAHAP 2 & 3
// ==========================================
class _LanjutProgresSheet extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final Map<String, dynamic> item;
  final VoidCallback onSuccess;

  const _LanjutProgresSheet({
    required this.sesi,
    required this.item,
    required this.onSuccess,
  });

  @override
  State<_LanjutProgresSheet> createState() => _LanjutProgresSheetState();
}

class _LanjutProgresSheetState extends State<_LanjutProgresSheet> {
  File? _foto;
  bool _saving = false;
  String? _error;
  final ImagePicker _picker = ImagePicker();

  String get _kode => (widget.item['kodeEksekusi'] ?? '').toString();

  // Tahap berikutnya: 2 bila foto pekerjaan belum ada; 3 bila tinggal foto sesudah.
  int get _tahapBerikutnya {
    final p =
        (widget.item['fotoPekerjaanUrl'] ?? '').toString().trim().isNotEmpty;
    return p ? 3 : 2;
  }

  String get _labelFoto =>
      _tahapBerikutnya == 2 ? 'Foto Pekerjaan' : 'Foto Sesudah';

  Color get _warna =>
      _tahapBerikutnya == 2 ? const Color(0xFF0284C7) : const Color(0xFF059669);

  Future<void> _pickImage(ImageSource source) async {
    final picked = await _picker.pickImage(source: source, imageQuality: 70);
    if (picked != null) setState(() => _foto = File(picked.path));
  }

  void _pilihSumber() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded,
                  color: AppColors.navy700),
              title: const Text('Ambil dari Kamera Lapangan'),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded,
                  color: AppColors.navy700),
              title: const Text('Pilih dari Galeri'),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _simpan() async {
    if (_foto == null) {
      setState(() => _error =
          '$_labelFoto wajib diisi untuk lanjut ke tahap $_tahapBerikutnya/3');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final token = widget.sesi['token'] ?? '';
      final b64 = base64Encode(await _foto!.readAsBytes());
      final res = await ApiService.updateEksekusiRow(
        token: token,
        kodeEksekusi: _kode,
        fotoPekerjaanBase64: _tahapBerikutnya == 2 ? b64 : null,
        fotoSesudahBase64: _tahapBerikutnya == 3 ? b64 : null,
      );
      if (!mounted) return;
      if (res['success'] == true) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text((res['message'] ?? 'Progres tersimpan').toString()),
            backgroundColor: _warna,
          ),
        );
        widget.onSuccess();
      } else {
        setState(() {
          _error = (res['message'] ?? 'Gagal menyimpan progres').toString();
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
                    Text('Lanjutkan Progres — Tahap $_tahapBerikutnya/3',
                        style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.navy700)),
                    Text(_kode,
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey.shade600)),
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
          Text('$_labelFoto (Wajib)',
              style:
                  const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          InkWell(
            onTap: _pilihSumber,
            borderRadius: BorderRadius.circular(10),
            child: Container(
              height: 140,
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: _foto != null
                        ? const Color(0xFF10B981)
                        : const Color(0xFFCBD5E1)),
              ),
              clipBehavior: Clip.antiAlias,
              child: _foto != null
                  ? Image.file(_foto!, fit: BoxFit.cover)
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.add_a_photo,
                            size: 26, color: Color(0xFF64748B)),
                        const SizedBox(height: 6),
                        Text('Ambil / pilih $_labelFoto',
                            style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF64748B))),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 46,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _warna,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: _saving ? null : _simpan,
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      _tahapBerikutnya == 3
                          ? 'Selesaikan Pekerjaan'
                          : 'Simpan Progres Tahap 2/3',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }
}
