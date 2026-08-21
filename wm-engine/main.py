import base64, io, os
from flask import Flask, request, send_file, abort
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageOps

app = Flask(__name__)
SECRET   = os.environ.get("WM_SECRET", "")
BASE_DIR = os.path.dirname(__file__)

def _asset(name):
    p = os.path.join(BASE_DIR, "assets", name)
    return p if os.path.exists(p) else None

def _logo(name):
    p = _asset(name)
    return Image.open(p).convert("RGBA") if p else None

LOGO_PLN  = _logo("logo_pln.png")
LOGO_SISI = _logo("logo_sisi.png")

def _font(size):
    p = _asset("DejaVuSans-Bold.ttf")
    try:
        return ImageFont.truetype(p, size) if p else ImageFont.load_default()
    except Exception:
        return ImageFont.load_default()

def _enhance(img):
    # Peningkatan kualitas ringan: auto-kontras + kecerahan + ketajaman
    img = ImageOps.autocontrast(img, cutoff=1)
    img = ImageEnhance.Brightness(img).enhance(1.12)
    img = ImageEnhance.Sharpness(img).enhance(1.4)
    return img

GREEN  = (138, 209, 0, 255)      # aksen hijau (chevron, jam, bullet)
PANEL  = (38, 38, 38, 180)       # pembungkus abu-abu transparan
WHITE  = (255, 255, 255, 255)
SUBTLE = (225, 225, 225, 255)

def _rounded(size, radius, fill):
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=fill)
    return im

def _wrap(draw, text, font, max_w):
    words = (text or "").split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if not cur or draw.textlength(test, font=font) <= max_w:
            cur = test
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines or [""]

def _decode_minimap(b64, w, h):
    # Mini-map dikirim Apps Script sebagai base64 PNG (dari Maps.newStaticMap() — gratis).
    # Engine TIDAK lagi memanggil Maps Static API → tidak ada biaya.
    try:
        if not b64:
            return None
        m = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGBA")
        return m.resize((w, h))
    except Exception:
        return None

