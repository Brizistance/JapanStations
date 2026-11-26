# Builds generic town buildings for the inland blocks of any newer district (first used at Shiomi, 2026-11-25), so a
# street of flats is not one apartment block over and over. No name or brand is in them (the game letters the marks).
#
#   blender --background --python tools/blender/build_town.py
#
# Writes assets/buildings/town.blend, public/models/buildings/town.glb and src/stations/anchors/town.ts.
#
# Every one is 14 m deep (it stands where Minato Center's pb bars do) with its front at z = 0 facing -z, origin
# mid-frontage. Widths are multiples of 4 so they tile with the bars.
#
#   fos16a/b, fos20a/b, fos24a/b   flats over shops: a row of shops, a café or a clinic on the street storey and the
#           flats' lobby at one end; flats above with solid balconies, railed balconies or framed windows and small
#           balconies; a blade sign on some. a = lower (5–7 floors), b = taller (8–10).
#   danchi24, danchi32   1970s walk-up public flats, 4 and 5 floors: open access corridors behind concrete parapets
#           on the street side, steel doors, a stair tower with its breeze-block screen, weathered panels; balconies of
#           washing on the back; an elevated water tank; `num` the block number painted on the end wall.
#   danchi28 the same 8 floors high, with a lift tower.
#   off16, off20   small office buildings, 7 and 9 floors: ribbon windows or punched windows on tiled walls, a glass
#           entrance, a shop beside it; an escape stair on the back. `name` the board over the entrance.
#   clinic16   a 4-floor clinic building: frosted glass, the green cross on a blade, a ramp; `name` its fascia.
#   juku20   a 5-floor cram school: big windows with banners in them, a blade sign; `name` its fascia.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403
from detailkit import *  # noqa: E402,F401,F403

D = 14.0
PALETTES = [
    # wall, accent, tile (ground storey, bands, parapet caps). Mid tones: the noon light washes pale ones out.
    ('flat:#e9e4d8', 'flat:#8a5a44', 'flat:#b8a58a'),   # white render, brown trim
    ('flat:#c9b08f', 'flat:#3d4a55', 'flat:#9f8f78'),   # sand tile
    ('flat:#a9b1b3', 'flat:#2f5e6e', 'flat:#7f888b'),   # mid grey
    ('flat:#e3c9b4', 'flat:#b0553a', 'flat:#b79a80'),   # pink-beige, terracotta
    ('flat:#9c6b55', 'flat:#efe7dc', 'flat:#7a4f3e'),   # brown tile, cream trim
    ('flat:#c8d1c0', 'flat:#5f6d4c', 'flat:#9aa38e'),   # sage
    ('flat:#d8cdb6', 'flat:#1f3550', 'flat:#a59680'),   # cream, navy
    ('flat:#b7c3cf', 'flat:#e9e4d8', 'flat:#8d9aa6'),   # pale blue-grey
]
AWN = ['#8f2020', '#12382c', '#1f3f7a', '#3a3d41', '#b35a1c', '#2a9d9a']


