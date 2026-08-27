/* ============================================================================
   Trigger-Manager.js — SATU SUMBER TRIGGER BACKEND SiSi
   Rev 24 Agu 2026
   ---------------------------------------------------------------------------
   HASIL AUDIT SELURUH SiSi_BackEnd:
   - Ditemukan 40 pemanggilan ScriptApp.newTrigger tersebar di modul lama.
   - Sebagian saling tumpang tindih (recalcTick vs fastTick, approval drain,
     refresh WA/ROW/laporan, migrasi per-sheet, dan job sekali jalan).
   - Fungsi ini menggantikan pemasangan terpisah dengan 2 trigger permanen:
       1) tickPusatSiSi   : setiap 1 menit, menjadwalkan semua tugas berkala.
       2) harianPusatSiSi : setiap hari sekitar 00:30 WIB.
   - migrasiSemuaTick tetap boleh muncul SEMENTARA. Ia dibuat oleh
     mulaiMigrasiSemua(), lalu menghapus dirinya sendiri setelah migrasi selesai.

   CARA PAKAI SETELAH CLASP PUSH + DEPLOY:
     1. Jalankan pasangSemuaTriggerSiSi() SEKALI dari editor Apps Script.
     2. Izinkan otorisasi bila diminta.
     3. Jalankan auditTriggerSiSi() untuk verifikasi. Target: ok=true,
        permanen=2, kurang=[], lebih=[], duplikat=[] (migrasiSemuaTick boleh ada
        sementara setelah jadwal migrasi dimulai).

   PENTING:
   - Installer melakukan preflight dulu. Bila handler wajib ada yang hilang,
     TIDAK ADA trigger yang dihapus atau dibuat.
   - Bila preflight lolos, seluruh trigger milik user pada project ini dihapus,
     lalu tepat 2 trigger permanen dibuat. Ini sengaja agar tidak ada trigger
     lebih/kurang dan tidak ada peninggalan konfigurasi lama.
   - pingEngineY SENGAJA tidak dijadwalkan. Keep-warm melawan min-instances=0,
     memicu request terus-menerus, dan merusak strategi hemat/free-tier.
   - Job sekali jalan (migrasi/perbaikan massal/recalc massal) tidak dijadikan
     trigger permanen. Jalankan fungsi mulai* terkait hanya saat memang perlu.
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

var TRIGGER_SISI_PERMANEN = ["tickPusatSiSi", "harianPusatSiSi"];
var TRIGGER_SISI_SEMENTARA = [
  "migrasiSemuaTick",
  "jalankanRecalcPointBertahap",
  "jalankanPerbaikanMassalKodeROWMenit",
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
        fn.call(_triggerSisiGlobal_());
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

// SATU-SATUNYA fungsi pemasang trigger yang perlu dijalankan setelah deploy.
function pasangSemuaTriggerSiSi() {
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

  ScriptApp.newTrigger("tickPusatSiSi").timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger("harianPusatSiSi")
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
      { fn: "tickPusatSiSi", jadwal: "setiap 1 menit" },
      { fn: "harianPusatSiSi", jadwal: "setiap hari sekitar 00:30 WIB" },
    ],
    tugasBerkala: TRIGGER_SISI_TUGAS,
    tugasHarian: TRIGGER_SISI_HARIAN,
    sementaraDiizinkan: TRIGGER_SISI_SEMENTARA,
  };
}
