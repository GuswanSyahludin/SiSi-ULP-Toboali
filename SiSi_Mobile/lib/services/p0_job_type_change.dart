import '../db/repositories/p0_repository.dart';

/// Single entry point for a job-type change from the Verifikasi P0 editor.
/// It persists locally first; the existing P0 queue sends it during sync.
class P0JobTypeChange {
  const P0JobTypeChange(this.repository);

  final P0Repository repository;

  Future<void> save({
    required Map<String, dynamic> item,
    required String nama,
    required String alasan,
    num? bobot,
  }) {
    return repository.catatKoreksi(
      item: item,
      nama: nama,
      alasan: alasan,
      bobot: bobot,
    );
  }
}
