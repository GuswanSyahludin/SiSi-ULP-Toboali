import 'dart:typed_data';

enum EvidencePhotoFormat { jpeg, png }

/// Allocation-free (with respect to image dimensions) preflight for evidence.
/// This is NOT a pixel decoder, CRC validator or a complete memory/CPU budget.
/// Only static JPEG/PNG are accepted. The real decoder must still succeed.
class EvidencePhotoHeader {
  static const maxBytes = 40 * 1024 * 1024;
  static const maxEdge = 8192;
  static const maxPixels = 16 * 1024 * 1024;

  final EvidencePhotoFormat format;
  final int width;
  final int height;
  const EvidencePhotoHeader._(this.format, this.width, this.height);

  static Never _invalid() =>
      throw const FormatException('Header foto JPEG/PNG tidak valid atau tidak didukung.');

  static void _dimensions(int width, int height) {
    if (width <= 0 || height <= 0) _invalid();
    // Division avoids overflow on platforms with narrower integer semantics.
    if (width > maxEdge || height > maxEdge || width > maxPixels ~/ height) {
      throw const FormatException('Resolusi foto melebihi batas 8192 piksel per sisi atau 16.777.216 piksel total.');
    }
  }

  static int _u16(Uint8List b, int p) => b[p] * 256 + b[p + 1];
  static int _u32(Uint8List b, int p) =>
      b[p] * 16777216 + b[p + 1] * 65536 + b[p + 2] * 256 + b[p + 3];

  static Never _invalidChunk() =>
      throw const FormatException('Struktur chunk PNG tidak valid.');

  // image 4.9.2 reads several metadata chunks by fixed fields rather than
  // their declared size. Validate those fields BEFORE invoking startDecode;
  // checking the decoded dimensions afterwards is too late for allocation.
  static void _pngMetadata(Uint8List b, int type, int data, int size,
      int color, int paletteEntries) {
    switch (type) {
      case 0x624b4744: // bKGD
        final expected = color == 3 ? 1 : (color == 0 || color == 4 ? 2 : 6);
        if (size != expected) _invalidChunk();
        if (color == 3 && (paletteEntries == 0 || b[data] >= paletteEntries)) {
          _invalidChunk();
        }
        break;
      case 0x70485973: // pHYs
        if (size != 9 || b[data + 8] > 1) _invalidChunk();
        break;
      case 0x67414d41: // gAMA
        if (size != 4 || _u32(b, data) == 0) _invalidChunk();
        break;
      case 0x63494350: // cICP
        if (size != 4) _invalidChunk();
        break;
      case 0x69434350: // iCCP: bounded ASCII name + NUL + method + profile
        var nameLength = 0;
        while (nameLength < size && b[data + nameLength] != 0) {
          final c = b[data + nameLength];
          // ASCII makes decoder String.length equal encoded name length.
          if (nameLength >= 79 || c < 32 || c > 126) _invalidChunk();
          nameLength++;
        }
        if (nameLength == 0 || nameLength + 2 >= size ||
            b[data + nameLength] != 0 || b[data + nameLength + 1] != 0) {
          _invalidChunk();
        }
        break;
      case 0x74524e53: // tRNS
        if (color == 0) {
          if (size != 2) _invalidChunk();
        } else if (color == 2) {
          if (size != 6) _invalidChunk();
        } else if (color == 3) {
          if (size == 0 || size > paletteEntries) _invalidChunk();
        } else {
          _invalidChunk();
        }
        break;
    }
  }

  static EvidencePhotoHeader inspect(Uint8List bytes) {
    if (bytes.isEmpty || bytes.length > maxBytes) {
      throw const FormatException('Foto kosong atau melebihi batas 40 MB.');
    }
    if (bytes.length >= 2 && bytes[0] == 0xff && bytes[1] == 0xd8) {
      return _jpeg(bytes);
    }
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (bytes.length >= signature.length) {
      var png = true;
      for (var i = 0; i < signature.length; i++) {
        if (bytes[i] != signature[i]) png = false;
      }
      if (png) return _png(bytes);
    }
    throw const FormatException('Gunakan foto JPEG/PNG statis, bukan animasi atau format lain.');
  }

