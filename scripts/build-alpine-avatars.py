"""Recolor orange Alpine body to blue. Requires: py -3 + Pillow."""
from __future__ import annotations

import colorsys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'scripts' / 'alpine-source.png'
OUT_ORANGE = ROOT / 'frontend' / 'assets' / 'avatars' / 'alpine_orange.jpg'
OUT_BLUE = ROOT / 'frontend' / 'assets' / 'avatars' / 'alpine.jpg'
SIZE = 320


def is_orange_paint(r: int, g: int, b: int) -> bool:
    if b > r + 25 and b > 120:
        return False
    if g > r + 8 and g > b + 5:
        return False
    if r < 48:
        return False
    if r <= g and r <= b + 4:
        return False
    warm_gap = r - max(g, b)
    return warm_gap >= 8 and (r >= 72 or warm_gap >= 18)


def to_blue(r: int, g: int, b: int) -> tuple[int, int, int]:
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    nr, ng, nb = colorsys.hsv_to_rgb(0.585, min(0.82, s * 0.92), v)
    return int(nr * 255), int(ng * 255), int(nb * 255)


def save_orange(img: Image.Image) -> None:
    img.convert('RGB').resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(
        OUT_ORANGE, 'JPEG', quality=93, optimize=True,
    )


def build_orange_mask(img: Image.Image) -> list[list[bool]]:
    w, h = img.size
    px = img.load()
    mask = [[False] * w for _ in range(h)]

    for y in range(h):
        for x in range(w):
            if is_orange_paint(*px[x, y]):
                mask[y][x] = True

    for _ in range(6):
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                if mask[y][x]:
                    continue
                r, g, b = px[x, y]
                if g > r + 10 and g > b:
                    continue
                if max(r, g, b) - min(r, g, b) < 18:
                    continue
                neighbors = sum(
                    mask[y + dy][x + dx]
                    for dy in (-1, 0, 1)
                    for dx in (-1, 0, 1)
                    if (dy or dx) and mask[y + dy][x + dx]
                )
                if neighbors >= 4 and r >= g - 8 and r > b:
                    mask[y][x] = True

    return mask


def save_blue(img: Image.Image) -> None:
    blue = img.convert('RGB').copy()
    px = blue.load()
    w, h = blue.size
    mask = build_orange_mask(blue)

    for y in range(h):
        for x in range(w):
            if mask[y][x]:
                r, g, b = px[x, y]
                px[x, y] = to_blue(r, g, b)

    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if is_orange_paint(r, g, b):
                px[x, y] = to_blue(r, g, b)

    blue.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(
        OUT_BLUE, 'JPEG', quality=93, optimize=True,
    )


def main() -> None:
    img = Image.open(SRC)
    save_orange(img)
    save_blue(img)
    print('OK alpine_orange.jpg + alpine.jpg')


if __name__ == '__main__':
    main()
