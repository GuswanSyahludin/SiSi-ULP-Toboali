/* T-07 / H-03: fail-closed boundary for mobile ROW append. */
function _t07Hash_(value) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ''),
  );
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] & 255).toString(16);
    if (b.length < 2) b = '0' + b;
    out += b;
  }
  return out;
}

function _t07Text_(value, name, max) {
  var text = String(value == null ? '' : value).trim();
  if (text.length > max) throw new Error(name + ' terlalu panjang.');
  return typeof safeCell_ === 'function' ? safeCell_(text) : text;
}

function _t07Coordinate_(value, name) {
  var text = String(value == null ? '' : value).trim();
  if (!text) return '';
  var parts = text.split(',').map(function (part) { return part.trim(); });
  if (parts.length !== 2) throw new Error(name + ' harus berformat lintang,bujur.');
  var lat = Number(parts[0]);
  var lng = Number(parts[1]);
  if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(name + ' berada di luar rentang koordinat.');
  }
  return lat + ',' + lng;
}

function _t07Prepare_(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload ROW tidak valid.');
  }
  var out = {};
  for (var key in payload) out[key] = payload[key];
  var idem = String(out.idempotencyKey || out.clientRequestId || '').trim();
  if (!idem || idem.length > 160) throw new Error('idempotencyKey wajib diisi.');
  out.idempotencyKey = idem;
  out.penyulang = _t07Text_(out.penyulang, 'Penyulang', 200);
  out.section = _t07Text_(out.section, 'Section', 300);
  out.nomorTiang = _t07Text_(out.nomorTiang, 'Nomor tiang', 120);
  out.koordinatTiang = _t07Coordinate_(out.koordinatTiang, 'Koordinat tiang');
  out.koordinatPekerjaan = _t07Coordinate_(out.koordinatPekerjaan, 'Koordinat pekerjaan');
  if (out.diameter !== '' && out.diameter != null) {
    var diameter = Number(out.diameter);
    if (!isFinite(diameter) || diameter < 0 || diameter > 1000) throw new Error('Diameter tidak valid.');
    out.diameter = diameter;
  }
  return out;
}

var _t07SimpanMobileEksekusiRow_ = simpanMobileEksekusiRow;
simpanMobileEksekusiRow = function (payload) {
  var g = guard_(arguments, { ulp: true, aksi: 'simpanMobileEksekusiRow' });
  var prepared = _t07Prepare_(payload);
  var idemKey = 'SISI_T07_ROW_IDEM|' + _t07Hash_(g.username + '|' + prepared.idempotencyKey);
  if (typeof withLock_ !== 'function') throw new Error('Lock otorisasi tidak tersedia.');
  return withLock_(function () {
    var props = PropertiesService.getScriptProperties();
    var cached = props.getProperty(idemKey);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { props.deleteProperty(idemKey); }
    }
    var result = _t07SimpanMobileEksekusiRow_(prepared);
    if (result && result.success === true) {
      props.setProperty(idemKey, JSON.stringify(result));
    }
    return result;
  }, 30000);
};
