# Builds Shiomi's station buildings (the Shiokaze Line's west terminus, rebuilt 2026-11-25): the aquarium-glass
# head house and the east hall over the tunnel mouth. Station-specific (landmarks); the game builds the floors,
# colliders, gates, the roof deck's stair and lift, and the canopy over the cutting (src/stations/shiomi.ts).
#
#   blender --background --python tools/blender/build_shiomi.py
#
# Writes assets/buildings/shiomi.blend, public/models/buildings/shiomi.glb and src/stations/anchors/shiomi.ts.
#
#   headhouse  28 m frontage, 42 m deep: a front of tall deep-blue glass bowed 4 m out onto the plaza, glass sides
#              in front, navy fish-scale cladding behind the gates, the glass face down the platforms (open where
#              the stair comes up); a flat roof that is a public deck, its glass balustrade, a white wave sail over
#              its front half. Floor at y 0.2, roof deck at y 6.5.
#   easthall   22 m wide, 18 deep: the same glass and scales, a door each side, the back corners rounded.
#   lighthouse the breakwater light (`lamp`, where the game's flasher is); tallship, cruiser, coaster: the boats
#              that pass under 潮見大橋 when it opens (length along x, bow +x, waterline y = 0).
#
# Frame: front at z = 0 facing -z (the head house's plaza front, the east hall's face down the platforms),
# origin mid-frontage, +z into the lot; y = 0 is the game's y = 0 (street level is 0.15).

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

NAVY = ['flat:#1b2f4f', 'flat:#22406b', 'flat:#2a4d78']
NAVY_D = 'flat:#16263f'
WHITE_M = 'flat:#f2f0ea'
SEA = 'seaglass:#1f5f8f'
CLEAR = 'glassTint'
CEIL = 'flat:#e2eef0'
DECK = 'wood:#9c7b58'
FL = 0.2


def seg(p, mat, a, b, y0, y1, t):
    """A wall of thickness t on the plan line a -> b (x, z), from y0 to y1."""
    dx, dz = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dz)
    if n < 1e-4:
        return
    nx, nz = dz / n * t / 2, -dx / n * t / 2
    o = [(a[0] + nx, a[1] + nz), (b[0] + nx, b[1] + nz)]
    i = [(a[0] - nx, a[1] - nz), (b[0] - nx, b[1] - nz)]
    hn = (nx, 0, nz)
    p.face(mat, [(o[0][0], y0, o[0][1]), (o[1][0], y0, o[1][1]), (o[1][0], y1, o[1][1]), (o[0][0], y1, o[0][1])], hn)
    p.face(mat, [(i[0][0], y0, i[0][1]), (i[1][0], y0, i[1][1]), (i[1][0], y1, i[1][1]), (i[0][0], y1, i[0][1])], (-hn[0], 0, -hn[2]))
    p.face(mat, [(o[0][0], y1, o[0][1]), (o[1][0], y1, o[1][1]), (i[1][0], y1, i[1][1]), (i[0][0], y1, i[0][1])], (0, 1, 0))
    p.face(mat, [(o[0][0], y0, o[0][1]), (o[1][0], y0, o[1][1]), (i[1][0], y0, i[1][1]), (i[0][0], y0, i[0][1])], (0, -1, 0))
    p.face(mat, [(o[0][0], y0, o[0][1]), (i[0][0], y0, i[0][1]), (i[0][0], y1, i[0][1]), (o[0][0], y1, o[0][1])], (-dx, 0, -dz))
    p.face(mat, [(o[1][0], y0, o[1][1]), (i[1][0], y0, i[1][1]), (i[1][0], y1, i[1][1]), (o[1][0], y1, o[1][1])], (dx, 0, dz))


def post(p, mat, x, z, y0, y1, w=0.14):
    p.box(mat, x - w / 2, y0, z - w / 2, x + w / 2, y1, z + w / 2)


def scales(p, r, plane, at, out, a0, a1, y0, y1):
    """Fish-scale cladding on a flat wall: plane 'x' (the wall x = at) or 'z' (z = at); out = +1/-1, the way out.
    Rows overlap upwards, each offset half a scale; a scale is a broad plate over a narrower, prouder lip."""
    W, PITCH = 0.6, 0.34
    k = 0
    y = y0
    while y < y1 - 0.05:
        off = (W / 2) if k % 2 else 0.0
        a = a0 - off
        while a < a1 - 0.05:
            u0, u1 = max(a, a0), min(a + W, a1)
            if u1 - u0 > 0.08:
                mat = NAVY[int(r.random() * len(NAVY))]
                yt = min(y + PITCH + 0.12, y1)
                lip = 0.06 + 0.03 * r.random()
                for (v0, v1, ya, yb, d) in ((u0, u1, y + 0.12, yt, 0.05), (u0 + (u1 - u0) * 0.18, u1 - (u1 - u0) * 0.18, y, y + 0.14, lip)):
                    if plane == 'x':
                        p.box(mat, min(at, at + out * d), ya, v0, max(at, at + out * d), yb, v1)
                    else:
                        p.box(mat, v0, ya, min(at, at + out * d), v1, yb, max(at, at + out * d))
            a += W
        y += PITCH
        k += 1


