const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('SiSi_BackEnd/ROW/Tek-ROW-Code.js', 'utf8');

test('getSemuaLaporan resolves injected session token properly', () => {
  assert.match(source, /function getSemuaLaporan\(tglMulai, tglAkhir, tim, penyulang\)/);
  assert.match(source, /var TOKEN_RE = \/\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$\/i;/);
  assert.match(source, /rawDari = arguments\[1\];/);
  assert.match(source, /rawSampai = arguments\[2\];/);
});
