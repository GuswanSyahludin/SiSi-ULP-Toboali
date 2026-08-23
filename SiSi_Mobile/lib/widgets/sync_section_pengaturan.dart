import 'dart:async';
import 'package:flutter/material.dart';

import '../db/app_database.dart';
import '../db/db_provider.dart';
import '../db/repositories/master_gardu_repository.dart';
import '../db/repositories/p0_repository.dart';
import '../db/repositories/sync_repository.dart';
import '../theme/app_colors.dart';

class SyncSectionPengaturan extends StatefulWidget {
  final Map<String,dynamic> sesi;
  const SyncSectionPengaturan({super.key,required this.sesi});
  @override State<SyncSectionPengaturan> createState()=>_State();
}

class _State extends State<SyncSectionPengaturan>{
  final repo=SyncRepository();
  StreamSubscription<List<SyncInfo>>? s1;
  StreamSubscription<List<P0Outbox>>? s2;
  StreamSubscription<List<GarduOutbox>>? s3;
  Map<String,SyncInfo> status={}; List<P0Outbox> p0=[]; List<GarduOutbox> gardu=[];
  String device='…'; final Set<String> proses={};
  String get token=>(widget.sesi['token']??'').toString();

  @override void initState(){super.initState();
    s1=DbProvider.instance.syncDao.pantauSemua().listen((v){if(mounted)setState(()=>status={for(final x in v)x.key:x});});
    s2=P0Repository().pantauAntrean().listen((v){if(mounted)setState(()=>p0=v);});
    s3=MasterGarduRepository().pantauAntrean().listen((v){if(mounted)setState(()=>gardu=v);});
    repo.perangkatId().then((v){if(mounted)setState(()=>device=v);});
  }
  @override void dispose(){s1?.cancel();s2?.cancel();s3?.cancel();super.dispose();}

  Future<void> run(String key,Future<Map<String,dynamic>> Function() fn)async{
    if(proses.contains(key))return;setState(()=>proses.add(key));final r=await fn();
    if(!mounted)return;setState(()=>proses.remove(key));final ok=r['ok']==true;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text((r['message']??(ok?'Selesai':'Gagal')).toString()),backgroundColor:ok?const Color(0xFF059669):Colors.redAccent));
  }

  @override Widget build(BuildContext context){
    final info=status[SyncRepository.modulMasterData];final siap=info!=null&&info.lastSyncAt.isNotEmpty;
    return Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      const Text('Data & Server Lokal',style:TextStyle(fontSize:14,fontWeight:FontWeight.bold,color:AppColors.navy700)),
      const SizedBox(height:4),Text('ID server lokal HP ini: $device',style:const TextStyle(fontSize:11,color:Color(0xFF64748B))),
      const SizedBox(height:10),
      _tile(
        icon:siap?Icons.sync_rounded:Icons.cloud_download_rounded,
        title:siap?'Sinkron Data':'Download Master Data',
        subtitle:proses.contains('master')?'Mengirim perubahan & menarik master terbaru…':
          siap?'Penyulang + Master Gardu. ${gardu.isEmpty?'Semua tersinkron':'${gardu.length} edit Gardu menunggu kirim'}':'Siapkan penyulang dan Master Gardu di HP',
        color:gardu.isNotEmpty?const Color(0xFFB45309):AppColors.navy700,
        busy:proses.contains('master'),
        onTap:()=>run('master',()=>repo.downloadMasterData(token)),
      ),
      if(p0.isNotEmpty)...[
        const SizedBox(height:10),
        _tile(icon:Icons.cloud_upload_rounded,title:'Kirim Keputusan Verifikasi P0 (${p0.length})',
          subtitle:'Tersimpan di HP, ketuk untuk kirim ke Apps Script & gsheet',color:const Color(0xFFB45309),
          busy:proses.contains('p0'),onTap:()=>run('p0',repo.sinkronVerifikasiP0)),
      ]
    ]);
  }


  Widget _tile({required IconData icon,required String title,required String subtitle,required Color color,required bool busy,required VoidCallback onTap})=>
    Card(elevation:0,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(12),side:BorderSide(color:color.withOpacity(.25))),
      child:ListTile(contentPadding:const EdgeInsets.symmetric(horizontal:16,vertical:6),
        leading:Container(padding:const EdgeInsets.all(8),decoration:BoxDecoration(color:color.withOpacity(.1),borderRadius:BorderRadius.circular(8)),child:Icon(icon,color:color)),
        title:Text(title,style:const TextStyle(fontWeight:FontWeight.bold,fontSize:14,color:AppColors.navy700)),
        subtitle:Text(subtitle,style:const TextStyle(fontSize:12,color:Color(0xFF64748B))),
        trailing:busy?const SizedBox(width:22,height:22,child:CircularProgressIndicator(strokeWidth:2)):Icon(Icons.chevron_right_rounded,color:color),
        onTap:busy?null:onTap));
}
