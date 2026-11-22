# Builds the one-off pieces of Kita-Ōdōri's streets (the hub's district): buildings found nowhere
# else in the city, the metro's street entrances, and the avenue's median.
#
#   blender --background --python tools/blender/build_kitacity.py -- [--renders <dir>]
#
# Writes assets/buildings/kitacity.blend, public/models/buildings/kitacity.glb and
# src/stations/anchors/kitacity.ts. Frame and helpers: buildkit.py, kitakit.py.
#
#   capsule   a capsule hotel and sauna: rows of small round-cornered windows.
#   karaoke   a karaoke tower: a board to every floor.
#   bikepark  a three-deck bicycle park, open-sided.
#   entrance  the roof over a metro exit's stair (EW × ED, the stair's opening under it), open at both ends.
#   pylon     a station pylon sign for the pavement beside an exit.
#   median    6 m of the avenue's median: a kerb, a hedge, a fence.
#   busbay    a bus terminal shelter 12 m long: a roof on a row of columns, a bench, a board for the stop.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

EW, ED = 10.0, 3.4


def capsule(p, s, v, r):
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box('flat:#d9d4c6', x0, 0, 0, x1, h, d)
    p.box('flat:#2f4a5a', x0, 0, -0.05, x1, 3.6, 0.3)
    doors(p, -1.4, 0, -0.05, 2.0, 2.5, ALU)
    quad(p, 'windowDim', 'f', 0.4, x1 - 0.4, 0.7, 2.9, -0.07, col=SHOP)
    board(p, 'name', 'f', x0 + 0.4, x1 - 0.4, 3.7, 5.0, 0, 'flat:#2f4a5a', 0.15)
    n = int((h - 6) / 2.2)
    for i in range(n):
        y = 5.6 + i * 2.2
        for c in rows(x0 + 0.5, x1 - 1.6, 1.25):
            quad(p, 'flat:#b9b3a4', 'f', c - 0.5, c + 0.5, y, y + 1.5, -0.015)
            quad(p, WINDOW, 'f', c - 0.38, c + 0.38, y + 0.3, y + 1.2, -0.03)
    grid(p, x0, x1, 0, d, 5.6, h - 1, WHITE, 2.2, 2.6, 0.7, 0.9, 0.5, 'blr', body=False)
    board(p, 'vertical', 'f', x1 - 1.3, x1 - 0.2, 8.0, h - 2.0, 0, 'flat:#c8102e', 0.25)
    service_back(p, x0, x1, d, 3.6, r)
    plant(p, x0, x1, h, 0, d, 3)
    # The sauna's chimney and a tank.
    p.cyl('flat:#b9b6ae', (x0 + 1.4, h + 3.0, d - 1.6), 1, 0.35, 6.0, seg=10)


def karaoke(p, s, v, r):
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box('flat:#f2efe8', x0, 0, 0, x1, h, d)
    p.box('flat:#c8102e', x0, 0, -0.06, x1, 4.2, 0.2)
    doors(p, 0, 0, -0.06, 2.6, 2.7, ALU)
    p.box('light', x0 + 0.5, 3.0, -0.5, x1 - 0.5, 3.1, -0.06)
    cols = ['#c8102e', '#f2c230', '#1f5fa8', '#d94f8a', '#1d8a4e', '#e86a1c', '#7a3fa0', '#0e8f9c']
    n = int((h - 5) / 3.4)
    for i in range(n):
        y = 4.6 + i * 3.4
        fascia(s, x0 + 0.3, x1 - 2.0, y + 0.2, y + 1.5, 0, cols[i % len(cols)])
        for c in rows(x0 + 0.3, x1 - 2.0, 2.0):
            quad(p, WINDOW, 'f', c - 0.8, c + 0.8, y + 1.7, y + 3.1, -0.03)
    curtain(p, x1 - 1.9, x1 - 0.1, -0.3, 1.8, 4.2, h + 1.8, GLASS_BL, ALU, 3.4, 0.9, 0.3, 2, 'flr')
    grid(p, x0, x1, 0, d, 4.6, h - 1, WHITE, 3.4, 2.8, 1.0, 1.2, 1.2, 'blr', body=False)
    board(p, 'name', 'f', x0 + 0.6, x1 - 2.4, h - 0.4, h + 3.6, 0.6, 'flat:#c8102e', 0.1)
    for x in (x0 + 0.8, x1 - 2.6):
        p.box(STEEL, x - 0.06, h, 0.6, x + 0.06, h + 3.4, 0.72)
    service_back(p, x0, x1, d, 4.2, r)
    plant(p, x0, x1, h, 1.5, d, 11)


