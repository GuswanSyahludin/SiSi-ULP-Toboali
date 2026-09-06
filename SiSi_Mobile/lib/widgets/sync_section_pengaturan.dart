import 'dart:async';
import 'package:flutter/material.dart';
import '../db/app_database.dart';
import '../db/db_provider.dart';
import '../db/repositories/master_gardu_repository.dart';
import '../db/repositories/p0_repository.dart';
import '../db/repositories/sync_repository.dart';
import '../theme/app_colors.dart';
import '../services/auto_sync_service.dart';
import '../services/sync_progress_service.dart';

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
  bool prosesP0=false;
  @override void initState(){super.initState();
    _syncSub=DbProvider.instance.syncDao.pantauSemua().listen((rows){if(mounted)setState(()=>status={for(final x in rows)x.key:x});});
    _p0Sub=P0Repository().pantauJumlahAntrean().listen((n){if(mounted)setState(()=>p0=n);});
    _garduSub=MasterGarduRepository().pantauAntrean().listen((rows){if(mounted)setState(()=>gardu=rows);});
    repo.perangkatId().then((s){if(mounted)setState(()=>device=s);});
  }
  @override void dispose(){_syncSub?.cancel();_p0Sub?.cancel();_garduSub?.cancel();super.dispose();}
  Future<void> _sync({bool onlyP0=false})async{
    if(prosesP0 || SyncProgressService.instance.state.value.running)return;if(onlyP0)setState(()=>prosesP0=true);
    Map<String,dynamic> r;
    try{r=onlyP0?await repo.sinkronVerifikasiP0():await repo.sinkronSemua((widget.sesi['token']??'').toString());if(!onlyP0&&r['ok']==true)await AutoSyncService.activate();}
    catch(e){r={'ok':false,'message':'Sinkron gagal: $e'};}
    finally{if(onlyP0&&mounted)setState(()=>prosesP0=false);}
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
      ValueListenableBuilder<SyncProgressState>(valueListenable:SyncProgressService.instance.state,builder:(context,progress,_){
        final busy=progress.running||prosesP0;
        final activeLabel=progress.datasetLabel.isEmpty?progress.stage:progress.datasetLabel;
        return Card(elevation:0,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(12)),child:InkWell(borderRadius:BorderRadius.circular(12),onTap:busy?null:()=>_sync(),child:Padding(padding:const EdgeInsets.all(16),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
          Row(children:[busy?const _SyncingIcon():const Icon(Icons.cloud_done_outlined,color:AppColors.navy700),const SizedBox(width:14),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(busy?'Sinkronisasi berjalan':'Sinkron Semua Data',style:const TextStyle(fontSize:14,fontWeight:FontWeight.bold)),const SizedBox(height:4),AnimatedSwitcher(duration:const Duration(milliseconds:260),switchInCurve:Curves.easeOutCubic,switchOutCurve:Curves.easeInCubic,child:Text(progress.running?progress.stage:total>0?'$p0 perubahan P0 · ${gardu.length} edit Gardu menunggu kirim':last!=null?'Sinkron terakhir ${last.hour.toString().padLeft(2,'0')}:${last.minute.toString().padLeft(2,'0')}':'Belum pernah sinkron',key:ValueKey(progress.running?progress.stage:'idle'),style:const TextStyle(fontSize:12)))])),if(progress.running)_StepPercent(target:progress.percent,style:const TextStyle(fontSize:13,fontWeight:FontWeight.w800,color:AppColors.navy700))else if(total>0)Text('$total')else const Icon(Icons.check_circle_outline)]),
          if(progress.running)...[const SizedBox(height:14),ClipRRect(borderRadius:BorderRadius.circular(4),child:TweenAnimationBuilder<double>(tween:Tween(end:progress.fraction),duration:const Duration(milliseconds:450),curve:Curves.easeOutCubic,builder:(context,value,_)=>LinearProgressIndicator(value:value,minHeight:7))),const SizedBox(height:10),Wrap(spacing:8,runSpacing:6,crossAxisAlignment:WrapCrossAlignment.center,children:[_ActiveDatasetChip(key:ValueKey(progress.dataset??progress.stage),label:activeLabel),if(progress.dataset!=null&&progress.datasetTotalRows>0)Chip(label:_StepPercent(key:ValueKey(progress.dataset),target:progress.datasetPercent),visualDensity:VisualDensity.compact)])],
          if(!progress.running&&progress.message!=null)...[const SizedBox(height:8),Text(progress.message!,style:TextStyle(fontSize:11,color:progress.failed?AppColors.red600:AppColors.success700))],
        ])))) ;
      }),
      if(p0>0) ...[
        const SizedBox(height:8),const Text('P0: koreksi jenis dikirim sebelum keputusan. Perubahan gagal tetap disimpan di HP.',style:TextStyle(fontSize:12,color:AppColors.neutral500)),
        TextButton.icon(onPressed:prosesP0||SyncProgressService.instance.state.value.running?null:()=>_sync(onlyP0:true),icon:const Icon(Icons.upload_outlined),label:Text('Kirim perubahan P0 ($p0)')),
      ],
    ]);
  }
}

