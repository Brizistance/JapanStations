# Builds Kawaminato Station's building (川湊駅 駅舎, opened 1914, restored 2014): a long red-brick front
# with pale stone bands on the north side of the AR viaduct, facing the station square. An invented
# design in the manner of the big brick termini of the 1910s; no real station is copied.
#
#   blender --background --python tools/blender/build_kawaeki.py -- [--renders <dir>]
#
# Writes assets/buildings/kawaeki.blend, public/models/buildings/kawaeki.glb and
# src/stations/anchors/kawaeki.ts. Frame and helpers: buildkit.py, kitakit.py.
#
# One piece, W long and D deep: its front (z = 0) faces the square, its back stands against the viaduct.
#   x ±19         the middle pavilion, PROJ_C proud and EAVE_C high: three arched doors into the great hall, a
#                 rotunda open right up into the dome, and right through to the passage under the tracks; a
#                 stair hall either side of it (x ±14 … 18.6) with doors onto the hall's galleries; the clock
#                 over the doors, a dome on an eight-sided drum.
#   x ±(19 … 28.5)  a room in each wing's inner end, off the stair hall (ticket office, waiting room).
#   x ±(72 … 94)  the end pavilions, PROJ_E proud, a smaller dome on each.
#   between       the wings: three storeys, twelve bays each, a slate mansard with dormers.
# The game builds the great hall's dress and colliders, and the colliders round the ways through
# (src/stations/hub-street.ts); nothing else of the building is entered.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

W, D = 188.0, 26.0
EAVE, EAVE_P = 16.2, 19.0          # the wings' cornice, the pavilions'
CX, EX0, EX1 = 19.0, 72.0, 94.0    # half the middle pavilion; the end pavilions
EAVE_C = 23.0                      # the middle pavilion's cornice: the great hall's ceiling, with the dome's opening in it
PROJ_C, PROJ_E = 2.5, 1.5
HALL_X = 13.6                      # the great hall: half its clear width
STAIR_X = (14.0, 18.6)             # the stair hall either side of it (|x| from, to)
SIDE_X, SIDE_H = 28.5, 6.8         # the room in each wing's inner end (|x| to), its ceiling
G1, G2 = 5.85, 16.35               # the galleries' floors (the game's +6.0 and +16.5: the model stands on the pavement at 0.15)
DOOR_G, DOOR_GH = (13.3, 15.3), 2.4   # the door from each stair landing onto its gallery (z from, to; height)
ARCH_P, ARCH_TOP = [(2.5, 6.5), (8.0, 12.0)], 5.2   # the arches between the great hall and a stair hall (z from, to)
ARCH_S, ARCH_S_TOP = (19.0, 24.0), 5.0              # the arch from a stair hall into the wing's room
UP_DOOR = (3.0, G2, G2 + 2.8)      # the doorway in the back wall to the bridge concourse over the tracks (half width, y from, to)
OC_R, DOME_Z = 10.6, 11.95         # the round opening in the hall's ceiling, and where its centre is
PILASTERS = (-1.05, 7.25, 12.65, 16.2, 24.95)
PANE = 'flat:#c9d6dc'              # window glass seen from inside by day
COFFER = 'flat:#c2a25e'
OCHRE = 'flat:#d6bd84'               # the great hall's plaster: yellow ochre, its mouldings pale
DOORS = [(-8.7, -3.7), (-2.5, 2.5), (3.7, 8.7)]
# Ways through the building at street level, where a walkway under the tracks comes out behind it (x from, to):
# through the east end pavilion (the two through the wings went when the station's concourses took the bays behind them). TUN_H high.
TUNNELS = [(83.6, 87.8)]
TUN_H = 4.2
BACK_DOOR, BACK_H = 12.0, 8.15     # the opening in the back wall (half its width, its height): the central passage's three arches under the tracks show in it
SLATE = 'flat:#414852'
SLATE_LT = 'flat:#59616c'
COPPER = 'flat:#6f9a8c'
CREAM = 'flat:#e9e2d0'
STONE_W = 'flat:#ddd6c6'
GRAN = 'flat:#8f8a82'


def glass(p):
    return WINDOW_LIT if p.lit.random() < LIT_SHARE else WINDOW_DARK


def fan(p, face, c, y, r, at):
    """A half-round window head: a stone ring, glass in it, a keystone."""
    n = 10
    ring = [wpt(face, c - (r + 0.28) * math.cos(math.pi * k / n), y + (r + 0.28) * math.sin(math.pi * k / n), at, -0.02) for k in range(n + 1)]
    p.face(STONE_W, ring, NORMAL[face])
    pane = [wpt(face, c - r * math.cos(math.pi * k / n), y + r * math.sin(math.pi * k / n), at, -0.04) for k in range(n + 1)]
    p.face(glass(p), pane, NORMAL[face], WINDOW)
    wbox(p, STONE_W, face, c - 0.16, c + 0.16, y + r - 0.1, y + r + 0.42, at, -0.1, 0)


