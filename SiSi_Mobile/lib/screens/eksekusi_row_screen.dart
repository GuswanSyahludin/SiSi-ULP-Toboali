import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_colors.dart';
import '../services/api_service.dart';
import '../widgets/custom_loading_widget.dart';

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
  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _eksekusiList = [];

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
    _fetchEksekusiList();
  }

  Future<void> _fetchEksekusiList() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final token = widget.sesi['token'] ?? '';
      final response = await ApiService.getEksekusiRow(
        token: token,
        subTim: _activeSubTim,
        tanggal: _getTodayString(),
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
              '$_activeSubTim • Hari Ini',
              style: const TextStyle(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            onPressed: _fetchEksekusiList,
          ),
        ],
      ),
      body: _buildBody(),
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
                onPressed: _fetchEksekusiList,
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
            Text('Belum ada eksekusi pekerjaan hari ini untuk $_activeSubTim',
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
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
                    'TOTAL HARI INI',
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
                    'PROSES SYNC',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.white.withOpacity(0.7),
                        letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 2),
                  const Row(
                    children: [
                      Icon(Icons.check_circle_rounded,
                          size: 14, color: Color(0xFF10B981)),
                      SizedBox(width: 4),
                      Text('Update',
                          style: TextStyle(
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

    return InkWell(
      onTap: () => _showDetailModal(item),
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
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.check_circle,
                          size: 12, color: Color(0xFF059669)),
                      SizedBox(width: 4),
                      Text(
                        'Update',
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF059669)),
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
            const SizedBox(height: 12),

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
// FORM INPUT SHEET
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

  File? _fotoSebelum;
  File? _fotoPekerjaan;
  File? _fotoSesudah;

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadDropdown();
  }

  Future<void> _loadDropdown() async {
    try {
      final token = widget.sesi['token'] ?? '';
      final res = await ApiService.getDropdownRow(token: token);
      if (res['success'] == true) {
        setState(() {
          _listPenyulang = List<String>.from(res['penyulang'] ?? []);
          _sectionMap =
              Map<String, dynamic>.from(res['sectionByPenyulang'] ?? {});
          _loadingDropdown = false;
        });
      }
    } catch (e) {
      setState(() => _loadingDropdown = false);
    }
  }

  Future<void> _getCurrentLocation(TextEditingController targetCtrl) async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Layanan lokasi GPS belum aktif')),
      );
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    Position position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.bestForNavigation,
    );

    targetCtrl.text = '${position.latitude}, ${position.longitude}';
  }

  Future<void> _pickImage(String tipe) async {
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
                  setState(() {
                    if (tipe == 'sebelum') _fotoSebelum = File(picked.path);
                    if (tipe == 'pekerjaan') _fotoPekerjaan = File(picked.path);
                    if (tipe == 'sesudah') _fotoSesudah = File(picked.path);
                  });
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
                  setState(() {
                    if (tipe == 'sebelum') _fotoSebelum = File(picked.path);
                    if (tipe == 'pekerjaan') _fotoPekerjaan = File(picked.path);
                    if (tipe == 'sesudah') _fotoSesudah = File(picked.path);
                  });
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

    if (_fotoSebelum == null ||
        _fotoPekerjaan == null ||
        _fotoSesudah == null) {
      setState(() =>
          _error = 'Semua 3 Foto (Sebelum, Pekerjaan, Sesudah) wajib diisi');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final token = widget.sesi['token'] ?? '';
      String b64Sbl = base64Encode(await _fotoSebelum!.readAsBytes());
      String b64Pkj = base64Encode(await _fotoPekerjaan!.readAsBytes());
      String b64Ssd = base64Encode(await _fotoSesudah!.readAsBytes());

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
        fotoPekerjaanBase64: b64Pkj,
        fotoSesudahBase64: b64Ssd,
      );

      if (res['success'] == true) {
        if (!mounted) return;
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Eksekusi pekerjaan berhasil disimpan')),
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
                  const Text('Input Eksekusi ROW',
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
                ? const CustomLoadingWidget(
                    message: 'Memuat data penyulang & section...')
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
                      const Text('Nomor Tiang (Opsional)',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _tiangCtrl,
                        decoration: InputDecoration(
                          hintText: 'Contoh: 28/A/12',
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
                          hintText: 'Lat, Long',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.my_location,
                                color: Color(0xFF0284C7)),
                            onPressed: () =>
                                _getCurrentLocation(_koorTiangCtrl),
                          ),
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
                          hintText: 'Lat, Long (Opsional, default sama)',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.my_location,
                                color: Color(0xFF0284C7)),
                            onPressed: () =>
                                _getCurrentLocation(_koorPekerjaanCtrl),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Diameter & Auto Jenis Pekerjaan
                      const Text('Diameter Pohon (cm)',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _diameterCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          hintText: '0',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFBBF7D0)),
                        ),
                        child: Row(
                          children: [
                            const Text('Jenis Pekerjaan: ',
                                style: TextStyle(
                                    fontSize: 12, fontWeight: FontWeight.bold)),
                            Text(curJenis,
                                style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF15803D))),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // 3 Foto Upload
                      const Text('3 Foto Dokumentasi (Wajib Semua)',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          _buildImagePickerBtn('Sebelum', _fotoSebelum,
                              () => _pickImage('sebelum')),
                          const SizedBox(width: 8),
                          _buildImagePickerBtn('Pekerjaan', _fotoPekerjaan,
                              () => _pickImage('pekerjaan')),
                          const SizedBox(width: 8),
                          _buildImagePickerBtn('Sesudah', _fotoSesudah,
                              () => _pickImage('sesudah')),
                        ],
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
                              : const Text('Simpan & Sinkron Data',
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
