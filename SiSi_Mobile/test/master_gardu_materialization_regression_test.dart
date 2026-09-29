import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('master materialization preserves pending Gardu edits', () {
    final source =
        File('lib/db/daos/master_gardu_dao.dart').readAsStringSync();

    expect(source, contains('final pending = await antrean();'));
    expect(source, contains('pendingGardus'));
    expect(source, contains('_replayPatch(row)'));
    expect(source, contains('if (!incomingGardus.contains(row.gardu)'));
    expect(source, contains('!pendingGardus.contains(row.gardu)'));
    expect(source, isNot(contains('delete(masterGardus).go()')));
    expect(source, contains('UPDATE master_gardu SET'));
  });

  test('pending rows are protected when absent from a new snapshot', () {
    final source =
        File('lib/db/daos/master_gardu_dao.dart').readAsStringSync();
    expect(source, contains('!incomingGardus.contains(row.gardu)'));
    expect(source, contains('!pendingGardus.contains(row.gardu)'));
  });
}
