'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.join(__dirname, '..');
const coreDir = path.join(repoRoot, 'SiSi_BackEnd', 'Core');
const clasp = JSON.parse(fs.readFileSync(path.join(repoRoot, 'SiSi_BackEnd', '.clasp.json'), 'utf8'));
const finalLoader = 'Core/ZZZZZZZZZZZZZZZZZZ-PageLoader-Dashboard-Delete.js';

function readCoreFile(name) {
  return fs.readFileSync(path.join(coreDir, name), 'utf8');
}

function effectiveClaspOrder() {
  const allCoreFiles = fs.readdirSync(coreDir)
    .filter((name) => /\.js$/.test(name))
    .map((name) => 'Core/' + name);
  const prioritized = clasp.filePushOrder.filter((name) => allCoreFiles.includes(name));
  const remaining = allCoreFiles
    .filter((name) => !prioritized.includes(name))
    .sort();
  return prioritized.concat(remaining);
}

test('production order keeps dependencies and page loader deterministic', () => {
  const requiredPrefix = [
    'Core/Code.js',
    'Core/Engine-Secrets.js',
    'Core/Guard.js',
    'Core/Auth-Perangkat.js',
    'Core/Jadwal-Padam-Mobile.js',
    'Core/Delta-Sync-Mobile.js',
  ];
  assert.deepEqual(clasp.filePushOrder.slice(0, requiredPrefix.length), requiredPrefix);
  const order = effectiveClaspOrder();
  const competing = [
    'Core/Code.js',
    'Core/PageLoader-Compat.js',
    'Core/ZZ-Dashboard-Jadwal-Delete-Compat.js',
  ];
  const finalIndex = order.indexOf(finalLoader);
  assert.ok(finalIndex > Math.max(...competing.map((name) => order.indexOf(name))));

  const session = { username: 'tester', role: 'Teknik', aksesMenu: 'Tek-Dashboard' };
  const context = {
    CacheService: {
      getScriptCache() {
        return {
          get(key) { return key === 'sesi_session-token' ? JSON.stringify(session) : null; },
          put() {},
        };
      },
    },
    HtmlService: {
      createHtmlOutputFromFile(name) {
        return { getContent: () => '<main data-page="' + name + '"></main>' };
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(readCoreFile('Code.js'), context, { filename: 'Code.js' });
  vm.runInContext(readCoreFile('PageLoader-Compat.js'), context, { filename: 'PageLoader-Compat.js' });
  vm.runInContext(readCoreFile('ZZ-Dashboard-Jadwal-Delete-Compat.js'), context, { filename: 'ZZ-Dashboard-Jadwal-Delete-Compat.js' });
  vm.runInContext(readCoreFile('ZZZZZZZZZZZZZZZZZZ-PageLoader-Dashboard-Delete.js'), context, { filename: 'final-loader.js' });

  const result = context.getPageContent('session-token', 'Tek-Dashboard');
  assert.equal(result.success, true);
  assert.match(result.html, /__SISI_DASHBOARD_JADWAL_DELETE__/);
  assert.match(result.html, /Hapus jadwal/);
});
