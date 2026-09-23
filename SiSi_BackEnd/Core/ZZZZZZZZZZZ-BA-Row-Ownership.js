/* Stage 3: BA ownership is resolved by idBA in the fixed Toboali BA sources.
 * idBA is the row key, not an ownership value. A missing, foreign, or ambiguous row fails closed.
 * This file is intentionally late-loaded, after the existing BA auth wrappers.
 */
(function installBaRowOwnership_(root) {
  var INTERNAL_ULP = "ulp toboali";
  var FILE_ALIASES = [
    "File PDF URL", "File PDF Non-TTD", "Link PDF", "PDF URL", "File ID",
    "File PDF ID", "ID File PDF", "BA TTD", "Link BA TTD", "Link BA", "linkBaTtd"
  ];

  function norm_(value) {
    return String(value == null ? "" : value).trim().toLowerCase().replace(/\s+/g, " ");
  }
  function key_(value) { return norm_(value).replace(/[^a-z0-9]/g, ""); }
  function id_(value) { return norm_(value); }
  function driveId_(value) {
    var text = String(value == null ? "" : value).trim();
    var match = text.match(/\/d\/([a-zA-Z0-9_-]+)/) || text.match(/[?&]id=([a-zA-Z0-9_-]+)/) || text.match(/^([a-zA-Z0-9_-]{10,})$/);
    return match ? match[1] : "";
  }
  function pick_(headers, aliases) {
    var map = {};
    for (var i = 0; i < headers.length; i++) {
      var k = key_(headers[i]);
      if (k && map[k] == null) map[k] = i;
    }
    for (var j = 0; j < aliases.length; j++) {
      var idx = map[key_(aliases[j])];
      if (idx != null) return idx;
    }
    return -1;
  }
  function session_(args, action) {
    var g = guard_(args, { ulp: true, aksi: action });
    if (norm_(g && g.ulp) !== INTERNAL_ULP) {
      audit_(g && g.sesi, action, "", "TOLAK", "BA hanya untuk ULP Toboali");
      throw new Error("Akses BA hanya tersedia untuk ULP Toboali.");
    }
    return g;
  }
  function _readSheet_(source) {
    if (!source || !source.spreadsheetId || !source.sheetName) return null;
    var ss = SpreadsheetApp.openById(source.spreadsheetId);
    var sh = typeof _baResolveSheet_ === "function" ? _baResolveSheet_(ss, source.sheetName) : ss.getSheetByName(source.sheetName);
    if (!sh) return null;
    return { sheet: sh, values: sh.getDataRange().getValues() };
  }
  function _findInSheet_(source, target) {
    var data = _readSheet_(source);
    if (!data || !data.values.length) return { found: false };
    var headerRow = -1, idCol = -1, ulpCol = -1;
    for (var r = 0; r < Math.min(data.values.length, 40); r++) {
      idCol = pick_(data.values[r], ["idBA", "ID BA", "Nomor BA", "No BA", "NO BA Full"]);
      if (idCol >= 0) {
        headerRow = r;
        ulpCol = pick_(data.values[r], ["ULP", "Nama ULP", "Unit Layanan Pelanggan", "Kode ULP"]);
        break;
      }
    }
    if (headerRow < 0 || ulpCol < 0) return { found: false, reason: "Kolom ULP BA tidak tersedia." };
    var matches = [];
    for (var row = headerRow + 1; row < data.values.length; row++) {
      if (id_(data.values[row][idCol]) === target) matches.push(row);
    }
    if (matches.length !== 1) return { found: false, ambiguous: matches.length > 1, reason: matches.length > 1 ? "idBA tidak unik." : "Baris BA tidak ditemukan." };
    var values = data.values[matches[0]];
    var ownerUlp = norm_(values[ulpCol]);
    if (ownerUlp !== INTERNAL_ULP) return { found: false, foreign: true, reason: "Baris BA bukan milik ULP Toboali." };
    return { found: true, source: source, sheet: data.sheet, values: values, headers: data.values[headerRow], sheetRow: matches[0] + 1, headerRow: headerRow };
  }
  function resolve_(idBA) {
    var target = id_(idBA);
    if (!target) return { found: false, reason: "idBA wajib diisi." };
    var sources = [];
    if (typeof BA_SOURCE !== "undefined") sources.push(BA_SOURCE);
    if (typeof SW_SOURCE !== "undefined" && (!BA_SOURCE || SW_SOURCE.spreadsheetId !== BA_SOURCE.spreadsheetId || SW_SOURCE.sheetName !== BA_SOURCE.sheetName)) sources.push(SW_SOURCE);
    var hits = [];
    for (var i = 0; i < sources.length; i++) {
      var hit = _findInSheet_(sources[i], target);
      if (hit.found) hits.push(hit);
      else if (hit.ambiguous || hit.foreign) return hit;
    }
    if (hits.length !== 1) return { found: false, reason: "Baris BA tidak ditemukan atau tidak unik." };
    return hits[0];
  }
  function requireRow_(args, idBA, action) {
    var g = session_(args, action);
    var row = resolve_(idBA);
    if (!row.found) {
      audit_(g && g.sesi, action, idBA, "TOLAK", row.reason);
      throw new Error(row.reason);
    }
    return { guard: g, row: row };
  }
  root._stage3RequireBaRow_ = function (args, idBA, action) {
    return requireRow_(args, idBA, action || "BA_ROW_OWNERSHIP");
  };
  function fileBelongsToRow_(row, fileId) {
    var wanted = driveId_(fileId);
    if (!wanted || !row || !row.headers || !row.values) return false;
    for (var i = 0; i < row.headers.length; i++) {
      if (FILE_ALIASES.indexOf(String(row.headers[i]).trim()) < 0 && !/pdf|ttd|link|file/i.test(String(row.headers[i]))) continue;
      if (driveId_(row.values[i]) === wanted) return true;
    }
    return false;
  }

  var previousList = root.getDataBeritaAcara;
  root.getDataBeritaAcara = function (filter) {
    session_(arguments, "BA_LIST_ROW_OWNERSHIP");
    return previousList.apply(this, arguments);
  };
  function wrapId_(name, action) {
    var previous = root[name];
    root[name] = function (token, idBA) {
      var value = String(idBA == null ? "" : idBA).trim();
      if (!value) return { ok: false, message: "idBA wajib diisi." };
      requireRow_(arguments, value, action);
      return previous.apply(this, arguments);
    };
  }
  wrapId_("generatePdfBaPengoperasian", "BA_PDF_GARDU_ROW_OWNERSHIP");
  wrapId_("generatePdfBaSwitching", "BA_PDF_SWITCHING_ROW_OWNERSHIP");
  wrapId_("updateMasterGarduDariBA", "BA_MASTER_SYNC_ROW_OWNERSHIP");

  var previousUpload = root.uploadBaFinal;
  root.uploadBaFinal = function (request) {
    request = request || {};
    var value = String(request.idBA == null ? "" : request.idBA).trim();
    if (!value) return { ok: false, message: "idBA wajib diisi." };
    requireRow_([request], value, "BA_FINAL_UPLOAD_ROW_OWNERSHIP");
    return previousUpload.call(this, request);
  };

  var previousDownload = root.unduhFileBa;
  root.unduhFileBa = function (token, idBA, fileId) {
    var value = String(idBA == null ? "" : idBA).trim();
    if (!value || !String(fileId == null ? "" : fileId).trim()) return { ok: false, code: "BA_ROW_REQUIRED", message: "idBA dan fileId wajib diisi." };
    var checked = requireRow_(arguments, value, "BA_DOWNLOAD_ROW_OWNERSHIP");
    if (!fileBelongsToRow_(checked.row, fileId)) {
      audit_(checked.guard && checked.guard.sesi, "BA_DOWNLOAD_ROW_OWNERSHIP", fileId, "TOLAK", "file tidak terikat ke idBA");
      return { ok: false, code: "FILE_NOT_AUTHORIZED", message: "File BA tidak terdaftar pada idBA yang diminta." };
    }
    return previousDownload.call(this, token, fileId);
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
