/* P0 correction extension, 2026-09-06.
 * Installs wrappers at initialization, with NO service calls at initialization.
 * Existing router action names and the original duration/night-ROW formula stay intact.
 * One named metadata column is APPENDED on first correction; existing indices do not move.
 * See docs/P0-CORRECTION.md for deployment and recovery requirements.
 */
var P0_CORRECTION_VERSION = 2;
var P0_CORRECTION_COLUMN = 'Koreksi P0 Metadata';
var _p0CorrectionColumnMemo_ = null;

function _p0Other_(name) {
  return String(name || '').toLowerCase().replace(/[\s_\-]+/g, '') === 'lainlain';
}
function _p0Weight_(value) {
  if (value == null || String(value).trim() === '') throw new Error('Bobot pekerjaan Lain-lain wajib diisi (1-5).');
  var n = Number(String(value).replace(',', '.'));
  if (!isFinite(n) || n < 1 || n > 5) throw new Error('Bobot pekerjaan harus berupa angka 1-5.');
  return n;
}
function _p0MetaColumn_(sh, create) {
  if (_p0CorrectionColumnMemo_ != null) return _p0CorrectionColumnMemo_;
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var col = head.indexOf(P0_CORRECTION_COLUMN);
  if (col < 0 && create) {
    col = head.length;
    if (col >= sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), 1);
    sh.getRange(1, col + 1).setValue(P0_CORRECTION_COLUMN);
  }
  if (col >= 0) _p0CorrectionColumnMemo_ = col;
  return col;
}
function _p0Meta_(row, col) {
  if (col < 0 || !row[col]) return { revision: 0, history: [] };
  try {
    var meta = JSON.parse(String(row[col]));
    if (!meta || !Array.isArray(meta.history)) throw new Error('invalid');
    return meta;
  } catch (e) { throw new Error('Metadata koreksi P0 rusak. Hubungi Super User; jangan menimpa data.'); }
}
function _p0Scope_(g, row) {
  if (!g.isSuper && (!String(row[COL_P0.ulp] || '').trim() || !barisUlpCocok_(g, row[COL_P0.ulp]))) {
    throw new Error('P0 bukan milik ULP Anda.');
  }
}
function _p0WriteMeta_(sh, rowNum, col, meta) {
  var json = JSON.stringify(meta);
  if (json.length > 45000) throw new Error('Riwayat koreksi penuh. Arsipkan riwayat melalui administrator sebelum mengedit.');
  sh.getRange(rowNum, col + 1).setNumberFormat('@').setValue(json);
}

