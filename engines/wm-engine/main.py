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
GOOGLE_SERVICE_ACCOUNT_JSON_B64 = os.environ.get(
    "GOOGLE_SERVICE_ACCOUNT_JSON_B64", ""
)
PUBLIC_LINKS_DEFAULT = os.environ.get("WM_PUBLIC_LINKS", "false").lower() in (
    "1",
    "true",
    "yes",
)
BASE_DIR = os.path.dirname(__file__)

# Palette
PANEL_BG = (15, 22, 32, 224)
LIME_BRIGHT = (163, 230, 53, 255)
PLN_YELLOW = (250, 204, 21, 255)
PLN_RED = (239, 68, 68, 255)
PLN_BLUE = (2, 132, 199, 255)
WHITE = (255, 255, 255, 255)
MUTED = (203, 213, 225, 255)
DARK_BG = (15, 23, 42, 255)


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
    image = ImageEnhance.Brightness(image).enhance(1.06)
    return ImageEnhance.Sharpness(image).enhance(1.25)


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
    """Mengekstrak dan menyesuaikan bidang kode dinamis per jenis pekerjaan."""
    tim = _safe_text(data.get("tim")).upper()
    jenis_pekerjaan = _safe_text(data.get("jenisPekerjaan") or data.get("pekerjaan")).lower()

    # 1. Kode Dinamis
    kode = ""
    if data.get("kodeP0"):
        kode = _safe_text(data.get("kodeP0"))
    elif data.get("kodeSwitching") or "switching" in jenis_pekerjaan:
        kode = _safe_text(data.get("kodeSwitching") or data.get("kodePekerjaan"))
    elif data.get("kodePengukuranGardu") or "pengukuran gardu" in jenis_pekerjaan or "ukur gardu" in jenis_pekerjaan:
        kode = _safe_text(data.get("kodePengukuranGardu") or data.get("kodePekerjaan"))
    elif data.get("kodeHarGrounding") or "grounding" in jenis_pekerjaan:
        kode = _safe_text(data.get("kodeHarGrounding") or data.get("kodePekerjaan"))
    elif data.get("kodeHarPemerataan") or data.get("kodeHarPemerataanGardu") or "pemerataan" in jenis_pekerjaan:
        kode = _safe_text(data.get("kodeHarPemerataan") or data.get("kodeHarPemerataanGardu") or data.get("kodePekerjaan"))
    elif data.get("kodeTemuan") or "inspeksi" in tim.lower() or "inspeksi" in jenis_pekerjaan:
        kode = _safe_text(data.get("kodeTemuan") or data.get("kodePekerjaan"))
    else:
        kode = _safe_text(
            data.get("kodePekerjaan")
            or data.get("kodeEksekusi")
            or data.get("kodeP0")
            or data.get("kode")
        )

    # 2. ULP & Tim
    ulp = _safe_text(data.get("ulp"))
    if ulp and not ulp.upper().startswith("ULP"):
        ulp = "ULP " + ulp
    tim_str = _safe_text(data.get("tim"))
    ulp_line = " · ".join(p for p in (ulp, tim_str) if p) or "ULP Toboali"

    # 3. Waktu, Hari & Tanggal
    jam = _safe_text(data.get("jam") or data.get("waktu"))
    hari = _safe_text(data.get("hari"))
    tanggal = _safe_text(data.get("tanggal"))
    
    # 4. Penyulang (Wajib untuk semua tim)
    penyulang = _safe_text(data.get("penyulang"))

    # 5. Detail spesifik pekerjaan (Petugas / Daerah / Deskripsi)
    petugas = _safe_text(data.get("petugas"))
    daerah = _safe_text(data.get("daerah") or data.get("daerahPekerjaan"))
    
    custom_detail = ""
    if "yandal" in tim.lower() or data.get("kodeP0"):
        detail_parts = []
        if petugas:
            detail_parts.append(f"Petugas : {petugas}")
        if daerah:
            detail_parts.append(f"Dsk : {daerah}")
        custom_detail = " | ".join(detail_parts) if detail_parts else _safe_text(data.get("jenisPekerjaan"))
    elif "switching" in jenis_pekerjaan:
        sw_name = _safe_text(data.get("namaSwitching") or data.get("switching"))
        custom_detail = f"Switching : {sw_name}" if sw_name else "Pengecekan Switching"
    elif "pengukuran gardu" in jenis_pekerjaan:
        gdu = _safe_text(data.get("noGardu") or data.get("gardu"))
        jur = _safe_text(data.get("jurusan"))
        custom_detail = f"Gardu : {gdu} ({jur})" if gdu else "Pengukuran Beban Gardu"
    elif "grounding" in jenis_pekerjaan:
        obj = _safe_text(data.get("objekGrounding") or data.get("gardu"))
        custom_detail = f"Grounding : {obj}" if obj else "Har Grounding"
    elif "pemerataan" in jenis_pekerjaan:
        gdu = _safe_text(data.get("noGardu") or data.get("gardu"))
        custom_detail = f"Pemerataan Gardu : {gdu}" if gdu else "Har Pemerataan Beban"
    elif "inspeksi" in tim.lower() or "inspeksi" in jenis_pekerjaan:
        obj = _safe_text(data.get("noGardu") or data.get("sectionTiang") or data.get("objek"))
        tier = _safe_text(data.get("tier") or data.get("temuan"))
        custom_detail = f"Temuan : {obj} ({tier})" if obj else _safe_text(data.get("jenisPekerjaan"))
    else:
        custom_detail = _safe_text(data.get("jenisPekerjaan") or data.get("pekerjaan"))

    # 6. Koordinat
    lat = _safe_text(data.get("lat"))
    lng = _safe_text(data.get("long"))
    koordinat = _safe_text(data.get("koordinatPekerjaan") or data.get("koordinat"))
    if not koordinat and lat and lng:
        koordinat = f"{lat}, {lng}"

    return {
        "kode": kode or "-",
        "ulp_line": ulp_line,
        "jam": jam or "09:00",
        "hari": hari or "Senin",
        "tanggal": tanggal or "-",
        "penyulang": penyulang or "-",
        "custom_detail": custom_detail or "-",
        "koordinat": koordinat or "-",
    }


