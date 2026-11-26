# Builds the machi set: the low mixed buildings of central Osaka's small streets. Two-to-five
# storey shop-houses with roll shutters and canvas awnings, houses with a garage shutter and a tiled
# pent eave, small apartment blocks with balconies, a corner shop, a narrow office with a signboard.
# Rendered white or tiled fronts, small windows with air-conditioning units, rooftop railings.
#
#   blender --background --python tools/blender/build_machi.py -- [--renders <dir>]
#
# Writes assets/buildings/machi.blend and public/models/buildings/machi.glb.
#
# Frame and helpers: buildkit.py (front at z = 0 facing -z). Each variant exports as machi_<id>
# (body + signs) and machi_<id>_lo. Sizes mirrored in src/stations/buildings.ts. The game letters
# the boards (render/building-models.ts, kind 'machi').

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

G0 = 3.0
FH = 2.8
SHUTTER = 'flat:#9ea2a6'
SHUTTER_DK = 'flat:#868a8e'
RAIL = 'flat:#3a3d41'
TILE_ROOF = 'flat:#3f4a4e'

VARIANTS = [
    # kind: 'shop' (roll shutter + awning), 'house' (garage shutter + pent eave), 'flats' (balconies), 'office' (signboard).
    dict(id='a', w=6.0, d=10.0, floors=3, kind='shop', wall='flat:#e8e4da', trim='flat:#9a948a', awning='#2f8f7a', seed=301),
    dict(id='b', w=5.0, d=9.0, floors=2, kind='house', wall='flat:#d9cdb8', trim='flat:#6b5440', awning=None, seed=307),
    dict(id='c', w=8.0, d=11.0, floors=5, kind='flats', wall='flat:#f1eee6', trim='flat:#8a8478', awning=None, seed=311),
    dict(id='d', w=5.6, d=10.0, floors=4, kind='shop', wall='flat:#c97a5a', trim='flat:#7a3b2a', awning='#b23a3a', seed=313),
    dict(id='e', w=6.6, d=10.0, floors=3, kind='office', wall='flat:#cfd3d4', trim='flat:#3a3d41', awning=None, seed=317),
    dict(id='f', w=4.6, d=9.0, floors=2, kind='house', wall='flat:#efe9dc', trim='flat:#3a3d41', awning=None, seed=331),
    dict(id='g', w=7.2, d=11.0, floors=4, kind='flats', wall='flat:#b88a6a', trim='flat:#e8e4da', awning=None, seed=337),
    dict(id='h', w=5.4, d=9.5, floors=3, kind='shop', wall='flat:#f4f1e8', trim='flat:#2f4a5a', awning='#d9a400', seed=347),
]


def levels(v):
    return [G0 + i * FH for i in range(v['floors'])]


def shutter(p, x0, x1, y0, y1, z):
    p.box(SHUTTER, x0, y0, z - 0.03, x1, y1, z)
    y = y0 + 0.08
    while y < y1 - 0.05:
        p.box(SHUTTER_DK, x0, y, z - 0.04, x1, y + 0.02, z - 0.03)
        y += 0.14
    p.box(RAIL, x0 - 0.05, y1, z - 0.12, x1 + 0.05, y1 + 0.28, z)