def shop_unit(p, s, r, x0, x1, G, kind):
    """One shop on the street storey, x0 … x1 at the front z = 0."""
    if kind == 'cafe':
        p.box('windowDim', x0 + 0.3, 0.3, -0.04, x1 - 0.3, G - 1.2, 0.0, col='flat:#6a5a48')
        p.box('wood:#8a6a4a', x0 + 0.3, 0, -0.1, x1 - 0.3, 0.3, 0.0)
        for c in rows(x0 + 0.3, x1 - 0.3, 1.2):
            p.box('wood:#6b4e36', c - 0.04, 0.3, -0.08, c + 0.04, G - 1.2, -0.02)
        a = r.choice(AWN)
        p.prism('flat:' + a, [(0.0, G - 1.15), (-1.5, G - 1.7), (-1.5, G - 1.6), (0.0, G - 1.05)], 'x', x0 + 0.2, x1 - 0.2)
        # a menu board and a planter by the door
        p.box('flat:#2b2b28', x0 + 0.5, 0, -0.9, x0 + 1.1, 1.0, -0.75)
        p.box('flat:#8a6a4a', x1 - 1.2, 0, -0.7, x1 - 0.4, 0.5, -0.1)
        p.box(HEDGE, x1 - 1.15, 0.5, -0.65, x1 - 0.45, 1.0, -0.15)
    elif kind == 'clinic':
        p.box('flat:#f2f1ec', x0, 0, -0.06, x1, G - 1.0, 0.0)
        fwin(p, r, 'f', x0 + 0.6, x1 - 2.4, 0.9, G - 1.5, 0.0, ALU, GLASS_LW, curtain=False, n=0.06)
        p.box(GLASS_L, x1 - 2.1, 0.0, -0.1, x1 - 0.5, 2.5, -0.06)
        p.box(ALU, x1 - 2.2, 2.5, -0.12, x1 - 0.4, 2.6, -0.06)
        # the green cross on a little blade
        cx = x0 + 0.4
        p.box('flat:#f4f4f0', cx - 0.06, G - 0.9, -1.0, cx + 0.06, G + 0.1, -0.2)
        for (a0, b0, a1, b1) in ((-0.15, -0.35, 0.15, 0.35), (-0.35, -0.15, 0.35, 0.15)):
            p.box('flat:#2e9d5b', cx - 0.08, G - 0.4 + b0, -0.6 + a0, cx + 0.08, G - 0.4 + b1, -0.6 + a1)
    else:
        display(p, x0 + 0.3, x1 - 0.3, 0.0, G - 1.2, 0.0)
        if r.random() < 0.5:
            a = r.choice(AWN)
            p.prism('flat:' + a, [(0.0, G - 1.15), (-1.3, G - 1.7), (-1.3, G - 1.6), (0.0, G - 1.05)], 'x', x0 + 0.3, x1 - 0.3)
    fascia(s, x0 + 0.3, x1 - 0.3, G - 1.05, G - 0.2, 0.0, r=r)
    p.box(FRAME, x1 - 0.15, 0, -0.1, x1 + 0.15, G, 0.0)


