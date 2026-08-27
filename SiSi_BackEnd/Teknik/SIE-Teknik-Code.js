/* ===============================================================
   SIE-Teknik-Code.gs — SiSi ULP Toboali (MODUL SIE TEKNIK)
   Rekap pekerjaan lintas-modul untuk Laporan GASPOL UP3.
   Sumber data: ROW, Hartek, Inspeksi Gardu, Inspeksi Jaringan, Yandal.
   Dikelompokkan per PENYULANG + per TANGGAL pekerjaan; ULP di-set TBL.
   Catatan: semua file .gs berbagi global scope (SPREADSHEET_ID, COL_ROW,
   COL_ROW_RLZ, _normTanggal, dst. dari Code.gs / Tek-ROW.gs bisa dipakai).
   Rev 9 Agu 2026 — DUAL-READ (migrasi arsip): _gaspolFromROW membaca
   db_ROW_Realisasi dari AKTIF + ARSIP via _readSheetDual_() (Tek-Migrasi.gs).
   Sumber lain (InsJar / InsDu / Hartek / Yandal) menyusul setelah sheet-nya
   dimigrasi & arsipnya bersih — jangan dual-read sebelum itu (angka dobel).
   Rev 11 Agu 2026 — PEMECAHAN FILE (~3000 baris): seluruh modul Data Pendukung
   CheckPoint (semua endpoint getDpg* + konstanta/helper DPG_*) dipindah ke
   Tek-Data-Checkpoint.gs. Global scope tetap dibagi antar-file .gs, jadi tidak
   ada perubahan pemanggilan dari frontend maupun lintas file.
=============================================================== */

/* === DEKLARASI SPREADSHEET SIE-TEKNIK (terpisah dari SPREADSHEET_ID utama) === */
var SIE_SPREADSHEET_ID = "1dpRR639sHmbYalnK2UfkwwaNukoIzWFc2sM5mQWw9Rw";
var SHEET_SIE_DB = "DB";
function _sieSS() {
  return SpreadsheetApp.openById(SIE_SPREADSHEET_ID);
}

/* === PETA KOLOM sheet DB (master switching/penyulang) — 0-based ===
   No | JENIS SWITCHING | SECTION | ULP | PENYULANG | KODE ULP */
var COL_SIE_DB = {
  no: 0,
  jenisSwitching: 1,
  section: 2,
  ulp: 3,
  penyulang: 4,
  kodeUlp: 5,
};
var COL_SIE_DB_N = 6;

/* === PETA KOLOM OUTPUT GASPOL UP3 — 0-based, 38 kolom ===
   A No | B Tgl | C Section | D ULP
   Inspeksi Jaringan (E,F,G) | ROW (H,I,J) | HARKOM (K,L,M) | HARKONS (N..W)
   Gardu (X..AF) | SUTR/SR (AG..AJ) | Lainnya (AK,AL) */
var COL_GASPOL = {
  no: 0,
  tanggal: 1,
  section: 2,
  ulp: 3,
  insSutmKms: 4,
  insSutmTier1: 5,
  insSutmTier2: 6, // E,F,G  Inspeksi Jaringan
  rowRabas: 7,
  rowSedang: 8,
  rowBesar: 9, // H,I,J  ROW
  harkomIsolator: 10,
  harkomArrester: 11,
  harkomFco: 12, // K,L,M  HARKOM
  harkonsTiang: 13,
  harkonsSutm: 14,
  harkonsGw: 15,
  harkonsGsw: 16,
  groundingTm: 17,
  harkeypoint: 18,
  penghalangHewan: 19,
  rekonektorSutm: 20,
  rehabSutm: 21,
  penyulangBaruSutm: 22, // N..W   HARKONS
  noGardu: 23,
  insGarduTier1: 24,
  insGarduTier2: 25, // X,Y,Z  Inspeksi Gardu
  manajemenGardu: 26,
  tapChanger: 27,
  penyeimbanganBeban: 28,
  groundingGardu: 29,
  coverGardu: 30,
  lostContactPhbTr: 31, // ..AF   Gardu
  jurusanBaruPecahBeban: 32,
  rekonektorSutr: 33,
  srSeri: 34,
  rekonektorSr: 35, // AG..AJ SUTR/SR
  cfa: 36,
  pemasanganAvr: 37, // AK,AL  Lainnya
};
var COL_GASPOL_N = 38;

/* === BACA MASTER DB → lookup per Penyulang === */
function _sieReadDbMaster() {
  var byPeny = {},
    rows = [];
  var sh = _sieSS().getSheetByName(SHEET_SIE_DB);
  if (!sh || sh.getLastRow() < 2) return { byPenyulang: byPeny, rows: rows };
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, COL_SIE_DB_N).getValues();
  for (var i = 0; i < data.length; i++) {
    var peny = String(data[i][COL_SIE_DB.penyulang] || "").trim();
    if (!peny) continue;
    var rec = {
      no: data[i][COL_SIE_DB.no],
      jenisSwitching: String(data[i][COL_SIE_DB.jenisSwitching] || "").trim(),
      section: String(data[i][COL_SIE_DB.section] || "").trim(),
      ulp: String(data[i][COL_SIE_DB.ulp] || "").trim(),
      penyulang: peny,
      kodeUlp: String(data[i][COL_SIE_DB.kodeUlp] || "").trim(),
    };
    rows.push(rec);
    var k = peny.toLowerCase();
    // SECTION PANGKAL: 1 baris per Penyulang. Pilih baris yang JENIS SWITCHING-nya
    // menandakan pangkal (mengandung 'pangkal'); bila tak ada, pakai baris pertama.
    var isPangkal = /pangkal/i.test(rec.jenisSwitching);
    if (!byPeny[k]) {
      byPeny[k] = rec;
    } else if (isPangkal && !/pangkal/i.test(byPeny[k].jenisSwitching)) {
      byPeny[k] = rec;
    }
  }
  return { byPenyulang: byPeny, rows: rows };
}

