# Builds the ichiba set: the regular buildings of a fish-market town (docs/theme-notes.md "Fish market town"),
# first used at Shinshio. Two- to four-storey shop-houses 18 m deep, the family above the shop: fishmongers
# with an open front, a sloping display of ice and fish boxes, bare bulbs and a deep awning; a seafood-bowl
# counter with a noren; a dried-goods or knife shop behind glass; an old timber shop-house with a tiled pent
# roof; a shop with flats above. Also, placed by hand and not by the row filler: two cold-storage warehouses
# and an ice plant.
#
#   blender --background --python tools/blender/build_ichiba.py -- [--renders <dir>]
#
# Writes assets/buildings/ichiba.blend and public/models/buildings/ichiba.glb. Sizes mirrored in
# src/stations/buildings.ts (the shop-houses) and src/stations/anchors/ichiba.ts (all). The game letters
# the boards (render/building-models.ts, kind 'ichiba').

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

G0 = 3.2
FH = 2.8
D = 18.0
RAIL = 'flat:#3a3d41'
TILE_ROOF = 'flat:#3f4a4e'
ICE = 'flat:#e9f1f4'
FISH = 'flat:#9aa6ad'
STYRO = 'flat:#f1f2ef'
SHUTTER = 'flat:#9ea2a6'
TIMBER = 'flat:#4a3426'
CLAD = 'flat:#c7ccc9'
CLAD_DK = 'flat:#9aa19e'

SHOPS = [
    # kind: 'fish' (open stall), 'eat' (counter with a noren), 'glass' (dried goods, knives), 'old' (timber), 'flats' (shop + flats)
    dict(id='a', w=5.4, d=D, floors=2, kind='fish', wall='flat:#e8e4da', trim='flat:#7a7468', awning='#1f4e8c', seed=401),
    dict(id='b', w=4.2, d=D, floors=3, kind='fish', wall='flat:#d9d2c3', trim='flat:#5a5248', awning='#b3261e', seed=403),
    dict(id='c', w=6.0, d=D, floors=2, kind='eat', wall='flat:#efe9dc', trim='flat:#3a2a22', awning='#1d2f55', seed=409),
    dict(id='d', w=4.8, d=D, floors=3, kind='glass', wall='flat:#cfd3d4', trim='flat:#3a3d41', awning='#1f6b45', seed=419),
    dict(id='e', w=6.6, d=D, floors=2, kind='old', wall='flat:#6b5440', trim='flat:#3a2a22', awning='#3a2a22', seed=421),
    dict(id='f', w=7.2, d=D, floors=4, kind='flats', wall='flat:#e2ddd2', trim='flat:#8a8478', awning='#0f7f86', seed=431),
    dict(id='g', w=3.6, d=D, floors=2, kind='fish', wall='flat:#c9b9a0', trim='flat:#6b5440', awning='#d9861a', seed=433),
    dict(id='h', w=5.0, d=D, floors=3, kind='eat', wall='flat:#d8c9b0', trim='flat:#6e3a2d', awning='#6e3a2d', seed=439),
]
BIG = [
    dict(id='cs_a', w=34.0, d=22.0, h=19.0, fn='coldstore', seed=451),
    dict(id='cs_b', w=24.0, d=18.0, h=14.5, fn='coldstore', seed=457),
    dict(id='ice', w=22.0, d=16.0, h=12.0, fn='iceplant', seed=461),
]


def levels(v):
    return [G0 + i * FH for i in range(v['floors'])]


def awning(p, s, v, a, b, y, out, label=True):
    """A deep canvas awning in stripes, its valance lettered by the game."""
    n = max(2, int((b - a) / 0.5))
    col = 'flat:' + v['awning']
    for i in range(n):
        ua, ub = a + (b - a) * i / n, a + (b - a) * (i + 1) / n
        p.face(col if i % 2 == 0 else 'flat:#f4f1e8', [(ua, y, 0.0), (ub, y, 0.0), (ub, y - 0.45, -out), (ua, y - 0.45, -out)], (0, 1, -0.4))
        p.face(col, [(ub, y - 0.45, -out), (ua, y - 0.45, -out), (ua, y - 0.7, -out), (ub, y - 0.7, -out)], (0, 0, -1))
    if label:
        sign(s, v['awning'], a + 0.15, y - 0.69, -out - 0.02, b - 0.15, y - 0.47, -out - 0.01)


