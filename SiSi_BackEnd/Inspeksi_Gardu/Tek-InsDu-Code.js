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
  /* OTENTIKASI + SKOP ULP (29 Agu 2026).
     Sebelumnya: identitas diambil dari data.username yang dikirim KLIEN, lalu
     data.ulp dipakai mentah — siapa pun bisa menulis header atas nama ULP
     atau user lain. Sekarang identitas berasal dari SESI. */
  var g = guard_(arguments, { ulp: true, aksi: 'simpanHeaderInsGardu' });
  try{
    data = data || {};
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1) ULP diambil dari SESI. Hanya Super User yang boleh memilih ULP lain.
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

    // 2) Field otomatis
    var kodeHeader = _generateKodeHeaderInsGardu(ss, kodeUlp, data.tanggal);
    var hari       = _hariFromTanggal(data.tanggal);
    var now        = new Date();

    // 3) Tulis baris baru — B..Q (kolom A formula dilewati) ke db_Global_Header
    var sh  = ss.getSheetByName(SHEET_INS.HEADER);
    var row = sh.getLastRow() + 1;
    sh.getRange(row, 2, 1, 15).setValues([[
      kodeHeader,                 // B Kode Header
      ulp,                        // C ULP
      hari,                       // D Hari
      data.tanggal,               // E Tanggal
      'Inspeksi',                 // F Tim (pembeda Inspeksi/ROW)
      'Inspeksi Gardu',           // G Sub-Tim
      data.koordinatAwal || '',   // H Koordinat Gardu Awal (Tier dipindah ke db_InsDu_Realisasi)
      data.koordinatAkhir || '',  // I Koordinat Gardu Akhir
      data.kmAwal || '',          // J KM Awal
      data.kmAkhir || '',         // K KM Akhir
      data.kendala || '',         // L Kendala
      '',                         // M WA Text (menyusul)
      now,                        // N Timestamp
      String(g.username || ''),   // O Input Oleh — dari SESI, bukan klien
      now                         // P Timestamp Update
    ]]);

    return { ok:true, kodeHeader:kodeHeader };
  }catch(e){
    return { ok:false, message:e.message };
  }
}

// Format: IGD-<KodeULP><YYMMDD><Urut 3 digit> (urut harian per-ULP). KAKEK rantai gardu.
function _generateKodeHeaderInsGardu(ss, kodeUlp, tanggal){
  var tgl    = _normTgl(tanggal).replace(/-/g,'').slice(2);    // YYMMDD
  var prefix = 'IGD-' + (kodeUlp||'').toString().trim() + tgl;
  var data   = ss.getSheetByName(SHEET_INS.HEADER).getDataRange().getValues();
  var n = 0;
  for(var i=1;i<data.length;i++){
    if((data[i][COL_INS.HEADER.kodeHeader]||'').toString().indexOf(prefix) === 0) n++;
  }
  return prefix + ('00'+(n+1)).slice(-3);
}

