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
   booleans, never the supplied secrets. BA_PDF_SECRET is kept as a temporary
   compatibility alias because existing BA bridges still read it first. */
function simpanSecretEngineSiSi(wmSecret, pdfSecret) {
  wmSecret = String(wmSecret || '').trim();
  pdfSecret = String(pdfSecret || '').trim();
  if (wmSecret.length < 32 || pdfSecret.length < 32)
    throw new Error('Secret engine minimal 32 karakter.');
  PropertiesService.getScriptProperties().setProperties({
    WM_ENGINE_SECRET: wmSecret,
    PDF_ENGINE_SECRET: pdfSecret,
    BA_PDF_SECRET: pdfSecret
  }, false);
  return { ok: true, wmConfigured: true, pdfConfigured: true };
}

function auditSecretEngineSiSi() {
  var p = PropertiesService.getScriptProperties();
  var wm = !!p.getProperty(ENGINE_SECRET_KEYS.wm);
  var pdf = !!p.getProperty(ENGINE_SECRET_KEYS.pdf);
  var legacyPdf = !!p.getProperty('BA_PDF_SECRET');
  return {
    ok: wm && pdf && legacyPdf,
    wmConfigured: wm,
    pdfConfigured: pdf,
    legacyPdfConfigured: legacyPdf
  };
}
