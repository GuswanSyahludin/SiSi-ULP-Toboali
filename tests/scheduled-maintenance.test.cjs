'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const backend = path.join(__dirname, '../SiSi_BackEnd');
const read = file => fs.readFileSync(path.join(backend, file), 'utf8');
const jobs = ['refreshLaporanHarianHariIni', 'sweepDurasiJarakYandalP0', 'validasiUlangFotoTemuan'];
const rowJob = '_t11PerbaikanKodeROW_';
function rowFixture(options = {}) {
  const f = fixture(), events = [], reportDirty = [], ctx = f.context;
  let clock = Date.parse(options.now || '2026-10-01T12:00:00Z');
  ctx.Date = class extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  };
  ctx.Utilities = {
    formatDate(value, zone, pattern) {
      assert.equal(zone, 'Asia/Jakarta');
      assert.equal(pattern, 'yyyy-MM-dd');
      return new Date(value.getTime() + 7*3600000).toISOString().slice(0, 10);
    }
  };
  let locked = false;
  ctx.LockService.getScriptLock = () => ({
    waitLock() { if (options.lockFails) throw Error('lock secret'); locked = true; },
    hasLock: () => locked, releaseLock() { locked = false; }
  });
  const sheets = {};
  function sheet(name, rows) {
    const sh = {
      rows, getLastRow: () => rows.length,
      getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
      getRange(r, c, nr = 1, nc = 1) {
        return {
          getValues() {
            if (options.beforeRowRead) options.beforeRowRead(name, rows, r, nc);
            return rows.slice(r - 1, r - 1 + nr).map(row => row.slice(c - 1, c - 1 + nc));
          },
          setValue(value) {
            assert.ok(locked, 'every mutation must own script lock');
            if (options.writeFails) throw Error('sensitive Sheet error');
            events.push(['write', name, r, c, value]); rows[r - 1][c - 1] = value;
          }
        };
      }
    };
    sheets[name] = sh;
    return sh;
  }
  ctx.COL_INS.HEADER = { kodeHeader: 1, ulp: 2, tanggal: 4, tim: 5, subTim: 6 };
  ctx.SHEET_INS.HEADER = 'header';
  ctx.COL_ROW = { kodeHeader: 1, kodePekerjaan: 2, kodeEksekusi: 3, ulp: 4, tanggal: 6, tim: 7 };
  ctx.COL_ROW_RLZ = { kodeHeader: 1, kodePekerjaan: 2, tanggal: 4 };
  const header = sheet('header', [Array(16).fill('header'),
    ['', 'R01-ABC', ' Toboali ', '', '', 'ROW', 'ROW 02', '', '', '', '', '', '', '', '', '']]);
  const realisation = sheet('db_ROW_Realisasi', [Array(13).fill('header'),
    ['', 'R01-ABC', 'R01-ABC-PNY.007', '', '', '', '', '', '', '', '', '', '']]);
  const execution = sheet('db_ROW_Eksekusi', [Array(30).fill('header'),
    ['', 'R01-ABC', 'R01-ABC-PNY.007', 'R01-ABC-PNY.007-EKS.009', 'ULP Toboali', '', '', 'ROW 02',
      '', '', '', '', '', '', '', '', '', 'keep-photo', 'keep-url', '', '', '', '', '', '', '', '', '', '', '']]);
  const today = options.day || '2026-10-01';
  header.rows[1][4] = today;
  realisation.rows[1][4] = today;
  execution.rows[1][6] = today;
  const ss = { getSheetByName: name => sheets[name] };
  ctx.SpreadsheetApp.openById = () => ss;
  ctx.markWaDirty_ = key => {
    assert.ok(locked); events.push(['dirty', key]);
    if (options.markReleasesLock) locked = false;
    return !options.queueFails;
  };
  ctx.markLaporanDirty_ = day => {
    if (options.reportQueueFails) throw Error('fixture queue failure');
    reportDirty.push(day);
    if (options.crossMidnight) clock = Date.parse('2026-10-01T17:00:01Z');
    if (options.afterReportMark) options.afterReportMark({header,realisation,execution});
    return day;
  };
  ctx.markRecalcRowDirty_ = () => true;
  ctx.enqueueFotoRow_ = () => true;
  ctx.originalrefreshLaporanHarianROW = () => { assert.ok(locked); events.push(['refresh']); };
  ctx.prosesEksekusiROW = key => {
    assert.ok(locked); events.push(['raw', key]);
    if (options.rawChangesUlp) execution.rows[1][4] = 'ULP Lain';
    if (!options.rawFails) execution.rows.find(row => row[3] === key)[3] = 'R02-ABC-PNY.007-EKS.010';
    locked = false; // Real legacy processor releases the script lock.
    return { ok: !options.rawFails, message: 'secret must not escape' };
  };
  const source = read('ROW/Tek-ROW-Code.js');
  for (const name of ['_adaPekerjaanPerbaikanROW_', '_isTimROW_']) {
    const start = source.indexOf('function ' + name + '('), end = source.indexOf('\n}', start);
    assert.ok(start >= 0 && end > start);
    vm.runInContext(source.slice(start, end + 2), ctx);
  }
  ctx.TRIGGER_SISI_TUGAS = [{ fn: rowJob, tiapMenit: 1, berat: true }];
  return { ...f, ctx, header, realisation, execution, events, reportDirty, options,
    setClock(value) { clock = Date.parse(value); },
    get locked() { return locked; } };
}
test('ROW source removes exactly the three legacy callable functions', () => {
  const row = read('ROW/Tek-ROW-Code.js');
  for (const name of ['perbaikanMassalKodeROW', 'jalankanPerbaikanMassalKodeROWMenit', 'setupTriggerPerbaikanMassalMenit']) {
    assert.doesNotMatch(row, new RegExp('function\\s+' + name + '\\s*\\('));
    assert.ok(!read('Core/ZZZZ-P0-Remaining-Guards.js').includes('"' + name + '"'));
  }
  assert.ok(!read('Core/Trigger-Manager.js').includes('"jalankanPerbaikanMassalKodeROWMenit"'));
  const source = read('Core/Trigger-Manager.js');
  assert.ok(source.indexOf('fn: "drainAntreanP0"') < source.indexOf('fn: "' + rowJob + '"'));
});
test('ROW requires private capability; request flags and HTTP actions cannot forge it', () => {
  const f = rowFixture();
  assert.throws(() => f.ctx[rowJob]({ scheduled: true, internal: true, token: 'valid' }), /CONTEXT_REQUIRED/);
  assert.throws(() => f.ctx._triggerSisiHandler_(rowJob)(), /CONTEXT_REQUIRED/);
  assert.throws(() => f.ctx.apiRouter_({ parameter: { action: rowJob } }, {}), /PRIVATE_ACTION_DENIED/);
  assert.throws(() => f.ctx.doPost({ postData: { contents: JSON.stringify({ action: rowJob }) } }), /PRIVATE_ACTION_DENIED/);
  assert.equal(f.events.length, 0);
});
test('ROW cascade preserves suffixes, photo identities, and is idempotent', () => {
  const f = rowFixture();
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length, 0);
  assert.equal(f.header.rows[1][1], 'R02-ABC');
  assert.equal(f.realisation.rows[1][2], 'R02-ABC-PNY.007');
  assert.equal(f.execution.rows[1][3], 'R02-ABC-PNY.007-EKS.009');
  assert.deepEqual(f.execution.rows[1].slice(17, 19), ['keep-photo', 'keep-url']);
  assert.deepEqual(f.events.filter(x => x[0] === 'dirty'), [['dirty', 'R02-ABC']]);
  assert.equal(f.events.filter(x => x[0] === 'refresh').length, 0);
  assert.deepEqual(f.reportDirty, ['2026-10-01']);
  f.props.clear(); f.events.length = 0;
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length, 0);
  assert.equal(f.events.length, 0);
  assert.equal(f.locked, false);
  assert.throws(() => f.ctx[rowJob](), /CONTEXT_REQUIRED/);
});
for (const scenario of ['foreignHeader', 'foreignExecution', 'blankUlp', 'orphan', 'duplicateHeader', 'duplicateExecution', 'badSchema', 'lockFails']) {
  test('ROW fail closed before writes: ' + scenario, () => {
    const f = rowFixture({ lockFails: scenario === 'lockFails' });
    if (scenario === 'foreignHeader') f.header.rows[1][2] = 'ULP Lain';
    if (scenario === 'foreignExecution') f.execution.rows[1][4] = 'ULP Lain';
    if (scenario === 'blankUlp') f.execution.rows[1][4] = '';
    if (scenario === 'orphan') f.realisation.rows[1][1] = 'missing';
    if (scenario === 'duplicateHeader') f.header.rows.push(f.header.rows[1].slice());
    if (scenario === 'duplicateExecution') f.execution.rows.push(f.execution.rows[1].slice());
    if (scenario === 'badSchema') f.ctx.COL_ROW.ulp = undefined;
    const result = f.ctx._t11TickPusatSiSi_();
    assert.equal(result.gagal.length, 1);
    assert.equal(f.events.length, 0);
    assert.ok(!JSON.stringify(result).includes('secret'));
    assert.equal(JSON.parse(f.props.get('TRIGGER_SISI_LAST_RUN_V2'))[rowJob], undefined);
    assert.equal(f.locked, false);
  });
}
test('ROW target collision does not overwrite either chain', () => {
  const f = rowFixture();
  const second = f.header.rows[1].slice(); second[1] = 'R02-ABC';
  f.header.rows.push(second);
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length, 0);
  assert.equal(f.events.length, 0);
  assert.equal(f.execution.rows[1][3], 'R01-ABC-PNY.007-EKS.009');
});
test('ROW raw processing reacquires lock and failures do not stamp success', () => {
  for (const options of [{}, { rawFails: true }, { rawChangesUlp: true }]) {
    const f = rowFixture(options); f.execution.rows[1][3] = 'raw-key';
    const result = f.ctx._t11TickPusatSiSi_();
    assert.equal(f.events.filter(x => x[0] === 'raw').length, 1);
    assert.equal(result.gagal.length, options.rawFails || options.rawChangesUlp ? 1 : 0);
    if (result.gagal.length) {
      assert.equal(JSON.parse(f.props.get('TRIGGER_SISI_LAST_RUN_V2'))[rowJob], undefined);
      assert.ok(!JSON.stringify(result).includes('secret'));
      assert.ok(!f.events.some(x => x[0] === 'refresh'));
    }
    assert.equal(f.locked, false);
  }
});
test('ROW detects row mutation immediately before cascade write', () => {
  const f = rowFixture({ beforeRowRead(name, rows, rowNumber, width) {
    if (name === 'header' && width === 16) rows[1][2] = 'ULP Lain';
  } });
  const result = f.ctx._t11TickPusatSiSi_();
  assert.equal(result.gagal.length, 1); assert.match(result.gagal[0].error, /ROW_CHANGED/);
  assert.equal(f.events.length, 0);
});
test('ROW follows WM synchronously in the same scheduler tick', () => {
  const f = rowFixture(), order = [];
  // Resolver returns functions synchronously; no independent timer is created.
  f.ctx.wmOrderProbe = () => { order.push('wm-start', 'wm-end'); };
  const mark = f.ctx.markWaDirty_;
  f.ctx.markWaDirty_ = key => { order.push('row'); mark(key); };
  f.ctx.TRIGGER_SISI_TUGAS.unshift({ fn: 'wmOrderProbe', tiapMenit: 5 });
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length, 0);
  assert.deepEqual(order, ['wm-start','wm-end','row']);
});
test('ROW missing dependency and Sheet errors fail closed without leaking details', () => {
  for (const kind of ['missing', 'write']) {
    const f = rowFixture({ writeFails: kind === 'write' });
    if (kind === 'missing') f.ctx.markWaDirty_ = undefined;
    const result = f.ctx._t11TickPusatSiSi_();
    assert.equal(result.gagal.length, 1);
    assert.match(result.gagal[0].error, /T11_ROW_MAINTENANCE_FAILED/);
    assert.equal(f.events.length, 0);
    assert.equal(f.locked, false);
  }
});
test('ROW actual raw processor executes inside private tick and retains photo fields', () => {
  const f = rowFixture(), ctx = f.ctx;
  f.execution.rows[1][3] = 'raw-key';
  f.execution.rows[1][6] = '2026-10-01';
  f.execution.rows[1][8] = 'Penyulang';
  Object.assign(ctx.COL_ROW, { tanggal: 6, penyulang: 8, inputOleh: 28 });
  ctx.COL_ROW_N = 30;
  ctx._normTanggal = x => String(x);
  ctx._ensureRealisasiInduk = () => {
    assert.ok(f.locked);
    return { kodeHeader: 'R02-ABC', kodePekerjaan: 'R02-ABC-PNY.007', dibuat: false };
  };
  ctx._generateKodeEksekusiRow = () => {
    assert.ok(f.locked);
    return 'R02-ABC-PNY.007-EKS.010';
  };
  ctx.markRecalcRowDirty_ = () => true;
  ctx.enqueueFotoRow_ = key => f.events.push(['photo-queued', key]);
  // Legacy process releases its lock before queuing WA.
  ctx.markWaDirty_ = key => f.events.push(['dirty', key]);
  const source = read('ROW/Tek-ROW-Code.js');
  const start = source.indexOf('function prosesEksekusiROW(');
  const end = source.indexOf('\n}', start);
  vm.runInContext(source.slice(start, end + 2), ctx);
  assert.equal(ctx._t11TickPusatSiSi_().gagal.length, 0);
  assert.equal(f.execution.rows[1][3], 'R02-ABC-PNY.007-EKS.010');
  assert.deepEqual(f.execution.rows[1].slice(17, 19), ['keep-photo', 'keep-url']);
  assert.ok(f.events.some(x => x[0] === 'photo-queued'));
  assert.equal(f.locked, false);
});
function addDatedChain(f, date, suffix, raw = false) {
  const h=f.header.rows[1].slice(),r=f.realisation.rows[1].slice(),e=f.execution.rows[1].slice();
  h[1]='R01-'+suffix;h[4]=date;
  r[1]=h[1];r[2]=h[1]+'-PNY.007';r[4]=date;
  e[1]=h[1];e[2]=r[2];e[3]=raw?'raw-'+suffix:r[2]+'-EKS.009';e[6]=date;
  f.header.rows.push(h);f.realisation.rows.push(r);f.execution.rows.push(e);
  return {h,r,e};
}
test('ROW changes only invocation date; yesterday, archive and future chains remain byte-identical',()=>{
  const f=rowFixture();
  const others=[addDatedChain(f,'2026-09-30','YESTERDAY',true),
    addDatedChain(f,'2026-09-20','ARCHIVE'),addDatedChain(f,'2026-10-02','FUTURE',true)];
  const before=JSON.stringify(others);
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,0);
  assert.equal(JSON.stringify(others),before);
  assert.equal(f.header.rows[1][1],'R02-ABC');
  assert.equal(f.events.some(e=>e[0]==='raw'),false);
  assert.equal(f.events.some(e=>e[0]==='refresh'),false);
});
test('ROW date is determined in Jakarta, not UTC, and recalculated on a later invocation',()=>{
  const f=rowFixture({now:'2026-09-30T17:01:00Z'});
  const tomorrow=addDatedChain(f,'2026-10-02','TOMORROW');
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,0);
  assert.equal(f.header.rows[1][1],'R02-ABC');
  assert.equal(tomorrow.h[1],'R01-TOMORROW');
  f.setClock('2026-10-01T17:01:00Z');f.props.clear();
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,0);
  assert.equal(tomorrow.h[1],'R02-TOMORROW');
  assert.deepEqual(f.reportDirty,['2026-10-01','2026-10-02']);
});
test('ROW captures target date once even if execution crosses midnight',()=>{
  const f=rowFixture({now:'2026-10-01T16:59:59Z',crossMidnight:true});
  const tomorrow=addDatedChain(f,'2026-10-02','NEXT');
  const before=JSON.stringify(tomorrow);
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,0);
  assert.equal(f.header.rows[1][1],'R02-ABC');
  assert.equal(JSON.stringify(tomorrow),before);
  assert.deepEqual(f.reportDirty,['2026-10-01']);
});
for(const value of ['',null,{},[],7,'bad','2026-02-31','31/02/2026']){
  test('ROW unresolved header date fails closed: '+JSON.stringify(value),()=>{
    const f=rowFixture();f.header.rows[1][4]=value;
    const r=f.ctx._t11TickPusatSiSi_();
    assert.equal(r.gagal.length,1);assert.match(r.gagal[0].error,/DATE_INVALID/);
    assert.equal(f.events.length,0);assert.equal(f.reportDirty.length,0);
  });
}
for(const kind of ['realisationDate','executionDate','missingDate','wrongParent','missingParent']){
  test('ROW cross-date or unresolved relation fails before the entire cascade: '+kind,()=>{
    const f=rowFixture();
    if(kind==='realisationDate')f.realisation.rows[1][4]='2026-09-30';
    if(kind==='executionDate')f.execution.rows[1][6]='2026-09-30';
    if(kind==='missingDate')f.execution.rows[1][6]='';
    if(kind==='wrongParent')f.execution.rows[1][2]='another-PNY.007';
    if(kind==='missingParent')f.execution.rows[1][1]='';
    const before=JSON.stringify([f.header.rows,f.realisation.rows,f.execution.rows]);
    assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,1);
    assert.equal(JSON.stringify([f.header.rows,f.realisation.rows,f.execution.rows]),before);
    assert.equal(f.events.length,0);assert.equal(f.reportDirty.length,0);
  });
}
test('ROW accepts valid date cells and dd/MM/yyyy without rewriting stored dates',()=>{
  const f=rowFixture();
  const value=new Date('2026-09-30T17:00:00Z');
  f.header.rows[1][4]=value;f.realisation.rows[1][4]='01/10/2026';
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,0);
  assert.equal(f.header.rows[1][4],value);
  assert.equal(f.realisation.rows[1][4],'01/10/2026');
});
test('ROW supports actual lexical const COL_INS and SHEET_INS, not just fixture globals',()=>{
  const f=rowFixture();
  const ins=JSON.stringify(f.ctx.COL_INS),sheets=JSON.stringify(f.ctx.SHEET_INS);
  delete f.ctx.COL_INS;delete f.ctx.SHEET_INS;
  vm.runInContext('const COL_INS='+ins+'; const SHEET_INS='+sheets+';',f.ctx);
  assert.equal(f.ctx.COL_INS,undefined);
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,0);
  assert.equal(f.header.rows[1][1],'R02-ABC');
});
test('ROW reacquires lock after actual queue helper releases it',()=>{
  const f=rowFixture({markReleasesLock:true});
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,0);
  assert.equal(f.locked,false);
});
test('ROW does not fall back to all-date synchronous recalculation when queue helper is missing',()=>{
  const f=rowFixture();delete f.ctx.markRecalcRowDirty_;
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,1);
  assert.equal(f.events.length,0);assert.equal(f.reportDirty.length,0);
});
test('ROW report queue failure prevents code writes, and WA queue failure does not stamp success',()=>{
  const f=rowFixture({reportQueueFails:true});
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,1);
  assert.equal(f.events.length,0);
  const g=rowFixture({queueFails:true});
  const r=g.ctx._t11TickPusatSiSi_();
  assert.equal(r.gagal.length,1);assert.match(r.gagal[0].error,/QUEUE_FAILED/);
  assert.equal(JSON.parse(g.props.get('TRIGGER_SISI_LAST_RUN_V2'))[rowJob],undefined);
  assert.deepEqual(g.reportDirty,['2026-10-01']);
});
test('ROW rechecks date changes after durable report notification before code writes',()=>{
  const f=rowFixture({afterReportMark({header,realisation,execution}){
    header.rows[1][4]='2026-09-30';realisation.rows[1][4]='2026-09-30';execution.rows[1][6]='2026-09-30';
  }});
  const r=f.ctx._t11TickPusatSiSi_();
  assert.equal(r.gagal.length,1);assert.match(r.gagal[0].error,/ROW_CHANGED/);
  assert.equal(f.events.length,0);
});
test('ROW no current-day work never refreshes or enqueues historical data',()=>{
  const f=rowFixture({day:'2026-09-30'});
  assert.equal(f.ctx._t11TickPusatSiSi_().gagal.length,0);
  assert.equal(f.events.length,0);assert.equal(f.reportDirty.length,0);
});
function fixture(options = {}) {
  const props = new Map(), writes = [], calls = [], logs = [];
  let locked = false;
  const lock = {
    waitLock() { if (options.lockFails) throw Error('LOCK_FAILED'); locked = true; },
    hasLock: () => locked,
    releaseLock() { locked = false; }
  };
  const makeSheet = rows => ({
    rows,
    getLastColumn: () => rows[0].length,
    getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
    getRange(r, c, nr = 1, nc = 1) {
      return {
        getValues: () => rows.slice(r - 1, r - 1 + nr).map(row => row.slice(c - 1, c - 1 + nc)),
        setValue(value) {
          assert.ok(locked);
          writes.push([r, c, value]);
          rows[r - 1][c - 1] = value;
        }
      };
    }
  });
  const p0 = makeSheet([['ULP', 'code'], [options.ulp === undefined ? ' Toboali ' : options.ulp, 'P0']]);
  const temuan = makeSheet([['ULP', 'Q', 'R', 'S', 'T'],
    [options.ulp === undefined ? 'ULP  TOBOALI' : options.ulp, 'new.jpg', 'old.jpg', 'pole.jpg', 'pole.jpg']]);
  const report = makeSheet([['No','Date','Feeder','Length','Finding','Action','UP3','UIW'],
    [1,'2026-10-01','Penyulang','4,1','Temuan','Eksekusi','old-up3','old-uiw']]);
  const context = vm.createContext({
    console: { log() {} }, Logger: { log: x => logs.push(x) },
    LockService: { getScriptLock: () => lock },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => props.get(key) || null,
      setProperty: (key, value) => props.set(key, value),
      deleteProperty: key => props.delete(key)
    }) },
    SpreadsheetApp: { openById: () => ({}), flush() {} },
    CacheService: { getScriptCache: () => ({ remove: key => calls.push(['cache', key]) }) },
    getSesiByToken: token => token === 'valid' ? {
      username: 'operator', ulp: options.callerUlp || 'Toboali', role: options.role || 'Super User'
    } : null,
    LH: { ULP: options.ulp === undefined ? 'Toboali' : options.ulp,
      COL: { tanggal: 1, lapUp3: 6, lapUiw: 7 } },
    SPREADSHEET_ID: 'fixture',
    _lhToday: () => '2026-10-01',
    _normTgl: x => x,
    _lhSheet: () => report,
    _lhEnsureRow: () => options.noReportRow ? 0 : 2,
    _lhC4aFromRow: row => ({ penyulang: row[2], realisasi: row[3], temuan: row[4], eksekusi: row[5] }),
    _tglSudahDiarsip_: () => !!options.archived,
    _lapMobileCacheKey_: (ulp, date) => 'lapUp3Uiw_' + ulp + '_' + date,
    buildLaporanUP3: (date, ulp, opts) => {
      calls.push(['up3', date, ulp, opts]);
      if (options.builderFails) throw Error('BUILD_FAILED');
      if (options.changeReport) report.rows[1][2] = 'changed';
      return 'new-up3';
    },
    buildLaporanWilayah: (date, ulp) => { calls.push(['uiw', date, ulp]); return 'new-uiw'; },
    refreshLaporanHarian: function () { context.guard_(arguments, { ulp: true }); return { ok: true }; },
    refreshLaporanHarianHariIni: () => context.refreshLaporanHarian({ tanggal: context._lhToday() }),
    sweepDurasiJarakYandalP0: function () {
      assert.ok(locked);
      calls.push(['sweep', arguments.length]);
      return { ok: !options.sweepFails };
    },
    lengkapiKodeTemuanKosong: () => {
      assert.ok(locked); calls.push(['complete']); lock.releaseLock();
      if (options.changeUlpAfterComplete) temuan.rows[1][0] = 'ULP Lain';
      return { ok: !options.completeFails };
    },
    perbaikiFormatKodeTemuan: () => {
      assert.ok(locked); calls.push(['repair']); lock.releaseLock(); return { ok: true };
    },
    validasiUlangFotoTemuan: () => { throw Error('OLD_PUBLIC_BODY_NOT_USED'); },
    SHEET_YANDAL: { P0: 'p0' }, COL_P0: { ulp: 0 },
    _shY_: () => p0,
    SHEET_INS: { TEMUAN: 'temuan' },
    COL_INS: { TEMUAN: { ulp: 0, fotoTemuan: 1, fotoTemuanUrl: 2, fotoTiang: 3, fotoTiangUrl: 4 } },
    _ssIns: () => ({ getSheetByName: () => temuan }),
    _namaFileFotoRef: value => /^https:/.test(value || '') ? '' : String(value || ''),
    apiRouter_: () => 'unrelated', doPost: () => 'unrelated',
    drainAntreanP0: () => ({ ok: true }),
    prosesP0Yandal() {}, prosesSwitchingYandal() {}
  });
  vm.runInContext(read('Core/Guard.js'), context);
  vm.runInContext(read('Core/Trigger-Manager.js'), context);
  vm.runInContext(read('Core/ZZZZ-P0-Remaining-Guards.js'), context);
  vm.runInContext(read('Core/ZZ-T11-Yandal-Watermark-ACL.js'), context);
  context.TRIGGER_SISI_TUGAS = jobs.map(fn => ({ fn, tiapMenit: 15 }));
  return { context, options, calls, writes, logs, p0, temuan, report, props,
    get locked() { return locked; } };
}
test('regression: public legacy calls still require session; private tick completes all three', () => {
  const f = fixture();
  for (const name of jobs) assert.throws(() => f.context[name](), /Sesi/);
  assert.equal(f.calls.length, 0); assert.equal(f.writes.length, 0);
  const result = f.context._t11TickPusatSiSi_();
  assert.equal(result.gagal.length, 0);
  assert.deepEqual(Array.from(result.jalan), jobs);
  assert.deepEqual(f.calls.find(x => x[0] === 'sweep'), ['sweep', 0]);
  assert.deepEqual(f.calls.find(x => x[0] === 'up3').slice(1, 3), ['2026-10-01', 'Toboali']);
  assert.equal(f.calls.find(x => x[0] === 'up3')[3].c4a.realisasi, '4,1');
  assert.deepEqual(f.report.rows[1].slice(2, 6), ['Penyulang','4,1','Temuan','Eksekusi']);
  assert.deepEqual(f.report.rows[1].slice(6), ['new-up3','new-uiw']);
  assert.equal(f.temuan.rows[1][2], ''); assert.equal(f.temuan.rows[1][4], '');
  assert.ok(f.calls.some(x => x[0] === 'cache' && x[1] === 'lapUp3Uiw_Toboali_2026-10-01'));
  assert.equal(f.locked, false);
  assert.equal(f.context._t11TickPusatSiSi_().belumJadwal.length, 3);
});
for (const job of jobs) test('forged flags cannot invoke ' + job + ' or resolver capability', () => {
  const f = fixture();
  assert.throws(() => f.context[job]({ scheduled: true, internal: true, ulp: 'Toboali' }), /Sesi/);
  assert.throws(() => f.context._triggerSisiHandler_(job)(), /CONTEXT_REQUIRED/);
  assert.equal(f.calls.length, 0); assert.equal(f.writes.length, 0);
});
for (const ulp of ['', 'ULP Lain', 'ULP ULP Toboali', {}, []])
  test('whole-job ownership preflight rejects ' + JSON.stringify(ulp), () => {
    const f = fixture({ ulp });
    const result = f.context._t11TickPusatSiSi_();
    assert.equal(result.gagal.length, 3);
    assert.equal(f.calls.length, 0); assert.equal(f.writes.length, 0);
    assert.deepEqual(JSON.parse(f.props.get('TRIGGER_SISI_LAST_RUN_V2')), {});
    assert.equal(f.locked, false);
  });
