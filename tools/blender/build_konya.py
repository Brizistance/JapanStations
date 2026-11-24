# Builds Kon'yahama's own shore pieces (紺屋浜, the old beach where the indigo dyers rinsed their
# cloth; 2026-11, after a pre-war Kansai shore town): the stone sea wall, the memorial steps over it,
# the indigo drying frame on the beach, the bathhouse on the shore street, and the fishermen's
# Ebisu shrine by the level crossing.
#
#   blender --background --python tools/blender/build_konya.py -- [--renders <dir>]
#
# Writes assets/buildings/konya.blend, public/models/buildings/konya.glb and
# src/stations/anchors/konya.ts. Frame: front at z = 0 facing -z, origin mid-frontage on the
# pavement (y 0 is the pavement, 0.15 above the road). Nothing here carries a name.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_aizome import *  # noqa: E402,F401,F403
from build_aizome import (CREAM, EARTH, INDIGO, IRON, MOSS, PAPER, PLASTER, PLASTER_DK, STONE_G, STONE_GD, TIMBER,  # noqa: E402
                          TIMBER_LT, cloth_drop, koshi, noren, pent, quad2, roof_x, roof_z)
from build_aizome import TILE as KAWARA, TILE_DK as KAWARA_DK  # noqa: E402

GRANITE_A = 'flat:#a39d91'
GRANITE_B = 'flat:#8f897d'
GRANITE_C = 'flat:#b3ada0'
COPING = 'flat:#c2bcae'
SAND = 'flat:#cdbb93'
COPPER = 'flat:#5f8f80'
BRICK_S = 'flat:#7d4636'
BRICK_SD = 'flat:#5f3428'
WOOD_N = 'flat:#9a7a55'   # unpainted cypress
GLASSBALL = ['flat:#4f8f86', 'flat:#3f6f9a', 'flat:#7aa66a']

WALL_D = 2.0     # sea wall thickness
WALL_TOP = 2.3   # its coping, above the pavement
BEACH = -0.15    # the beach, below the pavement (the road's level)
STEP_N = 14      # risers each way over the wall
STEP_RUN = 0.3


def courses(p, x0, x1, z, y0, y1, r, face=-1, depth=0.12):
    """Coursed granite on a wall face at z (facing `face` in z): blocks in offset rows, shades varied."""
    y, row = y0, 0
    while y < y1 - 0.02:
        h = min(0.38, y1 - y)
        x = x0 - (0.45 if row % 2 else 0.0)
        while x < x1 - 0.02:
            w = 0.7 + r.random() * 0.4
            a, e = max(x, x0), min(x + w, x1)
            if e - a > 0.05:
                mat = (GRANITE_A, GRANITE_B, GRANITE_C)[r.randrange(3)]
                zz = z + face * (0.01 + r.random() * 0.02)
                p.box(mat, a + 0.015, y + 0.015, min(z, zz), e - 0.015, y + h - 0.015, max(z, zz) + (depth if face < 0 else 0))
            x += w
        y += h
        row += 1


def seawall(p, s, v, r):
    """Six metres of the stone sea wall: coursed granite to the street, a coping, a battered face to
    the beach with weep holes, sand banked at its foot."""
    hw = v['w'] / 2
    p.box(STONE_GD, -hw, BEACH - 0.3, 0.05, hw, WALL_TOP - 0.02, WALL_D - 0.05)
    courses(p, -hw, hw, 0.0, 0.0, WALL_TOP - 0.15, r)
    p.box(COPING, -hw, WALL_TOP - 0.15, -0.08, hw, WALL_TOP, WALL_D * 0.55)
    # The sea face, battered: three steps of courses back from the beach.
    for k, (z, y0, y1) in enumerate(((WALL_D + 0.35, BEACH, 0.6), (WALL_D + 0.15, 0.6, 1.4), (WALL_D, 1.4, WALL_TOP - 0.15))):
        p.box(STONE_GD, -hw, y0, WALL_D - 0.05, hw, y1, z)
        courses(p, -hw, hw, z, y0, y1, r, face=1, depth=0)
    p.prism(COPING, [(WALL_D * 0.55, WALL_TOP), (WALL_D + 0.05, WALL_TOP - 0.12), (WALL_D + 0.05, WALL_TOP - 0.2), (WALL_D * 0.55, WALL_TOP - 0.2)], 'x', -hw, hw)
    for x in (-hw + 1.5, hw - 1.5):
        p.box('flat:#2c2d2c', x - 0.08, 0.5, WALL_D + 0.36, x + 0.08, 0.66, WALL_D + 0.37)
    p.box(SAND, -hw, BEACH, WALL_D + 0.3, hw, BEACH + 0.12, WALL_D + 1.1)
    if r.random() < 0.6:
        x = -hw + 0.5 + r.random() * (2 * hw - 1.0)
        p.box(MOSS, x, BEACH, WALL_D + 0.35, x + 0.6 + r.random(), 0.25, WALL_D + 0.4)


