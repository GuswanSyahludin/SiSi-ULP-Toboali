import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('master download UI provides selectable groups and one queued action',
      () {
    final source =
        File('lib/widgets/sync_section_pengaturan.dart').readAsStringSync();
    expect(source, contains('Checkbox('));
    expect(source, contains('_selectedModules'));
    expect(source, contains('Pilih semua'));
    expect(source, contains(r'Download ${_selectedModules.length} pilihan'));
    expect(source, contains('startModulesSync(_selectedModules)'));
    expect(source, contains('moduleDescriptions'));
    expect(source, contains('Terakhir disinkron pukul'));
  });
}
