/* ============================================================================
   Trigger-Manager.js — SATU SUMBER TRIGGER BACKEND SiSi
   Rev 24 Agu 2026; T-11 auth boundary 30 Sep 2026
   ---------------------------------------------------------------------------
   Installer mengelola 2 trigger permanen:
       1) _t11TickPusatSiSi_ : setiap 1 menit, private server scheduler.
       2) _t11HarianPusatSiSi_ : setiap hari sekitar 00:30 WIB.
   migrasiSemuaTick tetap boleh muncul SEMENTARA.

   T-11: trigger lama tickPusatSiSi/drainAntreanP0 TANPA sesi sekarang ditolak.
   Migrasikan handler ke _t11TickPusatSiSi_ di STAGING sebelum production.
   Jangan memasang trigger drain terpisah bila scheduler pusat sudah aktif.
   Public installer pasangSemuaTriggerSiSi({token: ...}) wajib Super User
   ULP Toboali. _pasangSemuaTriggerSiSi_ hanya untuk editor/server privat.
   Tidak ada trigger yang diubah hanya karena source ini dimuat.

   Installer melakukan preflight sebelum menghapus/membuat trigger. Setelah
   preflight, seluruh trigger milik operator pada project dihapus dan tepat
   2 permanen dibuat. Jalankan hanya setelah backup konfigurasi dan persetujuan
   migrasi; auditTriggerSiSi() harus menghasilkan ok=true.
   pingEngineY sengaja tidak dijadwalkan. Job sekali-jalan bukan permanen.
   ============================================================================ */

var TRIGGER_SISI_TZ = "Asia/Jakarta";
var TRIGGER_SISI_TICK_PROP = "TRIGGER_SISI_LAST_RUN_V2";
var TRIGGER_SISI_MUTEX_PROP = "TRIGGER_SISI_MUTEX_V2";

// Urutan = prioritas. Interval adalah batas minimum antar-run, bukan jam pasti.
// berat=true hanya dimulai bila sisa waktu eksekusi masih aman.
var TRIGGER_SISI_TUGAS = [
  { fn: "fastTick", tiapMenit: 1 },
  { fn: "drainLaporanDirty", tiapMenit: 1 },
  { fn: "drainFotoRow", tiapMenit: 1 },
  { fn: "normalisasiUrlFotoRowTick", tiapMenit: 1 },

  // WM diproses 5 menit: cukup cepat, tapi tidak merebut slot tiap menit.
  { fn: "drainAntreanP0", tiapMenit: 5, berat: true },
  // Same private T11 scheduler, after WM. No independent ROW timer.
  { fn: "_t11PerbaikanKodeROW_", tiapMenit: 1, berat: true },

  // Backstop. Jalur utama tetap webhook/antrean sehingga tidak perlu tiap menit.
  { fn: "sweepWmBacklogY", tiapMenit: 15, berat: true },
  { fn: "sweepPointP0Yandal", tiapMenit: 15, berat: true },
  { fn: "refreshLaporanHarianHariIni", tiapMenit: 15, berat: true },
  { fn: "refreshWaHarian", tiapMenit: 15, berat: true },

  { fn: "sweepDurasiJarakYandalP0", tiapMenit: 30, berat: true },

  // Sweep penuh/backstop: cukup satu jam sekali.
  { fn: "validasiUlangFotoTemuan", tiapMenit: 60, berat: true },
  { fn: "sweepEksekusiRowBacklog", tiapMenit: 60, berat: true },
  { fn: "refreshLaporanHarianROW", tiapMenit: 60, berat: true },
  { fn: "migrasiTemuanGarduHarian", tiapMenit: 60, berat: true },
];

var TRIGGER_SISI_HARIAN = [
  "ensureLaporanHarianHariIni",
  "sinkronRankYandal",
  "mulaiMigrasiSemua",
];

var TRIGGER_SISI_PERMANEN = ["_t11TickPusatSiSi_", "_t11HarianPusatSiSi_"];
var TRIGGER_SISI_SEMENTARA = [
  "migrasiSemuaTick",
  "jalankanRecalcPointBertahap",
];

