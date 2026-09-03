/* ═════════════════════════════════════
   Tek-InsDu.gs — SiSi ULP Toboali (MODUL INSPEKSI GARDU)
   Fungsi: Simpan Header Inspeksi Gardu + daftar header gardu.
   Konstanta & helper bersama ada di Code.gs (Inti).
   Lintas-file: _hariFromTanggal / _kodeUlpByUlp ada di Tek-InsJar.gs.
═════════════════════════════════════ */


/* ═══ MASTER GARDU — sumber data realisasi (LIVE) ═══ */
// Detail teknis gardu (merk, kVA, berat, volume minyak, box PHB-TR, alamat)
// dibaca LIVE dari master gardu — tidak disalin ke db_InsDu_Realisasi.
// Set tab master di bawah. spreadsheetId '' = file SiSi yang sama.
// headerRows = jumlah baris judul SEBELUM baris data pertama.
var GARDU_MASTER = { spreadsheetId:'1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw', tab:'Master_Gardu', headerRows:11 };
// Kolom master gardu (0-based): B=1 C=2 D=3 E=4 F=5 L=11 M=12 Q=16 R=17 S=18 U=20 FL=167 FN=169
// Identitas Trafo: Nomor Seri N=13 Tahun O=14 Lokasi I=8 J=9
// Pengukuran WBP: Tegangan AB=27 AC=28 AD=29 AE=30 AF=31 AG=32; Beban AH=33 AI=34 AJ=35 AK=36; Persentase Beban EY=154
// Pengukuran LWBP: Tegangan BE=56 BF=57 BG=58 BH=59 BI=60 BJ=61; Beban BK=62 BL=63 BM=64 BN=65
var COL_GARDU = {
  ulp:1, nomorGardu:2, alamat:3, penyulang:4, section:5,
  konstruksiTrafo:10, jurusanTerpasang:23, jurusanTerpakai:24, lokasiTrafoLat:8, lokasiTrafoLng:9,
  merkTrafo:11, dayaKva:12, nomorSeriTrafo:13, tahunTrafo:14, merkBox:16, nomorSeriBox:17, tahunBox:18,
  tglPengukuran:20, beratTrafo:167, volumeMinyak:169,
  bebanTerpakai:152, // EW - Beban Terpakai di Gardu (A)
  arusMaxPerFasa:110, // DG — Arus Max Per Fasa di Gardu (A)
  teganganWbpRS:27, teganganWbpST:28, teganganWbpRT:29, teganganWbpRN:30, teganganWbpSN:31, teganganWbpTN:32,
  bebanWbpR:33, bebanWbpS:34, bebanWbpT:35, bebanWbpN:36,
  teganganLwbpRS:56, teganganLwbpST:57, teganganLwbpTR:58, teganganLwbpRN:59, teganganLwbpSN:60, teganganLwbpTN:61,
  bebanLwbpR:62, bebanLwbpS:63, bebanLwbpT:64, bebanLwbpN:65,
  persentaseBeban:154,
  coverFcoAtas:171, coverFcoBawah:172, coverBushingTm:173, coverBushingTr:174, coverArrester:175, coverJumperanAtas:176, coverJumperanBawah:177
};
// db_InsDu_Realisasi (1 baris = 1 gardu). Kolom A (No) diisi formula; kode menulis B..L.
var SHEET_INSDU_REALISASI = 'db_InsDu_Realisasi';
var COL_INSDU = { REALISASI:{ no:0, kodeHeader:1, kodePekerjaanGardu:2, hari:3, tanggal:4, penyulang:5, section:6, nomorGardu:7, tier:8, jumlahTemuan:9, inputBy:10, timestamp:11 } };
var _garduMasterMemo = null;


/* ═══ INSPEKSI GARDU — SIMPAN HEADER (Tambah Data) ═══ */
// Sama pola dgn simpanHeaderInsJar, beda: kode INSDU + Sub-Tim 'Inspeksi Gardu'.
// Gardu tidak memakai KM (dibiarkan kosong). Koordinat = koordinat
// gardu awal & akhir kerja. WA Text menyusul (sementara kosong).
function simpanHeaderInsGardu(data){
  var g = guard_(arguments, { ulp: true, aksi: 'simpanHeaderInsGardu' });
  try{
    data = data || {};
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    var ulp     = ulpScope_(g, data.ulp) || String(g.ulp || '').trim();
    var kodeUlp = '';
    if (String(data.ulp || '').trim() && bolehLintasUlp_(g) &&
        String(data.ulp).trim().toLowerCase() !== String(g.ulp || '').trim().toLowerCase()) {
      kodeUlp = _kodeUlpByUlp(ss, ulp);
    } else {
      kodeUlp = String(g.kodeUlp || '').trim();
    }
    if(!kodeUlp) kodeUlp = _kodeUlpByUlp(ss, ulp);
    if(!ulp)     return { ok:false, message:'ULP untuk user tidak ditemukan di db_Users.' };
    if(!kodeUlp) return { ok:false, message:'Kode ULP untuk ULP terpilih kosong di db_Users.' };

    var kodeHeader = _generateKodeHeaderInsGardu(ss, kodeUlp, data.tanggal);
    var hari       = _hariFromTanggal(data.tanggal);
    var now        = new Date();

    var sh  = ss.getSheetByName(SHEET_INS.HEADER);
    var row = sh.getLastRow() + 1;
    sh.getRange(row, 2, 1, 15).setValues([[
      kodeHeader,
      ulp,
      hari,
      data.tanggal,
      'Inspeksi',
      'Inspeksi Gardu',
      data.koordinatAwal || '',
      data.koordinatAkhir || '',
      data.kmAwal || '',
      data.kmAkhir || '',
      data.kendala || '',
      '',
      now,
      String(g.username || ''),
      now
    ]]);

    return { ok:true, kodeHeader:kodeHeader };
  }catch(e){
    return { ok:false, message:e.message };
  }
}

function _generateKodeHeaderInsGardu(ss, kodeUlp, tanggal){
  var tgl    = _normTgl(tanggal).replace(/-/g,'').slice(2);
  var prefix = 'IGD-' + (kodeUlp||'').toString().trim() + tgl;
  var data   = ss.getSheetByName(SHEET_INS.HEADER).getDataRange().getValues();
  var n = 0;
  for(var i=1;i<data.length;i++){
    if((data[i][COL_INS.HEADER.kodeHeader]||'').toString().indexOf(prefix) === 0) n++;
  }
  return prefix + ('00'+(n+1)).slice(-3);
}

// Daftar header gardu (Sub-Tim 'Inspeksi Gardu') untuk halaman Tek-InsDu. DUAL-READ (AKTIF + ARSIP).
function getDataHeaderInsGardu(params){
  params = params || {};
  var H = COL_INS.HEADER;
  var norm = function(v){ return String(v==null?'':v).trim().toLowerCase(); };
  var dari = params.tglDari || '', sampai = params.tglSampai || '', fUlp = norm(params.ulp);
  var headers = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.HEADER, H.kodeHeader, H.statusTextWa + 1)
    : _readSheetIns(SHEET_INS.HEADER);

  return headers
    .filter(function(h){
      if(norm(h[H.tim]) !== 'inspeksi') return false;
      if(norm(h[H.subTim]) !== 'inspeksi gardu') return false;
      if(fUlp && norm(h[H.ulp]) !== fUlp) return false;
      return _insInRange(_normTgl(h[H.tanggal]), dari, sampai);
    })
    .map(function(h){
      return {
        kodeHeader:     String(h[H.kodeHeader] || '').trim(),
        ulp:            String(h[H.ulp] || '').trim(),
        hari:           String(h[H.hari] || '').trim(),
        tanggal:        _normTgl(h[H.tanggal]),
        koordinatAwal:  String(h[H.koordinatAwal] || '').trim(),
        koordinatAkhir: String(h[H.koordinatAkhir] || '').trim(),
        kmAwal:         String(h[H.kmAwal] || '').trim(),
        kmAkhir:        String(h[H.kmAkhir] || '').trim(),
        kendala:        String(h[H.kendala] || '').trim(),
        waText:         String(h[H.waText] || '').trim()
      };
    })
    .sort(function(a,b){
      return String(b.tanggal).localeCompare(String(a.tanggal))
          || String(b.kodeHeader).localeCompare(String(a.kodeHeader));
    });
}


/* ═════════════════════════════════════
   INSPEKSI GARDU — REALISASI (per Gardu) + Builder WA
═════════════════════════ */

function _garduMasterRows(){
  if(_garduMasterMemo) return _garduMasterMemo;
  var ss = GARDU_MASTER.spreadsheetId
    ? SpreadsheetApp.openById(GARDU_MASTER.spreadsheetId)
    : SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(GARDU_MASTER.tab);
  if(!sh) throw new Error('Tab master gardu tidak ditemukan: '+GARDU_MASTER.tab);
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if(lastRow <= GARDU_MASTER.headerRows){ _garduMasterMemo = []; return _garduMasterMemo; }
  var vals = sh.getRange(1, 1, lastRow, lastCol).getValues();
  _garduMasterMemo = vals.slice(GARDU_MASTER.headerRows);
  return _garduMasterMemo;
}

