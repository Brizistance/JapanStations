# Builds Watayamachi's landmarks (綿屋町, the cotton wholesalers' town, after Osaka's Senba):
#   court   the 1920s tenant office building with a courtyard carts drove into, through an arched passage
#   tonya   the last cotton merchant's house, with its yard and white-walled storehouse behind
#   yashiro the weavers' shrine: a fenced precinct, stone torii, lanterns, a worship hall
#   gangi   stone landing steps down to the canal, where the bales came ashore
#
#   blender --background --python tools/blender/build_wata.py -- [--renders <dir>]
#
# Writes assets/buildings/wata.blend, public/models/buildings/wata.glb and src/stations/anchors/wata.ts
# (sizes, boards the game letters, and '_' marks: passages, yards and halls for the colliders).
# Frame and helpers: buildkit.py, kitakit.py. Nothing here carries a name.
# `court` and `yashiro` are walked into and are open to the sky inside: the model is all there is to see.
#
# Sources: docs/theme-notes.md (Textile wholesale grid), docs/street-design.md.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

SCRATCH = 'flat:#8a6a4c'     # scratch tile
SCRATCH_DK = 'flat:#6f5238'
STONE_L = 'flat:#cfc6b2'
STONE_M = 'flat:#a39c8c'
STONE_D = 'flat:#7c766a'
BLACKP = 'flat:#2a2622'      # black plaster
TIMBER = 'flat:#3b2a1e'
TIMBER_LT = 'flat:#6b4a30'
PLASTER = 'flat:#ece4d2'
ROOFT = 'flat:#3d4148'
ROOFT_DK = 'flat:#2c2f35'
COPPER = 'flat:#5f8f7d'
PAPER = 'flat:#f4ecd6'
MADDER = 'flat:#9c2a30'
WARM = 'flat:#ffe2b0'
EARTH = 'flat:#8a7a62'

CT_W, CT_D, CT_H = 36.0, 35.0, 19.0
CT_PASS = (-2.2, 2.2, 4.2)                 # the carriage passage: x range and height
CT_YARD = (-7.0, 10.0, 7.0, 24.0)          # the courtyard: x0, z0, x1, z1
TN_W, TN_D = 27.0, 34.0
YS_W, YS_D = 33.0, 34.0
YS_GATE = 2.6                              # half width of the opening in the shrine's fence


def gable_x(p, x0, x1, z0, z1, eave, rise, ov=0.6, mat=ROOFT):
    """A gabled roof with its ridge along x."""
    zm = (z0 + z1) / 2
    p.prism(mat, [(z0 - ov, eave), (zm, eave + rise), (z1 + ov, eave), (z1 + ov, eave + 0.18), (zm, eave + rise + 0.2), (z0 - ov, eave + 0.18)], 'x', x0 - ov, x1 + ov)
    p.box(ROOFT_DK, x0 - ov, eave + rise + 0.15, zm - 0.18, x1 + ov, eave + rise + 0.42, zm + 0.18)
    for x in (x0, x1 - 0.2):
        p.prism(PLASTER, [(z0, eave), (zm, eave + rise - 0.05), (z1, eave)], 'x', x, x + 0.2)