def glass_run(p, a, b, y0, y1, bay=2.0, mat=SEA):
    """Tall glass along a straight plan line a -> b, white mullions every bay, a navy sill."""
    n = max(1, int(round(math.hypot(b[0] - a[0], b[1] - a[1]) / bay)))
    pts = [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(n + 1)]
    for k in range(n):
        seg(p, mat, pts[k], pts[k + 1], y0 + 0.5, y1, 0.04)
        seg(p, NAVY_D, pts[k], pts[k + 1], y0, y0 + 0.5, 0.2)
    for q in pts:
        post(p, WHITE_M, q[0], q[1], y0, y1, 0.16)
    seg(p, WHITE_M, a, b, y1 - 0.12, y1, 0.22)


def wave_sail(p, x0, x1, z0, z1, y, amp, posts_at):
    """A white canopy that waves along z, on slim navy posts."""
    nz, nx = 12, 8
    for i in range(nz):
        za, zb = z0 + (z1 - z0) * i / nz, z0 + (z1 - z0) * (i + 1) / nz
        h = y + amp * math.sin(math.pi * 2 * ((za + zb) / 2 - z0) / (z1 - z0))
        for j in range(nx):
            xa, xb = x0 + (x1 - x0) * j / nx, x0 + (x1 - x0) * (j + 1) / nx
            crown = 0.5 * (1 - ((xa + xb) / 2 / ((x1 - x0) / 2)) ** 2)
            p.box(WHITE_M, xa, h + crown, za, xb, h + crown + 0.12, zb)
    for (x, z) in posts_at:
        post(p, NAVY_D, x, z, y - 3.2, y + 0.4, 0.18)


def headhouse(p):
    r = random.Random(5)
    HW, D, BOW, ROOF = 14.0, 42.0, 4.0, 6.2
    DY = ROOF + 0.3
    arc = lambda x: -BOW * (1 - (x / HW) ** 2)
    # The front: tall blue glass on the bow, the doors in the middle (the game leaves them open).
    xs = [-HW + 2 * k for k in range(15)]
    for xa, xb in zip(xs, xs[1:]):
        a, b = (xa, arc(xa)), (xb, arc(xb))
        if abs((xa + xb) / 2) < 5:
            seg(p, SEA, a, b, FL + 2.9, ROOF, 0.04)
            seg(p, WHITE_M, a, b, FL + 2.75, FL + 2.9, 0.3)
        else:
            seg(p, SEA, a, b, FL + 0.5, ROOF, 0.04)
            seg(p, NAVY_D, a, b, FL, FL + 0.5, 0.2)
        seg(p, WHITE_M, a, b, ROOF - 0.12, ROOF, 0.22)
    for x in xs:
        post(p, WHITE_M, x, arc(x), FL, ROOF, 0.16)
    for x in (-HW, HW):
        p.cyl(NAVY_D, (x, ROOF / 2, 0.0), 1, 0.45, ROOF + 0.3, seg=14)
    # The sides: glass in front of the gates (a door near the front each side), scales behind them.
    for s in (-1, 1):
        x = s * HW
        glass_run(p, (x, 0.0), (x, 4.0), FL, ROOF, 2.0)
        seg(p, SEA, (x, 4.0), (x, 10.0), FL + 2.8, ROOF, 0.04)
        seg(p, WHITE_M, (x, 4.0), (x, 10.0), FL + 2.65, FL + 2.8, 0.3)
        glass_run(p, (x, 10.0), (x, 24.0), FL, ROOF, 2.0)
        p.box(WHITE_M, x - 0.15, 0, 24.0, x + 0.15, ROOF, 39.0)
        scales(p, r, 'x', x + s * 0.15, s, 24.0, 39.0, 0.0, ROOF)
        # The rounded back corner, in navy panels.
        cx, cz, R = x - s * 3.0, 39.0, 3.0
        pts = [(cx + s * R * math.cos(t), cz + R * math.sin(t)) for t in [math.pi / 2 * k / 6 for k in range(7)]]
        for qa, qb in zip(pts, pts[1:]):
            seg(p, NAVY[1], qa, qb, 0.0, ROOF, 0.3)
    # The face down the platforms: glass, open where the stair comes up.
    glass_run(p, (-HW + 3.0, D), (-1.96, D), FL, ROOF, 2.0)
    glass_run(p, (1.96, D), (HW - 3.0, D), FL, ROOF, 2.0)
    seg(p, SEA, (-1.96, D), (1.96, D), FL + 2.4, ROOF, 0.04)
    seg(p, WHITE_M, (-1.96, D), (1.96, D), FL + 2.25, FL + 2.4, 0.3)
    # The roof: a slab following the bow, a teal-white ceiling under it, the navy fascia, the deck's boards.
    for xa, xb in zip(xs, xs[1:]):
        z0 = min(arc(xa), arc(xb)) - 0.3
        p.box(WHITE_M, xa, ROOF, z0, xb, DY, D - 3.0)
        p.box(CEIL, xa, ROOF - 0.04, max(arc(xa), arc(xb)), xb, ROOF, D - 3.0)
        p.box(DECK, xa + 0.05, DY, max(arc(xa), arc(xb)) + 0.4, xb - 0.05, DY + 0.03, D - 3.4)
    p.box(WHITE_M, -HW + 3.0, ROOF, D - 3.0, HW - 3.0, DY, D + 0.3)
    p.box(CEIL, -HW + 3.0, ROOF - 0.04, D - 3.0, HW - 3.0, ROOF, D)
    for s in (-1, 1):
        cx, cz, R = s * (HW - 3.0), D - 3.0, 3.3
        pts = [(cx + s * R * math.cos(t), cz + R * math.sin(t)) for t in [math.pi / 2 * k / 6 for k in range(7)]]
        for qa, qb in zip(pts, pts[1:]):
            p.face(WHITE_M, [(cx, DY, cz), (qa[0], DY, qa[1]), (qb[0], DY, qb[1])], (0, 1, 0))
            seg(p, NAVY_D, qa, qb, ROOF - 0.5, DY + 0.1, 0.12)
    for xa, xb in zip(xs, xs[1:]):
        seg(p, NAVY_D, (xa, arc(xa) - 0.3), (xb, arc(xb) - 0.3), ROOF - 0.5, DY + 0.1, 0.12)
    for s in (-1, 1):
        scales(p, r, 'x', s * (HW + 0.15), s, 0.0, D - 3.0, ROOF - 0.9, DY + 0.1)
    scales(p, r, 'z', D + 0.3, 1, -HW + 3.0, HW - 3.0, ROOF - 0.9, DY + 0.1)
    # The deck's balustrade: clear glass, a white rail; open on the north side (model +x, placed facing west) for
    # the outside stair's landing (shiomi.ts builds the stair, the lift and the colliders).
    rail_h = DY + 1.1
    for xa, xb in zip(xs, xs[1:]):
        a, b = (xa, arc(xa) + 0.1), (xb, arc(xb) + 0.1)
        seg(p, CLEAR, a, b, DY, rail_h - 0.08, 0.03)
        seg(p, WHITE_M, a, b, rail_h - 0.08, rail_h, 0.1)
    for s in (-1, 1):
        x = s * (HW - 0.1)
        runs = [(0.0, D - 3.0)] if s < 0 else [(0.0, 22.0), (24.4, D - 3.0)]
        for z0, z1 in runs:
            seg(p, CLEAR, (x, z0), (x, z1), DY, rail_h - 0.08, 0.03)
            seg(p, WHITE_M, (x, z0), (x, z1), rail_h - 0.08, rail_h, 0.1)
    seg(p, CLEAR, (-HW + 3.0, D - 0.1), (HW - 3.0, D - 0.1), DY, rail_h - 0.08, 0.03)
    seg(p, WHITE_M, (-HW + 3.0, D - 0.1), (HW - 3.0, D - 0.1), rail_h - 0.08, rail_h, 0.1)
    # The white wave sail over the deck's front half.
    wave_sail(p, -9.0, 9.0, 1.0, 17.0, DY + 3.4, 0.45, [(-7.5, 3.0), (7.5, 3.0), (-7.5, 15.0), (7.5, 15.0)])
    mark('name', 0.0, FL + 3.4, arc(0.0) - 0.3, 8.0, 1.1)


