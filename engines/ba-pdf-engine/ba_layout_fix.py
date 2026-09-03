"""Adaptive, borderless layout for Berita Acara definition blocks.

Values are never truncated. Labels, colons, and values keep clean alignment.
Text spans across full printable width (to paper right margin) with comfortable
row line spacing matching original document proportions.
"""
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.colors import black


def apply(main):
    def _safe(value):
        return "" if value is None else str(value).strip()

    def _metrics(clean_pairs, width, requested_size, line_h=15, full_width=None):
        """Choose label/value geometry and font size with spacious line height.
        Values can expand up to full_width (right margin of the paper)."""
        label_size = min(8.5, requested_size)
        max_label = max(
            (stringWidth(label, main.FONT_BOLD, label_size) for label, _ in clean_pairs),
            default=0,
        )
        # Colon sits neatly after widest label
        label_w = min(max_label + 4, width * 0.45)
        colon_w = 8
        value_x = label_w + colon_w
        avail_w = (full_width - value_x) if full_width else (width - value_x)
        value_w = max(28, avail_w)

        # Gunakan line_h yang lega (default 15 - 16 pt) seperti layout asli agar tidak rapat
        target_h = max(14.0, float(line_h))
        font_sz = min(8.5, requested_size)

        choices = (
            (font_sz, target_h),
            (font_sz, target_h - 1.0),
            (8.0, 13.5),
            (7.5, 12.5),
            (7.0, 11.5),
        )
        selected = choices[1]
        for candidate, row_h in choices:
            total_h = 0
            for _label, value in clean_pairs:
                lines = main._wrap(value or "-", main.FONT_REG, candidate, value_w)
                total_h += max(1, len(lines)) * row_h
            if total_h <= 340:
                selected = (candidate, row_h)
                break
        return label_size, label_w, value_x, value_w, selected[0], selected[1]

    def draw_defs(pdf, x, y, width, pairs, line_h=16, size=8.5, max_x=None):
        clean_pairs = [(_safe(label), _safe(value)) for label, value in pairs]
        paper_right = max_x if max_x is not None else (main.PAGE_W - main.MARGIN_RIGHT)
        full_avail_w = paper_right - x

        label_size, label_w, value_x, value_w, value_size, row_h = _metrics(
            clean_pairs, width, size, line_h=line_h, full_width=full_avail_w
        )

        pdf.setFillColor(black)
        for label, value in clean_pairs:
            lines = main._wrap(value or "-", main.FONT_REG, value_size, value_w)
            baseline = y - row_h + 3.5

            # Format tanpa border: Label  :  Nilai
            pdf.setFont(main.FONT_BOLD, label_size)
            pdf.drawString(x, baseline, label)
            pdf.setFont(main.FONT_REG, value_size)
            pdf.drawString(x + label_w, baseline, ":")

            for index, line in enumerate(lines):
                pdf.drawString(
                    x + value_x,
                    baseline - index * row_h,
                    line,
                )
            y -= max(1, len(lines)) * row_h

        pdf.setFillColor(black)
        return y

    main._draw_defs = draw_defs
