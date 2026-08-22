/***** Tek-Watermark.gs — Watermark foto gaya GPS Map Camera (engine Cloud Run + Pillow) *****/
/* Rev 21 Agu 2026: mini-map kini dibuat di Apps Script pakai layanan bawaan Maps.newStaticMap()
   (GRATIS — tanpa API key, tanpa tagihan Maps Static API), lalu dikirim ke engine sebagai base64.
   Apps Script: ambil foto dari Drive + buat mini-map → kirim ke engine → simpan JPEG hasil ke Drive.
   Penempelan watermark (mini-map, logo, teks) tetap dilakukan engine Cloud Run (cepat, gratis di free tier).

   Rev 22 Agu 2026: file hasil WAJIB ANYONE_WITH_LINK dan URL yang dikembalikan
   distandardkan ke:
     https://drive.google.com/thumbnail?id=<FILE_ID>
   tanpa ukuran. Mobile/web menambahkan &sz=w400 atau &sz=w1600 saat membaca. */

// URL engine Cloud Run, mis. "https://wm-engine-xxxx.asia-southeast2.run.app/watermark". WAJIB diisi.
var WM_ENGINE_URL =
  "https://wm-engine-1011716929576.asia-southeast2.run.app/watermark";

// Rahasia opsional agar engine hanya melayani permintaan kita (samakan dengan env WM_SECRET di engine).
var WM_ENGINE_SECRET = "sisi-wm-2026";

/**
 * Tempel watermark gaya GPS Map Camera via engine Cloud Run, lalu simpan PNG ke folder tujuan.
 * Elemen ditangani engine (gaya GPS Map Camera, 3 kartu): mini-map kiri atas · kartu info kiri bawah · logo SiSi kanan bawah.
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
  var mapBlob = _miniMapBlob_(info.lat, info.long); // null bila koordinat kosong/gagal → foto tetap diproses
  var payload = {
    image: Utilities.base64Encode(blob.getBytes()),
    mimeType: blob.getContentType() || "image/jpeg",
    minimap: mapBlob ? Utilities.base64Encode(mapBlob.getBytes()) : "",
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
  var png = resp.getBlob().setName(outNm);
  var folder = DriveApp.getFolderById(outputFolderId);
  var dup = folder.getFilesByName(outNm); // buang hasil lama bernama sama (regen) agar tak menumpuk
  while (dup.hasNext()) dup.next().setTrashed(true);

  var hasil = folder.createFile(png);
  // Tanpa sharing ini gambar hanya terlihat oleh pemilik Drive, dan blank di
  // HP petugas / web app yang tidak sedang login dengan akun pemilik.
  hasil.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Gunakan helper pusat bila sudah ada; fallback tetap menghasilkan format
  // yang sama agar file ini aman di-push lebih dulu.
  return typeof urlFotoBaku_ === "function"
    ? urlFotoBaku_(hasil.getId())
    : "https://drive.google.com/thumbnail?id=" + hasil.getId();
}

/**
 * Buat mini-map via layanan bawaan Apps Script (Maps Service) — GRATIS, tanpa API key.
 * Kuota memakai kuota bawaan Apps Script (BUKAN billing project GCP db-sisi-toboali).
 * @param {string|number} lat Latitude, mis. "-2.984077"
 * @param {string|number} lng Longitude, mis. "106.483088"
 * @return {Blob|null} gambar PNG mini-map, atau null bila koordinat tak valid/gagal
 */
function _miniMapBlob_(lat, lng) {
  var la = Number(lat),
    lo = Number(lng);
  if (!lat || !lng || !isFinite(la) || !isFinite(lo)) return null;
  try {
    var map = Maps.newStaticMap()
      .setSize(640, 420) // setara 320x210 @ scale=2 (maks layanan bawaan 640px)
      .setZoom(15)
      .setMapType(Maps.Type.ROADMAP)
      .setFormat(Maps.Format.PNG);
    map.setMarkerStyle(Maps.MarkerSize.MID, Maps.Color.BLUE, null); // label opsional
    map.addMarker(la, lo);
    map.setCenter(la, lo);
    return map.getBlob(); // ambil bytes langsung (JANGAN getMapUrl — itu butuh API key berbayar)
  } catch (e) {
    Logger.log("Mini-map gagal (dilewati): " + e.message);
    return null;
  }
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
    hari: ht.hari, // mis. "Kamis"
    tanggal: ht.tanggal, // mis. "04 Juni 2026"
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