function _triggerSisiGlobal_() {
  return typeof globalThis !== "undefined" ? globalThis : this;
}

function _triggerSisiHandler_(nama) {
  var g = _triggerSisiGlobal_();
  return g && typeof g[nama] === "function" ? g[nama] : null;
}

function _triggerSisiHandlerWajib_() {
  var out = TRIGGER_SISI_PERMANEN.slice();
  for (var i = 0; i < TRIGGER_SISI_TUGAS.length; i++)
    out.push(TRIGGER_SISI_TUGAS[i].fn);
  for (var j = 0; j < TRIGGER_SISI_HARIAN.length; j++)
    out.push(TRIGGER_SISI_HARIAN[j]);
  var seen = {},
    unik = [];
  for (var k = 0; k < out.length; k++) {
    if (!seen[out[k]]) {
      seen[out[k]] = true;
      unik.push(out[k]);
    }
  }
  return unik;
}

// Worker pusat per menit. Tidak memegang LockService agar lock internal tiap modul
// tetap independen. Mutex property mencegah tick bertumpuk; basi >6,5 menit diambil alih.
// Public function is authenticated by the final T-11 overlay; timers target its
// private _t11TickPusatSiSi_ entry, which captures this implementation.
function tickPusatSiSi() {
  var props = PropertiesService.getScriptProperties();
  var now = Date.now();
  var mutex = Number(props.getProperty(TRIGGER_SISI_MUTEX_PROP) || 0);
  if (mutex && now - mutex < 390000)
    return { ok: true, skipped: "masih-berjalan" };
  props.setProperty(TRIGGER_SISI_MUTEX_PROP, String(now));

  var hasil = { ok: true, jalan: [], gagal: [], belumJadwal: [] };
  try {
    var last = {};
    try {
      last = JSON.parse(props.getProperty(TRIGGER_SISI_TICK_PROP) || "{}");
    } catch (eJson) {
      last = {};
    }

    var mulai = Date.now();
    for (var i = 0; i < TRIGGER_SISI_TUGAS.length; i++) {
      var tugas = TRIGGER_SISI_TUGAS[i];
      var terakhir = Number(last[tugas.fn] || 0);
      var dueMs = tugas.tiapMenit * 60000;
      if (Date.now() - terakhir < dueMs - 5000) {
        hasil.belumJadwal.push(tugas.fn);
        continue;
      }

      var elapsed = Date.now() - mulai;
      // Tugas berat tidak dimulai setelah 2,5 menit; tugas ringan setelah 4 menit.
      // Yang tertunda tidak distempel, jadi otomatis dicoba tick berikutnya.
      if (
        (tugas.berat && elapsed > 150000) ||
        (!tugas.berat && elapsed > 240000)
      )
        break;

      var fn = _triggerSisiHandler_(tugas.fn);
      if (!fn) {
        hasil.gagal.push({ fn: tugas.fn, error: "handler tidak ditemukan" });
        continue;
      }
      try {
        var jobResult = fn.call(_triggerSisiGlobal_());
        if (jobResult && jobResult.ok === false)
          throw new Error("SISI_SCHEDULED_JOB_FAILED");
        last[tugas.fn] = Date.now();
        hasil.jalan.push(tugas.fn);
      } catch (eRun) {
        hasil.gagal.push({ fn: tugas.fn, error: String(eRun) });
        // Tidak distempel: dicoba lagi pada tick berikutnya.
      }
    }
    props.setProperty(TRIGGER_SISI_TICK_PROP, JSON.stringify(last));
    if (hasil.jalan.length || hasil.gagal.length)
      Logger.log("[tickPusatSiSi] " + JSON.stringify(hasil));
    return hasil;
  } finally {
    try {
      props.deleteProperty(TRIGGER_SISI_MUTEX_PROP);
    } catch (eDel) {}
  }
}

