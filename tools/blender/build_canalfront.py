# Builds the canal-front buildings of Hyōtanbori: narrow bar and restaurant blocks that face the
# water, every floor a different tenant, crowded with boards.
#
#   blender --background --python tools/blender/build_canalfront.py -- [--renders <dir>]
#
# Writes assets/buildings/canalfront.blend and public/models/buildings/canalfront.glb.
#
# Frame and helpers: see buildkit.py (front at z = 0 facing -z, the canal walk). Each variant
# exports as canalfront_<id> (body + signs) and canalfront_<id>_lo. The game letters every board
# (render/building-models.ts): tall boards take a trade word, the rest a shop name.
# Depth stays within CANAL_ROW (10.5 m, src/stations/surface.ts); sizes are mirrored in
# src/stations/buildings.ts.
#
# What makes them canal fronts and not street zakkyo: a recessed ground floor that is an open
# terrace under the first floor, with tables, lanterns and a timber rail; steel balconies on the
# upper floors; a giant board across the whole front or on the roof; neon tubes (lit edges) up
# the piers; projecting sign columns on both sides.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

G0 = 3.6
FH = 3.1
TER = 2.2        # depth of the ground-floor terrace under the first floor
PARAPET = 0.8
TIMBER = 'flat:#4a3426'
TIMBER_LT = 'flat:#8a6440'
RAIL = 'flat:#2a2b2d'
RED = 'flat:#c23b22'

VARIANTS = [
    dict(id='a', w=6.2, d=10.0, floors=6, wall='flat:#2e2a27', trim='flat:#c9a227', big='front', seed=101),
    dict(id='b', w=8.4, d=10.0, floors=5, wall='flat:#d9cfbd', trim='flat:#7a2a1e', big='roof', seed=113),
    dict(id='c', w=5.2, d=9.5, floors=7, wall='flat:#3d4a52', trim='flat:#e86a1c', big=None, seed=127),
    dict(id='d', w=7.2, d=10.0, floors=4, wall='flat:#6b2a24', trim='flat:#f2c230', big='front', seed=131),
    dict(id='e', w=9.0, d=10.0, floors=6, wall='flat:#e4e0d6', trim='flat:#1f5fa8', big='roof', seed=149),
    dict(id='f', w=4.6, d=9.0, floors=5, wall='flat:#4a3a5a', trim='flat:#d94f8a', big=None, seed=151),
]


def levels(v):
    return [G0 + i * FH for i in range(v['floors'])]


def terrace(p, s, v, rng):
    """Ground floor: open to the walk under the first floor, glazed at the back of the terrace."""
    x0, x1 = -v['w'] / 2, v['w'] / 2
    a, b = x0 + 0.3, x1 - 0.3
    # Piers at the corners carry the front; soffit; the back wall is a lit shopfront with a door.
    for x in (x0, x1 - 0.3):
        p.box(v['trim'], x, 0, 0, x + 0.3, G0, 0.3)
    p.box(DARK, a, G0 - 0.3, 0, b, G0, TER)
    p.box(TIMBER, a, 0, TER, b, 0.5, TER + 0.1)
    p.box(WINDOW_LIT, a, 0.5, TER + 0.04, b, G0 - 0.35, TER + 0.06)
    dx = a + (b - a) * 0.75
    p.box(TIMBER, dx - 0.5, 0, TER - 0.02, dx + 0.5, 2.2, TER + 0.03)
    # Timber deck, a low rail on the walk side with a gap, tables and stools, lanterns' hooks.
    p.box(TIMBER_LT, a, 0, 0.05, b, 0.12, TER)
    p.box(TIMBER, a, 0.85, 0.05, dx - 0.7, 0.92, 0.12)
    for x in (a + 0.1, a + (dx - 0.7 - a) / 2, dx - 0.75):
        p.box(TIMBER, x - 0.04, 0.12, 0.05, x + 0.04, 0.92, 0.12)
    n = max(1, int((dx - 0.8 - a) / 1.3))
    for k in range(n):
        tx = a + 0.75 + k * 1.3
        p.cyl(TIMBER_LT, (tx, 0.72, 1.2), 1, 0.38, 0.05, seg=10)
        p.cyl(RAIL, (tx, 0.42, 1.2), 1, 0.04, 0.6, seg=6)
        for dz in (-0.55, 0.55):
            p.cyl(RED, (tx, 0.45, 1.2 + dz), 1, 0.16, 0.06, seg=8)
            p.cyl(RAIL, (tx, 0.25, 1.2 + dz), 1, 0.025, 0.4, seg=5)
    # Fascia over the terrace (a lettered board) and a small board on a stand by the door.
    sign(s, rng.choice(SIGN_COLOURS), a, G0 - 0.95, -0.05, b, G0 - 0.32, 0)
    sign(s, rng.choice(SIGN_COLOURS), dx + 0.6, 0.15, 0.3, dx + 1.05, 1.0, 0.36)


