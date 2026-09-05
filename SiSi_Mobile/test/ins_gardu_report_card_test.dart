import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../lib/db/app_database.dart';
import '../lib/widgets/ins_gardu_report_card.dart';

InsGarduHeader header({String status = 'draft', String kode = ''}) => InsGarduHeader(
  localId: 'local-test', kodeHeader: kode, ulp: 'Toboali', hari: 'Sabtu',
  tanggal: '2026-09-05', koordinatAwal: '-2, 106', koordinatAkhir: '-2, 106',
  kmAwal: '', kmAkhir: '', kendala: '', inputBy: 'Petugas uji',
  dibuatPada: '2026-09-05T09:00:00', status: status, pesanGagal: '',
);

void main() {
  test('report dates use Indonesian day/month order', () {
    expect(InsGarduReportCard.formatDate('2026-09-05'), '05/09/2026');
    expect(InsGarduReportCard.formatDate('tanggal lama'), 'tanggal lama');
  });

  testWidgets('local card shows real fill progress and opens original detail action', (tester) async {
    var opened = 0;
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: SingleChildScrollView(child:
      InsGarduReportCard(header: header(), subTim: 'Inspeksi Gardu', total: 5, filled: 2,
        onTap: () { opened++; }, onRetry: () {}),
    ))));
    expect(find.text('Laporan Lokal'), findsOneWidget);
    expect(find.text('DRAF LOKAL'), findsOneWidget);
    expect(find.text('2 dari 5 gardu sudah diisi'), findsOneWidget);
    expect(find.text('Sabtu, 05/09/2026'), findsOneWidget);
    expect(find.text('SIAP WA'), findsNothing);
    expect(find.text('Kirim WA'), findsNothing);
    await tester.tap(find.text('Detail Laporan'));
    expect(opened, 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('loading and failed summaries do not report fake zero counts', (tester) async {
    Future<void> render({bool loading = false, String? error}) => tester.pumpWidget(
      MaterialApp(home: Scaffold(body: SingleChildScrollView(child: InsGarduReportCard(
        header: header(status: 'gagal'), subTim: 'Inspeksi Gardu', loading: loading,
        summaryError: error, onTap: () {}, onRetry: () {},
      )))),
    );
    await render(loading: true);
    expect(find.text('Memuat ringkasan gardu…'), findsOneWidget);
    expect(find.text('0 dari 0 gardu sudah diisi'), findsNothing);
    await render(error: 'Coba lagi.');
    expect(find.text('GAGAL KIRIM'), findsOneWidget);
    expect(find.text('Ringkasan gardu belum dapat dimuat'), findsOneWidget);
    expect(find.text('Muat ulang ringkasan'), findsOneWidget);
  });

  testWidgets('long report codes fit a narrow screen', (tester) async {
    await tester.binding.setSurfaceSize(const Size(320, 700));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: SingleChildScrollView(child:
      InsGarduReportCard(header: header(kode: 'INSPEKSI-GARDU-TOBOALI-20260905-000001', status: 'tersinkron'),
        subTim: 'Inspeksi Gardu', total: 0, filled: 0, onTap: () {}, onRetry: () {}),
    ))));
    expect(find.text('TERSINKRON'), findsOneWidget);
    expect(find.text('Belum ada gardu dalam laporan'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
