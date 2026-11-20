# Builds the props that dress shop fronts inside stations.
#
#   blender --background --python tools/blender/build_shops.py -- [--renders <dir>]
#
# Writes assets/buildings/shops.blend and public/models/buildings/shops.glb.
#
# Frame and helpers: see buildkit.py. One root per prop, shops_<id>, with one mesh; the origin is
# on the floor in the middle of the prop (wall-hung props: on the wall at their own height 0) and
# the front (the side a passer-by sees) looks along -z. src/stations/shopfronts.ts places them
# and mirrors SIZES. Goods are plain coloured blocks: no product or brand is copied.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

WHITE = 'flat:#f1f0ea'
GREY = 'flat:#c9cbcc'
DARK = 'flat:#2b2e33'
BLACK = 'flat:#17181b'
STEEL = 'flat:#aeb3b8'
TIMBER = 'flat:#5a4030'
TIMBER2 = 'flat:#7a5a3c'
PALE = 'flat:#c9a678'
PAPER = 'flat:#f3e6c4'
PACKS = ['flat:#d94f4f', 'flat:#e8c93a', 'flat:#2f6fb0', 'flat:#3f8f5a', 'flat:#f0efe8', 'flat:#e8791c', 'flat:#8b5fb0', 'flat:#d9a3b0',
         'flat:#7fc4c9', 'flat:#b8d06a']
BREAD = ['flat:#c98a4b', 'flat:#a8662f', 'flat:#e2b778', 'flat:#8a5a2b']
BOOKS = ['flat:#8a2b2b', 'flat:#1f4a7a', 'flat:#2f6b45', 'flat:#d9c9a0', 'flat:#3a3a44', 'flat:#b8732e', 'flat:#6d4a8a']
SWEETS = ['flat:#f2d16b', 'flat:#e9b7c4', 'flat:#8bbf7a', 'flat:#f4efe2', 'flat:#b5651d']
BLOOMS = ['flat:#e84a6f', 'flat:#f6d743', 'flat:#f08a24', 'flat:#b05cc8', 'flat:#f4f4f4']

# Footprint (along x, along z) and height. Shared with src/stations/shopfronts.ts (SIZE).
SIZES = {
    'lattice': (1.2, 0.06, 2.2), 'slidedoor': (1.0, 0.06, 2.1), 'lantern': (0.34, 0.5, 0.6), 'aboard': (0.55, 0.45, 1.0),
    'crates': (0.55, 0.4, 0.75), 'foodcase': (0.9, 0.35, 1.35), 'ticketm': (0.6, 0.4, 1.5), 'winbar': (1.6, 0.4, 1.05),
    'pendant': (0.3, 0.3, 0.7), 'showcase': (1.2, 0.5, 1.1), 'breadcase': (1.2, 0.4, 1.7), 'magrack': (1.0, 0.4, 1.3),
    'bookshelf': (1.2, 0.3, 2.0), 'wagon': (0.9, 0.5, 1.15), 'buckets': (1.2, 0.5, 0.95), 'plinth': (1.2, 0.3, 1.5),
    'priceboard': (0.7, 0.08, 1.2), 'desk': (1.4, 0.4, 1.25), 'brochure': (0.5, 0.3, 1.4), 'shelfunit': (1.2, 0.3, 1.8),
    'potcounter': (1.6, 0.4, 1.5), 'table': (1.5, 0.7, 0.85),
    'boltrack': (1.2, 0.35, 1.7), 'bolttable': (1.2, 0.5, 0.75), 'kimonostand': (1.4, 0.25, 1.8), 'conerack': (1.2, 0.3, 1.7),
    'clothsteps': (1.2, 0.4, 0.9), 'dyebar': (1.6, 0.45, 1.25),
    'win_bolts': (1.0, 0.11, 2.0), 'win_kimono': (1.0, 0.11, 2.0), 'win_cones': (1.0, 0.11, 2.0), 'win_cloths': (1.0, 0.11, 2.0),
    'win_swatch': (1.0, 0.11, 2.0), 'win_food': (1.0, 0.11, 2.0), 'win_goods': (1.0, 0.11, 2.0), 'win_books': (1.0, 0.11, 2.0),
    'cart': (1.7, 0.8, 2.1), 'lotto': (1.4, 1.0, 2.3), 'bentotable': (1.8, 0.7, 2.0),
}


def row(p, r, cols, x0, x1, y, z0, z1, h, wmin=0.08, wmax=0.2):
    x = x0
    while x < x1 - wmin:
        w = min(r.uniform(wmin, wmax), x1 - x)
        p.box(r.choice(cols), x, y, z0, x + w, y + h * r.uniform(0.65, 1.0), z1)
        x += w + r.uniform(0.004, 0.02)


def lattice(p):
    """Dark timber lattice over warm paper: one 1.2 m bay of an izakaya's front."""
    L, D, H = SIZES['lattice']
    p.box(PAPER, -L / 2, 0.5, -0.012, L / 2, H, 0)
    p.box(TIMBER, -L / 2, 0, -D, L / 2, 0.5, 0)
    p.box(TIMBER2, -L / 2, 0.46, -D - 0.01, L / 2, 0.5, 0)
    for k in range(13):
        x = -L / 2 + 0.02 + k * (L - 0.07) / 12
        p.box(TIMBER, x, 0.5, -D, x + 0.03, H, -0.012)
    for y in (1.1, 1.7, H - 0.04):
        p.box(TIMBER, -L / 2, y, -D - 0.004, L / 2, y + 0.04, -0.012)


