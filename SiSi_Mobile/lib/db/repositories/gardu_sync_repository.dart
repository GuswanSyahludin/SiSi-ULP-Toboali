import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../services/api_service.dart';
import '../db_provider.dart';

class GarduSyncRepository {
  Future<Map<String,dynamic>> kirim(String token) async {
    final dao=DbProvider.instance.masterGarduDao;
    final list=await dao.antrean();
    var ok=0,gagal=0;
    for(final o in list){
      try{
        final gateway='UPDATE:${o.perubahanJson}|${o.gardu}|${o.ulp}';
        final uri=Uri.parse('${ApiService.baseUrl}?mobile=1&action=getMasterGarduMobile'
          '&token=${Uri.encodeComponent(token)}&ulp=${Uri.encodeComponent(gateway)}');
        final r=await http.get(uri).timeout(const Duration(seconds:45));
        final res=Map<String,dynamic>.from(jsonDecode(r.body));
        if(res['success']==true){await dao.hapusAntrean(o.gardu);ok++;}
        else{gagal++;await dao.tandaiGagal(o.gardu,o.percobaan+1,(res['message']??'Ditolak server').toString());}
      }catch(_){gagal++;await dao.tandaiGagal(o.gardu,o.percobaan+1,'timeout/jaringan');}
    }
    return {'ok':gagal==0,'terkirim':ok,'gagal':gagal,
      'message':gagal==0?'$ok perubahan Gardu tersinkron.':'$ok terkirim, $gagal gagal.'};
  }
}
