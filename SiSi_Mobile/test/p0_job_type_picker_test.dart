import 'package:flutter_test/flutter_test.dart';
import 'package:sisi_mobile/widgets/p0_job_type_picker.dart';

void main() {
  test('deduplicates blank and case-variant master values', () {
    expect(
      P0JobTypePicker.unique([' Trafo ', 'trafo', '', 'Lain-lain']),
      ['Trafo', 'Lain-lain'],
    );
  });

  test('maps a case-variant current value to the canonical option', () {
    expect(
      P0JobTypePicker.validValue(['Penggantian Trafo'], 'penggantian trafo'),
      'Penggantian Trafo',
    );
    expect(P0JobTypePicker.validValue(['Trafo'], 'Gardu'), isNull);
  });
}