@app.post("/watermark")
def watermark():
    data = request.get_json(silent=True) or {}
    if SECRET and data.get("secret") != SECRET:
        abort(403)

    raw  = base64.b64decode(data["image"])
    base = Image.open(io.BytesIO(raw)).convert("RGB")
    # DOWNSCALE: batasi sisi terpanjang ke 2000px -> render Pillow & ukuran output jauh lebih ringan
    MAXSIDE = 2000
    if max(base.size) > MAXSIDE:
        base.thumbnail((MAXSIDE, MAXSIDE), Image.LANCZOS)
    base = _enhance(base).convert("RGBA")
    W, H = base.size
    canvas = base.copy()
    s = max(0.6, W / 1024.0)
    margin = int(20 * s)
    lat, lng = data.get("lat", ""), data.get("long", "")

    # ---- Kartu 1: mini-map (kanan atas) ----
    if data.get("minimap"):
        mw = int(W * 0.24); mh = int(mw * 0.66)
        m = _decode_minimap(data.get("minimap"), mw, mh)
        if m:
            inner = int(8 * s)
            mapcard = _rounded((mw + inner * 2, mh + inner * 2), int(14 * s), PANEL)
            mask = _rounded((mw, mh), int(9 * s), WHITE)
            mapcard.paste(m, (inner, inner), mask)
            canvas.alpha_composite(mapcard, (W - mapcard.width - margin, margin))

    # ---- Kartu 2: info (kiri bawah) ----
    pad = int(20 * s)
    content_w = int(W * 0.40)
    f_title = _font(int(30 * s))
    f_sub   = _font(int(19 * s))
    f_time  = _font(int(46 * s))
    f_small = _font(int(18 * s))
    f_body  = _font(int(21 * s))

    meas = ImageDraw.Draw(canvas)
    logoH = int(48 * s)
    logo_w = int(LOGO_PLN.width * (logoH / LOGO_PLN.height)) if LOGO_PLN else 0
    head_x = (logo_w + int(12 * s)) if LOGO_PLN else 0
    ulp_txt = data.get("ulp", "")
    if ulp_txt and not ulp_txt.upper().startswith("ULP"):
        ulp_txt = "ULP " + ulp_txt   # prefix -> "Toboali" jadi "ULP Toboali" (tak ganda bila sudah ada)
    tim = data.get("tim", ""); petugas = data.get("petugas", "")
    sub_txt = tim   # petugas dipindah ke bullet (agar nama lengkap tidak terpotong)
    header_h = max(logoH, int(58 * s))

    sep_h = int(22 * s)
    time_h = int(50 * s)
    jam = data.get("jam", ""); hari = data.get("hari", ""); tgl = data.get("tanggal", "")

    # Bullet berjudul (urut): Petugas, Penyulang, Daerah Pekerjaan, Koordinat (2 baris), Durasi & Jarak (foto sesudah) & Jarak Antar P0 (foto pekerjaan)
    koor = data.get("koordinat") or ((f"{lat}, {lng}") if (lat and lng) else "")
    bullets = []
    petugas_disp = " & ".join([p.strip() for p in petugas.split(",") if p.strip()])  # "A , B" -> "A & B"
    if petugas_disp:          bullets.append(["Petugas : " + petugas_disp])
    if data.get("penyulang"): bullets.append(["Penyulang : " + data.get("penyulang")])
    if data.get("switching"): bullets.append(["Switching : " + data.get("switching")])
    if data.get("arus"):      bullets.append(["Arus (R/S/T) : " + data.get("arus")])
    if data.get("daerah"):    bullets.append(["Daerah Pekerjaan : " + data.get("daerah")])
    if koor:                  bullets.append(["Koordinat :", koor])
    if data.get("durasi"):    bullets.append(["Durasi : " + data.get("durasi")])
    if data.get("jarak"):     bullets.append(["Jarak (Closing → Pekerjaan) : " + data.get("jarak")])
    if data.get("jarakP0"):   bullets.append(["Jarak Antar P0 : " + data.get("jarakP0")])

    bul_indent = int(22 * s)
    body_line_h = int(21 * s) + int(10 * s)
    line_gap = int(7 * s)
    wrapped = []
    for blk in bullets:
        lines = []
        for logical in blk:
            lines += _wrap(meas, logical, f_body, content_w - bul_indent)
        wrapped.append(lines)
    body_h = sum(body_line_h * len(ls) + line_gap for ls in wrapped)

    gap = int(12 * s)
    card_h = pad * 2 + header_h + gap + sep_h + gap + time_h + gap + body_h
    card_w = pad * 2 + content_w
    card = _rounded((card_w, card_h), int(16 * s), PANEL)
    cd = ImageDraw.Draw(card)
    y = pad

    if LOGO_PLN:
        lp = LOGO_PLN.resize((logo_w, logoH))
        card.paste(lp, (pad, y), lp)
    cd.text((pad + head_x, y), ulp_txt, font=f_title, fill=WHITE)
    cd.text((pad + head_x, y + int(32 * s)), sub_txt, font=f_sub, fill=SUBTLE)
    y += header_h + gap

    # Garis pemisah: 2 baris horizontal penuh selebar card
    ln_th = max(2, int(3 * s))
    ln_x0, ln_x1 = 0, card_w - 1
    ln_y1 = y + int(4 * s)
    ln_y2 = ln_y1 + ln_th + int(8 * s)
    cd.line([(ln_x0, ln_y1), (ln_x1, ln_y1)], fill=GREEN, width=ln_th)
    cd.line([(ln_x0, ln_y2), (ln_x1, ln_y2)], fill=GREEN, width=ln_th)
    # separator lama (dinonaktifkan): "›" * 16, font=_font(sep_h), fill=GREEN)
    y += sep_h + gap

    cd.text((pad, y), jam, font=f_time, fill=GREEN)
    jx = pad + int(cd.textlength(jam, font=f_time)) + int(14 * s)
    cd.text((jx, y + int(6 * s)), hari, font=f_small, fill=WHITE)
    cd.text((jx, y + int(26 * s)), tgl, font=f_body, fill=WHITE)
    y += time_h + gap

    for ls in wrapped:
        bsz = int(11 * s)
        cd.rectangle([pad, y + int(6 * s), pad + bsz, y + int(6 * s) + bsz], fill=GREEN)
        for ln in ls:
            cd.text((pad + bul_indent, y), ln, font=f_body, fill=WHITE)
            y += body_line_h
        y += line_gap

    cardY = max(margin, H - card_h - margin)
    canvas.alpha_composite(card, (margin, cardY))

    # ---- Kartu 3: logo SiSi (kanan bawah) ----
    if LOGO_SISI:
        lh = int(76 * s)
        lw = int(LOGO_SISI.width * (lh / LOGO_SISI.height))
        sc = _rounded((lw + pad, lh + pad), int(14 * s), PANEL)
        sl = LOGO_SISI.resize((lw, lh))
        sc.paste(sl, (pad // 2, pad // 2), sl)
        canvas.alpha_composite(sc, (W - (lw + pad) - margin, H - (lh + pad) - margin))

    out = io.BytesIO()
    # OUTPUT JPEG (quality 85): ~300KB vs PNG 3-5MB -> transfer balik & upload Drive jauh lebih cepat
    canvas.convert("RGB").save(out, format="JPEG", quality=85, optimize=True); out.seek(0)
    return send_file(out, mimetype="image/jpeg")

@app.get("/")
def health():
    return "ok"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))