def easthall(p):
    r = random.Random(9)
    HW, D, ROOF = 11.0, 18.0, 5.0
    # The face down the platforms, open where the stair comes up.
    glass_run(p, (-HW, 0.0), (-1.96, 0.0), FL, ROOF, 2.0)
    glass_run(p, (1.96, 0.0), (HW, 0.0), FL, ROOF, 2.0)
    seg(p, SEA, (-1.96, 0.0), (1.96, 0.0), FL + 2.4, ROOF, 0.04)
    seg(p, WHITE_M, (-1.96, 0.0), (1.96, 0.0), FL + 2.25, FL + 2.4, 0.3)
    for s in (-1, 1):
        x = s * HW
        glass_run(p, (x, 0.0), (x, 9.0), FL, ROOF, 2.0)
        seg(p, SEA, (x, 9.0), (x, 15.0), FL + 2.7, ROOF, 0.04)
        seg(p, WHITE_M, (x, 9.0), (x, 15.0), FL + 2.55, FL + 2.7, 0.3)
        cx, cz, R = x - s * 3.0, 15.0, 3.0
        pts = [(cx + s * R * math.cos(t), cz + R * math.sin(t)) for t in [math.pi / 2 * k / 6 for k in range(7)]]
        for qa, qb in zip(pts, pts[1:]):
            seg(p, NAVY[2], qa, qb, 0.0, ROOF + 0.4, 0.3)
    p.box(WHITE_M, -HW + 3.0, 0, D - 0.3, HW - 3.0, ROOF, D)
    scales(p, r, 'z', D, 1, -HW + 3.0, HW - 3.0, 0.0, ROOF + 0.4)
    # Roof and fascia.
    p.box(WHITE_M, -HW - 0.2, ROOF, -0.2, HW + 0.2, ROOF + 0.4, 15.0)
    p.box(WHITE_M, -HW + 3.0, ROOF, 15.0, HW - 3.0, ROOF + 0.4, D)
    p.box(CEIL, -HW, ROOF - 0.04, 0.0, HW, ROOF, 15.0)
    for s in (-1, 1):
        scales(p, r, 'x', s * (HW + 0.2), s, -0.2, 15.0, ROOF - 0.7, ROOF + 0.4)
        cx, cz, R = s * (HW - 3.0), 15.0, 3.2
        pts = [(cx + s * R * math.cos(t), cz + R * math.sin(t)) for t in [math.pi / 2 * k / 6 for k in range(7)]]
        for qa, qb in zip(pts, pts[1:]):
            p.face(WHITE_M, [(cx, ROOF + 0.4, cz), (qa[0], ROOF + 0.4, qa[1]), (qb[0], ROOF + 0.4, qb[1])], (0, 1, 0))
    scales(p, r, 'z', -0.2, -1, -HW - 0.2, HW + 0.2, ROOF - 0.7, ROOF + 0.4)


