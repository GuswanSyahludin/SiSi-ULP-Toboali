import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('T-08 ownership overlay is loaded after Jadwal Padam sources', () {
    final appsscript = File('../SiSi_BackEnd/appsscript.json').readAsStringSync();
    expect(appsscript, contains('Core/ZZ-T08-Jadwal-Ownership.js'));
    expect(appsscript.indexOf('Core/ZZ-T08-Jadwal-Ownership.js'), greaterThan(appsscript.indexOf('Teknik/Jadwal-Padam-Delete.js')));
  });
}
