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

/*
 * Perbaikan nomor gardu berikutnya.
 *
 * SisiRun menyisipkan token di depan argumen string, sehingga pemanggilan web
 * menjadi getNomorGarduBerikutnya(token, kodeGardu). Implementasi lama hanya
 * menerima satu argumen dan salah membaca token sebagai kode gardu.
 */
function getNomorGarduBerikutnya(tokenOrKode, kodeGardu) {
  try {
    var kode;

    if (arguments.length >= 2) {
      var token = String(tokenOrKode || "").trim();
      if (!token || !getSesiByToken(token)) {
        return {
          ok: false,
          message: "Sesi habis atau tidak valid. Silakan login ulang.",
        };
      }
      kode = String(kodeGardu || "").trim().toUpperCase();
    } else {
      // Kompatibilitas pengujian internal/editor: satu argumen tetap dianggap kode.
      kode = String(tokenOrKode || "").trim().toUpperCase();
    }

    var daftarKode =
      typeof BA_KODE_GARDU !== "undefined" && BA_KODE_GARDU.length
        ? BA_KODE_GARDU
        : ["TB", "PY", "TL", "PG"];

    if (!kode) {
      return {
        ok: false,
        message: "Kode gardu wajib dipilih (" + daftarKode.join(" / ") + ").",
      };
    }
    if (daftarKode.indexOf(kode) === -1) {
      return {
        ok: false,
        message: 'Kode gardu "' + kode + '" tidak dikenal. Pilih: ' + daftarKode.join(", ") + ".",
      };
    }

    var maxMaster = _baMaxNomorGardu_(
      BA_MASTER_GARDU.spreadsheetId,
      BA_MASTER_GARDU.sheetName,
      kode,
    );
    var maxRekap = _baMaxNomorGardu_(
      BA_SOURCE.spreadsheetId,
      BA_SOURCE.sheetName,
      kode,
    );

    var terakhir = Math.max(maxMaster, maxRekap);
    var sumber =
      maxRekap > maxMaster
        ? "Rekap Gardu"
        : maxMaster >= 0
          ? "Master Gardu"
          : "Baru";
    var nextNum = (terakhir < 0 ? 0 : terakhir) + 1;

    return {
      ok: true,
      kodeGardu: kode,
      nomorGardu: _baFormatNomorGardu_(kode, nextNum),
      nomorGarduTerakhir:
        terakhir < 0 ? "" : _baFormatNomorGardu_(kode, terakhir),
      sumber: sumber,
    };
  } catch (error) {
    return {
      ok: false,
      message: "Gagal mengambil nomor gardu berikutnya: " + error.message,
    };
  }
}
