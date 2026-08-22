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
      final uri = Uri.parse('${ApiService.baseUrl}?mobile=1&action=getMasterGarduMobile'
          '&token=${Uri.encodeComponent(token)}&ulp=${Uri.encodeComponent(ulp)}');
      final response = await http.get(uri).timeout(const Duration(seconds: 60));
      final res = Map<String, dynamic>.from(jsonDecode(response.body));
      if (res['success'] != true) return res;

      final rows = <MasterGardusCompanion>[];
      for (final raw in List<dynamic>.from(res['list'] ?? const [])) {
        final m = Map<String, dynamic>.from(raw as Map);
        String s(String k) => (m[k] ?? '').toString();
        if (s('gardu').trim().isEmpty) continue;
        rows.add(_companion(m));
      }
      await _dao.gantiSemua(rows);
      // Server download tidak boleh menimpa pekerjaan lokal yang belum dikirim.
      for (final o in await _dao.antrean()) {
        final patch = Map<String, dynamic>.from(jsonDecode(o.perubahanJson));
        await _terapkanPatch(o.gardu, patch, simpanOutbox: false);
      }
      return {'success': true, 'jumlah': rows.length};
    } catch (e) {
      return {'success': false, 'message': 'Gagal sinkron Master Gardu: $e'};
    }
  }

  MasterGardusCompanion _companion(Map<String, dynamic> m) {
    String s(String k) => (m[k] ?? '').toString();
    return MasterGardusCompanion.insert(
      ulp: Value(s('ulp')), gardu: s('gardu'), alamat: Value(s('alamat')),
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
    );
  }

  Future<Map<String, dynamic>> editLokal({
    required MasterGardu asli,
    required Map<String, dynamic> perubahan,
    required String username,
  }) async {
    await _terapkanPatch(asli.gardu, perubahan,
      ulp: asli.ulp, username: username, simpanOutbox: true);
    return {'ok': true};
  }

  Future<void> _terapkanPatch(String gardu, Map<String, dynamic> p, {
    String ulp = '', String username = '', bool simpanOutbox = false,
  }) async {
    String s(String k) => (p[k] ?? '').toString();
    Value<String> v(String k) => p.containsKey(k) ? Value(s(k)) : const Value.absent();
    final update = MasterGardusCompanion(
      alamat:v('alamat'), jenisGardu:v('jenisGardu'), merk:v('merk'),
      kapasitasKva:v('kapasitasKva'), noSeri:v('noSeri'), tahunTrafo:v('tahunTrafo'),
      typeSeal:v('typeSeal'), merkPhbTr:v('merkPhbTr'), nomorSeriPhbTr:v('nomorSeriPhbTr'),
      tahunPhbTr:v('tahunPhbTr'), jamUkurWbp:v('jamUkurWbp'),
      tanggalPengukuran:v('tanggalPengukuran'), kepemilikan:v('kepemilikan'),
      wbpRs:v('wbpRs'), wbpSt:v('wbpSt'), wbpTr:v('wbpTr'), wbpRn:v('wbpRn'), wbpSn:v('wbpSn'), wbpTn:v('wbpTn'),
      wbpR:v('wbpR'), wbpS:v('wbpS'), wbpT:v('wbpT'), wbpN:v('wbpN'),
      lwbpRs:v('lwbpRs'), lwbpSt:v('lwbpSt'), lwbpTr:v('lwbpTr'), lwbpRn:v('lwbpRn'), lwbpSn:v('lwbpSn'), lwbpTn:v('lwbpTn'),
      lwbpR:v('lwbpR'), lwbpS:v('lwbpS'), lwbpT:v('lwbpT'), lwbpN:v('lwbpN'),
    );
    final outbox = GarduOutboxesCompanion.insert(
      gardu: gardu, ulp: Value(ulp), perubahanJson: Value(jsonEncode(p)),
      diubahOleh: Value(username), diubahPada: Value(DateTime.now().toIso8601String()),
    );
    if (simpanOutbox) await _dao.simpanEditLokal(gardu: gardu, data: update, outbox: outbox);
    else await _dao.simpanEditLokal(gardu: gardu, data: update,
      outbox: GarduOutboxesCompanion.insert(gardu: gardu));
    if (!simpanOutbox) await _dao.hapusAntrean(gardu); // pertahankan outbox asli milik caller
  }

  Future<Map<String, dynamic>> sinkronAntrean(String token) async {
    final list = await _dao.antrean();
    var ok = 0, gagal = 0;
    for (final o in list) {
      try {
        final uri = Uri.parse('${ApiService.baseUrl}?mobile=1&action=getMasterGarduMobile'
            '&token=${Uri.encodeComponent(token)}&ulp=${Uri.encodeComponent('UPDATE:${o.perubahanJson}')}'
            '&gardu=${Uri.encodeComponent(o.gardu)}&targetUlp=${Uri.encodeComponent(o.ulp)}');
        final r = await http.get(uri).timeout(const Duration(seconds: 45));
        final res = Map<String, dynamic>.from(jsonDecode(r.body));
        if (res['success'] == true) { await _dao.hapusAntrean(o.gardu); ok++; }
        else { gagal++; await _dao.tandaiGagal(o.gardu, o.percobaan + 1, (res['message'] ?? 'Ditolak server').toString()); }
      } catch (_) {
        gagal++; await _dao.tandaiGagal(o.gardu, o.percobaan + 1, 'timeout/jaringan');
      }
    }
    return {'ok': gagal == 0, 'terkirim': ok, 'gagal': gagal,
      'message': gagal == 0 ? '$ok perubahan Gardu tersinkron.' : '$ok terkirim, $gagal gagal.'};
  }

  Future<int> jumlah() => _dao.jumlah();
  Future<List<MasterGardu>> cari(String kata, {String ulp = '', int limit = 500}) => _dao.cari(kata, ulp: ulp, limit: limit);
  Future<MasterGardu?> detail(String nomor) => _dao.detail(nomor);
  Stream<List<GarduOutbox>> pantauAntrean() => _dao.pantauAntrean();
}
