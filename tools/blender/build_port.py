# Builds the port landfill's east quay, across the inlet from Kon'yahama's beach (2026-11): red-brick
# warehouses (sōko) and corrugated-steel transit sheds along the quay road, a 1930s harbour office,
# level-luffing quay cranes on their rails, and the quay's furniture, boats and lorries.
#
#   blender --background --python tools/blender/build_port.py -- [--renders <dir>]
#
# Writes assets/buildings/port.blend, public/models/buildings/port.glb and src/stations/anchors/port.ts.
# Frame: front at z = 0 facing -z (towards the water), origin mid-frontage on the ground (y 0). A boat's
# y 0 is its waterline. Nothing here carries a name. Seen from across the inlet: big shapes and strong
# shadows matter more than small detail.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_aizome import *  # noqa: E402,F401,F403
from build_aizome import IRON  # noqa: E402

BRICK = 'flat:#8b4a37'
BRICK_D = 'flat:#6e3a2b'
BRICK_L = 'flat:#a0583f'
STONE = 'flat:#c9c1b0'
ROOF = 'flat:#5b5f62'
ROOF_D = 'flat:#46494c'
DOOR = 'flat:#3e5247'
DOOR_D = 'flat:#2c3a33'
STEEL_W = 'flat:#9ea6a8'
STEEL_WD = 'flat:#7f8789'
RUST = 'flat:#8a5a3c'
CONC = 'flat:#bdb7aa'
CONC_D = 'flat:#9d978b'
CRANE = 'flat:#c9862c'
CRANE_D = 'flat:#9c6420'
HULL = 'flat:#2d3a4a'
HULL_R = 'flat:#7a2b24'
DECK = 'flat:#8c8678'
CABIN = 'flat:#e4e0d4'
TYRE = 'flat:#1e1f21'
WIN = 'flat:#2b3740'


def lit(p, x0, x1, y0, y1, z, face='f'):
    """A window pane the game may light at night."""
    quad(p, WINDOW, face, x0, x1, y0, y1, z)


def gable_roof(p, w, d, eave, rise, mat=ROOF, over=0.5):
    """A pitched roof, ridge along x (the frontage), eaves front and back, gables at the ends."""
    hw = w / 2 + over
    p.prism(mat, [(-over, eave - 0.1), (d / 2, eave + rise), (d + over, eave - 0.1), (d + over, eave + 0.05), (d / 2, eave + rise + 0.18), (-over, eave + 0.05)], 'x', -hw, hw)


