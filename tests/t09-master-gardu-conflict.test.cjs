'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const conflict = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/ZZ-T09-Master-Gardu-Conflict.js'), 'utf8');
const gateway = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/Master-Gardu-Mobile.js'), 'utf8');
const repo = fs.readFileSync(path.join(root, 'SiSi_Mobile/lib/db/repositories/master_gardu_repository.dart'), 'utf8');
const materializer = fs.readFileSync(path.join(root, 'SiSi_Mobile/lib/db/repositories/local_master_materializer.dart'), 'utf8');
const dao = fs.readFileSync(path.join(root, 'SiSi_Mobile/lib/db/daos/master_gardu_dao.dart'), 'utf8');
const database = fs.readFileSync(path.join(root, 'SiSi_Mobile/lib/db/app_database.dart'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

assert.match(conflict, /serverRevision/);
assert.match(conflict, /MASTER_GARDU_CONFLICT/);
assert.match(conflict, /MASTER_GARDU_REVISION_REQUIRED/);
assert.match(conflict, /expected !== current/);
assert.match(conflict, /withLock_\(function/);
assert.match(conflict, /serverRevision = next/);
assert.match(conflict, /encodeURIComponent/);
assert.match(conflict, /getMasterGarduMobile = function/);
assert.match(conflict, /updateMasterGarduMobile = function/);
assert.match(gateway, /serverRevision: revision/);
assert.match(repo, /serverRevision/);
assert.match(repo, /gantiSemua\(rows, revisions: revisions\)/);
assert.match(repo, /serverRevision\(asli\.gardu, ulp: asli\.ulp\)/);
assert.match(materializer, /gantiSemua\(rows, revisions: revisions\)/);
assert.match(dao, /status\.equals\('konflik'\)\.not\(\)/);
assert.match(database, /PRIMARY KEY \(ulp, gardu\)/);
assert.match(packageJson.scripts.test, /t09-master-gardu-conflict\.test\.cjs/);
console.log('T-09 Master Gardu conflict contract passed.');
