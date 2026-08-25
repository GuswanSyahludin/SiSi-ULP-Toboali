/* ============================================================================
   Delta-Sync-Mobile.js — manifest perubahan + download dataset per tabel
   Rev 26 Agu 2026
   ============================================================================ */
var DELTA_SYNC_CACHE_SEC = 600;
var DELTA_SYNC_PAGE = 500;
function _deltaConfigs_(){
  return {
    db_Global_Header:{sheet:'db_Global_Header',key:1,width:17,dual:true,main:true},
    db_ROW_Realisasi:{sheet:'db_ROW_Realisasi',key:2,width:13,dual:true,main:true},
    db_ROW_Eksekusi:{sheet:'db_ROW_Eksekusi',key:3,width:30,dual:true,main:true},
    db_Hartek_PenyulangGardu:{sheet:'db_Hartek_PenyulangGardu',key:2,width:15,dual:true,main:true},
    db_Hartek_Pekerjaan:{sheet:'db_Hartek_Pekerjaan',key:3,width:17,dual:true,main:true},
    db_Hartek_Material:{sheet:'db_Hartek_Material',key:4,width:19,dual:true,main:true},
    db_InsJar_Realisasi:{sheet:'db_InsJar_Realisasi',key:2,width:13,dual:true,main:true},
    db_InsDu_Realisasi:{sheet:'db_InsDu_Realisasi',key:2,width:12,dual:true,main:true},
    db_INS_Temuan:{sheet:'db_INS_Temuan',key:3,width:45,dual:true,main:true},
    db_Yandal_Shift:{sheet:'db_Yandal_Shift',key:2,width:12,dual:true,main:true},
    db_Yandal_P0:{sheet:'db_Yandal_P0',key:3,width:50,dual:true,main:true},
    db_Yandal_Pengecekan_Switching:{sheet:'db_Yandal_Pengecekan_Switching',key:4,width:50,dual:true,main:true},
    db_Yandal_Pengukuran_Gardu:{special:'yandalUkurGardu',key:4,width:24,main:true},
    Teknik_Laporan_Harian:{sheet:'Teknik_Laporan Harian',key:1,width:8,dual:true,main:true},
    db_Users:{sheet:'db_Users',key:2,width:11,support:true,sanitize:'users'},
    db_Tim:{sheet:'db_Tim',key:3,width:0,support:true},
    db_Penyulang:{sheet:'db_Penyulang',key:2,width:0,support:true},
    db_List_Temuan:{sheet:'db_List_Temuan',key:3,width:0,support:true},
    db_Hartek_List_Pekerjaan:{sheet:'db_Hartek_List_Pekerjaan',key:1,width:0,support:true},
    db_Material:{sheet:'db_Material',key:1,width:0,support:true},
    db_Yandal_List_P0:{sheet:'db_Yandal_List_P0',key:1,width:0,support:true},
    db_List_Petugas_Yandal:{sheet:'db_List_Petugas_Yandal',key:1,width:0,support:true},
    db_Section:{sheet:'db_Section',key:1,width:0,support:true},
    Master_Gardu:{special:'gardu',support:true}
  };
}
function _deltaPlain_(v){
  if(v instanceof Date) return Utilities.formatDate(v,'Asia/Jakarta','yyyy-MM-dd HH:mm:ss');
  return v == null ? '' : v;
}
function _deltaYandalUkurRows_(){
  if(typeof YANDAL_UKUR_SS_ID==='undefined' || !YANDAL_UKUR_SS_ID) throw new Error('Sumber Pengukuran Gardu belum dikonfigurasi.');
  if(typeof _sheetUkurGardu_!=='function') throw new Error('Pencari sheet Pengukuran Gardu tidak tersedia.');
  var sh=_sheetUkurGardu_(SpreadsheetApp.openById(YANDAL_UKUR_SS_ID));
  if(!sh) throw new Error('Sheet Pengukuran Gardu 24 kolom tidak ditemukan.');
  if(sh.getLastColumn()<24) throw new Error('Struktur Pengukuran Gardu tidak valid: dibutuhkan 24 kolom.');
  if(sh.getLastRow()<2)return [];
  return sh.getRange(2,1,sh.getLastRow()-1,24).getValues().map(function(row){return row.map(_deltaPlain_);});
}
function _deltaRows_(token,name,cfg){
  if(cfg.special==='gardu'){
    var sesi=getSesiByToken(String(token||''));
    if(!sesi) throw new Error('Sesi habis.');
    var r=getMasterGarduMobile(token,String(sesi.ulp||''));
    if(!r||r.success!==true) throw new Error((r&&r.message)||'Master Gardu gagal.');
    return (r.list||[]).map(function(x){return x;});
  }
  if(cfg.special==='yandalUkurGardu')return _deltaYandalUkurRows_();
  var rows=[];
  if(cfg.dual && typeof _readSheetDual_==='function') rows=_readSheetDual_(cfg.sheet,cfg.key,cfg.width);
  else{
    var sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(cfg.sheet);
    if(!sh||sh.getLastRow()<2)return [];
    var w=cfg.width||sh.getLastColumn();
    rows=sh.getRange(2,1,sh.getLastRow()-1,w).getValues();
  }
  var out=[];
  for(var i=0;i<rows.length;i++){
    var row=rows[i].map(_deltaPlain_);
    if(cfg.sanitize==='users' && row.length>3) row[3]='';
    out.push(row);
  }
  return out;
}
function _deltaDigest_(rows){
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(rows),Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/,'');
}
function _deltaManifest_(token,force){
  var sesi=getSesiByToken(String(token||''));
  if(!sesi)return{success:false,message:'Sesi habis.'};
  var scope=String(sesi.kodeUlp||sesi.ulp||'all').replace(/[^a-zA-Z0-9_-]/g,'_');
  var cache=CacheService.getScriptCache(),ck='delta_manifest_v1_'+scope;
  if(!force){var hit=cache.get(ck);if(hit){try{return JSON.parse(hit);}catch(_){}}}
  var cfgs=_deltaConfigs_(),datasets=[];
  Object.keys(cfgs).forEach(function(name){
    var cfg=cfgs[name],rows=_deltaRows_(token,name,cfg);
    datasets.push({name:name,version:_deltaDigest_(rows),count:rows.length,kind:cfg.support?'support':'main'});
  });
  var result={success:true,apiVersion:1,generatedAt:new Date().toISOString(),datasets:datasets};
  try{cache.put(ck,JSON.stringify(result),DELTA_SYNC_CACHE_SEC);}catch(_){}
  return result;
}
function _deltaFetch_(token,name,offset,limit){
  var cfg=_deltaConfigs_()[name];
  if(!cfg)return{success:false,message:'Dataset tidak dikenal: '+name};
  var rows=_deltaRows_(token,name,cfg),from=Math.max(0,Number(offset)||0);
  var take=Math.max(1,Math.min(DELTA_SYNC_PAGE,Number(limit)||DELTA_SYNC_PAGE));
  return{success:true,apiVersion:1,name:name,version:_deltaDigest_(rows),total:rows.length,offset:from,rows:rows.slice(from,from+take),hasMore:from+take<rows.length,kind:cfg.support?'support':'main'};
}
function deltaSyncMobile_(token,payload){
  payload=payload||{};
  var cmd=String(payload.cmd||'manifest');
  if(cmd==='manifest')return _deltaManifest_(token,payload.force===true);
  if(cmd==='fetch')return _deltaFetch_(token,String(payload.dataset||''),payload.offset,payload.limit);
  return{success:false,message:'Perintah delta sync tidak dikenal.'};
}
