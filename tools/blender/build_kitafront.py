# Builds the large buildings fronting Kita-Ōdōri avenue round the terminal (the Umeda-style
# rebuild of the hub's district): commercial fronts with screen cabinets and stacked signs, hotels,
# offices, a bank, a broadcaster with its aerial, a theatre, a mechanical car park.
#
#   blender --background --python tools/blender/build_kitafront.py -- [--renders <dir>]
#
# Writes assets/buildings/kitafront.blend, public/models/buildings/kitafront.glb and
# src/stations/anchors/kitafront.ts (sizes, and where the game puts names and screens).
# Frame and helpers: buildkit.py, kitakit.py. Nothing here carries a name.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403


def base(p, s, v, r, h, wall=GRANITE, door=0.0, bay=5.2, awn=True):
    """Street storeys: shop fronts on the street, the same round the sides, a service back."""
    w, d = v['w'], v['d']
    p.box(wall, -w / 2, 0, 0, w / 2, h, d)
    shopfronts(p, s, -w / 2, w / 2, 0, min(h, 5.2), r, bay, door, awn)
    for face, a0, a1, at in sides(-w / 2, w / 2, 0, d, 'lr'):
        for c in rows(a0 + 1, a1 - 1, 6.0):
            quad(p, 'windowDim', face, c - 2.2, c + 2.2, 0.7, min(h, 5.2) - 1.3, out(face, at, 0.03), col=SHOP)
            slab(p, ALU_DK, face, c - 2.3, c + 2.3, min(h, 5.2) - 1.3, min(h, 5.2) - 1.15, at, 0.3)
    service_back(p, -w / 2, w / 2, d, h, r)
    band(p, ALU_DK, -w / 2, w / 2, 0, d, h - 0.3, h, 0.15)


def vision(p, s, v, r):
    """A fashion building: white panels, slit windows, a glass stair tower, a very large screen."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    base(p, s, v, r, 9.0, WHITE, door=x1 - 6)
    p.box(WHITE, x0, 9, 0, x1, h, d)
    grid(p, x0, x1, 0, d, 10, h - 2, WHITE, 4.4, 2.6, 0.55, 2.8, 0.8, 'blr', body=False)
    for y in [9 + 4.4 * i for i in range(1, 10)]:
        band(p, 'flat:#d7d5cf', x0, x1, 0, d, y, y + 0.06, 0.03)
    curtain(p, x1 - 6.5, x1 - 0.6, -0.5, 3, 9, h + 3, GLASS_GN, ALU, 4.4, 1.45, 0.5, 2, 'flr')
    screen(p, 'screen', 'f', x0 + 1.6, x1 - 8.2, 16.5, 30.5, 0)
    board(p, 'name', 'f', x0 + 1.6, x1 - 8.2, 34.0, 38.5, 0, 'flat:#1a1c20', 0.2)
    for k in range(3):
        blade(s, x0 + 0.5, 9.5 + k * 7, 15.5 + k * 7, 0, 1.1, r=r)
    fascia(s, x0 + 2, x1 - 9, 10.2, 13.2, 0, '#c8102e')
    plant(p, x0, x1 - 7, h, 0, d, 5)
    roof_frame(p, 'roof', x0 + 2, x1 - 8, h, 1.2, 6.5, 'flat:#c8102e')


def denki(p, s, v, r):
    """An electronics store: red and white bands, the whole front given to boards, a corner screen."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    base(p, s, v, r, 5.6, 'flat:#d9d6cf', door=0.0, bay=4.2, awn=False)
    p.box('flat:#f2efe8', x0, 5.6, 0, x1, h, d)
    n = int((h - 6) / 5.2)
    for i in range(n):
        y = 5.6 + i * 5.2
        band(p, RED, x0, x1, 0, d, y + 4.4, y + 5.2, 0.12)
        for c in rows(x0 + 9.5, x1 - 0.5, 5.6):
            fascia(s, c - 2.6, c + 2.6, y + 0.5, y + 4.0, 0, r.choice(['#f4f1e8', '#f2c230', '#c8102e', '#1f5fa8']))
    ribbon(p, x0, x1, 0, d, 5.6, h, WHITE, 5.2, 1.6, 1.6, 4.5, 'blr', body=False)
    screen(p, 'screen', 'f', x0 + 0.8, x0 + 8.6, 12.0, 26.0, 0)
    board(p, 'name', 'f', x0 + 0.8, x0 + 8.6, 28.5, h - 1.5, 0, RED, 0.2)
    board(p, 'side', 'l', 2, d - 2, h - 9, h - 2, x0, RED, 0.15)
    plant(p, x0, x1, h, 0, d, 9)
    roof_frame(p, 'roof', x0 + 3, x1 - 3, h, 1.2, 7.5, RED)


