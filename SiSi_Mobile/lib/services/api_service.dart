import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl =
      'https://script.google.com/macros/s/AKfycby4kkqmlpmzlvh-WRMbkqgVg4fNdQhECHm6QKyhaBqMcNebsJbaHLmZYYvb6nAcJ2CpyA/exec';

  // Pakai GET request agar terhindar dari isu redirect 302 Apps Script
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
}