def fos(p, s, W, nf, seed):
    r = random.Random(seed)
    wall, acc, tile = r.choice(PALETTES)
    G, FH = 4.2, 2.95
    H = G + nf * FH
    x0, x1 = -W / 2, W / 2
    style = r.choice(['balc', 'rail', 'win'])
    zf = 0.0 if style == 'win' else 1.2       # the flats' front wall
    setback = r.random() < 0.4 and nf >= 6
    top = nf - 1 if setback else nf
    p.box(wall, x0, G, zf, x1, G + top * FH, D)
    if setback:
        p.box(wall, x0, G + top * FH, zf + 2.4, x1, H, D)
        p.box('flat:#dcdad2', x0, G + top * FH - 0.18, 0.0, x1, G + top * FH, zf + 2.4)
        p.box('glassTint', x0 + 0.1, G + top * FH, 0.04, x1 - 0.1, G + top * FH + 1.05, 0.1)
        for c in rows(x0 + 1.5, x1 - 1.5, 4.0):
            fwin(p, r, 'f', c - 1.3, c + 1.3, G + top * FH + 0.1, G + top * FH + 2.3, zf + 2.4)
    # The street storey: tile, the lobby at one end, shops along the rest.
    p.box(tile, x0, 0, 0.0, x1, G, D)
    p.box(acc, x0, G - 0.2, -0.12, x1, G, zf + 0.01)
    lob = 3.4
    left = r.random() < 0.5
    lx0, lx1 = (x0, x0 + lob) if left else (x1 - lob, x1)
    p.box(GLASS_L, lx0 + 0.5, 0, 0.6, lx1 - 0.5, 2.9, 0.65)
    p.box(ALU, lx0 + 0.4, 2.9, 0.55, lx1 - 0.4, 3.05, 0.7)
    p.box('flat:#9aa0a6', lx0 + 0.6, 0.9, 2.5, lx1 - 0.6, 2.1, 2.7)   # the mailbox wall seen through the door
    p.box('flat:#cfcac0', lx0, 0, 0.0, lx1, 0.03, 0.6)
    p.box(WHITE, lx0 - 0.2, 3.2, -1.0, lx1 + 0.2, 3.4, 0.6)
    p.box('light', lx0 + 0.3, 3.16, -0.8, lx1 - 0.3, 3.2, 0.4)
    sx0, sx1 = (lx1, x1) if left else (x0, lx0)
    n = max(1, round((sx1 - sx0) / 6.2))
    kinds = ['shop', 'shop', 'cafe', 'clinic']
    for i in range(n):
        shop_unit(p, s, r, sx0 + i * (sx1 - sx0) / n, sx0 + (i + 1) * (sx1 - sx0) / n, G, r.choice(kinds))
    if r.random() < 0.6:
        bx = sx0 + 0.6 if left else sx1 - 0.6
        blade(s, bx, G + 0.4, G + min(3, nf) * FH - 0.4, z=0.0, w=0.8, r=r)
    # The flats' street face, a flat to every ~6 m.
    nu = max(2, round(W / 6.0))
    uw = W / nu
    for k in range(top):
        y = G + k * FH
        for i in range(nu):
            u0, u1 = x0 + i * uw, x0 + (i + 1) * uw
            if style == 'win':
                fwin(p, r, 'f', u0 + 0.6, u0 + uw * 0.55, y + 0.15, y + 2.3, 0.0)
                juliet(p, 'f', u0 + 0.4, u0 + uw * 0.55 + 0.2, y, 0.0)
                fwin(p, r, 'f', u1 - 1.6, u1 - 0.7, y + 1.0, y + 2.2, 0.0, mull=False)
                if r.random() < 0.5:
                    ac(p, 'f', u1 - 1.15, y + 0.15, 0.0)
            else:
                fwin(p, r, 'f', u0 + 0.4, u1 - 1.6, y + 0.1, y + 2.3, zf)
                fwin(p, r, 'f', u1 - 1.35, u1 - 0.45, y + 0.95, y + 2.2, zf, mull=False)
                acu(p, u1 - 1.4, y, zf - 0.08)
                if style == 'balc':
                    solid_balcony(p, r, 'f', u0, u1, y, zf, wall, acc if k == top - 1 else None)
                else:
                    wb(p, 'flat:#dcdad2', 'f', u0, u1, y - 0.16, y, zf, 0.0, 1.2)
                    wb(p, RAIL, 'f', u0, u1, y + 1.0, y + 1.07, zf, 1.12, 1.2)
                    for c in rows(u0, u1, 0.3):
                        wb(p, RAIL, 'f', c - 0.012, c + 0.012, y, y + 1.0, zf, 1.14, 1.17)
                    wb(p, 'flat:#e3e6e8', 'f', u0 - 0.03, u0 + 0.03, y, y + 2.2, zf, 0.0, 1.2)
                    if r.random() < 0.4:
                        c = r.uniform(u0 + 0.4, u1 - 1.5)
                        wb(p, r.choice(LAUNDRY), 'f', c, c + 0.8, y + 1.2, y + 1.95, zf, 0.6, 0.62)
                    if r.random() < 0.3:
                        c = r.uniform(u0 + 0.4, u1 - 1.2)
                        wb(p, 'flat:#8a6a4a', 'f', c, c + 0.4, y, y + 0.35, zf, 0.4, 0.8)
                        wb(p, HEDGE, 'f', c - 0.1, c + 0.5, y + 0.35, y + 0.9, zf, 0.35, 0.85)
    for c in (x0, x1 - 0.25):
        p.box(tile, c, G, zf - (0 if style == 'win' else 1.2), c + 0.25, G + top * FH, zf)
    # Sides and back.
    side_wall(p, r, 'l', zf + 0.5, D - 0.5, x0, G, top, FH, wall, acc, band=tile if r.random() < 0.5 else None, bay=3.0)
    side_wall(p, r, 'r', zf + 0.5, D - 0.5, x1, G, top, FH, wall, acc, bay=3.0)
    side_wall(p, r, 'b', x0 + 0.5, x1 - 0.5, D, G, top, FH, wall, None, bay=3.0)
    service_back(p, x0, x1, D, G, r)
    roof_kit(p, r, x0, x1, zf + (2.4 if setback else 0.0), D, H, acc, cap=tile, units=2 + r.randrange(3))


DANCHI = [('flat:#d9ccb0', 'flat:#8fa7b8'), ('flat:#c9c6b4', 'flat:#b98a6a'), ('flat:#cfd2c2', 'flat:#7f9a86')]


