# Builds Watayamachi's wholesale centre (綿屋町, the cotton wholesalers' town; built 2026-11 after
# Osaka's Senba): the 1970 textile wholesale centre that stands in the middle of the avenue under
# the expressway, in separate halls between the cross streets, the expressway's deck that is its
# roof, and the portal pier that carries the deck where no hall stands.
#
#   blender --background --python tools/blender/build_watacentre.py -- [--renders <dir>]
#
# Writes assets/buildings/watacentre.blend, public/models/buildings/watacentre.glb and
# src/stations/anchors/watacentre.ts (sizes, the places of the boards the game letters, and marks
# whose name starts with '_': doorways and the bay width, for colliders and the inside).
# Frame and helpers: buildkit.py, kitakit.py. Nothing here carries a name.
#
# A hall's front (z = 0) and back (z = D) are both street fronts: it stands in the avenue's middle.
# The two halls by the crossing are walked into: their doorways are real openings, they have no
# floor, and the game builds the inside (src/stations/wata-centre.ts).
#
# Sources: docs/theme-notes.md (Textile wholesale grid).

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

D = 18.0          # a hall's depth, the avenue's middle strip
H1 = 4.5          # the street storey
H = 8.5           # the hall's top: the deck's soffit
T = 0.3           # wall thickness
END_DOOR = (6.0, 12.0)   # the doorway in each end wall (z range), END_H high
END_H = 3.4
DOOR_H = 3.2
DECK_OUT = 1.2    # the deck's overhang past each front

PIER = 'flat:#b3ac9c'
WALL = 'flat:#e6dfcc'       # unbleached cotton
WALL_DK = 'flat:#cfc7b2'
MOSAIC = 'flat:#8c3b35'     # the madder band
INFILL = 'flat:#26292c'
KICKP = 'flat:#5a5650'
BOARD = 'flat:#f1ece0'
SHUTTER = 'flat:#9aa0a3'
STEEL_G = 'flat:#7d9a96'    # the girders' paint
STEEL_GD = 'flat:#5f7a77'
DECKC = 'flat:#a9a69c'
DECKC_DK = 'flat:#8c897f'
BARRIER = 'flat:#c4cdc6'
WARM = 'flat:#ffe2b0'


def lit(p, face, a0, a1, y0, y1, at):
    quad(p, 'windowDim', face, a0, a1, y0, y1, at, col=WARM)


