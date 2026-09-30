'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const overlay = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/ZZ-T07-ROW-Mobile-Safe-Write.js'), 'utf8');
const clasp = JSON.parse(fs.readFileSync(path.join(root, 'SiSi_BackEnd/.clasp.json'), 'utf8'));
// Repository-declared relative order, not proof of the deployed runtime order.
// filePushOrder belongs outside the Apps Script manifest.
const pushOrder = clasp.filePushOrder;
assert.ok(Array.isArray(pushOrder), '.clasp.json must declare filePushOrder as an array');
for (const file of ['Core/ZZ-T07-ROW-Mobile-Safe-Write.js', 'Core/ZZ-T11-Photo-Privacy.js']) {
  assert.equal(pushOrder.filter((entry) => entry === file).length, 1,
    `${file} must occur exactly once in the declared order`);
}
const t07Index = pushOrder.indexOf('Core/ZZ-T07-ROW-Mobile-Safe-Write.js');
const t11Index = pushOrder.indexOf('Core/ZZ-T11-Photo-Privacy.js');

assert.match(overlay, /guard_\(arguments, \{ ulp: true/);
assert.match(overlay, /withLock_\(function/);
assert.match(overlay, /idempotencyKey wajib diisi/);
assert.match(overlay, /PropertiesService\.getScriptProperties/);
assert.match(overlay, /safeCell_/);
assert.match(overlay, /Koordinat tiang/);
assert.match(overlay, /Koordinat pekerjaan/);
assert.match(overlay, /Diameter tidak valid/);
assert.match(overlay, /simpanMobileEksekusiRow = function/);
assert.ok(t07Index >= 0, 'T-07 overlay must be declared');
assert.ok(t11Index >= 0, 'T-11 privacy overlay must be declared');
assert.ok(t07Index < t11Index, 'Declared order must place T-07 before the T-11 privacy wrapper');
console.log('T-07 ROW mobile safe-write contract passed.');