/* === Helper tanggal & key === */
function _sieNormTgl(v) {
  if (typeof _normTanggal === "function") return _normTanggal(v);
  if (!v) return "";
  if (v instanceof Date && !isNaN(v.getTime()))
    return Utilities.formatDate(v, "Asia/Jakarta", "yyyy-MM-dd");
  return String(v).substring(0, 10);
}
function _sieTglLolos(tgl, f) {
  if (!tgl) return false;
  if (f.tglDari && tgl < f.tglDari) return false;
  if (f.tglSampai && tgl > f.tglSampai) return false;
  return true;
}
function _sieKey(peny, tgl) {
  return String(peny || "").trim() + "||" + String(tgl || "");
}

/* Ambil ruas Section SEBELUM tanda '-' (pangkal). Dipakai sbg fallback saat
   section tidak ditemukan cocok di DB. Contoh: 'SEED - RECLOSER 1' -> 'SEED'. */
function _siePangkalSection(sec) {
  var s = String(sec == null ? "" : sec).trim();
  if (!s) return "";
  var i = s.indexOf("-"); // ambil hanya bagian sebelum '-'
  if (i >= 0) s = s.slice(0, i);
  return s.trim();
}

/* === SUMBER 1: ROW (db_ROW_Realisasi) → H,I,J (Rabas, Sedang, Besar) ===
   KONKRET: realisasi ROW sudah berisi rabas/sedang/besar per penyulang+tanggal. */
function _gaspolFromROW(f) {
  var map = {};
  try {
    // DUAL-READ (migrasi arsip): db_ROW_Realisasi dibaca AKTIF + ARSIP via
    // _readSheetDual_() (Tek-Migrasi.gs) — rekap GASPOL memakai RENTANG tanggal
    // (bisa setahun penuh di getDpgHarMatrix) yg melintasi batas H-2; data lama
    // sudah pindah ke arsip. Dedup by Kode Pekerjaan ada di dalam helper.
    var RL = COL_ROW_RLZ;
    var data = _readSheetDual_(
      "db_ROW_Realisasi",
      RL.kodePekerjaan,
      COL_ROW_RLZ_N,
    );
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      if (
        !String(r[RL.kodePekerjaan] || "").trim() &&
        !String(r[RL.kodeHeader] || "").trim()
      )
        continue;
      var tgl = _sieNormTgl(r[RL.tanggal]);
      if (!_sieTglLolos(tgl, f)) continue;
      var peny = String(r[RL.penyulang] || "").trim();
      if (!peny) continue;
      var k = _sieKey(peny, tgl);
      if (!map[k]) map[k] = { rabas: 0, sedang: 0, besar: 0 };
      map[k].rabas += Number(r[RL.rabas]) || 0;
      map[k].sedang += Number(r[RL.sedang]) || 0;
      map[k].besar += Number(r[RL.besar]) || 0;
    }
  } catch (e) {
    Logger.log("[_gaspolFromROW] " + e.message);
  }
  return map;
}

/* === SUMBER 2: INSPEKSI JARINGAN → E,F,G (Inspeksi SUTM kmS, Tier 1, Tier 2) ===
   TODO(konfirmasi): sheet/fungsi sumber + cara hitung kmS & jumlah Tier 1/2
   per penyulang+tanggal. Output map: { key: { kms, tier1, tier2 } }. */
function _gaspolFromInspeksiJar(f) {
  var map = {};
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("db_InsJar_Realisasi");
    if (!sh || sh.getLastRow() < 2) return map;
    // db_InsJar_Realisasi (0-based): kodeHeader1, kodePekerjaanPeny2, hari3,
    // tanggal4, penyulang5, section6, segmen7, tier8, totalTiang9, jumlahTemuan10
    var C = { tanggal: 4, penyulang: 5, section: 6, tier: 8, totalTiang: 9 };
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues();
    for (var i = 0; i < data.length; i++) {
      var peny = String(data[i][C.penyulang] || "").trim();
      if (!peny) continue;
      var tgl = _sieNormTgl(data[i][C.tanggal]);
      if (!_sieTglLolos(tgl, f)) continue;
      var tier = String(data[i][C.tier] || "");
      var tiang = Number(data[i][C.totalTiang]) || 0;
      var sec = String(data[i][C.section] || "").trim();
      var k = _sieKey(peny, tgl);
      if (!map[k]) map[k] = { kms: 0, tier1: 0, tier2: 0, section: "" };
      if (sec && !map[k].section) map[k].section = sec; // simpan section (fallback pangkal)
      // Kolom E (kmS) = estimasi panjang SUTM = total tiang × 0,05 km (≈ 50 m/gawang).
      // F = tiang Tier 1, G = tiang Tier 2 (tetap jumlah tiang).
      map[k].kms += tiang * 0.05;
      if (tier.indexOf("1") >= 0) map[k].tier1 += tiang;
      if (tier.indexOf("2") >= 0) map[k].tier2 += tiang;
    }
  } catch (e) {
    Logger.log("[_gaspolFromInspeksiJar] " + e.message);
  }
  return map;
}

