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