test('mixed sheets fail closed before either legacy writer', () => {
  const f = fixture();
  f.p0.rows.push(['ULP Lain', 'foreign']);
  f.temuan.rows.push(['', 'new.jpg', 'old.jpg', '', '']);
  const result = f.context._t11TickPusatSiSi_();
  assert.equal(result.gagal.length, 2);
  assert.ok(!f.calls.some(x => ['sweep','complete','repair'].includes(x[0])));
});
test('failed preparation and changed ownership stop subsequent photo writes', () => {
  for (const options of [{ completeFails: true }, { changeUlpAfterComplete: true }]) {
    const f = fixture(options);
    f.context.TRIGGER_SISI_TUGAS = [{ fn: jobs[2], tiapMenit: 60 }];
    const result = f.context._t11TickPusatSiSi_();
    assert.equal(result.gagal.length, 1);
    assert.ok(!f.calls.some(x => x[0] === 'repair'));
    assert.equal(f.writes.length, 0);
    assert.equal(f.locked, false);
  }
});
test('Drive photo URLs and unchanged AppSheet snapshots are preserved', () => {
  const f = fixture();
  f.temuan.rows[1] = ['Toboali', 'new.jpg', 'https://drive.google.com/file', 'pole.jpg', 'pole.jpg'];
  f.context.TRIGGER_SISI_TUGAS = [{ fn: jobs[2], tiapMenit: 60 }];
  assert.equal(f.context._t11TickPusatSiSi_().gagal.length, 0);
  assert.equal(f.writes.length, 0);
});
test('lock failure, failed calculation, and report race never get a success timestamp', () => {
  for (const options of [{ lockFails: true }, { sweepFails: true }, { builderFails: true }, { changeReport: true }]) {
    const f = fixture(options);
    const result = f.context._t11TickPusatSiSi_();
    assert.ok(result.gagal.length > 0);
    const stamp = JSON.parse(f.props.get('TRIGGER_SISI_LAST_RUN_V2'));
    for (const failure of result.gagal) assert.equal(stamp[failure.fn], undefined);
    assert.equal(f.locked, false);
    assert.throws(() => f.context._triggerSisiHandler_(jobs[0])(), /CONTEXT_REQUIRED/);
    assert.throws(() => f.context.buildLaporanUP3('2026-10-01', 'Toboali'), /Sesi/);
  }
});
test('archived report/no-row return safely without report writes', () => {
  for (const options of [{ archived: true }, { noReportRow: true }]) {
    const f = fixture(options);
    f.context.TRIGGER_SISI_TUGAS = [{ fn: jobs[0], tiapMenit: 15 }];
    assert.equal(f.context._t11TickPusatSiSi_().gagal.length, 0);
    assert.equal(f.writes.length, 0); assert.equal(f.calls.length, 0);
  }
});
test('private worker actions remain denied on HTTP paths', () => {
  const f = fixture();
  for (const action of ['_t11RunMaintenance_', '_t11ScheduledQueueDispatch_', '_t11TickPusatSiSi_']) {
    assert.throws(() => f.context.apiRouter_({ parameter: { action } }, {}), /PRIVATE_ACTION_DENIED/);
    assert.throws(() => f.context.apiRouter_({ parameter: {} }, { action }), /PRIVATE_ACTION_DENIED/);
    assert.throws(() => f.context.doPost({ postData: { contents: JSON.stringify({ action }) } }), /PRIVATE_ACTION_DENIED/);
  }
  assert.equal(f.calls.length, 0);
});
test('manual scheduler still requires Super Toboali and cleans up after exceptions', () => {
  for (const options of [{}, { role: 'Admin' }, { callerUlp: 'ULP Lain' }]) {
    const f = fixture(options);
    assert.throws(() => f.context.tickPusatSiSi({ internal: true }), /Sesi/);
    if (options.role || options.callerUlp) {
      assert.throws(() => f.context.tickPusatSiSi({ token: 'valid' }));
      assert.equal(f.calls.length, 0);
    } else {
      assert.equal(f.context.tickPusatSiSi({ token: 'valid' }).gagal.length, 0);
      assert.throws(() => f.context._triggerSisiHandler_(jobs[1])(), /CONTEXT_REQUIRED/);
    }
  }
});
test('unknown private job cannot select an arbitrary function', () => {
  const f = fixture();
  assert.throws(() => f.context._t11RunMaintenance_('pasangSemuaTriggerSiSi'), /UNKNOWN_JOB/);
  assert.equal(f.calls.length, 0); assert.equal(f.writes.length, 0);
});
test('actual legacy duration/distance sweep is captured and called without force', () => {
  const f = fixture();
  const source = read('Yandal/Tek-Yandal-Code.js');
  const start = source.indexOf('function sweepDurasiJarakYandalP0(');
  const end = source.indexOf('\n}', start);
  assert.ok(start >= 0 && end > start);
  vm.runInContext(source.slice(start, end + 2), f.context);
  vm.runInContext('originalsweepDurasiJarakYandalP0 = null;', f.context);
  vm.runInContext(read('Core/ZZZZ-P0-Remaining-Guards.js'), f.context);
  const C = { ulp: 0, kodeP0: 1, fotoSesudah: 2, durasi: 3,
    lat: 4, long: 5, latClosing: 6, longClosing: 7, jarak: 8, kodeShift: 9, jarakAntarP0: 10 };
  f.context.COL_P0 = C;
  f.p0.rows.splice(0, 2, Array(11).fill('header'),
    [' Toboali ', 'P0.001', 'photo', '', 1, 2, 3, 4, '', 'shift', '']);
  f.p0.getLastRow = () => f.p0.rows.length;
  const getRange = f.p0.getRange;
  f.p0.getRange = (...args) => {
    const range = getRange(...args);
    range.getValue = () => range.getValues()[0][0];
    range.clearContent = () => { throw Error('force must never clear data'); };
    return range;
  };
  f.context._allY_ = sh => sh.getDataRange().getValues();
  f.context._recalcDurasiRowY_ = (sh, row) => sh.getRange(row, C.durasi + 1).setValue('1 minute');
  f.context._recalcJarakRowY_ = (sh, row) => { sh.getRange(row, C.jarak + 1).setValue('1 km'); return '1 km'; };
  f.context._recalcJarakAntarP0RowY_ = (sh, row) => { sh.getRange(row, C.jarakAntarP0 + 1).setValue('0 km'); return '0 km'; };
  f.context.TRIGGER_SISI_TUGAS = [{ fn: jobs[1], tiapMenit: 30 }];
  assert.throws(() => f.context.sweepDurasiJarakYandalP0({ scheduled: true, force: true }), /Sesi/);
  assert.equal(f.context._t11TickPusatSiSi_().gagal.length, 0);
  assert.equal(f.p0.rows[1][C.durasi], '1 minute');
  assert.equal(f.p0.rows[1][C.jarak], '1 km');
  assert.equal(f.p0.rows[1][C.jarakAntarP0], '0 km');
  f.props.clear(); f.writes.length = 0;
  assert.equal(f.context._t11TickPusatSiSi_().gagal.length, 0);
  assert.equal(f.writes.length, 0, 'existing calculations remain intact');
});

