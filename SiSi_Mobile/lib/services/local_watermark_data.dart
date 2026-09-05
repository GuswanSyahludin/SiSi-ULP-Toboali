enum WatermarkTeam { yandal, row, inspeksiGardu, inspeksiJaringan }

/// Immutable capture metadata. IDs must be supplied by the domain layer;
/// no shift/header ID is silently substituted for a P0/finding/execution ID.
class LocalWatermarkData {
  static const formatVersion = 'sisi-local-team-v1';
  final WatermarkTeam team;
  final String code;
  final String ulp;
  final DateTime capturedAt;
  final DateTime createdAt;
  final double latitude;
  final double longitude;
  final double? accuracyMeters;
  final bool isMocked;
  final String penyulang;
  final String section;
  final String jenisPekerjaan;
  final String daerah;
  final String subTim;
  final String petugas;
  final String nomorGardu;
  final String segmen;
  final String temuan;
  final String tahap;

  const LocalWatermarkData({
    required this.team, required this.code, required this.ulp,
    required this.capturedAt, required this.createdAt,
    required this.latitude, required this.longitude,
    required this.isMocked, required this.penyulang, required this.section,
    this.accuracyMeters, this.jenisPekerjaan = '', this.daerah = '',
    this.subTim = '', this.petugas = '', this.nomorGardu = '',
    this.segmen = '', this.temuan = '', this.tahap = '',
  });

  String get codeLabel => team == WatermarkTeam.yandal ? 'Kode P0'
      : team == WatermarkTeam.row ? 'Kode Eksekusi' : 'Kode Temuan';
  bool get inspection => team == WatermarkTeam.inspeksiGardu || team == WatermarkTeam.inspeksiJaringan;
  String get teamLabel => const {
    WatermarkTeam.yandal: 'Yandal', WatermarkTeam.row: 'ROW',
    WatermarkTeam.inspeksiGardu: 'Inspeksi Gardu',
    WatermarkTeam.inspeksiJaringan: 'Inspeksi Jaringan',
  }[team]!;
  static String _two(int n) => n.toString().padLeft(2, '0');
  // Capture timestamps are instants, not strings parsed from a display date.
  static DateTime wib(DateTime instant) => instant.toUtc().add(const Duration(hours: 7));
  static String date(DateTime instant) {
    final d = wib(instant);
    return '${_two(d.day)}/${_two(d.month)}/${d.year}';
  }
  static String time(DateTime instant) {
    final d = wib(instant);
    return '${_two(d.hour)}:${_two(d.minute)}:${_two(d.second)}';
  }
  String get dayName => const ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'][wib(capturedAt).weekday - 1];
  static String value(String raw) => raw.trim().isEmpty ? 'Belum tersedia' : raw.trim();
  String get coordinate => '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';

  List<MapEntry<String, String>> get fields => [
    MapEntry(inspection ? 'Koordinat temuan' : 'Koordinat pekerjaan', coordinate),
    if (accuracyMeters != null) MapEntry('Akurasi GPS', '±${accuracyMeters!.toStringAsFixed(1)} m'),
    MapEntry('Penyulang', value(penyulang)),
    MapEntry('Section', value(section)),
    if (team == WatermarkTeam.yandal || team == WatermarkTeam.row)
      MapEntry('Jenis pekerjaan', value(jenisPekerjaan)),
    if (team == WatermarkTeam.yandal) ...[
      MapEntry('Daerah pekerjaan', value(daerah)),
      MapEntry('Tim (Petugas)', '${value(subTim)} (${value(petugas)})'),
    ],
    if (team == WatermarkTeam.inspeksiGardu) MapEntry('Nomor Gardu', value(nomorGardu)),
    if (team == WatermarkTeam.inspeksiJaringan) MapEntry('Segmen', value(segmen)),
    if (inspection) MapEntry('Temuan', value(temuan)),
    MapEntry('Waktu', '${date(createdAt)} ${time(createdAt)} WIB'),
  ];

  void validate() {
    if (code.trim().isEmpty) throw ArgumentError('$codeLabel wajib tersedia sebelum watermark dibuat.');
    if (ulp.trim().isEmpty) throw ArgumentError('ULP wajib tersedia.');
    if (isMocked) throw ArgumentError('Lokasi simulasi tidak boleh digunakan untuk watermark.');
    if (!latitude.isFinite || latitude < -90 || latitude > 90 ||
        !longitude.isFinite || longitude < -180 || longitude > 180) {
      throw ArgumentError('Koordinat tidak valid.');
    }
    if (accuracyMeters != null && (!accuracyMeters!.isFinite || accuracyMeters! < 0)) {
      throw ArgumentError('Akurasi GPS tidak valid.');
    }
    // Do not silently truncate long evidence labels.
    for (final v in [code, ulp, ...fields.map((e) => e.value)]) {
      if (v.length > 2000) throw ArgumentError('Metadata terlalu panjang untuk watermark.');
    }
  }

  Map<String, dynamic> toJson() => {
    'formatVersion': formatVersion, 'team': team.name,
    'codeLabel': codeLabel, 'code': code, 'ulp': ulp,
    'capturedAt': capturedAt.toUtc().toIso8601String(),
    'createdAt': createdAt.toUtc().toIso8601String(), 'timezone': 'Asia/Jakarta',
    'latitude': latitude, 'longitude': longitude, 'accuracyMeters': accuracyMeters,
    'isMocked': isMocked, 'penyulang': penyulang, 'section': section,
    'jenisPekerjaan': jenisPekerjaan, 'daerah': daerah, 'subTim': subTim,
    'petugas': petugas, 'nomorGardu': nomorGardu, 'segmen': segmen,
    'temuan': temuan, 'tahap': tahap,
  };
}
