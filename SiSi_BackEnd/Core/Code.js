/* ═════════════════════════════════════
   Code.js — SiSi ULP Toboali (BAGIAN 1: INTI / SHARED)
   Google Apps Script Backend
   Rev: 19 Agu 2026 (struktur folder VS Code + clasp · .gs → .js ·
        perbaikan path pemanggilan file HTML untuk HtmlService)
   Rev 19 Agu 2026 (siang): simpanMobileEksekusiRow jadi BACKLOG — rantai bottom-up prosesEksekusiROW
        didefer ke db_Recalc_Queue (jenis baru "eksekusiRow", diproses recalcTick tiap 1 menit; trigger
        recalcTick yang sudah ada LANGSUNG bisa memprosesnya — tanpa trigger baru) + cache folder Drive
        harian per tim (hemat ~6 round-trip Drive per input). UI mobile balas seketika setelah foto+baris tertulis.
   Rev 19 Agu 2026 (sore): doLogin memakai cache db_Users 10 menit (_usersRowsCache_) — login tidak
        lagi openById + scan sheet tiap kali (cold start jauh lebih ringan); fungsi tulis akun
        (tambah/update/hapus/reset/ganti password) mem-bust cache agar perubahan langsung efektif.
   Rev 19 Agu 2026 (malam): fastTick — SATU trigger 1-menit menggantikan trigger terpisah recalcTick +
        drainAntreanApprovalP0 (tekanan eksekusi simultan turun — penyebab login/approval timeout saat
        project ramai). Pasang via createFastTickTrigger() SEKALI dari editor — otomatis melepas trigger
        lama yang digantikan (recalcTick / recalcRowTick / drainAntreanApprovalP0).
        + aturIntervalTrigger(fn, menit) + aturDrainWatermark5Menit(): turunkan drain watermark
        1 menit → 5 menit dari editor (drain WM memindai 2 sheet penuh tiap run — beban sheet terberat).
   Rev 21 Agu 2026: getMobileDropdownRow DUAL-READ — db_Penyulang dibaca dari 2 DB (AKTIF + ARSIP,
        pola Tek-Migrasi: tulis hanya ke AKTIF, baca dari keduanya), merge + dedup per pasangan
        (Nama Penyulang, Section) + cache 10 menit (dropdownPenyulang_v2) & bustCacheDropdownPenyulang().
        Respons tidak berubah → mobile/APK tidak perlu update.
   Rev 21 Agu 2026 (siang): + updateMobileEksekusiRow — update BERTAHAP foto eksekusi ROW (sistem
        progres 3 tahap): cari baris by Kode Eksekusi, unggah foto lanjutan ke folder Drive yang sama,
        tulis kolom T/U/AA & V/W/AB, refresh rantai Realisasi/WA via antrean (dedup by key).
        + 1 case router updateEksekusiRow.
   Rev sebelumnya: 31 Mei 2026 (konsolidasi bersih + modul Inspeksi + MOBILE API LAYER)
   Catatan: fungsi per-menu dipindah ke Tek-Code.gs
═════════════════════════════════════ */

/* ── Konstanta ── */
var SPREADSHEET_ID = "16oA-oonlRK0XHaisQW_vNb1Pf1lK_-YTLO2rlh0EXNE";
var SESSION_TTL_SEC = 60 * 15; // 15 menit

/* Halaman yang bisa diakses role Teknik / Operator */
var FULL_ACCESS_PAGES = [
  "Tek-Dashboard",
  "Tek-ROW",
  "Tek-Inspeksi",
  "Tek-InsDu",
  "Tek-PengukuranGardu",
  "Tek-InsJar",
  "Temuan-Inspeksi",
  "Tek-Yandal",
  "Tek-Hartek",
  "Tek-Gangguan",
  "SIE-Teknik",
];

/* ═══ MAPPING FILE HTML DENGAN STRUKTUR FOLDER ═══ */
var PAGE_FILE_ALIASES = {
  // ── Root (tanpa folder) ──
  "PP-Dashboard": "PP-Dashboard",
  "TE-Dashboard": "TE-Dashboard",
  "K3-Dashboard": "K3-Dashboard",
  "SIE-BeritaAcara": "SIE-BeritaAcara",

  // ── Core ──
  Main: "Core/Main",
  "login-page": "Core/login-page",
  "Tek-Dashboard": "Core/Tek-Dashboard",
  "Temuan-Inspeksi": "Core/Temuan-Inspeksi",

  // ── Modul per tim ──
  "Tek-ROW": "ROW/Tek-ROW",
  "Tek-InsJar": "Inspeksi_Jaringan/Tek-InsJar",
  "Tek-InsDu": "Inspeksi_Gardu/Tek-InsDu",
  "Tek-PengukuranGardu": "Inspeksi_Gardu/Tek-PengukuranGardu",
  "Tek-Yandal": "Yandal/Tek-Yandal",
  "Tek-Hartek": "Hartek/Tek-Hartek",

  // ── Teknik ──
  "SIE-Teknik": "Teknik/SIE-Teknik",
  "Jadwal-Padam": "Teknik/Jadwal-Padam",
  "SIE-LaporanTeknik": "Teknik/SIE-Teknik",
  "Tek-Data-Checkpoint": "Teknik/Tek-Data-Checkpoint",
};

var PAGE_ACCESS_PARENT = {
  "SIE-LaporanTeknik": "SIE-Teknik",
  "Jadwal-Padam": "SIE-Teknik",
  "SIE-BeritaAcara": "SIE-Teknik",
  "Tek-Data-Checkpoint": "SIE-Teknik",
};

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
var PP_PAGES = ["PP-Dashboard"];
var TE_PAGES = ["TE-Dashboard"];
var K3_PAGES = ["K3-Dashboard"];

/* Peta kolom db_Users (0-based)
   A=No, B=Email, C=Username, D=Password, E=Role, F=ULP, G=Kode ULP, H=Bidang, I=Tim, J=Sub-Tim, K=Akses Menu */
var COL_USERS = {
  no: 0,
  email: 1,
  userName: 2,
  password: 3,
  role: 4,
  ulp: 5,
  kodeUlp: 6,
  bidang: 7,
  tim: 8,
  subTim: 9,
  aksesMenu: 10,
};

/* ═══ SHARED LAYER — INSPEKSI (dipakai modul Tek-Ins) ═══ */

function _ssIns() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

const SHEET_INS = {
  HEADER: "db_Global_Header",
  REALISASI: "db_InsJar_Realisasi",
  TEMUAN: "db_INS_Temuan",
  TIM: "db_Tim",
  PENYULANG: "db_Penyulang",
};

const COL_INS = {
  HEADER: {
    no: 0,
    kodeHeader: 1,
    ulp: 2,
    hari: 3,
    tanggal: 4,
    tim: 5,
    subTim: 6,
    koordinatAwal: 7,
    koordinatAkhir: 8,
    kmAwal: 9,
    kmAkhir: 10,
    kendala: 11,
    waText: 12,
    timestamp: 13,
    inputBy: 14,
    timestampUpdate: 15,
    statusTextWa: 16,
  },
  REALISASI: {
    kodeHeader: 1,
    kodePekerjaanPeny: 2,
    hari: 3,
    tanggal: 4,
    penyulang: 5,
    section: 6,
    segmen: 7,
    tier: 8,
    totalTiang: 9,
    jumlahTemuan: 10,
    inputBy: 11,
    timestamp: 12,
  },
  TEMUAN: {
    no: 0,
    kodeHeader: 1,
    kodePekerjaanPeny: 2,
    kodePekerjaan: 3,
    ulp: 4,
    hari: 5,
    tanggal: 6,
    timInspeksi: 7,
    objekInspeksi: 8,
    penyulang: 9,
    section: 10,
    segmen: 11,
    nomorTiang: 12,
    nomorGardu: 13,
    tier: 14,
    temuan: 15,
    fotoTemuan: 16,
    fotoTemuanUrl: 17,
    fotoTiang: 18,
    fotoTiangUrl: 19,
    deskripsi: 20,
    koordinat: 21,
    lat: 22,
    long: 23,
    inputBy: 24,
    timestamp: 25,
    status: 26,
    forwardBy: 27,
    tglForward: 28,
    timEksekusi: 29,
    catatan: 30,
    diameter: 31,
    jenisPekerjaan: 32,
    fotoPekerjaan: 33,
    fotoPekerjaanUrl: 34,
    fotoSesudah: 35,
    fotoSesudahUrl: 36,
    tglSelesai: 37,
    petugas: 38,
    inputBySelesai: 39,
    timestampSelesai: 40,
    tampilFotoTemuan: 41,
    tampilFotoPekerjaan: 42,
    tampilFotoSesudah: 43,
    folderPath: 44,
  },
};

const STATUS_INS = {
  PENUGASAN: "Penugasan Tim",
  PROGRESS: "Progress Pekerjaan",
  SELESAI: "Selesai",
};

function _readSheetIns(name, headerRows) {
  headerRows = headerRows == null ? 1 : headerRows;
  const sh = _ssIns().getSheetByName(name);
  if (!sh) throw new Error("Sheet tidak ditemukan: " + name);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  const start = headerRows + 1;
  if (lastRow < start) return [];
  return sh.getRange(start, 1, lastRow - start + 1, lastCol).getValues();
}

function _indexBy(rows, keyIdx) {
  const map = {};
  for (let i = 0; i < rows.length; i++) {
    const k = String(rows[i][keyIdx] == null ? "" : rows[i][keyIdx]).trim();
    if (!k) continue;
    (map[k] || (map[k] = [])).push(rows[i]);
  }
  return map;
}

function _distinct(rows, idx) {
  const seen = {},
    out = [];
  for (let i = 0; i < rows.length; i++) {
    const v = String(rows[i][idx] == null ? "" : rows[i][idx]).trim();
    if (v && !seen[v]) {
      seen[v] = true;
      out.push(v);
    }
  }
  return out;
}

function _cacheIns(key, ttlSec, producer) {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(key);
  if (hit) {
    try {
      return JSON.parse(hit);
    } catch (e) {}
  }
  const val = producer();
  try {
    cache.put(key, JSON.stringify(val), ttlSec);
  } catch (e) {}
  return val;
}

function _normTgl(v) {
  if (!v) return "";
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return "";
    return Utilities.formatDate(v, "Asia/Jakarta", "yyyy-MM-dd");
  }
  var s = String(v).trim();
  var m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1)
    return m1[3] + "-" + m1[2].padStart(2, "0") + "-" + m1[1].padStart(2, "0");
  var m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return m2[0];
  var d = new Date(s);
  if (!isNaN(d.getTime()))
    return Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd");
  return s;
}

function _insInRange(tgl, dari, sampai) {
  if (!tgl) return false;
  if (dari && tgl < dari) return false;
  if (sampai && tgl > sampai) return false;
  return true;
}

function _findRowTemuan(kodePekerjaan) {
  const sh = _ssIns().getSheetByName(SHEET_INS.TEMUAN);
  const data = _readSheetIns(SHEET_INS.TEMUAN);
  const idx = data.findIndex(function (r) {
    return (
      String(r[COL_INS.TEMUAN.kodePekerjaan]).trim() ===
      String(kodePekerjaan).trim()
    );
  });
  return idx === -1 ? null : { sheet: sh, row: idx + 2 };
}

function _jenisPekerjaan(diameter) {
  const d = Number(diameter) || 0;
  if (d === 0) return "Rabas / Pangkas";
  if (d <= 50) return "Tebang Sedang";
  return "Tebang Besar";
}

