'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const overridePath = path.join(__dirname, '..', 'SiSi_BackEnd', 'Core', 'ZZZ-Data-Header-Ins-Gardu-Auth.js');
const source = fs.readFileSync(overridePath, 'utf8');

const columns = {
  kodeHeader: 1,
  ulp: 2,
  hari: 3,
  tanggal: 4,
  tim: 5,
  subTim: 6,
  koordinatAwal: 7,
  koordinatAkhir: 8,
  kmAwal: 9,
  kmAkhir: 10,
  kendala: 11,
  waText: 12,
  statusTextWa: 13,
};

function makeHarness({ session, headers, accessError, ordinaryError } = {}) {
  const counts = { guard: 0, dual: 0, legacy: 0 };
  const audits = [];
  const context = {
    console,
    String,
    SPREADSHEET_ID: 'test-sheet',
    SHEET_INS: { HEADER: 'db_Global_Header' },
    COL_INS: { HEADER: columns },
    guard_(args) {
      counts.guard += 1;
      if (accessError) throw new Error(accessError);
      const first = args && args[0];
      const token = first && typeof first === 'object' ? first.token : first;
      if (token !== 'valid-token') throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
      if (!session) throw new Error('Sesi habis atau tidak valid. Silakan login ulang.');
      return { sesi: session, ulp: session.ulp, token };
    },
    _readSheetDual_(sheet, keyColumn, width) {
      counts.dual += 1;
      assert.equal(sheet, 'db_Global_Header');
      assert.equal(keyColumn, columns.kodeHeader);
      assert.equal(width, columns.statusTextWa + 1);
      if (ordinaryError) throw new Error(ordinaryError);
      return headers || [];
    },
    _readSheetIns() {
      counts.legacy += 1;
      if (ordinaryError) throw new Error(ordinaryError);
      return headers || [];
    },
    _normTgl(value) {
      return String(value == null ? '' : value).trim();
    },
    _insInRange(date, from, to) {
      return (!from || date >= from) && (!to || date <= to);
    },
    ulpSama_(left, right) {
      const a = String(left == null ? '' : left).trim().replace(/\s+/g, ' ').toLowerCase();
      const b = String(right == null ? '' : right).trim().replace(/\s+/g, ' ').toLowerCase();
      return !!a && a === b;
    },
    _guardErrorAkses_(error) {
      return /Sesi (habis|tidak)|Akses ditolak|belum terhubung ke ULP|bukan milik/i.test(
        String(error && error.message),
      );
    },
    audit_(sesi, aksi, objek, hasil, catatan) {
      audits.push({ sesi, aksi, objek, hasil, catatan });
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: overridePath });
  return { context, counts, audits };
}

function row(values) {
  const r = [];
  Object.keys(values).forEach((key) => { r[columns[key]] = values[key]; });
  return r;
}

const sampleHeaders = [
  row({ kodeHeader: 'H-OLD', ulp: 'ULP A', hari: 'Senin', tanggal: '2026-08-31', tim: 'Inspeksi', subTim: 'Inspeksi Gardu', koordinatAwal: 'A', koordinatAkhir: 'B', kmAwal: '1', kmAkhir: '2', kendala: 'K', waText: 'WA old' }),
  row({ kodeHeader: 'H-NEW-B', ulp: 'ULP B', hari: 'Selasa', tanggal: '2026-09-01', tim: 'Inspeksi', subTim: 'Inspeksi Gardu', waText: 'WA other' }),
  row({ kodeHeader: 'H-NEW-BLANK', ulp: '', hari: 'Selasa', tanggal: '2026-09-01', tim: 'Inspeksi', subTim: 'Inspeksi Gardu', waText: 'WA blank' }),
  row({ kodeHeader: 'H-NEW', ulp: ' ulp  a ', hari: 'Selasa', tanggal: '2026-09-01', tim: 'Inspeksi', subTim: 'Inspeksi Gardu', koordinatAwal: ' C ', koordinatAkhir: ' D ', kmAwal: 3, kmAkhir: 4, kendala: ' ', waText: '  WA new  ' }),
  row({ kodeHeader: 'H-WRONG-TIM', ulp: 'ULP A', tanggal: '2026-09-01', tim: 'Lain', subTim: 'Inspeksi Gardu' }),
  row({ kodeHeader: 'H-WRONG-SUB', ulp: 'ULP A', tanggal: '2026-09-01', tim: 'Inspeksi', subTim: 'Inspeksi Jaringan' }),
];

