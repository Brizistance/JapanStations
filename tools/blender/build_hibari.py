# Builds Hibarino's own pieces (the 2026-11 rebuild): the covered shopping street ひばり通り商店街
# (its roof bays, its gate on the main road and the small shops under it), the shrine in the grove at
# the foot of the skylark hill (torii, worship hall with the main hall behind, lanterns, the water
# basin) and the pavilion on the hilltop.
#
#   blender --background --python tools/blender/build_hibari.py -- [--renders <dir>]
#
# Writes assets/buildings/hibari.blend, public/models/buildings/hibari.glb and
# src/stations/anchors/hibari.ts. Frame: front at z = 0 facing -z, origin mid-frontage. A mark whose
# name starts with `_` carries a measurement for colliders. Nothing carries a name.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

STEEL = 'flat:#6f7a80'
STEEL_LT = 'flat:#a9b4b9'
ROOFLIGHT = 'flat:#dfe9ec'
SKY = 'flat:#5aa0d8'
CEDAR = 'flat:#5a4030'
HINOKI = 'flat:#b08a5a'
VERMILION = 'flat:#c8452e'
BLACK = 'flat:#2a2826'
COPPER = 'flat:#4f8a78'
ISHI = 'flat:#9a948a'
ISHI_DK = 'flat:#7d776d'
GRAVEL = 'flat:#c9c2b2'
ROOFTILE = 'flat:#3b3f45'
SHUTTER = 'metal:#a7acb1'
SHUTTER_DK = 'metal:#8c9196'
AWNS = ['#2f6b45', '#7a1f2b', '#1f3f7a', '#c8102e', '#3f7fb4', '#8a6a3a']

# The shopping street: its walk is 6 m wide, the roof spans the shops' fronts.
WALK = 6.0
BAY = 6.45  # three bays fill the walk between the gates (hibarino-street.ts ARC)
ROOF_Y = 7.4


def arcade_bay(p, s, v, r):
    """One bay of the arcade roof over a 6 m walk: steel posts at the shop fronts carrying
    trusses, a shallow barrel of translucent panels with a raised clerestory down the middle, a light
    strip and a hanging banner rail. Front at z = 0 is the bay's start; it runs to z = BAY."""
    hw = WALK / 2
    for x in (-hw - 0.15, hw + 0.15):
        for z in (0.3, BAY - 0.3):
            p.box(STEEL, x - 0.12, 0, z - 0.12, x + 0.12, ROOF_Y, z + 0.12)
    n = 10
    for z in (0.3, BAY - 0.3):
        for k in range(n):
            a0, a1 = math.pi * k / n, math.pi * (k + 1) / n
            xa, xb = -hw * math.cos(a0) * 1.05, -hw * math.cos(a1) * 1.05
            ya, yb = ROOF_Y + 1.3 * math.sin(a0), ROOF_Y + 1.3 * math.sin(a1)
            p.face(STEEL, [(xa, ya, z - 0.08), (xb, yb, z - 0.08), (xb, yb - 0.25, z - 0.08), (xa, ya - 0.25, z - 0.08)], (0, 0, -1))
            p.face(STEEL, [(xb, yb, z + 0.08), (xa, ya, z + 0.08), (xa, ya - 0.25, z + 0.08), (xb, yb - 0.25, z + 0.08)], (0, 0, 1))
        p.box(STEEL, -hw - 0.3, ROOF_Y - 0.3, z - 0.1, hw + 0.3, ROOF_Y - 0.1, z + 0.1)
    for k in range(n):
        a0, a1 = math.pi * k / n, math.pi * (k + 1) / n
        xa, xb = -hw * math.cos(a0) * 1.05, -hw * math.cos(a1) * 1.05
        ya, yb = ROOF_Y + 1.3 * math.sin(a0), ROOF_Y + 1.3 * math.sin(a1)
        mat = ROOFLIGHT if 2 <= k <= 7 else STEEL_LT
        p.face(mat, [(xa, ya, 0), (xa, ya, BAY), (xb, yb, BAY), (xb, yb, 0)], (0, 1, 0))
        p.face(mat, [(xb, yb, 0), (xb, yb, BAY), (xa, ya, BAY), (xa, ya, 0)], (0, -1, 0))
    p.box(STEEL_LT, -hw - 1.0, ROOF_Y - 0.15, 0, -hw + 0.1, ROOF_Y, BAY)
    p.box(STEEL_LT, hw - 0.1, ROOF_Y - 0.15, 0, hw + 1.0, ROOF_Y, BAY)
    p.box('light', -0.15, ROOF_Y - 0.05, 0.6, 0.15, ROOF_Y, BAY - 0.6)
    p.box(STEEL, -0.04, ROOF_Y - 0.3, 0.4, 0.04, ROOF_Y - 0.05, BAY - 0.4)
    # Hanging lamps either side of the walk.
    for x in (-hw + 0.6, hw - 0.6):
        p.box(STEEL, x - 0.02, ROOF_Y - 1.0, BAY / 2 - 0.02, x + 0.02, ROOF_Y - 0.15, BAY / 2 + 0.02)
        p.box('windowDim', x - 0.18, ROOF_Y - 1.35, BAY / 2 - 0.18, x + 0.18, ROOF_Y - 1.0, BAY / 2 + 0.18, col=WARM)
    mark('banner', 0, ROOF_Y - 1.2, BAY / 2, 1.6, 0.9, (0, -1))
    mark('_posts', 0, 0, 0, WALK + 0.3, ROOF_Y)


