import os
import hmac
import re
import io
import json
import base64
import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import unquote

import google.auth
import requests
from flask import Flask, request, send_file, abort, jsonify
from google.oauth2 import service_account
from googleapiclient.discovery import build
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape, portrait
from reportlab.lib.units import mm
from reportlab.lib.colors import black, HexColor
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.utils import ImageReader


app = Flask(__name__)

# =========================================================
# CONFIG
# =========================================================

PDF_SECRET = os.environ.get("PDF_SECRET", "")
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID", "")
SHEET_ROW_EKSEKUSI = os.environ.get(
    "SHEET_ROW_EKSEKUSI", "db_ROW_Eksekusi"
)
SHEET_ROW_REALISASI = os.environ.get(
    "SHEET_ROW_REALISASI", "db_ROW_Realisasi"
)
GOOGLE_SERVICE_ACCOUNT_JSON_B64 = os.environ.get(
    "GOOGLE_SERVICE_ACCOUNT_JSON_B64", ""
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSET_DIR = os.path.join(BASE_DIR, "assets")
LOGO_PLN_PATH = os.path.join(ASSET_DIR, "logo_pln.png")

TZ = datetime.timezone(datetime.timedelta(hours=7))
MAX_DAYS_LAMPIRAN = 7
MAX_ROWS_LAMPIRAN = 500
PHOTO_WORKERS = int(os.environ.get("PHOTO_WORKERS", "24"))
PHOTO_CONNECT_TIMEOUT = 3
PHOTO_READ_TIMEOUT = 8

FONT_REG = "Times-Roman"
FONT_BOLD = "Times-Bold"
YELLOW = HexColor("#FFC000")
GRAY_TOTAL = HexColor("#D9D9D9")

# Lampiran: A4 landscape.
LAMP_PAGE_W, LAMP_PAGE_H = landscape(A4)
LAMP_MARGIN_X = 5 * mm
LAMP_MARGIN_Y = 5 * mm

# Rekap: A4 portrait.
REKAP_PAGE_W, REKAP_PAGE_H = portrait(A4)
REKAP_MARGIN_X = 10 * mm
REKAP_MARGIN_Y = 19 * mm

# =========================================================
# COLUMN MAPPING (INDEX 0-BASED)
# =========================================================

# db_ROW_Eksekusi, range A:AD.
COL_EKS = {
    "kodeEksekusi": 3,
    "ulp": 4,
    "tanggal": 6,
    "tim": 7,
    "penyulang": 8,
    "section": 9,
    "koordinat": 14,
    "diameter": 23,
    "jenisPekerjaan": 24,
    # URL foto yang dipakai oleh db_ROW_Eksekusi.
    # S/U/W adalah URL; R/T/V hanya nama/path foto.
    "fotoSebelumUrl": 18,      # S
    "fotoPekerjaanUrl": 20,    # U
    "fotoSesudahUrl": 22,      # W
}
SHEET_RANGE_EKS = f"{SHEET_ROW_EKSEKUSI}!A:AD"

# db_ROW_Realisasi, range A:M.
COL_RLZ = {
    "no": 0,
    "kodeHeader": 1,
    "kodePekerjaan": 2,
    "hari": 3,
    "tanggal": 4,
    "tim": 5,
    "penyulang": 6,
    "section": 7,
    "rabas": 8,
    "sedang": 9,
    "besar": 10,
    "inputOleh": 11,
    "timestamp": 12,
}
SHEET_RANGE_RLZ = f"{SHEET_ROW_REALISASI}!A:M"

# =========================================================
# BASIC HELPERS
# =========================================================


def _safe_str(value):
    if value is None:
        return ""
    return str(value).strip()


def _get_cell(row, index):
    return row[index] if index < len(row) else ""


def _today_id():
    return datetime.datetime.now(TZ).strftime("%d/%m/%Y %H:%M")


def _parse_date(value):
    text = _safe_str(value)
    if not text:
        return None

    match = re.match(r"^(\d{4})-(\d{2})-(\d{2})", text)
    if match:
        try:
            return datetime.date(
                int(match.group(1)), int(match.group(2)), int(match.group(3))
            )
        except ValueError:
            return None

    match = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if match:
        try:
            return datetime.date(
                int(match.group(3)), int(match.group(2)), int(match.group(1))
            )
        except ValueError:
            return None

    return None


def _normalize_date(value):
    # Google Sheets API dengan SERIAL_NUMBER mengirim tanggal sebagai serial
    # (hari sejak 1899-12-30). Ini menghindari salah baca 01/07 sebagai 7 Januari.
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if 20000 <= value <= 100000:
            base = datetime.datetime(1899, 12, 30)
            return (base + datetime.timedelta(days=float(value))).date().isoformat()

    text = _safe_str(value)
    parsed = _parse_date(text)
    if parsed:
        return parsed.isoformat()

    match = re.search(r"(\d{4}-\d{2}-\d{2})", text)
    if match:
        return match.group(1)

    match = re.search(r"(\d{1,2}/\d{1,2}/\d{4})", text)
    if match:
        parsed = _parse_date(match.group(1))
        return parsed.isoformat() if parsed else ""

    return ""


def _tanggal_id(value):
    parsed = _parse_date(value)
    return parsed.strftime("%d/%m/%Y") if parsed else _safe_str(value)


def _periode_id(tgl_dari, tgl_sampai):
    bulan = [
        "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
        "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
    ]

    def format_date(value):
        parsed = _parse_date(value)
        if not parsed:
            return _safe_str(value)
        return f"{parsed.day:02d} {bulan[parsed.month - 1]} {parsed.year}"

    return f"{format_date(tgl_dari)} - {format_date(tgl_sampai)}"


def _days_inclusive(date_from, date_to):
    return (date_to - date_from).days + 1


def _to_number(value):
    text = _safe_str(value).replace(" ", "")
    if not text:
        return 0

    try:
        if "," in text and "." in text:
            text = text.replace(".", "").replace(",", ".")
        elif "," in text:
            text = text.replace(",", ".")
        number = float(text)
        return int(number) if number.is_integer() else number
    except (TypeError, ValueError):
        return 0


def _require_secret(req):
    token = req.args.get("token") or req.args.get("secret") or ""
    if not token and req.is_json:
        token = (req.get_json(silent=True) or {}).get("secret", "")
    if not PDF_SECRET or not hmac.compare_digest(str(token), PDF_SECRET):
        abort(403)


def _request_filter():
    return {
        "tglDari": _safe_str(request.args.get("tglDari")),
        "tglSampai": _safe_str(request.args.get("tglSampai")),
        "ulp": _safe_str(request.args.get("ulp")),
        "tim": _safe_str(request.args.get("tim")),
        "penyulang": _safe_str(request.args.get("penyulang")),
    }


def _validate_period(filter_):
    date_from = _parse_date(filter_["tglDari"])
    date_to = _parse_date(filter_["tglSampai"])

    if not date_from or not date_to:
        return None, None, (
            jsonify({
                "ok": False,
                "message": "Parameter tglDari dan tglSampai wajib berformat yyyy-mm-dd.",
            }),
            400,
        )

    if date_to < date_from:
        return None, None, (
            jsonify({
                "ok": False,
                "message": "tglSampai tidak boleh lebih kecil dari tglDari.",
            }),
            400,
        )

    return date_from, date_to, None


def _make_meta(filter_):
    return {
        "up3": "BANGKA",
        "ulp": filter_.get("ulp") or "TOBOALI",
        "periode": _periode_id(filter_["tglDari"], filter_["tglSampai"]),
        "tglDari": filter_["tglDari"],
        "tglSampai": filter_["tglSampai"],
        "tim": filter_.get("tim", ""),
        "penyulang": filter_.get("penyulang", ""),
        "dibuat": _today_id(),
        # Nama pejabat penanda tangan dikirim dari frontend (card "Nama Pejabat"
        # yang disimpan via simpanPejabatRekapROW). Bila parameter kosong, pakai
        # nama default lama agar blok tanda tangan PDF tetap terisi.
        "manager": _safe_str(request.args.get("manager")) or "MARSHEL P.L TOBING",
        "teamLeader": _safe_str(request.args.get("teamLeader")) or "ANDRYE FAHREZA",
        "koordinator": _safe_str(request.args.get("koordinator")) or "APRIANTO",
    }

# =========================================================
# GOOGLE SHEETS
# =========================================================


def _sheets_service():
    scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

    if GOOGLE_SERVICE_ACCOUNT_JSON_B64:
        raw = base64.b64decode(GOOGLE_SERVICE_ACCOUNT_JSON_B64).decode("utf-8")
        info = json.loads(raw)
        credentials = service_account.Credentials.from_service_account_info(
            info, scopes=scopes
        )
    else:
        credentials, _ = google.auth.default(scopes=scopes)

    return build(
        "sheets", "v4", credentials=credentials, cache_discovery=False
    )


def _read_sheet_rows(sheet_range):
    if not SPREADSHEET_ID:
        raise RuntimeError(
            "SPREADSHEET_ID belum diset di environment variable Cloud Run."
        )

    result = (
        _sheets_service()
        .spreadsheets()
        .values()
        .get(
            spreadsheetId=SPREADSHEET_ID,
            range=sheet_range,
            # Jangan memakai FORMATTED_VALUE: format lokal tanggal di Sheet
            # dapat ambigu (mis. 7/1/2026). Serial number selalu konsisten.
            valueRenderOption="UNFORMATTED_VALUE",
            dateTimeRenderOption="SERIAL_NUMBER",
        )
        .execute()
    )

    values = result.get("values", [])
    return values[1:] if values else []


def _query_lampiran_rows(filter_):
    date_from = _parse_date(filter_["tglDari"])
    date_to = _parse_date(filter_["tglSampai"])
    ulp_filter = filter_.get("ulp", "").lower()
    tim_filter = filter_.get("tim", "").lower()
    penyulang_filter = filter_.get("penyulang", "").lower()
    output = []

    for source_row in _read_sheet_rows(SHEET_RANGE_EKS):
        date_iso = _normalize_date(_get_cell(source_row, COL_EKS["tanggal"]))
        row_date = _parse_date(date_iso)
        if not row_date or row_date < date_from or row_date > date_to:
            continue

        ulp = _safe_str(_get_cell(source_row, COL_EKS["ulp"]))
        tim = _safe_str(_get_cell(source_row, COL_EKS["tim"]))
        penyulang = _safe_str(_get_cell(source_row, COL_EKS["penyulang"]))

        if ulp_filter and ulp.lower() != ulp_filter:
            continue
        if tim_filter and tim.lower() != tim_filter:
            continue
        if penyulang_filter and penyulang.lower() != penyulang_filter:
            continue

        kode = _safe_str(_get_cell(source_row, COL_EKS["kodeEksekusi"]))
        nomor_tiang = _safe_str(_get_cell(source_row, 10))
        # Selaras dengan Tek-ROW.gs: data eksekusi tetap sah bila Kode
        # Eksekusi belum terbentuk tetapi Nomor Tiang sudah ada.
        if not kode and not nomor_tiang:
            continue

        output.append({
            "kodeEksekusi": kode,
            "ulp": ulp,
            "tanggal": date_iso,
            "tim": tim,
            "penyulang": penyulang,
            "section": _safe_str(_get_cell(source_row, COL_EKS["section"])),
            "koordinat": _safe_str(_get_cell(source_row, COL_EKS["koordinat"])),
            "jenisPekerjaan": _safe_str(
                _get_cell(source_row, COL_EKS["jenisPekerjaan"])
            ),
            "diameter": _safe_str(_get_cell(source_row, COL_EKS["diameter"])),
            "fotoSebelum": _safe_str(
                _get_cell(source_row, COL_EKS["fotoSebelumUrl"])
            ),
            "fotoPekerjaan": _safe_str(
                _get_cell(source_row, COL_EKS["fotoPekerjaanUrl"])
            ),
            "fotoSesudah": _safe_str(
                _get_cell(source_row, COL_EKS["fotoSesudahUrl"])
            ),
        })

    output.sort(key=lambda row: (
        row["tanggal"], row["tim"], row["penyulang"], row["kodeEksekusi"]
    ))
    return output


def _query_rekap_rows(filter_):
    date_from = _parse_date(filter_["tglDari"])
    date_to = _parse_date(filter_["tglSampai"])
    tim_filter = filter_.get("tim", "").lower()
    penyulang_filter = filter_.get("penyulang", "").lower()
    output = []

    for source_row in _read_sheet_rows(SHEET_RANGE_RLZ):
        date_iso = _normalize_date(_get_cell(source_row, COL_RLZ["tanggal"]))
        row_date = _parse_date(date_iso)
        if not row_date or row_date < date_from or row_date > date_to:
            continue

        tim = _safe_str(_get_cell(source_row, COL_RLZ["tim"]))
        penyulang = _safe_str(_get_cell(source_row, COL_RLZ["penyulang"]))

        if tim_filter and tim.lower() != tim_filter:
            continue
        if penyulang_filter and penyulang.lower() != penyulang_filter:
            continue

        kode_header = _safe_str(_get_cell(source_row, COL_RLZ["kodeHeader"]))
        kode = _safe_str(_get_cell(source_row, COL_RLZ["kodePekerjaan"]))
        # Selaras dengan getSemuaLaporan(): header atau kode pekerjaan cukup
        # sebagai penanda bahwa baris realisasi valid.
        if not kode and not kode_header:
            continue

        output.append({
            "kodeHeader": kode_header,
            "kodePekerjaan": kode,
            "tanggal": date_iso,
            "tim": tim,
            "penyulang": penyulang,
            "section": _safe_str(_get_cell(source_row, COL_RLZ["section"])),
            "rabas": _to_number(_get_cell(source_row, COL_RLZ["rabas"])),
            "sedang": _to_number(_get_cell(source_row, COL_RLZ["sedang"])),
            "besar": _to_number(_get_cell(source_row, COL_RLZ["besar"])),
        })

    output.sort(key=lambda row: (
        row["tanggal"], row["tim"], row["penyulang"], row["kodePekerjaan"]
    ))
    return output

# =========================================================
# IMAGE HELPERS
# =========================================================


def _extract_drive_id(url):
    text = unquote(_safe_str(url))
    if not text:
        return ""

    for pattern in (
        r"[?&]id=([-\w]{20,})",
        r"/d/([-\w]{20,})",
        r"([-\w]{25,})",
    ):
        match = re.search(pattern, text)
        if match:
            return match.group(1)
    return ""


_IMAGE_CACHE = {}


def _download_drive_thumb(file_id):
    if not file_id:
        return None
    if file_id in _IMAGE_CACHE:
        return _IMAGE_CACHE[file_id]

    urls = [
        f"https://drive.google.com/thumbnail?id={file_id}&sz=w160",
        f"https://drive.usercontent.google.com/download?id={file_id}&export=download",
    ]

    # URL final. Assignment ini menimpa daftar lama agar request tidak
    # membawa karakter kurung kurawal di depan protokol HTTPS.
    urls = [
        f"https://drive.google.com/thumbnail?id={file_id}&sz=w160",
        f"https://drive.usercontent.google.com/download?id={file_id}&export=download",
    ]

    urls = [
        f"https://drive.google.com/thumbnail?id={file_id}&sz=w160",
        f"https://drive.usercontent.google.com/download?id={file_id}&export=download",
    ]

    urls = [
        "https://drive.google.com/thumbnail?id=" + file_id + "&sz=w160",
        "https://drive.usercontent.google.com/download?id=" + file_id + "&export=download",
    ]

    for url in urls:
        try:
            response = requests.get(url, timeout=12)
            if not response.ok or not response.content:
                continue

            image = Image.open(io.BytesIO(response.content)).convert("RGB")
            image.thumbnail((160, 90), Image.Resampling.LANCZOS)
            image_buffer = io.BytesIO()
            image.save(
                image_buffer,
                format="JPEG",
                quality=28,
                optimize=True,
                progressive=True,
            )
            image_buffer.seek(0)
            reader = ImageReader(image_buffer)
            _IMAGE_CACHE[file_id] = reader
            return reader
        except Exception:
            continue

    _IMAGE_CACHE[file_id] = None
    return None


def _photo_candidate_urls(photo_url):
    """Kandidat URL foto dari kolom S/U/W db_ROW_Eksekusi.

    URL AppSheet getimageurl yang sudah memiliki signature harus diunduh
    langsung. URL Drive tetap didukung untuk kompatibilitas data lama.
    """
    source = _safe_str(photo_url).replace("&amp;", "&")
    if not source:
        return []

    lower = source.lower()
    is_drive = (
        "drive.google.com" in lower
        or "drive.usercontent.google.com" in lower
        or "docs.google.com" in lower
    )

    if is_drive:
        file_id = _extract_drive_id(source)
        if file_id:
            return [
                "https://drive.google.com/thumbnail?id=" + file_id + "&sz=w160",
                "https://drive.usercontent.google.com/download?id="
                + file_id
                + "&export=download",
            ]

    # AppSheet: gunakan URL lengkap apa adanya. Jangan mengambil signature
    # AppSheet sebagai Drive file ID.
    return [source]


def _download_photo_thumb(photo_url):
    source = _safe_str(photo_url).replace("&amp;", "&")
    if not source:
        return None
    if source in _IMAGE_CACHE:
        return _IMAGE_CACHE[source]

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "Chrome/126.0 Safari/537.36"
        ),
        "Accept": "image/avif,image/webp,image/apng,image/jpeg,image/png,*/*;q=0.8",
        "Referer": "https://www.appsheet.com/",
    }

    for url in _photo_candidate_urls(source):
        try:
            response = requests.get(
                url,
                headers=headers,
                timeout=(PHOTO_CONNECT_TIMEOUT, PHOTO_READ_TIMEOUT),
                allow_redirects=True,
            )
            if not response.ok or not response.content:
                continue

            image = Image.open(io.BytesIO(response.content)).convert("RGB")
            image.thumbnail((160, 90), Image.Resampling.LANCZOS)

            image_buffer = io.BytesIO()
            image.save(
                image_buffer,
                format="JPEG",
                quality=28,
                optimize=True,
                progressive=True,
            )
            image_buffer.seek(0)

            reader = ImageReader(image_buffer)
            _IMAGE_CACHE[source] = reader
            return reader
        except Exception:
            continue

    _IMAGE_CACHE[source] = None
    return None


