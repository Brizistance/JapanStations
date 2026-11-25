# Builds the landmarks of 帆影大通 Hokage-ōdōri, the diagonal avenue north-east of Kawaminato-kō (2026-11-24):
# two flatiron buildings for the 60° corners where the avenue cuts the street grid (a 1920s seamen's hotel
# with a domed prow, a 1960s shipping office with a glazed prow) and the plaza's sail monument, 帆影.
#
#   blender --background --python tools/blender/build_hatoba.py -- [--renders <dir>]
#
# Writes assets/buildings/hatoba.blend, public/models/buildings/hatoba.glb and src/stations/anchors/hatoba.ts.
#
# A flatiron's frame: its avenue front along x at z = 0 facing -z, the prow at +x. Its second street front
# runs back from the prow at 60° to the first: from (w/2, 0) towards (-0.5, 0.866), to z = d. The monument
# is centred on z = d / 2.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

BRICK_R = 'flat:#9a4e3a'
STONE_W = 'flat:#ddd3bd'
STONE_D = 'flat:#8c8373'
COPPER = 'flat:#5f8f7d'
WHITE_T = 'flat:#e8e6df'
NAVY = 'flat:#1d3550'
STEEL_S = 'flat:#c9ced2'
GOLD = 'flat:#d4a537'
COS60, SIN60 = 0.5, 0.8660254


def foot(w, d, inset=0.0):
    """The flatiron's footprint, anticlockwise from above (x, z), shrunk by `inset` all round."""
    x0, x1 = -w / 2 + inset, w / 2 - inset * 1.7
    t = 1 / math.tan(math.radians(60))
    return [(x0, d - inset), (x0, inset), (x1, inset), (x1 - (d - 2 * inset) * t, d - inset)]


def extrude(p, mat, pts, y0, y1, top=True):
    """Walls round a convex footprint (x, z points, anticlockwise from above) and its top."""
    n = len(pts)
    for i in range(n):
        (ax, az), (bx, bz) = pts[i], pts[(i + 1) % n]
        L = math.hypot(bx - ax, bz - az)
        if L < 1e-6:
            continue
        nx, nz = (bz - az) / L, -(bx - ax) / L
        p.face(mat, [(ax, y0, az), (bx, y0, bz), (bx, y1, bz), (ax, y1, az)], (nx, 0, nz))
    if top:
        p.face(mat, [(x, y1, z) for x, z in pts], (0, 1, 0))


def outward(a, b):
    L = math.hypot(b[0] - a[0], b[1] - a[1])
    return (b[1] - a[1]) / L, -(b[0] - a[0]) / L, L


def panel(p, mat, a, b, s0, s1, y0, y1, off, col=None):
    """A flat panel on wall a→b (x, z), s0 … s1 metres along it, `off` out from it."""
    nx, nz, L = outward(a, b)
    ux, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    P = lambda s: (a[0] + ux * s + nx * off, a[1] + uz * s + nz * off)
    (px, pz), (qx, qz) = P(s0), P(s1)
    if mat == WINDOW:
        col = WINDOW
        mat = WINDOW_LIT if p.lit.random() < LIT_SHARE else WINDOW_DARK
    p.face(mat, [(px, y0, pz), (qx, y0, qz), (qx, y1, qz), (px, y1, pz)], (nx, 0, nz), col)


def wall_windows(p, a, b, y0, floors, fh, bay, ww, wh, sill, frame, skip_end=0.0):
    """A grid of windows on wall a→b: a frame panel behind each pane."""
    _, _, L = outward(a, b)
    for f in range(floors):
        y = y0 + f * fh + sill
        for c in rows(1.4, L - 1.4 - skip_end, bay):
            panel(p, frame, a, b, c - ww / 2 - 0.12, c + ww / 2 + 0.12, y - 0.12, y + wh + 0.12, 0.03)
            panel(p, WINDOW, a, b, c - ww / 2, c + ww / 2, y, y + wh, 0.05)


def mark_on(name, a, b, s, y, w, h, off):
    nx, nz, L = outward(a, b)
    ux, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    mark(name, a[0] + ux * s + nx * off, y, a[1] + uz * s + nz * off, w, h, (round(nx, 4), round(nz, 4)))


