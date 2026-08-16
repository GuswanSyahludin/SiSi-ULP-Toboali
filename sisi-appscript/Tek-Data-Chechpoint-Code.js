/* ===============================================================
   Tek-Data-Checkpoint.gs — SiSi ULP Toboali (MODUL DATA PENDUKUNG CHECKPOINT)
   Backend untuk tab 'Data Pendukung CheckPoint' pada SIE-Teknik.
   DIPISAH dari SIE-Teknik-Code.gs (Rev 11 Agu 2026) karena file itu sudah
   mencapai ~3000 baris. Semua fungsi/variabel di file ini tetap GLOBAL scope
   Apps Script, jadi frontend (google.script.run.getDpg*) TIDAK perlu diubah.

   Endpoint yang disediakan file ini:
     1. getDpgHarMatrix          -> matriks kriteria (vertikal) x bulan+minggu
                                    (Hartek + Inspeksi + ROW), reuse _gaspolFrom*.
     2. getDpgCoverGardu         -> status kelengkapan cover per gardu (Master_Gardu).
     3. getDpgGangguanPenyulang  -> daftar gangguan penyulang (SiMonLang) setahun.
     4. getDpgGangguanCharts     -> grafik gangguan penyulang + FGTM (SiMonLang).
     5. getDpgRekapTemuan        -> rekap temuan inspeksi (db_INS_Temuan).
     6. getDpgSectionList        -> daftar Section untuk dropdown filter (db_INS_Temuan).
   'minggu ke-' dalam bulan = Math.ceil(tanggal/7) -> 1..5 (sama dgn Tek-Hartek).

   Dependensi lintas file (semua global scope — JANGAN didefinisikan ulang):
     - SIE-Teknik-Code.gs : _gaspolFromROW, _gaspolFromInspeksiJar,
         _gaspolFromInspeksiGardu, _gaspolFromHartek, _sieReadDbMaster,
         _siePangkalSection (nama kolom output mengacu COL_GASPOL).
     - Tek-InsDu.gs       : _garduMasterRows, COL_GARDU.
     - Tek-Gangguan.gs    : GANGGUAN_SS_ID, GANGGUAN_SHEET, COL_GGN,
         _glParseWaktu_, _glReportDate_, _glProper_, _glNormUlp_, _glIso_.
     - Modul Temuan       : _ssIns, SHEET_INS.TEMUAN, COL_INS.TEMUAN, _normTgl,
         _statusTemuanIns (dropdown nama temuan via getListTemuanByObjek('')).
=============================================================== */
function _zeros12(){ var a=[]; for(var i=0;i<12;i++) a.push(0); return a; }

/* 1) MATRIKS HAR (Hartek + Inspeksi + ROW) per Penyulang.
   opts: { penyulang:'', tahun:2026, ulp:'' } (ulp diabaikan: sumber single-ULP,
   sama dgn getGaspolRekap). Output SHAPE = getHartekRekapMatrix:
     { ok, tahun, data:{ <kolomGASPOL>:{ 'bulan0-11 + "-" + minggu1-5': nilai } },
       totalPerKriteria:{ <kolomGASPOL>: nilai } }
   Kolom = nama properti COL_GASPOL (insSutmKms, insSutmTier1/2, insGarduTier1/2,
   rowRabas/Sedang/Besar, harkom*, harkons*, gardu*, sutr*). */
