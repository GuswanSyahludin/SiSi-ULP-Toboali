import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('database is configured for background sync access', () {
    final source = File('lib/db/app_database.dart').readAsStringSync();

    expect(source, contains('shareAcrossIsolates: true'));
    expect(source, contains('PRAGMA busy_timeout = 10000'));
    expect(source, contains('PRAGMA journal_mode = WAL'));
  });

  test('sync completion is persisted before its worker can finish', () {
    final source =
        File('lib/db/repositories/sync_repository.dart').readAsStringSync();

    expect(source, contains('await progress.success('));
    expect(source, contains('await progress.failure('));
  });
}
