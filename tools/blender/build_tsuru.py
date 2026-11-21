# Builds Tsurumatsu's street-level set pieces (鶴松, the old town's covered shopping street).
#
#   blender --background --python tools/blender/build_tsuru.py -- [--renders <dir>]
#
# Writes assets/buildings/tsuru.blend and public/models/buildings/tsuru.glb.
#
# Frame and helpers: see buildkit.py. One root per piece, tsuru_<id>, one mesh each. Sizes are
# mirrored in src/stations/tsurumatsu-street.ts, which adds colliders, lights and every name
# (models carry no text).
#
#   gate      the shōtengai gate at the arcade mouth: two posts at x = ±GX, a name board from GB0 to
#             GB1 across them, a crest with a crane on top. Front (to the road) at z = 0.
#   roof      one bay of the arcade roof, BAY long from z = 0: vermilion posts at x = ±RX on z = 0,
#             eave beams, an arched glazed roof on steel ribs, lanterns and pennants down the middle.
#   row_a/b/c one side of the arcade, ROW long (x = -ROW/2 … ROW/2), front at z = 0 facing -z, ROW_D
#             deep: two small shop fronts under striped awnings, a storey of flat above each.
#   sento     Tsuru-no-yu, the public bath: SW × SD, a karahafu porch on the front at the middle,
#             glass doors at z = SDOOR_Z, an irimoya-style tiled hall roof, the boiler house and its
#             chimney (CH_X, CH_Z, CH_H) at the back right.

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

VERM = 'flat:#b9482b'
VERM_DK = 'flat:#8f3420'
CREAM = 'flat:#efe3c4'
WHITE = 'flat:#f4f1e6'
IRON = 'flat:#2b2d30'
STEEL_G = 'flat:#7f868c'
TILE_ROOF = 'flat:#3d4148'
TILE_DK = 'flat:#2c2f35'
PLASTER = 'flat:#ece6d6'
TIMBER = 'flat:#5a3f2a'
TIMBER_LT = 'flat:#8a6440'
BRICK = 'flat:#8e4a35'
CONC_L = 'flat:#b5b1a6'
NAVY = 'flat:#1f3f66'
GREEN = 'flat:#5f8f7b'

# Shared with src/stations/tsurumatsu-street.ts.
GX, GH, GB0, GB1 = 6.3, 9.2, 7.0, 8.7
BAY, RX, EAVE, CROWN = 8.0, 6.0, 7.0, 8.6
ROW, ROW_D = 8.0, 0.45
SW, SD, SDOOR_Z = 14.0, 18.0, 2.0
CH_X, CH_Z, CH_H = 4.6, 15.6, 22.0


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


def quad2(p, mat, pts, hint):
    """A panel seen from both sides."""
    p.face(mat, pts, hint)
    p.face(mat, list(reversed(pts)), tuple(-h for h in hint))


def arch_y(x):
    t = x / RX
    return EAVE + 0.15 + (CROWN - EAVE - 0.15) * (1 - t * t)


def crane(p, x, y, z, s=1.0):
    """A tanchō crane in flight, flat, facing ±z: white body and wings, black neck tips, a red crown."""
    p.box(WHITE, x - 0.55 * s, y - 0.12 * s, z - 0.05, x + 0.35 * s, y + 0.12 * s, z + 0.05)
    for sgn in (-1, 1):
        # Wings swept up, black at the tips.
        p.face(WHITE, [(x - 0.2 * s, y, z - 0.06 * sgn), (x + 0.2 * s, y, z - 0.06 * sgn), (x + 0.5 * s, y + 0.9 * s, z - 0.06 * sgn), (x - 0.5 * s, y + 0.75 * s, z - 0.06 * sgn)], (0, 0, -sgn))
    p.box(IRON, x - 0.5 * s, y + 0.62 * s, z - 0.07, x + 0.5 * s, y + 0.9 * s, z + 0.07)
    p.box(IRON, x + 0.35 * s, y - 0.04 * s, z - 0.04, x + 0.85 * s, y + 0.06 * s, z + 0.04)
    p.box('flat:#c62828', x + 0.72 * s, y + 0.06 * s, z - 0.045, x + 0.84 * s, y + 0.12 * s, z + 0.045)
    p.box(WHITE, x - 0.9 * s, y - 0.05 * s, z - 0.03, x - 0.55 * s, y + 0.02 * s, z + 0.03)


