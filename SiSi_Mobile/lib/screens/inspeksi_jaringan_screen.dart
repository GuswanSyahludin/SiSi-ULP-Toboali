import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/app_colors.dart';

class InspeksiJaringanScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const InspeksiJaringanScreen({super.key, required this.sesi});

  @override
  State<InspeksiJaringanScreen> createState() => _InspeksiJaringanState();
}

class _InspeksiJaringanState extends State<InspeksiJaringanScreen> {
  final List<Map<String, dynamic>> laporan = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
    if (!mounted) return;
    setState(() {
      laporan.clear();
      final d = DateTime.now();
      final hari = _namaHari(d.weekday);
      final tglStr = _tanggalHariIni(d);

      laporan.add({
        'kodeHeader': 'Draft Lokal',
        'hari': hari,
        'tanggal': tglStr,
        'ulp': widget.sesi['ulp'] ?? 'Toboali',
        'tim': 'Inspeksi',
        'subTim': widget.sesi['subTim'] ?? widget.sesi['tim'] ?? 'Inspeksi',
        'petugas': widget.sesi['username'] ?? widget.sesi['nama'] ?? '-',
        'koordinatAwal': '-2.998123, 106.456123',
        'koordinatAkhir': '-2.999456, 106.458789',
        'kmAwal': '12.4',
        'kmAkhir': '18.9',
        'kendala': '-',
        'status': 'DRAFT LOKAL',
        'waText': '',
        'realisasi': <Map<String, dynamic>>[
          {
            'penyulang': 'TBL-01',
            'section': 'Section A',
            'tier': 'Tier 1 & 2',
            'totalTiang': '12',
            'temuan': <Map<String, dynamic>>[
              {
                'jenis': 'Isolator retak',
                'tiang': '07',
                'prioritas': 'Tinggi',
                'keterangan': 'Perlu penggantian segera isolator fasa R',
              },
              {
                'jenis': 'Andongan penghantar kendor',
                'tiang': '10',
                'prioritas': 'Sedang',
                'keterangan': 'Jarak aman ke pohon mendekati batas minimal',
              },
            ],
          },
          {
            'penyulang': 'TBL-02',
            'section': 'Section B',
            'tier': 'Tier 1',
            'totalTiang': '8',
            'temuan': <Map<String, dynamic>>[],
          },
        ],
      });
      loading = false;
    });
  }

  String _namaHari(int weekday) {
    const list = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    return list[(weekday - 1) % 7];
  }

  String _tanggalHariIni(DateTime d) {
    return '${d.day.toString().padLeft(2, '0')} ${_bulan(d.month)} ${d.year}';
  }

  String _bulan(int month) => const [
        '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ][month];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        title: const Text('Inspeksi Jaringan', style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded))],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : laporan.isEmpty
              ? const Center(child: Text('Belum ada laporan harian.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: laporan.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, index) => _laporanCard(laporan[index]),
                ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        onPressed: _buatLaporan,
        child: const Icon(Icons.add_rounded),
      ),
    );
  }

  Widget _laporanCard(Map<String, dynamic> item) {
    final real = (item['realisasi'] as List? ?? []);
    final totalTiang = real.fold<int>(0, (sum, r) => sum + (int.tryParse('${r['totalTiang']}') ?? 0));
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
            '${item['hari']}, ${item['tanggal']} • ${item['ulp']}\n${real.length} Penyulang • $totalTiang Total Tiang',
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
          MaterialPageRoute(builder: (_) => _LaporanDetail(item: item)),
        ).then((_) => setState(() {})),
      ),
    );
  }

  void _buatLaporan() {
    final d = DateTime.now();
    setState(() {
      laporan.insert(0, {
        'kodeHeader': 'Draft Lokal',
        'hari': _namaHari(d.weekday),
        'tanggal': _tanggalHariIni(d),
        'ulp': widget.sesi['ulp'] ?? 'Toboali',
        'tim': 'Inspeksi',
        'subTim': widget.sesi['subTim'] ?? widget.sesi['tim'] ?? 'Inspeksi',
        'petugas': widget.sesi['username'] ?? widget.sesi['nama'] ?? '-',
        'koordinatAwal': '',
        'koordinatAkhir': '',
        'kmAwal': '',
        'kmAkhir': '',
        'kendala': '',
        'status': 'DRAFT LOKAL',
        'waText': '',
        'realisasi': <Map<String, dynamic>>[],
      });
    });
  }
}

class _LaporanDetail extends StatefulWidget {
  final Map<String, dynamic> item;
  const _LaporanDetail({required this.item});

