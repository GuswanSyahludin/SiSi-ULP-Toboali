import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../db/repositories/master_repository.dart';
import '../services/api_service.dart';
import '../theme/app_colors.dart';

class LaporanRowScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String? targetSubTim;
  const LaporanRowScreen({super.key, required this.sesi, this.targetSubTim});

  @override
  State<LaporanRowScreen> createState() => _LaporanRowScreenState();
}

class _LaporanRowScreenState extends State<LaporanRowScreen> {
  final List<Map<String, dynamic>> _laporanList = [];
  bool _loading = true;

  String get _activeSubTim =>
      widget.targetSubTim ??
      widget.sesi['subTim'] ??
      widget.sesi['tim'] ??
      'ROW 01';

  @override
  void initState() {
    super.initState();
    _loadLaporan();
  }

  String _namaHari(int weekday) {
    const list = [
      'Senin',
      'Selasa',
      'Rabu',
      'Kamis',
      'Jumat',
      'Sabtu',
      'Minggu'
    ];
    return list[(weekday - 1) % 7];
  }

  String _tanggalHariIni(DateTime d) {
    const bulan = [
      '',
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember'
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
        'tim': 'ROW',
        'subTim': _activeSubTim,
        'petugas': widget.sesi['username'] ?? widget.sesi['nama'] ?? '-',
        'koordinatAwal': '-2.998123, 106.456123',
        'koordinatAkhir': '-2.999456, 106.458789',
        'kmAwal': '12.4',
        'kmAkhir': '18.9',
        'kendala': '-',
        'status': 'DRAFT LOKAL',
        'realisasi': <Map<String, dynamic>>[
          {
            'penyulang': 'TBL-01',
            'section': 'Section A',
            'rabas': 10,
            'sedang': 2,
            'besar': 0,
            'eksekusi': <Map<String, dynamic>>[
              {
                'kodeEksekusi': 'EKS-01',
                'penyulang': 'TBL-01',
                'section': 'Section A',
                'nomorTiang': '07',
                'koordinatTiang': '-2.998123, 106.456123',
                'koordinat': '-2.998123, 106.456123',
                'diameter': 0,
                'jenisPekerjaan': 'Rabas / Pangkas',
                'fotoSebelum':
                    'https://placehold.co/400x300/png?text=Foto+Sebelum',
                'fotoPekerjaan':
                    'https://placehold.co/400x300/png?text=Foto+Pekerjaan',
                'fotoSesudah':
                    'https://placehold.co/400x300/png?text=Foto+Sesudah',
                'tahap': 3,
              },
              {
                'kodeEksekusi': 'EKS-02',
                'penyulang': 'TBL-01',
                'section': 'Section A',
                'nomorTiang': '09',
                'koordinatTiang': '-2.998543, 106.456890',
                'koordinat': '-2.998543, 106.456890',
                'diameter': 45,
                'jenisPekerjaan': 'Tebang Sedang',
                'fotoSebelum':
                    'https://placehold.co/400x300/png?text=Foto+Sebelum',
                'fotoPekerjaan': '',
                'fotoSesudah': '',
                'tahap': 1,
              },
            ],
          },
          {
            'penyulang': 'TBL-02',
            'section': '-',
            'rabas': 0,
            'sedang': 0,
            'besar': 0,
            'eksekusi': <Map<String, dynamic>>[],
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
        'tim': 'ROW',
        'subTim': _activeSubTim,
        'petugas': widget.sesi['username'] ?? widget.sesi['nama'] ?? '-',
        'koordinatAwal': '',
        'koordinatAkhir': '',
        'kmAwal': '',
        'kmAkhir': '',
        'kendala': '',
        'status': 'DRAFT LOKAL',
        'realisasi': <Map<String, dynamic>>[],
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
            const Text('Laporan Harian ROW',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
            Text('$_activeSubTim • ${widget.sesi['ulp'] ?? 'Toboali'}',
                style: const TextStyle(fontSize: 12, color: Colors.white70)),
          ],
        ),
        actions: [
          IconButton(
              onPressed: _loadLaporan, icon: const Icon(Icons.refresh_rounded))
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _laporanList.isEmpty
              ? const Center(child: Text('Belum ada laporan harian ROW.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _laporanList.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, index) =>
                      _buildLaporanCard(_laporanList[index]),
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
    final real = (item['realisasi'] as List? ?? []);
    final totalPohon = real.fold<int>(
      0,
      (sum, r) =>
          sum +
          ((r['rabas'] as int? ?? 0) +
              (r['sedang'] as int? ?? 0) +
              (r['besar'] as int? ?? 0)),
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
          style: const TextStyle(
              fontWeight: FontWeight.w900, color: AppColors.navy700),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            '${item['hari']}, ${item['tanggal']} • ${item['subTim']}\n${real.length} Penyulang • $totalPohon Titik Pohon',
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
                border: Border.all(
                    color: isDraft
                        ? Colors.amber.shade300
                        : Colors.green.shade300),
              ),
              child: Text(
                item['status'] ?? 'DRAFT LOKAL',
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  color:
                      isDraft ? Colors.amber.shade900 : Colors.green.shade900,
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
            builder: (_) => _LaporanRowDetailScreen(
              sesi: widget.sesi,
              item: item,
            ),
          ),
        ).then((_) => setState(() {})),
      ),
    );
  }
}

class _LaporanRowDetailScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final Map<String, dynamic> item;
  const _LaporanRowDetailScreen({required this.sesi, required this.item});

  @override
  State<_LaporanRowDetailScreen> createState() =>
      _LaporanRowDetailScreenState();
}

class _LaporanRowDetailScreenState extends State<_LaporanRowDetailScreen> {
  int tab = 0;
  List<Map<String, dynamic>> get realisasi =>
      widget.item['realisasi'] as List<Map<String, dynamic>>;

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
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Detail Laporan ROW',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            Text(
                '${widget.item['hari'] ?? ''}, ${widget.item['tanggal'] ?? ''}',
                style: const TextStyle(fontSize: 12, color: Colors.white70)),
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
                Expanded(
                    child: _tabButton('2. Realisasi (${realisasi.length})', 1)),
              ],
            ),
          ),
          Expanded(child: tab == 0 ? _detailHeader() : _realisasiList()),
        ],
      ),
      floatingActionButton: tab == 1
          ? FloatingActionButton.extended(
              backgroundColor: AppColors.navy700,
              foregroundColor: Colors.white,
              onPressed: _tambahRealisasi,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Tambah Penyulang',
                  style: TextStyle(fontWeight: FontWeight.bold)),
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

    final totalRabas =
        realisasi.fold<int>(0, (s, r) => s + (r['rabas'] as int? ?? 0));
    final totalSedang =
        realisasi.fold<int>(0, (s, r) => s + (r['sedang'] as int? ?? 0));
    final totalBesar =
        realisasi.fold<int>(0, (s, r) => s + (r['besar'] as int? ?? 0));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSectionCard('1. Informasi Laporan (db_Global_Header)', [
          _buildDetailRow('Kode Header', widget.item['kodeHeader']),
          _buildDetailRow('Hari / Tanggal',
              '${widget.item['hari'] ?? '-'}, ${widget.item['tanggal'] ?? '-'}'),
          _buildDetailRow(
              'ULP / Tim', '${widget.item['ulp']} / ${widget.item['subTim']}'),
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
        _buildSectionCard('3. Rekap Realisasi ROW', [
          _buildDetailRow('Jumlah Penyulang', '${realisasi.length} Penyulang'),
          _buildDetailRow('Rabas / Pangkas', '$totalRabas Gawang'),
          _buildDetailRow('Tebang Sedang (Ø ≤ 50cm)', '$totalSedang Batang'),
          _buildDetailRow('Tebang Besar (Ø > 50cm)', '$totalBesar Batang'),
          _buildDetailRow('Total Titik Pohon',
              '${totalRabas + totalSedang + totalBesar} Titik'),
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
          Text(title,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0284C7))),
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
          Text(label,
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          const SizedBox(width: 8),
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

  Widget _buildKoorRow(String label, String koor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          const SizedBox(width: 8),
          InkWell(
            onTap: () => _openMaps(koor),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.location_on_rounded,
                    size: 14, color: Color(0xFFEF4444)),
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

  Widget _realisasiList() {
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
        final eksList = (r['eksekusi'] as List? ?? []);
        final rabas = r['rabas'] ?? 0;
        final sedang = r['sedang'] ?? 0;
        final besar = r['besar'] ?? 0;
        final totalPohon = rabas + sedang + besar;

        return InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => _PenyulangEksekusiRowScreen(
                sesi: widget.sesi,
                subTim: widget.item['subTim'] ?? 'ROW 01',
                realisasi: r,
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
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0284C7)),
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
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${r['section']} • $rabas Rabas, $sedang Sedang, $besar Besar',
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${eksList.length} Titik Pekerjaan',
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF059669)),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '$totalPohon',
                      style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.navy700),
                    ),
                    const Text('POHON',
                        style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF94A3B8))),
                  ],
                ),
                const SizedBox(width: 6),
                const Icon(Icons.chevron_right_rounded,
                    color: Color(0xFF94A3B8)),
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
      builder: (_) => const _RealisasiRowSheet(),
    );
    if (r != null) {
      setState(() => realisasi.add(r));
    }
  }
}

