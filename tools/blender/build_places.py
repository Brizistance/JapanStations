# Builds the pieces of the small street places: a pocket park, a neighbourhood shrine, a vending
# corner and a police box (kōban).
#
#   blender --background --python tools/blender/build_places.py -- [--renders <dir>]
#
# Writes assets/buildings/places.blend and public/models/buildings/places.glb.
#
# Frame and helpers: see buildkit.py. One root per piece, places_<id>, with one mesh; the origin is on
# the ground in the middle of the piece and its front looks along -z. src/stations/places.ts lays
# them out on a lot and adds the colliders and the name signs. Nothing copies a real shrine, park
# or police emblem.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

STONE = 'flat:#a9a69c'
STONE_DK = 'flat:#7d7b73'
VERMILION = 'flat:#c8402a'
BLACK = 'flat:#1d1f22'
TIMBER = 'flat:#6a4a32'
TIMBER_LT = 'flat:#a07a52'
ROOF = 'flat:#3f4a48'
WHITE = 'flat:#f1f0ea'
STEEL = 'flat:#9aa0a6'
LEAF = ['flat:#3f7a3a', 'flat:#4f8f45', 'flat:#356a33']
GOLD = 'flat:#c9a23a'


def torii(p):
    """Vermilion gate 4.2 m wide: two posts on black feet, a tie beam, a lintel with upturned ends."""
    for sx in (-1.6, 1.6):
        p.cyl(BLACK, (sx, 0.2, 0), 1, 0.24, 0.4, seg=10)
        p.cyl(VERMILION, (sx, 2.2, 0), 1, 0.17, 3.6, seg=10)
    p.box(VERMILION, -2.0, 3.0, -0.09, 2.0, 3.24, 0.09)
    p.box(VERMILION, -2.3, 3.75, -0.13, 2.3, 4.0, 0.13)
    p.prism(BLACK, [(-2.5, 4.0), (2.5, 4.0), (2.62, 4.2), (-2.62, 4.2)], 'z', -0.17, 0.17)
    p.box(VERMILION, -0.08, 3.24, -0.06, 0.08, 3.75, 0.06)
    p.box(BLACK, -0.3, 3.3, -0.1, 0.3, 3.72, -0.06)
    p.box(GOLD, -0.26, 3.34, -0.104, 0.26, 3.68, -0.1)


def lantern(p):
    """Stone lantern."""
    p.box(STONE_DK, -0.3, 0, -0.3, 0.3, 0.15, 0.3)
    p.cyl(STONE, (0, 0.6, 0), 1, 0.12, 0.9, seg=8)
    p.box(STONE, -0.24, 1.05, -0.24, 0.24, 1.15, 0.24)
    p.box(STONE, -0.18, 1.15, -0.18, 0.18, 1.5, 0.18)
    for s in (-1, 1):
        p.box('flat:#f3d9a0', -0.1, 1.22, s * 0.181, 0.1, 1.42, s * 0.183)
    p.prism(STONE_DK, [(-0.34, 1.5), (0.34, 1.5), (0.08, 1.75), (-0.08, 1.75)], 'z', -0.34, 0.34)
    p.cyl(STONE, (0, 1.82, 0), 1, 0.06, 0.14, seg=6)


def roofed(p, w, d, y, rise, over=0.4, mat=ROOF):
    """A gabled roof over a w × d footprint, ridge along x."""
    p.prism(mat, [(-d / 2 - over, y), (d / 2 + over, y), (0, y + rise)], 'x', -w / 2 - over, w / 2 + over)
    p.box(TIMBER, -w / 2 - over, y - 0.08, -d / 2 - over, w / 2 + over, y, d / 2 + over)


