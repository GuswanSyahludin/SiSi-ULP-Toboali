/* Jalankan auditPredeployMobile_() dari editor sebelum membuat deployment. Read-only. */
function auditPredeployMobile_() {
  var checks = [],
    add = function (name, ok, detail) {
      checks.push({ name: name, ok: !!ok, detail: String(detail || "") });
    };
  /* Pemeriksaan ketersediaan fungsi tanpa eval. */
  function fn(name) {
    var ok = false;
    try {
      var g = typeof globalThis !== "undefined" ? globalThis : (function () { return this; })();
      ok = !!g && typeof g[name] === "function";
    } catch (e) {}
    add("function " + name, ok, ok ? "tersedia" : "TIDAK DITEMUKAN");
    return ok;
  }

  [
    "apiRouter_", "authPerangkatRouter_", "loginPerangkat", "cekPerangkat",
    "getMasterGarduMobile", "updateMasterGarduMobile", "getListTemuanMobile_",
    "syncPaketInsGarduMobile_", "simpanHeaderInsGardu", "simpanRealisasiInsGardu",
    "simpanTemuanGardu", "recalcWaInsGarduByHeader", "urlFotoBaku_",
  ].forEach(fn);

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    [
      "db_Users", "db_Global_Header", "db_InsDu_Realisasi",
      "db_INS_Temuan", "db_List_Temuan", "db_ROW_Eksekusi",
    ].forEach(function (n) {
      add("sheet " + n, !!ss.getSheetByName(n), ss.getName());
    });
  } catch (e) {
    add("spreadsheet utama", false, e.message);
  }

  // Independently reported checks, so a missing source never looks like success.
  _auditPetugasYandalPredeploy_().forEach(function (c) {
    add(c.name, c.ok, c.detail);
  });

  try {
    var cfg = typeof MASTER_GARDU_MOBILE !== "undefined" ? MASTER_GARDU_MOBILE : null;
    var sh = cfg && SpreadsheetApp.openById(cfg.spreadsheetId).getSheetByName(cfg.tab);
    add("Master_Gardu eksternal", !!sh, sh ? sh.getLastRow() + " baris" : "tidak ditemukan");
  } catch (e) {
    add("Master_Gardu eksternal", false, e.message);
  }

  try {
    var loginGuard = loginPerangkat("", "", "audit");
    add("validasi login kosong", loginGuard && loginGuard.success === false, loginGuard && loginGuard.message);
  } catch (e) {
    add("validasi login kosong", false, e.message);
  }

  var gagal = checks.filter(function (c) { return !c.ok; });
  var result = { ok: gagal.length === 0, total: checks.length,
    lulus: checks.length - gagal.length, gagal: gagal.length, checks: checks };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/** Read-only: no sheet creation, cache mutation or crew names in logs. */
function _auditPetugasYandalPredeploy_() {
  var checks = [];
  function add(name, ok, detail) { checks.push({ name: name, ok: !!ok, detail: String(detail || "") }); }
  var label = "db_List_Petugas_Yandal";
  var sh = null, sourceNames = [], schemaOk = false;
  try {
    sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(label);
    add("sheet " + label, !!sh, sh ? "Ditemukan di spreadsheet utama" : "Sheet dengan nama persis ini tidak ditemukan");
  } catch (e) { add("sheet " + label, false, e.message); }

  try {
    if (!sh) throw new Error("Tidak diperiksa: sheet wajib tidak tersedia");
    var width = sh.getLastColumn();
    if (width < 1) throw new Error("Header sheet kosong");
    var headers = sh.getRange(1, 1, 1, width).getValues()[0];
    var nameCols = [];
    headers.forEach(function (v, i) {
      var h = String(v || "").trim().toLowerCase().replace(/\s+/g, " ");
      // Same explicit header rule as the mobile reader. Audit rejects the
      // reader's broad fallback to all columns, which may include non-names.
      if (h.indexOf("petugas") >= 0 || h === "nama") nameCols.push(i);
    });
    schemaOk = nameCols.length > 0;
    add("kolom nama " + label, schemaOk, schemaOk
      ? nameCols.length + " kolom nama/petugas dikenali"
      : "Gunakan header Nama atau Nama Petugas; fallback semua kolom tidak dianggap valid");
    if (schemaOk && sh.getLastRow() > 1) {
      var seen = Object.create(null);
      sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues().forEach(function (row) {
        nameCols.forEach(function (col) {
          String(row[col] || "").trim().replace(/\r/g, "\n").split(/[,;\/&\n]+/).forEach(function (part) {
            var name = part.trim().toLowerCase();
            if (name && !seen[name]) { seen[name] = true; sourceNames.push(name); }
          });
        });
      });
    }
  } catch (e) { add("kolom nama " + label, false, e.message); }
  add("isi petugas " + label, schemaOk && sourceNames.length >= 2,
    sourceNames.length + " nama unik terbaca; minimal 2 untuk pemilihan petugas shift");

  try {
    if (typeof _deltaConfigs_ !== "function" || typeof _deltaYandalPetugasRows_ !== "function") {
      throw new Error("Konfigurasi atau pembaca petugas delta sync tidak tersedia");
    }
    var cfg = _deltaConfigs_()[label];
    if (!cfg || cfg.special !== "yandalPetugas" || cfg.support !== true) {
      throw new Error("Dataset petugas belum terdaftar sebagai support/yandalPetugas");
    }
    if (!schemaOk || sourceNames.length < 2) throw new Error("Sumber wajib belum memenuhi pemeriksaan kolom dan isi");
    var rows = _deltaYandalPetugasRows_();
    if (!Array.isArray(rows)) throw new Error("Pembaca mobile tidak mengembalikan daftar");
    var names = Object.create(null), malformed = false;
    rows.forEach(function (r) {
      if (!Array.isArray(r) || r.length !== 2 || typeof r[0] !== "number" || r[0] < 1 || typeof r[1] !== "string" || !r[1].trim()) { malformed = true; return; }
      names[r[1].trim().toLowerCase()] = true;
    });
    var count = Object.keys(names).length;
    var same = count === sourceNames.length && sourceNames.every(function (name) { return names[name] === true; });
    add("dataset mobile " + label, !malformed && rows.length === count && count >= 2 && same,
      malformed ? "Format baris harus [nomor, nama petugas]" : !same
        ? "Hasil pembaca mobile berbeda dari sheet wajib; periksa sheet alias/duplikat"
        : rows.length !== count ? "Hasil pembaca mobile mengandung nama duplikat"
        : count + " petugas unik siap dibaca sinkronisasi APK; nama tidak dicetak di log");
  } catch (e) { add("dataset mobile " + label, false, e.message); }
  return checks;
}

function jalankanAuditPredeoloymobile() {
  return auditPredeployMobile_();
}