def amuse(p, s, v, r):
    """An amusement tower: a floor of something on every level, each with its own band of signs."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    base(p, s, v, r, 5.0, 'flat:#2b2d31', door=-w / 4, bay=4.6)
    p.box('flat:#3a3d42', x0, 5, 0, x1, h, d)
    cols = ['#d94f8a', '#f2c230', '#0e8f9c', '#c8102e', '#7a3fa0', '#1f5fa8', '#e86a1c', '#1d8a4e']
    n = int((h - 6) / 4.4)
    for i in range(n):
        y = 5 + i * 4.4
        fascia(s, x0 + 3.2, x1 - 0.5, y + 0.4, y + 1.9, 0, cols[i % len(cols)])
        for c in rows(x0 + 3.2, x1 - 0.5, 3.0):
            quad(p, WINDOW, 'f', c - 1.3, c + 1.3, y + 2.1, y + 4.2, -0.03)
    grid(p, x0, x1, 0, d, 5, h - 1, WHITE, 4.4, 3.4, 1.4, 1.6, 1.4, 'blr', body=False)
    # A glazed lift shaft up the corner, and blade signs beside it.
    curtain(p, x0 - 0.1, x0 + 2.8, -0.6, 2.4, 5, h + 2.5, GLASS_BL, ALU, 4.4, 1.4, 0.4, 2, 'flr')
    for k in range(5):
        blade(s, x1 - 0.4, 6 + k * 7.4, 12.6 + k * 7.4, 0, 1.2, r=r)
    screen(p, 'screen', 'f', x0 + 4, x1 - 2.5, h - 9.5, h - 2.0, 0, 0.4)
    plant(p, x0, x1, h, 0, d, 13)
    # The roof: a caged court (netting on a steel frame).
    p.box(STEEL, x0 + 2, h + 6, d * 0.45, x1 - 2, h + 6.15, d - 2)
    for x in (x0 + 2, x1 - 2.15):
        for z in (d * 0.45, d - 2.15):
            p.box(STEEL, x, h, z, x + 0.15, h + 6, z + 0.15)
    for face, a0, a1, at in sides(x0 + 2, x1 - 2, d * 0.45, d - 2):
        quad(p, 'glassTint', face, a0, a1, h + 1.1, h + 6, at)


def hotel(p, s, v, r):
    """A business hotel: tile, a small window to every room, a sky restaurant under the roof sign."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    base(p, s, v, r, 8.0, 'flat:#5b4a3a', door=0.0, bay=5.6, awn=False)
    grid(p, x0, x1, 0, d, 8, h - 8, TILE, 3.1, 3.0, 1.5, 1.5, 1.0, frame=TILE_DK)
    piers(p, TILE_DK, 'f', x0, x1, 0, 8, h - 8, w, 0.6, 0.3)
    curtain(p, x0 + 0.4, x1 - 0.4, 0.4, d - 0.4, h - 8, h - 1, GLASS_BZ, BRASS, 3.5, 1.6, 0.5, 3)
    p.box(TILE_DK, x0, h - 1, 0, x1, h, d)
    # The porte-cochère.
    p.box(BRONZE, -7, 5.0, -4.5, 7, 5.5, 0)
    p.box('light', -6.6, 4.95, -4.2, 6.6, 5.0, -0.2)
    for sx in (-1, 1):
        p.box(BRONZE, sx * 6.6 - 0.25, 0, -4.3, sx * 6.6 + 0.25, 5.0, -3.8)
    board(p, 'name', 'f', -6.5, 6.5, 5.6, 7.2, -4.5, 'flat:#2a2018', 0.1)
    board(p, 'vertical', 'f', x1 - 2.6, x1 - 0.6, h * 0.45, h - 12, 0, 'flat:#f4f1e8', 0.3)
    plant(p, x0, x1, h, 0, d, 21)
    roof_frame(p, 'roof', x0 + 1.5, x1 - 1.5, h, 1.0, 5.5, 'flat:#1f3f7a')
    beacons(p, x0, x1, 0, d, h + 1.1)


