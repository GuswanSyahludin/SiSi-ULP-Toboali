'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const loaderPath = path.join(root, 'tests/harness/loader.js');
const loaderSource = fs.readFileSync(loaderPath, 'utf8');

const requiredOrder = [
  'Core/Jadwal-Padam-Mobile.js',
  'Teknik/Jadwal-Padam-Code.js',
  'Teknik/Jadwal-Padam-Delete.js',
  'Core/ZZ-T08-Jadwal-Ownership.js',
];
let previous = -1;
for (const file of requiredOrder) {
  const current = loaderSource.indexOf(`\"${file}\"`);
  assert(current > previous, `${file} must load after its dependency`);
  previous = current;
}

(async () => {
  const { loadBackend } = await import(pathToFileURL(loaderPath));
  const ctx = loadBackend({ backendRoot: path.join(root, 'SiSi_BackEnd') });
  assert.deepEqual(ctx.errors, [], `backend load errors: ${JSON.stringify(ctx.errors)}`);
  for (const fn of [
    'jadwalPadamMobileRouter_',
    'getJadwalPadamMaster',
    'getJadwalPadamList',
    'getJadwalPadamCalendarMonth',
    'simpanJadwalPadam',
    'updateJadwalPadam',
    'updateStatusJadwalPadam',
    'hapusJadwalPadam',
    'getJadwalPadamWaText',
    'getJadwalPadamMasterBeban',
  ]) {
    assert.equal(typeof ctx.context[fn], 'function', `${fn} must be loaded`);
  }
  console.log('T-08 endpoint load contract passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
