/* ============================================================================
   Delta-Sync-Mobile.js: manifest + immutable snapshot downloads per module
   Rev 8 Sep 2026
   ============================================================================ */
var DELTA_SYNC_CACHE_SEC = 600;
var DELTA_SYNC_PAGE = 500;
var DELTA_SNAPSHOT_PAGE = 250;
var DELTA_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
var DELTA_SNAPSHOT_ROOT_PROPERTY = "DELTA_SYNC_SNAPSHOT_ROOT_ID";
var DELTA_SNAPSHOT_META = "_meta.json";

function _deltaConfigs_() {
  return {
    db_Global_Header: { sheet: "db_Global_Header", key: 1, width: 17, dual: true, main: true },
    db_ROW_Realisasi: { sheet: "db_ROW_Realisasi", key: 2, width: 13, dual: true, main: true },
    db_ROW_Eksekusi: { sheet: "db_ROW_Eksekusi", key: 3, width: 30, dual: true, main: true },
    db_Hartek_PenyulangGardu: { sheet: "db_Hartek_PenyulangGardu", key: 2, width: 15, dual: true, main: true },
    db_Hartek_Pekerjaan: { sheet: "db_Hartek_Pekerjaan", key: 3, width: 17, dual: true, main: true },
    db_Hartek_Material: { sheet: "db_Hartek_Material", key: 4, width: 19, dual: true, main: true },
    db_InsJar_Realisasi: { sheet: "db_InsJar_Realisasi", key: 2, width: 13, dual: true, main: true },
    db_InsDu_Realisasi: { sheet: "db_InsDu_Realisasi", key: 2, width: 12, dual: true, main: true },
    db_INS_Temuan: { sheet: "db_INS_Temuan", key: 3, width: 45, dual: true, main: true },
    db_Yandal_Shift: { sheet: "db_Yandal_Shift", key: 2, width: 12, dual: true, main: true },
    db_Yandal_P0: { sheet: "db_Yandal_P0", key: 3, width: 50, dual: true, main: true },
    db_Yandal_Pengecekan_Switching: { sheet: "db_Yandal_Pengecekan_Switching", key: 4, width: 50, dual: true, main: true },
    db_Yandal_Pengukuran_Gardu: { special: "yandalUkurGardu", key: 4, width: 24, main: true },
    Teknik_Laporan_Harian: { sheet: "Teknik_Laporan Harian", key: 1, width: 8, dual: true, main: true },
    db_Users: { sheet: "db_Users", key: 2, width: 11, support: true, sanitize: "users" },
    db_Tim: { sheet: "db_Tim", key: 3, width: 0, support: true },
    db_Penyulang: { sheet: "db_Penyulang", key: 2, width: 0, support: true },
    db_List_Temuan: { sheet: "db_List_Temuan", key: 3, width: 0, support: true },
    db_Hartek_List_Pekerjaan: { sheet: "db_Hartek_List_Pekerjaan", key: 1, width: 0, support: true },
    db_Material: { sheet: "db_Material", key: 1, width: 0, support: true },
    db_Yandal_List_P0: { sheet: "db_Yandal_List_P0", key: 1, width: 0, support: true },
    db_List_Petugas_Yandal: { special: "yandalPetugas", support: true },
    db_Section: { sheet: "db_Section", key: 1, width: 0, support: true },
    Master_Gardu: { special: "gardu", support: true },
  };
}

function _deltaPlain_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
  return v == null ? "" : v;
}

function _deltaYandalUkurRows_() {
  if (typeof YANDAL_UKUR_SS_ID === "undefined" || !YANDAL_UKUR_SS_ID)
    throw new Error("Sumber Pengukuran Gardu belum dikonfigurasi.");
  if (typeof _sheetUkurGardu_ !== "function")
    throw new Error("Pencari sheet Pengukuran Gardu tidak tersedia.");
  var sh = _sheetUkurGardu_(SpreadsheetApp.openById(YANDAL_UKUR_SS_ID));
  if (!sh) throw new Error("Sheet Pengukuran Gardu 24 kolom tidak ditemukan.");
  if (sh.getLastColumn() < 24)
    throw new Error("Struktur Pengukuran Gardu tidak valid: dibutuhkan 24 kolom.");
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 24).getValues().map(function (row) {
    return row.map(_deltaPlain_);
  });
}