def bayface(p, face, c, at, bw, top=EAVE, ground=True):
    """One bay of a wall: a brick pilaster at its left edge, an arched window below, paired windows on the two floors above."""
    h = bw / 2
    wbox(p, BRICK_DK, face, c - h, c - h + 0.5, 0.9, top, at, -0.12, 0)
    wbox(p, STONE_W, face, c - h - 0.06, c - h + 0.56, top - 0.6, top, at, -0.2, 0)
    wbox(p, STONE_W, face, c - h - 0.06, c - h + 0.56, 0.9, 1.5, at, -0.2, 0)
    if ground:
        w = 2.3
        wbox(p, STONE_W, face, c - w / 2 - 0.25, c + w / 2 + 0.25, 1.7, 1.9, at, -0.12, 0)
        quad(p, STONE_W, face, c - w / 2 - 0.14, c + w / 2 + 0.14, 1.9, 4.6, out(face, at, 0.015))
        quad(p, WINDOW, face, c - w / 2, c + w / 2, 1.9, 4.6, out(face, at, 0.03))
        wbox(p, 'flat:#2f3338', face, c - 0.04, c + 0.04, 1.9, 4.6, at, -0.05, 0)
        fan(p, face, c, 4.6, w / 2, at)
    for y0, hh, head in ((7.6, 2.7, False), (12.2, 2.5, True)):
        for dx in (-0.78, 0.78):
            quad(p, STONE_W, face, c + dx - 0.64, c + dx + 0.64, y0 - 0.12, y0 + hh + 0.12, out(face, at, 0.015))
            quad(p, WINDOW, face, c + dx - 0.5, c + dx + 0.5, y0, y0 + hh, out(face, at, 0.03))
        wbox(p, STONE_W, face, c - 1.6, c + 1.6, y0 - 0.32, y0 - 0.12, at, -0.12, 0)
        if head:
            wbox(p, STONE_W, face, c - 1.6, c + 1.6, y0 + hh + 0.12, y0 + hh + 0.42, at, -0.1, 0)


def wall(p, face, a0, a1, at, n, top=EAVE, ground=True, gaps=()):
    """A wall of n bays with its plinth, stone bands and cornice. `gaps`: ways through it at street level (from, to):
    the bay over each has no ground-floor window, the plinth stops either side, a stone surround frames the mouth."""
    bw = (a1 - a0) / n
    for k in range(n):
        c = a0 + bw * (k + 0.5)
        bayface(p, face, c, at, bw, top, ground and not any(g0 < c < g1 for g0, g1 in gaps))
    wbox(p, BRICK_DK, face, a1 - 0.5, a1, 0.9, top, at, -0.12, 0)
    e = a0
    for g0, g1 in sorted(gaps) + [(a1, a1)]:
        if g0 - e > 0.01:
            wbox(p, GRAN, face, e, g0, 0, 0.9, at, -0.16, 0)
        e = g1
    for g0, g1 in gaps:
        for a, b_ in ((g0 - 0.35, g0), (g1, g1 + 0.35)):
            wbox(p, STONE_W, face, a, b_, 0, TUN_H + 0.45, at, -0.2, 0)
        wbox(p, STONE_W, face, g0, g1, TUN_H, TUN_H + 0.45, at, -0.2, 0)
        wbox(p, STONE_W, face, (g0 + g1) / 2 - 0.25, (g0 + g1) / 2 + 0.25, TUN_H + 0.45, TUN_H + 0.95, at, -0.24, 0)
    for y in (6.4, 11.2):
        wbox(p, STONE_W, face, a0, a1, y, y + 0.34, at, -0.15, 0)
    wbox(p, STONE_W, face, a0 - 0.1, a1 + 0.1, top, top + 0.8, at, -0.42, 0)
    wbox(p, BRICK, face, a0, a1, top + 0.8, top + 1.3, at, -0.12, 0.3)
    wbox(p, STONE_W, face, a0 - 0.1, a1 + 0.1, top + 1.3, top + 1.45, at, -0.2, 0.36)


