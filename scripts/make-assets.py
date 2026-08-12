#!/usr/bin/env python3
"""Render the extension icons and the Web Store promo images.

The artwork is the site favicon (static/favicon.svg on ccgenerator.org): a dark
rounded square, a white card, a blue magnetic stripe and two dark bars. It is
redrawn here rather than resampled from icon-512.png so the 16px toolbar icon
stays crisp — every shape is drawn at 8x and downsampled once with Lanczos.

    python3 scripts/make-assets.py

Writes icons/icon{16,32,48,128}.png and store/promo-{small,marquee}.png.
Requires Pillow.
"""

import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

INK = (17, 24, 39, 255)        # #111827
BLUE = (37, 99, 235, 255)      # #2563eb
WHITE = (255, 255, 255, 255)
SUPERSAMPLE = 8


def draw_mark(size, background=True):
    """The logo at `size` px, drawn at 8x and downsampled once."""
    s = size * SUPERSAMPLE
    image = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    unit = s / 64.0

    def box(x, y, w, h):
        return [x * unit, y * unit, (x + w) * unit, (y + h) * unit]

    if background:
        draw.rounded_rectangle(box(0, 0, 64, 64), radius=12 * unit, fill=INK)

    # At 16px the card details collapse into mud, so the small sizes get a
    # larger card and a thicker stripe instead of a faithful reduction.
    small = size <= 32
    card = box(8, 16, 48, 32) if small else box(10, 18, 44, 28)
    draw.rounded_rectangle(card, radius=(6 if small else 5) * unit, fill=WHITE)

    stripe = box(8, 23, 48, 8) if small else box(10, 24, 44, 6)
    draw.rectangle(stripe, fill=BLUE)

    if not small:
        draw.rounded_rectangle(box(16, 36, 14, 4), radius=2 * unit, fill=INK)
        draw.rounded_rectangle(box(36, 36, 10, 4), radius=2 * unit, fill=INK)
    else:
        draw.rounded_rectangle(box(15, 37, 16, 5), radius=2.5 * unit, fill=INK)

    return image.resize((size, size), Image.LANCZOS)


def font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold
        else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def wrap(draw, text, text_font, max_width):
    """Greedy word wrap against the measured width of the rendered string."""
    words = text.split()
    lines = []
    line = ""

    for word in words:
        candidate = (line + " " + word).strip()
        if draw.textlength(candidate, font=text_font) <= max_width or not line:
            line = candidate
        else:
            lines.append(line)
            line = word

    if line:
        lines.append(line)
    return lines


def fit(draw, text, size, max_width, bold=False):
    """Largest point size at or below `size` that keeps `text` on one line."""
    while size > 8:
        candidate = font(size, bold=bold)
        if draw.textlength(text, font=candidate) <= max_width:
            return candidate
        size -= 1
    return font(size, bold=bold)


def promo(width, height, mark_size, title_size, sub_size, path):
    """Web Store promo tile: logo left, wordmark and one line of copy right."""
    image = Image.new("RGB", (width, height), (15, 23, 42))
    draw = ImageDraw.Draw(image)

    # A soft diagonal wash so the tile is not a flat rectangle in the grid.
    for y in range(height):
        blend = y / height
        draw.line(
            [(0, y), (width, y)],
            fill=(
                int(15 + 10 * blend),
                int(23 + 22 * blend),
                int(42 + 55 * blend),
            ),
        )

    mark = draw_mark(mark_size)
    margin = int(width * 0.07)
    mark_y = (height - mark_size) // 2
    image.paste(mark, (margin, mark_y), mark)

    text_x = margin + mark_size + int(width * 0.05)
    text_width = width - text_x - margin
    title = "CC Generator"
    subtitle = "Luhn-valid test card numbers for developers and QA"

    title_font = fit(draw, title, title_size, text_width, bold=True)
    sub_font = font(sub_size)
    sub_lines = wrap(draw, subtitle, sub_font, text_width)

    title_height = draw.textbbox((0, 0), title, font=title_font)[3]
    line_height = int(sub_size * 1.45)
    gap = int(title_size * 0.35)
    total = title_height + gap + line_height * len(sub_lines)
    top = (height - total) // 2

    draw.text((text_x, top), title, font=title_font, fill=(248, 250, 252))
    for index, line in enumerate(sub_lines):
        draw.text((text_x, top + title_height + gap + index * line_height),
                  line, font=sub_font, fill=(148, 163, 184))

    image.save(path, "PNG")
    print("wrote", os.path.relpath(path, ROOT))


def main():
    icons_dir = os.path.join(ROOT, "icons")
    store_dir = os.path.join(ROOT, "store")
    os.makedirs(icons_dir, exist_ok=True)
    os.makedirs(store_dir, exist_ok=True)

    for size in (16, 32, 48, 128):
        path = os.path.join(icons_dir, "icon%d.png" % size)
        draw_mark(size).save(path, "PNG")
        print("wrote", os.path.relpath(path, ROOT))

    promo(440, 280, 128, 44, 17, os.path.join(store_dir, "promo-small.png"))
    promo(1400, 560, 300, 108, 40, os.path.join(store_dir, "promo-marquee.png"))


if __name__ == "__main__":
    main()
