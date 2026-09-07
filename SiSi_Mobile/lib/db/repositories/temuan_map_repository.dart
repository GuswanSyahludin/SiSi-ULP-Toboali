import 'delta_sync_repository.dart';

class TemuanMapPoint {
  final String kode;
  final String ulp;
  final String tanggal;
  final String tim;
  final String objek;
  final String penyulang;
  final String section;
  final String nomorTiang;
  final String tier;
  final String temuan;
  final String deskripsi;
  final String status;
  final String timEksekusi;
  final String fotoUrl;
  final double latitude;
  final double longitude;

  const TemuanMapPoint({
    required this.kode,
    required this.ulp,
    required this.tanggal,
    required this.tim,
    required this.objek,
    required this.penyulang,
    required this.section,
    required this.nomorTiang,
    required this.tier,
    required this.temuan,
    required this.deskripsi,
    required this.status,
    required this.timEksekusi,
    required this.fotoUrl,
    required this.latitude,
    required this.longitude,
  });

  static TemuanMapPoint? fromRow(dynamic raw) {
    if (raw is! List || raw.length < 27) return null;
    String at(int index) => index < raw.length ? '${raw[index] ?? ''}'.trim() : '';
    double? number(int index) => double.tryParse(at(index).replaceAll(',', '.'));
    var latitude = number(22);
    var longitude = number(23);
    if (latitude == null || longitude == null) {
      final parts = at(21).split(',');
      if (parts.length >= 2) {
        latitude ??= double.tryParse(parts[0].trim().replaceAll(',', '.'));
        longitude ??= double.tryParse(parts[1].trim().replaceAll(',', '.'));
      }
    }
    if (latitude == null || longitude == null ||
        latitude < -11 || latitude > 6 || longitude < 95 || longitude > 141) {
      return null;
    }
    final kode = at(3);
    if (kode.isEmpty) return null;
    return TemuanMapPoint(
      kode: kode,
      ulp: at(4),
      tanggal: at(6),
      tim: at(7),
      objek: at(8),
      penyulang: at(9),
      section: at(10),
      nomorTiang: at(12),
      tier: at(14),
      temuan: at(15),
      fotoUrl: at(17),
      deskripsi: at(20),
      status: at(26),
      timEksekusi: at(29),
      latitude: latitude,
      longitude: longitude,
    );
  }
}

class TemuanMapRepository {
  final DeltaSyncRepository _delta = DeltaSyncRepository();

  Future<List<TemuanMapPoint>> load({required String ulp, bool allUlp = false}) async {
    final raw = await _delta.rows('db_INS_Temuan');
    final seen = <String>{};
    final result = <TemuanMapPoint>[];
    for (final row in raw) {
      final point = TemuanMapPoint.fromRow(row);
      if (point == null) continue;
      if (!allUlp && ulp.trim().isNotEmpty &&
          point.ulp.trim().toLowerCase() != ulp.trim().toLowerCase()) continue;
      if (seen.add(point.kode)) result.add(point);
    }
    result.sort((a, b) => b.tanggal.compareTo(a.tanggal));
    return result;
  }
}
