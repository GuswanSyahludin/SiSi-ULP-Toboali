/*
 * Final page-loader override.
 * Keep this uniquely named file last in clasp's push order so legacy duplicate
 * getPageContent declarations cannot suppress page-specific compatibility HTML.
 */
function getPageContent(token, pageName, injectedPageName) {
  try {
    if (arguments.length >= 3 && injectedPageName) pageName = injectedPageName;
    if (!token) return { success: false, message: "Token tidak ditemukan", redirect: "login" };

    var sesi = getSesiByToken(token);
    if (!sesi) return { success: false, message: "Sesi habis, silakan login ulang", redirect: "login" };
    if (!_bolehAksesMenu(sesi, pageName)) return { success: false, message: "Akses ditolak", redirect: "forbidden" };

    var fileName = PAGE_FILE_ALIASES[pageName] || pageName;
    var html = HtmlService.createHtmlOutputFromFile(fileName).getContent();
    if (pageName === "SIE-BeritaAcara") {
      html += HtmlService.createHtmlOutputFromFile("Core/SIE-BeritaAcara-WebFix").getContent();
    }
    if (pageName === "Tek-Dashboard" && typeof _dashboardJadwalDeleteClientScript_ === "function") {
      html += _dashboardJadwalDeleteClientScript_();
    }
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
