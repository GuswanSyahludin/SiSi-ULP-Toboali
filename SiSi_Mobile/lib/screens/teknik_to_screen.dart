import 'package:flutter/material.dart';
import '../db/repositories/teknik_to_repository.dart';
import '../theme/app_colors.dart';

class TeknikToScreen extends StatefulWidget {
  final Map<String,dynamic> sesi;
  final String mode;
  const TeknikToScreen({super.key,required this.sesi,required this.mode});
  @override State<TeknikToScreen> createState()=>_TeknikToScreenState();
}

class _TeknikToScreenState extends State<TeknikToScreen>{
  final repo=TeknikToRepository();
  List<Map<String,dynamic>> rows=[];
  bool loading=true;
  String? error;
  bool get moving=>widget.mode=='move';
  String get title=>moving?'Pindah Tim Eksekusi TO':'Penugasan Tim';
  String get token=>(widget.sesi['token']??'').toString();
  @override void initState(){super.initState();load();}
  Future<void> load()async{setState((){loading=true;error=null;});try{final data=await repo.list(token,widget.mode);if(mounted)setState((){rows=data;loading=false;});}catch(e){if(mounted)setState((){error=e.toString().replaceFirst('Exception: ','');loading=false;});}}
  @override Widget build(BuildContext context)=>Scaffold(
    backgroundColor:const Color(0xFFF6F8FC),
    appBar:AppBar(backgroundColor:AppColors.navy700,foregroundColor:Colors.white,title:Text(title,style:const TextStyle(fontSize:17,fontWeight:FontWeight.w900)),actions:[IconButton(onPressed:load,icon:const Icon(Icons.refresh_rounded))]),
    body:_body(),
  );
  Widget _body(){if(loading)return const Center(child:CircularProgressIndicator(color:AppColors.cyan600));if(error!=null)return Center(child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisSize:MainAxisSize.min,children:[const Icon(Icons.cloud_off_rounded,size:44,color:AppColors.neutral400),const SizedBox(height:10),Text(error!,textAlign:TextAlign.center),const SizedBox(height:12),ElevatedButton(onPressed:load,child:const Text('Coba Lagi'))])));if(rows.isEmpty)return Center(child:Text(moving?'Tidak ada TO yang dapat dipindahkan.':'Tidak ada TO yang menunggu penugasan.',style:const TextStyle(color:AppColors.neutral500)));return RefreshIndicator(onRefresh:load,child:ListView.separated(padding:const EdgeInsets.all(16),itemCount:rows.length,separatorBuilder:(_,__)=>const SizedBox(height:10),itemBuilder:(_,i)=>_card(rows[i])));}
  Widget _card(Map<String,dynamic> r)=>Material(color:Colors.white,borderRadius:BorderRadius.circular(15),child:InkWell(onTap:()=>_detail(r),borderRadius:BorderRadius.circular(15),child:Padding(padding:const EdgeInsets.all(14),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('${r['kodePekerjaan']??'-'}',style:const TextStyle(fontSize:13,fontWeight:FontWeight.w900,color:AppColors.navy700),maxLines:1,overflow:TextOverflow.ellipsis),const SizedBox(height:8),Text('${r['temuan']??'-'}',style:const TextStyle(fontSize:14,fontWeight:FontWeight.w800)),const SizedBox(height:4),Text('${r['penyulang']??'-'} • ${r['section']??'-'}',style:const TextStyle(fontSize:11,color:AppColors.neutral500)),if('${r['timEksekusi']??''}'.trim().isNotEmpty)...[const SizedBox(height:8),Text('Tim saat ini: ${r['timEksekusi']}',style:const TextStyle(fontSize:11,fontWeight:FontWeight.w800,color:AppColors.cyan600))]]))));
  Future<void> _detail(Map<String,dynamic> r)async{await showModalBottomSheet(context:context,isScrollControlled:true,useSafeArea:true,backgroundColor:Colors.transparent,builder:(_)=>_ToDetailSheet(sesi:widget.sesi,mode:widget.mode,row:r));if(mounted)load();}
}

