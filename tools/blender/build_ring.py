# Builds the fittings of the Kita-Ōdōri footbridge ring (the pedestrian deck round the junction
# of the avenue and Yanagi-suji). The decks, stairs and rails are walked on, so the game builds
# those; these are the parts round them.
#
#   blender --background --python tools/blender/build_ring.py -- [--renders <dir>]
#
# Writes assets/buildings/ring.blend and public/models/buildings/ring.glb. Frame: buildkit.py.
#
#   pier      a concrete hammerhead pier, PH to the deck's underside; the deck (DW wide) lies along x.
#   girder    6 m of the deck's steel box girders and fascia, hung under the deck (origin at deck level).
#   canopy    6 m of glazed roof over the deck (origin at deck level, the deck from z = 0 to DW).
#   lift      a glazed lift tower LW square, doors at the street and at the deck (DECK up).
#   stairroof the roof over a stair flight SR long rising along +x from the street to the deck.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

DW, DECK, PH = 4.5, 6.0, 5.0
LW, SR, SW = 2.6, 10.4, 2.6
PAINT_G = 'flat:#6f8f9a'
PAINT_DK = 'flat:#55707a'
CONC_LT = 'flat:#b9b6ae'


def pier(p):
    p.box(CONC_LT, -0.45, 0, DW / 2 - 0.45, 0.45, PH - 0.7, DW / 2 + 0.45)
    p.prism(CONC_LT, [(DW / 2 - 0.45, PH - 1.5), (0.2, PH - 0.5), (0.2, PH), (DW - 0.2, PH), (DW - 0.2, PH - 0.5), (DW / 2 + 0.45, PH - 1.5)], 'x', -0.45, 0.45)
    p.box('flat:#e6a700', -0.47, 0.0, DW / 2 - 0.47, 0.47, 0.9, DW / 2 + 0.47)
    for y in (0.15, 0.45, 0.75):
        p.box(DARK, -0.475, y, DW / 2 - 0.475, 0.475, y + 0.12, DW / 2 + 0.475)


def girder(p):
    for z in (0.15, DW - 0.55):
        p.box(PAINT_G, -3, -1.0, z, 3, -0.5, z + 0.4)
        p.box(PAINT_DK, -3, -1.04, z - 0.08, 3, -0.96, z + 0.48)
    for x in (-2.0, 0.0, 2.0):
        p.box(PAINT_DK, x - 0.08, -0.9, 0.55, x + 0.08, -0.5, DW - 0.55)
    for z, sgn in ((0.0, -1), (DW, 1)):
        p.box(PAINT_G, -3, -0.5, min(z, z + sgn * 0.12), 3, 0.25, max(z, z + sgn * 0.12))
        p.box(WHITE, -3, 0.02, min(z + sgn * 0.12, z + sgn * 0.14), 3, 0.2, max(z + sgn * 0.12, z + sgn * 0.14))
    p.box('light', -1.2, -0.56, DW / 2 - 0.08, 1.2, -0.5, DW / 2 + 0.08)


def canopy(p):
    for x in (-3.0 + 0.06, 3.0 - 0.06):
        for z in (0.12, DW - 0.12):
            p.box(PAINT_G, x - 0.06, 0, z - 0.06, x + 0.06, 2.7, z + 0.06)
    n = 6
    prof = [(0.0 + DW * k / n, 2.7 + 0.75 * math.sin(math.pi * k / n)) for k in range(n + 1)]
    for (za, ya), (zb, yb) in zip(prof[:-1], prof[1:]):
        p.face('glassTint', [(-3, ya, za), (3, ya, za), (3, yb, zb), (-3, yb, zb)], (0, 1, 0))
        for x in (-2.94, 0.0, 2.94):
            p.face(PAINT_G, [(x - 0.05, ya, za), (x + 0.05, ya, za), (x + 0.05, yb, zb), (x - 0.05, yb, zb)], (0, 1, 0))
            p.face(PAINT_G, [(x - 0.05, ya - 0.1, za), (x + 0.05, ya - 0.1, za), (x + 0.05, yb - 0.1, zb), (x - 0.05, yb - 0.1, zb)], (0, -1, 0))
    for z in (0.06, DW - 0.18):
        p.box(PAINT_DK, -3, 2.62, z, 3, 2.74, z + 0.12)
    p.box('light', -1.0, 3.3, DW / 2 - 0.05, 1.0, 3.34, DW / 2 + 0.05)


