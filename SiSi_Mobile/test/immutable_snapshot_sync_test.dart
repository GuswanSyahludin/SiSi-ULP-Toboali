import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('backend freezes selected datasets into chunk files', () {
    final source = File('../SiSi_BackEnd/Core/Delta-Sync-Mobile.js').readAsStringSync();
    expect(source, contains('snapshotCreate'));
    expect(source, contains('snapshotManifest'));
    expect(source, contains('snapshotFetch'));
    expect(source, contains('snapshotRelease'));
    expect(source, contains('_deltaRequestedNames_(payload && payload.datasets'));
    expect(source, contains('DELTA_SNAPSHOT_TTL_MS'));
    expect(source, contains('folder.createFile'));
  });

  test('snapshot fetch never rereads or rehashes source rows', () {
    final source = File('../SiSi_BackEnd/Core/Delta-Sync-Mobile.js').readAsStringSync();
    final start = source.indexOf('function _deltaSnapshotFetch_');
    final end = source.indexOf('function _deltaSnapshotRelease_', start);
    expect(start, greaterThan(0));
    expect(end, greaterThan(start));
    final fetch = source.substring(start, end);
    expect(fetch, isNot(contains('_deltaRows_')));
    expect(fetch, isNot(contains('_deltaDigest_')));
    expect(fetch, contains('_deltaChunkName_'));
  });

  test('mobile persists and resumes the immutable snapshot id', () {
    final repository = File('lib/db/repositories/delta_sync_repository.dart').readAsStringSync();
    final database = File('lib/db/app_database.dart').readAsStringSync();
    expect(repository, contains("'cmd': 'snapshotCreate'"));
    expect(repository, contains("'cmd': 'snapshotManifest'"));
    expect(repository, contains("'cmd': 'snapshotFetch'"));
    expect(repository, contains("'snapshotId': snapshotId"));
    expect(repository, contains('names.containsAll(datasetNames)'));
    expect(database, contains('snapshot_id TEXT NOT NULL DEFAULT'));
    expect(database, contains('ALTER TABLE sync_download_checkpoint ADD COLUMN snapshot_id'));
  });

  test('expired snapshots are cleared and retried once', () {
    final source = File('lib/db/repositories/delta_sync_repository.dart').readAsStringSync();
    expect(source, contains('on _SnapshotExpired'));
    expect(source, contains('_clearExpiredSnapshots'));
    expect(source, contains('allowResume: false'));
  });
}
