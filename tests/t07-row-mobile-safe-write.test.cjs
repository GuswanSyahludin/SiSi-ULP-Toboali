'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const overlay = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/ZZ-T07-ROW-Mobile-Safe-Write.js'), 'utf8');
const appsscript = JSON.parse(fs.readFileSync(path.join(root, 'SiSi_BackEnd/appsscript.json'), 'utf8'));
const pushOrder = appsscript.filePushOrder;
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
assert.ok(t07Index >= 0, 'T-07 overlay must be loaded');
assert.ok(t11Index >= 0, 'T-11 privacy overlay must be loaded');
assert.ok(t07Index < t11Index, 'T-07 must load before T-11 so privacy remains the outermost wrapper');
console.log('T-07 ROW mobile safe-write contract passed.');
