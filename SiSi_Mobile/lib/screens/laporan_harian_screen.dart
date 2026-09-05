import 'package:flutter/material.dart';
import '../widgets/accurate_gps_button.dart';
import '../widgets/ins_gardu_report_card.dart';
import '../db/app_database.dart';
import '../db/repositories/inspeksi_gardu_repository.dart';
import '../services/petugas_photo_flow.dart';
import '../services/petugas_photo_store.dart';
import '../services/sesi_store.dart';
import '../theme/app_colors.dart';
import 'inspeksi_jaringan_screen.dart';

class LaporanHarianScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String? targetSubTim;
  final String? targetTim;
  const LaporanHarianScreen({super.key,required this.sesi,this.targetSubTim,this.targetTim});
  @override State<LaporanHarianScreen> createState() => _LaporanState();
}
class _LaporanState extends State<LaporanHarianScreen> {
  final repo = InspeksiGarduRepository();
  late Stream<List<InsGarduHeader>> _reports;
  final Map<String, Future<List<InsGarduRealisasi>>> _summaries = {};
  String get sub => (widget.targetSubTim ?? widget.sesi['subTim'] ?? widget.sesi['tim'] ?? 'ROW 01').toString();
  bool get gardu => sub.toLowerCase().contains('inspeksi gardu');
  @override void initState() {
    super.initState(); _reports = repo.pantauLaporan();
    if (gardu) repo.downloadListTemuan('${widget.sesi['token'] ?? ''}').catchError((_) {});
  }
  Future<void> _refresh() async {
    if (!mounted) return;
    setState(() { _summaries.clear(); _reports = repo.pantauLaporan(); });
    await _reports.first;
  }
  Future<void> _refreshSafely() async {
    try { await _refresh(); } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Laporan lokal belum dapat dimuat. Coba lagi.')));
    }
  }
  Future<void> _add() async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => InsGarduForm(sesi: widget.sesi)));
    if (mounted) await _refreshSafely();
  }
  Future<void> _open(InsGarduHeader h) async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => InsGarduDetail(header: h)));
    if (mounted) setState(() => _summaries[h.localId] = repo.garduLaporan(h.localId));
  }
  @override Widget build(BuildContext context) {
    if (!gardu) return InspeksiJaringanScreen(sesi: widget.sesi, targetSubTim: sub);
    return Scaffold(backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(backgroundColor: AppColors.navy700, foregroundColor: Colors.white,
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Laporan Harian', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          Text(sub, style: const TextStyle(fontSize: 12, color: Colors.white70)),
        ]), actions: [IconButton(tooltip: 'Muat ulang laporan lokal',onPressed: _refreshSafely,icon: const Icon(Icons.refresh_rounded))]),
      body: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 760), child: _local())),
      floatingActionButton: FloatingActionButton(tooltip: 'Tambah Laporan Harian',backgroundColor: AppColors.navy700,onPressed: _add,child: const Icon(Icons.add_rounded, color: Colors.white)),
    );
  }
  Widget _local() => StreamBuilder<List<InsGarduHeader>>(stream: _reports,builder: (context, snapshot) {
    if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) return const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [CircularProgressIndicator(color: AppColors.cyan600),SizedBox(height: 12),Text('Memuat laporan lokal…', style: TextStyle(fontSize: 13, color: AppColors.neutral500))]));
    if (snapshot.hasError) return Center(child: Padding(padding: const EdgeInsets.all(28),child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.error_outline_rounded, size: 44, color: AppColors.neutral500),const SizedBox(height: 12),const Text('Laporan lokal belum dapat dimuat. Data tidak dihapus.', textAlign: TextAlign.center),const SizedBox(height: 14),OutlinedButton.icon(onPressed: _refreshSafely, icon: const Icon(Icons.refresh_rounded), label: const Text('Coba Lagi'))])));
    final list = snapshot.data ?? [];
    if (list.isEmpty) return Center(child: Padding(padding: const EdgeInsets.all(28),child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(padding: const EdgeInsets.all(18),decoration: BoxDecoration(color: const Color(0xFFE4F3FA), borderRadius: BorderRadius.circular(18)),child: const Icon(Icons.electrical_services_rounded, size: 36, color: AppColors.cyan600)),const SizedBox(height: 20),
      const Text('Belum ada laporan Inspeksi Gardu', textAlign: TextAlign.center, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.navy900)),const SizedBox(height: 10),
      const Text('Buat laporan harian untuk mulai mencatat pemeriksaan. Data disimpan di HP sebelum dikirim melalui Pengaturan.', textAlign: TextAlign.center, style: TextStyle(fontSize: 13, height: 1.5, color: AppColors.neutral500)),const SizedBox(height: 20),
      ElevatedButton.icon(onPressed: _add, icon: const Icon(Icons.add_rounded), label: const Text('Tambah Laporan')),
    ])));
    return RefreshIndicator(onRefresh: _refreshSafely,child: ListView.separated(physics: const AlwaysScrollableScrollPhysics(),padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),itemCount: list.length + 1,separatorBuilder: (_, __) => const SizedBox(height: 12),itemBuilder: (_, i) {
      if (i == 0) return Padding(padding: const EdgeInsets.only(bottom: 4),child: Column(crossAxisAlignment: CrossAxisAlignment.start,children: [Text('${list.length} laporan tersimpan di HP', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.navy900)),const SizedBox(height: 4),const Text('Progres menunjukkan gardu yang telah diisi tier. Pengiriman melalui Pengaturan → Sinkron Semua Data.', style: TextStyle(fontSize: 12, height: 1.5, color: AppColors.neutral500))]));
      return _draft(list[i - 1]);
    }));
  });
  Widget _draft(InsGarduHeader h) => FutureBuilder<List<InsGarduRealisasi>>(key: ValueKey(h.localId),future: _summaries.putIfAbsent(h.localId, () => repo.garduLaporan(h.localId)),builder: (context, snapshot) {
    final gs = snapshot.data;
    return InsGarduReportCard(header: h,subTim: sub,total: gs?.length,filled: gs?.where((x) => x.tier.trim().isNotEmpty).length,loading: snapshot.connectionState == ConnectionState.waiting,summaryError: snapshot.hasError ? 'Coba muat ulang atau buka detail laporan.' : null,onRetry: () => setState(() => _summaries[h.localId] = repo.garduLaporan(h.localId)),onTap: () => _open(h));
  });
}