TEAL = 'flat:#2a9d9a'
CORAL = 'flat:#e8735a'
SAND = 'flat:#e9dcc0'
MOSAIC = [TEAL, 'flat:#1f5f8f', SAND, CORAL, 'flat:#7fc4d0', 'flat:#22406b']


def aquarium(p):
    """川湊水族館: a long hall under a whale-back roof that rises towards the bay, a blue glass drum (the ocean tank's
    hall) at its door, a mosaic of sea colours on its front, a white wave canopy over the entrance."""
    r = random.Random(17)
    HW, D, Z0, H0 = 47.0, 60.0, 6.0, 13.0
    # The hall's walls: white panels banded in navy, the mosaic in front either side of the drum.
    p.box(WHITE_M, -HW, 0, Z0, HW, H0, D)
    for y in (3.2, 7.4, 11.6):
        bands(p, NAVY_D, -HW, HW, Z0, D, [y], t=0.35, proud=0.12)
    for s in (-1, 1):
        x0, x1 = (-HW + 1.0, -15.0) if s < 0 else (15.0, HW - 1.0)
        for i in range(int((x1 - x0) / 1.6)):
            for j in range(int((H0 - 1.0) / 1.6)):
                if r.random() < 0.82:
                    xa, ya = x0 + i * 1.6, 1.0 + j * 1.6
                    p.box(MOSAIC[int(r.random() * len(MOSAIC))], xa + 0.06, ya, Z0 - 0.12, xa + 1.54, ya + 1.48, Z0)
    # The whale-back roof: white bays rising from the front to a crest near the bay end, closing the sides.
    nz = 27
    for k in range(nz):
        za, zb = Z0 + (D - Z0) * k / nz, Z0 + (D - Z0) * (k + 1) / nz
        t = ((za + zb) / 2 - Z0) / (D - Z0)
        y = H0 + 11.0 * math.sin(math.pi * min(1.0, t * 1.15) * 0.92)
        for j in range(10):
            xa, xb = -HW + 2 * HW * j / 10, -HW + 2 * HW * (j + 1) / 10
            crown = 1.6 * (1 - ((xa + xb) / 2 / HW) ** 2)
            p.box(WHITE_M if (k + j) % 7 else 'flat:#dfe7ea', xa, y + crown, za, xb, y + crown + 0.35, zb)
        for s in (-1, 1):
            p.box(WHITE_M, s * HW - 0.2 if s > 0 else -HW, H0, za, s * HW if s > 0 else -HW + 0.2, y + 0.2, zb)
        p.box(NAVY_D, -HW - 0.1, y - 0.3, za, -HW + 0.1, y, zb)
        p.box(NAVY_D, HW - 0.1, y - 0.3, za, HW + 0.1, y, zb)
    p.box(WHITE_M, -HW, H0, D - 0.3, HW, H0 + 6.0, D)
    # The bay side: the sea-view café's glass along the ground floor, framed in navy, under a white canopy.
    for k in range(12):
        xa = -36.0 + k * 6.0
        p.box('windowDim', xa + 0.15, 0.3, D, xa + 5.85, 4.2, D + 0.06, col='flat:#4f6b78')
        p.box(NAVY_D, xa - 0.15, 0.0, D, xa + 0.15, 4.6, D + 0.12)
    p.box(NAVY_D, 35.85, 0.0, D, 36.15, 4.6, D + 0.12)
    p.box(WHITE_M, -37.0, 4.6, D, 37.0, 4.85, D + 2.4)
    mark('cafe', 0.0, 5.4, D + 0.1, 12.0, 0.9, (0, 1))
    # The drum: deep-blue glass on white rings, its top a white disc with a teal rim.
    R, DH, DZ = 13.0, 24.0, 12.0
    p.cyl(SEA, (0.0, DH / 2, DZ), 1, R, DH, seg=28, caps=False)
    for y in (0.0, 6.0, 12.0, 18.0, DH):
        p.cyl(WHITE_M, (0.0, y, DZ), 1, R + 0.25, 0.4, seg=28)
    p.cyl(WHITE_M, (0.0, DH + 0.4, DZ), 1, R - 0.5, 0.6, seg=28)
    p.cyl(TEAL, (0.0, DH + 0.9, DZ), 1, R + 0.4, 0.5, seg=28)
    for k in range(14):
        a = 2 * math.pi * k / 14
        post(p, WHITE_M, R * math.sin(a), DZ - R * math.cos(a), 0.0, DH, 0.22)
    # The entrance: a white wave canopy on slim posts out over the square.
    wave_sail(p, -12.0, 12.0, -9.0, 1.0, 6.2, 0.35, [(-10.0, -7.5), (10.0, -7.5)])
    p.box(SEA, -5.0, 0.0, -1.2, 5.0, 3.2, -1.0)
    mark('name', 0.0, 17.0, DZ - R - 0.4, 15.0, 2.4)


