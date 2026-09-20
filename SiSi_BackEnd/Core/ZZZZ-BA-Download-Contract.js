/*
 * Final compatibility boundary for Berita Acara page loading and downloads.
 *
 * Legacy modules expose incompatible globals for getPageContent and
 * unduhFileBa. This last-loaded contract is intentionally authoritative until
 * those large modules are consolidated: token is always the first argument,
 * authentication happens before Drive access, and the BA browser patch is
 * always appended after the main page.
 */
getPageContent = function(token, pageName){
  try{
    if(!token) return {success:false,message:'Token tidak ditemukan',redirect:'login'};
    var sesi=getSesiByToken(token);
    if(!sesi) return {success:false,message:'Sesi habis, silakan login ulang',redirect:'login'};
    if(!_bolehAksesMenu(sesi,pageName)) return {success:false,message:'Akses ditolak',redirect:'forbidden'};
    var fileName=PAGE_FILE_ALIASES[pageName]||pageName;
    var html=HtmlService.createHtmlOutputFromFile(fileName).getContent();
    if(pageName==='SIE-BeritaAcara'){
      html+=HtmlService.createHtmlOutputFromFile('Core/SIE-BeritaAcara-WebFix').getContent();
    }
    return {success:true,html:html,sesi:{
      token:token,username:sesi.username,email:sesi.email,role:sesi.role,
      ulp:sesi.ulp,kodeUlp:sesi.kodeUlp,bidang:sesi.bidang,tim:sesi.tim,
      subTim:sesi.subTim||'',aksesMenu:sesi.aksesMenu||''
    }};
  }catch(e){
    return {success:false,message:'Halaman tidak ditemukan: '+e.message};
  }
};

unduhFileBa = function(token,fileId){
  try{
    var sesi=getSesiByToken(String(token||'').trim());
    if(!sesi) return {ok:false,code:'SESSION_EXPIRED',message:'Sesi habis atau tidak valid. Silakan login ulang.'};
    var id=String(fileId||'').trim();
    if(!id) return {ok:false,code:'FILE_ID_EMPTY',message:'File ID kosong.'};
    var file=DriveApp.getFileById(id);
    var blob=file.getBlob();
    var bytes=blob.getBytes();
    if(bytes.length>12*1024*1024){
      return {ok:false,code:'FILE_TOO_LARGE',message:'File terlalu besar untuk diunduh melalui website (maksimal 12 MB). Gunakan tautan Google Drive.'};
    }
    return {ok:true,base64:Utilities.base64Encode(bytes),mimeType:blob.getContentType()||'application/pdf',fileName:file.getName()||'BeritaAcara.pdf'};
  }catch(error){
    return {ok:false,code:'DOWNLOAD_FAILED',message:'Gagal mengunduh file: '+error.message};
  }
};
