/*
 * H-06 device-token lifetime enforcement.
 *
 * Contract:
 * - absolute TTL: 30 days from issuance
 * - idle TTL: 7 days since lastSeenAt
 * - either limit forces loginPerangkat again
 * - cekPerangkat never rotates an expired token; it deletes it and rejects it
 * - cleanup is scheduled by harianPusatSiSi through TRIGGER_SISI_HARIAN
 */
var DEV_ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
var DEV_IDLE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
var DEV_EXPIRED_CODE = "DEVICE_TOKEN_EXPIRED";

function _devTtlTimes_(rec) {
  rec = rec || {};
  var created = Number(rec.dibuatPada || 0);
  var lastSeen = Number(rec.lastSeenAt || rec.terakhirDipakai || created || 0);
  var expires = Number(rec.expiresAt || 0);
  // Legacy records are normalized from their original issuance time. A record
  // without issuance metadata is invalid rather than granted a fresh lifetime.
  if (!expires && created) expires = created + DEV_ABSOLUTE_TTL_MS;
  return { created: created, lastSeen: lastSeen, expires: expires };
}

function _devTokenExpired_(rec, now) {
  var t = _devTtlTimes_(rec);
  var clock = Number(now || Date.now());
  return !t.created || !t.lastSeen || !t.expires ||
    clock >= t.expires || clock - t.lastSeen >= DEV_IDLE_TTL_MS;
}

function _devTokenExpiredResult_() {
  return {
    success: false,
    kode: DEV_EXPIRED_CODE,
    message: "Sesi perangkat kedaluwarsa. Silakan login ulang.",
  };
}

function _devRecordWithTtl_(rec, now) {
  var t = _devTtlTimes_(rec);
  rec.dibuatPada = t.created;
  rec.expiresAt = t.expires;
  rec.lastSeenAt = Number(now || Date.now());
  rec.terakhirDipakai = rec.lastSeenAt;
  return rec;
}

function _devSimpanTokenBaru_(username, password, perangkat, row) {
  var dasar = _devSesiDariBaris_(row);
  var now = Date.now();
  var deviceToken = Utilities.getUuid().replace(/-/g, "");
  _devTulis_(deviceToken, {
    username: dasar.username,
    pwSig: _devSidik_(password),
    dibuatPada: now,
    expiresAt: now + DEV_ABSOLUTE_TTL_MS,
    lastSeenAt: now,
    terakhirDipakai: now,
    perangkat: String(perangkat || "").substring(0, 80),
  });
  _devPangkas_(username);
  return { token: deviceToken, dasar: dasar, now: now };
}

loginPerangkat = function (username, password, perangkat) {
  try {
    username = String(username || "").trim();
    password = String(password || "");
    if (!username || !password)
      return { success: false, message: "Username dan password wajib diisi" };
    var v = verifikasiLogin_(username, password);
    if (!v.boleh) return { success: false, message: v.pesan };
    var r = _devCariBaris_(username);
    if (!r) return { success: false, message: "Username tidak ditemukan" };
    var pw = String(r[COL_USERS.password] || "").trim();
    var issued = _devSimpanTokenBaru_(username, pw, perangkat, r);
    var sesi = _devTerbitkanSesi_(issued.dasar);
    sesi.success = true;
    sesi.deviceToken = issued.token;
    sesi.expiresAt = issued.now + DEV_ABSOLUTE_TTL_MS;
    sesi.lastSeenAt = issued.now;
    return sesi;
  } catch (e) {
    return { success: false, message: "Error loginPerangkat: " + e.message };
  }
};

cekPerangkat = function (deviceToken) {
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
    var now = Date.now();
    if (_devTokenExpired_(rec, now)) {
      _devHapus_(deviceToken);
      return _devTokenExpiredResult_();
    }
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
    _devRecordWithTtl_(rec, now);
    _devTulis_(deviceToken, rec);
    var sesi = _devTerbitkanSesi_(_devSesiDariBaris_(r));
    sesi.success = true;
    sesi.deviceToken = deviceToken;
    sesi.expiresAt = rec.expiresAt;
    sesi.lastSeenAt = rec.lastSeenAt;
    return sesi;
  } catch (e) {
    return { success: false, message: "Error cekPerangkat: " + e.message };
  }
};

bersihkanPerangkatTerlantar = function () {
  var semua = _devSemua_();
  var n = 0;
  var now = Date.now();
  for (var i = 0; i < semua.length; i++) {
    if (_devTokenExpired_(semua[i], now)) {
      _devHapus_(semua[i].deviceToken);
      n++;
    }
  }
  return {
    success: true,
    dihapus: n,
    absoluteTtlHari: DEV_ABSOLUTE_TTL_MS / 86400000,
    idleTtlHari: DEV_IDLE_TTL_MS / 86400000,
  };
};

// Run cleanup from the existing daily central worker. The guard avoids a
// duplicate entry if this compatibility file is evaluated more than once.
if (typeof TRIGGER_SISI_HARIAN !== "undefined" &&
    TRIGGER_SISI_HARIAN.indexOf("bersihkanPerangkatTerlantar") < 0) {
  TRIGGER_SISI_HARIAN.push("bersihkanPerangkatTerlantar");
}
