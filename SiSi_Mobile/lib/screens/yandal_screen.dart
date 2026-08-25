import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../db/repositories/master_repository.dart';
import '../db/repositories/yandal_local_repository.dart';
import '../services/accurate_location_service.dart';
import '../theme/app_colors.dart';

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
  List<String> crew=[], people=[], jobs=[], feeders=[];
  Map<String,List<String>> sectionMap={};
  List<Map<String,dynamic>> drafts=[];
  bool loading=true;

  @override void initState(){super.initState(); final now=DateTime.now(); shift=now.hour<8?3:now.hour<16?1:2; operationalDate=shift==3?DateTime(now.year,now.month,now.day).subtract(const Duration(days:1)):DateTime(now.year,now.month,now.day); shiftKey='${widget.sesi['ulp']}|${widget.sesi['subTim']}|${_date(operationalDate)}|$shift'; _load();}
  String _date(DateTime d)=>'${d.year}-${d.month.toString().padLeft(2,'0')}-${d.day.toString().padLeft(2,'0')}';
  String get time=>shift==1?'08:00 - 16:00':shift==2?'16:00 - 00:00':'00:00 - 08:00';
  Future<void> _load() async { final master=MasterRepository(); people=await repo.masterPetugas(); jobs=await repo.masterPekerjaan(); feeders=await master.daftarPenyulang(); sectionMap=await master.sectionByPenyulang(); crew=await repo.loadCrew(shiftKey); drafts=await repo.drafts(shiftKey); if(mounted)setState(()=>loading=false); }

  @override Widget build(BuildContext context)=>Scaffold(backgroundColor:const Color(0xFFF6F8FC),appBar:AppBar(backgroundColor:AppColors.navy700,foregroundColor:Colors.white,title:const Text('Yandal',style:TextStyle(fontWeight:FontWeight.w900))),body:loading?const Center(child:CircularProgressIndicator()):ListView(padding:const EdgeInsets.all(16),children:[_shiftCard()]),);
  Widget _shiftCard()=>Card(elevation:0,color:AppColors.navy700,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(20)),child:InkWell(borderRadius:BorderRadius.circular(20),onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>_ShiftDetail(parent:this))).then((_)=>_load()),child:Padding(padding:const EdgeInsets.all(20),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Shift $shift',style:const TextStyle(color:Colors.white,fontSize:25,fontWeight:FontWeight.w900)),Text('${_date(operationalDate)} • $time',style:const TextStyle(color:Colors.white70)),const Divider(color:Colors.white24,height:28),Row(children:[Expanded(child:_metric('PETUGAS',crew.isEmpty?'Belum disimpan':crew.join(', '))),Expanded(child:_metric('PENUGASAN KHUSUS','${drafts.length} P0'))])]))));
  Widget _metric(String l,String v)=>Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(l,style:const TextStyle(color:Colors.white60,fontSize:10,fontWeight:FontWeight.w800)),Text(v,style:const TextStyle(color:Colors.white,fontSize:13,fontWeight:FontWeight.w800),maxLines:2,overflow:TextOverflow.ellipsis)]);
}

class _ShiftDetail extends StatefulWidget { final _YandalScreenState parent; const _ShiftDetail({required this.parent}); @override State<_ShiftDetail> createState()=>_ShiftDetailState(); }
class _ShiftDetailState extends State<_ShiftDetail> with SingleTickerProviderStateMixin {
  late final TabController tabs; late List<String> selected; late List<Map<String,dynamic>> drafts;
  @override void initState(){super.initState();tabs=TabController(length:2,vsync:this);selected=[...widget.parent.crew];drafts=[...widget.parent.drafts];}
  @override void dispose(){tabs.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>Scaffold(backgroundColor:const Color(0xFFF6F8FC),appBar:AppBar(title:Text('Shift ${widget.parent.shift}'),bottom:TabBar(controller:tabs,tabs:const [Tab(text:'Petugas Shift'),Tab(text:'Penugasan Khusus (P0)')])),body:TabBarView(controller:tabs,children:[_crew(),_p0()]));
  Widget _crew()=>ListView(padding:const EdgeInsets.all(16),children:[Wrap(spacing:8,runSpacing:8,children:widget.parent.people.map((p)=>FilterChip(label:Text(p),selected:selected.contains(p),onSelected:(v){if(v&&selected.length>=2){_snack('Maksimal 2 petugas');return;}setState(()=>v?selected.add(p):selected.remove(p));})).toList()),const SizedBox(height:8),Align(alignment:Alignment.centerRight,child:Text('${selected.length}/2 dipilih')),const SizedBox(height:18),ElevatedButton(onPressed:_saveCrew,child:const Text('Simpan petugas shift'))]);
  Future<void> _saveCrew()async{if(selected.length!=2){_snack('Pilih tepat 2 petugas');return;}await widget.parent.repo.saveCrew(widget.parent.shiftKey,selected);widget.parent.crew=[...selected];if(mounted){setState((){});_snack('Petugas shift disimpan');}}
  Widget _p0()=>ListView(padding:const EdgeInsets.all(16),children:[Row(children:[const Expanded(child:Text('Penugasan Khusus (P0)',style:TextStyle(fontSize:17,fontWeight:FontWeight.w900))),FilledButton.icon(onPressed:selected.length==2?_add:null,icon:const Icon(Icons.add),label:const Text('Tambah P0'))]),if(selected.length!=2)const Padding(padding:EdgeInsets.only(top:12),child:Text('Simpan 2 petugas shift sebelum membuat P0.')),const SizedBox(height:12),...drafts.map(_card)]);
  Widget _card(Map<String,dynamic>d){final status=d['fotoSelesai']!=null?'P0 Selesai':d['fotoPekerjaan']!=null?'Proses Pekerjaan':'Memulai Pekerjaan';final color=status=='P0 Selesai'?AppColors.success700:status=='Proses Pekerjaan'?AppColors.amber700:AppColors.cyan600;return Card(color:color.withValues(alpha:.11),shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(16),side:BorderSide(color:color.withValues(alpha:.35))),child:ListTile(title:Text('${d['pekerjaan']}',style:const TextStyle(fontWeight:FontWeight.w900)),subtitle:Text('${d['penyulang']} • ${d['section']}'),trailing:Text(status,style:TextStyle(color:color,fontSize:10,fontWeight:FontWeight.w900))));}
  Future<void> _add()async{final value=await Navigator.push<Map<String,dynamic>>(context,MaterialPageRoute(builder:(_)=>_P0Form(parent:widget.parent,crew:selected)));if(value!=null){await widget.parent.repo.saveDraft(value);setState(()=>drafts.add(value));}}
  void _snack(String m)=>ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(m)));
}

