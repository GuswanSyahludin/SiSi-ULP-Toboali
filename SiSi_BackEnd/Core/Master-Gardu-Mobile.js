/* Gateway download/edit Master Gardu + List Temuan + paket Inspeksi Gardu. */
var MASTER_GARDU_MOBILE={spreadsheetId:'1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw',tab:'Master_Gardu',headerRows:11};
function getMasterGarduMobile(token,ulpDiminta){try{
 var raw=String(ulpDiminta||'');
 if(raw==='LIST_TEMUAN')return getListTemuanMobile_(token);
 if(raw.indexOf('TEMUAN_TEKNIK:')===0){
  var sesiTek=getSesiByToken(String(token||''));
  if(!sesiTek)return{success:false,message:'Sesi habis.'};
  var dataTek={};try{dataTek=JSON.parse(raw.substring('TEMUAN_TEKNIK:'.length));}catch(eTek){return{success:false,message:'Data temuan tidak valid.'};}
  dataTek.username=String(sesiTek.username||'');
  dataTek.petugasInspeksi=String(sesiTek.subTim||sesiTek.tim||'').trim();
  var simpanTek=typeof simpanTemuanInsJar==='function'?simpanTemuanInsJar(dataTek):{ok:false,error:'Fungsi simpan temuan belum tersedia.'};
  if(simpanTek&&simpanTek.ok&&dataTek.petugasInspeksi&&typeof _findRowTemuan==='function'){
   var lokasiTek=_findRowTemuan(simpanTek.kodePekerjaan);
   if(lokasiTek)lokasiTek.sheet.getRange(lokasiTek.row,COL_INS.TEMUAN.timInspeksi+1).setValue(dataTek.petugasInspeksi);
  }
  return simpanTek&&simpanTek.ok?{success:true,kodePekerjaan:simpanTek.kodePekerjaan,fotoTemuanUrl:simpanTek.fotoTemuanUrl,fotoTiangUrl:simpanTek.fotoTiangUrl}:{success:false,message:String((simpanTek&&(simpanTek.error||simpanTek.message))||'Gagal menyimpan temuan.')};
 }
 if(raw.indexOf('INSPEKSI:')===0){var paket={};try{paket=JSON.parse(raw.substring(9));}catch(e){return{success:false,message:'Paket inspeksi tidak valid.'};}return syncPaketInsGarduMobile_(token,paket);}
 if(raw.indexOf('UPDATE:')===0){var b=raw.substring(7).split('|'),json=b.shift()||'{}',gardu=b.shift()||'',target=b.join('|')||'',data={};try{data=JSON.parse(json);}catch(_){return{success:false,message:'Payload Gardu tidak valid.'};}return updateMasterGarduMobile(token,{gardu:gardu,ulp:target,data:data});}
 var sesi=getSesiByToken(String(token||''));if(!sesi)return{success:false,message:'Sesi habis.'};var superUser=String(sesi.role||'').toLowerCase()==='super user';var filter=superUser?raw.trim().toLowerCase():String(sesi.ulp||'').trim().toLowerCase();
 var sh=SpreadsheetApp.openById(MASTER_GARDU_MOBILE.spreadsheetId).getSheetByName(MASTER_GARDU_MOBILE.tab),start=12,n=sh.getLastRow()-11;if(n<=0)return{success:true,list:[]};
 var ident=sh.getRange(start,2,n,21).getDisplayValues(),wbp=sh.getRange(start,28,n,10).getDisplayValues(),lwbp=sh.getRange(start,57,n,10).getDisplayValues(),arus=sh.getRange(start,111,n,1).getDisplayValues(),beban=sh.getRange(start,153,n,4).getDisplayValues(),berat=sh.getRange(start,168,n,1).getDisplayValues(),minyak=sh.getRange(start,170,n,1).getDisplayValues(),list=[];
 for(var i=0;i<n;i++){var no=String(ident[i][1]||'').trim(),ulp=String(ident[i][0]||'').trim();if(!no||(filter&&ulp.toLowerCase()!==filter))continue;list.push({ulp:ulp,gardu:no,alamat:ident[i][2],penyulang:ident[i][3],section:ident[i][4],latitude:ident[i][7],longitude:ident[i][8],jenisGardu:ident[i][9],merk:ident[i][10],kapasitasKva:ident[i][11],noSeri:ident[i][12],tahunTrafo:ident[i][13],typeSeal:ident[i][14],merkPhbTr:ident[i][15],nomorSeriPhbTr:ident[i][16],tahunPhbTr:ident[i][17],jamUkurWbp:ident[i][18],tanggalPengukuran:ident[i][19],kepemilikan:ident[i][20],beratTrafo:berat[i][0],volumeMinyak:minyak[i][0],wbpRs:wbp[i][0],wbpSt:wbp[i][1],wbpTr:wbp[i][2],wbpRn:wbp[i][3],wbpSn:wbp[i][4],wbpTn:wbp[i][5],wbpR:wbp[i][6],wbpS:wbp[i][7],wbpT:wbp[i][8],wbpN:wbp[i][9],lwbpRs:lwbp[i][0],lwbpSt:lwbp[i][1],lwbpTr:lwbp[i][2],lwbpRn:lwbp[i][3],lwbpSn:lwbp[i][4],lwbpTn:lwbp[i][5],lwbpR:lwbp[i][6],lwbpS:lwbp[i][7],lwbpT:lwbp[i][8],lwbpN:lwbp[i][9],arusMaxPerFasa:arus[i][0],pembebananKva:beban[i][0],pembebananKw:beban[i][1],persentaseBeban:beban[i][2],kategoriBeban:beban[i][3]});}
 return{success:true,count:list.length,list:list};
}catch(e){return{success:false,message:'Master Gardu gagal: '+e.message};}}
