from pathlib import Path

# Fix WIB parsing: parse the explicit local format before generic Date.parse.
guard = Path('SiSi_BackEnd/Core/Guard.js')
g = guard.read_text()
old = '''  var t = Date.parse(s);
  if (!isNaN(t)) return t;

  var m = s.match(/^(\\d{4})-(\\d{2})-(\\d{2})[ T](\\d{2}):(\\d{2})(?::(\\d{2}))?$/);
  if (m) {
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 7, +m[5], +(m[6] || 0));
  }
  return 0;
'''
new = '''  var m = s.match(/^(\\d{4})-(\\d{2})-(\\d{2})[ T](\\d{2}):(\\d{2})(?::(\\d{2}))?$/);
  if (m) {
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 7, +m[5], +(m[6] || 0));
  }

  var t = Date.parse(s);
  if (!isNaN(t)) return t;
  return 0;
'''
if g.count(old) != 1:
    raise SystemExit(f'Guard timestamp marker count={g.count(old)}')
guard.write_text(g.replace(old, new, 1))

suite = Path('tests/suite.js')
s = suite.read_text()
start = s.index('console.log("\\n=== 12. Webhook AppSheet ===");')
end = s.index('console.log("\\n=== 14. Audit & migrasi password ===");', start)
replacement = r'''console.log("\n=== 12. Webhook AppSheet ===");
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

'''
suite.write_text(s[:start] + replacement + s[end:])