def basin(p):
    """Purification basin under a small roof: a stone trough, a bamboo spout, ladles on a rail."""
    for sx in (-0.95, 0.95):
        for sz in (-0.65, 0.65):
            p.box(TIMBER, sx - 0.06, 0, sz - 0.06, sx + 0.06, 2.1, sz + 0.06)
    roofed(p, 2.0, 1.4, 2.1, 0.55)
    p.box(STONE_DK, -0.7, 0, -0.4, 0.7, 0.6, 0.4)
    p.box('flat:#5f8f96', -0.6, 0.6, -0.3, 0.6, 0.61, 0.3)
    p.box(STONE, -0.7, 0.6, -0.4, 0.7, 0.66, -0.3)
    p.box(STONE, -0.7, 0.6, 0.3, 0.7, 0.66, 0.4)
    p.cyl('flat:#8a9a4a', (0.0, 0.9, 0.25), 2, 0.03, 0.5, seg=6)
    p.box(TIMBER_LT, -0.6, 0.72, -0.02, 0.6, 0.75, 0.02)
    for x in (-0.4, -0.1, 0.2):
        p.cyl(TIMBER_LT, (x, 0.78, 0.1), 2, 0.012, 0.36, seg=5)
        p.cyl(TIMBER_LT, (x, 0.78, -0.1), 1, 0.045, 0.06, seg=7)


def hall(p):
    """Small shrine hall on a stone base: steps, an offering box, latticed doors, a bell rope, a deep roof."""
    p.box(STONE, -2.1, 0, -1.7, 2.1, 0.45, 1.7)
    for k in range(3):
        p.box(STONE_DK, -1.0, 0, -1.7 - 0.3 * (3 - k), 1.0, 0.15 * (k + 1), -1.7 - 0.3 * (2 - k))
    p.box(TIMBER, -1.6, 0.45, -1.1, 1.6, 2.7, 1.3)
    p.box(WHITE, -1.5, 1.0, -1.104, -0.75, 2.4, -1.1)
    p.box(WHITE, 0.75, 1.0, -1.104, 1.5, 2.4, -1.1)
    for i in range(7):
        x = -0.66 + i * 0.22
        p.box(TIMBER_LT, x - 0.02, 0.6, -1.12, x + 0.02, 2.45, -1.1)
    for y in (1.2, 1.85):
        p.box(TIMBER_LT, -0.7, y, -1.125, 0.7, y + 0.04, -1.1)
    for sx in (-1.75, 1.75):
        p.cyl(VERMILION, (sx, 1.55, -1.45), 1, 0.1, 2.2, seg=8)
    p.box(VERMILION, -1.85, 2.55, -1.55, 1.85, 2.72, -1.35)
    roofed(p, 3.4, 3.2, 2.7, 1.3, over=0.6)
    p.box(GOLD, -2.3, 3.98, -0.05, 2.3, 4.06, 0.05)
    p.box(TIMBER, -0.5, 0.45, -1.62, 0.5, 0.95, -1.25)
    for i in range(5):
        p.box(TIMBER_LT, -0.42 + i * 0.2, 0.95, -1.6, -0.36 + i * 0.2, 0.97, -1.27)
    p.cyl('flat:#c9a23a', (0, 2.45, -1.5), 1, 0.09, 0.14, seg=8)
    p.cyl('flat:#e8e2d0', (0, 1.75, -1.5), 1, 0.025, 1.3, seg=5)


def notice(p):
    """Roofed notice board."""
    for sx in (-0.62, 0.62):
        p.box(TIMBER, sx - 0.05, 0, -0.05, sx + 0.05, 1.9, 0.05)
    p.box(WHITE, -0.57, 0.8, -0.03, 0.57, 1.7, 0.0)
    p.box('flat:#e9e1c9', -0.45, 0.95, -0.036, -0.05, 1.55, -0.03)
    p.box('flat:#d9a3b0', 0.05, 1.15, -0.036, 0.42, 1.55, -0.03)
    p.prism(ROOF, [(-0.22, 1.9), (0.22, 1.9), (0, 2.08)], 'x', -0.8, 0.8)


