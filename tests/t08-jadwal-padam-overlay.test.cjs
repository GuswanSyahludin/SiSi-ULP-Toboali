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
