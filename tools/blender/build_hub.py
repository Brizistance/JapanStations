# Builds the Kita-Ōdōri hub's own props: the gilded willow, columns, lanterns and furniture.
#
#   blender --background --python tools/blender/build_hub.py -- [--renders <dir>]
#
# Writes assets/buildings/hub.blend and public/models/buildings/hub.glb.
#
# Frame and helpers: see buildkit.py. Each prop is one root, hub_<id>, with one mesh, hub_<id>_body
# (materials 'paint' and, on the lantern, 'light'). The origin is the middle of the prop on the
# floor, except the lantern, which hangs from its origin. No signs: clock faces, maps and names
# are drawn by the game on top (stations/hub.ts), so nothing here carries information.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

STONE = 'flat:#d9cdb4'
STONE_DK = 'flat:#6e5f4d'
BRASS = 'flat:#b08d3a'
BRASS_LT = 'flat:#d2b25a'
GOLD = ['flat:#d9b43a', 'flat:#e6c75a', 'flat:#c9a227', 'flat:#f0d878']
TIMBER = 'flat:#4a3626'
TIMBER_LT = 'flat:#7a5a3c'
LEAF = ['flat:#4f7a45', 'flat:#3f6a3a', 'flat:#628c50']


def stick(p, mat, a, b, r0, r1=None, seg=6):
    """A tapered tube from a to b."""
    r1 = r0 if r1 is None else r1
    d = [b[i] - a[i] for i in range(3)]
    L = math.sqrt(sum(c * c for c in d)) or 1e-6
    d = [c / L for c in d]
    ref = (0, 1, 0) if abs(d[1]) < 0.9 else (1, 0, 0)
    u = [d[1] * ref[2] - d[2] * ref[1], d[2] * ref[0] - d[0] * ref[2], d[0] * ref[1] - d[1] * ref[0]]
    n = math.sqrt(sum(c * c for c in u))
    u = [c / n for c in u]
    v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]]

    def P(o, r, k):
        t = 2 * math.pi * k / seg
        return tuple(o[i] + r * (math.cos(t) * u[i] + math.sin(t) * v[i]) for i in range(3))

    for k in range(seg):
        t = 2 * math.pi * (k + 0.5) / seg
        hint = tuple(math.cos(t) * u[i] + math.sin(t) * v[i] for i in range(3))
        p.face(mat, [P(a, r0, k), P(a, r0, k + 1), P(b, r1, k + 1), P(b, r1, k)], hint)


def ribbon(p, mat, a, b, w, ang):
    """A thin two-sided strip from a down to b, `w` wide, turned `ang` about the vertical."""
    dx, dz = math.cos(ang) * w / 2, math.sin(ang) * w / 2
    nx, nz = -math.sin(ang), math.cos(ang)
    for s in (1, -1):
        o = 0.004 * s
        pts = [(a[0] - dx + nx * o, a[1], a[2] - dz + nz * o), (a[0] + dx + nx * o, a[1], a[2] + dz + nz * o),
               (b[0] + dx * 0.5 + nx * o, b[1], b[2] + dz * 0.5 + nz * o), (b[0] - dx * 0.5 + nx * o, b[1], b[2] - dz * 0.5 + nz * o)]
        p.face(mat, pts, (nx * s, 0, nz * s))


