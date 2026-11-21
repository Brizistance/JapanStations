# Builds Kaiseichō's street-level set pieces (開成町, the Meiji school town).
#
#   blender --background --python tools/blender/build_kaisei.py -- [--renders <dir>]
#
# Writes assets/buildings/kaisei.blend and public/models/buildings/kaisei.glb.
#
# Frame and helpers: see buildkit.py. One root per piece, kaisei_<id>, one mesh each. Sizes are
# mirrored in src/stations/kaiseicho-street.ts, which adds colliders, trees, lights and every name
# (models carry no text; the tower's clock faces are the game's clock signs).
#
#   school    Kawaminato Daiichi High School on its lot, SCW wide (x = ±SCW/2) and SCD deep: a brick
#             wall with a stone coping along the front, stone gateposts at x = ±GATE with the iron
#             gates swung open, a gravel forecourt, and the 1902 red-brick main building from z = BZ0
#             to BZ1 (two storeys, stone bands, tall windows, a hipped slate roof), its porch at the
#             middle and a clock tower over it (clock stage at y = CLK, faces CLK_W square).
#   shop      Gakurindō Stationery, SW × SD: a two-storey timber shop-house, a glazed front with a
#             door at x = SDOOR, a copper-clad upper storey, a tiled pent eave.

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

BRICK = 'flat:#a4553e'
BRICK_DK = 'flat:#8a4532'
STONE = 'flat:#e4dccb'
STONE_DK = 'flat:#bcb3a1'
SLATE = 'flat:#3f454d'
SLATE_DK = 'flat:#2f343b'
COPPER = 'flat:#5f8f7d'
IRON = 'flat:#26292b'
GRAVEL = 'flat:#c9c1ad'
TIMBER = 'flat:#5a3f2a'
TIMBER_LT = 'flat:#8a6440'
PLASTER = 'flat:#efe9dc'
WHITE = 'flat:#f4f1e8'
GREEN = 'flat:#1f3d2e'

# Shared with src/stations/kaiseicho-street.ts.
SCW, SCD, GATE = 40.0, 26.0, 2.6
BZ0, BZ1, BW, BH = 10.0, 23.0, 34.0, 9.4
TW, CLK, CLK_W = 4.4, 14.2, 2.0
SW, SD, SDOOR = 7.0, 10.0, 2.0


def win_arch(p, x, y0, y1, z, w=1.1, out=-1):
    """A tall window with a stone sill and lintel, set in a brick face at z (facing out)."""
    p.box(STONE, x - w / 2 - 0.12, y0 - 0.14, z + out * 0.06, x + w / 2 + 0.12, y0, z)
    p.box(FRAME, x - w / 2, y0, z + out * 0.01, x + w / 2, y1, z - out * 0.04)
    p.box(WINDOW, x - w / 2 + 0.06, y0 + 0.06, z + out * 0.015, x + w / 2 - 0.06, y1 - 0.06, z)
    p.box(FRAME, x - 0.025, y0 + 0.06, z + out * 0.02, x + 0.025, y1 - 0.06, z + out * 0.015)
    p.box(FRAME, x - w / 2 + 0.06, (y0 + y1) / 2 + 0.2, z + out * 0.02, x + w / 2 - 0.06, (y0 + y1) / 2 + 0.25, z + out * 0.015)
    # A segmental stone head with a keystone.
    p.box(STONE, x - w / 2 - 0.1, y1, z + out * 0.05, x + w / 2 + 0.1, y1 + 0.22, z)
    p.box(STONE_DK, x - 0.1, y1, z + out * 0.08, x + 0.1, y1 + 0.32, z)


def hip(p, mat, x0, x1, z0, z1, y, h):
    """A hipped roof over x0..x1 × z0..z1 from eaves at y up h (ridge along the longer axis)."""
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    if x1 - x0 >= z1 - z0:
        r = (z1 - z0) / 2
        a, c = (x0 + r, y + h), (x1 - r, y + h)
        top = [(a[0], y + h, cz), (c[0], y + h, cz)]
        p.face(mat, [(x0, y, z0), (x1, y, z0), top[1], top[0]], (0, 1, -1))
        p.face(mat, [(x1, y, z1), (x0, y, z1), top[0], top[1]], (0, 1, 1))
        p.face(mat, [(x0, y, z1), (x0, y, z0), top[0]], (-1, 1, 0))
        p.face(mat, [(x1, y, z0), (x1, y, z1), top[1]], (1, 1, 0))
    else:
        r = (x1 - x0) / 2
        top = [(cx, y + h, z0 + r), (cx, y + h, z1 - r)]
        p.face(mat, [(x0, y, z1), (x0, y, z0), top[0], top[1]], (-1, 1, 0))
        p.face(mat, [(x1, y, z0), (x1, y, z1), top[1], top[0]], (1, 1, 0))
        p.face(mat, [(x0, y, z0), (x1, y, z0), top[0]], (0, 1, -1))
        p.face(mat, [(x1, y, z1), (x0, y, z1), top[1]], (0, 1, 1))


