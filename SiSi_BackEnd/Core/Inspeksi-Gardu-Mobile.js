/* Paket sinkron offline Inspeksi Gardu: role-safe, ULP-safe, idempoten. */
var INS_GARDU_LOCAL_PREFIX = "insGarduLocal_";

function _insLocalGet_(id) {
  var x = PropertiesService.getScriptProperties().getProperty(
    INS_GARDU_LOCAL_PREFIX + String(id || ""),
  );
  if (!x) return "";
  try {
    return JSON.parse(x).kode || "";
  } catch (e) {
    return "";
  }
}
function _insLocalPut_(id, kode, jenis) {
  PropertiesService.getScriptProperties().setProperty(
    INS_GARDU_LOCAL_PREFIX + id,
    JSON.stringify({ kode: kode, jenis: jenis, at: new Date().toISOString() }),
  );
}
function _insBoleh_(sesi) {
  var role = String((sesi && sesi.role) || "")
    .trim()
    .toLowerCase();
  var sub = String((sesi && sesi.subTim) || "")
    .trim()
    .toLowerCase();
  return role === "super user" || role === "admin" || sub === "inspeksi gardu";
}
function _insSuper_(sesi) {
  return (
    String((sesi && sesi.role) || "")
      .trim()
      .toLowerCase() === "super user"
  );
}

function getListTemuanMobile_(token) {
  var sesi = getSesiByToken(String(token || ""));
  if (!sesi) return { success: false, message: "Sesi habis." };
  if (!_insBoleh_(sesi))
    return { success: false, message: "Akses Inspeksi Gardu ditolak." };
  var sh =
    SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("db_List_Temuan");
  if (!sh || sh.getLastRow() < 2) return { success: true, list: [] };
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getDisplayValues(),
    out = [];
  for (var i = 0; i < v.length; i++) {
    if (
      String(v[i][2] || "")
        .trim()
        .toLowerCase() !== "gardu"
    )
      continue;
    out.push({
      no: v[i][0],
      tier: String(v[i][1] || "").trim(),
      objekInspeksi: String(v[i][2] || "").trim(),
      temuan: String(v[i][3] || "").trim(),
    });
  }
  return { success: true, list: out };
}

