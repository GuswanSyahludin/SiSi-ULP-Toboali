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
PANEL_BG = (15, 22, 32, 225)
LIME_BRIGHT = (163, 230, 53, 255)
PLN_YELLOW = (250, 204, 21, 255)
PLN_RED = (239, 68, 68, 255)
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
    """Mengekstrak bidang data dinamis dengan fallback parsing cerdas dari filename/deskripsi."""
    file_name = _safe_text(data.get("fileName") or data.get("outName"))
    tim = _safe_text(data.get("tim")).upper()
    jenis_pekerjaan = _safe_text(data.get("jenisPekerjaan") or data.get("pekerjaan")).lower()

    # 1. Parsing Kode Utama
    kode = ""
    # Coba dari payload eksplisit dulu
    if data.get("kodeSwitching"):
        kode = _safe_text(data.get("kodeSwitching"))
    elif data.get("kodePengukuranGardu"):
        kode = _safe_text(data.get("kodePengukuranGardu"))
    elif data.get("kodeHarGrounding"):
        kode = _safe_text(data.get("kodeHarGrounding"))
    elif data.get("kodeHarPemerataan") or data.get("kodeHarPemerataanGardu"):
        kode = _safe_text(data.get("kodeHarPemerataan") or data.get("kodeHarPemerataanGardu"))
    elif data.get("kodeTemuan"):
        kode = _safe_text(data.get("kodeTemuan"))
    elif data.get("kodeP0"):
        kode = _safe_text(data.get("kodeP0"))
    else:
        raw_code = _safe_text(data.get("kodePekerjaan") or data.get("kodeEksekusi") or data.get("kode"))
        if raw_code and raw_code != "-":
            kode = raw_code

    # Fallback jika kode masih kosong: ekstrak dari fileName (contoh: WM_Y17-16130260902002-SHF2.001-P0.003-SWC.001.Foto Arus...)
    if not kode and file_name:
        clean_fn = file_name.replace("WM_", "").replace(".jpg", "").replace(".png", "")
        parts = clean_fn.split(".")
        if len(parts) > 0 and len(parts[0]) > 4:
            kode = parts[0]

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
    
    # 4. Penyulang
    penyulang = _safe_text(data.get("penyulang"))
    if not penyulang or penyulang == "-":
        # Jangan tampilkan strip kosong jika data penyulang belum dikirim
        penyulang_line = None
    else:
        penyulang_line = f"Penyulang : {penyulang}"

    # 5. Detail Spesifik Tim / Pekerjaan
    petugas = _safe_text(data.get("petugas"))
    daerah = _safe_text(data.get("daerah") or data.get("daerahPekerjaan"))
    custom_detail = ""

    if "swc" in kode.lower() or "switching" in jenis_pekerjaan or "switching" in file_name.lower():
        sw_name = _safe_text(data.get("namaSwitching") or data.get("switching"))
        custom_detail = f"Pengecekan Switching : {sw_name}" if sw_name else "Pengecekan Switching"
    elif "ukur" in jenis_pekerjaan or "pengukuran" in jenis_pekerjaan:
        gdu = _safe_text(data.get("noGardu") or data.get("gardu"))
        jur = _safe_text(data.get("jurusan"))
        custom_detail = f"Gardu : {gdu} ({jur})" if gdu else "Pengukuran Beban Gardu"
    elif "grounding" in jenis_pekerjaan:
        obj = _safe_text(data.get("objekGrounding") or data.get("gardu"))
        custom_detail = f"Har Grounding : {obj}" if obj else "Har Grounding"
    elif "pemerataan" in jenis_pekerjaan:
        gdu = _safe_text(data.get("noGardu") or data.get("gardu"))
        custom_detail = f"Pemerataan Gardu : {gdu}" if gdu else "Har Pemerataan Beban"
    elif "ijr" in kode.lower() or "igd" in kode.lower() or "inspeksi" in jenis_pekerjaan:
        obj = _safe_text(data.get("noGardu") or data.get("sectionTiang") or data.get("objek"))
        tier = _safe_text(data.get("tier") or data.get("temuan"))
        custom_detail = f"Temuan : {obj} ({tier})" if obj else "Inspeksi Temuan"
    elif "yandal" in tim.lower() or "p0" in kode.lower():
        detail_parts = []
        if petugas:
            detail_parts.append(f"Petugas : {petugas}")
        if daerah:
            detail_parts.append(f"Dsk : {daerah}")
        custom_detail = " | ".join(detail_parts) if detail_parts else _safe_text(data.get("jenisPekerjaan") or data.get("pekerjaan"))
    else:
        custom_detail = _safe_text(data.get("jenisPekerjaan") or data.get("pekerjaan"))

    # Bersihkan detail jika hanya strip
    if custom_detail in ("-", "None", ""):
        custom_detail = None

    # 6. Koordinat
    lat = _safe_text(data.get("lat"))
    lng = _safe_text(data.get("long"))
    koordinat = _safe_text(data.get("koordinatPekerjaan") or data.get("koordinat"))
    if not koordinat and lat and lng:
        koordinat = f"{lat}, {lng}"

    # Susun list baris konten dinamis (hanya tampilkan yang ada datanya agar tidak ada strip kosong)
    content_lines = []
    if penyulang_line:
        content_lines.append(("penyulang", penyulang_line))
    if custom_detail:
        content_lines.append(("detail", custom_detail))
    if koordinat and koordinat != "-":
        content_lines.append(("coord", f"Koordinat : {koordinat}"))

    return {
        "kode": kode or "DOKUMENTASI PEKERJAAN",
        "ulp_line": ulp_line,
        "jam": jam or "09:00",
        "hari": hari or "Senin",
        "tanggal": tanggal or "-",
        "lines": content_lines,
    }


