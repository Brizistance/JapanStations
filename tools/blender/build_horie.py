# Builds Minamihorie's street-level set pieces (南堀江, boutiques and cafés by a quiet canal).
#
#   blender --background --python tools/blender/build_horie.py -- [--renders <dir>]
#
# Writes assets/buildings/horie.blend and public/models/buildings/horie.glb.
#
# Frame and helpers: see buildkit.py. One root per piece, horie_<id>, one mesh each. Origins and
# sizes are mirrored in src/stations/minamihorie-street.ts, which adds colliders, zones, lights and
# every name (models carry no text; the clock faces are the game's clock signs).
#
#   bridge      Minamihorie-bashi: a low teal plate-girder bridge, lattice parapets at z = ±ZA over a
#               canal 2·HALF wide, globe lamps on the corner posts. Origin: middle of the road on it.
#   tower       the clock tower, TW square, TH to the clock stage; origin at its centre on the ground.
#   cafe        Café Horie: CW × CD, glazed to the street (front) and to the canal (+x side), doors
#               at CDOOR on the front and SDOOR on the canal side; shell only (walls lined inside).
#   cafe_in     its fittings: counter and machine at the back, a pastry case, four tables, a window bar.
#   terrace     one café table with two chairs under a parasol, centred on its origin.
#   zakka       Kinoha furniture and homewares: ZW × ZD, a timber shop front with a door at ZDOOR.
#   zakka_in    its fittings: wall shelves, a display table, chairs on a low stage, a lamp rail.

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

TEAL = 'flat:#2f7f7a'
TEAL_DK = 'flat:#22605c'
CREAM = 'flat:#ece3ca'
IRON = 'flat:#26292b'
BRASS = 'flat:#b08d3a'
STONE = 'flat:#b9b09c'
STONE_DK = 'flat:#8f877a'
BRICK = 'flat:#8e4a35'
BRICK_2 = 'flat:#7d4030'
COPPER = 'flat:#5f8f7d'
TIMBER = 'flat:#6b4a2e'
TIMBER_LT = 'flat:#a07a52'
OAK = 'flat:#c49a64'
PLASTER = 'flat:#efe9dc'
DARK = 'flat:#1c1a19'
WHITE = 'flat:#f4f1e8'

# Shared with src/stations/minamihorie-street.ts.
HALF, ZA = 7.0, 19.0
TW, TH = 4.6, 13.5
CW, CD, CDOOR, SDOOR = 9.0, 10.0, (1.6, 2.8), (7.2, 8.4)
ZW, ZD, ZDOOR = 8.0, 10.0, (1.2, 2.4)


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


def lamp(p, x, y, z, h=3.2):
    """A cast-iron lamp post with a glass globe."""
    p.cyl(IRON, (x, y + 0.15, z), 1, 0.16, 0.3, seg=10)
    p.cyl(IRON, (x, y + h / 2, z), 1, 0.06, h, seg=8)
    p.cyl(BRASS, (x, y + h, z), 1, 0.1, 0.06, seg=8)
    ball(p, 'light', (x, y + h + 0.25, z), 0.22)
    p.cyl(IRON, (x, y + h + 0.5, z), 1, 0.08, 0.06, seg=8)


# ── Minamihorie-bashi ──