def _prefetch_lampiran_photos(rows):
    """Unduh seluruh foto unik secara paralel sebelum menggambar PDF.

    Sebelumnya setiap baris melakukan tiga request secara berurutan. Untuk
    ratusan baris hal itu memicu upstream request timeout. Prefetch paralel
    membuat proses gambar dibatasi oleh batch request, bukan jumlah foto ×
    timeout per request.
    """
    urls = []
    seen = set()

    for row in rows:
        for key in ("fotoSebelum", "fotoPekerjaan", "fotoSesudah"):
            url = _safe_str(row.get(key)).replace("&amp;", "&")
            if url and url not in seen:
                seen.add(url)
                urls.append(url)

    if not urls:
        return {"total": 0, "berhasil": 0, "gagal": 0}

    workers = max(1, min(PHOTO_WORKERS, len(urls)))
    berhasil = 0
    gagal = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(_download_photo_thumb, url): url
            for url in urls
        }

        for future in as_completed(futures):
            try:
                if future.result() is not None:
                    berhasil += 1
                else:
                    gagal += 1
            except Exception:
                gagal += 1

    app.logger.info(
        "Prefetch foto Lampiran: total=%s berhasil=%s gagal=%s workers=%s",
        len(urls),
        berhasil,
        gagal,
        workers,
    )
    return {"total": len(urls), "berhasil": berhasil, "gagal": gagal}

