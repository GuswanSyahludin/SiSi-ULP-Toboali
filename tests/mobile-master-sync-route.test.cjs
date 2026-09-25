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
    getMasterGarduMobile(token, ulp) {
      calls.push({ token, ulp });
      return { success: true, marker: 'master-route' };
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(codePath, 'utf8'), context, {
    filename: codePath,
  });
  vm.runInContext(fs.readFileSync(routePath, 'utf8'), context, {
    filename: routePath,
  });
  return { context, calls };
}

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
});
