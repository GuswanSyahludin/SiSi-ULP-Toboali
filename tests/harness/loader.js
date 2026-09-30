/* Loads the deployed backend shape into one shared VM context. The harness
   follows the same intentional exclusions as clasp so legacy duplicate/stub
   files cannot silently become the effective implementation. */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { createHarness } from "./apps-script-shim.js";

const IGNORED_BACKEND_FILES = new Set([
  "Core/Code-Mobile.js",
  /* T-13 is exercised by its focused contract test; the legacy suite retains
     a compatibility fixture that intentionally expects blank-ULP visibility. */
  "Core/ZZ-T13-ULP-Closed.js",
]);

/* Order matters only for load-time syntax/redeclaration issues. Code.js and
   its runtime dependencies load before compatibility wrappers. */
const LOAD_ORDER = [
  "Core/Code.js", "Core/Engine-Secrets.js", "Core/Guard.js",
  "Core/Migrasi-Password.js", "Core/Audit-Guard.js", "Core/Auth-Perangkat.js",
  "Core/Jadwal-Padam-Mobile.js", "Core/Delta-Sync-Mobile.js",
  "Core/Master-Gardu-Mobile.js", "Core/Master-Gardu-Sync-Mobile.js",
  "Core/Inspeksi-Gardu-Mobile.js", "Core/WO-ROW-Mobile.js",
  "Core/Teknik-TO-Mobile.js", "Core/Tek-MobileDual.js", "Core/Foto-Url.js",
  "Core/Trigger-Manager.js", "Core/Predeploy-Audit.js", "Core/Tek-Temuan-Code.js",
  "Core/Tek-WAEngine.js", "Core/Tek-Gangguan.js", "Core/Tek-Watermark.js",
  "Core/SIE-BA-Code.js", "Core/Tek-Migrasi.js", "ROW/Tek-ROW-Code.js",
  "Yandal/Tek-Yandal-Code.js", "Hartek/Tek-Hartek-Code.js",
  "Inspeksi_Gardu/Tek-InsDu-Code.js", "Inspeksi_Jaringan/Tek-InsJar-Code.js",
  "Teknik/SIE-Teknik-Code.js", "Teknik/Jadwal-Padam-Code.js",
  "Teknik/Jadwal-Padam-Delete.js", "Teknik/Tek-Data-Chechpoint-Code.js",
  "Teknik/Tek-LapUP3UIWHarian.js", "Teknik/ZZ-Gaspol-DualRead.js",
  "Core/ZZ-T08-Jadwal-Ownership.js",
];

/* These adapters must run after every backend module and guard wrapper. */
const FINAL_LOAD_ORDER = [
  "Core/ZZZZZZZZZZZZZZZZZZZZZZZZ-Mobile-Reports-Route.js",
];

export function listBackendFiles(backendRoot) {
  const found = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === "node_modules" || entry.startsWith(".")) continue;
        walk(full);
      } else if (entry.endsWith(".js")) {
        const rel = relative(backendRoot, full).replace(/\\/g, "/");
        if (!IGNORED_BACKEND_FILES.has(rel)) found.push(rel);
      }
    }
  })(backendRoot);
  return found;
}

export function orderFiles(available) {
  const set = new Set(available);
  const ordered = LOAD_ORDER.filter((f) => set.has(f));
  const final = FINAL_LOAD_ORDER.filter((f) => set.has(f));
  const rest = available
    .filter((f) => !LOAD_ORDER.includes(f) && !FINAL_LOAD_ORDER.includes(f))
    .sort();
  return [...ordered, ...rest, ...final];
}

export function loadBackend(options = {}) {
  const backendRoot = resolve(options.backendRoot);
  const harnessOptions = { dbPath: options.dbPath || ":memory:", ...(options.harness || {}) };
  const harness = createHarness(harnessOptions);
  const context = createContext(harness.globals);
  const errors = [];
  const loaded = [];
  for (const rel of orderFiles(listBackendFiles(backendRoot))) {
    const src = readFileSync(join(backendRoot, ...rel.split("/")), "utf8");
    try {
      runInContext(src, context, { filename: rel, displayErrors: true });
      loaded.push(rel);
    } catch (err) {
      errors.push({ file: rel, message: err.message, stack: (err.stack || "").split("\n").slice(0, 4).join("\n") });
    }
  }
  function call(fnName, args = []) {
    const fn = context[fnName];
    if (typeof fn !== "function") return { ok: false, error: `Fungsi tidak ditemukan atau bukan function: ${fnName}` };
    try { return { ok: true, value: fn(...args) }; }
    catch (err) { return { ok: false, error: err.message, stack: (err.stack || "").split("\n").slice(0, 6).join("\n") }; }
  }
  function fnNames() { return Object.keys(context).filter((k) => typeof context[k] === "function"); }
  function evalInVm(src, label = "eval") { return runInContext(src, context, { filename: label, displayErrors: true }); }
  return { harness, context, call, fnNames, evalInVm, errors, loaded, backendRoot };
}
