# Builds the zakkyo buildings: narrow multi-tenant blocks with stacked signs (three variants).
#
#   blender --background --python tools/blender/build_zakkyo.py -- [--renders <dir>]
#
# Writes assets/buildings/zakkyo.blend and public/models/buildings/zakkyo.glb.
#
# Frame and helpers: see buildkit.py. Each variant exports as two roots:
#   zakkyo_<id>      detailed, for street level:   zakkyo_<id>_body + zakkyo_<id>_signs
#   zakkyo_<id>_lo   simplified, for the distance: one mesh
# Roots are spread out for the preview renders; a loader should zero their positions.
#
# Signs carry plain blocks where the lettering goes. Shop names are invented and are meant
# to be drawn by the game on the _signs mesh later, never copied from a real business.
# References (proportions and details only): docs/references.md, "Street buildings".

import bpy
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

G0 = 3.9     # ground storey height
FH = 3.2     # upper storey height
R = 0.25     # how far piers and spandrels stand proud of the glass
PARAPET = 0.9
STAIR_W = 2.0
STAIR_D = 3.4

VARIANTS = [
    # wall / trim: facade tile and pier colour. win: 'ribbon' or 'punched'. stair: open stair bay on the right.
    # corner: the -x side is a second street face. Listed first so the preview row shows that side.
    dict(id='g', w=8.2, d=11.0, floors=7, wall='flat:#d2c4ae', trim='flat:#8f7f69', win='ribbon', stair=False,
         corner=True, awning='#c8102e', billboard=True, vending=True, seed=71),
    dict(id='a', w=7.6, d=13.0, floors=7, wall='flat:#c9bda6', trim='flat:#a89a82', win='ribbon', stair=True,
         awning='#b3261e', billboard=False, vending=True, seed=11),
    dict(id='b', w=5.6, d=11.0, floors=5, wall='flat:#8a5a44', trim='flat:#6e4534', win='punched', stair=False,
         awning='#1d6b45', billboard=True, vending=False, seed=23),
    dict(id='c', w=8.8, d=14.0, floors=9, wall='flat:#d8dadb', trim='flat:#9aa0a5', win='ribbon', stair=True,
         awning=None, billboard=True, vending=True, seed=37),
    dict(id='d', w=6.4, d=12.0, floors=6, wall='flat:#5a5f63', trim='flat:#3f4447', win='punched', stair=True,
         awning='#f2c230', billboard=False, vending=False, seed=41),
    dict(id='e', w=9.6, d=13.0, floors=8, wall='flat:#ece8dc', trim='flat:#c2b9a3', win='ribbon', stair=False,
         awning='#1f5fa8', billboard=True, vending=True, seed=53),
    dict(id='f', w=4.8, d=10.0, floors=4, wall='flat:#a7b8a4', trim='flat:#7d8f7b', win='punched', stair=False,
         awning=None, billboard=False, vending=True, seed=67),
]


def flight(p, xa, xb, za, ya, zb, yb):
    p.prism(CONC, [(za, ya), (zb, yb), (zb, yb - 0.18), (za, ya - 0.18)], 'x', xa, xb)


def levels(v):
    """Floor level of each upper storey, then the roof."""
    return [G0 + i * FH for i in range(v['floors'])]


