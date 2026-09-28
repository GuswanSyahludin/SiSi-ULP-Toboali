'use strict';

/*
 * The legacy suite intentionally exercises plaintext dual-read. H-08 now
 * requires an explicit migration window, so this adapter seeds that window in
 * the synthetic VM before the legacy suite logs in. Production code is not
 * weakened and tests still exercise the real cutover wrapper.
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const suitePath = path.join(__dirname, 'suite.js');
const generatedPath = path.join(__dirname, '.suite-h08.generated.mjs');
let source = fs.readFileSync(suitePath, 'utf8');

const resetNeedle = [
  'function reset(ctx, spreadsheetId) {',
  '  ctx.harness.store.reset();',
  '  seedAll(ctx, { spreadsheetId });',
  '  ctx.call("_bustUsersCache_");',
  '}',
].join('\n');
const resetReplacement = [
  'function reset(ctx, spreadsheetId) {',
  '  ctx.harness.store.reset();',
  '  seedAll(ctx, { spreadsheetId });',
  '  ctx.call("_bustUsersCache_");',
  '  ctx.evalInVm(`',
  '    var now = Date.now();',
  '    PropertiesService.getScriptProperties().setProperty("SISI_PW_MIGRATION_STARTED_AT", String(now));',
  '    PropertiesService.getScriptProperties().setProperty("SISI_PW_PLAINTEXT_CUTOFF_AT", String(now + 7 * 86400000));',
  '    PropertiesService.getScriptProperties().setProperty("SISI_PW_CUTOVER_LOCKED", "0");',
  '  `);',
  '  const migrasi = ctx.call("doLogin", ["superuser", "RahasiaSuper123"]);',
  '  if (migrasi.ok && migrasi.value && migrasi.value.token) ctx.migrationToken = migrasi.value.token;',
  '}',
].join('\n');
if (!source.includes(resetNeedle)) throw new Error('H-08 suite adapter: reset() shape changed');
source = source.replace(resetNeedle, resetReplacement);

const section3 = 'console.log("\\n=== 3. Hash password + dual-read ===");';
if (!source.includes(section3)) throw new Error('H-08 suite adapter: hash section not found');
source = source.replace(section3, 'reset(ctx, SS);\n' + section3);
source = source.replaceAll('ctx.call("auditPasswordSiSi_", []).value', 'ctx.call("auditPasswordSiSi_", [ctx.migrationToken]).value');
source = source.replaceAll('ctx.call("migrasiPasswordHash_", [{ kering: true }]).value', 'ctx.call("migrasiPasswordHash_", [ctx.migrationToken, { kering: true }]).value');
source = source.replaceAll('ctx.call("migrasiPasswordHash_", [{}]).value', 'ctx.call("migrasiPasswordHash_", [ctx.migrationToken, {}]).value');

fs.writeFileSync(generatedPath, source);
import(pathToFileURL(generatedPath).href + '?h08=' + Date.now());
