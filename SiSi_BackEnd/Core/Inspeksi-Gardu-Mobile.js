/* Paket sinkron offline Inspeksi Gardu. Mengikuti fungsi backend yang sudah ada. */
var INS_GARDU_LOCAL_PREFIX='insGarduLocal_';
function _insLocalGet_(id){var x=PropertiesService.getScriptProperties().getProperty(INS_GARDU_LOCAL_PREFIX+id);if(!x)return'';try{return JSON.parse(x).kode||'';}catch(e){return'';}}
function _insLocalPut_(id,kode,jenis){PropertiesService.getScriptProperties().setProperty(INS_GARDU_LOCAL_PREFIX+id,JSON.stringify({kode:kode,jenis:jenis,at:new Date().toISOString()}));}

function getListTemuanMobile_(token){
  if(!getSesiByToken(String(token||'')))return{success:false,message:'Sesi habis.'};
  var sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('db_List_Temuan');
  if(!sh||sh.getLastRow()<2)return{success:true,list:[]};
  var v=sh.getRange(2,1,sh.getLastRow()-1,4).getDisplayValues(),out=[];
  for(var i=0;i<v.length;i++){if(String(v[i][2]||'').trim().toLowerCase()!=='gardu')continue;out.push({no:v[i][0],tier:String(v[i][1]||'').trim(),objekInspeksi:String(v[i][2]||'').trim(),temuan:String(v[i][3]||'').trim()});}
  return{success:true,list:out};
}

function syncPaketInsGarduMobile_(token,paket){
  try{
    var sesi=getSesiByToken(String(token||''));if(!sesi)return{success:false,message:'Sesi habis.'};
    paket=paket||{};var h=paket.header||{},localH=String(h.localId||'');if(!localH)return{success:false,message:'localHeaderId kosong.'};
    var kodeH=_insLocalGet_(localH);
    if(!kodeH){var rh=simpanHeaderInsGardu({username:sesi.username,ulp:h.ulp||sesi.ulp,tanggal:h.tanggal,koordinatAwal:h.koordinatAwal,koordinatAkhir:h.koordinatAkhir,kmAwal:h.kmAwal,kmAkhir:h.kmAkhir,kendala:h.kendala});if(!rh||!rh.ok)return{success:false,message:(rh&&rh.message)||'Gagal membuat header.'};kodeH=rh.kodeHeader;_insLocalPut_(localH,kodeH,'header');}
    var hasilG=[],gardus=paket.gardus||[];
    for(var i=0;i<gardus.length;i++){
      var g=gardus[i],localG=String(g.localId||''),kodeG=_insLocalGet_(localG);
      if(!kodeG){var rg=simpanRealisasiInsGardu({kodeHeader:kodeH,nomorGardu:g.nomorGardu,tier:g.tier,username:sesi.username});if(!rg||!rg.ok)return{success:false,kodeHeader:kodeH,message:(rg&&rg.message)||('Gagal realisasi '+g.nomorGardu)};kodeG=rg.kodePekerjaan;_insLocalPut_(localG,kodeG,'realisasi');}
      var hasilT=[],ts=g.temuan||[];
      for(var j=0;j<ts.length;j++){var t=ts[j],localT=String(t.localId||''),kodeT=_insLocalGet_(localT);
        if(!kodeT){var rt=simpanTemuanGardu({kodeHeader:kodeH,nomorGardu:g.nomorGardu,temuan:t.temuan,deskripsi:t.deskripsi||'',username:sesi.username,fotoTemuanB64:t.fotoTemuanB64||'',fotoTemuanMime:t.fotoTemuanMime||'image/jpeg',fotoGarduB64:t.fotoGarduB64||'',fotoGarduMime:t.fotoGarduMime||'image/jpeg'});if(!rt||!rt.ok)return{success:false,kodeHeader:kodeH,message:(rt&&rt.message)||('Gagal temuan '+t.temuan)};kodeT=rt.kodePekerjaan;_insLocalPut_(localT,kodeT,'temuan');}
        hasilT.push({localId:localT,kodeTemuan:kodeT});}
      hasilG.push({localId:localG,kodePekerjaanGardu:kodeG,temuan:hasilT});
    }
    try{recalcWaInsGarduByHeader(kodeH);}catch(eR){}
    return{success:true,kodeHeader:kodeH,gardus:hasilG};
  }catch(e){return{success:false,message:'Sync paket Inspeksi Gardu gagal: '+e.message};}
}
