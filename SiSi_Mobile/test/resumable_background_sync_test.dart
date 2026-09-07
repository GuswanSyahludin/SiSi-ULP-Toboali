import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('manual master sync is scheduled as constrained one-off work', () {
    final source =
        File('lib/services/auto_sync_service.dart').readAsStringSync();
    expect(source, contains('registerOneOffTask'));
    expect(source, contains('NetworkType.connected'));
    expect(source, contains('manualSyncPending'));
    expect(source, contains('ExistingWorkPolicy.replace'));
  });

  test('download pages are checkpointed before the next request', () {
    final source =
        File('lib/db/repositories/delta_sync_repository.dart').readAsStringSync();
    expect(source, contains('sync_download_checkpoint'));
    expect(source, contains('sync_download_staging'));
    expect(source, contains('downloaded_rows'));
    expect(source, contains("'offset': offset"));
  });

  test('live mirror is replaced only after staging completes', () {
    final source =
        File('lib/db/repositories/delta_sync_repository.dart').readAsStringSync();
    final deleteLive = source.indexOf(
        "DELETE FROM local_dataset_rows WHERE dataset=?");
    final copyStaging = source.indexOf(
        'INSERT INTO local_dataset_rows(dataset,row_key,payload) SELECT');
    expect(deleteLive, greaterThan(0));
    expect(copyStaging, greaterThan(deleteLive));
  });

  test('initial master data is materialized from resumable mirror', () {
    final source =
        File('lib/db/repositories/sync_repository.dart').readAsStringSync();
    expect(source, contains("deltaRepo.rows('db_Penyulang')"));
    expect(source, contains("deltaRepo.rows('Master_Gardu')"));
    expect(source, contains("deltaRepo.rows('db_List_Temuan')"));
    expect(source, isNot(contains('MasterGarduRepository().download')));
  });
}
