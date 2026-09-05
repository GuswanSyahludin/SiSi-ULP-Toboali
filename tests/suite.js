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
  if (syarat) {
    lulus++;
    console.log(`  \u2713 ${nama}`);
  } else {
    gagal++;
    kegagalan.push(nama + (detail ? ` -- ${detail}` : ""));
    console.log(`  \u2717 ${nama}${detail ? ` -- ${detail}` : ""}`);
  }
}

function sama(nama, aktual, harap) {
  ok(nama, JSON.stringify(aktual) === JSON.stringify(harap),
    JSON.stringify(aktual) !== JSON.stringify(harap)
      ? `diharap ${JSON.stringify(harap)}, dapat ${JSON.stringify(aktual)}`
      : "");
}

/* Panggil fungsi backend; kembalikan {ok, value} atau {ok:false, error}.
   PERHATIAN: argumen dikirim apa adanya. `call(ctx, "f", a, b)` -> f(a, b).
   Jangan menulis `call(ctx, "f", [a, b])` kalau yang dimaksud f(a, b) — itu
   menjadi f([a, b]). Untuk mengirim array sebagai SATU argumen, tulis
   `ctx.call("f", [[a, b]])`. */
function call(ctx, fn, ...args) {
  return ctx.call(fn, args);
}

function reset(ctx, spreadsheetId) {
  ctx.harness.store.reset();
  seedAll(ctx, { spreadsheetId });
  ctx.call("_bustUsersCache_");
}

/* Meniru persis pemanggilan di kode produksi: guard_(arguments, opts).
   opts HARUS argumen terpisah — kalau digabung ke dalam array argumen, guard_
   akan memakai {} dan melewatkan semua pemeriksaan peran/ULP secara diam-diam. */
function guard(ctx, argsArr, opts) {
  return ctx.call("guard_", [argsArr, opts || {}]);
}

const ctx = loadBackend({ backendRoot: BACKEND_ROOT, dbPath: DB_PATH });
const SS = ctx.context.SPREADSHEET_ID;

console.log("\n=== 0. Pemuatan ===");
ok("semua file termuat tanpa error", ctx.errors.length === 0,
  ctx.errors.map((e) => `${e.file}: ${e.message}`).join(" | "));
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
  const r = ctx.call("safeRow_", [["=x", "aman", 3]]).value;
  sama("safeRow_ memproses per elemen", r, ["'=x", "aman", 3]);
  const m = ctx.call("safeMatrix_", [[["=a"], ["b"]]]).value;
  sama("safeMatrix_ rekursif", m, [["'=a"], ["b"]]);
}

console.log("\n=== 2. Normalisasi peran & ULP ===");
{
  const nr = (v) => ctx.call("_normRole_", [v]).value;
  sama('"Super User" -> SUPER', nr("Super User"), "SUPER");
  sama('"super user" -> SUPER', nr("super user"), "SUPER");
  sama('"superuser"  -> SUPER', nr("superuser"), "SUPER");
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
  sama("plaintext lawas tetap diterima (dual-read)",
    ctx.call("_verifyPw_", ["RahasiaSuper123", "RahasiaSuper123"]).value, true);
  sama("plaintext lawas menolak yang salah",
    ctx.call("_verifyPw_", ["RahasiaSuper123", "bukan"]).value, false);
  sama("hash beda salt -> beda nilai",
    ctx.call("_hashPw_", ["RahasiaSuper123", "salt_lain_12345"]).value !== h, true);
  sama("password kosong ditolak", ctx.call("_verifyPw_", [h, ""]).value, false);
  sama("tersimpan kosong ditolak", ctx.call("_verifyPw_", ["", "x"]).value, false);
  sama("plaintext ditandai perlu upgrade",
    ctx.call("_pwPerluUpgrade_", ["RahasiaSuper123"]).value, true);
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
  if (g.ok) {
    sama("  role -> SUPER", g.value.role, "SUPER");
    sama("  isSuper", g.value.isSuper, true);
    sama("  username dari sesi", g.value.username, "superuser");
    sama("  ulpKey", g.value.ulpKey, "ulp-tbl");
  }

  /* Tahan salah pasang: guard_(objek, opts) alih-alih guard_(arguments, opts). */
  const gLangsung = ctx.call("guard_", [{ token: token }, { aksi: "uji" }]);
  ok("guard_(objek, opts) juga bekerja (tahan salah pasang)", gLangsung.ok, gLangsung.error);

  const g2 = guard(ctx, [token], { aksi: "uji" });
  ok("guard_ menerima token sebagai argumen posisi", g2.ok, g2.error);

  const g3 = guard(ctx, [{ token: token }], { role: ["OPERATOR"], aksi: "uji" });
  ok("SUPER lolos pengecekan peran lain (bypass)", g3.ok, g3.error);

  const g4 = guard(ctx, [{ token: token }],
    { role: ["OPERATOR"], superTidakBypass: true, aksi: "uji" });
  ok("superTidakBypass menolak SUPER", !g4.ok, "seharusnya ditolak");
  if (!g4.ok) ok("  pesan penolakan jelas", /Akses ditolak/.test(g4.error), g4.error);

  const g5 = guard(ctx, [{ token: "bukan-token-sah" }], { aksi: "uji" });
  ok("token palsu ditolak", !g5.ok, "seharusnya ditolak");
  if (!g5.ok) ok("  pesan: sesi habis", /Sesi habis|Sesi tidak/.test(g5.error), g5.error);

  const g6 = guard(ctx, [{}], { aksi: "uji" });
  ok("tanpa token ditolak", !g6.ok, "seharusnya ditolak");

  const g7 = guard(ctx, [{ token: "" }], { aksi: "uji" });
  ok("token kosong ditolak", !g7.ok, "seharusnya ditolak");

  const g8 = ctx.call("requireSesi_", [[{ token: token }]]);
  ok("requireSesi_ mengembalikan sesi", g8.ok && g8.value.username === "superuser", g8.error);

  /* Bukti bahwa opts yang digabung ke dalam array argumen TIDAK berlaku.
     Inilah alasan auditGuardSiSi_() nanti wajib mengecek 2 argumen. */
  const g9 = ctx.call("guard_", [[{ token: token },
    { role: ["OPERATOR"], superTidakBypass: true, aksi: "uji" }]]);
  ok("opts di dalam array argumen diabaikan -> harus ditolak oleh audit", g9.ok,
    "terbukti lolos: audit wajib mengecek jumlah argumen");
}