def bridge(p):
    L = HALF + 0.6
    for s in (-1, 1):
        z = s * ZA
        # Granite kerb, teal lattice parapet between square posts with ball finials, a brass top rail.
        p.box(STONE, -L, 0, z - 0.2, L, 0.16, z + 0.2)
        p.box(TEAL, -L, 0.95, z - 0.06, L, 1.05, z + 0.06)
        p.box(BRASS, -L, 1.05, z - 0.04, L, 1.08, z + 0.04)
        p.box(TEAL, -L, 0.16, z - 0.04, L, 0.24, z + 0.04)
        n = 7
        for k in range(n):
            x = -L + 2 * L * k / (n - 1)
            p.box(TEAL_DK, x - 0.1, 0.16, z - 0.1, x + 0.1, 1.15, z + 0.1)
            ball(p, TEAL_DK, (x, 1.24, z), 0.09)
            if k < n - 1:
                xb = -L + 2 * L * (k + 1) / (n - 1)
                # Lattice: crossing flat bars in the panel.
                m = 5
                for j in range(m):
                    xa = x + 0.1 + (xb - x - 0.2) * j / m
                    xc = x + 0.1 + (xb - x - 0.2) * (j + 1) / m
                    for (a, b) in (((xa, 0.24), (xc, 0.95)), ((xc, 0.24), (xa, 0.95))):
                        dx, dy = b[0] - a[0], b[1] - a[1]
                        ln = math.hypot(dx, dy)
                        nx, ny = -dy / ln * 0.015, dx / ln * 0.015
                        p.face(TEAL, [(a[0] - nx, a[1] - ny, z), (b[0] - nx, b[1] - ny, z), (b[0] + nx, b[1] + ny, z), (a[0] + nx, a[1] + ny, z)], (0, 0, -1))
                        p.face(TEAL, [(a[0] + nx, a[1] + ny, z + 0.001), (b[0] + nx, b[1] + ny, z + 0.001), (b[0] - nx, b[1] - ny, z + 0.001), (a[0] - nx, a[1] - ny, z + 0.001)], (0, 0, 1))
        # Corner lamps on stone pedestals.
        for x in (-L, L):
            p.box(STONE_DK, x - 0.3, 0, z - 0.3, x + 0.3, 1.2, z + 0.3)
            p.box(STONE, x - 0.34, 1.2, z - 0.34, x + 0.34, 1.3, z + 0.34)
            lamp(p, x, 1.3, z, 2.4)
        # Seen from the water: a teal plate girder with stiffeners and rivet lines, the shadow under
        # the deck, stone abutments.
        zo = z + s * 0.25
        p.box(TEAL, -L, -1.0, min(z + s * 0.2, zo + s * 0.06), L, 0.0, max(z + s * 0.2, zo + s * 0.06))
        for k in range(15):
            x = -L + 0.5 + (2 * L - 1.0) * k / 14
            p.box(TEAL_DK, x - 0.05, -1.0, min(zo, zo + s * 0.1), x + 0.05, 0.0, max(zo, zo + s * 0.1))
        for y in (-0.92, -0.08):
            p.box(BRASS, -L, y - 0.015, min(zo + s * 0.06, zo + s * 0.08), L, y + 0.015, max(zo + s * 0.06, zo + s * 0.08))
        p.face(DARK, [(-HALF, -3.6, z), (HALF, -3.6, z), (HALF, -1.0, z), (-HALF, -1.0, z)], (0, 0, s))
        for x in (-HALF - 0.3, HALF + 0.3):
            p.box(STONE_DK, x - 0.3, -3.6, min(z, zo + s * 0.3), x + 0.3, -1.0, max(z, zo + s * 0.3))


# ── Clock tower ──

