"""Adaptive PDF layout patch for long Berita Acara values.

The original renderer used only the first wrapped line for every value. This
patch keeps every word, wraps values inside their column, and compresses the
row typography/spacing so page 1 remains a complete single page.
"""
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.colors import black, HexColor


def apply(main):
    def draw_defs(pdf, x, y, width, pairs, line_h=15, size=8.5):
        # Keep the two-column geometry, but let each value use every wrapped
        # line. Compact typography is intentional: page 1 must remain intact.
        clean_pairs = [(_safe(main, label), _safe(main, value)) for label, value in pairs]
        max_label = max(
            (stringWidth(label, main.FONT_BOLD, 8.0) for label, _ in clean_pairs),
            default=0,
        )
        label_w = min(max_label + 18, width * 0.43)
        value_w = max(24, width - label_w - 9)

        # Estimate the densest column and choose a readable compact size.
        chosen = 8.0
        chosen_h = 11.3
        for candidate, row_h in ((8.0, 11.3), (7.5, 10.6), (7.0, 9.9), (6.6, 9.4)):
            total = 0
            for label, value in clean_pairs:
                lines = main._wrap(value or "-", main.FONT_REG, candidate, value_w)
                total += max(1, len(lines)) * row_h
            if total <= 275:
                chosen, chosen_h = candidate, row_h
                break

        for label, value in clean_pairs:
            lines = main._wrap(value or "-", main.FONT_REG, chosen, value_w)
            pdf.setStrokeColor(HexColor("#CCCCCC"))
            pdf.setLineWidth(0.4)
            row_height = max(chosen_h, len(lines) * chosen_h)
            pdf.rect(x, y - row_height, label_w, row_height, stroke=1, fill=0)
            pdf.rect(x + label_w, y - row_height, width - label_w, row_height, stroke=1, fill=0)

            pdf.setFillColor(black)
            pdf.setFont(main.FONT_BOLD, 8.0)
            pdf.drawString(x + 5, y - 10.0, label)
            pdf.setFont(main.FONT_REG, chosen)
            for index, line in enumerate(lines):
                pdf.drawString(x + label_w + 5, y - 10.0 - index * chosen_h, line)
            y -= row_height
        pdf.setFillColor(black)
        return y

    def _safe(mod, value):
        return "" if value is None else str(value).strip()

    main._draw_defs = draw_defs
