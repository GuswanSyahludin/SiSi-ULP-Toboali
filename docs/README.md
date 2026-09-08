# Menu C4A Role Pegawai — Dokumen Handoff

Plan lanjutan di atas baseline yang sudah berjalan. Membangun menu C4A (Care For
Asset) untuk role Admin/Pegawai PLN dengan MENGEMBANGKAN dari pola fase-1 yang
sudah ada di repo ini (form inspeksi, kamera bukti, verifikasi GPS, simpan-tanpa-
koneksi & sinkronisasi offline, autentikasi) — BUKAN menulis dari nol.

Dokumen:

- PRD.md → sumber kebenaran (persyaratan, arsitektur, skema, aturan §8).
- TASKS.md → urutan kerja 30 task per fase; abaikan yang [RETIRED].

Keputusan inti yang wajib diikuti:

- Satu layar form scroll (pilih aset + catat temuan), dibuka lewat FAB '+' dari
  beranda daftar temuan lokal — BUKAN halaman pembuka C4A.
- C4A = inspeksi TANPA Work Order: kolom Kode WO & Jenis WO dikosongkan.
- Identitas unit diisi otomatis dari level akun login (UID/UP3/ULP) lewat cascade.
- Kode Temuan PEG-<Kode ULP><YYMMDD><NNN>.TO-<NNN> (lihat PRD §8.3).
- Sinkronisasi kirim-semua dari beranda + otomatis saat jaringan pulih, idempoten.
- Akses C4A hanya Super User / Admin / Pegawai PLN.