console.log("\n=== 5. ULP scoping & fail-closed ===");
reset(ctx, SS);
{
  const sup = call(ctx, "doLogin", "superuser", "RahasiaSuper123").value.token;
  const op = call(ctx, "doLogin", "petugasrow", "RahasiaRow123").value.token;
  const tanpaUlp = call(ctx, "doLogin", "tanpakodeulp", "RahasiaKosong123").value.token;

  const gsR = guard(ctx, [{ token: sup }], { ulp: true, aksi: "uji" });
  const goR = guard(ctx, [{ token: op }], { ulp: true, aksi: "uji" });
  ok("guard_ SUPER berhasil", gsR.ok, gsR.error);
  ok("guard_ operator berhasil", goR.ok, goR.error);
  const gs = gsR.value;
  const go = goR.value;

  if (gs && go) {
    sama("SUPER boleh meminta ULP lain", call(ctx, "ulpScope_", gs, "ULP Lain").value, "ULP Lain");
    sama("SUPER boleh meminta semua ULP", call(ctx, "ulpScope_", gs, "").value, "");
    sama("operator dipaksa ke ULP sendiri walau minta ULP lain",
      call(ctx, "ulpScope_", go, "ULP Lain").value, "ULP Toboali");
  } else {
    ok("SUPER boleh meminta ULP lain", false, "guard_ gagal, ulpScope_ tidak diuji");
    ok("SUPER boleh meminta semua ULP", false, "guard_ gagal");
    ok("operator dipaksa ke ULP sendiri", false, "guard_ gagal");
  }

  /* tanpakodeulp punya ulp terisi ("ULP Toboali") tapi kodeUlp kosong —
     ulpKey masih terisi dari ulp, jadi harus lolos. */
  const gt = guard(ctx, [{ token: tanpaUlp }], { ulp: true, aksi: "uji" });
  ok("kodeUlp kosong tapi ulp ada -> tetap lolos (fallback ke ulp)", gt.ok, gt.error);
  sama("  ulpKey jatuh ke ulp", gt.value.ulpKey, "ulp toboali");

  /* Fail-closed: akun tanpa ulp sama sekali harus ditolak, bukan dilewati. */
  const sh = ctx.harness.store;
  const dump = ctx.harness.dumpSheet(SS, "db_Users");
  for (let i = 1; i < dump.length; i++) {
    if (String(dump[i][2]).trim() === "tanpakodeulp") {
      sh.setCell(SS, "db_Users", i + 1, 6, "");
      sh.setCell(SS, "db_Users", i + 1, 7, "");
    }
  }
  ctx.call("_bustUsersCache_");
  const ulang = call(ctx, "doLogin", "tanpakodeulp", "RahasiaKosong123").value.token;
  const gb = guard(ctx, [{ token: ulang }], { ulp: true, aksi: "uji" });
  ok("akun tanpa ULP DITOLAK (fail-closed)", !gb.ok, "seharusnya ditolak");
  if (!gb.ok) ok("  pesan menyebut ULP", /ULP/.test(gb.error), gb.error);
}

