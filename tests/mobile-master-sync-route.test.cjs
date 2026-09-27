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
  'ZZZZZZZZZZZZZZZZZZ-Mobile-Master-Sync-Route.js',
);
const finalLoaderPath = path.join(
  repoRoot,
  'SiSi_BackEnd',
  'Core',
  'ZZZZZZZZZZZZZZZZZZ-PageLoader-Dashboard-Delete.js',
);

function makeHarness() {
  const calls = [];
  const updates = [];
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
    updateMasterGarduMobile(token, payload) {
      updates.push({ token, payload });
      return { success: true, marker: 'update-route' };
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(routePath, 'utf8'), context, {
    filename: routePath,
  });
  return { context, calls, updates };
}

test('mobile sync route sits before the final Dashboard loader override', () => {
  assert.ok(fs.existsSync(routePath));
  assert.ok(fs.existsSync(finalLoaderPath));
  assert.ok(path.basename(routePath) < path.basename(finalLoaderPath));
  assert.match(fs.readFileSync(codePath, 'utf8'), /function\s+apiRouter_\s*\(/);
});

test('JSON mobile master-data action reaches getMasterGarduMobile', () => {
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
  assert.deepEqual(h.updates, []);
});

test('Gardu edit upload (mode=update) reaches updateMasterGarduMobile, never the download gateway', () => {
  const h = makeHarness();
  const payload = {
    gardu: 'TB-001',
    ulp: 'ULP Toboali',
    data: { alamat: 'Jl. Contoh' },
  };
  const response = h.context.apiRouter_({}, {
    action: 'getMasterGarduMobile',
    mode: 'update',
    token: 'device-session-token',
    payload,
  });

  assert.equal(response.mimeType, 'application/json');
  assert.deepEqual(JSON.parse(response.body), {
    success: true,
    marker: 'update-route',
  });
  assert.deepEqual(h.calls, []);
  assert.deepEqual(JSON.parse(JSON.stringify(h.updates)), [{
    token: 'device-session-token',
    payload,
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