/* === SUMBER 3: INSPEKSI GARDU → X,Y,Z (No Gardu, Tier 1, Tier 2) ===
   TODO(konfirmasi): sumber (mis. db_InsDu_Realisasi / getRekapInsGarduRows).
   Output map: { key: { noGardu, tier1, tier2 } }. */
function _gaspolFromInspeksiGardu(f) {
  var map = {};
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("db_InsDu_Realisasi");
    if (!sh || sh.getLastRow() < 2) return map;
    // db_InsDu_Realisasi (0-based): kodeHeader1, kodePekerjaanGardu2, hari3,
    // tanggal4, penyulang5, section6, nomorGardu7, tier8, jumlahTemuan9
    var C = { tanggal: 4, penyulang: 5, section: 6, nomorGardu: 7, tier: 8 };
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 12).getValues();
    for (var i = 0; i < data.length; i++) {
      var peny = String(data[i][C.penyulang] || "").trim();
      var nomor = String(data[i][C.nomorGardu] || "").trim();
      if (!peny || !nomor) continue;
      var tgl = _sieNormTgl(data[i][C.tanggal]);
      if (!_sieTglLolos(tgl, f)) continue;
      var tier = String(data[i][C.tier] || "");
      var sec = String(data[i][C.section] || "").trim();
      var k = _sieKey(peny, tgl);
      if (!map[k]) map[k] = { noGardu: [], tier1: 0, tier2: 0, section: "" };
      if (sec && !map[k].section) map[k].section = sec; // simpan section (fallback pangkal)
      // 1 baris = 1 gardu. X = daftar NOMOR GARDU (teks, mis. "TB0001, TB0002"),
      // Y = gardu Tier 1, Z = gardu Tier 2.
      if (nomor && map[k].noGardu.indexOf(nomor) < 0)
        map[k].noGardu.push(nomor);
      if (tier.indexOf("1") >= 0) map[k].tier1 += 1;
      if (tier.indexOf("2") >= 0) map[k].tier2 += 1;
    }
  } catch (e) {
    Logger.log("[_gaspolFromInspeksiGardu] " + e.message);
  }
  return map;
}

/* === SUMBER 4: HARTEK → HARKOM (K,L,M) & HARKONS (N..W) ===
   TODO(konfirmasi): pemetaan jenis pekerjaan Hartek ke tiap kolom.
   Output map: { key: { isolator, arrester, fco, ...harkons } }. */
/* === JEMBATAN HARTEK → kolom GASPOL (driven by sheet) ===
   Pemetaan Pekerjaan Hartek → kolom GASPOL dibaca dari sheet
   'db_Hartek_List_Pekerjaan' (spreadsheet utama / SPREADSHEET_ID), kolom
   'Kolom GASPOL'. Nilai sel = nama properti COL_GASPOL (mis. 'harkomIsolator',
   'harkonsSutm', 'groundingGardu', ...); kosong = pekerjaan TIDAK masuk GASPOL.
   Menambah pekerjaan baru cukup mengisi kolom ini, tanpa ubah kode.
   Jalankan _gaspolSeedHartekMap() SEKALI untuk mengisi otomatis (sel kosong saja),
   lalu koreksi manual bila perlu. */
var SHEET_HTK_LIST = "db_Hartek_List_Pekerjaan";
var COL_HTK_LIST = { no: 0, pekerjaan: 1, jenis: 2, satuan: 3, gaspol: 4 };

function _htkNorm(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/* Baca peta Pekerjaan(+Jenis) → kolom GASPOL dari sheet list.
   Key utama 'pekerjaan||jenis'; key cadangan 'pekerjaan' (tanpa jenis). */
function _gaspolReadHartekMap() {
  var map = {};
  try {
    var sh =
      SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_HTK_LIST);
    if (!sh || sh.getLastRow() < 2) return map;
    var n = COL_HTK_LIST.gaspol + 1;
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, n).getValues();
    for (var i = 0; i < data.length; i++) {
      var pek = _htkNorm(data[i][COL_HTK_LIST.pekerjaan]);
      if (!pek) continue;
      var col = String(data[i][COL_HTK_LIST.gaspol] || "").trim();
      if (!col || !(col in COL_GASPOL)) continue; // kosong/dikosongkan → lewati
      var jen = _htkNorm(data[i][COL_HTK_LIST.jenis]);
      map[pek + "||" + jen] = col;
      if (!(pek in map)) map[pek] = col; // cadangan tanpa jenis
    }
  } catch (e) {
    Logger.log("[_gaspolReadHartekMap] " + e.message);
  }
  return map;
}

