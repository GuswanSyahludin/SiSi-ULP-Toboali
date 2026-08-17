/* ═════════════════════════════════════
   Code.gs — SiSi ULP Toboali (BAGIAN 1: INTI / SHARED)
   Google Apps Script Backend
   Rev: 31 Mei 2026 (konsolidasi bersih + modul Inspeksi + MOBILE API LAYER)
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

/* Alias & sub-menu SIE Teknik.
   Laporan Teknik memakai file HTML SIE-Teknik yang sudah ada (PAGE_FILE_ALIASES).
   Berita Acara & Tek-Data-Checkpoint adalah file HTML sendiri (bukan alias).
   Hak akses semua sub-menu diwariskan dari akses induk SIE-Teknik (PAGE_ACCESS_PARENT). */
var PAGE_FILE_ALIASES = {
  "SIE-LaporanTeknik": "SIE-Teknik",
};
var PAGE_ACCESS_PARENT = {
  "SIE-LaporanTeknik": "SIE-Teknik",
  "SIE-BeritaAcara": "SIE-Teknik",
  "Tek-Data-Checkpoint": "SIE-Teknik",
};
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

// Satu pintu akses spreadsheet
function _ssIns() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// Nama sheet — ubah di SATU tempat saja
const SHEET_INS = {
  HEADER: "db_Global_Header",
  REALISASI: "db_InsJar_Realisasi",
  TEMUAN: "db_INS_Temuan",
  TIM: "db_Tim",
  PENYULANG: "db_Penyulang",
};

// Peta kolom (0-based). Jika urutan kolom GSheet berubah, edit di sini saja.
const COL_INS = {
  HEADER: {
    no: 0, // A  No (formula)
    kodeHeader: 1, // B  Kode Header
    ulp: 2, // C  ULP (berdasarkan username)
    hari: 3, // D  Hari
    tanggal: 4, // E  Tanggal
    tim: 5, // F  Tim (pembeda: Inspeksi / ROW) — dulu kolom "Jenis"
    subTim: 6, // G  Sub-Tim (Inspeksi Jaringan / Inspeksi Gardu / ROW 01, dst)
    koordinatAwal: 7, // H  Koordinat Awal (Tier dipindah ke realisasi)
    koordinatAkhir: 8, // I  Koordinat Akhir
    kmAwal: 9, // J  KM Awal
    kmAkhir: 10, // K  KM Akhir
    kendala: 11, // L  Kendala
    waText: 12, // M  WA Text
    timestamp: 13, // N  Timestamp
    inputBy: 14, // O  Input Oleh
    timestampUpdate: 15, // P  Timestamp Update
    statusTextWa: 16, // Q  Status TextWA ("Update" saat WA dibangun ulang; "Not Update" saat petugas simpan)
  },

  // db_InsJar_Realisasi (struktur A–M; Hari & Tanggal di kolom D,E; Segmen kolom H)
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

  // === db_INS_Temuan (struktur A–AS, 0-based) ===
  // CATATAN: kolom "Petugas" (AM, indeks 38) disisipkan untuk tim Yandal —
  // di antara Tanggal Selesai (AL/37) dan InputBy Selesai (AN/39). Semua kolom
  // setelah Tanggal Selesai bergeser +1. Akses SELALU via nama (T.xxx), jangan angka.
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

// Status temuan (samakan persis dengan nilai di AppSheet)
const STATUS_INS = {
  PENUGASAN: "Penugasan Tim",
  PROGRESS: "Progress Pekerjaan",
  SELESAI: "Selesai",
};

// Baca sheet sekali -> array baris (default skip 1 baris header)
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

// Index O(1): { key -> [baris, ...] }
function _indexBy(rows, keyIdx) {
  const map = {};
  for (let i = 0; i < rows.length; i++) {
    const k = String(rows[i][keyIdx] == null ? "" : rows[i][keyIdx]).trim();
    if (!k) continue;
    (map[k] || (map[k] = [])).push(rows[i]);
  }
  return map;
}

// Distinct (trim + buang kosong)
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

// Cache wrapper
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

// Normalisasi tanggal -> 'yyyy-MM-dd' (Asia/Jakarta) — versi robust (SATU-SATUNYA)
function _normTgl(v) {
  if (!v) return "";
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return "";
    return Utilities.formatDate(v, "Asia/Jakarta", "yyyy-MM-dd");
  }
  var s = String(v).trim();
  var m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // dd/MM/yyyy
  if (m1)
    return m1[3] + "-" + m1[2].padStart(2, "0") + "-" + m1[1].padStart(2, "0");
  var m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/); // yyyy-MM-dd
  if (m2) return m2[0];
  var d = new Date(s);
  if (!isNaN(d.getTime()))
    return Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd");
  return s;
}