def danchi(p, s, W, nf, seed, lift=False):
    r = random.Random(seed)
    wall, door = r.choice(DANCHI)
    stain = 'flat:#bdb5a3'
    P, FH = 0.6, 2.75
    H = P + nf * FH
    x0, x1 = -W / 2, W / 2
    zc, zb = 1.6, 12.0                    # the corridor's wall and the back wall
    st0 = x1 - 3.6                         # the stair tower at the +x end
    p.box('flat:#a9a59b', x0, 0, 0.0, x1, P, D)
    p.box(wall, x0, P, zc, x1, H, zb)
    # The stair tower, its front a breeze-block screen.
    p.box(wall, st0, 0, -0.6, x1, H + 1.4, zc)
    for k in range(int((H - 1.0) / 0.45)):
        for j in range(6):
            p.box(DARK, st0 + 0.45 + j * 0.5, 1.0 + k * 0.45, -0.62, st0 + 0.75 + j * 0.5, 1.25 + k * 0.45, -0.6)
    p.box(stain, st0, H + 1.2, -0.62, x1, H + 1.4, zc)
    if lift:
        lx = (x0 + st0) / 2
        p.box(wall, lx - 1.8, 0, -1.8, lx + 1.8, H + 2.6, zc)
        p.box(FRAME, lx - 0.6, P, -1.82, lx + 0.6, P + 2.1, -1.8)
        p.box(stain, lx - 1.8, H + 2.4, -1.82, lx + 1.8, H + 2.6, zc)
    nu = max(2, round((st0 - x0) / 5.4))
    uw = (st0 - x0) / nu
    for k in range(nf):
        y = P + k * FH
        # The access corridor and its concrete parapet.
        p.box('flat:#cfcbbf', x0, y - 0.2, 0.0, st0, y, zc)
        p.box(wall, x0, y, 0.0, st0, y + 1.1, 0.16)
        p.box('flat:#cdc6b6', x0, y + 1.1, -0.02, st0, y + 1.18, 0.18)
        for j in range(r.randint(2, 5)):
            c = r.uniform(x0 + 0.5, st0 - 0.5)
            p.box(stain, c, y - 0.6, -0.015, c + r.uniform(0.08, 0.25), y + 0.05, 0.0)
        for i in range(nu):
            u0 = x0 + i * uw
            if lift and abs(u0 + uw / 2 - (x0 + st0) / 2) < uw / 2:
                continue
            p.box(FRAME, u0 + 0.6, y, zc - 0.03, u0 + 1.55, y + 2.0, zc)
            p.box(door, u0 + 0.65, y + 0.02, zc - 0.05, u0 + 1.5, y + 1.96, zc - 0.03)
            fwin(p, r, 'f', u0 + 2.2, u0 + 3.4, y + 1.1, y + 2.0, zc, ALU_DK, GLASS_LW, sill=False, curtain=False)
            for c in (2.5, 2.8, 3.1):
                p.box(ALU, u0 + c - 0.015, y + 1.08, zc - 0.1, u0 + c + 0.015, y + 2.02, zc - 0.06)
            p.box('flat:#d4cdbd', u0 + 3.8, y + 0.4, zc - 0.2, u0 + 4.4, y + 1.5, zc)   # the meter cupboard
    # Ground storey: a few flats behind the corridor wall, the stair's way in.
    p.box(DARK, st0 + 1.0, 0, -0.64, st0 + 2.6, 2.2, -0.6)
    # The end wall with its painted number.
    p.box(wall, x0 - 0.02, P + (nf - 2) * FH, 4.0, x0, P + nf * FH - 0.3, 9.6)
    mark('num', x0 - 0.04, P + (nf - 1) * FH, 6.8, 4.0, 2.4, (-1, 0))
    for c in (4.5, 9.2):
        for k in range(nf - 2):
            fwin(p, r, 'l', c - 0.4, c + 0.4, P + k * FH + 1.0, P + k * FH + 2.0, x0, ALU_DK, GLASS_L, mull=False)
    pipe(p, 'l', zb - 0.3, 0.0, H, x0)
    # The back: a balcony to every flat, washing, AC units, a dish here and there.
    for k in range(nf):
        y = P + k * FH
        for i in range(nu):
            u0, u1 = x0 + i * uw, x0 + (i + 1) * uw
            fwin(p, r, 'b', u0 + 0.4, u1 - 1.4, y + 0.1, y + 2.1, zb, ALU_DK)
            solid_balcony(p, r, 'b', u0, u1, y, zb, wall, depth=1.3)
            acu(p, u1 - 1.3, y, zb + 0.5, out=1)
            if r.random() < 0.12:
                p.cyl('flat:#e9e7e0', (u1 - 0.5, y + 1.7, zb + 1.2), 2, 0.32, 0.06, seg=10)
            if r.random() < 0.3:
                p.box('flat:#8a6a4a', u0 + 0.5, y, zb + 0.7, u0 + 0.9, y + 0.35, zb + 1.1)
                p.box(HEDGE, u0 + 0.4, y + 0.35, zb + 0.65, u0 + 1.0, y + 0.85, zb + 1.15)
            p.box('flat:#cfcbbf', u0 - 0.04, y, zb, u0 + 0.04, y + 2.2, zb + 1.3)
    # The roof: an elevated tank on a tall frame, aerials.
    for a, b_, c, d in ((x0, zc, x1, zc + 0.2), (x0, zb - 0.2, x1, zb), (x0, zc, x0 + 0.2, zb), (x1 - 0.2, zc, x1, zb)):
        p.box(wall, a, H, b_, c, H + 0.6, d)
    tx, tz = x0 + 5.0, (zc + zb) / 2
    for dx in (-1.2, 1.2):
        for dz in (-1.2, 1.2):
            p.box(STEEL, tx + dx - 0.06, H, tz + dz - 0.06, tx + dx + 0.06, H + 3.2, tz + dz + 0.06)
    p.box(STEEL, tx - 1.4, H + 3.2, tz - 1.4, tx + 1.4, H + 3.32, tz + 1.4)
    p.box('flat:#c9c4b4', tx - 1.3, H + 3.32, tz - 1.3, tx + 1.3, H + 5.2, tz + 1.3)
    for k in range(r.randint(2, 4)):
        ax = x0 + 9 + k * 4.5
        if ax > st0 - 1:
            break
        p.cyl(STEEL, (ax, H + 1.6, zb - 2.0), 1, 0.03, 3.2, seg=6)
        for y in (H + 2.4, H + 3.0):
            p.box(STEEL, ax - 0.6, y, zb - 2.02, ax + 0.6, y + 0.03, zb - 1.98)
    # Behind: a bicycle shed on the back apron.
    p.box('flat:#a9a59b', x0, 0, zb, x1, 0.04, D)
    for x in rows(x0 + 1, x0 + min(W - 2, 12), 3.0):
        p.box(STEEL, x - 0.04, 0, D - 0.4, x + 0.04, 2.2, D - 0.32)
    p.box('flat:#9aa3a6', x0 + 0.5, 2.2, zb + 1.6, x0 + min(W - 1, 12.5), 2.28, D - 0.1)