def facade(p, s, v, rng, fx1):
    x0 = -v['w'] / 2
    ys = levels(v)
    H = ys[-1]
    wall, trim = v['wall'], v['trim']
    a, b = x0 + 0.35, fx1 - 0.35
    p.box(trim, x0, 0, 0, a, H + PARAPET, R)
    p.box(trim, b, 0, 0, fx1, H + PARAPET, R)
    punched = v['win'] == 'punched'
    bays = max(2, round((b - a) / (1.9 if punched else 1.4)))
    for i, y in enumerate(ys):
        top = y + PARAPET if i == len(ys) - 1 else y + 0.85
        p.box(wall, a, y - 0.35, 0, b, top, R)
        p.box(trim, a, top - 0.06, -0.04, b, top, R)  # sill line
        if i == len(ys) - 1:
            break
        w0, w1 = y + 0.85, y + FH - 0.35
        p.box(WINDOW, a, w0, R - 0.04, b, w1, R)
        for k in range(1, bays):
            x = a + (b - a) * k / bays
            if punched:
                p.box(wall, x - 0.3, w0, 0, x + 0.3, w1, R)
            else:
                p.box(FRAME, x - 0.03, w0, R - 0.12, x + 0.03, w1, R)
        p.box(FRAME, a, (w0 + w1) / 2 + 0.25, R - 0.1, b, (w0 + w1) / 2 + 0.3, R)  # transom
        if rng.random() < 0.55:  # a tenant's board across the spandrel
            m = (b - a) * rng.uniform(0.0, 0.18)
            sign(s, rng.choice(SIGN_COLOURS), a + m, y - 0.25, -0.07, b - m, y + 0.7, 0)

    # Ground storey: shopfront, door, fascia sign, awning.
    p.box(KICK, a, 0, R - 0.08, b, 0.45, R)
    p.box(SHOPGLASS, a, 0.45, R - 0.04, b, 3.0, R)
    dx = a + (b - a) * 0.72
    p.box(FRAME, dx - 0.6, 0, R - 0.1, dx + 0.6, 2.35, R - 0.04)
    p.box(DARK, dx - 0.5, 0.05, R - 0.12, dx + 0.5, 2.25, R - 0.1)
    for x in (a + (b - a) * 0.36, dx - 0.6):
        p.box(FRAME, x - 0.03, 0.45, R - 0.1, x + 0.03, 3.0, R)
    sign(s, rng.choice(SIGN_COLOURS), a, 3.0, -0.07, b, G0 - 0.4, R)
    if v['awning']:
        aw = 'flat:' + v['awning']
        p.prism(aw, [(0, 2.98), (-1.15, 2.55), (-1.15, 2.4), (-1.1, 2.4), (0, 2.82)], 'x', a, dx - 0.75)
    if v['vending']:
        vx = a + 0.15
        p.box(VEND, vx, 0, -0.75, vx + 1.0, 1.85, -0.05)
        p.box(SHOPGLASS, vx + 0.08, 0.85, -0.76, vx + 0.92, 1.72, -0.75)
        p.box(DARK, vx + 0.08, 0.25, -0.76, vx + 0.92, 0.5, -0.75)
    sign(s, random.Random(v["seed"] + 1).choice(SIGN_COLOURS), dx - 1.5, 0, -0.95, dx - 1.0, 0.95, -0.89)   # standing board on the pavement

    # Projecting sign column (sode kanban), one panel per tenant floor.
    sx = x0 + 0.06
    p.box(FRAME, sx + 0.04, ys[0] + 0.2, -1.12, sx + 0.2, H - 0.4, -0.02)
    for y in ys[:-1]:
        sign(s, rng.choice(SIGN_COLOURS), sx, y + 0.3, -1.08, sx + 0.24, y + FH - 0.1, -0.16)


