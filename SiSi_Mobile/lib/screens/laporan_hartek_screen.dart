import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

import '../db/repositories/header_repository.dart';
import '../theme/app_colors.dart';
import '../widgets/laporan_header_card.dart';

class LaporanHartekScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final VoidCallback? onBack;
  const LaporanHartekScreen({super.key, required this.sesi, this.onBack});

  @override
  State<LaporanHartekScreen> createState() => _LaporanHartekScreenState();
}

class _LaporanHartekScreenState extends State<LaporanHartekScreen> {
  final List<Map<String, dynamic>> _laporan = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  String get _today {
    final d = DateTime.now();
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final res = await HeaderRepository().bacaLaporanHarian(
      token: (widget.sesi['token'] ?? '').toString(),
      subTim: 'Hartek',
      tanggal: _today,
    );
    if (!mounted) return;
    final raw = res['success'] == true
        ? List<dynamic>.from(res['data'] ?? const [])
        : <dynamic>[];
    setState(() {
      _laporan
        ..clear()
        ..addAll(raw.map((e) {
          final item = Map<String, dynamic>.from(e as Map);
          item.putIfAbsent('objekList', () => <Map<String, dynamic>>[]);
          return item;
        }));
      _error = res['success'] == true
          ? null
          : (res['message'] ?? 'Gagal memuat laporan').toString();
      _loading = false;
    });
  }

  Future<void> _wa(String text) async {
    if (text.trim().isEmpty) return;
    final uri = Uri.parse(
      'https://api.whatsapp.com/send?text=${Uri.encodeComponent(text)}',
    );
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          tooltip: 'Kembali',
          onPressed: () {
            if (widget.onBack != null) {
              widget.onBack!();
            } else {
              Navigator.maybePop(context);
            }
          },
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Laporan Harian Hartek',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
            ),
            Text(
              'Hartek • ${widget.sesi['ulp'] ?? 'Toboali'}',
              style: const TextStyle(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      body: _body(),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        onPressed: _bukaFormTambahLaporan,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Tambah Laporan',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _body() {
    if (_loading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/images/loading.gif',
              width: 70,
              height: 70,
              errorBuilder: (_, __, ___) =>
                  const CircularProgressIndicator(color: AppColors.cyan600),
            ),
            const SizedBox(height: 12),
            const Text(
              'Memuat data hartek...',
              style: TextStyle(
                  fontSize: 13,
                  color: AppColors.neutral500,
                  fontWeight: FontWeight.w600),
            ),
          ],
        ),
      );
    }
    if (_error != null && _laporan.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded,
                  size: 46, color: AppColors.neutral500),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 14),
              ElevatedButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      );
    }
    if (_laporan.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.engineering_outlined,
                size: 54, color: AppColors.neutral400),
            SizedBox(height: 12),
            Text('Belum ada laporan Hartek hari ini.',
                style: TextStyle(
                    color: AppColors.neutral500, fontWeight: FontWeight.w600)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
        itemCount: _laporan.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, index) {
          final item = _laporan[index];
          final objek = item['objekList'] as List? ?? const [];
          final totalPekerjaan = objek.fold<int>(
            0,
            (sum, o) => sum + ((o['pekerjaanList'] as List?)?.length ?? 0),
          );
          return LaporanHeaderCard(
            item: item,
            icon: Icons.engineering_rounded,
            accent: AppColors.amber700,
            summary: '${objek.length} Objek • $totalPekerjaan Pekerjaan',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => _HartekDetail(sesi: widget.sesi, item: item),
              ),
            ).then((_) => setState(() {})),
            onWa: () => _wa((item['waText'] ?? '').toString()),
          );
        },
      ),
    );
  }

  void _bukaFormTambahLaporan() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _FormInputHartekHeaderScreen(
          sesi: widget.sesi,
          judulMenu: 'Tambah Laporan Harian Hartek',
          subTim: 'Hartek',
          onSimpan: (dataBaru) {
            setState(() {
              _laporan.insert(0, dataBaru);
            });
          },
        ),
      ),
    );
  }
}

class _FormInputHartekHeaderScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String judulMenu;
  final String subTim;
  final Function(Map<String, dynamic>) onSimpan;

  const _FormInputHartekHeaderScreen({
    required this.sesi,
    required this.judulMenu,
    required this.subTim,
    required this.onSimpan,
  });

  @override
  State<_FormInputHartekHeaderScreen> createState() =>
      _FormInputHartekHeaderScreenState();
}