def dome(p, mat, cx, cz, y0, R, H, seg=16, rings=6, rib=None):
    def P(i, j):
        t, a = (math.pi / 2) * j / rings, 2 * math.pi * i / seg
        return (cx + R * math.cos(t) * math.cos(a), y0 + H * math.sin(t), cz + R * math.cos(t) * math.sin(a))
    for j in range(rings):
        for i in range(seg):
            a = 2 * math.pi * (i + 0.5) / seg
            q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]
            p.face(rib if rib and i % 2 == 0 and j < rings - 1 and False else mat, q[:3] if j == rings - 1 else q, (math.cos(a), 0.7, math.sin(a)))
    if rib:
        for i in range(seg):
            a = 2 * math.pi * i / seg
            for j in range(rings - 1):
                t0, t1 = (math.pi / 2) * j / rings, (math.pi / 2) * (j + 1) / rings
                r0, r1 = R * math.cos(t0) + 0.06, R * math.cos(t1) + 0.06
                x0, z0, x1, z1 = cx + r0 * math.cos(a), cz + r0 * math.sin(a), cx + r1 * math.cos(a), cz + r1 * math.sin(a)
                tx, tz = -math.sin(a) * 0.14, math.cos(a) * 0.14
                p.face(rib, [(x0 - tx, y0 + H * math.sin(t0) + 0.05, z0 - tz), (x0 + tx, y0 + H * math.sin(t0) + 0.05, z0 + tz),
                             (x1 + tx, y0 + H * math.sin(t1) + 0.05, z1 + tz), (x1 - tx, y0 + H * math.sin(t1) + 0.05, z1 - tz)], (math.cos(a), 0.7, math.sin(a)))


def crown(p, cx, cz, y, R, H, drum, hollow=False):
    """A dome on an eight-sided drum with round windows, a lantern on top. `hollow`: seen from below (no caps)."""
    p.cyl(BRICK, (cx, y + drum / 2, cz), 1, R + 0.5, drum, seg=8, caps=not hollow)
    p.cyl(STONE_W, (cx, y + drum + 0.2, cz), 1, R + 0.8, 0.4, seg=8, caps=not hollow)
    if hollow:   # (no caps to hide the dome from below: only the ring's top, round the dome's foot)
        for k in range(8):
            a0, a1 = k * math.pi / 4, (k + 1) * math.pi / 4
            p.face(STONE_W, [(cx + r * math.cos(a), y + drum + 0.4, cz + r * math.sin(a)) for r, a in ((R + 0.8, a0), (R + 0.8, a1), (R - 0.6, a1), (R - 0.6, a0))], (0, 1, 0))
    for k in range(8):
        a = math.pi / 8 + k * math.pi / 4
        rr = (R + 0.5) * math.cos(math.pi / 8) + 0.03
        c = (cx + rr * math.cos(a), y + drum / 2, cz + rr * math.sin(a))
        tx, tz = -math.sin(a), math.cos(a)
        n = 10
        pts = [(c[0] + tx * 0.8 * math.cos(2 * math.pi * i / n), c[1] + 0.8 * math.sin(2 * math.pi * i / n), c[2] + tz * 0.8 * math.cos(2 * math.pi * i / n)) for i in range(n)]
        p.face(glass(p), pts, (math.cos(a), 0, math.sin(a)), WINDOW)
    dome(p, SLATE, cx, cz, y + drum + 0.4, R, H, rib=COPPER)
    top = y + drum + 0.4 + H
    p.cyl(STONE_W, (cx, top + 0.6, cz), 1, R * 0.14, 2.2, seg=8)
    pyramid(p, COPPER, cx - R * 0.16, cx + R * 0.16, cz - R * 0.16, cz + R * 0.16, top + 1.7, R * 0.3)


def mansard(p, x0, x1, y):
    p.prism(SLATE, [(0.5, y), (2.8, y + 3.6), (D - 2.8, y + 3.6), (D - 0.5, y)], 'x', x0, x1)
    p.box(COPPER, x0, y + 3.6, 2.7, x1, y + 3.75, D - 2.7)
    n = int((x1 - x0) / 9.6)
    for k in range(n):
        c = x0 + (x1 - x0) * (k + 0.5) / n
        p.box(STONE_W, c - 0.9, y + 0.5, 0.9, c + 0.9, y + 2.5, 2.6)
        quad(p, WINDOW, 'f', c - 0.55, c + 0.55, y + 0.9, y + 2.2, 0.87)
        p.prism(SLATE_LT, [(c - 1.1, y + 2.5), (c + 1.1, y + 2.5), (c, y + 3.3)], 'z', 0.8, 2.7)


def holed(p, mat, x0, z0, x1, y1, tuns):
    """A block from the ground to y1, z0 … D, with the ways through it cut out: plastered soffits, lights."""
    e = x0
    for a, b_ in sorted(tuns) + [(x1, x1)]:
        p.box(mat, e, 0, z0, a, y1, D)
        if b_ > a:
            p.box(mat, a, TUN_H, z0, b_, y1, D)
            p.box(CREAM, a, TUN_H - 0.06, z0 + 0.2, b_, TUN_H, D)
            for z in [z0 + 3.0 + 4.6 * i for i in range(int((D - z0 - 3) / 4.6) + 1)]:
                p.box('light', (a + b_) / 2 - 0.6, TUN_H - 0.1, z - 0.12, (a + b_) / 2 + 0.6, TUN_H - 0.06, z + 0.12)
            for sx, xw in ((1, a), (-1, b_)):   # a tiled dado down each side
                p.box(CREAM, min(xw, xw + sx * 0.03), 0, z0 + 0.25, max(xw, xw + sx * 0.03), 1.3, D)
                p.box(STONE_W, min(xw, xw + sx * 0.05), 1.3, z0 + 0.25, max(xw, xw + sx * 0.05), 1.42, D)
        e = b_


