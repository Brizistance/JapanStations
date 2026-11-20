# Builds Hyōtan Yokochō (瓢箪横丁), Hyōtanbori's lane of tiny bars, as one lot 18 × 30 m.
#
#   blender --background --python tools/blender/build_yokocho.py -- [--renders <dir>]
#
# Writes assets/buildings/yokocho.blend and public/models/buildings/yokocho.glb.
#
# Frame: buildkit.py (front on the street at z = 0 facing -z, origin mid-frontage). The lane runs
# in from the street (lane A, x LA0…LA1, z 0…LB1), bends right (lane B, z LB0…LB1, x LA1…LBE)
# and ends at a dead end. Behind lane B's far side is Bar Hisago-ya, a counter bar you can walk
# into (room x RX0…RX1, z LB1…RZ1, door DOOR on its lane face). Every bar has its boards; the game
# letters them (render/building-models.ts, kind 'yokocho'). The layout is mirrored in
# src/stations/hyotanbori-street.ts (colliders, zones, lanterns), keep both in step.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

W, D = 18.0, 30.0
X0, X1 = -W / 2, W / 2
LA0, LA1 = -6.6, -3.4          # lane A
LB0, LB1, LBE = 20.0, 23.2, 6.0  # lane B and its dead end
RX0, RX1, RZ1 = -2.0, 4.0, 29.4  # the bar room (inner faces)
DOOR = (0.0, 1.0)              # its doorway on z = LB1
GF, UF = 2.6, 2.5              # storey heights

TIMBER = 'flat:#3b2a1e'
TIMBER_LT = 'flat:#8a6440'
TIMBER_DK = 'flat:#241a13'
PLASTER = ['flat:#d9cfbd', 'flat:#b5aa96', 'flat:#c9b9a0', 'flat:#8c8478', 'flat:#e4dccb']
TIN = ['flat:#5f6b6e', 'flat:#7a5a3a', 'flat:#4a5350', 'flat:#8a3a2a']
ROOFM = 'flat:#33373a'
RAIL = 'flat:#2a2b2d'
PAPER = 'light'
CLOTH = ['flat:#e8e4dc', 'flat:#3a5a9a', 'flat:#c0392b', 'flat:#d9c27a', 'flat:#5a7a4a']


class Face:
    """A wall plane for fronts: axis 'z' = the wall x = at, running along z; axis 'x' = the wall
    z = at, running along x. n (+1/-1) is the way it faces (into the lane)."""

    def __init__(self, axis, at, n):
        self.axis, self.at, self.n = axis, at, n

    def P(self, u, y, d):
        return (self.at + self.n * d, y, u) if self.axis == 'z' else (u, y, self.at + self.n * d)

    def box(self, p, mat, u0, y0, d0, u1, y1, d1):
        a, b = self.P(u0, y0, d0), self.P(u1, y1, d1)
        p.box(mat, min(a[0], b[0]), min(a[1], b[1]), min(a[2], b[2]), max(a[0], b[0]), max(a[1], b[1]), max(a[2], b[2]))

    def board(self, s, col, u0, y0, u1, y1, d=0.06):
        """A flat board on the wall, lettered where buildkit can (faces -z, or ±x)."""
        a, b = self.P(u0, y0, d), self.P(u1, y1, d + 0.04)
        x0, x1, z0, z1 = min(a[0], b[0]), max(a[0], b[0]), min(a[2], b[2]), max(a[2], b[2])
        if self.axis == 'x' and self.n > 0:
            # A wall facing +z: buildkit only letters -z faces, so a plain board.
            (s.body or s).box('flat:' + col, x0, y0, z0, x1, y1, z1)
        else:
            sign(s, col, x0, y0, z0, x1, y1, z1)

    def blade(self, s, col, u, y0, y1, out=0.62):
        """A projecting board standing out from the wall, read from along the lane."""
        a, b = self.P(u - 0.06, y0, 0.08), self.P(u + 0.06, y1, out)
        x0, x1, z0, z1 = min(a[0], b[0]), max(a[0], b[0]), min(a[2], b[2]), max(a[2], b[2])
        if self.axis == 'z':
            # Thin in z: a buildkit board reads only on -z, so turn it into a board thin in x...
            # it cannot be: the board runs out along x. Letter its -z face; the +z face is plain.
            sign(s, col, x0, y0, z0, x1, y1, z1)
        else:
            sign(s, col, x0, y0, z0, x1, y1, z1)


