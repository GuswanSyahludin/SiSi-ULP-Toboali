// BAGIAN 2: LAPORAN WILAYAH

// ============================================================================
// getLaporanWilayah - Top-level function guarded
// Retrieves report data for a specific wilayah/area
// ============================================================================
function getLaporanWilayah(wilayahCode, options) {
  guard_(arguments, { ulp: true, aksi: "getLaporanWilayah" });
  
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var result = {
    wilayahCode: wilayahCode,
    status: "success",
    data: data.filter(row => row[0] == wilayahCode)
  };
  
  return result;
}

// Helper function: processWilayahData
function processWilayahData(wilayahData) {
  var processed = [];
  for (var i = 0; i < wilayahData.length; i++) {
    processed.push({
      code: wilayahData[i][0],
      name: wilayahData[i][1],
      status: wilayahData[i][2]
    });
  }
  return processed;
}

// Helper function: validateWilayahCode
function validateWilayahCode(code) {
  return code && code.length > 0 && code.match(/^[A-Z0-9]+$/);
}
