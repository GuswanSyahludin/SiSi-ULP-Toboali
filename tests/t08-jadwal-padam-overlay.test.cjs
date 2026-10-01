'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const overlay = fs.readFileSync(
  path.join(root, 'SiSi_BackEnd/Core/ZZ-T08-Jadwal-Ownership.js'),
  'utf8',
);
const clasp = JSON.parse(fs.readFileSync(
  path.join(root, 'SiSi_BackEnd/.clasp.json'),
  'utf8',
));

for (const name of [
  'getJadwalPadamMaster',
  'getJadwalPadamCalendarMonth',
  'getJadwalPadamList',
  'getJadwalPadamMasterBeban',
  'simpanJadwalPadam',
  'updateJadwalPadam',
  'updateStatusJadwalPadam',
  'hapusJadwalPadam',
  'getJadwalPadamWaText',
]) {
  assert.match(overlay, new RegExp(`${name} = function`));
}

assert.match(overlay, /ulpScope_\(g,/);
assert.match(overlay, /barisUlpCocok_\(g, target\.ulp\)/);
assert.match(overlay, /var _t08RouterOriginal_ = jadwalPadamMobileRouter_/);
assert.match(overlay, /Token wajib dikirim dalam body JSON/);
assert.doesNotMatch(overlay, /data\.token\s*\|\|\s*p\.token/);
assert.match(overlay, /_t08TargetRow_\(p\.kode\)/);
assert.match(overlay, /getJadwalPadamWaText = function/);
assert.match(overlay, /_t08WaContext_/);

// Check repository-declared relative order, not the deployed Apps Script order.
const pushOrder = clasp.filePushOrder;
assert.ok(Array.isArray(pushOrder), '.clasp.json must declare filePushOrder as an array');
const ownershipPath = 'Core/ZZ-T08-Jadwal-Ownership.js';
const deletePath = 'Teknik/Jadwal-Padam-Delete.js';
for (const file of [ownershipPath, deletePath]) {
  assert.equal(pushOrder.filter((entry) => entry === file).length, 1,
    `${file} must occur exactly once in the declared order`);
}
assert.ok(pushOrder.indexOf(ownershipPath) > pushOrder.indexOf(deletePath),
  'Declared order must place T-08 ownership after the legacy delete implementation');

console.log('T-08/H-04 Jadwal Padam ownership overlay checks passed.');

// Behavioral regression for the v220 IZINKAN -> SESI/TOLAK incident.
// Real compatibility functions and T08/P0 wrappers, strict mocked session
// guard and scoped readers. This is not a deployed GAS/browser/Sheet test.
const test = require('node:test');
const vm = require('node:vm');
const baSource = fs.readFileSync(path.join(root,
  'SiSi_BackEnd/Core/ZZ-BA-Jadwal-Master-Compat.js'), 'utf8');
const calendarSource = fs.readFileSync(path.join(root,
  'SiSi_BackEnd/Teknik/ZZ-Jadwal-Padam-Calendar-Compat.js'), 'utf8');
const p0Source = fs.readFileSync(path.join(root,
  'SiSi_BackEnd/Core/ZZZ-P0-BA-Mobile-Guards.js'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const key = value => String(value || '').trim().toLowerCase()
  .replace(/\s+/g, ' ').replace(/^ulp /, '');

function readFixture(options = {}) {
  const token = '11111111-1111-4111-8111-111111111111';
  const foreignToken = '22222222-2222-4222-8222-222222222222';
  const sessions = new Map([
    [token, { ulp: options.ulp === undefined ? 'Toboali' : options.ulp,
      role: options.role || 'Admin', username: 'fixture' }],
    [foreignToken, { ulp: 'ULP Koba', role: 'Admin', username: 'other' }],
  ]);
  const events = [], masterCalls = [], listCalls = [], cache = new Map();
  let cacheReads = 0, cacheWrites = 0;
  const rows = [
    { ulp: 'Toboali', penyulang: 'P1', section: 'S2' },
    { ulp: 'ULP Toboali', penyulang: 'P1', section: 'S1' },
    { ulp: 'Toboali', penyulang: 'P1', section: 'S1' },
    { ulp: 'ULP Koba', penyulang: 'FOREIGN', section: 'OTHER' },
    { ulp: '', penyulang: 'UNKNOWN', section: 'NO-OWNER' },
  ];
  const ctx = vm.createContext({
    guard_(args, opts) {
      const values = Array.from(args || []);
      let supplied = '';
      for (const value of values) {
        if (value && typeof value === 'object' && value.token) {
          supplied = String(value.token).trim(); break;
        }
        if (typeof value === 'string' &&
            /^[0-9a-f-]{36}$/i.test(value.trim())) {
          supplied = value.trim(); break;
        }
      }
      if (!supplied) throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
      const sesi = sessions.get(supplied);
      if (!sesi) throw new Error('Sesi habis atau tidak valid. Silakan login ulang.');
      if (opts.ulp && !sesi.ulp) throw new Error('Akun belum terhubung ke ULP.');
      events.push(opts.aksi);
      return { ...sesi, sesi, token: supplied, isSuper: sesi.role === 'Super User' };
    },
    getSesiByToken: value => sessions.get(String(value || '').trim()),
    ulpScope_: (g, requested) => g.isSuper ? String(requested || '') : g.ulp,
    getJadwalPadamMaster(params) {
      ctx.guard_(arguments, { ulp: true, aksi: 'master-reader' });
      masterCalls.push(plain(params));
      if (options.masterFailure) return { ok: false, message: 'Master gagal.' };
      return { ok: true, rows: options.leakyMaster ? rows :
        rows.filter(r => key(r.ulp) === key(params.ulp)) };
    },
    getJadwalPadamList(params) {
      ctx.guard_(arguments, { ulp: true, aksi: 'list-reader' });
      listCalls.push(plain(params));
      if (params.page === options.failPage) {
        if (options.throwPage) throw new Error('Sesi habis saat halaman berikutnya.');
        return { ok: false, message: 'Halaman gagal.' };
      }
      return { ok: true, totalPages: 2, rows: [{
        kode: 'JP-' + params.page, tanggal: '2026-10-01', hari: 'Kamis',
        ulp: params.ulp, penyulang: 'P1', section: 'S' + params.page,
        durasi: 1, bebanA: 12, ensRupiah: 100,
      }] };
    },
    getJadwalPadamMasterBeban() {}, simpanJadwalPadam() {},
    updateJadwalPadam() {}, updateStatusJadwalPadam() {},
    hapusJadwalPadam() {}, getJadwalPadamWaText() {},
    jadwalPadamMobileRouter_() {},
    _jpText_: value => String(value == null ? '' : value).trim(),
    _jpUlpKey_: key, _jpTgl_: value => value,
    _jpHari_: () => 'Kamis', _jpTimeText_: value => String(value || ''),
    _jpCalendarVersion_: () => '1', JADWAL_CALENDAR_CACHE_TTL: 300,
    CacheService: { getScriptCache: () => ({
      get(k) { cacheReads++; return cache.get(k) || null; },
      put(k, v) { cacheWrites++; cache.set(k, v); },
    }) },
  });
  vm.runInContext(baSource, ctx);
  vm.runInContext(calendarSource, ctx);
  // Exercise wrappers capturing the real compatibility implementation.
  vm.runInContext(overlay, ctx);
  vm.runInContext(p0Source, ctx);
  if (options.calendarLoadedLast) vm.runInContext(calendarSource, ctx);
  return { ctx, token, foreignToken, sessions, events, masterCalls, listCalls, cache,
    stats: () => ({ cacheReads, cacheWrites }),
    ba(arg = token) {
      try { return ctx.getPenyulangDanSection(arg); }
      catch (e) { return { ok: false, message: e.message }; }
    },
    calendar(params = {}) {
      try { return ctx.getJadwalPadamCalendarMonth({
        token, year: 2026, month: 10, ...params,
      }); } catch (e) { return { ok: false, rows: [], message: e.message }; }
    },
  };
}

test('BA preserves validated token through P0 -> compat -> T08 -> guarded master', () => {
  const f = readFixture();
  const res = f.ba('  ' + f.token + '  ');
  assert.equal(res.ok, true, res.message);
  assert.deepEqual(plain(res.penyulangList), ['P1']);
  assert.deepEqual(plain(res.sectionByPenyulang), { P1: ['S1', 'S2'] });
  assert.equal(res.source, 'Master Daerah Padam');
  assert.deepEqual(f.masterCalls, [{ token: f.token, ulp: 'Toboali' }]);
  assert.ok(f.events.includes('master-reader'));
});

test('BA accepts server ULP aliases but excludes foreign and unresolved row ownership', () => {
  for (const role of ['Admin', 'Super User']) {
    const f = readFixture({ role, ulp: '  ULP   Toboali  ', leakyMaster: true });
    const res = f.ba({ token: f.token, ulp: 'Koba', role: 'Super User' });
    assert.equal(res.ok, true, res.message);
    assert.deepEqual(plain(res.penyulangList), ['P1']);
    assert.deepEqual(plain(res.sectionByPenyulang), { P1: ['S1', 'S2'] });
    assert.equal(f.masterCalls[0].ulp, '  ULP   Toboali  ');
  }
});

test('BA rejects missing and expired sessions before reading master', () => {
  for (const arg of ['', '33333333-3333-4333-8333-333333333333', { ulp: 'Toboali' }]) {
    const f = readFixture(), res = f.ba(arg);
    assert.equal(res.ok, false);
    assert.match(res.message, /Sesi/);
    assert.equal(f.masterCalls.length, 0);
  }
});

test('BA rejects foreign or missing ULP including Super User without master reads', () => {
  for (const ulp of ['', 'Koba', 'ULP Koba']) {
    for (const role of ['Admin', 'Super User']) {
      const f = readFixture({ ulp, role }), res = f.ba();
      assert.equal(res.ok, false);
      assert.match(res.message, /ULP/);
      assert.equal(f.masterCalls.length, 0);
    }
  }
});

test('BA surfaces master failure and does not turn it into an empty success', () => {
  const f = readFixture({ masterFailure: true }), res = f.ba();
  assert.equal(res.ok, false);
  assert.equal(res.message, 'Master gagal.');
});

for (const calendarLoadedLast of [false, true]) {
  test('calendar preserves token on EVERY page, compat loaded last=' + calendarLoadedLast, () => {
    const f = readFixture({ calendarLoadedLast });
    const params = { ulp: 'ULP Koba' };
    const res = f.calendar(params);
    assert.equal(res.ok, true, res.message);
    assert.equal(res.rows.length, 2);
    assert.deepEqual(f.listCalls.map(p => [p.token, p.ulp, p.page]),
      [[f.token, 'Toboali', 1], [f.token, 'Toboali', 2]]);
    for (const p of f.listCalls) {
      assert.equal(p.tglDari, '2026-10-01');
      assert.equal(p.tglSampai, '2026-10-31');
      assert.equal(p.pageSize, 100);
    }
    assert.equal(params.ulp, 'ULP Koba', 'caller payload is not mutated');
    assert.equal(f.calendar().cached, true);
    assert.equal(f.listCalls.length, 2);
  });
}

test('calendar rejects missing/expired sessions before cache or reader access', () => {
  for (const token of ['', '33333333-3333-4333-8333-333333333333']) {
    const f = readFixture(), res = f.calendar({ token });
    assert.equal(res.ok, false);
    assert.match(res.message, /Sesi/);
    assert.equal(f.listCalls.length, 0);
    assert.deepEqual(f.stats(), { cacheReads: 0, cacheWrites: 0 });
  }
});

test('cached calendar cannot be used after its session expires', () => {
  const f = readFixture();
  assert.equal(f.calendar().ok, true);
  const stats = f.stats();
  f.sessions.delete(f.token);
  assert.equal(f.calendar().ok, false);
  assert.deepEqual(f.stats(), stats);
});

test('calendar cache is scoped to authenticated ULP, never the forged filter', () => {
  const f = readFixture();
  assert.equal(f.calendar({ ulp: 'ULP Koba' }).ok, true);
  const other = f.calendar({ token: f.foreignToken, ulp: 'Toboali' });
  assert.equal(other.ok, true);
  assert.ok(other.rows.every(row => row.ulp === 'ULP Koba'));
  assert.equal(f.listCalls.length, 4, 'foreign account must not hit Toboali cache');
  assert.equal(f.cache.size, 2);
});

test('calendar refuses empty-ULP accounts before cache or data reads', () => {
  for (const role of ['Admin', 'Super User']) {
    const f = readFixture({ ulp: '', role }), res = f.calendar();
    assert.equal(res.ok, false);
    assert.equal(f.listCalls.length, 0);
    assert.equal(f.stats().cacheReads, 0);
  }
});

test('calendar page failure returns no partial rows and never caches partial success', () => {
  for (const failPage of [1, 2]) {
    for (const throwPage of [false, true]) {
      const f = readFixture({ failPage, throwPage }), res = f.calendar();
      assert.equal(res.ok, false);
      assert.deepEqual(plain(res.rows), []);
      assert.match(res.message, /gagal|Sesi/);
      assert.equal(f.stats().cacheWrites, 0);
    }
  }
});

test('calendar ignores old potentially partial cache entries', () => {
  const f = readFixture();
  f.cache.set('jpCal|1|2026-10|toboali', JSON.stringify({
    ok: true, rows: [{ kode: 'OLD-PARTIAL' }], month: '2026-10',
  }));
  const res = f.calendar();
  assert.equal(res.ok, true);
  assert.deepEqual(plain(res.rows.map(row => row.kode)), ['JP-1', 'JP-2']);
  assert.equal(f.listCalls.length, 2);
});