def tower(p):
    h = TW / 2
    # Stone base with an arched doorway on each face, brick shaft with stone bands and pilasters.
    p.box(STONE, -h - 0.2, 0, -h - 0.2, h + 0.2, 2.6, h + 0.2)
    for s in (-1, 1):
        for axis in ('z', 'x'):
            def B(x0, y0, x1, y1, d0, d1, mat):
                if axis == 'z':
                    p.box(mat, x0, y0, min(s * (h + d0), s * (h + d1)), x1, y1, max(s * (h + d0), s * (h + d1)))
                else:
                    p.box(mat, min(s * (h + d0), s * (h + d1)), y0, x0, max(s * (h + d0), s * (h + d1)), y1, x1)
            B(-0.7, 0.0, 0.7, 2.0, 0.2, 0.22, DARK)
            B(-0.85, 2.0, 0.85, 2.25, 0.2, 0.25, STONE_DK)
            # Pilasters at the corners, stone bands, a tall slit window up the shaft.
            B(-h, 2.6, -h + 0.45, TH, 0.0, 0.08, BRICK_2)
            B(h - 0.45, 2.6, h, TH, 0.0, 0.08, BRICK_2)
            for y in (6.0, 9.6):
                B(-h - 0.1, y, h + 0.1, y + 0.25, 0.0, 0.12, STONE)
            B(-0.3, 4.0, 0.3, 8.8, 0.0, 0.02, DARK)
            B(-0.36, 3.94, 0.36, 4.0, 0.0, 0.05, STONE)
            # Clock stage: a stone frame round the face (the face itself is the game's clock sign).
            B(-1.35, TH + 0.15, 1.35, TH + 2.85, 0.1, 0.16, STONE)
            B(-1.15, TH + 0.35, 1.15, TH + 2.65, 0.16, 0.18, DARK)
    p.box(BRICK, -h, 2.6, -h, h, TH, h)
    p.box(STONE, -h - 0.15, TH, -h - 0.15, h + 0.15, TH + 0.15, h + 0.15)
    p.box(BRICK, -h + 0.1, TH + 0.15, -h + 0.1, h - 0.1, TH + 3.0, h - 0.1)
    p.box(STONE, -h - 0.25, TH + 3.0, -h - 0.25, h + 0.25, TH + 3.3, h + 0.25)
    # Copper pyramid roof, a lantern top and a finial.
    r = h + 0.3
    y0, y1 = TH + 3.3, TH + 6.2
    for (a, b, hint) in ((( -r, -r), (r, -r), (0, -1)), ((r, -r), (r, r), (1, 0)), ((r, r), (-r, r), (0, 1)), ((-r, r), (-r, -r), (-1, 0))):
        p.face(COPPER, [(a[0], y0, a[1]), (b[0], y0, b[1]), (b[0] * 0.18, y1, b[1] * 0.18), (a[0] * 0.18, y1, a[1] * 0.18)], (hint[0], 0.6, hint[1]))
    p.box(COPPER, -0.5, y1, -0.5, 0.5, y1 + 0.7, 0.5)
    p.box('light', -0.42, y1 + 0.1, -0.52, 0.42, y1 + 0.55, 0.52)
    p.box('light', -0.52, y1 + 0.1, -0.42, 0.52, y1 + 0.55, 0.42)
    p.box(COPPER, -0.6, y1 + 0.7, -0.6, 0.6, y1 + 0.8, 0.6)
    p.cyl(BRASS, (0, y1 + 1.4, 0), 1, 0.04, 1.2, seg=6)
    ball(p, BRASS, (0, y1 + 1.0, 0), 0.14)


# ── Café Horie ──

def glazed_run(p, axis, at, u0, u1, y0, y1, out, mullion=1.2, door=None):
    """Black steel glazing on a wall plane: kerb, glass, mullions, transom; a doorway left open."""
    def B(a0, b0, a1, b1, d0, d1, mat):
        if axis == 'x':
            p.box(mat, a0, b0, min(at + out * d0, at + out * d1), a1, b1, max(at + out * d0, at + out * d1))
        else:
            p.box(mat, min(at + out * d0, at + out * d1), b0, a0, max(at + out * d0, at + out * d1), b1, a1)
    spans = [(u0, u1)] if not door else [(u0, door[0]), (door[1], u1)]
    for a, b in spans:
        if b - a < 0.05:
            continue
        B(a, y0, b, y0 + 0.4, 0.0, 0.12, IRON)
        B(a, y0 + 0.4, b, y1, 0.04, 0.06, 'glassTint')
        n = max(1, round((b - a) / mullion))
        for k in range(n + 1):
            u = a + (b - a) * k / n
            B(u - 0.03, y0, u + 0.03, y1, 0.0, 0.12, IRON)
    B(u0, y1, u1, y1 + 0.08, 0.0, 0.14, IRON)
    B(u0, y1 - 0.6, u1, y1 - 0.56, 0.0, 0.1, IRON)
    if door:
        B(door[0] - 0.05, y0, door[0], y1, 0.0, 0.14, IRON)
        B(door[1], y0, door[1] + 0.05, y1, 0.0, 0.14, IRON)


