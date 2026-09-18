const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const adapter = fs.readFileSync('SiSi_BackEnd/ROW/Tek-ROW-TokenAdapter.js', 'utf8');

test('Tek-ROW-TokenAdapter wraps getSemuaLaporan and shifts token argument', () => {
  assert.match(adapter, /var TOKEN_RE = \/\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$\/i;/);
  assert.match(adapter, /origGetSemuaLaporan\.call\(this, arguments\[1\], arguments\[2\], arguments\[3\], arguments\[4\]\)/);
});
