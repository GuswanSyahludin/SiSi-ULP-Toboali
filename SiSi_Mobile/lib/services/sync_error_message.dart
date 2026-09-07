import 'sync_progress_service.dart';

String friendlySyncMessage(Object error) {
  var message = error.toString();
  message = message.replaceFirst(RegExp(r'^(Exception|Bad state):\s*'), '');
  for (final entry in syncDatasetLabels.entries) {
    message = message.replaceAll(entry.key, entry.value);
  }

  if (message.contains('berubah saat diunduh')) {
    final match = RegExp(r'(Master [^.]*) berubah saat diunduh').firstMatch(message);
    final label = match?.group(1) ?? 'Data master';
    return '$label diperbarui di server saat proses download. Proses akan dilanjutkan otomatis dari versi terbaru.';
  }
  if (message.contains('Failed host lookup') ||
      message.contains('SocketException') ||
      message.contains('No address associated with hostname')) {
    return 'Koneksi internet belum tersedia. Download akan dilanjutkan otomatis saat jaringan kembali.';
  }
  if (message.contains('tidak memajukan halaman')) {
    return 'Download data belum dapat dilanjutkan. Sistem akan mencoba kembali otomatis.';
  }
  if (message.contains('Server tidak mengirim respons')) {
    return 'Server belum merespons. Download akan dicoba kembali otomatis.';
  }
  return message;
}