def flatiron(p, s, v, r):
    """A flatiron on a 60° corner. `hotel`: brick over a stone base, stone bands, a round prow tower with a
    copper dome. Otherwise a 1960s office: white bands, ribbon glazing, a glazed rounded prow."""
    w, d, h = v['w'], v['d'], v['h']
    hotel = v['style'] == 'hotel'
    pts = foot(w, d)
    wall = BRICK_R if hotel else WHITE_T
    G = 4.4
    # The body: base, upper storeys, cornice, parapet.
    extrude(p, STONE_D if hotel else 'flat:#2a2d31', pts, 0, 0.6)
    extrude(p, STONE_W if hotel else 'flat:#d7d9d6', foot(w, d, 0.05), 0.6, G)
    extrude(p, wall, pts, G, h)
    extrude(p, STONE_W if hotel else NAVY, foot(w, d, -0.25), h, h + 0.5)
    extrude(p, wall, foot(w, d, 0.4), h + 0.5, h + 1.4)
    fh, floors = (3.5, int((h - G - 0.8) / 3.5))
    # The two street fronts: the avenue (A→B) and the side street (B→C), prow at B.
    A, B, C = pts[1], pts[2], pts[3]
    tower_r = 3.2 if hotel else 2.6
    for (a, b, cut) in ((A, B, tower_r + 0.4), (B, C, 0.0)):
        _, _, L = outward(a, b)
        s_from = tower_r + 0.4 if (a == B) else 0.0
        # Shop glass between piers at the street.
        for c in rows(1.2 + s_from, L - 1.2 - (cut if a == A else 0), 4.2):
            panel(p, 'windowDim', a, b, c - 1.7, c + 1.7, 0.6, G - 0.9, 0.06, col=WARM if r.random() < 0.6 else SHOP)
        if hotel:
            for y in (G, G + fh * 2 + 0.2, h - 0.9):
                panel(p, STONE_W, a, b, 0, L, y - 0.25, y + 0.15, 0.06)
            wall_windows(p, a, b, G, floors, fh, 2.6, 1.15, 1.9, 0.75, STONE_W, 0)
        else:
            for f in range(floors):
                y = G + f * fh
                panel(p, NAVY, a, b, 0, L, y, y + 0.35, 0.05)
                panel(p, WINDOW, a, b, 0.6, L - 0.6 - (cut if a == A else 0), y + 0.9, y + 2.9, 0.06)
    # Names: over the shop storey on both fronts.
    mark_on('name', A, B, outward(A, B)[2] * 0.42, G - 0.45, min(12.0, outward(A, B)[2] * 0.5), 0.75, 0.12)
    panel(p, 'flat:#1f2023', A, B, outward(A, B)[2] * 0.42 - 6.1, outward(A, B)[2] * 0.42 + 6.1, G - 0.88, G - 0.02, 0.1)
    LS = outward(B, C)[2]
    mark_on('name_side', B, C, LS * 0.55, G - 0.45, min(9.0, LS * 0.55), 0.75, 0.12)
    panel(p, 'flat:#1f2023', B, C, LS * 0.55 - 4.6, LS * 0.55 + 4.6, G - 0.88, G - 0.02, 0.1)
    # The prow: a round tower on the corner (stands proud of both fronts), its dome or its glazed drum.
    bisx, bisz = -0.5 * (1 + COS60) - 0, 0.5 * SIN60  # roughly into the block, along the corner's bisector
    L = math.hypot(bisx, bisz)
    cx, cz = B[0] + bisx / L * (tower_r * 0.9), B[1] + bisz / L * (tower_r * 0.9)
    top = h + (3.0 if hotel else 1.4)
    p.cyl(STONE_D if hotel else 'flat:#2a2d31', (cx, 0.3, cz), 1, tower_r + 0.15, 0.6, seg=28)
    p.cyl(wall if hotel else GLASS_BL, (cx, top / 2 + 0.3, cz), 1, tower_r, top - 0.6, seg=28)
    if hotel:
        for y in (G, G + fh * 2 + 0.2, h - 0.9):
            p.cyl(STONE_W, (cx, y, cz), 1, tower_r + 0.08, 0.4, seg=28)
        for f in range(floors):
            y = G + f * fh + 0.75
            for k in range(-2, 3):
                a = math.atan2(-(cz - B[1]) - 0.0, (B[0] - cx)) + k * 0.42
                wx, wz = cx + math.cos(a) * (tower_r + 0.04), cz - math.sin(a) * (tower_r + 0.04)
                p.box(WINDOW, wx - 0.35, y, wz - 0.35, wx + 0.35, y + 1.9, wz + 0.35)
        # The dome: a drum, rings narrowing to a lantern and a finial.
        p.cyl(STONE_W, (cx, top + 0.3, cz), 1, tower_r + 0.25, 0.6, seg=28)
        for k in range(8):
            t0, t1 = k / 8, (k + 1) / 8
            rr = (tower_r + 0.1) * math.cos(t0 * math.pi / 2)
            p.cyl(COPPER, (cx, top + 0.6 + (math.sin(t0 * math.pi / 2) + math.sin(t1 * math.pi / 2)) / 2 * 3.6, cz), 1, max(0.25, rr), 3.6 * (math.sin(t1 * math.pi / 2) - math.sin(t0 * math.pi / 2)) + 0.02, seg=24)
        p.cyl(COPPER, (cx, top + 4.6, cz), 1, 0.45, 1.0, seg=10)
        p.box(GOLD, cx - 0.05, top + 5.1, cz - 0.05, cx + 0.05, top + 6.6, cz + 0.05)
        mark('prow', cx + (B[0] - cx) * 1.0 + 0.0, G + fh * 1.5, cz + (B[1] - cz) * 1.0 - 0.0, 1.2, fh * 3.2, (round((B[0] - cx) / tower_r, 4), round((B[1] - cz) / tower_r, 4)))
    else:
        for f in range(floors):
            p.cyl(NAVY, (cx, G + f * fh + 0.17, cz), 1, tower_r + 0.06, 0.35, seg=28)
        p.cyl(NAVY, (cx, top + 0.2, cz), 1, tower_r + 0.3, 0.4, seg=28)
        p.box(STEEL_S, cx - 0.06, top + 0.4, cz - 0.06, cx + 0.06, top + 7.0, cz + 0.06)
    # Back walls: plain, a few windows, rooftop plant.
    for a, b in ((C, pts[0]), (pts[0], A)):
        wall_windows(p, a, b, G, floors, fh, 3.4, 1.1, 1.4, 0.95, 'flat:#bdb6a8', 0)
    plant(p, -w / 2 + 2, -w / 2 + 2 + min(8, w / 3), h + 0.5, 2, min(d - 2, 8), v['seed'])


