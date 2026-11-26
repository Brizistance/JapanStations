# Builds generic leisure-waterfront buildings any bayside district can use (first used at Shiomi, 2026-11-25): bay-view
# hotels and the two-storey shop rows of a tourist street. No station's name or brand is in it (the game letters signs).
#
#   blender --background --python tools/blender/build_bayside.py
#
# Writes assets/buildings/bayside.blend, public/models/buildings/bayside.glb and src/stations/anchors/bayside.ts.
#
#   hotel_a   40 x 18 m, 11 floors: white slab, every floor a balcony band curving out at the ends, a glass lobby, a
#             crown over the top floor; `name` over the lobby, `roof` the crown's board.
#   hotel_b   30 x 18 m, 15 floors: blue-glass bands between white floor slabs, the top three stepped back as terraces.
#   hotel_c   48 x 16 m, 6 floors: a low resort wing, timber louvres between deep white terraces, a pergola on the roof.
#   shop_8, shop_10, shop_12   two-storey shops 12 m deep: an open shopfront under a striped awning, a fascia board
#             (`sign`), an upper floor of a café terrace or a window band; each one painted its own way.
#
# Frame: front at z = 0 facing -z, origin mid-frontage, +z into the lot.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403
from detailkit import *  # noqa: E402,F401,F403

WHITE_B = 'flat:#f2f0ea'
NAVY_B = 'flat:#22406b'
SEA_B = 'flat:#4f86ad'
GLASS_V = 'flat:#7f9fb3'
TEAK = 'wood:#9c7b58'
FL = 3.4
BAND_B = 'flat:#dcd8cc'


def hotel_sides(p, r, W, D, y0, nf, acc, back=True, side_balc=True, lobby_side='l'):
    """The sides and back of a bay-view hotel (the owner, 2026-11-25: "make these buildings more detailed"): rooms
    with framed windows and small balconies to the corner rooms on the ends, a colour stripe up the stair, floor bands;
    on the back the corridor windows, the escape stair, plant and service doors; a side entrance with a canopy."""
    for face, at in (('l', -W / 2), ('r', W / 2)):
        fbands(p, BAND_B, face, 0.0, D, [y0 + k * FL for k in range(nf + 1)], at)
        wb(p, acc, face, D * 0.5 - 1.0, D * 0.5 + 1.0, y0, y0 + nf * FL, at, 0.0, 0.06)
        for k in range(nf):
            y = y0 + k * FL
            for c in (2.6, D - 3.6):
                fwin(p, r, face, c - 1.1, c + 1.1, y + 0.15, y + 2.6, at, ALU_DK, GLASS_V)
                if side_balc and k:
                    juliet(p, face, c - 1.4, c + 1.4, y, at)
            fwin(p, r, face, D * 0.5 - 0.35, D * 0.5 + 0.35, y + 0.9, y + 2.4, at, ALU_DK, GLASS_L, mull=False, curtain=False, n=0.06)
        pipe(p, face, D - 0.3, 0.0, y0 + nf * FL, at)
    if back:
        side_wall(p, r, 'b', -W / 2 + 0.6, W / 2 - 5.0, D, y0, nf, FL, WHITE_B, None, kind='hotel', band=BAND_B, bay=3.4)
        ext_stair(p, 'b', W / 2 - 4.6, W / 2 - 0.6, D, y0 + (nf - 1) * FL, FL)
        service_back(p, -W / 2, W / 2 - 5.0, D, 4.4, r)
    # The side entrance: glass doors under a small canopy, a lamp, a planter.
    f, at = lobby_side, (-W / 2 if lobby_side == 'l' else W / 2)
    wb(p, 'windowDim', f, D * 0.5 - 1.8, D * 0.5 + 1.8, 0.0, 2.8, at, 0.0, 0.05, 'flat:#9fb6c2')
    wb(p, ALU, f, D * 0.5 - 0.04, D * 0.5 + 0.04, 0.0, 2.8, at, 0.05, 0.1)
    wb(p, NAVY_B, f, D * 0.5 - 2.4, D * 0.5 + 2.4, 3.0, 3.3, at, 0.0, 1.8)
    wb(p, 'light', f, D * 0.5 - 2.2, D * 0.5 + 2.2, 2.96, 3.0, at, 0.1, 1.6)
    for c in (D * 0.5 - 3.6, D * 0.5 + 2.6):
        wb(p, 'flat:#b9b4a8', f, c, c + 1.0, 0.0, 0.55, at, 0.2, 1.0)
        wb(p, HEDGE, f, c + 0.1, c + 0.9, 0.55, 1.05, at, 0.3, 0.9)