def awning(p, axis, at, u0, u1, y, out, cols=(TEAL, CREAM)):
    n = max(2, int((u1 - u0) / 0.45))
    for k in range(n):
        a, b = u0 + (u1 - u0) * k / n, u0 + (u1 - u0) * (k + 1) / n
        if axis == 'x':
            p.face(cols[k % 2], [(a, y, at), (b, y, at), (b, y - 0.5, at + out * 1.2), (a, y - 0.5, at + out * 1.2)], (0, 1, out * 0.4))
            p.face(cols[k % 2], [(a, y - 0.5, at + out * 1.2), (b, y - 0.5, at + out * 1.2), (b, y - 0.75, at + out * 1.2), (a, y - 0.75, at + out * 1.2)], (0, 0, out))
        else:
            p.face(cols[k % 2], [(at, y, a), (at, y, b), (at + out * 1.2, y - 0.5, b), (at + out * 1.2, y - 0.5, a)], (out * 0.4, 1, 0))
            p.face(cols[k % 2], [(at + out * 1.2, y - 0.5, a), (at + out * 1.2, y - 0.5, b), (at + out * 1.2, y - 0.75, b), (at + out * 1.2, y - 0.75, a)], (out, 0, 0))


def cafe(p):
    x0, x1, GF = -CW / 2, CW / 2, 3.4
    # Walls: back and -x side solid (plaster in, cream tile out), front and +x side glazed.
    p.box(CREAM, x0 - 0.2, 0, 0, x0, 7.0, CD + 0.2)
    p.box(CREAM, x0, 0, CD, x1 + 0.2, 7.0, CD + 0.2)
    p.box(PLASTER, x0, 0, CD - 0.02, x1, GF, CD)
    p.box(PLASTER, x0, 0, 0.1, x0 + 0.02, GF, CD)
    glazed_run(p, 'x', 0.0, x0, x1, 0, GF - 0.2, -1, door=CDOOR)
    glazed_run(p, 'z', x1, 0.0, CD, 0, GF - 0.2, 1, door=SDOOR)
    p.box(TEAL, x0 - 0.2, GF - 0.2, -0.1, x1 + 0.2, GF + 0.5, 0.05)
    p.box(TEAL, x1 - 0.05, GF - 0.2, 0.0, x1 + 0.3, GF + 0.5, CD + 0.2)
    p.box(BRASS, x0 - 0.2, GF + 0.5, -0.12, x1 + 0.3, GF + 0.54, 0.06)
    awning(p, 'x', -0.1, x0 + 0.2, x1 - 0.2, GF - 0.25, -1)
    awning(p, 'z', x1 + 0.3, 0.4, CD - 0.4, GF - 0.25, 1)
    # Upper floor: cream tile, steel windows, a parapet with a teal coping.
    p.box(CREAM, x0 - 0.2, GF + 0.54, -0.05, x1 + 0.2, 7.0, 0.0)
    p.box(CREAM, x1, GF + 0.54, 0.0, x1 + 0.2, 7.0, CD)
    for xa in (x0 + 0.6, x0 + 3.4, x0 + 6.2):
        win(p, xa, GF + 1.1, xa + 2.2, GF + 2.9, -0.05, glass=WINDOW_LIT)
    for za in (0.8, 4.0, 7.2):
        p.box(IRON, x1 + 0.2, GF + 1.1, za, x1 + 0.25, GF + 2.9, za + 2.0)
        p.box(WINDOW_LIT, x1 + 0.25, GF + 1.16, za + 0.06, x1 + 0.26, GF + 2.84, za + 1.94)
    p.box(TEAL, x0 - 0.25, 7.0, -0.1, x1 + 0.25, 7.25, CD + 0.25)
    p.box(DARK, x0, GF, 0.0, x1, GF + 0.2, CD)   # the ceiling slab (the game lines it)
    p.box(ROOF, x0, 7.0, 0.0, x1, 7.05, CD)