def slidedoor(p):
    L, D, H = SIZES['slidedoor']
    p.box(TIMBER, -L / 2, 0, -D, -L / 2 + 0.06, H, 0)
    p.box(TIMBER, L / 2 - 0.06, 0, -D, L / 2, H, 0)
    p.box(TIMBER, -L / 2, H - 0.06, -D, L / 2, H, 0)
    p.box(TIMBER, -L / 2, 0, -D, L / 2, 0.3, -0.01)
    p.box(PAPER, -L / 2 + 0.06, 0.3, -0.02, L / 2 - 0.06, H - 0.06, -0.01)
    for x in (-0.15, 0.15):
        p.box(TIMBER, x - 0.012, 0.3, -D + 0.01, x + 0.012, H - 0.06, -0.02)
    for y in (0.9, 1.5):
        p.box(TIMBER, -L / 2 + 0.06, y, -D + 0.01, L / 2 - 0.06, y + 0.024, -0.02)
    p.box(BLACK, L / 2 - 0.14, 1.0, -D - 0.006, L / 2 - 0.1, 1.14, -D)


def lantern(p):
    """Red paper lantern on a bracket; the origin is on the wall at the bracket."""
    p.box(BLACK, -0.015, -0.015, -0.34, 0.015, 0.015, 0)
    p.box(BLACK, -0.006, -0.1, -0.306, 0.006, 0, -0.294)
    p.cyl(BLACK, (0, -0.12, -0.3), 1, 0.07, 0.04, seg=10)
    for k, (rr, hh) in enumerate([(0.12, 0.06), (0.16, 0.07), (0.17, 0.14), (0.16, 0.07), (0.12, 0.06)]):
        y = -0.14 - sum(q[1] for q in [(0.12, 0.06), (0.16, 0.07), (0.17, 0.14), (0.16, 0.07), (0.12, 0.06)][:k]) - hh / 2
        p.cyl('flat:#d6281e', (0, y, -0.3), 1, rr, hh, seg=12, caps=False)
    p.cyl(BLACK, (0, -0.56, -0.3), 1, 0.07, 0.04, seg=10)
    p.box(BLACK, -0.03, -0.44, -0.474, 0.03, -0.24, -0.47)


def aboard(p):
    """Folding pavement board."""
    L, D, H = SIZES['aboard']
    for s in (-1, 1):
        p.prism(TIMBER2, [(s * 0.02, H), (s * D / 2, 0), (s * (D / 2 - 0.03), 0), (s * 0.0, H - 0.04)], 'x', -L / 2, L / 2)
        z0, z1 = s * 0.06, s * (D / 2 - 0.045)
        p.face(BLACK, [(-L / 2 + 0.04, 0.9, s * 0.045 + s * 0.012), (L / 2 - 0.04, 0.9, s * 0.045 + s * 0.012),
                       (L / 2 - 0.04, 0.2, s * 0.183 + s * 0.012), (-L / 2 + 0.04, 0.2, s * 0.183 + s * 0.012)], (0, 0.2, s))
        for k, y in enumerate((0.75, 0.6, 0.45)):
            zz = s * (0.045 + (0.9 - y) * 0.197 + 0.016)
            p.box(WHITE if k else 'flat:#e8c93a', -L / 2 + 0.1, y, min(zz, zz + s * 0.002), L / 2 - 0.1 - k * 0.08, y + 0.05, max(zz, zz + s * 0.002))


def crates(p):
    cols = ['flat:#e8c93a', 'flat:#2f6fb0', 'flat:#d94f4f']
    for k in range(3):
        y = k * 0.25
        dx = (k % 2) * 0.03
        p.box(cols[k], -0.26 + dx, y, -0.19, 0.26 + dx, y + 0.23, 0.19)
        p.box(BLACK, -0.2 + dx, y + 0.08, -0.192, 0.2 + dx, y + 0.16, -0.19)


def foodcase(p):
    """Glass case of sample dishes on stepped shelves."""
    r = random.Random(4)
    L, D, H = SIZES['foodcase']
    p.box(TIMBER, -L / 2, 0, -D / 2, L / 2, 0.55, D / 2)
    p.box(WHITE, -L / 2 + 0.02, 0.55, D / 2 - 0.02, L / 2 - 0.02, H, D / 2)
    for k in range(3):
        y = 0.6 + k * 0.24
        z = -D / 2 + 0.04 + k * 0.08
        p.box(GREY, -L / 2 + 0.03, y - 0.02, z, L / 2 - 0.03, y, D / 2 - 0.02)
        for i in range(4):
            x = -L / 2 + 0.08 + i * 0.2
            p.cyl(r.choice(['flat:#f0efe8', 'flat:#3a2a20', 'flat:#2f4a6a']), (x + 0.06, y + 0.012, z + 0.07), 1, 0.07, 0.024, seg=8)
            p.cyl(r.choice(['flat:#c9a46a', 'flat:#e8791c', 'flat:#8b3a1e', 'flat:#e8d9a0']), (x + 0.06, y + 0.03, z + 0.07), 1, 0.05, 0.02, seg=8)
    p.box(TIMBER, -L / 2, H, -D / 2, L / 2, H + 0.04, D / 2)
    for sx in (-L / 2, L / 2 - 0.02):
        p.box(TIMBER, sx, 0.55, -D / 2, sx + 0.02, H, D / 2)
    p.box('glassTint', -L / 2 + 0.02, 0.55, -D / 2, L / 2 - 0.02, H, -D / 2 + 0.008)


def ticketm(p):
    """Meal-ticket machine: rows of buttons, a coin slot."""
    r = random.Random(6)
    L, D, H = SIZES['ticketm']
    f = -D / 2
    p.box(DARK, -L / 2 + 0.02, 0, f + 0.03, L / 2 - 0.02, 0.08, D / 2)
    p.box('flat:#d9dcdf', -L / 2, 0.08, f, L / 2, H, D / 2)
    p.box('flat:#c62828', -L / 2, H - 0.14, f - 0.004, L / 2, H, f)
    for k in range(5):
        for i in range(5):
            p.box(r.choice(['flat:#f3efe0', 'flat:#f3efe0', 'flat:#e8c93a', 'flat:#e2574c']), -0.25 + i * 0.1, 0.78 + k * 0.1, f - 0.006, -0.17 + i * 0.1, 0.85 + k * 0.1, f)
    p.box(BLACK, -0.2, 0.62, f - 0.006, -0.02, 0.66, f)
    p.box(BLACK, 0.06, 0.6, f - 0.006, 0.22, 0.7, f)
    p.box(BLACK, -0.2, 0.3, f - 0.02, 0.2, 0.42, f)


