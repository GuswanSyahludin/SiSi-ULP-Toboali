/* ============================================================================
   Audit-Guard.js — pemindai otomatis kelengkapan guard_
   Dibuat 29 Agu 2026
   ----------------------------------------------------------------------------
   KENAPA ALAT INI WAJIB
   appsscript.json memakai access: ANYONE_ANONYMOUS, jadi SETIAP fungsi top-level
   bisa dipanggil siapa pun lewat google.script.run. Keamanan karena itu
   sepenuhnya bergantung pada disiplin memasang guard_ di setiap fungsi.
   Tanpa pemindai, satu fungsi yang lupa tidak akan ketahuan sampai disalahgunakan.

   Jalankan dari editor Apps Script sebelum setiap clasp push:
       auditGuardSiSi_()          -> laporan lengkap
       auditGuardSiSi_({ringkas:true})

   Cara kerja: membaca sumber setiap fungsi global lewat Function.toString(),
   membuang komentar, lalu memeriksa apakah pernyataan-pernyataan pertamanya
   memanggil guard_ / requireSesi_ / _assertSuperUser / guardInternal_.
   ========================================================================= */

/* Panggilan yang dianggap "pintu terjaga", diurutkan dari yang terkuat. */
var AUDIT_PANGGILAN_GUARD = [
  "guard_",
  "requireSesi_",
  "_assertSuperUser",
  "_assertSuperUserKetat_",
  "webhookVerifikasi_",
  /* Memang memeriksa sesi, tetapi TIDAK memeriksa peran maupun ULP.
     Cukup untuk "harus login", tidak cukup untuk data lintas ULP. */
  "getSesiByToken",
];

/* Pola yang hanya memeriksa identitas tanpa otorisasi — dilaporkan terpisah
   supaya bisa ditingkatkan ke guard_(). */
var AUDIT_GUARD_LEMAH = ["getSesiByToken"];

/* guardInternal_ mencatat jejak tapi TIDAK mengotentikasi pengguna —
   hanya pantas untuk fungsi trigger terjadwal. */
var AUDIT_GUARD_INTERNAL = "guardInternal_";

/* Fungsi yang memang tidak boleh / tidak perlu memeriksa sesi.
   Daftar ini sengaja eksplisit supaya penambahan fungsi baru selalu
   dievaluasi, bukan lolos begitu saja. */
var AUDIT_ABAIKAN = [
  "doGet",
  "doPost",
  "doLogin",
  "include",
  "onOpen",
  "onEdit",
  "onInstall",
  "getSessionUser",
  "getSesiByToken",
  "doLogout",
  /* Helper murni Guard.js — dipanggil SETELAH guard_ berjalan. */
  "safeCell_",
  "safeRow_",
  "safeMatrix_",
  "withLock_",
  "audit_",
  "loginThrottleCek_",
  "loginThrottleGagal_",
  "loginThrottleReset_",
  "ulpScope_",
  "barisUlpCocok_",
  "bolehLintasUlp_",
  "bolehKelolaAkun_",
  "rolePunya_",
  "verifikasiLogin_",
  "cariPasswordTersimpan_",
  "upgradeHashPw_",
  "_normRole_",
  "_normUlp_",
  "ulpSama_",
  "_tokenDariArgs_",
  "_guardErrorAkses_",
  "_assertSuperUserKetat_",
  "_webhookSecret_",
  "_webhookTsMode_",
  "_webhookTsMs_",
  "_teksSamaAman_",
  "_hashPw_",
  "_saltBaru_",
  "_verifyPw_",
  "_pwPepper_",
  "_pwSudahHash_",
  "_pwPerluUpgrade_",
  "_tulisHashPw_",
  "_hex_",
  "_guardTeks_",
  "_guardKecil_",
  "_guardCocok_",
  "_akunSheet_",
  "_findRowAkun",
  "_usersRowsCache_",
  "_bustUsersCache_",
  "_pagesByBidang",
  "_parseAksesMenu",
  "_saranAksesMenu",
  "_bolehAksesMenu",
  /* Endpoint webhook AppSheet: tanpa token pengguna, diganti secret bersama.
     doPost sudah memanggil webhookVerifikasi_ sebelum menjalankannya. */
  "prosesShiftYandal",
  "prosesP0Yandal",
  "prosesSwitchingYandal",
  "hitungPointP0Yandal",
  "prosesHartekPG",
  "prosesHartekPekerjaan",
  "prosesHartekMaterial",
  "prosesHartekHarGrounding",
  "prosesHartekPemerataanBeban",
  "prosesEksekusiROW",
  "prosesEksekusiRow",
  "recalcWaByHeader",
  "refreshWaHarian",
  "refreshSemuaWa",
  "markRecalcRowDirty_",
  "markWaDirty_",
  /* Trigger terjadwal. */
  "fastTick",
  "recalcTick",
  "recalcRowTick",
  "sinkronRankYandal",
  "sweepPointP0Yandal",
  "drainAntreanP0",
  "drainAntreanApprovalP0",
  "drainLaporanDirty",
  "migrasiSemuaTick",
  "normalisasiUrlFotoRowTick",
  "ensureLaporanHarianHariIni",
];