def ground(p, s, v, rng):
    x0, x1 = -v['w'] / 2, v['w'] / 2
    a, b = x0 + 0.2, x1 - 0.2
    k = v['kind']
    for x in (x0, x1 - 0.2):
        p.box(v['trim'], x, 0, -0.02, x + 0.2, G0, 0.1)
    if k == 'fish':
        # Open to the street: the shop's dim inside, a sloping display of ice and fish boxes, bulbs on a wire.
        p.box('windowDim', a, 0.0, 3.0, b, G0 - 0.2, 3.05, col='flat:#b9b2a2')
        p.box('flat:#8d877b', a, 0.0, 0.1, b, 0.02, 3.0)
        p.box(v['wall'], a, G0 - 0.2, 0.0, b, G0, 3.0)
        p.box('flat:#6b6e70', a + 0.1, 0.0, 0.2, b - 0.1, 0.75, 1.6)
        p.prism(ICE, [(0.2, 0.75), (1.6, 1.05), (1.6, 1.1), (0.2, 0.8)], 'x', a + 0.15, b - 0.15)
        x = a + 0.3
        while x < b - 0.6:
            p.box(STYRO if rng.random() < 0.6 else FISH, x, 0.8, 0.4, x + 0.5, 0.95, 0.9)
            p.box(FISH, x + 0.05, 0.92, 1.0, x + 0.45, 1.06, 1.45)
            x += 0.6
        for i in range(3):
            xb = a + (b - a) * (i + 0.5) / 3
            p.box('light', xb - 0.06, 2.45, 0.6, xb + 0.06, 2.6, 0.72)
        p.box(RAIL, a, 2.62, 0.64, b, 2.64, 0.68)
        for i in range(2):
            p.box(STYRO, b - 1.0, i * 0.3, -0.5, b - 0.3, i * 0.3 + 0.28, -0.05)
        awning(p, s, v, x0, x1, G0 - 0.1, 1.4)
    elif k == 'eat':
        # A seafood-bowl counter: a glazed sliding front, a noren in the doorway, a menu board, a lantern.
        p.box('windowDim', a, 0.5, -0.02, a + (b - a) * 0.55, 2.2, 0.0, col='flat:#c9bba2')
        p.box(TIMBER, a + (b - a) * 0.58, 0, -0.01, b, 2.3, 0.03)
        p.box('flat:' + v['awning'], a + (b - a) * 0.6, 1.55, -0.06, b - 0.05, 2.25, -0.03)
        for i in range(3):
            xn = a + (b - a) * (0.6 + 0.4 * (i + 0.5) / 3)
            p.box('flat:#f4f1e8', xn - 0.03, 1.55, -0.07, xn + 0.03, 2.25, -0.06)
        p.box('windowDim', x0 + 0.25, 1.6, -0.45, x0 + 0.55, 2.1, -0.15, col='flat:#d8392b')
        p.box(TIMBER, a, 0, -0.45, a + 0.7, 1.0, -0.4)
        sign(s, '#f4f1e8', a + 0.05, 0.1, -0.47, a + 0.65, 0.95, -0.46)
        p.prism(TILE_ROOF, [(-0.8, 2.55), (0.0, 2.95), (0.0, 3.02), (-0.85, 2.61)], 'x', x0 - 0.05, x1 + 0.05)
        sign(s, v['awning'], a + 0.1, 2.62, -0.9, b - 0.1, 2.98, -0.88)
    elif k == 'glass':
        # Dried goods or knives behind glass: a shutter half up, a lit case, an awning.
        m = a + (b - a) * 0.65
        p.box('windowDim', a, 0.4, -0.02, m, 2.3, 0.0, col='flat:#d6cbb4')
        p.box(SHUTTER, a, 2.2, -0.05, m, 2.6, -0.02)
        p.box('flat:#3a3d42', m + 0.15, 0, -0.01, b, 2.3, 0.03)
        p.box('glassTint', m + 0.25, 0.3, -0.02, b - 0.1, 2.2, -0.01)
        for i in range(3):
            p.box('flat:#c9a26a', a + 0.3 + i * 0.7, 0.0, -0.55, a + 0.85 + i * 0.7, 0.45 + 0.1 * i, -0.1)
        awning(p, s, v, x0, x1, G0 - 0.15, 1.0)
    elif k == 'old':
        # A 1950s timber shop-house: lattice front, a tiled pent roof, a hanging board, the upper floor in planks.
        p.box(TIMBER, a, 0, 0.0, b, G0, 0.05)
        for i in range(int((b - a) / 0.12)):
            xl = a + i * 0.12
            p.box('flat:#2e2018', xl, 0.4, -0.04, xl + 0.035, 2.4, 0.0)
        p.box('windowDim', a + (b - a) * 0.35, 0.0, -0.06, a + (b - a) * 0.65, 2.3, -0.04, col='flat:#c9b38a')
        p.prism(TILE_ROOF, [(-1.1, 2.75), (0.0, 3.25), (0.0, 3.35), (-1.15, 2.82)], 'x', x0 - 0.1, x1 + 0.1)
        sign(s, '#3a2a22', a + (b - a) * 0.3, 3.4, -0.1, b - (b - a) * 0.3, 3.95, -0.06)
    else:
        # Flats over a shop: the shop at one side under its awning, the flats' entrance and mailboxes beside.
        m = a + (b - a) * 0.62
        p.box('windowDim', a, 0.4, -0.02, m, 2.3, 0.0, col='flat:#cbbfa6')
        p.box('glassTint', m + 0.3, 0.1, -0.02, b - 0.2, 2.3, 0.0)
        p.box('flat:#b9bdc2', m + 0.4, 0.8, 0.3, b - 0.3, 1.6, 0.4)
        n = max(2, int((m - a) / 0.5))
        awning(p, s, v, a, m, G0 - 0.15, 1.1)


