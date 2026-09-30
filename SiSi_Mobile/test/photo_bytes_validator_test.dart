import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import '../lib/services/photo_bytes_validator.dart';

void main() {
  final image = img.Image(width: 320, height: 320);
  final jpeg = Uint8List.fromList(img.encodeJpg(image, quality: 90));

  test('accepts a decodable original image', () {
    expect(() => PhotoBytesValidator.validateOriginal(jpeg), returnsNormally);
  });

  test('rejects SOI-only or truncated JPEG bytes', () {
    final truncated = Uint8List.fromList([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(() => PhotoBytesValidator.validateJpeg(truncated), throwsFormatException);
  });

  test('rejects non-image bytes even when named as JPEG', () {
    expect(() => PhotoBytesValidator.validateOriginal(Uint8List.fromList([1, 2, 3, 4])), throwsFormatException);
  });

  test('rejects a JPEG without a complete EOI marker', () {
    final noEoi = Uint8List.fromList(jpeg.sublist(0, jpeg.length - 2));
    expect(() => PhotoBytesValidator.validateJpeg(noEoi), throwsFormatException);
  });
}
