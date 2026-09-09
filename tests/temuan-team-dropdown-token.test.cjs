const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(
  'SiSi_BackEnd/Core/ZZ-Temuan-Team-Compat.js',
  'utf8',
);

test('team dropdown reads ULP after injected token', () => {
  assert.match(source, /function getListTimByUlp\(token, ulp\)/);
  assert.match(source, /ulpScope_\(g, ulp\) \|\| g\.ulp/);
  assert.match(source, /rows\[i\]\[1\]/);
  assert.match(source, /rows\[i\]\[3\]/);
});

test('assignment validates session, ownership, and registered team', () => {
  assert.match(source, /aksi: "setPilihTimTemuan"/);
  assert.match(source, /barisUlpCocok_\(g, row\[C\.ulp\]\)/);
  assert.match(source, /getListTimByUlp\(g\.token/);
  assert.match(source, /Tim pelaksana tidak terdaftar/);
  assert.match(source, /setValue\(g\.username\)/);
});
