/* Stage 4: authenticated, row-bound BA photo writes. */
(function installBaPhotoUploadAuth_(root) {
  function secure_(original, request, action) {
    request = request || {};
    var idBA = String(request.idBA == null ? "" : request.idBA).trim();
    if (!idBA) return { ok: false, message: "idBA wajib diisi." };
    if (typeof root._stage3RequireBaRow_ === "function") {
      root._stage3RequireBaRow_([request], idBA, action);
    } else {
      guard_([request], { ulp: true, aksi: action });
    }
    var secured = {};
    Object.keys(request).forEach(function (key) {
      if (key !== "token") secured[key] = request[key];
    });
    if (typeof root._stage4SafePayload_ === "function") {
      secured = root._stage4SafePayload_(secured);
    }
    return original.call(this, secured);
  }

  var originalUpload = root.uploadFotoBeritaAcara;
  root.uploadFotoBeritaAcara = function (request) {
    return secure_.call(this, originalUpload, request, "BA_PHOTO_UPLOAD_ROW_OWNERSHIP");
  };

  var originalUpdate = root.updateFotoBeritaAcaraDetail;
  root.updateFotoBeritaAcaraDetail = function (request) {
    return secure_.call(this, originalUpdate, request, "BA_PHOTO_UPDATE_ROW_OWNERSHIP");
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
