# Builds the shop-houses of a shotengai (four variants) plus the arcade that covers the street.
#
#   blender --background --python tools/blender/build_shophouse.py -- [--renders <dir>]
#
# Writes assets/buildings/shophouse.blend and public/models/buildings/shophouse.glb.
# Frame, helpers and root naming: see buildkit.py. References: docs/references.md.
#
# shophouse_arcade is one 6 m bay of arcade roof over a 7 m street in FRONT of the facades
# (z from -7 to 0), with its columns at the bay's -x end so bays tile along x.
# shophouse_gate is the entrance portal, standing across the street at x = 0.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

G0 = 3.1     # ground storey height
FH = 2.7     # upper storey height
R = 0.12
STREET = 7.0
BAY = 6.0
SPRING = 5.2   # where the arcade roof springs from
CROWN = 1.7    # rise of the arcade roof

TILE = 'flat:#3d4347'
SHUT = 'flat:#a9adb0'
SHUT2 = 'flat:#8b9094'
INSIDE = 'flat:#5c4d3c'
WOOD = 'flat:#8a6a48'
PAVE = 'flat:#b9ada0'
PAVE2 = 'flat:#a3927f'
ARC = 'flat:#e8e6df'
ARCBAND = 'flat:#1f5fa8'
GOODS = ['#d9412b', '#e8a13a', '#5fa040', '#f1e6c8', '#7b4ea3', '#d8d8d8']

VARIANTS = [
    # top: 'kanban' (flat false front), 'gable' (tiled roof, eaves to the street), 'eave' (tiled pent roof over the shop).
    # shutter: 'open', 'half' or 'closed'.
    dict(id='a', w=5.4, d=9.0, floors=2, top='kanban', wall='flat:#7d9a8c', trim='flat:#5e7a6d', shutter='open',
         awning='#f4f1e8', seed=2),
    dict(id='b', w=4.5, d=10.0, floors=3, top='gable', wall='flat:#d6cdb8', trim='flat:#a69c86', shutter='half',
         awning='#1f5fa8', seed=4),
    dict(id='c', w=6.3, d=9.0, floors=2, top='eave', wall='flat:#5b4636', trim='flat:#3f3026', shutter='closed',
         awning=None, seed=6),
    dict(id='d', w=5.0, d=9.5, floors=2, top='kanban', wall='flat:#e9e4d6', trim='flat:#b5ae9c', shutter='open',
         awning='#c8102e', seed=9),
    dict(id='e', w=4.2, d=10.0, floors=3, top='kanban', wall='flat:#c9a35f', trim='flat:#9a7a42', shutter='closed',
         awning=None, seed=14),
    dict(id='f', w=5.8, d=9.0, floors=2, top='gable', wall='flat:#efece2', trim='flat:#8a6a48', shutter='open',
         awning='#f2c230', seed=18),
    dict(id='g', w=5.2, d=9.5, floors=2, top='eave', wall='flat:#e3dccb', trim='flat:#4a3a2c', shutter='half',
         awning=None, seed=22),
    dict(id='arcade', w=BAY, kind='arcade', gap=0.0),
    dict(id='gate', w=1.5, kind='gate'),
]


def height(v):
    return G0 + (v['floors'] - 1) * FH


def shopfront(p, s, v, rng):
    x0, x1 = -v['w'] / 2, v['w'] / 2
    a, b = x0 + 0.25, x1 - 0.25
    head = 2.5
    p.box(v['trim'], x0, 0, 0, a, G0, R)
    p.box(v['trim'], b, 0, 0, x1, G0, R)
    p.box(FRAME, a, head, -0.05, b, head + 0.25, R)                 # shutter box
    p.box(INSIDE, a, 0, R - 0.03, b, head, R)
    drop = {'open': head, 'half': 1.3, 'closed': 0.0}[v['shutter']]
    if drop < head:
        p.box(SHUT, a, drop, 0.02, b, head, 0.08)
        y = drop + 0.1
        while y < head:
            p.box(SHUT2, a, y, 0.0, b, y + 0.03, 0.02)
            y += 0.22
    if v['shutter'] != 'closed':                                    # goods out on the street
        x = a + 0.15
        while x + 1.2 < b - 0.9:
            p.box(WOOD, x, 0, -0.85, x + 1.2, 0.6, -0.12)
            for k in range(3):
                p.box('flat:' + rng.choice(GOODS), x + 0.05 + k * 0.38, 0.6, -0.8, x + 0.38 + k * 0.38, 0.78, -0.18)
            x += 1.45
        sign(s, rng.choice(SIGN_COLOURS), b - 0.7, 0, -0.98, b - 0.2, 0.9, -0.92)   # standing board on the pavement
    if v['top'] == 'eave':                                          # tiled pent roof instead of a fascia
        p.prism(TILE, [(R, G0 + 0.55), (-0.95, G0 + 0.1), (-0.95, G0), (R, G0 + 0.4)], 'x', x0, x1)
        sign(s, rng.choice(SIGN_COLOURS), a + 0.4, head + 0.25, -0.06, b - 0.4, G0 - 0.05, R)
    else:
        sign(s, rng.choice(SIGN_COLOURS), x0 + 0.1, head + 0.25, -0.1, x1 - 0.1, G0 + 0.4, R)
    if v['awning']:
        aw = 'flat:' + v['awning']
        p.prism(aw, [(0, head + 0.2), (-1.05, head - 0.2), (-1.05, head - 0.38), (-1.0, head - 0.38), (0, head + 0.05)], 'x', a, b)


