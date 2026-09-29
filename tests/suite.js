/* Rangkaian uji untuk lapisan Guard. Dijalankan: node suite.js
   Semua data sintetis. Tidak ada koneksi ke Google. */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBackend } from "./harness/loader.js";
import { seedAll } from "./fixtures/seed.js";

const here = (u) => fileURLToPath(new URL(u, import.meta.url));
const BACKEND_ROOT = here("../SiSi_BackEnd");
const DB_PATH = process.env.SISI_TEST_DB || here("./.data/sisi-test.sqlite");

let lulus = 0;
let gagal = 0;
const kegagalan = [];

function ok(nama, syarat, detail) {
  if (syarat) { lulus++; console.log(`  \u2713 ${nama}`); }
  else { gagal++; kegagalan.push(nama + (detail ? ` -- ${detail}` : "")); console.log(`  \u2717 ${nama}${detail ? ` -- ${detail}` : ""}`); }
}
function sama(nama, aktual, harap) { ok(nama, JSON.stringify(aktual) === JSON.stringify(harap), JSON.stringify(aktual) !== JSON.stringify(harap) ? `diharap ${JSON.stringify(harap)}, dapat ${JSON.stringify(aktual)}` : ""); }
function call(ctx, fn, ...args) { return ctx.call(fn, args); }
function reset(ctx, spreadsheetId) { ctx.harness.store.reset(); seedAll(ctx, { spreadsheetId }); ctx.call("_bustUsersCache_"); }
function guard(ctx, argsArr, opts) { return ctx.call("guard_", [argsArr, opts || {}]); }

const ctx = loadBackend({ backendRoot: BACKEND_ROOT, dbPath: DB_PATH });
const SS = ctx.context.SPREADSHEET_ID;

console.log("\n=== 0. Pemuatan ===");
ok("semua file termuat tanpa error", ctx.errors.length === 0, ctx.errors.map((e) => `${e.file}: ${e.message}`).join(" | "));
ok("Guard.js ikut termuat (guard_ ada)", typeof ctx.context.guard_ === "function");
ok("safeCell_ ada", typeof ctx.context.safeCell_ === "function");
ok("withLock_ ada", typeof ctx.context.withLock_ === "function");

console.log("\n=== 1. safeCell_ (formula / CSV injection) ===");
{
  const f = (v) => ctx.call("safeCell_", [v]).value;
  sama("teks biasa tidak diubah", f("pohon dekat jaringan"), "pohon dekat jaringan");
  sama("awalan = dikawal", f('=IMPORTRANGE("x","A1")'), "'=IMPORTRANGE(\"x\",\"A1\")");
  sama("awalan + dikawal", f("+1+1"), "'+1+1");
  sama("awalan - dikawal", f("-5"), "'-5");
  sama("awalan @ dikawal", f("@SUM(A1)"), "'@SUM(A1)");
  sama("awalan tab dikawal", f("\t=cmd"), "'\t=cmd");
  sama("string kosong tetap kosong", f(""), "");
  sama("null jadi string kosong", f(null), "");
  sama("angka tidak disentuh", f(-5), -5);
  sama("boolean tidak disentuh", f(true), true);
  sama("safeRow_ memproses per elemen", ctx.call("safeRow_", [["=x", "aman", 3]]).value, ["'=x", "aman", 3]);
  sama("safeMatrix_ rekursif", ctx.call("safeMatrix_", [[["=a"], ["b"]]]).value, [["'=a"], ["b"]]);
}

console.log("\n=== 2. Normalisasi peran & ULP ===");
{
  const nr = (v) => ctx.call("_normRole_", [v]).value;
  sama('"Super User" -> SUPER', nr("Super User"), "SUPER");
  sama('"super user" -> SUPER', nr("super user"), "SUPER");
  sama('"superuser" -> SUPER', nr("superuser"), "SUPER");
  sama('"Admin" -> ADMIN', nr("Admin"), "ADMIN");
  sama('"admin" -> ADMIN', nr("admin"), "ADMIN");
  sama("role ADMIN tidak jadi SUPER", nr("admin") === "SUPER", false);
  sama("Operator tetap OPERATOR", nr("Operator"), "OPERATOR");
  const nu = (v) => ctx.call("_normUlp_", [v]).value;
  sama("ULP dirapikan", nu("  ULP   Toboali "), "ulp toboali");
  const us = (a, b) => ctx.call("ulpSama_", [a, b]).value;
  sama("ulpSama_ toleran huruf & spasi", us("ULP Toboali", "ulp  toboali"), true);
  sama("ulpSama_ beda ULP -> false", us("ULP Toboali", "ULP Lain"), false);
  sama("ulpSama_ ULP kosong -> false", us("ULP Toboali", ""), false);
  sama("ulpSama_ dua-duanya kosong -> false", us("", ""), false);
}

