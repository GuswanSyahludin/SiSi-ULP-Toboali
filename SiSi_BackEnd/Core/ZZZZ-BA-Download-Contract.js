/*
 * Final compatibility boundary for Berita Acara page loading and downloads.
 * This file is intentionally last-loaded: it owns the public download contract.
 * A requested Drive file is usable only when its ID is present in a known BA
 * PDF/BA-TTD field in Rekap Gardu or Rekap Switching.
 */

getPageContent = function(token, pageName){
  try{
    if(!token) return {success:false,message:'Token tidak ditemukan',redirect:'login'};
    var sesi=getSesiByToken(token);
    if(!sesi) return {success:false,message:'Sesi habis, silakan login ulang',redirect:'login'};
    if(!_bolehAksesMenu(sesi,pageName)) return {success:false,message:'Akses ditolak',redirect:'forbidden'};
    var fileName=PAGE_FILE_ALIASES[pageName]||pageName;
    var html=HtmlService.createHtmlOutputFromFile(fileName).getContent();
    if(pageName==='SIE-BeritaAcara') html+=HtmlService.createHtmlOutputFromFile('Core/SIE-BeritaAcara-WebFix').getContent();
    return {success:true,html:html,sesi:{
      token:token,username:sesi.username,email:sesi.email,role:sesi.role,
      ulp:sesi.ulp,kodeUlp:sesi.kodeUlp,bidang:sesi.bidang,tim:sesi.tim,
      subTim:sesi.subTim||'',aksesMenu:sesi.aksesMenu||''
    }};
  }catch(e){ return {success:false,message:'Halaman tidak ditemukan: '+e.message}; }
};