def balcony_band(p, x0, x1, z, y, curve=3.0):
    """A white balcony slab along the front, its ends rounding back to the wall, a glass balustrade on it."""
    p.box(WHITE_B, x0 + curve, y, z - 1.6, x1 - curve, y + 0.22, z)
    for s in (-1, 1):
        for k in range(4):
            # Quarter-round ends in four steps: the outer step shallowest.
            u0, u1 = curve * k / 4, curve * (k + 1) / 4
            depth = 1.6 * (1 - ((curve - (u0 + u1) / 2) / curve) ** 2) ** 0.5
            xa, xb = (x0 + u0, x0 + u1) if s < 0 else (x1 - u1, x1 - u0)
            p.box(WHITE_B, xa, y, z - depth, xb, y + 0.22, z)
    p.box('glassTint', x0 + curve, y + 0.22, z - 1.58, x1 - curve, y + 1.2, z - 1.52)


def hotel_a(p, s):
    r = random.Random(41)
    W, D, NF = 40.0, 18.0, 11
    H = NF * FL + 1.0
    p.box(WHITE_B, -W / 2, 0, 0, W / 2, H, D)
    # The lobby: glass across the middle of the ground floor under a canopy.
    p.box('windowDim', -12.0, 0.2, -0.06, 12.0, 4.2, 0.0, col='flat:#6c8794')
    p.box(NAVY_B, -13.0, 4.4, -3.0, 13.0, 4.8, 0.0)
    p.box('light', -12.0, 4.36, -2.8, 12.0, 4.4, -0.2)
    for k in range(1, NF):
        y = 1.0 + k * FL
        for c in rows(-W / 2 + 1.2, W / 2 - 1.2, 3.6):
            quad(p, WINDOW, 'f', c - 1.4, c + 1.4, y + 0.3, y + 2.6, -0.02, col=GLASS_V)
        balcony_band(p, -W / 2, W / 2, 0.0, y)
    hotel_sides(p, r, W, D, 1.0 + FL, NF - 1, NAVY_B)
    p.box(NAVY_B, -W / 2 - 0.4, H, -2.0, W / 2 + 0.4, H + 1.4, D + 0.4)
    p.box(WHITE_B, -W / 2 + 3, H + 1.4, 2.0, W / 2 - 3, H + 4.5, D - 2.0)
    for k in range(6):
        acu(p, -W / 2 + 4 + k * 1.2, H + 1.4, D - 1.0, out=1)
    tank(p, W / 2 - 2.0, H + 1.4, D - 2.0)
    mark('name', 0.0, 5.4, -0.2, 14.0, 1.0)
    mark('roof', 0.0, H + 0.7, -2.1, 16.0, 1.0)


