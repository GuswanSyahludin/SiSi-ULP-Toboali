/*
 * Berita Acara: samakan sumber Penyulang dan Section dengan Jadwal Padam.
 *
 * Sumber tunggal: Jadwal-Padam-Code.js -> getJadwalPadamMaster() ->
 * spreadsheet Jadwal Padam, sheet "Master Daerah Padam".
 *
 * Nama file diawali ZZ agar definisi kompatibilitas ini dimuat setelah
 * SIE-BA-Code.js dan menggantikan implementasi lama yang membaca db_Penyulang.
 */
function getPenyulangDanSection(token) {
  try {
    var sesi = null;
    var tokenText = String(token || "").trim();
    if (tokenText && typeof getSesiByToken === "function") {
      sesi = getSesiByToken(tokenText);
      if (!sesi) {
        return {
          ok: false,
          penyulangList: [],
          sectionByPenyulang: {},
          message: "Sesi habis atau tidak valid. Silakan login ulang.",
        };
      }
    }

    if (typeof getJadwalPadamMaster !== "function") {
      return {
        ok: false,
        penyulangList: [],
        sectionByPenyulang: {},
        message: "Master Jadwal Padam belum tersedia.",
      };
    }

    // Gunakan filter ULP yang sama dengan sesi aktif agar BA tidak menampilkan
    // Penyulang milik ULP lain. Super User tetap mengikuti ULP akun bila ada.
    var ulp = sesi ? String(sesi.ulp || "").trim() : "";
    var master = getJadwalPadamMaster({ ulp: ulp });
    if (!master || !master.ok) {
      return {
        ok: false,
        penyulangList: [],
        sectionByPenyulang: {},
        message: (master && master.message) || "Gagal memuat Master Daerah Padam.",
      };
    }

    var penyulangList = [];
    var sectionByPenyulang = {};
    var namaPenyulangByKey = {};
    var sectionSeenByKey = {};

    function norm(value) {
      return String(value == null ? "" : value)
        .normalize("NFKC")
        .replace(/\u00a0/g, " ")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
    }

    (master.rows || []).forEach(function (row) {
      var penyulang = String((row && row.penyulang) || "")
        .replace(/\u00a0/g, " ")
        .trim()
        .replace(/\s+/g, " ");
      var section = String((row && row.section) || "")
        .replace(/\u00a0/g, " ")
        .trim()
        .replace(/\s+/g, " ");
      var pKey = norm(penyulang);
      var sKey = norm(section);
      if (!pKey || !sKey) return;

      if (!namaPenyulangByKey[pKey]) {
        namaPenyulangByKey[pKey] = penyulang;
        penyulangList.push(penyulang);
        sectionByPenyulang[penyulang] = [];
        sectionSeenByKey[pKey] = {};
      }

      if (!sectionSeenByKey[pKey][sKey]) {
        sectionSeenByKey[pKey][sKey] = true;
        sectionByPenyulang[namaPenyulangByKey[pKey]].push(section);
      }
    });

    penyulangList.sort(function (a, b) {
      return a.localeCompare(b, "id", { sensitivity: "base" });
    });
    penyulangList.forEach(function (penyulang) {
      sectionByPenyulang[penyulang].sort(function (a, b) {
        return a.localeCompare(b, "id", { sensitivity: "base" });
      });
    });

    return {
      ok: true,
      penyulangList: penyulangList,
      sectionByPenyulang: sectionByPenyulang,
      source: "Master Daerah Padam",
    };
  } catch (error) {
    return {
      ok: false,
      penyulangList: [],
      sectionByPenyulang: {},
      message: "Gagal memuat Penyulang dan Section: " + error.message,
    };
  }
}