def soko(p, s, v, r):
    """A two-storey red-brick warehouse: pilasters, a stone band at each floor, three iron doors below and
    loading doors above under a hoist beam, small barred windows, a pitched slate-grey roof with gable ends."""
    w, d, h = v['w'], v['d'], v['eave']
    hw = w / 2
    p.box(BRICK, -hw, 0, 0, hw, h, d)
    # Gable ends in brick.
    for x0, x1 in ((-hw, -hw + 0.01), (hw - 0.01, hw)):
        p.prism(BRICK, [(0, h), (d / 2, h + v['rise']), (d, h)], 'x', x0 - 0.02, x1 + 0.02)
    gable_roof(p, w, d, h, v['rise'])
    # A stone plinth and a band at the upper floor and under the eaves.
    for y0, y1 in ((0, 0.6), (h / 2 - 0.15, h / 2 + 0.15), (h - 0.45, h - 0.15)):
        p.box(STONE, -hw - 0.06, y0, -0.06, hw + 0.06, y1, d + 0.06)
    bays = v['bays']
    bw = w / bays
    for k in range(bays + 1):
        x = -hw + k * bw
        p.box(BRICK_D, x - 0.35, 0.6, -0.22, x + 0.35, h - 0.45, 0)
        p.box(BRICK_D, x - 0.35, 0.6, d, x + 0.35, h - 0.45, d + 0.22)
    for k in range(bays):
        cx = -hw + (k + 0.5) * bw
        if k % 2 == 0 or bays <= 3:
            # A big iron door, half open on one in three.
            dw = min(3.6, bw - 1.6)
            p.box(DOOR_D, cx - dw / 2, 0, -0.04, cx + dw / 2, 3.8, 0)
            if r.random() < 0.35:
                lit(p, cx - dw / 2 + 0.2, cx + 0.1, 0.1, 3.5, -0.06)
            else:
                p.box(DOOR, cx - dw / 2, 0, -0.14, cx + dw / 2, 3.8, -0.04)
                for y in (1.2, 2.5):
                    p.box(IRON, cx - dw / 2, y, -0.18, cx + dw / 2, y + 0.08, -0.14)
            p.box(STONE, cx - dw / 2 - 0.25, 3.8, -0.12, cx + dw / 2 + 0.25, 4.25, 0)
        else:
            for dx in (-0.9, 0.9):
                p.box(IRON, cx + dx - 0.45, 1.6, -0.08, cx + dx + 0.45, 2.8, 0)
                lit(p, cx + dx - 0.4, cx + dx + 0.4, 1.65, 2.75, -0.02)
        # Upstairs: a loading door under a hoist beam, or two small windows.
        y = h / 2 + 0.6
        if k % 2 == 0:
            p.box(DOOR, cx - 0.9, y, -0.1, cx + 0.9, y + 2.4, 0)
            p.box(IRON, cx - 0.05, y + 2.6, -1.6, cx + 0.05, y + 2.75, 0)
            p.box(IRON, cx - 0.3, y + 2.45, -1.6, cx + 0.3, y + 2.6, -1.4)
        else:
            for dx in (-0.9, 0.9):
                p.box(IRON, cx + dx - 0.45, y + 0.4, -0.08, cx + dx + 0.45, y + 1.8, 0)
                lit(p, cx + dx - 0.4, cx + dx + 0.4, y + 0.45, y + 1.75, -0.02)
    # A lamp over every second door, and rain pipes at the ends.
    for k in range(0, bays, 2):
        cx = -hw + (k + 0.5) * bw
        p.box(IRON, cx - 0.04, 4.5, -0.5, cx + 0.04, 4.6, 0)
        p.box('light', cx - 0.15, 4.25, -0.62, cx + 0.15, 4.5, -0.38)
    for x in (-hw + 0.2, hw - 0.2):
        p.box(IRON, x - 0.07, 0, -0.3, x + 0.07, h, -0.16)


def shed(p, s, v, r):
    """A corrugated-steel transit shed: ribbed walls on a concrete base, a shallow roof with a raised
    clerestory down the middle, wide sliding doors along the front, a canopy over the apron."""
    w, d, h = v['w'], v['d'], v['eave']
    hw = w / 2
    p.box(CONC, -hw, 0, 0, hw, 1.2, d)
    p.box(v['wall'], -hw + 0.05, 1.2, 0.05, hw - 0.05, h, d - 0.05)
    # Ribs on the front and back.
    x = -hw + 0.4
    while x < hw - 0.3:
        p.box(v['rib'], x - 0.06, 1.2, -0.04, x + 0.06, h, 0.05)
        p.box(v['rib'], x - 0.06, 1.2, d - 0.05, x + 0.06, h, d + 0.04)
        x += 0.8
    gable_roof(p, w, d, h, 1.4, ROOF_D, 0.4)
    p.box(v['wall'], -hw + 4, h + 1.0, d / 2 - 2.2, hw - 4, h + 2.6, d / 2 + 2.2)
    p.box(ROOF_D, -hw + 3.8, h + 2.6, d / 2 - 2.6, hw - 3.8, h + 2.8, d / 2 + 2.6)
    x = -hw + 4.6
    while x < hw - 5:
        lit(p, x, x + 1.4, h + 1.4, h + 2.3, d / 2 - 2.22)
        x += 2.4
    # Sliding doors, some open onto a lit interior.
    n = v['doors']
    for k in range(n):
        cx = -hw + (k + 0.5) * w / n
        p.box(DOOR_D, cx - 2.6, 0, -0.06, cx + 2.6, 5.0, 0)
        if r.random() < 0.4:
            lit(p, cx - 2.4, cx + 2.4, 0.1, 4.8, -0.08)
        else:
            p.box(v['door'], cx - 2.6, 0, -0.16, cx + 2.6, 5.0, -0.06)
            p.box(IRON, cx - 2.7, 5.0, -0.3, cx + 2.7, 5.15, 0)
    # The canopy over the apron on brackets, lamps under it.
    p.box(ROOF_D, -hw, 5.6, -4.0, hw, 5.75, 0)
    x = -hw + 1
    while x < hw:
        p.prism(IRON, [(-3.8, 5.6), (0, 5.6), (0, 3.8), (-0.2, 3.8), (-0.2, 5.45), (-3.8, 5.45)], 'x', x - 0.06, x + 0.06)
        p.box('light', x + 2.0, 5.45, -2.2, x + 2.6, 5.55, -1.8)
        x += 6