class _FormInputHartekHeaderScreenState
    extends State<_FormInputHartekHeaderScreen> {
  final _koorAwalCtrl = TextEditingController();
  final _koorAkhirCtrl = TextEditingController();
  final _kmAwalCtrl = TextEditingController();
  final _kmAkhirCtrl = TextEditingController();
  final _kendalaCtrl = TextEditingController();

  bool _isGettingGpsAwal = false;
  bool _isGettingGpsAkhir = false;

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

      final val = '${pos.latitude.toStringAsFixed(6)}, ${pos.longitude.toStringAsFixed(6)}';
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
    final d = DateTime.now();
    final today = '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    final hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.weekday % 7];

    final data = {
      'kodeHeader': 'HAR-DRAFT-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}',
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
      'objekList': <Map<String, dynamic>>[],
    };

    widget.onSimpan(data);
    Navigator.pop(context);
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
        title: Text(
          widget.judulMenu,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.amber700.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.badge_outlined, color: AppColors.amber700, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${widget.sesi['username'] ?? 'Petugas'} (${widget.subTim})',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.navy900),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'ULP ${widget.sesi['ulp'] ?? 'Toboali'} • Hari Ini',
                        style: const TextStyle(fontSize: 12, color: AppColors.neutral500),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          _buildFormSection(
            title: 'Koordinat Lapangan',
            children: [
              _buildGpsField(
                label: 'Koordinat Awal',
                controller: _koorAwalCtrl,
                isLoading: _isGettingGpsAwal,
                onGpsPressed: () => _ambilGps(true),
              ),
              const SizedBox(height: 12),
              _buildGpsField(
                label: 'Koordinat Akhir',
                controller: _koorAkhirCtrl,
                isLoading: _isGettingGpsAkhir,
                onGpsPressed: () => _ambilGps(false),
              ),
            ],
          ),
          const SizedBox(height: 16),

          _buildFormSection(
            title: 'Speedometer (KM)',
            children: [
              Row(
                children: [
                  Expanded(
                    child: _buildTextField(
                      label: 'KM Awal',
                      controller: _kmAwalCtrl,
                      keyboardType: TextInputType.number,
                      prefixIcon: Icons.speed_rounded,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildTextField(
                      label: 'KM Akhir',
                      controller: _kmAkhirCtrl,
                      keyboardType: TextInputType.number,
                      prefixIcon: Icons.speed_rounded,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          _buildFormSection(
            title: 'Kendala & Catatan Khusus',
            children: [
              _buildTextField(
                label: 'Kendala Lapangan (Opsional)',
                controller: _kendalaCtrl,
                maxLines: 3,
                prefixIcon: Icons.notes_rounded,
              ),
            ],
          ),
          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy700,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 2,
              ),
              onPressed: _simpan,
              icon: const Icon(Icons.save_rounded),
              label: const Text(
                'Simpan Laporan Harian',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildFormSection({required String title, required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.cyan600, letterSpacing: 0.5),
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
    IconData? prefixIcon,
  }) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(fontSize: 13, color: AppColors.neutral500),
        prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: 20, color: AppColors.navy700) : null,
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.neutral300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.neutral300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.cyan600, width: 1.5)),
      ),
    );
  }

  Widget _buildGpsField({
    required String label,
    required TextEditingController controller,
    required bool isLoading,
    required VoidCallback onGpsPressed,
  }) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(fontSize: 13, color: AppColors.neutral500),
        prefixIcon: const Icon(Icons.location_on_outlined, size: 20, color: AppColors.navy700),
        suffixIcon: IconButton(
          icon: isLoading
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.my_location_rounded, color: AppColors.cyan600),
          tooltip: 'Ambil GPS Sekarang',
          onPressed: isLoading ? null : onGpsPressed,
        ),
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.neutral300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.neutral300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.cyan600, width: 1.5)),
      ),
    );
  }
}

class _HartekDetail extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final Map<String, dynamic> item;
  const _HartekDetail({required this.sesi, required this.item});

  @override
  State<_HartekDetail> createState() => _HartekDetailState();
}