def pierced(p, mat, axis, lo, hi, a0, a1, y0, y1, holes=()):
    """A wall lo … hi thick across `axis` ('x': it runs along z; 'z': along x), a0 … a1 long, y0 … y1 high,
    with rectangular holes (from, to, bottom, top) left out of it."""
    cuts = sorted(set([a0, a1] + [v for h in holes for v in h[:2] if a0 < v < a1]))
    for u, v in zip(cuts, cuts[1:]):
        hs = sorted((h[2], h[3]) for h in holes if h[0] <= u and h[1] >= v)
        e = y0
        for b0, b1 in hs + [(y1, y1)]:
            if b0 - e > 0.01:
                if axis == 'x':
                    p.box(mat, lo, e, u, hi, b0, v)
                else:
                    p.box(mat, u, e, lo, v, b0, hi)
            e = max(e, b1)


def lining(p, mat, face, at, a0, a1, y0, y1, holes=()):
    """Plaster on the inside of a wall (a face of kitakit's four), with the same holes left out."""
    cuts = sorted(set([a0, a1] + [v for h in holes for v in h[:2] if a0 < v < a1]))
    for u, v in zip(cuts, cuts[1:]):
        hs = sorted((h[2], h[3]) for h in holes if h[0] <= u and h[1] >= v)
        e = y0
        for b0, b1 in hs + [(y1, y1)]:
            if b0 - e > 0.01:
                quad(p, mat, face, u, v, e, b0, at)
            e = max(e, b1)


def jambs(p, lo, hi, holes, spring=1.8):
    """Stone reveals in the openings of a wall that runs along z (lo … hi thick): the sides of each, and a door's head."""
    for h0, h1, y0, y1 in holes:
        top = y1 - spring if y0 == 0 else y1
        for z in (h0, h1 - 0.03):
            p.box(STONE_W, lo - 0.02, y0, z, hi + 0.02, top, z + 0.03)
        if y0 > 0:
            p.box(STONE_W, lo - 0.02, y1 - 0.03, h0, hi + 0.02, y1, h1)


def inner_dome(p, cx, cz, y0, y1, R, H, seg=32, rings=7):
    """The rotunda seen from below: a plastered drum y0 … y1 with eight round windows, a coffered dome on it, an eye."""
    def C(i, y, r=R):
        a = 2 * math.pi * i / seg
        return (cx + r * math.cos(a), y, cz + r * math.sin(a))
    for i in range(seg):
        a = 2 * math.pi * (i + 0.5) / seg
        p.face(OCHRE, [C(i, y0), C(i + 1, y0), C(i + 1, y1), C(i, y1)], (-math.cos(a), 0, -math.sin(a)))
        p.face(STONE_W, [C(i, y0), C(i + 1, y0), C(i + 1, y0 + 0.5, R - 0.25), C(i, y0 + 0.5, R - 0.25)], (-math.cos(a), -0.5, -math.sin(a)))
        p.face(STONE_W, [C(i, y1 - 0.5, R), C(i + 1, y1 - 0.5, R), C(i + 1, y1, R - 0.25), C(i, y1, R - 0.25)], (-math.cos(a), -0.5, -math.sin(a)))
    for k in range(8):
        a = math.pi / 8 + k * math.pi / 4
        c = (cx + (R - 0.12) * math.cos(a), (y0 + y1) / 2 + 0.1, cz + (R - 0.12) * math.sin(a))
        tx, tz = -math.sin(a), math.cos(a)
        for rr, mat in ((1.05, STONE_W), (0.85, PANE)):
            d = 0.0 if rr > 1 else 0.03
            pts = [(c[0] - d * math.cos(a) + tx * rr * math.cos(2 * math.pi * i / 12), c[1] + rr * math.sin(2 * math.pi * i / 12), c[2] - d * math.sin(a) + tz * rr * math.cos(2 * math.pi * i / 12)) for i in range(12)]
            p.face(mat, pts, (-math.cos(a), 0, -math.sin(a)))

    def P(i, j, dr=0.0):
        t, a = (math.pi / 2) * j / rings * 0.93, 2 * math.pi * i / seg
        return (cx + (R * math.cos(t) - dr) * math.cos(a), y1 + H * math.sin(t) - dr * 0.4, cz + (R * math.cos(t) - dr) * math.sin(a))
    for j in range(rings):
        for i in range(seg):
            a = 2 * math.pi * (i + 0.5) / seg
            coffer = i % 2 == 0 and 0 < j < rings - 1
            p.face(COFFER if coffer else CREAM, [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], (-math.cos(a), -0.7, -math.sin(a)))
    for i in range(0, seg, 4):   # eight ribs
        for j in range(rings):
            a = 2 * math.pi * i / seg
            tx, tz = -math.sin(a) * 0.22, math.cos(a) * 0.22
            q0, q1 = P(i, j, 0.12), P(i, j + 1, 0.12)
            p.face(STONE_W, [(q0[0] - tx, q0[1], q0[2] - tz), (q0[0] + tx, q0[1], q0[2] + tz), (q1[0] + tx, q1[1], q1[2] + tz), (q1[0] - tx, q1[1], q1[2] - tz)], (-math.cos(a), -0.7, -math.sin(a)))
    top = P(0, rings)[1]
    eye = R * math.cos(math.pi / 2 * 0.93)
    p.face(PANE, [(cx + eye * math.cos(2 * math.pi * i / seg), top, cz + eye * math.sin(2 * math.pi * i / seg)) for i in range(seg)], (0, -1, 0))
    p.face(STONE_W, [(cx + 0.5 * math.cos(2 * math.pi * i / 12), top - 0.03, cz + 0.5 * math.sin(2 * math.pi * i / 12)) for i in range(12)], (0, -1, 0))


