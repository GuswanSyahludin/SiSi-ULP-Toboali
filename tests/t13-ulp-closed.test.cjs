'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const overlay = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/ZZ-T13-ULP-Closed.js'), 'utf8');
const appsscript = JSON.parse(fs.readFileSync(path.join(root, 'SiSi_BackEnd/appsscript.json'), 'utf8'));
const clasp = JSON.parse(fs.readFileSync(path.join(root, 'SiSi_BackEnd/.clasp.json'), 'utf8'));

for (const [name, pushOrder] of [
  ['appsscript.json', appsscript.filePushOrder],
  ['.clasp.json', clasp.filePushOrder],
]) {
  const guardIndex = pushOrder.indexOf('Core/Guard.js');
  const overlayIndex = pushOrder.indexOf('Core/ZZ-T13-ULP-Closed.js');
  assert.ok(guardIndex >= 0, `${name} must load Guard.js`);
  assert.equal(overlayIndex, pushOrder.length - 1, `${name} must load T-13 closure overlay last`);
  assert.ok(guardIndex < overlayIndex, `${name} must load T-13 after Guard.js`);
}

assert.match(overlay, /TAMPILKAN_BARIS_TANPA_ULP\s*=\s*false/);
console.log('T-13 empty-ULP fail-closed contract passed.');