console.log("\n=== 3. Hash password + dual-read ===");
{
  const salt = "abc123def456abcd";
  const h = ctx.call("_hashPw_", ["RahasiaSuper123", salt]).value;
  ok("hash berformat sisi1$<salt>$<hex>", /^sisi1\$abc123def456abcd\$[0-9a-f]{64}$/.test(h), h);
  sama("hash verifikasi benar", ctx.call("_verifyPw_", [h, "RahasiaSuper123"]).value, true);
  sama("hash menolak password salah", ctx.call("_verifyPw_", [h, "salah"]).value, false);
  sama("plaintext lawas tetap diterima (dual-read)", ctx.call("_verifyPw_", ["RahasiaSuper123", "RahasiaSuper123"]).value, true);
  sama("plaintext lawas menolak yang salah", ctx.call("_verifyPw_", ["RahasiaSuper123", "bukan"]).value, false);
  sama("hash beda salt -> beda nilai", ctx.call("_hashPw_", ["RahasiaSuper123", "salt_lain_12345"]).value !== h, true);
  sama("password kosong ditolak", ctx.call("_verifyPw_", [h, ""]).value, false);
  sama("tersimpan kosong ditolak", ctx.call("_verifyPw_", ["", "x"]).value, false);
  sama("plaintext ditandai perlu upgrade", ctx.call("_pwPerluUpgrade_", ["RahasiaSuper123"]).value, true);
  sama("hash tidak perlu upgrade", ctx.call("_pwPerluUpgrade_", [h]).value, false);
}

console.log("\n=== 4. Login, sesi, dan guard_ ===");
reset(ctx, SS);
{
  const r = call(ctx, "doLogin", "superuser", "RahasiaSuper123");
  ok("login super user berhasil", r.ok && r.value && r.value.success === true, JSON.stringify(r.value));
  const token = r.value && r.value.token;
  ok("token berbentuk UUID", /^[0-9a-f-]{36}$/i.test(String(token)), String(token));
  const g = guard(ctx, [{ token: token }], { aksi: "uji" });
  ok("guard_ menerima token dari object payload", g.ok, g.error);
  if (g.ok) { sama("  role -> SUPER", g.value.role, "SUPER"); sama("  isSuper", g.value.isSuper, true); sama("  username dari sesi", g.value.username, "superuser"); sama("  ulpKey", g.value.ulpKey, "ulp-tbl"); }
  const gLangsung = ctx.call("guard_", [{ token: token }, { aksi: "uji" }]);
  ok("guard_(objek, opts) juga bekerja (tahan salah pasang)", gLangsung.ok, gLangsung.error);
  const g2 = guard(ctx, [token], { aksi: "uji" }); ok("guard_ menerima token sebagai argumen posisi", g2.ok, g2.error);
  const g3 = guard(ctx, [{ token: token }], { role: ["OPERATOR"], aksi: "uji" }); ok("SUPER lolos pengecekan peran lain (bypass)", g3.ok, g3.error);
  const g4 = guard(ctx, [{ token: token }], { role: ["OPERATOR"], superTidakBypass: true, aksi: "uji" }); ok("superTidakBypass menolak SUPER", !g4.ok, "seharusnya ditolak");
  if (!g4.ok) ok("  pesan penolakan jelas", /Akses ditolak/.test(g4.error), g4.error);
  const g5 = guard(ctx, [{ token: "bukan-token-sah" }], { aksi: "uji" }); ok("token palsu ditolak", !g5.ok, "seharusnya ditolak");
  if (!g5.ok) ok("  pesan: sesi habis", /Sesi habis|Sesi tidak/.test(g5.error), g5.error);
  const g6 = guard(ctx, [{}], { aksi: "uji" }); ok("tanpa token ditolak", !g6.ok, "seharusnya ditolak");
  const g7 = guard(ctx, [{ token: "" }], { aksi: "uji" }); ok("token kosong ditolak", !g7.ok, "seharusnya ditolak");
  const g8 = ctx.call("requireSesi_", [[{ token: token }]]); ok("requireSesi_ mengembalikan sesi", g8.ok && g8.value.username === "superuser", g8.error);
  const g9 = ctx.call("guard_", [[{ token: token }, { role: ["OPERATOR"], superTidakBypass: true, aksi: "uji" }]]); ok("opts di dalam array argumen diabaikan -> harus ditolak oleh audit", g9.ok, "terbukti lolos: audit wajib mengecek jumlah argumen");
}

