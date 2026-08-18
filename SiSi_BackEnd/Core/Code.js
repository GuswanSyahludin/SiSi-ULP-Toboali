/* ═════════════════════════════════════
   Code.gs — SiSi ULP Toboali (BAGIAN 1: INTI / SHARED & WEB + MOBILE ROUTER)
   Google Apps Script Backend
   Rev: 19 Agu 2026 (Lengkap Utuh Web Navigasi + Mobile API Layer + Yandal Router)
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

/* Peta kolom db_Users (0-based) */
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

/* ═══ MOBILE API LAYER (dipanggil Flutter via ?mobile=1) ═══ */
function apiRouter_(e, body) {
  var p = (e && e.parameter) || {};
  var action = (body && body.action) || p.action || "";
  var result;

  try {
    switch (action) {
      // 1. Autentikasi & Akun
      case "login":
        result = doLogin(
          body ? body.username : p.username,
          body ? body.password : p.password,
        );
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

      // 4. Verifikasi & Approval P0 (db_Yandal_P0, db_Yandal_Pengecekan_Switching, Pengukuran Gardu)
      case "getMobileApprovalP0List":
      case "getApprovalP0List":
        result =
          typeof getApprovalP0List === "function"
            ? getApprovalP0List(body || p)
            : {
                ok: false,
                error:
                  "getApprovalP0List tidak ditemukan di Tek-Yandal-Code.js",
              };
        break;

      case "setMobileApprovalP0":
      case "setApprovalP0":
        result =
          typeof setApprovalP0 === "function"
            ? setApprovalP0(body || p)
            : {
                ok: false,
                error: "setApprovalP0 tidak ditemukan di Tek-Yandal-Code.js",
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
                  "getLampiranPengecekanP0 tidak ditemukan di Tek-Yandal-Code.js",
              };
        break;

      case "getListPekerjaanP0":
        result =
          typeof getListPekerjaanP0 === "function"
            ? getListPekerjaanP0()
            : {
                ok: false,
                error:
                  "getListPekerjaanP0 tidak ditemukan di Tek-Yandal-Code.js",
              };
        break;

      case "updateNamaPekerjaanP0":
        result =
          typeof updateNamaPekerjaanP0 === "function"
            ? updateNamaPekerjaanP0(body || p)
            : {
                ok: false,
                error:
                  "updateNamaPekerjaanP0 tidak ditemukan di Tek-Yandal-Code.js",
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

/* ═══ ENTRY POINT (GET) ═══ */
function doGet(e) {
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

/* ═══ WEBHOOK & ENTRY POINT (POST) ═══ */
var WEBHOOK_SECRET = "GANTI_DENGAN_SECRET_KAMU";

function doPost(e) {
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
        out = { ok: false, message: "enqueueP0Yandal_ tidak tersedia" };
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
        out = { ok: false, message: "enqueueP0Yandal_ tidak tersedia" };
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

/* ═══ SESI & LOGIN ═══ */
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

/* ═══ HALAMAN KONTEN WEB (PINDAH HALAMAN WEBPAGE) ═══ */
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
    var sh = ss.getSheetByName("db_Global_Header");
    if (!sh)
      return {
        success: false,
        message: "Sheet db_Global_Header tidak ditemukan.",
      };

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

    for (var i = rawData.length - 1; i >= 0; i--) {
      var r = rawData[i];
      var rKodeHeader = String(r[1] || "").trim();
      if (!rKodeHeader) continue;

      var rTanggal = _normTgl(r[4]);
      var rTim = String(r[5] || "").trim();
      var rSubTim = String(r[6] || "").trim();

      if (filterSubTim && rSubTim.toLowerCase() !== filterSubTim) continue;
      if (filterTim && rTim.toLowerCase() !== filterTim) continue;
      if (filterTgl && rTanggal !== filterTgl) continue;

      hasil.push({
        no: r[0],
        kodeHeader: rKodeHeader,
        ulp: String(r[2] || "").trim(),
        hari: String(r[3] || "").trim(),
        tanggal: rTanggal,
        tim: rTim,
        subTim: rSubTim,
        koordinatAwal: String(r[7] || "").trim(),
        koordinatAkhir: String(r[8] || "").trim(),
        kmAwal: String(r[9] || "").trim(),
        kmAkhir: String(r[10] || "").trim(),
        kendala: String(r[11] || "").trim(),
        waText: String(r[12] || "").trim(),
        timestamp: String(r[13] || "").trim(),
        inputBy: String(r[14] || "").trim(),
        timestampUpdate: String(r[15] || "").trim(),
        statusTextWa: String(r[16] || "").trim(),
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
    var sectionMap = {};

    for (var i = 0; i < data.length; i++) {
      var peny = String(data[i][2] || "").trim();
      var sec = String(data[i][4] || "").trim();
      if (!peny) continue;

      if (!penyulangSet[peny]) {
        penyulangSet[peny] = true;
        sectionMap[peny] = [];
      }
      if (sec && sectionMap[peny].indexOf(sec) === -1) {
        sectionMap[peny].push(sec);
      }
    }

    var listPenyulang = Object.keys(penyulangSet).sort();
    listPenyulang.forEach(function (p) {
      sectionMap[p].sort();
    });

    return {
      success: true,
      penyulang: listPenyulang,
      sectionByPenyulang: sectionMap,
    };
  } catch (err) {
    return {
      success: false,
      message: "Error getMobileDropdownRow: " + err.message,
    };
  }
}

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

    for (var i = rawData.length - 1; i >= 0; i--) {
      var r = rawData[i];
      var kodeEksekusi = String(r[3] || "").trim();
      var noTiang = String(r[10] || "").trim();
      if (!kodeEksekusi && !noTiang) continue;

      var rTanggal = _normTgl(r[6]);
      var rTim = String(r[7] || "").trim();

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

    var uniqueKode = Utilities.getUuid()
      .replace(/-/g, "")
      .substring(0, 8)
      .toUpperCase();

    var ulp = String(sesi.ulp || "").trim();
    var tglObj = new Date();
    var tglStr = Utilities.formatDate(tglObj, tz, "yyyy-MM-dd");
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
    var tim = String(sesi.subTim || sesi.tim || "ROW").trim();

    var penyulang = String(payload.penyulang || "").trim();
    var section = String(payload.section || "").trim();
    var nomorTiang = String(payload.nomorTiang || "").trim();

    var koorTiang = String(payload.koordinatTiang || "").trim();
    var latTiang = "";
    var longTiang = "";
    if (koorTiang && koorTiang.indexOf(",") >= 0) {
      var splitTiang = koorTiang.split(",");
      latTiang = parseFloat(splitTiang[0].trim()) || "";
      longTiang = parseFloat(splitTiang[1].trim()) || "";
    }

    var koorPek = String(payload.koordinatPekerjaan || "").trim() || koorTiang;
    var latPek = "";
    var longPek = "";
    if (koorPek && koorPek.indexOf(",") >= 0) {
      var splitPek = koorPek.split(",");
      latPek = parseFloat(splitPek[0].trim()) || "";
      longPek = parseFloat(splitPek[1].trim()) || "";
    }

    var diameter = Number(payload.diameter) || 0;
    var jenisPekerjaan = "Rabas / Pangkas";
    if (diameter > 50) {
      jenisPekerjaan = "Tebang Besar";
    } else if (diameter > 0) {
      jenisPekerjaan = "Tebang Sedang";
    }

    var inputOleh = String(sesi.username || "").trim();
    var timestamp = now;

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
        var jamStr = Utilities.formatDate(now, "Asia/Jakarta", "HHmmss");
        var fileNameOnly = uniqueKode + "." + tagTipe + "." + jamStr + ".jpg";

        var targetFolder = _getFolderRow_();
        var blob = Utilities.newBlob(decoded, mimeType, fileNameOnly);
        var file = targetFolder.createFile(blob);
        file.setSharing(
          DriveApp.Access.ANYONE_WITH_LINK,
          DriveApp.Permission.VIEW,
        );

        return {
          nama: relativeFolderPath + "/" + fileNameOnly,
          url: "https://lh3.googleusercontent.com/d/" + file.getId(),
        };
      } catch (eFoto) {
        return { nama: "", url: "" };
      }
    }

    if (payload.fotoSebelumBase64)
      fSbl = _simpanFotoBase64_(payload.fotoSebelumBase64, "Foto Sebelum");
    if (payload.fotoPekerjaanBase64)
      fPkj = _simpanFotoBase64_(payload.fotoPekerjaanBase64, "Foto Pekerjaan");
    if (payload.fotoSesudahBase64)
      fSsd = _simpanFotoBase64_(payload.fotoSesudahBase64, "Foto Sesudah");

    var baris = new Array(30).fill("");
    baris[1] = "";
    baris[2] = "";
    baris[3] = uniqueKode;
    baris[4] = ulp;
    baris[5] = hari;
    baris[6] = tglObj;
    baris[7] = tim;
    baris[8] = penyulang;
    baris[9] = section;
    baris[10] = nomorTiang;
    baris[11] = koorTiang;
    baris[12] = latTiang;
    baris[13] = longTiang;
    baris[14] = koorPek;
    baris[15] = latPek;
    baris[16] = longPek;
    baris[17] = fSbl.nama;
    baris[18] = fSbl.url;
    baris[19] = fPkj.nama;
    baris[20] = fPkj.url;
    baris[21] = fSsd.nama;
    baris[22] = fSsd.url;
    baris[23] = diameter;
    baris[24] = jenisPekerjaan;
    baris[25] = fSbl.url ? "Y" : "N";
    baris[26] = fPkj.url ? "Y" : "N";
    baris[27] = fSsd.url ? "Y" : "N";
    baris[28] = inputOleh;
    baris[29] = timestamp;

    var targetRow = sh.getLastRow() + 1;
    sh.getRange(targetRow, 2, 1, 29).setValues([baris.slice(1)]);
    sh.getRange(targetRow, 30).setNumberFormat("dd/MM/yyyy HH:mm:ss");
    SpreadsheetApp.flush();

    var hasilRantai = null;
    try {
      if (typeof prosesEksekusiROW === "function") {
        hasilRantai = prosesEksekusiROW(uniqueKode);
      }
    } catch (eRantai) {}

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
