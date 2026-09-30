/*
 * T-16/T-17 rendered-web security boundary.
 *
 * Apps Script HTML Service still contains legacy inline handlers and scripts,
 * so a strict CSP is a separate architectural migration. This boundary closes
 * the already-known token query-string fallback and adds SRI to the pinned
 * Font Awesome stylesheet in the HTML returned to the browser.
 */
function _sanitizeWebHtmlSecurity_(html) {
  var out = String(html || "");

  // Keep the CDN version and integrity value fixed at the response boundary.
  out = out.replace(
    /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.5\.0\/css\/all\.min\.css/g,
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
  );
  out = out.replace(
    /(<link\b[^>]*href="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.5\.1\/css\/all\.min\.css"[^>]*)(>)/gi,
    function (full, tag, close) {
      if (/\bintegrity\s*=/i.test(tag)) return full;
      return (
        tag +
        ' integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer"' +
        close
      );
    },
  );

  // Remove the legacy Main.html query-string token extraction from delivered HTML.
  out = out.replace(
    /var\s+m\s*=\s*window\.location\.search\.match\(\/\[\?&\]token=\(\[\^&\]\+\)\/\);\s*return\s+m\s*\?\s*m\[1\]\s*:\s*""\s*;/g,
    'return "";',
  );

  return out;
}
