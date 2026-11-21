# Builds the office mid-rises: the plain 8 to 12 floor blocks of a business street (three variants).
#
#   blender --background --python tools/blender/build_office.py -- [--renders <dir>]
#
# Writes assets/buildings/office.blend and public/models/buildings/office.glb.
# Frame, helpers and root naming: see buildkit.py. References: docs/references.md.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

G0 = 4.8     # ground storey height
FH = 3.8     # upper storey height
R = 0.3
PARAPET = 1.0

CURTAIN = 'flat:#3f5566'
LOBBY = 'flat:#6f7f82'
LOUVRE = 'flat:#9a9fa3'

VARIANTS = [
    # style: 'ribbon' (tile bands, 1970s-80s), 'curtain' (glass wall, 2000s), 'punched' (precast grid, 1960s).
    # corner: the -x side is a second street face. 'g' is listed first and 'h' set apart so the preview shows that side.
    dict(id='g', w=15.0, d=17.0, floors=10, style='ribbon', wall='flat:#c7c1b4', trim='flat:#9c968a', base='flat:#55524e',
         corner=True, shop='#c8102e', seed=27),
    dict(id='a', w=16.0, d=18.0, floors=9, style='ribbon', wall='flat:#b08d6e', trim='flat:#8c6f55', base='flat:#5f5a54',
         shop='#1d8a4e', seed=3),
    dict(id='b', w=20.0, d=20.0, floors=12, style='curtain', wall='flat:#2c3d4a', trim='flat:#c9cdd1', base='flat:#77736c',
         shop=None, seed=5),
    dict(id='c', w=13.0, d=16.0, floors=8, style='punched', wall='flat:#e2e0d8', trim='flat:#bcb9ae', base='flat:#8a857c',
         shop='#1f5fa8', seed=8),
    dict(id='d', w=18.0, d=18.0, floors=10, style='curtain', wall='flat:#4a3f33', trim='flat:#8a7a66', base='flat:#4d4944',
         glass='flat:#6b5a45', shop='#e86a1c', seed=12),
    dict(id='e', w=24.0, d=20.0, floors=11, style='ribbon', wall='flat:#e6e4de', trim='flat:#c4c6c6', base='flat:#6d7175',
         shop=None, seed=15),
    dict(id='f', w=17.0, d=16.0, floors=7, style='punched', wall='flat:#8e4f3c', trim='flat:#6f3d2e', base='flat:#cfc8b8',
         shop='#f2c230', seed=21),
    dict(id='h', w=18.0, d=18.0, floors=13, style='curtain', wall='flat:#34495a', trim='flat:#d5d9dc', base='flat:#807b73',
         glass='flat:#4d6a7d', corner=True, shop=None, seed=33, pre=12.0),
]


def levels(v):
    return [G0 + i * FH for i in range(v['floors'])]


def upper(p, v):
    x0, x1 = -v['w'] / 2, v['w'] / 2
    ys = levels(v)
    H = ys[-1]
    wall, trim, style = v['wall'], v['trim'], v['style']
    if style == 'curtain':
        p.box(v.get('glass', CURTAIN), x0, G0 - 0.5, R - 0.05, x1, H + PARAPET, R)
        for y in ys:
            p.box(wall, x0, y - 0.55, R - 0.09, x1, y + 0.4, R)          # spandrel glass
            p.box(trim, x0, y + 0.4, R - 0.12, x1, y + 0.46, R)
        n = round(v['w'] / 1.25)
        for k in range(n + 1):
            x = x0 + v['w'] * k / n
            p.box(trim, max(x0, x - 0.04), G0 - 0.5, 0.08, min(x1, x + 0.04), H + PARAPET, R)
        p.box(trim, x0, H + PARAPET - 0.25, 0, x1, H + PARAPET, R)
        return
    pier = 0.6
    a, b = x0 + pier, x1 - pier
    p.box(trim, x0, G0 - 0.5, 0, a, H + PARAPET, R)
    p.box(trim, b, G0 - 0.5, 0, x1, H + PARAPET, R)
    bay = 1.6 if style == 'ribbon' else 2.2
    n = max(2, round((b - a) / bay))
    for i, y in enumerate(ys):
        last = i == len(ys) - 1
        p.box(wall, a, y - 0.5, 0, b, y + PARAPET if last else y + 0.9, R)
        if last:
            p.box(trim, x0, y + PARAPET - 0.12, -0.08, x1, y + PARAPET, R)   # coping
            break
        w0, w1 = y + 0.9, y + FH - 0.5
        p.box(WINDOW, a, w0, R - 0.05, b, w1, R)
        p.box(trim, a, w0 - 0.06, -0.05, b, w0, R)
        for k in range(1, n):
            x = a + (b - a) * k / n
            if style == 'ribbon':
                p.box(FRAME, x - 0.03, w0, R - 0.14, x + 0.03, w1, R)
            else:
                p.box(wall, x - 0.4, w0, 0, x + 0.4, w1, R)


