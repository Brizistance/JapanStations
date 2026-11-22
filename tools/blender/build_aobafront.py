# Builds the buildings fronting Aobadai's station street, Kitaoka-dōri, and its two plazas (the
# 2026-11 rebuild): a private-railway hillside suburb of the 1930s-80s. Low buildings, nothing over
# five storeys: a bakery and a café in tiled shop houses, a clinic and pharmacy in white tile, a
# small credit union, low manshon with shops below, the old two-storey shōten under tiled eaves, and
# away from the station, houses behind stone walls and hedges.
#
#   blender --background --python tools/blender/build_aobafront.py -- [--renders <dir>]
#
# Writes assets/buildings/aobafront.blend, public/models/buildings/aobafront.glb and
# src/stations/anchors/aobafront.ts. Frame: front at z = 0 facing -z, origin mid-frontage; every
# piece is D deep (12 on the street, 10 on the plaza edges: the `_p` variants). Nothing carries a name.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

PLASTER = 'flat:#ece6d6'
CREAM = 'flat:#efe4c8'
SAGE = 'flat:#9fb39a'
TILE_RED = 'flat:#9a5a44'
TILE_BR = 'flat:#7a5a44'
ROOFTILE = 'flat:#3b3f45'
CEDAR = 'flat:#5a4030'
ISHI = 'flat:#9a948a'
ISHI_DK = 'flat:#7d776d'
WFRAME = 'flat:#5b4a36'
LEAFY = 'flat:#3f6b3a'
STONE = 'flat:#d9cdb4'
AWNS = ['#2f6b45', '#7a1f2b', '#1f3f7a', '#8a6a3a', '#3f4a3a']


def eave(p, x0, x1, y, z0, over=0.9, rise=0.6, mat=ROOFTILE):
    """A tiled pent roof along the front at height y, standing out `over`."""
    p.prism(mat, [(z0 + 0.2, y + rise), (z0 - over, y), (z0 - over, y - 0.12), (z0 + 0.2, y + rise - 0.12)], 'x', x0 - 0.15, x1 + 0.15)


def awning(p, x0, x1, y, col, depth=1.1, stripes=True):
    n = max(2, round((x1 - x0) / 0.9))
    for j in range(n):
        u0, u1 = x0 + (x1 - x0) * j / n, x0 + (x1 - x0) * (j + 1) / n
        c = 'flat:' + col if (j % 2 == 0 or not stripes) else 'flat:#f1ead8'
        p.face(c, [(u0, y, -0.02), (u1, y, -0.02), (u1, y - 0.5, -depth), (u0, y - 0.5, -depth)], (0, 0.9, -0.4))
        p.face(c, [(u1, y, -0.02), (u0, y, -0.02), (u0, y - 0.5, -depth), (u1, y - 0.5, -depth)], (0, -0.9, 0.4))


def sash(p, c, y, w=1.3, h=1.4, frame=WFRAME):
    win(p, c - w / 2, y, c + w / 2, y + h, 0, -1, frame)
    p.box(frame, c - 0.02, y, -0.08, c + 0.02, y + h, -0.05)


def flowerbox(p, c, y, w=1.2):
    p.box(CEDAR, c - w / 2, y - 0.25, -0.35, c + w / 2, y, -0.02)
    p.box(LEAFY, c - w / 2 + 0.05, y, -0.32, c + w / 2 - 0.05, y + 0.25, -0.05)
    for k in range(3):
        p.box(['flat:#d94f8a', 'flat:#f2c230', 'flat:#f4f1e8'][k], c - w / 2 + 0.2 + k * 0.35, y + 0.2, -0.3, c - w / 2 + 0.35 + k * 0.35, y + 0.32, -0.15)