def bank(p, s, v, r):
    """A bank's head office: a granite colonnade, bronze glass between stone fins."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(GRANITE, x0, 0, 1.6, x1, 12, d)
    for c in rows(x0, x1, 5.2):
        p.box(STONE_DK, c - 0.55, 0, 0, c + 0.55, 11, 1.1)
        if abs(c) > 3:
            quad(p, 'windowDim', 'f', c - 2.0, c + 2.0, 0.9, 9.5, 1.57, col=SHOP)
    p.box(STONE_DK, x0, 11, 0, x1, 12.4, d)
    doors(p, 0, 0, 1.6, 3.2, 3.4, BRASS)
    board(p, 'name', 'f', -7.5, 7.5, 11.2, 12.2, 0, 'flat:#2a2622', 0.06)
    curtain(p, x0 + 0.8, x1 - 0.8, 0.8, d - 0.8, 12.4, h - 4, GLASS_BZ, BRONZE, 4.0, 1.7, 1.2, 3)
    fins(p, STONE, x0 + 0.8, x1 - 0.8, 0.8, d - 0.8, 12.4, h - 2, 5.2, 0.7, 0.8)
    p.box(STONE, x0 + 0.4, h - 4, 0.4, x1 - 0.4, h, d - 0.4)
    service_back(p, x0, x1, d, 12, r)
    plant(p, x0 + 0.4, x1 - 0.4, h, 0.4, d - 0.4, 31)
    board(p, 'crown', 'f', -6, 6, h - 3.5, h - 0.6, 0.4, STONE, 0.08)


def shinbun(p, s, v, r):
    """A newspaper and broadcasting house: a grey curtain wall, a news ticker, a screen, a lattice aerial."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    base(p, s, v, r, 10.0, 'flat:#4a4f55', door=-w / 4, bay=5.6, awn=False)
    curtain(p, x0, x1, 0, d, 10, h * 0.62, 'flat:#44525c', ALU, 4.0, 1.55, 1.3, 3)
    curtain(p, x0 + 3, x1 - 3, 3, d - 3, h * 0.62, h, 'flat:#44525c', ALU, 4.0, 1.55, 1.3, 3)
    band(p, ALU, x0, x1, 0, d, h * 0.62 - 0.6, h * 0.62 + 0.6, 0.25)
    # The ticker: a band of lamps right across the front and round the corner.
    screen(p, 'ticker', 'f', x0 + 0.5, x1 - 0.5, 10.6, 12.2, 0, 0.35)
    screen(p, 'screen', 'f', 1.5, x1 - 1.5, 15.0, 24.0, 0)
    board(p, 'name', 'f', x0 + 1.5, 0, 15.5, 18.5, 0, 'flat:#f4f1e8', 0.2)
    plant(p, x0 + 3, x1 - 3, h, 3, d - 3, 41)
    mast(p, 0, h + 4.2, d * 0.52, 44, 5.0)
    p.cyl(WHITE, (x0 + 7, h * 0.62 + 2.0, d * 0.5), 0, 1.7, 0.5, seg=14)
    p.box(STEEL, x0 + 6.6, h * 0.62 + 0.6, d * 0.5 - 0.1, x0 + 6.8, h * 0.62 + 2, d * 0.5 + 0.1)
    helipad(p, x1 - 9.5, h + 4.2, d * 0.5, 5.2)


