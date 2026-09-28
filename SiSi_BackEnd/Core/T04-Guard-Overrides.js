/* ═════════════════════════════════════
   T04-Guard-Overrides.js
   Guard shim untuk entry point yang masih berada di Code.js.
   Code-Mobile.js sengaja tidak dimuat di appsscript.json karena implementasi
   updateMobileEksekusiRow di sana masih stub dan akan menimpa implementasi
   lengkap yang masih berada di Code.js.
═════════════════════════════════════ */

/* Simpan implementasi lengkap dari Code.js sebelum memasang wrapper. */
var _t04DoGetOriginal_ = doGet;
var _t04DoPostOriginal_ = doPost;
var _t04GetMobileDropdownRowOriginal_ = getMobileDropdownRow;
var _t04SimpanMobileEksekusiRowOriginal_ = simpanMobileEksekusiRow;

/* PDF wajib memiliki sesi sah dan ULP. Jalur login/public tetap terbuka. */
doGet = function (e) {
  if (e && e.parameter && e.parameter.pdf) {
    guard_({ token: String(e.parameter.token || "").trim() }, {
      ulp: true,
      aksi: "doGet.pdf",
    });
  }
  return _t04DoGetOriginal_(e);
};

/*
 * doPost punya dua autentikasi yang berbeda:
 * - mobile: autentikasi token sesi ditangani apiRouter_;
 * - webhook: autentikasi secret body ditangani webhookVerifikasi_.
 * Jangan pakai guard_ pada webhook karena webhook tidak memiliki sesi pengguna.
 * Wrapper ini menolak webhook sebelum menyentuh handler lama, lalu handler lama
 * mengulang verifikasi sebagai defense-in-depth sebelum memproses action.
 */
doPost = function (e) {
  if (e && e.parameter && e.parameter.mobile) {
    return _t04DoPostOriginal_(e);
  }

  var body = {};
  try {
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    audit_(null, "WEBHOOK", "", "TOLAK", "body JSON tidak valid");
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      message: "Body webhook harus JSON valid.",
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var ver = webhookVerifikasi_(body);
  if (!ver.ok) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      message: ver.message,
      kode: ver.kode,
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return _t04DoPostOriginal_(e);
};

/* Dropdown adalah resource bersama, tetapi tetap wajib berasal dari sesi sah. */
getMobileDropdownRow = function (token) {
  guard_(arguments, { ulp: false, aksi: "getMobileDropdownRow" });
  return _t04GetMobileDropdownRowOriginal_(token);
};

/* Simpan ROW wajib terikat ke ULP sesi, bukan input klien. */
simpanMobileEksekusiRow = function (payload) {
  guard_(arguments, { ulp: true, aksi: "simpanMobileEksekusiRow" });
  return _t04SimpanMobileEksekusiRowOriginal_(payload);
};
