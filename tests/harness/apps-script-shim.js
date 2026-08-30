/* Emulation of the Google Apps Script services that SiSi_BackEnd touches.
   Anything not emulated explicitly is captured as an "unsupported" call instead of
   throwing, so a whole project can be loaded and exercised even while the shim is
   still incomplete. harness.unsupported() reports what is still missing. */

import { createHash, randomUUID } from "node:crypto";
import { SheetStore, encodeCell } from "./sqlite-store.js";

const JKT_OFFSET_MIN = 7 * 60;
const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function pad(n, w = 2) {
  return String(n).padStart(w, "0");
}

/* Render a date in a fixed UTC offset (WIB has no DST, so a constant is exact). */
function zonedParts(date, offsetMin) {
  const shifted = new Date(date.getTime() + offsetMin * 60000);
  return {
    yyyy: shifted.getUTCFullYear(),
    MM: pad(shifted.getUTCMonth() + 1),
    dd: pad(shifted.getUTCDate()),
    HH: pad(shifted.getUTCHours()),
    mm: pad(shifted.getUTCMinutes()),
    ss: pad(shifted.getUTCSeconds()),
    dayIdx: shifted.getUTCDay(),
    monthIdx: shifted.getUTCMonth(),
    M: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    H: shifted.getUTCHours(),
    m: shifted.getUTCMinutes(),
    s: shifted.getUTCSeconds(),
  };
}

function formatDate(date, tz, pattern) {
  const offsetMin = /jakarta|gmt\+7/i.test(String(tz || "")) ? JKT_OFFSET_MIN : 0;
  const p = zonedParts(date, offsetMin);
  return String(pattern)
    .replace(/EEEE/g, HARI_ID[p.dayIdx])
    .replace(/EEE/g, HARI_ID[p.dayIdx].slice(0, 3))
    .replace(/MMMM/g, BULAN_ID[p.monthIdx])
    .replace(/MMM/g, BULAN_ID[p.monthIdx].slice(0, 3))
    .replace(/yyyy/g, String(p.yyyy))
    .replace(/MM/g, p.MM)
    .replace(/dd/g, p.dd)
    .replace(/HH/g, p.HH)
    .replace(/mm/g, p.mm)
    .replace(/ss/g, p.ss)
    .replace(/M/g, String(p.M))
    .replace(/d/g, String(p.d))
    .replace(/H/g, String(p.H));
}

function toBytes(input) {
  if (Array.isArray(input)) return Buffer.from(input);
  if (Buffer.isBuffer(input)) return input;
  if (typeof input === "string") return Buffer.from(input, "utf8");
  return Buffer.from(String(input), "utf8");
}

/* Wrap an object so unknown methods become chainable no-ops that get recorded. */
function tolerant(target, bucket, label) {
  return new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) return obj[prop];
      if (typeof prop === "symbol") return undefined;
      return function (...args) {
        bucket.push(`${label}.${String(prop)}(${args.length} arg)`);
        return obj;
      };
    },
  });
}

