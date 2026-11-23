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

def taper(p, mat, y0, y1, r0, r1, n=4, seg=10):
    """A tapering round pole standing on y0."""
    for k in range(n):
        ya, yb = y0 + (y1 - y0) * k / n, y0 + (y1 - y0) * (k + 1) / n
        p.cyl(mat, (0, (ya + yb) / 2, 0), 1, r0 + (r1 - r0) * (k + 0.5) / n, yb - ya, seg=seg, caps=False)


def base(p, r):
    """Base plate with four anchor bolts and a collar."""
    p.box(POLE_DK, -r, 0, -r, r, 0.03, r)
    for sx in (-1, 1):
        for sz in (-1, 1):
            p.cyl(POLE, (sx * (r - 0.06), 0.05, sz * (r - 0.06)), 1, 0.022, 0.05, seg=6)
    p.cyl(POLE_DK, (0, 0.13, 0), 1, r * 0.62, 0.2, seg=10)


def signal(p, arm):
    """Signal pole: tapered steel, a curved arm over the road with a stay rod; the heads are separate
    models hung at x = -(arm - HEAD_IN), y = HEAD_Y (src/stations/roads.ts)."""
    base(p, 0.3)
    taper(p, POLE, 0.03, 6.75, 0.15, 0.095)
    p.cyl(POLE_DK, (0, 6.77, 0), 1, 0.105, 0.05, seg=10)
    # Terminal box with a conduit to the ground, and the pole's number plate.
    p.box(POLE, -0.18, 1.05, 0.13, 0.18, 1.6, 0.33)
    p.box(POLE_DK, -0.19, 1.6, 0.12, 0.19, 1.63, 0.34)
    tube(p, POLE_DK, (0.1, 0.03, 0.2), (0.1, 1.05, 0.2), 0.025, seg=5)
    p.box('flat:#f1f0ea', -0.07, 1.9, -0.156, 0.07, 2.12, -0.15)
    # The arm leaves the pole rising in a curve, then runs nearly level to its tip.
    pts = [(0, 5.35), (-0.25, 5.6), (-0.6, 5.85), (-1.1, 6.0), (-arm, 6.06)]
    for a, b in zip(pts, pts[1:]):
        tube(p, POLE, (a[0], a[1], 0), (b[0], b[1], 0), 0.065 if b[0] > -1.2 else 0.055)
    p.cyl(POLE_DK, (0, 5.35, 0), 1, 0.135, 0.22, seg=10)
    p.cyl(POLE_DK, (-arm, 6.06, 0), 0, 0.06, 0.03, seg=8)
    tube(p, POLE, (0, 6.65, 0), (-arm * 0.5, 6.05, 0), 0.02, seg=5)
    # Hangers for the head, and for the junction's name plate on the longer arms.
    hx = -(arm - HEAD_IN)
    for sx in (-0.4, 0.4):
        tube(p, POLE, (hx + sx, 6.05, 0), (hx + sx, HEAD_Y + 0.2, 0), 0.02, seg=5)
    if arm - HEAD_IN < 3.2:
        # The junction's plate over the arm on the road side, on two posts.
        w, h, px, py = 1.7, 0.5, -1.2, 6.5
        for sx in (-0.6, 0.6):
            p.box(POLE, px + sx - 0.02, 5.95, -0.02, px + sx + 0.02, py - h / 2 + 0.05, 0.02)
        p.box(POLE_DK, px - w / 2, py - h / 2, -0.03, px + w / 2, py + h / 2, 0.03)
    if arm - HEAD_IN >= 3.2:
        for sx in (1.0, 2.5):
            tube(p, POLE, (hx + sx, 6.04, -0.02), (hx + sx, HEAD_Y + 0.31, -0.02), 0.015, seg=5)
        p.box(POLE_DK, hx + 0.78, HEAD_Y - 0.33, -0.1, hx + 2.72, HEAD_Y + 0.33, -0.085)


def head(p, flat, vertical=False, n=3):
    """Vehicle signal head, its middle at the origin, lenses facing -z. The lamps are a game sign.
    Visored: 300 mm lenses, a hood over each, a white back board. Flat: the thin 250 mm type."""
    def box(mat, a0, b0, z0, a1, b1, z1):
        if vertical:
            p.box(mat, -b1, a0, z0, -b0, a1, z1)
        else:
            p.box(mat, a0, b0, z0, a1, b1, z1)
    if flat:
        L = 0.35 * n
        box('flat:#3a3e42', -L / 2, -0.175, -0.045, L / 2, 0.175, 0.045)
        box(HOUSING, -L / 2 + 0.01, -0.165, -0.05, L / 2 - 0.01, 0.165, -0.045)
        box(POLE, -0.06, -0.06, 0.045, 0.06, 0.06, 0.11)
        return
    L = 0.4533 * n
    box(HOUSING, -L / 2, -0.24, -0.14, L / 2, 0.24, 0.14)
    for k in range(n):
        c = -L / 2 + 0.2267 + k * 0.4533
        if n == 3:
            c = (k - 1) * 0.42
        box(HOUSING, c - 0.2, 0.17, -0.34, c + 0.2, 0.2, -0.14)
        for s_ in (-1, 1):
            box(HOUSING, c + s_ * 0.2 - 0.012, -0.02, -0.3, c + s_ * 0.2 + 0.012, 0.2, -0.14)
    if n == 3:
        box(WHITE, -L / 2 - 0.1, -0.34, 0.14, L / 2 + 0.1, 0.34, 0.16)
        box('flat:#2f8f5a', -L / 2 - 0.1, -0.34, 0.139, L / 2 + 0.1, -0.31, 0.141)


def pedpole(p):
    """Pedestrian signal post: the head (a separate model) hangs at y 3.1 (PED_Y), z -0.24."""
    base(p, 0.18)
    taper(p, POLE, 0.03, 3.7, 0.075, 0.06, n=2, seg=8)
    p.cyl(POLE_DK, (0, 3.71, 0), 1, 0.068, 0.03, seg=8)
    p.box(POLE, -0.025, 2.9, -0.14, 0.025, 2.95, 0)
    p.box(POLE, -0.025, 3.25, -0.14, 0.025, 3.3, 0)


def pedhead(p, flat):
    """Pedestrian head, its middle at the origin, facing -z: red figure over green, countdown bars beside them (the game's sign)."""
    if flat:
        p.box('flat:#3a3e42', -0.23, -0.39, -0.04, 0.23, 0.39, 0.04)
        p.box(HOUSING, -0.22, -0.38, -0.045, 0.22, 0.38, -0.04)
        return
    p.box(HOUSING, -0.23, -0.39, -0.1, 0.23, 0.39, 0.1)
    for y in (0.37, -0.02):
        p.box(HOUSING, -0.24, y, -0.22, 0.24, y + 0.03, -0.1)
        for sx in (-0.24, 0.215):
            p.box(HOUSING, sx, y - 0.2, -0.18, sx + 0.025, y + 0.03, -0.1)


def pushbtn(p):
    """Push-button box on a pole (the pole behind it at +z): yellow box, button, the wait lamp."""
    p.box('flat:#e8c020', -0.1, -0.16, -0.09, 0.1, 0.16, 0)
    p.box(HOUSING, -0.07, 0.03, -0.094, 0.07, 0.11, -0.09)
    p.cyl('flat:#c62828', (0, -0.06, -0.1), 2, 0.035, 0.02, seg=10)
    p.box('flat:#2a7de1', -0.07, -0.145, -0.094, 0.07, -0.115, -0.09)


def speaker(p):
    """Audible-signal speaker on a short bracket (the pole at +z)."""
    p.box(POLE, -0.02, -0.02, -0.16, 0.02, 0.02, 0)
    p.cyl('flat:#d9dcdf', (0, 0, -0.2), 2, 0.09, 0.1, seg=10)
    p.cyl(HOUSING, (0, 0, -0.252), 2, 0.07, 0.006, seg=10)


def sigside(p):
    """Straight pole for a side-mounted head: the head hangs at x -0.42, y 3.6."""
    base(p, 0.24)
    taper(p, POLE, 0.03, 4.5, 0.1, 0.075, n=3)
    p.cyl(POLE_DK, (0, 4.52, 0), 1, 0.085, 0.04, seg=10)
    for y in (3.25, 3.95):
        tube(p, POLE, (0, y, 0), (-0.42, y, 0), 0.022, seg=5)
        p.cyl(POLE_DK, (0, y, 0), 1, 0.1, 0.06, seg=10)
    p.box(POLE, -0.14, 1.1, 0.09, 0.14, 1.5, 0.24)


