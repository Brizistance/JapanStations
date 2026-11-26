# Builds Hokuei-dōri shopping arcade behind Kita-Ōdōri's viaduct (the hub's back quarter): its
# gates, its roof, and the low shops along its south side.
#
#   blender --background --python tools/blender/build_kitaarcade.py -- [--renders <dir>]
#
# Writes assets/buildings/kitaarcade.blend, public/models/buildings/kitaarcade.glb and
# src/stations/anchors/kitaarcade.ts. Frame and helpers: buildkit.py, kitakit.py.
#
#   gate       the arcade's entrance: two posts AW + 1 apart, an arched truss, a name board on both faces.
#   roof       RB m of roof along the arcade (which runs along x, AW wide from z = 0): steel hoops, a
#              translucent vault, hanging banners and lanterns.
#   sa … se    shops SW wide, SD deep, open to the arcade under a board, a floor or two above.
#   pachi game a pachinko hall and a game centre, each two shops wide.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

AW, RB, RH = 6.0, 6.0, 8.2
SW, SD = 6.0, 7.0
POST = 'flat:#3f6a5a'
POST_LT = 'flat:#7fa594'


def gate(p):
    h = AW / 2 + 0.25
    for sx in (-1, 1):
        p.cyl(POST, (sx * h, 3.6, 0), 1, 0.16, 7.2, seg=10)
        p.cyl(POST_LT, (sx * h, 0.5, 0), 1, 0.22, 1.0, seg=10)
        p.cyl('light', (sx * h, 4.4, 0), 1, 0.2, 0.5, seg=8)
    n = 12
    for k in range(n):
        t0, t1 = math.pi * k / n, math.pi * (k + 1) / n
        for rr, t in ((h + 0.1, 0.16), (h - 0.9, 0.12)):
            p.face(POST, [(-rr * math.cos(t0), 7.0 + rr * 0.45 * math.sin(t0), -t), (-rr * math.cos(t1), 7.0 + rr * 0.45 * math.sin(t1), -t),
                          (-rr * math.cos(t1), 7.0 + rr * 0.45 * math.sin(t1), t), (-rr * math.cos(t0), 7.0 + rr * 0.45 * math.sin(t0), t)], (0, 1, 0))
            p.face(POST, [(-rr * math.cos(t0), 6.9 + rr * 0.45 * math.sin(t0), -t), (-rr * math.cos(t1), 6.9 + rr * 0.45 * math.sin(t1), -t),
                          (-rr * math.cos(t1), 6.9 + rr * 0.45 * math.sin(t1), t), (-rr * math.cos(t0), 6.9 + rr * 0.45 * math.sin(t0), t)], (0, -1, 0))
    p.box('flat:#f4f1e8', -h + 0.5, 5.3, -0.14, h - 0.5, 6.9, 0.14)
    p.box(POST, -h + 0.4, 5.2, -0.16, h - 0.4, 5.3, 0.16)
    mark('name_f', 0, 6.1, -0.16, 2 * h - 1.2, 1.5, (0, -1))
    mark('name_b', 0, 6.1, 0.16, 2 * h - 1.2, 1.5, (0, 1))
    for c in rows(-h + 0.6, h - 0.6, 0.9):
        p.cyl('flat:#e5533d', (c, 4.85, 0), 1, 0.17, 0.42, seg=8)
        p.box(DARK, c - 0.01, 5.06, -0.01, c + 0.01, 5.2, 0.01)


