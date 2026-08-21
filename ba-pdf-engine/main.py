import os
import re
import io
import json
import base64
import datetime
from urllib.parse import unquote

import google.auth
import requests
from flask import Flask, request, jsonify
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, portrait
from reportlab.lib.units import mm
from reportlab.lib.colors import black, HexColor
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.utils import ImageReader

app = Flask(__name__)

# =========================================================
# CONFIG
# =========================================================
PDF_SECRET = os.environ.get("PDF_SECRET", "sisi-pdf-2026")
SPREADSHEET_ID = os.environ.get(
    "SPREADSHEET_ID", "1TEC2iaxEcTCn0IXDZM1kHpAhKyBHuG90SMK48zEkeOw"
)
SHEET_BA = os.environ.get("SHEET_BA", "Rekap Gardu")
# Folder root Shared Drive "Laporan ULP Toboali".
BA_ROOT_FOLDER_ID = os.environ.get(
    "BA_ROOT_FOLDER_ID", "1lpZAbSVkHjceLJlDEWkiUl27I7O4nmGf"
)
GOOGLE_SERVICE_ACCOUNT_JSON_B64 = os.environ.get(
    "GOOGLE_SERVICE_ACCOUNT_JSON_B64", ""
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGO_PLN_PATH = os.path.join(BASE_DIR, "assets", "logo_pln.png")

TZ = datetime.timezone(datetime.timedelta(hours=7))
FONT_REG = "Times-Roman"
FONT_BOLD = "Times-Bold"
BLUE = HexColor("#1E3A8A")
GRAY = HexColor("#F2F2F2")

PAGE_W, PAGE_H = portrait(A4)
# Margin kiri sengaja lebih lebar dari kanan supaya area teks tidak
# terkena lubang pelubang kertas saat PDF dicetak & diarsip.
MARGIN_LEFT = 25 * mm   # kiri (ruang untuk lubang arsip)
MARGIN_RIGHT = 16 * mm  # kanan / atas-bawah horizontal
MARGIN_X = MARGIN_RIGHT # kompat: referensi lama = margin kanan
MARGIN_Y = 14 * mm

BULAN_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

# Alias header Rekap Gardu (dinormalisasi: lowercase, hanya a-z0-9).
# Key idBA = kolom CI. Fallback NO BA Full = kolom CE.
FIELD_ALIASES = {
    "nomorBA": ["idBA", "ID BA", "Id BA", "Nomor BA", "No BA"],
    "nomorBAFull": ["NO BA Full", "Nomor BA Full", "No BA Full", "NoBAFull"],
    "nomorTrafo": ["Nomor Trafo", "Nomor Gardu", "Nama Gardu", "Gardu"],
    "tanggalBA": ["Tanggal BA", "Tanggal", "Tgl"],
    "tanggalPekerjaan": ["Tanggal Pekerjaan", "Tgl Pekerjaan"],
    "jenisPekerjaan": ["Jenis Pekerjaan", "Pekerjaan"],
    "penyulang": ["Penyulang"],
    "section": ["Section", "Seksi"],
    "koordinat": ["Koordinat Trafo", "Koordinat"],
    "alamat": ["Alamat"],
    "kapasitas": ["Kapasitas", "Kapasitas (kVA)", "Daya", "kVA"],
    "merk": ["Merk", "Merk Trafo"],
    "nomorSeri": ["Nomor Seri", "No Seri Trafo"],
    "tahun": ["Tahun", "Tahun Trafo"],
    "konstruksi": ["Konstruksi", "Konstruksi Trafo"],
    "jurusan": ["Jurusan Terpasang", "Jurusan"],
    "kepemilikan": ["Kepemilikan"],
    "ownerId": ["OwnerId", "Owner Id"],
    "externalRef": ["External Reference", "External Ref"],
    "perluasan": ["Panjang Perluasan SUTM", "Perluasan SUTM", "Perluasan"],
    "vendor": ["Vendor Pekerja", "Vendor"],
    "phbMerk": ["Merk PHB-TR", "Merk PHB"],
    "phbSeri": ["Nomor Seri PHB-TR", "No Seri PHB-TR", "Seri PHB"],
    "phbTahun": ["Tahun PHB-TR", "Tahun PHB"],
    "petugas1": ["Petugas 1", "Petugas1"],
    "jabatan1": ["Jabatan Petugas 1", "Jabatan 1"],
    "petugas2": ["Petugas 2", "Petugas2"],
    "jabatan2": ["Jabatan Petugas 2", "Jabatan 2"],
    "mengetahui": ["Mengetahui"],
    "jabatanMengetahui": ["Jabatan Mengetahui"],
    # Status penggantian box PHB-TR ("Ya"/"Tidak") untuk BA Penggantian Trafo.
    "phbDiganti": ["PHB-TR Diganti", "Status PHB-TR", "PHB Diganti"],
}

# Foto: kolom huruf tetap sesuai BA_PHOTO_COLUMN di Apps Script.
PHOTO_COL_LETTERS = {
    "nameplateTrafo": "N",
    "fotoFullGardu": "AH",
    "nameplatePhb": "AB",
    "fotoBoxPhb": "AE",
}

# Data "Trafo Sesudah" (khusus Penggantian Trafo) — kolom huruf tetap.
# Sinkron dgn getLinkWaBeritaAcara(): AK Kapasitas, AL Merk, AM Nomor Seri,
# AN Tahun, AO Asal Trafo (trafo yang dipasang).
FIELD_COL_LETTERS_SESUDAH = {
    "kapasitasSesudah": "AK",
    "merkSesudah": "AL",
    "nomorSeriSesudah": "AM",
    "tahunSesudah": "AN",
    "asalTrafo": "AO",
}

# Data PHB-TR "Sesudah" (khusus Penggantian Trafo) — kolom huruf tetap.
# AS Nomor Seri PHB-TR, AT Merk PHB-TR, AU Tahun PHB-TR, AV Jumlah Jurusan.
FIELD_COL_LETTERS_PHB_SESUDAH = {
    "phbSeriSesudah": "AS",
    "phbMerkSesudah": "AT",
    "phbTahunSesudah": "AU",
    "phbJurusanSesudah": "AV",
}

# Foto lampiran Penggantian Trafo (6 foto) — kolom huruf tetap sesuai
# BA_PHOTO_COLUMN di Apps Script.
PHOTO_COL_LETTERS_PENGGANTIAN = {
    "nameplateTrafoSebelum": "N",
    "nameplateTrafoSesudah": "AP",
    "nameplatePhbSebelum": "AB",
    "nameplatePhbSesudah": "AW",
    "fotoPhbSebelum": "AE",
    "fotoPhbSesudah": "AZ",
}

# BA PEMERIKSAAN TRAFO — grup kolom "Kesimpulan (Hanya Untuk Pemeriksaan Trafo)"
# di Rekap Gardu. Yang dibaca HANYA kolom link Drive (Link Foto Megger 1..6),
# sinkron dgn BA_PRK_FOTO_COLUMN di Apps Script.
PHOTO_COL_LETTERS_PEMERIKSAAN = {
    "megger1": "BF",
    "megger2": "BI",
    "megger3": "BL",
    "megger4": "BO",
    "megger5": "BR",
    "megger6": "BU",
}

# Kesimpulan (BX) & Catatan (BY) — khusus BA Pemeriksaan Trafo.
FIELD_COL_LETTERS_PEMERIKSAAN = {
    "kesimpulan": "BX",
    "catatan": "BY",
}

# Field yang ditulis Apps Script ke kolom huruf TETAP di Rekap Gardu.
# Dibaca langsung by huruf (bukan by nama header) supaya nilai tetap masuk PDF
# walau teks header di sheet berbeda dari alias. Sinkron dgn simpanBeritaAcaraGardu().
FIELD_COL_LETTERS = {
    "tanggalPekerjaan": "D",
    "kapasitas": "F",
    "merk": "G",
    "nomorSeri": "H",
    "tahun": "I",
    "konstruksi": "J",
    "alamat": "K",
    "penyulang": "L",
    "section": "M",
    "jurusan": "S",
    "kepemilikan": "T",
    "ownerId": "U",
    "externalRef": "V",
    "perluasan": "W",
    "vendor": "X",
    "phbSeri": "Y",
    "phbMerk": "Z",
    "phbTahun": "AA",
    "petugas1": "BZ",
    "jabatan1": "CA",
    "petugas2": "CB",
    "jabatan2": "CC",
}


# =========================================================
# HELPERS
# =========================================================
def _safe(value):
    return "" if value is None else str(value).strip()


def _kva(value):
    # Tambah satuan "kVA" pada nilai kapasitas. Kosong -> tetap kosong (biar
    # tampil "-"); bila sudah ada "kVA" -> tidak digandakan.
    text = _safe(value)
    if not text:
        return ""
    if "kva" in text.lower():
        return text
    return text + " kVA"


def _kms(value):
    # Tambah satuan "kms" pada nilai Perluasan SUTM. Kosong -> tetap kosong
    # (biar tampil "-"); bila sudah ada "kms" -> tidak digandakan.
    text = _safe(value)
    if not text:
        return ""
    if "kms" in text.lower():
        return text
    return text + " kms"


def _norm(value):
    return re.sub(r"[^a-z0-9]", "", _safe(value).lower())


def _col_to_index(letter):
    result = 0
    for char in letter.upper():
        result = result * 26 + (ord(char) - ord("A") + 1)
    return result - 1


def _cell(row, index):
    return row[index] if 0 <= index < len(row) else ""


def _require_secret(req, body):
    token = req.args.get("secret") or (body or {}).get("secret") or ""
    if PDF_SECRET and token != PDF_SECRET:
        return False
    return True


def _hari_id(date_obj):
    hari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    return hari[date_obj.weekday()]


def _parse_date(value):
    """Parse tanggal dari berbagai format sheet:
    ISO (2026-07-14), DD/MM/YYYY, DD-MM-YYYY, atau "14 Juli 2026"
    (hasil FORMATTED_VALUE lokal Indonesia). Return datetime.date atau None.
    """
    text = _safe(value)
    if not text:
        return None
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if m:
        try:
            return datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    m = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})", text)
    if m:
        try:
            return datetime.date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            return None
    m = re.match(r"^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", text)
    if m:
        bulan_lower = [b.lower() for b in BULAN_ID]
        nama = m.group(2).lower()
        if nama in bulan_lower:
            try:
                return datetime.date(int(m.group(3)), bulan_lower.index(nama) + 1, int(m.group(1)))
            except ValueError:
                return None
    return None