def seasteps(p, s, v, r):
    """The memorial steps over the sea wall where the dyers' rinsing steps once went down to the
    water: a flight up from the promenade, a landing on the wall, a flight down to the beach, stone
    parapets either side; a plaque and a name stone on the street face."""
    hw = v['w'] / 2
    sw = hw - 1.0            # half width of the flights
    rise = (WALL_TOP - BEACH) / STEP_N
    up = WALL_TOP / STEP_N
    z1 = STEP_N * STEP_RUN   # top of the street flight
    land = z1 + 1.0
    z3 = land + STEP_N * STEP_RUN
    # Parapets and the wall body either side of the flights.
    for o in (-1, 1):
        a, e = (sw, hw) if o > 0 else (-hw, -sw)
        p.box(STONE_GD, a, BEACH, 0.0, e, WALL_TOP + 0.75, z3)
        courses(p, a, e, 0.0, 0.0, WALL_TOP + 0.6, r)
        p.box(COPING, a - 0.05, WALL_TOP + 0.6, -0.05, e + 0.05, WALL_TOP + 0.8, z3 + 0.05)
        side = e if o > 0 else a
        p.box(GRANITE_B, min(side, side + o * -0.02), 0.0, 0.0, max(side, side + o * -0.02), WALL_TOP + 0.6, z3)
    # The street flight.
    for k in range(STEP_N):
        y = up * (k + 1)
        p.box(GRANITE_C if k % 2 else GRANITE_A, -sw, 0.0, k * STEP_RUN, sw, y, z1 + 0.01)
        p.box(COPING, -sw, y - 0.03, k * STEP_RUN - 0.02, sw, y, k * STEP_RUN + 0.06)
    p.box(COPING, -sw, WALL_TOP - 0.1, z1, sw, WALL_TOP, land)
    # The beach flight, worn and darker at the foot where the sea once came.
    for k in range(STEP_N):
        y = WALL_TOP - rise * (k + 1)
        mat = MOSS if k > STEP_N - 3 else (GRANITE_B if k % 2 else GRANITE_A)
        p.box(mat, -sw, BEACH, land, sw, y + rise, land + (k + 1) * STEP_RUN)
    p.box(SAND, -hw - 0.5, BEACH, z3, hw + 0.5, BEACH + 0.1, z3 + 1.2)
    # Handrails down the middle of both flights.
    for za, ya, zb, yb in ((0.2, 0.9, z1, WALL_TOP + 0.9), (land, WALL_TOP + 0.9, z3 - 0.2, BEACH + 0.9)):
        n = 12
        for k in range(n):
            t0, t1 = k / n, (k + 1) / n
            pa = (za + (zb - za) * t0, ya + (yb - ya) * t0)
            pb = (za + (zb - za) * t1, ya + (yb - ya) * t1)
            p.prism('flat:#5b6266', [(pa[0], pa[1]), (pb[0], pb[1]), (pb[0], pb[1] + 0.05), (pa[0], pa[1] + 0.05)], 'x', -0.03, 0.03)
        for zz, yy in ((za, ya), (zb, yb)):
            p.box('flat:#5b6266', -0.03, yy - 0.9, zz - 0.03, 0.03, yy + 0.05, zz + 0.03)
    # The plaque and the name stone on the street face of the left parapet; a name stone on the right.
    board(p, 'plaque', 'f', -hw + 0.12, -sw - 0.12, 0.85, 1.55, 0.0, 'flat:#4a3f2c', 0.04)
    p.box(GRANITE_C, sw + 0.15, 0.0, -0.45, hw - 0.1, 1.5, -0.05)
    board(p, 'stone', 'f', sw + 0.25, hw - 0.2, 0.3, 1.4, -0.45, 'flat:#b3ada0', 0.01)


def dryframe(p, s, v, r):
    """A tall frame for drying dyed cloth (monohoshi) on the beach: timber posts, three bars, long
    lengths of indigo hung from the top."""
    hw = v['w'] / 2
    for x in (-hw + 0.2, hw - 0.2):
        p.box(TIMBER, x - 0.08, BEACH, 0.5, x + 0.08, 6.2, 0.66)
        p.prism(TIMBER, [(0.0, BEACH), (0.18, BEACH), (0.58, 2.2), (0.5, 2.2)], 'x', x - 0.05, x + 0.05)
        p.prism(TIMBER, [(1.18, BEACH), (1.0, BEACH), (0.66, 2.2), (0.74, 2.2)], 'x', x - 0.05, x + 0.05)
    for y in (2.6, 4.4, 6.0):
        p.box(TIMBER_LT, -hw, y, 0.53, hw, y + 0.08, 0.63)
    n = 7
    shades = ['#1d2c50', '#24407a', '#2f4a82', '#121a30', '#5574a8']
    for k in range(n):
        x = -hw + 0.5 + k * (2 * hw - 1.0) / (n - 1)
        length = 4.4 + r.random() * 1.2
        col = 'flat:' + shades[k % len(shades)]
        p.box(col, x - 0.24, 6.08 - length, 0.56, x + 0.24, 6.08, 0.6)
    _ = cloth_drop


