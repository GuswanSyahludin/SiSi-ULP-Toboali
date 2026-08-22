import 'dart:async';
import 'package:flutter/material.dart';

import '../db/app_database.dart';
import '../db/repositories/master_gardu_repository.dart';
import '../theme/app_colors.dart';

class GarduScreen extends StatefulWidget {
  final Map<String, dynamic> sesi;
  const GarduScreen({super.key, required this.sesi});

  static bool boleh(Map<String, dynamic> sesi) {
    final role = (sesi['role'] ?? '').toString().trim().toLowerCase();
    final sub = (sesi['subTim'] ?? '').toString().trim().toLowerCase();
    return role == 'super user' || role == 'admin' || sub == 'inspeksi gardu';
  }

  @override State<GarduScreen> createState() => _GarduScreenState();
}

class _GarduScreenState extends State<GarduScreen> {
  final _repo = MasterGarduRepository();
  final _cari = TextEditingController();
  List<MasterGardu> _rows = [];
  Set<String> _pending = {};
  bool _loading = true;
  StreamSubscription<List<GarduOutbox>>? _sub;

  @override void initState() {
    super.initState();
    _sub = _repo.pantauAntrean().listen((v) {
      if (mounted) setState(() => _pending = v.map((e) => e.gardu).toSet());
    });
    _muat();
  }
  @override void dispose() { _sub?.cancel(); _cari.dispose(); super.dispose(); }

  Future<void> _muat() async {
    setState(() => _loading = true);
    final role = (widget.sesi['role'] ?? '').toString().toLowerCase();
    final ulp = role == 'super user' ? '' : (widget.sesi['ulp'] ?? '').toString();
    final rows = await _repo.cari(_cari.text, ulp: ulp);
    if (mounted) setState(() { _rows = rows; _loading = false; });
  }

