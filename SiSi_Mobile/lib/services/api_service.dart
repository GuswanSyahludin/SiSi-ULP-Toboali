import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl =
      'https://script.google.com/macros/s/AKfycby4kkqmlpmzlvh-WRMbkqgVg4fNdQhECHm6QKyhaBqMcNebsJbaHLmZYYvb6nAcJ2CpyA/exec';

  // ==========================================
  // 1. AUTENTIKASI & SESI
  // ==========================================
  static Future<Map<String, dynamic>> login(
    String username,
    String password,
  ) async {
    final uri = Uri.parse(
      '$baseUrl?mobile=1&action=login&username=${Uri.encodeComponent(username)}&password=${Uri.encodeComponent(password)}',
    );
    final res = await http.get(uri).timeout(const Duration(seconds: 15));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> cekSesi(String token) async {
    final uri = Uri.parse('$baseUrl?mobile=1&action=cekSesi&token=$token');
    final res = await http.get(uri).timeout(const Duration(seconds: 15));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> logout(String token) async {
    final uri = Uri.parse('$baseUrl?mobile=1&action=logout&token=$token');
    final res = await http.get(uri).timeout(const Duration(seconds: 15));
    return jsonDecode(res.body);
  }

  // ==========================================
  // 2. LAPORAN HARIAN (db_Global_Header)
  // ==========================================
  static Future<Map<String, dynamic>> getLaporanHarian({
    required String token,
    String? subTim,
    String? tim,
    String? tanggal,
    int limit = 50,
  }) async {
    final uri = Uri.parse(
      '$baseUrl?mobile=1&action=getLaporanHarian&token=$token&subTim=${Uri.encodeComponent(subTim ?? '')}&tim=${Uri.encodeComponent(tim ?? '')}&tanggal=${Uri.encodeComponent(tanggal ?? '')}&limit=$limit',
    );
    final res = await http.get(uri).timeout(const Duration(seconds: 15));
    return jsonDecode(res.body);
  }

  // ==========================================
  // 3. EKSEKUSI ROW (db_ROW_Eksekusi)
  // ==========================================
  static Future<Map<String, dynamic>> getDropdownRow({
    required String token,
  }) async {
    final uri =
        Uri.parse('$baseUrl?mobile=1&action=getMobileDropdownRow&token=$token');
    final res = await http.get(uri).timeout(const Duration(seconds: 15));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> getEksekusiRow({
    required String token,
    String? subTim,
    String? tim,
    String? tanggal,
    int limit = 50,
  }) async {
    final uri = Uri.parse(
      '$baseUrl?mobile=1&action=getMobileEksekusiRow&token=$token&subTim=${Uri.encodeComponent(subTim ?? '')}&tim=${Uri.encodeComponent(tim ?? '')}&tanggal=${Uri.encodeComponent(tanggal ?? '')}&limit=$limit',
    );
    final res = await http.get(uri).timeout(const Duration(seconds: 15));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> simpanEksekusiRow({
    required String token,
    required String penyulang,
    required String section,
    required String nomorTiang,
    required String koordinatTiang,
    String? koordinatPekerjaan,
    required num diameter,
    String? fotoSebelumBase64,
    String? fotoPekerjaanBase64,
    String? fotoSesudahBase64,
  }) async {
    final uri = Uri.parse('$baseUrl?mobile=1');
    final bodyData = {
      'action': 'simpanMobileEksekusiRow',
      'token': token,
      'penyulang': penyulang,
      'section': section,
      'nomorTiang': nomorTiang,
      'koordinatTiang': koordinatTiang,
      'koordinatPekerjaan': koordinatPekerjaan ?? koordinatTiang,
      'diameter': diameter,
      'fotoSebelumBase64': fotoSebelumBase64 ?? '',
      'fotoPekerjaanBase64': fotoPekerjaanBase64 ?? '',
      'fotoSesudahBase64': fotoSesudahBase64 ?? '',
    };
    final res = await http
        .post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(bodyData),
        )
        .timeout(const Duration(seconds: 45));
    return jsonDecode(res.body);
  }

  // ==========================================
  // 4. VERIFIKASI P0 (db_Yandal_P0, Switching, Gardu)
  // ==========================================
  static Future<Map<String, dynamic>> getApprovalP0List({
    required String ulp,
    String status = 'Menunggu',
    String? tanggal,
  }) async {
    final uri = Uri.parse(
      '$baseUrl?mobile=1&action=getMobileApprovalP0List&ulp=${Uri.encodeComponent(ulp)}&status=${Uri.encodeComponent(status)}&tanggal=${Uri.encodeComponent(tanggal ?? '')}',
    );
    final res = await http.get(uri).timeout(const Duration(seconds: 15));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> setApprovalP0({
    required String kodeP0,
    required String keputusan,
    required String username,
    String alasan = '',
  }) async {
    final uri = Uri.parse('$baseUrl?mobile=1');
    final bodyData = {
      'action': 'setMobileApprovalP0',
      'kodeP0': kodeP0,
      'keputusan': keputusan,
      'username': username,
      'alasan': alasan,
    };
    final res = await http
        .post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(bodyData),
        )
        .timeout(const Duration(seconds: 20));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> getLampiranPengecekanP0(
      String kodeP0) async {
    final uri = Uri.parse(
      '$baseUrl?mobile=1&action=getMobileLampiranPengecekanP0&kodeP0=${Uri.encodeComponent(kodeP0)}',
    );
    final res = await http.get(uri).timeout(const Duration(seconds: 20));
    return jsonDecode(res.body);
  }
}