// Worker harian sekitar 00:30 WIB. Migrasi dijalankan terakhir karena ia membuat
// migrasiSemuaTick sementara yang akan melepas dirinya setelah semua sheet selesai.
function harianPusatSiSi() {
  var hasil = { ok: true, jalan: [], gagal: [] };
  for (var i = 0; i < TRIGGER_SISI_HARIAN.length; i++) {
    var nama = TRIGGER_SISI_HARIAN[i];
    var fn = _triggerSisiHandler_(nama);
    if (!fn) {
      hasil.gagal.push({ fn: nama, error: "handler tidak ditemukan" });
      continue;
    }
    try {
      fn.call(_triggerSisiGlobal_());
      hasil.jalan.push(nama);
    } catch (eRun) {
      hasil.gagal.push({ fn: nama, error: String(eRun) });
    }
  }
  Logger.log("[harianPusatSiSi] " + JSON.stringify(hasil));
  return hasil;
}

// Public installer requires an authenticated Super User. Never accept a client
// internal/trigger flag as permission to create an authorized scheduled job.
function pasangSemuaTriggerSiSi(params) {
  var g = guard_(arguments, { ulp: true, role: ["SUPER"], aksi: "pasangSemuaTriggerSiSi" });
  if (!ulpSama_(g.ulp, "ULP Toboali"))
    throw new Error("T11_CALLER_ULP_DENIED");
  return _pasangSemuaTriggerSiSi_();
}

// Editor/server-only installer. No runtime migration occurs unless called.
function _pasangSemuaTriggerSiSi_() {
  var wajib = _triggerSisiHandlerWajib_();
  var kurangHandler = [];
  for (var i = 0; i < wajib.length; i++)
    if (!_triggerSisiHandler_(wajib[i])) kurangHandler.push(wajib[i]);

  if (kurangHandler.length) {
    var gagal = {
      ok: false,
      diubah: false,
      message: "Preflight gagal. Trigger lama tidak disentuh.",
      handlerHilang: kurangHandler,
    };
    Logger.log("[pasangSemuaTriggerSiSi] " + JSON.stringify(gagal));
    return gagal;
  }

  var lama = ScriptApp.getProjectTriggers();
  var dihapus = [];
  for (var j = 0; j < lama.length; j++) {
    dihapus.push(lama[j].getHandlerFunction());
    ScriptApp.deleteTrigger(lama[j]);
  }

  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(TRIGGER_SISI_TICK_PROP);
  props.deleteProperty(TRIGGER_SISI_MUTEX_PROP);

  ScriptApp.newTrigger("_t11TickPusatSiSi_").timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger("_t11HarianPusatSiSi_")
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .nearMinute(30)
    .inTimezone(TRIGGER_SISI_TZ)
    .create();

  var audit = auditTriggerSiSi();
  audit.dihapus = dihapus;
  audit.message = audit.ok
    ? "Trigger SiSi bersih: tepat 2 permanen, tanpa duplikat/kelebihan."
    : "Pemasangan selesai tetapi audit belum bersih.";
  Logger.log("[pasangSemuaTriggerSiSi] " + JSON.stringify(audit));
  return audit;
}

// Read-only: cek jumlah, kekurangan, kelebihan, dan duplikat trigger.
function auditTriggerSiSi() {
  var trs = ScriptApp.getProjectTriggers();
  var perHandler = {},
    semua = [];
  for (var i = 0; i < trs.length; i++) {
    var fn = trs[i].getHandlerFunction();
    semua.push(fn);
    perHandler[fn] = (perHandler[fn] || 0) + 1;
  }

  var kurang = [],
    lebih = [],
    duplikat = [],
    sementara = [];
  for (var j = 0; j < TRIGGER_SISI_PERMANEN.length; j++)
    if (!perHandler[TRIGGER_SISI_PERMANEN[j]])
      kurang.push(TRIGGER_SISI_PERMANEN[j]);

  for (var fn in perHandler) {
    if (perHandler[fn] > 1) duplikat.push({ fn: fn, jumlah: perHandler[fn] });
    if (TRIGGER_SISI_PERMANEN.indexOf(fn) >= 0) continue;
    if (TRIGGER_SISI_SEMENTARA.indexOf(fn) >= 0) {
      sementara.push(fn);
      continue;
    }
    lebih.push(fn);
  }

  var hasil = {
    ok: kurang.length === 0 && lebih.length === 0 && duplikat.length === 0,
    total: trs.length,
    permanen: TRIGGER_SISI_PERMANEN.length,
    semua: semua,
    kurang: kurang,
    lebih: lebih,
    duplikat: duplikat,
    sementara: sementara,
    catatan:
      "migrasiSemuaTick/job sekali-jalan boleh muncul sementara dan harus melepas diri saat selesai.",
  };
  Logger.log("[auditTriggerSiSi] " + JSON.stringify(hasil));
  return hasil;
}