# ── The gate ─────────────────────────────────────────────────────────────────────────────────

def gate(p):
    # Posts: cream with vermilion bands, a dark plinth, a lamp bracket on the road face.
    for x in (-GX, GX):
        p.box(IRON, x - 0.42, 0, -0.42, x + 0.42, 0.5, 0.42)
        p.box(CREAM, x - 0.34, 0.5, -0.34, x + 0.34, GB0, 0.34)
        for y in (1.2, 3.0, 5.4):
            p.box(VERM, x - 0.36, y, -0.36, x + 0.36, y + 0.16, 0.36)
        p.box(VERM, x - 0.38, GB1, -0.38, x + 0.38, GH, 0.38)
        p.box(IRON, x - 0.04, 4.0, -0.9, x + 0.04, 4.08, -0.34)
        ball(p, 'light', (x, 3.78, -0.9), 0.26)
    # The name board, framed in vermilion, a row of bulbs along both edges on both faces.
    p.box(VERM, -GX - 0.6, GB0, -0.32, GX + 0.6, GB1, 0.32)
    p.box(CREAM, -GX + 0.2, GB0 + 0.18, -0.34, GX - 0.2, GB1 - 0.18, 0.34)
    for z in (-0.37, 0.37):
        for k in range(17):
            x = -GX - 0.3 + (2 * GX + 0.6) * k / 16
            for y in (GB0 + 0.08, GB1 - 0.08):
                ball(p, 'light', (x, y, z), 0.06, seg=6, rings=4)
    # Crest: an arched hood over the board, a crane on a round medallion.
    n = 12
    for k in range(n):
        xa, xb = -GX - 0.6 + (2 * GX + 1.2) * k / n, -GX - 0.6 + (2 * GX + 1.2) * (k + 1) / n
        ya = GH + 0.6 * math.cos(math.pi * ((xa + xb) / 2) / (2 * GX + 1.2))
        p.box(VERM_DK, xa, GH, -0.42, xb, ya + 0.1, 0.42)
        p.box(TILE_ROOF, xa, ya + 0.1, -0.55, xb, ya + 0.22, 0.55)
    p.cyl(CREAM, (0, GH + 1.4, 0), 2, 0.95, 0.2, seg=20)
    p.cyl(VERM, (0, GH + 1.4, 0), 2, 1.05, 0.14, seg=20)
    crane(p, -0.05, GH + 1.25, -0.16, 0.85)
    crane(p, -0.05, GH + 1.25, 0.16, 0.85)


# ── The arcade roof ──────────────────────────────────────────────────────────────────────────

