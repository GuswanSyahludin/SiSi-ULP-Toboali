import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:workmanager/workmanager.dart';

import '../db/db_provider.dart';

/// SesiStore — penyimpan sesi login SiSi Mobile.
class SesiStore {
  static const _kSesi = 'sesiJson';
  static const _kDevice = 'deviceToken';
  static const _kKredLama = ['kredU', 'kredP'];
  static const _periodicUniqueName = 'sisi-background-sync';
  static const _manualUniqueName = 'sisi-manual-master-sync';

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
    await DbProvider.activateForSession(bersih);
    await prefs.setString(_kSesi, jsonEncode(bersih));

    await prefs.setString('token', (bersih['token'] ?? '').toString());
    await prefs.setString('username', (bersih['username'] ?? '').toString());
    await prefs.setString('role', (bersih['role'] ?? '').toString());
    await prefs.setString('aksesMenu', (bersih['aksesMenu'] ?? '').toString());

    final dev = (deviceToken != null && deviceToken.isNotEmpty)
        ? deviceToken
        : (bersih['deviceToken'] ?? '').toString();
    if (dev.isNotEmpty) await prefs.setString(_kDevice, dev);

    for (final k in _kKredLama) {
      await prefs.remove(k);
    }
  }

  static Future<Map<String, dynamic>?> muat() async {
    final prefs = await SharedPreferences.getInstance();

    for (final k in _kKredLama) {
      if (prefs.containsKey(k)) await prefs.remove(k);
    }

    final mentah = prefs.getString(_kSesi);
    if (mentah == null || mentah.isEmpty) {
      await DbProvider.deactivate();
      return null;
    }

    final tokenLama = prefs.getString('token') ?? '';
    if (tokenLama.isEmpty) {
      await hapus();
      return null;
    }

    try {
      final hasil = jsonDecode(mentah);
      if (hasil is Map) {
        final session = Map<String, dynamic>.from(hasil);
        await DbProvider.activateForSession(session);
        return session;
      }
    } catch (_) {}
    await hapus();
    return null;
  }

  static Future<String> deviceToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kDevice) ?? '';
  }

  static Future<bool> adaDeviceToken() async {
    return (await deviceToken()).isNotEmpty;
  }

  static Future<void> hapus() async {
    final workmanager = Workmanager();
    await workmanager.cancelByUniqueName(_periodicUniqueName);
    await workmanager.cancelByUniqueName(_manualUniqueName);

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
    await DbProvider.deactivate();
  }
}
