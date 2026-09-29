/* T-09 / H-05: optimistic concurrency for Master Gardu edits. */
var T09_MASTER_GARDU_REV_PREFIX = "SISI_MASTER_GARDU_REV|";

function _t09RevisionKey_(ulp, gardu) {
  return T09_MASTER_GARDU_REV_PREFIX +
    encodeURIComponent(String(ulp || "").trim().toLowerCase()) +
    "|" + encodeURIComponent(String(gardu || "").trim().toLowerCase());
}
function _t09Revision_(ulp, gardu) {
  try {
    var value = Number(PropertiesService.getScriptProperties().getProperty(_t09RevisionKey_(ulp, gardu)) || 0);
    return isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  } catch (e) { return 0; }
}
function _t09SetRevision_(ulp, gardu, revision) {
  PropertiesService.getScriptProperties().setProperty(_t09RevisionKey_(ulp, gardu), String(Math.max(0, Math.floor(Number(revision) || 0))));
}

var _t09GetMasterOriginal_ = getMasterGarduMobile;
getMasterGarduMobile = function (token, ulpDiminta) {
  var result = _t09GetMasterOriginal_(token, ulpDiminta);
  if (!result || result.success !== true || !Array.isArray(result.list)) return result;
  result.list = result.list.map(function (row) {
    var copy = {};
    for (var key in row) copy[key] = row[key];
    copy.serverRevision = _t09Revision_(copy.ulp, copy.gardu);
    return copy;
  });
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
    var expected = Number(payload.serverRevision);
    var current = _t09Revision_(effectiveUlp, gardu);
    if (expected !== current) {
      return {
        success: false,
        conflict: true,
        code: "MASTER_GARDU_CONFLICT",
        serverRevision: current,
        message: "Data Gardu sudah berubah di perangkat lain. Muat ulang Master Gardu sebelum mengirim edit.",
      };
    }
    var result = _t09UpdateMasterOriginal_(token, payload);
    if (!result || result.success !== true) return result;
    var next = current + 1;
    _t09SetRevision_(effectiveUlp, gardu, next);
    result.serverRevision = next;
    result.conflict = false;
    return result;
  }, 30000);
};