def court(p, s, v, r):
    w, d, H = CT_W, CT_D, CT_H
    x0, x1 = -w / 2, w / 2
    pa, pe, ph = CT_PASS
    ya, za, ye, ze = CT_YARD
    kw = dict(fh=3.8, bay=3.4, ww=1.7, wh=2.2, sill=1.0)
    # The ring: front wing either side of the passage and over it, two side wings, the back wing.
    grid(p, x0, pa, 0, za, 0, H, SCRATCH, which='fbl', **kw)
    grid(p, pe, x1, 0, za, 0, H, SCRATCH, which='fbr', **kw)
    grid(p, pa, pe, 0, za, ph, H, SCRATCH, which='fb', bay=4.4, fh=3.7, ww=2.4, wh=2.0, sill=0.9)
    grid(p, x0, ya, za, ze, 0, H, SCRATCH, which='lr', **kw)
    grid(p, ye, x1, za, ze, 0, H, SCRATCH, which='lr', **kw)
    grid(p, x0, x1, ze, d, 0, H, SCRATCH, which='fblr', **kw)
    # Stone base, a string course over the street storey, the cornice and parapet.
    for a, e in ((x0, pa), (pe, x1)):
        p.box(STONE_M, a, 0, -0.12, e, 0.9, 0.0)
        p.box(STONE_L, a, 4.0, -0.15, e, 4.35, 0.0)
    for xo, nx in ((x0, -1), (x1, 1)):
        p.box(STONE_M, min(xo, xo + nx * 0.12), 0, 0, max(xo, xo + nx * 0.12), 0.9, d)
        p.box(STONE_L, min(xo, xo + nx * 0.15), 4.0, 0, max(xo, xo + nx * 0.15), 4.35, d)
    p.box(STONE_L, x0 - 0.45, H - 0.9, -0.45, x1 + 0.45, H - 0.45, 0.0)
    p.box(STONE_L, x0 - 0.45, H - 0.9, 0, x0, H - 0.45, d)
    p.box(STONE_L, x1, H - 0.9, 0, x1 + 0.45, H - 0.45, d)
    p.box(SCRATCH_DK, x0, H, 0, x1, H + 0.9, 0.3)
    p.box(SCRATCH_DK, x0, H, 0, x0 + 0.3, H + 0.9, d)
    p.box(SCRATCH_DK, x1 - 0.3, H, 0, x1, H + 0.9, d)
    p.box(SCRATCH_DK, x0, H, d - 0.3, x1, H + 0.9, d)
    # Pilasters up the front, and a taller centre over the passage with the building's board.
    for c in (x0 + 0.5, -9.0, pa - 0.5, pe + 0.5, 9.0, x1 - 0.5):
        p.box(SCRATCH_DK, c - 0.45, 0.9, -0.22, c + 0.45, H - 0.9, 0.0)
    p.box(SCRATCH_DK, pa - 1.0, H, -0.2, pe + 1.0, H + 2.4, 0.5)
    p.box(STONE_L, pa - 1.2, H + 2.4, -0.35, pe + 1.2, H + 2.75, 0.6)
    # The passage: stone piers, a flat arch, lamps, its soffit lit.
    for c in (pa, pe):
        p.box(STONE_L, c - 0.5, 0, -0.3, c + 0.5, ph, 0.25)
    p.box(STONE_L, pa - 0.5, ph, -0.3, pe + 0.5, ph + 0.7, 0.25)
    p.box(STONE_M, pa - 0.5, ph + 0.7, -0.38, pe + 0.5, ph + 0.95, 0.25)
    p.box(PLASTER, pa, ph - 0.06, 0.3, pe, ph, za)
    for z in (2.5, 5.0, 7.5):
        quad(p, 'windowDim', 'f', -0.6, 0.6, ph - 0.07, ph - 0.065, z, col=WARM)
        p.box('light', -0.5, ph - 0.1, z - 0.15, 0.5, ph - 0.06, z + 0.15)
    for c, nx in ((pa - 0.5, -1), (pe + 0.5, 1)):
        p.box(TIMBER, c + nx * 0.02 - 0.12, 2.5, -0.62, c + nx * 0.02 + 0.12, 3.05, -0.38)
        p.box('windowDim', c - 0.09, 2.56, -0.59, c + 0.09, 2.98, -0.41, col=WARM)
    p.box(STONE_L, pa + 0.3, ph + 1.15, -0.2, pe - 0.3, ph + 2.05, 0.0)
    mark('name', 0, ph + 1.6, -0.21, pe - pa - 0.7, 0.85)
    mark('_pass', 0, ph / 2, 0, pe - pa, ph)
    mark('_yard', (ya + ye) / 2, 0, (za + ze) / 2, ye - ya, ze - za)
    # The courtyard: a tiled floor is the game's; here a lamp post, a hand pump and the doors off it.
    for xo, nx in ((ya, 1), (ye, -1)):
        for z in (za + 3.5, ze - 3.5):
            p.box(TIMBER, min(xo, xo + nx * 0.08), 0, z - 0.6, max(xo, xo + nx * 0.08), 2.3, z + 0.6)
            p.box(STONE_M, min(xo, xo + nx * 0.5), 0, z - 0.9, max(xo, xo + nx * 0.5), 0.15, z + 0.9)
    p.box(TIMBER, -1.0, 0, ze - 0.08, 1.0, 2.5, ze)
    p.box(STONE_L, -1.6, 2.5, ze - 0.3, 1.6, 2.85, ze)
    mark('tenants', 0, 1.6, za + 0.02, 1.6, 1.1, n=(0, 1))
    p.box('flat:#f1ece0', 2.6, 1.0, za - 0.0, 4.2, 2.2, za + 0.06)
    mark('board', 3.4, 1.6, za + 0.07, 1.5, 1.1, n=(0, 1))
    p.cyl(STONE_D, (ya + 1.6, 0.45, ze - 1.8), 1, 0.45, 0.9, seg=10)
    p.box(TIMBER, ya + 1.5, 0.9, ze - 1.9, ya + 1.7, 1.7, ze - 1.7)
    # Roof plant on the back wing.
    p.box('flat:#d9d5c4', 6.0, H, ze + 3.0, 9.5, H + 2.2, ze + 6.5)
    p.box(STONE_M, -12.0, H, ze + 2.0, -7.0, H + 2.6, ze + 6.0)