def office(p, s, v, r):
    """The harbour office: a three-storey 1930s concrete block with horizontal window bands, a rounded
    corner stair tower with a flagpole, and a canopy over the door."""
    w, d = v['w'], v['d']
    hw = w / 2
    fl = 3.6
    p.box(CONC, -hw, 0, 0, hw, 3 * fl + 0.6, d)
    p.box(CONC_D, -hw - 0.1, 3 * fl + 0.6, -0.1, hw + 0.1, 3 * fl + 1.0, d + 0.1)
    for k in range(3):
        y = k * fl
        p.box(CONC_D, -hw - 0.08, y + 0.8, -0.12, hw + 0.08, y + 0.95, 0)
        x = -hw + 0.8
        while x + 1.6 < hw - 3.6:
            p.box(WIN, x, y + 1.0, -0.04, x + 1.6, y + 2.7, 0)
            lit(p, x + 0.08, x + 1.52, y + 1.05, y + 2.65, -0.06)
            x += 2.0
    # The stair tower at the north corner, round in front.
    tx = hw - 2.2
    p.cyl(CONC, (tx, (3 * fl + 3.4) / 2, -0.4), 1, 2.2, 3 * fl + 3.4, seg=20)
    p.box(CONC_D, tx - 2.3, 3 * fl + 3.4, -2.6, tx + 2.3, 3 * fl + 3.7, 1.8)
    for k in range(3):
        p.box(WIN, tx - 0.4, k * fl + 1.4, -2.65, tx + 0.4, k * fl + 3.2, -2.5)
        lit(p, tx - 0.35, tx + 0.35, k * fl + 1.45, k * fl + 3.15, -2.67)
    p.box(IRON, tx - 0.05, 3 * fl + 3.7, -0.45, tx + 0.05, 3 * fl + 10.0, -0.35)
    # The door and its canopy, two lamps.
    p.box(DOOR_D, -1.2, 0, -0.05, 1.2, 2.6, 0)
    lit(p, -1.1, 1.1, 0.05, 2.5, -0.07)
    p.box(CONC_D, -2.2, 2.9, -1.8, 2.2, 3.15, 0)
    for x in (-1.6, 1.6):
        p.box('light', x - 0.15, 2.4, -0.3, x + 0.15, 2.75, -0.1)


