/* ═════════════════════════════════════
   T04-Guard-Overrides.js
   Guard shim sementara untuk entry point yang masih berada di Code.js.
   Code-Mobile.js sengaja belum dimuat di appsscript.json karena implementasi
   updateMobileEksekusiRow di sana masih stub dan akan menimpa fungsi lengkap.
═════════════════════════════════════ */

/* Simpan implementasi lengkap dari Code.js sebelum memasang wrapper. */
var _t04DoGetOriginal_ = doGet;
var _t04GetMobileDropdownRowOriginal_ = getMobileDropdownRow;
var _t04SimpanMobileEksekusiRowOriginal_ = simpanMobileEksekusiRow;

/* PDF wajib memiliki sesi sah dan ULP. Jalur login/public tetap terbuka. */
function doGet(e) {
  if (e && e.parameter && e.parameter.pdf) {
    guard_({ token: String(e.parameter.token || "").trim() }, {
      ulp: true,
      aksi: "doGet.pdf",
    });
  }
  return _t04DoGetOriginal_(e);
}

/* Dropdown adalah resource bersama, tetapi tetap wajib berasal dari sesi sah. */
function getMobileDropdownRow(token) {
  guard_(arguments, { ulp: false, aksi: "getMobileDropdownRow" });
  return _t04GetMobileDropdownRowOriginal_(token);
}

/* Simpan ROW wajib terikat ke ULP sesi, bukan input klien. */
function simpanMobileEksekusiRow(payload) {
  guard_(arguments, { ulp: true, aksi: "simpanMobileEksekusiRow" });
  return _t04SimpanMobileEksekusiRowOriginal_(payload);
}