function syncPaketInsGarduMobile_(token, paket) {
  try {
    var sesi = getSesiByToken(String(token || ""));
    if (!sesi) return { success: false, message: "Sesi habis." };
    if (!_insBoleh_(sesi))
      return { success: false, message: "Akses Inspeksi Gardu ditolak." };

    paket = paket || {};
    var h = paket.header || {},
      gardus = paket.gardus || [];
    var localH = String(h.localId || "").trim();
    if (!localH) return { success: false, message: "localHeaderId kosong." };
    if (gardus.length > 1)
      return { success: false, message: "Maksimal 1 Gardu per request." };
    if (gardus.length && (gardus[0].temuan || []).length > 1)
      return { success: false, message: "Maksimal 1 temuan per request." };

    var targetUlp = _insSuper_(sesi)
      ? String(h.ulp || sesi.ulp || "").trim()
      : String(sesi.ulp || "").trim();
    if (
      !_insSuper_(sesi) &&
      h.ulp &&
      String(h.ulp).trim().toLowerCase() !== targetUlp.toLowerCase()
    )
      return { success: false, message: "ULP paket tidak sesuai sesi." };

    var lock = LockService.getScriptLock(),
      kodeH = _insLocalGet_(localH);
    if (!kodeH) {
      lock.waitLock(30000);
      try {
        kodeH = _insLocalGet_(localH);
        if (!kodeH) {
          var rh = simpanHeaderInsGardu({
            username: sesi.username,
            ulp: targetUlp,
            tanggal: h.tanggal,
            koordinatAwal: h.koordinatAwal,
            koordinatAkhir: h.koordinatAkhir,
            kmAwal: h.kmAwal,
            kmAkhir: h.kmAkhir,
            kendala: h.kendala,
          });
          if (!rh || !rh.ok)
            return {
              success: false,
              message: (rh && rh.message) || "Gagal membuat header.",
            };
          kodeH = rh.kodeHeader;
          _insLocalPut_(localH, kodeH, "header");
        }
      } finally {
        lock.releaseLock();
      }
    }

    var hasilG = [];
    for (var i = 0; i < gardus.length; i++) {
      var g = gardus[i],
        localG = String(g.localId || "").trim();
      if (!localG || !g.nomorGardu || !g.tier)
        return {
          success: false,
          kodeHeader: kodeH,
          message: "Identitas Gardu/Tier tidak lengkap.",
        };
      var master =
        typeof _findGarduByNomor === "function"
          ? _findGarduByNomor(g.nomorGardu)
          : null;
      if (!master)
        return {
          success: false,
          message: "Gardu tidak ditemukan: " + g.nomorGardu,
        };
      if (
        targetUlp &&
        String(master.ulp || "")
          .trim()
          .toLowerCase() !== targetUlp.toLowerCase()
      )
        return { success: false, message: "Gardu berada di ULP lain." };

      var kodeG = _insLocalGet_(localG);
      if (!kodeG) {
        lock.waitLock(30000);
        try {
          kodeG = _insLocalGet_(localG);
          if (!kodeG) {
            var rg = simpanRealisasiInsGardu({
              kodeHeader: kodeH,
              nomorGardu: g.nomorGardu,
              tier: g.tier,
              username: sesi.username,
            });
            if (!rg || !rg.ok)
              return {
                success: false,
                kodeHeader: kodeH,
                message:
                  (rg && rg.message) || "Gagal realisasi " + g.nomorGardu,
              };
            kodeG = rg.kodePekerjaan;
            _insLocalPut_(localG, kodeG, "realisasi");
          }
        } finally {
          lock.releaseLock();
        }
      }

      var hasilT = [],
        ts = g.temuan || [];
      for (var j = 0; j < ts.length; j++) {
        var t = ts[j],
          localT = String(t.localId || "").trim();
        if (!localT || !t.temuan)
          return { success: false, message: "Identitas temuan tidak lengkap." };
        if (!t.fotoTemuanB64 || !t.fotoGarduB64)
          return {
            success: false,
            message: "Dua foto wajib untuk " + t.temuan,
          };
        var kodeT = _insLocalGet_(localT);
        if (!kodeT) {
          lock.waitLock(30000);
          try {
            kodeT = _insLocalGet_(localT);
            if (!kodeT) {
              var rt = simpanTemuanGardu({
                kodeHeader: kodeH,
                nomorGardu: g.nomorGardu,
                temuan: t.temuan,
                deskripsi: t.deskripsi || "",
                username: sesi.username,
                fotoTemuanB64: t.fotoTemuanB64,
                fotoTemuanMime: t.fotoTemuanMime || "image/jpeg",
                fotoGarduB64: t.fotoGarduB64,
                fotoGarduMime: t.fotoGarduMime || "image/jpeg",
              });
              if (!rt || !rt.ok)
                return {
                  success: false,
                  kodeHeader: kodeH,
                  message: (rt && rt.message) || "Gagal temuan " + t.temuan,
                };
              kodeT = rt.kodePekerjaan;
              _insLocalPut_(localT, kodeT, "temuan");
            }
          } finally {
            lock.releaseLock();
          }
        }
        hasilT.push({ localId: localT, kodeTemuan: kodeT });
      }
      hasilG.push({
        localId: localG,
        kodePekerjaanGardu: kodeG,
        temuan: hasilT,
      });
    }
    if (gardus.length)
      try {
        recalcWaInsGarduByHeader(kodeH);
      } catch (eR) {}
    return { success: true, kodeHeader: kodeH, gardus: hasilG };
  } catch (e) {
    return {
      success: false,
      message: "Sync paket Inspeksi Gardu gagal: " + e.message,
    };
  }
}