class InsGarduForm extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const InsGarduForm({super.key, required this.sesi});
  @override State<InsGarduForm> createState() => _FormState();
}
class _FormState extends State<InsGarduForm> {
  final repo = InspeksiGarduRepository();
  final a = TextEditingController(), b = TextEditingController(), ka = TextEditingController(), kb = TextEditingController(), kendala = TextEditingController();
  bool busy = false;
  Future<void> _save() async {
    if (a.text.trim().isEmpty || b.text.trim().isEmpty) return;
    setState(() => busy = true);
    final d = DateTime.now();
    final tgl = '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    final hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][d.weekday % 7];
    await repo.buatLaporan(ulp: '${widget.sesi['ulp'] ?? ''}',hari: hari,tanggal: tgl,koordinatAwal: a.text.trim(),koordinatAkhir: b.text.trim(),kmAwal: ka.text.trim(),kmAkhir: kb.text.trim(),kendala: kendala.text.trim(),inputBy: '${widget.sesi['username'] ?? ''}');
    if (mounted) Navigator.pop(context, true);
  }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Tambah Laporan Harian')),body: ListView(padding: const EdgeInsets.all(16),children: [_field('Koordinat Gardu Awal', a),_field('Koordinat Gardu Akhir', b),_field('KM Awal', ka),_field('KM Akhir', kb),_field('Kendala', kendala, lines: 3)]),bottomNavigationBar: SafeArea(child: Padding(padding: const EdgeInsets.all(16),child: ElevatedButton(onPressed: busy ? null : _save,child: Text(busy ? 'Menyimpan...' : 'Simpan Lokal')))));
  Widget _field(String l, TextEditingController c, {int lines = 1}) => Padding(padding: const EdgeInsets.only(bottom: 12),child: TextField(controller: c,maxLines: lines,decoration: InputDecoration(labelText: l,border: const OutlineInputBorder(),suffixIcon: l.contains('Koordinat') ? AccurateGpsButton(controller: c) : null)));
}

