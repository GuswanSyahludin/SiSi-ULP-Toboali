/* =====================================================
   Auth-Perangkat.js — SiSi ULP Toboali (SESI PERANGKAT / "DEVICE TOKEN")
   Rev 22 Agu 2026 — sesi login mobile TANPA BATAS WAKTU, tanpa menyimpan
   password di perangkat.
   -----------------------------------------------------
   LATAR MASALAH
   Sesi web app disimpan di CacheService dengan SESSION_TTL_SEC = 15 menit
   (Code.js). Untuk browser itu tepat, tapi untuk APK petugas lapangan artinya
   layar login muncul terus-terusan. Solusi tahap pertama (menyimpan
   username+password di HP lalu login senyap) berhasil, tapi menaruh password
   di perangkat — itu yang dibereskan file ini.

   POLA: DUA LAPIS TOKEN
     • TOKEN PERANGKAT (deviceToken) — TANPA kedaluwarsa. Diterbitkan sekali
       saat login pertama, disimpan di HP + ScriptProperties. HANYA hangus bila:
         1. user menekan "Keluar dari Akun"        -> logoutPerangkat
         2. password diganti / di-reset admin      -> pwSig tidak cocok lagi
         3. akun dihapus dari db_Users             -> baris tidak ditemukan
         4. dicabut Super User                     -> cabutPerangkat
     • TOKEN SESI (token) — TETAP 15 menit, dipakai SEMUA endpoint lama tanpa
       satu pun perubahan. Diterbitkan ulang otomatis setiap cekPerangkat.

   Jadi ini MURNI TAMBAHAN: tidak ada endpoint lama yang berubah perilakunya,
   dan tidak ada kolom baru di spreadsheet.

   EFEK SAMPING YANG MENGUNTUNGKAN
   Karena sesi selalu dibangun ulang dari baris db_Users terbaru, perubahan
   role / ULP / Tim / Akses Menu oleh Super User langsung berlaku saat aplikasi
   dibuka berikutnya — tanpa user perlu logout.

   PENYIMPANAN
   ScriptProperties, satu properti per perangkat: kunci "dev_<deviceToken>",
   nilai JSON { username, pwSig, dibuatPada, terakhirDipakai, perangkat }.
   Password TIDAK pernah disimpan — hanya sidik jari SHA-256-nya (pwSig),
   dipakai semata untuk mendeteksi penggantian password.

   ┌───────────────────────────────────────────────────────────────────────┐
   │ WAJIB: 1 BARIS SISIP DI Code.js                                       │
   │ Tanpa ini router lama menjawab "Action API tidak dikenal".             │
   │ Tempel blok berikut TEPAT SETELAH baris "var result;" di apiRouter_:   │
   │                                                                       │
   │   if (typeof authPerangkatRouter_ === "function") {                    │
   │     var lewatAuth = authPerangkatRouter_(e, body);                     │
   │     if (lewatAuth) return lewatAuth;                                   │
   │   }                                                                    │
   │                                                                       │
   │ Guard typeof membuatnya aman untuk clasp push bertahap.                │
   └───────────────────────────────────────────────────────────────────────┘

   ENDPOINT BARU (semua lewat ?mobile=1)
     action=loginPerangkat  &username=&password=[&perangkat=]
     action=cekPerangkat    &deviceToken=
     action=logoutPerangkat &deviceToken=
     action=daftarPerangkat &token=            (Super User)
     action=cabutPerangkat  &token=&deviceToken=|&username=  (Super User)
   ===================================================== */

/* ── Konstanta ── */
var DEV_PREFIX = "dev_"; // awalan kunci ScriptProperties
var DEV_SALT = "SiSi.Perangkat.ULP.Toboali.2026"; // pengacak sidik password
var DEV_MAX_PER_USER = 5; // batas perangkat aktif per akun
var DEV_TOUCH_MS = 6 * 60 * 60 * 1000; // hemat tulis: perbarui "terakhirDipakai" maks tiap 6 jam
var AUTH_PERANGKAT_ACTIONS = [
  "loginPerangkat",
  "cekPerangkat",
  "logoutPerangkat",
  "daftarPerangkat",
  "cabutPerangkat",
];

/* ── Utilitas dasar ── */
function _devJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function _devProps_() {
  return PropertiesService.getScriptProperties();
}