# =========================================================
# SHARED PDF HELPERS
# =========================================================


def _draw_double_border(pdf, x, y, width, height):
    pdf.setStrokeColor(black)
    pdf.setLineWidth(1.2)
    pdf.rect(x, y, width, height, stroke=1, fill=0)
    inset = 1.6
    pdf.rect(
        x + inset,
        y + inset,
        width - 2 * inset,
        height - 2 * inset,
        stroke=1,
        fill=0,
    )


def _draw_logo(pdf, x, y, height):
    if not os.path.exists(LOGO_PLN_PATH):
        return 0
    try:
        image = Image.open(LOGO_PLN_PATH)
        width = height * (image.size[0] / image.size[1])
        pdf.drawImage(
            LOGO_PLN_PATH, x, y, width=width, height=height, mask="auto"
        )
        return width
    except Exception:
        return 0


def _fit_single_line(text, font, size, width):
    source = _safe_str(text)
    if stringWidth(source, font, size) <= width:
        return source

    suffix = "..."
    fitted = source
    while fitted and stringWidth(fitted + suffix, font, size) > width:
        fitted = fitted[:-1]
    return fitted + suffix if fitted else ""


def _wrap_lines(text, font, size, width, max_lines):
    words = _safe_str(text).split()
    if not words:
        return []

    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
        if len(lines) == max_lines:
            break

    if current and len(lines) < max_lines:
        lines.append(current)

    if lines:
        lines[-1] = _fit_single_line(lines[-1], font, size, width)
    return lines[:max_lines]


