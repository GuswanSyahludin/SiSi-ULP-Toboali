/* SISI-REAUDIT-003/004: SISI is internal to ULP Toboali only. */
(function () {
  var BA_INTERNAL_ULP = "ulp toboali";

  function norm(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function requireSameUlp(args, action) {
    var g = guard_(args, { ulp: true, aksi: action });
    var callerUlp = norm(g && g.ulp);
    if (!callerUlp || callerUlp !== BA_INTERNAL_ULP) {
      audit_(g && g.sesi, action, "", "TOLAK", "SISI hanya untuk ULP Toboali");
      throw new Error("Akses BA hanya tersedia untuk ULP Toboali.");
    }
    return g;
  }

  function tokenFrom(args) {
    return args.length ? args[0] : "";
  }

  var originalList = getDataBeritaAcara;
  getDataBeritaAcara = function (filter) {
    requireSameUlp(arguments, "BA_LIST_SAME_ULP");
    return originalList.call(this, filter || {});
  };

  var originalDownload = unduhFileBa;
  unduhFileBa = function (token, fileId) {
    var g = requireSameUlp(arguments, "BA_DOWNLOAD_SAME_ULP");
    return originalDownload.call(this, g.token || tokenFrom(arguments), fileId);
  };

  function wrapId(original, action) {
    return function (token, idBA) {
      var g = requireSameUlp(arguments, action);
      var id = String(arguments.length >= 2 ? idBA : "").trim();
      if (!id) return { ok: false, message: "idBA wajib diisi." };
      return original.call(this, g.token, id);
    };
  }

  generatePdfBaPengoperasian = wrapId(
    generatePdfBaPengoperasian,
    "BA_PDF_GARDU_SAME_ULP",
  );
  generatePdfBaSwitching = wrapId(
    generatePdfBaSwitching,
    "BA_PDF_SWITCHING_SAME_ULP",
  );
  updateMasterGarduDariBA = wrapId(
    updateMasterGarduDariBA,
    "BA_MASTER_SYNC_SAME_ULP",
  );

  var originalUpload = uploadBaFinal;
  uploadBaFinal = function (request) {
    request = request || {};
    var authArgs = [request.token || ""];
    var g = requireSameUlp(authArgs, "BA_FINAL_UPLOAD_SAME_ULP");
    var secured = { token: g.token };
    Object.keys(request).forEach(function (key) {
      if (key !== "token") secured[key] = request[key];
    });
    return originalUpload.call(this, secured);
  };
})();
