const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.resolve(__dirname, '../SiSi_BackEnd/Core/Engine-Secrets.js'),
  'utf8',
);

function load(){
  const props = new Map();
  let guardCalls = 0;
  const context = {
    ROLE_SUPER: 'SUPER',
    guard_: (_args, opts) => {
      guardCalls++;
      assert.equal(opts.role.length, 1);
      assert.equal(opts.role[0], 'SUPER');
      assert.equal(opts.superTidakBypass, true);
      return { role: 'SUPER' };
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: key => props.get(key) || '',
        setProperty: () => { throw new Error('secret mutation must be unreachable'); },
        setProperties: () => { throw new Error('secret mutation must be unreachable'); },
      }),
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, props, guardCalls: () => guardCalls };
}

test('legacy engine secret setter is fail-closed and performs no mutation', () => {
  const {context} = load();
  assert.throws(
    () => context.simpanSecretEngineSiSi('a'.repeat(64), 'b'.repeat(64)),
    /hanya boleh diatur operator/,
  );
});

test('legacy webhook secret setter is fail-closed and performs no mutation', () => {
  const {context} = load();
  assert.throws(
    () => context.simpanSecretWebhookSiSi('c'.repeat(64)),
    /hanya boleh diatur operator/,
  );
});

test('secret configuration audit requires explicit Super User guard', () => {
  const c = load();
  c.props.set('WM_ENGINE_SECRET', 'x');
  c.props.set('PDF_ENGINE_SECRET', 'x');
  c.props.set('BA_PDF_SECRET', 'x');
  c.props.set('SISI_WEBHOOK_SECRET', 'x');
  const result = c.context.auditSecretEngineSiSi('session-token');
  assert.equal(c.guardCalls(), 1);
  assert.equal(result.ok, true);
  assert.equal(Object.values(result).some(v => typeof v === 'string'), false);
});

test('source contains no Script Properties writes', () => {
  assert.doesNotMatch(source, /\.setPropert(?:y|ies)\s*\(/);
});
