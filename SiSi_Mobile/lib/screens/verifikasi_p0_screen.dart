import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../widgets/custom_loading_widget.dart';

class VerifikasiP0Screen extends StatefulWidget {
  final Map<String, dynamic> sesi;

  const VerifikasiP0Screen({super.key, required this.sesi});

  @override
  State<VerifikasiP0Screen> createState() => _VerifikasiP0ScreenState();
}

class _VerifikasiP0ScreenState extends State<VerifikasiP0Screen> {
  String _selectedStatus = 'Menunggu';
  bool _isLoading = true;
  List<dynamic> _listP0 = [];

  String get _currentUlp => widget.sesi['ulp'] ?? 'Toboali';
  String get _currentUsername => widget.sesi['username'] ?? 'Admin';

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    final res = await ApiService.getApprovalP0List(
      ulp: _currentUlp,
      status: _selectedStatus,
    );
    if (mounted) {
      setState(() {
        _isLoading = false;
        if (res['ok'] == true) {
          _listP0 = res['list'] ?? [];
        } else {
          _listP0 = [];
        }
      });
    }
  }

  Future<void> _prosesApproval(
    String kodeP0,
    String keputusan, {
    String alasan = '',
  }) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Dialog(
        backgroundColor: Colors.transparent,
        child: CustomLoadingWidget(message: 'Memproses keputusan...'),
      ),
    );

    final res = await ApiService.setApprovalP0(
      kodeP0: kodeP0,
      keputusan: keputusan,
      username: _currentUsername,
      alasan: alasan,
    );

    if (mounted) {
      Navigator.pop(context); // Tutup loader
      if (res['ok'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              keputusan == 'Approved'
                  ? 'Data $kodeP0 berhasil disetujui! Bobot poin: ${res['point'] ?? '-'}'
                  : 'Data $kodeP0 berhasil ditolak.',
            ),
            backgroundColor: keputusan == 'Approved'
                ? const Color(0xFF10B981)
                : const Color(0xFFEF4444),
          ),
        );
        _fetchData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal: ${res['error']}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showRejectDialog(String kodeP0) {
    final TextEditingController reasonCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          top: 20,
          left: 20,
          right: 20,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Tolak Verifikasi P0',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Kode P0: $kodeP0',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: Color(0xFF0284C7),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              maxLines: 3,
              decoration: InputDecoration(
                hintText:
                    'Tuliskan alasan penolakan (Wajib disimpan di kolom AQ)...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                onPressed: () {
                  if (reasonCtrl.text.trim().isEmpty) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(
                        content: Text('Alasan penolakan wajib diisi!'),
                      ),
                    );
                    return;
                  }
                  Navigator.pop(ctx);
                  _prosesApproval(
                    kodeP0,
                    'Rejected',
                    alasan: reasonCtrl.text.trim(),
                  );
                },
                child: const Text(
                  'Konfirmasi Tolak',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showDetailModal(String kodeP0) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Dialog(
        backgroundColor: Colors.transparent,
        child: CustomLoadingWidget(message: 'Memuat lampiran detail P0...'),
      ),
    );

    final res = await ApiService.getLampiranPengecekanP0(kodeP0);
    if (!mounted) return;
    Navigator.pop(context); // Tutup loader

    if (res['ok'] != true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memuat detail: ${res['error']}'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final p0 = res['p0'] ?? {};
    final List switching = res['switching'] ?? [];
    final List gardu = res['gardu'] ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(ctx).size.height * 0.88,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.symmetric(vertical: 10),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Detail Verifikasi P0',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          kodeP0,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF0284C7),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _buildSectionHeader(
                    Icons.info_outline,
                    '1. Informasi Pekerjaan',
                  ),
                  _buildDetailRow('Pekerjaan', p0['namaPekerjaan'] ?? '-'),
                  _buildDetailRow('Penyulang', p0['penyulang'] ?? '-'),
                  _buildDetailRow('Daerah', p0['daerah'] ?? '-'),
                  _buildDetailRow('Tanggal', p0['tanggal'] ?? '-'),
                  const SizedBox(height: 16),

                  _buildSectionHeader(
                    Icons.photo_library_outlined,
                    '2. Tiga Foto Watermark P0',
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _buildPhotoBox('Sebelum', p0['fotoSebelum']?['thumb']),
                      const SizedBox(width: 8),
                      _buildPhotoBox(
                        'Pekerjaan',
                        p0['fotoPekerjaan']?['thumb'],
                      ),
                      const SizedBox(width: 8),
                      _buildPhotoBox('Sesudah', p0['fotoSesudah']?['thumb']),
                    ],
                  ),
                  const SizedBox(height: 16),

                  if (switching.isNotEmpty) ...[
                    _buildSectionHeader(
                      Icons.tune,
                      '3. Lampiran Pengecekan Switching',
                    ),
                    ...switching.map(
                      (s) => Container(
                        margin: const EdgeInsets.only(top: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFBAE6FD)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${s['namaSwitching']} (${s['jamPengecekan']})',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0284C7),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Arus R/S/T: ${s['arusR']} / ${s['arusS']} / ${s['arusT']} A',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Indikator: Remote (${s['indikatorRemote']}) • Local (${s['indikatorLocal']}) • Protection (${s['indicatorProtection']})',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  if (gardu.isNotEmpty) ...[
                    _buildSectionHeader(
                      Icons.electric_bolt_outlined,
                      '4. Lampiran Pengukuran Gardu',
                    ),
                    ...gardu.map(
                      (g) => Container(
                        margin: const EdgeInsets.only(top: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Gardu ${g['noGardu']} - ${g['alamat']}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFD97706),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Beban Utama (A): R:${g['bebanR']} S:${g['bebanS']} T:${g['bebanT']} N:${g['bebanN']}',
                              style: const TextStyle(fontSize: 12),
                            ),
                            Text(
                              'Tegangan (V): R-S:${g['tegRS']} S-T:${g['tegST']} R-N:${g['tegRN']}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF78350F),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFEF4444),
                        side: const BorderSide(color: Color(0xFFEF4444)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: () {
                        Navigator.pop(ctx);
                        _showRejectDialog(kodeP0);
                      },
                      child: const Text(
                        'Tolak (Reject)',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: () {
                        Navigator.pop(ctx);
                        _prosesApproval(kodeP0, 'Approved');
                      },
                      child: const Text(
                        'Setujui (Approve)',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(IconData icon, String title) {
    return Row(
      children: [
        Icon(icon, size: 16, color: const Color(0xFF0284C7)),
        const SizedBox(width: 6),
        Text(
          title,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Color(0xFF334155),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoBox(String title, String? url) {
    return Expanded(
      child: Container(
        height: 75,
        decoration: BoxDecoration(
          color: Colors.grey.shade200,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey.shade300),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (url != null && url.isNotEmpty)
              Image.network(
                url,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const Icon(Icons.broken_image),
              )
            else
              const Icon(Icons.image, color: Colors.grey),
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                color: Colors.black.withOpacity(0.65),
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        iconTheme: const IconThemeData(color: const Color(0xFF0F172A)),
        elevation: 0.5,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Verifikasi P0',
              style: TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              '$_currentUlp • db_Yandal_P0',
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF0284C7)),
            onPressed: _fetchData,
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: ['Menunggu', 'Approved', 'Rejected'].map((status) {
                final isSelected = _selectedStatus == status;
                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _selectedStatus = status);
                      _fetchData();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFF0284C7)
                            : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        status,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isSelected
                              ? Colors.white
                              : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const CustomLoadingWidget(
                    message: 'Memuat data verifikasi...',
                  )
                : _listP0.isEmpty
                ? const Center(
                    child: Text(
                      'Tidak ada data pada status ini',
                      style: TextStyle(color: Color(0xFF94A3B8)),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _listP0.length,
                    itemBuilder: (ctx, i) {
                      final item = _listP0[i];
                      return Card(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 0.5,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () => _showDetailModal(item['kodeP0']),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      item['kodeP0'] ?? '',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0284C7),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 3,
                                      ),
                                      decoration: BoxDecoration(
                                        color: item['status'] == 'Approved'
                                            ? const Color(0xFFDCFCE7)
                                            : item['status'] == 'Rejected'
                                            ? const Color(0xFFFEE2E2)
                                            : const Color(0xFFFEF3C7),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        item['status'] ?? 'Menunggu',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          color: item['status'] == 'Approved'
                                              ? const Color(0xFF15803D)
                                              : item['status'] == 'Rejected'
                                              ? const Color(0xFFB91C1C)
                                              : const Color(0xFFB45309),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  item['namaPekerjaan'] ?? '-',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Penyulang: ${item['penyulang'] ?? '-'} • Petugas: ${item['petugas'] ?? '-'}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    _buildPhotoBox(
                                      'Sebelum',
                                      item['fotoSebelum']?['thumb'],
                                    ),
                                    const SizedBox(width: 6),
                                    _buildPhotoBox(
                                      'Pekerjaan',
                                      item['fotoPekerjaan']?['thumb'],
                                    ),
                                    const SizedBox(width: 6),
                                    _buildPhotoBox(
                                      'Sesudah',
                                      item['fotoSesudah']?['thumb'],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
