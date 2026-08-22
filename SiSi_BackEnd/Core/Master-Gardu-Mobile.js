/* =====================================================
   Master-Gardu-Mobile.js — endpoint download Master Gardu untuk Flutter
   Rev 22 Agu 2026
   -----------------------------------------------------
   Sumber: spreadsheet Master HI Toboali, tab Master_Gardu, header 11 baris.

   HANYA field yang dibutuhkan mobile:
     Identitas      : ULP, Gardu, Alamat
     Data Trafo     : Jenis Gardu, Merk, Kapasitas, No Seri, Tahun, Type Seal
     Data PHB-TR    : Merk, Nomor Seri, Tahun
     Pelaksanaan    : Jam Ukur WBP, Tanggal Pengukuran, Kepemilikan
     WBP            : Tegangan RS/ST/TR/RN/SN/TN + Beban R/S/T/N
     LWBP           : Tegangan RS/ST/TR/RN/SN/TN + Beban R/S/T/N

   Efisiensi: TIDAK membaca 170+ kolom penuh. Hanya 3 range:
     B:V   (identitas + data trafo/PHB + waktu/kepemilikan)
     AB:AK (WBP)
     BE:BN (LWBP)

   Action: ?mobile=1&action=getMasterGarduMobile&token=<sessionToken>[&ulp=]
   Router melalui authPerangkatRouter_ (Auth-Perangkat.js), jadi Code.js tidak
   perlu tambahan case lagi.
   ===================================================== */

var MASTER_GARDU_MOBILE = {
  spreadsheetId: "1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw",
  tab: "Master_Gardu",
  headerRows: 11,
};

function getMasterGarduMobile(token, ulpDiminta) {
  try {
    var sesi = getSesiByToken(String(token || "").trim());
    if (!sesi)
      return { success: false, message: "Sesi habis, silakan buka aplikasi ulang." };

    var isSuper = String(sesi.role || "").trim().toLowerCase() === "super user";
    var filterUlp = isSuper
      ? String(ulpDiminta || "").trim().toLowerCase()
      : String(sesi.ulp || "").trim().toLowerCase();

    var ss = SpreadsheetApp.openById(MASTER_GARDU_MOBILE.spreadsheetId);
    var sh = ss.getSheetByName(MASTER_GARDU_MOBILE.tab);
    if (!sh) return { success: false, message: "Tab Master_Gardu tidak ditemukan." };

    var start = MASTER_GARDU_MOBILE.headerRows + 1;
    var n = sh.getLastRow() - MASTER_GARDU_MOBILE.headerRows;
    if (n <= 0) return { success: true, count: 0, list: [] };

    // getDisplayValues menjaga tanggal/jam tetap berbentuk teks yang stabil
    // saat masuk JSON dan SQLite, tanpa timezone shift di Flutter.
    var ident = sh.getRange(start, 2, n, 21).getDisplayValues(); // B:V
    var wbp = sh.getRange(start, 28, n, 10).getDisplayValues();  // AB:AK
    var lwbp = sh.getRange(start, 57, n, 10).getDisplayValues(); // BE:BN

    var list = [];
    for (var i = 0; i < n; i++) {
      var nomor = String(ident[i][1] || "").trim(); // C Gardu
      if (!nomor) continue;
      var ulp = String(ident[i][0] || "").trim();   // B ULP
      if (filterUlp && ulp.toLowerCase() !== filterUlp) continue;

      list.push({
        ulp: ulp,
        gardu: nomor,
        alamat: String(ident[i][2] || "").trim(),

        // K:V relatif terhadap range B:V => index 9..20
        jenisGardu: String(ident[i][9] || "").trim(),
        merk: String(ident[i][10] || "").trim(),
        kapasitasKva: String(ident[i][11] || "").trim(),
        noSeri: String(ident[i][12] || "").trim(),
        tahunTrafo: String(ident[i][13] || "").trim(),
        typeSeal: String(ident[i][14] || "").trim(),
        merkPhbTr: String(ident[i][15] || "").trim(),
        nomorSeriPhbTr: String(ident[i][16] || "").trim(),
        tahunPhbTr: String(ident[i][17] || "").trim(),
        jamUkurWbp: String(ident[i][18] || "").trim(),
        tanggalPengukuran: String(ident[i][19] || "").trim(),
        kepemilikan: String(ident[i][20] || "").trim(),

        // AB:AG tegangan WBP; AH:AK beban utama WBP
        wbpRs: wbp[i][0], wbpSt: wbp[i][1], wbpTr: wbp[i][2],
        wbpRn: wbp[i][3], wbpSn: wbp[i][4], wbpTn: wbp[i][5],
        wbpR: wbp[i][6], wbpS: wbp[i][7], wbpT: wbp[i][8], wbpN: wbp[i][9],

        // BE:BJ tegangan LWBP; BK:BN beban utama LWBP
        lwbpRs: lwbp[i][0], lwbpSt: lwbp[i][1], lwbpTr: lwbp[i][2],
        lwbpRn: lwbp[i][3], lwbpSn: lwbp[i][4], lwbpTn: lwbp[i][5],
        lwbpR: lwbp[i][6], lwbpS: lwbp[i][7], lwbpT: lwbp[i][8], lwbpN: lwbp[i][9],
      });
    }

    list.sort(function (a, b) {
      return a.gardu.localeCompare(b.gardu, "id", { numeric: true });
    });
    return { success: true, count: list.length, list: list };
  } catch (e) {
    return { success: false, message: "Gagal membaca Master Gardu: " + e.message };
  }
}