console.log("\n=== 5. ULP scoping & fail-closed ===");
reset(ctx, SS);
{
  const sup = call(ctx, "doLogin", "superuser", "RahasiaSuper123").value.token;
  const op = call(ctx, "doLogin", "petugasrow", "RahasiaRow123").value.token;
  const tanpaUlp = call(ctx, "doLogin", "tanpakodeulp", "RahasiaKosong123").value.token;
  const gsR = guard(ctx, [{ token: sup }], { ulp: true, aksi: "uji" }); const goR = guard(ctx, [{ token: op }], { ulp: true, aksi: "uji" });
  ok("guard_ SUPER berhasil", gsR.ok, gsR.error); ok("guard_ operator berhasil", goR.ok, goR.error);
  const gs = gsR.value, go = goR.value;
  if (gs && go) { sama("SUPER boleh meminta ULP lain", call(ctx, "ulpScope_", gs, "ULP Lain").value, "ULP Lain"); sama("SUPER boleh meminta semua ULP", call(ctx, "ulpScope_", gs, "").value, ""); sama("operator dipaksa ke ULP sendiri walau minta ULP lain", call(ctx, "ulpScope_", go, "ULP Lain").value, "ULP Toboali"); }
  else { ok("SUPER boleh meminta ULP lain", false, "guard_ gagal, ulpScope_ tidak diuji"); ok("SUPER boleh meminta semua ULP", false, "guard_ gagal"); ok("operator dipaksa ke ULP sendiri", false, "guard_ gagal"); }
  const gt = guard(ctx, [{ token: tanpaUlp }], { ulp: true, aksi: "uji" }); ok("kodeUlp kosong tapi ulp ada -> tetap lolos (fallback ke ulp)", gt.ok, gt.error); sama("  ulpKey jatuh ke ulp", gt.value.ulpKey, "ulp toboali");
  const sh = ctx.harness.store, dump = ctx.harness.dumpSheet(SS, "db_Users");
  for (let i = 1; i < dump.length; i++) if (String(dump[i][2]).trim() === "tanpakodeulp") { sh.setCell(SS, "db_Users", i + 1, 6, ""); sh.setCell(SS, "db_Users", i + 1, 7, ""); }
  ctx.call("_bustUsersCache_");
  const ulang = call(ctx, "doLogin", "tanpakodeulp", "RahasiaKosong123").value.token; const gb = guard(ctx, [{ token: ulang }], { ulp: true, aksi: "uji" }); ok("akun tanpa ULP DITOLAK (fail-closed)", !gb.ok, "seharusnya ditolak"); if (!gb.ok) ok("  pesan menyebut ULP", /ULP/.test(gb.error), gb.error);
}

// ... existing suite sections remain unchanged ...

