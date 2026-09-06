import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_service.dart';

/// HTTP bridge to Jadwal Padam. Auth data stays in POST JSON, never in URLs.
class JadwalPadamService {
  static Future<Map<String, dynamic>> _post(
    String action,
    Map<String, dynamic> values,
  ) async {
    final uri = Uri.parse('${ApiService.baseUrl}?mobile=1');
    final response = await http
        .post(
          uri,
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({'action': action, ...values}),
        )
        .timeout(const Duration(seconds: 45));
    return _decode(response, action);
  }

  static Map<String, dynamic> _decode(http.Response response, String action) {
    try {
      final value = jsonDecode(response.body);
      if (value is Map) return Map<String, dynamic>.from(value);
    } catch (_) {}
    return {
      'ok': false,
      'success': false,
      'message': '$action gagal (HTTP ${response.statusCode}).',
    };
  }

  static Future<Map<String, dynamic>> master({required String token}) =>
      _post('getMobileJadwalPadamMaster', {'token': token});

  static Future<Map<String, dynamic>> calendar({
    required String token,
    required int year,
    required int month,
  }) =>
      _post('getMobileJadwalPadamCalendar', {
        'token': token,
        'year': year,
        'month': month,
      });

  static Future<Map<String, dynamic>> list({
    required String token,
    required String tglDari,
    required String tglSampai,
    String penyulang = '',
    String status = '',
    String statusPekerjaan = '',
    int page = 1,
  }) =>
      _post('getMobileJadwalPadamList', {
        'token': token,
        'tglDari': tglDari,
        'tglSampai': tglSampai,
        'penyulang': penyulang,
        'status': status,
        'statusPekerjaan': statusPekerjaan,
        'page': page,
        'pageSize': 50,
      });

  static Future<Map<String, dynamic>> save(Map<String, dynamic> payload) =>
      _post(
        payload['kode'] == null
            ? 'simpanMobileJadwalPadam'
            : 'updateMobileJadwalPadam',
        payload,
      );

  static Future<Map<String, dynamic>> updateStatus({
    required String token,
    required String kode,
    required String status,
  }) =>
      _post('updateMobileStatusJadwalPadam', {
        'token': token,
        'kode': kode,
        'status': status,
      });

  static Future<Map<String, dynamic>> waText({
    required String token,
    required String tglDari,
    required String tglSampai,
    String penyulang = '',
    String status = '',
  }) =>
      _post('getMobileJadwalPadamWaText', {
        'token': token,
        'tglDari': tglDari,
        'tglSampai': tglSampai,
        'penyulang': penyulang,
        'status': status,
      });
}
