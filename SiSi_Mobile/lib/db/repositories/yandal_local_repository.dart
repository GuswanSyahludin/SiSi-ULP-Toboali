import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
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
  String _text(List<dynamic> row, int index) => index < row.length ? (row[index] ?? '').toString().trim() : '';

  Future<List<String>> masterPekerjaan() async => (await _rows(listP0)).map((r) => _text(r, 1)).where((v) => v.isNotEmpty).toSet().toList()..sort();
  Future<List<String>> masterPetugas() async {
    final rows = await _rows(listPetugas);
    final out = <String>{};
    for (final row in rows) {
      for (final cell in row.skip(1)) { final v = cell.toString().trim(); if (v.isNotEmpty) out.add(v); }
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
  Future<List<Map<String,dynamic>>> drafts(String shiftKey) async {
    final p = await SharedPreferences.getInstance();
    final all = List.from(jsonDecode(p.getString(_draftKey) ?? '[]'));
    return all.whereType<Map>().map((e)=>Map<String,dynamic>.from(e)).where((e)=>e['shiftKey']==shiftKey).toList();
  }
  Future<void> saveDraft(Map<String,dynamic> draft) async {
    final p = await SharedPreferences.getInstance();
    final all = List.from(jsonDecode(p.getString(_draftKey) ?? '[]'));
    final id = draft['localId'];
    all.removeWhere((e)=>e is Map && e['localId']==id);
    all.add(draft);
    await p.setString(_draftKey,jsonEncode(all));
  }

  Future<List<List<dynamic>>> shifts({String? kodeHeader}) async { final rows=await _rows(shift); return kodeHeader==null||kodeHeader.isEmpty?rows:rows.where((r)=>_text(r,1)==kodeHeader).toList(); }
  Future<List<List<dynamic>>> daftarP0({String? kodeShift}) async { final rows=await _rows(p0); return kodeShift==null||kodeShift.isEmpty?rows:rows.where((r)=>_text(r,2)==kodeShift).toList(); }
  Future<List<List<dynamic>>> switchingByP0(String kodeP0) async => (await _rows(switching)).where((r)=>_text(r,3)==kodeP0).toList();
  Future<List<List<dynamic>>> pengukuranGarduByP0(String kodeP0) async => (await _rows(pengukuranGardu)).where((r)=>_text(r,3)==kodeP0).toList();
}
