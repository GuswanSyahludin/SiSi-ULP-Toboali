import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import '../lib/services/evidence_photo_header.dart';
import '../lib/services/local_watermark_data.dart';
import '../lib/services/local_watermark_renderer.dart';
import '../lib/services/petugas_photo_store.dart';
import '../lib/services/photo_bytes_validator.dart';

List<int> _be32(int n) => [(n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
List<int> _segment(int marker, List<int> data) =>
    [255, marker, (data.length + 2) >> 8, (data.length + 2) & 255, ...data];
List<int> _sof(int width, int height, {int marker = 0xc0, int sample = 0x11}) =>
    _segment(marker, [8, height >> 8, height & 255, width >> 8, width & 255, 1, 1, sample, 0]);
List<int> _sos() => _segment(0xda, [1, 1, 0, 0, 63, 0]);

// Header-only fixtures test preflight, not decodability. They intentionally
// contain no giant pixel buffers, quantization/Huffman tables or image planes.
Uint8List _jpegHeader(int width, int height, {int marker = 0xc0}) =>
    Uint8List.fromList([255, 216, ..._sof(width, height, marker: marker), ..._sos(), 0, 255, 217]);

List<int> _chunk(String type, List<int> data) {
  final body = [...type.codeUnits, ...data];
  var crc = 0xffffffff;
  for (final byte in body) {
    crc ^= byte;
    for (var i = 0; i < 8; i++) {
      crc = (crc & 1) != 0 ? (crc >> 1) ^ 0xedb88320 : crc >> 1;
    }
  }
  return [..._be32(data.length), ...body, ..._be32(crc ^ 0xffffffff)];
}
List<int> _ihdr(int width, int height) =>
    _chunk('IHDR', [..._be32(width), ..._be32(height), 8, 2, 0, 0, 0]);
const _pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
Uint8List _pngHeader(int width, int height, {List<int> extra = const []}) =>
    Uint8List.fromList([..._pngSignature, ..._ihdr(width, height), ...extra,
      ..._chunk('IDAT', [0]), ..._chunk('IEND', [])]);

class _NoAssets extends CachingAssetBundle {
  int calls = 0;
  @override
  Future<ByteData> load(String key) async {
    calls++;
    throw StateError('Invalid image must not load assets');
  }
}

LocalWatermarkData _data() => LocalWatermarkData(
  team: WatermarkTeam.yandal, code: 'TEST-P0', ulp: 'ULP Toboali',
  capturedAt: DateTime.utc(2026, 9, 30, 7), createdAt: DateTime.utc(2026, 9, 30, 6),
  latitude: -3.0, longitude: 106.4, accuracyMeters: 5, isMocked: false,
  penyulang: 'Palas', section: 'Section 2', jenisPekerjaan: 'Pengecekan',
  subTim: 'Yandal 13', petugas: 'Uji',
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final image = img.Image(width: 320, height: 320);
  final jpeg = Uint8List.fromList(img.encodeJpg(image));
  final png = Uint8List.fromList(img.encodePng(image));
  final resolutionError = isA<FormatException>().having(
      (e) => e.message, 'pre-decoder limit message', contains('Resolusi foto melebihi batas'));

  test('real JPEG/PNG pass preflight and the real decoder without mutation', () {
    for (final bytes in [jpeg, png]) {
      final before = Uint8List.fromList(bytes);
      final header = EvidencePhotoHeader.inspect(bytes);
      expect(header.width, 320);
      expect(header.height, 320);
      expect(PhotoBytesValidator.validateOriginal(bytes).width, 320);
      expect(bytes, orderedEquals(before));
    }
    expect(EvidencePhotoHeader.inspect(jpeg).format, EvidencePhotoFormat.jpeg);
    expect(EvidencePhotoHeader.inspect(png).format, EvidencePhotoFormat.png);
  });

  test('exact edge and pixel ceilings pass header inspection only', () {
    for (final make in <Uint8List Function(int, int)>[_jpegHeader, _pngHeader]) {
      expect(EvidencePhotoHeader.inspect(make(4096, 4096)).width, 4096);
      expect(EvidencePhotoHeader.inspect(make(8192, 2048)).height, 2048);
      expect(EvidencePhotoHeader.inspect(make(2048, 8192)).height, 8192);
    }
    expect(EvidencePhotoHeader.maxPixels, 4096 * 4096);
  });

  test('edge and area overflows reject with pre-decoder error', () {
    for (final make in <Uint8List Function(int, int)>[_jpegHeader, _pngHeader]) {
      for (final size in [[8193, 320], [320, 8193], [4097, 4096], [8192, 2049]]) {
        final bytes = make(size[0], size[1]);
        expect(() => EvidencePhotoHeader.inspect(bytes), throwsA(resolutionError));
        expect(() => PhotoBytesValidator.validateOriginal(bytes), throwsA(resolutionError));
      }
    }
    expect(() => PhotoBytesValidator.validateJpeg(_jpegHeader(8193, 320)), throwsA(resolutionError));
    expect(() => EvidencePhotoHeader.inspect(_pngHeader(0xffffffff, 320)), throwsA(resolutionError));
  });

  test('zero dimensions, missing EOI/IEND and trailing content fail closed', () {
    for (final make in <Uint8List Function(int, int)>[_jpegHeader, _pngHeader]) {
      for (final size in [[0, 320], [320, 0]]) {
        expect(() => EvidencePhotoHeader.inspect(make(size[0], size[1])), throwsFormatException);
      }
    }
    for (final b in [jpeg, png]) {
      expect(() => EvidencePhotoHeader.inspect(Uint8List.sublistView(b, 0, b.length - 1)), throwsFormatException);
      expect(() => EvidencePhotoHeader.inspect(Uint8List.fromList([...b, 1])), throwsFormatException);
    }
  });

  test('every truncated prefix fails as FormatException, not RangeError', () {
    for (final bytes in [_jpegHeader(320, 320), _pngHeader(320, 320)]) {
      for (var i = 0; i < bytes.length; i++) {
        expect(() => EvidencePhotoHeader.inspect(Uint8List.sublistView(bytes, 0, i)), throwsFormatException);
      }
    }
  });

  test('header success is not accepted as a decodable image', () {
    for (final make in <Uint8List Function(int, int)>[_jpegHeader, _pngHeader]) {
      final bytes = make(320, 320);
      expect(() => EvidencePhotoHeader.inspect(bytes), returnsNormally);
      expect(() => PhotoBytesValidator.validateOriginal(bytes), throwsFormatException);
    }
  });

  test('JPEG metadata payload is skipped, not scanned as a frame', () {
    final bytes = Uint8List.fromList([255, 216,
      ..._segment(0xe1, _sof(65535, 65535)),
      ..._sof(320, 320), ..._sos(), 0, 255, 217]);
    expect(EvidencePhotoHeader.inspect(bytes).width, 320);
  });

  test('progressive scans, stuffed FF and restart markers preserve one frame', () {
    final bytes = Uint8List.fromList([255, 216, ..._sof(320, 320, marker: 0xc2),
      ..._sos(), 3, 255, 0, 2, 255, 208, 4, ..._sos(), 5, 255, 217]);
    expect(EvidencePhotoHeader.inspect(bytes).height, 320);
  });

  test('duplicate JPEG SOF before or after scan and DNL are rejected', () {
    for (final middle in [
      [..._sof(320, 320)],
      [..._sos(), 0, ..._sof(65535, 65535)],
      [..._sos(), 0, ..._segment(0xdc, [1, 64])],
    ]) {
      final bytes = Uint8List.fromList([255, 216, ..._sof(320, 320), ...middle, ..._sos(), 0, 255, 217]);
      expect(() => EvidencePhotoHeader.inspect(bytes), throwsFormatException);
    }
  });

  test('invalid JPEG sampling and out-of-bounds segment are rejected', () {
    for (final sample in [0, 0x50, 0x44]) {
      final b = Uint8List.fromList([255, 216, ..._sof(320, 320, sample: sample), ..._sos(), 0, 255, 217]);
      expect(() => EvidencePhotoHeader.inspect(b), throwsFormatException);
    }
    expect(() => EvidencePhotoHeader.inspect(Uint8List.fromList([255,216,255,225,255,255])), throwsFormatException);
    expect(() => EvidencePhotoHeader.inspect(_jpegHeader(320, 320, marker: 0xc3)), throwsFormatException);
  });

  test('PNG requires first and unique IHDR and bounded chunk lengths', () {
    final firstWrong = Uint8List.fromList([..._pngSignature, ..._chunk('tEXt', []), ..._ihdr(320,320), ..._chunk('IEND',[])]);
    expect(() => EvidencePhotoHeader.inspect(firstWrong), throwsFormatException);
    expect(() => EvidencePhotoHeader.inspect(_pngHeader(320,320,extra:_ihdr(320,320))), throwsFormatException);
    final afterData = Uint8List.fromList([..._pngSignature, ..._ihdr(320,320),
      ..._chunk('IDAT',[0]), ..._ihdr(65535,65535), ..._chunk('IEND',[])]);
    expect(() => EvidencePhotoHeader.inspect(afterData), throwsFormatException);
    final overflow = Uint8List.fromList([..._pngSignature, ..._be32(0xffffffff), ...'IHDR'.codeUnits, 0,0,0,0]);
    expect(() => EvidencePhotoHeader.inspect(overflow), throwsFormatException);
  });

  test('all APNG control chunks reject even if they claim just one frame', () {
    for (final type in ['acTL','fcTL','fdAT']) {
      expect(() => EvidencePhotoHeader.inspect(_pngHeader(320,320,
        extra:_chunk(type,[..._be32(1),..._be32(0)]))), throwsFormatException);
    }
  });

  test('other formats cannot fall through to a generic decoder', () {
    final gif = Uint8List.fromList(img.encodeGif(image));
    expect(() => PhotoBytesValidator.validateOriginal(gif), throwsFormatException);
    expect(() => PhotoBytesValidator.validateJpeg(png), throwsFormatException);
  });

  test('JPEG output keeps decoder check without imposing capture minimum', () {
    final tiny = Uint8List.fromList(img.encodeJpg(img.Image(width: 8, height: 8)));
    expect(() => PhotoBytesValidator.validateJpeg(tiny), returnsNormally);
    expect(() => PhotoBytesValidator.validateOriginal(tiny), throwsFormatException);
  });

  test('render rejects over-budget input before assets or drawing', () async {
    final assets = _NoAssets();
    await expectLater(LocalWatermarkRenderer.render(
      originalBytes: _jpegHeader(65535, 65535), data: _data(), assets: assets,
    ), throwsA(resolutionError));
    expect(assets.calls, 0);
  });

  test('oversized dimensions never request storage or publish capture metadata', () async {
    const channel = MethodChannel('id.co.ulptoboali.sisi/photo_export');
    var calls = 0;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (_) async {
      calls++;
      throw StateError('must not touch private storage');
    });
    final dir = await Directory.systemTemp.createTemp('sisi-dimension-limit-');
    try {
      final bytes = _pngHeader(65535, 65535);
      final file = await File('${dir.path}/source.png').writeAsBytes(bytes);
      final metadata = <String, dynamic>{'team':'yandal', 'code':''};
      await expectLater(PetugasPhotoStore.saveOriginal(
        owner:'test|ulp toboali', source:file, metadata:metadata,
      ), throwsA(resolutionError));
      expect(calls, 0);
      expect(metadata, {'team':'yandal', 'code':''});
      expect(await file.readAsBytes(), orderedEquals(bytes));
      expect(await dir.list().length, 1);
    } finally {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
      await dir.delete(recursive: true);
    }
  });
}
