/* SQLite-backed emulation of the parts of Google Sheets that SiSi_BackEnd uses.
   Cells are stored sparse; getLastRow/getLastColumn are computed so they stay
   correct after clears and deletes, which is what append-by-getLastRow+1 needs. */

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const T_EMPTY = "";
const T_STR = "s";
const T_NUM = "n";
const T_BOOL = "b";
const T_DATE = "d";

export function encodeCell(v) {
  if (v === null || v === undefined) return { t: T_EMPTY, v: "" };
  if (v instanceof Date) return { t: T_DATE, v: v.toISOString() };
  if (typeof v === "number") return { t: T_NUM, v: String(v) };
  if (typeof v === "boolean") return { t: T_BOOL, v: v ? "true" : "false" };
  return { t: T_STR, v: String(v) };
}

export function decodeCell(t, v) {
  if (t === T_EMPTY || v === null || v === undefined || v === "") return "";
  if (t === T_NUM) return Number(v);
  if (t === T_BOOL) return v === "true";
  if (t === T_DATE) return new Date(String(v));
  return String(v);
}

function isBlank(t, v) {
  return t === T_EMPTY || v === null || v === undefined || v === "";
}

export class SheetStore {
  constructor(dbPath) {
    this.dbPath = dbPath;
    if (dbPath !== ":memory:") {
      mkdirSync(dirname(resolve(dbPath)), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this._migrate();
    this._prepare();
  }

  _migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS spreadsheets (
        id   TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS sheets (
        ss_id TEXT NOT NULL,
        name  TEXT NOT NULL,
        PRIMARY KEY (ss_id, name)
      );
      CREATE TABLE IF NOT EXISTS cells (
        ss_id  TEXT NOT NULL,
        sheet  TEXT NOT NULL,
        row    INTEGER NOT NULL,
        col    INTEGER NOT NULL,
        t      TEXT NOT NULL DEFAULT '',
        v      TEXT NOT NULL DEFAULT '',
        f      TEXT,
        fmt    TEXT,
        PRIMARY KEY (ss_id, sheet, row, col)
      );
      CREATE INDEX IF NOT EXISTS idx_cells_sheet ON cells (ss_id, sheet);
      CREATE TABLE IF NOT EXISTS kv (
        ns  TEXT NOT NULL,
        k   TEXT NOT NULL,
        v   TEXT NOT NULL,
        exp INTEGER,
        PRIMARY KEY (ns, k)
      );
    `);
  }

  _prepare() {
    this.st = {
      putSs: this.db.prepare(
        "INSERT INTO spreadsheets (id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name",
      ),
      getSs: this.db.prepare("SELECT id, name FROM spreadsheets WHERE id = ?"),
      allSs: this.db.prepare("SELECT id, name FROM spreadsheets"),
      putSheet: this.db.prepare(
        "INSERT INTO sheets (ss_id, name) VALUES (?, ?) ON CONFLICT DO NOTHING",
      ),
      getSheets: this.db.prepare(
        "SELECT name FROM sheets WHERE ss_id = ? ORDER BY name",
      ),
      delSheet: this.db.prepare(
        "DELETE FROM sheets WHERE ss_id = ? AND name = ?",
      ),
      getCell: this.db.prepare(
        "SELECT t, v, f, fmt FROM cells WHERE ss_id = ? AND sheet = ? AND row = ? AND col = ?",
      ),
      putCell: this.db.prepare(
        `INSERT INTO cells (ss_id, sheet, row, col, t, v, f, fmt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(ss_id, sheet, row, col) DO UPDATE SET t = excluded.t, v = excluded.v, f = excluded.f,
           fmt = CASE WHEN excluded.fmt IS NULL THEN cells.fmt ELSE excluded.fmt END`,
      ),
      clearRange: this.db.prepare(
        "DELETE FROM cells WHERE ss_id = ? AND sheet = ? AND row >= ? AND row < ? AND col >= ? AND col < ?",
      ),
      lastRow: this.db.prepare(
        `SELECT COALESCE(MAX(row), 0) AS m FROM cells
         WHERE ss_id = ? AND sheet = ? AND (f IS NOT NULL OR (t <> '' AND v <> ''))`,
      ),
      lastCol: this.db.prepare(
        `SELECT COALESCE(MAX(col), 0) AS m FROM cells
         WHERE ss_id = ? AND sheet = ? AND (f IS NOT NULL OR (t <> '' AND v <> ''))`,
      ),
      delRow: this.db.prepare(
        "DELETE FROM cells WHERE ss_id = ? AND sheet = ? AND row = ?",
      ),
      shiftUp: this.db.prepare(
        "UPDATE cells SET row = row - ? WHERE ss_id = ? AND sheet = ? AND row >= ?",
      ),
      shiftDown: this.db.prepare(
        "UPDATE cells SET row = row + ? WHERE ss_id = ? AND sheet = ? AND row > ?",
      ),
      rowsIn: this.db.prepare(
        "SELECT row, col, t, v, f, fmt FROM cells WHERE ss_id = ? AND sheet = ? AND row >= ? AND row < ? AND col >= ? AND col < ?",
      ),
      kvGet: this.db.prepare("SELECT v, exp FROM kv WHERE ns = ? AND k = ?"),
      kvPut: this.db.prepare(
        "INSERT INTO kv (ns, k, v, exp) VALUES (?, ?, ?, ?) ON CONFLICT(ns, k) DO UPDATE SET v = excluded.v, exp = excluded.exp",
      ),
      kvDel: this.db.prepare("DELETE FROM kv WHERE ns = ? AND k = ?"),
      kvNs: this.db.prepare("SELECT k, v, exp FROM kv WHERE ns = ?"),
      kvDelNs: this.db.prepare("DELETE FROM kv WHERE ns = ?"),
    };
  }

  /* ---------- spreadsheets & sheets ---------- */
  ensureSpreadsheet(id, name = "") {
    this.st.putSs.run(id, name || id);
    return id;
  }
  spreadsheet(id) {
    return this.st.getSs.get(id);
  }
  listSpreadsheets() {
    return this.st.allSs.all();
  }
  ensureSheet(ssId, name) {
    this.ensureSpreadsheet(ssId);
    this.st.putSheet.run(ssId, name);
  }
  listSheets(ssId) {
    return this.st.getSheets.all(ssId).map((r) => r.name);
  }
  deleteSheet(ssId, name) {
    this.st.delSheet.run(ssId, name);
    this.st.clearRange.run(ssId, name, 1, 2147483647, 1, 2147483647);
  }

  /* ---------- cells ---------- */
  getRange(ssId, sheet, row, col, nRows = 1, nCols = 1) {
    const rows = this.st.rowsIn.all(
      ssId,
      sheet,
      row,
      row + nRows,
      col,
      col + nCols,
    );
    const out = [];
    for (let r = 0; r < nRows; r++) out.push(new Array(nCols).fill(""));
    for (const c of rows) {
      out[c.row - row][c.col - col] = decodeCell(c.t, c.v);
    }
    return out;
  }

  setValues(ssId, sheet, row, col, matrix) {
    for (let r = 0; r < matrix.length; r++) {
      const line = matrix[r] || [];
      for (let c = 0; c < line.length; c++) {
        this.setCell(ssId, sheet, row + r, col + c, line[c]);
      }
    }
  }

  setCell(ssId, sheet, row, col, value, formula = null) {
    if (row < 1 || col < 1) throw new Error(`indeks sel di luar batas: ${row},${col}`);
    const enc = value === null || value === undefined ? { t: T_EMPTY, v: "" } : encodeCell(value);
    this.st.putCell.run(
      ssId,
      sheet,
      row,
      col,
      formula ? T_EMPTY : enc.t,
      formula ? "" : enc.v,
      formula,
      null,
    );
  }

  getFormulas(ssId, sheet, row, col, nRows, nCols) {
    const rows = this.st.rowsIn.all(
      ssId,
      sheet,
      row,
      row + nRows,
      col,
      col + nCols,
    );
    const out = [];
    for (let r = 0; r < nRows; r++) out.push(new Array(nCols).fill(""));
    for (const c of rows) out[c.row - row][c.col - col] = c.f == null ? "" : c.f;
    return out;
  }

  setNumberFormat(ssId, sheet, row, col, nRows, nCols, fmt) {
    for (let r = 0; r < nRows; r++)
      for (let c = 0; c < nCols; c++) {
        const cur = this.st.getCell.get(ssId, sheet, row + r, col + c);
        this.st.putCell.run(
          ssId,
          sheet,
          row + r,
          col + c,
          cur ? cur.t : T_EMPTY,
          cur ? cur.v : "",
          cur ? cur.f : null,
          fmt,
        );
      }
  }

  clearContent(ssId, sheet, row, col, nRows, nCols) {
    this.st.clearRange.run(ssId, sheet, row, row + nRows, col, col + nCols);
  }

  lastRow(ssId, sheet) {
    return this.st.lastRow.get(ssId, sheet).m;
  }
  lastCol(ssId, sheet) {
    return this.st.lastCol.get(ssId, sheet).m;
  }

  deleteRow(ssId, sheet, row) {
    this.st.delRow.run(ssId, sheet, row);
    this.st.shiftUp.run(1, ssId, sheet, row + 1);
  }

  insertRowsAfter(ssId, sheet, after, howMany) {
    this.st.shiftDown.run(howMany, ssId, sheet, after);
  }

  appendRow(ssId, sheet, values) {
    const target = this.lastRow(ssId, sheet) + 1;
    this.setValues(ssId, sheet, target, 1, [values]);
    return target;
  }

  /* Sort data rows (row 2..last) by one column, header row 1 stays put.
     asc=true sorts ascending. Blanks always sink to the bottom, like Sheets. */
  sort(ssId, sheet, col, asc = true) {
    const last = this.lastRow(ssId, sheet);
    if (last < 3) return;
    const width = this.lastCol(ssId, sheet);
    const data = this.getRange(ssId, sheet, 2, 1, last - 1, width);
    const keyIdx = col - 1;
    data.sort((a, b) => {
      const x = a[keyIdx];
      const y = b[keyIdx];
      const xb = x === "" || x === null || x === undefined;
      const yb = y === "" || y === null || y === undefined;
      if (xb && yb) return 0;
      if (xb) return 1;
      if (yb) return -1;
      let cmp;
      if (typeof x === "number" && typeof y === "number") cmp = x - y;
      else cmp = String(x).localeCompare(String(y));
      return asc ? cmp : -cmp;
    });
    this.setValues(ssId, sheet, 2, 1, data);
  }

  /* ---------- key/value (backing for PropertiesService + CacheService) ---------- */
  kvGet(ns, k) {
    const row = this.st.kvGet.get(ns, k);
    if (!row) return null;
    if (row.exp != null && Date.now() > row.exp) {
      this.st.kvDel.run(ns, k);
      return null;
    }
    return row.v;
  }
  kvPut(ns, k, v, ttlSec) {
    this.st.kvPut.run(ns, k, String(v), ttlSec ? Date.now() + ttlSec * 1000 : null);
  }
  kvRemove(ns, k) {
    this.st.kvDel.run(ns, k);
  }
  kvNamespace(ns) {
    const out = {};
    for (const r of this.st.kvNs.all(ns)) {
      if (r.exp != null && Date.now() > r.exp) {
        this.st.kvDel.run(ns, r.k);
        continue;
      }
      out[r.k] = r.v;
    }
    return out;
  }
  kvClear(ns) {
    this.st.kvDelNs.run(ns);
  }

  reset() {
    this.db.exec("DELETE FROM cells; DELETE FROM sheets; DELETE FROM kv;");
  }

  close() {
    this.db.close();
  }
}
