/***** Tek-Yandal.gs — Modul Yandal (Yantek P0) *****/
/* Relasi: db_Global_Header (Kode Header) > db_Yandal_Shift (Kode Pekerjaan Shift) > db_Yandal_P0 (Kode Pekerjaan P0) */
/* Rev 9 Agu 2026 — DUAL-READ (migrasi arsip): fungsi rank/rekap membaca db_Yandal_P0
   dari AKTIF + ARSIP via _readSheetDual_() (Tek-Migrasi.gs): sinkronRankYandal,
   getRekapPointPetugasY, getDetailPerformaPetugasY, getListPetugasYandal, _unitPetugasMapY_.
   Fungsi TULIS/operasional & bacaan db_Yandal_Shift tetap AKTIF-saja.
   ⚠️ Paste file ini HANYA setelah sheet db_Yandal_P0 di arsip dikosongkan (HAPUS BARIS).
   Rev 12 Agu 2026 — db_Yandal_P0 sisip kolom "Alasan Rejected" (AQ / indeks 42): peta COL_P0
   bergeser +1 mulai approvedBy; setApprovalP0 menulis alasan Reject ke AQ (dikosongkan saat Approved).
   Rev 19 Agu 2026 — getApprovalP0List: tambah field catatan (AM), alasanRejected (AQ) & point (AR) ke response
   + objek counts {Menunggu, Approved, Rejected} (mengikuti filter ulp+tanggal) untuk badge tab di mobile.
   Kriteria status ditulis eksplisit — satu sumber untuk web SIE-Teknik & mobile (apiRouter_).
   + getLampiranPengecekanP0 & _sheetUkurGardu_ (hotfix siang): pembacaan lampiran di-gate jenis pekerjaan —
   spreadsheet gardu hanya dibuka utk "Pengecekan Gardu", sheet switching hanya di-scan utk "Pengecekan Switching";
   nama sheet gardu di-cache 6 jam (detail tidak lagi timeout/loading selamanya).
   + setApprovalP0 JADI ANTREAN (db_Approval_Queue): keputusan hanya DICATAT lalu balas seketika (~0,5 dtk) —
   UI mobile tidak lagi menunggu scan sheet + hitung point (penyebab timeout). Penulisan Status Approval +
   hitung Point dikerjakan backend oleh drainAntreanApprovalP0 tiap 1 menit (pasang trigger SEKALI via
   createApprovalDrainTriggerY() dari editor Apps Script).
   + sweepPointP0Yandal diturunkan ke default 15 menit (createPointP0DrainTriggerY(minutes)) — ia hanya
   BACKSTOP (point tetap dihitung seketika oleh antrean approval); scan sheet penuh tiap menit ikut
   membebani limit eksekusi simultan (penyebab timeout login/approval saat ramai).
+ INBOX PROPERTY (malam 2): setApprovalP0 menitipkan keputusan ke ScriptProperties (_apprInboxPush_) —
respons approve TIDAK menyentuh spreadsheet sama sekali (kebal macet backend Sheets);
drainAntreanApprovalP0 mem-flush inbox → db_Approval_Queue (_apprInboxFlush_) lalu memprosesnya.
Fallback: inbox penuh/gagal → tulis sheet langsung (enqueueApprovalP0_).
+ MALAM 3 — INBOX LOCK-FREE: satu property per kodeP0 (apprInbox_<kodeP0>) → tulis atomik TANPA lock;
push tidak lagi menunggu userLock yang bisa dipegang drain WM saat sheet sibuk (penyebab fallback lambat di v1).
+ MALAM 4 — SWEEP WM KELUAR DARI DRAIN 1-MENIT: sweepWmBacklogY (scan penuh P0 + Switching) dipindah ke
trigger terpisah 15 menit (createSweepWmBacklogTriggerY); drainAntreanP0 kini hanya menyentuh sheet antrean kecil.
+ sweepDurasiJarakYandalP0 default 5 → 30 menit. Tujuan: mengurangi okupansi slot eksekusi simultan —
penyebab request mobile antre slot (gejala: fungsi cepat tapi respons tetap timeout 30 dtk).
+ Rev 28 Agu 2026: Dual-read untuk db_Yandal_Rank & db_List_Petugas_Yandal via _allDualSheetY_.
+ Rev 04 Sep 2026: DUAL-READ LENGKAP ANALISA JAM EFEKTIF (Rank, Petugas, Shift, P0).
  Memulihkan implementasi getTabelPetugasYandal, getDetailPerformaPetugasY, sinkronRankYandal, dll. */