def office_a(p, s, v, r):
    """A blue glass tower: a tall lobby, a shaft in two stages, a finned crown."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(GRANITE, x0, 0, 0, x1, 1.0, d)
    curtain(p, x0 + 0.5, x1 - 0.5, 0.5, d - 0.5, 1.0, 13, GLASS_GN, ALU, 6.0, 2.4, 0.3, 2)
    doors(p, 0, 1.0, 0.5, 3.2, 3.0, ALU)
    p.box(ALU, -6, 4.6, -3.0, 6, 4.9, 0.5)
    board(p, 'name', 'f', -5.5, 5.5, 4.95, 5.9, -3.0, 'flat:#20262b', 0.06)
    band(p, ALU, x0, x1, 0, d, 13, 14, 0.2)
    curtain(p, x0, x1, 0, d, 14, h * 0.7, GLASS_BL, ALU, 4.1, 1.5, 1.0, 3)
    curtain(p, x0 + 2.5, x1 - 2.5, 2.5, d - 2.5, h * 0.7, h, GLASS_BL, ALU, 4.1, 1.5, 1.0, 3)
    fins(p, ALU, x0 + 2.5, x1 - 2.5, 2.5, d - 2.5, h - 10, h + 6, 3.0, 0.2, 0.9)
    service_back(p, x0, x1, d - 0.5, 13, r)
    plant(p, x0 + 3.5, x1 - 3.5, h, 3.5, d - 3.5, 51)
    beacons(p, x0 + 2.5, x1 - 2.5, 2.5, d - 2.5, h + 6)


def office_b(p, s, v, r):
    """A stone-grid tower stepping back twice, a brass-trimmed base with a bank hall."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    base(p, s, v, r, 9.0, STONE_DK, door=0.0, bay=5.6, awn=False)
    band(p, BRASS, x0, x1, 0, d, 8.6, 9.0, 0.22)
    a, b_ = h * 0.5, h * 0.8
    grid(p, x0, x1, 0, d, 9, a, STONE, 3.9, 2.8, 1.7, 2.3, 0.9, frame=STONE_DK)
    grid(p, x0 + 3, x1 - 3, 3, d - 3, a, b_, STONE, 3.9, 2.8, 1.7, 2.3, 0.9, frame=STONE_DK)
    grid(p, x0 + 6.5, x1 - 6.5, 6.5, d - 6.5, b_, h, STONE_LT, 3.9, 2.8, 1.7, 2.3, 0.9, frame=STONE_DK)
    for y, e in ((a, 0), (b_, 3), (h, 6.5)):
        band(p, STONE_DK, x0 + e, x1 - e, e, d - e, y - 0.6, y + 0.5, 0.25)
    board(p, 'name', 'f', -6.5, 6.5, 6.6, 8.2, 0, 'flat:#2a2622', 0.14)
    plant(p, x0 + 6.5, x1 - 6.5, h + 0.5, 6.5, d - 6.5, 61)
    beacons(p, x0 + 6.5, x1 - 6.5, 6.5, d - 6.5, h + 1.6)


def office_c(p, s, v, r):
    """A dark glass slab in a white frame."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    base(p, s, v, r, 6.0, WHITE, door=w / 4, bay=5.0)
    curtain(p, x0 + 1.2, x1 - 1.2, 0.4, d - 0.4, 6, h - 3, GLASS_DK, 'flat:#59626a', 3.9, 1.5, 0.9, 3)
    for x in (x0, x1 - 1.2):
        p.box(WHITE, x, 6, 0, x + 1.2, h, d)
    p.box(WHITE, x0, h - 3, 0, x1, h, d)
    for y in [6 + 15.6 * i for i in range(1, int((h - 9) / 15.6) + 1)]:
        band(p, WHITE, x0 + 1.2, x1 - 1.2, 0.4, d - 0.4, y, y + 0.5, 0.45)
    board(p, 'name', 'f', x0 + 2.5, x1 - 2.5, h - 2.6, h - 0.5, 0, WHITE, 0.05)
    plant(p, x0, x1, h, 0, d, 71)
    beacons(p, x0, x1, 0, d, h + 1.1)


def office_d(p, s, v, r):
    """A slim green-glass tower with rounded piers and a roof billboard."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    base(p, s, v, r, 7.0, 'flat:#6b6f72', door=-w / 4, bay=5.4)
    curtain(p, x0, x1, 0, d, 7, h, GLASS_GN, 'flat:#e9ece8', 3.8, 1.5, 1.1, 3)
    for face, a0, a1, at in sides(x0, x1, 0, d):
        for c in rows(a0, a1, 6.0):
            slab(p, 'flat:#e9ece8', face, c - 3.0 - 0.3, c - 3.0 + 0.3, 7, h + 1.2, at, 0.45)
        slab(p, 'flat:#e9ece8', face, a1 - 0.3, a1 + 0.3, 7, h + 1.2, at, 0.45)
    band(p, 'flat:#e9ece8', x0, x1, 0, d, h, h + 1.2, 0.45)
    plant(p, x0, x1, h + 1.2, 0, d, 81)
    roof_frame(p, 'roof', x0 + 1.5, x1 - 1.5, h + 1.2, 1.2, 8.0, 'flat:#f2c230')
    for k in range(2):
        blade(s, x0 + 0.5, 8 + k * 9, 16 + k * 9, 0, 1.0, r=r)