def pan(p, s, v, r):
    """A bakery or café in a 1960s tiled shop house: a brick-tile base, a big shop window under a
    striped awning, cream plaster above with sash windows and flower boxes, a hipped tiled roof."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    base = v.get('wall', TILE_RED)
    p.box(base, x0, 0, 0, x1, 3.4, d)
    p.box(v.get('upper', CREAM), x0, 3.4, 0, x1, h, d)
    T_ = 'flat:#5a4030'
    p.box(T_, x0, 3.3, -0.06, x1, 3.45, 0)
    quad(p, 'windowDim', 'f', x0 + 0.5, x1 - 2.4, 0.5, 2.7, -0.02, col=WARM)
    for c in rows(x0 + 0.5, x1 - 2.4, 1.4):
        p.box(T_, c - 0.7, 0.5, -0.05, c - 0.66, 2.7, 0)
    p.box(ISHI_DK, x0 + 0.4, 0, -0.12, x1 - 2.3, 0.5, 0)
    for c in rows(x0 + 0.8, x1 - 2.6, 0.9):
        p.box('flat:#c89a5a', c - 0.3, 0.9, 0.1, c + 0.3, 1.1, 0.6)
        p.box('flat:#e2c08a', c - 0.25, 1.4, 0.1, c + 0.25, 1.55, 0.6)
    doors(p, x1 - 1.35, 0, 0, 1.0, 2.4, T_)
    awning(p, x0 + 0.2, x1 - 0.2, 3.25, v.get('awn', r.choice(AWNS)))
    board(p, 'name', 'f', x0 + 0.6, x1 - 0.6, 3.6, 4.3, 0, 'flat:#f4f1e8', 0.06)
    for c in rows(x0 + 0.6, x1 - 0.6, 2.4):
        sash(p, c, 4.8)
        flowerbox(p, c, 4.8)
    p.prism(ROOFTILE, [(-0.5, h), (d / 2, h + 1.8), (d + 0.5, h)], 'x', x0 - 0.5, x1 + 0.5)
    p.box(ROOFTILE, x0 - 0.5, h - 0.12, -0.5, x1 + 0.5, h, d + 0.5)
    mark('_eave', 0, h, -0.5, w + 1.0, 0.1)
    backs(p, w, d, [3.4, h], r, sides=(-1, 1), back=True)


def clinic(p, s, v, r):
    """A white-tiled clinic and pharmacy: glass street storey, ribbon windows, a vertical board, a
    green cross lamp on the corner, a frosted stair tower down one edge."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall = v.get('wall', 'flat:#eef0ec')
    p.box(wall, x0, 0, 0, x1, h, d)
    p.box(KICK, x0, 0, -0.04, x1, 0.4, d)
    quad(p, 'windowDim', 'f', x0 + 0.3, x1 - 2.4, 0.4, 2.9, -0.02, col='flat:#e9efe8')
    for c in rows(x0 + 0.3, x1 - 2.4, 2.2):
        p.box(ALU, c - 1.1, 0.4, -0.06, c - 1.06, 2.9, 0)
    doors(p, x0 + 2.0, 0, -0.03, 1.8, 2.5, ALU)
    p.box(ALU_DK, x0 - 0.05, 3.1, -1.2, x1 + 0.05, 3.25, 0)
    p.box('light', x0 + 0.3, 3.06, -1.0, x1 - 0.3, 3.1, -0.8)
    board(p, 'name', 'f', x0 + 0.4, x1 - 2.6, 3.4, 4.2, 0, 'flat:#f4f1e8', 0.08)
    floors = int((h - 4.0) / 3.2)
    for f in range(floors):
        y = 4.6 + f * 3.2
        quad(p, WINDOW, 'f', x0 + 0.5, x1 - 2.6, y + 0.6, y + 2.0, -0.01)
        p.box(SAGE, x0 + 0.3, y + 0.35, -0.12, x1 - 2.4, y + 0.55, 0)
    # The stair tower: frosted glass blocks.
    p.box('flat:#d8e2e0', x1 - 2.2, 0.4, -0.3, x1 - 0.2, h + 0.8, 0.6)
    for y in range(1, int(h)):
        p.box('flat:#c4cfcd', x1 - 2.2, y, -0.32, x1 - 0.2, y + 0.04, -0.3)
    board(p, 'vertical', 'f', x1 - 1.9, x1 - 0.5, 4.4, h - 0.6, -0.3, 'flat:#f4f1e8', 0.25)
    p.box('flat:#1d8a4e', x0 + 0.15, 3.5, -0.75, x0 + 0.65, 4.0, -0.55)
    p.box('light', x0 + 0.25, 3.6, -0.77, x0 + 0.55, 3.9, -0.75)
    p.box(ROOF, x0 - 0.05, h, -0.05, x1 + 0.05, h + 0.4, d + 0.05)
    acu(p, x0 + 1.5, h + 0.4, d - 2.0)
    acu(p, x0 + 2.7, h + 0.4, d - 2.0)
    backs(p, w, d, [3.2] + [4.6 + f * 3.2 for f in range(floors)] + [h], r, sides=(-1, 1), back=True)