def unit(p, s, f, u0, u1, k, rng, storeys, stair=False):
    """One tiny bar on face f between u0 and u1 along it."""
    wall = PLASTER[k % len(PLASTER)] if k % 3 else TIN[k % len(TIN)]
    H = GF + UF * (storeys - 1)
    f.box(p, wall, u0, 0, -0.02, u1, H, 0.0)
    f.box(p, TIMBER_DK, u0, 0, -0.02, u0 + 0.1, GF, 0.16)
    f.box(p, TIMBER_DK, u1 - 0.1, 0, -0.02, u1, GF, 0.16)
    um = u0 + (u1 - u0) * 0.45
    if k % 3 == 1:
        # A counter window: a ledge, dark glass, a curtain.
        f.box(p, TIMBER_LT, u0 + 0.15, 0.95, 0.0, u1 - 0.15, 1.0, 0.3)
        f.box(p, 'flat:#4a2a1a', u0 + 0.15, 1.0, 0.01, u1 - 0.15, 2.2, 0.03)
        f.box(p, PAPER, u0 + 0.2, 1.05, 0.02, u1 - 0.2, 1.4, 0.035)
    else:
        # A lattice sliding door lit from inside, and a small window beside it.
        f.box(p, PAPER, u0 + 0.15, 0.1, 0.01, um, 2.1, 0.02)
        uu = u0 + 0.2
        while uu < um - 0.02:
            f.box(p, TIMBER, uu, 0.1, 0.02, uu + 0.03, 2.1, 0.07)
            uu += 0.09
        f.box(p, TIMBER, u0 + 0.15, 1.05, 0.02, um, 1.09, 0.07)
        f.box(p, TIMBER_DK, um + 0.25, 1.2, 0.01, u1 - 0.2, 1.9, 0.04)
        f.box(p, WINDOW_LIT, um + 0.3, 1.25, 0.02, u1 - 0.25, 1.85, 0.045)
    # Noren rod, eave, fascia board, a projecting sign column with one or two boards.
    f.box(p, RAIL, u0 + 0.15, 2.18, 0.15, um, 2.22, 0.2)
    f.box(p, ROOFM, u0, GF - 0.05, 0.0, u1, GF + 0.02, 0.7)
    f.board(s, rng.choice(SIGN_COLOURS), u0 + 0.2, GF + 0.12, u1 - 0.2, GF + 0.55)
    if (u1 - u0) > 2.0:
        f.box(p, RAIL, u1 - 0.3, GF + 0.6, 0.0, u1 - 0.24, H - 0.2, 0.7)
        f.blade(s, rng.choice(SIGN_COLOURS), u1 - 0.27, GF + 0.7, GF + 1.9)
        if storeys > 2:
            f.blade(s, rng.choice(SIGN_COLOURS), u1 - 0.27, GF + UF + 0.1, GF + UF + 1.5)
    # Upper floors: a window with a rail, an AC unit, laundry on a pole now and then.
    for j in range(1, storeys):
        y = GF + UF * (j - 1)
        ua, ub = u0 + 0.3, min(u1 - 0.45, u0 + 0.3 + 1.4)
        f.box(p, TIMBER_DK, ua, y + 0.8, 0.0, ub, y + 2.0, 0.05)
        f.box(p, WINDOW_LIT if rng.random() < 0.6 else WINDOW, ua + 0.06, y + 0.86, 0.04, ub - 0.06, y + 1.94, 0.06)
        f.box(p, RAIL, ua - 0.05, y + 0.78, 0.0, ub + 0.05, y + 0.82, 0.35)
        for uu in [ua + i * 0.14 for i in range(int((ub - ua) / 0.14) + 1)]:
            f.box(p, RAIL, uu, y + 0.4, 0.31, uu + 0.02, y + 0.8, 0.35)
        if rng.random() < 0.6:
            f.box(p, ACU, ub + 0.05, y + 0.3, 0.0, min(u1 - 0.1, ub + 0.75), y + 0.85, 0.35)
        if rng.random() < 0.45:
            f.box(p, RAIL, ua, y + 2.05, 0.4, ub, y + 2.08, 0.43)
            uu = ua + 0.1
            while uu < ub - 0.2:
                f.box(p, rng.choice(CLOTH), uu, y + 1.45, 0.4, uu + 0.28, y + 2.05, 0.42)
                uu += 0.36
    # Roof: a tin lean-to falling to the lane, its gutter and a drain pipe.
    f.box(p, ROOFM, u0, H, -0.02, u1, H + 0.08, 0.35)
    f.box(p, RAIL, u0, H - 0.04, 0.3, u1, H + 0.04, 0.4)
    a = f.P(u0 + 0.12, 0, 0.12)
    p.cyl('flat:#5b4636', (a[0], H / 2, a[2]), 1, 0.04, H, seg=6, caps=False)
    if stair:
        # An outside steel stair up the wall to the first-floor door.
        n = 12
        for i in range(n):
            ua = u0 + 0.2 + (u1 - u0 - 0.4) * i / n
            ub = u0 + 0.2 + (u1 - u0 - 0.4) * (i + 1) / n
            f.box(p, RAIL, ua, GF * (i + 1) / n - 0.04, 0.02, ub, GF * (i + 1) / n, 0.72)
        f.box(p, RAIL, u0 + 0.2, 0.0, 0.7, u1 - 0.2, 0.03, 0.74)
        f.box(p, RAIL, u0 + 0.2, GF + 0.95, 0.7, u1 - 0.2, GF + 1.0, 0.74)
        f.box(p, TIMBER_DK, u1 - 1.0, GF, 0.0, u1 - 0.3, GF + 2.0, 0.05)
    return H


