/* ═════════════════════════════════════
   T04-Remaining-Guards.js
   Guard wrappers untuk endpoint laporan yang tetap top-level agar dapat
   dipanggil langsung melalui google.script.run.

   File ini harus dimuat SETELAH modul Teknik/Tek-LapUP3UIWHarian.js.
═════════════════════════════════════ */

var _t04GetLaporanUP3Original_ = getLaporanUP3;
var _t04GetLaporanWilayahOriginal_ = getLaporanWilayah;
var _t04SimpanLaporanHarianWebOriginal_ = simpanLaporanHarianWeb;
var _t04GetLaporanHarianRowOriginal_ = getLaporanHarianRow;
var _t04RefreshLaporanHarianOriginal_ = refreshLaporanHarian;
var _t04GetMobileLaporanUp3UiwOriginal_ = getMobileLaporanUp3Uiw;
var _t04SimpanMobileLaporanC4AOriginal_ = simpanMobileLaporanC4A;

function _t04ScopedReportParams_(params, g) {
  var out = {};
  params = params || {};
  Object.keys(params).forEach(function (key) { out[key] = params[key]; });
  /* Non-Super tidak boleh memilih ULP lain dari payload. */
  if (!g.isSuper) out.ulp = g.ulp;
  return out;
}

function getLaporanUP3(params) {
  var g = guard_(arguments, { ulp: true, aksi: "getLaporanUP3" });
  return _t04GetLaporanUP3Original_(_t04ScopedReportParams_(params, g));
}

function getLaporanWilayah(params) {
  var g = guard_(arguments, { ulp: true, aksi: "getLaporanWilayah" });
  return _t04GetLaporanWilayahOriginal_(_t04ScopedReportParams_(params, g));
}

function simpanLaporanHarianWeb(params) {
  var g = guard_(arguments, { ulp: true, aksi: "simpanLaporanHarianWeb" });
  return _t04SimpanLaporanHarianWebOriginal_(_t04ScopedReportParams_(params, g));
}

function getLaporanHarianRow(params) {
  guard_(arguments, { ulp: true, aksi: "getLaporanHarianRow" });
  return _t04GetLaporanHarianRowOriginal_(params || {});
}

function refreshLaporanHarian(params) {
  var g = guard_(arguments, { ulp: true, aksi: "refreshLaporanHarian" });
  return _t04RefreshLaporanHarianOriginal_(_t04ScopedReportParams_(params, g));
}

function getMobileLaporanUp3Uiw(params) {
  guard_(arguments, { ulp: true, aksi: "getMobileLaporanUp3Uiw" });
  return _t04GetMobileLaporanUp3UiwOriginal_(params || {});
}

function simpanMobileLaporanC4A(params) {
  var g = guard_(arguments, { ulp: true, aksi: "simpanMobileLaporanC4A" });
  return _t04SimpanMobileLaporanC4AOriginal_(_t04ScopedReportParams_(params, g));
}
