import 'dart:convert';
import 'apps_script_http.dart' as http;
import 'api_service.dart';
import 'sesi_store.dart';

/// POST-only transport: tokens and audit reasons never go into a query string.
class P0CorrectionApi {
  static Future<Map<String, dynamic>> call(String action, Map<String, dynamic> data) async {
    final session = await SesiStore.muat();
    final token = (session?['token'] ?? '').toString();
    if (token.isEmpty) throw StateError('Sesi habis. Silakan login ulang.');
    final response = await http.post(
      Uri.parse('${ApiService.baseUrl}?mobile=1'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({...data, 'action': action, 'token': token}),
    ).timeout(const Duration(seconds: 40));
    if (response.statusCode != 200) {
      throw StateError('Backend HTTP ${response.statusCode}.');
    }
    final decoded = jsonDecode(response.body);
    if (decoded is! Map) throw StateError('Respons backend tidak valid.');
    return Map<String, dynamic>.from(decoded);
  }
}