def office(p, s, W, nf, seed):
    r = random.Random(seed)
    wall, acc, tile = r.choice(PALETTES)
    G, FH = 4.4, 3.6
    H = G + nf * FH
    x0, x1 = -W / 2, W / 2
    p.box(wall, x0, G, 0.0, x1, H, D)
    p.box(tile, x0, 0, 0.0, x1, G, D)
    style = r.choice(['ribbon', 'punched'])
    for k in range(nf):
        y = G + k * FH
        if style == 'ribbon':
            p.box(tile, x0, y, -0.12, x1, y + 0.85, 0.0)
            pane(p, 'f', x0 + 0.4, x1 - 0.4, y + 0.85, y + FH - 0.45, 0.0, 0.02, GLASS_L)
            for c in rows(x0 + 0.4, x1 - 0.4, 1.6) + [x0 + 0.4, x1 - 0.4]:
                wb(p, ALU, 'f', c - 0.04, c + 0.04, y + 0.85, y + FH - 0.45, 0.0, 0.0, 0.08)
            # blinds part drawn in some bays
            for c in rows(x0 + 0.4, x1 - 0.4, 3.2):
                if r.random() < 0.5:
                    wb(p, 'flat:#e2e2dc', 'f', c - 1.5, c + 1.5, y + FH - 0.45 - r.uniform(0.3, 1.4), y + FH - 0.45, 0.0, 0.03, 0.035)
            p.box(tile, x0, y + FH - 0.45, -0.12, x1, y + FH, 0.0)
        else:
            for c in rows(x0 + 0.8, x1 - 0.8, 2.4):
                fwin(p, r, 'f', c - 0.8, c + 0.8, y + 0.7, y + FH - 0.5, 0.0, ALU_DK, GLASS_L, curtain=False)
    # A name board over the entrance, a glass way in, a small shop beside it.
    ex = x0 + 3.0 if r.random() < 0.5 else x1 - 3.0
    p.box('flat:#5e5f5c', ex - 2.2, 0, -0.3, ex + 2.2, G, 0.0)
    p.box(GLASS_L, ex - 1.6, 0, -0.34, ex + 1.6, 3.0, -0.3)
    p.box(ALU, ex - 0.03, 0, -0.38, ex + 0.03, 3.0, -0.33)
    board(p, 'name', 'f', ex - 2.0, ex + 2.0, 3.35, 4.1, -0.3, 'flat:#f4f1e8', 0.05)
    p.box('light', ex - 2.0, 3.12, -1.2, ex + 2.0, 3.16, -0.3)
    p.box(acc, ex - 2.3, 3.16, -1.4, ex + 2.3, 3.3, -0.3)
    sx0, sx1 = (ex + 2.4, x1) if ex < 0 else (x0, ex - 2.4)
    if sx1 - sx0 > 4:
        shop_unit(p, s, r, sx0, sx1, G, r.choice(['shop', 'cafe']))
    p.box(acc, x0, G - 0.25, -0.15, x1, G, 0.0)
    blade(s, x1 - 0.5 if ex < 0 else x0 + 0.5, G + 0.5, G + min(nf, 5) * FH - 0.5, z=0.0, w=0.9, r=r)
    side_wall(p, r, 'l', 0.6, D - 0.6, x0, G, nf, FH, wall, acc, kind='office', bay=3.2)
    side_wall(p, r, 'r', 0.6, 9.0, x1, G, nf, FH, wall, acc, kind='office', bay=3.2)
    ext_stair(p, 'r', 9.6, D - 0.4, x1, G + (nf - 1) * FH, FH)
    side_wall(p, r, 'b', x0 + 0.6, x1 - 0.6, D, G, nf, FH, wall, None, kind='office', bay=3.2)
    service_back(p, x0, x1, D, G, r)
    roof_kit(p, r, x0, x1, 0.0, D, H, acc, cap=tile, units=4)
    plant(p, x0 + 1, x1 - 1, H, 2.0, D - 1.0, seed=seed)