/* Cari kolom GASPOL untuk satu baris pekerjaan (pakai jenis bila ada). */
function _gaspolHartekColFor(hmap, pekerjaan, jenis) {
  var p = _htkNorm(pekerjaan);
  if (!p) return "";
  var j = _htkNorm(jenis);
  return hmap[p + "||" + j] || hmap[p] || "";
}

/* === SEEDER (jalankan SEKALI dari editor) ===
   Mengisi kolom 'Kolom GASPOL' di db_Hartek_List_Pekerjaan berdasarkan aturan
   klasifikasi final. Default: hanya mengisi sel yang masih KOSONG (koreksi manual
   tetap aman). overwriteAll=true untuk menimpa semua. */
function _gaspolSeedHartekMap(overwriteAll) {
  var sh =
    SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_HTK_LIST);
  if (!sh) throw new Error("Sheet " + SHEET_HTK_LIST + " tidak ditemukan.");
  var last = sh.getLastRow();
  if (last < 2) return "Tidak ada data.";
  var gcol = COL_HTK_LIST.gaspol + 1; // kolom E (1-based)
  sh.getRange(1, gcol).setValue("Kolom GASPOL"); // pastikan header
  var src = sh.getRange(2, 1, last - 1, gcol).getValues();
  var outCol = [],
    filled = 0,
    kept = 0;
  for (var i = 0; i < src.length; i++) {
    var pek = src[i][COL_HTK_LIST.pekerjaan];
    var cur = String(src[i][COL_HTK_LIST.gaspol] || "").trim();
    if (!String(pek || "").trim()) {
      outCol.push([cur]);
      continue;
    }
    if (cur && !overwriteAll) {
      outCol.push([cur]);
      kept++;
      continue;
    }
    var col = _gaspolClassifyHartek(pek, src[i][COL_HTK_LIST.jenis]);
    outCol.push([col]);
    if (col) filled++;
  }
  sh.getRange(2, gcol, outCol.length, 1).setValues(outCol);
  return (
    "Seed selesai. Terisi: " +
    filled +
    ", dipertahankan: " +
    kept +
    ", total: " +
    outCol.length
  );
}

/* Aturan klasifikasi final (lihat halaman Jembatan Pekerjaan Hartek → GASPOL).
   Kembalikan nama properti COL_GASPOL, atau '' bila dikosongkan. */
function _gaspolClassifyHartek(pekerjaan, jenis) {
  var p = _htkNorm(pekerjaan);
  if (!p) return "";
  var j = _htkNorm(jenis);
  if (/non[\s-]*teknik/.test(j)) return ""; // Jenis = Non-Teknik → selalu dikosongkan
  var isGanti = /(penggant|ganti)/.test(p);
  var isPerbaikan = /perbaik/.test(p);

  if (/jumperan/.test(p)) return ""; // jumperan gardu → kosong
  if (/rekonektor/.test(p)) {
    // Rekonektorisasi (verb sendiri)
    if (/\bsr\b|sambungan rumah/.test(p)) return "rekonektorSr";
    if (/jtr|sutr/.test(p)) return "rekonektorSutr";
    if (/\btm\b|sutm/.test(p)) return "rekonektorSutm";
    return "";
  }
  if (/\bcld\b/.test(p)) return "harkomArrester"; // CLD → Arrester
  if (/igsw/.test(p)) return "harkonsGsw"; // Bracket IGSW → GSW
  if (/key[\s-]*point/.test(p)) return "harkeypoint"; // Keypoint → Harkeypoint
  if (/protective sleeve|penghalang|satwa/.test(p)) return "penghalangHewan";
  if (/grounding|arding|galvanis/.test(p)) {
    // Grounding: pisah per Jenis
    return j.indexOf("gardu") >= 0 ? "groundingGardu" : "groundingTm";
  }
  if (isGanti) {
    // HARKOM + Manajemen Gardu: Penggantian
    if (/isolator/.test(p)) return "harkomIsolator";
    if (/arrester|arester/.test(p)) return "harkomArrester";
    if (/\bfco\b|fuse cut|cut[\s-]?out/.test(p)) return "harkomFco";
    if (/trafo|busbar/.test(p)) return "manajemenGardu";
  }
  if (isPerbaikan) {
    // HARKONS umum: Perbaikan
    if (/tiang/.test(p)) return "harkonsTiang";
    if (/sutm|jtm|a3c|konstruksi tm/.test(p)) return "harkonsSutm";
    if (/gw-|hgw|ground wire|kawat tanah/.test(p)) return "harkonsGw";
  }
  return ""; // selain itu → dikosongkan
}
function _gaspolFromHartek(f) {
  var map = {};
  try {
    var hmap = _gaspolReadHartekMap(); // Pekerjaan(+Jenis) → kolom GASPOL (dari sheet)
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("db_Hartek_Pekerjaan");
    if (!sh || sh.getLastRow() < 2) return map;
    // db_Hartek_Pekerjaan (0-based): tanggal6, jenisPekerjaan7, penyulang8, pekerjaan11, jumlahPekerjaan12
    var C = {
      tanggal: 6,
      jenis: 7,
      penyulang: 8,
      pekerjaan: 11,
      jumlahPekerjaan: 12,
    };
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 17).getValues();
    for (var i = 0; i < data.length; i++) {
      var peny = String(data[i][C.penyulang] || "").trim();
      if (!peny) continue;
      var tgl = _sieNormTgl(data[i][C.tanggal]);
      if (!_sieTglLolos(tgl, f)) continue;
      var col = _gaspolHartekColFor(
        hmap,
        data[i][C.pekerjaan],
        data[i][C.jenis],
      );
      if (!col) continue; // tak terpetakan / dikosongkan
      var jml = Number(data[i][C.jumlahPekerjaan]) || 0;
      var k = _sieKey(peny, tgl);
      if (!map[k]) map[k] = {};
      map[k][col] = (map[k][col] || 0) + jml;
    }
  } catch (e) {
    Logger.log("[_gaspolFromHartek] " + e.message);
  }
  return map;
}