def arcade_gate(p, s, v, r):
    """The arcade's gate on the main road: two sky-blue towers, a lit name board between them under
    a bowed canopy, a clock on top. Front at z = 0 on the main road's pavement edge."""
    hw = WALK / 2 + 0.6
    for x in (-hw - 0.8, hw):
        p.box(SKY, x, 0, 0, x + 0.8, 9.6, 1.2)
        p.box(GRANITE, x - 0.05, 0, -0.05, x + 0.85, 0.9, 1.25)
        p.box('light', x + 0.2, 1.5, -0.01, x + 0.6, 8.0, 0.0)
    p.box(SKY, -hw - 0.8, 8.0, 0, hw + 0.8, 9.6, 1.2)
    board(p, 'name', 'f', -hw + 0.3, hw - 0.3, 8.15, 9.45, 0, 'flat:#f4f1e8', 0.12)
    board(p, 'name_back', 'b', -hw + 0.3, hw - 0.3, 8.15, 9.45, 1.2, 'flat:#f4f1e8', 0.12)
    p.box(STEEL_LT, -hw - 1.2, 9.6, -0.6, hw + 1.2, 9.8, 1.8)
    p.cyl('flat:#e9e7e0', (0, 10.6, 0.6), 2, 0.65, 0.3)
    mark('clock', 0, 10.6, -0.12, 1.1, 1.1, (0, -1))
    mark('_gate', 0, 0, 0, 2 * hw + 1.6, 9.8)