function getDpgHarMatrix(opts){
  try{
    opts = opts || {};
    var penyF = String(opts.penyulang||'').trim().toLowerCase();
    var tahun = parseInt(opts.tahun,10) || (new Date()).getFullYear();
    var f = { tglDari: tahun + '-01-01', tglSampai: tahun + '-12-31' };

    var out = {}, tot = {};
    function _peny(k){ return String(k).split('||')[0]; }
    function _tgl(k){  return String(k).split('||')[1]; }
    function _lolos(k){ return !penyF || _peny(k).toLowerCase() === penyF; }
    function _add(col, tgl, val){
      val = Number(val) || 0;
      if(!col || !val) return;
      var parts = String(tgl||'').split('-');
      if(parts.length < 3) return;
      if(parseInt(parts[0],10) !== tahun) return;
      var bulan  = parseInt(parts[1],10) - 1;
      var minggu = Math.ceil(parseInt(parts[2],10) / 7);
      var slot = bulan + '-' + minggu;
      if(!out[col]) out[col] = {};
      out[col][slot] = (out[col][slot]||0) + val;
      tot[col] = (tot[col]||0) + val;
    }

    // Kumpulkan semua sumber lebih dulu agar section per-key bisa dibangun untuk filter Section.
    var row = _gaspolFromROW(f);
    var ij  = _gaspolFromInspeksiJar(f);
    var g   = _gaspolFromInspeksiGardu(f);
    var ht  = _gaspolFromHartek(f);

    // Filter Section (opsional): ambil PANGKAL (ruas sebelum '-') dari section db_INS_Temuan,
    // cocokkan dengan section per-key (InsJar/Gardu) atau fallback section master DB per penyulang.
    // Contoh: 'LBS Air Timur - GH Payung / LBS Mekar Jaya' -> pangkal 'LBS Air Timur'.
    var secPangkalF = _siePangkalSection(String(opts.section||'')).trim().toLowerCase();
    var keySection = {};
    Object.keys(ij).forEach(function(k){ if(ij[k] && ij[k].section && !keySection[k]) keySection[k] = ij[k].section; });
    Object.keys(g).forEach(function(k){ if(g[k] && g[k].section && !keySection[k]) keySection[k] = g[k].section; });
    var master = secPangkalF ? _sieReadDbMaster() : null;
    function _secOf(k){
      if(keySection[k]) return keySection[k];
      if(master){ var rec = master.byPenyulang[_peny(k).toLowerCase()] || {}; return rec.section || ''; }
      return '';
    }
    function _secLolos(k){
      if(!secPangkalF) return true;
      return _siePangkalSection(_secOf(k)).trim().toLowerCase() === secPangkalF;
    }
    function _ok(k){ return _lolos(k) && _secLolos(k); }

    // ROW -> rowRabas / rowSedang / rowBesar
    Object.keys(row).forEach(function(k){
      if(!_ok(k)) return;
      var r = row[k], t = _tgl(k);
      _add('rowRabas', t, r.rabas); _add('rowSedang', t, r.sedang); _add('rowBesar', t, r.besar);
    });
    // Inspeksi Jaringan -> insSutmKms / insSutmTier1 / insSutmTier2
    Object.keys(ij).forEach(function(k){
      if(!_ok(k)) return;
      var r = ij[k], t = _tgl(k);
      _add('insSutmKms', t, r.kms ? Math.round(r.kms*100)/100 : 0);
      _add('insSutmTier1', t, r.tier1); _add('insSutmTier2', t, r.tier2);
    });
    // Inspeksi Gardu -> insGarduTier1 / insGarduTier2
    Object.keys(g).forEach(function(k){
      if(!_ok(k)) return;
      var r = g[k], t = _tgl(k);
      _add('insGarduTier1', t, r.tier1); _add('insGarduTier2', t, r.tier2);
    });
    // Hartek -> HARKOM / HARKONS / Gardu / SUTR (key sudah = properti COL_GASPOL)
    Object.keys(ht).forEach(function(k){
      if(!_ok(k)) return;
      var r = ht[k], t = _tgl(k);
      Object.keys(r).forEach(function(col){ _add(col, t, r[col]); });
    });

    return { ok:true, tahun:tahun, data:out, totalPerKriteria:tot };
  }catch(e){ return { ok:false, message:e.message, data:{}, totalPerKriteria:{} }; }
}

