# Builds the buildings fronting Kawaminato-kō's harbour boulevard, Minatoura-dōri (the 2026-11 rebuild,
# after a redeveloped brick port): 1920s stone trading houses and banks, 1930s brick shipping offices,
# streamline shipping-line offices in white tile with portholes and a flag mast, ship chandlers' shop
# houses, 1960s ribbon-window offices, a seamen's hotel and glass towers set back above the 31 m line.
#
#   blender --background --python tools/blender/build_minatofront.py -- [--renders <dir>]
#
# Writes assets/buildings/minatofront.blend, public/models/buildings/minatofront.glb and
# src/stations/anchors/minatofront.ts. The older styles are build_tsumugifront.py's, in the port's
# colours; `kaiun` and `chandler` are new here. Nothing carries a name.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_tsumugifront as T  # noqa: E402
from kitakit import *  # noqa: E402,F401,F403

TILE_W = 'flat:#e7e5dd'
TILE_WD = 'flat:#c9c6bb'
NAVY = 'flat:#1d3550'
IRON = 'flat:#2e3236'
CLAP = 'flat:#5c7a86'
CLAP_D = 'flat:#486270'


def kaiun(p, s, v, r):
    """A 1930s shipping-line office: white tile, a rounded corner, ribbon windows with round portholes
    on the stair, a deep canopy over a revolving door, a flag mast on the roof."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall, trim = v.get('wall', TILE_W), v.get('trim', NAVY)
    p.box(wall, x0, 0, 0, x1 - 2.0, h, d)
    p.cyl(wall, (x1 - 2.0, h / 2, 2.0), 1, 2.0, h, seg=20)
    p.box(wall, x1 - 2.0, 0, 2.0, x1, h, d)
    T.ob(p, 'flat:#4a4f55', x0, 0, -0.05, x1 - 2.0, 0.8, d, 0.05)
    # Street storey: a glazed office hall, the door under a canopy.
    quad(p, 'windowDim', 'f', x0 + 0.6, x1 - 2.6, 0.8, 3.6, -0.01, col=SHOP)
    for c in rows(x0 + 0.6, x1 - 2.6, 2.6):
        p.box(trim, c - 1.3 - 0.04, 0.8, -0.05, c - 1.3 + 0.04, 3.6, 0)
    doors(p, -1.0, 0, -0.03, 2.4, 2.8, BRASS)
    p.box(trim, x0 + 0.2, 3.9, -2.2, x1 - 2.4, 4.15, 0)
    p.box('light', x0 + 0.6, 3.86, -1.8, x1 - 2.8, 3.9, -1.6)
    board(p, 'name', 'f', x0 + 1.0, x1 - 3.2, 4.3, 5.0, 0, 'flat:#1d3550', 0.08)
    # Ribbon windows above, a navy stripe under each.
    floors = int((h - 6.4) / 3.5)
    for f in range(floors):
        y = 5.6 + f * 3.5
        p.box(trim, x0 - 0.03, y + 0.4, -0.06, x1 - 2.0, y + 0.55, 0.0)
        quad(p, WINDOW, 'f', x0 + 0.6, x1 - 2.4, y + 0.8, y + 2.5, -0.01)
        for c in rows(x0 + 0.6, x1 - 2.4, 1.6):
            p.box(ALU_DK, c - 0.8 - 0.02, y + 0.8, -0.03, c - 0.8 + 0.02, y + 2.5, -0.01)
        # Portholes up the rounded corner.
        p.cyl(trim, (x1 - 2.0, y + 1.6, 2.0 - 1.98), 2, 0.55, 0.08, seg=16)
        p.cyl(WINDOW, (x1 - 2.0, y + 1.6, 2.0 - 2.03), 2, 0.42, 0.04, seg=16)
    for face, a0, a1, at in sides(x0, x1, 2.0, d, 'l'):
        windows(p, face, a0 + 1.2, a1 - 1.2, at, 5.6, max(1, floors), 3.5, 3.0, 1.4, 1.6)
    T.ob(p, trim, x0, h - 0.5, -0.1, x1 - 2.0, h, d)
    board(p, 'roof', 'f', x0 + 1.0, x0 + 1.0 + min(8.0, w - 6), h + 0.2, h + 1.6, 0.4, 'flat:#f4f1e8', 0.1)
    p.box(IRON, x1 - 2.05, h, 1.95, x1 - 1.95, h + 8.0, 2.05)
    p.box(IRON, x1 - 3.0, h + 6.8, 1.97, x1 - 1.0, h + 6.88, 2.03)
    T.service_back(p, x0, x1, d, h, r)
    plant(p, x0, x1 - 2.0, h, 0, d, v['seed'])


def chandler(p, s, v, r):
    """A ship chandler's shop house: painted clapboard over a timber frame, the shop open under a striped
    awning with coils of rope and fenders in the window, sash windows upstairs, a sign board along the eaves."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall, trim = v.get('wall', CLAP), v.get('trim', 'flat:#e9e5d8')
    p.box(wall, x0, 0, 0, x1, h, d)
    T.ob(p, 'flat:#5f6266', x0, 0, -0.04, x1, 0.4, d, 0.04)
    # Clapboard: thin shadow lines up the front.
    y = 3.4
    while y < h - 1.2:
        p.box(v.get('rib', CLAP_D), x0, y, -0.05, x1, y + 0.04, 0)
        y += 0.28
    quad(p, 'windowDim', 'f', x0 + 0.4, x1 - 0.4, 0.4, 2.8, -0.01, col=WARM)
    for c in rows(x0 + 0.4, x1 - 0.4, 2.4):
        p.box(trim, c - 1.2 - 0.04, 0.4, -0.05, c - 1.2 + 0.04, 2.8, 0)
    # Coils of rope and fenders in the window.
    for k in range(max(2, int(w / 2.6))):
        cx = x0 + 1.2 + k * 2.4
        if cx > x1 - 1.0:
            break
        p.cyl('flat:#c9b17a', (cx, 0.62, 0.35), 1, 0.45, 0.22, seg=12)
        p.cyl('flat:#2b2e30', (cx + 0.8, 0.9, 0.4), 1, 0.22, 0.9, seg=10)
    aw = v.get('awn', '#1d3550')
    for j in range(10):
        u0, u1 = x0 + 0.2 + (w - 0.4) * j / 10, x0 + 0.2 + (w - 0.4) * (j + 1) / 10
        col = 'flat:' + aw if j % 2 == 0 else 'flat:#f1ead8'
        p.face(col, [(u0, 3.15, -0.02), (u1, 3.15, -0.02), (u1, 2.7, -1.1), (u0, 2.7, -1.1)], (0, 0.9, -0.4))
        p.face(col, [(u1, 3.15, -0.02), (u0, 3.15, -0.02), (u0, 2.7, -1.1), (u1, 2.7, -1.1)], (0, -0.9, 0.4))
    board(p, 'name', 'f', x0 + 0.5, x1 - 0.5, 3.3, 4.0, 0, 'flat:#f4f1e8', 0.08)
    floors = max(1, int((h - 5.0) / 2.9))
    for f in range(floors):
        y = 4.4 + f * 2.9
        for c in rows(x0 + 0.6, x1 - 0.6, 2.2):
            p.box(trim, c - 0.66, y + 0.5, -0.06, c + 0.66, y + 2.2, 0)
            quad(p, WINDOW, 'f', c - 0.52, c + 0.52, y + 0.65, y + 2.05, -0.07)
            p.box(trim, c - 0.52, y + 1.33, -0.09, c + 0.52, y + 1.37, -0.07)
    p.box(trim, x0 - 0.1, h - 0.5, -0.25, x1 + 0.1, h, 0.3)
    board(p, 'vertical', 'f', x1 - 1.0, x1 - 0.2, 4.6, h - 1.0, 0, 'flat:#f4f1e8', 0.3)
    backs(p, w, d, [3.0, h - 0.8], r, sides=(-1, 1), back=True)


