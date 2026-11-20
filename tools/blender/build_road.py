# Builds the road kit: signals, sign furniture, vehicles and street furniture.
#
#   blender --background --python tools/blender/build_road.py -- [--renders <dir>]
#
# Writes assets/buildings/road.blend and public/models/buildings/road.glb.
#
# Frame and helpers: see buildkit.py. Each prop is one root, road_<id>, with one mesh (materials
# 'paint', 'light', 'glassTint'). The origin is on the ground; the front faces -z:
#   - a signal's lenses, a sign board or a mirror face -z, and a mast's arm reaches along -x
#     (to the right of a driver looking at it: masts stand on the left kerb, as in Japan);
#   - a vehicle's nose points to -z, its origin is the middle of its footprint.
# Nothing here carries information: signal lenses, sign faces, the direction boards and the bus
# stop's name are game signs laid over the blank housings and boards (src/stations/roads.ts, which
# mirrors ARMS, the housing and board positions below).

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

POLE = 'flat:#8b9197'
POLE_DK = 'flat:#5d6268'
HOUSING = 'flat:#2b2f33'
WHITE = 'flat:#eeeeea'
ORANGE = 'flat:#e8791c'
BLUE = 'flat:#1f5fae'
RUBBER = 'flat:#1c1c1e'
RIM = 'flat:#b9bdc2'
TAIL = 'flat:#b3261e'
AMBER = 'flat:#e8a020'
TIMBER = 'flat:#6b5440'

# Shared with src/stations/roads.ts.
ARMS = {'signal9': 8.7, 'signal7': 6.4, 'signal3': 2.6}
HEAD_Y, HEAD_IN = 5.55, 0.75      # lens housing: height of its centre, distance in from the arm's tip
# The board has the proportions of sign 108の2-A (方面及び方向), about 1.19 : 1, its foot 4.8 m over the road.
BOARD = dict(arm=7.0, cx=-4.6, cy=6.4, w=3.7, h=3.14)


def tube(p, mat, a, b, r, seg=8):
    """A tube from a to b."""
    d = [b[i] - a[i] for i in range(3)]
    L = math.sqrt(sum(c * c for c in d)) or 1e-6
    d = [c / L for c in d]
    ref = (0, 1, 0) if abs(d[1]) < 0.9 else (1, 0, 0)
    u = [d[1] * ref[2] - d[2] * ref[1], d[2] * ref[0] - d[0] * ref[2], d[0] * ref[1] - d[1] * ref[0]]
    n = math.sqrt(sum(c * c for c in u))
    u = [c / n for c in u]
    v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]]

    def P(o, k):
        t = 2 * math.pi * k / seg
        return tuple(o[i] + r * (math.cos(t) * u[i] + math.sin(t) * v[i]) for i in range(3))

    for k in range(seg):
        t = 2 * math.pi * (k + 0.5) / seg
        hint = tuple(math.cos(t) * u[i] + math.sin(t) * v[i] for i in range(3))
        p.face(mat, [P(a, k), P(a, k + 1), P(b, k + 1), P(b, k)], hint)


# ── Signals and sign furniture ──

def signal(p, arm):
    # Mast with a base, a tapering shaft and a control box; arm braced from above.
    p.cyl(POLE_DK, (0, 0.2, 0), 1, 0.2, 0.4, seg=10)
    p.cyl(POLE, (0, 3.3, 0), 1, 0.11, 6.2, seg=10)
    p.cyl(POLE_DK, (0, 6.42, 0), 1, 0.13, 0.06, seg=10)
    p.box(POLE, -0.2, 1.0, 0.1, 0.2, 1.7, 0.34)
    tube(p, POLE, (0, 5.9, 0), (-arm, 6.0, 0), 0.06)
    tube(p, POLE, (0, 6.35, 0), (-arm * 0.55, 5.98, 0), 0.025, seg=5)
    # Horizontal three-lens housing hung under the arm, with a visor over each lens.
    hx = -(arm - HEAD_IN)
    for sx in (-0.4, 0.4):
        tube(p, POLE, (hx + sx, 5.97, 0), (hx + sx, HEAD_Y + 0.24, 0), 0.02, seg=5)
    p.box(HOUSING, hx - 0.68, HEAD_Y - 0.24, -0.14, hx + 0.68, HEAD_Y + 0.24, 0.14)
    for k in (-1, 0, 1):
        cx = hx + k * 0.42
        p.box(HOUSING, cx - 0.2, HEAD_Y + 0.17, -0.34, cx + 0.2, HEAD_Y + 0.2, -0.14)
        for s in (-1, 1):
            p.box(HOUSING, cx + s * 0.2 - 0.012, HEAD_Y - 0.02, -0.3, cx + s * 0.2 + 0.012, HEAD_Y + 0.2, -0.14)
    # White back board with a border, as on wide roads.
    p.box(WHITE, hx - 0.78, HEAD_Y - 0.34, 0.14, hx + 0.78, HEAD_Y + 0.34, 0.16)


