/* Sinkron edit Master Gardu dari outbox Flutter ke tiga gsheet lewat updateHiUp3. */
function updateMasterGarduMobile(token, payload) {
  try {
    var sesi = getSesiByToken(String(token || "").trim());
    if (!sesi)
      return { success: false, message: "Sesi habis, buka aplikasi ulang." };
    /* Kebijakan 29 Agu 2026: "admin" TIDAK lagi menjadi jalur istimewa.
       Admin boleh mengedit Gardu (peran operasional), tetapi terikat ke ULP
       sendiri seperti staf lain. Hanya Super User yang bebas memilih ULP.
       Sebelumnya: `role === "super user" || role === "admin"`. */
    var adalahSuper =
      typeof _normRole_ === "function"
        ? _normRole_(sesi.role) === "SUPER"
        : String(sesi.role || "").trim().toLowerCase() === "super user";
    var role = String(sesi.role || "").trim().toLowerCase();
    var sub = String(sesi.subTim || "").trim().toLowerCase();
    var boleh = adalahSuper || role === "admin" || sub === "inspeksi gardu";
    if (!boleh) return { success: false, message: "Akses edit Gardu ditolak." };

    payload = payload || {};
    var gardu = String(payload.gardu || "").trim();
    if (!gardu) return { success: false, message: "Nomor Gardu wajib." };

    var ulpSesi = String(sesi.ulp || "").trim();
    var ulpPayload = String(payload.ulp || "").trim();
    /* ULP yang diminta klien hanya dihormati untuk Super User. Semua peran
       lain, termasuk Admin, dipaksa ke ULP sesi. */
    var targetUlp = adalahSuper ? ulpPayload || ulpSesi : ulpSesi;
    if (!adalahSuper && ulpPayload && ulpPayload.toLowerCase() !== ulpSesi.toLowerCase())
      return { success: false, message: "ULP payload tidak sesuai sesi." };
    if (!adalahSuper && !ulpSesi)
      return { success: false, message: "Akun belum terhubung ke ULP." };

    var d = payload.data || {};
    var map = {
      alamat: "D",
      jenisGardu: "K",
      merk: "L",
      kapasitasKva: "M",
      noSeri: "N",
      tahunTrafo: "O",
      typeSeal: "P",
      merkPhbTr: "Q",
      nomorSeriPhbTr: "R",
      tahunPhbTr: "S",
      jamUkurWbp: "T",
      tanggalPengukuran: "U",
      kepemilikan: "V",
      wbpRs: "AB",
      wbpSt: "AC",
      wbpTr: "AD",
      wbpRn: "AE",
      wbpSn: "AF",
      wbpTn: "AG",
      wbpR: "AH",
      wbpS: "AI",
      wbpT: "AJ",
      wbpN: "AK",
      lwbpRs: "BE",
      lwbpSt: "BF",
      lwbpTr: "BG",
      lwbpRn: "BH",
      lwbpSn: "BI",
      lwbpTn: "BJ",
      lwbpR: "BK",
      lwbpS: "BL",
      lwbpT: "BM",
      lwbpN: "BN",
      arusMaxPerFasa: "DG",
      pembebananKva: "EW",
      pembebananKw: "EX",
      persentaseBeban: "EY",
      kategoriBeban: "EZ",
    };
    var mg = {},
      it = {};
    Object.keys(map).forEach(function (k) {
      if (d[k] === undefined) return;
      mg[map[k]] = d[k];
      it[map[k]] = d[k];
    });
    if (!Object.keys(mg).length)
      return {
        success: false,
        message: "Tidak ada field yang dapat diperbarui.",
      };

    var res = updateHiUp3({
      nomorGardu: gardu,
      ulp: targetUlp,
      mg: mg,
      sf: {},
      it: it,
    });
    return res && res.ok
      ? { success: true, message: res.message || "Master Gardu tersinkron." }
      : {
          success: false,
          message: (res && res.message) || "Sinkron Master Gardu gagal.",
        };
  } catch (e) {
    return { success: false, message: "Gagal sinkron Gardu: " + e.message };
  }
}