class _ToDetailSheet extends StatefulWidget{
  final Map<String,dynamic> sesi,row;final String mode;
  const _ToDetailSheet({required this.sesi,required this.mode,required this.row});
  @override State<_ToDetailSheet> createState()=>_ToDetailSheetState();
}
class _ToDetailSheetState extends State<_ToDetailSheet>{
  final repo=TeknikToRepository();final note=TextEditingController();List<String> teams=[];String? selected;bool loading=true,saving=false;String? error;
  @override void initState(){super.initState();loadTeams();}
  @override void dispose(){note.dispose();super.dispose();}
  Future<void> loadTeams()async{try{final list=await repo.teams('${widget.sesi['token']??''}','${widget.row['timEksekusi']??''}');if(mounted)setState((){teams=list;loading=false;});}catch(e){if(mounted)setState((){error=e.toString().replaceFirst('Exception: ','');loading=false;});}}
  Future<void> save()async{if(selected==null)return;setState(()=>saving=true);try{await repo.assign(token:'${widget.sesi['token']??''}',mode:widget.mode,kode:'${widget.row['kodePekerjaan']}',tim:selected!,catatan:note.text.trim());if(!mounted)return;Navigator.pop(context);ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(widget.mode=='move'?'Tim Eksekusi berhasil dipindahkan.':'Tim Eksekusi berhasil ditugaskan.'),backgroundColor:AppColors.success700));}catch(e){if(mounted)setState((){error=e.toString().replaceFirst('Exception: ','');saving=false;});}}
  @override Widget build(BuildContext context)=>DraggableScrollableSheet(expand:false,initialChildSize:.92,minChildSize:.65,maxChildSize:.98,builder:(_,controller)=>Material(color:const Color(0xFFF7F9FC),borderRadius:const BorderRadius.vertical(top:Radius.circular(24)),clipBehavior:Clip.antiAlias,child:Column(children:[Container(width:42,height:4,margin:const EdgeInsets.symmetric(vertical:12),decoration:BoxDecoration(color:AppColors.neutral300,borderRadius:BorderRadius.circular(8))),Padding(padding:const EdgeInsets.fromLTRB(18,0,8,10),child:Row(children:[Expanded(child:Text('${widget.row['kodePekerjaan']}',style:const TextStyle(fontSize:17,fontWeight:FontWeight.w900,color:AppColors.navy700))),IconButton(onPressed:()=>Navigator.pop(context),icon:const Icon(Icons.close_rounded))])),Expanded(child:ListView(controller:controller,padding:const EdgeInsets.fromLTRB(18,4,18,24),children:[_section('Rincian Temuan',[('Objek','${widget.row['objek']??'-'}'),('Tanggal','${widget.row['tanggal']??'-'}'),('Penyulang','${widget.row['penyulang']??'-'}'),('Section','${widget.row['section']??'-'}'),('Segmen','${widget.row['segmen']??'-'}'),('Nomor Tiang/Gardu','${('${widget.row['nomorGardu']??''}'.isNotEmpty?widget.row['nomorGardu']:widget.row['nomorTiang'])??'-'}'),('Tier','${widget.row['tier']??'-'}'),('Temuan','${widget.row['temuan']??'-'}'),('Deskripsi','${widget.row['deskripsi']??'-'}'),('Koordinat','${widget.row['koordinat']??'-'}'),('Tim Eksekusi Saat Ini','${widget.row['timEksekusi']??'-'}')]),const SizedBox(height:14),const Text('Tim Eksekusi',style:TextStyle(fontSize:12,fontWeight:FontWeight.w900)),const SizedBox(height:6),if(loading)const LinearProgressIndicator()else DropdownButtonFormField<String>(value:selected,isExpanded:true,decoration:InputDecoration(hintText:'Pilih tim eksekusi',filled:true,fillColor:Colors.white,border:OutlineInputBorder(borderRadius:BorderRadius.circular(12))),items:teams.map((t)=>DropdownMenuItem(value:t,child:Text(t))).toList(),onChanged:(v)=>setState(()=>selected=v)),const SizedBox(height:12),TextField(controller:note,maxLines:3,decoration:InputDecoration(labelText:'Catatan SPV (opsional)',filled:true,fillColor:Colors.white,border:OutlineInputBorder(borderRadius:BorderRadius.circular(12)))),if(error!=null)Padding(padding:const EdgeInsets.only(top:10),child:Text(error!,style:const TextStyle(color:AppColors.red600,fontSize:11)))])),SafeArea(top:false,child:Container(color:Colors.white,padding:const EdgeInsets.fromLTRB(18,12,18,14),child:SizedBox(width:double.infinity,height:48,child:ElevatedButton(onPressed:saving||selected==null?null:save,style:ElevatedButton.styleFrom(backgroundColor:AppColors.navy700,foregroundColor:Colors.white,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(12))),child:saving?const SizedBox.square(dimension:18,child:CircularProgressIndicator(strokeWidth:2,color:Colors.white)):Text(widget.mode=='move'?'Pindahkan Tim Eksekusi':'Simpan Penugasan',style:const TextStyle(fontWeight:FontWeight.w900))))))])));
  Widget _section(String title,List<(String,String)> rows)=>Container(padding:const EdgeInsets.all(15),decoration:BoxDecoration(color:Colors.white,border:Border.all(color:AppColors.neutral200),borderRadius:BorderRadius.circular(16)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title.toUpperCase(),style:const TextStyle(fontSize:10,letterSpacing:1,fontWeight:FontWeight.w900,color:AppColors.cyan600)),const SizedBox(height:8),...rows.map((r)=>Padding(padding:const EdgeInsets.symmetric(vertical:5),child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:[SizedBox(width:126,child:Text(r.$1,style:const TextStyle(fontSize:11,color:AppColors.neutral500))),Expanded(child:Text(r.$2.trim().isEmpty?'-':r.$2,style:const TextStyle(fontSize:11,fontWeight:FontWeight.w800)))]))) ]));
}