def stool(p, x, z):
    p.cyl(STEEL, (x, 0.02, z), 1, 0.14, 0.03, seg=10)
    p.cyl(STEEL, (x, 0.3, z), 1, 0.02, 0.56, seg=6)
    p.cyl(TIMBER2, (x, 0.6, z), 1, 0.15, 0.05, seg=12)


def winbar(p):
    """Window bar seen through the glass: a counter along the front with two stools behind it."""
    L, D, H = SIZES['winbar']
    p.box(PALE, -L / 2, 1.0, -D / 2, L / 2, H, -D / 2 + 0.3)
    for sx in (-L / 2 + 0.05, L / 2 - 0.09):
        p.box(DARK, sx, 0, -D / 2 + 0.05, sx + 0.04, 1.0, -D / 2 + 0.09)
    for x in (-0.4, 0.4):
        stool(p, x, D / 2 - 0.02)
        p.cyl(WHITE, (x - 0.1, H + 0.045, -D / 2 + 0.14), 1, 0.035, 0.09, seg=8)


def pendant(p):
    """Pendant lamp; the origin is on the ceiling."""
    p.cyl(BLACK, (0, -0.2, 0), 1, 0.006, 0.4, seg=4)
    p.cyl(BLACK, (0, -0.47, 0), 1, 0.13, 0.14, seg=10, caps=False)
    p.cyl('light', (0, -0.535, 0), 1, 0.11, 0.01, seg=10)


def showcase(p, cols=SWEETS):
    """Glass counter case of sweets or boxed food."""
    r = random.Random(8)
    L, D, H = SIZES['showcase']
    p.box(WHITE, -L / 2, 0, -D / 2 + 0.03, L / 2, 0.35, D / 2)
    p.box(DARK, -L / 2, 0, -D / 2, L / 2, 0.08, -D / 2 + 0.03)
    for k in range(2):
        y = 0.4 + k * 0.3
        p.box(GREY, -L / 2 + 0.03, y - 0.02, -D / 2 + 0.03, L / 2 - 0.03, y, D / 2 - 0.05)
        row(p, r, cols, -L / 2 + 0.06, L / 2 - 0.06, y, -D / 2 + 0.06, D / 2 - 0.12, 0.14, 0.1, 0.18)
    p.box(WHITE, -L / 2, 0.35, D / 2 - 0.04, L / 2, H - 0.04, D / 2)
    p.box(STEEL, -L / 2, H - 0.04, -D / 2, L / 2, H, D / 2)
    for sx in (-L / 2, L / 2 - 0.02):
        p.box(STEEL, sx, 0.35, -D / 2, sx + 0.02, H - 0.04, D / 2)
    p.box('glassTint', -L / 2 + 0.02, 0.35, -D / 2, L / 2 - 0.02, H - 0.04, -D / 2 + 0.008)
    p.box('light', -L / 2 + 0.05, H - 0.06, -D / 2 + 0.03, L / 2 - 0.05, H - 0.045, -D / 2 + 0.1)


def breadcase(p):
    r = random.Random(9)
    L, D, H = SIZES['breadcase']
    p.box(TIMBER2, -L / 2, 0, -D / 2 + 0.04, L / 2, 0.5, D / 2)
    p.box(PALE, -L / 2, 0.5, D / 2 - 0.03, L / 2, H, D / 2)
    for sx in (-L / 2, L / 2 - 0.03):
        p.box(PALE, sx, 0.5, -D / 2, sx + 0.03, H, D / 2)
    for k in range(4):
        y = 0.54 + k * 0.28
        p.prism(PALE, [(-D / 2, y - 0.04), (D / 2 - 0.03, y + 0.02), (D / 2 - 0.03, y + 0.04), (-D / 2, y - 0.02)], 'x', -L / 2 + 0.03, L / 2 - 0.03)
        for i in range(5):
            x = -L / 2 + 0.1 + i * 0.21
            p.cyl(r.choice(BREAD), (x + 0.04, y + 0.06, -0.02), 0, 0.055, 0.16, seg=8)
    p.box(PALE, -L / 2, H, -D / 2, L / 2, H + 0.03, D / 2)


def magrack(p):
    """Stepped magazine rack that stands outside a bookshop."""
    r = random.Random(10)
    L, D, H = SIZES['magrack']
    p.box(DARK, -L / 2, 0, -D / 2, L / 2, 0.1, D / 2)
    p.prism(WHITE, [(-D / 2, 0.1), (D / 2, 0.1), (D / 2, H), (D / 2 - 0.06, H)], 'x', -L / 2, L / 2)
    for k in range(4):
        y = 0.16 + k * 0.28
        z = -D / 2 + 0.02 + k * 0.075
        p.box(GREY, -L / 2, y, z - 0.03, L / 2, y + 0.02, z + 0.06)
        x = -L / 2 + 0.03
        while x < L / 2 - 0.2:
            p.box(r.choice(PACKS + BOOKS), x, y + 0.02, z, x + 0.2, y + 0.27, z + 0.02)
            x += 0.215


def bookshelf(p):
    r = random.Random(12)
    L, D, H = SIZES['bookshelf']
    p.box(TIMBER2, -L / 2, 0, D / 2 - 0.02, L / 2, H, D / 2)
    for sx in (-L / 2, L / 2 - 0.03):
        p.box(TIMBER2, sx, 0, -D / 2, sx + 0.03, H, D / 2)
    for k in range(7):
        y = 0.08 + k * 0.28
        p.box(TIMBER2, -L / 2, y - 0.025, -D / 2, L / 2, y, D / 2)
        if k < 6:
            row(p, r, BOOKS, -L / 2 + 0.04, L / 2 - 0.04, y, -D / 2 + 0.03, D / 2 - 0.03, 0.24, 0.025, 0.06)


