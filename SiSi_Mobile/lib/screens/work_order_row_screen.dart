import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../db/repositories/delta_sync_repository.dart';
import '../theme/app_colors.dart';
import '../widgets/custom_loading_widget.dart';

/// Work Order ROW, local-first dari mirror db_INS_Temuan.
///
/// Kriteria tetap:
/// - Status WO = Progress Pekerjaan
/// - Tim Eksekusi = targetSubTim/subTim user
/// - Bila target tim generik "ROW", semua Tim Eksekusi yang mengandung ROW
///   ditampilkan. Jadi Super User dapat membuka ROW 01..04 secara spesifik,
///   sementara akun ROW otomatis hanya melihat WO timnya sendiri.
class WorkOrderRowScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String? targetSubTim;
  final VoidCallback? onBack;

  const WorkOrderRowScreen({
    super.key,
    required this.sesi,
    this.targetSubTim,
    this.onBack,
  });

  @override
  State<WorkOrderRowScreen> createState() => _WorkOrderRowScreenState();
}

class _WorkOrderRowScreenState extends State<WorkOrderRowScreen> {
  final search = TextEditingController();
  List<Map<String, dynamic>> rows = [];
  bool loading = true;

  String get targetTeam => (widget.targetSubTim ??
          widget.sesi['subTim'] ??
          widget.sesi['tim'] ??
          'ROW')
      .toString()
      .trim();

  @override
  void initState() {
    super.initState();
    search.addListener(() => setState(() {}));
    _load();
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final source = await DeltaSyncRepository().rows('db_INS_Temuan');
    final out = <Map<String, dynamic>>[];
    for (final raw in source) {
      if (raw is! List || raw.length < 45) continue;
      final status = '${raw[26]}'.trim();
      final team = '${raw[29]}'.trim();
      if (status.toLowerCase() != 'progress pekerjaan') continue;
      if (!_teamMatches(team)) continue;
      out.add({
        'kodeHeader': '${raw[1]}'.trim(),
        'kodePekerjaan': '${raw[3]}'.trim(),
        'ulp': '${raw[4]}'.trim(),
        'tanggal': '${raw[6]}'.trim(),
        'timInspeksi': '${raw[7]}'.trim(),
        'objek': '${raw[8]}'.trim(),
        'penyulang': '${raw[9]}'.trim(),
        'section': '${raw[10]}'.trim(),
        'segmen': '${raw[11]}'.trim(),
        'nomorTiang': '${raw[12]}'.trim(),
        'nomorGardu': '${raw[13]}'.trim(),
        'tier': '${raw[14]}'.trim(),
        'temuan': '${raw[15]}'.trim(),
        'fotoTemuanUrl': '${raw[17]}'.trim(),
        'fotoTiangUrl': '${raw[19]}'.trim(),
        'deskripsi': '${raw[20]}'.trim(),
        'koordinat': '${raw[21]}'.trim(),
        'timEksekusi': team,
        'catatan': '${raw[30]}'.trim(),
      });
    }
    out.sort((a, b) {
      final t = '${b['tanggal']}'.compareTo('${a['tanggal']}');
      return t != 0
          ? t
          : '${b['kodePekerjaan']}'.compareTo('${a['kodePekerjaan']}');
    });
    if (!mounted) return;
    setState(() {
      rows = out;
      loading = false;
    });
  }

  bool _teamMatches(String team) {
    final current = team.toLowerCase();
    final target = targetTeam.toLowerCase();
    if (!current.contains('row')) return false;
    if (target.isEmpty || target == 'row' || target == 'tim row') return true;
    return current == target;
  }

  List<Map<String, dynamic>> get filtered {
    final q = search.text.trim().toLowerCase();
    if (q.isEmpty) return rows;
    return rows.where((row) {
      return [
        'kodePekerjaan',
        'temuan',
        'penyulang',
        'section',
        'nomorTiang',
        'nomorGardu',
        'catatan',
      ].any((key) => '${row[key] ?? ''}'.toLowerCase().contains(q));
    }).toList();
  }

