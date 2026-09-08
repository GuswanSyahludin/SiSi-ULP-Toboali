import 'dart:convert';

import '../../services/api_service.dart';
import '../../services/apps_script_http.dart' as http;
import 'delta_sync_repository.dart';

class TemuanMapPoint {
  final String kode, ulp, tanggal, tim, objek, penyulang, section, nomorTiang;
  final String tier, temuan, deskripsi, status, timEksekusi, fotoUrl;
  final double latitude, longitude;
  const TemuanMapPoint({required this.kode,required this.ulp,required this.tanggal,required this.tim,required this.objek,required this.penyulang,required this.section,required this.nomorTiang,required this.tier,required this.temuan,required this.deskripsi,required this.status,required this.timEksekusi,required this.fotoUrl,required this.latitude,required this.longitude});

  static TemuanMapPoint? fromRow(dynamic raw) {
    if (raw is! List || raw.length < 27) return null;
    String at(int i) => i < raw.length ? '${raw[i] ?? ''}'.trim() : '';
    double? number(int i) => double.tryParse(at(i).replaceAll(',', '.'));
    var lat=number(22),lng=number(23);
    if(lat==null||lng==null){final parts=at(21).split(',');if(parts.length>=2){lat??=double.tryParse(parts[0].trim());lng??=double.tryParse(parts[1].trim());}}
    if(lat==null||lng==null||lat< -11||lat>6||lng<95||lng>141)return null;
    final code=at(3);if(code.isEmpty)return null;
    return TemuanMapPoint(kode:code,ulp:at(4),tanggal:at(6),tim:at(7),objek:at(8),penyulang:at(9),section:at(10),nomorTiang:at(12),tier:at(14),temuan:at(15),fotoUrl:at(17),deskripsi:at(20),status:at(26),timEksekusi:at(29),latitude:lat,longitude:lng);
  }
}

class TemuanMapRepository {
  final DeltaSyncRepository _delta=DeltaSyncRepository();
  Future<List<TemuanMapPoint>> load({required String ulp,bool allUlp=false})async{final raw=await _delta.rows('db_INS_Temuan');final seen=<String>{},out=<TemuanMapPoint>[];for(final row in raw){final point=TemuanMapPoint.fromRow(row);if(point==null)continue;if(!allUlp&&ulp.trim().isNotEmpty&&point.ulp.trim().toLowerCase()!=ulp.trim().toLowerCase())continue;if(seen.add(point.kode))out.add(point);}out.sort((a,b)=>b.tanggal.compareTo(a.tanggal));return out;}

  Future<Map<String,dynamic>> _call(String token,Map<String,dynamic> payload)async{final response=await http.post(Uri.parse('${ApiService.baseUrl}?mobile=1'),headers:const{'Content-Type':'application/json'},body:jsonEncode({'action':'getMasterGarduMobile','token':token,'ulp':'TEMUAN_MAP:${jsonEncode(payload)}'})).timeout(const Duration(seconds:45));final decoded=jsonDecode(response.body);if(decoded is! Map)throw Exception('Respons Peta Temuan tidak valid.');return Map<String,dynamic>.from(decoded);}
  Future<List<String>> teams({required String token,required String ulp})async{final result=await _call(token,{'cmd':'teams','ulp':ulp});if(result['success']!=true)throw Exception(result['message']??'Daftar tim tidak tersedia.');return List<String>.from(result['list']??const[]);}
  Future<String> forward({required String token,required String code,required String team})async{final result=await _call(token,{'cmd':'forward','kodePekerjaan':code,'timEksekusi':team});if(result['success']!=true)throw Exception(result['message']??'Penerusan temuan gagal.');return '${result['message']}';}
}
