import 'dart:io';

import 'package:path_provider/path_provider.dart';

/// Prevents the pre-Stage-5 shared database from becoming a cross-account
/// fallback. The legacy file and SQLite sidecars are preserved under
/// quarantine and are never opened or copied automatically because their row
/// ownership is not provable.
class LegacyDatabaseGuard {
  LegacyDatabaseGuard._();

  static const legacyDatabaseName = 'sisi_db';
  static const _databaseSuffixes = ['', '.sqlite', '.db', '.sqlite3'];
  static const _sqliteSidecars = ['', '-wal', '-shm'];

  static List<String> candidatePaths(String directoryPath) {
    return [
      for (final databaseSuffix in _databaseSuffixes)
        for (final sidecar in _sqliteSidecars)
          '$directoryPath/$legacyDatabaseName$databaseSuffix$sidecar',
    ].toList(growable: false);
  }

  static Future<List<String>> quarantineIfPresent({Directory? directory}) async {
    // drift_flutter stores driftDatabase(name: ...) as $name.sqlite in the
    // application documents directory on native platforms.
    final root = directory ?? await getApplicationDocumentsDirectory();
    final quarantined = <String>[];
    final stamp = DateTime.now().toUtc().microsecondsSinceEpoch;

    for (final path in candidatePaths(root.path)) {
      final source = File(path);
      if (!await source.exists()) continue;

      final target = File('$path.quarantined-$stamp');
      try {
        await source.rename(target.path);
      } catch (error) {
        throw StateError(
          'Database legacy tidak dapat dikarantina: $path ($error)',
        );
      }
      quarantined.add(target.path);
    }
    return quarantined;
  }
}
