import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:image/image.dart' as img;

class WmV1Artifact {
  final Uint8List normalizedOriginal;
  final Uint8List localWatermark;
  final Map<String, dynamic> manifest;

  const WmV1Artifact({
    required this.normalizedOriginal,
    required this.localWatermark,
    required this.manifest,
  });

  Map<String, dynamic> verificationPayload({required String secret}) => {
        'secret': secret,
        'original': base64Encode(normalizedOriginal),
        'localWatermark': base64Encode(localWatermark),
        'manifest': manifest,
        'strictCanonical': true,
      };
}

class WmV1Service {
  static const version = 'compact-v5-anti-manipulation-v1';
  static const landscapeWidth = 1600;
  static const landscapeHeight = 1200;
  static const portraitWidth = 1200;
  static const portraitHeight = 1600;
  static const jpegQuality = 85;

  static String _sha(Uint8List bytes) => sha256.convert(bytes).toString();

  static img.Image _cover(img.Image source, int width, int height) {
    final scale = (width / source.width) > (height / source.height)
        ? width / source.width
        : height / source.height;
    final resized = img.copyResize(
      source,
      width: (source.width * scale).round(),
      height: (source.height * scale).round(),
      interpolation: img.Interpolation.cubic,
    );
    return img.copyCrop(
      resized,
      x: ((resized.width - width) / 2).round(),
      y: ((resized.height - height) / 2).round(),
      width: width,
      height: height,
    );
  }

  static void _text(img.Image image, String value, int x, int y,
      {img.BitmapFont? font, img.Color? color}) {
    img.drawString(
      image,
      value.isEmpty ? '-' : value,
      font: font ?? img.arial24,
      x: x,
      y: y,
      color: color ?? img.ColorRgb8(250, 252, 255),
    );
  }

  static Uint8List _render(img.Image normalized, Map<String, dynamic> data) {
    final output = img.Image.from(normalized);
    final landscape = output.width >= output.height;
    final margin = landscape ? 26 : 22;
    final panelWidth = landscape ? 560 : 680;
    const panelHeight = 330;
    final left = margin;
    final top = output.height - panelHeight - margin;
    final right = left + panelWidth;
    final bottom = top + panelHeight;

    img.fillRect(
      output,
      x1: left,
      y1: top,
      x2: right,
      y2: bottom,
      color: img.ColorRgba8(17, 24, 35, 224),
      radius: 18,
    );
    img.fillRect(
      output,
      x1: left + 18,
      y1: top + 76,
      x2: right - 18,
      y2: top + 80,
      color: img.ColorRgb8(138, 209, 0),
      radius: 2,
    );

    final code = '${data['kodePekerjaan'] ?? data['kode'] ?? '-'}';
    _text(output, 'KODE PEKERJAAN', left + 22, top + 16,
        font: img.arial14, color: img.ColorRgb8(197, 205, 218));
    _text(output, code, left + 22, top + 40, font: img.arial24);

    final rows = <(String, String)>[
      ('Tanggal', '${data['hari'] ?? ''}, ${data['tanggal'] ?? ''} ${data['jam'] ?? ''}'.trim()),
      ('Koordinat', '${data['koordinat'] ?? data['koordinatPekerjaan'] ?? '-'}'),
      ('Akurasi', '${data['akurasi'] ?? '-'}'),
      ('Tim', '${data['tim'] ?? '-'} · ${data['ulp'] ?? '-'}'),
      ('Pekerjaan', '${data['jenisPekerjaan'] ?? data['pekerjaan'] ?? '-'}'),
    ];
    var y = top + 96;
    for (final row in rows) {
      _text(output, row.$1, left + 22, y,
          font: img.arial14, color: img.ColorRgb8(197, 205, 218));
      _text(output, row.$2, left + 150, y, font: img.arial14);
      y += 43;
    }
    return Uint8List.fromList(img.encodeJpg(output, quality: jpegQuality));
  }

  static Future<WmV1Artifact> create({
    required File source,
    required String kodePekerjaan,
    required String slotFoto,
    required String tanggal,
    required String jam,
    required String koordinat,
    required String akurasi,
    required String username,
    required String tim,
    required String ulp,
    required String jenisPekerjaan,
    required String appVersion,
    String hari = '',
  }) async {
    final sourceBytes = await source.readAsBytes();
    final decoded = img.decodeImage(sourceBytes);
    if (decoded == null) throw const FormatException('Foto tidak dapat dibaca.');
    final oriented = img.bakeOrientation(decoded);
    final landscape = oriented.width >= oriented.height;
    final width = landscape ? landscapeWidth : portraitWidth;
    final height = landscape ? landscapeHeight : portraitHeight;
    final normalized = _cover(oriented, width, height);
    final normalizedBytes = Uint8List.fromList(
      img.encodeJpg(normalized, quality: jpegQuality),
    );
    final metadata = <String, dynamic>{
      'kodePekerjaan': kodePekerjaan,
      'slotFoto': slotFoto,
      'hari': hari,
      'tanggal': tanggal,
      'jam': jam,
      'koordinat': koordinat,
      'akurasi': akurasi,
      'username': username,
      'tim': tim,
      'ulp': ulp,
      'jenisPekerjaan': jenisPekerjaan,
      'appVersion': appVersion,
      'wmVersion': version,
      'capturedAt': DateTime.now().toUtc().toIso8601String(),
      'width': width,
      'height': height,
      'jpegQuality': jpegQuality,
    };
    final local = _render(normalized, metadata);
    metadata['originalSha256'] = _sha(normalizedBytes);
    metadata['watermarkSha256'] = _sha(local);
    metadata['manifestSha256'] = sha256
        .convert(utf8.encode(jsonEncode(Map.fromEntries(
          metadata.entries.toList()..sort((a, b) => a.key.compareTo(b.key)),
        ))))
        .toString();
    return WmV1Artifact(
      normalizedOriginal: normalizedBytes,
      localWatermark: local,
      manifest: metadata,
    );
  }

  static Future<Map<String, dynamic>> verify({
    required Uri endpoint,
    required String secret,
    required WmV1Artifact artifact,
  }) async {
    final response = await http
        .post(
          endpoint,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(artifact.verificationPayload(secret: secret)),
        )
        .timeout(const Duration(seconds: 90));
    final result = Map<String, dynamic>.from(jsonDecode(response.body));
    if (result['ok'] != true) {
      throw Exception(result['message'] ?? 'Verifikasi WM gagal.');
    }
    return result;
  }
}
