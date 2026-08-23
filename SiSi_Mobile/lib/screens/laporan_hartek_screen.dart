import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../db/repositories/master_repository.dart';
import '../theme/app_colors.dart';

class LaporanHartekScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const LaporanHartekScreen({super.key, required this.sesi});

  @override
  State<LaporanHartekScreen> createState() => _LaporanHartekScreenState();
}

class _LaporanHartekScreenState extends State<LaporanHartekScreen> {
  final List<Map<String, dynamic>> _laporanList = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadLaporan();
  }

  String _namaHari(int weekday) {
    const list = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    return list[(weekday - 1) % 7];
  }

  String _tanggalHariIni(DateTime d) {
    const bulan = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return '${d.day.toString().padLeft(2, '0')} ${bulan[d.month]} ${d.year}';
  }

  Future<void> _loadLaporan() async {
    setState(() => _loading = true);
    await Future<void>.delayed(const Duration(milliseconds: 250));
    if (!mounted) return;

    final d = DateTime.now();
    final tglStr = _tanggalHariIni(d);
    final hariStr = _namaHari(d.weekday);

    setState(() {
      _laporanList.clear();
      _laporanList.add({
        'kodeHeader': 'Draft Lokal',
        'hari': hariStr,
        'tanggal': tglStr,
        'ulp': widget.sesi['ulp'] ?? 'Toboali',
        'tim': 'Hartek',
        'subTim': 'Hartek',
        'petugas': widget.sesi['username'] ?? widget.sesi['nama'] ?? '-',
        'koordinatAwal': '-2.998123, 106.456123',
        'koordinatAkhir': '-2.999456, 106.458789',
        'lokasi': 'Jl. Jend. Sudirman, Toboali',
        'status': 'DRAFT LOKAL',
        'objekList': <Map<String, dynamic>>[
          {
            'kodePG': 'HAR-GRD.001',
            'jenisPekerjaan': 'Pemeliharaan Gardu',
            'penyulang': 'TBL-01',
            'section': 'Section A',
            'gardu': 'GT.TBL-012',
            'daerah': 'Jl. Sudirman',
            'pekerjaanList': <Map<String, dynamic>>[
              {
                'kodePekerjaan': 'PKJ.001',
                'pekerjaan': 'Penggantian Fuse Cut Out (FCO)',
                'jumlah': '1',
                'satuan': 'Set',
                'materialList': <Map<String, dynamic>>[
                  {
                    'material': 'Fuse Cut Out 24kV 100A',
                    'jumlah': '1',
                    'satuan': 'Set',
                    'kepemilikan': 'PLN',
                  },
                  {
                    'material': 'Fuse Link 10A',
                    'jumlah': '1',
                    'satuan': 'Pcs',
                    'kepemilikan': 'PLN',
                  },
                ],
              },
              {
                'kodePekerjaan': 'PKJ.002',
                'pekerjaan': 'Pengukuran Grounding Gardu',
                'jumlah': '1',
                'satuan': 'Titik',
                'materialList': <Map<String, dynamic>>[],
              },
            ],
          },
          {
            'kodePG': 'HAR-PNY.001',
            'jenisPekerjaan': 'Jaringan',
            'penyulang': 'TBL-02',
            'section': 'Section B',
            'gardu': '-',
            'daerah': 'Sadai',
            'pekerjaanList': <Map<String, dynamic>>[],
          },
        ],
      });
      _loading = false;
    });
  }

  void _buatLaporanBaru() {
    final d = DateTime.now();
    setState(() {
      _laporanList.insert(0, {
        'kodeHeader': 'Draft Lokal',
        'hari': _namaHari(d.weekday),
        'tanggal': _tanggalHariIni(d),
        'ulp': widget.sesi['ulp'] ?? 'Toboali',
        'tim': 'Hartek',
        'subTim': 'Hartek',
        'petugas': widget.sesi['username'] ?? widget.sesi['nama'] ?? '-',
        'koordinatAwal': '',
        'koordinatAkhir': '',
        'lokasi': '',
        'status': 'DRAFT LOKAL',
        'objekList': <Map<String, dynamic>>[],
      });
    });
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
            const Text('Laporan Harian Hartek', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
            Text('Tim Hartek • ${widget.sesi['ulp'] ?? 'Toboali'}', style: const TextStyle(fontSize: 12, color: Colors.white70)),
          ],
        ),
        actions: [IconButton(onPressed: _loadLaporan, icon: const Icon(Icons.refresh_rounded))],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _laporanList.isEmpty
              ? const Center(child: Text('Belum ada laporan harian Hartek.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _laporanList.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, index) => _buildLaporanCard(_laporanList[index]),
                ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        onPressed: _buatLaporanBaru,
        child: const Icon(Icons.add_rounded),
      ),
    );
  }

  Widget _buildLaporanCard(Map<String, dynamic> item) {
    final objek = (item['objekList'] as List? ?? []);
    final totalPekerjaan = objek.fold<int>(
      0,
      (sum, o) => sum + ((o['pekerjaanList'] as List?)?.length ?? 0),
    );
    final isDraft = '${item['status']}'.toUpperCase().contains('DRAFT');

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        title: Text(
          item['kodeHeader'] ?? 'Draft Lokal',
          style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.navy700),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            '${item['hari']}, ${item['tanggal']} • ${item['ulp']}\n${objek.length} Objek (Gardu/PNY) • $totalPekerjaan Pekerjaan',
          ),
        ),
        isThreeLine: true,
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: isDraft ? Colors.amber.shade50 : Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: isDraft ? Colors.amber.shade300 : Colors.green.shade300),
              ),
              child: Text(
                item['status'] ?? 'DRAFT LOKAL',
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  color: isDraft ? Colors.amber.shade900 : Colors.green.shade900,
                ),
              ),
            ),
            const SizedBox(height: 4),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF64748B)),
          ],
        ),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => _LaporanHartekDetailScreen(
              sesi: widget.sesi,
              item: item,
            ),
          ),
        ).then((_) => setState(() {})),
      ),
    );
  }
}