def tonya(p, s, v, r):
    w, d = TN_W, TN_D
    x0, x1 = -w / 2, w / 2
    hx1, hd, e1, e2 = x1 - 6.5, 13.0, 3.3, 6.4
    # The house: black plaster over a latticed street storey, a deep pent roof, low upper windows, a heavy tiled roof.
    p.box(BLACKP, x0, 0.3, 0, hx1, e2, hd)
    p.box(STONE_D, x0, 0, -0.08, hx1, 0.3, hd)
    n = 8
    bay = (hx1 - x0) / n
    door = 5
    for k in range(n + 1):
        c = x0 + k * bay
        p.box(TIMBER, c - 0.1, 0.3, -0.14, c + 0.1, e1, 0.0)
    for k in range(n):
        a, e = x0 + k * bay + 0.12, x0 + (k + 1) * bay - 0.12
        if k == door:
            p.box('flat:#1a1512', a, 0.3, -0.02, e, 2.9, 0.0)
            for q in range(4):
                xa = a + 0.06 + q * (e - a - 0.12) / 4
                p.box('flat:#27344f', xa, 1.75, -0.2, xa + (e - a - 0.12) / 4 - 0.05, 2.9, -0.17)
            mark('noren', (a + e) / 2, 2.32, -0.21, e - a - 0.15, 1.15)
            continue
        p.box(TIMBER_LT, a, 0.3, -0.05, e, 0.95, 0.0)
        quad(p, 'windowDim', 'f', a, e, 1.0, 2.85, -0.02, col=WARM)
        for q in range(int((e - a) / 0.13)):
            xa = a + q * 0.13
            p.box(TIMBER, xa, 1.0, -0.06, xa + 0.045, 2.85, -0.02)
    p.box(TIMBER, x0, e1 - 0.25, -0.16, hx1, e1, 0.0)
    p.prism(ROOFT, [(0.0, e1 + 0.95), (-1.6, e1 + 0.3), (-1.6, e1 + 0.42), (0.0, e1 + 1.1)], 'x', x0 - 0.1, hx1 + 0.1)
    for k in range(n):
        a, e = x0 + k * bay + 0.5, x0 + (k + 1) * bay - 0.5
        p.box(PLASTER, a, e1 + 1.75, -0.04, e, e2 - 0.6, 0.0)
        for q in range(int((e - a) / 0.22)):
            p.box(BLACKP, a + q * 0.22, e1 + 1.75, -0.07, a + q * 0.22 + 0.1, e2 - 0.6, -0.03)
    gable_x(p, x0, hx1, 0, hd, e2, 3.0, ov=0.7)
    p.box(TIMBER_LT, -3.2, e1 + 1.2, -1.75, 1.2, e1 + 2.2, -1.6)
    mark('kanban', -1.0, e1 + 1.7, -1.76, 4.2, 0.9)
    mark('_house', (x0 + hx1) / 2, 0, hd / 2, hx1 - x0, hd)
    # The side gate to the yard, and the board fence round the lot.
    p.box(TIMBER, hx1, 0, 0, hx1 + 0.2, 2.6, 0.2)
    p.box(TIMBER, x1 - 0.2, 0, 0, x1, 2.6, 0.2)
    p.box(TIMBER_LT, hx1 + 0.2, 0, 0.04, hx1 + 2.0, 2.2, 0.12)
    p.box(TIMBER_LT, hx1 + 4.0, 0, 0.04, x1 - 0.2, 2.2, 0.12)
    p.prism(ROOFT, [(-0.7, 2.6), (0.1, 3.1), (0.9, 2.6), (0.9, 2.72), (0.1, 3.25), (-0.7, 2.72)], 'x', hx1 - 0.3, x1 + 0.3)
    mark('_gate', hx1 + 3.0, 1.1, 0.1, 2.0, 2.2)
    for xa, xb, za_, zb in ((x1 - 0.12, x1, 0.2, d), (x0, x0 + 0.12, hd, d), (x0, x1, d - 0.12, d)):
        p.box(TIMBER_LT, xa, 0, za_, xb, 2.1, zb)
        p.box(TIMBER, xa - 0.03, 2.1, za_ - 0.03, xb + 0.03, 2.2, zb + 0.03)
    # The storehouse: white plaster over a dark tiled dado, a tiled roof, one iron shutter.
    kx0, kx1, kz0, kz1, kh = 1.0, 11.5, 20.0, 31.5, 6.8
    p.box(PLASTER, kx0, 1.6, kz0, kx1, kh, kz1)
    p.box('flat:#3a3d42', kx0 - 0.05, 0, kz0 - 0.05, kx1 + 0.05, 1.6, kz1 + 0.05)
    for q in range(int((kx1 - kx0) / 0.55)):
        p.box(PLASTER, kx0 + q * 0.55, 0.0, kz0 - 0.07, kx0 + q * 0.55 + 0.05, 1.6, kz0 - 0.05)
    for y in (0.5, 1.05):
        p.box(PLASTER, kx0, y, kz0 - 0.07, kx1, y + 0.05, kz0 - 0.05)
    gable_x(p, kx0, kx1, kz0, kz1, kh, 2.6, ov=0.5)
    p.box('flat:#26282b', (kx0 + kx1) / 2 - 0.9, 0, kz0 - 0.2, (kx0 + kx1) / 2 + 0.9, 2.4, kz0 - 0.05)
    p.box(PLASTER, (kx0 + kx1) / 2 - 1.15, 2.4, kz0 - 0.25, (kx0 + kx1) / 2 + 1.15, 2.7, kz0)
    p.box('flat:#26282b', kx0 + 1.6, 4.3, kz0 - 0.12, kx0 + 2.6, 5.4, kz0 - 0.03)
    mark('_kura', (kx0 + kx1) / 2, 0, (kz0 + kz1) / 2, kx1 - kx0, kz1 - kz0)
    mark('crest', kx1 - 2.1, 5.0, kz0 - 0.03, 1.3, 1.3)
    # The yard: a well, bales under a lean-to against the house's back.
    p.cyl(STONE_M, (-6.0, 0.4, 19.0), 1, 0.6, 0.8, seg=10)
    p.box(TIMBER, x0 + 1.0, 2.4, hd, x0 + 7.0, 2.5, hd + 2.4)
    for q in range(4):
        p.box('flat:#e6dfcc', x0 + 1.3 + q * 1.4, 0, hd + 0.3, x0 + 2.5 + q * 1.4, 0.8 + (q % 2) * 0.75, hd + 1.3)


