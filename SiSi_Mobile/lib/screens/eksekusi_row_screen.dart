import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../services/local_watermark_data.dart';
import '../services/petugas_photo_flow.dart';
import '../services/petugas_photo_store.dart';
import '../db/repositories/master_repository.dart';
import '../widgets/accurate_gps_button.dart';
import '../theme/app_colors.dart';

class EksekusiRowScreen extends StatefulWidget {
  final Map<String,dynamic> sesi;
  final String? targetSubTim,targetTim;
  const EksekusiRowScreen({super.key,required this.sesi,this.targetSubTim,this.targetTim});
  @override State<EksekusiRowScreen> createState()=>_RowState();
}
class _RowState extends State<EksekusiRowScreen>{
  DateTime? date;
  bool loading=false,searched=false;
  String? error;
  int request=0;
  List<Map<String,dynamic>> rows=[];
  String get sub=>(widget.targetSubTim??widget.sesi['subTim']??widget.sesi['tim']??'ROW 01').toString();
  bool get filter=>{'admin','super user'}.contains('${widget.sesi['role']}'.toLowerCase());
  String iso(DateTime d)=>'${d.year}-${d.month.toString().padLeft(2,'0')}-${d.day.toString().padLeft(2,'0')}';
  @override void initState(){super.initState();if(!filter){date=DateTime.now();load();}}
  Future<void> pick()async{final d=await showDatePicker(context:context,initialDate:date??DateTime.now(),firstDate:DateTime(2025),lastDate:DateTime.now());if(d!=null&&mounted){setState(()=>date=d);await load();}}
  Future<void> load()async{if(date==null)return;final ticket=++request;setState((){loading=true;searched=true;error=null;});try{final r=await ApiService.getEksekusiRow(token:'${widget.sesi['token']??''}',subTim:sub,tanggal:iso(date!));if(!mounted||ticket!=request)return;if(r['success']!=true)throw StateError('${r['message']}');setState(()=>rows=(r['data'] as List? ?? []).map((e)=>Map<String,dynamic>.from(e as Map)).toList());}catch(e){if(mounted&&ticket==request)setState(()=>error='$e');}finally{if(mounted&&ticket==request)setState(()=>loading=false);}}
  int stage(Map<String,dynamic>x)=>'${x['fotoSesudahUrl']??''}'.isNotEmpty?3:'${x['fotoPekerjaanUrl']??''}'.isNotEmpty?2:'${x['fotoSebelumUrl']??''}'.isNotEmpty?1:0;
  Future<void> form([Map<String,dynamic>? item])async{await Navigator.push(context,MaterialPageRoute(builder:(_)=>_RowPhotoForm(sesi:widget.sesi,sub:sub,item:item)));if(mounted)await load();}
  Future<void> photo(Map<String,dynamic>x,String slot,String url)async{
    final p=await PetugasPhotoStore.find(owner:PetugasPhotoStore.owner(widget.sesi),team:WatermarkTeam.row,code:'${x['kodeEksekusi']??''}',slot:slot);
    if(mounted)await PetugasPhotoFlow.open(context,photo:p,legacyUrl:url,title:'Foto $slot');
  }
  Future<void> maps(String coord)async{if(coord.trim().isEmpty)return;try{await launchUrl(Uri.https('www.google.com','/maps/search/',{'api':'1','query':coord}),mode:LaunchMode.externalApplication);}catch(_){}}
  Widget photos(Map<String,dynamic>x)=>Row(children:[for(final e in const {'Sebelum':'fotoSebelumUrl','Pekerjaan':'fotoPekerjaanUrl','Sesudah':'fotoSesudahUrl'}.entries)Expanded(child:Padding(padding:const EdgeInsets.all(4),child:InkWell(onTap:() => photo(x,e.key,'${x[e.value]??''}'),child:Column(children:[SizedBox(height:76,child:'${x[e.value]??''}'.isEmpty?const Center(child:Icon(Icons.image_not_supported_outlined)):Image.network('${x[e.value]}',fit:BoxFit.cover,errorBuilder:(_,__,___)=>const Icon(Icons.broken_image_outlined))),Text(e.key,style:const TextStyle(fontSize:11)),const Icon(Icons.open_in_full,size:14)]))))]);
  void detail(Map<String,dynamic>x){showModalBottomSheet(context:context,isScrollControlled:true,useSafeArea:true,builder:(ctx)=>SizedBox(height:MediaQuery.sizeOf(ctx).height*.8,child:ListView(padding:const EdgeInsets.all(20),children:[Text('${x['kodeEksekusi']}',style:const TextStyle(fontSize:20,fontWeight:FontWeight.bold)),const SizedBox(height:12),for(final e in x.entries.where((e)=>!e.key.toLowerCase().contains('foto')&&!e.key.startsWith('tampil')))Padding(padding:const EdgeInsets.symmetric(vertical:5),child:Text('${e.key}: ${e.value}')),TextButton.icon(onPressed:()=>maps('${x['koordinatPekerjaan']??x['koordinatTiang']??''}'),icon:const Icon(Icons.map_outlined),label:const Text('Buka lokasi')),photos(x),const Text('Ketuk foto untuk pratinjau dan download watermark jika indikator lengkap.',style:TextStyle(fontSize:12)),if(stage(x)<3)FilledButton(onPressed:(){Navigator.pop(ctx);form(x);},child:Text(stage(x)<2?'Lanjutkan Foto Pekerjaan':'Selesaikan Foto Sesudah'))])));}