class _LaporanHartekDetailScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final Map<String, dynamic> item;
  const _LaporanHartekDetailScreen({required this.sesi, required this.item});

  @override
  State<_LaporanHartekDetailScreen> createState() => _LaporanHartekDetailScreenState();
}

class _LaporanHartekDetailScreenState extends State<_LaporanHartekDetailScreen> {
  int tab = 0;
  List<Map<String, dynamic>> get objekList =>
      widget.item['objekList'] as List<Map<String, dynamic>>;

  void _openMaps(String koordinat) async {
    if (koordinat.trim().isEmpty || koordinat == '-') return;
    final cleanKoor = koordinat.replaceAll(' ', '');
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$cleanKoor');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
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
            const Text('Detail Laporan Hartek', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            Text('${widget.item['hari'] ?? ''}, ${widget.item['tanggal'] ?? ''}', style: const TextStyle(fontSize: 12, color: Colors.white70)),
          ],
        ),
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Row(
              children: [
                Expanded(child: _tabButton('1. Detail Laporan', 0)),
                const SizedBox(width: 8),
                Expanded(child: _tabButton('2. Objek Hartek (${objekList.length})', 1)),
              ],
            ),
          ),
          Expanded(child: tab == 0 ? _detailHeader() : _objekListView()),
        ],
      ),
      floatingActionButton: tab == 1
          ? FloatingActionButton.extended(
              backgroundColor: AppColors.navy700,
              foregroundColor: Colors.white,
              onPressed: _tambahObjek,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Tambah Objek', style: TextStyle(fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }

  Widget _tabButton(String label, int index) {
    final active = tab == index;
    return InkWell(
      onTap: () => setState(() => tab = index),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: active ? AppColors.navy700 : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(10),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: active ? Colors.white : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _detailHeader() {
    final koorAwal = '${widget.item['koordinatAwal'] ?? '-'}';
    final koorAkhir = '${widget.item['koordinatAkhir'] ?? '-'}';
    final lokasi = '${widget.item['lokasi'] ?? '-'}';

    final totalPekerjaan = objekList.fold<int>(
      0,
      (sum, o) => sum + ((o['pekerjaanList'] as List?)?.length ?? 0),
    );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSectionCard('1. Informasi Laporan (db_Global_Header)', [
          _buildDetailRow('Kode Header', widget.item['kodeHeader']),
          _buildDetailRow('Hari / Tanggal', '${widget.item['hari'] ?? '-'}, ${widget.item['tanggal'] ?? '-'}'),
          _buildDetailRow('ULP / Tim', '${widget.item['ulp']} / Hartek'),
          _buildDetailRow('Petugas Input', widget.item['petugas']),
          _buildDetailRow('Status Data', widget.item['status']),
        ]),
        const SizedBox(height: 12),
        _buildSectionCard('2. Perjalanan & Lokasi Lapangan', [
          _buildKoorRow('Koordinat Awal', koorAwal),
          _buildKoorRow('Koordinat Akhir', koorAkhir),
          _buildDetailRow('Lokasi Pekerjaan', lokasi.isEmpty ? '-' : lokasi),
        ]),
        const SizedBox(height: 12),
        _buildSectionCard('3. Ringkasan Realisasi Hartek', [
          _buildDetailRow('Jumlah Objek', '${objekList.length} Objek'),
          _buildDetailRow('Total Pekerjaan', '$totalPekerjaan Pekerjaan'),
        ]),
      ],
    );
  }

  Widget _buildSectionCard(String title, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Column(children: children),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              value?.toString() ?? '-',
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKoorRow(String label, String koor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          const SizedBox(width: 8),
          InkWell(
            onTap: () => _openMaps(koor),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.location_on_rounded, size: 14, color: Color(0xFFEF4444)),
                const SizedBox(width: 2),
                Text(
                  koor,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF0284C7),
                    decoration: TextDecoration.underline,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _objekListView() {
    if (objekList.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Belum ada objek gardu/penyulang. Tekan tombol + Tambah Objek.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: objekList.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, index) {
        final o = objekList[index];
        final peks = (o['pekerjaanList'] as List? ?? []);
        final isGardu = (o['gardu'] ?? '-').toString() != '-';

        return InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => _HartekPekerjaanScreen(
                sesi: widget.sesi,
                objek: o,
                onUpdated: () => setState(() {}),
              ),
            ),
          ).then((_) => setState(() {})),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE0F2FE),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      '${index + 1}',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isGardu ? 'Gardu ${o['gardu']}' : 'Penyulang ${o['penyulang']}',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${o['penyulang']} • ${o['section']} • ${o['jenisPekerjaan']}',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${peks.length} Pekerjaan Tercatat',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _tambahObjek() async {
    final r = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _ObjekPGSheet(),
    );
    if (r != null) {
      setState(() => objekList.add(r));
    }
  }
}

