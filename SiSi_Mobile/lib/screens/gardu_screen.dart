import 'dart:async';
import 'package:flutter/material.dart';

import '../db/app_database.dart';
import '../db/repositories/master_gardu_repository.dart';
import '../theme/app_colors.dart';
import '../widgets/gardu_card_widgets.dart';

class GarduScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const GarduScreen({super.key, required this.sesi});

  static bool boleh(Map<String, dynamic> sesi) {
    final role = (sesi['role'] ?? '').toString().trim().toLowerCase();
    final subTim = (sesi['subTim'] ?? '').toString().trim().toLowerCase();
    return role == 'super user' || role == 'admin' || subTim == 'inspeksi gardu';
  }

  @override State<GarduScreen> createState() => _GarduScreenState();
}

class _GarduScreenState extends State<GarduScreen> {
  final _repo = MasterGarduRepository();
  final _search = TextEditingController();
  List<MasterGardu> _rows = [];
  Set<String> _pending = {};
  StreamSubscription<List<GarduOutbox>>? _subscription;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _subscription = _repo.pantauAntrean().listen((rows) {
      if (mounted) setState(() => _pending = rows.map((e) => e.gardu).toSet());
    });
    _load();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final role = (widget.sesi['role'] ?? '').toString().trim().toLowerCase();
    final ulp = role == 'super user' ? '' : (widget.sesi['ulp'] ?? '').toString();
    final rows = await _repo.cari(_search.text, ulp: ulp);
    if (mounted) setState(() { _rows = rows; _loading = false; });
  }

  Future<void> _openDetail(MasterGardu gardu) {
    return showGarduDetailSheet(
      context,
      gardu,
      pending: _pending.contains(gardu.gardu),
      onEdit: () async {
        final saved = await Navigator.push<bool>(
          context,
          MaterialPageRoute(builder: (_) => GarduEditScreen(gardu: gardu, sesi: widget.sesi)),
        );
        if (saved == true) _load();
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!GarduScreen.boleh(widget.sesi)) {
      return const Scaffold(body: Center(child: Text('Akses menu Gardu ditolak.')));
    }
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        title: const Text('Gardu', style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded))],
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: TextField(
            controller: _search,
            onChanged: (_) => _load(),
            decoration: InputDecoration(
              hintText: 'Cari nomor gardu atau alamat',
              prefixIcon: const Icon(Icons.search_rounded),
              filled: true,
              fillColor: const Color(0xFFFCFDFF),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 4, 18, 12),
          child: Row(children: [
            Text('${_rows.length} gardu', style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF475569))),
            const Spacer(),
            if (_pending.isNotEmpty)
              Text('${_pending.length} belum sinkron', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFFB45309))),
          ]),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _rows.isEmpty
                  ? const Center(child: Padding(
                      padding: EdgeInsets.all(28),
                      child: Text(
                        'Belum ada Master Gardu. Jalankan Sinkron Data di Pengaturan.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Color(0xFF64748B)),
                      )))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                        itemCount: _rows.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) => GarduSummaryCard(
                          gardu: _rows[i],
                          pending: _pending.contains(_rows[i].gardu),
                          onTap: () => _openDetail(_rows[i]),
                        ),
                      ),
                    ),
        ),
      ]),
    );
  }
}

class GarduEditScreen extends StatefulWidget {
  final MasterGardu gardu;
  final Map<String, dynamic> sesi;
  const GarduEditScreen({super.key, required this.gardu, required this.sesi});
  @override State<GarduEditScreen> createState() => _GarduEditScreenState();
}

class _GarduEditScreenState extends State<GarduEditScreen> {
  final _repo = MasterGarduRepository();
  final Map<String, TextEditingController> _controllers = {};
  bool _saving = false;