def market(p):
    """The harbour market hall: a two-storey brick warehouse of the old port, gable along the street, arched bays of
    shopfronts under striped awnings, a clock gable in the middle; loading doors on the water side."""
    r = random.Random(23)
    HW, D, EAVE, RIDGE = 32.0, 31.5, 9.0, 13.5
    p.box(BRICK, -HW, 0, 0, HW, EAVE, D)
    bands(p, 'flat:#d8cfbf', -HW, HW, 0, D, [0.6, 4.6, EAVE - 0.7], t=0.35, proud=0.1)
    for x in [-HW + 0.3] + [-HW + 8 * k for k in range(1, 8)] + [HW - 0.3]:
        p.box(BRICK_DK, x - 0.45, 0, -0.25, x + 0.45, EAVE, 0.0)
    awn = ['flat:#c8102e', 'flat:#1f5fa8', 'flat:#2a9d9a', 'flat:#e6a700']
    for k in range(8):
        xc = -HW + 4 + 8 * k
        # The arched shopfront: glass, a dark frame, the arch in pale stone, a striped awning.
        p.box('windowDim', xc - 3.0, 0.2, -0.05, xc + 3.0, 3.6, 0.0, col='flat:#5a6b70')
        p.box(FRAME, xc - 3.1, 0.0, -0.12, xc + 3.1, 0.2, 0.0)
        for i in range(7):
            h = 0.45 * math.sin(math.pi * (i + 0.5) / 7)
            p.box('flat:#d8cfbf', xc - 3.2 + i * 6.4 / 7, 3.6, -0.18, xc - 3.2 + (i + 1) * 6.4 / 7, 3.95 + h, 0.0)
        col = awn[k % 4]
        for i in range(6):
            p.box(col if i % 2 == 0 else WHITE_M, xc - 3.0 + i, 3.2, -2.0, xc - 2.0 + i, 3.35, -0.1)
        # Upper floor: two tall windows in white frames.
        for dx in (-2.0, 2.0):
            p.box(WHITE_M, xc + dx - 0.75, 5.4, -0.1, xc + dx + 0.75, 7.9, 0.0)
            p.box(WINDOW, xc + dx - 0.6, 5.55, -0.14, xc + dx + 0.6, 7.75, -0.1)
    # The gable roof along the street, slate grey, a ridge vent.
    nk = 8
    for k in range(nk):
        za, zb = D * k / (2 * nk), D * (k + 1) / (2 * nk)
        ya = EAVE + (RIDGE - EAVE) * k / nk
        p.box('flat:#4f565c', -HW - 0.4, ya, za - 0.4 if k == 0 else za, HW + 0.4, ya + (RIDGE - EAVE) / nk + 0.25, zb)
        p.box('flat:#4f565c', -HW - 0.4, ya, D - zb, HW + 0.4, ya + (RIDGE - EAVE) / nk + 0.25, D - za + (0.4 if k == 0 else 0))
    for s in (-1, 1):
        x = s * HW
        for k in range(nk):
            za, zb = D * k / (2 * nk), D - D * k / (2 * nk)
            ya = EAVE + (RIDGE - EAVE) * k / nk
            p.box(BRICK, min(x, x - s * 0.3), ya, za, max(x, x - s * 0.3), ya + (RIDGE - EAVE) / nk, zb)
    p.box('flat:#3b4046', -HW + 2, RIDGE + 0.2, D / 2 - 0.8, HW - 2, RIDGE + 1.0, D / 2 + 0.8)
    # The clock gable in the middle of the front.
    p.box(BRICK, -5.0, EAVE, -0.3, 5.0, RIDGE + 2.0, 1.0)
    for k in range(5):
        p.box('flat:#d8cfbf', -5.2 + k * 0.6, RIDGE + 2.0 - k * 0.0, -0.4, 5.2 - k * 0.6, RIDGE + 2.3 + k * 0.4, 1.1)
    p.cyl(WHITE_M, (0.0, EAVE + 3.0, -0.35), 2, 1.5, 0.15, seg=20)
    p.cyl(INK_DARK, (0.0, EAVE + 3.0, -0.45), 2, 1.6, 0.06, seg=20)
    # The water side: loading doors, a timber terrace along it.
    for k in range(6):
        xc = -HW + 6 + 10.4 * k
        p.box('flat:#5d6a70', xc - 2.0, 0.0, D, xc + 2.0, 4.0, D + 0.08)
    p.box('wood:#9c7b58', -HW, 0.0, D, HW, 0.25, D + 3.5)
    mark('name', 0.0, EAVE - 0.2, -0.45, 14.0, 1.2)


