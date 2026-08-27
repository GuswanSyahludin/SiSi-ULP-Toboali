/* Jadwal Padam: source spreadsheet eksternal */
var JADWAL_PADAM_SS_ID = '15YrBm8dNdaVZe_fIdSk4KCo3E5IXpXLAJ0A9vRjS0iI';
var JADWAL_PADAM_SHEETS = {
  rekap: 'Rekap_Jadwal_Padam',
  daerah: 'Master Daerah Padam',
  beban: 'Master_Beban'
};
var JADWAL_PADAM_COLS = { no:0,kode:1,ulp:2,up3:3,gi:4,penyulang:5,section:6,jenis:7,tanggal:8,jamPadam:9,jamNyala:10,durasi:11,bebanMw:12,arus:13,jumlahGardu:14,jumlahPelanggan:15,daerah:16,vip:17,status:18,lokasi:19 };

function _jpSs_(){ return SpreadsheetApp.openById(JADWAL_PADAM_SS_ID); }
function _jpText_(v){ return String(v == null ? '' : v).trim(); }
function _jpNorm_(v){ return _jpText_(v).toLowerCase().replace(/\s+/g, ' '); }
function _jpSheetKey_(v){ return _jpText_(v).toLowerCase().replace(/[^a-z0-9]/g, ''); }

/* Nama tab pernah memakai underscore dan spasi. Resolver ini membuat keduanya tetap terbaca. */
function _jpSheet_(name){
  var ss = _jpSs_();
  var direct = ss.getSheetByName(name);
  if (direct) return direct;
  var wanted = _jpSheetKey_(name);
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (_jpSheetKey_(sheets[i].getName()) === wanted) return sheets[i];
  }
  return null;
}

function _jpRows_(name){
  var sh = _jpSheet_(name);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}
function _jpTgl_(v){
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd');
  var s = _jpText_(v), m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : s.slice(0, 10);
}
function _jpHeaders_(rows){ return rows.length ? rows[0].map(_jpText_) : []; }
function _jpHeaderMap_(headers){ var m = {}; headers.forEach(function(h, i){ m[_jpNorm_(h)] = i; }); return m; }
function _jpMasterContext_(){
  var sh = _jpSheet_(JADWAL_PADAM_SHEETS.daerah);
  if (!sh) throw new Error('Sheet Master Daerah Padam tidak ditemukan.');
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return { sh: sh, map: _jpHeaderMap_(_jpHeaders_([head])) };
}
function _jpValue_(row, map, key){ var i = map[key]; return i == null ? '' : row[i]; }

function _jpMaster_(peny, section){
  var rows = _jpRows_(JADWAL_PADAM_SHEETS.daerah), ctx = _jpMasterContext_(), map = ctx.map;
  for (var i = 0; i < rows.length; i++) {
    if (_jpNorm_(_jpValue_(rows[i], map, 'penyulang')) !== _jpNorm_(peny)) continue;
    if (section && _jpNorm_(_jpValue_(rows[i], map, 'section')) !== _jpNorm_(section)) continue;
    return _jpMasterRow_(rows[i], map);
  }
  return null;
}

function _jpMasterRow_(row, map){
  return {
    bebanMw: _jpValue_(row, map, 'beban mw'),
    arus: _jpValue_(row, map, 'arus (a)'),
    ulp: _jpText_(_jpValue_(row, map, 'ulp')),
    up3: _jpText_(_jpValue_(row, map, 'up3')),
    gi: _jpText_(_jpValue_(row, map, 'gi')),
    penyulang: _jpText_(_jpValue_(row, map, 'penyulang')),
    section: _jpText_(_jpValue_(row, map, 'section')),
    tipeSwitching: _jpText_(_jpValue_(row, map, 'tipe switching')),
    jumlahGardu: _jpValue_(row, map, 'jumlah gardu'),
    jumlahPelanggan: _jpValue_(row, map, 'jumlah pelanggan'),
    daerahSection: _jpText_(_jpValue_(row, map, 'daerah section')),
    pelangganVip: _jpText_(_jpValue_(row, map, 'pelanggan vip'))
  };
}

function getJadwalPadamMaster(params){
  params = params || {};
  var rows = _jpRows_(JADWAL_PADAM_SHEETS.daerah), ctx = _jpMasterContext_(), map = ctx.map, out = [];
  for (var i = 0; i < rows.length; i++) {
    var item = _jpMasterRow_(rows[i], map);
    if (!item.penyulang || !item.section) continue;
    if (params.ulp && _jpNorm_(item.ulp) !== _jpNorm_(params.ulp)) continue;
    out.push(item);
  }
  return { ok: true, rows: out };
}

function getJadwalPadamList(params){
  params = params || {};
  var rows = _jpRows_(JADWAL_PADAM_SHEETS.rekap), out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i], item = { no:r[0],kode:r[1],ulp:r[2],up3:r[3],gi:r[4],penyulang:r[5],section:r[6],jenis:r[7],tanggal:_jpTgl_(r[8]),jamPadam:r[9],jamNyala:r[10],durasi:r[11],bebanMw:r[12],arus:r[13],jumlahGardu:r[14],jumlahPelanggan:r[15],daerah:r[16],vip:r[17],status:r[18],lokasi:r[19] };
    if (params.ulp && _jpNorm_(item.ulp) !== _jpNorm_(params.ulp)) continue;
    if (params.penyulang && _jpNorm_(item.penyulang) !== _jpNorm_(params.penyulang)) continue;
    if (params.section && _jpNorm_(item.section) !== _jpNorm_(params.section)) continue;
    if (params.tglDari && item.tanggal < params.tglDari) continue;
    if (params.tglSampai && item.tanggal > params.tglSampai) continue;
    out.push(item);
  }
  return { ok: true, rows: out };
}

function getJadwalPadamMasterBeban(params){
  params = params || {};
  /* Sumber utama beban sekarang Master Daerah Padam agar pilihan feeder/section selalu konsisten. */
  var master = _jpMaster_(params.penyulang, params.section || '');
  if (master) return { ok:true, rows:[{ penyulang:master.penyulang, bebanMw:master.bebanMw, beban:master.bebanMw, arus:master.arus }] };
  return { ok:true, rows:[] };
}