def cafe_in(p):
    x0, x1 = -CW / 2, CW / 2
    # Floor of oak boards; counter along the back with a brass foot rail and the machine; a pastry case.
    for k in range(int(CD / 0.25)):
        p.box(OAK if k % 2 else 'flat:#b88a55', x0, 0, k * 0.25, x1, 0.03, k * 0.25 + 0.24)
    p.box(TEAL, x0 + 0.4, 0, 7.6, x1 - 2.4, 1.0, 8.2)
    p.box('flat:#e8e4dc', x0 + 0.3, 1.0, 7.5, x1 - 2.3, 1.05, 8.3)
    p.box(BRASS, x0 + 0.4, 0.15, 7.5, x1 - 2.4, 0.19, 7.54)
    p.box('flat:#c9ccd0', x0 + 1.0, 1.05, 7.8, x0 + 1.8, 1.55, 8.2)
    p.box(DARK, x0 + 1.05, 1.15, 7.78, x0 + 1.75, 1.3, 7.8)
    p.box('glassTint', x0 + 2.4, 1.05, 7.6, x0 + 3.8, 1.5, 8.2)
    for k in range(4):
        p.box(['flat:#c98a4b', 'flat:#e9b7c4', 'flat:#f2d16b', 'flat:#8a5a2b'][k], x0 + 2.5 + k * 0.33, 1.1, 7.75, x0 + 2.75 + k * 0.33, 1.2, 8.05)
    p.box(TIMBER, x0 + 0.3, 1.6, CD - 0.35, x1 - 0.3, 1.64, CD - 0.05)
    p.box(TIMBER, x0 + 0.3, 2.1, CD - 0.35, x1 - 0.3, 2.14, CD - 0.05)
    for k in range(18):
        x = x0 + 0.5 + k * 0.42
        p.box(['flat:#e8e2d0', 'flat:#2f7f7a', 'flat:#8a5a2b'][k % 3], x, 1.64, CD - 0.3, x + 0.22, 1.86, CD - 0.1)
    # Four round tables with two chairs each.
    for (tx, tz) in ((x0 + 1.5, 2.0), (x0 + 1.5, 4.8), (x0 + 4.2, 2.0), (x0 + 4.2, 4.8)):
        p.cyl('flat:#f4f1e8', (tx, 0.74, tz), 1, 0.38, 0.03, seg=14)
        p.cyl(IRON, (tx, 0.37, tz), 1, 0.04, 0.72, seg=6)
        p.cyl(IRON, (tx, 0.02, tz), 1, 0.22, 0.03, seg=10)
        for dz in (-0.6, 0.6):
            p.box(TIMBER, tx - 0.2, 0.44, tz + dz - 0.2, tx + 0.2, 0.48, tz + dz + 0.2)
            p.box(TIMBER, tx - 0.2, 0.48, tz + dz + (0.18 if dz > 0 else -0.2), tx + 0.2, 0.9, tz + dz + (0.2 if dz > 0 else -0.18))
            for ox in (-0.17, 0.17):
                for oz in (-0.17, 0.17):
                    p.box(IRON, tx + ox - 0.015, 0.0, tz + dz + oz - 0.015, tx + ox + 0.015, 0.44, tz + dz + oz + 0.015)
    # A window bar along the canal glass with four stools.
    p.box(OAK, x1 - 0.55, 1.0, 0.6, x1 - 0.1, 1.05, 6.6)
    for k in range(4):
        z = 1.2 + k * 1.5
        p.cyl(TIMBER, (x1 - 0.85, 0.72, z), 1, 0.18, 0.05, seg=10)
        p.cyl(IRON, (x1 - 0.85, 0.36, z), 1, 0.03, 0.7, seg=6)
    # Pendant fittings (the shades are lit by the game).
    for (tx, tz) in ((x0 + 1.5, 3.4), (x0 + 4.2, 3.4), (x0 + 2.6, 7.9)):
        p.cyl(IRON, (tx, 3.0, tz), 1, 0.01, 0.4, seg=4)


