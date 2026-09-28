/* ============================================================================
   H-08 — Password plaintext cutover
   ----------------------------------------------------------------------------
   Password plaintext hanya boleh hidup dalam migration window yang eksplisit.
   Tanpa cutoff yang valid, sistem fail-closed: plaintext ditolak.

   Runbook aman:
     1. Login sebagai Super User dan panggil mulaiMigrasiPassword_(token, hari).
     2. Jalankan auditPasswordSiSi_(token), lalu migrasiPasswordHash_(token,
        {kering:true}).
     3. Buat backup/version history spreadsheet.
     4. Jalankan migrasiPasswordHash_(token) sebelum cutoff.
     5. Setelah cutoff, akun yang masih plaintext wajib di-reset/migrasikan.

   Tidak ada jalur rollback yang mengembalikan plaintext. Password baru selalu
   ditulis sebagai hash; fungsi darurat plaintext sengaja dinonaktifkan.
   ============================================================================ */

var H08_PROP_CUTOFF_AT = "SISI_PW_PLAINTEXT_CUTOFF_AT";
var H08_PROP_STARTED_AT = "SISI_PW_MIGRATION_STARTED_AT";
var H08_PROP_LOCKED = "SISI_PW_PLAINTEXT_CUTOVER_LOCKED";
var H08_MAX_WINDOW_DAYS = 7;

function _h08Props_() {
  return PropertiesService.getScriptProperties();
}

function _h08Prop_(key) {
  try {
    return String(_h08Props_().getProperty(key) || "").trim();
  } catch (e) {
    return "";
  }
}

function _h08CutoffMs_() {
  var raw = _h08Prop_(H08_PROP_CUTOFF_AT);
  if (!raw) return 0;
  if (/^\\d+$/.test(raw)) {
    var numeric = Number(raw);
    return isFinite(numeric) && numeric > 0 ? numeric : 0;
  }
  var parsed = Date.parse(raw);
  return isNaN(parsed) ? 0 : parsed;
}

function _h08PlaintextAllowed_() {
  if (_h08Prop_(H08_PROP_LOCKED) === "1") return false;
  var cutoff = _h08CutoffMs_();
  if (!cutoff) return false;
  if (Date.now() < cutoff) return true;

  try {
    _h08Props_().setProperty(H08_PROP_LOCKED, "1");
  } catch (e) {}
  return false;
}

function _h08Result_(kode, message) {
  return { ok: false, kode: kode, message: message };
}

/**
 * Membuka migration window sekali saja. Hanya Super User yang boleh membuka.
 * Window dibatasi maksimal 7 hari dan tidak bisa dibuka ulang setelah cutover.
 */
var mulaiMigrasiPassword_ = function (token, hari) {
  try {
    if (typeof _assertSuperUser !== "function")
      return _h08Result_("AUTH_MODULE_MISSING", "Modul otorisasi tidak tersedia.");
    _assertSuperUser(token);

    if (_h08Prop_(H08_PROP_LOCKED) === "1")
      return _h08Result_("MIGRATION_CLOSED", "Migration window sudah ditutup.");
    if (_h08Prop_(H08_PROP_STARTED_AT) || _h08CutoffMs_())
      return _h08Result_("MIGRATION_ALREADY_STARTED", "Migration window sudah dimulai.");

    var days = hari == null || hari === "" ? 7 : Number(hari);
    if (!isFinite(days) || days <= 0 || days > H08_MAX_WINDOW_DAYS)
      return _h08Result_("INVALID_WINDOW", "Durasi migration window harus 0-7 hari.");

    var now = Date.now();
    var cutoff = now + days * 86400000;
    _h08Props_().setProperty(H08_PROP_STARTED_AT, String(now));
    _h08Props_().setProperty(H08_PROP_CUTOFF_AT, String(cutoff));
    _h08Props_().setProperty(H08_PROP_LOCKED, "0");
    if (typeof audit_ === "function")
      audit_(null, "PW_MIGRATION_START", "db_Users", "OK", "cutoff=" + cutoff);
    return { ok: true, mulaiAt: now, cutoffAt: cutoff, durasiHari: days };
  } catch (e) {
    return _h08Result_("MIGRATION_START_FAILED", e.message);
  }
};

/* Hash/plaintext verification gate. Hash tetap bisa diverifikasi setelah cutoff. */
var _h08VerifyOriginal_ = typeof _verifyPw_ === "function" ? _verifyPw_ : null;
_verifyPw_ = function (tersimpan, dikirim) {
  if (typeof _pwSudahHash_ === "function" && !_pwSudahHash_(tersimpan)) {
    if (!_h08PlaintextAllowed_()) return false;
  }
  if (!_h08VerifyOriginal_) return false;
  return _h08VerifyOriginal_(tersimpan, dikirim);
};