// ====== KONFIG ======
var SHEET_YANDAL = {
  HEADER: "db_Global_Header",
  SHIFT: "db_Yandal_Shift",
  P0: "db_Yandal_P0",
  SWITCHING: "db_Yandal_Pengecekan_Switching",
  RANK: "db_Yandal_Rank",
  PETUGAS: "db_List_Petugas_Yandal",
  LIST_P0: "db_Yandal_List_P0",
};
// db_Yandal_List_P0 — master bobot tiap jenis pekerjaan P0 (0-based): No | Nama Pekerjaan | Bobot Pekerjaan
var COL_YANDAL_LIST_P0 = { no: 0, namaPekerjaan: 1, bobot: 2 };
var YANDAL_APPSHEET_ROOT_ID = ""; // root berkas AppSheet; kosong = pakai folder induk Spreadsheet
var YANDAL_IMG_FOLDER_ID = ""; // (fallback opsional) folder foto asli bila folderPath kosong
var YANDAL_WM_FOLDER_ID = ""; // (fallback opsional) folder hasil bila folderPath kosong
var YANDAL_TZ = "Asia/Jakarta";
var HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
var BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// Peta kolom 0-based (urutan = kolom A, B, C, ...)
var COL_YANDAL_SHIFT = {
  no: 0,
  kodeHeader: 1,
  kodeShift: 2,
  hari: 3,
  tanggal: 4,
  ulp: 5,
  tim: 6,
  shift: 7,
  petugas: 8,
  jumlahP0: 9,
  inputBy: 10,
  timestamp: 11,
};
var COL_P0 = {
  no: 0,
  kodeHeader: 1,
  kodeShift: 2,
  kodeP0: 3,
  ulp: 4,
  hari: 5,
  tanggal: 6,
  namaPekerjaan: 7,
  pekerjaanLainnya: 8,
  penyulang: 9,
  section: 10,
  daerah: 11,
  koordinat: 12,
  lat: 13,
  long: 14,
  koordinatClosing: 15,
  latClosing: 16,
  longClosing: 17,
  jarak: 18,
  jarakAntarP0: 19, // (kolom T) "Jarak Antara P0 Terbaru & P0 Terakhir" — diisi SKRIP (_recalcJarakAntarP0RowY_) saat prosesP0Yandal; P0 pertama di shift = "0 km"
  tim: 20,
  petugas: 21,
  timestampPembuatan: 22,
  fotoSebelum: 23,
  fotoSebelumWm: 24,
  fotoSebelumUrl: 25,
  linkDownloadSebelum: 26,
  timestampPekerjaan: 27,
  fotoPekerjaan: 28,
  fotoPekerjaanWm: 29,
  fotoPekerjaanUrl: 30,
  linkDownloadPekerjaan: 31,
  timestampSesudah: 32,
  fotoSesudah: 33,
  fotoSesudahWm: 34,
  fotoSesudahUrl: 35,
  linkDownloadSesudah: 36,
  catatan: 37,
  inputBy: 38,
  timestampWebsite: 39,
  durasi: 40,
  statusApproval: 41,
  alasanRejected: 42, // (kolom AQ) "Alasan Rejected" — diisi setApprovalP0 (12 Agu 2026)
  approvedBy: 43,
  timestampApprove: 44,
  point: 45,
  tampilSebelum: 46,
  tampilPekerjaan: 47,
  tampilSesudah: 48,
  folderPath: 49,
};
// db_Yandal_Pengecekan_Switching (cucu P0) — Pengecekan Switching. 4 indikator (Remote/Local/Protection/Reclose) + 6 foto: Arus + Gangguan 1..5 (tiap foto: Asli/WM/URL/Link Download).
var COL_SWITCHING = {
  no: 0,
  kodeHeader: 1,
  kodeShift: 2,
  kodeP0: 3,
  kodeSwitching: 4,
  ulp: 5,
  hari: 6,
  tanggal: 7,
  tim: 8,
  petugas: 9,
  penyulang: 10,
  namaSwitching: 11,
  jamPengecekan: 12,
  koordinat: 13,
  lat: 14,
  long: 15,
  indikatorRemote: 16,
  indikatorLocal: 17,
  indicatorProtection: 18,
  indicatorReclose: 19,
  arusR: 20,
  arusS: 21,
  arusT: 22,
  fotoArus: 23,
  fotoArusWm: 24,
  fotoArusUrl: 25,
  linkDownloadArus: 26,
  fotoG1: 27,
  fotoG1Wm: 28,
  fotoG1Url: 29,
  linkDownloadG1: 30,
  fotoG2: 31,
  fotoG2Wm: 32,
  fotoG2Url: 33,
  linkDownloadG2: 34,
  fotoG3: 35,
  fotoG3Wm: 36,
  fotoG3Url: 37,
  linkDownloadG3: 38,
  fotoG4: 39,
  fotoG4Wm: 40,
  fotoG4Url: 41,
  linkDownloadG4: 42,
  fotoG5: 43,
  fotoG5Wm: 44,
  fotoG5Url: 45,
  linkDownloadG5: 46,
  inputBy: 47,
  timestamp: 48,
  folderPath: 49,
};

