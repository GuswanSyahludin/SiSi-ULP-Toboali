/* Token-aware Temuan Inspeksi team assignment compatibility.
   Loaded after legacy endpoints so the secure signatures are authoritative. */
function getListTimByUlp(token, ulp) {
  try {
    var g = guard_(arguments, { ulp: true, aksi: "getListTimByUlp" });
    var scope = ulpScope_(g, ulp) || g.ulp;
    var normalized = String(scope || "").trim().toLowerCase();
    var cacheKey = "ins_tim_v2_" + (normalized || "all");
    return _cacheIns(cacheKey, 600, function () {
      var rows = _readSheetIns(SHEET_INS.TIM);
      var seen = {}, list = [];
      for (var i = 0; i < rows.length; i++) {
        var rowUlp = String(rows[i][1] || "").trim();
        var name = String(rows[i][3] || "").trim();
        if (!name) continue;
        if (normalized && rowUlp.toLowerCase() !== normalized) continue;
        var key = name.toLowerCase();
        if (seen[key]) continue;
        seen[key] = true;
        list.push({ namaTim: name, ulp: rowUlp });
      }
      list.sort(function (a, b) {
        return a.namaTim.localeCompare(b.namaTim);
      });
      return list;
    });
  } catch (e) {
    return [];
  }
}

function setPilihTimTemuan(params) {
  params = params || {};
  var g = guard_(arguments, { ulp: true, aksi: "setPilihTimTemuan" });
  var C = COL_INS.TEMUAN;
  var code = String(params.kodePekerjaan || "").trim();
  var team = String(params.timPelaksana || params.timEksekusi || "").trim();
  if (!code) throw new Error("Kode pekerjaan kosong.");
  if (!team) throw new Error("Tim pelaksana kosong.");

  var location = _findRowTemuan(code);
  if (!location) throw new Error("Temuan tidak ditemukan: " + code);
  var row = location.sheet
    .getRange(location.row, 1, 1, location.sheet.getLastColumn())
    .getValues()[0];
  if (!barisUlpCocok_(g, row[C.ulp]))
    throw new Error("Temuan bukan milik ULP Anda.");

  var allowed = getListTimByUlp(g.token, String(row[C.ulp] || ""));
  var valid = allowed.some(function (item) {
    return String(item.namaTim || "").trim().toLowerCase() === team.toLowerCase();
  });
  if (!valid) throw new Error("Tim pelaksana tidak terdaftar pada ULP temuan.");

  location.sheet.getRange(location.row, C.timEksekusi + 1).setValue(team);
  location.sheet.getRange(location.row, C.forwardBy + 1).setValue(g.username);
  location.sheet.getRange(location.row, C.tglForward + 1).setValue(new Date());
  location.sheet.getRange(location.row, C.status + 1).setValue(STATUS_INS.PROGRESS);
  if (params.catatanSpv != null)
    location.sheet.getRange(location.row, C.catatan + 1)
      .setValue(safeCell_(String(params.catatanSpv || "")));
  return { ok: true, timEksekusi: team, status: STATUS_INS.PROGRESS };
}
