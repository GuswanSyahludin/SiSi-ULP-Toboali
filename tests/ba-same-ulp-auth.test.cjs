'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'SiSi_BackEnd', 'Core', 'ZZZZZZZZZZ-BA-Same-ULP-Auth.js'),
  'utf8',
);

function buildContext(ulp, options = {}) {
  const calls = [];
  const context = {
    getDataBeritaAcara(filter) { calls.push(['list', filter]); return { ok: true, rows: [] }; },
    unduhFileBa(token, fileId) { calls.push(['download', token, fileId]); return { ok: true }; },
    generatePdfBaPengoperasian(token, idBA) { calls.push(['pdfGardu', token, idBA]); return { ok: true }; },
    generatePdfBaSwitching(token, idBA) { calls.push(['pdfSwitching', token, idBA]); return { ok: true }; },
    updateMasterGarduDariBA(token, idBA) { calls.push(['master', token, idBA]); return { ok: true }; },
    uploadBaFinal(request) { calls.push(['upload', request]); return { ok: true }; },
    guard_(args) {
      const value = args[0];
      const token = value && typeof value === 'object' ? value.token : value;
      if (!token || options.expired) throw new Error('Sesi tidak ditemukan');
      return { token, ulp, sesi: { ulp }, username: options.username ?? 'alice',
        isSuper: options.isSuper === true, kodeUlp: options.kodeUlp };
    },
    audit_() {},
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, calls };
}

test('same-ULP policy allows only ULP Toboali', () => {
  const { context, calls } = buildContext(' ULP   Toboali ');
  context.getDataBeritaAcara({ token: 't' });
  context.unduhFileBa('t', 'file-1');
  context.generatePdfBaPengoperasian('t', 'BA-1');
  context.generatePdfBaSwitching('t', 'BA-2');
  context.updateMasterGarduDariBA('t', 'BA-3');
  context.uploadBaFinal({ token: 't', idBA: 'BA-4' });
  assert.equal(calls.length, 6);
  assert.equal(calls[5][0], 'upload');
  assert.equal(calls[5][1].token, 't');
  assert.equal(calls[5][1].idBA, 'BA-4');
  assert.equal(calls[1][1], 't');
});

test('foreign, blank, and unresolved ULP fail closed before side effects', () => {
  for (const ulp of ['ULP Pangkalpinang', '', undefined]) {
    const { context, calls } = buildContext(ulp);
    assert.throws(() => context.getDataBeritaAcara({ token: 't' }), /ULP Toboali/);
    assert.equal(calls.length, 0);
  }
});

test('BA id wrappers reject missing identifiers before calling underlying functions', () => {
  const { context, calls } = buildContext('ULP Toboali');
  const gardu = context.generatePdfBaPengoperasian('t', '');
  const master = context.updateMasterGarduDariBA('t', '');
  assert.equal(gardu.ok, false);
  assert.equal(gardu.message, 'idBA wajib diisi.');
  assert.equal(master.ok, false);
  assert.equal(master.message, 'idBA wajib diisi.');
  assert.equal(calls.length, 0);
});

