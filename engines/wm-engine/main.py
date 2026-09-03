import base64
import hashlib
import hmac
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
GOOGLE_SERVICE_ACCOUNT_JSON_B64 = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON_B64", "")
PUBLIC_LINKS_DEFAULT = os.environ.get("WM_PUBLIC_LINKS", "false").lower() in ("1", "true", "yes")
BASE_DIR = os.path.dirname(__file__)
DESIGN_VERSION = "dynamic-team-v3-grid"

PANEL_BG = (15, 22, 32, 225)
LIME_BRIGHT = (163, 230, 53, 255)
PLN_YELLOW = (250, 204, 21, 255)
WHITE = (255, 255, 255, 255)
MUTED = (203, 213, 225, 255)


def _asset(name):
    path = os.path.join(BASE_DIR, "assets", name)
    return path if os.path.exists(path) else None


def _font(size):
    path = _asset("DejaVuSans-Bold.ttf")
    try:
        return ImageFont.truetype(path, max(7, int(round(size)))) if path else ImageFont.load_default()
    except Exception:
        return ImageFont.load_default()


def _enhance(image):
    image = ImageOps.autocontrast(image, cutoff=1)
    image = ImageEnhance.Brightness(image).enhance(1.06)
    return ImageEnhance.Sharpness(image).enhance(1.25)


def _rounded(size, radius, fill):
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(image).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=fill)
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


def _text_height(draw, font):
    box = draw.textbbox((0, 0), "Ag", font=font)
    return max(1, box[3] - box[1])


def _require_secret(data):
    supplied = str(data.get("secret") or "")
    if not SECRET or not hmac.compare_digest(supplied, SECRET):
        abort(403)


def _decode_source(data):
    encoded = data.get("image")
    if not encoded:
        raise ValueError("Field image (base64) wajib diisi.")
    try:
        return base64.b64decode(encoded, validate=True)
    except Exception as error:
        raise ValueError("Format image base64 tidak valid.") from error


def _extract_watermark_fields(data):
    file_name = _safe_text(data.get("fileName") or data.get("outName"))
    tim = _safe_text(data.get("tim")).upper()
    jenis_pekerjaan = _safe_text(data.get("jenisPekerjaan") or data.get("pekerjaan")).lower()

    kode = ""
    for key in (
        "kodeSwitching", "kodePengukuranGardu", "kodeHarGrounding",
        "kodeHarPemerataan", "kodeHarPemerataanGardu", "kodeTemuan", "kodeP0",
        "kodePekerjaan", "kodeEksekusi", "kode",
    ):
        candidate = _safe_text(data.get(key))
        if candidate and candidate != "-":
            kode = candidate
            break

    if not kode and file_name:
        clean_fn = re.sub(r"^WM_", "", file_name, flags=re.I)
        clean_fn = re.sub(r"\.(jpe?g|png|webp)$", "", clean_fn, flags=re.I)
        first = clean_fn.split(".", 1)[0].strip()
        if len(first) > 4:
            kode = first

    ulp = _safe_text(data.get("ulp"))
    if ulp and not ulp.upper().startswith("ULP"):
        ulp = "ULP " + ulp
    tim_str = _safe_text(data.get("tim"))
    ulp_line = " · ".join(part for part in (ulp, tim_str) if part) or "ULP Toboali"

    jam = _safe_text(data.get("jam") or data.get("waktu"))
    hari = _safe_text(data.get("hari"))
    tanggal = _safe_text(data.get("tanggal"))

    lines = []
    penyulang = _safe_text(data.get("penyulang"))
    if penyulang and penyulang != "-":
        lines.append(("penyulang", f"Penyulang : {penyulang}"))

    petugas = _safe_text(data.get("petugas"))
    daerah = _safe_text(data.get("daerah") or data.get("daerahPekerjaan"))
    custom_detail = ""
    kode_lower = kode.lower()
    file_lower = file_name.lower()

    if "swc" in kode_lower or "switching" in jenis_pekerjaan or "switching" in file_lower:
        name = _safe_text(data.get("namaSwitching") or data.get("switching"))
        custom_detail = f"Pengecekan Switching : {name}" if name else "Pengecekan Switching"
    elif "ukur" in jenis_pekerjaan or "pengukuran" in jenis_pekerjaan:
        gardu = _safe_text(data.get("noGardu") or data.get("gardu"))
        jurusan = _safe_text(data.get("jurusan"))
        custom_detail = f"Gardu : {gardu}" + (f" ({jurusan})" if jurusan else "") if gardu else "Pengukuran Beban Gardu"
    elif "grounding" in jenis_pekerjaan:
        obj = _safe_text(data.get("objekGrounding") or data.get("gardu"))
        custom_detail = f"Har Grounding : {obj}" if obj else "Har Grounding"
    elif "pemerataan" in jenis_pekerjaan:
        gardu = _safe_text(data.get("noGardu") or data.get("gardu"))
        custom_detail = f"Pemerataan Gardu : {gardu}" if gardu else "Har Pemerataan Beban"
    elif "ijr" in kode_lower or "igd" in kode_lower or "inspeksi" in jenis_pekerjaan:
        obj = _safe_text(data.get("noGardu") or data.get("sectionTiang") or data.get("objek"))
        tier = _safe_text(data.get("tier") or data.get("temuan"))
        custom_detail = f"Temuan : {obj}" + (f" ({tier})" if tier else "") if obj else "Inspeksi Temuan"
    elif "yandal" in tim.lower() or "p0" in kode_lower:
        parts = []
        if petugas:
            parts.append(f"Petugas : {petugas}")
        if daerah:
            parts.append(f"Daerah : {daerah}")
        custom_detail = " | ".join(parts) or _safe_text(data.get("jenisPekerjaan") or data.get("pekerjaan"))
    else:
        custom_detail = _safe_text(data.get("jenisPekerjaan") or data.get("pekerjaan"))

    if custom_detail and custom_detail not in ("-", "None"):
        lines.append(("detail", custom_detail))

    lat = _safe_text(data.get("lat"))
    lng = _safe_text(data.get("long") or data.get("lng"))
    koordinat = _safe_text(data.get("koordinatPekerjaan") or data.get("koordinat"))
    if not koordinat and lat and lng:
        koordinat = f"{lat}, {lng}"
    if koordinat and koordinat != "-":
        lines.append(("coord", f"Koordinat : {koordinat}"))

    return {
        "kode": kode or "DOKUMENTASI PEKERJAAN",
        "ulp_line": ulp_line,
        "jam": jam or "--:--",
        "hari": hari or "",
        "tanggal": tanggal or "",
        "lines": lines[:3],
    }