def _draw_text_fit(
    pdf,
    text,
    x,
    y,
    width,
    height,
    font=FONT_REG,
    size=5,
    align="center",
    max_lines=1,
):
    text = _safe_str(text)
    if not text:
        return

    available_width = max(1, width - 3)
    lines = (
        [_fit_single_line(text, font, size, available_width)]
        if max_lines <= 1
        else _wrap_lines(text, font, size, available_width, max_lines)
    )
    if not lines:
        return

    pdf.setFont(font, size)
    pdf.setFillColor(black)
    leading = size + 0.7
    total_height = len(lines) * leading
    baseline = y + (height + total_height) / 2 - leading + 0.8

    for index, line in enumerate(lines):
        text_width = stringWidth(line, font, size)
        if align == "left":
            text_x = x + 1.5
        elif align == "right":
            text_x = x + width - text_width - 1.5
        else:
            text_x = x + (width - text_width) / 2
        pdf.drawString(text_x, baseline - index * leading, line)


def _draw_image_fit(pdf, image_reader, x, y, width, height):
    if not image_reader:
        pdf.setFont(FONT_REG, 4.5)
        pdf.setFillColor(black)
        pdf.drawCentredString(x + width / 2, y + height / 2 - 2, "-")
        return

    try:
        image_width, image_height = image_reader.getSize()
        scale = min((width - 1) / image_width, (height - 1) / image_height)
        draw_width = image_width * scale
        draw_height = image_height * scale
        pdf.drawImage(
            image_reader,
            x + (width - draw_width) / 2,
            y + (height - draw_height) / 2,
            width=draw_width,
            height=draw_height,
            preserveAspectRatio=True,
            mask="auto",
        )
    except Exception:
        pdf.setFont(FONT_REG, 4.5)
        pdf.drawCentredString(x + width / 2, y + height / 2 - 2, "-")

