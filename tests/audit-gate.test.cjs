'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.join(__dirname, '..');
const gate = path.join(root, 'scripts', 'audit_gate.py');

function pythonCommand() {
  if (process.platform === 'win32') return { command: 'py', prefix: ['-3'] };
  return { command: 'python3', prefix: [] };
}

function run(dir) {
  const python = pythonCommand();
  return spawnSync(python.command, [...python.prefix, gate, dir], { encoding: 'utf8' });
}

test('audit gate passes the checked-in backend', () => {
  const result = run(path.join(root, 'SiSi_BackEnd'));
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('audit gate rejects an unguarded read endpoint', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sisi-audit-'));
  fs.mkdirSync(path.join(dir, 'Core'));
  fs.writeFileSync(path.join(dir, 'Core', 'Audit-Guard.js'), 'var AUDIT_ABAIKAN = [];');
  fs.writeFileSync(path.join(dir, 'Core', 'bad.js'), 'function readData() { return sheet.getValues(); }');
  const result = run(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /readData/);
});

test('audit gate accepts a guarded write endpoint', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sisi-audit-'));
  fs.mkdirSync(path.join(dir, 'Core'));
  fs.writeFileSync(path.join(dir, 'Core', 'Audit-Guard.js'), 'var AUDIT_ABAIKAN = [];');
  fs.writeFileSync(path.join(dir, 'Core', 'good.js'), 'function writeData() { guard_(arguments, {}); return sheet.appendRow([1]); }');
  const result = run(dir);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
