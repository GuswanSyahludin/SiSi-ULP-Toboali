from pathlib import Path

path = Path("SiSi_BackEnd/Teknik/Tek-LapUP3UIWHarian.js")
s = path.read_text(encoding="utf-8")

replacements = [
    (
'''function _lapDataHartek_(ss, ulp, tglIso) {
  var sh = ss.getSheetByName(LAP_UP3.HTK_PG),
    C = COL_HTK.PG;
  var bulan = tglIso.substring(0, 7);
  var hari = {},
    kom = { jaringan: 0, gardu: 0 };
  if (sh && sh.getLastRow() > 1) {
    var d = sh.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {''',
'''function _lapDataHartek_(ss, ulp, tglIso) {
  var C = COL_HTK.PG;
  var bulan = tglIso.substring(0, 7);
  var hari = {},
    kom = { jaringan: 0, gardu: 0 };
  // DUAL-READ: data H-2 ke belakang sudah berpindah ke ARSIP. Tanpa gabungan
  // AKTIF+ARSIP, komulatif bulan Hartek turun/hilang setelah migrasi harian.
  var d = _readSheetDual_(LAP_UP3.HTK_PG, C.kodePG, C.timeStamp + 1);
  if (d.length) {
    for (var i = 0; i < d.length; i++) {'''
    ),
    (
'''  var shJ = ss.getSheetByName(LAP_UP3.INSJAR);
  if (shJ && shJ.getLastRow() > 1) {
    var RJ = COL_INS.REALISASI,
      dj = shJ.getDataRange().getValues();
    for (var i = 1; i < dj.length; i++) {''',
'''  var RJ = COL_INS.REALISASI;
  // DUAL-READ Inspeksi Jaringan: gabungkan AKTIF+ARSIP dan dedup berdasarkan
  // Kode Pekerjaan Penyulang agar baris in-flight migrasi tidak dihitung dua kali.
  var dj = _readSheetDual_(
    LAP_UP3.INSJAR,
    RJ.kodePekerjaanPeny,
    RJ.timestamp + 1,
  );
  if (dj.length) {
    for (var i = 0; i < dj.length; i++) {'''
    ),
    (
'''  var shG = ss.getSheetByName(LAP_UP3.INSDU);
  if (shG && shG.getLastRow() > 1) {
    var RG = COL_INSDU.REALISASI,
      dg = shG.getDataRange().getValues();
    for (var k = 1; k < dg.length; k++) {''',
'''  var RG = COL_INSDU.REALISASI;
  // DUAL-READ Inspeksi Gardu: data lama tetap ikut komulatif setelah sheet
  // realisasi gardu dimigrasikan ke file ARSIP.
  var dg = _readSheetDual_(
    LAP_UP3.INSDU,
    RG.kodePekerjaanGardu,
    RG.timestamp + 1,
  );
  if (dg.length) {
    for (var k = 0; k < dg.length; k++) {'''
    ),
]

for old, new in replacements:
    if old not in s:
        raise SystemExit("Target patch tidak ditemukan, source berubah. Tidak ada file yang ditulis.\n" + old[:160])
    s = s.replace(old, new, 1)

marker = "   Rev 20 Agu 2026 — OPTIMASI BACA mobile Laporan UP3/UIW: getMobileLaporanUp3Uiw"
note = "   Rev 24 Agu 2026 — FIX KOMULATIF: Hartek, Inspeksi Jaringan, dan Inspeksi Gardu\n   kini DUAL-READ AKTIF+ARSIP via _readSheetDual_(), konsisten dengan ROW.\n"
if note not in s:
    if marker not in s:
        raise SystemExit("Marker revision tidak ditemukan")
    s = s.replace(marker, note + marker, 1)

path.write_text(s, encoding="utf-8")
print("OK: dual-read Hartek + InsJar + InsDu diterapkan")