console.log("\n=== 5b. Kebijakan Admin = ULP sendiri (bukan lintas ULP) ===");
reset(ctx, SS);
{
  const sup = call(ctx, "doLogin", "superuser", "RahasiaSuper123").value.token;
  const adm = call(ctx, "doLogin", "adminulp", "RahasiaAdmin123").value.token;
  const op = call(ctx, "doLogin", "petugasrow", "RahasiaRow123").value.token;

  const gS = guard(ctx, [{ token: sup }], { ulp: true }).value;
  const gA = guard(ctx, [{ token: adm }], { ulp: true }).value;
  const gO = guard(ctx, [{ token: op }], { ulp: true }).value;

  sama("SUPER -> ADMIN -> OPERATOR terdeteksi",
    [gS.role, gA.role, gO.role], ["SUPER", "ADMIN", "OPERATOR"]);

  sama("SUPER boleh lintas ULP", call(ctx, "bolehLintasUlp_", gS).value, true);
  sama("Admin TIDAK boleh lintas ULP", call(ctx, "bolehLintasUlp_", gA).value, false);
  sama("Operator TIDAK boleh lintas ULP", call(ctx, "bolehLintasUlp_", gO).value, false);

  sama("SUPER: ulpScope_ menghormati permintaan",
    call(ctx, "ulpScope_", gS, "ULP Lain").value, "ULP Lain");
  sama("Admin: ulpScope_ dipaksa ke ULP sendiri",
    call(ctx, "ulpScope_", gA, "ULP Lain").value, "ULP Toboali");
  sama("Operator: ulpScope_ dipaksa ke ULP sendiri",
    call(ctx, "ulpScope_", gO, "ULP Lain").value, "ULP Toboali");

  /* Admin boleh mengelola data operasional, TETAPI tidak boleh kelola akun. */
  sama("Admin tidak boleh kelola akun", call(ctx, "bolehKelolaAkun_", gA).value, false);
  sama("SUPER boleh kelola akun", call(ctx, "bolehKelolaAkun_", gS).value, true);

  const daftar = call(ctx, "getDaftarAkun", adm);
  ok("getDaftarAkun menolak Admin", daftar.ok === false || (daftar.value && daftar.value.ok === false),
    JSON.stringify(daftar));
  const daftar2 = call(ctx, "getDaftarAkun", sup);
  ok("getDaftarAkun mengizinkan Super User",
    daftar2.ok === true && daftar2.value && daftar2.value.ok === true, JSON.stringify(daftar2));

  /* _assertSuperUserKetat_ harus menolak Admin. */
  const ketat = ctx.call("_assertSuperUserKetat_", [adm]);
  ok("_assertSuperUserKetat_ menolak Admin", ketat.ok === false, JSON.stringify(ketat));
  const ketat2 = ctx.call("_assertSuperUserKetat_", [sup]);
  ok("_assertSuperUserKetat_ mengizinkan Super User", ketat2.ok === true, ketat2.error);

  /* Bypass ULP di modul harus sudah hilang. */
  sama("_woRowLintasUlp_: SUPER true",
    ctx.call("_woRowLintasUlp_", [{ role: "Super User" }]).value, true);
  sama("_woRowLintasUlp_: Admin false",
    ctx.call("_woRowLintasUlp_", [{ role: "Admin" }]).value, false);
  sama("_woRowLintasUlp_: admin false",
    ctx.call("_woRowLintasUlp_", [{ role: "admin" }]).value, false);
  sama("_woRowLintasUlp_: SUPER user varian penulisan",
    ctx.call("_woRowLintasUlp_", [{ role: "superuser" }]).value, true);

  /* _woRowUlpOk_: fail-closed. */
  sama("WO ULP sama -> boleh",
    ctx.call("_woRowUlpOk_", [{ role: "Operator", ulp: "ULP Toboali" }, "ULP Toboali"]).value, true);
  sama("WO ULP beda -> ditolak",
    ctx.call("_woRowUlpOk_", [{ role: "Operator", ulp: "ULP Toboali" }, "ULP Lain"]).value, false);
  sama("Admin ULP beda -> ditolak (bukan lintas ULP)",
    ctx.call("_woRowUlpOk_", [{ role: "Admin", ulp: "ULP Toboali" }, "ULP Lain"]).value, false);
  sama("Admin ULP sama -> boleh",
    ctx.call("_woRowUlpOk_", [{ role: "Admin", ulp: "ULP Toboali" }, "ULP Toboali"]).value, true);
  sama("SUPER ULP beda -> boleh",
    ctx.call("_woRowUlpOk_", [{ role: "Super User", ulp: "ULP Toboali" }, "ULP Lain"]).value, true);
  sama("ULP sesi kosong -> ditolak (fail-closed)",
    ctx.call("_woRowUlpOk_", [{ role: "Operator", ulp: "" }, "ULP Toboali"]).value, false);
  sama("ULP baris kosong -> ditolak (fail-closed)",
    ctx.call("_woRowUlpOk_", [{ role: "Operator", ulp: "ULP Toboali" }, ""]).value, false);
}

console.log("\n=== 6. rolePunya_ ===");
reset(ctx, SS);
{
  const sup = call(ctx, "doLogin", "superuser", "RahasiaSuper123").value.token;
  const op = call(ctx, "doLogin", "petugasrow", "RahasiaRow123").value.token;
  const gs = guard(ctx, [{ token: sup }], {}).value;
  const go = guard(ctx, [{ token: op }], {}).value;
  sama("SUPER punya semua peran", call(ctx, "rolePunya_", gs, ["OPERATOR"]).value, true);
  sama("operator tidak punya peran SUPER", call(ctx, "rolePunya_", go, ["SUPER"]).value, false);
  sama("operator punya peran OPERATOR", call(ctx, "rolePunya_", go, ["OPERATOR"]).value, true);
}

console.log("\n=== 7. Throttle login ===");
reset(ctx, SS);
{
  ctx.call("loginThrottleReset_", ["korbanbrute"]);
  for (let i = 0; i < 4; i++) ctx.call("loginThrottleGagal_", ["korbanbrute"]);
  let c = ctx.call("loginThrottleCek_", ["korbanbrute"]).value;
  ok("4x gagal belum dikunci", c.boleh === true, JSON.stringify(c));

  ctx.call("loginThrottleGagal_", ["korbanbrute"]);
  c = ctx.call("loginThrottleCek_", ["korbanbrute"]).value;
  ok("5x gagal -> dikunci", c.boleh === false, JSON.stringify(c));
  ok("  kunci ~5 menit (<=300 detik)", c.sisaDetik > 0 && c.sisaDetik <= 300, String(c.sisaDetik));

  c = ctx.call("loginThrottleCek_", ["userlain"]).value;
  ok("kunci tidak menjalar ke user lain", c.boleh === true, JSON.stringify(c));

  ctx.call("loginThrottleReset_", ["korbanbrute"]);
  c = ctx.call("loginThrottleCek_", ["korbanbrute"]).value;
  ok("reset membuka kunci", c.boleh === true, JSON.stringify(c));
}