def shelfunit(p):
    r = random.Random(14)
    L, D, H = SIZES['shelfunit']
    p.box(WHITE, -L / 2, 0, D / 2 - 0.02, L / 2, H, D / 2)
    p.box(DARK, -L / 2, 0, -D / 2, L / 2, 0.1, D / 2)
    for k in range(5):
        y = 0.14 + k * 0.33
        p.box(GREY, -L / 2, y - 0.02, -D / 2, L / 2, y, D / 2)
        row(p, r, PACKS, -L / 2 + 0.02, L / 2 - 0.02, y, -D / 2 + 0.03, D / 2 - 0.04, 0.26, 0.08, 0.18)


def wagon(p):
    """Wire wagon piled with boxed goods, a price card above."""
    r = random.Random(16)
    L, D, H = SIZES['wagon']
    for sx in (-L / 2 + 0.03, L / 2 - 0.05):
        for sz in (-D / 2 + 0.03, D / 2 - 0.05):
            p.box(STEEL, sx, 0.06, sz, sx + 0.02, 0.75, sz + 0.02)
            p.cyl(BLACK, (sx + 0.01, 0.03, sz + 0.01), 0, 0.03, 0.02, seg=8)
    for y in (0.2, 0.55):
        p.box(STEEL, -L / 2, y, -D / 2, L / 2, y + 0.02, D / 2)
        p.box(STEEL, -L / 2, y, -D / 2, L / 2, y + 0.16, -D / 2 + 0.01)
    for y, hh in ((0.22, 0.26), (0.57, 0.3)):
        for z0 in (-D / 2 + 0.03, 0.0):
            row(p, r, PACKS, -L / 2 + 0.04, L / 2 - 0.04, y, z0, z0 + D / 2 - 0.04, hh, 0.12, 0.24)
    p.box(STEEL, -0.01, 0.75, D / 2 - 0.04, 0.01, 1.0, D / 2 - 0.02)
    p.box('flat:#e8c93a', -0.22, 0.95, D / 2 - 0.05, 0.22, H, D / 2 - 0.04)
    p.box('flat:#c62828', -0.16, 1.0, D / 2 - 0.054, 0.1, 1.09, D / 2 - 0.05)


def buckets(p):
    """Flower buckets on a two-step stand."""
    r = random.Random(18)
    L, D, H = SIZES['buckets']
    p.box(TIMBER, -L / 2, 0, 0, L / 2, 0.3, D / 2)
    for step, (z, y) in enumerate(((-D / 4, 0), (D / 4, 0.3))):
        for i in range(4):
            x = -L / 2 + 0.16 + i * 0.3
            p.cyl('flat:#5b6a70' if (i + step) % 2 else 'flat:#2b2e33', (x, y + 0.16, z), 1, 0.11, 0.32, seg=8)
            p.cyl('flat:#2f6b35', (x, y + 0.42, z), 1, 0.1, 0.2, seg=7)
            col = r.choice(BLOOMS)
            for a in range(5):
                ang = a * 1.257 + i
                p.cyl(col, (x + 0.07 * math.cos(ang), y + 0.56 + 0.02 * (a % 2), z + 0.07 * math.sin(ang)), 1, 0.05, 0.07, seg=6)


def plinth(p):
    """Window display: goods on plinths of three heights."""
    r = random.Random(20)
    L, D, H = SIZES['plinth']
    for i, hh in enumerate((0.5, 0.9, 0.7)):
        x = -L / 2 + 0.02 + i * 0.4
        p.box(WHITE, x, 0, -D / 2, x + 0.36, hh, D / 2)
        p.box(r.choice(PACKS), x + 0.08, hh, -0.08, x + 0.28, hh + r.uniform(0.2, 0.4), 0.08)
        p.cyl(r.choice(SWEETS), (x + 0.18, hh + 0.5, 0), 1, 0.06, 0.12, seg=8)


def priceboard(p):
    """Lit price board on a wall (the wall at +z); the origin is at its foot on the wall."""
    L, D, H = SIZES['priceboard']
    p.box(BLACK, -L / 2, 0, -D, L / 2, H, 0)
    p.box('flat:#f6efe0', -L / 2 + 0.03, 0.03, -D - 0.004, L / 2 - 0.03, H - 0.03, -D)
    p.box('flat:#7b1fa2', -L / 2 + 0.03, H - 0.25, -D - 0.008, L / 2 - 0.03, H - 0.03, -D - 0.004)
    for k in range(5):
        y = 0.1 + k * 0.16
        p.box(BLACK, -L / 2 + 0.08, y, -D - 0.008, 0.02, y + 0.05, -D - 0.004)
        p.box('flat:#c62828', 0.08, y, -D - 0.008, L / 2 - 0.08, y + 0.07, -D - 0.004)


def desk(p):
    """Service counter seen through the glass: desk, screen, a chair in front."""
    L, D, H = SIZES['desk']
    p.box(WHITE, -L / 2, 0, D / 2 - 0.3, L / 2, 0.75, D / 2)
    p.box(PALE, -L / 2 - 0.02, 0.75, D / 2 - 0.34, L / 2 + 0.02, 0.79, D / 2)
    p.box(BLACK, 0.2, 0.79, D / 2 - 0.12, 0.22, 0.95, D / 2 - 0.1)
    p.box(BLACK, 0.0, 0.92, D / 2 - 0.13, 0.42, H - 0.05, D / 2 - 0.11)
    p.box('flat:#1f6fd0', 0.02, 0.94, D / 2 - 0.134, 0.4, H - 0.07, D / 2 - 0.13)
    p.cyl(DARK, (-0.3, 0.02, -D / 2 + 0.16), 1, 0.16, 0.03, seg=8)
    p.cyl(STEEL, (-0.3, 0.22, -D / 2 + 0.16), 1, 0.02, 0.4, seg=6)
    p.box('flat:#2f4a6a', -0.5, 0.42, -D / 2, -0.1, 0.48, -D / 2 + 0.32)
    p.box('flat:#2f4a6a', -0.5, 0.48, -D / 2, -0.1, 0.9, -D / 2 + 0.05)


