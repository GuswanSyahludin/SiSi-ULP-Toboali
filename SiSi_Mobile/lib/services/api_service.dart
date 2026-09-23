import 'dart:convert';
import 'dart:io' show Platform;

import 'package:http/http.dart' as http;

import 'sesi_store.dart';

class ApiService {
  static const String baseUrl = 'https://script.google.com/macros/s/AKfycby4kkqmlpmzlvh-WRMbkqgVg4fNdQhECHm6QKyhaBqMcNebsJbaHLmZYYvb6nAcJ2CpyA/exec';

  static Future<http.Response> _postAppsScriptJson(Map<String, dynamic> payload, {Duration timeout = const Duration(seconds: 30)}) async {
    final client = http.Client();
    try {
      var uri = Uri.parse('$baseUrl?mobile=1');
      var request = http.Request('POST', uri)..followRedirects = false..headers['Content-Type'] = 'application/json'..body = jsonEncode(payload);
      for (var hops = 0; hops < 5; hops++) {
        final streamed = await client.send(request).timeout(timeout);
        final response = await http.Response.fromStream(streamed);
        if (!{301, 302, 303, 307, 308}.contains(response.statusCode)) return response;
        final location = response.headers['location'];
        if (location == null || location.trim().isEmpty) return response;
        final next = uri.resolve(location);
        if (next.scheme != 'https' || !(next.host == 'script.google.com' || next.host == 'script.googleusercontent.com')) throw StateError('Alamat redirect backend ditolak.');
        if (response.statusCode == 307 || response.statusCode == 308) throw StateError('Backend meminta pengiriman ulang POST.');
        uri = next;
        request = http.Request('GET', uri)..followRedirects = false;
      }
      throw StateError('Terlalu banyak redirect backend.');
    } finally {
      client.close();
    }
  }

