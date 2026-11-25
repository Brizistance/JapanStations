# Builds the generic buildings of a textile wholesale grid (docs/theme-notes.md, after Osaka's Senba), at the
# level of Aizomechō's street fronts and from the same styles (build_tsumugifront.py, build_aizomefront.py):
# 1960s wholesalers' blocks in mosaic tile with shutters and a roof sign (`tonya`), brick office buildings of
# the trade (`brick`), trading companies' ribbon-window offices (`ribbon`), finned textile halls (`seni`) and a
# signboard-fronted shop house left over from before (`kanban`). Theme set: no station's name is in it.
#
#   blender --background --python tools/blender/build_wholesale.py -- [--renders <dir>]
#
# Writes assets/buildings/wholesale.blend, public/models/buildings/wholesale.glb and
# src/stations/anchors/wholesale.ts. Boards the game letters: `name` over the street storey, `roof` and
# `vertical` where the style has them, and on each side wall `name_l` / `name_r` over a side entrance and
# `up_l` / `up_r` an upright board. Every lot is 34 m deep: half a 72 m block less its drain alley.
#
# Every building has a second front down each side (rebuilt 2026-11-25, the owner's rule: no blank street
# storey): an entrance under a canopy with the firm's board, a goods shutter, an upright board, pipes and
# outdoor units. In a row the sides are hidden; on a corner or beside a gap they are the street front.
#
#   m*  main-street buildings, 26 to 31 m (the avenue's cornice line): 27, 18, 12 and 9 m lots
#   b*  back-street buildings, 11 to 23 m; b9b is the shop-house survivor

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_tsumugifront as T  # noqa: E402
import build_aizomefront  # noqa: E402,F401  (adds the tonya and kanban styles to T.STYLES)
from kitakit import *  # noqa: E402,F401,F403

D = 34.0
BOARD = 'flat:#f1ece0'
SHUT = 'metal:#a7acb1'
SHUT_DK = 'metal:#8c9196'
PIPE = 'flat:#7c7f82'
WARM = 'flat:#ffe2b0'

# Each style's street storey height, and where it puts its side windows (first floor line, floor height, sill,
# window height, bay, inset from the ends, window width), so the side dress can add sills and glazing bars to them.
GH = {'tonya': 3.7, 'brick': 4.2, 'ribbon': 4.2, 'seni': 4.2, 'kanban': 3.0}
SIDE = {
    'tonya': (5.2, 3.3, 0.95, 1.4, 3.0, 1.5, 1.2),
    'brick': (1.2, 3.6, 0.9, 2.0, 3.2, 1.2, 1.2),
    'seni': (4.6, 3.6, 0.8, 2.3, 1.6, 0.6, 1.25),
}
BAYS = ['shop', 'door', 'shop', 'shop', 'shutter', 'shop', 'service']
GOODS = ['flat:#e6dfcc', 'flat:#9c2a30', 'flat:#27344f', 'flat:#d9b44a', 'flat:#6f8f6a', 'flat:#8aa0b8', 'flat:#c97b5a']
GLASS_SHOP = 'flat:#3d4a4c'
PLINTH = 'flat:#4a4440'
STEELDOOR = 'flat:#6f7478'
BRASS_C = 'flat:#c9ced2'