class _HartekDetailState extends State<_HartekDetail> {
  int _tab = 0;
  List<Map<String, dynamic>> get _objek {
    final raw = widget.item['objekList'];
    if (raw is List<Map<String, dynamic>>) return raw;
    final list = <Map<String, dynamic>>[];
    widget.item['objekList'] = list;
    return list;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          tooltip: 'Kembali',
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Detail Laporan Hartek',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            Text(
              '${widget.item['hari'] ?? ''}, ${widget.item['tanggal'] ?? ''}',
              style: const TextStyle(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(child: _tabButton('Detail Laporan', 0)),
                const SizedBox(width: 8),
                Expanded(child: _tabButton('Objek (${_objek.length})', 1)),
              ],
            ),
          ),
          Expanded(child: _tab == 0 ? _detail() : _objekList()),
        ],
      ),
      floatingActionButton: _tab == 1
          ? FloatingActionButton.extended(
              onPressed: _addObjek,
              backgroundColor: AppColors.navy700,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Tambah Objek'),
            )
          : null,
    );
  }

  Widget _tabButton(String text, int index) {
    final active = _tab == index;
    return InkWell(
      onTap: () => setState(() => _tab = index),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(vertical: 11),
        decoration: BoxDecoration(
          color: active ? AppColors.navy700 : AppColors.neutral100,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: active ? Colors.white : AppColors.neutral500,
          ),
        ),
      ),
    );
  }

  Widget _detail() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _section('Informasi Laporan', [
          _row('Kode Header', widget.item['kodeHeader']),
          _row('ULP', widget.item['ulp']),
          _row('Tim / Sub-Tim',
              '${widget.item['tim'] ?? 'Hartek'} / ${widget.item['subTim'] ?? 'Hartek'}'),
          _row('Petugas', widget.item['inputBy'] ?? widget.item['petugas']),
        ]),
        const SizedBox(height: 12),
        _section('Perjalanan Lapangan', [
          _row('Koordinat Awal', widget.item['koordinatAwal']),
          _row('Koordinat Akhir', widget.item['koordinatAkhir']),
          _row('KM Awal / Akhir',
              '${widget.item['kmAwal'] ?? '-'} / ${widget.item['kmAkhir'] ?? '-'}'),
          _row('Kendala', widget.item['kendala']),
        ]),
      ],
    );
  }

  Widget _section(String title, List<Widget> children) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.neutral200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title.toUpperCase(),
                style: const TextStyle(
                    fontSize: 10,
                    letterSpacing: 1,
                    fontWeight: FontWeight.w900,
                    color: AppColors.cyan600)),
            const SizedBox(height: 8),
            ...children,
          ],
        ),
      );

  Widget _row(String label, dynamic value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
                width: 125,
                child: Text(label,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.neutral500))),
            Expanded(
                child: Text(
                    (value ?? '-').toString().trim().isEmpty
                        ? '-'
                        : value.toString(),
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w800))),
          ],
        ),
      );

  Widget _objekList() {
    if (_objek.isEmpty) {
      return const Center(
          child: Text('Belum ada objek Hartek.',
              style: TextStyle(color: AppColors.neutral500)));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _objek.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) {
        final o = _objek[i];
        final pekerjaan = o['pekerjaanList'] as List? ?? const [];
        return Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(15),
          child: ListTile(
            contentPadding: const EdgeInsets.all(14),
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                  color: AppColors.amber600.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(11)),
              child: const Icon(Icons.home_repair_service_rounded,
                  color: AppColors.amber700),
            ),
            title: Text(
                (o['gardu'] ?? o['penyulang'] ?? 'Objek Hartek').toString(),
                style: const TextStyle(fontWeight: FontWeight.w900)),
            subtitle: Text(
                '${o['jenisPekerjaan'] ?? '-'} • ${pekerjaan.length} pekerjaan'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => _PekerjaanList(objek: o)))
                .then((_) => setState(() {})),
          ),
        );
      },
    );
  }

  Future<void> _addObjek() async {
    final name = TextEditingController();
    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
                controller: name,
                decoration: const InputDecoration(
                    labelText: 'Nomor Gardu / Penyulang')),
            const SizedBox(height: 14),
            SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                    onPressed: () => Navigator.pop(context, name.text.trim()),
                    child: const Text('Simpan Objek'))),
          ],
        ),
      ),
    );
    if (result != null && result.isNotEmpty) {
      setState(() => _objek.add({
            'gardu': result,
            'jenisPekerjaan': 'Pemeliharaan Gardu',
            'pekerjaanList': <Map<String, dynamic>>[]
          }));
    }
  }
}

class _PekerjaanList extends StatefulWidget {
  final Map<String, dynamic> objek;
  const _PekerjaanList({required this.objek});
  @override
  State<_PekerjaanList> createState() => _PekerjaanListState();
}

class _PekerjaanListState extends State<_PekerjaanList> {
  List<Map<String, dynamic>> get list {
    final raw = widget.objek['pekerjaanList'];
    if (raw is List<Map<String, dynamic>>) return raw;
    final value = <Map<String, dynamic>>[];
    widget.objek['pekerjaanList'] = value;
    return value;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Pekerjaan Hartek'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            tooltip: 'Kembali',
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: list.isEmpty
            ? const Center(child: Text('Belum ada pekerjaan.'))
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                itemBuilder: (_, i) => Card(
                  child: ListTile(
                    title: Text((list[i]['pekerjaan'] ?? '-').toString()),
                    subtitle: Text(
                        '${(list[i]['materialList'] as List?)?.length ?? 0} material'),
                  ),
                ),
              ),
        floatingActionButton: FloatingActionButton(
          onPressed: () => setState(() => list.add({
                'pekerjaan': 'Pekerjaan Baru',
                'materialList': <Map<String, dynamic>>[]
              })),
          child: const Icon(Icons.add),
        ),
      );
}
