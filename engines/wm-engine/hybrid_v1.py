"""SiSi WM Engine - Anti-Manipulasi V1 (hybrid entrypoint Cloud Run).

=============================================================================
CATATAN DEPLOY CLOUD RUN (acuan tetap, jangan cari ulang)
=============================================================================
Project Google Cloud   : db-sisi-toboali
Nama service Cloud Run : wm-engine
Region                 : asia-southeast2
URL service            : https://wm-engine-1011716929576.asia-southeast2.run.app
Entrypoint container   : hybrid_v1:app   (lihat Dockerfile)
WM version aktif       : compact-v5-anti-manipulation-v1
Ukuran kanvas kanonik  : landscape 1600x1200, portrait 1200x1600, JPEG q85

Environment yang dipakai service ini:
  WM_SECRET                    -> WAJIB. Sudah terpasang di Cloud Run.
  WM_SIGNING_SECRET            -> WAJIB untuk endpoint verifikasi V1.
  WM_DRIVE_ROOT_FOLDER_ID      -> opsional, kosong karena folder dikirim payload.
  WM_PUBLIC_LINKS              -> opsional, default false.
  WM_ALLOWED_TIME_SKEW_SECONDS -> opsional, default 86400.

NILAI SECRET TIDAK DITULIS DI REPO. Ambil dari Cloud Run bila perlu:
  gcloud run services describe wm-engine --region asia-southeast2 \
    --format='yaml(spec.template.spec.containers[0].env)'

Langkah redeploy dari Cloud Shell:
  cd ~/SiSi--Sistem-Integrasi- && git pull origin main
  cd engines/wm-engine
  gcloud builds submit --tag gcr.io/$GOOGLE_CLOUD_PROJECT/wm-engine:v1
  gcloud run deploy wm-engine \
    --image gcr.io/$GOOGLE_CLOUD_PROJECT/wm-engine:v1 \
    --region asia-southeast2 --platform managed \
    --update-env-vars WM_SIGNING_SECRET="<hasil openssl rand -hex 32>"

Pakai --update-env-vars, bukan --set-env-vars, supaya WM_SECRET lama tidak hilang.

Verifikasi setelah deploy:
  curl https://wm-engine-1011716929576.asia-southeast2.run.app/
  curl https://wm-engine-1011716929576.asia-southeast2.run.app/watermark/v1
Harus tampil version compact-v5-anti-manipulation-v1 dan signingConfigured true.

Engine Cloud Run lain pada project yang sama:
  ba-pdf-engine  region asia-southeast2
  row-pdf-engine region asia-southeast2
=============================================================================
"""

import base64
import hashlib
import hmac
import io
import json
import os
from datetime import datetime, timezone

from flask import jsonify, request
from PIL import Image

from main import app, _render_watermark, _require_secret

WM_VERSION = "compact-v5-anti-manipulation-v1"
SIGNING_SECRET = os.environ.get("WM_SIGNING_SECRET", "")
ALLOWED_SKEW_SECONDS = int(os.environ.get("WM_ALLOWED_TIME_SKEW_SECONDS", "86400"))


def _decode(value, field):
    try:
        return base64.b64decode(value or "", validate=True)
    except Exception as error:
        raise ValueError(f"{field} base64 tidak valid.") from error


def _sha(raw):
    return hashlib.sha256(raw).hexdigest()


def _canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _validate_dimensions(raw, manifest):
    image = Image.open(io.BytesIO(raw))
    expected = (1600, 1200) if image.width >= image.height else (1200, 1600)
    if image.size != expected:
        return False, f"Resolusi harus {expected[0]}x{expected[1]}."
    if int(manifest.get("width", 0)) != expected[0] or int(manifest.get("height", 0)) != expected[1]:
        return False, "Resolusi manifest tidak cocok."
    return True, ""