def sigbracket(p):
    """Bracket that carries a signal head from a concrete utility pole (the pole at the origin, 0.16 m
    radius at this height): two steel bands and an arm; the head hangs at x -1.5, y 0."""
    for y in (0.55, 0.95):
        p.cyl(POLE_DK, (0, y, 0), 1, 0.185, 0.07, seg=10, caps=False)
    tube(p, POLE, (0, 0.95, 0), (-1.5, 0.62, 0), 0.04)
    tube(p, POLE, (0, 0.55, 0), (-0.9, 0.74, 0), 0.025, seg=5)
    for sx in (-0.4, 0.4):
        tube(p, POLE, (-1.5 + sx, 0.66, 0), (-1.5 + sx, 0.2, 0), 0.02, seg=5)
    p.box(POLE, -1.95, 0.6, -0.03, -1.05, 0.66, 0.03)
    tube(p, HOUSING, (-0.2, 0.9, 0.05), (-0.2, -4.2, 0.17), 0.02, seg=5)


def sigbox(p):
    """Signal control cabinet at a corner: grey steel on a concrete plinth, a door with a handle and vents."""
    p.box('flat:#b9b6ac', -0.36, 0, -0.26, 0.36, 0.12, 0.26)
    p.box('flat:#c4c8cc', -0.32, 0.12, -0.22, 0.32, 1.5, 0.22)
    p.prism('flat:#aeb3b8', [(-0.26, 1.5), (0.26, 1.5), (0.26, 1.56), (-0.26, 1.53)], 'x', -0.35, 0.35)
    p.box('flat:#b4b9be', -0.29, 0.18, -0.226, 0.29, 1.44, -0.22)
    p.box(HOUSING, 0.18, 0.75, -0.24, 0.22, 0.9, -0.226)
    for k in range(4):
        p.box(HOUSING, -0.2, 0.26 + k * 0.05, -0.23, 0.1, 0.28 + k * 0.05, -0.226)
    p.box('flat:#f1f0ea', -0.2, 1.15, -0.23, 0.05, 1.32, -0.226)


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

# The moving traffic draws its own wheels, which turn (src/render/traffic-view.ts): the
# '<id>_body' copies of the vehicles are built without them. src/traffic/vehicles.ts (RIG)
# mirrors the wheel and lamp positions given to wheels() and lamps() below.
BARE = [False]


def wheels(p, half_w, zs, r=0.31, w=0.2):
    if BARE[0]:
        return
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


def van(p, col, stripe='#1d8a4e'):
    """A delivery van: short nose, tall box, no rear side glass."""
    L, W = 4.7, 1.72
    car_body(p, col, L, W, 1.95, 1.0, 0.75, 0.05, rake_f=0.45, rake_r=0.05)
    wheels(p, W / 2, (-1.5, 1.35))
    lamps(p, W / 2, -L / 2, L / 2, 0.72)
    # Blank side panels over the rear glass, a company stripe.
    for s in (-1, 1):
        x = s * (W / 2 - 0.09 + 0.02)
        p.box('flat:' + col, min(x, x + s * 0.01), 1.03, 0.1, max(x, x + s * 0.01), 1.9, L / 2 - 0.1)
        if stripe:
            p.box('flat:' + stripe, s * (W / 2 + 0.005) - 0.005, 0.6, -1.0, s * (W / 2 + 0.005) + 0.005, 0.72, 2.2)


def compact(p, col):
    """A small hatchback."""
    L, W = 3.9, 1.69
    car_body(p, col, L, W, 1.5, 0.94, 0.95, 0.1, rake_f=0.5, rake_r=0.32)
    wheels(p, W / 2, (-1.25, 1.2), r=0.29, w=0.18)
    lamps(p, W / 2, -L / 2, L / 2, 0.7, wide=0.3)


def minivan(p, col):
    """A family minivan: tall, glass all round, a short nose."""
    L, W = 4.7, 1.72
    car_body(p, col, L, W, 1.85, 1.0, 0.85, 0.06, rake_f=0.55, rake_r=0.08)
    wheels(p, W / 2, (-1.5, 1.35))
    lamps(p, W / 2, -L / 2, L / 2, 0.74)
    for s in (-1, 1):   # roof rails
        p.box('flat:#2a2c30', s * 0.62 - 0.02, 1.85, -1.0, s * 0.62 + 0.02, 1.9, 1.9)


def gomi(p):
    """A rubbish truck: cab over the engine, a rounded compactor body with a hopper at the back."""
    L, W, H = 5.6, 2.0, 2.5
    hw, hl = W / 2, L / 2
    cab_over(p, '#f1efe8', W - 0.1, -hl, -hl + 1.45, 0.58, 2.15)
    p.box('flat:#26282c', -hw + 0.25, 0.42, -hl + 0.3, hw - 0.25, 0.7, hl - 0.05)
    body = 'flat:#2f6f8f'
    p.prism(body, [(-hl + 1.6, 0.8), (hl - 1.0, 0.8), (hl - 1.0, H), (-hl + 2.0, H), (-hl + 1.6, H - 0.4)], 'x', -hw, hw)
    p.prism('flat:#d9d7ce', [(hl - 1.0, 0.75), (hl, 1.0), (hl, 1.9), (hl - 0.5, H - 0.1), (hl - 1.0, H)], 'x', -hw + 0.02, hw - 0.02)
    for s in (-1, 1):
        x = s * (hw + 0.006)
        p.box('flat:#eeeeea', x - 0.006, 1.5, -hl + 1.9, x + 0.006, 1.72, hl - 1.2)
    p.box(AMBER, -0.12, H, -hl + 2.1, 0.12, H + 0.12, -hl + 2.3)   # beacon housing
    wheels(p, hw, (-hl + 0.95, hl - 1.5), r=0.38, w=0.25)
    lamps(p, hw, -hl, hl, 0.8, wide=0.3)


def bus(p, band='flat:#1f6f9d', trim='flat:#b4472f'):
    """A city bus: low floor, big windows, destination box over the windscreen (blank)."""
    L, W, H = 10.5, 2.5, 3.0
    hw, hl = W / 2, L / 2
    body = 'flat:#f1efe6'
    p.box(body, -hw, 0.35, -hl, hw, H, hl)
    p.box(band, -hw - 0.006, 0.35, -hl - 0.006, hw + 0.006, 1.0, hl + 0.006)
    p.box(trim, -hw - 0.008, 1.0, -hl - 0.008, hw + 0.008, 1.08, hl + 0.008)
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


def cab_over(p, col, W, z0, z1, y0, y1):
    """A cab-over truck's cab from z0 (nose) back to z1: screen, side glass, mirrors."""
    hw, paint, g = W / 2, 'flat:' + col, 0.012
    cab = [(z0, y0), (z1, y0), (z1, y1), (z0 + 0.22, y1), (z0, y1 - 0.75)]
    p.prism(paint, cab, 'x', -hw, hw)
    belt = y0 + (y1 - y0) * 0.45
    p.face(WINDOW_DARK, [(-hw + 0.1, belt, z0 - g), (hw - 0.1, belt, z0 - g), (hw - 0.14, y1 - 0.1, z0 + 0.19), (-hw + 0.14, y1 - 0.1, z0 + 0.19)], (0, 0.3, -1), col=WINDOW)
    for s in (-1, 1):
        x = s * (hw + g)
        p.face(WINDOW_DARK, [(x, belt, z0 + 0.3), (x, belt, z1 - 0.2), (x, y1 - 0.12, z1 - 0.2), (x, y1 - 0.12, z0 + 0.42)], (s, 0, 0), col=WINDOW)
        p.box(HOUSING, min(s * hw, s * (hw + 0.2)), belt + 0.1, z0 + 0.1, max(s * hw, s * (hw + 0.2)), belt + 0.42, z0 + 0.2)   # mirrors
        p.box('flat:#2a2c30', s * (hw + 0.004) - 0.004, belt - 0.2, z1 - 0.5, s * (hw + 0.004) + 0.004, belt - 0.16, z1 - 0.34)   # door handles
    p.box('flat:#2a2c30', -hw + 0.04, y0 - 0.12, z0 - 0.04, hw - 0.04, y0 + 0.16, z0 + 0.06)   # bumper
    p.box('flat:#2a2c30', -hw * 0.55, y0 + 0.24, z0 - 0.015, hw * 0.55, y0 + 0.4, z0 + 0.02)   # grille


