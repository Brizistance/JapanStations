# Builds the Kita-Ōdōri district's own city blocks, towers and street furniture.
#
#   blender --background --python tools/blender/build_city.py -- [--renders <dir>]
#
# Writes assets/buildings/city.blend and public/models/buildings/city.glb.
#
# Frame and helpers: see buildkit.py (front at z = 0 facing -z, origin mid-frontage on the
# pavement, +z into the plot). Roots are city_<id>: mid_a … mid_f are 8 to 15 storey blocks,
# twr_a … twr_e the tower cluster, the rest street furniture (origin at the foot). Blocks carry
# sign boards for the game to letter with invented names, like the other street buildings.
# Sizes are mirrored in stations/hub.ts (CITY); change both together.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403
from build_hub import stick  # noqa: E402
from build_plaza import (BRASS, BRASS_LT, GRANITE, GREEN, LEAFY, SHOP, STONE, STONE_DK, STONE_LT, TIMBER, WFRAME,  # noqa: E402
                         band, display, doors, lamp as wall_lamp, piers, planter, roof_plant, rows, windows, winx)

GLASS_DK = 'flat:#26323a'
STEEL_LT = 'flat:#c9ced2'

MIDS = [
    dict(id='mid_a', w=28.0, d=20.0, h=44.0, style='grid', wall='flat:#d9cdb4', trim='flat:#b9a98a', awn='#12382c', seed=3, board=True),
    dict(id='mid_b', w=24.0, d=18.0, h=36.0, style='ribbon', wall='flat:#b9a48c', trim='flat:#8f7c66', awn='#8f2020', seed=5, board=False),
    dict(id='mid_c', w=30.0, d=22.0, h=52.0, style='curtain', wall='flat:#9aa3a9', trim='flat:#dfe3e6', awn=None, seed=7, board=True),
    dict(id='mid_d', w=22.0, d=18.0, h=32.0, style='grid', wall='flat:#8a5a44', trim='flat:#6e4534', awn='#1f5fa8', seed=11, board=True),
    dict(id='mid_e', w=26.0, d=20.0, h=40.0, style='ribbon', wall='flat:#e8e6df', trim='flat:#3f6a5a', awn='#3f6a5a', seed=13, board=False),
    dict(id='mid_f', w=20.0, d=20.0, h=48.0, style='curtain', wall='flat:#4d5459', trim='flat:#b08d3a', awn=None, seed=17, board=True),
    # Open at street level: a 12 × 10.2 m bay in the middle of the front for a walk-in shop (stations/konbini.ts).
    dict(id='mid_k', w=24.0, d=20.0, h=36.0, style='ribbon', wall='flat:#cfc6b4', trim='flat:#8f8676', awn='#12382c', seed=19, board=False, bay=(12.0, 10.2, 4.0)),
]
TOWERS = [
    dict(id='twr_a', w=40.0, d=40.0, h=150.0), dict(id='twr_b', w=44.0, d=36.0, h=130.0), dict(id='twr_c', w=36.0, d=36.0, h=112.0),
    dict(id='twr_d', w=46.0, d=44.0, h=96.0), dict(id='twr_e', w=38.0, d=38.0, h=180.0),
]


