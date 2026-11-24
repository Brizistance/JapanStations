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
#   x ±14         the middle pavilion, PROJ_C proud: three arched doors into the great hall (hollow, HALL_H
#                 high, right through to a doorway in the back wall and the walkway under the tracks), the
#                 clock over them, a dome on an eight-sided drum.
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
CX, EX0, EX1 = 14.0, 72.0, 94.0    # half the middle pavilion; the end pavilions
PROJ_C, PROJ_E = 2.5, 1.5
HALL_X, HALL_H = 13.6, 10.0        # the great hall: half its clear width, its ceiling
DOORS = [(-8.7, -3.7), (-2.5, 2.5), (3.7, 8.7)]
# Ways through the building at street level, where a walkway under the tracks comes out behind it (x from, to):
# one through each wing, one through the east end pavilion. TUN_H high.
TUNNELS = [(-32.8, -29.2), (29.2, 32.8), (83.6, 87.8)]
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


def crown(p, cx, cz, y, R, H, drum):
    """A dome on an eight-sided drum with round windows, a lantern on top."""
    p.cyl(BRICK, (cx, y + drum / 2, cz), 1, R + 0.5, drum, seg=8)
    p.cyl(STONE_W, (cx, y + drum + 0.2, cz), 1, R + 0.8, 0.4, seg=8)
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


