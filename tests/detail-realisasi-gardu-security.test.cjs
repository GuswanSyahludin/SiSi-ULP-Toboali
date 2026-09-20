'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const overridePath = path.join(__dirname, '..', 'SiSi_BackEnd', 'Core', 'ZZZ-Detail-Realisasi-Gardu-Auth.js');
const source = fs.readFileSync(overridePath, 'utf8');

const columns = {
  kodeHeader: 1,
  kodePekerjaanGardu: 2,
  penyulang: 5,
  section: 6,
  nomorGardu: 7,
  tier: 8,
  jumlahTemuan: 9,
};

function makeHarness({ session, header, realisasi, master, accessError, ordinaryError } = {}) {
  const counts = { guard: 0, open: 0, header: 0, realisasi: 0, master: 0 };
  const audits = [];
  const context = {
    console,
    Number,
    String,
    SPREADSHEET_ID: 'test-sheet',
    SHEET_INSDU_REALISASI: 'db_InsDu_Realisasi',
    COL_INSDU: { REALISASI: columns },
    SpreadsheetApp: {
      openById(id) {
        counts.open += 1;
        assert.equal(id, 'test-sheet');
        return {
          getSheetByName(name) {
            assert.equal(name, 'db_InsDu_Realisasi');
            return {
              getDataRange: () => ({
                getValues: () => {
                  counts.realisasi += 1;
                  if (ordinaryError) throw new Error(ordinaryError);
                  return realisasi || [];
                },
              }),
            };
          },
        };
      },
    },
    guard_(args) {
      counts.guard += 1;
      if (accessError) throw new Error(accessError);
      const token = args && args[0];
      if (token !== 'valid-token') throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
      if (!session) throw new Error('Sesi habis atau tidak valid. Silakan login ulang.');
      return { sesi: session, ulp: session.ulp, token };
    },
    _getHeaderInsByKode(ss, kode) {
      counts.header += 1;
      assert.equal(typeof ss.getSheetByName, 'function');
      return kode === (header && header.kodeHeader) ? header : null;
    },
    ulpSama_(left, right) {
      return String(left == null ? '' : left).trim().replace(/\s+/g, ' ').toLowerCase()
        === String(right == null ? '' : right).trim().replace(/\s+/g, ' ').toLowerCase()
        && String(left == null ? '' : left).trim() !== '';
    },
    _readSheetDual_(sheet, keyColumn, width) {
      counts.realisasi += 1;
      assert.equal(sheet, 'db_InsDu_Realisasi');
      assert.equal(keyColumn, columns.kodePekerjaanGardu);
      assert.equal(width, 12);
      if (ordinaryError) throw new Error(ordinaryError);
      return realisasi || [];
    },
    _findGarduByNomor(nomor) {
      counts.master += 1;
      return (master || {})[nomor] || null;
    },
    audit_(sesi, aksi, objek, hasil, catatan) {
      audits.push({ sesi, aksi, objek, hasil, catatan });
    },
    _guardErrorAkses_(error) {
      return /Sesi (habis|tidak)|Akses ditolak|belum terhubung ke ULP|bukan milik/i.test(
        String(error && error.message),
      );
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

const sampleRealisasi = [
  row({ kodeHeader: 'H-1', kodePekerjaanGardu: 'KP-1', penyulang: '', section: '', nomorGardu: 'G-1', tier: 'Tier 1', jumlahTemuan: 2 }),
  row({ kodeHeader: 'H-2', kodePekerjaanGardu: 'KP-2', penyulang: 'Penyulang lain', section: 'S-2', nomorGardu: 'G-2', tier: 'Tier 2', jumlahTemuan: 4 }),
];
const sampleMaster = {
  'G-1': { penyulang: 'Penyulang A', section: 'Section A', merkTrafo: 'Trafo X', dayaKva: '250 kVA' },
};

function detail(h, ...args) {
  return h.context.getDetailRealisasiGardu(...args);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

for (const [name, invoke] of [
  ['legacy/no-token invocation', h => detail(h, 'H-1')],
  ['invalid session invocation', h => detail(h, 'invalid-token', 'H-1')],
]) {
  test(`${name} is rejected before any helper, sheet, realisasi, or master read`, () => {
    const h = makeHarness({ session: { ulp: 'ULP A' }, header: { kodeHeader: 'H-1', ulp: 'ULP A' }, realisasi: sampleRealisasi, master: sampleMaster });
    assert.throws(invoke.bind(null, h), /Sesi (habis|tidak|tidak valid)/);
    assert.deepEqual(h.counts, { guard: 1, open: 0, header: 0, realisasi: 0, master: 0 });
  });
}

test('blank session ULP is rejected before any helper, sheet, realisasi, or master read', () => {
  const h = makeHarness({ session: { username: 'alice', ulp: '' }, header: { kodeHeader: 'H-1', ulp: 'ULP A' }, realisasi: sampleRealisasi, master: sampleMaster });
  assert.throws(() => detail(h, 'valid-token', 'H-1'), /ULP/);
  assert.deepEqual(h.counts, { guard: 1, open: 0, header: 0, realisasi: 0, master: 0 });
});

test('cross-ULP header is denied after header resolution but before realisasi/master reads', () => {
  const h = makeHarness({ session: { username: 'alice', ulp: 'ULP A' }, header: { kodeHeader: 'H-1', ulp: 'ULP B' }, realisasi: sampleRealisasi, master: sampleMaster });
  const result = detail(h, 'valid-token', 'H-1');
  assert.deepEqual(plain(result), { ok: false, message: 'Header bukan milik ULP Anda.' });
  assert.deepEqual(h.counts, { guard: 1, open: 1, header: 1, realisasi: 0, master: 0 });
  assert.equal(h.audits.length, 1);
  assert.equal(h.audits[0].aksi, 'getDetailRealisasiGardu');
});

test('valid same-ULP behavior preserves header, row fields, fallback values, and totals', () => {
  const header = { kodeHeader: 'H-1', ulp: '  ulp   a  ', tanggal: '2026-09-01', hari: 'Selasa' };
  const h = makeHarness({ session: { username: 'alice', ulp: 'ULP A' }, header, realisasi: sampleRealisasi, master: sampleMaster });
  const result = detail(h, 'valid-token', 'H-1');
  assert.deepEqual(plain(result), {
    ok: true,
    header,
    rows: [{
      kodePekerjaan: 'KP-1',
      nomorGardu: 'G-1',
      penyulang: 'Penyulang A',
      section: 'Section A',
      merkTrafo: 'Trafo X',
      dayaKva: '250 kVA',
      tier: 'Tier 1',
      jumlahTemuan: 2,
    }],
  });
  assert.deepEqual(h.counts, { guard: 1, open: 1, header: 1, realisasi: 1, master: 1 });
});

test('missing header keeps the ordinary error response and does not read child/master data', () => {
  const h = makeHarness({ session: { username: 'alice', ulp: 'ULP A' }, header: { kodeHeader: 'H-1', ulp: 'ULP A' }, realisasi: sampleRealisasi, master: sampleMaster });
  assert.deepEqual(plain(detail(h, 'valid-token', 'missing')), { ok: false, message: 'Header tidak ditemukan.' });
  assert.deepEqual(h.counts, { guard: 1, open: 1, header: 1, realisasi: 0, master: 0 });
});

test('ordinary realisasi errors keep the legacy {ok:false,message} behavior', () => {
  const h = makeHarness({ session: { username: 'alice', ulp: 'ULP A' }, header: { kodeHeader: 'H-1', ulp: 'ULP A' }, ordinaryError: 'sheet read failed' });
  assert.deepEqual(plain(detail(h, 'valid-token', 'H-1')), { ok: false, message: 'sheet read failed' });
  assert.deepEqual(h.counts, { guard: 1, open: 1, header: 1, realisasi: 1, master: 0 });
});

test('recognized guard access errors are rethrown', () => {
  const h = makeHarness({ accessError: 'Akses ditolak. Peran Anda tidak berhak.' });
  assert.throws(() => detail(h, 'valid-token', 'H-1'), /Akses ditolak/);
  assert.deepEqual(h.counts, { guard: 1, open: 0, header: 0, realisasi: 0, master: 0 });
});
