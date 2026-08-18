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

/* ═══ MAPPING FILE HTML DENGAN STRUKTUR FOLDER ═══ */
var PAGE_FILE_ALIASES = {
  "SIE-LaporanTeknik": "Teknik/SIE-Teknik",
  "SIE-Teknik": "Teknik/SIE-Teknik",
  "Tek-ROW": "ROW/Tek-ROW",
  "Tek-InsJar": "Inspeksi_Jaringan/Tek-InsJar",
  "Tek-InsDu": "Inspeksi_Gardu/Tek-InsDu",
  "Tek-Yandal": "Yandal/Tek-Yandal",
  "Tek-Hartek": "Hartek/Tek-Hartek",
  "Tek-Data-Checkpoint": "Teknik/Tek-Data-Checkpoint",
  "SIE-BeritaAcara": "SIE-BeritaAcara",
  "PP-Dashboard": "PP-Dashboard",
  "TE-Dashboard": "TE-Dashboard",
  "K3-Dashboard": "K3-Dashboard",
  Main: "Core/Main",
  "login-page": "Core/login-page",
};

var PAGE_ACCESS_PARENT = {
  "SIE-LaporanTeknik": "SIE-Teknik",
  "SIE-BeritaAcara": "SIE-Teknik",
  "Tek-Data-Checkpoint": "SIE-Teknik",
};

/* Helper smart include & createHtmlOutput agar tahan path folder maupun non-folder */
function _getHtmlOutputFromFileSafe_(filename) {
  var possibleNames = [
    PAGE_FILE_ALIASES[filename] || filename,
    filename,
    "Core/" + filename,
    "ROW/" + filename,
    "Teknik/" + filename,
    "Inspeksi_Jaringan/" + filename,
    "Inspeksi_Gardu/" + filename,
    "Yandal/" + filename,
    "Hartek/" + filename,
  ];

  for (var i = 0; i < possibleNames.length; i++) {
    try {
      return HtmlService.createHtmlOutputFromFile(possibleNames[i]);
    } catch (e) {}
  }
  return HtmlService.createHtmlOutputFromFile(filename);
}

function _getHtmlTemplateFromFileSafe_(filename) {
  var possibleNames = [
    PAGE_FILE_ALIASES[filename] || filename,
    filename,
    "Core/" + filename,
    "ROW/" + filename,
    "Teknik/" + filename,
    "Inspeksi_Jaringan/" + filename,
    "Inspeksi_Gardu/" + filename,
    "Yandal/" + filename,
    "Hartek/" + filename,
  ];

  for (var i = 0; i < possibleNames.length; i++) {
    try {
      return HtmlService.createTemplateFromFile(possibleNames[i]);
    } catch (e) {}
  }
  return HtmlService.createTemplateFromFile(filename);
}

