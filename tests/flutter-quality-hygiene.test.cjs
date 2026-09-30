'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const mobile = path.join(root, 'SiSi_Mobile');

assert.equal(fs.existsSync(path.join(root, 'flutter-audit.txt')), false);
const analysis = fs.readFileSync(path.join(mobile, 'analysis_options.yaml'), 'utf8');
assert.match(analysis, /include:\s+package:flutter_lints\/flutter\.yaml/);
console.log('Flutter quality hygiene contract passed.');