def school(p):
    X = SCW / 2
    # ── The front wall, its coping, piers every 4 m, and the gateway ──
    for s in (-1, 1):
        a, b = s * (GATE + 0.45), s * X
        lo, hi = min(a, b), max(a, b)
        p.box(BRICK, lo, 0, 0, hi, 1.75, 0.35)
        p.box(STONE, lo - 0.03, 1.75, -0.05, hi + 0.03, 1.88, 0.4)
        x = lo
        while x <= hi + 0.01:
            p.box(BRICK_DK, x - 0.22, 0, -0.06, x + 0.22, 2.05, 0.41)
            p.box(STONE, x - 0.26, 2.05, -0.1, x + 0.26, 2.15, 0.45)
            x += 4.0
        # Side walls back to the building and on to the lot's back.
        p.box(BRICK, s * X - 0.35 * s, 0, 0, s * X, 1.75, SCD)
        p.box(STONE, min(s * X, s * (X - 0.35)) - 0.03, 1.75, 0, max(s * X, s * (X - 0.35)) + 0.03, 1.88, SCD)
        # Stone gateposts with a lamp on each, iron gates swung back against the wall.
        gx = s * GATE
        p.box(STONE_DK, gx - 0.45, 0, -0.45, gx + 0.45, 0.3, 0.45)
        p.box(STONE, gx - 0.38, 0.3, -0.38, gx + 0.38, 2.9, 0.38)
        p.box(STONE_DK, gx - 0.46, 2.9, -0.46, gx + 0.46, 3.1, 0.46)
        p.cyl(IRON, (gx, 3.2, 0), 1, 0.07, 0.2, seg=8)
        p.box('light', gx - 0.2, 3.3, -0.2, gx + 0.2, 3.75, 0.2)
        p.box(IRON, gx - 0.24, 3.75, -0.24, gx + 0.24, 3.82, 0.24)
        # The plate's stone panel on the road face (the game writes the school's name on it).
        p.box(WHITE, gx - 0.3, 1.0, -0.42, gx + 0.3, 2.6, -0.38)
        ga = gx - s * 0.4
        gb = ga - s * 0.05
        for k in range(9):
            zz = 0.4 + k * 0.25
            p.box(IRON, min(ga, gb), 0.1, zz - 0.015, max(ga, gb), 1.9, zz + 0.015)
        p.box(IRON, min(ga, gb), 1.85, 0.35, max(ga, gb), 1.95, 2.5)
        p.box(IRON, min(ga, gb), 0.1, 0.35, max(ga, gb), 0.2, 2.5)
    # Gravel forecourt with a paved path to the porch.
    p.box(GRAVEL, -X + 0.35, 0, 0.35, X - 0.35, 0.03, BZ0)
    p.box(STONE_DK, -1.6, 0.03, 0.0, 1.6, 0.05, BZ0)
    # ── The main building ──
    x0, x1 = -BW / 2, BW / 2
    p.box(BRICK, x0, 0, BZ0, x1, BH, BZ1)
    p.box(STONE_DK, x0 - 0.08, 0, BZ0 - 0.08, x1 + 0.08, 0.7, BZ1 + 0.08)
    for y in (4.3, BH - 0.35):
        p.box(STONE, x0 - 0.06, y, BZ0 - 0.06, x1 + 0.06, y + 0.3, BZ1 + 0.06)
    # Brick pilasters at the ends, tall windows in pairs on both floors.
    for xe in (x0, x1 - 0.7):
        p.box(BRICK_DK, xe, 0.7, BZ0 - 0.12, xe + 0.7, BH, BZ0)
    xs = [x for x in [x0 + 2.0 + k * 2.4 for k in range(14)] if abs(x) > 3.6 and x < x1 - 1.6]
    for x in xs:
        win_arch(p, x, 1.3, 3.6, BZ0)
        win_arch(p, x, 5.2, 7.9, BZ0)
    # Side and back windows.
    for s in (-1, 1):
        for z in (BZ0 + 3, BZ0 + 6.5, BZ0 + 10):
            for (y0, y1) in ((1.3, 3.6), (5.2, 7.9)):
                xw = s * (BW / 2)
                p.box(FRAME, xw - 0.04 * s, y0, z - 0.55, xw + 0.01 * s, y1, z + 0.55)
                p.box(WINDOW, xw + 0.0, y0 + 0.06, z - 0.49, xw + 0.015 * s, y1 - 0.06, z + 0.49)
    for x in xs[::2]:
        win_arch(p, x, 5.2, 7.9, BZ1, out=1)
    # Hipped slate roof with dormers and chimneys.
    p.box(STONE, x0 - 0.3, BH, BZ0 - 0.3, x1 + 0.3, BH + 0.2, BZ1 + 0.3)
    hip(p, SLATE, x0 - 0.3, x1 + 0.3, BZ0 - 0.3, BZ1 + 0.3, BH + 0.2, 4.2)
    for x in (x0 + 6, x1 - 6):
        p.box(PLASTER, x - 0.8, BH + 0.4, BZ0 + 0.6, x + 0.8, BH + 1.8, BZ0 + 2.2)
        p.box(WINDOW, x - 0.55, BH + 0.6, BZ0 + 0.58, x + 0.55, BH + 1.6, BZ0 + 0.6)
        p.prism(SLATE_DK, [(x - 1.0, BH + 1.8), (x + 1.0, BH + 1.8), (x, BH + 2.5)], 'z', BZ0 + 0.4, BZ0 + 2.6)
    for x in (x0 + 3, x1 - 3):
        p.box(BRICK_DK, x - 0.4, BH + 2.0, BZ0 + 5, x + 0.4, BH + 4.8, BZ0 + 5.8)
        p.box(STONE, x - 0.48, BH + 4.8, BZ0 + 4.92, x + 0.48, BH + 5.0, BZ0 + 5.88)
    # ── The porch, the pavilion and the clock tower ──
    pw = 3.4
    p.box(BRICK, -pw, 0, BZ0 - 1.4, pw, BH + 0.6, BZ0)
    p.box(STONE, -pw - 0.1, 4.3, BZ0 - 1.5, pw + 0.1, 4.6, BZ0)
    p.box(STONE, -pw - 0.15, BH + 0.6, BZ0 - 1.6, pw + 0.15, BH + 0.85, BZ0)
    p.prism(STONE, [(-pw - 0.2, BH + 0.85), (pw + 0.2, BH + 0.85), (0, BH + 2.3)], 'z', BZ0 - 1.65, BZ0 - 1.4)
    p.prism(SLATE, [(-pw - 0.4, BH + 0.85), (pw + 0.4, BH + 0.85), (0, BH + 2.5)], 'z', BZ0 - 1.4, BZ0 + 1.0)
    # The porch: a stone portico on four columns, the doors under an arch, steps up.
    p.box(STONE, -pw, 0, BZ0 - 4.2, pw, 0.45, BZ0 - 1.4)
    p.box(STONE_DK, -pw + 0.4, 0, BZ0 - 4.8, pw - 0.4, 0.22, BZ0 - 4.2)
    for x in (-pw + 0.4, -1.2, 1.2, pw - 0.4):
        p.cyl(STONE, (x, 0.45 + 1.7, BZ0 - 3.9), 1, 0.22, 3.4, seg=12)
        p.box(STONE_DK, x - 0.3, 3.85, BZ0 - 4.2, x + 0.3, 4.0, BZ0 - 3.6)
    p.box(STONE, -pw, 4.0, BZ0 - 4.3, pw, 4.6, BZ0 - 1.4)
    p.box(STONE_DK, -pw - 0.05, 4.6, BZ0 - 4.35, pw + 0.05, 4.7, BZ0 - 1.4)
    p.box(TIMBER, -1.0, 0.45, BZ0 - 1.44, 1.0, 3.2, BZ0 - 1.4)
    p.box(STONE, -1.25, 3.2, BZ0 - 1.47, 1.25, 3.5, BZ0 - 1.4)
    p.box('light', -0.35, 3.6, BZ0 - 1.46, 0.35, 3.85, BZ0 - 1.42)
    win_arch(p, -2.2, 5.2, 7.9, BZ0 - 1.4)
    win_arch(p, 2.2, 5.2, 7.9, BZ0 - 1.4)
    win_arch(p, 0, 5.2, 7.9, BZ0 - 1.4)
    # The tower: brick shaft over the pavilion's roof, a stone clock stage, a copper cap and finial.
    tz = BZ0 + 0.8
    h = TW / 2
    p.box(BRICK, -h, BH, tz - h, h, CLK - 1.3, tz + h)
    for y in (BH + 2.0, CLK - 1.5):
        p.box(STONE, -h - 0.05, y, tz - h - 0.05, h + 0.05, y + 0.2, tz + h + 0.05)
    p.box(STONE, -h - 0.15, CLK - 1.3, tz - h - 0.15, h + 0.15, CLK + 1.3, tz + h + 0.15)
    p.box(STONE_DK, -h - 0.3, CLK + 1.3, tz - h - 0.3, h + 0.3, CLK + 1.55, tz + h + 0.3)
    for s in (-1, 1):
        for (ax, az) in ((s * (h + 0.16), tz), (0, tz + s * (h + 0.16))):
            # Dark rings round where the game's clock faces sit.
            if ax:
                p.box(IRON, ax - 0.02 * s, CLK - CLK_W / 2 - 0.08, az - CLK_W / 2 - 0.08, ax + 0.0, CLK + CLK_W / 2 + 0.08, az + CLK_W / 2 + 0.08)
            else:
                p.box(IRON, ax - CLK_W / 2 - 0.08, CLK - CLK_W / 2 - 0.08, az - 0.02 * s, ax + CLK_W / 2 + 0.08, CLK + CLK_W / 2 + 0.08, az)
    hip(p, COPPER, -h - 0.3, h + 0.3, tz - h - 0.3, tz + h + 0.3, CLK + 1.55, 2.6)
    p.cyl(IRON, (0, CLK + 4.6, tz), 1, 0.04, 1.4, seg=6)
    ball(p, 'flat:#c9a227', (0, CLK + 4.25, tz), 0.14)