/* 2) COVER GARDU — status kelengkapan cover per GARDU (sumber: Master_Gardu).
   Reuse _garduMasterRows() & COL_GARDU (global, Tek-InsDu.gs). Kolom cover (0-based):
     FP coverFcoAtas:171, FQ coverFcoBawah:172, FR coverBushingTm:173, FS coverBushingTr:174,
     FT coverArrester:175, FU coverJumperanAtas:176, FV coverJumperanBawah:177.
   Kriteria FULL:
     - FP-FT  : nilai 'Lengkap' = full; selain itu belum.
     - FU & FV: nilai 'Lengkap' / 'A3CS' / 'Protective Sleeve' = full; selain itu belum.
   Gardu FULL COVER hanya bila SEMUA 7 komponen full; selain itu Belum Full Cover.
   opts: { penyulang:'', ulp:'' } (tahun diabaikan - master gardu tanpa tahun).
   Kategori BTS (11 Agu 2026): gardu tergolong BTS bila ALAMAT-nya (kolom D
   Master_Gardu / COL_GARDU.alamat) mengandung kata "BTS" — tiap gardu membawa
   flag g.bts. Bucket membawa hitungan 'tanpaBts' (gardu non-BTS) utk kolom
   "Jumlah Gardu Tanpa BTS" di tab Cover Gardu.
   Output (drill-down siap render, berisi daftar nomor gardu per bucket):
     { ok, total, totalTanpaBts, full:{count,tanpaBts,gardu:[]}, belum:{count,tanpaBts,gardu:[]},
       komponen:[ { key, label, lengkap:{count,gardu:[]}, belum:{count,gardu:[]} } ] } */
var DPG_COVER_KOMPONEN = [
  { key:'fcoAtas',       col:'coverFcoAtas',       label:'FCO Atas',         grup:'ft' },
  { key:'fcoBawah',      col:'coverFcoBawah',      label:'FCO Bawah',        grup:'ft' },
  { key:'bushingTm',     col:'coverBushingTm',     label:'Bushing TM',       grup:'ft' },
  { key:'bushingTr',     col:'coverBushingTr',     label:'Bushing TR',       grup:'ft' },
  { key:'arrester',      col:'coverArrester',      label:'Bushing Arrester', grup:'ft' },
  { key:'jumperanAtas',  col:'coverJumperanAtas',  label:'Jumperan Atas',    grup:'uv' },
  { key:'jumperanBawah', col:'coverJumperanBawah', label:'Jumperan Bawah',   grup:'uv' }
];
function _dpgCoverIsFull(grup, val){
  var v = String(val==null?'':val).trim().toLowerCase();
  if(grup === 'uv') return (v === 'lengkap' || v === 'a3cs' || v === 'protective sleeve');
  return (v === 'lengkap');   // grup 'ft' = kolom FP-FT
}
function getDpgCoverGardu(opts){
  try{
    opts = opts || {};
    var penyF = String(opts.penyulang||'').trim().toLowerCase();
    var ulpF  = String(opts.ulp||'').trim().toLowerCase();
    var secPangkalF = _siePangkalSection(String(opts.section||'')).trim().toLowerCase();  // pangkal section (ruas sebelum '-')
    var rows  = _garduMasterRows();   // data Master_Gardu (global, Tek-InsDu.gs)

    var full = { count:0, tanpaBts:0, gardu:[] }, belum = { count:0, tanpaBts:0, gardu:[] };
    var tanpaBtsTotal = 0;   // total gardu non-BTS (alamat kolom D tidak mengandung kata "BTS")
    var komp = DPG_COVER_KOMPONEN.map(function(k){
      return { key:k.key, label:k.label, lengkap:{ count:0, gardu:[] }, belum:{ count:0, gardu:[] } };
    });

    for(var i=0;i<rows.length;i++){
      var r = rows[i];
      var nomor = String(r[COL_GARDU.nomorGardu]||'').trim();
      if(!nomor) continue;
      var peny = String(r[COL_GARDU.penyulang]||'').trim();
      if(penyF && peny.toLowerCase() !== penyF) continue;
      if(ulpF && String(r[COL_GARDU.ulp]||'').trim().toLowerCase() !== ulpF) continue;
      if(secPangkalF && _siePangkalSection(String(r[COL_GARDU.section]||'')).trim().toLowerCase() !== secPangkalF) continue;

      // Objek gardu untuk drill-down detail (No, Nomor Gardu, Penyulang, Section, Alamat).
      // 'kurang' = daftar label komponen cover yang membuat gardu ini belum full cover (keperluan material).
      // 'nilai'  = nilai mentah tiap komponen cover sesuai data master (urut mengikuti DPG_COVER_KOMPONEN).
      var g = {
        nomorGardu: nomor,
        penyulang:  peny,
        section:    String(r[COL_GARDU.section]||'').trim(),
        alamat:     String(r[COL_GARDU.alamat]||'').trim(),
        bts:        /bts/i.test(String(r[COL_GARDU.alamat]||'')),   // kategori BTS: alamat (kolom D) mengandung kata "BTS"
        kurang:     [],
        nilai:      []
      };

      var semuaFull = true;
      for(var c=0;c<DPG_COVER_KOMPONEN.length;c++){
        var def = DPG_COVER_KOMPONEN[c];
        g.nilai.push(String(r[COL_GARDU[def.col]]==null?'':r[COL_GARDU[def.col]]).trim());
        if(_dpgCoverIsFull(def.grup, r[COL_GARDU[def.col]])){
          komp[c].lengkap.count++; komp[c].lengkap.gardu.push(g);
        } else {
          komp[c].belum.count++; komp[c].belum.gardu.push(g); semuaFull = false;
          g.kurang.push(def.label);   // komponen belum lengkap -> keperluan material gardu ini
        }
      }
      if(!g.bts) tanpaBtsTotal++;
      if(semuaFull){ full.count++; full.gardu.push(g); if(!g.bts) full.tanpaBts++; }
      else { belum.count++; belum.gardu.push(g); if(!g.bts) belum.tanpaBts++; }
    }

    var _sort = function(a){ a.sort(function(x,y){ return String(x.nomorGardu).localeCompare(String(y.nomorGardu)); }); };
    _sort(full.gardu); _sort(belum.gardu);
    komp.forEach(function(k){ _sort(k.lengkap.gardu); _sort(k.belum.gardu); });

    return { ok:true, total: full.count + belum.count, totalTanpaBts: tanpaBtsTotal, full:full, belum:belum, komponen:komp };
  }catch(e){ return { ok:false, message:e.message, total:0, totalTanpaBts:0, full:{ count:0, tanpaBts:0, gardu:[] }, belum:{ count:0, tanpaBts:0, gardu:[] }, komponen:[] }; }
}

