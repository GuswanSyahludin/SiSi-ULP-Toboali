/*
 * Compatibility shim for token-aware web calls.
 *
 * Main.html injects the active session token into methods listed in
 * SISI_BUTUH_TOKEN. These public shims accept that token explicitly while
 * preserving the response shape expected by existing pages.
 */
function getPageContent(token, pageName, injectedPageName) {
  try {
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
    // Patch UI dipisah dari halaman BA utama yang sangat besar. Konten tetap
    // dikirim dalam satu respons dan script patch dieksekusi paling akhir.
    if (pageName === "SIE-BeritaAcara") {
      html += HtmlService.createHtmlOutputFromFile(
        "Core/SIE-BeritaAcara-WebFix",
      ).getContent();
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

/*
 * Download BA compatibility fix.
 * SisiRun calls unduhFileBa(token, fileId); legacy code accepted only fileId.
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
      id = String(token || "").trim();
    }

    if (!id) return { ok: false, message: "File ID kosong." };

    var file = DriveApp.getFileById(id);
    var blob = file.getBlob();
    var bytes = blob.getBytes();

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
