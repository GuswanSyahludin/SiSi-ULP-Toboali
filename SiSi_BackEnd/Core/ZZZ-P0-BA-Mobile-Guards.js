/* P0 guard boundary. Kept late in the filename order so endpoint globals exist. */
(function installP0BaMobileGuards_(root) {
  var names = [
    "getPenyulangDanSection", "getOwnerIdDanExternalReference",
    "uploadFotoBeritaAcara", "uploadBaFinal", "getLinkWaBeritaAcara",
    "updateBeritaAcaraDetail", "updateFotoBeritaAcaraDetail",
    "getDataBeritaAcara", "simpanBeritaAcaraGardu", "syncGarduKeMaster",
    "updateMasterGarduDariBA", "setupSheetSwitching",
    "simpanBeritaAcaraSwitching", "getDataSwitching", "uploadFotoSwitching",
    "getDataTrafoMaster", "uploadFotoPemeriksaanTrafo",
    "simpanBaPemeriksaanTrafo", "updateKesimpulanPemeriksaanTrafo",
    "gantiPassword", "getMobileDropdownRow", "simpanMobileEksekusiRow"
  ];
  names.forEach(function (name) {
    var original = root[name];
    if (typeof original !== "function") return;
    var originalName = "original" + name;
    if (root[originalName]) return;
    root[originalName] = original;
    root[name] = function () {
      guard_(arguments, { ulp: true, aksi: name });
      return root[originalName].apply(this, arguments);
    };
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