  static const Map<String, String> _labels = {
    'alamat': 'Alamat',
    'jenisGardu': 'Jenis Gardu',
    'merk': 'Merk Trafo',
    'kapasitasKva': 'Kapasitas Trafo (kVA)',
    'noSeri': 'No. Seri Trafo',
    'tahunTrafo': 'Tahun Trafo',
    'typeSeal': 'Type Seal',
    'merkPhbTr': 'Merk PHB-TR',
    'nomorSeriPhbTr': 'Nomor Seri PHB-TR',
    'tahunPhbTr': 'Tahun PHB-TR',
    'jamUkurWbp': 'Jam Ukur WBP',
    'tanggalPengukuran': 'Tanggal Pengukuran',
    'kepemilikan': 'Kepemilikan',
    'arusMaxPerFasa': 'Arus Max per Fasa di Gardu (A)',
    'pembebananKva': 'Pembebanan Trafo WBP (kVA)',
    'pembebananKw': 'Pembebanan Trafo WBP (kW)',
    'persentaseBeban': 'Pembebanan Trafo WBP (%)',
    'kategoriBeban': 'Kategori Beban',
    'wbpRs': 'WBP Tegangan R-S', 'wbpSt': 'WBP Tegangan S-T',
    'wbpTr': 'WBP Tegangan T-R', 'wbpRn': 'WBP Tegangan R-N',
    'wbpSn': 'WBP Tegangan S-N', 'wbpTn': 'WBP Tegangan T-N',
    'wbpR': 'WBP Arus R', 'wbpS': 'WBP Arus S',
    'wbpT': 'WBP Arus T', 'wbpN': 'WBP Arus N',
    'lwbpRs': 'LWBP Tegangan R-S', 'lwbpSt': 'LWBP Tegangan S-T',
    'lwbpTr': 'LWBP Tegangan T-R', 'lwbpRn': 'LWBP Tegangan R-N',
    'lwbpSn': 'LWBP Tegangan S-N', 'lwbpTn': 'LWBP Tegangan T-N',
    'lwbpR': 'LWBP Arus R', 'lwbpS': 'LWBP Arus S',
    'lwbpT': 'LWBP Arus T', 'lwbpN': 'LWBP Arus N',
  };

  @override
  void initState() {
    super.initState();
    final g = widget.gardu;
    final values = <String, String>{
      'alamat': g.alamat, 'jenisGardu': g.jenisGardu, 'merk': g.merk,
      'kapasitasKva': g.kapasitasKva, 'noSeri': g.noSeri,
      'tahunTrafo': g.tahunTrafo, 'typeSeal': g.typeSeal,
      'merkPhbTr': g.merkPhbTr, 'nomorSeriPhbTr': g.nomorSeriPhbTr,
      'tahunPhbTr': g.tahunPhbTr, 'jamUkurWbp': g.jamUkurWbp,
      'tanggalPengukuran': g.tanggalPengukuran, 'kepemilikan': g.kepemilikan,
      'arusMaxPerFasa': g.arusMaxPerFasa, 'pembebananKva': g.pembebananKva,
      'pembebananKw': g.pembebananKw, 'persentaseBeban': g.persentaseBeban,
      'kategoriBeban': g.kategoriBeban,
      'wbpRs': g.wbpRs, 'wbpSt': g.wbpSt, 'wbpTr': g.wbpTr,
      'wbpRn': g.wbpRn, 'wbpSn': g.wbpSn, 'wbpTn': g.wbpTn,
      'wbpR': g.wbpR, 'wbpS': g.wbpS, 'wbpT': g.wbpT, 'wbpN': g.wbpN,
      'lwbpRs': g.lwbpRs, 'lwbpSt': g.lwbpSt, 'lwbpTr': g.lwbpTr,
      'lwbpRn': g.lwbpRn, 'lwbpSn': g.lwbpSn, 'lwbpTn': g.lwbpTn,
      'lwbpR': g.lwbpR, 'lwbpS': g.lwbpS, 'lwbpT': g.lwbpT, 'lwbpN': g.lwbpN,
    };
    for (final entry in values.entries) {
      _controllers[entry.key] = TextEditingController(text: entry.value);
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) controller.dispose();
    super.dispose();
  }

  bool _numeric(String key) =>
      key.contains('wbp') || key.contains('Wbp') || key.contains('Beban') ||
      key == 'arusMaxPerFasa' || key == 'kapasitasKva';

  Future<void> _save() async {
    setState(() => _saving = true);
    await _repo.editLokal(
      asli: widget.gardu,
      perubahan: {for (final e in _controllers.entries) e.key: e.value.text.trim()},
      username: (widget.sesi['username'] ?? '').toString(),
    );
    if (!mounted) return;
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF6F8FC),
        appBar: AppBar(
          title: Text('Edit ${widget.gardu.gardu}'),
          actions: [TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('SIMPAN', style: TextStyle(fontWeight: FontWeight.w900)),
          )],
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Perubahan disimpan di HP dahulu, lalu dikirim melalui Sinkron Data.',
              style: TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            ..._labels.entries.map((entry) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: TextField(
                controller: _controllers[entry.key],
                keyboardType: _numeric(entry.key)
                    ? const TextInputType.numberWithOptions(decimal: true)
                    : TextInputType.text,
                decoration: InputDecoration(
                  labelText: entry.value,
                  filled: true,
                  fillColor: const Color(0xFFFCFDFF),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            )),
          ],
        ),
      );
}