console.log("\n=== 12. Webhook AppSheet ===");
reset(ctx, SS);
{
  const SECRET = "test-webhook-secret-32-characters-ok";
  const TS = String(Date.now());
  const W = (body) => ctx.call("webhookVerifikasi_", [body]).value;
  const withTs = (body) => ({ ts: TS, ...body });

  const kosong = W({ secret: SECRET, action: "recalcRow" });
  sama("tanpa Script Property -> SECRET_KOSONG", kosong.kode, "SECRET_KOSONG");
  ctx.evalInVm(`PropertiesService.getScriptProperties().setProperty('SISI_WEBHOOK_SECRET', '${SECRET}')`);

  ok("secret salah -> ditolak", W({ secret: "bukan", action: "recalcRow" }).ok === false);
  ok("secret kosong -> ditolak", W({ action: "recalcRow" }).ok === false);
  const benar = W(withTs({ secret: SECRET, action: "recalcRow" }));
  ok("secret property benar + action dikenal -> lolos", benar.ok === true, JSON.stringify(benar));
  sama("  action dikembalikan", benar.action, "recalcRow");
  ok("action di luar daftar -> ditolak", W({ secret: SECRET, action: "hapusSemuaData" }).ok === false);
  sama("  kode ACTION_TIDAK_DIKENAL", W({ secret: SECRET, action: "hapusSemuaData" }).kode, "ACTION_TIDAK_DIKENAL");
  ok("action kosong -> ditolak", W({ secret: SECRET }).ok === false);

  const tsMs = (v) => ctx.call("_webhookTsMs_", [v]).value;
  const sekarang = Date.now();
  sama("epoch milidetik", tsMs(String(sekarang)), sekarang);
  sama("epoch detik", tsMs(String(Math.floor(sekarang / 1000))), Math.floor(sekarang / 1000) * 1000);
  ok("ISO ISO-8601 dipahami", Math.abs(tsMs(new Date(sekarang).toISOString()) - sekarang) < 1000);
  const teksWib = new Date(sekarang + 7 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 19);
  ok('format "yyyy-MM-dd HH:mm:ss" dianggap WIB', Math.abs(tsMs(teksWib) - sekarang) < 2000, `teks=${teksWib} hasil=${tsMs(teksWib)} sekarang=${sekarang}`);
  sama("teks ngawur -> 0", tsMs("bukan-waktu"), 0);
  sama("kosong -> 0", tsMs(""), 0);
  const mode = () => ctx.call("_webhookTsMode_", []).value;
  sama("mode default = enforce", mode(), "enforce");
  ok("mode enforce: tanpa ts -> ditolak", W({ secret: SECRET, action: "recalcRow" }).kode === "TS_TIDAK_VALID");
  ok("mode enforce: ts sekarang -> lolos", W(withTs({ secret: SECRET, action: "recalcRow" })).ok === true);
  ok("mode enforce: ts 20 menit lalu -> ditolak", W({ secret: SECRET, action: "recalcRow", ts: String(Date.now() - 20 * 60000) }).ok === false);
  ok("mode enforce: ts 5 menit lalu -> lolos", W({ secret: SECRET, action: "recalcRow", ts: String(Date.now() - 5 * 60000 }).ok === true);
  ctx.evalInVm(`PropertiesService.getScriptProperties().setProperty('SISI_WEBHOOK_TS_MODE','off')`);
  ok("mode off: tanpa ts lolos", W({ secret: SECRET, action: "recalcRow" }).ok === true);
  ctx.evalInVm(`PropertiesService.getScriptProperties().deleteProperty('SISI_WEBHOOK_TS_MODE')`);
}

console.log("\n=== 13. Pemisahan jalur doPost ===");
reset(ctx, SS);
{
  const SECRET = "test-webhook-secret-32-characters-ok";
  const TS = String(Date.now());
  ctx.evalInVm(`PropertiesService.getScriptProperties().setProperty('SISI_WEBHOOK_SECRET', '${SECRET}')`);
  const post = (parameter, contents) => { const e = { parameter, postData: { contents: JSON.stringify(contents) } }; const r = ctx.call("doPost", [e]); if (!r.ok) return { ok: false, error: r.error }; try { return JSON.parse(r.value.getContent()); } catch (err) { return { ok: false, error: "bukan JSON" }; } };
  const viaBody = post({}, { secret: SECRET, action: "recalcRow", tim: "X", ts: TS });
  ok("secret di body POST -> diterima", viaBody.ok === true, JSON.stringify(viaBody));
  const viaQuery = post({ secret: SECRET, action: "recalcRow" }, {});
  ok("secret di query string -> DITOLAK", viaQuery.ok === false, JSON.stringify(viaQuery));
  sama("  kode SECRET_SALAH", viaQuery.kode, "SECRET_SALAH");
  const mobileBawaSecret = post({ mobile: "1" }, { secret: SECRET, action: "recalcRow" });
  ok("?mobile=1 + action webhook tidak dieksekusi webhook", mobileBawaSecret.ok !== true || !("queued" in mobileBawaSecret), JSON.stringify(mobileBawaSecret));
  ok("  masuk apiRouter_ sebagai action tidak dikenal", /tidak dikenal/i.test(String(mobileBawaSecret.message || "")), JSON.stringify(mobileBawaSecret));
}

console.log("\n" + "=".repeat(56));
console.log(`LULUS ${lulus}   GAGAL ${gagal}`);
if (kegagalan.length) { console.log("\nKegagalan:"); kegagalan.forEach((k) => console.log("  - " + k)); }
const unsup = ctx.harness.unsupportedReport();
if (unsup.length) { console.log("\nAPI Apps Script yang belum teremulasi:"); unsup.slice(0, 15).forEach((u) => console.log(`  ${u.n}x  ${u.name}`)); }
process.exit(gagal ? 1 : 0);