class _RealisasiRowSheet extends StatefulWidget {
  const _RealisasiRowSheet();

  @override
  State<_RealisasiRowSheet> createState() => _RealisasiRowSheetState();
}

class _RealisasiRowSheetState extends State<_RealisasiRowSheet> {
  String? _selectedPenyulang;
  List<String> _listPenyulang = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPenyulang();
  }

  Future<void> _loadPenyulang() async {
    try {
      final repo = MasterRepository();
      final lokal = await repo.daftarPenyulang();
      if (lokal.isNotEmpty) {
        if (!mounted) return;
        setState(() {
          _listPenyulang = lokal;
          _selectedPenyulang = lokal.first;
          _loading = false;
        });
        return;
      }
    } catch (_) {}

    if (!mounted) return;
    setState(() {
      _listPenyulang = ['TBL-01', 'TBL-02', 'TBL-03', 'TBL-04', 'TBL-05'];
      _selectedPenyulang = _listPenyulang.first;
      _loading = false;
    });
  }

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
                decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const Text('Pilih Penyulang',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.navy700)),
            const Divider(height: 20),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(20),
                child: Center(child: CircularProgressIndicator()),
              )
            else
              DropdownButtonFormField<String>(
                value: _selectedPenyulang,
                decoration: InputDecoration(
                  labelText: 'Penyulang',
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10)),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
                items: _listPenyulang
                    .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                    .toList(),
                onChanged: (val) => setState(() => _selectedPenyulang = val),
              ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.navy700,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: _selectedPenyulang == null
                    ? null
                    : () {
                        Navigator.pop(context, {
                          'penyulang': _selectedPenyulang,
                          'section': '-',
                          'rabas': 0,
                          'sedang': 0,
                          'besar': 0,
                          'eksekusi': <Map<String, dynamic>>[],
                        });
                      },
                child: const Text('Simpan Penyulang',
                    style: TextStyle(
                        fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PenyulangEksekusiRowScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String subTim;
  final Map<String, dynamic> realisasi;
  final VoidCallback onUpdated;

  const _PenyulangEksekusiRowScreen({
    required this.sesi,
    required this.subTim,
    required this.realisasi,
    required this.onUpdated,
  });

  @override
  State<_PenyulangEksekusiRowScreen> createState() =>
      _PenyulangEksekusiRowScreenState();
}

class _PenyulangEksekusiRowScreenState
    extends State<_PenyulangEksekusiRowScreen> {
  List<Map<String, dynamic>> get eksekusiList =>
      widget.realisasi['eksekusi'] as List<Map<String, dynamic>>;

  void _recalcRealisasi() {
    int rabas = 0, sedang = 0, besar = 0;
    final Set<String> setSection = {};

    for (final e in eksekusiList) {
      final sec = (e['section'] ?? '').toString().trim();
      if (sec.isNotEmpty && sec != '-') setSection.add(sec);

      final dia = num.tryParse('${e['diameter']}') ?? 0;
      if (dia > 50)
        besar++;
      else if (dia > 0)
        sedang++;
      else
        rabas++;
    }

    widget.realisasi['section'] =
        setSection.isEmpty ? '-' : setSection.join(' - ');
    widget.realisasi['rabas'] = rabas;
    widget.realisasi['sedang'] = sedang;
    widget.realisasi['besar'] = besar;
    widget.onUpdated();
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
    final rabas = widget.realisasi['rabas'] ?? 0;
    final sedang = widget.realisasi['sedang'] ?? 0;
    final besar = widget.realisasi['besar'] ?? 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Penyulang ${widget.realisasi['penyulang']}',
                style:
                    const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            Text('${widget.realisasi['section']} • Realisasi',
                style: const TextStyle(fontSize: 12, color: Colors.white70)),
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
                const Text('Data Realisasi Penyulang',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0284C7))),
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
                      _row('Rabas / Pangkas', '$rabas Gawang'),
                      _row('Tebang Sedang / Besar', '$sedang / $besar Batang'),
                      _row('Total Pohon', '${rabas + sedang + besar} Titik'),
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
              Text('Daftar Eksekusi Titik (${eksekusiList.length})',
                  style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A))),
              Text('${eksekusiList.length} Titik',
                  style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                      fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 8),
          if (eksekusiList.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Center(
                child: Text(
                  'Belum ada pekerjaan di penyulang ini.\nTekan + Tambah Eksekusi di bawah.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                ),
              ),
            ),
          ...eksekusiList.asMap().entries.map((e) {
            final item = e.value;
            final tahap = item['tahap'] ?? 1;
            final warna =
                tahap >= 3 ? const Color(0xFF059669) : const Color(0xFFD97706);

            return InkWell(
              onTap: () => _lanjutFoto(item),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          item['jenisPekerjaan'] ?? 'Rabas / Pangkas',
                          style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A)),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: warna.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: warna),
                          ),
                          child: Text(
                            '$tahap/3 ${tahap >= 3 ? 'Selesai' : 'Progres'}',
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: warna),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                        'Section: ${item['section'] ?? '-'} • Tiang: ${item['nomorTiang']} • Diameter: ${item['diameter']} cm',
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFF64748B))),
                    const SizedBox(height: 4),
                    InkWell(
                      onTap: () => _openMaps(item['koordinat'] ?? ''),
                      child: Row(
                        children: [
                          const Icon(Icons.location_on_rounded,
                              size: 14, color: Color(0xFFEF4444)),
                          const SizedBox(width: 2),
                          Text(
                            item['koordinat'] ?? '-',
                            style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF0284C7),
                                decoration: TextDecoration.underline),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                            child: _fotoBadge('Sebelum', item['fotoSebelum'])),
                        const SizedBox(width: 6),
                        Expanded(
                            child:
                                _fotoBadge('Pekerjaan', item['fotoPekerjaan'])),
                        const SizedBox(width: 6),
                        Expanded(
                            child: _fotoBadge('Sesudah', item['fotoSesudah'])),
                      ],
                    ),
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
        onPressed: _tambahEksekusi,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Tambah Eksekusi',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _fotoBadge(String label, dynamic url) {
    final ada = url != null && url.toString().isNotEmpty;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: ada ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
            color: ada ? const Color(0xFF10B981) : const Color(0xFFCBD5E1)),
      ),
      alignment: Alignment.center,
      child: Text(
        '$label ${ada ? '✓' : '-'}',
        style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: ada ? const Color(0xFF059669) : const Color(0xFF64748B)),
      ),
    );
  }

  Widget _row(String label, dynamic value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            Text('${value ?? '-'}',
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A))),
          ],
        ),
      );

  Future<void> _tambahEksekusi() async {
    final res = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FormEksekusiSheet(
        sesi: widget.sesi,
        subTim: widget.subTim,
        penyulangOtomatis: widget.realisasi['penyulang'] ?? '',
      ),
    );
    if (res != null) {
      setState(() {
        eksekusiList.add(res);
        _recalcRealisasi();
      });
    }
  }

  Future<void> _lanjutFoto(Map<String, dynamic> item) async {
    final tahap = item['tahap'] ?? 1;
    if (tahap >= 3) return;

    final picker = ImagePicker();
    final picked =
        await picker.pickImage(source: ImageSource.camera, imageQuality: 70);
    if (picked != null) {
      setState(() {
        if (tahap == 1) {
          item['fotoPekerjaan'] = picked.path;
          item['tahap'] = 2;
        } else if (tahap == 2) {
          item['fotoSesudah'] = picked.path;
          item['tahap'] = 3;
        }
        _recalcRealisasi();
      });
    }
  }
}

