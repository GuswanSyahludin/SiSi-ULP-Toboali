'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'SiSi_BackEnd', 'Core', 'ZZZZZZZZZZZ-BA-Row-Ownership.js'),
  'utf8',
);

function build(ulp, rows = [['idBA', 'ULP', 'File PDF URL'], ['BA-1', 'ULP Toboali', 'file-1234567890']]) {
  const calls = [];
  const context = {
    BA_SOURCE: { spreadsheetId: 'ba', sheetName: 'Rekap Gardu' },
    SW_SOURCE: { spreadsheetId: 'ba', sheetName: 'Rekap Gardu' },
    SpreadsheetApp: {
      openById() {
        return {
          getSheetByName() {
            return { getDataRange() { return { getValues() { return rows; } }; } };
          },
        };
      },
    },
    _baFindHeader_(values) { return { row: 0, map: { idba: 0 }, headers: values[0] }; },
    _baPickIndex_() { return 0; },
    guard_(args) {
      const value = args[0] || {};
      const token = typeof value === 'object' ? value.token : value;
      if (!token) throw new Error('Sesi tidak ditemukan');
      return { token, ulp, sesi: { ulp } };
    },
    audit_() {},
    getDataBeritaAcara() { calls.push('list'); return { ok: true }; },
    generatePdfBaPengoperasian(token, idBA) { calls.push(['pdf', token, idBA]); return { ok: true }; },
    generatePdfBaSwitching(token, idBA) { calls.push(['switching', token, idBA]); return { ok: true }; },
    updateMasterGarduDariBA(token, idBA) { calls.push(['master', token, idBA]); return { ok: true }; },
    uploadBaFinal(request) { calls.push(['upload', request]); return { ok: true }; },
    unduhFileBa(token, fileId) { calls.push(['download', token, fileId]); return { ok: true }; },
    _baDownloadAllowedIds_() { return { 'file-1234567890': true }; },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, calls };
}

test('BA row operations require a unique idBA and Toboali ULP row', () => {
  const { context, calls } = build('ULP Toboali');
  assert.equal(context.generatePdfBaPengoperasian('token', 'BA-1').ok, true);
  assert.equal(context.uploadBaFinal({ token: 'token', idBA: 'BA-1' }).ok, true);
  assert.equal(calls.length, 2);
  assert.throws(() => context.generatePdfBaSwitching('token', 'MISSING'), /tidak ditemukan/);
  assert.equal(calls.length, 2);
});

test('download requires idBA and file belongs to that BA row', () => {
  const { context, calls } = build('ULP Toboali');
  assert.equal(context.unduhFileBa('token', 'BA-1', 'file-1234567890').ok, true);
  assert.equal(calls.length, 1);
  assert.equal(context.unduhFileBa('token', 'BA-1', 'file-other-123456').code, 'FILE_NOT_AUTHORIZED');
  assert.equal(calls.length, 1);
});

test('foreign and blank ULP fail closed before BA side effects', () => {
  for (const ulp of ['ULP Pangkalpinang', '', undefined]) {
    const { context, calls } = build(ulp);
    assert.throws(() => context.updateMasterGarduDariBA('token', 'BA-1'), /ULP Toboali/);
    assert.equal(calls.length, 0);
  }
});

test('BA row with foreign ownership fails closed', () => {
  const { context, calls } = build('ULP Toboali', [['idBA', 'ULP'], ['BA-1', 'ULP Pangkalpinang']]);
  assert.throws(() => context.generatePdfBaSwitching('token', 'BA-1'), /bukan milik/);
  assert.equal(calls.length, 0);
});

test('duplicate idBA fails closed', () => {
  const { context, calls } = build('ULP Toboali', [['idBA', 'ULP'], ['BA-1', 'ULP Toboali'], ['BA-1', 'ULP Toboali']]);
  assert.throws(() => context.generatePdfBaPengoperasian('token', 'BA-1'), /tidak unik/);
  assert.equal(calls.length, 0);
});