def _tanggal_id(value):
    obj = _parse_date(value)
    if not obj:
        return _safe(value)
    return _hari_id(obj) + ", " + ("%02d %s %d" % (obj.day, BULAN_ID[obj.month - 1], obj.year))


def _tanggal_panjang(value):
    obj = _parse_date(value)
    if not obj:
        return _safe(value)
    return "%d %s %d" % (obj.day, BULAN_ID[obj.month - 1], obj.year)


def _terbilang(n):
    try:
        n = int(n)
    except (TypeError, ValueError):
        return ""
    satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam",
              "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"]
    if n < 0:
        return "Minus " + _terbilang(-n)
    if n < 12:
        return satuan[n]
    if n < 20:
        return _terbilang(n - 10) + " Belas"
    if n < 100:
        return _terbilang(n // 10) + " Puluh" + ((" " + _terbilang(n % 10)) if n % 10 else "")
    if n < 200:
        return "Seratus" + ((" " + _terbilang(n - 100)) if n > 100 else "")
    if n < 1000:
        return _terbilang(n // 100) + " Ratus" + ((" " + _terbilang(n % 100)) if n % 100 else "")
    if n < 2000:
        return "Seribu" + ((" " + _terbilang(n - 1000)) if n > 1000 else "")
    if n < 1000000:
        return _terbilang(n // 1000) + " Ribu" + ((" " + _terbilang(n % 1000)) if n % 1000 else "")
    if n < 1000000000:
        return _terbilang(n // 1000000) + " Juta" + ((" " + _terbilang(n % 1000000)) if n % 1000000 else "")
    return str(n)


def _kalimat_pembuka(value):
    obj = _parse_date(value)
    if not obj:
        return "Pada hari ini, " + _safe(value) + ", Kami yang bertugas dibawah ini :"
    return (
        "Pada hari ini, " + _hari_id(obj) + " Tanggal " + _terbilang(obj.day)
        + " Bulan " + BULAN_ID[obj.month - 1] + " Tahun " + _terbilang(obj.year)
        + " (%02d - %02d - %04d)" % (obj.day, obj.month, obj.year)
        + ", Kami yang bertugas dibawah ini :"
    )


def _draw_defs(pdf, x, y, col_w, pairs, line_h=13, size=8.5):
    # Lebar kolom label = label TERPANJANG + 1 "tab" (20pt) supaya tanda ":"
    # tidak tertimpa label panjang (mis. "Nomor Seri PHB-TR"). Dibatasi maks 60%
    # col_w agar kolom nilai tetap cukup lebar.
    _pad_tab = 20
    _max_label = max(
        (stringWidth(_safe(_l), FONT_BOLD, size) for _l, _v in pairs),
        default=0,
    )
    label_w = min(_max_label + _pad_tab, col_w * 0.6)
    for label, value in pairs:
        pdf.setFont(FONT_BOLD, size)
        pdf.drawString(x, y - line_h + 4, _safe(label))
        pdf.setFont(FONT_REG, size)
        pdf.drawString(x + label_w - 8, y - line_h + 4, ":")
        text = _safe(value) or "-"
        lines = _wrap(text, FONT_REG, size, col_w - label_w)
        pdf.drawString(x + label_w, y - line_h + 4, lines[0])
        y -= line_h
        for extra in lines[1:]:
            pdf.drawString(x + label_w, y - line_h + 4, extra)
            y -= line_h
    return y


# =========================================================
# GOOGLE SERVICE ACCOUNT
# =========================================================
def _credentials(scopes):
    if GOOGLE_SERVICE_ACCOUNT_JSON_B64:
        raw = base64.b64decode(GOOGLE_SERVICE_ACCOUNT_JSON_B64).decode("utf-8")
        return service_account.Credentials.from_service_account_info(
            json.loads(raw), scopes=scopes
        )
    credentials, _ = google.auth.default(scopes=scopes)
    return credentials


def _sheets_service():
    return build(
        "sheets", "v4",
        credentials=_credentials(
            ["https://www.googleapis.com/auth/spreadsheets.readonly"]
        ),
        cache_discovery=False,
    )


def _drive_service():
    return build(
        "drive", "v3",
        credentials=_credentials(["https://www.googleapis.com/auth/drive"]),
        cache_discovery=False,
    )


def _ensure_folder(service, parent_id, name):
    """Cari subfolder `name` di dalam parent_id; buat bila belum ada."""
    safe_name = _safe(name).replace("'", "\\'")
    query = (
        "mimeType='application/vnd.google-apps.folder' and trashed=false "
        "and name='" + safe_name + "' and '" + parent_id + "' in parents"
    )
    found = (
        service.files()
        .list(
            q=query, spaces="drive", fields="files(id, name)",
            includeItemsFromAllDrives=True, supportsAllDrives=True,
            corpora="allDrives",
        )
        .execute()
    )
    files = found.get("files", [])
    if files:
        return files[0]["id"]
    created = (
        service.files()
        .create(
            body={
                "name": _safe(name),
                "mimeType": "application/vnd.google-apps.folder",
                "parents": [parent_id],
            },
            fields="id", supportsAllDrives=True,
        )
        .execute()
    )
    return created["id"]


def _resolve_output_folder(service, data):
    """Path: Berita Acara / Gardu / <Jenis> / YYYY / NN. MMMM / <Nomor Gardu>."""
    if not BA_ROOT_FOLDER_ID:
        raise RuntimeError("BA_ROOT_FOLDER_ID belum diset.")

    jenis = _safe(data.get("jenisPekerjaan")) or "Lainnya"
    nomor_gardu = _safe(data.get("nomorTrafo")) or "Tanpa Nomor"

    match = re.match(r"^(\d{4})-(\d{2})", _safe(data.get("tanggalBA")))
    if match:
        year = match.group(1)
        month = int(match.group(2))
    else:
        now = datetime.datetime.now(TZ)
        year = "%04d" % now.year
        month = now.month
    bulan_folder = "%02d. %s" % (month, BULAN_ID[month - 1])

    segments = [
        "Berita Acara", "Gardu", jenis, year, bulan_folder, nomor_gardu,
    ]
    parent = BA_ROOT_FOLDER_ID
    for segment in segments:
        parent = _ensure_folder(service, parent, segment)
    return parent


def _build_header_map(row):
    header_map = {}
    for index, name in enumerate(row):
        key = _norm(name)
        if key and key not in header_map:
            header_map[key] = index
    return header_map


def _header_has(header_map, aliases):
    for alias in aliases:
        if _norm(alias) in header_map:
            return True
    return False


def _find_ba_header(values, max_scan=40):
    """Cari baris header Rekap Gardu (bukan values[0]).
    Sheet nyata: baris 1-5 filter/judul; header idBA/NO BA Full di baris ~7-8.
    """
    if not values:
        raise RuntimeError("Sheet Rekap Gardu kosong.")
    limit = min(len(values), max_scan)
    ba_aliases = ["idBA", "ID BA", "Id BA", "Nomor BA", "No BA", "NO BA Full"]
    best = None

    for r in range(limit):
        header_map = _build_header_map(values[r])
        if not header_map:
            continue
        score = 0
        if _header_has(header_map, ["Tanggal BA", "Tanggal", "Tanggal Pekerjaan", "Tgl"]):
            score += 2
        if _header_has(header_map, ["Penyulang"]):
            score += 2
        if _header_has(
            header_map,
            ["Nomor Trafo", "Nama Peralatan", "Nomor Gardu", "Nama Gardu", "Gardu"],
        ):
            score += 2
        if _header_has(header_map, ba_aliases):
            score += 6
        if score >= 6:
            return r, header_map, values[r]
        if best is None or score > best[0]:
            best = (score, r, header_map, values[r])

    for r in range(limit):
        header_map = _build_header_map(values[r])
        if _header_has(header_map, ba_aliases):
            return r, header_map, values[r]

    if best and best[0] >= 4:
        return best[1], best[2], best[3]

    raise RuntimeError(
        "Header Rekap Gardu tidak dikenali (kolom idBA / Nomor BA tidak ditemukan)."
    )


def _read_ba_row(nomor_ba):
    """Ambil satu baris BA dari Rekap Gardu berdasarkan idBA (kolom CI)."""
    result = (
        _sheets_service()
        .spreadsheets()
        .values()
        .get(
            spreadsheetId=SPREADSHEET_ID,
            range=SHEET_BA,
            valueRenderOption="FORMATTED_VALUE",
        )
        .execute()
    )
    values = result.get("values", [])
    if not values:
        raise RuntimeError("Sheet Rekap Gardu kosong.")

    header_row, header_map, _headers = _find_ba_header(values)

    def pick(aliases):
        for alias in aliases:
            index = header_map.get(_norm(alias))
            if index is not None:
                return index
        return -1

    idx_nomor = pick(FIELD_ALIASES["nomorBA"])
    if idx_nomor < 0:
        raise RuntimeError(
            "Kolom idBA / Nomor BA tidak ditemukan di Rekap Gardu."
        )

    target = _norm(nomor_ba)
    target_raw = _safe(nomor_ba).lower()
    match_row = None
    for row in values[header_row + 1:]:
        cell = _safe(_cell(row, idx_nomor))
        if not cell:
            continue
        if _norm(cell) == target or cell.lower() == target_raw:
            match_row = row
            break
    if match_row is None:
        raise RuntimeError("idBA '%s' tidak ditemukan di Rekap Gardu." % nomor_ba)

    data = {}
    for field, aliases in FIELD_ALIASES.items():
        data[field] = _safe(_cell(match_row, pick(aliases)))
    # Override: field yang ditulis Apps Script ke kolom huruf TETAP -> baca by huruf.
    for field, letter in FIELD_COL_LETTERS.items():
        data[field] = _safe(_cell(match_row, _col_to_index(letter)))
    # Koordinat = gabungan kolom Q (Lat) + R (Long).
    lat = _safe(_cell(match_row, _col_to_index("Q")))
    lon = _safe(_cell(match_row, _col_to_index("R")))
    if lat and lon:
        data["koordinat"] = lat + ", " + lon
    elif lat or lon:
        data["koordinat"] = lat or lon
    for slot, letter in PHOTO_COL_LETTERS.items():
        data[slot] = _safe(_cell(match_row, _col_to_index(letter)))
    # Data trafo sesudah + foto lampiran khusus Penggantian Trafo (harmless bagi
    # jenis lain: hanya menambah field yang tidak terpakai).
    for field, letter in FIELD_COL_LETTERS_SESUDAH.items():
        data[field] = _safe(_cell(match_row, _col_to_index(letter)))
    for field, letter in FIELD_COL_LETTERS_PHB_SESUDAH.items():
        data[field] = _safe(_cell(match_row, _col_to_index(letter)))
    for slot, letter in PHOTO_COL_LETTERS_PENGGANTIAN.items():
        data[slot] = _safe(_cell(match_row, _col_to_index(letter)))
    # Foto megger + kesimpulan/catatan khusus BA Pemeriksaan Trafo (harmless
    # bagi jenis lain: hanya menambah field yang tidak terpakai).
    for slot, letter in PHOTO_COL_LETTERS_PEMERIKSAAN.items():
        data[slot] = _safe(_cell(match_row, _col_to_index(letter)))
    for field, letter in FIELD_COL_LETTERS_PEMERIKSAAN.items():
        data[field] = _safe(_cell(match_row, _col_to_index(letter)))
    if not data.get("nomorBA"):
        data["nomorBA"] = _safe(_cell(match_row, idx_nomor))
    return data


# =========================================================
# IMAGE
# =========================================================
def _extract_drive_id(url):
    text = unquote(_safe(url))
    for pattern in (r"[?&]id=([-\w]{20,})", r"/d/([-\w]{20,})", r"([-\w]{25,})"):
        match = re.search(pattern, text)
        if match:
            return match.group(1)
    return ""


def _download_image(url, max_px=1400):
    source = _safe(url).replace("&amp;", "&")
    if not source:
        return None

    file_id = _extract_drive_id(source)

    # 1) UTAMAKAN Drive API (service account). Foto BA disimpan di Shared Drive
    #    yang TIDAK publik, jadi requests biasa ke URL thumbnail/usercontent akan
    #    gagal (dapat halaman login, bukan gambar) -> "(Foto tidak tersedia)".
    content = None
    if file_id:
        try:
            req = _drive_service().files().get_media(
                fileId=file_id, supportsAllDrives=True
            )
            buf = io.BytesIO()
            downloader = MediaIoBaseDownload(buf, req)
            done = False
            while not done:
                _progress, done = downloader.next_chunk()
            content = buf.getvalue()
        except Exception:
            content = None

    # 2) FALLBACK: unduh via URL publik (untuk file yang memang dishare publik).
    if not content:
        candidates = []
        if file_id:
            candidates.append(
                "https://drive.google.com/thumbnail?id=" + file_id + "&sz=w" + str(max_px)
            )
            candidates.append(
                "https://drive.usercontent.google.com/download?id="
                + file_id + "&export=download"
            )
        else:
            candidates.append(source)
        headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
            "Accept": "image/jpeg,image/png,*/*;q=0.8",
        }
        for candidate in candidates:
            try:
                response = requests.get(
                    candidate, headers=headers, timeout=(4, 12), allow_redirects=True
                )
                if response.ok and response.content:
                    content = response.content
                    break
            except Exception:
                continue

    if not content:
        return None

    try:
        image = Image.open(io.BytesIO(content)).convert("RGB")
        image.thumbnail((max_px, max_px), Image.Resampling.LANCZOS)
        out = io.BytesIO()
        image.save(out, format="JPEG", quality=72, optimize=True)
        out.seek(0)
        return ImageReader(out)
    except Exception:
        return None


# =========================================================
# PDF PRIMITIVES
# =========================================================
def _draw_logo(pdf, x, y, height):
    if not os.path.exists(LOGO_PLN_PATH):
        return 0
    try:
        image = Image.open(LOGO_PLN_PATH)
        width = height * (image.size[0] / image.size[1])
        pdf.drawImage(LOGO_PLN_PATH, x, y, width=width, height=height, mask="auto")
        return width
    except Exception:
        return 0


def _wrap(text, font, size, width):
    words = _safe(text).split()
    if not words:
        return [""]
    lines, current = [], ""
    for word in words:
        candidate = (current + " " + word).strip()
        if stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _draw_kop(pdf, top_y, judul, sub):
    left = MARGIN_LEFT
    right = PAGE_W - MARGIN_RIGHT
    logo_w = _draw_logo(pdf, left, top_y - 42, 42)
    pdf.setFont(FONT_BOLD, 12)
    pdf.drawString(left + logo_w + 10, top_y - 14, "PT. PLN (Persero)")
    pdf.setFont(FONT_REG, 9)
    pdf.drawString(left + logo_w + 10, top_y - 27, "UIW Bangka Belitung")
    pdf.drawString(left + logo_w + 10, top_y - 38, "UP3 Bangka ULP Toboali")
    y = top_y - 50
    pdf.setLineWidth(1.4)
    pdf.line(left, y, right, y)
    pdf.setLineWidth(0.5)
    pdf.line(left, y - 2.5, right, y - 2.5)
    y -= 22
    pdf.setFont(FONT_BOLD, 13)
    pdf.drawCentredString(PAGE_W / 2, y, judul)
    _jw = stringWidth(judul, FONT_BOLD, 13)
    pdf.setLineWidth(0.8)
    pdf.line(PAGE_W / 2 - _jw / 2, y - 2, PAGE_W / 2 + _jw / 2, y - 2)
    if sub:
        y -= 14
        pdf.setFont(FONT_REG, 10)
        pdf.drawCentredString(PAGE_W / 2, y, sub)
    return y - 16


def _draw_section(pdf, x, y, width, title):
    pdf.setFillColor(BLUE)
    pdf.rect(x, y - 16, width, 16, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#FFFFFF"))
    pdf.setFont(FONT_BOLD, 9.5)
    pdf.drawString(x + 6, y - 11.5, title)
    pdf.setFillColor(black)
    return y - 16


def _draw_rows(pdf, x, y, width, pairs, line_h=15):
    label_w = width * 0.36
    for label, value in pairs:
        pdf.setStrokeColor(HexColor("#CCCCCC"))
        pdf.setLineWidth(0.4)
        pdf.rect(x, y - line_h, label_w, line_h, stroke=1, fill=0)
        pdf.rect(x + label_w, y - line_h, width - label_w, line_h, stroke=1, fill=0)
        pdf.setFont(FONT_BOLD, 8.5)
        pdf.setFillColor(black)
        pdf.drawString(x + 5, y - line_h + 4.5, _safe(label))
        pdf.setFont(FONT_REG, 8.5)
        text = _safe(value) or "-"
        fit = _wrap(text, FONT_REG, 8.5, width - label_w - 10)[:1][0]
        pdf.drawString(x + label_w + 5, y - line_h + 4.5, fit)
        y -= line_h
    return y


def _draw_signatures(pdf, x, y, width, data):
    col = width / 2
    left_cx = x + col / 2
    right_x = x + col
    # Tanpa nama hari di area tanda tangan (mis. "Toboali, 15 Juli 2026").
    tanggal = _tanggal_panjang(data.get("tanggalBA"))

    # Struktur mengikuti sheet:
    #  - Kolom kanan ("kolom I"): Toboali, Pemeriksa, nama & jabatan petugas
    #    rata kiri di satu kolom; nomor urut ("kolom H") sedikit lebih ke kiri.
    #  - Kolom kiri ("kolom B"): Mengetahui, jabatan, dan nama manager.
    num_x = right_x + 32          # kolom H -> nomor urut "1." / "2." (digeser +20 ke kanan)
    name_x = right_x + 48         # kolom I -> Toboali/Pemeriksa/nama/jabatan (digeser +20 ke kanan)

    # Baris tanda tangan (titik-titik) di kanan ("kolom L-M").
    # Offset dikurangi 20 (140 -> 120) supaya titik-titik TETAP di posisi semula
    # meski kolom teks digeser +20, sehingga teks lebih dekat ke titik-titik.
    right_edge = x + width
    sign_x = name_x + 120
    sign_w = (right_edge - sign_x) if (right_edge - sign_x) > 50 else 50
    garis_titik = "."
    while stringWidth(garis_titik + ".", FONT_REG, 9) < sign_w:
        garis_titik += "."

    # Baris (mengikuti struktur sheet).
    head_y = y                    # Toboali, <tanggal>
    sub_y = y - 14                # Mengetahui | Pemeriksa,
    row_h = 48                    # jarak Petugas 1 -> Petugas 2 (+1 enter)
    p1_y = sub_y - 20             # Petugas 1 (nama) | Manager ULP Toboali
    p2_y = p1_y - row_h           # Petugas 2 (nama)

    # Kolom kanan (Pemeriksa) rata kiri di name_x.
    pdf.setFont(FONT_REG, 9)
    pdf.drawString(name_x, head_y, "Toboali, " + (tanggal or ""))
    pdf.drawString(name_x, sub_y, "Pemeriksa,")

    def pemeriksa(base_y, no, nama, jabatan):
        pdf.setFont(FONT_REG, 9)
        pdf.drawString(num_x, base_y, str(no) + ".")
        nama_txt = _safe(nama) or "-"
        pdf.drawString(name_x, base_y, nama_txt)
        nw = stringWidth(nama_txt, FONT_REG, 9)
        pdf.setLineWidth(0.4)
        pdf.line(name_x, base_y - 2, name_x + nw, base_y - 2)
        pdf.setFont(FONT_REG, 8)
        pdf.drawString(name_x, base_y - 11, _safe(jabatan))
        pdf.setFont(FONT_REG, 9)
        pdf.drawString(sign_x, base_y, garis_titik)

    pemeriksa(p1_y, 1, data.get("petugas1"), data.get("jabatan1") or "Petugas 1")
    pemeriksa(p2_y, 2, data.get("petugas2"), data.get("jabatan2") or "Petugas 2")

    # Kolom kiri (Mengetahui): "Manager ULP Toboali" & nama manager TETAP rata kiri
    # (sejajar DATA TRAFO, x + 20); hanya kata "Mengetahui" yang dibuat CENTER
    # di atas teks jabatan manager (seperti contoh gambar 2).
    mgr_x = x + 20
    jabatan_m = _safe(data.get("jabatanMengetahui")) or "Manager ULP Toboali"
    nama_m = _safe(data.get("mengetahui")) or "(...................)"
    mgr_cx = mgr_x + stringWidth(jabatan_m, FONT_REG, 9) / 2  # titik tengah "Mengetahui"
    pdf.setFont(FONT_REG, 9)
    pdf.drawCentredString(mgr_cx, sub_y, "Mengetahui")
    pdf.drawString(mgr_x, p1_y, jabatan_m)
    # Nama manager sejajar dengan jabatan Petugas 2 (baris paling bawah).
    m_y = p2_y - 11
    pdf.setFont(FONT_BOLD, 9)
    pdf.drawString(mgr_x, m_y, nama_m)
    mw = stringWidth(nama_m, FONT_BOLD, 9)
    pdf.setLineWidth(0.4)
    pdf.line(mgr_x, m_y - 2, mgr_x + mw, m_y - 2)


# =========================================================
# PAGE 1 — DOKUMEN BA
# =========================================================
def _build_page1(pdf, data):
    x = MARGIN_LEFT
    width = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT
    nomor_ba_disp = _safe(data.get("nomorBAFull")) or _safe(data.get("nomorBA")) or "-"
    # Hilangkan prefix "No." bila sudah ada di nilai (mis. "No. 001 / BA - TRF ...")
    # supaya tidak tampil ganda "No. No. 001 ...".
    nomor_ba_disp = re.sub(r"^\s*No\.?\s*", "", nomor_ba_disp) or "-"
    y = _draw_kop(
        pdf, PAGE_H - MARGIN_Y,
        "BERITA ACARA PENGOPERASIAN TRAFO",
        "No. " + nomor_ba_disp,
    )

    y -= 4
    pdf.setFont(FONT_REG, 9)
    for line in _wrap(_kalimat_pembuka(data.get("tanggalBA")), FONT_REG, 9, width):
        y -= 12
        pdf.drawString(x, y, line)
    y -= 32  # jarak sebelum blok Nama/Jabatan petugas (dikurangi 1 enter)

    col = width / 2

    def petugas_row(nama, jabatan):
        nonlocal y
        pdf.setFont(FONT_REG, 9)
        pdf.drawString(x + 18, y, "Nama :")
        pdf.drawString(x + col, y, "Jabatan :")
        y -= 16  # jarak antara label "Nama :" dan isi nama (line spacing ditambah)
        pdf.drawString(x + 30, y, _safe(nama) or "-")
        pdf.drawString(x + col + 12, y, _safe(jabatan) or "-")
        y -= 18

    petugas_row(data.get("petugas1"), data.get("jabatan1"))
    petugas_row(data.get("petugas2"), data.get("jabatan2"))
    y -= 2

    pengantar = (
        "Telah melakukan Pengoperasian Trafo " + (_safe(data.get("nomorTrafo")) or "-")
        + ", Pada tanggal " + (_tanggal_panjang(data.get("tanggalPekerjaan")) or "-")
        + " dengan kondisi sebagai berikut :"
    )
    for line in _wrap(pengantar, FONT_REG, 9, width):
        y -= 12
        pdf.drawString(x, y, line)
    y -= 26  # jarak sebelum heading DATA TRAFO / DATA PHB-TR

    gap = 18
    tab = 20  # indent 1 tab -> sejajar dengan teks "Nama :" (x + 18) di blok atas
    col_w = (width - tab - gap) / 2
    left_x = x + tab
    right_x = left_x + col_w + gap
    head_y = y

    pdf.setFont(FONT_BOLD, 10)
    pdf.drawString(left_x, head_y, "DATA TRAFO")
    pdf.drawString(right_x, head_y, "DATA PHB-TR")
    head_y -= 14

    trafo_pairs = [
        ("Nomor Gardu", data.get("nomorTrafo")),
        ("Kapasitas", _kva(data.get("kapasitas"))),
        ("Merk", data.get("merk")),
        ("Nomor Seri", data.get("nomorSeri")),
        ("Tahun", data.get("tahun")),
        ("Konstruksi", data.get("konstruksi")),
        ("Alamat", data.get("alamat")),
        ("Penyulang", data.get("penyulang")),
        ("Section", data.get("section")),
        ("Koordinat", data.get("koordinat")),
        ("Kepemilikan", data.get("kepemilikan")),
        ("OwnerID", data.get("ownerId")),
        ("External Reference", data.get("externalRef")),
        ("Perluasan SUTM", _kms(data.get("perluasan"))),
        ("Vendor Pelaksana", data.get("vendor")),
    ]
    phb_pairs = [
        ("Merk", data.get("phbMerk")),
        ("Nomor Seri", data.get("phbSeri")),
        ("Tahun", data.get("phbTahun")),
        ("Jurusan", data.get("jurusan")),
    ]
    y_left = _draw_defs(pdf, left_x, head_y, col_w, trafo_pairs, line_h=16)
    y_right = _draw_defs(pdf, right_x, head_y, col_w, phb_pairs, line_h=16)
    y = min(y_left, y_right) - 14

    pdf.setFont(FONT_REG, 9)
    for line in _wrap("Demikian berita acara ini kami buat, untuk dapat dipergunakan sebagaimana mestinya.", FONT_REG, 9, width):
        y -= 12
        pdf.drawString(x, y, line)

    _draw_signatures(pdf, x, y - 26, width, data)
    pdf.setFont(FONT_REG, 7)
    pdf.drawRightString(PAGE_W - MARGIN_RIGHT, MARGIN_Y + 4, "Halaman 1 dari 2")
    pdf.showPage()


# =========================================================
# PAGE 2 — LAMPIRAN FOTO 2x2
# =========================================================
def _draw_photo_cell(pdf, x, y, width, height, title, subcaption, image_reader, show_placeholder=True):
    pdf.setFillColor(black)
    pdf.setFont(FONT_BOLD, 10)
    pdf.drawCentredString(x + width / 2, y - 12, title)

    box_top = y - 20
    sub_h = 16 if subcaption else 0
    box_h = height - 20 - sub_h
    pdf.setStrokeColor(black)
    pdf.setLineWidth(0.8)
    pdf.rect(x, box_top - box_h, width, box_h, stroke=1, fill=0)

    inner_x = x + 4
    inner_y = box_top - box_h + 4
    inner_w = width - 8
    inner_h = box_h - 8
    drawn = False
    if image_reader:
        try:
            iw, ih = image_reader.getSize()
            scale = min(inner_w / iw, inner_h / ih)
            dw, dh = iw * scale, ih * scale
            pdf.drawImage(
                image_reader,
                inner_x + (inner_w - dw) / 2,
                inner_y + (inner_h - dh) / 2,
                width=dw, height=dh, preserveAspectRatio=True, mask="auto",
            )
            drawn = True
        except Exception:
            drawn = False
    if not drawn and show_placeholder:
        pdf.setFont(FONT_REG, 9)
        pdf.setFillColor(HexColor("#999999"))
        pdf.drawCentredString(x + width / 2, box_top - box_h / 2, "(Foto tidak tersedia)")
        pdf.setFillColor(black)

    if subcaption:
        pdf.setFont(FONT_BOLD, 9)
        pdf.setFillColor(black)
        pdf.drawCentredString(x + width / 2, box_top - box_h - 12, subcaption)


def _build_page2(pdf, data):
    x = MARGIN_LEFT
    width = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT
    y = _draw_kop(
        pdf, PAGE_H - MARGIN_Y,
        "Lampiran",
        "",
    )

    gap = 16
    grid_top = y - 6
    grid_bottom = MARGIN_Y + 20
    cell_w = (width - gap) / 2
    cell_h = (grid_top - grid_bottom - gap) / 2

    cells = [
        ("Trafo", _safe(data.get("nomorSeri")), data.get("nameplateTrafo")),
        ("Konstruksi Trafo", "", data.get("fotoFullGardu")),
        ("Nameplate PHB-TR", _safe(data.get("phbSeri")), data.get("nameplatePhb")),
        ("PHB-TR", "", data.get("fotoBoxPhb")),
    ]
    images = [_download_image(url) for _, _, url in cells]

    positions = [
        (x, grid_top),
        (x + cell_w + gap, grid_top),
        (x, grid_top - cell_h - gap),
        (x + cell_w + gap, grid_top - cell_h - gap),
    ]
    for (title, sub, _), (cx, cy), image in zip(cells, positions, images):
        _draw_photo_cell(pdf, cx, cy, cell_w, cell_h, title, sub, image)

    pdf.setFont(FONT_REG, 7)
    pdf.drawRightString(PAGE_W - MARGIN_RIGHT, MARGIN_Y + 4, "Halaman 2 dari 2")
    pdf.showPage()


def build_ba_pdf(data):
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(PAGE_W, PAGE_H))
    _build_page1(pdf, data)
    _build_page2(pdf, data)
    pdf.save()
    buffer.seek(0)
    return buffer


# =========================================================
# PENGGANTIAN TRAFO — PAGE 1 (DATA TRAFO SEBELUM / SESUDAH + PHB-TR SEBELUM)
# =========================================================
def _build_page1_penggantian(pdf, data):
    x = MARGIN_LEFT
    width = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT
    nomor_ba_disp = _safe(data.get("nomorBAFull")) or _safe(data.get("nomorBA")) or "-"
    nomor_ba_disp = re.sub(r"^\s*No\.?\s*", "", nomor_ba_disp) or "-"
    y = _draw_kop(
        pdf, PAGE_H - MARGIN_Y,
        "BERITA ACARA PENGGANTIAN TRAFO",
        "No. " + nomor_ba_disp,
    )

    y -= 4
    pdf.setFont(FONT_REG, 9)
    for line in _wrap(_kalimat_pembuka(data.get("tanggalBA")), FONT_REG, 9, width):
        y -= 12
        pdf.drawString(x, y, line)
    y -= 32

    col = width / 2

    def petugas_row(nama, jabatan):
        nonlocal y
        pdf.setFont(FONT_REG, 9)
        pdf.drawString(x + 18, y, "Nama :")
        pdf.drawString(x + col, y, "Jabatan :")
        y -= 16
        pdf.drawString(x + 30, y, _safe(nama) or "-")
        pdf.drawString(x + col + 12, y, _safe(jabatan) or "-")
        y -= 18

    petugas_row(data.get("petugas1"), data.get("jabatan1"))
    petugas_row(data.get("petugas2"), data.get("jabatan2"))
    y -= 2

    pengantar = (
        "Telah melakukan Penggantian Trafo " + (_safe(data.get("nomorTrafo")) or "-")
        + ", Pada tanggal " + (_tanggal_panjang(data.get("tanggalPekerjaan")) or "-")
        + " dengan kondisi sebagai berikut :"
    )
    for line in _wrap(pengantar, FONT_REG, 9, width):
        y -= 12
        pdf.drawString(x, y, line)
    y -= 26

    gap = 18
    tab = 20
    col_w = (width - tab - gap) / 2
    left_x = x + tab
    right_x = left_x + col_w + gap
    head_y = y

    pdf.setFont(FONT_BOLD, 10)
    pdf.drawString(left_x, head_y, "DATA TRAFO SEBELUM")
    pdf.drawString(right_x, head_y, "DATA TRAFO SESUDAH")
    head_y -= 14

    sebelum_pairs = [
        ("Nomor Gardu", data.get("nomorTrafo")),
        ("Kapasitas", _kva(data.get("kapasitas"))),
        ("Merk", data.get("merk")),
        ("Nomor Seri", data.get("nomorSeri")),
        ("Tahun", data.get("tahun")),
        ("Konstruksi", data.get("konstruksi")),
        ("Alamat", data.get("alamat")),
    ]
    sesudah_pairs = [
        ("Nomor Gardu", data.get("nomorTrafo")),
        ("Kapasitas", _kva(data.get("kapasitasSesudah"))),
        ("Merk", data.get("merkSesudah")),
        ("Nomor Seri", data.get("nomorSeriSesudah")),
        ("Tahun", data.get("tahunSesudah")),
        ("Alamat", data.get("alamat")),
        ("Asal Trafo", data.get("asalTrafo")),
    ]
    y_left = _draw_defs(pdf, left_x, head_y, col_w, sebelum_pairs, line_h=16)
    y_right = _draw_defs(pdf, right_x, head_y, col_w, sesudah_pairs, line_h=16)
    # +1 enter (baris kosong) antara Alamat/Asal Trafo dan blok DATA PHB-TR.
    y = min(y_left, y_right) - 34

    pdf.setFont(FONT_BOLD, 10)
    pdf.drawString(left_x, y, "DATA PHB-TR SEBELUM")
    pdf.drawString(right_x, y, "DATA PHB-TR SESUDAH")
    phb_head_y = y - 14
    phb_sebelum_pairs = [
        ("Merk PHB-TR", data.get("phbMerk")),
        ("Nomor Seri PHB-TR", data.get("phbSeri")),
        ("Tahun PHB-TR", data.get("phbTahun")),
        ("Jumlah Jurusan", data.get("jurusan")),
    ]
    phb_sesudah_pairs = [
        ("Merk PHB-TR", data.get("phbMerkSesudah")),
        ("Nomor Seri PHB-TR", data.get("phbSeriSesudah")),
        ("Tahun PHB-TR", data.get("phbTahunSesudah")),
        ("Jumlah Jurusan", data.get("phbJurusanSesudah")),
    ]
    y_phb_left = _draw_defs(pdf, left_x, phb_head_y, col_w, phb_sebelum_pairs, line_h=16)
    y_phb_right = _draw_defs(pdf, right_x, phb_head_y, col_w, phb_sesudah_pairs, line_h=16)
    y = min(y_phb_left, y_phb_right) - 14

    pdf.setFont(FONT_REG, 9)
    for line in _wrap("Demikian berita acara ini kami buat, untuk dapat dipergunakan sebagaimana mestinya.", FONT_REG, 9, width):
        y -= 12
        pdf.drawString(x, y, line)

    _draw_signatures(pdf, x, y - 26, width, data)
    pdf.setFont(FONT_REG, 7)
    pdf.drawRightString(PAGE_W - MARGIN_RIGHT, MARGIN_Y + 4, "Halaman 1 dari 2")
    pdf.showPage()


# =========================================================
# PENGGANTIAN TRAFO — PAGE 2 (LAMPIRAN 6 FOTO: SEBELUM | SESUDAH)
# =========================================================
def _build_page2_penggantian(pdf, data):
    x = MARGIN_LEFT
    width = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT
    y = _draw_kop(pdf, PAGE_H - MARGIN_Y, "Lampiran", "")

    gap = 16
    # Lampiran BA Penggantian Trafo = maksimal 4 foto:
    #   1) Nameplate Trafo Sebelum (kolom N)   -> SELALU tampil
    #   2) Nameplate Trafo Sesudah (kolom AP)  -> SELALU tampil
    #   3) Nameplate PHB-TR Sebelum (kolom AB) -> hanya bila box PHB-TR diganti
    #   4) Nameplate PHB-TR Sesudah (kolom AW) -> hanya bila box PHB-TR diganti
    # Bila box PHB-TR TIDAK diganti, blok PHB-TR (sebelum & sesudah) tidak
    # ditampilkan sama sekali. Foto tanpa link Drive digambar sebagai KOTAK
    # KOSONG tanpa tulisan "(Foto tidak tersedia)".
    def _truthy(v):
        return _safe(v).strip().lower() in ("ya", "yes", "true", "1", "diganti")

    flag_phb = _safe(data.get("phbDiganti"))
    if flag_phb:
        phb_diganti = _truthy(flag_phb)
    else:
        # Kompatibilitas data lama (belum ada kolom status): anggap diganti bila
        # ada link foto Nameplate PHB-TR Sesudah.
        phb_diganti = bool(_safe(data.get("nameplatePhbSesudah")))

    cells = [
        ("Nameplate Trafo Sebelum", _safe(data.get("nomorSeri")), data.get("nameplateTrafoSebelum")),
        ("Nameplate Trafo Sesudah", _safe(data.get("nomorSeriSesudah")), data.get("nameplateTrafoSesudah")),
    ]
    if phb_diganti:
        cells.append(("Nameplate PHB-TR Sebelum", "", data.get("nameplatePhbSebelum")))
        cells.append(("Nameplate PHB-TR Sesudah", "", data.get("nameplatePhbSesudah")))
    images = [_download_image(url) for _, _, url in cells]

    # Jumlah baris menyesuaikan jumlah sel yang benar-benar dibuat (2 kolom/baris).
    rows = max(1, (len(cells) + 1) // 2)
    grid_top = y - 6
    grid_bottom = MARGIN_Y + 20
    cell_w = (width - gap) / 2
    cell_h = (grid_top - grid_bottom - gap * (rows - 1)) / rows

    positions = []
    for r in range(rows):
        cy = grid_top - r * (cell_h + gap)
        positions.append((x, cy))
        positions.append((x + cell_w + gap, cy))
    for (title, sub, _), (cx, cy), image in zip(cells, positions, images):
        _draw_photo_cell(pdf, cx, cy, cell_w, cell_h, title, sub, image, show_placeholder=False)

    pdf.setFont(FONT_REG, 7)
    pdf.drawRightString(PAGE_W - MARGIN_RIGHT, MARGIN_Y + 4, "Halaman 2 dari 2")
    pdf.showPage()


def build_ba_pdf_penggantian(data):
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(PAGE_W, PAGE_H))
    _build_page1_penggantian(pdf, data)
    _build_page2_penggantian(pdf, data)
    pdf.save()
    buffer.seek(0)
    return buffer


def _delete_drive_file_by_id(file_id, keep_id=None):
    """Hapus file Drive berdasarkan File ID (dipakai saat generate ulang).
    Aman: diabaikan bila kosong / sama dengan file baru; error ditelan."""
    fid = _safe(file_id)
    if not fid or fid == _safe(keep_id):
        return
    try:
        _drive_service().files().delete(fileId=fid, supportsAllDrives=True).execute()
    except Exception:
        pass


def _upload_to_drive(buffer, filename, data):
    service = _drive_service()
    folder_id = _resolve_output_folder(service, data)
    media = MediaIoBaseUpload(buffer, mimetype="application/pdf", resumable=False)

    safe_name = filename.replace("'", "\\'")
    existing = (
        service.files()
        .list(
            q="name='" + safe_name + "' and trashed=false and '"
              + folder_id + "' in parents",
            spaces="drive", fields="files(id)",
            includeItemsFromAllDrives=True, supportsAllDrives=True,
            corpora="allDrives",
        )
        .execute()
        .get("files", [])
    )
    for old in existing:
        try:
            service.files().delete(
                fileId=old["id"], supportsAllDrives=True
            ).execute()
        except Exception:
            pass

    metadata = {"name": filename, "parents": [folder_id]}
    created = (
        service.files()
        .create(
            body=metadata, media_body=media,
            fields="id, webViewLink", supportsAllDrives=True,
        )
        .execute()
    )
    return created["id"], created.get("webViewLink", "")


# =========================================================
# ROUTES
# =========================================================
@app.get("/")
def health():
    return "ok"


@app.post("/ba/pengoperasian")
def ba_pengoperasian():
    body = request.get_json(silent=True) or {}
    if not _require_secret(request, body):
        return jsonify({"ok": False, "message": "Secret tidak valid."}), 403

    nomor_ba = _safe(body.get("idBA") or body.get("nomorBA"))
    if not nomor_ba:
        return jsonify({"ok": False, "message": "idBA wajib diisi."}), 400

    try:
        data = _read_ba_row(nomor_ba)
        pdf_buffer = build_ba_pdf(data)
        safe_name = re.sub(r'[\\/:*?"<>|]', "-", nomor_ba)
        filename = "BA-Pengoperasian-" + safe_name + ".pdf"
        file_id, url = _upload_to_drive(pdf_buffer, filename, data)
        # Generate ulang: hapus PDF lama by File ID (nama/folder bisa berubah).
        _delete_drive_file_by_id(body.get("oldFileId"), keep_id=file_id)
        return jsonify({
            "ok": True,
            "fileId": file_id,
            "url": url,
            "fileName": filename,
            "selesai": datetime.datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S"),
        })
    except Exception as error:
        return jsonify({"ok": False, "message": str(error)}), 500


@app.post("/ba/penggantian")
def ba_penggantian():
    body = request.get_json(silent=True) or {}
    if not _require_secret(request, body):
        return jsonify({"ok": False, "message": "Secret tidak valid."}), 403

    nomor_ba = _safe(body.get("idBA") or body.get("nomorBA"))
    if not nomor_ba:
        return jsonify({"ok": False, "message": "idBA wajib diisi."}), 400

    try:
        data = _read_ba_row(nomor_ba)
        pdf_buffer = build_ba_pdf_penggantian(data)
        safe_name = re.sub(r'[\\/:*?"<>|]', "-", nomor_ba)
        filename = "BA-Penggantian-" + safe_name + ".pdf"
        file_id, url = _upload_to_drive(pdf_buffer, filename, data)
        # Generate ulang: hapus PDF lama by File ID (nama/folder bisa berubah).
        _delete_drive_file_by_id(body.get("oldFileId"), keep_id=file_id)
        return jsonify({
            "ok": True,
            "fileId": file_id,
            "url": url,
            "fileName": filename,
            "selesai": datetime.datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S"),
        })
    except Exception as error:
        return jsonify({"ok": False, "message": str(error)}), 500


# =========================================================
# PEMERIKSAAN TRAFO — PAGE 1 (DATA TRAFO + PHB-TR + KESIMPULAN)
# =========================================================
def _pemeriksaan_foto_cells(data):
    """Daftar foto megger yang BENAR-BENAR terisi (maks 6).
    1 link -> 1 kotak, 2 link -> 2 kotak, dst."""
    cells = []
    for i in range(1, 7):
        url = _safe(data.get("megger%d" % i))
        if url:
            cells.append(("Lampiran %d" % (len(cells) + 1), "", url))
    return cells


def _build_page1_pemeriksaan(pdf, data, total_pages=2):
    x = MARGIN_LEFT
    width = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT
    nomor_ba_disp = _safe(data.get("nomorBAFull")) or _safe(data.get("nomorBA")) or "-"
    nomor_ba_disp = re.sub(r"^\s*No\.?\s*", "", nomor_ba_disp) or "-"
    y = _draw_kop(
        pdf, PAGE_H - MARGIN_Y,
        "BERITA ACARA PEMERIKSAAN TRAFO",
        "No. " + nomor_ba_disp,
    )

    y -= 4
    pdf.setFont(FONT_REG, 9)
    for line in _wrap(_kalimat_pembuka(data.get("tanggalBA")), FONT_REG, 9, width):
        y -= 12
        pdf.drawString(x, y, line)
    y -= 32

    col = width / 2

    def petugas_row(nama, jabatan):
        nonlocal y
        pdf.setFont(FONT_REG, 9)
        pdf.drawString(x + 18, y, "Nama :")
        pdf.drawString(x + col, y, "Jabatan :")
        y -= 16
        pdf.drawString(x + 30, y, _safe(nama) or "-")
        pdf.drawString(x + col + 12, y, _safe(jabatan) or "-")
        y -= 18

    petugas_row(data.get("petugas1"), data.get("jabatan1"))
    petugas_row(data.get("petugas2"), data.get("jabatan2"))
    y -= 2

    pengantar = (
        "Telah melakukan Pemeriksaan Trafo " + (_safe(data.get("nomorTrafo")) or "-")
        + ", Pada tanggal " + (_tanggal_panjang(data.get("tanggalPekerjaan")) or "-")
        + " dengan kondisi sebagai berikut :"
    )
    for line in _wrap(pengantar, FONT_REG, 9, width):
        y -= 12
        pdf.drawString(x, y, line)
    y -= 26

    gap = 18
    tab = 20
    col_w = (width - tab - gap) / 2
    left_x = x + tab
    right_x = left_x + col_w + gap
    head_y = y

    pdf.setFont(FONT_BOLD, 10)
    pdf.drawString(left_x, head_y, "DATA TRAFO")
    pdf.drawString(right_x, head_y, "DATA PHB-TR")
    head_y -= 14

    trafo_pairs = [
        ("Nomor Gardu", data.get("nomorTrafo")),
        ("Kapasitas", _kva(data.get("kapasitas"))),
        ("Merk", data.get("merk")),
        ("Nomor Seri", data.get("nomorSeri")),
        ("Tahun", data.get("tahun")),
        ("Konstruksi", data.get("konstruksi")),
        ("Penyulang", data.get("penyulang")),
        ("Section", data.get("section")),
        ("Alamat", data.get("alamat")),
    ]
    phb_pairs = [
        ("Merk PHB-TR", data.get("phbMerk")),
        ("Nomor Seri PHB-TR", data.get("phbSeri")),
        ("Tahun PHB-TR", data.get("phbTahun")),
        ("Jumlah Jurusan", data.get("jurusan")),
        ("Koordinat", data.get("koordinat")),
    ]
    y_left = _draw_defs(pdf, left_x, head_y, col_w, trafo_pairs, line_h=16)
    y_right = _draw_defs(pdf, right_x, head_y, col_w, phb_pairs, line_h=16)
    y = min(y_left, y_right) - 20

    # KESIMPULAN & CATATAN (teks bebas, dibungkus otomatis).
    kesimpulan = _safe(data.get("kesimpulan"))
    catatan = _safe(data.get("catatan"))
    # Sejajar margin kiri dengan paragraf "Telah melakukan..." dan "Demikian..."
    if kesimpulan:
        pdf.setFont(FONT_BOLD, 10)
        pdf.drawString(x, y, "KESIMPULAN")
        y -= 14
        pdf.setFont(FONT_REG, 9)
        for line in _wrap(kesimpulan, FONT_REG, 9, width):
            pdf.drawString(x, y, line)
            y -= 13
        y -= 8
    if catatan:
        pdf.setFont(FONT_BOLD, 10)
        pdf.drawString(x, y, "CATATAN")
        y -= 14
        pdf.setFont(FONT_REG, 9)
        for line in _wrap(catatan, FONT_REG, 9, width):
            pdf.drawString(x, y, line)
            y -= 13
        y -= 8

    pdf.setFont(FONT_REG, 9)
    for line in _wrap("Demikian berita acara ini kami buat, untuk dapat dipergunakan sebagaimana mestinya.", FONT_REG, 9, width):
        y -= 12
        pdf.drawString(x, y, line)

    _draw_signatures(pdf, x, y - 26, width, data)
    pdf.setFont(FONT_REG, 7)
    pdf.drawRightString(PAGE_W - MARGIN_RIGHT, MARGIN_Y + 4, "Halaman 1 dari %d" % total_pages)
    pdf.showPage()


# =========================================================
# PEMERIKSAAN TRAFO — PAGE 2 (LAMPIRAN FOTO MEGGER 1..6)
# =========================================================
def _build_page2_pemeriksaan(pdf, data, total_pages=2):
    cells = _pemeriksaan_foto_cells(data)
    if not cells:
        return
    x = MARGIN_LEFT
    width = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT
    y = _draw_kop(pdf, PAGE_H - MARGIN_Y, "Lampiran", "")

    gap = 16
    cols = 1 if len(cells) == 1 else 2
    rows = (len(cells) + cols - 1) // cols
    grid_top = y - 6
    grid_bottom = MARGIN_Y + 20
    cell_w = (width - gap * (cols - 1)) / cols
    cell_h = (grid_top - grid_bottom - gap * (rows - 1)) / rows

    images = [_download_image(url) for _, _, url in cells]
    positions = []
    for r in range(rows):
        cy = grid_top - r * (cell_h + gap)
        for c in range(cols):
            positions.append((x + c * (cell_w + gap), cy))
    for (title, sub, _), (cx, cy), image in zip(cells, positions, images):
        _draw_photo_cell(pdf, cx, cy, cell_w, cell_h, title, sub, image, show_placeholder=False)

    pdf.setFont(FONT_REG, 7)
    pdf.drawRightString(PAGE_W - MARGIN_RIGHT, MARGIN_Y + 4, "Halaman 2 dari %d" % total_pages)
    pdf.showPage()


def build_ba_pdf_pemeriksaan(data):
    # Tanpa foto megger -> PDF 1 halaman saja.
    total_pages = 2 if _pemeriksaan_foto_cells(data) else 1
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(PAGE_W, PAGE_H))
    _build_page1_pemeriksaan(pdf, data, total_pages)
    _build_page2_pemeriksaan(pdf, data, total_pages)
    pdf.save()
    buffer.seek(0)
    return buffer


@app.post("/ba/pemeriksaan-trafo")
def ba_pemeriksaan_trafo():
    body = request.get_json(silent=True) or {}
    if not _require_secret(request, body):
        return jsonify({"ok": False, "message": "Secret tidak valid."}), 403

    nomor_ba = _safe(body.get("idBA") or body.get("nomorBA"))
    if not nomor_ba:
        return jsonify({"ok": False, "message": "idBA wajib diisi."}), 400

    try:
        data = _read_ba_row(nomor_ba)
        pdf_buffer = build_ba_pdf_pemeriksaan(data)
        safe_name = re.sub(r'[\\/:*?"<>|]', "-", nomor_ba)
        filename = "BA-Pemeriksaan-" + safe_name + ".pdf"
        file_id, url = _upload_to_drive(pdf_buffer, filename, data)
        _delete_drive_file_by_id(body.get("oldFileId"), keep_id=file_id)
        return jsonify({
            "ok": True,
            "fileId": file_id,
            "url": url,
            "fileName": filename,
            "selesai": datetime.datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S"),
        })
    except Exception as error:
        return jsonify({"ok": False, "message": str(error)}), 500


# =========================================================
# ==============  BA SWITCHING (Rekap Switching)  =========
# =========================================================
# Modul PDF Berita Acara Switching. Sumber: sheet "Rekap Switching"
# (header baris 1, idBA kolom AG). Reuse helper & primitive PDF di atas.
SHEET_SWITCHING = os.environ.get("SHEET_SWITCHING", "Rekap Switching")

# Kolom huruf TETAP Rekap Switching (sinkron SW_COL di Apps Script).
SW_FIELD_COL_LETTERS = {
    "tanggalBA": "B",
    "tanggalPekerjaan": "C",
    "jenisPekerjaan": "D",
    "jenisSwitching": "E",
    "namaSwitching": "F",
    "penyulang": "G",
    "section": "H",
    "merk": "I",
    "tipe": "J",
    "nomorSeri": "K",
    "koordinat": "L",
    "sldSebelum": "O",
    "sldSesudah": "P",
    "jenisSwitchingSesudah": "Q",
    "namaSwitchingSesudah": "R",
    "penyulangSesudah": "S",
    "sectionSesudah": "T",
    "merkSesudah": "U",
    "tipeSesudah": "V",
    "nomorSeriSesudah": "W",
    "koordinatSesudah": "X",
    "asalSwitching": "Y",
    "keteranganTambahan": "AB",
    "keteranganKerusakan": "AC",
    "petugas1": "AD",
    "jabatan1": "AE",
    "petugas2": "AF",
    "jabatan2": "AG",
    "mengetahui": "AH",
    "nomorBA": "AI",
    "nomorBAFull": "AJ",
    "filePdfUrl": "AK",
    "fileId": "AL",
    "statusPdf": "AM",
    "waktuSelesai": "AN",
    "linkBaTtd": "AO",
}

# Foto Switching — kolom huruf tetap (SW_PHOTO_COLUMN di Apps Script).
SW_PHOTO_COL_LETTERS = {
    "nameplateAwal": "M",
    "konstruksiAwal": "N",
    "sldSebelum": "O",
    "sldSesudah": "P",
    "nameplateSesudah": "Z",
    "konstruksiSesudah": "AA",
}


def _switching_flags(data):
    jl = _safe(data.get("jenisPekerjaan")).lower()
    perlu_sesudah = ("penggantian" in jl) or ("relokasi" in jl)
    perlu_kerusakan = ("pemeriksaan" in jl) or ("kerusakan" in jl)
    return perlu_sesudah, perlu_kerusakan


def _find_switching_header(values, max_scan=15):
    for r in range(min(len(values), max_scan)):
        for name in values[r]:
            if _norm(name) in ("idba", "namaswitching"):
                return r
    return 0


def _read_switching_row(nomor_ba):
    """Ambil satu baris BA Switching dari Rekap Switching (idBA kolom AI)."""
    result = (
        _sheets_service()
        .spreadsheets()
        .values()
        .get(
            spreadsheetId=SPREADSHEET_ID,
            range=SHEET_SWITCHING,
            valueRenderOption="FORMATTED_VALUE",
        )
        .execute()
    )
    values = result.get("values", [])
    if not values:
        raise RuntimeError("Sheet Rekap Switching kosong.")

    header_row = _find_switching_header(values)
    idx_id = _col_to_index(SW_FIELD_COL_LETTERS["nomorBA"])
    target = _norm(nomor_ba)
    target_raw = _safe(nomor_ba).lower()

    match_row = None
    for row in values[header_row + 1:]:
        cell = _safe(_cell(row, idx_id))
        if not cell:
            continue
        if _norm(cell) == target or cell.lower() == target_raw:
            match_row = row
            break
    if match_row is None:
        raise RuntimeError(
            "idBA '%s' tidak ditemukan di Rekap Switching." % nomor_ba
        )

    data = {}
    for field, letter in SW_FIELD_COL_LETTERS.items():
        data[field] = _safe(_cell(match_row, _col_to_index(letter)))
    for slot, letter in SW_PHOTO_COL_LETTERS.items():
        data[slot] = _safe(_cell(match_row, _col_to_index(letter)))
    if not data.get("nomorBA"):
        data["nomorBA"] = _safe(_cell(match_row, idx_id))
    return data


def _resolve_output_folder_switching(service, data):
    """Path: Berita Acara / Switching / <Jenis> / YYYY / NN. MMMM / <Nama Switching>."""
    if not BA_ROOT_FOLDER_ID:
        raise RuntimeError("BA_ROOT_FOLDER_ID belum diset.")

    jenis = _safe(data.get("jenisPekerjaan")) or "Lainnya"
    nama = _safe(data.get("namaSwitching")) or "Tanpa Nama"

    match = re.match(r"^(\d{4})-(\d{2})", _safe(data.get("tanggalBA")))
    if match:
        year = match.group(1)
        month = int(match.group(2))
    else:
        now = datetime.datetime.now(TZ)
        year = "%04d" % now.year
        month = now.month
    bulan_folder = "%02d. %s" % (month, BULAN_ID[month - 1])

    segments = [
        "Berita Acara", "Switching", jenis, year, bulan_folder, nama,
    ]
    parent = BA_ROOT_FOLDER_ID
    for segment in segments:
        parent = _ensure_folder(service, parent, segment)
    return parent


def _upload_switching_to_drive(buffer, filename, data):
    service = _drive_service()
    folder_id = _resolve_output_folder_switching(service, data)
    media = MediaIoBaseUpload(buffer, mimetype="application/pdf", resumable=False)

    safe_name = filename.replace("'", "\\'")
    existing = (
        service.files()
        .list(
            q="name='" + safe_name + "' and trashed=false and '"
              + folder_id + "' in parents",
            spaces="drive", fields="files(id)",
            includeItemsFromAllDrives=True, supportsAllDrives=True,
            corpora="allDrives",
        )
        .execute()
        .get("files", [])
    )
    for old in existing:
        try:
            service.files().delete(
                fileId=old["id"], supportsAllDrives=True
            ).execute()
        except Exception:
            pass

    metadata = {"name": filename, "parents": [folder_id]}
    created = (
        service.files()
        .create(
            body=metadata, media_body=media,
            fields="id, webViewLink", supportsAllDrives=True,
        )
        .execute()
    )
    return created["id"], created.get("webViewLink", "")


# ---------- SWITCHING — PAGE 1 (DOKUMEN BA) ----------
def _build_page1_switching(pdf, data):
    x = MARGIN_LEFT
    width = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT
    jenis = _safe(data.get("jenisPekerjaan")) or "Switching"
    perlu_sesudah, perlu_kerusakan = _switching_flags(data)

    nomor_ba_disp = _safe(data.get("nomorBAFull")) or _safe(data.get("nomorBA")) or "-"
    nomor_ba_disp = re.sub(r"^\s*No\.?\s*", "", nomor_ba_disp) or "-"
    y = _draw_kop(
        pdf, PAGE_H - MARGIN_Y,
        "BERITA ACARA " + jenis.upper(),
        "No. " + nomor_ba_disp,
    )

    y -= 4
    pdf.setFont(FONT_REG, 9)
    for line in _wrap(_kalimat_pembuka(data.get("tanggalBA")), FONT_REG, 9, width):
        y -= 12
        pdf.drawString(x, y, line)
    y -= 32

    col = width / 2

    def petugas_row(nama, jabatan):
        nonlocal y
        pdf.setFont(FONT_REG, 9)
        pdf.drawString(x + 18, y, "Nama :")
        pdf.drawString(x + col, y, "Jabatan :")
        y -= 16
        pdf.drawString(x + 30, y, _safe(nama) or "-")
        pdf.drawString(x + col + 12, y, _safe(jabatan) or "-")
        y -= 18

    petugas_row(data.get("petugas1"), data.get("jabatan1"))
    petugas_row(data.get("petugas2"), data.get("jabatan2"))
    y -= 2

    pengantar = (
        "Telah melakukan " + jenis + " " + (_safe(data.get("namaSwitching")) or "-")
        + ", Pada tanggal " + (_tanggal_panjang(data.get("tanggalPekerjaan")) or "-")
        + " dengan kondisi sebagai berikut :"
    )
    for line in _wrap(pengantar, FONT_REG, 9, width):
        y -= 12
        pdf.drawString(x, y, line)
    y -= 26

    tab = 20
    if perlu_sesudah:
        gap = 18
        col_w = (width - tab - gap) / 2
        left_x = x + tab
        right_x = left_x + col_w + gap
        head_y = y
        pdf.setFont(FONT_BOLD, 10)
        pdf.drawString(left_x, head_y, "DATA SWITCHING SEBELUM")
        pdf.drawString(right_x, head_y, "DATA SWITCHING SESUDAH")
        head_y -= 14
        sebelum_pairs = [
            ("Jenis Switching", data.get("jenisSwitching")),
            ("Nama Switching", data.get("namaSwitching")),
            ("Merk", data.get("merk")),
            ("Tipe", data.get("tipe")),
            ("Nomor Seri", data.get("nomorSeri")),
            ("Penyulang", data.get("penyulang")),
            ("Section", data.get("section")),
            ("Koordinat", data.get("koordinat")),
        ]
        sesudah_pairs = [
            ("Jenis Switching", data.get("jenisSwitchingSesudah")),
            ("Nama Switching", data.get("namaSwitchingSesudah")),
            ("Merk", data.get("merkSesudah")),
            ("Tipe", data.get("tipeSesudah")),
            ("Nomor Seri", data.get("nomorSeriSesudah")),
            ("Penyulang", data.get("penyulangSesudah")),
            ("Section", data.get("sectionSesudah")),
            ("Koordinat", data.get("koordinatSesudah")),
            ("Asal Switching", data.get("asalSwitching")),
        ]
        y_left = _draw_defs(pdf, left_x, head_y, col_w, sebelum_pairs, line_h=16)
        y_right = _draw_defs(pdf, right_x, head_y, col_w, sesudah_pairs, line_h=16)
        y = min(y_left, y_right) - 14
    else:
        left_x = x + tab
        col_w = width - tab
        pdf.setFont(FONT_BOLD, 10)
        pdf.drawString(left_x, y, "DATA SWITCHING")
        data_pairs = [
            ("Jenis Switching", data.get("jenisSwitching")),
            ("Nama Switching", data.get("namaSwitching")),
            ("Merk", data.get("merk")),
            ("Tipe", data.get("tipe")),
            ("Nomor Seri", data.get("nomorSeri")),
            ("Penyulang", data.get("penyulang")),
            ("Section", data.get("section")),
            ("Koordinat", data.get("koordinat")),
        ]
        y = _draw_defs(pdf, left_x, y - 14, col_w, data_pairs, line_h=16) - 14

    ket_pairs = []
    if _safe(data.get("keteranganTambahan")):
        ket_pairs.append(("Keterangan Tambahan", data.get("keteranganTambahan")))
    if perlu_kerusakan and _safe(data.get("keteranganKerusakan")):
        ket_pairs.append(
            ("Keterangan Kerusakan / Pemeriksaan", data.get("keteranganKerusakan"))
        )
    if ket_pairs:
        left_x = x + tab
        col_w = width - tab
        pdf.setFont(FONT_BOLD, 10)
        pdf.drawString(left_x, y, "KETERANGAN")
        y = _draw_defs(pdf, left_x, y - 14, col_w, ket_pairs, line_h=16) - 14

    pdf.setFont(FONT_REG, 9)
    for line in _wrap("Demikian berita acara ini kami buat, untuk dapat dipergunakan sebagaimana mestinya.", FONT_REG, 9, width):
        y -= 12
        pdf.drawString(x, y, line)

    _draw_signatures(pdf, x, y - 26, width, data)
    pdf.setFont(FONT_REG, 7)
    pdf.drawRightString(PAGE_W - MARGIN_RIGHT, MARGIN_Y + 4, "Halaman 1 dari 2")
    pdf.showPage()


# ---------- SWITCHING — PAGE 2 (LAMPIRAN FOTO) ----------
def _build_page2_switching(pdf, data):
    x = MARGIN_LEFT
    width = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT
    y = _draw_kop(pdf, PAGE_H - MARGIN_Y, "Lampiran", "")
    perlu_sesudah, _ = _switching_flags(data)

    gap = 16
    # Nameplate hanya dimasukkan ke lampiran bila fotonya ADA. Jika nameplate
    # kosong, cukup foto konstruksi saja yang ditampilkan.
    # SLD Sebelum & Sesudah ditambahkan setelah konstruksi.
    cells = []
    if perlu_sesudah:
        if _safe(data.get("nameplateAwal")):
            cells.append(("Nameplate Switching Sebelum", _safe(data.get("nomorSeri")), data.get("nameplateAwal")))
        if _safe(data.get("nameplateSesudah")):
            cells.append(("Nameplate Switching Sesudah", _safe(data.get("nomorSeriSesudah")), data.get("nameplateSesudah")))
        cells.append(("Konstruksi Switching Sebelum", "", data.get("konstruksiAwal")))
        cells.append(("Konstruksi Switching Sesudah", "", data.get("konstruksiSesudah")))
        if _safe(data.get("sldSebelum")):
            cells.append(("SLD Sebelum", "", data.get("sldSebelum")))
        if _safe(data.get("sldSesudah")):
            cells.append(("SLD Sesudah", "", data.get("sldSesudah")))
    else:
        if _safe(data.get("nameplateAwal")):
            cells.append(("Nameplate Switching", _safe(data.get("nomorSeri")), data.get("nameplateAwal")))
        cells.append(("Konstruksi Switching", "", data.get("konstruksiAwal")))
        if _safe(data.get("sldSebelum")):
            cells.append(("SLD Sebelum", "", data.get("sldSebelum")))
        if _safe(data.get("sldSesudah")):
            cells.append(("SLD Sesudah", "", data.get("sldSesudah")))
    images = [_download_image(url) for _, _, url in cells]

    rows = max(1, (len(cells) + 1) // 2)
    grid_top = y - 6
    grid_bottom = MARGIN_Y + 20
    cell_w = (width - gap) / 2
    cell_h = (grid_top - grid_bottom - gap * (rows - 1)) / rows

    positions = []
    for r in range(rows):
        cy = grid_top - r * (cell_h + gap)
        positions.append((x, cy))
        positions.append((x + cell_w + gap, cy))
    for (title, sub, _), (cx, cy), image in zip(cells, positions, images):
        _draw_photo_cell(pdf, cx, cy, cell_w, cell_h, title, sub, image)

    pdf.setFont(FONT_REG, 7)
    pdf.drawRightString(PAGE_W - MARGIN_RIGHT, MARGIN_Y + 4, "Halaman 2 dari 2")
    pdf.showPage()


def build_ba_pdf_switching(data):
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(PAGE_W, PAGE_H))
    _build_page1_switching(pdf, data)
    _build_page2_switching(pdf, data)
    pdf.save()
    buffer.seek(0)
    return buffer


@app.post("/ba/switching")
def ba_switching():
    body = request.get_json(silent=True) or {}
    if not _require_secret(request, body):
        return jsonify({"ok": False, "message": "Secret tidak valid."}), 403

    nomor_ba = _safe(body.get("idBA") or body.get("nomorBA"))
    if not nomor_ba:
        return jsonify({"ok": False, "message": "idBA wajib diisi."}), 400

    try:
        data = _read_switching_row(nomor_ba)
        pdf_buffer = build_ba_pdf_switching(data)
        safe_name = re.sub(r'[\\/:*?"<>|]', "-", nomor_ba)
        # Penamaan berkas memakai kode SWC (bukan SWT) sesuai NO BA Full.
        safe_name = re.sub(r'SWT', "SWC", safe_name, flags=re.IGNORECASE)
        filename = "BA-Switching-" + safe_name + ".pdf"
        file_id, url = _upload_switching_to_drive(pdf_buffer, filename, data)
        # Generate ulang: hapus PDF lama by File ID (nama/folder bisa berubah).
        _delete_drive_file_by_id(body.get("oldFileId"), keep_id=file_id)
        return jsonify({
            "ok": True,
            "fileId": file_id,
            "url": url,
            "fileName": filename,
            "selesai": datetime.datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S"),
        })
    except Exception as error:
        return jsonify({"ok": False, "message": str(error)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))