def truck(p):
    """A 2 t delivery truck: cab over the engine, a box body with an invented carrier's band."""
    L, W, H = 6.2, 2.1, 2.9
    hw, hl = W / 2, L / 2
    cab_over(p, '#f1efe8', W - 0.1, -hl, -hl + 1.55, 0.6, 2.25)
    p.box('flat:#26282c', -hw + 0.25, 0.42, -hl + 0.3, hw - 0.25, 0.72, hl - 0.05)   # chassis
    p.box('flat:#eceae2', -hw, 0.85, -hl + 1.7, hw, H, hl)                            # box body
    p.box(STEEL, -hw - 0.01, 0.8, -hl + 1.68, hw + 0.01, 0.88, hl + 0.01)             # its floor frame
    for s in (-1, 1):
        x = s * (hw + 0.006)
        p.box('flat:#1f7a5c', x - 0.006, 1.5, -hl + 1.9, x + 0.006, 1.85, hl - 0.2)   # the carrier's band
        p.box('flat:#e8a020', x - 0.007, 1.85, -hl + 1.9, x + 0.007, 1.92, hl - 0.2)
        p.box('flat:#26282c', x - 0.006, 0.5, 0.2, x + 0.006, 0.82, 1.3)              # side guard
    # Rear doors: two leaves and their bars.
    p.box('flat:#d9d7ce', -hw + 0.06, 0.95, hl, hw - 0.06, H - 0.08, hl + 0.015)
    p.box('flat:#8d9094', -0.012, 0.95, hl + 0.015, 0.012, H - 0.08, hl + 0.03)
    for x in (-0.45, 0.45):
        p.box(STEEL, x - 0.015, 1.0, hl + 0.015, x + 0.015, H - 0.15, hl + 0.04)
    wheels(p, hw, (-hl + 1.0, hl - 1.5), r=0.4, w=0.26)
    lamps(p, hw, -hl, hl, 0.82, wide=0.3)


def keitruck(p):
    """A kei truck: tiny cab, an open bed with drop sides, yellow plates."""
    L, W = 3.4, 1.48
    hw, hl = W / 2, L / 2
    cab_over(p, '#f0efe8', W, -hl, -hl + 1.15, 0.42, 1.78)
    p.box('flat:#26282c', -hw + 0.2, 0.3, -hl + 0.2, hw - 0.2, 0.55, hl - 0.05)
    # Bed: floor, three drop sides, the guard frame behind the cab.
    z0 = -hl + 1.2
    p.box('flat:#e4e2da', -hw, 0.62, z0, hw, 0.7, hl)
    for s in (-1, 1):
        p.box('flat:#f0efe8', min(s * hw, s * (hw - 0.03)), 0.7, z0, max(s * hw, s * (hw - 0.03)), 0.98, hl)
    p.box('flat:#f0efe8', -hw, 0.7, hl - 0.03, hw, 0.98, hl)
    for x in (-hw + 0.05, hw - 0.05):
        tube(p, STEEL, (x, 0.7, z0 + 0.03), (x, 1.72, z0 + 0.03), 0.02, seg=6)
    tube(p, STEEL, (-hw + 0.05, 1.72, z0 + 0.03), (hw - 0.05, 1.72, z0 + 0.03), 0.02, seg=6)
    # A load: two crates under a sheet.
    p.box('flat:#3f6b8a', -0.5, 0.7, z0 + 0.25, 0.45, 1.12, z0 + 1.25)
    p.box('flat:#b9a27a', -0.4, 0.7, z0 + 1.35, 0.3, 0.98, hl - 0.2)
    wheels(p, hw, (-hl + 0.55, hl - 0.6), r=0.27, w=0.16)
    lamps(p, hw, -hl, hl, 0.6, wide=0.24)
    p.box('flat:#f0e040', -0.17, 0.32, -hl - 0.05, 0.17, 0.48, -hl - 0.03)
    p.box('flat:#f0e040', -0.17, 0.4, hl - 0.01, 0.17, 0.56, hl + 0.016)


def rider(p, jacket, zs, y0, hands):
    """Somebody sitting astride at z = zs with the seat at y0, reaching for the bars at `hands` (y, z)."""
    dark, skin, trousers = 'flat:#26282c', 'flat:#d9b08c', 'flat:#2f3a52'
    hy, hz = hands
    for s in (-1, 1):
        x = s * 0.12
        p.prism(trousers, [(zs + 0.24, y0 + 0.08), (zs - 0.07, y0 + 0.16), (zs - 0.2, y0 + 0.04), (zs + 0.18, y0 - 0.02)], 'x', x - 0.065, x + 0.065)    # thigh
        p.prism(trousers, [(zs - 0.1, y0 + 0.14), (zs - 0.22, y0 + 0.1), (zs - 0.28, y0 - 0.34), (zs - 0.16, y0 - 0.34)], 'x', x - 0.055, x + 0.055)  # shin
        p.box(dark, x - 0.055, y0 - 0.37, zs - 0.4, x + 0.055, y0 - 0.3, zs - 0.14)                                                             # shoe
        tube(p, jacket, (s * 0.2, y0 + 0.66, zs - 0.02), (s * 0.27, hy + 0.04, hz + 0.04), 0.045, seg=6)                                        # arm
        p.box(skin, s * 0.27 - 0.04, hy - 0.02, hz - 0.04, s * 0.27 + 0.04, hy + 0.05, hz + 0.06)                                               # hand
    p.prism(jacket, [(zs + 0.3, y0 + 0.08), (zs + 0.02, y0 + 0.08), (zs - 0.12, y0 + 0.7), (zs + 0.12, y0 + 0.74)], 'x', -0.2, 0.2)               # torso
    p.box(skin, -0.06, y0 + 0.68, zs - 0.08, 0.06, y0 + 0.77, zs + 0.04)                                                                        # neck
    p.cyl('flat:#eeeeea', (0, y0 + 0.8, zs - 0.04), 1, 0.14, 0.26, seg=10)                                                                      # helmet
    p.box(HOUSING, -0.1, y0 + 0.76, zs - 0.195, 0.1, y0 + 0.86, zs - 0.17)                                                                      # visor


def cycle(p, frame, jacket):
    """A city bicycle and its rider: step-through frame, front basket, mudguards."""
    dark = 'flat:#26282c'
    zf, zr, r = -0.52, 0.5, 0.33
    if not BARE[0]:
        for z in (zf, zr):
            p.cyl(RUBBER, (0, r, z), 0, r, 0.045, seg=14)
            p.cyl(RIM, (0, r, z), 0, r * 0.86, 0.05, seg=12)
    fr = 'flat:' + frame
    tube(p, fr, (0, r, zr), (0, 0.62, 0.12), 0.02, seg=6)             # seat stay
    tube(p, fr, (0, r, zr), (0, 0.3, 0.0), 0.02, seg=6)               # chain stay
    tube(p, fr, (0, 0.3, 0.0), (0, 0.95, 0.16), 0.022, seg=6)         # seat tube
    tube(p, fr, (0, 0.3, 0.0), (0, 0.78, zf + 0.2), 0.024, seg=6)     # down tube
    tube(p, fr, (0, r, zf), (0, 1.02, zf + 0.24), 0.02, seg=6)        # fork and head
    tube(p, dark, (-0.26, 1.04, zf + 0.26), (0.26, 1.04, zf + 0.26), 0.014, seg=6)   # bars
    p.box(dark, -0.07, 0.94, 0.08, 0.07, 0.99, 0.32)                  # saddle
    p.box('flat:#8d9094', -0.16, 0.74, zf - 0.22, 0.16, 0.96, zf + 0.06)   # basket
    p.box('light', -0.03, 0.66, zf - 0.03, 0.03, 0.72, zf - 0.01)
    p.box(TAIL, -0.03, 0.5, zr + 0.3, 0.03, 0.56, zr + 0.32)
    rider(p, 'flat:' + jacket, 0.2, 0.98, (1.04, zf + 0.26))