def hall(p, s, v, r):
    w, n, doors, is_open = v['w'], v['n'], v['doors'], v['open']
    x0, x1 = -w / 2, w / 2
    bay = w / n
    mark('_bay', x0, 0, 0, bay, n)
    for face, zo, nz in (('f', 0.0, -1), ('b', D, 1)):
        zi = zo - nz * T
        za, zb = min(zo, zi), max(zo, zi)
        tag = 'N' if face == 'f' else 'S'

        def proud(d):
            q = zo + nz * d
            return (min(za, q), max(zb, q))

        for k in range(n + 1):
            c = x0 + k * bay
            a, e = max(x0, c - 0.35), min(x1, c + 0.35)
            pz = proud(0.12)
            p.box(PIER, a, 0, pz[0], e, H1, pz[1])
        for k in range(n):
            a, e = x0 + k * bay + 0.35, x0 + (k + 1) * bay - 0.35
            m = (a + e) / 2
            if k in doors:
                i = doors.index(k)
                p.box(WALL_DK, a, DOOR_H, za, e, H1, zb)
                cz = proud(1.5)
                p.box(STEEL_GD, a - 0.2, DOOR_H, cz[0], e + 0.2, DOOR_H + 0.18, cz[1])
                bz = proud(0.1)
                p.box(BOARD, a + 0.3, DOOR_H + 0.35, bz[0], e - 0.3, H1 - 0.2, bz[1])
                mark('ent%s%d' % (tag, i), m, (DOOR_H + 0.35 + H1 - 0.2) / 2, zo + nz * 0.11, e - a - 0.6, H1 - 0.55 - DOOR_H, n=(0, nz))
                mark('_door%s%d' % (tag, i), m, DOOR_H / 2, zo, e - a, DOOR_H, n=(0, nz))
                if not is_open:
                    p.box(INFILL, a, 0, zo - nz * 0.1 - 0.02, e, DOOR_H, zo - nz * 0.1 + 0.02)
                    for q in range(4):
                        da = a + q * (e - a) / 4
                        quad(p, WINDOW, face, da + 0.06, da + (e - a) / 4 - 0.06, 0.1, DOOR_H - 0.5, zo - nz * 0.07, col=SHOPGLASS)
                continue
            # A shop bay: kick plate, the lit window with a mullion, the fascia board over it.
            p.box(KICKP, a, 0, za, e, 0.45, zb)
            p.box(INFILL, a, 0.45, za + 0.08, e, 3.0, zb - 0.08)
            lit(p, face, a + 0.08, m - 0.04, 0.55, 2.9, zo - nz * 0.07)
            lit(p, face, m + 0.04, e - 0.08, 0.55, 2.9, zo - nz * 0.07)
            p.box(FRAME, m - 0.04, 0.45, min(zo, zo - nz * 0.06), m + 0.04, 3.0, max(zo, zo - nz * 0.06))
            p.box(WALL_DK, a, 3.0, za, e, H1, zb)
            bz = proud(0.1)
            p.box(BOARD, a + 0.15, 3.12, bz[0], e - 0.15, 4.02, bz[1])
            mark('shop%s%d' % (tag, k), m, 3.57, zo + nz * 0.11, e - a - 0.3, 0.9, n=(0, nz))
            # An awning over some.
            if r.random() < 0.45:
                col = r.choice(['#8f2020', '#27344f', '#3a3d41', '#b35a1c', '#12382c'])
                zs = (zo, zo + nz * 1.2)
                p.prism('flat:' + col, [(zs[0], 3.1), (zs[1], 2.62), (zs[1], 2.7), (zs[0], 3.18)], 'x', a + 0.1, e - 0.1)
        # The madder band and the upper storey: ribbon windows between fins.
        bz = proud(0.08)
        p.box(MOSAIC, x0, H1, bz[0], x1, H1 + 0.7, bz[1])
        p.box(WALL, x0, H1 + 0.7, za, x1, H, zb)
        for k in range(n):
            a, e = x0 + k * bay, x0 + (k + 1) * bay
            quad(p, WINDOW, face, a + 0.45, e - 0.45, 5.95, 7.55, zo + nz * 0.03)
            p.box(FRAME, (a + e) / 2 - 0.04, 5.95, min(zo, zo + nz * 0.05), (a + e) / 2 + 0.04, 7.55, max(zo, zo + nz * 0.05))
        for k in range(n + 1):
            c = min(x1 - 0.12, max(x0 + 0.12, x0 + k * bay))
            fz = proud(0.3)
            p.box(WALL_DK, c - 0.12, H1 + 0.7, fz[0], c + 0.12, H - 0.15, fz[1])
        mark('name' + tag, 0, H1 + 0.35, zo + nz * 0.09, min(16.0, w * 0.4), 0.52, n=(0, nz))
        # Outdoor units and a downpipe on the upper wall, on the wall itself.
        for k in range(1, n, 3):
            c = x0 + k * bay + 0.5
            oz = proud(0.4)
            p.box(ACU, c, H1 + 0.72, oz[0], c + 0.9, H1 + 1.4, oz[1])
    # The end walls: a wide doorway, the hall's number over it, windows above.
    for face, xo, nx in (('l', x0, -1), ('r', x1, 1)):
        xi = xo - nx * T
        xa, xb = min(xo, xi), max(xo, xi)
        tag = 'W' if face == 'l' else 'E'
        da, de = END_DOOR
        p.box(PIER, xa, 0, 0, xb, H1, da)
        p.box(PIER, xa, 0, de, xb, H1, D)
        p.box(WALL_DK, xa, END_H, da, xb, H1, de)
        p.box(MOSAIC, min(xa, xo + nx * 0.08), H1, 0, max(xb, xo + nx * 0.08), H1 + 0.7, D)
        p.box(WALL, xa, H1 + 0.7, 0, xb, H, D)
        for a, e in ((1.6, 5.2), (6.6, 11.4), (12.8, 16.4)):
            quad(p, WINDOW, face, a, e, 5.95, 7.55, xo + nx * 0.03)
        bx = (min(xo, xo + nx * 0.1), max(xo, xo + nx * 0.1))
        p.box(BOARD, bx[0], END_H + 0.2, da + 0.4, bx[1], H1 - 0.15, de - 0.4)
        mark('num' + tag, xo + nx * 0.11, (END_H + 0.2 + H1 - 0.15) / 2, (da + de) / 2, de - da - 0.8, H1 - 0.35 - END_H, n=(nx, 0))
        mark('_end' + tag, xo, END_H / 2, (da + de) / 2, de - da, END_H, n=(nx, 0))
        cx = (min(xo, xo + nx * 1.6), max(xo, xo + nx * 1.6))
        p.box(STEEL_GD, cx[0], END_H, da - 0.3, cx[1], END_H + 0.18, de + 0.3)
        if not is_open:
            p.box(INFILL, xo - nx * 0.12, 0, da, xo - nx * 0.08, END_H, de)
            for q in range(4):
                a = da + q * (de - da) / 4
                quad(p, WINDOW, face, a + 0.06, a + (de - da) / 4 - 0.06, 0.1, END_H - 0.5, xo - nx * 0.07, col=SHOPGLASS)
    # The slab the deck stands on.
    p.box(DECKC_DK, x0, H - 0.25, 0, x1, H, D)


