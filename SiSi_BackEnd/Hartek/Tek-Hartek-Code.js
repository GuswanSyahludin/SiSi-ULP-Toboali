/* =====================================================
   Tek-Hartek.gs — SiSi ULP Toboali (MODUL HARTEK)
   Pemeliharaan Gardu/Jaringan + Material.
   Hirarki: db_Global_Header -> db_Hartek_PenyulangGardu
            -> db_Hartek_Pekerjaan -> db_Hartek_Material
   Master nama material: db_Material.
   Penentu objek = Jenis Pekerjaan: BUKAN 'Jaringan' (Gardu,
   Non - Teknik, dll) -> Penyulang/Section/Daerah auto dari
   GARDU_MASTER; 'Jaringan' -> Penyulang/Section input manual.
   TextWA berjenjang: Material -> Pekerjaan(TextWA Material)
   -> PenyulangGardu(TextWA) -> db_Global_Header(WA Text).
   Konstanta & helper bersama di Code.gs (Inti).
   ===================================================== */

/* --- Nama sheet (ubah di SATU tempat) --- */
var SHEET_HTK = {
  HEADER:    'db_Global_Header',
  PG:        'db_Hartek_PenyulangGardu',
  PEKERJAAN: 'db_Hartek_Pekerjaan',
  MATERIAL:  'db_Hartek_Material',
  HARGROUNDING: 'db_Hartek_HarGrounding',
  PEMERATAAN: 'db_Hartek_PemerataanBeban',
  MASTER_MATERIAL: 'db_Material'
};

/* --- Peta kolom (0-based). Edit di sini bila urutan kolom GSheet berubah. --- */
var COL_HTK = {
  // db_Hartek_PenyulangGardu
  PG: { no:0, kodeHeader:1, kodePG:2, ulp:3, hari:4, tanggal:5,
        jenisPekerjaan:6, penyulang:7, section:8, gardu:9, daerah:10,
        jumlahGawang:11, textWa:12, inputBy:13, timeStamp:14 },
  // db_Hartek_Pekerjaan
  PEKERJAAN: { no:0, kodeHeader:1, kodePG:2, kodePekerjaan:3, ulp:4, hari:5, tanggal:6,
        jenisPekerjaan:7, penyulang:8, section:9, gardu:10, pekerjaan:11,
        jumlahPekerjaan:12, satuanPekerjaan:13, textWaMaterial:14, inputBy:15, timestamp:16 },
  // db_Hartek_Material
  MATERIAL: { no:0, kodeHeader:1, kodePG:2, kodePekerjaan:3, kodeMaterial:4, ulp:5, hari:6, tanggal:7,
        jenisPekerjaan:8, penyulang:9, section:10, gardu:11, pekerjaan:12,
        material:13, jumlah:14, satuan:15, kepemilikan:16, inputBy:17, timestamp:18 },
  // db_Hartek_HarGrounding (sibling Material, anak Pekerjaan)
  HARGROUNDING: { no:0, kodeHeader:1, kodePG:2, kodePekerjaan:3, kodeHarGrounding:4,
        hari:5, tanggal:6, jenisPeralatan:7, namaPeralatan:8, penyulang:9, section:10,
        kondisiTanah:11, hasilSebelum:12, fotoSebelum:13, linkFotoSebelum:14,
        hasilSesudah:15, fotoSesudah:16, linkFotoSesudah:17 },
  // db_Hartek_PemerataanBeban (sibling Material/Grounding, anak Pekerjaan).
  // FILE TERPISAH -> akses WAJIB lewat _shHtkPemerataan(). Dipakai utk jenis pekerjaan
  // 'Pemerataan Beban Trafo' & 'Pembagian Beban Trafo'.
  // Struktur simetris A..AC: tiap fasa (R/S/T) punya trio Nilai / Foto / Link Foto,
  // untuk sisi Sebelum maupun Sesudah.
  PEMERATAAN: { no:0, kodeHeader:1, kodePG:2, kodePekerjaan:3, kodePemerataan:4,
        hari:5, tanggal:6, penyulang:7, section:8, gardu:9, alamat:10,
        sebR:11, fotoSebR:12, linkSebR:13,
        sebS:14, fotoSebS:15, linkSebS:16,
        sebT:17, fotoSebT:18, linkSebT:19,
        sesR:20, fotoSesR:21, linkSesR:22,
        sesS:23, fotoSesS:24, linkSesS:25,
        sesT:26, fotoSesT:27, linkSesT:28 },
  // db_Material (master)
  MASTER_MATERIAL: { no:0, namaMaterial:1 }
};

/* --- Kode berantai Hartek (silsilah tampak dari kode) ---
   Header (db_Global_Header) : HAR-<KodeULP><YYMMDD><NNN>
   Tier-2 PenyulangGardu     : <Header>-PNY.<nnn>  (Jaringan)
                               <Header>-GRD.<nnn>  (Gardu)
                               <Header>-NTK.<nnn>  (Non - Teknik)
   Tier-3 Pekerjaan          : <PG>-PKJ.<nnn>
   Tier-4 Material           : <Pekerjaan>-MAT.<nnn>
   Tier-4 Har Grounding      : <Pekerjaan>-GND.<nnn>
   Tier-4 Pemerataan Beban   : <Pekerjaan>-PMR.<nnn>
   Pemisah '-' antar-tingkat, '.' antara tag & nomor. Nomor anak
   reset per induk. Versi web pakai generator server di bawah;
   versi AppSheet pakai INITIAL VALUE (lihat catatan halaman). */
var HTK_MODUL = 'HAR';
var HTK_TAG   = { PENYULANG:'PNY', GARDU:'GRD', NONTEKNIK:'NTK', PEKERJAAN:'PKJ', MATERIAL:'MAT', GROUNDING:'GND', PEMERATAAN:'PMR' };


/* ===== Helper ===== */
function _ssHtk(){ return SpreadsheetApp.openById(SPREADSHEET_ID); }

// PENTING: db_Hartek_HarGrounding berada di SPREADSHEET TERPISAH (beda file dari
// SPREADSHEET_ID utama). SEMUA akses baris grounding WAJIB lewat helper ini, bukan _ssHtk().
var SPREADSHEET_ID_HTK_GROUNDING = '1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw';
var GID_HTK_GROUNDING = 58573647; // fallback: cari tab via gid bila nama tab berbeda
function _shHtkGrounding(){
  var ssG = SpreadsheetApp.openById(SPREADSHEET_ID_HTK_GROUNDING);
  var sh = ssG.getSheetByName(SHEET_HTK.HARGROUNDING);
  if(sh) return sh;
  var all = ssG.getSheets();
  for(var i=0;i<all.length;i++){ if(all[i].getSheetId() === GID_HTK_GROUNDING) return all[i]; }
  return null;
}

// db_Hartek_PemerataanBeban berada di FILE MASTER yang SAMA dengan grounding.
// SEMUA akses baris pemerataan beban WAJIB lewat helper ini, bukan _ssHtk().
var SPREADSHEET_ID_HTK_PEMERATAAN = SPREADSHEET_ID_HTK_GROUNDING;
// true -> baris pemerataan hanya masuk WA bila kolom Link Foto terkait sudah terisi
// (pola sama dgn grounding: cegah laporan terkirim sebelum bukti foto lengkap).
var HTK_PMR_WAJIB_LINK = true;
// true -> baris WAJIB lengkap 3 fasa di KEDUA sisi (Sebelum R/S/T & Sesudah R/S/T)
// beserta 6 Link Foto-nya. Laporan pemerataan tidak bermakna bila salah satu sisi
// belum diukur, jadi baris setengah-jadi ditahan dulu (tidak masuk WA).
// Set false utk mode longgar: sisi yg terisi saja yang dicetak & divalidasi link-nya.
var HTK_PMR_WAJIB_LENGKAP = true;
function _shHtkPemerataan(){
  return SpreadsheetApp.openById(SPREADSHEET_ID_HTK_PEMERATAAN)
           .getSheetByName(SHEET_HTK.PEMERATAAN);
}