export function createHarness(options = {}) {
  const dbPath = options.dbPath || ":memory:";
  const store = new SheetStore(dbPath);
  const unsupported = [];
  const logs = [];
  const state = {
    now: () => (options.clock ? options.clock() : new Date()),
    effectiveUser: options.effectiveUser || "harness@example.invalid",
    urlFetch: options.urlFetch || null,
    seed: options.seed || {},
  };

  /* ---------------------------------------------------------------- Range */
  class Range {
    constructor(ssId, sheetName, row, col, nRows, nCols) {
      this.ssId = ssId;
      this.sheetName = sheetName;
      this.row = row;
      this.col = col;
      this.nRows = nRows;
      this.nCols = nCols;
    }
    getValues() {
      return store.getRange(this.ssId, this.sheetName, this.row, this.col, this.nRows, this.nCols);
    }
    getDisplayValues() {
      return this.getValues();
    }
    getValue() {
      return this.getValues()[0][0];
    }
    getDisplayValue() {
      return String(this.getValue());
    }
    setValue(v) {
      store.setCell(this.ssId, this.sheetName, this.row, this.col, v);
      return this;
    }
    setValues(m) {
      store.setValues(this.ssId, this.sheetName, this.row, this.col, m);
      return this;
    }
    setFormula(f) {
      store.setCell(this.ssId, this.sheetName, this.row, this.col, null, f);
      return this;
    }
    setFormulas(m) {
      for (let r = 0; r < m.length; r++)
        for (let c = 0; c < (m[r] || []).length; c++)
          store.setCell(this.ssId, this.sheetName, this.row + r, this.col + c, null, m[r][c]);
      return this;
    }
    getFormulas() {
      return store.getFormulas(this.ssId, this.sheetName, this.row, this.col, this.nRows, this.nCols);
    }
    clearContent() {
      store.clearContent(this.ssId, this.sheetName, this.row, this.col, this.nRows, this.nCols);
      return this;
    }
    clear() {
      return this.clearContent();
    }
    setNumberFormat(fmt) {
      store.setNumberFormat(this.ssId, this.sheetName, this.row, this.col, this.nRows, this.nCols, fmt);
      return this;
    }
    setNumberFormats(fmts) {
      for (let r = 0; r < fmts.length; r++)
        for (let c = 0; c < (fmts[r] || []).length; c++)
          store.setNumberFormat(this.ssId, this.sheetName, this.row + r, this.col + c, 1, 1, fmts[r][c]);
      return this;
    }
    getNumberFormat() {
      return "@";
    }
    getRow() { return this.row; }
    getColumn() { return this.col; }
    getNumRows() { return this.nRows; }
    getNumColumns() { return this.nCols; }
    getLastRow() { return this.row + this.nRows - 1; }
    getLastColumn() { return this.col + this.nCols - 1; }
    getSheet() { return sheetRef(this.ssId, this.sheetName); }
    getA1Notation() {
      const end = this.nRows === 1 && this.nCols === 1
        ? `${this.row >= 1 ? this.row : 1}`
        : "";
      return end ? `${colName(this.col)}${this.row}` : `${colName(this.col)}${this.row}:${colName(this.col + this.nCols - 1)}${this.row + this.nRows - 1}`;
    }
    offset(dr, dc, nr, nc) {
      return new Range(
        this.ssId,
        this.sheetName,
        this.row + dr,
        this.col + dc,
        nr === undefined ? this.nRows : nr,
        nc === undefined ? this.nCols : nc,
      );
    }
    getCell(r, c) {
      return new Range(this.ssId, this.sheetName, this.row + r - 1, this.col + c - 1, 1, 1);
    }
  }

  function colName(n) {
    let s = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s || "A";
  }

  /* ---------------------------------------------------------------- Sheet */
  class Sheet {
    constructor(ssId, name) {
      this.ssId = ssId;
      this.name = name;
    }
    getName() { return this.name; }
    getSheetName() { return this.name; }
    getSheetId() { return Math.abs(hashCode(this.ssId + "|" + this.name)) % 100000; }
    getLastRow() { return store.lastRow(this.ssId, this.name); }
    getLastColumn() { return store.lastCol(this.ssId, this.name); }
    getMaxRows() { return Math.max(this.getLastRow(), 1000); }
    getMaxColumns() { return Math.max(this.getLastColumn(), 26); }
    getRange(row, col, nRows, nCols) {
      return new Range(this.ssId, this.name, row, col, nRows || 1, nCols || 1);
    }
    getDataRange() {
      const lr = Math.max(this.getLastRow(), 1);
      const lc = Math.max(this.getLastColumn(), 1);
      return new Range(this.ssId, this.name, 1, 1, lr, lc);
    }
    appendRow(values) {
      return store.appendRow(this.ssId, this.name, values);
    }
    deleteRow(n) { store.deleteRow(this.ssId, this.name, n); return this; }
    deleteRows(start, howMany) {
      for (let i = 0; i < howMany; i++) store.deleteRow(this.ssId, this.name, start);
      return this;
    }
    insertRowsAfter(after, howMany) {
      store.insertRowsAfter(this.ssId, this.name, after, howMany);
      return this;
    }
    insertRowsBefore(before, howMany) {
      store.insertRowsAfter(this.ssId, this.name, before - 1, howMany);
      return this;
    }
    insertRowAfter(after) { return this.insertRowsAfter(after, 1); }
    sort(col, asc) { store.sort(this.ssId, this.name, col, asc !== false); return this; }
    setFrozenRows() { return this; }
    setFrozenColumns() { return this; }
    clearContents() {
      store.clearContent(this.ssId, this.name, 1, 1, this.getMaxRows(), this.getMaxColumns());
      return this;
    }
    clear() { return this.clearContents(); }
    getParent() { return new Spreadsheet(this.ssId); }
  }

  function sheetRef(ssId, name) {
    return tolerant(new Sheet(ssId, name), unsupported, "Sheet");
  }

  /* --------------------------------------------------------- Spreadsheet */
  class Spreadsheet {
    constructor(id) {
      this.id = id;
    }
    getId() { return this.id; }
    getName() { return (store.spreadsheet(this.id) || {}).name || this.id; }
    getUrl() { return `https://docs.google.com/spreadsheets/d/${this.id}/edit`; }
    getSheetByName(name) {
      if (!store.listSheets(this.id).includes(name)) return null;
      return sheetRef(this.id, name);
    }
    getSheets() {
      return store.listSheets(this.id).map((n) => sheetRef(this.id, n));
    }
    insertSheet(name) {
      store.ensureSheet(this.id, name);
      return sheetRef(this.id, name);
    }
    deleteSheet(sh) {
      store.deleteSheet(this.id, sh.getName());
      return this;
    }
  }

  function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
    return h;
  }

  /* ------------------------------------------------------ SpreadsheetApp */
  const SpreadsheetApp = {
    openById(id) {
      if (!store.spreadsheet(id)) store.ensureSpreadsheet(id);
      return tolerant(new Spreadsheet(id), unsupported, "Spreadsheet");
    },
    openByUrl(url) {
      const m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
      return SpreadsheetApp.openById(m ? m[1] : url);
    },
    getActiveSpreadsheet() {
      return SpreadsheetApp.openById(state.seed.defaultSpreadsheetId || "ss_default");
    },
    getActive() { return SpreadsheetApp.getActiveSpreadsheet(); },
    create(name) {
      const id = "ss_" + randomUUID().slice(0, 8);
      store.ensureSpreadsheet(id, name);
      return new Spreadsheet(id);
    },
    flush() {},
  };

  /* -------------------------------------------------------------- Cache */
  function makeCache(ns) {
    return {
      get(k) { return store.kvGet(ns, k); },
      put(k, v, ttl) { store.kvPut(ns, k, v, ttl); },
      remove(k) { store.kvRemove(ns, k); },
      getAll() { return store.kvNamespace(ns); },
      putAll(map, ttl) {
        for (const k of Object.keys(map)) store.kvPut(ns, k, map[k], ttl);
      },
      removeAll(keys) { keys.forEach((k) => store.kvRemove(ns, k)); },
    };
  }
  const CacheService = {
    getScriptCache: () => makeCache("cache_script"),
    getUserCache: () => makeCache("cache_user"),
    getDocumentCache: () => makeCache("cache_doc"),
  };

  /* --------------------------------------------------------- Properties */
  function makeProps(ns) {
    return {
      getProperty(k) { return store.kvGet(ns, k); },
      setProperty(k, v) { store.kvPut(ns, k, v, null); },
      setProperties(map) { for (const k of Object.keys(map)) store.kvPut(ns, k, map[k], null); },
      deleteProperty(k) { store.kvRemove(ns, k); },
      getProperties() { return store.kvNamespace(ns); },
      getKeys() { return Object.keys(store.kvNamespace(ns)); },
    };
  }
  const PropertiesService = {
    getScriptProperties: () => makeProps("prop_script"),
    getUserProperties: () => makeProps("prop_user"),
    getDocumentProperties: () => makeProps("prop_doc"),
  };

  /* ------------------------------------------------------------- Locks */
  let lockOwner = 0;
  const LockService = {
    getScriptLock() {
      let held = false;
      let token = 0;
      return {
        tryLock(ms) {
          if (lockOwner !== 0) return false;
          token = ++lockOwner;
          held = true;
          return true;
        },
        waitLock(ms) {
          if (lockOwner !== 0) return false;
          token = ++lockOwner;
          held = true;
          return true;
        },
        hasLock() { return held && lockOwner === token; },
        releaseLock() {
          if (held && lockOwner === token) lockOwner = 0;
          held = false;
        },
      };
    },
    getUserLock() { return LockService.getScriptLock(); },
    getDocumentLock() { return LockService.getScriptLock(); },
  };

  /* ------------------------------------------------------------ Drive */
  class File {
    constructor(id, name, mime, bytes) {
      this.id = id;
      this.name = name;
      this.mime = mime;
      this.bytes = bytes;
      this.sharing = "PRIVATE";
      this.url = `https://drive.google.com/file/d/${id}/view`;
    }
    getId() { return this.id; }
    getName() { return this.name; }
    getUrl() { return this.url; }
    getBlob() { return Utilities.newBlob(this.bytes || [], this.mime, this.name); }
    setSharing(access) { this.sharing = String(access || "PRIVATE"); return this; }
    getSharing() { return this.sharing; }
    setName(n) { this.name = n; return this; }
    setContent(c) { this.content = c; return this; }
    getAs(mime) { return Utilities.newBlob(this.bytes || [], mime, this.name); }
    makeCopy(n) { return new File("drv_" + randomUUID().slice(0, 8), n, this.mime, this.bytes); }
    setTrashed() { return this; }
  }
  class Folder {
    constructor(id, name) { this.id = id; this.name = name; }
    getId() { return this.id; }
    getName() { return this.name; }
    getUrl() { return `https://drive.google.com/drive/folders/${this.id}`; }
    createFile(blob) {
      const f = new File("drv_" + randomUUID().slice(0, 8), blob.getName?.() || "file", blob.getContentType?.() || "application/octet-stream", blob.getBytes?.() || []);
      driveFiles.set(f.id, f);
      return f;
    }
    createFolder(n) {
      const f = new Folder("fol_" + randomUUID().slice(0, 8), n);
      driveFolders.set(f.id, f);
      return f;
    }
    getFoldersByName(n) { return new FolderIterator([...driveFolders.values()].filter((f) => f.name === n)); }
    getFilesByName(n) { return new FileIterator([...driveFiles.values()].filter((f) => f.name === n)); }
    getFolders() { return new FolderIterator([...driveFolders.values()]); }
    getFiles() { return new FileIterator([...driveFiles.values()]); }
  }
  class Iterator {
    constructor(items) { this.items = items; this.i = 0; }
    hasNext() { return this.i < this.items.length; }
    next() { return this.items[this.i++]; }
  }
  class FolderIterator extends Iterator {}
  class FileIterator extends Iterator {}

  const driveFiles = new Map();
  const driveFolders = new Map();
  const DriveApp = {
    Access: { ANYONE: "ANYONE", ANYONE_WITH_LINK: "ANYONE_WITH_LINK", DOMAIN: "DOMAIN", DOMAIN_WITH_LINK: "DOMAIN_WITH_LINK", PRIVATE: "PRIVATE" },
    Permission: { VIEW: "VIEW", EDIT: "EDIT", COMMENT: "COMMENT", OWNER: "OWNER", ORGANIZER: "ORGANIZER", FILE_ORGANIZER: "FILE_ORGANIZER", NONE: "NONE" },
    getFileById(id) {
      if (!driveFiles.has(id)) throw new Error(`Berkas tidak ditemukan: ${id}`);
      return driveFiles.get(id);
    },
    getFolderById(id) {
      if (!driveFolders.has(id)) throw new Error(`Folder tidak ditemukan: ${id}`);
      return driveFolders.get(id);
    },
    getRootFolder() { return new Folder("root", "Drive saya"); },
    getFoldersByName(n) { return new FolderIterator([...driveFolders.values()].filter((f) => f.name === n)); },
    getFilesByName(n) { return new FileIterator([...driveFiles.values()].filter((f) => f.name === n)); },
    createFile(name, content, mime) {
      const f = new File("drv_" + randomUUID().slice(0, 8), name, mime || "text/plain", content ? Buffer.from(content) : []);
      driveFiles.set(f.id, f);
      return f;
    },
    createFolder(name) {
      const f = new Folder("fol_" + randomUUID().slice(0, 8), name);
      driveFolders.set(f.id, f);
      return f;
    },
  };

  /* --------------------------------------------------------- Utilities */
  const Utilities = {
    Charset: { UTF_8: "UTF_8", US_ASCII: "US_ASCII", ISO_8859_1: "ISO_8859_1" },
    DigestAlgorithm: { MD5: "MD5", SHA_1: "SHA_1", SHA_256: "SHA_256", SHA_512: "SHA_512" },
    formatDate(date, tz, pattern) { return formatDate(date, tz, pattern); },
    formatString(template, ...args) {
      return String(template).replace(/%s/g, () => String(args.shift() ?? ""));
    },
    getUuid() { return randomUUID(); },
    sleep() {},
    computeDigest(alg, value) {
      const name = String(alg).toLowerCase().replace("_", "");
      const hash = createHash(name === "sha1" ? "sha1" : name === "md5" ? "md5" : name === "sha512" ? "sha512" : "sha256");
      hash.update(toBytes(value));
      return Array.from(hash.digest());
    },
    computeHmacSha256Signature(value, key) {
      const h = createHash("sha256");
      h.update(toBytes(key));
      h.update(toBytes(value));
      return Array.from(h.digest());
    },
    base64Encode(input) { return toBytes(input).toString("base64"); },
    base64Decode(input) {
      return Array.from(Buffer.from(String(input), "base64"));
    },
    base64EncodeWebSafe(input) {
      return toBytes(input).toString("base64url");
    },
    base64DecodeWebSafe(input) {
      return Array.from(Buffer.from(String(input), "base64url"));
    },
    newBlob(bytes, contentType, name) {
      const buf = toBytes(bytes || []);
      return {
        getBytes() { return Array.from(buf); },
        getAsString() { return buf.toString("utf8"); },
        getContentType() { return contentType || "application/octet-stream"; },
        getName() { return name || "blob"; },
        setName(n) { name = n; return this; },
        setContentType(t) { contentType = t; return this; },
        copyBlob() { return Utilities.newBlob(Array.from(buf), contentType, name); },
      };
    },
    parseCsv(csv) {
      return String(csv).split(/\r?\n/).map((l) => l.split(","));
    },
    jsonParse(s) { return JSON.parse(s); },
    jsonStringify(o) { return JSON.stringify(o); },
  };

  /* ------------------------------------------------------------- Logger */
  const Logger = {
    log(...a) { logs.push(a.map(fmtLog).join(" ")); },
    clear() { logs.length = 0; },
  };
  const consoleShim = {
    log(...a) { logs.push(a.map(fmtLog).join(" ")); },
    info(...a) { logs.push("[INFO] " + a.map(fmtLog).join(" ")); },
    warn(...a) { logs.push("[WARN] " + a.map(fmtLog).join(" ")); },
    error(...a) { logs.push("[ERROR] " + a.map(fmtLog).join(" ")); },
  };
  function fmtLog(v) {
    if (typeof v === "string") return v;
    try { return JSON.stringify(v); } catch { return String(v); }
  }

  /* ------------------------------------------------- Html / Content / Script */
  const HtmlService = {
    SandboxMode: { IFRAME: "IFRAME", NATIVE: "NATIVE", EMULATED: "EMULATED" },
    XFrameOptionsMode: { ALLOWALL: "ALLOWALL", DEFAULT: "DEFAULT" },
    createHtmlOutput(html) {
      return htmlOutput(String(html ?? ""));
    },
    createHtmlOutputFromFile(name) { return htmlOutput(`<!-- ${name} -->`); },
    createTemplateFromFile(name) { return htmlOutput(`<!-- template ${name} -->`); },
  };
  function htmlOutput(content) {
    const o = {
      content,
      getContent() { return content; },
      setTitle(t) { return o; },
      setWidth(w) { return o; },
      setHeight(h) { return o; },
      setSandboxMode() { return o; },
      setXFrameOptionsMode() { return o; },
      append() { return o; },
      evaluate() { return o; },
    };
    return o;
  }

  const ContentService = {
    MimeType: { JSON: "JSON", TEXT: "TEXT", CSV: "CSV", ATOM: "ATOM", RSS: "RSS", XML: "XML", JAVASCRIPT: "JAVASCRIPT" },
    createTextOutput(text) {
      const o = {
        content: String(text ?? ""),
        getContent() { return o.content; },
        setMimeType(m) { o.mime = m; return o; },
        append(a) { o.content += String(a); return o; },
        clear() { o.content = ""; return o; },
        downloadAsFile() { return o; },
      };
      return o;
    },
  };

  const triggers = [];
  const ScriptApp = {
    AuthMode: { FULL: "FULL", LIMITED: "LIMITED", NONE: "NONE" },
    EventType: { CLOCK: "CLOCK", ON_OPEN: "ON_OPEN", ON_EDIT: "ON_EDIT", ON_FORM_SUBMIT: "ON_FORM_SUBMIT" },
    TriggerSource: { CLOCK: "CLOCK", SPREADSHEETS: "SPREADSHEETS" },
    getService() {
      return {
        getUrl() { return "https://script.google.com/macros/s/HARNESS/exec"; },
        isEnabled() { return true; },
        disable() {},
        enable() {},
      };
    },
    getProjectTriggers() { return triggers.slice(); },
    newTrigger(fnName) {
      const t = {
        handlerFunction: fnName,
        timeBased() { return this; },
        everyMinutes(n) { this.minutes = n; return this; },
        everyDays(n) { this.days = n; return this; },
        everyHours(n) { this.hours = n; return this; },
        atHour(h) { this.atHour = h; return this; },
        atMinute(m) { this.atMinute = m; return this; },
        inTimezone(tz) { this.tz = tz; return this; },
        onOpen() { return this; },
        onEdit() { return this; },
        forSpreadsheet() { return this; },
        create() { triggers.push(t); return t; },
        getUniqueId() { return "trg_" + (triggers.indexOf(t) + 1); },
        getHandlerFunction() { return t.handlerFunction; },
      };
      return t;
    },
    deleteTrigger(t) {
      const i = triggers.indexOf(t);
      if (i >= 0) triggers.splice(i, 1);
    },
  };

  const Session = {
    getScriptTimeZone() { return "Asia/Jakarta"; },
    getActiveUser() { return { getEmail: () => state.effectiveUser }; },
    getEffectiveUser() { return { getEmail: () => state.effectiveUser }; },
    getUser() { return { getEmail: () => state.effectiveUser }; },
  };

  const UrlFetchApp = {
    fetch(url, params) {
      if (!state.urlFetch) {
        unsupported.add?.("UrlFetchApp.fetch");
        unsupported.push(`UrlFetchApp.fetch(${String(url).slice(0, 60)})`);
        return {
          getResponseCode() { return 0; },
          getContentText() { return ""; },
          getBlob() { return Utilities.newBlob([], "text/plain", ""); },
          getHeaders() { return {}; },
        };
      }
      return state.urlFetch(url, params);
    },
    fetchAll(requests) { return requests.map((r) => UrlFetchApp.fetch(r.url, r)); },
    getRequest(url, params) { return { url, ...params }; },
  };

  /* ------------------------------------------------------------ globals */
  const globals = {
    SpreadsheetApp,
    CacheService,
    PropertiesService,
    LockService,
    DriveApp,
    Utilities,
    Logger,
    console: consoleShim,
    HtmlService,
    ContentService,
    ScriptApp,
    Session,
    UrlFetchApp,
    GmailApp: { sendEmail() {} },
    MailApp: { sendEmail() {} },
  };

  return {
    globals,
    store,
    state,
    logs,
    unsupported,
    driveFiles,
    driveFolders,
    /* test helpers */
    seedSheet(ssId, sheetName, header, rows) {
      store.ensureSheet(ssId, sheetName);
      const all = [header, ...rows];
      store.setValues(ssId, sheetName, 1, 1, all);
    },
    dumpSheet(ssId, sheetName) {
      const lr = store.lastRow(ssId, sheetName);
      const lc = store.lastCol(ssId, sheetName);
      if (!lr || !lc) return [];
      return store.getRange(ssId, sheetName, 1, 1, lr, lc);
    },
    unsupportedReport() {
      const counts = {};
      for (const u of unsupported) counts[u] = (counts[u] || 0) + 1;
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, n]) => ({ name, n }));
    },
  };
}