def kinko(p, s, v, r):
    """A small credit union branch (1970s): brown brick tile, deep-set windows in a stone frame, an
    ATM corner lit all night, a flat roof with a sign frame."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(TILE_BR, x0, 0, 0, x1, h, d)
    p.box(ISHI, x0 - 0.1, 0, -0.3, x1 + 0.1, 0.6, 0)
    p.box(ISHI, x0, 3.6, -0.25, x1, 3.9, 0)
    doors(p, x0 + 3.0, 0.6, -0.02, 2.4, 2.4, ALU)
    for c in rows(x0 + 5.0, x1 - 3.2, 2.0):
        quad(p, WINDOW, 'f', c - 0.8, c + 0.8, 1.0, 3.2, -0.02)
    p.box('flat:#e9e7e0', x1 - 3.0, 0, -0.02, x1 - 0.2, 3.3, 0.0)
    quad(p, 'windowDim', 'f', x1 - 2.8, x1 - 0.4, 0.3, 2.7, -0.03, col='flat:#f4f1e8')
    board(p, 'atm', 'f', x1 - 2.8, x1 - 0.4, 2.8, 3.3, -0.03, 'flat:#1f3f7a', 0.04)
    board(p, 'name', 'f', x0 + 0.4, x1 - 3.2, 4.0, 4.9, 0, 'flat:#f4f1e8', 0.08)
    for c in rows(x0 + 0.6, x1 - 0.6, 2.2):
        p.box(ISHI, c - 0.8, 5.3, -0.2, c + 0.8, 7.0, 0)
        quad(p, WINDOW, 'f', c - 0.65, c + 0.65, 5.45, 6.85, -0.21)
    p.box(ISHI, x0 - 0.05, h - 0.4, -0.15, x1 + 0.05, h, d)
    roof_frame(p, 'roof', x0 + 1.0, x1 - 1.0, h, 1.0, 1.8)
    backs(p, w, d, [3.9, h], r, sides=(-1, 1), back=True)


def manshon(p, s, v, r):
    """A low manshon of the 1980s: shops in its base, four floors of flats above with balconies
    and their plants and laundry, cream tile with a sage band, a flat roof with a water tank."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall = v.get('wall', 'flat:#e3dccb')
    p.box(wall, x0, 0, 0.4, x1, h, d)
    p.box(GRANITE, x0, 0, 0, x1, 3.6, 0.4)
    shops = max(1, round((w - 2.6) / 5.0))
    step = (w - 2.6) / shops
    for k in range(shops):
        a, e = x0 + 0.3 + k * step, x0 + 0.3 + (k + 1) * step - 0.3
        quad(p, 'windowDim', 'f', a + 0.2, e - 0.2, 0.2, 2.8, -0.02, col=WARM)
        doors(p, (a + e) / 2 + step / 4, 0, -0.03, 1.0, 2.4, ALU)
        if (k + v['seed']) % 2:
            awning(p, a, e, 3.2, r.choice(AWNS), 0.9, stripes=False)
        fascia(s, a + 0.1, e - 0.1, 2.95, 3.5, -0.02, r=r)
    # The entrance to the flats: a lit hall, letterboxes.
    p.box('flat:#d8d0bc', x1 - 2.3, 0, -0.01, x1 - 0.2, 3.0, 0.0)
    doors(p, x1 - 1.25, 0, -0.02, 1.4, 2.4, ALU)
    p.box('light', x1 - 2.1, 2.7, -0.4, x1 - 0.4, 2.76, -0.2)
    floors = int((h - 3.8) / 2.9)
    band_col = v.get('band', SAGE)
    for f in range(floors):
        y = 3.8 + f * 2.9
        p.box('flat:#d9d3c2', x0 + 0.2, y, -1.2, x1 - 0.2, y + 0.16, 0.4)
        p.box(band_col, x0 + 0.2, y + 0.16, -1.22, x1 - 0.2, y + 1.1, -1.08)
        for c in rows(x0 + 0.4, x1 - 0.4, 4.4):
            quad(p, WINDOW, 'f', c - 1.5, c + 0.6, y + 0.4, y + 2.5, 0.39)
            p.box(ALU_DK, c + 0.9, y + 0.4, 0.38, c + 1.7, y + 2.3, 0.4)
            if r.random() < 0.45:
                p.box('flat:#f4f1e8', c - 1.2, y + 1.3, -0.95, c - 0.4, y + 1.9, -0.93)
                p.box('flat:#9fb6d0', c - 0.3, y + 1.4, -0.95, c + 0.2, y + 1.9, -0.93)
            if r.random() < 0.5:
                p.box(LEAFY, c + 0.4, y + 1.1, -1.0, c + 0.9, y + 1.5, -0.7)
            if r.random() < 0.7:
                acu(p, c + 1.4, y + 0.16, -0.6)
        p.box(wall, x0 + 0.2, y, -1.2, x0 + 0.4, y + 2.9, 0.4)
        p.box(wall, x1 - 0.4, y, -1.2, x1 - 0.2, y + 2.9, 0.4)
    p.box(ROOF, x0 - 0.05, h, -1.25, x1 + 0.05, h + 0.6, d + 0.05)
    tank(p, x0 + 2.0, h + 0.6, d - 3.0)
    backs(p, w, d, [3.8 + f * 2.9 for f in range(floors)] + [h], r, sides=(-1, 1), back=True)


