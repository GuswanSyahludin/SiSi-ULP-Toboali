'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const auth = fs.readFileSync('SiSi_BackEnd/Core/Auth-Perangkat.js', 'utf8');
const ttl = fs.readFileSync('SiSi_BackEnd/Core/ZZZZZZZZZZZZZZZZZZZZZ-Device-Token-TTL.js', 'utf8');
const TOKEN = 'device-old';
const props = new Map();
const cache = new Map();
const row = ['', 'user@example.invalid', 'tester', 'password', 'Operator', 'ULP Toboali', 'ULP-TBL', 'Teknik', 'ROW', 'ROW 01', 'Tek-ROW'];
const ctx = {
  COL_USERS: { no: 0, email: 1, userName: 2, password: 3, role: 4, ulp: 5, kodeUlp: 6, bidang: 7, tim: 8, subTim: 9, aksesMenu: 10 },
  SESSION_TTL_SEC: 900,
  PropertiesService: { getScriptProperties: () => ({
    getProperty: (k) => props.get(k) || null,
    setProperty: (k, v) => props.set(k, String(v)),
    deleteProperty: (k) => props.delete(k),
    getProperties: () => Object.fromEntries(props),
  }) },
  CacheService: { getScriptCache: () => ({
    get: (k) => cache.get(k) || null,
    put: (k, v) => cache.set(k, String(v)),
    remove: (k) => cache.delete(k),
  }) },
  Utilities: {
    getUuid: () => '11111111-2222-4333-8444-555555555555',
    computeDigest: () => [1, 2, 3, 4],
    base64Encode: (x) => Array.from(x).join(''),
    Charset: { UTF_8: 'UTF_8' },
    DigestAlgorithm: { SHA_256: 'SHA_256' },
  },
  ContentService: { MimeType: { JSON: 'JSON' }, createTextOutput: (s) => ({ getContent: () => s, setMimeType() { return this; } }) },
  _usersRowsCache_: () => [['header'], row],
  verifikasiLogin_: () => ({ boleh: true }),
  _assertSuperUserKetat_: () => true,
  TRIGGER_SISI_HARIAN: [],
};
vm.createContext(ctx);
vm.runInContext(auth, ctx, { filename: 'Auth-Perangkat.js' });
vm.runInContext(ttl, ctx, { filename: 'Device-Token-TTL.js' });

function record(overrides = {}) {
  return Object.assign({
    username: 'tester',
    pwSig: ctx._devSidik_('password'),
    dibuatPada: Date.now(),
    expiresAt: Date.now() + 30 * 86400000,
    lastSeenAt: Date.now(),
    terakhirDipakai: Date.now(),
    perangkat: 'test',
  }, overrides);
}

test('login issues absolute and idle TTL metadata', () => {
  const result = ctx.loginPerangkat('tester', 'password', 'test');
  assert.equal(result.success, true);
  const stored = JSON.parse(props.get('dev_' + result.deviceToken));
  assert.equal(stored.expiresAt - stored.dibuatPada, 30 * 86400000);
  assert.equal(stored.lastSeenAt, stored.dibuatPada);
  assert.ok(ctx.TRIGGER_SISI_HARIAN.includes('bersihkanPerangkatTerlantar'));
});

test('absolute expiry forces login and deletes the old token', () => {
  props.set('dev-' + TOKEN, JSON.stringify(record({ expiresAt: Date.now() - 1 })));
  const result = ctx.cekPerangkat(TOKEN);
  assert.equal(result.success, false);
  assert.equal(result.kode, 'DEVICE_TOKEN_EXPIRED');
  assert.equal(props.has('dev-' + TOKEN), false);
});

test('idle expiry forces login and deletes the old token', () => {
  props.set('dev-' + TOKEN, JSON.stringify(record({ lastSeenAt: Date.now() - 7 * 86400000 - 1, terakhirDipakai: Date.now() - 7 * 86400000 - 1 })));
  const result = ctx.cekPerangkat(TOKEN);
  assert.equal(result.success, false);
  assert.equal(result.kode, 'DEVICE_TOKEN_EXPIRED');
  assert.equal(props.has('dev-' + TOKEN), false);
});

test('cleanup removes expired tokens but keeps fresh tokens', () => {
  props.set('dev-expired', JSON.stringify(record({ expiresAt: Date.now() - 1 })));
  props.set('dev-fresh', JSON.stringify(record()));
  const result = ctx.bersihkanPerangkatTerlantar();
  assert.equal(result.success, true);
  assert.equal(props.has('dev-expired'), false);
  assert.equal(props.has('dev-fresh'), true);
});