def termhotel(p, s, v, r):
    """The terminal hotel: cream stone, tall window strips between ribs, a glazed sky lounge."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    base(p, s, v, r, 10.0, STONE_DK, door=0.0, bay=5.6, awn=False)
    band(p, BRASS, x0, x1, 0, d, 9.6, 10.0, 0.2)
    p.box(STONE_LT, x0, 10, 0, x1, h - 9, d)
    n = int((h - 19) / 3.3)
    for face, a0, a1, at in sides(x0, x1, 0, d):
        for c in rows(a0 + 0.8, a1 - 0.8, 2.6):
            for i in range(n):
                quad(p, WINDOW, face, c - 0.75, c + 0.75, 10.9 + i * 3.3, 12.9 + i * 3.3, out(face, at, 0.03))
            slab(p, STONE, face, c - 1.3 - 0.16, c - 1.3 + 0.16, 10, h - 9, at, 0.3)
    curtain(p, x0 + 1, x1 - 1, 1, d - 1, h - 9, h - 1.5, GLASS_BZ, BRASS, 3.7, 1.6, 0.4, 3)
    p.box(STONE_LT, x0, h - 1.5, 0, x1, h, d)
    # The canopy over the hotel door, and its name board.
    p.box(BRONZE, -6.5, 4.6, -3.6, 6.5, 5.0, 0)
    p.box('light', -6.1, 4.55, -3.3, 6.1, 4.6, -0.2)
    board(p, 'name', 'f', -6, 6, 5.1, 6.4, -3.6, 'flat:#12382c', 0.08)
    board(p, 'crown', 'f', -8, 8, h - 13.6, h - 10.2, 0, STONE_LT, 0.2)
    plant(p, x0, x1, h, 0, d, 91)
    beacons(p, x0, x1, 0, d, h + 1.1)


def kaikan(p, s, v, r):
    """A theatre and cinema hall: a marquee of lamps, poster cases, a blank fly tower behind."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    base(p, s, v, r, 6.0, 'flat:#3a2b26', door=0.0, bay=5.2, awn=False)
    p.box('flat:#b7a48c', x0, 6, 0, x1, h - 10, d * 0.5)
    p.box('flat:#9a8a76', x0, 6, d * 0.5, x1, h, d)
    grid(p, x0, x1, 0, d * 0.5, 6, h - 11, WHITE, 4.6, 3.4, 1.2, 2.6, 1.0, 'lr', body=False)
    grid(p, x0, x1, d * 0.5, d, 6, h - 2, WHITE, 5.2, 5.0, 1.0, 1.2, 2.2, 'blr', body=False)
    # The marquee: a deep canopy edged with lamps, the house name on its front.
    p.box('flat:#5a1f1f', x0 + 1, 5.2, -3.2, x1 - 1, 6.4, 0)
    p.box('light', x0 + 1.2, 5.14, -3.0, x1 - 1.2, 5.2, -0.2)
    for c in rows(x0 + 1, x1 - 1, 0.6):
        p.box('light', c - 0.08, 6.4, -3.2, c + 0.08, 6.52, -3.08)
    board(p, 'name', 'f', x0 + 2, x1 - 2, 5.35, 6.25, -3.2, 'flat:#f4f1e8', 0.04)
    # Poster cases across the upper front, a long band for what is on.
    n = 5
    pw = (w - 3.0) / n
    for k in range(n):
        xa = x0 + 1.5 + k * pw
        slab(p, 'flat:#2a2018', 'f', xa + 0.2, xa + pw - 0.2, 8.0, 17.6, 0, 0.2)
        mark('poster%d' % k, xa + pw / 2, 12.8, -0.22, pw - 0.8, 9.0)
    board(p, 'band', 'f', x0 + 1.5, x1 - 1.5, 18.6, 21.4, 0, 'flat:#f4f1e8', 0.15)
    for k in range(2):
        blade(s, x1 - 0.4, 8 + k * 6.5, 14 + k * 6.5, 0, 1.0, r=r)
    plant(p, x0, x1, h - 10, 0, d * 0.5, 101)
    p.box(CONC, x0, h, d * 0.5, x1, h + 0.8, d)


