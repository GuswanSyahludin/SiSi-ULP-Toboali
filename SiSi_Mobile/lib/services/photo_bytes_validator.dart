import 'dart:io';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:image/image.dart' as img;
import 'evidence_photo_header.dart';

/// Shared client-side boundary for evidence-image bytes.
/// Header limits are checked before any library decoder is invoked.
class PhotoBytesValidator {
  static const maxBytes = EvidencePhotoHeader.maxBytes;
  static const minEdge = 320;

  /// Preflight size before opening the stream, then bound retained bytes again.
  /// A file can grow after stat, so the initial length is not the only guard.
  /// No persistence, platform-channel or rendering side effects occur here.
  static Future<Uint8List> readBoundedFile(File file) async {
    final declaredLength = await file.length();
    if (declaredLength <= 0 || declaredLength > maxBytes) {
      throw const FormatException('Foto kosong atau melebihi batas 40 MB.');
    }
    final builder = BytesBuilder(copy: false);
    var count = 0;
    await for (final chunk in file.openRead()) {
      if (chunk.length > maxBytes - count) {
        throw const FormatException('Foto melebihi batas 40 MB saat dibaca.');
      }
      count += chunk.length;
      builder.add(chunk);
    }
    if (count == 0 || count != declaredLength) {
      throw const FormatException('File foto berubah saat dibaca. Coba ulang.');
    }
    return builder.takeBytes();
  }

  /// Return the exact verified bytes to the renderer, never reopen the path.
  /// Missing legacy checksums are rejected, not backfilled from current bytes.
  /// This detects accidental replacement, not malicious edits to file AND hash.
  static Future<Uint8List> readVerifiedOriginal(File file, Object? expectedSha256) async {
    if (expectedSha256 is! String ||
        !RegExp(r'^[a-fA-F0-9]{64}$').hasMatch(expectedSha256)) {
      throw const FormatException('Checksum foto asli tidak tersedia atau tidak valid.');
    }
    final bytes = await readBoundedFile(file);
    if (sha256.convert(bytes).toString() != expectedSha256.toLowerCase()) {
      throw const FormatException('Integritas foto asli tidak cocok. File tidak dirender.');
    }
    validateOriginal(bytes);
    return bytes;
  }

  static img.Image _decode(Uint8List bytes, EvidencePhotoHeader header) {
    final img.Image? decoded;
    try {
      // Explicit decoder selection prevents format sniffing from invoking an
      // unbounded decoder for a format whose headers were not inspected.
      decoded = header.format == EvidencePhotoFormat.jpeg
          ? img.JpegDecoder().decode(bytes)
          : img.PngDecoder().decode(bytes, frame: 0);
    } catch (_) {
      throw const FormatException('Foto tidak dapat didekode. Gunakan JPEG/PNG yang valid.');
    }
    if (decoded == null) {
      throw const FormatException('Foto tidak dapat didekode. Gunakan JPEG/PNG yang valid.');
    }
    // JPEG EXIF orientation can swap dimensions; it cannot increase the area.
    final same = decoded.width == header.width && decoded.height == header.height;
    final rotated = decoded.width == header.height && decoded.height == header.width;
    if ((!same && !rotated) || decoded.numFrames != 1) {
      throw const FormatException('Dimensi/frame foto tidak cocok dengan header.');
    }
    return decoded;
  }

  static img.Image validateOriginal(Uint8List bytes) {
    final header = EvidencePhotoHeader.inspect(bytes);
    if (header.width < minEdge || header.height < minEdge) {
      throw const FormatException('Resolusi foto terlalu kecil, minimal 320x320.');
    }
    return _decode(bytes, header);
  }

  static void validateJpeg(Uint8List bytes) {
    final header = EvidencePhotoHeader.inspect(bytes);
    if (header.format != EvidencePhotoFormat.jpeg) {
      throw const FormatException('Hasil watermark harus berupa JPEG.');
    }
    _decode(bytes, header);
  }
}
