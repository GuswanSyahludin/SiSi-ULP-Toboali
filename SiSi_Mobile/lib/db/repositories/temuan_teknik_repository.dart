import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../services/api_service.dart';

class TemuanTeknikRepository {
  Future<Map<String, dynamic>> simpan({
    required String token,
    required String objekInspeksi,
    required String penyulang,
    required String section,
    required String tier,
    required String temuan,
    required String koordinat,
    required File fotoTemuan,
    required File fotoTiangAtauGardu,
    String segmen = '',
    String nomorTiang = '',
    String nomorGardu = '',
    String deskripsi = '',
  }) async {
    final payload = <String, dynamic>{
      'objekInspeksi': objekInspeksi,
      'penyulang': penyulang,
      'section': section,
      'segmen': segmen,
      'nomorTiang': nomorTiang,
      'nomorGardu': nomorGardu,
      'tier': tier,
      'temuan': temuan,
      'koordinat': koordinat,
      'deskripsi': deskripsi,
      'fotoTemuanB64': base64Encode(await fotoTemuan.readAsBytes()),
      'fotoTemuanMime': 'image/jpeg',
      'fotoTiangB64': base64Encode(await fotoTiangAtauGardu.readAsBytes()),
      'fotoTiangMime': 'image/jpeg',
    };
    final response = await http
        .post(
          Uri.parse('${ApiService.baseUrl}?mobile=1'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'action': 'getMasterGarduMobile',
            'token': token,
            'ulp': 'TEMUAN_TEKNIK:${jsonEncode(payload)}',
          }),
        )
        .timeout(const Duration(seconds: 90));
    final result = Map<String, dynamic>.from(jsonDecode(response.body));
    if (result['success'] != true) {
      throw Exception(result['message'] ?? 'Gagal menyimpan temuan.');
    }
    return result;
  }
}
