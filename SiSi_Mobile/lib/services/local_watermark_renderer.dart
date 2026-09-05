import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'local_watermark_data.dart';

class LocalWatermarkResult {
  final Uint8List jpeg;
  final Map<String, dynamic> metadata;
  const LocalWatermarkResult({required this.jpeg, required this.metadata});

  /// Saves into a NEW bundle directory; original file is never written.
  /// Manifest is written last. Consumers must ignore directories without it.
  Future<Directory> saveNewBundle(Directory parent) async {
    await parent.create(recursive: true);
    final bundle = await parent.createTemp('sisi-wm-');
    await File('${bundle.path}/watermark.jpg').writeAsBytes(jpeg, flush: true);
    await File('${bundle.path}/manifest.json').writeAsString(jsonEncode(metadata), flush: true);
    return bundle;
  }
}

/// Local rendering only. No HTTP, Drive, camera mutation or sync side effects.
/// Must be called on a Flutter engine isolate (dart:ui/TextPainter are used).
class LocalWatermarkRenderer {
  static const _panel = Color(0xEC152532);
  static const _text = Color(0xFFF4F8FA);
  static const _label = Color(0xFFB8CCD6);
  static const _lime = Color(0xFFD1EF65);

  static TextPainter _textPainter(String text, double size, double width,
      {Color color = _text, FontWeight weight = FontWeight.w600}) {
    final p = TextPainter(
      text: TextSpan(text: text, style: TextStyle(fontSize: size, height: 1.25, color: color, fontWeight: weight)),
      textDirection: TextDirection.ltr,
    );
    p.layout(maxWidth: width);
    return p;
  }

  static Future<ui.Image> _decode(Uint8List bytes) async {
    final codec = await ui.instantiateImageCodec(bytes);
    try { return (await codec.getNextFrame()).image; }
    finally { codec.dispose(); }
  }

  static void _logo(Canvas canvas, ui.Image logo, Rect target) {
    paintImage(canvas: canvas, rect: target, image: logo, fit: BoxFit.contain, filterQuality: FilterQuality.high);
  }