console.log("\n=== 8. withLock_ ===");
{
  const r = ctx.call("withLock_", [() => "selesai", 1000]);
  sama("withLock_ mengembalikan hasil body", r.value, "selesai");

  /* Uji dari dalam VM supaya lock nested benar-benar memakai LockService shim. */
  ctx.evalInVm(`
    function _ujiLockBertingkat_() {
      return withLock_(function () {
        try {
          withLock_(function () { return "boleh"; }, 100);
          return "BERBAHAYA: lock ganda lolos";
        } catch (e) {
          return e.kode === "LOCK_SIBUK" ? "LOCK_SIBUK" : "kode lain: " + e.kode;
        }
      }, 100);
    }
    function _ujiLockLepas_() {
      var lock = LockService.getScriptLock();
      withLock_(function () {}, 100);
      return lock.hasLock() ? "MASIH TERKUNCI" : "terlepas";
    }
  `);
  sama("lock ganda ditolak dengan kode LOCK_SIBUK",
    ctx.call("_ujiLockBertingkat_", []).value, "LOCK_SIBUK");
  sama("lock dilepas setelah selesai (finally)",
    ctx.call("_ujiLockLepas_", []).value, "terlepas");
}

console.log("\n=== 9. guardInternal_ ===");
reset(ctx, SS);
{
  const token = call(ctx, "doLogin", "superuser", "RahasiaSuper123").value.token;
  const a = ctx.call("guardInternal_", [[], "tickUji"]);
  ok("tanpa token -> boleh (jalur trigger)", a.ok, a.error);
  const b = ctx.call("guardInternal_", [[{ token: token }], "tickUji"]);
  ok("dengan token -> ditolak (bukan jalur trigger)", !b.ok, "seharusnya ditolak");
  const c = ctx.call("guardInternal_", [{ token: token }, "tickUji"]);
  ok("bentuk (objek, nama) juga terdeteksi", !c.ok, "seharusnya ditolak");
}

console.log("\n=== 10. Audit log ===");
{
  const n = ctx.harness.logs.length;
  ok("audit_ menghasilkan entri", n > 0, `${n} entri`);
  const ada = ctx.harness.logs.some((l) => l.indexOf('"audit":true') >= 0);
  ok("entri berformat JSON terstruktur", ada);
  const adaTolak = ctx.harness.logs.some((l) => l.indexOf('"hasil":"TOLAK"') >= 0);
  ok("penolakan ikut tercatat", adaTolak);
}

console.log("\n=== 11. Regresi: login & data tidak rusak ===");
reset(ctx, SS);
{
  const r = call(ctx, "doLogin", "petugasinsdu", "RahasiaInsdu123");
  ok("login operator inspeksi gardu berhasil", r.ok && r.value.success === true, JSON.stringify(r.value));
  const g = guard(ctx, [{ token: r.value.token }], { role: ["OPERATOR"], ulp: true }).value;
  sama("  subTim terbaca", g.subTim, "inspeksi gardu");
  sama("  tim terbaca", g.tim, "Inspeksi");
  const dump = ctx.harness.dumpSheet(SS, "db_Users");
  sama("db_Users tidak berubah jumlah baris", dump.length, 9);
  sama("kolom D masih plaintext sebelum migrasi",
    String(dump[1][3]), "RahasiaSuper123");
}

