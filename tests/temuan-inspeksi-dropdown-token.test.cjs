const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const backend = fs.readFileSync(
  'SiSi_BackEnd/Core/ZZ-Temuan-Filter-Compat.js',
  'utf8',
);
const page = fs.readFileSync(
  'SiSi_BackEnd/Core/Temuan-Inspeksi.html',
  'utf8',
);

test('dropdown reads ULP after the injected session token', () => {
  assert.match(backend, /function getListTemuanTerpakaiIns\(token, ulp\)/);
  assert.match(backend, /ulpScope_\(g, ulp\) \|\| g\.ulp/);
  assert.match(backend, /_readSheetDual_/);
});

test('main query validates session, ULP, and date range', () => {
  assert.match(backend, /aksi: "getTitikPetaTemuanIns"/);
  assert.match(backend, /Tanggal Dari tidak boleh melewati Tanggal Sampai/);
  assert.match(backend, /_insInRange\(tanggal, fDari, fSampai\)/);
});

test('all visible filters are wired to data rendering', () => {
  for (const id of [
    'tiTglDari', 'tiTglSampai', 'tiPenyulang', 'tiTemuanMsList',
    'tiTier1', 'tiTier2', 'tiStatus',
  ]) assert.match(page, new RegExp(id));
  assert.match(page, /getTitikPetaTemuanIns\(filter\)/);
  assert.match(page, /TI\.temuanSel/);
  assert.match(page, /TI\.tierSel/);
});

test('detail lookup reads code after token and checks ownership', () => {
  assert.match(backend, /function getMonitoringTemuanDetailIns\(token, kodePekerjaan\)/);
  assert.match(backend, /barisUlpCocok_\(scoped\.g, row\[C\.ulp\]\)/);
});