function _garduObj(r){
  return {
    ulp:          String(r[COL_GARDU.ulp]          || '').trim(),
    nomorGardu:   String(r[COL_GARDU.nomorGardu]   || '').trim(),
    alamat:       String(r[COL_GARDU.alamat]       || '').trim(),
    penyulang:    String(r[COL_GARDU.penyulang]    || '').trim(),
    section:      String(r[COL_GARDU.section]      || '').trim(),
    konstruksiTrafo:String(r[COL_GARDU.konstruksiTrafo]||'').trim(),
    jurusanTerpasang:String(r[COL_GARDU.jurusanTerpasang]||'').trim(),
    jurusanTerpakai:String(r[COL_GARDU.jurusanTerpakai]||'').trim(),
    merkTrafo:    String(r[COL_GARDU.merkTrafo]    || '').trim(),
    dayaKva:      String(r[COL_GARDU.dayaKva]      || '').trim(),
    merkBox:      String(r[COL_GARDU.merkBox]      || '').trim(),
    nomorSeriBox: String(r[COL_GARDU.nomorSeriBox] || '').trim(),
    tahunBox:     String(r[COL_GARDU.tahunBox]     || '').trim(),
    tglPengukuran:r[COL_GARDU.tglPengukuran],
    beratTrafo:   String(r[COL_GARDU.beratTrafo]   || '').trim(),
    volumeMinyak: String(r[COL_GARDU.volumeMinyak] || '').trim(),
    arusMaxPerFasa:String(r[COL_GARDU.arusMaxPerFasa]||'').trim(),
    bebanTerpakai:String(r[COL_GARDU.bebanTerpakai]||'').trim(),
    teganganWbpRS:r[COL_GARDU.teganganWbpRS],
    teganganWbpST:r[COL_GARDU.teganganWbpST],
    teganganWbpRT:r[COL_GARDU.teganganWbpRT],
    teganganWbpRN:r[COL_GARDU.teganganWbpRN],
    teganganWbpSN:r[COL_GARDU.teganganWbpSN],
    teganganWbpTN:r[COL_GARDU.teganganWbpTN],
    bebanWbpR:    r[COL_GARDU.bebanWbpR],
    bebanWbpS:    r[COL_GARDU.bebanWbpS],
    bebanWbpT:    r[COL_GARDU.bebanWbpT],
    bebanWbpN:    r[COL_GARDU.bebanWbpN],
    teganganLwbpRS:r[COL_GARDU.teganganLwbpRS],
    teganganLwbpST:r[COL_GARDU.teganganLwbpST],
    teganganLwbpTR:r[COL_GARDU.teganganLwbpTR],
    teganganLwbpRN:r[COL_GARDU.teganganLwbpRN],
    teganganLwbpSN:r[COL_GARDU.teganganLwbpSN],
    teganganLwbpTN:r[COL_GARDU.teganganLwbpTN],
    bebanLwbpR:   r[COL_GARDU.bebanLwbpR],
    bebanLwbpS:   r[COL_GARDU.bebanLwbpS],
    bebanLwbpT:   r[COL_GARDU.bebanLwbpT],
    bebanLwbpN:   r[COL_GARDU.bebanLwbpN],
    nomorSeriTrafo:String(r[COL_GARDU.nomorSeriTrafo]||'').trim(),
    tahunTrafo:   String(r[COL_GARDU.tahunTrafo]||'').trim(),
    lokasiTrafo:  [String(r[COL_GARDU.lokasiTrafoLat]||'').trim(), String(r[COL_GARDU.lokasiTrafoLng]||'').trim()].filter(Boolean).join(', '),
    persentaseBeban:r[COL_GARDU.persentaseBeban],
    coverFcoAtas:String(r[COL_GARDU.coverFcoAtas]||'').trim(),
    coverFcoBawah:String(r[COL_GARDU.coverFcoBawah]||'').trim(),
    coverBushingTm:String(r[COL_GARDU.coverBushingTm]||'').trim(),
    coverBushingTr:String(r[COL_GARDU.coverBushingTr]||'').trim(),
    coverArrester:String(r[COL_GARDU.coverArrester]||'').trim(),
    coverJumperanAtas:String(r[COL_GARDU.coverJumperanAtas]||'').trim(),
    coverJumperanBawah:String(r[COL_GARDU.coverJumperanBawah]||'').trim()
  };
}

function _tglKeyGardu(v){
  if(Object.prototype.toString.call(v)==='[object Date]' && !isNaN(v.getTime())){
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(v==null?'':v).trim();
  if(!s) return '';
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m) return m[1]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[3]).slice(-2);
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if(m) return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  return s;
}

function _tglIndoGardu(s){
  var BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var k = _tglKeyGardu(s);
  var m = k.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return String(s==null?'':s);
  return m[3]+' '+BLN[parseInt(m[2],10)-1]+' '+m[1];
}

function getListPenyulangGardu(ulp){
  try{
    var f = String(ulp||'').trim().toLowerCase();
    var rows = _garduMasterRows();
    var set = {};
    for(var i=0;i<rows.length;i++){
      var p = String(rows[i][COL_GARDU.penyulang]||'').trim();
      if(!p) continue;
      if(f && String(rows[i][COL_GARDU.ulp]||'').trim().toLowerCase()!==f) continue;
      set[p] = true;
    }
    return { ok:true, list:Object.keys(set).sort() };
  }catch(e){ return { ok:false, message:e.message, list:[] }; }
}

function getListGarduByPenyulang(params){
  try{
    params = params || {};
    var pen = String(params.penyulang||'').trim().toLowerCase();
    if(!pen) return { ok:false, message:'Penyulang wajib dipilih.', list:[] };
    var tglHeader = _tglKeyGardu(params.tanggal);
    var rows = _garduMasterRows();
    var list = [];
    for(var i=0;i<rows.length;i++){
      if(String(rows[i][COL_GARDU.penyulang]||'').trim().toLowerCase()!==pen) continue;
      var nomor = String(rows[i][COL_GARDU.nomorGardu]||'').trim();
      if(!nomor) continue;
      var tglUkur = _tglKeyGardu(rows[i][COL_GARDU.tglPengukuran]);
      list.push({
        nomorGardu: nomor,
        merkTrafo:  String(rows[i][COL_GARDU.merkTrafo]||'').trim(),
        dayaKva:    String(rows[i][COL_GARDU.dayaKva]||'').trim(),
        section:    String(rows[i][COL_GARDU.section]||'').trim(),
        tglPengukuran: tglUkur,
        updated:    (!!tglHeader && tglUkur===tglHeader)
      });
    }
    list.sort(function(a,b){ return a.nomorGardu.localeCompare(b.nomorGardu); });
    return { ok:true, list:list };
  }catch(e){ return { ok:false, message:e.message, list:[] }; }
}

function _findGarduByNomor(nomor){
  var key = String(nomor||'').trim().toLowerCase();
  if(!key) return null;
  var rows = _garduMasterRows();
  for(var i=0;i<rows.length;i++){
    if(String(rows[i][COL_GARDU.nomorGardu]||'').trim().toLowerCase()===key) return _garduObj(rows[i]);
  }
  return null;
}

function _getHeaderInsByKode(ss, kodeHeader){
  var H = COL_INS.HEADER;
  var data = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.HEADER, H.kodeHeader, H.statusTextWa + 1)
    : ss.getSheetByName(SHEET_INS.HEADER).getDataRange().getValues();
  var key = String(kodeHeader||'').trim();
  for(var i=0;i<data.length;i++){
    if(String(data[i][H.kodeHeader]||'').trim()===key){
      return {
        rowIndex:       i+1,
        kodeHeader:     key,
        ulp:            String(data[i][H.ulp]||'').trim(),
        hari:           String(data[i][H.hari]||'').trim(),
        tanggal:        _normTgl(data[i][H.tanggal]),
        koordinatAwal:  String(data[i][H.koordinatAwal]||'').trim(),
        koordinatAkhir: String(data[i][H.koordinatAkhir]||'').trim(),
        kmAwal:         String(data[i][H.kmAwal]||'').trim(),
        kmAkhir:        String(data[i][H.kmAkhir]||'').trim(),
        kendala:        String(data[i][H.kendala]||'').trim()
      };
    }
  }
  return null;
}

function _generateKodePekerjaanGardu(ss, kodeHeader){
  var key = String(kodeHeader||'').trim();
  if(!key) return '';
  var prefix = key + '-GDU.';
  var sh = ss.getSheetByName(SHEET_INSDU_REALISASI);
  var maks = 0;
  if(sh){
    var data = sh.getDataRange().getValues();
    for(var i=1;i<data.length;i++){
      var v = String(data[i][COL_INSDU.REALISASI.kodePekerjaanGardu]||'').trim();
      if(v.indexOf(prefix)===0){
        var num = parseInt(v.substring(prefix.length), 10);
        if(!isNaN(num) && num > maks) maks = num;
      }
    }
  }
  return prefix + ('00'+(maks+1)).slice(-3);
}

function _hitungTemuanGardu(ss, kodeHeader, nomorGardu){
  var T = COL_INS.TEMUAN;
  var data = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.folderPath + 1)
    : (ss.getSheetByName(SHEET_INS.TEMUAN) ? ss.getSheetByName(SHEET_INS.TEMUAN).getDataRange().getValues() : []);
  var kh = String(kodeHeader||'').trim();
  var ng = String(nomorGardu||'').trim().toLowerCase();
  var n = 0;
  for(var i=0;i<data.length;i++){
    if(String(data[i][T.kodeHeader]||'').trim()!==kh) continue;
    if(String(data[i][T.nomorGardu]||'').trim().toLowerCase()!==ng) continue;
    if(!String(data[i][T.fotoTemuanUrl]||'').trim()) continue;
    if(!String(data[i][T.fotoTiangUrl]||'').trim()) continue;
    n++;
  }
  return n;
}

function _temuanGarduMap(ss, kodeHeader){
  var T = COL_INS.TEMUAN;
  var map = {};
  var data = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.folderPath + 1)
    : (ss.getSheetByName(SHEET_INS.TEMUAN) ? ss.getSheetByName(SHEET_INS.TEMUAN).getDataRange().getValues() : []);
  var kh = String(kodeHeader||'').trim();
  for(var i=0;i<data.length;i++){
    if(String(data[i][T.kodeHeader]||'').trim()!==kh) continue;
    var nomor = String(data[i][T.nomorGardu]||'').trim();
    if(!nomor) continue;
    if(!String(data[i][T.fotoTemuanUrl]||'').trim()) continue;
    if(!String(data[i][T.fotoTiangUrl]||'').trim()) continue;
    var key = nomor.toLowerCase();
    if(!map[key]) map[key] = [];
    var t = String(data[i][T.temuan]||'').trim();
    if(t && t.toLowerCase()!=='nihil') map[key].push(t);
  }
  return map;
}

