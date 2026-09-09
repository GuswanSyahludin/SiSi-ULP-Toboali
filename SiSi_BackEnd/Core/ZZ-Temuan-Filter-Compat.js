/* Token-aware compatibility for every Temuan Inspeksi filter path.
   SisiRun adds the token to object payloads and prepends it to primitive calls. */
function _tiFilterScope_(args, requestedUlp, action) {
  var g = guard_(args, { ulp: true, aksi: action });
  return { g: g, ulp: ulpScope_(g, requestedUlp) || g.ulp };
}

function _tiIsoDate_(value) {
  var text = String(value || "").trim();
  if (!text) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "INVALID";
}

function getListTemuanTerpakaiIns(token, ulp) {
  try {
    var scoped = _tiFilterScope_(
      arguments,
      ulp,
      "getListTemuanTerpakaiIns",
    );
    var u = String(scoped.ulp || "").trim().toLowerCase();
    var ck = "ins_temuan_dipakai_v3_" + (u || "all");
    var cache = CacheService.getScriptCache();
    var hit = cache.get(ck);
    if (hit) return JSON.parse(hit);

    var C = COL_INS.TEMUAN;
    var vals = _readSheetDual_(
      SHEET_INS.TEMUAN,
      C.kodePekerjaan,
      C.temuan + 1,
    );
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

function getTitikPetaTemuanIns(filter) {
  try {
    filter = filter || {};
    var scoped = _tiFilterScope_(
      arguments,
      filter.ulp,
      "getTitikPetaTemuanIns",
    );
    var fUlp = String(scoped.ulp || "").trim().toLowerCase();
    var fDari = _tiIsoDate_(filter.tglDari);
    var fSampai = _tiIsoDate_(filter.tglSampai);
    if (fDari === "INVALID" || fSampai === "INVALID")
      return { ok: false, error: "Format tanggal filter tidak valid.", list: [] };
    if (fDari && fSampai && fDari > fSampai)
      return { ok: false, error: "Tanggal Dari tidak boleh melewati Tanggal Sampai.", list: [] };

    var fPeny = String(filter.penyulang || "").trim().toLowerCase();
    var fTemuan = String(filter.temuan || "").trim().toLowerCase();
    var fStatus = String(filter.status || "").trim().toLowerCase();
    var ck = "ins_peta_v2_" +
      [fUlp, fDari, fSampai, fPeny, fTemuan, fStatus].join("|");
    var cache = CacheService.getScriptCache();
    var hit = cache.get(ck);
    if (hit) return JSON.parse(hit);

    var C = COL_INS.TEMUAN;
    var values = _readSheetDual_(
      SHEET_INS.TEMUAN,
      C.kodePekerjaan,
      C.status + 1,
    );
    var list = [], tanpaKoordinat = 0;
    var total = 0, belum = 0, proses = 0, selesai = 0;

    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var kode = String(row[C.kodePekerjaan] || "").trim();
      if (!kode) continue;
      var rowUlp = String(row[C.ulp] || "").trim().toLowerCase();
      var tanggal = _normTgl(row[C.tanggal]);
      var penyulang = String(row[C.penyulang] || "").trim();
      var temuan = String(row[C.temuan] || "").trim();
      var status = _statusTemuanIns(row[C.status]);

      if (fUlp && rowUlp !== fUlp) continue;
      if (!_insInRange(tanggal, fDari, fSampai)) continue;
      if (fPeny && penyulang.toLowerCase() !== fPeny) continue;
      if (fTemuan && temuan.toLowerCase() !== fTemuan) continue;

      total++;
      if (status === STATUS_INS.SELESAI) selesai++;
      else if (status === "Belum Ada Tim") belum++;
      else proses++;
      if (fStatus && status.toLowerCase() !== fStatus) continue;

      var lat = parseFloat(row[C.lat]), lng = parseFloat(row[C.long]);
      if (isNaN(lat) || isNaN(lng)) {
        var parts = String(row[C.koordinat] || "").split(",");
        if (parts.length >= 2) {
          lat = parseFloat(parts[0]);
          lng = parseFloat(parts[1]);
        }
      }
      var hasCoordinates = !(isNaN(lat) || isNaN(lng) ||
        (lat === 0 && lng === 0));
      if (!hasCoordinates) tanpaKoordinat++;
      var isGardu = String(row[C.objekInspeksi] || "")
        .toLowerCase().indexOf("gardu") >= 0;
      list.push({
        k: kode,
        a: hasCoordinates ? lat : null,
        o: hasCoordinates ? lng : null,
        t: tanggal,
        p: penyulang,
        s: String(row[C.section] || "").trim(),
        m: temuan,
        r: String(row[C.tier] || "").trim(),
        st: status,
        g: isGardu ? 1 : 0,
        n: isGardu
          ? String(row[C.nomorGardu] || "").trim()
          : String(row[C.nomorTiang] || "").trim(),
      });
    }
    list.sort(function (a, b) {
      return String(b.t).localeCompare(String(a.t)) ||
        String(a.k).localeCompare(String(b.k));
    });
    var result = {
      ok: true,
      list: list,
      summary: { total: total, belum: belum, proses: proses, selesai: selesai },
      jumlah: list.length,
      tanpaKoordinat: tanpaKoordinat,
    };
    try {
      var json = JSON.stringify(result);
      if (json.length < 95000) cache.put(ck, json, 300);
    } catch (_) {}
    return result;
  } catch (e) {
    return {
      ok: false,
      error: String((e && e.message) || e),
      list: [],
      summary: { total: 0, belum: 0, proses: 0, selesai: 0 },
      jumlah: 0,
      tanpaKoordinat: 0,
    };
  }
}

function getMonitoringTemuanDetailIns(token, kodePekerjaan) {
  try {
    var scoped = _tiFilterScope_(
      arguments,
      "",
      "getMonitoringTemuanDetailIns",
    );
    var C = COL_INS.TEMUAN;
    var key = String(kodePekerjaan || "").trim();
    if (!key) return { ok: false, error: "Kode pekerjaan kosong." };
    var rows = _readSheetDual_(
      SHEET_INS.TEMUAN,
      C.kodePekerjaan,
      C.folderPath + 1,
    );
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (String(row[C.kodePekerjaan] || "").trim() !== key) continue;
      if (!barisUlpCocok_(scoped.g, row[C.ulp]))
        return { ok: false, error: "Temuan bukan milik ULP Anda." };
      return {
        ok: true,
        data: {
          kodePekerjaan: key,
          kodeHeader: String(row[C.kodeHeader] || ""),
          ulp: String(row[C.ulp] || ""),
          tanggal: _normTgl(row[C.tanggal]),
          timInspeksi: String(row[C.timInspeksi] || ""),
          objek: String(row[C.objekInspeksi] || ""),
          penyulang: String(row[C.penyulang] || ""),
          section: String(row[C.section] || ""),
          segmen: String(row[C.segmen] || ""),
          nomorTiang: String(row[C.nomorTiang] || ""),
          nomorGardu: String(row[C.nomorGardu] || ""),
          tier: String(row[C.tier] || ""),
          temuan: String(row[C.temuan] || ""),
          deskripsi: String(row[C.deskripsi] || ""),
          koordinat: String(row[C.koordinat] || ""),
          status: _statusTemuanIns(row[C.status]),
          timEksekusi: String(row[C.timEksekusi] || ""),
          catatan: String(row[C.catatan] || ""),
          jenisPekerjaan: String(row[C.jenisPekerjaan] || ""),
          tglSelesai: _normTgl(row[C.tglSelesai]),
          fotoTemuanUrl: String(row[C.fotoTemuanUrl] || ""),
          fotoTiangUrl: String(row[C.fotoTiangUrl] || ""),
          fotoPekerjaanUrl: String(row[C.fotoPekerjaanUrl] || ""),
          fotoSesudahUrl: String(row[C.fotoSesudahUrl] || ""),
        },
      };
    }
    return { ok: false, error: "Temuan tidak ditemukan: " + key };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}
