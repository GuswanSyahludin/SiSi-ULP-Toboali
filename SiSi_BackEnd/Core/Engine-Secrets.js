/* Central engine and webhook secret access for Apps Script.
   Values live only in Script Properties and must never be committed or logged. */
var ENGINE_SECRET_KEYS = {
  wm: "WM_ENGINE_SECRET",
  pdf: "PDF_ENGINE_SECRET",
  webhook: "SISI_WEBHOOK_SECRET",
};

function _engineSecret_(key) {
  var value = PropertiesService.getScriptProperties().getProperty(
    String(key || ""),
  );
  if (!value) throw new Error("Script Property belum diset: " + key);
  return value;
}

/* SECURITY: secret tidak boleh lagi diubah melalui fungsi global web app.
   Konfigurasi/rotasi dilakukan langsung oleh operator pada Script Properties
   deployment, di luar google.script.run dan di luar payload pengguna. Fungsi
   lama dipertahankan sementara agar caller lama gagal secara eksplisit dan
   tidak berubah menjadi error "function not found" yang sulit didiagnosis. */
function simpanSecretEngineSiSi() {
  throw new Error(
    "Operasi dinonaktifkan. Secret engine hanya boleh diatur operator melalui Script Properties.",
  );
}

function simpanSecretWebhookSiSi() {
  throw new Error(
    "Operasi dinonaktifkan. Secret webhook hanya boleh diatur operator melalui Script Properties.",
  );
}

/* Audit status konfigurasi hanya untuk Super User. Nilai secret tidak pernah
   dikembalikan; respons hanya memuat boolean keberadaan property. */
function auditSecretEngineSiSi(token) {
  guard_(arguments, {
    role: [ROLE_SUPER],
    superTidakBypass: true,
    aksi: "auditSecretEngineSiSi",
  });
  var p = PropertiesService.getScriptProperties();
  var wm = !!p.getProperty(ENGINE_SECRET_KEYS.wm);
  var pdf = !!p.getProperty(ENGINE_SECRET_KEYS.pdf);
  var legacyPdf = !!p.getProperty("BA_PDF_SECRET");
  var webhook = !!p.getProperty(ENGINE_SECRET_KEYS.webhook);
  return {
    ok: wm && pdf && legacyPdf && webhook,
    wmConfigured: wm,
    pdfConfigured: pdf,
    legacyPdfConfigured: legacyPdf,
    webhookConfigured: webhook,
  };
}
