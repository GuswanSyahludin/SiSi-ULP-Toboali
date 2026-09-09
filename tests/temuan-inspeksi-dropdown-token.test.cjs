const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(
  'SiSi_BackEnd/Core/ZZ-Temuan-Filter-Compat.js',
  'utf8',
);

test('Temuan filter reads ULP after the injected session token', () => {
  assert.match(source, /function getListTemuanTerpakaiIns\(token, ulp\)/);
  assert.match(source, /aksi: "getListTemuanTerpakaiIns"/);
  assert.match(source, /ulpScope_\(g, ulp\) \|\| g\.ulp/);
});

test('Temuan filter keeps dual-read and returns a stable list', () => {
  assert.match(source, /_readSheetDual_/);
  assert.match(source, /C\.temuan \+ 1/);
  assert.match(source, /list\.sort/);
  assert.match(source, /list: \[\]/);
});
