"""Generate the watch face's bitmap fonts, wordmark and launcher icon.

Connect IQ can't use TTF fonts directly, so this renders the brand faces
(Archivo Condensed Black and JetBrains Mono) into BMFont text files plus PNG
glyph sheets. Digits share one advance so the time doesn't jiggle.

    python3 -m pip install pillow
    python3 watchface/tools/make_assets.py
"""

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
TEXT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :,%-"

# id, source face, pixel size, characters
FONTS = [
    ("time_large", ARCHIVO_BLACK, 142, DIGITS + ":"),
    ("mono_label", MONO_REGULAR, 13, TEXT_CHARS),
    ("mono_small", MONO_REGULAR, 15, TEXT_CHARS),
    ("mono_leg", MONO_SEMIBOLD, 18, TEXT_CHARS),
    ("mono_date", MONO_SEMIBOLD, 21, TEXT_CHARS),
    ("mono_value", MONO_SEMIBOLD, 24, TEXT_CHARS),
    ("mono_secs", MONO_SEMIBOLD, 26, DIGITS),
]


def build_font(name, path, size, chars):
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

    # Simple shelf packing.
    sheet_w, pad = 512, 2
    x = y = shelf = 0
    for g in glyphs:
        if x + g["w"] + pad > sheet_w:
            x, y, shelf = 0, y + shelf + pad, 0
        g["x"], g["y"] = x, y
        x += g["w"] + pad
        shelf = max(shelf, g["h"])
    sheet_h = y + shelf + pad

    alpha = Image.new("L", (sheet_w, sheet_h), 0)
    for g in glyphs:
        if g["w"] and g["h"]:
            alpha.paste(g["img"], (g["x"], g["y"]))
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (255, 255, 255, 0))
    sheet.putalpha(alpha)
    sheet.save(FONT_OUT / f"{name}.png")

    lines = [
        f'info face="{font.getname()[0]}" size={size} bold=0 italic=0 charset="" unicode=1 '
        f"stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing={pad},{pad}",
        f"common lineHeight={ascent + descent} base={ascent} scaleW={sheet_w} scaleH={sheet_h} pages=1 packed=0",
        f'page id=0 file="{name}.png"',
        f"chars count={len(glyphs)}",
    ]
    for g in glyphs:
        lines.append(
            f"char id={ord(g['ch'])} x={g['x']} y={g['y']} width={g['w']} height={g['h']} "
            f"xoffset={g['xoffset']} yoffset={g['yoffset']} xadvance={g['xadvance']} page=0 chnl=15"
        )
    (FONT_OUT / f"{name}.fnt").write_text("\n".join(lines) + "\n")


def build_wordmark():
    """'SPLIT DECISIONS' in amber, letter-spaced, as one bitmap."""
    font = ImageFont.truetype(str(ARCHIVO_BLACK), 21)
    text, tracking = "SPLIT DECISIONS", 4
    width = sum(font.getlength(c) for c in text) + tracking * (len(text) - 1)
    ascent, descent = font.getmetrics()
    img = Image.new("RGBA", (round(width) + 2, ascent + descent), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    x = 1.0
    for c in text:
        draw.text((x, 0), c, font=font, fill=AMBER + (255,))
        x += font.getlength(c) + tracking
    img = img.crop(img.getbbox())
    flatten(img).save(DRAW_OUT / "wordmark.png")


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
    flatten(img).save(DRAW_OUT / "launcher_icon.png")


def flatten(img):
    # Watch faces draw on black; baking that in avoids fringes from partial alpha.
    out = Image.new("RGB", img.size, (0, 0, 0))
    out.paste(img, mask=img.split()[3])
    return out


if __name__ == "__main__":
    FONT_OUT.mkdir(parents=True, exist_ok=True)
    DRAW_OUT.mkdir(parents=True, exist_ok=True)
    for spec in FONTS:
        build_font(*spec)
    build_wordmark()
    build_launcher_icon()
    print("Wrote fonts to", FONT_OUT, "and drawables to", DRAW_OUT)
