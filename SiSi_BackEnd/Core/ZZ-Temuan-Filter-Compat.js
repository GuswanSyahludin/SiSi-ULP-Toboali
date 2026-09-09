/* Token-aware compatibility for Temuan Inspeksi primitive dropdown calls.
   SisiRun prepends the session token before primitive arguments. */
function getListTemuanTerpakaiIns(token, ulp) {
  try {
    var g = guard_(arguments, {
      ulp: true,
      aksi: "getListTemuanTerpakaiIns",
    });
    var scope = ulpScope_(g, ulp) || g.ulp;
    var u = String(scope || "").trim().toLowerCase();
    var ck = "ins_temuan_dipakai_v2_" + (u || "all");
    var cache = CacheService.getScriptCache();
    var hit = cache.get(ck);
    if (hit) return JSON.parse(hit);

    var C = COL_INS.TEMUAN;
    var vals = _readSheetDual_(
      SHEET_INS.TEMUAN,
      C.kodePekerjaan,
      C.temuan + 1,
    );
    if (!vals.length) return { ok: true, list: [] };

    var seen = {}, list = [];
    for (var i = 0; i < vals.length; i++) {
      if (u && String(vals[i][C.ulp] || "").trim().toLowerCase() !== u)
        continue;
      var nama = String(vals[i][C.temuan] || "").trim();
      var key = nama.toLowerCase();
      if (!nama || seen[key]) continue;
      seen[key] = true;
      list.push(nama);
    }
    list.sort(function (a, b) { return a.localeCompare(b); });
    var result = { ok: true, list: list };
    try { cache.put(ck, JSON.stringify(result), 600); } catch (_) {}
    return result;
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e), list: [] };
  }
}
