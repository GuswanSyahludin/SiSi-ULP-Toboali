import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../db/app_database.dart';
import '../db/repositories/inspeksi_gardu_repository.dart';
import '../theme/app_colors.dart';
import 'inspeksi_jaringan_screen.dart';

class LaporanHarianScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  final String? targetSubTim, targetTim;
  const LaporanHarianScreen(
      {super.key, required this.sesi, this.targetSubTim, this.targetTim});
  @override
  State<LaporanHarianScreen> createState() => _LaporanState();
}

class _LaporanState extends State<LaporanHarianScreen> {
  final repo = InspeksiGarduRepository();
  String get sub => (widget.targetSubTim ??
          widget.sesi['subTim'] ??
          widget.sesi['tim'] ??
          'ROW 01')
      .toString();
  bool get gardu => sub.toLowerCase().contains('inspeksi gardu');
  @override
  void initState() {
    super.initState();
    if (gardu) {
      repo.downloadListTemuan('${widget.sesi['token'] ?? ''}').catchError((_) {});
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!gardu) {
      return InspeksiJaringanScreen(sesi: widget.sesi, targetSubTim: sub);
    }
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Laporan Harian', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          Text(sub, style: const TextStyle(fontSize: 12, color: Colors.white70)),
        ]),
      ),
      body: _local(),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.navy700,
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => InsGarduForm(sesi: widget.sesi))),
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
    );
  }

  Widget _local() => StreamBuilder<List<InsGarduHeader>>(
    stream: repo.pantauLaporan(),
    builder: (context, snapshot) {
      final list = snapshot.data ?? [];
      if (list.isEmpty) return const Center(child: Text('Belum ada laporan Inspeksi Gardu.'));
      return ListView.separated(
        padding: const EdgeInsets.all(16), itemCount: list.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _draft(list[i]),
      );
    },
  );

  Widget _draft(InsGarduHeader h) => FutureBuilder<List<InsGarduRealisasi>>(
    future: repo.garduLaporan(h.localId),
    builder: (context, snapshot) {
      final gs = snapshot.data ?? [];
      final done = gs.where((x) => x.tier.isNotEmpty).length;
      return Card(
        child: ListTile(
          contentPadding: const EdgeInsets.all(16),
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => InsGarduDetail(header: h))),
          title: Text(h.kodeHeader.isEmpty ? 'Laporan Lokal' : h.kodeHeader, style: const TextStyle(fontWeight: FontWeight.w900)),
          subtitle: Text('${h.hari}, ${h.tanggal}\n$done dari ${gs.length} gardu sudah diisi'),
          isThreeLine: true,
          trailing: const Icon(Icons.chevron_right_rounded),
        ),
      );
    },
  );
}

class InsGarduForm extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const InsGarduForm({super.key, required this.sesi});
  @override State<InsGarduForm> createState() => _FormState();
}
class _FormState extends State<InsGarduForm> {
  final repo=InspeksiGarduRepository(),a=TextEditingController(),b=TextEditingController(),ka=TextEditingController(),kb=TextEditingController(),kendala=TextEditingController();
  bool busy=false;
  Future<void> _gps(TextEditingController c) async { var p=await Geolocator.checkPermission(); if(p==LocationPermission.denied)p=await Geolocator.requestPermission(); final x=await Geolocator.getCurrentPosition(); c.text='${x.latitude.toStringAsFixed(6)}, ${x.longitude.toStringAsFixed(6)}'; setState((){}); }
  Future<void> _save() async { if(a.text.trim().isEmpty||b.text.trim().isEmpty)return; setState(()=>busy=true); final d=DateTime.now(),tgl='${d.year}-${d.month.toString().padLeft(2,'0')}-${d.day.toString().padLeft(2,'0')}',hari=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][d.weekday%7]; await repo.buatLaporan(ulp:'${widget.sesi['ulp']??''}',hari:hari,tanggal:tgl,koordinatAwal:a.text.trim(),koordinatAkhir:b.text.trim(),kmAwal:ka.text.trim(),kmAkhir:kb.text.trim(),kendala:kendala.text.trim(),inputBy:'${widget.sesi['username']??''}'); if(mounted)Navigator.pop(context,true); }
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Tambah Laporan Harian')),body:ListView(padding:const EdgeInsets.all(16),children:[_field('Koordinat Gardu Awal',a),_field('Koordinat Gardu Akhir',b),_field('KM Awal',ka),_field('KM Akhir',kb),_field('Kendala',kendala,lines:3)]),bottomNavigationBar:SafeArea(child:Padding(padding:const EdgeInsets.all(16),child:ElevatedButton(onPressed:busy?null:_save,child:Text(busy?'Menyimpan...':'Simpan Lokal')))));
  Widget _field(String l,TextEditingController c,{int lines=1})=>Padding(padding:const EdgeInsets.only(bottom:12),child:TextField(controller:c,maxLines:lines,decoration:InputDecoration(labelText:l,border:const OutlineInputBorder(),suffixIcon:l.contains('Koordinat')?IconButton(onPressed:()=>_gps(c),icon:const Icon(Icons.my_location)):null)));
}

class InsGarduDetail extends StatefulWidget { final InsGarduHeader header; const InsGarduDetail({super.key,required this.header}); @override State<InsGarduDetail> createState()=>_DetailState(); }
class _DetailState extends State<InsGarduDetail> { final repo=InspeksiGarduRepository(); @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Detail Laporan Harian')),body:FutureBuilder<List<InsGarduRealisasi>>(future:repo.garduLaporan(widget.header.localId),builder:(context,s){final gs=s.data??[];return ListView(padding:const EdgeInsets.all(16),children:[...gs.map((g)=>Card(child:ListTile(title:Text(g.nomorGardu),subtitle:Text(g.tier.isEmpty?'Belum diisi':g.tier),onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>InsGarduTemuanEditor(g:g))).then((_){if(mounted)setState((){});}))) ]);})); }
class InsGarduTemuanEditor extends StatefulWidget { final InsGarduRealisasi g; const InsGarduTemuanEditor({super.key,required this.g}); @override State<InsGarduTemuanEditor> createState()=>_TemuanState(); }