// Objek Gardu = setiap Jenis Pekerjaan yang BUKAN 'Jaringan' (mis. 'Pemeliharaan
// Gardu', 'Non - Teknik', dll). Dipakai utk auto-fill GARDU_MASTER & layout WA.
function _htkIsGardu(jenis){
  return String(jenis||'').trim().toLowerCase() !== 'jaringan';
}

// Tag tier-2 kode PenyulangGardu dari Jenis Pekerjaan:
//   'Jaringan' -> PNY ; 'Non - Teknik' -> NTK ; selain itu (Gardu) -> GRD.
function _htkTagPg(jenis){
  var j = String(jenis||'').trim().toLowerCase();
  if(j === 'jaringan') return HTK_TAG.PENYULANG;
  if(j.indexOf('non') >= 0 && j.indexOf('teknik') >= 0) return HTK_TAG.NONTEKNIK;
  return HTK_TAG.GARDU;
}

// Cari nomor baris fisik (1-based) berdasarkan kode pada kolom tertentu; -1 bila tak ada.
function _htkFindRow(sh, colIdx, kode){
  if(!sh) return -1;
  var key = String(kode||'').trim();
  if(!key) return -1;
  var data = sh.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(String(data[i][colIdx]||'').trim()===key) return i+1;
  }
  return -1;
}

// Format tanggal -> YYMMDD (memakai _normTgl: 'YYYY-MM-DD').
function _htkYmd(tanggal){
  var p = _normTgl(tanggal).split('-');
  return (p.length<3) ? '' : (p[0].slice(-2) + p[1] + p[2]);
}

// Hitung baris yang kodenya diawali prefix tertentu (pada kolom colIdx).
function _htkCountPrefix(sh, colIdx, prefix){
  var n = 0;
  if(sh && prefix){
    var data = sh.getDataRange().getValues();
    for(var i=1;i<data.length;i++){
      if(String(data[i][colIdx]||'').indexOf(prefix)===0) n++;
    }
  }
  return n;
}
function _htk3(n){ return ('00'+n).slice(-3); }

// === GENERATOR KODE BERANTAI (server-side, untuk input versi web) ===
// Header: HAR-<KodeULP><YYMMDD><NNN> (urut harian per-ULP; kolom Kode Header db_Global_Header).
function _genKodeHeaderHartek(kodeUlp, tanggal){
  var base = HTK_MODUL + '-' + String(kodeUlp||'').trim() + _htkYmd(tanggal);
  var sh   = _ssHtk().getSheetByName(SHEET_HTK.HEADER);
  return base + _htk3(_htkCountPrefix(sh, COL_INS.HEADER.kodeHeader, base) + 1);
}

// Tier-2 PenyulangGardu: <Header>-PNY.<nnn> (Jaringan) | <Header>-GRD.<nnn> (Gardu)
//                        | <Header>-NTK.<nnn> (Non - Teknik).
function _genKodePgHartek(kodeHeader, jenisPekerjaan){
  var tag    = _htkTagPg(jenisPekerjaan);
  var prefix = String(kodeHeader||'').trim() + '-' + tag + '.';
  var sh     = _ssHtk().getSheetByName(SHEET_HTK.PG);
  return prefix + _htk3(_htkCountPrefix(sh, COL_HTK.PG.kodePG, prefix) + 1);
}

// Tier-3 Pekerjaan: <PG>-PKJ.<nnn>.
function _genKodePekerjaanHartek(kodePG){
  var prefix = String(kodePG||'').trim() + '-' + HTK_TAG.PEKERJAAN + '.';
  var sh     = _ssHtk().getSheetByName(SHEET_HTK.PEKERJAAN);
  return prefix + _htk3(_htkCountPrefix(sh, COL_HTK.PEKERJAAN.kodePekerjaan, prefix) + 1);
}

// Tier-4 Material: <Pekerjaan>-MAT.<nnn>.
function _genKodeMaterialHartek(kodePekerjaan){
  var prefix = String(kodePekerjaan||'').trim() + '-' + HTK_TAG.MATERIAL + '.';
  var sh     = _ssHtk().getSheetByName(SHEET_HTK.MATERIAL);
  return prefix + _htk3(_htkCountPrefix(sh, COL_HTK.MATERIAL.kodeMaterial, prefix) + 1);
}

// Tier-4 Har Grounding (sibling Material): <Pekerjaan>-GND.<nnn>.
function _genKodeHarGroundingHartek(kodePekerjaan){
  var prefix = String(kodePekerjaan||'').trim() + '-' + HTK_TAG.GROUNDING + '.';
  var sh     = _shHtkGrounding();   // grounding di file terpisah (SPREADSHEET_ID_HTK_GROUNDING)
  return prefix + _htk3(_htkCountPrefix(sh, COL_HTK.HARGROUNDING.kodeHarGrounding, prefix) + 1);
}

// Tier-4 Pemerataan/Pembagian Beban (sibling Material): <Pekerjaan>-PMR.<nnn>.
function _genKodePemerataanBebanHartek(kodePekerjaan){
  var prefix = String(kodePekerjaan||'').trim() + '-' + HTK_TAG.PEMERATAAN + '.';
  var sh     = _shHtkPemerataan();  // pemerataan di file terpisah (SPREADSHEET_ID_HTK_PEMERATAAN)
  return prefix + _htk3(_htkCountPrefix(sh, COL_HTK.PEMERATAAN.kodePemerataan, prefix) + 1);
}

// Dropdown nama material dari master db_Material.
function getListMaterialHartek(){
  try{
    var sh = _ssHtk().getSheetByName(SHEET_HTK.MASTER_MATERIAL);
    if(!sh) return { ok:true, list:[] };
    var data = sh.getDataRange().getValues();
    var set = {};
    for(var i=1;i<data.length;i++){
      var nm = String(data[i][COL_HTK.MASTER_MATERIAL.namaMaterial]||'').trim();
      if(nm) set[nm]=true;
    }
    return { ok:true, list:Object.keys(set).sort() };
  }catch(e){ return { ok:false, message:e.message, list:[] }; }
}


/* ===== PENGECEKAN BARIS db_Hartek_PenyulangGardu ===== */
// 1 fungsi, 2 pengecekan saat baris PenyulangGardu ditambah/diubah:
//  (1) Jenis Pekerjaan = 'Jaringan' -> Nomor Gardu dikosongkan.
//  (2) Jenis Pekerjaan <> 'Jaringan' (mis. 'Pemeliharaan Gardu', 'Non - Teknik', dll)
//      -> objek Gardu: ambil Penyulang (GARDU_MASTER kolom E) & Section (kolom F)
//      berdasarkan Nomor Gardu, lalu tulis ke baris.
// Pencocokan PERSIS 'jaringan' (case-insensitive). Semua Jenis Pekerjaan SELAIN
// 'Jaringan' diperlakukan sebagai pekerjaan Gardu (termasuk 'Non - Teknik').
function cekBarisHartekPG(kodePG){
  try{
    var ss = _ssHtk();
    var sh = ss.getSheetByName(SHEET_HTK.PG);
    var C  = COL_HTK.PG;
    var row = _htkFindRow(sh, C.kodePG, kodePG);
    if(row<0) return { ok:false, message:'Baris PenyulangGardu tidak ditemukan: '+kodePG };

    var vals  = sh.getRange(row, 1, 1, C.timeStamp+1).getValues()[0];
    var jenis = String(vals[C.jenisPekerjaan]||'').trim();
    var isJaringan = (jenis.toLowerCase() === 'jaringan');  // pencocokan PERSIS '= Jaringan'

    if(isJaringan){
      // (1) Jaringan -> hapus Nomor Gardu bila terisi.
      if(String(vals[C.gardu]||'').trim() !== ''){
        sh.getRange(row, C.gardu+1).setValue('');
      }
      return { ok:true, kodePG:kodePG, mode:'jaringan', garduDihapus:true };
    }

    // (2) Gardu -> lookup Penyulang (kolom E) & Section (kolom F) di GARDU_MASTER.
    var nomorGardu = String(vals[C.gardu]||'').trim();
    var g = nomorGardu ? _findGarduByNomor(nomorGardu) : null;
    if(g){
      sh.getRange(row, C.penyulang+1).setValue(g.penyulang||'');  // GARDU_MASTER kolom E
      sh.getRange(row, C.section+1).setValue(g.section||'');      // GARDU_MASTER kolom F
    }
    return { ok:true, kodePG:kodePG, mode:'gardu', ditemukan:!!g };
  }catch(e){ return { ok:false, message:e.message }; }
}