def yashiro(p, s, v, r):
    w, d = YS_W, YS_D
    x0, x1 = -w / 2, w / 2
    g = YS_GATE
    # The fence: stone posts and rails, open at the torii.
    for xa, xb, za_, zb in ((x0, -g, 0, 0.25), (g, x1, 0, 0.25), (x0, x0 + 0.25, 0, d), (x1 - 0.25, x1, 0, d), (x0, x1, d - 0.25, d)):
        p.box(STONE_M, xa, 0, za_, xb, 0.35, zb)
        p.box(STONE_L, xa, 0.75, za_ + 0.06, xb, 0.9, zb - 0.06) if (xb - xa) > 1 else p.box(STONE_L, xa + 0.06, 0.75, za_, xb - 0.06, 0.9, zb)
        n = int(max(xb - xa, zb - za_) / 0.5)
        for k in range(n + 1):
            if (xb - xa) > 1:
                c = xa + k * (xb - xa) / max(1, n)
                p.box(STONE_L, c - 0.08, 0.35, za_ + 0.04, c + 0.08, 1.2, zb - 0.04)
            else:
                c = za_ + k * (zb - za_) / max(1, n)
                p.box(STONE_L, xa + 0.04, 0.35, c - 0.08, xb - 0.04, 1.2, c + 0.08)
    mark('_gate', 0, 0.6, 0, 2 * g, 1.2)
    # The stone torii and its plaque.
    for c in (-2.1, 2.1):
        p.cyl(STONE_L, (c, 2.3, 1.6), 1, 0.26, 4.6, seg=12)
    p.box(STONE_L, -2.9, 3.5, 1.42, 2.9, 3.78, 1.78)
    p.box(STONE_L, -3.4, 4.5, 1.36, 3.4, 4.8, 1.84)
    p.box(STONE_M, -3.6, 4.8, 1.3, 3.6, 4.98, 1.9)
    p.box(TIMBER, -0.35, 3.78, 1.38, 0.35, 4.5, 1.46)
    mark('gaku', 0, 4.14, 1.37, 0.6, 0.66)
    # The approach, lanterns, guardian dogs, the water basin under its roof.
    p.box(STONE_M, -1.5, 0, 0.3, 1.5, 0.03, 21.0)
    for z in (6.0, 13.0):
        for c in (-2.6, 2.6):
            p.box(STONE_M, c - 0.35, 0, z - 0.35, c + 0.35, 0.3, z + 0.35)
            p.cyl(STONE_L, (c, 0.95, z), 1, 0.14, 1.3, seg=8)
            p.box(STONE_L, c - 0.3, 1.6, z - 0.3, c + 0.3, 1.72, z + 0.3)
            p.box('windowDim', c - 0.2, 1.72, z - 0.2, c + 0.2, 2.1, z + 0.2, col=WARM)
            p.box(STONE_M, c - 0.42, 2.1, z - 0.42, c + 0.42, 2.28, z + 0.42)
    mark('_lantern', 2.6, 0, 6.0, 0.7, 0.7)
    for c in (-2.4, 2.4):
        p.box(STONE_M, c - 0.4, 0, 18.3, c + 0.4, 0.8, 19.3)
        p.box(STONE_L, c - 0.28, 0.8, 18.4, c + 0.28, 1.5, 19.2)
    p.box(STONE_D, 6.0, 0, 9.0, 8.0, 0.75, 10.2)
    p.box('flat:#3d6a78', 6.15, 0.7, 9.15, 7.85, 0.76, 10.05)
    for cx in (5.8, 8.2):
        for cz in (8.7, 10.5):
            p.box(TIMBER, cx - 0.07, 0, cz - 0.07, cx + 0.07, 2.3, cz + 0.07)
    gable_x(p, 5.6, 8.4, 8.5, 10.7, 2.3, 0.8, ov=0.4, mat=COPPER)
    mark('_basin', 7.0, 0, 9.6, 2.8, 2.2)
    # The worship hall on its platform, the sanctuary behind, a votive-tablet rack.
    hx0, hx1, hz0, hz1 = -5.0, 5.0, 22.0, 28.5
    p.box(STONE_M, hx0 - 0.8, 0, hz0 - 1.6, hx1 + 0.8, 0.5, hz1 + 0.6)
    for k in range(3):
        p.box(STONE_L, -2.0, 0, hz0 - 2.5 + k * 0.3, 2.0, 0.17 * (k + 1), hz0 - 1.6)
    p.box(TIMBER, hx0, 0.5, hz0, hx1, 3.6, hz1)
    p.box(PLASTER, hx0 - 0.02, 1.5, hz0 + 0.3, hx0, 3.2, hz1 - 0.3)
    p.box(PLASTER, hx1, 1.5, hz0 + 0.3, hx1 + 0.02, 3.2, hz1 - 0.3)
    quad(p, 'windowDim', 'f', -1.6, 1.6, 0.6, 3.0, hz0 - 0.02, col=WARM)
    for q in range(13):
        p.box(TIMBER, -1.6 + q * 0.26, 0.6, hz0 - 0.07, -1.6 + q * 0.26 + 0.07, 3.0, hz0 - 0.02)
    for c in (hx0 + 0.2, -1.8, 1.8, hx1 - 0.2):
        p.box(TIMBER_LT, c - 0.14, 0.5, hz0 - 1.3, c + 0.14, 3.6, hz0 - 1.02)
    gable_x(p, hx0 - 0.3, hx1 + 0.3, hz0 - 1.5, hz1, 3.6, 2.6, ov=0.9, mat=COPPER)
    p.box(TIMBER, -0.9, 0.5, hz0 - 1.0, 0.9, 1.1, hz0 - 0.35)
    p.box(MADDER, -0.6, 2.9, hz0 - 1.34, 0.6, 3.5, hz0 - 1.3)
    mark('_hall', 0, 0, (hz0 - 1.6 + hz1 + 0.6) / 2, hx1 - hx0 + 1.6, hz1 - hz0 + 2.2)
    p.box(TIMBER, -2.0, 0.5, hz1 + 1.0, 2.0, 2.6, hz1 + 3.6)
    gable_x(p, -2.2, 2.2, hz1 + 0.8, hz1 + 3.8, 2.6, 1.3, ov=0.5, mat=COPPER)
    mark('_honden', 0, 0, hz1 + 2.3, 4.0, 2.6)
    for c in (-9.6, -7.2):
        p.box(TIMBER, c - 0.06, 0, 15.94, c + 0.06, 1.9, 16.06)
    p.box(TIMBER, -9.8, 1.0, 15.95, -7.0, 1.08, 16.05)
    p.box(TIMBER, -9.8, 1.6, 15.95, -7.0, 1.68, 16.05)
    p.prism(ROOFT, [(15.6, 1.9), (16.0, 2.15), (16.4, 1.9)], 'x', -10.0, -6.8)
    mark('ema', -8.4, 1.3, 15.93, 2.4, 0.5)
    # A small fox shrine in the corner behind its own red torii.
    for c in (-12.3, -10.9):
        p.box(MADDER, c - 0.07, 0, 23.93, c + 0.07, 2.0, 24.07)
    p.box(MADDER, -12.6, 2.0, 23.9, -10.6, 2.14, 24.1)
    p.box(MADDER, -12.4, 1.6, 23.94, -10.8, 1.7, 24.06)
    p.box(STONE_M, -12.4, 0, 26.0, -10.8, 0.7, 27.4)
    p.box(TIMBER, -12.1, 0.7, 26.2, -11.1, 1.6, 27.2)
    gable_x(p, -12.2, -11.0, 26.1, 27.3, 1.6, 0.5, ov=0.25, mat=COPPER)
    mark('_inari', -11.6, 0, 26.7, 1.6, 1.4)
    mark('yuisho', 9.5, 1.3, 3.0, 1.6, 1.1, n=(-1, 0))
    p.box(TIMBER, 9.55, 0, 2.1, 9.65, 2.0, 2.2)
    p.box(TIMBER, 9.55, 0, 3.8, 9.65, 2.0, 3.9)
    p.box(PLASTER, 9.56, 0.75, 2.2, 9.64, 1.85, 3.8)