var _p0CorrectionInstalled_ = (function () {
  var originalMaster = getListPekerjaanP0;
  var originalList = getApprovalP0List;
  var originalScore = _hitungPoinDariRowY_;
  var originalApproval = setApprovalP0;

  getListPekerjaanP0 = function (params) {
    var result = originalMaster(params);
    if (result && result.ok) {
      result.correctionVersion = P0_CORRECTION_VERSION;
      result.bobotByNama = _bobotPekerjaanMapY_();
    }
    return result;
  };

  _hitungPoinDariRowY_ = function (row, bobotMap) {
    var name = String(row[COL_P0.namaPekerjaan] || '').trim();
    if (!_p0Other_(name)) return originalScore(row, bobotMap);
    var sh = _shY_(SHEET_YANDAL.P0);
    var meta = _p0Meta_(row, _p0MetaColumn_(sh, false));
    var weight = meta.namaPekerjaan === name ? meta.bobotManual : null;
    // A prepared write must not change the previous type's score before the type is written.
    if (meta.state === 'prepared' && meta.namaPekerjaan !== name && meta.previous) {
      weight = meta.previous.namaPekerjaan === name ? meta.previous.bobotManual : null;
    }
    if (weight == null || weight === '') {
      return { ok: false, skipped: true, reason: 'Bobot pekerjaan Lain-lain belum diisi (1-5).', namaPekerjaan: name };
    }
    var weights = {};
    Object.keys(bobotMap || {}).forEach(function (key) { weights[key] = bobotMap[key]; });
    weights[name.toLowerCase()] = _p0Weight_(weight);
    return originalScore(row, weights);
  };

  getApprovalP0List = function (params) {
    params = params || {};
    // Legacy list defaults empty status to Menunggu. Request a single scan with a truthy blank.
    var copy = {};
    Object.keys(params).forEach(function (key) { copy[key] = params[key]; });
    if (params.status === '') copy.status = ' ';
    var result = originalList(copy);
    if (!result || !result.ok || !result.list.length) return result;
    var sh = _shY_(SHEET_YANDAL.P0), col = _p0MetaColumn_(sh, false);
    var rows = sh.getDataRange().getValues(), byCode = {};
    for (var i = 1; i < rows.length; i++) byCode[String(rows[i][COL_P0.kodeP0])] = rows[i];
    result.list.forEach(function (item) {
      var row = byCode[item.kodeP0];
      if (!row) return;
      var meta = _p0Meta_(row, col);
      item.namaPekerjaanRaw = String(row[COL_P0.namaPekerjaan] || '').trim();
      item.koreksiRevision = Number(meta.revision || 0);
      item.koreksiHistory = meta.history;
      item.koreksiServerPending = meta.state === 'prepared';
      item.bobotManual = _p0Other_(item.namaPekerjaanRaw) ? meta.bobotManual : null;
    });
    return result;
  };

  updateNamaPekerjaanP0 = function (params) {
    var g = guard_(arguments, { role: ['ADMIN'], ulp: true, aksi: 'updateNamaPekerjaanP0' });
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return { ok: false, error: 'Sistem sibuk. Koreksi tetap di antrean, coba kirim lagi.' };
    try {
      params = params || {};
      var kode = String(params.kodeP0 || '').trim();
      var name = String(params.namaPekerjaan || '').trim();
      var reason = String(params.alasanKoreksi || '').trim();
      var requestId = String(params.requestId || '').trim();
      if (!kode || !name) throw new Error('Kode P0 dan jenis pekerjaan wajib diisi.');
      if (requestId && (!reason || reason.length > 500)) throw new Error('Alasan koreksi wajib diisi, maksimal 500 karakter.');
      var master = originalMaster({ token: g.token });
      if (!master || !master.ok) throw new Error('Master jenis pekerjaan gagal dimuat.');
      var canonical = (master.list || []).filter(function (v) { return String(v).toLowerCase() === name.toLowerCase(); })[0];
      if (!canonical) throw new Error('Jenis pekerjaan tidak ada di master.');
      name = String(canonical);
      var manual = _p0Other_(name) ? _p0Weight_(params.bobotManual) : null;
      var sh = _shY_(SHEET_YANDAL.P0), found = _findRowY_(sh, COL_P0.kodeP0, kode);
      if (!found) throw new Error('Baris P0 tidak ditemukan.');
      _p0Scope_(g, found.row);
      var col = _p0MetaColumn_(sh, false), meta = _p0Meta_(found.row, col);
      var fingerprint = JSON.stringify([kode, name, manual, reason, g.username]);
      var prior = (meta.history || []).filter(function (h) { return requestId && h.requestId === requestId; })[0];
      if (prior && prior.fingerprint !== fingerprint) throw new Error('Identitas permintaan sudah dipakai untuk koreksi berbeda.');
      if (prior && meta.state !== 'prepared') {
        return { ok: true, replayed: true, kodeP0: kode, namaPekerjaan: String(found.row[COL_P0.namaPekerjaan] || ''), bobotManual: meta.bobotManual, revision: meta.revision, history: meta.history, point: found.row[COL_P0.point] };
      }
      var resume = meta.state === 'prepared' && requestId && meta.requestId === requestId;
      if (meta.state === 'prepared' && !resume) throw new Error('Koreksi sebelumnya belum selesai. Kirim ulang koreksi tersebut terlebih dahulu.');
      if (!resume) {
        if (params.expectedRevision != null && Number(params.expectedRevision) !== Number(meta.revision || 0)) throw new Error('Konflik: P0 sudah dikoreksi pengguna lain. Muat ulang dan periksa jenis terbaru.');
        if (params.expectedNama != null && String(params.expectedNama) !== String(found.row[COL_P0.namaPekerjaan] || '').trim()) throw new Error('Konflik: jenis pekerjaan di server berubah. Muat ulang sebelum mengoreksi.');
        var before = { namaPekerjaan: String(found.row[COL_P0.namaPekerjaan] || '').trim(), bobotManual: meta.bobotManual == null ? null : meta.bobotManual };
        var event = { requestId: requestId || Utilities.getUuid(), fingerprint: fingerprint, namaLama: before.namaPekerjaan, namaPekerjaan: name, bobotManual: manual, alasan: reason || 'Koreksi melalui web', username: g.username, at: new Date().toISOString() };
        meta = { revision: Number(meta.revision || 0) + 1, state: 'prepared', requestId: event.requestId, namaPekerjaan: name, bobotManual: manual, previous: before, history: (meta.history || []).concat([event]) };
        col = _p0MetaColumn_(sh, true);
        _p0WriteMeta_(sh, found.rowNum, col, meta);
        SpreadsheetApp.flush();
      }
      _setTextY_(sh, found.rowNum, COL_P0.namaPekerjaan, safeCell_(name));
      SpreadsheetApp.flush();
      var latest = sh.getRange(found.rowNum, 1, 1, sh.getLastColumn()).getValues()[0];
      var score = _hitungPoinDariRowY_(latest, _bobotPekerjaanMapY_());
      var point = latest[COL_P0.point];
      if (String(latest[COL_P0.statusApproval]) === 'Approved') {
        // Never keep a stale score after a change to an unweighted master category.
        point = score.ok && !score.skipped ? score.point : '';
        _setY_(sh, found.rowNum, COL_P0.point, point);
      }
      meta.state = 'applied';
      delete meta.previous;
      _p0WriteMeta_(sh, found.rowNum, col, meta);
      SpreadsheetApp.flush();
      audit_(g.sesi, 'updateNamaPekerjaanP0', kode, 'OK', JSON.stringify({ nama: name, bobot: manual, revision: meta.revision }));
      return { ok: true, kodeP0: kode, namaPekerjaan: name, bobotManual: manual, revision: meta.revision, history: meta.history, point: point, warning: score.ok ? '' : score.reason };
    } catch (e) {
      return { ok: false, error: String(e.message || e) };
    } finally { lock.releaseLock(); }
  };

  setApprovalP0 = function (params) {
    var g = guard_(arguments, { role: ['ADMIN'], ulp: true, aksi: 'setApprovalP0' });
    var sh = _shY_(SHEET_YANDAL.P0);
    var found = _findRowY_(sh, COL_P0.kodeP0, params && params.kodeP0);
    if (!found) return { ok: false, error: 'P0 tidak ditemukan.' };
    _p0Scope_(g, found.row);
    var meta = _p0Meta_(found.row, _p0MetaColumn_(sh, false));
    if (meta.state === 'prepared') return { ok: false, error: 'Selesaikan pengiriman koreksi jenis terlebih dahulu.' };
    if (params.keputusan === 'Approved' && _p0Other_(found.row[COL_P0.namaPekerjaan])) {
      try { _p0Weight_(meta.bobotManual); } catch (e) { return { ok: false, error: e.message }; }
    }
    return originalApproval(params);
  };
  return true;
})();
