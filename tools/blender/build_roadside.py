# Builds generic roadside buildings any district can use: a multi-storey car park and a petrol station.
# Theme set: no station's name or brand is in it (the game letters every sign).
#
#   blender --background --python tools/blender/build_roadside.py -- [--renders <dir>]
#
# Writes assets/buildings/roadside.blend, public/models/buildings/roadside.glb and src/stations/anchors/roadside.ts.
#
#   carpark  a five-deck open car park, 34 x 32 m: concrete decks and parapets, a glass stair tower on one front
#            corner, the way in and out on the front; `name` a vertical board on the stair tower, `plate` over the way in.
#   petrol   a petrol station, 28 x 24 m: a canopy over two pump islands, the shop at the back; `name` the canopy's
#            front fascia, `pole` the price-free brand board on its pole at the front corner.
#
# Frame: front at z = 0 facing -z, origin mid-frontage, +z into the lot.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

CONC = 'flat:#c9c6bf'
CONC_D = 'flat:#9c9890'
DECK = 'flat:#7d7a74'
PAINT_W = 'flat:#f2f2ee'
CAR_COLS = ['flat:#f2f2ee', 'flat:#2b2e33', 'flat:#9aa2a8', 'flat:#7a1f24', 'flat:#2f4a6e']


def car(p, r, x, y, z, along_z=True):
    """A parked car as two boxes (seen through the parapet gaps)."""
    col = CAR_COLS[int(r.random() * len(CAR_COLS))]
    (hw, hl) = (0.85, 2.2) if along_z else (2.2, 0.85)
    p.box(col, x - hw, y, z - hl, x + hw, y + 0.75, z + hl)
    p.box('glassTint', x - hw * 0.9, y + 0.75, z - hl * 0.55, x + hw * 0.9, y + 1.35, z + hl * 0.45)


def carpark(p):
    W, D, FH, NF = 34.0, 32.0, 3.0, 5
    x0, x1 = -W / 2, W / 2
    r = random.Random(11)
    for k in range(NF + 1):
        y = k * FH
        p.box(DECK if k else CONC_D, x0, y - 0.3 if k else 0, 0, x1, y, D)
        if k:
            for face, a0, a1, at in sides(x0, x1, 0, D):
                slab(p, CONC, face, a0, a1, y, y + 1.1, at, 0.1)
                slab(p, PAINT_W, face, a0, a1, y + 1.0, y + 1.1, at, 0.14)
        if k < NF:
            for xc in rows(x0 + 1, x1 - 1, 2.6):
                for zc in (5.0, D - 5.0):
                    if r.random() < 0.6:
                        car(p, r, xc, y + 0.0, zc)
    for xc in rows(x0, x1, 8.5) + [x0 + 0.3, x1 - 0.3]:
        for zc in (0.3, D / 2, D - 0.3):
            p.box(CONC, xc - 0.3, 0, zc - 0.3, xc + 0.3, NF * FH, zc + 0.3)
    # The ramp seen at the back, a glass stair tower on the front corner, the way in.
    p.box(CONC_D, -4.0, 0, D / 2 - 2.5, 4.0, NF * FH, D / 2 + 2.5)
    p.box('glassTint', x1 - 4.2, 0, -3.2, x1, NF * FH + 3.0, 0.0)
    p.box(CONC, x1 - 4.4, NF * FH + 3.0, -3.4, x1 + 0.2, NF * FH + 3.4, 0.2)
    for x in (x1 - 4.2, x1):
        p.box(CONC, x - 0.12, 0, -3.25, x + 0.12, NF * FH + 3.0, -3.0)
    p.box(CONC, x0 + 2, 2.4, -0.3, x0 + 12, 2.9, 0.0)
    p.box('flat:#e6a700', x0 + 2, 0, -0.05, x0 + 2.1, 1.2, 0.0)
    mark('name', x1 - 2.1, 9.0, -3.3, 2.4, 6.0)
    mark('plate', x0 + 7.0, 2.65, -0.32, 9.0, 0.5)


def petrol(p):
    W, D = 28.0, 24.0
    x0, x1 = -W / 2, W / 2
    p.box(CONC, x0, 0, 0, x1, 0.04, D)
    # The canopy on four columns.
    p.box(PAINT_W, -12.0, 5.2, 3.0, 12.0, 6.4, 17.0)
    p.box('flat:#d8dde0', -11.8, 5.15, 3.2, 11.8, 5.2, 16.8)
    for x in (-6.0, 6.0):
        for z in (6.0, 14.0):
            p.box(PAINT_W, x - 0.25, 0, z - 0.25, x + 0.25, 5.2, z + 0.25)
    # Pump islands, a pump at each end.
    for x in (-6.0, 6.0):
        p.box(CONC_D, x - 0.7, 0, 4.5, x + 0.7, 0.2, 15.5)
        for z in (7.5, 12.5):
            p.box(PAINT_W, x - 0.45, 0.2, z - 0.35, x + 0.45, 2.0, z + 0.35)
            p.box(SCREEN, x - 0.46, 1.2, z - 0.25, x + 0.46, 1.7, z + 0.25)
            p.box('flat:#2f6e4a', x - 0.46, 1.85, z - 0.36, x + 0.46, 2.0, z + 0.36)
    # The shop at the back.
    p.box(PAINT_W, x0 + 1, 0, 18.0, x1 - 1, 4.2, D)
    p.box('glassTint', x0 + 2, 0.2, 17.96, 4.0, 3.4, 18.0)
    p.box(DARK, 5.0, 0, 17.96, 7.0, 2.4, 18.0)
    p.box('flat:#2f6e4a', x0 + 1, 3.5, 17.9, x1 - 1, 4.2, 18.0)
    # The brand board on its pole at the front corner.
    p.box(ALU_DK, x1 - 1.2, 0, 0.6, x1 - 0.9, 5.0, 0.9)
    p.box(PAINT_W, x1 - 2.4, 5.0, 0.55, x1 + 0.3, 7.4, 0.95)
    mark('name', 0.0, 5.8, 2.94, 14.0, 0.9)
    mark('pole', x1 - 1.05, 6.2, 0.53, 2.4, 2.0)


VARIANTS = [
    dict(id='carpark', w=34.0, d=32.0, h=18.4, fn=carpark, gap=10.0),
    dict(id='petrol', w=28.6, d=24.0, h=7.4, fn=petrol, gap=10.0),
]


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    v['fn'](body)
    return body, signs


def build_lo(v):
    return None


if __name__ == '__main__':
    run('roadside', VARIANTS, build_hi, build_lo)
    write_anchors('roadside')
