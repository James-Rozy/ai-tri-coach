"""Generate the watch face's bitmap fonts, sport icons and launcher icon.

Connect IQ can't use TTF fonts directly, so this renders the brand faces
(Archivo Condensed Black and JetBrains Mono) into BMFont text files plus PNG
glyph sheets. The clock digits are drawn as seven-segment glyphs from the same
geometry as the design mockup. Digits share one advance so numbers don't jiggle.

    python3 -m pip install pillow
    python3 watchface/tools/make_assets.py
"""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_SRC = Path(__file__).resolve().parent / "fonts"
FONT_OUT = ROOT / "resources" / "fonts"
DRAW_OUT = ROOT / "resources" / "drawables"

ARCHIVO_BLACK = FONT_SRC / "archivo-cond-900.woff"
MONO_REGULAR = FONT_SRC / "JetBrainsMono-Regular.ttf"
MONO_SEMIBOLD = FONT_SRC / "JetBrainsMono-SemiBold.ttf"

AMBER = (0xFF, 0xB0, 0x20)
INK = (0xF2, 0xF4, 0xF7)
BG = (0x0E, 0x11, 0x16)

DIGITS = "0123456789"
NUMBER_CHARS = DIGITS + ",.:%°H/-"
TEXT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :,.%/-°"

# id, source face, pixel size, characters
TEXT_FONTS = [
    ("num_data", ARCHIVO_BLACK, 26, NUMBER_CHARS),    # every reading: HR, steps, weather, BB, days, week total
    ("num_detail", ARCHIVO_BLACK, 20, NUMBER_CHARS),  # the per-sport distance breakdown
    ("mono_label", MONO_REGULAR, 14, TEXT_CHARS),
    ("mono_bold", MONO_SEMIBOLD, 14, TEXT_CHARS),
]

# id, digit width, digit height, segment thickness (matches the mockup's segText calls)
SEGMENT_FONTS = [
    ("seg_time", 44, 76, 10),
    ("seg_secs", 14, 30, 4),
]

SHEET_W = 512
PAD = 2


def pack(glyphs):
    """Shelf-pack glyph images into one sheet; sets x and y on each glyph."""
    x = y = shelf = 0
    for g in glyphs:
        if x + g["w"] + PAD > SHEET_W:
            x, y, shelf = 0, y + shelf + PAD, 0
        g["x"], g["y"] = x, y
        x += g["w"] + PAD
        shelf = max(shelf, g["h"])
    sheet_h = y + shelf + PAD
    alpha = Image.new("L", (SHEET_W, sheet_h), 0)
    for g in glyphs:
        if g["w"] and g["h"]:
            alpha.paste(g["img"], (g["x"], g["y"]))
    # White glyphs on an opaque black sheet, no alpha channel. With a transparent sheet the
    # Connect IQ font compiler drops the smoothing and glyphs come out with hard, heavy edges.
    return Image.merge("RGB", (alpha, alpha, alpha))


def write_font(name, face, size, line_height, base, glyphs):
    sheet = pack(glyphs)
    sheet.save(FONT_OUT / f"{name}.png")
    lines = [
        f'info face="{face}" size={size} bold=0 italic=0 charset="" unicode=1 '
        f"stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing={PAD},{PAD}",
        f"common lineHeight={line_height} base={base} scaleW={SHEET_W} scaleH={sheet.height} pages=1 packed=0",
        f'page id=0 file="{name}.png"',
        f"chars count={len(glyphs)}",
    ]
    for g in glyphs:
        lines.append(
            f"char id={ord(g['ch'])} x={g['x']} y={g['y']} width={g['w']} height={g['h']} "
            f"xoffset={g['xoffset']} yoffset={g['yoffset']} xadvance={g['xadvance']} page=0 chnl=15"
        )
    (FONT_OUT / f"{name}.fnt").write_text("\n".join(lines) + "\n")


def build_text_font(name, path, size, chars):
    font = ImageFont.truetype(str(path), size)
    ascent, descent = font.getmetrics()
    digit_advance = max(font.getlength(d) for d in DIGITS)
    glyphs = []
    for ch in chars:
        left, top, right, bottom = font.getbbox(ch)
        advance = font.getlength(ch)
        xoffset = left
        if ch in DIGITS:
            # Center each digit in a fixed cell: tabular numbers.
            xoffset += (digit_advance - advance) / 2
            advance = digit_advance
        w, h = max(right - left, 0), max(bottom - top, 0)
        img = Image.new("L", (max(w, 1), max(h, 1)), 0)
        if w and h:
            ImageDraw.Draw(img).text((-left, -top), ch, font=font, fill=255)
        glyphs.append(dict(ch=ch, img=img, w=w, h=h, xoffset=round(xoffset), yoffset=top, xadvance=round(advance)))
    write_font(name, font.getname()[0], size, ascent + descent, ascent, glyphs)


SEGMENTS = {
    "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc",
    "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg",
}
SUPERSAMPLE = 4