  void _back() {
    if (widget.onBack != null) {
      widget.onBack!();
    } else {
      Navigator.maybePop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = filtered;
    return Stack(children: [
      Scaffold(
        backgroundColor: const Color(0xFFF5F7FB),
        appBar: AppBar(
          backgroundColor: AppColors.navy700,
          foregroundColor: Colors.white,
          leading: IconButton(
            onPressed: _back,
            icon: const Icon(Icons.arrow_back_rounded),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Work Order (WO)',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
              Text(targetTeam,
                  style: const TextStyle(fontSize: 11, color: Colors.white70)),
            ],
          ),
        ),
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(15, 14, 15, 8),
            child: TextField(
              controller: search,
              decoration: InputDecoration(
                hintText: 'Cari nomor, temuan, penyulang...',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: search.text.isEmpty
                    ? null
                    : IconButton(
                        onPressed: search.clear,
                        icon: const Icon(Icons.close_rounded)),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(17, 2, 17, 10),
            child: Row(children: [
              Text('${data.length} WO berjalan',
                  style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: AppColors.navy700)),
              const Spacer(),
              const Icon(Icons.storage_rounded,
                  size: 14, color: AppColors.success700),
              const SizedBox(width: 4),
              const Text('Data lokal',
                  style: TextStyle(
                      fontSize: 10, color: AppColors.neutral500)),
            ]),
          ),
          Expanded(
            child: data.isEmpty && !loading
                ? _empty()
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(14, 0, 14, 24),
                      itemCount: data.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) => _card(data[i]),
                    ),
                  ),
          ),
        ]),
      ),
      if (loading)
        const Positioned.fill(
          child: Material(
            color: Color(0xFFF5F7FB),
            child: SafeArea(
              child: CustomLoadingWidget(
                  message: 'Membuka Work Order lokal...', size: 88),
            ),
          ),
        ),
    ]);
  }

  Widget _card(Map<String, dynamic> row) {
    final coordinate = '${row['koordinat'] ?? ''}'.trim();
    final asset = '${row['nomorTiang'] ?? ''}'.trim().isNotEmpty
        ? 'Tiang ${row['nomorTiang']}'
        : '${row['nomorGardu'] ?? ''}'.trim().isNotEmpty
            ? 'Gardu ${row['nomorGardu']}'
            : '-';
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.neutral200),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _gallery(row),
        Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${row['kodePekerjaan'] ?? '-'}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 10, color: AppColors.neutral500)),
            const SizedBox(height: 4),
            Text('${row['temuan'] ?? '-'}',
                style: const TextStyle(
                    fontSize: 15,
                    height: 1.25,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 11),
            _row('Tim Eksekusi', '${row['timEksekusi'] ?? '-'}'),
            _row('Objek / Aset', '${row['objek'] ?? '-'} · $asset'),
            _row('Penyulang', '${row['penyulang'] ?? '-'}'),
            _row('Section', '${row['section'] ?? '-'}'),
            _row('Tier', '${row['tier'] ?? '-'}'),
            _row('Tanggal', '${row['tanggal'] ?? '-'}'),
            if ('${row['catatan'] ?? ''}'.trim().isNotEmpty)
              _row('Catatan SPV', '${row['catatan']}'),
            if (coordinate.isNotEmpty) ...[
              const SizedBox(height: 10),
              InkWell(
                onTap: () => _maps(coordinate),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.cyan100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(children: [
                    const Icon(Icons.location_on_rounded,
                        color: AppColors.cyan600),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(coordinate,
                          style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: AppColors.navy700)),
                    ),
                    const Icon(Icons.open_in_new_rounded,
                        size: 17, color: AppColors.navy700),
                  ]),
                ),
              ),
            ],
          ]),
        ),
      ]),
    );
  }

  Widget _gallery(Map<String, dynamic> row) => SizedBox(
        height: 150,
        child: Row(children: [
          Expanded(
              child: _photo('Foto Temuan', '${row['fotoTemuanUrl'] ?? ''}')),
          const SizedBox(width: 3),
          Expanded(child: _photo('Foto Tiang', '${row['fotoTiangUrl'] ?? ''}')),
        ]),
      );

  Widget _photo(String label, String url) => InkWell(
        onTap: url.isEmpty ? null : () => _fullPhoto(label, url),
        child: Stack(fit: StackFit.expand, children: [
          if (url.isNotEmpty)
            Image.network(url,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _fallback())
          else
            _fallback(),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.transparent, Color(0xB000172A)],
              ),
            ),
          ),
          Positioned(
            left: 8,
            bottom: 8,
            child: Text(label,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w900)),
          ),
        ]),
      );

  Widget _fallback() => Container(
        color: AppColors.neutral200,
        child: const Icon(Icons.image_not_supported_outlined,
            color: AppColors.neutral400),
      );

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
              width: 88,
              child: Text(label,
                  style: const TextStyle(
                      fontSize: 10, color: AppColors.neutral500))),
          Expanded(
              child: Text(value.trim().isEmpty ? '-' : value,
                  style: const TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w800))),
        ]),
      );

  Widget _empty() => const Center(
        child: Padding(
          padding: EdgeInsets.all(30),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.assignment_turned_in_outlined,
                size: 48, color: AppColors.success700),
            SizedBox(height: 12),
            Text('Tidak ada Work Order aktif untuk tim ini.',
                textAlign: TextAlign.center,
                style: TextStyle(fontWeight: FontWeight.w900)),
          ]),
        ),
      );

  Future<void> _maps(String coordinate) async {
    final clean = coordinate.replaceAll(RegExp(r'\s+'), '');
    await launchUrl(
      Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(clean)}'),
      mode: LaunchMode.externalApplication,
    );
  }

  Future<void> _fullPhoto(String label, String url) => showDialog<void>(
        context: context,
        builder: (ctx) => Dialog.fullscreen(
          backgroundColor: AppColors.navy950,
          child: SafeArea(
            child: Column(children: [
              Row(children: [
                const SizedBox(width: 16),
                Expanded(
                    child: Text(label,
                        style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900))),
                IconButton(
                  onPressed: () => Navigator.pop(ctx),
                  icon: const Icon(Icons.close_rounded, color: Colors.white),
                ),
              ]),
              Expanded(
                child: InteractiveViewer(
                  minScale: .8,
                  maxScale: 5,
                  child: Center(child: Image.network(url, fit: BoxFit.contain)),
                ),
              ),
            ]),
          ),
        ),
      );
}
