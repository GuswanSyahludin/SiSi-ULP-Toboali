# Watermark lokal per tim, format v1

## Status commit
Modul format dan renderer lokal tersedia. BELUM dihubungkan ke tombol kamera, outbox foto, atau backend upload. Jalur watermark Cloud Run yang berjalan saat ini tidak diubah. Ini bukan klaim fitur sudah aktif dalam APK. Jalankan `flutter test test/local_watermark_test.dart`, `flutter analyze`, dan bandingkan hasil foto pada perangkat sebelum mengaktifkan integrasi. Tes belum dijalankan dalam lingkungan asisten (Flutter SDK tidak tersedia).

## Format yang disepakati
Panel gelap di kiri bawah, tinggi mengikuti isi (tanpa ruang kosong tetap), tulisan terang lebih besar, aksen hijau kekuningan dan dua garis horizontal. Logo PLN memakai aset asli aplikasi. Header di samping logo berisi kode dan ULP. Bagian di bawah garis berisi jam pengambilan, hari, tanggal WIB dan field tim berikut. Logo SiSi tetap terpisah di kanan bawah; untuk portrait sempit pindah ke kanan atas agar tidak bertabrakan.

| Tim | Header kode | Field setelah jam/hari/tanggal |
| --- | --- | --- |
| Yandal | Kode P0 | Koordinat pekerjaan, akurasi bila tersedia, Penyulang, Section, Jenis pekerjaan, Daerah pekerjaan, Tim (Petugas) dari subTim + petugas, Waktu |
| ROW | Kode Eksekusi | Koordinat pekerjaan, akurasi bila tersedia, Penyulang, Section, Jenis pekerjaan, Waktu |
| Inspeksi Gardu | Kode Temuan masing-masing | Koordinat temuan, akurasi bila tersedia, Penyulang, Section, Nomor Gardu, Temuan, Waktu |
| Inspeksi Jaringan | Kode Temuan masing-masing | Koordinat temuan, akurasi bila tersedia, Penyulang, Section, Segmen, Temuan, Waktu |

`capturedAt` adalah instant pengambilan foto untuk jam/hari/tanggal. `createdAt` adalah instant pembuatan record, ditulis sebagai `Waktu: dd/MM/yyyy HH:mm:ss WIB`. Keduanya wajib disuplai dan dibekukan saat kejadian, tidak diganti dengan waktu sinkron atau waktu rendering. Renderer tidak memanggil DateTime.now untuk metadata bukti. Timestamp/gps berasal dari caller dan masih membutuhkan validasi, bukan bukti anti-manipulasi.

Kode temuan untuk inspeksi BUKAN kode P0 Yandal. Tidak ada fallback otomatis ke kode header/shift. Jika kode resmi belum tersedia offline, tahan rendering final sampai kode didapat, atau ubah kontrak pembuatan kode server secara eksplisit; jangan menampilkan ID lokal dengan label kode resmi.

## Pemakaian modul
```dart
final result = await LocalWatermarkRenderer.render(
  originalBytes: await originalFile.readAsBytes(),
  data: metadataSaatPengambilan,
);
final bundle = await result.saveNewBundle(privateWatermarkDirectory);
// bundle/watermark.jpg dan bundle/manifest.json
```
Foto input harus asli, bukan foto yang sudah ber-watermark. Tidak ada cara andal mendeteksi semua watermark dari piksel. Jangan gunakan foto contoh yang sudah ber-WM sebagai input final karena akan menumpuk teks. Renderer tidak mengubah file sumber dan menyimpan JPEG hasil secara terpisah. Orientasi EXIF dibakukan sebelum gambar ditempeli. Format JPEG/PNG didukung lewat package image; HEIC yang gagal dibaca harus dikonversi dalam alur capture sebelum memanggil renderer.

Teks panjang dibungkus, bukan dipotong. Jika semua metadata tetap tidak muat, renderer menolak dengan pesan jelas, bukan menghasilkan watermark terpotong. Font disesuaikan resolusi (24 px pada sisi pendek 900 px), gambar dibatasi sisi panjang 2048 px secara default. Komposisi beberapa foto besar harus dijalankan serial; decode foto asli dapat memakai memori besar. Modul memakai Flutter Canvas/TextPainter, bukan isolate Dart tanpa Flutter engine.

## Integrasi selanjutnya sebelum aktif
1. Bekukan metadata per foto/slot dari GPS non-mock, record dan sesi; jangan mengambil metadata baru saat retry/sync.
2. Pastikan kode P0/eksekusi/temuan sudah tersedia sebelum final rendering. Saat ini beberapa kode diterbitkan server setelah upload; perlu integrasi kontrak ID.
3. Simpan path asli, path hasil, metadata dan manifest dalam outbox yang sama secara transaksional. Gunakan file manifest sebagai tanda bundle selesai; pertahankan asli jika render gagal.
4. Tambahkan jalur upload hasil lokal pada backend. Verifikasi kepemilikan record/ULP dan metadata; checksum dari klien bukan tanda tangan kepercayaan.
5. Setelah backend menerima hasil lokal yang valid, lewati render Cloud Run untuk foto itu saja. Jangan mematikan trigger watermark global, agar foto AppSheet/klien lama tetap diproses.
6. Uji landscape/portrait, kode panjang, petugas panjang, foto minim cahaya, EXIF rotasi, airplane mode, restart, upload retry, akun berubah dan anti-watermark-ganda.

Tidak ada migrasi sheet, perubahan keystore, upload produksi, atau pemindahan seluruh engine dalam commit ini.
