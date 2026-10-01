'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const backend = path.join(__dirname, '../SiSi_BackEnd');
const read = file => fs.readFileSync(path.join(backend, file), 'utf8');
const jobs = ['refreshLaporanHarianHariIni', 'sweepDurasiJarakYandalP0', 'validasiUlangFotoTemuan'];
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
