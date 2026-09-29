'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(
  path.join(root, 'SiSi_BackEnd/Core/ZZ-T09-Master-Gardu-Conflict.js'),
  'utf8',
);
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

assert.match(source, /serverRevision/);
assert.match(source, /MASTER_GARDU_CONFLICT/);
assert.match(source, /expected !== current/);
assert.match(source, /serverRevision = next/);
assert.match(source, /getMasterGarduMobile = function/);
assert.match(source, /updateMasterGarduMobile = function/);
assert.match(packageJson.scripts.test, /t09-master-gardu-conflict\.test\.cjs/);
console.log('T-09 Master Gardu conflict contract passed.');
