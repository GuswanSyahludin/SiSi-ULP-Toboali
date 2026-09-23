import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:sisi_mobile/db/legacy_database_guard.dart';

void main() {
  test('candidate paths include Drift database and SQLite sidecars', () {
    expect(
      LegacyDatabaseGuard.candidatePaths('/data/app'),
      containsAll(<String>[
        '/data/app/sisi_db.sqlite',
        '/data/app/sisi_db.sqlite-wal',
        '/data/app/sisi_db.sqlite-shm',
        '/data/app/sisi_db',
        '/data/app/sisi_db-wal',
        '/data/app/sisi_db-shm',
      ]),
    );
  });

  test('quarantine preserves legacy database and sidecars', () async {
    final directory = await Directory.systemTemp.createTemp('sisi-legacy-');
    addTearDown(() => directory.delete(recursive: true));

    final files = <String, String>{
      'sisi_db.sqlite': 'legacy-private-data',
      'sisi_db.sqlite-wal': 'legacy-wal',
      'sisi_db.sqlite-shm': 'legacy-shm',
    };
    for (final entry in files.entries) {
      await File('${directory.path}/${entry.key}').writeAsString(entry.value);
    }

    final quarantined = await LegacyDatabaseGuard.quarantineIfPresent(
      directory: directory,
    );

    expect(quarantined, hasLength(3));
    for (final entry in files.entries) {
      final original = File('${directory.path}/${entry.key}');
      expect(await original.exists(), isFalse);
      final moved = quarantined.singleWhere(
        (path) => path.startsWith('${original.path}.quarantined-'),
      );
      expect(await File(moved).readAsString(), entry.value);
      expect(moved, contains('.quarantined-'));
    }
  });

  test('quarantine is a no-op when no legacy database exists', () async {
    final directory = await Directory.systemTemp.createTemp('sisi-empty-');
    addTearDown(() => directory.delete(recursive: true));

    expect(
      await LegacyDatabaseGuard.quarantineIfPresent(directory: directory),
      isEmpty,
    );
  });
}