def station(p, s, r):
    top = EAVE
    # ── The wings ──
    for sx in (-1, 1):
        x0, x1 = (CX, EX0) if sx > 0 else (-EX0, -CX)
        tuns = [t for t in TUNNELS if x0 < t[0] < x1]
        holed(p, BRICK, x0, 0, x1, top + 0.8, tuns)
        wall(p, 'f', x0, x1, 0, 12, gaps=tuns)
        # The back, over the viaduct: a row of windows on the top floor.
        bw = (x1 - x0) / 12
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

    # ── The middle pavilion: hollow below HALL_H, solid above ──
    zf = -PROJ_C
    p.box(BRICK, -CX, HALL_H, zf, CX, EAVE_P + 0.8, D)
    # The front wall: stone piers and three arches, brick over them.
    piers = [(-CX, DOORS[0][0]), (DOORS[0][1], DOORS[1][0]), (DOORS[1][1], DOORS[2][0]), (DOORS[2][1], CX)]
    for a, b_ in piers:
        p.box(STONE_W, a, 0, zf, b_, 8.2, zf + 1.0)
        p.box(GRAN, a - 0.08, 0, zf - 0.1, b_ + 0.08, 0.9, zf + 1.08)
        p.box(STONE_W, a - 0.1, 4.3, zf - 0.12, b_ + 0.1, 4.6, zf + 1.1)
    for a, b_ in DOORS:
        arch(p, STONE_W, 'f', a, b_, 4.6, 7.1, 8.2, zf, 1.0, 12, CREAM)
        wbox(p, STONE_W, 'f', (a + b_) / 2 - 0.25, (a + b_) / 2 + 0.25, 7.0, 7.8, zf, -0.12, 0)
        p.box('light', (a + b_) / 2 - 0.9, HALL_H - 0.12, zf + 2.0, (a + b_) / 2 + 0.9, HALL_H - 0.06, zf + 2.3)
    p.box(BRICK, -CX, 8.2, zf, CX, HALL_H, zf + 1.0)
    # The projection's side walls, and the wings' ends closing the hall.
    for sx in (-1, 1):
        p.box(BRICK, min(sx * HALL_X, sx * CX), 0, zf + 1.0, max(sx * HALL_X, sx * CX), HALL_H, D)
        p.box(GRAN, min(sx * (CX - 0.1), sx * (CX + 0.12)), 0, zf - 0.1, max(sx * (CX - 0.1), sx * (CX + 0.12)), 0.9, 0)
    # The back wall, with the doorway to the walkway under the tracks.
    for a, b_ in ((-HALL_X, -BACK_DOOR), (BACK_DOOR, HALL_X)):
        p.box(BRICK, a, 0, D - 0.6, b_, HALL_H, D)
    p.box(BRICK, -BACK_DOOR, BACK_H, D - 0.6, BACK_DOOR, HALL_H, D)
    p.box(STONE_W, -BACK_DOOR - 0.3, BACK_H, D - 0.68, BACK_DOOR + 0.3, BACK_H + 0.4, D - 0.6)
    # The hall's ceiling: cream panels between brick beams, lamps.
    p.face(CREAM, [(-HALL_X, HALL_H - 0.02, zf + 1.0), (HALL_X, HALL_H - 0.02, zf + 1.0), (HALL_X, HALL_H - 0.02, D - 0.6), (-HALL_X, HALL_H - 0.02, D - 0.6)], (0, -1, 0))
    for z in (4.0, 11.0, 18.0):
        p.box(STONE_W, -HALL_X, HALL_H - 0.5, z - 0.3, HALL_X, HALL_H - 0.02, z + 0.3)
        for cx in (-8.0, 0.0, 8.0):
            p.box('light', cx - 1.4, HALL_H - 0.1, z + 2.6, cx + 1.4, HALL_H - 0.04, z + 3.4)
    # Above the doors: the station's name on a stone frieze, tall windows, the clock in a stone gable.
    wbox(p, STONE_W, 'f', -CX - 0.1, CX + 0.1, 8.2, 9.9, zf, -0.2, 0)
    mark('name', 0, 9.05, zf - 0.22, 15.0, 1.2, (0, -1))
    for c in (-10.6, -6.2, 6.2, 10.6):
        quad(p, STONE_W, 'f', c - 1.0, c + 1.0, 10.9, 16.2, zf - 0.015)
        quad(p, WINDOW, 'f', c - 0.8, c + 0.8, 11.1, 15.6, zf - 0.03)
        fan(p, 'f', c, 15.6, 0.8, zf)
    for c in (-CX + 0.3, -8.4, -4.0, 4.0, 8.4, CX - 0.3):
        wbox(p, BRICK_DK, 'f', c - 0.3, c + 0.3, 9.9, EAVE_P, zf, -0.14, 0)
    wbox(p, STONE_W, 'f', -3.4, 3.4, 10.6, EAVE_P, zf, -0.26, 0)
    n = 20
    p.face('flat:#f4f1e8', [(2.1 * math.cos(2 * math.pi * i / n), 14.6 + 2.1 * math.sin(2 * math.pi * i / n), zf - 0.3) for i in range(n)], (0, 0, -1))
    p.face(COPPER, [(2.35 * math.cos(2 * math.pi * i / n), 14.6 + 2.35 * math.sin(2 * math.pi * i / n), zf - 0.28) for i in range(n)], (0, 0, -1))
    mark('clock', 0, 14.6, zf - 0.32, 2.9, 2.9, (0, -1))   # (the game's clock fills its square: inside the ring)
    wbox(p, STONE_W, 'f', -CX - 0.1, CX + 0.1, EAVE_P, EAVE_P + 0.8, zf, -0.42, 0)
    p.prism(STONE_W, [(-9.0, EAVE_P + 0.8), (9.0, EAVE_P + 0.8), (0, EAVE_P + 4.6)], 'z', zf - 0.1, zf + 0.6)
    p.prism(BRICK, [(-7.4, EAVE_P + 1.1), (7.4, EAVE_P + 1.1), (0, EAVE_P + 4.1)], 'z', zf - 0.14, zf - 0.1)
    for sx in (-1, 1):
        wbox(p, STONE_W, 'l' if sx < 0 else 'r', zf, D, sx * CX, EAVE_P, EAVE_P + 0.8, -0.3, 0)
    wbox(p, STONE_W, 'b', -CX, CX, EAVE_P, EAVE_P + 0.8, D, -0.3, 0)
    p.box(SLATE, -CX + 0.6, EAVE_P + 0.8, zf + 0.6, CX - 0.6, EAVE_P + 1.8, D - 0.6)
    crown(p, 0, (D + zf) / 2 + 1.0, EAVE_P + 1.8, 11.0, 9.0, 2.8)
    # Measurements for the game's colliders: the hall's clear width and height, the doors' span, the back doorway.
    mark('_hall', 0, 0, zf, 2 * HALL_X, HALL_H)
    mark('_doors', 0, 0, zf, DOORS[2][1] - DOORS[0][0], 4.6)
    mark('_back', 0, 0, D, 2 * BACK_DOOR, BACK_H)
    for k, (a, b_) in enumerate(TUNNELS):
        mark('_tun%d' % k, (a + b_) / 2, 0, -PROJ_E if abs(a) > EX0 else 0, b_ - a, TUN_H)
    mark('_geo', CX, PROJ_C, EX0, PROJ_E, EAVE_P)
    for k, (a, b_) in enumerate(piers[1:3]):
        mark('_pier%d' % k, (a + b_) / 2, 0, zf, b_ - a, 1.0)


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    station(body, signs, random.Random(1914))
    return body, signs


if __name__ == '__main__':
    run('kawaeki', [dict(id='main', w=W, d=D, h=EAVE_P)], build_hi, lambda v: None)
    write_anchors('kawaeki')