def upstairs(p, s, v, rng):
    x0, x1 = -v['w'] / 2, v['w'] / 2
    for i in range(1, v['floors']):
        y = G0 + (i - 1) * FH
        lift = 0.75 if (i == 1 and v['top'] != 'eave') else 0.55    # clear of the fascia
        ww = (v['w'] - 1.3) / 2
        for k in range(2):
            a = x0 + 0.45 + k * (ww + 0.4)
            win(p, a, y + lift + 0.3, a + ww, y + FH - 0.45, R)
            if v['top'] != 'kanban':
                p.box(FRAME, a - 0.05, y + lift + 0.75, R - 0.2, a + ww + 0.05, y + lift + 0.79, R - 0.17)   # rail
                p.box(FRAME, a - 0.05, y + lift + 0.3, R - 0.2, a + ww + 0.05, y + lift + 0.34, R - 0.17)
        if rng.random() < 0.7:
            acu(p, x1 - 1.35, y + 0.05 + (0.45 if i == 1 else 0), R - 0.34)
    if v['floors'] > 2 or rng.random() < 0.5:                       # small projecting sign
        sign(s, rng.choice(SIGN_COLOURS), x0 + 0.05, G0 + 0.6, -0.75, x0 + 0.2, G0 + 2.3, -0.08)


def top(p, v):
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    H = height(v)
    if v['top'] == 'kanban':
        p.box(v['wall'], x0, H, 0, x1, H + 0.9, R + 0.12)
        p.box(v['trim'], x0, H + 0.9, -0.06, x1, H + 1.02, R + 0.18)
        p.box(v['trim'], x0, G0 + 0.4, -0.03, x1, G0 + 0.5, R)
        p.prism(ROOF, [(R + 0.12, H + 0.55), (D, H), (R + 0.12, H)], 'x', x0, x1)
    else:
        rise = D * 0.21
        p.prism(TILE, [(-0.55, H - 0.08), (D / 2, H + rise), (D + 0.3, H - 0.08)], 'x', x0 - 0.04, x1 + 0.04)
        p.box(TILE, x0 - 0.04, H + rise - 0.02, D / 2 - 0.12, x1 + 0.04, H + rise + 0.1, D / 2 + 0.12)   # ridge


def shop_hi(v):
    rng = random.Random(v['seed'])
    p, s = Part(), Part()
    s.body = p
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    H = height(v)
    p.box(v['wall'], x0, 0, R, x1, H, D)
    for i in range(v['floors']):
        y = i * FH + (G0 - FH if i else 0)
        win(p, -0.6, y + 1.0, 0.6, y + 2.1, D, out=1)
    shopfront(p, s, v, rng)
    upstairs(p, s, v, rng)
    top(p, v)
    return p, s


def shop_lo(v):
    rng = random.Random(v['seed'])
    p = Part()
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    H = height(v)
    p.box(v['wall'], x0, 0, 0, x1, H, D)
    p.box(SHUT if v['shutter'] == 'closed' else INSIDE, x0 + 0.25, 0, -0.03, x1 - 0.25, 2.5, 0)
    sign(p, rng.choice(SIGN_COLOURS), x0 + 0.1, 2.75, -0.08, x1 - 0.1, G0 + 0.4, 0, glyphs=False)
    for i in range(1, v['floors']):
        y = G0 + (i - 1) * FH
        p.box(WINDOW, x0 + 0.45, y + 1.0, -0.03, x1 - 0.45, y + FH - 0.45, 0)
    if v['top'] == 'kanban':
        p.box(v['wall'], x0, H, 0, x1, H + 0.9, 0.3)
    else:
        p.prism(TILE, [(-0.55, H - 0.08), (D / 2, H + D * 0.21), (D + 0.3, H - 0.08)], 'x', x0, x1)
    return p


