/* Stage 4: sanitize BA-derived values at the final Master Gardu write boundary. */
(function installBaMasterWriteSafety_(root) {
  function safe_(value) {
    return typeof root._stage4SafePayload_ === "function"
      ? root._stage4SafePayload_(value)
      : value;
  }

  function safeContext_(ctx) {
    if (!ctx) return ctx;
    var out = {};
    Object.keys(ctx).forEach(function (key) { out[key] = ctx[key]; });
    if (ctx.fields) out.fields = safe_(ctx.fields);
    // Coordinates and dates are already normalized by the BA domain guard.
    // Do not prefix negative latitude values such as -2.1 as formula text.
    ["nomorGardu", "tanggalBA", "koordNorm", "koordinatLat", "koordinatLong"].forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(ctx, key)) out[key] = ctx[key];
    });
    return out;
  }

  function safeDetail_(detail) {
    if (!detail) return detail;
    var out = {};
    Object.keys(detail).forEach(function (key) {
      var normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      // Keep date, coordinate, row-index, and identifier values in their domain type.
      if (/tanggal|tgl|koordinat|latitude|longitude|lat$|lng$|index|row|idba|nomor/.test(normalized)) out[key] = detail[key];
      else out[key] = safe_(detail[key]);
    });
    return out;
  }

  var originalApply = root._baTerapkanUpdateMaster_;
  if (typeof originalApply === "function") {
    root._baTerapkanUpdateMaster_ = function (target, ctx) {
      return originalApply.call(this, target, safeContext_(ctx));
    };
  }

  var originalSync = root.syncGarduKeMaster;
  if (typeof originalSync === "function") {
    root.syncGarduKeMaster = function (request) {
      request = request || {};
      var secured = {};
      Object.keys(request).forEach(function (key) {
        if (key !== "token") secured[key] = key === "detail" ? safeDetail_(request[key]) : safe_(request[key]);
      });
      return originalSync.call(this, secured);
    };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
