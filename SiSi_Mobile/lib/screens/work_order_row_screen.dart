import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../db/repositories/delta_sync_repository.dart';
import '../db/repositories/work_order_row_repository.dart';
import '../theme/app_colors.dart';
import '../widgets/custom_loading_widget.dart';

/// WO ROW local-first. db_INS_Temuan adalah induk WO, sedangkan
/// db_ROW_Eksekusi baru dihitung ke laporan setelah seluruh dokumentasi lengkap.
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
  static const _toboali = LatLng(-3.0036, 106.4548);
  final search = TextEditingController();
  final repo = WorkOrderRowRepository();
  final busy = <String>{};
  List<Map<String, dynamic>> rows = [];
  List<String> feederOptions = [];
  String? selectedFeeder;
  bool loading = true;
  bool mapMode = true;

  String get token => '${widget.sesi['token'] ?? ''}';
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
    final result = await Future.wait([
      DeltaSyncRepository().rows('db_INS_Temuan'),
      DeltaSyncRepository().rows('db_Penyulang'),
    ]);
    final out = <Map<String, dynamic>>[];
    for (final raw in result[0]) {
      if (raw is! List || raw.length < 45) continue;
      final status = '${raw[26]}'.trim();
      final team = '${raw[29]}'.trim();
      if (status.toLowerCase() != 'progress pekerjaan' ||
          !_teamMatches(team)) continue;
      out.add({
        'kodePekerjaan': '${raw[3]}'.trim(),
        'ulp': '${raw[4]}'.trim(),
        'tanggal': '${raw[6]}'.trim(),
        'objek': '${raw[8]}'.trim(),
        'penyulang': '${raw[9]}'.trim(),
        'section': '${raw[10]}'.trim(),
        'nomorTiang': '${raw[12]}'.trim(),
        'nomorGardu': '${raw[13]}'.trim(),
        'tier': '${raw[14]}'.trim(),
        'temuan': '${raw[15]}'.trim(),
        'fotoTemuan': '${raw[16]}'.trim(),
        'fotoTemuanUrl': '${raw[17]}'.trim(),
        'fotoTiang': '${raw[18]}'.trim(),
        'fotoTiangUrl': '${raw[19]}'.trim(),
        'deskripsi': '${raw[20]}'.trim(),
        'koordinat': '${raw[21]}'.trim(),
        'timEksekusi': team,
        'catatan': '${raw[30]}'.trim(),
        'diameter': raw[31],
        'jenisPekerjaan': '${raw[32]}'.trim(),
        'fotoPekerjaan': '${raw[33]}'.trim(),
        'fotoPekerjaanUrl': '${raw[34]}'.trim(),
        'fotoSesudah': '${raw[35]}'.trim(),
        'fotoSesudahUrl': '${raw[36]}'.trim(),
      });
    }
    out.sort((a, b) => '${b['tanggal']}'.compareTo('${a['tanggal']}'));
    if (!mounted) return;
    setState(() {
      rows = out;
      feederOptions = _feederNames(result[1]);
      if (!feederOptions.contains(selectedFeeder)) selectedFeeder = null;
      loading = false;
    });
  }

  List<String> _feederNames(List<dynamic> source) {
    final values = <String>{};
    for (final raw in source) {
      if (raw is List && raw.length > 2) {
        final name = '${raw[2]}'.trim();
        if (name.isNotEmpty) values.add(name);
      }
    }
    return values.toList()
      ..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
  }

  bool _teamMatches(String team) {
    final current = team.toLowerCase();
    final target = targetTeam.toLowerCase();
    if (!current.contains('row')) return false;
    return target.isEmpty || target == 'row' || target == 'tim row' ||
        current == target;
  }

  List<Map<String, dynamic>> get filtered {
    final q = search.text.trim().toLowerCase();
    final feeder = (selectedFeeder ?? '').toLowerCase();
    return rows.where((row) {
      if (feeder.isNotEmpty &&
          '${row['penyulang']}'.trim().toLowerCase() != feeder) return false;
      if (q.isEmpty) return true;
      return ['kodePekerjaan', 'temuan', 'section', 'nomorTiang', 'nomorGardu']
          .any((key) => '${row[key] ?? ''}'.toLowerCase().contains(q));
    }).toList();
  }

  LatLng? _coordinateOf(Map<String, dynamic> row) {
    final values = RegExp(r'-?\d+(?:\.\d+)?')
        .allMatches('${row['koordinat'] ?? ''}')
        .map((m) => double.tryParse(m.group(0)!))
        .whereType<double>()
        .toList();
    if (values.length < 2 || values[0].abs() > 90 || values[1].abs() > 180) {
      return null;
    }
    return LatLng(values[0], values[1]);
  }

  Set<Marker> _markers(List<Map<String, dynamic>> data) => {
        for (var i = 0; i < data.length; i++)
          if (_coordinateOf(data[i]) case final point?)
            Marker(
              markerId: MarkerId('${data[i]['kodePekerjaan']}_$i'),
              position: point,
              icon: BitmapDescriptor.defaultMarkerWithHue(
                  BitmapDescriptor.hueGreen),
              infoWindow: InfoWindow(
                title: '${data[i]['kodePekerjaan']}',
                snippet: '${data[i]['temuan']}',
                onTap: () => _showMapDetail(data[i]),
              ),
            ),
      };

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
            onPressed: () => widget.onBack != null
                ? widget.onBack!()
                : Navigator.maybePop(context),
            icon: const Icon(Icons.arrow_back_rounded),
          ),
          title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Work Order (WO)',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
            Text(targetTeam,
                style: const TextStyle(fontSize: 11, color: Colors.white70)),
          ]),
          actions: [
            IconButton(
              tooltip: mapMode ? 'Tampilan daftar' : 'Peta vegetasi',
              onPressed: () => setState(() => mapMode = !mapMode),
              icon: Icon(mapMode ? Icons.view_list_rounded : Icons.map_rounded),
            ),
          ],
        ),
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(15, 14, 15, 8),
            child: Column(children: [
              DropdownButtonFormField<String>(
                value: selectedFeeder,
                isExpanded: true,
                decoration: InputDecoration(
                  labelText: 'Kategori Penyulang',
                  hintText: feederOptions.isEmpty
                      ? 'Sinkronkan db_Penyulang dahulu'
                      : 'Semua Penyulang',
                  prefixIcon: const Icon(Icons.alt_route_rounded),
                  suffixIcon: selectedFeeder == null
                      ? null
                      : IconButton(
                          onPressed: () => setState(() => selectedFeeder = null),
                          icon: const Icon(Icons.filter_alt_off_rounded)),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                items: feederOptions
                    .map((value) => DropdownMenuItem(
                        value: value,
                        child: Text(value, overflow: TextOverflow.ellipsis)))
                    .toList(),
                onChanged: (value) => setState(() => selectedFeeder = value),
              ),
              const SizedBox(height: 9),
              TextField(
                controller: search,
                decoration: InputDecoration(
                  hintText: 'Cari nomor, temuan, section...',
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
            ]),
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
              Icon(mapMode ? Icons.map_outlined : Icons.storage_rounded,
                  size: 14, color: AppColors.success700),
              const SizedBox(width: 4),
              Text(mapMode ? '${_markers(data).length} titik peta' : 'Data lokal',
                  style: const TextStyle(
                      fontSize: 10, color: AppColors.neutral500)),
            ]),
          ),
          Expanded(child: mapMode ? _map(data) : _list(data)),
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

  Widget _map(List<Map<String, dynamic>> data) {
    final markers = _markers(data);
    if (markers.isEmpty && !loading) {
      return const Center(child: Text('Tidak ada WO dengan koordinat valid.'));
    }
    return GoogleMap(
      initialCameraPosition: CameraPosition(
          target: markers.isEmpty ? _toboali : markers.first.position,
          zoom: 12.5),
      markers: markers,
      mapType: MapType.normal,
      mapToolbarEnabled: false,
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      rotateGesturesEnabled: false,
    );
  }

  Widget _list(List<Map<String, dynamic>> data) {
    if (data.isEmpty && !loading) {
      return const Center(child: Text('Tidak ada Work Order aktif.'));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 24),
        itemCount: data.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _card(data[i]),
      ),
    );
  }

  void _showMapDetail(Map<String, dynamic> row) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: .72,
        minChildSize: .4,
        maxChildSize: .94,
        builder: (_, controller) => Material(
          color: const Color(0xFFF5F7FB),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          child: ListView(
              controller: controller,
              padding: const EdgeInsets.all(14),
              children: [_card(row)]),
        ),
      ),
    );
  }

  Widget _card(Map<String, dynamic> row) {
    final code = '${row['kodePekerjaan']}';
    final coordinate = '${row['koordinat'] ?? ''}'.trim();
    final workDone = '${row['fotoPekerjaanUrl'] ?? ''}'.trim().isNotEmpty;
    final afterDone = '${row['fotoSesudahUrl'] ?? ''}'.trim().isNotEmpty;
    final isBusy = busy.contains(code);
    final asset = '${row['nomorTiang']}'.trim().isNotEmpty
        ? 'Tiang ${row['nomorTiang']}'
        : '${row['nomorGardu']}'.trim().isNotEmpty
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
            Text(code,
                style: const TextStyle(
                    fontSize: 10, color: AppColors.neutral500)),
            const SizedBox(height: 4),
            Text('${row['temuan'] ?? '-'}',
                style: const TextStyle(
                    fontSize: 15, height: 1.25, fontWeight: FontWeight.w900)),
            const SizedBox(height: 11),
            _row('Tim Eksekusi', '${row['timEksekusi'] ?? '-'}'),
            _row('Objek / Aset', '${row['objek'] ?? '-'} · $asset'),
            _row('Penyulang', '${row['penyulang'] ?? '-'}'),
            _row('Section', '${row['section'] ?? '-'}'),
            _row('Tier', '${row['tier'] ?? '-'}'),
            if ('${row['catatan'] ?? ''}'.trim().isNotEmpty)
              _row('Catatan SPV', '${row['catatan']}'),
            if (coordinate.isNotEmpty) ...[
              const SizedBox(height: 10),
              InkWell(
                onTap: () => _navigate(row),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.cyan100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(children: [
                    const Icon(Icons.directions_rounded,
                        color: AppColors.cyan600),
                    const SizedBox(width: 8),
                    Expanded(
                        child: Text(coordinate,
                            style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: AppColors.navy700))),
                    const Text('Google Maps',
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: AppColors.navy700)),
                  ]),
                ),
              ),
            ],
            const SizedBox(height: 14),
            Row(children: List.generate(2, (i) {
              final done = i == 0 ? workDone : afterDone;
              return Expanded(
                child: Container(
                  height: 5,
                  margin: EdgeInsets.only(right: i == 0 ? 5 : 0),
                  decoration: BoxDecoration(
                    color: done ? AppColors.success700 : AppColors.neutral200,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              );
            })),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: isBusy || afterDone
                    ? null
                    : () => _progress(row,
                        workDone ? 'sesudah' : 'pekerjaan'),
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      workDone ? AppColors.success700 : AppColors.navy700,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(13)),
                ),
                icon: isBusy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : Icon(workDone
                        ? Icons.task_alt_rounded
                        : Icons.add_a_photo_rounded),
                label: Text(workDone
                    ? 'Selesaikan, Foto Sesudah'
                    : 'Mulai, Foto Pekerjaan'),
              ),
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _gallery(Map<String, dynamic> row) {
    final photos = [
      ('Foto Temuan', '${row['fotoTemuanUrl'] ?? ''}'),
      ('Foto Tiang', '${row['fotoTiangUrl'] ?? ''}'),
      if ('${row['fotoPekerjaanUrl'] ?? ''}'.trim().isNotEmpty)
        ('Pekerjaan', '${row['fotoPekerjaanUrl']}'),
      if ('${row['fotoSesudahUrl'] ?? ''}'.trim().isNotEmpty)
        ('Sesudah', '${row['fotoSesudahUrl']}'),
    ];
    return SizedBox(
      height: 150,
      child: Row(
        children: photos
            .map((p) => Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 2),
                    child: _photo(p.$1, p.$2),
                  ),
                ))
            .toList(),
      ),
    );
  }

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
            left: 6,
            bottom: 7,
            child: Text(label,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 8,
                    fontWeight: FontWeight.w900)),
          ),
        ]),
      );

  Widget _fallback() => Container(
      color: AppColors.neutral200,
      child: const Icon(Icons.image_not_supported_outlined,
          color: AppColors.neutral400));

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

  Future<void> _progress(Map<String, dynamic> row, String tahap) async {
    final code = '${row['kodePekerjaan']}';
    final result = await showModalBottomSheet<_ProgressInput>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ProgressSheet(
        tahap: tahap,
        diameterAwal: num.tryParse('${row['diameter']}') ?? 0,
      ),
    );
    if (result == null || !mounted) return;
    setState(() => busy.add(code));
    try {
      await repo.start(token: token, kodePekerjaan: code);
      final bytes = await result.file.readAsBytes();
      final response = await repo.updatePhoto(
        token: token,
        kodePekerjaan: code,
        tahap: tahap,
        fotoBase64: base64Encode(bytes),
        diameter: result.diameter,
      );
      if (!mounted) return;
      setState(() {
        busy.remove(code);
        row['diameter'] = result.diameter;
        if (tahap == 'pekerjaan') {
          row['fotoPekerjaanUrl'] = response['fotoPekerjaanUrl'] ?? '';
        } else {
          row['fotoSesudahUrl'] = response['fotoSesudahUrl'] ?? '';
        }
        if (response['completed'] == true) rows.remove(row);
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('${response['message']}'),
        backgroundColor: response['completed'] == true
            ? AppColors.success700
            : AppColors.navy700,
      ));
    } catch (e) {
      if (!mounted) return;
      setState(() => busy.remove(code));
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(e.toString().replaceFirst('Exception: ', '')),
        backgroundColor: AppColors.red600,
      ));
    }
  }

  Future<void> _navigate(Map<String, dynamic> row) async {
    final point = _coordinateOf(row);
    if (point == null) return;
    final destination = '${point.latitude},${point.longitude}';
    final app = Uri.parse('google.navigation:q=$destination&mode=d');
    if (await canLaunchUrl(app)) {
      await launchUrl(app, mode: LaunchMode.externalApplication);
    } else {
      await launchUrl(
        Uri.parse(
            'https://www.google.com/maps/dir/?api=1&destination=$destination'),
        mode: LaunchMode.externalApplication,
      );
    }
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
                  child: Center(child: Image.network(url)),
                ),
              ),
            ]),
          ),
        ),
      );
}