def arc(z0, z1, y0, rise, n=14):
    return [((z0 + z1) / 2 - (z1 - z0) / 2 * math.cos(math.pi * k / n), y0 + rise * math.sin(math.pi * k / n)) for k in range(n + 1)]


def arcade_lo(v):
    p = Part()
    x0, x1 = -BAY / 2, BAY / 2
    zn, zf = -0.3, -STREET + 0.3
    for z in (zn, zf):
        p.box(ARC, x0 - 0.1, 0, z - 0.1, x0 + 0.1, SPRING, z + 0.1)
        p.box(ARCBAND, x0, SPRING - 1.1, z - 0.04, x1, SPRING, z + 0.04)
    p.prism('glassTint', arc(zf, zn, SPRING, CROWN, n=5) + arc(zf, zn, SPRING, CROWN - 0.06, n=5)[::-1], 'x', x0, x1, caps=False)
    return p


def arcade(v):
    p, s = Part(), Part()
    s.body = p
    x0, x1 = -BAY / 2, BAY / 2
    zn, zf = -0.3, -STREET + 0.3
    p.box(PAVE, x0, 0, -STREET, x1, 0.02, 0)
    p.box(PAVE2, x0, 0.02, -STREET / 2 - 0.5, x1, 0.025, -STREET / 2 + 0.5)      # centre strip
    for z in (zn, zf):
        p.box(ARC, x0 - 0.1, 0, z - 0.1, x0 + 0.1, SPRING, z + 0.1)
        p.box(ARC, x0, SPRING - 0.3, z - 0.12, x1, SPRING, z + 0.12)            # eaves beam
        p.box(ARCBAND, x0, SPRING - 1.1, z - 0.04, x1, SPRING - 0.3, z + 0.04)   # coloured band over the shop signs
    outer = arc(zf, zn, SPRING, CROWN)
    inner = arc(zf, zn, SPRING, CROWN - 0.06)
    p.prism('glassTint', outer + inner[::-1], 'x', x0, x1, caps=False)
    rib = arc(zf, zn, SPRING - 0.02, CROWN - 0.08) + arc(zf + 0.25, zn - 0.25, SPRING - 0.02, CROWN - 0.4)[::-1]
    for x in (x0, 0.0):
        p.prism(ARC, rib, 'x', x - 0.05, x + 0.05)
    zc = -STREET / 2
    p.box(ARC, x0, SPRING + CROWN - 0.5, zc - 0.05, x1, SPRING + CROWN - 0.4, zc + 0.05)   # lighting track
    for x in (x0 + 1.5, x1 - 1.5):
        p.cyl(STEEL, (x, SPRING + CROWN - 1.0, zc), 1, 0.015, 1.0, seg=5, caps=False)
        p.cyl('light', (x, SPRING + CROWN - 1.6, zc), 1, 0.22, 0.3, seg=10)
    for x, z in ((0.0, zn - 1.0), (0.0, zf + 1.0)):                             # hanging banners
        p.box(STEEL, x - 0.02, SPRING - 0.25, z - 0.5, x + 0.02, SPRING - 0.2, z + 0.5)
        sign(s, SIGN_COLOURS[1 if z > zc else 5], x - 0.02, SPRING - 1.9, z - 0.4, x + 0.02, SPRING - 0.3, z + 0.4)
    return p, s


def gate(v):
    p, s = Part(), Part()
    s.body = p
    zn, zf = -0.45, -STREET + 0.45
    for z in (zn, zf):
        p.box(ARC, -0.22, 0, z - 0.22, 0.22, SPRING + 1.9, z + 0.22)
        p.box(ARCBAND, -0.26, 0, z - 0.26, 0.26, 0.9, z + 0.26)
        p.cyl('light', (0, SPRING + 2.15, z), 1, 0.25, 0.45, seg=10)
    p.prism(ARC, arc(zf, zn, SPRING + 1.7, 1.1) + [(zn, SPRING + 1.5), (zf, SPRING + 1.5)], 'x', -0.14, 0.14)
    sign(s, '#c8102e', -0.18, SPRING + 0.2, zf + 0.25, 0.18, SPRING + 1.5, zn - 0.25)
    p.box(ARC, -0.2, SPRING + 0.05, zf, 0.2, SPRING + 0.2, zn)
    return p, s


def build_hi(v):
    return {'arcade': arcade, 'gate': gate}.get(v.get('kind'), shop_hi)(v)


def build_lo(v):
    return {'arcade': arcade_lo, 'gate': lambda _: None}.get(v.get('kind'), shop_lo)(v)


run('shophouse', VARIANTS, build_hi, build_lo)
