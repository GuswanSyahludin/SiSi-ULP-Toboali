'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = path.join(__dirname, '../SiSi_BackEnd/Core');
const adapter = fs.readFileSync(path.join(core, 'ZZ-Web-Security-DoGet.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(core, 'Web-Login-Bootstrap.html'), 'utf8');
const script = bootstrap.match(/<script>([\s\S]*)<\/script>/)[1];
const security = fs.readFileSync(path.join(core, 'ZZ-Web-Security-Hardening.js'), 'utf8');
// Representative inputs for mocked GAS boundary tests, not deployed HTML.
const loginFixture = '<html><body><form id="frmLogin">keep-design</form>' +
  '<script>google.script.run.doLogin("user","password");window.top.location.href="exec";</script></body></html>';
const mainFixture = String.raw`<html><head><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"></head><body>
<script>function _getToken(){var m = window.location.search.match(/[?&]token=([^&]+)/); return m ? m[1] : "";}</script>
</body></html>`;
function gas({ valid = true, ulp = 'ULP Toboali', html = loginFixture } = {}) {
  let content = html;
  const reads = [], calls = [];
  const output = { getContent: () => content, setContent(v) { content = v; },
    setXFrameOptionsMode() {} };
  const ctx = vm.createContext({
    doGet: e => { calls.push(e); return output; },
    guard_(args, opts) {
      assert.equal(opts.ulp, true);
      assert.equal(opts.aksi, 'getWebAppShell');
      if (!valid || args[0] !== 'valid' || !ulp) throw new Error('access denied');
      return { token: args[0], sesi: { username: 'server-user', ulp, role: 'Staff',
        bidang: 'Teknik', aksesMenu: 'Tek-Dashboard', subTim: 'ROW 01', password: 'never-return' } };
    },
    HtmlService: {
      createHtmlOutputFromFile(name) {
        reads.push(name);
        assert.equal(name, 'Core/Web-Login-Bootstrap');
        return { getContent: () => bootstrap };
      },
      createTemplateFromFile(name) {
        reads.push(name); assert.equal(name, 'Core/Main');
        return { evaluate: () => ({ getContent: () => mainFixture }) };
      }
    }
  });
  vm.runInContext(security, ctx);
  vm.runInContext(adapter, ctx);
  return { ctx, reads, calls, output, content: () => content };
}
test('rendered login replaces rather than appends legacy redirect script and preserves design', () => {
  const f = gas(), event = { parameter: {} };
  assert.equal(f.ctx.doGet(event), f.output);
  assert.equal(f.calls[0], event);
  assert.match(f.content(), /keep-design/);
  assert.doesNotMatch(f.content(), /window\.top\.location/);
  assert.equal((f.content().match(/<script>/g) || []).length, 1);
  assert.match(f.content(), /getWebAppShell\(token\)/);
});
test('unexpected login scripts fail closed instead of restoring legacy redirect', () => {
  const f = gas({ html: loginFixture.replace('</body>', '<script>extra()</script></body>') });
  assert.throws(() => f.ctx.doGet({}), /Kontrak bootstrap/);
});
test('ordinary non-login HTML and API responses preserve original routing', () => {
  const f = gas({ html: '<body>other</body>' });
  f.ctx.doGet({ parameter: { pdf: 'test' } });
  assert.equal(f.content(), '<body>other</body>');
  assert.equal(f.reads.length, 0);
  const out = { getContent: () => '{"ok":true}' };
  const ctx = vm.createContext({ doGet: () => out });
  vm.runInContext(adapter, ctx);
  assert.equal(ctx.doGet({ parameter: { mobile: '1' } }), out);
});
test('shell rejects missing, expired and unscoped sessions before HTML reads', () => {
  for (const [opts, token] of [[{}, ''], [{}, 'invalid'], [{valid:false}, 'valid'], [{ulp:''}, 'valid']]) {
    const f = gas(opts);
    assert.throws(() => f.ctx.getWebAppShell(token), /access denied/);
    assert.equal(f.reads.length, 0);
  }
});
test('shell returns server identity, sanitized HTML and startup controller without password', () => {
  const f = gas(), res = f.ctx.getWebAppShell('valid', { role: 'Super User' });
  assert.equal(res.success, true);
  assert.equal(res.sesi.role, 'Staff');
  assert.equal(res.sesi.username, 'server-user');
  assert.equal(res.sesi.subTim, 'ROW 01');
  assert.equal(res.sesi.password, undefined);
  assert.doesNotMatch(res.html, /window\.location\.search\.match|font-awesome\/6\.5\.0/);
  assert.match(res.html, /integrity="sha512-/);
  assert.match(res.html, /originalStart/);
  assert.deepEqual(f.reads, ['Core/Main', 'Core/Web-Login-Bootstrap']);
});
test('shell never returns unsanitized HTML when security boundary is unavailable', () => {
  const f = gas();
  vm.runInContext('_sanitizeWebHtmlSecurity_ = undefined', f.ctx);
  assert.throws(() => f.ctx.getWebAppShell('valid'));
});
function browser({ stored = null, blocked = false, corruptWrites = false } = {}) {
  const nodes = {};
  const data = new Map(stored == null ? [] : [['sisiSesi', stored]]);
  const pending = [], writes = [];
  let opened = 0, closed = 0;
  function node(id) {
    return nodes[id] || (nodes[id] = { value: '', textContent: '', innerHTML: '',
      disabled: false, style: {}, handlers: {}, attributes: {},
      classList: { add() {}, remove() {} },
      addEventListener(name, fn) { this.handlers[name] = fn; },
      removeAttribute(name) { delete this.attributes[name]; }
    });
  }
  node('hdnScriptUrl').value = 'https://script.google.com/macros/s/fixture/exec';
  const storage = {
    getItem(k) { if (blocked) throw new Error('storage blocked'); return data.get(k) || null; },
    setItem(k,v) { if (blocked) throw new Error('storage blocked'); if (!corruptWrites) data.set(k,v); },
    removeItem(k) { if (blocked) throw new Error('storage blocked'); data.delete(k); }
  };
  function runner(success, failure) {
    return {
      withSuccessHandler(fn) { return runner(fn, failure); },
      withFailureHandler(fn) { return runner(success, fn); },
      doLogin(...args) { pending.push({ method:'login', args, success, failure }); },
      getWebAppShell(...args) { pending.push({ method:'shell', args, success, failure }); }
    };
  }
  const ctx = vm.createContext({
    document: { getElementById: node, open(){opened++;}, write(h){writes.push(h);}, close(){closed++;} },
    sessionStorage: storage,
    google: { script: { run: runner() } },
    window: { top: { location: new Proxy({}, { set(){ assert.fail('must not navigate'); } }) }
  });
  vm.runInContext(script, ctx);
  return { nodes, data, pending, writes, counts: () => [opened, closed],
    submit() {
      node('inpUser').value = 'user'; node('inpPass').value = 'password';
      node('frmLogin').handlers.submit({preventDefault(){}});
    }
  };
}
const shell = { success: true, html: '<html>trusted-main</html>',
  sesi: { token: 'valid', role: 'Staff', username: 'server-user', ulp: 'ULP Toboali' } };
test('successful login hands off inside the same document only after server session verification', () => {
  const f = browser();
  f.submit(); f.submit();
  assert.equal(f.pending.length, 1, 'duplicate submits are ignored');
  f.pending[0].success({success:true, token:'valid', role:'untrusted'});
  assert.equal(f.pending[1].method, 'shell');
  assert.deepEqual(f.pending[1].args, ['valid']);
  assert.equal(f.data.has('sisiSesi'), false);
  assert.equal(f.writes.length, 0);
  f.pending[1].success(shell);
  assert.equal(JSON.parse(f.data.get('sisiSesi')).role, 'Staff');
  assert.equal(f.nodes.inpPass.value, '');
  assert.deepEqual(f.writes, [shell.html]);
  assert.deepEqual(f.counts(), [1, 1]);
  f.pending[1].success(shell);
  assert.equal(f.writes.length, 1, 'duplicate shell callback cannot rewrite twice');
});
test('refresh validates stored token and replaces forged cached metadata', () => {
  const f = browser({stored: JSON.stringify({token:'valid', role:'Super User'})});
  assert.equal(f.pending[0].method, 'shell');
  f.pending[0].success(shell);
  assert.equal(JSON.parse(f.data.get('sisiSesi')).role, 'Staff');
  assert.deepEqual(f.writes, [shell.html]);
});
test('expired session or RPC failure stops automatic retry and leaves usable login form', () => {
  const f = browser({stored: JSON.stringify({token:'expired'})});
  f.pending[0].failure(new Error('private-token-do-not-show'));
  assert.equal(f.nodes.btnLogin.disabled, false);
  assert.equal(f.data.has('sisiSesi'), false);
  assert.equal(f.pending.length, 1);
  assert.equal(f.writes.length, 0);
  assert.doesNotMatch(f.nodes.errBox.textContent, /private-token/);
  f.submit();
  assert.equal(f.pending[1].method, 'login');
});
test('blocked or silently discarded storage produces an error instead of false successful navigation', () => {
  for (const options of [{blocked:true}, {corruptWrites:true}]) {
    const f = browser(options);
    f.submit(); f.pending[0].success({success:true,token:'valid'});
    f.pending[1].success(shell);
    assert.equal(f.writes.length, 0);
    assert.equal(f.nodes.btnLogin.disabled, false);
    assert.match(f.nodes.errBox.textContent, /Penyimpanan sesi/);
  }
});
test('malformed storage and unsuccessful login do not navigate or request a shell', () => {
  const f = browser({stored:'{broken'});
  assert.equal(f.pending.length, 0);
  f.submit(); f.pending[0].success({success:false, message:'secret backend detail'});
  assert.equal(f.pending.length, 1);
  assert.equal(f.writes.length, 0);
  assert.equal(f.nodes.btnLogin.disabled, false);
  assert.doesNotMatch(f.nodes.errBox.textContent, /secret backend/);
});
test('mismatched shell token is rejected before storage or document writes', () => {
  const f = browser();
  f.submit(); f.pending[0].success({success:true,token:'valid'});
  f.pending[1].success({...shell, sesi:{token:'different'}});
  assert.equal(f.writes.length, 0);
  assert.equal(f.data.has('sisiSesi'), false);
});
test('dashboard selection respects field and menu access; no access never grants a menu', () => {
  for (const [bidang, allowed, menus, expected] of [
    ['Teknik', ['Tek-Dashboard'], ['Tek'], 'Tek'],
    ['PP', ['PP-Dashboard', 'Tek-Dashboard'], ['PP','Tek'], 'PP'],
    ['TE', ['TE-Dashboard'], ['TE'], 'TE'],
    ['K3', ['K3-Dashboard'], ['K3'], 'K3'],
    ['Teknik', [], ['Tek'], 'Tek'],
    ['Teknik', [], [], null]
  ]) {
    let started = 0;
    const visited = [];
    const ctx = vm.createContext({
      document: {getElementById: () => null},
      _state: {sesi:{bidang}}, _munculkanMain(){started++;},
      _isPageAllowed: p => allowed.includes(p),
      _navHasAccess: n => menus.includes(n),
      onNavClick: n => visited.push(n)
    });
    ctx.window = ctx;
    vm.runInContext(script, ctx);
    ctx._munculkanMain();
    assert.equal(started, 1);
    assert.deepEqual(visited, expected ? [expected] : []);
  }
});