// Read-only: jadwal efektif untuk ditampilkan di log/diagnostik.
function lihatJadwalTriggerSiSi() {
  return {
    permanen: [
      { fn: "_t11TickPusatSiSi_", jadwal: "setiap 1 menit" },
      { fn: "_t11HarianPusatSiSi_", jadwal: "setiap hari sekitar 00:30 WIB" },
    ],
    tugasBerkala: TRIGGER_SISI_TUGAS,
    tugasHarian: TRIGGER_SISI_HARIAN,
    sementaraDiizinkan: TRIGGER_SISI_SEMENTARA,
  };
}

/* Private scheduled maintenance. The T11 resolver invokes ONLY these three
 * fixed jobs from its closure-owned queue capability. No user token, request
 * flag, caller-supplied options, trigger installation or queue reset.
 *
 * Legacy public endpoints and their guards remain untouched. Bulk legacy
 * maintenance is allowed only after a full populated-row ownership preflight:
 * a mixed/unknown-ULP sheet stops the whole job before invoking its writer.
 * Script locks coordinate script writers, not external AppSheet edits.
 */
function _t11RunMaintenance_(name) {
  var root = _triggerSisiGlobal_();
  function need(key) {
    if (typeof root[key] !== "function")
      throw new Error("T11_WORKER_DEPENDENCY_MISSING");
    return root[key];
  }
  function sameUlp(value) {
    return need("ulpSama_")(value, "ULP Toboali");
  }
  function _ownedSheet_(sh, col) {
    if (!sh || !Number.isInteger(col) || col < 0 || col >= sh.getLastColumn())
      throw new Error("T11_WORKER_SCHEMA_MISSING");
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var populated = rows[i].some(function (v) { return v !== "" && v != null; });
      if (populated && !sameUlp(rows[i][col]))
        throw new Error("T11_WORKER_ULP_UNRESOLVED_OR_FOREIGN");
    }
    return rows;
  }
  function completed(result) {
    if (!result || result.ok !== true) throw new Error("T11_WORKER_JOB_FAILED");
    return result;
  }
  if (["refreshLaporanHarianHariIni", "sweepDurasiJarakYandalP0",
      "validasiUlangFotoTemuan"].indexOf(name) < 0)
    throw new Error("T11_WORKER_UNKNOWN_JOB");
  var lock = LockService.getScriptLock();
  function acquire() {
    lock.waitLock(30000);
    if (!lock.hasLock()) throw new Error("T11_WORKER_LOCK_REQUIRED");
  }
  try {
    acquire();
    if (name === "refreshLaporanHarianHariIni") {
      // The report table has no row ULP column: it is explicitly single-ULP.
      // Preserve its configured label and cache namespace, never default an
      // unresolved/foreign configuration to Toboali.
      if (!root.LH || !sameUlp(root.LH.ULP))
        throw new Error("T11_WORKER_ULP_UNRESOLVED_OR_FOREIGN");
      var up3Builder = need("originalbuildLaporanUP3");
      var uiwBuilder = need("originalbuildLaporanWilayah");
      var today = need("_lhToday")();
      if (typeof root._tglSudahDiarsip_ === "function" && root._tglSudahDiarsip_(today))
        return { ok: true, skipped: "diarsip", tanggal: today };
      var ss = SpreadsheetApp.openById(root.SPREADSHEET_ID);
      var reportSheet = need("_lhSheet")(ss);
      var reportRow = need("_lhEnsureRow")(reportSheet, today);
      if (!reportRow) return { ok: true, skipped: "diarsip", tanggal: today };
      var snapshot = reportSheet.getRange(reportRow, 1, 1, 8).getValues()[0];
      if (need("_normTgl")(snapshot[root.LH.COL.tanggal]) !== today)
        throw new Error("T11_WORKER_ROW_CHANGED");
      var up3 = up3Builder(today, root.LH.ULP, { c4a: need("_lhC4aFromRow")(snapshot) });
      var uiw = uiwBuilder(today, root.LH.ULP, {});
      if (typeof up3 !== "string" || typeof uiw !== "string")
        throw new Error("T11_WORKER_JOB_FAILED");
      var fresh = reportSheet.getRange(reportRow, 1, 1, 8).getValues()[0];
      if (JSON.stringify(fresh) !== JSON.stringify(snapshot))
        throw new Error("T11_WORKER_ROW_CHANGED");
      reportSheet.getRange(reportRow, root.LH.COL.lapUp3 + 1).setValue(up3);
      reportSheet.getRange(reportRow, root.LH.COL.lapUiw + 1).setValue(uiw);
      // Same cache key as the existing mobile reader; no namespace migration.
      CacheService.getScriptCache().remove(need("_lapMobileCacheKey_")(root.LH.ULP, today));
      return { ok: true, tanggal: today };
    }
    if (name === "sweepDurasiJarakYandalP0") {
      var sweep = need("originalsweepDurasiJarakYandalP0");
      if (!root.SHEET_YANDAL || !root.COL_P0)
        throw new Error("T11_WORKER_SCHEMA_MISSING");
      var p0 = need("_shY_")(root.SHEET_YANDAL.P0);
      _ownedSheet_(p0, root.COL_P0.ulp);
      // Keep the existing fill-empty calculation, previous-P0 lookup, and
      // result counters. No force option can enter this scheduled route.
      return completed(sweep());
    }
    var completeCodes = need("originallengkapiKodeTemuanKosong");
    var repairCodes = need("originalperbaikiFormatKodeTemuan");
    var filename = need("_namaFileFotoRef");
    if (!root.SHEET_INS || !root.COL_INS || !root.COL_INS.TEMUAN)
      throw new Error("T11_WORKER_SCHEMA_MISSING");
    var sh = need("_ssIns")().getSheetByName(root.SHEET_INS.TEMUAN);
    var T = root.COL_INS.TEMUAN;
    _ownedSheet_(sh, T.ulp);
    // Preserve both existing preparation steps, but do NOT swallow failure.
    // These legacy helpers release their lock, so reacquire and recheck before
    // the next phase rather than continuing with stale ownership.
    completed(completeCodes());
    acquire();
    _ownedSheet_(sh, T.ulp);
    completed(repairCodes());
    acquire();
    var data = _ownedSheet_(sh, T.ulp);
    var cleaned = 0;
    for (var r = 1; r < data.length; r++) {
      var v = data[r];
      var q = filename(v[T.fotoTemuan]), oldQ = filename(v[T.fotoTemuanUrl]);
      var s = filename(v[T.fotoTiang]), oldS = filename(v[T.fotoTiangUrl]);
      // Drive URLs have no comparable fileName and remain untouched.
      if ((!oldQ || oldQ === q) && (!oldS || oldS === s)) continue;
      var current = sh.getRange(r + 1, 1, 1, v.length).getValues()[0];
      if (!sameUlp(current[T.ulp]) || JSON.stringify(current) !== JSON.stringify(v))
        throw new Error("T11_WORKER_ROW_CHANGED");
      if (v[T.fotoTemuanUrl]) sh.getRange(r + 1, T.fotoTemuanUrl + 1).setValue("");
      if (v[T.fotoTiangUrl]) sh.getRange(r + 1, T.fotoTiangUrl + 1).setValue("");
      cleaned++;
    }
    SpreadsheetApp.flush();
    return { ok: true, dibersihkan: cleaned };
  } finally {
    try { if (lock.hasLock()) lock.releaseLock(); } catch (releaseError) {}
  }
}
