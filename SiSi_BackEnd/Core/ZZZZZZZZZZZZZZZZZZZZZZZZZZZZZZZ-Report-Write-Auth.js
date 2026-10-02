/* Report writes: authenticated public entry points, private scheduled service.
 * Load after T04/P0 wrappers and report declarations. Never manufacture a
 * session or accept a client "internal" flag. No trigger/data changes on load.
 */
// These helpers remain lexical to this IIFE, not exported RPC endpoints.
// Leading underscores also follow the existing static audit's private convention.
(function _installReportWrites_(root) {
  var DIRTY = 'LAPORAN_DIRTY_DATES';
  function stop(code) { throw new Error('T11_REPORT_' + code); }
  function need(name) {
    if (typeof root[name] !== 'function') stop('DEPENDENCY_MISSING');
    return root[name];
  }
  function scope() {
    if (!root.LH || !need('ulpSama_')(root.LH.ULP, 'ULP Toboali'))
      stop('ULP_DENIED');
    var expected = {no:0,tanggal:1,penyulang:2,panjang:3,temuan:4,eksekusi:5,lapUp3:6,lapUiw:7};
    Object.keys(expected).forEach(function (key) {
      if (!root.LH.COL || root.LH.COL[key] !== expected[key]) stop('SCHEMA_MISSING');
    });
    if (root.LH.SHEET !== 'Teknik_Laporan Harian') stop('SCHEMA_MISSING');
  }
  function date(value) {
    var text = String(value == null ? '' : value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) stop('DATE_INVALID');
    var parsed = new Date(text + 'T00:00:00Z');
    if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== text)
      stop('DATE_INVALID');
    return text;
  }
  function principal(args, action, admin) {
    var g = need('guard_')(args, {ulp:true, aksi:action,
      role:admin ? ['SUPER'] : undefined});
    if (!g || !g.sesi || typeof g.sesi.ulp !== 'string' ||
        !need('ulpSama_')(g.ulp, 'ULP Toboali')) stop('ULP_DENIED');
    scope();
    return g;
  }
  function normalized(value) {
    return String(value == null ? '' : value).trim().toLowerCase().replace(/[^a-z0-9]/g,'');
  }
  function _schema_(sh) {
    if (!sh || sh.getLastColumn() < 8) stop('SCHEMA_MISSING');
    var actual = sh.getRange(1,1,1,8).getValues()[0].map(normalized);
    var expected = ['no','tanggal','penyulang','panjangkmsinspeksi','temuan',
      'eksekusi','laporanup3','laporanuiw'];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) stop('SCHEMA_MISSING');
  }
  function _locate_(sh, day) {
    var last = sh.getLastRow(), matches = [];
    if (last > 1) {
      var dates = sh.getRange(2,2,last-1,1).getValues();
      dates.forEach(function (row, index) {
        if (need('_normTgl')(row[0]) === day) matches.push(index + 2);
      });
    }
    if (matches.length > 1) stop('DATE_AMBIGUOUS');
    return matches[0] || 0;
  }
  function _snapshot_(sh, row) {
    var range = sh.getRange(row,1,1,8);
    return {values:range.getValues()[0], formulas:range.getFormulas()[0]};
  }
  function safe(value) { return need('safeCell_')(String(value == null ? '' : value).trim()); }
  function cache(day) {
    try {
      CacheService.getScriptCache().remove(need('_lapMobileCacheKey_')(root.LH.ULP,day));
    } catch (error) {
      // Report writes succeeded. A cache failure must not trigger duplicate writes.
      Logger.log('T11_REPORT_CACHE_INVALIDATION_FAILED');
    }
  }
  function _rebuild_(params, manual) {
    params = params || {};
    scope();
    var today = date(need('_lhToday')());
    var day = date(params.tanggal == null || params.tanggal === '' ? today : params.tanggal);
    if (manual && day !== today)
      return {ok:false,readOnly:true,message:'Pengeditan hanya untuk hari ini.'};
    if (day > today) stop('DATE_FUTURE');
    if (need('_tglSudahDiarsip_')(day))
      return {ok:true,skipped:'diarsip',tanggal:day};
    var up3Builder = need('originalbuildLaporanUP3');
    var uiwBuilder = need('originalbuildLaporanWilayah');
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      if (!lock.hasLock()) stop('LOCK_REQUIRED');
      var ss = SpreadsheetApp.openById(root.SPREADSHEET_ID);
      var sh = need('_lhSheet')(ss);
      _schema_(sh);
      var row = _locate_(sh,day);
      var before = row ? _snapshot_(sh,row) : null;
      var values = before ? before.values : ['',day,'','','','','',''];
      // Do not overwrite calculated cells. No clearing, row deletion or backfill.
      if (before && before.formulas.slice(manual ? 2 : 6).some(function(v){return !!v;}))
        stop('FORMULA_PROTECTED');
      var c4a = manual ? (params.c4a || {}) : need('_lhC4aFromRow')(values);
      if (Array.isArray(c4a) || typeof c4a !== 'object') stop('INPUT_INVALID');
      var up3 = up3Builder(day,root.LH.ULP,{
        c4a:c4a,tindakLanjutGangguan:params.tindakLanjutGangguan
      });
      var uiw = uiwBuilder(day,root.LH.ULP,{cuaca:params.cuaca});
      if (typeof up3 !== 'string' || !up3.trim() ||
          typeof uiw !== 'string' || !uiw.trim()) stop('BUILD_FAILED');
      _schema_(sh);
      if (row) {
        if (_locate_(sh,day) !== row ||
            JSON.stringify(_snapshot_(sh,row)) !== JSON.stringify(before))
          stop('ROW_CHANGED');
      } else {
        if (_locate_(sh,day)) stop('ROW_CHANGED');
        row = need('_lhEnsureRow')(sh,day);
        if (!row || _locate_(sh,day) !== row) stop('ROW_CHANGED');
        var created = _snapshot_(sh,row);
        if (created.formulas.some(function(v){return !!v;}) ||
            created.values.slice(2).some(function(v){return v !== '' && v != null;}))
          stop('ROW_CHANGED');
      }
      // Build both reports before touching C4A/G/H. ScriptLock cannot fence
      // AppSheet/external writers; this is not a cross-service transaction.
      if (manual) {
        sh.getRange(row,3,1,4).setNumberFormat('@');
        sh.getRange(row,3,1,6).setValues([[
          safe(c4a.penyulang),safe(c4a.realisasi),safe(c4a.temuan),safe(c4a.eksekusi),
          up3,uiw
        ]]);
      } else {
        sh.getRange(row,7,1,2).setValues([[up3,uiw]]);
      }
      cache(day);
      return {ok:true,tanggal:day,row:row,waText:up3,waTextUiw:uiw};
    } finally {
      try { if (lock.hasLock()) lock.releaseLock(); } catch (releaseError) {}
    }
  }
  function queueMap(props) {
    var raw = props.getProperty(DIRTY);
    if (!raw) return {};
    var map;
    try { map = JSON.parse(raw); } catch(error) { stop('QUEUE_INVALID'); }
    if (!map || typeof map !== 'object' || Array.isArray(map)) stop('QUEUE_INVALID');
    Object.keys(map).forEach(function(key) {
      date(key);
      if (typeof map[key] !== 'number' || !isFinite(map[key]) || map[key] <= 0)
        stop('QUEUE_INVALID');
    });
    return map;
  }
  function withQueue(fn) {
    var lock = LockService.getUserLock();
    try {
      lock.waitLock(10000);
      if (!lock.hasLock()) stop('QUEUE_LOCK_REQUIRED');
      return fn(PropertiesService.getScriptProperties());
    } finally {
      try { if (lock.hasLock()) lock.releaseLock(); } catch(error) {}
    }
  }
  function enqueue(day) {
    day = date(day || need('_lhToday')());
    return withQueue(function(props) {
      var map = queueMap(props);
      // Monotonic per-date value distinguishes input even within one millisecond.
      map[day] = Math.max(Date.now(), (map[day] || 0) + 1);
      props.setProperty(DIRTY,JSON.stringify(map));
      return day;
    });
  }
  function drain() {
    scope();
    var claimed = withQueue(queueMap), started = Date.now(), processed = 0, failed = 0;
    var dates = Object.keys(claimed).sort();
    for (var i=0;i<dates.length;i++) {
      if (Date.now()-started > 90000) break;
      var day = dates[i];
      try {
        var result = _rebuild_({tanggal:day},false);
        if (!result || result.ok !== true) stop('BUILD_FAILED');
        // Never delete before rebuild. A crash/lock failure leaves retry intact.
        withQueue(function(props) {
          var current = queueMap(props);
          if (current[day] === claimed[day]) {
            delete current[day];
            props.setProperty(DIRTY,JSON.stringify(current));
          }
        });
        processed++;
      } catch(error) {
        failed++;
        Logger.log('T11_REPORT_RETRY_PENDING');
      }
    }
    return {ok:failed===0,processed:processed,failed:failed};
  }
  root.markLaporanDirty_ = enqueue;
  root._t11ReportMaintenance_ = function(name) {
    if (name === 'ensureLaporanHarianHariIni')
      return _rebuild_({tanggal:need('_lhToday')(),cuaca:'Cerah'},false);
    if (name === 'drainLaporanDirty' || name === 'drainLaporanDirtySafe') return drain();
    stop('UNKNOWN_JOB');
  };
  root.simpanLaporanHarianWeb = function(params) {
    principal(arguments,'simpanLaporanHarianWeb',false);
    return _rebuild_(params,true);
  };
  root.refreshLaporanHarian = function(params) {
    principal(arguments,'refreshLaporanHarian',true);
    return _rebuild_(params,false);
  };
  root.refreshLaporanHarianHariIni = function() {
    principal(arguments,'refreshLaporanHarianHariIni',true);
    return _rebuild_({tanggal:need('_lhToday')()},false);
  };
  root.ensureLaporanHarianHariIni = function() {
    principal(arguments,'ensureLaporanHarianHariIni',true);
    return _rebuild_({tanggal:need('_lhToday')(),cuaca:'Cerah'},false);
  };
  root.drainLaporanDirty = root.drainLaporanDirtySafe = function() {
    principal(arguments,'drainLaporanDirtySafe',true);
    return drain();
  };
  root.simpanMobileLaporanC4A = function(params) {
    principal(arguments,'simpanMobileLaporanC4A',false);
    params=params||{};
    return _rebuild_({tanggal:params.tanggal,c4a:{
      penyulang:params.penyulang,realisasi:params.realisasi,
      temuan:params.temuan,eksekusi:params.eksekusi
    }},true);
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
