import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import '../lib/services/evidence_photo_header.dart';
import '../lib/services/local_watermark_data.dart';
import '../lib/services/local_watermark_renderer.dart';
import '../lib/services/photo_bytes_validator.dart';

const _signature = [137, 80, 78, 71, 13, 10, 26, 10];
List<int> _u32(int n) => [(n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
int _read32(List<int> b, int p) =>
    b[p] * 16777216 + b[p + 1] * 65536 + b[p + 2] * 256 + b[p + 3];
List<int> _chunk(String name, List<int> data) {
  final body = [...name.codeUnits, ...data];
  var crc = 0xffffffff;
  for (final byte in body) {
    crc ^= byte;
    for (var i = 0; i < 8; i++) {
      crc = (crc & 1) != 0 ? (crc >> 1) ^ 0xedb88320 : crc >> 1;
    }
  }
  return [..._u32(data.length), ...body, ..._u32(crc ^ 0xffffffff)];
}
List<int> _ihdr(int w, int h, int color) =>
    _chunk('IHDR', [..._u32(w), ..._u32(h), 8, color, 0, 0, 0]);
Uint8List _header(int color, List<int> extra) => Uint8List.fromList([
  ..._signature, ..._ihdr(320, 320, color), ...extra,
  ..._chunk('IDAT', [0]), ..._chunk('IEND', []),
]);

// No giant pixel decoding. The actual image 4.9.2 metadata parser sees a
// second IHDR 18 bytes earlier than a length-only walker after malformed
// RGB bKGD. Valid CRCs on both IHDRs are not sufficient to stop this.
Uint8List _hiddenHeader(int w, int h) {
  final hidden = _ihdr(w, h, 2);
  final outerSize = _read32(hidden, 18);
  final tail = <int>[...hidden.sublist(18), ..._chunk('IEND', [])];
  if (outerSize + 12 < tail.length || outerSize > 256) {
    throw StateError('Use the small fixed regression dimensions');
  }
  tail.addAll(List<int>.filled(outerSize + 12 - tail.length, 0));
  return Uint8List.fromList([
    ..._signature, ..._ihdr(320, 320, 2), ..._chunk('IDAT', [0]),
    ..._u32(28), ...'bKGD'.codeUnits, ...List<int>.filled(14, 0),
    ...hidden.sublist(0, 18), ...tail, ..._chunk('IEND', []),
  ]);
}

class _NoAssets extends CachingAssetBundle {
  int calls = 0;
  @override
  Future<ByteData> load(String key) async {
    calls++;
    throw StateError('Rejected PNG must not load assets');
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final chunkError = isA<FormatException>().having(
      (e) => e.message, 'chunk rejection', 'Struktur chunk PNG tidak valid.');

  test('actual decoder metadata parser demonstrates the hidden IHDR fixture', () {
    // Harmless dimensions; startDecode only, NEVER decodeFrame/decode.
    final info = img.PngDecoder().startDecode(_hiddenHeader(321, 320));
    expect(info, isNotNull);
    expect(info!.width, 321);
    expect(info.height, 320);
  });

  test('hidden small and oversized IHDRs reject before library decode', () {
    for (final size in [[321, 320], [8193, 320], [65535, 65535]]) {
      final bytes = _hiddenHeader(size[0], size[1]);
      final before = Uint8List.fromList(bytes);
      expect(() => EvidencePhotoHeader.inspect(bytes), throwsA(chunkError));
      expect(() => PhotoBytesValidator.validateOriginal(bytes), throwsA(chunkError));
      expect(bytes, orderedEquals(before));
    }
  });

  test('bKGD exact length follows each color type, not just RGB', () {
    for (final color in [0, 2, 3, 4, 6]) {
      final size = color == 3 ? 1 : (color == 0 || color == 4 ? 2 : 6);
      final palette = color == 3 ? _chunk('PLTE', [0, 0, 0]) : <int>[];
      expect(() => EvidencePhotoHeader.inspect(_header(color, [
        ...palette, ..._chunk('bKGD', List<int>.filled(size, 0)),
      ])), returnsNormally);
      for (final wrong in [0, size - 1, size + 1, 28]) {
        expect(() => EvidencePhotoHeader.inspect(_header(color, [
          ...palette, ..._chunk('bKGD', List<int>.filled(wrong, 0)),
        ])), throwsA(chunkError));
      }
    }
  });

  test('fixed-size metadata cannot overrun or leave unconsumed payload', () {
    for (final entry in {'pHYs': 9, 'gAMA': 4, 'cICP': 4}.entries) {
      for (final size in [0, entry.value - 1, entry.value + 1, 28]) {
        expect(() => EvidencePhotoHeader.inspect(_header(2,
          _chunk(entry.key, List<int>.filled(size, 0)))), throwsA(chunkError));
      }
    }
    expect(() => EvidencePhotoHeader.inspect(_header(2,
      _chunk('pHYs', [...List<int>.filled(8, 0), 2]))), throwsA(chunkError));
  });

  test('iCCP name and method stay inside chunk boundaries', () {
    for (final data in <List<int>>[
      [], [0, 0, 1], [65], [65, 0], [65, 0, 0],
      [65, 0, 1, 1], [65, 0xc3, 0xa9, 0, 0, 1],
      [...List<int>.filled(80, 65), 0, 0, 1],
    ]) {
      expect(() => EvidencePhotoHeader.inspect(_header(2, _chunk('iCCP', data))),
          throwsA(chunkError));
    }
    expect(() => EvidencePhotoHeader.inspect(_header(2,
      _chunk('iCCP', [...List<int>.filled(79, 65), 0, 0, 1]))), returnsNormally);
  });

  test('palette and transparency metadata reject invalid structure', () {
    for (final data in [<int>[], [0, 0], List<int>.filled(771, 0)]) {
      expect(() => EvidencePhotoHeader.inspect(_header(3, _chunk('PLTE', data))),
          throwsA(chunkError));
    }
    expect(() => EvidencePhotoHeader.inspect(_header(3, [
      ..._chunk('PLTE', [0, 0, 0]), ..._chunk('bKGD', [1]),
    ])), throwsA(chunkError));
    for (final color in [0, 2, 3, 4, 6]) {
      expect(() => EvidencePhotoHeader.inspect(_header(color,
        _chunk('tRNS', List<int>.filled(7, 0)))), throwsA(chunkError));
    }
  });

  test('invalid chunk names and unknown critical chunks reject', () {
    for (final name in ['a1Cd', 'abcd', 'ABCD']) {
      expect(() => EvidencePhotoHeader.inspect(_header(2, _chunk(name, []))),
          throwsA(chunkError));
    }
    expect(() => EvidencePhotoHeader.inspect(_header(2, _chunk('vpAg', []))),
        returnsNormally);
  });

  test('valid metadata retains pixels, byte identity and decoder alignment', () {
    final raw = img.Image(width: 320, height: 320, numChannels: 3);
    img.fill(raw, color: img.ColorRgb8(12, 34, 56));
    final original = img.encodePng(raw);
    final bytes = Uint8List.fromList([
      ...original.sublist(0, 33),
      ..._chunk('bKGD', [0, 1, 0, 2, 0, 3]),
      ..._chunk('pHYs', [..._u32(1000), ..._u32(1000), 1]),
      ..._chunk('gAMA', _u32(100000)),
      ..._chunk('cICP', [1, 13, 0, 1]),
      ..._chunk('tEXt', [...'key'.codeUnits, 0, ...'value'.codeUnits]),
      ..._chunk('vpAg', [1, 2, 3]),
      ...original.sublist(33),
    ]);
    final before = Uint8List.fromList(bytes);
    final decoded = PhotoBytesValidator.validateOriginal(bytes);
    expect(decoded.width, 320);
    expect(decoded.height, 320);
    final pixel = decoded.getPixel(0, 0);
    expect([pixel.r, pixel.g, pixel.b], [12, 34, 56]);
    expect(bytes, orderedEquals(before));
  });

  test('renderer stops hidden-header PNG before loading assets', () async {
    final assets = _NoAssets();
    final data = LocalWatermarkData(
      team: WatermarkTeam.yandal, code: 'TEST', ulp: 'ULP Toboali',
      capturedAt: DateTime.utc(2026, 9, 30), createdAt: DateTime.utc(2026, 9, 30),
      latitude: -3, longitude: 106, isMocked: false,
      penyulang: 'Palas', section: '2',
    );
    await expectLater(LocalWatermarkRenderer.render(
      originalBytes: _hiddenHeader(8193, 320), data: data, assets: assets,
    ), throwsA(chunkError));
    expect(assets.calls, 0);
  });
}
