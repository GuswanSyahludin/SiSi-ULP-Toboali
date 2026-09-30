'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');
const source = fs.readFileSync(
  path.join(repoRoot, 'SiSi_Mobile', 'lib', 'db', 'repositories', 'yandal_local_repository.dart'),
  'utf8',
);

test('Yandal roster is scoped to the authenticated ULP and Sub-Tim', () => {
  assert.match(source, /SesiStore\.muat\(\)/);
  assert.match(source, /if \(ulp\.isEmpty \|\| subTim\.isEmpty\) return const \[\];/);
  assert.match(source, /_text\(row, 1\)\.toLowerCase\(\) != ulp\.toLowerCase\(\)/);
  assert.match(source, /_text\(row, 2\)\.toLowerCase\(\) != subTim\.toLowerCase\(\)/);
  assert.match(source, /final person = _text\(row, 3\);/);
});

test('P0 report combines synchronized db_Yandal_P0 rows with local drafts for the exact shift', () => {
  assert.match(source, /final localDrafts = all/);
  assert.match(source, /final headers = await _rows\(globalHeader\)/);
  assert.match(source, /final shifts = await _rows\(shift\)/);
  assert.match(source, /for \(final row in await _rows\(p0\)\)/);
  assert.match(source, /shiftCodes\.contains\(kodeShift\)/);
  assert.match(source, /_text\(row, 4\).*ulp/i);
  assert.match(source, /_date\(row, 6\) != tanggal/);
  assert.match(source, /return \[\.\.\.localDrafts, \.\.\.synced\];/);
  assert.match(source, /'SERVER-P0-\$kodeP0'/);
});