def _validate_manifest(manifest, original, local_wm):
    required = [
        "kodePekerjaan", "slotFoto", "tanggal", "koordinat", "username",
        "tim", "ulp", "wmVersion", "capturedAt", "originalSha256",
        "watermarkSha256", "manifestSha256",
    ]
    missing = [key for key in required if not str(manifest.get(key, "")).strip()]
    if missing:
        return ["Field manifest kosong: " + ", ".join(missing)]
    errors = []
    if manifest.get("wmVersion") != WM_VERSION:
        errors.append("Versi WM tidak didukung.")
    if not hmac.compare_digest(str(manifest.get("originalSha256")), _sha(original)):
        errors.append("Hash foto asli tidak cocok.")
    if not hmac.compare_digest(str(manifest.get("watermarkSha256")), _sha(local_wm)):
        errors.append("Hash WM lokal tidak cocok.")
    unsigned = dict(manifest)
    declared_manifest_hash = str(unsigned.pop("manifestSha256", ""))
    actual_manifest_hash = _sha(_canonical_json(unsigned).encode("utf-8"))
    if not hmac.compare_digest(declared_manifest_hash, actual_manifest_hash):
        errors.append("Hash manifest tidak cocok.")
    try:
        captured = datetime.fromisoformat(str(manifest["capturedAt"]).replace("Z", "+00:00"))
        if captured.tzinfo is None:
            captured = captured.replace(tzinfo=timezone.utc)
        skew = abs((datetime.now(timezone.utc) - captured).total_seconds())
        if skew > ALLOWED_SKEW_SECONDS:
            errors.append("Waktu pengambilan di luar batas verifikasi.")
    except Exception:
        errors.append("capturedAt tidak valid.")
    ok, message = _validate_dimensions(original, manifest)
    if not ok:
        errors.append(message)
    if "," not in str(manifest.get("koordinat", "")):
        errors.append("Koordinat tidak valid.")
    return errors


def _receipt(manifest, canonical_hash, disposition):
    receipt = {
        "verificationId": hashlib.sha256(
            (manifest["kodePekerjaan"] + "|" + manifest["slotFoto"] + "|" + canonical_hash).encode("utf-8")
        ).hexdigest()[:24],
        "verifiedAt": datetime.now(timezone.utc).isoformat(),
        "wmVersion": WM_VERSION,
        "originalSha256": manifest["originalSha256"],
        "canonicalSha256": canonical_hash,
        "disposition": disposition,
    }
    if not SIGNING_SECRET:
        raise ValueError("WM_SIGNING_SECRET wajib diset.")
    receipt["signature"] = hmac.new(
        SIGNING_SECRET.encode("utf-8"),
        _canonical_json(receipt).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return receipt


@app.post("/watermark/v1/verify")
def verify_watermark_v1():
    data = request.get_json(silent=True) or {}
    _require_secret(data)
    try:
        original = _decode(data.get("original"), "original")
        local_wm = _decode(data.get("localWatermark"), "localWatermark")
        manifest = data.get("manifest") or {}
        errors = _validate_manifest(manifest, original, local_wm)
        strict = data.get("strictCanonical", True) is not False

        render_payload = dict(manifest)
        render_payload.update({
            "image": base64.b64encode(original).decode("ascii"),
            "kodePekerjaan": manifest.get("kodePekerjaan"),
            "koordinat": manifest.get("koordinat"),
            "akurasi": manifest.get("akurasi"),
            "jenisPekerjaan": manifest.get("jenisPekerjaan"),
        })
        if errors or strict:
            canonical = _render_watermark(render_payload, raw=original).getvalue()
            disposition = "RENDERED_BY_SERVER" if errors else "CANONICALIZED_BY_SERVER"
        else:
            canonical = local_wm
            disposition = "VERIFIED_LOCAL"
        canonical_hash = _sha(canonical)
        receipt = _receipt(manifest, canonical_hash, disposition)
        return jsonify({
            "ok": True,
            "validLocal": not errors,
            "errors": errors,
            "receipt": receipt,
            "canonicalImage": base64.b64encode(canonical).decode("ascii"),
            "design": WM_VERSION,
        })
    except ValueError as error:
        return jsonify({"ok": False, "message": str(error)}), 400
    except Exception as error:
        app.logger.exception("WM V1 verification failed")
        return jsonify({"ok": False, "message": str(error)}), 500


@app.get("/watermark/v1")
def wm_v1_health():
    return jsonify({
        "ok": True,
        "version": WM_VERSION,
        "signingConfigured": bool(SIGNING_SECRET),
        "canonicalResolution": {"landscape": "1600x1200", "portrait": "1200x1600"},
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