function _deltaYandalPetugasRows_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID), sh = null, sheets = ss.getSheets();
  var candidates = {
    "db_list_petugas_yandal": true,
    "db_yandal_list_petugas": true,
    "list_petugas_yandal": true,
    "list petugas yandal": true,
  };
  for (var i = 0; i < sheets.length; i++) {
    var normalized = String(sheets[i].getName() || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (candidates[normalized] || candidates[normalized.replace(/ /g, "_")]) {
      sh = sheets[i];
      break;
    }
  }
  if (!sh) throw new Error("Sheet List Petugas Yandal tidak ditemukan.");
  if (sh.getLastRow() < 2) return [];
  var width = sh.getLastColumn(), headers = sh.getRange(1, 1, 1, width).getValues()[0], nameCols = [];
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").trim().toLowerCase();
    if (h.indexOf("petugas") >= 0 || h === "nama" || h === "nama petugas") nameCols.push(c);
  }
  if (!nameCols.length) for (var fallback = 1; fallback < width; fallback++) nameCols.push(fallback);
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues(), out = [], seen = {};
  for (var r = 0; r < data.length; r++) {
    for (var n = 0; n < nameCols.length; n++) {
      var parts = String(data[r][nameCols[n]] || "").trim().replace(/\r/g, "\n").split(/[,;\/&\n]+/);
      for (var q = 0; q < parts.length; q++) {
        var person = String(parts[q] || "").trim(), key = person.toLowerCase();
        if (person && !seen[key]) {
          seen[key] = true;
          out.push([out.length + 1, person]);
        }
      }
    }
  }
  return out;
}

function _deltaRows_(token, name, cfg) {
  if (cfg.special === "gardu") {
    var sesi = getSesiByToken(String(token || ""));
    if (!sesi) throw new Error("Sesi habis.");
    var result = getMasterGarduMobile(token, String(sesi.ulp || ""));
    if (!result || result.success !== true) throw new Error((result && result.message) || "Master Gardu gagal.");
    return (result.list || []).map(function (x) { return x; });
  }
  if (cfg.special === "yandalUkurGardu") return _deltaYandalUkurRows_();
  if (cfg.special === "yandalPetugas") return _deltaYandalPetugasRows_();
  var rows = [];
  if (cfg.dual && typeof _readSheetDual_ === "function") rows = _readSheetDual_(cfg.sheet, cfg.key, cfg.width);
  else {
    var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(cfg.sheet);
    if (!sh || sh.getLastRow() < 2) return [];
    rows = sh.getRange(2, 1, sh.getLastRow() - 1, cfg.width || sh.getLastColumn()).getValues();
  }
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i].map(_deltaPlain_);
    if (cfg.sanitize === "users" && row.length > 3) row[3] = "";
    out.push(row);
  }
  return out;
}

function _deltaDigest_(rows) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(rows),
    Utilities.Charset.UTF_8,
  );
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, "");
}

