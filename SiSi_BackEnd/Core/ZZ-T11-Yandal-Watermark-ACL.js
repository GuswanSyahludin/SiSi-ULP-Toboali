/* T-11 follow-up: legacy Yandal watermark code still re-enabled public ACLs
 * after the private engine call. This final overlay repairs the ACL after the
 * legacy processor returns, without changing its sheet-path contract yet.
 */
(function installYandalPrivateAclRepair_(root) {
  function privateRef_(ref) {
    var id = typeof _h07FileId_ === 'function' ? _h07FileId_(ref) : String(ref || '').trim();
    if (id && typeof _h07PrivateFile_ === 'function') _h07PrivateFile_(id);
  }

  function repairP0_(kodeP0) {
    if (!kodeP0 || typeof _shY_ !== 'function' || typeof _findRowY_ !== 'function') return;
    var sh = _shY_(SHEET_YANDAL.P0);
    var found = _findRowY_(sh, COL_P0.kodeP0, kodeP0);
    if (!found) return;
    var row = found.row;
    [row[COL_P0.fotoSebelumWm], row[COL_P0.fotoPekerjaanWm], row[COL_P0.fotoSesudahWm],
      row[COL_P0.linkDownloadSebelum], row[COL_P0.linkDownloadPekerjaan], row[COL_P0.linkDownloadSesudah]]
      .forEach(privateRef_);
  }

  function repairSwitching_(kodeSwitching) {
    if (!kodeSwitching || typeof _shY_ !== 'function' || typeof _findRowY_ !== 'function') return;
    var sh = _shY_(SHEET_YANDAL.SWITCHING);
    var found = _findRowY_(sh, COL_SWITCHING.kodeSwitching, kodeSwitching);
    if (!found) return;
    var row = found.row;
    [row[COL_SWITCHING.fotoArusWm], row[COL_SWITCHING.fotoG1Wm], row[COL_SWITCHING.fotoG2Wm],
      row[COL_SWITCHING.fotoG3Wm], row[COL_SWITCHING.fotoG4Wm], row[COL_SWITCHING.fotoG5Wm],
      row[COL_SWITCHING.linkDownloadArus], row[COL_SWITCHING.linkDownloadG1], row[COL_SWITCHING.linkDownloadG2],
      row[COL_SWITCHING.linkDownloadG3], row[COL_SWITCHING.linkDownloadG4], row[COL_SWITCHING.linkDownloadG5]]
      .forEach(privateRef_);
  }

  var originalP0 = typeof root.prosesP0Yandal === 'function' ? root.prosesP0Yandal : null;
  if (originalP0) {
    root.prosesP0Yandal = function (kodeP0, fotoTarget) {
      var result = originalP0.call(this, kodeP0, fotoTarget);
      try { repairP0_(kodeP0); } catch (e) { Logger.log('T-11 P0 ACL repair gagal: ' + e); }
      return result;
    };
  }

  var originalSwitching = typeof root.prosesSwitchingYandal === 'function' ? root.prosesSwitchingYandal : null;
  if (originalSwitching) {
    root.prosesSwitchingYandal = function (kodeSwitching, fotoTarget) {
      var result = originalSwitching.call(this, kodeSwitching, fotoTarget);
      try { repairSwitching_(kodeSwitching); } catch (e) { Logger.log('T-11 switching ACL repair gagal: ' + e); }
      return result;
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