def side_fronts(p, v):
    """The street storey down each side, bay by bay between piers under one fascia: shop windows with goods in
    them, the side entrance under its canopy with the firm's board, a goods shutter in its own bay, a service
    door; above, a band at every floor line and a sill and glazing bars on every window; pipes, units, a board."""
    w, d, h, st = v['w'], v['d'], v['h'], v['style']
    gh, low = GH[st], v['h'] < 13
    wall, trim = v.get('wall', 'flat:#cfc7b2'), v.get('trim', 'flat:#e6e2d6')
    for xo, nx, tag in ((-w / 2, -1, 'l'), (w / 2, 1, 'r')):
        def X(a, e):
            return (min(xo + nx * a, xo + nx * e), max(xo + nx * a, xo + nx * e))

        def B(mat, a, e, y0, y1, z0, z1, col=None):
            x = X(a, e)
            p.box(mat, x[0], y0, z0, x[1], y1, z1, col)

        # The storey's cladding (it covers whatever the style drew down here), a plinth, the fascia.
        B(wall, 0, 0.08, 0, gh + 0.6, 0.3, d - 0.3)
        B(PLINTH, 0, 0.11, 0, 0.45, 0.3, d - 0.3)
        B(trim, 0.08, 0.17, gh, gh + 0.6, 0.3, d - 0.3)
        n = len(BAYS)
        z0b, z1b = 1.0, d - 1.6
        bw = (z1b - z0b) / n
        for i in range(n + 1):
            zb = z0b + i * bw
            B(trim, 0.08, 0.22, 0.45, gh, zb - 0.22, zb + 0.22)
        for i, kind in enumerate(BAYS):
            za, ze = z0b + i * bw + 0.22, z0b + (i + 1) * bw - 0.22
            zc = (za + ze) / 2
            if kind == 'shop':
                # A framed display window: dark glass, a lit strip at its head, a transom and a mullion, goods on the sill.
                B(ALU_DK, 0.08, 0.15, 0.45, gh - 0.12, za, ze)
                quad(p, GLASS_SHOP, tag, za + 0.09, ze - 0.09, 0.55, gh - 0.78, xo + nx * 0.155)
                quad(p, 'windowDim', tag, za + 0.09, ze - 0.09, gh - 0.72, gh - 0.22, xo + nx * 0.155, col=WARM)
                B(ALU_DK, 0.15, 0.18, gh - 0.78, gh - 0.72, za + 0.05, ze - 0.05)
                B(ALU_DK, 0.15, 0.18, 0.55, gh - 0.22, zc - 0.03, zc + 0.03)
                for j in range(4):
                    zg = za + 0.35 + j * (ze - za - 0.7) / 4
                    B(GOODS[(i * 3 + j + v['seed']) % len(GOODS)], 0.158, 0.2, 0.55, 0.95 + ((i + j) % 3) * 0.22, zg, zg + 0.42)
            elif kind == 'door':
                # The side entrance: glass doors in a metal frame, a lit transom, a canopy with a lit soffit, the firm's board on the fascia.
                B(ALU_DK, 0.08, 0.17, 0.0, gh - 0.75, zc - 1.45, zc + 1.45)
                for a_, e_ in ((zc - 1.3, zc - 0.03), (zc + 0.03, zc + 1.3)):
                    quad(p, GLASS_SHOP, tag, a_, e_, 0.06, gh - 1.35, xo + nx * 0.175)
                    B(BRASS_C, 0.175, 0.21, 0.95, 1.5, (a_ + e_) / 2 + (0.5 if a_ < zc - 1 else -0.5) - 0.02, (a_ + e_) / 2 + (0.5 if a_ < zc - 1 else -0.5) + 0.02)
                quad(p, 'windowDim', tag, zc - 1.3, zc + 1.3, gh - 1.28, gh - 0.85, xo + nx * 0.175, col=WARM)
                B(ALU_DK, 0.0, 1.5, gh - 0.72, gh - 0.56, za - 0.1, ze + 0.1)
                B('light', 0.25, 1.3, gh - 0.75, gh - 0.72, za + 0.3, ze - 0.3)
                B(BOARD, 0.17, 0.21, gh + 0.07, gh + 0.53, zc - 2.4, zc + 2.4)
                mark('name_' + tag, xo + nx * 0.22, gh + 0.3, zc, 4.6, 0.4, n=(nx, 0))
            elif kind == 'shutter':
                # A goods shutter in its own bay under its housing; every other one is part-way up on a lit stockroom.
                up = 1.3 if (v['seed'] + (1 if nx > 0 else 0)) % 2 else 0.0
                if up:
                    quad(p, 'windowDim', tag, za, ze, 0.05, up, xo + nx * 0.085, col=WARM)
                    for j in range(3):
                        zg = za + 0.4 + j * 1.05
                        B(['flat:#c9b98a', 'flat:#8fa8ca', 'flat:#e9e2d2'][j], 0.09, 0.3, 0.05, 0.55 + j * 0.18, zg, zg + 0.8)
                B(SHUT, 0.08, 0.13, up, gh - 0.5, za, ze)
                y = up + 0.18
                while y < gh - 0.55:
                    B(SHUT_DK, 0.13, 0.145, y, y + 0.025, za, ze)
                    y += 0.22
                B(SHUT_DK, 0.08, 0.24, gh - 0.5, gh - 0.14, za - 0.04, ze + 0.04)
                for zz in (za, ze - 0.06):
                    B(SHUT_DK, 0.08, 0.16, 0.0, gh - 0.5, zz, zz + 0.06)
            else:
                # A steel service door with a lamp over it, the meters beside it.
                B(STEELDOOR, 0.08, 0.12, 0.05, 2.15, zc - 0.5, zc + 0.5)
                B(ALU_DK, 0.08, 0.14, 2.15, 2.22, zc - 0.58, zc + 0.58)
                B(DARK, 0.12, 0.15, 1.0, 1.08, zc + 0.3, zc + 0.42)
                B(STEEL, 0.08, 0.3, 2.5, 2.56, zc - 0.12, zc + 0.12)
                B('light', 0.2, 0.34, 2.36, 2.5, zc - 0.1, zc + 0.1)
                B('flat:#b9b6ac', 0.08, 0.28, 0.6, 1.25, zc + 0.85, zc + 1.45)
                B('flat:#b9b6ac', 0.08, 0.24, 1.4, 1.9, zc + 0.9, zc + 1.35)
        # An upright board standing off the wall near the corner, read along the street.
        if not low:
            zu, top = 3.2, min(h - 2.5, 15.0)
            B(STEEL, 0, 1.05, gh + 2.2, gh + 2.32, zu - 0.04, zu + 0.04)
            B(STEEL, 0, 1.05, top - 0.2, top - 0.08, zu - 0.04, zu + 0.04)
            B(BOARD, 0.15, 1.05, gh + 2.0, top, zu - 0.07, zu + 0.07)
            mark('up_' + tag, xo + nx * 0.6, (gh + 2.0 + top) / 2, zu - 0.08, 0.8, top - gh - 2.0, n=(0, -1))
        # The floors above: a band at each floor line; a sill and glazing bars on each window the style put here.
        if st in SIDE:
            y0, fh, sill, wh, bay, inset, ww = SIDE[st]
            f = 0
            while y0 + f * fh + sill + wh < h - 0.6:
                yb = y0 + f * fh
                f += 1
                if yb + sill < gh + 0.7:
                    continue
                B(trim, 0, 0.07, yb + 0.25, yb + 0.4, 0.3, d - 0.3)
                ys = yb + sill
                for c in rows(inset, d - inset, bay):
                    # (Flat strips just proud of the glass: a bar is one face, not a box. Sills only where windows stand apart.)
                    if bay > 2.5:
                        B(trim, 0.06, 0.18, ys - 0.1, ys, c - ww / 2 - 0.1, c + ww / 2 + 0.1)
                        quad(p, FRAME, tag, c - 0.025, c + 0.025, ys, ys + wh, xo + nx * 0.075)
                    quad(p, FRAME, tag, c - ww / 2, c + ww / 2, ys + wh * 0.62, ys + wh * 0.62 + 0.04, xo + nx * 0.075)
        # On the wall itself: a downpipe at the back corner, outdoor units on brackets up the back half.
        B(PIPE, 0, 0.12, 0.2, h - 0.3, d - 0.9, d - 0.78)
        k, y = 0, gh + 1.6
        while y < h - 2.5 and not low:
            z = d - 5.2 - (k % 2) * 6.5
            B(STEEL, 0, 0.36, y - 0.06, y, z - 0.05, z + 0.95)
            B(ACU, 0, 0.36, y, y + 0.7, z, z + 0.9)
            B(DARK, 0.36, 0.37, y + 0.08, y + 0.62, z + 0.14, z + 0.66)
            y += 6.6
            k += 1