def stair_bay(p, s, v, rng, fx1):
    x1 = v['w'] / 2
    ys = [0.0] + levels(v)
    H = ys[-1]
    xm = (fx1 + x1 - 0.2) / 2
    p.box(v['wall'], x1 - 0.2, 0, 0, x1, H + PARAPET, STAIR_D)       # party wall
    p.box(v['trim'], fx1, H - 0.3, 0, x1, H + PARAPET, R)             # head of the bay
    p.box(ROOF, fx1, H - 0.2, R, x1 - 0.2, H, STAIR_D)
    for i in range(len(ys) - 1):
        y, r = ys[i], ys[i + 1] - ys[i]
        zb = STAIR_D - 0.85
        if i > 0:
            p.box(CONC, fx1, y - 0.15, 0.1, x1 - 0.2, y, 0.75)
            p.box(v['trim'], fx1, y, 0.08, x1 - 0.2, y + 1.1, 0.2)   # balustrade
        flight(p, fx1 + 0.04, xm, 0.75, y, zb, y + r / 2)
        p.box(CONC, fx1, y + r / 2 - 0.15, zb, x1 - 0.2, y + r / 2, STAIR_D)
        flight(p, xm, x1 - 0.2, zb, y + r / 2, 0.75, y + r)
    p.box(CONC, fx1, ys[-1] - 0.15, 0.1, x1 - 0.2, ys[-1], 0.75)
    # Tenant directory beside the stair entrance.
    p.box(FRAME, x1 - 0.24, 1.0, 0.3, x1 - 0.2, 2.3, 1.2)
    for k in range(v['floors'] - 1):
        yk = 2.2 - k * (1.1 / max(1, v['floors'] - 1))
        p.box('flat:' + rng.choice(SIGN_COLOURS), x1 - 0.26, yk - 0.1, 0.35, x1 - 0.24, yk, 1.15)


def volume(p, v, fx1):
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    H = levels(v)[-1]
    wall = v['wall']
    p.box(wall, x0, 0, R, fx1, H, D)
    if fx1 < x1:
        p.box(wall, fx1, 0, STAIR_D, x1, H, D)
    # Side and back windows; a drain pipe.
    for y in levels(v)[:-1]:
        for zc in (() if v.get('corner') else (D * 0.45, D * 0.75)):
            p.box(WINDOW, x0 - 0.02, y + 1.0, zc - 0.5, x0, y + 2.1, zc + 0.5)
        for xc in (x0 + v['w'] * 0.28, x0 + v['w'] * 0.7):
            p.box(WINDOW, xc - 0.7, y + 0.9, D, xc + 0.7, y + 2.2, D + 0.02)
    p.cyl(STEEL, (x1 + 0.06, H / 2, D - 1.0), 1, 0.05, H, seg=6, caps=False)


def roof(p, s, v, rng, fx1):
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    H = levels(v)[-1]
    wall = v['wall']
    p.box(ROOF, x0 + 0.2, H, R, x1 - 0.2, H + 0.03, D - 0.2)
    p.box(wall, x0, H, R, x0 + 0.2, H + PARAPET, D)
    p.box(wall, x1 - 0.2, H, STAIR_D if fx1 < x1 else R, x1, H + PARAPET, D)
    p.box(wall, x0, H, D - 0.2, x1, H + PARAPET, D)
    # Lift and stair overrun.
    px0, pz0 = x1 - 3.4, D - 4.0
    p.box(wall, px0, H, pz0, x1 - 0.4, H + 2.8, D - 0.6)
    p.box(ROOF, px0 - 0.1, H + 2.8, pz0 - 0.1, x1 - 0.3, H + 2.9, D - 0.5)
    p.box(DARK, px0 + 0.4, H + 0.05, pz0 - 0.02, px0 + 1.3, H + 2.0, pz0)
    # Water tank on a steel stand.
    tx, tz = x0 + 1.7, D - 2.2
    for dx in (-0.65, 0.65):
        for dz in (-0.65, 0.65):
            p.box(STEEL, tx + dx - 0.04, H, tz + dz - 0.04, tx + dx + 0.04, H + 1.4, tz + dz + 0.04)
    p.box(STEEL, tx - 0.8, H + 1.4, tz - 0.8, tx + 0.8, H + 1.48, tz + 0.8)
    p.cyl(TANK, (tx, H + 2.3, tz), 1, 0.85, 1.65, seg=14)
    # Air-conditioning units.
    for k in range(rng.randint(3, 5)):
        ax = x0 + 0.6 + k * 1.05
        if ax + 0.9 > px0 - 0.3:
            break
        az = D * 0.42
        p.box(ACU, ax, H + 0.12, az, ax + 0.9, H + 0.82, az + 0.34)
        p.box(DARK, ax + 0.1, H + 0.2, az - 0.01, ax + 0.62, H + 0.74, az)
    p.cyl(STEEL, (x1 - 0.8, H + 4.3, D - 1.2), 1, 0.03, 3.0, seg=6)   # aerial
    if v['billboard']:
        bx0, bx1 = x0 + 0.4, fx1 - 0.4
        for x in (bx0 + 0.3, (bx0 + bx1) / 2, bx1 - 0.3):
            p.box(STEEL, x - 0.05, H, 0.6, x + 0.05, H + 4.4, 0.7)
            p.prism(STEEL, [(x - 0.04, H), (x + 0.04, H), (x + 0.04, H + 3.2), (x - 0.04, H + 3.2)], 'z', 0.7, 0.72, caps=False)
            p.box(STEEL, x - 0.04, H, 2.2, x + 0.04, H + 0.08, 0.7)
        sign(s, random.Random(v["seed"] + 2).choice(SIGN_COLOURS), bx0, H + 1.5, 0.42, bx1, H + 4.5, 0.6)


