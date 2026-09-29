/* T-09 / H-05: optimistic concurrency for Master Gardu edits. */
var T09_MASTER_GARDU_REV_PREFIX = "SISI_MASTER_GARDU_REV|";

function _t09RevisionKey_(ulp, gardu) {
  return T09_MASTER_GARDU_REV_PREFIX +
    encodeURIComponent(String(ulp || "").trim().toLowerCase()) +
    "|" + encodeURIComponent(String(gardu || "").trim().toLowerCase());
}
function _t09ReadRevision_(ulp, gardu) {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(_t09RevisionKey_(ulp, gardu));
    if (raw === null || raw === "") return { ok: true, value: 0 };
    var value = Number(raw);
    if (!isFinite(value) || value < 0 || Math.floor(value) !== value) {
      return { ok: false, message: "Revision Master Gardu tidak valid." };
    }
    return { ok: true, value: value };
  } catch (e) {
    return { ok: false, message: "Penyimpanan revision Master Gardu tidak tersedia." };
  }
}
function _t09SetRevision_(ulp, gardu, revision) {
  try {
    PropertiesService.getScriptProperties().setProperty(
      _t09RevisionKey_(ulp, gardu), String(Math.max(0, Math.floor(Number(revision) || 0))));
    return { ok: true };
  } catch (e) {
    return { ok: false, message: "Penyimpanan revision Master Gardu tidak tersedia." };
  }
}

var _t09GetMasterOriginal_ = getMasterGarduMobile;
getMasterGarduMobile = function (token, ulpDiminta) {
  var result = _t09GetMasterOriginal_(token, ulpDiminta);
  if (!result || result.success !== true || !Array.isArray(result.list)) return result;
  var revisionError = null;
  result.list = result.list.map(function (row) {
    var copy = {};
    for (var key in row) copy[key] = row[key];
    var revision = _t09ReadRevision_(copy.ulp, copy.gardu);
    if (!revision.ok) revisionError = revision.message;
    copy.serverRevision = revision.value;
    return copy;
  });
  if (revisionError) return { success: false, message: revisionError };
  return result;
};

var _t09UpdateMasterOriginal_ = updateMasterGarduMobile;
updateMasterGarduMobile = function (token, payload) {
  if (typeof withLock_ !== "function") {
    return { success: false, message: "Lock otorisasi tidak tersedia; update Gardu ditolak." };
  }
  payload = payload || {};
  if (payload.serverRevision === undefined || payload.serverRevision === null ||
      !/^\d+$/.test(String(payload.serverRevision).trim())) {
    return {
      success: false,
      code: "MASTER_GARDU_REVISION_REQUIRED",
      message: "Revisi dasar Master Gardu wajib dikirim; muat ulang data sebelum mengedit.",
    };
  }
  var sesi = typeof getSesiByToken === "function" ? getSesiByToken(String(token || "").trim()) : null;
  var role = sesi ? (typeof _normRole_ === "function" ? _normRole_(sesi.role) : String(sesi.role || "").trim().toLowerCase()) : "";
  var superUser = role === "SUPER" || role === "super user";
  var effectiveUlp = superUser
    ? String(payload.ulp || (sesi && sesi.ulp) || "").trim()
    : String((sesi && sesi.ulp) || payload.ulp || "").trim();
  return withLock_(function () {
    var gardu = String(payload.gardu || "").trim();
    var revision = _t09ReadRevision_(effectiveUlp, gardu);
    if (!revision.ok) return { success: false, message: revision.message };
    var expected = Number(payload.serverRevision);
    if (expected !== revision.value) {
      return {
        success: false,
        conflict: true,
        code: "MASTER_GARDU_CONFLICT",
        serverRevision: revision.value,
        message: "Data Gardu sudah berubah di perangkat lain. Muat ulang Master Gardu sebelum mengirim edit.",
      };
    }
    var next = revision.value + 1;
    var reserved = _t09SetRevision_(effectiveUlp, gardu, next);
    if (!reserved.ok) return { success: false, message: reserved.message };
    var result = _t09UpdateMasterOriginal_(token, payload);
    if (!result || result.success !== true) return result;
    result.serverRevision = next;
    result.conflict = false;
    return result;
  }, 30000);
};
