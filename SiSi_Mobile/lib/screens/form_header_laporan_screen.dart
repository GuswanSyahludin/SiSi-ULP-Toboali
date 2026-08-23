import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../theme/app_colors.dart';

class FormHeaderLaporanScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String judulMenu;
  final String subTim;
  final Function(Map<String, dynamic>) onSimpan;

  const FormHeaderLaporanScreen({
    super.key,
    required this.sesi,
    required this.judulMenu,
    required this.subTim,
    required this.onSimpan,
  });

  @override
  State<FormHeaderLaporanScreen> createState() =>
      _FormHeaderLaporanScreenState();
}

class _FormHeaderLaporanScreenState extends State<FormHeaderLaporanScreen> {
  final _koorAwalCtrl = TextEditingController();
  final _koorAkhirCtrl = TextEditingController();
  final _kmAwalCtrl = TextEditingController();
  final _kmAkhirCtrl = TextEditingController();
  final _kendalaCtrl = TextEditingController();

  bool _isGettingGpsAwal = false;
  bool _isGettingGpsAkhir = false;
  bool _busy = false;

  Future<void> _ambilGps(bool awal) async {
    setState(() {
      if (awal) _isGettingGpsAwal = true;
      else _isGettingGpsAkhir = true;
    });

    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );

      final val =
          '${pos.latitude.toStringAsFixed(6)}, ${pos.longitude.toStringAsFixed(6)}';
      setState(() {
        if (awal) _koorAwalCtrl.text = val;
        else _koorAkhirCtrl.text = val;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal mendapatkan GPS: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          if (awal) _isGettingGpsAwal = false;
          else _isGettingGpsAkhir = false;
        });
      }
    }
  }

  void _simpan() {
    if (_koorAwalCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Koordinat Awal wajib diisi / rekam GPS')),
      );
      return;
    }

    setState(() => _busy = true);
    final d = DateTime.now();
    final today =
        '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    final hari = [
      'Minggu',
      'Senin',
      'Selasa',
      'Rabu',
      'Kamis',
      'Jumat',
      'Sabtu'
    ][d.weekday % 7];

    final data = {
      'kodeHeader':
          'DRAFT-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}',
      'hari': hari,
      'tanggal': today,
      'ulp': widget.sesi['ulp'] ?? 'Toboali',
      'subTim': widget.subTim,
      'inputBy': widget.sesi['username'] ?? 'Petugas',
      'koordinatAwal': _koorAwalCtrl.text.trim(),
      'koordinatAkhir': _koorAkhirCtrl.text.trim(),
      'kmAwal': _kmAwalCtrl.text.trim(),
      'kmAkhir': _kmAkhirCtrl.text.trim(),
      'kendala': _kendalaCtrl.text.trim(),
      'realisasi': <Map<String, dynamic>>[],
    };

    widget.onSimpan(data);
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.judulMenu,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
            const Text(
              'Inisialisasi Perjalanan db_Global_Header',
              style: TextStyle(fontSize: 11, color: Colors.white70),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
        children: [
          // 1. Header Context Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.neutral200),
              boxShadow: [
                BoxShadow(
                  color: AppColors.navy950.withOpacity(0.03),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.cyan600.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.badge_outlined,
                      color: AppColors.cyan600, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${widget.subTim} • ULP ${widget.sesi['ulp'] ?? 'Toboali'}',
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: AppColors.navy900),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Petugas: ${widget.sesi['username'] ?? 'Petugas Lapangan'}',
                        style: const TextStyle(
                            fontSize: 11.5, color: AppColors.neutral500),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 2. Section Titik Koordinat Lapangan
          _buildCardSection(
            icon: Icons.location_on_outlined,
            title: 'Titik Koordinat Lapangan',
            children: [
              _buildGpsField(
                label: 'Koordinat Awal Pekerjaan',
                hint: '-2.998412, 106.452819',
                controller: _koorAwalCtrl,
                isLoading: _isGettingGpsAwal,
                onGps: () => _ambilGps(true),
              ),
              const SizedBox(height: 12),
              _buildGpsField(
                label: 'Koordinat Akhir Pekerjaan',
                hint: 'Tekan tombol GPS untuk rekam titik akhir',
                controller: _koorAkhirCtrl,
                isLoading: _isGettingGpsAkhir,
                onGps: () => _ambilGps(false),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 3. Section Speedometer KM
          _buildCardSection(
            icon: Icons.speed_rounded,
            title: 'Speedometer Kendaraan (KM)',
            children: [
              Row(
                children: [
                  Expanded(
                    child: _buildInputField(
                      label: 'KM Berangkat (Awal)',
                      hint: 'Contoh: 14520',
                      controller: _kmAwalCtrl,
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildInputField(
                      label: 'KM Pulang (Akhir)',
                      hint: 'Contoh: 14565',
                      controller: _kmAkhirCtrl,
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 4. Section Kendala Lapangan
          _buildCardSection(
            icon: Icons.report_problem_outlined,
            title: 'Kendala & Catatan (Opsional)',
            children: [
              _buildInputField(
                label: 'Deskripsi Kendala',
                hint: 'Tuliskan kendala cuaca, pohon tumbang, atau medan jalan...',
                controller: _kendalaCtrl,
                maxLines: 3,
              ),
            ],
          ),
        ],
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(top: BorderSide(color: AppColors.neutral200)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.navy700,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            onPressed: _busy ? null : _simpan,
            icon: const Icon(Icons.check_circle_rounded, size: 20),
            label: Text(
              _busy ? 'Menyimpan...' : 'Simpan Laporan Header',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCardSection({
    required IconData icon,
    required String title,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.neutral200),
        boxShadow: [
          BoxShadow(
            color: AppColors.navy950.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppColors.cyan600),
              const SizedBox(width: 8),
              Text(
                title.toUpperCase(),
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  color: AppColors.navy900,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  Widget _buildInputField({
    required String label,
    required String hint,
    required TextEditingController controller,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(
                fontSize: 12, color: AppColors.neutral400, fontWeight: FontWeight.normal),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.neutral200, width: 1.5),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.neutral200, width: 1.5),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.cyan600, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGpsField({
    required String label,
    required String hint,
    required TextEditingController controller,
    required bool isLoading,
    required VoidCallback onGps,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
            color: AppColors.neutral500,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(
                fontSize: 12, color: AppColors.neutral400, fontWeight: FontWeight.normal),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            suffixIcon: Padding(
              padding: const EdgeInsets.only(right: 6),
              child: IconButton(
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.navy700,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(9)),
                ),
                icon: isLoading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.my_location_rounded, size: 18),
                onPressed: isLoading ? null : onGps,
              ),
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.neutral200, width: 1.5),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.neutral200, width: 1.5),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.cyan600, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
