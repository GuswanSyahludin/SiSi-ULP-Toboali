/* Source-only hardening batch: T-14, T-15, T-18, T-24. */
var GUARD_DEBUG = false;
var WEBHOOK_TS_MODE_DEFAULT = "enforce";

function _sourceOnlyDeviceKey_(body) {
  body = body || {};
  var raw = String(body.clientId || body.deviceId || body.perangkat || "").trim().toLowerCase();
  return raw ? raw.replace(/[^a-z0-9_.:-]/g, "_").slice(0, 100) : "";
}
function _sourceOnlyDeviceThrottle_(body) {
  var key = _sourceOnlyDeviceKey_(body);
  if (!key || typeof CacheService === "undefined") return { allowed: true, key: "" };
  var cache = CacheService.getScriptCache();
  var lockKey = "src_login_device_lock_" + key;
  var locked = Number(cache.get(lockKey) || 0);
  if (locked > Date.now()) return { allowed: false, key: key, retryAfter: Math.ceil((locked - Date.now()) / 1000) };
  if (locked) try { cache.remove(lockKey); } catch (e) {}
  return { allowed: true, key: key };
}
function _sourceOnlyRecordDeviceFailure_(key) {
  if (!key || typeof CacheService === "undefined") return;
  var cache = CacheService.getScriptCache(), countKey = "src_login_device_fail_" + key;
  var n = Number(cache.get(countKey) || 0) + 1;
  try { cache.put(countKey, String(n), 60); } catch (e) {}
  if (n >= 10) try { cache.put("src_login_device_lock_" + key, String(Date.now() + 5 * 60 * 1000), 300); } catch (e2) {}
}

var _sourceOnlyDoLogin_ = typeof doLogin === "function" ? doLogin : null;
if (_sourceOnlyDoLogin_) {
  doLogin = function (username, password) {
    var result = _sourceOnlyDoLogin_.apply(this, arguments);
    if (result && result.success === false &&
        (result.message === "Username tidak ditemukan" || result.message === "Password salah" || result.message === "Username atau password salah")) {
      result.message = "Username atau password salah.";
    }
    return result;
  };
}

var _sourceOnlyApiRouter_ = typeof apiRouter_ === "function" ? apiRouter_ : null;
if (_sourceOnlyApiRouter_) {
  apiRouter_ = function (e, body) {
    body = body || {};
    if (String(body.action || "") === "login") {
      var throttle = _sourceOnlyDeviceThrottle_(body);
      if (!throttle.allowed) return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Terlalu banyak percobaan dari perangkat ini. Coba lagi nanti.", kode: "DEVICE_LOGIN_THROTTLED", retryAfter: throttle.retryAfter })).setMimeType(ContentService.MimeType.JSON);
      var response = _sourceOnlyApiRouter_.call(this, e, body);
      try {
        var text = response && typeof response.getContent === "function" ? JSON.parse(response.getContent()) : null;
        if (text && text.success === false) _sourceOnlyRecordDeviceFailure_(throttle.key);
      } catch (ignore) {}
      return response;
    }
    return _sourceOnlyApiRouter_.call(this, e, body);
  };
}
