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
var _t04ReportContextToken_ = "";

function _t04GuardReport_(args, aksi) {
  if (_t04ReportContextToken_) {
    return guard_({ token: _t04ReportContextToken_ }, { ulp: true, aksi: aksi });
  }
  return guard_(args, { ulp: true, aksi: aksi });
}

function _t04ScopedReportParams_(params, g) {
  var out = {};
  params = params || {};
  Object.keys(params).forEach(function (key) { out[key] = params[key]; });
  /* Non-Super tidak boleh memilih ULP lain dari payload. */
  if (!g.isSuper) out.ulp = g.ulp;
  return out;
}

function _t04WithReportContext_(token, fn) {
  var previous = _t04ReportContextToken_;
  _t04ReportContextToken_ = token || previous;
  try {
    return fn();
  } finally {
    _t04ReportContextToken_ = previous;
  }
}

function getLaporanUP3(params) {
  var g = _t04GuardReport_(arguments, "getLaporanUP3");
  return _t04GetLaporanUP3Original_(_t04ScopedReportParams_(params, g));
}

function getLaporanWilayah(params) {
  var g = _t04GuardReport_(arguments, "getLaporanWilayah");
  return _t04GetLaporanWilayahOriginal_(_t04ScopedReportParams_(params, g));
}

function simpanLaporanHarianWeb(params) {
  var g = _t04GuardReport_(arguments, "simpanLaporanHarianWeb");
  return _t04SimpanLaporanHarianWebOriginal_(_t04ScopedReportParams_(params, g));
}

function getLaporanHarianRow(params) {
  _t04GuardReport_(arguments, "getLaporanHarianRow");
  return _t04GetLaporanHarianRowOriginal_(params || {});
}

function refreshLaporanHarian(params) {
  var g = _t04GuardReport_(arguments, "refreshLaporanHarian");
  return _t04RefreshLaporanHarianOriginal_(_t04ScopedReportParams_(params, g));
}

function getMobileLaporanUp3Uiw(params) {
  var g = _t04GuardReport_(arguments, "getMobileLaporanUp3Uiw");
  return _t04WithReportContext_(g.token, function () {
    return _t04GetMobileLaporanUp3UiwOriginal_(params || {});
  });
}

function simpanMobileLaporanC4A(params) {
  var g = _t04GuardReport_(arguments, "simpanMobileLaporanC4A");
  return _t04WithReportContext_(g.token, function () {
    return _t04SimpanMobileLaporanC4AOriginal_(_t04ScopedReportParams_(params, g));
  });
}
