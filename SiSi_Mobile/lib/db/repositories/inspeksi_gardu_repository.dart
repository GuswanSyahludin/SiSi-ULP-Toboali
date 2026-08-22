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
  String _id(String p) => '$p-${DateTime.now().microsecondsSinceEpoch}-${Random().nextInt(1 << 32).toRadixString(36)}';

  Future<void> downloadListTemuan(String token) async {
    final r = await http.get(Uri.parse('${ApiService.baseUrl}?mobile=1&action=getMasterGarduMobile&token=${Uri.encodeComponent(token)}&ulp=LIST_TEMUAN')).timeout(const Duration(seconds: 30));
    final res = Map<String, dynamic>.from(jsonDecode(r.body));
    if (res['success'] != true) throw Exception(res['message']);
    final rows = <ListTemuansCompanion>[];
    for (final raw in List.from(res['list'] ?? [])) {
      final m = Map<String, dynamic>.from(raw);
      rows.add(ListTemuansCompanion(no: Value(int.tryParse('${m['no']}')),
        tier: Value('${m['tier']}'), objekInspeksi: Value('${m['objekInspeksi']}'),
        temuan: Value('${m['temuan']}')));
    }
    await dao.gantiListTemuan(rows);
  }

  Future<String> buatLaporan({required String ulp, required String hari,
    required String tanggal, required String koordinatAwal,
    required String koordinatAkhir, required String inputBy,
    String kmAwal = '', String kmAkhir = '', String kendala = ''}) async {
    final id = _id('H');
    await dao.simpanHeader(InsGarduHeadersCompanion(localId: Value(id),
      ulp: Value(ulp), hari: Value(hari), tanggal: Value(tanggal),
      koordinatAwal: Value(koordinatAwal), koordinatAkhir: Value(koordinatAkhir),
      kmAwal: Value(kmAwal), kmAkhir: Value(kmAkhir), kendala: Value(kendala),
      inputBy: Value(inputBy), dibuatPada: Value(DateTime.now().toIso8601String())));
    final gs = await DbProvider.instance.masterGarduDao.cari('', ulp: ulp, limit: 5000);
    for (final g in gs) {
      if (_date(g.tanggalPengukuran) != tanggal) continue;
      final snap = {'ulp': g.ulp, 'nomorGardu': g.gardu, 'alamat': g.alamat,
        'penyulang': g.penyulang, 'section': g.section, 'merkTrafo': g.merk,
        'dayaKva': g.kapasitasKva, 'beratTrafo': g.beratTrafo,
        'volumeMinyak': g.volumeMinyak, 'merkPhbTr': g.merkPhbTr,
        'nomorSeriPhbTr': g.nomorSeriPhbTr, 'tahunPhbTr': g.tahunPhbTr};
      await dao.simpanRealisasi(InsGarduRealisasisCompanion(localId: Value(_id('G')),
        localHeaderId: Value(id), nomorGardu: Value(g.gardu),
        snapshotJson: Value(jsonEncode(snap))));
    }
    return id;
  }

  String _date(String s) {
    final x = s.trim(), a = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(x);
    if (a != null) return '${a[1]}-${a[2]}-${a[3]}';
    final b = RegExp(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})').firstMatch(x);
    return b == null ? x : '${b[3]}-${b[2]!.padLeft(2, '0')}-${b[1]!.padLeft(2, '0')}';
  }

  Stream<List<InsGarduHeader>> pantauLaporan() => dao.pantauHeader();
  Future<List<InsGarduRealisasi>> garduLaporan(String id) => dao.realisasi(id);
  Future<List<InsGarduTemuan>> temuan(String id) => dao.temuan(id);
  Future<List<ListTemuan>> pilihan(String tier) =>
      dao.pilihanTier(tier == 'Tier 1 & Tier 2' ? ['Tier 1', 'Tier 2'] : [tier]);

  Future<void> setGardu({required InsGarduRealisasi gardu, required String tier,
    required List<Map<String, String>> temuan}) async {
    await dao.simpanRealisasi(InsGarduRealisasisCompanion(localId: Value(gardu.localId),
      localHeaderId: Value(gardu.localHeaderId), nomorGardu: Value(gardu.nomorGardu),
      tier: Value(tier), snapshotJson: Value(gardu.snapshotJson)));
    await dao.hapusTemuanRealisasi(gardu.localId);
    final rows = <InsGarduTemuansCompanion>[];
    for (final t in temuan) {
      rows.add(InsGarduTemuansCompanion(localId: Value(_id('T')),
        localRealisasiId: Value(gardu.localId), tier: Value(t['tier'] ?? tier),
        temuan: Value(t['temuan'] ?? ''), deskripsi: Value(t['deskripsi'] ?? ''),
        fotoTemuanPath: Value(t['fotoTemuanPath'] ?? ''),
        fotoGarduPath: Value(t['fotoGarduPath'] ?? '')));
    }
    if (rows.isNotEmpty) await dao.simpanTemuan(rows);
  }

  Map<String, dynamic> _headerPayload(InsGarduHeader h) => {
    'localId': h.localId, 'ulp': h.ulp, 'tanggal': h.tanggal,
    'koordinatAwal': h.koordinatAwal, 'koordinatAkhir': h.koordinatAkhir,
    'kmAwal': h.kmAwal, 'kmAkhir': h.kmAkhir, 'kendala': h.kendala,
  };

  Future<Map<String, dynamic>> _send(String token, Map<String, dynamic> paket) async {
    final r = await http.post(Uri.parse('${ApiService.baseUrl}?mobile=1'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'action': 'getMasterGarduMobile', 'token': token,
        'ulp': 'INSPEKSI:${jsonEncode(paket)}'}),
    ).timeout(const Duration(seconds: 90));
    final res = Map<String, dynamic>.from(jsonDecode(r.body));
    if (res['success'] != true) throw Exception(res['message'] ?? 'Server menolak paket');
    return res;
  }

  Future<Map<String, dynamic>> syncSemua(String token) async {
    final hs = await dao.antrean();
    var ok = 0, fail = 0;
    for (final h in hs) {
      try {
        await dao.setHeaderSync(h.localId, h.kodeHeader, 'mengirim');

        // Tahap 1: header saja. Retry akan mengembalikan Kode Header yang sama.
        var res = await _send(token, {'header': _headerPayload(h), 'gardus': []});
        final kodeHeader = '${res['kodeHeader']}';
        await dao.setHeaderSync(h.localId, kodeHeader, 'mengirim');

        // Tahap 2: satu Gardu per request. Tahap 3: satu temuan (dua foto) per request.
        for (final g in await dao.realisasi(h.localId)) {
          if (g.tier.isEmpty) continue;
          final ts = await dao.temuan(g.localId);
          if (ts.isEmpty) {
            res = await _send(token, {'header': _headerPayload(h), 'gardus': [
              {'localId': g.localId, 'nomorGardu': g.nomorGardu,
                'tier': g.tier, 'temuan': []}
            ]});
            final rg = Map<String, dynamic>.from((res['gardus'] as List).first);
            await dao.setRealisasiSync(g.localId, '${rg['kodePekerjaanGardu']}');
            continue;
          }

          for (final t in ts) {
            final ft = await _b64(t.fotoTemuanPath), fg = await _b64(t.fotoGarduPath);
            if (ft.isEmpty || fg.isEmpty) throw Exception('Dua foto belum lengkap: ${t.temuan}');
            res = await _send(token, {'header': _headerPayload(h), 'gardus': [
              {'localId': g.localId, 'nomorGardu': g.nomorGardu, 'tier': g.tier,
                'temuan': [{'localId': t.localId, 'temuan': t.temuan,
                  'deskripsi': t.deskripsi, 'fotoTemuanB64': ft,
                  'fotoGarduB64': fg, 'fotoTemuanMime': 'image/jpeg',
                  'fotoGarduMime': 'image/jpeg'}]}
            ]});
            final rg = Map<String, dynamic>.from((res['gardus'] as List).first);
            await dao.setRealisasiSync(g.localId, '${rg['kodePekerjaanGardu']}');
            final rt = Map<String, dynamic>.from((rg['temuan'] as List).first);
            await dao.setTemuanSync(t.localId, '${rt['kodeTemuan']}');
          }
        }
        await dao.setHeaderSync(h.localId, kodeHeader, 'tersinkron');
        ok++;
      } catch (e) {
        fail++;
        await dao.setHeaderSync(h.localId, h.kodeHeader, 'gagal', pesan: '$e');
      }
    }
    return {'ok': fail == 0, 'terkirim': ok, 'gagal': fail,
      'message': '$ok laporan terkirim, $fail gagal.'};
  }

  Future<String> _b64(String p) async {
    if (p.isEmpty) return '';
    final f = File(p);
    return await f.exists() ? base64Encode(await f.readAsBytes()) : '';
  }
}
