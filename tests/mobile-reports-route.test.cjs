'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { guardSource, aliases } = require('./t13-ulp-closed.test.cjs');
const root = path.join(__dirname, '..');
const routePath = path.join(root, 'SiSi_BackEnd/Core/ZZZZZZZZZZZZZZZZZZZZZZZZ-Mobile-Reports-Route.js');
const COL_ROW_RLZ = { kodeHeader: 1, kodePekerjaan: 2, penyulang: 6 };
const COL_ROW = { kodeHeader: 1, kodePekerjaan: 2, kodeEksekusi: 3, ulp: 4, nomorTiang: 10, diameter: 23, jenisPekerjaan: 24 };
function row(width, values, columns) { const out = Array(width).fill(''); for (const [key, value] of Object.entries(values)) out[columns[key]] = value; return out; }
function sheet(rows) { return { getLastRow: () => rows.length + 1, getRange: () => ({ getValues: () => rows }) }; }
function harness({ headers = [], storedHeaders = headers, realizations = [], executions = [], rowResponse } = {}) {
  const calls = []; let ctx;
  ctx = {
    SPREADSHEET_ID: 'active', COL_ROW, COL_ROW_RLZ, COL_ROW_N: 30, COL_ROW_RLZ_N: 13,
    SpreadsheetApp: { openById: () => ({ getSheetByName: name => ({
      db_Global_Header: sheet(storedHeaders.map(h => row(3, h, { kodeHeader: 1, ulp: 2 }))),
      db_ROW_Realisasi: sheet(realizations), db_ROW_Eksekusi: sheet(executions),
    })[name] || null }) },
    getMobileLaporanHarian() { return rowResponse || { success: true, data: headers }; },
    getMobileLaporanUp3Uiw(p) { calls.push(p); return p.token === 'body-session' ? { success: true, tanggal: p.tanggal } : { success: false }; },
    simpanMobileLaporanC4A(p) { calls.push(p); return p.token === 'body-session' ? { success: true } : { success: false }; },
    apiRouter_(e, body) {
      const merged = { ...e.parameter, ...(body || {}) };
      if (merged.action === 'getMobileLaporanUp3Uiw') return ctx.getMobileLaporanUp3Uiw(merged);
      if (merged.action === 'simpanMobileLaporanC4A') return ctx.simpanMobileLaporanC4A(merged);
      calls.push({ event: e, body }); return null;
    },
    Logger: { log() {} },
  };
  vm.createContext(ctx); vm.runInContext(guardSource, ctx);
  vm.runInContext(fs.readFileSync(routePath, 'utf8'), ctx); return { ctx, calls };
}
const realization = values => row(13, values, COL_ROW_RLZ);
const execution = values => row(30, values, COL_ROW);
const json = value => JSON.parse(JSON.stringify(value));

test('session tokens are body-only on report and general mobile routes', () => {
  const h = harness();
  const save = h.ctx.apiRouter_({ parameter: { mobile: '1', token: 'url-session', tanggal: '2026-09-30' } }, { action: 'simpanMobileLaporanC4A' });
  assert.deepEqual(json(save), { success: false }); assert.equal(Object.hasOwn(h.calls[0], 'token'), false); assert.equal(h.calls[0].tanggal, '2026-09-30');
  const read = h.ctx.apiRouter_({ parameter: { mobile: '1', deviceToken: 'url-session', tanggal: '2026-09-30' } }, { action: 'getMobileLaporanUp3Uiw', token: 'body-session' });
  assert.deepEqual(json(read), { success: true, tanggal: '2026-09-30' }); assert.equal(h.calls[1].token, 'body-session'); assert.equal(Object.hasOwn(h.calls[1], 'deviceToken'), false);
  h.ctx.apiRouter_({ parameter: { mobile: '1', token: 'url-session', action: 'getMobileLaporanHarian' } }, null);
  assert.equal(Object.hasOwn(h.calls[2].event.parameter, 'token'), false);
});