/* === SUMBER 5: YANDAL → AK (Care For Asset / CFA) ===
   Sumber: db_Yandal_P0. Kolom AK HANYA menghitung P0 SHIFT 1 (SHF1) yang NAMA
   pekerjaannya mengandung ROW / PERBAIKAN / PENGGANTIAN, per penyulang+tanggal
   (1 baris = 1). P0 Shift 2/3 atau nama pekerjaan lain diabaikan.
   Output map: { key: { nilai, section } }. */
function _gaspolFromYandal(f) {
  var map = {};
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("db_Yandal_P0");
    if (!sh || sh.getLastRow() < 2) return map;
    // db_Yandal_P0 (0-based): kodeShift:2, kodeP0:3, tanggal6, penyulang9, section10
    var C = {
      kodeShift: 2,
      kodeP0: 3,
      tanggal: 6,
      penyulang: 9,
      namaPekerjaan: 7,
      section: 10,
    };
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues();
    for (var i = 0; i < data.length; i++) {
      if (!String(data[i][C.kodeP0] || "").trim()) continue;
      // CFA HANYA menghitung P0 Shift 1. Tag shift ada di Kode Pekerjaan Shift
      // (kolom C) & Kode Pekerjaan P0 (kolom D): '...-SHF1.<nnn>'. (Alias lama
      // "Pagi" juga menghasilkan SHF1 lewat generator, jadi cek kode aman.)
      var kodeShift = String(data[i][C.kodeShift] || "");
      var kodeP0 = String(data[i][C.kodeP0] || "");
      if (!/-SHF1\./.test(kodeShift) && !/-SHF1\./.test(kodeP0)) continue; // bukan Shift 1 → dilewati
      // CFA hanya untuk P0 yg NAMA pekerjaannya mengandung ROW / PERBAIKAN / PENGGANTIAN.
      var namaP0 = String(data[i][C.namaPekerjaan] || "").toLowerCase();
      if (!/(row|perbaikan|penggantian)/.test(namaP0)) continue; // nama tak sesuai → dilewati
      var peny = String(data[i][C.penyulang] || "").trim();
      if (!peny) continue;
      var tgl = _sieNormTgl(data[i][C.tanggal]);
      if (!_sieTglLolos(tgl, f)) continue;
      var sec = String(data[i][C.section] || "").trim();
      var k = _sieKey(peny, tgl);
      if (!map[k]) map[k] = { nilai: 0, section: "" };
      if (sec && !map[k].section) map[k].section = sec; // simpan section (fallback pangkal)
      // kolom AK = jumlah pekerjaan P0 Yandal SHIFT 1 per penyulang+tanggal (1 baris = 1).
      map[k].nilai += 1;
    }
  } catch (e) {
    Logger.log("[_gaspolFromYandal] " + e.message);
  }
  return map;
}

/* === FUNGSI UTAMA: kelompokkan pekerjaan per Penyulang + Tanggal → baris GASPOL UP3 ===
   opts: { tglDari:'yyyy-MM-dd', tglSampai:'yyyy-MM-dd', ulp:'' }
   Output: { ok, rows:[ Array(38) ] }  (ULP tiap baris = TBL). */
