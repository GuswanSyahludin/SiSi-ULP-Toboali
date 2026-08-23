/***** Tek-Watermark.gs — Watermark foto gaya GPS Map Camera (engine Cloud Run + Pillow) *****/
/* Rev 23 Agu 2026: mini-map dihapus dari payload watermark & pembuatan.
   Apps Script: ambil foto dari Drive → kirim ke engine → simpan JPEG hasil ke Drive.
   Penempelan watermark (kartu info & logo) dilakukan engine Cloud Run.
   
   Sharing file memakai try-catch agar aman jika domain/organisasi membatasi ANYONE_WITH_LINK. */

// URL engine Cloud Run, mis. "https://wm-engine-xxxx.asia-southeast2.run.app/watermark". WAJIB diisi.
var WM_ENGINE_URL =
  "https://wm-engine-1011716929576.asia-southeast2.run.app/watermark";

// Rahasia opsional agar engine hanya melayani permintaan kita (samakan dengan env WM_SECRET di engine).
var WM_ENGINE_SECRET = "sisi-wm-2026";

/**
 * Tempel watermark gaya GPS Map Camera via engine Cloud Run, lalu simpan JPEG ke folder tujuan.
 * Elemen ditangani engine: kartu info kiri bawah · logo SiSi kanan bawah.
 *
 * @param {string} fileId         File ID foto sumber di Drive
 * @param {string} outputFolderId Folder tujuan hasil
 * @param {Object} info           { ulp, tim, petugas, jam, hari, tanggal, penyulang, daerah, koordinat, switching, arus, durasi, jarak, jarakP0, lat, long }
 * @param {string} [outName]      Nama file hasil; default "WM_<fileId>.jpg"
 * @return {string} URL thumbnail baku TANPA ukuran
 */
function watermarkFoto_(fileId, outputFolderId, info, outName) {
  info = info || {};
  var blob = DriveApp.getFileById(fileId).getBlob();
  var payload = {
    image: Utilities.base64Encode(blob.getBytes()),
    mimeType: blob.getContentType() || "image/jpeg",
    minimap: "",
    ulp: info.ulp || "",
    tim: info.tim || "",
    petugas: info.petugas || "",
    jam: info.jam || "",
    hari: info.hari || "",
    tanggal: info.tanggal || "",
    penyulang: info.penyulang || "",
    daerah: info.daerah || "",
    koordinat: info.koordinat || "",
    switching: info.switching || "",
    arus: info.arus || "",
    durasi: info.durasi || "",
    jarak: info.jarak || "",
    jarakP0: info.jarakP0 || "",
    lat: String(info.lat || ""),
    long: String(info.long || ""),
    secret: WM_ENGINE_SECRET,
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
  var outNm = outName || "WM_" + fileId + ".jpg";
  var jpegBlob = resp.getBlob().setName(outNm);
  var folder = DriveApp.getFolderById(outputFolderId);
  var dup = folder.getFilesByName(outNm); // buang hasil lama bernama sama (regen) agar tak menumpuk
  while (dup.hasNext()) dup.next().setTrashed(true);

  var hasil = folder.createFile(jpegBlob);
  try {
    hasil.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (eShare) {
    Logger.log("Set sharing ANYONE_WITH_LINK dilewati/gagal: " + eShare.message);
  }

  return typeof urlFotoBaku_ === "function"
    ? urlFotoBaku_(hasil.getId())
    : "https://drive.google.com/thumbnail?id=" + hasil.getId();
}

/** Format hari + tanggal Indonesia, mis. { hari:"Kamis", tanggal:"04 Juni 2026" } */
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

/** Uji cepat: ganti dua ID di bawah lalu jalankan, cek Log untuk URL hasil. */
function _testWatermark() {
  var ht = _hariTanggalID_(new Date());
  var url = watermarkFoto_("GANTI_ID_FOTO", "GANTI_ID_FOLDER", {
    ulp: "ULP Toboali",
    tim: "Yandal 13",
    petugas: "Abu K, Agung Waskito",
    jam: "15:16",
    hari: ht.hari,
    tanggal: ht.tanggal,
    penyulang: "Penyulang Toboali",
    daerah: "Gadung, Kec. Toboali, Kab. Bangka Selatan",
    koordinat: "2.984077°S, 106.483088°E",
    durasi: "1 jam 3 menit",
    jarak: "1,24 km",
    lat: "-2.984077",
    long: "106.483088",
  });
  Logger.log("Hasil: " + url);
}