def parking(p, s, v, r):
    """A mechanical car park: a ribbed metal tower, a turntable bay at its foot, a big P board."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box('flat:#b9bec2', x0, 0, 0, x1, h, d)
    for face, a0, a1, at in sides(x0, x1, 0, d):
        for c in rows(a0, a1, 0.9):
            slab(p, 'flat:#a3a9ae', face, c - 0.12, c + 0.12, 4.4, h, at, 0.08)
    p.box(DARK, x0 + 0.7, 0, -0.02, x1 - 0.7, 3.4, 0.4)
    p.box('flat:#e6a700', x0 + 0.5, 0, -0.06, x0 + 0.7, 3.5, 0.02)
    p.box('flat:#e6a700', x1 - 0.7, 0, -0.06, x1 - 0.5, 3.5, 0.02)
    p.box('flat:#e6a700', x0 + 0.5, 3.4, -0.06, x1 - 0.5, 3.6, 0.02)
    p.cyl('flat:#6f7377', (0, 0.03, -1.9), 1, 1.7, 0.06, seg=18)
    board(p, 'name', 'f', x0 + 0.6, x1 - 0.6, h - 6.5, h - 1.0, 0, 'flat:#1f5fae', 0.15)
    board(p, 'side', 'l', 1, d - 1, h - 6.5, h - 1.0, x0, 'flat:#1f5fae', 0.15)
    board(p, 'rates', 'f', x0 + 0.6, x1 - 0.6, 3.7, 4.3, 0, 'flat:#f4f1e8', 0.06)
    p.box(CONC, x0, h, 0, x1, h + 0.5, d)


FRONTS = [
    dict(id='vision', w=25.5, d=34.0, h=54.0, fn=vision), dict(id='denki', w=34.0, d=36.0, h=42.0, fn=denki),
    dict(id='amuse', w=23.0, d=30.0, h=46.0, fn=amuse), dict(id='hotel', w=23.6, d=30.0, h=96.0, fn=hotel),
    dict(id='bank', w=30.0, d=36.0, h=64.0, fn=bank), dict(id='shinbun', w=30.0, d=40.0, h=88.0, fn=shinbun),
    dict(id='office_a', w=30.0, d=36.0, h=148.0, fn=office_a), dict(id='office_b', w=34.0, d=40.0, h=118.0, fn=office_b),
    dict(id='office_c', w=23.5, d=34.0, h=92.0, fn=office_c), dict(id='office_d', w=24.0, d=34.0, h=76.0, fn=office_d),
    dict(id='termhotel', w=23.0, d=40.0, h=112.0, fn=termhotel), dict(id='kaikan', w=25.5, d=36.0, h=38.0, fn=kaikan),
    dict(id='parking', w=6.0, d=7.0, h=38.0, fn=parking),
]


def suji(p, s, v, r):
    """A front on Yanagi-suji, as on a grand boulevard of the 1930s–60s: a colonnaded street
    storey, a stone or glass block to a cornice at 31 m (the old height line), and on some a
    tower set back above it."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall, trim, glass = v['wall'], v['trim'], v.get('glass')
    LINE = min(h, 31.0)
    # The street storey: piers on the building line, the shop glass set back behind them.
    p.box(GRANITE, x0, 0, 1.5, x1, 6.4, d)
    n = max(2, round(w / 4.6))
    for k in range(n + 1):
        px = min(x1 - 0.45, max(x0 + 0.45, x0 + k * w / n))
        p.box(wall, px - 0.45, 0, 0, px + 0.45, 5.6, 1.5)
        p.box(GRANITE, px - 0.5, 0, -0.05, px + 0.5, 0.8, 1.55)
    p.box(wall, x0, 5.6, 0, x1, 6.4, 1.5)
    mid = n // 2
    for k in range(n):
        xa, xb = x0 + k * w / n + 0.5, x0 + (k + 1) * w / n - 0.5
        if k == mid:
            doors(p, (xa + xb) / 2, 0, 1.5, min(2.8, xb - xa - 0.4), 3.0, BRASS)
        else:
            quad(p, 'windowDim', 'f', xa, xb, 0.8, 4.6, 1.47, col=SHOP)
            p.box(BRASS, xa, 4.6, 1.38, xb, 4.72, 1.5)
        p.box('light', (xa + xb) / 2 - 0.6, 5.54, 0.5, (xa + xb) / 2 + 0.6, 5.6, 0.9)
    board(p, 'name', 'f', -min(4.2, w / 2 - 1), min(4.2, w / 2 - 1), 5.68, 6.32, 0, 'flat:#2a2622', 0.05)
    # The block to the height line.
    if glass:
        curtain(p, x0, x1, 0, d, 6.4, LINE - 1.2, glass, trim, 4.1, 1.5, 1.1, 3)
        fins(p, wall, x0, x1, 0, d, 6.4, LINE - 1.2, w / n, 0.5, 0.35, 'f')
    else:
        grid(p, x0, x1, 0, d, 6.4, LINE - 1.2, wall, 4.1, w / n / 2, 1.3, 2.5, 0.9, frame=trim)
        piers(p, trim, 'f', x0, x1, 0, 6.4, LINE - 1.2, w / n, 0.5, 0.25)
    p.box(wall, x0, LINE - 1.2, 0, x1, LINE, d)
    band(p, trim, x0, x1, 0, d, LINE - 0.5, LINE, 0.4)
    band(p, trim, x0, x1, 0, d, 6.4, 6.8, 0.2)
    service_back(p, x0, x1, d, 6.4, r)
    top = LINE
    if h > LINE + 6:
        e = 4.0
        if glass:
            curtain(p, x0 + 1, x1 - 1, e, d - 1, LINE, h, glass, trim, 4.1, 1.5, 1.0, 3)
        else:
            grid(p, x0 + 1, x1 - 1, e, d - 1, LINE, h, wall, 4.1, 3.0, 1.6, 2.3, 0.9, frame=trim)
        band(p, trim, x0 + 1, x1 - 1, e, d - 1, h - 0.5, h, 0.25)
        plant(p, x0 + 1, x1 - 1, h, e, d - 1, v['seed'])
        beacons(p, x0 + 1, x1 - 1, e, d - 1, h + 1.1)
        p.box(HEDGE, x0 + 1, LINE, 0.8, x1 - 1, LINE + 0.8, 1.8)
    else:
        plant(p, x0, x1, top, 0, d, v['seed'])


