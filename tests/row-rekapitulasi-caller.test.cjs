const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const rowHtml = fs.readFileSync('SiSi_BackEnd/ROW/Tek-ROW.html', 'utf8');

test('Tek-ROW.html calls google.script.run for getSemuaLaporan to avoid token injection shifting', () => {
  assert.match(rowHtml, /google\.script\.run[\s\S]*?\.getSemuaLaporan\(dari, sampai, tim, peny\)/);
});
