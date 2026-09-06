import 'dart:convert';

import 'package:drift/drift.dart' show Value;
import 'package:http/http.dart' as http;

import '../../services/api_service.dart';
import '../app_database.dart';
import '../db_provider.dart';

class MasterGarduRepository {
  MasterGarduDao get _dao => DbProvider.instance.masterGarduDao;

  Future<Map<String, dynamic>> download(String token, {String ulp = ''}) async {
    try {
      final uri = Uri.parse('${ApiService.baseUrl}?mobile=1');
      final response = await http
          .post(
            uri,
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({
              'action': 'getMasterGarduMobile',
              'token': token,
              'ulp': ulp,
            }),
          )
          .timeout(const Duration(seconds: 60));
      final result = Map<String, dynamic>.from(jsonDecode(response.body));
      if (result['success'] != true) return result;
      final rows = <MasterGardusCompanion>[];
      for (final raw in List.from(result['list'] ?? [])) {
        final item = Map<String, dynamic>.from(raw);
        if ('${item['gardu']}'.trim().isNotEmpty) rows.add(_companion(item));
      }
      await _dao.gantiSemua(rows);
      return {'success': true, 'jumlah': rows.length};
    } catch (error) {
      return {'success': false, 'message': 'Gagal sinkron Master Gardu: $error'};
    }
  }

  MasterGardusCompanion _companion(Map<String, dynamic> item) {
    String value(String key) => (item[key] ?? '').toString();
    return MasterGardusCompanion.insert(
      ulp: Value(value('ulp')),
      gardu: value('gardu'),
      alamat: Value(value('alamat')),
      latitude: Value(value('latitude')),
      longitude: Value(value('longitude')),
      penyulang: Value(value('penyulang')),
      section: Value(value('section')),
      jenisGardu: Value(value('jenisGardu')),
      merk: Value(value('merk')),
      kapasitasKva: Value(value('kapasitasKva')),
      noSeri: Value(value('noSeri')),
      tahunTrafo: Value(value('tahunTrafo')),
      typeSeal: Value(value('typeSeal')),
      beratTrafo: Value(value('beratTrafo')),
      volumeMinyak: Value(value('volumeMinyak')),
      merkPhbTr: Value(value('merkPhbTr')),
      nomorSeriPhbTr: Value(value('nomorSeriPhbTr')),
      tahunPhbTr: Value(value('tahunPhbTr')),
      jamUkurWbp: Value(value('jamUkurWbp')),
      tanggalPengukuran: Value(value('tanggalPengukuran')),
      kepemilikan: Value(value('kepemilikan')),
      wbpRs: Value(value('wbpRs')),
      wbpSt: Value(value('wbpSt')),
      wbpTr: Value(value('wbpTr')),
      wbpRn: Value(value('wbpRn')),
      wbpSn: Value(value('wbpSn')),
      wbpTn: Value(value('wbpTn')),
      wbpR: Value(value('wbpR')),
      wbpS: Value(value('wbpS')),
      wbpT: Value(value('wbpT')),
      wbpN: Value(value('wbpN')),
      lwbpRs: Value(value('lwbpRs')),
      lwbpSt: Value(value('lwbpSt')),
      lwbpTr: Value(value('lwbpTr')),
      lwbpRn: Value(value('lwbpRn')),
      lwbpSn: Value(value('lwbpSn')),
      lwbpTn: Value(value('lwbpTn')),
      lwbpR: Value(value('lwbpR')),
      lwbpS: Value(value('lwbpS')),
      lwbpT: Value(value('lwbpT')),
      lwbpN: Value(value('lwbpN')),
      arusMaxPerFasa: Value(value('arusMaxPerFasa')),
      pembebananKva: Value(value('pembebananKva')),
      pembebananKw: Value(value('pembebananKw')),
      persentaseBeban: Value(value('persentaseBeban')),
      kategoriBeban: Value(value('kategoriBeban')),
    );
  }

  Future<Map<String, dynamic>> editLokal({
    required MasterGardu asli,
    required Map<String, dynamic> perubahan,
    required String username,
  }) async {
    String text(String key) => (perubahan[key] ?? '').toString();
    Value<String> value(String key) =>
        perubahan.containsKey(key) ? Value(text(key)) : const Value.absent();
    final update = MasterGardusCompanion(
      alamat: value('alamat'),
      penyulang: value('penyulang'),
      section: value('section'),
      jenisGardu: value('jenisGardu'),
      merk: value('merk'),
      kapasitasKva: value('kapasitasKva'),
      noSeri: value('noSeri'),
      tahunTrafo: value('tahunTrafo'),
      typeSeal: value('typeSeal'),
      beratTrafo: value('beratTrafo'),
      volumeMinyak: value('volumeMinyak'),
      merkPhbTr: value('merkPhbTr'),
      nomorSeriPhbTr: value('nomorSeriPhbTr'),
      tahunPhbTr: value('tahunPhbTr'),
      jamUkurWbp: value('jamUkurWbp'),
      tanggalPengukuran: value('tanggalPengukuran'),
      kepemilikan: value('kepemilikan'),
      wbpRs: value('wbpRs'),
      wbpSt: value('wbpSt'),
      wbpTr: value('wbpTr'),
      wbpRn: value('wbpRn'),
      wbpSn: value('wbpSn'),
      wbpTn: value('wbpTn'),
      wbpR: value('wbpR'),
      wbpS: value('wbpS'),
      wbpT: value('wbpT'),
      wbpN: value('wbpN'),
      lwbpRs: value('lwbpRs'),
      lwbpSt: value('lwbpSt'),
      lwbpTr: value('lwbpTr'),
      lwbpRn: value('lwbpRn'),
      lwbpSn: value('lwbpSn'),
      lwbpTn: value('lwbpTn'),
      lwbpR: value('lwbpR'),
      lwbpS: value('lwbpS'),
      lwbpT: value('lwbpT'),
      lwbpN: value('lwbpN'),
      arusMaxPerFasa: value('arusMaxPerFasa'),
      pembebananKva: value('pembebananKva'),
      pembebananKw: value('pembebananKw'),
      persentaseBeban: value('persentaseBeban'),
      kategoriBeban: value('kategoriBeban'),
    );
    final outbox = GarduOutboxesCompanion.insert(
      gardu: asli.gardu,
      ulp: Value(asli.ulp),
      perubahanJson: Value(jsonEncode(perubahan)),
      diubahOleh: Value(username),
      diubahPada: Value(DateTime.now().toIso8601String()),
    );
    await _dao.simpanEditLokal(
      gardu: asli.gardu,
      data: update,
      outbox: outbox,
    );
    return {'ok': true};
  }

  Future<int> jumlah() => _dao.jumlah();
  Future<List<MasterGardu>> cari(
    String keyword, {
    String ulp = '',
    int limit = 500,
  }) =>
      _dao.cari(keyword, ulp: ulp, limit: limit);
  Future<MasterGardu?> detail(String nomor) => _dao.detail(nomor);
  Stream<List<GarduOutbox>> pantauAntrean() => _dao.pantauAntrean();
}