def karahafu(p, x0, x1, z0, z1, y, rise, mat=KAWARA):
    """A cusped gable (karahafu) over a porch, ridge along z: an S-curved roof section."""
    n = 10
    xc, hw = (x0 + x1) / 2, (x1 - x0) / 2
    top, bot = [], []
    for k in range(n + 1):
        t = k / n
        x = x0 + (x1 - x0) * t
        u = abs(x - xc) / hw
        yy = y + rise * (math.cos(u * math.pi / 2) ** 1.6) - 0.12 * math.sin(u * math.pi) * (1 - u)
        top.append((x, yy + 0.18))
        bot.append((x, yy))
    p.prism(mat, top + list(reversed(bot)), 'z', z0, z1)
    p.prism(KAWARA_DK, [(q[0], q[1] + 0.06) for q in top] + list(reversed(top)), 'z', z0 - 0.04, z0 + 0.12)
    # The bargeboard in plain cypress under the front edge, a gilt ornament at the cusp.
    p.prism(WOOD_N, [(q[0], q[1] - 0.02) for q in bot] + [(q[0], q[1] - 0.3) for q in reversed(bot)], 'z', z0 - 0.06, z0)
    p.box('flat:#b08d3a', xc - 0.18, y + rise - 0.35, z0 - 0.1, xc + 0.18, y + rise - 0.05, z0 - 0.05)


def sento(p, s, v, r):
    """The neighbourhood bathhouse: a temple-style front with a cusped-gable porch, tiled gable roof
    to the street, plaster and timber walls, the boiler house behind with its tall brick chimney."""
    w, d = v['w'], v['d']
    hw = w / 2
    eave = 5.6
    # The hall.
    p.box(PLASTER, -hw + 0.2, 0.0, 0.3, hw - 0.2, eave, d - 3.0)
    p.box(STONE_GD, -hw + 0.1, 0.0, 0.25, hw - 0.1, 0.45, d - 2.9)
    for x in (-hw + 0.2, -hw + 2.6, hw - 2.6, hw - 0.2):
        p.box(TIMBER, x - 0.12, 0.45, 0.22, x + 0.12, eave, 0.36)
    p.box(TIMBER, -hw + 0.2, eave - 0.45, 0.2, hw - 0.2, eave - 0.25, 0.36)
    p.box(TIMBER, -hw + 0.2, 2.9, 0.22, hw - 0.2, 3.05, 0.36)
    # Upper windows: the clerestory over the baths, lit behind paper.
    for xa, xb in ((-hw + 0.9, -hw + 2.2), (hw - 2.2, hw - 0.9)):
        quad(p, 'windowDim', 'f', xa, xb, 3.4, 4.6, 0.2, col=WARM)
        koshi(p, xa, xb, 3.4, 4.6, 0.19, step=0.16, mat=TIMBER, back=None)
    for xa, xb in ((-hw + 0.9, -hw + 2.2), (hw - 2.2, hw - 0.9)):
        koshi(p, xa, xb, 0.9, 2.4, 0.19, step=0.12, mat=TIMBER, back=PAPER)
    roof_z(p, -hw, hw, -0.3, d - 2.8, eave, 3.4, ov=0.6, mat=KAWARA)
    # Gable face: plaster with timber, a ventilation lantern on the ridge.
    p.prism(PLASTER_DK, [(-hw + 0.2, eave), (hw - 0.2, eave), (0.0, eave + 3.1)], 'z', 0.28, 0.32)
    p.box(TIMBER, -0.08, eave, 0.24, 0.08, eave + 3.0, 0.3)
    p.box(PLASTER, -1.1, eave + 3.3, d / 2 - 1.4, 1.1, eave + 4.2, d / 2 + 1.4)
    koshi(p, -1.0, 1.0, eave + 3.4, eave + 4.1, d / 2 - 1.41, step=0.14, mat=TIMBER, back=None)
    roof_z(p, -1.4, 1.4, d / 2 - 1.7, d / 2 + 1.7, eave + 4.2, 0.8, ov=0.25, mat=KAWARA)
    # The porch: posts, the cusped gable, the entrance with its two noren (men's and women's).
    pz0, pz1 = -1.6, 0.3
    for o in (-1, 1):
        p.box(WOOD_N, o * 2.2 - 0.12, 0.0, pz0, o * 2.2 + 0.12, 3.3, pz0 + 0.24)
    p.box(WOOD_N, -2.4, 3.15, pz0 - 0.02, 2.4, 3.4, pz1)
    karahafu(p, -2.9, 2.9, pz0 - 0.3, pz1, 3.4, 1.15)
    p.box(STONE_G, -2.4, 0.0, pz0, 2.4, 0.12, 0.3)
    p.box(TIMBER_LT, -1.7, 0.12, 0.18, 1.7, 2.6, 0.3)
    quad(p, 'windowDim', 'f', -1.6, 1.6, 0.2, 2.5, 0.17, col=WARM)
    noren(p, -1.6, -0.1, 2.5, 1.0, 0.1, 'flat:#24407a', n=3)
    noren(p, 0.1, 1.6, 2.5, 1.0, 0.1, 'flat:#a3343a', n=3)
    board(p, 'name', 'f', -1.3, 1.3, 3.55, 4.15, pz0 - 0.35, 'flat:#2a2019', 0.03)
    board(p, 'hours', 'f', 2.55, 3.45, 0.9, 2.1, 0.19, 'flat:#f2efe6', 0.02)
    # Shoe lockers glimpsed, umbrella stand, a bench and potted plants by the door.
    p.box(TIMBER, -2.0, 0.12, -0.8, -1.85, 0.5, -0.2)
    p.box(WOOD_N, 1.9, 0.0, -1.1, 3.4, 0.45, -0.7)
    for x in (-3.4, -2.9, 3.9):
        p.cyl('flat:#8a5a3a', (x, 0.22, -0.4), 1, 0.2, 0.44, seg=8)
        p.cyl(MOSS, (x, 0.65, -0.4), 1, 0.28, 0.5, seg=8)
    # Boiler house behind, firewood stacked, the chimney.
    p.box('flat:#6d6a64', -hw + 0.4, 0.0, d - 3.0, hw - 4.0, 3.4, d - 0.2)
    p.box('flat:#55524c', -hw + 0.3, 3.4, d - 3.1, hw - 3.9, 3.55, d - 0.1)
    for k in range(4):
        p.box('flat:#8a6a45', hw - 3.8, 0.0, d - 2.8 + k * 0.62, hw - 0.4, 1.1, d - 2.3 + k * 0.62)
    cx, cz = hw - 2.0, d - 1.2
    y = 0.0
    for k, (wd, hh) in enumerate(((1.6, 4.0), (1.4, 6.0), (1.2, 6.0), (1.0, 3.0))):
        p.box(BRICK_S if k % 2 == 0 else BRICK_SD, cx - wd / 2, y, cz - wd / 2, cx + wd / 2, y + hh, cz + wd / 2)
        y += hh
    for yy in (4.0, 10.0, 16.0):
        p.box(IRON, cx - 0.72, yy, cz - 0.72, cx + 0.72, yy + 0.12, cz + 0.72)
    p.box(IRON, cx - 0.55, y, cz - 0.55, cx + 0.55, y + 0.2, cz + 0.55)
    mark('_chimney', cx, y, cz, 1.0, 0.2)
    board(p, 'chimney', 'f', cx - 0.5, cx + 0.5, 9.5, 15.5, cz - 0.62, 'flat:#f1ead8', 0.02)