def tree(p, sacred=False):
    """Broad old tree; the sacred one wears a straw rope with paper streamers."""
    r = random.Random(7 if sacred else 3)
    p.cyl('flat:#5a4636', (0, 1.6, 0), 1, 0.3 if sacred else 0.18, 3.2, seg=9)
    for k in range(9 if sacred else 6):
        a, rad = k * 2.4, r.uniform(0.6, 1.5)
        x, z, y = rad * math.cos(a), rad * math.sin(a), r.uniform(3.2, 4.8 if sacred else 4.2)
        s = r.uniform(0.9, 1.5)
        p.box(r.choice(LEAF), x - s, y - s * 0.6, z - s, x + s, y + s * 0.6, z + s)
    if sacred:
        p.cyl('flat:#d9c98a', (0, 1.3, 0), 1, 0.34, 0.1, seg=10, caps=False)
        for k in range(4):
            a = k * math.pi / 2 + 0.4
            x, z = 0.35 * math.cos(a), 0.35 * math.sin(a)
            p.box(WHITE, x - 0.05, 1.02, z - 0.012, x + 0.05, 1.26, z + 0.012)


def clockpost(p):
    p.cyl(STONE_DK, (0, 0.15, 0), 1, 0.22, 0.3, seg=10)
    p.cyl('flat:#2f4a3a', (0, 1.9, 0), 1, 0.07, 3.2, seg=8)
    p.cyl('flat:#2f4a3a', (0, 3.75, 0), 2, 0.38, 0.22, seg=14)
    for s in (-1, 1):
        p.cyl(WHITE, (0, 3.75, s * 0.112), 2, 0.32, 0.006, seg=14)
        p.box(BLACK, -0.012, 3.75, s * 0.116 - 0.002, 0.012, 3.98, s * 0.116 + 0.002)
        p.box(BLACK, 0, 3.74, s * 0.116 - 0.002, 0.16, 3.76, s * 0.116 + 0.002)


def fountain(p):
    """Drinking fountain."""
    p.box(STONE_DK, -0.25, 0, -0.25, 0.25, 0.08, 0.25)
    p.cyl(STONE, (0, 0.45, 0), 1, 0.16, 0.74, seg=8)
    p.cyl(STEEL, (0, 0.85, 0), 1, 0.22, 0.06, seg=10)
    p.cyl('flat:#5f8f96', (0, 0.882, 0), 1, 0.18, 0.004, seg=10)
    p.cyl(STEEL, (0.08, 0.93, 0), 1, 0.015, 0.1, seg=5)


def shelter(p):
    """Rest shelter: four posts, a pyramid roof, benches on three sides."""
    for sx in (-1.3, 1.3):
        for sz in (-1.3, 1.3):
            p.box(TIMBER, sx - 0.07, 0, sz - 0.07, sx + 0.07, 2.3, sz + 0.07)
    roofed(p, 2.6, 2.6, 2.3, 0.8, over=0.5)
    p.box(TIMBER_LT, -1.2, 0.4, 0.85, 1.2, 0.45, 1.25)
    for sx in (-1.25, 0.85):
        p.box(TIMBER_LT, sx, 0.4, -0.9, sx + 0.4, 0.45, 0.85)
    for x, z in ((-1.0, 1.05), (1.0, 1.05), (-1.05, -0.6), (1.05, -0.6)):
        p.box(TIMBER, x - 0.04, 0, z - 0.04, x + 0.04, 0.4, z + 0.04)


def fence(p):
    """Two metres of low park fence."""
    for sx in (-1.0, 0.94):
        p.box('flat:#2f4a3a', sx, 0, -0.03, sx + 0.06, 0.75, 0.03)
    for y in (0.3, 0.66):
        p.box('flat:#2f4a3a', -1.0, y, -0.02, 1.0, y + 0.04, 0.02)
    for i in range(7):
        p.box('flat:#2f4a3a', -0.75 + i * 0.25, 0.3, -0.012, -0.73 + i * 0.25, 0.66, 0.012)


