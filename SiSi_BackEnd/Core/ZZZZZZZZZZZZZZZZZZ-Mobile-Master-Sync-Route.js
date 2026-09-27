/*
 * Mobile master-data sync compatibility route.
 *
 * The current APK sends getMasterGarduMobile as a JSON action for two flows:
 *   1. Master download / delta snapshot: body.ulp carries the sub-command
 *      (for example "DELTA_SYNC:{...}") and is forwarded to
 *      getMasterGarduMobile.
 *   2. Master Gardu edit upload: body.mode === "update" with body.payload.
 *      This MUST reach updateMasterGarduMobile. Sending it to the download
 *      gateway returns success:true without writing anything, and the APK
 *      then deletes the pending outbox entry (silent data loss).
 *      Regression introduced by PR #3, fixed 27 Sep 2026.
 *
 * Keep this adapter after the legacy router and before the final page-loader
 * override so it can add the route without changing other actions.
 */
(function () {
  var _sisiLegacyApiRouter_ = apiRouter_;

  apiRouter_ = function (e, body) {
    var p = (e && e.parameter) || {};
    var action = (body && body.action) || p.action || "";

    if (action === "getMasterGarduMobile") {
      var result;
      if (body && body.mode === "update") {
        result =
          typeof updateMasterGarduMobile === "function"
            ? updateMasterGarduMobile(body.token, body.payload || {})
            : {
                success: false,
                message: "Master-Gardu-Sync-Mobile.js belum terpasang.",
              };
      } else {
        var token = (body && body.token) || p.token || "";
        var ulp = body && body.ulp != null ? body.ulp : p.ulp || "";
        result = getMasterGarduMobile(token, ulp);
      }
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
        ContentService.MimeType.JSON,
      );
    }

    return _sisiLegacyApiRouter_(e, body);
  };
})();
