# Builds the old shipping town behind Kawaminato-kō's harbour boulevard (2026-11-24): the shop houses along
# 綱町通 Tsunamachi-dōri (timber 2-storey shops, a copper-clad "signboard building" of the 1930s, mortar-faced
# shops, a little izakaya), the terraced row houses (nagaya) along its lanes, and the bathhouse 錨湯 with its
# chimney.
#
#   blender --background --python tools/blender/build_tsuna.py -- [--renders <dir>]
#
# Writes assets/buildings/tsuna.blend, public/models/buildings/tsuna.glb and src/stations/anchors/tsuna.ts.
# Frame as every building script's: front at z = 0 facing -z, origin mid-frontage at ground level.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

TIMBER = 'flat:#4a3426'
TIMBER_L = 'flat:#6b4a33'
BOARD_W = 'flat:#3d2c22'
PLASTER_W = 'flat:#e6dfcf'
MORTAR = 'flat:#bdb5a4'
MORTAR_D = 'flat:#9c9483'
COPPER_G = 'flat:#5f8f7d'
COPPER_D = 'flat:#4c7464'
ROOF_T = 'flat:#3b3f45'
ROOF_TL = 'flat:#4c5157'
STEEL_D = 'flat:#2e3236'
CANVAS = ['#7a1f2b', '#1f3f7a', '#2f4a2c', '#8a6a2c', '#3a3a3a']
NOREN_C = ['#1f3f7a', '#7a1f2b', '#2b3a67']


def gable(p, mat, x0, x1, z0, z1, y, rise, over=0.45):
    """A gable roof over x0..x1 (eaves along x, ridge along x), the slopes falling to front and back."""
    zc = (z0 + z1) / 2
    p.prism(mat, [(z0 - over, y - 0.1), (zc, y + rise), (z1 + over, y - 0.1), (z1 + over, y - 0.25), (zc, y + rise - 0.15), (z0 - over, y - 0.25)], 'x', x0 - over, x1 + over)


def lean(p, mat, x0, x1, y, out=0.9, drop=0.35):
    """A small tiled pent roof (hisashi) along the front at height y."""
    p.prism(mat, [(0.02, y + drop), (-out, y), (-out, y - 0.1), (0.02, y + drop - 0.1)], 'x', x0, x1)


def sliding_front(p, x0, x1, y0, y1, glass=True):
    """Timber-framed sliding doors and shop windows across a front."""
    for c in rows(x0, x1, 0.95):
        if glass:
            quad(p, 'windowDim', 'f', c - 0.42, c + 0.42, y0 + 0.15, y1 - 0.15, -0.02, col=WARM)
        else:
            p.box(BOARD_W, c - 0.45, y0, -0.04, c + 0.45, y1, -0.01)
        p.box(TIMBER, c - 0.47, y0, -0.06, c - 0.42, y1, -0.02)
    p.box(TIMBER, x0, y1 - 0.08, -0.07, x1, y1, -0.01)


def lattice(p, x0, x1, y0, y1, z=0.0):
    """A fine timber lattice (kōshi) before a window or a wall."""
    p.box(TIMBER, x0, y0, z - 0.06, x1, y0 + 0.06, z)
    p.box(TIMBER, x0, y1 - 0.06, z - 0.06, x1, y1, z)
    for c in rows(x0, x1, 0.11):
        p.box(TIMBER_L, c - 0.02, y0, z - 0.05, c + 0.02, y1, z - 0.01)


def sides_back(p, x0, x1, d, h, wall):
    for face, a0, a1, at in sides(x0, x1, 0, d, 'lrb'):
        windows(p, face, a0 + 1.0, a1 - 1.0, at, 0.4, max(1, int(h / 3.0)), 2.9, 2.6, 0.9, 1.0)


