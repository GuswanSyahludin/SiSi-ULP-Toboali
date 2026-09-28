/* ═════════════════════════════════════
   Code-Session.js — Session & Login Management
   Dipindahkan dari Code.js (Rev 29 Agu 2026)
   
   Fungsi:
   - doLogin(username, password)
   - getSesiByToken(token)
   - doLogout(token)
   - gantiPassword(token, passwordLama, passwordBaru)
   - _usersRowsCache_()
   - _bustUsersCache_()
═════════════════════════════════════ */

/* ═══ SESI ═══ */
function getSesiByToken(token) {
  try {
    if (!token) return null;
    var cache = CacheService.getScriptCache();
    var raw = cache.get("sesi_" + token);
    if (!raw) return null;
    cache.put("sesi_" + token, raw, SESSION_TTL_SEC);
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function doLogout(token) {
  try {
    if (token) CacheService.getScriptCache().remove("sesi_" + token);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/* ═══ LOGIN ═══ */
/* CACHE db_Users (Rev 19 Agu sore) — login adalah request paling sering & paling sensitif
   terhadap cold start Apps Script. Baris db_Users di-cache 10 menit: login tidak lagi
   openById + scan sheet tiap kali (openById = bagian paling lambat). Semua fungsi yang
   menulis db_Users memanggil _bustUsersCache_() (dipasang di tambahAkun, updateAkun,
   hapusAkun, resetPasswordAkun, gantiPassword) agar perubahan akun langsung efektif. */
var USERS_CACHE_KEY = "usersRows_v1";
var USERS_CACHE_TTL = 600; // 10 menit

function _usersRowsCache_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(USERS_CACHE_KEY);
  if (hit) {
    try {
      return JSON.parse(hit);
    } catch (e) {}
  }
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("db_Users");
  if (!sh) return null;
  var data = sh.getDataRange().getValues();
  // Ratakan Date → ISO string agar JSON.stringify aman & konsisten saat dibaca ulang
  var plain = data.map(function (r) {
    return r.map(function (c) {
      return c instanceof Date ? c.toISOString() : c;
    });
  });
  try {
    cache.put(USERS_CACHE_KEY, JSON.stringify(plain), USERS_CACHE_TTL);
  } catch (e) {}
  return plain;
}

function _bustUsersCache_() {
  try {
    CacheService.getScriptCache().remove(USERS_CACHE_KEY);
  } catch (e) {}
}

function doLogin(username, password) {
  try {
    if (!username || !password)
      return { success: false, message: "Username dan password wajib diisi" };

    var data = _usersRowsCache_(); // cache 10 mnt — tanpa openById + scan tiap login
    if (!data)
      return { success: false, message: "Sheet db_Users tidak ditemukan" };
    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      var eml = String(r[COL_USERS.email] || "").trim();
      var uNm = String(r[COL_USERS.userName] || "").trim();
      var uPw = String(r[COL_USERS.password] || "").trim();
      var role = String(r[COL_USERS.role] || "").trim();
      var ulp = String(r[COL_USERS.ulp] || "").trim();
      var kodeUlp = String(r[COL_USERS.kodeUlp] || "").trim();
      var bidang = String(r[COL_USERS.bidang] || "").trim();
      var tim = String(r[COL_USERS.tim] || "").trim();
      var subTim = String(r[COL_USERS.subTim] || "").trim();
      var aksesMenu = String(r[COL_USERS.aksesMenu] || "").trim();

      if (uNm.toLowerCase() !== username.toLowerCase()) continue;

      /* Verifikasi terpadu (29 Agu 2026): throttle + dual-read hash/plaintext +
         upgrade hash otomatis. Sebelumnya `if (uPw !== password)` — membandingkan
         password tersimpan apa adanya (plaintext) dan tanpa pembatasan percobaan,
         sehingga kredensial yang bocor bisa diuji berulang tanpa henti. */
      var v = verifikasiLogin_(uNm, password);
      if (!v.boleh)
        return { success: false, message: v.pesan };

      var token = Utilities.getUuid();
      var sesi = {
        token: token,
        username: uNm,
        email: eml,
        role: role,
        ulp: ulp,
        kodeUlp: kodeUlp,
        bidang: bidang,
        tim: tim,
        subTim: subTim,
        aksesMenu: aksesMenu,
        loginAt: new Date().toISOString(),
      };

      CacheService.getScriptCache().put(
        "sesi_" + token,
        JSON.stringify(sesi),
        SESSION_TTL_SEC,
      );
      /* Tanpa getUserCache(). Lihat catatan K1 di doGet(). */

      return {
        success: true,
        token: token,
        username: uNm,
        email: eml,
        role: role,
        ulp: ulp,
        kodeUlp: kodeUlp,
        bidang: bidang,
        tim: tim,
        subTim: subTim,
        aksesMenu: aksesMenu,
      };
    }
    return { success: false, message: "Username tidak ditemukan" };
  } catch (e) {
    return { success: false, message: "Error: " + e.message };
  }
}

function gantiPassword(token, passwordLama, passwordBaru) {
  try {
    var sesi = getSesiByToken(token);
    if (!sesi)
      return { ok: false, message: "Sesi habis, silakan login ulang." };

    var pwLama = String(passwordLama || "").trim();
    var pwBaru = String(passwordBaru || "").trim();
    if (!pwLama || !pwBaru)
      return { ok: false, message: "Password lama dan baru wajib diisi." };
    if (pwBaru.length < 4)
      return { ok: false, message: "Password baru minimal 4 karakter." };
    if (pwBaru === pwLama)
      return {
        ok: false,
        message: "Password baru tidak boleh sama dengan password lama.",
      };

    var sh = _akunSheet();
    var row = _findRowAkun(sh, String(sesi.username || "").trim());
    if (row === -1) return { ok: false, message: "Akun tidak ditemukan." };

    var pwTersimpan = String(
      sh.getRange(row, COL_USERS.password + 1).getValue() || "",
    ).trim();
    /* Dual-read: nilai bisa berupa hash (sisi1$...) atau plaintext lawas. */
    var cocok =
      typeof _verifyPw_ === "function"
        ? _verifyPw_(pwTersimpan, pwLama)
        : pwTersimpan === pwLama;
    if (!cocok) return { ok: false, message: "Password lama salah." };

    sh.getRange(row, COL_USERS.password + 1).setValue(
      typeof _hashPw_ === "function" ? _hashPw_(pwBaru, _saltBaru_()) : pwBaru,
    );
    SpreadsheetApp.flush();
    _bustUsersCache_(); // perubahan akun langsung terlihat login
    return { ok: true, message: "Password berhasil diganti." };
  } catch (e) {
    return { ok: false, message: "Error: " + e.message };
  }
}