def upper(p, s, v, rng):
    x0, x1 = -v['w'] / 2, v['w'] / 2
    ys = levels(v)
    H = ys[-1]
    a, b = x0 + 0.2, x1 - 0.2
    old = v['kind'] == 'old'
    p.box(v['wall'], x0, G0, -0.02, x1, H + 0.9, 0.0)
    for i, y in enumerate(ys[:-1]):
        if old:
            for j in range(int((H - G0) / 0.22)):
                p.box('flat:#3d2b1f', x0, G0 + j * 0.22, -0.05, x1, G0 + j * 0.22 + 0.03, -0.02)
            win(p, a + 0.6, y + 0.7, b - 0.6, y + 1.9, 0.0, out=-1, glass=WINDOW_LIT if rng.random() < 0.4 else WINDOW)
            for g in range(int((b - a - 1.2) / 0.15)):
                p.box('flat:#2e2018', a + 0.6 + g * 0.15, y + 0.7, -0.09, a + 0.63 + g * 0.15, y + 1.9, -0.06)
        elif v['kind'] == 'flats':
            p.box(CONC, x0, y - 0.15, -1.0, x1, y, 0.0)
            p.box(v['trim'], x0, y, -1.0, x1, y + 0.8, -0.92)
            p.box(WINDOW_LIT, a + 0.3, y + 0.15, 0.0, b - 0.3, y + 2.2, 0.02)
            p.box(ACU, x1 - 1.1, y, -0.85, x1 - 0.3, y + 0.6, -0.5)
            if rng.random() < 0.6:
                p.box(RAIL, a + 0.4, y + 1.95, -0.7, b - 1.4, y + 1.98, -0.67)
                for j in range(4):
                    p.box(rng.choice(['flat:#e8e4dc', 'flat:#3a5a9a', 'flat:#c0392b', 'flat:#d9c27a']), a + 0.5 + j * 0.5, y + 1.3, -0.7, a + 0.85 + j * 0.5, y + 1.95, -0.68)
        else:
            for k, f in enumerate((0.28, 0.72) if v['w'] > 4.5 else (0.5,)):
                xc = x0 + v['w'] * f
                win(p, xc - 0.55, y + 0.9, xc + 0.55, y + 2.1, 0.0, out=-1, glass=WINDOW_LIT if rng.random() < 0.35 else WINDOW)
            p.box(ACU, x0 + v['w'] * 0.5 - 0.4, y + 0.2, -0.38, x0 + v['w'] * 0.5 + 0.4, y + 0.75, 0.0)
            if i == 0:
                sign(s, v['awning'], a + 0.2, y + 2.2, -0.06, b - 0.2, y + 2.65, 0.0)
        p.box(v['trim'], x0, y - 0.06, -0.05, x1, y + 0.02, 0.0)
    if old:
        p.prism(TILE_ROOF, [(-0.6, H + 0.4), (D / 2, H + 2.6), (D + 0.4, H + 0.4), (D + 0.4, H + 0.55), (D / 2, H + 2.75), (-0.6, H + 0.55)], 'x', x0 - 0.15, x1 + 0.15)
        return
    p.box(v['trim'], x0, H + 0.6, -0.05, x1, H + 0.9, 0.0)
    for x in (x0 + 0.1, x1 - 0.1):
        p.box(RAIL, x - 0.02, H + 0.9, 0.1, x + 0.02, H + 1.9, D - 0.1)
    p.box(RAIL, x0, H + 1.85, 0.08, x1, H + 1.9, 0.12)
    if rng.random() < 0.5:
        tank(p, x0 + 1.2, H, D * 0.6, r=0.6, h=1.2)
    p.cyl(STEEL, (x0 + 0.6, H + 2.4, D - 1.0), 1, 0.025, 2.4, seg=5)


