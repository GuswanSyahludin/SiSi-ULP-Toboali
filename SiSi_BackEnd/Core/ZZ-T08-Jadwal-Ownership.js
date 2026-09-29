/* T-08 / H-04: one final ownership boundary for Jadwal Padam. */
var _t08WaContext_ = null;

function _t08Payload_(payload, g) {
  var out = {};
  payload = payload || {};
  for (var key in payload) out[key] = payload[key];
  out.ulp = ulpScope_(g, payload.ulp);
  return out;
}

function _t08TargetRow_(kode) {
  var sh = _jpSheet_(JADWAL_PADAM_SHEETS.rekap);
  if (!sh || sh.getLastRow() < 2) return null;
  var headers = _jpHeaders_(sh);
  var map = _jpHeaderMap_(headers);
  var kodeIdx = map[_jpHeaderKey_("Kode Jadwal Padam")];
  var ulpIdx = map[_jpHeaderKey_("ULP")];
  if (kodeIdx == null || ulpIdx == null) return null;
  var values = sh
    .getRange(2, 1, sh.getLastRow() - 1, headers.length)
    .getDisplayValues();
  var hit = null;
  for (var i = 0; i < values.length; i++) {
    if (_jpText_(values[i][kodeIdx]) !== _jpText_(kode)) continue;
    if (hit) return { ambiguous: true };
    hit = { row: i + 2, ulp: _jpText_(values[i][ulpIdx]) };
  }
  return hit;
}

function _t08Owns_(g, target) {
  return !!(target && !target.ambiguous && barisUlpCocok_(g, target.ulp));
}

var _t08GetMasterOriginal_ = getJadwalPadamMaster;
getJadwalPadamMaster = function (params) {
  var g = guard_(arguments, { ulp: true, aksi: "getJadwalPadamMaster" });
  return _t08GetMasterOriginal_(_t08Payload_(params, g));
};

var _t08GetCalendarOriginal_ = getJadwalPadamCalendarMonth;
getJadwalPadamCalendarMonth = function (params) {
  var g = guard_(arguments, {
    ulp: true,
    aksi: "getJadwalPadamCalendarMonth",
  });
  return _t08GetCalendarOriginal_(_t08Payload_(params, g));
};

var _t08GetListOriginal_ = getJadwalPadamList;
getJadwalPadamList = function (params) {
  var g = guard_(arguments, { ulp: true, aksi: "getJadwalPadamList" });
  var p = params || {};
  if (_t08WaContext_ && !p.token) {
    p = _t08Payload_(
      { token: _t08WaContext_.token, ulp: _t08WaContext_.scope },
      g,
    );
    for (var key in params || {}) p[key] = params[key];
    p.token = _t08WaContext_.token;
    p.ulp = _t08WaContext_.scope;
  } else {
    p = _t08Payload_(p, g);
  }
  return _t08GetListOriginal_(p);
};

var _t08GetMasterBebanOriginal_ = getJadwalPadamMasterBeban;
getJadwalPadamMasterBeban = function (params) {
  var g = guard_(arguments, {
    ulp: true,
    aksi: "getJadwalPadamMasterBeban",
  });
  return _t08GetMasterBebanOriginal_(_t08Payload_(params, g));
};

var _t08SaveOriginal_ = simpanJadwalPadam;
simpanJadwalPadam = function (payload) {
  var g = guard_(arguments, { ulp: true, aksi: "simpanJadwalPadam" });
  var p = _t08Payload_(payload, g);
  var master = _jpMaster_(p.penyulang, p.section, g, p.ulp);
  if (!master || !barisUlpCocok_(g, master.ulp))
    return { ok: false, message: "Penyulang dan Section bukan milik ULP Anda." };
  return _t08SaveOriginal_(p);
};

var _t08UpdateOriginal_ = updateJadwalPadam;
updateJadwalPadam = function (payload) {
  var g = guard_(arguments, { ulp: true, aksi: "updateJadwalPadam" });
  var p = _t08Payload_(payload, g);
  var target = _t08TargetRow_(p.kode);
  if (!_t08Owns_(g, target))
    return {
      ok: false,
      message: target && target.ambiguous
        ? "Kode jadwal tidak unik; perubahan ditolak."
        : "Jadwal bukan milik ULP Anda.",
    };
  var master = _jpMaster_(p.penyulang, p.section, g, p.ulp);
  if (!master || !barisUlpCocok_(g, master.ulp))
    return { ok: false, message: "Penyulang dan Section bukan milik ULP Anda." };
  return _t08UpdateOriginal_(p);
};

var _t08StatusOriginal_ = updateStatusJadwalPadam;
updateStatusJadwalPadam = function (payload) {
  var g = guard_(arguments, {
    ulp: true,
    aksi: "updateStatusJadwalPadam",
  });
  var p = _t08Payload_(payload, g);
  var target = _t08TargetRow_(p.kode);
  if (!_t08Owns_(g, target))
    return {
      ok: false,
      message: target && target.ambiguous
        ? "Kode jadwal tidak unik; perubahan ditolak."
        : "Jadwal bukan milik ULP Anda.",
    };
  return _t08StatusOriginal_(p);
};

var _t08DeleteOriginal_ = hapusJadwalPadam;
hapusJadwalPadam = function (payload) {
  var g = guard_(arguments, { ulp: true, aksi: "hapusJadwalPadam" });
  var p = _t08Payload_(payload, g);
  var target = _t08TargetRow_(p.kode);
  if (!_t08Owns_(g, target))
    return {
      ok: false,
      message: target && target.ambiguous
        ? "Kode jadwal tidak unik; penghapusan ditolak."
        : "Jadwal bukan milik ULP Anda.",
    };
  return _t08DeleteOriginal_(p);
};

var _t08WaOriginal_ = getJadwalPadamWaText;
getJadwalPadamWaText = function (params) {
  var g = guard_(arguments, { ulp: true, aksi: "getJadwalPadamWaText" });
  var p = _t08Payload_(params, g);
  _t08WaContext_ = { token: p.token, scope: p.ulp };
  try {
    return _t08WaOriginal_(p);
  } finally {
    _t08WaContext_ = null;
  }
};

var _t08RouterOriginal_ = jadwalPadamMobileRouter_;
jadwalPadamMobileRouter_ = function (e, body) {
  var action = String((body && body.action) || "").trim();
  if (
    typeof JADWAL_PADAM_MOBILE_ACTIONS !== "undefined" &&
    JADWAL_PADAM_MOBILE_ACTIONS.indexOf(action) >= 0 &&
    (!body || !String(body.token || "").trim())
  ) {
    return {
      success: false,
      ok: false,
      message: "Token wajib dikirim dalam body JSON.",
    };
  }
  return _t08RouterOriginal_(e, body);
};