def scooter(p, col='#c8372d', jacket='#3d6b4f'):
    """A delivery scooter and its rider: step-through body, a carrier box behind the seat."""
    body, dark, skin = 'flat:' + col, 'flat:#26282c', 'flat:#d9b08c'
    zf, zr, r = -0.62, 0.58, 0.22
    for z in (() if BARE[0] else (zf, zr)):
        p.cyl(RUBBER, (0, r, z), 0, r, 0.11, seg=12)
        p.cyl(RIM, (0, r, z), 0, r * 0.5, 0.122, seg=8)
    # Front mudguard, leg shield, floor board, seat hump, tail.
    p.box(body, -0.08, r + 0.2, zf - 0.2, 0.08, r + 0.27, zf + 0.2)
    p.prism(body, [(zf + 0.06, 0.3), (zf + 0.2, 0.3), (zf + 0.32, 0.95), (zf + 0.2, 0.98)], 'x', -0.2, 0.2)
    p.box(dark, -0.17, 0.26, zf + 0.2, 0.17, 0.33, 0.15)
    p.prism(body, [(0.1, 0.26), (zr + 0.28, 0.4), (zr + 0.3, 0.68), (0.12, 0.7)], 'x', -0.17, 0.17)
    p.box(dark, -0.15, 0.7, 0.1, 0.15, 0.78, zr + 0.12)                                # seat
    # Steering column, handlebar, headlamp, mirrors, tail lamp, plate.
    tube(p, dark, (0, 0.5, zf + 0.12), (0, 1.02, zf + 0.3), 0.03, seg=6)
    tube(p, dark, (-0.3, 1.02, zf + 0.3), (0.3, 1.02, zf + 0.3), 0.02, seg=6)
    p.box(body, -0.11, 0.86, zf + 0.14, 0.11, 1.04, zf + 0.3)
    p.box('light', -0.07, 0.9, zf + 0.125, 0.07, 1.0, zf + 0.145)
    for s in (-1, 1):
        tube(p, dark, (s * 0.24, 1.02, zf + 0.3), (s * 0.3, 1.22, zf + 0.28), 0.008, seg=5)
        p.box(dark, s * 0.3 - 0.05, 1.2, zf + 0.27, s * 0.3 + 0.05, 1.28, zf + 0.285)
    p.box(TAIL, -0.07, 0.56, zr + 0.3, 0.07, 0.63, zr + 0.315)
    p.box(WHITE, -0.08, 0.4, zr + 0.3, 0.08, 0.52, zr + 0.31)
    # The carrier box.
    p.box('flat:#eeeeea', -0.2, 0.8, zr - 0.02, 0.2, 1.18, zr + 0.36)
    p.box(body, -0.202, 0.92, zr - 0.022, 0.202, 1.0, zr + 0.362)
    # The rider: legs on the board, body leaning to the bars, arms, helmet with a dark visor.
    for s in (-1, 1):
        x = s * 0.12
        p.prism('flat:#2f3a52', [(0.36, 0.78), (0.05, 0.86), (-0.08, 0.74), (0.3, 0.68)], 'x', x - 0.065, x + 0.065)   # thigh
        p.prism('flat:#2f3a52', [(0.02, 0.84), (-0.1, 0.8), (-0.16, 0.36), (-0.04, 0.36)], 'x', x - 0.055, x + 0.055)  # shin
        p.box(dark, x - 0.055, 0.33, -0.28, x + 0.055, 0.4, -0.02)                                                     # shoe
        tube(p, 'flat:' + jacket, (s * 0.2, 1.36, 0.1), (s * 0.27, 1.06, zf + 0.34), 0.045, seg=6)                       # arm
        p.box(skin, s * 0.27 - 0.04, 1.0, zf + 0.26, s * 0.27 + 0.04, 1.07, zf + 0.36)                                 # hand
    p.prism('flat:' + jacket, [(0.42, 0.78), (0.14, 0.78), (0.0, 1.4), (0.24, 1.44)], 'x', -0.2, 0.2)                    # torso
    p.box(skin, -0.06, 1.38, 0.04, 0.06, 1.47, 0.16)                                                                   # neck
    p.cyl('flat:#eeeeea', (0, 1.5, 0.08), 1, 0.14, 0.26, seg=10)                                                      # helmet
    p.box(HOUSING, -0.1, 1.46, -0.075, 0.1, 1.56, -0.05)                                                                # visor


# ── More street lights, a short signal, street props (2026-11-20) ──

# The short-arm signal (sigshort): where its head hangs, and the junction plate on top of the pole.
SHORT = dict(hx=-1.9, hy=5.45, plate_x=-1.2, plate_y=6.0, plate_w=1.7, plate_h=0.5)


def sigshort(p):
    """Narrow-junction signal, as on Osaka's side streets: a straight pole, a straight arm out over
    the road with a thin LED head at its tip, the junction's name plate standing on the arm over the head, bands for a pedestrian head and a clamp for a no-parking sign lower down.
    The head and the plate's lettering are separate."""
    base(p, 0.22)
    taper(p, POLE, 0.03, 6.6, 0.115, 0.08, n=4)
    p.cyl(POLE_DK, (0, 6.62, 0), 1, 0.09, 0.04, seg=10)
    # The arm: one straight pipe, a clamp at the pole and an end cap behind the head.
    tube(p, POLE, (0, SHORT['hy'], 0.1), (SHORT['hx'] - 0.55, SHORT['hy'], 0.1), 0.045)
    p.cyl(POLE_DK, (0, SHORT['hy'], 0), 1, 0.13, 0.2, seg=10)
    p.box(POLE, SHORT['hx'] - 0.08, SHORT['hy'] - 0.1, 0.05, SHORT['hx'] + 0.08, SHORT['hy'] + 0.1, 0.14)
    # The plate beside the top of the pole: two brackets out from it, a blank board.
    w, h, px, py = SHORT['plate_w'], SHORT['plate_h'], SHORT['plate_x'], SHORT['plate_y']
    for sx in (-0.6, 0.6):
        p.box(POLE, px + sx - 0.02, SHORT['hy'] + 0.04, 0.08, px + sx + 0.02, py - h / 2 + 0.05, 0.12)
    p.box(POLE_DK, px - w / 2, py - h / 2, 0.07, px + w / 2, py + h / 2, 0.13)
    # Bands for the pedestrian head (at 2.65, hung on the road side) and the sign clamp.
    for y in (2.9, 3.3, 2.05):
        p.cyl(POLE_DK, (0, y, 0), 1, 0.125, 0.05, seg=10, caps=False)
    p.box(POLE, -0.025, 2.9, -0.2, 0.025, 2.95, 0)
    p.box(POLE, -0.025, 3.25, -0.2, 0.025, 3.3, 0)
    p.box(POLE, -0.14, 1.1, 0.09, 0.14, 1.5, 0.24)


# ── Signal poles as mounted today (2026-11 research: docs/street-design.md, Traffic signals) ──
# The standard is a straight steel pole with a short arm of two parallel beams, 2.0 m long or at most
# 3.5 m, the head fixed between the beams at its tip; a second head for the traffic coming the other
# way hangs back to back with it. The junction's name plate is fixed to the arm on the road side,
# between the pole and the head, its foot on the upper beam (so a pole with a plate has the 3.5 m
# arm). Shared with src/stations/roads.ts.
PARM = {'sigp2': 2.0, 'sigp3': 3.5, 'sigp6': 6.5, 'siglight2': 2.0, 'siglight3': 3.5}
PARM_IN = 0.55                      # the head's middle, in from the arm's tip
PLATE = dict(x=-1.2, y=HEAD_Y + 0.33 + 0.33, w=1.7, h=0.5, z=0.12)   # y: on the upper beam; the old curved arm carries it at PLATE_OLD_Y
PLATE_OLD_Y = 6.5
PED_Y = 3.1                         # middle of a pedestrian head: its underside 2.7 m over the pavement
GREY = 'flat:#5a5d60'               # matt dark grey (N4), the colour of the big streets' shared poles
GREY_DK = 'flat:#45484b'