def monument(p, s, v, r):
    """帆影 Hokage: a round granite basin with a ring of jets, three stainless sails on a mast rising out of it."""
    zc = v['d'] / 2
    p.cyl('flat:#9a958c', (0, 0.25, zc), 1, 7.0, 0.5, seg=48)
    p.cyl('flat:#b9b3a6', (0, 0.55, zc), 1, 7.0, 0.1, seg=48)
    p.cyl('flat:#3f6476', (0, 0.48, zc), 1, 6.4, 0.06, seg=48)
    p.cyl('flat:#9a958c', (0, 0.9, zc), 1, 1.6, 0.8, seg=24)
    for k in range(12):
        a = k * math.pi / 6
        p.cyl('flat:#dfe9ee', (math.cos(a) * 5.0, 0.9, zc + math.sin(a) * 5.0), 1, 0.08, 0.8, seg=6)
    p.cyl(STEEL_S, (0, 7.0, zc), 1, 0.16, 12.0, seg=10)
    # Three sails, each a tall triangle turned about the mast, both faces.
    for k, (H, W) in enumerate(((12.5, 4.2), (10.0, 3.6), (8.2, 3.0))):
        a = k * 2.1 + 0.3
        ux, uz = math.cos(a), math.sin(a)
        base = [(0.15 * ux, 1.3, zc + 0.15 * uz), (W * ux, 1.3 + 0.8, zc + W * uz), (0.15 * ux, 1.3 + H, zc + 0.15 * uz)]
        n = (-uz, 0, ux)
        p.face(STEEL_S, base, n)
        p.face(STEEL_S, list(reversed(base)), (uz, 0, -ux))


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(v['seed'])
    (monument if v['style'] == 'monument' else flatiron)(body, signs, v, r)
    return body, signs


def build_lo(v):
    return None


VARIANTS = [
    dict(id='flatiron_a', style='hotel', w=34.0, d=18.0, h=22.0, seed=1),
    dict(id='flatiron_b', style='office', w=26.0, d=15.0, h=19.5, seed=2),
    dict(id='hokage', style='monument', w=14.0, d=14.0, h=13.5, seed=3),
]
for _v in VARIANTS:
    _v['gap'] = 8.0


if __name__ == '__main__':
    run('hatoba', VARIANTS, build_hi, build_lo)
    write_anchors('hatoba')