# =========================================================
# PDF LAMPIRAN
# =========================================================


def _lampiran_col_widths(table_width):
    percentages = [3, 4.5, 6, 4.5, 7, 23, 9, 7, 4, 10.5, 10.5, 10]
    total = sum(percentages)
    return [table_width * value / total for value in percentages]


def _draw_lampiran_kop(pdf, meta, top_y):
    left = LAMP_MARGIN_X + 5
    right = LAMP_PAGE_W - LAMP_MARGIN_X - 5
    y = top_y

    logo_height = 34
    logo_width = _draw_logo(pdf, left, y - logo_height, logo_height)

    pdf.setFont(FONT_BOLD, 9)
    pdf.drawString(left + logo_width + 6, y - 11, "PT. PLN (Persero)")
    pdf.drawString(
        left + logo_width + 6,
        y - 23,
        "Unit Induk Wilayah Bangka Belitung",
    )
    pdf.drawRightString(right, y - 11, "LAMPIRAN PEKERJAAN ROW")
    pdf.drawRightString(right, y - 23, "PERAMBASAN POHON ( ROW )")

    y -= 42
    pdf.setLineWidth(1)
    pdf.line(LAMP_MARGIN_X + 4, y, LAMP_PAGE_W - LAMP_MARGIN_X - 4, y)
    pdf.line(LAMP_MARGIN_X + 4, y - 2, LAMP_PAGE_W - LAMP_MARGIN_X - 4, y - 2)

    x0 = LAMP_MARGIN_X + 10
    y -= 13
    pdf.setFont(FONT_BOLD, 8)
    for label, value in (
        ("UP3", _safe_str(meta.get("up3") or "BANGKA").upper()),
        ("ULP", _safe_str(meta.get("ulp") or "TOBOALI").upper()),
        ("PERIODE", _safe_str(meta.get("periode"))),
    ):
        pdf.drawString(x0, y, label)
        pdf.drawString(x0 + 42, y, ":")
        pdf.drawString(x0 + 52, y, value)
        y -= 11

    y += 1
    pdf.line(LAMP_MARGIN_X + 4, y, LAMP_PAGE_W - LAMP_MARGIN_X - 4, y)
    pdf.line(LAMP_MARGIN_X + 4, y - 8, LAMP_PAGE_W - LAMP_MARGIN_X - 4, y - 8)
    return y - 15


def _draw_lampiran_header(pdf, x, y, widths, height):
    headers = [
        "No", "ULP", "Tanggal", "Tim", "Penyulang", "Section",
        "Koordinat", "Jenis Pekerjaan", "Diameter",
        "Foto Sebelum", "Foto Pekerjaan", "Foto Sesudah",
    ]
    pdf.setFillColor(YELLOW)
    pdf.rect(x, y - height, sum(widths), height, stroke=1, fill=1)
    pdf.setFillColor(black)
    pdf.setStrokeColor(black)
    pdf.setLineWidth(0.45)

    current_x = x
    for index, header in enumerate(headers):
        pdf.rect(current_x, y - height, widths[index], height, stroke=1, fill=0)
        _draw_text_fit(
            pdf,
            header,
            current_x,
            y - height,
            widths[index],
            height,
            font=FONT_BOLD,
            size=5.5,
            max_lines=2,
        )
        current_x += widths[index]