def deck(p, s, v, r):
    """One span of the expressway: plate girders, the slab, parapets, the noise barrier and a lamp."""
    w = v['w']
    x0, x1 = -w / 2, w / 2
    zf, zb = -DECK_OUT, D + DECK_OUT
    y0, yg, ys = H, H + 1.4, H + 1.8
    for z in (0.5, 4.75, 9.0, 13.25, 17.5):
        p.box(STEEL_G, x0, y0, z - 0.2, x1, yg, z + 0.2)
    for z, nz in ((0.3, -1), (17.7, 1)):
        for x in rows(x0 + 1.0, x1 - 1.0, 2.0):
            p.box(STEEL_GD, x - 0.04, y0 + 0.1, min(z, z + nz * 0.1), x + 0.04, yg - 0.05, max(z, z + nz * 0.1))
    p.box(DECKC, x0, yg, zf, x1, ys, zb)
    for z, nz in ((zf, -1), (zb, 1)):
        za, zc = min(z, z - nz * 0.3), max(z, z - nz * 0.3)
        p.box(DECKC_DK, x0, ys, za, x1, ys + 0.9, zc)
        p.box(BARRIER, x0, ys + 0.9, z - nz * 0.2 - 0.03, x1, ys + 2.9, z - nz * 0.2 + 0.03)
        for x in rows(x0 + 1.0, x1 - 1.0, 2.0):
            p.box(STEEL_GD, x - 0.06, ys + 0.9, z - nz * 0.27, x + 0.06, ys + 3.0, z - nz * 0.13)
        # A drain pipe down the girder's face, to the slab's edge.
        p.box(STEEL_GD, x0 + 1.4, y0 + 0.1, min(z, z - nz * 0.2), x0 + 1.55, ys, max(z, z - nz * 0.2))
    p.box(DECKC_DK, x0, ys, (zf + zb) / 2 - 0.3, x1, ys + 0.8, (zf + zb) / 2 + 0.3)
    # A lamp on the central reserve, one arm each way.
    p.box(STEEL, -0.09, ys + 0.8, (zf + zb) / 2 - 0.09, 0.09, ys + 9.0, (zf + zb) / 2 + 0.09)
    for nz in (-1, 1):
        zc = (zf + zb) / 2
        p.box(STEEL, -0.06, ys + 8.9, min(zc, zc + nz * 2.4), 0.06, ys + 9.0, max(zc, zc + nz * 2.4))
        p.box('light', -0.25, ys + 8.82, zc + nz * 2.4 - 0.5, 0.25, ys + 8.9, zc + nz * 2.4 + 0.5)


def pier(p, s, v, r):
    """A portal pier under the deck, where no hall carries it."""
    hw = v['w'] / 2
    for z in (3.2, 14.8):
        p.box(PIER, -0.75, 0, z - 0.75, 0.75, H - 1.3, z + 0.75)
        p.box(KICKP, -0.8, 0, z - 0.8, 0.8, 0.5, z + 0.8)
    p.box(PIER, -hw, H - 1.3, -0.4, hw, H, D + 0.4)
    mark('_colA', 0, 0, 3.2, 1.5, 1.5)
    mark('_colB', 0, 0, 14.8, 1.5, 1.5)


