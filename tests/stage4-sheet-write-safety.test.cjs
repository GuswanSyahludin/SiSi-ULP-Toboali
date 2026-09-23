'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'SiSi_BackEnd', 'Core', 'ZZZZZZZZZZZZ-Stage4-Sheet-Write-Safety.js'), 'utf8');

function harness() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

test('safe cell values neutralize formula/CSV prefixes but preserve ordinary text', () => {
  const h = harness();
  assert.equal(h._stage4SafeCellValue_('=HYPERLINK("https://evil")'), "'=HYPERLINK(\"https://evil\")");
  assert.equal(h._stage4SafeCellValue_('+SUM(A1:A2)'), "'+SUM(A1:A2)");
  assert.equal(h._stage4SafeCellValue_('-10'), "'-10");
  assert.equal(h._stage4SafeCellValue_('@user'), "'@user");
  assert.equal(h._stage4SafeCellValue_('normal value'), 'normal value');
  assert.equal(h._stage4SafeCellValue_(42), 42);
});

test('nested BA payloads are normalized without recursion or mutation', () => {
  const h = harness();
  const payload = { identitas: { alamat: '=IMPORTDATA("x")' }, foto: [{ url: 'https://drive.example/x' }] };
  const safe = h._stage4SafePayload_(payload);
  assert.notEqual(safe, payload);
  assert.equal(safe.identitas.alamat, "'=IMPORTDATA(\"x\")");
  assert.equal(safe.foto[0].url, 'https://drive.example/x');
  assert.equal(payload.identitas.alamat, '=IMPORTDATA("x")');
});

test('nested arrays and object values all use the same normalization', () => {
  const h = harness();
  const safe = h._stage4SafePayload_({ values: ['=bad', '@bad', 7, true], detail: { Alamat: '+bad' } });
  assert.deepEqual(safe.values, ["'=bad", "'@bad", 7, true]);
  assert.equal(safe.detail.Alamat, "'+bad");
});