def clinic(p, s, W, nf, seed):
    r = random.Random(seed)
    wall, acc, tile = 'flat:#f2f1ec', 'flat:#2e9d5b', 'flat:#c9c6bc'
    G, FH = 4.0, 3.3
    H = G + nf * FH
    x0, x1 = -W / 2, W / 2
    p.box(wall, x0, 0, 0.0, x1, H, D)
    p.box(tile, x0, 0, -0.04, x1, 0.6, D)
    # The clinic on the street storey: frosted windows, the doors up a ramp, the cross.
    fwin(p, r, 'f', x0 + 0.8, x0 + 8.0, 1.0, 3.0, 0.0, ALU, GLASS_LW, curtain=False)
    p.box(GLASS_L, x1 - 5.6, 0.45, -0.06, x1 - 3.0, 3.0, 0.0)
    p.box(ALU, x1 - 4.33, 0.45, -0.1, x1 - 4.27, 3.0, -0.05)
    p.box(tile, x1 - 6.0, 0, -1.8, x1 - 2.6, 0.45, -0.04)
    p.prism(tile, [(-1.8, 0.0), (-0.3, 0.0), (-0.3, 0.45)], 'x', x1 - 2.6, x1 - 0.3)   # the ramp
    for x in (x1 - 2.6, x1 - 0.3):
        p.box(ALU, x - 0.03, 0.45, -1.7, x + 0.03, 1.3, -0.3)
    p.box(WHITE, x1 - 6.2, 3.2, -1.4, x1 - 2.4, 3.4, 0.0)
    board(p, 'name', 'f', x0 + 0.6, x1 - 0.6, 3.45, 3.95, 0.0, 'flat:#ffffff', 0.12)
    cx = x0 + 0.3
    p.box('flat:#f4f4f0', cx - 0.06, 4.6, -1.3, cx + 0.06, 6.0, -0.2)
    for (a0, b0, a1, b1) in ((-0.17, -0.45, 0.17, 0.45), (-0.45, -0.17, 0.45, 0.17)):
        p.box(acc, cx - 0.08, 5.3 + b0, -0.75 + a0, cx + 0.08, 5.3 + b1, -0.75 + a1)
    # Upstairs: more clinics and offices, each floor its own windows; a tenant board.
    for k in range(nf):
        y = G + k * FH
        p.box(acc if k == 0 else tile, x0, y - 0.1, -0.08, x1, y + 0.1, 0.0)
        kind = r.choice(['wide', 'pair'])
        for c in rows(x0 + 0.8, x1 - 0.8, 3.0):
            if kind == 'wide':
                fwin(p, r, 'f', c - 1.2, c + 1.2, y + 0.9, y + 2.6, 0.0, ALU, GLASS_L if r.random() < 0.6 else GLASS_LW, curtain=False)
            else:
                fwin(p, r, 'f', c - 1.15, c - 0.1, y + 1.0, y + 2.5, 0.0, ALU, GLASS_L, mull=False)
                fwin(p, r, 'f', c + 0.1, c + 1.15, y + 1.0, y + 2.5, 0.0, ALU, GLASS_L, mull=False)
    blade(s, x1 - 0.4, G + 0.5, H - 1.0, z=0.0, w=0.8, col='#f4f1e8', r=r)
    side_wall(p, r, 'l', 0.6, D - 0.6, x0, G, nf, FH, wall, acc, kind='office', bay=3.0)
    side_wall(p, r, 'r', 0.6, D - 0.6, x1, G, nf, FH, wall, None, kind='office', bay=3.0)
    side_wall(p, r, 'b', x0 + 0.6, x1 - 4.0, D, G, nf, FH, wall, None, kind='flats', bay=3.0)
    ext_stair(p, 'b', x1 - 3.6, x1 - 0.4, D, G + (nf - 1) * FH, FH)
    roof_kit(p, r, x0, x1, 0.0, D, H, tile, units=3)


