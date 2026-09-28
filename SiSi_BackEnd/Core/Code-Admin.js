/* ═════════════════════════════════════
   Code-Admin.js — Account Management (Super User Only)
   Dipindahkan dari Code.js (Rev 29 Agu 2026)
   
   Fungsi:
   - _assertSuperUser(token)
   - _akunSheet()
   - _findRowAkun(sh, username)
   - getDaftarAkun(token)
   - tambahAkun(token, data)
   - updateAkun(token, data)
   - hapusAkun(token, username)
   - resetPasswordAkun(token, username, passwordBaru)
═════════════════════════════════════ */

/* ═══ PENGATURAN AKSES AKUN (khusus Super User) ═══ */
function _akunSheet() {
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("db_Users");
  if (!sh) throw new Error("Sheet db_Users tidak ditemukan");
  return sh;
}

/* Diperbaiki 29 Agu 2026 (K13): peran dibandingkan lewat _normRole_ supaya
   "Super User", "super user", dan "superuser" setara. Sebelumnya perbandingan
   exact-match, sehingga variasi penulisan di db_Users bisa membuat Super User
   gagal masuk atau — lebih buruk — membuat modul lain menerima "admin" sebagai
   Super User. Daftar peran yang berhak ada di PERAN_SUPER_USER (Guard.js). */
function _assertSuperUser(token) {
  var sesi = getSesiByToken(token);
  if (!sesi) throw new Error("Sesi habis, silakan login ulang.");

  var roleAsli = String(sesi.role || "").trim();
  var role = typeof _normRole_ === "function" ? _normRole_(roleAsli) : roleAsli;

  var boleh = false;
  var daftar =
    typeof PERAN_SUPER_USER !== "undefined" && PERAN_SUPER_USER.length
      ? PERAN_SUPER_USER
      : ["SUPER"];
  for (var i = 0; i < daftar.length; i++) {
    if (_normRole_(daftar[i]) === role) {
      boleh = true;
      break;
    }
  }
  if (!boleh) throw new Error("Akses ditolak: menu ini khusus Super User.");
  return sesi;
}

function _findRowAkun(sh, username) {
  var data = sh.getDataRange().getValues();
  var target = String(username || "")
    .trim()
    .toLowerCase();
  for (var i = 1; i < data.length; i++) {
    if (
      String(data[i][COL_USERS.userName] || "")
        .trim()
        .toLowerCase() === target
    )
      return i + 1;
  }
  return -1;
}

function getDaftarAkun(token) {
  _assertSuperUser(token);
  var sh = _akunSheet();
  var data = sh.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!String(r[COL_USERS.userName] || "").trim()) continue;
    rows.push({
      no: r[COL_USERS.no],
      email: String(r[COL_USERS.email] || "").trim(),
      username: String(r[COL_USERS.userName] || "").trim(),
      role: String(r[COL_USERS.role] || "").trim(),
      ulp: String(r[COL_USERS.ulp] || "").trim(),
      kodeUlp: String(r[COL_USERS.kodeUlp] || "").trim(),
      bidang: String(r[COL_USERS.bidang] || "").trim(),
      tim: String(r[COL_USERS.tim] || "").trim(),
      subTim: String(r[COL_USERS.subTim] || "").trim(),
      aksesMenu: _parseAksesMenu(r[COL_USERS.aksesMenu]),
    });
  }
  return { ok: true, rows: rows };
}

function tambahAkun(token, data) {
  _assertSuperUser(token);
  data = data || {};
  var sh = _akunSheet();
  var uname = String(data.username || "").trim();
  if (!uname) return { ok: false, message: "Username wajib diisi." };
  if (!String(data.password || "").trim())
    return { ok: false, message: "Password wajib diisi." };
  if (_findRowAkun(sh, uname) !== -1)
    return { ok: false, message: "Username sudah dipakai." };

  var akses = Array.isArray(data.aksesMenu)
    ? data.aksesMenu.join(", ")
    : String(data.aksesMenu || "");
  var baris = [];
  baris[COL_USERS.no] = sh.getLastRow();
  baris[COL_USERS.email] = String(data.email || "").trim();
  baris[COL_USERS.userName] = uname;
  /* Disimpan sebagai hash, bukan plaintext. Kolom tetap sama — hanya isinya.
     Kalau Guard.js belum terpasang, jatuh ke plaintext (masa transisi) agar
     akun tetap bisa dibuat; login akan meng-hash-nya saat pertama dipakai. */
  baris[COL_USERS.password] =
    typeof _hashPw_ === "function"
      ? _hashPw_(String(data.password || "").trim(), _saltBaru_())
      : String(data.password || "").trim();
  baris[COL_USERS.role] = String(data.role || "").trim();
  baris[COL_USERS.ulp] = String(data.ulp || "").trim();
  baris[COL_USERS.kodeUlp] = String(data.kodeUlp || "").trim();
  baris[COL_USERS.bidang] = String(data.bidang || "").trim();
  baris[COL_USERS.tim] = String(data.tim || "").trim();
  baris[COL_USERS.subTim] = String(data.subTim || "").trim();
  baris[COL_USERS.aksesMenu] = akses;
  sh.appendRow(baris);
  SpreadsheetApp.flush();
  _bustUsersCache_(); // perubahan akun langsung terlihat login
  return { ok: true };
}