// Daftar header gardu (Sub-Tim 'Inspeksi Gardu') untuk halaman Tek-InsDu.
// filter: { ulp, tglDari, tglSampai }
function getDataHeaderInsGardu(params){
  params = params || {};
  var H = COL_INS.HEADER;
  var norm = function(v){ return String(v==null?'':v).trim().toLowerCase(); };
  var dari = params.tglDari || '', sampai = params.tglSampai || '', fUlp = norm(params.ulp);
  return _readSheetIns(SHEET_INS.HEADER)
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
   Detail teknis gardu diambil LIVE dari master gardu (GARDU_MASTER).
═════════════════════════════════════ */

/* ─── Pembaca master gardu (memo per-eksekusi) ─── */
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

// Normalisasi tanggal apa pun → 'YYYY-MM-DD' (dukung objek Date & teks).
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

// 'YYYY-MM-DD' → '03 Juni 2026'
function _tglIndoGardu(s){
  var BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var k = _tglKeyGardu(s);
  var m = k.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return String(s==null?'':s);
  return m[3]+' '+BLN[parseInt(m[2],10)-1]+' '+m[1];
}

/* ─── Dropdown: daftar penyulang gardu per ULP ─── */
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

/* ─── Dropdown: daftar gardu pada satu penyulang ───
   Tiap gardu diberi flag updated = (tgl pengukuran kolom U == tanggal header). */
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

/* ─── Header inspeksi by kode ─── */
function _getHeaderInsByKode(ss, kodeHeader){
  var H = COL_INS.HEADER;
  var data = ss.getSheetByName(SHEET_INS.HEADER).getDataRange().getValues();
  var key = String(kodeHeader||'').trim();
  for(var i=1;i<data.length;i++){
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

// INDUK rantai gardu: <KodeHeader>-GDU.<nnn> ; nnn di-reset per Kode Header.
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

// Hitung jumlah temuan gardu (db_INS_Temuan) by kodeHeader + nomorGardu.
function _hitungTemuanGardu(ss, kodeHeader, nomorGardu){
  var T = COL_INS.TEMUAN;
  var sh = ss.getSheetByName(SHEET_INS.TEMUAN);
  if(!sh) return 0;
  var data = sh.getDataRange().getValues();
  var kh = String(kodeHeader||'').trim();
  var ng = String(nomorGardu||'').trim().toLowerCase();
  var n = 0;
  for(var i=1;i<data.length;i++){
    if(String(data[i][T.kodeHeader]||'').trim()!==kh) continue;
    if(String(data[i][T.nomorGardu]||'').trim().toLowerCase()!==ng) continue;
    // Realisasi sah HANYA bila URL foto sudah diupdate: kolom R (Foto Temuan URL)
    // DAN kolom T (Foto Gardu URL) wajib terisi keduanya. Salah satu kosong -> tidak dihitung.
    if(!String(data[i][T.fotoTemuanUrl]||'').trim()) continue;
    if(!String(data[i][T.fotoTiangUrl]||'').trim()) continue;
    n++;
  }
  return n;
}

// Map temuan per gardu untuk WA: { nomorGarduLower: [teksTemuan,...] }
function _temuanGarduMap(ss, kodeHeader){
  var T = COL_INS.TEMUAN;
  var map = {};
  var sh = ss.getSheetByName(SHEET_INS.TEMUAN);
  if(!sh) return map;
  var data = sh.getDataRange().getValues();
  var kh = String(kodeHeader||'').trim();
  for(var i=1;i<data.length;i++){
    if(String(data[i][T.kodeHeader]||'').trim()!==kh) continue;
    var nomor = String(data[i][T.nomorGardu]||'').trim();
    if(!nomor) continue;
    // Hanya temuan dgn URL foto lengkap (R Foto Temuan & T Foto Gardu) yang dianggap realisasi sah.
    if(!String(data[i][T.fotoTemuanUrl]||'').trim()) continue;
    if(!String(data[i][T.fotoTiangUrl]||'').trim()) continue;
    var key = nomor.toLowerCase();
    if(!map[key]) map[key] = [];
    var t = String(data[i][T.temuan]||'').trim();
    if(t && t.toLowerCase()!=='nihil') map[key].push(t);
  }
  return map;
}

/* ─── Simpan 1 gardu ke realisasi ─── */
function simpanRealisasiInsGardu(data){
  /* OTENTIKASI + PEMILIKAN (29 Agu 2026). Sebelumnya tanpa pemeriksaan:
     kodeHeader dari klien dipakai begitu saja, jadi data bisa disisipkan ke
     header milik ULP lain. `gAks` (bukan `g`) karena `g` sudah dipakai
     untuk hasil _findGarduByNomor() di bawah. */
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
      kodeHeader,            // B Kode Header
      kodePekerjaan,         // C Kode Pekerjaan Gardu
      hari,                  // D Hari
      tgl,                   // E Tanggal
      g.penyulang || '',     // F Penyulang
      g.section || '',       // G Section
      nomorGardu,            // H Nomor Gardu
      tier,                  // I Tier Inspeksi
      jumlahTemuan,          // J Jumlah Temuan
      data.username || '',   // K Input Oleh
      now                    // L Timestamp
    ]]);

    // CARRY-OVER: bawa temuan terbuka gardu ini dari siklus lama ke header baru.
    var migrasi = _migrasiTemuanTerbukaGardu(ss, kodeHeader, kodePekerjaan, nomorGardu, header);
    // Recalc Jumlah Temuan + WA header baru (sudah memasukkan temuan yang dibawa).
    recalcRealisasiGarduByHeader(ss, kodeHeader);
    return { ok:true, kodePekerjaan:kodePekerjaan, temuanDibawa:migrasi };
  }catch(e){
    return { ok:false, message:e.message };
  }
}

