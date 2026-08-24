import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../services/api_service.dart';

class TeknikToRepository {
  Future<http.Response> _post(Map<String, dynamic> body) async {
    final initial = Uri.parse('${ApiService.baseUrl}?mobile=1');
    final client = http.Client();
    try {
      final request = http.Request('POST', initial)
        ..followRedirects = false
        ..headers['Content-Type'] = 'application/json'
        ..body = jsonEncode(body);
      var response = await http.Response.fromStream(
        await client.send(request).timeout(const Duration(seconds: 45)),
      );
      var current = initial;
      var hops = 0;
      while ({301, 302, 303, 307, 308}.contains(response.statusCode) &&
          hops < 5) {
        final location = response.headers['location'];
        if (location == null || location.trim().isEmpty) break;
        current = current.resolve(location);
        response = await client.get(current).timeout(const Duration(seconds: 45));
        hops++;
      }
      return response;
    } finally {
      client.close();
    }
  }

  Map<String, dynamic> _decode(http.Response response) {
    final raw = response.body.trim();
    if (raw.isEmpty) {
      throw Exception(
        'Server TO mengirim respons kosong (HTTP ${response.statusCode}).',
      );
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
      throw const FormatException('Respons bukan objek JSON.');
    } on FormatException {
      if (raw.startsWith('<!DOCTYPE') || raw.startsWith('<html')) {
        throw Exception(
          'Backend TO belum aktif. Deploy ulang Apps Script dari source terbaru.',
        );
      }
      final preview = raw.length > 140 ? '${raw.substring(0, 140)}…' : raw;
      throw Exception('Respons backend TO tidak valid: $preview');
    }
  }

  Future<Map<String, dynamic>> _send(
    String token,
    Map<String, dynamic> payload,
  ) async {
    final response = await _post({
      'action': 'getMasterGarduMobile',
      'token': token,
      'ulp': 'TEKNIK_TO:${jsonEncode(payload)}',
    });
    final decoded = _decode(response);
    if (decoded['module'] != 'teknik-to' || decoded['apiVersion'] != 1) {
      throw Exception(
        'Backend TO belum di-deploy. Jalankan clasp push lalu deploy ulang Web App.',
      );
    }
    return decoded;
  }

  Future<List<Map<String, dynamic>>> list(String token, String mode) async {
    final res = await _send(token, {'cmd': 'list', 'mode': mode});
    if (res['success'] != true) {
      throw Exception(res['message'] ?? 'Gagal memuat TO.');
    }
    return List.from(res['list'] ?? const [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  Future<List<String>> teams(String token, String current) async {
    final res = await _send(token, {'cmd': 'teams', 'current': current});
    if (res['success'] != true) {
      throw Exception(res['message'] ?? 'Gagal memuat tim.');
    }
    return List<String>.from(res['list'] ?? const []);
  }

  Future<void> assign({
    required String token,
    required String mode,
    required String kode,
    required String tim,
    String catatan = '',
  }) async {
    final res = await _send(token, {
      'cmd': 'assign',
      'mode': mode,
      'kodePekerjaan': kode,
      'timEksekusi': tim,
      'catatan': catatan,
    });
    if (res['success'] != true) {
      throw Exception(res['message'] ?? 'Gagal menyimpan penugasan.');
    }
  }
}