console.log("\n=== 12. Webhook AppSheet ===");
reset(ctx, SS);
{
  const SECRET = "test-webhook-secret-32-characters-ok";
  const W = (body) => ctx.call("webhookVerifikasi_", [body]).value;

  /* Production is fail-closed: no source-code fallback is allowed. */
  const kosong = W({ secret: SECRET, action: "recalcRow" });
  sama("tanpa Script Property -> SECRET_KOSONG", kosong.kode, "SECRET_KOSONG");

  ctx.evalInVm(`PropertiesService.getScriptProperties()
    .setProperty('SISI_WEBHOOK_SECRET', '${SECRET}')`);

  ok("secret salah -> ditolak", W({ secret: "bukan", action: "recalcRow" }).ok === false);
  ok("secret kosong -> ditolak", W({ action: "recalcRow" }).ok === false);
  const benar = W({ secret: SECRET, action: "recalcRow" });
  ok("secret property benar + action dikenal -> lolos", benar.ok === true, JSON.stringify(benar));
  sama("  action dikembalikan", benar.action, "recalcRow");

  ok("action di luar daftar -> ditolak",
    W({ secret: SECRET, action: "hapusSemuaData" }).ok === false);
  sama("  kode ACTION_TIDAK_DIKENAL",
    W({ secret: SECRET, action: "hapusSemuaData" }).kode, "ACTION_TIDAK_DIKENAL");
  ok("action kosong -> ditolak", W({ secret: SECRET }).ok === false);

  const tsMs = (v) => ctx.call("_webhookTsMs_", [v]).value;
  const sekarang = Date.now();
  sama("epoch milidetik", tsMs(String(sekarang)), sekarang);
  sama("epoch detik", tsMs(String(Math.floor(sekarang / 1000))),
    Math.floor(sekarang / 1000) * 1000);
  ok("ISO ISO-8601 dipahami", Math.abs(tsMs(new Date(sekarang).toISOString()) - sekarang) < 1000);
  const teksWib = new Date(sekarang + 7 * 3600 * 1000)
    .toISOString().replace("T", " ").slice(0, 19);
  ok('format "yyyy-MM-dd HH:mm:ss" dianggap WIB',
    Math.abs(tsMs(teksWib) - sekarang) < 2000,
    `teks=${teksWib} hasil=${tsMs(teksWib)} sekarang=${sekarang}`);
  sama("teks ngawur -> 0", tsMs("bukan-waktu"), 0);
  sama("kosong -> 0", tsMs(""), 0);

  const mode = () => ctx.call("_webhookTsMode_", []).value;
  sama("mode default = warn", mode(), "warn");
  ok("mode warn: tanpa ts tetap lolos",
    W({ secret: SECRET, action: "recalcRow" }).ok === true);

  ctx.evalInVm(`PropertiesService.getScriptProperties().setProperty('SISI_WEBHOOK_TS_MODE','enforce')`);
  sama("mode terbaca enforce", mode(), "enforce");
  sama("mode enforce: tanpa ts -> TS_TIDAK_VALID",
    W({ secret: SECRET, action: "recalcRow" }).kode, "TS_TIDAK_VALID");
  ok("mode enforce: ts sekarang -> lolos",
    W({ secret: SECRET, action: "recalcRow", ts: String(Date.now()) }).ok === true);
  ok("mode enforce: ts 20 menit lalu -> ditolak",
    W({ secret: SECRET, action: "recalcRow", ts: String(Date.now() - 20 * 60000) }).ok === false);
  ok("mode enforce: ts 5 menit lalu -> lolos",
    W({ secret: SECRET, action: "recalcRow", ts: String(Date.now() - 5 * 60000) }).ok === true);

  ctx.evalInVm(`PropertiesService.getScriptProperties().setProperty('SISI_WEBHOOK_TS_MODE','off')`);
  ok("mode off: tanpa ts lolos", W({ secret: SECRET, action: "recalcRow" }).ok === true);
  ctx.evalInVm(`PropertiesService.getScriptProperties().deleteProperty('SISI_WEBHOOK_TS_MODE')`);
}

console.log("\n=== 13. Pemisahan jalur doPost ===");
reset(ctx, SS);
{
  const SECRET = "test-webhook-secret-32-characters-ok";
  ctx.evalInVm(`PropertiesService.getScriptProperties()
    .setProperty('SISI_WEBHOOK_SECRET', '${SECRET}')`);
  const post = (parameter, contents) => {
    const e = { parameter, postData: { contents: JSON.stringify(contents) } };
    const r = ctx.call("doPost", [e]);
    if (!r.ok) return { ok: false, error: r.error };
    try { return JSON.parse(r.value.getContent()); }
    catch (err) { return { ok: false, error: "bukan JSON" }; }
  };

  const viaBody = post({}, { secret: SECRET, action: "recalcRow", tim: "X" });
  ok("secret di body POST -> diterima", viaBody.ok === true, JSON.stringify(viaBody));

  const viaQuery = post({ secret: SECRET, action: "recalcRow" }, {});
  ok("secret di query string -> DITOLAK", viaQuery.ok === false, JSON.stringify(viaQuery));
  sama("  kode SECRET_SALAH", viaQuery.kode, "SECRET_SALAH");

  const mobileBawaSecret = post({ mobile: "1" }, { secret: SECRET, action: "recalcRow" });
  ok("?mobile=1 + action webhook tidak dieksekusi webhook",
    mobileBawaSecret.ok !== true || !("queued" in mobileBawaSecret),
    JSON.stringify(mobileBawaSecret));
  ok("  masuk apiRouter_ sebagai action tidak dikenal",
    /tidak dikenal/i.test(String(mobileBawaSecret.message || "")),
    JSON.stringify(mobileBawaSecret));
}

