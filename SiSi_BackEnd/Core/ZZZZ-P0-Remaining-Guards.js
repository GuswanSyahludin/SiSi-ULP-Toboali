/* Explicit P0 boundary for legacy public data endpoints. */
(function installRemainingP0Guards_(root) {
  var names = [
    "migrasiGlobalHeaderBatch", "previewMigrasiGlobalHeader", "migrasiSatuBarisGlobalHeader",
    "diagnosaMigrasi", "migrasiRowRealisasiBatch", "migrasiSatuBarisRowRealisasi",
    "previewMigrasiRowRealisasi", "migrasiRowEksekusiBatch", "migrasiSatuBarisRowEksekusi",
    "previewMigrasiRowEksekusi", "migrasiInsTemuanBatch", "migrasiSatuBarisInsTemuan",
    "previewMigrasiInsTemuan", "migrasiYandalP0Batch", "migrasiSatuBarisYandalP0",
    "previewMigrasiYandalP0", "migrasiLapHarianBatch", "migrasiSatuBarisLapHarian",
    "previewMigrasiLapHarian", "migrasiInsJarRlzBatch", "migrasiSatuBarisInsJarRlz",
    "previewMigrasiInsJarRlz", "migrasiInsDuRlzBatch", "migrasiSatuBarisInsDuRlz",
    "previewMigrasiInsDuRlz", "migrasiHartekPGBatch", "migrasiSatuBarisHartekPG",
    "previewMigrasiHartekPG", "migrasiHartekPkjBatch", "migrasiSatuBarisHartekPkj",
    "previewMigrasiHartekPkj", "migrasiHartekMatBatch", "migrasiSatuBarisHartekMat",
    "previewMigrasiHartekMat", "migrasiYandalShiftBatch", "migrasiSatuBarisYandalShift",
    "previewMigrasiYandalShift", "migrasiYandalSwcBatch", "migrasiSatuBarisYandalSwc",
    "previewMigrasiYandalSwc", "lengkapiKodeTemuanKosong", "perbaikiFormatKodeTemuan",
    "isiFolderPathTemuanKosong", "validasiUlangFotoTemuan", "cekFotoTemuan",
    "generatePdfBaPengoperasian", "getApprovalP0List", "getListMaterialHartek",
    "cekBarisHartekPG", "getHartekRekapMatrix", "getPenyulangHartek", "getHartekRekapDetail",
    "migrasiTemuanGarduHarian", "getDetailRealisasiGardu", "getTemuanGardu",
    "recalcRealisasiGarduByHeader", "updateHeaderInsGarduLangsung", "refreshSemuaWaInsGardu",
    "recalcWaInsGarduByHeader", "refreshWaInsGarduHarian", "getRekapInsGarduRows",
    "generatePdfRekapInsGardu", "unduhPdfInsGardu", "getListPenyulangDb",
    "getListUlpUsers", "getGisJaringanLines", "setPilihTimTemuan", "refreshHeaderInsBerkala",
    "refreshSemuaWaInsJar", "recalcWaInsJarByHeader", "refreshWaInsJarHarian",
    "getDropdownROW", "getDataROW", "getFotoROW", "getLaporanHarian", "resetLaporanHarian",
    "refreshViewLaporan", "refreshLaporanHarianROW", "getLaporanHarianList", "forceRefreshLaporan",
    "getHeaderList", "getListTimUsersByUlp", "recalcEksekusiROW", "debugRealisasiWaRow",
    "perbaikanMassalKodeROW", "jalankanPerbaikanMassalKodeROWMenit", "unduhPdfROW",
    "pdfDataLampiranROW", "migrasiFolderEksekusiROW", "drainFotoRow", "sweepEksekusiRowBacklog",
    "diagnosaSweepROW", "diagnosaDobelROW", "getJadwalPadamCalendarMonth", "getJadwalPadamList",
    "simpanJadwalPadam", "updateJadwalPadam", "updateStatusJadwalPadam", "submitGaspolToInputTbl",
    "getMonitoringTlTemuan", "getDpgGangguanPenyulang", "getDpgGangguanCharts", "getDpgRekapTemuan",
    "getDpgSectionList", "buildLaporanUP3", "buildLaporanWilayah", "simpanLaporanHarianWeb",
    "getLaporanHarianRow", "refreshLaporanHarian", "getMobileLaporanUp3Uiw",
    "validasiPengecekanP0DanTolakOtomatis", "recalcPointP0Bertahap", "sweepDurasiJarakYandalP0"
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