class InsGarduDetail extends StatefulWidget {
  final InsGarduHeader header;
  const InsGarduDetail({super.key, required this.header});
  @override State<InsGarduDetail> createState() => _DetailState();
}
class _DetailState extends State<InsGarduDetail> {
  final repo = InspeksiGarduRepository();
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Detail Laporan Harian')),body: FutureBuilder<List<InsGarduRealisasi>>(future: repo.garduLaporan(widget.header.localId),builder: (context, s) {
    if(s.connectionState==ConnectionState.waiting)return const Center(child:CircularProgressIndicator());
    if(s.hasError)return Center(child:TextButton(onPressed:()=>setState((){}),child:const Text('Gagal memuat. Coba lagi')));
    final gs = s.data ?? [];
    return ListView(padding: const EdgeInsets.all(16),children: [
      if(gs.isEmpty)const Text('Belum ada gardu dalam laporan ini.'),
      for(final g in gs)Card(child:Column(children:[ListTile(title:Text(g.nomorGardu),subtitle:Text(g.tier.isEmpty?'Belum diisi':g.tier),onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>InsGarduTemuanEditor(g:g))).then((_){if(mounted)setState((){});})),
        _StoredFindingPhotos(key:ValueKey('${g.localId}-${g.status}'),realisasiId:g.localId),
      ])),
    ]);
  }));
}
/// Read-only photo access: opening a photo must never call setGardu/hapusTemuan.
class _StoredFindingPhotos extends StatefulWidget {
  final String realisasiId;
  const _StoredFindingPhotos({super.key,required this.realisasiId});
  @override State<_StoredFindingPhotos> createState()=>_StoredPhotoState();
}
class _StoredPhotoState extends State<_StoredFindingPhotos>{
  Future<List<InsGarduTemuan>>? future;
  Future<void> open(InsGarduTemuan finding,String path,String slot)async{
    try{
      final session=await SesiStore.muat();
      if(session==null)throw StateError('Silakan login ulang.');
      final owner=PetugasPhotoStore.owner(Map<String,dynamic>.from(session));
      final original=await PetugasPhotoStore.byPath(owner,path);
      // Official finding code comes only from the stored domain row, not header/P0.
      final photo=original==null?null:PetugasPhoto(original.path,PetugasPhotoStore.withReceipt(original.metadata,finding.kodeTemuan));
      if(mounted)await PetugasPhotoFlow.open(context,photo:photo,originalPath:path,title:'Foto $slot · ${finding.temuan}');
    }catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('$e')));}
  }
  @override Widget build(BuildContext context)=>ExpansionTile(title:const Text('Foto temuan petugas',style:TextStyle(fontSize:14)),onExpansionChanged:(v){if(v)setState(()=>future=InspeksiGarduRepository().temuan(widget.realisasiId));},children:[
    if(future!=null)FutureBuilder<List<InsGarduTemuan>>(future:future,builder:(context,s){
      if(s.connectionState==ConnectionState.waiting)return const Padding(padding:EdgeInsets.all(16),child:LinearProgressIndicator());
      if(s.hasError)return TextButton(onPressed:()=>setState(()=>future=InspeksiGarduRepository().temuan(widget.realisasiId)),child:const Text('Muat ulang foto'));
      final rows=s.data??[];
      if(rows.isEmpty)return const Padding(padding:EdgeInsets.all(16),child:Text('Belum ada foto temuan tersimpan.'));
      return Column(children:[for(final t in rows)Padding(padding:const EdgeInsets.all(12),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(t.temuan,style:const TextStyle(fontWeight:FontWeight.bold)),Text(t.kodeTemuan.isEmpty?'Kode temuan resmi belum tersedia':t.kodeTemuan,style:const TextStyle(fontSize:12)),Wrap(spacing:8,children:[OutlinedButton.icon(onPressed:t.fotoTemuanPath.isEmpty?null:()=>open(t,t.fotoTemuanPath,'Temuan'),icon:const Icon(Icons.photo_outlined),label:const Text('Foto Temuan')),OutlinedButton.icon(onPressed:t.fotoGarduPath.isEmpty?null:()=>open(t,t.fotoGarduPath,'Gardu'),icon:const Icon(Icons.photo_outlined),label:const Text('Foto Gardu'))]),const Text('Download terkunci jika indikator asli tidak lengkap.',style:TextStyle(fontSize:12))]))]);
    }),
  ]);
}

class InsGarduTemuanEditor extends StatefulWidget {
  final InsGarduRealisasi g;
  const InsGarduTemuanEditor({super.key, required this.g});
  @override State<InsGarduTemuanEditor> createState() => _TemuanState();
}
class _TemuanState extends State<InsGarduTemuanEditor> {
  final repo = InspeksiGarduRepository();
  String tier = 'Tier 1';
  List<ListTemuan> options = [];
  final Map<String, Map<String, String>> selected = {};
  @override void initState() { super.initState(); _load(); }
  Future<void> _load() async { options = await repo.pilihan(tier); if (mounted) setState(() {}); }
  Future<void> _save() async {
    final rows = selected.entries.map((e) => {'tier': tier, 'temuan': e.key, ...e.value}).toList();
    await repo.setGardu(gardu: widget.g, tier: tier, temuan: rows);
    if (mounted) Navigator.pop(context, true);
  }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text(widget.g.nomorGardu),actions: [TextButton(onPressed: _save,child: const Text('SIMPAN'))]),body: ListView(children: [
    DropdownButtonFormField<String>(value: tier,items: ['Tier 1', 'Tier 2', 'Tier 1 & Tier 2'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(),onChanged: (v) { if (v != null) { tier = v; _load(); } }),
    ...options.map((o) => CheckboxListTile(value: selected.containsKey(o.temuan),title: Text(o.temuan),onChanged: (v) => setState(() {if (v == true) {selected[o.temuan] = {};} else {selected.remove(o.temuan);} }))),
  ]));
}