def ground(p, x0, x1, d, g, wall, awn):
    """Street storey of a block: granite base, displays under awnings on the front, a door, plain sides."""
    p.box(wall, x0, 0, 0, x1, g, d)
    band(p, GRANITE, x0, x1, 0, d, 0, 0.6, 0.06)
    cs = rows(x0 + 0.6, x1 - 0.6, 5.0)
    door = cs[len(cs) // 2]
    for c in cs:
        if c == door:
            doors(p, c, 0, 0, 2.6, 2.9)
            p.box(BRASS, c - 2.0, 3.1, -1.2, c + 2.0, 3.22, 0)
            continue
        display(p, c - 2.1, c + 2.1, 0.6, 3.5, 0)
        if awn:
            p.box('flat:' + awn, c - 2.3, 3.55, -1.2, c + 2.3, 3.7, 0)
        wall_lamp(p, c - 2.5, 2.3, 0)
    band(p, BRASS, x0, x1, 0, d, g - 0.18, g, 0.14)


def ring_windows(p, x0, x1, d, y0, y1, fh, bay, ww, wh, frame=WFRAME):
    """Windows on all four faces of a block."""
    fl = int((y1 - y0) / fh)
    windows(p, 'f', x0 + 0.5, x1 - 0.5, 0, y0, fl, fh, bay, ww, wh, 1.0, frame)
    windows(p, 'b', x0 + 0.5, x1 - 0.5, d, y0, fl, fh, bay, ww, wh, 1.0, frame)
    windows(p, 'l', 0.5, d - 0.5, x0, y0, fl, fh, bay, ww, wh, 1.0, frame)
    windows(p, 'r', 0.5, d - 0.5, x1, y0, fl, fh, bay, ww, wh, 1.0, frame)


def ring_bands(p, mat, x0, x1, d, y0, y1, e=0.05):
    """A ribbon of `mat` right round a block between y0 and y1, just proud of the wall."""
    p.box(mat, x0 + 0.3, y0, -e, x1 - 0.3, y1, 0)
    p.box(mat, x0 + 0.3, y0, d, x1 - 0.3, y1, d + e)
    p.box(mat, x0 - e, y0, 0.3, x0, y1, d - 0.3)
    p.box(mat, x1, y0, 0.3, x1 + e, y1, d - 0.3)


def midrise(p, s, v):
    W, D, H = v['w'], v['d'], v['h']
    x0, x1 = -W / 2, W / 2
    G, FH = 4.4, 3.5
    wall, trim = v['wall'], v['trim']
    if v.get('bay'):
        bw, bd, bh = v['bay']
        ground(p, x0, -bw / 2, D, G, wall, v['awn'])
        ground(p, bw / 2, x1, D, G, wall, v['awn'])
        p.box(wall, -bw / 2, 0, bd, bw / 2, G, D)
        p.box(wall, -bw / 2, bh, 0, bw / 2, G, bd)
    else:
        ground(p, x0, x1, D, G, wall, v['awn'])
    top = H - 1.2
    p.box(wall, x0, G, 0, x1, top, D)
    fl = int((top - G) / FH)
    if v['style'] == 'grid':
        ring_windows(p, x0, x1, D, G, top, FH, 3.2, 2.0, 2.0)
        piers(p, trim, 'f', x0, x1, 0, G, top, 3.2, 0.5, 0.2)
        piers(p, trim, 'l', 0, D, x0, G, top, 3.2, 0.5, 0.2)
        piers(p, trim, 'r', 0, D, x1, G, top, 3.2, 0.5, 0.2)
        for f in range(1, fl):
            band(p, trim, x0, x1, 0, D, G + f * FH - 0.12, G + f * FH + 0.12, 0.08)
    elif v['style'] == 'ribbon':
        for f in range(fl):
            y = G + f * FH
            ring_bands(p, WINDOW, x0, x1, D, y + 1.0, y + 2.7)
            band(p, trim, x0, x1, 0, D, y + 2.9, y + 3.5, 0.1)
            for c in rows(x0, x1, 4.0):
                p.box(trim, c - 0.06, y + 1.0, -0.08, c + 0.06, y + 2.7, 0)
        piers(p, wall, 'f', x0, x1, 0, G, top, W, 0.9, 0.12)
    else:   # curtain wall
        for f in range(fl):
            y = G + f * FH
            ring_bands(p, WINDOW, x0, x1, D, y + 0.25, y + FH - 0.2)
        piers(p, trim, 'f', x0, x1, 0, G, top, 2.0, 0.12, 0.22)
        piers(p, trim, 'b', x0, x1, D, G, top, 2.0, 0.12, 0.22)
        piers(p, trim, 'l', 0, D, x0, G, top, 2.0, 0.12, 0.22)
        piers(p, trim, 'r', 0, D, x1, G, top, 2.0, 0.12, 0.22)
    band(p, trim, x0, x1, 0, D, top - 0.3, H, 0.25)
    p.box(ROOF, x0 + 0.5, H - 0.4, 0.5, x1 - 0.5, H - 0.3, D - 0.5)
    roof_plant(p, x0 + 2, x1 - 2, H - 0.3, 6, D - 2, v['seed'])
    # A vertical sign at one front corner, a name band over the door, and on some a roof billboard.
    r = random.Random(v['seed'])
    col = r.choice(SIGN_COLOURS)
    sign(s, col, x1 - 1.6, G + 2, -1.5, x1 - 0.5, G + 2 + min(14, top - G - 6), -0.25)
    if not v.get('bay'):
        sign(s, r.choice(SIGN_COLOURS), -4.5, G + 0.25, -0.2, 4.5, G + 1.55, -0.05)
    if v['board']:
        for sx in (-W / 4, W / 4):
            p.box(STEEL, sx - 0.08, H - 0.3, 2.0, sx + 0.08, H + 5.5, 2.16)
            p.box(STEEL, sx - 0.06, H - 0.3, 2.1, sx + 0.06, H - 0.2, 5.0)
        sign(s, r.choice(SIGN_COLOURS), -W / 2 + 2.5, H + 1.2, 1.7, W / 2 - 2.5, H + 5.5, 2.0)


def base(p, x0, x1, z0, z1, h, wall):
    """A tower's street storeys: stone, displays, a brass entrance in the middle of the front."""
    p.box(wall, x0, 0, z0, x1, h, z1)
    band(p, GRANITE, x0, x1, z0, z1, 0, 0.8, 0.08)
    band(p, BRASS, x0, x1, z0, z1, h - 0.25, h, 0.2)
    for c in rows(x0 + 1, x1 - 1, 6.0):
        if abs(c - (x0 + x1) / 2) < 4.5:
            continue
        display(p, c - 2.3, c + 2.3, 0.8, min(6.5, h - 1.5), z0)
        wall_lamp(p, c - 2.9, 3.4, z0)
    m = (x0 + x1) / 2
    p.box(GRANITE, m - 4.2, 0, z0 - 0.4, m + 4.2, min(8.5, h - 0.6), z0)
    doors(p, m - 1.6, 0, z0 - 0.4, 2.6, 3.0)
    doors(p, m + 1.6, 0, z0 - 0.4, 2.6, 3.0)
    p.box(BRASS, m - 5.0, 3.4, z0 - 2.0, m + 5.0, 3.6, z0 - 0.4)
    for sgn in (-1, 1):
        planter(p, m + sgn * 6.2, z0 - 0.9, 2.0)


def shaft(p, x0, x1, z0, z1, y0, y1, bay, pier, glass=WINDOW, core=GLASS_DK, pw=0.3, cap=True, seg=8.4):
    """A tower stage: dark core, glass strips in bays, piers between, a capping band."""
    p.box(core, x0 + 0.3, y0, z0 + 0.3, x1 - 0.3, y1, z1 - 0.3)
    n = max(1, round((y1 - y0) / seg))
    for i in range(n):
        ya, yb = y0 + i * (y1 - y0) / n + 0.45, y0 + (i + 1) * (y1 - y0) / n
        for c in rows(x0, x1, bay):
            p.box(glass, c - bay * 0.34, ya, z0 + 0.22, c + bay * 0.34, yb, z0 + 0.3)
            p.box(glass, c - bay * 0.34, ya, z1 - 0.3, c + bay * 0.34, yb, z1 - 0.22)
        for c in rows(z0, z1, bay):
            p.box(glass, x0 + 0.22, ya, c - bay * 0.34, x0 + 0.3, yb, c + bay * 0.34)
            p.box(glass, x1 - 0.3, ya, c - bay * 0.34, x1 - 0.22, yb, c + bay * 0.34)
    for face, lo, hi, at in (('f', x0, x1, z0), ('b', x0, x1, z1), ('l', z0, z1, x0), ('r', z0, z1, x1)):
        piers(p, pier, face, lo, hi, at, y0, y1, bay, bay * pw, 0.0)
    if cap:
        band(p, pier, x0, x1, z0, z1, y1 - 0.5, y1 + 0.5, 0.2)


def twr_a(p):
    """Slender glass tower in three stages with a finned crown. 40 × 40 m, 150 m."""
    W, D = 40.0, 40.0
    x0, x1 = -W / 2, W / 2
    base(p, x0, x1, 0, D, 10, STONE_LT)
    shaft(p, x0 + 1, x1 - 1, 1, D - 1, 10, 100, 2.0, STEEL_LT, pw=0.16)
    shaft(p, x0 + 5, x1 - 5, 5, D - 5, 100, 128, 2.0, STEEL_LT, pw=0.16)
    shaft(p, x0 + 9, x1 - 9, 9, D - 9, 128, 142, 2.0, STEEL_LT, pw=0.16)
    for c in rows(x0 + 9, x1 - 9, 2.0):
        p.box(STEEL_LT, c - 0.1, 142, 9, c + 0.1, 150, 9.5)
        p.box(STEEL_LT, c - 0.1, 142, D - 9.5, c + 0.1, 150, D - 9)
    for c in rows(9, D - 9, 2.0):
        p.box(STEEL_LT, x0 + 9, 142, c - 0.1, x0 + 9.5, 150, c + 0.1)
        p.box(STEEL_LT, x1 - 9.5, 142, c - 0.1, x1 - 9, 150, c + 0.1)
    p.box('light', x0 + 10, 142.5, 10, x1 - 10, 148.5, D - 10)
    p.box(BEACON, -0.3, 150, D / 2 - 0.3, 0.3, 150.6, D / 2 + 0.3)


def twr_b(p):
    """Two offset slabs, one stone and one glass. 44 × 36 m, 130 m."""
    W, D = 44.0, 36.0
    x0, x1 = -W / 2, W / 2
    base(p, x0, x1, 0, D, 9, STONE)
    shaft(p, x0, x0 + 26, 0.5, D - 6, 9, 130, 2.6, 'flat:#d6ccb6', pw=0.42)
    shaft(p, x0 + 20, x1, 6, D - 0.5, 9, 104, 2.2, 'flat:#aab4ba', pw=0.14, core='flat:#1f2a30')
    p.box(STONE_DK, x0 + 2, 130.5, 3, x0 + 24, 134, D - 8)
    roof_plant(p, x0 + 22, x1 - 2, 104.5, 8, D - 3, 21)
    p.box(BEACON, x0 + 12.7, 134, D / 2 - 3.3, x0 + 13.3, 134.6, D / 2 - 2.7)


def twr_c(p):
    """Round tower: bands of glass between stone rings, a lit drum on top. 36 m across, 112 m."""
    R, D = 17.0, 36.0
    c = (0, 0, D / 2)
    p.cyl(STONE_LT, (0, 5, D / 2), 1, R + 0.4, 10, seg=40)
    p.cyl(GRANITE, (0, 0.4, D / 2), 1, R + 0.48, 0.8, seg=40)
    p.cyl(BRASS, (0, 9.9, D / 2), 1, R + 0.6, 0.25, seg=40)
    for k in range(40):
        a = 2 * math.pi * (k + 0.5) / 40
        if k % 2 == 0:
            cx, cz = (R + 0.42) * math.cos(a), D / 2 + (R + 0.42) * math.sin(a)
            p.box(SHOP, cx - 0.9, 1.0, cz - 0.9, cx + 0.9, 6.5, cz + 0.9)
    p.cyl(GLASS_DK, (0, 56, D / 2), 1, R - 0.2, 92, seg=40)
    FH = 4.0
    for f in range(23):
        y = 10 + f * FH
        p.cyl(WINDOW, (0, y + 2.1, D / 2), 1, R, 2.6, seg=40, caps=False)
        p.cyl(STONE_LT, (0, y + 3.7, D / 2), 1, R + 0.15, 0.7, seg=40, caps=True)
    for k in range(20):
        a = 2 * math.pi * k / 20
        stick(p, STEEL_LT, ((R + 0.15) * math.cos(a), 10, D / 2 + (R + 0.15) * math.sin(a)), ((R + 0.15) * math.cos(a), 102, D / 2 + (R + 0.15) * math.sin(a)), 0.16, 0.16, seg=4)
    p.cyl(STONE_LT, (0, 103, D / 2), 1, R + 0.5, 2, seg=40)
    p.cyl('light', (0, 107, D / 2), 1, R - 5, 6, seg=32, caps=False)
    p.cyl(STEEL_LT, (0, 110.5, D / 2), 1, R - 4.6, 1, seg=32)
    p.cyl(STONE_DK, (0, 111.6, D / 2), 1, 6, 0.8, seg=24)
    p.box(BEACON, -0.3, 112, D / 2 - 0.3, 0.3, 112.6, D / 2 + 0.3)
    doors(p, -1.6, 0, D / 2 - R - 0.45, 2.6, 3.0)
    doors(p, 1.6, 0, D / 2 - R - 0.45, 2.6, 3.0)


def twr_d(p):
    """Stepped stone tower, four stages. 46 × 44 m, 96 m."""
    W, D = 46.0, 44.0
    x0, x1 = -W / 2, W / 2
    wall = 'flat:#cbbfa6'
    base(p, x0, x1, 0, D, 12, wall)
    for i, (a, b) in enumerate(((12, 46), (46, 68), (68, 84), (84, 94))):
        ins = i * 4.5
        shaft(p, x0 + ins, x1 - ins, ins, D - ins, a, b, 2.8, wall, pw=0.5, seg=6.8)
        for cx, cz in ((x0 + ins, ins), (x1 - ins, ins), (x0 + ins, D - ins), (x1 - ins, D - ins)):
            p.box(wall, cx - 1.2, a, cz - 1.2, cx + 1.2, b + 1.2, cz + 1.2)
            p.box(BRASS, cx - 1.3, b + 1.2, cz - 1.3, cx + 1.3, b + 1.4, cz + 1.3)
    p.box(GREEN, x0 + 16, 94.5, 16, x1 - 16, 96, D - 16)
    p.box(BEACON, -0.3, 96, D / 2 - 0.3, 0.3, 96.6, D / 2 + 0.3)


def twr_e(p):
    """Dark monolith with white fins and a sloping top. 38 × 38 m, 180 m at its high side."""
    W, D = 38.0, 38.0
    x0, x1 = -W / 2, W / 2
    dark = 'flat:#1c2328'
    base(p, x0, x1, 0, D, 11, 'flat:#3b4046')
    shaft(p, x0 + 0.6, x1 - 0.6, 0.6, D - 0.6, 11, 160, 1.9, 'flat:#eef0f2', glass=WINDOW, core=dark, pw=0.1, cap=False, seg=9.3)
    p.prism(dark, [(x0 + 0.9, 160), (x1 - 0.9, 160), (x1 - 0.9, 180), (x0 + 0.9, 166)], 'z', 0.9, D - 0.9)
    p.prism('flat:#eef0f2', [(x0 + 0.6, 160), (x1 - 0.6, 160), (x1 - 0.6, 180.4), (x0 + 0.6, 166.4)], 'z', 0.6, 0.9)
    p.prism('flat:#eef0f2', [(x0 + 0.6, 160), (x1 - 0.6, 160), (x1 - 0.6, 180.4), (x0 + 0.6, 166.4)], 'z', D - 0.9, D - 0.6)
    p.box('light', x1 - 0.95, 162, 3, x1 - 0.9, 178, D - 3)
    p.box(BEACON, x1 - 1.6, 180.4, D / 2 - 0.3, x1 - 1.0, 181, D / 2 + 0.3)


# ───────────────────────── street furniture ─────────────────────────

def streetlamp(p):
    p.cyl(STONE_DK, (0, 0.2, 0), 1, 0.2, 0.4, seg=10)
    stick(p, 'flat:#3b4046', (0, 0.4, 0), (0, 7.2, 0), 0.09, 0.06, seg=8)
    for sgn in (-1, 1):
        stick(p, 'flat:#3b4046', (0, 6.9, 0), (0, 7.5, sgn * 1.5), 0.05, 0.04, seg=6)
        p.box('flat:#3b4046', -0.16, 7.42, sgn * 1.5 - 0.42, 0.16, 7.56, sgn * 1.5 + 0.3)
        p.box('light', -0.12, 7.38, sgn * 1.5 - 0.36, 0.12, 7.42, sgn * 1.5 + 0.24)
    p.cyl(BRASS, (0, 2.6, 0), 1, 0.1, 0.06, seg=8)


def street_tree(p, h, seed):
    r = random.Random(seed)
    # Cast-iron grate, trunk, a few boughs, and a crown of leaf clumps.
    p.box('flat:#3a3d42', -0.75, 0, -0.75, 0.75, 0.03, 0.75)
    trunk = [(0, 0.03, 0), (r.uniform(-0.1, 0.1), h * 0.3, r.uniform(-0.1, 0.1)), (r.uniform(-0.15, 0.15), h * 0.55, r.uniform(-0.15, 0.15))]
    stick(p, 'flat:#5b4636', trunk[0], trunk[1], 0.17, 0.13, seg=7)
    stick(p, 'flat:#5b4636', trunk[1], trunk[2], 0.13, 0.09, seg=7)
    greens = ['flat:#4f7a45', 'flat:#3f6a3a', 'flat:#628c50', 'flat:#55843f']
    for k in range(9):
        a = 2 * math.pi * k / 9 + r.uniform(-0.3, 0.3)
        rad = r.uniform(0.3, h * 0.2)
        c = (trunk[2][0] + rad * math.cos(a), h * r.uniform(0.6, 0.92), trunk[2][2] + rad * math.sin(a))
        stick(p, 'flat:#5b4636', trunk[2], c, 0.06, 0.03, seg=5)
        s = r.uniform(0.75, 1.25) * h * 0.14
        col = r.choice(greens)
        for dy, k2 in ((-0.55, 0.62), (0.0, 1.0), (0.5, 0.72), (0.9, 0.36)):
            p.cyl(col, (c[0], c[1] + dy * s, c[2]), 1, s * k2, s * 0.56, seg=8)


def bench(p):
    for sx in (-0.78, 0.78):
        p.box('flat:#3b4046', sx - 0.03, 0, -0.24, sx + 0.03, 0.42, 0.24)
        p.box('flat:#3b4046', sx - 0.03, 0.42, 0.19, sx + 0.03, 0.86, 0.24)
    for k in range(5):
        p.box(TIMBER, -0.95, 0.42, -0.23 + k * 0.105, 0.95, 0.46, -0.145 + k * 0.105)
    for k in range(3):
        p.box(TIMBER, -0.95, 0.56 + k * 0.11, 0.2, 0.95, 0.645 + k * 0.11, 0.235)


def vend(p):
    """Two drinks machines side by side: bodies only (the lit fronts are plain panels)."""
    for sx, col in ((-0.55, 'flat:#c62828'), (0.55, 'flat:#1565c0')):
        p.box(col, sx - 0.5, 0, 0, sx + 0.5, 1.83, 0.7)
        p.box('flat:#f4f1e8', sx - 0.42, 0.75, -0.012, sx + 0.42, 1.7, 0)
        for i in range(3):
            for j in range(6):
                p.box(random.Random(i * 7 + j).choice(['flat:#e8c93a', 'flat:#2f6fb0', 'flat:#3f6b3a', 'flat:#d94f4f', 'flat:#f0efe8']),
                      sx - 0.38 + j * 0.13, 0.82 + i * 0.3, -0.02, sx - 0.28 + j * 0.13, 1.06 + i * 0.3, -0.012)
        p.box('flat:#1d1f22', sx - 0.3, 0.2, -0.012, sx + 0.3, 0.5, 0)


def bikes(p):
    """A rack of four bicycles."""
    p.box(STEEL, -1.6, 0.5, -0.03, 1.6, 0.56, 0.03)
    for sx in (-1.6, 1.6):
        p.box(STEEL, sx - 0.03, 0, -0.03, sx + 0.03, 0.56, 0.03)
    for i, col in enumerate(('flat:#8f2020', 'flat:#27508a', 'flat:#d8d8d2', 'flat:#3f6b3a')):
        x = -1.2 + i * 0.8
        for z in (-0.55, 0.5):
            p.cyl('flat:#1c1c1e', (x, 0.33, z), 0, 0.33, 0.04, seg=12)
            p.cyl('flat:#b9bdc2', (x, 0.33, z), 0, 0.27, 0.045, seg=12)
        stick(p, col, (x, 0.33, -0.55), (x, 0.8, -0.2), 0.02, seg=4)
        stick(p, col, (x, 0.8, -0.2), (x, 0.33, 0.5), 0.02, seg=4)
        stick(p, col, (x, 0.8, -0.2), (x, 0.86, 0.25), 0.02, seg=4)
        stick(p, col, (x, 0.33, 0.5), (x, 0.98, 0.42), 0.02, seg=4)
        p.box('flat:#1c1c1e', x - 0.07, 0.86, -0.32, x + 0.07, 0.9, -0.1)
        p.box('flat:#1c1c1e', x - 0.22, 0.97, 0.4, x + 0.22, 1.0, 0.44)


FURN = {
    'lamp': (streetlamp, 2), 'tree_a': (lambda p: street_tree(p, 6.5, 2), 4), 'tree_b': (lambda p: street_tree(p, 7.6, 9), 4),
    'tree_c': (lambda p: street_tree(p, 5.6, 14), 4), 'bench': (bench, 2.4), 'vend': (vend, 2.6), 'bikes': (bikes, 4),
}
TWR = {'twr_a': twr_a, 'twr_b': twr_b, 'twr_c': twr_c, 'twr_d': twr_d, 'twr_e': twr_e}


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    k = v['id']
    if k in FURN:
        FURN[k][0](body)
    elif k in TWR:
        TWR[k](body)
    else:
        midrise(body, signs, v)
    return body, signs


if __name__ == '__main__':
    variants = [dict(m, gap=6.0) for m in MIDS] + [dict(t, gap=8.0) for t in TOWERS] + [dict(id=k, w=w, gap=2.0) for k, (_, w) in FURN.items()]
    run('city', variants, build_hi, lambda v: None)