def shoten(p, s, v, r):
    """The old two-storey shop house of the suburb's first years: shop open under a tiled pent roof,
    a timber-lattice upper storey in plaster, a hipped roof of grey tile."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(PLASTER, x0, 0, 0.6, x1, h, d)
    p.box(CEDAR, x0, 0, 0, x0 + 0.25, 3.2, 0.6)
    p.box(CEDAR, x1 - 0.25, 0, 0, x1, 3.2, 0.6)
    p.box('flat:#2a2622', x0 + 0.25, 0, 0.6, x1 - 0.25, 3.0, 0.62)
    quad(p, 'windowDim', 'f', x0 + 0.3, x1 - 0.3, 0.0, 2.9, 0.58, col=WARM)
    for c in rows(x0 + 0.6, x1 - 0.6, 1.4):
        hh = r.uniform(0.7, 1.0)
        p.box(CEDAR, c - 0.55, 0, 0.75, c + 0.55, hh, 1.8)
        for k in range(3):
            p.box(r.choice(['flat:#c8102e', 'flat:#f2c230', 'flat:#1d8a4e', 'flat:#f4f1e8', 'flat:#e86a1c']), c - 0.5 + k * 0.34, hh, 0.85, c - 0.2 + k * 0.34, hh + r.uniform(0.1, 0.25), 1.7)
    eave(p, x0, x1, 3.2, 0.6)
    board(p, 'name', 'f', x0 + 0.5, x1 - 0.5, 3.95, 4.6, 0.6, 'flat:#2a2019', 0.05)
    for c in rows(x0 + 0.5, x1 - 0.5, 2.0):
        p.box(CEDAR, c - 0.8, 4.9, 0.5, c + 0.8, 6.3, 0.6)
        for k in range(7):
            p.box('flat:#3a2a1e', c - 0.75 + k * 0.25, 4.95, 0.46, c - 0.71 + k * 0.25, 6.25, 0.5)
    p.prism(ROOFTILE, [(0.1, h), (d / 2, h + 2.0), (d + 0.4, h)], 'x', x0 - 0.4, x1 + 0.4)
    backs(p, w, d, [3.2, h], r, sides=(-1, 1), back=True)


def yashiki(p, s, v, r):
    """A house of the hillside behind its stone wall: dressed granite blocks to 1.3 m with a clipped
    hedge on top, a gate with a tiled roof and a lamp, the house set back with a deep tiled roof
    and a pine leaning over the wall. Its front garden is inside the lot."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    g = v.get('gate', 0.0)
    for a, e in ((x0, g - 1.2), (g + 1.2, x1)):
        p.box(ISHI_DK, a, 0, -0.05, e, 0.15, 0.6)
        yy = 0.15
        k = 0
        while yy < 1.25:
            xx = a + (0.35 if k % 2 else 0)
            p.box(ISHI_DK, a, yy, 0.0, e, yy + 0.02, 0.6)
            while xx < e - 0.05:
                p.box(ISHI, xx + 0.02, yy + 0.02, -0.02, min(e, xx + 0.7) - 0.02, yy + 0.27, 0.58)
                xx += 0.7
            yy += 0.29
            k += 1
        p.box(HEDGE, a + 0.05, 1.3, 0.1, e - 0.05, 2.2, 0.55)
    # The gate: two posts, a little tiled roof, a lamp, the name plate, a wooden door ajar.
    for o in (-1.2, 1.1):
        p.box(CEDAR, g + o, 0, 0.0, g + o + 0.12, 2.3, 0.25)
    p.prism(ROOFTILE, [(-0.4, 2.3), (0.15, 2.65), (0.7, 2.3)], 'x', g - 1.5, g + 1.5)
    p.box(CEDAR, g - 1.08, 0, 0.12, g - 0.05, 2.0, 0.16)
    board(p, 'plate', 'f', g - 1.55, g - 1.25, 1.2, 1.7, 0.0, 'flat:#e9e2d2', 0.03)
    p.box('light', g + 1.25, 1.85, -0.12, g + 1.4, 2.1, 0.0)
    p.box(STONE, g - 0.6, 0.0, 0.6, g + 0.6, 0.02, 4.0)
    # The house: two storeys, set back 4 m; plaster, timber, a deep tiled roof.
    hz = 4.0
    p.box(v.get('wall', PLASTER), x0 + 0.6, 0, hz, x1 - 0.6, h, d - 0.3)
    p.box(CEDAR, x0 + 0.6, 2.85, hz - 0.05, x1 - 0.6, 3.0, hz)
    for c in rows(x0 + 1.0, x1 - 1.0, 2.6):
        if abs(c - g) > 1.2:
            win(p, c - 0.8, 0.9, c + 0.8, 2.3, hz, -1, WFRAME)
        win(p, c - 0.7, 3.7, c + 0.7, 5.0, hz, -1, WFRAME)
    p.box(CEDAR, g - 0.6, 0, hz - 0.05, g + 0.6, 2.2, hz)
    eave(p, x0 + 0.6, x1 - 0.6, 3.0, hz, 0.7, 0.4)
    p.prism(ROOFTILE, [(hz - 0.8, h), ((hz + d) / 2, h + 2.3), (d + 0.5, h)], 'x', x0, x1)
    p.box(LEAFY, x0 + 0.8, 0, 1.0, x0 + 2.4, 1.4, 3.2)
    # The pine over the wall.
    px = x1 - 2.0 if g < 0 else x0 + 2.0
    p.cyl('flat:#5a4632', (px, 1.6, 2.0), 1, 0.16, 3.2, seg=8)
    p.box('flat:#2f5a32', px - 1.8, 3.0, -0.6, px + 1.8, 3.8, 2.8)
    p.box('flat:#35663a', px - 1.2, 3.8, 0.0, px + 1.0, 4.4, 2.4)
    mark('_garden', 0, 0, 2.0, w - 1.2, 3.6)
    backs(p, w, d, [3.0, h], r, sides=(-1, 1), back=True)


