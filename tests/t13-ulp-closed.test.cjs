'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const overlayPath = path.join(root, 'SiSi_BackEnd/Core/ZZ-T13-ULP-Closed.js');
const guardPath = path.join(root, 'SiSi_BackEnd/Core/Guard.js');
const overlay = fs.readFileSync(overlayPath, 'utf8');
const appsscript = JSON.parse(fs.readFileSync(path.join(root, 'SiSi_BackEnd/appsscript.json'), 'utf8'));
const pushOrder = appsscript.filePushOrder;
const guardIndex = pushOrder.indexOf('Core/Guard.js');
const overlayIndex = pushOrder.indexOf('Core/ZZ-T13-ULP-Closed.js');

assert.match(overlay, /TAMPILKAN_BARIS_TANPA_ULP\s*=\s*false/);
assert.ok(guardIndex >= 0, 'Guard.js must be loaded');
assert.equal(overlayIndex, pushOrder.length - 1, 'T-13 closure overlay must be loaded last');
assert.ok(guardIndex < overlayIndex, 'T-13 overlay must load after Guard.js');

const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(guardPath, 'utf8'), context, { filename: guardPath });
vm.runInContext(overlay, context, { filename: overlayPath });
const operator = { isSuper: false, ulp: 'ULP Toboali', kodeUlp: '' };
const superUser = { isSuper: true, ulp: 'ULP Toboali', kodeUlp: '' };
assert.equal(context.barisUlpCocok_(operator, ''), false, 'ordinary ULP users must not see unresolved rows');
assert.equal(context.barisUlpCocok_(superUser, ''), true, 'Super Users retain the audit path');
console.log('T-13 empty-ULP fail-closed contract passed.');
