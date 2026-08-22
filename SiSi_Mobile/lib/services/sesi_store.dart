import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// SesiStore — penyimpan sesi login SiSi Mobile.
///
/// Rev 22 Agu 2026 (tahap 2 — DEVICE TOKEN):
/// Perangkat kini menyimpan **deviceToken** yang diterbitkan backend
/// (Core/Auth-Perangkat.js), BUKAN username+password lagi. Token itu tidak
/// punya masa berlaku, jadi sesi login benar-benar tanpa batas waktu, dan
/// hanya hangus bila:
///   1. user menekan "Keluar dari Akun",
///   2. password diganti user / di-reset admin,
///   3. akun dihapus dari db_Users,
///   4. dicabut Super User.
///
/// Tahap 1 sebelumnya menyimpan kredensial (diacak) untuk login senyap. Kunci
/// lama itu kini DIHAPUS otomatis saat sesi dimuat — jadi APK yang naik dari
/// versi sebelumnya tidak meninggalkan password di perangkat.
///
/// Kunci lama 'token', 'username', 'role', 'aksesMenu' tetap ditulis karena
/// masih dibaca kode/menu yang sudah ada.
class SesiStore {
  static const _kSesi = 'sesiJson';
  static const _kDevice = 'deviceToken';

  /// Kunci kredensial dari tahap 1 — hanya untuk DIBERSIHKAN, tidak diisi lagi.
  static const _kKredLama = ['kredU', 'kredP'];

  /// Simpan sesi (dan deviceToken bila server mengirimkannya).
  /// Nilai non-primitif diratakan ke String agar jsonEncode selalu aman.
  static Future<void> simpan(
    Map<String, dynamic> sesi, {
    String? deviceToken,
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

    // deviceToken bisa datang lewat parameter ATAU ikut di dalam balasan server.
    final dev = (deviceToken != null && deviceToken.isNotEmpty)
        ? deviceToken
        : (bersih['deviceToken'] ?? '').toString();
    if (dev.isNotEmpty) await prefs.setString(_kDevice, dev);

    // Buang sisa kredensial dari versi sebelumnya, kalau masih ada.
    for (final k in _kKredLama) {
      await prefs.remove(k);
    }
  }

  /// Muat sesi tersimpan. null = dianggap belum login / sudah logout.
  ///
  /// Kunci lama 'token' ikut diperiksa sebagai jaring pengaman: proses logout
  /// menghapusnya, jadi bila kunci itu hilang sesi dianggap sudah ditutup dan
  /// sisa datanya langsung dibersihkan.
  static Future<Map<String, dynamic>?> muat() async {
    final prefs = await SharedPreferences.getInstance();

    // Bersih-bersih warisan tahap 1 pada setiap pemuatan.
    for (final k in _kKredLama) {
      if (prefs.containsKey(k)) await prefs.remove(k);
    }

    final mentah = prefs.getString(_kSesi);
    if (mentah == null || mentah.isEmpty) return null;

    final tokenLama = prefs.getString('token') ?? '';
    if (tokenLama.isEmpty) {
      await hapus();
      return null;
    }

    try {
      final hasil = jsonDecode(mentah);
      if (hasil is Map) return Map<String, dynamic>.from(hasil);
    } catch (_) {}
    return null;
  }

  /// Token perangkat tanpa masa berlaku; kosong = belum ada / sudah dicabut.
  static Future<String> deviceToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kDevice) ?? '';
  }

  static Future<bool> adaDeviceToken() async {
    return (await deviceToken()).isNotEmpty;
  }

  /// Bersihkan SEMUA jejak sesi — dipanggil saat logout atau saat perangkat
  /// dicabut server.
  static Future<void> hapus() async {
    final prefs = await SharedPreferences.getInstance();
    for (final k in [
      _kSesi,
      _kDevice,
      ..._kKredLama,
      'token',
      'username',
      'role',
      'aksesMenu',
    ]) {
      await prefs.remove(k);
    }
  }
}
