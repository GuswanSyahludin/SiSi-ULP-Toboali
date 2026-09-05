import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../lib/screens/gangguan_beranda_section.dart';

Map<String,dynamic> response({String feeder='Palas',String date='2026-09-05'}) => {
  'ok':true,'datasets':[
    {'key':'pickup','title':'Data Gangguan Pick Up','total':0,'series':[],'details':[]},
    {'key':'ar','title':'Data Gangguan AR','total':0,'series':[],'details':[]},
    {'key':'gangguan','title':'Data Gangguan','total':1,'series':[{'date':date,'count':1}],
      'details':[{'date':date,'Penyulang':feeder,'Nama PMT/OG/LBS/ACR':'LBS Palas','Cuaca':'Hujan'}]},
  ],
};
Future<void> mount(WidgetTester tester,GangguanLoader loader) => tester.pumpWidget(MaterialApp(home:Scaffold(body:SingleChildScrollView(child:Padding(padding:const EdgeInsets.all(16),child:GangguanBerandaSection(sesi:const {'token':'test','ulp':'Toboali'},loader:loader,clock:()=>DateTime(2026,9,6)))))));

void main(){
  test('presets use calendar days across months',(){
    final p=GangguanViewData.period('week',DateTime(2026,9,6,2));
    expect(GangguanViewData.iso(p.start),'2026-08-31');
    expect(GangguanViewData.dates(p.start,p.end).length,7);
    expect(GangguanViewData.display('2026-09-05'),'05/09/2026');
    expect(GangguanViewData.display('unknown'),'unknown');
    final month=GangguanViewData.period('month',DateTime(2026,9,6));
    expect(GangguanViewData.iso(month.start),'2026-09-01');
  });
  test('counts handle numeric strings and reject invalid negatives',(){
    final c=GangguanViewData.counts({'series':[{'date':'2026-09-01','count':'2'},{'date':'2026-09-01','count':1},{'date':'2026-09-02','count':-1},{'date':'bad','count':4}]});
    expect(c,{'2026-09-01':3});
  });
  testWidgets('bar selection shows inline detail and keeps sources separate',(tester)async{
    await mount(tester,({required token,required from,required to,String ulp=''})async=>response());
    await tester.pumpAndSettle();
    final bar=find.byKey(const ValueKey('bar-2026-09-05'));
    await tester.ensureVisible(bar);await tester.tap(bar);await tester.pumpAndSettle();
    expect(find.text('Palas'),findsOneWidget);
    expect(find.byType(BottomSheet),findsNothing);
    final ar=find.byKey(const ValueKey('source-ar'));
    await tester.ensureVisible(ar);await tester.tap(ar);await tester.pumpAndSettle();
    expect(find.text('Palas'),findsNothing);
    expect(find.text('0 catatan'),findsOneWidget);
    expect(tester.takeException(),isNull);
  });
  testWidgets('late request cannot overwrite a newer period',(tester)async{
    final requests=<Completer<Map<String,dynamic>>>[];
    await mount(tester,({required token,required from,required to,String ulp=''}){
      final c=Completer<Map<String,dynamic>>();requests.add(c);return c.future;
    });
    await tester.tap(find.byKey(const ValueKey('range-today')));await tester.pump();
    expect(requests.length,2);
    requests[1].complete(response(feeder:'Sadai',date:'2026-09-06'));await tester.pumpAndSettle();
    requests[0].complete(response(feeder:'Lama'));await tester.pumpAndSettle();
    expect(find.text('Sadai'),findsOneWidget);expect(find.text('Lama'),findsNothing);
    expect(find.text('06/09/2026 s.d. 06/09/2026'),findsOneWidget);
  });
  testWidgets('failed fetch is not presented as zero events',(tester)async{
    await mount(tester,({required token,required from,required to,String ulp=''})async=>{'ok':false,'message':'Koneksi gagal'});
    await tester.pumpAndSettle();expect(find.text('Data belum dapat dimuat'),findsOneWidget);
    expect(find.text('0 catatan'),findsNothing);expect(find.text('Coba lagi'),findsOneWidget);
  });
  testWidgets('missing source total is not manufactured as zero',(tester)async{
    await mount(tester,({required token,required from,required to,String ulp=''})async=>{'ok':true,'datasets':[{'key':'gangguan','title':'Data Gangguan','series':[],'details':[]}]});
    await tester.pumpAndSettle();expect(find.text('Belum ada ringkasan dari sumber ini'),findsOneWidget);
    expect(find.text('0 catatan'),findsNothing);
  });
  testWidgets('narrow mobile layout has no render overflow',(tester)async{
    await tester.binding.setSurfaceSize(const Size(320,800));
    addTearDown(()=>tester.binding.setSurfaceSize(null));
    await mount(tester,({required token,required from,required to,String ulp=''})async=>response());
    await tester.pumpAndSettle();expect(tester.takeException(),isNull);
  });
}