def ground(p, s, v, rng):
    x0, x1 = -v['w'] / 2, v['w'] / 2
    base = v['base']
    top = G0 - 0.5
    n = max(3, round(v['w'] / 4.2))
    ent = n // 2                                   # entrance bay
    xs = [x0 + v['w'] * k / n for k in range(n + 1)]
    p.box(LOBBY, x0, 0, R - 0.05, x1, top, R)
    p.box(base, x0, top - 0.7, 0, x1, top, R)      # band over the shopfronts
    p.box(base, x0, 0, R - 0.1, x1, 0.3, R)
    for k, x in enumerate(xs):
        c0, c1 = max(x0, x - 0.4), min(x1, x + 0.4)
        p.box(base, c0, 0, -0.05, c1, top, R)
    for k in range(n):
        a, b = xs[k] + 0.4, xs[k + 1] - 0.4
        if k == ent:
            m = (a + b) / 2
            p.box(v['trim'], a - 0.5, 3.1, -1.9, b + 0.5, 3.3, R)             # canopy
            p.box(FRAME, a, 0, R - 0.12, b, 3.0, R - 0.05)
            p.box(LOBBY, a + 0.1, 0.05, R - 0.14, m - 0.04, 2.9, R - 0.12)
            p.box(LOBBY, m + 0.04, 0.05, R - 0.14, b - 0.1, 2.9, R - 0.12)
            sign(s, '#26282c', xs[k] - 0.3, 1.3, -0.09, xs[k] + 0.3, 1.9, -0.05)   # name plate on the column
        else:
            for t in (1 / 3, 2 / 3):
                x = a + (b - a) * t
                p.box(FRAME, x - 0.03, 0.3, R - 0.12, x + 0.03, top - 0.7, R)
    if v['shop']:                                  # one ground-floor tenant with a fascia
        k = 0 if ent != 0 else n - 1
        sign(s, v['shop'], xs[k] + 0.4, top - 0.65, -0.1, xs[k + 1] - 0.4, top - 0.05, 0)
        sign(s, v['shop'], x0 + 0.05, G0 + 0.6, -1.0, x0 + 0.3, G0 + 0.6 + 2 * FH, -0.1)   # projecting sign