  static Future<LocalWatermarkResult> render({
    required Uint8List originalBytes,
    required LocalWatermarkData data,
    AssetBundle? assets,
    int maxEdge = 2048,
    int jpegQuality = 92,
  }) async {
    data.validate();
    if (maxEdge < 600 || maxEdge > 4096) throw ArgumentError('maxEdge harus 600 sampai 4096.');
    if (jpegQuality < 70 || jpegQuality > 100) throw ArgumentError('Kualitas JPEG harus 70 sampai 100.');
    if (originalBytes.length > 40 * 1024 * 1024) throw ArgumentError('Foto melebihi batas 40 MB.');
    final decoded = img.decodeImage(originalBytes);
    if (decoded == null) throw ArgumentError('Format gambar belum didukung. Gunakan JPEG/PNG asli.');
    if (decoded.width < 320 || decoded.height < 320) throw ArgumentError('Resolusi foto terlalu kecil untuk watermark yang terbaca.');
    var photo = img.bakeOrientation(decoded);
    if (math.max(photo.width, photo.height) > maxEdge) {
      photo = photo.width >= photo.height
          ? img.copyResize(photo, width: maxEdge)
          : img.copyResize(photo, height: maxEdge);
    }
    final width = photo.width.toDouble(), height = photo.height.toDouble();
    final scale = math.min(width, height) / 900;
    final inset = 20 * scale, padding = 20 * scale;
    // Wider than Compact V4 to retain legibility with team-specific fields.
    final panelWidth = width * (width > height ? .62 : .88);
    final inner = panelWidth - padding * 2;
    final font = 24 * scale;
    final logoSize = 62 * scale;
    final headerWidth = inner - logoSize - 16 * scale;
    final header = _textPainter('${data.codeLabel}: ${data.code}\n${data.ulp}', 26 * scale, headerWidth, weight: FontWeight.w800);
    final clock = _textPainter(LocalWatermarkData.time(data.capturedAt), 40 * scale, inner, color: _lime, weight: FontWeight.w800);
    final date = _textPainter('${data.dayName}, ${LocalWatermarkData.date(data.capturedAt)} · WIB', 24 * scale, inner);
    final fields = <TextPainter>[];
    for (final field in data.fields) {
      final p = TextPainter(text: TextSpan(children: [
        TextSpan(text: '${field.key}: ', style: TextStyle(fontSize: font, height: 1.25, color: _label, fontWeight: FontWeight.w500)),
        TextSpan(text: field.value, style: TextStyle(fontSize: font, height: 1.25, color: _text, fontWeight: FontWeight.w700)),
      ]), textDirection: TextDirection.ltr)..layout(maxWidth: inner);
      fields.add(p);
    }
    final headerHeight = math.max(logoSize, header.height);
    final panelHeight = padding * 2 + headerHeight + 30 * scale + clock.height + 4 * scale + date.height + 14 * scale
        + fields.fold<double>(0, (sum, p) => sum + p.height + 8 * scale);
    if (panelHeight > height - inset * 2) {
      header.dispose(); clock.dispose(); date.dispose();
      for (final p in fields) { p.dispose(); }
      throw ArgumentError('Metadata tidak muat pada foto ini. Gunakan foto lebih proporsional atau ringkas deskripsi; teks tidak dipotong otomatis.');
    }
    ui.Image? photoImage, pln, sisi, output;
    ui.Picture? picture;
    try {
      final bundle = assets ?? rootBundle;
      final plnBytes = await bundle.load('assets/images/logo-pln.png');
      final sisiBytes = await bundle.load('assets/images/logo-sisi.png');
      photoImage = await _decode(Uint8List.fromList(img.encodePng(photo)));
      pln = await _decode(plnBytes.buffer.asUint8List(plnBytes.offsetInBytes, plnBytes.lengthInBytes));
      sisi = await _decode(sisiBytes.buffer.asUint8List(sisiBytes.offsetInBytes, sisiBytes.lengthInBytes));
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      canvas.drawImage(photoImage, Offset.zero, Paint());
      final origin = Offset(inset, height - inset - panelHeight);
      canvas.drawRRect(RRect.fromRectAndRadius(origin & Size(panelWidth, panelHeight), Radius.circular(18 * scale)), Paint()..color = _panel);
      final x = origin.dx + padding;
      var y = origin.dy + padding;
      _logo(canvas, pln, Rect.fromLTWH(x, y, logoSize, logoSize));
      header.paint(canvas, Offset(x + logoSize + 16 * scale, y));
      y += headerHeight + 12 * scale;
      final stroke = Paint()..color = _lime..strokeWidth = 1.6 * scale;
      canvas.drawLine(Offset(x, y), Offset(x + inner, y), stroke);
      canvas.drawLine(Offset(x, y + 5 * scale), Offset(x + inner, y + 5 * scale), stroke);
      y += 18 * scale;
      clock.paint(canvas, Offset(x, y)); y += clock.height + 4 * scale;
      date.paint(canvas, Offset(x, y)); y += date.height + 14 * scale;
      for (final p in fields) { p.paint(canvas, Offset(x, y)); y += p.height + 8 * scale; }
      final sisiWidth = math.min(112 * scale, width - panelWidth - inset * 3);
      if (sisiWidth >= 48 * scale) {
        final rect = Rect.fromLTWH(width - inset - sisiWidth, height - inset - 64 * scale, sisiWidth, 64 * scale);
        canvas.drawRRect(RRect.fromRectAndRadius(rect, Radius.circular(8 * scale)), Paint()..color = _text);
        _logo(canvas, sisi, rect.deflate(6 * scale));
      } else {
        // Portrait: keep branding separate and avoid overlapping the content panel.
        final rect = Rect.fromLTWH(width - inset - 82 * scale, inset, 82 * scale, 54 * scale);
        canvas.drawRRect(RRect.fromRectAndRadius(rect, Radius.circular(8 * scale)), Paint()..color = _text);
        _logo(canvas, sisi, rect.deflate(5 * scale));
      }
      picture = recorder.endRecording();
      output = await picture.toImage(photo.width, photo.height);
      final rgba = await output.toByteData(format: ui.ImageByteFormat.rawRgba);
      if (rgba == null) throw StateError('Gambar watermark gagal dibentuk.');
      final flattened = img.Image.fromBytes(width: photo.width, height: photo.height,
        bytes: rgba.buffer, bytesOffset: rgba.offsetInBytes, numChannels: 4, order: img.ChannelOrder.rgba);
      final jpeg = Uint8List.fromList(img.encodeJpg(flattened, quality: jpegQuality));
      return LocalWatermarkResult(jpeg: jpeg, metadata: {
        ...data.toJson(), 'renderer': 'flutter-local',
        'width': photo.width, 'height': photo.height,
        'originalSha256': sha256.convert(originalBytes).toString(),
        'watermarkSha256': sha256.convert(jpeg).toString(),
        'panel': {'left': origin.dx, 'top': origin.dy, 'width': panelWidth, 'height': panelHeight},
        'requiresServerVerification': true,
      });
    } finally {
      photoImage?.dispose(); pln?.dispose(); sisi?.dispose(); output?.dispose(); picture?.dispose();
      header.dispose(); clock.dispose(); date.dispose();
      for (final p in fields) { p.dispose(); }
    }
  }
}
