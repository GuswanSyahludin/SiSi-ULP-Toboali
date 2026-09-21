const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const mainHtml = fs.readFileSync('SiSi_BackEnd/Core/Main.html', 'utf8');

test('getSemuaLaporan is not in SISI_BUTUH_TOKEN to prevent argument index shifting', () => {
  // SISI_BUTUH_TOKEN defines which functions get token unshifted
  const match = mainHtml.match(/var SISI_BUTUH_TOKEN = \[([\s\S]*?)\];/);
  assert.ok(match, 'SISI_BUTUH_TOKEN array found in Main.html');
  assert.doesNotMatch(match[1], /"getSemuaLaporan"/, 'getSemuaLaporan must not be in SISI_BUTUH_TOKEN');
});
