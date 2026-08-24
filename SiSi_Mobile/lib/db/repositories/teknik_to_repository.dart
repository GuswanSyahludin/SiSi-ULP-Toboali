import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:http/http.dart' as http;

import '../../services/api_service.dart';
import '../db_provider.dart';

/// Offline-first repository untuk Penugasan Tim / Pindah Tim.
/// UI selalu membaca SQLite. Server hanya dipakai untuk refresh dan flush outbox.
class TeknikToRepository {
  final db = DbProvider.instance;

  Future<http.Response> _post(Map<String, dynamic> body) async {
    final initial = Uri.parse('${ApiService.baseUrl}?mobile=1');
    final client = http.Client();
    try {
      final request = http.Request('POST', initial)
        ..followRedirects = false
        ..headers['Content-Type'] = 'application/json'
        ..body = jsonEncode(body);
      var response = await http.Response.fromStream(
        await client.send(request).timeout(const Duration(seconds: 30)),
      );
      var current = initial;
      var hops = 0;
      while ({301, 302, 303, 307, 308}.contains(response.statusCode) && hops < 5) {
        final location = response.headers['location'];
        if (location == null || location.trim().isEmpty) break;
        current = current.resolve(location);
        response = await client.get(current).timeout(const Duration(seconds: 30));
        hops++;
      }
      return response;
    } finally {
      client.close();
    }
  }

  Map<String, dynamic> _decode(http.Response response) {
    final raw = response.body.trim();
    if (raw.isEmpty) throw Exception('Server TO mengirim respons kosong.');
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
      throw const FormatException();
    } on FormatException {
      if (raw.startsWith('<!DOCTYPE') || raw.startsWith('<html')) {
        throw Exception('Backend TO belum aktif. Deploy ulang Apps Script.');
      }
      throw Exception('Respons backend TO tidak valid.');
    }
  }

  Future<Map<String, dynamic>> _send(String token, Map<String, dynamic> payload) async {
    final response = await _post({
      'action': 'getMasterGarduMobile',
      'token': token,
      'ulp': 'TEKNIK_TO:${jsonEncode(payload)}',
    });
    final decoded = _decode(response);
    if (decoded['module'] != 'teknik-to' || decoded['apiVersion'] != 1) {
      throw Exception('Backend TO belum di-deploy.');
    }
    return decoded;
  }

  Future<List<Map<String, dynamic>>> cachedList(String mode) async {
    final rows = await db.customSelect(
      'SELECT payload FROM teknik_to_cache WHERE mode = ? ORDER BY tanggal DESC, kode_pekerjaan DESC',
      variables: [Variable.withString(mode)],
    ).get();
    return rows.map((r) => Map<String, dynamic>.from(jsonDecode(r.data['payload'] as String))).toList();
  }

  Future<List<String>> cachedTeams() async {
    final rows = await db.customSelect(
      'SELECT nama FROM teknik_to_team ORDER BY nama COLLATE NOCASE',
    ).get();
    return rows.map((r) => r.data['nama'].toString()).toList();
  }

  Future<List<Map<String, dynamic>>> refreshList(String token, String mode) async {
    final res = await _send(token, {'cmd': 'list', 'mode': mode});
    if (res['success'] != true) throw Exception(res['message'] ?? 'Gagal memuat TO.');
    final list = List.from(res['list'] ?? const [])
        .map((e) => Map<String, dynamic>.from(e as Map)).toList();
    await db.transaction(() async {
      await db.customStatement('DELETE FROM teknik_to_cache WHERE mode = ?', [mode]);
      for (final row in list) {
        await db.customStatement(
          'INSERT OR REPLACE INTO teknik_to_cache (kode_pekerjaan, mode, tanggal, payload, updated_at) VALUES (?, ?, ?, ?, ?)',
          [row['kodePekerjaan'].toString(), mode, row['tanggal'].toString(), jsonEncode(row), DateTime.now().toIso8601String()],
        );
      }
    });
    return list;
  }

  Future<List<String>> refreshTeams(String token) async {
    final res = await _send(token, {'cmd': 'teams', 'current': ''});
    if (res['success'] != true) throw Exception(res['message'] ?? 'Gagal memuat tim.');
    final list = List<String>.from(res['list'] ?? const []);
    await db.transaction(() async {
      await db.customStatement('DELETE FROM teknik_to_team');
      for (final team in list) {
        await db.customStatement('INSERT OR REPLACE INTO teknik_to_team (nama, updated_at) VALUES (?, ?)', [team, DateTime.now().toIso8601String()]);
      }
    });
    return list;
  }

  Future<void> syncAll(String token) async {
    await flushOutbox(token);
    await Future.wait([
      refreshList(token, 'assignment'),
      refreshList(token, 'move'),
      refreshTeams(token),
    ]);
  }

  Future<void> assign({
    required String token,
    required String mode,
    required String kode,
    required String tim,
    String catatan = '',
  }) async {
    final payload = {'cmd': 'assign', 'mode': mode, 'kodePekerjaan': kode, 'timEksekusi': tim, 'catatan': catatan};
    await db.customStatement(
      'INSERT INTO teknik_to_outbox (kode_pekerjaan, mode, payload, created_at, attempts) VALUES (?, ?, ?, ?, 0)',
      [kode, mode, jsonEncode(payload), DateTime.now().toIso8601String()],
    );
    // Optimistic local update: hilangkan dari daftar asal tanpa menunggu internet.
    await db.customStatement('DELETE FROM teknik_to_cache WHERE kode_pekerjaan = ? AND mode = ?', [kode, mode]);
    try { await flushOutbox(token); } catch (_) {}
  }

  Future<void> flushOutbox(String token) async {
    final pending = await db.customSelect('SELECT id, payload FROM teknik_to_outbox ORDER BY id LIMIT 25').get();
    for (final item in pending) {
      final id = item.data['id'] as int;
      try {
        final payload = Map<String, dynamic>.from(jsonDecode(item.data['payload'] as String));
        final res = await _send(token, payload);
        if (res['success'] != true) throw Exception(res['message'] ?? 'Gagal menyimpan TO.');
        await db.customStatement('DELETE FROM teknik_to_outbox WHERE id = ?', [id]);
      } catch (_) {
        await db.customStatement('UPDATE teknik_to_outbox SET attempts = attempts + 1 WHERE id = ?', [id]);
        rethrow;
      }
    }
  }
}
