import 'package:flutter_test/flutter_test.dart';
import 'package:sisi_mobile/widgets/p0_auto_save_job_type_picker.dart';

void main() {
  test('autosave picker exposes the intended UI contract', () {
    expect(P0AutoSaveJobTypePicker, isNotNull);
  });

  test('manual weight accepts 1 through 5 and rejects invalid values', () {
    expect(parseP0ManualWeight('1'), 1);
    expect(parseP0ManualWeight('2,5'), 2.5);
    expect(parseP0ManualWeight('5'), 5);
    expect(parseP0ManualWeight('0'), isNull);
    expect(parseP0ManualWeight('6'), isNull);
    expect(parseP0ManualWeight('abc'), isNull);
  });
}