def namestone(p):
    """Low stone slab for a place's name (the name is the game's sign on its front)."""
    p.box(STONE_DK, -0.8, 0, -0.25, 0.8, 0.12, 0.25)
    p.prism(STONE, [(-0.75, 0.12), (0.75, 0.12), (0.7, 0.9), (-0.7, 0.9)], 'z', -0.16, 0.16)


def swing(p):
    for sx in (-1.2, 1.2):
        for sz in (-0.6, 0.6):
            p.face('flat:#2f6fb0', [(sx - 0.04, 0, sz), (sx + 0.04, 0, sz), (sx + 0.04, 2.1, 0), (sx - 0.04, 2.1, 0)], (0, 0, sz))
            p.face('flat:#2f6fb0', [(sx - 0.04, 2.1, 0), (sx + 0.04, 2.1, 0), (sx + 0.04, 0, sz), (sx - 0.04, 0, sz)], (0, 0, -sz))
    p.box('flat:#2f6fb0', -1.26, 2.06, -0.05, 1.26, 2.14, 0.05)
    for x in (-0.55, 0.55):
        for dx in (-0.2, 0.2):
            p.box(STEEL, x + dx - 0.008, 0.5, -0.008, x + dx + 0.008, 2.06, 0.008)
        p.box('flat:#e8c93a', x - 0.24, 0.46, -0.1, x + 0.24, 0.5, 0.1)


def koban(p):
    """Police box: a small two-storey block, glazed below with a desk inside, a red lamp over the door."""
    W, D, H = 5.6, 4.2, 6.2
    p.box('flat:#e9e7df', -W / 2, 0, 0, W / 2, H, D)
    p.box('flat:#3a4a5a', -W / 2 - 0.05, 0, -0.02, W / 2 + 0.05, 0.3, D + 0.02)
    p.box('flat:#4a5560', -W / 2 - 0.1, H, -0.1, W / 2 + 0.1, H + 0.2, D + 0.1)
    # Ground floor: a recessed glass front with the door on the right, a desk and a chair behind it.
    p.box('flat:#f4f1e6', -W / 2 + 0.3, 0.3, 0.9, W / 2 - 0.3, 2.7, 0.92)
    p.box('flat:#d9dcdf', -W / 2 + 0.3, 0.3, -0.02, W / 2 - 0.3, 0.5, 0.0)
    p.box('glassTint', -W / 2 + 0.3, 0.5, -0.02, 0.9, 2.6, -0.005)
    p.box('glassTint', 1.0, 0.3, -0.02, W / 2 - 0.4, 2.3, -0.005)
    for x in (-W / 2 + 0.25, -0.75, 0.9, W / 2 - 0.4):
        p.box(STEEL, x, 0.3, -0.04, x + 0.08, 2.7, 0.02)
    p.box(STEEL, -W / 2 + 0.25, 2.6, -0.04, W / 2 - 0.3, 2.72, 0.02)
    p.box(TIMBER_LT, -1.9, 0.3, 0.3, -0.2, 1.05, 0.75)
    p.box(BLACK, -1.2, 1.05, 0.5, -0.8, 1.35, 0.54)
    p.box('flat:#2f4a6a', -1.3, 0.3, 0.76, -0.8, 1.2, 0.9)
    # Canopy with the red lamp, and a blank band for the name (the game's sign).
    p.box('flat:#4a5560', -W / 2 - 0.2, 2.8, -0.9, W / 2 + 0.2, 2.95, 0.0)
    p.cyl('flat:#e02a1e', (1.55, 3.12, -0.5), 1, 0.16, 0.26, seg=10)
    p.cyl(BLACK, (1.55, 2.98, -0.5), 1, 0.12, 0.06, seg=10)
    p.box('flat:#1d3a6a', -W / 2, 3.05, -0.03, W / 2, 3.75, 0.0)
    for x in (-1.6, 0.2, 1.7):
        win(p, x - 0.6, 4.1, x + 0.6, 5.4, 0.0)
    p.cyl(GOLD, (-2.2, 5.75, -0.02), 2, 0.22, 0.03, seg=12)