/* Legacy protocol remains available for APK versions released before snapshots. */
function _deltaManifest_(token, force) {
  var sesi = getSesiByToken(String(token || ""));
  if (!sesi) return { success: false, message: "Sesi habis." };
  var scope = String(sesi.kodeUlp || sesi.ulp || "all").replace(/[^a-zA-Z0-9_-]/g, "_");
  var cache = CacheService.getScriptCache(), ck = "delta_manifest_v1_" + scope;
  if (!force) {
    var hit = cache.get(ck);
    if (hit) try { return JSON.parse(hit); } catch (_) {}
  }
  var cfgs = _deltaConfigs_(), datasets = [], warnings = [];
  Object.keys(cfgs).forEach(function (name) {
    var cfg = cfgs[name];
    try {
      var rows = _deltaRows_(token, name, cfg);
      datasets.push({ name: name, version: _deltaDigest_(rows), count: rows.length, kind: cfg.support ? "support" : "main" });
    } catch (err) {
      warnings.push({ name: name, message: String((err && err.message) || err) });
      Logger.log("Delta sync melewati " + name + ": " + String((err && err.message) || err));
    }
  });
  var result = { success: true, apiVersion: 1, generatedAt: new Date().toISOString(), datasets: datasets, warnings: warnings };
  try { cache.put(ck, JSON.stringify(result), DELTA_SYNC_CACHE_SEC); } catch (_) {}
  return result;
}

function _deltaFetch_(token, name, offset, limit) {
  guard_(arguments, { ulp: true, aksi: "deltaFetch" });
  var cfg = _deltaConfigs_()[name];
  if (!cfg) return { success: false, message: "Dataset tidak dikenal: " + name };
  var rows = _deltaRows_(token, name, cfg), from = Math.max(0, Number(offset) || 0);
  var take = Math.max(1, Math.min(DELTA_SYNC_PAGE, Number(limit) || DELTA_SYNC_PAGE));
  return {
    success: true,
    apiVersion: 1,
    name: name,
    version: _deltaDigest_(rows),
    total: rows.length,
    offset: from,
    rows: rows.slice(from, from + take),
    hasMore: from + take < rows.length,
    kind: cfg.support ? "support" : "main",
  };
}

function _deltaSnapshotError_(code, message) {
  var err = new Error(message);
  err.deltaCode = code;
  return err;
}

function _deltaScope_(sesi) {
  return String((sesi && (sesi.kodeUlp || sesi.ulp)) || "all").trim().toLowerCase();
}

function _deltaSnapshotRoot_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(DELTA_SNAPSHOT_ROOT_PROPERTY);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (_) {}
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    id = props.getProperty(DELTA_SNAPSHOT_ROOT_PROPERTY);
    if (id) {
      try { return DriveApp.getFolderById(id); } catch (_) {}
    }
    var root = DriveApp.createFolder("SiSi Delta Sync Snapshots");
    props.setProperty(DELTA_SNAPSHOT_ROOT_PROPERTY, root.getId());
    return root;
  } finally {
    lock.releaseLock();
  }
}

function _deltaSnapshotCleanup_() {
  var cache = CacheService.getScriptCache();
  if (cache.get("delta_snapshot_cleanup_v1")) return;
  cache.put("delta_snapshot_cleanup_v1", "1", 3600);
  var cutoff = Date.now() - DELTA_SNAPSHOT_TTL_MS;
  var folders = _deltaSnapshotRoot_().getFolders();
  while (folders.hasNext()) {
    var folder = folders.next();
    if (folder.getName().indexOf("delta_snapshot_") === 0 && folder.getDateCreated().getTime() < cutoff) {
      try { folder.setTrashed(true); } catch (_) {}
    }
  }
}

function _deltaRequestedNames_(raw, cfgs) {
  var requested = {};
  if (Array.isArray(raw) && raw.length) {
    for (var i = 0; i < raw.length; i++) {
      var name = String(raw[i] || "").trim();
      if (!cfgs[name]) throw _deltaSnapshotError_("INVALID_DATASET", "Dataset tidak dikenal: " + name);
      requested[name] = true;
    }
  } else {
    Object.keys(cfgs).forEach(function (name) { requested[name] = true; });
  }
  return Object.keys(cfgs).filter(function (name) { return requested[name]; });
}

function _deltaChunkName_(name, index) {
  return name + "__" + ("000000" + index).slice(-6) + ".json";
}

