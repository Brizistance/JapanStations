# Builds the glass towers: 130 to 185 m office skyscrapers on a podium (three variants).
#
#   blender --background --python tools/blender/build_tower.py -- [--renders <dir>]
#
# Writes assets/buildings/tower.blend and public/models/buildings/tower.glb.
# Frame, helpers and root naming: see buildkit.py. References: docs/references.md.
# Towers are seen from every side, so all four faces carry the same detail.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

LOUVRE = 'flat:#8f969b'
LOBBY = 'flat:#7d9098'
PAD = 'flat:#3d6b52'
RED = 'flat:#d0201a'

VARIANTS = [
    # crown: 'screen' (glass screen wall and helipad), 'setback' (smaller top block), 'mast' (shallow setback and aerial mast).
    # ch: corner chamfer of the shaft. bay / fin: spacing and depth of the vertical mullions.
    dict(id='a', w=46.0, d=46.0, podium=16.0, inset=5.0, ch=0.0, floors=32, fh=4.2, crown='screen', bay=3.0, fin=0.12,
         glass='flat:#4f7184', band='flat:#3b5868', trim='flat:#c3c9ce', stone='flat:#8d8880', gap=14.0),
    dict(id='b', w=54.0, d=36.0, podium=20.0, inset=4.0, ch=0.0, floors=26, fh=4.2, crown='setback', bay=1.8, fin=0.45,
         glass='flat:#55776f', band='flat:#3f5a54', trim='flat:#e4e7ea', stone='flat:#b9b4a8', gap=14.0),
    dict(id='c', w=40.0, d=40.0, podium=12.0, inset=4.0, ch=6.0, floors=42, fh=4.1, crown='mast', bay=3.0, fin=0.15,
         glass='flat:#2f4560', band='flat:#24364c', trim='flat:#8fa3b5', stone='flat:#5d5a57', gap=14.0),
    # round: segments per corner, turning the chamfer into a rounded corner. 'blade' crown: two fin walls above the roof.
    dict(id='d', w=44.0, d=44.0, podium=14.0, inset=4.0, ch=9.0, round=5, floors=36, fh=4.2, crown='screen', bay=1.5, fin=0.3,
         glass='flat:#7f9aa6', band='flat:#647f8b', trim='flat:#dfe3e6', stone='flat:#a39d92', gap=14.0),
    dict(id='e', w=60.0, d=30.0, podium=18.0, inset=5.0, ch=0.0, floors=30, fh=4.2, crown='blade', bay=3.0, fin=0.12,
         glass='flat:#6a5843', band='flat:#4f4132', trim='flat:#b89f7c', stone='flat:#3f3b37', gap=14.0),
]


