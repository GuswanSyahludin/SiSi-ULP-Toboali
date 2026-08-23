import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

import '../db/repositories/header_repository.dart';
import '../theme/app_colors.dart';
import '../widgets/laporan_header_card.dart';

class InspeksiJaringanScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String? targetSubTim;
  final VoidCallback? onBack;
  const InspeksiJaringanScreen({
    super.key,
    required this.sesi,
    this.targetSubTim,
    this.onBack,
  });

  @override
  State<InspeksiJaringanScreen> createState() => _InspeksiJaringanState();
}

class _InspeksiJaringanState extends State<InspeksiJaringanScreen> {
  final List<Map<String, dynamic>> _laporan = [];
  bool _loading = true;
  String? _error;

  String get _subTim =>
      widget.targetSubTim ?? widget.sesi['subTim'] ?? 'Inspeksi Jaringan';

  String get _today {
    final d = DateTime.now();
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final response = await HeaderRepository().bacaLaporanHarian(
      token: (widget.sesi['token'] ?? '').toString(),
      subTim: _subTim,
      tanggal: _today,
    );
    if (!mounted) return;
    final data = response['success'] == true
        ? List<dynamic>.from(response['data'] ?? const [])
        : <dynamic>[];
    setState(() {
      _laporan
        ..clear()
        ..addAll(data.map((raw) {
          final item = Map<String, dynamic>.from(raw as Map);
          item.putIfAbsent('realisasi', () => <Map<String, dynamic>>[]);
          return item;
        }));
      _error = response['success'] == true
          ? null
          : (response['message'] ?? 'Gagal memuat laporan').toString();
      _loading = false;
    });
  }

  Future<void> _wa(String text) async {
    if (text.trim().isEmpty) return;
    await launchUrl(
      Uri.parse(
          'https://api.whatsapp.com/send?text=${Uri.encodeComponent(text)}'),
      mode: LaunchMode.externalApplication,
    );
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
              'Inspeksi Jaringan',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
            ),
            Text(
              '$_subTim • ${widget.sesi['ulp'] ?? 'Toboali'}',
              style: const TextStyle(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      body: _body(),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.navy700,
        onPressed: _bukaFormTambahLaporan,
        child: const Icon(Icons.add_rounded, color: Colors.white),
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
              'Memuat data inspeksi...',
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
        child: Text('Belum ada laporan inspeksi hari ini.',
            style: TextStyle(
                color: AppColors.neutral500, fontWeight: FontWeight.w600)),
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
          final realisasi = item['realisasi'] as List? ?? const [];
          final totalTiang = realisasi.fold<int>(
            0,
            (sum, row) => sum + (int.tryParse('${row['totalTiang']}') ?? 0),
          );
          return LaporanHeaderCard(
            item: item,
            icon: Icons.alt_route_rounded,
            accent: AppColors.cyan600,
            summary: '${realisasi.length} Penyulang • $totalTiang Total Tiang',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => _InspeksiDetail(item: item),
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
        builder: (_) => _FormInputInspeksiHeaderScreen(
          sesi: widget.sesi,
          judulMenu: 'Tambah Laporan Harian',
          subTim: _subTim,
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

class _FormInputInspeksiHeaderScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String judulMenu;
  final String subTim;
  final Function(Map<String, dynamic>) onSimpan;

  const _FormInputInspeksiHeaderScreen({
    required this.sesi,
    required this.judulMenu,
    required this.subTim,
    required this.onSimpan,
  });

  @override
  State<_FormInputInspeksiHeaderScreen> createState() =>
      _FormInputInspeksiHeaderScreenState();
}

class _FormInputInspeksiHeaderScreenState
    extends State<_FormInputInspeksiHeaderScreen> {
  final a = TextEditingController();
  final b = TextEditingController();
  final ka = TextEditingController();
  final kb = TextEditingController();
  final kendala = TextEditingController();
  bool busy = false;

  Future<void> _gps(TextEditingController c) async {
    var p = await Geolocator.checkPermission();
    if (p == LocationPermission.denied) p = await Geolocator.requestPermission();
    final x = await Geolocator.getCurrentPosition();
    c.text = '${x.latitude.toStringAsFixed(6)}, ${x.longitude.toStringAsFixed(6)}';
    setState(() {});
  }

  void _save() {
    if (a.text.trim().isEmpty || b.text.trim().isEmpty) return;
    setState(() => busy = true);
    final d = DateTime.now();
    final today = '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    final hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.weekday % 7];

    final data = {
      'kodeHeader': 'INS-DRAFT-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}',
      'hari': hari,
      'tanggal': today,
      'ulp': widget.sesi['ulp'] ?? 'Toboali',
      'subTim': widget.subTim,
      'inputBy': widget.sesi['username'] ?? 'Petugas',
      'koordinatAwal': a.text.trim(),
      'koordinatAkhir': b.text.trim(),
      'kmAwal': ka.text.trim(),
      'kmAkhir': kb.text.trim(),
      'kendala': kendala.text.trim(),
      'realisasi': <Map<String, dynamic>>[],
    };

    widget.onSimpan(data);
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFFAF9F6),
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.black87,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            widget.judulMenu,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _field('Koordinat Jaringan Awal', a),
            _field('Koordinat Jaringan Akhir', b),
            _field('KM Awal', ka),
            _field('KM Akhir', kb),
            _field('Kendala', kendala, lines: 4),
          ],
        ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: busy ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF3F0F9),
                  foregroundColor: const Color(0xFF6B46C1),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
                child: Text(
                  busy ? 'Menyimpan...' : 'Simpan Lokal',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ),
        ),
      );

