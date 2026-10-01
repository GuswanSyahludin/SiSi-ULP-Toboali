'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

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
  const state = { locked: false, released: false, cacheBusted: 0, throttleReset: 0, opened: 0, propertiesRead: [] };
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
      getProperty: key => { state.propertiesRead.push(key); return props.get(key) || null; },
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
        state.opened++;
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
  if (options.identityError) ctx.Session.getActiveUser = () => { throw new Error('identity unavailable'); };
  if (options.effectiveIdentityError) ctx.Session.getEffectiveUser = () => { throw new Error('identity unavailable'); };
  vm.createContext(ctx);
  // Simulate the explicit HEAD-only source edit, never a runtime property/arg.
  const runtimeSource = options.armed === false ? source : source.replace(
    'const SISI_RECOVERY_EDITOR_ONLY_ARMED = false;',
    'const SISI_RECOVERY_EDITOR_ONLY_ARMED = true;',
  );
  vm.runInContext(runtimeSource, ctx);
  return { ctx, props, rows, writes, audits, state };
}

 test('only explicitly allowed editor identity can invoke recovery', () => {
  for (const options of [
    { activeEmail: '' },
    { effectiveEmail: '' },
    { activeEmail: 'other@example.com' },
    { effectiveEmail: 'other@example.com' },
    { activeEmail: 'other@example.com', effectiveEmail: 'other@example.com' },
    { properties: { SISI_SUPERUSER_RECOVERY_EDITOR_EMAIL: '' } },
    { identityError: true },
    { effectiveIdentityError: true },
  ]) {
    const h = harness(options);
    assert.throws(() => h.ctx.recoverLockedSuperUserOnce(), /Recovery ditolak/);
    assert.equal(h.writes.length, 0);
    assert.equal(h.state.opened, 0);
    assert.equal(h.state.locked, false);
    assert.equal(h.state.propertiesRead.includes('SISI_SUPERUSER_RECOVERY_PASSWORD'), false);
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

 test('deployed default denies recovery even for the allowed Google owner', () => {
  const h = harness({ armed: false, properties: { SISI_RECOVERY_EDITOR_ONLY_ARMED: 'true' } });
  assert.throws(() => h.ctx.recoverLockedSuperUserOnce(), /Recovery nonaktif/);
  assert.equal(h.writes.length, 0);
  assert.equal(h.state.opened, 0);
  assert.equal(h.state.propertiesRead.length, 0);
});

 test('armed recovery refuses caller-supplied token, identity, and internal flags', () => {
  for (const arg of [undefined, 'token', { editor: true, internal: true, email: 'owner@example.com' }]) {
    const h = harness();
    assert.throws(() => h.ctx.recoverLockedSuperUserOnce(arg), /argumen/);
    assert.equal(h.state.opened, 0);
    assert.equal(h.state.propertiesRead.length, 0);
  }
});

 test('identity normalization works but arming is not proof of editor origin', () => {
  const h = harness({ activeEmail: ' OWNER@example.com ', effectiveEmail: 'Owner@Example.com' });
  assert.equal(h.ctx.recoverLockedSuperUserOnce().ok, true);
  // These identities can also occur for the owner in web execution: the
  // deployment boundary is the source-only default-off switch, not Session.
  assert.throws(() => h.ctx.recoverLockedSuperUserOnce(), /Recovery ditolak/);
  assert.equal(h.writes.length, 1);
});

 test('busy lock and failed hashing cannot modify the target', () => {
  const busy = harness({ lock: false });
  assert.throws(() => busy.ctx.recoverLockedSuperUserOnce(), /Project sibuk/);
  assert.equal(busy.state.opened, 0);
  const badHash = harness();
  badHash.ctx._hashPw_ = () => 'not-a-hash';
  assert.throws(() => badHash.ctx.recoverLockedSuperUserOnce(), /Hasher gagal/);
  assert.equal(badHash.writes.length, 0);
  assert.equal(badHash.state.released, true);
});

const root = path.join(__dirname, '..');
const auditSource = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/Audit-Guard.js'), 'utf8');
function runGate(recoverySource, extra = '', filename = 'Superuser-Password-Recovery.js') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sisi-recovery-gate-'));
  try {
    fs.mkdirSync(path.join(dir, 'Core'));
    fs.writeFileSync(path.join(dir, 'Core/Audit-Guard.js'), 'var AUDIT_ABAIKAN = [];');
    fs.writeFileSync(path.join(dir, 'Core', filename), recoverySource);
    if (extra) fs.writeFileSync(path.join(dir, 'Core/other.js'), extra);
    const command = process.platform === 'win32' ? 'py' : 'python3';
    const prefix = process.platform === 'win32' ? ['-3'] : [];
    const result = spawnSync(command, [...prefix, path.join(root, 'scripts/audit_gate.py'), dir], { encoding: 'utf8' });
    if (result.error) throw result.error;
    return result;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

 test('static gate recognizes real recovery guard without allowlisting its entry', () => {
  const result = runGate(source);
  assert.equal(result.status, 0, result.stderr);
  const h = harness({ armed: false });
  vm.runInContext(auditSource, h.ctx);
  assert.equal(h.ctx.AUDIT_ABAIKAN.includes('recoverLockedSuperUserOnce'), false);
  assert.equal(h.ctx._auditSatuFungsi_('recoverLockedSuperUserOnce', h.ctx.recoverLockedSuperUserOnce).terjaga, true);
});

 test('static and runtime audits reject recovery with a missing or late guard', () => {
  for (const replacement of [
    'var props = PropertiesService.getScriptProperties();',
    'sheet.getValues(); var props = _assertRecoveryEditor_(arguments);',
    '/* var props = _assertRecoveryEditor_(arguments); */ var props = PropertiesService.getScriptProperties();',
  ]) {
    const changed = source.replace('var props = _assertRecoveryEditor_(arguments);', replacement);
    const result = runGate(changed);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /guard recovery wajib/);
    const ctx = vm.createContext({});
    vm.runInContext(changed, ctx);
    vm.runInContext(auditSource, ctx);
    assert.equal(ctx._auditSatuFungsi_('recoverLockedSuperUserOnce', ctx.recoverLockedSuperUserOnce).terjaga, false);
  }
});

 test('static gate refuses armed or mutable recovery source and missing private guard', () => {
  for (const changed of [
    source.replace('const SISI_RECOVERY_EDITOR_ONLY_ARMED = false;', 'const SISI_RECOVERY_EDITOR_ONLY_ARMED = true;'),
    source.replace('const SISI_RECOVERY_EDITOR_ONLY_ARMED = false;', 'var SISI_RECOVERY_EDITOR_ONLY_ARMED = false;'),
    source.replace('function _assertRecoveryEditor_', 'function _missingRecoveryEditor_'),
    source.replace('if (SISI_RECOVERY_EDITOR_ONLY_ARMED !== true)', 'if (false)'),
  ]) {
    const result = runGate(changed);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /recovery wajib nonaktif/);
  }
  const h = harness();
  vm.runInContext(auditSource, h.ctx);
  assert.equal(h.ctx._auditSatuFungsi_('recoverLockedSuperUserOnce', h.ctx.recoverLockedSuperUserOnce).terjaga, false);
});

 test('editor guard cannot authorize other endpoints or a relocated recovery entry', () => {
  for (const extra of [
    'function readData() { return sheet.getValues(); }',
    'function writeData() { return sheet.appendRow([1]); }',
    'function otherEndpoint() { var props = _assertRecoveryEditor_(arguments); return sheet.getValues(); }',
  ]) {
    const result = runGate(source, extra);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /endpoint baca\/tulis tanpa guard wajib/);
    const h = harness({ armed: false });
    vm.runInContext(auditSource, h.ctx);
    vm.runInContext(extra, h.ctx);
    const name = extra.match(/function (\w+)/)[1];
    assert.equal(h.ctx._auditSatuFungsi_(name, h.ctx[name]).terjaga, false);
  }
  assert.notEqual(runGate(source, '', 'relocated.js').status, 0);
  const guarded = runGate(source, 'function writeData() { guard_(arguments, {}); return sheet.appendRow([1]); }');
  assert.equal(guarded.status, 0, guarded.stderr);
});