def willow(p):
    r = random.Random(11)
    # Stone seat ring round a dark planter, banded in brass.
    p.cyl(STONE, (0, 0.24, 0), 1, 2.7, 0.48, seg=20)
    p.cyl(BRASS, (0, 0.5, 0), 1, 2.72, 0.05, seg=20)
    p.cyl(STONE_DK, (0, 0.45, 0), 1, 2.0, 0.9, seg=20)
    p.cyl(BRASS, (0, 0.92, 0), 1, 2.02, 0.05, seg=20)
    # Twisted trunk: a stack of leaning, tapering segments, with two strands wound round it.
    pts = []
    for i in range(13):
        t = i / 12
        y = 0.9 + t * 6.6
        lean = 0.32 * math.sin(t * 2.6)
        pts.append((lean * math.cos(t * 4.0), y, lean * math.sin(t * 4.0)))
    for i in range(12):
        t = i / 12
        stick(p, GOLD[2], pts[i], pts[i + 1], 0.46 - 0.24 * t, 0.46 - 0.24 * (t + 1 / 12), seg=9)
    for ph in (0.0, math.pi):
        prev = None
        for i in range(37):
            t = i / 36
            a = ph + t * 9.0
            rad = 0.5 - 0.25 * t
            k = min(11, int(t * 12))
            f = t * 12 - k
            c = [pts[k][j] + (pts[k + 1][j] - pts[k][j]) * f for j in range(3)]
            q = (c[0] + rad * math.cos(a), c[1], c[2] + rad * math.sin(a))
            if prev:
                stick(p, GOLD[0], prev, q, 0.07, 0.07, seg=5)
            prev = q
    top = pts[-1]
    # Boughs arching out and down, each hung with fronds.
    n = 16
    for bi in range(n):
        a0 = 2 * math.pi * bi / n + r.uniform(-0.12, 0.12)
        reach = r.uniform(3.4, 5.0)
        rise = r.uniform(1.2, 2.4)
        prev = top
        steps = 9
        for s in range(1, steps + 1):
            t = s / steps
            rad = reach * (1 - (1 - t) ** 1.8)
            y = top[1] + rise * math.sin(t * math.pi * 0.62) - 2.6 * t * t
            a = a0 + 0.25 * t
            q = (top[0] + rad * math.cos(a), y, top[2] + rad * math.sin(a))
            stick(p, GOLD[2], prev, q, 0.14 * (1 - t) + 0.035, 0.14 * (1 - t - 1 / steps) + 0.035, seg=5)
            if s >= 2:
                for _ in range(3 if s > 4 else 2):
                    j = (q[0] + r.uniform(-0.25, 0.25), q[1] - 0.02, q[2] + r.uniform(-0.25, 0.25))
                    length = r.uniform(2.0, 4.6) * (0.55 + 0.45 * t)
                    mid = (j[0] + r.uniform(-0.12, 0.12), j[1] - length * 0.5, j[2] + r.uniform(-0.12, 0.12))
                    end = (mid[0] + r.uniform(-0.1, 0.1), max(1.7, j[1] - length), mid[2] + r.uniform(-0.1, 0.1))
                    ang = r.uniform(0, math.pi)
                    col = r.choice(GOLD)
                    ribbon(p, col, j, mid, 0.13, ang)
                    ribbon(p, col, mid, end, 0.065, ang + 0.5)
            prev = q
    # A small crown of upright shoots.
    # A full crown, so the tree reads from the galleries above as well: upright shoots, each
    # spilling fronds outwards.
    for k in range(22):
        a = 2 * math.pi * k / 22 + r.uniform(-0.1, 0.1)
        rad = r.uniform(0.3, 2.2)
        q = (top[0] + rad * math.cos(a), top[1] + r.uniform(1.2, 2.3) - rad * 0.3, top[2] + rad * math.sin(a))
        stick(p, GOLD[1], top, q, 0.09, 0.025, seg=5)
        for _ in range(4):
            b2 = a + r.uniform(-1.2, 1.2)
            out = r.uniform(0.5, 1.4)
            mid = (q[0] + out * 0.6 * math.cos(b2), q[1] - 0.5, q[2] + out * 0.6 * math.sin(b2))
            end = (q[0] + out * math.cos(b2), q[1] - r.uniform(1.6, 2.8), q[2] + out * math.sin(b2))
            col = r.choice(GOLD)
            ribbon(p, col, q, mid, 0.16, b2 + 1.57)
            ribbon(p, col, mid, end, 0.09, b2 + 1.2)


def column(p, h):
    # Stone plinth, brass base ring, fluted shaft, brass capital, stone abacus.
    p.box(STONE_DK, -0.56, 0, -0.56, 0.56, 0.22, 0.56)
    p.cyl(BRASS, (0, 0.28, 0), 1, 0.5, 0.12, seg=16)
    p.cyl(BRASS_LT, (0, 0.37, 0), 1, 0.45, 0.06, seg=16)
    y0, y1 = 0.4, h - 0.46
    seg = 24
    for k in range(seg):
        ra, rb = (0.42, 0.385) if k % 2 == 0 else (0.385, 0.42)
        a, b = 2 * math.pi * k / seg, 2 * math.pi * (k + 1) / seg
        m = (a + b) / 2
        p.face(STONE, [(ra * math.cos(a), y0, ra * math.sin(a)), (rb * math.cos(b), y0, rb * math.sin(b)),
                       (rb * math.cos(b), y1, rb * math.sin(b)), (ra * math.cos(a), y1, ra * math.sin(a))], (math.cos(m), 0, math.sin(m)))
    p.cyl(BRASS_LT, (0, h - 0.43, 0), 1, 0.45, 0.06, seg=16)
    p.cyl(BRASS, (0, h - 0.33, 0), 1, 0.52, 0.14, seg=16)
    p.cyl(BRASS, (0, h - 0.21, 0), 1, 0.6, 0.1, seg=16)
    p.box(STONE, -0.66, h - 0.16, -0.66, 0.66, h, 0.66)


def lantern(p):
    # Hangs from the origin: rod, brass cap, glowing glass body, brass foot and finial.
    p.cyl(BRASS, (0, -0.45, 0), 1, 0.018, 0.9, seg=6)
    p.cyl(BRASS, (0, -0.92, 0), 1, 0.24, 0.05, seg=8)
    p.cyl(BRASS, (0, -0.97, 0), 1, 0.2, 0.06, seg=8)
    p.cyl('light', (0, -1.26, 0), 1, 0.17, 0.52, seg=8)
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        p.cyl(BRASS, (0.175 * math.cos(a), -1.26, 0.175 * math.sin(a)), 1, 0.014, 0.52, seg=5)
    p.cyl(BRASS, (0, -1.55, 0), 1, 0.2, 0.06, seg=8)
    p.cyl(BRASS, (0, -1.63, 0), 1, 0.05, 0.1, seg=6)


