import 'dart:convert';
import 'dart:io' show Platform;

import 'package:http/http.dart' as http;

import 'sesi_store.dart';

class ApiService {
  static Future<http.Response> _postAppsScriptJson(
    Uri uri,
    Map<String, dynamic> payload, {
    Duration timeout = const Duration(seconds: 30),
  }) async {
    final client = http.Client();
    try {
      final request = http.Request('POST', uri)
        ..followRedirects = false
        ..headers['Content-Type'] = 'application/json'
        ..body = jsonEncode(payload);
      var streamed = await client.send(request).timeout(timeout);
      var response = await http.Response.fromStream(streamed);

      var hops = 0;
      while ({301, 302, 303, 307, 308}.contains(response.statusCode) &&
          hops < 5) {
        final location = response.headers['location'];
        if (location == null || location.trim().isEmpty) break;
        final next = uri.resolve(location);
        response = await client.get(next).timeout(timeout);
        hops++;
      }
      return response;
    } finally {
      client.close();
    }
  }

  static Map<String, dynamic> _decodeResponse(
    http.Response response, {
    required String operation,
  }) {
    final body = response.body.trim();
    if (body.isEmpty) {
      return {
        'success': false,
        'message':
            '$operation gagal: backend mengirim respons kosong (HTTP ${response.statusCode}). Periksa deployment Web App dan akses eksekusi.',
      };
    }
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
      return {
        'success': false,
        'message': '$operation gagal: format respons backend bukan objek JSON.',
      };
    } on FormatException {
      final ringkas = body.length > 160 ? '${body.substring(0, 160)}…' : body;
      return {
        'success': false,
        'message':
            '$operation gagal: backend tidak mengirim JSON valid (HTTP ${response.statusCode}). Respons: $ringkas',
      };
    }
  }

  static const String baseUrl =
      'https://script.google.com/macros/s/AKfycby4kkqmlpmzlvh-WRMbkqgVg4fNdQhECHm6QKyhaBqMcNebsJbaHLmZYYvb6nAcJ2CpyA/exec';

  // ==========================================
  // 1. AUTENTIKASI & SESI
  // ==========================================
  //
  // Rev 22 Agu 2026 (tahap 2 — DEVICE TOKEN):
  // Jalur utama kini loginPerangkat / cekPerangkat / logoutPerangkat
  // (Core/Auth-Perangkat.js). Perangkat menyimpan deviceToken tanpa masa
  // berlaku, jadi password TIDAK perlu disimpan di HP.
  //
  // Setiap fungsi baru punya JALUR MUNDUR ke endpoint lama: bila backend belum
  // di-deploy ulang, Apps Script menjawab "Action API tidak dikenal" dan
  // aplikasi otomatis kembali ke perilaku sesi lama. Jadi APK ini aman dipasang
  // sebelum maupun sesudah deploy backend.

  /// Deteksi balasan router lama yang belum mengenal endpoint sesi perangkat.
  static bool _belumAdaEndpoint(Map<String, dynamic> res) {
    final pesan = (res['message'] ?? '').toString().toLowerCase();
    return pesan.contains('tidak dikenal');
  }

  /// Nama perangkat singkat untuk catatan Super User (daftarPerangkat).
  /// Memakai dart:io agar tidak menambah dependensi baru di pubspec.
  static String _namaPerangkat() {
    try {
      return '${Platform.operatingSystem} ${Platform.operatingSystemVersion}';
    } catch (_) {
      return 'perangkat';
    }
  }

  /// Login manual (user mengetik username + password).
  /// Sekali berhasil, server menerbitkan deviceToken yang disimpan di HP —
  /// sesudah ini password tidak dibutuhkan lagi.
  static Future<Map<String, dynamic>> loginPerangkat(
    String username,
    String password,
  ) async {
    final uri = Uri.parse('$baseUrl?mobile=1');
    // Kredensial wajib di body POST: tidak masuk URL, history, atau access log.
    final res = await _postAppsScriptJson(uri, {
      'action': 'loginPerangkat',
      'username': username,
      'password': password,
      'perangkat': _namaPerangkat(),
    });
    final hasil = _decodeResponse(res, operation: 'Login');

    // Backend belum di-deploy ulang → pakai login lama (tanpa deviceToken).
    if (hasil['success'] != true && _belumAdaEndpoint(hasil)) {
      return await login(username, password);
    }
    return hasil;
  }

  /// Tukar deviceToken tersimpan menjadi sesi segar. Dipanggil SplashGate saat
  /// aplikasi dibuka. Balasan gagal menyertakan `kode` (PERANGKAT_TIDAK_DIKENAL,
  /// PASSWORD_BERUBAH, AKUN_TIDAK_ADA) yang menandakan perangkat sudah dicabut.
  static Future<Map<String, dynamic>> cekPerangkat() async {
    final dev = await SesiStore.deviceToken();
    if (dev.isEmpty) {
      return {
        'success': false,
        'kode': 'TANPA_TOKEN',
        'message': 'Belum ada sesi perangkat.',
      };
    }

    final uri = Uri.parse(
      '$baseUrl?mobile=1&action=cekPerangkat'
      '&deviceToken=${Uri.encodeComponent(dev)}',
    );
    final res = await http.get(uri).timeout(const Duration(seconds: 30));
    final hasil = Map<String, dynamic>.from(jsonDecode(res.body));

    if (hasil['success'] == true) {
      // Sesi selalu dibangun ulang dari db_Users terbaru → perubahan role/ULP/
      // Tim/Akses Menu oleh Super User langsung ikut tersimpan.
      await SesiStore.simpan(hasil, deviceToken: dev);
      return hasil;
    }

    // Backend belum di-deploy ulang → coba cekSesi lama dengan token biasa.
    if (_belumAdaEndpoint(hasil)) {
      final sesiLokal = await SesiStore.muat();
      final token = (sesiLokal?['token'] ?? '').toString();
      if (token.isNotEmpty) {
        final lama = await cekSesi(token);
        if (lama['success'] == true) {
          final gabung = Map<String, dynamic>.from(sesiLokal!);
          final dariServer = lama['sesi'];
          if (dariServer is Map) {
            gabung.addAll(Map<String, dynamic>.from(dariServer));
          }
          await SesiStore.simpan(gabung);
          return {...gabung, 'success': true};
        }
      }
    }
    return hasil;
  }

  /// Logout: cabut perangkat di server, lalu bersihkan seluruh sesi lokal.
  /// Pembersihan lokal ada di blok `finally` supaya tombol "Keluar dari Akun"
  /// tetap memutus sesi walau permintaan ke server gagal.
  static Future<Map<String, dynamic>> logoutPerangkat({String token = ''}) async {
    final dev = await SesiStore.deviceToken();
    try {
      final uri = Uri.parse(
        '$baseUrl?mobile=1&action=logoutPerangkat'
        '&deviceToken=${Uri.encodeComponent(dev)}'
        '&token=${Uri.encodeComponent(token)}',
      );
      final res = await http.get(uri).timeout(const Duration(seconds: 15));
      final hasil = Map<String, dynamic>.from(jsonDecode(res.body));

      // Backend belum di-deploy ulang → pakai logout lama.
      if (hasil['success'] != true && _belumAdaEndpoint(hasil)) {
        final uriLama =
            Uri.parse('$baseUrl?mobile=1&action=logout&token=$token');
        final resLama =
            await http.get(uriLama).timeout(const Duration(seconds: 15));
        return Map<String, dynamic>.from(jsonDecode(resLama.body));
      }
      return hasil;
    } finally {
      await SesiStore.hapus();
    }
  }

  /// Login lama (tanpa deviceToken) — tetap ada sebagai jalur mundur.
  static Future<Map<String, dynamic>> login(
    String username,
    String password,
  ) async {
    final uri = Uri.parse('$baseUrl?mobile=1');
    final res = await _postAppsScriptJson(uri, {
      'action': 'login',
      'username': username,
      'password': password,
    });
    return _decodeResponse(res, operation: 'Login');
  }

  static Future<Map<String, dynamic>> cekSesi(String token) async {
    final uri = Uri.parse('$baseUrl?mobile=1&action=cekSesi&token=$token');
    final res = await http.get(uri).timeout(const Duration(seconds: 15));
    return jsonDecode(res.body);
  }

  /// Pembungkus agar pemanggil lama (dashboard_screen.dart → _handleLogout)
  /// tidak perlu diubah: diarahkan ke logoutPerangkat, yang sekaligus mencabut
  /// perangkat di server dan membersihkan sesi di HP.
  static Future<Map<String, dynamic>> logout(String token) {
    return logoutPerangkat(token: token);
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

  // Update bertahap foto eksekusi ROW (sistem progres 21 Agu 2026):
  // tahap 2 = foto pekerjaan, tahap 3 = foto sesudah (selesai).
  // POST karena mengirim base64 foto; timeout 45 dtk seperti simpan.
  static Future<Map<String, dynamic>> updateEksekusiRow({
    required String token,
    required String kodeEksekusi,
    String? fotoPekerjaanBase64,
    String? fotoSesudahBase64,
  }) async {
    final uri = Uri.parse('$baseUrl?mobile=1');
    final bodyData = {
      'action': 'updateMobileEksekusiRow',
      'token': token,
      'kodeEksekusi': kodeEksekusi,
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
    final sesi = await SesiStore.muat();
    final token = (sesi?['token'] ?? '').toString();
    final uri = Uri.parse(
      '$baseUrl?mobile=1&action=getMobileApprovalP0List&token=${Uri.encodeComponent(token)}&ulp=${Uri.encodeComponent(ulp)}&status=${Uri.encodeComponent(status)}&tanggal=${Uri.encodeComponent(tanggal ?? '')}',
    );
    // Rev 19 Agu sore: 15 → 30 dtk (jaring pengaman saat server sibuk)
    final res = await http.get(uri).timeout(const Duration(seconds: 30));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> setApprovalP0({
    required String kodeP0,
    required String keputusan,
    required String username,
    String alasan = '',
  }) async {
    final sesi = await SesiStore.muat();
    final token = (sesi?['token'] ?? '').toString();
    // Rev 19 Agu malam: POST -> GET. Backend sudah membaca e.parameter (doGet -> apiRouter_),
    // jadi backend TIDAK perlu deploy ulang. GET terbukti lancar di jalur redirect Apps Script
    // (login/list/detail semuanya GET); POST -> 302 berulang kali menggantung di emulator.
    final uri = Uri.parse(
      '$baseUrl?mobile=1&action=setMobileApprovalP0'
      '&token=${Uri.encodeComponent(token)}'
      '&kodeP0=${Uri.encodeComponent(kodeP0)}'
      '&keputusan=${Uri.encodeComponent(keputusan)}'
      '&username=${Uri.encodeComponent(username)}'
      '&alasan=${Uri.encodeComponent(alasan)}',
    );
    final res = await http.get(uri).timeout(const Duration(seconds: 30));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> getLampiranPengecekanP0(
      String kodeP0) async {
    final sesi = await SesiStore.muat();
    final token = (sesi?['token'] ?? '').toString();
    final uri = Uri.parse(
      '$baseUrl?mobile=1&action=getMobileLampiranPengecekanP0&token=${Uri.encodeComponent(token)}&kodeP0=${Uri.encodeComponent(kodeP0)}',
    );
    // Rev 19 Agu sore: 20 → 30 dtk (detail Gardu membaca spreadsheet kedua)
    final res = await http.get(uri).timeout(const Duration(seconds: 30));
    return jsonDecode(res.body);
  }

  // ==========================================
  // 5. LAPORAN UP3 / UIW (Teknik_Laporan Harian)
  // ==========================================
  // Baca baris (default hari ini): C4A + kolom G/H + status per tim. GET (jalur terbukti lancar).
  static Future<Map<String, dynamic>> getLaporanUp3Uiw(
      {String? tanggal}) async {
    final uri = Uri.parse(
      '$baseUrl?mobile=1&action=getMobileLaporanUp3Uiw&tanggal=${Uri.encodeComponent(tanggal ?? '')}',
    );
    final res = await http.get(uri).timeout(const Duration(seconds: 30));
    return jsonDecode(res.body);
  }

  // Simpan input C4A (kolom C..F) + server me-regenerate kolom G & H. GET — regenerate berat → 45 dtk.
  static Future<Map<String, dynamic>> simpanLaporanC4A({
    required String token,
    String? tanggal,
    required String penyulang,
    required String realisasi,
    required String temuan,
    required String eksekusi,
  }) async {
    final uri = Uri.parse(
      '$baseUrl?mobile=1&action=simpanMobileLaporanC4A&token=${Uri.encodeComponent(token)}&tanggal=${Uri.encodeComponent(tanggal ?? '')}&penyulang=${Uri.encodeComponent(penyulang)}&realisasi=${Uri.encodeComponent(realisasi)}&temuan=${Uri.encodeComponent(temuan)}&eksekusi=${Uri.encodeComponent(eksekusi)}',
    );
    final res = await http.get(uri).timeout(const Duration(seconds: 45));
    return jsonDecode(res.body);
  }
}