def _render_watermark(data, raw=None):
    raw = raw or _decode_source(data)
    base = Image.open(io.BytesIO(raw)).convert("RGB")
    if max(base.size) > 2000:
        base.thumbnail((2000, 2000), Image.Resampling.LANCZOS)

    canvas = _enhance(base).convert("RGBA")
    width, height = canvas.size
    fields = _extract_watermark_fields(data)

    wm_w = max(180, int(round(width * 0.40)))
    wm_h = max(108, int(round(height * 0.30)))
    wm_w = min(wm_w, width)
    wm_h = min(wm_h, height)
    margin_x = max(8, int(round(width * 0.024)))
    margin_y = max(8, int(round(height * 0.028)))
    pad_x = max(8, int(round(wm_w * 0.05)))
    pad_y = max(7, int(round(wm_h * 0.055)))

    panel = _rounded((wm_w, wm_h), max(8, int(round(wm_h * 0.07))), PANEL_BG)
    draw = ImageDraw.Draw(panel)

    scale = min(wm_w / 480.0, wm_h / 270.0)
    f_kode = _font(max(8, 18 * scale))
    f_ulp = _font(max(7, 14 * scale))
    f_time = _font(max(15, 38 * scale))
    f_day = _font(max(8, 15 * scale))
    f_date = _font(max(7, 13 * scale))
    f_item = _font(max(7, 13 * scale))
    f_coord = _font(max(7, 12 * scale))

    logo_size = max(20, int(round(wm_h * 0.18)))
    logo_size = min(logo_size, int(round(wm_h * 0.22)))
    logo_path = _asset("logo_pln.png")
    if logo_path:
        try:
            logo = Image.open(logo_path).convert("RGBA")
            logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
            logo_x = pad_x + (logo_size - logo.width) // 2
            logo_y = pad_y + (logo_size - logo.height) // 2
            panel.alpha_composite(logo, (logo_x, logo_y))
        except Exception:
            draw.rounded_rectangle((pad_x, pad_y, pad_x + logo_size, pad_y + logo_size), radius=3, fill=PLN_YELLOW)
    else:
        draw.rounded_rectangle((pad_x, pad_y, pad_x + logo_size, pad_y + logo_size), radius=3, fill=PLN_YELLOW)

    header_x = pad_x + logo_size + max(6, int(round(wm_w * 0.025)))
    header_width = wm_w - header_x - pad_x
    kode_h = _text_height(draw, f_kode)
    ulp_h = _text_height(draw, f_ulp)
    draw.text((header_x, pad_y), _fit_text(draw, fields["kode"], f_kode, header_width), font=f_kode, fill=WHITE)
    draw.text((header_x, pad_y + kode_h + 1), _fit_text(draw, fields["ulp_line"], f_ulp, header_width), font=f_ulp, fill=MUTED)

    header_bottom = max(pad_y + logo_size, pad_y + kode_h + 1 + ulp_h)
    divider_y = header_bottom + max(4, int(round(wm_h * 0.03)))
    line_thickness = max(1, int(round(wm_h / 180.0)))
    line_gap = max(2, line_thickness + 1)
    draw.rectangle((pad_x, divider_y, wm_w - pad_x, divider_y + line_thickness - 1), fill=LIME_BRIGHT)
    draw.rectangle((pad_x, divider_y + line_gap, wm_w - pad_x, divider_y + line_gap + line_thickness - 1), fill=LIME_BRIGHT)

    time_y = divider_y + line_gap + line_thickness + max(5, int(round(wm_h * 0.035)))
    time_h = _text_height(draw, f_time)
    time_text = fields["jam"]
    draw.text((pad_x, time_y), time_text, font=f_time, fill=LIME_BRIGHT)
    time_w = int(draw.textlength(time_text, font=f_time))

    day_x = pad_x + time_w + max(9, int(round(wm_w * 0.035)))
    day_width = wm_w - day_x - pad_x
    day_h = _text_height(draw, f_day)
    date_h = _text_height(draw, f_date)
    date_gap = max(2, int(round(wm_h * 0.012)))
    day_block_h = day_h + date_gap + date_h if fields["hari"] and fields["tanggal"] else max(day_h, date_h)
    day_y = time_y + max(0, (time_h - day_block_h) // 2)
    if fields["hari"]:
        draw.text((day_x, day_y), _fit_text(draw, fields["hari"], f_day, day_width), font=f_day, fill=WHITE)
    if fields["tanggal"]:
        date_y = day_y + (day_h + date_gap if fields["hari"] else 0)
        draw.text((day_x, date_y), _fit_text(draw, fields["tanggal"], f_date, day_width), font=f_date, fill=MUTED)

    info_y = time_y + max(time_h, day_block_h) + max(5, int(round(wm_h * 0.035)))
    available_h = wm_h - pad_y - info_y
    line_count = len(fields["lines"])
    row_gap = max(11, available_h // max(1, line_count)) if line_count else 0
    row_gap = min(row_gap, max(12, int(round(wm_h * 0.115))))
    bullet_size = max(4, int(round(wm_h * 0.035)))
    text_x = pad_x + bullet_size + max(5, int(round(wm_w * 0.025)))
    max_info_w = wm_w - text_x - pad_x

    for index, (line_type, line_text) in enumerate(fields["lines"]):
        y = info_y + index * row_gap
        font = f_coord if line_type == "coord" else f_item
        color = MUTED if line_type == "coord" else WHITE
        text_h = _text_height(draw, font)
        bullet_y = y + max(0, (text_h - bullet_size) // 2)
        draw.rectangle((pad_x, bullet_y, pad_x + bullet_size - 1, bullet_y + bullet_size - 1), fill=LIME_BRIGHT)
        draw.text((text_x, y), _fit_text(draw, line_text, font, max_info_w), font=font, fill=color)

    panel_x = min(margin_x, max(0, width - wm_w))
    panel_y = max(0, height - wm_h - margin_y)
    canvas.alpha_composite(panel, (panel_x, panel_y))

    sisi_logo_path = _asset("logo_sisi.png")
    if sisi_logo_path:
        try:
            sisi = Image.open(sisi_logo_path).convert("RGBA")
            target_w = max(58, int(round(width * 0.088)))
            target_w = min(target_w, int(round(width * 0.16)))
            target_h = max(1, int(round(target_w * sisi.height / float(sisi.width))))
            sisi = sisi.resize((target_w, target_h), Image.Resampling.LANCZOS)
            badge_pad = max(5, int(round(target_w * 0.08)))
            badge = _rounded((target_w + 2 * badge_pad, target_h + 2 * badge_pad), max(6, badge_pad), (255, 255, 255, 245))
            badge.alpha_composite(sisi, (badge_pad, badge_pad))
            badge_x = max(0, width - badge.width - margin_x)
            badge_y = max(0, height - badge.height - margin_y)
            canvas.alpha_composite(badge, (badge_x, badge_y))
        except Exception:
            pass

    output = io.BytesIO()
    canvas.convert("RGB").save(output, format="JPEG", quality=88, optimize=True)
    output.seek(0)
    return output


def _credentials(scopes):
    if GOOGLE_SERVICE_ACCOUNT_JSON_B64:
        raw = base64.b64decode(GOOGLE_SERVICE_ACCOUNT_JSON_B64).decode("utf-8")
        return service_account.Credentials.from_service_account_info(json.loads(raw), scopes=scopes)
    credentials, _ = google.auth.default(scopes=scopes)
    return credentials


def _drive_service():
    return build("drive", "v3", credentials=_credentials(["https://www.googleapis.com/auth/drive"]), cache_discovery=False)


def _safe_name(value, fallback="watermark"):
    cleaned = re.sub(r'[\\/:*?"<>|\r\n]+', "-", _safe_text(value))
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .-")
    return cleaned[:120] or fallback


def _ensure_folder(service, parent_id, name):
    safe = _safe_name(name, "Tanpa Nama").replace("'", "\\'")
    query = "mimeType='application/vnd.google-apps.folder' and trashed=false " + f"and name='{safe}' and '{parent_id}' in parents"
    found = service.files().list(q=query, spaces="drive", fields="files(id,name)", includeItemsFromAllDrives=True, supportsAllDrives=True, corpora="allDrives").execute().get("files", [])
    if found:
        return found[0]["id"]
    return service.files().create(body={"name": _safe_name(name, "Tanpa Nama"), "mimeType": "application/vnd.google-apps.folder", "parents": [parent_id]}, fields="id", supportsAllDrives=True).execute()["id"]


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
    digest = hashlib.sha256()
    digest.update(DESIGN_VERSION.encode("utf-8"))
    if explicit:
        digest.update(explicit.encode("utf-8"))
        return digest.hexdigest()
    metadata_keys = [
        "kodePekerjaan", "kodeEksekusi", "kodeP0", "kodeSwitching",
        "kodePengukuranGardu", "kodeHarGrounding", "kodeHarPemerataan",
        "kodeHarPemerataanGardu", "kodeTemuan", "tanggal", "hari", "jam",
        "penyulang", "petugas", "daerah", "koordinat", "koordinatPekerjaan",
        "lat", "long", "lng", "tim", "ulp", "jenisPekerjaan", "pekerjaan",
    ]
    digest.update(raw)
    digest.update(json.dumps({key: data.get(key, "") for key in metadata_keys}, sort_keys=True).encode("utf-8"))
    return digest.hexdigest()


def _find_existing(service, parent_id, wm_key):
    query = f"'{parent_id}' in parents and trashed=false and appProperties has {{ key='wmKey' and value='{wm_key}' }}"
    files = service.files().list(q=query, spaces="drive", fields="files(id,name,webViewLink,webContentLink)", includeItemsFromAllDrives=True, supportsAllDrives=True, corpora="allDrives", pageSize=1).execute().get("files", [])
    return files[0] if files else None


def _make_public(service, file_id):
    try:
        service.permissions().create(fileId=file_id, body={"type": "anyone", "role": "reader"}, supportsAllDrives=True).execute()
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
        "design": DESIGN_VERSION,
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
        created = service.files().create(
            body={"name": name, "parents": [folder_id], "appProperties": {"wmKey": wm_key, "source": "sisi-wm", "design": DESIGN_VERSION}},
            media_body=MediaIoBaseUpload(output, mimetype="image/jpeg", resumable=False),
            fields="id,name,webViewLink,webContentLink",
            supportsAllDrives=True,
        ).execute()
        public_requested = data.get("makePublic", PUBLIC_LINKS_DEFAULT) is True
        public_ok = _make_public(service, created["id"]) if public_requested else False

        old_file_id = _safe_text(data.get("oldFileId"))
        if old_file_id and old_file_id != created["id"]:
            try:
                service.files().delete(fileId=old_file_id, supportsAllDrives=True).execute()
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
    return jsonify({
        "ok": True,
        "service": "sisi-wm-engine",
        "design": DESIGN_VERSION,
        "dimensions": "40%x30%",
        "directDrive": True,
        "driveRootConfigured": bool(DRIVE_ROOT_FOLDER_ID),
        "secretConfigured": bool(SECRET),
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