/* 3) GANGGUAN PENYULANG sepanjang tahun (sumber SiMonLang: Tarikan_SiMonLang).
   Reuse konstanta & helper global dari Tek-Gangguan.gs (GANGGUAN_SS_ID,
   GANGGUAN_SHEET, COL_GGN, _glParseWaktu_, _glReportDate_, _glProper_,
   _glNormUlp_, _glIso_). opts: { penyulang:'', tahun:2026, ulp:'' }.
   Output: { ok, tahun, rows:[{tanggal,penyulang,kategori,temuan}], total, pmt,
             section, perBulan:[12] }. Kategori: 'PMT' atau 'Section'. */
function getDpgGangguanPenyulang(opts){
  try{
    opts = opts || {};
    var penyF = String(opts.penyulang||'').trim().toLowerCase();
    var ulpF  = _glNormUlp_(opts.ulp||'');
    var tahun = parseInt(opts.tahun,10) || (new Date()).getFullYear();
    var ss;
    try{ ss = SpreadsheetApp.openById(GANGGUAN_SS_ID); }
    catch(e){ return { ok:false, message:'Spreadsheet gangguan (SiMonLang) tidak dapat diakses.', rows:[], total:0, pmt:0, section:0, perBulan:_zeros12() }; }
    var sh = ss.getSheetByName(GANGGUAN_SHEET);
    if(!sh || sh.getLastRow() < 2) return { ok:true, tahun:tahun, rows:[], total:0, pmt:0, section:0, perBulan:_zeros12() };
    var C = COL_GGN, COL_FGTM_Y = 24;   // kolom Y (0-based) = kode FGTM
    var _fgtmLabel = {}; DPG_FGTM_MAP.forEach(function(m){ _fgtmLabel[m.kode] = m.label; });
    var d = sh.getDataRange().getValues();
    var rows = [], pmt = 0, sec = 0, perBulan = _zeros12();
    for(var i=1;i<d.length;i++){
      var t = _glParseWaktu_(d[i][C.waktuPadam]);
      if(!t) continue;
      if(ulpF && _glNormUlp_(d[i][C.ulp]) !== ulpF) continue;
      var rd = _glReportDate_(t);
      if(!rd) continue;
      if(rd.getFullYear() !== tahun) continue;
      var peny = _glProper_(d[i][C.penyulang]);
      if(penyF && peny.toLowerCase() !== penyF) continue;
      var isPmt = (String(d[i][C.kategori]||'').trim().toUpperCase() === 'PMT');
      var kodeFg = _dpgFgtmMatch(d[i][COL_FGTM_Y]) || _dpgFgtmMatchRow(d[i]);   // kode FGTM per baris
      rows.push({ tanggal:_glIso_(rd), _ms:t.getTime(), penyulang:peny, kategori:isPmt?'PMT':'Section', temuan:String(d[i][C.temuan]||'').trim(), kodeFgtm:kodeFg, labelFgtm:(kodeFg?(_fgtmLabel[kodeFg]||''):'') });
      if(isPmt) pmt++; else sec++;
      perBulan[rd.getMonth()]++;
    }
    rows.sort(function(a,b){ return a._ms - b._ms; });
    rows.forEach(function(r){ delete r._ms; });
    return { ok:true, tahun:tahun, rows:rows, total:rows.length, pmt:pmt, section:sec, perBulan:perBulan };
  }catch(e){ return { ok:false, message:e.message, rows:[], total:0, pmt:0, section:0, perBulan:_zeros12() }; }
}