function updateAkun(token, data) {
  _assertSuperUser(token);
  data = data || {};
  var sh = _akunSheet();
  var target = String(data.targetUsername || data.username || "").trim();
  var row = _findRowAkun(sh, target);
  if (row === -1)
    return { ok: false, message: "Akun tidak ditemukan: " + target };

  var unameBaru = String(data.username || "").trim() || target;
  if (
    unameBaru.toLowerCase() !== target.toLowerCase() &&
    _findRowAkun(sh, unameBaru) !== -1
  )
    return { ok: false, message: "Username baru sudah dipakai." };

  sh.getRange(row, COL_USERS.userName + 1).setValue(unameBaru);
  if (data.email != null)
    sh.getRange(row, COL_USERS.email + 1).setValue(String(data.email).trim());
  if (data.role != null)
    sh.getRange(row, COL_USERS.role + 1).setValue(String(data.role).trim());
  if (data.ulp != null)
    sh.getRange(row, COL_USERS.ulp + 1).setValue(String(data.ulp).trim());
  if (data.kodeUlp != null)
    sh.getRange(row, COL_USERS.kodeUlp + 1).setValue(
      String(data.kodeUlp).trim(),
    );
  if (data.bidang != null)
    sh.getRange(row, COL_USERS.bidang + 1).setValue(String(data.bidang).trim());
  if (data.tim != null)
    sh.getRange(row, COL_USERS.tim + 1).setValue(String(data.tim).trim());
  if (data.subTim != null)
    sh.getRange(row, COL_USERS.subTim + 1).setValue(String(data.subTim).trim());
  if (data.aksesMenu != null)
    sh.getRange(row, COL_USERS.aksesMenu + 1).setValue(
      Array.isArray(data.aksesMenu)
        ? data.aksesMenu.join(", ")
        : String(data.aksesMenu),
    );
  if (data.password != null && String(data.password).trim())
    sh.getRange(row, COL_USERS.password + 1).setValue(
      typeof _hashPw_ === "function"
        ? _hashPw_(String(data.password).trim(), _saltBaru_())
        : String(data.password).trim(),
    );
  SpreadsheetApp.flush();
  _bustUsersCache_(); // perubahan akun langsung terlihat login
  return { ok: true };
}

function hapusAkun(token, username) {
  var sesi = _assertSuperUser(token);
  var sh = _akunSheet();
  var target = String(username || "").trim();
  if (
    target.toLowerCase() ===
    String(sesi.username || "")
      .trim()
      .toLowerCase()
  )
    return {
      ok: false,
      message: "Tidak dapat menghapus akun yang sedang login.",
    };
  var row = _findRowAkun(sh, target);
  if (row === -1)
    return { ok: false, message: "Akun tidak ditemukan: " + target };
  sh.deleteRow(row);
  SpreadsheetApp.flush();
  _bustUsersCache_(); // perubahan akun langsung terlihat login
  return { ok: true };
}

function resetPasswordAkun(token, username, passwordBaru) {
  _assertSuperUser(token);
  var sh = _akunSheet();
  var row = _findRowAkun(sh, String(username || "").trim());
  if (row === -1) return { ok: false, message: "Akun tidak ditemukan." };
  if (!String(passwordBaru || "").trim())
    return { ok: false, message: "Password baru wajib diisi." };
  var pwBaru = String(passwordBaru).trim();
  sh.getRange(row, COL_USERS.password + 1).setValue(
    typeof _hashPw_ === "function"
      ? _hashPw_(pwBaru, _saltBaru_())
      : pwBaru,
  );
  SpreadsheetApp.flush();
  /* Buka kunci throttle: password sudah diganti, percobaan gagal yang lalu
     bukan lagi indikasi serangan terhadap kredensial yang sekarang. */
  if (typeof loginThrottleReset_ === "function") loginThrottleReset_(username);
  _bustUsersCache_(); // perubahan akun langsung terlihat login
  return { ok: true };
}