STYLES = {'pan': pan, 'clinic': clinic, 'kinko': kinko, 'manshon': manshon, 'shoten': shoten, 'yashiki': yashiki}


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(sum(map(ord, v['id'])) * 7)
    STYLES[v['style']](body, signs, v, r)
    return body, signs


def build_lo(v):
    return None


BASE = [
    dict(id='pan_a', style='pan', w=8.0, h=7.2, seed=1),
    dict(id='pan_b', style='pan', w=10.0, h=7.6, wall='flat:#7a5a44', upper=PLASTER, awn='#2f6b45', seed=2),
    dict(id='pan_c', style='pan', w=7.0, h=7.0, wall='flat:#8f6a52', upper='flat:#dfe6d8', awn='#7a1f2b', seed=3),
    dict(id='clinic_a', style='clinic', w=11.0, h=11.0, seed=11),
    dict(id='clinic_b', style='clinic', w=9.0, h=8.0, wall='flat:#e8ecef', seed=12),
    dict(id='kinko_a', style='kinko', w=13.0, h=8.4, seed=21),
    dict(id='manshon_a', style='manshon', w=16.0, h=15.4, seed=31),
    dict(id='manshon_b', style='manshon', w=12.0, h=12.5, wall='flat:#d8cfbc', band='flat:#8a6a52', seed=32),
    dict(id='manshon_c', style='manshon', w=19.0, h=15.4, wall='flat:#e6e2d6', band='flat:#6f8f7a', seed=33),
    dict(id='shoten_a', style='shoten', w=6.5, h=7.0, seed=41),
    dict(id='shoten_b', style='shoten', w=8.0, h=7.4, seed=42),
    dict(id='shoten_c', style='shoten', w=7.2, h=7.0, seed=43),
    dict(id='yashiki_a', style='yashiki', w=14.0, h=7.0, gate=-3.0, seed=51),
    dict(id='yashiki_b', style='yashiki', w=12.0, h=6.6, gate=2.5, wall='flat:#e3dccb', seed=52),
    dict(id='yashiki_c', style='yashiki', w=16.0, h=7.2, gate=0.0, wall='flat:#d9d2c0', seed=53),
]
FRONTS = []
for _v in BASE:
    FRONTS.append(dict(_v, d=12.0, gap=6.0))
    if _v['style'] in ('pan', 'shoten', 'clinic', 'manshon'):
        FRONTS.append(dict(_v, id=_v['id'] + '_p', d=10.0, gap=6.0))


if __name__ == '__main__':
    run('aobafront', FRONTS, build_hi, build_lo)
    write_anchors('aobafront')