function include(filename) {
  return _getHtmlOutputFromFileSafe_(filename).getContent();
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

/* ═══ MOBILE API LAYER (dipanggil Flutter via ?mobile=1) ═══
   GET  : /exec?mobile=1&action=xxx&token=xxx&...
   POST : body JSON { action:'xxx', token:'xxx', ... }
   Semua balikan JSON, tidak render HTML. */
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

      case "cekSesi":
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
function doGet(e) {
  // MOBILE: rute semua request Flutter (?mobile=1) ke apiRouter_, balikan JSON murni.
  if (e && e.parameter && e.parameter.mobile) return apiRouter_(e, null);

  if (e && e.parameter && e.parameter.pdf) {
    if (String(e.parameter.pdf).trim().toLowerCase() === "gardu")
      return unduhPdfInsGardu(e);
    return unduhPdfROW(e);
  }

  var token = (e && e.parameter && e.parameter.token) || "";
  var svcUrl = ScriptApp.getService().getUrl();

  if (!token) {
    var t1 = _getHtmlTemplateFromFileSafe_("login-page");
    t1.error = "";
    t1.scriptUrl = svcUrl;
    return t1
      .evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  var sesi = getSesiByToken(token);
  if (!sesi) {
    var t2 = _getHtmlTemplateFromFileSafe_("login-page");
    t2.error = "Sesi habis, silakan login ulang.";
    t2.scriptUrl = svcUrl;
    return t2
      .evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  try {
    CacheService.getUserCache().put("userToken", token, SESSION_TTL_SEC);
  } catch (e) {}

  return _getHtmlTemplateFromFileSafe_("Main")
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/* ═══ WEBHOOK (POST) — dipanggil oleh Bot AppSheet ═══ */
var WEBHOOK_SECRET = "GANTI_DENGAN_SECRET_KAMU";

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
      var tim = String(body.tim || "").trim();
      var tanggal =
        _normTgl(body.tanggal || new Date()) || _normTgl(new Date());
      if (typeof markRecalcRowDirty_ === "function") {
        var tanda = markRecalcRowDirty_(tim, tanggal);
        out = {
          ok: true,
          action: action,
          queued: tanda,
          tim: tim,
          tanggal: tanggal,
        };
      } else {
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
          var hasilW = recalcWaByHeader(kodeHeader);
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
      var kodeP0 = String(body.kodeP0 || "").trim();
      var fotoTg = String(body.foto || "").trim();
      if (!kodeP0) {
        out = { ok: false, message: "prosesP0Yandal butuh kodeP0" };
      } else if (typeof enqueueP0Yandal_ === "function") {
        var antre = enqueueP0Yandal_(kodeP0, fotoTg);
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
      var kodeSwc = String(body.kodeSwitching || "").trim();
      var fotoSwc = String(body.foto || "").trim();
      if (!kodeSwc) {
        out = {
          ok: false,
          message: "prosesSwitchingYandal butuh kodeSwitching",
        };
      } else if (typeof enqueueP0Yandal_ === "function") {
        var antreSwc = enqueueP0Yandal_(kodeSwc, fotoSwc);
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
      var kodePgH = String(body.kodePG || "").trim();
      if (!kodePgH) {
        out = { ok: false, message: "prosesHartekPG butuh kodePG" };
      } else if (typeof prosesHartekPG === "function") {
        out = prosesHartekPG(kodePgH);
      } else {
        out = { ok: false, message: "prosesHartekPG tidak tersedia" };
      }
    } else if (action === "cekBarisHartekPG") {
      var kodePgCek = String(body.kodePG || "").trim();
      if (!kodePgCek) {
        out = { ok: false, message: "cekBarisHartekPG butuh kodePG" };
      } else if (typeof cekBarisHartekPG === "function") {
        out = cekBarisHartekPG(kodePgCek);
      } else {
        out = { ok: false, message: "cekBarisHartekPG tidak tersedia" };
      }
    } else if (action === "prosesHartekPekerjaan") {
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
      var kodeMatH = String(body.kodeMaterial || "").trim();
      if (!kodeMatH) {
        out = { ok: false, message: "prosesHartekMaterial butuh kodeMaterial" };
      } else if (typeof prosesHartekMaterial === "function") {
        out = prosesHartekMaterial(kodeMatH);
      } else {
        out = { ok: false, message: "prosesHartekMaterial tidak tersedia" };
      }
    } else if (action === "prosesHartekHarGrounding") {
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
function createRecalcRowTrigger() {
  return createRecalcTrigger();
}
function hapusRecalcRowTrigger() {
  return hapusRecalcTrigger();
}

/* ═══ BACKSTOP WA ═══ */
var REFRESH_WA_INTERVAL_MIN = 15;

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

    var html = _getHtmlOutputFromFileSafe_(pageName).getContent();
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

/* ═══ LAPORAN HARIAN (db_Global_Header) ═══ */
function getMobileLaporanHarian(token, subTim, tim, tanggal, limit) {
  try {
    var sesi = getSesiByToken(token);
    if (!sesi)
      return { success: false, message: "Sesi habis, silakan login ulang." };

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

/**
 * Mengambil list Penyulang dan pemetaan Section untuk form input ROW di mobile
 */
function getMobileDropdownRow(token) {
  try {
    var sesi = getSesiByToken(token);
    if (!sesi)
      return { success: false, message: "Sesi habis, silakan login ulang." };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var shP = ss.getSheetByName("db_Penyulang");
    if (!shP || shP.getLastRow() < 2) {
      return { success: true, penyulang: [], sectionByPenyulang: {} };
    }

    var data = shP.getRange(2, 1, shP.getLastRow() - 1, 6).getValues();
    var penyulangSet = {};
    var sectionByPenyulang = {};

    for (var i = 0; i < data.length; i++) {
      var peny = String(data[i][2] || "").trim(); // Kolom C = Penyulang
      var sec = String(data[i][4] || "").trim(); // Kolom E = Section
      if (!peny) continue;

      if (!penyulangSet[peny]) {
        penyulangSet[peny] = true;
        sectionByPenyulang[peny] = [];
      }
      if (sec && sectionByPenyulang[peny].indexOf(sec) === -1) {
        sectionByPenyulang[peny].push(sec);
      }
    }

    var listPenyulang = Object.keys(penyulangSet).sort();
    listPenyulang.forEach(function (p) {
      sectionByPenyulang[p].sort();
    });

    return {
      success: true,
      penyulang: listPenyulang,
      sectionByPenyulang: sectionByPenyulang,
    };
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
    var sesi = getSesiByToken(token);
    if (!sesi)
      return { success: false, message: "Sesi habis, silakan login ulang." };

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
        var rootFolders = DriveApp.getFoldersByName(baseFolderNama);
        var curFolder = rootFolders.hasNext()
          ? rootFolders.next()
          : DriveApp.createFolder(baseFolderNama);

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

        // Path hierarki: AppSheet SiSi - ULP Toboali / Eksekusi ROW / {Tahun} / {Bulan} / {Tgl} / {Tim} / {uniqueKode}
        var subPath = [
          "Eksekusi ROW",
          tahunStr,
          blnStr,
          tglHari,
          tim,
          uniqueKode,
        ];
        relativeFolderPath = baseFolderNama + "/" + subPath.join("/");

        for (var p = 0; p < subPath.length; p++) {
          var subName = subPath[p];
          var subs = curFolder.getFoldersByName(subName);
          curFolder = subs.hasNext()
            ? subs.next()
            : curFolder.createFolder(subName);
        }
        folderUpload = curFolder;
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

    // Trigger otomatis rantai bottom-up prosesEksekusiROW agar Kode Header, Kode Pekerjaan,
    // Realisasi & WA ter-update seketika
    var hasilRantai = null;
    try {
      if (typeof prosesEksekusiROW === "function") {
        hasilRantai = prosesEksekusiROW(uniqueKode);
      }
    } catch (eRantai) {
      Logger.log(
        "[simpanMobileEksekusiRow] prosesEksekusiROW info: " + eRantai.message,
      );
    }

    return {
      success: true,
      message: "Data eksekusi pekerjaan berhasil disimpan.",
      kodeEksekusi:
        hasilRantai && hasilRantai.kodeEksekusi
          ? hasilRantai.kodeEksekusi
          : uniqueKode,
      rantai: hasilRantai,
    };
  } catch (err) {
    return {
      success: false,
      message: "Error simpanMobileEksekusiRow: " + err.message,
    };
  }
}
