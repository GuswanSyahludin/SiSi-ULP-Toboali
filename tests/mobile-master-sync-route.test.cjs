'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.join(__dirname, '..');
const codePath = path.join(repoRoot, 'SiSi_BackEnd', 'Core', 'Code.js');
const routePath = path.join(
  repoRoot,
  'SiSi_BackEnd',
  'Core',
  'ZZZZZZZZZZZZZZZZZZZ-Mobile-Master-Sync-Route.js',
);

function makeHarness() {
  const calls = [];
  const context = {
    console,
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(body) {
        return {
          body,
          mimeType: null,
          setMimeType(type) {
            this.mimeType = type;
            return this;
          },
        };
      },
    },
    apiRouter_(e, body) {
      return { legacy: true, e, body };
    },
    getMasterGarduMobile(token, ulp) {
      calls.push({ token, ulp });
      return { success: true, marker: 'master-route' };
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(routePath, 'utf8'), context, {
    filename: routePath,
  });
  return { context, calls };
}

test('Code.js exposes the legacy router and the compatibility route handles JSON master sync', () => {
  assert.match(fs.readFileSync(codePath, 'utf8'), /function\s+apiRouter_\s*\(/);

  const h = makeHarness();
  const response = h.context.apiRouter_({}, {
    action: 'getMasterGarduMobile',
    token: 'device-session-token',
    ulp: 'DELTA_SYNC:{"cmd":"snapshotCreate"}',
  });

  assert.equal(response.mimeType, 'application/json');
  assert.deepEqual(JSON.parse(response.body), {
    success: true,
    marker: 'master-route',
  });
  assert.deepEqual(h.calls, [{
    token: 'device-session-token',
    ulp: 'DELTA_SYNC:{"cmd":"snapshotCreate"}',
  }]);
});

test('non-master actions remain delegated to the legacy router', () => {
  const h = makeHarness();
  const body = { action: 'getLaporanHarian', token: 't' };
  const response = h.context.apiRouter_({ parameter: {} }, body);
  assert.deepEqual(JSON.parse(JSON.stringify(response)), {
    legacy: true,
    e: { parameter: {} },
    body,
  });
});
