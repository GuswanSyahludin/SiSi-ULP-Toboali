import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../db/app_database.dart';
import '../db/repositories/master_gardu_repository.dart';
import '../theme/app_colors.dart';

class GarduScreen extends StatefulWidget{
  final Map<String,dynamic> sesi;const GarduScreen({super.key,required this.sesi});
  static bool boleh(Map<String,dynamic>s){final r=(s['role']??'').toString().trim().toLowerCase(),sub=(s['subTim']??'').toString().trim().toLowerCase();return r=='super user'||r=='admin'||sub=='inspeksi gardu';}
  @override State<GarduScreen> createState()=>_GarduScreenState();
}
class _GarduScreenState extends State<GarduScreen>{
  final repo=MasterGarduRepository(),cari=TextEditingController();List<MasterGardu> rows=[];Set<String> pending={};bool loading=true;StreamSubscription<List<GarduOutbox>>? sub;
  @override void initState(){super.initState();sub=repo.pantauAntrean().listen((v){if(mounted)setState(()=>pending=v.map((e)=>e.gardu).toSet());});muat();}
  @override void dispose(){sub?.cancel();cari.dispose();super.dispose();}
  Future<void> muat()async{setState(()=>loading=true);final role=(widget.sesi['role']??'').toString().toLowerCase();final ulp=role=='super user'?'':(widget.sesi['ulp']??'').toString();final v=await repo.cari(cari.text,ulp:ulp);if(mounted)setState((){rows=v;loading=false;});}
  @override Widget build(BuildContext context){if(!GarduScreen.boleh(widget.sesi))return const Scaffold(body:Center(child:Text('Akses menu Gardu ditolak.')));
    return Scaffold(backgroundColor:const Color(0xFFF6F8FC),appBar:AppBar(backgroundColor:AppColors.navy700,foregroundColor:Colors.white,title:const Text('Gardu',style:TextStyle(fontWeight:FontWeight.w800)),actions:[IconButton(onPressed:muat,icon:const Icon(Icons.refresh_rounded))]),body:Column(children:[
      Padding(padding:const EdgeInsets.fromLTRB(16,16,16,8),child:TextField(controller:cari,onChanged:(_)=>muat(),decoration:InputDecoration(hintText:'Cari nomor gardu atau alamat',prefixIcon:const Icon(Icons.search_rounded),filled:true,fillColor:const Color(0xFFFCFDFF),border:OutlineInputBorder(borderRadius:BorderRadius.circular(14),borderSide:BorderSide.none)))),
      Padding(padding:const EdgeInsets.fromLTRB(18,4,18,12),child:Row(children:[Text('${rows.length} gardu',style:const TextStyle(fontWeight:FontWeight.w700,color:Color(0xFF475569))),const Spacer(),if(pending.isNotEmpty)Text('${pending.length} belum sinkron',style:const TextStyle(fontSize:12,fontWeight:FontWeight.w700,color:Color(0xFFB45309)))])),
      Expanded(child:loading?const Center(child:CircularProgressIndicator()):rows.isEmpty?const Center(child:Padding(padding:EdgeInsets.all(24),child:Text('Belum ada Master Gardu. Jalankan Sinkron Data di Pengaturan.',textAlign:TextAlign.center))):ListView.separated(padding:const EdgeInsets.fromLTRB(16,0,16,24),itemCount:rows.length,separatorBuilder:(_,__)=>const SizedBox(height:12),itemBuilder:(_,i)=>card(rows[i]))) ]));}

