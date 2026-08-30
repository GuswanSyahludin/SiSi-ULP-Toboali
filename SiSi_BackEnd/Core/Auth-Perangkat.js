/* =====================================================
   Auth-Perangkat.js — sesi perangkat tanpa batas waktu + router API tambahan
   Rev 22 Agu 2026

   WAJIB di apiRouter_ Code.js, tepat setelah `var result;`:
     if (typeof authPerangkatRouter_ === "function") {
       var lewatAuth = authPerangkatRouter_(e, body);
       if (lewatAuth) return lewatAuth;
     }

   Router ini juga menjadi pintu modul mobile tambahan agar Code.js besar tidak
   perlu terus diubah. getMasterGarduMobile diteruskan ke Master-Gardu-Mobile.js.
   ===================================================== */

var DEV_PREFIX = "dev_";
var DEV_SALT = "SiSi.Perangkat.ULP.Toboali.2026";
var DEV_MAX_PER_USER = 5;
var DEV_TOUCH_MS = 6 * 60 * 60 * 1000;
var AUTH_PERANGKAT_ACTIONS = [
  "loginPerangkat",
  "cekPerangkat",
  "logoutPerangkat",
  "daftarPerangkat",
  "cabutPerangkat",
  "getMasterGarduMobile",
];

function _devJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
function _devProps_() {
  return PropertiesService.getScriptProperties();
}
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
  var semua = _devProps_().getProperties(),
    out = [];
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

function _devCariBaris_(username) {
  var data = typeof _usersRowsCache_ === "function" ? _usersRowsCache_() : null;
  if (!data || !data.length) return null;
  var target = String(username || "")
    .trim()
    .toLowerCase();
  for (var i = 1; i < data.length; i++) {
    if (
      String(data[i][COL_USERS.userName] || "")
        .trim()
        .toLowerCase() === target
    )
      return data[i];
  }
  return null;
}
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
function _devTerbitkanSesi_(dasar) {
  var token = Utilities.getUuid(),
    sesi = {};
  for (var k in dasar) sesi[k] = dasar[k];
  sesi.token = token;
  sesi.loginAt = new Date().toISOString();
  var ttl = _devTtl_();
  CacheService.getScriptCache().put("sesi_" + token, JSON.stringify(sesi), ttl);
  /* DIHAPUS 29 Agu 2026 (K1 — session confusion):
     CacheService.getUserCache().put("userToken", ...).
     Di bawah executeAs: USER_DEPLOYING + access: ANYONE_ANONYMOUS, getUserCache
     di-scope ke PEMILIK SCRIPT, bukan per pengguna — jadi dipakai bersama semua
     pengunjung anonim dan bisa menyerahkan token pengguna lain.
     Token dikembalikan ke klien dan dikirim balik eksplisit di setiap request. */
  return sesi;
}
function _devPangkas_(username) {
  var target = String(username || "").toLowerCase();
  var semua = _devSemua_(),
    milik = [];
  for (var i = 0; i < semua.length; i++)
    if (String(semua[i].username || "").toLowerCase() === target)
      milik.push(semua[i]);
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

function loginPerangkat(username, password, perangkat) {
  try {
    username = String(username || "").trim();
    password = String(password || "");
    if (!username || !password)
      return { success: false, message: "Username dan password wajib diisi" };
    /* Verifikasi terpadu (29 Agu 2026): throttle + dual-read hash/plaintext +
       upgrade hash otomatis, sama persis dengan jalur doLogin. Sebelumnya
       `if (pw !== password)` — plaintext dan tanpa pembatasan percobaan. */
    var v = verifikasiLogin_(username, password);
    if (!v.boleh) return { success: false, message: v.pesan };

    var r = _devCariBaris_(username);
    if (!r) return { success: false, message: "Username tidak ditemukan" };
    var pw = String(r[COL_USERS.password] || "").trim();

    var deviceToken = Utilities.getUuid().replace(/-/g, "");
    var now = Date.now(),
      dasar = _devSesiDariBaris_(r);
    _devTulis_(deviceToken, {
      username: dasar.username,
      pwSig: _devSidik_(pw),
      dibuatPada: now,
      terakhirDipakai: now,
      perangkat: String(perangkat || "").substring(0, 80),
    });
    _devPangkas_(dasar.username);
    var sesi = _devTerbitkanSesi_(dasar);
    sesi.success = true;
    sesi.deviceToken = deviceToken;
    return sesi;
  } catch (e) {
    return { success: false, message: "Error loginPerangkat: " + e.message };
  }
}

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
    var r = _devCariBaris_(rec.username);
    if (!r) {
      _devHapus_(deviceToken);
      return {
        success: false,
        kode: "AKUN_TIDAK_ADA",
        message: "Akun sudah tidak terdaftar. Hubungi Super User.",
      };
    }
    var pw = String(r[COL_USERS.password] || "").trim();
    if (_devSidik_(pw) !== String(rec.pwSig || "")) {
      _devHapus_(deviceToken);
      return {
        success: false,
        kode: "PASSWORD_BERUBAH",
        message: "Password akun sudah berubah. Silakan login ulang.",
      };
    }
    var now = Date.now();
    if (now - Number(rec.terakhirDipakai || 0) > DEV_TOUCH_MS) {
      rec.terakhirDipakai = now;
      try {
        _devTulis_(deviceToken, rec);
      } catch (eT) {}
    }
    var sesi = _devTerbitkanSesi_(_devSesiDariBaris_(r));
    sesi.success = true;
    sesi.deviceToken = deviceToken;
    return sesi;
  } catch (e) {
    return { success: false, message: "Error cekPerangkat: " + e.message };
  }
}

