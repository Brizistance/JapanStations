# Builds the fittings of Miochika, the underground shopping town under Kita-Ōdōri (the hub's B1),
# and of the Mioya food floor beside it.
#
#   blender --background --python tools/blender/build_miochika.py -- [--renders <dir>]
#
# Writes assets/buildings/miochika.blend, public/models/buildings/miochika.glb and
# src/stations/anchors/miochika.ts. Frame and helpers: buildkit.py, kitakit.py. These stand below
# the street: the game loads them without daylight.
#
#   clock      the water clock of Mio no Hiroba: a bronze frame CW square over a basin, sheets of
#              falling water (glass) on its four sides, a clock face on each (the game's live clock).
#   gate       a street's gateway where it leaves another: two piers GW apart, a lintel with a name board.
#   counter_a … counter_d   food-floor showcase counters CL long: a glass case of wares, a lit canopy, a board.
#   bench      a round bench about a planter.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

CW, CH = 3.2, 4.4
GW, GH = 8.0, 3.6
CL, CD = 4.0, 1.3
VERDI = 'flat:#3f6a5a'
WATER = 'flat:#2f5f6a'


def clock(p):
    h = CW / 2
    # The basin: a low granite rim, dark water.
    p.box(GRANITE, -h - 1.0, 0, -h - 1.0, h + 1.0, 0.45, h + 1.0)
    p.box(WATER, -h - 0.8, 0.45, -h - 0.8, h + 0.8, 0.47, h + 0.8)
    for sx in (-1, 1):
        for sz in (-1, 1):
            p.box(BRONZE, sx * h - 0.12, 0.45, sz * h - 0.12, sx * h + 0.12, CH, sz * h + 0.12)
    p.box(BRONZE, -h - 0.2, CH - 1.5, -h - 0.2, h + 0.2, CH, h + 0.2)
    p.box(BRASS, -h - 0.25, CH - 1.56, -h - 0.25, h + 0.25, CH - 1.5, h + 0.25)
    p.box(BRASS, -h - 0.25, CH, -h - 0.25, h + 0.25, CH + 0.06, h + 0.25)
    for face, a0, a1, at in sides(-h, h, -h, h):
        quad(p, 'glassTint', face, a0 + 0.12, a1 - 0.12, 0.47, CH - 1.5, at)
        for c in rows(a0 + 0.2, a1 - 0.2, 0.4):
            slab(p, 'light', face, c - 0.02, c + 0.02, CH - 1.62, CH - 1.56, at, 0.02)
        n = NORMAL[face]
        q = wpt(face, 0, CH - 0.75, at, -0.22)
        mark('clock_' + face, q[0], q[1], q[2], 1.2, 1.2, (n[0], n[2]))
    # The works, seen through the water: a column of brass wheels.
    p.cyl(BRASS, (0, 1.9, 0), 1, 0.12, 2.9, seg=10)
    for y, rr in ((1.0, 0.7), (1.7, 0.5), (2.4, 0.62)):
        p.cyl(BRASS_LT, (0, y, 0), 2, rr, 0.08, seg=14)
        p.cyl(BRASS, (0, y + 0.3, 0), 0, rr * 0.7, 0.08, seg=12)
    p.box('light', -0.5, 0.48, -0.5, 0.5, 0.5, 0.5)


def gate(p):
    h = GW / 2
    for sx in (-1, 1):
        p.box(STONE, min(sx * h, sx * (h - 0.7)), 0, -0.35, max(sx * h, sx * (h - 0.7)), GH, 0.35)
        p.box(GRANITE, min(sx * (h + 0.04), sx * (h - 0.74)), 0, -0.39, max(sx * (h + 0.04), sx * (h - 0.74)), 0.8, 0.39)
        p.box(BRASS, min(sx * h, sx * (h - 0.7)), 2.5, -0.37, max(sx * h, sx * (h - 0.7)), 2.56, 0.37)
    p.box(VERDI, -h + 0.7, 2.75, -0.2, h - 0.7, GH, 0.2)
    p.box(BRASS, -h + 0.7, 2.7, -0.22, h - 0.7, 2.75, 0.22)
    p.box('light', -h + 1.0, 2.66, -0.1, h - 1.0, 2.7, 0.1)
    mark('name_f', 0, 3.18, -0.21, GW - 2.0, 0.66, (0, -1))
    mark('name_b', 0, 3.18, 0.21, GW - 2.0, 0.66, (0, 1))


