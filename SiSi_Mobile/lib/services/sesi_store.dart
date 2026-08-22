import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// SesiStore — penyimpan sesi login SiSi Mobile (Rev 22 Agu 2026).
///
/// MASALAH YANG DIPERBAIKI: halaman login muncul setiap kali aplikasi dibuka,
/// padahal seharusnya HANYA muncul saat user belum pernah login atau sudah
/// menekan "Keluar dari Akun" (Pengaturan → logout).
///
/// Dua sebabnya:
///  1. main.dart selalu membuka LoginScreen (kini lewat SplashGate).
///  2. Login hanya menyimpan 4 field (token/username/role/aksesMenu), padahal
///     dashboard membaca juga ulp/tim/subTim → sesi lokal tak layak dipakai.
///
/// Kelas ini menyimpan sesi UTUH apa adanya dari server (semua field balasan
/// doLogin) + kredensial untuk login-ulang senyap. Login senyap dibutuhkan
/// karena backend menyimpan sesi di CacheService dengan masa berlaku 15 menit
/// (SESSION_TTL_SEC di Code.js): token yang tersimpan di perangkat PASTI basi
/// keesokan harinya, jadi tidak cukup hanya menyimpan token.
///
/// CATATAN KEAMANAN: kredensial hanya DIACAK (obfuscation XOR + base64), BUKAN
/// dienkripsi. Ini menahan pembacaan sekilas isi SharedPreferences, bukan
/// pengamanan kriptografis. Langkah lanjutan yang disarankan: "device token"
/// di backend (ScriptProperties) supaya password tidak perlu disimpan di
/// perangkat sama sekali — perubahan itu butuh clasp push + deploy ulang.
class SesiStore {
  static const _kSesi = 'sesiJson';
  static const _kUser = 'kredU';
  static const _kPass = 'kredP';

  /// Kunci pengacak — sekadar penyamar, bukan kunci kriptografi.
  static const _kunciAcak = 'SiSi.ULP.Toboali.2026';

  static String _acak(String nilai) {
    if (nilai.isEmpty) return '';
    final data = utf8.encode(nilai);
    final kunci = utf8.encode(_kunciAcak);
    final hasil = List<int>.generate(
      data.length,
      (i) => data[i] ^ kunci[i % kunci.length],
    );
    return base64Encode(hasil);
  }

  static String _buka(String tersimpan) {
    if (tersimpan.isEmpty) return '';
    try {
      final data = base64Decode(tersimpan);
      final kunci = utf8.encode(_kunciAcak);
      final hasil = List<int>.generate(
        data.length,
        (i) => data[i] ^ kunci[i % kunci.length],
      );
      return utf8.decode(hasil);
    } catch (_) {
      return '';
    }
  }

  /// Simpan sesi (dan kredensial bila diberikan). Nilai non-primitif
  /// diratakan ke String agar jsonEncode selalu aman.
  static Future<void> simpan(
    Map<String, dynamic> sesi, {
    String? username,
    String? password,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    final bersih = <String, dynamic>{};
    sesi.forEach((k, v) {
      if (v == null) return;
      bersih[k] = (v is String || v is num || v is bool) ? v : v.toString();
    });
    await prefs.setString(_kSesi, jsonEncode(bersih));

    // Kunci lama tetap ditulis — dipakai kode/menu yang sudah ada.
    await prefs.setString('token', (bersih['token'] ?? '').toString());
    await prefs.setString('username', (bersih['username'] ?? '').toString());
    await prefs.setString('role', (bersih['role'] ?? '').toString());
    await prefs.setString('aksesMenu', (bersih['aksesMenu'] ?? '').toString());

    if (username != null && username.isNotEmpty) {
      await prefs.setString(_kUser, _acak(username));
    }
    if (password != null && password.isNotEmpty) {
      await prefs.setString(_kPass, _acak(password));
    }
  }

  /// Muat sesi tersimpan. null = dianggap belum login / sudah logout.
  ///
  /// Kunci lama 'token' ikut diperiksa sebagai jaring pengaman: proses logout
  /// menghapusnya, jadi bila kunci itu hilang sesi dianggap sudah ditutup dan
  /// sisa data (termasuk kredensial) langsung dibersihkan.
  static Future<Map<String, dynamic>?> muat() async {
    final prefs = await SharedPreferences.getInstance();
    final mentah = prefs.getString(_kSesi);
    if (mentah == null || mentah.isEmpty) return null;

    final tokenLama = prefs.getString('token') ?? '';
    if (tokenLama.isEmpty) {
      await hapus();
      return null;
    }

    try {
      final hasil = jsonDecode(mentah);
      if (hasil is Map && (hasil['token'] ?? '').toString().isNotEmpty) {
        return Map<String, dynamic>.from(hasil);
      }
    } catch (_) {}
    return null;
  }

  static Future<bool> adaKredensial() async {
    final kred = await kredensial();
    return kred != null;
  }

  /// Kredensial tersimpan untuk login senyap; null bila belum ada.
  static Future<Map<String, String>?> kredensial() async {
    final prefs = await SharedPreferences.getInstance();
    final u = _buka(prefs.getString(_kUser) ?? '');
    final p = _buka(prefs.getString(_kPass) ?? '');
    if (u.isEmpty || p.isEmpty) return null;
    return {'username': u, 'password': p};
  }

  /// Bersihkan SEMUA jejak sesi — dipanggil saat logout.
  static Future<void> hapus() async {
    final prefs = await SharedPreferences.getInstance();
    for (final k in [
      _kSesi,
      _kUser,
      _kPass,
      'token',
      'username',
      'role',
      'aksesMenu',
    ]) {
      await prefs.remove(k);
    }
  }
}