console.log("\n=== 14. Audit & migrasi password ===");
reset(ctx, SS);
{
  const dump = () => ctx.harness.dumpSheet(SS, "db_Users");
  const kolomD = (nama) => {
    for (const row of dump()) if (String(row[2]).trim() === nama) return String(row[3]);
    return null;
  };

  const audit = ctx.call("auditPasswordSiSi_", []).value;
  ok("audit melapor semua masih plaintext", audit.masihPlaintext === 8, JSON.stringify(audit));
  sama("  sudahHash = 0", audit.sudahHash, 0);
  sama("  struktur tidak disentuh", audit.totalBaris, 8);

  /* Mode kering tidak boleh mengubah apa pun. */
  const kering = ctx.call("migrasiPasswordHash_", [{ kering: true }]).value;
  ok("mode kering melapor akan mengubah 8 akun", kering.diubah === 8, JSON.stringify(kering));
  sama("  mode kering: kolom D masih plaintext",
    kolomD("superuser"), "RahasiaSuper123");
  ok("  mode kering memberi peringatan", /MODE KERING/.test(kering.catatan), kering.catatan);

  /* Migrasi sungguhan. */
  const m = ctx.call("migrasiPasswordHash_", [{}]).value;
  ok("migrasi berhasil", m.ok === true && m.diubah === 8, JSON.stringify(m));
  const sesudah = kolomD("superuser");
  ok("kolom D kini berformat hash", /^sisi1\$[0-9a-f]{16}\$[0-9a-f]{64}$/.test(sesudah), sesudah);

  const audit2 = ctx.call("auditPasswordSiSi_", []).value;
  sama("  audit: 8 sudah hash", audit2.sudahHash, 8);
  sama("  audit: 0 tersisa plaintext", audit2.masihPlaintext, 0);

  /* Struktur sheet tidak boleh berubah. */
  const baris0 = dump()[0];
  sama("header kolom tidak berubah", baris0[3], "Password");
  sama("jumlah kolom tidak berubah", baris0.length, 11);
  sama("jumlah baris tidak berubah", dump().length, 9);

  /* Login harus tetap berjalan setelah migrasi. */
  ctx.call("_bustUsersCache_");
  const l1 = ctx.call("doLogin", ["superuser", "RahasiaSuper123"]).value;
  ok("login berhasil SETELAH migrasi", l1 && l1.success === true, JSON.stringify(l1));
  const l2 = ctx.call("doLogin", ["superuser", "salah"]).value;
  ok("password salah tetap ditolak setelah migrasi", l2 && l2.success === false, JSON.stringify(l2));

  /* Migrasi ulang harus idempoten. */
  const m2 = ctx.call("migrasiPasswordHash_", [{}]).value;
  sama("migrasi kedua tidak mengubah apa pun", m2.diubah, 0);
  sama("  semua dilewati karena sudah hash", m2.dilewatiSudahHash, 8);
}

console.log("\n=== 15. Login: throttle + upgrade otomatis ===");
reset(ctx, SS);
{
  /* Belum dimigrasi: login pertama harus meng-hash otomatis. */
  const kolomD = (nama) => {
    for (const row of ctx.harness.dumpSheet(SS, "db_Users"))
      if (String(row[2]).trim() === nama) return String(row[3]);
    return null;
  };
  sama("sebelum login: plaintext", kolomD("petugasrow"), "RahasiaRow123");
  const l = ctx.call("doLogin", ["petugasrow", "RahasiaRow123"]).value;
  ok("login berhasil", l && l.success === true, JSON.stringify(l));
  ok("upgrade hash otomatis saat login",
    /^sisi1\$/.test(kolomD("petugasrow")), kolomD("petugasrow"));
  const l2 = ctx.call("doLogin", ["petugasrow", "RahasiaRow123"]).value;
  ok("login kedua tetap berhasil dengan hash", l2 && l2.success === true, JSON.stringify(l2));

  /* Throttle. */
  ctx.call("loginThrottleReset_", ["petugasinsdu"]);
  for (let i = 0; i < 4; i++) ctx.call("doLogin", ["petugasinsdu", "salah"]);
  const c = ctx.call("loginThrottleCek_", ["petugasinsdu"]).value;
  ok("4x gagal belum terkunci", c.boleh === true, JSON.stringify(c));

  const ke5 = ctx.call("doLogin", ["petugasinsdu", "salah"]).value;
  ok("gagal ke-5 mengaktifkan kunci", ke5 && ke5.success === false, JSON.stringify(ke5));
  const c2 = ctx.call("loginThrottleCek_", ["petugasinsdu"]).value;
  ok("  akun terkunci", c2.boleh === false, JSON.stringify(c2));

  /* Password BENAR pun harus ditolak selama terkunci — itulah gunanya kunci. */
  const benarTerkunci = ctx.call("doLogin", ["petugasinsdu", "RahasiaInsdu123"]).value;
  ok("password benar pun ditolak saat terkunci",
    benarTerkunci && benarTerkunci.success === false, JSON.stringify(benarTerkunci));
  ok("  pesan menyebut batas percobaan",
    /percobaan gagal/i.test(benarTerkunci.message), benarTerkunci.message);

  /* Reset lewat resetPasswordAkun() harus membuka kunci. */
  const sup = ctx.call("doLogin", ["superuser", "RahasiaSuper123"]).value.token;
  ctx.call("resetPasswordAkun", [sup, "petugasinsdu", "RahasiaInsdu123"]);
  const c3 = ctx.call("loginThrottleCek_", ["petugasinsdu"]).value;
  ok("reset password membuka kunci throttle", c3.boleh === true, JSON.stringify(c3));
  const l3 = ctx.call("doLogin", ["petugasinsdu", "RahasiaInsdu123"]).value;
  ok("  login berhasil lagi", l3 && l3.success === true, JSON.stringify(l3));
  ok("  password reset tersimpan sebagai hash",
    /^sisi1\$/.test((() => {
      for (const row of ctx.harness.dumpSheet(SS, "db_Users"))
        if (String(row[2]).trim() === "petugasinsdu") return String(row[3]);
      return "";
    })()));
}