def ebisu(p, s, v, r):
    """The fishermen's Ebisu shrine: a granite torii, a gravel precinct behind a stone fence, stone
    lanterns, an old anchor and a rack of glass floats left as offerings, the plain cypress hall."""
    w, d = v['w'], v['d']
    x0, x1 = -w / 2, w / 2
    p.box('flat:#b9b2a2', x0, 0, 0, x1, 0.02, d)
    p.box(STONE_G, -1.0, 0.02, 0, 1.0, 0.05, d - 4.8)
    for a, e in ((x0, -2.0), (2.0, x1)):
        p.box(STONE_GD, a, 0, -0.1, e, 0.5, 0.25)
        p.box(STONE_G, a, 0.5, -0.05, e, 1.1, 0.2)
        p.box(COPING, a - 0.03, 1.1, -0.08, e + 0.03, 1.2, 0.23)
    for xe, o in ((x0, 1), (x1, -1)):
        p.box(STONE_GD, min(xe, xe + o * 0.25), 0, 0.25, max(xe, xe + o * 0.25), 1.2, d)
    p.box(STONE_GD, x0, 0, d - 0.25, x1, 1.6, d)
    # Granite myōjin torii.
    for o in (-1, 1):
        p.cyl(GRANITE_C, (o * 1.6, 1.85, 1.0), 1, 0.17, 3.7, seg=12)
        p.cyl(GRANITE_B, (o * 1.6, 0.15, 1.0), 1, 0.24, 0.3, seg=12)
    p.box(GRANITE_C, -2.0, 2.8, 0.88, 2.0, 3.02, 1.12)
    p.prism(GRANITE_A, [(-2.55, 3.55), (2.55, 3.55), (2.75, 3.9), (-2.75, 3.9)], 'z', 0.82, 1.18)
    p.box(GRANITE_B, -2.3, 3.38, 0.86, 2.3, 3.55, 1.14)
    board(p, 'name', 'f', -0.32, 0.32, 3.02, 3.36, 0.85, 'flat:#3a3a36', 0.03)
    board(p, 'post', 'f', -2.6, -2.15, 0.45, 1.95, -0.15, 'flat:#b9b3a4', 0.02)
    # Lanterns.
    for o in (-1, 1):
        lx, lz = o * 1.8, 4.0
        p.box(STONE_GD, lx - 0.32, 0, lz - 0.32, lx + 0.32, 0.22, lz + 0.32)
        p.cyl(STONE_G, (lx, 0.8, lz), 1, 0.12, 1.2, seg=8)
        p.box(STONE_G, lx - 0.28, 1.4, lz - 0.28, lx + 0.28, 1.5, lz + 0.28)
        p.box('light', lx - 0.16, 1.5, lz - 0.16, lx + 0.16, 1.8, lz + 0.16)
        p.box(STONE_GD, lx - 0.38, 1.8, lz - 0.38, lx + 0.38, 1.94, lz + 0.38)
        p.cyl(STONE_G, (lx, 2.06, lz), 1, 0.1, 0.22, seg=6)
    # The anchor on its plinth, the float rack, the water basin.
    ax, az = x0 + 2.0, 6.5
    p.box(STONE_GD, ax - 0.7, 0, az - 0.5, ax + 0.7, 0.4, az + 0.5)
    p.box('flat:#3b2f2a', ax - 0.07, 0.4, az - 0.07, ax + 0.07, 2.4, az + 0.07)
    p.box('flat:#3b2f2a', ax - 0.5, 2.1, az - 0.06, ax + 0.5, 2.2, az + 0.06)
    p.ring('flat:#3b2f2a', (ax, 2.55, az), 0.16, 0.04, seg=10, sub=4)
    for o in (-1, 1):
        p.prism('flat:#3b2f2a', [(ax + o * 0.08, 0.5), (ax + o * 0.75, 1.05), (ax + o * 0.62, 1.12), (ax + o * 0.05, 0.62)], 'z', az - 0.06, az + 0.06)
    rx, rz = x1 - 1.3, 6.4
    for zz in (rz - 1.4, rz + 1.4):
        p.box(WOOD_N, rx - 0.05, 0, zz - 0.05, rx + 0.05, 1.9, zz + 0.05)
    p.box(WOOD_N, rx - 0.04, 1.75, rz - 1.4, rx + 0.04, 1.82, rz + 1.4)
    for k in range(7):
        zz = rz - 1.2 + k * 0.4
        p.box('flat:#6f6a5c', rx - 0.01, 1.35, zz - 0.01, rx + 0.01, 1.75, zz + 0.01)
        p.cyl(GLASSBALL[k % 3], (rx, 1.22, zz), 1, 0.15, 0.28, seg=10)
    bx, bz = x0 + 2.0, 3.0
    p.box(STONE_G, bx - 0.55, 0, bz - 0.38, bx + 0.55, 0.6, bz + 0.38)
    p.box('flat:#3a5a7a', bx - 0.44, 0.52, bz - 0.26, bx + 0.44, 0.56, bz + 0.26)
    # The hall: plain cypress on a stone base, a grey tiled roof with a pent over the steps.
    hz = d - 5.0
    mark('_hall', 0, 1.6, hz + 2.0, 4.0, 3.4)
    p.box(STONE_GD, -2.2, 0, hz, 2.2, 0.7, hz + 4.2)
    for k in range(3):
        p.box(STONE_G, -1.1, 0, hz - 0.3 * (3 - k), 1.1, 0.23 * (k + 1), hz - 0.3 * (2 - k))
    p.box(WOOD_N, -1.6, 0.7, hz + 1.0, 1.6, 2.9, hz + 3.9)
    for ox in (-1.65, 1.65):
        for oz in (0.25, 1.0, 3.9):
            p.box(TIMBER_LT, ox - 0.09, 0.7, hz + oz - 0.09, ox + 0.09, 2.95, hz + oz + 0.09)
    p.box(TIMBER_LT, -1.8, 2.75, hz + 0.15, 1.8, 2.95, hz + 4.0)
    koshi(p, -0.9, 0.9, 0.8, 2.5, hz + 0.98, step=0.15, mat=TIMBER, back=PAPER)
    roof_x(p, -2.2, 2.2, hz - 0.2, hz + 4.3, 2.95, 1.6, ov=0.5, mat=KAWARA)
    p.box(TIMBER, -0.5, 0.7, hz + 0.35, 0.5, 1.15, hz + 0.85)
    p.cyl('flat:#b08d3a', (0, 2.55, hz + 0.55), 1, 0.13, 0.22, seg=8)
    quad2(p, 'flat:#f1ead8', [(-0.05, 2.45, hz + 0.55), (0.05, 2.45, hz + 0.55), (0.05, 1.3, hz + 0.55), (-0.05, 1.3, hz + 0.55)], (0, 0, -1))
    # Nobori flags in fishermen's colours.
    for o in (-1, 1):
        p.cyl('flat:#d8d4c8', (o * 2.8, 1.95, 1.7), 1, 0.03, 3.9, seg=6)
        quad2(p, 'flat:#c8a23a' if o < 0 else 'flat:#2f6aa3', [(o * 2.8, 3.8, 1.73), (o * 2.8, 3.8, 2.23), (o * 2.8, 1.4, 2.23), (o * 2.8, 1.4, 1.73)], (1, 0, 0))
    _ = (CREAM, EARTH, INDIGO, pent, roof_x)