def plate_brackets(p, col, dk, py=None, foot=None):
    """The blank board for the junction's name on the arm, on two short posts from the beam under it."""
    w, h, px, pz = PLATE['w'], PLATE['h'], PLATE['x'], PLATE['z']
    py = PLATE['y'] if py is None else py
    foot = py - h / 2 - 0.08 if foot is None else foot
    for sx in (-0.6, 0.6):
        p.box(col, px + sx - 0.02, foot, pz - 0.02, px + sx + 0.02, py - h / 2 + 0.05, pz + 0.02)
    p.box(dk, px - w / 2, py - h / 2, pz - 0.03, px + w / 2, py + h / 2, pz + 0.03)


def ped_bands(p, col, dk, r=0.14):
    for y in (PED_Y - 0.2, PED_Y + 0.2):
        p.cyl(dk, (0, y, 0), 1, r, 0.05, seg=10, caps=False)
        p.box(col, -0.025, y - 0.02, -0.2, 0.025, y + 0.02, 0)


def sigp(p, arm, light=False):
    """A signal pole with a parallel-beam arm. `light`: the big streets' shared pole, dark grey and
    taller, with the street light on an arm of its own above the signal."""
    col, dk = (GREY, GREY_DK) if light else (POLE, POLE_DK)
    top = 9.4 if light else 6.9
    p.box(dk, -0.28, 0, -0.28, 0.28, 0.03, 0.28)
    for sx in (-1, 1):
        for sz in (-1, 1):
            p.cyl(col, (sx * 0.22, 0.05, sz * 0.22), 1, 0.022, 0.05, seg=6)
    p.cyl(dk, (0, 0.13, 0), 1, 0.17, 0.2, seg=10)
    taper(p, col, 0.03, top, 0.13, 0.085, n=5)
    p.cyl(dk, (0, top + 0.02, 0), 1, 0.095, 0.04, seg=10)
    # The two beams, clamped to the pole; the head's brackets join them at the tip.
    hx = -(arm - PARM_IN)
    for y in (HEAD_Y + 0.33, HEAD_Y - 0.33):
        tube(p, col, (0, y, 0.12), (-arm, y, 0.12), 0.036)
        p.cyl(dk, (0, y, 0), 1, 0.15, 0.09, seg=10, caps=False)
        p.box(col, -0.06, y - 0.045, 0.0, 0.06, y + 0.045, 0.16)
        p.cyl(dk, (-arm, y, 0.12), 0, 0.04, 0.02, seg=8)
    for sx in (-0.4, 0.4):
        p.box(col, hx + sx - 0.02, HEAD_Y - 0.33, 0.085, hx + sx + 0.02, HEAD_Y + 0.33, 0.155)
    # Terminal box and conduit, the pole's number plate, the name plate's brackets, bands for a pedestrian head.
    p.box(col, -0.18, 1.05, 0.13, 0.18, 1.6, 0.33)
    p.box(dk, -0.19, 1.6, 0.12, 0.19, 1.63, 0.34)
    tube(p, dk, (0.1, 0.03, 0.2), (0.1, 1.05, 0.2), 0.025, seg=5)
    p.box('flat:#f1f0ea', -0.07, 1.9, -0.156, 0.07, 2.12, -0.15)
    if arm >= 3.4:
        plate_brackets(p, col, dk)
    if arm > 4.5:
        # A long mast arm (the main roads' 6.5 m): a stay rod from the pole's top to the arm's middle.
        tube(p, col, (0, top - 0.25, 0.12), (-arm * 0.55, HEAD_Y + 0.33, 0.12), 0.022, seg=6)
    ped_bands(p, col, dk)
    if light:
        # The street light: an arm out over the road from the top, a thin blade head.
        tube(p, col, (0, top - 0.15, 0), (-0.5, top + 0.2, 0), 0.05, seg=8)
        tube(p, col, (-0.5, top + 0.2, 0), (-2.4, top + 0.32, 0), 0.045, seg=8)
        p.box(GREY_DK, -3.2, top + 0.27, -0.15, -2.35, top + 0.37, 0.15)
        p.box('light', -3.15, top + 0.25, -0.12, -2.41, top + 0.27, 0.12)


def head_zebra(p):
    """The hooded head with a striped back board, green and white, as old streets still have here and there."""
    head(p, False)
    L = 0.4533 * 3
    n = 10
    w = (L + 0.2) / n
    for k in range(n):
        x = -L / 2 - 0.1 + k * w
        p.box('flat:#2f8f5a' if k % 2 == 0 else WHITE, x, -0.42, 0.139, x + w, 0.42, 0.165)


def pedband(p):
    """Two bands and a bracket that hang a pedestrian head on a signal mast (radius ~0.14 at 2.65 m):
    the head (a separate model) hangs at y 2.65, z -0.3."""
    for y in (2.9, 3.3):
        p.cyl(POLE_DK, (0, y, 0), 1, 0.155, 0.05, seg=10, caps=False)
        p.box(POLE, -0.025, y - 0.02, -0.2, 0.025, y + 0.02, -0.13)


def lamp_led(p):
    """Modern LED street light: a slim tapered pole, a straight arm rising a little, a thin blade head."""
    p.cyl(POLE_DK, (0, 0.2, 0), 1, 0.14, 0.4, seg=10)
    taper(p, 'flat:#a7adb2', 0.4, 7.6, 0.085, 0.055, n=4)
    tube(p, 'flat:#a7adb2', (0, 7.5, 0), (0, 7.75, -1.6), 0.045, seg=8)
    p.box('flat:#5b6066', -0.15, 7.7, -2.35, 0.15, 7.8, -1.5)
    p.box('light', -0.12, 7.68, -2.3, 0.12, 7.7, -1.56)


def lamp_twin(p):
    """Twin-arm avenue light for a median: a tall mast, an arm out over each carriageway (along ±z)."""
    p.cyl(POLE_DK, (0, 0.3, 0), 1, 0.22, 0.6, seg=12)
    taper(p, POLE, 0.6, 10.2, 0.13, 0.09, n=5)
    for sz in (-1, 1):
        prev = (0, 9.6, 0)
        for k in range(1, 6):
            t = k / 5
            q = (0, 9.6 + 0.6 * math.sin(t * math.pi / 2), sz * 2.6 * t)
            tube(p, POLE, prev, q, 0.06, seg=8)
            prev = q
        p.box(POLE_DK, -0.2, prev[1] - 0.1, min(prev[2], prev[2] + sz * 0.9), 0.2, prev[1] + 0.05, max(prev[2], prev[2] + sz * 0.9))
        p.box('light', -0.16, prev[1] - 0.13, min(prev[2] + sz * 0.05, prev[2] + sz * 0.85), 0.16, prev[1] - 0.1, max(prev[2] + sz * 0.05, prev[2] + sz * 0.85))
    p.cyl(POLE_DK, (0, 10.22, 0), 1, 0.1, 0.05, seg=10)


def lamp_suzuran(p):
    """Lily-of-the-valley lamp (すずらん灯) for an old shopping street: a dark post, a curled crown of
    four hooks, a bell-shaped globe hanging from each, two banner arms."""
    dark, brass = 'flat:#2a2622', 'flat:#a8853a'
    p.cyl(dark, (0, 0.35, 0), 1, 0.15, 0.7, seg=10)
    tube(p, dark, (0, 0.7, 0), (0, 4.7, 0), 0.06, seg=8)
    p.cyl(brass, (0, 4.72, 0), 1, 0.09, 0.08, seg=8)
    tube(p, dark, (0, 4.7, 0), (0, 5.05, 0), 0.03, seg=6)
    p.cyl(brass, (0, 5.1, 0), 1, 0.05, 0.1, seg=8)
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        dx, dz = math.cos(a), math.sin(a)
        tube(p, dark, (0, 4.6, 0), (dx * 0.4, 4.85, dz * 0.4), 0.022, seg=5)
        tube(p, dark, (dx * 0.4, 4.85, dz * 0.4), (dx * 0.62, 4.75, dz * 0.62), 0.022, seg=5)
        tube(p, dark, (dx * 0.62, 4.75, dz * 0.62), (dx * 0.62, 4.6, dz * 0.62), 0.015, seg=5)
        c = (dx * 0.62, 0, dz * 0.62)
        p.cyl(brass, (c[0], 4.56, c[2]), 1, 0.05, 0.05, seg=8)
        p.cyl('light', (c[0], 4.42, c[2]), 1, 0.11, 0.2, seg=10)
        p.cyl('light', (c[0], 4.29, c[2]), 1, 0.15, 0.06, seg=10)
    for y0, y1, col in ((2.3, 3.6, 'flat:#c9a227'), ):
        for sx in (-1, 1):
            tube(p, dark, (0, y1 + 0.05, 0), (sx * 0.75, y1 + 0.05, 0), 0.016, seg=4)
            tube(p, dark, (0, y0, 0), (sx * 0.75, y0, 0), 0.016, seg=4)
            p.box(col if sx < 0 else 'flat:#8f2020', min(0.08 * sx, sx * 0.72), y0 + 0.03, -0.012, max(0.08 * sx, sx * 0.72), y1, 0.012)


