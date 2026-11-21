# Builds Minamihorie's canal-front boutiques: old two-to-four storey buildings turned into small
# shops and cafés, facing a quiet canal. No neon: canvas awnings, painted boards, plants, warm light.
#
#   blender --background --python tools/blender/build_boutique.py -- [--renders <dir>]
#
# Writes assets/buildings/boutique.blend and public/models/buildings/boutique.glb.
#
# Frame and helpers: buildkit.py (front at z = 0 facing -z, the canal walk). Each variant exports
# as boutique_<id> (body + signs) and boutique_<id>_lo. The game letters the boards
# (render/building-models.ts, kind 'boutique'). Depth stays within CANAL_ROW (10.5 m); sizes are
# mirrored in src/stations/buildings.ts.
#
# The ground floor stands back REC behind the upper front: the recess holds planters, a bench and
# parked bicycles, or (terrace variants) café tables under string lights.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

G0 = 3.4
FH = 2.9
PARAPET = 0.6
TIMBER = 'flat:#6b4a2e'
TIMBER_DK = 'flat:#3b2a1e'
OAK = 'flat:#c49a64'
IRON = 'flat:#26292b'
POT = 'flat:#9a5a3a'
LEAF = ['flat:#4f8f45', 'flat:#3f7a3a', 'flat:#6aa84f']
GOODS = ['flat:#e8e2d0', 'flat:#2f7f7a', 'flat:#c98a4b', 'flat:#d9cfb8', 'flat:#8e5ea2', 'flat:#3c3f42', 'flat:#b23a3a']

VARIANTS = [
    dict(id='a', w=6.4, d=10.0, floors=3, wall='flat:#efe9dc', trim='flat:#6b4a2e', awning=('#2f7f7a', '#efe6d2'), kind='terrace', roof='flat', seed=201),
    dict(id='b', w=5.2, d=9.5, floors=2, wall='flat:#8e4a35', trim='flat:#d9cfb8', awning=('#3a3d41', '#3a3d41'), kind='shop', roof='gable', seed=211),
    dict(id='c', w=7.6, d=10.0, floors=4, wall='flat:#d9cdb8', trim='flat:#26292b', awning=('#b23a3a', '#efe6d2'), kind='shop', roof='flat', seed=223),
    dict(id='d', w=4.8, d=9.0, floors=3, wall='flat:#6b5440', trim='flat:#efe6d2', awning=('#c9a227', '#c9a227'), kind='plants', roof='gable', seed=227),
    dict(id='e', w=8.6, d=10.0, floors=3, wall='flat:#c9d0d4', trim='flat:#2f4a5a', awning=('#2f4a5a', '#e8e2d0'), kind='terrace', roof='flat', seed=233),
    dict(id='f', w=5.8, d=9.5, floors=2, wall='flat:#e4d6c0', trim='flat:#8e4a35', awning=('#6b8e23', '#efe6d2'), kind='plants', roof='gable', seed=239),
]


def levels(v):
    return [G0 + i * FH for i in range(v['floors'])]


def ball(p, mat, c, r, seg=8, rings=5):
    def P(i, j):
        th, ph = 2 * math.pi * i / seg, math.pi * j / rings - math.pi / 2
        return (c[0] + r * math.cos(ph) * math.cos(th), c[1] + r * math.sin(ph), c[2] + r * math.cos(ph) * math.sin(th))
    for i in range(seg):
        for j in range(rings):
            th, ph = 2 * math.pi * (i + 0.5) / seg, math.pi * (j + 0.5) / rings - math.pi / 2
            hint = (math.cos(ph) * math.cos(th), math.sin(ph), math.cos(ph) * math.sin(th))
            pts = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]
            if j == 0:
                pts = [P(i, j), P(i + 1, j + 1), P(i, j + 1)]
            elif j == rings - 1:
                pts = [P(i, j), P(i + 1, j), P(i, j + 1)]
            p.face(mat, pts, hint)


def planter(p, x, z, rng, big=False):
    w = 0.5 if big else 0.34
    p.box(POT, x - w / 2, 0, z - w / 2, x + w / 2, 0.42 if big else 0.3, z + w / 2)
    ball(p, rng.choice(LEAF), (x, (0.42 if big else 0.3) + (0.35 if big else 0.22), z), 0.38 if big else 0.24)