def juku(p, s, W, nf, seed):
    r = random.Random(seed)
    wall, acc, tile = 'flat:#e8e6df', 'flat:#1f5fa8', 'flat:#b9b6ad'
    G, FH = 4.2, 3.4
    H = G + nf * FH
    x0, x1 = -W / 2, W / 2
    p.box(wall, x0, G, 0.0, x1, H, D)
    p.box(tile, x0, 0, 0.0, x1, G, D)
    # Big classroom windows, banners stuck in them (the school's colours and a yellow one).
    BAN = ['flat:#1f5fa8', 'flat:#f2c230', 'flat:#c8102e', 'flat:#ffffff']
    for k in range(nf):
        y = G + k * FH
        p.box(acc if k == 1 else tile, x0, y - 0.12, -0.08, x1, y + 0.12, 0.0)
        for c in rows(x0 + 0.6, x1 - 0.6, 3.6):
            fwin(p, r, 'f', c - 1.55, c + 1.55, y + 0.8, y + FH - 0.5, 0.0, ALU, GLASS_L, curtain=False)
            if r.random() < 0.55:
                bw = r.uniform(0.6, 1.2)
                bc = r.uniform(c - 1.4, c + 1.4 - bw)
                wb(p, r.choice(BAN), 'f', bc, bc + bw, y + 1.0, y + FH - 0.7, 0.0, 0.045, 0.05)
    board(p, 'name', 'f', x0 + 1.0, x1 - 1.0, G + FH + 2.95, G + FH + 3.25, 0.0, 'flat:#1f5fa8', 0.1)
    blade(s, x0 + 0.5, G + 0.6, H - 0.8, z=0.0, w=1.0, col='#1f5fa8', r=r)
    # Street storey: the entrance, a bike rack's roof, a small shop.
    p.box(GLASS_L, x0 + 2.0, 0, -0.05, x0 + 7.0, 3.2, 0.0)
    p.box(ALU, x0 + 4.47, 0, -0.1, x0 + 4.53, 3.2, -0.04)
    p.box(acc, x0 + 1.6, 3.3, -1.6, x0 + 7.4, 3.5, 0.0)
    p.box('light', x0 + 1.8, 3.26, -1.4, x0 + 7.2, 3.3, -0.2)
    shop_unit(p, s, r, x0 + 7.6, x1, G, 'shop')
    side_wall(p, r, 'l', 0.6, D - 0.6, x0, G, nf, FH, wall, acc, kind='office', bay=3.4)
    side_wall(p, r, 'r', 0.6, 9.0, x1, G, nf, FH, wall, None, kind='office', bay=3.4)
    ext_stair(p, 'r', 9.6, D - 0.4, x1, G + (nf - 1) * FH, FH)
    side_wall(p, r, 'b', x0 + 0.6, x1 - 0.6, D, G, nf, FH, wall, None, kind='office', bay=3.4)
    service_back(p, x0, x1, D, G, r)
    roof_kit(p, r, x0, x1, 0.0, D, H, acc, cap=tile, units=4)


