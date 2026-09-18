// Helper otomatis untuk normalisasi pemanggilan fungsi backend ROW yang menerima token sesi dari SisiRun
(function(scope) {
  var origGetSemuaLaporan = scope.getSemuaLaporan;
  if (typeof origGetSemuaLaporan === 'function') {
    scope.getSemuaLaporan = function(tglMulai, tglAkhir, tim, penyulang) {
      var TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (tglMulai && typeof tglMulai === 'string' && TOKEN_RE.test(tglMulai.trim())) {
        return origGetSemuaLaporan.call(this, arguments[1], arguments[2], arguments[3], arguments[4]);
      }
      return origGetSemuaLaporan.apply(this, arguments);
    };
  }
})(this);