def volume(p, v):
    x0, x1 = -v['w'] / 2, v['w'] / 2
    H = levels(v)[-1]
    if v['kind'] == 'fish':
        p.box(v['wall'], x0, 0, 3.05, x1, H + (0.4 if v['kind'] == 'old' else 0.6), D)
        p.box(v['wall'], x0, G0, 0.02, x1, H + 0.6, 3.05)
    else:
        p.box(v['wall'], x0, 0, 0.02, x1, H + (0.4 if v['kind'] == 'old' else 0.6), D)
    if v['kind'] != 'old':
        p.box(ROOF, x0 + 0.1, H + 0.6, 0.1, x1 - 0.1, H + 0.62, D - 0.1)


def shop_hi(v):
    rng = random.Random(v['seed'])
    p, s = Part(), Part()
    s.body = p
    volume(p, v)
    ground(p, s, v, rng)
    upper(p, s, v, rng)
    backs(p, v['w'], D, levels(v), rng, signs=s)
    return p, s


def coldstore(p, s, v, rng):
    """A cold-storage warehouse: windowless insulated panels, a loading dock with seals along the front,
    the firm's name high up, a stair tower and refrigeration plant on the roof."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(CLAD, x0, 1.2, 1.2, x1, h, d)
    p.box(CONC, x0, 0, 1.2, x1, 1.2, d)
    for j in range(int((h - 1.2) / 1.0)):
        p.box(CLAD_DK, x0 - 0.03, 1.2 + j * 1.0, 1.17, x1 + 0.03, 1.22 + j * 1.0, d + 0.03)
    # The loading dock: a raised apron, bays with dock seals and shutters, a canopy.
    p.box(CONC, x0, 0, -1.8, x1, 1.2, 1.2)
    n = int(w / 4.5)
    for k in range(n):
        xc = x0 + (k + 0.5) * w / n
        p.box('flat:#2b2f33', xc - 1.55, 1.2, 1.12, xc + 1.55, 4.4, 1.2)
        p.box(SHUTTER, xc - 1.3, 1.6, 1.1, xc + 1.3, 4.2, 1.14)
        p.box('flat:#30353a', xc - 1.25, 1.2, -0.2, xc + 1.25, 1.25, 1.1)
        p.box('flat:#e6a700', xc - 1.5, 0.0, -1.82, xc - 1.3, 1.2, -1.78)
    p.box(ROOF, x0, 5.0, -2.6, x1, 5.2, 1.2)
    p.box(STEEL_DK if 'STEEL_DK' in globals() else RAIL, x0, 4.7, -2.6, x1, 5.0, -2.45)
    sign(s, '#1d2f55', -w * 0.3, h - 3.2, 1.12, w * 0.3, h - 1.2, 1.15)
    p.box(CLAD_DK, x1 - 6.0, h, d - 6.0, x1 - 1.0, h + 3.5, d - 1.0)
    for k in range(3):
        xc = x0 + 4.0 + k * 4.0
        p.box('flat:#8c969c', xc - 1.5, h, d * 0.5 - 1.0, xc + 1.5, h + 1.8, d * 0.5 + 1.0)
        p.cyl('flat:#4a4f54', (xc, h + 1.85, d * 0.5), 1, 0.8, 0.1, seg=12)
    p.box(ROOF, x0 + 0.1, h, 1.3, x1 - 0.1, h + 0.02, d - 0.1)


def iceplant(p, s, v, rng):
    """An ice plant: a tall concrete block with an ice chute down to the street, a lit counter, the plant on the roof."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box('flat:#d7d4cc', x0, 0, 0.02, x1, h, d)
    for y in (4.0, 8.0):
        p.box('flat:#bdb9b0', x0 - 0.03, y - 0.1, -0.03, x1 + 0.03, y + 0.05, d + 0.03)
    for xc in (x0 + 3.0, x0 + 7.0):
        win(p, xc - 1.0, 5.0, xc + 1.0, 6.4, 0.0, out=-1, glass=WINDOW_LIT)
        win(p, xc - 1.0, 9.0, xc + 1.0, 10.4, 0.0, out=-1, glass=WINDOW)
    # The chute: a steel trunk from the first floor out over a loading bay, the shutter below it.
    p.box('flat:#8c969c', 2.0, 5.5, -2.2, 3.2, 6.4, 0.0)
    p.prism('flat:#8c969c', [(-2.2, 5.5), (-2.2, 6.4), (-3.4, 5.0), (-3.4, 4.2)], 'x', 2.0, 3.2)
    p.box(SHUTTER, 0.5, 0.0, -0.04, 6.5, 3.8, 0.0)
    p.box('windowDim', x0 + 1.0, 0.6, -0.03, x0 + 5.0, 2.4, 0.0, col='flat:#d6e3e8')
    sign(s, '#0f7f86', x0 + 1.0, 2.7, -0.08, x0 + 9.0, 3.5, -0.03)
    p.box('flat:#8c969c', x1 - 7.0, h, 3.0, x1 - 1.0, h + 2.5, d - 3.0)
    p.box(ROOF, x0 + 0.1, h, 0.1, x1 - 0.1, h + 0.02, d - 0.1)