EK_FL = 1.2      # the station house's floor above the pavement (the platform's level)
EK_EAVE = 5.0
EK_DOOR = (-2.6, 2.6)          # the front doorway
EK_SIDE = (7.0, 8.7)           # the east side door (model −x), z range: the ramp's landing
EK_PF = (18.0, 22.0)           # the doorway to the platform (model +x), z range
CREAM_W = 'flat:#e9dfc6'
BOARD_D = 'flat:#4a3626'
GREEN_T = 'flat:#3f5a4c'


def wall_run(p, face, at, a0, a1, holes, r):
    """One outside wall of the station house on a face ('f', 'b', 'l', 'r') at `at`, from a0 to a1
    along it: dark boards to the sill, cream plaster above, posts every three metres; `holes` are
    (a0, a1, y0, y1) openings left open."""
    o = {'f': -1, 'b': 1, 'l': -1, 'r': 1}[face]

    def panel(mat, b0, b1, y0, y1, proud=0.0):
        cuts = sorted([h for h in holes if h[0] < b1 and h[1] > b0 and h[2] < y1 and h[3] > y0])
        segs = [(b0, b1)]
        for h in cuts:
            nxt = []
            for s0, s1 in segs:
                if h[1] <= s0 or h[0] >= s1:
                    nxt.append((s0, s1))
                    continue
                if h[0] > s0:
                    nxt.append((s0, h[0]))
                if h[1] < s1:
                    nxt.append((h[1], s1))
                # Above and below the opening.
                if h[3] < y1:
                    quad(p, mat, face, max(h[0], s0), min(h[1], s1), max(h[3], y0), y1, at + o * proud)
                if h[2] > y0:
                    quad(p, mat, face, max(h[0], s0), min(h[1], s1), y0, min(h[2], y1), at + o * proud)
            segs = nxt
        for s0, s1 in segs:
            if s1 - s0 > 0.01:
                quad(p, mat, face, s0, s1, y0, y1, at + o * proud)

    panel(BOARD_D, a0, a1, EK_FL, EK_FL + 1.0, 0.02)
    panel(CREAM_W, a0, a1, EK_FL + 1.0, EK_EAVE)
    # Posts and the rail between boards and plaster, proud of the wall.
    k = a0
    while k <= a1 + 1e-6:
        if not any(h[0] - 0.1 < k < h[1] + 0.1 for h in holes):
            if face in 'fb':
                p.box(TIMBER, k - 0.09, EK_FL, min(at, at + o * 0.1), k + 0.09, EK_EAVE, max(at, at + o * 0.1))
            else:
                p.box(TIMBER, min(at, at + o * 0.1), EK_FL, k - 0.09, max(at, at + o * 0.1), EK_EAVE, k + 0.09)
        k += 3.0
    # The rails stop at any opening they would cross (the waist rail at the doorways).
    for y0, y1 in ((EK_FL + 0.96, EK_FL + 1.06), (EK_EAVE - 0.3, EK_EAVE)):
        segs = [(a0, a1)]
        for h in sorted(holes):
            if h[2] < y1 and h[3] > y0:
                segs = [q for s0, s1 in segs for q in ((s0, min(s1, h[0])), (max(s0, h[1]), s1)) if q[1] - q[0] > 0.01]
        for s0, s1 in segs:
            if face in 'fb':
                p.box(TIMBER, s0, y0, min(at, at + o * 0.07), s1, y1, max(at, at + o * 0.07))
            else:
                p.box(TIMBER, min(at, at + o * 0.07), y0, s0, max(at, at + o * 0.07), y1, s1)