def bikepark(p, s, v, r):
    w, d = v['w'], v['d']
    x0, x1 = -w / 2, w / 2
    for i in range(3):
        y = i * 2.7
        p.box(CONC, x0, y + 2.45, 0, x1, y + 2.7, d)
        for z, sgn in ((0.0, -1), (d, 1)):
            for yy in (y + 0.45, y + 0.95):
                p.box(STEEL, x0, yy, min(z, z - sgn * 0.04), x1, yy + 0.04, max(z, z - sgn * 0.04))
        for c in rows(x0 + 0.4, x1 - 0.4, 0.62):
            if i == 0 and abs(c) < 1.4:
                continue
            col = r.choice(['flat:#2b2d30', 'flat:#8f2020', 'flat:#1f3f7a', 'flat:#c9c8c0', 'flat:#3f6b3a'])
            for zz in (1.1, d - 2.6):
                if r.random() < 0.8:
                    p.box(col, c - 0.03, y + 0.35, zz, c + 0.03, y + 0.95, zz + 1.5)
                    p.cyl(DARK, (c, y + 0.33, zz + 0.25), 0, 0.33, 0.04, seg=8)
                    p.cyl(DARK, (c, y + 0.33, zz + 1.3), 0, 0.33, 0.04, seg=8)
        p.box('light', x0 + 1, y + 2.4, d / 2 - 0.06, x1 - 1, y + 2.45, d / 2 + 0.06)
    for c in (x0 + 0.15, 0.0 - 1.6, 1.6, x1 - 0.15):
        for z in (0.15, d - 0.15):
            p.box(STEEL, c - 0.1, 0, z - 0.1, c + 0.1, 8.1, z + 0.1)
    # A ramp up the −x end, a pay machine by the entrance.
    p.prism(CONC, [(0.4, 0), (d - 0.4, 2.7), (d - 0.4, 2.55), (0.4, -0.01)], 'x', x0 + 0.3, x0 + 1.5)
    p.box(VEND, 1.7, 0, 0.3, 2.3, 1.5, 0.7)
    board(p, 'name', 'f', x0 + 2.0, x1 - 0.5, 7.4, 8.3, 0, 'flat:#1f5fae', 0.1)


def entrance(p):
    x0, x1 = -EW / 2, EW / 2
    for x in (x0 + 0.15, 0.0, x1 - 0.15):
        for z in (-0.12, ED + 0.12):
            p.box(STEEL, x - 0.07, 0, z - 0.07, x + 0.07, 2.75, z + 0.07)
    p.box('flat:#5d6a72', x0 - 0.3, 2.75, -0.35, x1 + 0.3, 2.95, ED + 0.35)
    p.box('flat:#dfe3e6', x0 - 0.25, 2.95, -0.3, x1 + 0.25, 3.0, ED + 0.3)
    p.box('light', x0 + 0.6, 2.7, ED / 2 - 0.08, x1 - 0.6, 2.75, ED / 2 + 0.08)
    for z in (-0.12, ED + 0.12):
        quad(p, 'glassTint', 'f', x0 + 0.2, x1 - 0.2, 1.05, 2.75, z)
    # A lit board over each open end (the game letters it: station, exit number).
    for x, tag, n in ((x0 - 0.3, 'sign_n', (-1, 0)), (x1 + 0.3, 'sign_p', (1, 0))):
        p.box('flat:#12233a', min(x, x - n[0] * 0.12), 2.95, -0.3, max(x, x - n[0] * 0.12), 3.75, ED + 0.3)
        mark(tag, x + n[0] * 0.02, 3.35, ED / 2, ED + 0.4, 0.7, n)


