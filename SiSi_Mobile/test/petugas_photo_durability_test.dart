import 'package:flutter_test/flutter_test.dart';
import '../lib/services/petugas_photo_store.dart';

void main() {
  test('outbox record is pending, account-scoped, and hash-bound', () {
    final record = PetugasPhotoStore.outboxRecord(
      owner: 'petugas|Toboali',
      path: '/private/abc/original.jpg',
      metadata: {'originalSha256': 'abc123', 'team': 'yandal', 'code': ''},
    );
    expect(record['state'], 'pending');
    expect(record['owner'], 'petugas|Toboali');
    expect(record['path'], '/private/abc/original.jpg');
    expect(record['id'], PetugasPhotoStore.outboxId('/private/abc/original.jpg', 'abc123'));
    expect(record['metadata']['team'], 'yandal');
  });

  test('outbox identity changes when the original path or checksum changes', () {
    expect(
      PetugasPhotoStore.outboxId('/private/a/original.jpg', 'hash-a'),
      isNot(PetugasPhotoStore.outboxId('/private/b/original.jpg', 'hash-a')),
    );
    expect(
      PetugasPhotoStore.outboxId('/private/a/original.jpg', 'hash-a'),
      isNot(PetugasPhotoStore.outboxId('/private/a/original.jpg', 'hash-b')),
    );
  });
}
