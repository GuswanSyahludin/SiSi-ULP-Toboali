import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('master sync entry points share a SQLite lease', () {
    final source =
        File('lib/db/repositories/sync_repository.dart').readAsStringSync();
    expect(source, contains('master_sync_lease_v1'));
    expect(source, contains('INSERT OR IGNORE INTO master_sync_lease_v1'));
    expect(source, contains('_ambilLeaseMaster(lease)'));
    expect(source, contains('_lepasLeaseMaster(lease)'));
  });
  test('an incomplete snapshot staging area is never promoted', () {
    final source = File('lib/db/repositories/delta_sync_repository.dart')
        .readAsStringSync();
    final rejected = source.indexOf('if (offset != total)'),
        promoted =
            source.indexOf('DELETE FROM local_dataset_rows WHERE dataset=?');
    expect(rejected, greaterThan(0));
    expect(promoted, greaterThan(rejected));
    expect(source, contains('Download snapshot tidak lengkap'));
  });
  test('stale Jadwal Padam responses cannot overwrite newer filters', () {
    final source =
        File('lib/screens/jadwal_padam_screen.dart').readAsStringSync();
    expect(source, contains('int _loadRevision = 0'));
    expect(source, contains('final revision = ++_loadRevision'));
    expect(source, contains('revision != _loadRevision'));
    expect(source, contains('_loadRevision++'));
  });
  test('Gardu outbox has a cross-isolate lease and preserves newer edits', () {
    final repository = File('lib/db/repositories/gardu_sync_repository.dart')
            .readAsStringSync(),
        dao = File('lib/db/daos/master_gardu_dao.dart').readAsStringSync();
    expect(repository, contains('gardu_sync_lease_v1'));
    expect(repository, contains('INSERT OR IGNORE INTO gardu_sync_lease_v1'));
    expect(repository, contains('await _lepasLease(owner)'));
    expect(dao, contains('t.diubahPada.equals(diubahPada)'));
  });
}