def hotel_b(p, s):
    W, D, NF = 30.0, 18.0, 15
    H = NF * FL + 1.0
    top = NF - 3
    p.box(WHITE_B, -W / 2, 0, 0, W / 2, 1.0 + top * FL, D)
    p.box('windowDim', -10.0, 0.2, -0.06, 10.0, 4.2, 0.0, col='flat:#6c8794')
    p.box(WHITE_B, -11.0, 4.4, -2.6, 11.0, 4.8, 0.0)
    for k in range(1, top):
        y = 1.0 + k * FL
        p.box(SEA_B, -W / 2 + 0.6, y + 0.4, -0.08, W / 2 - 0.6, y + FL - 0.3, 0.0)
        p.box(WHITE_B, -W / 2 - 0.3, y + FL - 0.3, -0.5, W / 2 + 0.3, y + FL, 0.0)
    hotel_sides(p, random.Random(42), W, D, 1.0 + FL, top - 1, SEA_B, lobby_side='r')
    # The stepped top: three floors, each set back 2 m, with a glass rail on the terrace in front.
    for k in range(3):
        y0 = 1.0 + (top + k) * FL
        sb = 2.0 * (k + 1)
        p.box(WHITE_B, -W / 2 + sb * 0.5, y0, sb, W / 2 - sb * 0.5, y0 + FL, D)
        p.box(SEA_B, -W / 2 + sb * 0.5 + 0.5, y0 + 0.4, sb - 0.06, W / 2 - sb * 0.5 - 0.5, y0 + FL - 0.4, sb)
        p.box('glassTint', -W / 2 + sb * 0.5, y0, sb - 2.0, W / 2 - sb * 0.5, y0 + 1.1, sb - 1.94)
    p.box(NAVY_B, -W / 2 + 4, H, 8.0, W / 2 - 4, H + 0.6, D)
    roof_kit(p, random.Random(44), -W / 2 + 3, W / 2 - 3, 6.0, D, H, NAVY_B, cap=WHITE_B, units=5)
    mark('name', 0.0, 5.3, -0.2, 12.0, 1.0)
    mark('roof', 0.0, 1.0 + top * FL - 1.0, -0.6, 14.0, 1.0)


def hotel_c(p, s):
    r = random.Random(43)
    W, D, NF = 48.0, 16.0, 6
    H = NF * FL + 1.0
    p.box(WHITE_B, -W / 2, 0, 0, W / 2, H, D)
    p.box('windowDim', -14.0, 0.2, -0.06, 14.0, 4.2, 0.0, col='flat:#6c8794')
    p.box(TEAK, -15.0, 4.4, -3.4, 15.0, 4.7, 0.0)
    for k in range(1, NF):
        y = 1.0 + k * FL
        p.box(WHITE_B, -W / 2, y, -2.4, W / 2, y + 0.3, 0.0)
        p.box('glassTint', -W / 2, y + 0.3, -2.36, W / 2, y + 1.3, -2.3)
        for c in rows(-W / 2 + 1.0, W / 2 - 1.0, 4.0):
            quad(p, WINDOW, 'f', c - 1.5, c + 1.5, y + 0.4, y + 2.8, -0.02, col=GLASS_V)
            for k2 in range(5):
                xx = c + 1.6 + k2 * 0.12
                if xx < W / 2 - 0.2:
                    p.box(TEAK, xx, y + 0.3, -0.25, xx + 0.05, y + FL, -0.05)
    hotel_sides(p, r, W, D, 1.0 + FL, NF - 1, TEAK, side_balc=False)
    # The roof pergola.
    for x in rows(-W / 2 + 4, W / 2 - 4, 3.0):
        p.box(TEAK, x - 0.08, H, 3.0, x + 0.08, H + 2.6, D - 3.0)
    for z in (3.0, D - 3.0):
        p.box(TEAK, -W / 2 + 4, H + 2.4, z - 0.1, W / 2 - 4, H + 2.6, z + 0.1)
    mark('name', 0.0, 5.3, -0.2, 14.0, 1.0)


AWNINGS = [('#c8102e', '#f4f1e8'), ('#1f5fa8', '#f4f1e8'), ('#2a9d9a', '#f4f1e8'), ('#e6a700', '#3a3d41'), ('#12382c', '#e9dcc0')]
WALLS = ['flat:#f2f0ea', 'flat:#e9dcc0', 'flat:#d8e4e8', 'flat:#f0d8c8', 'flat:#cfe0d4']