def _render_watermark(data, raw=None):
    """Render SiSi Watermark (40% Lebar x 30% Tinggi) dengan layout presisi, spasi proporsional & anti-tumpang-tindih."""
    raw = raw or _decode_source(data)
    base = Image.open(io.BytesIO(raw)).convert("RGB")

    max_side = 2000
    if max(base.size) > max_side:
        base.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

    canvas = _enhance(base).convert("RGBA")
    width, height = canvas.size

    fields = _extract_watermark_fields(data)

    # Dimensi Panel Watermark: 40% Lebar x 30% Tinggi
    wm_w = int(width * 0.40)
    wm_h = int(height * 0.30)
    margin_x = max(14, int(width * 0.024))
    margin_y = max(14, int(height * 0.028))

    pad_x = max(14, int(wm_w * 0.055))
    pad_y = max(14, int(wm_h * 0.065))

    panel = _rounded((wm_w, wm_h), max(10, int(14 * (width / 1024.0))), PANEL_BG)
    draw = ImageDraw.Draw(panel)
    probe = ImageDraw.Draw(canvas)

    # Skala ukuran font proporsional
    sf = wm_h / 360.0
    f_kode = _font(19 * sf)
    f_ulp = _font(13 * sf)
    f_time = _font(38 * sf)
    f_day = _font(14 * sf)
    f_date = _font(13 * sf)
    f_item = _font(13 * sf)
    f_coord = _font(12 * sf)

    # 1. Header (Logo PLN + Kode Pekerjaan + ULP)
    logo_size = int(44 * sf)
    pln_logo_path = _asset("logo_pln.png")
    if pln_logo_path:
        try:
            pln_img = Image.open(pln_logo_path).convert("RGBA")
            pln_img = pln_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            panel.alpha_composite(pln_img, (pad_x, pad_y))
        except Exception:
            draw.rounded_rectangle([pad_x, pad_y, pad_x + logo_size, pad_y + logo_size], radius=max(4, int(6 * sf)), fill=PLN_YELLOW)
    else:
        draw.rounded_rectangle([pad_x, pad_y, pad_x + logo_size, pad_y + logo_size], radius=max(4, int(6 * sf)), fill=PLN_YELLOW)

    header_text_x = pad_x + logo_size + int(12 * sf)
    max_h_w = wm_w - header_text_x - pad_x
    draw.text(
        (header_text_x, pad_y + int(2 * sf)),
        _fit_text(probe, fields["kode"], f_kode, max_h_w),
        font=f_kode,
        fill=WHITE,
    )
    draw.text(
        (header_text_x, pad_y + int(24 * sf)),
        _fit_text(probe, fields["ulp_line"], f_ulp, max_h_w),
        font=f_ulp,
        fill=MUTED,
    )

    # 2. Dua Garis Hijau Neon (Diberi margin yang cukup agar tidak bertumpuk)
    line1_y = pad_y + logo_size + int(12 * sf)
    line2_y = line1_y + int(5 * sf)
    line_w = max(2, int(2.5 * sf))
    draw.rectangle([pad_x, line1_y, wm_w - pad_x, line1_y + line_w], fill=LIME_BRIGHT)
    draw.rectangle([pad_x, line2_y, wm_w - pad_x, line2_y + line_w], fill=LIME_BRIGHT)

    # 3. Waktu, Hari & Tanggal (Sejajar 1 Baris dengan padding lega)
    time_y = line2_y + int(14 * sf)
    time_str = fields["jam"]
    draw.text((pad_x, time_y), time_str, font=f_time, fill=LIME_BRIGHT)
    
    time_w = draw.textlength(time_str, font=f_time)
    daydate_x = pad_x + int(time_w) + int(14 * sf)
    
    # Penempatan Hari & Tanggal yang teratur vertikal di samping jam
    draw.text((daydate_x, time_y + int(3 * sf)), fields["hari"], font=f_day, fill=WHITE)
    draw.text((daydate_x, time_y + int(20 * sf)), fields["tanggal"], font=f_date, fill=MUTED)

    # 4. Baris-baris Detail Informasi (Spasi renggang & teratur)
    info_start_y = time_y + int(48 * sf)
    row_gap = int(24 * sf)
    bullet_size = max(4, int(5.5 * sf))
    max_info_w = wm_w - pad_x * 2 - int(16 * sf)

    curr_y = info_start_y
    for line_type, line_text in fields["lines"]:
        font_to_use = f_coord if line_type == "coord" else f_item
        text_color = MUTED if line_type == "coord" else WHITE
        
        # Bullet neon
        draw.rectangle(
            [pad_x, curr_y + int(4 * sf), pad_x + bullet_size, curr_y + int(4 * sf) + bullet_size],
            fill=LIME_BRIGHT
        )
        # Teks
        draw.text(
            (pad_x + bullet_size + int(8 * sf), curr_y),
            _fit_text(probe, line_text, font_to_use, max_info_w),
            font=font_to_use,
            fill=text_color,
        )
        curr_y += row_gap

    # Tempel Panel WM ke Kiri Bawah
    canvas.alpha_composite(panel, (margin_x, height - wm_h - margin_y))

    # =========================================================
    # Logo SiSi di Kanan Bawah
    # =========================================================
    sisi_logo_path = _asset("logo_sisi.png")
    if sisi_logo_path:
        try:
            sisi_img = Image.open(sisi_logo_path).convert("RGBA")
            sisi_target_w = max(72, int(width * 0.088))
            aspect = sisi_img.height / float(sisi_img.width)
            sisi_target_h = int(sisi_target_w * aspect)
            sisi_img = sisi_img.resize((sisi_target_w, sisi_target_h), Image.Resampling.LANCZOS)
            
            pad_badge = max(5, int(7 * sf))
            badge_w = sisi_target_w + pad_badge * 2
            badge_h = sisi_target_h + pad_badge * 2
            sisi_badge = _rounded((badge_w, badge_h), max(6, int(10 * sf)), (255, 255, 255, 245))
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
        "design": "dynamic-team-v2-clean",
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
                        "design": "dynamic-team-v2-clean",
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
            "design": "dynamic-team-v2-clean",
            "dimensions": "40%x30%",
            "directDrive": True,
            "driveRootConfigured": bool(DRIVE_ROOT_FOLDER_ID),
            "secretConfigured": bool(SECRET),
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