def rect(x0, z0, x1, z1, ch=0.0, seg=1):
    if ch <= 0:
        return [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
    if seg > 1:
        pts = []
        for cx, cz, a0 in ((x1 - ch, z0 + ch, -90), (x1 - ch, z1 - ch, 0), (x0 + ch, z1 - ch, 90), (x0 + ch, z0 + ch, 180)):
            for k in range(seg + 1):
                a = math.radians(a0 + 90 * k / seg)
                pts.append((cx + ch * math.cos(a), cz + ch * math.sin(a)))
        return pts
    return [(x0 + ch, z0), (x1 - ch, z0), (x1, z0 + ch), (x1, z1 - ch), (x1 - ch, z1), (x0 + ch, z1), (x0, z1 - ch), (x0, z0 + ch)]


def centre(pts):
    return sum(q[0] for q in pts) / len(pts), sum(q[1] for q in pts) / len(pts)


def grow(pts, m):
    """Push a footprint outwards by m on every side (negative shrinks it)."""
    cx, cz = centre(pts)
    return [(x + (m if x > cx else -m), z + (m if z > cz else -m)) for x, z in pts]


def extrude(p, mat, pts, y0, y1, top=True, inward=False):
    cx, cz = centre(pts)
    k = -1 if inward else 1
    for i, a in enumerate(pts):
        b = pts[(i + 1) % len(pts)]
        hint = (k * ((a[0] + b[0]) / 2 - cx), 0, k * ((a[1] + b[1]) / 2 - cz))
        p.face(mat, [(a[0], y0, a[1]), (b[0], y0, b[1]), (b[0], y1, b[1]), (a[0], y1, a[1])], hint)
    if top:
        p.face(mat, [(x, y1, z) for x, z in pts], (0, 1, 0))


def fins(p, mat, pts, y0, y1, bay, depth):
    """Vertical mullions along the straight faces of a footprint."""
    cx, cz = centre(pts)
    for i, a in enumerate(pts):
        b = pts[(i + 1) % len(pts)]
        dx, dz = b[0] - a[0], b[1] - a[1]
        if abs(dx) > 1e-6 and abs(dz) > 1e-6:
            continue                                # glass corners stay clean
        L = abs(dx) + abs(dz)
        n = max(1, round(L / bay))
        ox = 0 if abs(dx) > 0 else (depth / 2 if a[0] > cx else -depth / 2)
        oz = 0 if abs(dz) > 0 else (depth / 2 if a[1] > cz else -depth / 2)
        hx, hz = (0.05, depth / 2) if abs(dx) > 0 else (depth / 2, 0.05)
        for k in range(n + 1):
            x, z = a[0] + dx * k / n + ox, a[1] + dz * k / n + oz
            p.box(mat, x - hx, y0, z - hz, x + hx, y1, z + hz)


def panel(p, mat, side, u0, u1, y0, y1, v, t=0.06):
    """A flat panel on one podium face. u runs along x on the front and back, along z on the sides."""
    x0, x1, D = -v['w'] / 2, v['w'] / 2, v['d']
    if side == 'f':
        p.box(mat, u0, y0, -t, u1, y1, 0)
    elif side == 'b':
        p.box(mat, u0, y0, D, u1, y1, D + t)
    elif side == 'l':
        p.box(mat, x0 - t, y0, u0, x0, y1, u1)
    else:
        p.box(mat, x1, y0, u0, x1 + t, y1, u1)


def podium(p, s, v):
    x0, x1, D, PH = -v['w'] / 2, v['w'] / 2, v['d'], v['podium']
    extrude(p, v['stone'], rect(x0, 0, x1, D), 0, PH)
    p.box(v['trim'], x0 - 0.15, PH - 0.5, -0.15, x1 + 0.15, PH, D + 0.15)
    for side, (u0, u1) in (('f', (x0, x1)), ('b', (x0, x1)), ('l', (0, D)), ('r', (0, D))):
        n = max(3, round((u1 - u0) / 6.0))
        bay = (u1 - u0) / n
        for k in range(n):
            a, b = u0 + k * bay + 0.6, u0 + (k + 1) * bay - 0.6
            panel(p, LOBBY, side, a, b, 0.4, 5.2, v)
            y = 6.6
            while y + 3.2 < PH - 0.8:
                panel(p, WINDOW, side, a, b, y, y + 3.2, v)
                y += 4.6
    # Main entrance, tower name and two ground-floor tenants on the street side.
    p.box(v['trim'], -7.0, 5.5, -4.5, 7.0, 5.8, 0)
    for x in (-6.5, 6.1):
        p.box(v['trim'], x, 0, -4.2, x + 0.4, 5.5, -3.8)
    p.box(FRAME, -2.6, 0, -0.12, 2.6, 3.2, -0.06)
    for x in (-2.5, 0.05):
        p.box(LOBBY, x, 0.05, -0.14, x + 2.45, 3.1, -0.12)
    sign(s, '#26282c', -5.5, PH - 3.0, -0.14, 5.5, PH - 1.4, -0.06)
    for k, col in ((0, '#1d8a4e'), (-1, '#e86a1c')):
        n = max(3, round(v['w'] / 6.0))
        a = x0 + (k % n) * v['w'] / n + 0.6
        sign(s, col, a, 4.3, -0.16, a + v['w'] / n - 1.2, 5.2, -0.06)
    for a, b in ((x0 + 1.0, x0 + v['inset'] - 1.0), (x1 - v['inset'] + 1.0, x1 - 1.0)):   # roof planting
        if b - a > 1.0:
            p.box(HEDGE, a, PH, 3.0, b, PH + 0.9, D - 3.0)


def shaft_of(v):
    x0, x1, D, i = -v['w'] / 2, v['w'] / 2, v['d'], v['inset']
    return rect(x0 + i, 2.0, x1 - i, D - i, v['ch'], v.get('round', 1))


def lit_strips(p, v, pts, y0, floors):
    """Stretches of glass on some floors that the game may light at night (the same glass colour by day)."""
    cx, cz = centre(pts)
    for i in range(floors):
        y = y0 + i * v['fh']
        for k, a in enumerate(pts):
            b = pts[(k + 1) % len(pts)]
            dx, dz = b[0] - a[0], b[1] - a[1]
            if (abs(dx) > 1e-6 and abs(dz) > 1e-6) or p.lit.random() > 0.3:
                continue
            t0 = p.lit.uniform(0.0, 0.6)
            t1 = t0 + p.lit.uniform(0.2, 0.4)
            ox = 0.0 if abs(dx) > 1e-6 else math.copysign(0.03, a[0] - cx)
            oz = 0.0 if abs(dz) > 1e-6 else math.copysign(0.03, a[1] - cz)
            q0 = (a[0] + dx * t0 + ox, a[1] + dz * t0 + oz)
            q1 = (a[0] + dx * t1 + ox, a[1] + dz * t1 + oz)
            ya, yb = y + 0.55, y + v['fh'] - 0.65
            p.face(WINDOW_LIT, [(q0[0], ya, q0[1]), (q1[0], ya, q1[1]), (q1[0], yb, q1[1]), (q0[0], yb, q0[1])], (ox, 0, oz), col=v['glass'])


def block(p, v, pts, y0, floors, detail):
    """A run of glass floors with spandrel bands and mullions. Returns the top level."""
    fh = v['fh']
    y1 = y0 + floors * fh
    extrude(p, v['glass'], pts, y0, y1)
    lit_strips(p, v, pts, y0, floors)
    if detail:
        for i in range(floors + 1):
            y = y0 + i * fh
            extrude(p, v['band'], grow(pts, 0.06), max(y0, y - 0.6), min(y1, y + 0.5), top=False)
        fins(p, v['trim'], pts, y0, y1, v['bay'], v['fin'])
    else:
        for i in range(0, floors + 1, 4):
            y = y0 + i * fh
            extrude(p, v['band'], grow(pts, 0.06), max(y0, y - 0.6), min(y1, y + 0.5), top=False)
    return y1


def helipad(p, pts, y):
    cx, cz = centre(pts)
    r = min(max(q[0] for q in pts) - cx, max(q[1] for q in pts) - cz) * 0.55
    p.box(LOUVRE, cx - r * 0.5, y, cz - r * 0.5, cx + r * 0.5, y + 3.0, cz + r * 0.5)
    p.cyl(ROOF, (cx, y + 3.2, cz), 1, r, 0.4, seg=24, capmat=PAD)


def lights(p, pts, y):
    for x, z in pts:
        p.box(BEACON, x - 0.4, y, z - 0.4, x + 0.4, y + 0.7, z + 0.4, col=RED)


def crown(p, v, pts, H, detail):
    cx, cz = centre(pts)
    if v['crown'] == 'screen':
        extrude(p, v['glass'], pts, H, H + 7.0, top=False)
        extrude(p, v['band'], grow(pts, -0.5), H, H + 7.0, top=False, inward=True)
        extrude(p, v['trim'], grow(pts, 0.08), H + 6.5, H + 7.0, top=False)
        if detail:
            fins(p, v['trim'], pts, H, H + 7.0, v['bay'], v['fin'])
        helipad(p, pts, H)
        lights(p, grow(pts, -0.6), H + 7.0)
    elif v['crown'] == 'blade':
        xa, xb = min(q[0] for q in pts), max(q[0] for q in pts)
        za, zb = min(q[1] for q in pts), max(q[1] for q in pts)
        extrude(p, v['trim'], grow(pts, 0.1), H, H + 1.2)
        for z in (za, zb - 0.8):
            p.box(v['glass'], xa, H + 1.2, z, xb, H + 12.0, z + 0.8)
            p.box(v['trim'], xa - 0.1, H + 11.5, z - 0.1, xb + 0.1, H + 12.0, z + 0.9)
        helipad(p, pts, H + 1.2)
        lights(p, [(xa + 0.5, za + 0.4), (xb - 0.5, za + 0.4), (xb - 0.5, zb - 0.4), (xa + 0.5, zb - 0.4)], H + 12.0)
    elif v['crown'] == 'setback':
        top = grow(pts, -5.0)
        extrude(p, v['trim'], grow(pts, 0.1), H, H + 1.2, top=True)
        y = block(p, v, top, H + 1.2, 5, detail)
        extrude(p, v['trim'], grow(top, 0.1), y, y + 1.0)
        helipad(p, top, y + 1.0)
        lights(p, grow(top, -0.5), y + 1.0)
    else:                                           # 'mast': one shallow setback, a plant box and an aerial mast
        top = grow(pts, -3.0)
        extrude(p, v['trim'], grow(pts, 0.1), H, H + 1.0)
        y = block(p, v, top, H + 1.0, 2, detail)
        extrude(p, LOUVRE, grow(top, -3.0), y, y + 4.0)
        p.cyl(STEEL, (cx, y + 4.0 + 9.0, cz), 1, 0.35, 18.0, seg=8)
        p.box(BEACON, cx - 0.4, y + 22.0, cz - 0.4, cx + 0.4, y + 22.8, cz + 0.4, col=RED)
        lights(p, grow(top, -0.5), y)


def tower(p, v, detail):
    pts = shaft_of(v)
    PH = v['podium']
    mech = v['floors'] // 2
    y = block(p, v, pts, PH, mech, detail)
    extrude(p, LOUVRE, grow(pts, 0.1), y, y + v['fh'])                # plant floor
    H = block(p, v, pts, y + v['fh'], v['floors'] - mech - 1, detail)
    crown(p, v, pts, H, detail)


def build_hi(v):
    p, s = Part(), Part()
    s.body = p
    podium(p, s, v)
    tower(p, v, True)
    return p, s


def build_lo(v):
    p = Part()
    x0, x1, D, PH = -v['w'] / 2, v['w'] / 2, v['d'], v['podium']
    extrude(p, v['stone'], rect(x0, 0, x1, D), 0, PH)
    for side, (u0, u1) in (('f', (x0, x1)), ('b', (x0, x1)), ('l', (0, D)), ('r', (0, D))):
        panel(p, LOBBY, side, u0 + 0.6, u1 - 0.6, 0.4, 5.2, v)
    tower(p, v, False)
    return p


run('tower', VARIANTS, build_hi, build_lo)
