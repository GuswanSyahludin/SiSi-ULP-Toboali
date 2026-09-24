import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:workmanager/workmanager.dart';

import '../db/db_provider.dart';

/// SesiStore keeps session and device credentials in platform secure storage.
/// SharedPreferences is retained only as a one-time migration source.
class SesiStore {
  static const _kSesi = 'sesiJson';
  static const _kDevice = 'deviceToken';
  static const _kKredLama = ['kredU', 'kredP'];
  static const _periodicUniqueName = 'sisi-background-sync';
  static const _manualUniqueName = 'sisi-manual-master-sync';
  static const _secureSession = 'sisi.secure.session';
  static const _secureDevice = 'sisi.secure.deviceToken';
  static const _secureStorage = FlutterSecureStorage();

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
    final dev = (deviceToken != null && deviceToken.isNotEmpty)
        ? deviceToken
        : (bersih['deviceToken'] ?? '').toString();
    await DbProvider.activateForSession(bersih);
    await _secureStorage.write(key: _secureSession, value: jsonEncode(bersih));
    if (dev.isNotEmpty) {
      await _secureStorage.write(key: _secureDevice, value: dev);
    }
    await _removeLegacyPrefs(prefs);
  }

  static Future<Map<String, dynamic>?> muat() async {
    final prefs = await SharedPreferences.getInstance();
    await _removeLegacyCredentialPrefs(prefs);

    var mentah = await _secureStorage.read(key: _secureSession);
    var deviceToken = await _secureStorage.read(key: _secureDevice);

    // One-time migration from the old unencrypted store. Migrate only the
    // complete session, then delete every plaintext copy. No password is
    // migrated or reconstructed.
    if (mentah == null || mentah.isEmpty) {
      final legacySession = prefs.getString(_kSesi);
      if (legacySession != null && legacySession.isNotEmpty) {
        var migrated = false;
        try {
          final decoded = jsonDecode(legacySession);
          final legacyToken = (prefs.getString('token') ?? '').trim();
          if (decoded is Map && legacyToken.isNotEmpty) {
            final session = Map<String, dynamic>.from(decoded);
            final sessionToken = (session['token'] ?? '').toString().trim();
            final username = (session['username'] ?? '').toString().trim();
            final ulp = (session['ulp'] ?? '').toString().trim();
            if (sessionToken.isNotEmpty &&
                sessionToken == legacyToken &&
                username.isNotEmpty &&
                ulp.isNotEmpty) {
              session['token'] = legacyToken;
              final legacyDevice = prefs.getString(_kDevice) ?? '';
              await _secureStorage.write(
                key: _secureSession,
                value: jsonEncode(session),
              );
              if (legacyDevice.isNotEmpty) {
                await _secureStorage.write(
                  key: _secureDevice,
                  value: legacyDevice,
                );
              }
              mentah = jsonEncode(session);
              deviceToken = legacyDevice.isEmpty ? deviceToken : legacyDevice;
              migrated = true;
            }
          }
        } catch (_) {
          migrated = false;
        } finally {
          // Invalid, incomplete, or ambiguous legacy state is never retried
          // and never becomes an active session.
          await _removeLegacyPrefs(prefs);
        }
        if (!migrated) {
          mentah = null;
          deviceToken = null;
        }
      }
    }

    // Legacy fields may exist even when no legacy session payload exists, or
    // when a secure session was already present. They are never authoritative.
    await _removeLegacyPrefs(prefs);

    if (mentah == null || mentah.isEmpty) {
      await DbProvider.deactivate();
      return null;
    }

    try {
      final hasil = jsonDecode(mentah);
      if (hasil is Map) {
        final session = Map<String, dynamic>.from(hasil);
        if ((session['username'] ?? '').toString().trim().isEmpty ||
            (session['ulp'] ?? '').toString().trim().isEmpty ||
            (session['token'] ?? '').toString().trim().isEmpty) {
          await hapus();
          return null;
        }
        if (deviceToken != null && deviceToken.isNotEmpty) {
          session['deviceToken'] = deviceToken;
        }
        await DbProvider.activateForSession(session);
        return session;
      }
    } catch (_) {}
    await hapus();
    return null;
  }

  static Future<String> deviceToken() async {
    return await _secureStorage.read(key: _secureDevice) ?? '';
  }

  static Future<bool> adaDeviceToken() async => (await deviceToken()).isNotEmpty;

  static Future<void> hapus() async {
    final workmanager = Workmanager();
    await workmanager.cancelByUniqueName(_periodicUniqueName);
    await workmanager.cancelByUniqueName(_manualUniqueName);
    final prefs = await SharedPreferences.getInstance();
    await _secureStorage.delete(key: _secureSession);
    await _secureStorage.delete(key: _secureDevice);
    await _removeLegacyPrefs(prefs);
    await DbProvider.deactivate();
  }

  static Future<void> _removeLegacyCredentialPrefs(SharedPreferences prefs) async {
    for (final key in _kKredLama) {
      await prefs.remove(key);
    }
  }

  static Future<void> _removeLegacyPrefs(SharedPreferences prefs) async {
    await _removeLegacyCredentialPrefs(prefs);
    for (final key in [
      _kSesi,
      _kDevice,
      'token',
      'username',
      'role',
      'aksesMenu',
    ]) {
      await prefs.remove(key);
    }
  }
}
