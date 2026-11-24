# Builds the fronts of Kawaminato Station's north side: the four big blocks that face the brick
# station across its square (on Ekimae-dōri), and the four narrower ones down Tokei-suji. All of
# the 1910s–30s, kept to the old 31 m height line: a stone base of two storeys with tall openings,
# a shaft of window bays between piers, a cornice, an attic. Some carry a giant order, a mansard
# roof, a tower; one is a white-tiled block of the 1930s with ribbon windows.
#
#   blender --background --python tools/blender/build_tokei.py -- [--renders <dir>]
#
# Writes assets/buildings/tokei.blend, public/models/buildings/tokei.glb and
# src/stations/anchors/tokei.ts (sizes, and where the game puts each name).
# Frame and helpers: buildkit.py, kitakit.py. Nothing here carries a name.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

SLATE = 'flat:#414852'
COPPER = 'flat:#6f9a8c'
BRICK_R = 'flat:#8f4636'
CREAM = 'flat:#e9e2d0'
BH = 8.0   # the base's height: two storeys


def prewar(p, s, v, r):
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall, trim = v['wall'], v['trim']
    base = v.get('base', trim)
    n = max(3, round(w / v.get('bay', 4.7)))
    if n % 2 == 0:
        n += 1
    bw = w / n
    att = v.get('attic', 3.4)
    top = h - att - 0.8   # the cornice's underside

    # The base: stone on a granite plinth, a tall opening in every bay, the door in the middle one.
    p.box(base, x0, 0, 0, x1, BH, d)
    p.box(GRANITE, x0 - 0.06, 0, -0.06, x1 + 0.06, 0.9, d + 0.06)
    hw = bw / 2 - 0.8
    for k in range(n):
        c = x0 + (k + 0.5) * bw
        if k == n // 2:
            doors(p, c, 0, 0, min(2.8, 2 * hw), 3.2, BRASS)
            p.box(BRONZE, c - hw - 0.5, 3.4, -1.8, c + hw + 0.5, 3.58, 0)
            p.box('light', c - hw, 3.36, -1.5, c + hw, 3.4, -0.3)
            quad(p, 'windowDim', 'f', c - hw, c + hw, 3.9, 6.5, -0.03, col=SHOP)
        else:
            quad(p, 'windowDim', 'f', c - hw, c + hw, 1.2, 6.5, -0.03, col=SHOP)
            p.box(BRONZE, c - hw, 3.9, -0.07, c + hw, 4.02, 0)
        p.box(BRONZE, c - 0.04, 3.9 if k == n // 2 else 1.2, -0.07, c + 0.04, 6.5, 0)
        if v.get('arched'):   # a round head over the opening: a skin of wall hides the pane's corners
            arch(p, base, 'f', c - hw - 0.02, c + hw + 0.02, 5.3, 6.55, 6.6, -0.05, 0.05, inner=False)
            p.box(trim, c - 0.3, 6.5, -0.22, c + 0.3, 7.1, 0)
    for y in (2.0, 3.3, 4.6):   # rustication: shadow joints between the bays
        for k in range(n + 1):
            c = min(x1 - 0.55, max(x0 + 0.55, x0 + k * bw))
            p.box(GRANITE, c - 0.55, y, -0.04, c + 0.55, y + 0.06, 0)
    grid(p, x0, x1, 0, d, 0.3, BH, base, 3.8, bw, 1.6, 2.0, 1.2, which='lr', frame=trim, body=False)
    band(p, trim, x0, x1, 0, d, BH - 0.45, BH, 0.3)
    board(p, 'name', 'f', -min(6.0, w / 2 - 2), min(6.0, w / 2 - 2), BH - 1.45, BH - 0.6, 0, 'flat:#2a2622', 0.05)
    service_back(p, x0, x1, d, BH, r)

    # The shaft: window bays between piers (or a giant order), or ribbon windows on the modern one.
    if v.get('modern'):
        ribbon(p, x0, x1, 0, d, BH, top, wall, 3.7, 1.9, 1.0, bw)
        bands(p, trim, x0, x1, 0, d, [BH + 3.7 * i + 0.55 for i in range(1, int((top - BH) / 3.7))], 0.12, 0.1)
    else:
        grid(p, x0, x1, 0, d, BH, top, wall, 3.7, bw / 2, 1.25, 2.3, 0.9, frame=trim)
        if v.get('order'):
            for k in range(n + 1):
                c = min(x1 - 0.5, max(x0 + 0.5, x0 + k * bw))
                p.cyl(trim, (c, (BH + top) / 2 - 0.05, -0.1), 1, 0.42, top - BH - 1.1, seg=10)
                p.box(trim, c - 0.55, BH, -0.65, c + 0.55, BH + 0.5, 0)
                p.box(trim, c - 0.6, top - 0.6, -0.7, c + 0.6, top, 0)
        else:
            piers(p, trim, 'f', x0, x1, 0, BH, top, bw, 0.7, 0.3)
            for face, a0, a1, at in sides(x0, x1, 0, d, 'lr'):
                for c in (a0 + 0.4, a1 - 0.4):
                    slab(p, trim, face, c - 0.4, c + 0.4, BH, top, at, 0.2)

    # Cornice and attic.
    band(p, trim, x0, x1, 0, d, top, top + 0.45, 0.45)
    band(p, trim, x0, x1, 0, d, top + 0.45, top + 0.8, 0.8)
    grid(p, x0, x1, 0, d, top + 0.8, h, wall, att, bw / 2, 1.1, 1.3, 0.9, frame=trim)
    band(p, trim, x0, x1, 0, d, h - 0.3, h, 0.25)

    # The roof.
    if v.get('mansard'):
        m = 1.6
        p.box(SLATE, x0 + 0.5, h, 0.5, x1 - 0.5, h + 2.2, d - 0.5)
        p.box(SLATE, x0 + 0.5 + m, h + 2.2, 0.5 + m, x1 - 0.5 - m, h + 3.6, d - 0.5 - m)
        p.box(COPPER, x0 + 0.5 + m, h + 3.6, 0.5 + m, x1 - 0.5 - m, h + 3.72, d - 0.5 - m)
        for c in rows(x0 + 2, x1 - 2, bw):
            p.box(CREAM, c - 0.7, h + 0.3, 0.2, c + 0.7, h + 1.9, 1.2)
            quad(p, WINDOW, 'f', c - 0.45, c + 0.45, h + 0.6, h + 1.6, 0.17)
            p.box(SLATE, c - 0.85, h + 1.9, 0.1, c + 0.85, h + 2.05, 1.3)
    else:
        plant(p, x0, x1, h, 0, d, v['seed'])

    # A tower over the middle bays, or at one end.
    t = v.get('tower')
    if t:
        tw = bw * (3 if t == 'c' else 2) - 0.6
        tc = 0 if t == 'c' else (x0 + tw / 2 + 0.3 if t == 'l' else x1 - tw / 2 - 0.3)
        th = v.get('tower_h', 9.0)
        td = min(tw, d - 2)
        grid(p, tc - tw / 2, tc + tw / 2, -0.25, td, h, h + th, wall, th - 1.2, tw / 3, 1.0, th - 4.2, 1.8, frame=trim)
        band(p, trim, tc - tw / 2, tc + tw / 2, -0.25, td, h + th - 0.9, h + th - 0.4, 0.4)
        if t == 'c':   # the middle bays stand forward under it
            for sx in (-1, 1):
                p.box(trim, tc + sx * tw / 2 - 0.35, BH, -0.25, tc + sx * tw / 2 + 0.35, h, 0)
        pyramid(p, COPPER, tc - tw / 2 - 0.3, tc + tw / 2 + 0.3, -0.55, td + 0.3, h + th - 0.4, tw * 0.55)
        p.cyl(BRASS, (tc, h + th + 0.8 + tw * 0.55, (td - 0.25) / 2), 1, 0.06, 2.4, seg=6)


V = [
    # Facing the station across Ekimae-dōri.
    dict(id='post', w=40.0, d=23.0, h=27.0, wall=WHITE, trim='flat:#b9b6ad', base='flat:#6f6b64', modern=True, bay=5.0, seed=21),
    dict(id='railhq', w=36.0, d=23.0, h=30.0, wall=BRICK_R, trim='flat:#ddd6c6', arched=True, mansard=True, tower='c', seed=23),
    dict(id='life', w=40.0, d=23.0, h=31.0, wall=STONE_LT, trim=STONE, order=True, bay=4.4, seed=25),
    dict(id='chamber', w=38.0, d=23.0, h=28.0, wall=STONE, trim=STONE_DK, arched=True, mansard=True, seed=27),
    # Down Tokei-suji.
    dict(id='tk_a', w=19.0, d=22.0, h=31.0, wall=BRICK, trim=STONE_LT, arched=True, seed=31),
    dict(id='tk_b', w=19.0, d=22.0, h=29.0, wall=STONE_LT, trim=STONE_DK, order=True, mansard=True, seed=33),
    dict(id='tk_c', w=19.0, d=22.0, h=31.0, wall=TILE, trim=TILE_DK, base='flat:#5f5a52', modern=True, tower='r', tower_h=7.0, seed=35),
    dict(id='tk_d', w=19.0, d=22.0, h=30.0, wall='flat:#b9b3a6', trim='flat:#6f6d66', mansard=True, seed=37),
]


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    prewar(body, signs, v, random.Random(sum(map(ord, v['id']))))
    return body, signs


if __name__ == '__main__':
    run('tokei', [dict(f, gap=10.0) for f in V], build_hi, lambda v: None)
    write_anchors('tokei')
