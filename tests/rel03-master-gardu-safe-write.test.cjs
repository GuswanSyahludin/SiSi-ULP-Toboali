'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const overlay = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/ZZ-REL03-Master-Gardu-Safe-Write.js'), 'utf8');
const appsscript = JSON.parse(fs.readFileSync(path.join(root, 'SiSi_BackEnd/appsscript.json'), 'utf8'));
const clasp = JSON.parse(fs.readFileSync(path.join(root, 'SiSi_BackEnd/.clasp.json'), 'utf8'));

assert.match(overlay, /REL03_FORMULA_CELL/);
assert.match(overlay, /REL03_IMMUTABLE_FIELD/);
assert.match(overlay, /Preflight every requested cell/);
assert.match(overlay, /getRange\(i \+ 1, R\.jumlahTemuan \+ 1\)\.setValue/);
assert.doesNotMatch(overlay, /rng\.setValues\(rows\)/);
for (const order of [appsscript.filePushOrder, clasp.filePushOrder]) {
  assert.equal(order.at(-1), 'Core/ZZ-REL03-Master-Gardu-Safe-Write.js');
}
console.log('REL-03 formula-safe write contract passed.');