WARES = ['flat:#c8102e', 'flat:#f2c230', 'flat:#e86a1c', 'flat:#f4f1e8', 'flat:#7a3f20', 'flat:#d94f8a', 'flat:#3f6b3a', 'flat:#e8d9b0']


def counter(p, s, v, r):
    x0, x1 = -CL / 2, CL / 2
    col = ['#12382c', '#5a1f1f', '#2a2018', '#1f3f7a'][v['n'] % 4]
    p.box('flat:#e9e2d0', x0, 0, 0, x1, 0.85, CD)
    p.box(BRASS, x0 - 0.02, 0.85, -0.02, x1 + 0.02, 0.9, CD + 0.02)
    p.box(GRANITE, x0, 0, -0.01, x1, 0.12, CD + 0.01)
    # The glass case and what is in it, in rows.
    for face, a0, a1, at in sides(x0 + 0.05, x1 - 0.05, 0.05, CD - 0.35, 'flr'):
        quad(p, 'glassTint', face, a0, a1, 0.9, 1.3, at)
    p.box(BRASS, x0, 1.3, 0.0, x1, 1.33, CD - 0.3)
    for c in rows(x0 + 0.1, x1 - 0.1, 0.5):
        for z in (0.2, 0.55):
            p.box(r.choice(WARES), c - 0.18, 0.9, z, c + 0.18, 0.9 + r.uniform(0.06, 0.2), z + 0.24)
    p.box('light', x0 + 0.1, 1.27, 0.1, x1 - 0.1, 1.3, 0.16)
    # A till, scales, and the canopy on two posts with the shop's board (lettered by the game).
    p.box(DARK, x1 - 0.7, 1.33, CD - 0.28, x1 - 0.3, 1.6, CD - 0.02)
    for x in (x0 + 0.06, x1 - 0.1):
        p.box(BRASS, x, 0.9, CD - 0.1, x + 0.04, 2.5, CD - 0.06)
    p.box('flat:' + col, x0 - 0.05, 2.5, -0.15, x1 + 0.05, 2.62, CD)
    p.box('light', x0 + 0.2, 2.46, 0.2, x1 - 0.2, 2.5, 0.5)
    sign(s, col, x0, 2.0, -0.16, x1, 2.5, -0.1)
    sign_back(s, col, x0, 2.0, CD - 0.02, x1, 2.5, CD + 0.04)


def bench(p):
    p.cyl(GRANITE, (0, 0.25, 0), 1, 0.75, 0.5, seg=14)
    p.cyl(HEDGE, (0, 0.75, 0), 1, 0.6, 0.5, seg=10)
    p.cyl('flat:#6b4a2e', (0, 0.42, 0), 1, 1.25, 0.08, seg=16)
    p.cyl(BRASS, (0, 0.2, 0), 1, 1.1, 0.36, seg=16, caps=False)


VAR = [dict(id='clock', w=CW + 2.0, d=CW + 2.0, h=CH), dict(id='gate', w=GW, d=0.7, h=GH), dict(id='bench', w=2.5, d=2.5, h=1.25)] + \
      [dict(id='counter_' + 'abcd'[n], w=CL, d=CD, h=2.62, n=n) for n in range(4)]


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    if v['id'] == 'clock':
        clock(body)
    elif v['id'] == 'gate':
        gate(body)
    elif v['id'] == 'bench':
        bench(body)
    else:
        counter(body, signs, v, random.Random(v['n'] * 13 + 5))
    return body, signs


if __name__ == '__main__':
    run('miochika', [dict(q, gap=2.0) for q in VAR], build_hi, lambda v: None)
    write_anchors('miochika')