def segment_polys(w, h, t):
    """Hexagonal segments a-g for a digit cell of w x h with thickness t."""
    g = max(1, t * 0.18)
    left, right = t / 2, w - t / 2
    top, mid, bottom = t / 2, h / 2, h - t / 2
    half = t / 2

    def horiz(x0, x1, y):
        return [(x0, y), (x0 + half, y - half), (x1 - half, y - half), (x1, y), (x1 - half, y + half), (x0 + half, y + half)]

    def vert(x, y0, y1):
        return [(x, y0), (x + half, y0 + half), (x + half, y1 - half), (x, y1), (x - half, y1 - half), (x - half, y0 + half)]

    return {
        "a": horiz(left + g, right - g, top),
        "b": vert(right, top + g, mid - g),
        "c": vert(right, mid + g, bottom - g),
        "d": horiz(left + g, right - g, bottom),
        "e": vert(left, mid + g, bottom - g),
        "f": vert(left, top + g, mid - g),
        "g": horiz(left + g, right - g, mid),
    }


def build_segment_font(name, w, h, t):
    spacing = t * 0.9
    colon_w = t * 1.2
    polys = segment_polys(w, h, t)
    glyphs = []
    for ch in DIGITS + ":":
        cell_w = colon_w if ch == ":" else w
        big = Image.new("L", (round(cell_w * SUPERSAMPLE), h * SUPERSAMPLE), 0)
        draw = ImageDraw.Draw(big)
        if ch == ":":
            for cy in (h * 0.3, h * 0.7):
                x0 = (colon_w - t) / 2
                draw.rectangle([x0 * SUPERSAMPLE, (cy - t / 2) * SUPERSAMPLE, (x0 + t) * SUPERSAMPLE - 1, (cy + t / 2) * SUPERSAMPLE - 1], fill=255)
        else:
            for seg in SEGMENTS[ch]:
                draw.polygon([(x * SUPERSAMPLE, y * SUPERSAMPLE) for x, y in polys[seg]], fill=255)
        img = big.resize((round(cell_w), h), Image.LANCZOS)
        glyphs.append(dict(
            ch=ch, img=img, w=img.width, h=h,
            # Half the gap on each side, so a string's measured width centers on its ink.
            xoffset=round(spacing / 2), yoffset=0, xadvance=round(cell_w + spacing),
        ))
    write_font(name, "Split Decisions Segments", h, h, h, glyphs)


# Sport icons: geometry on a 16-unit grid in sport_icons.json (shared with the mockup),
# drawn in each sport's color at two sizes: the distance row and the week strip.
SPORT_ICONS = Path(__file__).resolve().parent / "sport_icons.json"
SPORT_COLORS = {"swim": (0x2E, 0xA4, 0xDC), "bike": (0xF2, 0x8E, 0x42), "run": (0x35, 0xC1, 0x77)}
ICON_SIZES = {"Large": 18, "Small": 11}
ICON_SS = 8


def build_sport_icons():
    icons = json.loads(SPORT_ICONS.read_text())
    for key, elements in icons.items():
        for suffix, size in ICON_SIZES.items():
            k = size * ICON_SS / 16
            mask = Image.new("L", (size * ICON_SS, size * ICON_SS), 0)
            draw = ImageDraw.Draw(mask)
            for e in elements:
                ink = 0 if e.get("bg") else 255
                if e["t"] in ("line", "fill"):
                    pts = [(x * k, y * k) for x, y in e["p"]]
                    if e["t"] == "fill":
                        draw.polygon(pts, fill=ink)
                    else:
                        w = e["w"] * k
                        draw.line(pts, fill=ink, width=round(w), joint="curve")
                        for x, y in (pts[0], pts[-1]):  # round caps
                            draw.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=ink)
                else:
                    cx, cy, r = e["c"][0] * k, e["c"][1] * k, e["r"] * k
                    if e["t"] == "dot":
                        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=ink)
                    else:
                        w = e["w"] * k
                        draw.ellipse((cx - r - w / 2, cy - r - w / 2, cx + r + w / 2, cy + r + w / 2), outline=ink, width=round(w))
            alpha = mask.resize((size, size), Image.LANCZOS)
            # Opaque, blended onto black like the fonts, so the edges stay smooth. The face's
            # background is black, so the square around each icon is invisible.
            r, g, b = SPORT_COLORS[key]
            img = Image.merge("RGB", (
                alpha.point(lambda v: v * r // 255),
                alpha.point(lambda v: v * g // 255),
                alpha.point(lambda v: v * b // 255),
            ))
            img.save(DRAW_OUT / f"icon_{key}_{suffix.lower()}.png")


def build_launcher_icon():
    """'SD' monogram over a split amber bar, for the watch's face picker."""
    size = 80
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse((0, 0, size - 1, size - 1), fill=BG + (255,))
    font = ImageFont.truetype(str(ARCHIVO_BLACK), 40)
    draw.text((size / 2, size / 2 - 4), "SD", font=font, fill=INK + (255,), anchor="mm")
    draw.rectangle((18, 56, 38, 59), fill=AMBER + (255,))
    draw.rectangle((42, 56, 62, 59), fill=AMBER + (255,))
    out = Image.new("RGB", img.size, (0, 0, 0))
    out.paste(img, mask=img.split()[3])
    out.save(DRAW_OUT / "launcher_icon.png")


if __name__ == "__main__":
    FONT_OUT.mkdir(parents=True, exist_ok=True)
    DRAW_OUT.mkdir(parents=True, exist_ok=True)
    for spec in TEXT_FONTS:
        build_text_font(*spec)
    for spec in SEGMENT_FONTS:
        build_segment_font(*spec)
    build_sport_icons()
    build_launcher_icon()
    print("Wrote fonts to", FONT_OUT, "and the icons to", DRAW_OUT)