/* 4) GRAFIK GANGGUAN PENYULANG (Google Charts) — sumber SiMonLang.
   opts: { penyulang:'', tahun:2026, ulp:'' }. Memindai sheet SEKALI, mengembalikan:
     - perBulanMulti : { <tahun>:[12] } untuk 3 tahun (tahun terpilih + 2 sebelumnya).
     - perBulanTahun : [12] tahun terpilih (grafik bar per bulan).
     - perTahunTotal : { <tahun>:total } untuk 3 tahun (grafik kali gangguan).
     - fgtm          : { keseluruhan:[], internal:[], external:[], tidakDiketahui } TAHUN TERPILIH,
                       tiap item { kode, label, count } dari kolom Y (kode FGTM).
   Kode FGTM (3 kategori):
     internal        -> Peralatan JTM=I2, Komponen JTM=I1, Tiang=I4;
     external        -> Pekerjaan Pihak III/Binatang=E3, Pohon=E1, Bencana Alam=E2, Layang2/Umbul2 dll=E4;
     tidak diketahui -> baris gangguan tanpa kode FGTM yang cocok.
   Reuse _gl* & _zeros12 (global). */
var DPG_FGTM_MAP = [
  { kode:'I2', label:'Peralatan JTM',                  grup:'internal' },
  { kode:'I1', label:'Komponen JTM',                   grup:'internal' },
  { kode:'I4', label:'Tiang',                          grup:'internal' },
  { kode:'E3', label:'Pekerjaan Pihak III / Binatang', grup:'external' },
  { kode:'E1', label:'Pohon',                          grup:'external' },
  { kode:'E2', label:'Bencana Alam',                   grup:'external' },
  { kode:'E4', label:'Layang2 / Umbul2 dll',           grup:'external' }
];
function _dpgFgtmMatch(v){
  var s = String(v==null?'':v).toUpperCase();
  if(!s) return '';
  // Cocokkan KODE FGTM sebagai token utuh (mis. "Pohon - E10", "E10", "E10-Pohon"),
  // bukan bagian dari kata/angka lain (spt "E100"), agar tak salah cocok.
  for(var i=0;i<DPG_FGTM_MAP.length;i++){
    var k = DPG_FGTM_MAP[i].kode;
    if(new RegExp('(^|[^A-Z0-9])'+k+'([^A-Z0-9]|$)').test(s)) return k;
  }
  return '';
}
// Pindai SELURUH kolom baris gangguan untuk menemukan kode FGTM, apa pun kolomnya.
// (Kolom "Kode FGTM" bisa bergeser; scan baris membuat deteksi tahan posisi.)
function _dpgFgtmMatchRow(row){
  for(var c=0;c<row.length;c++){
    var k=_dpgFgtmMatch(row[c]);
    if(k) return k;
  }
  return '';
}
function getDpgGangguanCharts(opts){
  try{
    opts = opts || {};
    var penyF = String(opts.penyulang||'').trim().toLowerCase();
    var ulpF  = _glNormUlp_(opts.ulp||'');
    var tahun = parseInt(opts.tahun,10) || (new Date()).getFullYear();
    var years = [tahun-2, tahun-1, tahun];
    var yIdx  = {}; years.forEach(function(y){ yIdx[y] = true; });

    var perBulanMulti = {}, perTahunTotal = {};
    years.forEach(function(y){ perBulanMulti[y] = _zeros12(); perTahunTotal[y] = 0; });
    var fgtmCount = {}; DPG_FGTM_MAP.forEach(function(m){ fgtmCount[m.kode] = 0; });
    var fgtmTak = 0;   // penghitung kategori "Tidak Diketahui" (baris tanpa kode FGTM cocok)

    function _fgtmOut(){
      var out = { keseluruhan:[], internal:[], external:[], tidakDiketahui:{ kode:'NA', label:'Tidak Diketahui', count:fgtmTak } };
      DPG_FGTM_MAP.forEach(function(m){
        var it = { kode:m.kode, label:m.label, count:fgtmCount[m.kode]||0 };
        out.keseluruhan.push(it);
        if(m.grup === 'internal') out.internal.push(it); else out.external.push(it);
      });
      return out;
    }
    function _pack(){
      return { ok:true, tahun:tahun, tahunList:years, penyulang:opts.penyulang||'',
               perBulanMulti:perBulanMulti, perBulanTahun:perBulanMulti[tahun],
               perTahunTotal:perTahunTotal, fgtm:_fgtmOut() };
    }

    var ss;
    try{ ss = SpreadsheetApp.openById(GANGGUAN_SS_ID); }
    catch(e){ return { ok:false, message:'Spreadsheet gangguan (SiMonLang) tidak dapat diakses.', tahun:tahun, tahunList:years, perBulanMulti:perBulanMulti, perBulanTahun:perBulanMulti[tahun], perTahunTotal:perTahunTotal, fgtm:_fgtmOut() }; }
    var sh = ss.getSheetByName(GANGGUAN_SHEET);
    if(!sh || sh.getLastRow() < 2) return _pack();

    var C = COL_GGN, COL_FGTM_Y = 24;   // kolom Y (0-based) = kode FGTM
    var d = sh.getDataRange().getValues();
    for(var i=1;i<d.length;i++){
      var t = _glParseWaktu_(d[i][C.waktuPadam]);
      if(!t) continue;
      if(ulpF && _glNormUlp_(d[i][C.ulp]) !== ulpF) continue;
      var rd = _glReportDate_(t);
      if(!rd) continue;
      var yr = rd.getFullYear();
      if(!yIdx[yr]) continue;
      var peny = _glProper_(d[i][C.penyulang]);
      if(penyF && peny.toLowerCase() !== penyF) continue;
      perBulanMulti[yr][rd.getMonth()]++;
      perTahunTotal[yr]++;
      if(yr === tahun){
        // Utamakan kolom Y; bila kosong/tak cocok, pindai seluruh baris sbg fallback.
        var kode = _dpgFgtmMatch(d[i][COL_FGTM_Y]) || _dpgFgtmMatchRow(d[i]);
        if(kode) fgtmCount[kode]++;
        else fgtmTak++;   // tak ada kode cocok -> kategori "Tidak Diketahui"
      }
    }
    return _pack();
  }catch(e){ return { ok:false, message:e.message }; }
}