  Widget card(MasterGardu g){final p=_percent(g.persentaseBeban),color=_loadColor(p),isPending=pending.contains(g.gardu);return Material(color:const Color(0xFFFCFDFF),borderRadius:BorderRadius.circular(18),child:InkWell(borderRadius:BorderRadius.circular(18),onTap:()=>detail(g),child:Padding(padding:const EdgeInsets.fromLTRB(16,16,14,14),child:Column(children:[
    Row(crossAxisAlignment:CrossAxisAlignment.start,children:[
      Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
        Row(children:[Expanded(child:Text(g.gardu,style:const TextStyle(fontSize:19,fontWeight:FontWeight.w900,color:Color(0xFF172554)))),if(isPending)const _PendingBadge()]),
        const SizedBox(height:4),Text([g.merk,if(g.kapasitasKva.isNotEmpty)'${g.kapasitasKva} kVA'].where((e)=>e.isNotEmpty).join(' · '),style:const TextStyle(fontSize:13,fontWeight:FontWeight.w700,color:Color(0xFF475569))),
        const SizedBox(height:5),Text(g.alamat.isEmpty?'Alamat belum diisi':g.alamat,maxLines:2,overflow:TextOverflow.ellipsis,style:const TextStyle(fontSize:12,height:1.35,color:Color(0xFF7C879B))),
        const SizedBox(height:10),_CategoryPill(text:g.kategoriBeban.isEmpty?_fallbackCategory(p):g.kategoriBeban,color:color),
      ])),const SizedBox(width:16),_LoadRing(percent:p,color:color,size:82),
    ]),
    const Padding(padding:EdgeInsets.symmetric(vertical:13),child:Divider(height:1,color:Color(0xFFE8ECF3))),
    Row(children:[Expanded(child:_mini('BEBAN','${_dash(g.pembebananKva)} kVA')),Expanded(child:_mini('DAYA','${_dash(g.pembebananKw)} kW')),Expanded(child:_mini('ARUS MAX','${_dash(g.arusMaxPerFasa)} A')),const Icon(Icons.chevron_right_rounded,color:Color(0xFFA3ACBA))]),
  ]))));}
  Widget _mini(String label,String value)=>Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(label,style:const TextStyle(fontSize:9,letterSpacing:.7,fontWeight:FontWeight.w800,color:Color(0xFF94A3B8))),const SizedBox(height:2),Text(value,style:const TextStyle(fontSize:12,fontWeight:FontWeight.w800,color:Color(0xFF334155)))]);

  void detail(MasterGardu g){final p=_percent(g.persentaseBeban),color=_loadColor(p);showModalBottomSheet(context:context,isScrollControlled:true,backgroundColor:Colors.transparent,builder:(ctx)=>DraggableScrollableSheet(initialChildSize:.9,minChildSize:.6,maxChildSize:.96,builder:(_,sc)=>Container(decoration:const BoxDecoration(color:Color(0xFFF7F9FC),borderRadius:BorderRadius.vertical(top:Radius.circular(24))),child:Column(children:[
    Container(width:42,height:4,margin:const EdgeInsets.symmetric(vertical:12),decoration:BoxDecoration(color:const Color(0xFFCBD5E1),borderRadius:BorderRadius.circular(8))),
    Padding(padding:const EdgeInsets.fromLTRB(20,0,12,12),child:Row(children:[Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(g.gardu,style:const TextStyle(fontSize:24,fontWeight:FontWeight.w900,color:Color(0xFF172554))),Text(g.ulp,style:const TextStyle(color:Color(0xFF64748B)))])),if(pending.contains(g.gardu))const _PendingBadge(),IconButton(onPressed:()=>Navigator.pop(ctx),icon:const Icon(Icons.close_rounded))])),
    Expanded(child:ListView(controller:sc,padding:const EdgeInsets.fromLTRB(20,4,20,110),children:[
      Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:const Color(0xFFFCFDFF),borderRadius:BorderRadius.circular(18)),child:Row(children:[_LoadRing(percent:p,color:color,size:104),const SizedBox(width:18),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[_CategoryPill(text:g.kategoriBeban.isEmpty?_fallbackCategory(p):g.kategoriBeban,color:color),const SizedBox(height:10),_kv('Pembebanan','${_dash(g.pembebananKva)} kVA'),_kv('Daya aktif','${_dash(g.pembebananKw)} kW'),_kv('Arus max/fasa','${_dash(g.arusMaxPerFasa)} A')]))])),
      const SizedBox(height:20),_section('Identitas',[_kv('Alamat',g.alamat),_kv('Jenis Gardu',g.jenisGardu),_kv('Kepemilikan',g.kepemilikan)]),
      _section('Data Trafo',[_kv('Merk',g.merk),_kv('Kapasitas','${_dash(g.kapasitasKva)} kVA'),_kv('No. Seri',g.noSeri),_kv('Tahun',g.tahunTrafo),_kv('Type Seal',g.typeSeal)]),
      _section('Data PHB-TR',[_kv('Merk',g.merkPhbTr),_kv('Nomor Seri',g.nomorSeriPhbTr),_kv('Tahun',g.tahunPhbTr)]),
      _section('Pengukuran',[_kv('Jam WBP',g.jamUkurWbp),_kv('Tanggal',g.tanggalPengukuran)]),
      _ukur('WBP',[g.wbpRs,g.wbpSt,g.wbpTr,g.wbpRn,g.wbpSn,g.wbpTn],[g.wbpR,g.wbpS,g.wbpT,g.wbpN]),_ukur('LWBP',[g.lwbpRs,g.lwbpSt,g.lwbpTr,g.lwbpRn,g.lwbpSn,g.lwbpTn],[g.lwbpR,g.lwbpS,g.lwbpT,g.lwbpN]),
    ])),
    SafeArea(top:false,child:Padding(padding:const EdgeInsets.fromLTRB(20,10,20,14),child:SizedBox(width:double.infinity,height:48,child:ElevatedButton.icon(style:ElevatedButton.styleFrom(backgroundColor:AppColors.navy700,foregroundColor:Colors.white,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(13))),onPressed:()async{Navigator.pop(ctx);final saved=await Navigator.push<bool>(context,MaterialPageRoute(builder:(_)=>GarduEditScreen(gardu:g,sesi:widget.sesi)));if(saved==true)muat();},icon:const Icon(Icons.edit_rounded),label:const Text('Edit Data Gardu',style:TextStyle(fontWeight:FontWeight.w800))))))
  ]))));}

  Widget _section(String title,List<Widget> children)=>Padding(padding:const EdgeInsets.only(bottom:22),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title.toUpperCase(),style:const TextStyle(fontSize:11,letterSpacing:1.1,fontWeight:FontWeight.w800,color:Color(0xFF2563EB))),const SizedBox(height:8),...children]));
  Widget _kv(String k,String v)=>Padding(padding:const EdgeInsets.symmetric(vertical:6),child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:[SizedBox(width:118,child:Text(k,style:const TextStyle(color:Color(0xFF64748B)))),Expanded(child:Text(_dash(v),style:const TextStyle(fontWeight:FontWeight.w700,color:Color(0xFF1E293B))))]));
  Widget _ukur(String title,List<String> teg,List<String> beban)=>_section(title,[const Text('Tegangan (V)',style:TextStyle(fontWeight:FontWeight.w700)),_metric(['R-S','S-T','T-R','R-N','S-N','T-N'],teg),const SizedBox(height:12),const Text('Beban arus utama (A)',style:TextStyle(fontWeight:FontWeight.w700)),_metric(['R','S','T','N'],beban)]);
  Widget _metric(List<String> labels,List<String> values)=>Wrap(spacing:8,runSpacing:8,children:List.generate(labels.length,(i)=>Container(width:74,padding:const EdgeInsets.symmetric(vertical:9),decoration:BoxDecoration(color:const Color(0xFFFCFDFF),borderRadius:BorderRadius.circular(10)),child:Column(children:[Text(labels[i],style:const TextStyle(fontSize:10,color:Color(0xFF64748B))),Text(_dash(values[i]),style:const TextStyle(fontWeight:FontWeight.w800))]))));
}

