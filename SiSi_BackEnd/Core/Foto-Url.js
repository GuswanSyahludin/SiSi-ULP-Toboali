/* =====================================================
   Foto-Url.js — Standar URL foto SiSi (ROW + modul lain)
   Rev 22 Agu 2026
   -----------------------------------------------------
   Helper URL bersifat pure dan dipakai lintas modul. Akses ke Drive tetap
   diamankan oleh endpoint pemanggil; helper tidak membaca atau menulis data.
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

/** URL baku untuk DISIMPAN di gsheet: thumbnail tanpa ukuran. Pure helper. */
function urlFotoBaku_(nilai) {
  var id = fileIdFoto_(nilai);
  return id ? FOTO_URL_PREFIX + id : String(nilai || "").trim();
}

/** URL untuk DIBACA UI. Pure helper, tidak membaca/menulis data. */
function urlFotoUkuran_(nilai, lebar) {
  var baku = urlFotoBaku_(nilai);
  if (!baku || baku.indexOf(FOTO_URL_PREFIX) !== 0) return baku;
  var w = Math.max(64, Math.min(2400, Number(lebar || 400)));
  return baku + "&sz=w" + Math.round(w);
}

/* Dihapus 29 Agu 2026: publikasikanFoto_(). */

/**
 * Normalisasi bertahap kolom URL ROW (S/U/W).
 * Trigger-only: sesi pengguna ditolak; trigger terjadwal boleh berjalan.
 */
function normalisasiUrlFotoRowTick() {
  guardInternal_(arguments, "normalisasiUrlFotoRowTick");

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
