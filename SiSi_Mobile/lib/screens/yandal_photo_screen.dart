import 'dart:io';
import 'package:flutter/material.dart';
import '../services/local_watermark_data.dart';
import '../services/local_watermark_renderer.dart';
import '../services/watermark_photo_export.dart';
import 'local_watermark_preview_screen.dart';

/// Never fill historical evidence from the viewer's current session or clock.
class YandalPhotoMetadata {
  static Map<String, dynamic> fromDraft(Map<String, dynamic> draft, String slot) {
    final captures = draft['photoMetadata'];
    final raw = captures is Map ? captures[slot] : null;
    final capture = raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{};
    return {
      ...capture,
      'formatVersion': LocalWatermarkData.formatVersion,
      'renderer': 'flutter-local',
      'team': 'yandal',
      'codeLabel': 'Kode P0',
      // Only an explicit official code, never localId/shiftKey/header.
      'code': draft['kodeP0'] ?? '',
      'createdAt': draft['createdAt'],
      'tahap': slot == 'selesai' ? 'Sesudah' : slot == 'sebelum' ? 'Sebelum' : 'Pekerjaan',
    };
  }
  static List<String> missing(Map<String, dynamic> draft, String slot) {
    final m = fromDraft(draft, slot);
    final issues = [...WatermarkPhotoExport.missingIndicators(m)];
    if (m['photoSource'] != 'camera') issues.add('Foto kamera asli dengan metadata tersimpan');
    return issues;
  }
}

class YandalPhotoScreen extends StatefulWidget {
  final Map<String, dynamic> draft;
  final String slot;
  final String path;
  const YandalPhotoScreen({super.key, required this.draft, required this.slot, required this.path});
  @override State<YandalPhotoScreen> createState() => _PhotoState();
}
class _PhotoState extends State<YandalPhotoScreen> {
  late Future<bool> exists;
  bool busy = false;
  String? error;
  final transform = TransformationController();
  @override void initState() { super.initState(); exists = File(widget.path).exists(); }
  @override void dispose() { transform.dispose(); super.dispose(); }
  Future<void> renderPhoto() async {
    if (busy || YandalPhotoMetadata.missing(widget.draft, widget.slot).isNotEmpty) return;
    setState(() { busy = true; error = null; });
    try {
      final m = YandalPhotoMetadata.fromDraft(widget.draft, widget.slot);
      final data = LocalWatermarkData(
        team: WatermarkTeam.yandal, code: '${m['code']}', ulp: '${m['ulp']}',
        capturedAt: DateTime.parse(m['capturedAt'] as String), createdAt: DateTime.parse(m['createdAt'] as String),
        latitude: (m['latitude'] as num).toDouble(), longitude: (m['longitude'] as num).toDouble(),
        accuracyMeters: (m['accuracyMeters'] as num?)?.toDouble(), isMocked: m['isMocked'] != false,
        penyulang: '${m['penyulang']}', section: '${m['section']}', jenisPekerjaan: '${m['jenisPekerjaan']}',
        daerah: '${m['daerah']}', subTim: '${m['subTim']}', petugas: '${m['petugas']}', tahap: '${m['tahap']}',
      );
      final file = File(widget.path);
      if (await file.length() > 40 * 1024 * 1024) throw StateError('Ukuran foto melebihi 40 MB.');
      final result = await LocalWatermarkRenderer.render(originalBytes: await file.readAsBytes(), data: data);
      if (!mounted) return;
      await Navigator.push(context, MaterialPageRoute(builder: (_) => LocalWatermarkPreviewScreen(photo: result)));
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) {
    final missing = YandalPhotoMetadata.missing(widget.draft, widget.slot);
    return PopScope(canPop: !busy, child: Scaffold(
      backgroundColor: const Color(0xFF152532),
      appBar: AppBar(backgroundColor: const Color(0xFF152532), foregroundColor: const Color(0xFFF4F8FA),
        title: Text('Foto ${widget.slot == 'selesai' ? 'Sesudah' : widget.slot}'),
        actions: [IconButton(tooltip: 'Reset zoom', onPressed: () => transform.value = Matrix4.identity(), icon: const Icon(Icons.fit_screen))]),
      body: FutureBuilder<bool>(future: exists, builder: (context, snapshot) {
        final available = snapshot.data == true;
        return Column(children: [
          Expanded(child: snapshot.connectionState == ConnectionState.waiting
              ? const Center(child: CircularProgressIndicator())
              : available ? InteractiveViewer(transformationController: transform, maxScale: 5,
                  child: Center(child: Image.file(File(widget.path), fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Text('Foto tidak dapat dibaca.', style: TextStyle(color: Color(0xFFF4F8FA))))))
              : const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('File foto tidak tersedia di perangkat. Data laporan tidak diubah.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFFF4F8FA)))))),
          ConstrainedBox(constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .4), child: SingleChildScrollView(child: SafeArea(top: false, child: Padding(
            padding: const EdgeInsets.all(16), child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(missing.isEmpty ? 'Foto asli. Buat watermark untuk membuka pilihan simpan.'
                  : 'Download belum tersedia. Lengkapi indikator: ${missing.join(', ')}. Data foto lama tidak diisi dengan waktu atau GPS baru.',
                  textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, height: 1.5, color: Color(0xFFCCDDE5))),
              if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: const TextStyle(color: Color(0xFFFFD9CF)))),
              const SizedBox(height: 12), SizedBox(width: double.infinity, child: FilledButton.icon(
                key: const ValueKey('prepare-yandal-watermark'), onPressed: busy || !available || missing.isNotEmpty ? null : renderPhoto,
                icon: Icon(missing.isEmpty ? Icons.download : Icons.lock_outline),
                label: Text(busy ? 'Membuat watermark…' : missing.isEmpty ? 'Buat watermark & simpan' : 'Indikator belum lengkap'),
              )),
            ]),
          )))),
        ]);
      }),
    ));
  }
}
