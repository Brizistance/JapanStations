# Builds Midorizaka's street-level set pieces (緑坂, the north hills: park, station plaza, Ginza).
#
#   blender --background --python tools/blender/build_midori.py -- [--renders <dir>]
#
# Writes assets/buildings/midori.blend and public/models/buildings/midori.glb.
#
# Frame and helpers: see buildkit.py. One root per piece, midori_<id>, one mesh each. Sizes are
# mirrored in src/stations/midorizaka-street.ts, which adds colliders, water, trees, lights and every
# name (models carry no text).
#
#   bridge    a stone arch bridge over the pond, BL long along x, BW wide, crown BH over the path.
#   trellis   the wisteria trellis: TL × TD on eight timber posts, purple racemes hanging, two benches.
#   slide     a playground slide, its ladder at −x (SL long).
#   climber   a jungle gym, CW square, CH high.
#   island    the rotary's island: a raised planted kerb IW × ID with low hedges and a clock post.
#   ginza_a/b two-storey shop-houses of the shopping street, GW wide × GD deep, front at z = 0:
#             two shops each under striped awnings, a fascia board each (lettered by the game),
#             flats above with balconies.

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

STONE = 'flat:#b9b09c'
STONE_DK = 'flat:#8f877a'
TIMBER = 'flat:#6b4a2e'
TIMBER_DK = 'flat:#4a3424'
WIST = 'flat:#9b7fc4'
WIST_DK = 'flat:#7a5fa8'
LEAF = 'flat:#4f7a3a'
RED = 'flat:#c0392b'
YELLOW = 'flat:#f2c14e'
BLUE = 'flat:#3c7dc4'
STEEL_W = 'flat:#e9e7df'
IRON = 'flat:#26292b'
HEDGE = 'flat:#3f6b3a'
KERB = 'flat:#a9a59a'
WHITE = 'flat:#f4f1e8'

# Shared with src/stations/midorizaka-street.ts.
BL, BW, BH = 9.0, 2.4, 1.6
TL, TD = 8.0, 3.2
SL = 4.2
CW, CH = 2.4, 2.0
IW, ID = 16.0, 6.0
GW, GD = 8.0, 9.0


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


def bridge(p):
    # The deck follows a shallow arch: a stone slab in segments, parapets with a capping, an arch ring under.
    n = 12
    h = BL / 2
    y = lambda x: BH * (1 - (x / h) ** 2) + 0.05
    intra = lambda x: -0.9 + (BH + 0.1) * math.sqrt(max(0.0, 1 - (x / (h * 0.8)) ** 2))
    for k in range(n):
        xa, xb = -h + BL * k / n, -h + BL * (k + 1) / n
        ya, yb = y(xa), y(xb)
        for (z0, z1, mat) in ((-BW / 2, BW / 2, STONE),):
            p.face(mat, [(xa, ya, z0), (xb, yb, z0), (xb, yb, z1), (xa, ya, z1)], (0, 1, 0))
            p.face(STONE_DK, [(xa, ya - 0.35, z1), (xb, yb - 0.35, z1), (xb, yb - 0.35, z0), (xa, ya - 0.35, z0)], (0, -1, 0))
        for s in (-1, 1):
            z = s * BW / 2
            p.face(STONE_DK, [(xa, ya - 0.35, z), (xb, yb - 0.35, z), (xb, yb + 0.7, z), (xa, ya + 0.7, z)], (0, 0, s))
            p.face(STONE_DK, [(xa, ya, z - s * 0.2), (xb, yb, z - s * 0.2), (xb, yb + 0.7, z - s * 0.2), (xa, ya + 0.7, z - s * 0.2)], (0, 0, -s))
            p.face(STONE, [(xa, ya + 0.7, z - s * 0.24), (xb, yb + 0.7, z - s * 0.24), (xb, yb + 0.78, z - s * 0.24), (xa, ya + 0.78, z - s * 0.24)], (0, 0, -s))
            p.face(STONE, [(xa, ya + 0.78, z + s * 0.04), (xb, yb + 0.78, z + s * 0.04), (xb, yb + 0.78, z - s * 0.24), (xa, ya + 0.78, z - s * 0.24)], (0, 1, 0))
            # The arch ring down to the water, voussoirs alternately shaded.
            # Spandrel down to the arch's opening (the intrados), so the water shows through under it.
            ia, ib = intra(xa), intra(xb)
            p.face(STONE if k % 2 else STONE_DK, [(xa, ia, z + s * 0.01), (xb, ib, z + s * 0.01), (xb, yb - 0.35, z + s * 0.01), (xa, ya - 0.35, z + s * 0.01)], (0, 0, s))
            p.face(STONE_DK, [(xa, ia, z), (xb, ib, z), (xb, ib, -z), (xa, ia, -z)], (0, -1, 0))
    for x in (-h, h):
        for s in (-1, 1):
            p.box(STONE_DK, x - 0.3, 0, s * BW / 2 - 0.3, x + 0.3, 1.0, s * BW / 2 + 0.3)
            ball(p, STONE, (x, 1.12, s * BW / 2), 0.16)


