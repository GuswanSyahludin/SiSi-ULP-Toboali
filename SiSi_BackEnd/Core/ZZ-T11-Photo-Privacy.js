/* T-11 / H-07: private-by-default inspection photos.
 * Loaded last so legacy upload helpers cannot re-enable public sharing.
 */

function _h07PrivateFile_(fileId) {
  var file = DriveApp.getFileById(String(fileId || '').trim());
  try {
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
  } catch (e) {
    throw new Error('ACL foto tidak dapat dibuat privat.');
  }
  return file;
}

function _h07FileId_(ref) {
  return typeof fileIdFoto_ === 'function' ? fileIdFoto_(ref) : String(ref || '').trim();
}

function _h07PrivateResult_(result) {
  if (!result || typeof result !== 'object') return result;
  ['fotoSebelumUrl', 'fotoPekerjaanUrl', 'fotoSesudahUrl', 'fotoTemuanUrl', 'fotoTiangUrl'].forEach(function (key) {
    var id = _h07FileId_(result[key]);
    if (id) {
      try { _h07PrivateFile_(id); } catch (e) { Logger.log('T-11 privatize gagal: ' + e); }
    }
  });
  return result;
}

/* Replace the legacy watermark function, whose payload used makePublic:true. */
function watermarkFoto_(fileId, outputFolderId, info, outName) {
  guard_(arguments, { ulp: true, aksi: 'watermarkFoto_' });
  return _h07WatermarkImpl_(fileId, outputFolderId, info, outName);
}

/* Private server transport. Call only after an authenticated/authorized boundary
 * or the private scheduled queue has resolved ownership and folder binding.
 * Never expose this helper as an HTTP action. */
function _h07WatermarkImpl_(fileId, outputFolderId, info, outName) {
  info = info || {};
  var source = DriveApp.getFileById(fileId);
  var outNm = outName || 'WM_' + fileId + '.jpg';
  var idem = String(info.idempotencyKey || info.kodePekerjaan || info.kodeEksekusi || info.kodeP0 || fileId);
  if (info.tahap) idem += ':' + String(info.tahap);
  var payload = {
    image: Utilities.base64Encode(source.getBlob().getBytes()),
    mimeType: source.getBlob().getContentType() || 'image/jpeg',
    secret: WM_ENGINE_SECRET,
    folderId: outputFolderId,
    fileName: outNm,
    idempotencyKey: idem,
    makePublic: false,
    kodePekerjaan: String(info.kodePekerjaan || info.kodeEksekusi || info.kodeP0 || ''),
    tanggal: info.tanggal || '', jam: info.jam || '', hari: info.hari || '',
    koordinat: info.koordinatPekerjaan || info.koordinat || '',
    akurasi: _formatAkurasiWm_(info.akurasi), tim: info.tim || '', ulp: info.ulp || '',
    jenisPekerjaan: info.jenisPekerjaan || info.pekerjaan || '', tahap: info.tahap || '',
    lat: String(info.lat || ''), long: String(info.long || '')
  };
  var resp = UrlFetchApp.fetch(WM_ENGINE_URL, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) throw new Error('Engine watermark gagal (' + resp.getResponseCode() + ').');
  var result;
  try { result = JSON.parse(resp.getContentText()); } catch (e) { throw new Error('Balasan wm-engine bukan JSON yang valid.'); }
  if (!result || result.ok !== true || !result.fileId) throw new Error('Upload watermark ke Drive gagal.');
  _h07PrivateFile_(result.fileId);
  return typeof urlFotoBaku_ === 'function' ? urlFotoBaku_(result.fileId) : 'https://drive.google.com/thumbnail?id=' + result.fileId;
}

