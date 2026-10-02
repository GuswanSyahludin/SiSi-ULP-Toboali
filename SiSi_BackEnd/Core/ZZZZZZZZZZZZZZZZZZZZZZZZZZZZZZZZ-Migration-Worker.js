/* Source-only archive worker. No triggers/data/properties change at load.
 * Timer entry is private (_ suffix); HTTP _t11 actions are denied by T11.
 * Public endpoints still require a real Super Toboali session. No fake token,
 * client internal flag, guard bypass, legacy original batch, or forced window.
 * Uses the existing migration state/cursors. Script locks do NOT fence AppSheet.
 */
(function _installMigrationWorker_(root) {
  "use strict";
  var STATE = "MIGRASI_SEMUA_STATE";
  var HANDLER = "_t11MigrasiSemuaTick_";
  var KEYS = ["header", "rlz", "eks", "tmn", "p0", "lh", "ijr", "idr",
    "hpg", "hpkj", "hmt", "ysh", "ysw"];
  var CURSORS = ["MIGRASI_HEADER_CURSOR", "MIGRASI_ROW_RLZ_CURSOR",
    "MIGRASI_ROW_EKS_CURSOR", "MIGRASI_TEMUAN_CURSOR", "MIGRASI_YANDAL_P0_CURSOR",
    "MIGRASI_LAP_HARIAN_CURSOR", "MIGRASI_INSJAR_RLZ_CURSOR",
    "MIGRASI_INSDU_RLZ_CURSOR", "MIGRASI_HARTEK_PG_CURSOR",
    "MIGRASI_HARTEK_PKJ_CURSOR", "MIGRASI_HARTEK_MAT_CURSOR",
    "MIGRASI_YANDAL_SHIFT_CURSOR", "MIGRASI_YANDAL_SWC_CURSOR"];
  function _fail_(code) { throw new Error("T11_MIGRATION_" + code); }
  // Cooperative ScriptLock hand-off shared with Recalc-Today. A request is only
  // a hint written by this script; it never grants lock, auth or write authority.
  // The holder yields at a completed row boundary, never inside copy/verify/delete.
  var YIELD = "T11_SCRIPT_LOCK_YIELD_V1", YIELD_TTL = 180000, SELF = "migration";
  var YIELD_PARTIES = ["migration", "recalc"];
  function _yieldRead_(props) {
    var raw = props.getProperty(YIELD), r;
    if (raw == null) return null;
    try { r = JSON.parse(raw); } catch (e) { return null; }
    if (!r || typeof r !== "object" || YIELD_PARTIES.indexOf(r.by) < 0 ||
        typeof r.at !== "number" || !isFinite(r.at)) return null;
    return r;
  }
  function _yieldFresh_(r) {
    var age = r ? Date.now() - r.at : NaN;
    return !!r && age >= -60000 && age <= YIELD_TTL;
  }
  function _yieldAsk_(props) {
    // Never overwrite another party's fresh request.
    var r = _yieldRead_(props);
    if (_yieldFresh_(r) && r.by !== SELF) return;
    props.setProperty(YIELD, JSON.stringify({ by: SELF, at: Date.now() }));
  }
  function _yieldClearOwn_(props) {
    var r = _yieldRead_(props);
    if (r && r.by === SELF) props.deleteProperty(YIELD);
  }
  function _mustYield_(ctx, props) {
    if (ctx.yielded) return true;
    if (!ctx.units) return false; // always complete at least one safe unit
    var r = _yieldRead_(props);
    if (_yieldFresh_(r) && r.by !== SELF) { ctx.yielded = r.by; return true; }
    return false;
  }
  function _ulp_(v) {
    if (typeof v !== "string") return false;
    v = v.trim().toLowerCase().replace(/\s+/g, " ");
    return v === "toboali" || v === "ulp toboali";
  }
  function _text_(v) {
    return typeof v === "string" ? v.trim() : "";
  }
  function _day_(v) {
    if (Object.prototype.toString.call(v) === "[object Date]") {
      if (!isFinite(v.getTime())) return "";
      return Utilities.formatDate(v, "Asia/Jakarta", "yyyy-MM-dd");
    }
    if (typeof v !== "string") return "";
    // Tanggal is a business-calendar field, not a timestamp instant.
    // Match _normTgl's written date prefix for strings, including ISO offsets.
    // Date objects above are real instants and use Asia/Jakarta. Never rewrite cells.
    var s = v.trim(), m = /^(\d{4}-\d{2}-\d{2})(.*)$/.exec(s), tail = "", day;
    if (m) { day = m[1]; tail = m[2]; }
    else {
      m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/.exec(s);
      if (!m) return "";
      day = m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
      tail = m[4];
    }
    var d = new Date(day + "T00:00:00Z");
    if (!isFinite(d.getTime()) || d.toISOString().slice(0,10) !== day) return "";
    if (tail) {
      var t = /^[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/.exec(tail);
      if (!t || +t[1] > 23 || +t[2] > 59 || +(t[3] || 0) > 59) return "";
      if (t[5] && t[5] !== "Z") {
        var h = +t[5].slice(1,3), n = +t[5].slice(4);
        if (h > 14 || n > 59 || (h === 14 && n !== 0)) return "";
      }
    }
    return day;
  }
  function _equal_(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      var x = a[i], y = b[i];
      if (Object.prototype.toString.call(x) === "[object Date]") {
        if (Object.prototype.toString.call(y) !== "[object Date]" ||
            x.getTime() !== y.getTime()) return false;
      } else if (x !== y) return false;
    }
    return true;
  }
  function _state_(props) {
    var raw = props.getProperty(STATE);
    if (raw == null) return null;
    var state;
    try { state = JSON.parse(raw); } catch (e) { _fail_("STATE_INVALID"); }
    if (!state || Array.isArray(state) || typeof state !== "object") _fail_("STATE_INVALID");
    Object.keys(state).forEach(function (k) {
      if (KEYS.indexOf(k) < 0 || typeof state[k] !== "boolean") _fail_("STATE_INVALID");
    });
    return state;
  }
  function _schemas_() {
    // Resolve at invocation, including lexical const declarations, not root.COL_INS.
    var H = COL_INS.HEADER, T = COL_INS.TEMUAN, I = COL_INS.REALISASI;
    var D = COL_INSDU.REALISASI, R = COL_ROW_RLZ, E = COL_ROW;
    var P = COL_P0, S = COL_YANDAL_SHIFT, W = COL_SWITCHING;
    var G = COL_HTK.PG, J = COL_HTK.PEKERJAAN, M = COL_HTK.MATERIAL;
    function _schema_(key, name, c, pk, width, parents, windowed) {
      var s = { key: key, name: name, c: c, pk: c[pk], width: width,
        date: c.tanggal, ulp: c.ulp, parents: parents || [], windowed: !!windowed,
        offset: key === "lh" ? 0 : 1, cursor: CURSORS[KEYS.indexOf(key)] };
      [s.pk, s.date, s.width - 1].forEach(function (n) {
        if (!Number.isInteger(n) || n < 0 || n >= width) _fail_("SCHEMA_INVALID");
      });
      if (s.ulp !== undefined && (!Number.isInteger(s.ulp) || s.ulp < 0 || s.ulp >= width))
        _fail_("SCHEMA_INVALID");
      if (typeof name !== "string" || !name || width < 2) _fail_("SCHEMA_INVALID");
      s.parents.forEach(function (p) {
        if (!Number.isInteger(p[1]) || p[1] < 0 || p[1] >= width) _fail_("SCHEMA_INVALID");
      });
      return s;
    }
    var a = [
      _schema_("header", SHEET_INS.HEADER, H, "kodeHeader", H.statusTextWa + 1),
      _schema_("rlz", "db_ROW_Realisasi", R, "kodePekerjaan", COL_ROW_RLZ_N, [["header", R.kodeHeader]]),
      _schema_("eks", "db_ROW_Eksekusi", E, "kodeEksekusi", COL_ROW_N,
        [["header", E.kodeHeader], ["rlz", E.kodePekerjaan]]),
      // Temuan mandiri legitimately has a synthetic header with no parent row.
      // Its stored ULP is authoritative, not a prefix decoded from its key.
      _schema_("tmn", SHEET_INS.TEMUAN, T, "kodePekerjaan", T.folderPath + 1),
      _schema_("p0", SHEET_YANDAL.P0, P, "kodeP0", P.folderPath + 1,
        [["header", P.kodeHeader], ["ysh", P.kodeShift]], true),
      _schema_("lh", LH.SHEET, LH.COL, "tanggal", 8),
      _schema_("ijr", SHEET_INS.REALISASI, I, "kodePekerjaanPeny", I.timestamp + 1,
        [["header", I.kodeHeader]]),
      _schema_("idr", SHEET_INSDU_REALISASI, D, "kodePekerjaanGardu", D.timestamp + 1,
        [["header", D.kodeHeader]]),
      _schema_("hpg", SHEET_HTK.PG, G, "kodePG", G.timeStamp + 1, [["header", G.kodeHeader]]),
      _schema_("hpkj", SHEET_HTK.PEKERJAAN, J, "kodePekerjaan", J.timestamp + 1,
        [["header", J.kodeHeader], ["hpg", J.kodePG]]),
      _schema_("hmt", SHEET_HTK.MATERIAL, M, "kodeMaterial", M.timestamp + 1,
        [["header", M.kodeHeader], ["hpg", M.kodePG], ["hpkj", M.kodePekerjaan]]),
      _schema_("ysh", SHEET_YANDAL.SHIFT, S, "kodeShift", S.timestamp + 1,
        [["header", S.kodeHeader]], true),
      _schema_("ysw", SHEET_YANDAL.SWITCHING, W, "kodeSwitching", W.folderPath + 1,
        [["header", W.kodeHeader], ["ysh", W.kodeShift], ["p0", W.kodeP0]], true)
    ];
    var map = Object.create(null);
    a.forEach(function (s) { map[s.key] = s; });
    return map;
  }
  function _sheet_(ss, s) {
    var sh = ss.getSheetByName(s.name);
    if (!sh || sh.getLastColumn() < s.width) _fail_("SHEET_SCHEMA_MISSING");
    return sh;
  }
  function _rows_(sh, s) {
    var n = sh.getLastRow();
    return n < 2 ? [] : sh.getRange(2, 1, n - 1, s.width).getValues();
  }
  function _key_(row, s) { return s.key === "lh" ? _day_(row[s.pk]) : _text_(row[s.pk]); }
  function _find_(ss, s, key) {
    var sh = _sheet_(ss, s), rows = _rows_(sh, s), found = [];
    rows.forEach(function (r, i) { if (_key_(r, s) === key) found.push({ sh: sh, row: i + 2, v: r }); });
    if (found.length > 1) _fail_("DUPLICATE_KEY");
    return found[0] || null;
  }
  function _owned_(ctx, s, row, depth) {
    if (depth > 5) _fail_("PARENT_INVALID");
    if (s.key === "lh") {
      if (!_ulp_(LH.ULP)) _fail_("ULP_DENIED");
      return;
    }
    if (s.ulp !== undefined && !_ulp_(row[s.ulp])) _fail_("ULP_DENIED");
    if (s.ulp === undefined && !s.parents.length) _fail_("ULP_UNRESOLVED");
    s.parents.forEach(function (p) {
      var ps = ctx.schemas[p[0]], key = _text_(row[p[1]]);
      if (!key) _fail_("PARENT_MISSING");
      var a = _find_(ctx.active, ps, key), b = _find_(ctx.archive, ps, key);
      if (!a && !b) _fail_("PARENT_MISSING");
      if (a && b && !_equal_(a.v.slice(ps.offset), b.v.slice(ps.offset))) _fail_("PARENT_CONFLICT");
      var pv = (a || b).v;
      _owned_(ctx, ps, pv, depth + 1);
      if (!_day_(row[s.date]) || _day_(row[s.date]) !== _day_(pv[ps.date])) _fail_("PARENT_DATE_CONFLICT");
      // Every common ancestor key must agree, not merely exist separately.
      s.parents.forEach(function (q) {
        ps.parents.forEach(function (r) {
          if (q[0] === r[0] && _text_(row[q[1]]) !== _text_(pv[r[1]])) _fail_("PARENT_CONFLICT");
        });
      });
    });
  }
  function _eligible_(ctx, s, r) {
    if (s.key === "tmn") {
      var t = s.c;
      return _text_(r[t.status]) === STATUS_INS.SELESAI &&
        [t.fotoTemuanUrl, t.fotoTiangUrl, t.fotoPekerjaanUrl, t.fotoSesudahUrl]
          .every(function (i) { return !!_text_(r[i]); });
    }
    var day = _day_(r[s.date]);
    if (!day) _fail_("DATE_INVALID");
    if (day > ctx.cutoff) return false;
    if (s.key === "p0") {
      var c = s.c;
      return !!_text_(r[c.statusApproval]) ||
        [c.fotoSebelum, c.fotoPekerjaan, c.fotoSesudah].every(function (i) { return !_text_(r[i]); });
    }
    if (s.key === "ysw") return !!_find_(ctx.archive, ctx.schemas.p0, _text_(r[s.c.kodeP0]));
    return true;
  }
  function _plain_(sh, row, s, source) {
    var n = Math.max(s.width, sh.getLastColumn()), v = sh.getRange(row, 1, 1, n).getValues()[0];
    if (v.slice(s.width).some(function (x) { return x !== "" && x != null; }) ||
        (n > s.width && sh.getRange(row, s.width + 1, 1, n - s.width).getFormulas()[0]
          .some(function (x) { return !!x; }))) _fail_("EXTRA_COLUMNS");
    var f = sh.getRange(row, s.offset + 1, 1, s.width - s.offset).getFormulas()[0];
    if ((!source && f.some(function (x) { return !!x; })) ||
        v.slice(s.offset, s.width).some(function (x) { return typeof x === "string" && x.charAt(0) === "="; }))
      _fail_("FORMULA_IN_PAYLOAD");
    return v.slice(0, s.width);
  }
  function _archiveRow_(sh, s) {
    // Do not overwrite orphan content or formulas simply because its key is blank.
    var n = sh.getLastRow();
    if (n < 2) return 2;
    var width = Math.max(s.width, sh.getLastColumn());
    var range = sh.getRange(2, s.offset + 1, n - 1, width - s.offset);
    var rows = range.getValues(), formulas = range.getFormulas();
    for (var i = rows.length - 1; i >= 0; i--)
      if (rows[i].some(function (x) { return x !== "" && x != null; }) ||
          formulas[i].some(function (x) { return !!x; })) return i + 3;
    return 2;
  }
  function _batch_(ctx, s, props) {
    if (s.windowed && !ctx.window) return { done: false, skipped: "di-luar-jendela" };
    var sh = _sheet_(ctx.active, s), ar = _sheet_(ctx.archive, s);
    if (!_equal_(sh.getRange(1, 1, 1, s.width).getValues()[0],
        ar.getRange(1, 1, 1, s.width).getValues()[0])) _fail_("HEADER_MISMATCH");
    var raw = props.getProperty(s.cursor), cursor = raw == null ? 2 : Number(raw);
    if (!Number.isInteger(cursor) || cursor < 2) _fail_("CURSOR_INVALID");
    var scanned = 0, copied = 0, deleted = 0;
    while (cursor <= sh.getLastRow() && scanned < ctx.limit && Date.now() < ctx.deadline &&
        !_mustYield_(ctx, props)) {
      var v = _plain_(sh, cursor, s, true), key = _key_(v, s);
      var sourceFormulas = sh.getRange(cursor, s.offset + 1, 1, s.width - s.offset).getFormulas()[0];
      if (!key) {
        if (v.slice(s.offset).some(function (x) { return x !== "" && x != null; })) _fail_("KEY_MISSING");
        cursor++;
      } else if (!_eligible_(ctx, s, v)) {
        cursor++;
      } else {
        _owned_(ctx, s, v, 0);
        var source = _find_(ctx.active, s, key);
        if (!source || source.row !== cursor) _fail_("SOURCE_CHANGED");
        var dest = _find_(ctx.archive, s, key), payload = v.slice(s.offset);
        if (dest && !_equal_(_plain_(dest.sh, dest.row, s).slice(s.offset), payload))
          _fail_("ARCHIVE_CONFLICT");
        if (Date.now() >= ctx.deadline) break;
        if (!dest) {
          var target = _archiveRow_(ar, s);
          if (target > ar.getMaxRows()) _fail_("ARCHIVE_CAPACITY");
          // Persist the retry position BEFORE any mutation. A partial write
          // retains source and an unchanged cursor; no key-only deletion path.
          props.setProperty(s.cursor, String(cursor));
          ar.getRange(target, s.offset + 1, 1, payload.length).setValues([payload]);
          SpreadsheetApp.flush();
          copied++;
          dest = _find_(ctx.archive, s, key);
          if (!dest || dest.row !== target) _fail_("COPY_VERIFY_FAILED");
        }
        if (!_equal_(_plain_(dest.sh, dest.row, s).slice(s.offset), payload)) _fail_("COPY_VERIFY_FAILED");
        _owned_(ctx, s, v, 0);
        if (!_equal_(_plain_(sh, cursor, s, true).slice(s.offset), payload) ||
            !_equal_(sh.getRange(cursor, s.offset + 1, 1, s.width - s.offset).getFormulas()[0],
              sourceFormulas)) _fail_("SOURCE_CHANGED");
        // Fresh uniqueness and exact archive checks immediately before delete.
        var finalSource = _find_(ctx.active, s, key), finalDest = _find_(ctx.archive, s, key);
        if (!finalSource || finalSource.row !== cursor || !finalDest ||
            !_equal_(finalSource.v.slice(s.offset), payload) ||
            !_equal_(finalDest.v.slice(s.offset), payload)) _fail_("SOURCE_CHANGED");
        props.setProperty(s.cursor, String(cursor));
        sh.deleteRow(cursor);
        SpreadsheetApp.flush();
        deleted++;
      }
      scanned++;
      ctx.units++;
      props.setProperty(s.cursor, String(cursor));
    }
    var done = cursor > sh.getLastRow();
    if (done) props.deleteProperty(s.cursor);
    var out = { done: done, disalin: copied, dihapus: deleted, diperiksa: scanned };
    if (!done && ctx.yielded) out.dijeda = ctx.yielded;
    return out;
  }
  function _context_() {
    var now = new Date(), day = _day_(now);
    if (typeof MIGRASI_H_MINUS !== "number" || !Number.isInteger(MIGRASI_H_MINUS) ||
        MIGRASI_H_MINUS < 0 || !Number.isInteger(MIGRASI_BATCH) || MIGRASI_BATCH < 1)
      _fail_("CONFIG_INVALID");
    if (typeof SPREADSHEET_ID !== "string" || !SPREADSHEET_ID ||
        typeof SPREADSHEET_ID_ARSIP !== "string" || !SPREADSHEET_ID_ARSIP ||
        SPREADSHEET_ID === SPREADSHEET_ID_ARSIP) _fail_("WORKBOOK_INVALID");
    var cutoff = new Date(day + "T00:00:00Z");
    cutoff.setUTCDate(cutoff.getUTCDate() - MIGRASI_H_MINUS);
    var hm = Utilities.formatDate(now, "Asia/Jakarta", "HH:mm");
    var minutes = Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
    return { schemas: _schemas_(), active: SpreadsheetApp.openById(SPREADSHEET_ID),
      archive: SpreadsheetApp.openById(SPREADSHEET_ID_ARSIP), day: day,
      // Bounded lock hold: leaves most of each minute for other ScriptLock users.
      cutoff: cutoff.toISOString().slice(0, 10), deadline: Date.now() + 40000,
      units: 0, yielded: "",
      limit: Math.min(MIGRASI_BATCH, 25),
      window: minutes >= 1435 || minutes <= 10 || (minutes >= 470 && minutes <= 490) ||
        (minutes >= 950 && minutes <= 970) };
  }
  function _tick_() {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) {
      try { _yieldAsk_(PropertiesService.getScriptProperties()); } catch (ignore) {}
      return { ok: true, pending: true, skipped: "lock" };
    }
    try {
      var props = PropertiesService.getScriptProperties();
      _yieldClearOwn_(props);
      var state = _state_(props);
      if (!state) return { ok: true, skipped: "no-pending-state" };
      if (MIGRASI_DRY_RUN !== false) return { ok: true, pending: true, skipped: "dry-run" };
      var ctx = _context_(), failed = [], results = {};
      KEYS.forEach(function (key) {
        if (!state[key] || Date.now() >= ctx.deadline || _mustYield_(ctx, props)) return;
        try {
          results[key] = _batch_(ctx, ctx.schemas[key], props);
          if (results[key].done) {
            state[key] = false;
            props.setProperty(STATE, JSON.stringify(state));
          }
        } catch (e) {
          var code = String(e && e.message || "");
          if (!/^T11_MIGRATION_[A-Z_]+$/.test(code)) code = "T11_MIGRATION_BATCH_FAILED";
          failed.push({ batch: key, code: code });
        }
      });
      props.setProperty(STATE, JSON.stringify(state));
      var pending = KEYS.some(function (k) { return state[k] === true; });
      var log = { worker: "migration", tanggal: ctx.day, pending: pending,
        batches: results, failed: failed };
      if (ctx.yielded) log.lockDiserahkan = ctx.yielded;
      Logger.log(JSON.stringify(log));
      if (failed.length) _fail_("RETRY_REQUIRED");
      if (!pending) {
        // Keep completed state until trigger cleanup succeeds.
        ScriptApp.getProjectTriggers().forEach(function (t) {
          if (t.getHandlerFunction() === HANDLER) ScriptApp.deleteTrigger(t);
        });
        props.deleteProperty(STATE);
      }
      var res = { ok: true, pending: pending, batches: results };
      if (ctx.yielded) res.yielded = ctx.yielded;
      return res;
    } finally { lock.releaseLock(); }
  }
  function _start_() {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) return { ok: true, pending: true, skipped: "lock" };
    try {
      var props = PropertiesService.getScriptProperties(), state = _state_(props);
      _context_(); // dependency/config preflight BEFORE trigger changes
      var all = ScriptApp.getProjectTriggers(), existing = all.filter(function (t) {
        return t.getHandlerFunction() === HANDLER;
      });
      if (existing.length > 1) _fail_("DUPLICATE_TRIGGER");
      // Create before deleting the legacy trigger. Creation failure cannot
      // remove the old handler, cursor, or pending work.
      if (!existing.length) ScriptApp.newTrigger(HANDLER).timeBased().everyMinutes(1).create();
      if (!state) {
        state = {};
        KEYS.forEach(function (k) { state[k] = true; });
        props.setProperty(STATE, JSON.stringify(state));
      }
      all.forEach(function (t) {
        if (t.getHandlerFunction() === "migrasiSemuaTick") ScriptApp.deleteTrigger(t);
      });
      return { ok: true, resumed: true, cursorsReset: false, handler: HANDLER };
    } finally { lock.releaseLock(); }
  }
  root._t11MigrationDispatch_ = function (kind) {
    if (kind === "tick") return _tick_();
    if (kind === "start") return _start_();
    _fail_("UNKNOWN_HANDLER");
  };
  root.migrasiSemuaTick = function (params) {
    var g = guard_(arguments, { ulp: true, role: ["SUPER"], aksi: "migrasiSemuaTick" });
    if (!g || !_ulp_(g.ulp)) _fail_("CALLER_DENIED");
    return _tick_();
  };
  root.mulaiMigrasiSemua = function (params) {
    var g = guard_(arguments, { ulp: true, role: ["SUPER"], aksi: "mulaiMigrasiSemua" });
    if (!g || !_ulp_(g.ulp)) _fail_("CALLER_DENIED");
    return _start_();
  };
})(typeof globalThis !== "undefined" ? globalThis : this);

// Declared private entries are discoverable by Apps Script trigger handlers.
// The T11 HTTP boundary rejects all _t11 actions; do not add router aliases.
function _t11MigrasiSemuaTick_() {
  return _t11MigrationDispatch_("tick");
}
function _t11MulaiMigrasiSemua_() {
  return _t11MigrationDispatch_("start");
}