def run_fronts(p, s, f, u0, u1, rng, k0, widths, storeys, stairs=()):
    """Fill face f from u0 to u1 with units, widths taken in turn; returns the unit heights."""
    u, k, hs = u0, k0, []
    i = 0
    while u1 - u > 1.6:
        w = widths[i % len(widths)]
        if u1 - u - w < 1.6:
            w = u1 - u
        hs.append((u, u + w, unit(p, s, f, u, u + w, k, rng, storeys[i % len(storeys)], stair=i in stairs)))
        u += w
        k += 1
        i += 1
    return hs


def mass(p, x0, z0, x1, z1, h=7.6, mat='flat:#2e2a27'):
    p.box(mat, x0, 0, z0, x1, h, z1)
    p.box(ROOFM, x0, h, z0, x1, h + 0.06, z1)


def build_hi(v):
    rng = random.Random(41)
    p, s = Part(), Part()
    s.body = p
    # ── Masses behind the fronts ──
    mass(p, X0, 0, LA0, D)                       # west block
    mass(p, LA1, 0, X1, LB0)                     # east block
    mass(p, LBE, LB0, X1, LB1)                   # the dead end
    mass(p, LA0, LB1, RX0 - 0.2, D)              # north block, left of the bar
    mass(p, RX1 + 0.2, LB1, X1, D)               # right of the bar
    mass(p, RX0 - 0.2, RZ1 + 0.2, RX1 + 0.2, D)  # behind the bar
    # The bar room's shell: side walls, ceiling and the floor above.
    p.box('flat:#2e2a27', RX0 - 0.2, 0, LB1, RX0, 7.6, RZ1 + 0.2)
    p.box('flat:#2e2a27', RX1, 0, LB1, RX1 + 0.2, 7.6, RZ1 + 0.2)
    p.box('flat:#2e2a27', RX0, 2.7, LB1, RX1, 7.6, RZ1)
    # ── Fronts ──
    fa_w = Face('z', LA0, 1)       # lane A, west side, faces +x
    fa_e = Face('z', LA1, -1)      # lane A, east side, faces -x
    fb_s = Face('x', LB0, 1)       # lane B, south side, faces +z
    fb_n = Face('x', LB1, -1)      # lane B, north side (and lane A's end), faces -z
    fend = Face('z', LBE, -1)      # the dead end wall, faces -x
    run_fronts(p, s, fa_w, 0.4, LB1, rng, 0, [2.6, 3.1, 2.4, 2.9], [2, 3, 2, 2, 3], stairs=(3,))
    run_fronts(p, s, fa_e, 0.4, LB0, rng, 5, [2.8, 2.5, 3.2, 2.6], [3, 2, 2, 3], stairs=(1,))
    run_fronts(p, s, fb_s, LA1 + 0.3, LBE, rng, 11, [3.0, 2.6, 3.2], [2, 3, 2])
    run_fronts(p, s, fb_n, LA0, RX0 - 0.2, rng, 14, [2.3, 2.3], [3, 2])
    run_fronts(p, s, fb_n, RX1 + 0.2, LBE, rng, 16, [2.0], [2])
    # The dead end: a tiny shrine shelf under a roof, a lamp.
    fend.box(p, PLASTER[3], LB0, 0, 0.0, LB1, 4.0, 0.02)
    fend.box(p, TIMBER_DK, 21.0, 1.4, 0.0, 22.2, 1.5, 0.35)
    fend.box(p, TIMBER_LT, 21.15, 1.5, 0.05, 22.05, 2.1, 0.3)
    fend.box(p, ROOFM, 20.9, 2.1, 0.0, 22.3, 2.18, 0.45)
    fend.box(p, PAPER, 21.5, 2.4, 0.2, 21.7, 2.7, 0.35)
    # ── Bar Hisago-ya's front: a lit lattice, a framed doorway, its board ──
    bf = fb_n
    bf.box(p, 'flat:#1a1716', RX0, 0, -0.02, RX1, 2.7, 0.0)
    for a, b in ((RX0, DOOR[0]), (DOOR[1], RX1)):
        bf.box(p, TIMBER_DK, a, 0, 0.0, b, 0.45, 0.1)
        bf.box(p, PAPER, a + 0.1, 0.55, 0.01, b - 0.1, 2.15, 0.02)
        uu = a + 0.12
        while uu < b - 0.12:
            bf.box(p, TIMBER, uu, 0.55, 0.02, uu + 0.03, 2.15, 0.07)
            uu += 0.1
    for u in (RX0, DOOR[0] - 0.1, DOOR[1], RX1 - 0.1):
        bf.box(p, TIMBER_DK, u, 0, 0.0, u + 0.1, 2.7, 0.12)
    bf.box(p, TIMBER_DK, DOOR[0], 2.2, 0.0, DOOR[1], 2.7, 0.12)
    bf.box(p, ROOFM, RX0 - 0.2, 2.7, 0.0, RX1 + 0.2, 2.78, 0.75)
    bf.board(s, '#2b1a12', RX0 + 0.4, 2.85, RX1 - 0.4, 3.45)
    bf.box(p, PLASTER[0], RX0 - 0.2, 2.78, -0.02, RX1 + 0.2, 7.6, 0.0)
    # Inside: a counter along the back with seven stools, the kitchen strip behind it, bottles,
    # a pot of oden, a lantern hook, plaster walls, a timber floor.
    p.box(TIMBER_LT, RX0, 0, LB1, RX1, 0.04, RZ1)
    for x in (RX0, RX1):
        p.box(PLASTER[0], x - 0.01 if x == RX1 else x, 0, LB1 + 0.1, x + 0.01 if x == RX0 else x, 2.7, RZ1)
    p.box(PLASTER[0], RX0, 0, RZ1 - 0.01, RX1, 2.7, RZ1)
    cz0, cz1 = 26.6, 27.2
    p.box(TIMBER_DK, RX0 + 0.4, 0, cz0, RX1 - 0.3, 1.0, cz1)
    p.box(TIMBER_LT, RX0 + 0.35, 1.0, cz0 - 0.15, RX1 - 0.25, 1.06, cz1 + 0.05)
    for i in range(7):
        x = RX0 + 0.85 + i * 0.75
        p.cyl(TIMBER_LT, (x, 0.68, cz0 - 0.55), 1, 0.19, 0.06, seg=10)
        p.cyl(RAIL, (x, 0.33, cz0 - 0.55), 1, 0.035, 0.66, seg=6)
    p.box(STEEL, RX0 + 0.2, 0, 28.2, RX1 - 0.2, 0.9, RZ1)
    p.cyl('flat:#8a8d90', (RX0 + 2.0, 1.12, 26.9), 1, 0.3, 0.2, seg=12)
    p.box('flat:#d9c27a', RX0 + 1.75, 1.2, 26.65, RX0 + 2.25, 1.23, 27.15)
    p.box(TIMBER_DK, RX0 + 0.2, 1.55, RZ1 - 0.3, RX1 - 0.2, 1.58, RZ1)
    for i in range(22):
        x = RX0 + 0.3 + i * 0.25
        p.box(['flat:#2f5a35', 'flat:#7a3b1a', 'flat:#d9c27a'][i % 3], x, 1.58, RZ1 - 0.25, x + 0.09, 1.92, RZ1 - 0.15)
    for i in range(12):
        x = RX0 + 0.4 + i * 0.45
        sign(s, '#f4efe2', x, 2.0, RZ1 - 0.02, x + 0.25, 2.55, RZ1 - 0.01)
    p.box(RAIL, 0.48, 2.3, 25.3, 0.52, 2.7, 25.34)
    # ── Overhead: wires, a cable bundle, hanging signs' brackets, pipes along the walls ──
    for z in (2.5, 6.0, 9.5, 13.0, 16.5):
        stick(p, RAIL, (LA0, 4.6, z), (LA1, 4.3, z + 0.9), 0.012)
        stick(p, RAIL, (LA0, 4.9, z + 1.2), (LA1, 4.7, z + 0.2), 0.012)
    for x in (-2.0, 1.0, 4.0):
        stick(p, RAIL, (x, 4.6, LB0), (x + 0.8, 4.4, LB1), 0.012)
    stick(p, 'flat:#1b1b1b', (LA0, 4.2, 0.0), (LA0 + 0.3, 4.0, LB1), 0.05)
    stick(p, 'flat:#5b4636', (LA1 - 0.08, 0.3, 0.0), (LA1 - 0.08, 0.3, LB0), 0.05)
    # ── The street face: the two blocks either side of the lane mouth get shop fronts ──
    fs = Face('x', 0.0, -1)
    run_fronts(p, s, fs, X0, LA0, rng, 20, [2.4], [3])
    run_fronts(p, s, fs, LA1, X1, rng, 22, [3.2, 3.0, 2.8, 3.4], [3, 2, 3, 2])
    return p, s


def stick(p, mat, a, b, r, seg=5):
    d = [b[i] - a[i] for i in range(3)]
    L = math.sqrt(sum(c * c for c in d)) or 1e-6
    d = [c / L for c in d]
    ref = (0, 1, 0) if abs(d[1]) < 0.9 else (1, 0, 0)
    u = [d[1] * ref[2] - d[2] * ref[1], d[2] * ref[0] - d[0] * ref[2], d[0] * ref[1] - d[1] * ref[0]]
    n = math.sqrt(sum(c * c for c in u))
    u = [c / n for c in u]
    v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]]

    def P(o, k):
        t = 2 * math.pi * k / seg
        return tuple(o[i] + r * (math.cos(t) * u[i] + math.sin(t) * v[i]) for i in range(3))

    for k in range(seg):
        t = 2 * math.pi * (k + 0.5) / seg
        p.face(mat, [P(a, k), P(a, k + 1), P(b, k + 1), P(b, k)], tuple(math.cos(t) * u[i] + math.sin(t) * v[i] for i in range(3)))


run('yokocho', [dict(id='a', w=W)], build_hi, lambda v: None)
