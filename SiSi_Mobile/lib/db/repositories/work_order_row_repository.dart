import 'dart:convert';

import '../../services/apps_script_http.dart' as http;
import '../../services/api_service.dart';

class WorkOrderRowRepository {
  Future<Map<String, dynamic>> _send(String token, Map<String, dynamic> payload) async {
    final response = await http.post(
      Uri.parse('${ApiService.baseUrl}?mobile=1'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'action': 'getMasterGarduMobile', 'token': token, 'ulp': 'WO_ROW:${jsonEncode(payload)}'}),
    ).timeout(const Duration(seconds: 60));
    final decoded = jsonDecode(response.body);
    if (decoded is! Map) throw Exception('Respons WO ROW tidak valid.');
    final out = Map<String, dynamic>.from(decoded);
    if (out['module'] != 'wo-row' || out['apiVersion'] != 1) throw Exception('Backend WO ROW belum di-deploy.');
    if (out['success'] != true) throw Exception(out['message'] ?? 'Proses WO ROW gagal.');
    return out;
  }

  Future<Map<String, dynamic>> start({required String token, required String kodePekerjaan}) => _send(token, {'cmd': 'start', 'kodePekerjaan': kodePekerjaan});
  Future<Map<String, dynamic>> updatePhoto({required String token, required String kodePekerjaan, required String tahap, required String fotoBase64, required num diameter}) => _send(token, {'cmd': 'update', 'kodePekerjaan': kodePekerjaan, 'tahap': tahap, 'fotoBase64': fotoBase64, 'fotoMime': 'image/jpeg', 'diameter': diameter});
}
