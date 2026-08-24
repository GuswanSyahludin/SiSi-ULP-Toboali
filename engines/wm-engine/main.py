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


def _asset(name):
    path = os.path.join(BASE_DIR, "assets", name)
    return path if os.path.exists(path) else None


def _logo(name):
    path = _asset(name)
    return Image.open(path).convert("RGBA") if path else None


LOGO_PLN = _logo("logo_pln.png")
LOGO_SISI = _logo("logo_sisi.png")


def _font(size):
    path = _asset("DejaVuSans-Bold.ttf")
    try:
        return ImageFont.truetype(path, size) if path else ImageFont.load_default()
    except Exception:
        return ImageFont.load_default()


def _enhance(image):
    image = ImageOps.autocontrast(image, cutoff=1)
    image = ImageEnhance.Brightness(image).enhance(1.12)
    return ImageEnhance.Sharpness(image).enhance(1.4)


GREEN = (138, 209, 0, 255)
PANEL = (38, 38, 38, 180)
WHITE = (255, 255, 255, 255)
SUBTLE = (225, 225, 225, 255)


def _rounded(size, radius, fill):
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(image).rounded_rectangle(
        [0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=fill
    )
    return image


def _wrap(draw, text, font, max_width):
    words = (text or "").split()
    lines, current = [], ""
    for word in words:
        candidate = (current + " " + word).strip()
        if not current or draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]