def bicycle(p, x, z, col):
    for dz in (-0.5, 0.5):
        p.cyl(IRON, (x, 0.34, z + dz), 0, 0.34, 0.04, seg=12, caps=False)
    p.box('flat:' + col, x - 0.02, 0.45, z - 0.45, x + 0.02, 0.5, z + 0.4)
    p.box('flat:' + col, x - 0.02, 0.34, z - 0.05, x + 0.02, 0.75, z)
    p.box(IRON, x - 0.1, 0.78, z - 0.1, x + 0.1, 0.82, z + 0.05)
    p.box(IRON, x - 0.25, 0.9, z + 0.42, x + 0.25, 0.93, z + 0.45)


def ground(p, s, v, rng):
    x0, x1 = -v['w'] / 2, v['w'] / 2
    REC = 2.2 if v['kind'] == 'terrace' else 0.9
    a, b = x0 + 0.25, x1 - 0.25
    # Piers at the corners carry the upper front; soffit over the recess.
    for x in (x0, x1 - 0.25):
        p.box(v['trim'], x, 0, 0, x + 0.25, G0, 0.25)
    p.box(TIMBER_DK, a, G0 - 0.25, 0, b, G0, REC)
    # The shop front at the back of the recess: kick plate, tall glass, a door, oak frame.
    dx = a + (b - a) * 0.78
    p.box(TIMBER, a, 0, REC, b, 0.4, REC + 0.08)
    p.box('glassTint', a, 0.4, REC + 0.03, dx - 0.55, G0 - 0.55, REC + 0.05)
    p.box(WINDOW_LIT, a + 0.05, 0.42, REC + 0.4, dx - 0.6, G0 - 0.6, REC + 0.42)   # lit shop inside
    p.box(TIMBER_DK, dx - 0.5, 0, REC - 0.02, dx + 0.5, 2.3, REC + 0.04)
    p.box('glassTint', dx - 0.4, 0.1, REC - 0.03, dx + 0.4, 2.2, REC - 0.02)
    p.box('glassTint', dx + 0.55, 0.4, REC + 0.03, b, G0 - 0.55, REC + 0.05)
    for x in (a, dx - 0.55, dx + 0.5, b - 0.05):
        p.box(OAK, x, 0, REC - 0.04, x + 0.06, G0 - 0.5, REC + 0.1)
    p.box(OAK, a, G0 - 0.55, REC - 0.04, b, G0 - 0.5, REC + 0.1)
    # Goods in the window: chairs, a lamp, a rail of clothes, a shelf of ceramics.
    ga, gb = a + 0.2, dx - 0.7
    k = 0
    x = ga
    while x < gb - 0.5:
        g = (k + v['seed']) % 4
        z = REC + 0.35
        if g == 0:   # chair
            c = rng.choice(GOODS)
            p.box(c, x, 0.42, z, x + 0.42, 0.46, z + 0.42)
            p.box(c, x, 0.46, z + 0.38, x + 0.42, 0.9, z + 0.42)
            for ox in (0.02, 0.38):
                for oz in (0.02, 0.38):
                    p.box(TIMBER, x + ox, 0.0, z + oz, x + ox + 0.03, 0.42, z + oz + 0.03)
            x += 0.6
        elif g == 1:  # floor lamp
            p.cyl(IRON, (x + 0.2, 0.75, z + 0.2), 1, 0.02, 1.5, seg=5)
            p.cyl('light', (x + 0.2, 1.55, z + 0.2), 1, 0.18, 0.22, seg=10)
            x += 0.45
        elif g == 2:  # clothes rail
            p.box(IRON, x, 1.55, z + 0.15, x + 0.9, 1.58, z + 0.18)
            for j in range(6):
                p.box(rng.choice(GOODS), x + 0.05 + j * 0.14, 0.75, z + 0.08, x + 0.15 + j * 0.14, 1.52, z + 0.26)
            x += 1.0
        else:  # shelf of ceramics
            p.box(OAK, x, 0.9, z, x + 0.9, 0.94, z + 0.3)
            p.box(OAK, x, 1.4, z, x + 0.9, 1.44, z + 0.3)
            for j in range(4):
                for y in (0.94, 1.44):
                    p.cyl(rng.choice(GOODS), (x + 0.12 + j * 0.22, y + 0.08, z + 0.15), 1, 0.07, 0.16, seg=8)
            x += 1.0
        k += 1
    # The board over the recess (lettered by the game), a small blade sign, the canvas awning.
    sign(s, v['awning'][0], a + 0.2, G0 - 0.95, -0.05, b - 0.2, G0 - 0.3, 0.0)
    sign(s, v['awning'][0], x1 - 0.2, G0 + 0.2, -0.75, x1 - 0.06, G0 + 1.1, -0.15)
    p.box(IRON, x1 - 0.2, G0 + 1.08, -0.78, x1 - 0.06, G0 + 1.12, 0.0)
    n = max(2, int((b - a) / 0.5))
    for kk in range(n):
        ua, ub = a + (b - a) * kk / n, a + (b - a) * (kk + 1) / n
        col = 'flat:' + v['awning'][kk % 2]
        p.face(col, [(ua, G0 - 1.0, 0.0), (ub, G0 - 1.0, 0.0), (ub, G0 - 1.45, -1.0), (ua, G0 - 1.45, -1.0)], (0, 1, -0.4))
        p.face(col, [(ub, G0 - 1.45, -1.0), (ua, G0 - 1.45, -1.0), (ua, G0 - 1.65, -1.0), (ub, G0 - 1.65, -1.0)], (0, 0, -1))
    # The recess: café tables under string lights, or planters, a bench and bicycles.
    if v['kind'] == 'terrace':
        p.box(OAK, a, 0, 0.05, b, 0.08, REC)
        for tx in [a + 0.7 + j * 1.5 for j in range(int((b - a - 0.4) / 1.5))]:
            p.cyl('flat:#f4f1e8', (tx, 0.74, 1.1), 1, 0.34, 0.03, seg=12)
            p.cyl(IRON, (tx, 0.38, 1.1), 1, 0.03, 0.72, seg=6)
            for dz in (-0.5, 0.5):
                p.box(TIMBER, tx - 0.18, 0.44, 1.1 + dz - 0.18, tx + 0.18, 0.48, 1.1 + dz + 0.18)
        for j in range(int((b - a) / 0.5)):
            x = a + 0.25 + j * 0.5
            p.box('light', x - 0.04, G0 - 0.45 - 0.1 * math.sin(j * 0.9), 0.15, x + 0.04, G0 - 0.37 - 0.1 * math.sin(j * 0.9), 0.23)
        p.box(IRON, a, G0 - 0.38, 0.18, b, G0 - 0.36, 0.2)
        planter(p, a + 0.25, 0.25, rng, True)
        planter(p, b - 0.25, 0.25, rng, True)
    else:
        planter(p, a + 0.3, 0.45, rng, True)
        planter(p, a + 0.85, 0.35, rng)
        p.box(OAK, dx - 0.5 - 1.3, 0.42, 0.25, dx - 0.6, 0.46, 0.6)
        for x in (dx - 1.75, dx - 0.7):
            p.box(IRON, x - 0.02, 0, 0.27, x + 0.02, 0.42, 0.58)
        if v['kind'] == 'plants':
            for j in range(4):
                planter(p, b - 0.3 - j * 0.42, 0.3 + (j % 2) * 0.25, rng, j % 2 == 0)
        bicycle(p, b - 0.35 if v['kind'] != 'plants' else a + 1.6, 0.45, rng.choice(['#2f7f7a', '#b23a3a', '#e8e2d0', '#3c3f42']))


