'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const repoRoot = path.join(__dirname, '..');
const overlayPath = path.join(repoRoot, 'SiSi_BackEnd', 'Core', 'ZZZZZZZZZZZZZZZZZZZZZZZZ-Mobile-Reports-Route.js');
const source = fs.readFileSync(overlayPath, 'utf8');
const yandalRepositoryPath = path.join(repoRoot, 'SiSi_Mobile', 'lib', 'db', 'repositories', 'yandal_local_repository.dart');
const yandalRepositorySource = fs.readFileSync(yandalRepositoryPath, 'utf8');
const claspPath = path.join(repoRoot, 'SiSi_BackEnd', '.clasp.json');
const loaderPath = path.join(__dirname, 'harness', 'loader.js');

const COL_ROW_RLZ = { kodeHeader: 1, kodePekerjaan: 2, tim: 5, tanggal: 4, penyulang: 6, section: 7, rabas: 8, sedang: 9, besar: 10 };
const COL_ROW = { kodeHeader: 1, kodePekerjaan: 2, kodeEksekusi: 3, ulp: 4, tanggal: 6, tim: 7, penyulang: 8, section: 9, nomorTiang: 10, fotoSebelumUrl: 18, fotoPekerjaanUrl: 20, fotoSesudahUrl: 22, diameter: 23, jenisPekerjaan: 24 };

function fakeSheet(rows, width) {
  return {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => width,
    getRange(row, col, height, cols) {
      return { getValues: () => rows.slice(row - 2, row - 2 + height).map(r => r.slice(col - 1, col - 1 + cols)) };
    },
  };
}

function harness(options = {}) {
  const calls = [];
  const sheets = options.sheets || {};
  const spreadsheetSheets = options.spreadsheetSheets || [];
  const context = {
    console,
    SPREADSHEET_ID: 'active',
    COL_ROW,
    COL_ROW_RLZ,
    COL_ROW_N: 30,
    COL_ROW_RLZ_N: 13,
    _normTgl(value) {
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      return String(value || '').slice(0, 10);
    },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: name => sheets[name] || null,
        getSheets: () => spreadsheetSheets,
      }),
    },
    Logger: { log() {} },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(body) { return { body, setMimeType(type) { this.mimeType = type; return this; } }; },
    },
    getMobileLaporanHarian(...args) {
      calls.push({ type: 'row', args });
      return options.rowResponse || { success: true, data: [] };
    },
    getMobileLaporanUp3Uiw(params) {
      calls.push({ type: 'up3', params });
      return params.token === 'valid-session' ? { ok: true, tanggal: params.tanggal } : { ok: false, message: 'Sesi habis' };
    },
    simpanMobileLaporanC4A(params) {
      calls.push({ type: 'save', params });
      return params.token === 'valid-session' ? { ok: true } : { ok: false, message: 'Sesi habis' };
    },
    _deltaRows_(guard, token, name) {
      calls.push({ type: 'delta', guard, token, name });
      return [{ legacy: true }];
    },
  };
  context.apiRouter_ = function (e, body) {
    const p = (e && e.parameter) || {};
    const action = (body && body.action) || p.action || '';
    if (action === 'getMobileLaporanUp3Uiw') return context.getMobileLaporanUp3Uiw(p);
    if (action === 'simpanMobileLaporanC4A') return context.simpanMobileLaporanC4A(p);
    if (action === 'getMobileLaporanHarian') return context.getMobileLaporanHarian(p.token, p.subTim, p.tim, p.tanggal, p.limit);
    return { delegated: true, e, body };
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: overlayPath });
  return { context, calls };
}

function responseValue(value) { return JSON.parse(JSON.stringify(value)); }

const makeExecution = (values = {}) => {
  const row = new Array(30).fill('');
  for (const [key, value] of Object.entries(values)) row[COL_ROW[key]] = value;
  return row;
};
const makeRealization = (values = {}) => {
  const row = new Array(13).fill('');
  for (const [key, value] of Object.entries(values)) row[COL_ROW_RLZ[key]] = value;
  return row;
};

