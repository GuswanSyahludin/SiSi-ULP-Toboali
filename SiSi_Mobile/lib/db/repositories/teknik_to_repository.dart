import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../services/api_service.dart';

class TeknikToRepository {
  Future<Map<String, dynamic>> _send(String token, Map<String, dynamic> payload) async {
    final response = await http.post(
      Uri.parse('${ApiService.baseUrl}?mobile=1'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'action':'getMasterGarduMobile','token':token,'ulp':'TEKNIK_TO:${jsonEncode(payload)}'}),
    ).timeout(const Duration(seconds: 45));
    return Map<String, dynamic>.from(jsonDecode(response.body));
  }
  Future<List<Map<String, dynamic>>> list(String token, String mode) async {
    final res=await _send(token,{'cmd':'list','mode':mode});
    if(res['success']!=true)throw Exception(res['message']??'Gagal memuat TO.');
    return List.from(res['list']??const []).map((e)=>Map<String,dynamic>.from(e as Map)).toList();
  }
  Future<List<String>> teams(String token,String current) async {
    final res=await _send(token,{'cmd':'teams','current':current});
    if(res['success']!=true)throw Exception(res['message']??'Gagal memuat tim.');
    return List<String>.from(res['list']??const []);
  }
  Future<void> assign({required String token,required String mode,required String kode,required String tim,String catatan=''}) async {
    final res=await _send(token,{'cmd':'assign','mode':mode,'kodePekerjaan':kode,'timEksekusi':tim,'catatan':catatan});
    if(res['success']!=true)throw Exception(res['message']??'Gagal menyimpan penugasan.');
  }
}