def shop_timber(p, s, v, r):
    """A two-storey timber shop house: board walls, a tiled pent roof over the shop, a lattice upstairs, a
    canvas awning, the name board under the eave, a projecting sign."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(BOARD_W, x0, 0, 0, x1, h, d)
    p.box(PLASTER_W, x0 + 0.1, 3.4, -0.02, x1 - 0.1, h - 0.2, 0)
    sliding_front(p, x0 + 0.3, x1 - 0.3, 0.2, 2.6)
    lean(p, ROOF_T, x0 - 0.1, x1 + 0.1, 2.95)
    awn = r.choice(CANVAS)
    p.prism('flat:' + awn, [(0.0, 2.75), (-1.3, 2.35), (-1.3, 2.25), (0.0, 2.65)], 'x', x0 + 0.3, x1 - 0.3)
    board(p, 'name', 'f', x0 + 0.6, x1 - 0.6, 3.55, 4.2, 0, 'flat:#f2ecd8', 0.08)
    for c in rows(x0 + 0.6, x1 - 0.6, 2.4):
        lattice(p, c - 0.9, c + 0.9, 4.5, 5.9, -0.02)
    gable(p, ROOF_T, x0, x1, 0, d, h, 2.2)
    blade(s, x1 - 0.5, 3.5, h - 0.6, 0.0, 0.55, r.choice(['#f4f1e8', '#7a1f2b', '#1f3f7a']), r)
    sides_back(p, x0, x1, d, h, BOARD_W)


def shop_copper(p, s, v, r):
    """A 1930s "signboard building" (看板建築): a timber house behind a flat front clad in copper gone green,
    pressed panels and a cornice, sash windows; the shop below behind glass."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(MORTAR, x0, 0, 0.3, x1, h - 1.0, d)
    p.box(COPPER_G, x0, 3.0, 0, x1, h, 0.3)
    # Pressed panels and pilasters.
    for c in rows(x0 + 0.3, x1 - 0.3, 1.2):
        p.box(COPPER_D, c - 0.5, 3.3, -0.04, c + 0.5, 3.9, 0)
    for xx in (x0 + 0.15, x1 - 0.15):
        p.box(COPPER_D, xx - 0.15, 3.0, -0.08, xx + 0.15, h, 0)
    p.box(COPPER_D, x0 - 0.1, h - 0.6, -0.25, x1 + 0.1, h - 0.35, 0.3)
    p.box(COPPER_G, x0 - 0.05, h - 0.35, -0.15, x1 + 0.05, h, 0.3)
    for f in range(int((h - 4.6) / 2.8)):
        y = 4.4 + f * 2.8
        for c in rows(x0 + 0.8, x1 - 0.8, 1.6):
            quad(p, WINDOW, 'f', c - 0.5, c + 0.5, y, y + 1.6, -0.01)
            p.box(COPPER_D, c - 0.58, y - 0.08, -0.06, c + 0.58, y, 0)
    quad(p, 'windowDim', 'f', x0 + 0.4, x1 - 0.4, 0.3, 2.7, 0.28, col=SHOP)
    p.box(STEEL_D, x0, 2.7, -0.4, x1, 3.0, 0.3)
    board(p, 'name', 'f', x0 + 0.5, x1 - 0.5, 3.95, 4.3, 0, 'flat:#e8dcb8', 0.06)
    sides_back(p, x0, x1, d, h, MORTAR)