  static Map<String, dynamic> _decodeResponse(http.Response response, {required String operation}) {
    final body = response.body.trim();
    if (body.isEmpty) return {'success': false, 'message': '$operation gagal: backend mengirim respons kosong (HTTP ${response.statusCode}).'};
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
      return {'success': false, 'message': '$operation gagal: format respons backend bukan objek JSON.'};
    } on FormatException {
      return {'success': false, 'message': '$operation gagal: backend tidak mengirim JSON valid (HTTP ${response.statusCode}).'};
    }
  }

  static Future<Map<String, dynamic>> _call(String action, Map<String, dynamic> payload, {Duration timeout = const Duration(seconds: 30)}) async {
    final response = await _postAppsScriptJson({'action': action, ...payload}, timeout: timeout);
    return _decodeResponse(response, operation: action);
  }

  static String _namaPerangkat() {
    try {
      return '${Platform.operatingSystem} ${Platform.operatingSystemVersion}';
    } catch (_) {
      return 'perangkat';
    }
  }

  static Future<Map<String, dynamic>> loginPerangkat(String username, String password) => _call('loginPerangkat', {'username': username, 'password': password, 'perangkat': _namaPerangkat()});

  static Future<Map<String, dynamic>> cekPerangkat() async {
    final deviceToken = await SesiStore.deviceToken();
    if (deviceToken.isEmpty) return {'success': false, 'kode': 'TANPA_TOKEN', 'message': 'Belum ada sesi perangkat.'};
    final result = await _call('cekPerangkat', {'deviceToken': deviceToken});
    if (result['success'] == true) await SesiStore.simpan(result, deviceToken: deviceToken);
    return result;
  }

  static Future<Map<String, dynamic>> logoutPerangkat({String token = ''}) async {
    final deviceToken = await SesiStore.deviceToken();
    try {
      return await _call('logoutPerangkat', {'deviceToken': deviceToken}, timeout: const Duration(seconds: 15));
    } finally {
      await SesiStore.hapus();
    }
  }

  static Future<Map<String, dynamic>> login(String username, String password) => loginPerangkat(username, password);
  static Future<Map<String, dynamic>> cekSesi(String token) => throw StateError('Kontrak cekSesi legacy tidak didukung.');
  static Future<Map<String, dynamic>> logout([String token = '']) => logoutPerangkat();

  static Future<Map<String, dynamic>> getLaporanHarian({required String token, String? subTim, String? tim, String? tanggal, int limit = 50}) => _call('getLaporanHarian', {'token': token, 'subTim': subTim ?? '', 'tim': tim ?? '', 'tanggal': tanggal ?? '', 'limit': limit}, timeout: const Duration(seconds: 15));
  static Future<Map<String, dynamic>> getDropdownRow({required String token}) => _call('getMobileDropdownRow', {'token': token}, timeout: const Duration(seconds: 15));
  static Future<Map<String, dynamic>> getEksekusiRow({required String token, String? subTim, String? tim, String? tanggal, int limit = 50}) => _call('getMobileEksekusiRow', {'token': token, 'subTim': subTim ?? '', 'tim': tim ?? '', 'tanggal': tanggal ?? '', 'limit': limit}, timeout: const Duration(seconds: 15));
  static Future<Map<String, dynamic>> simpanEksekusiRow({required String token, required String penyulang, required String section, required String nomorTiang, required String koordinatTiang, String? koordinatPekerjaan, required num diameter, String? fotoSebelumBase64, String? fotoPekerjaanBase64, String? fotoSesudahBase64}) => _call('simpanMobileEksekusiRow', {'token': token, 'penyulang': penyulang, 'section': section, 'nomorTiang': nomorTiang, 'koordinatPekerjaan': koordinatPekerjaan ?? koordinatTiang, 'koordinatTiang': koordinatTiang, 'diameter': diameter, 'fotoSebelumBase64': fotoSebelumBase64 ?? '', 'fotoPekerjaanBase64': fotoPekerjaanBase64 ?? '', 'fotoSesudahBase64': fotoSesudahBase64 ?? ''}, timeout: const Duration(seconds: 45));
  static Future<Map<String, dynamic>> updateEksekusiRow({required String token, required String kodeEksekusi, String? fotoPekerjaanBase64, String? fotoSesudahBase64}) => _call('updateMobileEksekusiRow', {'token': token, 'kodeEksekusi': kodeEksekusi, 'fotoPekerjaanBase64': fotoPekerjaanBase64 ?? '', 'fotoSesudahBase64': fotoSesudahBase64 ?? ''}, timeout: const Duration(seconds: 45));

  static Future<Map<String, dynamic>> getApprovalP0List({required String ulp, String status = 'Menunggu', String? tanggal}) async {
    final session = await SesiStore.muat();
    return _call('getMobileApprovalP0List', {'token': (session?['token'] ?? '').toString(), 'ulp': ulp, 'status': status, 'tanggal': tanggal ?? ''});
  }

  static Future<Map<String, dynamic>> setApprovalP0({required String kodeP0, required String keputusan, required String username, String alasan = ''}) async {
    final session = await SesiStore.muat();
    return _call('setMobileApprovalP0', {'token': (session?['token'] ?? '').toString(), 'kodeP0': kodeP0, 'keputusan': keputusan, 'username': username, 'alasan': alasan});
  }

  static Future<Map<String, dynamic>> getLampiranPengecekanP0(String kodeP0) async {
    final session = await SesiStore.muat();
    return _call('getMobileLampiranPengecekanP0', {'token': (session?['token'] ?? '').toString(), 'kodeP0': kodeP0});
  }

  static Future<Map<String, dynamic>> getLaporanUp3Uiw({String? tanggal}) async {
    final session = await SesiStore.muat();
    return _call('getMobileLaporanUp3Uiw', {'token': (session?['token'] ?? '').toString(), 'tanggal': tanggal ?? ''});
  }

  static Future<Map<String, dynamic>> simpanLaporanC4A({required String token, String? tanggal, required String penyulang, required String realisasi, required String temuan, required String eksekusi}) => _call('simpanMobileLaporanC4A', {'token': token, 'tanggal': tanggal ?? '', 'penyulang': penyulang, 'realisasi': realisasi, 'temuan': temuan, 'eksekusi': eksekusi}, timeout: const Duration(seconds: 45));
}
