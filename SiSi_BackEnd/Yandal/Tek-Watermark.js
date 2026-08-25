/***** Tek-Watermark.gs — SiSi Watermark Compact V4 (Cloud Run + Pillow) *****/
/* Rev 24 Agu 2026:
   - Panel kecil hanya di kiri bawah.
   - Data: Kode Pekerjaan, Tanggal, Koordinat Pekerjaan, Akurasi, Tim,
     dan Jenis Pekerjaan.
   - Akurasi hanya angka radius meter, tanpa label Tinggi/Sedang/Lemah.
   - Engine mengunggah JPEG langsung ke Drive dan hanya mengembalikan metadata.
*/

// Endpoint direct-to-Drive. Samakan domain dengan service Cloud Run yang aktif.
var WM_ENGINE_URL =
  "https://wm-engine-1011716929576.asia-southeast2.run.app/watermark/drive";

// Samakan dengan environment WM_SECRET di Cloud Run.
var WM_ENGINE_SECRET = _engineSecret_("WM_ENGINE_SECRET");

/**
 * Tempel Watermark Compact V4 dan simpan langsung melalui wm-engine.
 *
 * @param {string} fileId         File ID foto sumber di Drive.
 * @param {string} outputFolderId Folder tujuan hasil watermark.
 * @param {Object} info           Metadata watermark compact.
 * @param {string} [outName]      Nama file hasil.
 * @return {string} URL thumbnail baku tanpa ukuran.
 */
function watermarkFoto_(fileId, outputFolderId, info, outName) {
  info = info || {};
  var source = DriveApp.getFileById(fileId);
  var blob = source.getBlob();
  var outNm = outName || "WM_" + fileId + ".jpg";

  // Key stabil per foto/slot. Retry tidak membuat file duplikat.
  var idem = String(
    info.idempotencyKey ||
      info.kodePekerjaan ||
      info.kodeEksekusi ||
      info.kodeP0 ||
      fileId,
  );
  if (info.tahap) idem += ":" + String(info.tahap);

  var payload = {
    image: Utilities.base64Encode(blob.getBytes()),
    mimeType: blob.getContentType() || "image/jpeg",
    secret: WM_ENGINE_SECRET,
    folderId: outputFolderId,
    fileName: outNm,
    idempotencyKey: idem,
    makePublic: true,

    // Enam data inti Watermark Compact V4.
    kodePekerjaan: String(
      info.kodePekerjaan || info.kodeEksekusi || info.kodeP0 || "",
    ),
    tanggal: info.tanggal || "",
    jam: info.jam || "",
    hari: info.hari || "",
    koordinat: info.koordinatPekerjaan || info.koordinat || "",
    akurasi: _formatAkurasiWm_(info.akurasi),
    tim: info.tim || "",
    ulp: info.ulp || "",
    jenisPekerjaan: info.jenisPekerjaan || info.pekerjaan || "",
    tahap: info.tahap || "",

    // Fallback koordinat lama.
    lat: String(info.lat || ""),
    long: String(info.long || ""),
  };

  var resp = UrlFetchApp.fetch(WM_ENGINE_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (resp.getResponseCode() !== 200) {
    throw new Error(
      "Engine watermark gagal (" +
        resp.getResponseCode() +
        "): " +
        resp.getContentText().slice(0, 300),
    );
  }

  var result;
  try {
    result = JSON.parse(resp.getContentText());
  } catch (eJson) {
    throw new Error("Balasan wm-engine bukan JSON yang valid.");
  }
  if (!result || result.ok !== true || !result.fileId) {
    throw new Error(
      "Upload watermark ke Drive gagal: " +
        String((result && result.message) || "fileId tidak tersedia"),
    );
  }

  return typeof urlFotoBaku_ === "function"
    ? urlFotoBaku_(result.fileId)
    : "https://drive.google.com/thumbnail?id=" + result.fileId;
}

/** Akurasi final untuk WM: angka radius meter saja, contoh ±4.2 m. */
function _formatAkurasiWm_(value) {
  if (value === null || value === undefined || value === "") return "";
  var text = String(value).trim();
  if (!text) return "";
  var number = Number(text.replace(/[^0-9.,-]/g, "").replace(",", "."));
  if (!isFinite(number)) return text;
  var rounded = Math.round(number * 10) / 10;
  return "±" + rounded + " m";
}

/** Format hari + tanggal Indonesia. */
function _hariTanggalID_(date) {
  date = date || new Date();
  var tz = "Asia/Jakarta";
  var mapHari = {
    Sunday: "Minggu",
    Monday: "Senin",
    Tuesday: "Selasa",
    Wednesday: "Rabu",
    Thursday: "Kamis",
    Friday: "Jumat",
    Saturday: "Sabtu",
  };
  var bln = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  var hari = mapHari[Utilities.formatDate(date, tz, "EEEE")] || "";
  var tgl =
    Utilities.formatDate(date, tz, "dd") +
    " " +
    bln[Number(Utilities.formatDate(date, tz, "M")) - 1] +
    " " +
    Utilities.formatDate(date, tz, "yyyy");
  return { hari: hari, tanggal: tgl };
}

/** Uji cepat Compact V4. */
function _testWatermark() {
  var ht = _hariTanggalID_(new Date());
  var url = watermarkFoto_("GANTI_ID_FOTO", "GANTI_ID_FOLDER", {
    kodePekerjaan: "EXE-ROW-240824-017",
    tahap: "Sebelum",
    ulp: "ULP Toboali",
    tim: "ROW 01",
    jam: "07:15",
    hari: ht.hari,
    tanggal: ht.tanggal,
    koordinatPekerjaan: "-2.998412, 106.452819",
    akurasi: 4.2,
    jenisPekerjaan: "Rabas / Pangkas Pohon",
  });
  Logger.log("Hasil: " + url);
}
