const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifest = fs.readFileSync(path.join(root, 'SiSi_Mobile/android/app/src/main/AndroidManifest.xml'), 'utf8');
const gradle = fs.readFileSync(path.join(root, 'SiSi_Mobile/android/app/build.gradle.kts'), 'utf8');
const audit = fs.readFileSync(path.join(root, 'scripts/audit_signing.py'), 'utf8');

test('Android backup and release signing fail closed', () => {
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:dataExtractionRules="@xml\/backup_rules"/);
  assert.match(gradle, /Release signing is required/);
  assert.match(audit, /tracked signing material/);
});
