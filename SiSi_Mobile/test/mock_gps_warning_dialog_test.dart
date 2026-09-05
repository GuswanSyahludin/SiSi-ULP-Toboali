import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../lib/widgets/mock_gps_warning_dialog.dart';
import '../lib/services/accurate_location_service.dart';

void main() {
  test('mock locations have a distinct error with exact requested message', () {
    const error = MockLocationException();
    expect(error, isA<AccurateLocationException>());
    expect(error.toString(), 'Silahkan Matikan Aplikasi Pihak Ke-3 GPS');
    expect(const AccurateLocationException('Izin lokasi ditolak.'), isNot(isA<MockLocationException>()));
  });

  testWidgets('warning shows cross, exact copy, and explicit dismiss action', (tester) async {
    await tester.pumpWidget(MaterialApp(home: Builder(builder: (context) {
      return Scaffold(body: TextButton(
        onPressed: () { MockGpsWarningDialog.show(context); },
        child: const Text('Ambil GPS'),
      ));
    })));
    await tester.tap(find.text('Ambil GPS'));
    await tester.pumpAndSettle();
    expect(find.text('Silahkan Matikan Aplikasi Pihak Ke-3 GPS'), findsOneWidget);
    expect(find.byIcon(Icons.cancel_outlined), findsOneWidget);
    expect(find.text('Lokasi dari percobaan ini tidak digunakan.'), findsOneWidget);
    await tester.tap(find.text('Mengerti'));
    await tester.pumpAndSettle();
    expect(find.byType(MockGpsWarningDialog), findsNothing);
  });

  testWidgets('concurrent warnings share one dialog and allow a later attempt', (tester) async {
    late BuildContext screenContext;
    await tester.pumpWidget(MaterialApp(home: Builder(builder: (context) {
      screenContext = context;
      return const Scaffold(body: Text('GPS'));
    })));
    final first = MockGpsWarningDialog.show(screenContext);
    final second = MockGpsWarningDialog.show(screenContext);
    expect(identical(first, second), isTrue);
    await tester.pumpAndSettle();
    expect(find.byType(MockGpsWarningDialog), findsOneWidget);
    await tester.tap(find.byTooltip('Tutup peringatan'));
    await tester.pumpAndSettle();
    await first;
    final third = MockGpsWarningDialog.show(screenContext);
    await tester.pumpAndSettle();
    expect(find.byType(MockGpsWarningDialog), findsOneWidget);
    await tester.tap(find.text('Mengerti'));
    await tester.pumpAndSettle();
    await third;
  });
}
