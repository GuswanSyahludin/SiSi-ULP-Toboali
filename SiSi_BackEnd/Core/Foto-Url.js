/* =====================================================
   Foto-Url.js — Standar URL foto SiSi (ROW + modul lain)
   Rev 22 Agu 2026
   -----------------------------------------------------
   NILAI BAKU YANG DISIMPAN DI GSHEET:
     https://drive.google.com/thumbnail?id=<FILE_ID>

   Sengaja TANPA &sz=... supaya satu nilai bisa dipakai lintas UI:
     kartu/list : urlFotoUkuran_(url, 400)
     popup/detail: urlFotoUkuran_(url, 1600)

   Helper menerima semua format lama:
     • https://lh3.googleusercontent.com/d/<ID>
     • https://drive.google.com/file/d/<ID>/view
     • https://drive.google.com/open?id=<ID>
     • https://drive.google.com/uc?...&id=<ID>
     • https://drive.google.com/thumbnail?id=<ID>&sz=w400
     • File ID polos

   Mobile ROW saat ini menulis lh3 di Code.js. Agar Code.js besar tidak ditulis
   ulang penuh dan berisiko rusak, fungsi tick di bawah menormalisasi kolom
   S/U/W sesudah upload. Jalankan pasangNormalisasiUrlFotoROWTrigger() SEKALI
   setelah clasp push + deploy. Maksimal 1 menit setelah upload, nilai di gsheet
   sudah menjadi format baku.
   ===================================================== */

var FOTO_URL_PREFIX = "https://drive.google.com/thumbnail?id=";
var FOTO_ROW_SHEET = "db_ROW_Eksekusi";
var FOTO_ROW_URL_COLS = [19, 21, 23]; // S, U, W (1-based)
var FOTO_ROW_BATCH = 150;

/** Ambil File ID Drive dari ID polos atau URL dalam format apa pun. */
function fileIdFoto_(nilai) {
  var s = String(nilai || "").trim();
  if (!s) return "";

  var pola = [
    /\/d\/([a-zA-Z0-9_-]{20,})/,
    /[?&]id=([a-zA-Z0-9_-]{20,})/,
    /^([a-zA-Z0-9_-]{20,})$/,
  ];
  for (var i = 0; i < pola.length; i++) {
    var m = s.match(pola[i]);
    if (m) return m[1];
  }
  return "";
}

/** URL baku untuk DISIMPAN di gsheet: thumbnail tanpa ukuran. */
function urlFotoBaku_(nilai) {
  var id = fileIdFoto_(nilai);
  return id ? FOTO_URL_PREFIX + id : String(nilai || "").trim();
}

/** URL untuk DIBACA UI. Tidak mengubah nilai di gsheet. */
function urlFotoUkuran_(nilai, lebar) {
  var baku = urlFotoBaku_(nilai);
  if (!baku || baku.indexOf(FOTO_URL_PREFIX) !== 0) return baku;
  var w = Math.max(64, Math.min(2400, Number(lebar || 400)));
  return baku + "&sz=w" + Math.round(w);
}

/** Pastikan file bisa dibaca mobile/web app tanpa login Google. */
function publikasikanFoto_(fileOrId) {
  try {
    var file = typeof fileOrId === "string"
      ? DriveApp.getFileById(fileOrId)
      : fileOrId;
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return true;
  } catch (e) {
    Logger.log("publikasikanFoto_ gagal: " + e.message);
    return false;
  }
}

/**
 * Normalisasi bertahap kolom URL ROW (S/U/W).
 * Hanya menulis sel yang berisi URL valid dan belum berbentuk baku, sehingga
 * murah dan aman dijalankan tiap menit. Progress row disimpan di ScriptCache;
 * setelah mencapai akhir sheet, putaran berikutnya kembali dari baris 2.
 */
function normalisasiUrlFotoRowTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return;
  try {
    var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FOTO_ROW_SHEET);
    if (!sh || sh.getLastRow() < 2) return;

    var cache = CacheService.getScriptCache();
    var start = Number(cache.get("fotoRowNormNext") || 2);
    var last = sh.getLastRow();
    if (start < 2 || start > last) start = 2;
    var count = Math.min(FOTO_ROW_BATCH, last - start + 1);

    for (var c = 0; c < FOTO_ROW_URL_COLS.length; c++) {
      var col = FOTO_ROW_URL_COLS[c];
      var rg = sh.getRange(start, col, count, 1);
      var vals = rg.getValues();
      var berubah = false;
      for (var r = 0; r < vals.length; r++) {
        var lama = String(vals[r][0] || "").trim();
        if (!lama) continue;
        var baku = urlFotoBaku_(lama);
        if (baku && baku !== lama) {
          vals[r][0] = baku;
          berubah = true;
        }
      }
      if (berubah) rg.setValues(vals);
    }

    var next = start + count;
    cache.put("fotoRowNormNext", String(next > last ? 2 : next), 21600);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/** Jalankan SEKALI dari editor setelah deploy. */
function hapusNormalisasiUrlFotoROWTrigger() {
  var all = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < all.length; i++) {
    if (all[i].getHandlerFunction() === "normalisasiUrlFotoRowTick") {
      ScriptApp.deleteTrigger(all[i]);
      n++;
    }
  }
  return "Trigger dihapus: " + n;
}
