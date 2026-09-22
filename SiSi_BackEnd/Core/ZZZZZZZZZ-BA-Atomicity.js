/* SISI-REAUDIT-050: serialize BA sequence generation and row append. */
(function () {
  var originalSave = simpanBeritaAcaraGardu;

  simpanBeritaAcaraGardu = function (payload) {
    var receiver = this;
    return withLock_(function () {
      return originalSave.call(receiver, payload);
    }, 30000);
  };
})();
