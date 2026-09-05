import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import '../lib/services/local_watermark_data.dart';
import '../lib/services/local_watermark_renderer.dart';

LocalWatermarkData sample(WatermarkTeam team, {String code = 'TEM-001', bool mocked = false, String finding = 'Sambungan longgar'}) => LocalWatermarkData(
  team: team, code: code, ulp: 'ULP Toboali',
  capturedAt: DateTime.utc(2026,9,5,6,49), createdAt: DateTime.utc(2026,9,5,6,45),
  latitude: -3.006833, longitude: 106.444852, accuracyMeters: 4.2, isMocked: mocked,
  penyulang: 'Palas', section: 'Section 2', jenisPekerjaan: 'Pengecekan Gardu',
  daerah: 'Desa Palas', subTim: 'Yandal 13', petugas: 'Petugas uji',
  nomorGardu: 'TB-021', segmen: 'Segmen 3', temuan: finding,
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('inspection uses finding IDs; ROW and Yandal use their own IDs', () {
    expect(sample(WatermarkTeam.inspeksiGardu).codeLabel, 'Kode Temuan');
    expect(sample(WatermarkTeam.inspeksiJaringan).codeLabel, 'Kode Temuan');
    expect(sample(WatermarkTeam.row).codeLabel, 'Kode Eksekusi');
    expect(sample(WatermarkTeam.yandal).codeLabel, 'Kode P0');
    expect(() => sample(WatermarkTeam.inspeksiGardu, code: '').validate(), throwsArgumentError);
  });
  test('team-specific fields and creation timestamp are preserved', () {
    final y = Map.fromEntries(sample(WatermarkTeam.yandal).fields);
    expect(y['Tim (Petugas)'], 'Yandal 13 (Petugas uji)');
    expect(y['Waktu'], '05/09/2026 13:45:00 WIB');
    final g = Map.fromEntries(sample(WatermarkTeam.inspeksiGardu).fields);
    expect(g['Nomor Gardu'], 'TB-021'); expect(g.containsKey('Koordinat temuan'), isTrue);
    expect(g.containsKey('Jenis pekerjaan'), isFalse);
    final j = Map.fromEntries(sample(WatermarkTeam.inspeksiJaringan).fields);
    expect(j['Segmen'], 'Segmen 3'); expect(j['Temuan'], 'Sambungan longgar');
    expect(sample(WatermarkTeam.row).fields.any((e) => e.key == 'Tim (Petugas)'), isFalse);
  });
  test('WIB display handles midnight without using sync time', () {
    expect(LocalWatermarkData.date(DateTime.utc(2026,9,5,18)), '06/09/2026');
    expect(LocalWatermarkData.time(DateTime.utc(2026,9,5,18)), '01:00:00');
  });
  test('mocked coordinates are rejected', () {
    expect(() => sample(WatermarkTeam.yandal, mocked: true).validate(), throwsArgumentError);
  });
  test('renders all four formats as new JPEG bytes and preserves originals', () async {
    final source = img.Image(width: 1200, height: 900);
    img.fill(source, color: img.ColorRgb8(140,160,180));
    final bytes = Uint8List.fromList(img.encodeJpg(source));
    final before = Uint8List.fromList(bytes);
    for (final team in WatermarkTeam.values) {
      final result = await LocalWatermarkRenderer.render(originalBytes: bytes, data: sample(team));
      expect(bytes, orderedEquals(before));
      final output = img.decodeJpg(result.jpeg)!;
      expect(output.width, 1200); expect(output.height, 900);
      expect(result.metadata['codeLabel'], sample(team).codeLabel);
      final panel = result.metadata['panel'] as Map;
      expect(panel['top'], greaterThanOrEqualTo(0));
      expect(result.metadata['originalSha256'], isNot(result.metadata['watermarkSha256']));
    }
  });
  test('portrait render stays in bounds', () async {
    final bytes = Uint8List.fromList(img.encodePng(img.Image(width:900,height:1200)));
    final r = await LocalWatermarkRenderer.render(originalBytes:bytes,data:sample(WatermarkTeam.inspeksiJaringan));
    final panel = r.metadata['panel'] as Map;
    expect((panel['left'] as num) + (panel['width'] as num), lessThan(900));
    expect((panel['top'] as num) + (panel['height'] as num), lessThan(1200));
  });
}