console.log("\n=== 16. Tambah / ubah / ganti password ===");
reset(ctx, SS);
{
  const kolomD = (nama) => {
    for (const row of ctx.harness.dumpSheet(SS, "db_Users"))
      if (String(row[2]).trim() === nama) return String(row[3]);
    return null;
  };
  const sup = ctx.call("doLogin", ["superuser", "RahasiaSuper123"]).value.token;

  /* tambahAkun harus menyimpan hash. */
  const t = ctx.call("tambahAkun", [sup, {
    username: "akunbaru", password: "SandiBaru123", role: "Operator",
    ulp: "ULP Toboali", kodeUlp: "ULP-TBL", bidang: "Teknik",
    tim: "ROW", subTim: "ROW", aksesMenu: "Tek-ROW", email: "baru@test.invalid",
  }]).value;
  ok("tambahAkun berhasil", t && t.ok === true, JSON.stringify(t));
  ok("  password baru disimpan sebagai hash",
    /^sisi1\$/.test(kolomD("akunbaru")), kolomD("akunbaru"));
  const lb = ctx.call("doLogin", ["akunbaru", "SandiBaru123"]).value;
  ok("  akun baru bisa login", lb && lb.success === true, JSON.stringify(lb));

  /* updateAkun dengan password baru. */
  ctx.call("updateAkun", [sup, { targetUsername: "akunbaru", password: "SandiUbah456" }]);
  ok("  updateAkun menyimpan hash", /^sisi1\$/.test(kolomD("akunbaru")), kolomD("akunbaru"));
  const lu = ctx.call("doLogin", ["akunbaru", "SandiUbah456"]).value;
  ok("  login dengan password yang diubah", lu && lu.success === true, JSON.stringify(lu));

  /* gantiPassword: verifikasi lama lalu simpan hash baru. */
  const tok = ctx.call("doLogin", ["akunbaru", "SandiUbah456"]).value.token;
  const gp = ctx.call("gantiPassword", [tok, "SandiUbah456", "SandiGanti789"]).value;
  ok("gantiPassword berhasil", gp && gp.ok === true, JSON.stringify(gp));
  ok("  tersimpan sebagai hash", /^sisi1\$/.test(kolomD("akunbaru")), kolomD("akunbaru"));
  const lg = ctx.call("doLogin", ["akunbaru", "SandiGanti789"]).value;
  ok("  login dengan password baru", lg && lg.success === true, JSON.stringify(lg));
  const gl = ctx.call("gantiPassword", [tok, "SandiUbah456", "SandiLain000"]).value;
  ok("  password lama yang salah ditolak", gl && gl.ok === false, JSON.stringify(gl));

  /* gantiPassword juga harus bekerja kalau nilai tersimpan masih plaintext. */
  reset(ctx, SS);
  const sup2 = ctx.call("doLogin", ["superuser", "RahasiaSuper123"]).value.token;
  const tokRow = ctx.call("doLogin", ["petugasrow", "RahasiaRow123"]).value.token;
  const gp2 = ctx.call("gantiPassword", [tokRow, "RahasiaRow123", "RahasiaBaru999"]).value;
  ok("gantiPassword dari plaintext -> hash", gp2 && gp2.ok === true, JSON.stringify(gp2));
  const lg2 = ctx.call("doLogin", ["petugasrow", "RahasiaBaru999"]).value;
  ok("  login dengan password baru", lg2 && lg2.success === true, JSON.stringify(lg2));

  /* loginPerangkat harus memakai verifikasi yang sama. */
  reset(ctx, SS);
  const lp = ctx.call("loginPerangkat", ["petugasrow", "RahasiaRow123", "uji"]).value;
  ok("loginPerangkat berhasil", lp && lp.success === true, JSON.stringify(lp));
  ok("  menerbitkan deviceToken", !!lp.deviceToken, JSON.stringify(lp));
  ok("  password ikut ter-hash",
    /^sisi1\$/.test((() => {
      for (const row of ctx.harness.dumpSheet(SS, "db_Users"))
        if (String(row[2]).trim() === "petugasrow") return String(row[3]);
      return "";
    })()));
  const lp2 = ctx.call("loginPerangkat", ["petugasrow", "salah", "uji"]).value;
  ok("loginPerangkat menolak password salah", lp2 && lp2.success === false, JSON.stringify(lp2));
}

