'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/PageLoader-Compat.js'), 'utf8');
const hardening = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/ZZ-Web-Security-Hardening.js'), 'utf8');
const doGet = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/ZZ-Web-Security-DoGet.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'SiSi_BackEnd/appsscript.json'), 'utf8'));
const integrity = 'sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==';

// Representative legacy input, NOT a deployment/load-order simulation.
// Run the actual sanitizer, doGet adapter and PageLoader against mocked GAS.
const legacyHtml = String.raw`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<script>
function fixtureToken() {
  if (window.sessionToken) return window.sessionToken;
  var m = window.location.search.match(/[?&]token=([^&]+)/);
  return m ? m[1] : "";
}
</script><p>keep-page-content</p>`;

function context(extra = {}) {
  const ctx = vm.createContext(extra);
  vm.runInContext(hardening, ctx, { filename: 'ZZ-Web-Security-Hardening.js' });
  return ctx;
}

function assertProtected(html, linkCount = 1) {
  assert.doesNotMatch(html, /font-awesome\/6\.5\.0\//);
  assert.doesNotMatch(html, /window\.location\.search\.match/);
  const links = html.match(/<link\b[^>]*>/gi) || [];
  assert.equal(links.length, linkCount);
  for (const link of links) {
    assert.ok(link.includes('font-awesome/6.5.1/css/all.min.css'));
    assert.ok(link.includes(`integrity="${integrity}"`));
    assert.match(link, /crossorigin="anonymous"/);
    assert.match(link, /referrerpolicy="no-referrer"/);
  }
  assert.ok(html.includes('keep-page-content'));
}

test('manifest is parseable and excludes deployment metadata without changing webapp settings', () => {
  // filePushOrder is not an Apps Script manifest field. Presence of filenames
  // there never demonstrated that the security code ran in served responses.
  assert.equal(Object.hasOwn(manifest, 'filePushOrder'), false);
  assert.deepEqual(manifest.webapp, { executeAs: 'USER_DEPLOYING', access: 'ANYONE_ANONYMOUS' });
  assert.equal(manifest.timeZone, 'Asia/Jakarta');
  assert.equal(manifest.runtimeVersion, 'V8');
  assert.equal(manifest.exceptionLogging, 'STACKDRIVER');
  assert.deepEqual(manifest.dependencies.enabledAdvancedServices, [
    { userSymbol: 'Slides', version: 'v1', serviceId: 'slides' }
  ]);
});

test('source contract keeps both rendered-page security boundaries', () => {
  assert.match(loader, /_sanitizeWebHtmlSecurity_\(html\)/);
  assert.match(hardening, /font-awesome\/6\.5\.1\/css\/all\.min\.css/);
  assert.ok(hardening.includes(`integrity="${integrity}"`));
  assert.match(hardening, /window\\\.location\\\.search\\\.match/);
  assert.match(doGet, /_doGetOriginalWebSecurity_/);
});

test('sanitizer delivers pinned SRI stylesheet and blocks query token fallback without removing session token', () => {
  const ctx = context();
  const html = ctx._sanitizeWebHtmlSecurity_(legacyHtml);
  assertProtected(html);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const browser = vm.createContext({ window: { location: { search: '?token=untrusted-query-token' } } });
  vm.runInContext(script, browser);
  assert.equal(browser.fixtureToken(), '');
  browser.window.sessionToken = 'trusted-session-token';
  assert.equal(browser.fixtureToken(), 'trusted-session-token');
  assert.equal(ctx._sanitizeWebHtmlSecurity_(html), html, 'sanitization is idempotent');
});

test('doGet sanitizes actual HtmlOutput in place and preserves event and output metadata', () => {
  let content = legacyHtml, received, calls = 0;
  const out = {
    title: 'SiSi', getContent: () => content,
    setContent(value) { content = value; calls++; return this; },
    setXFrameOptionsMode() { return this; }
  };
  const event = { parameter: {} };
  const ctx = context({ doGet(e) { received = e; return out; } });
  vm.runInContext(doGet, ctx, { filename: 'ZZ-Web-Security-DoGet.js' });
  assert.equal(ctx.doGet(event), out);
  assert.equal(received, event);
  assert.equal(calls, 1);
  assert.equal(out.title, 'SiSi');
  assertProtected(content);
});

test('doGet preserves non-HTML responses instead of rewriting API data', () => {
  const out = { getContent: () => '{"ok":true}', setContent() { assert.fail('must not rewrite API response'); } };
  const ctx = context({ doGet: () => out });
  vm.runInContext(doGet, ctx);
  assert.equal(ctx.doGet({}), out);
});

function loaderFixture({ allowed = true } = {}) {
  const reads = [];
  const session = { username: 'fixture', ulp: 'ULP Toboali', role: 'Staff' };
  const ctx = context({
    getSesiByToken: token => token === 'valid-token' ? session : null,
    _bolehAksesMenu: () => allowed,
    PAGE_FILE_ALIASES: { 'SIE-BeritaAcara': 'SIE-BeritaAcara' },
    HtmlService: { createHtmlOutputFromFile(name) { reads.push(name); return { getContent: () => legacyHtml }; } },
    _dashboardJadwalDeleteClientScript_: () => legacyHtml
  });
  vm.runInContext(loader, ctx, { filename: 'PageLoader-Compat.js' });
  return { ctx, reads };
}

for (const page of ['SIE-BeritaAcara', 'Tek-Dashboard']) {
  test(`PageLoader sanitizes ${page} including appended patch HTML`, () => {
    const f = loaderFixture();
    const res = f.ctx.getPageContent('valid-token', page);
    assert.equal(res.success, true);
    assert.equal(res.sesi.token, 'valid-token');
    assertProtected(res.html, 2);
    assert.deepEqual(f.reads, page === 'SIE-BeritaAcara' ? [page, 'Core/SIE-BeritaAcara-WebFix'] : [page]);
  });
}

test('PageLoader rejects missing/expired token and menu denial before HTML is read', () => {
  for (const token of ['', 'expired']) {
    const f = loaderFixture();
    assert.equal(f.ctx.getPageContent(token, 'SIE-BeritaAcara').redirect, 'login');
    assert.equal(f.reads.length, 0);
  }
  const f = loaderFixture({ allowed: false });
  assert.equal(f.ctx.getPageContent('valid-token', 'SIE-BeritaAcara').redirect, 'forbidden');
  assert.equal(f.reads.length, 0);
});

test('PageLoader fails closed if the sanitizer is unavailable', () => {
  const f = loaderFixture();
  vm.runInContext('_sanitizeWebHtmlSecurity_ = undefined;', f.ctx);
  const res = f.ctx.getPageContent('valid-token', 'SIE-BeritaAcara');
  assert.equal(res.success, false);
  assert.equal(res.html, undefined);
});
