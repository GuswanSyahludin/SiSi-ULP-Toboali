/* Secure PDF export for the currently filtered CheckPoint matrix. */
function exportDpgRekapTemuanPdf(payload) {
  try {
    payload = payload || {};
    guard_(arguments, { ulp: true, aksi: 'exportDpgRekapTemuanPdf' });
    var headers = Array.isArray(payload.headers) ? payload.headers : [];
    var rows = Array.isArray(payload.rows) ? payload.rows : [];
    if (!headers.length || !rows.length)
      return { ok: false, message: 'Tidak ada data untuk diekspor.' };
    if (headers.length > 80 || rows.length > 1000)
      return { ok: false, message: 'Data terlalu besar untuk PDF. Persempit filter terlebih dahulu.' };
    function esc(v) {
      return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    var title = esc(payload.title || 'Rekap Temuan Inspeksi');
    var subtitle = esc(payload.subtitle || '');
    var thead = headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('');
    var tbody = rows.map(function (row) {
      return '<tr>' + headers.map(function (_, i) {
        return '<td>' + esc(row[i] == null || row[i] === '' ? '-' : row[i]) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    var html = '<!doctype html><html><head><meta charset="utf-8"><style>'
      + '@page{size:A4 landscape;margin:8mm}body{font-family:Arial,sans-serif;color:#172033;margin:0}'
      + 'h1{font-size:16px;margin:0 0 3px}.sub{font-size:9px;color:#5b6475;margin-bottom:10px}'
      + 'table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7px}'
      + 'th{background:#dfe8d8;font-weight:700}th,td{border:1px solid #7f8a78;padding:3px;text-align:center;word-break:break-word}'
      + 'td:nth-child(3),th:nth-child(3){text-align:left}</style></head><body>'
      + '<h1>' + title + '</h1><div class="sub">' + subtitle + '</div>'
      + '<table><thead><tr>' + thead + '</tr></thead><tbody>' + tbody + '</tbody></table>'
      + '</body></html>';
    var name = String(payload.fileName || 'Rekap_Temuan_Inspeksi')
      .replace(/[^a-zA-Z0-9_-]+/g, '_') + '.pdf';
    var blob = Utilities.newBlob(html, 'text/html', 'rekap.html')
      .getAs('application/pdf').setName(name);
    return {
      ok: true,
      fileName: name,
      mimeType: 'application/pdf',
      base64: Utilities.base64Encode(blob.getBytes()),
    };
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}