def ped(p):
    """Pedestrian signal: a post with a vertical two-lens housing."""
    p.cyl(POLE_DK, (0, 0.12, 0), 1, 0.11, 0.24, seg=8)
    p.cyl(POLE, (0, 1.6, 0), 1, 0.07, 3.2, seg=8)
    p.box(POLE, -0.03, 2.55, -0.14, 0.03, 2.75, 0)
    p.box(HOUSING, -0.2, 2.26, -0.34, 0.2, 3.04, -0.14)
    p.box(HOUSING, -0.22, 3.02, -0.46, 0.22, 3.05, -0.14)
    p.box(HOUSING, -0.22, 2.63, -0.44, 0.22, 2.66, -0.14)
    # Push-button box.
    p.box('flat:#e8c020', -0.09, 1.05, -0.13, 0.09, 1.3, -0.06)


def signpole(p):
    p.cyl(POLE_DK, (0, 0.05, 0), 1, 0.09, 0.1, seg=8)
    p.cyl(POLE, (0, 1.55, 0), 1, 0.04, 3.1, seg=8)
    p.cyl(POLE_DK, (0, 3.12, 0), 1, 0.05, 0.04, seg=8)


def gantry(p):
    """Overhead direction board: an F-shaped cantilever with a blank blue board."""
    b = BOARD
    p.cyl(POLE_DK, (0, 0.25, 0), 1, 0.3, 0.5, seg=12)
    p.cyl(POLE, (0, 4.15, 0), 1, 0.17, 8.3, seg=12)
    p.cyl(POLE_DK, (0, 8.33, 0), 1, 0.19, 0.06, seg=12)
    for y in (b['cy'] - 1.0, b['cy'] + 1.0):
        tube(p, POLE, (0, y, 0), (-b['arm'], y, 0), 0.08)
    for k in range(8):
        xa, xb = -b['arm'] * k / 8, -b['arm'] * (k + 1) / 8
        ya, yb = (b['cy'] - 1.0, b['cy'] + 1.0) if k % 2 == 0 else (b['cy'] + 1.0, b['cy'] - 1.0)
        tube(p, POLE, (xa, ya, 0), (xb, yb, 0), 0.03, seg=5)
    p.box(BLUE, b['cx'] - b['w'] / 2, b['cy'] - b['h'] / 2, -0.14, b['cx'] + b['w'] / 2, b['cy'] + b['h'] / 2, -0.09)
    p.box(POLE_DK, b['cx'] - b['w'] / 2, b['cy'] - b['h'] / 2, -0.09, b['cx'] + b['w'] / 2, b['cy'] + b['h'] / 2, -0.07)


def busstop(p):
    """Bus stop pole: a round head and a timetable case, both blank for the game."""
    p.cyl(POLE_DK, (0, 0.06, 0), 1, 0.22, 0.12, seg=12)
    p.cyl(POLE, (0, 1.3, 0), 1, 0.045, 2.5, seg=8)
    p.cyl(ORANGE, (0, 2.62, 0), 2, 0.3, 0.05, seg=20)
    p.cyl(WHITE, (0, 2.62, -0.028), 2, 0.25, 0.01, seg=20)
    p.box(WHITE, -0.27, 1.05, -0.04, 0.27, 1.95, 0.04)
    p.box(POLE_DK, -0.3, 1.02, -0.03, 0.3, 1.98, 0.03)


