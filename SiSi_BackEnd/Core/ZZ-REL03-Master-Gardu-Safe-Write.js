/* REL-03: reject formula/identity writes and preserve formula columns. */
var REL03_IMMUTABLE_BY_SHEET_ = {
  'Master_Gardu': { A: true, B: true, C: true },
  '1. DATA TRAFO': { A: true, B: true, C: true },
  'INPUT TBL': { A: true, B: true, C: true },
  'Suhu & Fisik Trafo': { A: true, B: true },
  '2. SUHU & FISIK TRAFO': { A: true, B: true }
};

function _rel03Reject_(code, sheetName, letter) {
  throw new Error(code + ': ' + sheetName + '!' + letter);
}

var _rel03OriginalWrite_ = typeof _hiTulisNilai_ === 'function' ? _hiTulisNilai_ : null;
if (_rel03OriginalWrite_) {
  _hiTulisNilai_ = function (sh, row, data) {
    data = data || {};
    var sheetName = sh && typeof sh.getName === 'function' ? String(sh.getName()) : '';
    var immutable = REL03_IMMUTABLE_BY_SHEET_[sheetName] || { A: true };
    var keys = Object.keys(data);
    var formulas = {};

    // Preflight every requested cell before the first write on this sheet.
    keys.forEach(function (letter) {
      var upper = String(letter || '').trim().toUpperCase();
      if (!/^[A-Z]+$/.test(upper)) _rel03Reject_('REL03_INVALID_FIELD', sheetName, upper || '?');
      if (immutable[upper]) _rel03Reject_('REL03_IMMUTABLE_FIELD', sheetName, upper);
      var cell = sh.getRange(row, _hiColLetterToIndex_(upper) + 1);
      var formula = cell.getFormula();
      if (formula) formulas[upper] = formula;
    });
    var formulaKeys = Object.keys(formulas);
    if (formulaKeys.length) _rel03Reject_('REL03_FORMULA_CELL', sheetName, formulaKeys[0]);

    return _rel03OriginalWrite_.call(this, sh, row, data);
  };
}

// Replace the legacy whole-range rewrite with a targeted update of jumlahTemuan.
var _rel03OriginalRecalc_ = typeof recalcRealisasiGarduByHeader === 'function'
  ? recalcRealisasiGarduByHeader : null;
if (_rel03OriginalRecalc_) {
  recalcRealisasiGarduByHeader = function (ss, kodeHeader) {
    ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
    var R = COL_INSDU.REALISASI;
    var sh = ss.getSheetByName(SHEET_INSDU_REALISASI);
    if (!sh) return;
    var rows = sh.getDataRange().getValues();
    var kh = String(kodeHeader || '').trim();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][R.kodeHeader] || '').trim() !== kh) continue;
      var n = _hitungTemuanGardu(ss, kh, String(rows[i][R.nomorGardu] || '').trim());
      var cur = rows[i][R.jumlahTemuan];
      if (cur === '' || cur === null || cur === undefined || Number(cur || 0) !== n) {
        sh.getRange(i + 1, R.jumlahTemuan + 1).setValue(n);
      }
    }
    _updateWaTextInsGardu(ss, kh);
  };
}
