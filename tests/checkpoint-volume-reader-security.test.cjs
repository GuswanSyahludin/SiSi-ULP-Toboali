const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.resolve(__dirname, '../SiSi_BackEnd/Teknik/ZZ-Data-Checkpoint-Section-Volume.js'),
  'utf8',
);

function load({ reject = false, sessionUlp = 'ULP Toboali' } = {}) {
  const state = { guardCalls: 0, dataReads: 0 };
  const C = {
    kodePekerjaan: 0, status: 1, tanggal: 2, penyulang: 3,
    temuan: 4, section: 5, ulp: 6,
  };
  const rows = [
    ['PKJ-1', '', '2026-01-02', 'Penyulang A', 'Pohon', 'Section A', 'ULP Toboali'],
    ['PKJ-2', '', '2026-01-03', 'Penyulang A', 'Pohon', 'Section B', 'ULP PALSU'],
    ['PKJ-3', '', '2026-01-04', 'Penyulang A', 'Pohon', 'Section C', ''],
  ];
  const context = {
    Date, String, parseInt,
    guard_: (args, options) => {
      state.guardCalls++;
      state.guardArgs = args;
      state.guardOptions = options;
      if (reject) throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
      return { ulp: sessionUlp };
    },
    _guardErrorAkses_: (e) => /Sesi tidak|ULP|Akses ditolak/.test(String(e && e.message)),
    COL_INS: { TEMUAN: C },
    SHEET_INS: { TEMUAN: 'db_INS_Temuan' },
    _normTgl: (v) => String(v || '').slice(0, 10),
    _readSheetDual_: () => { state.dataReads++; return rows; },
    _ssIns: () => {
      state.dataReads++;
      return { getSheetByName: () => ({
        getLastRow: () => 2,
        getDataRange: () => ({ getValues: () => [
          ['No', 'Tier', 'x', 'Temuan'],
          [1, 'Tier 1', '', 'Pohon'],
        ] }),
      }) };
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, state };
}

test('anonymous Section Volume reader is rejected before data access', () => {
  const { context, state } = load({ reject: true });
  assert.throws(
    () => context.getDpgRekapTemuanSectionVolume({ tahun: 2026, ulp: 'ULP PALSU' }),
    /Sesi tidak ditemukan/,
  );
  assert.equal(state.guardCalls, 1);
  assert.equal(state.dataReads, 0);
  assert.equal(state.guardOptions.ulp, true);
  assert.equal(state.guardOptions.aksi, 'getDpgRekapTemuanSectionVolume');
});

test('Section Volume ignores forged client ULP and uses canonical session ULP', () => {
  const { context, state } = load();
  const result = context.getDpgRekapTemuanSectionVolume({ tahun: 2026, ulp: 'ULP PALSU' });
  assert.equal(result.ok, true);
  assert.equal(result.totalVolume, 1);
  assert.deepEqual(Array.from(result.sections), ['Section A']);
  assert.equal(state.guardArgs[0].ulp, 'ULP PALSU');
  assert.ok(state.dataReads > 0);
});

test('Section Volume fails closed when session has no canonical ULP', () => {
  const { context, state } = load({ sessionUlp: '' });
  assert.throws(
    () => context.getDpgRekapTemuanSectionVolume({ tahun: 2026 }),
    /ULP/,
  );
  assert.equal(state.dataReads, 0);
});