function simpanRealisasiInsGardu(data){
  var gAks = guard_(arguments, { ulp: true, aksi: 'simpanRealisasiInsGardu' });
  try{
    data = data || {};
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var kodeHeader = String(data.kodeHeader||'').trim();
    var nomorGardu = String(data.nomorGardu||'').trim();
    var tier       = String(data.tier||'').trim();
    if(!kodeHeader) return { ok:false, message:'Kode Header wajib.' };
    if(!nomorGardu) return { ok:false, message:'Nomor Gardu wajib dipilih.' };
    if(!tier)       return { ok:false, message:'Tier wajib dipilih.' };

    var header = _getHeaderInsByKode(ss, kodeHeader);
    if(!header) return { ok:false, message:'Header tidak ditemukan: '+kodeHeader };
    if(!barisUlpCocok_(gAks, header.ulp)){
      audit_(gAks.sesi, 'simpanRealisasiInsGardu', kodeHeader, 'TOLAK', 'header milik ULP lain');
      return { ok:false, message:'Header bukan milik ULP Anda.' };
    }

    var g = _findGarduByNomor(nomorGardu);
    if(!g) return { ok:false, message:'Gardu '+nomorGardu+' tidak ada di master.' };
    if(_tglKeyGardu(g.tglPengukuran)!==_tglKeyGardu(header.tanggal)){
      return { ok:false, message:'Gardu '+nomorGardu+' belum diukur pada tanggal header. Update data gardu dulu.' };
    }

    var R   = COL_INSDU.REALISASI;
    var sh  = ss.getSheetByName(SHEET_INSDU_REALISASI);
    if(!sh) return { ok:false, message:'Sheet '+SHEET_INSDU_REALISASI+' tidak ditemukan.' };
    var rows = sh.getDataRange().getValues();
    for(var i=1;i<rows.length;i++){
      if(String(rows[i][R.kodeHeader]||'').trim()===kodeHeader
         && String(rows[i][R.nomorGardu]||'').trim().toLowerCase()===nomorGardu.toLowerCase()){
        return { ok:false, message:'Gardu '+nomorGardu+' sudah ada di header ini.' };
      }
    }

    var kodePekerjaan  = _generateKodePekerjaanGardu(ss, kodeHeader);
    var jumlahTemuan   = _hitungTemuanGardu(ss, kodeHeader, nomorGardu);
    var tgl            = _normTgl(header.tanggal);
    var hari           = header.hari || _hariFromTanggal(tgl);
    var now            = new Date();
    var row            = sh.getLastRow() + 1;
    sh.getRange(row, 2, 1, 11).setValues([[
      kodeHeader,
      kodePekerjaan,
      hari,
      tgl,
      g.penyulang || '',
      g.section || '',
      nomorGardu,
      tier,
      jumlahTemuan,
      data.username || '',
      now
    ]]);

    var migrasi = _migrasiTemuanTerbukaGardu(ss, kodeHeader, kodePekerjaan, nomorGardu, header);
    recalcRealisasiGarduByHeader(ss, kodeHeader);
    return { ok:true, kodePekerjaan:kodePekerjaan, temuanDibawa:migrasi };
  }catch(e){
    return { ok:false, message:e.message };
  }
}

function _migrasiTemuanTerbukaGardu(ss, kodeHeaderBaru, kodePekerjaanBaru, nomorGardu, header){
  var T = COL_INS.TEMUAN;
  var shT = ss.getSheetByName(SHEET_INS.TEMUAN);
  if(!shT) return 0;
  var data = shT.getDataRange().getValues();
  var khBaru = String(kodeHeaderBaru||'').trim();
  var ng     = String(nomorGardu||'').trim().toLowerCase();
  if(!khBaru || !ng) return 0;

  header = header || _getHeaderInsByKode(ss, khBaru) || {};
  var tgl  = _normTgl(header.tanggal);
  var hari = header.hari || _hariFromTanggal(tgl);
  var ulp  = String(header.ulp||'').trim();
  var kpBaru  = String(kodePekerjaanBaru||'').trim();
  var selesai = String(STATUS_INS.SELESAI||'Selesai').trim().toLowerCase();
  var dibawa = 0;

  for(var i=1;i<data.length;i++){
    var r = data[i];
    if(String(r[T.objekInspeksi]||'').trim().toLowerCase()!=='gardu') continue;
    if(String(r[T.nomorGardu]||'').trim().toLowerCase()!==ng) continue;
    if(String(r[T.status]||'').trim().toLowerCase()===selesai) continue;
    if(String(r[T.kodeHeader]||'').trim()===khBaru) continue;
    var tglTemuan = _normTgl(r[T.tanggal]);
    if(tglTemuan && _selisihHariIns(tgl, tglTemuan) <= 30) continue;
    var rowNum = i+1;
    shT.getRange(rowNum, T.kodeHeader+1).setValue(khBaru);
    shT.getRange(rowNum, T.kodePekerjaanPeny+1).setValue(kpBaru);
    if(ulp) shT.getRange(rowNum, T.ulp+1).setValue(ulp);
    shT.getRange(rowNum, T.hari+1).setValue(hari);
    shT.getRange(rowNum, T.tanggal+1).setValue(tgl);
    dibawa++;
  }
  return dibawa;
}

function _selisihHariIns(tglA, tglB){
  var a = new Date(String(tglA||'')+'T00:00:00');
  var b = new Date(String(tglB||'')+'T00:00:00');
  if(isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round((a.getTime()-b.getTime())/86400000);
}

function migrasiTemuanGarduHarian(){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var R = COL_INSDU.REALISASI;
    var sh = ss.getSheetByName(SHEET_INSDU_REALISASI);
    if(!sh) return { ok:false, message:'Sheet realisasi gardu tidak ditemukan.' };
    var rows = sh.getDataRange().getValues();
    var tz = 'Asia/Jakarta';
    var hariIni = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var kemarin = Utilities.formatDate(new Date(Date.now()-86400000), tz, 'yyyy-MM-dd');
    var headerCache = {}, headerTersentuh = {};
    var dibawaTotal = 0, diproses = 0;
    for(var i=1;i<rows.length;i++){
      var tgl = _normTgl(rows[i][R.tanggal]);
      if(tgl!==hariIni && tgl!==kemarin) continue;
      var kh = String(rows[i][R.kodeHeader]||'').trim();
      var kp = String(rows[i][R.kodePekerjaanGardu]||'').trim();
      var ng = String(rows[i][R.nomorGardu]||'').trim();
      if(!kh || !ng) continue;
      var header = headerCache[kh] || (headerCache[kh] = _getHeaderInsByKode(ss, kh));
      if(!header) continue;
      var n = _migrasiTemuanTerbukaGardu(ss, kh, kp, ng, header);
      dibawaTotal += n; diproses++;
      if(n) headerTersentuh[kh] = true;
    }
    Object.keys(headerTersentuh).forEach(function(kh){
      try { recalcRealisasiGarduByHeader(ss, kh); } catch(e){}
    });
    return { ok:true, diproses:diproses, temuanDibawa:dibawaTotal };
  }catch(e){ return { ok:false, message:e.message }; }
}

function getDetailRealisasiGardu(kodeHeader){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var header = _getHeaderInsByKode(ss, kodeHeader);
    if(!header) return { ok:false, message:'Header tidak ditemukan.' };
    var R = COL_INSDU.REALISASI;
    var rows = (typeof _readSheetDual_ === 'function')
      ? _readSheetDual_(SHEET_INSDU_REALISASI, R.kodePekerjaanGardu, 12)
      : (ss.getSheetByName(SHEET_INSDU_REALISASI) ? ss.getSheetByName(SHEET_INSDU_REALISASI).getDataRange().getValues() : []);
    var kh = String(kodeHeader||'').trim();
    var list = [];
    for(var i=0;i<rows.length;i++){
      if(String(rows[i][R.kodeHeader]||'').trim()!==kh) continue;
      var nomor = String(rows[i][R.nomorGardu]||'').trim();
      var g = _findGarduByNomor(nomor) || {};
      list.push({
        kodePekerjaan: String(rows[i][R.kodePekerjaanGardu]||'').trim(),
        nomorGardu:    nomor,
        penyulang:     String(rows[i][R.penyulang]||'').trim() || (g.penyulang||''),
        section:       String(rows[i][R.section]||'').trim() || (g.section||''),
        merkTrafo:     g.merkTrafo || '',
        dayaKva:       g.dayaKva || '',
        tier:          String(rows[i][R.tier]||'').trim(),
        jumlahTemuan:  Number(rows[i][R.jumlahTemuan]||0)
      });
    }
    return { ok:true, header:header, rows:list };
  }catch(e){ return { ok:false, message:e.message }; }
}

function _findRealisasiGardu(ss, kodeHeader, nomorGardu){
  var R = COL_INSDU.REALISASI;
  var sh = ss.getSheetByName(SHEET_INSDU_REALISASI);
  if(!sh) return null;
  var rows = sh.getDataRange().getValues();
  var kh = String(kodeHeader||'').trim();
  var ng = String(nomorGardu||'').trim().toLowerCase();
  for(var i=1;i<rows.length;i++){
    if(String(rows[i][R.kodeHeader]||'').trim()===kh
       && String(rows[i][R.nomorGardu]||'').trim().toLowerCase()===ng){
      return { rowIndex:i+1,
        kodePekerjaanGardu:String(rows[i][R.kodePekerjaanGardu]||'').trim(),
        penyulang:String(rows[i][R.penyulang]||'').trim(),
        section:String(rows[i][R.section]||'').trim(),
        nomorGardu:String(rows[i][R.nomorGardu]||'').trim(),
        tier:String(rows[i][R.tier]||'').trim() };
    }
  }
  return null;
}

function _generateKodeTemuanGarduBerantai(ss, kodePekerjaanGardu){
  var key = String(kodePekerjaanGardu||'').trim();
  if(!key) return '';
  var prefix = key + '-TGD.';
  var sh = ss.getSheetByName(SHEET_INS.TEMUAN);
  if(!sh) return prefix + '001';
  var last = sh.getLastRow(), maks = 0;
  if(last > 1){
    var col = sh.getRange(2, COL_INS.TEMUAN.kodePekerjaan + 1, last - 1, 1).getValues();
    for(var i=0;i<col.length;i++){
      var v = String(col[i][0]||'').trim();
      if(v.indexOf(prefix) === 0){
        var num = parseInt(v.substring(prefix.length), 10);
        if(!isNaN(num) && num > maks) maks = num;
      }
    }
  }
  return prefix + ('00' + (maks+1)).slice(-3);
}