class _LoadRing extends StatelessWidget{final double percent,size;final Color color;const _LoadRing({required this.percent,required this.color,required this.size});
  @override Widget build(BuildContext context)=>SizedBox(width:size,height:size,child:CustomPaint(painter:_RingPainter(percent:percent,color:color),child:Center(child:Column(mainAxisSize:MainAxisSize.min,children:[Text('${percent.round()}%',style:TextStyle(fontSize:size*.23,fontWeight:FontWeight.w900,color:const Color(0xFF172554))),Text('BEBAN',style:TextStyle(fontSize:size*.09,letterSpacing:.8,fontWeight:FontWeight.w800,color:const Color(0xFF94A3B8)))]))));}
class _RingPainter extends CustomPainter{final double percent;final Color color;_RingPainter({required this.percent,required this.color});
  @override void paint(Canvas c,Size s){final center=Offset(s.width/2,s.height/2),r=(s.shortestSide-10)/2;final bg=Paint()..color=const Color(0xFFE8EDF5)..style=PaintingStyle.stroke..strokeWidth=8..strokeCap=StrokeCap.round;final fg=Paint()..color=color..style=PaintingStyle.stroke..strokeWidth=8..strokeCap=StrokeCap.round;c.drawCircle(center,r,bg);c.drawArc(Rect.fromCircle(center:center,radius:r),-math.pi/2,math.pi*2*(percent.clamp(0,100)/100),false,fg);}
  @override bool shouldRepaint(covariant _RingPainter o)=>o.percent!=percent||o.color!=color;}
class _CategoryPill extends StatelessWidget{final String text;final Color color;const _CategoryPill({required this.text,required this.color});@override Widget build(BuildContext context)=>Container(padding:const EdgeInsets.symmetric(horizontal:9,vertical:5),decoration:BoxDecoration(color:color.withOpacity(.12),borderRadius:BorderRadius.circular(20)),child:Text(text.isEmpty?'BELUM ADA KATEGORI':text.toUpperCase(),style:TextStyle(fontSize:9,fontWeight:FontWeight.w900,letterSpacing:.5,color:color)));}
class _PendingBadge extends StatelessWidget{const _PendingBadge();@override Widget build(BuildContext context)=>Container(padding:const EdgeInsets.symmetric(horizontal:8,vertical:4),decoration:BoxDecoration(color:const Color(0xFFFEF3C7),borderRadius:BorderRadius.circular(20)),child:const Text('BELUM SINKRON',style:TextStyle(fontSize:9,fontWeight:FontWeight.w900,color:Color(0xFFB45309))));}

