/* Mobile workflow Work Order ROW.
   db_INS_Temuan adalah WO induk. db_ROW_Eksekusi adalah realisasi turunan.
   Kode WO disimpan di kolom AE db_ROW_Eksekusi agar satu WO hanya punya satu
   baris eksekusi. Header/Realisasi baru dibuat setelah dokumentasi lengkap,
   sehingga laporan dan WA memakai tanggal selesai, bukan tanggal mulai. */
var WO_ROW_KODE_WO_COL = 31; // AE, 1-based. A..AD tetap kompatibel dengan COL_ROW_N=30.

function _woRowNorm_(v){ return String(v==null?'':v).trim(); }
function _woRowSesi_(token){
  var sesi=getSesiByToken(_woRowNorm_(token));
  if(!sesi)throw new Error('Sesi habis.');
  return sesi;
}
function _woRowBoleh_(sesi,tim){
  var role=_woRowNorm_(sesi.role).toLowerCase();
  if(role==='super user'||role==='admin')return true;
  var target=_woRowNorm_(sesi.subTim||sesi.tim).toLowerCase();
  return !!target&&target===_woRowNorm_(tim).toLowerCase();
}
function _woRowEnsureSchema_(sh){
  if(!sh)throw new Error('db_ROW_Eksekusi tidak ditemukan.');
  var kurang=WO_ROW_KODE_WO_COL-sh.getMaxColumns();
  if(kurang>0)sh.insertColumnsAfter(sh.getMaxColumns(),kurang);
  var header=sh.getRange(1,WO_ROW_KODE_WO_COL);
  if(!_woRowNorm_(header.getValue()))header.setValue('Kode WO');
}
function _woRowCariEks_(sh,kodeWo){
  if(!sh)return null;
  _woRowEnsureSchema_(sh);
  if(sh.getLastRow()<2)return null;
  var vals=sh.getRange(2,WO_ROW_KODE_WO_COL,sh.getLastRow()-1,1).getValues();
  for(var i=vals.length-1;i>=0;i--){
    if(_woRowNorm_(vals[i][0])===kodeWo)return{row:i+2};
  }
  return null;
}
function _woRowUpload_(kodeWo,tag,b64,mime){
  if(_woRowNorm_(b64).length<50)return{nama:'',url:''};
  var tanggal=_normTgl(new Date());
  var folder=_getOrCreateFolderByPath(_folderRowEksekusiPath(tanggal,kodeWo));
  return _uploadFotoTemuan(b64,mime||'image/jpeg',kodeWo+'_'+tag,folder);
}
function _woRowLengkap_(r,T){
  var idx=[T.fotoTemuan,T.fotoTemuanUrl,T.fotoTiang,T.fotoTiangUrl,
    T.fotoPekerjaan,T.fotoPekerjaanUrl,T.fotoSesudah,T.fotoSesudahUrl];
  for(var i=0;i<idx.length;i++)if(!_woRowNorm_(r[idx[i]]))return false;
  return true;
}
function _woRowMulai_(token,payload){
  var sesi=_woRowSesi_(token),kode=_woRowNorm_(payload.kodePekerjaan);
  if(!kode)return{success:false,message:'Kode WO wajib diisi.'};
  var loc=_findRowTemuan(kode);if(!loc)return{success:false,message:'WO tidak ditemukan.'};
  var T=COL_INS.TEMUAN;
  var wo=loc.sheet.getRange(loc.row,1,1,T.folderPath+1).getValues()[0];
  var status=_woRowNorm_(wo[T.status]),tim=_woRowNorm_(wo[T.timEksekusi]);
  if(status!==STATUS_INS.PROGRESS)return{success:false,message:'WO tidak berstatus Progress Pekerjaan.'};
  if(!_woRowBoleh_(sesi,tim))return{success:false,message:'WO bukan milik tim yang sedang login.'};
  var ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=ss.getSheetByName('db_ROW_Eksekusi');
  if(!sh)return{success:false,message:'db_ROW_Eksekusi tidak ditemukan.'};
  _woRowEnsureSchema_(sh);
  var existing=_woRowCariEks_(sh,kode);
  if(existing){
    var oldKode=_woRowNorm_(sh.getRange(existing.row,COL_ROW.kodeEksekusi+1).getValue());
    return{success:true,started:true,kodeEksekusi:oldKode,message:'Pekerjaan sudah dimulai.'};
  }
  var unique=Utilities.getUuid().replace(/-/g,'').substring(0,8).toUpperCase();
  var row=new Array(COL_ROW_N).fill('');
  row[COL_ROW.kodeEksekusi]=unique;
  row[COL_ROW.ulp]=_woRowNorm_(wo[T.ulp]);
  // Hari/Tanggal sengaja kosong sampai WO selesai agar laporan tidak masuk hari mulai.
  row[COL_ROW.tim]=tim;
  row[COL_ROW.penyulang]=_woRowNorm_(wo[T.penyulang]);
  row[COL_ROW.section]=_woRowNorm_(wo[T.section]);
  row[COL_ROW.nomorTiang]=_woRowNorm_(wo[T.nomorTiang]);
  row[COL_ROW.koordinatPekerjaan]=_woRowNorm_(wo[T.koordinat]);
  row[COL_ROW.latPekerjaan]=wo[T.lat];row[COL_ROW.longPekerjaan]=wo[T.long];
  row[COL_ROW.fotoSebelum]=_woRowNorm_(wo[T.fotoTemuan]);
  row[COL_ROW.fotoSebelumUrl]=_woRowNorm_(wo[T.fotoTemuanUrl]);
  row[COL_ROW.inputOleh]=_woRowNorm_(sesi.username);
  row[COL_ROW.timestamp]=new Date();
  var target=sh.getLastRow()+1;
  sh.getRange(target,2,1,COL_ROW_N-1).setValues([row.slice(1)]);
  sh.getRange(target,WO_ROW_KODE_WO_COL).setValue(kode);
  sh.getRange(target,COL_ROW.timestamp+1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  SpreadsheetApp.flush();
  return{success:true,started:true,kodeEksekusi:unique,message:'Pekerjaan dimulai.'};
}
function _woRowUpdate_(token,payload){
  var sesi=_woRowSesi_(token),kode=_woRowNorm_(payload.kodePekerjaan),tahap=_woRowNorm_(payload.tahap).toLowerCase();
  if(!kode)return{success:false,message:'Kode WO wajib diisi.'};
  if(tahap!=='pekerjaan'&&tahap!=='sesudah')return{success:false,message:'Tahap foto tidak valid.'};
  var loc=_findRowTemuan(kode);if(!loc)return{success:false,message:'WO tidak ditemukan.'};
  var T=COL_INS.TEMUAN,wo=loc.sheet.getRange(loc.row,1,1,T.folderPath+1).getValues()[0];
  var tim=_woRowNorm_(wo[T.timEksekusi]);
  if(!_woRowBoleh_(sesi,tim))return{success:false,message:'WO bukan milik tim yang sedang login.'};
  if(_woRowNorm_(wo[T.status])!==STATUS_INS.PROGRESS)return{success:false,message:'WO tidak lagi aktif.'};
  var ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=ss.getSheetByName('db_ROW_Eksekusi');
  _woRowEnsureSchema_(sh);
  var eks=_woRowCariEks_(sh,kode);
  if(!eks){var mulai=_woRowMulai_(token,payload);if(!mulai.success)return mulai;eks=_woRowCariEks_(sh,kode);}
  var foto=_woRowUpload_(kode,tahap==='pekerjaan'?'Foto Pekerjaan':'Foto Sesudah',payload.fotoBase64,payload.fotoMime);
  if(!foto.url)return{success:false,message:'Upload foto gagal, status WO tidak diubah.'};
  if(tahap==='pekerjaan'){
    loc.sheet.getRange(loc.row,T.fotoPekerjaan+1).setValue(foto.nama);
    loc.sheet.getRange(loc.row,T.fotoPekerjaanUrl+1).setValue(foto.url);
    sh.getRange(eks.row,COL_ROW.fotoPekerjaan+1).setValue(foto.nama);
    sh.getRange(eks.row,COL_ROW.fotoPekerjaanUrl+1).setValue(foto.url);
    sh.getRange(eks.row,COL_ROW.tampilFotoPekerjaan+1).setValue('Y');
  }else{
    loc.sheet.getRange(loc.row,T.fotoSesudah+1).setValue(foto.nama);
    loc.sheet.getRange(loc.row,T.fotoSesudahUrl+1).setValue(foto.url);
    sh.getRange(eks.row,COL_ROW.fotoSesudah+1).setValue(foto.nama);
    sh.getRange(eks.row,COL_ROW.fotoSesudahUrl+1).setValue(foto.url);
    sh.getRange(eks.row,COL_ROW.tampilFotoSesudah+1).setValue('Y');
  }
  var diameter=Number(payload.diameter);
  if(!isNaN(diameter)&&diameter>=0){
    var jenis=_jenisPekerjaan(diameter);
    loc.sheet.getRange(loc.row,T.diameter+1).setValue(diameter);
    loc.sheet.getRange(loc.row,T.jenisPekerjaan+1).setValue(jenis);
    sh.getRange(eks.row,COL_ROW.diameter+1).setValue(diameter);
    sh.getRange(eks.row,COL_ROW.jenisPekerjaan+1).setValue(jenis);
  }
  SpreadsheetApp.flush();
  wo=loc.sheet.getRange(loc.row,1,1,T.folderPath+1).getValues()[0];
  var lengkap=_woRowLengkap_(wo,T),queued=false,kodeEks=_woRowNorm_(sh.getRange(eks.row,COL_ROW.kodeEksekusi+1).getValue());
  if(lengkap){
    var now=new Date(),tgl=_normTgl(now),hari=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()];
    loc.sheet.getRange(loc.row,T.tglSelesai+1).setValue(now);
    loc.sheet.getRange(loc.row,T.petugas+1).setValue(_woRowNorm_(sesi.username));
    loc.sheet.getRange(loc.row,T.inputBySelesai+1).setValue(_woRowNorm_(sesi.username));
    loc.sheet.getRange(loc.row,T.timestampSelesai+1).setValue(now);
    loc.sheet.getRange(loc.row,T.status+1).setValue(STATUS_INS.SELESAI);
    sh.getRange(eks.row,COL_ROW.hari+1).setValue(hari);
    sh.getRange(eks.row,COL_ROW.tanggal+1).setValue(now);
    sh.getRange(eks.row,COL_ROW.inputOleh+1).setValue(_woRowNorm_(sesi.username));
    sh.getRange(eks.row,COL_ROW.timestamp+1).setValue(now);
    SpreadsheetApp.flush();
    // Auto recalc: fastTick memproses antrean ini tiap menit. prosesEksekusiROW
    // idempoten, jadi retry tidak menggandakan Header/Realisasi/WA.
    queued=_enqueueRecalc_({jenis:'eksekusiRow',key:'eksekusiRow|'+kodeEks,tim:tim,tanggal:tgl});
  }
  return{success:true,completed:lengkap,queued:queued,kodeEksekusi:kodeEks,
    fotoPekerjaanUrl:tahap==='pekerjaan'?foto.url:'',fotoSesudahUrl:tahap==='sesudah'?foto.url:'',
    message:lengkap?'WO selesai dan masuk antrean recalc laporan/WA.':'Foto tersimpan, WO masih Progress Pekerjaan.'};
}
function woRowMobile_(token,payload){
  try{
    payload=payload||{};var cmd=_woRowNorm_(payload.cmd),out;
    if(cmd==='start')out=_woRowMulai_(token,payload);
    else if(cmd==='update')out=_woRowUpdate_(token,payload);
    else out={success:false,message:'Perintah WO ROW tidak dikenal.'};
    out.module='wo-row';out.apiVersion=1;return out;
  }catch(e){return{success:false,message:e.message,module:'wo-row',apiVersion:1};}
}
