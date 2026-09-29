import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('master materialization preserves pending Gardu edits', () {
    final source =
        File('lib/db/daos/master_gardu_dao.dart').readAsStringSync();

    expect(source, contains('final pending = await antrean(includeConflict: true);'));
    expect(source, contains('final pendingKeys ='));
    expect(source, contains('final incomingKeys ='));
    expect(source, contains('_replayPatch(row)'));
    expect(source, contains('!incomingKeys.contains(_key(row.ulp, row.gardu))'));
    expect(source, contains('!pendingKeys.contains(_key(row.ulp, row.gardu))'));
    expect(source, contains('if (inScope &&'));
    expect(source, isNot(contains('delete(masterGardus).go()')));
    expect(source, contains('UPDATE master_gardu SET'));
    expect(source, contains('WHERE ulp = ? AND gardu = ?'));
  });

  test('pending rows are protected when absent from a new snapshot', () {
    final source =
        File('lib/db/daos/master_gardu_dao.dart').readAsStringSync();

    expect(source, contains('final pending = await antrean(includeConflict: true);'));
    expect(source, contains('final pendingKeys ='));
    expect(source, contains('final incomingKeys ='));
    expect(source, contains('!incomingKeys.contains(_key(row.ulp, row.gardu))'));
    expect(source, contains('!pendingKeys.contains(_key(row.ulp, row.gardu))'));
    expect(source, contains('!pendingKeys.contains'));
  });
}