def brochure(p):
    r = random.Random(22)
    L, D, H = SIZES['brochure']
    p.box(DARK, -L / 2, 0, -D / 2, L / 2, 0.06, D / 2)
    p.prism(WHITE, [(-D / 2 + 0.04, 0.06), (D / 2, 0.06), (D / 2, H), (D / 2 - 0.05, H)], 'x', -L / 2, L / 2)
    for k in range(4):
        y = 0.25 + k * 0.28
        z = -D / 2 + 0.07 + k * 0.045
        for i in range(3):
            x = -L / 2 + 0.03 + i * 0.155
            p.box(r.choice(PACKS), x, y, z, x + 0.13, y + 0.24, z + 0.012)


def potcounter(p):
    """Noodle bar seen from the front: a timber counter, two steaming pots and a row of bowls behind."""
    L, D, H = SIZES['potcounter']
    p.box(TIMBER, -L / 2, 0, -D / 2, L / 2, 0.98, -D / 2 + 0.06)
    p.box(PALE, -L / 2, 0.98, -D / 2 - 0.04, L / 2, 1.03, -D / 2 + 0.22)
    p.box(STEEL, -L / 2, 0, D / 2 - 0.16, L / 2, 0.9, D / 2)
    for x in (-0.45, 0.2):
        p.cyl(STEEL, (x, 1.05, D / 2 - 0.08), 1, 0.14, 0.3, seg=10)
        p.cyl('flat:#e9ecea', (x, 1.21, D / 2 - 0.08), 1, 0.12, 0.004, seg=10)
    for i in range(5):
        p.cyl('flat:#2f4a6a' if i % 2 else WHITE, (-0.6 + i * 0.3, 1.065, -D / 2 + 0.09), 1, 0.07, 0.07, seg=8)
    for x in (-0.5, 0.5):
        stool(p, x, -D / 2 - 0.26)
    p.box(STEEL, -L / 2, 1.42, D / 2 - 0.2, L / 2, H, D / 2)


def table(p):
    """Round cafe table with a chair either side (along x)."""
    p.cyl(DARK, (0, 0.02, 0), 1, 0.2, 0.03, seg=10)
    p.cyl(DARK, (0, 0.36, 0), 1, 0.025, 0.68, seg=6)
    p.cyl(PALE, (0, 0.72, 0), 1, 0.34, 0.04, seg=14)
    p.cyl(WHITE, (0.1, 0.78, 0.05), 1, 0.035, 0.08, seg=8)
    for s in (-1, 1):
        x = s * 0.55
        for lx in (x - 0.15, x + 0.13):
            for lz in (-0.15, 0.13):
                p.box(DARK, lx, 0, lz, lx + 0.02, 0.44, lz + 0.02)
        p.box(TIMBER2, x - 0.17, 0.44, -0.17, x + 0.17, 0.48, 0.17)
        xa, xb = sorted((x + s * 0.15, x + s * 0.17))
        p.box(TIMBER2, xa, 0.48, -0.17, xb, 0.85, 0.17)


CLOTH = ['flat:#1d2c50', 'flat:#b4472f', 'flat:#f1e4c8', 'flat:#2f6fb0', 'flat:#c9962e', 'flat:#6b8f3a', 'flat:#c75b7a', 'flat:#3b2a4a',
         'flat:#7a1f2b', 'flat:#5f8f8a']


def bolt(p, col, x, y, z, length, r=0.055, axis=0):
    """A bolt of cloth: a roll with a pale core showing at the ends."""
    p.cyl(col, (x, y, z), axis, r, length, seg=8)
    p.cyl('flat:#e9e1c9', (x, y, z), axis, r * 0.4, length + 0.012, seg=6)


def boltrack(p):
    """Open shelves of cloth bolts lying on their sides, against a wall (the wall at +z)."""
    r = random.Random(31)
    L, D, H = SIZES['boltrack']
    p.box(TIMBER2, -L / 2, 0, D / 2 - 0.02, L / 2, H, D / 2)
    for sx in (-L / 2, -0.015, L / 2 - 0.03):
        p.box(TIMBER2, sx, 0, -D / 2, sx + 0.03, H, D / 2)
    for k in range(6):
        y = 0.06 + k * 0.28
        p.box(TIMBER2, -L / 2, y - 0.025, -D / 2, L / 2, y, D / 2)
        if k == 5:
            break
        for half in (-1, 1):
            x0 = -L / 2 + 0.05 if half < 0 else 0.03
            for i in range(4):
                for j in range(2):
                    bolt(p, r.choice(CLOTH), x0 + 0.07 + i * 0.13, y + 0.06 + j * 0.11, 0.0, D - 0.06, 0.052, axis=2)


def bolttable(p):
    """Low display table on a tatami step: bolts unrolled across it."""
    r = random.Random(33)
    L, D, H = SIZES['bolttable']
    p.box('flat:#b8a66a', -L / 2, 0, -D / 2, L / 2, 0.12, D / 2)
    p.box(BLACK, -L / 2, 0.1, -D / 2 - 0.004, L / 2, 0.12, -D / 2)
    p.box(TIMBER, -L / 2 + 0.1, 0.12, -D / 2 + 0.08, L / 2 - 0.1, 0.42, D / 2 - 0.08)
    for i in range(4):
        x = -L / 2 + 0.24 + i * 0.25
        col = r.choice(CLOTH)
        bolt(p, col, x, 0.48, D / 2 - 0.16, 0.2, 0.055, axis=0)
        p.box(col, x - 0.1, 0.42, -D / 2 + 0.06, x + 0.1, 0.428, D / 2 - 0.16)
        p.box(col, x - 0.1, 0.2, -D / 2 + 0.05, x + 0.1, 0.428, -D / 2 + 0.06)


