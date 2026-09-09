const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('SiSi_BackEnd/Teknik/ZZ-Data-Checkpoint-Section-Volume.js', 'utf8');
test('section volume endpoint groups rows and maps units', () => {
  assert.match(source, /function getDpgRekapTemuanSectionVolume/);
  assert.match(source, /Titik/);
  assert.match(source, /Gwg/);
  assert.match(source, /Btg/);
  assert.match(source, /bySection/);
  assert.match(source, /_readSheetDual_/);
});
