/* Mobile report compatibility and ROW detail adapter.
 * Loaded after the existing API dispatch guards and the ROW module. */
(function () {
  var _sisiMobileReportsPreviousRouter_ = apiRouter_;
  var _sisiMobileReportsPreviousHeaderReader_ = getMobileLaporanHarian;
  var _sisiMobileReportsPreviousDeltaRows_ =
    typeof _deltaRows_ === 'function' ? _deltaRows_ : null;

  function _sisiMobileReportAction_(e, body) {
    var p = (e && e.parameter) || {};
    return String((body && body.action) || p.action || '').trim();
  }

  function _sisiMobileMergeParams_(query, body) {
    var merged = Object.create(null);
    query = query || {};
    body = body || {};
    Object.keys(query).forEach(function (key) {
      // Session credentials must never be accepted from the URL, where they
      // can leak into browser history, proxies, and request logs.
      if (/^(token|devicetoken)$/i.test(key)) return;
      merged[key] = query[key];
    });
    Object.keys(body).forEach(function (key) { merged[key] = body[key]; });
    return merged;
  }

  apiRouter_ = function (e, body) {
    var action = _sisiMobileReportAction_(e, body);
    var normalizedEvent = {};
    if (e && typeof e === 'object') {
      Object.keys(e).forEach(function (key) { normalizedEvent[key] = e[key]; });
    }
    normalizedEvent.parameter = _sisiMobileMergeParams_(e && e.parameter, null);
    if (action !== 'getMobileLaporanUp3Uiw' && action !== 'simpanMobileLaporanC4A') {
      return _sisiMobileReportsPreviousRouter_(normalizedEvent, body);
    }
    normalizedEvent.parameter = _sisiMobileMergeParams_(normalizedEvent.parameter, body);
    return _sisiMobileReportsPreviousRouter_(normalizedEvent, body);
  };

  function _sisiMobileCell_(row, index) {
    return row && index >= 0 && index < row.length ? row[index] : '';
  }

  function _sisiMobileText_(value) {
    return String(value == null ? '' : value).trim();
  }

  function _sisiMobileNormalizeHeader_(value) {
    return _sisiMobileText_(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function _sisiMobileYandalPetugasRows_(guard) {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheets = ss.getSheets();
    var candidates = {
      db_list_petugas_yandal: true,
      db_yandal_list_petugas: true,
      list_petugas_yandal: true,
      'list petugas yandal': true,
    };
    var sheet = null;
    for (var i = 0; i < sheets.length; i++) {
      var name = _sisiMobileText_(sheets[i].getName()).toLowerCase().replace(/\s+/g, ' ');
      if (candidates[name] || candidates[name.replace(/ /g, '_')]) {
        sheet = sheets[i];
        break;
      }
    }
    if (!sheet) throw new Error('Sheet List Petugas Yandal tidak ditemukan.');
    if (sheet.getLastRow() < 2) return [];

    var width = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, width).getValues()[0];
    var ulpColumn = -1;
    var subTeamColumn = -1;
    var nameColumns = [];
    for (var c = 0; c < headers.length; c++) {
      var header = _sisiMobileNormalizeHeader_(headers[c]);
      if (header === 'ulp' || header.indexOf('namaulp') >= 0) ulpColumn = c;
      if (header === 'subtim' || header === 'subteam') subTeamColumn = c;
      if (header === 'petugas' || header === 'namapetugas' || header === 'nama') nameColumns.push(c);
    }
    if (ulpColumn < 0 || subTeamColumn < 0 || !nameColumns.length) {
      throw new Error('Header ULP, Sub-Tim, atau nama petugas tidak lengkap.');
    }

    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
    var sessionUlp = _sisiMobileText_(guard && (guard.ulp || guard.kodeUlp));
    var out = [];
    var seen = Object.create(null);
    for (var r = 0; r < rows.length; r++) {
      var ulp = _sisiMobileText_(rows[r][ulpColumn]);
      var subTeam = _sisiMobileText_(rows[r][subTeamColumn]);
      if (!ulp || !subTeam) continue;
      if (sessionUlp && ulp.toLowerCase() !== sessionUlp.toLowerCase()) continue;
      for (var n = 0; n < nameColumns.length; n++) {
        var raw = _sisiMobileText_(rows[r][nameColumns[n]]);
        var names = raw.replace(/\r/g, '\n').split(/[,;\/&\n]+/);
        for (var p = 0; p < names.length; p++) {
          var person = _sisiMobileText_(names[p]);
          if (!person) continue;
          var key = [ulp.toLowerCase(), subTeam.toLowerCase(), person.toLowerCase()].join('|');
          if (seen[key]) continue;
          seen[key] = true;
          out.push([out.length + 1, ulp, subTeam, person]);
        }
      }
    }
    return out;
  }

  if (_sisiMobileReportsPreviousDeltaRows_) {
    _deltaRows_ = function (guard, token, name, config) {
      if (name === 'db_List_Petugas_Yandal') {
        return _sisiMobileYandalPetugasRows_(guard);
      }
      if (name === 'db_Yandal_Shift' || name === 'db_Yandal_P0' ||
          name === 'db_Yandal_Pengecekan_Switching') {
        var correctedConfig = {};
        Object.keys(config || {}).forEach(function (key) { correctedConfig[key] = config[key]; });
        correctedConfig.ulpCol = name === 'db_Yandal_Shift' ? 5 :
          (name === 'db_Yandal_P0' ? 4 : 5);
        return _sisiMobileReportsPreviousDeltaRows_(guard, token, name, correctedConfig);
      }
      return _sisiMobileReportsPreviousDeltaRows_(guard, token, name, config);
    };
  }

  function _sisiMobileReadRows_(ss, sheetName, columnCount) {
    var sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) return [];
    var width = Number(columnCount) || sh.getLastColumn();
    return sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues();
  }

  function _sisiMobileAttachRowExecution_(response) {
    if (!response || response.success !== true || !Array.isArray(response.data)) return response;
    if (typeof COL_ROW === 'undefined' || typeof COL_ROW_RLZ === 'undefined') return response;

    var visibleHeaders = Object.create(null);
    var headerCounts = Object.create(null);
    var data = response.data;
    for (var h = 0; h < data.length; h++) {
      var header = data[h];
      if (!header || typeof header !== 'object') continue;
      header.realisasi = [];
      var headerCode = _sisiMobileText_(header.kodeHeader);
      if (!headerCode) continue;
      headerCounts[headerCode] = (headerCounts[headerCode] || 0) + 1;
      if (_sisiMobileText_(header.ulp)) visibleHeaders[headerCode] = header;
    }
    Object.keys(visibleHeaders).forEach(function (code) {
      if (headerCounts[code] !== 1) delete visibleHeaders[code];
    });
    if (!Object.keys(visibleHeaders).length) return response;

    try {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      // Realisasi has no ULP column. Confirm that every visible key maps to one
      // and only one stored header owner before trusting it for child records.
      var allHeaderRows = _sisiMobileReadRows_(ss, 'db_Global_Header', 3);
      var storedHeaderCounts = Object.create(null);
      var storedHeaderUlps = Object.create(null);
      for (var sh = 0; sh < allHeaderRows.length; sh++) {
        var storedCode = _sisiMobileText_(_sisiMobileCell_(allHeaderRows[sh], 1));
        if (!storedCode) continue;
        storedHeaderCounts[storedCode] = (storedHeaderCounts[storedCode] || 0) + 1;
        storedHeaderUlps[storedCode] = _sisiMobileText_(_sisiMobileCell_(allHeaderRows[sh], 2));
      }
      Object.keys(visibleHeaders).forEach(function (code) {
        var returnedUlp = _sisiMobileText_(visibleHeaders[code].ulp);
        var storedUlp = _sisiMobileText_(storedHeaderUlps[code]);
        if (storedHeaderCounts[code] !== 1 || !storedUlp ||
            returnedUlp.toLowerCase() !== storedUlp.toLowerCase()) {
          delete visibleHeaders[code];
        }
      });
      if (!Object.keys(visibleHeaders).length) return response;

      var rlzRows = _sisiMobileReadRows_(ss, 'db_ROW_Realisasi', COL_ROW_RLZ_N);
      var execRows = _sisiMobileReadRows_(ss, 'db_ROW_Eksekusi', COL_ROW_N);
      var realisasiByParent = Object.create(null);
      var parentCounts = Object.create(null);
      for (var p = 0; p < rlzRows.length; p++) {
        var countHeader = _sisiMobileText_(_sisiMobileCell_(rlzRows[p], COL_ROW_RLZ.kodeHeader));
        var countParent = _sisiMobileText_(_sisiMobileCell_(rlzRows[p], COL_ROW_RLZ.kodePekerjaan));
        if (!visibleHeaders[countHeader] || !countParent) continue;
        var countKey = JSON.stringify([countHeader, countParent]);
        parentCounts[countKey] = (parentCounts[countKey] || 0) + 1;
      }
      for (var r = 0; r < rlzRows.length; r++) {
        var rr = rlzRows[r];
        var linkedHeader = _sisiMobileText_(_sisiMobileCell_(rr, COL_ROW_RLZ.kodeHeader));
        var parentHeader = visibleHeaders[linkedHeader];
        if (!parentHeader) continue;
        var parentCode = _sisiMobileText_(_sisiMobileCell_(rr, COL_ROW_RLZ.kodePekerjaan));
        var realizationKey = JSON.stringify([linkedHeader, parentCode]);
        if (!parentCode || parentCounts[realizationKey] !== 1) continue;
        var item = {
          kodePekerjaan: parentCode,
          penyulang: _sisiMobileText_(_sisiMobileCell_(rr, COL_ROW_RLZ.penyulang)),
          section: _sisiMobileText_(_sisiMobileCell_(rr, COL_ROW_RLZ.section)) || '-',
          rabas: Number(_sisiMobileCell_(rr, COL_ROW_RLZ.rabas)) || 0,
          sedang: Number(_sisiMobileCell_(rr, COL_ROW_RLZ.sedang)) || 0,
          besar: Number(_sisiMobileCell_(rr, COL_ROW_RLZ.besar)) || 0,
          eksekusi: [],
        };
        parentHeader.realisasi.push(item);
        realisasiByParent[realizationKey] = item;
      }

      for (var x = 0; x < execRows.length; x++) {
        var ex = execRows[x];
        var exHeaderCode = _sisiMobileText_(_sisiMobileCell_(ex, COL_ROW.kodeHeader));
        var exUlp = _sisiMobileText_(_sisiMobileCell_(ex, COL_ROW.ulp));
        var targetHeader = exHeaderCode ? visibleHeaders[exHeaderCode] : null;
        if (!targetHeader) continue;
        var headerUlp = _sisiMobileText_(targetHeader.ulp);
        if (!exUlp || !headerUlp || exUlp.toLowerCase() !== headerUlp.toLowerCase()) continue;
        var parentKey = JSON.stringify([exHeaderCode,
          _sisiMobileText_(_sisiMobileCell_(ex, COL_ROW.kodePekerjaan))]);
        var targetRealisasi = realisasiByParent[parentKey];
        if (!targetRealisasi) continue;
        targetRealisasi.eksekusi.push({
          kodeEksekusi: _sisiMobileText_(_sisiMobileCell_(ex, COL_ROW.kodeEksekusi)),
          jenisPekerjaan: _sisiMobileText_(_sisiMobileCell_(ex, COL_ROW.jenisPekerjaan)),
          nomorTiang: _sisiMobileText_(_sisiMobileCell_(ex, COL_ROW.nomorTiang)),
          diameter: Number(_sisiMobileCell_(ex, COL_ROW.diameter)) || 0,
        });
      }
    } catch (err) {
      if (typeof Logger !== 'undefined' && Logger.log) Logger.log('ROW mobile detail unavailable: ' + err.message);
    }
    return response;
  }

  getMobileLaporanHarian = function () {
    var response = _sisiMobileReportsPreviousHeaderReader_.apply(this, arguments);
    return _sisiMobileAttachRowExecution_(response);
  };
})();