def ground(p, s, v, rng):
    x0, x1 = -v['w'] / 2, v['w'] / 2
    a, b = x0 + 0.2, x1 - 0.2
    p.box(v['trim'], x0, 0, -0.02, x0 + 0.2, G0, 0.1)
    p.box(v['trim'], x1 - 0.2, 0, -0.02, x1, G0, 0.1)
    k = v['kind']
    if k == 'shop':
        # A roll shutter half up over a lit shop window, a door beside, a canvas awning, the board.
        m = a + (b - a) * 0.7
        p.box('windowDim', a, 0.4, -0.02, m, 2.3, 0.0, col='flat:#c9bba2')   # a shop window: softly lit, not a lamp
        shutter(p, a, m, 2.0, 2.45, 0.02)
        p.box('flat:#3a3d42', m + 0.15, 0, -0.01, b, 2.2, 0.03)
        p.box('glassTint', m + 0.25, 0.3, -0.02, b - 0.1, 2.1, -0.01)
        n = max(2, int((b - a) / 0.5))
        col = 'flat:' + v['awning']
        for i in range(n):
            ua, ub = a + (b - a) * i / n, a + (b - a) * (i + 1) / n
            p.face(col if i % 2 == 0 else 'flat:#f4f1e8', [(ua, 2.75, 0.0), (ub, 2.75, 0.0), (ub, 2.35, -1.0), (ua, 2.35, -1.0)], (0, 1, -0.4))
            p.face(col, [(ub, 2.35, -1.0), (ua, 2.35, -1.0), (ua, 2.15, -1.0), (ub, 2.15, -1.0)], (0, 0, -1))
        sign(s, v['awning'], a + 0.2, 2.15, -1.02, b - 0.2, 2.33, -1.0)
        sign(s, rng.choice(SIGN_COLOURS), x0 + 0.05, G0 + 0.2, -0.7, x0 + 0.2, G0 + 1.9, -0.1)
    elif k == 'house':
        # A garage with a shutter, a front door under a small tiled pent eave, a planter.
        gw = min(2.8, (b - a) * 0.6)
        shutter(p, a, a + gw, 0, 2.2, 0.0)
        p.box('flat:#4a3426', a + gw + 0.3, 0, -0.01, a + gw + 1.2, 2.1, 0.03)
        p.prism(TILE_ROOF, [(-0.7, 2.6), (0.0, 2.95), (0.0, 3.02), (-0.75, 2.66)], 'x', x0 - 0.1, x1 + 0.1)
        p.box('flat:#9a5a3a', b - 0.6, 0, -0.5, b, 0.45, -0.05)
        p.box('flat:#4f8f45', b - 0.6, 0.45, -0.5, b, 0.95, -0.05)
    elif k == 'flats':
        # An entrance hall with a glass door, mailboxes behind, a bicycle bay under a canopy.
        p.box('glassTint', a + 0.3, 0.1, -0.02, a + 1.6, 2.3, 0.0)
        p.box('flat:#b9bdc2', a + 1.8, 0.6, 0.2, a + 2.8, 1.6, 0.3)
        p.box('flat:#3a3d41', a, 2.4, -1.4, b, 2.5, 0.0)
        for x in (a + 3.2, b - 0.1):
            p.box(RAIL, x - 0.04, 0, -1.4, x + 0.04, 2.4, -1.32)
    else:
        # An office front: a glazed door, a band of dark glass, a signboard over it.
        p.box('glassTint', a, 0.3, -0.015, b, 2.5, 0.0)
        p.box('flat:#3a3d42', a + 0.3, 0, -0.01, a + 1.3, 2.3, 0.03)
        sign(s, rng.choice(SIGN_COLOURS), a + 0.1, 2.55, -0.06, b - 0.1, 2.95, 0.0)