/* ===== AUTO-FILL per level (dipanggil bot AppSheet via doPost) ===== */

// db_Hartek_PenyulangGardu: isi ULP/Hari/Tanggal dari header; bila objek=Gardu,
// isi Penyulang/Section/Daerah dari GARDU_MASTER. Lalu rebuild WA header.
function prosesHartekPG(kodePG){
  try{
    var ss = _ssHtk();
    var sh = ss.getSheetByName(SHEET_HTK.PG);
    var C  = COL_HTK.PG;
    var row = _htkFindRow(sh, C.kodePG, kodePG);
    if(row<0) return { ok:false, message:'Baris PenyulangGardu tidak ditemukan: '+kodePG };
    var vals = sh.getRange(row, 1, 1, C.timeStamp+1).getValues()[0];

    var kodeHeader = String(vals[C.kodeHeader]||'').trim();
    var header = kodeHeader ? _getHeaderInsByKode(ss, kodeHeader) : null;
    if(header){
      sh.getRange(row, C.ulp+1).setValue(header.ulp||'');
      sh.getRange(row, C.hari+1).setValue(header.hari||_hariFromTanggal(header.tanggal));
      sh.getRange(row, C.tanggal+1).setValue(_normTgl(header.tanggal));
    }

    // Auto-fill dari GARDU_MASTER bila objek = Gardu.
    if(_htkIsGardu(vals[C.jenisPekerjaan])){
      var nomorGardu = String(vals[C.gardu]||'').trim();
      var g = nomorGardu ? _findGarduByNomor(nomorGardu) : null;
      if(g){
        sh.getRange(row, C.penyulang+1).setValue(g.penyulang||'');
        sh.getRange(row, C.section+1).setValue(g.section||'');
        sh.getRange(row, C.daerah+1).setValue(g.alamat||'');   // Daerah Pekerjaan = alamat gardu (master)
      }
    }

    // Jaringan -> pastikan Nomor Gardu kosong (autofill Gardu hanya utk objek Gardu).
    if(!_htkIsGardu(vals[C.jenisPekerjaan]) && String(vals[C.gardu]||'').trim() !== ''){
      sh.getRange(row, C.gardu+1).setValue('');
    }
    if(kodeHeader) recalcWaHartek_(ss, kodeHeader);
    return { ok:true, kodePG:kodePG };
  }catch(e){ return { ok:false, message:e.message }; }
}

// db_Hartek_Pekerjaan: warisi konteks dari parent PenyulangGardu. Lalu rebuild WA header.
function prosesHartekPekerjaan(kodePekerjaan){
  try{
    var ss = _ssHtk();
    var sh = ss.getSheetByName(SHEET_HTK.PEKERJAAN);
    var C  = COL_HTK.PEKERJAAN;
    var row = _htkFindRow(sh, C.kodePekerjaan, kodePekerjaan);
    if(row<0) return { ok:false, message:'Baris Pekerjaan tidak ditemukan: '+kodePekerjaan };
    var vals = sh.getRange(row, 1, 1, C.timestamp+1).getValues()[0];
    var kodePG = String(vals[C.kodePG]||'').trim();

    var shPG = ss.getSheetByName(SHEET_HTK.PG);
    var PG = COL_HTK.PG;
    var rPG = _htkFindRow(shPG, PG.kodePG, kodePG);
    var kodeHeader = '';
    if(rPG>0){
      var pg = shPG.getRange(rPG, 1, 1, PG.timeStamp+1).getValues()[0];
      kodeHeader = String(pg[PG.kodeHeader]||'').trim();
      sh.getRange(row, C.kodeHeader+1).setValue(kodeHeader);
      sh.getRange(row, C.ulp+1).setValue(pg[PG.ulp]||'');
      sh.getRange(row, C.hari+1).setValue(pg[PG.hari]||'');
      sh.getRange(row, C.tanggal+1).setValue(pg[PG.tanggal]||'');
      sh.getRange(row, C.jenisPekerjaan+1).setValue(pg[PG.jenisPekerjaan]||'');
      sh.getRange(row, C.penyulang+1).setValue(pg[PG.penyulang]||'');
      sh.getRange(row, C.section+1).setValue(pg[PG.section]||'');
      sh.getRange(row, C.gardu+1).setValue(pg[PG.gardu]||'');
    }
    if(kodeHeader) recalcWaHartek_(ss, kodeHeader);
    return { ok:true, kodePekerjaan:kodePekerjaan };
  }catch(e){ return { ok:false, message:e.message }; }
}

// db_Hartek_Material: warisi konteks dari parent Pekerjaan. Lalu rebuild WA header.
function prosesHartekMaterial(kodeMaterial){
  try{
    var ss = _ssHtk();
    var sh = ss.getSheetByName(SHEET_HTK.MATERIAL);
    var C  = COL_HTK.MATERIAL;
    var row = _htkFindRow(sh, C.kodeMaterial, kodeMaterial);
    if(row<0) return { ok:false, message:'Baris Material tidak ditemukan: '+kodeMaterial };
    var vals = sh.getRange(row, 1, 1, C.timestamp+1).getValues()[0];
    var kodePekerjaan = String(vals[C.kodePekerjaan]||'').trim();

    var shPK = ss.getSheetByName(SHEET_HTK.PEKERJAAN);
    var PK = COL_HTK.PEKERJAAN;
    var rPK = _htkFindRow(shPK, PK.kodePekerjaan, kodePekerjaan);
    var kodeHeader = '';
    if(rPK>0){
      var pk = shPK.getRange(rPK, 1, 1, PK.timestamp+1).getValues()[0];
      kodeHeader = String(pk[PK.kodeHeader]||'').trim();
      sh.getRange(row, C.kodeHeader+1).setValue(kodeHeader);
      sh.getRange(row, C.kodePG+1).setValue(pk[PK.kodePG]||'');
      sh.getRange(row, C.ulp+1).setValue(pk[PK.ulp]||'');
      sh.getRange(row, C.hari+1).setValue(pk[PK.hari]||'');
      sh.getRange(row, C.tanggal+1).setValue(pk[PK.tanggal]||'');
      sh.getRange(row, C.jenisPekerjaan+1).setValue(pk[PK.jenisPekerjaan]||'');
      sh.getRange(row, C.penyulang+1).setValue(pk[PK.penyulang]||'');
      sh.getRange(row, C.section+1).setValue(pk[PK.section]||'');
      sh.getRange(row, C.gardu+1).setValue(pk[PK.gardu]||'');
      sh.getRange(row, C.pekerjaan+1).setValue(pk[PK.pekerjaan]||'');
    }
    if(kodeHeader) recalcWaHartek_(ss, kodeHeader);
    return { ok:true, kodeMaterial:kodeMaterial };
  }catch(e){ return { ok:false, message:e.message }; }
}

// db_Hartek_HarGrounding: warisi konteks (Kode Header/PG, Penyulang, Section) dari
// parent Pekerjaan. Lalu rebuild WA header. Foto/Link foto tidak disentuh di sini.
function prosesHartekHarGrounding(kodeHarGrounding){
  try{
    var ss = _ssHtk();
    var sh = _shHtkGrounding();   // grounding di file terpisah (SPREADSHEET_ID_HTK_GROUNDING)
    var C  = COL_HTK.HARGROUNDING;
    var row = _htkFindRow(sh, C.kodeHarGrounding, kodeHarGrounding);
    if(row<0) return { ok:false, message:'Baris Har Grounding tidak ditemukan: '+kodeHarGrounding };
    var vals = sh.getRange(row, 1, 1, C.linkFotoSesudah+1).getValues()[0];
    var kodePekerjaan = String(vals[C.kodePekerjaan]||'').trim();

    var shPK = ss.getSheetByName(SHEET_HTK.PEKERJAAN);
    var PK = COL_HTK.PEKERJAAN;
    var rPK = _htkFindRow(shPK, PK.kodePekerjaan, kodePekerjaan);
    var kodeHeader = '';
    if(rPK>0){
      var pk = shPK.getRange(rPK, 1, 1, PK.timestamp+1).getValues()[0];
      kodeHeader = String(pk[PK.kodeHeader]||'').trim();
      sh.getRange(row, C.kodeHeader+1).setValue(kodeHeader);
      sh.getRange(row, C.kodePG+1).setValue(pk[PK.kodePG]||'');
      sh.getRange(row, C.hari+1).setValue(pk[PK.hari]||'');
      sh.getRange(row, C.tanggal+1).setValue(pk[PK.tanggal]||'');
      sh.getRange(row, C.penyulang+1).setValue(pk[PK.penyulang]||'');
      sh.getRange(row, C.section+1).setValue(pk[PK.section]||'');
    }
    if(kodeHeader) recalcWaHartek_(ss, kodeHeader);
    return { ok:true, kodeHarGrounding:kodeHarGrounding };
  }catch(e){ return { ok:false, message:e.message }; }
}