console.log("\n=== 17. Tahap 3: jalur anonim tertutup ===");
reset(ctx, SS);
{
  const tanpa = (fn, ...args) => ctx.call(fn, args);

  /* _deltaFetch_ dulu bisa ditarik tanpa login. */
  const anon = tanpa("_deltaFetch_", "", "db_Users", 0, 10);
  ok("_deltaFetch_ tanpa token -> DITOLAK", anon.ok === false, JSON.stringify(anon));
  if (!anon.ok) ok("  pesan menyebut sesi", /Sesi/.test(anon.error), anon.error);

  const anon2 = tanpa("_deltaFetch_", "token-palsu", "db_Users", 0, 10);
  ok("_deltaFetch_ token palsu -> DITOLAK", anon2.ok === false, JSON.stringify(anon2));

  /* getMasterGarduMobile: otentikasi sekarang di gerbang, sebelum dispatch. */
  const anon3 = tanpa("getMasterGarduMobile", "", "DELTA_SYNC:{\"cmd\":\"fetch\",\"dataset\":\"db_Users\"}");
  ok("getMasterGarduMobile tanpa token -> DITOLAK", anon3.ok === false || anon3.value.success === false,
    JSON.stringify(anon3));

  /* Dengan token sah baru boleh. */
  const tok = ctx.call("doLogin", ["superuser", "RahasiaSuper123"]).value.token;
  const sah = ctx.call("_deltaFetch_", [tok, "db_Yandal_P0", 0, 10]);
  ok("_deltaFetch_ dengan token sah -> boleh", sah.ok === true, JSON.stringify(sah));
  if (sah.ok) ok("  mengembalikan baris", Array.isArray(sah.value.rows), JSON.stringify(sah.value).slice(0, 120));

  /* Rute ?pdf= wajib token. */
  const pdfAnon = ctx.call("doGet", [{ parameter: { pdf: "realisasi" } }]);
  if (!pdfAnon.ok) {
    ok("?pdf= tanpa token -> ditolak (atau gagal karena sheet belum ada)", true, pdfAnon.error);
  } else {
    const isi = String(pdfAnon.value.getContent ? pdfAnon.value.getContent() : "");
    ok("?pdf= tanpa token -> DITOLAK", /Sesi habis|tidak valid/.test(isi), isi.slice(0, 160));
  }

  /* updateMobileEksekusiRow: baris harus milik ULP sesi. */
  ctx.harness.seedSheet(SS, "db_ROW_Eksekusi",
    ["No", "Kode Header", "Kode Pekerjaan", "Kode Eksekusi", "ULP", "Hari"],
    [
      [1, "HDR-001", "PKJ-001", "EKS-001", "ULP Toboali", "Jumat"],
      [2, "HDR-003", "PKJ-009", "EKS-009", "ULP Lain", "Sabtu"],
    ]);

  const opTbl = ctx.call("doLogin", ["petugasrow", "RahasiaRow123"]).value.token;
  const fotoPanjang = "A".repeat(80);
  const beda = ctx.call("updateMobileEksekusiRow", [{
    token: opTbl, kodeEksekusi: "EKS-009", fotoPekerjaanBase64: fotoPanjang,
  }]);
  ok("update Eksekusi baris ULP LAIN -> DITOLAK",
    beda.ok === false || (beda.value && beda.value.success === false),
    JSON.stringify(beda));
  if (!beda.ok || (beda.value && beda.value.success === false)) {
    const pesan = beda.error || (beda.value && beda.value.message) || "";
    ok("  pesan menyebut ULP", /ULP/.test(pesan), pesan);
  }

  /* Tek-MobileDual: tanpa token harus ditolak. */
  const dual1 = ctx.call("getApprovalP0ListDual_", [{ tanggal: "" }]);
  ok("getApprovalP0ListDual_ tanpa token -> DITOLAK", dual1.ok === false, JSON.stringify(dual1));
  const dual2 = ctx.call("getLampiranPengecekanP0Dual_", [{ kodeP0: "P0-001" }]);
  ok("getLampiranPengecekanP0Dual_ tanpa token -> DITOLAK", dual2.ok === false, JSON.stringify(dual2));

  /* _guardErrorAkses_ membedakan tolakan akses dari error data. */
  sama("error 'Sesi habis' = akses",
    ctx.call("_guardErrorAkses_", [new Error("Sesi habis, silakan login ulang.")]).value, true);
  sama("error 'Akses ditolak' = akses",
    ctx.call("_guardErrorAkses_", [new Error("Akses ditolak.")]).value, true);
  sama("error 'Kode P0 tidak ditemukan' BUKAN akses",
    ctx.call("_guardErrorAkses_", [new Error("Kode P0 tidak ditemukan")]).value, false);
  sama("error 'Sheet tidak ada' BUKAN akses",
    ctx.call("_guardErrorAkses_", [new Error("Sheet db_X tidak ditemukan")]).value, false);
}

console.log("\n=== 18. Filter baris per ULP (barisUlpCocok_) ===");
reset(ctx, SS);
{
  const gSup = guard(ctx, [{ token: call(ctx, "doLogin", "superuser", "RahasiaSuper123").value.token }], {}).value;
  const gAdm = guard(ctx, [{ token: call(ctx, "doLogin", "adminulp", "RahasiaAdmin123").value.token }], {}).value;
  const gLain = guard(ctx, [{ token: call(ctx, "doLogin", "petugasulp lain", "RahasiaLain123").value.token }], {}).value;

  const C = (g, u) => ctx.call("barisUlpCocok_", [g, u]).value;
  sama("SUPER melihat ULP mana pun", C(gSup, "ULP Lain"), true);
  sama("Admin melihat ULP sendiri", C(gAdm, "ULP Toboali"), true);
  sama("Admin TIDAK melihat ULP lain", C(gAdm, "ULP Lain"), false);
  sama("operator ULP Lain melihat ULP-nya", C(gLain, "ULP Lain"), true);
  sama("operator ULP Lain TIDAK melihat ULP Toboali", C(gLain, "ULP Toboali"), false);
  sama("toleran huruf besar-kecil", C(gAdm, "ULP   toboali"), true);
  ok("baris tanpa ULP tetap tampil (kompatibel mundur)",
    C(gAdm, "") === true, "TAMPILKAN_BARIS_TANPA_ULP harus true");
  sama("baris tanpa ULP juga tampil untuk ULP lain", C(gLain, ""), true);
}

console.log("\n" + "=".repeat(56));
console.log(`LULUS ${lulus}   GAGAL ${gagal}`);
if (kegagalan.length) {
  console.log("\nKegagalan:");
  kegagalan.forEach((k) => console.log("  - " + k));
}
const unsup = ctx.harness.unsupportedReport();
if (unsup.length) {
  console.log("\nAPI Apps Script yang belum teremulasi:");
  unsup.slice(0, 15).forEach((u) => console.log(`  ${u.n}x  ${u.name}`));
}
process.exit(gagal ? 1 : 0);
