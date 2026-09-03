"""Adaptive, borderless layout for Berita Acara definition blocks.

Values are never truncated. Labels, colons, and values keep fixed alignment;
long values wrap through the full remaining width of their own column while
compact typography keeps the complete first page visible.
"""
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.colors import black


def apply(main):
    def _safe(value):
        return "" if value is None else str(value).strip()

    def _metrics(clean_pairs, width, requested_size):
        """Choose label/value geometry and font size that fits page one."""
        label_size = min(8.5, requested_size)
        max_label = max(
            (stringWidth(label, main.FONT_BOLD, label_size) for label, _ in clean_pairs),
            default=0,
        )
        # Colon sits immediately after the widest label. Keep this narrow so
        # values receive as much horizontal room as possible.
        label_w = min(max_label + 5, width * 0.45)
        colon_w = 8
        value_x = label_w + colon_w
        value_w = max(28, width - value_x)

        choices = (
            (min(8.5, requested_size), 11.6),
            (8.0, 11.0),
            (7.5, 10.4),
            (7.0, 9.8),
            (6.6, 9.2),
        )
        selected = choices[-1]
        for candidate, row_h in choices:
            total_h = 0
            for _label, value in clean_pairs:
                lines = main._wrap(value or "-", main.FONT_REG, candidate, value_w)
                total_h += max(1, len(lines)) * row_h
            if total_h <= 275:
                selected = (candidate, row_h)
                break
        return label_size, label_w, value_x, value_w, selected[0], selected[1]

    def draw_defs(pdf, x, y, width, pairs, line_h=15, size=8.5):
        clean_pairs = [(_safe(label), _safe(value)) for label, value in pairs]
        label_size, label_w, value_x, value_w, value_size, row_h = _metrics(
            clean_pairs, width, size
        )

        pdf.setFillColor(black)
        for label, value in clean_pairs:
            lines = main._wrap(value or "-", main.FONT_REG, value_size, value_w)
            baseline = y - row_h + 3.0

            # Borderless document style: Label  :  Value
            pdf.setFont(main.FONT_BOLD, label_size)
            pdf.drawString(x, baseline, label)
            pdf.setFont(main.FONT_REG, value_size)
            pdf.drawString(x + label_w, baseline, ":")

            # Continuation lines stay aligned with the value, and can run to
            # the physical end of this column. Nothing is sliced or ellipsized.
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