// db_Hartek_PemerataanBeban: warisi konteks (Kode Header/PG, Hari, Tanggal, Penyulang,
// Section, Nomor Gardu, Alamat) dari parent Pekerjaan. Alamat diambil dari 'Daerah
// Pekerjaan' baris PG induk, fallback alamat GARDU_MASTER. Nilai beban & foto tidak
// disentuh di sini. Lalu rebuild WA header.
function prosesHartekPemerataanBeban(kodePemerataan){
  try{
    var ss = _ssHtk();
    var sh = _shHtkPemerataan();   // pemerataan di file terpisah (SPREADSHEET_ID_HTK_PEMERATAAN)
    var C  = COL_HTK.PEMERATAAN;
    var row = _htkFindRow(sh, C.kodePemerataan, kodePemerataan);
    if(row<0) return { ok:false, message:'Baris Pemerataan Beban tidak ditemukan: '+kodePemerataan };
    var vals = sh.getRange(row, 1, 1, C.linkSesT+1).getValues()[0];
    var kodePekerjaan = String(vals[C.kodePekerjaan]||'').trim();

    var shPK = ss.getSheetByName(SHEET_HTK.PEKERJAAN);
    var PK = COL_HTK.PEKERJAAN;
    var rPK = _htkFindRow(shPK, PK.kodePekerjaan, kodePekerjaan);
    var kodeHeader = '';
    if(rPK>0){
      var pk = shPK.getRange(rPK, 1, 1, PK.timestamp+1).getValues()[0];
      kodeHeader = String(pk[PK.kodeHeader]||'').trim();
      var kodePG = String(pk[PK.kodePG]||'').trim();
      sh.getRange(row, C.kodeHeader+1).setValue(kodeHeader);
      sh.getRange(row, C.kodePG+1).setValue(kodePG);
      sh.getRange(row, C.hari+1).setValue(pk[PK.hari]||'');
      sh.getRange(row, C.tanggal+1).setValue(pk[PK.tanggal]||'');
      sh.getRange(row, C.penyulang+1).setValue(pk[PK.penyulang]||'');
      sh.getRange(row, C.section+1).setValue(pk[PK.section]||'');
      sh.getRange(row, C.gardu+1).setValue(pk[PK.gardu]||'');

      // Alamat = Daerah Pekerjaan pada baris PG induk; fallback alamat GARDU_MASTER.
      var alamat = '';
      var shPG = ss.getSheetByName(SHEET_HTK.PG), PG = COL_HTK.PG;
      var rPG = kodePG ? _htkFindRow(shPG, PG.kodePG, kodePG) : -1;
      if(rPG>0) alamat = String(shPG.getRange(rPG, PG.daerah+1).getValue()||'').trim();
      if(!alamat){
        var nomorGardu = String(pk[PK.gardu]||'').trim();
        var gm = nomorGardu ? _findGarduByNomor(nomorGardu) : null;
        if(gm) alamat = String(gm.alamat||'').trim();
      }
      if(alamat) sh.getRange(row, C.alamat+1).setValue(alamat);
    }
    if(kodeHeader) recalcWaHartek_(ss, kodeHeader);
    return { ok:true, kodePemerataan:kodePemerataan };
  }catch(e){ return { ok:false, message:e.message }; }
}


/* ===== BUILDER WA (berjenjang) + PLUGIN WA ENGINE ===== */

// Teks satu baris material: '> Nama : jumlah satuan (kepemilikan)'.
function _htkTeksMaterial(mtRow){
  var C = COL_HTK.MATERIAL;
  var nama = String(mtRow[C.material]||'').trim();
  if(!nama) return '';
  var jml = String(mtRow[C.jumlah]||'').trim();
  var sat = String(mtRow[C.satuan]||'').trim();
  var kep = String(mtRow[C.kepemilikan]||'').trim();
  var s = '> ' + nama;
  if(jml) s += ' : ' + jml + (sat ? ' ' + sat : '');
  if(kep) s += ' (' + kep + ')';
  return s;
}

// Blok WA "Hasil Pengukuran Grounding" per pekerjaan (dikumpulkan lalu ditaruh
// di AKHIR blok gardu, terpisah baris kosong — perakitan di recalcWaHartek_).
// Format tergantung KATA pada nama pekerjaan:
//   mengandung 'perbaikan'  -> Hasil Pengukuran Grounding: / - Sebelum : xΩ / - Sesudah : xΩ
//   mengandung 'pemasangan' -> Hasil Pengukuran Grounding : xΩ (nilai tunggal = Sesudah, fallback Sebelum)
//   selain itu (fallback)   -> ada 2 nilai -> gaya perbaikan; 1 nilai -> gaya pemasangan.
// SYARAT LINK FOTO (per mode): pemasangan -> WAJIB Link Foto Sesudah saja;
// perbaikan -> WAJIB Link Foto Sebelum & Sesudah. Bila syarat tak terpenuhi, baris
// tsb dilewati (tidak masuk WA). Baris tanpa nilai (Sebelum & Sesudah kosong) juga dilewati.
function _htkTeksGrounding(namaPekerjaan, grRows){
  if(!grRows || !grRows.length) return [];
  var GR = COL_HTK.HARGROUNDING;
  var nm = String(namaPekerjaan||'').toLowerCase();
  var isPerbaikan  = (nm.indexOf('perbaikan')  >= 0);
  var isPemasangan = (nm.indexOf('pemasangan') >= 0);
  var out = [];
  for(var i=0;i<grRows.length;i++){
    var r = grRows[i];
    // Nilai & mode ditentukan DULU karena mode menentukan syarat link foto di bawah.
    var linkSeb = String(r[GR.linkFotoSebelum]||'').trim();
    var linkSes = String(r[GR.linkFotoSesudah]||'').trim();
    var seb = String(r[GR.hasilSebelum]||'').trim();
    var ses = String(r[GR.hasilSesudah]||'').trim();
    if(!seb && !ses) continue;
    var mode = isPerbaikan ? 'perbaikan'
             : (isPemasangan ? 'pemasangan'
             : ((seb && ses) ? 'perbaikan' : 'pemasangan'));
    // Syarat Link Foto per mode:
    //   pemasangan -> WAJIB Link Foto Sesudah saja (Sebelum boleh kosong).
    //   perbaikan  -> WAJIB Link Foto Sebelum & Sesudah (dua-duanya).
    if(mode === 'pemasangan'){
      if(!linkSes) continue;
    } else {
      if(!linkSeb || !linkSes) continue;
    }
    if(mode === 'perbaikan'){
      out.push('Hasil Pengukuran Grounding:');
      out.push('- Sebelum : ' + (seb || '-') + 'Ω');
      out.push('- Sesudah : ' + (ses || '-') + 'Ω');
    } else {
      out.push('Hasil Pengukuran Grounding : ' + (ses || seb) + 'Ω');
    }
  }
  return out;
}