def upper(p, s, v, rng):
    x0, x1 = -v['w'] / 2, v['w'] / 2
    ys = levels(v)
    H = ys[-1]
    wall, trim = v['wall'], v['trim']
    a, b = x0 + 0.3, x1 - 0.3
    for x in (x0, x1 - 0.3):
        p.box(trim, x, G0, 0, x + 0.3, H + PARAPET, 0.3)
        # Neon tube up the outer edge of each pier (lit).
        xe = x - 0.02 if x == x0 else x + 0.3
        p.box('light', xe, G0 + 0.2, -0.03, xe + 0.02, H + PARAPET - 0.1, -0.01)
    for i, y in enumerate(ys):
        if i == len(ys) - 1:
            p.box(wall, a, y - 0.3, 0, b, y + PARAPET, 0.3)
            p.box(trim, a, y + PARAPET - 0.08, -0.04, b, y + PARAPET, 0.3)
            break
        p.box(wall, a, y - 0.3, 0.2, b, y + 0.8, 0.3)
        p.box(WINDOW_LIT if rng.random() < 0.7 else WINDOW, a, y + 0.8, 0.26, b, y + FH - 0.35, 0.3)
        p.box(wall, a, y + FH - 0.35, 0.2, b, y + FH - 0.3, 0.3)
        bays = max(2, round((b - a) / 1.3))
        for k in range(1, bays):
            x = a + (b - a) * k / bays
            p.box(FRAME, x - 0.03, y + 0.8, 0.18, x + 0.03, y + FH - 0.35, 0.3)
        # A shallow steel balcony on every other floor; a tenant board under the sill on the rest.
        if i % 2 == 0:
            p.box(CONC, a, y - 0.12, -0.75, b, y, 0.2)
            p.box(RAIL, a, y + 0.95, -0.78, b, y + 1.0, -0.72)
            for x in [a + 0.05 + j * 0.12 for j in range(int((b - a - 0.1) / 0.12) + 1)]:
                p.box(RAIL, x - 0.012, y, -0.76, x + 0.012, y + 0.97, -0.74)
            if rng.random() < 0.6:
                p.box(ACU, a + 0.2, y, -0.65, a + 0.95, y + 0.6, -0.3)
        else:
            sign(s, rng.choice(SIGN_COLOURS), a + 0.2, y - 0.25, -0.07, b - 0.2, y + 0.7, 0.2)
    # Projecting sign columns on both piers, one board per floor, plus a tall one on the left.
    for sx, side in ((x0 + 0.05, -1), (x1 - 0.3, 1)):
        if side > 0 and v['w'] < 6:
            continue
        p.box(FRAME, sx + 0.04, G0 + 0.2, -1.2, sx + 0.2, H - 0.3, -0.05)
        if side < 0:
            sign(s, rng.choice(SIGN_COLOURS), sx, G0 + 0.4, -1.15, sx + 0.24, H - 0.4, -0.2)
        else:
            for y in ys[:-1]:
                sign(s, rng.choice(SIGN_COLOURS), sx, y + 0.3, -1.15, sx + 0.24, y + FH - 0.15, -0.2)
    # The big board: across the whole front at the second and third floors, or on the roof.
    if v['big'] == 'front' and len(ys) > 3:
        y0, y1 = ys[1] - 0.2, ys[2] + FH - 0.6
        p.box(RAIL, a + 0.2, y0 + 0.2, -0.5, b - 0.2, y1 - 0.2, -0.1)
        sign(s, random.Random(v['seed'] + 3).choice(SIGN_COLOURS), a - 0.1, y0, -0.62, b + 0.1, y1, -0.5)
        p.box('light', a - 0.12, y1, -0.66, b + 0.12, y1 + 0.04, -0.5)
        p.box('light', a - 0.12, y0 - 0.04, -0.66, b + 0.12, y0, -0.5)
    if v['big'] == 'roof':
        for x in (a + 0.4, (a + b) / 2, b - 0.4):
            p.box(STEEL, x - 0.05, H, 0.5, x + 0.05, H + 4.8, 0.6)
            p.box(STEEL, x - 0.04, H, 2.0, x + 0.04, H + 0.08, 0.6)
        sign(s, random.Random(v['seed'] + 4).choice(SIGN_COLOURS), a - 0.3, H + 1.6, 0.35, b + 0.3, H + 4.9, 0.5)
        p.box('light', a - 0.3, H + 1.45, 0.2, b + 0.3, H + 1.5, 0.35)