def shelter(p):
    """Bus shelter, open to -z: a roof on four posts, a glass back, a bench."""
    for sx in (-1.9, 1.9):
        for sz in (-0.6, 0.7):
            p.box(POLE_DK, sx - 0.04, 0, sz - 0.04, sx + 0.04, 2.45, sz + 0.04)
    p.box(POLE_DK, -2.1, 2.45, -0.85, 2.1, 2.52, 0.85)
    p.box(WHITE, -2.05, 2.52, -0.8, 2.05, 2.56, 0.8)
    p.face('glassTint', [(-1.9, 0.3, 0.7), (1.9, 0.3, 0.7), (1.9, 2.3, 0.7), (-1.9, 2.3, 0.7)], (0, 0, -1))
    p.face('glassTint', [(-1.9, 0.3, 0.7), (1.9, 0.3, 0.7), (1.9, 2.3, 0.7), (-1.9, 2.3, 0.7)], (0, 0, 1))
    for s in (-1, 1):
        p.face('glassTint', [(s * 1.9, 0.3, 0.05), (s * 1.9, 0.3, 0.7), (s * 1.9, 2.3, 0.7), (s * 1.9, 2.3, 0.05)], (-s, 0, 0))
        p.face('glassTint', [(s * 1.9, 0.3, 0.05), (s * 1.9, 0.3, 0.7), (s * 1.9, 2.3, 0.7), (s * 1.9, 2.3, 0.05)], (s, 0, 0))
    for k in range(4):
        z = 0.2 + k * 0.1
        p.box(TIMBER, -1.4, 0.43, z, 1.4, 0.47, z + 0.08)
    for sx in (-1.2, 1.2):
        p.box(POLE_DK, sx - 0.03, 0, 0.22, sx + 0.03, 0.43, 0.56)
    p.face('light', [(-1.6, 2.44, -0.2), (1.6, 2.44, -0.2), (1.6, 2.44, 0.2), (-1.6, 2.44, 0.2)], (0, -1, 0))


def mirror(p):
    """Kerb mirror (カーブミラー): an orange pole and a round hooded mirror."""
    p.cyl(ORANGE, (0, 1.5, 0), 1, 0.045, 3.0, seg=8)
    p.box(ORANGE, -0.03, 2.75, -0.2, 0.03, 2.85, 0)
    p.cyl(ORANGE, (0, 2.8, -0.24), 2, 0.42, 0.08, seg=20)
    p.cyl('flat:#aebcc4', (0, 2.8, -0.285), 2, 0.37, 0.01, seg=20)
    p.box(ORANGE, -0.44, 3.16, -0.42, 0.44, 3.2, -0.2)


def bollard(p):
    p.cyl(HOUSING, (0, 0.42, 0), 1, 0.07, 0.84, seg=8)
    p.cyl(WHITE, (0, 0.66, 0), 1, 0.075, 0.1, seg=8)
    p.cyl(HOUSING, (0, 0.86, 0), 1, 0.085, 0.04, seg=8)


def rail(p):
    """A 2.5 m panel of pedestrian guard rail along x: posts, two pipes, vertical bars."""
    for x in (-1.2, 1.2):
        p.cyl(WHITE, (x, 0.45, 0), 1, 0.035, 0.9, seg=6)
    for y in (0.82, 0.3):
        tube(p, WHITE, (-1.25, y, 0), (1.25, y, 0), 0.025, seg=6)
    for k in range(9):
        x = -1.0 + k * 0.25
        tube(p, WHITE, (x, 0.3, 0), (x, 0.82, 0), 0.012, seg=4)


# Where the wires hang on a utility pole, in its own frame (y, z): the pole's front (-z) faces the
# road and the wires run along x. Shared with src/stations/roads.ts (HV, LV, TEL).
HV = [(9.32, -1.35), (9.32, -0.8), (9.32, -0.2)]
LV = [(7.45, -0.3), (7.25, -0.3), (7.05, -0.3)]
TEL = [(5.95, -0.24), (5.6, -0.24)]


def upole(p, transformer=True):
    """Utility pole: a crossarm for the high-voltage wires reaching over the road side, a rack for
    the low-voltage ones, a telecom splice box, a street light, and on some a transformer."""
    conc, arm, ins = 'flat:#8a8479', 'flat:#6f6a60', 'flat:#d9d5c8'
    p.cyl(conc, (0, 4.85, 0), 1, 0.16, 9.7, seg=10)
    p.box(arm, -0.05, 9.0, -1.5, 0.05, 9.1, 0.3)
    tube(p, arm, (0, 8.4, 0), (0, 9.0, -1.1), 0.025, seg=5)
    for y, z in HV:
        p.cyl(ins, (0, y - 0.12, z), 1, 0.045, 0.2, seg=6)
    p.box(arm, -0.03, 6.95, -0.34, 0.03, 7.55, -0.16)
    for y, z in LV:
        p.box(ins, -0.05, y - 0.04, z - 0.05, 0.05, y + 0.04, z + 0.03)
    p.box('flat:#2b2b2b', -0.4, 5.5, -0.32, 0.1, 5.72, -0.16)
    for y, z in TEL:
        p.box(arm, -0.03, y - 0.03, z - 0.02, 0.03, y + 0.03, -0.16)
    if transformer:
        p.box(arm, -0.04, 6.3, 0.1, 0.04, 6.38, 0.5)
        p.cyl('flat:#9b9b9b', (0, 6.8, 0.44), 1, 0.25, 0.8, seg=10)
        p.cyl('flat:#8a8a8a', (0, 7.22, 0.44), 1, 0.27, 0.05, seg=10)
        for dx in (-0.1, 0.1):
            p.cyl(ins, (dx, 7.34, 0.44), 1, 0.035, 0.2, seg=6)
        tube(p, 'flat:#1b1b1d', (0.1, 7.44, 0.44), (0, 7.3, -0.3), 0.012, seg=4)
    # The street light (防犯灯): a short arm over the road with a flat LED head.
    tube(p, POLE, (0, 5.0, -0.16), (0, 5.3, -1.2), 0.03, seg=5)
    p.box('light', -0.12, 5.22, -1.5, 0.12, 5.28, -1.0)
    p.box(POLE_DK, -0.14, 5.28, -1.52, 0.14, 5.33, -0.98)
    for k in range(6):
        p.box('flat:#3a3a3a', 0.16, 1.0 + k * 0.45, -0.03, 0.2, 1.04 + k * 0.45, 0.03)