def gangi(p, s, v, r):
    """Steps down to the water: z = 0 is the bank's edge, the flight goes down as z grows."""
    hw = v['w'] / 2
    n = 14
    for k in range(n):
        p.box(STONE_M if k % 2 else STONE_L, -hw + 1.0, -3.2, k * 0.32, hw - 1.0, -(k + 1) * 0.2, (k + 1) * 0.32 + 0.02)
    for xa, xb in ((-hw, -hw + 1.0), (hw - 1.0, hw)):
        p.box(STONE_D, xa, -3.2, 0, xb, 0.0, v['d'])
        p.cyl(STONE_D, ((xa + xb) / 2, 0.35, 0.6), 1, 0.16, 0.7, seg=8)
    p.box(TIMBER, -hw + 1.2, -2.86, n * 0.32, hw - 1.2, -2.76, v['d'] + 1.6)
    mark('_steps', 0, 0, v['d'] / 2, v['w'], v['d'])


STYLES = {'court': court, 'tonya': tonya, 'yashiro': yashiro, 'gangi': gangi}
VARIANTS = [
    dict(id='court', style='court', w=CT_W, d=CT_D, h=CT_H, seed=1),
    dict(id='tonya', style='tonya', w=TN_W, d=TN_D, h=9.4, seed=2),
    dict(id='yashiro', style='yashiro', w=YS_W, d=YS_D, h=6.2, seed=3),
    dict(id='gangi', style='gangi', w=12.0, d=4.6, h=0.7, seed=4),
]
for _v in VARIANTS:
    _v['gap'] = 10.0


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(v['seed'] * 131 + 7)
    STYLES[v['style']](body, signs, v, r)
    return body, signs


if __name__ == '__main__':
    run('wata', VARIANTS, build_hi, lambda v: None)
    write_anchors('wata')
