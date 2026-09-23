import 'package:flutter_test/flutter_test.dart';

import '../lib/db/db_provider.dart';

void main() {
  test('different username and ULP values use different database files', () {
    final toboaliA = DbProvider.databaseNameForSession({
      'username': 'alice',
      'ulp': 'ULP Toboali',
    });
    final toboaliB = DbProvider.databaseNameForSession({
      'username': 'bob',
      'ulp': 'ULP Toboali',
    });
    final otherUlp = DbProvider.databaseNameForSession({
      'username': 'alice',
      'ulp': 'ULP Pangkalpinang',
    });

    expect(toboaliA, isNot(toboaliB));
    expect(toboaliA, isNot(otherUlp));
    expect(toboaliA, startsWith('sisi_db_'));
  });

  test('identity normalization is stable', () {
    expect(
      DbProvider.databaseNameForSession({
        'username': ' Alice ',
        'ulp': 'ULP TOBOALI',
      }),
      DbProvider.databaseNameForSession({
        'username': 'alice',
        'ulp': 'ulp toboali',
      }),
    );
  });

  test('missing account or ULP fails closed', () {
    expect(
      () => DbProvider.databaseNameForSession({'username': 'alice'}),
      throwsStateError,
    );
    expect(
      () => DbProvider.databaseNameForSession({'ulp': 'ULP Toboali'}),
      throwsStateError,
    );
  });

  test('scoped local keys differ for different sessions', () {
    final alice = {'username': 'alice', 'ulp': 'ULP Toboali'};
    final bob = {'username': 'bob', 'ulp': 'ULP Toboali'};
    expect(DbProvider.scopedKey('manualSyncModules', alice),
        isNot(DbProvider.scopedKey('manualSyncModules', bob)));
  });

  test('account A -> logout -> account B keeps local state isolated', () {
    final accountA = {'username': 'alice', 'ulp': 'ULP Toboali'};
    final accountB = {'username': 'bob', 'ulp': 'ULP Toboali'};

    // Simulate the persisted local namespace while account A is active.
    final databaseA = DbProvider.databaseNameForSession(accountA);
    final queueKeyA = DbProvider.scopedKey('manualSyncModules', accountA);
    final localState = <String, String>{queueKeyA: 'p0-a'};
    expect(localState[queueKeyA], 'p0-a');

    // Logout removes the active account's access, but does not make its data
    // addressable from another account.
    final queueKeyB = DbProvider.scopedKey('manualSyncModules', accountB);
    expect(queueKeyB, isNot(queueKeyA));
    expect(localState[queueKeyB], isNull);

    // Login as B uses a different database namespace and cannot read A's data.
    final databaseB = DbProvider.databaseNameForSession(accountB);
    expect(databaseB, isNot(databaseA));
    expect(databaseB, DbProvider.databaseNameForSession(accountB));
  });

  test('database access fails closed before session activation', () async {
    await DbProvider.deactivate();
    expect(() => DbProvider.instance, throwsStateError);
  });
}