VARIANTS = [dict(v, h=levels(v)[-1] + 1.9) for v in SHOPS] + BIG


def build_hi(v):
    begin(v)
    if v in BIG:
        rng = random.Random(v['seed'])
        p, s = Part(), Part()
        s.body = p
        globals()[v['fn']](p, s, v, rng)
        return p, s
    return shop_hi(v)


def build_lo(v):
    # (Faces stand 0.25 m or more off the wall: seen from 200–500 m the depth buffer must still part them.)
    if v in BIG:
        return None
    p = Part()
    x0, x1 = -v['w'] / 2, v['w'] / 2
    H = levels(v)[-1]
    p.box(v['wall'], x0, 0, 0, x1, H + 0.9, D)
    p.box('windowDim', x0 + 0.2, 0.1, -0.25, x1 - 0.2, 2.4, 0, col='flat:#b9b2a2')
    sign(p, v['awning'], x0 + 0.1, 2.4, -1.2, x1 - 0.1, 3.0, -0.4, glyphs=False)
    for y in levels(v)[:-1]:
        lo_band(p, x0 + 0.6, y + 0.9, -0.25, x1 - 0.6, y + 2.1, 0)
    return p


if __name__ == '__main__':
    run('ichiba', VARIANTS, build_hi, build_lo)
    write_anchors('ichiba')