def bridgetower(p):
    """潮見大橋's control tower: a navy-banded white shaft on its pier, a glass operators' cab over the deck with a
    deep white roof, the stair inside a slit window; `name` the bridge's name on its deck side."""
    r = random.Random(31)
    W, D, H, CAB = 6.0, 6.0, 9.0, 3.2
    p.box(WHITE_M, -W / 2, 0, 0, W / 2, H, D)
    bands(p, NAVY_D, -W / 2, W / 2, 0, D, [1.0, 4.5, H - 0.6], t=0.3, proud=0.08)
    p.box(SEA, -0.5, 1.5, -0.04, 0.5, H - 1.2, 0.0)
    p.box(NAVY_D, -1.0, 0.0, -0.06, 1.0, 2.3, 0.0)
    # The cab: glass all round, leaning out over the deck side, a white slab roof with a navy edge.
    p.box(NAVY_D, -W / 2 - 0.6, H, -1.2, W / 2 + 0.6, H + 0.4, D + 0.6)
    for (x0, z0, x1, z1) in ((-W / 2 - 0.5, -1.1, W / 2 + 0.5, -1.0), (-W / 2 - 0.5, D + 0.4, W / 2 + 0.5, D + 0.5), (-W / 2 - 0.6, -1.1, -W / 2 - 0.5, D + 0.5), (W / 2 + 0.5, -1.1, W / 2 + 0.6, D + 0.5)):
        p.box(SEA, x0, H + 0.4, z0, x1, H + 0.4 + CAB, z1)
    for x in (-W / 2 - 0.55, -1.0, 1.0, W / 2 + 0.55):
        post(p, WHITE_M, x, -1.05, H + 0.4, H + 0.4 + CAB, 0.12)
    p.box(WHITE_M, -W / 2 - 1.2, H + 0.4 + CAB, -1.8, W / 2 + 1.2, H + 0.9 + CAB, D + 1.2)
    p.box(NAVY_D, -W / 2 - 1.25, H + 0.6 + CAB, -1.85, W / 2 + 1.25, H + 0.9 + CAB, D + 1.25)
    p.box('light', -0.4, H + 0.9 + CAB, D / 2 - 0.4, 0.4, H + 1.2 + CAB, D / 2 + 0.4)
    mark('name', 0.0, H - 2.4, -0.1, 4.4, 1.0)


def lighthouse(p):
    """The breakwater light (stage 5, 2026-11-25): a white tower 15 m on a granite plinth, a gallery with a rail, the
    lantern room's glass, a dark cap and vane; `lamp` where the light flashes (the game: world-view flashers)."""
    p.cyl('flat:#a9a397', (0, 0.6, 0), 1, 3.0, 1.2, seg=16)
    for k, r in enumerate((2.1, 1.95, 1.8, 1.65, 1.5)):
        p.cyl(WHITE_M, (0, 1.2 + k * 2.6 + 1.3, 0), 1, r, 2.6, seg=16)
    top = 1.2 + 5 * 2.6
    p.box(NAVY_D, -0.5, 1.2, -2.16, 0.5, 3.4, -1.9)                  # the door
    for y in (5.0, 9.6):
        p.box(NAVY_D, -0.25, y, -1.98, 0.25, y + 0.8, -1.7)          # slit windows
    p.cyl('flat:#3a3d42', (0, top + 0.15, 0), 1, 2.3, 0.3, seg=16)
    for k in range(16):
        a = 2 * math.pi * k / 16
        p.box('flat:#3a3d42', 2.2 * math.cos(a) - 0.03, top + 0.3, 2.2 * math.sin(a) - 0.03, 2.2 * math.cos(a) + 0.03, top + 1.3, 2.2 * math.sin(a) + 0.03)
    p.cyl('flat:#3a3d42', (0, top + 1.3, 0), 1, 2.25, 0.06, seg=16, caps=False)
    p.cyl('flat:#3a3d42', (0, top + 0.5, 0), 1, 1.1, 0.4, seg=12)
    p.cyl(CLEAR, (0, top + 1.8, 0), 1, 1.05, 2.2, seg=12)
    for k in range(6):
        a = 2 * math.pi * k / 6
        p.box('flat:#3a3d42', 1.05 * math.cos(a) - 0.04, top + 0.7, 1.05 * math.sin(a) - 0.04, 1.05 * math.cos(a) + 0.04, top + 2.9, 1.05 * math.sin(a) + 0.04)
    p.cyl('flat:#f2f0ea', (0, top + 1.8, 0), 1, 0.35, 0.8, seg=8)    # the lens
    p.cyl('flat:#3a3d42', (0, top + 3.05, 0), 1, 1.2, 0.3, seg=12)
    p.cyl('flat:#3a3d42', (0, top + 3.45, 0), 1, 0.7, 0.5, seg=12)
    p.cyl('flat:#3a3d42', (0, top + 4.2, 0), 1, 0.05, 1.0, seg=6)
    mark('lamp', 0.0, top + 1.8, 0.0, 0.8, 0.8)