def kimonostand(p):
    """A kimono spread on a T-stand, facing -z."""
    x, z, h = 0, 0.05, 1.8
    p.box(DARK, x - 0.2, 0, z - 0.12, x + 0.2, 0.03, z + 0.12)
    p.box(TIMBER, x - 0.015, 0.03, z, x + 0.015, h, z + 0.03)
    p.box(TIMBER, x - 0.66, h - 0.04, z, x + 0.66, h, z + 0.03)
    p.box('flat:#7a1f2b', x - 0.3, 0.42, z - 0.02, x + 0.3, h - 0.03, z)
    p.box('flat:#7a1f2b', x - 0.66, h - 0.52, z - 0.016, x + 0.66, h - 0.03, z - 0.002)
    p.box('flat:#f1e4c8', x - 0.31, 1.0, z - 0.03, x + 0.31, 1.2, z - 0.02)
    p.box('flat:#f1e4c8', x - 0.05, h - 0.3, z - 0.024, x + 0.05, h - 0.03, z - 0.02)


def conerack(p):
    """Pegboard of thread cones over drawers, against a wall (the wall at +z)."""
    r = random.Random(35)
    L, D, H = SIZES['conerack']
    p.box(TIMBER2, -L / 2, 0, -D / 2, L / 2, 0.6, D / 2)
    for i in range(4):
        for j in range(2):
            x = -L / 2 + 0.04 + i * 0.29
            p.box(PALE, x, 0.06 + j * 0.27, -D / 2 - 0.006, x + 0.25, 0.3 + j * 0.27, -D / 2)
            p.box(BLACK, x + 0.1, 0.16 + j * 0.27, -D / 2 - 0.016, x + 0.15, 0.19 + j * 0.27, -D / 2 - 0.006)
    p.box(PALE, -L / 2, 0.6, D / 2 - 0.03, L / 2, H, D / 2)
    for k in range(4):
        y = 0.72 + k * 0.25
        p.box(TIMBER2, -L / 2, y - 0.02, -0.02, L / 2, y, D / 2 - 0.03)
        for i in range(7):
            x = -L / 2 + 0.1 + i * 0.167
            col = r.choice(CLOTH)
            p.cyl(col, (x, y + 0.05, 0.05), 1, 0.05, 0.1, seg=7)
            p.cyl(col, (x, y + 0.13, 0.05), 1, 0.03, 0.07, seg=7)


def clothsteps(p):
    """Folded cloths on three steps."""
    r = random.Random(37)
    L, D, H = SIZES['clothsteps']
    for k in range(3):
        y = 0.3 + k * 0.25
        z0 = -D / 2 + k * (D / 3)
        p.box(TIMBER2, -L / 2, 0, z0, L / 2, y, D / 2)
        for i in range(4):
            x = -L / 2 + 0.06 + i * 0.285
            for j in range(r.randint(1, 3)):
                p.box(r.choice(CLOTH), x, y + j * 0.035, z0 + 0.012, x + 0.23, y + 0.03 + j * 0.035, z0 + D / 3 - 0.012)


def dyebar(p):
    """Dye counter: jars of colour in a row."""
    L, D, H = SIZES['dyebar']
    p.box(TIMBER, -L / 2, 0, -D / 2, L / 2, 0.95, -D / 2 + 0.06)
    p.box(TIMBER, -L / 2, 0, -D / 2 + 0.06, L / 2, 0.9, D / 2)
    p.box(PALE, -L / 2 - 0.02, 0.95, -D / 2 - 0.04, L / 2 + 0.02, 1.0, D / 2)
    cols = ['flat:#0f1f3d', 'flat:#2b4f86', 'flat:#6f98c4', 'flat:#8f2d1d', 'flat:#d06a3c', 'flat:#d9a63a', 'flat:#6b8f3a']
    for i, col in enumerate(cols):
        x = -L / 2 + 0.16 + i * 0.213
        p.cyl(col, (x, 1.09, 0.02), 1, 0.07, 0.17, seg=9)
        p.cyl('flat:#d9dcdf', (x, 1.19, 0.02), 1, 0.075, 0.03, seg=9)


def winframe(p):
    """Back of a show window on a wall (the wall at +z): a lit pale panel and a low plinth."""
    p.box('flat:#f6efe0', -0.5, 0.3, -0.006, 0.5, 2.0, 0)
    p.box(TIMBER2, -0.5, 0.3, -0.1, 0.5, 0.36, -0.006)
    p.box('light', -0.45, 1.97, -0.06, 0.45, 1.985, -0.01)


def win_bolts(p):
    r = random.Random(41)
    winframe(p)
    for i in range(6):
        x = -0.38 + i * 0.15
        h = r.uniform(0.9, 1.25)
        p.cyl(r.choice(CLOTH), (x, 0.36 + h / 2, -0.055), 1, 0.045, h, seg=7)
        p.cyl('flat:#e9e1c9', (x, 0.36 + h + 0.004, -0.055), 1, 0.02, 0.008, seg=6)
    p.box(r.choice(CLOTH), -0.42, 1.5, -0.014, 0.42, 1.9, -0.006)
    p.box(TIMBER, -0.44, 1.9, -0.03, 0.44, 1.93, -0.006)


def win_kimono(p):
    winframe(p)
    p.box(TIMBER, -0.47, 1.86, -0.04, 0.47, 1.9, -0.01)
    p.box(TIMBER, -0.012, 0.36, -0.03, 0.012, 1.86, -0.01)
    p.box('flat:#7a1f2b', -0.24, 0.6, -0.05, 0.24, 1.86, -0.03)
    p.box('flat:#7a1f2b', -0.47, 1.4, -0.046, 0.47, 1.86, -0.034)
    p.box('flat:#c9962e', -0.25, 1.05, -0.06, 0.25, 1.22, -0.05)
    p.box('flat:#f1e4c8', -0.04, 1.6, -0.054, 0.04, 1.86, -0.05)