def roof(p, s, r):
    for z in (0.14, AW - 0.14):
        p.cyl(POST, (0, RH / 2 - 0.4, z), 1, 0.11, RH - 0.8, seg=8)
        p.cyl(POST_LT, (0, 0.4, z), 1, 0.16, 0.8, seg=8)
    n = 8
    prof = [(AW * k / n, RH - 0.8 + 1.7 * math.sin(math.pi * k / n)) for k in range(n + 1)]
    for (za, ya), (zb, yb) in zip(prof[:-1], prof[1:]):
        p.face('glassTint', [(-RB / 2, ya, za), (RB / 2, ya, za), (RB / 2, yb, zb), (-RB / 2, yb, zb)], (0, 1, 0))
        for x in (-0.06, RB / 2 - 0.06):
            p.face(POST, [(x, ya, za), (x + 0.12, ya, za), (x + 0.12, yb, zb), (x, yb, zb)], (0, 1, 0))
            p.face(POST, [(x, ya - 0.12, za), (x + 0.12, ya - 0.12, za), (x + 0.12, yb - 0.12, zb), (x, yb - 0.12, zb)], (0, -1, 0))
    for z in (0.02, AW - 0.14):
        p.box(POST, -RB / 2, RH - 0.92, z, RB / 2, RH - 0.78, z + 0.12)
    p.box(POST, -0.05, RH - 0.8, 0.14, 0.05, RH - 0.7, AW - 0.14)
    # A banner across the arcade (read walking either way), lanterns either side of it, a strip light.
    sign(s, r.choice(['#c8102e', '#1f5fa8', '#f4f1e8', '#1d8a4e', '#f2c230']), -0.03, RH - 2.7, AW / 2 - 1.5, 0.03, RH - 1.5, AW / 2 + 1.5)
    for z in (0.9, AW - 0.9):
        p.cyl('flat:#e5533d', (0, RH - 2.0, z), 1, 0.2, 0.5, seg=8)
    p.box('light', -1.6, RH + 0.55, AW / 2 - 0.05, 1.6, RH + 0.6, AW / 2 + 0.05)
    p.box('light', -RB / 2 + 0.4, RH - 0.96, 0.2, RB / 2 - 0.4, RH - 0.92, 0.3)
    p.box('light', -RB / 2 + 0.4, RH - 0.96, AW - 0.3, RB / 2 - 0.4, RH - 0.92, AW - 0.2)


WALLS = ['flat:#d8d0bc', 'flat:#b9a48c', 'flat:#cfd3d1', 'flat:#8a5a44', 'flat:#e8e4d8']
GOODS = ['flat:#c8102e', 'flat:#f2c230', 'flat:#1f5fa8', 'flat:#1d8a4e', 'flat:#e86a1c', 'flat:#f4f1e8', 'flat:#7a3fa0']


def shop(p, s, v, r):
    w, d, floors = v['w'], SD, v['floors']
    x0, x1 = -w / 2, w / 2
    wall = WALLS[v['n'] % len(WALLS)]
    h = 3.6 + floors * 2.9
    # Ground floor: open to the arcade between two piers, lit inside, goods set out in front.
    p.box(wall, x0, 0, 0, x0 + 0.3, 3.6, d)
    p.box(wall, x1 - 0.3, 0, 0, x1, 3.6, d)
    p.box('flat:#2a2622', x0 + 0.3, 0, d - 0.2, x1 - 0.3, 3.6, d)
    p.box('flat:#d9d2c2', x0 + 0.3, 0, 2.2, x1 - 0.3, 0.02, d - 0.2)
    p.box('light', x0 + 0.8, 3.1, 1.2, x1 - 0.8, 3.14, 1.4)
    p.box('light', x0 + 0.8, 3.1, 3.6, x1 - 0.8, 3.14, 3.8)
    quad(p, 'windowDim', 'f', x0 + 0.3, x1 - 0.3, 0.0, 3.1, d - 0.22, col='flat:#8a7a5e')
    for c in rows(x0 + 0.5, x1 - 0.5, 1.25):
        hh = r.uniform(0.7, 1.05)
        p.box('flat:#8a6a4a', c - 0.55, 0, 0.25, c + 0.55, hh, 1.3)
        for k in range(3):
            p.box(r.choice(GOODS), c - 0.5 + k * 0.34, hh, 0.35, c - 0.2 + k * 0.34, hh + r.uniform(0.12, 0.3), 1.2)
    for c in rows(x0 + 0.5, x1 - 0.5, 1.6):
        p.box('flat:#6b5a48', c - 0.7, 0, d - 1.0, c + 0.7, 2.1, d - 0.25)
        for y in (0.5, 1.1, 1.7):
            p.box(r.choice(GOODS), c - 0.6, y, d - 1.04, c + 0.6, y + 0.35, d - 1.0)
    # The shop's board, an awning on some, upper floors with a window or two and an AC unit.
    p.box(wall, x0, 3.6, 0, x1, h, d)
    fascia(s, x0 + 0.2, x1 - 0.2, 3.25, 4.35, 0, r=r)
    if v['n'] % 2:
        col = r.choice(['#8f2020', '#12382c', '#1f3f7a', '#b35a1c'])
        p.prism('flat:' + col, [(0, 3.25), (-1.1, 2.75), (-1.1, 2.85), (0, 3.35)], 'x', x0 + 0.1, x1 - 0.1)
    for i in range(floors):
        y = 4.6 + i * 2.9
        for c in rows(x0 + 0.4, x1 - 0.4, w / 2):
            win(p, c - 0.85, y + 0.3, c + 0.85, y + 1.7, 0)
        if r.random() < 0.7:
            wall_ac(p, 'z', 0, -1, y + 0.1, x1 - 0.8)
    if floors > 1 or r.random() < 0.5:
        blade(s, x0 + 0.35, 4.6, 4.6 + floors * 2.9 - 0.4, 0, 0.75, r=r)
    p.box(ROOF, x0 - 0.05, h, -0.05, x1 + 0.05, h + 0.35, d + 0.05)
    if r.random() < 0.5:
        tank(p, x0 + 1.6, h + 0.35, d - 2.0, 0.6, 1.2)
    acu(p, x1 - 1.6, h + 0.35, 2.0)
    backs(p, w, d, [3.6 + i * 2.9 for i in range(floors)] + [h], r, sides=(), back=True, use='home')