class _FormEksekusiSheet extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String subTim;
  final String penyulangOtomatis;

  const _FormEksekusiSheet({
    required this.sesi,
    required this.subTim,
    required this.penyulangOtomatis,
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
  String? _selectedSection;
  List<String> _listSection = [];

  File? _fotoSebelum;
  File? _fotoPekerjaan;
  File? _fotoSesudah;

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadSection();
  }

  Future<void> _loadSection() async {
    try {
      final repo = MasterRepository();
      final mapS = await repo.sectionByPenyulang();
      final listS = List<String>.from(mapS[widget.penyulangOtomatis] ?? []);
      if (listS.isNotEmpty) {
        if (!mounted) return;
        setState(() {
          _listSection = listS;
          _selectedSection = listS.first;
          _loadingDropdown = false;
        });
        return;
      }
    } catch (_) {}

    if (!mounted) return;
    setState(() {
      _listSection = ['Section A', 'Section B', 'Section C', 'Section D'];
      _selectedSection = _listSection.first;
      _loadingDropdown = false;
    });
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

  Future<void> _pickSlot(int slot) async {
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
                    if (slot == 1) _fotoSebelum = File(picked.path);
                    if (slot == 2) _fotoPekerjaan = File(picked.path);
                    if (slot == 3) _fotoSesudah = File(picked.path);
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
                    if (slot == 1) _fotoSebelum = File(picked.path);
                    if (slot == 2) _fotoPekerjaan = File(picked.path);
                    if (slot == 3) _fotoSesudah = File(picked.path);
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
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    children: [
                      const Text('Penyulang',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        isExpanded: true,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                          filled: true,
                          fillColor: const Color(0xFFF1F5F9),
                        ),
                        value: widget.penyulangOtomatis,
                        items: [
                          DropdownMenuItem(
                            value: widget.penyulangOtomatis,
                            child: Text(widget.penyulangOtomatis,
                                overflow: TextOverflow.ellipsis),
                          )
                        ],
                        onChanged: null,
                      ),
                      const SizedBox(height: 12),
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
                        items: _listSection
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
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.my_location,
                                color: Color(0xFF0284C7)),
                            onPressed: () =>
                                _getCurrentLocation(_koorTiangCtrl),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
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
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.my_location,
                                color: Color(0xFF0284C7)),
                            onPressed: () =>
                                _getCurrentLocation(_koorPekerjaanCtrl),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
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
                      const Text('Foto Pekerjaan (Sebelum, Pekerjaan, Sesudah)',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                              child: _buildImagePickerSlot(
                                  'Sebelum', _fotoSebelum, () => _pickSlot(1))),
                          const SizedBox(width: 8),
                          Expanded(
                              child: _buildImagePickerSlot('Pekerjaan',
                                  _fotoPekerjaan, () => _pickSlot(2))),
                          const SizedBox(width: 8),
                          Expanded(
                              child: _buildImagePickerSlot(
                                  'Sesudah', _fotoSesudah, () => _pickSlot(3))),
                        ],
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.navy700,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: () {
                            final diaNum =
                                num.tryParse(_diameterCtrl.text.trim()) ?? 0;
                            int tahapFinal = 1;
                            if (_fotoSesudah != null)
                              tahapFinal = 3;
                            else if (_fotoPekerjaan != null) tahapFinal = 2;

                            Navigator.pop(context, {
                              'penyulang': widget.penyulangOtomatis,
                              'section': _selectedSection ?? 'Section A',
                              'nomorTiang': _tiangCtrl.text.trim().isEmpty
                                  ? '-'
                                  : _tiangCtrl.text.trim(),
                              'koordinatTiang': _koorTiangCtrl.text.trim(),
                              'koordinat':
                                  _koorPekerjaanCtrl.text.trim().isNotEmpty
                                      ? _koorPekerjaanCtrl.text.trim()
                                      : _koorTiangCtrl.text.trim(),
                              'diameter': diaNum,
                              'jenisPekerjaan': curJenis,
                              'fotoSebelum': _fotoSebelum?.path ?? '',
                              'fotoPekerjaan': _fotoPekerjaan?.path ?? '',
                              'fotoSesudah': _fotoSesudah?.path ?? '',
                              'tahap': tahapFinal,
                            });
                          },
                          child: const Text('Simpan Eksekusi',
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

  Widget _buildImagePickerSlot(String label, File? file, VoidCallback onTap) {
    return Container(
      height: 80,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: file != null
                ? const Color(0xFF10B981)
                : const Color(0xFFCBD5E1)),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: file != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(9),
                child: Image.file(file, fit: BoxFit.cover),
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.add_a_photo,
                      size: 20, color: Color(0xFF64748B)),
                  const SizedBox(height: 4),
                  Text(label,
                      style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF64748B))),
                ],
              ),
      ),
    );
  }
}