def shop_mortar(p, s, v, r):
    """A post-war mortar shop house: a flat front, steel sashes, a sign box over a roller shutter half up."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(MORTAR, x0, 0, 0, x1, h, d)
    p.box(MORTAR_D, x0, 0, -0.05, x1, 0.4, d)
    quad(p, 'windowDim', 'f', x0 + 0.4, x1 - 0.4, 0.4, 2.5, -0.01, col=WARM if r.random() < 0.5 else SHOP)
    p.box(STEEL_D, x0 + 0.3, 2.5, -0.2, x1 - 0.3, 3.0, 0)
    fascia(s, x0 + 0.3, x1 - 0.3, 3.05, 3.75, -0.05, r.choice(['#1f3f7a', '#f4f1e8', '#7a1f2b', '#2f4a2c']), r)
    for f in range(int((h - 4.0) / 2.9)):
        y = 4.2 + f * 2.9
        for c in rows(x0 + 0.7, x1 - 0.7, 1.9):
            quad(p, WINDOW, 'f', c - 0.65, c + 0.65, y, y + 1.4, -0.01)
            p.box(STEEL_D, c - 0.7, y - 0.05, -0.05, c + 0.7, y, 0)
        p.box(STEEL_D, x0 + 0.5, y - 0.1, -0.7, x1 - 0.5, y - 0.05, 0)
        railing_simple(p, x0 + 0.5, x1 - 0.5, y - 0.05, -0.7)
    p.box(MORTAR_D, x0, h - 0.3, -0.1, x1, h, d)
    sides_back(p, x0, x1, d, h, MORTAR)


def railing_simple(p, x0, x1, y, z):
    p.box(STEEL_D, x0, y + 0.9, z - 0.03, x1, y + 0.95, z + 0.03)
    for c in rows(x0, x1, 0.4):
        p.box(STEEL_D, c - 0.015, y, z - 0.015, c + 0.015, y + 0.9, z + 0.015)


def izakaya(p, s, v, r):
    """A small izakaya: a timber front, a noren in the door, a red lantern, a sake barrel by the step."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(BOARD_W, x0, 0, 0, x1, h, d)
    lattice(p, x0 + 0.3, x0 + w * 0.45, 0.5, 2.3, -0.02)
    p.box('flat:#2a2019', x0 + w * 0.52, 0, -0.03, x1 - 0.4, 2.3, 0)
    p.box('flat:' + r.choice(NOREN_C), x0 + w * 0.52, 1.5, -0.08, x1 - 0.4, 2.25, -0.04)
    p.cyl('flat:#c8102e', (x1 - 0.25, 1.9, -0.35), 1, 0.22, 0.55, seg=10, capmat='flat:#2a2019')
    p.cyl('flat:#8a6a4c', (x0 + 0.5, 0.35, -0.4), 1, 0.3, 0.7, seg=10)
    lean(p, ROOF_T, x0 - 0.1, x1 + 0.1, 2.7, 0.8)
    board(p, 'name', 'f', x0 + 0.4, x1 - 0.4, 3.1, 3.7, 0, 'flat:#2a2019', 0.06)
    lattice(p, x0 + 0.5, x1 - 0.5, 4.0, 5.2, -0.02)
    gable(p, ROOF_T, x0, x1, 0, d, h, 1.9)
    sides_back(p, x0, x1, d, h, BOARD_W)


def nagaya(p, s, v, r):
    """A terrace of row houses (長屋), `units` of them: each a door, a lattice window, a potted plant, an
    upstairs window behind a rail with washing; one tiled roof over the lot; on some a net-drying frame."""
    w, d, h, n = v['w'], v['d'], v['h'], v['units']
    x0, x1 = -w / 2, w / 2
    p.box(BOARD_W, x0, 0, 0, x1, h, d)
    uw = w / n
    for k in range(n):
        a = x0 + k * uw
        p.box(TIMBER, a - 0.04, 0, -0.08, a + 0.04, h, 0)
        p.box('flat:#2a2019', a + 0.3, 0, -0.03, a + 1.2, 2.0, 0)
        lattice(p, a + 1.5, a + uw - 0.3, 0.7, 1.9, -0.02)
        p.cyl('flat:#6b4a33', (a + 1.35, 0.25, -0.35), 1, 0.2, 0.5, seg=8)
        p.cyl('flat:#3f6f4a', (a + 1.35, 0.75, -0.35), 1, 0.28, 0.5, seg=8)
        lean(p, ROOF_TL, a, a + uw, 2.35, 0.6, 0.25)
        quad(p, WINDOW, 'f', a + 0.6, a + uw - 0.6, 3.3, 4.5, -0.01)
        railing_simple(p, a + 0.5, a + uw - 0.5, 3.0, -0.35)
        if r.random() < 0.5:
            p.box('flat:#e8e4da', a + 0.8, 3.5, -0.4, a + 1.6, 4.0, -0.38)
            p.box('flat:' + r.choice(NOREN_C), a + 1.8, 3.45, -0.4, a + 2.3, 4.0, -0.38)
    gable(p, ROOF_T, x0, x1, 0, d, h, 1.8)
    if v.get('nets'):
        # A drying frame for nets on the roof, poles and a crossbar.
        for xx in (x0 + 1.0, x1 - 1.0):
            p.box(TIMBER_L, xx - 0.05, h + 1.0, d * 0.5 - 0.05, xx + 0.05, h + 3.0, d * 0.5 + 0.05)
        p.box(TIMBER_L, x0 + 1.0, h + 2.9, d * 0.5 - 0.04, x1 - 1.0, h + 3.0, d * 0.5 + 0.04)
        p.box('flat:#556b5a', x0 + 1.1, h + 1.6, d * 0.5 - 0.01, x1 - 1.1, h + 2.85, d * 0.5 + 0.01)
    sides_back(p, x0, x1, d, h, BOARD_W)


