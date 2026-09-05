import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'local_watermark_renderer.dart';

/// Explicit user export only. Never invoked automatically by capture or sync.
/// Consumes the renderer result, not an arbitrary source-file path.
class WatermarkPhotoExport {
  static const channel = MethodChannel('id.co.ulptoboali.sisi/photo_export');
  static bool _saving = false;

  static String filename(Map<String, dynamic> metadata) {
    String clean(dynamic value) => (value ?? '').toString()
        .replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');
    final code = clean(metadata['code']);
    final stage = clean(metadata['tahap']);
    final stamp = clean(metadata['capturedAt']);
    final base = ['SiSi', code.isEmpty ? 'watermark' : code, if (stage.isNotEmpty) stage, if (stamp.isNotEmpty) stamp].join('_');
    return '${base.length > 110 ? base.substring(0, 110) : base}.jpg';
  }

  static Future<bool> save(LocalWatermarkResult photo) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      throw UnsupportedError('Simpan foto tersedia pada APK Android.');
    }
    if (_saving) throw StateError('Penyimpanan foto sedang berjalan.');
    final Uint8List bytes = photo.jpeg;
    if (bytes.length < 4 || bytes.length > 40 * 1024 * 1024 || bytes[0] != 0xff || bytes[1] != 0xd8) {
      throw const FormatException('Hasil watermark JPEG tidak valid atau terlalu besar.');
    }
    _saving = true;
    try {
      final result = await channel.invokeMapMethod<String, dynamic>('saveWatermarkedJpeg', {
        'bytes': bytes,
        'filename': filename(photo.metadata),
      });
      return result?['saved'] == true;
    } on MissingPluginException {
      throw StateError('Pembaruan APK diperlukan untuk fitur simpan foto.');
    } on PlatformException catch (error) {
      throw StateError(error.message ?? 'Foto gagal disimpan.');
    } finally { _saving = false; }
  }
}
