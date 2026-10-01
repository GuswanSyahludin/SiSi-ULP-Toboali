import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../lib/services/sync_progress_service.dart';
import '../lib/widgets/sync_section_pengaturan.dart';

void main() {
  const downloading = SyncProgressState(
    running: true, module: 'yandal', dataset: 'db_Yandal_P0',
    transferredRows: 300, totalRows: 900,
    datasetTransferredRows: 50, datasetTotalRows: 650,
  );
  final at = DateTime.utc(2026, 10, 1, 1);

  test('failure records timestamp, phase, dataset and counters before reset', () {
    final log = SyncFailureLog.capture(
      progress: downloading, error: TimeoutException('secret-token'),
      phase: 'download_snapshot', now: at,
      stackTrace: StackTrace.fromString(
          '#0 DeltaSyncRepository._send (package:sisi/db/repositories/delta_sync_repository.dart:99:5)'),
    );
    final failed = downloading.withFailure(log);
    expect(failed.failed, isTrue);
    expect(failed.running, isFalse);
    expect(failed.dataset, 'db_Yandal_P0');
    expect(failed.datasetTransferredRows, 50);
    expect(log.code, 'TIMEOUT');
    expect(log.occurredAt, at);
    expect(log.phase, 'download_snapshot');
    expect(log.text, contains('300/900'));
    expect(log.text, contains('delta_sync_repository.dart:99:5'));
    expect(log.text, isNot(contains('secret-token')));
  });

  test('serialized failure round-trips across background/UI restoration', () {
    final state = downloading.withFailure(SyncFailureLog.capture(
        progress: downloading, code: 'MASTER_LEASE_BUSY', phase: 'master_lease',
        now: at, leaseExpiresAt: at.add(const Duration(minutes: 31))));
    final restored = SyncProgressState.fromJson(
        Map<String, dynamic>.from(jsonDecode(jsonEncode(state.toJson())) as Map));
    expect(restored.failureLog!.text, state.failureLog!.text);
    expect(restored.failureLog!.text, contains('2026-10-01T01:31:00.000Z'));
    expect(restored.failureLog!.text, contains('bukan bukti proses masih aktif'));
    expect(restored.transferredRows, 300);
  });

  test('legacy failure does not invent time, stack, or lease expiry', () {
    final legacy = SyncProgressState.fromJson({
      'failed': true, 'module': 'yandal',
      'message': 'Sinkron data sedang berjalan di proses lain.',
    });
    final log = syncFailureLogFor(legacy);
    expect(log.code, 'MASTER_LEASE_BUSY');
    expect(log.occurredAt, isNull);
    expect(log.leaseExpiresAt, isNull);
    expect(log.text, contains('Tidak terekam (kegagalan lama)'));
  });

  test('secrets and raw response data never reach persisted/copied diagnostics', () {
    const secret = 'TOP_SECRET_123';
    final log = SyncFailureLog.capture(
      progress: const SyncProgressState(module: secret, dataset: secret),
      error: Exception('token=$secret password=$secret Bearer $secret '
          'https://example.com/$secret?token=$secret {"rows":["$secret"]}'),
      phase: secret, now: at,
      stackTrace: StackTrace.fromString('https://example.com/$secret\n'
          '/data/accounts/$secret/database.db\n'
          '#0 fn (package:sisi/db/repositories/sync_repository.dart:10:2)'),
    );
    expect(log.code, 'UNKNOWN');
    expect(log.module, isNull);
    expect(log.dataset, isNull);
    expect(jsonEncode(log.toJson()), isNot(contains(secret)));
    expect(log.text, isNot(contains(secret)));
    expect(log.locations, ['package:sisi/db/repositories/sync_repository.dart:10:2']);
    final restored = SyncFailureLog.fromJson({
      ...log.toJson(), 'message': secret, 'code': secret, 'module': secret,
      'dataset': secret, 'phase': secret, 'occurredAt': secret,
      'locations': [secret, 'https://example.com/$secret'],
    });
    expect(restored.text, isNot(contains(secret)));
  });

  test('known transport failures get safe diagnostic codes', () {
    for (final entry in {
      'SocketException: Failed host lookup': 'NETWORK',
      'Server tidak mengirim respons setelah 2 percobaan': 'INVALID_RESPONSE',
      'Respons sinkronisasi tidak valid.': 'INVALID_RESPONSE',
      'Sesi habis.': 'SESSION',
      'Snapshot batch parsial': 'SNAPSHOT',
      'Server mengirim halaman kosong': 'EMPTY_PAGE',
      'SqliteException database is locked': 'LOCAL_DATABASE',
    }.entries) {
      expect(SyncFailureLog.capture(progress: downloading, error: entry.key).code,
          entry.value);
    }
  });

  test('diagnostics are bounded even if stored counters or stack are malformed', () {
    final log = SyncFailureLog.fromJson({
      'transferredRows': -1, 'totalRows': double.infinity,
      'locations': List.filled(100, 'package:sisi/main.dart:10:2'),
    });
    expect(log.transferredRows, 0);
    expect(log.totalRows, 0);
    expect(log.locations.length, 8);
  });

  test('both sync paths capture exceptions and lease expiry without removing locks', () {
    final source = File('lib/db/repositories/sync_repository.dart').readAsStringSync();
    expect('code: \'MASTER_LEASE_BUSY\''.allMatches(source).length, 2);
    expect('stackTrace: stack'.allMatches(source).length, 2);
    expect(source, contains('SELECT owner, expires FROM master_sync_lease_v1'));
    expect(source, contains('Duration(hours: 1)'));
    expect(source, contains('DELETE FROM master_sync_lease_v1 WHERE id=1 AND owner=?'));
    expect(source, contains('diagnostic = progress.state.value'));
    final progress = File('lib/services/sync_progress_service.dart').readAsStringSync();
    expect(progress, contains('expectedScope != _scopedKey'));
    expect(progress, contains('if (_scopedKey != storageKey) return'));
    expect(progress, contains('_resetScope(storageKey)'));
    final widget = File('lib/widgets/sync_section_pengaturan.dart').readAsStringSync();
    expect(widget, contains('isFailed ? SyncFailureInfoButton(progress: progress)'));
  });

  testWidgets('failure info icon opens selectable log, copies and closes it', (tester) async {
    String? copied;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform, (call) async {
        if (call.method == 'Clipboard.setData') {
          copied = (call.arguments as Map)['text'] as String;
        }
        return null;
      },
    );
    addTearDown(() => tester.binding.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, null));
    final failed = downloading.withFailure(SyncFailureLog.capture(
        progress: downloading, code: 'MASTER_LEASE_BUSY',
        phase: 'master_lease', now: at));
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: Center(
        child: SyncFailureInfoButton(progress: failed)))));
    await tester.tap(find.byKey(const ValueKey('sync_failure_info')));
    await tester.pumpAndSettle();
    expect(find.text('Log gagal download'), findsOneWidget);
    expect(find.byType(SelectableText), findsOneWidget);
    await tester.tap(find.text('Salin log'));
    await tester.pumpAndSettle();
    expect(copied, failed.failureLog!.text);
    expect(find.text('Log disalin.'), findsOneWidget);
    await tester.tap(find.text('Tutup'));
    await tester.pumpAndSettle();
    expect(find.byType(AlertDialog), findsNothing);
  });
}