def upper(p, s, v, rng):
    x0, x1 = -v['w'] / 2, v['w'] / 2
    ys = levels(v)
    H = ys[-1]
    a, b = x0 + 0.2, x1 - 0.2
    p.box(v['wall'], x0, G0, -0.02, x1, H + 0.9, 0.0)
    for i, y in enumerate(ys[:-1]):
        if v['kind'] == 'flats':
            # A balcony across the front on every floor: slab, solid lower panel, rail, AC unit, laundry.
            p.box(CONC, x0, y - 0.15, -1.1, x1, y, 0.0)
            p.box(v['trim'], x0, y, -1.1, x1, y + 0.75, -1.0)
            # Side screens: the balcony is closed at both ends (frosted panels, as in Japan).
            for xs in (x0, x1 - 0.08):
                p.box(v['trim'], xs, y, -1.1, xs + 0.08, y + 0.75, 0.0)
                p.box('flat:#c9d2d6', xs + 0.01, y + 0.75, -1.05, xs + 0.07, y + 2.2, 0.0)
            p.box(RAIL, x0, y + 1.0, -1.08, x1, y + 1.04, -1.02)
            p.box(WINDOW_LIT, a + 0.3, y + 0.15, 0.0, b - 0.3, y + 2.2, 0.02)
            for x in (a + 0.3 + (b - a - 0.6) * f for f in (0.33, 0.66)):
                p.box(FRAME, x - 0.03, y + 0.15, 0.0, x + 0.03, y + 2.2, 0.04)
            p.box(ACU, x1 - 1.1, y, -0.9, x1 - 0.3, y + 0.6, -0.55)
            if rng.random() < 0.5:
                p.box(RAIL, a + 0.4, y + 1.95, -0.7, b - 1.4, y + 1.98, -0.67)
                for j in range(4):
                    p.box(rng.choice(['flat:#e8e4dc', 'flat:#3a5a9a', 'flat:#c0392b', 'flat:#d9c27a']), a + 0.5 + j * 0.5, y + 1.3, -0.7, a + 0.85 + j * 0.5, y + 1.95, -0.68)
        else:
            # Two small windows a floor (one with a grille), an AC unit on a bracket, sometimes a board.
            for k, f in enumerate((0.28, 0.72)):
                xc = x0 + v['w'] * f
                win(p, xc - 0.55, y + 0.9, xc + 0.55, y + 2.1, 0.0, out=-1, glass=WINDOW_LIT if rng.random() < 0.35 else WINDOW)
                if (i + k) % 2:
                    for g in range(5):
                        p.box(RAIL, xc - 0.5 + g * 0.25, y + 0.9, -0.08, xc - 0.48 + g * 0.25, y + 2.1, -0.06)
            p.box(ACU, x0 + v['w'] * 0.5 - 0.4, y + 0.25, -0.38, x0 + v['w'] * 0.5 + 0.4, y + 0.8, 0.0)
            if v['kind'] in ('shop', 'office') and rng.random() < 0.5:
                sign(s, rng.choice(SIGN_COLOURS), a + 0.3, y + 2.15, -0.06, b - 0.3, y + 2.6, 0.0)
        p.box(v['trim'], x0, y - 0.06, -0.05, x1, y + 0.02, 0.0)
    # Roof: a parapet with a railing, a water tank or a small hut, an aerial.
    p.box(v['trim'], x0, H + 0.6, -0.05, x1, H + 0.9, 0.0)
    for x in (x0 + 0.1, x1 - 0.1):
        p.box(RAIL, x - 0.02, H + 0.9, 0.1, x + 0.02, H + 1.9, v['d'] - 0.1)
    p.box(RAIL, x0, H + 1.85, 0.08, x1, H + 1.9, 0.12)
    if rng.random() < 0.5:
        tank(p, x0 + 1.2, H, v['d'] * 0.6, r=0.6, h=1.2)
    else:
        p.box(CONC, x1 - 2.4, H, v['d'] - 3.0, x1 - 0.3, H + 2.2, v['d'] - 0.4)
    p.cyl(STEEL, (x0 + 0.6, H + 2.4, v['d'] - 1.0), 1, 0.025, 2.4, seg=5)


def volume(p, v):
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    H = levels(v)[-1]
    p.box(v['wall'], x0, 0, 0.02, x1, H + 0.6, D)
    p.box(ROOF, x0 + 0.1, H + 0.6, 0.1, x1 - 0.1, H + 0.62, D - 0.1)


def build_hi(v):
    rng = random.Random(v['seed'])
    p, s = Part(), Part()
    s.body = p
    volume(p, v)
    ground(p, s, v, rng)
    upper(p, s, v, rng)
    backs(p, v['w'], v['d'], levels(v), rng, signs=s)
    return p, s


def build_lo(v):
    # (Faces stand 0.25 m or more off the wall: seen from 200–500 m the depth buffer must still part them.)
    rng = random.Random(v['seed'])
    p = Part()
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    ys = levels(v)
    H = ys[-1]
    p.box(v['wall'], x0, 0, 0, x1, H + 0.9, D)
    p.box(SHUTTER if v['kind'] != 'office' else 'glassTint', x0 + 0.2, 0.1, -0.25, x1 - 0.2, 2.4, 0)
    for y in ys[:-1]:
        if v['kind'] == 'flats':
            p.box(v['trim'], x0, y, -1.0, x1, y + 0.8, -0.9)
            lo_band(p, x0 + 0.5, y + 0.2, -0.25, x1 - 0.5, y + 2.1, 0)
        else:
            for f in (0.28, 0.72):
                xc = x0 + v['w'] * f
                lo_band(p, xc - 0.5, y + 0.9, -0.25, xc + 0.5, y + 2.1, 0)
    if v['awning']:
        sign(p, v['awning'], x0 + 0.3, 2.15, -1.0, x1 - 0.3, 2.6, -0.4, glyphs=False)
    rng.random()
    return p


run('machi', VARIANTS, build_hi, build_lo)