// ====== HELPER UMUM ======
function _ssY_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}
function _shY_(name) {
  return _ssY_().getSheetByName(name);
}
function _nowY_() {
  return new Date();
}
function _fmtY_(d, pat) {
  return Utilities.formatDate(d, YANDAL_TZ, pat);
}
function _hariY_(d) {
  return HARI_ID[d.getDay()];
}
function _jamHHmm_(v) {
  var ms = _toMillisY_(v);
  return isNaN(ms) ? "" : _fmtY_(new Date(ms), "HH:mm");
}
function _tglDMY_(v) {
  var ms = _toMillisY_(v);
  var d = isNaN(ms)
    ? Object.prototype.toString.call(v) === "[object Date]"
      ? v
      : null
    : new Date(ms);
  return d
    ? _padY_(d.getDate(), 2) +
        " " +
        BULAN_ID[d.getMonth()] +
        " " +
        d.getFullYear()
    : String(v || "");
}
function _padY_(n, len) {
  var s = "" + n;
  while (s.length < len) s = "0" + s;
  return s;
}
function _allY_(sh) {
  if (sh) {
    var name = String(sh.getName() || "");
    if (
      name === SHEET_YANDAL.RANK ||
      name === SHEET_YANDAL.PETUGAS ||
      name === SHEET_YANDAL.SHIFT ||
      name === SHEET_YANDAL.P0 ||
      name === SHEET_YANDAL.SWITCHING
    ) {
      return _allDualSheetY_(name);
    }
  }
  return sh.getDataRange().getValues();
}
function _setY_(sh, rowNum, col0, val) {
  sh.getRange(rowNum, col0 + 1).setValue(val);
}
function _setDateFmtY_(sh, rowNum, col0, d) {
  var c = sh.getRange(rowNum, col0 + 1);
  c.setNumberFormat("dd/MM/yyyy HH.mm.ss");
  c.setValue(d);
}
function _setTextY_(sh, rowNum, col0, val) {
  var c = sh.getRange(rowNum, col0 + 1);
  c.setNumberFormat("@");
  c.setValue(val);
}

function _findRowY_(sh, col0, value) {
  var d = _allY_(sh);
  for (var i = 1; i < d.length; i++) {
    if (String(d[i][col0]) === String(value))
      return { rowNum: i + 1, row: d[i] };
  }
  return null;
}

// Dual-read untuk sheet Yandal yang dimigrasikan: aktif + arsip.
// Urutan aktif lebih dulu, lalu arsip. Baris duplikat identik hanya dihitung sekali.
function _allDualSheetY_(sheetName) {
  var ids = [SPREADSHEET_ID];
  if (typeof SPREADSHEET_ID_ARSIP !== "undefined" && SPREADSHEET_ID_ARSIP)
    ids.push(SPREADSHEET_ID_ARSIP);
  var out = [], seen = {}, headerAdded = false;
  for (var s = 0; s < ids.length; s++) {
    try {
      var sh = SpreadsheetApp.openById(ids[s]).getSheetByName(sheetName);
      if (!sh || sh.getLastRow() < 1) continue;
      var rows = sh.getDataRange().getValues();
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var uniqueKey = "";
        if (i > 0) {
          if (sheetName === SHEET_YANDAL.P0) uniqueKey = String(row[COL_P0.kodeP0] || "").trim();
          else if (sheetName === SHEET_YANDAL.SHIFT) uniqueKey = String(row[COL_YANDAL_SHIFT.kodeShift] || "").trim();
          else if (sheetName === SHEET_YANDAL.SWITCHING) uniqueKey = String(row[COL_SWITCHING.kodeSwitching] || "").trim();
        }
        var key = uniqueKey || JSON.stringify(row.map(function(v){ return v instanceof Date ? v.toISOString() : String(v == null ? "" : v).trim(); }));
        if (seen[key]) continue;
        seen[key] = true;
        if (i === 0) {
          if (!headerAdded) { out.push(row); headerAdded = true; }
        } else out.push(row);
      }
    } catch (e) {
      Logger.log("_allDualSheetY_: gagal membaca " + sheetName + " sumber " + s + " — " + e);
    }
  }
  return out;
}
function _allDualYandalRank_() { return _allDualSheetY_(SHEET_YANDAL.RANK); }
function _allDualYandalPetugas_() { return _allDualSheetY_(SHEET_YANDAL.PETUGAS); }
function _allDualYandalP0_() { return _allDualSheetY_(SHEET_YANDAL.P0); }
function _allDualYandalShift_() { return _allDualSheetY_(SHEET_YANDAL.SHIFT); }