def volume(p, v):
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    H = levels(v)[-1]
    p.box(v['wall'], x0, G0, 0.3, x1, H, D)
    p.box(v['wall'], x0, 0, TER, x1, G0, D)
    for x in (x0, x1 - 0.3):
        p.box(v['wall'], x, 0, 0.3, x + 0.3, G0, TER)
    for y in levels(v)[:-1]:
        for xc in (x0 + v['w'] * 0.3, x0 + v['w'] * 0.7):
            p.box(WINDOW, xc - 0.6, y + 0.9, D, xc + 0.6, y + 2.1, D + 0.02)
    p.cyl(STEEL, (x1 + 0.06, H / 2, D - 0.8), 1, 0.05, H, seg=6, caps=False)


def roof(p, v, rng):
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    H = levels(v)[-1]
    p.box(ROOF, x0 + 0.2, H, 0.3, x1 - 0.2, H + 0.03, D - 0.2)
    p.box(v['wall'], x0, H, 0.3, x0 + 0.2, H + PARAPET, D)
    p.box(v['wall'], x1 - 0.2, H, 0.3, x1, H + PARAPET, D)
    p.box(v['wall'], x0, H, D - 0.2, x1, H + PARAPET, D)
    p.box(v['wall'], x1 - 2.8, H, D - 3.6, x1 - 0.4, H + 2.6, D - 0.6)
    tank(p, x0 + 1.4, H, D - 2.0, r=0.7, h=1.4)
    for k in range(rng.randint(2, 4)):
        ax = x0 + 0.5 + k * 1.0
        if ax + 0.9 > x1 - 3.0:
            break
        p.box(ACU, ax, H + 0.1, D * 0.45, ax + 0.85, H + 0.75, D * 0.45 + 0.32)


def build_hi(v):
    rng = random.Random(v['seed'])
    p, s = Part(), Part()
    s.body = p
    volume(p, v)
    terrace(p, s, v, rng)
    upper(p, s, v, rng)
    roof(p, v, rng)
    backs(p, v['w'], v['d'], levels(v), rng, fire=v['floors'] >= 5, signs=s, side_z=(TER, v['d']), use='home')
    return p, s


def build_lo(v):
    # (Faces stand 0.25 m or more off the wall: seen from 200–500 m the depth buffer must still part them.)
    rng = random.Random(v['seed'])
    p = Part()
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    ys = levels(v)
    H = ys[-1]
    p.box(v['wall'], x0, 0, 0, x1, H + PARAPET, D)
    lo_band(p, x0 + 0.3, 0.5, -0.25, x1 - 0.3, G0 - 0.4, 0)
    for y in ys[:-1]:
        lo_band(p, x0 + 0.3, y + 0.8, -0.25, x1 - 0.3, y + FH - 0.35, 0)
        sign(p, rng.choice(SIGN_COLOURS), x0 + 0.5, y - 0.25, -0.45, x1 - 0.5, y + 0.6, -0.25, glyphs=False)
    sign(p, rng.choice(SIGN_COLOURS), x0 + 0.05, G0 + 0.4, -1.15, x0 + 0.29, H - 0.4, -0.2, glyphs=False)
    if v['big'] == 'roof':
        sign(p, rng.choice(SIGN_COLOURS), x0, H + 1.6, 0.35, x1, H + 4.9, 0.5, glyphs=False)
    if v['big'] != 'roof':
        tank(p, x0 + 1.4, H + PARAPET, D - 2.0, r=0.7, h=1.4)
    p.box(ACU, x1 - 1.6, H + PARAPET, D * 0.5, x1 - 0.7, H + PARAPET + 0.65, D * 0.5 + 0.32)
    return p


run('canalfront', VARIANTS, build_hi, build_lo)
