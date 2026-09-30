'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const backend = path.join(__dirname, '../SiSi_BackEnd');
const boundary = fs.readFileSync(path.join(backend, 'Core/ZZ-T11-Yandal-Watermark-ACL.js'), 'utf8');
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
  let serial = 0, engineCalls = 0, locked = false;
  const folder = { id: 'folder_12345678901234567890', access: 'PRIVATE',
    getId() { return this.id; }, getSharingAccess() { return this.access; },
    getParents: () => iterator(options.publicAncestor ? [{
      getId: () => 'parent', getSharingAccess: () => 'ANYONE_WITH_LINK', getParents: () => iterator([])
    }] : []),
    getFilesByName: (name) => iterator([...files.values()].filter(f => f.name === name && f.parent === folder)) };
  const otherFolder = { ...folder, id: 'other_folder_12345678901234567890', getParents: () => iterator([]) };
  function addFile(name, access = 'PRIVATE', parent = folder) {
    const id = 'file_' + String(++serial).padStart(24, '0');
    const f = { id, name, access, parent,
      getId() { return this.id; }, getName() { return this.name; },
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
    getRange: (r, c) => ({
      getValue: () => rows[r - 1][c - 1],
      setNumberFormat() { return this; },
      setValue(v) {
        events.push(['write', c - 1]);
        if (options.writeFails === c - 1) throw Error('sheet write failed');
        rows[r - 1][c - 1] = v;
      },
      clearContent() { rows[r - 1][c - 1] = ''; }
    })
  };
  const ctx = vm.createContext({
    COL_P0: P, COL_SWITCHING: S, SHEET_YANDAL: { P0: 'p0', SWITCHING: 'switching' },
    YANDAL_WM_FOLDER_ID: folder.id, YANDAL_IMG_FOLDER_ID: '',
    Logger: { log: () => {} },
    LockService: { getScriptLock: () => ({
      waitLock: () => { if (options.lockFails) throw Error('lock denied'); locked = true; },
      hasLock: () => locked, releaseLock: () => { locked = false; }
    }) },
    DriveApp: { Access: { PRIVATE: 'PRIVATE' }, Permission: { VIEW: 'VIEW' },
      getFileById: (id) => { if (!files.has(id)) throw Error('missing file'); return files.get(id); },
      getFolderById: (id) => { assert.equal(id, folder.id); return folder; }
    },
    _shY_: (name) => name === (switching ? 'switching' : 'p0') ? { ...sh } : null,
    _folderFromRelPathY_: (rel) => { assert.equal(rel, 'row-folder'); return folder; },
    _setTextY_: (sheet, r, c, v) => sheet.getRange(r, c + 1).setValue(v),
    _h07PrivateFile_: (id) => { const f = files.get(id); if (!f) throw Error('missing file');
      f.setSharing('PRIVATE', 'VIEW'); return f; },
    watermarkFoto_: (_id, outFolder, info, name) => {
      engineCalls++; assert.equal(outFolder, folder.id);
      assert.match(info.idempotencyKey, /^yandal:/);
      if (options.engineFails) throw Error('provider token should not leak');
      const f = addFile(name, options.silentAclFailure ? 'ANYONE_WITH_LINK' : 'PRIVATE',
        options.wrongOutputFolder ? otherFolder : folder);
      if (options.sourceChanges) row[slots[0].src] = 'row-folder/replaced.jpg';
      return options.invalidEngine ? 'https://evil.example/?id=' + f.id : 'https://drive.google.com/thumbnail?id=' + f.id;
    }
  });
  function original(kode, target) {
    assert.equal(kode, code);
    const lock = ctx.LockService.getScriptLock();
    try { lock.waitLock(); } catch (_) {}
    try {
      if (options.swallowBeforePhoto) throw Error('preprocessing failed');
      for (const slot of slots) if (!target || slot.key === target) {
        ctx._wmFotoY_({ ...sh }, 2, slot.src, slot.wm, slot.url, { ulp: 'ULP Toboali' }, folder, row[49]);
      }
    } catch (_) { /* Model the real legacy catch/log behavior. */ }
    finally { lock.releaseLock(); }
  }
  ctx.prosesP0Yandal = original;
  ctx.prosesSwitchingYandal = original;
  ctx._wmFotoY_ = () => { throw Error('UNSAFE LEGACY HELPER WAS CALLED'); };
  function install() { vm.runInContext(boundary, ctx, { timeout: 1000 }); }
  install();
  const invoke = (target = options.all ? '' : slots[0].key) =>
    ctx[switching ? 'prosesSwitchingYandal' : 'prosesP0Yandal'](code, target);
  function existing(slot = slots[0], access = 'ANYONE_WITH_LINK') {
    const sourceName = row[slot.src].split('/').pop();
    const f = addFile('WM_' + sourceName + '.jpg', access);
    row[slot.wm] = 'row-folder/' + f.name;
    row[slot.url] = 'https://drive.usercontent.google.com/download?id=' + f.id + '&export=download';
    return f;
  }
  return { ctx, row, rows, cols, slots, sh, code, invoke, folder, files, events, addFile, existing,
    options, install, get engineCalls() { return engineCalls; } };
}
for (const switching of [false, true]) {
  const label = switching ? 'Switching' : 'P0';
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
  test('boundary: ' + label + ' unchanged old public output is revoked rather than skipped', () => {
    const f = fixture(switching); const old = f.existing(); f.invoke();
    assert.equal(old.access, 'PRIVATE'); assert.equal(f.engineCalls, 0);
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
function legacyFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, 'missing actual function ' + name);
  const end = source.indexOf('\n}', start);
  assert.ok(end > start, 'missing closing body ' + name);
  return source.slice(start, end + 2);
}
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
    f.ctx.drainAntreanP0(); assert.equal(queue.length, 2);
    assert.equal(queue[1][1], 'pending'); assert.equal(queue[1][6], 1);
    queue[1][6] = 4; f.ctx.drainAntreanP0();
    assert.equal(queue[1][1], 'failed'); assert.equal(queue[1][6], 5);
    f.options.aclFails = false; queue[1][1] = 'pending';
    f.ctx.drainAntreanP0(); assert.equal(queue.length, 1, 'delete queue row only after success');
    assert.equal(f.engineCalls, 1, 'retry keeps the same output');
  });
}
