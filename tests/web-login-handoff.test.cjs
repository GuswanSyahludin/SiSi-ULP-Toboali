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
function gas({ valid = true, ulp = 'ULP Toboali', html = loginFixture,
  serviceUrl = 'https://script.google.com/macros/s/fixture/exec' } = {}) {
  let content = html;
  const reads = [], calls = [];
  const output = { getContent: () => content, setContent(v) { content = v; },
    setXFrameOptionsMode() {} };
  const ctx = vm.createContext({
    ScriptApp: { getService: () => ({ getUrl: () => serviceUrl }) },
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
  assert.doesNotMatch(f.content(), /window\.top\.location\.href="exec"/);
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
  assert.match(res.html, /id="sisiLogoutUrl" value="https:\/\/script\.google\.com\/macros\/s\/fixture\/exec"/);
  assert.deepEqual(f.reads, ['Core/Main', 'Core/Web-Login-Bootstrap']);
});
test('shell never returns unsanitized HTML when security boundary is unavailable', () => {
  const f = gas();
  vm.runInContext('_sanitizeWebHtmlSecurity_ = undefined', f.ctx);
  assert.throws(() => f.ctx.getWebAppShell('valid'));
});
function browser({ stored = null, blocked = false, corruptWrites = false, logout = '' } = {}) {
  const nodes = {};
  const data = new Map(stored == null ? [] : [['sisiSesi', stored]]);
  const pending = [], writes = [], history = [];
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
  node('hdnLogout').value = logout;
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
    google: { script: { run: runner(), history:{replace(...args){history.push(args);}} } },
    window: { top: { location: new Proxy({}, { set(){ assert.fail('must not navigate'); } }) } }
  });
  vm.runInContext(script, ctx);
  return { nodes, data, pending, writes, history, counts: () => [opened, closed],
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

test('logout return is marked by doGet and skips stale session restoration', () => {
  for (const logout of ['1', '2']) {
    const g = gas();
    g.ctx.doGet({parameter:{logout}});
    assert.match(g.content(), new RegExp('id="hdnLogout" value="' + logout + '"'));
    const b = browser({stored:JSON.stringify({token:'stale'}), logout});
    assert.equal(b.pending.length, 0);
    assert.equal(b.data.has('sisiSesi'), false);
    b.submit();
    assert.equal(b.pending[0].method, 'login');
    b.pending[0].success({success:true,token:'valid'});
    b.pending[1].success(shell);
    assert.equal(b.history.length,1);
    assert.equal(JSON.stringify(b.history[0]),'[{}, {}, ""]'.replace(/ /g,''));
  }
  const blocked = browser({stored:JSON.stringify({token:'stale'}), logout:'1', blocked:true});
  assert.equal(blocked.pending.length, 0);
});

test('logout URL is server-derived and rejects foreign hosts; marker cannot inject HTML', () => {
  const f=gas({serviceUrl:'https://script.google.com/macros/s/fixture/exec?token=do-not-leak#secret'});
  const result=f.ctx.getWebAppShell('valid');
  assert.doesNotMatch(result.html,/do-not-leak|#secret/);
  for(const serviceUrl of ['', 'javascript:alert(1)', 'https://evil.example/exec']) {
    assert.throws(()=>gas({serviceUrl}).ctx.getWebAppShell('valid'),/URL login deployment/);
  }
  const injected=gas();
  injected.ctx.doGet({parameter:{logout:'1"><script>evil</script>'}});
  assert.doesNotMatch(injected.content(),/id="hdnLogout" value=/);
});

function logoutBrowser({ blocked = false, storageBlocked = false, token = 'session-secret',
  url = 'https://script.google.com/macros/s/fixture/exec' } = {}) {
  const pending = [], navigated = [], timers = [], cleared = [], panel = [];
  const data = new Map([['sisiSesi','old'],['sisiScriptUrl','wrong'],['baDraft','keep']]);
  function node() {
    return {style:{},children:[],appendChild(n){this.children.push(n);}};
  }
  const ctx = vm.createContext({
    document: {
      getElementById: id => id === 'sisiLogoutUrl' ? {value:url} : null,
      createElement: node,
      body:{replaceChildren(n){panel.push(n);}},
    },
    sessionStorage:{removeItem(k){if(storageBlocked) throw Error('blocked');data.delete(k);}},
    _state:{token,sesi:{token}}, __SISI_SESI__:{token}, __SISI_PAGE__:'Private',
    _getToken:()=>token, _notifTimer:7,
    _munculkanMain(){throw Error('stale splash must not reopen app');},
    setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},
    clearTimeout(id){cleared.push(id);}, clearInterval(id){cleared.push(id);},
    google:{script:{run:runner()}},
  });
  function runner(success,failure) {
    return {
      withSuccessHandler(fn){return runner(fn,failure);},
      withFailureHandler(fn){return runner(success,fn);},
      doLogout(...args){pending.push({args,success,failure});},
    };
  }
  ctx.window=ctx;
  ctx.top={location:{set href(v){if(blocked) throw Error('sandbox');navigated.push(v);}}};
  vm.runInContext(script,ctx);
  return {ctx,pending,navigated,timers,cleared,panel,data};
}
test('logout sends the original token once, clears session only, and waits for server result', () => {
  const f=logoutBrowser();
  f.ctx.doLogout(); f.ctx.doLogout(); f.ctx._munculkanMain();
  assert.equal(f.pending.length,1);
  assert.deepEqual(f.pending[0].args,['session-secret']);
  assert.equal(f.navigated.length,0);
  assert.equal(f.ctx._state.token,'');
  assert.equal(f.ctx.__SISI_SESI__,null);
  assert.equal(f.ctx._getToken(),'');
  assert.equal(f.data.has('sisiSesi'),false);
  assert.equal(f.data.get('baDraft'),'keep');
  assert.ok(f.cleared.includes(7));
  f.pending[0].success({success:true});
  assert.equal(f.navigated.length,1);
  assert.match(f.navigated[0],/^https:\/\/script\.google\.com\/macros\/s\/fixture\/exec\?logout=1&reload=\d+$/);
  assert.doesNotMatch(f.navigated[0],/session-secret|token|googleusercontent/);
  f.pending[0].success({success:true});f.timers[0].fn();
  assert.equal(f.navigated.length,1);
});
test('blocked top navigation leaves a real top-level login link, not iframe reload', () => {
  const f=logoutBrowser({blocked:true,storageBlocked:true});
  f.ctx.doLogout();f.pending[0].success({success:true});
  const link=f.panel[0].children[1];
  assert.equal(link.target,'_top');
  assert.match(link.href,/\?logout=1&reload=/);
  assert.equal(f.navigated.length,0);
});
test('logout failures and timeouts do not claim server revocation and ignore late callbacks', () => {
  for(const mode of ['failure','false','timeout']) {
    const f=logoutBrowser();f.ctx.doLogout();
    if(mode==='failure')f.pending[0].failure(Error('secret detail'));
    if(mode==='false')f.pending[0].success({success:false,message:'secret detail'});
    if(mode==='timeout')f.timers[0].fn();
    assert.match(f.navigated[0],/\?logout=2&reload=/);
    assert.match(f.panel[0].children[0].textContent,/belum terkonfirmasi/);
    assert.doesNotMatch(f.panel[0].children[0].textContent,/secret detail/);
    f.pending[0].success({success:true});
    assert.equal(f.navigated.length,1);
  }
});
test('logout rejects unsafe destination and handles missing token without RPC', () => {
  const bad=logoutBrowser({url:'https://evil.example/exec?token=x'});
  bad.ctx.doLogout();bad.pending[0].success({success:true});
  assert.equal(bad.navigated.length,0);
  assert.equal(bad.panel[0].children.length,1);
  const empty=logoutBrowser({token:''});empty.ctx.doLogout();
  assert.equal(empty.pending.length,0);
  assert.match(empty.navigated[0],/\?logout=1&reload=/);
  const top=logoutBrowser();
  top.ctx.top=top.ctx;
  top.ctx.location={replace:url=>top.navigated.push(url)};
  top.ctx.doLogout();top.pending[0].success({success:true});
  assert.match(top.navigated[0],/\?logout=1&reload=/);
});
for (const prefix of ['macros', 'a/ulptoboali.com/macros', 'a/macros/ulptoboali.com',
  'a/sub-domain.example.co.id/macros', 'a/macros/sub-domain.example.co.id']) {
  for (const mode of ['exec', 'dev']) {
    test('Workspace URL survives authenticated shell and logout: ' + prefix + '/' + mode, () => {
      const url = 'https://script.google.com/' + prefix + '/s/fixture_ABC-123/' + mode;
      const f = gas({serviceUrl:url + '?token=never-expose#secret'});
      const result = f.ctx.getWebAppShell('valid');
      assert.equal(result.success, true);
      const injected = result.html.match(/id="sisiLogoutUrl" value="([^"]+)"/)[1];
      assert.equal(injected, url);
      assert.doesNotMatch(result.html, /never-expose|#secret/);
      const b = logoutBrowser({url:injected});
      b.ctx.doLogout(); b.pending[0].success({success:true});
      assert.equal(b.navigated.length, 1);
      assert.ok(b.navigated[0].startsWith(url + '?logout=1&reload='));
      assert.doesNotMatch(b.navigated[0], /session-secret/);
      const denied = gas({serviceUrl:url, valid:false});
      assert.throws(() => denied.ctx.getWebAppShell('valid'), /access denied/);
      assert.equal(denied.reads.length, 0);
    });
  }
}
test('server and logout reject malformed Workspace paths and hostile destinations', () => {
  const host = 'https://script.google.com';
  const bad = [
    'http://script.google.com/macros/s/id/exec',
    'https://script.google.com.evil.example/macros/s/id/exec',
    'https://script.google.com@evil.example/macros/s/id/exec',
    'https://evil.example@script.google.com/macros/s/id/exec',
    '//script.google.com/macros/s/id/exec',
    host + ':443/macros/s/id/exec',
    host + '/macros/a/example.com/s/id/exec',
    host + '/a//macros/s/id/exec',
    host + '/a/../macros/s/id/exec',
    host + '/a/-bad.example/macros/s/id/exec',
    host + '/a/bad..example/macros/s/id/exec',
    host + '/a/macros/example.com/../s/id/exec',
    host + '/a/macros/example.com/s/id%2fother/exec',
    host + '/a/macros/example.com/s/id/exec/extra',
    host + '/macros/s/id/exec\n',
    host + '/macros/s/id/exec"><script>bad</script>',
  ];
  for (const url of bad) {
    assert.throws(() => gas({serviceUrl:url}).ctx.getWebAppShell('valid'),
      /URL login deployment/, url);
    const b = logoutBrowser({url});
    b.ctx.doLogout(); b.pending[0].success({success:true});
    assert.equal(b.navigated.length, 0, url);
    assert.equal(b.panel[0].children.length, 1, url);
  }
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
