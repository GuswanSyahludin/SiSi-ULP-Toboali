/* Source-only hardening batch: T-15, T-18, T-24. */
var GUARD_DEBUG = false;
var WEBHOOK_TS_MODE_DEFAULT = "enforce";

var _sourceOnlyDoLogin_ = typeof doLogin === "function" ? doLogin : null;
if (_sourceOnlyDoLogin_) {
  doLogin = function (username, password) {
    var result = _sourceOnlyDoLogin_.apply(this, arguments);
    if (result && result.success === false &&
        (result.message === "Username tidak ditemukan" ||
         result.message === "Password salah" ||
         result.message === "Username dan password salah")) {
      result.message = "Username atau password salah.";
    }
    return result;
  };
}
