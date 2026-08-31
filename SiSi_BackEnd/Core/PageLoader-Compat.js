/*
 * Compatibility shim for the token-aware SisiRun client wrapper.
 *
 * getPageContent is called explicitly as (token, pageName) from Main.html.
 * If a generated/client wrapper injects a token again, Apps Script receives
 * (token, token, pageName), which makes the page name become the token and
 * leaves the web UI stuck on its loading state. This implementation accepts
 * both forms while preserving the existing access checks and response shape.
 *
 * Keep the public function name so the shim is used by the Apps Script global
 * runtime after this file is pushed. No URL or deployment settings change.
 */
function getPageContent(token, pageName, injectedPageName) {
  try {
    // Normal call: (token, pageName)
    // Compatibility call: (token, injectedToken, pageName)
    if (arguments.length >= 3 && injectedPageName) {
      pageName = injectedPageName;
    }

    if (!token) {
      return {
        success: false,
        message: "Token tidak ditemukan",
        redirect: "login",
      };
    }

    var sesi = getSesiByToken(token);
    if (!sesi) {
      return {
        success: false,
        message: "Sesi habis, silakan login ulang",
        redirect: "login",
      };
    }

    if (!_bolehAksesMenu(sesi, pageName)) {
      return {
        success: false,
        message: "Akses ditolak",
        redirect: "forbidden",
      };
    }

    var fileName = PAGE_FILE_ALIASES[pageName] || pageName;
    var html = HtmlService.createHtmlOutputFromFile(fileName).getContent();
    return {
      success: true,
      html: html,
      sesi: {
        token: token,
        username: sesi.username,
        email: sesi.email,
        role: sesi.role,
        ulp: sesi.ulp,
        kodeUlp: sesi.kodeUlp,
        bidang: sesi.bidang,
        tim: sesi.tim,
        subTim: sesi.subTim || "",
        aksesMenu: sesi.aksesMenu || "",
      },
    };
  } catch (e) {
    return { success: false, message: "Halaman tidak ditemukan: " + e.message };
  }
}