def trellis(p):
    # Posts, beams, slats; hanging wisteria; two benches under it.
    for x in (-TL / 2 + 0.2, -TL / 6, TL / 6, TL / 2 - 0.2):
        for z in (0.2, TD - 0.2):
            p.box(TIMBER, x - 0.1, 0, z - 0.1, x + 0.1, 2.6, z + 0.1)
    for z in (0.2, TD - 0.2):
        p.box(TIMBER_DK, -TL / 2 - 0.2, 2.5, z - 0.08, TL / 2 + 0.2, 2.7, z + 0.08)
    x = -TL / 2
    while x <= TL / 2 + 0.01:
        p.box(TIMBER, x - 0.04, 2.7, -0.2, x + 0.04, 2.8, TD + 0.2)
        x += 0.4
    p.box(LEAF, -TL / 2, 2.8, 0, TL / 2, 2.95, TD)
    k = 0
    x = -TL / 2 + 0.2
    while x < TL / 2 - 0.1:
        z = 0.3 + (k * 0.37) % (TD - 0.6)
        ln = 0.45 + (k % 4) * 0.12
        for j in range(3):
            r = 0.13 - j * 0.03
            ball(p, WIST if (k + j) % 2 else WIST_DK, (x, 2.62 - j * ln / 3, z), r, seg=6, rings=4)
        x += 0.31
        k += 1
    for z in (0.75, TD - 0.75):
        p.box(TIMBER_DK, -TL / 2 + 0.8, 0.42, z - 0.22, -0.4, 0.47, z + 0.22)
        p.box(TIMBER_DK, 0.4, 0.42, z - 0.22, TL / 2 - 0.8, 0.47, z + 0.22)
        for xx in (-TL / 2 + 1.0, -0.6, 0.6, TL / 2 - 1.0):
            p.box(IRON, xx - 0.04, 0, z - 0.2, xx + 0.04, 0.42, z + 0.2)


def slide(p):
    # Ladder up to a platform at 1.6, the chute down to +x.
    for z in (-0.3, 0.3):
        p.box(STEEL_W, -SL / 2 - 0.05, 0, z - 0.04, -SL / 2 + 0.05, 2.5, z + 0.04)
        p.box(STEEL_W, -SL / 2 + 0.75, 0, z - 0.04, -SL / 2 + 0.85, 2.5, z + 0.04)
    for y in (0.3, 0.6, 0.9, 1.2):
        p.box(STEEL_W, -SL / 2 - 0.04, y, -0.3, -SL / 2 + 0.04, y + 0.04, 0.3)
    p.box(BLUE, -SL / 2, 1.55, -0.35, -SL / 2 + 0.85, 1.62, 0.35)
    p.box(STEEL_W, -SL / 2, 1.62, -0.36, -SL / 2 + 0.85, 2.4, -0.33)
    p.box(STEEL_W, -SL / 2, 1.62, 0.33, -SL / 2 + 0.85, 2.4, 0.36)
    x0, x1 = -SL / 2 + 0.85, SL / 2
    n = 8
    for k in range(n):
        xa, xb = x0 + (x1 - x0) * k / n, x0 + (x1 - x0) * (k + 1) / n
        ya = 1.6 - 1.3 * (k / n) ** 1.2
        yb = 1.6 - 1.3 * ((k + 1) / n) ** 1.2
        p.face(YELLOW, [(xa, ya, -0.28), (xb, yb, -0.28), (xb, yb, 0.28), (xa, ya, 0.28)], (0, 1, 0))
        p.face(YELLOW, [(xa, ya - 0.04, 0.28), (xb, yb - 0.04, 0.28), (xb, yb - 0.04, -0.28), (xa, ya - 0.04, -0.28)], (0, -1, 0))
        for s in (-1, 1):
            z = s * 0.3
            p.face(YELLOW, [(xa, ya - 0.04, z), (xb, yb - 0.04, z), (xb, yb + 0.2, z), (xa, ya + 0.2, z)], (0, 0, s))
    p.box(STEEL_W, x1 - 0.35, 0, -0.25, x1 - 0.28, 0.32, 0.25)


