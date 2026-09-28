/*
 * Final dispatch guard for T-05.
 *
 * Webhook actions are valid only on the AppSheet webhook path. When a mobile
 * request carries one of those actions (for example recalcRow), it must stop
 * at apiRouter_ with the normal unknown-action response. Sending it through
 * the mobile compatibility routers creates a bounce in older deployments.
 *
 * This file loads after the existing compatibility shims and therefore wraps
 * the final callable entry points without changing their public signatures.
 */
(function () {
  var _sisiApiRouterBeforeFinalGuard_ = apiRouter_;
  var _sisiApiDepth_ = 0;

  function _sisiJson_(value) {
    return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
      ContentService.MimeType.JSON,
    );
  }

  function _sisiAction_(e, body) {
    var p = (e && e.parameter) || {};
    return String((body && body.action) || p.action || "").trim();
  }

  function _sisiWebhookOnly_(action) {
    return (
      typeof WEBHOOK_ACTIONS !== "undefined" &&
      WEBHOOK_ACTIONS.indexOf(action) >= 0
    );
  }

  apiRouter_ = function (e, body) {
    var action = _sisiAction_(e, body);

    // A webhook-only action must never enter the mobile router chain.
    if (_sisiWebhookOnly_(action)) {
      return _sisiJson_({
        success: false,
        ok: false,
        message: "Action API tidak dikenal: " + action,
      });
    }

    // Belt-and-suspenders protection if a legacy shim still calls apiRouter_.
    if (_sisiApiDepth_ > 0) {
      return _sisiJson_({
        success: false,
        ok: false,
        message: "Action API tidak dikenal: " + action,
      });
    }

    _sisiApiDepth_++;
    try {
      return _sisiApiRouterBeforeFinalGuard_(e, body);
    } finally {
      _sisiApiDepth_--;
    }
  };

  // T04-Guard-Overrides validates webhook requests before calling the original
  // Code.js doPost. The original handler already verifies the secret, so call
  // that original directly and avoid the duplicate validation layer.
  var _sisiDoPostTarget_ =
    typeof _t04DoPostOriginal_ === "function" ? _t04DoPostOriginal_ : doPost;
  var _sisiDoPostDepth_ = 0;

  doPost = function (e) {
    if (_sisiDoPostDepth_ > 0) {
      return _sisiJson_({
        ok: false,
        error: "dispatch_recursion_blocked",
        message: "Recursive doPost dispatch blocked.",
      });
    }

    _sisiDoPostDepth_++;
    try {
      return _sisiDoPostTarget_(e);
    } finally {
      _sisiDoPostDepth_--;
    }
  };
})();
