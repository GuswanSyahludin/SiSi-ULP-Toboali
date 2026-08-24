import base64
import hashlib
import io
import json
import os
import re

import google.auth
from flask import Flask, abort, jsonify, request, send_file
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

app = Flask(__name__)

SECRET = os.environ.get("WM_SECRET", "")
DRIVE_ROOT_FOLDER_ID = os.environ.get("WM_DRIVE_ROOT_FOLDER_ID", "")
GOOGLE_SERVICE_ACCOUNT_JSON_B64 = os.environ.get(
    "GOOGLE_SERVICE_ACCOUNT_JSON_B64", ""
)
PUBLIC_LINKS_DEFAULT = os.environ.get("WM_PUBLIC_LINKS", "false").lower() in (
    "1",
    "true",
    "yes",
)
BASE_DIR = os.path.dirname(__file__)

# Compact V4 palette.
PANEL = (17, 24, 35, 218)
NAVY = (30, 58, 138, 255)
CYAN = (28, 160, 219, 255)
LIME = (138, 209, 0, 255)
WHITE = (250, 252, 255, 255)
MUTED = (197, 205, 218, 255)


def _asset(name):
    path = os.path.join(BASE_DIR, "assets", name)
    return path if os.path.exists(path) else None


def _font(size):
    path = _asset("DejaVuSans-Bold.ttf")
    try:
        return ImageFont.truetype(path, max(8, int(size))) if path else ImageFont.load_default()
    except Exception:
        return ImageFont.load_default()


def _enhance(image):
    image = ImageOps.autocontrast(image, cutoff=1)
    image = ImageEnhance.Brightness(image).enhance(1.08)
    return ImageEnhance.Sharpness(image).enhance(1.3)