def roof(p):
    for x in (-RX, RX):
        p.box(VERM, x - 0.13, 0, -0.13, x + 0.13, EAVE + 0.15, 0.13)
        p.box(IRON, x - 0.18, 0, -0.18, x + 0.18, 0.3, 0.18)
        # Eave beam along the bay and a gutter on it.
        p.box(VERM, x - 0.12, EAVE, 0, x + 0.12, EAVE + 0.3, BAY)
        p.box(STEEL_G, x - 0.22 * (1 if x > 0 else -1) - 0.08, EAVE + 0.2, 0, x - 0.22 * (1 if x > 0 else -1) + 0.08, EAVE + 0.32, BAY)
        # Knee brace from post to beam.
        for z0, z1 in ((0.12, 1.1),):
            p.face(VERM, [(x, EAVE - 0.9, z0), (x, EAVE - 0.9, z0 + 0.1), (x, EAVE, z1), (x, EAVE, z1 - 0.1)], (1 if x > 0 else -1, 0, 0))
            p.face(VERM, [(x, EAVE - 0.9, z0 + 0.1), (x, EAVE - 0.9, z0), (x, EAVE, z1 - 0.1), (x, EAVE, z1)], (-1 if x > 0 else 1, 0, 0))
    # Ribs: arched steel at the post line and half way, a light purlin between.
    n = 12
    xs = [-RX + 2 * RX * k / n for k in range(n + 1)]
    for zr in (0.0, BAY / 2):
        for k in range(n):
            xa, xb = xs[k], xs[k + 1]
            ya, yb = arch_y(xa), arch_y(xb)
            p.face(IRON, [(xa, ya, zr - 0.06), (xb, yb, zr - 0.06), (xb, yb - 0.18, zr - 0.06), (xa, ya - 0.18, zr - 0.06)], (0, 0, -1))
            p.face(IRON, [(xa, ya - 0.18, zr + 0.06), (xb, yb - 0.18, zr + 0.06), (xb, yb, zr + 0.06), (xa, ya, zr + 0.06)], (0, 0, 1))
            p.face(IRON, [(xa, ya - 0.18, zr - 0.06), (xb, yb - 0.18, zr - 0.06), (xb, yb - 0.18, zr + 0.06), (xa, ya - 0.18, zr + 0.06)], (0, -1, 0))
    for k in range(n + 1):
        if k in (0, n):
            continue
        x = xs[k]
        p.box(IRON, x - 0.03, arch_y(x) - 0.06, 0, x + 0.03, arch_y(x), BAY)
    # The glazing: translucent facets, seen from both sides.
    for k in range(n):
        xa, xb = xs[k], xs[k + 1]
        ya, yb = arch_y(xa) + 0.01, arch_y(xb) + 0.01
        quad2(p, 'glassTint', [(xa, ya, 0), (xb, yb, 0), (xb, yb, BAY), (xa, ya, BAY)], (0, 1, 0))
    # A raised ridge vent.
    p.box(STEEL_G, -0.5, CROWN + 0.02, 0, 0.5, CROWN + 0.08, BAY)
    p.box(STEEL_G, -0.6, CROWN + 0.34, 0, 0.6, CROWN + 0.4, BAY)
    for z in (0.3, BAY / 2 + 0.3):
        for x in (-0.45, 0.45):
            p.box(STEEL_G, x - 0.03, CROWN + 0.08, z - 0.03, x + 0.03, CROWN + 0.34, z + 0.03)
    # Paper lanterns down the middle on wires, a string of pennants across half way.
    for z in (2.0, 6.0):
        p.box(IRON, -0.01, 5.9, z - 0.01, 0.01, arch_y(0) - 0.18, z + 0.01)
        p.cyl('light', (0, 5.55, z), 1, 0.3, 0.62, seg=12)
        p.cyl(IRON, (0, 5.9, z), 1, 0.2, 0.06, seg=10)
        p.cyl(IRON, (0, 5.2, z), 1, 0.2, 0.06, seg=10)
    flags = ['flat:#e84a6f', 'flat:#f2c14e', VERM, 'flat:#3c7dc4', 'flat:#6aa84f']
    zf = BAY / 2
    yl = 6.35
    p.box(IRON, -RX, yl - 0.005, zf - 0.005, RX, yl + 0.005, zf + 0.005)
    for k in range(16):
        x = -RX + 0.4 + k * (2 * RX - 0.8) / 15
        quad2(p, flags[k % len(flags)], [(x - 0.17, yl, zf), (x + 0.17, yl, zf), (x, yl - 0.4, zf)], (0, 0, -1))


# ── Shop rows ────────────────────────────────────────────────────────────────────────────────