function _deltaSnapshotCreate_(token, payload) {
  var sesi = getSesiByToken(String(token || ""));
  if (!sesi) return { success: false, code: "SESSION_EXPIRED", message: "Sesi habis." };
  _deltaSnapshotCleanup_();
  var cfgs = _deltaConfigs_(), names;
  try { names = _deltaRequestedNames_(payload && payload.datasets, cfgs); }
  catch (err) { return { success: false, code: err.deltaCode || "SNAPSHOT_CREATE_FAILED", message: err.message }; }
  var createdAt = new Date(), expiresAt = new Date(createdAt.getTime() + DELTA_SNAPSHOT_TTL_MS);
  var folder = _deltaSnapshotRoot_().createFolder("delta_snapshot_" + Utilities.getUuid());
  var datasets = [], warnings = [];
  try {
    for (var i = 0; i < names.length; i++) {
      var name = names[i], cfg = cfgs[name];
      try {
        /* Source rows and digest are computed exactly once for this immutable snapshot. */
        var rows = _deltaRows_(token, name, cfg);
        var version = _deltaDigest_(rows);
        for (var offset = 0, page = 0; offset < rows.length; offset += DELTA_SNAPSHOT_PAGE, page++) {
          var chunk = rows.slice(offset, offset + DELTA_SNAPSHOT_PAGE);
          folder.createFile(Utilities.newBlob(JSON.stringify(chunk), "application/json", _deltaChunkName_(name, page)));
        }
        datasets.push({ name: name, version: version, count: rows.length, kind: cfg.support ? "support" : "main" });
      } catch (datasetError) {
        warnings.push({ name: name, message: String((datasetError && datasetError.message) || datasetError) });
        Logger.log("Snapshot melewati " + name + ": " + String((datasetError && datasetError.message) || datasetError));
      }
    }
    var meta = {
      apiVersion: 2,
      scope: _deltaScope_(sesi),
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      pageSize: DELTA_SNAPSHOT_PAGE,
      datasets: datasets,
      warnings: warnings,
    };
    folder.createFile(Utilities.newBlob(JSON.stringify(meta), "application/json", DELTA_SNAPSHOT_META));
    return {
      success: true,
      apiVersion: 2,
      snapshotId: folder.getId(),
      generatedAt: meta.createdAt,
      expiresAt: meta.expiresAt,
      datasets: datasets,
      warnings: warnings,
    };
  } catch (err) {
    try { folder.setTrashed(true); } catch (_) {}
    return { success: false, code: "SNAPSHOT_CREATE_FAILED", message: "Snapshot belum dapat dibuat: " + err.message };
  }
}

function _deltaSnapshotOpen_(token, snapshotId) {
  var sesi = getSesiByToken(String(token || ""));
  if (!sesi) throw _deltaSnapshotError_("SESSION_EXPIRED", "Sesi habis.");
  var folder;
  try { folder = DriveApp.getFolderById(String(snapshotId || "")); }
  catch (_) { throw _deltaSnapshotError_("SNAPSHOT_EXPIRED", "Snapshot download sudah tidak tersedia."); }
  if (folder.getName().indexOf("delta_snapshot_") !== 0)
    throw _deltaSnapshotError_("SNAPSHOT_INVALID", "Snapshot download tidak valid.");
  var files = folder.getFilesByName(DELTA_SNAPSHOT_META);
  if (!files.hasNext()) throw _deltaSnapshotError_("SNAPSHOT_EXPIRED", "Snapshot download belum lengkap.");
  var meta;
  try { meta = JSON.parse(files.next().getBlob().getDataAsString("UTF-8")); }
  catch (_) { throw _deltaSnapshotError_("SNAPSHOT_INVALID", "Metadata snapshot tidak valid."); }
  if (_deltaScope_(sesi) !== String(meta.scope || ""))
    throw _deltaSnapshotError_("SNAPSHOT_FORBIDDEN", "Snapshot bukan milik lingkup akun ini.");
  if (!meta.expiresAt || Date.now() >= new Date(meta.expiresAt).getTime()) {
    try { folder.setTrashed(true); } catch (_) {}
    throw _deltaSnapshotError_("SNAPSHOT_EXPIRED", "Snapshot download sudah kedaluwarsa.");
  }
  return { folder: folder, meta: meta };
}