/* 5) REKAP TEMUAN INSPEKSI (sumber db_INS_Temuan) — untuk sub-tab 'Rekap Temuan
   Inspeksi' pada tab Data Pendukung CheckPoint. Reuse global Modul Temuan:
   _ssIns, SHEET_INS.TEMUAN, COL_INS.TEMUAN, _normTgl, _statusTemuanIns.
   Daftar nama temuan (dropdown) diambil frontend via getListTemuanByObjek('')
   (sumber db_List_Temuan). opts: { penyulang, tahun, ulp, temuan }.
   Output: { ok, tahun, rows:[{kodePekerjaan,tanggal,penyulang,objek,section,tier,temuan,status}], total }. */
function getDpgRekapTemuan(opts){
  try{
    opts = opts || {};
    var penyF = String(opts.penyulang||'').trim().toLowerCase();
    var temF  = String(opts.temuan||'').trim().toLowerCase();
    var ulpF  = String(opts.ulp||'').trim().toLowerCase();
    var secF  = String(opts.section||'').trim().toLowerCase();
    var tahun = parseInt(opts.tahun,10) || (new Date()).getFullYear();
    var C = COL_INS.TEMUAN;
    var sh = _ssIns().getSheetByName(SHEET_INS.TEMUAN);
    if(!sh || sh.getLastRow() < 2) return { ok:true, tahun:tahun, rows:[], total:0 };
    var vals = sh.getRange(2, 1, sh.getLastRow()-1, C.status + 1).getValues();
    var rows = [];
    for(var i=0;i<vals.length;i++){
      var r = vals[i];
      var kode = String(r[C.kodePekerjaan]||'').trim();
      if(!kode) continue;
      var tgl = _normTgl(r[C.tanggal]);
      if(!tgl || String(tgl).substring(0,4) !== String(tahun)) continue;
      var peny = String(r[C.penyulang]||'').trim();
      if(penyF && peny.toLowerCase() !== penyF) continue;
      var tem = String(r[C.temuan]||'').trim();
      if(temF && tem.toLowerCase() !== temF) continue;
      if(ulpF && String(r[C.ulp]||'').trim().toLowerCase() !== ulpF) continue;
      if(secF && String(r[C.section]||'').trim().toLowerCase() !== secF) continue;
      var stat = (typeof _statusTemuanIns==='function') ? _statusTemuanIns(r[C.status]) : (String(r[C.status]||'').trim() || 'Belum Ada Tim');
      rows.push({
        kodePekerjaan: kode,
        tanggal: tgl,
        penyulang: peny,
        objek: String(r[C.objekInspeksi]||'').trim(),
        section: String(r[C.section]||'').trim(),
        tier: String(r[C.tier]||'').trim(),
        temuan: tem,
        status: stat,
        fotoTemuanUrl: String(r[C.fotoTemuanUrl]||'').trim(),
        fotoTiangUrl: String(r[C.fotoTiangUrl]||'').trim()
      });
    }
    rows.sort(function(a,b){ return String(b.tanggal).localeCompare(String(a.tanggal)) || String(a.penyulang).localeCompare(String(b.penyulang)); });
    return { ok:true, tahun:tahun, rows:rows, total:rows.length };
  }catch(e){ return { ok:false, message:e.message, rows:[], total:0 }; }
}

