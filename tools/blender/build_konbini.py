# Builds the fittings of a convenience store (konbini) you can walk into.
#
#   blender --background --python tools/blender/build_konbini.py -- [--renders <dir>]
#
# Writes assets/buildings/konbini.blend and public/models/buildings/konbini.glb.
#
# Frame and helpers: see buildkit.py. One root per fitting, konbini_<id>, with one mesh; the
# origin is on the floor in the middle of the fitting and its front (the side a shopper faces)
# looks along -z. The shop itself (walls, floor, colliders, the chain's fascia) is built by
# src/stations/konbini.ts, which mirrors the sizes in SIZES below.
# Stock is plain coloured blocks: no product, pack or brand is copied.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

WHITE = 'flat:#f1f0ea'
GREY = 'flat:#c9cbcc'
DARKG = 'flat:#3b4046'
BLACK = 'flat:#1d1f22'
STEELC = 'flat:#aeb3b8'
WARM = 'flat:#f3d9a0'
PACKS = ['flat:#d94f4f', 'flat:#e8c93a', 'flat:#2f6fb0', 'flat:#3f8f5a', 'flat:#f0efe8', 'flat:#e8791c', 'flat:#8b5fb0', 'flat:#3a3d42',
         'flat:#d9a3b0', 'flat:#7fc4c9', 'flat:#b8d06a', 'flat:#c9905a']

# Footprint (along x, along z) and height of each fitting. Shared with src/stations/konbini.ts (FIT).
SIZES = {
    'gondola': (2.4, 0.9, 1.45), 'wallshelf': (2.4, 0.45, 1.9), 'fridge': (2.4, 0.75, 2.05), 'magrack': (2.4, 0.4, 1.35),
    'counter': (3.2, 0.75, 1.0), 'backwall': (3.2, 0.3, 2.1), 'atm': (0.6, 0.6, 1.55), 'copier': (0.95, 0.65, 1.1),
    'baskets': (0.5, 0.4, 0.75), 'bins': (1.6, 0.45, 0.95), 'polesign': (2.6, 0.4, 8.0), 'wheelstop': (1.8, 0.2, 0.14),
}


def stock(p, r, x0, x1, y, z0, z1, h, n=None):
    """A row of packs standing on a shelf between x0 and x1, from the shelf's front z0 back to z1."""
    x = x0 + 0.02
    while x < x1 - 0.08:
        w = r.uniform(0.09, 0.22)
        if x + w > x1 - 0.02:
            break
        hh = h * r.uniform(0.6, 0.98)
        p.box(r.choice(PACKS), x, y, z0, x + w, y + hh, z1)
        x += w + r.uniform(0.005, 0.03)


def gondola(p):
    """Double-sided shelf unit standing in the middle of the floor."""
    r = random.Random(3)
    L, D, H = SIZES['gondola']
    p.box(DARKG, -L / 2, 0, -D / 2, L / 2, 0.12, D / 2)
    p.box(WHITE, -L / 2, 0.12, -0.03, L / 2, H, 0.03)
    for sx in (-L / 2, L / 2 - 0.03):
        p.box(WHITE, sx, 0.12, -D / 2, sx + 0.03, H, D / 2)
    for k in range(4):
        y = 0.14 + k * 0.33
        for s in (-1, 1):
            z0, z1 = (s * (D / 2 - 0.02), s * 0.03)
            p.box(GREY, -L / 2 + 0.03, y - 0.02, min(z0, z1), L / 2 - 0.03, y, max(z0, z1))
            stock(p, r, -L / 2 + 0.04, L / 2 - 0.04, y, min(s * (D / 2 - 0.05), s * 0.12), max(s * (D / 2 - 0.05), s * 0.12), 0.27)
            p.box('flat:#f4f1e8', -L / 2 + 0.03, y - 0.05, s * (D / 2 - 0.02) - 0.004, L / 2 - 0.03, y - 0.02, s * (D / 2 - 0.02) + 0.004)
    p.box(WHITE, -L / 2, H, -0.1, L / 2, H + 0.03, 0.1)