function _deltaSnapshotManifest_(token, snapshotId) {
  var opened = _deltaSnapshotOpen_(token, snapshotId);
  return {
    success: true,
    apiVersion: 2,
    snapshotId: snapshotId,
    generatedAt: opened.meta.createdAt,
    expiresAt: opened.meta.expiresAt,
    datasets: opened.meta.datasets || [],
    warnings: opened.meta.warnings || [],
  };
}

function _deltaSnapshotFetch_(token, snapshotId, name, offset, limit) {
  guard_(arguments, { ulp: true, aksi: "deltaSnapshotFetch" });
  var opened = _deltaSnapshotOpen_(token, snapshotId), meta = opened.meta;
  var datasets = meta.datasets || [], dataset = null;
  for (var i = 0; i < datasets.length; i++) if (datasets[i].name === name) { dataset = datasets[i]; break; }
  if (!dataset) throw _deltaSnapshotError_("INVALID_DATASET", "Dataset tidak ada di snapshot: " + name);
  var from = Math.max(0, Number(offset) || 0);
  var take = Math.max(1, Math.min(Number(meta.pageSize) || DELTA_SNAPSHOT_PAGE, Number(limit) || DELTA_SNAPSHOT_PAGE));
  var rows = [];
  if (from < Number(dataset.count || 0)) {
    var pageIndex = Math.floor(from / meta.pageSize), inPage = from % meta.pageSize;
    var files = opened.folder.getFilesByName(_deltaChunkName_(name, pageIndex));
    if (!files.hasNext()) throw _deltaSnapshotError_("SNAPSHOT_INVALID", "Bagian snapshot tidak ditemukan.");
    var chunk = JSON.parse(files.next().getBlob().getDataAsString("UTF-8"));
    rows = chunk.slice(inPage, inPage + take);
  }
  return {
    success: true,
    apiVersion: 2,
    snapshotId: snapshotId,
    name: name,
    version: dataset.version,
    total: dataset.count,
    offset: from,
    rows: rows,
    hasMore: from + rows.length < Number(dataset.count || 0),
    kind: dataset.kind,
  };
}

function _deltaSnapshotRelease_(token, snapshotId) {
  var opened = _deltaSnapshotOpen_(token, snapshotId);
  opened.folder.setTrashed(true);
  return { success: true, apiVersion: 2, released: true };
}

function _deltaSnapshotCall_(fn) {
  try { return fn(); }
  catch (err) {
    return {
      success: false,
      code: (err && err.deltaCode) || "SNAPSHOT_FAILED",
      message: String((err && err.message) || "Snapshot gagal."),
    };
  }
}

function deltaSyncMobile_(token, payload) {
  payload = payload || {};
  var cmd = String(payload.cmd || "manifest");
  if (cmd === "snapshotCreate") return _deltaSnapshotCreate_(token, payload);
  if (cmd === "snapshotManifest") return _deltaSnapshotCall_(function () {
    return _deltaSnapshotManifest_(token, String(payload.snapshotId || ""));
  });
  if (cmd === "snapshotFetch") return _deltaSnapshotCall_(function () {
    return _deltaSnapshotFetch_(
      token,
      String(payload.snapshotId || ""),
      String(payload.dataset || ""),
      payload.offset,
      payload.limit,
    );
  });
  if (cmd === "snapshotRelease") return _deltaSnapshotCall_(function () {
    return _deltaSnapshotRelease_(token, String(payload.snapshotId || ""));
  });
  if (cmd === "manifest") return _deltaManifest_(token, payload.force === true);
  if (cmd === "fetch") return _deltaFetch_(token, String(payload.dataset || ""), payload.offset, payload.limit);
  return { success: false, message: "Perintah delta sync tidak dikenal." };
}