class _P0Form extends StatefulWidget { final _YandalScreenState parent; final List<String> crew; const _P0Form({required this.parent,required this.crew}); @override State<_P0Form> createState()=>_P0FormState(); }
class _P0FormState extends State<_P0Form> {
  final picker=ImagePicker(),other=TextEditingController(),area=TextEditingController(); String? job,feeder,section; final Map<String,File> photos={}; final Map<String,String> coords={},accuracy={}; bool busy=false;
  @override Widget build(BuildContext context){final sections=widget.parent.sectionMap[feeder]??[];return Scaffold(appBar:AppBar(title:const Text('Tambah Penugasan Khusus')),body:ListView(padding:const EdgeInsets.all(16),children:[DropdownButtonFormField<String>(value:job,decoration:const InputDecoration(labelText:'Nama Pekerjaan',border:OutlineInputBorder()),items:widget.parent.jobs.map((v)=>DropdownMenuItem(value:v,child:Text(v))).toList(),onChanged:(v)=>setState(()=>job=v)),if((job??'').toLowerCase()=='lain - lain')... [const SizedBox(height:12),TextField(controller:other,decoration:const InputDecoration(labelText:'Pekerjaan Lainnya',border:OutlineInputBorder()))],const SizedBox(height:12),DropdownButtonFormField<String>(value:feeder,decoration:const InputDecoration(labelText:'Penyulang',border:OutlineInputBorder()),items:widget.parent.feeders.map((v)=>DropdownMenuItem(value:v,child:Text(v))).toList(),onChanged:(v)=>setState((){feeder=v;section=null;})),const SizedBox(height:12),DropdownButtonFormField<String>(value:sections.contains(section)?section:null,decoration:const InputDecoration(labelText:'Section',border:OutlineInputBorder()),items:sections.map((v)=>DropdownMenuItem(value:v,child:Text(v))).toList(),onChanged:(v)=>setState(()=>section=v)),const SizedBox(height:12),TextField(controller:area,decoration:const InputDecoration(labelText:'Daerah',border:OutlineInputBorder())),const SizedBox(height:20),...['sebelum','pekerjaan','selesai'].map(_photo),const SizedBox(height:20),ElevatedButton(onPressed:busy?null:_save,child:Text(busy?'Menyimpan...':'Simpan draft P0'))]));}
  Widget _photo(String key)=>Card(child:ListTile(leading:photos[key]==null?const Icon(Icons.camera_alt):Image.file(photos[key]!,width:52,height:52,fit:BoxFit.cover),title:Text('Foto ${key[0].toUpperCase()}${key.substring(1)}'),subtitle:Text(coords[key]==null?'Belum diambil':'${coords[key]} • ${accuracy[key]}'),trailing:TextButton(onPressed:busy?null:()=>_take(key),child:const Text('Ambil Foto'))));
  Future<void> _take(String key)async{setState(()=>busy=true);try{final loc=await AccurateLocationService.capture();final image=await picker.pickImage(source:ImageSource.camera,imageQuality:75);if(image==null)return;setState((){photos[key]=File(image.path);coords[key]=loc.coordinates;accuracy[key]=loc.accuracyLabel;});}on AccurateLocationException catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.message),backgroundColor:AppColors.red600));}finally{if(mounted)setState(()=>busy=false);}}
  Future<void> _save()async{if(job==null||feeder==null||section==null){ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Pekerjaan, penyulang, dan section wajib diisi.')));return;}final now=DateTime.now();Navigator.pop(context,{'localId':'LOCAL-P0-${now.microsecondsSinceEpoch}','shiftKey':widget.parent.shiftKey,'pekerjaan':job,'pekerjaanLainnya':other.text.trim(),'penyulang':feeder,'section':section,'daerah':area.text.trim(),'petugas':widget.crew,'fotoSebelum':photos['sebelum']?.path,'koordinatSebelum':coords['sebelum'],'akurasiSebelum':accuracy['sebelum'],'fotoPekerjaan':photos['pekerjaan']?.path,'koordinatPekerjaan':coords['pekerjaan'],'akurasiPekerjaan':accuracy['pekerjaan'],'fotoSelesai':photos['selesai']?.path,'koordinatSelesai':coords['selesai'],'akurasiSelesai':accuracy['selesai'],'createdAt':now.toIso8601String()});}
}
