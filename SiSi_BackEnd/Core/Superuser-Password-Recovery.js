/* One-time emergency recovery for a locked, plaintext Super User account.
 *
 * Disabled in committed/deployed source. Google identity is NOT proof of
 * editor execution: Apps Script may expose the active email to the owner or
 * same-domain users in a web app. The source-only switch below, plus identical
 * allowlisted active/effective identities, gates this emergency operation.
 * Never register it in a web/API dispatcher.
 *
 * Runbook:
 *   1. In the Apps Script editor, temporarily change the constant
 *      SISI_RECOVERY_EDITOR_ONLY_ARMED below to true in HEAD only.
 *      Do NOT create a version, deploy, push, commit, or use /dev/API execution
 *      while armed. Keep existing versioned deployments on disabled source.
 *   2. In Project Settings > Script Properties, set:
 *      SISI_SUPERUSER_RECOVERY_EDITOR_EMAIL = the authorized project editor's
 *          Google account email (must be both active and effective user).
 *      SISI_SUPERUSER_RECOVERY_USERNAME = exact Super User username.
 *      SISI_SUPERUSER_RECOVERY_PASSWORD = a new unique password (16+ chars).
 *   3. Run recoverLockedSuperUserOnce manually from the Apps Script editor,
 *      without arguments. A blank active/effective email must fail closed.
 *   4. On success OR failure, set the constant back to false and delete all
 *      three recovery properties if still present. Do this before leaving.
 *   5. On {ok:true}, sign in with the new password. Before any later deploy,
 *      verify the constant is false and all recovery properties are absent.
 *      Never open the plaintext migration cutoff or change the pepper.
 *
 * The function only resets one uniquely matched Super User whose current
 * password is still plaintext. It refuses hashed accounts, admins, ambiguity,
 * missing pepper, and unauthorized Google identities. It writes only a salted
 * hash. While manually armed, an allowed identity can also satisfy the guard
 * outside the editor; Session alone cannot distinguish invocation origin.
 */
const SISI_RECOVERY_EDITOR_ONLY_ARMED = false;
var SISI_RECOVERY_EDITOR_EMAIL_PROP = "SISI_SUPERUSER_RECOVERY_EDITOR_EMAIL";
var SISI_RECOVERY_USERNAME_PROP = "SISI_SUPERUSER_RECOVERY_USERNAME";
var SISI_RECOVERY_PASSWORD_PROP = "SISI_SUPERUSER_RECOVERY_PASSWORD";

// Private RPC-inaccessible guard; no caller-supplied identity or bypass flags.
function _assertRecoveryEditor_(args) {
  if (SISI_RECOVERY_EDITOR_ONLY_ARMED !== true) {
    throw new Error("Recovery nonaktif; aktivasi hanya sementara di source HEAD editor.");
  }
  if (!args || args.length !== 0) {
    throw new Error("Recovery ditolak: argumen dari pemanggil tidak diizinkan.");
  }
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
  return props;
}

function recoverLockedSuperUserOnce() {
  var props = _assertRecoveryEditor_(arguments);
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