T.STYLES.update(kaiun=kaiun, chandler=chandler)

D = 14.0
FRONTS = [
    # Stone trading houses and a bank (1918-1930).
    dict(id='stone_a', style='stone', w=22.0, h=22.0, wall='flat:#d9d2c0', trim='flat:#6b6457', seed=3),
    dict(id='stone_b', style='stone', w=16.0, h=19.0, wall='flat:#c9c2b0', trim='flat:#4d4a44', seed=5),
    # Brick shipping offices (1925-1937).
    dict(id='brick_a', style='brick', w=17.0, h=25.0, wall='flat:#8b4a37', trim='flat:#e4dcc6', seed=11),
    dict(id='brick_b', style='brick', w=13.0, h=19.0, wall='flat:#7a3f30', trim='flat:#c9c1b0', seed=13),
    dict(id='brick_c', style='brick', w=20.0, h=28.0, wall='flat:#a0583f', trim='flat:#efe6cf', seed=15),
    # Shipping-line offices (1932-1938).
    dict(id='kaiun_a', style='kaiun', w=18.0, h=24.0, seed=21),
    dict(id='kaiun_b', style='kaiun', w=14.0, h=20.5, wall='flat:#e2ddd0', trim='flat:#7a2b24', seed=23),
    # Ship chandlers (1920s-50s).
    dict(id='chandler_a', style='chandler', w=8.0, h=10.4, seed=31),
    dict(id='chandler_b', style='chandler', w=9.6, h=10.8, wall='flat:#8a8f6a', rib='flat:#71765a', awn='#7a1f2b', seed=32),
    dict(id='chandler_c', style='chandler', w=7.4, h=9.6, wall='flat:#a36a4a', rib='flat:#87573c', awn='#2f4a2c', seed=33),
    # Trading companies' offices (1958-1972).
    dict(id='ribbon_a', style='ribbon', w=24.0, h=31.0, wall='flat:#dfe3e2', trim='flat:#1d3550', seed=41),
    dict(id='ribbon_b', style='ribbon', w=16.0, h=27.0, wall='flat:#e8e1cf', trim='flat:#5d6166', seed=43),
    # A seamen's hotel, and towers over the height line.
    dict(id='hotel_a', style='hotel', w=10.0, h=34.0, wall='flat:#d4d8dc', seed=61),
    dict(id='tower_a', style='tower', w=22.0, h=66.0, wall='flat:#c4c9cc', seed=63),
    dict(id='tower_b', style='tower', w=24.0, h=84.0, wall='flat:#b9b3a6', glass=GLASS_BL, seed=65),
]
for _v in FRONTS:
    _v.setdefault('d', D)
    _v['gap'] = 10.0


if __name__ == '__main__':
    run('minatofront', FRONTS, T.build_hi, T.build_lo)
    write_anchors('minatofront')