def _draw_lampiran_row(pdf, row, number, x, y, widths, height):
    values = [
        number,
        row["ulp"],
        _tanggal_id(row["tanggal"]),
        row["tim"],
        row["penyulang"],
        row["section"],
        row["koordinat"],
        row["jenisPekerjaan"],
        row["diameter"],
    ]

    pdf.setStrokeColor(black)
    pdf.setLineWidth(0.35)
    current_x = x

    for index, value in enumerate(values):
        pdf.rect(current_x, y - height, widths[index], height, stroke=1, fill=0)
        if index == 5:
            _draw_text_fit(
                pdf, value, current_x, y - height, widths[index], height,
                size=4.5, align="left", max_lines=2,
            )
        elif index == 6:
            _draw_text_fit(
                pdf, value, current_x, y - height, widths[index], height,
                size=4.2, max_lines=2,
            )
        else:
            _draw_text_fit(
                pdf, value, current_x, y - height, widths[index], height,
                size=4.5,
            )
        current_x += widths[index]

    photo_urls = [
        row.get("fotoSebelum"),
        row.get("fotoPekerjaan"),
        row.get("fotoSesudah"),
    ]

    for offset, photo_url in enumerate(photo_urls):
        index = 9 + offset
        pdf.rect(current_x, y - height, widths[index], height, stroke=1, fill=0)
        image = _download_photo_thumb(photo_url)
        _draw_image_fit(
            pdf,
            image,
            current_x + 0.8,
            y - height + 0.8,
            widths[index] - 1.6,
            height - 1.6,
        )
        current_x += widths[index]


def _draw_lampiran_footer(pdf, page_number):
    pdf.setFont(FONT_REG, 6)
    pdf.setFillColor(black)
    pdf.drawRightString(
        LAMP_PAGE_W - LAMP_MARGIN_X - 6,
        LAMP_MARGIN_Y + 3,
        f"Halaman {page_number}",
    )