function getGaspolRekap(opts) {
  try {
    opts = opts || {};
    var f = { tglDari: opts.tglDari || "", tglSampai: opts.tglSampai || "" };
    var master = _sieReadDbMaster();

    var src = {
      row: _gaspolFromROW(f),
      insJar: _gaspolFromInspeksiJar(f),
      gardu: _gaspolFromInspeksiGardu(f),
      hartek: _gaspolFromHartek(f),
      yandal: _gaspolFromYandal(f),
    };

    // Gabungkan seluruh key (penyulang||tanggal) dari semua sumber.
    var keys = {};
    Object.keys(src).forEach(function (s) {
      Object.keys(src[s]).forEach(function (k) {
        keys[k] = true;
      });
    });

    var out = [];
    Object.keys(keys).forEach(function (k) {
      var parts = k.split("||");
      var peny = parts[0],
        tgl = parts[1];
      var rec = master.byPenyulang[peny.toLowerCase()] || {};
      var row = [];
      for (var c = 0; c < COL_GASPOL_N; c++) row[c] = 0;
      row[COL_GASPOL.tanggal] = tgl;
      // Section: utamakan hasil lookup DB (section pangkal switching penyulang).
      // Bila penyulang TIDAK ada di DB / section DB kosong → pakai PANGKAL section
      // dari data sumber (InsJar/Gardu/Yandal) langsung.
      var _secSrc =
        (src.insJar[k] && src.insJar[k].section) ||
        (src.gardu[k] && src.gardu[k].section) ||
        (src.yandal[k] && src.yandal[k].section) ||
        "";
      row[COL_GASPOL.section] = rec.section || _siePangkalSection(_secSrc);
      row[COL_GASPOL.ulp] = "TBL";
      row[COL_GASPOL.noGardu] = ""; // X = teks nomor gardu (default kosong)
      row._penyulang = peny; // bantu sort (dihapus sebelum return)

      // ROW → H,I,J
      var r = src.row[k];
      if (r) {
        row[COL_GASPOL.rowRabas] = r.rabas;
        row[COL_GASPOL.rowSedang] = r.sedang;
        row[COL_GASPOL.rowBesar] = r.besar;
      }

      // Inspeksi Jaringan → E,F,G
      var ij = src.insJar[k];
      if (ij) {
        row[COL_GASPOL.insSutmKms] = ij.kms
          ? Math.round(ij.kms * 100) / 100
          : 0;
        row[COL_GASPOL.insSutmTier1] = ij.tier1 || 0;
        row[COL_GASPOL.insSutmTier2] = ij.tier2 || 0;
      } // kmS dibulatkan 2 desimal

      // Inspeksi Gardu → X,Y,Z. X = daftar nomor gardu (teks), Y/Z = jumlah Tier.
      var g = src.gardu[k];
      if (g) {
        row[COL_GASPOL.noGardu] = (g.noGardu || []).join(", ");
        row[COL_GASPOL.insGarduTier1] = g.tier1 || 0;
        row[COL_GASPOL.insGarduTier2] = g.tier2 || 0;
      }

      // Hartek → HARKOM (K,L,M) & HARKONS (N..W). Map mengembalikan key = nama
      // properti COL_GASPOL (mis. harkomIsolator, harkonsTiang, ...).
      var ht = src.hartek[k];
      if (ht) {
        Object.keys(ht).forEach(function (col) {
          if (col in COL_GASPOL) row[COL_GASPOL[col]] = ht[col];
        });
      }

      // Yandal → AK
      var y = src.yandal[k];
      if (y) {
        row[COL_GASPOL.cfa] = y.nilai || 0;
      }

      out.push(row);
    });

    out.sort(function (a, b) {
      return (
        String(a[COL_GASPOL.tanggal]).localeCompare(
          String(b[COL_GASPOL.tanggal]),
        ) || String(a._penyulang).localeCompare(String(b._penyulang))
      );
    });
    out.forEach(function (row, i) {
      row[COL_GASPOL.no] = i + 1;
    }); // _penyulang dipertahankan utk submit (otomatis di-drop saat serialisasi ke frontend)

    return { ok: true, rows: out };
  } catch (e) {
    return { ok: false, error: e.message, rows: [] };
  }
}

/* === SUBMIT REKAP GASPOL → sheet 'Input TBL' (spreadsheet SIE, sama dgn DB) ===
   Dipanggil saat tombol "Input laporan ke GASPOL" ditekan.
   Struktur Input TBL: header baris 1, data mulai baris 2; kolom A..AL = 38 kolom
   GASPOL, kolom AM = Penyulang (acuan tambahan). Mode: APPEND; bila baris dgn
   kunci (Penyulang + Tanggal) sudah ada → baris lama DITIMPA.
   opts: { tglDari, tglSampai, ulp } (sama dgn getGaspolRekap). */
var SHEET_SIE_INPUT_TBL = "Input TBL";
var INPUT_TBL_HEADER_ROWS = 1; // header baris 1 → data mulai baris 2
var COL_INPUT_TBL_PENYULANG = 38; // 0-based; kolom AM (ke-39) = Penyulang

function _inputTblKey(peny, tgl, ulp) {
  peny = String(peny || "")
    .trim()
    .toLowerCase();
  tgl = _sieNormTgl(tgl);
  ulp = String(ulp || "")
    .trim()
    .toLowerCase();
  if (!peny && !tgl) return "";
  return peny + "||" + tgl + "||" + ulp;
}

/* Baris data terakhir yang NYATA = baris terakhir kolom B (Tanggal) terisi.
   Sheet Input TBL berisi formula gsheet, sehingga getLastRow() bisa menunjuk
   jauh di bawah data nyata; append harus dimulai SETELAH baris ini. */
function _inputTblLastRowB(sh) {
  var maxRows = sh.getMaxRows();
  if (maxRows < 1) return 0;
  var colB = sh.getRange(1, 2, maxRows, 1).getValues(); // kolom B (Tanggal)
  for (var i = colB.length - 1; i >= 0; i--) {
    if (String(colB[i][0] == null ? "" : colB[i][0]).trim() !== "")
      return i + 1;
  }
  return 0;
}

