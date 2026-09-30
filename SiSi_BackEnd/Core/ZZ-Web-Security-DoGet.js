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
    var html = out.getContent();
    // Replace the legacy redirect controller, not the login page's design.
    // Fail closed if its expected one-script contract changes.
    if (/<form\b[^>]*\bid="frmLogin"/i.test(html)) {
      var scripts = html.match(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi) || [];
      if (scripts.length !== 1 || scripts[0].indexOf(".doLogin(") < 0) {
        throw new Error("Kontrak bootstrap login berubah. Periksa source sebelum deploy.");
      }
      var loginBootstrap = HtmlService.createHtmlOutputFromFile(
        "Core/Web-Login-Bootstrap",
      ).getContent();
      html = html.replace(scripts[0], function () { return loginBootstrap; });
    }
    out.setContent(_sanitizeWebHtmlSecurity_(html));
  }
  return out;
};

/*
 * Authenticated shell handoff used by login-page.html. This is a public RPC,
 * not an editor-only entry point: require a valid, scoped user session before
 * reading/rendering the app shell. Data and menu RPCs retain their own guards.
 */
function getWebAppShell(token) {
  var g = guard_(arguments, { ulp: true, aksi: "getWebAppShell" });
  var sesi = g.sesi;
  var html = HtmlService.createTemplateFromFile("Core/Main").evaluate().getContent();
  if (!/<\/body\s*>/i.test(html)) {
    throw new Error("Halaman utama tidak lengkap.");
  }
  var appBootstrap = HtmlService.createHtmlOutputFromFile(
    "Core/Web-Login-Bootstrap",
  ).getContent();
  html = html.replace(/<\/body\s*>/i, function () {
    return appBootstrap + "\n</body>";
  });
  html = _sanitizeWebHtmlSecurity_(html);
  return {
    success: true,
    html: html,
    sesi: {
      token: g.token,
      username: sesi.username,
      email: sesi.email,
      role: sesi.role,
      ulp: sesi.ulp,
      kodeUlp: sesi.kodeUlp || "",
      bidang: sesi.bidang || "",
      tim: sesi.tim || "",
      subTim: sesi.subTim || "",
      aksesMenu: sesi.aksesMenu || "",
    },
  };
}