// Blok WA "Hasil Pengukuran Beban Trafo" per pekerjaan — dipakai jenis pekerjaan
// 'Pemerataan Beban Trafo' & 'Pembagian Beban Trafo' (sumber: db_Hartek_PemerataanBeban).
// Ditaruh di AKHIR blok objek, SETELAH blok grounding, terpisah satu baris kosong
// (perakitan di recalcWaHartek_). Format:
//   Hasil Pengukuran Beban Trafo:
//   - Sebelum : R 120 A | S 95 A | T 140 A
//   - Sesudah : R 118 A | S 116 A | T 121 A
// Bila satu pekerjaan punya >1 baris (mis. beberapa gardu), judul diberi keterangan
// gardu: 'Hasil Pengukuran Beban Trafo (Gardu XXX):'.
// GERBANG PEMROSESAN (baris yang tidak lolos DILEWATI, tidak masuk WA sama sekali):
//   1. Baris tanpa nilai sama sekali (Sebelum & Sesudah kosong).
//   2. HTK_PMR_WAJIB_LENGKAP = true -> nilai wajib lengkap 6 (Sebelum R/S/T & Sesudah R/S/T).
//   3. HTK_PMR_WAJIB_LINK = true    -> 6 kolom Link Foto wajib terisi semua. Bila
//      HTK_PMR_WAJIB_LENGKAP = false, hanya sisi yang nilainya terisi yang dicek.
// Baris yang tertahan BUKAN error: backstop refreshWaHarian (tiap 15 menit) menyapu
// ulang header, jadi begitu Link Foto muncul, blok beban otomatis ikut tercetak.
// Helper _v() tetap toleran indeks -1 agar aman bila kelak ada kolom yang ditiadakan.
function _htkTeksBeban(namaPekerjaan, pbRows){
  if(!pbRows || !pbRows.length) return [];
  var P = COL_HTK.PEMERATAAN;
  function _v(r, idx){ return (idx>=0) ? String(r[idx]||'').trim() : ''; }
  function _trio(a,b,c){
    return 'R ' + (a ? a+' A' : '-') +
         ' | S ' + (b ? b+' A' : '-') +
         ' | T ' + (c ? c+' A' : '-');
  }
  var out = [];
  for(var i=0;i<pbRows.length;i++){
    var r = pbRows[i];
    var sebR=_v(r,P.sebR), sebS=_v(r,P.sebS), sebT=_v(r,P.sebT);
    var sesR=_v(r,P.sesR), sesS=_v(r,P.sesS), sesT=_v(r,P.sesT);
    var adaSeb = !!(sebR || sebS || sebT);
    var adaSes = !!(sesR || sesS || sesT);
    if(!adaSeb && !adaSes) continue;

    // (2) Kelengkapan NILAI: pemerataan wajib punya pembanding Sebelum & Sesudah.
    if(HTK_PMR_WAJIB_LENGKAP && !(sebR && sebS && sebT && sesR && sesS && sesT)) continue;

    // (3) Kelengkapan LINK FOTO: bukti foto wajib ada sebelum laporan diproses ke WA.
    if(HTK_PMR_WAJIB_LINK){
      var kolomLink = [P.linkSebR, P.linkSebS, P.linkSebT, P.linkSesR, P.linkSesS, P.linkSesT];
      if(!HTK_PMR_WAJIB_LENGKAP){        // mode longgar: cek hanya sisi yang nilainya terisi
        kolomLink = [];
        if(adaSeb) kolomLink.push(P.linkSebR, P.linkSebS, P.linkSebT);
        if(adaSes) kolomLink.push(P.linkSesR, P.linkSesS, P.linkSesT);
      }
      var lengkap = true;
      for(var k=0;k<kolomLink.length;k++){
        if(kolomLink[k] < 0) continue;   // kolom Link tak ada di sheet -> tak divalidasi
        if(!String(r[kolomLink[k]]||'').trim()){ lengkap = false; break; }
      }
      if(!lengkap) continue;
    }

    var gar = _v(r, P.gardu);
    out.push('Hasil Pengukuran Beban Trafo' + ((pbRows.length>1 && gar) ? (' (Gardu '+gar+')') : '') + ':');
    if(adaSeb) out.push('- Sebelum : ' + _trio(sebR, sebS, sebT));
    if(adaSes) out.push('- Sesudah : ' + _trio(sesR, sesS, sesT));
  }
  return out;
}