def upper(p, s, v, rng):
    x0, x1 = -v['w'] / 2, v['w'] / 2
    ys = levels(v)
    H = ys[-1]
    wall, trim = v['wall'], v['trim']
    a, b = x0 + 0.25, x1 - 0.25
    p.box(wall, x0, G0, -0.02, x1, H + (PARAPET if v['roof'] == 'flat' else 0.0), 0.25)
    p.box(trim, x0, G0, -0.05, x1, G0 + 0.12, 0.0)
    for i, y in enumerate(ys[:-1]):
        nwin = max(1, round((b - a) / 1.7))
        ww = (b - a - 0.4 * (nwin + 1)) / nwin
        for k in range(nwin):
            xa = a + 0.4 + k * (ww + 0.4)
            win(p, xa, y + 0.8, xa + ww, y + FH - 0.35, -0.02, glass=WINDOW_LIT if rng.random() < 0.7 else WINDOW)
            if (i + k) % 2 == 0:
                # A window box of plants under the sill.
                p.box(TIMBER, xa, y + 0.62, -0.34, xa + ww, y + 0.8, -0.02)
                for j in range(max(1, int(ww / 0.3))):
                    ball(p, rng.choice(LEAF), (xa + 0.15 + j * 0.3, y + 0.92, -0.18), 0.16, seg=6, rings=4)
        if i == 0 and v['w'] > 5.5:
            # A small balcony on the first floor with a bistro chair.
            p.box('flat:#9b978e', a + 0.3, y - 0.05, -0.8, b - 0.3, y + 0.05, 0.0)
            p.box(IRON, a + 0.3, y + 0.95, -0.82, b - 0.3, y + 1.0, -0.78)
            for x in [a + 0.35 + j * 0.12 for j in range(int((b - a - 0.7) / 0.12) + 1)]:
                p.box(IRON, x - 0.01, y + 0.05, -0.81, x + 0.01, y + 0.97, -0.79)
            planter(p, a + 0.6, -0.45, rng)
            p.box(rng.choice(GOODS), b - 0.9, y + 0.48, -0.65, b - 0.5, y + 0.52, -0.25)
    if v['roof'] == 'flat':
        p.box(trim, x0 - 0.05, H + PARAPET - 0.1, -0.08, x1 + 0.05, H + PARAPET, 0.25)
    else:
        # A gabled tile roof, ridge across the front, eaves over the canal.
        D = v['d']
        p.prism('flat:#4a4f52', [(-0.5, H), (D + 0.3, H), (D / 2, H + 2.0)], 'x', x0 - 0.3, x1 + 0.3)
        p.box(TIMBER_DK, x0 - 0.3, H - 0.08, -0.5, x1 + 0.3, H, D + 0.3)