def hall(p, s, v, r):
    """A pachinko hall or a game centre: twice a shop's width, a loud front."""
    w, d, h = v['w'], SD, v['h']
    x0, x1 = -w / 2, w / 2
    pachi = v['id'] == 'pachi'
    p.box('flat:#1d1f22' if pachi else 'flat:#e8e4d8', x0, 0, 0.0, x1, h, d)
    if pachi:
        quad(p, 'windowDim', 'f', x0 + 0.6, x1 - 0.6, 0.2, 3.0, -0.02, col='flat:#b9a45a')
        for c in rows(x0 + 0.6, x1 - 0.6, 2.0):
            p.box('flat:#b08d3a', c - 1.0, 0, -0.08, c - 0.94, 3.1, 0)
        doors(p, 0, 0, -0.02, 2.6, 2.8, BRASS)
        for k, c in enumerate(rows(x0, x1, 1.0)):
            p.box(['flat:#c8102e', 'flat:#f2c230', 'flat:#f4f1e8'][k % 3], c - 0.5, 4.9, -0.2, c + 0.5, h - 0.4, -0.02)
        p.box('light', x0 + 0.3, 3.15, -0.3, x1 - 0.3, 3.3, -0.02)
        board(p, 'name', 'f', x0 + 1.0, x1 - 1.0, 3.45, 4.75, 0, 'flat:#c8102e', 0.3)
    else:
        p.box('flat:#2a2622', x0 + 0.3, 0, 0.2, x1 - 0.3, 3.3, d - 0.2)
        p.box('light', x0 + 0.8, 3.2, 1.5, x1 - 0.8, 3.26, 1.7)
        for c in rows(x0 + 0.6, x1 - 0.6, 1.5):
            col = r.choice(GOODS)
            p.box(col, c - 0.55, 0, 0.6, c + 0.55, 0.75, 1.7)
            quad(p, 'glassTint', 'f', c - 0.55, c + 0.55, 0.75, 1.75, 0.6)
            p.box(col, c - 0.55, 1.75, 0.6, c + 0.55, 2.0, 1.7)
        board(p, 'name', 'f', x0 + 0.4, x1 - 0.4, 3.4, 5.2, 0, 'flat:#1f5fa8', 0.25)
        for k, c in enumerate(rows(x0, x1, 2.4)):
            p.box(['flat:#f2c230', 'flat:#d94f8a', 'flat:#0e8f9c'][k % 3], c - 1.2, 5.4, -0.06, c + 1.2, h - 0.3, 0)
        for i in range(2):
            blade(s, x1 - 0.4, 5.6 + i * 3.0, 8.2 + i * 3.0, 0, 0.9, r=r)
    p.box(ROOF, x0 - 0.05, h, -0.05, x1 + 0.05, h + 0.35, d + 0.05)
    acu(p, x0 + 1.0, h + 0.35, 2.0)
    acu(p, x0 + 2.2, h + 0.35, 2.0)
    backs(p, w, d, [3.6, 6.6, h] if h > 9 else [3.6, h], r, sides=(), back=True)


SHOPS_ = [dict(id='s' + 'abcde'[n], w=SW, floors=1 + (n % 3 == 1) + (n == 4), n=n) for n in range(5)]
HALLS = [dict(id='pachi', w=12.0, h=9.6), dict(id='game', w=12.0, h=11.8)]


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(dict(v, d=SD))
    r = random.Random(sum(map(ord, v['id'])) * 3)
    if v['id'] == 'gate':
        gate(body)
    elif v['id'] == 'roof':
        roof(body, signs, r)
    elif v['id'] in ('pachi', 'game'):
        hall(body, signs, v, r)
    else:
        shop(body, signs, v, r)
    return body, signs


if __name__ == '__main__':
    variants = [dict(id='gate', w=AW + 1.0), dict(id='roof', w=RB)] + SHOPS_ + HALLS
    run('kitaarcade', [dict(q, gap=2.5) for q in variants], build_hi, lambda v: None)
    write_anchors('kitaarcade')
