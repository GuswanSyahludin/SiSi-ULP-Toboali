import 'dart:convert';
import '../../services/apps_script_http.dart' as http;
import '../../services/api_service.dart';
import '../db_provider.dart';

class GarduSyncRepository {
  final _db = DbProvider.instance;

  Future<bool> _ambilLease(String owner) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await _db.transaction(() async {
      await _db.customStatement(
        'CREATE TABLE IF NOT EXISTS gardu_sync_lease_v1 '
        '(id INTEGER PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL)',
      );
      await _db.customStatement(
        'DELETE FROM gardu_sync_lease_v1 WHERE id=1 AND expires<=?',
        [now],
      );
      await _db.customStatement(
        'INSERT OR IGNORE INTO gardu_sync_lease_v1(id,owner,expires) '
        'VALUES(1,?,?)',
        [owner, now + const Duration(minutes: 10).inMilliseconds],
      );
    });
    final rows = await _db
        .customSelect('SELECT owner FROM gardu_sync_lease_v1 WHERE id=1')
        .get();
    return rows.isNotEmpty && rows.first.data['owner'] == owner;
  }

  Future<void> _lepasLease(String owner) => _db.customStatement(
        'DELETE FROM gardu_sync_lease_v1 WHERE id=1 AND owner=?',
        [owner],
      );

  Future<Map<String, dynamic>> kirim(String token) async {
    final owner = DateTime.now().microsecondsSinceEpoch.toString();
    if (!await _ambilLease(owner)) {
      return {
        'ok': true,
        'terkirim': 0,
        'gagal': 0,
        'message': 'Pengiriman perubahan Gardu sedang dilakukan proses lain.',
      };
    }
    final dao = _db.masterGarduDao;
    var ok = 0, gagal = 0;
    try {
      final list = await dao.antrean();
      for (final o in list) {
        try {
          final payload =
              Map<String, dynamic>.from(jsonDecode(o.perubahanJson));
          final r = await http
              .post(
                Uri.parse('${ApiService.baseUrl}?mobile=1'),
                headers: const {'Content-Type': 'application/json'},
                body: jsonEncode({
                  'action': 'getMasterGarduMobile',
                  'mode': 'update',
                  'token': token,
                  'payload': {
                    'gardu': o.gardu,
                    'ulp': o.ulp,
                    'data': payload,
                  },
                }),
              )
              .timeout(const Duration(seconds: 45));
          final res = Map<String, dynamic>.from(jsonDecode(r.body));
          if (res['success'] == true) {
            await dao.hapusAntrean(o.gardu, o.diubahPada);
            ok++;
          } else {
            gagal++;
            await dao.tandaiGagal(
              o.gardu,
              o.diubahPada,
              o.percobaan + 1,
              (res['message'] ?? 'Ditolak server').toString(),
            );
          }
        } catch (_) {
          gagal++;
          await dao.tandaiGagal(
            o.gardu,
            o.diubahPada,
            o.percobaan + 1,
            'timeout/jaringan',
          );
        }
      }
      return {
        'ok': gagal == 0,
        'terkirim': ok,
        'gagal': gagal,
        'message': gagal == 0
            ? '$ok perubahan Gardu tersinkron.'
            : '$ok terkirim, $gagal gagal.',
      };
    } finally {
      await _lepasLease(owner);
    }
  }
}