def _render_watermark(data, raw=None):
    """Render SiSi Watermark (40% Lebar x 30% Tinggi) menggunakan asset logo PLN dan logo SiSi resmi."""
    raw = raw or _decode_source(data)
    base = Image.open(io.BytesIO(raw)).convert("RGB")

    max_side = 2000
    if max(base.size) > max_side:
        base.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

    canvas = _enhance(base).convert("RGBA")
    width, height = canvas.size

    fields = _extract_watermark_fields(data)

    # Proporsi Watermark Box: 40% Lebar dan 30% Tinggi
    wm_w = int(width * 0.40)
    wm_h = int(height * 0.30)
    margin_x = max(12, int(width * 0.022))
    margin_y = max(12, int(height * 0.028))

    pad_x = max(12, int(wm_w * 0.05))
    pad_y = max(12, int(wm_h * 0.06))

    panel = _rounded((wm_w, wm_h), max(10, int(14 * (width / 1024.0))), PANEL_BG)
    draw = ImageDraw.Draw(panel)
    probe = ImageDraw.Draw(canvas)

    # Skala font berdasarkan tinggi panel
    scale_factor = wm_h / 240.0
    f_kode = _font(15 * scale_factor)
    f_ulp = _font(11 * scale_factor)
    f_time = _font(28 * scale_factor)
    f_day = _font(11 * scale_factor)
    f_date = _font(10 * scale_factor)
    f_item = _font(10.5 * scale_factor)
    f_coord = _font(9.5 * scale_factor)

    # 1. Header (Logo PLN Resmi yang Disediakan + Kode + ULP)
    logo_size = int(36 * scale_factor)
    pln_logo_path = _asset("logo_pln.png")
    if pln_logo_path:
        try:
            pln_img = Image.open(pln_logo_path).convert("RGBA")
            pln_img = pln_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            panel.alpha_composite(pln_img, (pad_x, pad_y))
        except Exception:
            draw.rounded_rectangle([pad_x, pad_y, pad_x + logo_size, pad_y + logo_size], radius=max(4, int(5 * scale_factor)), fill=PLN_YELLOW)
    else:
        draw.rounded_rectangle([pad_x, pad_y, pad_x + logo_size, pad_y + logo_size], radius=max(4, int(5 * scale_factor)), fill=PLN_YELLOW)

    header_text_x = pad_x + logo_size + int(10 * scale_factor)
    max_h_w = wm_w - header_text_x - pad_x
    draw.text(
        (header_text_x, pad_y),
        _fit_text(probe, fields["kode"], f_kode, max_h_w),
        font=f_kode,
        fill=WHITE,
    )
    draw.text(
        (header_text_x, pad_y + int(18 * scale_factor)),
        _fit_text(probe, fields["ulp_line"], f_ulp, max_h_w),
        font=f_ulp,
        fill=MUTED,
    )

    # 2. Dua Garis Hijau Neon
    line1_y = pad_y + logo_size + int(8 * scale_factor)
    line2_y = line1_y + int(4 * scale_factor)
    line_w = max(2, int(2.5 * scale_factor))
    draw.rectangle([pad_x, line1_y, wm_w - pad_x, line1_y + line_w], fill=LIME_BRIGHT)
    draw.rectangle([pad_x, line2_y, wm_w - pad_x, line2_y + line_w], fill=LIME_BRIGHT)

    # 3. Waktu, Hari & Tanggal (Sejajar 1 Baris)
    time_y = line2_y + int(10 * scale_factor)
    time_str = fields["jam"]
    draw.text((pad_x, time_y), time_str, font=f_time, fill=LIME_BRIGHT)
    
    time_w = draw.textlength(time_str, font=f_time)
    daydate_x = pad_x + int(time_w) + int(10 * scale_factor)
    draw.text((daydate_x, time_y + int(2 * scale_factor)), fields["hari"], font=f_day, fill=WHITE)
    draw.text((daydate_x, time_y + int(14 * scale_factor)), fields["tanggal"], font=f_date, fill=MUTED)

    # 4, 5, 6. Info Spesifik (Penyulang, Detail Khusus, Koordinat)
    info_start_y = time_y + int(32 * scale_factor)
    row_gap = int(17 * scale_factor)
    max_info_w = wm_w - pad_x * 2 - int(12 * scale_factor)

    # Bullet & Penyulang
    bullet_size = max(3, int(4.5 * scale_factor))
    curr_y = info_start_y
    draw.rectangle([pad_x, curr_y + int(3 * scale_factor), pad_x + bullet_size, curr_y + int(3 * scale_factor) + bullet_size], fill=LIME_BRIGHT)
    penyulang_text = f"Penyulang : {fields['penyulang']}"
    draw.text((pad_x + bullet_size + int(6 * scale_factor), curr_y), _fit_text(probe, penyulang_text, f_item, max_info_w), font=f_item, fill=WHITE)

    # Bullet & Detail Khusus
    curr_y += row_gap
    draw.rectangle([pad_x, curr_y + int(3 * scale_factor), pad_x + bullet_size, curr_y + int(3 * scale_factor) + bullet_size], fill=LIME_BRIGHT)
    draw.text((pad_x + bullet_size + int(6 * scale_factor), curr_y), _fit_text(probe, fields["custom_detail"], f_item, max_info_w), font=f_item, fill=WHITE)

    # Bullet & Koordinat
    curr_y += row_gap
    draw.rectangle([pad_x, curr_y + int(3 * scale_factor), pad_x + bullet_size, curr_y + int(3 * scale_factor) + bullet_size], fill=LIME_BRIGHT)
    coord_text = f"Koordinat : {fields['koordinat']}"
    draw.text((pad_x + bullet_size + int(6 * scale_factor), curr_y), _fit_text(probe, coord_text, f_coord, max_info_w), font=f_coord, fill=MUTED)

    # Tempel Panel WM ke Kiri Bawah
    canvas.alpha_composite(panel, (margin_x, height - wm_h - margin_y))

    # =========================================================
    # Logo SiSi Resmi yang Disediakan di Kanan Bawah
    # =========================================================
    sisi_logo_path = _asset("logo_sisi.png")
    if sisi_logo_path:
        try:
            sisi_img = Image.open(sisi_logo_path).convert("RGBA")
            sisi_target_w = max(70, int(width * 0.085))
            aspect = sisi_img.height / float(sisi_img.width)
            sisi_target_h = int(sisi_target_w * aspect)
            sisi_img = sisi_img.resize((sisi_target_w, sisi_target_h), Image.Resampling.LANCZOS)
            
            # Buat container background putih rounded bersih
            pad_badge = max(4, int(6 * scale_factor))
            badge_w = sisi_target_w + pad_badge * 2
            badge_h = sisi_target_h + pad_badge * 2
            sisi_badge = _rounded((badge_w, badge_h), max(6, int(8 * scale_factor)), (255, 255, 255, 245))
            sisi_badge.alpha_composite(sisi_img, (pad_badge, pad_badge))
            
            canvas.alpha_composite(sisi_badge, (width - badge_w - margin_x, height - badge_h - margin_y))
        except Exception:
            pass

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
        "kodeSwitching",
        "kodePengukuranGardu",
        "kodeHarGrounding",
        "kodeHarPemerataan",
        "kodeTemuan",
        "tanggal",
        "hari",
        "jam",
        "penyulang",
        "petugas",
        "daerah",
        "koordinat",
        "koordinatPekerjaan",
        "tim",
        "ulp",
        "jenisPekerjaan",
        "pekerjaan",
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
        "design": "dynamic-team-v1",
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
                        "design": "dynamic-team-v1",
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
            "design": "dynamic-team-v1",
            "dimensions": "40%x30%",
            "directDrive": True,
            "driveRootConfigured": bool(DRIVE_ROOT_FOLDER_ID),
            "secretConfigured": bool(SECRET),
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
