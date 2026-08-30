/* ============================================================================
   Migrasi-Password.js — mengubah kolom Password db_Users dari plaintext ke hash
   Dibuat 29 Agu 2026 (Tahap 2)
   ----------------------------------------------------------------------------
   YANG TIDAK BERUBAH
   • Tidak ada kolom baru, tidak ada sheet baru, tidak ada perubahan urutan
     kolom, tidak ada perubahan nama sheet. Struktur database utuh.
   • Yang berubah HANYA isi kolom D (Password): "Rahasia123" menjadi
     "sisi1$<salt>$<hmac-sha256>".

   MENGAPA AMAN DIJALANKAN BERULANG
   Login memakai dual-read (_verifyPw_ di Guard.js): nilai berformat sisi1$
   diverifikasi sebagai hash, nilai lain tetap diverifikasi sebagai plaintext
   lawas. Jadi migrasi boleh berhenti di tengah, dijalankan ulang, atau tidak
   dijalankan sama sekali — tidak ada akun yang terkunci.

   URUTAN YANG DISARANKAN
     1. auditPasswordSiSi_()                    -> lihat berapa akun masih polos
     2. migrasiPasswordHash_({ kering: true })  -> simulasi, tidak menulis apa pun
     3. Buat salinan / catat Versi Riwayat spreadsheet sebagai jalur kembali
     4. migrasiPasswordHash_()                  -> baru menulis
     5. auditPasswordSiSi_()                    -> verifikasi

   PERHATIAN: hash tidak bisa dikembalikan menjadi plaintext. Setelah langkah 4,
   satu-satunya jalur kembali adalah salinan spreadsheet yang dibuat di langkah 3.
   ========================================================================= */

/**
 * Laporan read-only: berapa akun yang sudah ter-hash dan berapa yang masih
 * plaintext. Tidak menulis apa pun, aman dijalankan kapan saja.
 */
function auditPasswordSiSi_() {
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("db_Users");
  if (!sh) return { ok: false, message: "Sheet db_Users tidak ditemukan." };

  var kolomPw = COL_USERS.password;
  var kolomNama = COL_USERS.userName;
  var data = sh.getDataRange().getValues();

  var sudah = 0;
  var polos = 0;
  var kosong = 0;
  var contohPolos = [];

  for (var i = 1; i < data.length; i++) {
    var nama = String(data[i][kolomNama] || "").trim();
    var pw = String(data[i][kolomPw] || "").trim();
    if (!nama) continue;
    if (!pw) {
      kosong++;
      continue;
    }
    if (_pwSudahHash_(pw)) {
      sudah++;
    } else {
      polos++;
      if (contohPolos.length < 10) contohPolos.push(nama);
    }
  }

  return {
    ok: true,
    totalBaris: Math.max(0, data.length - 1),
    sudahHash: sudah,
    masihPlaintext: polos,
    tanpaPassword: kosong,
    contohMasihPlaintext: contohPolos,
    catatan:
      "Kolom dan struktur sheet tidak disentuh. Jalankan " +
      "migrasiPasswordHash_({kering:true}) untuk simulasi.",
  };
}

/**
 * Ubah semua password plaintext di db_Users menjadi hash.
 *
 * @param {Object} opts
 *   opts.kering  {boolean} true = hanya menghitung, TIDAK menulis (default false)
 *   opts.maks    {number}  batas jumlah akun yang diproses (default 2000)
 * @return {Object} laporan
 */
function migrasiPasswordHash_(opts) {
  opts = opts || {};
  var kering = opts.kering === true;
  var maks = Number(opts.maks) > 0 ? Number(opts.maks) : 2000;

  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("db_Users");
  if (!sh) return { ok: false, message: "Sheet db_Users tidak ditemukan." };

  var kolomPw = COL_USERS.password;
  var kolomNama = COL_USERS.userName;

  /* Kunci agar AppSheet tidak menulis db_Users di sela baca dan tulis kita.
     Kalau gagal mendapat kunci, berhenti — jangan menulis apa pun. */
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return {
      ok: false,
      kering: kering,
      message:
        "Sheet sedang dipakai proses lain. Tidak ada yang diubah. " +
        "Coba lagi beberapa saat.",
    };
  }

  try {
    var data = sh.getDataRange().getValues();
    var nilai = [];
    var diubah = [];
    var dilewati = 0;
    var kosong = 0;
    var gagal = [];

    for (var i = 1; i < data.length; i++) {
      var nama = String(data[i][kolomNama] || "").trim();
      var pw = String(data[i][kolomPw] || "").trim();

      if (!nama) continue;
      if (!pw) {
        kosong++;
        continue;
      }
      if (_pwSudahHash_(pw)) {
        dilewati++;
        continue;
      }
      if (diubah.length >= maks) continue;

      try {
        nilai.push({ baris: i + 1, nilai: _hashPw_(pw, _saltBaru_()) });
        diubah.push(nama);
      } catch (e) {
        gagal.push({ username: nama, alasan: e.message });
      }
    }

    if (!kering && nilai.length) {
      /* Satu kali tulis. Kalau ada baris yang disisipkan AppSheet di sela baca
         dan tulis, penulisan per baris menjaga baris lain tetap utuh. */
      for (var n = 0; n < nilai.length; n++) {
        sh.getRange(nilai[n].baris, kolomPw + 1, 1, 1).setValue(nilai[n].nilai);
      }
      SpreadsheetApp.flush();
      if (typeof _bustUsersCache_ === "function") _bustUsersCache_();
      audit_(null, "PW_MIGRASI", "db_Users", "OK", nilai.length + " akun di-hash");
    }

    return {
      ok: gagal.length === 0,
      kering: kering,
      diubah: nilai.length,
      dilewatiSudahHash: dilewati,
      tanpaPassword: kosong,
      gagal: gagal,
      usernameDiubah: kering ? diubah.slice(0, 50) : undefined,
      catatan: kering
        ? "MODE KERING: tidak ada yang ditulis. Jalankan tanpa {kering:true} untuk menulis."
        : "Kolom dan struktur sheet tidak berubah. Login menerima hash maupun plaintext, " +
          "jadi migrasi bisa diulang kapan saja.",
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

/**
 * Kembalikan SATU akun ke plaintext.
 * Hanya untuk keadaan darurat (mis. ada sistem lain yang harus membaca kolom D
 * apa adanya). Tidak bisa dipakai untuk memulihkan password yang sudah di-hash —
 * nilai aslinya sudah tidak ada.
 */
function kembalikanPasswordPlaintext_(token, username, passwordBaru) {
  _assertSuperUser(token);
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("db_Users");
  var kolomNama = COL_USERS.userName;
  var data = sh.getDataRange().getValues();
  var target = String(username || "").trim().toLowerCase();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][kolomNama] || "").trim().toLowerCase() !== target) continue;
    if (!String(passwordBaru || "").trim())
      return { ok: false, message: "Password baru wajib diisi." };
    sh.getRange(i + 1, COL_USERS.password + 1, 1, 1).setValue(
      String(passwordBaru).trim(),
    );
    SpreadsheetApp.flush();
    _bustUsersCache_();
    if (typeof loginThrottleReset_ === "function") loginThrottleReset_(username);
    audit_(null, "PW_KEMBALIKAN", target, "OK", "dijadikan plaintext");
    return { ok: true };
  }
  return { ok: false, message: "Akun tidak ditemukan: " + username };
}