def wallshelf(p):
    """Single-sided shelf against a wall (its back at +z)."""
    r = random.Random(5)
    L, D, H = SIZES['wallshelf']
    p.box(DARKG, -L / 2, 0, -D / 2, L / 2, 0.12, D / 2)
    p.box(WHITE, -L / 2, 0.12, D / 2 - 0.03, L / 2, H, D / 2)
    for k in range(5):
        y = 0.14 + k * 0.35
        p.box(GREY, -L / 2, y - 0.02, -D / 2 + 0.02, L / 2, y, D / 2 - 0.03)
        stock(p, r, -L / 2 + 0.02, L / 2 - 0.02, y, -D / 2 + 0.05, D / 2 - 0.05, 0.29)


def fridge(p):
    """Drinks case with glass doors: lit inside, rows of bottles."""
    r = random.Random(7)
    L, D, H = SIZES['fridge']
    p.box(WHITE, -L / 2, 0, -D / 2 + 0.05, L / 2, H, D / 2)
    p.box(DARKG, -L / 2, 0, -D / 2, L / 2, 0.16, -D / 2 + 0.06)
    p.box(DARKG, -L / 2, H - 0.14, -D / 2, L / 2, H, -D / 2 + 0.06)
    p.box('light', -L / 2 + 0.05, H - 0.2, -D / 2 + 0.07, L / 2 - 0.05, H - 0.16, -D / 2 + 0.2)
    p.box(WARM, -L / 2 + 0.03, 0.16, D / 2 - 0.08, L / 2 - 0.03, H - 0.14, D / 2 - 0.06)
    for k in range(5):
        y = 0.2 + k * 0.34
        p.box(STEELC, -L / 2 + 0.03, y - 0.02, -D / 2 + 0.1, L / 2 - 0.03, y, D / 2 - 0.08)
        x = -L / 2 + 0.06
        while x < L / 2 - 0.1:
            col = r.choice(PACKS)
            for j in range(r.randint(2, 4)):
                if x > L / 2 - 0.1:
                    break
                p.box(col, x, y, -D / 2 + 0.14, x + 0.07, y + 0.26, -D / 2 + 0.21)
                p.box(WHITE, x + 0.015, y + 0.26, -D / 2 + 0.155, x + 0.055, y + 0.29, -D / 2 + 0.195)
                x += 0.09
            x += 0.02
    for k in range(4):
        x = -L / 2 + k * L / 3
        p.box(DARKG, x - 0.025, 0.16, -D / 2, x + 0.025, H - 0.14, -D / 2 + 0.06)
    p.box('glassTint', -L / 2 + 0.03, 0.16, -D / 2 + 0.02, L / 2 - 0.03, H - 0.14, -D / 2 + 0.03)
    for k in range(3):
        x = -L / 2 + (k + 1) * L / 3 - 0.09
        p.box(STEELC, x, 0.95, -D / 2 - 0.03, x + 0.03, 1.35, -D / 2)


def magrack(p):
    """Magazine rack along the front window: stepped tiers of covers."""
    r = random.Random(9)
    L, D, H = SIZES['magrack']
    p.box(DARKG, -L / 2, 0, -D / 2, L / 2, 0.1, D / 2)
    p.box(WHITE, -L / 2, 0.1, D / 2 - 0.03, L / 2, H, D / 2)
    for k in range(4):
        y = 0.14 + k * 0.3
        z = -D / 2 + 0.04 + k * 0.08
        p.box(GREY, -L / 2, y - 0.02, z, L / 2, y, D / 2 - 0.03)
        x = -L / 2 + 0.03
        while x < L / 2 - 0.2:
            p.box(r.choice(PACKS), x, y, z + 0.01, x + 0.21, y + 0.27, z + 0.03)
            p.box('flat:#f4f1e8', x + 0.02, y + 0.19, z + 0.006, x + 0.19, y + 0.25, z + 0.012)
            x += 0.235