SUJI_V = [
    dict(id='suji_a', w=18.0, d=22.0, h=31.0, wall=STONE, trim=STONE_DK, seed=3),
    dict(id='suji_b', w=19.5, d=22.0, h=58.0, wall=WHITE, trim=ALU, glass=GLASS_GN, seed=5),
    dict(id='suji_c', w=13.5, d=22.0, h=74.0, wall=TILE, trim=TILE_DK, seed=7),
    dict(id='suji_d', w=13.5, d=22.0, h=31.0, wall=BRICK, trim=STONE_LT, seed=9),
    dict(id='suji_e', w=19.5, d=22.0, h=31.0, wall=STONE_LT, trim=BRONZE, glass=GLASS_BZ, seed=11),
    dict(id='suji_f', w=18.0, d=22.0, h=66.0, wall='flat:#b9b3a6', trim='flat:#6f6d66', seed=13),
    dict(id='suji_g', w=13.5, d=22.0, h=31.0, wall='flat:#e8e4d8', trim='flat:#3f6a5a', seed=15),
    dict(id='suji_h', w=13.5, d=22.0, h=52.0, wall=STONE_DK, trim=BRASS, glass=GLASS_BL, seed=17),
]
for _v in SUJI_V:
    _v['fn'] = suji


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    v['fn'](body, signs, v, random.Random(sum(map(ord, v['id']))))
    return body, signs


if __name__ == '__main__':
    run('kitafront', [dict(f, gap=10.0) for f in FRONTS + SUJI_V], build_hi, lambda v: None)
    write_anchors('kitafront')
