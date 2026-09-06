import 'dart:convert';
import 'apps_script_http.dart' as http;
import 'api_service.dart';

class GangguanBerandaService {
  static Future<Map<String, dynamic>> load({required String token, required String from, required String to, String ulp = ''}) async {
    final response = await http.post(
      Uri.parse('${ApiService.baseUrl}?mobile=1'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'action': 'getMobileGangguanBeranda', 'token': token, 'from': from, 'to': to, 'ulp': ulp}),
    ).timeout(const Duration(seconds: 45));
    try {
      final data = jsonDecode(response.body);
      if (data is Map) return Map<String, dynamic>.from(data);
    } catch (_) {}
    return {'ok': false, 'message': 'Data gangguan gagal dibaca (HTTP ${response.statusCode}).'};
  }
}