/* Pola yang menandakan fungsi MENULIS ke spreadsheet atau Drive.
   Fungsi yang menulis tapi tidak terjaga = prioritas tertinggi. */
var AUDIT_POLA_TULIS = [
  ".setValue(",
  ".setValues(",
  ".appendRow(",
  ".deleteRow(",
  ".deleteRows(",
  ".clearContent(",
  ".clear(",
  ".insertRowsAfter(",
  ".setFormula(",
  ".setFormulas(",
  ".createFile(",
  ".setSharing(",
];

/* Pola yang menandakan fungsi MEMBACA data dari sheet. */
var AUDIT_POLA_BACA = [
  ".getValues(",
  ".getDataRange(",
  ".getDisplayValues(",
  ".getLastRow(",
  "openById(",
];

function _auditBuangKomentar_(src) {
  return String(src || "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/** Ambil isi dalam kurung kurawal pertama (badan fungsi). */
function _auditBadan_(src) {
  var i = String(src || "").indexOf("{");
  if (i < 0) return "";
  return String(src).substring(i + 1);
}

/**
 * Periksa satu fungsi.
 * @return {Object} { nama, terjaga, jenis, menulis, membaca, catatan }
 */
function _auditSatuFungsi_(nama, fn) {
  var out = {
    nama: nama,
    terjaga: false,
    jenis: "aman",
    menulis: false,
    membaca: false,
    catatan: "",
  };
  var src;
  try {
    src = fn.toString();
  } catch (e) {
    out.catatan = "sumber tidak terbaca";
    out.jenis = "tidak-diketahui";
    return out;
  }
  var bersih = _auditBuangKomentar_(src);
  var badan = _auditBadan_(bersih);

  for (var i = 0; i < AUDIT_PANGGILAN_GUARD.length; i++) {
    /* Harus berupa PANGGILAN, bukan sekadar penyebutan. */
    if (new RegExp("\\b" + AUDIT_PANGGILAN_GUARD[i] + "\\s*\\(").test(badan)) {
      out.terjaga = true;
      out.jenis = AUDIT_PANGGILAN_GUARD[i];
      break;
    }
  }
  if (!out.terjaga) {
    if (new RegExp("\\b" + AUDIT_GUARD_INTERNAL + "\\s*\\(").test(badan)) {
      out.jenis = "internal";
      out.catatan = "guardInternal_ — tidak mengotentikasi pengguna";
    }
  }
  /* Tandai yang hanya memakai getSesiByToken: terotentikasi, belum terotorisasi. */
  if (out.terjaga && AUDIT_GUARD_LEMAH.indexOf(out.jenis) >= 0) {
    out.lemah = true;
    out.catatan =
      (out.catatan ? out.catatan + "; " : "") +
      "hanya getSesiByToken — tanpa pemeriksaan peran/ULP";
  }

  /* Kontrak 2 argumen: guard_(arguments) saja berarti opts ikut di dalam
     array argumen dan SEMUA pemeriksaan peran/ULP dilewati diam-diam. */
  var m = badan.match(/\bguard_\s*\(\s*arguments\s*\)/);
  if (m) {
    out.catatan =
      (out.catatan ? out.catatan + "; " : "") +
      "SALAH PASANG: guard_(arguments) tanpa argumen opts ke-2 — peran/ULP tidak diperiksa";
    out.salahPasang = true;
  }

  for (var w = 0; w < AUDIT_POLA_TULIS.length; w++) {
    if (badan.indexOf(AUDIT_POLA_TULIS[w]) >= 0) {
      out.menulis = true;
      break;
    }
  }
  for (var r = 0; r < AUDIT_POLA_BACA.length; r++) {
    if (badan.indexOf(AUDIT_POLA_BACA[r]) >= 0) {
      out.membaca = true;
      break;
    }
  }
  return out;
}

/**
 * Pindai seluruh fungsi global.
 * @param {Object} opts
 *   opts.semua      {boolean} sertakan fungsi berawalan underscore
 *   opts.hanyaCelat {boolean} hanya tampilkan yang belum terjaga
 */
function auditGuardSiSi_(opts) {
  opts = opts || {};
  var g = typeof globalThis !== "undefined" ? globalThis : (function () { return this; })();
  var nama;
  var hasil = [];
  var terlewat = 0;
  var salahPasang = 0;

  for (nama in g) {
    if (typeof g[nama] !== "function") continue;
    if (/^_/.test(nama) && !opts.semua) continue; // helper internal
    if (AUDIT_ABAIKAN.indexOf(nama) >= 0) continue;

    var r = _auditSatuFungsi_(nama, g[nama]);
    if (r.salahPasang) salahPasang++;
    if (!r.terjaga && r.jenis !== "internal") terlewat++;
    hasil.push(r);
  }

  hasil.sort(function (a, b) {
    /* Tulis tanpa jaga paling atas, lalu baca tanpa jaga, lalu yang terjaga. */
    function bobot(x) {
      if (x.salahPasang) return 0;
      if (!x.terjaga && x.menulis) return 1;
      if (!x.terjaga && x.membaca) return 2;
      if (!x.terjaga) return 3;
      return 4;
    }
    return bobot(a) - bobot(b) || a.nama.localeCompare(b.nama);
  });

  var ringkasan = {
    diperiksa: hasil.length,
    belumTerjaga: terlewat,
    salahPasang: salahPasang,
    terjagaTanpaOtorisasi: hasil.filter(function (x) {
      return x.lemah;
    }).length,
    menulisTanpaJaga: hasil.filter(function (x) {
      return !x.terjaga && x.menulis;
    }).length,
    membacaTanpaJaga: hasil.filter(function (x) {
      return !x.terjaga && x.membaca;
    }).length,
  };

  var daftar = opts.hanyaCelat
    ? hasil.filter(function (x) {
        return !x.terjaga || x.salahPasang;
      })
    : hasil;

  return {
    ok: terlewat === 0 && salahPasang === 0,
    ringkasan: ringkasan,
    fungsi: opts.ringkas ? undefined : daftar,
    daftarNama: opts.ringkas
      ? daftar.map(function (x) {
          return (x.salahPasang ? "[SALAH PASANG] " : "") + x.nama + (x.menulis ? " (tulis)" : x.membaca ? " (baca)" : "");
        })
      : undefined,
  };
}

/**
 * Ringkasan singkat untuk konsol — pakai ini sebelum deploy.
 */
function laporkanGuardSiSi_() {
  var r = auditGuardSiSi_({ ringkas: true });
  var baris = [];
  baris.push("=== AUDIT GUARD SiSi ===");
  baris.push("diperiksa        : " + r.ringkasan.diperiksa);
  baris.push("belum terjaga    : " + r.ringkasan.belumTerjaga);
  baris.push("  menulis        : " + r.ringkasan.menulisTanpaJaga + "  <-- PRIORITAS");
  baris.push("  membaca        : " + r.ringkasan.membacaTanpaJaga);
  baris.push("salah pasang     : " + r.ringkasan.salahPasang + "  <-- PRIORITAS");
  if (r.daftarNama && r.daftarNama.length) {
    baris.push("--- belum terjaga / salah pasang ---");
    for (var i = 0; i < r.daftarNama.length; i++) baris.push("  " + r.daftarNama[i]);
  }
  baris.push(r.ok ? "HASIL: LULUS" : "HASIL: ADA YANG PERLU DIPERBAIKI");
  var teks = baris.join("\n");
  console.log(teks);
  return r;
}
