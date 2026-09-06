import 'dart:io';
import 'package:flutter/material.dart';
import '../db/app_database.dart';
import '../db/repositories/inspeksi_gardu_repository.dart';
import '../db/repositories/master_gardu_repository.dart';
import '../db/repositories/master_repository.dart';
import '../db/repositories/temuan_teknik_repository.dart';
import '../services/local_watermark_data.dart';
import '../services/petugas_photo_flow.dart';
import '../services/petugas_photo_store.dart';
import '../widgets/accurate_gps_button.dart';
import '../theme/app_colors.dart';

class InputTemuanTeknikScreen extends StatefulWidget{
  final Map<String,dynamic> sesi;
  const InputTemuanTeknikScreen({super.key,required this.sesi});
  @override State<InputTemuanTeknikScreen> createState()=>_InputState();
}
class _InputState extends State<InputTemuanTeknikScreen>{
  final repo=TemuanTeknikRepository();
  final tiang=TextEditingController(),segmen=TextEditingController(),koorTiang=TextEditingController(),koorTemuan=TextEditingController(),description=TextEditingController();
  late final String createdAt;
  String object='Jaringan',tier='Tier 1';
  String? feeder,section,gardu,finding,error,officialCode;
  String? accuracyTiang,accuracyTemuan;
  List<String> feeders=[],findings=[];Map<String,List<String>> sections={};List<MasterGardu> gardus=[];
  PetugasPhoto? fotoTemuan,fotoObject;
  bool loading=true,loadingFindings=true,busy=false,saved=false;
  int lookup=0;
  bool get jaringan=>object=='Jaringan';
  WatermarkTeam get team=>jaringan?WatermarkTeam.inspeksiJaringan:WatermarkTeam.inspeksiGardu;
  String get owner=>PetugasPhotoStore.owner(widget.sesi);
  String get sub=>'${widget.sesi['subTim']??widget.sesi['tim']??''}';
  @override void initState(){super.initState();createdAt=DateTime.now().toUtc().toIso8601String();master();}
  @override void dispose(){for(final c in [tiang,segmen,koorTiang,koorTemuan,description])c.dispose();super.dispose();}
  Future<void> master()async{try{
    final r=MasterRepository();feeders=await r.daftarPenyulang();sections=await r.sectionByPenyulang();
    final role='${widget.sesi['role']??''}'.toLowerCase();final privileged=role=='super user'||role=='admin';final ulp=privileged?'':'${widget.sesi['ulp']??''}';
    gardus=await MasterGarduRepository().cari('',ulp:ulp,limit:5000);if(gardus.isEmpty&&ulp.isNotEmpty)gardus=await MasterGarduRepository().cari('',limit:5000);
    feeder=feeders.isEmpty?null:feeders.first;final ss=sections[feeder]??[];section=ss.isEmpty?null:ss.first;
  }catch(e){error='Master belum lengkap: $e';}finally{if(mounted)setState(()=>loading=false);}if(mounted)await loadFindings();}
  List<String> fallback()=>jaringan?tier=='Tier 1'?['Isolator retak / flashover','Andongan penghantar kendor','Arrester bocor / rusak','Crossarm miring / korosi']:['Tanda kilat / grounding putus','Guy wire kendor / putus','Pondasi tiang amblas','Jumperan kendor / korosi']:tier=='Tier 1'?['Fuse Cut Out (FCO) rusak/meleleh','Arrester gardu bocor','Bushing trafo rembes/pecah','Kabel LV keluar terbakar']:['Grounding netral trafo putus','Pintu gardu rusak/terbuka','Indikator oli rendah','Koneksi terminal korosi'];
  Future<void> loadFindings()async{final id=++lookup;setState(()=>loadingFindings=true);List<String> values=[];try{final rows=await InspeksiGarduRepository().pilihan(tier);values=rows.where((r)=>r.objekInspeksi.trim().isEmpty||r.objekInspeksi.toLowerCase()==object.toLowerCase()).map((r)=>r.temuan.trim()).where((s)=>s.isNotEmpty).toSet().toList()..sort();}catch(_){}if(!mounted||id!=lookup)return;if(values.isEmpty)values=fallback();setState((){findings=values;finding=values.isEmpty?null:values.first;loadingFindings=false;});}
  void changeObject(String value){if(busy||saved)return;setState((){object=value;gardu=null;tiang.clear();koorTiang.clear();koorTemuan.clear();accuracyTiang=null;accuracyTemuan=null;fotoTemuan=null;fotoObject=null;feeder=jaringan&&feeders.isNotEmpty?feeders.first:null;final s=sections[feeder]??[];section=s.isEmpty?null:s.first;});loadFindings();}
  void selectGardu(String? n){MasterGardu? g;for(final x in gardus){if(x.gardu==n){g=x;break;}}setState((){gardu=n;feeder=g?.penyulang;section=g?.section;koorTemuan.text=g!=null&&g.latitude.isNotEmpty&&g.longitude.isNotEmpty?'${g.latitude}, ${g.longitude}':'';accuracyTemuan=null;});}
  Future<void> take(bool temuan)async{if(busy||saved)return;setState(()=>busy=true);try{
    final p=await PetugasPhotoFlow.capture(context,owner:owner,team:team,slot:temuan?'Temuan':jaringan?'Tiang':'Gardu',fields:{'ulp':widget.sesi['ulp'],'createdAt':createdAt,'penyulang':feeder??'','section':section??'','nomorGardu':gardu??'','segmen':segmen.text.trim(),'temuan':finding??''});
    if(p!=null&&mounted)setState((){if(temuan)fotoTemuan=p;else fotoObject=p;});
  }catch(e){if(mounted)setState(()=>error='$e');}finally{if(mounted)setState(()=>busy=false);}}
  String? validate(){if(!jaringan&&(gardu==null||gardu!.isEmpty))return 'Pilih nomor gardu.';if(feeder==null||feeder!.isEmpty||section==null||section!.isEmpty)return 'Penyulang dan section wajib tersedia.';if(finding==null)return 'Pilih temuan.';if(jaringan&&tiang.text.trim().isEmpty)return 'Nomor tiang wajib diisi.';if(jaringan&&koorTiang.text.trim().isEmpty)return 'Ambil koordinat tiang.';if(koorTemuan.text.trim().isEmpty)return 'Koordinat temuan wajib tersedia.';if(fotoTemuan==null||fotoObject==null)return 'Lengkapi kedua foto.';return null;}
  Future<void> save()async{if(busy||saved)return;final problem=validate();if(problem!=null){setState(()=>error=problem);return;}setState((){busy=true;error=null;});try{
    final r=await repo.simpan(token:'${widget.sesi['token']??''}',objekInspeksi:object,penyulang:feeder!,section:section!,tier:tier,temuan:finding!,koordinat:koorTemuan.text.trim(),fotoTemuan:File(fotoTemuan!.path),fotoTiangAtauGardu:File(fotoObject!.path),segmen:segmen.text.trim(),nomorTiang:jaringan?tiang.text.trim():'',nomorGardu:jaringan?'':gardu!,koordinatTiang:jaringan?koorTiang.text.trim():'',petugasInspeksi:sub,deskripsi:description.text.trim());
    officialCode='${r['kodePekerjaan']??''}';saved=true;
    fotoTemuan=PetugasPhoto(fotoTemuan!.path,PetugasPhotoStore.withReceipt(fotoTemuan!.metadata,officialCode!));
    fotoObject=PetugasPhoto(fotoObject!.path,PetugasPhotoStore.withReceipt(fotoObject!.metadata,officialCode!));
    await PetugasPhotoStore.bind(owner:owner,team:team,code:officialCode!,slot:'Temuan',photo:fotoTemuan!);
    await PetugasPhotoStore.bind(owner:owner,team:team,code:officialCode!,slot:jaringan?'Tiang':'Gardu',photo:fotoObject!);
  }catch(e){error=saved?'Temuan sudah tersimpan, tetapi referensi foto lokal belum tersimpan: $e':'$e';}finally{if(mounted)setState(()=>busy=false);}}
  Widget dropdown(String label,String? value,List<String> options,ValueChanged<String?> changed)=>Padding(padding:const EdgeInsets.only(bottom:14),child:DropdownButtonFormField<String>(value:options.contains(value)?value:null,isExpanded:true,decoration:InputDecoration(labelText:label,border:const OutlineInputBorder()),items:options.toSet().map((s)=>DropdownMenuItem(value:s,child:Text(s,overflow:TextOverflow.ellipsis))).toList(),onChanged:busy||saved?null:changed));
  Widget field(String label,TextEditingController c,{bool gps=false,bool readOnly=false,int lines=1})=>Padding(padding:const EdgeInsets.only(bottom:14),child:TextField(controller:c,enabled:!busy&&!saved,readOnly:readOnly,maxLines:lines,decoration:InputDecoration(labelText:label,border:const OutlineInputBorder(),suffixIcon:gps?AccurateGpsButton(controller:c,showAccuracyFeedback:false,onCaptured:(r)=>setState((){if(c==koorTiang)accuracyTiang=r.accuracyLabel;else accuracyTemuan=r.accuracyLabel;})):null)));
  Widget photo(String title,PetugasPhoto? p,bool temuan)=>Column(children:[if(p!=null)InkWell(onTap:()=>PetugasPhotoFlow.open(context,photo:p,title:title),child:Image.file(File(p.path),height:120,fit:BoxFit.contain)),if(!saved)TextButton(onPressed:busy?null:()=>take(temuan),child:Text('Ambil / ganti $title')),if(p!=null)TextButton.icon(onPressed:busy?null:()=>PetugasPhotoFlow.open(context,photo:p,title:title),icon:const Icon(Icons.open_in_full,size:16),label:const Text('Lihat / watermark'))]);

