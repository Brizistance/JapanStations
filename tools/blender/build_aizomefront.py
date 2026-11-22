# Builds the buildings fronting Aizomechō's two big streets, Tsumugi-dōri and Akane-suji (the
# 2026-11 rebuild): the cloth trade's own town of brick office buildings, 1960s wholesalers' blocks
# in blue-grey mosaic tile with shutters and a roof sign, signboard-fronted shop houses, textile
# halls, kimono houses, a business hotel and two towers set back above the 31 m line.
#
#   blender --background --python tools/blender/build_aizomefront.py -- [--renders <dir>]
#
# Writes assets/buildings/aizomefront.blend, public/models/buildings/aizomefront.glb and
# src/stations/anchors/aizomefront.ts. The older styles are build_tsumugifront.py's, in this
# quarter's colours; `tonya` and `kanban` are new here. Nothing carries a name.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_tsumugifront as T  # noqa: E402
from kitakit import *  # noqa: E402,F401,F403

SHUTTER = 'metal:#a7acb1'
SHUTTER_DK = 'metal:#8c9196'


def tonya(p, s, v, r):
    """A 1960s cloth wholesaler's block: mosaic tile in bands, steel-sash windows in a grid, a street
    storey of roller shutters (some half up on a lit stockroom) under a long canopy, a tall board down
    one edge, a sign frame and a water tank on the roof."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall, trim = v.get('wall', 'flat:#8fa0b4'), v.get('trim', 'flat:#e6e2d6')
    p.box(wall, x0, 0, 0, x1, h, d)
    T.ob(p, 'flat:#5f6266', x0, 0, -0.04, x1, 0.5, d, 0.05)
    # Street storey: shutters between tiled piers, the door at one end.
    n = max(2, round(w / 4.2))
    step = w / n
    for k in range(n):
        a, e = x0 + k * step + 0.35, x0 + (k + 1) * step - 0.35
        if k == n - 1:
            doors(p, (a + e) / 2, 0, -0.01, min(2.2, e - a - 0.3), 2.6, ALU)
            quad(p, 'windowDim', 'f', a, e, 2.8, 3.5, -0.01, col=SHOP)
            continue
        up = 1.5 if (k + v['seed']) % 3 == 0 else 0.0
        if up:
            quad(p, 'windowDim', 'f', a, e, 0.1, up, 0.2, col=WARM)
            for j in range(3):
                p.box(['flat:#c9b98a', 'flat:#8fa8ca', 'flat:#e9e2d2'][j], a + 0.3 + j * 0.9, 0.1, -0.05, a + 1.0 + j * 0.9, 0.5 + j * 0.15, 0.15)
        p.box(SHUTTER, a, up, -0.03, e, 3.3, 0.02)
        y = up + 0.2
        while y < 3.25:
            p.box(SHUTTER_DK, a, y, -0.045, e, y + 0.025, -0.03)
            y += 0.22
        p.box(SHUTTER_DK, a - 0.05, 3.3, -0.1, e + 0.05, 3.6, 0.02)
    p.box(trim, x0 - 0.05, 3.7, -1.5, x1 + 0.05, 3.9, 0.0)
    p.box('light', x0 + 0.4, 3.66, -1.2, x1 - 0.4, 3.7, -1.0)
    board(p, 'name', 'f', x0 + 0.6, x1 - 2.4, 3.95, 4.75, 0, 'flat:#f4f1e8', 0.12)
    # Floors above: a band of trim under each row of steel sashes.
    floors = int((h - 5.6) / 3.3)
    for f in range(floors):
        y = 5.2 + f * 3.3
        p.box(trim, x0 - 0.03, y + 0.55, -0.08, x1 - 1.9, y + 0.7, 0.0)
        for c in rows(x0 + 0.5, x1 - 2.1, 2.4):
            quad(p, WINDOW, 'f', c - 0.95, c + 0.95, y + 0.7, y + 2.3, -0.01)
            p.box(ALU_DK, c - 0.02, y + 0.7, -0.03, c + 0.02, y + 2.3, -0.01)
            p.box(ALU_DK, c - 0.95, y + 1.75, -0.03, c + 0.95, y + 1.79, -0.01)
    board(p, 'vertical', 'f', x1 - 1.55, x1 - 0.35, 5.6, h - 2.0, 0, 'flat:#f4f1e8', 0.35)
    T.ob(p, trim, x0, h - 0.4, -0.15, x1, h, d)
    roof_frame(p, 'roof', x0 + 1.0, x1 - 1.0, h, 1.0, 2.6)
    tank(p, x1 - 2.5, h, d - 3.5)
    for face, a0, a1, at in sides(x0, x1, 0, d, 'lr'):
        windows(p, face, a0 + 1.5, a1 - 1.5, at, 5.2, max(1, floors), 3.3, 3.0, 1.2, 1.4)
    T.service_back(p, x0, x1, d, h, r)


def kanban(p, s, v, r):
    """A signboard-fronted shop house (kanban kenchiku): a flat front of copper sheet or mortar over a
    timber house, a shop below with an awning, two rows of sash windows, a moulded parapet."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall, trim = v.get('wall', 'flat:#5f8f7b'), v.get('trim', 'flat:#3f6a5a')
    p.box('flat:#b9b3a4', x0, 0, 0.15, x1, h - 1.2, d)
    p.box(wall, x0, 0, 0, x1, h, 0.4)
    T.ob(p, 'flat:#5f6266', x0, 0, -0.04, x1, 0.4, 0.4, 0.04)
    quad(p, 'windowDim', 'f', x0 + 0.4, x1 - 0.4, 0.4, 2.7, -0.01, col=WARM)
    for c in rows(x0 + 0.4, x1 - 0.4, 2.2):
        p.box(trim, c - 1.1 - 0.03, 0.4, -0.04, c - 1.1 + 0.03, 2.7, 0)
    aw = v.get('awn', '#24407a')
    for j in range(10):
        u0, u1 = x0 + 0.2 + (w - 0.4) * j / 10, x0 + 0.2 + (w - 0.4) * (j + 1) / 10
        col = 'flat:' + aw if j % 2 == 0 else 'flat:#f1ead8'
        p.face(col, [(u0, 3.05, -0.02), (u1, 3.05, -0.02), (u1, 2.6, -1.0), (u0, 2.6, -1.0)], (0, 0.9, -0.4))
        p.face(col, [(u1, 3.05, -0.02), (u0, 3.05, -0.02), (u0, 2.6, -1.0), (u1, 2.6, -1.0)], (0, -0.9, 0.4))
    board(p, 'name', 'f', x0 + 0.5, x1 - 0.5, 3.2, 3.95, 0, 'flat:#f4f1e8', 0.08)
    floors = int((h - 5.4) / 2.9)
    for f in range(floors):
        y = 4.3 + f * 2.9
        for c in rows(x0 + 0.5, x1 - 0.5, 2.0):
            p.box(trim, c - 0.62, y + 0.55, -0.06, c + 0.62, y + 2.2, 0)
            quad(p, WINDOW, 'f', c - 0.5, c + 0.5, y + 0.7, y + 2.05, -0.07)
            p.box(trim, c - 0.5, y + 1.35, -0.09, c + 0.5, y + 1.39, -0.07)
        p.box(trim, x0, y + 0.3, -0.1, x1, y + 0.42, 0)
    p.box(trim, x0 - 0.1, h - 0.9, -0.2, x1 + 0.1, h - 0.6, 0.4)
    p.box(wall, -w / 6, h, 0, w / 6, h + 0.6, 0.4)
    p.box(trim, -w / 6 - 0.1, h + 0.6, -0.08, w / 6 + 0.1, h + 0.75, 0.4)
    backs(p, w, d, [3.0, h - 1.2], r, sides=(-1, 1), back=True)


