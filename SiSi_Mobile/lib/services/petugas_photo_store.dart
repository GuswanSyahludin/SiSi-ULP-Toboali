import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';
import 'local_watermark_data.dart';
import 'photo_bytes_validator.dart';
import 'watermark_photo_export.dart';

/// Immutable original + frozen capture metadata in private Android storage.
/// Receipt binding is separate: adding an official code never overwrites GPS/time.
/// The private file-backed outbox keeps captures discoverable after cache cleanup,
/// restart, and later upload/lifecycle processing.
class PetugasPhoto {
  final String path;
  final Map<String,dynamic> metadata;
  const PetugasPhoto(this.path, this.metadata);
}
class PetugasPhotoStore {
  static const _channel = MethodChannel('id.co.ulptoboali.sisi/photo_export');
  static String owner(Map<String,dynamic> session) => '${session['username'] ?? ''}|${session['ulp'] ?? ''}'.toLowerCase();
  static String key(String value) => sha256.convert(utf8.encode(value)).toString();
  static Future<Directory> root(String owner) async {
    if (owner.split('|').first.trim().isEmpty) throw StateError('Akun petugas tidak tersedia.');
    final base = await _channel.invokeMethod<String>('privatePhotoDirectory');
    if (base == null || base.isEmpty) throw StateError('Folder privat belum tersedia. Perbarui APK.');
    return Directory('$base/${key(owner)}')..createSync(recursive:true);
  }
  static Future<File> _outboxFile(String owner) async => File('${(await root(owner)).path}/photo-outbox.jsonl');
  static String outboxId(String path, String checksum) => key('$path|$checksum');
  static Map<String,dynamic> outboxRecord({required String owner, required String path, required Map<String,dynamic> metadata, String state = 'pending', String? code}) => {
    'id': outboxId(path, '${metadata['originalSha256'] ?? ''}'), 'owner': owner, 'path': path,
    'state': state, 'code': code ?? '', 'createdAt': DateTime.now().toUtc().toIso8601String(),
    'metadata': Map<String,dynamic>.from(metadata),
  };
  static Future<void> _appendOutbox(String owner, Map<String,dynamic> record) async {
    final file = await _outboxFile(owner); await file.writeAsString('${jsonEncode(record)}\n', mode: FileMode.append, flush: true);
  }
  static Future<List<Map<String,dynamic>>> pendingOutbox(String owner) async {
    try {
      final file = await _outboxFile(owner); if (!await file.exists()) return [];
      final rows = <Map<String,dynamic>>[];
      for (final line in await file.readAsLines()) {
        if (line.trim().isEmpty) continue;
        try { final row = Map<String,dynamic>.from(jsonDecode(line) as Map); if (row['state'] == 'pending' && await File('${row['path'] ?? ''}').exists()) rows.add(row); } catch (_) {}
      }
      return rows;
    } catch (_) { return []; }
  }
  static Future<void> _markOutbox(String owner, String path, {required String state, String code = ''}) async {
    final file = await _outboxFile(owner); if (!await file.exists()) return;
    final updated = <String>[];
    for (final line in await file.readAsLines()) {
      if (line.trim().isEmpty) continue;
      try {
        final row = Map<String,dynamic>.from(jsonDecode(line) as Map);
        if (row['path'] == path) { row['state'] = state; row['code'] = code; row['updatedAt'] = DateTime.now().toUtc().toIso8601String(); }
        updated.add(jsonEncode(row));
      } catch (_) { updated.add(line); }
    }
    final temp = File('${file.path}.${DateTime.now().microsecondsSinceEpoch}.tmp');
    await temp.writeAsString('${updated.join('\n')}\n', flush: true); await temp.rename(file.path);
  }
  static Map<String,dynamic> withReceipt(Map<String,dynamic> frozen, String code) => {...frozen, 'code': code};
  static List<String> missing(Map<String,dynamic> m) => [
    ...WatermarkPhotoExport.missingIndicators(m),
    if (m['photoSource'] != 'camera') 'Foto kamera dengan waktu pengambilan tersimpan',
    if (m['originalSha256'] is! String) 'Identitas file asli',
  ];
  static Future<PetugasPhoto> saveOriginal({required String owner, required File source, required Map<String,dynamic> metadata}) async {
    final bytes = await source.readAsBytes(); PhotoBytesValidator.validateOriginal(bytes);
    final dir = await (await root(owner)).createTemp('capture-'); final extension = source.path.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    final path = '${dir.path}/original.$extension'; final m = {...metadata, 'originalSha256': sha256.convert(bytes).toString()};
    await File(path).writeAsBytes(bytes, flush: true); await File('${dir.path}/capture.json').writeAsString(jsonEncode(m), flush: true);
    await _appendOutbox(owner, outboxRecord(owner: owner, path: path, metadata: m)); return PetugasPhoto(path, Map.unmodifiable(m));
  }
  static Future<PetugasPhoto?> byPath(String owner, String path) async {
    try { final base = await root(owner); final canonical = await File(path).resolveSymbolicLinks(); final rootPath = await base.resolveSymbolicLinks(); if (!canonical.startsWith('$rootPath/')) return null; final raw = jsonDecode(await File('${File(canonical).parent.path}/capture.json').readAsString()); if (raw is! Map) return null; return PetugasPhoto(canonical, Map<String,dynamic>.from(raw)); } catch (_) { return null; }
  }
  static Future<void> bind({required String owner, required WatermarkTeam team, required String code, required String slot, required PetugasPhoto photo}) async {
    if (code.trim().isEmpty) throw StateError('Kode resmi belum diterima. Foto asli tetap tersimpan.');
    final dir = await root(owner); final ref = File('${dir.path}/ref-${key('${team.name}|$code|$slot')}.json'); final temp = File('${ref.path}.${DateTime.now().microsecondsSinceEpoch}.tmp');
    await temp.writeAsString(jsonEncode({'path': photo.path, 'metadata': withReceipt(photo.metadata, code)}), flush: true); await temp.rename(ref.path); await _markOutbox(owner, photo.path, state: 'bound', code: code);
  }
  static Future<PetugasPhoto?> find({required String owner, required WatermarkTeam team, required String code, required String slot}) async {
    try { final dir = await root(owner); final data = jsonDecode(await File('${dir.path}/ref-${key('${team.name}|$code|$slot')}.json').readAsString()); final m = Map<String,dynamic>.from(data['metadata'] as Map); if (m['code'] != code || m['team'] != team.name) return null; final original = await byPath(owner, data['path'].toString()); if (original == null) return null; return PetugasPhoto(original.path, m); } catch (_) { return null; }
  }
  static Map<String,dynamic> descriptor({required WatermarkTeam team, required String slot, required Map<String,dynamic> fields}) => {...fields, 'formatVersion': LocalWatermarkData.formatVersion, 'renderer': 'flutter-local', 'team': team.name, 'tahap': slot, 'codeLabel': team == WatermarkTeam.row ? 'Kode Eksekusi' : team == WatermarkTeam.yandal ? 'Kode P0' : 'Kode Temuan', 'code': ''};
  static LocalWatermarkData toData(Map<String,dynamic> m) => LocalWatermarkData(team: WatermarkTeam.values.firstWhere((t) => t.name == m['team']), code: m['code'].toString(), ulp: m['ulp'].toString(), capturedAt: DateTime.parse(m['capturedAt'] as String), createdAt: DateTime.parse(m['createdAt'] as String), latitude: (m['latitude'] as num).toDouble(), longitude: (m['longitude'] as num).toDouble(), accuracyMeters: (m['accuracyMeters'] as num?)?.toDouble(), isMocked: m['isMocked'] != false, penyulang: '${m['penyulang'] ?? ''}', section: '${m['section'] ?? ''}', jenisPekerjaan: '${m['jenisPekerjaan'] ?? ''}', daerah: '${m['daerah'] ?? ''}', subTim: '${m['subTim'] ?? ''}', petugas: '${m['petugas'] ?? ''}', nomorGardu: '${m['nomorGardu'] ?? ''}', segmen: '${m['segmen'] ?? ''}', temuan: '${m['temuan'] ?? ''}', tahap: '${m['tahap'] ?? ''}');
}
