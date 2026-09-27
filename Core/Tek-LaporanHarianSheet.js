// BAGIAN 3: LAPORAN HARIAN & MOBILE

// ============================================================================
// ensureLaporanHarianHariIni - Top-level function guarded
// Ensures daily report data exists for current date
// ============================================================================
function ensureLaporanHarianHariIni() {
  guard_(arguments, { ulp: true, aksi: "ensureLaporanHarianHariIni" });
  
  var today = new Date();
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var todayData = data.filter(row => new Date(row[0]).toDateString() === today.toDateString());
  
  if (todayData.length === 0) {
    sheet.appendRow([today, "pending", 0, 0]);
  }
  
  return todayData.length > 0;
}

// ============================================================================
// simpanLaporanHarianWeb - Top-level function guarded
// Saves daily report data from web interface
// ============================================================================
function simpanLaporanHarianWeb(data) {
  guard_(arguments, { ulp: true, aksi: "simpanLaporanHarianWeb" });
  
  var sheet = SpreadsheetApp.getActiveSheet();
  sheet.appendRow([data.date, data.status, data.energi, data.beban]);
  
  return { success: true, message: "Laporan harian tersimpan" };
}

// ============================================================================
// getLaporanHarianRow - Top-level function guarded
// Retrieves a specific row from daily report
// ============================================================================
function getLaporanHarianRow(rowIndex) {
  guard_(arguments, { ulp: true, aksi: "getLaporanHarianRow" });
  
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues();
  
  return {
    date: row[0][0],
    status: row[0][1],
    energi: row[0][2],
    beban: row[0][3]
  };
}

// ============================================================================
// refreshLaporanHarian - Top-level function guarded
// Refreshes daily report data from source
// ============================================================================
function refreshLaporanHarian() {
  guard_(arguments, { ulp: true, aksi: "refreshLaporanHarian" });
  
  var sheet = SpreadsheetApp.getActiveSheet();
  var range = sheet.getDataRange();
  var values = range.getValues();
  
  // Clear and re-populate
  sheet.clear();
  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  
  return { success: true, rowsRefreshed: values.length };
}

// ============================================================================
// getMobileLaporanUp3Uiw - Top-level function guarded
// Returns mobile-optimized daily report for UP3 UIW area
// ============================================================================
function getMobileLaporanUp3Uiw(date) {
  guard_(arguments, { ulp: true, aksi: "getMobileLaporanUp3Uiw" });
  
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var filtered = data.filter(row => new Date(row[0]).toDateString() === new Date(date).toDateString());
  
  return {
    date: date,
    area: "UP3 UIW",
    status: filtered.length > 0 ? filtered[0][1] : "tidak ada data",
    energi: filtered.length > 0 ? filtered[0][2] : 0,
    beban: filtered.length > 0 ? filtered[0][3] : 0,
    mobile: true
  };
}

// ============================================================================
// simpanMobileLaporanC4A - Top-level function guarded
// Saves mobile report data for C4A application
// ============================================================================
function simpanMobileLaporanC4A(payload) {
  guard_(arguments, { ulp: true, aksi: "simpanMobileLaporanC4A" });
  
  var sheet = SpreadsheetApp.getActiveSheet();
  var timestamp = new Date();
  
  sheet.appendRow([
    timestamp,
    payload.status,
    payload.energi,
    payload.beban,
    payload.source || "mobile_c4a",
    payload.deviceId
  ]);
  
  return {
    success: true,
    message: "Data mobile C4A tersimpan",
    timestamp: timestamp
  };
}

// Helper function: formatMobileResponse
function formatMobileResponse(data) {
  return {
    success: true,
    data: data,
    timestamp: new Date(),
    version: "1.0"
  };
}

// Helper function: validateMobilePayload
function validateMobilePayload(payload) {
  return payload && 
         payload.status && 
         typeof payload.energi === "number" && 
         typeof payload.beban === "number";
}