class _ProgressInput {
  final File file;
  final num diameter;
  const _ProgressInput(this.file, this.diameter);
}

class _ProgressSheet extends StatefulWidget {
  final String tahap;
  final num diameterAwal;
  const _ProgressSheet({required this.tahap, required this.diameterAwal});

  @override
  State<_ProgressSheet> createState() => _ProgressSheetState();
}

class _ProgressSheetState extends State<_ProgressSheet> {
  final picker = ImagePicker();
  late final TextEditingController diameter;
  File? file;
  String? error;

  @override
  void initState() {
    super.initState();
    diameter = TextEditingController(text: '${widget.diameterAwal}');
  }

  @override
  void dispose() {
    diameter.dispose();
    super.dispose();
  }

  Future<void> _pick(ImageSource source) async {
    final picked = await picker.pickImage(source: source, imageQuality: 72);
    if (picked != null) setState(() => file = File(picked.path));
  }

  void _choose() => showModalBottomSheet<void>(
        context: context,
        builder: (ctx) => SafeArea(
          child: Wrap(children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded),
              title: const Text('Kamera Lapangan'),
              onTap: () {
                Navigator.pop(ctx);
                _pick(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded),
              title: const Text('Galeri'),
              onTap: () {
                Navigator.pop(ctx);
                _pick(ImageSource.gallery);
              },
            ),
          ]),
        ),
      );

  void _submit() {
    final value = num.tryParse(diameter.text.trim());
    if (file == null || value == null || value < 0) {
      setState(() => error = 'Foto dan diameter 0 atau lebih wajib diisi.');
      return;
    }
    Navigator.pop(context, _ProgressInput(file!, value));
  }

  @override
  Widget build(BuildContext context) {
    final finishing = widget.tahap == 'sesudah';
    return Container(
      padding: EdgeInsets.fromLTRB(
          20, 14, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
                color: AppColors.neutral200,
                borderRadius: BorderRadius.circular(3))),
        const SizedBox(height: 16),
        Text(finishing ? 'Selesaikan Work Order' : 'Mulai Pekerjaan',
            style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w900,
                color: AppColors.navy700)),
        const SizedBox(height: 16),
        TextField(
          controller: diameter,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'Diameter pohon (cm)',
            helperText: 'Isi 0 untuk Rabas / Pangkas',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 12),
        InkWell(
          onTap: _choose,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            width: double.infinity,
            height: 150,
            decoration: BoxDecoration(
              color: const Color(0xFFF6F8FC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.neutral200),
            ),
            clipBehavior: Clip.antiAlias,
            child: file == null
                ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Icon(Icons.add_a_photo_rounded,
                        size: 32, color: AppColors.navy700),
                    const SizedBox(height: 6),
                    Text(finishing
                        ? 'Ambil Foto Sesudah'
                        : 'Ambil Foto Pekerjaan'),
                  ])
                : Image.file(file!, fit: BoxFit.cover),
          ),
        ),
        if (error != null) ...[
          const SizedBox(height: 8),
          Text(error!, style: const TextStyle(color: AppColors.red600)),
        ],
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor:
                  finishing ? AppColors.success700 : AppColors.navy700,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: Text(finishing ? 'Simpan dan Selesaikan' : 'Simpan Progres'),
          ),
        ),
      ]),
    );
  }
}