// KONTRAK WA ENGINE: recalc(ss, kodeHeader) -> hitung ulang child + tulis WA Text header.
// Cascade: tulis TextWA Material (Pekerjaan) -> TextWA (PenyulangGardu) -> WA Text (db_Global_Header).
function recalcWaHartek_(ss, kodeHeader){
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  var key = String(kodeHeader||'').trim();
  if(!key) return;
  var header = _getHeaderInsByKode(ss, key);
  if(!header) return;

  var PG=COL_HTK.PG, PK=COL_HTK.PEKERJAAN, MT=COL_HTK.MATERIAL, GR=COL_HTK.HARGROUNDING, PB=COL_HTK.PEMERATAAN;
  var shPG=ss.getSheetByName(SHEET_HTK.PG);
  var shPK=ss.getSheetByName(SHEET_HTK.PEKERJAAN);
  var shMT=ss.getSheetByName(SHEET_HTK.MATERIAL);
  var shGR=_shHtkGrounding();   // grounding di file TERPISAH (SPREADSHEET_ID_HTK_GROUNDING)
  var shPB=_shHtkPemerataan();  // pemerataan beban di file TERPISAH (SPREADSHEET_ID_HTK_PEMERATAAN)
  var pgData = shPG ? shPG.getDataRange().getValues() : [];
  var pkData = shPK ? shPK.getDataRange().getValues() : [];
  var mtData = shMT ? shMT.getDataRange().getValues() : [];
  var grData = shGR ? shGR.getDataRange().getValues() : [];
  var pbData = shPB ? shPB.getDataRange().getValues() : [];

  // ── PRE-PASS: resolusi Penyulang/Section/Daerah per kodePG. Objek Gardu yg
  //    kolomnya kosong di-lookup LIVE dari GARDU_MASTER, lalu DISINKRON balik ke
  //    baris PG. Map pgResolved dipakai utk sinkron kolom Penyulang/Section/Gardu
  //    di db_Hartek_Pekerjaan & db_Hartek_Material (silsilah ikut header).
  var pgResolved = {};
  for(var gi=1;gi<pgData.length;gi++){
    if(String(pgData[gi][PG.kodeHeader]||'').trim()!==key) continue;
    var kpgR = String(pgData[gi][PG.kodePG]||'').trim();
    if(!kpgR) continue;
    var penR = String(pgData[gi][PG.penyulang]||'').trim();
    var secR = String(pgData[gi][PG.section]||'').trim();
    var garR = String(pgData[gi][PG.gardu]||'').trim();
    var daeR = String(pgData[gi][PG.daerah]||'').trim();
    if(garR && (!penR || !secR || !daeR)){
      var gmR = _findGarduByNomor(garR);
      if(gmR){
        if(!penR) penR = String(gmR.penyulang||'').trim();
        if(!secR) secR = String(gmR.section||'').trim();
        if(!daeR) daeR = String(gmR.alamat||'').trim();
      }
    }
    if(penR && String(pgData[gi][PG.penyulang]||'').trim()!==penR){ shPG.getRange(gi+1, PG.penyulang+1).setValue(penR); pgData[gi][PG.penyulang]=penR; }
    if(secR && String(pgData[gi][PG.section]||'').trim()!==secR){ shPG.getRange(gi+1, PG.section+1).setValue(secR); pgData[gi][PG.section]=secR; }
    if(daeR && String(pgData[gi][PG.daerah]||'').trim()!==daeR){ shPG.getRange(gi+1, PG.daerah+1).setValue(daeR); pgData[gi][PG.daerah]=daeR; }
    pgResolved[kpgR] = { pen:penR, sec:secR, gar:garR, dae:daeR };
  }

  // Index material per kodePekerjaan (hanya header ini) + SINKRON Penyulang/Section/
  // Gardu material dari PG induk (pgResolved).
  var matByPk = {};
  for(var m=1;m<mtData.length;m++){
    if(String(mtData[m][MT.kodeHeader]||'').trim()!==key) continue;
    var kp = String(mtData[m][MT.kodePekerjaan]||'').trim();
    if(!kp) continue;
    var mInfo = pgResolved[String(mtData[m][MT.kodePG]||'').trim()] || null;
    if(mInfo){
      if(mInfo.pen && String(mtData[m][MT.penyulang]||'').trim()!==mInfo.pen){ shMT.getRange(m+1, MT.penyulang+1).setValue(mInfo.pen); }
      if(mInfo.sec && String(mtData[m][MT.section]||'').trim()!==mInfo.sec){ shMT.getRange(m+1, MT.section+1).setValue(mInfo.sec); }
      if(mInfo.gar && String(mtData[m][MT.gardu]||'').trim()!==mInfo.gar){ shMT.getRange(m+1, MT.gardu+1).setValue(mInfo.gar); }
    }
    (matByPk[kp] || (matByPk[kp]=[])).push(mtData[m]);
  }

  // Set kodePekerjaan milik header ini (dari baris Pekerjaan yg SUDAH ber-Kode Header benar).
  // Dipakai agar grounding tetap terhubung ke header walau bot prosesHartekHarGrounding BELUM
  // mengisi Kode Header / Kode PG pada baris grounding (diisi AppSheet belakangan).
  var pkCodesHdr = {};
  for(var pc=1;pc<pkData.length;pc++){
    if(String(pkData[pc][PK.kodeHeader]||'').trim()!==key) continue;
    var kpc = String(pkData[pc][PK.kodePekerjaan]||'').trim();
    if(kpc) pkCodesHdr[kpc] = true;
  }

  // Index grounding per kodePekerjaan (header ini) + SINKRON Penyulang/Section dari PG induk.
  // COCOK ke header via Kode Pekerjaan (SELALU terisi saat input) ATAU Kode Header grounding —
  // jadi TIDAK bergantung pada Kode Header/Kode PG grounding yg diisi bot belakangan. Inilah yang
  // membuat "Hasil Pengukuran Grounding" tetap muncul walau bot belum sempat mengisi silsilah.
  var grByPk = {};
  for(var gg=1;gg<grData.length;gg++){
    var kpGr = String(grData[gg][GR.kodePekerjaan]||'').trim();
    if(!kpGr) continue;
    if(String(grData[gg][GR.kodeHeader]||'').trim()!==key && !pkCodesHdr[kpGr]) continue;
    var grInfo = pgResolved[String(grData[gg][GR.kodePG]||'').trim()] || null;
    if(grInfo){
      if(grInfo.pen && String(grData[gg][GR.penyulang]||'').trim()!==grInfo.pen){ shGR.getRange(gg+1, GR.penyulang+1).setValue(grInfo.pen); }
      if(grInfo.sec && String(grData[gg][GR.section]||'').trim()!==grInfo.sec){ shGR.getRange(gg+1, GR.section+1).setValue(grInfo.sec); }
    }
    (grByPk[kpGr] || (grByPk[kpGr]=[])).push(grData[gg]);
  }

  // Index pemerataan/pembagian beban per kodePekerjaan (header ini) + SINKRON Penyulang/
  // Section/Nomor Gardu/Alamat dari PG induk. Pola pencocokan SAMA dgn grounding: lewat
  // Kode Pekerjaan (selalu terisi saat input) ATAU Kode Header — jadi blok beban tetap
  // muncul walau bot prosesHartekPemerataanBeban belum sempat mengisi silsilah.
  var pbByPk = {};
  for(var bb=1;bb<pbData.length;bb++){
    var kpPb = String(pbData[bb][PB.kodePekerjaan]||'').trim();
    if(!kpPb) continue;
    if(String(pbData[bb][PB.kodeHeader]||'').trim()!==key && !pkCodesHdr[kpPb]) continue;
    var pbInfo = pgResolved[String(pbData[bb][PB.kodePG]||'').trim()] || null;
    if(pbInfo && shPB){
      if(pbInfo.pen && String(pbData[bb][PB.penyulang]||'').trim()!==pbInfo.pen){ shPB.getRange(bb+1, PB.penyulang+1).setValue(pbInfo.pen); }
      if(pbInfo.sec && String(pbData[bb][PB.section]||'').trim()!==pbInfo.sec){ shPB.getRange(bb+1, PB.section+1).setValue(pbInfo.sec); }
      if(pbInfo.gar && String(pbData[bb][PB.gardu]||'').trim()!==pbInfo.gar){ shPB.getRange(bb+1, PB.gardu+1).setValue(pbInfo.gar); }
      if(pbInfo.dae && String(pbData[bb][PB.alamat]||'').trim()!==pbInfo.dae){ shPB.getRange(bb+1, PB.alamat+1).setValue(pbInfo.dae); }
    }
    (pbByPk[kpPb] || (pbByPk[kpPb]=[])).push(pbData[bb]);
  }

  // Pekerjaan per kodePG + tulis TextWA Material per pekerjaan.
  var pkByPg = {};
  for(var p=1;p<pkData.length;p++){
    if(String(pkData[p][PK.kodeHeader]||'').trim()!==key) continue;
    var kpg  = String(pkData[p][PK.kodePG]||'').trim();
    var kpek = String(pkData[p][PK.kodePekerjaan]||'').trim();
    // SINKRON Penyulang/Section/Gardu pekerjaan dari PG induk (pgResolved).
    var pkInfo = pgResolved[kpg] || null;
    if(pkInfo){
      if(pkInfo.pen && String(pkData[p][PK.penyulang]||'').trim()!==pkInfo.pen){ shPK.getRange(p+1, PK.penyulang+1).setValue(pkInfo.pen); }
      if(pkInfo.sec && String(pkData[p][PK.section]||'').trim()!==pkInfo.sec){ shPK.getRange(p+1, PK.section+1).setValue(pkInfo.sec); }
      if(pkInfo.gar && String(pkData[p][PK.gardu]||'').trim()!==pkInfo.gar){ shPK.getRange(p+1, PK.gardu+1).setValue(pkInfo.gar); }
    }
    var mats = matByPk[kpek] || [];
    var lines = [];
    for(var mm=0;mm<mats.length;mm++){ var t=_htkTeksMaterial(mats[mm]); if(t) lines.push(t); }
    var textMat = lines.length ? ('- Material :\n' + lines.join('\n')) : '';
    if(String(pkData[p][PK.textWaMaterial]||'') !== textMat){
      shPK.getRange(p+1, PK.textWaMaterial+1).setValue(textMat);
    }
    var grLines = _htkTeksGrounding(String(pkData[p][PK.pekerjaan]||''), grByPk[kpek] || []);
    var pbLines = _htkTeksBeban(String(pkData[p][PK.pekerjaan]||''), pbByPk[kpek] || []);
    (pkByPg[kpg] || (pkByPg[kpg]=[])).push({
      pekerjaan: String(pkData[p][PK.pekerjaan]||'').trim(),
      jumlah:    String(pkData[p][PK.jumlahPekerjaan]||'').trim(),
      satuan:    String(pkData[p][PK.satuanPekerjaan]||'').trim(),
      material:  lines,
      grounding: grLines,
      beban:     pbLines
    });
  }

  // Loop PenyulangGardu: tulis kolom M + kelompokkan objek per jenis (Gardu/Jaringan/Non-Teknik).
  var grpGardu = [], grpJaringan = [], grpNonteknik = [];
  var daerahSeen = {}, daerahList = [];
  for(var g=1;g<pgData.length;g++){
    if(String(pgData[g][PG.kodeHeader]||'').trim()!==key) continue;
    var kpg2   = String(pgData[g][PG.kodePG]||'').trim();
    var jenis  = String(pgData[g][PG.jenisPekerjaan]||'').trim();
    var pen    = String(pgData[g][PG.penyulang]||'').trim();
    var sec    = String(pgData[g][PG.section]||'').trim();
    var gar    = String(pgData[g][PG.gardu]||'').trim();
    var dae    = String(pgData[g][PG.daerah]||'').trim();

    // Fallback objek Gardu: bila Penyulang/Section/Daerah belum tersalin ke baris
    // (mis. bot prosesHartekPG belum jalan), lookup LIVE dari GARDU_MASTER by Nomor
    // Gardu — simetris dgn _buildWaTextInsGardu (Inspeksi Gardu).
    if(gar && (!pen || !sec || !dae)){
      var gmHtk = _findGarduByNomor(gar);
      if(gmHtk){
        if(!pen) pen = String(gmHtk.penyulang||'').trim();
        if(!sec) sec = String(gmHtk.section||'').trim();
        if(!dae) dae = String(gmHtk.alamat||'').trim();
      }
    }

    // Daftar pekerjaan -> kolom TextWA (M). Material NESTED di bawah tiap
    // pekerjaan ("- Material :" + baris "> ..."). Hasil Pengukuran Grounding
    // dikumpulkan & ditaruh di AKHIR blok (terpisah satu baris kosong).
    var pekLines = [], groundingLines = [], bebanLines = [];
    var peks = pkByPg[kpg2] || [];
    for(var pk2=0;pk2<peks.length;pk2++){
      var it = peks[pk2];
      var judul = (pk2+1)+'. '+it.pekerjaan;
      if(it.jumlah) judul += ' : '+it.jumlah+(it.satuan?' '+it.satuan:'');
      pekLines.push(judul);
      if(it.material.length){
        pekLines.push('- Material :');
        for(var x=0;x<it.material.length;x++) pekLines.push(it.material[x]);
      }
      if(it.grounding) for(var gz=0;gz<it.grounding.length;gz++) groundingLines.push(it.grounding[gz]);
      if(it.beban) for(var bz=0;bz<it.beban.length;bz++) bebanLines.push(it.beban[bz]);
    }
    if(groundingLines.length){
      pekLines.push('');                       // pemisah: blok grounding di akhir
      for(var gl=0;gl<groundingLines.length;gl++) pekLines.push(groundingLines[gl]);
    }
    if(bebanLines.length){
      pekLines.push('');                       // pemisah: blok beban trafo paling akhir
      for(var bl=0;bl<bebanLines.length;bl++) pekLines.push(bebanLines[bl]);
    }
    var textPg = pekLines.join('\n');   // kolom M = pekerjaan+material, grounding di akhir
    if(String(pgData[g][PG.textWa]||'') !== textPg){
      shPG.getRange(g+1, PG.textWa+1).setValue(textPg);
    }

    // Kumpulkan Daerah unik (kolom K) utk "Lokasi Pekerjaan".
    if(dae && !daerahSeen[dae]){ daerahSeen[dae]=true; daerahList.push(dae); }
    // Klasifikasi objek per jenis: Jaringan / Non-Teknik / Gardu.
    var obj = { gardu:gar, pen:pen, sec:sec, pek:textPg };
    var jl = jenis.toLowerCase();
    if(jl === 'jaringan') grpJaringan.push(obj);
    else if(jl.indexOf('non')>=0 && jl.indexOf('teknik')>=0) grpNonteknik.push(obj);
    else grpGardu.push(obj);
  }

  // ===== Helper render WA header Hartek =====
  function _htkRoman(n){
    n = parseInt(n,10)||0;
    var map=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    var r='';
    for(var ri=0;ri<map.length;ri++){ while(n>=map[ri][0]){ r+=map[ri][1]; n-=map[ri][0]; } }
    return r || 'I';
  }
  // Objek Gardu / Non-Teknik: Nomor Gardu di-bold, Penyulang biasa.
  function _htkBlokGardu(o, idx){
    var B = [];
    B.push(_htkRoman(idx+1)+'. '+(o.gardu ? ('Gardu : *'+o.gardu+'*') : ('Penyulang : *'+o.pen+'*')));
    if(o.gardu && o.pen) B.push('Penyulang : '+o.pen);
    if(o.sec) B.push('Section : '+o.sec);
    B.push('Pekerjaan :');
    if(o.pek) B.push(o.pek);
    return B.join('\n');
  }
  // Objek Jaringan: Penyulang di-bold.
  function _htkBlokJaringan(o, idx){
    var B = [];
    B.push(_htkRoman(idx+1)+'. Penyulang : *'+o.pen+'*');
    if(o.sec) B.push('Section : '+o.sec);
    B.push('Pekerjaan :');
    if(o.pek) B.push(o.pek);
    return B.join('\n');
  }
  // Seksi: judul tebal + daftar objek (Romawi) atau 'Nihil' bila kosong.
  function _htkSeksi(judul, arr, render){
    var S = [judul];
    if(!arr.length){ S.push('Nihil'); return S.join('\n'); }
    var blocks = [];
    for(var si=0;si<arr.length;si++) blocks.push(render(arr[si], si));
    S.push(blocks.join('\n\n'));
    return S.join('\n');
  }

  // WA header -> db_Global_Header kolom M (WA Text), lintas modul.
  var H = COL_INS.HEADER;
  var ulpHeader = String(header.ulp||'').trim();
  var out = [];
  out.push('*Realisasi Pekerjaan Hartek ULP '+ulpHeader+'*');
  out.push('');
  out.push('Hari, Tanggal : '+header.hari+', '+_tglIndoGardu(header.tanggal));
  out.push('Koordinat Awal Pekerjaan : '+(header.koordinatAwal||'-'));
  out.push('Koordinat Akhir Pekerjaan : '+(header.koordinatAkhir||'-'));
  out.push('Lokasi Pekerjaan : '+(daerahList.join(', ')||'-'));
  out.push('');
  out.push(_htkSeksi('*Pekerjaan Gardu :*', grpGardu, _htkBlokGardu));
  out.push('');
  out.push(_htkSeksi('*Pekerjaan Jaringan :*', grpJaringan, _htkBlokJaringan));
  out.push('');
  out.push(_htkSeksi('*Pekerjaan Non-Teknik :*', grpNonteknik, _htkBlokGardu));
  var waHeader = out.join('\n');

  var hsh = ss.getSheetByName(SHEET_HTK.HEADER);
  var hdata = hsh.getDataRange().getValues();
  for(var i=1;i<hdata.length;i++){
    if(String(hdata[i][H.kodeHeader]||'').trim()===key){
      hsh.getRange(i+1, H.waText+1).setValue(waHeader);
      var tsCell = hsh.getRange(i+1, H.timestampUpdate+1);
      tsCell.setNumberFormat('dd/MM/yyyy HH:mm:ss');  // paksa tampil Tanggal + Waktu
      tsCell.setValue(new Date());
      break;
    }
  }
}


