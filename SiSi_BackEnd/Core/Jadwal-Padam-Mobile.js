/* Mobile gateway for the existing Jadwal Padam domain flow. */
var JADWAL_PADAM_MOBILE_ACTIONS = [
  "getMobileJadwalPadamMaster",
  "getMobileJadwalPadamList",
  "getMobileJadwalPadamCalendar",
  "simpanMobileJadwalPadam",
  "updateMobileJadwalPadam",
  "updateMobileStatusJadwalPadam",
  "getMobileJadwalPadamWaText",
];

function jadwalPadamMobileRouter_(e, body) {
  var p = (e && e.parameter) || {};
  var data = body || p;
  var action = String(data.action || p.action || "").trim();
  if (JADWAL_PADAM_MOBILE_ACTIONS.indexOf(action) < 0) return null;

  var token = String(data.token || p.token || "").trim();
  var sesi = typeof getSesiByToken === "function" ? getSesiByToken(token) : null;
  if (!sesi) return { success: false, ok: false, message: "Sesi habis, silakan login ulang." };

  var params = {};
  for (var key in p) params[key] = p[key];
  if (body) for (var bodyKey in body) params[bodyKey] = body[bodyKey];
  if (!params.ulp && String(sesi.role || "").trim() !== "Super User") params.ulp = sesi.ulp || "";
  params.token = token;

  switch (action) {
    case "getMobileJadwalPadamMaster":
      return getJadwalPadamMaster(params);
    case "getMobileJadwalPadamList":
      return getJadwalPadamList(params);
    case "getMobileJadwalPadamCalendar":
      return getJadwalPadamCalendarMonth(params);
    case "simpanMobileJadwalPadam":
      return simpanJadwalPadam(params);
    case "updateMobileJadwalPadam":
      return updateJadwalPadam(params);
    case "updateMobileStatusJadwalPadam":
      return updateStatusJadwalPadam(params);
    case "getMobileJadwalPadamWaText":
      return getJadwalPadamWaText(params);
    default:
      return null;
  }
}
