import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../db/repositories/temuan_map_repository.dart';
import '../theme/app_colors.dart';

class PetaTemuanScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final VoidCallback? onBack;
  const PetaTemuanScreen({super.key, required this.sesi, this.onBack});

  @override
  State<PetaTemuanScreen> createState() => _PetaTemuanScreenState();
}

class _PetaTemuanScreenState extends State<PetaTemuanScreen> {
  final _repository = TemuanMapRepository();
  final _map = MapController();
  final _search = TextEditingController();
  List<TemuanMapPoint> _points = const [];
  bool _loading = true;
  String? _error;
  String _query = '';
  String _status = 'Semua status';
  String _tier = 'Semua tier';
  TemuanMapPoint? _selected;

  bool get _allUlp {
    final role = '${widget.sesi['role'] ?? ''}'.toLowerCase().replaceAll(' ', '');
    return role == 'superuser';
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final rows = await _repository.load(
        ulp: '${widget.sesi['ulp'] ?? ''}',
        allUlp: _allUlp,
      );
      if (!mounted) return;
      setState(() { _points = rows; _loading = false; });
      if (rows.isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _map.move(_center(rows), 12.2);
        });
      }
    } catch (error) {
      if (mounted) setState(() { _loading = false; _error = '$error'; });
    }
  }

  LatLng _center(List<TemuanMapPoint> rows) {
    final lat = rows.fold<double>(0, (sum, p) => sum + p.latitude) / rows.length;
    final lng = rows.fold<double>(0, (sum, p) => sum + p.longitude) / rows.length;
    return LatLng(lat, lng);
  }

  List<TemuanMapPoint> get _filtered => _points.where((point) {
    final haystack = '${point.kode} ${point.temuan} ${point.penyulang} '
        '${point.section} ${point.nomorTiang} ${point.tim}'.toLowerCase();
    if (_query.isNotEmpty && !haystack.contains(_query.toLowerCase())) return false;
    if (_status != 'Semua status' && _status != _statusLabel(point.status)) return false;
    if (_tier != 'Semua tier' && point.tier != _tier) return false;
    return true;
  }).toList();

  String _statusLabel(String status) {
    final value = status.toLowerCase();
    if (value.contains('selesai')) return 'Selesai';
    if (value.contains('progress')) return 'Dalam proses';
    return 'Belum ditugaskan';
  }

  Color _statusColor(String status) {
    switch (_statusLabel(status)) {
      case 'Selesai': return AppColors.success700;
      case 'Dalam proses': return AppColors.amber700;
      default: return AppColors.red600;
    }
  }

  void _select(TemuanMapPoint point) {
    setState(() => _selected = point);
    _map.move(LatLng(point.latitude, point.longitude), 16);
  }

  @override
  Widget build(BuildContext context) {
    final rows = _filtered;
    return Scaffold(
      backgroundColor: const Color(0xFFF5F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        leading: widget.onBack == null
            ? null
            : IconButton(onPressed: widget.onBack, icon: const Icon(Icons.arrow_back_rounded)),
        title: const Text('Peta Temuan', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [IconButton(onPressed: _loading ? null : _load, icon: const Icon(Icons.refresh_rounded))],
      ),
      body: Column(children: [
        _toolbar(),
        Expanded(child: Stack(children: [
          FlutterMap(
            mapController: _map,
            options: const MapOptions(initialCenter: LatLng(-3.01, 106.45), initialZoom: 11.5),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'id.co.ulptoboali.sisi',
              ),
              MarkerLayer(markers: [
                for (var i = 0; i < rows.length; i++)
                  Marker(
                    point: LatLng(rows[i].latitude, rows[i].longitude),
                    width: 42,
                    height: 48,
                    child: Semantics(
                      button: true,
                      label: '${rows[i].temuan}, ${rows[i].penyulang}',
                      child: GestureDetector(
                        onTap: () => _select(rows[i]),
                        child: Icon(
                          Icons.location_on_rounded,
                          size: _selected?.kode == rows[i].kode ? 46 : 38,
                          color: _statusColor(rows[i].status),
                          shadows: const [Shadow(color: Colors.black26, blurRadius: 6)],
                        ),
                      ),
                    ),
                  ),
              ]),
              SimpleAttributionWidget(
                source: const Text('© OpenStreetMap contributors'),
                onTap: () => launchUrl(Uri.parse('https://www.openstreetmap.org/copyright')),
              ),
            ],
          ),
          Positioned(top: 12, left: 12, child: _counter(rows.length)),
          if (_loading) const Center(child: CircularProgressIndicator()),
          if (_error != null) Center(child: _message('Peta belum dapat dimuat', _error!, retry: true)),
          if (!_loading && _error == null && _points.isEmpty)
            Center(child: _message('Belum ada titik temuan', 'Download modul Inspeksi pada Data Master terlebih dahulu.')),
          if (_selected != null) Align(alignment: Alignment.bottomCenter, child: _detail(_selected!)),
        ])),
      ]),
    );
  }

  Widget _toolbar() {
    final tiers = _points.map((p) => p.tier).where((v) => v.isNotEmpty).toSet().toList()..sort();
    return Material(
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
        child: Column(children: [
          TextField(
            controller: _search,
            onChanged: (value) => setState(() => _query = value),
            decoration: InputDecoration(
              hintText: 'Cari penyulang, tiang, atau temuan',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _query.isEmpty ? null : IconButton(
                onPressed: () { _search.clear(); setState(() => _query = ''); },
                icon: const Icon(Icons.close_rounded),
              ),
              isDense: true,
              filled: true,
              fillColor: const Color(0xFFF5F8FC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 9),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              _popup('Status', _status, const ['Semua status', 'Belum ditugaskan', 'Dalam proses', 'Selesai'], (v) => _status = v),
              const SizedBox(width: 7),
              _popup('Tier', _tier, ['Semua tier', ...tiers], (v) => _tier = v),
              const SizedBox(width: 7),
              ActionChip(
                avatar: const Icon(Icons.layers_outlined, size: 17),
                label: const Text('Aktif + Arsip'),
                onPressed: null,
              ),
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _popup(String label, String value, List<String> values, ValueChanged<String> change) {
    return PopupMenuButton<String>(
      onSelected: (v) => setState(() => change(v)),
      itemBuilder: (_) => values.map((v) => PopupMenuItem(value: v, child: Text(v))).toList(),
      child: Chip(label: Text(value), avatar: const Icon(Icons.expand_more_rounded, size: 17)),
    );
  }

  Widget _counter(int count) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10)]),
    child: Text('$count temuan terpetakan', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
  );

  Widget _detail(TemuanMapPoint point) => SafeArea(
    minimum: const EdgeInsets.all(10),
    child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(19), boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 22)]),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: _statusColor(point.status).withValues(alpha: .12), borderRadius: BorderRadius.circular(12)),
            alignment: Alignment.center,
            child: Text(point.tier.isEmpty ? 'T' : point.tier.replaceAll('Tier ', 'T'), style: TextStyle(fontWeight: FontWeight.w900, color: _statusColor(point.status))),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(point.temuan.isEmpty ? 'Temuan inspeksi' : point.temuan, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            Text(point.kode, style: const TextStyle(fontSize: 11, color: AppColors.neutral500)),
          ])),
          IconButton(onPressed: () => setState(() => _selected = null), icon: const Icon(Icons.close_rounded)),
        ]),
        const SizedBox(height: 12),
        Text('${point.penyulang} · ${point.section}\n${point.nomorTiang.isEmpty ? point.objek : point.nomorTiang}', style: const TextStyle(height: 1.45)),
        const SizedBox(height: 8),
        Row(children: [
          Icon(Icons.circle, size: 10, color: _statusColor(point.status)),
          const SizedBox(width: 6),
          Text(_statusLabel(point.status), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
          const Spacer(),
          Text(point.tanggal, style: const TextStyle(fontSize: 11, color: AppColors.neutral500)),
        ]),
      ]),
    ),
  );

  Widget _message(String title, String body, {bool retry = false}) => Container(
    margin: const EdgeInsets.all(24),
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.map_outlined, size: 40, color: AppColors.navy700),
      const SizedBox(height: 12),
      Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
      const SizedBox(height: 6),
      Text(body, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.neutral500)),
      if (retry) TextButton(onPressed: _load, child: const Text('Coba lagi')),
    ]),
  );
}