test('JSON body token and fields reach guarded UP3/UIW handlers', () => {
  const h = harness();
  const response = h.context.apiRouter_({ parameter: { mobile: '1' } }, {
    action: 'getMobileLaporanUp3Uiw', token: 'valid-session', tanggal: '2026-09-30',
  });
  assert.deepEqual(responseValue(response), { ok: true, tanggal: '2026-09-30' });
  assert.deepEqual(responseValue(h.calls[0]), {
    type: 'up3', params: { mobile: '1', action: 'getMobileLaporanUp3Uiw', token: 'valid-session', tanggal: '2026-09-30' },
  });
});

test('JSON body token reaches C4A save, missing token remains rejected, and query fallback still works', () => {
  const h = harness();
  assert.deepEqual(responseValue(h.context.apiRouter_({ parameter: { mobile: '1' } }, {
    action: 'simpanMobileLaporanC4A', token: 'valid-session', penyulang: 'P1',
  })), { ok: true });
  assert.deepEqual(responseValue(h.context.apiRouter_({ parameter: { mobile: '1' } }, {
    action: 'simpanMobileLaporanC4A', penyulang: 'P1',
  })), { ok: false, message: 'Sesi habis' });
  assert.deepEqual(responseValue(h.context.apiRouter_({ parameter: { mobile: '1', token: 'valid-session', tanggal: '2026-09-30' } }, {
    action: 'getMobileLaporanUp3Uiw',
  })), { ok: true, tanggal: '2026-09-30' });
});

test('ROW report uses visible realisasi rows as parents and attaches only matching executions', () => {
  const header = { kodeHeader: 'H1', ulp: 'Toboali', subTim: 'ROW 01', tim: 'ROW', tanggal: '2026-09-30' };
  const parent = makeRealization({ kodeHeader: 'H1', kodePekerjaan: 'P1', penyulang: 'FEEDER A', section: 'S1', rabas: 1, sedang: 0, besar: 0 });
  const linked = makeExecution({ kodeHeader: 'H1', kodePekerjaan: 'P1', kodeEksekusi: 'E1', ulp: 'Toboali', tim: 'ROW 01', tanggal: '2026-09-30', penyulang: 'FEEDER A', section: 'S1', nomorTiang: '12', diameter: 24, jenisPekerjaan: 'Tebang Sedang', fotoSebelumUrl: 'private-1', fotoPekerjaanUrl: 'private-2', fotoSesudahUrl: 'private-3', inputOleh: 'must-not-return' });
  const orphan = makeExecution({ kodeHeader: 'H1', kodePekerjaan: '', kodeEksekusi: 'E2', ulp: 'Toboali', tim: 'ROW 01', tanggal: '2026-09-30', penyulang: 'FEEDER B', section: 'S2', nomorTiang: '13', jenisPekerjaan: 'Rabas / Pangkas', fotoSebelumUrl: 'a', fotoPekerjaanUrl: 'b', fotoSesudahUrl: 'c' });
  const foreign = makeExecution({ kodeHeader: 'H1', kodePekerjaan: 'P1', kodeEksekusi: 'E3', ulp: 'ULP LAIN', tim: 'ROW 01', tanggal: '2026-09-30', penyulang: 'FEEDER A', section: 'S1', nomorTiang: '99', jenisPekerjaan: 'Tebang Besar' });
  const hiddenHeaderChild = makeExecution({ kodeHeader: 'HIDDEN', kodePekerjaan: 'PX', kodeEksekusi: 'E4', ulp: 'ULP LAIN', tim: 'ROW 99', tanggal: '2026-09-30', penyulang: 'SECRET', nomorTiang: '1' });
  const h = harness({
    rowResponse: { success: true, data: [header] },
    sheets: {
      db_ROW_Realisasi: fakeSheet([parent], 13),
      db_ROW_Eksekusi: fakeSheet([linked, orphan, foreign, hiddenHeaderChild], 30),
    },
  });
  const result = responseValue(h.context.getMobileLaporanHarian('t', 'ROW 01', '', '2026-09-30', 100));
  const detail = result.data[0].realisasi;
  assert.equal(detail.length, 1);
  assert.deepEqual(detail[0], {
    kodePekerjaan: 'P1', penyulang: 'FEEDER A', section: 'S1', rabas: 1, sedang: 0, besar: 0,
    eksekusi: [{ kodeEksekusi: 'E1', jenisPekerjaan: 'Tebang Sedang', nomorTiang: '12', diameter: 24 }],
  });
  assert.equal(JSON.stringify(result).includes('private-1'), false);
  assert.equal(JSON.stringify(result).includes('must-not-return'), false);
  assert.equal(JSON.stringify(result).includes('HIDDEN'), false);
});