def oculus_ceiling(p, x0, z0, x1, z1, y, cx, cz, R, seg=32, mat=CREAM, up=-1):
    """A flat ceiling over a rectangle with a round opening in it."""
    hx, hz = (x1 - x0) / 2, (z1 - z0) / 2
    mx, mz = (x0 + x1) / 2, (z0 + z1) / 2

    def edge(a):
        c, s = math.cos(a), math.sin(a)
        dx, dz = cx - mx, cz - mz
        ts = []
        if abs(c) > 1e-9:
            ts.append(((hx if c > 0 else -hx) - dx) / c)
        if abs(s) > 1e-9:
            ts.append(((hz if s > 0 else -hz) - dz) / s)
        t = min(ts)
        q = (cx + t * c, cz + t * s)
        return q, ('x' if abs(abs(q[0] - mx) - hx) < 1e-6 else 'z')
    for i in range(seg):
        a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
        (e0, s0), (e1, s1) = edge(a0), edge(a1)
        pts = [(cx + R * math.cos(a0), y, cz + R * math.sin(a0)), (cx + R * math.cos(a1), y, cz + R * math.sin(a1)), (e1[0], y, e1[1])]
        am = (a0 + a1) / 2
        corner = (mx + (hx if math.cos(am) > 0 else -hx), y, mz + (hz if math.sin(am) > 0 else -hz))
        if abs(e0[0] - e1[0]) > 1e-6 and abs(e0[1] - e1[1]) > 1e-6:
            pts.append(corner)
        pts.append((e0[0], y, e0[1]))
        p.face(mat, pts, (0, up, 0))


