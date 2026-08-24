#!/usr/bin/env bash
# =============================================================================
# setup-hemat-biaya.sh - SiSi ULP Toboali
# Rev 24 Agu 2026
# -----------------------------------------------------------------------------
# Memasang lifecycle bucket Cloud Build dan cleanup policy Artifact Registry.
# Google menjalankan keduanya otomatis tanpa cron/Cloud Shell aktif.
#
# Repository terverifikasi 24 Agu 2026:
#   cloud-run-source-deploy  asia-southeast2   2662 MB
#   gcr.io                   us                  82 MB
#
# Pakai:
#   bash engines/ops/setup-hemat-biaya.sh --dry-run
#   bash engines/ops/setup-hemat-biaya.sh
#
# Catatan gcloud: cleanupPolicyDryRun=false sering DIHILANGKAN dari output
# format value(), sehingga string kosong juga berarti dry-run sudah nonaktif.
# =============================================================================

set -uo pipefail

PROJECT="${GOOGLE_CLOUD_PROJECT:-db-sisi-toboali}"
BUCKET="gs://${PROJECT}_cloudbuild"
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
    gcloud artifacts repositories set-cleanup-policies "$REPO" \
      --location="$LOC" --policy="$CLEANUP_FILE" --no-dry-run

    STATUS="$(gcloud artifacts repositories describe "$REPO" --location="$LOC" \
      --format='value(cleanupPolicyDryRun)')"
    # Artifact Registry/gcloud menghilangkan field boolean bernilai false.
    # Maka output kosong, False, atau false semuanya berarti policy aktif.
    if [[ -z "$STATUS" || "$STATUS" == "False" || "$STATUS" == "false" ]]; then
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
