import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../services/sesi_store.dart';
import 'delta_sync_repository.dart';

class YandalLocalRepository {
  final DeltaSyncRepository _mirror;
  YandalLocalRepository({DeltaSyncRepository? mirror}) : _mirror = mirror ?? DeltaSyncRepository();

  static const globalHeader = 'db_Global_Header';
  static const shift = 'db_Yandal_Shift';
  static const p0 = 'db_Yandal_P0';
  static const switching = 'db_Yandal_Pengecekan_Switching';
  static const pengukuranGardu = 'db_Yandal_Pengukuran_Gardu';
  static const listP0 = 'db_Yandal_List_P0';
  static const listPetugas = 'db_List_Petugas_Yandal';
  static const _draftKey = 'yandal_local_drafts_v1';
  static const _crewKey = 'yandal_shift_crew_v1';

  Future<List<List<dynamic>>> _rows(String dataset) async {
    final rows = await _mirror.rows(dataset);
    return rows.whereType<List>().map(List<dynamic>.from).toList();
  }

  String _text(List<dynamic> row, int index) =>
      index < row.length ? (row[index] ?? '').toString().trim() : '';

  String _date(List<dynamic> row, int index) {
    final value = _text(row, index);
    return value.length >= 10 ? value.substring(0, 10) : value;
  }

  bool _isShift(List<dynamic> row, int expected) {
    final value = _text(row, 7).toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
    if (value == '$expected' || value == 'shift $expected') return true;
    if (value.startsWith('shift $expected ')) return true;
    return switch (expected) {
      1 => value == 'pagi',
      2 => value == 'siang',
      3 => value == 'malam',
      _ => false,
    };
  }

  Future<List<String>> masterPekerjaan() async =>
      (await _rows(listP0))
          .map((r) => _text(r, 1))
          .where((v) => v.isNotEmpty)
          .toSet()
          .toList()
        ..sort();

  Future<List<String>> masterPetugas() async {
    final session = await SesiStore.muat();
    final ulp = (session?['ulp'] ?? '').toString().trim();
    final subTim = (session?['subTim'] ?? '').toString().trim();
    if (ulp.isEmpty || subTim.isEmpty) return const [];

    final rows = await _rows(listPetugas);
    final out = <String>{};
    for (final row in rows) {
      if (_text(row, 1).toLowerCase() != ulp.toLowerCase()) continue;
      if (_text(row, 2).toLowerCase() != subTim.toLowerCase()) continue;
      final person = _text(row, 3);
      if (person.isNotEmpty) out.add(person);
    }
    return out.toList()..sort();
  }

  Future<void> saveCrew(String shiftKey, List<String> crew) async {
    final p = await SharedPreferences.getInstance();
    await p.setString('$_crewKey:$shiftKey', jsonEncode(crew));
  }

  Future<List<String>> loadCrew(String shiftKey) async {
    final p = await SharedPreferences.getInstance();
    return List<String>.from(jsonDecode(p.getString('$_crewKey:$shiftKey') ?? '[]'));
  }

  Future<List<Map<String, dynamic>>> drafts(String shiftKey) async {
    final p = await SharedPreferences.getInstance();
    final all = List.from(jsonDecode(p.getString(_draftKey) ?? '[]'));
    final localDrafts = all
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .where((e) => e['shiftKey'] == shiftKey)
        .toList();
    final parts = shiftKey.split('|');
    if (parts.length != 4) return localDrafts;
    final ulp = parts[0].trim();
    final subTim = parts[1].trim();
    final tanggal = parts[2].trim();
    final shiftNumber = int.tryParse(parts[3]);
    if (ulp.isEmpty || subTim.isEmpty || tanggal.isEmpty ||
        shiftNumber == null || shiftNumber < 1 || shiftNumber > 3) {
      return localDrafts;
    }

    final headers = await _rows(globalHeader);
    final headerCodes = headers.where((row) =>
        _text(row, 2).toLowerCase() == ulp.toLowerCase() &&
        _text(row, 6).toLowerCase() == subTim.toLowerCase() &&
        _date(row, 4) == tanggal)
        .map((row) => _text(row, 1))
        .where((code) => code.isNotEmpty)
        .toSet();
    if (headerCodes.isEmpty) return localDrafts;

    final shifts = await _rows(shift);
    final shiftCodes = shifts.where((row) =>
        headerCodes.contains(_text(row, 1)) &&
        _text(row, 5).toLowerCase() == ulp.toLowerCase() &&
        _date(row, 4) == tanggal &&
        _isShift(row, shiftNumber))
        .map((row) => _text(row, 2))
        .where((code) => code.isNotEmpty)
        .toSet();
    if (shiftCodes.isEmpty) return localDrafts;

    final synced = <Map<String, dynamic>>[];
    final seenCodes = <String>{};
    for (final row in await _rows(p0)) {
      final kodeShift = _text(row, 2);
      final kodeP0 = _text(row, 3);
      if (!shiftCodes.contains(kodeShift) || kodeP0.isEmpty ||
          !seenCodes.add(kodeP0) ||
          _text(row, 4).toLowerCase() != ulp.toLowerCase() ||
          _date(row, 6) != tanggal) {
        continue;
      }
      final hasWorkPhoto = _text(row, 28).isNotEmpty;
      final hasDonePhoto = _text(row, 33).isNotEmpty;
      synced.add({
        'localId': 'SERVER-P0-$kodeP0',
        'shiftKey': shiftKey,
        'kodeP0': kodeP0,
        'pekerjaan': _text(row, 7).isNotEmpty
            ? _text(row, 7)
            : (_text(row, 8).isNotEmpty ? _text(row, 8) : 'Pekerjaan P0'),
        'penyulang': _text(row, 9),
        'section': _text(row, 10),
        'daerah': _text(row, 11),
        // Non-null empty sentinels let the existing card show accurate progress
        // while keeping remote Drive paths out of the local-file photo viewer.
        'fotoPekerjaan': hasWorkPhoto ? '' : null,
        'fotoSelesai': hasDonePhoto ? '' : null,
        'petugas': _text(row, 21),
        'synced': true,
      });
    }
    return [...localDrafts, ...synced];
  }

  Future<void> saveDraft(Map<String, dynamic> draft) async {
    final p = await SharedPreferences.getInstance();
    final all = List.from(jsonDecode(p.getString(_draftKey) ?? '[]'));
    final id = draft['localId'];
    all.removeWhere((e) => e is Map && e['localId'] == id);
    all.add(draft);
    await p.setString(_draftKey, jsonEncode(all));
  }

  Future<List<List<dynamic>>> shifts({String? kodeHeader}) async {
    final rows = await _rows(shift);
    return kodeHeader == null || kodeHeader.isEmpty
        ? rows
        : rows.where((r) => _text(r, 1) == kodeHeader).toList();
  }

  Future<List<List<dynamic>>> daftarP0({String? kodeShift}) async {
    final rows = await _rows(p0);
    return kodeShift == null || kodeShift.isEmpty
        ? rows
        : rows.where((r) => _text(r, 2) == kodeShift).toList();
  }

  Future<List<List<dynamic>>> switchingByP0(String kodeP0) async =>
      (await _rows(switching)).where((r) => _text(r, 3) == kodeP0).toList();

  Future<List<List<dynamic>>> pengukuranGarduByP0(String kodeP0) async =>
      (await _rows(pengukuranGardu)).where((r) => _text(r, 3) == kodeP0).toList();
}