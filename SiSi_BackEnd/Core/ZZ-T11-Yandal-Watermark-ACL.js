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
  // Resolve the three legacy no-token jobs only inside trusted scheduler
  // execution. Keep their public endpoints (and all other guards) unchanged.
  var originalResolver = root._triggerSisiHandler_;
  if (typeof originalResolver === 'function') {
    root._triggerSisiHandler_ = function (name) {
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