  static EvidencePhotoHeader _png(Uint8List b) {
    var p = 8;
    int? width, height;
    var color = -1, paletteEntries = 0;
    var hasData = false;
    while (p < b.length) {
      if (b.length - p < 12) _invalid();
      final size = _u32(b, p);
      if (size > b.length - p - 12) _invalid();
      final type = _u32(b, p + 4);
      final data = p + 8;
      for (var i = p + 4; i < data; i++) {
        final c = b[i];
        if (!((c >= 65 && c <= 90) || (c >= 97 && c <= 122))) _invalidChunk();
      }
      if ((b[p + 6] & 32) != 0) _invalidChunk(); // reserved bit
      if (p == 8 && type != 0x49484452) _invalid(); // IHDR first
      switch (type) {
        case 0x49484452: // IHDR: reject duplicates, even after IDAT
          if (p != 8 || width != null || size != 13) _invalid();
          width = _u32(b, data);
          height = _u32(b, data + 4);
          _dimensions(width, height);
          final bits = b[data + 8];
          color = b[data + 9];
          final validBits = switch (color) {
            0 => const [1, 2, 4, 8, 16],
            2 || 4 || 6 => const [8, 16],
            3 => const [1, 2, 4, 8],
            _ => const <int>[],
          };
          if (!validBits.contains(bits) || b[data + 10] != 0 ||
              b[data + 11] != 0 || b[data + 12] > 1) _invalid();
          break;
        case 0x504c5445: // PLTE
          if (hasData || paletteEntries != 0 || size == 0 ||
              size > 768 || size % 3 != 0 || color == 0 || color == 4) {
            _invalidChunk();
          }
          paletteEntries = size ~/ 3;
          break;
        case 0x6163544c: // acTL
        case 0x6663544c: // fcTL, including inconsistent one-frame APNG
        case 0x66644154: // fdAT
          throw const FormatException('Foto animasi/APNG tidak didukung.');
        case 0x49444154: // IDAT
          if (color == 3 && paletteEntries == 0) _invalidChunk();
          hasData = true;
          break;
        case 0x49454e44: // IEND
          if (size != 0 || !hasData || width == null || height == null ||
              p + 12 != b.length) _invalid();
          return EvidencePhotoHeader._(EvidencePhotoFormat.png, width, height);
        default:
          // Unknown critical chunks cannot be treated as harmless metadata.
          if ((b[p + 4] & 32) == 0) _invalidChunk();
          _pngMetadata(b, type, data, size, color, paletteEntries);
          break;
      }
      // Skip, never inflate metadata or image data during preflight.
      p += size + 12;
    }
    _invalid();
  }

  static EvidencePhotoHeader _jpeg(Uint8List b) {
    var p = 2;
    int? width, height;
    var hasScan = false;
    var inScan = false;
    while (p < b.length) {
      // Entropy data uses FF00 stuffing and standalone restart markers.
      // Scan through it so a later duplicate/oversized frame cannot hide.
      if (inScan) {
        while (p < b.length && b[p] != 0xff) { p++; }
      }
      if (p >= b.length || b[p] != 0xff) _invalid();
      while (p < b.length && b[p] == 0xff) { p++; }
      if (p >= b.length) _invalid();
      final marker = b[p++];
      if (inScan && (marker == 0 || (marker >= 0xd0 && marker <= 0xd7))) {
        continue;
      }
      inScan = false;
      if (marker == 0xd9) {
        if (!hasScan || width == null || height == null || p != b.length) _invalid();
        return EvidencePhotoHeader._(EvidencePhotoFormat.jpeg, width, height);
      }
      if (b.length - p < 2) _invalid();
      final size = _u16(b, p);
      if (size < 2 || size > b.length - p) _invalid();
      final data = p + 2;
      if (marker == 0xc0 || marker == 0xc1 || marker == 0xc2) {
        if (width != null || size < 8) _invalid();
        if (b[data] != 8) _invalid();
        height = _u16(b, data + 1);
        width = _u16(b, data + 3);
        _dimensions(width, height);
        final count = b[data + 5];
        if (![1, 3, 4].contains(count) || size != 8 + count * 3) _invalid();
        final ids = <int>{};
        var samplingBlocks = 0;
        for (var i = 0; i < count; i++) {
          final c = data + 6 + i * 3;
          final h = b[c + 1] >> 4, v = b[c + 1] & 15;
          if (!ids.add(b[c]) || h < 1 || h > 4 || v < 1 || v > 4 || b[c + 2] > 3) _invalid();
          samplingBlocks += h * v;
        }
        // JPEG's standard MCU block bound also limits malformed sampling ratios.
        if (samplingBlocks > 10) _invalid();
      } else if (marker == 0xda) { // SOS
        if (width == null || size < 6) _invalid();
        final count = b[data];
        if (count < 1 || count > 4 || size != 6 + count * 2) _invalid();
        hasScan = true;
        inScan = true;
      } else if (!(marker == 0xc4 || marker == 0xdb || marker == 0xdd ||
          marker == 0xfe || (marker >= 0xe0 && marker <= 0xef))) {
        // Reject unsupported SOF, DNL (dimension changes), nested SOI etc.
        _invalid();
      }
      p += size;
    }
    _invalid();
  }
}