def crane(p, s, v, r):
    """A level-luffing quay crane: a four-legged portal astride the apron on its rails, a turntable
    with the machinery house and cab, the jib out over the water (towards -z)."""
    g, a = 9.0, 7.0  # rail gauge (z) and leg spacing (x)
    top = 9.0
    for x in (-a / 2, a / 2):
        for z in (-g + 0.5, 0.5):
            p.box(CRANE, x - 0.35, 0.5, z - 0.35, x + 0.35, top, z + 0.35)
            p.box(CRANE_D, x - 0.8, 0, z - 0.6, x + 0.8, 0.6, z + 0.6)
        p.box(CRANE, x - 0.3, top - 1.2, -g + 0.2, x + 0.3, top, 0.8)
        p.prism(CRANE, [(-g + 0.5, 1.5), (-g + 1.0, 1.5), (0.5, top - 1.4), (0.0, top - 1.4)], 'x', x - 0.12, x + 0.12)
    p.box(CRANE, -a / 2 - 0.3, top, -g + 0.2, a / 2 + 0.3, top + 0.8, 0.8)
    cz = -g / 2 + 0.5
    p.cyl(CRANE_D, (0, top + 1.1, cz), 1, 2.6, 0.6, seg=16)
    # The machinery house, its counterweight behind, the cab in front.
    p.box(CRANE, -2.2, top + 1.4, cz - 1.5, 2.2, top + 5.2, cz + 3.5)
    p.box(ROOF_D, -2.4, top + 5.2, cz - 1.7, 2.4, top + 5.5, cz + 3.7)
    p.box(CONC_D, -1.8, top + 1.4, cz + 3.5, 1.8, top + 4.2, cz + 5.0)
    p.box(CABIN, -1.0, top + 1.6, cz - 3.0, 1.0, top + 4.0, cz - 1.5)
    lit(p, -0.9, 0.9, top + 2.6, top + 3.8, cz - 3.02)
    # The jib and its stay up to the A-frame.
    jy = top + 4.0
    p.prism(CRANE, [(cz - 1.5, jy), (cz - 1.5, jy + 1.0), (cz - 24.0, jy + 6.5), (cz - 24.0, jy + 6.0)], 'x', -0.5, 0.5)
    p.prism(CRANE_D, [(cz - 22.5, jy + 6.0), (cz - 24.5, jy + 6.0), (cz - 24.5, jy + 4.5), (cz - 22.5, jy + 4.5)], 'x', -0.35, 0.35)
    p.prism(CRANE, [(cz + 1.5, top + 5.5), (cz + 2.3, top + 5.5), (cz + 0.4, top + 12.0), (cz - 0.2, top + 12.0)], 'x', -0.9, -0.6)
    p.prism(CRANE, [(cz + 1.5, top + 5.5), (cz + 2.3, top + 5.5), (cz + 0.4, top + 12.0), (cz - 0.2, top + 12.0)], 'x', 0.6, 0.9)
    p.prism(IRON, [(cz + 0.1, top + 11.8), (cz + 0.2, top + 12.0), (cz - 18.0, jy + 6.6), (cz - 18.1, jy + 6.4)], 'x', -0.06, 0.06)
    # The hook hanging from the jib's head.
    p.box(IRON, -0.03, jy - 1.0, cz - 23.55, 0.03, jy + 4.6, cz - 23.45)
    p.box(CRANE_D, -0.35, jy - 1.6, cz - 23.8, 0.35, jy - 1.0, cz - 23.2)
    p.box('light', -0.2, top + 5.0, cz - 1.75, 0.2, top + 5.3, cz - 1.55)


def bollard(p, s, v, r):
    """A cast-iron mooring bollard on the quay edge, and a ring set in the face below."""
    p.cyl(IRON, (0, 0.275, 0.5), 1, 0.22, 0.55, seg=10)
    p.cyl(IRON, (0, 0.6, 0.5), 1, 0.32, 0.1, seg=10)
    p.box(IRON, -0.06, -0.8, -0.04, 0.06, -0.5, 0.02)


def quaylamp(p, s, v, r):
    """A tall quay lamp: a steel pole, an arm out over the apron, a lantern."""
    p.box(STEEL_WD, -0.12, 0, -0.12, 0.12, 9.0, 0.12)
    p.box(STEEL_WD, -0.06, 8.7, -2.2, 0.06, 8.85, 0.0)
    p.box(STEEL_W, -0.3, 8.4, -2.5, 0.3, 8.7, -1.9)
    p.box('light', -0.25, 8.3, -2.45, 0.25, 8.4, -1.95)


def boat(p, s, v, r):
    """A small harbour work boat moored side-on: dark hull, red boot top, a wheelhouse and a mast."""
    L, B = v['w'], 3.6
    hl = L / 2
    hull = [(-hl, 1.0), (-hl + 0.6, -0.8), (hl - 2.5, -0.8), (hl, 1.2), (hl, 1.4), (-hl, 1.2)]
    p.prism(HULL, hull, 'z', -B / 2, B / 2)
    p.box(HULL_R, -hl + 0.6, -0.1, -B / 2 - 0.02, hl - 1.9, 0.15, B / 2 + 0.02)
    p.box(DECK, -hl + 0.3, 1.0, -B / 2 + 0.2, hl - 0.6, 1.1, B / 2 - 0.2)
    p.box(CABIN, -1.0, 1.1, -1.2, 1.8, 3.2, 1.2)
    p.box(ROOF_D, -1.2, 3.2, -1.4, 2.0, 3.35, 1.4)
    for z in (-1.22, 1.22):
        lit(p, -0.8, 1.6, 2.2, 2.9, z, 'f' if z < 0 else 'b')
    p.box(IRON, 0.3, 3.35, -0.05, 0.4, 7.0, 0.05)
    p.box('light', 0.25, 6.9, -0.1, 0.45, 7.1, 0.1)
    # Tyres along the side as fenders.
    for x in (-hl + 1.5, -1.5, 2.5, hl - 2.5):
        p.cyl(TYRE, (x, 0.5, -B / 2 - 0.1), 2, 0.35, 0.2, seg=10)