  @override
  State<_LaporanDetail> createState() => _LaporanDetailState();
}

class _LaporanDetailState extends State<_LaporanDetail> {
  int tab = 0;
  List<Map<String, dynamic>> get realisasi => widget.item['realisasi'] as List<Map<String, dynamic>>;

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
            const Text('Detail Laporan Harian', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
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
                Expanded(child: _tabButton('2. Realisasi (${realisasi.length})', 1)),
              ],
            ),
          ),
          Expanded(child: tab == 0 ? _detailHeader() : _realisasi()),
        ],
      ),
      floatingActionButton: tab == 1
          ? FloatingActionButton.extended(
              backgroundColor: AppColors.navy700,
              foregroundColor: Colors.white,
              onPressed: _tambahRealisasi,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Tambah Penyulang', style: TextStyle(fontWeight: FontWeight.bold)),
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
    final kmAwal = '${widget.item['kmAwal'] ?? '-'}';
    final kmAkhir = '${widget.item['kmAkhir'] ?? '-'}';
    final kendala = '${widget.item['kendala'] ?? '-'}';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSectionCard('1. Informasi Laporan (db_Global_Header)', [
          _buildDetailRow('Kode Header', widget.item['kodeHeader']),
          _buildDetailRow('Hari / Tanggal', '${widget.item['hari'] ?? '-'}, ${widget.item['tanggal'] ?? '-'}'),
          _buildDetailRow('ULP', widget.item['ulp']),
          _buildDetailRow('Tim / Sub-Tim', '${widget.item['tim'] ?? 'Inspeksi'} / ${widget.item['subTim'] ?? '-'}'),
          _buildDetailRow('Petugas Input', widget.item['petugas']),
          _buildDetailRow('Status Data', widget.item['status']),
        ]),
        const SizedBox(height: 12),
        _buildSectionCard('2. Perjalanan & Kendala Lapangan', [
          _buildKoorRow('Koordinat Awal', koorAwal),
          _buildKoorRow('Koordinat Akhir', koorAkhir),
          _buildDetailRow('Stand KM Awal / Akhir', '$kmAwal / $kmAkhir km'),
          _buildDetailRow('Kendala Lapangan', kendala.isEmpty ? '-' : kendala),
        ]),
        const SizedBox(height: 12),
        _buildSectionCard('3. Ringkasan Realisasi & Temuan', [
          _buildDetailRow('Jumlah Penyulang', '${realisasi.length} Penyulang'),
          _buildDetailRow(
            'Total Tiang Diinspeksi',
            '${realisasi.fold<int>(0, (s, r) => s + (int.tryParse('${r['totalTiang']}') ?? 0))} Tiang',
          ),
          _buildDetailRow(
            'Total Titik Temuan',
            '${realisasi.fold<int>(0, (s, r) => s + ((r['temuan'] as List?)?.length ?? 0))} Titik',
          ),
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
          Text(
            title,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
          ),
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

  Widget _realisasi() {
    if (realisasi.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Belum ada realisasi penyulang. Tekan tombol + Tambah Penyulang untuk menambah data.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
          ),
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: realisasi.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, index) {
        final r = realisasi[index];
        final temuanList = (r['temuan'] as List? ?? []);
        return InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => _PenyulangDetail(realisasi: r)),
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
                        'Penyulang ${r['penyulang']}',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${r['section']} • ${r['tier']}',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${temuanList.length} Temuan Titik',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: temuanList.isNotEmpty ? const Color(0xFFD97706) : const Color(0xFF059669),
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${r['totalTiang']}',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy700),
                    ),
                    const Text('TIANG', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8))),
                  ],
                ),
                const SizedBox(width: 6),
                const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _tambahRealisasi() async {
    final r = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _RealisasiSheet(),
    );
    if (r != null) setState(() => realisasi.add(r));
  }
}

class _RealisasiSheet extends StatefulWidget {
  const _RealisasiSheet();

  @override
  State<_RealisasiSheet> createState() => _RealisasiSheetState();
}