test('ROW details require uniquely owned headers, unique parents, and matching nonblank execution ULP', () => {
  const headers = [{ kodeHeader: 'H1', ulp: 'Toboali' }, { kodeHeader: 'H-blank', ulp: '' }, { kodeHeader: 'H-dup', ulp: 'Toboali' }, { kodeHeader: 'H-dup', ulp: 'ULP Lain' }];
  const realizations = [realization({ kodeHeader: 'H1', kodePekerjaan: 'P1', penyulang: 'FEEDER' }), realization({ kodeHeader: 'H-blank', kodePekerjaan: 'PB', penyulang: 'SECRET' }), realization({ kodeHeader: 'H-dup', kodePekerjaan: 'PD', penyulang: 'SECRET' }), realization({ kodeHeader: 'H1', kodePekerjaan: 'P2', penyulang: 'DUP-A' }), realization({ kodeHeader: 'H1', kodePekerjaan: 'P2', penyulang: 'DUP-B' })];
  const executions = [execution({ kodeHeader: 'H1', kodePekerjaan: 'P1', kodeEksekusi: 'GOOD', ulp: 'tObOaLi', nomorTiang: '12' }), execution({ kodeHeader: 'H1', kodePekerjaan: 'P1', kodeEksekusi: 'BLANK', ulp: '' }), execution({ kodeHeader: 'H1', kodePekerjaan: 'P1', kodeEksekusi: 'FOREIGN', ulp: 'ULP Lain' }), execution({ kodeHeader: 'H-blank', kodePekerjaan: 'PB', kodeEksekusi: 'HIDDEN', ulp: 'Toboali' }), execution({ kodeHeader: 'H-dup', kodePekerjaan: 'PD', kodeEksekusi: 'AMBIGUOUS', ulp: 'Toboali' }), execution({ kodeHeader: 'H1', kodePekerjaan: 'P2', kodeEksekusi: 'DUPLICATE-PARENT', ulp: 'Toboali' })];
  const h = harness({ headers, realizations, executions }); const result = h.ctx.getMobileLaporanHarian('session');
  assert.deepEqual(json(result.data[0].realisasi.map(r => r.kodePekerjaan)), ['P1']); assert.deepEqual(json(result.data[0].realisasi[0].eksekusi.map(e => e.kodeEksekusi)), ['GOOD']);
  assert.deepEqual(json(result.data.slice(1).map(r => r.realisasi)), [[], [], []]); assert.doesNotMatch(JSON.stringify(result), /SECRET|FOREIGN|BLANK|HIDDEN|AMBIGUOUS|DUPLICATE-PARENT|fotoSebelumUrl/);
});

test('ROW details fail closed when the backing header key is duplicated across ULPs', () => {
  const h = harness({ headers: [{ kodeHeader: 'H1', ulp: 'Toboali' }], storedHeaders: [{ kodeHeader: 'H1', ulp: 'Toboali' }, { kodeHeader: 'H1', ulp: 'ULP Lain' }], realizations: [realization({ kodeHeader: 'H1', kodePekerjaan: 'P1' })], executions: [execution({ kodeHeader: 'H1', kodePekerjaan: 'P1', kodeEksekusi: 'E1', ulp: 'Toboali' })] });
  assert.deepEqual(json(h.ctx.getMobileLaporanHarian('session').data[0].realisasi), []);
});

test('ROW enrichment preserves failed authorization result without reading sheet data', () => {
  const denied = { success: false, message: 'Sesi habis' }; const h = harness({ rowResponse: denied });
  h.ctx.SpreadsheetApp.openById = () => assert.fail('unauthorized response must not read Sheets'); assert.strictEqual(h.ctx.getMobileLaporanHarian('expired'), denied);
});

test('ROW enrichment matches mixed owner aliases without changing returned labels or IDs', () => {
  for (const ulp of aliases) {
    const headers=[{kodeHeader:'H1',ulp}];
    const h=harness({headers,storedHeaders:[{kodeHeader:'H1',ulp:'ULP Toboali'}],
      realizations:[realization({kodeHeader:'H1',kodePekerjaan:'P1'})],
      executions:[execution({kodeHeader:'H1',kodePekerjaan:'P1',kodeEksekusi:'E1',ulp:'Toboali'})]});
    const result=h.ctx.getMobileLaporanHarian('valid');
    assert.equal(result.data[0].ulp,ulp);
    assert.equal(result.data[0].realisasi[0].eksekusi[0].kodeEksekusi,'E1');
    assert.equal(headers[0].ulp,ulp);
  }
});

test('Yandal roster scope accepts alias while preserving names and stored labels', () => {
  const c=vm.createContext({SPREADSHEET_ID:'fixture',
    apiRouter_:()=>null,getMobileLaporanHarian:()=>({success:false}),
    _deltaRows_:()=>assert.fail('unexpected legacy roster')});
  vm.runInContext(guardSource,c);
  vm.runInContext(fs.readFileSync(routePath,'utf8'),c);
  const rows=[[' ULP   Toboali ','Tim A','Original Name'],['ULP Lain','Tim A','Secret'],['','Tim A','Unknown']];
  c.SpreadsheetApp={openById:()=>({getSheets:()=>[{
    getName:()=> 'db_List_Petugas_Yandal',getLastRow:()=>rows.length+1,getLastColumn:()=>3,
    getRange:r=>({getValues:()=>r===1?[['ULP','Sub-Tim','Nama Petugas']]:rows}),
  }]})};
  const result=c._deltaRows_({ulp:'Toboali'},'session','db_List_Petugas_Yandal',{});
  assert.equal(result.length,1);
  assert.equal(result[0][1],'ULP   Toboali');
  assert.equal(result[0][3],'Original Name');
  assert.equal(rows[0][0],' ULP   Toboali ');
});
