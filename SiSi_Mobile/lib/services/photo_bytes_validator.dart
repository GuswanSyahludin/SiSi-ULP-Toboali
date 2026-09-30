import 'dart:io';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:image/image.dart' as img;

/// Shared client-side boundary for evidence-image bytes.
/// It validates the decoded image, not only a filename or MIME label.
class PhotoBytesValidator {
  static const maxBytes = 40 * 1024 * 1024;
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

  static img.Image validateOriginal(Uint8List bytes) {
    if (bytes.isEmpty || bytes.length > maxBytes) {
      throw const FormatException('Foto kosong atau melebihi batas 40 MB.');
    }
    final img.Image? decoded;
    try {
      decoded = img.decodeImage(bytes);
    } catch (_) {
      throw const FormatException('Foto tidak dapat didekode. Gunakan JPEG/PNG yang valid.');
    }
    if (decoded == null) throw const FormatException('Foto tidak dapat didekode. Gunakan JPEG/PNG yang valid.');
    if (decoded.width < minEdge || decoded.height < minEdge) {
      throw const FormatException('Resolusi foto terlalu kecil, minimal 320x320.');
    }
    return decoded;
  }

  static void validateJpeg(Uint8List bytes) {
    if (bytes.length < 4 || bytes.length > maxBytes || bytes[0] != 0xff || bytes[1] != 0xd8 ||
        bytes[bytes.length - 2] != 0xff || bytes[bytes.length - 1] != 0xd9) {
      throw const FormatException('Struktur JPEG tidak lengkap atau melebihi batas 40 MB.');
    }
    try {
      if (img.decodeImage(bytes) == null) {
        throw const FormatException('JPEG tidak dapat didekode.');
      }
    } catch (_) {
      throw const FormatException('JPEG tidak dapat didekode.');
    }
  }
}
