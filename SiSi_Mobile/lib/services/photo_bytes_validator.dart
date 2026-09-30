import 'dart:typed_data';
import 'package:image/image.dart' as img;

/// Shared client-side boundary for evidence-image bytes.
/// It validates the decoded image, not only a filename or MIME label.
class PhotoBytesValidator {
  static const maxBytes = 40 * 1024 * 1024;
  static const minEdge = 320;

  static img.Image validateOriginal(Uint8List bytes) {
    if (bytes.isEmpty || bytes.length > maxBytes) {
      throw const FormatException('Foto kosong atau melebihi batas 40 MB.');
    }
    final decoded = img.decodeImage(bytes);
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
    final decoded = img.decodeImage(bytes);
    if (decoded == null) throw const FormatException('JPEG tidak dapat didekode.');
  }
}
