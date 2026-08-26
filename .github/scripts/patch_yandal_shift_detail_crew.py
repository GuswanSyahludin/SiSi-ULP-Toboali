from pathlib import Path

# Backend: replace crew config with a flexible, standardized special dataset.
p=Path('SiSi_BackEnd/Core/Delta-Sync-Mobile.js')
s=p.read_text()
s=s.replace("db_List_Petugas_Yandal:{sheet:'db_List_Petugas_Yandal',key:1,width:0,support:true}", "db_List_Petugas_Yandal:{special:'yandalPetugas',support:true}")
anchor="function _deltaRows_(token,name,cfg){"
helper="""function _deltaYandalPetugasRows_(){
  var ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=null,sheets=ss.getSheets();
  for(var i=0;i<sheets.length;i++){
    var normalized=String(sheets[i].getName()||'').trim().toLowerCase();
    if(normalized==='db_list_petugas_yandal'){sh=sheets[i];break;}
  }
  if(!sh||sh.getLastRow()<2)return [];
  var width=sh.getLastColumn(),headers=sh.getRange(1,1,1,width).getValues()[0];
  var nameCols=[];
  for(var c=0;c<headers.length;c++){
    var h=String(headers[c]||'').trim().toLowerCase();
    if(h.indexOf('petugas')>=0 || h==='nama' || h==='nama petugas')nameCols.push(c);
  }
  if(!nameCols.length){
    for(var fallback=1;fallback<width;fallback++)nameCols.push(fallback);
  }
  var data=sh.getRange(2,1,sh.getLastRow()-1,width).getValues(),out=[],seen={};
  for(var r=0;r<data.length;r++){
    for(var n=0;n<nameCols.length;n++){
      var raw=String(data[r][nameCols[n]]||'').trim();
      if(!raw)continue;
      var parts=raw.split(/[,;\/&\n]+/);
      for(var q=0;q<parts.length;q++){
        var person=String(parts[q]||'').trim(),key=person.toLowerCase();
        if(person && !seen[key]){seen[key]=true;out.push([out.length+1,person]);}
      }
    }
  }
  return out;
}
"""
if helper.strip() not in s:
    if anchor not in s: raise SystemExit('delta rows anchor missing')
    s=s.replace(anchor,helper+anchor,1)
s=s.replace("if(cfg.special==='yandalUkurGardu')return _deltaYandalUkurRows_();", "if(cfg.special==='yandalUkurGardu')return _deltaYandalUkurRows_();\n  if(cfg.special==='yandalPetugas')return _deltaYandalPetugasRows_();",1)
p.write_text(s)

# Mobile: show header detail and an explicit empty state for crew master.
p=Path('SiSi_Mobile/lib/screens/yandal_screen.dart')
s=p.read_text()
old="Widget _crew()=>ListView(padding:const EdgeInsets.all(16),children:[Wrap(spacing:8,runSpacing:8,children:widget.parent.people.map((p)=>FilterChip(label:Text(p),selected:selected.contains(p),onSelected:(v){if(v&&selected.length>=2){_snack('Maksimal 2 petugas');return;}setState(()=>v?selected.add(p):selected.remove(p));})).toList()),const SizedBox(height:8),Align(alignment:Alignment.centerRight,child:Text('${selected.length}/2 dipilih')),const SizedBox(height:18),ElevatedButton(onPressed:_saveCrew,child:const Text('Simpan petugas shift'))]);"
new="""Widget _crew()=>ListView(padding:const EdgeInsets.all(16),children:[
    Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(16),border:Border.all(color:AppColors.neutral200)),child:Column(children:[
      _headerRow('ULP',(widget.parent.widget.sesi['ulp']??'-').toString()),
      _headerRow('Tim / Sub-Tim','${widget.parent.widget.sesi['tim']??'-'} / ${widget.parent.widget.sesi['subTim']??'-'}'),
      _headerRow('Hari / Tanggal','${_day(widget.parent.operationalDate)}, ${widget.parent._date(widget.parent.operationalDate)}'),
      _headerRow('Shift','Shift ${widget.parent.shift} (${widget.parent.time})'),
    ])),
    const SizedBox(height:18),
    if(widget.parent.people.isEmpty)Container(padding:const EdgeInsets.all(14),decoration:BoxDecoration(color:const Color(0xFFFFF7E6),borderRadius:BorderRadius.circular(12)),child:const Text('Data petugas belum tersedia. Jalankan Sinkron Semua Data setelah backend terbaru dideploy.',style:TextStyle(fontSize:12,color:AppColors.amber700))),
    if(widget.parent.people.isNotEmpty)Wrap(spacing:8,runSpacing:8,children:widget.parent.people.map((p)=>FilterChip(label:Text(p),selected:selected.contains(p),onSelected:(v){if(v&&selected.length>=2){_snack('Maksimal 2 petugas');return;}setState(()=>v?selected.add(p):selected.remove(p));})).toList()),
    const SizedBox(height:8),Align(alignment:Alignment.centerRight,child:Text('${selected.length}/2 dipilih')),const SizedBox(height:18),ElevatedButton(onPressed:widget.parent.people.isEmpty?null:_saveCrew,child:const Text('Simpan petugas shift'))]);
  Widget _headerRow(String label,String value)=>Padding(padding:const EdgeInsets.symmetric(vertical:5),child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:[SizedBox(width:110,child:Text(label,style:const TextStyle(fontSize:12,color:AppColors.neutral500))),Expanded(child:Text(value,style:const TextStyle(fontSize:12,fontWeight:FontWeight.w800)))]));
  String _day(DateTime d)=>const ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'][d.weekday-1];"""
if old not in s: raise SystemExit('crew widget anchor missing')
s=s.replace(old,new,1)
p.write_text(s)
