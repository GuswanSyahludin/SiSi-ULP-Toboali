import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_service.dart';

class GangguanBerandaService {
  static Future<Map<String,dynamic>> load({required String token,required String from,required String to,String ulp=''}) async {
    final uri=Uri.parse(ApiService.baseUrl).replace(queryParameters:{'mobile':'1','action':'getMobileGangguanBeranda','token':token,'from':from,'to':to,'ulp':ulp});
    final res=await http.get(uri).timeout(const Duration(seconds:45));
    try { final data=jsonDecode(res.body); if(data is Map)return Map<String,dynamic>.from(data); } catch(_) {}
    return {'ok':false,'message':'Data gangguan gagal dibaca (HTTP ${res.statusCode}).'};
  }
}
