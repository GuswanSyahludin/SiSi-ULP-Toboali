/* Mobile workflow Penugasan Tim dan Pindah Tim Eksekusi TO. */
function _toSesi_(token){
  var sesi=getSesiByToken(String(token||''));
  if(!sesi)throw new Error('Sesi habis.');
  return sesi;
}
function _toNorm_(v){return String(v==null?'':v).trim();}
function _toList_(token,mode){
  try{
    var sesi=_toSesi_(token),T=COL_INS.TEMUAN;
    var sh=_ssIns().getSheetByName(SHEET_INS.TEMUAN);
    if(!sh||sh.getLastRow()<2)return{success:true,list:[]};
    var rows=sh.getRange(2,1,sh.getLastRow()-1,T.folderPath+1).getValues();
    var role=_toNorm_(sesi.role).toLowerCase();
    var superUser=role==='super user'||role==='admin';
    var ulp=_toNorm_(sesi.ulp).toLowerCase(),out=[];
    for(var i=0;i<rows.length;i++){
      var r=rows[i],kode=_toNorm_(r[T.kodePekerjaan]);if(!kode)continue;
      if(!superUser&&_toNorm_(r[T.ulp]).toLowerCase()!==ulp)continue;
      var status=_toNorm_(r[T.status]),tim=_toNorm_(r[T.timEksekusi]);
      if(mode==='assignment'&&status!=='Penugasan Tim')continue;
      if(mode==='move'&&(status!=='Progress Pekerjaan'||!tim))continue;
      out.push({kodePekerjaan:kode,ulp:_toNorm_(r[T.ulp]),tanggal:_normTgl(r[T.tanggal]),objek:_toNorm_(r[T.objekInspeksi]),penyulang:_toNorm_(r[T.penyulang]),section:_toNorm_(r[T.section]),segmen:_toNorm_(r[T.segmen]),nomorTiang:_toNorm_(r[T.nomorTiang]),nomorGardu:_toNorm_(r[T.nomorGardu]),tier:_toNorm_(r[T.tier]),temuan:_toNorm_(r[T.temuan]),deskripsi:_toNorm_(r[T.deskripsi]),koordinat:_toNorm_(r[T.koordinat]),fotoTemuanUrl:_toNorm_(r[T.fotoTemuanUrl]),fotoTiangUrl:_toNorm_(r[T.fotoTiangUrl]),status:status,timEksekusi:tim,catatan:_toNorm_(r[T.catatan])});
    }
    out.sort(function(a,b){return String(b.tanggal).localeCompare(String(a.tanggal))||String(b.kodePekerjaan).localeCompare(String(a.kodePekerjaan));});
    return{success:true,count:out.length,list:out};
  }catch(e){return{success:false,message:e.message,list:[]};}
}
function _toTeams_(token,current){
  try{
    var sesi=_toSesi_(token),kode=_toNorm_(sesi.kodeUlp).toLowerCase();
    var sh=_ssIns().getSheetByName('db_Users');if(!sh)return{success:false,message:'db_Users tidak ditemukan.',list:[]};
    var rows=sh.getDataRange().getValues(),seen={},list=[],cur=_toNorm_(current).toLowerCase();
    for(var i=1;i<rows.length;i++){
      if(kode&&_toNorm_(rows[i][COL_USERS.kodeUlp]).toLowerCase()!==kode)continue;
      var tim=_toNorm_(rows[i][COL_USERS.subTim])||_toNorm_(rows[i][COL_USERS.tim]);
      if(!tim||tim.toLowerCase()===cur||seen[tim.toLowerCase()])continue;
      seen[tim.toLowerCase()]=1;list.push(tim);
    }
    list.sort();return{success:true,list:list};
  }catch(e){return{success:false,message:e.message,list:[]};}
}
function _toAssign_(token,kodePekerjaan,timBaru,catatan,mode){
  try{
    var sesi=_toSesi_(token),tim=_toNorm_(timBaru);if(!tim)return{success:false,message:'Tim Eksekusi wajib dipilih.'};
    var loc=_findRowTemuan(_toNorm_(kodePekerjaan));if(!loc)return{success:false,message:'Temuan tidak ditemukan.'};
    var T=COL_INS.TEMUAN,row=loc.sheet.getRange(loc.row,1,1,T.folderPath+1).getValues()[0];
    var kodeSesi=_toNorm_(sesi.kodeUlp).toLowerCase(),kodeTarget=_kodeUlpByNamaUlp(_toNorm_(row[T.ulp])).toLowerCase();
    if(kodeSesi&&kodeTarget&&kodeSesi!==kodeTarget)return{success:false,message:'Kode ULP temuan tidak sesuai sesi.'};
    var current=_toNorm_(row[T.timEksekusi]);if(current&&current.toLowerCase()===tim.toLowerCase())return{success:false,message:'Pilih tim selain tim yang sedang bertugas.'};
    loc.sheet.getRange(loc.row,T.timEksekusi+1).setValue(tim);
    loc.sheet.getRange(loc.row,T.status+1).setValue(STATUS_INS.PROGRESS);
    loc.sheet.getRange(loc.row,T.forwardBy+1).setValue(_toNorm_(sesi.username));
    loc.sheet.getRange(loc.row,T.tglForward+1).setValue(new Date());
    loc.sheet.getRange(loc.row,T.catatan+1).setValue(_toNorm_(catatan));
    SpreadsheetApp.flush();
    return{success:true,kodePekerjaan:kodePekerjaan,timEksekusi:tim,status:STATUS_INS.PROGRESS,mode:mode};
  }catch(e){return{success:false,message:e.message};}
}
function teknikToMobile_(token,payload){
  payload=payload||{};var cmd=_toNorm_(payload.cmd);
  if(cmd==='list')return _toList_(token,_toNorm_(payload.mode));
  if(cmd==='teams')return _toTeams_(token,payload.current);
  if(cmd==='assign')return _toAssign_(token,payload.kodePekerjaan,payload.timEksekusi,payload.catatan,payload.mode);
  return{success:false,message:'Perintah TO tidak dikenal.'};
}