T.STYLES.update(tonya=tonya, kanban=kanban)

D = 20.0
FRONTS = [
    # Brick office buildings of the dye and cotton trade (1925-1937).
    dict(id='brick_a', style='brick', w=17.0, h=24.0, wall='flat:#6e3a2d', trim='flat:#d8ccb2', seed=11),
    dict(id='brick_b', style='brick', w=13.0, h=19.0, wall='flat:#5a3a34', trim='flat:#efe6cf', seed=13),
    dict(id='brick_c', style='brick', w=20.0, h=28.0, wall='flat:#8a4b3a', trim='flat:#c4b89f', seed=15),
    # Wholesalers' blocks (1958-1970).
    dict(id='tonya_a', style='tonya', w=17.0, h=25.0, seed=21),
    dict(id='tonya_b', style='tonya', w=13.0, h=18.5, wall='flat:#a8b4b0', trim='flat:#3f5a78', seed=22),
    dict(id='tonya_c', style='tonya', w=21.5, h=31.0, wall='flat:#7f8fa6', trim='flat:#efe9dc', seed=24),
    dict(id='tonya_d', style='tonya', w=15.0, h=21.8, wall='flat:#c9c2ae', trim='flat:#24407a', seed=27),
    # Signboard-fronted shop houses (1920s-30s).
    dict(id='kanban_a', style='kanban', w=8.0, h=10.6, seed=31),
    dict(id='kanban_b', style='kanban', w=9.5, h=11.0, wall='flat:#c9bfa6', trim='flat:#8a6a4a', awn='#7a1f2b', seed=32),
    dict(id='kanban_c', style='kanban', w=8.6, h=10.6, wall='flat:#7d8f8a', trim='flat:#e9e2d2', awn='#2f4a2c', seed=33),
    # Trading companies' offices and a textile hall.
    dict(id='ribbon_a', style='ribbon', w=24.0, h=31.0, wall='flat:#dfe3e2', trim='flat:#24407a', seed=41),
    dict(id='ribbon_b', style='ribbon', w=16.0, h=27.0, wall='flat:#e8e1cf', trim='flat:#5d6166', seed=43),
    dict(id='seni_a', style='seni', w=19.0, h=31.0, wall='flat:#d9cfb8', trim='flat:#3f5a78', seed=45),
    # Kimono and yukata houses.
    dict(id='kimono_a', style='kimono', w=10.5, h=11.6, seed=51),
    dict(id='kimono_b', style='kimono', w=8.5, h=11.6, seed=53),
    # A business hotel, and towers over the height line.
    dict(id='hotel_a', style='hotel', w=10.0, h=37.0, wall='flat:#cfd4d8', seed=61),
    dict(id='tower_a', style='tower', w=22.0, h=64.0, wall='flat:#c4c9cc', seed=63),
    dict(id='tower_b', style='tower', w=25.0, h=82.0, wall='flat:#b9b3a6', glass=GLASS_BZ, seed=65),
]
for _v in FRONTS:
    _v.setdefault('d', D)
    _v['gap'] = 10.0


if __name__ == '__main__':
    run('aizomefront', FRONTS, T.build_hi, T.build_lo)
    write_anchors('aizomefront')