def build_hi(v):
    rng = random.Random(v['seed'])
    p, s = Part(), Part()
    s.body = p
    fx1 = v['w'] / 2 - (STAIR_W if v['stair'] else 0)
    volume(p, v, fx1)
    facade(p, s, v, rng, fx1)
    if v.get('corner'):   # a second street face on the -x side, standing R outside the plot width
        for q in (p, s):
            q.turned(-v['w'] / 2 - R, v['d'])
        facade(p, s, dict(v, w=v['d'], vending=False), rng, v['d'] / 2)
        for q in (p, s):
            q.turned(None, 0)
    if v['stair']:
        stair_bay(p, s, v, rng, fx1)
    roof(p, s, v, rng, fx1)
    return p, s


def build_lo(v):
    """Same massing and sign colours, a fraction of the faces."""
    rng = random.Random(v['seed'])
    p = Part()
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    ys = levels(v)
    H = ys[-1]
    fx1 = x1 - (STAIR_W if v['stair'] else 0)
    a, b = x0 + 0.35, fx1 - 0.35
    p.box(v['wall'], x0, 0, 0, x1, H + PARAPET, D)
    for y in ys[:-1]:
        if v.get('corner'):
            p.box(WINDOW, x0 - 0.03, y + 0.85, 0.35, x0, y + FH - 0.35, D - 0.35)
        p.box(WINDOW, a, y + 0.85, -0.03, b, y + FH - 0.35, 0)
        if rng.random() < 0.55:
            rng.uniform(0, 1)
            sign(p, rng.choice(SIGN_COLOURS), a, y - 0.25, -0.07, b, y + 0.7, -0.03, glyphs=False)
    p.box(SHOPGLASS, a, 0.45, -0.03, b, 3.0, 0)
    sign(p, rng.choice(SIGN_COLOURS), a, 3.0, -0.07, b, G0 - 0.4, 0, glyphs=False)
    if v['stair']:
        p.box(DARK, fx1 + 0.1, 0, -0.03, x1 - 0.2, H - 0.3, 0)
    sx = x0 + 0.06
    for y in ys[:-1]:
        sign(p, rng.choice(SIGN_COLOURS), sx, y + 0.3, -1.08, sx + 0.24, y + FH - 0.1, -0.16, glyphs=False)
    p.box(v['wall'], x1 - 3.4, H + PARAPET, D - 4.0, x1 - 0.4, H + 2.8, D - 0.6)
    p.box(TANK, x0 + 0.9, H + PARAPET, D - 3.0, x0 + 2.5, H + 3.1, D - 1.4)
    if v['billboard']:
        sign(p, random.Random(v["seed"] + 2).choice(SIGN_COLOURS), x0 + 0.4, H + 1.5, 0.42, fx1 - 0.4, H + 4.5, 0.6, glyphs=False)
    return p


run('zakkyo', VARIANTS, build_hi, build_lo)