def _rounded(size, radius, fill):
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(image).rounded_rectangle(
        [0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=fill
    )
    return image


def _safe_text(value):
    return "" if value is None else str(value).strip()


def _fit_text(draw, text, font, max_width):
    text = _safe_text(text)
    if not text or draw.textlength(text, font=font) <= max_width:
        return text
    suffix = "…"
    while text and draw.textlength(text + suffix, font=font) > max_width:
        text = text[:-1]
    return text + suffix if text else ""


def _format_accuracy(value):
    text = _safe_text(value)
    if not text:
        return ""
    # Payload baru idealnya sudah berupa ±4.2 m. Fallback menerima angka mentah.
    if "m" in text.lower() or "±" in text:
        return text
    try:
        number = float(text.replace(",", "."))
        return "±%s m" % ("%.1f" % number).rstrip("0").rstrip(".")
    except Exception:
        return text


def _require_secret(data):
    if SECRET and data.get("secret") != SECRET:
        abort(403)


def _decode_source(data):
    encoded = data.get("image")
    if not encoded:
        raise ValueError("Field image (base64) wajib diisi.")
    try:
        return base64.b64decode(encoded, validate=True)
    except Exception as error:
        raise ValueError("Format image base64 tidak valid.") from error


def _render_watermark(data, raw=None):
    """Render SiSi Watermark Compact V4.

    Panel hanya di kiri bawah dan hanya berisi:
    Kode Pekerjaan, Tanggal, Koordinat Pekerjaan, Akurasi, Tim,
    dan Jenis Pekerjaan. Akurasi tidak memakai label kualitas.
    """
    raw = raw or _decode_source(data)
    base = Image.open(io.BytesIO(raw)).convert("RGB")

    max_side = 2000
    if max(base.size) > max_side:
        base.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

    canvas = _enhance(base).convert("RGBA")
    width, height = canvas.size
    scale = max(0.55, width / 1024.0)
    margin = max(10, int(18 * scale))
    pad_x = max(10, int(13 * scale))
    pad_y = max(9, int(11 * scale))

    landscape = width >= height
    panel_width = int(width * (0.34 if landscape else 0.56))
    panel_width = min(panel_width, width - margin * 2)

    kode = _safe_text(
        data.get("kodePekerjaan")
        or data.get("kodeEksekusi")
        or data.get("kodeP0")
        or data.get("kode")
    ) or "-"
    tanggal = _safe_text(data.get("tanggal"))
    hari = _safe_text(data.get("hari"))
    jam = _safe_text(data.get("jam"))
    tanggal_parts = []
    if hari:
        tanggal_parts.append(hari)
    if tanggal:
        tanggal_parts.append(tanggal)
    tanggal_display = ", ".join(tanggal_parts)
    if jam:
        tanggal_display += (" · " if tanggal_display else "") + jam

    lat = _safe_text(data.get("lat"))
    lng = _safe_text(data.get("long"))
    koordinat = _safe_text(
        data.get("koordinatPekerjaan") or data.get("koordinat")
    )
    if not koordinat and lat and lng:
        koordinat = lat + ", " + lng

    akurasi = _format_accuracy(data.get("akurasi") or data.get("accuracy"))
    tim = _safe_text(data.get("tim"))
    ulp = _safe_text(data.get("ulp"))
    if ulp and not ulp.upper().startswith("ULP"):
        ulp = "ULP " + ulp
    tim_display = " · ".join(part for part in (tim, ulp) if part)
    pekerjaan = _safe_text(
        data.get("jenisPekerjaan") or data.get("pekerjaan")
    )
    tahap = _safe_text(data.get("tahap") or data.get("jenisFoto")).upper()

    font_label = _font(14 * scale)
    font_value = _font(15 * scale)
    font_code_label = _font(11 * scale)
    font_code = _font(17 * scale)
    font_stage = _font(11 * scale)
    font_logo = _font(21 * scale)

    probe = ImageDraw.Draw(canvas)
    label_width = int(77 * scale)
    logo_size = int(31 * scale)
    header_height = int(42 * scale)
    row_height = int(25 * scale)
    rows = [
        ("Tanggal", tanggal_display or "-"),
        ("Koordinat", koordinat or "-"),
        ("Akurasi", akurasi or "-"),
        ("Tim", tim_display or "-"),
        ("Pekerjaan", pekerjaan or "-"),
    ]
    panel_height = pad_y * 2 + header_height + int(8 * scale) + len(rows) * row_height

    panel = _rounded(
        (panel_width, panel_height), max(10, int(14 * scale)), PANEL
    )
    draw = ImageDraw.Draw(panel)

    # Header: monogram SiSi, kode, dan tahap foto opsional.
    logo_y = pad_y
    draw.rounded_rectangle(
        [pad_x, logo_y, pad_x + logo_size, logo_y + logo_size],
        radius=max(5, int(8 * scale)),
        fill=NAVY,
        outline=CYAN,
        width=max(1, int(1.5 * scale)),
    )
    logo_text = "S"
    logo_bbox = draw.textbbox((0, 0), logo_text, font=font_logo)
    draw.text(
        (
            pad_x + (logo_size - (logo_bbox[2] - logo_bbox[0])) / 2,
            logo_y + (logo_size - (logo_bbox[3] - logo_bbox[1])) / 2 - logo_bbox[1],
        ),
        logo_text,
        font=font_logo,
        fill=WHITE,
    )

    code_x = pad_x + logo_size + int(9 * scale)
    right_reserved = int(62 * scale) if tahap else 0
    code_width = panel_width - code_x - pad_x - right_reserved
    draw.text((code_x, logo_y), "KODE PEKERJAAN", font=font_code_label, fill=MUTED)
    draw.text(
        (code_x, logo_y + int(15 * scale)),
        _fit_text(probe, kode, font_code, code_width),
        font=font_code,
        fill=WHITE,
    )

    if tahap:
        stage_text = _fit_text(probe, tahap, font_stage, int(53 * scale))
        stage_w = int(draw.textlength(stage_text, font=font_stage)) + int(13 * scale)
        stage_h = int(21 * scale)
        stage_x = panel_width - pad_x - stage_w
        stage_y = logo_y + int(5 * scale)
        draw.rounded_rectangle(
            [stage_x, stage_y, stage_x + stage_w, stage_y + stage_h],
            radius=max(4, int(6 * scale)),
            fill=LIME,
        )
        stage_bbox = draw.textbbox((0, 0), stage_text, font=font_stage)
        draw.text(
            (
                stage_x + (stage_w - (stage_bbox[2] - stage_bbox[0])) / 2,
                stage_y + (stage_h - (stage_bbox[3] - stage_bbox[1])) / 2 - stage_bbox[1],
            ),
            stage_text,
            font=font_stage,
            fill=(31, 51, 20, 255),
        )

    rule_y = pad_y + header_height
    draw.rounded_rectangle(
        [pad_x, rule_y, panel_width - pad_x, rule_y + max(2, int(2.5 * scale))],
        radius=2,
        fill=LIME,
    )

    # Lima baris data, tanpa bullet, minimap, logo terpisah, atau klasifikasi akurasi.
    y = rule_y + int(10 * scale)
    max_value_width = panel_width - pad_x * 2 - label_width
    for label, value in rows:
        draw.text((pad_x, y), label, font=font_label, fill=MUTED)
        draw.text(
            (pad_x + label_width, y),
            _fit_text(probe, value, font_value, max_value_width),
            font=font_value,
            fill=WHITE,
        )
        y += row_height

    canvas.alpha_composite(panel, (margin, height - panel_height - margin))

    output = io.BytesIO()
    canvas.convert("RGB").save(output, format="JPEG", quality=85, optimize=True)
    output.seek(0)
    return output


def _credentials(scopes):
    if GOOGLE_SERVICE_ACCOUNT_JSON_B64:
        raw = base64.b64decode(GOOGLE_SERVICE_ACCOUNT_JSON_B64).decode("utf-8")
        return service_account.Credentials.from_service_account_info(
            json.loads(raw), scopes=scopes
        )
    credentials, _ = google.auth.default(scopes=scopes)
    return credentials


def _drive_service():
    return build(
        "drive",
        "v3",
        credentials=_credentials(["https://www.googleapis.com/auth/drive"]),
        cache_discovery=False,
    )


def _safe_name(value, fallback="watermark"):
    cleaned = re.sub(r'[\\/:*?"<>|\r\n]+', "-", _safe_text(value))
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .-")
    return cleaned[:120] or fallback


def _ensure_folder(service, parent_id, name):
    safe = _safe_name(name, "Tanpa Nama").replace("'", "\\'")
    query = (
        "mimeType='application/vnd.google-apps.folder' and trashed=false "
        f"and name='{safe}' and '{parent_id}' in parents"
    )
    found = (
        service.files()
        .list(
            q=query,
            spaces="drive",
            fields="files(id,name)",
            includeItemsFromAllDrives=True,
            supportsAllDrives=True,
            corpora="allDrives",
        )
        .execute()
        .get("files", [])
    )
    if found:
        return found[0]["id"]
    return (
        service.files()
        .create(
            body={
                "name": _safe_name(name, "Tanpa Nama"),
                "mimeType": "application/vnd.google-apps.folder",
                "parents": [parent_id],
            },
            fields="id",
            supportsAllDrives=True,
        )
        .execute()["id"]
    )


def _resolve_folder(service, data):
    parent = _safe_text(data.get("folderId") or DRIVE_ROOT_FOLDER_ID)
    if not parent:
        raise ValueError("folderId atau WM_DRIVE_ROOT_FOLDER_ID wajib diisi.")
    folder_path = data.get("folderPath") or []
    if isinstance(folder_path, str):
        folder_path = [part for part in folder_path.split("/") if part.strip()]
    if not isinstance(folder_path, list):
        raise ValueError("folderPath harus berupa array atau path string.")
    for segment in folder_path[:8]:
        if _safe_text(segment):
            parent = _ensure_folder(service, parent, segment)
    return parent


def _watermark_key(data, raw):
    explicit = _safe_text(data.get("idempotencyKey"))
    if explicit:
        return hashlib.sha256(explicit.encode("utf-8")).hexdigest()
    metadata_keys = [
        "kodePekerjaan",
        "kodeEksekusi",
        "kodeP0",
        "tanggal",
        "hari",
        "jam",
        "koordinat",
        "koordinatPekerjaan",
        "akurasi",
        "accuracy",
        "tim",
        "ulp",
        "jenisPekerjaan",
        "pekerjaan",
        "tahap",
    ]
    metadata = {key: data.get(key, "") for key in metadata_keys}
    digest = hashlib.sha256()
    digest.update(raw)
    digest.update(json.dumps(metadata, sort_keys=True).encode("utf-8"))
    return digest.hexdigest()


def _find_existing(service, parent_id, wm_key):
    query = (
        f"'{parent_id}' in parents and trashed=false "
        f"and appProperties has {{ key='wmKey' and value='{wm_key}' }}"
    )
    files = (
        service.files()
        .list(
            q=query,
            spaces="drive",
            fields="files(id,name,webViewLink,webContentLink)",
            includeItemsFromAllDrives=True,
            supportsAllDrives=True,
            corpora="allDrives",
            pageSize=1,
        )
        .execute()
        .get("files", [])
    )
    return files[0] if files else None


def _make_public(service, file_id):
    try:
        service.permissions().create(
            fileId=file_id,
            body={"type": "anyone", "role": "reader"},
            supportsAllDrives=True,
        ).execute()
        return True
    except Exception:
        return False


def _file_response(file_data, wm_key, cached=False, public=False):
    file_id = file_data["id"]
    return {
        "ok": True,
        "cached": cached,
        "fileId": file_id,
        "fileName": file_data.get("name", ""),
        "webViewLink": file_data.get("webViewLink", ""),
        "webContentLink": file_data.get("webContentLink", ""),
        "thumbnailUrl": f"https://drive.google.com/thumbnail?id={file_id}",
        "wmKey": wm_key,
        "public": public,
        "design": "compact-v4",
    }


@app.post("/watermark")
def watermark():
    data = request.get_json(silent=True) or {}
    _require_secret(data)
    try:
        return send_file(_render_watermark(data), mimetype="image/jpeg")
    except (ValueError, KeyError) as error:
        return jsonify({"ok": False, "message": str(error)}), 400
    except Exception as error:
        app.logger.exception("Watermark render gagal")
        return jsonify({"ok": False, "message": str(error)}), 500


@app.post("/watermark/drive")
def watermark_to_drive():
    data = request.get_json(silent=True) or {}
    _require_secret(data)
    try:
        raw = _decode_source(data)
        service = _drive_service()
        folder_id = _resolve_folder(service, data)
        wm_key = _watermark_key(data, raw)
        existing = _find_existing(service, folder_id, wm_key)
        if existing:
            return jsonify(_file_response(existing, wm_key, cached=True))

        output = _render_watermark(data, raw=raw)
        name = _safe_name(data.get("fileName"), "WM-" + wm_key[:12])
        if not name.lower().endswith((".jpg", ".jpeg")):
            name += ".jpg"
        created = (
            service.files()
            .create(
                body={
                    "name": name,
                    "parents": [folder_id],
                    "appProperties": {
                        "wmKey": wm_key,
                        "source": "sisi-wm",
                        "design": "compact-v4",
                    },
                },
                media_body=MediaIoBaseUpload(
                    output, mimetype="image/jpeg", resumable=False
                ),
                fields="id,name,webViewLink,webContentLink",
                supportsAllDrives=True,
            )
            .execute()
        )
        public_requested = data.get("makePublic", PUBLIC_LINKS_DEFAULT) is True
        public_ok = _make_public(service, created["id"]) if public_requested else False

        old_file_id = _safe_text(data.get("oldFileId"))
        if old_file_id and old_file_id != created["id"]:
            try:
                service.files().delete(
                    fileId=old_file_id, supportsAllDrives=True
                ).execute()
            except Exception:
                app.logger.warning("File WM lama gagal dihapus: %s", old_file_id)

        return jsonify(_file_response(created, wm_key, public=public_ok))
    except (ValueError, KeyError) as error:
        return jsonify({"ok": False, "message": str(error)}), 400
    except Exception as error:
        app.logger.exception("Watermark upload Drive gagal")
        return jsonify({"ok": False, "message": str(error)}), 500


@app.get("/")
def health():
    return jsonify(
        {
            "ok": True,
            "service": "sisi-wm-engine",
            "design": "compact-v4",
            "directDrive": True,
            "driveRootConfigured": bool(DRIVE_ROOT_FOLDER_ID),
            "secretConfigured": bool(SECRET),
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
