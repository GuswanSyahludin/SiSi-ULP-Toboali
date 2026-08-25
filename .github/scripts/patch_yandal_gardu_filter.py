from pathlib import Path
p=Path('SiSi_Mobile/lib/screens/yandal_screen.dart')
s=p.read_text()
s=s.replace("import '../db/repositories/master_repository.dart';", "import '../db/app_database.dart';\nimport '../db/repositories/master_repository.dart';\nimport '../db/repositories/master_gardu_repository.dart';")
old="final picker=ImagePicker(),other=TextEditingController(),area=TextEditingController(); String? job,feeder,section; final Map<String,File> photos={};"
new="final picker=ImagePicker(),other=TextEditingController(),area=TextEditingController(); String? job,feeder,section,gardu; List<MasterGardu> gardus=[]; final Map<String,File> photos={};"
if old not in s: raise SystemExit('state anchor not found')
s=s.replace(old,new,1)
old_cb="onChanged:(v)=>setState((){feeder=v;section=null;})"
new_cb="onChanged:(v){setState((){feeder=v;section=null;gardu=null;gardus=[];});_loadGardus(v);}"
if old_cb not in s: raise SystemExit('feeder callback anchor not found')
s=s.replace(old_cb,new_cb,1)
anchor="const SizedBox(height:12),TextField(controller:area,decoration:const InputDecoration(labelText:'Daerah',border:OutlineInputBorder()))"
insert="const SizedBox(height:12),if((job??'').toLowerCase()=='pengecekan gardu')DropdownButtonFormField<String>(value:gardus.any((g)=>g.gardu==gardu)?gardu:null,isExpanded:true,decoration:const InputDecoration(labelText:'Nomor Gardu',border:OutlineInputBorder()),items:gardus.map((g)=>DropdownMenuItem(value:g.gardu,child:Text(g.gardu))).toList(),onChanged:gardus.isEmpty?null:(v)=>setState(()=>gardu=v)),if((job??'').toLowerCase()=='pengecekan gardu')const SizedBox(height:12),TextField(controller:area,decoration:const InputDecoration(labelText:'Daerah',border:OutlineInputBorder()))"
if anchor not in s: raise SystemExit('gardu field anchor not found')
s=s.replace(anchor,insert,1)
method_anchor="  Widget _photo(String key)=>"
method="  Future<void> _loadGardus(String? selectedFeeder) async {\n    if(selectedFeeder==null||selectedFeeder.trim().isEmpty)return;\n    final all=await MasterGarduRepository().cari('',ulp:(widget.parent.widget.sesi['ulp']??'').toString(),limit:5000);\n    final filtered=all.where((g)=>g.penyulang.trim().toLowerCase()==selectedFeeder.trim().toLowerCase()).toList()..sort((a,b)=>a.gardu.compareTo(b.gardu));\n    if(mounted)setState((){gardus=filtered;gardu=null;});\n  }\n"
if method_anchor not in s: raise SystemExit('method anchor not found')
s=s.replace(method_anchor,method+method_anchor,1)
old_validation="if(job==null||feeder==null||section==null){ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Pekerjaan, penyulang, dan section wajib diisi.')));return;}"
new_validation="if(job==null||feeder==null||section==null){ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Pekerjaan, penyulang, dan section wajib diisi.')));return;}if((job??'').toLowerCase()=='pengecekan gardu'&&gardu==null){ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Pilih nomor gardu.')));return;}"
if old_validation not in s: raise SystemExit('validation anchor not found')
s=s.replace(old_validation,new_validation,1)
s=s.replace("'section':section,'daerah':area.text.trim()", "'section':section,'nomorGardu':gardu,'daerah':area.text.trim()",1)
p.write_text(s)