def win_cones(p):
    r = random.Random(43)
    winframe(p)
    for k in range(3):
        y = 0.75 + k * 0.42
        p.box(TIMBER2, -0.45, y - 0.02, -0.1, 0.45, y, -0.006)
        for i in range(6):
            x = -0.37 + i * 0.148
            col = r.choice(CLOTH)
            p.cyl(col, (x, y + 0.05, -0.055), 1, 0.045, 0.1, seg=7)
            p.cyl(col, (x, y + 0.13, -0.055), 1, 0.027, 0.07, seg=7)
    for i in range(4):
        p.box(r.choice(CLOTH), -0.36 + i * 0.2, 0.4, -0.04, -0.24 + i * 0.2, 0.66, -0.012)


def win_cloths(p):
    r = random.Random(45)
    winframe(p)
    for k in range(2):
        y = 0.36 + k * 0.22
        p.box(TIMBER2, -0.45, y, -0.1 + k * 0.045, 0.45, y + 0.2, -0.006)
        for i in range(3):
            x = -0.4 + i * 0.29
            for j in range(2):
                p.box(r.choice(CLOTH), x, y + 0.2 + j * 0.03, -0.095 + k * 0.045, x + 0.24, y + 0.228 + j * 0.03, -0.012)
    for i, col in enumerate(('flat:#b4472f', 'flat:#2f6fb0', 'flat:#c9962e')):
        x = -0.3 + i * 0.3
        p.box(col, x - 0.13, 1.3, -0.014, x + 0.13, 1.82, -0.006)
        p.box('flat:#f1e4c8', x - 0.05, 1.5, -0.018, x + 0.05, 1.6, -0.014)


def win_swatch(p):
    winframe(p)
    rows = [['flat:#0f1f3d', 'flat:#1b3560', 'flat:#2b4f86', 'flat:#3f6fa8', 'flat:#6f98c4'], ['flat:#6e1f14', 'flat:#8f2d1d', 'flat:#b4472f', 'flat:#d06a3c', 'flat:#d9a63a'],
            ['flat:#3d4a1f', 'flat:#6b8f3a', 'flat:#9fb86a', 'flat:#c9d6a0', 'flat:#e8e2c0']]
    for k, cols in enumerate(rows):
        for i, col in enumerate(cols):
            x = -0.43 + i * 0.175
            p.box(col, x, 0.95 + k * 0.32, -0.014, x + 0.15, 1.22 + k * 0.32, -0.006)
    for i in range(3):
        p.cyl(rows[i][2], (-0.25 + i * 0.25, 0.45, -0.055), 1, 0.045, 0.18, seg=8)


def win_food(p):
    """Sample dishes on three shelves."""
    r = random.Random(47)
    winframe(p)
    for k in range(3):
        y = 0.7 + k * 0.42
        p.box(TIMBER2, -0.45, y - 0.02, -0.1, 0.45, y, -0.006)
        for i in range(4):
            x = -0.33 + i * 0.22
            p.cyl(r.choice(['flat:#f0efe8', 'flat:#3a2a20', 'flat:#2f4a6a']), (x, y + 0.012, -0.055), 1, 0.045, 0.024, seg=8)
            p.cyl(r.choice(['flat:#c9a46a', 'flat:#e8791c', 'flat:#8b3a1e', 'flat:#e8d9a0', 'flat:#6aa84f']), (x, y + 0.035, -0.055), 1, 0.032, 0.026, seg=8)
            p.box(WHITE, x - 0.04, y - 0.075, -0.104, x + 0.04, y - 0.025, -0.1)


def win_goods(p):
    """Boxed goods on plinths of three heights."""
    r = random.Random(49)
    winframe(p)
    for i, hh in enumerate((0.75, 1.15, 0.95)):
        x = -0.42 + i * 0.29
        p.box(WHITE, x, 0.36, -0.1, x + 0.26, hh, -0.01)
        p.box(r.choice(PACKS), x + 0.04, hh, -0.085, x + 0.22, hh + r.uniform(0.2, 0.34), -0.025)
        p.box(r.choice(SWEETS), x + 0.08, hh + 0.36, -0.07, x + 0.18, hh + 0.48, -0.03)
    p.box(r.choice(PACKS), -0.4, 1.72, -0.014, 0.4, 1.92, -0.006)


def win_books(p):
    """Books face out on three ledges."""
    r = random.Random(51)
    winframe(p)
    for k in range(3):
        y = 0.6 + k * 0.45
        p.box(TIMBER2, -0.45, y - 0.02, -0.1, 0.45, y, -0.006)
        for i in range(4):
            x = -0.41 + i * 0.21
            p.box(r.choice(BOOKS), x, y, -0.05, x + 0.17, y + 0.26, -0.03)
            p.box('flat:#f0efe8', x + 0.03, y + 0.15, -0.054, x + 0.14, y + 0.2, -0.05)