class _SyncingIcon extends StatefulWidget {
  const _SyncingIcon();
  @override State<_SyncingIcon> createState()=>_SyncingIconState();
}
class _SyncingIconState extends State<_SyncingIcon> with SingleTickerProviderStateMixin{
  late final AnimationController _controller;
  @override void initState(){super.initState();_controller=AnimationController(vsync:this,duration:const Duration(milliseconds:950))..repeat();}
  @override void dispose(){_controller.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>RotationTransition(turns:CurvedAnimation(parent:_controller,curve:Curves.linear),child:const Icon(Icons.sync,color:AppColors.navy700));
}

class _ActiveDatasetChip extends StatefulWidget {
  final String label;
  const _ActiveDatasetChip({super.key,required this.label});
  @override State<_ActiveDatasetChip> createState()=>_ActiveDatasetChipState();
}
class _ActiveDatasetChipState extends State<_ActiveDatasetChip> with SingleTickerProviderStateMixin{
  late final AnimationController _controller;
  late final Animation<double> _scale;
  @override void initState(){super.initState();_controller=AnimationController(vsync:this,duration:const Duration(milliseconds:700))..repeat(reverse:true);_scale=Tween(begin:.97,end:1.03).animate(CurvedAnimation(parent:_controller,curve:Curves.easeInOutCubic));}
  @override void dispose(){_controller.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>ScaleTransition(scale:_scale,child:Chip(avatar:const Icon(Icons.downloading_rounded,size:16),label:AnimatedSwitcher(duration:const Duration(milliseconds:240),child:Text(widget.label,key:ValueKey(widget.label))),visualDensity:VisualDensity.compact));
}

class _StepPercent extends StatefulWidget {
  final int target;
  final TextStyle? style;
  const _StepPercent({super.key,required this.target,this.style});
  @override State<_StepPercent> createState()=>_StepPercentState();
}
class _StepPercentState extends State<_StepPercent>{
  Timer? _timer;
  int _shown=0;
  int get _target=>widget.target.clamp(0,100);
  @override void initState(){super.initState();_animate();}
  @override void didUpdateWidget(covariant _StepPercent oldWidget){super.didUpdateWidget(oldWidget);if(_target<_shown)_shown=_target;_animate();}
  void _animate(){_timer?.cancel();if(_shown>=_target)return;_timer=Timer.periodic(const Duration(milliseconds:28),(timer){if(!mounted||_shown>=_target){timer.cancel();return;}setState(()=>_shown++);});}
  @override void dispose(){_timer?.cancel();super.dispose();}
  @override Widget build(BuildContext context)=>Text('$_shown%',style:widget.style);
}
