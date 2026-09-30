import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../lib/db/db_provider.dart';
import '../lib/services/sesi_store.dart';

void main() {
  test('worker names differ between account namespaces', () {
    final alice = {'username': 'alice', 'ulp': 'ULP Toboali'};
    final bob = {'username': 'bob', 'ulp': 'ULP Toboali'};

    expect(SesiStore.periodicWorkerName(alice), isNot(SesiStore.periodicWorkerName(bob)));
    expect(SesiStore.manualWorkerName(alice), isNot(SesiStore.manualWorkerName(bob)));
    expect(SesiStore.periodicWorkerName(alice), contains(DbProvider.databaseNameForSession(alice)));
  });

  test('worker registration and progress storage are account scoped', () {
    final autoSync = File('lib/services/auto_sync_service.dart').readAsStringSync();
    final progress = File('lib/services/sync_progress_service.dart').readAsStringSync();
    final session = File('lib/services/sesi_store.dart').readAsStringSync();

    expect(autoSync, contains('SesiStore.periodicWorkerName(session)'));
    expect(autoSync, contains('SesiStore.manualWorkerName(session)'));
    expect(autoSync, contains("data?[_accountKey]?.toString() != _account(sesi)"));
    expect(progress, contains('DbProvider.activeDatabaseName'));
    expect(progress, contains('DbProvider.scopedKey'));
    expect(session, contains('cancelByUniqueName(periodicWorkerName(session))'));
    expect(session, contains('cancelByUniqueName(manualWorkerName(session))'));
  });
}