double _percent(String raw){final cleaned=raw.replaceAll('%','').replaceAll(',','.').trim();return double.tryParse(cleaned)??0;}
Color _loadColor(double p){if(p<=25)return const Color(0xFF0284C7);if(p<=50)return const Color(0xFF16A34A);if(p<=80)return const Color(0xFFCA8A04);if(p<=100)return const Color(0xFFEA580C);return const Color(0xFFDC2626);}
String _fallbackCategory(double p){if(p<=25)return'Beban Rendah';if(p<=50)return'Beban Normal';if(p<=80)return'Waspada';if(p<=100)return'Tinggi';return'Overload';}
String _dash(String v)=>v.trim().isEmpty?'-':v;

class GarduEditScreen extends StatefulWidget{final MasterGardu gardu;final Map<String,dynamic>sesi;const GarduEditScreen({super.key,required this.gardu,required this.sesi});@override State<GarduEditScreen> createState()=>_EditState();}
class _EditState extends State<GarduEditScreen>{final repo=MasterGarduRepository();final Map<String,TextEditingController> c={};bool saving=false;
  static const fields=<String,String>{'alamat':'Alamat','jenisGardu':'Jenis Gardu','merk':'Merk Trafo','kapasitasKva':'Kapasitas Trafo (kVA)','noSeri':'No. Seri Trafo','tahunTrafo':'Tahun Trafo','typeSeal':'Type Seal','merkPhbTr':'Merk PHB-TR','nomorSeriPhbTr':'Nomor Seri PHB-TR','tahunPhbTr':'Tahun PHB-TR','jamUkurWbp':'Jam Ukur WBP','tanggalPengukuran':'Tanggal Pengukuran','kepemilikan':'Kepemilikan','arusMaxPerFasa':'Arus Max per Fasa di Gardu (A)','pembebananKva':'Pembebanan Trafo WBP (kVA)','pembebananKw':'Pembebanan Trafo WBP (kW)','persentaseBeban':'Pembebanan Trafo WBP (%)','kategoriBeban':'Kategori Beban'};
  @override void initState(){super.initState();final g=widget.gardu;final v={'alamat':g.alamat,'jenisGardu':g.jenisGardu,'merk':g.merk,'kapasitasKva':g.kapasitasKva,'noSeri':g.noSeri,'tahunTrafo':g.tahunTrafo,'typeSeal':g.typeSeal,'merkPhbTr':g.merkPhbTr,'nomorSeriPhbTr':g.nomorSeriPhbTr,'tahunPhbTr':g.tahunPhbTr,'jamUkurWbp':g.jamUkurWbp,'tanggalPengukuran':g.tanggalPengukuran,'kepemilikan':g.kepemilikan,'arusMaxPerFasa':g.arusMaxPerFasa,'pembebananKva':g.pembebananKva,'pembebananKw':g.pembebananKw,'persentaseBeban':g.persentaseBeban,'kategoriBeban':g.kategoriBeban};for(final e in v.entries)c[e.key]=TextEditingController(text:e.value);}
  @override void dispose(){for(final x in c.values)x.dispose();super.dispose();}
  Future<void> save()async{setState(()=>saving=true);await repo.editLokal(asli:widget.gardu,perubahan:{for(final e in c.entries)e.key:e.value.text.trim()},username:(widget.sesi['username']??'').toString());if(mounted)Navigator.pop(context,true);}
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:Text('Edit ${widget.gardu.gardu}'),actions:[TextButton(onPressed:saving?null:save,child:const Text('SIMPAN'))]),body:ListView(padding:const EdgeInsets.all(16),children:[const Text('Disimpan di HP dahulu, lalu dikirim melalui Sinkron Data.',style:TextStyle(color:Color(0xFFB45309),fontWeight:FontWeight.w700)),const SizedBox(height:16),...fields.entries.map((e)=>Padding(padding:const EdgeInsets.only(bottom:12),child:TextField(controller:c[e.key],keyboardType:e.key.contains('Beban')||e.key.contains('pembebanan')||e.key=='arusMaxPerFasa'?const TextInputType.numberWithOptions(decimal:true):TextInputType.text,decoration:InputDecoration(labelText:e.value,filled:true,fillColor:const Color(0xFFFCFDFF),border:OutlineInputBorder(borderRadius:BorderRadius.circular(12))))))]));}
