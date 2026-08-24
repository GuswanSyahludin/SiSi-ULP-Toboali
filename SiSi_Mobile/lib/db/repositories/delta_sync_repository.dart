import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:http/http.dart' as http;

import '../../services/api_service.dart';
import '../db_provider.dart';

class DeltaSyncResult {
  final bool ok;
  final bool initial;
  final List<String> changed;
  final String message;
  const DeltaSyncResult({required this.ok, required this.initial,
    required this.changed, required this.message});
}

/// Mirror generik seluruh dataset server. Setiap tabel server disimpan terpisah
/// sebagai row JSON sehingga schema server dapat berkembang tanpa migration Dart.
class DeltaSyncRepository {
  final db = DbProvider.instance;

  Future<Map<String, dynamic>> _send(String token, Map<String, dynamic> payload) async {
    final uri = Uri.parse('${ApiService.baseUrl}?mobile=1');
    final res = await http.post(uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'action':'getMasterGarduMobile','token':token,
        'ulp':'DELTA_SYNC:${jsonEncode(payload)}'}),
    ).timeout(const Duration(seconds: 60));
    final decoded = jsonDecode(res.body);
    if (decoded is! Map) throw Exception('Respons delta sync tidak valid.');
    final out = Map<String,dynamic>.from(decoded);
    if (out['success'] != true) throw Exception(out['message'] ?? 'Delta sync gagal.');
    return out;
  }

  Future<Map<String,String>> _versions() async {
    final rows = await db.customSelect('SELECT dataset, version FROM local_dataset_state').get();
    return {for(final row in rows) row.data['dataset'].toString():row.data['version'].toString()};
  }

  Future<bool> sudahPernah() async => (await _versions()).isNotEmpty;

  Future<DeltaSyncResult> sync(String token, {bool force = false}) async {
    final local = await _versions();
    final manifest = await _send(token, {'cmd':'manifest','force':force});
    final datasets = List.from(manifest['datasets'] ?? const []);
    final changed = <String>[];
    for (final raw in datasets) {
      final item = Map<String,dynamic>.from(raw as Map);
      final name = item['name'].toString();
      final version = item['version'].toString();
      if (!force && local[name] == version) continue;
      await _download(token, name, version, item['kind'].toString());
      changed.add(name);
    }
    return DeltaSyncResult(ok:true,initial:local.isEmpty,changed:changed,
      message:changed.isEmpty?'Tidak ada perubahan server.':'${changed.length} tabel diperbarui.');
  }

  Future<void> _download(String token,String name,String expected,String kind) async {
    var offset=0;
    final all=<dynamic>[];
    String version=expected;
    while(true){
      final page=await _send(token, {'cmd':'fetch','dataset':name,'offset':offset,'limit':500});
      version=page['version'].toString();
      all.addAll(List.from(page['rows'] ?? const []));
      if(page['hasMore']!=true)break;
      offset=all.length;
    }
    await db.transaction(() async {
      await db.customStatement('DELETE FROM local_dataset_rows WHERE dataset = ?',[name]);
      for(var i=0;i<all.length;i++){
        await db.customStatement(
          'INSERT INTO local_dataset_rows(dataset,row_key,payload) VALUES(?,?,?)',
          [name,i.toString(),jsonEncode(all[i])]);
      }
      await db.customStatement(
        'INSERT OR REPLACE INTO local_dataset_state(dataset,version,updated_at,row_count,kind) VALUES(?,?,?,?,?)',
        [name,version,DateTime.now().toIso8601String(),all.length,kind]);
    });
    if(version!=expected){
      // Dataset berubah saat dipaginasi. State menyimpan versi terbaru dan sync
      // berikutnya akan memvalidasi ulang manifest.
    }
  }

  Future<List<dynamic>> rows(String dataset) async {
    final rows=await db.customSelect(
      'SELECT payload FROM local_dataset_rows WHERE dataset=? ORDER BY CAST(row_key AS INTEGER)',
      variables:[Variable.withString(dataset)]).get();
    return rows.map((r)=>jsonDecode(r.data['payload'].toString())).toList();
  }
}