def lift(p):
    h = LW / 2
    top = DECK + 3.4
    for x in (-h, h - 0.12):
        for z in (0.0, LW - 0.12):
            p.box(PAINT_G, x, 0, z, x + 0.12, top, z + 0.12)
    for face, a0, a1, at in sides(-h, h, 0, LW, 'blr'):
        quad(p, 'glassTint', face, a0 + 0.12, a1 - 0.12, 0.6, top - 0.6, at)
        for y in (0.0, DECK - 0.6, top - 0.6):
            slab(p, PAINT_G, face, a0, a1, y, y + 0.6, at, 0.02)
    # The front: glass either side of the doorways and over them (the game's lift is walked into).
    for a0, a1 in ((-h + 0.12, -0.75), (0.75, h - 0.12)):
        quad(p, 'glassTint', 'f', a0, a1, 0.6, top - 0.6, 0)
        slab(p, PAINT_G, 'f', a0 - 0.12 if a0 < 0 else a0, a1 if a0 < 0 else a1 + 0.12, 0.0, 0.6, 0, 0.02)
    quad(p, 'glassTint', 'f', -0.75, 0.75, 2.42, DECK - 0.6, 0)
    quad(p, 'glassTint', 'f', -0.75, 0.75, DECK + 2.42, top - 0.6, 0)
    for y in (DECK - 0.6, top - 0.6):
        slab(p, PAINT_G, 'f', -h, h, y, y + 0.6 if y > DECK else DECK, 0, 0.02)
    p.box(PAINT_DK, -h - 0.1, top, -0.1, h + 0.1, top + 0.7, LW + 0.1)
    for y, tag in ((0.0, 'door0'), (DECK, 'door1')):
        for sx in (-1, 1):
            p.box(ALU_DK, min(sx * 0.75, sx * 0.83), y, -0.06, max(sx * 0.75, sx * 0.83), y + 2.3, 0.06)
        mark(tag, 0, y + 1.1, -0.08, 1.3, 2.1)
        p.box(PAINT_DK, -1.1, y + 2.3, -0.9, 1.1, y + 2.42, 0.0)
        mark('sign' + tag[-1], 0, y + 2.75, -0.03, 1.6, 0.4)


def stairroof(p):
    k = DECK / SR
    for x in (0.3, SR / 2, SR - 0.3):
        for z in (0.1, SW - 0.1):
            p.box(PAINT_G, x - 0.05, k * x, z - 0.05, x + 0.05, k * x + 2.9, z + 0.05)
    p.face('glassTint', [(0, 2.9, -0.2), (SR + 1.2, 2.9 + k * (SR + 1.2), -0.2), (SR + 1.2, 2.9 + k * (SR + 1.2), SW + 0.2), (0, 2.9, SW + 0.2)], (0, 1, 0))
    for z in (-0.2, SW + 0.1):
        p.face(PAINT_DK, [(0, 2.8, z), (SR + 1.2, 2.8 + k * (SR + 1.2), z), (SR + 1.2, 2.95 + k * (SR + 1.2), z), (0, 2.95, z)], (0, 0, -1 if z < 0 else 1))
        p.face(PAINT_DK, [(0, 2.8, z + 0.1), (SR + 1.2, 2.8 + k * (SR + 1.2), z + 0.1), (SR + 1.2, 2.95 + k * (SR + 1.2), z + 0.1), (0, 2.95, z + 0.1)], (0, 0, 1 if z < 0 else -1))


PARTS = {'pier': (pier, 1.0), 'girder': (girder, 6.0), 'canopy': (canopy, 6.0), 'lift': (lift, LW), 'stairroof': (stairroof, SR)}


def build_hi(v):
    body = Part()
    begin(dict(v, d=DW, h=DECK))
    PARTS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('ring', [dict(id=k, w=w, gap=4.0) for k, (_, w) in PARTS.items()], build_hi, lambda v: None)
    write_anchors('ring')
