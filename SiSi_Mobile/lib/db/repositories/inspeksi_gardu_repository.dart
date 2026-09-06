import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:drift/drift.dart' show Value;
import 'package:http/http.dart' as http;

import '../../services/api_service.dart';
import '../app_database.dart';
import '../db_provider.dart';

class InspeksiGarduRepository {
  final dao = DbProvider.instance.inspeksiGarduDao;
  String _id(String prefix) =>
      '$prefix-${DateTime.now().microsecondsSinceEpoch}-${Random().nextInt(1 << 32).toRadixString(36)}';

  Future<Map<String, dynamic>> _post(
    String token,
    String command, {
    Duration timeout = const Duration(seconds: 90),
  }) async {
    final response = await http
        .post(
          Uri.parse('${ApiService.baseUrl}?mobile=1'),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({
            'action': 'getMasterGarduMobile',
            'token': token,
            'ulp': command,
          }),
        )
        .timeout(timeout);
    final result = Map<String, dynamic>.from(jsonDecode(response.body));
    if (result['success'] != true) {
      throw Exception(result['message'] ?? 'Server menolak paket');
    }
    return result;
  }

  Future<void> downloadListTemuan(String token) async {
    final result = await _post(
      token,
      'LIST_TEMUAN',
      timeout: const Duration(seconds: 30),
    );
    final rows = <ListTemuansCompanion>[];
    for (final raw in List.from(result['list'] ?? [])) {
      final item = Map<String, dynamic>.from(raw);
      rows.add(ListTemuansCompanion(
        no: Value(int.tryParse('${item['no']}')),
        tier: Value('${item['tier']}'),
        objekInspeksi: Value('${item['objekInspeksi']}'),
        temuan: Value('${item['temuan']}'),
      ));
    }
    await dao.gantiListTemuan(rows);
  }

  Future<String> buatLaporan({
    required String ulp,
    required String hari,
    required String tanggal,
    required String koordinatAwal,
    required String koordinatAkhir,
    required String inputBy,
    String kmAwal = '',
    String kmAkhir = '',
    String kendala = '',
  }) async {
    final id = _id('H');
    await dao.simpanHeader(InsGarduHeadersCompanion(
      localId: Value(id),
      ulp: Value(ulp),
      hari: Value(hari),
      tanggal: Value(tanggal),
      koordinatAwal: Value(koordinatAwal),
      koordinatAkhir: Value(koordinatAkhir),
      kmAwal: Value(kmAwal),
      kmAkhir: Value(kmAkhir),
      kendala: Value(kendala),
      inputBy: Value(inputBy),
      dibuatPada: Value(DateTime.now().toIso8601String()),
    ));
    final gardus =
        await DbProvider.instance.masterGarduDao.cari('', ulp: ulp, limit: 5000);
    for (final gardu in gardus) {
      if (_date(gardu.tanggalPengukuran) != tanggal) continue;
      final snapshot = {
        'ulp': gardu.ulp,
        'nomorGardu': gardu.gardu,
        'alamat': gardu.alamat,
        'penyulang': gardu.penyulang,
        'section': gardu.section,
        'merkTrafo': gardu.merk,
        'dayaKva': gardu.kapasitasKva,
        'beratTrafo': gardu.beratTrafo,
        'volumeMinyak': gardu.volumeMinyak,
        'merkPhbTr': gardu.merkPhbTr,
        'nomorSeriPhbTr': gardu.nomorSeriPhbTr,
        'tahunPhbTr': gardu.tahunPhbTr,
      };
      await dao.simpanRealisasi(InsGarduRealisasisCompanion(
        localId: Value(_id('G')),
        localHeaderId: Value(id),
        nomorGardu: Value(gardu.gardu),
        snapshotJson: Value(jsonEncode(snapshot)),
      ));
    }
    return id;
  }

