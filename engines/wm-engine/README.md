# SiSi WM Engine

Engine membuat watermark foto SiSi menggunakan Pillow dan mengunggah hasilnya
langsung ke Google Drive.

## Desain aktif: Compact V4

Watermark hanya memakai panel kecil di kiri bawah. Data yang ditampilkan:

1. Kode Pekerjaan
2. Tanggal dan jam
3. Koordinat Pekerjaan
4. Akurasi GPS dalam meter, contoh `±4.2 m`
5. Tim dan ULP
6. Jenis Pekerjaan

Akurasi **tidak** menampilkan label Tinggi, Sedang, atau Lemah. Mini-map, logo
PLN terpisah, logo SiSi kanan bawah, data petugas, penyulang, daerah, durasi,
dan jarak tidak lagi digambar agar objek foto tetap dominan.

Panel menggunakan sekitar 34% lebar foto landscape dan 56% pada portrait. Hasil
akhir dibatasi maksimal 2000 px dan disimpan sebagai JPEG quality 85.

## Endpoint

### `POST /watermark`

Kompatibilitas lama. Menerima payload JSON dan mengembalikan JPEG Compact V4
langsung ke pemanggil.

### `POST /watermark/drive`

Flow utama. Engine merender JPEG Compact V4, mengunggah langsung ke Google
Drive, lalu mengembalikan metadata kecil (`fileId`, URL, `wmKey`, dan
`design: compact-v4`).

Contoh payload:

```json
{
  "secret": "...",
  "image": "BASE64_JPEG",
  "folderId": "DRIVE_FOLDER_ID",
  "fileName": "EXE-ROW-240824-017-Sebelum.jpg",
  "idempotencyKey": "EXE-ROW-240824-017:Sebelum",
  "makePublic": true,
  "kodePekerjaan": "EXE-ROW-240824-017",
  "tahap": "Sebelum",
  "hari": "Senin",
  "tanggal": "24 Agustus 2026",
  "jam": "07:15",
  "koordinat": "-2.998412, 106.452819",
  "akurasi": "±4.2 m",
  "tim": "ROW 01",
  "ulp": "ULP Toboali",
  "jenisPekerjaan": "Rabas / Pangkas Pohon"
}
```

`folderId` boleh digantikan oleh environment `WM_DRIVE_ROOT_FOLDER_ID`.
`folderPath` boleh berupa array atau string seperti `ROW/2026/08. Agustus`.

`idempotencyKey` harus stabil per slot foto. Retry dengan key yang sama pada
folder yang sama mengembalikan file yang sudah ada, bukan membuat duplikat.
Jika key tidak dikirim, engine membuat hash foto beserta metadata Compact V4.

`oldFileId` opsional untuk regenerate. File lama baru dihapus setelah file baru
berhasil diunggah.

## Environment Cloud Run

- `WM_SECRET`: secret request, wajib diset di produksi.
- `WM_DRIVE_ROOT_FOLDER_ID`: root folder tujuan default.
- `GOOGLE_SERVICE_ACCOUNT_JSON_B64`: JSON service account dalam base64.
- `WM_PUBLIC_LINKS`: `true` bila hasil default dibuat publik.
- `PORT`: otomatis disediakan Cloud Run.

Lebih aman menggunakan service account runtime Cloud Run yang menjadi anggota
Shared Drive daripada menyimpan JSON key di environment.

## Flow

1. Mobile mengecilkan foto ke sisi terpanjang 2000 px, JPEG quality 85.
2. Foto, metadata, akurasi `Position.accuracy`, dan idempotency key masuk outbox.
3. Saat **Sinkron Semua Data**, backend mengirim satu foto per request ke
   `/watermark/drive`.
4. Engine merender Compact V4 dan mengunggah langsung ke Drive.
5. Backend menyimpan `fileId`, `thumbnailUrl`, serta `wmKey`.
6. Retry aman karena idempotency key mencegah duplikasi.

## Health check

`GET /` mengembalikan status konfigurasi dan `design: compact-v4`.