def ekisha_k(p, s, v, r):
    """Kon'yahama's 1930s station house: a long timber house on a stone base at the platform's
    height, cream plaster over dark boards, a tiled hip-and-gable roof, a gabled porch on the street
    with steps up to the doors, a ramp along the east side; a doorway onto the platform on the west.
    Outside faces only: the game builds the rooms inside."""
    w, d = v['w'], v['d']
    hw = w / 2
    # The stone base, to the floor.
    p.box(STONE_GD, -hw - 0.1, -0.05, -0.1, hw + 0.1, EK_FL, d + 0.1)
    courses(p, -hw - 0.1, hw + 0.1, -0.1, 0.0, EK_FL, r)
    # Windows: (a0, a1) along each wall, sill to head; doorways.
    win_y = (EK_FL + 1.0, EK_FL + 2.5)
    fw = [(-8.6, -5.0), (5.0, 8.6)]
    sw = [(z, z + 1.8) for z in (2.0, 11.0, 14.0, 25.0)]
    ww = [(z, z + 1.8) for z in (2.0, 5.5, 9.0, 12.5, 25.5)]
    bw = [(-7.0, -4.0), (4.0, 7.0)]
    holes_f = [(EK_DOOR[0], EK_DOOR[1], EK_FL, EK_FL + 2.8)]
    holes_l = [(EK_SIDE[0], EK_SIDE[1], EK_FL, EK_FL + 2.4)]
    holes_r = [(EK_PF[0], EK_PF[1], EK_FL, EK_FL + 2.6)]
    wall_run(p, 'f', 0.0, -hw, hw, holes_f, r)
    wall_run(p, 'b', d, -hw, hw, [], r)
    wall_run(p, 'l', -hw, 0.0, d, holes_l, r)
    wall_run(p, 'r', hw, 0.0, d, holes_r, r)
    for face, at, spans in (('f', 0.0, fw), ('b', d, bw), ('l', -hw, sw), ('r', hw, ww)):
        o = {'f': -1, 'b': 1, 'l': -1, 'r': 1}[face]
        for a0, a1 in spans:
            quad(p, 'windowDim', face, a0, a1, win_y[0], win_y[1], at + o * 0.03, col=WARM)
            # Sash bars and a frame.
            n = 3
            for k in range(n + 1):
                a = a0 + (a1 - a0) * k / n
                if face in 'fb':
                    p.box(TIMBER, a - 0.03, win_y[0], min(at, at + o * 0.06), a + 0.03, win_y[1], max(at, at + o * 0.06))
                else:
                    p.box(TIMBER, min(at, at + o * 0.06), win_y[0], a - 0.03, max(at, at + o * 0.06), win_y[1], a + 0.03)
            ym = (win_y[0] + win_y[1]) / 2
            if face in 'fb':
                p.box(TIMBER, a0, ym - 0.03, min(at, at + o * 0.06), a1, ym + 0.03, max(at, at + o * 0.06))
                p.box(TIMBER_LT, a0 - 0.1, win_y[0] - 0.08, min(at, at + o * 0.12), a1 + 0.1, win_y[0], max(at, at + o * 0.12))
            else:
                p.box(TIMBER, min(at, at + o * 0.06), ym - 0.03, a0, max(at, at + o * 0.06), ym + 0.03, a1)
                p.box(TIMBER_LT, min(at, at + o * 0.12), win_y[0] - 0.08, a0 - 0.1, max(at, at + o * 0.12), win_y[0], a1 + 0.1)
    # Door frames round the openings.
    for a0, a1 in (EK_DOOR,):
        for a in (a0, a1):
            p.box(TIMBER, a - 0.12, EK_FL, -0.12, a + 0.12, EK_FL + 2.95, 0.0)
        p.box(TIMBER, a0 - 0.12, EK_FL + 2.8, -0.12, a1 + 0.12, EK_FL + 3.0, 0.0)
    for z0, z1, x, o in ((EK_SIDE[0], EK_SIDE[1], -hw, -1), (EK_PF[0], EK_PF[1], hw, 1)):
        for z in (z0, z1):
            p.box(TIMBER, min(x, x + o * 0.12), EK_FL, z - 0.12, max(x, x + o * 0.12), EK_FL + 2.75, z + 0.12)
    # The roof: a hip-and-gable of grey tile over the long house, eaves well out.
    roof_z(p, -hw, hw, -0.2, d + 0.2, EK_EAVE, 3.4, ov=0.9, mat=KAWARA)
    for zz in (-0.2, d + 0.2):
        o = -1 if zz < 1 else 1
        p.prism(PLASTER_DK, [(-hw + 0.3, EK_EAVE), (hw - 0.3, EK_EAVE), (0.0, EK_EAVE + 3.3)], 'z', min(zz, zz + o * 0.04), max(zz, zz + o * 0.04))
        p.prism(KAWARA, [(-hw - 0.9, EK_EAVE + 0.2), (hw + 0.9, EK_EAVE + 0.2), (hw + 0.9, EK_EAVE + 0.36), (-hw - 0.9, EK_EAVE + 0.36)], 'z', min(zz, zz + o * 1.6), max(zz, zz + o * 1.6))
    # Eave brackets along the long sides.
    z = 1.0
    while z < d - 0.5:
        for x, o in ((-hw, -1), (hw, 1)):
            p.box(TIMBER, min(x, x + o * 0.85), EK_EAVE - 0.45, z - 0.06, max(x, x + o * 0.85), EK_EAVE - 0.3, z + 0.06)
        z += 3.0
    # The porch: steps up from the forecourt, a stone landing, four posts and a gable to the street.
    pz = -4.5
    for k in range(8):
        y = 0.15 * (k + 1)
        p.box(GRANITE_C if k % 2 else GRANITE_A, -4.0, 0.0, pz + 0.3 * k, 4.0, y, pz + 0.3 * k + 0.32)
    p.box(GRANITE_B, -4.4, 0.0, pz + 2.4, 4.4, EK_FL, 0.0)
    for x in (-4.2, 4.2):
        for z in (pz + 0.25, -0.3):
            p.box(WOOD_N, x - 0.13, EK_FL if z > pz + 2.4 else 0.0, z - 0.13, x + 0.13, EK_FL + 3.3, z + 0.13)
        p.box(WOOD_N, min(x, x * 1.0), EK_FL + 3.1, pz + 0.1, x + (0.13 if x > 0 else -0.13), EK_FL + 3.35, 0.0)
    p.box(WOOD_N, -4.4, EK_FL + 3.1, pz + 0.1, 4.4, EK_FL + 3.35, pz + 0.4)
    roof_z(p, -4.6, 4.6, pz - 0.2, 0.6, EK_FL + 3.35, 1.7, ov=0.45, mat=KAWARA)
    p.prism(CREAM_W, [(-4.3, EK_FL + 3.35), (4.3, EK_FL + 3.35), (0.0, EK_FL + 4.95)], 'z', pz - 0.24, pz - 0.2)
    board(p, 'name', 'f', -2.4, 2.4, EK_FL + 3.5, EK_FL + 4.2, pz - 0.26, 'flat:#f4efe0', 0.04)
    mark('_clock', 0.0, EK_FL + 4.6, pz - 0.3, 0.5, 0.5)
    # Handrails down the steps, a lamp each side of the doors.
    for x in (-2.0, 2.0):
        n = 8
        for k in range(n):
            za, zb = pz + 0.3 * k, pz + 0.3 * (k + 1)
            p.box('flat:#5b6266', x - 0.03, 0.9 + 0.15 * k, za, x + 0.03, 0.95 + 0.15 * k, zb)
        p.box('flat:#5b6266', x - 0.03, 0.15, pz + 0.05, x + 0.03, 0.95, pz + 0.11)
    for x in (-3.3, 3.3):
        p.box(IRON, x - 0.12, EK_FL + 2.3, -0.2, x + 0.12, EK_FL + 2.75, -0.02)
        p.box('light', x - 0.09, EK_FL + 2.33, -0.18, x + 0.09, EK_FL + 2.7, -0.04)
    # The ramp up the east side (model −x) to the side door, its rail; a canopy over the landing.
    rz0, rz1 = EK_SIDE[0] - 14.4, EK_SIDE[0]
    x0, x1 = -hw - 1.7, -hw - 0.1
    n = 12
    for k in range(n):
        za, zb = rz0 + (rz1 - rz0) * k / n, rz0 + (rz1 - rz0) * (k + 1) / n
        ya, yb = EK_FL * k / n, EK_FL * (k + 1) / n
        p.prism(GRANITE_B, [(za, 0.0), (zb, 0.0), (zb, yb), (za, ya)], 'x', x0, x1)
    p.box(GRANITE_A, x0, 0.0, rz1, x1, EK_FL, EK_SIDE[1] + 0.3)
    for k in range(n):
        za, zb = rz0 + (rz1 - rz0) * k / n, rz0 + (rz1 - rz0) * (k + 1) / n
        ya = EK_FL * k / n + 0.85
        p.box('flat:#5b6266', x0 - 0.04, ya, za, x0 + 0.04, ya + 0.05 + EK_FL / n, zb)
    for z in (rz0 + 0.1, rz0 + 4.9, rz0 + 9.7, rz1, EK_SIDE[1] + 0.2):
        yb = EK_FL * max(0.0, min(1.0, (z - rz0) / (rz1 - rz0)))
        p.box('flat:#5b6266', x0 - 0.04, 0.0, z - 0.04, x0 + 0.04, yb + 0.9, z + 0.04)
    p.prism('flat:#6f6a60', [(x0 - 0.3, EK_FL + 2.9), (x1 + 0.1, EK_FL + 3.15), (x1 + 0.1, EK_FL + 3.22), (x0 - 0.3, EK_FL + 2.97)], 'z', EK_SIDE[0] - 0.6, EK_SIDE[1] + 0.6)
    # A name board on the platform side, under the eaves.
    board(p, 'side', 'r', 11.0, 17.0, EK_FL + 2.75, EK_FL + 3.35, hw + 0.08, 'flat:#f4efe0', 0.03)


