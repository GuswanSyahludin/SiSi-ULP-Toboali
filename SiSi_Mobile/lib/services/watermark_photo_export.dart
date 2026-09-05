import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'local_watermark_data.dart';
import 'local_watermark_renderer.dart';

/// Completeness is a client UX safeguard, not proof of server authorization.
/// Domain callers remain responsible for supplying the actual official ID.
class WatermarkPhotoExport {
  static const channel = MethodChannel('id.co.ulptoboali.sisi/photo_export');
  static bool _saving = false;
  static bool _present(dynamic value) {
    if (value is! String) return false;
    final s = value.trim().toLowerCase();
    return !{'', '-', 'null', 'undefined', 'belum tersedia', 'n/a', 'belum diisi'}.contains(s);
  }
  static bool _instant(dynamic value) {
    if (value is! String || !RegExp(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$').hasMatch(value)) return false;
    return DateTime.tryParse(value) != null;
  }

  /// Every requested team indicator is required. GPS accuracy remains optional
  /// (the format only displays it when present); provided accuracy must be valid.
  static List<String> missingIndicators(Map<String, dynamic> metadata) {
    final missing = <String>[];
    final team = metadata['team'];
    final expectedLabel = switch (team) {
      'yandal' => 'Kode P0',
      'row' => 'Kode Eksekusi',
      'inspeksiGardu' || 'inspeksiJaringan' => 'Kode Temuan',
      _ => '',
    };
    if (expectedLabel.isEmpty) missing.add('Tim watermark');
    final fields = <String, String>{
      'code': expectedLabel.isEmpty ? 'Kode resmi' : expectedLabel,
      'ulp': 'ULP', 'penyulang': 'Penyulang', 'section': 'Section',
      if (team == 'yandal' || team == 'row') 'jenisPekerjaan': 'Jenis pekerjaan',
      if (team == 'yandal') ...{
        'daerah': 'Daerah pekerjaan', 'subTim': 'Sub-tim', 'petugas': 'Petugas',
      },
      if (team == 'inspeksiGardu') 'nomorGardu': 'Nomor Gardu',
      if (team == 'inspeksiJaringan') 'segmen': 'Segmen',
      if (team == 'inspeksiGardu' || team == 'inspeksiJaringan') 'temuan': 'Temuan',
    };
    for (final field in fields.entries) {
      if (!_present(metadata[field.key])) missing.add(field.value);
    }
    final code = '${metadata['code'] ?? ''}'.trim();
    if (_present(code) && RegExp(r'^(LOCAL(?:[-_]|$)|DRAFT(?:[-_]|$)|DRAF(?:[-_]|$))', caseSensitive: false).hasMatch(code)) {
      missing.add('Kode resmi (bukan ID lokal/draf)');
    }
    if (expectedLabel.isNotEmpty && metadata['codeLabel'] != expectedLabel) missing.add('Label kode sesuai tim');
    if (!_instant(metadata['capturedAt'])) missing.add('Jam, hari, dan tanggal pengambilan');
    if (!_instant(metadata['createdAt'])) missing.add('Waktu pembuatan');
    final lat = metadata['latitude'], lon = metadata['longitude'];
    if (lat is! num || lon is! num || !lat.isFinite || !lon.isFinite || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      missing.add(team == 'inspeksiGardu' || team == 'inspeksiJaringan' ? 'Koordinat temuan valid' : 'Koordinat pekerjaan valid');
    }
    if (metadata['isMocked'] != false) missing.add('GPS non-simulasi');
    final accuracy = metadata['accuracyMeters'];
    if (accuracy != null && (accuracy is! num || !accuracy.isFinite || accuracy < 0)) missing.add('Akurasi GPS valid');
    if (metadata['formatVersion'] != LocalWatermarkData.formatVersion) missing.add('Format watermark yang didukung');
    if (metadata['renderer'] != 'flutter-local') missing.add('Hasil render watermark lokal');
    return List.unmodifiable(missing);
  }

  static String filename(Map<String, dynamic> metadata) {
    String clean(dynamic value) => (value ?? '').toString().replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');
    final code = clean(metadata['code']);
    final stage = clean(metadata['tahap']);
    final stamp = clean(metadata['capturedAt']);
    final base = ['SiSi', code.isEmpty ? 'watermark' : code, if (stage.isNotEmpty) stage, if (stamp.isNotEmpty) stamp].join('_');
    return '${base.length > 110 ? base.substring(0, 110) : base}.jpg';
  }

  static Future<bool> save(LocalWatermarkResult photo) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) throw UnsupportedError('Simpan foto tersedia pada APK Android.');
    if (_saving) throw StateError('Penyimpanan foto sedang berjalan.');
    final missing = missingIndicators(photo.metadata);
    if (missing.isNotEmpty) throw StateError('Download belum tersedia. Lengkapi: ${missing.join(', ')}.');
    final Uint8List bytes = photo.jpeg;
    if (bytes.length < 4 || bytes.length > 40 * 1024 * 1024 || bytes[0] != 0xff || bytes[1] != 0xd8) {
      throw const FormatException('Hasil watermark JPEG tidak valid atau terlalu besar.');
    }
    // Detect accidental result/file mismatch, not malicious client modification.
    if (photo.metadata['watermarkSha256'] != sha256.convert(bytes).toString()) {
      throw StateError('Foto tidak cocok dengan hasil render. Buat ulang watermark dari foto asli dan metadata lengkap.');
    }
    _saving = true;
    try {
      final result = await channel.invokeMapMethod<String, dynamic>('saveWatermarkedJpeg', {'bytes': bytes, 'filename': filename(photo.metadata)});
      return result?['saved'] == true;
    } on MissingPluginException {
      throw StateError('Pembaruan APK diperlukan untuk fitur simpan foto.');
    } on PlatformException catch (error) {
      throw StateError(error.message ?? 'Foto gagal disimpan.');
    } finally { _saving = false; }
  }
}
