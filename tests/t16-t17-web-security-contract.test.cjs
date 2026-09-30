'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/PageLoader-Compat.js'), 'utf8');
const hardening = fs.readFileSync(path.join(root, 'SiSi_BackEnd/Core/ZZ-Web-Security-Hardening.js'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'SiSi_BackEnd/appsscript.json'), 'utf8');

assert.match(loader, /_sanitizeWebHtmlSecurity_\(html\)/);
assert.match(hardening, /font-awesome\\/6\\.5\\.1\\/css\\/all\\.min\\.css/);
assert.match(hardening, /integrity=\"sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl\+Vegovlnee1c9QX4TctnWMn13TZye\+giMm8e2LwA==\"/);
assert.match(hardening, /window\\\.location\\\.search\\\.match/);
assert.match(manifest, /Core\\/ZZ-Web-Security-Hardening\\.js/);
console.log('T-16/T-17 rendered web security contract passed.');
