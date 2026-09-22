import 'package:flutter_test/flutter_test.dart';
import 'package:sisi_mobile/services/p0_sync_action.dart';

void main() {
  test('formats successful inline sync result', () {
    expect(
      P0SyncAction.message({'ok': true, 'terkirim': 2}),
      '2 perubahan P0 berhasil disinkronkan.',
    );
  });

  test('formats empty and failed inline sync results', () {
    expect(
      P0SyncAction.message({'ok': true, 'terkirim': 0}),
      'Tidak ada perubahan P0 yang menunggu.',
    );
    expect(
      P0SyncAction.message({'ok': false, 'message': 'Koneksi gagal.'}),
      'Koneksi gagal.',
    );
  });
}