function simpanTemuanGardu(data){
  var gAks = guard_(arguments, { ulp: true, aksi: 'simpanTemuanGardu' });
  try{
    data = data || {};
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var kodeHeader = String(data.kodeHeader||'').trim();
    var nomorGardu = String(data.nomorGardu||'').trim();
    var temuan = String(data.temuan||'').trim();
    if(!kodeHeader) return { ok:false, message:'Kode Header wajib.' };
    if(!nomorGardu) return { ok:false, message:'Nomor Gardu wajib.' };
    if(!temuan) return { ok:false, message:'Temuan wajib dipilih.' };
    var header = _getHeaderInsByKode(ss, kodeHeader);
    if(!header) return { ok:false, message:'Header tidak ditemukan: '+kodeHeader };
    if(!barisUlpCocok_(gAks, header.ulp)){
      audit_(gAks.sesi, 'simpanTemuanGardu', kodeHeader, 'TOLAK', 'header milik ULP lain');
      return { ok:false, message:'Header bukan milik ULP Anda.' };
    }
    var rg = _findRealisasiGardu(ss, kodeHeader, nomorGardu);
    if(!rg) return { ok:false, message:'Gardu '+nomorGardu+' belum ada di header ini.' };
    var g = _findGarduByNomor(nomorGardu) || {};
    var koord = String(g.lokasiTrafo||'').trim();
    var lat='', lng='';
    if(koord){ var sp=koord.split(','); if(sp.length>=2){ var _la=parseFloat(sp[0].trim()), _lo=parseFloat(sp[1].trim()); lat=isNaN(_la)?'':_la; lng=isNaN(_lo)?'':_lo; } }
    var info = (typeof _userInfoIns==='function')
      ? _userInfoIns(gAks.username)
      : { ulp:header.ulp, kodeUlp:'', tim:'' };
    if(!info) info = { ulp:header.ulp, kodeUlp:'', tim:'' };
    var tgl = _normTgl(header.tanggal);
    var hari = header.hari || _hariFromTanggal(tgl);
    var kodePekerjaan = _generateKodeTemuanGarduBerantai(ss, rg.kodePekerjaanGardu);
    var folder=null;
    function _f(){ if(!folder) folder=_getOrCreateFolderByPath(_folderTemuanPath(tgl, kodePekerjaan)); return folder; }
    var base = kodePekerjaan+'_'+nomorGardu+'_'+temuan;
    var fT={ nama:'', url:'' }, fG={ nama:'', url:'' };
    if(data.fotoTemuanB64) fT=_uploadFotoTemuan(data.fotoTemuanB64, data.fotoTemuanMime, base+'_Foto Temuan', _f());
    if(data.fotoGarduB64) fG=_uploadFotoTemuan(data.fotoGarduB64, data.fotoGarduMime, base+'_Foto Gardu', _f());
    var folderPathStr = _folderTemuanPathStr(tgl, kodePekerjaan);
    var arr = [ kodeHeader, rg.kodePekerjaanGardu, kodePekerjaan, header.ulp, hari, tgl, info.tim||'', 'Gardu',
      rg.penyulang||g.penyulang||'', rg.section||g.section||'', '', '', nomorGardu, rg.tier||'', temuan,
      (fT.nama?folderPathStr+'/'+fT.nama:''), fT.url, (fG.nama?folderPathStr+'/'+fG.nama:''), fG.url, safeCell_(String(data.deskripsi||'')), koord, lat, lng,
      String(gAks.username||''), _tsNowIns(), STATUS_INS.PENUGASAN ];
    var shT = ss.getSheetByName(SHEET_INS.TEMUAN);
    var row = shT.getLastRow()+1;
    shT.getRange(row, 2, 1, arr.length).setValues([arr]);
    shT.getRange(row, COL_INS.TEMUAN.folderPath+1).setValue(folderPathStr);
    recalcWaInsGarduByHeader(kodeHeader);
    return { ok:true, kodePekerjaan:kodePekerjaan };
  }catch(e){ return { ok:false, message:e.message }; }
}

function getTemuanGardu(kodeHeader, nomorGardu){
  try{
    var T = COL_INS.TEMUAN;
    var data = (typeof _readSheetDual_ === 'function')
      ? _readSheetDual_(SHEET_INS.TEMUAN, T.kodePekerjaan, T.folderPath + 1)
      : (SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_INS.TEMUAN).getDataRange().getValues());
    var kh = String(kodeHeader||'').trim();
    var ng = String(nomorGardu||'').trim().toLowerCase();
    var out = [];
    for(var i=0;i<data.length;i++){
      if(String(data[i][T.kodeHeader]||'').trim()!==kh) continue;
      if(String(data[i][T.nomorGardu]||'').trim().toLowerCase()!==ng) continue;
      out.push({ kodePekerjaan:String(data[i][T.kodePekerjaan]||'').trim(),
        temuan:String(data[i][T.temuan]||'').trim(),
        deskripsi:String(data[i][T.deskripsi]||'').trim(),
        koordinat:String(data[i][T.koordinat]||'').trim(),
        section:String(data[i][T.section]||'').trim(),
        tier:String(data[i][T.tier]||'').trim(),
        status:String(data[i][T.status]||'').trim(),
        nomorGardu:String(data[i][T.nomorGardu]||'').trim(),
        fotoTemuanUrl:String(data[i][T.fotoTemuanUrl]||'').trim(),
        fotoGarduUrl:String(data[i][T.fotoTiangUrl]||'').trim() });
    }
    return { ok:true, list: out.reverse() };
  }catch(e){ return { ok:false, message:e.message, list:[] }; }
}

function editTemuanGardu(data){
  var gAks = guard_(arguments, { ulp: true, aksi: 'editTemuanGardu' });
  try{
    data = data || {};
    var kodePekerjaan = String(data.kodePekerjaan||'').trim();
    if(!kodePekerjaan) return { ok:false, message:'Kode Pekerjaan kosong.' };
    var T = COL_INS.TEMUAN;
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET_INS.TEMUAN);
    var rows = sh.getDataRange().getValues();
    var rowIdx=-1, kodeHeader='';
    for(var i=1;i<rows.length;i++){
      if(String(rows[i][T.kodePekerjaan]||'').trim()===kodePekerjaan){ rowIdx=i+1; kodeHeader=String(rows[i][T.kodeHeader]||'').trim(); break; }
    }
    if(rowIdx<0) return { ok:false, message:'Temuan tidak ditemukan: '+kodePekerjaan };
    if(!barisUlpCocok_(gAks, rows[rowIdx-1][T.ulp])){
      audit_(gAks.sesi, 'editTemuanGardu', kodePekerjaan, 'TOLAK', 'temuan milik ULP lain');
      return { ok:false, message:'Temuan bukan milik ULP Anda.' };
    }
    if(data.temuan!=null) sh.getRange(rowIdx, T.temuan+1).setValue(safeCell_(String(data.temuan)));
    if(data.deskripsi!=null) sh.getRange(rowIdx, T.deskripsi+1).setValue(safeCell_(String(data.deskripsi)));
    if(kodeHeader){ try { recalcWaInsGarduByHeader(kodeHeader); } catch(e){} }
    return { ok:true, kodePekerjaan:kodePekerjaan };
  }catch(e){ return { ok:false, message:e.message }; }
}

function editRealisasiGardu(data){
  var gAks = guard_(arguments, { ulp: true, aksi: 'editRealisasiGardu' });
  try{
    data = data || {};
    var kode = String(data.kodePekerjaan||'').trim();
    var tier = String(data.tier||'').trim();
    if(!kode) return { ok:false, message:'Kode pekerjaan gardu kosong.' };
    if(!tier) return { ok:false, message:'Tier wajib dipilih.' };
    var R = COL_INSDU.REALISASI;
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET_INSDU_REALISASI);
    if(!sh) return { ok:false, message:'Sheet realisasi tidak ditemukan.' };
    var rows = sh.getDataRange().getValues();
    var petaUlp = petaUlpHeader_();
    for(var i=1;i<rows.length;i++){
      if(String(rows[i][R.kodePekerjaanGardu]||'').trim()===kode){
        var khR = String(rows[i][R.kodeHeader]||'').trim();
        if(!barisUlpCocok_(gAks, khR ? petaUlp[khR] : '')){
          audit_(gAks.sesi, 'editRealisasiGardu', kode, 'TOLAK', 'realisasi milik ULP lain');
          return { ok:false, message:'Data realisasi bukan milik ULP Anda.' };
        }
        sh.getRange(i+1, R.tier+1).setValue(safeCell_(tier));
        var kh = String(rows[i][R.kodeHeader]||'').trim();
        if(kh){ try { _updateWaTextInsGardu(ss, kh); } catch(e){} }
        return { ok:true };
      }
    }
    return { ok:false, message:'Data realisasi gardu tidak ditemukan.' };
  }catch(e){ return { ok:false, message:e.message }; }
}

function editHeaderInsGardu(data){
  var gAks = guard_(arguments, { ulp: true, aksi: 'editHeaderInsGardu' });
  try{
    data = data || {};
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var H = COL_INS.HEADER;
    var hsh = ss.getSheetByName(SHEET_INS.HEADER);
    var hdata = hsh.getDataRange().getValues();
    var key = String(data.kodeHeader||'').trim();
    var rowIdx = -1;
    for(var i=1;i<hdata.length;i++){
      if(String(hdata[i][H.kodeHeader]||'').trim()===key){ rowIdx=i+1; break; }
    }
    if(rowIdx<0) return { ok:false, message:'Header tidak ditemukan.' };
    if(!barisUlpCocok_(gAks, hdata[rowIdx-1][H.ulp])){
      audit_(gAks.sesi, 'editHeaderInsGardu', key, 'TOLAK', 'header milik ULP lain');
      return { ok:false, message:'Header bukan milik ULP Anda.' };
    }
    hsh.getRange(rowIdx, H.koordinatAwal+1).setValue(safeCell_(data.koordinatAwal||''));
    hsh.getRange(rowIdx, H.koordinatAkhir+1).setValue(safeCell_(data.koordinatAkhir||''));
    hsh.getRange(rowIdx, H.kmAwal+1).setValue(safeCell_(data.kmAwal||''));
    hsh.getRange(rowIdx, H.kmAkhir+1).setValue(safeCell_(data.kmAkhir||''));
    hsh.getRange(rowIdx, H.kendala+1).setValue(safeCell_(data.kendala||''));
    _updateWaTextInsGardu(ss, key);
    return { ok:true };
  }catch(e){ return { ok:false, message:e.message }; }
}

function hapusRealisasiGardu(data){
  var g = guard_(arguments, { ulp: true, aksi: 'hapusRealisasiGardu' });
  try{
    data = data || {};
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var R = COL_INSDU.REALISASI;
    var sh = ss.getSheetByName(SHEET_INSDU_REALISASI);
    if(!sh) return { ok:false, message:'Sheet realisasi tidak ditemukan.' };
    var rows = sh.getDataRange().getValues();
    var kode = String(data.kodePekerjaan||'').trim();
    var petaUlp = petaUlpHeader_();
    for(var i=rows.length-1;i>=1;i--){
      if(String(rows[i][R.kodePekerjaanGardu]||'').trim()===kode){
        var kh = String(rows[i][R.kodeHeader]||'').trim();
        if(!barisUlpCocok_(g, kh ? petaUlp[kh] : '')){
          audit_(g.sesi, 'hapusRealisasiGardu', kode, 'TOLAK', 'baris milik ULP lain');
          return { ok:false, message:'Data realisasi bukan milik ULP Anda.' };
        }
        sh.deleteRow(i+1);
        _updateWaTextInsGardu(ss, kh);
        return { ok:true };
      }
    }
    return { ok:false, message:'Data realisasi tidak ditemukan.' };
  }catch(e){
    if(_guardErrorAkses_(e)) return { ok:false, message:e.message };
    return { ok:false, message:e.message };
  }
}

function recalcRealisasiGarduByHeader(ss, kodeHeader){
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  var R = COL_INSDU.REALISASI;
  var sh = ss.getSheetByName(SHEET_INSDU_REALISASI);
  if(!sh) return;
  var rng = sh.getDataRange();
  var rows = rng.getValues();
  var kh = String(kodeHeader||'').trim();
  var changed = false;
  for(var i=1;i<rows.length;i++){
    if(String(rows[i][R.kodeHeader]||'').trim()!==kh) continue;
    var n = _hitungTemuanGardu(ss, kh, String(rows[i][R.nomorGardu]||'').trim());
    var cur = rows[i][R.jumlahTemuan];
    if(cur==='' || cur===null || cur===undefined || Number(cur||0)!==n){ rows[i][R.jumlahTemuan]=n; changed=true; }
  }
  if(changed) rng.setValues(rows);
  _updateWaTextInsGardu(ss, kh);
}

