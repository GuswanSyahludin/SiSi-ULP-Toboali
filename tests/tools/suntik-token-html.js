/* Suntikkan token ke seluruh panggilan google.script.run di HTML.
 *
 * Pemakaian:  node tests/tools/suntik-token-html.js [--kering]
 *
 * Latar belakang
 * --------------
 * Web app di-deploy dengan access: ANYONE_ANONYMOUS. Backend kini menuntut
 * token sesi, tetapi ratusan titik panggilan di HTML tidak pernah mengirimnya.
 * Skrip ini mengganti `google.script.run` menjadi `SisiRun`, sebuah pembungkus
 * yang menyisipkan token untuk fungsi yang terdaftar.
 *
 * Mengapa harus Node, bukan PowerShell 5.1
 * ----------------------------------------
 * Windows PowerShell 5.1 membaca file UTF-8 dengan codepage ANSI (Windows-1252)
 * bila tidak diberi -Encoding UTF8. Akibatnya setiap karakter non-ASCII
 * (──, •, é) berubah menjadi mojibake dan file rusak permanen. Node membaca
 * dan menulis UTF-8 secara bawaan, jadi aman.
 *
 * Perhatian
 * ---------
 * login-page.html TIDAK disentuh: halaman itu berdiri sendiri (tidak dimuat
 * lewat Main.html) sehingga tidak punya SisiRun, dan hanya memanggil doLogin
 * yang memang belum punya token.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { adaMojibake, hitungRusak, punyaBom, PENJELASAN } from "./encoding.js";

const here = (u) => fileURLToPath(new URL(u, import.meta.url));
const BACKEND = process.argv[2] && !process.argv[2].startsWith("--")
  ? process.argv[2]
  : here("../../SiSi_BackEnd");
const KERING = process.argv.includes("--kering");

/* Halaman yang dimuat sebagai fragmen di dalam Main.html, plus Main.html
   sendiri. login-page.html sengaja tidak ada di daftar ini. */
const BERKAS = [
  "Core/Main.html",
  "Core/Tek-Dashboard.html",
  "Core/Temuan-Inspeksi.html",
  "Hartek/Tek-Hartek.html",
  "Inspeksi_Gardu/Tek-InsDu.html",
  "Inspeksi_Gardu/Tek-PengukuranGardu.html",
  "Inspeksi_Jaringan/Tek-InsJar.html",
  "ROW/Tek-ROW.html",
  "Teknik/Jadwal-Padam.html",
  "Teknik/SIE-Teknik.html",
  "Teknik/Tek-Data-Checkpoint.html",
  "Yandal/Tek-Yandal.html",
  "SIE-BeritaAcara.html",
];

/* Daftar ini harus sama dengan SISI_BUTUH_TOKEN di dalam blok SisiRun.
   Dipakai untuk memverifikasi bahwa setiap fungsi yang di-guard di backend
   juga terdaftar di klien. */
const BUTUH_TOKEN = [
  "getSessionUser", "getPageContent", "getMenuOptions", "getDaftarAkun",
  "tambahAkun", "updateAkun", "hapusAkun", "resetPasswordAkun",
  "gantiPassword", "doLogout",
  "getMobileLaporanHarian", "getMobileDropdownRow", "getMobileEksekusiRow",
  "simpanMobileEksekusiRow", "updateMobileEksekusiRow",
  "getMasterGarduMobile", "updateMasterGarduMobile",
  "simpanHeaderInsGardu", "simpanRealisasiInsGardu", "simpanTemuanGardu",
  "editHeaderInsGardu", "editRealisasiGardu", "editTemuanGardu",
  "hapusRealisasiGardu", "updatePengukuranGardu",
  "simpanHeaderInsJar", "simpanRealisasiInsJar", "simpanTemuanInsJar",
  "editHeaderInsJar", "editRealisasiInsJar", "editTemuanInsJar",
  "updateHeaderInsLangsung",
  "simpanDataROW", "simpanTeruskanROW",
  "simpanJadwalPadam", "updateJadwalPadam", "updateStatusJadwalPadam",
  "getJadwalPadamList",
  "getListPekerjaanP0", "updateNamaPekerjaanP0",
  "getRekapPointPetugasY", "getTabelPetugasYandal", "getDetailPerformaPetugasY",
  "getVccYandalList", "setVccYandal", "getListPetugasYandal",
];