/* ═══ CARRY-OVER: migrasi temuan gardu BELUM SELESAI ke siklus baru ═══
   Dipanggil saat realisasi gardu baru tersimpan (web app) & oleh trigger harian
   (menangkap input AppSheet). Temuan Object='Gardu', Status != 'Selesai',
   Nomor Gardu sama TAPI Kode Header berbeda (sisa siklus lama) → ditimpa ke
   header/realisasi baru (Kode Header, Kode Pekerjaan, ULP, Hari, Tanggal) walau
   petugas tidak mengedit. SYARAT SIKLUS BARU: tanggal inputan baru > 30 hari dari
   tanggal temuan terakhir (kolom Tanggal) — mencegah penimpaan di siklus yang sama.
   Header lama TIDAK disentuh. Idempoten: setelah dibawa, Tanggal temuan = tgl baru
   sehingga selisih < 30 hari akan otomatis dilewati. TANPA kolom tambahan. */
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
    if(String(r[T.status]||'').trim().toLowerCase()===selesai) continue; // sudah selesai → tidak dibawa
    if(String(r[T.kodeHeader]||'').trim()===khBaru) continue;            // sudah di siklus ini
    // SIKLUS BARU hanya bila tanggal inputan baru > 30 hari dari tanggal temuan terakhir.
    var tglTemuan = _normTgl(r[T.tanggal]);
    if(tglTemuan && _selisihHariIns(tgl, tglTemuan) <= 30) continue;     // masih ≤ 30 hari → bukan siklus baru
    var rowNum = i+1;
    shT.getRange(rowNum, T.kodeHeader+1).setValue(khBaru);
    shT.getRange(rowNum, T.kodePekerjaanPeny+1).setValue(kpBaru); // kolom C = kode realisasi
    if(ulp) shT.getRange(rowNum, T.ulp+1).setValue(ulp);
    shT.getRange(rowNum, T.hari+1).setValue(hari);
    shT.getRange(rowNum, T.tanggal+1).setValue(tgl);             // Tanggal = tanggal inputan terakhir
    dibawa++;
  }
  return dibawa;
}

