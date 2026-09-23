import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'app_database.dart';
import 'legacy_database_guard.dart';

/// Owns the single database connection for the currently authenticated account.
/// Each account gets a different on-device Drift database file.
class DbProvider {
  DbProvider._();

  static AppDatabase? _instance;
  static String _activeDatabaseName = '';

  /// Access is fail-closed before an authenticated session is active.
  static AppDatabase get instance {
    final database = _instance;
    if (database == null) {
      throw StateError('Database lokal memerlukan sesi aktif.');
    }
    return database;
  }

  static String get activeDatabaseName {
    if (_activeDatabaseName.isEmpty) {
      throw StateError('Database lokal memerlukan sesi aktif.');
    }
    return _activeDatabaseName;
  }

  static String databaseNameForSession(Map<String, dynamic> session) {
    final username = (session['username'] ?? '').toString().trim().toLowerCase();
    final ulp = (session['ulp'] ?? '').toString().trim().toLowerCase();
    if (username.isEmpty || ulp.isEmpty) {
      throw StateError('Sesi tidak memiliki identitas akun dan ULP.');
    }
    final identity = jsonEncode({'username': username, 'ulp': ulp});
    final digest = sha256.convert(utf8.encode(identity)).toString();
    return 'sisi_db_${digest.substring(0, 32)}';
  }

  static String scopedKey(String key, Map<String, dynamic> session) {
    final databaseName = databaseNameForSession(session);
    return '$key.$databaseName';
  }

  static Future<void> activateForSession(Map<String, dynamic> session) async {
    final target = databaseNameForSession(session);
    if (_instance != null && _activeDatabaseName == target) return;

    // Never open or copy the old shared file. Its rows have no trustworthy
    // account ownership, so preserving it under quarantine is safer than
    // silently assigning another user's data to the active account.
    await LegacyDatabaseGuard.quarantineIfPresent();

    await _instance?.close();
    _instance = _open(target);
  }

  /// Closes the account database. Its file remains quarantined and is never
  /// reused for a different account identity.
  static Future<void> deactivate() async {
    await _instance?.close();
    _instance = null;
    _activeDatabaseName = '';
  }

  static AppDatabase _open(String name) {
    _activeDatabaseName = name;
    return AppDatabase(name: name);
  }
}
