/* T-09 / H-05: optimistic concurrency for Master Gardu edits. */
var T09_MASTER_GARDU_REV_PREFIX = "SISI_MASTER_GARDU_REV|";

function _t09RevisionKey_(ulp, gardu) {
  return (
    T09_MASTER_GARDU_REV_PREFIX +
    String(ulp || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") +
    "|" +
    String(gardu || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")
  );
}

function _t09Revision_(ulp, gardu) {
  try {
    return Number(
      PropertiesService.getScriptProperties().getProperty(
        _t09RevisionKey_(ulp, gardu),
      ) || 0,
    );
  } catch (e) {
    return 0;
  }
}

function _t09SetRevision_(ulp, gardu, revision) {
  PropertiesService.getScriptProperties().setProperty(
    _t09RevisionKey_(ulp, gardu),
    String(revision),
  );
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
  payload = payload || {};
  var gardu = String(payload.gardu || "").trim();
  var ulp = String(payload.ulp || "").trim();
  var expected = Number(payload.serverRevision);
  if (!isFinite(expected) || expected < 0) expected = 0;
  var current = _t09Revision_(ulp, gardu);
  if (expected !== current) {
    return {
      success: false,
      conflict: true,
      code: "MASTER_GARDU_CONFLICT",
      serverRevision: current,
      message:
        "Data Gardu sudah berubah di perangkat lain. Muat ulang Master Gardu sebelum mengirim edit.",
    };
  }
  var result = _t09UpdateMasterOriginal_(token, payload);
  if (!result || result.success !== true) return result;
  var next = current + 1;
  _t09SetRevision_(ulp, gardu, next);
  result.serverRevision = next;
  result.conflict = false;
  return result;
};