class _RealisasiSheetState extends State<_RealisasiSheet> {
  final penyulang = TextEditingController();
  final section = TextEditingController(text: 'Section A');
  final tiang = TextEditingController(text: '0');
  String tier = 'Tier 1';

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
            const Text('Tambah Realisasi Penyulang', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy700)),
            const Divider(height: 20),
            TextField(controller: penyulang, decoration: const InputDecoration(labelText: 'Nama Penyulang', hintText: 'Contoh: TBL-01')),
            const SizedBox(height: 10),
            TextField(controller: section, decoration: const InputDecoration(labelText: 'Section', hintText: 'Contoh: Section A')),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              value: tier,
              items: ['Tier 1', 'Tier 2', 'Tier 1 & 2'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(),
              onChanged: (x) => setState(() => tier = x!),
              decoration: const InputDecoration(labelText: 'Tier Inspeksi'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: tiang,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Total Tiang Inspeksi', hintText: '0'),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.navy700,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () {
                  if (penyulang.text.trim().isEmpty) return;
                  Navigator.pop(context, {
                    'penyulang': penyulang.text.trim(),
                    'section': section.text.trim(),
                    'tier': tier,
                    'totalTiang': tiang.text.trim(),
                    'temuan': <Map<String, dynamic>>[],
                  });
                },
                child: const Text('Simpan Realisasi', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PenyulangDetail extends StatefulWidget {
  final Map<String, dynamic> realisasi;
  const _PenyulangDetail({required this.realisasi});

  @override
  State<_PenyulangDetail> createState() => _PenyulangDetailState();
}

class _PenyulangDetailState extends State<_PenyulangDetail> {
  List<Map<String, dynamic>> get temuan => widget.realisasi['temuan'] as List<Map<String, dynamic>>;

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
            Text('Penyulang ${widget.realisasi['penyulang']}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            Text('${widget.realisasi['section']} • ${widget.realisasi['tier']}', style: const TextStyle(fontSize: 12, color: Colors.white70)),
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
                const Text('Data Realisasi Penyulang', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
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
                      _row('Penyulang', widget.realisasi['penyulang']),
                      _row('Section', widget.realisasi['section']),
                      _row('Tier', widget.realisasi['tier']),
                      _row('Total Tiang', '${widget.realisasi['totalTiang']} Tiang'),
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
              Text('Daftar Temuan (${temuan.length})', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
              Text('${temuan.length} Item', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 8),
          if (temuan.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Center(
                child: Text(
                  'Belum ada temuan untuk penyulang ini.\nTekan + Tambah Temuan di bawah.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                ),
              ),
            ),
          ...temuan.asMap().entries.map((e) {
            final t = e.value;
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
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
                          t['jenis'] ?? '-',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Tiang: ${t['tiang'] ?? '-'} • Prioritas: ${t['prioritas'] ?? 'Sedang'}',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                        if ((t['keterangan'] ?? '').toString().isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            t['keterangan'],
                            style: const TextStyle(fontSize: 12, color: Color(0xFF334155)),
                          ),
                        ],
                      ],
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
        onPressed: _tambahTemuan,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Tambah Temuan', style: TextStyle(fontWeight: FontWeight.bold)),
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

  Future<void> _tambahTemuan() async {
    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _TemuanSheet(),
    );
    if (result != null) {
      setState(() {
        temuan.add({
          'jenis': result['jenis'],
          'tiang': result['tiang'],
          'prioritas': result['prioritas'],
          'keterangan': result['keterangan'],
        });
      });
    }
  }
}

class _TemuanSheet extends StatefulWidget {
  const _TemuanSheet();

  @override
  State<_TemuanSheet> createState() => _TemuanSheetState();
}

class _TemuanSheetState extends State<_TemuanSheet> {
  final jenis = TextEditingController();
  final tiang = TextEditingController();
  final keterangan = TextEditingController();
  String prioritas = 'Sedang';

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
            const Text('Tambah Temuan Lapangan', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy700)),
            const Divider(height: 20),
            TextField(controller: jenis, decoration: const InputDecoration(labelText: 'Jenis Temuan', hintText: 'Pilih / isi dari db_List_Temuan')),
            const SizedBox(height: 10),
            TextField(controller: tiang, decoration: const InputDecoration(labelText: 'Nomor Tiang', hintText: 'Contoh: 07')),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              value: prioritas,
              items: ['Tinggi', 'Sedang', 'Rendah'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(),
              onChanged: (x) => setState(() => prioritas = x!),
              decoration: const InputDecoration(labelText: 'Prioritas Penanganan'),
            ),
            const SizedBox(height: 10),
            TextField(controller: keterangan, maxLines: 3, decoration: const InputDecoration(labelText: 'Keterangan Temuan', hintText: 'Tulis detail kondisi di lapangan...')),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.navy700,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () {
                  if (jenis.text.trim().isEmpty) return;
                  Navigator.pop(context, {
                    'jenis': jenis.text.trim(),
                    'tiang': tiang.text.trim(),
                    'prioritas': prioritas,
                    'keterangan': keterangan.text.trim(),
                  });
                },
                child: const Text('Simpan Temuan', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
