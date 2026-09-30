/*
 * Apply the rendered-web security boundary to the initial Apps Script page.
 * Main.html is returned by doGet directly, so PageLoader alone cannot protect
 * the bootstrap page from the legacy query-string token fallback.
 */
var _doGetOriginalWebSecurity_ = doGet;
doGet = function (e) {
  var out = _doGetOriginalWebSecurity_(e);
  if (
    out &&
    typeof out.getContent === "function" &&
    typeof out.setContent === "function" &&
    typeof out.setXFrameOptionsMode === "function"
  ) {
    out.setContent(_sanitizeWebHtmlSecurity_(out.getContent()));
  }
  return out;
};
