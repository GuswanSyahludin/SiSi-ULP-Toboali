#!/usr/bin/env bash
# =============================================================================
# setup-hemat-biaya.sh - SiSi ULP Toboali
# Rev 24 Agu 2026
# -----------------------------------------------------------------------------
# APA YANG DILAKUKAN SKRIP INI
#   1. Memasang lifecycle rule pada bucket sumber Cloud Build, sehingga arsip
#      source/ berusia lebih dari 7 hari terhapus otomatis oleh Google.
#   2. Memasang cleanup policy pada repository Artifact Registry, sehingga image
#      tanpa tag berusia lebih dari 3 hari terhapus otomatis, sementara 3 versi
#      terbaru selalu dipertahankan.
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
# CATATAN PENTING
#   Jalankan --dry-run lebih dahulu. Mode itu hanya melaporkan versi image yang
#   akan terkena policy, tidak menghapus apa pun, dan tidak menyimpan policy.
# =============================================================================

set -euo pipefail

PROJECT="${GOOGLE_CLOUD_PROJECT:-db-sisi-toboali}"
BUCKET="gs://${PROJECT}_cloudbuild"
AR_LOCATION="${AR_LOCATION:-asia}"   # repo gcr.io milik project ini berada di multi-region asia
AR_REPO="${AR_REPO:-gcr.io}"         # ganti bila image sudah dipindah ke repository lain

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIFECYCLE_FILE="$BASE_DIR/cloudbuild-bucket-lifecycle.json"
CLEANUP_FILE="$BASE_DIR/artifact-cleanup-policy.json"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

echo "Project        : $PROJECT"
echo "Bucket build   : $BUCKET"
echo "Repo artifact  : $AR_REPO ($AR_LOCATION)"
echo "Mode           : $([[ $DRY_RUN -eq 1 ]] && echo 'DRY RUN, tidak ada perubahan' || echo 'APPLY')"
echo

# --- 1. Lifecycle bucket Cloud Build -----------------------------------------
echo "== 1/2 Lifecycle bucket sumber Cloud Build"
if [[ $DRY_RUN -eq 1 ]]; then
  echo "   (dry run) akan memasang aturan hapus objek source/ berusia > 7 hari"
  echo "   isi aturan:"
  sed 's/^/     /' "$LIFECYCLE_FILE"
else
  gcloud storage buckets update "$BUCKET" --lifecycle-file="$LIFECYCLE_FILE"
  echo "   terpasang. verifikasi:"
  gcloud storage buckets describe "$BUCKET" --format='value(lifecycle_config)'
fi
echo

# --- 2. Cleanup policy Artifact Registry --------------------------------------
echo "== 2/2 Cleanup policy Artifact Registry"
echo "   repository yang tersedia di project ini:"
gcloud artifacts repositories list --format='table(name,format,location)' || true
echo

if [[ $DRY_RUN -eq 1 ]]; then
  gcloud artifacts repositories set-cleanup-policies "$AR_REPO" \
    --location="$AR_LOCATION" \
    --policy="$CLEANUP_FILE" \
    --dry-run
else
  gcloud artifacts repositories set-cleanup-policies "$AR_REPO" \
    --location="$AR_LOCATION" \
    --policy="$CLEANUP_FILE"
  echo "   terpasang. verifikasi:"
  gcloud artifacts repositories describe "$AR_REPO" \
    --location="$AR_LOCATION" \
    --format='yaml(cleanupPolicies,cleanupPolicyDryRun)'
fi

echo
echo "Selesai. Setelah ini perawatan bulanan tinggal memeriksa Billing dan"
echo "memastikan min-instances ketiga service masih 0."
