/* Detektor kerusakan encoding UTF-8, dipakai bersama oleh alat-alat di
 * tests/tools/.
 *
 * Latar belakang
 * --------------
 * Windows PowerShell 5.1 membaca berkas teks memakai codepage ANSI
 * (Windows-1252) kecuali diberi -Encoding UTF8. Kalau berkas UTF-8 dibaca
 * lalu ditulis ulang lewat PowerShell, setiap karakter non-ASCII berubah
 * menjadi mojibake secara PERMANEN: karakter garis kotak dan huruf beraksen
 * berubah menjadi dua karakter aneh. Kerusakan ini tidak terlihat di editor
 * kode biasa, jadi butuh pemindai.
 *
 * Pola di bawah ditulis SELURUHNYA dengan escape Unicode. Contoh mojibake
 * sengaja TIDAK ditulis secara literal di berkas ini supaya pemindai tidak
 * melaporkan dirinya sendiri.
 */

/* Tanda khas UTF-8 yang dibaca sebagai Windows-1252: huruf aksen Latin-1
   (U+00C2, U+00C3, U+00E2) yang langsung diikuti karakter kontrol, karakter
   Latin-1 tinggi (U+0080..U+00BF), atau tanda baca khusus (U+2013..U+203A,
   U+20AC, U+2122). Pasangan semacam ini hampir tidak pernah muncul dalam
   teks Indonesia yang valid. */
var POLA_RUSAK = [
  /[\u00c2\u00c3\u00e2][\u0080-\u00bf]/g,
  /[\u00e2][\u2013-\u203a\u20ac\u2122]/g,
  /[\u00c3][\u0080-\u009f]/g,
];

var PENJELASAN =
  "UTF-8 terbaca sebagai Windows-1252 (umumnya karena PowerShell 5.1 tanpa -Encoding UTF8)";

function hitungRusak(src) {
  var n = 0;
  for (var i = 0; i < POLA_RUSAK.length; i++) {
    var m = String(src || "").match(POLA_RUSAK[i]);
    if (m) n += m.length;
  }
  return n;
}

function adaMojibake(src) {
  return hitungRusak(src) > 0;
}

function punyaBom(src) {
  return String(src || "").charCodeAt(0) === 0xfeff;
}

export { POLA_RUSAK, PENJELASAN, hitungRusak, adaMojibake, punyaBom };