def _decode_minimap(encoded, width, height):
    try:
        if not encoded:
            return None
        image = Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGBA")
        return image.resize((width, height))
    except Exception:
        return None


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
    raw = raw or _decode_source(data)
    base = Image.open(io.BytesIO(raw)).convert("RGB")

    # Mobile disarankan mengirim maksimal 2000 px. Guard ini tetap dipertahankan
    # agar foto kamera mentah tidak memboroskan RAM dan waktu Cloud Run.
    max_side = 2000
    if max(base.size) > max_side:
        base.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

    base = _enhance(base).convert("RGBA")
    width, height = base.size
    canvas = base.copy()
    scale = max(0.6, width / 1024.0)
    margin = int(20 * scale)
    lat = data.get("lat", "")
    lng = data.get("long", "")

    # Kartu minimap kanan atas.
    if data.get("minimap"):
        map_width = int(width * 0.24)
        map_height = int(map_width * 0.66)
        minimap = _decode_minimap(data.get("minimap"), map_width, map_height)
        if minimap:
            inner = int(8 * scale)
            card = _rounded(
                (map_width + inner * 2, map_height + inner * 2),
                int(14 * scale),
                PANEL,
            )
            mask = _rounded((map_width, map_height), int(9 * scale), WHITE)
            card.paste(minimap, (inner, inner), mask)
            canvas.alpha_composite(card, (width - card.width - margin, margin))

    # Kartu informasi kiri bawah.
    pad = int(20 * scale)
    content_width = int(width * 0.40)
    font_title = _font(int(30 * scale))
    font_sub = _font(int(19 * scale))
    font_time = _font(int(46 * scale))
    font_small = _font(int(18 * scale))
    font_body = _font(int(21 * scale))

    measure = ImageDraw.Draw(canvas)
    logo_height = int(48 * scale)
    logo_width = (
        int(LOGO_PLN.width * (logo_height / LOGO_PLN.height))
        if LOGO_PLN
        else 0
    )
    heading_offset = logo_width + int(12 * scale) if LOGO_PLN else 0
    ulp_text = data.get("ulp", "")
    if ulp_text and not ulp_text.upper().startswith("ULP"):
        ulp_text = "ULP " + ulp_text

    tim = data.get("tim", "")
    petugas = data.get("petugas", "")
    header_height = max(logo_height, int(58 * scale))
    separator_height = int(22 * scale)
    time_height = int(50 * scale)
    jam = data.get("jam", "")
    hari = data.get("hari", "")
    tanggal = data.get("tanggal", "")

    koordinat = data.get("koordinat") or (
        f"{lat}, {lng}" if lat and lng else ""
    )
    blocks = []
    petugas_display = " & ".join(
        part.strip() for part in petugas.split(",") if part.strip()
    )
    if petugas_display:
        blocks.append(["Petugas : " + petugas_display])
    if data.get("penyulang"):
        blocks.append(["Penyulang : " + data.get("penyulang")])
    if data.get("switching"):
        blocks.append(["Switching : " + data.get("switching")])
    if data.get("arus"):
        blocks.append(["Arus (R/S/T) : " + data.get("arus")])
    if data.get("daerah"):
        blocks.append(["Daerah Pekerjaan : " + data.get("daerah")])
    if koordinat:
        blocks.append(["Koordinat :", koordinat])
    if data.get("durasi"):
        blocks.append(["Durasi : " + data.get("durasi")])
    if data.get("jarak"):
        blocks.append(["Jarak (Closing → Pekerjaan) : " + data.get("jarak")])
    if data.get("jarakP0"):
        blocks.append(["Jarak Antar P0 : " + data.get("jarakP0")])

    bullet_indent = int(22 * scale)
    body_line_height = int(31 * scale)
    line_gap = int(7 * scale)
    wrapped = []
    for block in blocks:
        lines = []
        for logical in block:
            lines += _wrap(
                measure, logical, font_body, content_width - bullet_indent
            )
        wrapped.append(lines)

    body_height = sum(
        body_line_height * len(lines) + line_gap for lines in wrapped
    )
    gap = int(12 * scale)
    card_height = (
        pad * 2
        + header_height
        + gap
        + separator_height
        + gap
        + time_height
        + gap
        + body_height
    )
    card_width = pad * 2 + content_width
    card = _rounded((card_width, card_height), int(16 * scale), PANEL)
    draw = ImageDraw.Draw(card)
    y = pad

    if LOGO_PLN:
        logo = LOGO_PLN.resize((logo_width, logo_height))
        card.paste(logo, (pad, y), logo)
    draw.text((pad + heading_offset, y), ulp_text, font=font_title, fill=WHITE)
    draw.text(
        (pad + heading_offset, y + int(32 * scale)),
        tim,
        font=font_sub,
        fill=SUBTLE,
    )
    y += header_height + gap

    line_width = max(2, int(3 * scale))
    line_y_1 = y + int(4 * scale)
    line_y_2 = line_y_1 + line_width + int(8 * scale)
    draw.line([(0, line_y_1), (card_width - 1, line_y_1)], fill=GREEN, width=line_width)
    draw.line([(0, line_y_2), (card_width - 1, line_y_2)], fill=GREEN, width=line_width)
    y += separator_height + gap

    draw.text((pad, y), jam, font=font_time, fill=GREEN)
    date_x = pad + int(draw.textlength(jam, font=font_time)) + int(14 * scale)
    draw.text((date_x, y + int(6 * scale)), hari, font=font_small, fill=WHITE)
    draw.text(
        (date_x, y + int(26 * scale)), tanggal, font=font_body, fill=WHITE
    )
    y += time_height + gap

    for lines in wrapped:
        bullet_size = int(11 * scale)
        draw.rectangle(
            [
                pad,
                y + int(6 * scale),
                pad + bullet_size,
                y + int(6 * scale) + bullet_size,
            ],
            fill=GREEN,
        )
        for line in lines:
            draw.text(
                (pad + bullet_indent, y), line, font=font_body, fill=WHITE
            )
            y += body_line_height
        y += line_gap

    card_y = max(margin, height - card_height - margin)
    canvas.alpha_composite(card, (margin, card_y))

    # Logo SiSi kanan bawah.
    if LOGO_SISI:
        logo_height = int(76 * scale)
        logo_width = int(LOGO_SISI.width * (logo_height / LOGO_SISI.height))
        logo_card = _rounded(
            (logo_width + pad, logo_height + pad), int(14 * scale), PANEL
        )
        logo = LOGO_SISI.resize((logo_width, logo_height))
        logo_card.paste(logo, (pad // 2, pad // 2), logo)
        canvas.alpha_composite(
            logo_card,
            (
                width - (logo_width + pad) - margin,
                height - (logo_height + pad) - margin,
            ),
        )

    output = io.BytesIO()
    canvas.convert("RGB").save(
        output, format="JPEG", quality=85, optimize=True
    )
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
    cleaned = re.sub(r'[\\/:*?"<>|\r\n]+', "-", str(value or "").strip())
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

    created = (
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
        .execute()
    )
    return created["id"]


def _resolve_folder(service, data):
    parent = str(data.get("folderId") or DRIVE_ROOT_FOLDER_ID).strip()
    if not parent:
        raise ValueError(
            "folderId atau environment WM_DRIVE_ROOT_FOLDER_ID wajib diisi."
        )

    folder_path = data.get("folderPath") or []
    if isinstance(folder_path, str):
        folder_path = [part for part in folder_path.split("/") if part.strip()]
    if not isinstance(folder_path, list):
        raise ValueError("folderPath harus berupa array atau path string.")

    for segment in folder_path[:8]:
        if str(segment).strip():
            parent = _ensure_folder(service, parent, str(segment))
    return parent


def _watermark_key(data, raw):
    explicit = str(data.get("idempotencyKey") or "").strip()
    if explicit:
        return hashlib.sha256(explicit.encode("utf-8")).hexdigest()

    metadata_keys = [
        "ulp",
        "tim",
        "petugas",
        "jam",
        "hari",
        "tanggal",
        "lat",
        "long",
        "koordinat",
        "penyulang",
        "switching",
        "arus",
        "daerah",
        "durasi",
        "jarak",
        "jarakP0",
    ]
    metadata = {key: data.get(key, "") for key in metadata_keys}
    digest = hashlib.sha256()
    digest.update(raw)
    digest.update(json.dumps(metadata, sort_keys=True).encode("utf-8"))
    if data.get("minimap"):
        digest.update(str(data.get("minimap")).encode("utf-8"))
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
    }


@app.post("/watermark")
def watermark():
    """Endpoint lama: render JPEG dan kirim kembali ke pemanggil."""
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
    """Render sekali, upload langsung ke Drive, lalu kembalikan metadata kecil.

    Payload tambahan:
      folderId: parent folder Drive (opsional bila env root sudah diisi)
      folderPath: array atau path string, contoh ["ROW", "2026", "08. Agustus"]
      fileName: nama output tanpa/with ekstensi .jpg
      idempotencyKey: ID stabil milik pekerjaan/foto agar retry tidak duplikat
      makePublic: true bila URL thumbnail perlu dibaca langsung tanpa login
      oldFileId: file lama yang baru dihapus SETELAH upload baru berhasil
    """
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

        media = MediaIoBaseUpload(output, mimetype="image/jpeg", resumable=False)
        created = (
            service.files()
            .create(
                body={
                    "name": name,
                    "parents": [folder_id],
                    "appProperties": {"wmKey": wm_key, "source": "sisi-wm"},
                },
                media_body=media,
                fields="id,name,webViewLink,webContentLink",
                supportsAllDrives=True,
            )
            .execute()
        )

        public_requested = data.get("makePublic", PUBLIC_LINKS_DEFAULT) is True
        public_ok = _make_public(service, created["id"]) if public_requested else False

        # Aman untuk regenerate: file lama hanya dihapus setelah file baru sukses.
        old_file_id = str(data.get("oldFileId") or "").strip()
        if old_file_id and old_file_id != created["id"]:
            try:
                service.files().delete(
                    fileId=old_file_id, supportsAllDrives=True
                ).execute()
            except Exception:
                app.logger.warning("File WM lama gagal dihapus: %s", old_file_id)

        return jsonify(
            _file_response(
                created,
                wm_key,
                cached=False,
                public=public_ok,
            )
        )
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
            "directDrive": True,
            "driveRootConfigured": bool(DRIVE_ROOT_FOLDER_ID),
            "secretConfigured": bool(SECRET),
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
