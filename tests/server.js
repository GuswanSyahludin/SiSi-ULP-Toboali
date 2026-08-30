/* Local test server + CLI for the SiSi_BackEnd Apps Script harness.
   Binds to 127.0.0.1 only. Works purely on synthetic fixtures - it never
   contacts Google and never holds production data. */

import { createServer } from "node:http";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const here = (u) => fileURLToPath(new URL(u, import.meta.url));
import { loadBackend } from "./harness/loader.js";
import { seedAll } from "./fixtures/seed.js";

const DEFAULT_BACKEND = here("../SiSi_BackEnd");
const POSITIONAL = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const EXPLICIT_BACKEND = POSITIONAL.length && existsSync(resolve(POSITIONAL[0])) && statSync(resolve(POSITIONAL[0])).isDirectory()
  ? resolve(POSITIONAL[0])
  : null;
const BACKEND_ROOT = EXPLICIT_BACKEND || resolve(DEFAULT_BACKEND);

const DB_PATH = process.env.SISI_TEST_DB
  ? resolve(process.env.SISI_TEST_DB)
  : here("./.data/sisi-test.sqlite");

const PORT = Number(process.env.SISI_TEST_PORT || 8787);
const HOST = "127.0.0.1";

function boot() {
  const ctx = loadBackend({ backendRoot: BACKEND_ROOT, dbPath: DB_PATH });
  const spreadsheetId = ctx.context.SPREADSHEET_ID || "ss_default";
  return { ctx, spreadsheetId };
}

function safeJson(v) {
  return JSON.parse(
    JSON.stringify(v === undefined ? null : v, (_k, x) =>
      typeof x === "bigint" ? String(x) : x instanceof Date ? x.toISOString() : x,
    ) ?? "null",
  );
}

function readBody(req) {
  return new Promise((res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      try { res(b ? JSON.parse(b) : {}); } catch { res({}); }
    });
  });
}

/* ------------------------------------------------------------------- CLI */
function cli(argv) {
  const cmd = argv[0] || "help";
  const { ctx, spreadsheetId } = boot();

  const report = () => {
    const errs = ctx.errors;
    if (errs.length) {
      console.log(`\nGAGAL memuat ${errs.length} file:`);
      for (const e of errs) console.log(`  ${e.file}: ${e.message}`);
    }
    console.log(`\nDimuat: ${ctx.loaded.length} file, ${ctx.fnNames().length} fungsi global`);
    console.log(`SPREADSHEET_ID: ${spreadsheetId}`);
    return errs.length === 0;
  };

  switch (cmd) {
    case "load":
      return report() ? 0 : 1;

    case "seed": {
      const r = seedAll(ctx, { spreadsheetId });
      console.log("Seed selesai:", JSON.stringify(r));
      console.log("Sheet db_Users:");
      for (const row of ctx.harness.dumpSheet(spreadsheetId, "db_Users"))
        console.log("  " + JSON.stringify(row));
      return 0;
    }

    case "reset":
      ctx.harness.store.reset();
      console.log("Database dikosongkan.");
      return 0;

    case "unsupported": {
      const u = ctx.harness.unsupportedReport();
      if (!u.length) console.log("Semua panggilan teremulasi.");
      for (const x of u) console.log(`${String(x.n).padStart(5)}  ${x.name}`);
      return 0;
    }

    case "fns": {
      const filter = argv[1] || "";
      for (const n of ctx.fnNames().sort())
        if (!filter || n.toLowerCase().includes(filter.toLowerCase())) console.log(n);
      return 0;
    }

    case "run": {
      const fn = argv[1];
      if (!fn) { console.error("Pakai: node server.js run <namaFungsi> [arg...]"); return 1; }
      const args = argv.slice(2).map((a) => {
        try { return JSON.parse(a); } catch { return a; }
      });
      const r = ctx.call(fn, args);
      console.log(JSON.stringify(safeJson(r), null, 2));
      return r.ok ? 0 : 1;
    }

    default:
      console.log(`Pakai:
  node server.js load                    Muat semua file backend, laporkan error
  node server.js seed                    Isi fixture sintetis ke SQLite
  node server.js reset                   Kosongkan database uji
  node server.js fns [filter]            Daftar fungsi global yang termuat
  node server.js run <fn> [arg...]       Panggil fungsi backend
  node server.js unsupported             Laporkan API Apps Script yang belum teremulasi
  node server.js --serve                 Jalankan server HTTP di ${HOST}:${PORT}
`);
      return 0;
  }
}

/* --------------------------------------------------------------- Server */
function serve() {
  const { ctx, spreadsheetId } = boot();
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${HOST}`);
    const send = (code, body) => {
      res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(safeJson(body), null, 2));
    };
    try {
      const p = url.pathname;

      if (p === "/health") return send(200, {
        ok: true,
        files: ctx.loaded.length,
        loadErrors: ctx.errors.length,
        functions: ctx.fnNames().length,
        spreadsheetId,
        db: DB_PATH,
      });

      if (p === "/load-errors") return send(200, ctx.errors);

      if (p === "/unsupported") return send(200, ctx.harness.unsupportedReport());

      if (p === "/fns") return send(200, ctx.fnNames().sort());

      if (p === "/seed" && req.method === "POST")
        return send(200, seedAll(ctx, { spreadsheetId }));

      if (p === "/reset" && req.method === "POST") {
        ctx.harness.store.reset();
        return send(200, { ok: true });
      }

      if (p === "/sheets")
        return send(200, ctx.harness.store.listSheets(spreadsheetId));

      const sheetMatch = p.match(/^\/sheet\/(.+)$/);
      if (sheetMatch) {
        const name = decodeURIComponent(sheetMatch[1]);
        return send(200, ctx.harness.dumpSheet(spreadsheetId, name));
      }

      if (p === "/logs") return send(200, ctx.harness.logs.slice(-200));

      if (p === "/run" && req.method === "POST") {
        const body = await readBody(req);
        const r = ctx.call(String(body.fn || ""), Array.isArray(body.args) ? body.args : []);
        return send(r.ok ? 200 : 400, r);
      }

      return send(404, { ok: false, message: `Rute tidak dikenal: ${p}` });
    } catch (err) {
      return send(500, { ok: false, message: err.message });
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`SiSi test harness aktif di http://${HOST}:${PORT}`);
    console.log(`  backend : ${BACKEND_ROOT}`);
    console.log(`  sqlite  : ${DB_PATH}`);
    console.log(`  dimuat  : ${ctx.loaded.length} file, ${ctx.fnNames().length} fungsi`);
    if (ctx.errors.length) {
      console.log(`  GAGAL   : ${ctx.errors.length} file`);
      for (const e of ctx.errors) console.log(`    ${e.file}: ${e.message}`);
    }
  });
}

const cliArgs = EXPLICIT_BACKEND ? POSITIONAL.slice(1) : POSITIONAL;
if (process.argv.includes("--serve")) serve();
else process.exit(cli(cliArgs));
