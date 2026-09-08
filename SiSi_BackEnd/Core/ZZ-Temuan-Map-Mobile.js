/* Mobile extension for Peta Temuan actions. Keeps the existing gateway intact. */
function temuanMapMobile_(token, payload) {
  payload = payload || {};
  var g = guard_([{ token: token }], { ulp: true, aksi: "temuanMapMobile" });
  var command = String(payload.cmd || "").trim();
  if (command === "teams") {
    var targetUlp = ulpScope_(g, payload.ulp);
    var rows = typeof getListTimByUlp === "function" ? getListTimByUlp(targetUlp) : [];
    var list = [], seen = {};
    rows.forEach(function (row) {
      var name = String((row && (row.namaTim || row.nama || row.tim)) || "").trim();
      var key = name.toLowerCase();
      if (name && !seen[key]) { seen[key] = true; list.push(name); }
    });
    list.sort();
    return { success: true, list: list };
  }
  if (command === "forward") {
    var code = String(payload.kodePekerjaan || "").trim();
    var team = String(payload.timEksekusi || "").trim();
    if (!code || !team) return { success: false, message: "Temuan dan tim tujuan wajib dipilih." };
    var result = setPilihTimTemuan({
      token: g.token,
      kodePekerjaan: code,
      timPelaksana: team,
      username: g.username,
      ulp: g.ulp,
      catatanSpv: String(payload.catatan || "Penerusan melalui Peta Temuan mobile"),
    });
    return result === true
      ? { success: true, message: "Temuan diteruskan ke " + team + "." }
      : { success: false, message: String((result && result.message) || "Penerusan temuan gagal.") };
  }
  return { success: false, message: "Perintah Peta Temuan tidak dikenal." };
}

var _temuanMapOriginalMasterGarduMobile_ = getMasterGarduMobile;
getMasterGarduMobile = function (token, ulpDiminta) {
  var raw = String(ulpDiminta || "");
  if (raw.indexOf("TEMUAN_MAP:") !== 0) {
    return _temuanMapOriginalMasterGarduMobile_.apply(this, arguments);
  }
  var payload = {};
  try { payload = JSON.parse(raw.substring("TEMUAN_MAP:".length)); }
  catch (e) { return { success: false, message: "Permintaan Peta Temuan tidak valid." }; }
  try { return temuanMapMobile_(token, payload); }
  catch (e) { return { success: false, message: String(e.message || e) }; }
};
