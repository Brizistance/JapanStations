# Builds the apartment blocks (manshon): balconies to the street, open corridor behind (three variants).
#
#   blender --background --python tools/blender/build_manshon.py -- [--renders <dir>]
#
# Writes assets/buildings/manshon.blend and public/models/buildings/manshon.glb.
# Frame, helpers and root naming: see buildkit.py. References: docs/references.md.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

G0 = 3.4     # ground storey height
FH = 2.9     # upper storey height
BAL = 1.4    # balcony depth
COR = 1.3    # access corridor depth
PARAPET = 0.7

SLAB = 'flat:#c9c7c0'
BOARD = 'flat:#d6d4cc'
BALGLASS = 'flat:#9fb7c2'
DOOR = 'flat:#6b4a3a'
LOBBY = 'flat:#6f7f82'
DOORS = ['flat:#6b4a3a', 'flat:#2f4a6e', 'flat:#7a1f24', 'flat:#3d5a54', 'flat:#8d8a82']
FUTON = ['#e8e2d2', '#c7d6e6', '#e6c7cf', '#d9e3c5', '#f0d9a8']

VARIANTS = [
    # bal: 'solid' (concrete), 'glass' (frosted panels) or 'rail' (steel rails, older block).
    dict(id='a', w=20.0, d=11.0, floors=10, wall='flat:#d9cfbd', trim='flat:#b3a892', bal='solid', balcol='flat:#ebe7dc', seed=13),
    dict(id='b', w=14.5, d=12.0, floors=14, wall='flat:#7a5b4a', trim='flat:#5f4638', bal='glass', balcol=BALGLASS, seed=17),
    dict(id='c', w=24.0, d=10.0, floors=7, wall='flat:#e4e2dc', trim='flat:#b9bcbc', bal='rail', balcol='flat:#6c7a80', seed=19),
    dict(id='d', w=26.0, d=11.0, floors=12, wall='flat:#f0eee8', trim='flat:#9aa3a8', bal='glass', balcol='flat:#b7c9c4', seed=29),
    dict(id='e', w=17.0, d=10.0, floors=5, wall='flat:#cdb99a', trim='flat:#a08c6e', bal='rail', balcol='flat:#4f4a44', seed=31),
    dict(id='f', w=13.5, d=11.0, floors=9, wall='flat:#8f9498', trim='flat:#6b7074', bal='solid', balcol='flat:#d9dbd8', seed=43),
]


def levels(v):
    return [G0 + i * FH for i in range(v['floors'])]


def units(v):
    n = max(2, round(v['w'] / 6.6))
    return [(-v['w'] / 2 + v['w'] * k / n, v['w'] / n) for k in range(n)]


def balustrade(p, v, x0, x1, y):
    if v['bal'] == 'solid':
        p.box(v['balcol'], x0, y, 0, x1, y + 1.15, 0.12)
        return
    p.box(FRAME, x0, y + 1.1, 0, x1, y + 1.15, 0.07)
    n = max(1, round((x1 - x0) / 3.3))
    for k in range(n + 1):
        x = x0 + (x1 - x0) * k / n
        p.box(FRAME, min(x, x1 - 0.05), y, 0.01, min(x, x1 - 0.05) + 0.05, y + 1.1, 0.06)
    if v['bal'] == 'glass':
        p.box(v['balcol'], x0, y + 0.1, 0.025, x1, y + 1.05, 0.045)
    else:
        for h in (0.12, 0.45, 0.78):
            p.box(v['balcol'], x0, y + h, 0.02, x1, y + h + 0.04, 0.05)


