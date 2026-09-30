/* One-time emergency recovery for a locked, plaintext Super User account.
 *
 * This is NOT a web/API reset route. It requires the same nonempty Google
 * account to be the Apps Script active and effective user, and requires that
 * account to match the editor allowlist in Script Properties. Apps Script
 * deployments running as the owner do not expose an active-user email, so a
 * public google.script.run call fails this check.
 *
 * Runbook:
 *   1. In Project Settings > Script Properties, set:
 *      SISI_SUPERUSER_RECOVERY_EDITOR_EMAIL = the authorized project editor's
 *          Google account email (must be both active and effective user).
 *      SISI_SUPERUSER_RECOVERY_USERNAME = exact Super User username.
 *      SISI_SUPERUSER_RECOVERY_PASSWORD = a new unique password (16+ chars).
 *   2. Run recoverLockedSuperUserOnce manually from the Apps Script editor.
 *   3. Confirm {ok:true}; immediately sign in with the new password.
 *   4. Confirm all three recovery properties were deleted. If not, delete them
 *      manually. Never open the plaintext migration cutoff or change the pepper.
 *
 * The function only resets one uniquely matched Super User whose current
 * password is still plaintext. It refuses hashed accounts, admins, ambiguity,
 * missing pepper, and non-editor execution. It writes only a salted hash.
 */
var SISI_RECOVERY_EDITOR_EMAIL_PROP = "SISI_SUPERUSER_RECOVERY_EDITOR_EMAIL";
var SISI_RECOVERY_USERNAME_PROP = "SISI_SUPERUSER_RECOVERY_USERNAME";
var SISI_RECOVERY_PASSWORD_PROP = "SISI_SUPERUSER_RECOVERY_PASSWORD";

function recoverLockedSuperUserOnce() {
  var props = PropertiesService.getScriptProperties();
  var allowedEditor = String(props.getProperty(SISI_RECOVERY_EDITOR_EMAIL_PROP) || "")
    .trim().toLowerCase();
  var activeEmail = "";
  var effectiveEmail = "";
  try {
    activeEmail = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
    effectiveEmail = String(Session.getEffectiveUser().getEmail() || "").trim().toLowerCase();
  } catch (eIdentity) {}
  if (!allowedEditor || !activeEmail || !effectiveEmail ||
      activeEmail !== allowedEditor || effectiveEmail !== allowedEditor) {
    throw new Error("Recovery ditolak: jalankan manual dari akun editor yang diizinkan.");
  }

  var username = String(props.getProperty(SISI_RECOVERY_USERNAME_PROP) || "").trim();
  var password = String(props.getProperty(SISI_RECOVERY_PASSWORD_PROP) || "");
  if (!username || !password.trim() || password.length < 16) {
    throw new Error("Property recovery tidak valid; tidak ada perubahan.");
  }
  if (typeof COL_USERS === "undefined" || !COL_USERS ||
      typeof _normRole_ !== "function" || typeof _pwSudahHash_ !== "function" ||
      typeof _hashPw_ !== "function" || typeof _saltBaru_ !== "function") {
    throw new Error("Modul akun/hash tidak lengkap; tidak ada perubahan.");
  }
  if (_normRole_("Super User") !== "SUPER") {
    throw new Error("Normalisasi role tidak tersedia; tidak ada perubahan.");
  }
  // Never mint a new pepper here: doing so would invalidate every existing hash.
  var pepper = String(props.getProperty("SISI_PW_PEPPER") || "");
  if (!pepper) throw new Error("Pepper password tidak ditemukan; tidak ada perubahan.");

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error("Project sibuk; tidak ada perubahan.");
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("db_Users");
    if (!sheet) throw new Error("Sheet db_Users tidak ditemukan; tidak ada perubahan.");
    var rows = sheet.getDataRange().getValues();
    var matches = [];
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][COL_USERS.userName] || "").trim().toLowerCase() ===
          username.toLowerCase()) {
        matches.push({ row: i + 1, role: rows[i][COL_USERS.role], password: rows[i][COL_USERS.password] });
      }
    }
    if (matches.length !== 1) throw new Error("Target harus cocok ke tepat satu akun; tidak ada perubahan.");
    if (_normRole_(matches[0].role) !== "SUPER") {
      throw new Error("Target bukan akun Super User; tidak ada perubahan.");
    }
    if (!matches[0].password || _pwSudahHash_(matches[0].password)) {
      throw new Error("Target tidak memiliki password plaintext; gunakan reset normal atau investigasi lain.");
    }

    var hashed = _hashPw_(password, _saltBaru_());
    if (!hashed || !_pwSudahHash_(hashed)) {
      throw new Error("Hasher gagal; tidak ada perubahan.");
    }
    sheet.getRange(matches[0].row, COL_USERS.password + 1).setValue(hashed);
    SpreadsheetApp.flush();
    if (typeof loginThrottleReset_ === "function") loginThrottleReset_(username);
    if (typeof _bustUsersCache_ === "function") _bustUsersCache_();

    var cleanupFailed = false;
    [SISI_RECOVERY_EDITOR_EMAIL_PROP, SISI_RECOVERY_USERNAME_PROP,
      SISI_RECOVERY_PASSWORD_PROP].forEach(function (key) {
      try { props.deleteProperty(key); } catch (eDelete) { cleanupFailed = true; }
    });
    if (typeof audit_ === "function") {
      audit_(null, "PW_SUPERUSER_RECOVERY", "db_Users", "OK",
        "one plaintext Super User replaced with salted hash");
    }
    if (cleanupFailed) {
      throw new Error("Password sudah di-hash, tetapi property recovery belum terhapus. Hapus ketiganya manual sekarang.");
    }
    return { ok: true, message: "Password Super User berhasil direset sebagai hash; property recovery dihapus." };
  } catch (e) {
    // Do not include the password or property values in logs or return payloads.
    throw e;
  } finally {
    try { lock.releaseLock(); } catch (eRelease) {}
  }
}
