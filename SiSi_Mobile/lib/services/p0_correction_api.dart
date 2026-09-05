import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_service.dart';
import 'sesi_store.dart';

/// POST-only transport: tokens and audit reasons never go into a query string.
class P0CorrectionApi {
  static Future<Map<String, dynamic>> call(String action, Map<String, dynamic> data) async {
    final session = await SesiStore.muat();
    final token = (session?['token'] ?? '').toString();
    if (token.isEmpty) throw StateError('Sesi habis. Silakan login ulang.');
    final client = http.Client();
    try {
      var uri = Uri.parse('${ApiService.baseUrl}?mobile=1');
      var request = http.Request('POST', uri)
        ..followRedirects = false
        ..headers['Content-Type'] = 'application/json'
        ..body = jsonEncode({...data, 'action': action, 'token': token});
      final result = await (() async {
        for (var hop = 0; hop < 5; hop++) {
          final streamed = await client.send(request);
          final response = await http.Response.fromStream(streamed);
          if ({301, 302, 303, 307, 308}.contains(response.statusCode)) {
            final location = response.headers['location'];
            if (location == null) throw StateError('Redirect backend tidak valid.');
            final next = uri.resolve(location);
            if (next.scheme != 'https' || !(next.host == 'script.google.com' || next.host == 'script.googleusercontent.com')) {
              throw StateError('Alamat redirect backend ditolak.');
            }
            // Apps Script ContentService redirects the response to a GET URL.
            if (response.statusCode == 307 || response.statusCode == 308) {
              throw StateError('Backend meminta pengiriman ulang POST. Coba lagi nanti.');
            }
            uri = next;
            request = http.Request('GET', uri)..followRedirects = false;
            continue;
          }
          if (response.statusCode != 200) throw StateError('Backend HTTP ${response.statusCode}.');
          final decoded = jsonDecode(response.body);
          if (decoded is! Map) throw StateError('Respons backend tidak valid.');
          return Map<String, dynamic>.from(decoded);
        }
        throw StateError('Terlalu banyak redirect backend.');
      })().timeout(const Duration(seconds: 40));
      return result;
    } finally { client.close(); }
  }
}