def hull(p, L, B, bottom, deck, col, band=None, stripe=None, bow=7.0):
    """A ship's hull along x, bow at +x, waterline y = 0: a full-beam body, the bow narrowing in four steps, a raked
    stern; a band at the deck edge, a stripe along the side."""
    x0, xb = -L / 2, L / 2 - bow
    p.box(col, x0 + 1.0, bottom, -B / 2, xb, deck, B / 2)
    p.box(col, x0, bottom + 1.0, -B / 2 + 0.4, x0 + 1.0, deck, B / 2 - 0.4)
    for k in range(4):
        w = B / 2 * (1 - (k + 0.5) / 4.4)
        a, e = xb + k * bow / 4, xb + (k + 1) * bow / 4
        p.box(col, a, bottom + k * 0.5, -w, e, deck + 0.15 * (k + 1), w)
    if band:
        p.box(band, x0, deck - 0.5, -B / 2 - 0.02, xb, deck, B / 2 + 0.02)
    if stripe:
        p.box(stripe, x0 + 1.0, 0.25, -B / 2 - 0.03, xb, 0.6, B / 2 + 0.03)
    p.box('flat:#8c2f22', x0 + 1.0, bottom, -B / 2 - 0.01, xb, 0.0, B / 2 + 0.01)  # antifouling, at the waterline


def rail_round(p, x0, x1, B, y, col='flat:#e9e9e4'):
    for z in (-B / 2 + 0.05, B / 2 - 0.05):
        p.box(col, x0, y + 1.0, z - 0.03, x1, y + 1.06, z + 0.03)
        for x in rows(x0, x1, 1.5):
            p.box(col, x - 0.03, y, z - 0.03, x + 0.03, y + 1.0, z + 0.03)


def tallship(p):
    """A sail-training ship: white hull with a black band, a timber deck, three masts with their yards and the sails
    furled on them, the bowsprit, a deckhouse. 48 m."""
    L, B, D = 48.0, 8.4, 2.6
    hull(p, L, B, -2.6, D, 'flat:#f2f0ea', band='flat:#1d1f22', bow=8.0)
    p.box(DECK, -L / 2 + 0.6, D, -B / 2 + 0.3, L / 2 - 8.0, D + 0.05, B / 2 - 0.3)
    rail_round(p, -L / 2 + 0.6, L / 2 - 8.0, B - 0.4, D, 'wood:#7a5a3c')
    p.box('wood:#9c7b58', -10.0, D, -2.2, -2.0, D + 2.3, 2.2)
    p.box('flat:#2a2b2e', -10.2, D + 2.3, -2.4, -1.8, D + 2.5, 2.4)
    p.cyl('wood:#9c7b58', (L / 2 + 2.0, D + 1.4, 0), 0, 0.18, 10.0, seg=8)  # the bowsprit
    for xm, h in ((12.0, 30.0), (1.0, 32.0), (-12.0, 27.0)):
        p.cyl('wood:#8a6a4a', (xm, D + h / 2, 0), 1, 0.28, h, seg=8)
        for k, yy in enumerate((0.3, 0.5, 0.68, 0.84)):
            y = D + h * yy
            w = 8.5 * (1 - 0.18 * k)
            p.cyl('wood:#6b4e36', (xm, y, 0), 2, 0.12, w, seg=6)
            p.box('flat:#f4f1e6', xm - 0.35, y - 0.55, -w / 2 + 0.3, xm + 0.25, y - 0.05, w / 2 - 0.3)
        p.box('flat:#f2f0ea', xm - 0.35, D + h, -0.35, xm + 0.35, D + h + 0.5, 0.35)
    # shrouds: thin dark lines down to the rails
    for xm, h in ((12.0, 30.0), (1.0, 32.0), (-12.0, 27.0)):
        for zs in (-1, 1):
            for dx in (-1.2, 0.0, 1.2):
                n = 10
                for k in range(n):
                    t0, t1 = k / n, (k + 1) / n
                    ya, yb = D + 1 + (h * 0.82 - 1) * t0, D + 1 + (h * 0.82 - 1) * t1
                    za, zb = zs * (B / 2 - 0.1) * (1 - t0), zs * (B / 2 - 0.1) * (1 - t1)
                    p.box('flat:#2a2b2e', xm + dx - 0.02, ya, min(za, zb) - 0.02, xm + dx + 0.02, yb, max(za, zb) + 0.02)