def front(p, s, v, rng):
    x0, x1 = -v['w'] / 2, v['w'] / 2
    ys = levels(v)
    H = ys[-1]
    us = units(v)
    for x in (x0, x1 - 0.2):                                        # end fins
        p.box(v['wall'], x, 0, 0, x + 0.2, H + PARAPET, BAL)
    for ux, uw in us[1:]:                                           # partition boards between units
        p.box(BOARD, ux - 0.02, G0, 0.12, ux + 0.02, H - 0.18, BAL)
    for y in ys[:-1]:
        p.box(SLAB, x0, y - 0.18, 0, x1, y, BAL)
        balustrade(p, v, x0 + 0.2, x1 - 0.2, y)
        for ux, uw in us:
            p.box(WINDOW, ux + 0.5, y + 0.05, BAL - 0.04, ux + 3.1, y + 2.15, BAL)   # sliding doors
            p.box(WINDOW, ux + uw - 2.3, y + 0.9, BAL - 0.04, ux + uw - 0.7, y + 2.15, BAL)
            if rng.random() < 0.7:
                acu(p, ux + uw - 1.35, y, BAL - 0.4)
            p.box(STEEL, ux + 0.4, y + 1.95, 0.55, ux + uw - 0.4, y + 2.0, 0.6)               # laundry pole
            if rng.random() < 0.3:
                for _ in range(rng.randint(1, 3)):
                    lx0 = rng.uniform(ux + 0.6, ux + uw - 1.6)
                    p.box('flat:' + rng.choice(FUTON), lx0, y + rng.uniform(1.15, 1.45), 0.56, lx0 + rng.uniform(0.35, 0.9), y + 1.95, 0.6)
            if rng.random() < 0.12:                                          # bedding out to air
                fx = ux + rng.uniform(0.6, uw - 2.2)
                p.box('flat:' + rng.choice(FUTON), fx, y + 0.45, -0.07, fx + 1.5, y + 1.19, 0.19)
    p.box(SLAB, x0, H - 0.18, 0, x1, H, BAL)                        # roof overhang
    p.box(v['trim'], x0, H, 0, x1, H + PARAPET, 0.15)

    # Ground storey: lobby in one bay, a hedge in front of the ground-floor flats.
    lx, lw = us[len(us) // 2]
    for ux, uw in us:
        if ux == lx:
            p.box(LOBBY, ux + 0.3, 0, BAL - 0.03, ux + uw - 0.3, G0 - 0.4, BAL)
            m = ux + uw / 2
            p.box(FRAME, m - 1.1, 0, BAL - 0.08, m + 1.1, 2.4, BAL - 0.03)
            p.box(LOBBY, m - 1.0, 0.05, BAL - 0.1, m - 0.03, 2.3, BAL - 0.08)
            p.box(LOBBY, m + 0.03, 0.05, BAL - 0.1, m + 1.0, 2.3, BAL - 0.08)
            p.box(v['trim'], ux + 0.2, 2.75, -1.3, ux + uw - 0.2, 2.95, BAL)              # canopy
            for cx in (ux + 0.3, ux + uw - 0.5):
                p.box(v['trim'], cx, 0, -1.2, cx + 0.2, 2.75, -1.0)
            p.box(v['trim'], ux - 1.6, 0, -0.6, ux - 0.2, 1.1, -0.35)                     # name stone
            sign(s, '#26282c', ux - 1.45, 0.45, -0.63, ux - 0.35, 0.9, -0.6)
        else:
            win(p, ux + 0.6, 0.9, ux + 2.8, 2.3, BAL)
            win(p, ux + uw - 2.3, 0.9, ux + uw - 0.7, 2.3, BAL)
            p.box(v['trim'], ux + 0.2, 0, -0.1, ux + uw - 0.2, 0.45, 0.1)
            p.box(HEDGE, ux + 0.25, 0.45, -0.25, ux + uw - 0.25, 1.25, 0.3)


def back(p, v, rng):
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    ys = [0.0] + levels(v)[:-1]
    H = levels(v)[-1]
    tx = x1 - 3.0                                                   # stair and lift tower at the +x end
    zc = D - COR
    for y in ys:
        if y > 0:
            p.box(SLAB, x0, y - 0.18, zc, tx, y, D)
            p.box(v['wall'], x0, y, D - 0.12, tx, y + 1.15, D)
        for ux, uw in units(v):
            if ux + 1.7 > tx:
                continue
            p.box(rng.choice(DOORS), ux + 0.7, y, zc, ux + 1.6, y + 2.0, zc + 0.03)
            win(p, ux + 2.2, y + 1.0, min(ux + 3.4, tx - 0.2), y + 2.0, zc, out=1, glass=WINDOW_LIT if rng.random() < 0.35 else WINDOW)
            for bx in (ux + 2.5, ux + 2.85, ux + 3.2):
                if bx < min(ux + 3.4, tx - 0.2) - 0.1:
                    p.box(STEEL, bx - 0.015, y + 1.0, zc + 0.07, bx + 0.015, y + 2.0, zc + 0.1)
            p.box('flat:#d9d5c4', ux + 1.75, y + 1.2, zc, ux + 2.05, y + 1.7, zc + 0.18)
    p.box(SLAB, x0, H - 0.18, zc, tx, H, D)
    p.box(v['trim'], tx, 0, zc, x1, H + 3.0, D + 0.4)
    for y in ys:
        p.box(WINDOW, tx + 1.0, y + 1.2, D + 0.4, tx + 2.0, y + 2.4, D + 0.42)
    p.box(DARK, tx - 0.02, 0, zc + 0.15, tx, 2.1, D - 0.2)          # way into the stair


def body(p, v, rng):
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    H = levels(v)[-1]
    p.box(v['wall'], x0, 0, BAL, x1, H, D - COR)
    for y in levels(v)[:-1]:                                        # gable-end windows, framed
        p.box(FRAME, x0 - 0.06, y + 0.84, D * 0.45 - 0.06, x0, y + 2.06, D * 0.45 + 1.06)
        p.box(WINDOW_LIT if rng.random() < 0.35 else WINDOW, x0 - 0.08, y + 0.9, D * 0.45, x0 - 0.06, y + 2.0, D * 0.45 + 1.0)
    p.box(ROOF, x0 + 0.2, H, BAL + 0.2, x1 - 0.2, H + 0.03, D - COR - 0.2)
    for a, b, c, d in ((x0, BAL, x0 + 0.2, D - COR), (x1 - 0.2, BAL, x1, D - COR), (x0, D - COR - 0.2, x1 - 3.0, D - COR)):
        p.box(v['wall'], a, H, b, c, H + PARAPET, d)
    tank(p, x0 + 2.2, H, D - COR - 2.2)
    p.cyl(STEEL, (x1 - 1.5, H + 3.0 + 1.8, D - 0.6), 1, 0.03, 3.6, seg=6)
    p.cyl(STEEL, (x0 - 0.06, H / 2, BAL + 0.5), 1, 0.05, H, seg=6, caps=False)


def build_hi(v):
    rng = random.Random(v['seed'])
    p, s = Part(), Part()
    s.body = p
    body(p, v, rng)
    front(p, s, v, rng)
    back(p, v, rng)
    backs(p, v['w'], v['d'], levels(v), rng, back=False, signs=s, side_z=(BAL, v['d'] - COR))
    return p, s


def build_lo(v):
    # (Faces stand 0.25 m or more off the wall: seen from 200–500 m the depth buffer must still part them.)
    p = Part()
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    ys = levels(v)
    H = ys[-1]
    p.box(v['wall'], x0, 0, 0, x1, H + PARAPET, D)
    band = v['balcol'] if v['bal'] != 'rail' else SLAB
    for y in ys[:-1]:
        lo_band(p, x0 + 0.2, y + 1.15, -0.25, x1 - 0.2, y + FH - 0.18, 0)
        p.box(band, x0 + 0.2, y - 0.18, -0.3, x1 - 0.2, y + 1.15, 0)
        p.box(DARK, x0, y + 1.15, D, x1 - 3.0, y + FH - 0.18, D + 0.03)
    p.box(LOBBY, x0 + 0.5, 0.3, -0.25, x1 - 0.5, G0 - 0.5, 0)
    p.box(v['trim'], x1 - 3.0, H + PARAPET, D - COR, x1, H + 3.0, D + 0.4)
    tank(p, x0 + 1.6, H + PARAPET, D - 2.4)
    for k in range(3):
        p.box(ACU, x0 + 0.6 + k * 1.1, H + PARAPET, D * 0.4, x0 + 1.5 + k * 1.1, H + PARAPET + 0.7, D * 0.4 + 0.35)
    return p


run('manshon', VARIANTS, build_hi, build_lo)