function _buildWaTextInsGardu(ss, kodeHeader){
  var header = _getHeaderInsByKode(ss, kodeHeader);
  if(!header) return '';
  var R = COL_INSDU.REALISASI;
  var rrows = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INSDU_REALISASI, R.kodePekerjaanGardu, 12)
    : (ss.getSheetByName(SHEET_INSDU_REALISASI) ? ss.getSheetByName(SHEET_INSDU_REALISASI).getDataRange().getValues() : []);
  var kh = String(kodeHeader||'').trim();

  var items = [];
  for(var i=0;i<rrows.length;i++){
    if(String(rrows[i][R.kodeHeader]||'').trim()!==kh) continue;
    var nomor = String(rrows[i][R.nomorGardu]||'').trim();
    if(!nomor) continue;
    var g = _findGarduByNomor(nomor) || {};
    items.push({
      nomorGardu:   nomor,
      tier:         String(rrows[i][R.tier]||'').trim(),
      penyulang:    String(rrows[i][R.penyulang]||'').trim() || (g.penyulang||''),
      section:      String(rrows[i][R.section]||'').trim() || (g.section||''),
      merkTrafo:    g.merkTrafo || '',
      dayaKva:      g.dayaKva || '',
      beratTrafo:   g.beratTrafo || '',
      volumeMinyak: g.volumeMinyak || '',
      merkBox:      g.merkBox || '',
      nomorSeriBox: g.nomorSeriBox || '',
      tahunBox:     g.tahunBox || '',
      alamat:       g.alamat || ''
    });
  }
  if(!items.length) return '';

  var temuanMap = _temuanGarduMap(ss, kh);

  var groups = {}, order = [];
  items.forEach(function(it){
    var key = it.penyulang || '(Tanpa Penyulang)';
    if(!groups[key]){ groups[key] = []; order.push(key); }
    groups[key].push(it);
  });

  var L = [];
  L.push('*Realisasi Inspeksi Gardu*');
  L.push('-------------------------------------------------------------------');
  L.push('Hari / Tanggal : '+header.hari+', '+_tglIndoGardu(header.tanggal));

  order.forEach(function(pen){
    var arr = groups[pen];
    var secs = arr.map(function(a){ return a.section; }).filter(function(s){ return s; });
    var sectionLabel = '';
    try{ sectionLabel = _sectionRange(pen, secs); }catch(e){ sectionLabel = secs.join(' / '); }
    L.push('');
    L.push('Penyulang : *'+pen+'*');
    if(sectionLabel) L.push('Section : *'+sectionLabel+'*');
    L.push('');
    L.push('Koordinat Awal : '+header.koordinatAwal);
    L.push('Koordinat Akhir : '+header.koordinatAkhir);
    L.push('Stand KM Awal / Akhir : '+(header.kmAwal||'-')+' / '+(header.kmAkhir||'-'));
    arr.forEach(function(it, idx){
      L.push('');
      L.push('*'+(idx+1)+'. '+it.nomorGardu+' '+it.merkTrafo+' '+it.dayaKva+'*');
      L.push('- Berat Trafo : '+it.beratTrafo);
      L.push('- Volume Minyak : '+it.volumeMinyak);
      L.push('- Merk Box PHB-TR : '+it.merkBox);
      L.push('- Nomor Seri Box PHB-TR : '+it.nomorSeriBox);
      L.push('- Tahun Box PHB-TR : '+it.tahunBox);
      L.push('Alamat : '+it.alamat);
      if(it.tier) L.push('Inspeksi Tier : '+it.tier);
      L.push('Temuan :');
      var tem = temuanMap[it.nomorGardu.toLowerCase()] || [];
      if(!tem.length){ L.push('1. Nihil'); }
      else { tem.forEach(function(t,k){ L.push((k+1)+'. '+t); }); }
    });
  });
  return L.join('\n');
}

function _updateWaTextInsGardu(ss, kodeHeader){
  var H = COL_INS.HEADER;
  var hsh = ss.getSheetByName(SHEET_INS.HEADER);
  var hdata = hsh.getDataRange().getValues();
  var key = String(kodeHeader||'').trim();
  var rowIdx = -1;
  for(var i=1;i<hdata.length;i++){
    if(String(hdata[i][H.kodeHeader]||'').trim()===key){ rowIdx=i+1; break; }
  }
  if(rowIdx<0) return;
  var wa = _buildWaTextInsGardu(ss, key);
  hsh.getRange(rowIdx, H.waText+1).setValue(wa);
  hsh.getRange(rowIdx, H.timestampUpdate+1).setValue(new Date());
}

function updateHeaderInsGarduLangsung(kodeHeader){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    recalcRealisasiGarduByHeader(ss, kodeHeader);
    var H = COL_INS.HEADER;
    var hdata = ss.getSheetByName(SHEET_INS.HEADER).getDataRange().getValues();
    var key = String(kodeHeader||'').trim();
    var wa = '';
    for(var i=1;i<hdata.length;i++){
      if(String(hdata[i][H.kodeHeader]||'').trim()===key){ wa = String(hdata[i][H.waText]||''); break; }
    }
    return { ok:true, waText:wa };
  }catch(e){ return { ok:false, message:e.message }; }
}

function _isHeaderInsGardu(r){
  var H = COL_INS.HEADER;
  if(!r[H.kodeHeader]) return false;
  if(String(r[H.tim]||'').trim() !== 'Inspeksi') return false;
  return String(r[H.subTim]||'').trim().toLowerCase() === 'inspeksi gardu';
}

function refreshSemuaWaInsGardu(){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var H = COL_INS.HEADER;
    var data = ss.getSheetByName(SHEET_INS.HEADER).getDataRange().getValues();
    var n = 0;
    for(var i=1;i<data.length;i++){
      if(!_isHeaderInsGardu(data[i])) continue;
      recalcRealisasiGarduByHeader(ss, String(data[i][H.kodeHeader]).trim());
      n++;
    }
    return { ok:true, diproses:n };
  }catch(e){ return { ok:false, message:e.message }; }
}

function recalcWaInsGarduByHeader(kodeHeader){
  try{
    var key = String(kodeHeader||'').trim();
    if(!key) return { ok:false, message:'Kode Header kosong.' };
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    recalcRealisasiGarduByHeader(ss, key);
    var H = COL_INS.HEADER;
    var hdata = ss.getSheetByName(SHEET_INS.HEADER).getDataRange().getValues();
    var wa = '';
    for(var i=1;i<hdata.length;i++){
      if(String(hdata[i][H.kodeHeader]||'').trim()===key){ wa = String(hdata[i][H.waText]||''); break; }
    }
    return { ok:true, kodeHeader:key, waText:wa };
  }catch(e){ return { ok:false, message:e.message }; }
}

function refreshWaInsGarduHarian(){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var H = COL_INS.HEADER;
    var data = ss.getSheetByName(SHEET_INS.HEADER).getDataRange().getValues();
    var tz = 'Asia/Jakarta';
    var hariIni = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var kemarin = Utilities.formatDate(new Date(Date.now() - 86400000), tz, 'yyyy-MM-dd');
    var n = 0;
    for(var i=1;i<data.length;i++){
      if(!_isHeaderInsGardu(data[i])) continue;
      var tgl = _normTgl(data[i][H.tanggal]);
      if(tgl !== hariIni && tgl !== kemarin) continue;
      recalcRealisasiGarduByHeader(ss, String(data[i][H.kodeHeader]).trim());
      n++;
    }
    return { ok:true, diproses:n };
  }catch(e){ return { ok:false, message:e.message }; }
}

function getListUlpGardu(){
  try{
    var rows = _garduMasterRows();
    var set = {};
    for(var i=0;i<rows.length;i++){
      var u = String(rows[i][COL_GARDU.ulp]||'').trim();
      if(u) set[u] = true;
    }
    return { ok:true, list:Object.keys(set).sort() };
  }catch(e){ return { ok:false, message:e.message, list:[] }; }
}

function cariPengukuranGardu(params){
  try{
    params = params || {};
    var q     = String(params.nomorGardu||'').trim().toLowerCase();
    var fUlp  = String(params.ulp||'').trim().toLowerCase();
    var limit = Number(params.limit||120);
    var rows  = _garduMasterRows();
    var list  = [];
    for(var i=0;i<rows.length;i++){
      var nomor = String(rows[i][COL_GARDU.nomorGardu]||'').trim();
      if(!nomor) continue;
      if(fUlp && String(rows[i][COL_GARDU.ulp]||'').trim().toLowerCase()!==fUlp) continue;
      if(q && nomor.toLowerCase().indexOf(q)<0) continue;
      var g = _garduObj(rows[i]);
      var key = _tglKeyGardu(rows[i][COL_GARDU.tglPengukuran]);
      g.tglPengukuran     = key;
      g.tglPengukuranIndo = key ? _tglIndoGardu(key) : '';
      list.push(g);
    }
    list.sort(function(a,b){ return a.nomorGardu.localeCompare(b.nomorGardu); });
    var total   = list.length;
    var trimmed = list.slice(0, limit);
    return { ok:true, list:trimmed, total:total, shown:trimmed.length };
  }catch(e){ return { ok:false, message:e.message, list:[] }; }
}