def lamp_hw(p):
    """Highway-style street light for main roads: a tall tapered mast curving out over the road."""
    p.cyl(POLE_DK, (0, 0.25, 0), 1, 0.2, 0.5, seg=10)
    tube(p, POLE, (0, 0.5, 0), (0, 8.2, 0), 0.1, seg=10)
    prev = (0, 8.2, 0)
    for k in range(1, 8):
        t = k / 7 * math.pi / 2
        q = (0, 8.2 + 1.9 * math.sin(t), -2.5 * (1 - math.cos(t)))
        tube(p, POLE, prev, q, 0.07 - 0.003 * k, seg=8)
        prev = q
    p.box(POLE_DK, -0.2, prev[1] - 0.08, prev[2] - 0.95, 0.2, prev[1] + 0.06, prev[2] + 0.05)
    p.box('light', -0.16, prev[1] - 0.11, prev[2] - 0.9, 0.16, prev[1] - 0.08, prev[2] - 0.05)


def lamp_shop(p):
    """Shopping-street lamp: a dark green post, twin lanterns on scroll arms, a banner arm."""
    green, brass = 'flat:#1d3b2f', 'flat:#b08d3a'
    p.cyl(green, (0, 0.3, 0), 1, 0.16, 0.6, seg=10)
    p.cyl(brass, (0, 0.62, 0), 1, 0.13, 0.05, seg=10)
    tube(p, green, (0, 0.6, 0), (0, 5.0, 0), 0.065, seg=8)
    p.cyl(brass, (0, 5.08, 0), 1, 0.1, 0.16, seg=8)
    for sx in (-1, 1):
        tube(p, green, (0, 4.3, 0), (sx * 0.5, 4.75, 0), 0.03, seg=5)
        tube(p, green, (sx * 0.5, 4.75, 0), (sx * 0.85, 4.6, 0), 0.03, seg=5)
        p.box(green, sx * 0.85 - 0.17, 4.5, -0.17, sx * 0.85 + 0.17, 4.56, 0.17)
        p.box('light', sx * 0.85 - 0.13, 4.1, -0.13, sx * 0.85 + 0.13, 4.5, 0.13)
        p.box(green, sx * 0.85 - 0.15, 4.04, -0.15, sx * 0.85 + 0.15, 4.1, 0.15)
        for dx, dz in ((-0.14, -0.14), (0.14, -0.14), (-0.14, 0.14), (0.14, 0.14)):
            p.box(green, sx * 0.85 + dx - 0.012, 4.1, dz - 0.012, sx * 0.85 + dx + 0.012, 4.5, dz + 0.012)
    # Banner arm towards the road, with a plain banner (the street's colours).
    tube(p, green, (0, 3.7, 0), (0, 3.7, -0.75), 0.02, seg=4)
    tube(p, green, (0, 2.4, 0), (0, 2.4, -0.75), 0.02, seg=4)
    p.box('flat:#8f2020', -0.012, 2.45, -0.72, 0.012, 3.65, -0.1)
    p.box('flat:#f3e3a0', -0.014, 2.45, -0.72, 0.014, 2.6, -0.1)


