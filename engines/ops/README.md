# Ops: Otomatisasi Hemat Biaya SiSi

Project Google Cloud: `db-sisi-toboali` · Region service: `asia-southeast2`

Dua sumber biaya yang tumbuh diam-diam pada setup SiSi adalah **arsip sumber
Cloud Build** di bucket `gs://db-sisi-toboali_cloudbuild` dan **image container
tanpa tag** yang menumpuk setiap kali engine dibangun ulang. Sebelumnya keduanya
dibersihkan manual tiap bulan. Folder ini membuat pembersihan itu berjalan
sendiri di sisi Google.

## Isi folder

| File | Fungsi |
| --- | --- |
| `cloudbuild-bucket-lifecycle.json` | Lifecycle rule: hapus objek `source/` berusia lebih dari 7 hari |
| `artifact-cleanup-policy.json` | Cleanup policy: hapus image tanpa tag berusia lebih dari 3 hari, pertahankan 3 versi terbaru |
| `setup-hemat-biaya.sh` | Pemasang sekali jalan untuk kedua aturan di atas |

## Cara pasang

```bash
cd ~/SiSi--Sistem-Integrasi-
git pull origin main

# 1. lihat dampaknya dulu, tidak menghapus apa pun
bash engines/ops/setup-hemat-biaya.sh --dry-run

# 2. kalau hasilnya wajar, pasang permanen
bash engines/ops/setup-hemat-biaya.sh
```

Bila repository Artifact Registry bukan `gcr.io` atau lokasinya bukan `asia`,
sesuaikan lewat variabel lingkungan:

```bash
AR_REPO=nama-repo AR_LOCATION=asia-southeast2 bash engines/ops/setup-hemat-biaya.sh
```

## Apakah berbayar

Tidak. **Object Lifecycle Management** tidak ditagih, dan penghapusan yang
dipicu lifecycle tidak dihitung sebagai operasi berbayar. **Cleanup policy
Artifact Registry** juga gratis; ia hanya memakai kuota penghapusan sebesar
600.000 versi per repository per hari, jauh di atas kebutuhan SiSi. Efek
akhirnya menurunkan biaya penyimpanan, bukan menambah.

Alternatif berbasis **Cloud Scheduler + Cloud Run job** sengaja tidak dipakai:
lebih rumit, perlu service account tersendiri, dan tidak memberi manfaat
tambahan pada skala ini.

## Mengapa bukan cron di Cloud Shell

Cloud Shell adalah VM sementara. Crontab di dalamnya berhenti begitu sesi
ditutup dan home directory bisa didaur ulang setelah lama tidak dipakai, jadi
jadwal pembersihan tidak pernah benar-benar jalan. Lifecycle rule dan cleanup
policy dieksekusi oleh Google tanpa perlu sesi terbuka.

## Cara verifikasi kapan pun

```bash
# lifecycle bucket
gcloud storage buckets describe gs://db-sisi-toboali_cloudbuild \
  --format='value(lifecycle_config)'

# cleanup policy image
gcloud artifacts repositories describe gcr.io --location=asia \
  --format='yaml(cleanupPolicies,cleanupPolicyDryRun)'

# konfigurasi hemat Cloud Run
for SVC in wm-engine row-pdf-engine ba-pdf-engine; do
  echo "== $SVC"
  gcloud run services describe $SVC --region asia-southeast2 \
    --format='value(spec.template.spec.containers[0].resources.limits.memory,spec.template.metadata.annotations)'
done
```

## Cara mencabut

```bash
# hapus lifecycle bucket
echo '{"lifecycle": {"rule": []}}' > /tmp/kosong.json
gcloud storage buckets update gs://db-sisi-toboali_cloudbuild \
  --lifecycle-file=/tmp/kosong.json

# hapus cleanup policy image
gcloud artifacts repositories delete-cleanup-policies gcr.io \
  --location=asia --policynames=hapus-untagged,simpan-3-terbaru
```

## Konfigurasi Cloud Run terkait (per 24 Agu 2026)

Ketiga engine berjalan pada memory `1Gi`, `min-instances=0`, `max-instances=3`,
`concurrency=20`. Karena `min-instances=0`, container mati saat idle sehingga
memory 1Gi tidak menimbulkan biaya diam. Detail lengkap ada di dokumen ClickUp
"Konfigurasi Hemat Biaya Cloud Run SiSi".
