#!/usr/bin/env bash
set -euo pipefail

# Audit read-only: memastikan project hanya mengaktifkan Maps SDK for Android.
# Script ini tidak menonaktifkan API apa pun. Jalankan sesudah login gcloud:
#   bash scripts/audit-google-maps-zero-cost.sh [PROJECT_ID]

PROJECT_ID="${1:-${GOOGLE_CLOUD_PROJECT:-}}"
if [[ -z "$PROJECT_ID" ]]; then
  PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
fi
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "(unset)" ]]; then
  echo "GAGAL: sertakan PROJECT_ID atau set project aktif di gcloud." >&2
  exit 2
fi

ALLOWED="maps-android-backend.googleapis.com"
PAID_MAP_APIS=(
  routes.googleapis.com
  places.googleapis.com
  geocoding-backend.googleapis.com
  geolocation.googleapis.com
  street-view-image-backend.googleapis.com
  tile.googleapis.com
  aerialview.googleapis.com
  navigation.googleapis.com
  roads.googleapis.com
  routeoptimization.googleapis.com
)

mapfile -t ENABLED < <(
  gcloud services list --enabled --project="$PROJECT_ID" \
    --format='value(config.name)'
)

contains() {
  local needle="$1"
  printf '%s\n' "${ENABLED[@]}" | grep -Fxq "$needle"
}

echo "Project: $PROJECT_ID"
if contains "$ALLOWED"; then
  echo "OK: Maps SDK for Android aktif ($ALLOWED)."
else
  echo "GAGAL: Maps SDK for Android belum aktif ($ALLOWED)." >&2
  exit 3
fi

FOUND=()
for api in "${PAID_MAP_APIS[@]}"; do
  if contains "$api"; then FOUND+=("$api"); fi
done

if (( ${#FOUND[@]} > 0 )); then
  echo "GAGAL: layanan Google Maps tambahan terdeteksi:" >&2
  for api in "${FOUND[@]}"; do
    echo "  - $api" >&2
  done
  echo "Nonaktifkan secara manual setelah memastikan tidak dipakai:" >&2
  for api in "${FOUND[@]}"; do
    printf '  gcloud services disable %q --project=%q\n' "$api" "$PROJECT_ID" >&2
  done
  exit 4
fi

echo "AMAN: tidak ada Routes, Places, Navigation, Geocoding, Street View, Tiles, Roads, atau Route Optimization."
echo "Estimasi layanan peta SiSi: Rp0, selama kebijakan harga Maps SDK tidak berubah."