def lamp_park(p):
    """Low lantern for parks, promenades and station forecourts."""
    dark = 'flat:#2b2f33'
    p.cyl(dark, (0, 0.2, 0), 1, 0.13, 0.4, seg=8)
    tube(p, dark, (0, 0.4, 0), (0, 3.1, 0), 0.05, seg=8)
    p.box(dark, -0.2, 3.1, -0.2, 0.2, 3.16, 0.2)
    p.box('light', -0.15, 3.16, -0.15, 0.15, 3.6, 0.15)
    for dx, dz in ((-0.17, -0.17), (0.17, -0.17), (-0.17, 0.17), (0.17, 0.17)):
        p.box(dark, dx - 0.015, 3.16, dz - 0.015, dx + 0.015, 3.6, dz + 0.015)
    p.box(dark, -0.24, 3.6, -0.24, 0.24, 3.66, 0.24)
    p.box(dark, -0.1, 3.66, -0.1, 0.1, 3.74, 0.1)


# Finger post arms (shared with roads.ts FINGER): height of each arm's middle and which way it points along x.
FINGER = [(2.5, 1), (2.26, -1), (2.02, 1)]


def fingerpost(p):
    """Pedestrian finger post: three blank arms for the game's wayfinding names."""
    dark = 'flat:#2b2f33'
    p.cyl(dark, (0, 0.06, 0), 1, 0.12, 0.12, seg=8)
    p.cyl(dark, (0, 1.4, 0), 1, 0.045, 2.8, seg=8)
    p.cyl('flat:#b08d3a', (0, 2.84, 0), 1, 0.07, 0.08, seg=8)
    for y, sx in FINGER:
        x0, x1 = (0.06, 1.06) if sx > 0 else (-1.06, -0.06)
        p.box(BLUE, x0, y - 0.09, -0.02, x1, y + 0.09, 0.02)
        tip = x1 if sx > 0 else x0
        p.prism(BLUE, [(tip, y - 0.09), (tip + sx * 0.12, y), (tip, y + 0.09)], 'z', -0.02, 0.02)


def mapstand(p):
    """Standing area map: two legs and a board, its face left blank for the game's map."""
    dark = 'flat:#2b2f33'
    for sx in (-0.7, 0.7):
        p.box(dark, sx - 0.04, 0, -0.04, sx + 0.04, 2.1, 0.04)
    p.box(dark, -0.8, 0.85, -0.035, 0.8, 2.05, 0.035)
    p.box('flat:#eeeeea', -0.74, 0.91, -0.045, 0.74, 1.99, -0.035)
    p.box(dark, -0.86, 2.05, -0.12, 0.86, 2.1, 0.12)


def wand(p):
    """Orange delineator post with reflective bands."""
    p.cyl(HOUSING, (0, 0.03, 0), 1, 0.11, 0.06, seg=8)
    p.cyl(ORANGE, (0, 0.43, 0), 1, 0.04, 0.8, seg=8)
    for y in (0.55, 0.7):
        p.cyl(WHITE, (0, y, 0), 1, 0.043, 0.06, seg=8)


# ── Level crossing (踏切): the mast and the gate's motor box. The lamps and the arm are game signs
# laid on them (they flash and drop with the trains): src/stations/roads.ts levelCrossing mirrors
# XING below. ──
XING = dict(lamp_y=2.35, lamp_dx=0.32, pivot_y=1.0)


def xing_mast(p):
    """Crossing warning mast: striped post, the X of two yellow and black boards, twin lamp
    housings, a direction-arrow box and a bell on top."""
    yel, blk = 'flat:#f2c200', 'flat:#1c1c1e'
    p.cyl(blk, (0, 0.1, 0), 1, 0.16, 0.2, seg=10)
    for k in range(10):
        p.cyl(yel if k % 2 == 0 else blk, (0, 0.2 + 0.36 * k + 0.18, 0), 1, 0.075, 0.36, seg=8)
    # The X: two boards crossed at 3.2 m, striped.
    for sgn in (-1, 1):
        ca, sa = math.cos(sgn * 0.62), math.sin(sgn * 0.62)
        for k in range(8):
            a0, a1 = -1.0 + k * 0.25, -1.0 + (k + 1) * 0.25
            col = yel if k % 2 == 0 else blk
            pts = [(a0 * ca - 0.09 * -sa, 3.2 + a0 * sa - 0.09 * ca), (a1 * ca - 0.09 * -sa, 3.2 + a1 * sa - 0.09 * ca),
                   (a1 * ca + 0.09 * -sa, 3.2 + a1 * sa + 0.09 * ca), (a0 * ca + 0.09 * -sa, 3.2 + a0 * sa + 0.09 * ca)]
            p.prism(col, pts, 'z', -0.1 - 0.012 * (sgn + 1), -0.085 - 0.012 * (sgn + 1))
    # Lamp housings with hoods, on a cross bar.
    y = XING['lamp_y']
    p.box(blk, -0.6, y - 0.04, -0.08, 0.6, y + 0.04, 0.0)
    for sx in (-XING['lamp_dx'], XING['lamp_dx']):
        p.cyl(blk, (sx, y, -0.1), 2, 0.2, 0.1, seg=16)
        p.box(blk, sx - 0.21, y + 0.16, -0.32, sx + 0.21, y + 0.2, -0.1)
    # Direction-arrow box under the lamps, and the bell.
    p.box(blk, -0.32, 1.72, -0.12, 0.32, 1.98, -0.04)
    p.cyl(blk, (0, 3.92, 0), 1, 0.13, 0.16, seg=10)
    p.cyl('flat:#8d9094', (0, 4.04, 0), 1, 0.1, 0.08, seg=10)


