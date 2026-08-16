/* =====================================================
   Tek-Gangguan.gs — SiSi ULP Toboali
   Modul Gangguan Penyulang (Bagian A & G Laporan UP3).
   Sumber: spreadsheet SiMonLang (TERPISAH dari SPREADSHEET_ID utama).

   SHEET: Tarikan_SiMonLang — kolom (0-based):
     F (5)  -> ULP
     G (6)  -> Penyulang (ditampilkan Proper Case)
     I (8)  -> Kategori (PMT jika "PMT"; selain itu = Section)
     J (9)  -> Tanggal / Jam padam (datetime, cth "25/07/2023 9:04:00") -> dipakai utk logika jam
     Z (25) -> Temuan
     AD(29) -> Tanggal (date-only; TIDAK dipakai utk logika jam)

   ATURAN HITUNG (hari laporan = 19:00 -> 19:00):
     - Gangguan jam < 19:00  -> masuk tanggal itu.
     - Gangguan jam >= 19:00 -> masuk tanggal BERIKUTNYA.
     - Akhir bulan: gangguan 19:00-24:00 di hari terakhir bulan (yang jatuh ke tgl 01
       bulan berikutnya) TIDAK dihitung, sehingga tanggal 01 mulai dari 0.
   KOMULATIF = akumulasi bulan berjalan (tgl 1 s/d tanggal laporan).
   _normTgl berasal dari Code.gs (ruang lingkup global Apps Script).
   ===================================================== */

var GANGGUAN_SS_ID = '1LQJP5WIc1vBSyBrd8ai0Y8549VBi0qjD-2nwRT-Nhp4';
var GANGGUAN_SHEET = 'Tarikan_SiMonLang';
var COL_GGN = { ulp:5, penyulang:6, kategori:8, waktuPadam:9, temuan:25, tanggal:29 };

// Proper Case: "TUNGKAL" -> "Tungkal"; "tanjung sari" -> "Tanjung Sari".
function _glProper_(s){
  return String(s==null?'':s).toLowerCase().split(/\s+/).map(function(w){
    return w ? (w.charAt(0).toUpperCase() + w.slice(1)) : w;
  }).join(' ').trim();
}

// Normalisasi ULP utk pencocokan longgar (abaikan prefix "ULP" & kapital).
function _glNormUlp_(s){
  return String(s==null?'':s).toUpperCase().replace(/^ULP\s+/,'').replace(/\s+/g,' ').trim();
}

// Parse sel waktu padam -> Date. Dukung Date atau string "DD/MM/YYYY H:mm[:ss]".
function _glParseWaktu_(v){
  if(v instanceof Date) return isNaN(v.getTime()) ? null : v;
  var s = String(v==null?'':v).trim();
  if(!s) return null;
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if(m) return new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5], +(m[6]||0));
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// Tanggal laporan (date-only) utk satu waktu padam; null bila harus diabaikan.
function _glReportDate_(t){
  if(!t) return null;
  var d = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  if(t.getHours() >= 19){
    d.setDate(d.getDate() + 1);
    if(d.getDate() === 1) return null; // akhir bulan: 19:00-24:00 tidak dihitung
  }
  return d;
}

function _glIso_(d){ return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }

// Pindai sheet gangguan utk satu ULP & tanggal laporan (ISO yyyy-MM-dd).
// -> { daily:{pmt,section,list:[{penyulang,temuan}]}, komulatif:{pmt,section} }
function _glScan_(ulp, tglIso){
  var out = { daily:{ pmt:0, section:0, list:[] }, komulatif:{ pmt:0, section:0 } };
  var ss;
  try { ss = SpreadsheetApp.openById(GANGGUAN_SS_ID); } catch(e){ return out; }
  var sh = ss.getSheetByName(GANGGUAN_SHEET);
  if(!sh || sh.getLastRow() < 2) return out;

  var C = COL_GGN, ulpN = _glNormUlp_(ulp), bulan = tglIso.substring(0,7);
  var d = sh.getDataRange().getValues(), tmp = [];
  for(var i=1;i<d.length;i++){
    var t = _glParseWaktu_(d[i][C.waktuPadam]);
    if(!t) continue;
    if(_glNormUlp_(d[i][C.ulp]) !== ulpN) continue;
    var rd = _glReportDate_(t);
    if(!rd) continue;
    var rdIso = _glIso_(rd);
    var isPmt = (String(d[i][C.kategori]||'').trim().toUpperCase() === 'PMT');
    if(rdIso.substring(0,7) === bulan && rdIso <= tglIso){
      if(isPmt) out.komulatif.pmt++; else out.komulatif.section++;
    }
    if(rdIso === tglIso){
      if(isPmt) out.daily.pmt++; else out.daily.section++;
      tmp.push({ ms:t.getTime(), penyulang:_glProper_(d[i][C.penyulang]), temuan:String(d[i][C.temuan]||'').trim() });
    }
  }
  tmp.sort(function(a,b){ return a.ms - b.ms; });
  out.daily.list = tmp.map(function(x){ return { penyulang:x.penyulang, temuan:x.temuan }; });
  return out;
}

/* ===== ENDPOINT (dipakai popup Gangguan di SIE-Teknik) ===== */
// params: { tanggal, ulp } -> { ok, daily:{pmt,section,list}, komulatif:{pmt,section} }
function getGangguanList(params){
  try{
    params = params || {};
    var ulp = String(params.ulp||'').trim();
    var tanggal = params.tanggal || '';
    if(!ulp)     return { ok:false, message:'ULP wajib dipilih.' };
    if(!tanggal) return { ok:false, message:'Tanggal wajib dipilih.' };
    var s = _glScan_(ulp, _normTgl(tanggal));
    return { ok:true, daily:s.daily, komulatif:s.komulatif };
  }catch(e){ return { ok:false, message:e.message }; }
}

// Uji cepat dari editor Apps Script.
function debugGangguan(){
  Logger.log(JSON.stringify(getGangguanList({ tanggal:_normTgl(new Date()), ulp:'Toboali' })));
}