def cruiser(p):
    """A bay cruise boat: white hull with a navy stripe, two cabin decks with long windows, an open top deck behind
    a rail, a short mast. 34 m."""
    L, B, D = 34.0, 9.0, 1.6
    hull(p, L, B, -2.0, D, 'flat:#f2f0ea', stripe='flat:#1b2f4f', bow=6.0)
    for k, (x0, x1) in enumerate(((-L / 2 + 1.5, L / 2 - 6.5), (-L / 2 + 4.0, L / 2 - 9.5))):
        y = D + k * 2.6
        b2 = B / 2 - 0.4 - k * 0.3
        p.box('flat:#f2f0ea', x0, y, -b2, x1, y + 2.6, b2)
        p.box('flat:#2b4a66', x0 + 0.6, y + 0.9, -b2 - 0.03, x1 - 0.6, y + 2.1, b2 + 0.03)
        p.box('flat:#2b4a66', x1 - 0.02, y + 0.9, -b2 + 0.8, x1 + 0.03, y + 2.1, b2 - 0.8)
    y = D + 5.2
    p.box('flat:#5f7f8f', -L / 2 + 4.0, y, -B / 2 + 0.7, L / 2 - 9.5, y + 0.05, B / 2 - 0.7)
    rail_round(p, -L / 2 + 4.0, L / 2 - 9.5, B - 1.4, y)
    p.box('flat:#f2f0ea', 6.0, y, -1.6, 9.5, y + 2.2, 1.6)
    p.box('flat:#2b4a66', 9.48, y + 0.9, -1.4, 9.53, y + 1.9, 1.4)
    p.cyl('flat:#e9e9e4', (7.5, y + 4.0, 0), 1, 0.1, 3.6, seg=6)
    p.box('flat:#1b2f4f', 6.9, y + 2.2, -0.6, 8.1, y + 3.2, 0.6)
    for x in rows(-L / 2 + 6, L / 2 - 12, 2.4):
        for z in (-1.8, 1.8):
            p.box('flat:#c94b3a', x - 0.3, y, z - 0.3, x + 0.3, y + 0.5, z + 0.3)   # seats on the open deck


def coaster(p):
    """A small coastal cargo ship: red hull with a black top band, blue hatch covers, a crane amidships, the white
    wheelhouse aft with its funnel. 52 m."""
    L, B, D = 52.0, 10.0, 2.8
    hull(p, L, B, -3.0, D, 'flat:#8f2a22', band='flat:#1d1f22', bow=7.0)
    p.box('flat:#3f6b4a', -L / 2 + 1.0, D, -B / 2 + 0.3, L / 2 - 7.0, D + 0.05, B / 2 - 0.3)
    p.box('flat:#8f2a22', L / 2 - 9.0, D, -B / 2 + 0.6, L / 2 - 5.0, D + 1.6, B / 2 - 0.6)   # the forecastle
    for x0 in (-10.0, 3.0):
        p.box('flat:#2f5e8e', x0, D, -B / 2 + 1.2, x0 + 12.0, D + 1.4, B / 2 - 1.2)
        for x in rows(x0, x0 + 12.0, 2.0):
            p.box('flat:#24507a', x - 0.05, D + 1.4, -B / 2 + 1.2, x + 0.05, D + 1.45, B / 2 - 1.2)
    p.cyl('flat:#e6a700', (1.5, D + 5.0, 0), 1, 0.5, 10.0, seg=10)
    p.box('flat:#e6a700', 1.2, D + 8.5, -0.3, 13.0, D + 9.2, 0.3)
    xw = -L / 2 + 2.0
    for k in range(3):
        y = D + k * 2.5
        p.box('flat:#f2f0ea', xw, y, -B / 2 + 0.8 + k * 0.3, xw + 8.0 - k * 1.0, y + 2.5, B / 2 - 0.8 - k * 0.3)
        p.box('flat:#2b3740', xw + 8.0 - k * 1.0 - 0.02, y + 1.0, -B / 2 + 1.4, xw + 8.03 - k * 1.0, y + 2.0, B / 2 - 1.4)
    p.box('flat:#f2f0ea', xw + 1.0, D + 7.5, -B / 2 + 0.5, xw + 6.0, D + 7.7, B / 2 - 0.5)
    p.box('flat:#1d1f22', xw + 0.5, D + 7.7, -0.9, xw + 2.3, D + 10.2, 0.9)
    p.box('flat:#c8102e', xw + 0.5, D + 9.2, -0.92, xw + 2.3, D + 9.6, 0.92)
    p.cyl('flat:#e9e9e4', (xw + 4.5, D + 9.7, 0), 1, 0.08, 4.0, seg=6)


VARIANTS = [
    dict(id='bridgetower', w=7.2, d=7.2, h=14.0, fn=bridgetower, gap=8.0),
    dict(id='headhouse', w=28.0, d=42.0, h=10.6, fn=headhouse, gap=12.0),
    dict(id='easthall', w=22.0, d=18.0, h=5.4, fn=easthall, gap=10.0),
    dict(id='aquarium', w=94.0, d=60.0, h=27.0, fn=aquarium, gap=14.0),
    dict(id='market', w=64.0, d=31.5, h=15.8, fn=market, gap=10.0),
    dict(id='lighthouse', w=6.0, d=6.0, h=21.0, fn=lighthouse, gap=8.0),
    dict(id='tallship', w=60.0, d=9.0, h=40.0, fn=tallship, gap=12.0),
    dict(id='cruiser', w=34.0, d=9.0, h=12.0, fn=cruiser, gap=12.0),
    dict(id='coaster', w=52.0, d=10.0, h=16.0, fn=coaster, gap=12.0),
]


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    v['fn'](body)
    return body, signs


def build_lo(v):
    return None


if __name__ == '__main__':
    run('shiomi', VARIANTS, build_hi, build_lo)
    write_anchors('shiomi')
