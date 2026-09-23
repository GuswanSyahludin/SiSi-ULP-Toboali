/* Stage 4: authenticated, row-bound BA detail edits with safe Sheet values. */
(function installBaDetailEditAuth_(root) {
  var originalUpdate = root.updateBeritaAcaraDetail;

  root.updateBeritaAcaraDetail = function (request) {
    request = request || {};
    var idBA = String(request.idBA == null ? "" : request.idBA).trim();
    if (!idBA) return { ok: false, message: "idBA wajib diisi." };

    if (typeof root._stage3RequireBaRow_ === "function") {
      root._stage3RequireBaRow_(arguments, idBA, "BA_DETAIL_EDIT_ROW_OWNERSHIP");
    } else {
      guard_(arguments, { ulp: true, aksi: "BA_DETAIL_EDIT_SAME_ULP" });
    }

    var secured = {};
    Object.keys(request).forEach(function (key) {
      if (key !== "token") secured[key] = request[key];
    });
    if (typeof root._stage4SafePayload_ === "function") {
      secured = root._stage4SafePayload_(secured);
    }
    return originalUpdate.call(this, secured);
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
