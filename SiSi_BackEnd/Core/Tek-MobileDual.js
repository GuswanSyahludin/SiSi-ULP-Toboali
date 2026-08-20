/* =====================================================
   Tek-MobileDual.js — SiSi ULP Toboali (DUAL-READ ENDPOINT MOBILE)
   Rev 20 Agu 2026 (malam) — Project Dart: 2 DB terbaca (AKTIF + ARSIP).
   -----------------------------------------------------
   Endpoint mobile yang membaca data LAMA (≤ H-2, sudah dipindah Tek-Migrasi ke
   spreadsheet ARSIP) tetap menemukan datanya. Pola mengikuti Tek-Migrasi:
     • TULIS hanya ke AKTIF — file ini TIDAK menulis apa pun.
     • BACA dari KEDUANYA — date-routed (Pola C) utk filter tanggal, fallback (Pola A)
       utk lookup by kode.
   Helper _mobileBatasArsip_ / _mobileReadByTanggal_ / _mobileReadDualByKey_ ada di
   Code.js (global scope). apiRouter_ (Code.js) otomatis memakai wrapper di sini bila
   file ini terpasang (typeof guard) & kembali ke versi lama bila belum — aman utk
   clasp push bertahap.
   ===================================================== */

/* ===== 1) VERIFIKASI P0 — DAFTAR (db_Yandal_P0) DUAL-READ =====
   Logika SAMA dgn getApprovalP0List (Tek-Yandal-Code.js); hanya sumber baca diganti:
   tanggal filter ≤ H-2 → dibaca dari ARSIP (helper sudah fallback AKTIF bila kosong).
   Tanggal > H-2 / tanpa tanggal → diteruskan ke fungsi asli apa adanya. */
function getApprovalP0ListDual_(params) {
  try {
    params = params || {};
    if (typeof getApprovalP0List !== "function")
      return { ok: false, error: "getApprovalP0List tidak tersedia." };
    var tglFilter = params.tanggal ? _normTgl(params.tanggal) : "";
    var batas =
      typeof _mobileBatasArsip_ === "function" ? _mobileBatasArsip_() : "";
    if (
      typeof _mobileReadByTanggal_ !== "function" ||
      !tglFilter ||
      !batas ||
      tglFilter > batas
    ) {
      return getApprovalP0List(params); // tanggal baru / helper belum ada → jalur asli (AKTIF)
    }

    // Tanggal lama (≤ H-2): db_Yandal_P0 sudah dipindah → baca ARSIP (fallback AKTIF
    // otomatis di dalam helper). Badge counts tetap dihitung utk filter ulp+tanggal ini.
    var ulpFilter = String(params.ulp || "").trim();
    var statusFilter = String(params.status || "Menunggu").trim(); // default: hanya yang menunggu approval
    var counts = { Menunggu: 0, Approved: 0, Rejected: 0 };
    var d = _mobileReadByTanggal_(
      SHEET_YANDAL.P0,
      COL_P0.folderPath + 1,
      COL_P0.tanggal,
      tglFilter,
    );
    if (!d.length) return { ok: true, list: [], counts: counts }; // kosong di KEDUA sumber

    var C = COL_P0,
      out = [];
    for (var i = 0; i < d.length; i++) {
      var kodeP0 = String(d[i][C.kodeP0] || "").trim();
      if (!kodeP0) continue;
      var ulp = String(d[i][C.ulp] || "").trim();
      if (ulpFilter && ulp !== ulpFilter) continue;
      var tgl = _normTgl(d[i][C.tanggal]);
      if (tglFilter && tgl !== tglFilter) continue;

      var fSeb = _p0FotoObj_(d[i], C.linkDownloadSebelum, C.fotoSebelumUrl);
      var fPek = _p0FotoObj_(d[i], C.linkDownloadPekerjaan, C.fotoPekerjaanUrl);
      var fSes = _p0FotoObj_(d[i], C.linkDownloadSesudah, C.fotoSesudahUrl);
      var fotoLengkap = fSeb.has && fPek.has && fSes.has; // ke-3 foto sudah punya URL

      // Status approval hanya 2 nilai nyata: Approved / Rejected. Selain itu efektif "Menunggu",
      // TAPI hanya P0 yang ke-3 fotonya sudah ada URL & status approval masih kosong yang masuk antrean approval.
      var raw = String(d[i][C.statusApproval] || "").trim();
      var status;
      if (raw === "Approved" || raw === "Rejected") status = raw;
      else if (fotoLengkap) status = "Menunggu";
      else continue; // foto belum lengkap & belum diputuskan → belum masuk approval admin

      counts[status]++; // badge tab: hitung SEMUA status (filter ulp+tanggal tetap berlaku)
      if (statusFilter && status.toLowerCase() !== statusFilter.toLowerCase())
        continue;
      out.push({
        kodeP0: kodeP0,
        ulp: ulp,
        hari: String(d[i][C.hari] || ""),
        tanggal: tgl,
        namaPekerjaan:
          String(d[i][C.namaPekerjaan] || "").trim() ||
          String(d[i][C.pekerjaanLainnya] || "").trim(),
        penyulang: String(d[i][C.penyulang] || ""),
        section: String(d[i][C.section] || ""),
        daerah: String(d[i][C.daerah] || ""),
        tim: String(d[i][C.tim] || ""),
        petugas: String(d[i][C.petugas] || ""),
        durasi: String(d[i][C.durasi] || ""),
        jarakAntarP0: String(d[i][C.jarakAntarP0] || ""),
        jarakClosing: String(d[i][C.jarak] || ""),
        catatan: String(d[i][C.catatan] || ""), // kolom Catatan (AM) tampil di card & detail
        koordinat: String(d[i][C.koordinat] || ""),
        koordinatClosing: String(d[i][C.koordinatClosing] || ""),
        fotoSebelum: fSeb,
        fotoPekerjaan: fPek,
        fotoSesudah: fSes,
        status: status,
        approvedBy: String(d[i][C.approvedBy] || ""),
        alasanRejected: String(d[i][C.alasanRejected] || ""), // tampil di detail kartu Rejected
        point: String(d[i][C.point] || ""), // tampil di detail kartu Approved
        timestampApprove: d[i][C.timestampApprove]
          ? _tglDMY_(d[i][C.timestampApprove])
          : "",
      });
    }
    out.sort(function (a, b) {
      var ra = a.status === "Menunggu" ? 0 : 1,
        rb = b.status === "Menunggu" ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return String(b.tanggal || "").localeCompare(String(a.tanggal || ""));
    });
    return { ok: true, list: out, counts: counts };
  } catch (e) {
    Logger.log("getApprovalP0ListDual_ ERROR (fallback ke jalur asli): " + e);
    try {
      return getApprovalP0List(params);
    } catch (e2) {
      return { ok: false, error: e2.message };
    }
  }
}