  Widget _body() {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(error!),
              TextButton(onPressed: load, child: const Text('Coba lagi')),
            ],
          ),
        ),
      );
    }
    if (!searched) {
      return const Center(child: Text('Pilih tanggal untuk melihat eksekusi.'));
    }
    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Text('${rows.length} titik pekerjaan',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          if (rows.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Text('Belum ada eksekusi pada tanggal ini.'),
            ),
          for (final x in rows)
            Card(
              child: InkWell(
                onTap: () => detail(x),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${x['kodeEksekusi']}',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      Text('${x['penyulang']} / ${x['section']}'),
                      Text('${x['jenisPekerjaan']} · ${x['diameter']} cm'),
                      Text(
                        'Input: ${x['inputOleh'] ?? ''} · ${stage(x)}/3 ${stage(x) == 3 ? 'Selesai' : ''}',
                        style: const TextStyle(fontSize: 12),
                      ),
                      photos(x),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.neutral100,
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Eksekusi Pekerjaan', style: TextStyle(fontSize: 18)),
            Text('$sub · ${date == null ? 'Pilih tanggal' : iso(date!)}',
                style: const TextStyle(fontSize: 12)),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => date == null ? pick() : load(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.amber600,
        onPressed: () => form(),
        icon: const Icon(Icons.add_a_photo),
        label: const Text('Input Eksekusi'),
      ),
      body: Column(
        children: [
          if (filter)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: pick,
                      icon: const Icon(Icons.calendar_today),
                      label: Text(date == null ? 'Pilih tanggal' : iso(date!)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: () => date == null ? pick() : load(),
                    child: const Text('Cari'),
                  ),
                ],
              ),
            ),
          Expanded(child: _body()),
        ],
      ),
    );
  }
}
class _RowPhotoForm extends StatefulWidget{
  final Map<String,dynamic> sesi;
  final String sub;
  final Map<String,dynamic>? item;
  const _RowPhotoForm({required this.sesi,required this.sub,this.item});
  @override State<_RowPhotoForm> createState()=>_FormState();
}
class _FormState extends State<_RowPhotoForm>{
  final tiang=TextEditingController(),koorTiang=TextEditingController(),koorKerja=TextEditingController(),diameter=TextEditingController(text:'0');
  List<String> feeders=[];Map<String,List<String>> sections={};String? feeder,section,error;
  bool loading=true,busy=false,saved=false;
  PetugasPhoto? image;String? receipt,createdAt;
  bool get initial=>widget.item==null;
  String get slot=>initial?'Sebelum':'${widget.item!['fotoPekerjaanUrl']??''}'.isEmpty?'Pekerjaan':'Sesudah';
  String get code=>receipt??'${widget.item?['kodeEksekusi']??''}';
  String get owner=>PetugasPhotoStore.owner(widget.sesi);
  String get jenis{final n=num.tryParse(diameter.text)??0;return n>50?'Tebang Besar':n>0?'Tebang Sedang':'Rabas / Pangkas';}
  @override void initState(){super.initState();if(initial){createdAt=DateTime.now().toUtc().toIso8601String();master();}else{feeder='${widget.item!['penyulang']??''}';section='${widget.item!['section']??''}';prior();}}
  Future<void> prior()async{final p=await PetugasPhotoStore.find(owner:owner,team:WatermarkTeam.row,code:code,slot:'Sebelum');if(mounted)setState((){createdAt=p?.metadata['createdAt'] as String?;loading=false;});}
  Future<void> master()async{try{final repo=MasterRepository();feeders=await repo.daftarPenyulang();sections=await repo.sectionByPenyulang();if(feeders.isEmpty){final r=await ApiService.getDropdownRow(token:'${widget.sesi['token']??''}');if(r['success']!=true)throw StateError('${r['message']}');feeders=List<String>.from(r['penyulang']??[]);sections=Map<String,dynamic>.from(r['sectionByPenyulang']??{}).map((k,v)=>MapEntry(k,List<String>.from(v)));await repo.simpanDariApi(feeders,sections);}}catch(e){error='$e';}finally{if(mounted)setState(()=>loading=false);}}
  @override void dispose(){tiang.dispose();koorTiang.dispose();koorKerja.dispose();diameter.dispose();super.dispose();}
  Future<void> take()async{if(busy||saved)return;setState(()=>busy=true);try{final p=await PetugasPhotoFlow.capture(context,owner:owner,team:WatermarkTeam.row,slot:slot,fields:{'ulp':widget.item?['ulp']??widget.sesi['ulp'],'penyulang':feeder??'','section':section??'','jenisPekerjaan':initial?jenis:widget.item!['jenisPekerjaan'],'createdAt':createdAt});if(p!=null&&mounted)setState(()=>image=p);}catch(e){if(mounted)setState(()=>error='$e');}finally{if(mounted)setState(()=>busy=false);}}
  Future<void> save()async{
    if(busy||saved)return;
    if(image==null||(initial&&(feeder==null||section==null||koorTiang.text.trim().isEmpty))){setState(()=>error='Lengkapi penyulang, section, koordinat tiang, dan foto.');return;}
    setState((){busy=true;error=null;});
    try{
      final bytes=base64Encode(await File(image!.path).readAsBytes());
      final r=initial?await ApiService.simpanEksekusiRow(token:'${widget.sesi['token']??''}',penyulang:feeder!,section:section!,nomorTiang:tiang.text.trim(),koordinatTiang:koorTiang.text.trim(),koordinatPekerjaan:koorKerja.text.trim().isEmpty?koorTiang.text.trim():koorKerja.text.trim(),diameter:num.tryParse(diameter.text)??0,fotoSebelumBase64:bytes):await ApiService.updateEksekusiRow(token:'${widget.sesi['token']??''}',kodeEksekusi:code,fotoPekerjaanBase64:slot=='Pekerjaan'?bytes:null,fotoSesudahBase64:slot=='Sesudah'?bytes:null);
      if(r['success']!=true)throw StateError('${r['message']??'Gagal menyimpan'}');
      receipt=initial?'${r['kodeEksekusi']??''}':code;
      saved=true; // Never retry the business save merely because local receipt persistence fails.
      image=PetugasPhoto(image!.path,PetugasPhotoStore.withReceipt(image!.metadata,code));
      await PetugasPhotoStore.bind(owner:owner,team:WatermarkTeam.row,code:code,slot:slot,photo:image!);
    }catch(e){error=saved?'Pekerjaan sudah tersimpan, tetapi referensi foto lokal belum tersimpan: $e':'$e';}
    finally{if(mounted)setState(()=>busy=false);}
  }
  Widget field(String label,TextEditingController c,{bool gps=false})=>Padding(padding:const EdgeInsets.only(bottom:12),child:TextField(controller:c,enabled:!busy&&!saved,keyboardType:c==diameter?TextInputType.number:TextInputType.text,decoration:InputDecoration(labelText:label,border:const OutlineInputBorder(),suffixIcon:gps?AccurateGpsButton(controller:c):null)));