// Reuse the established ACL fixture without registering its tests twice.
// Fail explicitly if the fixture/test boundary moves; do not silently skip.
const aclTestSource = fs.readFileSync(path.join(__dirname, 't11-yandal-acl.test.cjs'), 'utf8');
const fixtureEnd = aclTestSource.indexOf('\nfor (const switching of [false, true]) {');
assert.ok(fixtureEnd > aclTestSource.indexOf('function fixture('));
const aclFixture = vm.runInNewContext(aclTestSource.slice(0, fixtureEnd) + '\nfixture;', {
  require, __dirname, Buffer
});
for (const switching of [false, true]) {
  const label = switching ? 'Switching' : 'P0';
  test(label + ': diagnostic retains first ACL cause through swallowed errors', () => {
    const f = aclFixture(switching, { publicAncestor: true }), logs = [];
    f.ctx.Logger.log = x => logs.push(String(x));
    assert.throws(() => f.invoke(), /^Error: T11_YANDAL_PROCESS_FAILED$/);
    const log = JSON.parse(logs.find(x => x.includes('T11_WM_FAILURE')));
    assert.equal(log.code, 'PUBLIC_PARENT');
    assert.equal(log.stage, 'output_folder');
    assert.equal(f.engineCalls, 0);
    assert.deepEqual(Object.keys(log).sort(), ['code', 'event', 'processor', 'stage']);
    assert.ok(!JSON.stringify(log).includes(f.code));
  });
  for (const [message, code] of [
    ['Engine watermark gagal (403).', 'ENGINE_HTTP_403'],
    ['Balasan wm-engine bukan JSON yang valid.', 'ENGINE_INVALID_JSON'],
    ['Upload watermark ke Drive gagal.', 'ENGINE_REJECTED'],
    ['ACL foto tidak dapat dibuat privat.', 'ACL_NOT_PRIVATE'],
    ['provider secret=DO_NOT_LOG https://private.example/photo bytes=xyz', 'UNCLASSIFIED'],
    ['Engine watermark gagal (403). secret=DO_NOT_LOG', 'UNCLASSIFIED']
  ]) test(label + ': sanitized diagnostic ' + code + ' ' + message.length, () => {
    const f = aclFixture(switching), logs = [];
    f.ctx.Logger.log = x => logs.push(String(x));
    const engine = f.ctx._h07WatermarkImpl_;
    f.ctx._h07WatermarkImpl_ = () => { throw Error(message); };
    assert.throws(() => f.invoke(), /^Error: T11_YANDAL_PROCESS_FAILED$/);
    const log = JSON.parse(logs.find(x => x.includes('T11_WM_FAILURE')));
    assert.equal(log.code, code); assert.equal(log.stage, 'engine');
    assert.ok(!logs.join('').includes('DO_NOT_LOG'));
    assert.ok(!logs.join('').includes('https://'));
    assert.equal(f.locked, false);
    f.ctx._h07WatermarkImpl_ = engine;
    f.invoke();
    assert.equal(logs.filter(x => x.includes('T11_WM_FAILURE')).length, 1);
  });
}
