/*
 * Mobile master-data sync compatibility route.
 *
 * The current APK sends getMasterGarduMobile as a JSON action. Keep this
 * adapter at the end of the Apps Script load order so it can add the missing
 * route without changing the legacy router behavior for other actions.
 */
(function () {
  var _sisiLegacyApiRouter_ = apiRouter_;

  apiRouter_ = function (e, body) {
    var p = (e && e.parameter) || {};
    var action = (body && body.action) || p.action || "";

    if (action === "getMasterGarduMobile") {
      var token = (body && body.token) || p.token || "";
      var ulp = body && body.ulp != null ? body.ulp : p.ulp || "";
      var result = getMasterGarduMobile(token, ulp);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
        ContentService.MimeType.JSON,
      );
    }

    return _sisiLegacyApiRouter_(e, body);
  };
})();