function updatePengukuranGardu(payload){
  var gAks = guard_(arguments, { ulp: true, aksi: 'updatePengukuranGardu' });
  try{
    payload = payload || {};
    var nomor = String(payload.nomorGardu||'').trim();
    if(!nomor) return { ok:false, message:'Nomor gardu tidak ada.' };
    var fUlp = String(payload.ulp||'').trim().toLowerCase();
    var d = payload.data || {};

    var ss = GARDU_MASTER.spreadsheetId
      ? SpreadsheetApp.openById(GARDU_MASTER.spreadsheetId)
      : SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName(GARDU_MASTER.tab);
    if(!sh) return { ok:false, message:'Tab master gardu tidak ditemukan: '+GARDU_MASTER.tab };

    var startRow = GARDU_MASTER.headerRows + 1;
    var lastRow  = sh.getLastRow();
    if(lastRow < startRow) return { ok:false, message:'Data master gardu kosong.' };
    var n = lastRow - startRow + 1;

    var nomorCol = sh.getRange(startRow, COL_GARDU.nomorGardu+1, n, 1).getValues();
    var ulpCol   = fUlp ? sh.getRange(startRow, COL_GARDU.ulp+1, n, 1).getValues() : null;
    var targetRow = -1;
    for(var i=0;i<n;i++){
      if(String(nomorCol[i][0]||'').trim().toLowerCase()!==nomor.toLowerCase()) continue;
      if(ulpCol && String(ulpCol[i][0]||'').trim().toLowerCase()!==fUlp) continue;
      targetRow = startRow + i; break;
    }
    if(targetRow<0) return { ok:false, message:'Gardu '+nomor+' tidak ditemukan di master.' };

    var _num = function(v){ if(v===''||v==null) return ''; var x=Number(v); return isNaN(x)?v:x; };
    var _set = function(col, val){ sh.getRange(targetRow, col+1).setValue(val); };

    if(d.tglPengukuran!==undefined){
      var t = String(d.tglPengukuran||'').trim();
      var m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      _set(COL_GARDU.tglPengukuran, m ? new Date(+m[1], (+m[2])-1, +m[3]) : '');
    }
    if(d.teganganWbpRS!==undefined) _set(COL_GARDU.teganganWbpRS, _num(d.teganganWbpRS));
    if(d.teganganWbpST!==undefined) _set(COL_GARDU.teganganWbpST, _num(d.teganganWbpST));
    if(d.teganganWbpRT!==undefined) _set(COL_GARDU.teganganWbpRT, _num(d.teganganWbpRT));
    if(d.teganganWbpRN!==undefined) _set(COL_GARDU.teganganWbpRN, _num(d.teganganWbpRN));
    if(d.teganganWbpSN!==undefined) _set(COL_GARDU.teganganWbpSN, _num(d.teganganWbpSN));
    if(d.teganganWbpTN!==undefined) _set(COL_GARDU.teganganWbpTN, _num(d.teganganWbpTN));
    if(d.bebanWbpR!==undefined) _set(COL_GARDU.bebanWbpR, _num(d.bebanWbpR));
    if(d.bebanWbpS!==undefined) _set(COL_GARDU.bebanWbpS, _num(d.bebanWbpS));
    if(d.bebanWbpT!==undefined) _set(COL_GARDU.bebanWbpT, _num(d.bebanWbpT));
    if(d.bebanWbpN!==undefined) _set(COL_GARDU.bebanWbpN, _num(d.bebanWbpN));
    if(d.teganganLwbpRS!==undefined) _set(COL_GARDU.teganganLwbpRS, _num(d.teganganLwbpRS));
    if(d.teganganLwbpST!==undefined) _set(COL_GARDU.teganganLwbpST, _num(d.teganganLwbpST));
    if(d.teganganLwbpTR!==undefined) _set(COL_GARDU.teganganLwbpTR, _num(d.teganganLwbpTR));
    if(d.teganganLwbpRN!==undefined) _set(COL_GARDU.teganganLwbpRN, _num(d.teganganLwbpRN));
    if(d.teganganLwbpSN!==undefined) _set(COL_GARDU.teganganLwbpSN, _num(d.teganganLwbpSN));
    if(d.teganganLwbpTN!==undefined) _set(COL_GARDU.teganganLwbpTN, _num(d.teganganLwbpTN));
    if(d.bebanLwbpR!==undefined) _set(COL_GARDU.bebanLwbpR, _num(d.bebanLwbpR));
    if(d.bebanLwbpS!==undefined) _set(COL_GARDU.bebanLwbpS, _num(d.bebanLwbpS));
    if(d.bebanLwbpT!==undefined) _set(COL_GARDU.bebanLwbpT, _num(d.bebanLwbpT));
    if(d.bebanLwbpN!==undefined) _set(COL_GARDU.bebanLwbpN, _num(d.bebanLwbpN));
    if(d.persentaseBeban!==undefined) _set(COL_GARDU.persentaseBeban, _num(d.persentaseBeban));
    if(d.coverFcoAtas!==undefined) _set(COL_GARDU.coverFcoAtas, String(d.coverFcoAtas||'').trim());
    if(d.coverFcoBawah!==undefined) _set(COL_GARDU.coverFcoBawah, String(d.coverFcoBawah||'').trim());
    if(d.coverBushingTm!==undefined) _set(COL_GARDU.coverBushingTm, String(d.coverBushingTm||'').trim());
    if(d.coverBushingTr!==undefined) _set(COL_GARDU.coverBushingTr, String(d.coverBushingTr||'').trim());
    if(d.coverArrester!==undefined) _set(COL_GARDU.coverArrester, String(d.coverArrester||'').trim());
    if(d.coverJumperanAtas!==undefined) _set(COL_GARDU.coverJumperanAtas, String(d.coverJumperanAtas||'').trim());
    if(d.coverJumperanBawah!==undefined) _set(COL_GARDU.coverJumperanBawah, String(d.coverJumperanBawah||'').trim());

    _garduMasterMemo = null;
    return { ok:true, message:'Data pengukuran '+nomor+' berhasil diperbarui.' };
  }catch(e){ return { ok:false, message:'Gagal memperbarui: '+(e&&e.message?e.message:e) }; }
}

var PEJABAT_INSGARDU_PROP = 'PEJABAT_REKAP_INSGARDU';
var PEJABAT_INSGARDU_DEFAULT = { manager:'MARSHEL P.L TOBING', teamLeader:'ANDRYE FAHREZA', koordinator:'APRIANTO' };

function getPejabatRekapInsGardu(){
  try{
    var raw = PropertiesService.getScriptProperties().getProperty(PEJABAT_INSGARDU_PROP);
    var o = raw ? JSON.parse(raw) : {};
    return {
      manager:     String(o.manager     || '').trim() || PEJABAT_INSGARDU_DEFAULT.manager,
      teamLeader:  String(o.teamLeader  || '').trim() || PEJABAT_INSGARDU_DEFAULT.teamLeader,
      koordinator: String(o.koordinator || '').trim() || PEJABAT_INSGARDU_DEFAULT.koordinator
    };
  }catch(e){
    return { manager:PEJABAT_INSGARDU_DEFAULT.manager, teamLeader:PEJABAT_INSGARDU_DEFAULT.teamLeader, koordinator:PEJABAT_INSGARDU_DEFAULT.koordinator };
  }
}

function simpanPejabatRekapInsGardu(payload){
  try{
    payload = payload || {};
    var cur = getPejabatRekapInsGardu();
    var pick = function(v, fb){ v = (v==null) ? '' : String(v).trim(); return v || fb; };
    var data = {
      manager:     pick(payload.manager,     cur.manager),
      teamLeader:  pick(payload.teamLeader,  cur.teamLeader),
      koordinator: pick(payload.koordinator, cur.koordinator)
    };
    PropertiesService.getScriptProperties().setProperty(PEJABAT_INSGARDU_PROP, JSON.stringify(data));
    return { ok:true, success:true, pejabat:data };
  }catch(e){
    return { ok:false, success:false, message:e.message };
  }
}

function getExecUrlInsGardu(){
  try{ return ScriptApp.getService().getUrl() || ''; }catch(e){ return ''; }
}

function getRekapInsGarduRows(params){
  try{
    params = params || {};
    var f = {
      tglDari:   _normTgl(params.tglDari   || '') || '',
      tglSampai: _normTgl(params.tglSampai || '') || '',
      penyulang: String(params.penyulang || '').trim(),
      ulp:       String(params.ulp || '').trim()
    };
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    return { ok:true, rows: _pdfQueryRealisasiInsGardu(ss, f) };
  }catch(e){ return { ok:false, message:e.message, rows:[] }; }
}