// Selisih hari (A - B), input 'yyyy-MM-dd'. Positif = A setelah B.
function _selisihHariIns(tglA, tglB){
  var a = new Date(String(tglA||'')+'T00:00:00');
  var b = new Date(String(tglB||'')+'T00:00:00');
  if(isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round((a.getTime()-b.getTime())/86400000);
}

/* TRIGGER TIME — menangkap realisasi gardu yang dibuat via AppSheet.
   Scan realisasi gardu bertanggal hari ini / kemarin lalu bawa temuan terbuka
   gardu tsb ke header realisasinya. Idempoten. Pasang trigger waktu ~10–15 menit. */
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

/* ─── Daftar realisasi (Detail modal) ─── */
function getDetailRealisasiGardu(kodeHeader){
  try{
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var header = _getHeaderInsByKode(ss, kodeHeader);
    if(!header) return { ok:false, message:'Header tidak ditemukan.' };
    var R = COL_INSDU.REALISASI;
    var sh = ss.getSheetByName(SHEET_INSDU_REALISASI);
    var rows = sh ? sh.getDataRange().getValues() : [];
    var kh = String(kodeHeader||'').trim();
    var list = [];
    for(var i=1;i<rows.length;i++){
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

/* ─── Temuan per Gardu (db_INS_Temuan, objek 'Gardu') ─── */
// Cari baris realisasi gardu by kodeHeader + nomorGardu.
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

/* ---------- ANAK rantai gardu: Kode Temuan BERANTAI dari Kode Pekerjaan Gardu ----------
   Format: <KodePekerjaanGardu>-TGD.<nnn> ; nnn di-reset per Kode Pekerjaan Gardu.
   Menjaga rantai Header(IGD) -> Realisasi(GDU) -> Temuan(TGD). */
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

// Simpan 1 temuan untuk gardu tertentu. Koordinat diambil dari titik koordinat
// gardu (master). Kode header + kode pekerjaan gardu dibawa dari db_InsDu_Realisasi.
function simpanTemuanGardu(data){
  /* OTENTIKASI + PEMILIKAN (29 Agu 2026). Selain menulis baris temuan,
     fungsi ini juga MENGUNGGAH FOTO ke Drive — tanpa pemeriksaan, siapa pun
     bisa memakai Drive pemilik script sebagai tempat simpan berkas.
     `gAks` (bukan `g`) karena `g` sudah dipakai _findGarduByNomor(). */
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
    /* Identitas dari SESI, bukan dari data.username yang dikirim klien. */
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
    // LOKASI foto = path relatif (Folder Path + '/' + nama file) supaya AppSheet bisa menampilkan foto.
    var folderPathStr = _folderTemuanPathStr(tgl, kodePekerjaan);
    var arr = [ kodeHeader, rg.kodePekerjaanGardu, kodePekerjaan, header.ulp, hari, tgl, info.tim||'', 'Gardu',
      rg.penyulang||g.penyulang||'', rg.section||g.section||'', '', '', nomorGardu, rg.tier||'', temuan,
      (fT.nama?folderPathStr+'/'+fT.nama:''), fT.url, (fG.nama?folderPathStr+'/'+fG.nama:''), fG.url, safeCell_(String(data.deskripsi||'')), koord, lat, lng,
      String(gAks.username||''), _tsNowIns(), STATUS_INS.PENUGASAN ];
    var shT = ss.getSheetByName(SHEET_INS.TEMUAN);
    var row = shT.getLastRow()+1;
    shT.getRange(row, 2, 1, arr.length).setValues([arr]);
    // Folder Path (kolom AR) — path penyimpanan foto temuan gardu.
    shT.getRange(row, COL_INS.TEMUAN.folderPath+1).setValue(folderPathStr);
    // SIMPAN TEMUAN GARDU = PEMICU BUILD WA (fungsi 2).
    recalcWaInsGarduByHeader(kodeHeader);
    return { ok:true, kodePekerjaan:kodePekerjaan };
  }catch(e){ return { ok:false, message:e.message }; }
}

// Daftar temuan untuk satu gardu pada satu header.
function getTemuanGardu(kodeHeader, nomorGardu){
  try{
    var T = COL_INS.TEMUAN;
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET_INS.TEMUAN);
    var data = sh ? sh.getDataRange().getValues() : [];
    var kh = String(kodeHeader||'').trim();
    var ng = String(nomorGardu||'').trim().toLowerCase();
    var out = [];
    for(var i=1;i<data.length;i++){
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

// Edit data temuan gardu (nama temuan + deskripsi).
function editTemuanGardu(data){
  /* OTENTIKASI + PEMILIKAN (29 Agu 2026). Nama `gAks` dipakai karena `g`
     sudah dipakai di fungsi-fungsi lain di berkas ini. */
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
    // EDIT TEMUAN GARDU = PEMICU BUILD WA (fungsi 2).
    if(kodeHeader){ try { recalcWaInsGarduByHeader(kodeHeader); } catch(e){} }
    return { ok:true, kodePekerjaan:kodePekerjaan };
  }catch(e){ return { ok:false, message:e.message }; }
}

// Edit realisasi gardu (Tier) by kode pekerjaan gardu.
function editRealisasiGardu(data){
  /* OTENTIKASI + PEMILIKAN (29 Agu 2026). */
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

/* ─── Edit header gardu (koordinat/KM/kendala) ─── */
function editHeaderInsGardu(data){
  /* OTENTIKASI + PEMILIKAN (29 Agu 2026). Menimpa koordinat/kendala header
     milik ULP lain bisa merusak laporan harian ULP tersebut. */
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
    /* Semua nilai ini teks bebas dari pengguna -> lindungi dari formula. */
    hsh.getRange(rowIdx, H.koordinatAwal+1).setValue(safeCell_(data.koordinatAwal||''));
    hsh.getRange(rowIdx, H.koordinatAkhir+1).setValue(safeCell_(data.koordinatAkhir||''));
    hsh.getRange(rowIdx, H.kmAwal+1).setValue(safeCell_(data.kmAwal||''));
    hsh.getRange(rowIdx, H.kmAkhir+1).setValue(safeCell_(data.kmAkhir||''));
    hsh.getRange(rowIdx, H.kendala+1).setValue(safeCell_(data.kendala||''));
    _updateWaTextInsGardu(ss, key);
    return { ok:true };
  }catch(e){ return { ok:false, message:e.message }; }
}

/* ─── Hapus 1 gardu dari realisasi ─── */
function hapusRealisasiGardu(data){
  /* OTENTIKASI + PEMILIKAN (29 Agu 2026) — celah paling berat di modul ini.
     Sebelumnya siapa pun di internet bisa memanggil ini dan menghapus baris
     realisasi mana pun (sh.deleteRow) hanya dengan mengetahui kodePekerjaan.
     Sekarang: wajib sesi, dan baris harus milik ULP sesi (Super User bebas). */
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
        /* Sheet realisasi tidak punya kolom ULP — telusuri lewat header induk. */
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

/* ─── Recalc jumlah temuan semua gardu pada satu header + refresh WA ─── */
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

/* ─── Builder WA Inspeksi Gardu (grup per penyulang, Section rentang) ─── */
function _buildWaTextInsGardu(ss, kodeHeader){
  var header = _getHeaderInsByKode(ss, kodeHeader);
  if(!header) return '';
  var R = COL_INSDU.REALISASI;
  var rsh = ss.getSheetByName(SHEET_INSDU_REALISASI);
  var rrows = rsh ? rsh.getDataRange().getValues() : [];
  var kh = String(kodeHeader||'').trim();

  var items = [];
  for(var i=1;i<rrows.length;i++){
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

/* ─── Update Data (recompute jumlah temuan + WA) untuk 1 header ─── */
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


/* ═══ BUILD WA INSPEKSI GARDU — 3 fungsi (recalc + build), simetris dgn jaringan ═══
   1) refreshSemuaWaInsGardu()        : recalc+build SEMUA header gardu (WEB APP saja)
   2) recalcWaInsGarduByHeader(kode)  : recalc+build 1 header (saat simpan/edit temuan gardu)
   3) refreshWaInsGarduHarian()       : recalc+build header tgl hari ini & kemarin (TRIGGER time)
   Inti recalc+build gardu = recalcRealisasiGarduByHeader (hitung ulang Jumlah Temuan
   tiap gardu lalu panggil _updateWaTextInsGardu). */

// Penanda baris header = Inspeksi Gardu (Tim 'Inspeksi' & Sub-Tim 'Inspeksi Gardu').
function _isHeaderInsGardu(r){
  var H = COL_INS.HEADER;
  if(!r[H.kodeHeader]) return false;
  if(String(r[H.tim]||'').trim() !== 'Inspeksi') return false;
  return String(r[H.subTim]||'').trim().toLowerCase() === 'inspeksi gardu';
}

// (1) WEB APP — recalc + build SEMUA header Inspeksi Gardu.
// Operasi berat; pakai HANYA dari tombol manual web app, JANGAN jadi trigger berkala.
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

// (2) WEB APP — recalc + build 1 header. Dipanggil saat simpan/edit temuan gardu,
// supaya WA langsung sinkron tanpa menunggu trigger.
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

// (3) TRIGGER TIME — recalc + build HANYA header gardu bertanggal hari ini atau
// kemarin (hemat baca data). Cocok untuk menangkap input dari AppSheet.
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


/* ═════════════════════════════════════
   PENGUKURAN GARDU — pencarian data master (kartu)
   Dipakai halaman Tek-PengukuranGardu (sub-menu Tim Inspeksi).
═════════════════════════════════════ */

// Daftar ULP unik dari master gardu (untuk filter Super User).
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

// Cari data pengukuran gardu dari master gardu (LIVE).
// params: { ulp, nomorGardu, limit }
//  - nomorGardu : pencarian sebagian (case-insensitive).
//  - ulp        : filter opsional (Super User memilih; user lain dikunci ke ULP-nya di klien).
//  - limit      : batas hasil (default 120) untuk menjaga performa.
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

/* ─── Edit data pengukuran gardu (tulis balik ke Master_Gardu) ───
   payload: { nomorGardu, ulp(opsional), data:{ tglPengukuran(YYYY-MM-DD),
   teganganWbpRS..TN, bebanWbpR..N, persentaseBeban } } */
function updatePengukuranGardu(payload){
  /* OTENTIKASI + SKOP ULP (29 Agu 2026). Menulis balik ke Master_Gardu di
     spreadsheet terpisah; payload.ulp kini hanya dihormati untuk Super User. */
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


/* ═══════════════════════════════════════════════════════════
   DOWNLOAD PDF INSPEKSI GARDU (link web via doGet, ?pdf=gardu)
   Format mengikuti Rekap ROW (A4 portrait, kop PLN, border ganda,
   header #FFC000, blok tanda tangan). Sumber: db_InsDu_Realisasi.
   Kolom: NO · TANGGAL · TIM · PENYULANG · NO GARDU · SECTION ·
          ITEM(TIER 1 / TIER 2) · FILE EXCEL.
   Helper bersama (_pdfEsc, _pdfDateFilterLolos_, _pdfLogoPlnB64_,
   getPejabatRekapROW, _getOrCreateFolderByPath) ada di Tek-ROW.gs /
   Tek-Temuan.gs (global scope, tanpa import).
   Dipasang di doGet (Code.gs): if(pdf=='gardu') return unduhPdfInsGardu(e). */
/* ─── Pejabat penandatangan Rekap Inspeksi Gardu (blok tanda tangan PDF) ───
   Disimpan via Script Properties, TERPISAH dari pejabat ROW agar nama bisa beda.
   Default mengikuti pejabat ULP Toboali saat ini. */
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
    // Field kosong -> pertahankan nilai lama (jangan menimpa dgn kosong agar PDF tak blank).
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

// URL web app (/exec) untuk membangun tautan Unduh PDF dari frontend Tek-InsDu.
function getExecUrlInsGardu(){
  try{ return ScriptApp.getService().getUrl() || ''; }catch(e){ return ''; }
}

/* Baca rekap realisasi gardu untuk preview tabel di frontend (struktur sama dgn PDF). */
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

/* Baca db_InsDu_Realisasi -> array objek (terfilter tanggal/penyulang & terurut). */
function _pdfQueryRealisasiInsGardu(ss, f){
  var R = COL_INSDU.REALISASI;
  var sh = ss.getSheetByName(SHEET_INSDU_REALISASI);
  if(!sh || sh.getLastRow() < 2) return [];
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 12).getValues();
  var out = [];
  for(var i=0;i<data.length;i++){
    var r = data[i];
    var ng = String(r[R.nomorGardu] || '').trim();
    var kp = String(r[R.kodePekerjaanGardu] || '').trim();
    if(!ng && !kp) continue;                         // lewati baris kosong
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

/* HTML PDF REKAP INSPEKSI GARDU (format Laporan Bulanan, A4 portrait, mirip Rekap ROW). */
function _buildHtmlPdfRekapInsGardu(rows, f){
  var pjb = getPejabatRekapInsGardu();
  var bln = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];
  function _tglIndo(iso){
    var s = _normTgl(iso); if(!s) return '';
    var p = s.split('-'); var m = parseInt(p[1],10)||1;
    return p[2] + ' ' + bln[m-1] + ' ' + p[0];
  }
  // TIER pekerjaan -> 'ADA'/'TIDAK ADA' per kolom (Tier 1 / Tier 2).
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


/* ══════════════════════════════════════════
   UPDATE HI GARDU — sumber sheet INPUT TBL (gsheet 3 "Mater HI UP3")
   Baca & tulis balik per KOLOM HURUF (A..FP) untuk form "Update HI Gardu"
   di frontend Tek-PengukuranGardu. Baris dicocokkan via kolom C (GARDU)
   + opsional kolom B (ULP). Generik: skalabel utk semua grup.
════════════════════════════════════════════ */
/* Sumber data HI: file Master Gardu (1TEC...), 2 tab:
   - mg = Master_Gardu       : GARDU di kolom C, ULP di kolom B
   - sf = Suhu & Fisik Trafo : GARDU di kolom B, tanpa kolom ULP
   Frontend menandai tiap field dgn data-sheet="mg"/"sf" + huruf kolom tujuan. */
var HI_SRC = {
  // Sumber BACA utama (gsheet1) — dipakai getHiUp3 & _hiTabSheet_.
  spreadsheetId: '1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw',
  tabs: {
    mg: { name:'Master_Gardu',       gid:null,       colGardu:2, colUlp:1  },
    sf: { name:'Suhu & Fisik Trafo', gid:1815443245, colGardu:1, colUlp:-1 }
  },
  // TARGET TULIS mg/sf — gsheet1 & gsheet2 berstruktur IDENTIK (mg + sf).
  //  gsheet2: "1. DATA TRAFO" ≡ Master_Gardu, "2. SUHU & FISIK TRAFO" ≡ Suhu & Fisik.
  writeTargets: [
    { label:'gsheet1', spreadsheetId:'1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw',
      mg:{ name:'Master_Gardu',         gid:null,       colGardu:2, colUlp:1  },
      sf:{ name:'Suhu & Fisik Trafo',   gid:1815443245, colGardu:1, colUlp:-1 } },
    { label:'gsheet2', spreadsheetId:'1mfgj9Izkh3gy9Xf0LkxyIR8tETMwY2RbjQdZ_U4vN6w',
      mg:{ name:'1. DATA TRAFO',          gid:2129497099, colGardu:2, colUlp:1  },
      sf:{ name:'2. SUHU & FISIK TRAFO',  gid:198498101,  colGardu:1, colUlp:-1 } }
  ],
  // TARGET TULIS INPUT TBL (gsheet3) — layout LAMA gabungan (kolom huruf A..FP),
  //  GARDU di kolom C, ULP di kolom B. Hanya field ber-data-col HURUF yg dikirim.
  inputTbl: { label:'gsheet3', spreadsheetId:'1A7SvIoVbLhnn7g1cNaZ2ed38cNDEFLeB3SMHWKY8vm4',
    name:'INPUT TBL', gid:1401502183, colGardu:2, colUlp:1 }
};

// Huruf kolom -> index 0-based (A=0). Mendukung multi-huruf (mis. "FP").
function _hiColLetterToIndex_(letter){
  var s = String(letter||'').toUpperCase(); var r = 0;
  for(var i=0;i<s.length;i++){ r = r*26 + (s.charCodeAt(i)-64); }
  return r - 1;
}
// index 0-based -> huruf kolom.
function _hiIndexToColLetter_(index){
  var n = Number(index) + 1; var s = '';
  while(n > 0){ var m = (n-1)%26; s = String.fromCharCode(65+m) + s; n = Math.floor((n-1)/26); }
  return s;
}
// Buka salah satu tab sumber HI (by gid, fallback nama).
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
// Cari baris (1-based): kolom GARDU = nomorGardu (+ ULP bila tab punya kolom ULP & ulp diisi).
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
    return r+1; // 1-based
  }
  return -1;
}
// Baca 1 baris 1 tab -> { row, data:{ colLetter:value } } (display values); null bila tak ketemu.
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

/* Baca data gardu dari KEDUA tab (Master_Gardu + Suhu & Fisik).
   params:{ nomorGardu, ulp? }
   return:{ ok, found, nomorGardu, mg:{row,data}|null, sf:{row,data}|null } */
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

/* GUARD Suhu & Fisik — sisipkan baris baru utk gardu yg ADA di Master_Gardu
   tapi BELUM ada di Suhu & Fisik Trafo. MENIRU sync BA (_baTerapkanUpdateMaster_):
   baris disisip FISIK per-prefix (di bawah GARDU terakhir berprefix sama, mis. TB;
   bila prefix belum ada, di bawah baris data terakhir), lalu kolom BERFORMULA
   (mis. NO kolom A) DISALIN dari baris acuan supaya formula ikut mengalir.
   Identitas dasar (GARDU, Alamat, Merk, Kapasitas) disalin dari Master_Gardu;
   kolom lain dibiarkan kosong lalu diisi nilai yg di-save.
   Layout Suhu & Fisik: A NO, B GARDU, C Alamat, D Merk, E Kapasitas. */
function _hiSisipBarisSf_(sh, cfg, nomorGardu, g){
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  var colG = cfg.colGardu; // 0-based (Suhu & Fisik: B = 1)
  var nomorCol = sh.getRange(1, colG+1, Math.max(lastRow,1), 1).getValues();
  var prefixBaru = '';
  try { prefixBaru = (_baParseNomorGardu_(nomorGardu) || {}).prefix || ''; } catch(e){ prefixBaru = ''; }
  // Baris acuan = GARDU terakhir berprefix sama; fallback baris data terakhir.
  var lastPrefixRow = -1, lastDataRow0 = 0;
  for(var r=0;r<nomorCol.length;r++){
    var nomorRr = String(nomorCol[r][0]||'').trim();
    if(nomorRr === '') continue;
    lastDataRow0 = r;
    var parsedRr = null;
    try { parsedRr = _baParseNomorGardu_(nomorRr); } catch(e){ parsedRr = null; }
    if(parsedRr && parsedRr.prefix === prefixBaru) lastPrefixRow = r;
  }
  var sumberSheetRow = ((lastPrefixRow >= 0) ? lastPrefixRow : lastDataRow0) + 1; // 1-based acuan
  sh.insertRowsAfter(sumberSheetRow, 1);        // sisip fisik -> baris di bawah bergeser turun
  var row = sumberSheetRow + 1;                 // baris baru hasil sisip
  // Salin kolom BERFORMULA dari baris acuan (mis. NO kolom A) ke baris baru.
  var formulaBaris = sh.getRange(sumberSheetRow, 1, 1, lastCol).getFormulas()[0];
  for(var ci=0; ci<formulaBaris.length; ci++){
    if(formulaBaris[ci]){
      sh.getRange(sumberSheetRow, ci+1).copyTo(sh.getRange(row, ci+1));
    }
  }
  // Identitas dasar (setelah salin formula supaya nilai tak tertimpa).
  sh.getRange(row, colG+1).setValue(nomorGardu); // B GARDU (kunci pencocokan)
  if(g){
    sh.getRange(row, 3).setValue(g.alamat    || ''); // C Alamat
    sh.getRange(row, 4).setValue(g.merkTrafo || ''); // D Merk
    sh.getRange(row, 5).setValue(g.dayaKva   || ''); // E Kapasitas
  }
  return row;
}

/* Buka sheet dari spreadsheet+tab tertentu (by gid, fallback nama). Generik lintas-file. */
function _hiOpenSheet_(spreadsheetId, tabCfg){
  if(!spreadsheetId || !tabCfg) return null;
  var ss = SpreadsheetApp.openById(spreadsheetId);
  if(tabCfg.gid != null){
    var all = ss.getSheets();
    for(var i=0;i<all.length;i++){ if(all[i].getSheetId() === tabCfg.gid) return all[i]; }
  }
  return ss.getSheetByName(tabCfg.name);
}

/* Tulis kumpulan nilai { colLetter:value } ke satu baris; kembalikan jumlah field tertulis. */
function _hiTulisNilai_(sh, row, data){
  var n = 0;
  Object.keys(data).forEach(function(letter){
    var idx = _hiColLetterToIndex_(letter);
    if(idx < 0) return;
    /* Nilai berasal dari klien -> lindungi dari formula injection.
       Tiga spreadsheet target dibuka oleh banyak pihak, jadi satu sel
       berisi =IMPORTRANGE(...) sudah cukup untuk mengirim data keluar. */
    sh.getRange(row, idx+1).setValue(safeCell_(data[letter]==null?'':data[letter]));
    n++;
  });
  return n;
}

/* Tulis balik ke 3 gsheet sekaligus:
   - mg/sf  -> gsheet1 & gsheet2 (HI_SRC.writeTargets, struktur identik)
   - it     -> gsheet3 INPUT TBL (layout lama gabungan, HI_SRC.inputTbl)
   payload:{ nomorGardu, ulp?, mg:{colLetter:value}, sf:{colLetter:value}, it:{colLetter:value} }
   GUARD: bila gardu ADA di Master_Gardu tapi BELUM ada di tab Suhu & Fisik target,
   baris baru otomatis disisipkan (pola sync BA) lalu diisi nilainya. */
function updateHiUp3(payload){
  /* OTENTIKASI + SKOP ULP (29 Agu 2026).
     Fungsi ini menulis ke TIGA spreadsheet berbeda dan bisa menyisipkan
     baris baru — sebelumnya bisa dipanggil siapa pun tanpa login.
     Nilai payload.ulp hanya dihormati untuk Super User; peran lain dipaksa
     ke ULP sesinya. (`updateMasterGarduMobile` sudah memeriksa hal yang sama,
     tetapi fungsi ini juga bisa dipanggil langsung.) */
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
    // Nama tampilan per target utk popup (sinkron pola LABEL sync BA).
    var HI_HASIL_NAME = { gsheet1:'Master Gardu', gsheet2:'1. DATA TRAFO', gsheet3:'INPUT TBL' };
    var hasilArr = [];

    // 1) mg & sf -> semua target berstruktur identik (gsheet1 & gsheet2).
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

    // 2) INPUT TBL -> gsheet3 (layout lama gabungan; hanya kolom huruf).
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

    _garduMasterMemo = null; // Master_Gardu berubah -> reset cache pembaca master
    SpreadsheetApp.flush();
    var total = hasil.mg + hasil.sf + hasil.it;
    if(!total && pesan.length) return { ok:false, message:pesan.join(' ') };
    return { ok:true, jumlahField:total, detail:hasil, hasil:hasilArr, sfDisisipkan:sfDisisipkan,
      message:'Data HI '+nomorGardu+' tersimpan ke 3 gsheet (mg '+hasil.mg+', sf '+hasil.sf+', INPUT TBL '+hasil.it+' field tertulis).'
        + (sfDisisipkan ? ' Baris baru Suhu & Fisik dibuat.' : '')
        + (pesan.length ? ' Catatan: '+pesan.join(' ') : '') };
  }catch(e){ return { ok:false, message:'Gagal menyimpan data HI: '+(e&&e.message?e.message:e) }; }
}

/* Dropdown Penyulang utk form Update HI — sumber sheet db_Penyulang (kolom "penyulang").
   Baca header baris 1, cari kolom berjudul "penyulang" (case-insensitive; fallback kolom A),
   kembalikan daftar unik terurut. */
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