import 'package:flutter_test/flutter_test.dart';
import 'package:sisi_mobile/db/repositories/temuan_map_repository.dart';

void main() {
  List<dynamic> row({dynamic lat = '-3.01', dynamic lng = '106.45'}) {
    final values = List<dynamic>.filled(45, '');
    values[3] = 'TEM-001';
    values[4] = 'Toboali';
    values[6] = '2026-09-08';
    values[9] = 'Palas';
    values[10] = 'Section 3';
    values[12] = 'PLS-118';
    values[14] = 'Tier 1';
    values[15] = 'Vegetasi mendekati jaringan';
    values[21] = '$lat, $lng';
    values[22] = lat;
    values[23] = lng;
    values[26] = 'Penugasan Tim';
    return values;
  }

  test('parses valid db_INS_Temuan row', () {
    final point = TemuanMapPoint.fromRow(row());
    expect(point, isNotNull);
    expect(point!.kode, 'TEM-001');
    expect(point.penyulang, 'Palas');
    expect(point.latitude, -3.01);
  });

  test('rejects invalid coordinates', () {
    expect(TemuanMapPoint.fromRow(row(lat: '', lng: '')), isNull);
    expect(TemuanMapPoint.fromRow(row(lat: '91', lng: '181')), isNull);
  });

  test('falls back to combined coordinate column', () {
    final values = row(lat: '', lng: '');
    values[21] = '-3.02, 106.46';
    final point = TemuanMapPoint.fromRow(values);
    expect(point?.longitude, 106.46);
  });
}
