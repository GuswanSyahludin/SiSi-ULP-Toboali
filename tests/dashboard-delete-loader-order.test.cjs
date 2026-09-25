'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.join(__dirname, '..');
const coreDir = path.join(repoRoot, 'SiSi_BackEnd', 'Core');
const clasp = JSON.parse(fs.readFileSync(path.join(repoRoot, 'SiSi_BackEnd', '.clasp.json'), 'utf8'));

function readCoreFile(name) {
  return fs.readFileSync(path.join(coreDir, name), 'utf8');
}

test('the compatibility getPageContent implementation wins and injects Dashboard delete wiring', () => {
  assert.deepEqual(clasp.filePushOrder, ['Core/Code.js', 'Core/PageLoader-Compat.js']);

  const context = {
    PAGE_FILE_ALIASES: { 'Tek-Dashboard': 'Core/Tek-Dashboard' },
    HtmlService: {
      createHtmlOutputFromFile(name) {
        return { getContent: () => '<main data-page="' + name + '"></main>' };
      },
    },
    getSesiByToken(token) {
      return token === 'session-token' ? { username: 'tester', role: 'Teknik' } : null;
    },
    _bolehAksesMenu(_session, pageName) {
      return pageName === 'Tek-Dashboard';
    },
  };
  vm.createContext(context);

  // Apps Script uses global declarations, so the last getPageContent definition wins.
  vm.runInContext(readCoreFile('Code.js'), context, { filename: 'Code.js' });
  vm.runInContext(readCoreFile('PageLoader-Compat.js'), context, { filename: 'PageLoader-Compat.js' });
  vm.runInContext(readCoreFile('ZZ-Dashboard-Jadwal-Delete-Compat.js'), context, { filename: 'ZZ-Dashboard-Jadwal-Delete-Compat.js' });

  const result = context.getPageContent('session-token', 'Tek-Dashboard');
  assert.equal(result.success, true);
  assert.match(result.html, /__SISI_DASHBOARD_JADWAL_DELETE__/);
  assert.match(result.html, /Hapus jadwal/);
});
