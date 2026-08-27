/* Jalankan auditPredeployMobile_() dari editor sebelum membuat deployment. Read-only. */
function auditPredeployMobile_() {
  var checks = [],
    add = function (name, ok, detail) {
      checks.push({ name: name, ok: !!ok, detail: String(detail || "") });
    };
  function fn(name) {
    var ok = false;
    try {
      ok = eval("typeof " + name + ' === "function"');
    } catch (e) {}
    add("function " + name, ok, ok ? "tersedia" : "TIDAK DITEMUKAN");
    return ok;
  }

  [
    "apiRouter_",
    "authPerangkatRouter_",
    "loginPerangkat",
    "cekPerangkat",
    "getMasterGarduMobile",
    "updateMasterGarduMobile",
    "getListTemuanMobile_",
    "syncPaketInsGarduMobile_",
    "simpanHeaderInsGardu",
    "simpanRealisasiInsGardu",
    "simpanTemuanGardu",
    "recalcWaInsGarduByHeader",
    "urlFotoBaku_",
  ].forEach(fn);

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    [
      "db_Users",
      "db_Global_Header",
      "db_InsDu_Realisasi",
      "db_INS_Temuan",
      "db_List_Temuan",
      "db_ROW_Eksekusi",
    ].forEach(function (n) {
      add("sheet " + n, !!ss.getSheetByName(n), ss.getName());
    });
  } catch (e) {
    add("spreadsheet utama", false, e.message);
  }

  try {
    var cfg =
      typeof MASTER_GARDU_MOBILE !== "undefined" ? MASTER_GARDU_MOBILE : null;
    var sh =
      cfg && SpreadsheetApp.openById(cfg.spreadsheetId).getSheetByName(cfg.tab);
    add(
      "Master_Gardu eksternal",
      !!sh,
      sh ? sh.getLastRow() + " baris" : "tidak ditemukan",
    );
  } catch (e) {
    add("Master_Gardu eksternal", false, e.message);
  }

  try {
    var loginGuard = loginPerangkat("", "", "audit");
    add(
      "validasi login kosong",
      loginGuard && loginGuard.success === false,
      loginGuard && loginGuard.message,
    );
  } catch (e) {
    add("validasi login kosong", false, e.message);
  }

  var gagal = checks.filter(function (c) {
    return !c.ok;
  });
  var result = {
    ok: gagal.length === 0,
    total: checks.length,
    lulus: checks.length - gagal.length,
    gagal: gagal.length,
    checks: checks,
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
