'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { test } = require('node:test');
const backend = path.join(__dirname, '../SiSi_BackEnd');
const boundary = fs.readFileSync(path.join(backend, 'Core/ZZ-T11-Yandal-Watermark-ACL.js'), 'utf8');
const guardSource = fs.readFileSync(path.join(backend, 'Core/Guard.js'), 'utf8');
const P = { kodeP0: 3, ulp: 4, folderPath: 49 };
const S = { kodeSwitching: 4, ulp: 5, folderPath: 49 };
const pslots = ['Sebelum', 'Pekerjaan', 'Sesudah'].map((s, i) => {
  P['foto' + s] = 23 + i * 5; P['foto' + s + 'Wm'] = 24 + i * 5; P['linkDownload' + s] = 26 + i * 5;
  return { key: s.toLowerCase(), src: 23 + i * 5, wm: 24 + i * 5, url: 26 + i * 5 };
});
const sslots = ['Arus', 'G1', 'G2', 'G3', 'G4', 'G5'].map((s, i) => {
  S['foto' + s] = 23 + i * 4; S['foto' + s + 'Wm'] = 24 + i * 4; S['linkDownload' + s] = 26 + i * 4;
  return { key: i ? 'gangguan' + i : 'arus', src: 23 + i * 4, wm: 24 + i * 4, url: 26 + i * 4 };
});
function iterator(items) {
  let i = 0;
  return { hasNext: () => i < items.length, next: () => items[i++] };
}
function fixture(switching = false, options = {}) {
  const cols = switching ? S : P, slots = switching ? sslots : pslots;
  const code = switching ? 'TEST-SWC.001' : 'TEST-P0.001';
  const row = Array(50).fill('');
  row[switching ? cols.kodeSwitching : cols.kodeP0] = code;
  row[cols.ulp] = 'ULP Toboali'; row[49] = 'row-folder';
  const rows = [Array(50).fill('header'), row];
  const events = [], files = new Map();
  let serial = 0, engineCalls = 0, locked = false, reads = 0, queueCalls = 0, processorCalls = 0;
  const engineKeys = [];
  const folder = { id: 'folder_12345678901234567890', access: 'PRIVATE',
    getId() { return this.id; }, getSharingAccess() { return this.access; },
    getParents: () => iterator(options.publicAncestor ? [{
      getId: () => 'parent', getSharingAccess: () => 'ANYONE_WITH_LINK', getParents: () => iterator([])
    }] : []),
    getFilesByName: (name) => iterator([...files.values()].filter(f => f.name === name && f.parent === folder)) };
  const otherFolder = { ...folder, id: 'other_folder_12345678901234567890', getParents: () => iterator([]) };
  function addFile(name, access = 'PRIVATE', parent = folder) {
    const id = 'file_' + String(++serial).padStart(24, '0');
    const f = { id, name, access, parent, bytes: [1, 2, 3], mime: 'image/jpeg',
      getId() { return this.id; }, getName() { return this.name; },
      getBlob() { return { getBytes: () => this.bytes.slice(), getContentType: () => this.mime }; },
      getSharingAccess() { if (options.readAclFails) throw Error('acl read'); return this.access; },
      getParents() { return iterator([this.parent]); },
      setSharing(accessValue, permission) {
        events.push(['sharing', this.id, accessValue]);
        assert.equal(accessValue, 'PRIVATE', 'no transient public sharing is allowed');
        assert.equal(permission, 'VIEW');
        if (this.name.startsWith('WM_') && options.aclFails) throw Error('acl denied');
        if (!options.silentAclFailure) this.access = accessValue;
      } };
    files.set(id, f);
    return f;
  }
  const active = options.all ? slots : [slots[0]];
  active.forEach((slot, i) => { const f = addFile('capture' + i + '.jpg'); row[slot.src] = 'row-folder/' + f.name; });
  const sh = {
    getSheetId: () => 123, getName: () => switching ? 'switching' : 'p0',
    getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValue: () => rows[r - 1][c - 1],
      getValues: () => rows.slice(r - 1, r - 1 + nr).map(v => v.slice(c - 1, c - 1 + nc)),
      setNumberFormat() { return this; },
      setValue(v) {
        events.push(['write', c - 1]);
        if (options.writeFails === c - 1) throw Error('sheet write failed');
        rows[r - 1][c - 1] = v;
      },
      clearContent() { events.push(['clear', c - 1]); rows[r - 1][c - 1] = ''; }
    })
  };
  const ctx = vm.createContext({
    SpreadsheetApp: { flush: () => { if (options.flushFails) throw Error('flush failed'); } },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (algorithm, value) => [...crypto.createHash(algorithm)
        .update(typeof value === 'string' ? value : Buffer.from(value)).digest()]
    },
    guard_: (args, opts) => {
      const list = Array.from(args || []);
      if (!list.some(v => v && typeof v === 'object' && v.token === 'valid-session'))
        throw Error('UNAUTHENTICATED');
      if (options.expiredSession) throw Error('EXPIRED_SESSION');
      if (opts.role && options.notSuper) throw Error('ROLE_DENIED');
      return { ulp: options.callerUlp === undefined ? 'ULP Toboali' : options.callerUlp,
        token: 'valid-session', isSuper: !options.notSuper };
    },
    COL_P0: P, COL_SWITCHING: S, SHEET_YANDAL: { P0: 'p0', SWITCHING: 'switching' },
    YANDAL_WM_FOLDER_ID: folder.id, YANDAL_IMG_FOLDER_ID: '',
    Logger: { log: () => {} },
    LockService: { getScriptLock: () => ({
      waitLock: () => {
        if (locked) return;
        if (options.beforeAcquire) options.beforeAcquire({ row, rows, cols, slots });
        if (options.lockFails) throw Error('lock denied');
        locked = true;
      },
      hasLock: () => locked, releaseLock: () => {
        locked = false;
        if (options.afterRelease) options.afterRelease({ row, rows, cols, slots });
      }
    }) },
    DriveApp: { Access: { PRIVATE: 'PRIVATE' }, Permission: { VIEW: 'VIEW' },
      getFileById: (id) => { if (!files.has(id)) throw Error('missing file'); return files.get(id); },
      getFolderById: (id) => { assert.equal(id, folder.id); return folder; }
    },
    _shY_: (name) => { reads++; return name === (switching ? 'switching' : 'p0') ? { ...sh } : null; },
    _folderFromRelPathY_: (rel) => { assert.equal(rel, 'row-folder'); return folder; },
    _setTextY_: (sheet, r, c, v) => sheet.getRange(r, c + 1).setValue(v),
    _h07PrivateFile_: (id) => { const f = files.get(id); if (!f) throw Error('missing file');
      f.setSharing('PRIVATE', 'VIEW'); return f; },
    watermarkFoto_: (_id, outFolder, info, name) => {
      engineCalls++; assert.equal(outFolder, folder.id);
      engineKeys.push(info.idempotencyKey);
      assert.match(info.idempotencyKey, /^yandal:/);
      if (options.engineFails) throw Error('provider token should not leak');
      const f = addFile(name, options.silentAclFailure ? 'ANYONE_WITH_LINK' : 'PRIVATE',
        options.wrongOutputFolder ? otherFolder : folder);
      if (options.sourceChanges) row[slots[0].src] = 'row-folder/replaced.jpg';
      if (options.duringEngine) options.duringEngine({ row, cols, files, source: files.get(_id) });
      return options.invalidEngine ? 'https://evil.example/?id=' + f.id : 'https://drive.google.com/thumbnail?id=' + f.id;
    }
  });
  function original(kode, target) {
    processorCalls++;
    assert.equal(kode, code);
    const lock = ctx.LockService.getScriptLock();
    try { lock.waitLock(); } catch (_) {}
    try {
      if (options.beforePhoto) options.beforePhoto({ row, rows, cols, slots });
      if (options.swallowBeforePhoto) throw Error('preprocessing failed');
      for (const slot of slots) if (!target || slot.key === target) {
        ctx._wmFotoY_({ ...sh }, 2, slot.src, slot.wm, slot.url,
          { ulp: 'ULP Toboali', ...(options.photoInfo || {}) }, folder, row[49]);
      }
    } catch (_) { /* Model the real legacy catch/log behavior. */ }
    finally { lock.releaseLock(); }
  }
  ctx.prosesP0Yandal = original;
  ctx.prosesSwitchingYandal = original;
  ctx._h07WatermarkImpl_ = ctx.watermarkFoto_;
  ctx.drainAntreanP0 = () => {
    queueCalls++;
    if (options.queueThrows) throw Error('QUEUE_FAILED');
    return ctx[switching ? 'prosesSwitchingYandal' : 'prosesP0Yandal'](code, slots[0].key);
  };
  ctx.tickPusatSiSi = () => ctx.drainAntreanP0();
  ctx.apiRouter_ = () => 'router-result';
  ctx.webhookVerifikasi_ = (body) => ({ ok: body.secret === 'valid-webhook' && body.ts === 'fresh' });
  ctx.doPost = (e) => {
    const body = JSON.parse(e.postData.contents);
    return ctx[body.action](code, slots[0].key);
  };
  ctx._wmFotoY_ = () => { throw Error('UNSAFE LEGACY HELPER WAS CALLED'); };
  const fixtureGlobals = { ...ctx };
  vm.runInContext(guardSource, ctx);
  Object.assign(ctx, fixtureGlobals);
  function install() { vm.runInContext(boundary, ctx, { timeout: 1000 }); }
  install();
  const invoke = (target = options.all ? '' : slots[0].key) =>
    ctx[switching ? 'prosesSwitchingYandal' : 'prosesP0Yandal'](code, target, { token: 'valid-session' });
  function existing(slot = slots[0], access = 'ANYONE_WITH_LINK') {
    const sourceName = row[slot.src].split('/').pop();
    const f = addFile('WM_' + sourceName + '.jpg', access);
    row[slot.wm] = 'row-folder/' + f.name;
    row[slot.url] = 'https://drive.usercontent.google.com/download?id=' + f.id + '&export=download';
    return f;
  }
  return { ctx, row, rows, cols, slots, sh, code, invoke, folder, files, events, addFile, existing, engineKeys,
    options, install, get engineCalls() { return engineCalls; },
    get locked() { return locked; }, get processorCalls() { return processorCalls; },
    get reads() { return reads; }, get queueCalls() { return queueCalls; } };
}
for (const switching of [false, true]) {
  const label = switching ? 'Switching' : 'P0';
  test(label + ': mixed Toboali aliases preserve private watermark flow', () => {
    for (const callerUlp of ['Toboali', ' ULP   TOBOALI ']) {
      const f = fixture(switching, { callerUlp });
      f.row[f.cols.ulp] = callerUlp === 'Toboali' ? ' ULP   Toboali ' : 'toboali';
      const originalOwner = f.row[f.cols.ulp];
      f.invoke();
      assert.equal(f.engineCalls, 1);
      assert.equal(f.row[f.cols.ulp], originalOwner);
      assert.ok(f.row[f.slots[0].url]);
      assert.equal(f.locked, false);
    }
  });
  test(label + ': malformed and foreign owners cannot become Toboali', () => {
    for (const ulp of ['', ' ', 16130, 'ULP Lain', 'ULP ULP Toboali', ['Toboali']]) {
      const caller = fixture(switching, { callerUlp: ulp });
      assert.throws(() => caller.invoke());
      assert.equal(caller.engineCalls, 0);
      const row = fixture(switching);
      row.row[row.cols.ulp] = ulp;
      assert.throws(() => row.invoke());
      assert.equal(row.engineCalls, 0);
      assert.deepEqual(row.events, []);
    }
  });
  test(label + ': private scheduled capability accepts Toboali rows without user tokens', () => {
    const f = fixture(switching);
    f.row[f.cols.ulp] = 'Toboali';
    f.ctx._t11DrainAntreanP0_();
    assert.equal(f.engineCalls, 1);
    const denied = fixture(switching);
    denied.ctx.ulpSama_ = undefined;
    assert.throws(() => denied.invoke());
    assert.equal(denied.engineCalls, 0);
  });
  test('boundary: ' + label + ' all slots stay private without invoking legacy sharing', () => {
    const f = fixture(switching, { all: true }); f.invoke();
    assert.equal(f.engineCalls, f.slots.length);
    for (const slot of f.slots) assert.match(f.row[slot.wm], /^row-folder\/WM_/);
    for (const file of f.files.values()) assert.equal(file.access, 'PRIVATE');
    assert.ok(f.events.some(e => e[0] === 'write'));
  });
  test('boundary: ' + label + ' ACL failure survives swallowed legacy exception', () => {
    const f = fixture(switching, { aclFails: true });
    assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/);
    assert.equal(f.row[f.slots[0].wm], ''); assert.equal(f.row[f.slots[0].url], '');
    f.options.aclFails = false; f.invoke(); assert.equal(f.engineCalls, 1, 'retry reuses private orphan');
  });
  test('boundary: ' + label + ' legacy output is privatized but not reused without source identity', () => {
    const f = fixture(switching); const old = f.existing(); f.invoke();
    assert.equal(old.access, 'PRIVATE'); assert.equal(f.engineCalls, 1);
    assert.ok(!f.row[f.slots[0].url].includes(old.id));
  });
  test('boundary: ' + label + ' invalid path does not skip a valid download reference', () => {
    const f = fixture(switching); const old = f.existing(); f.row[f.slots[0].wm] = '../bad';
    assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/);
    assert.equal(old.access, 'PRIVATE');
  });
  test('boundary: ' + label + ' swallowed preprocessing failure is never success', () => {
    const f = fixture(switching, { swallowBeforePhoto: true });
    assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/);
    assert.equal(f.engineCalls, 0);
  });
}
for (const option of ['engineFails', 'silentAclFailure', 'readAclFails', 'publicAncestor',
  'invalidEngine', 'wrongOutputFolder', 'sourceChanges', 'lockFails']) {
  test('boundary: fail closed for ' + option, () => {
    const f = fixture(false, { [option]: true });
    assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/);
    assert.equal(f.row[f.slots[0].wm], '');
    if (['publicAncestor', 'lockFails'].includes(option)) assert.equal(f.engineCalls, 0);
  });
}
test('boundary: failed Sheet completion is retryable and does not duplicate output', () => {
  const f = fixture(false, { writeFails: pslots[0].wm });
  assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/);
  assert.equal(f.row[pslots[0].wm], '');
  f.options.writeFails = null; f.invoke(); assert.equal(f.engineCalls, 1);
});
test('boundary: failed flush cannot report completion and retry reuses same version', () => {
  const f = fixture(false, { flushFails: true });
  assert.throws(() => f.invoke(), /PROCESS_FAILED/);
  f.options.flushFails = false; f.invoke();
  assert.equal(f.engineCalls, 1); assert.equal(f.locked, false);
});
test('boundary: ambiguous file lookup rejects rather than taking the first match', () => {
  const f = fixture(); f.addFile('capture0.jpg');
  assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/); assert.equal(f.engineCalls, 0);
});
test('boundary: missing dependency cannot silently skip privacy', () => {
  const f = fixture(); delete f.ctx._h07PrivateFile_;
  assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/); assert.equal(f.engineCalls, 0);
});
test('boundary: missing and duplicate rows fail closed', () => {
  const f = fixture(); f.rows.push(f.row.slice());
  assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/);
  f.rows.splice(1); assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/);
});
test('boundary: foreign or unresolved ULP is rejected before Drive side effects', () => {
  for (const ulp of ['', 'ULP Lain']) {
    const f = fixture(); f.row[f.cols.ulp] = ulp;
    assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/); assert.deepEqual(f.events, []);
  }
});
test('boundary: unselected public outputs also get revoked', () => {
  const f = fixture(false, { all: true });
  const old = f.existing(f.slots[1]); f.invoke('sebelum');
  assert.equal(old.access, 'PRIVATE'); assert.equal(f.engineCalls, 1);
});
test('boundary: missing source file stays failed and invalid target is rejected', () => {
  const f = fixture(); f.files.clear();
  assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/);
  assert.throws(() => f.invoke('invalid'), /T11_YANDAL_PROCESS_FAILED/);
});
test('boundary: public output folder blocks engine before upload', () => {
  const f = fixture(); f.folder.access = 'ANYONE_WITH_LINK';
  assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/); assert.equal(f.engineCalls, 0);
});
test('boundary: no direct invocation outside processor context', () => {
  const f = fixture();
  assert.throws(() => f.ctx._wmFotoY_(f.sh, 2, 23, 24, 26, {}, f.folder, 'row-folder'),
    /PROCESSOR_CONTEXT_REQUIRED/);
});