def lamp_small(p):
    """Small-street light (防犯灯) on its own slim pole: a short arm and a small flat LED box."""
    p.cyl(POLE_DK, (0, 0.1, 0), 1, 0.08, 0.2, seg=8)
    taper(p, 'flat:#9ea3a7', 0.2, 4.6, 0.055, 0.045, n=2, seg=8)
    tube(p, 'flat:#9ea3a7', (0, 4.4, 0), (0, 4.65, -0.7), 0.025, seg=6)
    p.box('flat:#5b6066', -0.1, 4.62, -1.0, 0.1, 4.7, -0.6)
    p.box('light', -0.08, 4.6, -0.97, 0.08, 4.62, -0.63)
    p.box('flat:#e8e6de', -0.07, 2.2, -0.065, 0.07, 2.5, -0.055)


def postbox(p):
    """Street post box: a red pillar with a rounded top and two slots (no marks)."""
    red = 'flat:#c8241c'
    p.box('flat:#5a5a5a', -0.24, 0, -0.2, 0.24, 0.08, 0.2)
    p.box(red, -0.22, 0.08, -0.18, 0.22, 1.05, 0.18)
    p.cyl(red, (0, 1.05, 0), 2, 0.22, 0.36, seg=14)
    for x in (-0.11, 0.11):
        p.box(HOUSING, x - 0.07, 0.86, -0.185, x + 0.07, 0.89, -0.18)
    p.box(WHITE, -0.12, 0.45, -0.185, 0.12, 0.62, -0.18)


def phonebox(p):
    """Public phone booth: a grey-green frame, glass all round, a phone shelf (front -z, door there)."""
    fr = 'flat:#55706a'
    p.box('flat:#8a8a86', -0.5, 0, -0.5, 0.5, 0.06, 0.5)
    for sx in (-0.47, 0.47):
        for sz in (-0.47, 0.47):
            p.box(fr, sx - 0.03, 0.06, sz - 0.03, sx + 0.03, 2.2, sz + 0.03)
    p.box(fr, -0.52, 2.2, -0.52, 0.52, 2.36, 0.52)
    p.box('flat:#e9e7df', -0.5, 2.36, -0.5, 0.5, 2.4, 0.5)
    for a, n in (((-0.47, 0.2, -0.47), (0, 0, -1)), ((-0.47, 0.2, 0.47), (0, 0, 1))):
        z = a[2]
        for h in (n, (0, 0, -n[2])):
            p.face('glassTint', [(-0.44, 0.2, z), (0.44, 0.2, z), (0.44, 2.15, z), (-0.44, 2.15, z)], h)
    for x in (-0.47, 0.47):
        for h in ((-1, 0, 0), (1, 0, 0)):
            p.face('glassTint', [(x, 0.2, -0.44), (x, 0.2, 0.44), (x, 2.15, 0.44), (x, 2.15, -0.44)], h)
    p.box(fr, -0.44, 0.95, 0.3, 0.44, 0.99, 0.44)
    p.box('flat:#3f8f5a', -0.13, 1.1, 0.36, 0.13, 1.5, 0.44)
    p.box('light', -0.3, 2.18, -0.3, 0.3, 2.2, 0.3)


def gomist(p):
    """Garbage station: a green folding cage of steel mesh on a concrete pad, a sign board on the back."""
    g = 'flat:#3d7a4a'
    p.box('flat:#a49e92', -1.0, 0, -0.55, 1.0, 0.06, 0.55)
    for sx in (-0.97, 0.97):
        for sz in (-0.52, 0.52):
            p.box(g, sx - 0.025, 0.06, sz - 0.025, sx + 0.025, 1.0, sz + 0.025)
    for y in (0.06, 0.52, 1.0):
        for sz in (-0.52, 0.52):
            p.box(g, -0.97, y, sz - 0.015, 0.97, y + 0.03, sz + 0.015)
        for sx in (-0.97, 0.97):
            p.box(g, sx - 0.015, y, -0.52, sx + 0.015, y + 0.03, 0.52)
    for k in range(13):
        x = -0.9 + k * 0.15
        for sz in (-0.52, 0.52):
            p.box(g, x - 0.006, 0.06, sz - 0.006, x + 0.006, 1.0, sz + 0.006)
    p.box(g, -0.99, 1.0, -0.54, 0.99, 1.04, 0.54)
    p.box(WHITE, -0.4, 1.06, 0.5, 0.4, 1.5, 0.53)
    # Bags inside.
    for x, c in ((-0.55, '#e8e8e2'), (-0.1, '#d8dcd0'), (0.4, '#ececdf')):
        p.cyl('flat:' + c, (x, 0.3, 0.05), 1, 0.25, 0.5, seg=8)


def bikerack(p):
    """Bicycle rack: a rail along x with eight front-wheel slots, each with its lock."""
    for x in (-2.0, 2.0):
        p.box(POLE_DK, x - 0.03, 0, -0.03, x + 0.03, 0.55, 0.03)
    p.box(POLE, -2.0, 0.5, -0.03, 2.0, 0.55, 0.03)
    for k in range(8):
        x = -1.75 + k * 0.5
        p.box(POLE, x - 0.06, 0.0, -0.45, x - 0.05, 0.25, 0.0)
        p.box(POLE, x + 0.05, 0.0, -0.45, x + 0.06, 0.25, 0.0)
        p.box('flat:#c8a020', x - 0.05, 0.3, -0.06, x + 0.05, 0.45, -0.03)


def bench_s(p):
    """Street bench: a steel frame, five timber slats, an arm in the middle (front -z)."""
    for x in (-0.8, 0.8):
        p.box(POLE_DK, x - 0.03, 0, -0.2, x + 0.03, 0.42, 0.2)
        p.box(POLE_DK, x - 0.03, 0.42, 0.18, x + 0.03, 0.85, 0.22)
    for k in range(3):
        z = -0.2 + k * 0.13
        p.box(TIMBER, -0.95, 0.42, z, 0.95, 0.46, z + 0.11)
    for k in range(2):
        p.box(TIMBER, -0.95, 0.58 + k * 0.15, 0.19, 0.95, 0.7 + k * 0.15, 0.23)
    p.box(POLE_DK, -0.03, 0.46, -0.18, 0.03, 0.66, 0.15)


def barberpole(p):
    """Barber's sign pole (サインポール): a glass cylinder of red, white and blue bands under caps, on a wall bracket at +z."""
    p.box(POLE_DK, -0.04, 0.75, 0.0, 0.04, 0.82, 0.2)
    p.cyl('flat:#d8d8d8', (0, 1.27, 0), 1, 0.12, 0.06, seg=12)
    p.cyl('flat:#d8d8d8', (0, 0.73, 0), 1, 0.12, 0.06, seg=12)
    cols = ['flat:#c8241c', WHITE, 'flat:#1f5fae', WHITE]
    for k in range(8):
        p.cyl(cols[k % 4], (0, 0.79 + k * 0.055 + 0.0275, 0), 1, 0.1, 0.055, seg=12, caps=False)
    p.cyl('light', (0, 1.33, 0), 1, 0.07, 0.06, seg=10)


def planter(p):
    """A long concrete planter of low shrubs."""
    p.box('flat:#b3ada0', -0.9, 0, -0.3, 0.9, 0.5, 0.3)
    for k in range(5):
        x = -0.7 + k * 0.35
        p.cyl('flat:#4f7f45' if k % 2 else 'flat:#5f9050', (x, 0.62, 0), 1, 0.2, 0.28, seg=8)


