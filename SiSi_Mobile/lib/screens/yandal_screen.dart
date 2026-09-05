import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../db/app_database.dart';
import '../db/repositories/master_repository.dart';
import '../db/repositories/master_gardu_repository.dart';
import '../db/repositories/yandal_local_repository.dart';
import '../services/accurate_location_service.dart';
import '../widgets/mock_gps_warning_dialog.dart';
import '../theme/app_colors.dart';
import 'yandal_photo_screen.dart';

class YandalScreen extends StatefulWidget {
  final Map<String,dynamic> sesi;
  const YandalScreen({super.key,required this.sesi});
  @override State<YandalScreen> createState()=>_YandalScreenState();
}
class _YandalScreenState extends State<YandalScreen> {
  final repo=YandalLocalRepository();
  late final DateTime operationalDate;
  late final int shift;
  late final String shiftKey;
  List<String> crew=[],people=[],jobs=[],feeders=[];
  Map<String,List<String>> sectionMap={};
  List<Map<String,dynamic>> drafts=[];
  bool loading=true;
  String? error;
  @override void initState(){super.initState();final now=DateTime.now();shift=now.hour<8?3:now.hour<16?1:2;operationalDate=shift==3?DateTime(now.year,now.month,now.day).subtract(const Duration(days:1)):DateTime(now.year,now.month,now.day);shiftKey='${widget.sesi['ulp']}|${widget.sesi['subTim']}|${_date(operationalDate)}|$shift';_load();}
  String _date(DateTime d)=>'${d.year}-${d.month.toString().padLeft(2,'0')}-${d.day.toString().padLeft(2,'0')}';
  String get time=>shift==1?'08:00 - 16:00':shift==2?'16:00 - 00:00':'00:00 - 08:00';
  Future<void> _load()async{try{final master=MasterRepository();people=await repo.masterPetugas();jobs=await repo.masterPekerjaan();feeders=await master.daftarPenyulang();sectionMap=await master.sectionByPenyulang();crew=await repo.loadCrew(shiftKey);drafts=await repo.drafts(shiftKey);if(mounted)setState(()=>error=null);}catch(e){if(mounted)setState(()=>error='$e');}finally{if(mounted)setState(()=>loading=false);}}
  @override Widget build(BuildContext context)=>Scaffold(backgroundColor:const Color(0xFFF6F8FC),appBar:AppBar(backgroundColor:AppColors.navy700,foregroundColor:Colors.white,title:const Text('Yandal',style:TextStyle(fontWeight:FontWeight.w900))),body:loading?const Center(child:CircularProgressIndicator()):ListView(padding:const EdgeInsets.all(16),children:[if(error!=null)Text(error!),_shiftCard()]));
  Widget _shiftCard()=>Card(elevation:0,color:AppColors.navy700,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(20)),child:InkWell(borderRadius:BorderRadius.circular(20),onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>_ShiftDetail(parent:this))).then((_)=>_load()),child:Padding(padding:const EdgeInsets.all(20),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Shift $shift',style:const TextStyle(color:Colors.white,fontSize:25,fontWeight:FontWeight.w900)),Text('${_date(operationalDate)} • $time',style:const TextStyle(color:Colors.white70)),const Divider(color:Colors.white24,height:28),Row(children:[Expanded(child:_metric('PETUGAS',crew.isEmpty?'Belum disimpan':crew.join(', '))),Expanded(child:_metric('PENUGASAN KHUSUS','${drafts.length} P0'))])]))));
  Widget _metric(String l,String v)=>Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(l,style:const TextStyle(color:Colors.white60,fontSize:10,fontWeight:FontWeight.w800)),Text(v,style:const TextStyle(color:Colors.white,fontSize:13,fontWeight:FontWeight.w800),maxLines:2,overflow:TextOverflow.ellipsis)]);
}
class _ShiftDetail extends StatefulWidget {
  final _YandalScreenState parent;
  const _ShiftDetail({required this.parent});
  @override State<_ShiftDetail> createState()=>_ShiftDetailState();
}
class _ShiftDetailState extends State<_ShiftDetail> with SingleTickerProviderStateMixin {
  late final TabController tabs;
  late List<String> selected;
  late List<Map<String,dynamic>> drafts;
  @override void initState(){super.initState();tabs=TabController(length:2,vsync:this);selected=[...widget.parent.crew];drafts=[...widget.parent.drafts];}
  @override void dispose(){tabs.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>Scaffold(backgroundColor:const Color(0xFFF6F8FC),appBar:AppBar(title:Text('Shift ${widget.parent.shift}'),bottom:TabBar(controller:tabs,tabs:const[Tab(text:'Petugas Shift'),Tab(text:'Penugasan Khusus (P0)')])),body:TabBarView(controller:tabs,children:[_crew(),_p0()]));
  Widget _crew()=>ListView(padding:const EdgeInsets.all(16),children:[
    Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(16),border:Border.all(color:AppColors.neutral200)),child:Column(children:[
      _headerRow('ULP','${widget.parent.widget.sesi['ulp']??'-'}'),_headerRow('Tim / Sub-Tim','${widget.parent.widget.sesi['tim']??'-'} / ${widget.parent.widget.sesi['subTim']??'-'}'),_headerRow('Hari / Tanggal','${_day(widget.parent.operationalDate)}, ${widget.parent._date(widget.parent.operationalDate)}'),_headerRow('Shift','Shift ${widget.parent.shift} (${widget.parent.time})')])),
    const SizedBox(height:18),if(widget.parent.people.isEmpty)Container(padding:const EdgeInsets.all(14),decoration:BoxDecoration(color:const Color(0xFFFFF7E6),borderRadius:BorderRadius.circular(12)),child:const Text('Data petugas belum tersedia. Jalankan Sinkron Semua Data setelah backend terbaru dideploy.',style:TextStyle(fontSize:12,color:AppColors.amber700))),
    if(widget.parent.people.isNotEmpty)Wrap(spacing:8,runSpacing:8,children:widget.parent.people.map((p)=>FilterChip(label:Text(p),selected:selected.contains(p),onSelected:(v){if(v&&selected.length>=2){_snack('Maksimal 2 petugas');return;}setState(()=>v?selected.add(p):selected.remove(p));})).toList()),
    const SizedBox(height:8),Align(alignment:Alignment.centerRight,child:Text('${selected.length}/2 dipilih')),const SizedBox(height:18),ElevatedButton(onPressed:widget.parent.people.isEmpty?null:_saveCrew,child:const Text('Simpan petugas shift'))]);
  Widget _headerRow(String l,String v)=>Padding(padding:const EdgeInsets.symmetric(vertical:5),child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:[SizedBox(width:110,child:Text(l,style:const TextStyle(fontSize:12,color:AppColors.neutral500))),Expanded(child:Text(v,style:const TextStyle(fontSize:12,fontWeight:FontWeight.w800)))]));
  String _day(DateTime d)=>const['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'][d.weekday-1];
  Future<void> _saveCrew()async{if(selected.length!=2){_snack('Pilih tepat 2 petugas');return;}await widget.parent.repo.saveCrew(widget.parent.shiftKey,selected);widget.parent.crew=[...selected];if(mounted){setState((){});_snack('Petugas shift disimpan');}}
  Widget _p0()=>ListView(padding:const EdgeInsets.all(16),children:[Row(children:[const Expanded(child:Text('Penugasan Khusus (P0)',style:TextStyle(fontSize:17,fontWeight:FontWeight.w900))),FilledButton.icon(onPressed:selected.length==2?_add:null,icon:const Icon(Icons.add),label:const Text('Tambah P0'))]),if(selected.length!=2)const Padding(padding:EdgeInsets.only(top:12),child:Text('Simpan 2 petugas shift sebelum membuat P0.')),const SizedBox(height:12),...drafts.map(_card)]);
  Widget _card(Map<String,dynamic>d){
    final status=d['fotoSelesai']!=null?'P0 Selesai':d['fotoPekerjaan']!=null?'Proses Pekerjaan':'Memulai Pekerjaan';
    final color=status=='P0 Selesai'?AppColors.success700:status=='Proses Pekerjaan'?AppColors.amber700:AppColors.cyan600;
    const slots={'sebelum':'fotoSebelum','pekerjaan':'fotoPekerjaan','selesai':'fotoSelesai'};
    return Card(color:color.withValues(alpha:.11),shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(16),side:BorderSide(color:color.withValues(alpha:.35))),child:Padding(padding:const EdgeInsets.all(14),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      Text('${d['pekerjaan']}',style:const TextStyle(fontWeight:FontWeight.w900)),Text('${d['penyulang']} • ${d['section']}'),Text(status,style:TextStyle(color:color,fontSize:12,fontWeight:FontWeight.w700)),const SizedBox(height:12),
      Wrap(spacing:8,runSpacing:8,children:slots.entries.map((s){final path=(d[s.value]??'').toString();return OutlinedButton.icon(onPressed:path.isEmpty?null:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>YandalPhotoScreen(draft:Map<String,dynamic>.from(d),slot:s.key,path:path))),icon:const Icon(Icons.photo_outlined,size:16),label:Text(s.key=='selesai'?'Sesudah':s.key=='sebelum'?'Sebelum':'Pekerjaan'));}).toList()),
      const Padding(padding:EdgeInsets.only(top:8),child:Text('Buka foto untuk pratinjau dan simpan watermark. Download hanya tersedia jika indikator lengkap.',style:TextStyle(fontSize:12,color:AppColors.neutral500))),
    ])));
  }
  Future<void> _add()async{final value=await Navigator.push<Map<String,dynamic>>(context,MaterialPageRoute(builder:(_)=>_P0Form(parent:widget.parent,crew:List.of(selected))));if(value!=null&&mounted){setState(()=>drafts.add(value));}}
  void _snack(String m){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(m)));}
}
class _P0Form extends StatefulWidget {
  final _YandalScreenState parent;final List<String> crew;
  const _P0Form({required this.parent,required this.crew});
  @override State<_P0Form> createState()=>_P0FormState();
}
class _P0FormState extends State<_P0Form> {
  final picker=ImagePicker();
  final other=TextEditingController(),area=TextEditingController();
  String? job,feeder,section,gardu;
  List<MasterGardu> gardus=[];
  final Map<String,File> photos={};
  final Map<String,String> coords={},accuracy={};
  final Map<String,Map<String,dynamic>> captureMetadata={};
  late final DateTime createdAt;
  late final String localId;
  bool busy=false;
  @override void initState(){super.initState();createdAt=DateTime.now().toUtc();localId='LOCAL-P0-${createdAt.microsecondsSinceEpoch}';}
  @override void dispose(){other.dispose();area.dispose();super.dispose();}
  Map<String,dynamic> _draft()=>{
    'localId':localId,'shiftKey':widget.parent.shiftKey,'pekerjaan':job,'pekerjaanLainnya':other.text.trim(),'penyulang':feeder,'section':section,'nomorGardu':gardu,'daerah':area.text.trim(),'petugas':List.of(widget.crew),
    'fotoSebelum':photos['sebelum']?.path,'koordinatSebelum':coords['sebelum'],'akurasiSebelum':accuracy['sebelum'],
    'fotoPekerjaan':photos['pekerjaan']?.path,'koordinatPekerjaan':coords['pekerjaan'],'akurasiPekerjaan':accuracy['pekerjaan'],
    'fotoSelesai':photos['selesai']?.path,'koordinatSelesai':coords['selesai'],'akurasiSelesai':accuracy['selesai'],
    'createdAt':createdAt.toIso8601String(),'photoMetadata':{for(final e in captureMetadata.entries)e.key:Map<String,dynamic>.from(e.value)},
  };
  @override Widget build(BuildContext context){
    final sections=widget.parent.sectionMap[feeder]??[];
    return PopScope(canPop:!busy,child:Scaffold(appBar:AppBar(title:const Text('Tambah Penugasan Khusus')),body:ListView(padding:const EdgeInsets.all(16),children:[
      DropdownButtonFormField<String>(value:job,isExpanded:true,decoration:const InputDecoration(labelText:'Nama Pekerjaan',border:OutlineInputBorder()),items:widget.parent.jobs.map((v)=>DropdownMenuItem(value:v,child:Text(v,overflow:TextOverflow.ellipsis))).toList(),onChanged:busy?null:(v)=>setState(()=>job=v)),
      if((job??'').toLowerCase()=='lain - lain')...[const SizedBox(height:12),TextField(controller:other,enabled:!busy,decoration:const InputDecoration(labelText:'Pekerjaan Lainnya',border:OutlineInputBorder()))],
      const SizedBox(height:12),DropdownButtonFormField<String>(value:feeder,isExpanded:true,decoration:const InputDecoration(labelText:'Penyulang',border:OutlineInputBorder()),items:widget.parent.feeders.map((v)=>DropdownMenuItem(value:v,child:Text(v))).toList(),onChanged:busy?null:(v){setState((){feeder=v;section=null;gardu=null;gardus=[];});_loadGardus(v);}),
      const SizedBox(height:12),DropdownButtonFormField<String>(value:sections.contains(section)?section:null,isExpanded:true,decoration:const InputDecoration(labelText:'Section',border:OutlineInputBorder()),items:sections.map((v)=>DropdownMenuItem(value:v,child:Text(v))).toList(),onChanged:busy?null:(v)=>setState(()=>section=v)),const SizedBox(height:12),
      if((job??'').toLowerCase()=='pengecekan gardu')DropdownButtonFormField<String>(value:gardus.any((g)=>g.gardu==gardu)?gardu:null,isExpanded:true,decoration:const InputDecoration(labelText:'Nomor Gardu',border:OutlineInputBorder()),items:gardus.map((g)=>DropdownMenuItem(value:g.gardu,child:Text(g.gardu))).toList(),onChanged:busy||gardus.isEmpty?null:(v)=>setState(()=>gardu=v)),
      if((job??'').toLowerCase()=='pengecekan gardu')const SizedBox(height:12),TextField(controller:area,enabled:!busy,decoration:const InputDecoration(labelText:'Daerah',border:OutlineInputBorder())),
      const SizedBox(height:20),...['sebelum','pekerjaan','selesai'].map(_photo),const SizedBox(height:20),ElevatedButton(onPressed:busy?null:_save,child:Text(busy?'Memproses...':'Simpan draft P0')),
    ])));
  }
  Future<void> _loadGardus(String? value)async{if(value==null||value.trim().isEmpty)return;try{final all=await MasterGarduRepository().cari('',ulp:'${widget.parent.widget.sesi['ulp']??''}',limit:5000);final filtered=all.where((g)=>g.penyulang.trim().toLowerCase()==value.trim().toLowerCase()).toList()..sort((a,b)=>a.gardu.compareTo(b.gardu));if(mounted&&feeder==value)setState((){gardus=filtered;gardu=null;});}catch(e){_message('Gagal memuat gardu: $e');}}
  void _preview(String slot){final file=photos[slot];if(file==null||busy)return;Navigator.push(context,MaterialPageRoute(builder:(_)=>YandalPhotoScreen(draft:_draft(),slot:slot,path:file.path)));}
  Widget _photo(String slot)=>Card(child:Column(children:[ListTile(
    onTap:photos[slot]==null||busy?null:()=>_preview(slot),
    leading:photos[slot]==null?const Icon(Icons.camera_alt):Image.file(photos[slot]!,width:52,height:52,fit:BoxFit.cover,errorBuilder:(_,__,___)=>const Icon(Icons.broken_image)),
    title:Text('Foto ${slot=='selesai'?'Sesudah':slot}'),subtitle:Text(coords[slot]==null?'Belum diambil':'${coords[slot]} • ${accuracy[slot]}'),
    trailing:TextButton(onPressed:busy?null:()=>_take(slot),child:const Text('Ambil Foto'))),
    if(photos[slot]!=null)Align(alignment:Alignment.centerRight,child:TextButton.icon(onPressed:busy?null:()=>_preview(slot),icon:const Icon(Icons.open_in_full,size:16),label:const Text('Lihat foto / watermark'))),
  ]));
  Future<void> _take(String slot)async{
    if(busy)return;setState(()=>busy=true);
    try{
      // Check mock GPS before opening camera; sample again immediately on return
      // so an arbitrarily long camera session does not reuse the old location.
      await AccurateLocationService.capture();
      final image=await picker.pickImage(source:ImageSource.camera,imageQuality:75);
      if(image==null||!mounted)return;
      final cameraReturnedAt=DateTime.now().toUtc();
      final loc=await AccurateLocationService.capture();
      if(!mounted)return;
      final metadata=<String,dynamic>{
        'capturedAt':cameraReturnedAt.toIso8601String(),'captureTimeSource':'camera-return',
        'gpsCapturedAt':loc.position.timestamp.toUtc().toIso8601String(),
        'latitude':loc.position.latitude,'longitude':loc.position.longitude,'accuracyMeters':loc.accuracy,'isMocked':loc.position.isMocked,
        'ulp':'${widget.parent.widget.sesi['ulp']??''}','subTim':'${widget.parent.widget.sesi['subTim']??''}',
        'petugas':widget.crew.join(', '),'penyulang':feeder??'','section':section??'',
        'jenisPekerjaan':job??'','daerah':area.text.trim(),'photoSource':'camera',
      };
      setState((){photos[slot]=File(image.path);coords[slot]=loc.coordinates;accuracy[slot]=loc.accuracyLabel;captureMetadata[slot]=metadata;});
    }on MockLocationException{if(mounted)await MockGpsWarningDialog.show(context);}
    catch(e){_message('Foto belum diganti: $e');}
    finally{if(mounted)setState(()=>busy=false);}
  }
  Future<void> _save()async{
    if(job==null||feeder==null||section==null){_message('Pekerjaan, penyulang, dan section wajib diisi.');return;}
    if((job??'').toLowerCase()=='pengecekan gardu'&&gardu==null){_message('Pilih nomor gardu.');return;}
    setState(()=>busy=true);
    try{final draft=_draft();await widget.parent.repo.saveDraft(draft);if(mounted){setState(()=>busy=false);Navigator.pop(context,draft);}}
    catch(e){_message('Draft belum tersimpan: $e');}
    finally{if(mounted)setState(()=>busy=false);}
  }
  void _message(String message){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(message)));}
}
