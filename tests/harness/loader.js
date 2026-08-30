/* Loads every SiSi_BackEnd .js file into one shared VM context, the way the Apps
   Script V8 runtime evaluates all project files in a single global scope. */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { createHarness } from "./apps-script-shim.js";

/* Order matters only for load-time syntax/redeclaration issues, not for call
   time. Code.js first because it declares SPREADSHEET_ID and COL_USERS. */
const LOAD_ORDER = [
  "Core/Code.js",
  "Core/Engine-Secrets.js",
  "Core/Guard.js",
  "Core/Migrasi-Password.js",
  "Core/Audit-Guard.js",
  "Core/Auth-Perangkat.js",
  "Core/Delta-Sync-Mobile.js",
  "Core/Master-Gardu-Mobile.js",
  "Core/Master-Gardu-Sync-Mobile.js",
  "Core/Inspeksi-Gardu-Mobile.js",
  "Core/WO-ROW-Mobile.js",
  "Core/Teknik-TO-Mobile.js",
  "Core/Tek-MobileDual.js",
  "Core/Foto-Url.js",
  "Core/Trigger-Manager.js",
  "Core/Predeploy-Audit.js",
  "Core/Tek-Temuan-Code.js",
  "Core/Tek-WAEngine.js",
  "Core/Tek-Gangguan.js",
  "Core/Tek-Watermark.js",
  "Core/SIE-BA-Code.js",
  "Core/Tek-Migrasi.js",
  "ROW/Tek-ROW-Code.js",
  "Yandal/Tek-Yandal-Code.js",
  "Hartek/Tek-Hartek-Code.js",
  "Inspeksi_Gardu/Tek-InsDu-Code.js",
  "Inspeksi_Jaringan/Tek-InsJar-Code.js",
  "Teknik/SIE-Teknik-Code.js",
  "Teknik/Jadwal-Padam-Code.js",
  "Teknik/Tek-Data-Chechpoint-Code.js",
  "Teknik/Tek-LapUP3UIWHarian.js",
  "Teknik/ZZ-Gaspol-DualRead.js",
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
        found.push(relative(backendRoot, full).replace(/\\/g, "/"));
      }
    }
  })(backendRoot);
  return found;
}

export function orderFiles(available) {
  const set = new Set(available);
  const ordered = LOAD_ORDER.filter((f) => set.has(f));
  const rest = available.filter((f) => !LOAD_ORDER.includes(f)).sort();
  return [...ordered, ...rest];
}

export function loadBackend(options = {}) {
  const backendRoot = resolve(options.backendRoot);
  const harnessOptions = { dbPath: options.dbPath || ":memory:", ...(options.harness || {}) };
  const harness = createHarness(harnessOptions);

  const context = createContext(harness.globals);
  const errors = [];
  const loaded = [];

  for (const rel of orderFiles(listBackendFiles(backendRoot))) {
    const src = readFileSync(join(backendRoot, rel.replace(/\//g, "\\")), "utf8");
    try {
      runInContext(src, context, { filename: rel, displayErrors: true });
      loaded.push(rel);
    } catch (err) {
      errors.push({ file: rel, message: err.message, stack: (err.stack || "").split("\n").slice(0, 4).join("\n") });
    }
  }

  function call(fnName, args = []) {
    const fn = context[fnName];
    if (typeof fn !== "function") {
      return { ok: false, error: `Fungsi tidak ditemukan atau bukan function: ${fnName}` };
    }
    try {
      return { ok: true, value: fn(...args) };
    } catch (err) {
      return { ok: false, error: err.message, stack: (err.stack || "").split("\n").slice(0, 6).join("\n") };
    }
  }

  function fnNames() {
    return Object.keys(context).filter((k) => typeof context[k] === "function");
  }

  /* Jalankan potongan kode di dalam VM. Dipakai uji untuk mendefinisikan fungsi
     sementara yang perlu memanggil API Apps Script dari dalam konteks. */
  function evalInVm(src, label = "eval") {
    return runInContext(src, context, { filename: label, displayErrors: true });
  }

  return { harness, context, call, fnNames, evalInVm, errors, loaded, backendRoot };
}
