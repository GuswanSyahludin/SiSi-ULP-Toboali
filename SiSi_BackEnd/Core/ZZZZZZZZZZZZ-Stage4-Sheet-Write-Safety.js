/* Stage 4: normalize user-controlled values before BA Sheet writes.
   Public endpoint wrappers remain owned by the existing auth/ownership adapters.
   This helper is deliberately side-effect free so Apps Script load order cannot
   replace a legacy function with a self-recursing wrapper. */
function _stage4SafeCellValue_(value) {
  if (value == null) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Object.prototype.toString.call(value) === '[object Date]') return value;
  var text = String(value);
  if (/^[=+\-@]/.test(text)) return "'" + text;
  if (/^[\t\r\n]/.test(text)) return text.replace(/^[\t\r\n]+/, '');
  return text;
}
function _stage4SafePayload_(value) {
  if (Array.isArray(value)) return value.map(_stage4SafePayload_);
  if (value && typeof value === 'object' && Object.prototype.toString.call(value) !== '[object Date]') {
    var out = {};
    Object.keys(value).forEach(function (key) {
      out[key] = _stage4SafePayload_(value[key]);
    });
    return out;
  }
  return _stage4SafeCellValue_(value);
}