def counter(p):
    """Till counter: two tills, a hot-food case, a coffee machine, a tray of sweets on the front."""
    r = random.Random(11)
    L, D, H = SIZES['counter']
    p.box(WHITE, -L / 2, 0, -D / 2 + 0.04, L / 2, 0.92, D / 2)
    p.box('flat:#4a3626', -L / 2 - 0.02, 0.92, -D / 2, L / 2 + 0.02, 0.96, D / 2 + 0.02)
    p.box(DARKG, -L / 2, 0, -D / 2 + 0.02, L / 2, 0.1, -D / 2 + 0.05)
    for x in (-0.9, 0.35):
        p.box(DARKG, x - 0.2, 0.96, -0.05, x + 0.2, 1.06, 0.25)
        p.box(BLACK, x - 0.17, 1.06, 0.12, x + 0.17, 1.34, 0.16)
        p.box('light', x - 0.15, 1.09, 0.11, x + 0.15, 1.31, 0.12)
        p.box(BLACK, x + 0.26, 0.96, -0.2, x + 0.4, 1.0, -0.02)
    # Hot-food case, lit warm.
    p.box(STEELC, 0.85, 0.96, -0.3, 1.5, 1.02, 0.2)
    p.box(WARM, 0.87, 1.02, -0.28, 1.48, 1.04, 0.18)
    for k in range(6):
        p.box(r.choice(['flat:#c9905a', 'flat:#a8662f', 'flat:#d9b36a']), 0.9 + k * 0.095, 1.04, -0.2, 0.97 + k * 0.095, 1.1, 0.1)
    p.box('glassTint', 0.85, 1.02, -0.3, 1.5, 1.42, -0.29)
    p.box('glassTint', 0.85, 1.02, -0.3, 0.86, 1.42, 0.2)
    p.box('glassTint', 1.49, 1.02, -0.3, 1.5, 1.42, 0.2)
    p.box(STEELC, 0.85, 1.42, -0.3, 1.5, 1.46, 0.2)
    p.box('light', 0.9, 1.4, -0.25, 1.45, 1.42, 0.15)
    # Coffee machine.
    p.box(BLACK, -1.55, 0.96, -0.2, -1.15, 1.5, 0.25)
    p.box(STEELC, -1.5, 1.0, -0.22, -1.2, 1.2, -0.2)
    p.box('light', -1.48, 1.3, -0.21, -1.22, 1.44, -0.2)
    # Sweets on the counter's front.
    stock(p, r, -0.6, 0.2, 0.3, -D / 2 - 0.1, -D / 2 + 0.03, 0.2)
    p.box(GREY, -0.62, 0.28, -D / 2 - 0.11, 0.22, 0.3, -D / 2 + 0.04)
    stock(p, r, -0.6, 0.2, 0.58, -D / 2 - 0.1, -D / 2 + 0.03, 0.2)
    p.box(GREY, -0.62, 0.56, -D / 2 - 0.11, 0.22, 0.58, -D / 2 + 0.04)


def backwall(p):
    """The wall behind the till: a rack of small packs over a worktop with a microwave."""
    r = random.Random(13)
    L, D, H = SIZES['backwall']
    p.box(WHITE, -L / 2, 0, -D / 2, L / 2, 0.9, D / 2)
    p.box('flat:#4a3626', -L / 2, 0.9, -D / 2 - 0.02, L / 2, 0.94, D / 2)
    p.box(WHITE, -L / 2, 0.94, D / 2 - 0.03, L / 2, H, D / 2)
    for k in range(5):
        y = 1.15 + k * 0.18
        p.box(GREY, -L / 2 + 0.9, y - 0.015, -D / 2 + 0.1, L / 2, y, D / 2 - 0.03)
        x = -L / 2 + 0.92
        while x < L / 2 - 0.06:
            p.box(r.choice(PACKS), x, y, -D / 2 + 0.12, x + 0.055, y + 0.09, D / 2 - 0.05)
            x += 0.062
    p.box(STEELC, -L / 2 + 0.1, 0.94, -D / 2 + 0.02, -L / 2 + 0.75, 1.3, D / 2 - 0.04)
    p.box(BLACK, -L / 2 + 0.15, 1.0, -D / 2 + 0.015, -L / 2 + 0.55, 1.25, -D / 2 + 0.02)


def atm(p):
    L, D, H = SIZES['atm']
    p.box(WHITE, -L / 2, 0, -D / 2, L / 2, H, D / 2)
    p.box('flat:#1f5fae', -L / 2, H - 0.25, -D / 2 - 0.01, L / 2, H, -D / 2)
    p.box(BLACK, -0.2, 0.95, -D / 2 - 0.01, 0.2, 1.25, -D / 2)
    p.box('light', -0.18, 0.97, -D / 2 - 0.015, 0.18, 1.23, -D / 2 - 0.01)
    p.box(STEELC, -0.22, 0.78, -D / 2 - 0.08, 0.22, 0.86, -D / 2)
    p.box(BLACK, -0.15, 0.6, -D / 2 - 0.01, 0.15, 0.64, -D / 2)