def bench(p):
    for sx in (-0.78, 0.78):
        p.box(BRASS, sx - 0.03, 0, -0.24, sx + 0.03, 0.42, -0.19)
        p.box(BRASS, sx - 0.03, 0, 0.19, sx + 0.03, 0.42, 0.24)
        p.box(BRASS, sx - 0.03, 0.38, -0.24, sx + 0.03, 0.42, 0.24)
        p.box(BRASS, sx - 0.03, 0.42, 0.19, sx + 0.03, 0.86, 0.24)
    for k in range(5):
        z = -0.23 + k * 0.105
        p.box(TIMBER_LT if k % 2 else TIMBER, -0.95, 0.42, z, 0.95, 0.46, z + 0.085)
    for k in range(3):
        y = 0.56 + k * 0.11
        p.box(TIMBER_LT if k % 2 else TIMBER, -0.95, y, 0.2, 0.95, y + 0.085, 0.235)


def kiosk(p):
    # Round information desk under a brass ring canopy.
    p.cyl(STONE_DK, (0, 0.06, 0), 1, 1.36, 0.12, seg=20)
    p.cyl(TIMBER, (0, 0.57, 0), 1, 1.3, 0.9, seg=20)
    for k in range(20):
        a = 2 * math.pi * k / 20
        p.box(TIMBER_LT, 1.3 * math.cos(a) - 0.02, 0.14, 1.3 * math.sin(a) - 0.02, 1.3 * math.cos(a) + 0.02, 1.0, 1.3 * math.sin(a) + 0.02)
    p.cyl(STONE, (0, 1.05, 0), 1, 1.4, 0.06, seg=20)
    p.cyl(BRASS, (0, 1.09, 0), 1, 1.42, 0.02, seg=20)
    p.cyl(TIMBER, (0, 1.2, 0), 1, 0.7, 0.24, seg=12)
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        p.cyl(BRASS, (1.22 * math.cos(a), 1.75, 1.22 * math.sin(a)), 1, 0.035, 1.34, seg=6)
    p.cyl(BRASS, (0, 2.48, 0), 1, 1.5, 0.14, seg=20)
    p.cyl(STONE, (0, 2.58, 0), 1, 1.44, 0.06, seg=20)
    p.cyl('light', (0, 2.4, 0), 1, 1.1, 0.02, seg=16)


def totem(p):
    # Standing map: stone foot, brass frame, dark faces for the game's map signs.
    p.box(STONE_DK, -0.75, 0, -0.2, 0.75, 0.22, 0.2)
    p.box(BRASS, -0.68, 0.22, -0.06, 0.68, 2.2, 0.06)
    p.box('flat:#1f2226', -0.6, 0.5, -0.068, 0.6, 2.12, 0.068)
    p.box(BRASS_LT, -0.72, 2.2, -0.09, 0.72, 2.27, 0.09)


def bins(p):
    p.box(STONE_DK, -0.48, 0, -0.22, 0.48, 0.05, 0.22)
    for sx in (-0.23, 0.23):
        p.box(TIMBER, sx - 0.2, 0.05, -0.19, sx + 0.2, 0.86, 0.19)
        p.box(BRASS, sx - 0.21, 0.86, -0.2, sx + 0.21, 0.9, 0.2)
        p.box('flat:#1f2226', sx - 0.12, 0.66, -0.195, sx + 0.12, 0.76, -0.185)
        p.box('flat:#1f2226', sx - 0.12, 0.66, 0.185, sx + 0.12, 0.76, 0.195)


def planter(p):
    r = random.Random(5)
    p.cyl(STONE, (0, 0.3, 0), 1, 0.6, 0.6, seg=10)
    p.cyl(BRASS, (0, 0.58, 0), 1, 0.62, 0.04, seg=10)
    p.cyl('flat:#3a2f28', (0, 0.61, 0), 1, 0.52, 0.02, seg=10)
    stick(p, TIMBER, (0, 0.6, 0), (0.05, 1.5, 0.03), 0.06, 0.04, seg=6)
    for k in range(7):
        a = 2 * math.pi * k / 7
        c = (0.05 + 0.32 * math.cos(a) * r.uniform(0.6, 1), 1.45 + r.uniform(0, 0.8), 0.03 + 0.32 * math.sin(a) * r.uniform(0.6, 1))
        rad = r.uniform(0.28, 0.42)
        col = r.choice(LEAF)
        p.cyl(col, c, 1, rad, rad * 0.9, seg=7)
        p.cyl(col, (c[0], c[1] + rad * 0.6, c[2]), 1, rad * 0.62, rad * 0.4, seg=7)


PROPS = {
    'willow': (willow, 12), 'col54': (lambda p: column(p, 5.4), 2), 'col36': (lambda p: column(p, 3.6), 2),
    'lantern': (lantern, 1), 'bench': (bench, 2.4), 'kiosk': (kiosk, 4), 'totem': (totem, 2), 'bins': (bins, 1.5), 'planter': (planter, 2),
}


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('hub', [dict(id=k, w=w, gap=1.0) for k, (_, w) in PROPS.items()], build_hi, lambda v: None)
