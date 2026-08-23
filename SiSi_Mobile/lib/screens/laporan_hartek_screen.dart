import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../db/repositories/header_repository.dart';
import '../theme/app_colors.dart';
import '../widgets/laporan_header_card.dart';

class LaporanHartekScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const LaporanHartekScreen({super.key, required this.sesi});

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
      _error = res['success'] == true ? null : (res['message'] ?? 'Gagal memuat laporan').toString();
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
    );
  }

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null && _laporan.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded, size: 46, color: AppColors.neutral500),
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
        child: Padding(
          padding: EdgeInsets.all(28),
          child: Text(
            'Belum ada laporan Hartek hari ini.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.neutral500),
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
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
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Detail Laporan Hartek', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
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
          _row('Tim / Sub-Tim', '${widget.item['tim'] ?? 'Hartek'} / ${widget.item['subTim'] ?? 'Hartek'}'),
          _row('Petugas', widget.item['inputBy'] ?? widget.item['petugas']),
        ]),
        const SizedBox(height: 12),
        _section('Perjalanan Lapangan', [
          _row('Koordinat Awal', widget.item['koordinatAwal']),
          _row('Koordinat Akhir', widget.item['koordinatAkhir']),
          _row('KM Awal / Akhir', '${widget.item['kmAwal'] ?? '-'} / ${widget.item['kmAkhir'] ?? '-'}'),
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
            Text(title.toUpperCase(), style: const TextStyle(fontSize: 10, letterSpacing: 1, fontWeight: FontWeight.w900, color: AppColors.cyan600)),
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
            SizedBox(width: 125, child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.neutral500))),
            Expanded(child: Text((value ?? '-').toString().trim().isEmpty ? '-' : value.toString(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800))),
          ],
        ),
      );

  Widget _objekList() {
    if (_objek.isEmpty) {
      return const Center(child: Text('Belum ada objek Hartek.', style: TextStyle(color: AppColors.neutral500)));
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
              decoration: BoxDecoration(color: AppColors.amber600.withValues(alpha: .12), borderRadius: BorderRadius.circular(11)),
              child: const Icon(Icons.home_repair_service_rounded, color: AppColors.amber700),
            ),
            title: Text((o['gardu'] ?? o['penyulang'] ?? 'Objek Hartek').toString(), style: const TextStyle(fontWeight: FontWeight.w900)),
            subtitle: Text('${o['jenisPekerjaan'] ?? '-'} • ${pekerjaan.length} pekerjaan'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => _PekerjaanList(objek: o))).then((_) => setState(() {})),
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
        padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Nomor Gardu / Penyulang')),
            const SizedBox(height: 14),
            SizedBox(width: double.infinity, child: ElevatedButton(onPressed: () => Navigator.pop(context, name.text.trim()), child: const Text('Simpan Objek'))),
          ],
        ),
      ),
    );
    if (result != null && result.isNotEmpty) {
      setState(() => _objek.add({'gardu': result, 'jenisPekerjaan': 'Pemeliharaan Gardu', 'pekerjaanList': <Map<String, dynamic>>[]}));
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
        appBar: AppBar(title: const Text('Pekerjaan Hartek')),
        body: list.isEmpty
            ? const Center(child: Text('Belum ada pekerjaan.'))
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                itemBuilder: (_, i) => Card(
                  child: ListTile(
                    title: Text((list[i]['pekerjaan'] ?? '-').toString()),
                    subtitle: Text('${(list[i]['materialList'] as List?)?.length ?? 0} material'),
                  ),
                ),
              ),
        floatingActionButton: FloatingActionButton(
          onPressed: () => setState(() => list.add({'pekerjaan': 'Pekerjaan Baru', 'materialList': <Map<String, dynamic>>[]})),
          child: const Icon(Icons.add),
        ),
      );
}
