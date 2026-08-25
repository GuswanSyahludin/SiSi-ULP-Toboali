/* Central engine secret access for Apps Script.
   Values live only in Script Properties and must never be committed or logged. */
var ENGINE_SECRET_KEYS = {
  wm: 'WM_ENGINE_SECRET',
  pdf: 'PDF_ENGINE_SECRET'
};

function _engineSecret_(key) {
  var value = PropertiesService.getScriptProperties().getProperty(String(key || ''));
  if (!value) throw new Error('Script Property belum diset: ' + key);
  return value;
}

/* Called from Cloud Shell through `clasp run`. It intentionally returns only
   booleans, never the supplied secrets. Super-user validation is optional here
   because Apps Script Execution API already requires an authorized account. */
function simpanSecretEngineSiSi(wmSecret, pdfSecret) {
  wmSecret = String(wmSecret || '').trim();
  pdfSecret = String(pdfSecret || '').trim();
  if (wmSecret.length < 32 || pdfSecret.length < 32)
    throw new Error('Secret engine minimal 32 karakter.');
  PropertiesService.getScriptProperties().setProperties({
    WM_ENGINE_SECRET: wmSecret,
    PDF_ENGINE_SECRET: pdfSecret
  }, false);
  return { ok: true, wmConfigured: true, pdfConfigured: true };
}

function auditSecretEngineSiSi() {
  var p = PropertiesService.getScriptProperties();
  return {
    ok: !!p.getProperty(ENGINE_SECRET_KEYS.wm) && !!p.getProperty(ENGINE_SECRET_KEYS.pdf),
    wmConfigured: !!p.getProperty(ENGINE_SECRET_KEYS.wm),
    pdfConfigured: !!p.getProperty(ENGINE_SECRET_KEYS.pdf)
  };
}