ROWS = {
    # Per shop: wall above, fascia board, awning colour (None: no awning), front ('glass', 'shutter', 'open').
    'a': [(PLASTER, 'flat:#2f4a2c', '#2e6b35', 'open'), ('flat:#d9cfb8', 'flat:#1f3f66', '#3c7dc4', 'glass')],
    'b': [('flat:#c9b79a', 'flat:#7a2e0e', '#b9482b', 'open'), ('flat:#e3dccb', 'flat:#3a3d41', None, 'shutter')],
    'c': [('flat:#b5c4bb', 'flat:#6a1b3a', '#e84a6f', 'glass'), ('flat:#efe7d2', 'flat:#1b3a5c', '#f2c14e', 'open')],
}


def shop_row(p, spec):
    for k, (wall, fascia, awn, front) in enumerate(spec):
        x0, x1 = -ROW / 2 + k * ROW / 2, k * ROW / 2
        # The storey above: wall, a window with a sill, an air-con unit on some.
        p.box(wall, x0, 3.5, 0, x1, 7.3, ROW_D)
        p.box(FRAME, x0 + 0.7, 4.3, -0.03, x1 - 0.7, 5.9, 0)
        p.box(WINDOW, x0 + 0.78, 4.38, -0.04, x1 - 0.78, 5.82, -0.03)
        p.box(CONC_L, x0 + 0.6, 4.2, -0.12, x1 - 0.6, 4.3, 0)
        p.box(FRAME, (x0 + x1) / 2 - 0.02, 4.38, -0.05, (x0 + x1) / 2 + 0.02, 5.82, -0.03)
        if k == 0:
            p.box(ACU, x1 - 0.95, 6.2, -0.45, x1 - 0.2, 6.75, 0)
        # Fascia board (the game draws the name on it) and a strip light under it.
        p.box(fascia, x0 + 0.05, 2.75, -0.14, x1 - 0.05, 3.5, 0)
        p.box('light', x0 + 0.2, 2.68, -0.1, x1 - 0.2, 2.75, -0.02)
        # Pilasters.
        for xp in (x0, x1 - 0.2):
            p.box(wall, xp, 0, -0.06, xp + 0.2, 2.75, ROW_D)
        xa, xb = x0 + 0.2, x1 - 0.2
        if front == 'shutter':
            p.box('metal:#a7acb1', xa, 0, 0.05, xb, 2.5, ROW_D)
            p.box('metal:#9aa0a6', xa, 2.5, -0.04, xb, 2.75, ROW_D)
            y = 0.25
            while y < 2.45:
                p.box('metal:#8c9196', xa, y, 0.03, xb, y + 0.02, 0.05)
                y += 0.25
        elif front == 'glass':
            p.box(FRAME, xa, 0, 0.1, xb, 0.4, ROW_D)
            p.box(SHOPGLASS, xa, 0.4, 0.2, xb, 2.6, 0.22)
            p.box('light', xa + 0.1, 2.5, 0.22, xb - 0.1, 2.6, 0.4)
            for xm in (xa + (xb - xa) / 3, xa + 2 * (xb - xa) / 3):
                p.box(FRAME, xm - 0.03, 0.4, 0.18, xm + 0.03, 2.6, 0.22)
        else:
            # Open front: a lit back wall, shelves, and a stepped stand of goods out front.
            p.box('flat:#f1ebdd', xa, 0, ROW_D - 0.02, xb, 2.75, ROW_D)
            p.box('light', xa + 0.1, 2.6, ROW_D - 0.2, xb - 0.1, 2.66, ROW_D - 0.03)
            for y in (1.1, 1.7):
                p.box(TIMBER_LT, xa, y, 0.2, xb, y + 0.03, ROW_D)
            p.box(TIMBER, xa + 0.1, 0, -0.75, xb - 0.1, 0.45, 0)
            p.box(TIMBER, xa + 0.1, 0.45, -0.35, xb - 0.1, 0.8, 0)
            cols = ['flat:#8bbf7a', 'flat:#f08a24', 'flat:#d94f3d', 'flat:#f2d16b', 'flat:#e9b7c4']
            m = int((xb - xa - 0.2) / 0.36)
            for j in range(m):
                xg = xa + 0.2 + j * 0.36
                p.box(cols[(j + k) % len(cols)], xg, 0.45, -0.7, xg + 0.3, 0.6, -0.4)
                p.box(cols[(j + k + 2) % len(cols)], xg, 0.8, -0.3, xg + 0.3, 0.95, -0.05)
        # Striped awning sloping out under the fascia.
        if awn:
            n = 12
            for j in range(n):
                u0, u1 = xa + (xb - xa) * j / n, xa + (xb - xa) * (j + 1) / n
                col = 'flat:' + awn if j % 2 == 0 else WHITE
                quad2(p, col, [(u0, 2.72, -0.14), (u1, 2.72, -0.14), (u1, 2.3, -1.05), (u0, 2.3, -1.05)], (0, 0.9, -0.4))
                p.box(col, u0, 2.12, -1.07, u1, 2.3, -1.04)


