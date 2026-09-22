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

function buildContext(ulp) {
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
      if (!token) throw new Error('Sesi tidak ditemukan');
      return { token, ulp, sesi: { ulp } };
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