// Cek apakah 'yyyy-MM-dd' di dalam rentang
function _insInRange(tgl, dari, sampai) {
  if (!tgl) return false;
  if (dari && tgl < dari) return false;
  if (sampai && tgl > sampai) return false;
  return true;
}

// Cari baris fisik db_INS_Temuan berdasarkan Kode Pekerjaan (kolom D)
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

// Klasifikasi jenis pekerjaan dari diameter
function _jenisPekerjaan(diameter) {
  const d = Number(diameter) || 0;
  if (d === 0) return "Rabas / Pangkas";
  if (d <= 50) return "Tebang Sedang";
  return "Tebang Besar";
}

/* ═══ MOBILE API LAYER (dipanggil Flutter via ?mobile=1) ═══
   GET  : /exec?mobile=1&action=xxx&token=xxx&...
   POST : body JSON { action:'xxx', token:'xxx', ... }
   Semua balikan JSON, tidak render HTML. Ditambahkan agar backend GSheet yang sama
   bisa dipakai oleh app Flutter, tanpa mengganggu doGet/doPost lama (web app & webhook AppSheet). */
function apiRouter_(e, body) {
  var p = (e && e.parameter) || {};
  var action = (body && body.action) || p.action || "";
  var result;

  try {
    switch (action) {
      case "login":
        result = doLogin(
          body ? body.username : p.username,
          body ? body.password : p.password,
        );
        break;

      case "logout":
        result = doLogout((body && body.token) || p.token);
        break;

      case "getPageContent":
        // Untuk mobile biasanya tidak perlu HTML, tapi dipertahankan agar sesi & akses tervalidasi
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

      case "cekSesi":
        // Berguna buat auto-login: cek token tersimpan di HP masih valid atau tidak
        var sesi = getSesiByToken(p.token || (body && body.token));
        result = sesi
          ? { success: true, sesi: sesi }
          : { success: false, message: "Sesi habis" };
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

/* ═══ ENTRY POINT ═══ */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doGet(e) {
  // MOBILE: rute semua request Flutter (?mobile=1) ke apiRouter_, balikan JSON murni.
  if (e && e.parameter && e.parameter.mobile) return apiRouter_(e, null);

  // Rute UNDUH PDF ROW (link web -> langsung unduh): ?pdf=realisasi | ?pdf=eksekusi
  // Filter opsional: &tglDari=YYYY-MM-DD&tglSampai=YYYY-MM-DD&tim=...&penyulang=...&ulp=...
  // Implementasi unduhPdfROW ada di Tek-ROW.gs (ruang lingkup global, tanpa import).
  if (e && e.parameter && e.parameter.pdf) {
    // Inspeksi Gardu (?pdf=gardu) -> unduhPdfInsGardu (Tek-InsDu.gs). Lainnya -> unduhPdfROW.
    if (String(e.parameter.pdf).trim().toLowerCase() === "gardu")
      return unduhPdfInsGardu(e);
    return unduhPdfROW(e);
  }

  var token = (e && e.parameter && e.parameter.token) || "";
  var svcUrl = ScriptApp.getService().getUrl();

  if (!token) {
    var t1 = HtmlService.createTemplateFromFile("login-page");
    t1.error = "";
    t1.scriptUrl = svcUrl;
    return t1
      .evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  var sesi = getSesiByToken(token);
  if (!sesi) {
    var t2 = HtmlService.createTemplateFromFile("login-page");
    t2.error = "Sesi habis, silakan login ulang.";
    t2.scriptUrl = svcUrl;
    return t2
      .evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  // Isi ulang userToken di userCache agar getSessionUser() tetap bekerja
  // setelah refresh / buka URL langsung (bukan hanya tepat setelah doLogin).
  try {
    CacheService.getUserCache().put("userToken", token, SESSION_TTL_SEC);
  } catch (e) {}

  return HtmlService.createTemplateFromFile("Main")
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/* ═══ WEBHOOK (POST) — dipanggil oleh Bot AppSheet saat db_ROW_Eksekusi berubah ═══
   Tujuan: memicu recalcEksekusiROW secara INSTAN (sinkron eksekusi -> realisasi -> WA header)
   tanpa menunggu trigger waktu. GANTI nilai WEBHOOK_SECRET di bawah dgn token rahasia Anda,
   lalu kirim token yg sama dari body webhook AppSheet. Endpoint: URL /exec web app (POST).
   PENTING: hanya boleh ada SATU doPost di seluruh proyek. */
var WEBHOOK_SECRET = "P@ssw0rd`123";

function doPost(e) {
  // MOBILE: rute semua request Flutter (?mobile=1) ke apiRouter_, balikan JSON murni.
  if (e && e.parameter && e.parameter.mobile) {
    var bodyMobile = {};
    try {
      bodyMobile = JSON.parse(e.postData.contents);
    } catch (errMobile) {}
    return apiRouter_(e, bodyMobile);
  }

  var out = { ok: false };
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (pe) {
        body = {};
      }
    }
    // Fallback bila AppSheet mengirim sbg form/parameter, bukan JSON.
    if ((!body || body.token == null) && e && e.parameter) body = e.parameter;

    if (String(body.token || body.secret || "") !== WEBHOOK_SECRET) {
      out.message = "Token webhook tidak valid";
      return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(
        ContentService.MimeType.JSON,
      );
    }

    var action = String(body.action || "recalcRow").trim();
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

/* ═══ ANTREAN RECALC GABUNGAN (Varian A — tandai "dirty" + trigger tiap 1 menit) ═══
   Satu antrean (db_Recalc_Queue) + satu trigger (recalcTick) menangani DUA jenis:
     • jenis 'row' → recalcEksekusiROW(tim, null, tanggal)   (kunci: tim|tanggal)
     • jenis 'wa'  → recalcWaByHeader(kodeHeader)            (kunci: kodeHeader)
   Builder WA sudah hitung ulang realisasi (Jumlah Temuan/Section InsJar & Gardu) sebelum
   menulis WA, jadi db_INS_Temuan → db_InsJar_Realisasi / db_InsDu_Realisasi ikut terbawa.
   Tujuan: petugas TIDAK perlu menunggu jeda; doPost cuma MENANDAI lalu balas seketika.
   SETUP sekali: jalankan createRecalcTrigger() dari editor Apps Script. Sheet
   db_Recalc_Queue dibuat OTOMATIS (TIDAK perlu ditambah ke AppSheet); skema lama
   bermigrasi sendiri saat deploy. Batalkan: hapusRecalcTrigger(). */
var RECALC_QUEUE_SHEET = "db_Recalc_Queue";
var RECALC_MAX_ATTEMPTS = 5;
var RECALC_BATCH = 50;
var RECALC_STALE_MS = 10 * 60 * 1000; // 10 menit: klaim 'processing' yg nyangkut dianggap basi

// kolom 0-based (antrean GABUNGAN row + wa):
// jenis | key | tim | tanggal | kodeHeader | dirtyAt | status | lastTriedAt | attempts
//   - jenis : 'row' (recalcEksekusiROW per tim|tanggal) atau 'wa' (recalcWaByHeader per kodeHeader)
//   - key   : penanda dedup unik → 'row|<tim>|<tanggal>' atau 'wa|<kodeHeader>'
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
  // Migrasi sekali: skema lama (tanpa kolom 'jenis') → skema gabungan baru. Baris in-flight
  // lama dibuang (aman: akan ditandai ulang oleh input berikutnya / jaring pengaman refreshWa).
  var head = String(sh.getRange(1, 1).getValue() || "").trim();
  if (head !== "jenis") {
    sh.clearContents();
    sh.getRange(1, 1, 1, RECALC_QUEUE_COLS).setValues([RECALC_QUEUE_HEADER]);
    sh.setFrozenRows(1);
  }
  return sh;
}

// Inti antrean: tandai satu pekerjaan recalc sebagai 'dirty' (dedup per key; aman dipanggil
// sangat sering). jenis='row' → payload tim|tanggal; jenis='wa' → kodeHeader.
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
          // sudah ada penanda → cukup perbarui dirtyAt (penjaga anti-hilang saat sedang diproses)
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

// Tandai tim|tanggal sebagai 'perlu recalc ROW' (dedup; aman dipanggil sangat sering).
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

// Tandai kodeHeader sebagai 'perlu rebuild WA' (dedup). Builder WA Engine sudah menghitung
// ulang realisasi (Jumlah Temuan/Section InsJar & jumlah temuan Gardu) sebelum menulis WA,
// jadi recompute db_INS_Temuan → db_InsJar_Realisasi / db_InsDu_Realisasi ikut terbawa.
function markWaDirty_(kodeHeader) {
  kodeHeader = String(kodeHeader || "").trim();
  if (!kodeHeader) return false;
  return _enqueueRecalc_({
    jenis: "wa",
    key: "wa|" + kodeHeader,
    kodeHeader: kodeHeader,
  });
}

// HANDLER TRIGGER (tiap 1 menit): proses semua penanda dirty (row + wa) dalam SATU antrean.
function recalcTick() {
  var sh = _recalcQueueSheet_();

  // ── Fase 1: KLAIM (di bawah lock) ──
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
          dirtyAt: Number(data[i][RQ.dirtyAt] || 0), // dirtyAt saat diklaim (penjaga)
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

  // ── Fase 2: RECALC (TANPA lock; recalcEksekusiROW & recalcWaByHeader punya kunci sendiri) ──
  for (var j = 0; j < claimed.length; j++) {
    try {
      if (claimed[j].jenis === "wa") {
        // 'wa': rebuild WA 1 header — builder otomatis hitung ulang realisasi lebih dulu.
        if (typeof recalcWaByHeader === "function" && claimed[j].kodeHeader) {
          recalcWaByHeader(claimed[j].kodeHeader);
          claimed[j].ok = true;
        } else {
          claimed[j].ok = false;
        }
      } else {
        // 'row': tarik temuan-Selesai → realisasi → WA header (per tim|tanggal).
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

  // ── Fase 3: SELESAIKAN (di bawah lock) ──
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
        // ada input baru selama recalc berjalan → jangan hapus; proses lagi tick berikutnya
        sh.getRange(hit.row, RQ.status + 1).setValue("pending");
      } else if (c.ok) {
        toDelete.push(hit.row); // sukses & tidak ada perubahan baru → hapus
      } else {
        var att = Number(hit.v[RQ.attempts] || 0) + 1;
        sh.getRange(hit.row, RQ.attempts + 1).setValue(att);
        sh.getRange(hit.row, RQ.status + 1).setValue(
          att >= RECALC_MAX_ATTEMPTS ? "failed" : "pending",
        );
      }
    }
    // hapus dari bawah ke atas agar indeks tidak bergeser
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

// SETUP sekali: pasang trigger GABUNGAN tiap 1 menit (idempoten — hapus dulu yg lama,
// termasuk handler lama 'recalcRowTick'). Memproses antrean row + wa sekaligus.
function createRecalcTrigger() {
  var all = ScriptApp.getProjectTriggers();
  for (var i = 0; i < all.length; i++) {
    var fn = all[i].getHandlerFunction();
    if (fn === "recalcTick" || fn === "recalcRowTick")
      ScriptApp.deleteTrigger(all[i]);
  }
  ScriptApp.newTrigger("recalcTick").timeBased().everyMinutes(1).create();
  return "Trigger recalcTick (gabungan row+wa) dipasang (tiap 1 menit).";
}

// Batalkan: hapus trigger recalc gabungan (doPost kembali ke mode lama via fallback debounce).
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

// Alias kompatibilitas: nama lama tetap berfungsi (trigger 'recalcRowTick' yg sudah
// terpasang akan diarahkan ke handler gabungan via alias di bawah).
function recalcRowTick() {
  return recalcTick();
}
function createRecalcRowTrigger() {
  return createRecalcTrigger();
}
function hapusRecalcRowTrigger() {
  return hapusRecalcTrigger();
}

/* ═══ BACKSTOP WA (jaring pengaman) — sweep refreshWaHarian ═══
   recalcTick sudah menangani jalur real-time per input. refreshWaHarian hanya BACKSTOP:
   menyapu ulang WA semua tim (hari ini + kemarin) untuk menutup celah bila ada input yg
   lolos dari antrean (mis. edit via GSheet langsung, atau bot gagal kirim webhook).
   Idempoten & aman jalan berdampingan dgn recalcTick (hasil WA sama → last-write-wins).
   12 Agu 2026: refreshWaHarian BERJALAN TIAP 1 MENIT via tickGabunganSiSi (Tek-Migrasi.gs)
   — trigger standalone & konstanta di bawah HANYA dipakai bila rollback ke trigger per-modul
   (lepasTriggerGabunganSiSi() lalu createRefreshWaTrigger()).
   everyMinutes() hanya menerima 1/5/10/15/30 — ubah REFRESH_WA_INTERVAL_MIN sesuai itu. */
var REFRESH_WA_INTERVAL_MIN = 15; // interval backstop (menit) — hanya utk rollback standalone

function createRefreshWaTrigger() {
  var all = ScriptApp.getProjectTriggers();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getHandlerFunction() === "refreshWaHarian")
      ScriptApp.deleteTrigger(all[i]);
  }
  ScriptApp.newTrigger("refreshWaHarian")
    .timeBased()
    .everyMinutes(REFRESH_WA_INTERVAL_MIN)
    .create();
  return (
    "Trigger backstop refreshWaHarian dipasang (tiap " +
    REFRESH_WA_INTERVAL_MIN +
    " menit)."
  );
}

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
    cache.put("sesi_" + token, raw, SESSION_TTL_SEC); // refresh TTL
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
function doLogin(username, password) {
  try {
    if (!username || !password)
      return { success: false, message: "Username dan password wajib diisi" };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("db_Users");
    if (!sh)
      return { success: false, message: "Sheet db_Users tidak ditemukan" };

    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      var eml = String(r[COL_USERS.email] || "").trim(); // B
      var uNm = String(r[COL_USERS.userName] || "").trim(); // C
      var uPw = String(r[COL_USERS.password] || "").trim(); // D
      var role = String(r[COL_USERS.role] || "").trim(); // E
      var ulp = String(r[COL_USERS.ulp] || "").trim(); // F
      var kodeUlp = String(r[COL_USERS.kodeUlp] || "").trim(); // G
      var bidang = String(r[COL_USERS.bidang] || "").trim(); // H
      var tim = String(r[COL_USERS.tim] || "").trim(); // I
      var subTim = String(r[COL_USERS.subTim] || "").trim(); // J
      var aksesMenu = String(r[COL_USERS.aksesMenu] || "").trim(); // K

      if (uNm.toLowerCase() !== username.toLowerCase()) continue;
      if (uPw !== password)
        return { success: false, message: "Password salah" };

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
      CacheService.getUserCache().put("userToken", token, SESSION_TTL_SEC);

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

/* Pemetaan halaman berdasar BIDANG (untuk role supervisori berbasis bidang:
   Team Leader, Staff, Admin ES). Tambahkan bidang lain di sini bila perlu. */
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

/* Pemetaan TIM PETUGAS -> SATU halaman menu miliknya.
   Petugas lapangan hanya boleh membuka menu timnya sendiri (di ULP-nya). */
var TIM_PAGE_MAP = {
  "Inspeksi Jaringan": "Tek-InsJar",
  "Inspeksi Gardu": "Tek-InsDu",
  ROW: "Tek-ROW",
  Yantek: "Tek-Yandal",
  Hartek: "Tek-Hartek",
  Gangguan: "Tek-Gangguan",
};

/* Parse string "Akses Menu" (kolom J db_Users) -> array key halaman. */
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

/* GATE MENU — akses menu ditentukan MANUAL per akun (kolom J "Akses Menu").
   Super User selalu melihat semua menu. Akun lain hanya menu yang dicentang. */
function _bolehAksesMenu(sesi, page) {
  if (!page) return false;
  var role = String((sesi && sesi.role) || "").trim();
  if (role === "Super User") return true; // selalu semua menu
  var akses = _parseAksesMenu(sesi && sesi.aksesMenu);
  if (akses.indexOf(page) >= 0) return true;
  var parent = PAGE_ACCESS_PARENT[page] || "";
  return !!parent && akses.indexOf(parent) >= 0;
}

/* Saran default daftar menu saat menambah/mengubah akun (boleh diubah Super User).
   Berbasis Role/Bidang/Tim — sekadar usulan, bukan penentu akses final. */
function _saranAksesMenu(role, bidang, tim) {
  role = String(role || "").trim();
  bidang = String(bidang || "").trim();
  tim = String(tim || "").trim();
  if (role === "Super User" || role === "Admin")
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

function _assertSuperUser(token) {
  var sesi = getSesiByToken(token);
  if (!sesi) throw new Error("Sesi habis, silakan login ulang.");
  if (String(sesi.role || "").trim() !== "Super User")
    throw new Error("Akses ditolak: menu ini khusus Super User.");
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

/* Daftar semua menu yang tersedia (key + label) untuk dicentang per akun. */
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
  baris[COL_USERS.password] = String(data.password || "").trim();
  baris[COL_USERS.role] = String(data.role || "").trim();
  baris[COL_USERS.ulp] = String(data.ulp || "").trim();
  baris[COL_USERS.kodeUlp] = String(data.kodeUlp || "").trim();
  baris[COL_USERS.bidang] = String(data.bidang || "").trim();
  baris[COL_USERS.tim] = String(data.tim || "").trim();
  baris[COL_USERS.subTim] = String(data.subTim || "").trim();
  baris[COL_USERS.aksesMenu] = akses;
  sh.appendRow(baris);
  SpreadsheetApp.flush();
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
      String(data.password).trim(),
    );
  SpreadsheetApp.flush();
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
  return { ok: true };
}

function resetPasswordAkun(token, username, passwordBaru) {
  _assertSuperUser(token);
  var sh = _akunSheet();
  var row = _findRowAkun(sh, String(username || "").trim());
  if (row === -1) return { ok: false, message: "Akun tidak ditemukan." };
  if (!String(passwordBaru || "").trim())
    return { ok: false, message: "Password baru wajib diisi." };
  sh.getRange(row, COL_USERS.password + 1).setValue(
    String(passwordBaru).trim(),
  );
  SpreadsheetApp.flush();
  return { ok: true };
}

/* Ganti password sendiri — untuk SEMUA user (verifikasi password lama). */
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
    if (pwTersimpan !== pwLama)
      return { ok: false, message: "Password lama salah." };

    sh.getRange(row, COL_USERS.password + 1).setValue(pwBaru);
    SpreadsheetApp.flush();
    return { ok: true, message: "Password berhasil diganti." };
  } catch (e) {
    return { ok: false, message: "Error: " + e.message };
  }
}
