'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'SiSi_BackEnd', 'Core', 'Superuser-Password-Recovery.js'),
  'utf8',
);

function harness(options = {}) {
  const props = new Map(Object.entries({
    SISI_PW_PEPPER: 'existing-pepper',
    SISI_SUPERUSER_RECOVERY_EDITOR_EMAIL: 'owner@example.com',
    SISI_SUPERUSER_RECOVERY_USERNAME: 'root-user',
    SISI_SUPERUSER_RECOVERY_PASSWORD: 'new-unique-password-2030',
    ...(options.properties || {}),
  }));
  const rows = options.rows || [
    ['No', 'Email', 'Username', 'Password', 'Role'],
    [1, 'root@example.com', 'root-user', 'old-plaintext', 'Super User'],
    [2, 'admin@example.com', 'Admin', 'admin-plaintext', 'Admin'],
    [3, 'staff@example.com', 'staff', 'sisi1$existing-hash', 'Staff'],
  ];
  const writes = [];
  const audits = [];
  const state = { locked: false, released: false, cacheBusted: 0, throttleReset: 0 };
  const sheet = {
    getDataRange: () => ({ getValues: () => rows.map(row => row.slice()) }),
    getRange(row, col) {
      return { setValue(value) { writes.push({ row, col, value }); rows[row - 1][col - 1] = value; } };
    },
  };
  const ctx = {
    SPREADSHEET_ID: 'fixture',
    COL_USERS: { no: 0, email: 1, userName: 2, password: 3, role: 4 },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => props.get(key) || null,
      deleteProperty(key) { props.delete(key); },
    }) },
    Session: {
      getActiveUser: () => ({ getEmail: () => options.activeEmail === undefined ? 'owner@example.com' : options.activeEmail }),
      getEffectiveUser: () => ({ getEmail: () => options.effectiveEmail === undefined ? 'owner@example.com' : options.effectiveEmail }),
    },
    LockService: { getScriptLock: () => ({
      tryLock: () => { state.locked = true; return options.lock !== false; },
      releaseLock: () => { state.released = true; },
    }) },
    SpreadsheetApp: {
      openById: id => {
        assert.equal(id, 'fixture');
        return { getSheetByName: name => name === 'db_Users' ? sheet : null };
      },
      flush() {},
    },
    _normRole_: value => String(value || '').toLowerCase().replace(/[\s_-]/g, '') === 'superuser'
      ? 'SUPER' : String(value || '').toUpperCase(),
    _pwSudahHash_: value => String(value || '').startsWith('sisi1$'),
    _saltBaru_: () => 'fresh-salt',
    _hashPw_: (password, salt) => `sisi1$${salt}$hash:${password}`,
    loginThrottleReset_: () => { state.throttleReset++; },
    _bustUsersCache_: () => { state.cacheBusted++; },
    audit_: (...args) => audits.push(args),
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  return { ctx, props, rows, writes, audits, state };
}

test('only explicitly allowed editor identity can invoke recovery', () => {
  for (const options of [
    { activeEmail: '' },
    { activeEmail: 'other@example.com' },
    { effectiveEmail: 'other@example.com' },
  ]) {
    const h = harness(options);
    assert.throws(() => h.ctx.recoverLockedSuperUserOnce(), /Recovery ditolak/);
    assert.equal(h.writes.length, 0);
  }
});

test('recovery fails closed if the existing password pepper is missing', () => {
  const h = harness({ properties: { SISI_PW_PEPPER: '' } });
  assert.throws(() => h.ctx.recoverLockedSuperUserOnce(), /Pepper password tidak ditemukan/);
  assert.equal(h.writes.length, 0);
});

test('recovery only resets one plaintext Super User and stores a hash', () => {
  const h = harness();
  const result = h.ctx.recoverLockedSuperUserOnce();
  assert.equal(result.ok, true);
  assert.equal(h.rows[1][3], 'sisi1$fresh-salt$hash:new-unique-password-2030');
  assert.equal(h.rows[2][3], 'admin-plaintext');
  assert.equal(h.rows[3][3], 'sisi1$existing-hash');
  assert.equal(h.writes.length, 1);
  assert.equal(h.state.cacheBusted, 1);
  assert.equal(h.state.throttleReset, 1);
  assert.equal(h.state.released, true);
  assert.equal(h.props.has('SISI_SUPERUSER_RECOVERY_EDITOR_EMAIL'), false);
  assert.equal(h.props.has('SISI_SUPERUSER_RECOVERY_USERNAME'), false);
  assert.equal(h.props.has('SISI_SUPERUSER_RECOVERY_PASSWORD'), false);
  assert.doesNotMatch(JSON.stringify(h.audits), /new-unique-password-2030/);
});

test('recovery refuses Admin, an already-hashed Super User, and ambiguous target', () => {
  const admin = harness({ properties: {
    SISI_SUPERUSER_RECOVERY_USERNAME: 'Admin',
  } });
  assert.throws(() => admin.ctx.recoverLockedSuperUserOnce(), /bukan akun Super User/);
  assert.equal(admin.writes.length, 0);

  const hashed = harness({ rows: [
    ['No', 'Email', 'Username', 'Password', 'Role'],
    [1, 'root@example.com', 'root-user', 'sisi1$already-hash', 'Super User'],
  ] });
  assert.throws(() => hashed.ctx.recoverLockedSuperUserOnce(), /tidak memiliki password plaintext/);
  assert.equal(hashed.writes.length, 0);

  const duplicate = harness({ rows: [
    ['No', 'Email', 'Username', 'Password', 'Role'],
    [1, 'root@example.com', 'root-user', 'old-one', 'Super User'],
    [2, 'root2@example.com', 'ROOT-USER', 'old-two', 'Super User'],
  ] });
  assert.throws(() => duplicate.ctx.recoverLockedSuperUserOnce(), /tepat satu akun/);
  assert.equal(duplicate.writes.length, 0);
});

test('recovery rejects a weak new password without changing the account', () => {
  const h = harness({ properties: { SISI_SUPERUSER_RECOVERY_PASSWORD: 'short' } });
  assert.throws(() => h.ctx.recoverLockedSuperUserOnce(), /Property recovery tidak valid/);
  assert.equal(h.writes.length, 0);
});