def volume(p, v):
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    H = levels(v)[-1]
    REC = 2.2 if v['kind'] == 'terrace' else 0.9
    p.box(v['wall'], x0, G0, 0.25, x1, H, D)
    p.box(v['wall'], x0, 0, REC + 0.1, x1, G0, D)
    for x in (x0, x1 - 0.25):
        p.box(v['wall'], x, 0, 0.25, x + 0.25, G0, REC + 0.1)
    for y in levels(v)[:-1]:
        p.box(WINDOW, x0 + v['w'] * 0.3 - 0.5, y + 0.9, D, x0 + v['w'] * 0.3 + 0.5, y + 2.1, D + 0.02)
    p.cyl(STEEL, (x1 + 0.06, H / 2, D - 0.6), 1, 0.05, H, seg=6, caps=False)
    if v['roof'] == 'flat':
        p.box(ROOF, x0 + 0.2, H, 0.3, x1 - 0.2, H + 0.03, D - 0.2)
        p.box(v['wall'], x0, H, D - 0.2, x1, H + PARAPET, D)
        for x in (x0, x1 - 0.2):
            p.box(v['wall'], x, H, 0.25, x + 0.2, H + PARAPET, D)
        p.box(ACU, x0 + 0.6, H + 0.05, D * 0.5, x0 + 1.5, H + 0.7, D * 0.5 + 0.35)


def build_hi(v):
    rng = random.Random(v['seed'])
    p, s = Part(), Part()
    s.body = p
    volume(p, v)
    ground(p, s, v, rng)
    upper(p, s, v, rng)
    backs(p, v['w'], v['d'], levels(v), rng, signs=s, side_z=(2.3 if v['kind'] == 'terrace' else 1.0, v['d']))
    return p, s


def build_lo(v):
    rng = random.Random(v['seed'])
    p = Part()
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    ys = levels(v)
    H = ys[-1]
    p.box(v['wall'], x0, 0, 0, x1, H, D)
    p.box(WINDOW_LIT, x0 + 0.3, 0.4, -0.03, x1 - 0.3, G0 - 0.6, 0)
    for y in ys[:-1]:
        p.box(WINDOW_LIT, x0 + 0.5, y + 0.8, -0.03, x1 - 0.5, y + FH - 0.35, 0)
    sign(p, v['awning'][0], x0 + 0.4, G0 - 0.95, -0.05, x1 - 0.4, G0 - 0.3, 0.0, glyphs=False)
    rng.random()
    p.box(ACU, x0 + 0.6, H, D * 0.5, x0 + 1.5, H + 0.65, D * 0.5 + 0.32)
    return p


run('boutique', VARIANTS, build_hi, build_lo)