def barge(p, s, v, r):
    """A flat steel barge, a low hold covered with tarpaulins."""
    L, B = v['w'], 7.0
    hl = L / 2
    p.prism(RUST, [(-hl, 1.0), (-hl + 1.2, -1.2), (hl - 1.2, -1.2), (hl, 1.0)], 'z', -B / 2, B / 2)
    p.box(HULL, -hl + 0.4, 0.8, -B / 2, hl - 0.4, 1.1, B / 2)
    for k in range(4):
        x0 = -hl + 2 + k * (L - 4) / 4
        p.box(['flat:#3c5a68', 'flat:#55636a', 'flat:#3c5a68', 'flat:#6a6a5a'][k], x0 + 0.2, 1.1, -B / 2 + 0.8, x0 + (L - 4) / 4 - 0.2, 1.9, B / 2 - 0.8)


def lorry(p, s, v, r):
    """A parked flatbed lorry, cab to the left, side-on to the road."""
    c = ['flat:#d7d4c8', 'flat:#3f6f9a', 'flat:#2f6a4a'][v['seed'] % 3]
    p.box(TYRE, -3.0, 0, -1.1, -2.2, 0.9, 1.1)
    p.box(TYRE, 1.2, 0, -1.1, 2.6, 0.9, 1.1)
    p.box(IRON, -3.6, 0.6, -1.0, 3.6, 1.1, 1.0)
    p.box(c, -3.8, 1.1, -1.15, -1.8, 3.0, 1.15)
    p.box(WIN, -3.82, 2.1, -1.0, -3.79, 2.8, 1.0)
    p.box(DECK, -1.7, 1.1, -1.2, 3.8, 1.35, 1.2)
    if v['seed'] % 2:
        p.box('flat:#5d6f5f', -1.4, 1.35, -1.1, 3.4, 2.6, 1.1)


STYLES_P = {'soko': soko, 'shed': shed, 'office': office, 'crane': crane, 'bollard': bollard, 'quaylamp': quaylamp, 'boat': boat, 'barge': barge, 'lorry': lorry}

VARIANTS_P = [
    dict(id='soko_a', style='soko', w=36.0, d=20.0, eave=10.0, rise=3.2, bays=6, seed=1),
    dict(id='soko_b', style='soko', w=28.0, d=18.0, eave=9.0, rise=2.8, bays=4, seed=2),
    dict(id='soko_c', style='soko', w=44.0, d=22.0, eave=10.5, rise=3.4, bays=7, seed=3),
    dict(id='shed_a', style='shed', w=42.0, d=24.0, eave=8.5, wall=STEEL_W, rib=STEEL_WD, door='flat:#6f7f84', doors=4, seed=4),
    dict(id='shed_b', style='shed', w=34.0, d=22.0, eave=8.0, wall='flat:#8f9f8c', rib='flat:#76866f', door='flat:#5f6f5a', doors=3, seed=5),
    dict(id='office', style='office', w=20.0, d=14.0, h=21.0, seed=6),
    dict(id='crane', style='crane', w=8.0, d=10.0, h=26.0, seed=7),
    dict(id='bollard', style='bollard', w=0.8, d=1.0, h=0.7, seed=8),
    dict(id='quaylamp', style='quaylamp', w=0.6, d=2.6, h=9.0, seed=9),
    dict(id='boat_a', style='boat', w=12.0, d=4.0, h=7.0, seed=10),
    dict(id='boat_b', style='boat', w=10.0, d=4.0, h=7.0, seed=11),
    dict(id='barge', style='barge', w=24.0, d=7.0, h=2.0, seed=12),
    dict(id='lorry_a', style='lorry', w=7.6, d=2.4, h=3.0, seed=13),
    dict(id='lorry_b', style='lorry', w=7.6, d=2.4, h=3.0, seed=14),
]
for _v in VARIANTS_P:
    _v['gap'] = 4.0
    _v.setdefault('h', _v.get('eave', 0) + _v.get('rise', 0))


def build_p(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(v['seed'] * 131 + 7)
    STYLES_P[v['style']](body, signs, v, r)
    return body, signs


if __name__ == '__main__':
    run('port', VARIANTS_P, build_p, lambda v: None)
    write_anchors('port')