def xing_gate(p):
    """The gate's motor box on its post: the arm itself is a game sign that drops with the trains."""
    yel, blk = 'flat:#f2c200', 'flat:#1c1c1e'
    p.box(blk, -0.2, 0, -0.2, 0.2, 0.12, 0.2)
    p.cyl('flat:#8d9094', (0, 0.45, 0), 1, 0.08, 0.7, seg=8)
    p.box(yel, -0.24, 0.72, -0.22, 0.24, 1.3, 0.22)
    p.box(blk, -0.25, 0.72, -0.23, 0.25, 0.8, 0.23)
    p.cyl(blk, (0, XING['pivot_y'], -0.26), 2, 0.12, 0.08, seg=10)


# ── Vehicles: nose to -z ──

def wheels(p, half_w, zs, r=0.31, w=0.2):
    for z in zs:
        for s in (-1, 1):
            x = s * (half_w - w / 2 + 0.01)
            p.cyl(RUBBER, (x, r, z), 0, r, w, seg=12)
            p.cyl(RIM, (x + s * 0.005, r, z), 0, r * 0.58, w + 0.012, seg=10)


def lamps(p, half_w, zf, zr, y, wide=0.34):
    for s in (-1, 1):
        x = s * (half_w - 0.3)
        p.box('light', x - wide / 2, y - 0.06, zf - 0.012, x + wide / 2, y + 0.06, zf + 0.02)
        p.box(TAIL, x - wide / 2, y + 0.02, zr - 0.02, x + wide / 2, y + 0.16, zr + 0.012)
        p.box(AMBER, x - wide / 2, y + 0.16, zr - 0.02, x - wide / 2 + 0.1, y + 0.22, zr + 0.012)
    # Number plates: white, front and rear.
    p.box(WHITE, -0.17, y - 0.28, zf - 0.014, 0.17, y - 0.12, zf + 0.01)
    p.box(WHITE, -0.17, y - 0.2, zr - 0.01, 0.17, y - 0.04, zr + 0.014)


def car_body(p, col, L, W, H, belt, hood, boot, rake_f=0.5, rake_r=0.4, clear=0.2):
    """A car from a side profile: lower body, then a cabin with raked screens. Glass on all four sides."""
    hw, hl = W / 2, L / 2
    paint = 'flat:' + col
    # Lower body with a chamfered nose and tail.
    low = [(-hl, clear), (hl, clear), (hl, belt - 0.08), (hl - 0.06, belt), (-hl + 0.1, belt - 0.02), (-hl, belt - 0.2)]
    p.prism(paint, low, 'x', -hw, hw)
    # Sills and bumpers a shade darker.
    p.box('flat:#1c1c1e', -hw - 0.005, clear - 0.04, -hl + 0.3, hw + 0.005, clear + 0.08, hl - 0.3)
    p.box('flat:#2a2c30', -hw + 0.05, clear, -hl - 0.03, hw - 0.05, clear + 0.22, -hl + 0.05)
    p.box('flat:#2a2c30', -hw + 0.05, clear, hl - 0.05, hw - 0.05, clear + 0.22, hl + 0.03)
    # Cabin.
    z0, z1 = -hl + hood, hl - boot
    cab = [(z0, belt - 0.01), (z1, belt - 0.01), (z1 - rake_r, H), (z0 + rake_f, H)]
    inset = 0.09
    p.prism(paint, cab, 'x', -hw + inset, hw - inset)
    g = 0.012
    # Windscreen and rear screen.
    for (za, zb, hint) in ((z0, z0 + rake_f, (0, 0.6, -1)), (z1, z1 - rake_r, (0, 0.6, 1))):
        d = -g if hint[2] < 0 else g
        p.face(WINDOW_DARK, [(-hw + inset + 0.08, belt + 0.05, za + d * 1.2), (hw - inset - 0.08, belt + 0.05, za + d * 1.2),
                             (hw - inset - 0.12, H - 0.06, zb + d * 1.2), (-hw + inset + 0.12, H - 0.06, zb + d * 1.2)], hint, col=WINDOW)
    # Side glass, in two panes with a pillar between.
    zm = (z0 + rake_f + z1 - rake_r) / 2
    for s in (-1, 1):
        x = s * (hw - inset + g)
        p.face(WINDOW_DARK, [(x, belt + 0.05, z0 + 0.18), (x, belt + 0.05, zm - 0.04), (x, H - 0.07, zm - 0.04), (x, H - 0.07, z0 + rake_f + 0.06)], (s, 0, 0), col=WINDOW)
        p.face(WINDOW_DARK, [(x, belt + 0.05, zm + 0.04), (x, belt + 0.05, z1 - 0.16), (x, H - 0.07, z1 - rake_r - 0.04), (x, H - 0.07, zm + 0.04)], (s, 0, 0), col=WINDOW)
        # Door mirror and handles.
        p.box(paint, s * hw - 0.02, belt + 0.02, z0 + 0.2, s * hw + (0.16 if s > 0 else -0.16) - 0.02 * s, belt + 0.14, z0 + 0.34)
        for z in (zm - 0.45, zm + 0.5):
            p.box('flat:#2a2c30', s * (hw + 0.004) - 0.004, belt - 0.14, z, s * (hw + 0.004) + 0.004, belt - 0.11, z + 0.14)


