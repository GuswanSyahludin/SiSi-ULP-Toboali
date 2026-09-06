import 'package:flutter/material.dart';
import '../services/gangguan_beranda_service.dart';

typedef GangguanLoader = Future<Map<String, dynamic>> Function({
  required String token, required String from, required String to, String ulp,
});

/// Presentation helpers use calendar dates, independent of locale initialization.
class GangguanViewData {
  static String iso(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  static String display(String raw) {
    final match = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(raw);
    return match == null ? raw : '${match[3]}/${match[2]}/${match[1]}';
  }
  static DateTime day(DateTime d) => DateTime(d.year, d.month, d.day);
  static DateTimeRange period(String preset, DateTime now) {
    final end = day(now);
    final start = preset == 'today' ? end : preset == 'week'
        ? DateTime(end.year, end.month, end.day - 6)
        : DateTime(end.year, end.month, 1);
    return DateTimeRange(start: start, end: end);
  }
  static List<String> dates(DateTime from, DateTime to) {
    final result = <String>[];
    var d = day(from);
    while (!d.isAfter(day(to))) {
      result.add(iso(d));
      d = DateTime(d.year, d.month, d.day + 1);
    }
    return result;
  }
  static List<Map<String, dynamic>> maps(dynamic raw) => raw is List
      ? raw.whereType<Map>().map((v) => Map<String, dynamic>.from(v)).toList()
      : <Map<String, dynamic>>[];
  static Map<String, int> counts(Map<String, dynamic> dataset) {
    final result = <String, int>{};
    for (final p in maps(dataset['series'])) {
      final date = '${p['date'] ?? ''}';
      final n = num.tryParse('${p['count']}');
      if (RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(date) && n != null && n.isFinite && n >= 0) {
        result[date] = (result[date] ?? 0) + n.toInt();
      }
    }
    return result;
  }
  static String first(Map<String, dynamic> row, List<String> keys) {
    for (final k in keys) {
      final value = '${row[k] ?? ''}'.trim();
      if (value.isNotEmpty) return value;
    }
    return '';
  }
}

class GangguanBerandaSection extends StatefulWidget {
  final Map<String, dynamic> sesi;
  /// Injection seam for deterministic UI tests; production uses the same service.
  final GangguanLoader? loader;
  final DateTime Function()? clock;
  const GangguanBerandaSection({super.key, required this.sesi, this.loader, this.clock});
  @override State<GangguanBerandaSection> createState() => _GangguanState();
}

class _GangguanState extends State<GangguanBerandaSection> {
  static const ink = Color(0xFF18334D), muted = Color(0xFF52687C);
  static const line = Color(0xFFDDE6EF), surface = Color(0xFFFCFDFF);
  static const blue = Color(0xFF225FC2), cyan = Color(0xFF176B82), gold = Color(0xFF846018);
  static const order = {'gangguan': 0, 'ar': 1, 'pickup': 2};
  late DateTime from, to;
  String preset = 'month', activeKey = '', selectedDate = '';
  bool loading = true, all = false;
  String? error;
  int generation = 0, visibleRows = 20;
  List<Map<String, dynamic>> sets = [];
  DateTime get now => (widget.clock ?? DateTime.now)();
  Map<String, dynamic>? get dataset {
    for (final s in sets) { if ('${s['key']}' == activeKey) return s; }
    return null;
  }
  Color get accent => activeKey == 'ar' ? cyan : activeKey == 'pickup' ? gold : blue;
  @override void initState() {
    super.initState();
    final p = GangguanViewData.period('month', now);
    from = p.start; to = p.end;
    load();
  }
  @override void didUpdateWidget(covariant GangguanBerandaSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.sesi['token'] != widget.sesi['token'] || oldWidget.sesi['ulp'] != widget.sesi['ulp']) load();
  }
  Future<void> load() async {
    final request = ++generation;
    final requestedFrom = GangguanViewData.iso(from), requestedTo = GangguanViewData.iso(to);
    setState(() { loading = true; error = null; sets = []; all = false; visibleRows = 20; });
    try {
      final loader = widget.loader ?? GangguanBerandaService.load;
      final response = await loader(token: '${widget.sesi['token'] ?? ''}',
          from: requestedFrom, to: requestedTo, ulp: '${widget.sesi['ulp'] ?? ''}');
      if (!mounted || request != generation) return;
      if (response['ok'] != true) throw StateError('${response['message'] ?? 'Gagal memuat data.'}');
      final incoming = GangguanViewData.maps(response['datasets']);
      incoming.sort((a,b) => (order['${a['key']}'] ?? 99).compareTo(order['${b['key']}'] ?? 99));
      setState(() {
        sets = incoming;
        if (!sets.any((s) => '${s['key']}' == activeKey)) activeKey = sets.isEmpty ? '' : '${sets.first['key']}';
        if (selectedDate.compareTo(requestedFrom) < 0 || selectedDate.compareTo(requestedTo) > 0 || selectedDate.isEmpty) {
          selectedDate = requestedTo;
          // Start on the latest day with records, not a potentially empty today.
          final days = dataset == null ? <String>[] : GangguanViewData.counts(dataset!).keys
              .where((d) => d.compareTo(requestedFrom) >= 0 && d.compareTo(requestedTo) <= 0).toList()..sort();
          if (days.isNotEmpty) selectedDate = days.last;
        }
      });
    } catch (e) {
      if (mounted && request == generation) setState(() => error = e.toString().replaceFirst('Bad state: ', '').replaceFirst('Exception: ', ''));
    } finally {
      if (mounted && request == generation) setState(() => loading = false);
    }
  }
  void choosePreset(String value) {
    final p = GangguanViewData.period(value, now);
    setState(() { preset = value; from = p.start; to = p.end; selectedDate = ''; });
    load();
  }
  Future<void> pick() async {
    final p = await showDateRangePicker(context: context,
      firstDate: DateTime(2020), lastDate: GangguanViewData.day(now),
      initialDateRange: DateTimeRange(start: from, end: to),
      helpText: 'Periode gangguan, maksimal selisih 93 hari',
    );
    if (p == null || !mounted) return;
    final span = DateTime.utc(p.end.year,p.end.month,p.end.day)
        .difference(DateTime.utc(p.start.year,p.start.month,p.start.day)).inDays;
    if (span > 93) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Rentang maksimal selisih 93 hari. Pilih periode lebih pendek.')));
      return;
    }
    setState(() { from = p.start; to = p.end; preset = 'custom'; selectedDate = ''; });
    load();
  }
  void chooseDay(String day) => setState(() { selectedDate = day; all = false; visibleRows = 20; });
  @override Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Expanded(child: Text('Data gangguan', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: ink))),
        IconButton(tooltip: 'Muat ulang data gangguan', onPressed: loading ? null : load, icon: const Icon(Icons.refresh_rounded, color: muted)),
      ]),
      const Text('Tren harian dan rincian dalam satu tampilan.', style: TextStyle(fontSize: 13, color: muted)),
      const SizedBox(height: 18),
      Container(clipBehavior: Clip.antiAlias, decoration: BoxDecoration(color: surface, border: Border.all(color: line), borderRadius: BorderRadius.circular(20)), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Periode data', style: TextStyle(fontSize: 12, color: muted)),
          const SizedBox(height: 4),
          Text('${GangguanViewData.display(GangguanViewData.iso(from))} s.d. ${GangguanViewData.display(GangguanViewData.iso(to))}', key: const ValueKey('gangguan-period'), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: ink)),
          const SizedBox(height: 12),
          Wrap(spacing: 6, runSpacing: 6, children: [
            for (final p in const {'today':'Hari ini','week':'7 hari','month':'Bulan ini'}.entries)
              TextButton(key: ValueKey('range-${p.key}'), onPressed: () => choosePreset(p.key),
                style: TextButton.styleFrom(foregroundColor: preset == p.key ? blue : muted, backgroundColor: preset == p.key ? const Color(0xFFEAF1FC) : const Color(0xFFF3F6FA), minimumSize: const Size(44,44), padding: const EdgeInsets.symmetric(horizontal: 10)), child: Text(p.value, style: const TextStyle(fontSize:12))),
            TextButton.icon(onPressed: pick, icon: const Icon(Icons.date_range_outlined, size:16), label: const Text('Pilih tanggal',style:TextStyle(fontSize:12))),
          ]),
        ])),
        const Divider(height:1,color:line),
        if (loading) const _GangguanSkeleton()
        else if (error != null) _empty('Data belum dapat dimuat', '$error\nGagal memuat bukan berarti tidak ada gangguan.', retry: true)
        else if (sets.isEmpty) _empty('Sumber belum tersedia', 'Backend belum mengirim dataset gangguan. Coba muat ulang.', retry: true)
        else ...[
          if (dataset != null) _plot(dataset!),
        ],
      ])),
      if (!loading && error == null && dataset != null) _details(dataset!),
    ]);
  }
  Widget _empty(String title,String body,{bool retry=false}) => Padding(padding:const EdgeInsets.symmetric(horizontal:24,vertical:32),child:Column(children:[
    const Icon(Icons.bar_chart_rounded,size:36,color:muted),const SizedBox(height:12),
    Text(title,textAlign:TextAlign.center,style:const TextStyle(fontSize:18,fontWeight:FontWeight.w700,color:ink)),
    const SizedBox(height:8),Text(body,textAlign:TextAlign.center,style:const TextStyle(fontSize:13,color:muted,height:1.5)),
    if(retry) TextButton(onPressed:load,child:const Text('Coba lagi')),
  ]));
  Widget _plot(Map<String,dynamic> data) {
    final values = GangguanViewData.counts(data);
    // Legacy backend omits total for missing/empty sheets: do not manufacture a zero.
    if (data['total'] == null && values.isEmpty) return _empty('Belum ada ringkasan dari sumber ini', 'Sumber mungkin kosong atau belum tersedia. Muat ulang untuk memeriksa kembali.');
    final days = GangguanViewData.dates(from,to);
    final maximum = days.fold<int>(0,(m,d) => (values[d] ?? 0) > m ? values[d]! : m);
    final ceiling = maximum < 4 ? 4 : ((maximum / 4).ceil() * 4);
    final peakDays = days.where((d) => values[d] == maximum).toList();
    final insight = maximum == 0 ? 'Tidak ada catatan pada periode ini. Ini bukan indikator kondisi jaringan langsung.'
        : 'Terbanyak: $maximum catatan pada ${peakDays.take(2).map(GangguanViewData.display).join(' dan ')}${peakDays.length > 2 ? ' dan tanggal lainnya' : ''}.';
    return Padding(padding:const EdgeInsets.fromLTRB(16,20,16,4),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      Wrap(alignment:WrapAlignment.spaceBetween,spacing:16,runSpacing:8,children:[
        Text('${data['title'] ?? 'Data Gangguan'}',style:const TextStyle(fontSize:18,fontWeight:FontWeight.w700,color:ink)),
        Text('${data['total'] ?? 'Belum tersedia'} catatan',style:TextStyle(fontSize:14,fontWeight:FontWeight.w700,color:accent)),
      ]),
      const SizedBox(height:4),const Text('Jumlah catatan per hari',style:TextStyle(fontSize:12,color:muted)),const SizedBox(height:20),
      LayoutBuilder(builder:(context,box){
        final scale = MediaQuery.textScalerOf(context).scale(12) / 12;
        final labelHeight = 22.0 * scale;
        final dateHeight = 36.0 * scale;
        final width = ((box.maxWidth - 30) / days.length).clamp(44.0,68.0).toDouble();
        return Row(crossAxisAlignment:CrossAxisAlignment.start,children:[
          SizedBox(width:26,child:Column(children:[SizedBox(height:labelHeight),SizedBox(height:144,child:Column(mainAxisAlignment:MainAxisAlignment.spaceBetween,children:[for(final n in [ceiling,ceiling~/2,0])Text('$n',style:const TextStyle(fontSize:10,color:muted))]))])),
          const SizedBox(width:4),
          Expanded(child:SizedBox(height:labelHeight+144+dateHeight,child:ListView.builder(
            key:ValueKey('chart-$activeKey-${GangguanViewData.iso(from)}-${GangguanViewData.iso(to)}'),
            scrollDirection:Axis.horizontal,itemExtent:width,itemCount:days.length,
            itemBuilder:(context,i){final d=days[i],n=values[d]??0;final chosen=selectedDate==d&&!all;
              return Semantics(button:true,selected:chosen,label:'${GangguanViewData.display(d)}, $n catatan',child:Tooltip(message:'${GangguanViewData.display(d)} · $n catatan',child:InkWell(
                key:ValueKey('bar-$d'),onTap:()=>chooseDay(d),borderRadius:BorderRadius.circular(8),
                child:Column(children:[
                  SizedBox(height:labelHeight,child:Center(child:Text('$n',style:TextStyle(fontSize:11,fontWeight:FontWeight.w700,color:chosen?accent:muted)))),
                  SizedBox(height:144,child:Stack(alignment:Alignment.bottomCenter,children:[
                    Positioned.fill(child:Column(mainAxisAlignment:MainAxisAlignment.spaceBetween,children:const[Divider(height:1,color:line),Divider(height:1,color:line),Divider(height:1,color:line)])),
                    if(n>0) Container(width:22,height:144*n/ceiling,decoration:BoxDecoration(color:chosen?accent:accent.withValues(alpha:.28),borderRadius:const BorderRadius.vertical(top:Radius.circular(5)))),
                  ])),
                  SizedBox(height:dateHeight,child:Center(child:Container(padding:const EdgeInsets.symmetric(horizontal:7,vertical:4),decoration:BoxDecoration(color:chosen?const Color(0xFFEAF1FC):null,borderRadius:BorderRadius.circular(6)),child:Text(d.substring(8),style:TextStyle(fontSize:11,color:chosen?accent:muted,fontWeight:chosen?FontWeight.w700:FontWeight.w400))))),
                ]),
              )));
            },
          ))),
        ]);
      }),
      const SizedBox(height:12),const Text('Geser grafik · Ketuk batang untuk rincian tanggal',style:TextStyle(fontSize:11,color:muted)),
      const SizedBox(height:16),Text(insight,style:const TextStyle(fontSize:13,color:ink,height:1.5)),
    ]));
  }
  Widget _details(Map<String,dynamic> data) {
    if (data['total']==null && GangguanViewData.counts(data).isEmpty) return const SizedBox.shrink();
    final rows=GangguanViewData.maps(data['details']).where((r){final d='${r['date']??''}';return d.compareTo(GangguanViewData.iso(from))>=0 && d.compareTo(GangguanViewData.iso(to))<=0 && (all||d==selectedDate);}).toList();
    rows.sort((a,b)=>'${b['date']}'.compareTo('${a['date']}'));
    final expected = all ? num.tryParse('${data['total']}')?.toInt() : GangguanViewData.counts(data)[selectedDate]??0;
    return Padding(padding:const EdgeInsets.only(top:24),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      Row(children:[Expanded(child:Text(all?'Catatan dalam periode':GangguanViewData.display(selectedDate),key:const ValueKey('detail-date'),style:const TextStyle(fontSize:20,fontWeight:FontWeight.w700,color:ink))),
        TextButton(key:const ValueKey('all-details'),onPressed:()=>setState((){all=!all;visibleRows=20;}),child:Text(all?'Per tanggal':'Lihat semua',style:const TextStyle(fontSize:12))),
      ]),
      Text('${data['title']} · ${rows.length} rincian tersedia',style:const TextStyle(fontSize:12,color:muted)),
      if(expected!=null&&expected!=rows.length)Padding(padding:const EdgeInsets.symmetric(vertical:10),child:Text('Grafik mencatat $expected, tetapi ${rows.length} rincian diterima. Muat ulang untuk memeriksa kelengkapan.',style:const TextStyle(fontSize:12,color:gold))),
      const SizedBox(height:12),const Divider(height:1,color:line),
      if(rows.isEmpty) Padding(padding:const EdgeInsets.symmetric(vertical:24),child:Text((expected??0)>0?'Rincian belum tersedia. Grafik tetap menunjukkan jumlah dari sumber.':'Tidak ada catatan untuk pilihan ini. Pilih tanggal atau sumber lain.',style:const TextStyle(fontSize:13,color:muted)))
      else ...[
        for(var i=0;i<rows.length&&i<visibleRows;i++) _record(rows[i],i),
        if(rows.length>visibleRows)TextButton(onPressed:()=>setState(()=>visibleRows+=20),child:Text('Tampilkan berikutnya (${rows.length-visibleRows} tersisa)')),
      ],
    ]));
  }
  Widget _record(Map<String,dynamic> row,int index) {
    final title=GangguanViewData.first(row,['Penyulang','PENYULANG','Penyulang_Fix']);
    final device=GangguanViewData.first(row,['Nama PMT/OG/LBS/ACR','Nama PMT/OG/ACR','RECLOSER']);
    // Preserve every source field, including timestamps, rather than guessing a
    // common event-time schema across all three sources.
    return Column(children:[
      ExpansionTile(key:ValueKey('record-$activeKey-${GangguanViewData.iso(from)}-${GangguanViewData.iso(to)}-$all-$selectedDate-$index-${row['ID']??''}'),
        tilePadding:EdgeInsets.zero,childrenPadding:const EdgeInsets.only(bottom:16),
        title:Text(title.isEmpty?'Penyulang belum tersedia':title,style:const TextStyle(fontSize:16,fontWeight:FontWeight.w700,color:ink)),
        subtitle:Text([if(device.isNotEmpty)device,GangguanViewData.display('${row['date']??''}')].join(' · '),style:const TextStyle(fontSize:12,color:muted)),
        children:row.entries.where((e)=>e.key!='date'&&e.value!=null&&'${e.value}'.trim().isNotEmpty).map((e)=>Padding(padding:const EdgeInsets.symmetric(vertical:6),child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:[
          Expanded(flex:2,child:Text(e.key,style:const TextStyle(fontSize:12,color:muted))),const SizedBox(width:16),Expanded(flex:3,child:SelectableText('${e.value}',style:const TextStyle(fontSize:13,fontWeight:FontWeight.w500,color:ink))),
        ]))).toList(),
      ),const Divider(height:1,color:line),
    ]);
  }
}

class _GangguanSkeleton extends StatelessWidget {
  const _GangguanSkeleton();
  @override Widget build(BuildContext context) => Semantics(label:'Memuat data gangguan',liveRegion:true,child:const Padding(
    padding:EdgeInsets.all(24),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      SizedBox(width:160,height:18,child:ColoredBox(color:Color(0xFFE8EEF5))),SizedBox(height:20),
      SizedBox(height:144,width:double.infinity,child:ColoredBox(color:Color(0xFFF0F4F8))),
      SizedBox(height:16),LinearProgressIndicator(minHeight:2),
    ]),
  ));
}