/* Replace the shared temuan uploader so Inspeksi and ROW forwarding are private too. */
function _uploadFotoTemuan(b64, mime, namaFile, folder) {
  if (!b64) return { nama: '', url: '' };
  var bytes = Utilities.base64Decode(b64);
  var ext = mime && mime.indexOf('png') >= 0 ? '.png' : '.jpg';
  var fname = String(namaFile || '').replace(/[\\/:*?"<>|]/g, '-') + ext;
  var file = folder.createFile(Utilities.newBlob(bytes, mime || 'image/jpeg', fname));
  _h07PrivateFile_(file.getId());
  return { nama: fname, url: file.getUrl() };
}

/* Legacy ROW mobile functions upload directly inside their local helpers. Revoke public ACL
 * immediately on their returned URLs as a defense-in-depth layer. */
var _h07SimpanRow_ = typeof simpanMobileEksekusiRow === 'function' ? simpanMobileEksekusiRow : null;
if (_h07SimpanRow_) {
  simpanMobileEksekusiRow = function (payload) {
    return _h07PrivateResult_(_h07SimpanRow_.call(this, payload));
  };
}
var _h07UpdateRow_ = typeof updateMobileEksekusiRow === 'function' ? updateMobileEksekusiRow : null;
if (_h07UpdateRow_) {
  updateMobileEksekusiRow = function (payload) {
    return _h07PrivateResult_(_h07UpdateRow_.call(this, payload));
  };
}

function _h07PhotoPayload_(fileId) {
  var file = _h07PrivateFile_(fileId);
  var blob = file.getBlob();
  return {
    ok: true,
    fileName: file.getName(),
    mimeType: blob.getContentType() || 'application/octet-stream',
    data: Utilities.base64Encode(blob.getBytes())
  };
}

function _h07OwnedPhoto_(g, row, ref, action, key) {
  if (!row || !barisUlpCocok_(g, row.ulp)) {
    audit_(g.sesi, action, key, 'TOLAK', 'foto milik ULP lain');
    return { ok: false, message: 'Foto bukan milik ULP Anda.' };
  }
  var id = _h07FileId_(ref);
  if (!id) return { ok: false, message: 'File foto tidak ditemukan.' };
  return _h07PhotoPayload_(id);
}

/* Authenticated retrieval for Yandal P0, ROW execution, and Temuan rows.
 * Clients send the stable row key and photo slot, never a raw public URL alone. */
function getFotoPrivatT11(params) {
  var g = guard_(arguments, { ulp: true, aksi: 'getFotoPrivatT11' });
  params = params || {};
  var slot = String(params.slot || '').trim().toLowerCase();
  var kind = String(params.kind || '').trim().toLowerCase();
  var key = String(params.key || '').trim();
  if (!key || ['sebelum', 'pekerjaan', 'sesudah', 'temuan', 'tiang', 'gardu'].indexOf(slot) < 0)
    return { ok: false, message: 'Identitas foto tidak valid.' };
  var ref = '';
  var row = null;
  if (kind === 'p0') {
    var p0 = _findRowY_( _shY_(SHEET_YANDAL.P0), COL_P0.kodeP0, key );
    if (!p0) return { ok: false, message: 'P0 tidak ditemukan.' };
    row = { ulp: String(p0.row[COL_P0.ulp] || '').trim() };
    ref = slot === 'sebelum' ? p0.row[COL_P0.linkDownloadSebelum] || p0.row[COL_P0.fotoSebelumUrl] || p0.row[COL_P0.fotoSebelumWm]
      : slot === 'pekerjaan' ? p0.row[COL_P0.linkDownloadPekerjaan] || p0.row[COL_P0.fotoPekerjaanUrl] || p0.row[COL_P0.fotoPekerjaanWm]
      : p0.row[COL_P0.linkDownloadSesudah] || p0.row[COL_P0.fotoSesudahUrl] || p0.row[COL_P0.fotoSesudahWm];
  } else if (kind === 'row') {
    var shR = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('db_ROW_Eksekusi');
    var dataR = shR ? shR.getDataRange().getValues() : [];
    for (var i = 1; i < dataR.length; i++) if (String(dataR[i][COL_ROW.kodeEksekusi] || '').trim() === key) {
      row = { ulp: String(dataR[i][COL_ROW.ulp] || '').trim() };
      ref = slot === 'sebelum' ? dataR[i][COL_ROW.fotoSebelumUrl] : slot === 'pekerjaan' ? dataR[i][COL_ROW.fotoPekerjaanUrl] : dataR[i][COL_ROW.fotoSesudahUrl];
      break;
    }
  } else if (kind === 'temuan') {
    var loc = _findRowTemuan(key);
    if (loc) {
      var T = COL_INS.TEMUAN, vals = loc.sheet.getRange(loc.row, 1, 1, loc.sheet.getLastColumn()).getValues()[0];
      row = { ulp: String(vals[T.ulp] || '').trim() };
      ref = slot === 'temuan' ? vals[T.fotoTemuanUrl] : slot === 'tiang' || slot === 'gardu' ? vals[T.fotoTiangUrl] : slot === 'pekerjaan' ? vals[T.fotoPekerjaanUrl] : vals[T.fotoSesudahUrl];
    }
  }
  return _h07OwnedPhoto_(g, row, ref, 'getFotoPrivatT11', key);
}

var _h07ApiRouter_ = typeof apiRouter_ === 'function' ? apiRouter_ : null;
if (_h07ApiRouter_) {
  apiRouter_ = function (e, body) {
    var req = body || (e && e.parameter) || {};
    if (String(req.action || '') === 'getFotoPrivatT11') {
      var result = getFotoPrivatT11(req);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    return _h07ApiRouter_.call(this, e, body);
  };
}