/* Login memberi kode yang bisa ditangani klien, tanpa pernah menerima plaintext. */
var _h08VerifikasiOriginal_ = typeof verifikasiLogin_ === "function" ? verifikasiLogin_ : null;
verifikasiLogin_ = function (username, password) {
  var stored = null;
  try {
    if (typeof cariPasswordTersimpan_ === "function") stored = cariPasswordTersimpan_(username);
  } catch (e) {}

  if (stored && stored.ditemukan && typeof _pwSudahHash_ === "function") {
    if (!_pwSudahHash_(stored.nilai) && !_h08PlaintextAllowed_()) {
      if (typeof audit_ === "function")
        audit_(null, "LOGIN", String(username || ""), "TOLAK", "plaintext melewati cutoff");
      return {
        boleh: false,
        kode: "PASSWORD_MIGRATION_REQUIRED",
        pesan: "Akun memerlukan migrasi atau reset password oleh Super User.",
        tersimpan: stored,
      };
    }
  }

  if (!_h08VerifikasiOriginal_)
    return { boleh: false, kode: "AUTH_MODULE_MISSING", pesan: "Modul autentikasi tidak tersedia." };
  return _h08VerifikasiOriginal_.apply(this, arguments);
};

/* Audit dan migrasi tidak boleh menjadi fungsi publik tanpa otorisasi. */
var _h08AuditOriginal_ = typeof auditPasswordSiSi_ === "function" ? auditPasswordSiSi_ : null;
auditPasswordSiSi_ = function (token) {
  try {
    if (typeof _assertSuperUser !== "function")
      return _h08Result_("AUTH_MODULE_MISSING", "Modul otorisasi tidak tersedia.");
    _assertSuperUser(token);
    if (!_h08AuditOriginal_)
      return _h08Result_("MIGRATION_MODULE_MISSING", "Modul migrasi tidak tersedia.");
    return _h08AuditOriginal_();
  } catch (e) {
    return _h08Result_("AUDIT_FAILED", e.message);
  }
};

var _h08MigrasiOriginal_ = typeof migrasiPasswordHash_ === "function" ? migrasiPasswordHash_ : null;
migrasiPasswordHash_ = function (token, opts) {
  try {
    if (typeof _assertSuperUser !== "function")
      return _h08Result_("AUTH_MODULE_MISSING", "Modul otorisasi tidak tersedia.");
    _assertSuperUser(token);
    if (!_h08CutoffMs_())
      return _h08Result_("MIGRATION_NOT_STARTED", "Buka migration window terlebih dahulu.");
    if (!_h08PlaintextAllowed_())
      return _h08Result_("MIGRATION_CLOSED", "Migration window sudah ditutup.");
    if (!_h08MigrasiOriginal_)
      return _h08Result_("MIGRATION_MODULE_MISSING", "Modul migrasi tidak tersedia.");
    return _h08MigrasiOriginal_(opts || {});
  } catch (e) {
    return _h08Result_("MIGRATION_FAILED", e.message);
  }
};

/* Semua jalur tulis password wajib punya hasher. Tidak ada fallback plaintext. */
function _h08HashRequired_() {
  if (typeof _hashPw_ !== "function" || typeof _saltBaru_ !== "function")
    return _h08Result_("HASH_MODULE_MISSING", "Hasher password tidak tersedia; penulisan ditolak.");
  return null;
}

function _h08WrapHashWrite_(original, args) {
  var blocked = _h08HashRequired_();
  if (blocked) return blocked;
  if (!original) return _h08Result_("ACCOUNT_MODULE_MISSING", "Modul akun tidak tersedia.");
  return original.apply(this, args);
}

var _h08TambahOriginal_ = typeof tambahAkun === "function" ? tambahAkun : null;
tambahAkun = function () { return _h08WrapHashWrite_(_h08TambahOriginal_, arguments); };
var _h08UpdateOriginal_ = typeof updateAkun === "function" ? updateAkun : null;
updateAkun = function () { return _h08WrapHashWrite_(_h08UpdateOriginal_, arguments); };
var _h08ResetOriginal_ = typeof resetPasswordAkun === "function" ? resetPasswordAkun : null;
resetPasswordAkun = function () { return _h08WrapHashWrite_(_h08ResetOriginal_, arguments); };
var _h08GantiOriginal_ = typeof gantiPassword === "function" ? gantiPassword : null;
gantiPassword = function () { return _h08WrapHashWrite_(_h08GantiOriginal_, arguments); };

/* Jalur darurat yang menulis plaintext dinonaktifkan permanen. */
kembalikanPasswordPlaintext_ = function () {
  if (typeof audit_ === "function") audit_(null, "PW_KEMBALIKAN", "db_Users", "TOLAK", "plaintext disabled");
  return _h08Result_("PLAINTEXT_PASSWORD_FORBIDDEN", "Password plaintext tidak boleh dipulihkan.");
};