def pylon(p):
    p.box('flat:#12233a', -0.6, 0, -0.14, 0.6, 4.2, 0.14)
    p.box(STEEL, -0.64, 0, -0.16, 0.64, 0.25, 0.16)
    p.box('light', -0.6, 4.2, -0.14, 0.6, 4.26, 0.14)
    mark('f', 0, 2.6, -0.16, 1.1, 2.9, (0, -1))
    mark('b', 0, 2.6, 0.16, 1.1, 2.9, (0, 1))


def median(p):
    p.box('flat:#a9a59a', -3, 0, -0.4, 3, 0.2, 0.4)
    p.box(HEDGE, -2.8, 0.2, -0.28, 2.8, 0.85, 0.28)
    for x in (-3 + 0.05, 0, 3 - 0.05):
        p.box(WHITE, x - 0.04, 0.2, -0.36, x + 0.04, 1.1, -0.28)
        p.box(WHITE, x - 0.04, 0.2, 0.28, x + 0.04, 1.1, 0.36)
    for z in (-0.33, 0.31):
        for y in (0.6, 1.04):
            p.box(WHITE, -3, y, z, 3, y + 0.05, z + 0.03)


def busbay(p):
    for x in (-5.4, -1.8, 1.8, 5.4):
        p.box('flat:#5d6a72', x - 0.09, 0, 1.0, x + 0.09, 2.9, 1.18)
    p.box('flat:#dfe3e6', -6, 2.9, -0.4, 6, 3.05, 2.4)
    p.box('flat:#5d6a72', -6, 2.82, -0.4, 6, 2.9, -0.3)
    p.box('light', -5, 2.86, 0.9, 5, 2.9, 1.0)
    quad(p, 'glassTint', 'f', -5.4, 5.4, 0.3, 2.3, 1.2)
    for x in (-3.6, 3.6):
        p.box('flat:#3f6a8a', x - 1.2, 0.42, 0.55, x + 1.2, 0.5, 0.95)
        for dx in (-1.0, 1.0):
            p.box(STEEL, x + dx - 0.03, 0, 0.6, x + dx + 0.03, 0.42, 0.9)
    p.box(STEEL, 0 - 0.04, 0, -0.2, 0.04, 2.5, -0.12)
    p.box('flat:#f4f1e8', -0.35, 1.2, -0.24, 0.35, 2.5, -0.2)
    mark('stop', 0, 1.85, -0.25, 0.66, 1.26, (0, -1))
    mark('stopb', 0, 1.85, -0.11, 0.66, 1.26, (0, 1))


ONE = [
    dict(id='capsule', w=8.0, d=10.0, h=30.0, fn=capsule), dict(id='karaoke', w=10.0, d=10.0, h=34.0, fn=karaoke),
    dict(id='bikepark', w=12.0, d=8.0, h=8.1, fn=bikepark),
]
PARTS = {'entrance': (entrance, EW, ED), 'pylon': (pylon, 1.2, 0.3), 'median': (median, 6.0, 0.8), 'busbay': (busbay, 12.0, 2.4)}


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    if 'fn' in v:
        v['fn'](body, signs, v, random.Random(sum(map(ord, v['id']))))
    else:
        PARTS[v['id']][0](body)
    return body, signs


if __name__ == '__main__':
    variants = [dict(q, gap=3.0) for q in ONE] + [dict(id=k, w=w, d=d, h=3.0, gap=2.0) for k, (_, w, d) in PARTS.items()]
    run('kitacity', variants, build_hi, lambda v: None)
    write_anchors('kitacity')