test('ROW execution without its linked realisasi parent is not synthesized into a display row', () => {
  const one = { kodeHeader: 'H1', ulp: 'Toboali', subTim: 'ROW 01', tanggal: '2026-09-30' };
  const unlinked = makeExecution({ kodePekerjaan: 'P1', kodeEksekusi: 'E1', ulp: 'Toboali', tim: 'ROW 01', tanggal: '2026-09-30', penyulang: 'F1' });
  const h = harness({
    rowResponse: { success: true, data: [one] },
    sheets: {
      db_ROW_Eksekusi: fakeSheet([unlinked], 30),
      db_ROW_Realisasi: fakeSheet([], 13),
    },
  });
  const result = h.context.getMobileLaporanHarian('t', '', '', '', 10).data[0].realisasi;
  assert.deepEqual(responseValue(result), []);
});

test('Yandal roster sync preserves ULP and Sub-Tim and excludes foreign ULP rows', () => {
  const rows = [
    ['ULP', 'Sub-Tim', 'Nama Petugas'],
    ['Toboali', 'Yandal 01', 'Ani, Budi'],
    ['Toboali', 'Yandal 02', 'Cici'],
    ['ULP Lain', 'Yandal 01', 'Dodi'],
  ];
  const sheet = {
    getName: () => 'db_List_Petugas_Yandal',
    getLastRow: () => rows.length,
    getLastColumn: () => rows[0].length,
    getRange(row, col, height, width) {
      return { getValues: () => rows.slice(row - 1, row - 1 + height).map(r => r.slice(col - 1, col - 1 + width)) };
    },
  };
  const h = harness({ spreadsheetSheets: [sheet] });
  const result = responseValue(h.context._deltaRows_({ ulp: 'Toboali' }, 'session', 'db_List_Petugas_Yandal', {}));
  assert.deepEqual(result, [
    [1, 'Toboali', 'Yandal 01', 'Ani'],
    [2, 'Toboali', 'Yandal 01', 'Budi'],
    [3, 'Toboali', 'Yandal 02', 'Cici'],
  ]);
  assert.match(yandalRepositorySource, /SesiStore\.muat\(\)/);
  assert.match(yandalRepositorySource, /_text\(row, 1\).*ulp/i);
  assert.match(yandalRepositorySource, /_text\(row, 2\).*subTim/i);
});


test('mobile report adapter is last in clasp and harness load order', async () => {
  const adapter = 'Core/ZZZZZZZZZZZZZZZZZZZZZZZZ-Mobile-Reports-Route.js';
  const clasp = JSON.parse(fs.readFileSync(claspPath, 'utf8'));
  assert.equal(clasp.filePushOrder.at(-1), adapter);
  const { orderFiles } = await import(pathToFileURL(loaderPath).href);
  const ordered = orderFiles(['Core/Code.js', adapter, 'Core/ZZZZZZZZZZZZZZZZZZZZ-Dispatch-Final-Guard.js']);
  assert.equal(ordered.at(-1), adapter);
});