class _ObjekPGSheet extends StatefulWidget {
  const _ObjekPGSheet();

  @override
  State<_ObjekPGSheet> createState() => _ObjekPGSheetState();
}

class _ObjekPGSheetState extends State<_ObjekPGSheet> {
  String _jenisPekerjaan = 'Pemeliharaan Gardu';
  String? _selectedPenyulang;
  String? _selectedSection;
  final _garduCtrl = TextEditingController();
  final _daerahCtrl = TextEditingController();

  List<String> _listPenyulang = [];
  Map<String, List<String>> _sectionMap = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final repo = MasterRepository();
      final pList = await repo.daftarPenyulang();
      final sMap = await repo.sectionByPenyulang();
      if (pList.isNotEmpty) {
        if (!mounted) return;
        setState(() {
          _listPenyulang = pList;
          _selectedPenyulang = pList.first;
          _sectionMap = sMap;
          _selectedSection = (sMap[_selectedPenyulang] ?? ['Section A']).first;
          _loading = false;
        });
        return;
      }
    } catch (_) {}

    if (!mounted) return;
    setState(() {
      _listPenyulang = ['TBL-01', 'TBL-02', 'TBL-03', 'TBL-04'];
      _selectedPenyulang = _listPenyulang.first;
      _selectedSection = 'Section A';
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isGardu = _jenisPekerjaan.toLowerCase() != 'jaringan';

    return Container(
      padding: EdgeInsets.only(
        top: 16,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
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
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const Text('Tambah Objek (db_Hartek_PenyulangGardu)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy700)),
            const Divider(height: 20),
            DropdownButtonFormField<String>(
              value: _jenisPekerjaan,
              decoration: InputDecoration(
                labelText: 'Jenis Objek Pekerjaan',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
              items: ['Pemeliharaan Gardu', 'Jaringan', 'Non - Teknik']
                  .map((j) => DropdownMenuItem(value: j, child: Text(j)))
                  .toList(),
              onChanged: (val) => setState(() => _jenisPekerjaan = val!),
            ),
            const SizedBox(height: 10),
            if (isGardu) ...[
              TextField(
                controller: _garduCtrl,
                decoration: const InputDecoration(labelText: 'Nomor Gardu', hintText: 'Contoh: GT.TBL-012'),
              ),
              const SizedBox(height: 10),
            ],
            if (_loading)
              const Padding(padding: EdgeInsets.all(12), child: Center(child: CircularProgressIndicator()))
            else ...[
              DropdownButtonFormField<String>(
                value: _selectedPenyulang,
                decoration: InputDecoration(
                  labelText: 'Penyulang',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
                items: _listPenyulang.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                onChanged: (val) {
                  setState(() {
                    _selectedPenyulang = val;
                    final secs = _sectionMap[val] ?? ['Section A'];
                    _selectedSection = secs.first;
                  });
                },
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _selectedSection,
                decoration: InputDecoration(
                  labelText: 'Section',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
                items: (_sectionMap[_selectedPenyulang] ?? ['Section A', 'Section B'])
                    .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                    .toList(),
                onChanged: (val) => setState(() => _selectedSection = val),
              ),
            ],
            const SizedBox(height: 10),
            TextField(
              controller: _daerahCtrl,
              decoration: const InputDecoration(labelText: 'Daerah / Lokasi', hintText: 'Contoh: Jl. Sudirman'),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.navy700,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () {
                  Navigator.pop(context, {
                    'jenisPekerjaan': _jenisPekerjaan,
                    'gardu': isGardu && _garduCtrl.text.trim().isNotEmpty ? _garduCtrl.text.trim() : '-',
                    'penyulang': _selectedPenyulang ?? 'TBL-01',
                    'section': _selectedSection ?? 'Section A',
                    'daerah': _daerahCtrl.text.trim(),
                    'pekerjaanList': <Map<String, dynamic>>[],
                  });
                },
                child: const Text('Simpan Objek', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HartekPekerjaanScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final Map<String, dynamic> objek;
  final VoidCallback onUpdated;

  const _HartekPekerjaanScreen({
    required this.sesi,
    required this.objek,
    required this.onUpdated,
  });

  @override
  State<_HartekPekerjaanScreen> createState() => _HartekPekerjaanScreenState();
}

class _HartekPekerjaanScreenState extends State<_HartekPekerjaanScreen> {
  List<Map<String, dynamic>> get pekerjaanList =>
      widget.objek['pekerjaanList'] as List<Map<String, dynamic>>;

  @override
  Widget build(BuildContext context) {
    final isGardu = (widget.objek['gardu'] ?? '-').toString() != '-';

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(isGardu ? 'Gardu ${widget.objek['gardu']}' : 'Penyulang ${widget.objek['penyulang']}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            Text('${widget.objek['penyulang']} • ${widget.objek['section']}', style: const TextStyle(fontSize: 12, color: Colors.white70)),
          ],
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
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Informasi Objek Hartek', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFF1F5F9)),
                  ),
                  child: Column(
                    children: [
                      _row('Jenis Objek', widget.objek['jenisPekerjaan']),
                      if (isGardu) _row('Nomor Gardu', widget.objek['gardu']),
                      _row('Penyulang', widget.objek['penyulang']),
                      _row('Section', widget.objek['section']),
                      _row('Daerah', widget.objek['daerah']),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Daftar Pekerjaan (${pekerjaanList.length})', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
              Text('${pekerjaanList.length} Item', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 8),
          if (pekerjaanList.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Center(
                child: Text(
                  'Belum ada pekerjaan pada objek ini.\nTekan + Tambah Pekerjaan di bawah.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                ),
              ),
            ),
          ...pekerjaanList.asMap().entries.map((e) {
            final pk = e.value;
            final mats = (pk['materialList'] as List? ?? []);

            return InkWell(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => _HartekMaterialScreen(
                    pekerjaan: pk,
                    onUpdated: () => setState(() {}),
                  ),
                ),
              ).then((_) => setState(() {})),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        '${e.key + 1}',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFD97706), fontSize: 12),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            pk['pekerjaan'] ?? '-',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Volume: ${pk['jumlah']} ${pk['satuan']}',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              '${mats.length} Material Digunakan',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        onPressed: _tambahPekerjaan,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Tambah Pekerjaan', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _row(String label, dynamic value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            Text('${value ?? '-'}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
          ],
        ),
      );

  Future<void> _tambahPekerjaan() async {
    final res = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _PekerjaanSheet(),
    );
    if (res != null) {
      setState(() {
        pekerjaanList.add(res);
        widget.onUpdated();
      });
    }
  }
}

class _PekerjaanSheet extends StatefulWidget {
  const _PekerjaanSheet();

  @override
  State<_PekerjaanSheet> createState() => _PekerjaanSheetState();
}

class _PekerjaanSheetState extends State<_PekerjaanSheet> {
  final _pekerjaanCtrl = TextEditingController();
  final _jumlahCtrl = TextEditingController(text: '1');
  String _satuan = 'Set';

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: 16,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
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
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const Text('Tambah Pekerjaan (db_Hartek_Pekerjaan)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy700)),
            const Divider(height: 20),
            TextField(
              controller: _pekerjaanCtrl,
              decoration: const InputDecoration(labelText: 'Nama Pekerjaan', hintText: 'Contoh: Penggantian FCO'),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  flex: 6,
                  child: TextField(
                    controller: _jumlahCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Jumlah'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 4,
                  child: DropdownButtonFormField<String>(
                    value: _satuan,
                    decoration: InputDecoration(
                      labelText: 'Satuan',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    items: ['Set', 'Pcs', 'Batang', 'Titik', 'Gawang', 'Unit']
                        .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                        .toList(),
                    onChanged: (val) => setState(() => _satuan = val!),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.navy700,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () {
                  if (_pekerjaanCtrl.text.trim().isEmpty) return;
                  Navigator.pop(context, {
                    'pekerjaan': _pekerjaanCtrl.text.trim(),
                    'jumlah': _jumlahCtrl.text.trim(),
                    'satuan': _satuan,
                    'materialList': <Map<String, dynamic>>[],
                  });
                },
                child: const Text('Simpan Pekerjaan', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HartekMaterialScreen extends StatefulWidget {
  final Map<String, dynamic> pekerjaan;
  final VoidCallback onUpdated;

  const _HartekMaterialScreen({
    required this.pekerjaan,
    required this.onUpdated,
  });

  @override
  State<_HartekMaterialScreen> createState() => _HartekMaterialScreenState();
}

class _HartekMaterialScreenState extends State<_HartekMaterialScreen> {
  List<Map<String, dynamic>> get materialList =>
      widget.pekerjaan['materialList'] as List<Map<String, dynamic>>;

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
            Text(widget.pekerjaan['pekerjaan'] ?? 'Material', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const Text('db_Hartek_Material', style: TextStyle(fontSize: 12, color: Colors.white70)),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Material Digunakan (${materialList.length})', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
              Text('${materialList.length} Item', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 8),
          if (materialList.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Center(
                child: Text(
                  'Belum ada material untuk pekerjaan ini.\nTekan + Tambah Material di bawah.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                ),
              ),
            ),
          ...materialList.map((m) {
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          m['material'] ?? '-',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Kepemilikan: ${m['kepemilikan']}',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE0F2FE),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${m['jumlah']} ${m['satuan']}',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0284C7), fontSize: 12),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        onPressed: _tambahMaterial,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Tambah Material', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }

  Future<void> _tambahMaterial() async {
    final res = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _MaterialSheet(),
    );
    if (res != null) {
      setState(() {
        materialList.add(res);
        widget.onUpdated();
      });
    }
  }
}

class _MaterialSheet extends StatefulWidget {
  const _MaterialSheet();

  @override
  State<_MaterialSheet> createState() => _MaterialSheetState();
}

class _MaterialSheetState extends State<_MaterialSheet> {
  final _materialCtrl = TextEditingController();
  final _jumlahCtrl = TextEditingController(text: '1');
  String _satuan = 'Pcs';
  String _kepemilikan = 'PLN';

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: 16,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
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
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const Text('Tambah Material (db_Hartek_Material)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy700)),
            const Divider(height: 20),
            TextField(
              controller: _materialCtrl,
              decoration: const InputDecoration(labelText: 'Nama Material', hintText: 'Contoh: Fuse Cut Out 24kV'),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  flex: 6,
                  child: TextField(
                    controller: _jumlahCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Jumlah'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 4,
                  child: DropdownButtonFormField<String>(
                    value: _satuan,
                    decoration: InputDecoration(
                      labelText: 'Satuan',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    items: ['Pcs', 'Set', 'Meter', 'Batang', 'Unit']
                        .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                        .toList(),
                    onChanged: (val) => setState(() => _satuan = val!),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              value: _kepemilikan,
              decoration: InputDecoration(
                labelText: 'Kepemilikan Material',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
              items: ['PLN', 'Pelanggan']
                  .map((k) => DropdownMenuItem(value: k, child: Text(k)))
                  .toList(),
              onChanged: (val) => setState(() => _kepemilikan = val!),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.navy700,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () {
                  if (_materialCtrl.text.trim().isEmpty) return;
                  Navigator.pop(context, {
                    'material': _materialCtrl.text.trim(),
                    'jumlah': _jumlahCtrl.text.trim(),
                    'satuan': _satuan,
                    'kepemilikan': _kepemilikan,
                  });
                },
                child: const Text('Simpan Material', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