  Widget _formBody() {
    if (loading) return const Center(child: CircularProgressIndicator());
    return AbsorbPointer(
      absorbing: busy,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (error != null)
            Padding(padding: const EdgeInsets.only(bottom: 12),
                child: Text(error!, style: const TextStyle(color: Colors.red))),
          if (initial) ...[
            DropdownButtonFormField<String>(
              value: feeder,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Penyulang'),
              items: feeders.map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
              onChanged: saved ? null : (v) => setState(() { feeder = v; section = null; }),
            ),
            DropdownButtonFormField<String>(
              value: section,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Section'),
              items: (sections[feeder] ?? []).map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
              onChanged: saved ? null : (v) => setState(() => section = v),
            ),
            const SizedBox(height: 16),
            field('Nomor Tiang (opsional)', tiang),
            field('Koordinat Tiang', koorTiang, gps: true),
            field('Koordinat Pekerjaan', koorKerja, gps: true),
            field('Diameter (cm)', diameter),
          ] else
            Text('$code · $feeder / $section'),
          if (image != null)
            InkWell(
              onTap: () => PetugasPhotoFlow.open(context, photo: image, title: 'Foto $slot'),
              child: Image.file(File(image!.path), height: 200, fit: BoxFit.contain),
            ),
          if (!saved)
            OutlinedButton.icon(
              onPressed: busy ? null : take,
              icon: const Icon(Icons.camera_alt),
              label: Text(image == null ? 'Ambil / pilih foto' : 'Ganti foto'),
            ),
          if (image != null)
            TextButton.icon(
              onPressed: () => PetugasPhotoFlow.open(context, photo: image, title: 'Foto $slot'),
              icon: const Icon(Icons.open_in_full),
              label: const Text('Lihat foto / watermark'),
            ),
          const Text(
            'Download hanya tersedia setelah kode resmi dan semua indikator per foto lengkap. Foto galeri tanpa metadata asli hanya dapat dipratinjau.',
            style: TextStyle(fontSize: 12),
          ),
          const SizedBox(height: 20),
          if (!saved)
            FilledButton(onPressed: busy ? null : save,
                child: Text(busy ? 'Menyimpan…' : 'Simpan progres'))
          else ...[
            Text('Progres tersimpan: $code', style: const TextStyle(fontWeight: FontWeight.bold)),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Selesai')),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !busy,
      child: Scaffold(
        appBar: AppBar(title: Text('Eksekusi ROW · $slot')),
        body: _formBody(),
      ),
    );
  }
}