def build_lampiran_pdf(rows, meta):
    # Cache dibangun sekali per file. Semua foto diunduh paralel terlebih
    # dahulu agar proses gambar tabel tidak melakukan request berurutan.
    _IMAGE_CACHE.clear()
    _prefetch_lampiran_photos(rows)

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(LAMP_PAGE_W, LAMP_PAGE_H))

    table_x = LAMP_MARGIN_X + 5
    table_width = LAMP_PAGE_W - 2 * LAMP_MARGIN_X - 10
    widths = _lampiran_col_widths(table_width)

    full_top = LAMP_PAGE_H - LAMP_MARGIN_Y - 8
    full_bottom = LAMP_MARGIN_Y + 8
    fixed_height = (full_top - full_bottom) / 51
    rows_per_full_page = 50

    row_index = 0
    page_number = 1

    # Halaman pertama: kop + header + data sesuai ruang yang tersedia.
    _draw_double_border(
        pdf,
        LAMP_MARGIN_X,
        LAMP_MARGIN_Y,
        LAMP_PAGE_W - 2 * LAMP_MARGIN_X,
        LAMP_PAGE_H - 2 * LAMP_MARGIN_Y,
    )
    table_top = _draw_lampiran_kop(
        pdf, meta, LAMP_PAGE_H - LAMP_MARGIN_Y - 12
    )
    first_capacity = max(
        1, int((table_top - (LAMP_MARGIN_Y + 8) - fixed_height) // fixed_height)
    )
    _draw_lampiran_header(pdf, table_x, table_top, widths, fixed_height)
    y = table_top - fixed_height

    first_count = min(first_capacity, len(rows))
    for _ in range(first_count):
        _draw_lampiran_row(
            pdf, rows[row_index], row_index + 1, table_x, y, widths, fixed_height
        )
        y -= fixed_height
        row_index += 1

    _draw_lampiran_footer(pdf, page_number)
    pdf.showPage()
    page_number += 1

    # Halaman berikutnya: 1 header + maksimal 50 baris data.
    while row_index < len(rows):
        _draw_double_border(
            pdf,
            LAMP_MARGIN_X,
            LAMP_MARGIN_Y,
            LAMP_PAGE_W - 2 * LAMP_MARGIN_X,
            LAMP_PAGE_H - 2 * LAMP_MARGIN_Y,
        )
        _draw_lampiran_header(pdf, table_x, full_top, widths, fixed_height)
        y = full_top - fixed_height
        count = min(rows_per_full_page, len(rows) - row_index)

        for _ in range(count):
            _draw_lampiran_row(
                pdf,
                rows[row_index],
                row_index + 1,
                table_x,
                y,
                widths,
                fixed_height,
            )
            y -= fixed_height
            row_index += 1

        _draw_lampiran_footer(pdf, page_number)
        pdf.showPage()
        page_number += 1

    pdf.save()
    buffer.seek(0)
    return buffer

# =========================================================
# PDF REKAP
# =========================================================


def _rekap_col_widths(table_width):
    # Lebar tiga kolom pekerjaan diperkecil dari 9% menjadi 7%.
    # Tambahan 6% dialihkan ke Keterangan agar "DATA TERLAMPIR" tampil penuh.
    percentages = [4, 10, 6, 12, 30, 7, 7, 7, 17]
    return [table_width * value / 100 for value in percentages]


def _draw_rekap_kop(pdf, meta, top_y):
    left = REKAP_MARGIN_X + 10
    right = REKAP_PAGE_W - REKAP_MARGIN_X - 10
    y = top_y

    logo_height = 48
    logo_width = _draw_logo(pdf, left, y - logo_height, logo_height)

    pdf.setFont(FONT_BOLD, 9)
    pdf.drawString(left + logo_width + 8, y - 16, "PT. PLN (Persero)")
    pdf.drawString(
        left + logo_width + 8,
        y - 30,
        "Unit Induk Wilayah Bangka Belitung",
    )
    pdf.drawRightString(right, y - 16, "Laporan Bulanan")
    pdf.drawRightString(right, y - 30, "Perambasan Pohon ( ROW )")

    y -= 58
    pdf.setLineWidth(1)
    pdf.line(REKAP_MARGIN_X + 6, y, REKAP_PAGE_W - REKAP_MARGIN_X - 6, y)
    pdf.line(REKAP_MARGIN_X + 6, y - 2, REKAP_PAGE_W - REKAP_MARGIN_X - 6, y - 2)

    x0 = REKAP_MARGIN_X + 16
    y -= 14
    pdf.setFont(FONT_BOLD, 8)
    for label, value in (
        ("UP3", _safe_str(meta.get("up3") or "BANGKA").upper()),
        ("ULP", _safe_str(meta.get("ulp") or "TOBOALI").upper()),
        ("PERIODE", _safe_str(meta.get("periode"))),
    ):
        pdf.drawString(x0, y, label)
        pdf.drawString(x0 + 45, y, ":")
        pdf.drawString(x0 + 55, y, value)
        y -= 12

    y += 2
    pdf.line(REKAP_MARGIN_X + 6, y, REKAP_PAGE_W - REKAP_MARGIN_X - 6, y)
    pdf.line(REKAP_MARGIN_X + 6, y - 8, REKAP_PAGE_W - REKAP_MARGIN_X - 6, y - 8)
    return y - 18


def _draw_rekap_header(pdf, x, y, widths, height):
    headers = [
        "NO", "TANGGAL", "TIM", "PENYULANG", "SECTION",
        "RABAS / PANGKAS", "TEBANG SEDANG", "TEBANG BESAR", "KETERANGAN",
    ]
    pdf.setFillColor(YELLOW)
    pdf.rect(x, y - height, sum(widths), height, stroke=1, fill=1)
    pdf.setFillColor(black)
    pdf.setStrokeColor(black)
    pdf.setLineWidth(0.55)

    current_x = x
    for index, header in enumerate(headers):
        pdf.rect(current_x, y - height, widths[index], height, stroke=1, fill=0)
        _draw_text_fit(
            pdf,
            header,
            current_x,
            y - height,
            widths[index],
            height,
            font=FONT_BOLD,
            size=6 if index in (5, 6, 7) else 7,
            max_lines=2,
        )
        current_x += widths[index]


def _draw_rekap_row(pdf, row, number, x, y, widths, height):
    values = [
        number,
        _tanggal_id(row["tanggal"]),
        row["tim"],
        row["penyulang"],
        row["section"],
        row["rabas"],
        row["sedang"],
        row["besar"],
        "DATA TERLAMPIR",
    ]
    pdf.setStrokeColor(black)
    pdf.setLineWidth(0.45)
    current_x = x

    for index, value in enumerate(values):
        pdf.rect(current_x, y - height, widths[index], height, stroke=1, fill=0)
        _draw_text_fit(
            pdf,
            value,
            current_x,
            y - height,
            widths[index],
            height,
            size=7,
            align="left" if index == 4 else "center",
            max_lines=2 if index == 4 else 1,
        )
        current_x += widths[index]


def _draw_rekap_total(pdf, x, y, widths, height, totals):
    pdf.setFillColor(GRAY_TOTAL)
    pdf.rect(x, y - height, sum(widths), height, stroke=1, fill=1)
    pdf.setFillColor(black)
    pdf.setStrokeColor(black)

    merged_width = sum(widths[:5])
    pdf.rect(x, y - height, merged_width, height, stroke=1, fill=0)
    _draw_text_fit(
        pdf, "JUMLAH", x, y - height, merged_width, height,
        font=FONT_BOLD, size=7,
    )

    current_x = x + merged_width
    for index, value in enumerate((totals[0], totals[1], totals[2], ""), start=5):
        pdf.rect(current_x, y - height, widths[index], height, stroke=1, fill=0)
        _draw_text_fit(
            pdf, value, current_x, y - height, widths[index], height,
            font=FONT_BOLD, size=7,
        )
        current_x += widths[index]


def _draw_rekap_signature(pdf, x, y, table_width, meta):
    left_x = x + 8
    right_x = x + table_width * 0.64
    signature_dots = ".......................…"

    pdf.setFont(FONT_BOLD, 8)
    pdf.drawString(left_x, y, "PIHAK PERTAMA")
    pdf.drawString(right_x, y, "PIHAK KEDUA")

    y -= 34
    pdf.drawString(left_x, y, _safe_str(meta.get("manager")))
    pdf.drawString(right_x, y, _safe_str(meta.get("koordinator")))
    pdf.setFont(FONT_REG, 7.5)
    pdf.drawString(
        left_x,
        y - 10,
        "MANAGER ULP TOBOALI " + signature_dots,
    )
    pdf.drawString(
        right_x,
        y - 10,
        "KOORDINATOR ULP (OPERASI) " + signature_dots,
    )

    y -= 42
    pdf.setFont(FONT_BOLD, 8)
    pdf.drawString(left_x, y, _safe_str(meta.get("teamLeader")))
    pdf.setFont(FONT_REG, 7.5)
    pdf.drawString(
        left_x,
        y - 10,
        "TL TEKNIK ULP TOBOALI " + signature_dots,
    )


def _draw_rekap_footer(pdf, page_number):
    pdf.setFont(FONT_REG, 6)
    pdf.drawRightString(
        REKAP_PAGE_W - REKAP_MARGIN_X - 8,
        REKAP_MARGIN_Y + 5,
        f"Halaman {page_number}",
    )


def build_rekap_pdf(rows, meta):
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(REKAP_PAGE_W, REKAP_PAGE_H))

    table_x = REKAP_MARGIN_X + 6
    table_width = REKAP_PAGE_W - 2 * REKAP_MARGIN_X - 12
    widths = _rekap_col_widths(table_width)
    header_height = 22
    row_height = 21

    total_rabas = sum(row["rabas"] for row in rows)
    total_sedang = sum(row["sedang"] for row in rows)
    total_besar = sum(row["besar"] for row in rows)
    totals = (total_rabas, total_sedang, total_besar)

    row_index = 0
    page_number = 1

    while True:
        _draw_double_border(
            pdf,
            REKAP_MARGIN_X,
            REKAP_MARGIN_Y,
            REKAP_PAGE_W - 2 * REKAP_MARGIN_X,
            REKAP_PAGE_H - 2 * REKAP_MARGIN_Y,
        )
        # Kop lengkap hanya ditampilkan pada halaman pertama. Halaman kedua
        # dan seterusnya dimulai dari header tabel agar ruang data maksimal.
        if page_number == 1:
            table_top = _draw_rekap_kop(
                pdf, meta, REKAP_PAGE_H - REKAP_MARGIN_Y - 8
            )
        else:
            table_top = REKAP_PAGE_H - REKAP_MARGIN_Y - 8

        _draw_rekap_header(pdf, table_x, table_top, widths, header_height)
        y = table_top - header_height

        remaining = len(rows) - row_index
        normal_bottom = REKAP_MARGIN_Y + 22
        last_bottom = REKAP_MARGIN_Y + 112
        last_bottom_with_enter = last_bottom + 10
        normal_capacity = max(1, int((y - normal_bottom) // row_height))
        last_capacity = max(1, int((y - last_bottom) // row_height) - 1)
        last_capacity_with_enter = max(
            1, int((y - last_bottom_with_enter) // row_height) - 1
        )

        # Prioritaskan satu baris kosong setelah jabatan TL agar tidak
        # terlalu dekat dengan border bawah. Jika ruang tambahan tersebut
        # akan membuat halaman baru, gunakan kapasitas lama tanpa enter.
        if remaining <= last_capacity_with_enter:
            is_last_page = True
            capacity = last_capacity_with_enter
        elif remaining <= last_capacity:
            is_last_page = True
            capacity = last_capacity
        else:
            is_last_page = False
            capacity = normal_capacity

        count = min(capacity, max(0, remaining))

        for _ in range(count):
            _draw_rekap_row(
                pdf,
                rows[row_index],
                row_index + 1,
                table_x,
                y,
                widths,
                row_height,
            )
            y -= row_height
            row_index += 1

        if is_last_page:
            _draw_rekap_total(pdf, table_x, y, widths, row_height, totals)
            y -= row_height
            _draw_rekap_signature(pdf, table_x, y - 18, table_width, meta)

        _draw_rekap_footer(pdf, page_number)
        pdf.showPage()
        page_number += 1

        if is_last_page:
            break

    pdf.save()
    buffer.seek(0)
    return buffer

# =========================================================
# ROUTES
# =========================================================


@app.get("/")
def health():
    return "ok"


@app.get("/row/lampiran")
def row_lampiran():
    _require_secret(request)
    filter_ = _request_filter()
    date_from, date_to, error_response = _validate_period(filter_)
    if error_response:
        return error_response

    days = _days_inclusive(date_from, date_to)
    if days > MAX_DAYS_LAMPIRAN:
        return jsonify({
            "ok": False,
            "message": f"Download Lampiran maksimal {MAX_DAYS_LAMPIRAN} hari.",
        }), 400

    rows = _query_lampiran_rows(filter_)
    if len(rows) > MAX_ROWS_LAMPIRAN:
        return jsonify({
            "ok": False,
            "message": (
                f"Data lampiran terlalu besar ({len(rows)} baris). "
                f"Maksimal {MAX_ROWS_LAMPIRAN} baris. "
                "Silakan filter Tim atau Penyulang."
            ),
            "totalRows": len(rows),
        }), 400

    pdf_buffer = build_lampiran_pdf(rows, _make_meta(filter_))
    filename = (
        f"Lampiran_ROW_{filter_['tglDari']}_sd_{filter_['tglSampai']}.pdf"
    )
    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


@app.get("/row/rekap")
def row_rekap():
    _require_secret(request)
    filter_ = _request_filter()
    _, _, error_response = _validate_period(filter_)
    if error_response:
        return error_response

    rows = _query_rekap_rows(filter_)
    pdf_buffer = build_rekap_pdf(rows, _make_meta(filter_))
    filename = f"Rekap_ROW_{filter_['tglDari']}_sd_{filter_['tglSampai']}.pdf"
    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))