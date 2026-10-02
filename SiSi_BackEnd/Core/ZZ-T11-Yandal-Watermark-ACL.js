/* T-11: replace (never call) the legacy public-sharing photo helper.
 * This existing final overlay is the active Yandal photo boundary. It must
 * load after the processor, watermark source, privacy and containment files.
 * Failures survive legacy catch/log blocks and reach the existing retry queue.
 * No historical batch ACL rotation or deployed-runtime verification happens here.
 */
(function _installYandalPrivateAclBoundary_(root) {
  var frame = null;
  // Not derived from event/request fields. Only private server entry points
  // below can establish this execution-local queue context.
  var queueContext = null;
  var queueCapability = {};
  // A scheduled resolver is not sufficient authority on its own. This entry
  // checks the unforgeable closure context even when called directly.
  root._t11PerbaikanKodeROW_ = function () {
    if (queueContext !== queueCapability) throw new Error('T11_WORKER_CONTEXT_REQUIRED');
    if (typeof root._t11RecalcToday_ === 'function') return root._t11RecalcToday_();
    return _repairKodeRow_();
  };
  function _repairKodeRow_() {
    function stop(code) { throw new Error('T11_ROW_' + code); }
    var lock = LockService.getScriptLock(), started = Date.now();
    // Capture once per invocation. Midnight must not change a running batch.
    var targetDay = Utilities.formatDate(new Date(started), 'Asia/Jakarta', 'yyyy-MM-dd');
    function day(value) {
      var text, match;
      if (Object.prototype.toString.call(value) === '[object Date]') {
        if (isNaN(value.getTime())) stop('DATE_INVALID');
        text = Utilities.formatDate(value, 'Asia/Jakarta', 'yyyy-MM-dd');
      } else if (typeof value === 'string') {
        text = value.trim();
        match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (match) text = match[3] + '-' + ('0' + match[2]).slice(-2) +
          '-' + ('0' + match[1]).slice(-2);
      } else stop('DATE_INVALID');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) stop('DATE_INVALID');
      var parsed = new Date(text + 'T00:00:00Z');
      if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text)
        stop('DATE_INVALID');
      return text;
    }
    targetDay = day(targetDay);
    function acquire() {
      lock.waitLock(15000);
      if (!lock.hasLock()) stop('LOCK_REQUIRED');
    }
    function owned(value) { return need_('ulpSama_')(value, 'ULP Toboali'); }
    function populated(row) {
      return row.some(function (v) { return v !== '' && v != null; });
    }
    // Core declares these as const: V8 lexical globals are not root properties.
    var ins = typeof COL_INS !== 'undefined' ? COL_INS : root.COL_INS;
    var sheets = typeof SHEET_INS !== 'undefined' ? SHEET_INS : root.SHEET_INS;
    var H = ins && ins.HEADER, E = root.COL_ROW, R = root.COL_ROW_RLZ;
    if (!H || !E || !R || !sheets) stop('SCHEMA_MISSING');
    [H.kodeHeader, H.ulp, H.tim, H.subTim, E.kodeHeader, E.kodePekerjaan,
      E.kodeEksekusi, E.ulp, E.tim, R.kodeHeader, R.kodePekerjaan,
      H.tanggal, R.tanggal, E.tanggal].forEach(function (col) {
      if (!Number.isInteger(col) || col < 0) stop('SCHEMA_MISSING');
    });
    var ss, shH, shR, shE;
    function _read_(sh) {
      if (!sh) stop('SHEET_MISSING');
      return sh.getDataRange().getValues();
    }
    // Legacy parent lookup matches team/date without ULP. Refuse the WHOLE
    // maintenance job if any populated header/execution has unresolved or
    // foreign ownership, or any realisation cannot resolve a unique header.
    function _snapshot_() {
      var h = _read_(shH), r = _read_(shR), e = _read_(shE), headers = Object.create(null);
      var parents = Object.create(null), headerDays = Object.create(null);
      h.slice(1).forEach(function (row) {
        if (!populated(row)) return;
        if (!owned(row[H.ulp])) stop('ULP_UNRESOLVED_OR_FOREIGN');
        var key = text_(row[H.kodeHeader]);
        if (!key || headers[key]) stop('HEADER_AMBIGUOUS');
        headers[key] = row;
        headerDays[key] = day(row[H.tanggal]);
      });
      r.slice(1).forEach(function (row) {
        if (!populated(row)) return;
        var header = text_(row[R.kodeHeader]), key = text_(row[R.kodePekerjaan]);
        if (!headers[header]) stop('PARENT_UNRESOLVED');
        if (day(row[R.tanggal]) !== headerDays[header]) stop('DATE_RELATION_MISMATCH');
        if (!key || parents[key]) stop('PARENT_AMBIGUOUS');
        parents[key] = row;
      });
      var keys = Object.create(null);
      e.slice(1).forEach(function (row) {
        if (!populated(row)) return;
        if (!owned(row[E.ulp])) stop('ULP_UNRESOLVED_OR_FOREIGN');
        var key = text_(row[E.kodeEksekusi]);
        if (key && keys[key]) stop('EXECUTION_AMBIGUOUS');
        if (key) keys[key] = true;
        var date = day(row[E.tanggal]), header = text_(row[E.kodeHeader]);
        var parent = text_(row[E.kodePekerjaan]);
        // Unlinked raw input may create a parent, but existing links must resolve
        // to the same date. Never repair one date by changing another's chain.
        if (header && (!headers[header] || headerDays[header] !== date))
          stop('DATE_RELATION_MISMATCH');
        if (parent && (!parents[parent] ||
            text_(parents[parent][R.kodeHeader]) !== header ||
            day(parents[parent][R.tanggal]) !== date))
          stop('DATE_RELATION_MISMATCH');
        if (key.indexOf('-EKS.') >= 0 && (!header || !parent))
          stop('PARENT_UNRESOLVED');
      });
      return { h: h, r: r, e: e, headers: headers };
    }
    function _writeRow_(sh, index, before, after, columns) {
      if (!lock.hasLock()) stop('LOCK_REQUIRED');
      var fresh = sh.getRange(index + 1, 1, 1, before.length).getValues()[0];
      if (JSON.stringify(fresh) !== JSON.stringify(before)) stop('ROW_CHANGED');
      columns.forEach(function (col) {
        if (before[col] !== after[col]) sh.getRange(index + 1, col + 1).setValue(after[col]);
      });
    }
    try {
      acquire();
      ss = SpreadsheetApp.openById(root.SPREADSHEET_ID);
      shH = ss.getSheetByName(sheets.HEADER);
      shR = ss.getSheetByName('db_ROW_Realisasi');
      shE = ss.getSheetByName('db_ROW_Eksekusi');
      var initial = _snapshot_();
      // Resolve dependencies before the first write. No global guard bypass.
      var process = need_('prosesEksekusiROW'), mark = need_('markWaDirty_');
      var markReport = need_('markLaporanDirty_');
      // Require the async path: legacy synchronous fallback rewrites other dates.
      need_('markRecalcRowDirty_'); need_('enqueueFotoRow_');
      var map = Object.create(null), occupied = Object.create(null), plans = [];
      Object.keys(initial.headers).forEach(function (key) { occupied[key] = true; });
      var result = { ok: true, tanggal: targetDay, headerDiperbaiki: 0, headerKonflik: 0,
        realisasiDiperbaiki: 0, eksekusiDiperbaiki: 0, rawDiproses: 0 };
      initial.h.forEach(function (row, i) {
        if (!i || text_(row[H.tim]) !== 'ROW') return;
        if (day(row[H.tanggal]) !== targetDay) return;
        var sub = text_(row[H.subTim]), old = text_(row[H.kodeHeader]);
        if (!sub || !old) return;
        if (!/\d{2}$/.test(sub) || old.indexOf('-') < 1) stop('INVALID_HEADER');
        var next = 'R' + sub.slice(-2) + old.slice(old.indexOf('-'));
        if (old === next) return;
        if (occupied[next]) { result.headerKonflik++; return; }
        occupied[next] = true; map[old] = next;
        var after = row.slice(); after[H.kodeHeader] = next;
        plans.push({ sh: shH, i: i, before: row, after: after, cols: [H.kodeHeader] });
        result.headerDiperbaiki++;
      });
      function cascade(rows, sh, cols, dateCol, countKey) {
        rows.forEach(function (row, i) {
          if (!i) return;
          var after = row.slice(), changed = false;
          cols.forEach(function (col, slot) {
            var value = text_(row[col]);
            Object.keys(map).some(function (old) {
              if ((slot === 0 && value === old) || (slot > 0 && value.indexOf(old + '-') === 0)) {
                after[col] = map[old] + value.slice(old.length); changed = true; return true;
              }
              return false;
            });
          });
          if (changed) {
            if (day(row[dateCol]) !== targetDay) stop('DATE_RELATION_MISMATCH');
            plans.push({ sh: sh, i: i, before: row, after: after, cols: cols });
            result[countKey]++;
          }
        });
      }
      cascade(initial.r, shR, [R.kodeHeader, R.kodePekerjaan], R.tanggal, 'realisasiDiperbaiki');
      cascade(initial.e, shE, [E.kodeHeader, E.kodePekerjaan, E.kodeEksekusi], E.tanggal, 'eksekusiDiperbaiki');
      var pendingRaw = initial.e.slice(1).some(function (row) {
        var key = text_(row[E.kodeEksekusi]);
        return key && key.indexOf('-EKS.') < 0 && need_('_isTimROW_')(row[E.tim]) &&
          day(row[E.tanggal]) === targetDay;
      });
      if (!plans.length && !pendingRaw) {
        result.skipped = 'nihil-hari-ini';
        return result;
      }
      // Recheck all ownership immediately before the cascade starts.
      var prewrite = _snapshot_();
      if (JSON.stringify([prewrite.h, prewrite.r, prewrite.e]) !==
          JSON.stringify([initial.h, initial.r, initial.e])) stop('ROW_CHANGED');
      // Durable downstream notification before writes: a partial failure must
      // not erase the need to refresh reports. No historical refresh here.
      markReport(targetDay);
      acquire();
      var marked = _snapshot_();
      if (JSON.stringify([marked.h, marked.r, marked.e]) !==
          JSON.stringify([initial.h, initial.r, initial.e])) stop('ROW_CHANGED');
      plans.forEach(function (plan) { _writeRow_(plan.sh, plan.i, plan.before, plan.after, plan.cols); });
      SpreadsheetApp.flush();
      // Mark every changed header dirty before raw processing can fail. No
      // authenticated public WA endpoint is invoked without a session.
      Object.keys(map).forEach(function (old) {
        acquire();
        if (mark(map[old]) === false) stop('QUEUE_FAILED');
      });
      acquire();
      var current = _snapshot_(), raw = [];
      current.e.slice(1).forEach(function (row) {
        var key = text_(row[E.kodeEksekusi]);
        if (key && key.indexOf('-EKS.') < 0 && need_('_isTimROW_')(row[E.tim]) &&
            day(row[E.tanggal]) === targetDay) raw.push(key);
      });
      for (var i = 0; i < raw.length; i++) {
        if (Date.now() - started > 90000) { result.terpotong = true; break; }
        acquire();
        var check = _snapshot_(), matches = check.e.slice(1).filter(function (row) {
          return text_(row[E.kodeEksekusi]) === raw[i];
        });
        if (matches.length !== 1 || day(matches[0][E.tanggal]) !== targetDay)
          stop('ROW_CHANGED');
        var answer = process(raw[i]);
        // Legacy process releases the script lock; reacquire before any
        // subsequent action and never interpret ok:false as completed.
        acquire(); _snapshot_();
        if (!answer || answer.ok !== true) stop('RAW_PROCESS_FAILED');
        result.rawDiproses++;
      }
      return result;
    } catch (error) {
      // Only fixed codes are permitted in scheduler logs.
      var message = error && typeof error.message === 'string' ? error.message : '';
      if (!/^T11_ROW_(LOCK_REQUIRED|SCHEMA_MISSING|SHEET_MISSING|ULP_UNRESOLVED_OR_FOREIGN|HEADER_AMBIGUOUS|PARENT_UNRESOLVED|PARENT_AMBIGUOUS|EXECUTION_AMBIGUOUS|ROW_CHANGED|INVALID_HEADER|RAW_PROCESS_FAILED|DATE_INVALID|DATE_RELATION_MISMATCH|QUEUE_FAILED)$/.test(message))
        message = 'T11_ROW_MAINTENANCE_FAILED';
      throw new Error(message);
    } finally {
      try { if (lock.hasLock()) lock.releaseLock(); } catch (releaseError) {}
    }
  }
  // Resolve the three legacy no-token jobs only inside trusted scheduler
  // execution. Keep their public endpoints (and all other guards) unchanged.
  var originalResolver = root._triggerSisiHandler_;
  if (typeof originalResolver === 'function') {
    root._triggerSisiHandler_ = function (name) {
      if (typeof root._t11RecalcOwnsJob_ === 'function' && root._t11RecalcOwnsJob_(name)) {
        return function () {
          if (queueContext !== queueCapability) throw new Error('T11_WORKER_CONTEXT_REQUIRED');
          return { ok: true, deferred: 'ordered-recalc-pipeline' };
        };
      }
      if (['ensureLaporanHarianHariIni', 'drainLaporanDirty',
          'drainLaporanDirtySafe'].indexOf(name) >= 0) {
        return function () {
          if (queueContext !== queueCapability) throw new Error('T11_WORKER_CONTEXT_REQUIRED');
          return need_('_t11ReportMaintenance_')(name);
        };
      }
      if (['refreshLaporanHarianHariIni', 'sweepDurasiJarakYandalP0',
          'validasiUlangFotoTemuan'].indexOf(name) < 0)
        return originalResolver.apply(this, arguments);
      return function () {
        if (queueContext !== queueCapability) throw new Error('T11_WORKER_CONTEXT_REQUIRED');
        return need_('_t11RunMaintenance_')(name);
      };
    };
  }
  function diagnostic_(error) {
    var message = error && typeof error.message === 'string' ? error.message : '';
    // Never copy arbitrary provider/Drive errors, URLs, IDs, photo bytes,
    // request data, or stack traces into this diagnostic.
    if (message === 'ACL foto tidak dapat dibuat privat.') return 'ACL_NOT_PRIVATE';
    if (message === 'Balasan wm-engine bukan JSON yang valid.') return 'ENGINE_INVALID_JSON';
    if (message === 'Upload watermark ke Drive gagal.') return 'ENGINE_REJECTED';
    var http = message.match(/^Engine watermark gagal \(([1-5][0-9]{2})\)\.$/);
    return http ? 'ENGINE_HTTP_' + http[1] : 'UNCLASSIFIED';
  }
  function remember_(error) {
    if (frame && !frame.cause) {
      frame.cause = diagnostic_(error);
      frame.causeStage = frame.stage || 'entry';
    }
  }
  function stage_(value) { if (frame) frame.stage = value; }
  function _principal_(args, action, superOnly) {
    if (queueContext === queueCapability) return { ulp: 'ULP Toboali', scheduled: true };
    var opts = { ulp: true, aksi: action };
    if (superOnly) opts.role = ['SUPER'];
    var g = need_('guard_')(args, opts);
    if (!g || !need_('ulpSama_')(g.ulp, 'ULP Toboali'))
      fail_('CALLER_ULP_DENIED');
    return g;
  }
  function fail_(code) {
    var error = new Error('T11_YANDAL_' + code);
    if (frame) {
      frame.failed = true;
      if (!frame.cause) {
        frame.cause = code;
        frame.causeStage = frame.stage || 'entry';
      }
    }
    throw error;
  }
  function need_(name) {
    if (typeof root[name] !== 'function') fail_('DEPENDENCY_MISSING');
    return root[name];
  }
  function text_(value) { return String(value == null ? '' : value).trim(); }
  function fileId_(ref) {
    var s = text_(ref);
    if (/^[A-Za-z0-9_-]{20,}$/.test(s)) return s;
    if (!/^https:\/\/(?:drive\.google\.com|drive\.usercontent\.google\.com)\//.test(s)) return '';
    var match = s.match(/[?&]id=([A-Za-z0-9_-]{20,})(?:[&#]|$)/) ||
      s.match(/\/d\/([A-Za-z0-9_-]{20,})(?:\/|[?#]|$)/);
    return match ? match[1] : '';
  }
  function relative_(ref) {
    var s = text_(ref);
    if (!s || /[:\\?#%]/.test(s) || s.charAt(0) === '/') fail_('INVALID_PATH');
    var parts = s.split('/');
    if (parts.some(function (p) { return !p || p === '.' || p === '..'; })) fail_('INVALID_PATH');
    return s;
  }
  function privateParents_(item) {
    var pending = [item], seen = {}, count = 0;
    while (pending.length) {
      var current = pending.pop();
      var id = current.getId();
      if (seen[id]) continue;
      seen[id] = true;
      if (++count > 32) fail_('PARENT_LIMIT');
      if (current.getSharingAccess() !== DriveApp.Access.PRIVATE) fail_('PUBLIC_PARENT');
      var parents = current.getParents();
      while (parents.hasNext()) pending.push(parents.next());
    }
  }
  function boundPrivateFile_(id, folder) {
    _assertCurrentRow_();
    var file = DriveApp.getFileById(id);
    var parents = file.getParents(), belongs = false;
    while (parents.hasNext()) if (parents.next().getId() === folder.getId()) belongs = true;
    if (!belongs) fail_('WRONG_FOLDER');
    _assertCurrentRow_();
    file = need_('_h07PrivateFile_')(id);
    if (!file || file.getSharingAccess() !== DriveApp.Access.PRIVATE) fail_('ACL_NOT_PRIVATE');
    privateParents_(file);
    return file;
  }
  function namedId_(folder, name) {
    var matches = folder.getFilesByName(name);
    if (!matches.hasNext()) return '';
    var id = matches.next().getId();
    if (matches.hasNext()) fail_('AMBIGUOUS_FILE');
    return id;
  }
  function resolve_(ref, folder, folderRel) {
    var id = fileId_(ref);
    if (id) return id;
    var rel = relative_(ref), prefix = text_(folderRel).replace(/\/+$/, '');
    if (rel.indexOf('/') >= 0 && (!prefix || rel.indexOf(prefix + '/') !== 0 ||
        rel.slice(prefix.length + 1).indexOf('/') >= 0)) fail_('WRONG_PATH');
    id = namedId_(folder, rel.split('/').pop());
    if (!id) fail_('FILE_MISSING');
    return id;
  }
  function outputFolder_(rowFolder, folderRel) {
    var rel = text_(folderRel).replace(/\/+$/, '');
    if (rel) relative_(rel);
    var folder = rowFolder;
    if (!folder && rel) folder = need_('_folderFromRelPathY_')(rel);
    if (!folder && root.YANDAL_WM_FOLDER_ID) folder = DriveApp.getFolderById(root.YANDAL_WM_FOLDER_ID);
    if (!folder) fail_('OUTPUT_FOLDER_MISSING');
    privateParents_(folder);
    return folder;
  }
  function writeText_(sh, row, col, value) {
    _assertCurrentRow_();
    need_('_setTextY_')(sh, row, col, value);
  }
  function _sha256_(value) {
    var bytes = typeof value === 'string'
      ? Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
      : Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
    return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
  }
  function _sourceVersion_(file) {
    var blob = file.getBlob();
    return _sha256_(JSON.stringify([file.getId(), file.getName(), blob.getContentType(),
      _sha256_(blob.getBytes())]));
  }
  function _canonical_(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (value instanceof Date) return JSON.stringify(value.toISOString());
    if (Array.isArray(value)) return '[' + value.map(_canonical_).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + _canonical_(value[key]);
    }).join(',') + '}';
  }
  // Identity is checked under the script lock, again before ACL/Sheet writes.
  // Locks coordinate Apps Script writers, not external AppSheet/Drive edits.
  function _assertCurrentRow_() {
    if (!frame || !frame.schema || !LockService.getScriptLock().hasLock()) fail_('LOCK_REQUIRED');
    // Read only the bound row here, not the entire Sheet before every write.
    // Full uniqueness scans run at entry and after the legacy processor.
    var row = frame.sh.getRange(frame.rowNum, 1, 1, frame.width).getValues()[0];
    if (!row || text_(row[frame.schema.id]) !== frame.kode ||
        text_(row[frame.schema.cols.folderPath]) !== frame.folderRel)
      fail_('ROW_BINDING_CHANGED');
    if (!need_('ulpSama_')(row[frame.schema.cols.ulp], 'ULP Toboali'))
      fail_('ULP_UNRESOLVED_OR_FOREIGN');
    Object.keys(frame.expected).forEach(function (key) {
      var slot = frame.expected[key];
      if (text_(row[slot.col]) !== slot.source) fail_('SOURCE_CHANGED');
    });
    return { sh: frame.sh, row: row, rowNum: frame.rowNum };
  }
  function _privatePhoto_(sh, rowNum, kSrc, kWm, kUrl, info, rowFolder, folderRel) {
    var key = rowNum + ':' + kSrc;
    if (!frame || frame.sheetId !== sh.getSheetId() || !frame.expected[key]) fail_('PROCESSOR_CONTEXT_REQUIRED');
    try {
      frame.attempted = true;
      stage_('row_binding');
      _assertCurrentRow_();
      if (text_(folderRel) !== frame.folderRel) fail_('ROW_BINDING_CHANGED');
      var source = text_(sh.getRange(rowNum, kSrc + 1).getValue());
      if (source !== frame.expected[key].source) fail_('SOURCE_CHANGED');
      var oldWm = text_(sh.getRange(rowNum, kWm + 1).getValue());
      var oldUrl = text_(sh.getRange(rowNum, kUrl + 1).getValue());
      if (!source && !oldWm && !oldUrl) { frame.done[key] = true; return; }
      stage_('output_folder');
      var folder = outputFolder_(rowFolder, folderRel);
      stage_('existing_acl');
      var repairFailed = false;
      [oldWm, oldUrl].forEach(function (ref) {
        if (!ref) return;
        try { boundPrivateFile_(resolve_(ref, folder, folderRel), folder); }
        catch (error) { remember_(error); repairFailed = true; }
      });
      if (repairFailed) fail_('EXISTING_ACL_FAILED');
      if (!source) {
        _assertCurrentRow_();
        sh.getRange(rowNum, kWm + 1).clearContent();
        _assertCurrentRow_();
        sh.getRange(rowNum, kUrl + 1).clearContent();
        SpreadsheetApp.flush();
        frame.done[key] = true;
        return;
      }
      stage_('source_file');
      var sourceFolder = rowFolder || (root.YANDAL_IMG_FOLDER_ID
        ? DriveApp.getFolderById(root.YANDAL_IMG_FOLDER_ID) : folder);
      var sourceId = resolve_(source, sourceFolder, folderRel);
      var sourceFile = boundPrivateFile_(sourceId, sourceFolder);
      var version = _sourceVersion_(sourceFile);
      var metadata = {};
      Object.keys(info || {}).forEach(function (k) {
        if (k !== 'idempotencyKey') metadata[k] = info[k];
      });
      // Versioned output namespace: legacy WM_<name> files are privatized but
      // NEVER treated as proof of a match. Full source ID/content and rendering
      // context determine both the output name and provider idempotency key.
      var binding = _sha256_(_canonical_({ version: 2, source: version,
        folder: folder.getId(), sheet: frame.sheetId, kode: frame.kode,
        slot: kSrc, info: metadata }));
      var wmName = 'WM_v2_' + binding + '.jpg';
      metadata.idempotencyKey = 'yandal:v2:' + binding;
      var prefix = text_(folderRel).replace(/\/+$/, '');
      var expected = prefix ? prefix + '/' + wmName : '';
      var outputId = namedId_(folder, wmName);
      if (!outputId) {
        _assertCurrentRow_();
        // Authentication and same-ULP checks already ran before any reads.
        // The private transport avoids forging a user session for scheduled work.
        stage_('engine');
        outputId = fileId_(need_('_h07WatermarkImpl_')(sourceId, folder.getId(), metadata, wmName));
        if (!outputId) fail_('INVALID_ENGINE_RESULT');
      }
      stage_('output_verify');
      _assertCurrentRow_();
      var output = boundPrivateFile_(outputId, folder);
      if (output.getName() !== wmName) fail_('WRONG_OUTPUT_NAME');
      if (resolve_(source, sourceFolder, folderRel) !== sourceId ||
          _sourceVersion_(DriveApp.getFileById(sourceId)) !== version) fail_('SOURCE_CHANGED');
      if (text_(sh.getRange(rowNum, kSrc + 1).getValue()) !== source) fail_('SOURCE_CHANGED');
      var url = 'https://drive.usercontent.google.com/download?id=' + outputId + '&export=download';
      // Stored identifiers only: ACL stays private. Completion marker is last.
      stage_('sheet_commit');
      writeText_(sh, rowNum, kUrl, url);
      writeText_(sh, rowNum, kWm, expected || url);
      SpreadsheetApp.flush();
      frame.done[key] = true;
    } catch (error) {
      remember_(error);
      frame.failed = true;
      throw new Error('T11_YANDAL_PHOTO_FAILED');
    }
  }
  // Assignment, not a competing declaration: legacy _wmFotoY_ is never invoked.
  root._wmFotoY_ = _privatePhoto_;

  function spec_(switching) {
    var cols = switching ? root.COL_SWITCHING : root.COL_P0;
    var suffixes = switching ? ['Arus', 'G1', 'G2', 'G3', 'G4', 'G5'] : ['Sebelum', 'Pekerjaan', 'Sesudah'];
    var keys = switching ? ['arus', 'gangguan1', 'gangguan2', 'gangguan3', 'gangguan4', 'gangguan5'] :
      ['sebelum', 'pekerjaan', 'sesudah'];
    if (!cols || !root.SHEET_YANDAL) fail_('SCHEMA_MISSING');
    return { cols: cols, sheet: switching ? root.SHEET_YANDAL.SWITCHING : root.SHEET_YANDAL.P0,
      id: switching ? cols.kodeSwitching : cols.kodeP0,
      slots: suffixes.map(function (s, i) {
        return { key: keys[i], src: cols['foto' + s], wm: cols['foto' + s + 'Wm'], url: cols['linkDownload' + s] };
      }) };
  }
  function _row_(spec, kode) {
    var sh = need_('_shY_')(spec.sheet);
    if (!sh || !text_(kode)) fail_('ROW_MISSING');
    var rows = sh.getDataRange().getValues(), found = null;
    for (var i = 1; i < rows.length; i++) if (text_(rows[i][spec.id]) === text_(kode)) {
      if (found) fail_('ROW_AMBIGUOUS');
      found = { sh: sh, row: rows[i], rowNum: i + 1 };
    }
    if (!found) fail_('ROW_MISSING');
    if (!need_('ulpSama_')(found.row[spec.cols.ulp], 'ULP Toboali'))
      fail_('ULP_UNRESOLVED_OR_FOREIGN');
    return found;
  }
  function repairRow_(spec, found) {
    var refs = [];
    spec.slots.forEach(function (slot) {
      [slot.wm, slot.url].forEach(function (col) {
        if (text_(found.row[col])) refs.push(found.row[col]);
      });
    });
    if (!refs.length) return;
    var folderRel = found.row[spec.cols.folderPath], folder = outputFolder_(null, folderRel);
    var failed = false;
    refs.forEach(function (ref) {
      try { boundPrivateFile_(resolve_(ref, folder, folderRel), folder); }
      catch (error) { remember_(error); failed = true; }
    });
    if (failed) fail_('ROW_ACL_FAILED');
  }
  function install_(name, switching) {
    var original = root[name];
    root[name] = function (kode, target) {
      var previous = frame;
      var current = { failed: false, expected: {}, done: {}, stage: 'auth' };
      var lock = null;
      frame = current;
      try {
        current.principal = _principal_(arguments, name, false);
        if (typeof original !== 'function') fail_('PROCESSOR_MISSING');
        need_('_h07PrivateFile_');
        // Authenticate first, then acquire BEFORE resolving ownership or
        // allowing any legacy preprocessing. Never continue after timeout.
        stage_('lock');
        lock = LockService.getScriptLock();
        lock.waitLock(30000);
        if (!lock.hasLock()) fail_('LOCK_REQUIRED');
        stage_('ownership');
        var schema = spec_(switching), before = _row_(schema, kode);
        current.schema = schema;
        current.kode = text_(kode);
        current.sh = before.sh;
        current.width = before.row.length;
        current.sheetId = before.sh.getSheetId();
        current.rowNum = before.rowNum;
        current.folderRel = text_(before.row[schema.cols.folderPath]);
        var wanted = text_(target).toLowerCase();
        var slots = schema.slots.filter(function (slot) { return !wanted || wanted === slot.key; });
        if (!slots.length) fail_('INVALID_SLOT');
        slots.forEach(function (slot) {
          current.expected[before.rowNum + ':' + slot.src] = { col: slot.src, source: text_(before.row[slot.src]) };
        });
        _assertCurrentRow_();
        // waitLock is a no-op when this execution already owns the lock.
        // Legacy processors release it in finally, so reacquire before repair.
        stage_('legacy_processor');
        var result = original.apply(this, arguments);
        stage_('postprocess');
        lock.waitLock(30000);
        var after = _row_(schema, kode);
        if (after.rowNum !== current.rowNum || after.sh.getSheetId() !== current.sheetId)
          fail_('ROW_BINDING_CHANGED');
        _assertCurrentRow_();
        // Only repair after the original processor entered the guarded photo
        // path. Do not introduce Drive side effects before its own guards.
        if (current.attempted) repairRow_(schema, after);
        // Legacy processors swallow failures. Latch + receipts prevent success.
        if (current.failed || (result && result.ok === false)) fail_('PROCESS_FAILED');
        Object.keys(current.expected).forEach(function (key) {
          if (!current.done[key]) fail_('PHOTO_INCOMPLETE');
        });
        slots.forEach(function (slot) {
          if (text_(after.row[slot.src]) !== current.expected[before.rowNum + ':' + slot.src].source)
            fail_('SOURCE_CHANGED');
        });
        return result;
      } catch (error) {
        remember_(error);
        try {
          Logger.log(JSON.stringify({ event: 'T11_WM_FAILURE', processor: name,
            stage: current.causeStage, code: current.cause }));
        } catch (loggingError) {}
        throw new Error('T11_YANDAL_PROCESS_FAILED');
      } finally {
        try { if (lock && lock.hasLock()) lock.releaseLock(); } catch (releaseError) {}
        frame = previous;
      }
    };
  }
  install_('prosesP0Yandal', false);
  install_('prosesSwitchingYandal', true);

  // Public manual queue/scheduler calls require an authenticated Super User.
  // Old no-argument public triggers intentionally fail closed. Migrate their
  // handler names in staging to the private entry points before deployment.
  var originalDrain = root.drainAntreanP0;
  var originalTick = root.tickPusatSiSi;
  var originalDaily = root.harianPusatSiSi;
  root.harianPusatSiSi = function () {
    _principal_(arguments, 'harianPusatSiSi', true);
    return _runQueue_(originalDaily);
  };
  root.drainAntreanP0 = function () {
    _principal_(arguments, 'drainAntreanP0', true);
    return _runQueue_(originalDrain);
  };
  root.tickPusatSiSi = function () {
    _principal_(arguments, 'tickPusatSiSi', true);
    return _runQueue_(originalTick);
  };
  function _runQueue_(fn, args) {
    if (typeof fn !== 'function') fail_('QUEUE_HANDLER_MISSING');
    var previous = queueContext;
    queueContext = queueCapability;
    try { return fn.apply(root, args || []); }
    finally { queueContext = previous; }
  }
  // Trailing underscores are private under google.script.run. Do not expose
  // these helpers through any generic HTTP action/function-name dispatcher.
  root._t11ScheduledQueueDispatch_ = function (kind) {
    if (kind === 'tick') return _runQueue_(originalTick);
    if (kind === 'drain') return _runQueue_(originalDrain);
    if (kind === 'daily') return _runQueue_(originalDaily);
    fail_('UNKNOWN_SCHEDULED_HANDLER');
  };
  var originalRouter = root.apiRouter_;
  if (typeof originalRouter === 'function') {
    root.apiRouter_ = function (e, body) {
      var p = (e && e.parameter) || {};
      var actions = [p.action, body && body.action];
      if (actions.some(function (a) { return /^_t11|^_h07WatermarkImpl_$/.test(text_(a)); }))
        throw new Error('T11_PRIVATE_ACTION_DENIED');
      return originalRouter.apply(this, arguments);
    };
  }
  // Webhooks have their own credential, never a caller-provided internal flag.
  // Verify the actual POST body before establishing execution-local authority.
  var originalPost = root.doPost;
  if (typeof originalPost === 'function') {
    root.doPost = function (e) {
      if (e && e.parameter && e.parameter.mobile) return originalPost.apply(this, arguments);
      var body;
      try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
      catch (error) { throw new Error('T11_WEBHOOK_BODY_INVALID'); }
      var action = text_(body && body.action);
      if (/^_t11|^_h07WatermarkImpl_$/.test(action)) throw new Error('T11_PRIVATE_ACTION_DENIED');
      if (action === 'prosesP0Yandal' || action === 'prosesSwitchingYandal') {
        var verified = need_('webhookVerifikasi_')(body);
        if (!verified || verified.ok !== true) throw new Error('T11_WEBHOOK_DENIED');
        return _runQueue_(originalPost, arguments);
      }
      return originalPost.apply(this, arguments);
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);

function _t11TickPusatSiSi_() {
  return _t11ScheduledQueueDispatch_('tick');
}
function _t11DrainAntreanP0_() {
  return _t11ScheduledQueueDispatch_('drain');
}
function _t11HarianPusatSiSi_() {
  return _t11ScheduledQueueDispatch_('daily');
}