STYLES_K = {'seawall': seawall, 'seasteps': seasteps, 'dryframe': dryframe, 'sento': sento, 'ebisu': ebisu, 'ekisha': ekisha_k}

VARIANTS_K = [
    dict(id='seawall_a', style='seawall', w=6.0, d=WALL_D, h=WALL_TOP, seed=1),
    dict(id='seawall_b', style='seawall', w=6.0, d=WALL_D, h=WALL_TOP, seed=5),
    dict(id='seawall_c', style='seawall', w=6.0, d=WALL_D, h=WALL_TOP, seed=9),
    dict(id='seasteps', style='seasteps', w=7.0, d=2 * STEP_N * STEP_RUN + 1.0, h=WALL_TOP + 0.8, seed=3),
    dict(id='dryframe', style='dryframe', w=6.0, d=1.2, h=6.2, seed=4),
    dict(id='sento', style='sento', w=13.0, d=12.0, h=19.0, seed=6),
    dict(id='ebisu', style='ebisu', w=12.0, d=16.0, h=5.6, seed=7),
    dict(id='ekisha', style='ekisha', w=20.6, d=30.0, h=EK_EAVE + 3.6, seed=8),
]
for _v in VARIANTS_K:
    _v['gap'] = 6.0


def build_k(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(v['seed'] * 131 + 7)
    STYLES_K[v['style']](body, signs, v, r)
    return body, signs


if __name__ == '__main__':
    run('konya', VARIANTS_K, build_k, lambda v: None)
    write_anchors('konya')