function unduhPdfInsGardu(e){
  try{
    var p = (e && e.parameter) || {};
    var f = {
      tglDari:   _normTgl(p.tglDari   || '') || '',
      tglSampai: _normTgl(p.tglSampai || '') || '',
      penyulang: String(p.penyulang || '').trim(),
      ulp:       String(p.ulp || '').trim()
    };
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var html = _buildHtmlPdfRekapInsGardu(_pdfQueryRealisasiInsGardu(ss, f), f);

    var suffix = (f.tglDari || f.tglSampai)
      ? ('_' + (f.tglDari || 'awal') + '_sd_' + (f.tglSampai || f.tglDari || 'akhir'))
      : ('_' + _normTgl(new Date()));
    var namaFile = 'Rekap_Inspeksi_Gardu' + suffix + '.pdf';

    var blob   = Utilities.newBlob(html, 'text/html', 'tmp.html').getAs('application/pdf').setName(namaFile);
    var folder = _getOrCreateFolderByPath(['AppSheet SiSi - ULP Toboali', 'PDF Inspeksi Gardu']);
    var file   = folder.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(eShare){}
    var urlUnduh = 'https://drive.google.com/uc?export=download&id=' + file.getId();

    return HtmlService.createHtmlOutput(
      '<!DOCTYPE html><html><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width, initial-scale=1">'
      + '<title>Unduh PDF Inspeksi Gardu</title>'
      + '<script>window.location.replace(' + JSON.stringify(urlUnduh) + ');<\/script>'
      + '</head><body style="font-family:Segoe UI,Arial,sans-serif;text-align:center;padding:40px;color:#1e293b">'
      + '<p>Menyiapkan unduhan <b>' + _pdfEsc(namaFile) + '</b>…</p>'
      + '<p>Jika tidak otomatis terunduh, <a href="' + _pdfEsc(urlUnduh) + '">klik di sini</a>.</p>'
      + '</body></html>'
    ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }catch(err){
    return HtmlService.createHtmlOutput(
      '<p style="font-family:Arial,sans-serif;color:#b91c1c">Gagal membuat PDF: '
      + _pdfEsc(err && err.message ? err.message : String(err)) + '</p>'
    );
  }
}

/* DUAL-READ REKAP INSPEKSI GARDU (AKTIF + ARSIP) */
function _pdfQueryRealisasiInsGardu(ss, f){
  var R = COL_INSDU.REALISASI;
  var data = (typeof _readSheetDual_ === 'function')
    ? _readSheetDual_(SHEET_INSDU_REALISASI, R.kodePekerjaanGardu, 12)
    : (ss.getSheetByName(SHEET_INSDU_REALISASI) ? ss.getSheetByName(SHEET_INSDU_REALISASI).getRange(2, 1, ss.getSheetByName(SHEET_INSDU_REALISASI).getLastRow() - 1, 12).getValues() : []);
  if(!data || !data.length) return [];
  var out = [];
  for(var i=0;i<data.length;i++){
    var r = data[i];
    var ng = String(r[R.nomorGardu] || '').trim();
    var kp = String(r[R.kodePekerjaanGardu] || '').trim();
    if(!ng && !kp) continue;
    var tgl  = _normTgl(r[R.tanggal]);
    var peny = String(r[R.penyulang] || '').trim();
    if(!_pdfDateFilterLolos_(tgl, f)) continue;
    if(f.penyulang && peny.toLowerCase() !== f.penyulang.toLowerCase()) continue;
    out.push({
      tanggal: tgl, penyulang: peny, nomorGardu: ng,
      section: String(r[R.section] || '').trim(),
      tier: String(r[R.tier] || '').trim()
    });
  }
  out.sort(function(a,b){
    return (a.tanggal||'').localeCompare(b.tanggal||'')
        || a.penyulang.localeCompare(b.penyulang)
        || a.nomorGardu.localeCompare(b.nomorGardu);
  });
  return out;
}

function _buildHtmlPdfRekapInsGardu(rows, f){
  var pjb = getPejabatRekapInsGardu();
  var bln = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];
  function _tglIndo(iso){
    var s = _normTgl(iso); if(!s) return '';
    var p = s.split('-'); var m = parseInt(p[1],10)||1;
    return p[2] + ' ' + bln[m-1] + ' ' + p[0];
  }
  function _adaTier(tier, n){
    return String(tier||'').indexOf(String(n)) >= 0 ? 'ADA' : 'TIDAK ADA';
  }

  var UP3 = 'BANGKA';
  var ULP = String(f.ulp || 'TOBOALI').toUpperCase();
  var periode = (f.tglDari || f.tglSampai)
    ? (_tglIndo(f.tglDari || f.tglSampai) + ' - ' + _tglIndo(f.tglSampai || f.tglDari))
    : '-';

  var logo = '';
  try { logo = _pdfLogoPlnB64_(); } catch(eL){ logo = ''; }
  var logoCell = logo
    ? '<td style="width:55px"><img class="logo" src="data:image/png;base64,' + logo + '"></td>'
    : '<td style="width:55px"></td>';

  var css = '<style>'
    + '@page { size: A4 portrait; margin: 19mm 10mm; }'
    + '* { font-family: "Times New Roman", Times, serif; }'
    + 'body { margin:0; color:#000; text-transform:uppercase; -webkit-print-color-adjust:exact; print-color-adjust:exact; }'
    + 'table.report-wrap { width:100%; border-collapse:separate; border-spacing:0; border:3px double #000; }'
    + 'table.report-wrap td.report-inner { border:none; padding:0; }'
    + 'table.kop { width:100%; border-collapse:separate; border-spacing:0; border:none; margin-bottom:0; }'
    + 'table.kop td.kop-inner { border:none; padding:0; }'
    + 'table.head { width:100%; border-collapse:collapse; margin-bottom:6px; }'
    + 'table.head td { vertical-align:middle; border:none; }'
    + '.logo { height:48px; }'
    + '.org { font-size:9pt; font-weight:bold; text-align:left; padding-left:0; }'
    + '.title { font-size:9pt; font-weight:bold; text-align:right; }'
    + 'table.info { width:100%; border-collapse:collapse; margin:0; border-top:3px double #000; }'
    + 'table.info td { font-size:8pt; font-weight:bold; border:none; padding:4px 4px 0 10px; }'
    + '.kop-spacer { border-top:3px double #000; height:12px; border-bottom:3px double #000; margin:6px 0 10px 0; }'
    + '.data-box { border:1px double #000; padding:0; margin:0 6px 6px 6px; }'
    + 'table.data { width:100%; border-collapse:collapse; table-layout:fixed; border:1px double #000; }'
    + 'table.data th { background-color:#FFC000 !important; font-weight:bold; text-align:center; vertical-align:middle; height:22pt; border:1px double #000; font-size:7pt; padding:1px 3px; word-wrap:break-word; -webkit-print-color-adjust:exact; print-color-adjust:exact; }'
    + 'table.data td { height:21pt; vertical-align:middle; border:1px double #000; font-size:7pt; padding:1px 3px; word-wrap:break-word; }'
    + 'td.c { text-align:center; }'
    + 'td.l { text-align:left; }'
    + 'table.sign { width:calc(100% - 12px); border-collapse:collapse; table-layout:fixed; margin:14px 6px 8px 6px; }'
    + 'table.sign td { border:none; text-align:left; vertical-align:top; font-size:8pt; font-weight:normal; padding:0; }'
    + 'table.sign td.sign-first { text-align:left; padding-left:0; }'
    + 'table.sign td.sign-second { text-align:left; padding-left:20px; }'
    + '.sign-title { display:block; font-weight:bold; margin-bottom:22px; }'
    + '.sign-name { display:block; font-weight:bold; margin-top:0; white-space:nowrap; }'
    + '.sign-role { display:block; font-weight:normal; white-space:nowrap; }'
    + '.sign-gap { display:block; height:34px; }'
    + '</style>';

  var h = '<!DOCTYPE html><html><head><meta charset="utf-8">' + css + '</head><body>';
  h += '<table class="report-wrap"><tr><td class="report-inner">'
    + '<table class="kop"><tr><td class="kop-inner">'
    + '<table class="head"><tr>'
    + logoCell
    + '<td class="org">PT. PLN (Persero)<br>Unit Induk Wilayah Bangka Belitung</td>'
    + '<td class="title">Laporan Bulanan<br>Inspeksi Gardu</td>'
    + '</tr></table>'
    + '<table class="info">'
    + '<tr><td style="width:90px">UP3</td><td style="width:14px">:</td><td>' + _pdfEsc(UP3) + '</td></tr>'
    + '<tr><td>ULP</td><td>:</td><td>' + _pdfEsc(ULP) + '</td></tr>'
    + '<tr><td>PERIODE</td><td>:</td><td>' + _pdfEsc(periode) + '</td></tr>'
    + '</table>'
    + '<div class="kop-spacer"></div>'
    + '</td></tr></table>'
    + '<div class="data-box">';
  h += '<table class="data">'
    + '<colgroup>'
    + '<col style="width:4%"><col style="width:12%"><col style="width:7%"><col style="width:13%">'
    + '<col style="width:12%"><col style="width:20%"><col style="width:8%"><col style="width:8%"><col style="width:16%">'
    + '</colgroup>'
    + '<thead>'
    + '<tr>'
    + '<th rowspan="2">NO</th>'
    + '<th rowspan="2">TANGGAL</th>'
    + '<th rowspan="2">TIM</th>'
    + '<th rowspan="2">PENYULANG</th>'
    + '<th rowspan="2">NO GARDU</th>'
    + '<th rowspan="2">SECTION</th>'
    + '<th colspan="2">ITEM</th>'
    + '<th rowspan="2">FILE EXCEL</th>'
    + '</tr>'
    + '<tr><th>TIER 1</th><th>TIER 2</th></tr>'
    + '</thead><tbody>';

  if(!rows.length){
    h += '<tr><td class="c" colspan="9" style="height:60px">Tidak ada data untuk filter ini.</td></tr>';
  } else {
    for(var i=0;i<rows.length;i++){
      var r = rows[i];
      h += '<tr>'
        + '<td class="c">' + (i+1) + '</td>'
        + '<td class="c">' + _pdfEsc(_tglIndo(r.tanggal)) + '</td>'
        + '<td class="c">TIM 1</td>'
        + '<td class="c">' + _pdfEsc(r.penyulang) + '</td>'
        + '<td class="c">' + _pdfEsc(r.nomorGardu) + '</td>'
        + '<td class="l">' + _pdfEsc(r.section) + '</td>'
        + '<td class="c">' + _adaTier(r.tier, 1) + '</td>'
        + '<td class="c">' + _adaTier(r.tier, 2) + '</td>'
        + '<td class="c">DATA TERLAMPIR</td>'
        + '</tr>';
    }
  }
  h += '</tbody></table></div>'
    + '<table class="sign"><colgroup><col style="width:56%"><col style="width:8%"><col style="width:36%"></colgroup><tr>'
    + '<td class="sign-first"><span class="sign-title">PIHAK PERTAMA</span>'
    + '<span class="sign-name">' + _pdfEsc(pjb.manager) + '</span>'
    + '<span class="sign-role">MANAGER ULP TOBOALI ..........................</span>'
    + '<span class="sign-gap"></span>'
    + '<span class="sign-name">' + _pdfEsc(pjb.teamLeader) + '</span>'
    + '<span class="sign-role">TL TEKNIK ULP TOBOALI ..........................</span>'
    + '</td>'
    + '<td></td>'
    + '<td class="sign-second"><span class="sign-title">PIHAK KEDUA</span>'
    + '<span class="sign-name">' + _pdfEsc(pjb.koordinator) + '</span>'
    + '<span class="sign-role">KOORDINATOR ULP (OPERASI) ..........................</span>'
    + '</td>'
    + '</tr></table>'
    + '</td></tr></table></body></html>';
  return h;
}

var HI_SRC = {
  spreadsheetId: '1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw',
  tabs: {
    mg: { name:'Master_Gardu',       gid:null,       colGardu:2, colUlp:1  },
    sf: { name:'Suhu & Fisik Trafo', gid:1815443245, colGardu:1, colUlp:-1 }
  },
  writeTargets: [
    { label:'gsheet1', spreadsheetId:'1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw',
      mg:{ name:'Master_Gardu',         gid:null,       colGardu:2, colUlp:1  },
      sf:{ name:'Suhu & Fisik Trafo',   gid:1815443245, colGardu:1, colUlp:-1 } },
    { label:'gsheet2', spreadsheetId:'1mfgj9Izkh3gy9Xf0LkxyIR8tETMwY2RbjQdZ_U4vN6w',
      mg:{ name:'1. DATA TRAFO',          gid:2129497099, colGardu:2, colUlp:1  },
      sf:{ name:'2. SUHU & FISIK TRAFO',  gid:198498101,  colGardu:1, colUlp:-1 } }
  ],
  inputTbl: { label:'gsheet3', spreadsheetId:'1A7SvIoVbLhnn7g1cNaZ2ed38cNDEFLeB3SMHWKY8vm4',
    name:'INPUT TBL', gid:1401502183, colGardu:2, colUlp:1 }
};