/* ═══ BACKSTOP WA HARTEK — DIGABUNG ke refreshWaHarian (Tek-WaEngine.gs) ═══
   Trigger backstop Hartek tersendiri TIDAK diperlukan lagi. Hartek sudah terdaftar di
   _waBuilderRegistry() (Tek-WaEngine.gs): { tim:'Hartek', recalc:recalcWaHartek_ }.
   Karena itu refreshWaHarian() — yang menyapu SEMUA header db_Global_Header bertanggal
   hari ini/kemarin lalu memanggil builder tiap tim lewat _findWaBuilder — OTOMATIS ikut
   membangun ulang WA header Hartek (Tim='Hartek'). Ini sekaligus menutup kasus "Link Foto
   grounding terisi belakangan": _htkTeksGrounding melewati baris tanpa link, lalu sapuan
   berikutnya memasukkannya begitu link muncul.
   Pasang cukup SATU backstop untuk semua modul: createRefreshWaTrigger() (Code.gs, tiap
   15 menit). Tidak ada trigger/fungsi backstop khusus Hartek lagi. */


/* ═══════════════════════════════════════════════════════════════════
   REKAP MATRIX HARTEK per PENYULANG  (backend untuk Tek-Hartek.html)
   Kriteria pekerjaan (VERTIKAL) × Bulan + Minggu ke- (HORIZONTAL).
   Kriteria memakai pemetaan yang SAMA dgn GASPOL UP3 (_gaspolReadHartekMap /
   _gaspolHartekColFor di SIE-Teknik-Code.gs, global scope): nilai kriteria =
   nama properti COL_GASPOL (mis. 'harkomIsolator', 'harkonsTiang',
   'groundingGardu', ...). Pekerjaan yang tak terpetakan / dikosongkan dilewati.
   opts: { penyulang:'', tahun:2026, ulp:'' } (penyulang/ulp kosong = semua).
   Output: {
     ok, tahun,
     data: { <kriteria>: { '<bulan0-11>-<minggu1-5>': jumlah } },
     totalPerKriteria: { <kriteria>: jumlah }
   }
   'minggu ke-' dalam bulan = Math.ceil(tanggal/7) -> 1..5.
   ═══════════════════════════════════════════════════════════════════ */
