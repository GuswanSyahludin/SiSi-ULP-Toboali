import 'package:flutter/material.dart';
import '../db/repositories/engine_usage_repository.dart';
import '../theme/app_colors.dart';

class EngineUsageScreen extends StatefulWidget{
  final VoidCallback? onBack;
  const EngineUsageScreen({super.key,this.onBack});
  @override State<EngineUsageScreen> createState()=>_EngineUsageScreenState();
}
class _EngineUsageScreenState extends State<EngineUsageScreen>{
  final repo=EngineUsageRepository(); List<EngineUsageItem> items=[]; bool loading=true; String? error;
  @override void initState(){super.initState();_load();}
  Future<void> _load()async{setState((){loading=true;error=null;});try{final v=await repo.load();if(mounted)setState((){items=v;loading=false;});}catch(e){if(mounted)setState((){error=e.toString().replaceFirst('Exception: ','');loading=false;});}}
  @override Widget build(BuildContext context){final total=items.fold<int>(0,(a,b)=>a+b.count);final maxLevel=items.fold<int>(0,(a,b)=>a>b.level?a:b.level);return Scaffold(
    backgroundColor:const Color(0xFFF5F7FB),appBar:AppBar(backgroundColor:AppColors.navy700,foregroundColor:Colors.white,
      leading:IconButton(onPressed:widget.onBack??()=>Navigator.maybePop(context),icon:const Icon(Icons.arrow_back_rounded)),
      title:const Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Pemakaian Engine',style:TextStyle(fontSize:17,fontWeight:FontWeight.w900)),Text('Counter lokal instance aktif',style:TextStyle(fontSize:10,color:Colors.white70))]),
      actions:[IconButton(onPressed:loading?null:_load,icon:const Icon(Icons.refresh_rounded))]),
    body:loading?const Center(child:CircularProgressIndicator()):error!=null?_error():RefreshIndicator(onRefresh:_load,child:ListView(padding:const EdgeInsets.all(16),children:[
      Row(crossAxisAlignment:CrossAxisAlignment.end,children:[Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('TOTAL REQUEST HARI INI',style:TextStyle(fontSize:10,letterSpacing:.8,color:AppColors.neutral500)),Text('$total',style:const TextStyle(fontSize:32,fontWeight:FontWeight.w900,color:AppColors.navy700))])),_status(maxLevel)]),
      const Divider(height:32),...items.map(_engine),Container(margin:const EdgeInsets.only(top:8),padding:const EdgeInsets.all(13),decoration:BoxDecoration(color:const Color(0xFFFFF7E6),borderRadius:BorderRadius.circular(13),border:Border.all(color:const Color(0xFFF3D7A0))),child:const Text('Angka berasal dari instance Cloud Run yang sedang aktif. Cold start atau redeploy dapat mereset counter. Ini indikator trafik, bukan tagihan Cloud Run.',style:TextStyle(fontSize:11,height:1.45,color:AppColors.amber700)))
    ])));
  }
  Widget _status(int level){final danger=level>=95,warn=level>=70;final c=danger?AppColors.red600:warn?AppColors.amber700:AppColors.success700;return Container(padding:const EdgeInsets.symmetric(horizontal:10,vertical:6),decoration:BoxDecoration(color:c.withOpacity(.1),borderRadius:BorderRadius.circular(20)),child:Text(danger?'DIBATASI':warn?'WASPADA':'AMAN',style:TextStyle(fontSize:10,fontWeight:FontWeight.w900,color:c)));}
  Widget _engine(EngineUsageItem e){final percent=(e.ratio*100).clamp(0,100);final c=e.level>=95?AppColors.red600:e.level>=70?AppColors.amber700:AppColors.success700;final label=e.service=='wm-engine'?'Watermark Engine':e.service=='ba-pdf-engine'?'BA PDF Engine':'ROW PDF Engine';return Padding(padding:const EdgeInsets.only(bottom:24),child:Column(children:[Row(children:[Container(width:42,height:42,alignment:Alignment.center,decoration:BoxDecoration(color:AppColors.navy100,borderRadius:BorderRadius.circular(13)),child:Text(e.service=='wm-engine'?'WM':e.service=='ba-pdf-engine'?'BA':'ROW',style:const TextStyle(fontSize:10,fontWeight:FontWeight.w900,color:AppColors.navy700))),const SizedBox(width:11),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(label,style:const TextStyle(fontSize:14,fontWeight:FontWeight.w900)),Text(e.service,style:const TextStyle(fontSize:10,color:AppColors.neutral500))])),Column(crossAxisAlignment:CrossAxisAlignment.end,children:[Text('${e.count}',style:const TextStyle(fontSize:16,fontWeight:FontWeight.w900)),Text('dari ${e.budget}',style:const TextStyle(fontSize:9,color:AppColors.neutral500))])]),const SizedBox(height:12),ClipRRect(borderRadius:BorderRadius.circular(5),child:LinearProgressIndicator(value:percent/100,minHeight:7,backgroundColor:AppColors.neutral200,valueColor:AlwaysStoppedAnimation(c))),const SizedBox(height:6),Row(children:[Text('${percent.toStringAsFixed(1)}%',style:const TextStyle(fontSize:10,color:AppColors.neutral500)),const Spacer(),const Text('Guard 70%',style:TextStyle(fontSize:10,color:AppColors.neutral500))]),const SizedBox(height:10),Row(children:[Expanded(child:_kv('Sisa lokal','${(e.budget-e.count).clamp(0,e.budget)}')),Expanded(child:_kv('Payload maks.','${(e.maxBodyBytes/1000000).round()} MB'))]) ]));}
  Widget _kv(String a,String b)=>Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(a,style:const TextStyle(fontSize:9,color:AppColors.neutral500)),Text(b,style:const TextStyle(fontSize:11,fontWeight:FontWeight.w800))]);
  Widget _error()=>Center(child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisSize:MainAxisSize.min,children:[const Icon(Icons.cloud_off_rounded,size:46,color:AppColors.red600),const SizedBox(height:10),Text(error!,textAlign:TextAlign.center),const SizedBox(height:14),ElevatedButton(onPressed:_load,child:const Text('Coba Lagi'))])));
}
