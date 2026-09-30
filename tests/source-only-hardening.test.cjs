'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const overlay = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/ZZ-Source-Only-Hardening.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'SiSi_Mobile/lib/services/api_service.dart'), 'utf8');
const clasp = JSON.parse(fs.readFileSync(path.join(root, 'SiSi_BackEnd/.clasp.json'), 'utf8'));

assert.match(overlay, /GUARD_DEBUG\s*=\s*false/);
assert.match(overlay, /WEBHOOK_TS_MODE_DEFAULT\s*=\s*["']enforce/);
assert.match(overlay, /Username atau password salah/);
assert.match(api, /String\.fromEnvironment\(\s*'SISI_API_URL'/);

// Validate repository-declared relative order, not actual deployed load order.
const order = clasp.filePushOrder;
assert.ok(Array.isArray(order), '.clasp.json must declare filePushOrder as an array');
const hardeningPath = 'Core/ZZ-Source-Only-Hardening.js';
const rel03Path = 'Core/ZZ-REL03-Master-Gardu-Safe-Write.js';
for (const file of [hardeningPath, rel03Path]) {
  assert.equal(order.filter((entry) => entry === file).length, 1,
    `${file} must occur exactly once in the declared order`);
}
const hardeningIndex = order.indexOf(hardeningPath);
const rel03Index = order.indexOf(rel03Path);
assert.notEqual(hardeningIndex, -1);
assert.notEqual(rel03Index, -1);
assert.ok(hardeningIndex < rel03Index, 'source hardening must precede the REL-03 final overlay in declared order');
console.log('Source-only hardening contract passed.');
