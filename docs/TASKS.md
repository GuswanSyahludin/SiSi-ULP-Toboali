# Task Eksekusi — Menu C4A Role Pegawai

Daftar kerja 30 task AKTIF dikelompokkan per fase.
ABAIKAN semua task berlabel [RETIRED] di bagian bawah — itu alur lama yang sudah
ditolak, JANGAN dibangun. Ini kontrak anti-salah-arah.

## FASE 1 — Pilih Aset & Catat Temuan C4A

### Pilih Aset C4A

1. Dropdown Jenis Object (Jaringan/Gardu) sebagai penentu aset
2. Cascade unit UP3/ULP per level akun login sebelum pilih aset
3. Cabang Jaringan: dropdown Penyulang & Section + gabungan Section
4. Cabang Gardu: dropdown Nomor Gardu + auto Penyulang/Section/Koordinat
5. Filter dropdown Temuan berdasar Jenis Object
6. Gabungkan pemilihan aset ke satu form C4A scroll (tanpa alur layar terpisah)

### Aset yang Dinilai

7. Buat blok ringkasan aset terpilih di atas bagian temuan (1 aset per baris)

### Catat Temuan C4A

8. Auto-fill kolom identitas unit dari unit yang berlaku
9. Generate Kode Temuan C4A otomatis
10. Counter <NNN> pertama reset harian per ULP+Penyulang
11. Counter .TO dihitung per ULP (1 temuan = 1 TO)
12. Dropdown Temuan ikut difilter pilihan Tier
13. Koordinat jaringan manual ambil titik GPS
14. Kalkulasi Prioritas ROW (Pythagoras) + fallback LOOKUP
15. Waktu/Folder auto + foto bukti + cek kelengkapan

## FASE 2 — Kirim Temuan C4A

16. Buat halaman daftar temuan C4A lokal beserta status & tombol Sinkron
17. Simulasikan kirim otomatis saat jaringan pulih
18. Tambahkan status gagal dan aksi kirim ulang
19. Sediakan query daftar temuan C4A beserta status
20. Simpan antrean temuan C4A yang belum terkirim
21. Buat sinkronisasi otomatis antrean C4A ke pusat
22. Pastikan sinkronisasi C4A tidak menghasilkan duplikat
23. Sesuaikan sinkronisasi fase-1 untuk temuan tanpa WO
24. Tambahkan validasi kelengkapan sebelum antrean dikirim
25. Buat service kirim ulang temuan C4A yang gagal

## FASE 3 — Akses Peran C4A

26. Buat penyedia peran dari akun sesi login (terverifikasi saat online, cache saat offline)
27. Tampilkan menu C4A berdasarkan peran terverifikasi
28. Lindungi rute C4A dari peran tanpa akses
29. Buat endpoint profil untuk peran pengguna aktif
30. Terapkan otorisasi peran pada API modul C4A

## ⛔ DIABAIKAN — task [RETIRED] (alur lama, JANGAN dibangun)

- Halaman daftar aset generik — tergantikan cascade aset
- Pencarian nama/filter unit generik — tergantikan cascade aset
- Halaman ringkasan aset terpilih — tergantikan sub-fitur Aset yang Dinilai
- Panel antrean lokal temuan belum terkirim — tergantikan beranda daftar temuan lokal
- Endpoint daftar aset generik — tergantikan endpoint cascade aset
- Query cari/filter daftar aset — tergantikan cascade aset
- Dropdown Penyulang dari Master_Penyulang filter unit — tergantikan pemilihan di Pilih Aset
- Terapkan guard menu C4A untuk role Admin/Pegawai — duplikat fitur Akses Peran
- Terapkan guard role pada route C4A — duplikat "Lindungi rute"
- Layar C4A sementara data tiruan — layar produksi sudah ada di fase 1–2