def terrace(p):
    p.cyl('flat:#f4f1e8', (0, 0.74, 0), 1, 0.4, 0.03, seg=14)
    p.cyl(IRON, (0, 0.37, 0), 1, 0.035, 0.72, seg=6)
    p.cyl(IRON, (0, 1.4, 0), 1, 0.025, 2.0, seg=6)
    # Parasol: teal and cream gores.
    n = 8
    for k in range(n):
        a, b = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
        p.face(TEAL if k % 2 else CREAM, [(0, 2.45, 0), (1.3 * math.cos(b), 2.05, 1.3 * math.sin(b)), (1.3 * math.cos(a), 2.05, 1.3 * math.sin(a))], (0, 1, 0))
        p.face(TEAL if k % 2 else CREAM, [(0, 2.44, 0), (1.3 * math.cos(a), 2.04, 1.3 * math.sin(a)), (1.3 * math.cos(b), 2.04, 1.3 * math.sin(b))], (0, -1, 0))
    for dx in (-0.65, 0.65):
        p.box(TIMBER, dx - 0.2, 0.44, -0.2, dx + 0.2, 0.48, 0.2)
        bx = dx + (0.18 if dx > 0 else -0.2)
        p.box(TIMBER, bx, 0.48, -0.2, bx + 0.02, 0.9, 0.2)
        for ox in (-0.17, 0.17):
            for oz in (-0.17, 0.17):
                p.box(IRON, dx + ox - 0.015, 0.0, oz - 0.015, dx + ox + 0.015, 0.44, oz + 0.015)


# ── Kinoha furniture and homewares ──

def zakka(p):
    x0, x1, GF = -ZW / 2, ZW / 2, 3.3
    for x in (x0 - 0.2, x1):
        p.box(PLASTER, x, 0, 0, x + 0.2, 6.6, ZD + 0.2)
    p.box('flat:#d6cbb6', x0, 0, ZD, x1, 6.6, ZD + 0.2)
    p.box(WHITE, x0, 0, ZD - 0.02, x1, GF, ZD)
    for x in (x0, x1 - 0.02):
        p.box(WHITE, x, 0, 0.1, x + 0.02, GF, ZD)
    # Timber shop front: an oak frame, tall glass, the door, a fascia board for the name, a canvas awning.
    glazed_run(p, 'x', 0.0, x0, x1, 0, GF - 0.3, -1, mullion=1.4, door=ZDOOR)
    for x in (x0, x1 - 0.2):
        p.box(OAK, x, 0, -0.16, x + 0.2, GF + 0.6, 0.0)
    p.box(OAK, x0, GF - 0.3, -0.16, x1, GF + 0.6, 0.0)
    p.box(TIMBER, x0 + 0.6, GF + 0.0, -0.2, x1 - 0.6, GF + 0.5, -0.16)
    awning(p, 'x', -0.16, x0 + 0.3, x1 - 0.3, GF - 0.35, -1, cols=('flat:#d9cfb8', 'flat:#cfc3a8'))
    # Upper floor: white render, a wide timber-framed window, plants on the sill.
    p.box(PLASTER, x0 - 0.2, GF + 0.6, -0.05, x1 + 0.2, 6.6, 0.0)
    p.box(OAK, x0 + 0.8, GF + 1.2, -0.12, x1 - 0.8, GF + 2.8, -0.05)
    p.box(WINDOW_LIT, x0 + 0.9, GF + 1.3, -0.13, x1 - 0.9, GF + 2.7, -0.12)
    for k in range(5):
        x = x0 + 1.2 + k * 1.3
        p.box('flat:#8a5a2b', x - 0.15, GF + 1.2, -0.4, x + 0.15, GF + 1.45, -0.12)
        ball(p, 'flat:#4f8f45', (x, GF + 1.62, -0.26), 0.22)
    p.box('flat:#3a3d41', x0 - 0.25, 6.6, -0.1, x1 + 0.25, 6.8, ZD + 0.25)
    p.box(DARK, x0, GF, 0.0, x1, GF + 0.2, ZD)