def copier(p):
    L, D, H = SIZES['copier']
    p.box(WHITE, -L / 2, 0, -D / 2, L / 2, 0.85, D / 2)
    p.box(GREY, -L / 2 - 0.02, 0.85, -D / 2 - 0.02, L / 2 + 0.02, 0.98, D / 2 + 0.02)
    p.box(DARKG, -L / 2, 0.98, -D / 2, L / 2 - 0.25, H, D / 2)
    p.box(BLACK, L / 2 - 0.22, 0.98, -D / 2, L / 2, 1.06, -D / 2 + 0.25)
    p.box('light', L / 2 - 0.2, 1.06, -D / 2 + 0.03, L / 2 - 0.02, 1.065, -D / 2 + 0.2)
    for y in (0.2, 0.45):
        p.box(GREY, -L / 2 + 0.05, y, -D / 2 - 0.01, L / 2 - 0.05, y + 0.18, -D / 2)
    p.box(GREY, -L / 2 - 0.3, 0.55, -0.2, -L / 2, 0.58, 0.2)


def baskets(p):
    L, D, H = SIZES['baskets']
    p.box(STEELC, -L / 2, 0, -D / 2, L / 2, 0.06, D / 2)
    for k in range(7):
        y = 0.06 + k * 0.085
        col = 'flat:#2f6fb0' if k % 2 else 'flat:#3b78b8'
        p.box(col, -L / 2 + 0.02, y, -D / 2 + 0.02, L / 2 - 0.02, y + 0.07, D / 2 - 0.02)
    p.box(BLACK, -0.18, 0.66, -0.02, 0.18, H, 0.02)


def bins(p):
    """Four waste bins in a row outside the door, with round and flap openings."""
    L, D, H = SIZES['bins']
    p.box(STEELC, -L / 2, 0, -D / 2, L / 2, 0.06, D / 2)
    for k, col in enumerate(('flat:#3f8f5a', 'flat:#2f6fb0', 'flat:#e8c93a', 'flat:#c9cbcc')):
        x = -L / 2 + 0.02 + k * 0.395
        p.box(WHITE, x, 0.06, -D / 2 + 0.02, x + 0.37, H, D / 2)
        p.box(col, x, H - 0.16, -D / 2 + 0.015, x + 0.37, H, -D / 2 + 0.02)
        p.box(BLACK, x + 0.09, 0.55, -D / 2 + 0.015, x + 0.28, 0.68, -D / 2 + 0.02)


def polesign(p):
    """Roadside pole sign: a tall post with a blank square board for the chain's sign, a price strip below."""
    L, D, H = SIZES['polesign']
    p.cyl(DARKG, (0, 0.2, 0), 1, 0.3, 0.4, seg=10)
    p.cyl(STEELC, (0, 2.9, 0), 1, 0.16, 5.4, seg=10)
    p.box(WHITE, -1.3, 5.4, -0.18, 1.3, H, 0.18)
    p.box(DARKG, -1.34, 5.36, -0.2, 1.34, 5.4, 0.2)
    p.box(DARKG, -1.34, H, -0.2, 1.34, H + 0.04, 0.2)
    p.box(WHITE, -1.0, 4.5, -0.12, 1.0, 5.2, 0.12)


def wheelstop(p):
    L, D, H = SIZES['wheelstop']
    p.box('flat:#b9b6ac', -L / 2, 0, -D / 2, L / 2, H, D / 2)
    for x in (-0.6, 0.6):
        p.box('flat:#e8c93a', x - 0.15, 0, -D / 2 - 0.002, x + 0.15, H + 0.002, D / 2 + 0.002)


PROPS = {'gondola': gondola, 'wallshelf': wallshelf, 'fridge': fridge, 'magrack': magrack, 'counter': counter, 'backwall': backwall,
         'atm': atm, 'copier': copier, 'baskets': baskets, 'bins': bins, 'polesign': polesign, 'wheelstop': wheelstop}


def build_hi(v):
    body = Part()
    PROPS[v['id']](body)
    return body, None


if __name__ == '__main__':
    run('konbini', [dict(id=k, w=SIZES[k][0], gap=1.0) for k in PROPS], build_hi, lambda v: None)
