'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const privacy = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/ZZ-T11-Photo-Privacy.js'), 'utf8');
const watermark = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Yandal/Tek-Watermark.js'), 'utf8');
const temuan = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/Tek-Temuan-Code.js'), 'utf8');
const row = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/WO-ROW-Mobile.js'), 'utf8');
const appsscript = JSON.parse(fs.readFileSync(path.join(root, 'SiSi_BackEnd/appsscript.json'), 'utf8'));
const pushOrder = appsscript.filePushOrder;
const t11Index = pushOrder.indexOf('Core/ZZ-T11-Photo-Privacy.js');
const t13Index = pushOrder.indexOf('Core/ZZ-T13-ULP-Closed.js');

assert.match(privacy, /makePublic:\s*false/);
assert.match(privacy, /getFotoPrivatT11/);
assert.match(privacy, /guard_\(arguments, \{ ulp: true/);
assert.match(privacy, /barisUlpCocok_\(g, row\.ulp\)/);
assert.match(privacy, /DriveApp\.Access\.PRIVATE/);
assert.match(privacy, /apiRouter_ = function/);
assert.match(privacy, /function\s+_uploadFotoTemuan\s*\(/);
assert.match(privacy, /simpanMobileEksekusiRow = function/);
assert.match(privacy, /updateMobileEksekusiRow = function/);
assert.match(watermark, /makePublic:\s*false/);
assert.doesNotMatch(watermark, /makePublic:\s*true/);
assert.match(temuan, /ANYONE_WITH_LINK/);
assert.match(row, /_uploadFotoTemuan\(/);
assert.doesNotMatch(row, /setSharing\(\s*DriveApp\.Access\.ANYONE_WITH_LINK/);
assert.ok(t11Index >= 0, 'T-11 privacy overlay must be loaded');
assert.ok(t13Index >= 0, 'T-13 containment overlay must be loaded');
assert.ok(t11Index < t13Index, 'T-13 must load after T-11 without weakening photo privacy');
assert.match(pushOrder.join('\n'), /Core\/ZZ-T11-Photo-Privacy\.js/);
console.log('T-11 private photo contract passed.');