# ── Tsuru-no-yu ──────────────────────────────────────────────────────────────────────────────

def sento(p):
    X = SW / 2 - 0.5
    z0, z1 = SDOOR_Z, SD - 0.5
    # The hall: plaster over a timber base, timber battens, high clerestory windows on the sides.
    p.box(PLASTER, -X, 0, z0, X, 5.4, z1)
    p.box(TIMBER, -X - 0.03, 0, z0 - 0.03, X + 0.03, 1.0, z1 + 0.03)
    for x in (-X, X):
        o = 1 if x > 0 else -1
        z = z0 + 1.5
        while z < z1 - 1.5:
            p.box(FRAME, x + o * 0.0, 3.7, z, x + o * 0.04, 4.9, z + 1.6)
            p.box(WINDOW, x + o * 0.04, 3.78, z + 0.08, x + o * 0.05, 4.82, z + 1.52)
            z += 2.4
        for zb in (z0, z1):
            p.box(TIMBER, x - 0.08, 0, zb - 0.08, x + 0.08, 5.4, zb + 0.08)
    # Front wall either side of the porch: timber battens, a lattice window each side.
    for sgn in (-1, 1):
        xa, xb = sgn * 2.8, sgn * X
        lo, hi = min(xa, xb), max(xa, xb)
        for xx in (lo + 0.6, hi - 0.6):
            p.box(TIMBER, xx - 0.06, 1.0, z0 - 0.06, xx + 0.06, 5.4, z0)
        cx = (lo + hi) / 2
        p.box(TIMBER, cx - 1.0, 1.6, z0 - 0.08, cx + 1.0, 2.9, z0)
        for j in range(9):
            xl = cx - 0.9 + j * 0.225
            p.box(TIMBER_LT, xl - 0.02, 1.68, z0 - 0.1, xl + 0.02, 2.82, z0 - 0.08)
        p.box('flat:#f4ecd6', cx - 0.92, 1.68, z0 - 0.075, cx + 0.92, 2.82, z0 - 0.07)
    # Pent eave across the front at the top of the ground storey.
    p.face(TILE_ROOF, [(-X - 0.4, 3.6, z0 - 0.9), (X + 0.4, 3.6, z0 - 0.9), (X + 0.4, 4.1, z0), (-X - 0.4, 4.1, z0)], (0, 1, -0.4))
    p.box(TILE_DK, -X - 0.4, 3.5, z0 - 0.95, X + 0.4, 3.62, z0 - 0.85)
    # Hall roof: a big gable of dark tile, deep eaves, a white gable end with a timber frame, ridge tiles.
    rh, ov = 4.2, 0.7
    poly = [(-X - ov, 5.2), (X + ov, 5.2), (X + ov, 5.42), (0, 5.42 + rh), (-X - ov, 5.42)]
    p.prism(TILE_ROOF, poly, 'z', z0 - 0.6, z1 + 0.6)
    p.prism(PLASTER, [(-X + 0.3, 5.4), (X - 0.3, 5.4), (0, 5.4 + rh - 0.5)], 'z', z0 - 0.62, z0 - 0.58)
    p.prism(TIMBER, [(-0.12, 5.4), (0.12, 5.4), (0.12, 5.4 + rh - 0.7), (-0.12, 5.4 + rh - 0.7)], 'z', z0 - 0.66, z0 - 0.6)
    p.box(TIMBER, -X + 0.3, 6.6, z0 - 0.66, X - 0.3, 6.75, z0 - 0.6)
    p.box(TILE_DK, -0.25, 5.3 + rh, z0 - 0.7, 0.25, 5.75 + rh, z1 + 0.7)
    for zz in (z0 - 0.7, z1 + 0.7):
        p.box(TILE_DK, -0.45, 5.2 + rh, zz - 0.3, 0.45, 6.0 + rh, zz + 0.3)
    # The name board under the gable (the game writes 鶴の湯 on it).
    p.box(TIMBER, -1.7, 5.8, z0 - 0.78, 1.7, 7.0, z0 - 0.66)
    # The karahafu porch: two posts, a curved bargeboard and roof, glass doors with a noren.
    PW = 2.6

    def cy(x):
        t = x / PW
        return 4.1 + 0.85 * math.cos(t * math.pi / 2) ** 2 - 0.18 * t * t
    for x in (-PW + 0.3, PW - 0.3):
        p.box(TIMBER, x - 0.14, 0, -1.1, x + 0.14, cy(x) - 0.25, -0.82)
        p.box(CONC_L, x - 0.22, 0, -1.18, x + 0.22, 0.25, -0.74)
        p.box(TIMBER, x - 0.12, 0, z0 - 0.4, x + 0.12, 3.6, z0 - 0.15)
    p.box(TIMBER, -PW + 0.2, 3.25, -1.12, PW - 0.2, 3.5, -0.8)
    n = 16
    for k in range(n):
        xa, xb = -PW - 0.3 + (2 * PW + 0.6) * k / n, -PW - 0.3 + (2 * PW + 0.6) * (k + 1) / n
        ya, yb = cy(xa), cy(xb)
        # Bargeboard on the front, roof tiles over it running back to the hall.
        p.face(WHITE, [(xa, ya - 0.28, -1.28), (xb, yb - 0.28, -1.28), (xb, yb, -1.28), (xa, ya, -1.28)], (0, 0, -1))
        p.face(TIMBER, [(xa, ya - 0.28, -1.28), (xb, yb - 0.28, -1.28), (xb, yb - 0.28, z0 - 0.1), (xa, ya - 0.28, z0 - 0.1)], (0, -1, 0))
        p.face(TILE_ROOF, [(xa, ya, -1.3), (xb, yb, -1.3), (xb, yb + 0.12, z0), (xa, ya + 0.12, z0)], (0, 1, 0))
        p.box(TILE_DK, xa, ya - 0.02, -1.38, xb, ya + 0.1, -1.28)
    p.prism(WHITE, [(-1.0, 4.0), (1.0, 4.0), (0, cy(0) - 0.3)], 'z', -1.3, -1.26)
    p.box(TIMBER, -PW + 0.3, cy(PW - 0.3) - 0.4, -1.3, PW - 0.3, cy(PW - 0.3) - 0.28, z0 - 0.1)
    # Doors: four glass panels in timber frames, the step in front, the noren hung from the porch beam.
    p.box(CONC_L, -PW + 0.1, 0, -1.2, PW - 0.1, 0.12, z0)
    p.box(TIMBER, -2.1, 0, z0 - 0.08, 2.1, 0.25, z0)
    p.box(TIMBER, -2.1, 2.45, z0 - 0.08, 2.1, 3.25, z0)
    for k in range(4):
        xa = -2.1 + k * 1.05
        p.box(TIMBER, xa, 0.25, z0 - 0.1, xa + 0.07, 2.45, z0 - 0.02)
        p.box(SHOPGLASS, xa + 0.07, 0.25, z0 - 0.06, xa + 0.98, 2.45, z0 - 0.04)
        p.box(TIMBER, xa + 0.07, 1.2, z0 - 0.08, xa + 0.98, 1.26, z0 - 0.04)
    p.box(TIMBER, 2.03, 0.25, z0 - 0.1, 2.1, 2.45, z0 - 0.02)
    p.box('light', -1.8, 2.4, z0 - 0.04, 1.8, 2.45, z0 + 0.4)
    for k in range(3):
        xa = -1.5 + k * 1.0
        quad2(p, NAVY, [(xa + 0.02, 3.25, -0.95), (xa + 0.98, 3.25, -0.95), (xa + 0.98, 2.1, -0.95), (xa + 0.02, 2.1, -0.95)], (0, 0, -1))
    # Boiler house and chimney at the back right (its ladder on the back), a stack of firewood beside it.
    p.box(CONC_L, CH_X - 2.0, 0, CH_Z - 2.4, X + 0.3, 3.6, SD - 0.2)
    p.box(TILE_DK, CH_X - 2.2, 3.6, CH_Z - 2.6, X + 0.5, 3.75, SD)
    p.cyl(BRICK, (CH_X, CH_H / 2, CH_Z), 1, 0.85, CH_H, seg=16)
    for y in (CH_H - 3.2, CH_H - 1.4):
        p.cyl(WHITE, (CH_X, y, CH_Z), 1, 0.88, 0.9, seg=16)
    p.cyl(IRON, (CH_X, CH_H + 0.1, CH_Z), 1, 0.92, 0.2, seg=16, caps=False)
    y = 4.0
    while y < CH_H - 0.5:
        p.box(IRON, CH_X - 0.25, y, CH_Z + 0.85, CH_X + 0.25, y + 0.04, CH_Z + 0.93)
        y += 0.45
    for x in (CH_X - 0.25, CH_X + 0.25):
        p.box(IRON, x - 0.02, 4.0, CH_Z + 0.9, x + 0.02, CH_H - 0.5, CH_Z + 0.97)
    for k in range(5):
        p.cyl(TIMBER_LT, (CH_X - 2.6, 0.12 + k * 0.22, SD - 1.5), 2, 0.11, 1.8, seg=6)
    # A low plastered wall with a tiled cap along the lot's front either side of the porch.
    for sgn in (-1, 1):
        lo, hi = sorted((sgn * 3.0, sgn * (SW / 2 - 0.2)))
        p.box(PLASTER, lo, 0, -0.25, hi, 1.1, 0.05)
        p.box(TILE_ROOF, lo - 0.05, 1.1, -0.32, hi + 0.05, 1.22, 0.12)
        # A potted pine on the forecourt.
        cx = (lo + hi) / 2
        p.cyl('flat:#6a4a32', (cx, 1.4, 0.9), 1, 0.35, 0.5, seg=10)
        ball(p, 'flat:#2e5a3c', (cx, 2.0, 0.9), 0.55)
        ball(p, 'flat:#36684a', (cx + 0.3, 2.45, 0.95), 0.38)


PROPS = {
    'gate': (gate, 2 * GX + 2), 'roof': (roof, 2 * RX + 1),
    'row_a': (lambda p: shop_row(p, ROWS['a']), ROW + 1), 'row_b': (lambda p: shop_row(p, ROWS['b']), ROW + 1),
    'row_c': (lambda p: shop_row(p, ROWS['c']), ROW + 1), 'sento': (sento, SW + 2),
}


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('tsuru', [dict(id=k, w=w, gap=3.0) for k, (_, w) in PROPS.items()], build_hi, lambda v: None)