def cart(p):
    """Pop-up sweets cart: a timber body on two wheels under a striped canopy, trays of sweets on top."""
    r = random.Random(61)
    L, D, H = SIZES['cart']
    p.box(TIMBER2, -L / 2, 0.35, -D / 2, L / 2, 0.95, D / 2)
    p.box(PALE, -L / 2 - 0.04, 0.95, -D / 2 - 0.06, L / 2 + 0.04, 1.0, D / 2 + 0.02)
    for sx in (-0.55, 0.55):
        p.cyl(BLACK, (sx, 0.22, -D / 2 - 0.02), 2, 0.22, 0.05, seg=14)
        p.cyl(STEEL, (sx, 0.22, -D / 2 - 0.05), 2, 0.06, 0.02, seg=8)
    p.box(DARK, L / 2 - 0.1, 0, D / 2 - 0.12, L / 2 - 0.04, 0.35, D / 2 - 0.06)
    p.box(DARK, -L / 2 + 0.04, 0, D / 2 - 0.12, -L / 2 + 0.1, 0.35, D / 2 - 0.06)
    for i in range(4):
        x = -L / 2 + 0.1 + i * 0.39
        p.box(WHITE, x, 1.0, -D / 2 + 0.02, x + 0.34, 1.03, D / 2 - 0.2)
        row(p, r, SWEETS, x + 0.02, x + 0.32, 1.03, -D / 2 + 0.05, D / 2 - 0.24, 0.1, 0.07, 0.12)
    for sx in (-L / 2 + 0.03, L / 2 - 0.06):
        p.box(TIMBER, sx, 1.0, D / 2 - 0.06, sx + 0.03, 1.85, D / 2 - 0.03)
        p.box(TIMBER, sx, 1.0, -D / 2 + 0.0, sx + 0.03, 1.85, -D / 2 + 0.03)
    p.prism('flat:#f4f1e6', [(-D / 2 - 0.15, 1.85), (D / 2 + 0.05, 1.85), (0, 2.1)], 'x', -L / 2 - 0.1, L / 2 + 0.1)
    n = 8
    for i in range(n):
        x0 = -L / 2 - 0.1 + i * (L + 0.2) / n
        p.box('flat:#b4472f' if i % 2 else 'flat:#f4f1e6', x0, 1.7, -D / 2 - 0.156, x0 + (L + 0.2) / n, 1.85, -D / 2 - 0.15)


def lotto(p):
    """Lottery booth: a small cabin with a counter window and a lit header."""
    L, D, H = SIZES['lotto']
    p.box('flat:#f6efe0', -L / 2, 0, -D / 2 + 0.06, L / 2, 2.0, D / 2)
    p.box('flat:#c62828', -L / 2 - 0.02, 0, -D / 2 + 0.04, L / 2 + 0.02, 0.9, -D / 2 + 0.06)
    p.box(PALE, -L / 2 - 0.02, 0.9, -D / 2 - 0.08, L / 2 + 0.02, 0.95, -D / 2 + 0.1)
    p.box('flat:#22303a', -L / 2 + 0.12, 0.98, -D / 2 + 0.056, L / 2 - 0.12, 1.7, -D / 2 + 0.06)
    p.box('glassTint', -L / 2 + 0.12, 0.98, -D / 2 + 0.04, L / 2 - 0.12, 1.7, -D / 2 + 0.05)
    p.box(STEEL, -0.15, 0.95, -D / 2 + 0.03, 0.15, 1.02, -D / 2 + 0.06)
    p.box('flat:#e8c93a', -L / 2 - 0.04, 2.0, -D / 2, L / 2 + 0.04, H, D / 2 + 0.02)
    p.box('light', -L / 2 + 0.05, 1.95, -D / 2 - 0.02, L / 2 - 0.05, 1.99, -D / 2 + 0.05)
    for i in range(3):
        p.box(['flat:#c62828', 'flat:#2f6fb0', 'flat:#3f8f5a'][i], -L / 2 + 0.16 + i * 0.38, 0.25, -D / 2 + 0.03, -L / 2 + 0.44 + i * 0.38, 0.7, -D / 2 + 0.04)


def bentotable(p):
    """Trestle table of stacked lunch boxes under a banner frame."""
    r = random.Random(63)
    L, D, H = SIZES['bentotable']
    p.box('flat:#f4f1e6', -L / 2, 0.1, -D / 2, L / 2, 0.82, -D / 2 + 0.01)
    p.box(PALE, -L / 2 - 0.02, 0.82, -D / 2 - 0.02, L / 2 + 0.02, 0.86, D / 2)
    for sx in (-L / 2 + 0.05, L / 2 - 0.09):
        p.box(STEEL, sx, 0, -D / 2 + 0.08, sx + 0.04, 0.82, -D / 2 + 0.12)
        p.box(STEEL, sx, 0, D / 2 - 0.12, sx + 0.04, 0.82, D / 2 - 0.08)
    for i in range(5):
        x = -L / 2 + 0.1 + i * 0.33
        for j in range(r.randint(2, 4)):
            p.box(r.choice(['flat:#3a2a20', 'flat:#b23a3a', 'flat:#f0efe8', 'flat:#2f3a2c']), x, 0.86 + j * 0.065, -D / 2 + 0.1, x + 0.28, 0.92 + j * 0.065, D / 2 - 0.16)
    for sx in (-L / 2 + 0.02, L / 2 - 0.05):
        p.box(STEEL, sx, 0.86, D / 2 - 0.05, sx + 0.03, H, D / 2 - 0.02)
    p.box('flat:#8a2b18', -L / 2, H - 0.4, D / 2 - 0.045, L / 2, H, D / 2 - 0.03)


PROPS = {'cart': cart, 'lotto': lotto, 'bentotable': bentotable, 'win_food': win_food, 'win_goods': win_goods, 'win_books': win_books, 'boltrack': boltrack, 'bolttable': bolttable, 'kimonostand': kimonostand, 'conerack': conerack, 'clothsteps': clothsteps,
         'dyebar': dyebar, 'win_bolts': win_bolts, 'win_kimono': win_kimono, 'win_cones': win_cones, 'win_cloths': win_cloths,
         'win_swatch': win_swatch, 'table': table, 'lattice': lattice, 'slidedoor': slidedoor, 'lantern': lantern, 'aboard': aboard, 'crates': crates, 'foodcase': foodcase,
         'ticketm': ticketm, 'winbar': winbar, 'pendant': pendant, 'showcase': showcase, 'breadcase': breadcase, 'magrack': magrack,
         'bookshelf': bookshelf, 'wagon': wagon, 'buckets': buckets, 'plinth': plinth, 'priceboard': priceboard, 'desk': desk,
         'brochure': brochure, 'shelfunit': shelfunit, 'potcounter': potcounter}


def build_hi(v):
    body = Part()
    PROPS[v['id']](body)
    return body, None


if __name__ == '__main__':
    run('shops', [dict(id=k, w=SIZES[k][0], gap=1.0) for k in PROPS], build_hi, lambda v: None)