_baDownloadDriveId_ = function(value){
  var text=String(value==null?'':value).trim();
  if(!text) return '';
  var match=text.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    text.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    text.match(/^([a-zA-Z0-9_-]{10,})$/);
  return match ? match[1] : '';
};
function _baDownloadText_(row,index){
  if(!row || index==null || index<0 || index>=row.length) return '';
  return String(row[index]==null?'':row[index]).trim();
}
function _baDownloadNorm_(value){ return String(value==null?'':value).trim().toLowerCase().replace(/[^a-z0-9]/g,''); }
function _baDownloadCol_(letter){
  var result=0, text=String(letter||'').toUpperCase();
  for(var i=0;i<text.length;i++) result=result*26+text.charCodeAt(i)-64;
  return result-1;
}
function _baDownloadPick_(headers,aliases){
  var map={};
  for(var i=0;i<headers.length;i++){
    var key=_baDownloadNorm_(headers[i]);
    if(key && map[key]==null) map[key]=i;
  }
  for(var j=0;j<aliases.length;j++){
    var idx=map[_baDownloadNorm_(aliases[j])];
    if(idx!=null) return idx;
  }
  return -1;
}
function _baDownloadHeaderRow_(values,aliases){
  var limit=Math.min(values.length,40);
  for(var r=0;r<limit;r++){
    if(_baDownloadPick_(values[r],aliases)>=0) return r;
  }
  return -1;
}
function _baDownloadAddId_(set,value){
  var id=_baDownloadDriveId_(value);
  if(id) set[id]=true;
}
function _baDownloadCollect_(values,options){
  options=options||{};
  var out={};
  var headerAliases=['idBA','ID BA','Nomor BA','No BA','NO BA Full','File PDF URL','File PDF Non-TTD','Link PDF','PDF URL','File ID','File PDF ID','ID File PDF','BA TTD','Link BA TTD','Link BA','linkBaTtd'];
  var headerRow=_baDownloadHeaderRow_(values,headerAliases);
  if(headerRow>=0){
    var headers=values[headerRow];
    var fields=options.fields||['File PDF URL','File PDF Non-TTD','Link PDF','PDF URL','File ID','File PDF ID','ID File PDF','BA TTD','Link BA TTD','Link BA','linkBaTtd'];
    var indexes=[];
    fields.forEach(function(alias){ var idx=_baDownloadPick_(headers,[alias]); if(idx>=0 && indexes.indexOf(idx)<0) indexes.push(idx); });
    for(var r=headerRow+1;r<values.length;r++) indexes.forEach(function(idx){ _baDownloadAddId_(out,_baDownloadText_(values[r],idx)); });
  }
  (options.fixedColumns||[]).forEach(function(letter){
    var idx=_baDownloadCol_(letter);
    for(var rr=0;rr<values.length;rr++) _baDownloadAddId_(out,_baDownloadText_(values[rr],idx));
  });
  return out;
}
function _baDownloadReadSheet_(source,options){
  if(!source || !source.spreadsheetId || !source.sheetName) throw new Error('Sumber BA tidak dikonfigurasi.');
  var ss=SpreadsheetApp.openById(source.spreadsheetId);
  var sh=null;
  if(typeof _baResolveSheet_==='function') sh=_baResolveSheet_(ss,source.sheetName);
  if(!sh && ss.getSheetByName) sh=ss.getSheetByName(source.sheetName);
  if(!sh) throw new Error('Sheet '+source.sheetName+' tidak ditemukan.');
  return _baDownloadCollect_(sh.getDataRange().getValues(),options);
}
function _baDownloadAllowedIds_(){
  var all={};
  var gardu=typeof BA_SOURCE!=='undefined' ? BA_SOURCE : {spreadsheetId:'',sheetName:'Rekap Gardu'};
  var switching=typeof SW_SOURCE!=='undefined' ? SW_SOURCE : {spreadsheetId:'',sheetName:'Rekap Switching'};
  if(!gardu.spreadsheetId && !switching.spreadsheetId) throw new Error('Sumber BA tidak tersedia.');
  if(gardu.spreadsheetId){
    var g=_baDownloadReadSheet_(gardu,{fixedColumns:['CG','CK','CL']});
    Object.keys(g).forEach(function(id){all[id]=true;});
  }
  if(switching.spreadsheetId){
    var swFields=['File PDF URL','File PDF Non-TTD','Link PDF','PDF URL','File ID','File PDF ID','ID File PDF','BA TTD','Link BA TTD','Link BA','linkBaTtd'];
    var swFixed=[];
    if(typeof SW_COL!=='undefined'){
      Object.keys(SW_COL).forEach(function(key){
        if(/pdf|ttd|link|file/i.test(key)){
          var value=String(SW_COL[key]||'').trim();
          if(value) swFixed.push(value);
          swFields.push(value);
        }
      });
    }
    var s=_baDownloadReadSheet_(switching,{fields:swFields,fixedColumns:swFixed});
    Object.keys(s).forEach(function(id){all[id]=true;});
  }
  return all;
}

unduhFileBa = function(token,fileId){
  try{
    var sesi=getSesiByToken(String(token||'').trim());
    if(!sesi) return {ok:false,code:'SESSION_EXPIRED',message:'Sesi habis atau tidak valid. Silakan login ulang.'};
    var id=_baDownloadDriveId_(fileId);
    if(!id) return {ok:false,code:'FILE_ID_EMPTY',message:'File ID kosong.'};
    var allowed;
    try{ allowed=_baDownloadAllowedIds_(); }
    catch(validationError){ return {ok:false,code:'FILE_VALIDATION_FAILED',message:'File BA tidak dapat diverifikasi.'}; }
    if(!allowed[id]) return {ok:false,code:'FILE_NOT_AUTHORIZED',message:'File BA tidak terdaftar pada data BA yang dapat diakses.'};
    var file=DriveApp.getFileById(id);
    var blob=file.getBlob();
    var bytes=blob.getBytes();
    if(bytes.length>12*1024*1024) return {ok:false,code:'FILE_TOO_LARGE',message:'File terlalu besar untuk diunduh melalui website (maksimal 12 MB). Gunakan tautan Google Drive.'};
    return {ok:true,base64:Utilities.base64Encode(bytes),mimeType:blob.getContentType()||'application/pdf',fileName:file.getName()||'BeritaAcara.pdf'};
  }catch(error){ return {ok:false,code:'DOWNLOAD_FAILED',message:'Gagal mengunduh file: '+error.message}; }
};