/* ═══ ENTRY POINT ═══ */
function doGet(e) {
  // MOBILE API LAYER: rute semua request Flutter (?mobile=1) ke apiRouter_, balikan JSON murni.
  if (e && e.parameter && e.parameter.mobile) return apiRouter_(e, null);

  // Rute UNDUH PDF ROW (link web -> langsung unduh): ?pdf=realisasi | ?pdf=eksekusi
  // Filter opsional: &tglDari=YYYY-MM-DD&tglSampai=YYYY-MM-DD&tim=...&penyulang=...&ulp=...
  // Implementasi unduhPdfROW ada di Tek-ROW.gs (ruang lingkup global, tanpa import).
  if (e && e.parameter && e.parameter.pdf) {
    /* WAJIB TOKEN (29 Agu 2026).
       Rute ini dieksekusi SEBELUM pemeriksaan token di bawah, jadi siapa pun
       di internet bisa meng-generate PDF tanpa login: membakar kuota, dan
       menyaring data lewat parameter tim / penyulang / tglDari / ulp untuk
       memetakan isi database. Hasil PDF-nya sendiri tetap ANYONE_WITH_LINK
       (keputusan terpisah), tetapi Pembuatannya sekarang harus terotentikasi. */
    var tokenPdf = String((e && e.parameter && e.parameter.token) || "").trim();
    if (!tokenPdf || !getSesiByToken(tokenPdf)) {
      audit_(null, "PDF", String(e.parameter.pdf), "TOLAK", "tanpa token sah");
      return ContentService.createTextOutput(
        JSON.stringify({
          ok: false,
          message: "Sesi habis atau tidak valid. Silakan login ulang.",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }
    // Inspeksi Gardu (?pdf=gardu) -> unduhPdfInsGardu (Tek-InsDu.gs). Lainnya -> unduhPdfROW.
    if (String(e.parameter.pdf).trim().toLowerCase() === "gardu")
      return unduhPdfInsGardu(e);
    return unduhPdfROW(e);
  }

  var token = (e && e.parameter && e.parameter.token) || "";
  var svcUrl = ScriptApp.getService().getUrl();

  if (!token) {
    var t1 = HtmlService.createTemplateFromFile(
      PAGE_FILE_ALIASES["login-page"],
    );
    t1.error = "";
    t1.scriptUrl = svcUrl;
    return t1
      .evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  var sesi = getSesiByToken(token);
  if (!sesi) {
    var t2 = HtmlService.createTemplateFromFile(
      PAGE_FILE_ALIASES["login-page"],
    );
    t2.error = "Sesi habis, silakan login ulang.";
    t2.scriptUrl = svcUrl;
    return t2
      .evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  /* DIHAPUS 29 Agu 2026 (K1 — session confusion):
     CacheService.getUserCache().put("userToken", ...)
     getUserCache() di-scope ke effective user. Karena web app memakai
     executeAs: USER_DEPLOYING + access: ANYONE_ANONYMOUS, effective user
     untuk seluruh pengunjung anonim adalah PEMILIK SCRIPT — cache itu jadi
     dipakai bersama semua orang dan bisa menyerahkan token pengguna lain.
     Token sekarang dikirim eksplisit ke halaman lewat getPageContent(). */

  return HtmlService.createTemplateFromFile(PAGE_FILE_ALIASES["Main"])
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/* ═══ WEBHOOK (POST) — dipanggil oleh Bot AppSheet ═══ */
/* Webhook secret wajib berasal dari Script Property SISI_WEBHOOK_SECRET. */

function doPost(e) {
  /* PEMISAHAN JALUR YANG TEGAS (29 Agu 2026).
     Dulu `?mobile=1` dialihkan ke apiRouter_ SEBELUM pemeriksaan secret, jadi
     seluruh API mobile bisa dipanggil tanpa autentikasi apa pun. Sekarang:
       • ada ?mobile=...  -> HANYA apiRouter_ (otentikasi pakai token sesi)
       • tanpa ?mobile=   -> HANYA webhook AppSheet (otentikasi pakai secret)
     Tidak ada jalur ketiga yang lolos tanpa salah satu. */
  if (e && e.parameter && e.parameter.mobile) {
    var bodyMobile = {};
    try {
      bodyMobile = JSON.parse(e.postData.contents);
    } catch (errMobile) {}
    return apiRouter_(e, bodyMobile);
  }

  var out = { ok: false };
  try {
    /* Secret HANYA dibaca dari body POST. Baris lama
         if ((!body || body.token == null) && e && e.parameter) body = e.parameter;
       dihapus karena memungkinkan secret dikirim sebagai query string
       (?secret=...), yang ikut tercatat di access log / histori browser. */
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (pe) {
        body = {};
      }
    }

    var ver = webhookVerifikasi_(body);
    if (!ver.ok) {
      out.message = ver.message;
      out.kode = ver.kode;
      return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(
        ContentService.MimeType.JSON,
      );
    }

    var action = ver.action || String(body.action || "recalcRow").trim();
    var cache = CacheService.getScriptCache();

    if (action === "recalcRow") {
      // ROW: TANDAI "dirty" lalu balas SEKETIKA. Recalc berat (eksekusi -> realisasi -> WA)
      // dijalankan backend oleh trigger recalcRowTick (tiap 1 menit). Petugas TIDAK perlu
      // menunggu jeda 30 detik — banjir input otomatis digabung per tim|tanggal.
      var tim = String(body.tim || "").trim();
      var tanggal =
        _normTgl(body.tanggal || new Date()) || _normTgl(new Date());
      if (typeof markRecalcRowDirty_ === "function") {
        var tanda = markRecalcRowDirty_(tim, tanggal); // dedup otomatis per tim|tanggal
        out = {
          ok: true,
          action: action,
          queued: tanda,
          tim: tim,
          tanggal: tanggal,
        };
      } else {
        // Fallback lama (sinkron + debounce) bila fungsi antrean belum terpasang.
        var dbKey = "wh_recalc_" + tim + "|" + tanggal;
        if (cache.get(dbKey)) {
          out = {
            ok: true,
            skipped: true,
            reason: "debounce",
            tim: tim,
            tanggal: tanggal,
          };
        } else {
          cache.put(dbKey, "1", 20);
          var hasil =
            typeof recalcEksekusiROW === "function"
              ? recalcEksekusiROW(tim || null, null, tanggal)
              : { success: false, message: "recalcEksekusiROW tidak tersedia" };
          out = {
            ok: true,
            action: action,
            tim: tim,
            tanggal: tanggal,
            hasil: hasil,
          };
        }
      }
    } else if (action === "recalcWa") {
      // WA (InsJar / InsDu / ROW-header): PROSES LANGSUNG & SINKRON saat webhook dipanggil
      // (mis. Bot db_Global_Header — Updates). recalcWaByHeader otomatis hitung ulang realisasi
      // (Jumlah Temuan/Section InsJar & jumlah temuan Gardu) lebih dulu, lalu tulis WA Text ke
      // baris header. WA langsung diperbarui — TIDAK menunggu antrean recalcTick (tiap 1 menit).
      // Debounce singkat (cache 8 dtk) hanya untuk meredam double-fire bot pada satu kodeHeader.
      var kodeHeader = String(body.kodeHeader || body.kode || "").trim();
      if (!kodeHeader) {
        out = { ok: false, message: "recalcWa butuh kodeHeader" };
      } else if (typeof recalcWaByHeader !== "function") {
        out = { ok: false, message: "recalcWaByHeader tidak tersedia" };
      } else {
        var dbKeyW = "wh_wa_" + kodeHeader;
        if (cache.get(dbKeyW)) {
          out = {
            ok: true,
            action: action,
            mode: "sync",
            skipped: true,
            reason: "debounce",
            kodeHeader: kodeHeader,
          };
        } else {
          cache.put(dbKeyW, "1", 8);
          var hasilW = recalcWaByHeader(kodeHeader); // PROSES LANGSUNG (sinkron)
          out = {
            ok: true,
            action: action,
            mode: "sync",
            kodeHeader: kodeHeader,
            hasil: hasilW,
          };
        }
      }
    } else if (action === "refreshWa") {
      // Sweep WA semua tim utk hari ini & kemarin (PENGGANTI trigger waktu refreshWaHarian).
      if (cache.get("wh_refreshwa")) {
        out = { ok: true, skipped: true, reason: "debounce" };
      } else {
        cache.put("wh_refreshwa", "1", 30);
        var hasilR =
          typeof refreshWaHarian === "function"
            ? refreshWaHarian()
            : { ok: false, message: "refreshWaHarian tidak tersedia" };
        out = { ok: true, action: action, hasil: hasilR };
      }
    } else if (action === "validasiFoto") {
      // Validasi ulang URL foto temuan: kosongkan R/T yg sudah basi (PENGGANTI trigger
      // waktu validasiUlangFotoTemuan). Aman dipanggil bot db_INS_Temuan saat foto berubah.
      if (cache.get("wh_validasifoto")) {
        out = { ok: true, skipped: true, reason: "debounce" };
      } else {
        cache.put("wh_validasifoto", "1", 20);
        var hasilV =
          typeof validasiUlangFotoTemuan === "function"
            ? validasiUlangFotoTemuan()
            : { ok: false, message: "validasiUlangFotoTemuan tidak tersedia" };
        out = { ok: true, action: action, hasil: hasilV };
      }
    } else if (action === "refreshLaporan") {
      // LAPORAN HARIAN (UP3 + UIW/Wilayah) — MODE ASYNC: tandai tanggal "dirty" lalu balas SEKETIKA.
      // Rebuild berat (buildLaporanUP3 + buildLaporanWilayah -> tulis kolom G/H sheet Teknik_Laporan
      // Harian) dijalankan backend drainLaporanDirty (tiap 1 menit). Sync AppSheet TIDAK menunggu.
      // Body: { token|secret, action:'refreshLaporan', tanggal?:'<<TODAY()>>' }. tanggal kosong -> hari ini.
      var tglLap = _normTgl(body.tanggal || "") || "";
      if (typeof markLaporanDirty_ === "function") {
        var tandaLap = markLaporanDirty_(tglLap);
        out = {
          ok: true,
          action: action,
          mode: "queued",
          queued: true,
          tanggal: tandaLap,
        };
      } else {
        out = {
          ok: false,
          message:
            "markLaporanDirty_ tidak tersedia; pasang fungsi antrean laporan (Tek-LaporanHarianSheet.gs) & jalankan createLaporanDrainTrigger() dulu.",
        };
      }
    } else if (action === "prosesShiftYandal") {
      // YANDAL: isi Hari & Time Stamp shift + hitung Jumlah P0 (bot db_Yandal_Shift, Adds).
      var kodeShift = String(body.kodeShift || "").trim();
      if (!kodeShift) {
        out = { ok: false, message: "prosesShiftYandal butuh kodeShift" };
      } else if (typeof prosesShiftYandal === "function") {
        prosesShiftYandal(kodeShift);
        out = { ok: true, action: action, kodeShift: kodeShift };
      } else {
        out = { ok: false, message: "prosesShiftYandal tidak tersedia" };
      }
    } else if (action === "prosesP0Yandal") {
      // YANDAL P0 — MODE ASYNC: webhook HANYA mencatat antrean lalu balas SEKETIKA (sync AppSheet
      //   cuma jadi PEMICU, tidak menunggu watermark). Watermark dikerjakan backend drainAntreanP0
      //   (tiap 1 menit; backstop sweepWmBacklogY menutup celah). Field "foto" opsional → antre
      //   per-kolom (hemat saat hanya 1 foto berubah); kosong = semua kolom diproses saat drain.
      var kodeP0 = String(body.kodeP0 || "").trim();
      var fotoTg = String(body.foto || "").trim(); // "sebelum"|"pekerjaan"|"sesudah" (kosong = semua)
      if (!kodeP0) {
        out = { ok: false, message: "prosesP0Yandal butuh kodeP0" };
      } else if (typeof enqueueP0Yandal_ === "function") {
        var antre = enqueueP0Yandal_(kodeP0, fotoTg); // catat antrean (dedup otomatis) → balas seketika
        out = {
          ok: true,
          action: action,
          mode: "queued",
          queued: antre,
          kodeP0: kodeP0,
          foto: fotoTg,
        };
      } else {
        out = {
          ok: false,
          message:
            "enqueueP0Yandal_ tidak tersedia; jalankan createWmDrainTriggerY dulu agar antrean WM diproses.",
        };
      }
    } else if (action === "prosesSwitchingYandal") {
      // YANDAL Switching — MODE ASYNC: webhook HANYA mencatat antrean lalu balas SEKETIKA (sync cuma
      //   PEMICU). Watermark dikerjakan backend drainAntreanP0 (kode -SWT. diarahkan ke prosesSwitchingYandal).
      //   Field "foto" opsional → antre per-kolom; kosong = semua foto diproses saat drain.
      var kodeSwc = String(body.kodeSwitching || "").trim();
      var fotoSwc = String(body.foto || "").trim(); // "arus"|"gangguan1".."gangguan5" (kosong = semua)
      if (!kodeSwc) {
        out = {
          ok: false,
          message: "prosesSwitchingYandal butuh kodeSwitching",
        };
      } else if (typeof enqueueP0Yandal_ === "function") {
        var antreSwc = enqueueP0Yandal_(kodeSwc, fotoSwc); // antrean sama; drainAntreanP0 arahkan ke prosesSwitchingYandal (kode -SWT.)
        out = {
          ok: true,
          action: action,
          mode: "queued",
          queued: antreSwc,
          kodeSwitching: kodeSwc,
          foto: fotoSwc,
        };
      } else {
        out = {
          ok: false,
          message:
            "enqueueP0Yandal_ tidak tersedia; jalankan createWmDrainTriggerY dulu agar antrean WM diproses.",
        };
      }
    } else if (action === "prosesHartekPG") {
      // HARTEK PenyulangGardu (bot db_Hartek_PenyulangGardu, Adds): isi ULP/Hari/Tanggal dari
      // header; bila objek=Gardu, isi Penyulang/Section/Daerah dari GARDU_MASTER; lalu rebuild WA.
      var kodePgH = String(body.kodePG || "").trim();
      if (!kodePgH) {
        out = { ok: false, message: "prosesHartekPG butuh kodePG" };
      } else if (typeof prosesHartekPG === "function") {
        out = prosesHartekPG(kodePgH);
      } else {
        out = { ok: false, message: "prosesHartekPG tidak tersedia" };
      }
    } else if (action === "cekBarisHartekPG") {
      // HARTEK cek baris PenyulangGardu: Jenis='Jaringan' -> kosongkan Nomor Gardu; selain itu
      // (Gardu / Non - Teknik) -> isi Penyulang (kolom E) & Section (kolom F) dari GARDU_MASTER.
      var kodePgCek = String(body.kodePG || "").trim();
      if (!kodePgCek) {
        out = { ok: false, message: "cekBarisHartekPG butuh kodePG" };
      } else if (typeof cekBarisHartekPG === "function") {
        out = cekBarisHartekPG(kodePgCek);
      } else {
        out = { ok: false, message: "cekBarisHartekPG tidak tersedia" };
      }
    } else if (action === "prosesHartekPekerjaan") {
      // HARTEK Pekerjaan (bot db_Hartek_Pekerjaan, Adds): warisi konteks dari parent PG; rebuild WA.
      var kodePekH = String(body.kodePekerjaan || "").trim();
      if (!kodePekH) {
        out = {
          ok: false,
          message: "prosesHartekPekerjaan butuh kodePekerjaan",
        };
      } else if (typeof prosesHartekPekerjaan === "function") {
        out = prosesHartekPekerjaan(kodePekH);
      } else {
        out = { ok: false, message: "prosesHartekPekerjaan tidak tersedia" };
      }
    } else if (action === "prosesHartekMaterial") {
      // HARTEK Material (bot db_Hartek_Material, Adds): warisi konteks dari parent Pekerjaan; rebuild WA.
      var kodeMatH = String(body.kodeMaterial || "").trim();
      if (!kodeMatH) {
        out = { ok: false, message: "prosesHartekMaterial butuh kodeMaterial" };
      } else if (typeof prosesHartekMaterial === "function") {
        out = prosesHartekMaterial(kodeMatH);
      } else {
        out = { ok: false, message: "prosesHartekMaterial tidak tersedia" };
      }
    } else if (action === "prosesHartekHarGrounding") {
      // HARTEK Har Grounding (bot db_Hartek_HarGrounding — Adds & Updates): warisi konteks dari
      // parent Pekerjaan lalu rebuild WA. WAJIB event Updates juga: Link Foto Sebelum/Sesudah
      // diisi AppSheet BELAKANGAN (setelah upload), jadi recalc harus jalan lagi saat link muncul
      // agar hasil grounding ikut masuk WA (_htkTeksGrounding melewati baris tanpa link).
      var kodeGndH = String(body.kodeHarGrounding || "").trim();
      if (!kodeGndH) {
        out = {
          ok: false,
          message: "prosesHartekHarGrounding butuh kodeHarGrounding",
        };
      } else if (typeof prosesHartekHarGrounding === "function") {
        out = prosesHartekHarGrounding(kodeGndH);
      } else {
        out = { ok: false, message: "prosesHartekHarGrounding tidak tersedia" };
      }
    } else if (action === "prosesHartekPemerataanBeban") {
      // HARTEK Pemerataan/Pembagian Beban Trafo (bot db_Hartek_PemerataanBeban — Adds & Updates):
      // warisi konteks (Kode Header/PG, Hari, Tanggal, Penyulang, Section, Nomor Gardu, Alamat)
      // dari parent Pekerjaan lalu rebuild WA. WAJIB event Updates juga: Link Foto Beban
      // Sebelum/Sesudah (R/S/T) diisi AppSheet BELAKANGAN (setelah upload), jadi recalc harus
      // jalan lagi saat link muncul agar blok "Hasil Pengukuran Beban Trafo" ikut masuk WA
      // (_htkTeksBeban menahan baris yang Link Foto-nya belum lengkap).
      var kodePmrH = String(body.kodePemerataan || "").trim();
      if (!kodePmrH) {
        out = {
          ok: false,
          message: "prosesHartekPemerataanBeban butuh kodePemerataan",
        };
      } else if (typeof prosesHartekPemerataanBeban === "function") {
        out = prosesHartekPemerataanBeban(kodePmrH);
      } else {
        out = {
          ok: false,
          message: "prosesHartekPemerataanBeban tidak tersedia",
        };
      }
    } else if (action === "prosesEksekusiRow") {
      // ROW RANTAI TERBALIK (bot db_ROW_Eksekusi, Adds): dari Kode Eksekusi (UNIQUEID) bangun
      // induk db_ROW_Realisasi + kakek db_Global_Header bila belum ada, tulis-balik Kode
      // Pekerjaan + Kode Header ke baris eksekusi, lalu sinkron angka + WA header.
      var kodeEksRow = String(body.kodeEksekusi || body.kode || "").trim();
      if (!kodeEksRow) {
        out = { ok: false, message: "prosesEksekusiRow butuh kodeEksekusi" };
      } else if (typeof prosesEksekusiROW === "function") {
        out = prosesEksekusiROW(kodeEksRow);
        out.action = action;
      } else {
        out = { ok: false, message: "prosesEksekusiROW tidak tersedia" };
      }
    } else if (action === "hitungPointP0Yandal") {
      // YANDAL POINT (bot db_Yandal_P0, Updates): hitung nilai bobot saat Status Approval P0 = Approved,
      // lalu tulis ke kolom Point (AR). Fungsi sendiri menjaga guard internal (status === 'Approved').
      var kodeP0Pt = String(body.kodeP0 || body.kode || "").trim();
      if (!kodeP0Pt) {
        out = { ok: false, message: "hitungPointP0Yandal butuh kodeP0" };
      } else if (typeof hitungPointP0Yandal === "function") {
        out = hitungPointP0Yandal(kodeP0Pt);
        out.action = action;
      } else {
        out = { ok: false, message: "hitungPointP0Yandal tidak tersedia" };
      }
    } else {
      out.message = "Action tidak dikenal: " + action;
    }
  } catch (err) {
    out = { ok: false, message: "Error: " + err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/* ═══ ANTREAN RECALC GABUNGAN ═══ */
var RECALC_QUEUE_SHEET = "db_Recalc_Queue";
var RECALC_MAX_ATTEMPTS = 5;
var RECALC_BATCH = 50;
var RECALC_STALE_MS = 10 * 60 * 1000;

var RQ = {
  jenis: 0,
  key: 1,
  tim: 2,
  tanggal: 3,
  kodeHeader: 4,
  dirtyAt: 5,
  status: 6,
  lastTriedAt: 7,
  attempts: 8,
};
var RECALC_QUEUE_COLS = 9;
var RECALC_QUEUE_HEADER = [
  "jenis",
  "key",
  "tim",
  "tanggal",
  "kodeHeader",
  "dirtyAt",
  "status",
  "lastTriedAt",
  "attempts",
];

function _recalcQueueSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(RECALC_QUEUE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(RECALC_QUEUE_SHEET);
    sh.getRange(1, 1, 1, RECALC_QUEUE_COLS).setValues([RECALC_QUEUE_HEADER]);
    sh.setFrozenRows(1);
    return sh;
  }
  var head = String(sh.getRange(1, 1).getValue() || "").trim();
  if (head !== "jenis") {
    sh.clearContents();
    sh.getRange(1, 1, 1, RECALC_QUEUE_COLS).setValues([RECALC_QUEUE_HEADER]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function _enqueueRecalc_(rec) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return false;
  }
  try {
    var sh = _recalcQueueSheet_();
    var last = sh.getLastRow();
    var now = Date.now();
    if (last >= 2) {
      var data = sh.getRange(2, 1, last - 1, RECALC_QUEUE_COLS).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][RQ.key]).trim() === rec.key) {
          sh.getRange(i + 2, RQ.dirtyAt + 1).setValue(now);
          return true;
        }
      }
    }
    var baris = [];
    baris[RQ.jenis] = rec.jenis;
    baris[RQ.key] = rec.key;
    baris[RQ.tim] = rec.tim || "";
    baris[RQ.tanggal] = rec.tanggal || "";
    baris[RQ.kodeHeader] = rec.kodeHeader || "";
    baris[RQ.dirtyAt] = now;
    baris[RQ.status] = "pending";
    baris[RQ.lastTriedAt] = "";
    baris[RQ.attempts] = 0;
    sh.appendRow(baris);
    return true;
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

function markRecalcRowDirty_(tim, tanggal) {
  tim = String(tim || "").trim();
  tanggal = _normTgl(tanggal || new Date()) || _normTgl(new Date());
  return _enqueueRecalc_({
    jenis: "row",
    key: "row|" + tim + "|" + tanggal,
    tim: tim,
    tanggal: tanggal,
  });
}

function markWaDirty_(kodeHeader) {
  kodeHeader = String(kodeHeader || "").trim();
  if (!kodeHeader) return false;
  return _enqueueRecalc_({
    jenis: "wa",
    key: "wa|" + kodeHeader,
    kodeHeader: kodeHeader,
  });
}

function recalcTick() {
  var sh = _recalcQueueSheet_();
  var claimed = [];
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (e) {
    return;
  }
  try {
    var last = sh.getLastRow();
    if (last < 2) return;
    var data = sh.getRange(2, 1, last - 1, RECALC_QUEUE_COLS).getValues();
    var now = Date.now();
    for (var i = 0; i < data.length && claimed.length < RECALC_BATCH; i++) {
      var st = String(data[i][RQ.status] || "pending").trim();
      var lastTried = Number(data[i][RQ.lastTriedAt] || 0);
      var stale = st === "processing" && now - lastTried > RECALC_STALE_MS;
      if (st === "pending" || stale) {
        sh.getRange(i + 2, RQ.status + 1).setValue("processing");
        sh.getRange(i + 2, RQ.lastTriedAt + 1).setValue(now);
        claimed.push({
          jenis: String(data[i][RQ.jenis] || "row").trim(),
          key: String(data[i][RQ.key]).trim(),
          tim: String(data[i][RQ.tim]).trim(),
          tanggal: String(data[i][RQ.tanggal]).trim(),
          kodeHeader: String(data[i][RQ.kodeHeader]).trim(),
          dirtyAt: Number(data[i][RQ.dirtyAt] || 0),
          attempts: Number(data[i][RQ.attempts] || 0),
        });
      }
    }
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
  if (!claimed.length) return;

  for (var j = 0; j < claimed.length; j++) {
    try {
      if (claimed[j].jenis === "wa") {
        if (typeof recalcWaByHeader === "function" && claimed[j].kodeHeader) {
          recalcWaByHeader(claimed[j].kodeHeader);
          claimed[j].ok = true;
        } else {
          claimed[j].ok = false;
        }
      } else if (claimed[j].jenis === "eksekusiRow") {
        // Rantai bottom-up per Kode Eksekusi (input mobile) — didefer ke sini agar UI tidak menunggu
        var kodeEks = String(claimed[j].key || "").split("|")[1] || "";
        if (typeof prosesEksekusiROW === "function" && kodeEks) {
          prosesEksekusiROW(kodeEks);
          claimed[j].ok = true;
        } else {
          claimed[j].ok = false;
        }
      } else {
        if (typeof recalcEksekusiROW === "function") {
          recalcEksekusiROW(claimed[j].tim || null, null, claimed[j].tanggal);
          claimed[j].ok = true;
        } else {
          claimed[j].ok = false;
        }
      }
    } catch (e) {
      claimed[j].ok = false;
    }
  }

  try {
    lock.waitLock(20000);
  } catch (e) {
    return;
  }
  try {
    var last2 = sh.getLastRow();
    if (last2 < 2) return;
    var data2 = sh.getRange(2, 1, last2 - 1, RECALC_QUEUE_COLS).getValues();
    var byKey = {};
    for (var r = 0; r < data2.length; r++)
      byKey[String(data2[r][RQ.key]).trim()] = { row: r + 2, v: data2[r] };

    var toDelete = [];
    for (var k = 0; k < claimed.length; k++) {
      var c = claimed[k];
      var hit = byKey[c.key];
      if (!hit) continue;
      var curDirty = Number(hit.v[RQ.dirtyAt] || 0);
      if (curDirty > c.dirtyAt) {
        sh.getRange(hit.row, RQ.status + 1).setValue("pending");
      } else if (c.ok) {
        toDelete.push(hit.row);
      } else {
        var att = Number(hit.v[RQ.attempts] || 0) + 1;
        sh.getRange(hit.row, RQ.attempts + 1).setValue(att);
        sh.getRange(hit.row, RQ.status + 1).setValue(
          att >= RECALC_MAX_ATTEMPTS ? "failed" : "pending",
        );
      }
    }
    toDelete.sort(function (a, b) {
      return b - a;
    });
    for (var d = 0; d < toDelete.length; d++) sh.deleteRow(toDelete[d]);
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

function hapusRecalcTrigger() {
  var all = ScriptApp.getProjectTriggers();
  var n = 0;
  for (var i = 0; i < all.length; i++) {
    var fn = all[i].getHandlerFunction();
    if (fn === "recalcTick" || fn === "recalcRowTick") {
      ScriptApp.deleteTrigger(all[i]);
      n++;
    }
  }
  return "Trigger recalc gabungan dihapus: " + n;
}

function recalcRowTick() {
  return recalcTick();
}
function hapusRecalcRowTrigger() {
  return hapusRecalcTrigger();
}

/* ═══ FAST TICK (Rev 19 Agu malam) — SATU trigger 1-menit untuk antrean RINGAN ═══
   Menggantikan trigger terpisah recalcTick + drainAntreanApprovalP0. Setiap trigger 1-menit
   memakan 1 slot eksekusi simultan; dengan banyak trigger serupa, request web app (login,
   approval) kehabisan slot → mobile menampilkan "timeout/jaringan". Konsolidasi ini menekan
   jumlah eksekusi per menit. Antrean BERAT (watermark: drainAntreanP0) SENGAJA tetap terpisah
   agar approval/recalc tidak antre di belakang proses watermark.
   Overlap terkendali: kedua fungsi punya lock internal sendiri — bila tick sebelumnya belum
   selesai, klaim antrean berikutnya hanya menunggu singkat lalu dilewati. */
function fastTick() {
  try {
    if (typeof drainAntreanApprovalP0 === "function") drainAntreanApprovalP0();
  } catch (e) {
    Logger.log("fastTick: antrean approval — " + e);
  }
  try {
    recalcTick();
  } catch (e) {
    Logger.log("fastTick: recalc — " + e);
  }
}

// SETUP sekali (jalankan dari editor): pasang fastTick tiap 1 menit, SEKALIGUS melepas trigger
// lama yang digantikannya (recalcTick / recalcRowTick / drainAntreanApprovalP0).
// Lepas fastTick (mis. ingin kembali ke trigger terpisah — pasang ulang lewat createRecalcTrigger
// + createApprovalDrainTriggerY).
function hapusFastTickTrigger() {
  var trs = ScriptApp.getProjectTriggers(),
    n = 0;
  for (var i = 0; i < trs.length; i++) {
    if (trs[i].getHandlerFunction() === "fastTick") {
      ScriptApp.deleteTrigger(trs[i]);
      n++;
    }
  }
  Logger.log("Trigger fastTick dihapus: " + n);
}

// Ubah interval trigger apa pun dari editor (helper umum).
// Jalankan SEKALI dari editor: drain watermark tiap 1 menit → 5 menit.
// Drain WM memindai 2 sheet penuh tiap run — beban sheet terberat yang tersisa; menurunkannya
// mempercepat SEMUA request lain (login, list, approval) saat jam sibuk. Watermark tetap diproses,
// hanya dengan jeda maks 5 menit (mobile/AppSheet memang tidak menunggu watermark — aman).
/* ═══ BACKSTOP WA ═══ */
var REFRESH_WA_INTERVAL_MIN = 15;

function hapusRefreshWaTrigger() {
  var all = ScriptApp.getProjectTriggers();
  var n = 0;
  for (var i = 0; i < all.length; i++) {
    if (all[i].getHandlerFunction() === "refreshWaHarian") {
      ScriptApp.deleteTrigger(all[i]);
      n++;
    }
  }
  return "Trigger backstop refreshWaHarian dihapus: " + n;
}

/* ═══ SESI ═══ */
function getSesiByToken(token) {
  try {
    if (!token) return null;
    var cache = CacheService.getScriptCache();
    var raw = cache.get("sesi_" + token);
    if (!raw) return null;
    cache.put("sesi_" + token, raw, SESSION_TTL_SEC);
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function doLogout(token) {
  try {
    if (token) CacheService.getScriptCache().remove("sesi_" + token);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/* ═══ LOGIN ═══ */
/* CACHE db_Users (Rev 19 Agu sore) — login adalah request paling sering & paling sensitif
   terhadap cold start Apps Script. Baris db_Users di-cache 10 menit: login tidak lagi
   openById + scan sheet tiap kali (openById = bagian paling lambat). Semua fungsi yang
   menulis db_Users memanggil _bustUsersCache_() (dipasang di tambahAkun, updateAkun,
   hapusAkun, resetPasswordAkun, gantiPassword) agar perubahan akun langsung efektif. */
var USERS_CACHE_KEY = "usersRows_v1";
var USERS_CACHE_TTL = 600; // 10 menit

function _usersRowsCache_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(USERS_CACHE_KEY);
  if (hit) {
    try {
      return JSON.parse(hit);
    } catch (e) {}
  }
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("db_Users");
  if (!sh) return null;
  var data = sh.getDataRange().getValues();
  // Ratakan Date → ISO string agar JSON.stringify aman & konsisten saat dibaca ulang
  var plain = data.map(function (r) {
    return r.map(function (c) {
      return c instanceof Date ? c.toISOString() : c;
    });
  });
  try {
    cache.put(USERS_CACHE_KEY, JSON.stringify(plain), USERS_CACHE_TTL);
  } catch (e) {}
  return plain;
}

function _bustUsersCache_() {
  try {
    CacheService.getScriptCache().remove(USERS_CACHE_KEY);
  } catch (e) {}
}

function doLogin(username, password) {
  try {
    if (!username || !password)
      return { success: false, message: "Username dan password wajib diisi" };

    var data = _usersRowsCache_(); // cache 10 mnt — tanpa openById + scan tiap login
    if (!data)
      return { success: false, message: "Sheet db_Users tidak ditemukan" };
    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      var eml = String(r[COL_USERS.email] || "").trim();
      var uNm = String(r[COL_USERS.userName] || "").trim();
      var uPw = String(r[COL_USERS.password] || "").trim();
      var role = String(r[COL_USERS.role] || "").trim();
      var ulp = String(r[COL_USERS.ulp] || "").trim();
      var kodeUlp = String(r[COL_USERS.kodeUlp] || "").trim();
      var bidang = String(r[COL_USERS.bidang] || "").trim();
      var tim = String(r[COL_USERS.tim] || "").trim();
      var subTim = String(r[COL_USERS.subTim] || "").trim();
      var aksesMenu = String(r[COL_USERS.aksesMenu] || "").trim();

      if (uNm.toLowerCase() !== username.toLowerCase()) continue;

      /* Verifikasi terpadu (29 Agu 2026): throttle + dual-read hash/plaintext +
         upgrade hash otomatis. Sebelumnya `if (uPw !== password)` — membandingkan
         password tersimpan apa adanya (plaintext) dan tanpa pembatasan percobaan,
         sehingga kredensial yang bocor bisa diuji berulang tanpa henti. */
      var v = verifikasiLogin_(uNm, password);
      if (!v.boleh)
        return { success: false, message: v.pesan };

      var token = Utilities.getUuid();
      var sesi = {
        token: token,
        username: uNm,
        email: eml,
        role: role,
        ulp: ulp,
        kodeUlp: kodeUlp,
        bidang: bidang,
        tim: tim,
        subTim: subTim,
        aksesMenu: aksesMenu,
        loginAt: new Date().toISOString(),
      };

      CacheService.getScriptCache().put(
        "sesi_" + token,
        JSON.stringify(sesi),
        SESSION_TTL_SEC,
      );
      /* Tanpa getUserCache(). Lihat catatan K1 di doGet(). */

      return {
        success: true,
        token: token,
        username: uNm,
        email: eml,
        role: role,
        ulp: ulp,
        kodeUlp: kodeUlp,
        bidang: bidang,
        tim: tim,
        subTim: subTim,
        aksesMenu: aksesMenu,
      };
    }
    return { success: false, message: "Username tidak ditemukan" };
  } catch (e) {
    return { success: false, message: "Error: " + e.message };
  }
}

/* ═══ HALAMAN KONTEN ═══ */
function getPageContent(token, pageName) {
  try {
    if (!token)
      return {
        success: false,
        message: "Token tidak ditemukan",
        redirect: "login",
      };
    var sesi = getSesiByToken(token);
    if (!sesi)
      return {
        success: false,
        message: "Sesi habis, silakan login ulang",
        redirect: "login",
      };
    if (!_bolehAksesMenu(sesi, pageName))
      return {
        success: false,
        message: "Akses ditolak",
        redirect: "forbidden",
      };

    var fileName = PAGE_FILE_ALIASES[pageName] || pageName;
    var html = HtmlService.createHtmlOutputFromFile(fileName).getContent();
    return {
      success: true,
      html: html,
      sesi: {
        /* token ikut dikirim supaya halaman bisa mengirimnya balik ke setiap
           panggilan server. Dulu halaman memakai getSessionUser() yang membaca
           getUserCache() bersama — lihat catatan K1 di doGet(). */
        token: token,
        username: sesi.username,
        email: sesi.email,
        role: sesi.role,
        ulp: sesi.ulp,
        kodeUlp: sesi.kodeUlp,
        bidang: sesi.bidang,
        tim: sesi.tim,
        subTim: sesi.subTim || "",
        aksesMenu: sesi.aksesMenu || "",
      },
    };
  } catch (e) {
    return { success: false, message: "Halaman tidak ditemukan: " + e.message };
  }
}

function _pagesByBidang(bidang) {
  switch (String(bidang || "").trim()) {
    case "Teknik":
      return FULL_ACCESS_PAGES;
    case "PP":
      return PP_PAGES;
    case "TE":
      return TE_PAGES;
    case "K3":
      return K3_PAGES;
    default:
      return [];
  }
}

var TIM_PAGE_MAP = {
  "Inspeksi Jaringan": "Tek-InsJar",
  "Inspeksi Gardu": "Tek-InsDu",
  ROW: "Tek-ROW",
  Yantek: "Tek-Yandal",
  Hartek: "Tek-Hartek",
  Gangguan: "Tek-Gangguan",
};

function _parseAksesMenu(v) {
  return String(v || "")
    .split(",")
    .map(function (s) {
      return s.trim();
    })
    .filter(function (s) {
      return s;
    });
}

function _bolehAksesMenu(sesi, page) {
  if (!page) return false;
  var role = String((sesi && sesi.role) || "").trim();
  if (role === "Super User") return true;
  var akses = _parseAksesMenu(sesi && sesi.aksesMenu);
  if (akses.indexOf(page) >= 0) return true;
  var parent = PAGE_ACCESS_PARENT[page] || "";
  return !!parent && akses.indexOf(parent) >= 0;
}

function _saranAksesMenu(role, bidang, tim) {
  role = String(role || "").trim();
  bidang = String(bidang || "").trim();
  tim = String(tim || "").trim();
  /* Normalisasi 29 Agu 2026: "Super User" / "super user" / "superuser" setara.
     Ini hanya SARAN isian kolom Akses Menu saat akun dibuat/diedit — bukan
     penegakan akses. Penegakan ada di _bolehAksesMenu() dan guard_(). */
  var roleN = typeof _normRole_ === "function" ? _normRole_(role) : role;
  if (roleN === "SUPER" || roleN === "ADMIN")
    return FULL_ACCESS_PAGES.concat(PP_PAGES, TE_PAGES, K3_PAGES);
  if (TIM_PAGE_MAP[tim]) return [TIM_PAGE_MAP[tim]];
  if (role === "Team Leader" || role === "Staff" || role === "Admin ES")
    return _pagesByBidang(bidang);
  if (role === "Teknik" || role === "Operator") return FULL_ACCESS_PAGES;
  switch (role) {
    case "PP":
      return PP_PAGES;
    case "TE":
      return TE_PAGES;
    case "K3":
      return K3_PAGES;
    default:
      return [];
  }
}

/* ═══ PENGATURAN AKSES AKUN (khusus Super User) ═══ */
function _akunSheet() {
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("db_Users");
  if (!sh) throw new Error("Sheet db_Users tidak ditemukan");
  return sh;
}

/* Diperbaiki 29 Agu 2026 (K13): peran dibandingkan lewat _normRole_ supaya
   "Super User", "super user", dan "superuser" setara. Sebelumnya perbandingan
   exact-match, sehingga variasi penulisan di db_Users bisa membuat Super User
   gagal masuk atau — lebih buruk — membuat modul lain menerima "admin" sebagai
   Super User. Daftar peran yang berhak ada di PERAN_SUPER_USER (Guard.js). */
function _assertSuperUser(token) {
  var sesi = getSesiByToken(token);
  if (!sesi) throw new Error("Sesi habis, silakan login ulang.");

  var roleAsli = String(sesi.role || "").trim();
  var role = typeof _normRole_ === "function" ? _normRole_(roleAsli) : roleAsli;

  var boleh = false;
  var daftar =
    typeof PERAN_SUPER_USER !== "undefined" && PERAN_SUPER_USER.length
      ? PERAN_SUPER_USER
      : ["SUPER"];
  for (var i = 0; i < daftar.length; i++) {
    if (_normRole_(daftar[i]) === role) {
      boleh = true;
      break;
    }
  }
  if (!boleh) throw new Error("Akses ditolak: menu ini khusus Super User.");
  return sesi;
}

function _findRowAkun(sh, username) {
  var data = sh.getDataRange().getValues();
  var target = String(username || "")
    .trim()
    .toLowerCase();
  for (var i = 1; i < data.length; i++) {
    if (
      String(data[i][COL_USERS.userName] || "")
        .trim()
        .toLowerCase() === target
    )
      return i + 1;
  }
  return -1;
}

function getMenuOptions(token) {
  _assertSuperUser(token);
  return [
    { key: "PP-Dashboard", label: "Dashboard PP" },
    { key: "Tek-Dashboard", label: "Dashboard Teknik" },
    { key: "Tek-ROW", label: "Tim ROW" },
    { key: "Tek-InsDu", label: "Inspeksi Gardu" },
    { key: "Tek-PengukuranGardu", label: "Pengukuran Gardu" },
    { key: "Tek-InsJar", label: "Inspeksi Jaringan" },
    { key: "Temuan-Inspeksi", label: "Temuan Inspeksi" },
    { key: "Tek-Yandal", label: "Tim Yandal" },
    { key: "Tek-Hartek", label: "Tim Hartek" },
    { key: "Tek-Gangguan", label: "Gangguan Penyulang" },
    { key: "SIE-Teknik", label: "SIE Teknik" },
    { key: "TE-Dashboard", label: "Dashboard TE" },
    { key: "K3-Dashboard", label: "Dashboard K3" },
  ];
}

function getDaftarAkun(token) {
  _assertSuperUser(token);
  var sh = _akunSheet();
  var data = sh.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!String(r[COL_USERS.userName] || "").trim()) continue;
    rows.push({
      no: r[COL_USERS.no],
      email: String(r[COL_USERS.email] || "").trim(),
      username: String(r[COL_USERS.userName] || "").trim(),
      role: String(r[COL_USERS.role] || "").trim(),
      ulp: String(r[COL_USERS.ulp] || "").trim(),
      kodeUlp: String(r[COL_USERS.kodeUlp] || "").trim(),
      bidang: String(r[COL_USERS.bidang] || "").trim(),
      tim: String(r[COL_USERS.tim] || "").trim(),
      subTim: String(r[COL_USERS.subTim] || "").trim(),
      aksesMenu: _parseAksesMenu(r[COL_USERS.aksesMenu]),
    });
  }
  return { ok: true, rows: rows };
}

function tambahAkun(token, data) {
  _assertSuperUser(token);
  data = data || {};
  var sh = _akunSheet();
  var uname = String(data.username || "").trim();
  if (!uname) return { ok: false, message: "Username wajib diisi." };
  if (!String(data.password || "").trim())
    return { ok: false, message: "Password wajib diisi." };
  if (_findRowAkun(sh, uname) !== -1)
    return { ok: false, message: "Username sudah dipakai." };

  var akses = Array.isArray(data.aksesMenu)
    ? data.aksesMenu.join(", ")
    : String(data.aksesMenu || "");
  var baris = [];
  baris[COL_USERS.no] = sh.getLastRow();
  baris[COL_USERS.email] = String(data.email || "").trim();
  baris[COL_USERS.userName] = uname;
  /* Disimpan sebagai hash, bukan plaintext. Kolom tetap sama — hanya isinya.
     Kalau Guard.js belum terpasang, jatuh ke plaintext (masa transisi) agar
     akun tetap bisa dibuat; login akan meng-hash-nya saat pertama dipakai. */
  baris[COL_USERS.password] =
    typeof _hashPw_ === "function"
      ? _hashPw_(String(data.password || "").trim(), _saltBaru_())
      : String(data.password || "").trim();
  baris[COL_USERS.role] = String(data.role || "").trim();
  baris[COL_USERS.ulp] = String(data.ulp || "").trim();
  baris[COL_USERS.kodeUlp] = String(data.kodeUlp || "").trim();
  baris[COL_USERS.bidang] = String(data.bidang || "").trim();
  baris[COL_USERS.tim] = String(data.tim || "").trim();
  baris[COL_USERS.subTim] = String(data.subTim || "").trim();
  baris[COL_USERS.aksesMenu] = akses;
  sh.appendRow(baris);
  SpreadsheetApp.flush();
  _bustUsersCache_(); // perubahan akun langsung terlihat login
  return { ok: true };
}

function updateAkun(token, data) {
  _assertSuperUser(token);
  data = data || {};
  var sh = _akunSheet();
  var target = String(data.targetUsername || data.username || "").trim();
  var row = _findRowAkun(sh, target);
  if (row === -1)
    return { ok: false, message: "Akun tidak ditemukan: " + target };

  var unameBaru = String(data.username || "").trim() || target;
  if (
    unameBaru.toLowerCase() !== target.toLowerCase() &&
    _findRowAkun(sh, unameBaru) !== -1
  )
    return { ok: false, message: "Username baru sudah dipakai." };

  sh.getRange(row, COL_USERS.userName + 1).setValue(unameBaru);
  if (data.email != null)
    sh.getRange(row, COL_USERS.email + 1).setValue(String(data.email).trim());
  if (data.role != null)
    sh.getRange(row, COL_USERS.role + 1).setValue(String(data.role).trim());
  if (data.ulp != null)
    sh.getRange(row, COL_USERS.ulp + 1).setValue(String(data.ulp).trim());
  if (data.kodeUlp != null)
    sh.getRange(row, COL_USERS.kodeUlp + 1).setValue(
      String(data.kodeUlp).trim(),
    );
  if (data.bidang != null)
    sh.getRange(row, COL_USERS.bidang + 1).setValue(String(data.bidang).trim());
  if (data.tim != null)
    sh.getRange(row, COL_USERS.tim + 1).setValue(String(data.tim).trim());
  if (data.subTim != null)
    sh.getRange(row, COL_USERS.subTim + 1).setValue(String(data.subTim).trim());
  if (data.aksesMenu != null)
    sh.getRange(row, COL_USERS.aksesMenu + 1).setValue(
      Array.isArray(data.aksesMenu)
        ? data.aksesMenu.join(", ")
        : String(data.aksesMenu),
    );
  if (data.password != null && String(data.password).trim())
    sh.getRange(row, COL_USERS.password + 1).setValue(
      typeof _hashPw_ === "function"
        ? _hashPw_(String(data.password).trim(), _saltBaru_())
        : String(data.password).trim(),
    );
  SpreadsheetApp.flush();
  _bustUsersCache_(); // perubahan akun langsung terlihat login
  return { ok: true };
}

function hapusAkun(token, username) {
  var sesi = _assertSuperUser(token);
  var sh = _akunSheet();
  var target = String(username || "").trim();
  if (
    target.toLowerCase() ===
    String(sesi.username || "")
      .trim()
      .toLowerCase()
  )
    return {
      ok: false,
      message: "Tidak dapat menghapus akun yang sedang login.",
    };
  var row = _findRowAkun(sh, target);
  if (row === -1)
    return { ok: false, message: "Akun tidak ditemukan: " + target };
  sh.deleteRow(row);
  SpreadsheetApp.flush();
  _bustUsersCache_(); // perubahan akun langsung terlihat login
  return { ok: true };
}

function resetPasswordAkun(token, username, passwordBaru) {
  _assertSuperUser(token);
  var sh = _akunSheet();
  var row = _findRowAkun(sh, String(username || "").trim());
  if (row === -1) return { ok: false, message: "Akun tidak ditemukan." };
  if (!String(passwordBaru || "").trim())
    return { ok: false, message: "Password baru wajib diisi." };
  var pwBaru = String(passwordBaru).trim();
  sh.getRange(row, COL_USERS.password + 1).setValue(
    typeof _hashPw_ === "function"
      ? _hashPw_(pwBaru, _saltBaru_())
      : pwBaru,
  );
  SpreadsheetApp.flush();
  /* Buka kunci throttle: password sudah diganti, percobaan gagal yang lalu
     bukan lagi indikasi serangan terhadap kredensial yang sekarang. */
  if (typeof loginThrottleReset_ === "function") loginThrottleReset_(username);
  _bustUsersCache_(); // perubahan akun langsung terlihat login
  return { ok: true };
}

function gantiPassword(token, passwordLama, passwordBaru) {
  try {
    var sesi = getSesiByToken(token);
    if (!sesi)
      return { ok: false, message: "Sesi habis, silakan login ulang." };

    var pwLama = String(passwordLama || "").trim();
    var pwBaru = String(passwordBaru || "").trim();
    if (!pwLama || !pwBaru)
      return { ok: false, message: "Password lama dan baru wajib diisi." };
    if (pwBaru.length < 4)
      return { ok: false, message: "Password baru minimal 4 karakter." };
    if (pwBaru === pwLama)
      return {
        ok: false,
        message: "Password baru tidak boleh sama dengan password lama.",
      };

    var sh = _akunSheet();
    var row = _findRowAkun(sh, String(sesi.username || "").trim());
    if (row === -1) return { ok: false, message: "Akun tidak ditemukan." };

    var pwTersimpan = String(
      sh.getRange(row, COL_USERS.password + 1).getValue() || "",
    ).trim();
    /* Dual-read: nilai bisa berupa hash (sisi1$...) atau plaintext lawas. */
    var cocok =
      typeof _verifyPw_ === "function"
        ? _verifyPw_(pwTersimpan, pwLama)
        : pwTersimpan === pwLama;
    if (!cocok) return { ok: false, message: "Password lama salah." };

    sh.getRange(row, COL_USERS.password + 1).setValue(
      typeof _hashPw_ === "function" ? _hashPw_(pwBaru, _saltBaru_()) : pwBaru,
    );
    SpreadsheetApp.flush();
    _bustUsersCache_(); // perubahan akun langsung terlihat login
    return { ok: true, message: "Password berhasil diganti." };
  } catch (e) {
    return { ok: false, message: "Error: " + e.message };
  }
}

/* ═══ LAPORAN HARIAN (db_Global_Header) ═══ */
function getMobileLaporanHarian(token, subTim, tim, tanggal, limit) {
  try {
    /* Skop ULP (29 Agu 2026). Sebelumnya tidak ada filter ULP sama sekali:
       siapa pun yang login menerima seluruh header dari SEMUA ULP, lengkap
       dengan kendala, waText, koordinat awal/akhir, dan inputBy — padahal
       kolom ULP (r[2]) tersedia untuk menyaringnya. */
    var g = guard_(arguments, { ulp: true, aksi: "getMobileLaporanHarian" });

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    // Cari sheet db_Global_Header secara fleksibel (case-insensitive & trim)
    var sh = ss.getSheetByName("db_Global_Header");
    if (!sh) {
      var allSheets = ss.getSheets();
      for (var s = 0; s < allSheets.length; s++) {
        var sName = allSheets[s].getName().trim().toLowerCase();
        if (
          sName === "db_global_header" ||
          sName === "global_header" ||
          sName === "db_header"
        ) {
          sh = allSheets[s];
          break;
        }
      }
    }

    if (!sh) {
      var sheetNames = ss
        .getSheets()
        .map(function (s) {
          return s.getName();
        })
        .join(", ");
      return {
        success: false,
        message:
          "Sheet db_Global_Header tidak ditemukan. Sheet yang ada: " +
          sheetNames,
      };
    }

    var lastRow = sh.getLastRow();
    if (lastRow < 2) return { success: true, data: [] };

    var rawData = sh.getRange(2, 1, lastRow - 1, 17).getValues();
    var filterSubTim = String(subTim || "")
      .trim()
      .toLowerCase();
    var filterTim = String(tim || "")
      .trim()
      .toLowerCase();
    var filterTgl = String(tanggal || "").trim();
    var maxLimit = Number(limit) || 100;

    var hasil = [];

    // Baca dari baris terbaru (bawah ke atas)
    for (var i = rawData.length - 1; i >= 0; i--) {
      var r = rawData[i];
      var rKodeHeader = String(r[1] || "").trim();
      if (!rKodeHeader) continue;

      var rUlp = String(r[2] || "").trim();
      /* Hanya Super User yang melihat ULP lain. Admin terikat ULP sendiri. */
      if (!barisUlpCocok_(g, rUlp)) continue;

      var rHari = String(r[3] || "").trim();
      var rTanggal = _normTgl(r[4]);
      var rTim = String(r[5] || "").trim();
      var rSubTim = String(r[6] || "").trim();
      var rKoorAwal = String(r[7] || "").trim();
      var rKoorAkhir = String(r[8] || "").trim();
      var rKmAwal = String(r[9] || "").trim();
      var rKmAkhir = String(r[10] || "").trim();
      var rKendala = String(r[11] || "").trim();
      var rWaText = String(r[12] || "").trim();
      var rTimestamp = String(r[13] || "").trim();
      var rInputBy = String(r[14] || "").trim();
      var rTglUpdate = String(r[15] || "").trim();
      var rStatusWa = String(r[16] || "").trim();

      // Filter berdasarkan subTim jika diberikan
      if (filterSubTim && rSubTim.toLowerCase() !== filterSubTim) continue;

      // Filter berdasarkan tim jika diberikan
      if (filterTim && rTim.toLowerCase() !== filterTim) continue;

      // Filter berdasarkan tanggal jika diberikan
      if (filterTgl && rTanggal !== filterTgl) continue;

      hasil.push({
        no: r[0],
        kodeHeader: rKodeHeader,
        ulp: rUlp,
        hari: rHari,
        tanggal: rTanggal,
        tim: rTim,
        subTim: rSubTim,
        koordinatAwal: rKoorAwal,
        koordinatAkhir: rKoorAkhir,
        kmAwal: rKmAwal,
        kmAkhir: rKmAkhir,
        kendala: rKendala,
        waText: rWaText,
        timestamp: rTimestamp,
        inputBy: rInputBy,
        timestampUpdate: rTglUpdate,
        statusTextWa: rStatusWa,
      });

      if (hasil.length >= maxLimit) break;
    }

    return { success: true, count: hasil.length, data: hasil };
  } catch (err) {
    return {
      success: false,
      message: "Error getMobileLaporanHarian: " + err.message,
    };
  }
}

/* ═══ MODUL ROW: DROPDOWN & EKSEKUSI (MOBILE LAYER) ═══ */

/* CACHE dropdown penyulang + DUAL-READ (Rev 21 Agu 2026):
   db_Penyulang kini dibaca dari 2 DB — spreadsheet AKTIF + ARSIP (pola Tek-Migrasi:
   TULIS hanya ke AKTIF, BACA dari keduanya). Hasil gabungan di-cache 10 menit karena
   dual-read menambah 1 openById (file ARSIP) — form Eksekusi ROW & kartu Sinkron Data
   tetap seketika. Dedup mengikuti pasangan (Nama Penyulang, Section): pasangan yang sama
   di kedua file hanya dihitung sekali (AKTIF dibaca lebih dulu).
   Bila db_Penyulang di ARSIP tidak ada / kosong → otomatis dilewati (hasil = AKTIF saja).
   Bila sheet master baru saja diedit & perlu efek segera: jalankan bustCacheDropdownPenyulang()
   sekali dari editor. */
var DROPDOWN_PENY_CACHE_KEY = "dropdownPenyulang_v2";
var DROPDOWN_PENY_CACHE_TTL = 600; // 10 menit (selaras cache db_Users)

function bustCacheDropdownPenyulang() {
  try {
    CacheService.getScriptCache().remove(DROPDOWN_PENY_CACHE_KEY);
  } catch (e) {}
}

/**
 * Mengambil list Penyulang dan pemetaan Section untuk form input ROW di mobile.
 * DUAL-READ (AKTIF + ARSIP) — 21 Agu 2026. Respons: { success, penyulang, sectionByPenyulang }.
 */
function getMobileDropdownRow(token) {
  try {
    var sesi = getSesiByToken(token);
    if (!sesi)
      return { success: false, message: "Sesi habis, silakan login ulang." };

    // Cache dulu: hasil GABUNGAN AKTIF+ARSIP (bukan per-file) agar konsisten.
    var cache = CacheService.getScriptCache();
    var hit = cache.get(DROPDOWN_PENY_CACHE_KEY);
    if (hit) {
      try {
        var cached = JSON.parse(hit);
        cached.success = true;
        return cached;
      } catch (eCache) {}
    }

    var penyulangSet = {};
    var sectionMap = {};

    // Sumber bacaan: AKTIF dulu, lalu ARSIP (bila konstanta Tek-Migrasi tersedia).
    var sumber = [SPREADSHEET_ID];
    if (typeof SPREADSHEET_ID_ARSIP !== "undefined" && SPREADSHEET_ID_ARSIP) {
      sumber.push(SPREADSHEET_ID_ARSIP);
    }

    for (var s = 0; s < sumber.length; s++) {
      var shP = null;
      try {
        shP = SpreadsheetApp.openById(sumber[s]).getSheetByName("db_Penyulang");
      } catch (eBuka) {
        Logger.log(
          "getMobileDropdownRow: buka db_Penyulang gagal (sumber " +
            s +
            ") — " +
            eBuka,
        );
      }
      if (!shP || shP.getLastRow() < 2) continue; // arsip tanpa db_Penyulang → lewati

      var data = shP.getRange(2, 1, shP.getLastRow() - 1, 6).getValues();
      for (var i = 0; i < data.length; i++) {
        var peny = String(data[i][2] || "").trim(); // Kolom C = Nama Penyulang
        var sec = String(data[i][4] || "").trim(); // Kolom E = Section
        if (!peny) continue;

        if (!penyulangSet[peny]) {
          penyulangSet[peny] = true;
          sectionMap[peny] = [];
        }
        // Dedup section per penyulang — pasangan (peny, sec) yang sudah ada
        // (termasuk yang dibawa dari file sebelumnya) tidak ditambah dua kali.
        if (sec && sectionMap[peny].indexOf(sec) === -1) {
          sectionMap[peny].push(sec);
        }
      }
    }

    var listPenyulang = Object.keys(penyulangSet).sort();
    listPenyulang.forEach(function (p) {
      sectionMap[p].sort();
    });

    var out = {
      penyulang: listPenyulang,
      sectionByPenyulang: sectionMap,
    };
    try {
      cache.put(
        DROPDOWN_PENY_CACHE_KEY,
        JSON.stringify(out),
        DROPDOWN_PENY_CACHE_TTL,
      );
    } catch (eSimpan) {}
    out.success = true;
    return out;
  } catch (err) {
    return {
      success: false,
      message: "Error getMobileDropdownRow: " + err.message,
    };
  }
}

/**
 * Mengambil list data eksekusi ROW terfilter per Sub-Tim dan Tanggal
 */
function getMobileEksekusiRow(token, subTim, tim, tanggal, limit) {
  try {
    /* Skop ULP (29 Agu 2026). Sebelumnya tidak ada filter ULP sama sekali —
       pengguna ULP mana pun menerima seluruh baris db_ROW_Eksekusi dari semua
       ULP, termasuk koordinat tiang dan seluruh URL foto. */
    var g = guard_(arguments, { ulp: true, aksi: "getMobileEksekusiRow" });

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("db_ROW_Eksekusi");
    if (!sh || sh.getLastRow() < 2) return { success: true, data: [] };

    var lastRow = sh.getLastRow();
    var rawData = sh.getRange(2, 1, lastRow - 1, 30).getValues();

    var filterSubTim = String(subTim || "")
      .trim()
      .toLowerCase();
    var filterTim = String(tim || "")
      .trim()
      .toLowerCase();
    var filterTgl = String(tanggal || "").trim();
    var maxLimit = Number(limit) || 100;

    var hasil = [];

    // Baca dari data terbaru (bawah ke atas)
    for (var i = rawData.length - 1; i >= 0; i--) {
      var r = rawData[i];
      var kodeEksekusi = String(r[3] || "").trim();
      var noTiang = String(r[10] || "").trim();
      if (!kodeEksekusi && !noTiang) continue;

      /* r[4] = kolom ULP. Hanya Super User yang melihat ULP lain. */
      if (!barisUlpCocok_(g, r[4])) continue;

      var rTanggal = _normTgl(r[6]);
      var rTim = String(r[7] || "").trim(); // Kolom Tim / Sub-Tim

      if (filterSubTim && rTim.toLowerCase() !== filterSubTim) continue;
      if (filterTim && rTim.toLowerCase() !== filterTim) continue;
      if (filterTgl && rTanggal !== filterTgl) continue;

      hasil.push({
        no: r[0],
        kodeHeader: String(r[1] || "").trim(),
        kodePekerjaan: String(r[2] || "").trim(),
        kodeEksekusi: kodeEksekusi,
        ulp: String(r[4] || "").trim(),
        hari: String(r[5] || "").trim(),
        tanggal: rTanggal,
        tim: rTim,
        penyulang: String(r[8] || "").trim(),
        section: String(r[9] || "").trim(),
        nomorTiang: noTiang,
        koordinatTiang: String(r[11] || "").trim(),
        latTiang: r[12],
        longTiang: r[13],
        koordinatPekerjaan: String(r[14] || "").trim(),
        latPekerjaan: r[15],
        longPekerjaan: r[16],
        fotoSebelum: String(r[17] || "").trim(),
        fotoSebelumUrl: String(r[18] || "").trim(),
        fotoPekerjaan: String(r[19] || "").trim(),
        fotoPekerjaanUrl: String(r[20] || "").trim(),
        fotoSesudah: String(r[21] || "").trim(),
        fotoSesudahUrl: String(r[22] || "").trim(),
        diameter: Number(r[23]) || 0,
        jenisPekerjaan: String(r[24] || "").trim(),
        tampilFotoSebelum: r[25],
        tampilFotoPekerjaan: r[26],
        tampilFotoSesudah: r[27],
        inputOleh: String(r[28] || "").trim(),
        timestamp:
          r[29] instanceof Date
            ? Utilities.formatDate(r[29], "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss")
            : String(r[29] || ""),
      });

      if (hasil.length >= maxLimit) break;
    }

    return { success: true, count: hasil.length, data: hasil };
  } catch (err) {
    return {
      success: false,
      message: "Error getMobileEksekusiRow: " + err.message,
    };
  }
}

/**
 * Menyimpan data Eksekusi Pekerjaan ROW baru sesuai 18 spesifikasi mobile
 */
function simpanMobileEksekusiRow(payload) {
  try {
    payload = payload || {};
    var token = String(payload.token || "").trim();
    var sesi = getSesiByToken(token);
    if (!sesi)
      return { success: false, message: "Sesi habis, silakan login ulang." };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("db_ROW_Eksekusi");
    if (!sh)
      return {
        success: false,
        message: "Sheet db_ROW_Eksekusi tidak ditemukan.",
      };

    var now = new Date();
    var tz = Session.getScriptTimeZone();

    // 1. Kode Eksekusi: Unique code seperti UNIQUEID() AppSheet (8 char acak)
    var uniqueKode = Utilities.getUuid()
      .replace(/-/g, "")
      .substring(0, 8)
      .toUpperCase();

    // 2. ULP dari sesi login
    var ulp = String(sesi.ulp || "").trim();

    // 4. Tanggal: Today() (yyyy-MM-dd)
    var tglObj = new Date();
    var tglStr = Utilities.formatDate(tglObj, tz, "yyyy-MM-dd");

    // 3. Hari: index dari tanggal
    var hariList = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    var hari = hariList[tglObj.getDay()];

    // 5. Tim dari subTim login
    var tim = String(sesi.subTim || sesi.tim || "ROW").trim();

    // 6 & 7. Penyulang & Section
    var penyulang = String(payload.penyulang || "").trim();
    var section = String(payload.section || "").trim();
    var nomorTiang = String(payload.nomorTiang || "").trim();

    // 8, 9, 10. Koordinat Tiang (lat,long) & pemisahan Lat Tiang & Long Tiang
    var koorTiang = String(payload.koordinatTiang || "").trim();
    var latTiang = "";
    var longTiang = "";
    if (koorTiang && koorTiang.indexOf(",") >= 0) {
      var splitTiang = koorTiang.split(",");
      latTiang = parseFloat(splitTiang[0].trim()) || "";
      longTiang = parseFloat(splitTiang[1].trim()) || "";
    }

    // 11, 12, 13. Koordinat Pekerjaan (lat,long) & pemisahan Lat & Long Pekerjaan
    var koorPek = String(payload.koordinatPekerjaan || "").trim() || koorTiang;
    var latPek = "";
    var longPek = "";
    if (koorPek && koorPek.indexOf(",") >= 0) {
      var splitPek = koorPek.split(",");
      latPek = parseFloat(splitPek[0].trim()) || "";
      longPek = parseFloat(splitPek[1].trim()) || "";
    }

    // 15. Diameter: format num
    var diameter = Number(payload.diameter) || 0;

    // 16. Jenis Pekerjaan: IFS(diameter=0, "Rabas / Pangkas", diameter<=50, "Tebang Sedang", "Tebang Besar")
    var jenisPekerjaan = "Rabas / Pangkas";
    if (diameter > 50) {
      jenisPekerjaan = "Tebang Besar";
    } else if (diameter > 0) {
      jenisPekerjaan = "Tebang Sedang";
    }

    // 17. Input Oleh dari username sesi
    var inputOleh = String(sesi.username || "").trim();

    // 18. Timestamp input
    var timestamp = now;

    // 14. Upload Foto: Kamera / Galeri (Base64) - Pola Hierarki Folder & Format Nama AppSheet
    var fSbl = { nama: "", url: "" };
    var fPkj = { nama: "", url: "" };
    var fSsd = { nama: "", url: "" };

    var folderUpload = null;
    var relativeFolderPath = "";

    function _getFolderRow_() {
      if (!folderUpload) {
        var baseFolderNama = "AppSheet SiSi - ULP Toboali";

        // Format bulan: "08. Agustus"
        var bulanList = [
          "Januari",
          "Februari",
          "Maret",
          "April",
          "Mei",
          "Juni",
          "Juli",
          "Agustus",
          "September",
          "Oktober",
          "November",
          "Desember",
        ];
        var blnIndex = tglObj.getMonth();
        var blnStr =
          ("0" + (blnIndex + 1)).slice(-2) + ". " + bulanList[blnIndex];
        var tglHari = String(tglObj.getDate());
        var tahunStr = String(tglObj.getFullYear());

        // CACHE folder induk harian per tim (Rev 19 Agu siang): folder
        // "…/Eksekusi ROW/{Tahun}/{Bulan}/{Tgl}/{Tim}" stabil sepanjang hari → id-nya di-cache 6 jam,
        // hemat ~6 round-trip Drive per input. Folder per kode (unik) tetap dibuat baru di bawahnya.
        var cache = CacheService.getScriptCache();
        var ckey = "rowFld_" + tglStr + "_" + tim;
        var parentFolder = null;
        var cid = cache.get(ckey);
        if (cid) {
          try {
            parentFolder = DriveApp.getFolderById(cid);
          } catch (eC) {}
        }
        if (!parentFolder) {
          var rootFolders = DriveApp.getFoldersByName(baseFolderNama);
          var curFolder = rootFolders.hasNext()
            ? rootFolders.next()
            : DriveApp.createFolder(baseFolderNama);
          var parentPath = ["Eksekusi ROW", tahunStr, blnStr, tglHari, tim];
          for (var p = 0; p < parentPath.length; p++) {
            var subName = parentPath[p];
            var subs = curFolder.getFoldersByName(subName);
            curFolder = subs.hasNext()
              ? subs.next()
              : curFolder.createFolder(subName);
          }
          parentFolder = curFolder;
          try {
            cache.put(ckey, parentFolder.getId(), 21600);
          } catch (eP) {}
        }

        // Path hierarki: AppSheet SiSi - ULP Toboali / Eksekusi ROW / {Tahun} / {Bulan} / {Tgl} / {Tim} / {uniqueKode}
        relativeFolderPath =
          baseFolderNama +
          "/Eksekusi ROW/" +
          tahunStr +
          "/" +
          blnStr +
          "/" +
          tglHari +
          "/" +
          tim +
          "/" +
          uniqueKode;
        var subsKode = parentFolder.getFoldersByName(uniqueKode);
        folderUpload = subsKode.hasNext()
          ? subsKode.next()
          : parentFolder.createFolder(uniqueKode);
      }
      return folderUpload;
    }

    function _simpanFotoBase64_(base64Str, tagTipe) {
      if (!base64Str || base64Str.trim().length < 50)
        return { nama: "", url: "" };
      try {
        var rawData = base64Str;
        var mimeType = "image/jpeg";
        if (rawData.indexOf(";base64,") >= 0) {
          var parts = rawData.split(";base64,");
          mimeType = parts[0].replace("data:", "");
          rawData = parts[1];
        }
        var decoded = Utilities.base64Decode(rawData);

        // Timestamp format jam: HHmmss (misal: 100508)
        var jamStr = Utilities.formatDate(now, "Asia/Jakarta", "HHmmss");
        // Format Nama AppSheet: {uniqueKode}.{tagTipe}.{HHmmss}.jpg (misal: e3bc4ff3.Foto Sebelum.100508.jpg)
        var fileNameOnly = uniqueKode + "." + tagTipe + "." + jamStr + ".jpg";

        var targetFolder = _getFolderRow_();
        var blob = Utilities.newBlob(decoded, mimeType, fileNameOnly);
        var file = targetFolder.createFile(blob);
        file.setSharing(
          DriveApp.Access.ANYONE_WITH_LINK,
          DriveApp.Permission.VIEW,
        );

        // Relative path lengkap seperti format AppSheet:
        var relativeFilePath = relativeFolderPath + "/" + fileNameOnly;
        // Direct stream URL Google Drive (cepat untuk Flutter & tidak pernah expired):
        var directViewUrl =
          "https://lh3.googleusercontent.com/d/" + file.getId();

        return {
          nama: relativeFilePath,
          url: directViewUrl,
        };
      } catch (eFoto) {
        Logger.log("[_simpanFotoBase64_] Gagal: " + eFoto.message);
        return { nama: "", url: "" };
      }
    }

    if (payload.fotoSebelumBase64) {
      fSbl = _simpanFotoBase64_(payload.fotoSebelumBase64, "Foto Sebelum");
    }
    if (payload.fotoPekerjaanBase64) {
      fPkj = _simpanFotoBase64_(payload.fotoPekerjaanBase64, "Foto Pekerjaan");
    }
    if (payload.fotoSesudahBase64) {
      fSsd = _simpanFotoBase64_(payload.fotoSesudahBase64, "Foto Sesudah");
    }

    // Susun baris 30 kolom db_ROW_Eksekusi (0-based)
    var baris = new Array(30).fill("");
    // baris[0] (No) sengaja dibiarkan kosong untuk formula COUNTA sheet
    baris[1] = ""; // B: Kode Header (diisi otomatis oleh rantai prosesEksekusiROW)
    baris[2] = ""; // C: Kode Pekerjaan (diisi otomatis oleh rantai prosesEksekusiROW)
    baris[3] = uniqueKode; // D: Kode Eksekusi (UNIQUEID)
    baris[4] = ulp; // E: ULP
    baris[5] = hari; // F: Hari
    baris[6] = tglObj; // G: Tanggal
    baris[7] = tim; // H: Tim / Sub-Tim
    baris[8] = penyulang; // I: Penyulang
    baris[9] = section; // J: Section
    baris[10] = nomorTiang; // K: Nomor Tiang
    baris[11] = koorTiang; // L: Koordinat Tiang
    baris[12] = latTiang; // M: Lat Tiang
    baris[13] = longTiang; // N: Long Tiang
    baris[14] = koorPek; // O: Koordinat Pekerjaan
    baris[15] = latPek; // P: Lat Pekerjaan
    baris[16] = longPek; // Q: Long Pekerjaan
    baris[17] = fSbl.nama; // R: Foto Sebelum
    baris[18] = fSbl.url; // S: Foto Sebelum URL
    baris[19] = fPkj.nama; // T: Foto Pekerjaan
    baris[20] = fPkj.url; // U: Foto Pekerjaan URL
    baris[21] = fSsd.nama; // V: Foto Sesudah
    baris[22] = fSsd.url; // W: Foto Sesudah URL
    baris[23] = diameter; // X: Diameter
    baris[24] = jenisPekerjaan; // Y: Jenis Pekerjaan
    baris[25] = fSbl.url ? "Y" : "N"; // Z: Tampil Foto Sebelum
    baris[26] = fPkj.url ? "Y" : "N"; // AA: Tampil Foto Pekerjaan
    baris[27] = fSsd.url ? "Y" : "N"; // AB: Tampil Foto Sesudah
    baris[28] = inputOleh; // AC: Input Oleh
    baris[29] = timestamp; // AD: Timestamp

    // Tulis baris baru ke db_ROW_Eksekusi (kolom B..AD)
    var targetRow = sh.getLastRow() + 1;
    sh.getRange(targetRow, 2, 1, 29).setValues([baris.slice(1)]);
    sh.getRange(targetRow, 30).setNumberFormat("dd/MM/yyyy HH:mm:ss");
    SpreadsheetApp.flush();

    // ANTREAN (BACKLOG) — rantai bottom-up prosesEksekusiROW (bangun Realisasi + Header,
    // tulis-balik kode, sinkron WA) DIDEFER ke antrean db_Recalc_Queue (jenis "eksekusiRow")
    // → diproses recalcTick tiap 1 menit. UI mobile balas SEKETIKA setelah foto terupload
    // & baris tertulis — tidak lagi menunggu rantai (penyebab input terasa lama).
    var antreRantai = false;
    try {
      antreRantai = _enqueueRecalc_({
        jenis: "eksekusiRow",
        key: "eksekusiRow|" + uniqueKode,
        tim: tim,
        tanggal: tglStr,
      });
    } catch (eRantai) {
      Logger.log(
        "[simpanMobileEksekusiRow] enqueue rantai gagal: " + eRantai.message,
      );
    }

    return {
      success: true,
      message: "Data eksekusi pekerjaan berhasil disimpan.",
      kodeEksekusi: uniqueKode,
      queued: antreRantai,
      mode: "queued",
    };
  } catch (err) {
    return {
      success: false,
      message: "Error simpanMobileEksekusiRow: " + err.message,
    };
  }
}

/**
 * Update BERTAHAP foto eksekusi ROW — SISTEM PROGRES (21 Agu 2026).
 * Tahap 1 = foto sebelum (input baru via simpanMobileEksekusiRow),
 * tahap 2 = foto pekerjaan, tahap 3 = foto sesudah = SELESAI.
 * Status progres diturunkan dari kelengkapan 3 foto — TANPA kolom baru di sheet.
 * Prinsip migrasi: TULIS hanya ke AKTIF (baris progres = pekerjaan hari ini).
 *
 * payload: { token, kodeEksekusi, fotoPekerjaanBase64?, fotoSesudahBase64? }
 * return : { success, kodeEksekusi, tahap (0-3), fotoPekerjaanUrl?, fotoSesudahUrl?, message }
 */
function updateMobileEksekusiRow(payload) {
  try {
    payload = payload || {};
    /* Otentikasi + skop ULP (29 Agu 2026).
       Sebelumnya kodeEksekusi diterima begitu saja dari klien: siapa pun yang
       login (bahkan dari ULP lain) bisa menimpa foto pada baris eksekusi
       mana pun asalkan tahu kodenya — IDOR, plus upload file ke Drive. */
    var g = guard_(arguments, { ulp: true, aksi: "updateMobileEksekusiRow" });

    var kodeEksekusi = String(payload.kodeEksekusi || "").trim();
    if (!kodeEksekusi)
      return { success: false, message: "kodeEksekusi wajib diisi." };

    var b64Pkj = String(payload.fotoPekerjaanBase64 || "");
    var b64Ssd = String(payload.fotoSesudahBase64 || "");
    if (b64Pkj.length < 50 && b64Ssd.length < 50)
      return { success: false, message: "Tidak ada foto yang dikirim." };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("db_ROW_Eksekusi");
    if (!sh)
      return {
        success: false,
        message: "Sheet db_ROW_Eksekusi tidak ditemukan.",
      };

    // 1) Cari baris by Kode Eksekusi (kolom D) — scan dari bawah karena baris
    //    progres hampir selalu yang terbaru.
    var lastRow = sh.getLastRow();
    if (lastRow < 2)
      return { success: false, message: "Data eksekusi masih kosong." };
    var kodeList = sh.getRange(2, 4, lastRow - 1, 1).getValues();
    var rowIdx = -1;
    for (var i = kodeList.length - 1; i >= 0; i--) {
      if (String(kodeList[i][0] || "").trim() === kodeEksekusi) {
        rowIdx = i + 2;
        break;
      }
    }
    if (rowIdx === -1)
      return {
        success: false,
        message: "Kode Eksekusi tidak ditemukan: " + kodeEksekusi,
      };

    // 1b) PEMILIKAN: baris harus milik ULP sesi (kecuali Super User).
    //     Tanpa ini, kodeEksekusi ULP lain bisa difoto ulang dari luar.
    var ulpBaris = String(sh.getRange(rowIdx, 5).getValue() || "").trim(); // E: ULP
    if (!barisUlpCocok_(g, ulpBaris)) {
      audit_(g.sesi, "updateMobileEksekusiRow", kodeEksekusi, "TOLAK",
        "baris milik ULP lain: " + ulpBaris);
      return {
        success: false,
        message: "Kode Eksekusi bukan milik ULP Anda.",
      };
    }

    // 2) Konteks baris utk membangun ulang folder upload (hierarki sama dgn
    //    simpanMobileEksekusiRow: .../Eksekusi ROW/{Tahun}/{Bln}/{Tgl}/{Tim}/{Kode}).
    var tglCell = sh.getRange(rowIdx, 7).getValue(); // G: Tanggal
    var tim = String(sh.getRange(rowIdx, 8).getValue() || "").trim(); // H: Tim
    var tglObj =
      tglCell instanceof Date && !isNaN(tglCell.getTime())
        ? tglCell
        : new Date();

    var now = new Date();
    var folderUpload = null;
    var relativeFolderPath = "";

    function _getFolderUpdate_() {
      if (!folderUpload) {
        var baseFolderNama = "AppSheet SiSi - ULP Toboali";
        var bulanList = [
          "Januari",
          "Februari",
          "Maret",
          "April",
          "Mei",
          "Juni",
          "Juli",
          "Agustus",
          "September",
          "Oktober",
          "November",
          "Desember",
        ];
        var blnStr =
          ("0" + (tglObj.getMonth() + 1)).slice(-2) +
          ". " +
          bulanList[tglObj.getMonth()];
        var tglHari = String(tglObj.getDate());
        var tahunStr = String(tglObj.getFullYear());

        var rootFolders = DriveApp.getFoldersByName(baseFolderNama);
        var curFolder = rootFolders.hasNext()
          ? rootFolders.next()
          : DriveApp.createFolder(baseFolderNama);
        var parentPath = ["Eksekusi ROW", tahunStr, blnStr, tglHari, tim];
        for (var p = 0; p < parentPath.length; p++) {
          var subName = parentPath[p];
          var subs = curFolder.getFoldersByName(subName);
          curFolder = subs.hasNext()
            ? subs.next()
            : curFolder.createFolder(subName);
        }
        relativeFolderPath =
          baseFolderNama +
          "/Eksekusi ROW/" +
          tahunStr +
          "/" +
          blnStr +
          "/" +
          tglHari +
          "/" +
          tim +
          "/" +
          kodeEksekusi;
        var subsKode = curFolder.getFoldersByName(kodeEksekusi);
        folderUpload = subsKode.hasNext()
          ? subsKode.next()
          : curFolder.createFolder(kodeEksekusi);
      }
      return folderUpload;
    }

    function _unggahFoto_(base64Str, tagTipe) {
      try {
        var rawData = base64Str;
        var mimeType = "image/jpeg";
        if (rawData.indexOf(";base64,") >= 0) {
          var parts = rawData.split(";base64,");
          mimeType = parts[0].replace("data:", "");
          rawData = parts[1];
        }
        var decoded = Utilities.base64Decode(rawData);
        var jamStr = Utilities.formatDate(now, "Asia/Jakarta", "HHmmss");
        var fileNameOnly = kodeEksekusi + "." + tagTipe + "." + jamStr + ".jpg";
        var file = _getFolderUpdate_().createFile(
          Utilities.newBlob(decoded, mimeType, fileNameOnly),
        );
        file.setSharing(
          DriveApp.Access.ANYONE_WITH_LINK,
          DriveApp.Permission.VIEW,
        );
        return {
          nama: relativeFolderPath + "/" + fileNameOnly,
          url: "https://lh3.googleusercontent.com/d/" + file.getId(),
        };
      } catch (eFoto) {
        Logger.log(
          "[updateMobileEksekusiRow._unggahFoto_] Gagal: " + eFoto.message,
        );
        return { nama: "", url: "" };
      }
    }

    // 3) Tulis kolom foto sesuai tahap yang dikirim.
    //    Pekerjaan: T(20)=nama, U(21)=url, AA(27)=flag. Sesudah: V(22)=nama, W(23)=url, AB(28)=flag.
    var out = { success: true, kodeEksekusi: kodeEksekusi };
    if (b64Pkj.length >= 50) {
      var fP = _unggahFoto_(b64Pkj, "Foto Pekerjaan");
      if (fP.url) {
        sh.getRange(rowIdx, 20).setValue(fP.nama);
        sh.getRange(rowIdx, 21).setValue(fP.url);
        sh.getRange(rowIdx, 27).setValue("Y");
        out.fotoPekerjaanUrl = fP.url;
      }
    }
    if (b64Ssd.length >= 50) {
      var fS = _unggahFoto_(b64Ssd, "Foto Sesudah");
      if (fS.url) {
        sh.getRange(rowIdx, 22).setValue(fS.nama);
        sh.getRange(rowIdx, 23).setValue(fS.url);
        sh.getRange(rowIdx, 28).setValue("Y");
        out.fotoSesudahUrl = fS.url;
      }
    }
    SpreadsheetApp.flush();

    // 4) Rantai Realisasi/Header/WA di-refresh lewat antrean yang sama
    //    (dedup by key membuat enqueue ulang murah — recalcTick memproses kondisi terbaru).
    try {
      _enqueueRecalc_({
        jenis: "eksekusiRow",
        key: "eksekusiRow|" + kodeEksekusi,
        tim: tim,
        tanggal: _normTgl(tglObj),
      });
    } catch (eQ) {
      Logger.log("[updateMobileEksekusiRow] enqueue gagal: " + eQ.message);
    }

    // 5) Tahap terbaru utk balasan UI (dibaca dari kelengkapan foto di sheet).
    var sAda = String(sh.getRange(rowIdx, 19).getValue() || "").trim() !== ""; // S
    var pAda = String(sh.getRange(rowIdx, 21).getValue() || "").trim() !== ""; // U
    var dAda = String(sh.getRange(rowIdx, 23).getValue() || "").trim() !== ""; // W
    out.tahap = dAda ? 3 : pAda ? 2 : sAda ? 1 : 0;
    out.message =
      out.tahap >= 3
        ? "Pekerjaan selesai — dokumentasi 3 foto lengkap."
        : "Progres tersimpan (tahap " + out.tahap + "/3).";
    return out;
  } catch (err) {
    return {
      success: false,
      message: "Error updateMobileEksekusiRow: " + err.message,
    };
  }
}

/* ═══ MOBILE API LAYER & ROUTER UNTUK FLUTTER (SiSi Mobile) ═══ */
function apiRouter_(e, body) {
  var p = (e && e.parameter) || {};
  var action = (body && body.action) || p.action || "";
  var result;

  // HOTFIX: route device-token and mobile extension endpoints first.
  // Unknown actions return null, preserving the legacy switch below.
  if (typeof authPerangkatRouter_ === "function") {
    var lewatAuth = authPerangkatRouter_(e, body);
    if (lewatAuth) return lewatAuth;
  }

  if (typeof jadwalPadamMobileRouter_ === "function") {
    var lewatJadwalPadam = jadwalPadamMobileRouter_(e, body);
    if (lewatJadwalPadam)
      return ContentService.createTextOutput(JSON.stringify(lewatJadwalPadam))
        .setMimeType(ContentService.MimeType.JSON);
  }

  if (typeof gangguanBerandaMobileRouter_ === "function") {
    var lewatGangguan = gangguanBerandaMobileRouter_(e, body);
    if (lewatGangguan) return ContentService.createTextOutput(JSON.stringify(lewatGangguan)).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    switch (action) {
      // 1. Autentikasi & Akun
      case "login":
        result = body
          ? doLogin(body.username, body.password)
          : { success: false, message: "Login wajib menggunakan POST JSON." };
        break;

      case "logout":
        result = doLogout((body && body.token) || p.token);
        break;

      case "cekSesi":
        var sesi = getSesiByToken(p.token || (body && body.token));
        result = sesi
          ? { success: true, sesi: sesi }
          : { success: false, message: "Sesi habis" };
        break;

      case "getPageContent":
        result = getPageContent(p.token, p.pageName);
        break;

      case "getMenuOptions":
        result = getMenuOptions(p.token || (body && body.token));
        break;

      case "getDaftarAkun":
        result = getDaftarAkun(p.token || (body && body.token));
        break;

      case "tambahAkun":
        result = tambahAkun(body.token, body.data);
        break;

      case "updateAkun":
        result = updateAkun(body.token, body.data);
        break;

      case "hapusAkun":
        result = hapusAkun(body.token, body.username);
        break;

      case "resetPasswordAkun":
        result = resetPasswordAkun(
          body.token,
          body.username,
          body.passwordBaru,
        );
        break;

      case "gantiPassword":
        result = gantiPassword(
          body.token,
          body.passwordLama,
          body.passwordBaru,
        );
        break;

      // 2. Laporan Harian (db_Global_Header)
      case "getMobileLaporanHarian":
      case "getLaporanHarian":
        result = getMobileLaporanHarian(
          p.token || (body && body.token),
          p.subTim || (body && body.subTim),
          p.tim || (body && body.tim),
          p.tanggal || (body && body.tanggal),
          p.limit || (body && body.limit),
        );
        break;

      // 3. Eksekusi ROW (db_ROW_Eksekusi)
      case "getMobileDropdownRow":
      case "getDropdownRow":
        result = getMobileDropdownRow(p.token || (body && body.token));
        break;

      case "getMobileEksekusiRow":
      case "getEksekusiRow":
        result = getMobileEksekusiRow(
          p.token || (body && body.token),
          p.subTim || (body && body.subTim),
          p.tim || (body && body.tim),
          p.tanggal || (body && body.tanggal),
          p.limit || (body && body.limit),
        );
        break;

      case "simpanMobileEksekusiRow":
      case "simpanEksekusiRow":
        result = simpanMobileEksekusiRow(body || p);
        break;

      // Update bertahap foto eksekusi ROW (sistem progres 21 Agu 2026)
      case "updateMobileEksekusiRow":
      case "updateEksekusiRow":
        result = updateMobileEksekusiRow(body || p);
        break;

      // 4. Verifikasi & Approval P0 (db_Yandal_P0, db_Yandal_Pengecekan_Switching, Pengukuran Gardu)
      case "getMobileApprovalP0List":
      case "getApprovalP0List":
        result =
          typeof getApprovalP0List === "function"
            ? getApprovalP0List(body || p)
            : {
                ok: false,
                error: "getApprovalP0List tidak tersedia di Tek-Yandal-Code.js",
              };
        break;

      case "setMobileApprovalP0":
      case "setApprovalP0":
        result =
          typeof setApprovalP0 === "function"
            ? setApprovalP0(body || p)
            : {
                ok: false,
                error: "setApprovalP0 tidak tersedia di Tek-Yandal-Code.js",
              };
        break;

      case "getMobileLampiranPengecekanP0":
      case "getLampiranPengecekanP0":
        result =
          typeof getLampiranPengecekanP0 === "function"
            ? getLampiranPengecekanP0(body || p)
            : {
                ok: false,
                error:
                  "getLampiranPengecekanP0 tidak tersedia di Tek-Yandal-Code.js",
              };
        break;

      case "getListPekerjaanP0":
        /* Teruskan body/parameter: getListPekerjaanP0() sekarang wajib sesi. */
        result =
          typeof getListPekerjaanP0 === "function"
            ? getListPekerjaanP0(body || p)
            : {
                ok: false,
                error:
                  "getListPekerjaanP0 tidak tersedia di Tek-Yandal-Code.js",
              };
        break;

      case "updateNamaPekerjaanP0":
        result =
          typeof updateNamaPekerjaanP0 === "function"
            ? updateNamaPekerjaanP0(body || p)
            : {
                ok: false,
                error:
                  "updateNamaPekerjaanP0 tidak tersedia di Tek-Yandal-Code.js",
              };
        break;

      // 5. Laporan UP3 / UIW (sheet Teknik_Laporan Harian — sub-menu mobile)
      case "getMobileLaporanUp3Uiw":
        result =
          typeof getMobileLaporanUp3Uiw === "function"
            ? getMobileLaporanUp3Uiw(p)
            : {
                ok: false,
                error:
                  "getMobileLaporanUp3Uiw tidak tersedia di Tek-LapUP3UIWHarian.js",
              };
        break;

      case "simpanMobileLaporanC4A":
        result =
          typeof simpanMobileLaporanC4A === "function"
            ? simpanMobileLaporanC4A(p)
            : {
                ok: false,
                error:
                  "simpanMobileLaporanC4A tidak tersedia di Tek-LapUP3UIWHarian.js",
              };
        break;

      default:
        result = {
          success: false,
          message: "Action API tidak dikenal: " + action,
        };
    }
  } catch (err) {
    result = { success: false, message: "Error server: " + err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
