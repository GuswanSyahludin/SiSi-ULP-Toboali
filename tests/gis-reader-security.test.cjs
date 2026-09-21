const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.resolve(__dirname, '../SiSi_BackEnd/Core/ZZZ-GIS-Jaringan-Auth.js'),
  'utf8',
);

const GIS_ID = '1Xyu6L_SeVc4sck5NoNxOGwkMFfgWK52wWR_a0_j49vs';
const GIS_SHEET = 'db_TiangMaster';
const headers = [
  'SSOTNUMBER', 'NAMA_PENYULANG', 'LATITUDEY', 'LONGITUDEX',
  'JENIS_TIANG', 'UKURAN_TIANG_TM', 'STATUS_KEPEMILIKAN',
  'FORMATTEDADDRESS', 'STREETADDRESS', 'CITY', 'NO_SLO',
  'SLOACTIVEDATE', 'KODE_HANTARAN',
];
const rows = [
  headers,
  ['SOT-1', 'Penyulang A', '-2.000000', '106.000000', 'Beton', '9M', 'PLN', 'Alamat 1', '', '', 'SLO-1', '2026-01-01', 'KH-1'],
  ['SOT-2', 'Penyulang A', '-2.001000', '106.001000', 'Beton', '9M', 'PLN', 'Alamat 2', '', '', 'SLO-2', '2026-01-02', 'KH-2'],
  ['SOT-3', 'Penyulang B', '-2.002000', '106.002000', 'Beton', '9M', 'PLN', 'Alamat 3', '', '', 'SLO-3', '2026-01-03', 'KH-3'],
];

function load({ guardError = null, sessionUlp = 'ULP Toboali', openError = null } = {}) {
  const state = { guardCalls: 0, openCalls: 0, guardOptions: null };
  const context = {
    String,
    Math,
    isNaN,
    Infinity,
    GIS_TIANG_SPREADSHEET_ID: GIS_ID,
    GIS_TIANG_SHEET_NAME: GIS_SHEET,
    GIS_MAX_SEGMEN_M: 600,
    _normTgl: value => String(value == null ? '' : value).slice(0, 10),
    guard_: (args, options) => {
      state.guardCalls++;
      state.guardOptions = options;
      if (guardError) throw new Error(guardError);
      return { ulp: sessionUlp };
    },
    _guardErrorAkses_: error => /Sesi tidak|Akun belum terhubung|Akses ditolak/.test(String(error && error.message)),
    SpreadsheetApp: {
      openById: id => {
        state.openCalls++;
        assert.equal(id, GIS_ID);
        if (openError) throw new Error(openError);
        return {
          getSheetByName: name => {
            assert.equal(name, GIS_SHEET);
            return {
              getLastRow: () => rows.length,
              getDataRange: () => ({ getValues: () => rows }),
            };
          },
        };
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, state };
}

test('anonymous GIS reader is rejected before spreadsheet access', () => {
  const { context, state } = load({ guardError: 'Sesi tidak ditemukan. Silakan login ulang.' });
  assert.throws(
    () => context.getGisJaringanLines({ penyulang: 'Penyulang A' }),
    /Sesi tidak ditemukan/,
  );
  assert.equal(state.guardCalls, 1);
  assert.equal(state.openCalls, 0);
  assert.equal(state.guardOptions.ulp, true);
  assert.equal(state.guardOptions.aksi, 'getGisJaringanLines');
});

test('missing canonical ULP is rejected before spreadsheet access', () => {
  const { context, state } = load({ sessionUlp: '' });
  assert.throws(
    () => context.getGisJaringanLines({ penyulang: 'Penyulang A' }),
    /ULP/,
  );
  assert.equal(state.guardCalls, 1);
  assert.equal(state.openCalls, 0);
});

test('recognized spreadsheet access failure is rethrown', () => {
  const { context, state } = load({ openError: 'Akses ditolak ke spreadsheet GIS.' });
  assert.throws(
    () => context.getGisJaringanLines({ token: 'valid' }),
    /Akses ditolak/,
  );
  assert.equal(state.openCalls, 1);
});

test('valid GIS calls preserve penyulang filtering and response shapes', () => {
  const { context, state } = load();
  const result = context.getGisJaringanLines({ token: 'valid', penyulang: 'Penyulang A' });

  assert.equal(result.ok, true);
  assert.equal(result.total, 1);
  assert.equal(result.segmen.length, 1);
  assert.deepEqual(result.segmen[0].p, 'Penyulang A');
  assert.deepEqual(Array.from(result.segmen[0].a), [-2.001, 106.001]);
  assert.deepEqual(Array.from(result.segmen[0].b), [-2, 106]);
  assert.equal(result.diag.baris, 3);
  assert.equal(result.diag.koordValid, 3);
  assert.equal(result.diag.jumlahPenyulang, 1);
  assert.equal(result.diag.segmenTergambar, 1);
  assert.equal(state.guardCalls, 1);
  assert.equal(state.openCalls, 1);
});