def V(id_, w, h, fn, lo=None):
    return dict(id=id_, w=float(w), d=D, h=h, fn=fn, gap=4.0, lo=lo)


def fos_lo(W, nf, seed):
    wall, acc, tile = random.Random(seed).choice(PALETTES)
    return dict(wall=wall, W=W, D=D, H=4.2 + nf * 2.95, y0=4.2, nf=nf, fh=2.95, cap=tile, base=tile, band='flat:#dcdad2')


def off_lo(W, nf, seed):
    wall, acc, tile = random.Random(seed).choice(PALETTES)
    return dict(wall=wall, W=W, D=D, H=4.4 + nf * 3.6, y0=4.4, nf=nf, fh=3.6, cap=tile, base=tile)


def danchi_lo(W, nf, seed):
    wall, door = random.Random(seed).choice(DANCHI)
    return dict(wall=wall, W=W, D=12.0, H=0.6 + nf * 2.75, y0=0.6, nf=nf, fh=2.75, cap=wall, band='flat:#cfcbbf', z0=1.6)


VARIANTS = [
    V('fos16a', 16, 4.2 + 5 * 2.95 + 5, lambda p, s: fos(p, s, 16.0, 5, 701), fos_lo(16.0, 5, 701)),
    V('fos16b', 16, 4.2 + 8 * 2.95 + 5, lambda p, s: fos(p, s, 16.0, 8, 702), fos_lo(16.0, 8, 702)),
    V('fos20a', 20, 4.2 + 6 * 2.95 + 5, lambda p, s: fos(p, s, 20.0, 6, 703), fos_lo(20.0, 6, 703)),
    V('fos20b', 20, 4.2 + 9 * 2.95 + 5, lambda p, s: fos(p, s, 20.0, 9, 704), fos_lo(20.0, 9, 704)),
    V('fos24a', 24, 4.2 + 7 * 2.95 + 5, lambda p, s: fos(p, s, 24.0, 7, 705), fos_lo(24.0, 7, 705)),
    V('fos24b', 24, 4.2 + 10 * 2.95 + 5, lambda p, s: fos(p, s, 24.0, 10, 706), fos_lo(24.0, 10, 706)),
    V('danchi24', 24, 0.6 + 4 * 2.75 + 6, lambda p, s: danchi(p, s, 24.0, 4, 711), danchi_lo(24.0, 4, 711)),
    V('danchi32', 32, 0.6 + 5 * 2.75 + 6, lambda p, s: danchi(p, s, 32.0, 5, 712), danchi_lo(32.0, 5, 712)),
    V('danchi28', 28, 0.6 + 8 * 2.75 + 6, lambda p, s: danchi(p, s, 28.0, 8, 713, lift=True), danchi_lo(28.0, 8, 713)),
    V('off16', 16, 4.4 + 7 * 3.6 + 6, lambda p, s: office(p, s, 16.0, 7, 721), off_lo(16.0, 7, 721)),
    V('off20', 20, 4.4 + 9 * 3.6 + 6, lambda p, s: office(p, s, 20.0, 9, 722), off_lo(20.0, 9, 722)),
    V('clinic16', 16, 4.0 + 4 * 3.3 + 5, lambda p, s: clinic(p, s, 16.0, 4, 731), dict(wall='flat:#f2f1ec', W=16.0, D=D, H=4.0 + 4 * 3.3, y0=4.0, nf=4, fh=3.3, cap='flat:#c9c6bc', base='flat:#c9c6bc')),
    V('juku20', 20, 4.2 + 5 * 3.4 + 5, lambda p, s: juku(p, s, 20.0, 5, 741), dict(wall='flat:#e8e6df', W=20.0, D=D, H=4.2 + 5 * 3.4, y0=4.2, nf=5, fh=3.4, cap='flat:#1f5fa8', base='flat:#b9b6ad')),
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
    run('town', VARIANTS, build_hi, build_lo)
    write_anchors('town')
