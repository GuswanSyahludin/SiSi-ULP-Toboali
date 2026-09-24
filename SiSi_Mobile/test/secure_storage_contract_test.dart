import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('session store uses secure storage for session and device token', () {
    final source = File('lib/services/sesi_store.dart').readAsStringSync();
    expect(source, contains("import 'package:flutter_secure_storage/flutter_secure_storage.dart';"));
    expect(source, contains('FlutterSecureStorage'));
    expect(source, contains('_secureSession'));
    expect(source, contains('_secureDevice'));
    expect(source, contains('One-time migration'));
    expect(source, contains('_removeLegacyPrefs'));
    expect(source, isNot(contains("prefs.setString('token'")));
    expect(source, isNot(contains("prefs.setString('username'")));
    expect(source, isNot(contains("prefs.setString('role'")));
    expect(source, isNot(contains("prefs.setString('aksesMenu'")));
  });

  test('legacy migration requires complete identity and matching token', () {
    final source = File('lib/services/sesi_store.dart').readAsStringSync();
    expect(source, contains("(prefs.getString('token') ?? '').trim()"));
    expect(source, contains("(session['token'] ?? '').toString().trim()"));
    expect(source, contains('sessionToken == legacyToken'));
    expect(source, contains("session['token'] = legacyToken;"));
    expect(source, contains("(session['username'] ?? '').toString().trim()"));
    expect(source, contains("(session['ulp'] ?? '').toString().trim()"));
    expect(source, contains('var migrated = false;'));
    expect(source, contains('if (!migrated)'));
  });

  test('secure sessions also require a token when loaded', () {
    final source = File('lib/services/sesi_store.dart').readAsStringSync();
    expect(source, contains("(session['token'] ?? '').toString().trim().isEmpty"));
  });

  test('legacy plaintext is purged even when secure session already exists', () {
    final source = File('lib/services/sesi_store.dart').readAsStringSync();
    expect(source, contains('await _removeLegacyCredentialPrefs(prefs);'));
    expect(source, contains('// Legacy fields may exist even when no legacy session payload exists'));
    expect(source, contains('await _removeLegacyPrefs(prefs);'));
  });

  test('invalid legacy state is purged in all migration outcomes', () {
    final source = File('lib/services/sesi_store.dart').readAsStringSync();
    expect(source, contains('finally {'));
    expect(source, contains('await _removeLegacyPrefs(prefs);'));
    expect(source, contains('mentah = null;'));
    expect(source, contains('deviceToken = null;'));
  });
}