def ball(p, mat, c, r, seg=10, rings=6):
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


def shop(p):
    X = SW / 2
    # Ground floor: a timber front with glazing, the door at SDOOR, a fascia board for the name.
    p.box(PLASTER, -X, 0, 0.3, X, 3.4, SD)
    p.box(TIMBER, -X, 0, 0, -X + 0.25, 3.4, 0.35)
    p.box(TIMBER, X - 0.25, 0, 0, X, 3.4, 0.35)
    p.box(TIMBER, -X, 0, 0.0, X, 0.45, 0.32)
    p.box(TIMBER, -X, 2.55, -0.04, X, 3.4, 0.32)
    for x0, x1 in ((-X + 0.25, SDOOR - 0.55), (SDOOR + 0.55, X - 0.25)):
        p.box(SHOPGLASS, x0, 0.45, 0.2, x1, 2.55, 0.22)
        n = max(1, int((x1 - x0) / 0.8))
        for k in range(1, n):
            xm = x0 + (x1 - x0) * k / n
            p.box(TIMBER, xm - 0.03, 0.45, 0.16, xm + 0.03, 2.55, 0.22)
        p.box(TIMBER, x0, 1.9, 0.16, x1, 1.95, 0.22)
        p.box('light', x0 + 0.1, 2.4, 0.22, x1 - 0.1, 2.5, 0.5)
    p.box(TIMBER, SDOOR - 0.55, 0.0, 0.18, SDOOR - 0.5, 2.55, 0.32)
    p.box(TIMBER, SDOOR + 0.5, 0.0, 0.18, SDOOR + 0.55, 2.55, 0.32)
    p.box('glassTint', SDOOR - 0.5, 0.0, 0.26, SDOOR + 0.5, 2.3, 0.28)
    p.box(TIMBER, SDOOR - 0.5, 2.3, 0.2, SDOOR + 0.5, 2.55, 0.3)
    # A tiled pent eave, the copper-clad upper floor with two windows, a parapet.
    p.face(SLATE, [(-X - 0.2, 3.4, -0.7), (X + 0.2, 3.4, -0.7), (X + 0.2, 3.9, 0.3), (-X - 0.2, 3.9, 0.3)], (0, 1, -0.5))
    p.box(SLATE_DK, -X - 0.2, 3.32, -0.75, X + 0.2, 3.42, -0.65)
    p.box(COPPER, -X, 3.4, 0.3, X, 7.2, SD)
    y = 3.9
    while y < 7.1:
        p.box('flat:#527d6c', -X - 0.005, y, 0.29, X + 0.005, y + 0.03, 0.3)
        y += 0.4
    for x in (-1.6, 1.6):
        p.box(FRAME, x - 0.8, 4.4, 0.26, x + 0.8, 6.0, 0.3)
        p.box(WINDOW, x - 0.72, 4.48, 0.25, x + 0.72, 5.92, 0.26)
        for k in range(1, 4):
            p.box(FRAME, x - 0.72 + 1.44 * k / 4 - 0.015, 4.48, 0.24, x - 0.72 + 1.44 * k / 4 + 0.015, 5.92, 0.25)
    p.box(COPPER, -X - 0.05, 7.2, 0.25, X + 0.05, 7.7, SD + 0.05)
    p.box('flat:#456e5f', -X - 0.1, 7.7, 0.2, X + 0.1, 7.8, SD + 0.1)
    p.box(ROOF, -X, 7.2, 0.4, X, 7.25, SD)
    # A pen-and-ink sign board hung out from the corner (lettered by the game).
    p.box(IRON, X - 0.45, 4.2, -0.9, X - 0.4, 4.25, 0.3)
    p.box(TIMBER, X - 0.47, 3.0, -0.9, X - 0.38, 4.2, -0.3)


PROPS = {'school': (school, SCW + 2), 'shop': (shop, SW + 2)}


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('kaisei', [dict(id=k, w=w, gap=3.0) for k, (_, w) in PROPS.items()], build_hi, lambda v: None)