def pier_sea(p, s, v, r):
    """The same pier standing in the bay: its columns go down through a pile cap at the waterline."""
    hw = v['w'] / 2
    for z in (3.2, 14.8):
        p.box(PIER, -0.75, -7.0, z - 0.75, 0.75, H - 1.3, z + 0.75)
        p.box(DECKC_DK, -1.5, -1.6, z - 1.5, 1.5, -0.2, z + 1.5)
    p.box(PIER, -hw, H - 1.3, -0.4, hw, H, D + 0.4)


def ramp(p, s, v, r):
    """The expressway's end: it comes down from the deck's level (the -x end) to the street in the avenue's middle strip."""
    L = v['w']
    x0, x1 = -L / 2, L / 2
    top0, top1 = H + 1.8, 0.2

    def y(x):
        return top0 + (top1 - top0) * (x - x0) / L

    xm = x0 + L * 0.42      # down to here it is a deck on piers, below a walled embankment
    p.prism(DECKC, [(x0, y(x0) - 1.8), (xm, y(xm) - 1.8), (xm, y(xm)), (x0, y(x0))], 'z', 0.3, D - 0.3)
    for z in (0.5, 9.0, 17.5):
        p.prism(STEEL_G, [(x0, y(x0) - 1.8), (xm, y(xm) - 1.8), (xm, y(xm) - 0.4), (x0, y(x0) - 0.4)], 'z', z - 0.2, z + 0.2)
    p.prism(PIER, [(xm, 0), (x1, 0), (x1, y(x1)), (xm, y(xm))], 'z', 0.3, D - 0.3)
    p.prism('flat:#3a3d42', [(x0, y(x0)), (x1, y(x1)), (x1, y(x1) + 0.03), (x0, y(x0) + 0.03)], 'z', 0.6, D - 0.6)
    for za, zb in ((0.0, 0.3), (D - 0.3, D), (D / 2 - 0.25, D / 2 + 0.25)):
        p.prism(DECKC_DK, [(x0, y(x0)), (x1, y(x1)), (x1, y(x1) + 0.9), (x0, y(x0) + 0.9)], 'z', za, zb)
    # The noise barrier on the upper half; piers under the deck part.
    xb = x0 + L * 0.5
    for za, zb in ((0.1, 0.16), (D - 0.16, D - 0.1)):
        p.prism(BARRIER, [(x0, y(x0) + 0.9), (xb, y(xb) + 0.9), (xb, y(xb) + 2.9), (x0, y(x0) + 2.9)], 'z', za, zb)
    for x in (x0 + 0.9, x0 + L * 0.21):
        for z in (3.2, 14.8):
            p.box(PIER, x - 0.75, 0, z - 0.75, x + 0.75, y(x) - 1.8, z + 0.75)
        p.box(PIER, x - 0.9, y(x) - 3.0, -0.2, x + 0.9, y(x) - 1.8, D + 0.2)
    # White lane arrows are the game's; a yellow nose where the two roads part at the foot.
    p.box('flat:#e6a700', x1 - 0.6, 0, D / 2 - 1.2, x1, 1.0, D / 2 + 1.2)


STYLES = {'hall': hall, 'deck': deck, 'pier': pier, 'pier_sea': pier_sea, 'ramp': ramp}
VARIANTS = [
    dict(id='hall_e', style='hall', w=69.0, d=D, h=H, seed=1, n=12, doors=[2, 9], open=True),
    dict(id='hall_w', style='hall', w=41.0, d=D, h=H, seed=2, n=7, doors=[3], open=True),
    dict(id='hall_far', style='hall', w=72.0, d=D, h=H, seed=3, n=12, doors=[3, 8], open=False),
    dict(id='deck', style='deck', w=20.0, d=D, h=H + 4.8, seed=4),
    dict(id='pier', style='pier', w=1.8, d=D, h=H, seed=5),
    dict(id='pier_sea', style='pier_sea', w=1.8, d=D, h=H, seed=6),
    dict(id='ramp', style='ramp', w=100.0, d=D, h=H + 2.7, seed=7),
]
for _v in VARIANTS:
    _v['gap'] = 8.0


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(v['seed'] * 131 + 7)
    STYLES[v['style']](body, signs, v, r)
    return body, signs


if __name__ == '__main__':
    run('watacentre', VARIANTS, build_hi, lambda v: None)
    write_anchors('watacentre')