def shop(p, s, W, seed):
    r = random.Random(seed)
    D, H = 12.0, 8.4
    wall = r.choice(WALLS)
    p.box(wall, -W / 2, 0, 0, W / 2, H, D)
    p.box(FRAME, -W / 2, 0, -0.08, -W / 2 + 0.3, 3.6, 0.0)
    p.box(FRAME, W / 2 - 0.3, 0, -0.08, W / 2, 3.6, 0.0)
    # The open shopfront: a counter, the shop's dark interior, a lit ceiling.
    p.box('windowDim', -W / 2 + 0.3, 1.0, -0.04, W / 2 - 0.3, 3.2, 0.0, col='flat:#4a5a5e')
    p.box(r.choice(['wood:#8a6a4a', 'flat:#e9e7e0']), -W / 2 + 0.6, 0, -0.5, W / 2 - 0.6, 1.0, 0.0)
    p.box('light', -W / 2 + 0.4, 3.24, -0.3, W / 2 - 0.4, 3.3, -0.04)
    fascia(s, -W / 2 + 0.3, W / 2 - 0.3, 3.55, 4.4, -0.02, r=r)
    mark('sign', 0.0, 3.98, -0.15, W - 0.6, 0.85)
    # The striped awning.
    a, b2 = r.choice(AWNINGS)
    n = int(W / 0.8)
    for k in range(n):
        x0 = -W / 2 + 0.3 + k * (W - 0.6) / n
        x1 = -W / 2 + 0.3 + (k + 1) * (W - 0.6) / n
        p.prism('flat:' + (a if k % 2 == 0 else b2), [(0.0, 3.45), (-1.8, 2.95), (-1.8, 3.05), (0.0, 3.55)], 'x', x0, x1)
    # Upstairs: a café terrace behind a glass rail, or a band of windows.
    if r.random() < 0.5:
        p.box(wall, -W / 2, 4.5, -1.4, W / 2, 4.7, 0.0)
        p.box('glassTint', -W / 2 + 0.2, 4.7, -1.38, W / 2 - 0.2, 5.7, -1.32)
        p.box('windowDim', -W / 2 + 0.6, 4.9, -0.04, W / 2 - 0.6, 7.4, 0.0, col='flat:#5a6b70')
    else:
        for c in rows(-W / 2 + 0.6, W / 2 - 0.6, 2.4):
            quad(p, WINDOW, 'f', c - 0.8, c + 0.8, 5.0, 7.2, -0.02, col=GLASS_V)
    p.box(FRAME, -W / 2 - 0.1, H, -0.3, W / 2 + 0.1, H + 0.35, D)
    service_back(p, -W / 2, W / 2, D, H, r)


VARIANTS = [
    dict(id='hotel_a', w=40.0, d=18.0, h=43.0, fn=hotel_a, gap=10.0, lo=dict(wall=WHITE_B, W=40.0, D=18.0, H=11 * FL + 1.0, y0=1.0 + FL, nf=10, fh=FL, cap=NAVY_B, base='flat:#6c8794', band=WHITE_B)),
    dict(id='hotel_b', w=30.0, d=18.0, h=52.0, fn=hotel_b, gap=10.0, lo=dict(wall=WHITE_B, W=30.0, D=18.0, H=15 * FL + 1.0, y0=1.0 + FL, nf=14, fh=FL, cap=NAVY_B, base='flat:#6c8794')),
    dict(id='hotel_c', w=48.0, d=16.0, h=24.0, fn=hotel_c, gap=10.0, lo=dict(wall=WHITE_B, W=48.0, D=16.0, H=6 * FL + 1.0, y0=1.0 + FL, nf=5, fh=FL, cap=WHITE_B, base='flat:#6c8794', band=WHITE_B)),
    dict(id='shop_8', w=8.0, d=12.0, h=8.8, fn=lambda p, s: shop(p, s, 8.0, 51), gap=4.0),
    dict(id='shop_10', w=10.0, d=12.0, h=8.8, fn=lambda p, s: shop(p, s, 10.0, 53), gap=4.0),
    dict(id='shop_12', w=12.0, d=12.0, h=8.8, fn=lambda p, s: shop(p, s, 12.0, 57), gap=4.0),
]


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    v['fn'](body, signs)
    return body, signs


def build_lo(v):
    return lo_slab(**v['lo']) if v.get('lo') else None


if __name__ == '__main__':
    run('bayside', VARIANTS, build_hi, build_lo)
    write_anchors('bayside')
