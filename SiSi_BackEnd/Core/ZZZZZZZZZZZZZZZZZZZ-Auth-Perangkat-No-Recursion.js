/*
 * Auth router recursion firewall.
 *
 * apiRouter_ already dispatches Jadwal Padam after authPerangkatRouter_.
 * The auth router must therefore never delegate Jadwal actions back into
 * jadwalPadamMobileRouter_, or the dispatch chain can recurse forever.
 * Keep authentication actions on the original router and return null for every
 * other action so the legacy apiRouter_ can continue its own dispatch.
 */
(function () {
  var _sisiAuthRouterOriginal_ = authPerangkatRouter_;
  var _sisiAuthActions_ =
    typeof AUTH_PERANGKAT_ACTIONS !== "undefined"
      ? AUTH_PERANGKAT_ACTIONS
      : [];

  authPerangkatRouter_ = function (e, body) {
    var action = String((body && body.action) || "").trim();
    if (_sisiAuthActions_.indexOf(action) < 0) return null;
    return _sisiAuthRouterOriginal_(e, body);
  };
})();