function call(h, ...args) {
  return h.context.getDataHeaderInsGardu(...args);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

for (const [name, invoke] of [
  ['legacy/no-token invocation', h => call(h, { tglDari: '2026-01-01' })],
  ['invalid-token invocation', h => call(h, { token: 'invalid-token', tglDari: '2026-01-01' })],
]) {
  test(`${name} is rejected before params/helper/sheet reads`, () => {
    const h = makeHarness({ session: { ulp: 'ULP A' }, headers: sampleHeaders });
    assert.throws(() => invoke(h), /Sesi (habis|tidak|tidak valid)/);
    assert.deepEqual(h.counts, { guard: 1, dual: 0, legacy: 0 });
  });
}

test('blank session ULP is rejected before params/helper/sheet reads', () => {
  const h = makeHarness({ session: { username: 'alice', ulp: '' }, headers: sampleHeaders });
  assert.throws(() => call(h, { token: 'valid-token', tglDari: '2026-01-01' }), /ULP/);
  assert.deepEqual(h.counts, { guard: 1, dual: 0, legacy: 0 });
});

test('forged client ULP is ignored and canonical session ULP is the only scope', () => {
  const h = makeHarness({ session: { username: 'alice', ulp: 'ULP A' }, headers: sampleHeaders });
  const result = call(h, { token: 'valid-token', ulp: 'ULP B', tglDari: '2026-08-31', tglSampai: '2026-09-01' });
  assert.deepEqual(plain(result).map((r) => r.kodeHeader), ['H-NEW', 'H-OLD']);
  assert.equal(result.some((r) => r.ulp === 'ULP B'), false);
  assert.equal(result.some((r) => r.kodeHeader === 'H-NEW-BLANK'), false);
});

test('other-ULP and blank-ULP rows are excluded even when dates and subtype match', () => {
  const h = makeHarness({ session: { username: 'alice', ulp: 'ULP A' }, headers: sampleHeaders });
  const result = call(h, { token: 'valid-token', tglDari: '2026-09-01', tglSampai: '2026-09-01', ulp: '' });
  assert.deepEqual(plain(result), [{
    kodeHeader: 'H-NEW',
    ulp: 'ulp  a',
    hari: 'Selasa',
    tanggal: '2026-09-01',
    koordinatAwal: 'C',
    koordinatAkhir: 'D',
    kmAwal: '3',
    kmAkhir: '4',
    kendala: '',
    waText: 'WA new',
  }]);
});

test('valid behavior preserves date filtering, descending date/code sort, fields, and array shape', () => {
  const h = makeHarness({ session: { username: 'alice', ulp: 'ULP A' }, headers: sampleHeaders });
  const result = call(h, { token: 'valid-token', tglDari: '2026-08-31', tglSampai: '2026-09-01' });
  assert.ok(Array.isArray(result));
  assert.deepEqual(plain(result), [
    {
      kodeHeader: 'H-NEW', ulp: 'ulp  a', hari: 'Selasa', tanggal: '2026-09-01',
      koordinatAwal: 'C', koordinatAkhir: 'D', kmAwal: '3', kmAkhir: '4', kendala: '', waText: 'WA new',
    },
    {
      kodeHeader: 'H-OLD', ulp: 'ULP A', hari: 'Senin', tanggal: '2026-08-31',
      koordinatAwal: 'A', koordinatAkhir: 'B', kmAwal: '1', kmAkhir: '2', kendala: 'K', waText: 'WA old',
    },
  ]);
  assert.deepEqual(h.counts, { guard: 1, dual: 1, legacy: 0 });
});

test('ordinary sheet errors preserve the legacy thrown-error semantics', () => {
  const h = makeHarness({ session: { username: 'alice', ulp: 'ULP A' }, ordinaryError: 'sheet read failed' });
  assert.throws(() => call(h, { token: 'valid-token' }), /sheet read failed/);
  assert.deepEqual(h.counts, { guard: 1, dual: 1, legacy: 0 });
});

test('recognized guard access failures are rethrown', () => {
  const h = makeHarness({ accessError: 'Akses ditolak. Peran Anda tidak berhak.' });
  assert.throws(() => call(h, { token: 'valid-token' }), /Akses ditolak/);
  assert.deepEqual(h.counts, { guard: 1, dual: 0, legacy: 0 });
});
