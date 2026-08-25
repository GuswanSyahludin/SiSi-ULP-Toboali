import 'dart:convert';
import 'package:http/http.dart' as http;

class EngineUsageItem {
  final String service;
  final int count;
  final int budget;
  final double ratio;
  final int level;
  final int maxBodyBytes;
  final String day;
  final String scope;
  const EngineUsageItem({required this.service,required this.count,required this.budget,
    required this.ratio,required this.level,required this.maxBodyBytes,required this.day,required this.scope});
  factory EngineUsageItem.fromJson(Map<String,dynamic> j)=>EngineUsageItem(
    service:'${j['service']??''}',count:(j['count'] as num?)?.toInt()??0,
    budget:(j['budget'] as num?)?.toInt()??2000,ratio:(j['ratio'] as num?)?.toDouble()??0,
    level:(j['level'] as num?)?.toInt()??0,maxBodyBytes:(j['maxBodyBytes'] as num?)?.toInt()??15000000,
    day:'${j['day']??''}',scope:'${j['scope']??'instance'}');
}
class EngineUsageRepository {
  static const urls={
    'wm-engine':'https://wm-engine-1011716929576.asia-southeast2.run.app/guard/status',
    'ba-pdf-engine':'https://ba-pdf-engine-1011716929576.asia-southeast2.run.app/guard/status',
    'row-pdf-engine':'https://row-pdf-engine-1011716929576.asia-southeast2.run.app/guard/status',
  };
  Future<List<EngineUsageItem>> load() async {
    final out=<EngineUsageItem>[];
    for(final entry in urls.entries){
      try{
        final r=await http.get(Uri.parse(entry.value),headers:{'Cache-Control':'no-cache'}).timeout(const Duration(seconds:20));
        if(r.statusCode!=200)throw Exception('HTTP ${r.statusCode}');
        final j=Map<String,dynamic>.from(jsonDecode(r.body) as Map);
        out.add(EngineUsageItem.fromJson(j));
      }catch(e){throw Exception('${entry.key} tidak dapat dibaca: $e');}
    }
    return out;
  }
}
