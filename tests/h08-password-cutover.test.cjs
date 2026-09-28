'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/ZZZZZZZZZZZZZZZZZZZZZZ-Password-Cutover.js'), 'utf8');
const props = new Map();
const calls = [];
const originalFunctions = {
  _verifyPw_: (stored, supplied) =>
    String(stored).startsWith('sisi1$')
      ? supplied === 'anything'
      : stored === supplied,
  verifikasiLogin_: () => ({ boleh: true }),
  cariPasswordTersimpan_: () => ({ ditemukan: true, nilai: 'legacy-pass' }),
  auditPasswordSiSi_: () => ({ ok: true, masihPlaintext: 1 }),
  migrasiPasswordHash_: (opts) => ({ ok: true, kering: opts.kering === true }),
  tambahAkun: () => ({ ok: true }),
  updateAkun: () => ({ ok: true }),
  resetPasswordAkun: () => ({ ok: true }),
  gantiPassword: () => ({ ok: true }),
};
const ctx = {
  Date,
  PropertiesService: { getScriptProperties: () => ({
    getProperty: (key) => props.get(key) || null,
    setProperty: (key, value) => props.set(key, String(value)),
  }) },
  _assertSuperUser: (token) => { if (token !== 'super-token') throw new Error('denied'); },
  _pwSudahHash_: (value) => String(value || '').startsWith('sisi1$'),
  _hashPw_: () => 'sisi1$hash',
  _saltBaru_: () => 'salt',
  audit_: (...args) => calls.push(args),
  ...originalFunctions,
};
vm.createContext(ctx);
vm.runInContext(source, ctx, { filename: 'Password-Cutover.js' });

function setCutoff(ms, locked = '0') {
  props.set('SISI_PW_PLAINTEXT_CUTOFF_AT', String(ms));
  props.set(ctx.H08_PROP_LOCKED, locked);
}

function clearState() {
  props.clear();
  calls.length = 0;
}

test('plaintext fails closed when no explicit cutover window exists', () => {
  clearState();
  assert.equal(ctx._verifyPw_('legacy-pass', 'legacy-pass'), false);
  assert.equal(ctx.verifikasiLogin_('tester', 'legacy-pass').kode, 'PASSWORD_MIGRATION_REQUIRED');
});

test('plaintext is accepted only before the configured cutoff', () => {
  clearState();
  setCutoff(Date.now() + 60_000);
  assert.equal(ctx._verifyPw_('legacy-pass', 'legacy-pass'), true);
});

test('plaintext is rejected and cutover is locked after the deadline', () => {
  clearState();
  setCutoff(Date.now() - 1);
  assert.equal(ctx._verifyPw_('legacy-pass', 'legacy-pass'), false);
  assert.equal(props.get(ctx.H08_PROP_LOCKED), '1');
  assert.equal(ctx.verifikasiLogin_('tester', 'legacy-pass').kode, 'PASSWORD_MIGRATION_REQUIRED');
});

test('hash verification remains available after cutover', () => {
  clearState();
  setCutoff(Date.now() - 1);
  assert.equal(ctx._verifyPw_('sisi1$hash', 'anything'), true);
});

test('migration window is explicit, bounded, and single-use', () => {
  clearState();
  const started = ctx.mulaiMigrasiPassword_('super-token', 3);
  assert.equal(started.ok, true);
  assert.equal(Number(props.get('SISI_PW_PLAINTEXT_CUTOFF_AT')) - Number(props.get('SISI_PW_MIGRATION_STARTED_AT')), 3 * 86400000);
  assert.equal(ctx.mulaiMigrasiPassword_('super-token', 3).kode, 'MIGRATION_ALREADY_STARTED');
});

test('migration and audit require Super User token', () => {
  clearState();
  setCutoff(Date.now() + 60_000);
  assert.equal(ctx.auditPasswordSiSi_('bad').kode, 'AUDIT_FAILED');
  assert.equal(ctx.migrasiPasswordHash_('bad').kode, 'MIGRATION_FAILED');
  assert.deepEqual(ctx.auditPasswordSiSi_('super-token'), { ok: true, masihPlaintext: 1 });
  assert.deepEqual(ctx.migrasiPasswordHash_('super-token', { kering: true }), { ok: true, kering: true });
});

test('plaintext rollback endpoint is permanently blocked', () => {
  clearState();
  assert.equal(ctx.kembalikanPasswordPlaintext_('super-token', 'tester', 'pw').kode, 'PLAINTEXT_PASSWORD_FORBIDDEN');
});

test('account writes fail closed if the hash module is unavailable', () => {
  clearState();
  const hasher = ctx._hashPw_;
  ctx._hashPw_ = undefined;
  assert.equal(ctx.tambahAkun('super-token', {}).kode, 'HASH_MODULE_MISSING');
  ctx._hashPw_ = hasher;
});
