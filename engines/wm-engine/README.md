# SiSi WM Engine

Engine membuat watermark foto SiSi menggunakan Pillow.

## Endpoint

### `POST /watermark`

Flow lama. Menerima payload JSON dan mengembalikan JPEG langsung ke pemanggil.
Dipertahankan agar integrasi lama tidak rusak.

### `POST /watermark/drive`

Flow hemat bandwidth. Engine merender JPEG, mengunggahnya langsung ke Google
Drive, lalu mengembalikan metadata kecil (`fileId`, URL, dan `wmKey`).

Payload minimum:

```json
{
  "secret": "...",
  "image": "BASE64_JPEG",
  "folderPath": ["ROW", "2026", "08. Agustus", "ROW 01"],
  "fileName": "EXE-ROW-001-Sebelum.jpg",
  "idempotencyKey": "EXE-ROW-001:foto-sebelum",
  "ulp": "Toboali",
  "tim": "ROW 01",
  "petugas": "Nama Petugas",
  "jam": "07:15",
  "hari": "Senin",
  "tanggal": "24 Agustus 2026",
  "koordinat": "-2.998412, 106.452819"
}
```

`folderId` boleh dikirim pada payload untuk menggantikan root folder dari
environment. `folderPath` boleh berupa array atau string `ROW/2026/08. Agustus`.

`idempotencyKey` wajib dibuat stabil per slot foto. Retry dengan key yang sama
di folder yang sama mengembalikan file yang sudah ada, bukan membuat duplikat.
Jika key tidak dikirim, engine membuat hash dari foto dan metadata watermark.

`makePublic: true` mencoba memberi izin `anyone:reader`. Gunakan hanya bila foto
memang harus ditampilkan lewat URL publik. Untuk Shared Drive internal, lebih
aman biarkan `false` dan gunakan `fileId` melalui backend yang terautentikasi.

`oldFileId` opsional untuk regenerate. File lama baru dihapus setelah upload
file baru berhasil.

## Environment Cloud Run

- `WM_SECRET`: secret request. Wajib diset di produksi.
- `WM_DRIVE_ROOT_FOLDER_ID`: folder root tujuan default.
- `GOOGLE_SERVICE_ACCOUNT_JSON_B64`: JSON service account dalam base64. Tidak
  diperlukan bila Cloud Run memakai service account runtime dengan izin Drive.
- `WM_PUBLIC_LINKS`: `true` bila semua hasil secara default dibuat publik.
- `PORT`: otomatis disediakan Cloud Run.

Service account harus menjadi anggota Shared Drive atau diberi akses Editor ke
folder root. Untuk produksi, lebih baik gunakan service account runtime Cloud
Run daripada menaruh JSON key di environment.

## Flow mobile yang disarankan

1. Mobile mengecilkan foto ke sisi terpanjang 2000 px, JPEG quality 85.
2. Foto asli, metadata, dan `idempotencyKey` disimpan ke outbox lokal.
3. Saat **Sinkron Semua Data**, mobile/backend mengirim satu foto per request ke
   `/watermark/drive`.
4. Engine merender dan mengunggah hasil langsung ke Drive.
5. Pemanggil menyimpan `fileId`, `thumbnailUrl`, dan `wmKey`, lalu menandai item
   outbox selesai.
6. Jika jaringan putus, request diulang dengan key yang sama tanpa duplikasi.

## Health check

`GET /` mengembalikan status JSON termasuk apakah root Drive dan secret sudah
dikonfigurasi.
