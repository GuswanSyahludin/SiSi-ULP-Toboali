/* ═════════════════════════════════════
   T04-Remaining-Guards.js
   Guard wrappers untuk endpoint top-level yang dapat dipanggil langsung melalui
   google.script.run. File ini harus dimuat setelah seluruh modul endpoint.
═════════════════════════════════════ */

/* Capture originals before assignment-style wrappers replace them. */
var _t04GetLaporanUP3Original_ = getLaporanUP3;
var _t04GetLaporanWilayahOriginal_ = getLaporanWilayah;
var _t04SimpanLaporanHarianWebOriginal_ = simpanLaporanHarianWeb;
var _t04GetLaporanHarianRowOriginal_ = getLaporanHarianRow;
var _t04RefreshLaporanHarianOriginal_ = refreshLaporanHarian;
var _t04GetMobileLaporanUp3UiwOriginal_ = getMobileLaporanUp3Uiw;
var _t04SimpanMobileLaporanC4AOriginal_ = simpanMobileLaporanC4A;

/* SIE/GASPOL dan monitoring */
var _t04GetGaspolRekapOriginal_ = getGaspolRekap;
var _t04SubmitGaspolOriginal_ = submitGaspolToInputTbl;
var _t04GetMonitoringTlTemuanOriginal_ = getMonitoringTlTemuan;

/* Data Pendukung CheckPoint */
var _t04GetDpgHarMatrixOriginal_ = getDpgHarMatrix;
var _t04GetDpgCoverGarduOriginal_ = getDpgCoverGardu;
var _t04GetDpgGangguanPenyulangOriginal_ = getDpgGangguanPenyulang;
var _t04GetDpgGangguanChartsOriginal_ = getDpgGangguanCharts;
var _t04GetDpgRekapTemuanOriginal_ = getDpgRekapTemuan;
var _t04GetDpgSectionListOriginal_ = getDpgSectionList;

var _t04ReportContextToken_ = "";

function _t04GuardReport_(args, aksi) {
  if (_t04ReportContextToken_) {
    return guard_({ token: _t04ReportContextToken_ }, { ulp: true, aksi: aksi });
  }
  return guard_(args, { ulp: true, aksi: aksi });
}

function _t04CopyScopedParams_(params, g, forceUsername) {
  var out = {};
  params = params || {};
  Object.keys(params).forEach(function (key) { out[key] = params[key]; });
  /* Non-Super tidak boleh memilih ULP lain dari payload. */
  if (!g.isSuper) out.ulp = g.ulp;
  if (forceUsername) out.username = g.username;
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

getLaporanUP3 = function (params) {
  var g = _t04GuardReport_(arguments, "getLaporanUP3");
  return _t04GetLaporanUP3Original_(_t04CopyScopedParams_(params, g, false));
};
getLaporanWilayah = function (params) {
  var g = _t04GuardReport_(arguments, "getLaporanWilayah");
  return _t04GetLaporanWilayahOriginal_(_t04CopyScopedParams_(params, g, false));
};
simpanLaporanHarianWeb = function (params) {
  var g = _t04GuardReport_(arguments, "simpanLaporanHarianWeb");
  return _t04SimpanLaporanHarianWebOriginal_(_t04CopyScopedParams_(params, g, false));
};
getLaporanHarianRow = function (params) {
  _t04GuardReport_(arguments, "getLaporanHarianRow");
  return _t04GetLaporanHarianRowOriginal_(params || {});
};
refreshLaporanHarian = function (params) {
  var g = _t04GuardReport_(arguments, "refreshLaporanHarian");
  return _t04RefreshLaporanHarianOriginal_(_t04CopyScopedParams_(params, g, false));
};
getMobileLaporanUp3Uiw = function (params) {
  var g = _t04GuardReport_(arguments, "getMobileLaporanUp3Uiw");
  return _t04WithReportContext_(g.token, function () {
    return _t04GetMobileLaporanUp3UiwOriginal_(params || {});
  });
};
simpanMobileLaporanC4A = function (params) {
  var g = _t04GuardReport_(arguments, "simpanMobileLaporanC4A");
  return _t04WithReportContext_(g.token, function () {
    return _t04SimpanMobileLaporanC4AOriginal_(_t04CopyScopedParams_(params, g, false));
  });
};

/* SIE/GASPOL. */
getGaspolRekap = function (opts) {
  var g = _t04GuardReport_(arguments, "getGaspolRekap");
  return _t04WithReportContext_(g.token, function () {
    return _t04GetGaspolRekapOriginal_(_t04CopyScopedParams_(opts, g, false));
  });
};
submitGaspolToInputTbl = function (opts) {
  var g = _t04GuardReport_(arguments, "submitGaspolToInputTbl");
  return _t04WithReportContext_(g.token, function () {
    return _t04SubmitGaspolOriginal_(_t04CopyScopedParams_(opts, g, false));
  });
};
getMonitoringTlTemuan = function (params) {
  var g = _t04GuardReport_(arguments, "getMonitoringTlTemuan");
  return _t04WithReportContext_(g.token, function () {
    return _t04GetMonitoringTlTemuanOriginal_(_t04CopyScopedParams_(params, g, true));
  });
};

/* Data Pendukung CheckPoint. */
getDpgHarMatrix = function (opts) {
  var g = _t04GuardReport_(arguments, "getDpgHarMatrix");
  return _t04GetDpgHarMatrixOriginal_(_t04CopyScopedParams_(opts, g, false));
};
getDpgCoverGardu = function (opts) {
  var g = _t04GuardReport_(arguments, "getDpgCoverGardu");
  return _t04GetDpgCoverGarduOriginal_(_t04CopyScopedParams_(opts, g, false));
};
getDpgGangguanPenyulang = function (opts) {
  var g = _t04GuardReport_(arguments, "getDpgGangguanPenyulang");
  return _t04GetDpgGangguanPenyulangOriginal_(_t04CopyScopedParams_(opts, g, false));
};
getDpgGangguanCharts = function (opts) {
  var g = _t04GuardReport_(arguments, "getDpgGangguanCharts");
  return _t04GetDpgGangguanChartsOriginal_(_t04CopyScopedParams_(opts, g, false));
};
getDpgRekapTemuan = function (opts) {
  var g = _t04GuardReport_(arguments, "getDpgRekapTemuan");
  return _t04GetDpgRekapTemuanOriginal_(_t04CopyScopedParams_(opts, g, false));
};
getDpgSectionList = function (opts) {
  var g = _t04GuardReport_(arguments, "getDpgSectionList");
  return _t04GetDpgSectionListOriginal_(_t04CopyScopedParams_(opts, g, false));
};
