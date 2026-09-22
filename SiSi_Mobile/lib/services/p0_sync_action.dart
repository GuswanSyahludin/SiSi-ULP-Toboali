import '../db/repositories/p0_repository.dart';

/// Runs the same durable correction + decision queue used by Settings,
/// without creating a second sync path.
class P0SyncAction {
  const P0SyncAction(this.repository);

  final P0Repository repository;

  Future<Map<String, dynamic>> run() => repository.kirimAntrean();

  static String message(Map<String, dynamic> result) {
    if (result['ok'] == true) {
      final sent = result['terkirim'] ?? 0;
      return sent == 0
          ? 'Tidak ada perubahan P0 yang menunggu.'
          : '$sent perubahan P0 berhasil disinkronkan.';
    }
    return (result['message'] ?? 'Sinkronisasi P0 gagal.').toString();
  }
}