def keivan(p, col):
    """A kei van: the tall kei body with blank rear sides and a roof ladder rack."""
    kei(p, col)
    L, W = 3.4, 1.48
    for s in (-1, 1):
        x = s * (W / 2 - 0.07)
        p.box('flat:' + col, min(x, x + s * 0.012), 1.0, 0.0, max(x, x + s * 0.012), 1.62, L / 2 - 0.15)
        p.box('flat:#2a2c30', s * 0.6 - 0.02, 1.74, -0.6, s * 0.6 + 0.02, 1.78, 1.5)
    for z in (-0.4, 0.5, 1.4):
        p.box('flat:#2a2c30', -0.6, 1.76, z - 0.02, 0.6, 1.79, z + 0.02)


# ── Street life (2026-11-20): vending nook, bins, plants, AC racks, menu boards, banner flags ──

def vendroof(p):
    """A vending nook: a corrugated lean-to roof on two posts over 3 m of machines (which stand in
    front of its back panel, a separate model), a strip light under it, a bench at one end."""
    st, sheet = 'flat:#6f726b', 'flat:#9ea4a6'
    for x in (-1.75, 1.75):
        p.box(st, x - 0.04, 0, -0.95, x + 0.04, 2.45, -0.87)
    p.box('flat:#c9c6bc', -1.8, 0, 0.42, 1.8, 2.6, 0.5)
    for k in range(14):
        x = -1.85 + k * 0.27
        p.prism(sheet, [(-1.05, 2.45), (0.55, 2.65), (0.55, 2.68), (-1.05, 2.48)], 'x', x, x + 0.25)
    p.box(st, -1.85, 2.4, -1.02, 1.85, 2.46, -0.95)
    p.box('light', -1.5, 2.43, -0.5, 1.5, 2.45, -0.38)
    # The bench, at the +x end in front of the machines' line.
    p.box(TIMBER, 1.85, 0.42, -0.6, 2.85, 0.46, -0.2)
    for x in (1.95, 2.75):
        p.box(st, x - 0.03, 0, -0.55, x + 0.03, 0.42, -0.25)


def recycle(p):
    """Recycling bin for cans and bottles beside a vending machine: a blue box, a white lid with two holes."""
    p.box('flat:#2f6fb0', -0.22, 0, -0.2, 0.22, 0.72, 0.2)
    p.box('flat:#f2f2ee', -0.23, 0.72, -0.21, 0.23, 0.8, 0.21)
    for x in (-0.1, 0.1):
        p.cyl('flat:#26292b', (x, 0.81, -0.05), 1, 0.05, 0.01, seg=10)
    p.box('flat:#f2f2ee', -0.15, 0.4, -0.205, 0.15, 0.55, -0.2)


def herbbox(p):
    """Styrofoam boxes of herbs and greens on the doorstep, one stacked on a crate."""
    foam = 'flat:#efefea'
    for x, y in ((-0.3, 0.0), (0.3, 0.0), (0.05, 0.32)):
        if y:
            p.box('flat:#3a5a9a', x - 0.28, 0, -0.16, x + 0.28, 0.3, 0.16)
        p.box(foam, x - 0.27, y, -0.15, x + 0.27, y + 0.22, 0.15)
        for k in range(3):
            p.cyl(('flat:#5f9050', 'flat:#4f7f45', 'flat:#7aa860')[k], (x - 0.16 + k * 0.16, y + 0.32, 0), 1, 0.1, 0.22, seg=6)


def potpine(p):
    """A potted black pine on the doorstep, pruned in pads."""
    p.cyl('flat:#6a4a35', (0, 0.17, 0), 1, 0.22, 0.34, seg=10)
    tube(p, 'flat:#4a3a2c', (0, 0.34, 0), (0.08, 0.8, 0.02), 0.04, seg=6)
    tube(p, 'flat:#4a3a2c', (0.08, 0.8, 0.02), (-0.05, 1.15, 0.0), 0.03, seg=6)
    for x, y, r in ((0.15, 0.78, 0.2), (-0.12, 0.98, 0.18), (0.0, 1.2, 0.15)):
        p.cyl('flat:#3d5f35', (x, y, 0), 1, r, 0.1, seg=10)


def plantshelf(p):
    """A stepped wooden plant shelf against the wall (back at +z), crowded with pots."""
    for k, (y, z) in enumerate(((0.3, -0.15), (0.65, 0.0), (1.0, 0.15))):
        p.box(TIMBER, -0.6, y - 0.03, z - 0.13, 0.6, y, z + 0.13)
        for j in range(4):
            x = -0.45 + j * 0.3
            p.cyl('flat:#9a5a3a', (x, y + 0.08, z), 1, 0.08, 0.16, seg=8)
            p.cyl(('flat:#4f8f45', 'flat:#6aa84f', 'flat:#3f7a3a', 'flat:#c86a8a')[(j + k) % 4], (x, y + 0.24, z), 1, 0.1, 0.16, seg=8)
    for x in (-0.58, 0.58):
        p.box(TIMBER, x - 0.02, 0, -0.28, x + 0.02, 1.0, 0.28)


def greencurtain(p):
    """A green curtain (緑のカーテン): morning glories climbing a net in front of a window (wall at +z)."""
    p.box('flat:#26292b', -0.8, 2.2, -0.12, 0.8, 2.24, 0.0)
    p.box('flat:#9a5a3a', -0.8, 0, -0.35, 0.8, 0.3, -0.05)
    for k in range(9):
        x = -0.72 + k * 0.18
        h = 1.4 + (k * 37 % 7) * 0.11
        p.box('flat:#4f8f45' if k % 2 else 'flat:#3f7a3a', x - 0.07, 0.3, -0.12, x + 0.07, 0.3 + h, -0.08)
        if k % 3 == 1:
            p.cyl('flat:#6a7fd0', (x, 0.3 + h * 0.7, -0.13), 2, 0.05, 0.02, seg=8)


def acrack(p, n):
    """Air-conditioning outdoor units on a wall rack (wall at +z), `n` stacked in columns of up to 3."""
    cols = (n + 2) // 3
    for c in range(cols):
        x = -((cols - 1) * 0.95) / 2 + c * 0.95
        rows = min(3, n - c * 3)
        for k in range(rows):
            y = k * 0.85
            p.box('flat:#8b9197', x - 0.45, y, -0.42, x + 0.45, y + 0.04, 0)
            p.box('flat:#d8d8d2', x - 0.42, y + 0.04, -0.36, x + 0.42, y + 0.66, 0)
            p.cyl('flat:#5f6266', (x - 0.1, y + 0.35, -0.37), 2, 0.22, 0.01, seg=12)
            tube(p, 'flat:#c9c6bc', (x + 0.38, y + 0.2, -0.1), (x + 0.38, y + 0.2, 0.0), 0.03, seg=5)
        p.box('flat:#8b9197', x - 0.47, -0.05, -0.05, x - 0.43, rows * 0.85, 0)
        p.box('flat:#8b9197', x + 0.43, -0.05, -0.05, x + 0.47, rows * 0.85, 0)
    p.box('flat:#c9c6bc', -0.04, -1.5, -0.08, 0.04, 0.0, -0.02)


def aboard(p):
    """A-frame menu board: two framed blank boards leaning together (the menu is a game sign)."""
    for s in (-1, 1):
        p.prism('flat:#4a3426', [(s * 0.02, 0.95), (s * 0.3, 0.0), (s * 0.33, 0.0), (s * 0.05, 0.95)], 'x', -0.32, 0.32)
    p.box('flat:#4a3426', -0.3, 0.92, -0.04, 0.3, 0.98, 0.04)


