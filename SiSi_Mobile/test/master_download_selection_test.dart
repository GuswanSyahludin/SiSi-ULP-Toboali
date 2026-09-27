import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('master download UI provides selectable groups and one queued action',
      () {
    final source =
        File('lib/widgets/sync_section_pengaturan.dart').readAsStringSync();
    expect(source, contains('Checkbox('));
    expect(source, contains('_selectedModules'));
    expect(source, contains('_teamName'));
    expect(source, contains('_moduleKeys'));
    expect(source, contains('startModulesSync(_selectedModules)'));
    expect(source, contains('Tersinkron'));
    expect(source, contains('Database berhasil di-download'));
    expect(source, contains('_expanded'));
    expect(source, contains('Download'));
  });
}
