import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'accurate_location_service.dart';
import 'local_watermark_data.dart';
import 'local_watermark_renderer.dart';
import 'petugas_photo_store.dart';
import '../screens/local_watermark_preview_screen.dart';
import '../widgets/mock_gps_warning_dialog.dart';

class PetugasPhotoFlow {
  /// Retains gallery input for legacy workflows, but never invents its capture time/GPS.
  static Future<PetugasPhoto?> capture(BuildContext context,{required String owner,required WatermarkTeam team,required String slot,required Map<String,dynamic> fields}) async {
    final source=await showModalBottomSheet<ImageSource>(context:context,builder:(ctx)=>SafeArea(child:Wrap(children:[
      ListTile(leading:const Icon(Icons.camera_alt_outlined),title:const Text('Ambil dari Kamera Lapangan'),onTap:()=>Navigator.pop(ctx,ImageSource.camera)),
      ListTile(leading:const Icon(Icons.photo_library_outlined),title:const Text('Pilih dari Galeri'),subtitle:const Text('Unduh watermark terkunci bila metadata asli tidak tersedia.'),onTap:()=>Navigator.pop(ctx,ImageSource.gallery)),
    ])));
    if(source==null||!context.mounted)return null;
    try{
      final frozen=Map<String,dynamic>.from(fields);
      if(source==ImageSource.camera)await AccurateLocationService.capture();
      final image=await ImagePicker().pickImage(source:source,imageQuality:90);
      if(image==null||!context.mounted)return null;
      final returned=DateTime.now().toUtc();
      Map<String,dynamic> capture={};
      if(source==ImageSource.camera){
        try{
          final loc=await AccurateLocationService.capture();
          capture={'capturedAt':returned.toIso8601String(),'captureTimeSource':'camera-return','gpsCapturedAt':loc.position.timestamp.toUtc().toIso8601String(),'latitude':loc.position.latitude,'longitude':loc.position.longitude,'accuracyMeters':loc.accuracy,'isMocked':loc.position.isMocked};
        }on MockLocationException{if(context.mounted)await MockGpsWarningDialog.show(context);capture={'capturedAt':returned.toIso8601String(),'isMocked':true};}
        catch(_){capture={'capturedAt':returned.toIso8601String()};}
      }
      final metadata=PetugasPhotoStore.descriptor(team:team,slot:slot,fields:{...frozen,...capture,'photoSource':source==ImageSource.camera?'camera':'gallery'});
      return await PetugasPhotoStore.saveOriginal(owner:owner,source:File(image.path),metadata:metadata);
    }on MockLocationException{if(context.mounted)await MockGpsWarningDialog.show(context);return null;}
  }
  static Future<void> open(BuildContext context,{PetugasPhoto? photo,String? originalPath,String? legacyUrl,String title='Foto petugas'}) => Navigator.push<void>(context,MaterialPageRoute(builder:(_)=>_PhotoViewer(photo:photo,originalPath:originalPath,legacyUrl:legacyUrl,title:title)));
}
class _PhotoViewer extends StatefulWidget {
  final PetugasPhoto? photo;
  final String? originalPath,legacyUrl;
  final String title;
  const _PhotoViewer({this.photo,this.originalPath,this.legacyUrl,required this.title});
  @override State<_PhotoViewer> createState()=>_ViewerState();
}
class _ViewerState extends State<_PhotoViewer>{
  bool busy=false;
  String? error;
  final transform=TransformationController();
  @override void dispose(){transform.dispose();super.dispose();}
  Future<void> prepare()async{
    final photo=widget.photo;if(photo==null||busy||PetugasPhotoStore.missing(photo.metadata).isNotEmpty)return;
    setState((){busy=true;error=null;});
    try{
      final file=File(photo.path);
      if(await file.length()>40*1024*1024)throw StateError('Foto melebihi 40 MB.');
      final bytes=await file.readAsBytes();
      if(sha256.convert(bytes).toString()!=photo.metadata['originalSha256'])throw StateError('Foto asli berubah. Watermark tidak dibuat.');
      final result=await LocalWatermarkRenderer.render(originalBytes:bytes,data:PetugasPhotoStore.toData(photo.metadata));
      if(mounted)await Navigator.push(context,MaterialPageRoute(builder:(_)=>LocalWatermarkPreviewScreen(photo:result)));
    }catch(e){if(mounted)setState(()=>error=e.toString());}
    finally{if(mounted)setState(()=>busy=false);}
  }
  @override Widget build(BuildContext context){
    final photo=widget.photo,path=widget.photo?.path??widget.originalPath;
    final issues=photo==null?['Metadata asli per foto belum tersedia']:PetugasPhotoStore.missing(photo.metadata);
    Widget failure()=>const Center(child:Text('Foto tidak tersedia atau gagal dimuat.',style:TextStyle(color:Color(0xFFF4F8FA))));
    final image=path!=null&&path.isNotEmpty?Image.file(File(path),fit:BoxFit.contain,errorBuilder:(_,__,___)=>failure()):widget.legacyUrl?.isNotEmpty==true?Image.network(widget.legacyUrl!,fit:BoxFit.contain,errorBuilder:(_,__,___)=>failure()):failure();
    return PopScope(canPop:!busy,child:Scaffold(backgroundColor:const Color(0xFF152532),appBar:AppBar(title:Text(widget.title),actions:[IconButton(onPressed:()=>transform.value=Matrix4.identity(),tooltip:'Reset zoom',icon:const Icon(Icons.fit_screen))]),
      body:Column(children:[Expanded(child:InteractiveViewer(transformationController:transform,maxScale:5,child:Center(child:image))),
        ConstrainedBox(constraints:BoxConstraints(maxHeight:MediaQuery.sizeOf(context).height*.4),child:SingleChildScrollView(child:SafeArea(top:false,child:Padding(padding:const EdgeInsets.all(16),child:Column(children:[
          Text(issues.isEmpty?'Semua indikator tersedia. Foto asli tidak diubah.':'Download terkunci: ${issues.join(', ')}. Waktu dan GPS lama tidak diganti dengan data baru.',textAlign:TextAlign.center,style:const TextStyle(color:Color(0xFFCCDDE5),fontSize:13)),
          if(photo?.metadata['captureTimeSource']=='camera-return')const Text('Waktu foto dicatat saat kamera kembali ke aplikasi.',style:TextStyle(fontSize:11,color:Color(0xFFCCDDE5))),
          if(error!=null)Text(error!,style:const TextStyle(color:Color(0xFFFFD9CF))),const SizedBox(height:12),
          FilledButton.icon(onPressed:busy||issues.isNotEmpty?null:prepare,icon:Icon(issues.isEmpty?Icons.download:Icons.lock_outline),label:Text(busy?'Membuat watermark…':'Buat watermark & simpan')),
        ]))))),
      ])));
  }
}