// These integration cases execute actual repository function bodies, not copies.
test('audit: existing-output path must authenticate before ACL or Sheet writes', () => {
  const f = fixture();
  f.existing();
  f.ctx.guard_ = () => { throw new Error('UNAUTHENTICATED'); };
  f.ctx.watermarkFoto_ = () => { throw new Error('UNAUTHENTICATED'); };
  let rejected = false;
  try { f.invoke(); } catch (_) { rejected = true; }
  assert.equal(rejected, true,
    'Unauthenticated existing-output path completed; side effects: ' + JSON.stringify(f.events));
  assert.deepEqual(f.events, [], 'No Drive or Sheet write is allowed before authentication');
  assert.equal(f.reads, 0, 'Authentication must precede Sheet reads too');
});

for (const payload of [undefined, {}, { token: 'invalid' }, { internal: true },
  { scheduled: true, triggerUid: 'forged', authMode: 'FULL' }]) {
  test('auth: forged/missing credential rejected before reads ' + JSON.stringify(payload), () => {
    for (const switching of [false, true]) {
      const f = fixture(switching); f.existing();
      const name = switching ? 'prosesSwitchingYandal' : 'prosesP0Yandal';
      assert.throws(() => f.ctx[name](f.code, f.slots[0].key, payload), /T11_YANDAL_PROCESS_FAILED/);
      assert.equal(f.reads, 0); assert.deepEqual(f.events, []);
    }
  });
}
for (const callerUlp of ['', 'ULP Lain']) {
  test('auth: caller ULP denied even when row belongs to Toboali: ' + callerUlp, () => {
    const f = fixture(false, { callerUlp }); f.existing();
    assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/);
    assert.equal(f.reads, 0); assert.deepEqual(f.events, []);
  });
}
test('auth: expired session is rejected on reuse path', () => {
  const f = fixture(false, { expiredSession: true }); f.existing();
  assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/);
  assert.equal(f.reads, 0); assert.deepEqual(f.events, []);
});
test('auth: public drain/tick require Super session, not event flags', () => {
  const f = fixture(false, { notSuper: true });
  for (const name of ['drainAntreanP0', 'tickPusatSiSi']) {
    assert.throws(() => f.ctx[name]({ triggerUid: 'forged', internal: true }), /UNAUTHENTICATED/);
    assert.throws(() => f.ctx[name]({ token: 'valid-session' }), /ROLE_DENIED/);
  }
  assert.equal(f.queueCalls, 0); assert.equal(f.reads, 0);
  f.options.notSuper = false;
  f.ctx.drainAntreanP0({ token: 'valid-session' });
  assert.equal(f.engineCalls, 1);
});
test('auth: private scheduled entry works without a fabricated session and restores context', () => {
  const f = fixture();
  f.ctx.guard_ = () => { throw Error('NO_SESSION_IN_TRIGGER'); };
  f.ctx._t11TickPusatSiSi_();
  assert.equal(f.engineCalls, 1);
  assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/);
  assert.throws(() => f.ctx.drainAntreanP0(), /NO_SESSION_IN_TRIGGER/);
  f.options.queueThrows = true;
  assert.throws(() => f.ctx._t11DrainAntreanP0_(), /QUEUE_FAILED/);
  assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/);
});
test('auth: private handlers cannot be selected by HTTP action', () => {
  const f = fixture();
  for (const action of ['_t11TickPusatSiSi_', '_t11DrainAntreanP0_', '_t11ScheduledQueueDispatch_', '_h07WatermarkImpl_']) {
    assert.throws(() => f.ctx.apiRouter_({}, { action }), /PRIVATE_ACTION_DENIED/);
    assert.throws(() => f.ctx.apiRouter_({ parameter: { action } }, {}), /PRIVATE_ACTION_DENIED/);
  }
  assert.equal(f.ctx.apiRouter_({}, { action: 'existingAction' }), 'router-result');
  assert.equal(f.queueCalls, 0);
});
test('auth: only verified POST secret and timestamp grant webhook context', () => {
  const f = fixture();
  const event = (body) => ({ postData: { contents: JSON.stringify(body) } });
  for (const body of [
    { action: 'prosesP0Yandal', internal: true },
    { action: 'prosesP0Yandal', secret: 'valid-webhook', ts: 'stale' },
    { action: 'prosesP0Yandal', secret: 'wrong', ts: 'fresh' }
  ]) assert.throws(() => f.ctx.doPost(event(body)), /WEBHOOK_DENIED/);
  assert.equal(f.reads, 0);
  f.ctx.doPost(event({ action: 'prosesP0Yandal', secret: 'valid-webhook', ts: 'fresh' }));
  assert.equal(f.engineCalls, 1);
  assert.throws(() => f.ctx.prosesP0Yandal(f.code, 'sebelum'), /PROCESS_FAILED/);
  assert.throws(() => f.ctx.doPost(event({ action: '_t11TickPusatSiSi_' })), /PRIVATE_ACTION_DENIED/);
});
test('auth: mobile mode cannot obtain webhook privilege from body fields', () => {
  const f = fixture();
  assert.throws(() => f.ctx.doPost({ parameter: { mobile: '1' }, postData: { contents:
    JSON.stringify({ action: 'prosesP0Yandal', secret: 'valid-webhook', ts: 'fresh' }) } }), /PROCESS_FAILED/);
  assert.equal(f.reads, 0); assert.deepEqual(f.events, []);
});

function legacyFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, 'missing actual function ' + name);
  const end = source.indexOf('\n}', start);
  assert.ok(end > start, 'missing closing body ' + name);
  return source.slice(start, end + 2);
}
// Race regressions exercise the real overlay with controlled service timing.
// External writers do not honor Apps Script locks; rechecks must still reject.
for (const switching of [false, true]) {
  const label = switching ? 'Switching' : 'P0';
  test('race: ' + label + ' ownership changes while waiting: zero side effects', () => {
    for (const ulp of ['', 'ULP Lain']) {
      const f = fixture(switching, {
        beforeAcquire: ({ row, cols }) => { row[cols.ulp] = ulp; }
      });
      assert.throws(() => f.invoke(), /PROCESS_FAILED/);
      assert.equal(f.processorCalls, 0);
      assert.equal(f.engineCalls, 0);
      assert.deepEqual(f.events, []);
      assert.equal(f.locked, false);
    }
  });
  test('race: ' + label + ' lock timeout cannot enter legacy preprocessing', () => {
    const f = fixture(switching, { lockFails: true });
    assert.throws(() => f.invoke(), /PROCESS_FAILED/);
    assert.equal(f.processorCalls, 0); assert.equal(f.reads, 0);
    assert.deepEqual(f.events, []); assert.equal(f.locked, false);
  });
  test('race: ' + label + ' row ownership, key and folder changes before photo reject', () => {
    for (const field of ['ulp', 'key', 'folder']) {
      const f = fixture(switching, { beforePhoto: ({ row, cols }) => {
        if (field === 'ulp') row[cols.ulp] = 'ULP Lain';
        if (field === 'key') row[switching ? cols.kodeSwitching : cols.kodeP0] = 'OTHER';
        if (field === 'folder') row[cols.folderPath] = 'other-folder';
      } });
      assert.throws(() => f.invoke(), /PROCESS_FAILED/);
      assert.deepEqual(f.events, []); assert.equal(f.engineCalls, 0);
      assert.equal(f.locked, false);
    }
  });
  test('race: ' + label + ' ownership change during engine prevents completion writes', () => {
    const f = fixture(switching, {
      duringEngine: ({ row, cols }) => { row[cols.ulp] = 'ULP Lain'; }
    });
    assert.throws(() => f.invoke(), /PROCESS_FAILED/);
    assert.equal(f.engineCalls, 1);
    assert.equal(f.events.filter(e => e[0] === 'write').length, 0);
    assert.equal(f.row[f.slots[0].wm], '');
    assert.equal(f.locked, false);
  });
  test('race: ' + label + ' post-processor repair reacquires and revalidates ownership', () => {
    const f = fixture(switching, { all: true, afterRelease: ({ row, cols }) => {
      row[cols.ulp] = 'ULP Lain';
    } });
    const unselected = f.existing(f.slots[1]);
    assert.throws(() => f.invoke(f.slots[0].key), /PROCESS_FAILED/);
    assert.equal(unselected.access, 'ANYONE_WITH_LINK', 'no post-release ACL write to newly foreign row');
    assert.equal(f.locked, false);
  });
  test('identity: ' + label + ' same filename with a different source ID regenerates', () => {
    const f = fixture(switching); f.invoke();
    const oldUrl = f.row[f.slots[0].url];
    const source = [...f.files.values()].find(file => !file.name.startsWith('WM_'));
    f.files.delete(source.id);
    const replacement = f.addFile(source.name);
    // Relative Sheet path stays exactly the same, only the resolved ID changed.
    assert.notEqual(source.id, replacement.id);
    f.invoke();
    assert.equal(f.engineCalls, 2);
    assert.notEqual(f.row[f.slots[0].url], oldUrl);
    assert.notEqual(f.engineKeys[0], f.engineKeys[1]);
  });
  test('identity: ' + label + ' replacement ID supplied as a Drive URL also regenerates', () => {
    const f = fixture(switching); f.invoke();
    const oldUrl = f.row[f.slots[0].url];
    const source = [...f.files.values()].find(file => !file.name.startsWith('WM_'));
    f.files.delete(source.id);
    const replacement = f.addFile(source.name);
    f.row[f.slots[0].src] = 'https://drive.google.com/file/d/' + replacement.id + '/view';
    f.invoke();
    assert.equal(f.engineCalls, 2); assert.notEqual(f.row[f.slots[0].url], oldUrl);
  });
  test('identity: ' + label + ' modified bytes at the same ID regenerate', () => {
    const f = fixture(switching); f.invoke();
    const oldUrl = f.row[f.slots[0].url];
    const source = [...f.files.values()].find(file => !file.name.startsWith('WM_'));
    source.bytes = [4, 5, 6];
    f.invoke();
    assert.equal(f.engineCalls, 2); assert.notEqual(f.row[f.slots[0].url], oldUrl);
    assert.notEqual(f.engineKeys[0], f.engineKeys[1]);
  });
  test('identity: ' + label + ' changed render context regenerates but key ordering does not', () => {
    const f = fixture(switching, { photoInfo: { tim: 'A', jam: '10:00' } }); f.invoke();
    const firstUrl = f.row[f.slots[0].url];
    f.options.photoInfo = { jam: '10:00', tim: 'A' }; f.invoke();
    assert.equal(f.engineCalls, 1); assert.equal(f.row[f.slots[0].url], firstUrl);
    f.options.photoInfo = { jam: '11:00', tim: 'A' }; f.invoke();
    assert.equal(f.engineCalls, 2); assert.notEqual(f.row[f.slots[0].url], firstUrl);
  });
  test('identity: ' + label + ' stable source/context reuses output on retry', () => {
    const f = fixture(switching, { writeFails: (switching ? sslots : pslots)[0].wm });
    assert.throws(() => f.invoke(), /PROCESS_FAILED/);
    const oldUrl = f.row[f.slots[0].url];
    f.options.writeFails = null; f.invoke(); f.invoke();
    assert.equal(f.engineCalls, 1); assert.equal(f.row[f.slots[0].url], oldUrl);
    assert.equal([...f.files.values()].filter(file => file.name.startsWith('WM_v2_')).length, 1);
  });
  test('identity: ' + label + ' content changes during engine reject stale completion', () => {
    const f = fixture(switching, {
      duringEngine: ({ source }) => { source.bytes = [7, 8, 9]; }
    });
    assert.throws(() => f.invoke(), /PROCESS_FAILED/);
    assert.equal(f.events.filter(e => e[0] === 'write').length, 0);
    assert.equal(f.row[f.slots[0].wm], '');
    f.options.duringEngine = null; f.invoke();
    assert.equal(f.engineCalls, 2);
    assert.notEqual(f.engineKeys[0], f.engineKeys[1]);
  });
  test('identity: ' + label + ' duplicate versioned outputs are never first-match reused', () => {
    const f = fixture(switching); f.invoke();
    const output = [...f.files.values()].find(file => file.name.startsWith('WM_v2_'));
    f.addFile(output.name);
    f.events.length = 0;
    assert.throws(() => f.invoke(), /PROCESS_FAILED/);
    assert.equal(f.engineCalls, 1);
    assert.equal(f.events.filter(e => e[0] === 'write').length, 0);
  });
}
test('integration: actual Guard rejects missing/expired/foreign session before any read', () => {
  const source = fs.readFileSync(path.join(backend, 'Core/Guard.js'), 'utf8');
  for (const scenario of ['missing', 'expired', 'foreign', 'valid']) {
    const f = fixture();
    f.existing();
    vm.runInContext(source, f.ctx);
    f.ctx.audit_ = () => {};
    f.ctx.getSesiByToken = token => token === 'valid-session' && scenario !== 'expired'
      ? { username: 'test-user', role: 'Admin', ulp: scenario === 'foreign' ? 'ULP Lain' : 'ULP Toboali' }
      : null;
    if (scenario === 'valid') {
      f.invoke(); assert.ok(f.reads > 0); assert.equal(f.engineCalls, 1);
    } else {
      const call = scenario === 'missing'
        ? () => f.ctx.prosesP0Yandal(f.code, 'sebelum') : () => f.invoke();
      assert.throws(call, /PROCESS_FAILED/); assert.equal(f.reads, 0);
      assert.deepEqual(f.events, []);
    }
  }
});
test('integration: guarded watermark entry still rejects before private transport', () => {
  const f = fixture();
  const source = fs.readFileSync(path.join(backend, 'Core/ZZ-T11-Photo-Privacy.js'), 'utf8');
  vm.runInContext(legacyFunction(source, 'watermarkFoto_'), f.ctx);
  let calls = 0;
  f.ctx._h07WatermarkImpl_ = () => { calls++; return 'private-output'; };
  assert.throws(() => f.ctx.watermarkFoto_('source', 'folder', {}, 'name'), /UNAUTHENTICATED/);
  assert.equal(calls, 0);
  assert.equal(f.ctx.watermarkFoto_('source', 'folder', { token: 'valid-session' }, 'name'), 'private-output');
  assert.equal(calls, 1);
});
function realLegacy(f) {
  const source = fs.readFileSync(path.join(backend, 'Yandal/Tek-Yandal-Code.js'), 'utf8');
  for (const name of ['COL_P0', 'COL_SWITCHING', 'COL_YANDAL_SHIFT']) {
    const declaration = source.match(new RegExp('var ' + name + ' = \\{[\\s\\S]*?\\n\\};'));
    assert.ok(declaration, name); vm.runInContext(declaration[0], f.ctx);
  }
  f.ctx.SHEET_YANDAL.SHIFT = 'shift';
  f.ctx._findRowY_ = (sh, col, key) => {
    if (!sh) return null;
    const rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) if (String(rows[i][col]) === String(key))
      return { rowNum: i + 1, row: rows[i] };
    return null;
  };
  Object.assign(f.ctx, {
    _recalcDurasiRowY_: () => {}, _recalcJarakRowY_: () => '', _recalcJarakAntarP0RowY_: () => '',
    _jamHHmm_: () => '', _tglDMY_: () => '', _hariY_: () => '',
    _setY_: () => {}, recalcJumlahP0_: () => {}
  });
  for (const name of ['_wmFotoY_', 'prosesP0Yandal', 'prosesSwitchingYandal', 'drainAntreanP0'])
    vm.runInContext(legacyFunction(source, name), f.ctx);
  // Install the boundary after the actual legacy definitions, just as deployed.
  f.install();
}
for (const switching of [false, true]) {
  test('integration: actual legacy processor never starts after ownership changes at lock (' + switching + ')', () => {
    const f = fixture(switching, {
      beforeAcquire: ({ row, cols }) => { row[cols.ulp] = 'ULP Lain'; }
    });
    realLegacy(f);
    let preprocessing = 0;
    f.ctx._setY_ = f.ctx._recalcDurasiRowY_ = () => { preprocessing++; };
    assert.throws(() => f.invoke(), /PROCESS_FAILED/);
    assert.equal(preprocessing, 0); assert.equal(f.engineCalls, 0);
    assert.deepEqual(f.events, []); assert.equal(f.locked, false);
  });
  test('integration: actual legacy processor binds new source identity (' + switching + ')', () => {
    const f = fixture(switching); realLegacy(f); f.invoke();
    const oldUrl = f.row[f.slots[0].url];
    const source = [...f.files.values()].find(file => !file.name.startsWith('WM_'));
    f.files.delete(source.id); f.addFile(source.name);
    f.invoke(); f.invoke();
    assert.equal(f.engineCalls, 2);
    assert.notEqual(f.row[f.slots[0].url], oldUrl);
    assert.equal(f.locked, false);
  });
  test('integration: actual legacy processor and queue retain ACL failure (' + switching + ')', () => {
    const f = fixture(switching, { aclFails: true }); realLegacy(f);
    assert.throws(() => f.invoke(), /T11_YANDAL_PROCESS_FAILED/);
    const queue = [['id', 'status', 'code', 'foto', 'enqueued', 'last', 'attempts'],
      ['job1', 'pending', f.code, f.slots[0].key, new Date(), '', 0]];
    f.ctx.WM_QUEUE_BATCH = 25; f.ctx.WM_QUEUE_STALE_MS = 600000; f.ctx.WM_QUEUE_MAX_ATTEMPTS = 5;
    f.ctx._toMillisY_ = value => value ? new Date(value).getTime() : NaN;
    f.ctx.LockService.getUserLock = () => ({ waitLock() {}, releaseLock() {} });
    f.ctx._wmQueueSheet_ = () => ({
      getDataRange: () => ({ getValues: () => queue.map(r => r.slice()),
        setValues: values => queue.splice(0, queue.length, ...values.map(r => r.slice())) }),
      deleteRow: row => queue.splice(row - 1, 1)
    });
    f.ctx._t11DrainAntreanP0_(); assert.equal(queue.length, 2);
    assert.equal(queue[1][1], 'pending'); assert.equal(queue[1][6], 1);
    queue[1][6] = 4; f.ctx._t11DrainAntreanP0_();
    assert.equal(queue[1][1], 'failed'); assert.equal(queue[1][6], 5);
    f.options.aclFails = false; queue[1][1] = 'pending';
    f.ctx._t11DrainAntreanP0_(); assert.equal(queue.length, 1, 'delete queue row only after success');
    assert.equal(f.engineCalls, 1, 'retry keeps the same output');
  });
}
