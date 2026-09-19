'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const overridePath = path.join(__dirname, '..', 'SiSi_BackEnd', 'Core', 'ZZZ-Temuan-Gardu-Auth.js');
const source = fs.readFileSync(overridePath, 'utf8');

const columns = {
  kodeHeader: 1,
  nomorGardu: 13,
  kodePekerjaan: 3,
  temuan: 15,
  deskripsi: 20,
  koordinat: 21,
  section: 10,
  tier: 14,
  status: 26,
  fotoTemuanUrl: 17,
  fotoTiangUrl: 19,
  folderPath: 44,
};

function makeHarness({ session, header, findings, accessError } = {}) {
  let headerReads = 0;
  let findingReads = 0;
  let sheetReads = 0;
  const audits = [];

  const context = {
    console,
    SPREADSHEET_ID: 'test-sheet',
    SHEET_INS: { TEMUAN: 'db_INS_Temuan' },
    COL_INS: { TEMUAN: columns },
    SpreadsheetApp: {
      openById(id) {
        assert.equal(id, 'test-sheet');
        sheetReads += 1;
        return {
          getSheetByName(name) {
            assert.equal(name, 'db_INS_Temuan');
            return { getDataRange: () => ({ getValues: () => findings || [] }) };
          },
        };
      },
    },
    guard_(args) {
      if (accessError) throw new Error(accessError);
      const token = args && args[0];
      if (token !== 'valid-token') throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
      if (!session) throw new Error('Sesi habis atau tidak valid. Silakan login ulang.');
      return {
        sesi: session,
        ulp: session.ulp,
        token,
      };
    },
    _getHeaderInsByKode(ss, kode) {
      headerReads += 1;
      assert.equal(ss && typeof ss.getSheetByName, 'function');
      return kode === (header && header.kodeHeader) ? header : null;
    },
    barisUlpCocok_(g, rowUlp) {
      return String(g.ulp || '').trim().toLowerCase() === String(rowUlp || '').trim().toLowerCase();
    },
    _readSheetDual_() {
      findingReads += 1;
      return findings || [];
    },
    audit_(sesi, aksi, objek, hasil, catatan) {
      audits.push({ sesi, aksi, objek, hasil, catatan });
    },
    _guardErrorAkses_(error) {
      return /Sesi|Akses ditolak|ULP|bukan milik/i.test(String(error && error.message));
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: overridePath });
  return { context, counts: () => ({ headerReads, findingReads, sheetReads }), audits };
}

function row(values) {
  const r = [];
  Object.keys(values).forEach((key) => { r[columns[key]] = values[key]; });
  return r;
}

const sampleFindings = [
  row({ kodeHeader: 'H-1', nomorGardu: 'G-1', kodePekerjaan: 'T-1', temuan: 'Temuan satu', deskripsi: 'D1', koordinat: '-2,106', section: 'S1', tier: 'Tier 1', status: 'Progress', fotoTemuanUrl: 'ft1', fotoTiangUrl: 'fg1' }),
  row({ kodeHeader: 'H-1', nomorGardu: 'G-1', kodePekerjaan: 'T-2', temuan: 'Temuan dua', deskripsi: 'D2', koordinat: '-2,107', section: 'S2', tier: 'Tier 2', status: 'Selesai', fotoTemuanUrl: 'ft2', fotoTiangUrl: 'fg2' }),
  row({ kodeHeader: 'H-1', nomorGardu: 'G-2', kodePekerjaan: 'T-3', temuan: 'Temuan lain', fotoTemuanUrl: 'ft3', fotoTiangUrl: 'fg3' }),
];

test('legacy/no-token invocation is rejected before any helper or sheet read', () => {
  const h = makeHarness({ session: { ulp: 'ULP A' }, header: { kodeHeader: 'H-1', ulp: 'ULP A' }, findings: sampleFindings });
  assert.throws(() => h.context.getTemuanGardu('H-1', 'G-1'), /Sesi tidak ditemukan/);
  assert.deepEqual(h.counts(), { headerReads: 0, findingReads: 0, sheetReads: 0 });
});

test('invalid session is rejected before any helper or sheet read', () => {
  const h = makeHarness({ session: null, header: { kodeHeader: 'H-1', ulp: 'ULP A' }, findings: sampleFindings });
  assert.throws(() => h.context.getTemuanGardu('invalid-token', 'H-1', 'G-1'), /Sesi (habis|tidak|tidak valid)/);
  assert.deepEqual(h.counts(), { headerReads: 0, findingReads: 0, sheetReads: 0 });
});

test('blank session ULP is rejected before any helper or sheet read', () => {
  const h = makeHarness({ session: { username: 'alice', ulp: '' }, header: { kodeHeader: 'H-1', ulp: 'ULP A' }, findings: sampleFindings });
  assert.throws(() => h.context.getTemuanGardu('valid-token', 'H-1', 'G-1'), /ULP/);
  assert.deepEqual(h.counts(), { headerReads: 0, findingReads: 0, sheetReads: 0 });
});

test('mismatched header ULP is denied before findings are read', () => {
  const h = makeHarness({ session: { username: 'alice', ulp: 'ULP A' }, header: { kodeHeader: 'H-1', ulp: 'ULP B' }, findings: sampleFindings });
  const result = h.context.getTemuanGardu('valid-token', 'H-1', 'G-1');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ok: false, message: 'Header bukan milik ULP Anda.', list: [] });
  assert.equal(h.counts().headerReads, 1);
  assert.equal(h.counts().findingReads, 0);
  assert.equal(h.audits.length, 1);
});

test('valid same-ULP read preserves success shape, fields, filtering, and reverse order', () => {
  const h = makeHarness({ session: { username: 'alice', ulp: 'ULP A' }, header: { kodeHeader: 'H-1', ulp: 'ULP A' }, findings: sampleFindings });
  const result = h.context.getTemuanGardu('valid-token', 'H-1', 'G-1');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    ok: true,
    list: [
      { kodePekerjaan: 'T-2', temuan: 'Temuan dua', deskripsi: 'D2', koordinat: '-2,107', section: 'S2', tier: 'Tier 2', status: 'Selesai', nomorGardu: 'G-1', fotoTemuanUrl: 'ft2', fotoGarduUrl: 'fg2' },
      { kodePekerjaan: 'T-1', temuan: 'Temuan satu', deskripsi: 'D1', koordinat: '-2,106', section: 'S1', tier: 'Tier 1', status: 'Progress', nomorGardu: 'G-1', fotoTemuanUrl: 'ft1', fotoGarduUrl: 'fg1' },
    ],
  });
  assert.deepEqual(h.counts(), { headerReads: 1, findingReads: 1, sheetReads: 1 });
});

test('recognized guard access errors are rethrown', () => {
  const h = makeHarness({ accessError: 'Akses ditolak. Peran Anda tidak berhak.' });
  assert.throws(() => h.context.getTemuanGardu('valid-token', 'H-1', 'G-1'), /Akses ditolak/);
  assert.deepEqual(h.counts(), { headerReads: 0, findingReads: 0, sheetReads: 0 });
});
