// lib/db/repositories/master_gardu_repository.dart
// Download penuh Master Gardu ke SQLite + API baca lokal untuk UI berikutnya.

import 'dart:convert';

import 'package:drift/drift.dart' show Value;
import 'package:http/http.dart' as http;

import '../../services/api_service.dart';
import '../app_database.dart';
import '../db_provider.dart';

class MasterGarduRepository {
  Future<Map<String, dynamic>> download(String token, {String ulp = ''}) async {
    try {
      final uri = Uri.parse(
        '${ApiService.baseUrl}?mobile=1&action=getMasterGarduMobile'
        '&token=${Uri.encodeComponent(token)}'
        '&ulp=${Uri.encodeComponent(ulp)}',
      );
      final response = await http.get(uri).timeout(const Duration(seconds: 60));
      final res = Map<String, dynamic>.from(jsonDecode(response.body));
      if (res['success'] != true) return res;

      final rows = <MasterGardusCompanion>[];
      for (final raw in List<dynamic>.from(res['list'] ?? const [])) {
        final m = Map<String, dynamic>.from(raw as Map);
        String s(String k) => (m[k] ?? '').toString();
        final gardu = s('gardu').trim();
        if (gardu.isEmpty) continue;
        rows.add(MasterGardusCompanion.insert(
          ulp: Value(s('ulp')), gardu: gardu, alamat: Value(s('alamat')),
          jenisGardu: Value(s('jenisGardu')), merk: Value(s('merk')),
          kapasitasKva: Value(s('kapasitasKva')), noSeri: Value(s('noSeri')),
          tahunTrafo: Value(s('tahunTrafo')), typeSeal: Value(s('typeSeal')),
          merkPhbTr: Value(s('merkPhbTr')), nomorSeriPhbTr: Value(s('nomorSeriPhbTr')),
          tahunPhbTr: Value(s('tahunPhbTr')), jamUkurWbp: Value(s('jamUkurWbp')),
          tanggalPengukuran: Value(s('tanggalPengukuran')), kepemilikan: Value(s('kepemilikan')),
          wbpRs: Value(s('wbpRs')), wbpSt: Value(s('wbpSt')), wbpTr: Value(s('wbpTr')),
          wbpRn: Value(s('wbpRn')), wbpSn: Value(s('wbpSn')), wbpTn: Value(s('wbpTn')),
          wbpR: Value(s('wbpR')), wbpS: Value(s('wbpS')), wbpT: Value(s('wbpT')), wbpN: Value(s('wbpN')),
          lwbpRs: Value(s('lwbpRs')), lwbpSt: Value(s('lwbpSt')), lwbpTr: Value(s('lwbpTr')),
          lwbpRn: Value(s('lwbpRn')), lwbpSn: Value(s('lwbpSn')), lwbpTn: Value(s('lwbpTn')),
          lwbpR: Value(s('lwbpR')), lwbpS: Value(s('lwbpS')), lwbpT: Value(s('lwbpT')), lwbpN: Value(s('lwbpN')),
        ));
      }
      await DbProvider.instance.masterGarduDao.gantiSemua(rows);
      return {'success': true, 'jumlah': rows.length};
    } catch (e) {
      return {'success': false, 'message': 'Gagal sinkron Master Gardu: $e'};
    }
  }

  Future<int> jumlah() => DbProvider.instance.masterGarduDao.jumlah();
  Future<List<MasterGardu>> cari(String kata, {String ulp = '', int limit = 100}) =>
      DbProvider.instance.masterGarduDao.cari(kata, ulp: ulp, limit: limit);
  Future<MasterGardu?> detail(String nomor) =>
      DbProvider.instance.masterGarduDao.detail(nomor);
}