function _hiColLetterToIndex_(letter){
  var s = String(letter||'').toUpperCase(); var r = 0;
  for(var i=0;i<s.length;i++){ r = r*26 + (s.charCodeAt(i)-64); }
  return r - 1;
}
function _hiIndexToColLetter_(index){
  var n = Number(index) + 1; var s = '';
  while(n > 0){ var m = (n-1)%26; s = String.fromCharCode(65+m) + s; n = Math.floor((n-1)/26); }
  return s;
}
function _hiTabSheet_(tabKey){
  var cfg = HI_SRC.tabs[tabKey];
  if(!cfg) return null;
  var ss = SpreadsheetApp.openById(HI_SRC.spreadsheetId);
  if(cfg.gid != null){
    var all = ss.getSheets();
    for(var i=0;i<all.length;i++){ if(all[i].getSheetId() === cfg.gid) return all[i]; }
  }
  return ss.getSheetByName(cfg.name);
}
function _hiCariBarisTab_(sh, cfg, nomorGardu, ulp){
  var lastRow = sh.getLastRow();
  if(lastRow < 1) return -1;
  var keyG = String(nomorGardu||'').trim().toLowerCase();
  var keyU = String(ulp||'').trim().toLowerCase();
  var colG = sh.getRange(1, cfg.colGardu+1, lastRow, 1).getValues();
  var colU = (cfg.colUlp>=0 && keyU) ? sh.getRange(1, cfg.colUlp+1, lastRow, 1).getValues() : null;
  for(var r=0;r<lastRow;r++){
    if(String(colG[r][0]||'').trim().toLowerCase() !== keyG) continue;
    if(colU && String(colU[r][0]||'').trim().toLowerCase() !== keyU) continue;
    return r+1;
  }
  return -1;
}
function _hiBacaTab_(tabKey, nomorGardu, ulp){
  var sh = _hiTabSheet_(tabKey);
  if(!sh) return null;
  var cfg = HI_SRC.tabs[tabKey];
  var row = _hiCariBarisTab_(sh, cfg, nomorGardu, ulp);
  if(row < 0) return null;
  var lastCol = sh.getLastColumn();
  var vals = sh.getRange(row, 1, 1, lastCol).getDisplayValues()[0];
  var data = {};
  for(var c=0;c<lastCol;c++){ data[_hiIndexToColLetter_(c)] = vals[c]; }
  return { row:row, data:data };
}

function getHiUp3(params){
  try{
    params = params || {};
    var nomorGardu = String(params.nomorGardu||'').trim();
    if(!nomorGardu) return { ok:false, message:'Nomor gardu wajib diisi.' };
    var mg = _hiBacaTab_('mg', nomorGardu, params.ulp);
    var sf = _hiBacaTab_('sf', nomorGardu, '');
    if(!mg && !sf) return { ok:true, found:false, message:'Gardu "'+nomorGardu+'" tidak ditemukan di Master_Gardu maupun Suhu & Fisik Trafo.' };
    var nama = (mg && mg.data ? String(mg.data[_hiIndexToColLetter_(HI_SRC.tabs.mg.colGardu)]||'').trim() : '') || nomorGardu;
    return { ok:true, found:true, nomorGardu:nama, mg:mg, sf:sf };
  }catch(e){ return { ok:false, message:'Gagal membaca data HI: '+(e&&e.message?e.message:e) }; }
}

function _hiSisipBarisSf_(sh, cfg, nomorGardu, g){
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  var colG = cfg.colGardu;
  var nomorCol = sh.getRange(1, colG+1, Math.max(lastRow,1), 1).getValues();
  var prefixBaru = '';
  try { prefixBaru = (_baParseNomorGardu_(nomorGardu) || {}).prefix || ''; } catch(e){ prefixBaru = ''; }
  var lastPrefixRow = -1, lastDataRow0 = 0;
  for(var r=0;r<nomorCol.length;r++){
    var nomorRr = String(nomorCol[r][0]||'').trim();
    if(nomorRr === '') continue;
    lastDataRow0 = r;
    var parsedRr = null;
    try { parsedRr = _baParseNomorGardu_(nomorRr); } catch(e){ parsedRr = null; }
    if(parsedRr && parsedRr.prefix === prefixBaru) lastPrefixRow = r;
  }
  var sumberSheetRow = ((lastPrefixRow >= 0) ? lastPrefixRow : lastDataRow0) + 1;
  sh.insertRowsAfter(sumberSheetRow, 1);
  var row = sumberSheetRow + 1;
  var formulaBaris = sh.getRange(sumberSheetRow, 1, 1, lastCol).getFormulas()[0];
  for(var ci=0; ci<formulaBaris.length; ci++){
    if(formulaBaris[ci]){
      sh.getRange(sumberSheetRow, ci+1).copyTo(sh.getRange(row, ci+1));
    }
  }
  sh.getRange(row, colG+1).setValue(nomorGardu);
  if(g){
    sh.getRange(row, 3).setValue(g.alamat    || '');
    sh.getRange(row, 4).setValue(g.merkTrafo || '');
    sh.getRange(row, 5).setValue(g.dayaKva   || '');
  }
  return row;
}

function _hiOpenSheet_(spreadsheetId, tabCfg){
  if(!spreadsheetId || !tabCfg) return null;
  var ss = SpreadsheetApp.openById(spreadsheetId);
  if(tabCfg.gid != null){
    var all = ss.getSheets();
    for(var i=0;i<all.length;i++){ if(all[i].getSheetId() === tabCfg.gid) return all[i]; }
  }
  return ss.getSheetByName(tabCfg.name);
}

function _hiTulisNilai_(sh, row, data){
  var n = 0;
  Object.keys(data).forEach(function(letter){
    var idx = _hiColLetterToIndex_(letter);
    if(idx < 0) return;
    sh.getRange(row, idx+1).setValue(safeCell_(data[letter]==null?'':data[letter]));
    n++;
  });
  return n;
}

function updateHiUp3(payload){
  var gAks = guard_(arguments, { ulp: true, aksi: 'updateHiUp3' });
  try{
    payload = payload || {};
    payload.ulp = ulpScope_(gAks, payload.ulp) || String(gAks.ulp || '').trim();
    var nomorGardu = String(payload.nomorGardu||'').trim();
    if(!nomorGardu) return { ok:false, message:'Nomor gardu wajib diisi.' };
    var mgData = payload.mg || {}, sfData = payload.sf || {}, itData = payload.it || {};
    var adaMg = Object.keys(mgData).length>0, adaSf = Object.keys(sfData).length>0, adaIt = Object.keys(itData).length>0;
    var hasil = { mg:0, sf:0, it:0 }, pesan = [];
    var sfDisisipkan = false;
    var HI_HASIL_NAME = { gsheet1:'Master Gardu', gsheet2:'1. DATA TRAFO', gsheet3:'INPUT TBL' };
    var hasilArr = [];

    (HI_SRC.writeTargets||[]).forEach(function(tgt){
      var errTgt = false, jmlTgt = 0;
      if(adaMg){
        var shMg = _hiOpenSheet_(tgt.spreadsheetId, tgt.mg);
        if(!shMg){ pesan.push('['+tgt.label+'] Tab '+tgt.mg.name+' tidak ditemukan.'); errTgt = true; }
        else {
          var rowMg = _hiCariBarisTab_(shMg, tgt.mg, nomorGardu, payload.ulp);
          if(rowMg < 0){ pesan.push('['+tgt.label+'] Gardu "'+nomorGardu+'" tidak ada di '+tgt.mg.name+'.'); errTgt = true; }
          else { var _n = _hiTulisNilai_(shMg, rowMg, mgData); hasil.mg += _n; jmlTgt += _n; }
        }
      }
      if(adaSf){
        var shSf = _hiOpenSheet_(tgt.spreadsheetId, tgt.sf);
        if(!shSf){ pesan.push('['+tgt.label+'] Tab '+tgt.sf.name+' tidak ditemukan.'); errTgt = true; }
        else {
          var rowSf = _hiCariBarisTab_(shSf, tgt.sf, nomorGardu, '');
          if(rowSf < 0){
            var g = _findGarduByNomor(nomorGardu);
            if(!g){ pesan.push('['+tgt.label+'] Gardu "'+nomorGardu+'" tidak ada di Master_Gardu; baris '+tgt.sf.name+' tidak dibuat.'); errTgt = true; }
            else { rowSf = _hiSisipBarisSf_(shSf, tgt.sf, nomorGardu, g); sfDisisipkan = true; var _n2 = _hiTulisNilai_(shSf, rowSf, sfData); hasil.sf += _n2; jmlTgt += _n2; }
          } else {
            var _n3 = _hiTulisNilai_(shSf, rowSf, sfData); hasil.sf += _n3; jmlTgt += _n3;
          }
        }
      }
      hasilArr.push({ sheetName:(HI_HASIL_NAME[tgt.label]||tgt.label), ok:!errTgt, action:(errTgt?'skip':'update'), jumlah:jmlTgt });
    });

    if(HI_SRC.inputTbl){
      var it = HI_SRC.inputTbl;
      var errIt = false, jmlIt = 0;
      if(adaIt){
        var shIt = _hiOpenSheet_(it.spreadsheetId, it);
        if(!shIt){ pesan.push('['+it.label+'] Tab '+it.name+' tidak ditemukan.'); errIt = true; }
        else {
          var rowIt = _hiCariBarisTab_(shIt, it, nomorGardu, payload.ulp);
          if(rowIt < 0){ pesan.push('['+it.label+'] Gardu "'+nomorGardu+'" tidak ada di '+it.name+'.'); errIt = true; }
          else { var _n4 = _hiTulisNilai_(shIt, rowIt, itData); hasil.it += _n4; jmlIt += _n4; }
        }
      }
      hasilArr.push({ sheetName:(HI_HASIL_NAME[it.label]||it.name), ok:!errIt, action:(errIt?'skip':'update'), jumlah:jmlIt });
    }

    _garduMasterMemo = null;
    SpreadsheetApp.flush();
    var total = hasil.mg + hasil.sf + hasil.it;
    if(!total && pesan.length) return { ok:false, message:pesan.join(' ') };
    return { ok:true, jumlahField:total, detail:hasil, hasil:hasilArr, sfDisisipkan:sfDisisipkan,
      message:'Data HI '+nomorGardu+' tersimpan ke 3 gsheet (mg '+hasil.mg+', sf '+hasil.sf+', INPUT TBL '+hasil.it+' field tertulis).'
        + (sfDisisipkan ? ' Baris baru Suhu & Fisik dibuat.' : '')
        + (pesan.length ? ' Catatan: '+pesan.join(' ') : '') };
  }catch(e){ return { ok:false, message:'Gagal menyimpan data HI: '+(e&&e.message?e.message:e) }; }
}

function getListPenyulangDb(){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName('db_Penyulang');
    if(!sh) return { ok:false, message:'Sheet db_Penyulang tidak ditemukan.', list:[] };
    var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
    if(lastRow < 2) return { ok:true, list:[] };
    var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var col = -1;
    for(var c=0;c<header.length;c++){
      if(String(header[c]||'').trim().toLowerCase()==='penyulang'){ col = c; break; }
    }
    if(col < 0) col = 0;
    var vals = sh.getRange(2, col+1, lastRow-1, 1).getValues();
    var set = {};
    for(var i=0;i<vals.length;i++){
      var p = String(vals[i][0]||'').trim();
      if(p) set[p] = true;
    }
    return { ok:true, list:Object.keys(set).sort() };
  }catch(e){ return { ok:false, message:e.message, list:[] }; }
}
