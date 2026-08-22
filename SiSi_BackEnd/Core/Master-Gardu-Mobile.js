/* Master-Gardu-Mobile.js — download master + gateway upload outbox Flutter. */
var MASTER_GARDU_MOBILE = { spreadsheetId:"1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw", tab:"Master_Gardu", headerRows:11 };

function getMasterGarduMobile(token, ulpDiminta) {
  try {
    var raw = String(ulpDiminta || '');
    // Format gateway: UPDATE:<json>|<gardu>|<ulp>. Tetap satu action agar
    // Code.js besar tidak perlu case baru.
    if (raw.indexOf('UPDATE:') === 0) {
      var bagian = raw.substring(7).split('|');
      var json = bagian.shift() || '{}';
      var gardu = bagian.shift() || '';
      var targetUlp = bagian.join('|') || '';
      var data = {};
      try { data = JSON.parse(json); }
      catch(eJson) { return {success:false,message:'Payload perubahan Gardu tidak valid.'}; }
      return updateMasterGarduMobile(token,{gardu:gardu,ulp:targetUlp,data:data});
    }

    var sesi = getSesiByToken(String(token || '').trim());
    if (!sesi) return {success:false,message:'Sesi habis, silakan buka aplikasi ulang.'};
    var isSuper = String(sesi.role || '').trim().toLowerCase() === 'super user';
    var filterUlp = isSuper ? raw.trim().toLowerCase() : String(sesi.ulp || '').trim().toLowerCase();
    var sh = SpreadsheetApp.openById(MASTER_GARDU_MOBILE.spreadsheetId).getSheetByName(MASTER_GARDU_MOBILE.tab);
    if (!sh) return {success:false,message:'Tab Master_Gardu tidak ditemukan.'};
    var start=MASTER_GARDU_MOBILE.headerRows+1, n=sh.getLastRow()-MASTER_GARDU_MOBILE.headerRows;
    if(n<=0) return {success:true,count:0,list:[]};
    var ident=sh.getRange(start,2,n,21).getDisplayValues();
    var wbp=sh.getRange(start,28,n,10).getDisplayValues();
    var lwbp=sh.getRange(start,57,n,10).getDisplayValues();
    var list=[];
    for(var i=0;i<n;i++){
      var nomor=String(ident[i][1]||'').trim(); if(!nomor) continue;
      var ulp=String(ident[i][0]||'').trim(); if(filterUlp&&ulp.toLowerCase()!==filterUlp) continue;
      list.push({
        ulp:ulp,gardu:nomor,alamat:String(ident[i][2]||'').trim(),
        jenisGardu:String(ident[i][9]||'').trim(),merk:String(ident[i][10]||'').trim(),kapasitasKva:String(ident[i][11]||'').trim(),
        noSeri:String(ident[i][12]||'').trim(),tahunTrafo:String(ident[i][13]||'').trim(),typeSeal:String(ident[i][14]||'').trim(),
        merkPhbTr:String(ident[i][15]||'').trim(),nomorSeriPhbTr:String(ident[i][16]||'').trim(),tahunPhbTr:String(ident[i][17]||'').trim(),
        jamUkurWbp:String(ident[i][18]||'').trim(),tanggalPengukuran:String(ident[i][19]||'').trim(),kepemilikan:String(ident[i][20]||'').trim(),
        wbpRs:wbp[i][0],wbpSt:wbp[i][1],wbpTr:wbp[i][2],wbpRn:wbp[i][3],wbpSn:wbp[i][4],wbpTn:wbp[i][5],
        wbpR:wbp[i][6],wbpS:wbp[i][7],wbpT:wbp[i][8],wbpN:wbp[i][9],
        lwbpRs:lwbp[i][0],lwbpSt:lwbp[i][1],lwbpTr:lwbp[i][2],lwbpRn:lwbp[i][3],lwbpSn:lwbp[i][4],lwbpTn:lwbp[i][5],
        lwbpR:lwbp[i][6],lwbpS:lwbp[i][7],lwbpT:lwbp[i][8],lwbpN:lwbp[i][9]
      });
    }
    list.sort(function(a,b){return a.gardu.localeCompare(b.gardu,'id',{numeric:true});});
    return {success:true,count:list.length,list:list};
  }catch(e){return {success:false,message:'Gagal membaca Master Gardu: '+e.message};}
}