def mapboard(p):
    """District map board on two legs (the map is the game's sign)."""
    for sx in (-0.7, 0.64):
        p.box(STEEL, sx, 0, -0.03, sx + 0.06, 1.9, 0.03)
    p.box('flat:#2b2f33', -0.8, 0.8, -0.05, 0.8, 1.9, 0.05)
    p.prism('flat:#4a5560', [(-0.12, 1.9), (0.12, 1.9), (0, 1.98)], 'x', -0.85, 0.85)


def bicycle(p):
    """White patrol bicycle on its stand, with a box on the rack."""
    for x in (-0.55, 0.55):
        p.cyl(BLACK, (x, 0.33, 0), 2, 0.33, 0.04, seg=14)
        p.cyl('flat:#d9dcdf', (x, 0.33, 0), 2, 0.28, 0.045, seg=14)
    for a, b_ in (((-0.55, 0.33, 0), (-0.1, 0.72, 0)), ((-0.1, 0.72, 0), (0.42, 0.78, 0)), ((0.42, 0.78, 0), (0.55, 0.33, 0)), ((-0.1, 0.72, 0), (0.05, 0.3, 0)),
                  ((0.05, 0.3, 0), (0.42, 0.78, 0)), ((0.05, 0.3, 0), (-0.55, 0.33, 0)), ((0.42, 0.78, 0), (0.4, 1.02, 0))):
        d = [b_[i] - a[i] for i in range(3)]
        L = math.sqrt(sum(c * c for c in d))
        n = max(1, int(L / 0.12))
        for k in range(n):
            t0, t1 = k / n, (k + 1) / n
            xa, ya, xb, yb = a[0] + d[0] * t0, a[1] + d[1] * t0, a[0] + d[0] * t1, a[1] + d[1] * t1
            p.box(WHITE, min(xa, xb) - 0.015, min(ya, yb) - 0.015, -0.015, max(xa, xb) + 0.015, max(ya, yb) + 0.015, 0.015)
    p.box(BLACK, -0.22, 0.72, -0.07, 0.0, 0.78, 0.07)
    p.box(BLACK, 0.34, 1.0, -0.25, 0.46, 1.04, 0.25)
    p.box(WHITE, -0.75, 0.68, -0.14, -0.4, 0.95, 0.14)


def canopy(p):
    """Lit canopy over a row of vending machines: 5.6 m wide, 1.5 deep, the machines stand under it."""
    for sx in (-2.72, 2.64):
        p.box(STEEL, sx, 0, -0.7, sx + 0.08, 2.5, -0.62)
        p.box(STEEL, sx, 0, 0.62, sx + 0.08, 2.5, 0.7)
    p.box('flat:#e9e7df', -2.9, 2.5, -0.95, 2.9, 2.66, 0.75)
    p.box('light', -2.6, 2.48, -0.5, 2.6, 2.5, -0.2)
    p.box('flat:#2f6fb0', -2.9, 2.5, -0.97, 2.9, 2.66, -0.95)
    p.box('flat:#c9c6bc', -2.9, 0, 0.7, 2.9, 2.5, 0.76)


PROPS = {'torii': (torii, 5.5), 'lantern': (lantern, 1), 'basin': (basin, 3), 'hall': (hall, 5.5), 'notice': (notice, 2),
         'tree': (tree, 4), 'sacredtree': (lambda p: tree(p, True), 5), 'clockpost': (clockpost, 1), 'fountain': (fountain, 1),
         'shelter': (shelter, 4), 'fence': (fence, 2.2), 'namestone': (namestone, 2), 'swing': (swing, 3), 'koban': (koban, 6.5),
         'mapboard': (mapboard, 2), 'bicycle': (bicycle, 2), 'canopy': (canopy, 6.5)}


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('places', [dict(id=k, w=w, gap=1.5) for k, (_, w) in PROPS.items()], build_hi, lambda v: None)