function logoutPerangkat(deviceToken, token) {
  try {
    deviceToken = String(deviceToken || "").trim();
    if (deviceToken) _devHapus_(deviceToken);
    if (token)
      try {
        CacheService.getScriptCache().remove("sesi_" + String(token).trim());
      } catch (eS) {}
    return { success: true };
  } catch (e) {
    return { success: false, message: "Error logoutPerangkat: " + e.message };
  }
}

function daftarPerangkat(token) {
  try {
    /* FAIL-CLOSED. Pola lama `if (typeof _assertSuperUser === "function")` akan
       melewatkan pemeriksaan bila Code.js gagal dimuat, padahal fungsi ini
       mengembalikan deviceToken semua pengguna. */
    _assertSuperUserKetat_(token);
    var semua = _devSemua_(),
      out = [];
    for (var i = 0; i < semua.length; i++)
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
    out.sort(function (a, b) {
      return String(a.username).localeCompare(String(b.username));
    });
    return { success: true, jumlah: out.length, perangkat: out };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function cabutPerangkat(token, deviceToken, username) {
  try {
    /* FAIL-CLOSED — lihat catatan di daftarPerangkat(). */
    _assertSuperUserKetat_(token);
    deviceToken = String(deviceToken || "").trim();
    username = String(username || "").trim();
    if (deviceToken) {
      if (!_devBaca_(deviceToken))
        return { success: false, message: "Perangkat tidak ditemukan." };
      _devHapus_(deviceToken);
      return { success: true, dicabut: 1 };
    }
    if (username) {
      var semua = _devSemua_(),
        n = 0;
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

function bersihkanPerangkatTerlantar(hari) {
  var batasHari = Number(hari || 365);
  var batas = Date.now() - batasHari * 86400000;
  var semua = _devSemua_(),
    n = 0;
  for (var i = 0; i < semua.length; i++) {
    var pakai = Number(semua[i].terakhirDipakai || semua[i].dibuatPada || 0);
    if (pakai && pakai < batas) {
      _devHapus_(semua[i].deviceToken);
      n++;
    }
  }
  return { success: true, dihapus: n };
}

function authPerangkatRouter_(e, body) {
  var p = (e && e.parameter) || {};
  var action = String((body && body.action) || p.action || "").trim();
  if (AUTH_PERANGKAT_ACTIONS.indexOf(action) < 0) return null;
  var hasil;
  try {
    switch (action) {
      case "loginPerangkat":
        hasil = body
          ? loginPerangkat(body.username, body.password, body.perangkat)
          : { success: false, message: "Login wajib menggunakan POST JSON." };
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
      case "getMasterGarduMobile":
        if (body && body.mode === "update") {
          hasil =
            typeof updateMasterGarduMobile === "function"
              ? updateMasterGarduMobile(body.token, body.payload || {})
              : {
                  success: false,
                  message: "Master-Gardu-Sync-Mobile.js belum terpasang.",
                };
        } else {
          hasil =
            typeof getMasterGarduMobile === "function"
              ? getMasterGarduMobile(
                  (body && body.token) || p.token,
                  (body && body.ulp) || p.ulp,
                )
              : {
                  success: false,
                  message: "Master-Gardu-Mobile.js belum terpasang.",
                };
        }
        break;
      default:
        return null;
    }
  } catch (err) {
    hasil = { success: false, message: "Error server: " + err.message };
  }
  return _devJson_(hasil);
}
