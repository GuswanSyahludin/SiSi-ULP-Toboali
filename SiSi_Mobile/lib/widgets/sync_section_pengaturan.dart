import 'dart:async';
import 'package:flutter/material.dart';
import '../db/app_database.dart';
import '../db/db_provider.dart';
import '../db/repositories/master_gardu_repository.dart';
import '../db/repositories/p0_repository.dart';
import '../db/repositories/sync_repository.dart';
import '../theme/app_colors.dart';
import '../services/auto_sync_service.dart';

class SyncSectionPengaturan extends StatefulWidget {
  final Map<String,dynamic> sesi;
  const SyncSectionPengaturan({super.key,required this.sesi});
  @override State<SyncSectionPengaturan> createState()=>_State();
}
class _State extends State<SyncSectionPengaturan>{
  final repo=SyncRepository();
  StreamSubscription<List<SyncInfo>>? _syncSub;
  StreamSubscription<int>? _p0Sub;
  StreamSubscription<List<GarduOutbox>>? _garduSub;
  Map<String,SyncInfo> status={};
  int p0=0;
  List<GarduOutbox> gardu=[];
  String device='…';
  bool proses=false;
  @override void initState(){super.initState();
    _syncSub=DbProvider.instance.syncDao.pantauSemua().listen((rows){if(mounted)setState(()=>status={for(final x in rows)x.key:x});});
    _p0Sub=P0Repository().pantauJumlahAntrean().listen((n){if(mounted)setState(()=>p0=n);});
    _garduSub=MasterGarduRepository().pantauAntrean().listen((rows){if(mounted)setState(()=>gardu=rows);});
    repo.perangkatId().then((s){if(mounted)setState(()=>device=s);});
  }
  @override void dispose(){_syncSub?.cancel();_p0Sub?.cancel();_garduSub?.cancel();super.dispose();}
  Future<void> _sync({bool onlyP0=false})async{
    if(proses)return;setState(()=>proses=true);
    Map<String,dynamic> r;
    try{r=onlyP0?await repo.sinkronVerifikasiP0():await repo.sinkronSemua((widget.sesi['token']??'').toString());if(!onlyP0&&r['ok']==true)await AutoSyncService.activate();}
    catch(e){r={'ok':false,'message':'Sinkron gagal: $e'};}
    finally{if(mounted)setState(()=>proses=false);}
    if(!mounted)return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('${r['message']??(r['ok']==true?'Sinkron selesai':'Sinkron gagal')}'),backgroundColor:r['ok']==true?AppColors.success700:AppColors.red600,duration:const Duration(seconds:7)));
  }
  @override Widget build(BuildContext context){
    final info=status[SyncRepository.modulMasterData];
    final last=DateTime.tryParse(info?.lastSyncAt??'')?.toLocal();
    final total=p0+gardu.length;
    return Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      const Text('Data & Server Lokal',style:TextStyle(fontSize:14,fontWeight:FontWeight.bold,color:AppColors.navy700)),
      const SizedBox(height:4),Text('ID server lokal HP: $device',style:const TextStyle(fontSize:11,color:AppColors.neutral500)),const SizedBox(height:10),
      Card(elevation:0,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(12)),child:ListTile(contentPadding:const EdgeInsets.all(16),leading:Icon(proses?Icons.sync:Icons.cloud_done_outlined,color:AppColors.navy700),title:Text(proses?'Sinkronisasi berjalan':'Sinkron Semua Data',style:const TextStyle(fontSize:14,fontWeight:FontWeight.bold)),subtitle:Text(proses?'Sedang mengirim dan memuat data…':total>0?'$p0 perubahan P0 · ${gardu.length} edit Gardu menunggu kirim':last!=null?'Sinkron terakhir ${last.hour.toString().padLeft(2,'0')}:${last.minute.toString().padLeft(2,'0')}':'Belum pernah sinkron',style:const TextStyle(fontSize:12)),trailing:proses?const SizedBox(width:22,height:22,child:CircularProgressIndicator(strokeWidth:2)):total>0?Text('$total'):const Icon(Icons.check_circle_outline),onTap:proses?null:()=>_sync())),
      if(p0>0) ...[
        const SizedBox(height:8),const Text('P0: koreksi jenis dikirim sebelum keputusan. Perubahan gagal tetap disimpan di HP.',style:TextStyle(fontSize:12,color:AppColors.neutral500)),
        TextButton.icon(onPressed:proses?null:()=>_sync(onlyP0:true),icon:const Icon(Icons.upload_outlined),label:Text('Kirim perubahan P0 ($p0)')),
      ],
    ]);
  }
}
