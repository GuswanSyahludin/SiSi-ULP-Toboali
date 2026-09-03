/*
 * Compatibility shim for token-aware web calls.
 *
 * Main.html injects the active session token into methods listed in
 * SISI_BUTUH_TOKEN. These public shims accept that token explicitly while
 * preserving the response shape expected by existing pages.
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

/*
 * Download BA compatibility fix.
 *
 * SisiRun calls unduhFileBa(token, fileId). The legacy backend accepted only
 * unduhFileBa(fileId), so it tried to open the session token as a Drive file
 * and every website download failed. Keep the method authenticated and accept
 * the legacy one-argument form only for internal/editor compatibility.
 */
function unduhFileBa(token, fileId) {
  try {
    var id = "";

    if (arguments.length >= 2) {
      var sesi = getSesiByToken(String(token || "").trim());
      if (!sesi) {
        return {
          ok: false,
          code: "SESSION_EXPIRED",
          message: "Sesi habis atau tidak valid. Silakan login ulang.",
        };
      }
      id = String(fileId || "").trim();
    } else {
      // Dipertahankan agar pengujian internal dari editor Apps Script tetap bisa.
      id = String(token || "").trim();
    }

    if (!id) return { ok: false, message: "File ID kosong." };

    var file = DriveApp.getFileById(id);
    var blob = file.getBlob();
    var bytes = blob.getBytes();

    // Base64 menambah ukuran sekitar 33%. Tolak secara jelas sebelum respons
    // menjadi terlalu besar dan gagal diam-diam di browser/Apps Script.
    if (bytes.length > 12 * 1024 * 1024) {
      return {
        ok: false,
        code: "FILE_TOO_LARGE",
        message: "File terlalu besar untuk diunduh melalui website (maksimal 12 MB). Gunakan tautan Google Drive.",
      };
    }

    return {
      ok: true,
      base64: Utilities.base64Encode(bytes),
      mimeType: blob.getContentType() || "application/pdf",
      fileName: file.getName() || "BeritaAcara.pdf",
    };
  } catch (error) {
    return {
      ok: false,
      message: "Gagal mengunduh file: " + error.message,
    };
  }
}