  @override Widget build(BuildContext context) {
    if (!GarduScreen.boleh(widget.sesi)) {
      return const Scaffold(body: Center(child: Text('Akses menu Gardu ditolak.')));
    }
    return Scaffold(
      backgroundColor: const Color(0xFFF7F9FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700, foregroundColor: Colors.white,
        title: const Text('Gardu', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [IconButton(onPressed: _muat, icon: const Icon(Icons.refresh_rounded))],
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: TextField(
            controller: _cari, onChanged: (_) => _muat(),
            decoration: InputDecoration(
              hintText: 'Cari nomor gardu atau alamat',
              prefixIcon: const Icon(Icons.search_rounded),
              filled: true, fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 4, 18, 12),
          child: Row(children: [
            Text('${_rows.length} gardu', style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF475569))),
            const Spacer(),
            if (_pending.isNotEmpty) Text('${_pending.length} belum sinkron',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFB45309))),
          ]),
        ),
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _rows.isEmpty
            ? const Center(child: Text('Belum ada Master Gardu. Jalankan Sinkron Data di Pengaturan.'))
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                itemCount: _rows.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) => _card(_rows[i]),
              )),
      ]),
    );
  }

  Widget _card(MasterGardu g) {
    final pending = _pending.contains(g.gardu);
    return Material(
      color: Colors.white, borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16), onTap: () => _detail(g),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Container(width: 46, height: 46,
              decoration: BoxDecoration(color: const Color(0xFFEFF4FF), borderRadius: BorderRadius.circular(13)),
              child: const Icon(Icons.electrical_services_rounded, color: AppColors.navy700)),
            const SizedBox(width: 13),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(g.gardu, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF172554)))),
                if (pending) const _PendingBadge(),
              ]),
              const SizedBox(height: 4),
              Text('${g.merk} ${g.kapasitasKva.isEmpty ? '' : '${g.kapasitasKva} kVA'}',
                style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF475569))),
              if (g.alamat.isNotEmpty) Text(g.alamat, maxLines: 1, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
            ])),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
          ]),
        ),
      ),
    );
  }

  void _detail(MasterGardu g) {
    showModalBottomSheet(
      context: context, isScrollControlled: true, backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: .88, minChildSize: .55, maxChildSize: .96,
        builder: (_, sc) => Container(
          decoration: const BoxDecoration(color: Color(0xFFF8FAFC), borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
          child: Column(children: [
            Container(width: 42, height: 4, margin: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(8))),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 12, 10),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(g.gardu, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF172554))),
                  Text(g.ulp, style: const TextStyle(color: Color(0xFF64748B))),
                ])),
                if (_pending.contains(g.gardu)) const _PendingBadge(),
                IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close_rounded)),
              ]),
            ),
            Expanded(child: ListView(controller: sc, padding: const EdgeInsets.fromLTRB(20, 8, 20, 110), children: [
              _section('Identitas', [_kv('Alamat', g.alamat), _kv('Jenis Gardu', g.jenisGardu), _kv('Kepemilikan', g.kepemilikan)]),
              _section('Data Trafo', [_kv('Merk', g.merk), _kv('Kapasitas', '${g.kapasitasKva} kVA'), _kv('No. Seri', g.noSeri), _kv('Tahun', g.tahunTrafo), _kv('Type Seal', g.typeSeal)]),
              _section('Data PHB-TR', [_kv('Merk', g.merkPhbTr), _kv('Nomor Seri', g.nomorSeriPhbTr), _kv('Tahun', g.tahunPhbTr)]),
              _section('Pengukuran', [_kv('Jam WBP', g.jamUkurWbp), _kv('Tanggal', g.tanggalPengukuran)]),
              _ukur('WBP', [g.wbpRs,g.wbpSt,g.wbpTr,g.wbpRn,g.wbpSn,g.wbpTn], [g.wbpR,g.wbpS,g.wbpT,g.wbpN]),
              _ukur('LWBP', [g.lwbpRs,g.lwbpSt,g.lwbpTr,g.lwbpRn,g.lwbpSn,g.lwbpTn], [g.lwbpR,g.lwbpS,g.lwbpT,g.lwbpN]),
            ])),
            SafeArea(top: false, child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
              child: SizedBox(width: double.infinity, height: 48,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13))),
                  onPressed: () async {
                    Navigator.pop(ctx);
                    final saved = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => GarduEditScreen(gardu:g, sesi:widget.sesi)));
                    if (saved == true) _muat();
                  },
                  icon: const Icon(Icons.edit_rounded), label: const Text('Edit Data Gardu', style: TextStyle(fontWeight: FontWeight.w800)),
                )),
            )),
          ]),
        ),
      ),
    );
  }

  Widget _section(String title, List<Widget> children) => Padding(
    padding: const EdgeInsets.only(bottom: 22),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title.toUpperCase(), style: const TextStyle(fontSize: 11, letterSpacing: 1.1, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
      const SizedBox(height: 8), ...children,
    ]),
  );
  Widget _kv(String k, String v) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 7),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 112, child: Text(k, style: const TextStyle(color: Color(0xFF64748B)))),
      Expanded(child: Text(v.isEmpty ? '-' : v, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF1E293B)))),
    ]),
  );
  Widget _ukur(String title, List<String> teg, List<String> beban) => _section(title, [
    const Text('Tegangan (V)', style: TextStyle(fontWeight: FontWeight.w700)),
    _metric(['R-S','S-T','T-R','R-N','S-N','T-N'], teg), const SizedBox(height: 12),
    const Text('Beban arus utama (A)', style: TextStyle(fontWeight: FontWeight.w700)),
    _metric(['R','S','T','N'], beban),
  ]);
  Widget _metric(List<String> labels, List<String> values) => Wrap(
    spacing: 8, runSpacing: 8,
    children: List.generate(labels.length, (i) => Container(
      width: 74, padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
      child: Column(children: [Text(labels[i], style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
        Text(values[i].isEmpty ? '-' : values[i], style: const TextStyle(fontWeight: FontWeight.w800))]),
    )),
  );
}

class _PendingBadge extends StatelessWidget {
  const _PendingBadge();
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(20)),
    child: const Text('BELUM SINKRON', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Color(0xFFB45309))),
  );
}

class GarduEditScreen extends StatefulWidget {
  final MasterGardu gardu; final Map<String,dynamic> sesi;
  const GarduEditScreen({super.key, required this.gardu, required this.sesi});
  @override State<GarduEditScreen> createState() => _GarduEditScreenState();
}