def zakka_in(p):
    x0, x1 = -ZW / 2, ZW / 2
    for k in range(int(ZD / 0.3)):
        p.box(OAK if k % 2 else 'flat:#b88a55', x0, 0, k * 0.3, x1, 0.03, k * 0.3 + 0.29)
    # Wall shelves of homewares down both sides and across the back.
    for (a, b, side) in ((0.8, ZD - 0.4, -1), (0.8, ZD - 0.4, 1)):
        x = x0 + 0.02 if side < 0 else x1 - 0.42
        for y in (0.5, 1.1, 1.7, 2.3):
            p.box(OAK, x, y, a, x + 0.4, y + 0.04, b)
            k = 0
            z = a + 0.15
            while z < b - 0.3:
                c = ['flat:#e8e2d0', 'flat:#2f7f7a', 'flat:#c98a4b', 'flat:#d9cfb8', 'flat:#8e5ea2', 'flat:#3c3f42'][(k + int(y * 3)) % 6]
                p.box(c, x + 0.08, y + 0.04, z, x + 0.32, y + 0.04 + 0.18 + 0.1 * (k % 3), z + 0.22)
                z += 0.38
                k += 1
    p.box(OAK, x0 + 0.5, 0, ZD - 0.42, x1 - 0.5, 2.6, ZD - 0.02)
    # Display table in the middle with lamps and bowls on it.
    p.box(OAK, -1.1, 0.72, 2.6, 1.1, 0.78, 4.6)
    for (tx, tz) in ((-1.0, 2.7), (1.0, 2.7), (-1.0, 4.5), (1.0, 4.5)):
        p.box(TIMBER, tx - 0.04, 0.0, tz - 0.04, tx + 0.04, 0.72, tz + 0.04)
    for k, (tx, tz) in enumerate(((-0.6, 3.2), (0.3, 3.0), (0.7, 4.1), (-0.4, 4.2))):
        p.cyl(['flat:#e8e2d0', 'flat:#2f7f7a', 'flat:#c98a4b', 'flat:#3c3f42'][k], (tx, 0.86, tz), 1, 0.16, 0.16, seg=10)
    # Chairs on a low stage at the back: four different designs.
    p.box('flat:#d9cfb8', -2.2, 0.0, 6.4, 2.2, 0.2, 8.4)
    for k in range(4):
        cx = -1.6 + k * 1.05
        seat = ['flat:#2f7f7a', TIMBER, 'flat:#c98a4b', 'flat:#3c3f42'][k]
        p.box(seat, cx - 0.22, 0.62, 7.2, cx + 0.22, 0.66, 7.64)
        p.box(seat, cx - 0.22, 0.66, 7.6, cx + 0.22, 1.1 + 0.08 * (k % 2), 7.64)
        for ox in (-0.19, 0.19):
            for oz in (7.24, 7.6):
                p.box(TIMBER if k != 3 else IRON, cx + ox - 0.02, 0.2, oz - 0.02, cx + ox + 0.02, 0.62, oz + 0.02)
    # A lamp rail along the ceiling (the shades are lit by the game).
    p.box(IRON, -0.02, 3.25, 1.0, 0.02, 3.29, ZD - 1.0)


PROPS = {
    'bridge': (bridge, 2 * HALF + 4), 'tower': (tower, TW + 2), 'cafe': (cafe, CW + 2), 'cafe_in': (cafe_in, CW + 2),
    'terrace': (terrace, 3), 'zakka': (zakka, ZW + 2), 'zakka_in': (zakka_in, ZW + 2),
}


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('horie', [dict(id=k, w=w, gap=3.0) for k, (_, w) in PROPS.items()], build_hi, lambda v: None)