  Widget _formBody() {
    if (loading) return const Center(child: CircularProgressIndicator());
    return AbsorbPointer(
      absorbing: busy,
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          if (error != null)
            Padding(padding: const EdgeInsets.only(bottom: 12),
                child: Text(error!, style: const TextStyle(color: Colors.red))),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'Jaringan', label: Text('Jaringan')),
              ButtonSegment(value: 'Gardu', label: Text('Gardu')),
            ],
            selected: {object},
            onSelectionChanged: saved ? null : (s) => changeObject(s.first),
          ),
          const SizedBox(height: 16),
          if (jaringan) ...[
            dropdown('Penyulang', feeder, feeders, (v) => setState(() {
              feeder = v;
              final s = sections[v] ?? [];
              section = s.isEmpty ? null : s.first;
            })),
            dropdown('Section', section, sections[feeder] ?? [], (v) => setState(() => section = v)),
          ] else ...[
            dropdown('Nomor Gardu', gardu, gardus.map((g) => g.gardu).toList(), selectGardu),
            Text('Penyulang: ${feeder ?? 'Belum tersedia'}\nSection: ${section ?? 'Belum tersedia'}'),
            const SizedBox(height: 16),
          ],
          field('Segmen', segmen),
          if (jaringan) ...[
            field('Nomor Tiang', tiang),
            field('Koordinat Tiang', koorTiang, gps: true, readOnly: true),
            if (accuracyTiang != null) Text('Akurasi $accuracyTiang'),
          ],
          dropdown('Tier', tier, ['Tier 1', 'Tier 2'], (v) {
            if (v != null) {
              setState(() => tier = v);
              loadFindings();
            }
          }),
          if (loadingFindings)
            const LinearProgressIndicator()
          else
            dropdown('Temuan', finding, findings, (v) => setState(() => finding = v)),
          field(jaringan ? 'Koordinat Temuan' : 'Koordinat Temuan (Master Gardu)',
              koorTemuan, gps: jaringan, readOnly: true),
          if (accuracyTemuan != null) Text('Akurasi $accuracyTemuan'),
          Text('Petugas Inspeksi: $sub', style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 14),
          field('Deskripsi / Catatan Lapangan', description, lines: 3),
          const Text('Untuk watermark, lengkapi indikator sebelum mengambil foto. GPS per foto diperiksa saat pengambilan; foto galeri tanpa metadata asli tidak dapat diekspor.'),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: photo('Foto Temuan', fotoTemuan, true)),
              Expanded(child: photo(jaringan ? 'Foto Tiang' : 'Foto Gardu', fotoObject, false)),
            ],
          ),
          const SizedBox(height: 20),
          if (!saved)
            FilledButton(onPressed: busy ? null : save,
                child: Text(busy ? 'Menyimpan…' : 'Simpan Temuan'))
          else ...[
            Text('Temuan tersimpan: $officialCode'),
            const Text('Buka foto di atas untuk membuat dan mengunduh watermark.'),
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
        backgroundColor: const Color(0xFFF6F8FC),
        appBar: AppBar(
          backgroundColor: AppColors.navy700,
          foregroundColor: Colors.white,
          title: const Text('Input Temuan'),
        ),
        body: _formBody(),
      ),
    );
  }
}
