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

  @override
  State<GarduScreen> createState() => _GarduScreenState();
}

class _GarduScreenState extends State<GarduScreen> {
  static const _categoryLabels = <String, String>{
    'Underload': 'Underload (<50%)',
    'Cukup': 'Cukup (>=50%, <80%)',
    'Overload': 'Overload (>=80%, <100%)',
    'Buruk': 'Buruk (>=100%)',
  };
  static const _filterLabels = <String, String>{
    'nomor': 'Nomor Gardu',
    'range': 'Range Beban',
    'kapasitas': 'Kapasitas Trafo',
    'kategori': 'Kriteria Beban',
  };

  final _repo = MasterGarduRepository();
  final _search = TextEditingController();
  final _minLoad = TextEditingController();
  final _maxLoad = TextEditingController();
  final _capacity = TextEditingController();
  List<MasterGardu> _allRows = [];
  List<MasterGardu> _rows = [];
  Set<String> _pending = {};
  StreamSubscription<List<GarduOutbox>>? _subscription;
  String _filterType = 'nomor';
  String? _category;
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
    _minLoad.dispose();
    _maxLoad.dispose();
    _capacity.dispose();
    super.dispose();
  }

  double? _number(String raw) {
    final match = RegExp(r'-?\d+(?:[.,]\d+)?').firstMatch(raw.trim());
    if (match == null) return null;
    return double.tryParse(match.group(0)!.replaceAll(',', '.'));
  }

  List<MasterGardu> _filter(List<MasterGardu> source) {
    return source.where((gardu) {
      switch (_filterType) {
        case 'nomor':
          final number = _search.text.trim().toLowerCase();
          return number.isEmpty || gardu.gardu.toLowerCase().contains(number);
        case 'range':
          final load = garduPercent(gardu.persentaseBeban);
          final minLoad = _number(_minLoad.text);
          final maxLoad = _number(_maxLoad.text);
          if (minLoad != null && load < minLoad) return false;
          if (maxLoad != null && load > maxLoad) return false;
          return true;
        case 'kapasitas':
          final capacity = _number(_capacity.text);
          if (capacity == null) return true;
          final garduCapacity = _number(gardu.kapasitasKva);
          return garduCapacity != null &&
              (garduCapacity - capacity).abs() <= .001;
        case 'kategori':
          return _category == null || garduCategory(gardu) == _category;
        default:
          return true;
      }
    }).toList();
  }

  bool get _hasActiveFilter {
    switch (_filterType) {
      case 'nomor':
        return _search.text.trim().isNotEmpty;
      case 'range':
        return _minLoad.text.trim().isNotEmpty ||
            _maxLoad.text.trim().isNotEmpty;
      case 'kapasitas':
        return _capacity.text.trim().isNotEmpty;
      case 'kategori':
        return _category != null;
      default:
        return false;
    }
  }

  void _applyFilters() {
    setState(() => _rows = _filter(_allRows));
  }

  void _clearValues() {
    _search.clear();
    _minLoad.clear();
    _maxLoad.clear();
    _capacity.clear();
    _category = null;
  }

  void _selectFilter(String type) {
    if (type == _filterType) return;
    _clearValues();
    setState(() {
      _filterType = type;
      _rows = List.of(_allRows);
    });
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final role = (widget.sesi['role'] ?? '').toString().trim().toLowerCase();
    final privileged = role == 'super user' || role == 'admin';
    final ulp = privileged ? '' : (widget.sesi['ulp'] ?? '').toString().trim();
    var rows = await _repo.cari('', ulp: ulp, limit: 5000);
    if (rows.isEmpty && ulp.isNotEmpty && await _repo.jumlah() > 0) {
      rows = await _repo.cari('', limit: 5000);
    }
    if (mounted) {
      setState(() {
        _allRows = rows;
        _rows = _filter(rows);
        _loading = false;
      });
    }
  }

  Future<void> _openDetail(MasterGardu gardu) {
    return showGarduDetailSheet(
      context,
      gardu,
      pending: _pending.contains(gardu.gardu),
      onEdit: () async {
        final saved = await Navigator.push<bool>(
          context,
          MaterialPageRoute(
            builder: (_) => GarduEditScreen(gardu: gardu, sesi: widget.sesi),
          ),
        );
        if (saved == true) _load();
      },
    );
  }

  InputDecoration _plainDecoration(String hint, {String? suffix}) {
    return InputDecoration(
      hintText: hint,
      suffixText: suffix,
      border: InputBorder.none,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(vertical: 15),
    );
  }

  Widget _filterInput() {
    switch (_filterType) {
      case 'range':
        return Row(children: [
          Expanded(
            child: TextField(
              controller: _minLoad,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => _applyFilters(),
              decoration: _plainDecoration('Min', suffix: '%'),
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 10),
            child: Text('s.d.', style: TextStyle(color: Color(0xFF64748B))),
          ),
          Expanded(
            child: TextField(
              controller: _maxLoad,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => _applyFilters(),
              decoration: _plainDecoration('Maks', suffix: '%'),
            ),
          ),
        ]);
      case 'kapasitas':
        return TextField(
          controller: _capacity,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          onChanged: (_) => _applyFilters(),
          decoration: _plainDecoration('Cari kapasitas trafo', suffix: 'kVA'),
        );
      case 'kategori':
        return DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            value: _category,
            isExpanded: true,
            hint: const Text('Pilih kriteria beban'),
            items: _categoryLabels.entries
                .map((entry) => DropdownMenuItem(
                      value: entry.key,
                      child: Text(entry.value),
                    ))
                .toList(),
            onChanged: (value) {
              setState(() {
                _category = value;
                _rows = _filter(_allRows);
              });
            },
          ),
        );
      case 'nomor':
      default:
        return TextField(
          controller: _search,
          textCapitalization: TextCapitalization.characters,
          onChanged: (_) => _applyFilters(),
          decoration: _plainDecoration('Cari nomor gardu'),
        );
    }
  }

  Widget _filterButton() {
    return PopupMenuButton<String>(
      tooltip: 'Pilih kriteria filter',
      initialValue: _filterType,
      onSelected: _selectFilter,
      itemBuilder: (_) => _filterLabels.entries
          .map((entry) => PopupMenuItem<String>(
                value: entry.key,
                child: Row(children: [
                  Icon(
                    entry.key == _filterType
                        ? Icons.radio_button_checked_rounded
                        : Icons.radio_button_unchecked_rounded,
                    size: 19,
                    color: entry.key == _filterType
                        ? AppColors.cyan600
                        : const Color(0xFF94A3B8),
                  ),
                  const SizedBox(width: 10),
                  Text(entry.value),
                ]),
              ))
          .toList(),
      child: SizedBox(
        width: 48,
        height: 48,
        child: Stack(alignment: Alignment.center, children: [
          Icon(
            Icons.filter_list_rounded,
            color: _hasActiveFilter
                ? AppColors.cyan600
                : const Color(0xFF64748B),
          ),
          if (_hasActiveFilter)
            const Positioned(
              right: 8,
              top: 8,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: AppColors.amber700,
                  shape: BoxShape.circle,
                ),
                child: SizedBox.square(dimension: 9),
              ),
            ),
        ]),
      ),
    );
  }

  Widget _filterBar() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      constraints: const BoxConstraints(minHeight: 56),
      decoration: BoxDecoration(
        color: const Color(0xFFFCFDFF),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(children: [
        const SizedBox(width: 14),
        const Icon(Icons.search_rounded, color: Color(0xFF64748B)),
        const SizedBox(width: 12),
        Expanded(child: _filterInput()),
        _filterButton(),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!GarduScreen.boleh(widget.sesi)) {
      return const Scaffold(
        body: Center(child: Text('Akses menu Gardu ditolak.')),
      );
    }
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        title: const Text('Gardu', style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      body: Column(children: [
        _filterBar(),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 4, 18, 12),
          child: Row(children: [
            Text(
              '${_rows.length} gardu',
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                color: Color(0xFF475569),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              _filterLabels[_filterType]!,
              style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
            ),
            const Spacer(),
            if (_pending.isNotEmpty)
              Text(
                '${_pending.length} belum sinkron',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFFB45309),
                ),
              ),
          ]),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _rows.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(28),
                        child: Text(
                          _allRows.isEmpty
                              ? 'Belum ada Master Gardu. Jalankan Sinkron Data di Pengaturan.'
                              : 'Tidak ada gardu yang sesuai dengan filter.',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Color(0xFF64748B)),
                        ),
                      ),
                    )
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
  @override
  State<GarduEditScreen> createState() => _GarduEditScreenState();
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
    'wbpRs': 'WBP Tegangan R-S',
    'wbpSt': 'WBP Tegangan S-T',
    'wbpTr': 'WBP Tegangan T-R',
    'wbpRn': 'WBP Tegangan R-N',
    'wbpSn': 'WBP Tegangan S-N',
    'wbpTn': 'WBP Tegangan T-N',
    'wbpR': 'WBP Arus R',
    'wbpS': 'WBP Arus S',
    'wbpT': 'WBP Arus T',
    'wbpN': 'WBP Arus N',
    'lwbpRs': 'LWBP Tegangan R-S',
    'lwbpSt': 'LWBP Tegangan S-T',
    'lwbpTr': 'LWBP Tegangan T-R',
    'lwbpRn': 'LWBP Tegangan R-N',
    'lwbpSn': 'LWBP Tegangan S-N',
    'lwbpTn': 'LWBP Tegangan T-N',
    'lwbpR': 'LWBP Arus R',
    'lwbpS': 'LWBP Arus S',
    'lwbpT': 'LWBP Arus T',
    'lwbpN': 'LWBP Arus N',
  };

  @override
  void initState() {
    super.initState();
    final g = widget.gardu;
    final values = <String, String>{
      'alamat': g.alamat,
      'jenisGardu': g.jenisGardu,
      'merk': g.merk,
      'kapasitasKva': g.kapasitasKva,
      'noSeri': g.noSeri,
      'tahunTrafo': g.tahunTrafo,
      'typeSeal': g.typeSeal,
      'merkPhbTr': g.merkPhbTr,
      'nomorSeriPhbTr': g.nomorSeriPhbTr,
      'tahunPhbTr': g.tahunPhbTr,
      'jamUkurWbp': g.jamUkurWbp,
      'tanggalPengukuran': g.tanggalPengukuran,
      'kepemilikan': g.kepemilikan,
      'arusMaxPerFasa': g.arusMaxPerFasa,
      'pembebananKva': g.pembebananKva,
      'pembebananKw': g.pembebananKw,
      'persentaseBeban': g.persentaseBeban,
      'kategoriBeban': g.kategoriBeban,
      'wbpRs': g.wbpRs,
      'wbpSt': g.wbpSt,
      'wbpTr': g.wbpTr,
      'wbpRn': g.wbpRn,
      'wbpSn': g.wbpSn,
      'wbpTn': g.wbpTn,
      'wbpR': g.wbpR,
      'wbpS': g.wbpS,
      'wbpT': g.wbpT,
      'wbpN': g.wbpN,
      'lwbpRs': g.lwbpRs,
      'lwbpSt': g.lwbpSt,
      'lwbpTr': g.lwbpTr,
      'lwbpRn': g.lwbpRn,
      'lwbpSn': g.lwbpSn,
      'lwbpTn': g.lwbpTn,
      'lwbpR': g.lwbpR,
      'lwbpS': g.lwbpS,
      'lwbpT': g.lwbpT,
      'lwbpN': g.lwbpN,
    };
    for (final entry in values.entries) {
      _controllers[entry.key] = TextEditingController(text: entry.value);
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  bool _numeric(String key) =>
      key.contains('wbp') ||
      key.contains('Wbp') ||
      key.contains('Beban') ||
      key == 'arusMaxPerFasa' ||
      key == 'kapasitasKva';

  Future<void> _save() async {
    setState(() => _saving = true);
    await _repo.editLokal(
      asli: widget.gardu,
      perubahan: {
        for (final e in _controllers.entries) e.key: e.value.text.trim(),
      },
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
          actions: [
            TextButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(
                      'SIMPAN',
                      style: TextStyle(fontWeight: FontWeight.w900),
                    ),
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Perubahan disimpan di HP dahulu, lalu dikirim melalui Sinkron Data.',
              style: TextStyle(
                color: Color(0xFFB45309),
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 16),
            ..._labels.entries.map(
              (entry) => Padding(
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
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
}