// Sidik jari password (SHA-256 + salt, base64). Satu arah — password asli
// tidak bisa dipulihkan dari nilai ini.
function _devSidik_(nilai) {
  var b = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    DEV_SALT + "|" + String(nilai == null ? "" : nilai),
    Utilities.Charset.UTF_8,
  );
  return Utilities.base64Encode(b);
}

function _devTtl_() {
  return typeof SESSION_TTL_SEC !== "undefined" && SESSION_TTL_SEC
    ? SESSION_TTL_SEC
    : 900;
}

function _devBaca_(deviceToken) {
  if (!deviceToken) return null;
  var raw = _devProps_().getProperty(DEV_PREFIX + deviceToken);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function _devTulis_(deviceToken, rec) {
  _devProps_().setProperty(DEV_PREFIX + deviceToken, JSON.stringify(rec));
}

function _devHapus_(deviceToken) {
  try {
    _devProps_().deleteProperty(DEV_PREFIX + deviceToken);
  } catch (e) {}
}

function _devSemua_() {
  var semua = _devProps_().getProperties();
  var out = [];
  for (var k in semua) {
    if (k.indexOf(DEV_PREFIX) !== 0) continue;
    try {
      var rec = JSON.parse(semua[k]);
      rec.deviceToken = k.substring(DEV_PREFIX.length);
      out.push(rec);
    } catch (e) {}
  }
  return out;
}

/* ── Jembatan ke db_Users (memakai cache 10 menit milik Code.js) ── */
function _devCariBaris_(username) {
  var data = typeof _usersRowsCache_ === "function" ? _usersRowsCache_() : null;
  if (!data || !data.length) return null;
  var target = String(username || "")
    .trim()
    .toLowerCase();
  if (!target) return null;
  for (var i = 1; i < data.length; i++) {
    var u = String(data[i][COL_USERS.userName] || "")
      .trim()
      .toLowerCase();
    if (u === target) return data[i];
  }
  return null;
}

// Susun isi sesi dari baris db_Users — bentuknya SAMA dengan balasan doLogin
// supaya sisi Flutter tidak perlu membedakan jalur login biasa vs perangkat.
function _devSesiDariBaris_(r) {
  return {
    username: String(r[COL_USERS.userName] || "").trim(),
    email: String(r[COL_USERS.email] || "").trim(),
    role: String(r[COL_USERS.role] || "").trim(),
    ulp: String(r[COL_USERS.ulp] || "").trim(),
    kodeUlp: String(r[COL_USERS.kodeUlp] || "").trim(),
    bidang: String(r[COL_USERS.bidang] || "").trim(),
    tim: String(r[COL_USERS.tim] || "").trim(),
    subTim: String(r[COL_USERS.subTim] || "").trim(),
    aksesMenu: String(r[COL_USERS.aksesMenu] || "").trim(),
  };
}

// Terbitkan token sesi 15 menit — persis seperti doLogin, sehingga seluruh
// endpoint lama (getSesiByToken) menerimanya tanpa perubahan apa pun.
function _devTerbitkanSesi_(dasar) {
  var token = Utilities.getUuid();
  var sesi = {};
  for (var k in dasar) sesi[k] = dasar[k];
  sesi.token = token;
  sesi.loginAt = new Date().toISOString();

  var ttl = _devTtl_();
  CacheService.getScriptCache().put("sesi_" + token, JSON.stringify(sesi), ttl);
  try {
    CacheService.getUserCache().put("userToken", token, ttl);
  } catch (e) {}
  return sesi;
}

// Batasi jumlah perangkat aktif per akun: yang paling lama tidak dipakai dibuang.
function _devPangkas_(username) {
  var target = String(username || "").toLowerCase();
  var semua = _devSemua_();
  var milik = [];
  for (var i = 0; i < semua.length; i++) {
    if (String(semua[i].username || "").toLowerCase() === target)
      milik.push(semua[i]);
  }
  if (milik.length <= DEV_MAX_PER_USER) return 0;

  milik.sort(function (a, b) {
    return (
      Number(a.terakhirDipakai || a.dibuatPada || 0) -
      Number(b.terakhirDipakai || b.dibuatPada || 0)
    );
  });
  var buang = milik.length - DEV_MAX_PER_USER;
  for (var j = 0; j < buang; j++) _devHapus_(milik[j].deviceToken);
  return buang;
}

/* ═══ 1) LOGIN PERTAMA — terbitkan token perangkat ═══
   Dipakai HANYA saat user mengetik username+password. Sesudah ini aplikasi
   cukup menyimpan deviceToken; password tidak perlu ikut disimpan. */
function loginPerangkat(username, password, perangkat) {
  try {
    username = String(username || "").trim();
    password = String(password || "");
    if (!username || !password)
      return { success: false, message: "Username dan password wajib diisi" };

    var r = _devCariBaris_(username);
    if (!r) return { success: false, message: "Username tidak ditemukan" };

    var pwTersimpan = String(r[COL_USERS.password] || "").trim();
    if (pwTersimpan !== password)
      return { success: false, message: "Password salah" };

    var deviceToken = Utilities.getUuid().replace(/-/g, "");
    var now = Date.now();
    var dasar = _devSesiDariBaris_(r);

    _devTulis_(deviceToken, {
      username: dasar.username,
      pwSig: _devSidik_(pwTersimpan),
      dibuatPada: now,
      terakhirDipakai: now,
      perangkat: String(perangkat || "").substring(0, 80),
    });
    _devPangkas_(dasar.username);

    var sesi = _devTerbitkanSesi_(dasar);
    sesi.success = true;
    sesi.deviceToken = deviceToken; // SIMPAN ini di HP, bukan password
    return sesi;
  } catch (e) {
    return { success: false, message: "Error loginPerangkat: " + e.message };
  }
}

/* ═══ 2) BUKA APLIKASI — tukar token perangkat jadi sesi baru ═══
   Inti "sesi tanpa batas waktu": token perangkat tidak pernah kedaluwarsa,
   dan setiap dipanggil ia mencetak token sesi 15 menit yang segar. */
function cekPerangkat(deviceToken) {
  try {
    deviceToken = String(deviceToken || "").trim();
    if (!deviceToken)
      return {
        success: false,
        kode: "TANPA_TOKEN",
        message: "deviceToken wajib diisi.",
      };

    var rec = _devBaca_(deviceToken);
    if (!rec)
      return {
        success: false,
        kode: "PERANGKAT_TIDAK_DIKENAL",
        message: "Sesi perangkat tidak dikenali. Silakan login ulang.",
      };

    // Akun masih ada? (dihapus admin -> perangkat dicabut)
    var r = _devCariBaris_(rec.username);
    if (!r) {
      _devHapus_(deviceToken);
      return {
        success: false,
        kode: "AKUN_TIDAK_ADA",
        message: "Akun sudah tidak terdaftar. Hubungi Super User.",
      };
    }

    // Password masih sama? (diganti user / di-reset admin -> perangkat dicabut)
    var pwTersimpan = String(r[COL_USERS.password] || "").trim();
    if (_devSidik_(pwTersimpan) !== String(rec.pwSig || "")) {
      _devHapus_(deviceToken);
      return {
        success: false,
        kode: "PASSWORD_BERUBAH",
        message: "Password akun sudah berubah. Silakan login ulang.",
      };
    }

    // Catat pemakaian — ditulis paling sering tiap DEV_TOUCH_MS agar hemat kuota.
    var now = Date.now();
    if (now - Number(rec.terakhirDipakai || 0) > DEV_TOUCH_MS) {
      rec.terakhirDipakai = now;
      try {
        _devTulis_(deviceToken, rec);
      } catch (eT) {}
    }

    // Sesi dibangun dari baris TERBARU: perubahan role/ULP/Tim/Akses Menu oleh
    // Super User langsung berlaku saat aplikasi dibuka.
    var sesi = _devTerbitkanSesi_(_devSesiDariBaris_(r));
    sesi.success = true;
    sesi.deviceToken = deviceToken;
    return sesi;
  } catch (e) {
    return { success: false, message: "Error cekPerangkat: " + e.message };
  }
}

/* ═══ 3) LOGOUT — satu-satunya jalan normal memutus sesi ═══ */
function logoutPerangkat(deviceToken, token) {
  try {
    deviceToken = String(deviceToken || "").trim();
    if (deviceToken) _devHapus_(deviceToken);
    // Token sesi yang sedang dipegang juga dimatikan agar tidak bisa dipakai lagi.
    if (token) {
      try {
        CacheService.getScriptCache().remove("sesi_" + String(token).trim());
      } catch (eS) {}
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: "Error logoutPerangkat: " + e.message };
  }
}

/* ═══ 4) PENGAWASAN SUPER USER ═══ */
function daftarPerangkat(token) {
  try {
    if (typeof _assertSuperUser === "function") _assertSuperUser(token);
    var semua = _devSemua_();
    var out = [];
    for (var i = 0; i < semua.length; i++) {
      out.push({
        deviceToken: semua[i].deviceToken,
        username: semua[i].username || "",
        perangkat: semua[i].perangkat || "",
        dibuatPada: semua[i].dibuatPada
          ? new Date(Number(semua[i].dibuatPada)).toISOString()
          : "",
        terakhirDipakai: semua[i].terakhirDipakai
          ? new Date(Number(semua[i].terakhirDipakai)).toISOString()
          : "",
      });
    }
    out.sort(function (a, b) {
      return String(a.username).localeCompare(String(b.username));
    });
    return { success: true, jumlah: out.length, perangkat: out };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// Cabut satu perangkat (deviceToken) ATAU semua perangkat milik satu akun (username).
function cabutPerangkat(token, deviceToken, username) {
  try {
    if (typeof _assertSuperUser === "function") _assertSuperUser(token);

    deviceToken = String(deviceToken || "").trim();
    username = String(username || "").trim();

    if (deviceToken) {
      if (!_devBaca_(deviceToken))
        return { success: false, message: "Perangkat tidak ditemukan." };
      _devHapus_(deviceToken);
      return { success: true, dicabut: 1 };
    }

    if (username) {
      var semua = _devSemua_();
      var n = 0;
      for (var i = 0; i < semua.length; i++) {
        if (
          String(semua[i].username || "").toLowerCase() ===
          username.toLowerCase()
        ) {
          _devHapus_(semua[i].deviceToken);
          n++;
        }
      }
      return { success: true, dicabut: n, username: username };
    }

    return {
      success: false,
      message: "Sertakan deviceToken atau username yang ingin dicabut.",
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/* ═══ 5) PERAWATAN (opsional, jalankan manual dari editor) ═══
   Sesi memang TANPA batas waktu — fungsi ini hanya membersihkan properti
   perangkat yang sudah lama sekali tidak dipakai (mis. HP hilang / diganti)
   agar ScriptProperties tidak menumpuk. Default 365 hari. */
function bersihkanPerangkatTerlantar(hari) {
  var batasHari = Number(hari || 365);
  var batas = Date.now() - batasHari * 24 * 60 * 60 * 1000;
  var semua = _devSemua_();
  var n = 0;
  for (var i = 0; i < semua.length; i++) {
    var pakai = Number(semua[i].terakhirDipakai || semua[i].dibuatPada || 0);
    if (pakai && pakai < batas) {
      _devHapus_(semua[i].deviceToken);
      n++;
    }
  }
  Logger.log(
    "bersihkanPerangkatTerlantar: " +
      n +
      " perangkat dihapus (tak dipakai > " +
      batasHari +
      " hari).",
  );
  return { success: true, dihapus: n };
}

/* ═══ ROUTER — dipanggil dari apiRouter_ (Code.js) ═══
   Mengembalikan ContentService bila action ditangani di sini, atau null bila
   bukan urusan file ini (biar router lama lanjut seperti biasa). */
function authPerangkatRouter_(e, body) {
  var p = (e && e.parameter) || {};
  var action = String((body && body.action) || p.action || "").trim();
  if (AUTH_PERANGKAT_ACTIONS.indexOf(action) < 0) return null;

  var hasil;
  try {
    switch (action) {
      case "loginPerangkat":
        hasil = loginPerangkat(
          (body && body.username) || p.username,
          (body && body.password) || p.password,
          (body && body.perangkat) || p.perangkat,
        );
        break;

      case "cekPerangkat":
        hasil = cekPerangkat((body && body.deviceToken) || p.deviceToken);
        break;

      case "logoutPerangkat":
        hasil = logoutPerangkat(
          (body && body.deviceToken) || p.deviceToken,
          (body && body.token) || p.token,
        );
        break;

      case "daftarPerangkat":
        hasil = daftarPerangkat((body && body.token) || p.token);
        break;

      case "cabutPerangkat":
        hasil = cabutPerangkat(
          (body && body.token) || p.token,
          (body && body.deviceToken) || p.deviceToken,
          (body && body.username) || p.username,
        );
        break;

      default:
        return null;
    }
  } catch (err) {
    hasil = { success: false, message: "Error server: " + err.message };
  }
  return _devJson_(hasil);
}