def menucase(p):
    """A food-sample case: a glass box on legs with plastic dishes (front -z)."""
    for x in (-0.55, 0.55):
        p.box('flat:#5f6266', x - 0.02, 0, -0.25, x + 0.02, 0.8, -0.21)
        p.box('flat:#5f6266', x - 0.02, 0, 0.21, x + 0.02, 0.8, 0.25)
    p.box('flat:#d9d4c4', -0.6, 0.8, -0.27, 0.6, 0.84, 0.27)
    p.box('flat:#3a3d42', -0.6, 0.84, 0.22, 0.6, 1.5, 0.27)
    for k in range(6):
        x, z = -0.4 + (k % 3) * 0.4, -0.08 + (k // 3) * 0.18
        p.cyl('flat:#f2f2ee', (x, 0.86, z), 1, 0.13, 0.03, seg=12)
        p.cyl(('flat:#d9a03a', 'flat:#b3462b', 'flat:#e8d9a0', 'flat:#7a5030', 'flat:#e0c060', 'flat:#c86a3a')[k], (x, 0.92, z), 1, 0.1, 0.07, seg=10)
    p.face('glassTint', [(-0.6, 0.84, -0.27), (0.6, 0.84, -0.27), (0.6, 1.5, -0.27), (-0.6, 1.5, -0.27)], (0, 0, -1))
    p.box('flat:#5f6266', -0.62, 1.5, -0.29, 0.62, 1.54, 0.29)
    p.box('light', -0.5, 1.48, -0.15, 0.5, 1.5, 0.15)


def nobori(p):
    """A banner-flag pole (のぼり): a steel pole on a water-filled base, a crossbar, the banner blank (a game sign)."""
    p.cyl('flat:#2b2f33', (0, 0.08, 0), 1, 0.2, 0.16, seg=10)
    p.cyl('flat:#c9c6bc', (0, 1.4, 0), 1, 0.015, 2.7, seg=6)
    p.box('flat:#c9c6bc', -0.25, 2.7, -0.01, 0.0, 2.72, 0.01)


PROPS = {
    'signal9': (lambda p: signal(p, ARMS['signal9']), 10), 'signal7': (lambda p: signal(p, ARMS['signal7']), 8), 'signal3': (lambda p: signal(p, ARMS['signal3']), 4),
    'pedpole': (pedpole, 1.5), 'pedhead': (lambda p: pedhead(p, False), 1), 'pedhead_flat': (lambda p: pedhead(p, True), 1),
    'head_h': (lambda p: head(p, False), 2), 'head_flat': (lambda p: head(p, True), 2), 'head_v': (lambda p: head(p, False, True), 1),
    'head_flat_v': (lambda p: head(p, True, True), 1), 'head_arrow': (lambda p: head(p, False, n=1), 1), 'head_flat_arrow': (lambda p: head(p, True, n=1), 1),
    'pushbtn': (pushbtn, 1), 'speaker': (speaker, 1), 'sigside': (sigside, 1.5), 'sigbracket': (sigbracket, 3), 'sigbox': (sigbox, 1.5),
    'signpole': (signpole, 1), 'gantry': (gantry, 9), 'busstop': (busstop, 1.5), 'shelter': (shelter, 5),
    'mirror': (mirror, 1.5), 'bollard': (bollard, 1), 'rail': (rail, 3), 'upole': (upole, 3), 'upole_l': (lambda p: upole(p, False), 3),
    'lamp_hw': (lamp_hw, 3), 'lamp_shop': (lamp_shop, 3), 'lamp_park': (lamp_park, 2), 'fingerpost': (fingerpost, 3), 'mapstand': (mapstand, 3), 'wand': (wand, 1),
    'xing_mast': (xing_mast, 3), 'xing_gate': (xing_gate, 2),
    'sigp2': (lambda p: sigp(p, 2.0), 3), 'sigp3': (lambda p: sigp(p, 3.5), 4.5), 'sigp6': (lambda p: sigp(p, 6.5), 7.5), 'siglight2': (lambda p: sigp(p, 2.0, True), 4), 'siglight3': (lambda p: sigp(p, 3.5, True), 4.5),
    'head_zebra': (head_zebra, 2),
    'sigshort': (sigshort, 2.5), 'pedband': (pedband, 1), 'lamp_led': (lamp_led, 3), 'lamp_twin': (lamp_twin, 6), 'lamp_suzuran': (lamp_suzuran, 2),
    'lamp_small': (lamp_small, 2), 'postbox': (postbox, 1), 'phonebox': (phonebox, 1.5), 'gomist': (gomist, 2.5), 'bikerack': (bikerack, 4.5),
    'bench_s': (bench_s, 2.2), 'barberpole': (barberpole, 1), 'planter': (planter, 2.2),
    'vendroof': (vendroof, 6), 'recycle': (recycle, 1), 'herbbox': (herbbox, 1.5), 'potpine': (potpine, 1), 'plantshelf': (plantshelf, 1.5),
    'greencurtain': (greencurtain, 2), 'acrack2': (lambda p: acrack(p, 2), 1.5), 'acrack3': (lambda p: acrack(p, 3), 1.5), 'acrack5': (lambda p: acrack(p, 5), 2.5),
    'acrack8': (lambda p: acrack(p, 8), 3.5), 'aboard': (aboard, 1), 'menucase': (menucase, 1.5), 'nobori': (nobori, 1),
    'van_b': (lambda p: van(p, '#f1efe8', '#2b5f9e'), 3), 'van_s': (lambda p: van(p, '#a9aeb3', None), 3),
    'kei_v': (lambda p: keivan(p, '#eeeeea'), 3), 'kei_vb': (lambda p: keivan(p, '#3f6f9e'), 3),
    'minivan_s': (lambda p: minivan(p, '#a9aeb3'), 3), 'minivan_b': (lambda p: minivan(p, '#2f4f7a'), 3),
    'scooter_k': (lambda p: scooter(p, '#2a2d32', '#5a4a3a'), 2), 'scooter_w': (lambda p: scooter(p, '#eeeeea', '#8a2f2f'), 2),
    'sedan_w': (lambda p: sedan(p, '#e6e6e2'), 3), 'sedan_k': (lambda p: sedan(p, '#2a2d32'), 3), 'sedan_r': (lambda p: sedan(p, '#8f2020'), 3),
    'sedan_b': (lambda p: sedan(p, '#27508a'), 3), 'sedan_s': (lambda p: sedan(p, '#9aa0a6'), 3),
    'taxi': (lambda p: sedan(p, '#1d4d2b', taxi=True), 3),
    'kei_y': (lambda p: kei(p, '#e8c93a'), 3), 'kei_w': (lambda p: kei(p, '#f0efe8'), 3), 'kei_p': (lambda p: kei(p, '#d9a3b0'), 3), 'kei_g': (lambda p: kei(p, '#7fa58a'), 3),
    'van': (lambda p: van(p, '#f1efe8'), 3), 'bus': (bus, 4),
    'truck': (truck, 4), 'keitruck': (keitruck, 3), 'scooter': (scooter, 2),
    'scooter_b': (lambda p: scooter(p, '#2b5f9e', '#30343a'), 2), 'gomi': (gomi, 4),
    'bus_c': (lambda p: bus(p, 'flat:#2f7d4f', 'flat:#e8a020'), 4),
    'sedan_g': (lambda p: sedan(p, '#2f4a3a'), 3), 'sedan_n': (lambda p: sedan(p, '#b9a98a'), 3),
    'compact_w': (lambda p: compact(p, '#eeece4'), 3), 'compact_r': (lambda p: compact(p, '#b8402f'), 3), 'compact_t': (lambda p: compact(p, '#3f8f94'), 3),
    'minivan_k': (lambda p: minivan(p, '#30333a'), 3), 'minivan_w': (lambda p: minivan(p, '#e9e7df'), 3),
    'cycle': (lambda p: cycle(p, '#3a6f5a', '#c9b24a'), 2), 'cycle_b': (lambda p: cycle(p, '#8a2f2f', '#4a5f8a'), 2),
}

# Everything that drives, once more without its wheels (see BARE).
DRIVEN = ['sedan_w', 'sedan_k', 'sedan_r', 'sedan_b', 'sedan_s', 'sedan_g', 'sedan_n', 'taxi', 'kei_y', 'kei_w', 'kei_p', 'kei_g', 'van', 'bus', 'bus_c',
          'truck', 'keitruck', 'gomi', 'scooter', 'scooter_b', 'compact_w', 'compact_r', 'compact_t', 'minivan_k', 'minivan_w', 'cycle', 'cycle_b',
          'van_b', 'van_s', 'kei_v', 'kei_vb', 'minivan_s', 'minivan_b', 'scooter_k', 'scooter_w']


def bare(fn):
    def build(p):
        BARE[0] = True
        try:
            fn(p)
        finally:
            BARE[0] = False
    return build


for _k in DRIVEN:
    PROPS[_k + '_body'] = (bare(PROPS[_k][0]), PROPS[_k][1])


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('road', [dict(id=k, w=w, gap=1.5) for k, (_, w) in PROPS.items()], build_hi, lambda v: None)