/* File HTML di proyek ini TIDAK seragam: sebagian LF, sebagian CRLF. Pola
   yang akan disisipkan harus memakai line ending yang sama dengan berkas
   tujuannya, kalau tidak String.replace() tidak akan menemukan kecocokan. */
function deteksiEol(src) {
  const i = src.indexOf("\n");
  if (i < 0) return "\n";
  return src[i - 1] === "\r" ? "\r\n" : "\n";
}
function denganEol(teks, eol) {
  return teks.replace(/\r?\n/g, eol);
}

const BLOK_SISIRUN = `
      /* ══════════════════════════════════════════════════════════════
         SisiRun — pembungkus google.script.run yang MENYISIPKAN TOKEN
         Dibuat 29 Agu 2026 (dipasang otomatis oleh tests/tools/suntik-token-html.js)
         ──────────────────────────────────────────────────────────────
         LATAR BELAKANG
         Web app di-deploy dengan access: ANYONE_ANONYMOUS, sehingga setiap
         fungsi backend bisa dipanggil siapa pun. Backend kini menuntut token
         sesi, tetapi panggilan di HTML tidak pernah mengirimnya.

         CARA KERJA
         Hanya fungsi yang tercantum di SISI_BUTUH_TOKEN yang disisipkan
         tokennya. Fungsi di luar daftar diteruskan persis seperti sebelumnya,
         sehingga perubahan ini AMAN DIPASANG LEBIH DULU sebelum backend
         selesai di-guard.

         PENYISIPAN (dua bentuk, keduanya dikenali _tokenDariArgs_ di Guard.js)
         • argumen pertama berupa object -> diberi kunci \`token\`
         • selain itu (string/angka/kosong) -> token disisipkan di DEPAN

         PENGECUALIAN
         SISI_TANPA_TOKEN berisi fungsi yang memang belum punya token.
         ══════════════════════════════════════════════════════════════ */
      var SISI_BUTUH_TOKEN = ${JSON.stringify(BUTUH_TOKEN, null, 8).replace(/\n/g, "\n      ")};
      var SISI_TANPA_TOKEN = ["doLogin", "loginPerangkat", "cekPerangkat"];

      /* PENTING: blok ini memakai alias GSR, BUKAN menulis google.script.run
         berulang kali. Kalau ditulis langsung, penggantian teks massal
         (google.script.run -> SisiRun) akan mengubahnya menjadi SisiRun di
         dalam definisi SisiRun sendiri -> rekursi tak berhenti. Alias GSR
         kebal terhadap penggantian semacam itu. */
      var SisiRun = (function () {
        var GSR = google.script.run;

        function perluToken(nama) {
          if (SISI_TANPA_TOKEN.indexOf(nama) >= 0) return false;
          return SISI_BUTUH_TOKEN.indexOf(nama) >= 0;
        }

        function sisipkan(nama, args) {
          if (!perluToken(nama)) return args;
          var t = _getToken();
          if (!t) return args; /* tanpa token, biarkan backend yang menolak */
          var a = Array.prototype.slice.call(args);
          if (a.length && a[0] && typeof a[0] === "object" && !Array.isArray(a[0])) {
            var salin = {};
            for (var k in a[0]) salin[k] = a[0][k];
            salin.token = t;
            a[0] = salin;
          } else {
            a.unshift(t);
          }
          return a;
        }

        function bungkus(nama) {
          return function () {
            return GSR[nama].apply(GSR, sisipkan(nama, arguments));
          };
        }

        var api = {
          withSuccessHandler: function (fn) {
            GSR.withSuccessHandler(fn);
            return api;
          },
          withFailureHandler: function (fn) {
            GSR.withFailureHandler(fn);
            return api;
          },
          withUserObject: function (o) {
            GSR.withUserObject(o);
            return api;
          },
        };

        var cache = {};
        return new Proxy(api, {
          get: function (target, nama) {
            if (typeof nama !== "string") return target[nama];
            if (nama in target) return target[nama];
            if (!cache[nama]) cache[nama] = bungkus(nama);
            return cache[nama];
          },
        });
      })();
`;

