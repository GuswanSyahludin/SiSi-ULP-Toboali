#!/usr/bin/env bash
# =============================================================================
# setup-hemat-biaya.sh - SiSi ULP Toboali
# Rev 24 Agu 2026
# -----------------------------------------------------------------------------
# APA YANG DILAKUKAN SKRIP INI
#   1. Memasang lifecycle rule pada bucket sumber Cloud Build, sehingga arsip
#      source/ berusia lebih dari 7 hari terhapus otomatis oleh Google.
#   2. Memasang cleanup policy pada SEMUA repository Artifact Registry milik
#      project, sehingga image tanpa tag berusia lebih dari 3 hari terhapus
#      otomatis, sementara 3 versi terbaru selalu dipertahankan.
#
# PETA REPOSITORY (hasil pemeriksaan 24 Agu 2026)
#   cloud-run-source-deploy  asia-southeast2   2662 MB  <- penyumbang biaya utama
#   gcr.io                   us                  82 MB
#
#   Catatan: "gcloud artifacts repositories list" pada project ini menampilkan
#   kolom LOCATION kosong, sehingga lokasi TIDAK boleh ditebak. Nilai di atas
#   diperoleh dari "describe" per lokasi. Bila kelak ada repository baru,
#   tambahkan barisnya pada AR_TARGETS.
#
#   Kuota gratis Artifact Registry hanya 0,5 GB untuk seluruh billing account,
#   jadi tumpukan 2,6 GB di cloud-run-source-deploy adalah alasan utama policy
#   ini dipasang.
#
# MENGAPA BUKAN CRON DI CLOUD SHELL
#   Cloud Shell adalah VM sementara. Crontab-nya berhenti begitu sesi ditutup,
#   jadi tidak bisa diandalkan untuk perawatan berkala. Dua fitur di atas
#   dijalankan oleh Google sendiri di sisi server, tanpa perlu sesi terbuka.
#
# BIAYA
#   Object Lifecycle Management: gratis.
#   Artifact Registry cleanup policy: gratis, hanya memakai kuota delete request
#   (batas 600.000 penghapusan per repository per hari - jauh di atas kebutuhan
#   SiSi). Efek bersihnya justru menurunkan tagihan penyimpanan.
#
# CARA PAKAI
#   Jalankan dari root repo di Cloud Shell:
#     bash engines/ops/setup-hemat-biaya.sh --dry-run   # lihat dampak dulu
#     bash engines/ops/setup-hemat-biaya.sh             # pasang permanen
#
# PENTING
#   Artifact Registry mengingat status dry-run dari eksekusi sebelumnya.
#   Karena itu mode APPLY wajib mengirim --no-dry-run secara eksplisit.
# =============================================================================

set -uo pipefail

PROJECT="${GOOGLE_CLOUD_PROJECT:-db-sisi-toboali}"
BUCKET="gs://${PROJECT}_cloudbuild"

# Daftar sasaran, format "repo:lokasi". Timpa lewat variabel AR_TARGETS bila perlu.
AR_TARGETS="${AR_TARGETS:-cloud-run-source-deploy:asia-southeast2 gcr.io:us}"

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIFECYCLE_FILE="$BASE_DIR/cloudbuild-bucket-lifecycle.json"
CLEANUP_FILE="$BASE_DIR/artifact-cleanup-policy.json"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

echo "Project        : $PROJECT"
echo "Bucket build   : $BUCKET"
echo "Sasaran image  : $AR_TARGETS"
echo "Mode           : $([[ $DRY_RUN -eq 1 ]] && echo 'DRY RUN, tidak ada perubahan' || echo 'APPLY')"
echo

# --- 1. Lifecycle bucket Cloud Build -----------------------------------------
echo "== 1/2 Lifecycle bucket sumber Cloud Build"
if [[ $DRY_RUN -eq 1 ]]; then
  echo "   (dry run) akan memasang aturan hapus objek source/ berusia > 7 hari"
  sed 's/^/     /' "$LIFECYCLE_FILE"
else
  gcloud storage buckets update "$BUCKET" --lifecycle-file="$LIFECYCLE_FILE"
  echo "   terpasang. verifikasi:"
  gcloud storage buckets describe "$BUCKET" --format='value(lifecycle_config)'
fi
echo

# --- 2. Cleanup policy Artifact Registry --------------------------------------
echo "== 2/2 Cleanup policy Artifact Registry"
for TARGET in $AR_TARGETS; do
  REPO="${TARGET%%:*}"
  LOC="${TARGET##*:}"
  echo
  echo "   -- $REPO ($LOC)"

  UKURAN="$(gcloud artifacts repositories describe "$REPO" --location="$LOC" \
    --format='value(sizeBytes)' 2>/dev/null)"
  [[ -n "$UKURAN" ]] && echo "      ukuran sekarang: $UKURAN byte"

  if [[ $DRY_RUN -eq 1 ]]; then
    gcloud artifacts repositories set-cleanup-policies "$REPO" \
      --location="$LOC" --policy="$CLEANUP_FILE" --dry-run
  else
    # --no-dry-run wajib: tanpa flag ini repository tetap mewarisi dry-run=true
    # dari simulasi sebelumnya dan tidak akan pernah menghapus image.
    gcloud artifacts repositories set-cleanup-policies "$REPO" \
      --location="$LOC" --policy="$CLEANUP_FILE" --no-dry-run

    STATUS="$(gcloud artifacts repositories describe "$REPO" --location="$LOC" \
      --format='value(cleanupPolicyDryRun)')"
    if [[ "$STATUS" == "False" || "$STATUS" == "false" ]]; then
      echo "      AKTIF: cleanupPolicyDryRun=false"
    else
      echo "      GAGAL AKTIF: cleanupPolicyDryRun=$STATUS" >&2
      exit 1
    fi

    gcloud artifacts repositories describe "$REPO" --location="$LOC" \
      --format='yaml(cleanupPolicies,cleanupPolicyDryRun)'
  fi
done

echo
echo "Selesai. Setelah ini perawatan bulanan tinggal memeriksa Billing dan"
echo "memastikan min-instances ketiga service masih 0."