  String _date(String source) {
    final value = source.trim();
    final iso = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(value);
    if (iso != null) return '${iso[1]}-${iso[2]}-${iso[3]}';
    final local =
        RegExp(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})').firstMatch(value);
    return local == null
        ? value
        : '${local[3]}-${local[2]!.padLeft(2, '0')}-${local[1]!.padLeft(2, '0')}';
  }

  Stream<List<InsGarduHeader>> pantauLaporan() => dao.pantauHeader();
  Future<List<InsGarduRealisasi>> garduLaporan(String id) => dao.realisasi(id);
  Future<List<InsGarduTemuan>> temuan(String id) => dao.temuan(id);
  Future<List<ListTemuan>> pilihan(String tier) => dao.pilihanTier(
        tier == 'Tier 1 & Tier 2' ? ['Tier 1', 'Tier 2'] : [tier],
      );

  Future<void> setGardu({
    required InsGarduRealisasi gardu,
    required String tier,
    required List<Map<String, String>> temuan,
  }) async {
    await dao.simpanRealisasi(InsGarduRealisasisCompanion(
      localId: Value(gardu.localId),
      localHeaderId: Value(gardu.localHeaderId),
      nomorGardu: Value(gardu.nomorGardu),
      tier: Value(tier),
      snapshotJson: Value(gardu.snapshotJson),
    ));
    await dao.hapusTemuanRealisasi(gardu.localId);
    final rows = <InsGarduTemuansCompanion>[];
    for (final item in temuan) {
      rows.add(InsGarduTemuansCompanion(
        localId: Value(_id('T')),
        localRealisasiId: Value(gardu.localId),
        tier: Value(item['tier'] ?? tier),
        temuan: Value(item['temuan'] ?? ''),
        deskripsi: Value(item['deskripsi'] ?? ''),
        fotoTemuanPath: Value(item['fotoTemuanPath'] ?? ''),
        fotoGarduPath: Value(item['fotoGarduPath'] ?? ''),
      ));
    }
    if (rows.isNotEmpty) await dao.simpanTemuan(rows);
  }

  Map<String, dynamic> _headerPayload(InsGarduHeader header) => {
        'localId': header.localId,
        'ulp': header.ulp,
        'tanggal': header.tanggal,
        'koordinatAwal': header.koordinatAwal,
        'koordinatAkhir': header.koordinatAkhir,
        'kmAwal': header.kmAwal,
        'kmAkhir': header.kmAkhir,
        'kendala': header.kendala,
      };

  Future<Map<String, dynamic>> _send(
    String token,
    Map<String, dynamic> package,
  ) =>
      _post(token, 'INSPEKSI:${jsonEncode(package)}');

  Future<Map<String, dynamic>> syncSemua(String token) async {
    final headers = await dao.antrean();
    var ok = 0;
    var failed = 0;
    for (final header in headers) {
      try {
        await dao.setHeaderSync(header.localId, header.kodeHeader, 'mengirim');
        var result = await _send(token, {
          'header': _headerPayload(header),
          'gardus': [],
        });
        final kodeHeader = '${result['kodeHeader']}';
        await dao.setHeaderSync(header.localId, kodeHeader, 'mengirim');
        for (final gardu in await dao.realisasi(header.localId)) {
          if (gardu.tier.isEmpty) continue;
          final findings = await dao.temuan(gardu.localId);
          if (findings.isEmpty) {
            result = await _send(token, {
              'header': _headerPayload(header),
              'gardus': [
                {
                  'localId': gardu.localId,
                  'nomorGardu': gardu.nomorGardu,
                  'tier': gardu.tier,
                  'temuan': [],
                }
              ],
            });
            final saved =
                Map<String, dynamic>.from((result['gardus'] as List).first);
            await dao.setRealisasiSync(
              gardu.localId,
              '${saved['kodePekerjaanGardu']}',
            );
            continue;
          }
          for (final finding in findings) {
            final fotoTemuan = await _b64(finding.fotoTemuanPath);
            final fotoGardu = await _b64(finding.fotoGarduPath);
            if (fotoTemuan.isEmpty || fotoGardu.isEmpty) {
              throw Exception('Dua foto belum lengkap: ${finding.temuan}');
            }
            result = await _send(token, {
              'header': _headerPayload(header),
              'gardus': [
                {
                  'localId': gardu.localId,
                  'nomorGardu': gardu.nomorGardu,
                  'tier': gardu.tier,
                  'temuan': [
                    {
                      'localId': finding.localId,
                      'temuan': finding.temuan,
                      'deskripsi': finding.deskripsi,
                      'fotoTemuanB64': fotoTemuan,
                      'fotoGarduB64': fotoGardu,
                      'fotoTemuanMime': 'image/jpeg',
                      'fotoGarduMime': 'image/jpeg',
                    }
                  ],
                }
              ],
            });
            final saved =
                Map<String, dynamic>.from((result['gardus'] as List).first);
            await dao.setRealisasiSync(
              gardu.localId,
              '${saved['kodePekerjaanGardu']}',
            );
            final savedFinding =
                Map<String, dynamic>.from((saved['temuan'] as List).first);
            await dao.setTemuanSync(
              finding.localId,
              '${savedFinding['kodeTemuan']}',
            );
          }
        }
        await dao.setHeaderSync(header.localId, kodeHeader, 'tersinkron');
        ok++;
      } catch (error) {
        failed++;
        await dao.setHeaderSync(
          header.localId,
          header.kodeHeader,
          'gagal',
          pesan: '$error',
        );
      }
    }
    return {
      'ok': failed == 0,
      'terkirim': ok,
      'gagal': failed,
      'message': '$ok laporan terkirim, $failed gagal.',
    };
  }

  Future<String> _b64(String path) async {
    if (path.isEmpty) return '';
    final file = File(path);
    return await file.exists() ? base64Encode(await file.readAsBytes()) : '';
  }
}
