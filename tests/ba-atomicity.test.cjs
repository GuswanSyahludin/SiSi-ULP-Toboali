'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'SiSi_BackEnd', 'Core', 'ZZZZZZZZZ-BA-Atomicity.js'),
  'utf8',
);

test('BA save is executed inside the shared script lock', () => {
  const events = [];
  const context = {
    simpanBeritaAcaraGardu(payload) {
      events.push(['save', payload]);
      return { ok: true, idBA: 'BA-GRD-TBL-202609-001' };
    },
    withLock_(fn, ms) {
      events.push(['lock', ms]);
      return fn();
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  const result = context.simpanBeritaAcaraGardu({ token: 'session-token' });
  assert.equal(result.ok, true);
  assert.deepEqual(events, [
    ['lock', 30000],
    ['save', { token: 'session-token' }],
  ]);
});

test('lock failure prevents BA save side effects', () => {
  let called = false;
  const context = {
    simpanBeritaAcaraGardu() { called = true; },
    withLock_() { throw Object.assign(new Error('busy'), { kode: 'LOCK_SIBUK' }); },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  assert.throws(() => context.simpanBeritaAcaraGardu({}), /busy/);
  assert.equal(called, false);
});