def climber(p):
    # A cube of steel bars, three bays each way, painted in turns.
    cols = [RED, BLUE, YELLOW]
    n = 3
    for i in range(n + 1):
        for j in range(n + 1):
            x, z = -CW / 2 + CW * i / n, -CW / 2 + CW * j / n
            p.box(cols[(i + j) % 3], x - 0.03, 0, z - 0.03, x + 0.03, CH, z + 0.03)
    for k in range(1, n + 1):
        y = CH * k / n
        for i in range(n + 1):
            x = -CW / 2 + CW * i / n
            p.box(cols[(i + k) % 3], x - 0.025, y - 0.025, -CW / 2, x + 0.025, y + 0.025, CW / 2)
            p.box(cols[(i + k + 1) % 3], -CW / 2, y - 0.025, x - 0.025, CW / 2, y + 0.025, x + 0.025)


def island(p):
    # A raised kerb with granite edging, a lawn, low clipped hedges round, the clock post in the middle.
    p.box(KERB, -IW / 2, 0, -ID / 2, IW / 2, 0.18, ID / 2)
    p.box(LEAF, -IW / 2 + 0.25, 0.18, -ID / 2 + 0.25, IW / 2 - 0.25, 0.2, ID / 2 - 0.25)
    for s in (-1, 1):
        p.box(HEDGE, -IW / 2 + 0.3, 0.2, s * (ID / 2 - 0.3) - 0.25, IW / 2 - 0.3, 0.75, s * (ID / 2 - 0.3) + 0.25)
    for x in (-IW / 2 + 0.55, IW / 2 - 0.55):
        p.box(HEDGE, x - 0.25, 0.2, -ID / 2 + 0.55, x + 0.25, 0.75, ID / 2 - 0.55)
    # The clock post: a green iron column, a two-faced drum, a little cap.
    p.cyl('flat:#2f5a3c', (0, 0.4, 0), 1, 0.3, 0.4, seg=12)
    p.cyl('flat:#2f5a3c', (0, 2.0, 0), 1, 0.09, 3.2, seg=10)
    p.cyl('flat:#2f5a3c', (0, 3.9, 0), 2, 0.5, 0.3, seg=20)
    p.cyl('flat:#c9a227', (0, 4.45, 0), 1, 0.1, 0.25, seg=8)
    # Flower beds at the ends.
    for x in (-IW / 2 + 2.2, IW / 2 - 2.2):
        for k in range(10):
            ball(p, ['flat:#e84a6f', YELLOW, WHITE, 'flat:#9b7fc4'][k % 4], (x - 0.9 + (k % 5) * 0.45, 0.32, -0.5 + (k // 5) * 1.0), 0.18, seg=6, rings=4)


GINZA = {
    'a': [('flat:#efe7d2', '#c0392b', 'glass'), ('flat:#d9cfb8', '#2e6b35', 'open')],
    'b': [('flat:#e3dccb', '#3c7dc4', 'open'), ('flat:#c9b79a', '#7a2e0e', 'glass')],
}


def ginza(p, spec):
    for k, (wall, awn, front) in enumerate(spec):
        x0, x1 = -GW / 2 + k * GW / 2, k * GW / 2
        # The body: a shop floor and a floor of flats, a parapet, the side walls.
        p.box(wall, x0, 3.3, 0, x1, 7.4, GD)
        p.box(wall, x0, 0, 0.6, x1, 3.3, GD)
        p.box(KICK, x0, 7.4, 0, x1, 7.7, 0.3)
        # Balcony with a rail and a window behind.
        p.box(FRAME, x0 + 0.4, 4.0, -0.02, x1 - 0.4, 6.3, 0)
        p.box(WINDOW, x0 + 0.5, 4.1, -0.03, x1 - 0.5, 6.2, -0.02)
        p.box(CONC, x0 + 0.25, 3.9, -0.95, x1 - 0.25, 4.0, 0)
        p.box(STEEL_W, x0 + 0.25, 4.0, -0.97, x1 - 0.25, 5.0, -0.93)
        p.box(ACU, x1 - 1.1, 4.0, -0.85, x1 - 0.45, 4.6, -0.3)
        # Fascia board for the name, a strip light under it.
        p.box('flat:#2b2d30', x0 + 0.1, 2.75, -0.12, x1 - 0.1, 3.3, 0.6)
        p.box('light', x0 + 0.25, 2.68, -0.08, x1 - 0.25, 2.75, 0.0)
        for xp in (x0, x1 - 0.18):
            p.box(wall, xp, 0, -0.04, xp + 0.18, 2.75, 0.6)
        xa, xb = x0 + 0.18, x1 - 0.18
        if front == 'glass':
            p.box(FRAME, xa, 0, 0.45, xb, 0.4, 0.6)
            p.box(SHOPGLASS, xa, 0.4, 0.5, xb, 2.6, 0.52)
            p.box('light', xa + 0.1, 2.5, 0.52, xb - 0.1, 2.6, 0.7)
            p.box(FRAME, xb - 1.1, 0, 0.45, xb - 1.05, 2.6, 0.55)
        else:
            p.box('flat:#f1ebdd', xa, 0, 0.58, xb, 2.75, 0.6)
            p.box('light', xa + 0.1, 2.6, 0.4, xb - 0.1, 2.66, 0.58)
            for y in (1.0, 1.6):
                p.box(TIMBER, xa, y, 0.35, xb, y + 0.03, 0.6)
            p.box(TIMBER, xa + 0.1, 0, -0.7, xb - 0.1, 0.5, 0.0)
            cols = ['flat:#e84a6f', YELLOW, WHITE, 'flat:#9b7fc4', 'flat:#f08a24', LEAF]
            m = int((xb - xa - 0.2) / 0.38)
            for j in range(m):
                ball(p, cols[(j + k) % len(cols)], (xa + 0.3 + j * 0.38, 0.62, -0.35), 0.15, seg=6, rings=4)
        n = 12
        for j in range(n):
            u0, u1 = xa + (xb - xa) * j / n, xa + (xb - xa) * (j + 1) / n
            col = 'flat:' + awn if j % 2 == 0 else WHITE
            p.face(col, [(u0, 2.7, -0.12), (u1, 2.7, -0.12), (u1, 2.3, -1.0), (u0, 2.3, -1.0)], (0, 0.9, -0.4))
            p.face(col, [(u0, 2.3, -1.0), (u1, 2.3, -1.0), (u1, 2.7, -0.12), (u0, 2.7, -0.12)], (0, -0.9, 0.4))
            p.box(col, u0, 2.12, -1.02, u1, 2.3, -0.99)


PROPS = {
    'bridge': (bridge, BL + 1), 'trellis': (trellis, TL + 1), 'slide': (slide, SL + 1), 'climber': (climber, CW + 1),
    'island': (island, IW + 1), 'ginza_a': (lambda p: ginza(p, GINZA['a']), GW + 1), 'ginza_b': (lambda p: ginza(p, GINZA['b']), GW + 1),
}


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('midori', [dict(id=k, w=w, gap=3.0) for k, (_, w) in PROPS.items()], build_hi, lambda v: None)
