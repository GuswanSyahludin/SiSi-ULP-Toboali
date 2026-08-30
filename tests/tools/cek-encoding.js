/* Verifikasi bahwa tidak ada kerusakan encoding pada berkas proyek.
 * Pemakaian: node tests/tools/cek-encoding.js
 *
 * Windows PowerShell 5.1 membaca UTF-8 sebagai Windows-1252 bila tidak diberi
 * -Encoding UTF8. Kalau berkas proyek dibaca lalu ditulis ulang lewat
 * PowerShell, karakter non-ASCII berubah jadi mojibake secara permanen.
 * Alat ini memindai pola-pola khas kerusakan itu.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = (u) => fileURLToPath(new URL(u, import.meta.url));
const ROOT = here("../../");

import { hitungRusak, punyaBom, PENJELASAN } from "./encoding.js";

const EKSTENSI = [".html", ".js", ".dart", ".json", ".md", ".py", ".yaml", ".yml"];

let diperiksa = 0;
const rusak = [];
const bom = [];

(function jalani(dir) {
  for (const entri of readdirSync(dir)) {
    if (entri === "node_modules" || entri === ".git" || entri === ".dart_tool" || entri === "build") continue;
    const p = join(dir, entri);
    if (statSync(p).isDirectory()) {
      jalani(p);
      continue;
    }
    if (!EKSTENSI.some((e) => entri.endsWith(e))) continue;
    let s;
    try {
      s = readFileSync(p, "utf8");
    } catch {
      continue;
    }
    diperiksa++;
    if (punyaBom(s)) bom.push(p.replace(ROOT, ""));
    const n = hitungRusak(s);
    if (n) rusak.push({ berkas: p.replace(ROOT, ""), jumlah: n });
  }
})(ROOT);

console.log(`diperiksa : ${diperiksa} berkas`);

if (bom.length) {
  console.log(`\nBOM tidak diharapkan (${bom.length}):`);
  bom.forEach((b) => console.log("  " + b));
} else {
  console.log("BOM       : tidak ada");
}

if (rusak.length) {
  console.log(`\nMOJIBAKE TERDETEKSI pada ${rusak.length} berkas (${PENJELASAN}):`);
  rusak.sort((a, b) => b.jumlah - a.jumlah);
  rusak.forEach((r) => console.log(`  ${String(r.jumlah).padStart(6)}  ${r.berkas}`));
  console.log("\nPerbaiki dengan mengembalikan berkas dari git (git checkout -- <berkas>),");
  console.log("lalu edit memakai alat yang menangani UTF-8: editor kode atau skrip Node.");
  console.log("JANGAN memakai PowerShell 5.1 tanpa -Encoding UTF8 untuk menulis berkas proyek.");
  process.exit(1);
}

console.log("mojibake  : BERSIH — encoding utuh");
