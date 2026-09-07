import 'package:flutter_test/flutter_test.dart';
import 'package:sisi_mobile/services/sync_error_message.dart';

void main() {
  test('technical dataset name becomes friendly label', () {
    final message = friendlySyncMessage(
      Exception('Dataset db_ROW_Eksekusi berubah saat diunduh. Menjadwalkan ulang dari versi terbaru.'),
    );
    expect(message, contains('Master Realisasi Pekerjaan ROW'));
    expect(message, isNot(contains('db_ROW_Eksekusi')));
    expect(message, isNot(contains('Dataset')));
  });

  test('socket diagnostics are hidden from users', () {
    final message = friendlySyncMessage(
      Exception('SocketException: Failed host lookup: script.google.com'),
    );
    expect(message, contains('Koneksi internet belum tersedia'));
    expect(message, isNot(contains('script.google.com')));
    expect(message, isNot(contains('SocketException')));
  });
}