/* _getToken() asli hanya membaca sessionStorage dan query string. Setelah
   getPageContent() mengirim token di dalam objek sesi, sumber itu menjadi
   yang paling andal karena tidak bergantung pada URL. */
const GET_TOKEN_LAMA = `      function _getToken() {
        var sesi = _getSesiStorage();
        if (sesi && sesi.token) return sesi.token;
        var m = window.location.search.match(/[?&]token=([^&]+)/);
        return m ? m[1] : "";
      }`;

const GET_TOKEN_BARU = `      function _getToken() {
        var sesi = _getSesiStorage();
        if (sesi && sesi.token) return sesi.token;
        /* getPageContent() kini mengirim token di dalam objek sesi. */
        if (window.__SISI_SESI__ && window.__SISI_SESI__.token)
          return window.__SISI_SESI__.token;
        var m = window.location.search.match(/[?&]token=([^&]+)/);
        return m ? m[1] : "";
      }`;

let totalGanti = 0;
let diproses = 0;

for (const rel of BERKAS) {
  const p = join(BACKEND, rel.replace(/\//g, "\\"));
  let src;
  try {
    src = readFileSync(p, "utf8");
  } catch (e) {
    console.log(`LEWAT  ${rel} (${e.code})`);
    continue;
  }

  /* Penjaga encoding: kalau berkas sudah mengandung mojibake, jangan disentuh
     supaya kerusakan tidak ikut tersimpan. Pemindai ada di tests/tools/encoding.js
     dan dipakai bersama dengan cek-encoding.js. */
  if (adaMojibake(src)) {
    console.log(`BATAL  ${rel} — ${hitungRusak(src)} mojibake (${PENJELASAN})`);
    continue;
  }
  if (punyaBom(src)) {
    console.log(`BATAL  ${rel} — ada BOM, bersihkan dulu`);
    continue;
  }

  const sebelum = (src.match(/(?<![\w.])google\.script\.run(?!\[)/g) || []).length;
  src = src.replace(/(?<![\w.])google\.script\.run(?!\[)/g, "SisiRun");

  if (rel === "Core/Main.html") {
    const eol = deteksiEol(src);
    const polaLama = denganEol(GET_TOKEN_LAMA, eol);
    const polaBaru = denganEol(GET_TOKEN_BARU + BLOK_SISIRUN, eol);
    if (src.includes("var SisiRun = (function ()")) {
      console.log("LEWAT  Main.html — blok SisiRun sudah ada");
    } else if (!src.includes(polaLama)) {
      console.log(`BATAL  Main.html — pola _getToken() tidak ditemukan (eol=${JSON.stringify(eol)})`);
    } else {
      src = src.replace(polaLama, polaBaru);
      console.log(`TAMBAH Main.html — blok SisiRun disisipkan (eol=${JSON.stringify(eol)})`);
    }
  }

  if (!KERING) writeFileSync(p, src, "utf8");
  diproses++;
  totalGanti += sebelum;
  console.log(`${String(sebelum).padStart(4)}  ${rel}`);
}

console.log(`\n${KERING ? "[KERING] " : ""}${diproses} berkas, ${totalGanti} panggilan diganti.`);