def sedan(p, col, taxi=False):
    L, W = 4.5, 1.72
    car_body(p, col, L, W, 1.44, 0.92, 1.25, 0.95)
    wheels(p, W / 2, (-1.45, 1.4))
    lamps(p, W / 2, -L / 2, L / 2, 0.68)
    p.box('flat:#2a2c30', -0.5, 0.42, -L / 2 - 0.02, 0.5, 0.56, -L / 2 + 0.02)   # grille
    if taxi:
        # Roof lamp and a band along the sides.
        p.box('light', -0.2, 1.44, -0.25, 0.2, 1.58, -0.05)
        for s in (-1, 1):
            p.box('flat:#e8c020', s * (W / 2 + 0.004) - 0.004, 0.72, -1.5, s * (W / 2 + 0.004) + 0.004, 0.8, 1.6)


def kei(p, col):
    """A tall, short kei car."""
    L, W = 3.4, 1.48
    car_body(p, col, L, W, 1.72, 0.95, 0.72, 0.12, rake_f=0.42, rake_r=0.1)
    wheels(p, W / 2, (-1.1, 1.1), r=0.27, w=0.16)
    lamps(p, W / 2, -L / 2, L / 2, 0.72, wide=0.28)
    p.box('flat:#f0e040', -0.17, 0.44, -L / 2 - 0.016, 0.17, 0.6, -L / 2 + 0.01)   # kei plates are yellow
    p.box('flat:#f0e040', -0.17, 0.52, L / 2 - 0.01, 0.17, 0.68, L / 2 + 0.016)


def van(p, col):
    """A delivery van: short nose, tall box, no rear side glass."""
    L, W = 4.7, 1.72
    car_body(p, col, L, W, 1.95, 1.0, 0.75, 0.05, rake_f=0.45, rake_r=0.05)
    wheels(p, W / 2, (-1.5, 1.35))
    lamps(p, W / 2, -L / 2, L / 2, 0.72)
    # Blank side panels over the rear glass, a company stripe.
    for s in (-1, 1):
        x = s * (W / 2 - 0.09 + 0.02)
        p.box('flat:' + col, min(x, x + s * 0.01), 1.03, 0.1, max(x, x + s * 0.01), 1.9, L / 2 - 0.1)
        p.box('flat:#1d8a4e', s * (W / 2 + 0.005) - 0.005, 0.6, -1.0, s * (W / 2 + 0.005) + 0.005, 0.72, 2.2)