/* ===== 2) LAMPIRAN PENGECEKAN P0 (P0 induk + db_Yandal_Pengecekan_Switching) =====
   Logika SAMA dgn getLampiranPengecekanP0 (Tek-Yandal-Code.js); lookup by Kode P0
   memakai Pola A (fallback): AKTIF → tidak ketemu → ARSIP. Spreadsheet pengukuran
   gardu adalah file TERPISAH yang TIDAK dimigrasi → blok gardu tetap jalur asli. */
function getLampiranPengecekanP0Dual_(params) {
  try {
    var kodeP0 = String((params && params.kodeP0) || "").trim();
    if (!kodeP0) return { ok: false, error: "kodeP0 wajib diisi." };
    if (typeof _mobileReadDualByKey_ !== "function")
      return getLampiranPengecekanP0(params); // helper belum ada → jalur asli

    // 1) P0 induk: konteks ringkas + 3 foto standar — AKTIF → ARSIP (Pola A).
    var rowsP = _mobileReadDualByKey_(
      SHEET_YANDAL.P0,
      COL_P0.folderPath + 1,
      COL_P0.kodeP0,
      kodeP0,
    );
    if (!rowsP.length)
      return { ok: false, error: "Baris P0 tidak ditemukan: " + kodeP0 };
    var rp = rowsP[0];
    var p0 = {
      kodeP0: kodeP0,
      namaPekerjaan:
        String(rp[COL_P0.namaPekerjaan] || "").trim() ||
        String(rp[COL_P0.pekerjaanLainnya] || "").trim(),
      penyulang: String(rp[COL_P0.penyulang] || ""),
      daerah: String(rp[COL_P0.daerah] || ""),
      tanggal: _normTgl(rp[COL_P0.tanggal]),
      fotoSebelum: _p0FotoObj_(
        rp,
        COL_P0.linkDownloadSebelum,
        COL_P0.fotoSebelumUrl,
      ),
      fotoPekerjaan: _p0FotoObj_(
        rp,
        COL_P0.linkDownloadPekerjaan,
        COL_P0.fotoPekerjaanUrl,
      ),
      fotoSesudah: _p0FotoObj_(
        rp,
        COL_P0.linkDownloadSesudah,
        COL_P0.fotoSesudahUrl,
      ),
    };
    var namaPekLower = p0.namaPekerjaan.toLowerCase();

    // 2) Anak-anak Pengecekan Switching — AKTIF → ARSIP, HANYA bila pekerjaan berkaitan switching.
    var switching = [];
    if (namaPekLower.indexOf("switching") >= 0) {
      var rowsS = _mobileReadDualByKey_(
        SHEET_YANDAL.SWITCHING,
        COL_SWITCHING.folderPath + 1,
        COL_SWITCHING.kodeP0,
        kodeP0,
      );
      for (var i = 0; i < rowsS.length; i++) {
        var r = rowsS[i],
          S = COL_SWITCHING;
        switching.push({
          kodeSwitching: String(r[S.kodeSwitching] || "").trim(),
          penyulang: String(r[S.penyulang] || "").trim(),
          namaSwitching: String(r[S.namaSwitching] || "").trim(),
          jamPengecekan:
            _jamHHmm_(r[S.jamPengecekan]) || String(r[S.jamPengecekan] || ""),
          indikatorRemote: String(r[S.indikatorRemote] || ""),
          indikatorLocal: String(r[S.indikatorLocal] || ""),
          indicatorProtection: String(r[S.indicatorProtection] || ""),
          indicatorReclose: String(r[S.indicatorReclose] || ""),
          arusR: String(r[S.arusR] || ""),
          arusS: String(r[S.arusS] || ""),
          arusT: String(r[S.arusT] || ""),
          fotoArus: _p0FotoObj_(r, S.linkDownloadArus, S.fotoArusUrl),
          fotoG1: _p0FotoObj_(r, S.linkDownloadG1, S.fotoG1Url),
          fotoG2: _p0FotoObj_(r, S.linkDownloadG2, S.fotoG2Url),
          fotoG3: _p0FotoObj_(r, S.linkDownloadG3, S.fotoG3Url),
          fotoG4: _p0FotoObj_(r, S.linkDownloadG4, S.fotoG4Url),
          fotoG5: _p0FotoObj_(r, S.linkDownloadG5, S.fotoG5Url),
        });
      }
    }

    // 3) Baris-baris Pengukuran Gardu — spreadsheet TERPISAH, TIDAK dimigrasi → jalur asli.
    var gardu = [];
    if (namaPekLower.indexOf("gardu") >= 0) {
      try {
        var shU = _sheetUkurGardu_(SpreadsheetApp.openById(YANDAL_UKUR_SS_ID));
        if (shU && shU.getLastRow() > 1) {
          var du = shU.getDataRange().getValues(),
            U = COL_UKUR_GARDU;
          for (var u = 1; u < du.length; u++) {
            if (String(du[u][U.kodeP0] || "").trim() !== kodeP0) continue;
            gardu.push({
              kodeUkur: String(du[u][U.kodeUkur] || "").trim(),
              penyulang: String(du[u][U.penyulang] || "").trim(),
              section: String(du[u][U.section] || "").trim(),
              noGardu: String(du[u][U.noGardu] || "").trim(),
              alamat: String(du[u][U.alamat] || "").trim(),
              jamUkur:
                _jamHHmm_(du[u][U.jamUkur]) || String(du[u][U.jamUkur] || ""),
              bebanR: String(du[u][U.bebanR] || ""),
              bebanS: String(du[u][U.bebanS] || ""),
              bebanT: String(du[u][U.bebanT] || ""),
              bebanN: String(du[u][U.bebanN] || ""),
              tegRS: String(du[u][U.tegRS] || ""),
              tegRT: String(du[u][U.tegRT] || ""),
              tegST: String(du[u][U.tegST] || ""),
              tegRN: String(du[u][U.tegRN] || ""),
              tegSN: String(du[u][U.tegSN] || ""),
              tegTN: String(du[u][U.tegTN] || ""),
              petugas: String(du[u][U.petugas] || "").trim(),
            });
          }
        }
      } catch (eU) {
        Logger.log(
          "getLampiranPengecekanP0Dual_: baca pengukuran gardu gagal — " + eU,
        );
      }
    }
    return { ok: true, p0: p0, switching: switching, gardu: gardu };
  } catch (e) {
    Logger.log(
      "getLampiranPengecekanP0Dual_ ERROR (fallback ke jalur asli): " + e,
    );
    try {
      return getLampiranPengecekanP0(params);
    } catch (e2) {
      return { ok: false, error: e2.message };
    }
  }
}
