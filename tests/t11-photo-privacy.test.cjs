'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const privacyPath = 'Core/ZZ-T11-Photo-Privacy.js';
const watermarkPath = 'Yandal/Tek-Watermark.js';
const readBackend = (file) => fs.readFileSync(path.join(root, 'SiSi_BackEnd', file), 'utf8');
const privacy = readBackend(privacyPath);
const watermark = readBackend(watermarkPath);
const yandalAcl = readBackend('Core/ZZ-T11-Yandal-Watermark-ACL.js');
const temuan = readBackend('Core/Tek-Temuan-Code.js');
const row = readBackend('Core/WO-ROW-Mobile.js');
const appsscript = JSON.parse(readBackend('appsscript.json'));
const clasp = JSON.parse(readBackend('.clasp.json'));

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
assert.match(yandalAcl, /prosesP0Yandal/);
assert.match(yandalAcl, /prosesSwitchingYandal/);
assert.match(yandalAcl, /_h07PrivateFile_/);
assert.match(temuan, /ANYONE_WITH_LINK/);
assert.match(row, /_uploadFotoTemuan\(/);
assert.doesNotMatch(row, /setSharing\(\s*DriveApp\.Access\.ANYONE_WITH_LINK/);

// Deliberate target changes require an explicit review of this contract too.
assert.equal(clasp.scriptId, '1oYUuH0hDAezgFS9XAjm3SDfGlQSWBPuW1kIsFUUgK2kJPHl82Exrhx9b',
  'Deployment target must not change during load-order hardening');

function assertPrivacyOrder(order, label) {
  const required = ['Yandal/Tek-Yandal-Code.js', watermarkPath, privacyPath,
    'Core/ZZ-T13-ULP-Closed.js', 'Core/ZZ-T11-Yandal-Watermark-ACL.js'];
  for (const file of required) {
    assert.equal(order.filter((entry) => entry === file).length, 1,
      `${label}: ${file} must occur exactly once`);
  }
  for (let i = 1; i < required.length; i++) {
    assert.ok(order.indexOf(required[i]) > order.indexOf(required[i - 1]),
      `${label}: ${required[i]} must load after ${required[i - 1]}`);
  }
}

// Execute the two competing definitions in the declared relative order.
// This is a mocked watermark-boundary test, not a full Apps Script deployment
// or proof that the legacy Yandal post-processing wrapper is fail-closed.
function assertWatermarkBoundary(order, label, combined) {
  const selected = order.filter((file) => file === watermarkPath || file === privacyPath);
  function run(aclFails) {
    const events = [];
    const blob = { getBytes: () => [1, 2, 3], getContentType: () => 'image/jpeg' };
    const context = vm.createContext({
      PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-secret' }) },
      guard_: () => { events.push('guard'); },
      Utilities: { base64Encode: () => 'AQID' },
      DriveApp: {
        Access: { PRIVATE: 'PRIVATE' }, Permission: { VIEW: 'VIEW' },
        getFileById: (id) => {
          if (id === 'source-id') return { getBlob: () => blob };
          assert.equal(id, 'output-id');
          return { setSharing: (access, permission) => {
            assert.equal(access, 'PRIVATE');
            assert.equal(permission, 'VIEW');
            events.push('private');
            if (aclFails) throw new Error('ACL denied');
          } };
        }
      },
      UrlFetchApp: { fetch: (_url, options) => {
        assert.equal(JSON.parse(options.payload).makePublic, false);
        events.push('engine');
        return { getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true, fileId: 'output-id' }) };
      } },
      urlFotoBaku_: (id) => { events.push('url'); return 'private-ref:' + id; }
    });
    if (combined) {
      vm.runInContext(selected.map(readBackend).join('\n'), context, { timeout: 1000 });
    } else {
      for (const file of selected) vm.runInContext(readBackend(file), context, { filename: file, timeout: 1000 });
    }
    const invoke = () => vm.runInContext(
      "watermarkFoto_('source-id', 'folder-id', { ulp: 'ULP Toboali' }, 'wm.jpg')",
      context, { timeout: 1000 });
    if (aclFails) {
      assert.throws(invoke, /ACL foto tidak dapat dibuat privat/, `${label}: ACL failure must propagate`);
      assert.deepEqual(events, ['guard', 'engine', 'private'], `${label}: never return a URL after ACL failure`);
    } else {
      assert.equal(invoke(), 'private-ref:output-id');
      assert.deepEqual(events, ['guard', 'engine', 'private', 'url'], `${label}: enforce PRIVATE before URL`);
    }
  }
  run(false);
  run(true);
}

for (const [label, order] of [['appsscript', appsscript.filePushOrder], ['clasp', clasp.filePushOrder]]) {
  assertPrivacyOrder(order, label);
  assertWatermarkBoundary(order, label, false);
  assertWatermarkBoundary(order, label, true);
  // Mutation control: prove the behavioral test rejects the old unsafe order.
  assert.throws(() => assertWatermarkBoundary([privacyPath, watermarkPath], label, true));
}
console.log('T-11 private photo contract passed.');