def station(p, s, r):
    top = EAVE
    # ── The wings, and at each one's inner end a room off the great hall's stair hall ──
    for sx in (-1, 1):
        x0, x1 = (CX, EX0) if sx > 0 else (-EX0, -CX)
        r0, r1 = (CX, SIDE_X) if sx > 0 else (-SIDE_X, -CX)      # the room
        h0, h1 = (SIDE_X, EX0) if sx > 0 else (-EX0, -SIDE_X)    # the solid rest
        tuns = [t for t in TUNNELS if x0 < t[0] < x1]
        holed(p, BRICK, h0, 0, h1, top + 0.8, tuns)
        p.box(BRICK, r0, SIDE_H, 0, r1, top + 0.8, D)
        p.box(BRICK, r0, 0, 0, r1, SIDE_H, 0.6)
        p.box(BRICK, r0, 0, D - 0.6, r1, SIDE_H, D)
        p.box(CREAM, r0, SIDE_H - 0.08, 0.6, r1, SIDE_H, D - 0.6)
        bw = (x1 - x0) / 12
        wins = [x0 + bw * (k + 0.5) for k in range(12) if r0 < x0 + bw * (k + 0.5) < r1]
        lining(p, CREAM, 'b', 0.61, r0, r1, 0, SIDE_H, [(c - 1.15, c + 1.15, 1.9, 5.4) for c in wins])
        for c in wins:
            quad(p, PANE, 'b', c - 1.15, c + 1.15, 1.9, 5.4, 0.62)
            p.box(STONE_W, c - 1.3, 1.78, 0.6, c + 1.3, 1.9, 0.78)
        lining(p, CREAM, 'f', D - 0.61, r0, r1, 0, SIDE_H)
        xe = sx * SIDE_X
        quad(p, CREAM, 'l' if sx > 0 else 'r', 0.6, D - 0.6, 0, SIDE_H, xe - sx * 0.01)
        wall(p, 'f', x0, x1, 0, 12, gaps=tuns)
        # The back, over the viaduct: a row of windows on the top floor.
        for k in range(12):
            c = x0 + bw * (k + 0.5)
            for dx in (-0.78, 0.78):
                quad(p, WINDOW, 'b', c + dx - 0.5, c + dx + 0.5, 12.2, 14.7, D + 0.03)
        wbox(p, STONE_W, 'b', x0, x1, top, top + 0.8, D, -0.3, 0)
        mansard(p, x0, x1, top + 0.8)
        # ── The end pavilions ──
        e0, e1 = (EX0, EX1) if sx > 0 else (-EX1, -EX0)
        tuns = [t for t in TUNNELS if e0 < t[0] < e1]
        holed(p, BRICK, e0, -PROJ_E, e1, EAVE_P + 0.8, tuns)
        wall(p, 'f', e0, e1, -PROJ_E, 4, EAVE_P, gaps=tuns)
        wall(p, 'r' if sx > 0 else 'l', -PROJ_E, D, e1 if sx > 0 else e0, 5, EAVE_P)
        wbox(p, STONE_W, 'b', e0, e1, EAVE_P, EAVE_P + 0.8, D, -0.3, 0)
        # (The inner return of its projection, and of its extra height over the wing.)
        xi = e0 if sx > 0 else e1
        p.box(STONE_W, min(xi, xi - sx * 0.3), EAVE_P, -PROJ_E, max(xi, xi - sx * 0.3), EAVE_P + 0.8, D)
        ec, ez = (e0 + e1) / 2, (D - PROJ_E) / 2
        p.box(SLATE, e0 + 0.6, EAVE_P + 0.8, -PROJ_E + 0.6, e1 - 0.6, EAVE_P + 1.6, D - 0.6)
        crown(p, ec, ez, EAVE_P + 1.6, 8.0, 6.5, 2.2)

    # ── The middle pavilion: the great hall, a rotunda open to its dome, and a stair hall either side ──
    zf, T = -PROJ_C, EAVE_C + 0.8
    Z0, Z1 = zf + 1.0, D - 0.6            # the rooms' clear depth
    UP = (-UP_DOOR[0], UP_DOOR[0], UP_DOOR[1], UP_DOOR[2])
    back_holes = [(-BACK_DOOR, BACK_DOOR, 0, BACK_H), UP]
    part_holes = [(a, b_, 0, ARCH_TOP) for a, b_ in ARCH_P] + [(DOOR_G[0], DOOR_G[1], g, g + DOOR_GH) for g in (G1, G2)]
    side_holes = [(ARCH_S[0], ARCH_S[1], 0, ARCH_S_TOP)]
    upper = (-16.3, -10.6, -6.2, 6.2, 10.6, 16.3)      # the tall windows over the doors
    # The front wall: stone piers and three arches, brick over them.
    piers = [(-CX, DOORS[0][0]), (DOORS[0][1], DOORS[1][0]), (DOORS[1][1], DOORS[2][0]), (DOORS[2][1], CX)]
    for a, b_ in piers:
        p.box(STONE_W, a, 0, zf, b_, 8.2, zf + 1.0)
        p.box(GRAN, a - 0.08, 0, zf - 0.1, b_ + 0.08, 0.9, zf + 1.08)
        p.box(STONE_W, a - 0.1, 4.3, zf - 0.12, b_ + 0.1, 4.6, zf + 1.1)
    for a, b_ in DOORS:
        arch(p, STONE_W, 'f', a, b_, 4.6, 7.1, 8.2, zf, 1.0, 12, CREAM)
        wbox(p, STONE_W, 'f', (a + b_) / 2 - 0.25, (a + b_) / 2 + 0.25, 7.0, 7.8, zf, -0.12, 0)
    p.box(BRICK, -CX, 8.2, zf, CX, T, zf + 1.0)
    for sx in (-1, 1):
        # The stair hall's window on the square.
        c = sx * 16.3
        quad(p, STONE_W, 'f', c - 1.5, c + 1.5, 1.7, 6.0, zf - 0.015)
        quad(p, WINDOW, 'f', c - 1.3, c + 1.3, 1.9, 6.0, zf - 0.03)
        fan(p, 'f', c, 6.0, 1.3, zf)
        quad(p, PANE, 'b', c - 1.3, c + 1.3, 1.9, 6.0, Z0 + 0.02)
        # The outer side walls (over the wings they are the pavilion's flanks), each with an arch to the wing's room.
        xa, xb = sx * STAIR_X[1], sx * CX
        pierced(p, BRICK, 'x', min(xa, xb), max(xa, xb), Z0, Z1, 0, T, side_holes)
        jambs(p, min(xa, xb), max(xa, xb), side_holes)
        p.box(BRICK, min(xa, xb), 0, zf, max(xa, xb), T, Z0)
        fo, fi = ('l', 'r') if sx > 0 else ('r', 'l')    # a wall's face looking back at the hall; looking away from it
        arch(p, OCHRE, fo, ARCH_S[0], ARCH_S[1], ARCH_S_TOP - 1.8, ARCH_S_TOP - 0.2, ARCH_S_TOP, xa, 0.4, 10, STONE_W)
        lining(p, OCHRE, fo, xa - sx * 0.01, Z0, Z1, 0, EAVE_C, side_holes)
        lining(p, CREAM, fi, xb + sx * 0.01, 0.6, D - 0.6, 0, SIDE_H, side_holes)
        p.box(GRAN, min(sx * (CX - 0.1), sx * (CX + 0.12)), 0, zf - 0.1, max(sx * (CX - 0.1), sx * (CX + 0.12)), 0.9, 0)
        # The wall between the great hall and the stair hall: two arches below, a door to each gallery.
        xa, xb = sx * HALL_X, sx * STAIR_X[0]
        pierced(p, BRICK, 'x', min(xa, xb), max(xa, xb), Z0, Z1, 0, EAVE_C, part_holes)
        jambs(p, min(xa, xb), max(xa, xb), part_holes)
        for a, b_ in ARCH_P:
            arch(p, OCHRE, fo, a, b_, ARCH_TOP - 1.8, ARCH_TOP - 0.2, ARCH_TOP, xa, 0.4, 10, STONE_W)
        lining(p, OCHRE, fo, xa - sx * 0.01, Z0, Z1, 0, EAVE_C, part_holes)
        lining(p, OCHRE, fi, xb + sx * 0.01, Z0, Z1, 0, EAVE_C, part_holes)
        # The stair hall's other walls, its ceiling.
        sa, sb = min(sx * STAIR_X[0], sx * STAIR_X[1]), max(sx * STAIR_X[0], sx * STAIR_X[1])
        lining(p, OCHRE, 'b', Z0 + 0.01, sa, sb, 0, EAVE_C, [(c - 1.3, c + 1.3, 1.9, 6.0), (c - 0.8, c + 0.8, 11.1, 19.8)])
        lining(p, OCHRE, 'f', Z1 - 0.01, sa, sb, 0, EAVE_C)
        p.box(CREAM, sa, EAVE_C - 0.08, Z0, sb, EAVE_C, Z1)
        # The great hall's pilasters and the stone bands under each gallery and under the ceiling.
        xw = sx * HALL_X
        for z in PILASTERS:
            p.box(STONE_W, min(xw, xw - sx * 0.2), 0, z - 0.45, max(xw, xw - sx * 0.2), EAVE_C - 0.8, z + 0.45)
        p.box(STONE_W, min(xw, xw - sx * 0.3), EAVE_C - 0.8, Z0, max(xw, xw - sx * 0.3), EAVE_C, Z1)
    # The back wall: the wide opening to the passage under the tracks, and over it the doorway to the bridge concourse.
    pierced(p, BRICK, 'z', D - 0.6, D, -CX, CX, 0, T, back_holes)
    p.box(STONE_W, -BACK_DOOR - 0.3, BACK_H, D - 0.68, BACK_DOOR + 0.3, BACK_H + 0.4, D - 0.6)
    lining(p, OCHRE, 'f', Z1 - 0.01, -HALL_X, HALL_X, 0, EAVE_C, back_holes)
    p.box(STONE_W, UP[0] - 0.3, UP[3], Z1 - 0.1, UP[1] + 0.3, UP[3] + 0.4, Z1)
    # The front wall inside: plaster round the tall windows.
    lining(p, OCHRE, 'b', Z0 + 0.01, -HALL_X, HALL_X, 8.2, EAVE_C, [(c - 0.8, c + 0.8, 11.1, 19.8) for c in upper])
    for c in upper:
        quad(p, PANE, 'b', c - 0.8, c + 0.8, 11.1, 19.8, Z0 + 0.02)
        p.box(STONE_W, c - 0.95, 10.95, Z0, c + 0.95, 11.1, Z0 + 0.16)
    for z in (Z0, Z1 - 0.3):
        p.box(STONE_W, -HALL_X, EAVE_C - 0.8, z, HALL_X, EAVE_C, z + 0.3)
    # The ceiling with its round opening, the drum and the dome inside.
    oculus_ceiling(p, -HALL_X, Z0, HALL_X, Z1, EAVE_C, 0, DOME_Z, OC_R)
    inner_dome(p, 0, DOME_Z, EAVE_C, EAVE_C + 3.2, OC_R, 9.8)
    # Above the doors: the station's name on a stone frieze, tall windows, the clock in a stone gable.
    wbox(p, STONE_W, 'f', -CX - 0.1, CX + 0.1, 8.2, 9.9, zf, -0.2, 0)
    mark('name', 0, 9.05, zf - 0.22, 15.0, 1.2, (0, -1))
    for c in upper:
        quad(p, STONE_W, 'f', c - 1.0, c + 1.0, 10.9, 20.4, zf - 0.015)
        quad(p, WINDOW, 'f', c - 0.8, c + 0.8, 11.1, 19.8, zf - 0.03)
        fan(p, 'f', c, 19.8, 0.8, zf)
        wbox(p, STONE_W, 'f', c - 1.1, c + 1.1, 15.3, 15.6, zf, -0.1, 0)
    for c in (-CX + 0.3, -13.4, -8.4, -4.0, 4.0, 8.4, 13.4, CX - 0.3):
        wbox(p, BRICK_DK, 'f', c - 0.3, c + 0.3, 9.9, EAVE_C, zf, -0.14, 0)
    wbox(p, STONE_W, 'f', -3.4, 3.4, 10.6, EAVE_C, zf, -0.26, 0)
    n, cy = 20, 17.4
    p.face('flat:#f4f1e8', [(2.4 * math.cos(2 * math.pi * i / n), cy + 2.4 * math.sin(2 * math.pi * i / n), zf - 0.3) for i in range(n)], (0, 0, -1))
    p.face(COPPER, [(2.7 * math.cos(2 * math.pi * i / n), cy + 2.7 * math.sin(2 * math.pi * i / n), zf - 0.28) for i in range(n)], (0, 0, -1))
    mark('clock', 0, cy, zf - 0.32, 3.3, 3.3, (0, -1))   # (the game's clock fills its square: inside the ring)
    wbox(p, STONE_W, 'f', -CX - 0.1, CX + 0.1, EAVE_C, T, zf, -0.42, 0)
    p.prism(STONE_W, [(-10.0, T), (10.0, T), (0, T + 4.2)], 'z', zf - 0.1, zf + 0.6)
    p.prism(BRICK, [(-8.2, T + 0.3), (8.2, T + 0.3), (0, T + 3.7)], 'z', zf - 0.14, zf - 0.1)
    for sx in (-1, 1):
        wbox(p, STONE_W, 'l' if sx < 0 else 'r', zf, D, EAVE_C, T, sx * CX, -0.3, 0)
    wbox(p, STONE_W, 'b', -CX, CX, EAVE_C, T, D, -0.3, 0)
    # The roof round the dome's opening, and the dome.
    for x0, z0, x1, z1 in ((-CX + 0.6, zf + 0.6, CX - 0.6, DOME_Z - OC_R), (-CX + 0.6, DOME_Z + OC_R, CX - 0.6, D - 0.6),
                           (-CX + 0.6, DOME_Z - OC_R, -OC_R, DOME_Z + OC_R), (OC_R, DOME_Z - OC_R, CX - 0.6, DOME_Z + OC_R)):
        p.box(SLATE, x0, T, z0, x1, T + 1.0, z1)
    oculus_ceiling(p, -OC_R, DOME_Z - OC_R, OC_R, DOME_Z + OC_R, T + 1.0, 0, DOME_Z, OC_R, mat=SLATE, up=1)   # (the roof's corners under the drum)
    crown(p, 0, DOME_Z, T + 1.0, 12.0, 11.0, 2.8, hollow=True)
    # Measurements for the game's colliders and for what it builds inside.
    mark('_hall', 0, 0, zf, 2 * HALL_X, EAVE_C)
    mark('_doors', 0, 0, zf, DOORS[2][1] - DOORS[0][0], 7.1)
    mark('_back', 0, 0, D, 2 * BACK_DOOR, BACK_H)
    for k, (a, b_) in enumerate(TUNNELS):
        mark('_tun%d' % k, (a + b_) / 2, 0, -PROJ_E if abs(a) > EX0 else 0, b_ - a, TUN_H)
    mark('_geo', CX, PROJ_C, EX0, PROJ_E, EAVE_C)
    for k, (a, b_) in enumerate(piers[1:3]):
        mark('_pier%d' % k, (a + b_) / 2, 0, zf, b_ - a, 1.0)
    mark('_sth', STAIR_X[0], 0, STAIR_X[1], SIDE_X, SIDE_H)       # the stair hall's x from, to; the wing room's end, its ceiling
    mark('_lv', G1, G2, DOME_Z, OC_R, DOOR_GH)                    # the galleries' floors, the dome's centre and opening, their doors' height
    mark('_gd', DOOR_G[0], 0, DOOR_G[1], 0, 0)                    # the gallery doors (z from, to)
    for k, (a, b_) in enumerate(ARCH_P):
        mark('_pa%d' % k, a, ARCH_TOP, b_, 0, 0)                  # the arches between hall and stair hall (z from, top, to)
    mark('_sa', ARCH_S[0], ARCH_S_TOP, ARCH_S[1], 0, 0)           # the arch from stair hall to wing room
    mark('_up', 0, UP_DOOR[1], D, 2 * UP_DOOR[0], UP_DOOR[2] - UP_DOOR[1])   # the doorway to the bridge concourse


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    station(body, signs, random.Random(1914))
    return body, signs


if __name__ == '__main__':
    run('kawaeki', [dict(id='main', w=W, d=D, h=EAVE_C)], build_hi, lambda v: None)
    write_anchors('kawaeki')
