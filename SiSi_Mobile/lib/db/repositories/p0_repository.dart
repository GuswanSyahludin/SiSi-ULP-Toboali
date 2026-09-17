import 'dart:convert';
import 'dart:math';
import 'package:drift/drift.dart' show Value, Variable;
import '../../services/api_service.dart';
import '../../services/p0_correction_api.dart';
import '../../services/sesi_store.dart';
import '../app_database.dart';
import '../db_provider.dart';

/// Existing mirrors and decisions are preserved. Corrections are additive.
class P0Repository {
  AppDatabase get _db => DbProvider.instance;
  P0Dao get _dao => _db.p0Dao;
  static bool other(String name) => name.toLowerCase().replaceAll(RegExp(r'[\s_\-]+'), '') == 'lainlain';
  static bool admin(Map<String, dynamic> s) => {'admin', 'administrator', 'super', 'superuser'}.contains((s['role'] ?? '').toString().toLowerCase().replaceAll(RegExp(r'[\s_\-]+'), ''));
  static String _id() => '${DateTime.now().microsecondsSinceEpoch}-${Random.secure().nextInt(1 << 30)}';
  Future<void> _ensure() async {
    await _db.customStatement('CREATE TABLE IF NOT EXISTS p0_corrections_v2 (kode TEXT PRIMARY KEY, owner TEXT NOT NULL, ulp TEXT NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL, error TEXT NOT NULL DEFAULT \'\')');
    await _db.customStatement('CREATE TABLE IF NOT EXISTS p0_master_v2 (owner TEXT PRIMARY KEY, payload TEXT NOT NULL)');
    await _db.customStatement('CREATE TABLE IF NOT EXISTS p0_sync_lease_v2 (id INTEGER PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL)');
  }
  Future<Map<String, dynamic>> _session({bool write = false}) async {
    final s = await SesiStore.muat();
    if (s == null || (s['username'] ?? '').toString().isEmpty) throw StateError('Silakan login ulang.');
    if (write && !admin(s)) throw StateError('Koreksi dan keputusan hanya untuk Admin / Super User.');
    return Map<String, dynamic>.from(s);
  }
  String _owner(Map<String, dynamic> s) => '${s['username']}|${s['ulp']}'.toLowerCase();
  Future<void> _notSending() async {
    final rows = await _db.customSelect('SELECT expires FROM p0_sync_lease_v2 WHERE id=1').get();
    if (rows.isNotEmpty && (rows.first.data['expires'] as int) > DateTime.now().millisecondsSinceEpoch) throw StateError('Pengiriman P0 sedang berjalan. Tunggu sebelum mengedit atau membatalkan.');
  }
  Future<List<Map<String, dynamic>>> _corrections(String owner) async {
    await _ensure();
    final rows = await _db.customSelect('SELECT * FROM p0_corrections_v2 WHERE owner=?', variables: [Variable<String>(owner)]).get();
    return rows.map((r) => Map<String, dynamic>.from(r.data)).toList();
  }
  Future<Map<String, dynamic>> masterJenis() async {
    await _ensure();
    final s = await _session(write: true), owner = _owner(s);
    try {
      final result = await P0CorrectionApi.call('getListPekerjaanP0', {});
      if (result['ok'] != true) throw StateError('${result['error'] ?? result['message']}');
      if (result['correctionVersion'] != 2) throw StateError('Backend koreksi P0 belum di-deploy.');
      await _db.customStatement('INSERT OR REPLACE INTO p0_master_v2(owner,payload) VALUES(?,?)', [owner, jsonEncode(result)]);
      return result;
    } catch (e) {
      final cached = await _db.customSelect('SELECT payload FROM p0_master_v2 WHERE owner=?', variables: [Variable<String>(owner)]).get();
      if (cached.isEmpty) rethrow;
      return {...Map<String, dynamic>.from(jsonDecode(cached.first.data['payload'] as String)), 'offline': true};
    }
  }
  Future<Map<String, dynamic>> bacaList({required String ulp, required String status, required String tanggal}) async {
    await _ensure();
    var offline = false;
    try {
      final r = await ApiService.getApprovalP0List(ulp: ulp, status: '', tanggal: tanggal);
      if (r['ok'] != true) throw StateError('${r['error'] ?? r['message']}');
      final rows = <P0LokalsCompanion>[];
      for (final e in (r['list'] as List? ?? [])) {
        final item = Map<String, dynamic>.from(e as Map);
        final code = (item['kodeP0'] ?? '').toString();
        if (code.isEmpty) continue;
        rows.add(P0LokalsCompanion(kodeP0: Value(code), ulp: Value((item['ulp'] ?? ulp).toString()), tanggal: Value((item['tanggal'] ?? tanggal).toString()), statusServer: Value((item['status'] ?? 'Menunggu').toString()), dataJson: Value(jsonEncode(item)), diambilPada: Value(DateTime.now().toIso8601String())));
      }
      await _dao.gantiCermin(ulp, tanggal, rows);
    } catch (_) { offline = true; }
    final result = await bacaListLokal(ulp: ulp, status: status, tanggal: tanggal);
    result['offline'] = offline;
    if (offline && (result['total'] ?? 0) == 0) return {...result, 'ok': false, 'message': 'Tidak ada koneksi dan belum ada P0 tersimpan untuk tanggal ini.'};
    return result;
  }
  Future<Map<String, dynamic>> bacaListLokal({required String ulp, required String status, required String tanggal}) async {
    final s = await _session();
    final corrections = {for (final r in await _corrections(_owner(s))) r['kode']: r};
    final decisions = {for (final r in await _dao.antrean()) if (r.username.toLowerCase() == (s['username'] ?? '').toString().toLowerCase()) r.kodeP0: r};
    final result = <Map<String, dynamic>>[];
    final counts = <String, int>{'Menunggu': 0, 'Approved': 0, 'Rejected': 0};
    final mirror = await _dao.bacaCermin(ulp, tanggal);
    for (final row in mirror) {
      final item = Map<String, dynamic>.from(jsonDecode(row.dataJson));
      final c = corrections[row.kodeP0];
      if (c != null) {
        final p = Map<String, dynamic>.from(jsonDecode(c['payload'] as String));
        final receipt = p['receipt'] is Map ? Map<String, dynamic>.from(p['receipt']) : <String, dynamic>{};
        final sent = c['state'] == 'sent';
        if (!sent || ((item['koreksiRevision'] as num?) ?? 0) < ((receipt['revision'] as num?) ?? 0)) {
          item['namaPekerjaan'] = sent ? receipt['namaPekerjaan'] : p['namaPekerjaan'];
          item['bobotManual'] = sent ? receipt['bobotManual'] : p['bobotManual'];
          if (sent) {
            item['namaPekerjaanRaw'] = receipt['namaPekerjaan'];
            item['koreksiRevision'] = receipt['revision'];
            item['koreksiHistory'] = receipt['history'];
            item['point'] = receipt['point'];
            item['koreksiServerPending'] = false;
          }
        }
        item['koreksiPending'] = !sent;
        item['koreksiGagal'] = c['error'];
        if (!sent) { item['alasanKoreksiLokal'] = p['alasanKoreksi']; item['point'] = ''; }
      }
      final local = decisions[row.kodeP0];
      item['status'] = local?.keputusan ?? row.statusServer;
      item['lokalPending'] = local != null;
      if (local != null) { item['lokalGagal'] = local.pesanGagal; item['alasanRejected'] = local.alasan; }
      final st = item['status'].toString();
      counts[st] = (counts[st] ?? 0) + 1;
      if (status.isEmpty || status == st) result.add(item);
    }
    return {'ok': true, 'list': result, 'counts': counts, 'total': mirror.length};
  }
  Future<void> catatKoreksi({required Map<String, dynamic> item, required String nama, required String alasan, num? bobot}) async {
    await _ensure();
    final s = await _session(write: true), owner = _owner(s);
    if (alasan.trim().isEmpty || alasan.length > 500) throw StateError('Alasan wajib diisi, maksimal 500 karakter.');
    if (other(nama) && (bobot == null || !bobot.isFinite || bobot < 1 || bobot > 5)) throw StateError('Bobot pekerjaan Lain-lain wajib berupa angka 1-5.');
    await _db.transaction(() async {
      await _notSending();
      final old = await _db.customSelect('SELECT * FROM p0_corrections_v2 WHERE kode=?', variables: [Variable<String>(item['kodeP0'].toString())]).get();
      if (old.isNotEmpty && old.first.data['state'] != 'sent') throw StateError('Kirim koreksi sebelumnya terlebih dahulu. Jika konflik, minta administrator meninjau koreksi; antrean tidak dihapus.');
      final payload = {'kodeP0': item['kodeP0'], 'namaPekerjaan': nama, 'alasanKoreksi': alasan.trim(), 'bobotManual': other(nama) ? bobot : null, 'expectedNama': item['namaPekerjaanRaw'] ?? item['namaPekerjaan'], 'expectedRevision': item['koreksiRevision'] ?? 0, 'requestId': _id()};
      await _db.customStatement('INSERT OR REPLACE INTO p0_corrections_v2(kode,owner,ulp,payload,state,error) VALUES(?,?,?,?,?,?)', [item['kodeP0'], owner, s['ulp'] ?? '', jsonEncode(payload), 'pending', '']);
    });
  }
  Future<Map<String, dynamic>> catatKeputusan({required String kodeP0, required String keputusan, required String username, String alasan = '', String tanggal = ''}) async {
    try {
      await _ensure(); final s = await _session(write: true);
      if (!{'Approved', 'Rejected'}.contains(keputusan)) throw StateError('Keputusan tidak valid.');
      if (keputusan == 'Rejected' && alasan.trim().isEmpty) throw StateError('Alasan penolakan wajib diisi.');
      await _db.transaction(() async {
        await _notSending();
        final existing = await _dao.keputusan(kodeP0);
        if (existing != null && existing.username.toLowerCase() != s['username'].toString().toLowerCase()) throw StateError('Masih ada keputusan milik akun lain pada P0 ini.');
        await _dao.simpanKeputusan(P0OutboxesCompanion(kodeP0: Value(kodeP0), keputusan: Value(keputusan), alasan: Value(alasan.trim()), username: Value(s['username'].toString()), tanggal: Value(tanggal), dibuatPada: Value(DateTime.now().toIso8601String()), status: const Value('pending'), percobaan: const Value(0), pesanGagal: const Value('')));
      });
      return {'ok': true};
    } catch (e) { return {'ok': false, 'message': e.toString()}; }
  }
  Future<Map<String, dynamic>> batalkanKeputusan(String kodeP0) async {
    try {
      await _ensure(); final s = await _session(write: true);
      await _db.transaction(() async {
        await _notSending();
        final a = await _dao.keputusan(kodeP0);
        if (a != null && a.username.toLowerCase() != s['username'].toString().toLowerCase()) throw StateError('Keputusan milik akun lain.');
        await _dao.batalkan(kodeP0);
      });
      return {'ok': true};
    } catch (e) { return {'ok': false, 'message': e.toString()}; }
  }
  Stream<List<P0Outbox>> pantauAntrean() => _dao.pantauAntrean();
  Future<int> jumlahAntrean() async { final s = await _session(); return (await _corrections(_owner(s))).where((r) => r['state'] != 'sent').length + (await _dao.antrean()).where((a) => a.username.toLowerCase() == s['username'].toString().toLowerCase()).length; }
  Stream<int> pantauJumlahAntrean() async* { while (true) { try { yield await jumlahAntrean(); } catch (_) { yield 0; } await Future<void>.delayed(const Duration(seconds: 2)); } }
  Future<void> _receipt(String code, Map<String, dynamic> r) async {
    final rows = await (_db.select(_db.p0Lokals)..where((t) => t.kodeP0.equals(code))).get();
    if (rows.isEmpty) return;
    final item = Map<String, dynamic>.from(jsonDecode(rows.first.dataJson));
    item.addAll({'namaPekerjaan': r['namaPekerjaan'], 'namaPekerjaanRaw': r['namaPekerjaan'], 'bobotManual': r['bobotManual'], 'koreksiRevision': r['revision'], 'koreksiHistory': r['history'], 'koreksiServerPending': false, 'point': r['point']});
    await (_db.update(_db.p0Lokals)..where((t) => t.kodeP0.equals(code))).write(P0LokalsCompanion(dataJson: Value(jsonEncode(item))));
  }
  Future<Map<String, dynamic>> kirimAntrean() async {
    await _ensure();
    final s = await _session(), owner = _owner(s), lease = _id();
    try {
      await _db.transaction(() async {
        await _notSending();
        await _db.customStatement('INSERT OR REPLACE INTO p0_sync_lease_v2(id,owner,expires) VALUES(1,?,?)', [lease, DateTime.now().millisecondsSinceEpoch + 300000]);
      });
    } catch (e) { return {'ok': false, 'message': e.toString()}; }
    var sent = 0, failed = 0;
    final errors = <String>[];
    final blocked = <String>{};
    Future<void> renew() async {
      final now = await _session();
      if (_owner(now) != owner || !admin(now)) throw StateError('Akun berubah saat sinkron. Antrean dihentikan.');
      await _db.transaction(() async {
        final leaseRows = await _db.customSelect('SELECT owner FROM p0_sync_lease_v2 WHERE id=1').get();
        if (leaseRows.isEmpty || leaseRows.first.data['owner'] != lease) throw StateError('Pengiriman diteruskan oleh proses lain.');
        await _db.customStatement('UPDATE p0_sync_lease_v2 SET expires=? WHERE owner=?', [DateTime.now().millisecondsSinceEpoch + 300000, lease]);
      });
    }
    try {
      // Snapshot AFTER acquiring the shared lease: no edit can slip between
      // snapshotting corrections and approvals, even from another isolate.
      final corrections = (await _corrections(owner)).where((r) => r['state'] != 'sent').toList();
      final decisions = (await _dao.antrean()).where((a) => a.username.toLowerCase() == s['username'].toString().toLowerCase()).toList();
      if (corrections.isEmpty && decisions.isEmpty) return {'ok': true, 'terkirim': 0, 'gagal': 0, 'kosong': true};
      if (!admin(s)) return {'ok': false, 'message': 'Akun ini tidak lagi memiliki izin Admin. Antrean tidak dihapus.'};
      // A decision must not bypass an unsent correction belonging to another account.
      final allPending = await _db.customSelect("SELECT kode FROM p0_corrections_v2 WHERE state <> 'sent'").get();
      final ownCodes = corrections.map((r) => r['kode'].toString()).toSet();
      for (final r in allPending) { final code = r.data['kode'].toString(); if (!ownCodes.contains(code)) blocked.add(code); }
      for (final c in corrections) {
        await renew();
        final code = c['kode'].toString();
        final p = Map<String, dynamic>.from(jsonDecode(c['payload'] as String));
        try {
          final capability = await P0CorrectionApi.call('getListPekerjaanP0', {});
          if (capability['ok'] != true) {
            throw StateError('${capability['error'] ?? capability['message'] ?? 'Master P0 tidak tersedia.'}');
          }
          if (capability['correctionVersion'] != 2) throw StateError('Backend koreksi P0 belum di-deploy.');
          await renew();
          final r = await P0CorrectionApi.call('updateNamaPekerjaanP0', p);
          if (r['ok'] != true) throw StateError('${r['error'] ?? r['message']}');
          await renew();
          await _db.transaction(() async {
            await _receipt(code, r);
            await _db.customStatement('UPDATE p0_corrections_v2 SET state=?,payload=?,error=? WHERE kode=? AND owner=?', ['sent', jsonEncode({...p, 'receipt': r}), '', code, owner]);
          });
          sent++;
        } catch (e) {
          blocked.add(code); failed++; errors.add('$code: $e');
          await _db.customStatement('UPDATE p0_corrections_v2 SET state=?,error=? WHERE kode=? AND owner=?', ['gagal', e.toString(), code, owner]);
        }
      }
      for (final a in decisions) {
        if (blocked.contains(a.kodeP0)) { failed++; errors.add('${a.kodeP0}: koreksi jenis belum berhasil terkirim.'); continue; }
        await renew();
        try {
          final r = await P0CorrectionApi.call('setMobileApprovalP0', {'kodeP0': a.kodeP0, 'keputusan': a.keputusan, 'alasan': a.alasan});
          if (r['ok'] != true) throw StateError('${r['error'] ?? r['message']}');
          await renew();
          await _db.transaction(() async { await _dao.setStatusServer(a.kodeP0, a.keputusan); await _dao.hapusTerkirim(a.kodeP0); });
          sent++;
        } catch (e) { failed++; errors.add('${a.kodeP0}: $e'); await _dao.tandaiGagal(a.kodeP0, a.percobaan + 1, e.toString()); }
      }
      return {'ok': failed == 0, 'terkirim': sent, 'gagal': failed, 'message': '$sent perubahan diterima backend, $failed gagal. Keputusan dapat menunggu antrean server. ${errors.take(2).join(' | ')}'};
    } catch (e) { return {'ok': false, 'terkirim': sent, 'gagal': failed + 1, 'message': e.toString()}; }
    finally { await _db.customStatement('DELETE FROM p0_sync_lease_v2 WHERE owner=?', [lease]); }
  }
}