class _GarduEditScreenState extends State<GarduEditScreen> {
  final _repo = MasterGarduRepository();
  final Map<String,TextEditingController> c = {};
  bool saving=false;
  static const fields = <String,String>{
    'alamat':'Alamat','jenisGardu':'Jenis Gardu','merk':'Merk Trafo','kapasitasKva':'Kapasitas (kVA)',
    'noSeri':'No. Seri Trafo','tahunTrafo':'Tahun Trafo','typeSeal':'Type Seal',
    'merkPhbTr':'Merk PHB-TR','nomorSeriPhbTr':'Nomor Seri PHB-TR','tahunPhbTr':'Tahun PHB-TR',
    'jamUkurWbp':'Jam Ukur WBP','tanggalPengukuran':'Tanggal Pengukuran','kepemilikan':'Kepemilikan',
    'wbpRs':'WBP R-S','wbpSt':'WBP S-T','wbpTr':'WBP T-R','wbpRn':'WBP R-N','wbpSn':'WBP S-N','wbpTn':'WBP T-N',
    'wbpR':'WBP Beban R','wbpS':'WBP Beban S','wbpT':'WBP Beban T','wbpN':'WBP Beban N',
    'lwbpRs':'LWBP R-S','lwbpSt':'LWBP S-T','lwbpTr':'LWBP T-R','lwbpRn':'LWBP R-N','lwbpSn':'LWBP S-N','lwbpTn':'LWBP T-N',
    'lwbpR':'LWBP Beban R','lwbpS':'LWBP Beban S','lwbpT':'LWBP Beban T','lwbpN':'LWBP Beban N',
  };
  @override void initState(){ super.initState(); final g=widget.gardu; final vals=<String,String>{
    'alamat':g.alamat,'jenisGardu':g.jenisGardu,'merk':g.merk,'kapasitasKva':g.kapasitasKva,'noSeri':g.noSeri,'tahunTrafo':g.tahunTrafo,'typeSeal':g.typeSeal,
    'merkPhbTr':g.merkPhbTr,'nomorSeriPhbTr':g.nomorSeriPhbTr,'tahunPhbTr':g.tahunPhbTr,'jamUkurWbp':g.jamUkurWbp,'tanggalPengukuran':g.tanggalPengukuran,'kepemilikan':g.kepemilikan,
    'wbpRs':g.wbpRs,'wbpSt':g.wbpSt,'wbpTr':g.wbpTr,'wbpRn':g.wbpRn,'wbpSn':g.wbpSn,'wbpTn':g.wbpTn,'wbpR':g.wbpR,'wbpS':g.wbpS,'wbpT':g.wbpT,'wbpN':g.wbpN,
    'lwbpRs':g.lwbpRs,'lwbpSt':g.lwbpSt,'lwbpTr':g.lwbpTr,'lwbpRn':g.lwbpRn,'lwbpSn':g.lwbpSn,'lwbpTn':g.lwbpTn,'lwbpR':g.lwbpR,'lwbpS':g.lwbpS,'lwbpT':g.lwbpT,'lwbpN':g.lwbpN};
    for(final e in vals.entries)c[e.key]=TextEditingController(text:e.value);
  }
  @override void dispose(){for(final x in c.values)x.dispose();super.dispose();}
  Future<void> save() async { setState(()=>saving=true); final p={for(final e in c.entries)e.key:e.value.text.trim()};
    await _repo.editLokal(asli:widget.gardu,perubahan:p,username:(widget.sesi['username']??'').toString());
    if(mounted){Navigator.pop(context,true);ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Tersimpan di HP. Jalankan Sinkron Data untuk mengirim ke gsheet.')));}}
  @override Widget build(BuildContext context)=>Scaffold(
    appBar:AppBar(title:Text('Edit ${widget.gardu.gardu}'),actions:[TextButton(onPressed:saving?null:save,child:const Text('SIMPAN'))]),
    body:ListView(padding:const EdgeInsets.all(16),children:[
      const Text('Perubahan disimpan lokal dahulu.',style:TextStyle(color:Color(0xFFB45309),fontWeight:FontWeight.w700)),const SizedBox(height:16),
      ...fields.entries.map((e)=>Padding(padding:const EdgeInsets.only(bottom:12),child:TextField(controller:c[e.key],decoration:InputDecoration(labelText:e.value,border:OutlineInputBorder(borderRadius:BorderRadius.circular(12))))))]),
  );
}
