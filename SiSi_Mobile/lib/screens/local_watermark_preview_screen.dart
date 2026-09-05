import 'package:flutter/material.dart';
import '../services/local_watermark_renderer.dart';
import '../services/watermark_photo_export.dart';

/// Incomplete metadata may be previewed, but never downloaded as a final photo.
class LocalWatermarkPreviewScreen extends StatefulWidget {
  final LocalWatermarkResult photo;
  const LocalWatermarkPreviewScreen({super.key, required this.photo});
  @override State<LocalWatermarkPreviewScreen> createState() => _PreviewState();
}
class _PreviewState extends State<LocalWatermarkPreviewScreen> {
  bool saving = false;
  String? error;
  final transform = TransformationController();
  @override void dispose() { transform.dispose(); super.dispose(); }
  Future<void> save() async {
    if (saving) return;
    setState(() { saving = true; error = null; });
    try {
      final saved = await WatermarkPhotoExport.save(widget.photo);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(saved
          ? 'Foto ber-watermark disimpan di lokasi pilihan Anda.'
          : 'Penyimpanan dibatalkan. Foto tetap tersedia di aplikasi.')));
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst('Bad state: ', ''));
    } finally { if (mounted) setState(() => saving = false); }
  }
  @override Widget build(BuildContext context) {
    final missing = WatermarkPhotoExport.missingIndicators(widget.photo.metadata);
    final complete = missing.isEmpty;
    return PopScope(canPop: !saving, child: Scaffold(
      backgroundColor: const Color(0xFF152532),
      appBar: AppBar(backgroundColor: const Color(0xFF152532), foregroundColor: const Color(0xFFF4F8FA),
        title: const Text('Foto ber-watermark'),
        actions: [IconButton(tooltip: 'Reset zoom', onPressed: () => transform.value = Matrix4.identity(), icon: const Icon(Icons.fit_screen_rounded))]),
      body: Column(children: [
        Expanded(child: InteractiveViewer(transformationController: transform, maxScale: 5,
          child: Center(child: Image.memory(widget.photo.jpeg, fit: BoxFit.contain, semanticLabel: 'Foto dengan watermark SiSi',
            errorBuilder: (_, __, ___) => const Text('Pratinjau foto gagal dimuat.', style: TextStyle(color: Color(0xFFF4F8FA))))))),
        if (error != null) Padding(padding: const EdgeInsets.all(16), child: Text(error!, style: const TextStyle(color: Color(0xFFFFD9CF)))),
      ]),
      bottomNavigationBar: SafeArea(child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .45),
        child: SingleChildScrollView(child: Padding(padding: const EdgeInsets.all(16), child: Column(mainAxisSize: MainAxisSize.min, children: [
          if (!complete) Semantics(liveRegion: true, child: Text(
            'Download belum tersedia. Indikator belum lengkap: ${missing.join(', ')}.\nLengkapi data, lalu buat ulang watermark; waktu dan GPS asli tetap dipertahankan.',
            textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, height: 1.5, color: Color(0xFFFFD9CF))))
          else const Text('Semua indikator wajib tersedia. Foto asli tidak diubah; pilih folder tujuan berikutnya.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Color(0xFFB8CCD6))),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, child: FilledButton.icon(
            key: const ValueKey('save-watermark'), onPressed: saving || !complete ? null : save,
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            icon: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Icon(complete ? Icons.download_rounded : Icons.lock_outline),
            label: Text(saving ? 'Menyimpan…' : complete ? 'Simpan foto ber-watermark' : 'Lengkapi indikator terlebih dahulu'))),
        ]))),
      )),
    ));
  }
}