def bus(p):
    """A city bus: low floor, big windows, destination box over the windscreen (blank)."""
    L, W, H = 10.5, 2.5, 3.0
    hw, hl = W / 2, L / 2
    body, band = 'flat:#f1efe6', 'flat:#1f6f9d'
    p.box(body, -hw, 0.35, -hl, hw, H, hl)
    p.box(band, -hw - 0.006, 0.35, -hl - 0.006, hw + 0.006, 1.0, hl + 0.006)
    p.box('flat:#b4472f', -hw - 0.008, 1.0, -hl - 0.008, hw + 0.008, 1.08, hl + 0.008)
    p.box('flat:#2a2c30', -hw + 0.05, 0.25, -hl - 0.04, hw - 0.05, 0.5, hl + 0.04)
    p.box('flat:#d9d7ce', -hw + 0.3, H, -hl + 0.6, hw - 0.3, H + 0.22, hl - 1.2)   # roof units
    g = 0.012
    # Windscreen, destination box, rear window.
    p.face(WINDOW_DARK, [(-hw + 0.12, 1.15, -hl - g), (hw - 0.12, 1.15, -hl - g), (hw - 0.12, 2.45, -hl - g), (-hw + 0.12, 2.45, -hl - g)], (0, 0, -1), col=WINDOW)
    p.box(HOUSING, -hw + 0.25, 2.5, -hl - 0.02, hw - 0.25, 2.9, -hl + 0.02)
    p.face(WINDOW_DARK, [(-hw + 0.3, 1.5, hl + g), (hw - 0.3, 1.5, hl + g), (hw - 0.3, 2.4, hl + g), (-hw + 0.3, 2.4, hl + g)], (0, 0, 1), col=WINDOW)
    # Side windows; doors on the left (kerb) side, which is -x for a nose at -z.
    for s in (-1, 1):
        x = s * (hw + g)
        z = -hl + 1.3
        while z + 1.25 < hl - 0.4:
            p.face(WINDOW_DARK, [(x, 1.3, z), (x, 1.3, z + 1.2), (x, 2.4, z + 1.2), (x, 2.4, z)], (s, 0, 0), col=WINDOW)
            z += 1.32
    for z0 in (-hl + 0.25, -0.6):
        x = -(hw + 0.014)
        p.box('flat:#2a2c30', x - 0.006, 0.4, z0, x + 0.006, 2.45, z0 + 0.95)
        p.face(WINDOW_DARK, [(x - 0.008, 0.9, z0 + 0.08), (x - 0.008, 0.9, z0 + 0.87), (x - 0.008, 2.3, z0 + 0.87), (x - 0.008, 2.3, z0 + 0.08)], (-1, 0, 0), col=WINDOW)
    wheels(p, hw, (-hl + 2.2, hl - 2.6), r=0.48, w=0.3)
    lamps(p, hw, -hl, hl, 0.72, wide=0.4)
    for s in (-1, 1):
        p.box(HOUSING, s * hw - 0.02, 2.2, -hl - 0.3, s * hw + s * 0.22, 2.55, -hl - 0.2)   # mirrors on arms


PROPS = {
    'signal9': (lambda p: signal(p, ARMS['signal9']), 10), 'signal7': (lambda p: signal(p, ARMS['signal7']), 8), 'signal3': (lambda p: signal(p, ARMS['signal3']), 4),
    'ped': (ped, 1.5), 'signpole': (signpole, 1), 'gantry': (gantry, 9), 'busstop': (busstop, 1.5), 'shelter': (shelter, 5),
    'mirror': (mirror, 1.5), 'bollard': (bollard, 1), 'rail': (rail, 3), 'upole': (upole, 3), 'upole_l': (lambda p: upole(p, False), 3),
    'lamp_hw': (lamp_hw, 3), 'lamp_shop': (lamp_shop, 3), 'lamp_park': (lamp_park, 2), 'fingerpost': (fingerpost, 3), 'mapstand': (mapstand, 3), 'wand': (wand, 1),
    'xing_mast': (xing_mast, 3), 'xing_gate': (xing_gate, 2),
    'sedan_w': (lambda p: sedan(p, '#e6e6e2'), 3), 'sedan_k': (lambda p: sedan(p, '#2a2d32'), 3), 'sedan_r': (lambda p: sedan(p, '#8f2020'), 3),
    'sedan_b': (lambda p: sedan(p, '#27508a'), 3), 'sedan_s': (lambda p: sedan(p, '#9aa0a6'), 3),
    'taxi': (lambda p: sedan(p, '#1d4d2b', taxi=True), 3),
    'kei_y': (lambda p: kei(p, '#e8c93a'), 3), 'kei_w': (lambda p: kei(p, '#f0efe8'), 3), 'kei_p': (lambda p: kei(p, '#d9a3b0'), 3), 'kei_g': (lambda p: kei(p, '#7fa58a'), 3),
    'van': (lambda p: van(p, '#f1efe8'), 3), 'bus': (bus, 4),
}


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('road', [dict(id=k, w=w, gap=1.5) for k, (_, w) in PROPS.items()], build_hi, lambda v: None)