def sento(p, s, v, r):
    """The bathhouse 錨湯: a temple-like gabled entrance hall (karahafu over the door), the bath halls behind
    under a high roof, the boiler house at the back with its brick chimney."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(PLASTER_W, x0, 0, 2.5, x1, h - 2.0, d - 5)
    gable(p, ROOF_T, x0, x1, 2.5, d - 5, h - 2.0, 3.0, 0.6)
    # The entrance: a projecting porch with a curved gable (approximated by stepped boards), noren, the name board.
    p.box(TIMBER, -3.0, 0, 0.0, 3.0, 4.2, 2.6)
    p.box(PLASTER_W, -2.9, 0.4, -0.02, 2.9, 4.0, 0.2)
    p.box('flat:#2a2019', -1.4, 0, -0.04, 1.4, 2.6, 0)
    p.box('flat:#1f3f7a', -1.4, 1.8, -0.08, -0.05, 2.55, -0.05)
    p.box('flat:#7a1f2b', 0.05, 1.8, -0.08, 1.4, 2.55, -0.05)
    for k, (yw, ww) in enumerate(((4.2, 3.6), (4.55, 3.2), (4.85, 2.6), (5.05, 1.8))):
        p.box(ROOF_T, -ww - 0.2, yw, -0.8 + k * 0.05, ww + 0.2, yw + 0.35, 2.9)
    board(p, 'name', 'f', -1.8, 1.8, 3.0, 3.7, -0.02, 'flat:#2a2019', 0.06)
    for c in rows(x0 + 0.8, -3.6, 2.2):
        lattice(p, c - 0.8, c + 0.8, 0.8, 2.2, 2.48)
    for c in rows(3.6, x1 - 0.8, 2.2):
        lattice(p, c - 0.8, c + 0.8, 0.8, 2.2, 2.48)
    # Boiler house and chimney.
    p.box(MORTAR_D, x0 + 1.0, 0, d - 5, x1 - 1.0, 4.5, d)
    p.box('flat:#8a4b3a', x1 - 3.2, 0, d - 3.2, x1 - 1.6, 22.0, d - 1.6)
    for y in (6.0, 12.0, 18.0):
        p.box('flat:#6e3a2d', x1 - 3.3, y, d - 3.3, x1 - 1.5, y + 0.3, d - 1.5)
    mark('chimney', x1 - 2.4, 15.0, d - 3.25, 1.4, 5.0, (0, -1))
    sides_back(p, x0, x1, d - 5, h - 2.0, PLASTER_W)


STYLES = {'timber': shop_timber, 'copper': shop_copper, 'mortar': shop_mortar, 'izakaya': izakaya, 'nagaya': nagaya, 'sento': sento}


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(v['seed'])
    STYLES[v['style']](body, signs, v, r)
    return body, signs


def build_lo(v):
    return None


SHOP_D = 10.4
NAGA_D = 8.5
VARIANTS = [
    dict(id='shop_a', style='timber', w=6.2, d=SHOP_D, h=6.6, seed=1),
    dict(id='shop_b', style='timber', w=7.4, d=SHOP_D, h=6.9, seed=2),
    dict(id='shop_c', style='copper', w=6.8, d=SHOP_D, h=9.4, seed=3),
    dict(id='shop_d', style='copper', w=8.6, d=SHOP_D, h=10.2, seed=4),
    dict(id='shop_e', style='mortar', w=7.0, d=SHOP_D, h=10.0, seed=5),
    dict(id='shop_f', style='mortar', w=9.2, d=SHOP_D, h=13.0, seed=6),
    dict(id='shop_g', style='izakaya', w=5.0, d=SHOP_D, h=6.2, seed=7),
    dict(id='shop_h', style='izakaya', w=5.6, d=SHOP_D, h=6.4, seed=8),
    dict(id='naga_a', style='nagaya', w=9.0, d=NAGA_D, h=6.0, units=2, seed=11),
    dict(id='naga_b', style='nagaya', w=13.5, d=NAGA_D, h=6.0, units=3, seed=12, nets=True),
    dict(id='naga_c', style='nagaya', w=8.4, d=NAGA_D, h=6.2, units=2, seed=13),
    dict(id='naga_d', style='nagaya', w=17.6, d=NAGA_D, h=6.0, units=4, seed=14),
    dict(id='sento', style='sento', w=14.0, d=22.0, h=10.0, seed=21),
]
for _v in VARIANTS:
    _v['gap'] = 3.0


if __name__ == '__main__':
    run('tsuna', VARIANTS, build_hi, build_lo)
    write_anchors('tsuna')