def V(i, style, w, h, seed, **kw):
    return dict(id=i, style=style, w=w, d=D, h=h, seed=seed, gap=8.0, **kw)


VARIANTS = [
    # Main streets: to the 31 m line.
    V('m27', 'ribbon', 26.7, 31.0, 1, wall='flat:#e6dfcc', trim='flat:#27344f'),
    V('m27b', 'tonya', 26.7, 31.0, 2, wall='flat:#8fa0b4', trim='flat:#efe9dc'),
    V('m18a', 'seni', 17.7, 31.0, 3, wall='flat:#d9cfb8', trim='flat:#8c3b35'),
    V('m18b', 'brick', 17.7, 28.0, 4, wall='flat:#8a4b3a', trim='flat:#d8ccb2'),
    V('m18c', 'ribbon', 17.7, 29.5, 5, wall='flat:#dfe3e2', trim='flat:#5d6166'),
    V('m12', 'tonya', 11.7, 30.0, 6, wall='flat:#c9c2ae', trim='flat:#8c3b35'),
    V('m12b', 'brick', 11.7, 26.0, 7, wall='flat:#6e3a2d', trim='flat:#efe6cf'),
    V('m9', 'tonya', 8.7, 27.0, 8, wall='flat:#a8b4b0', trim='flat:#27344f'),
    # Back streets.
    V('b27', 'tonya', 26.7, 22.0, 11, wall='flat:#b9b6ac', trim='flat:#27344f'),
    V('b27b', 'seni', 26.7, 23.0, 12, wall='flat:#cdbfa6', trim='flat:#a8977c'),
    V('b18a', 'tonya', 17.7, 18.5, 13, wall='flat:#e6dfcc', trim='flat:#8c3b35'),
    V('b18b', 'brick', 17.7, 23.0, 14, wall='flat:#7a4a32', trim='flat:#d9cdb4'),
    V('b18c', 'ribbon', 17.7, 20.0, 15, wall='flat:#c9c6bd', trim='flat:#3f6a5a'),
    V('b12', 'tonya', 11.7, 16.0, 16, wall='flat:#7f9388', trim='flat:#efe9dc'),
    V('b9a', 'tonya', 8.7, 19.0, 17, wall='flat:#8fa0b4', trim='flat:#e6e2d6'),
    V('b9b', 'kanban', 8.7, 10.8, 18, wall='flat:#5f8f7b', trim='flat:#3f6a5a', awn='#8c3b35'),
    V('b9c', 'brick', 8.7, 15.5, 19, wall='flat:#a0603e', trim='flat:#efe6cf'),
]


def build_hi(v):
    # (As build_tsumugifront.build_hi, without its shop windows round the sides: side_fronts builds the whole side.)
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(sum(map(ord, v['id'])))
    T.NO_BACK[0] = False
    T.STYLES[v['style']](body, signs, v, r)
    side_fronts(body, v)
    return body, signs


if __name__ == '__main__':
    run('wholesale', VARIANTS, build_hi, T.build_lo)
    write_anchors('wholesale')