/* 6) DAFTAR SECTION (dropdown filter) — distinct kolom Section dari db_INS_Temuan.
   Difilter opsional oleh penyulang & ulp. opts: { penyulang, ulp }.
   Output: { ok, list:[section] } (section utuh, mis. 'LBS Air Timur - GH Payung / LBS Mekar Jaya'). */
function getDpgSectionList(opts){
  try{
    opts = opts || {};
    var penyF = String(opts.penyulang||'').trim().toLowerCase();
    var ulpF  = String(opts.ulp||'').trim().toLowerCase();
    var C = COL_INS.TEMUAN;
    var sh = _ssIns().getSheetByName(SHEET_INS.TEMUAN);
    if(!sh || sh.getLastRow() < 2) return { ok:true, list:[] };
    var vals = sh.getRange(2, 1, sh.getLastRow()-1, C.section + 1).getValues();
    var seen = {}, list = [];
    for(var i=0;i<vals.length;i++){
      var r = vals[i];
      var sec = String(r[C.section]||'').trim();
      if(!sec) continue;
      if(penyF && String(r[C.penyulang]||'').trim().toLowerCase() !== penyF) continue;
      if(ulpF && String(r[C.ulp]||'').trim().toLowerCase() !== ulpF) continue;
      var key = sec.toLowerCase();
      if(seen[key]) continue;
      seen[key] = 1; list.push(sec);
    }
    list.sort(function(a,b){ return String(a).localeCompare(String(b)); });
    return { ok:true, list:list };
  }catch(e){ return { ok:false, message:e.message, list:[] }; }
}