def rest(p, s, v, rng):
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    ys = levels(v)
    H = ys[-1]
    wall = v['wall'] if v['style'] != 'curtain' else v['trim']
    p.box(wall, x0, 0, R, x1, H, D)
    for y in ys[:-1]:                              # side and back windows, flat
        if not v.get('corner'):
            p.box(WINDOW, x0 - 0.02, y + 0.9, 2.0, x0, y + FH - 0.5, D - 2.0)
        for k in range(4):
            xc = x0 + v['w'] * (k + 0.5) / 4
            p.box(WINDOW, xc - 1.0, y + 0.9, D, xc + 1.0, y + FH - 0.7, D + 0.02)
        p.box(WINDOW, x1, y + 1.0, D * 0.3, x1 + 0.02, y + 2.4, D * 0.3 + 1.2)
    # Roof.
    p.box(ROOF, x0 + 0.25, H, R, x1 - 0.25, H + 0.03, D - 0.25)
    for a, b, c, d in ((x0, R, x0 + 0.25, D), (x1 - 0.25, R, x1, D), (x0, D - 0.25, x1, D)):
        p.box(wall, a, H, b, c, H + PARAPET, d)
    mx0, mx1, mz0, mz1 = x0 + v['w'] * 0.3, x1 - 1.2, D * 0.45, D - 1.5
    p.box(LOUVRE, mx0, H, mz0, mx1, H + 3.6, mz1)                              # plant room
    for k in range(1, 8):
        p.box(KICK, mx0 + 0.3, H + 0.4 * k, mz0 - 0.02, mx1 - 0.3, H + 0.4 * k + 0.08, mz0)
    p.box(ROOF, mx0 - 0.1, H + 3.6, mz0 - 0.1, mx1 + 0.1, H + 3.72, mz1 + 0.1)
    for k in range(2):                                                         # cooling towers
        cx = mx0 + 1.6 + k * 2.8
        p.cyl(TANK, (cx, H + 3.72 + 0.8, (mz0 + mz1) / 2), 1, 1.1, 1.6, seg=14, capmat=DARK)
    tank(p, x0 + 1.9, H, D - 2.4)
    for k in range(rng.randint(4, 6)):
        acu(p, x0 + 0.7 + k * 1.05, H + 0.1, D * 0.25)
    p.cyl(STEEL, (mx1 - 0.6, H + 3.72 + 2.5, mz1 - 0.6), 1, 0.035, 5.0, seg=6)
    if v['style'] == 'curtain':
        sign(s, '#f4f1e8', mx0 + 0.6, H + 1.6, mz0 - 0.12, mx0 + 4.6, H + 3.0, mz0 - 0.03)


def build_hi(v):
    rng = random.Random(v['seed'])
    p, s = Part(), Part()
    s.body = p
    rest(p, s, v, rng)
    upper(p, v)
    ground(p, s, v, rng)
    if v.get('corner'):   # a second street face on the -x side, standing R outside the plot width
        v2 = dict(v, w=v['d'], shop=None)
        for q in (p, s):
            q.turned(-v['w'] / 2 - R, v['d'])
        upper(p, v2)
        ground(p, s, v2, rng)
        for q in (p, s):
            q.turned(None, 0)
    backs(p, v['w'], v['d'], levels(v), rng, sides=(1,) if v.get('corner') else (-1, 1), fire=True, signs=s)
    return p, s


def build_lo(v):
    p = Part()
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    ys = levels(v)
    H = ys[-1]
    curtain = v['style'] == 'curtain'
    p.box(v['trim'] if curtain else v['wall'], x0, 0, 0, x1, H + PARAPET, D)
    m = 0 if curtain else 0.6
    for y in ys[:-1]:
        p.box(v.get('glass', CURTAIN) if curtain else WINDOW, x0 + m, y + (0.4 if curtain else 0.9), -0.03, x1 - m, y + FH - 0.5, 0)
        if curtain:
            p.box(v['wall'], x0, y - 0.55, -0.03, x1, y + 0.4, 0)
        p.box(WINDOW_LIT, x0 - 0.03, y + 0.9, 2.0, x0, y + FH - 0.5, D - 2.0)
    p.box(LOBBY, x0 + 0.4, 0.3, -0.03, x1 - 0.4, G0 - 1.2, 0)
    p.box(v['base'], x0, G0 - 1.2, -0.04, x1, G0 - 0.5, 0)
    if v['shop']:
        sign(p, v['shop'], x0 + 0.05, G0 + 0.6, -1.0, x0 + 0.3, G0 + 0.6 + 2 * FH, -0.1, glyphs=False)
    p.box(LOUVRE, x0 + v['w'] * 0.3, H + PARAPET, D * 0.45, x1 - 1.2, H + 3.7, D - 1.5)
    tank(p, x0 + 1.6, H + PARAPET, D - 2.4)
    p.box(ACU, x0 + 0.6, H + PARAPET, D * 0.35, x0 + 1.5, H + PARAPET + 0.7, D * 0.35 + 0.35)
    return p


run('office', VARIANTS, build_hi, build_lo)