function getHartekRekapMatrix(opts){
  try{
    opts = opts || {};
    var penyF = String(opts.penyulang||'').trim().toLowerCase();
    var ulpF  = String(opts.ulp||'').trim().toLowerCase();
    var tahun = parseInt(opts.tahun,10) || (new Date()).getFullYear();
    var hmap  = _gaspolReadHartekMap();   // Pekerjaan(+Jenis) -> kolom GASPOL (dari sheet list)

    var ss = _ssHtk();
    var sh = ss.getSheetByName(SHEET_HTK.PEKERJAAN);
    if(!sh || sh.getLastRow() < 2) return { ok:true, tahun:tahun, data:{}, totalPerKriteria:{} };
    var C = COL_HTK.PEKERJAAN;
    var data = sh.getRange(2, 1, sh.getLastRow()-1, C.timestamp+1).getValues();

    var out = {}, tot = {};
    for(var i=0;i<data.length;i++){
      var peny = String(data[i][C.penyulang]||'').trim();
      if(!peny) continue;
      if(penyF && peny.toLowerCase() !== penyF) continue;
      if(ulpF  && String(data[i][C.ulp]||'').trim().toLowerCase() !== ulpF) continue;
      var iso = _normTgl(data[i][C.tanggal]);            // 'YYYY-MM-DD'
      var parts = iso ? iso.split('-') : [];
      if(parts.length < 3) continue;
      if(parseInt(parts[0],10) !== tahun) continue;
      var bulan  = parseInt(parts[1],10) - 1;            // 0..11
      var minggu = Math.ceil(parseInt(parts[2],10) / 7); // 1..5 (minggu ke- dlm bulan)
      var col = _gaspolHartekColFor(hmap, data[i][C.pekerjaan], data[i][C.jenisPekerjaan]);
      if(!col) continue;                                 // tak terpetakan / dikosongkan
      var jml = Number(data[i][C.jumlahPekerjaan]) || 0;
      var slot = bulan + '-' + minggu;
      if(!out[col]) out[col] = {};
      out[col][slot] = (out[col][slot]||0) + jml;
      tot[col] = (tot[col]||0) + jml;
    }
    return { ok:true, tahun:tahun, data:out, totalPerKriteria:tot };
  }catch(e){ return { ok:false, message:e.message, data:{}, totalPerKriteria:{} }; }
}

// Daftar penyulang untuk dropdown filter Tek-Hartek.html. Reuse getDataPenyulangByUlp
// (Code.gs / master db_Penyulang) bila tersedia; kalau tidak, tarik distinct penyulang
// dari db_Hartek_Pekerjaan sebagai fallback.
function getPenyulangHartek(ulp){
  try{
    if(typeof getDataPenyulangByUlp === 'function'){
      var r = getDataPenyulangByUlp(ulp);
      if(r && r.list && r.list.length) return { ok:true, list:r.list };
    }
  }catch(e){}
  try{
    var sh = _ssHtk().getSheetByName(SHEET_HTK.PEKERJAAN);
    if(!sh || sh.getLastRow() < 2) return { ok:true, list:[] };
    var C = COL_HTK.PEKERJAAN;
    var data = sh.getRange(2, 1, sh.getLastRow()-1, C.penyulang+1).getValues();
    var seen = {}, list = [];
    for(var i=0;i<data.length;i++){
      var p = String(data[i][C.penyulang]||'').trim();
      if(p && !seen[p.toLowerCase()]){ seen[p.toLowerCase()] = true; list.push({ nama:p }); }
    }
    list.sort(function(a,b){ return a.nama.localeCompare(b.nama); });
    return { ok:true, list:list };
  }catch(e){ return { ok:false, message:e.message, list:[] }; }
}


/* ═══════════════════════════════════════════════════════════════════
   DETAIL PEKERJAAN HARTEK  (drilldown 1 sel Tek-Hartek.html)
   Mengembalikan DAFTAR pekerjaan individual utk satu sel matriks
   getHartekRekapMatrix: kriteria (kolom GASPOL) × bulan × minggu ke-,
   difilter penyulang/tahun/ulp yang sama. Dipakai saat angka pada tabel
   diklik. Klasifikasi kriteria PERSIS memakai _gaspolHartekColFor agar
   angka detail konsisten dgn angka rekap.
   opts: {
     penyulang:'', tahun:2026, ulp:'',
     kriteria:'harkomIsolator',   // WAJIB: properti kolom GASPOL
     bulan:0,                     // 0..11 ; null/'' = semua bulan (drilldown Total)
     minggu:1                     // 1..5  ; null/'' = semua minggu
   }
   Output: { ok, total, tahun, kriteria, bulan, minggu,
             rows:[{ tanggal, hari, penyulang, section, gardu,
                     jenisPekerjaan, pekerjaan, jumlah, satuan, inputBy }] }
   ═══════════════════════════════════════════════════════════════════ */
function getHartekRekapDetail(opts){
  try{
    opts = opts || {};
    var penyF = String(opts.penyulang||'').trim().toLowerCase();
    var ulpF  = String(opts.ulp||'').trim().toLowerCase();
    var tahun = parseInt(opts.tahun,10) || (new Date()).getFullYear();
    var kriteria = String(opts.kriteria||'').trim();
    if(!kriteria) return { ok:false, message:'Kriteria pekerjaan kosong.', rows:[], total:0 };
    var bulanF  = (opts.bulan===''  || opts.bulan==null)  ? null : parseInt(opts.bulan,10);   // 0..11
    var mingguF = (opts.minggu==='' || opts.minggu==null) ? null : parseInt(opts.minggu,10);  // 1..5
    var hmap  = _gaspolReadHartekMap();   // Pekerjaan(+Jenis) -> kolom GASPOL

    var ss = _ssHtk();
    var sh = ss.getSheetByName(SHEET_HTK.PEKERJAAN);
    if(!sh || sh.getLastRow() < 2) return { ok:true, rows:[], total:0, tahun:tahun, kriteria:kriteria, bulan:bulanF, minggu:mingguF };
    var C = COL_HTK.PEKERJAAN;
    var data = sh.getRange(2, 1, sh.getLastRow()-1, C.timestamp+1).getValues();

    var rows = [], total = 0;
    for(var i=0;i<data.length;i++){
      var peny = String(data[i][C.penyulang]||'').trim();
      if(!peny) continue;
      if(penyF && peny.toLowerCase() !== penyF) continue;
      if(ulpF  && String(data[i][C.ulp]||'').trim().toLowerCase() !== ulpF) continue;
      var iso = _normTgl(data[i][C.tanggal]);            // 'YYYY-MM-DD'
      var parts = iso ? iso.split('-') : [];
      if(parts.length < 3) continue;
      if(parseInt(parts[0],10) !== tahun) continue;
      var bulan  = parseInt(parts[1],10) - 1;            // 0..11
      var minggu = Math.ceil(parseInt(parts[2],10) / 7); // 1..5
      if(bulanF  != null && bulan  !== bulanF)  continue;
      if(mingguF != null && minggu !== mingguF) continue;
      var col = _gaspolHartekColFor(hmap, data[i][C.pekerjaan], data[i][C.jenisPekerjaan]);
      if(col !== kriteria) continue;                     // hanya kriteria sel yg diklik
      var jml = Number(data[i][C.jumlahPekerjaan]) || 0;
      rows.push({
        tanggal:        iso,
        hari:           String(data[i][C.hari]||''),
        penyulang:      peny,
        section:        String(data[i][C.section]||''),
        gardu:          String(data[i][C.gardu]||''),
        jenisPekerjaan: String(data[i][C.jenisPekerjaan]||''),
        pekerjaan:      String(data[i][C.pekerjaan]||''),
        jumlah:         jml,
        satuan:         String(data[i][C.satuanPekerjaan]||''),
        inputBy:        String(data[i][C.inputBy]||'')
      });
      total += jml;
    }
    rows.sort(function(a,b){ return a.tanggal < b.tanggal ? -1 : (a.tanggal > b.tanggal ? 1 : 0); });
    return { ok:true, rows:rows, total:total, tahun:tahun, kriteria:kriteria, bulan:bulanF, minggu:mingguF };
  }catch(e){ return { ok:false, message:e.message, rows:[], total:0 }; }
}