function submitGaspolToInputTbl(opts) {
  try {
    var rekap = getGaspolRekap(opts);
    if (!rekap.ok) return { ok: false, error: rekap.error || "Gagal merekap." };
    var rows = rekap.rows || [];
    if (!rows.length)
      return { ok: false, error: "Tidak ada data pada periode/filter ini." };

    var sh = _sieSS().getSheetByName(SHEET_SIE_INPUT_TBL);
    if (!sh)
      return {
        ok: false,
        error: "Sheet '" + SHEET_SIE_INPUT_TBL + "' tidak ditemukan.",
      };

    var dataStart = INPUT_TBL_HEADER_ROWS + 1; // baris 2
    var nCols = COL_INPUT_TBL_PENYULANG + 1; // A..AM (39 kolom); D & E TIDAK ditulis (terkunci)

    // Baris data terakhir berdasarkan kolom B (Tanggal), BUKAN getLastRow()
    // (sheet punya formula gsheet yang memanjangkan baris kosong).
    var lastDataRow = _inputTblLastRowB(sh);
    var appendRow = Math.max(lastDataRow, INPUT_TBL_HEADER_ROWS) + 1; // baris append berikutnya

    // Index baris existing → kunci Penyulang||Tanggal (ULP diabaikan; kolom D terkunci).
    var idx = {};
    if (lastDataRow >= dataStart) {
      var exist = sh
        .getRange(dataStart, 1, lastDataRow - dataStart + 1, nCols)
        .getValues();
      for (var r = 0; r < exist.length; r++) {
        var ek = _inputTblKey(
          exist[r][COL_INPUT_TBL_PENYULANG],
          exist[r][COL_GASPOL.tanggal],
          "",
        );
        if (ek) idx[ek] = dataStart + r; // nomor baris (1-based)
      }
    }

    var appended = 0,
      replaced = 0;
    for (var i = 0; i < rows.length; i++) {
      var src = rows[i];
      var line = [];
      for (var c = 0; c < COL_GASPOL_N; c++) line[c] = src[c]; // A..AL (38 kolom GASPOL)
      line[COL_INPUT_TBL_PENYULANG] = src._penyulang || ""; // AM = Penyulang
      var key = _inputTblKey(
        line[COL_INPUT_TBL_PENYULANG],
        line[COL_GASPOL.tanggal],
        "",
      );
      var targetRow;
      if (key && idx[key]) {
        targetRow = idx[key];
        replaced++;
      } else {
        targetRow = appendRow++;
        appended++;
        if (key) idx[key] = targetRow;
      } // append SETELAH last row kolom B
      // Kolom D (ULP) & E (Inspeksi SUTM kmS) DILEWATI: di sheet Input TBL kedua
      // kolom terkunci (protected) & terisi otomatis, jadi tidak ditulis dari sini.
      sh.getRange(targetRow, 1, 1, 3).setValues([[line[0], line[1], line[2]]]); // A,B,C
      // Nilai 0 / kosong TIDAK di-set (biarkan sel kosong di Input TBL).
      var rowVals = line.slice(5, COL_GASPOL_N).map(function (v) {
        return v === 0 || v == null || v === "" ? "" : v;
      });
      sh.getRange(targetRow, 6, 1, COL_GASPOL_N - 5).setValues([rowVals]); // F..AL saja (lewati D,E terkunci & AM = formula); 0/kosong jadi blank
    }

    // Renumber kolom A (No) untuk seluruh baris data nyata (dataStart..baris terpakai).
    var lastNow = appendRow - 1;
    if (lastNow >= dataStart) {
      var nRows = lastNow - dataStart + 1,
        nums = [];
      for (var n = 0; n < nRows; n++) nums.push([n + 1]);
      sh.getRange(dataStart, 1, nRows, 1).setValues(nums);
    }

    return {
      ok: true,
      appended: appended,
      replaced: replaced,
      total: rows.length,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/* ===============================================================
   MONITORING TINDAK LANJUT TEMUAN INSPEKSI (SIE-Teknik, tab 1)
   14 Agu 2026 — pengganti pemakaian getDataDaftarTemuan utk tab
   "Penugasan Tim" (tab di-rename "Monitoring Tindak Lanjut Temuan Inspeksi").
   Beda dengan endpoint lama:
     • Verifikasi role + ULP dari db_Users berdasar username (TIDAK percaya sesi frontend).
     • Filter rentang tanggal (tglDari..tglSampai) + Status WO multi-pilihan.
     • Role Super User/Admin → boleh pilih ULP bebas; selain itu ULP DIPAKSA dari db_Users.
     • Bentuk baris SELARAS endpoint lama (kodePekerjaan, statusPenerusan, dst) agar
       modal detail & alur "Teruskan ke Tim" di frontend tidak berubah.
   params: { username, ulp?, tglDari?, tglSampai?, statusList?[] }
   =============================================================== */

// Verifikasi user ke db_Users (kolom C = Username) → { ok, role, ulp }.
function _verifikasiUserDb_(username) {
  var uname = String(username || "")
    .trim()
    .toLowerCase();
  if (!uname)
    return { ok: false, error: "Username kosong — verifikasi db_Users gagal." };
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("db_Users");
  if (!sh) return { ok: false, error: "Sheet db_Users tidak ditemukan." };
  var d = sh.getDataRange().getValues();
  for (var i = 1; i < d.length; i++) {
    if (
      String(d[i][COL_USERS.userName] || "")
        .trim()
        .toLowerCase() === uname
    ) {
      return {
        ok: true,
        role: String(d[i][COL_USERS.role] || "").trim(),
        ulp: String(d[i][COL_USERS.ulp] || "").trim(),
      };
    }
  }
  return {
    ok: false,
    error: "Username tidak terdaftar di db_Users: " + username,
  };
}

function getMonitoringTlTemuan(params) {
  try {
    params = params || {};
    // 1) Verifikasi username → role & ULP dari db_Users.
    var ver = _verifikasiUserDb_(params.username);
    if (!ver.ok) return { ok: false, error: ver.error, list: [] };
    var isSuper = ver.role === "Super User" || ver.role === "Admin";
    // 2) Scope ULP: Super User/Admin → bebas (params.ulp, kosong = semua); selain itu → PAKSA ULP db_Users.
    var ulpScope = isSuper ? String(params.ulp || "").trim() : ver.ulp;
    var dari = _normTgl(params.tglDari),
      sampai = _normTgl(params.tglSampai);
    var statusList =
      params.statusList instanceof Array ? params.statusList : [];
    var statusOk = {};
    statusList.forEach(function (s) {
      statusOk[String(s || "").trim()] = true;
    });
    var pakaiStatus = statusList.length > 0;

    // 3) Baca db_INS_Temuan, filter ULP + rentang tanggal + status WO.
    var sh = _ssIns().getSheetByName(SHEET_INS.TEMUAN);
    if (!sh || sh.getLastRow() < 2)
      return { ok: true, ulp: ulpScope, role: ver.role, list: [] };
    var T = COL_INS.TEMUAN;
    var d = sh.getDataRange().getValues();
    var out = [];
    for (var i = 1; i < d.length; i++) {
      var kode = String(d[i][T.kodePekerjaan] || "").trim();
      if (!kode) continue;
      if (ulpScope && String(d[i][T.ulp] || "").trim() !== ulpScope) continue;
      var tgl = _normTgl(d[i][T.tanggal]);
      if (dari && tgl < dari) continue;
      if (sampai && tgl > sampai) continue;
      var status = String(d[i][T.status] || "").trim() || "Penugasan Tim";
      if (pakaiStatus && !statusOk[status]) continue;
      out.push({
        kodePekerjaan: kode,
        ulp: String(d[i][T.ulp] || "").trim(),
        hari: String(d[i][T.hari] || "").trim(),
        tanggal: tgl,
        timInspeksi: String(d[i][T.timInspeksi] || "").trim(),
        objek: String(d[i][T.objekInspeksi] || "").trim(),
        penyulang: String(d[i][T.penyulang] || "").trim(),
        section: String(d[i][T.section] || "").trim(),
        segmen: String(d[i][T.segmen] || "").trim(),
        nomorTiang: String(d[i][T.nomorTiang] || "").trim(),
        nomorGardu: String(d[i][T.nomorGardu] || "").trim(),
        tier: String(d[i][T.tier] || "").trim(),
        temuan: String(d[i][T.temuan] || "").trim(),
        deskripsi: String(d[i][T.deskripsi] || "").trim(),
        koordinat: String(d[i][T.koordinat] || "").trim(),
        fotoTemuanUrl: String(d[i][T.fotoTemuanUrl] || "").trim(),
        fotoTiangUrl: String(d[i][T.fotoTiangUrl] || "").trim(),
        statusPenerusan: status,
        timEksekusi: String(d[i][T.timEksekusi] || "").trim(),
        catatanSpv: String(d[i][T.catatan] || "").trim(),
      });
    }
    // Terbaru di atas (monitoring): urut tanggal desc, lalu kode desc.
    out.sort(function (a, b) {
      return (
        String(b.tanggal).localeCompare(String(a.tanggal)) ||
        String(b.kodePekerjaan).localeCompare(String(a.kodePekerjaan))
      );
    });
    return { ok: true, ulp: ulpScope, role: ver.role, list: out };
  } catch (e) {
    return { ok: false, error: e.message, list: [] };
  }
}

/* ===============================================================
   DATA PENDUKUNG CHECKPOINT — DIPINDAHKAN ke Tek-Data-Checkpoint.gs
   (Rev 11 Agu 2026; pemecahan file karena SIE-Teknik-Code.gs mencapai ~3000
   baris). Seluruh endpoint tab 'Data Pendukung CheckPoint' kini ada di file itu:
     1. getDpgHarMatrix          4. getDpgGangguanCharts
     2. getDpgCoverGardu         5. getDpgRekapTemuan
     3. getDpgGangguanPenyulang  6. getDpgSectionList
   beserta helper/konstanta: _zeros12, DPG_COVER_KOMPONEN, _dpgCoverIsFull,
   DPG_FGTM_MAP, _dpgFgtmMatch, _dpgFgtmMatchRow. Karena semua .gs berbagi
   global scope, pemanggilan frontend (google.script.run.getDpg*) TIDAK berubah,
   dan file baru tetap memakai _gaspolFrom* / _sieReadDbMaster /
   _siePangkalSection dari file ini.
=============================================================== */