def arcshop(p, s, v, r):
    """A small shop under the arcade: a two-storey timber or tiled house, the street storey open to
    the walk (a counter, goods out on stands) or shuttered, a board over it, a window above."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall = v.get('wall', 'flat:#e3dccb')
    p.box(wall, x0, 0, 0.2, x1, h, d)
    p.box('flat:#4d4f52', x0, 0, 0, x1, 0.15, 0.2)
    if v.get('shut'):
        p.box(SHUTTER, x0 + 0.15, 0, 0.0, x1 - 0.15, 3.0, 0.2)
        y = 0.2
        while y < 2.95:
            p.box(SHUTTER_DK, x0 + 0.15, y, -0.015, x1 - 0.15, y + 0.025, 0.0)
            y += 0.22
    else:
        quad(p, 'windowDim', 'f', x0 + 0.2, x1 - 0.2, 0.15, 3.0, 0.6, col=WARM)
        p.box('flat:#2f2a26', x0 + 0.2, 0.15, 0.2, x0 + 0.3, 3.0, 0.6)
        p.box('flat:#2f2a26', x1 - 0.3, 0.15, 0.2, x1 - 0.2, 3.0, 0.6)
        # Goods out on stands at the front.
        for k, c in enumerate(rows(x0 + 0.5, x1 - 0.5, 1.4)):
            p.box('flat:#8a6a4a', c - 0.6, 0, -0.55, c + 0.6, 0.85, 0.15)
            p.box(['flat:#c9b98a', 'flat:#8fa8ca', 'flat:#d98a6a', 'flat:#9fc28a'][(k + v['seed']) % 4], c - 0.55, 0.85, -0.5, c + 0.55, 1.05, 0.1)
    aw = AWNS[v['seed'] % len(AWNS)]
    p.box('flat:' + aw, x0, 3.05, -0.5, x1, 3.25, 0.2)
    board(p, 'name', 'f', x0 + 0.3, x1 - 0.3, 3.35, 4.15, 0.2, 'flat:#f4f1e8', 0.06)
    for c in rows(x0 + 0.5, x1 - 0.5, 2.2):
        win(p, c - 0.65, 4.6, c + 0.65, 6.0, 0.2, -1, FRAME)
    p.box(ROOFTILE, x0 - 0.1, h, 0.0, x1 + 0.1, h + 0.25, d + 0.1)
    backs(p, w, d, [3.2, h], r, sides=(-1, 1), back=True)


def torii(p, s, v, r):
    """A vermilion myōjin torii 7 m wide: two posts on black bases, the kasagi with its upturned ends,
    the nuki, the plaque between them. Origin between the posts."""
    hw = 3.0
    for x in (-hw, hw):
        p.cyl(VERMILION, (x, 3.0, 0), 1, 0.28, 6.0, 16)
        p.cyl(BLACK, (x, 0.35, 0), 1, 0.36, 0.7, 16)
    p.box(VERMILION, -hw - 0.9, 4.75, -0.22, hw + 0.9, 5.1, 0.22)
    kz = [(-hw - 1.6, 6.5), (-hw - 1.0, 6.25), (0, 6.15), (hw + 1.0, 6.25), (hw + 1.6, 6.5)]
    for (xa, ya), (xb, yb) in zip(kz, kz[1:]):
        p.face(BLACK, [(xa, ya, -0.35), (xb, yb, -0.35), (xb, yb, 0.35), (xa, ya, 0.35)], (0, 1, 0))
        p.face(BLACK, [(xa, ya - 0.3, -0.35), (xb, yb - 0.3, -0.35), (xb, yb, -0.35), (xa, ya, -0.35)], (0, 0, -1))
        p.face(BLACK, [(xb, yb - 0.3, 0.35), (xa, ya - 0.3, 0.35), (xa, ya, 0.35), (xb, yb, 0.35)], (0, 0, 1))
        p.face(VERMILION, [(xb, yb - 0.3, -0.3), (xa, ya - 0.3, -0.3), (xa, ya - 0.3, 0.3), (xb, yb - 0.3, 0.3)], (0, -1, 0))
    p.box(VERMILION, -hw - 1.2, 5.6, -0.25, hw + 1.2, 5.85, 0.25)
    p.box(BLACK, -0.55, 5.1, -0.26, 0.55, 5.6, 0.26)
    board(p, 'plaque', 'f', -0.45, 0.45, 5.1, 5.6, -0.26, 'flat:#2a2826', 0.02)
    mark('_posts', 0, 0, 0, 2 * hw, 6.0)


def haiden(p, s, v, r):
    """The shrine: a worship hall (haiden) of plain cypress under a copper-green hip-and-gable roof,
    open to the front under the bell rope, the offertory box before it; behind, joined by a short
    corridor, the smaller main hall (honden) on a stone base inside a low fence."""
    w, d = 11.0, 8.0
    x0, x1 = -w / 2, w / 2
    base = 0.9
    p.box(ISHI, x0 - 0.6, 0, 0, x1 + 0.6, base, d + 0.6)
    for k in range(4):  # steps up to the hall
        p.box(ISHI_DK, -1.8, 0, -1.2 + k * 0.3, 1.8, base * (k + 1) / 4, -0.9 + k * 0.3)
    p.box(HINOKI, x0, base, 0.6, x1, base + 4.0, d)
    quad(p, 'windowDim', 'f', -2.6, 2.6, base + 0.2, base + 3.4, 0.59, col='flat:#3a2a1e')
    for c in (-3.6, -1.2, 1.2, 3.6):
        p.cyl(HINOKI, (c, base + 2.0, 0.3), 1, 0.16, 4.0, 10)
    for c in rows(x0 + 0.3, x1 - 0.3, 1.2):
        p.box(CEDAR, c - 0.03, base + 0.2, 0.55, c + 0.03, base + 3.6, 0.6)
    p.box(CEDAR, x0, base + 3.6, 0.0, x1, base + 4.0, d)
    # Roof: a hip below a gable, copper green, deep eaves.
    y = base + 4.0
    p.prism(COPPER, [(-1.8, y), (d / 2, y + 3.2), (d + 1.8, y)], 'x', x0 - 1.8, x1 + 1.8)
    p.prism(COPPER, [(0.2, y + 2.4), (d / 2, y + 4.4), (d - 0.2, y + 2.4)], 'x', x0 + 1.2, x1 - 1.2)
    p.box(COPPER, -1.2, y + 4.3, d / 2 - 0.3, 1.2, y + 4.6, d / 2 + 0.3)
    # Bell rope and offertory box.
    p.box('flat:#c9a227', -0.15, y - 0.8, 0.15, 0.15, y - 0.5, 0.45)
    p.box('flat:#e9e2d2', -0.06, base + 1.0, 0.25, 0.06, y - 0.8, 0.35)
    p.box(CEDAR, -1.0, base, -0.6, 1.0, base + 0.75, 0.2)
    p.box('flat:#2a2019', -0.9, base + 0.75, -0.5, 0.9, base + 0.8, 0.1)
    mark('saisen', 0, base + 0.45, -0.61, 1.8, 0.35, (0, -1))
    # Main hall behind on a higher stone base, a fence round it.
    hz0, hz1 = d + 2.4, d + 7.4
    p.box(HINOKI, -1.0, base, d, 1.0, base + 3.0, hz0)
    p.box(ISHI, -3.6, 0, hz0 - 0.4, 3.6, base + 0.6, hz1 + 0.4)
    p.box(HINOKI, -2.6, base + 0.6, hz0, 2.6, base + 3.6, hz1)
    p.box('flat:#e3c46a', -0.9, base + 0.8, hz0 - 0.02, 0.9, base + 2.8, hz0)
    p.prism(COPPER, [(hz0 - 1.4, base + 3.6), ((hz0 + hz1) / 2, base + 6.0), (hz1 + 1.4, base + 3.6)], 'x', -3.6, 3.6)
    for x in (-2.4, -1.2, 0.0, 1.2, 2.4):  # chigi and katsuogi
        p.cyl(BLACK, (x, base + 6.1, (hz0 + hz1) / 2), 0, 0.12, 0.9, 8)
    for zz in rows(hz0 - 0.6, hz1 + 0.6, 0.5):
        for x in (-4.2, 4.2):
            p.box(VERMILION, x - 0.04, 0, zz - 0.04, x + 0.04, 1.0, zz + 0.04)
    for x in (-4.2, 4.2):
        p.box(VERMILION, x - 0.05, 0.85, hz0 - 0.6, x + 0.05, 0.95, hz1 + 0.6)
    p.box(VERMILION, -4.2, 0.85, hz1 + 0.55, 4.2, 0.95, hz1 + 0.65)
    mark('_hall', 0, 0, 0, w + 1.2, base + 8.6)
    mark('_honden', 0, 0, hz1 + 0.6, 8.4, base + 6.4)


def toro(p, s, v, r):
    """A stone lantern (kasuga-dōrō), 2.2 m, its fire box lit at night."""
    p.box(ISHI_DK, -0.45, 0, -0.45, 0.45, 0.3, 0.45)
    p.cyl(ISHI, (0, 0.85, 0), 1, 0.14, 1.1, 10)
    p.box(ISHI, -0.35, 1.4, -0.35, 0.35, 1.55, 0.35)
    p.box(ISHI, -0.27, 1.55, -0.27, 0.27, 1.95, 0.27)
    p.box('windowDim', -0.15, 1.62, -0.28, 0.15, 1.88, -0.27, col=WARM)
    p.box('windowDim', -0.15, 1.62, 0.27, 0.15, 1.88, 0.28, col=WARM)
    p.prism(ISHI, [(-0.5, 1.95), (0, 2.25), (0.5, 1.95)], 'x', -0.5, 0.5)
    p.box(ISHI, -0.08, 2.2, -0.08, 0.08, 2.4, 0.08)


def chozuya(p, s, v, r):
    """The water basin pavilion: a stone trough under a small copper roof on four posts."""
    p.box(ISHI, -1.0, 0, -0.5, 1.0, 0.75, 0.5)
    p.box('flat:#3d5a64', -0.85, 0.7, -0.35, 0.85, 0.76, 0.35)
    for x in (-1.2, 1.2):
        for z in (-0.8, 0.8):
            p.cyl(HINOKI, (x, 1.25, z), 1, 0.08, 2.5, 8)
    p.prism(COPPER, [(-1.3, 2.5), (0, 3.2), (1.3, 2.5)], 'x', -1.7, 1.7)
    for k in range(3):
        p.box(CEDAR, -0.6 + k * 0.5, 0.76, -0.05, -0.4 + k * 0.5, 0.8, 0.05)
    mark('_basin', 0, 0, 0, 2.6, 3.2)


def azumaya(p, s, v, r):
    """The hilltop pavilion: a square timber shelter on four posts under a pyramid roof, benches on
    three sides, a guide board on a post facing the view."""
    hw = 2.4
    for x in (-hw, hw):
        for z in (-hw, hw):
            p.box(CEDAR, x - 0.12, 0, z - 0.12, x + 0.12, 2.6, z + 0.12)
    pyramid(p, ROOFTILE, -hw - 0.7, hw + 0.7, -hw - 0.7, hw + 0.7, 2.6, 1.6)
    p.box(CEDAR, -hw - 0.7, 2.5, -hw - 0.7, hw + 0.7, 2.6, hw + 0.7)
    for (a, e, za, ze) in ((-hw + 0.2, hw - 0.2, hw - 0.6, hw - 0.2), (-hw + 0.2, -hw + 0.6, -hw + 0.4, hw - 0.6), (hw - 0.6, hw - 0.2, -hw + 0.4, hw - 0.6)):
        p.box(HINOKI, a, 0.42, za, e, 0.48, ze)
        p.box(CEDAR, a + 0.1, 0, za + 0.1, e - 0.1, 0.42, ze - 0.1)
    p.box(CEDAR, -0.05, 0, -hw - 1.4, 0.05, 1.2, -hw - 1.3)
    board(p, 'guide', 'f', -0.7, 0.7, 1.2, 2.0, -hw - 1.42, 'flat:#f4f1e8', 0.04)
    mark('_shelter', 0, 0, 0, 2 * hw + 1.4, 4.2)


STYLES = {'arcade_bay': arcade_bay, 'arcade_gate': arcade_gate, 'arcshop': arcshop, 'torii': torii,
          'haiden': haiden, 'toro': toro, 'chozuya': chozuya, 'azumaya': azumaya}


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(sum(map(ord, v['id'])) * 13)
    STYLES[v['style']](body, signs, v, r)
    return body, signs


def build_lo(v):
    return None


VARIANTS = [
    dict(id='bay', style='arcade_bay', w=WALK + 2.0, d=BAY, h=ROOF_Y + 1.3),
    dict(id='gate', style='arcade_gate', w=WALK + 4.0, d=1.2, h=10.0),
    dict(id='shop_a', style='arcshop', w=5.0, d=9.0, h=7.0, seed=1),
    dict(id='shop_b', style='arcshop', w=6.5, d=9.0, h=7.2, wall='flat:#d9cdb8', seed=2),
    dict(id='shop_c', style='arcshop', w=4.0, d=9.0, h=6.8, wall='flat:#cfd6d2', shut=True, seed=3),
    dict(id='shop_d', style='arcshop', w=5.5, d=9.0, h=7.0, wall='flat:#e6d9c9', seed=4),
    dict(id='shop_e', style='arcshop', w=7.5, d=9.0, h=7.4, wall='flat:#e9e2d2', seed=5),
    dict(id='shop_f', style='arcshop', w=4.5, d=9.0, h=6.8, wall='flat:#d5cbb8', seed=6),
    dict(id='torii', style='torii', w=8.0, d=1.0, h=6.6),
    dict(id='haiden', style='haiden', w=14.6, d=16.0, h=9.5),
    dict(id='toro', style='toro', w=1.0, d=1.0, h=2.4),
    dict(id='chozuya', style='chozuya', w=3.4, d=2.0, h=3.2),
    dict(id='azumaya', style='azumaya', w=6.2, d=6.2, h=4.2),
]
for _v in VARIANTS:
    _v.setdefault('seed', 0)
    _v['gap'] = 6.0


if __name__ == '__main__':
    run('hibari', VARIANTS, build_hi, build_lo)
    write_anchors('hibari')