// Exercise the three real BA authorization layers together. Google services,
// the session resolver and downstream writers are mocked: this is not live QA.
const core = path.join(__dirname, '..', 'SiSi_BackEnd', 'Core');
const rowSource = fs.readFileSync(path.join(core, 'ZZZZZZZZZZZ-BA-Row-Ownership.js'), 'utf8');
const flowSource = fs.readFileSync(path.join(core, 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ-BA-Web-Create-Flow.js'), 'utf8');
function layers(callerUlp, rowUlp, options = {}) {
  if (arguments.length < 2) rowUlp = 'ULP Toboali';
  const h = buildContext(callerUlp, options);
  const rows = [['idBA', 'ULP', 'File PDF URL'], ['BA-1', rowUlp, 'file-1234567890']];
  const sheet = {
    getDataRange: () => ({ getValues: () => rows }),
    getRange: () => ({ getNote: () => '' }),
  };
  let reads = 0;
  Object.assign(h.context, {
    BA_SOURCE: { spreadsheetId: 'ba', sheetName: 'Rekap Gardu' },
    SW_SOURCE: { spreadsheetId: 'ba', sheetName: 'Rekap Gardu' },
    SpreadsheetApp: { openById() {
      reads++;
      return { getSheetByName: () => sheet };
    } },
    getPageContent: () => ({ success: false }),
  });
  vm.runInContext(rowSource, h.context);
  vm.runInContext(flowSource, h.context);
  return { ...h, rows, get reads() { return reads; } };
}
function webRow(h) {
  return h.context._baWebRow_({ token: 't' }, {
    kind: 'gardu', result: { idBA: 'BA-1' },
  });
}
const allowed = ['Toboali', 'ULP Toboali', ' toBOali ', ' uLp   TOBOALI ', '\tULP\u00a0Toboali\n'];
for (const caller of allowed) {
  test(`all BA layers accept the verified session alias ${JSON.stringify(caller)}`, () => {
    for (const owner of allowed) {
      const h = layers(caller, owner);
      const g = h.context._baWebSession_([{ token: 't' }]);
      assert.equal(g.ulp, caller, 'do not mutate the trusted session');
      assert.equal(webRow(h).row.values[1], owner, 'do not rewrite historical rows');
      assert.equal(h.context.getDataBeritaAcara({ token: 't' }).ok, true);
      assert.equal(h.context.generatePdfBaPengoperasian('t', 'BA-1').ok, true);
      assert.equal(h.context.generatePdfBaSwitching('t', 'BA-1').ok, true);
      assert.equal(h.context.updateMasterGarduDariBA('t', 'BA-1').ok, true);
      assert.equal(h.context.uploadBaFinal({ token: 't', idBA: 'BA-1' }).ok, true);
      assert.equal(h.context.unduhFileBa('t', 'BA-1', 'file-1234567890').ok, true);
      assert.equal(h.calls.length, 6);
      assert.equal(h.calls[1][1], 't', 'validated token still reaches writer');
    }
  });
}
const rejected = ['', ' ', undefined, null, 'ULP', 'ULP Pangkalpinang',
  'Pangkalpinang', 'ULPToboali', 'ULP-Toboali', 'ULP ULP Toboali',
  'Toboali Selatan', 'ULP Toboali Selatan', 'UP3 Toboali', '16130'];
test('foreign, unresolved and lookalike session ULP never fall back to client ULP, code or Super role', () => {
  for (const ulp of rejected) for (const isSuper of [false, true]) {
    const h = layers(ulp, 'Toboali', { isSuper, kodeUlp: 'Toboali' });
    const request = { token: 't', ulp: 'ULP Toboali', username: 'alice', idBA: 'BA-1' };
    assert.throws(() => h.context.simpanDraftBaWeb(request), /ULP Toboali/);
    assert.throws(() => h.context.uploadFotoDraftBaWeb(request), /ULP Toboali/);
    assert.throws(() => h.context.getDataBeritaAcara(request), /ULP Toboali/);
    assert.throws(() => h.context.generatePdfBaPengoperasian('t', 'BA-1'), /ULP Toboali/);
    assert.equal(h.reads, 0, 'deny before accessing sheets or acquiring a write lock');
    assert.equal(h.calls.length, 0);
  }
});
test('both accepted session aliases still reject foreign, blank and lookalike row ownership', () => {
  for (const caller of ['Toboali', 'ULP Toboali']) for (const owner of rejected) {
    const h = layers(caller, owner, { isSuper: true });
    assert.throws(() => webRow(h), /bukan milik/);
    assert.throws(() => h.context.generatePdfBaPengoperasian('t', 'BA-1'), /bukan milik/);
    assert.throws(() => h.context.uploadBaFinal({ token: 't', idBA: 'BA-1' }), /bukan milik/);
    assert.equal(h.calls.length, 0);
  }
});
test('ULP aliases do not relax missing username, expired session or token checks', () => {
  for (const caller of ['Toboali', 'ULP Toboali']) {
    for (const username of ['', '  ']) {
      const h = layers(caller, caller, { username });
      assert.throws(() => h.context.simpanDraftBaWeb({ token: 't', username: 'spoof' }), /teridentifikasi/);
      assert.equal(h.reads, 0);
    }
    const h = layers(caller, caller, { expired: true });
    assert.throws(() => h.context.simpanDraftBaWeb({ token: 'expired' }), /Sesi/);
    assert.equal(h.reads, 0);
    const valid = layers(caller);
    assert.throws(() => valid.context.uploadFotoDraftBaWeb({ idBA: 'BA-1' }), /Sesi/);
    assert.equal(valid.reads, 0);
  }
});
test('aliases cannot merge distinct usernames or BA identifiers', () => {
  const h = layers('Toboali');
  assert.notEqual(h.context._baWebNorm_('Toboali'), h.context._baWebNorm_('ULP Toboali'));
  h.rows[1][0] = 'Toboali';
  const checked = h.context._stage3RequireBaRow_([{ token: 't' }], 'Toboali');
  assert.equal(checked.row.values[0], 'Toboali');
  assert.throws(() => h.context._stage3RequireBaRow_([{ token: 't' }], 'ULP Toboali'), /tidak ditemukan/);
});
test('row identity, header ambiguity and file binding checks survive ULP aliases', () => {
  const duplicate = layers('Toboali', 'Toboali');
  duplicate.rows.push(['BA-1', 'ULP Toboali', 'file-1234567890']);
  assert.throws(() => webRow(duplicate), /tidak unik/);
  const header = layers('Toboali', 'Toboali');
  header.rows[0].push('Nama ULP'); header.rows[1].push('ULP Toboali');
  assert.throws(() => webRow(header), /ambigu/);
  const missing = layers('Toboali', 'Toboali');
  missing.rows[0][1] = 'unknown';
  assert.throws(() => webRow(missing), /tidak ditemukan/);
  const file = layers('Toboali', 'Toboali');
  assert.equal(file.context.unduhFileBa('t', 'BA-1', 'foreign-file-123456').code, 'FILE_NOT_AUTHORIZED');
  assert.equal(file.calls.length, 0);
});
