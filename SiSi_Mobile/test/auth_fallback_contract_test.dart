import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('device auth does not fall back to legacy endpoints', () {
    final source = File('lib/services/api_service.dart').readAsStringSync();
    expect(source, contains("_call('loginPerangkat'"));
    expect(source, contains("_call('cekPerangkat'"));
    expect(source, contains("_call('logoutPerangkat'"));
    expect(source, isNot(contains('if (_belumAdaEndpoint')));
    expect(source, isNot(contains("_call('cekSesi'")));
    expect(source, isNot(contains("_call('logout'")));
    expect(source, isNot(contains("return login(username, password)")));

    final logoutStart = source.indexOf('logoutPerangkat');
    final logoutEnd = source.indexOf('static Future<Map<String, dynamic>> login(', logoutStart);
    final logoutBlock = source.substring(logoutStart, logoutEnd);
    expect(logoutBlock, isNot(contains("'token': token")));
  });

  test('legacy session check is explicitly rejected', () {
    final source = File('lib/services/api_service.dart').readAsStringSync();
    expect(source, contains('Kontrak cekSesi legacy tidak didukung.'));
  });
}
