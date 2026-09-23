import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('module sync is scheduled as constrained one-off work', () {
    final source =
        File('lib/services/auto_sync_service.dart').readAsStringSync();
    expect(source, contains('registerOneOffTask'));
    expect(source, contains('NetworkType.connected'));
    expect(source, contains('manualSyncPending'));
    expect(source, contains('ExistingWorkPolicy.keep'));
    expect(source, contains("final inputData = {'module': module};"));
    expect(source, contains('inputData[_accountKey]'));
    expect(source, contains('manualSyncModules'));
    expect(source, contains('ForegroundServiceConfig'));
  });

  test('download pages are checkpointed before the next request', () {
    final source = File('lib/db/repositories/delta_sync_repository.dart')
        .readAsStringSync();
    expect(source, contains('sync_download_checkpoint'));
    expect(source, contains('sync_download_staging'));
    expect(source, contains('downloaded_rows'));
    expect(
      RegExp(r'''["']offset["']\s*:\s*offset''').hasMatch(source),
      isTrue,
    );
  });

  test(
      'empty or oversized pages stop instead of making an endless request loop',
      () {
    final source = File('lib/db/repositories/delta_sync_repository.dart')
        .readAsStringSync();
    expect(source, contains('while (offset < total)'));
    expect(source,
        contains('Server mengirim halaman kosong sebelum download selesai'));
    expect(source, contains('offset + pageRows.length > total'));
  });

  test('live mirror is replaced only after staging completes', () {
    final source = File('lib/db/repositories/delta_sync_repository.dart')
        .readAsStringSync();
    final deleteLive =
        source.indexOf('DELETE FROM local_dataset_rows WHERE dataset=?');
    final copyMatch = RegExp(
      r"INSERT INTO local_dataset_rows\(dataset,row_key,payload\) '\s*"
      r"'SELECT dataset,row_key,payload FROM sync_download_staging",
    ).firstMatch(source);
    expect(deleteLive, greaterThan(0));
    expect(copyMatch, isNotNull);
    expect(copyMatch!.start, greaterThan(deleteLive));
  });

  test('initial master data is materialized from resumable mirror', () {
    final source =
        File('lib/db/repositories/sync_repository.dart').readAsStringSync();
    expect(
      RegExp(r'''\.rows\(["']db_Penyulang["']\)''').hasMatch(source),
      isTrue,
    );
    expect(
      RegExp(r'''\.rows\(["']Master_Gardu["']\)''').hasMatch(source),
      isTrue,
    );
    expect(
      RegExp(r'''\.rows\(["']db_List_Temuan["']\)''').hasMatch(source),
      isTrue,
    );
    expect(source, isNot(contains('MasterGarduRepository().download')));
  });
}