  Widget _field(String l, TextEditingController c, {int lines = 1}) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          controller: c,
          maxLines: lines,
          decoration: InputDecoration(
            labelText: l,
            labelStyle: const TextStyle(color: Colors.black54, fontSize: 13),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
            ),
            suffixIcon: l.contains('Koordinat')
                ? IconButton(
                    onPressed: () => _gps(c),
                    icon: const Icon(Icons.my_location_rounded, color: Colors.black54),
                  )
                : null,
          ),
        ),
      );
}

class _InspeksiDetail extends StatefulWidget {
  final Map<String, dynamic> item;
  const _InspeksiDetail({required this.item});

  @override
  State<_InspeksiDetail> createState() => _InspeksiDetailState();
}

class _InspeksiDetailState extends State<_InspeksiDetail> {
  int _tab = 0;
  List<Map<String, dynamic>> get _realisasi {
    final raw = widget.item['realisasi'];
    if (raw is List<Map<String, dynamic>>) return raw;
    final list = <Map<String, dynamic>>[];
    widget.item['realisasi'] = list;
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
            const Text('Detail Laporan Inspeksi',
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
                Expanded(
                    child: _tabButton('Realisasi (${_realisasi.length})', 1)),
              ],
            ),
          ),
          Expanded(child: _tab == 0 ? _detail() : _realisasiList()),
        ],
      ),
      floatingActionButton: _tab == 1
          ? FloatingActionButton.extended(
              onPressed: _addRealisasi,
              backgroundColor: AppColors.navy700,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Tambah Penyulang'),
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

  Widget _detail() => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _section('Informasi Laporan', [
            _row('Kode Header', widget.item['kodeHeader']),
            _row('ULP', widget.item['ulp']),
            _row('Tim / Sub-Tim',
                '${widget.item['tim'] ?? 'Inspeksi'} / ${widget.item['subTim'] ?? '-'}'),
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

  Widget _realisasiList() {
    if (_realisasi.isEmpty) {
      return const Center(
          child: Text('Belum ada realisasi penyulang.',
              style: TextStyle(color: AppColors.neutral500)));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _realisasi.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) {
        final r = _realisasi[i];
        final temuan = r['temuan'] as List? ?? const [];
        return Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(15),
          child: ListTile(
            contentPadding: const EdgeInsets.all(14),
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                  color: AppColors.cyan600.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(11)),
              child:
                  const Icon(Icons.alt_route_rounded, color: AppColors.cyan600),
            ),
            title: Text('Penyulang ${r['penyulang'] ?? '-'}',
                style: const TextStyle(fontWeight: FontWeight.w900)),
            subtitle: Text('${r['section'] ?? '-'} • ${temuan.length} temuan'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => _TemuanList(realisasi: r)),
            ).then((_) => setState(() {})),
          ),
        );
      },
    );
  }

  Future<void> _addRealisasi() async {
    final penyulang = TextEditingController();
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
                controller: penyulang,
                decoration: const InputDecoration(labelText: 'Penyulang')),
            const SizedBox(height: 14),
            SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                    onPressed: () =>
                        Navigator.pop(context, penyulang.text.trim()),
                    child: const Text('Simpan Penyulang'))),
          ],
        ),
      ),
    );
    if (result != null && result.isNotEmpty) {
      setState(() => _realisasi.add({
            'penyulang': result,
            'section': '-',
            'totalTiang': '0',
            'temuan': <Map<String, dynamic>>[]
          }));
    }
  }
}

class _TemuanList extends StatefulWidget {
  final Map<String, dynamic> realisasi;
  const _TemuanList({required this.realisasi});
  @override
  State<_TemuanList> createState() => _TemuanListState();
}

class _TemuanListState extends State<_TemuanList> {
  List<Map<String, dynamic>> get list {
    final raw = widget.realisasi['temuan'];
    if (raw is List<Map<String, dynamic>>) return raw;
    final value = <Map<String, dynamic>>[];
    widget.realisasi['temuan'] = value;
    return value;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text('Temuan ${widget.realisasi['penyulang'] ?? 'Penyulang'}'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            tooltip: 'Kembali',
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: list.isEmpty
            ? const Center(child: Text('Belum ada temuan.'))
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                itemBuilder: (_, i) => Card(
                  child: ListTile(
                    leading: const Icon(Icons.warning_amber_rounded,
                        color: AppColors.amber700),
                    title: Text((list[i]['jenis'] ?? list[i]['temuan'] ?? '-')
                        .toString()),
                    subtitle: Text('Tiang: ${list[i]['tiang'] ?? '-'}'),
                  ),
                ),
              ),
        floatingActionButton: FloatingActionButton(
          onPressed: () => setState(() => list.add(
              {'temuan': 'Temuan Baru', 'tiang': '-', 'prioritas': 'Sedang'})),
          child: const Icon(Icons.add),
        ),
      );
}
