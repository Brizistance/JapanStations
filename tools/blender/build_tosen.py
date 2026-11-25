# Builds 唐船町 Tōsen-machi, the Chinatown north of Kawaminato-kō (2026-11-24, after Kobe's Nankinmachi and
# Yokohama's Chūkagai): shop houses and restaurants of two to five storeys with glazed-tile eaves, red
# columns and balconies, painted name boards and tall vertical signs; the paifang gates (牌楼) over the
# streets; the temple 海安廟 (its hall and its gate) and an incense burner.
#
#   blender --background --python tools/blender/build_tosen.py -- [--renders <dir>]
#
# Writes assets/buildings/tosen.blend, public/models/buildings/tosen.glb and src/stations/anchors/tosen.ts.
# Frame as every building script's: front at z = 0 facing -z, origin mid-frontage at ground level. The
# gates and the burner are centred on z = d / 2 instead. Nothing carries a name: the game letters the
# boards it finds in the anchors.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

RED = 'flat:#b3261e'
RED_DK = 'flat:#7d1a14'
VERMILION = 'flat:#c8402a'
GOLD = 'flat:#d4a537'
JADE = 'flat:#2f6b4f'
JADE_LT = 'flat:#4e8f6a'
TEAL = 'flat:#2c6670'
YELLOW_TILE = 'flat:#c99a2e'
TILE_GREY = 'flat:#4a4d52'
WOOD = 'flat:#4a2f22'
CREAM = 'flat:#ece3cc'
GRANITE_W = 'flat:#b9b3a6'
LANTERN = 'flat:#d8261b'
LAMP_CAP = 'flat:#2a2019'
SIGN_COL = ['#b3261e', '#c99a2e', '#2f6b4f', '#1d3550', '#7d1a14', '#f4f1e8', '#2a2019']


def hip(p, mat, x0, x1, z0, z1, y, rise, curl=0.45, ridge=None, ends=True):
    """A hipped roof of glazed tile over x0..x1, z0..z1 with its eaves at y: four slopes to a ridge
    along x, the eave's corners swept up (the southern Chinese line), a ridge with end ornaments."""
    dz = z1 - z0
    inset = min(dz / 2, (x1 - x0) / 2 - 0.2)
    rx0, rx1, rz = x0 + inset, x1 - inset, (z0 + z1) / 2
    yt = y + rise
    # The eave's edge: a fascia all round.
    p.box(mat, x0, y - 0.18, z0, x1, y, z0 + 0.12)
    p.box(mat, x0, y - 0.18, z1 - 0.12, x1, y, z1)
    p.box(mat, x0, y - 0.18, z0, x0 + 0.12, y, z1)
    p.box(mat, x1 - 0.12, y - 0.18, z0, x1, y, z1)
    p.face(mat, [(x0, y, z0), (x1, y, z0), (rx1, yt, rz), (rx0, yt, rz)], (0, 1, -1))
    p.face(mat, [(x1, y, z1), (x0, y, z1), (rx0, yt, rz), (rx1, yt, rz)], (0, 1, 1))
    p.face(mat, [(x0, y, z1), (x0, y, z0), (rx0, yt, rz)], (-1, 1, 0))
    p.face(mat, [(x1, y, z0), (x1, y, z1), (rx1, yt, rz)], (1, 1, 0))
    # The underside, so the eave reads from the street.
    p.face(RED_DK, [(x0, y - 0.18, z0), (x0, y - 0.18, z1), (x1, y - 0.18, z1), (x1, y - 0.18, z0)], (0, -1, 0))
    # Swept-up corners: a thin curved horn at each.
    for cx, cz, sx, sz in ((x0, z0, -1, -1), (x1, z0, 1, -1), (x0, z1, -1, 1), (x1, z1, 1, 1)):
        tx, tz = cx + sx * 0.45, cz + sz * 0.45
        for a, b in ((0.0, 0.5), (0.5, 1.0)):
            ya, yb = y + curl * a * a, y + curl * b * b
            xa, xb = cx + (tx - cx) * a, cx + (tx - cx) * b
            za, zb = cz + (tz - cz) * a, cz + (tz - cz) * b
            p.box(mat, min(xa, xb) - 0.09, min(ya, yb) - 0.12, min(za, zb) - 0.09, max(xa, xb) + 0.09, max(ya, yb), max(za, zb) + 0.09)
    rc = ridge or mat
    if rx1 - rx0 > 0.3:
        p.box(rc, rx0 - 0.1, yt - 0.05, rz - 0.14, rx1 + 0.1, yt + 0.32, rz + 0.14)
    if ends:
        for ex, s in ((rx0, -1), (rx1, 1)):
            p.box(rc, ex + s * 0.05 - 0.14, yt, rz - 0.12, ex + s * 0.05 + 0.14, yt + 0.6, rz + 0.12)
            p.box(rc, ex + s * 0.3 - 0.1, yt + 0.45, rz - 0.1, ex + s * 0.05 + 0.1 * -s, yt + 0.75, rz + 0.1)


def eave_strip(p, x0, x1, y, out=1.0, mat=JADE, curl=0.35):
    """A tiled eave along a front at height y, standing out `out` from the wall, its ends swept up."""
    p.prism(mat, [(0.05, y + 0.5), (-out, y), (-out, y - 0.14), (0.05, y + 0.36)], 'x', x0, x1)
    p.box(RED_DK, x0, y - 0.2, -out, x1, y - 0.14, -out + 0.12)
    for ex, s in ((x0, -1), (x1, 1)):
        p.box(mat, min(ex, ex + s * 0.35), y - 0.05, -out - 0.05, max(ex, ex + s * 0.35), y + curl, -out + 0.25)


def lanterns(p, x0, x1, y, z, step=1.7):
    """A row of red lanterns on a line under an eave."""
    p.box(LAMP_CAP, x0, y + 0.42, z - 0.01, x1, y + 0.44, z + 0.01)
    for c in rows(x0 + 0.4, x1 - 0.4, step):
        p.box(LAMP_CAP, c - 0.01, y + 0.3, z - 0.01, c + 0.01, y + 0.43, z + 0.01)
        p.cyl(LANTERN, (c, y, z), 1, 0.2, 0.44, seg=10, capmat=LAMP_CAP)
        p.box(GOLD, c - 0.02, y - 0.38, z - 0.02, c + 0.02, y - 0.22, z + 0.02)


def railing(p, x0, x1, y, z, mat=RED):
    """A balcony's rail: a top rail, a bottom rail, balusters."""
    p.box(mat, x0, y + 1.0, z - 0.06, x1, y + 1.08, z + 0.06)
    p.box(mat, x0, y + 0.1, z - 0.04, x1, y + 0.16, z + 0.04)
    for c in rows(x0, x1, 0.35):
        p.box(mat, c - 0.025, y + 0.1, z - 0.025, c + 0.025, y + 1.0, z + 0.025)


def lattice_window(p, x0, x1, y0, y1, z, frame=RED):
    """A window behind a fret lattice frame."""
    quad(p, WINDOW, 'f', x0, x1, y0, y1, z)
    p.box(frame, x0 - 0.1, y0 - 0.1, z - 0.06, x1 + 0.1, y0, z)
    p.box(frame, x0 - 0.1, y1, z - 0.06, x1 + 0.1, y1 + 0.1, z)
    p.box(frame, x0 - 0.1, y0, z - 0.06, x0, y1, z)
    p.box(frame, x1, y0, z - 0.06, x1 + 0.1, y1, z)
    for c in rows(x0, x1, 0.45)[:-1]:
        p.box(frame, c + 0.2, y0, z - 0.04, c + 0.24, y1, z - 0.01)
    p.box(frame, x0, (y0 + y1) / 2 - 0.02, z - 0.04, x1, (y0 + y1) / 2 + 0.02, z - 0.01)


def plain_sides(p, x0, x1, d, h, wall, y0=4.2):
    """Sides and back of a block between neighbours: plain render, a few windows, AC units."""
    floors = max(1, int((h - y0) / 3.2))
    for face, a0, a1, at in sides(x0, x1, 0, d, 'lrb'):
        windows(p, face, a0 + 1.4, a1 - 1.4, at, y0, floors, 3.2, 3.4, 1.2, 1.3)


def shop(p, s, v, r):
    """A Chinatown shop house: an open shop or a restaurant at the street with red columns either side
    and a jade-tile eave hung with lanterns, its name board above; upstairs windows in fret frames, a
    red-railed balcony, a tall sign down one side; on some a little tiled pavilion on the roof."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall, eave = v.get('wall', CREAM), v.get('eave', JADE)
    G = 4.2
    p.box(wall, x0, 0, 0.3, x1, h, d)
    p.box(wall, x0, G, 0, x1, h, 0.3)
    # Street storey: columns at the ends, the shop set back between them.
    for cx in (x0 + 0.3, x1 - 0.3):
        p.box(RED, cx - 0.3, 0, -0.05, cx + 0.3, G, 0.35)
        p.box(GRANITE_W, cx - 0.36, 0, -0.1, cx + 0.36, 0.5, 0.4)
    quad(p, 'windowDim', 'f', x0 + 0.6, x1 - 0.6, 0.45, G - 0.5, 0.3, col=WARM if r.random() < 0.6 else SHOP)
    door = r.uniform(-0.25, 0.25) * w
    p.box(WOOD, door - 1.0, 0, 0.26, door + 1.0, 2.6, 0.3)
    p.box(GOLD, door - 1.05, 2.6, 0.24, door + 1.05, 2.72, 0.3)
    p.box(RED_DK, x0 + 0.6, G - 0.5, 0.25, x1 - 0.6, G, 0.3)
    # The eave and its lanterns, the name board over it.
    eave_strip(p, x0 - 0.1, x1 + 0.1, G + 0.05, 1.1, eave)
    lanterns(p, x0 + 0.5, x1 - 0.5, G - 0.75, -0.75)
    nb = v.get('board', '#b3261e')
    board(p, 'name', 'f', x0 + 0.8, x1 - 0.8, G + 0.75, G + 1.85, 0, 'flat:' + nb, 0.12)
    p.box(GOLD, x0 + 0.68, G + 0.63, -0.16, x1 - 0.68, G + 0.75, 0)
    p.box(GOLD, x0 + 0.68, G + 1.85, -0.16, x1 - 0.68, G + 1.97, 0)
    # Upper floors.
    floors = max(1, int((h - G - 2.3) / 3.2))
    for f in range(floors):
        y = G + 2.3 + f * 3.2
        for c in rows(x0 + 0.9, x1 - 0.9, 2.6):
            lattice_window(p, c - 0.8, c + 0.8, y + 0.6, y + 2.3, 0.0, v.get('frame', RED))
        if f == 0 and v.get('balcony'):
            p.box(GRANITE_W, x0 + 0.4, y - 0.05, -0.9, x1 - 0.4, y + 0.1, 0)
            railing(p, x0 + 0.4, x1 - 0.4, y + 0.1, -0.85, v.get('frame', RED))
        if f < floors - 1:
            p.box(eave, x0 - 0.05, y + 2.85, -0.25, x1 + 0.05, y + 3.0, 0)
    # A cornice of tile, then the roof: a parapet or a pavilion.
    top = h
    eave_strip(p, x0 - 0.15, x1 + 0.15, top - 0.6, 0.8, eave, 0.45)
    p.box(wall, x0, top, 0.4, x1, top + 0.9, 0.7)
    if v.get('pavilion'):
        pw = min(w - 1.6, 6.0)
        for cx in (-pw / 2 + 0.2, pw / 2 - 0.2):
            for cz in (1.2, 4.0):
                p.box(RED, cx - 0.15, top, cz - 0.15, cx + 0.15, top + 2.4, cz + 0.15)
        p.box(RED_DK, -pw / 2, top + 2.2, 0.9, pw / 2, top + 2.45, 4.3)
        hip(p, eave, -pw / 2 - 0.7, pw / 2 + 0.7, 0.2, 5.0, top + 2.45, 1.7, ridge=YELLOW_TILE)
    # The tall sign down one side, and shop blades.
    side = 1 if v['seed'] % 2 else -1
    vx = side * (w / 2 - 0.55)
    if h > 9:
        board(p, 'vertical', 'f', vx - 0.45, vx + 0.45, G + 2.4, h - 1.2, 0, 'flat:' + r.choice(['#c99a2e', '#b3261e', '#f4f1e8']), 0.3)
    if w > 7.5:
        blade(s, -vx * 0.7, G + 2.3, min(h - 1.0, G + 2.3 + 3.2 * min(3, floors)), 0.0, 0.8, r.choice(SIGN_COL), r)
    plain_sides(p, x0, x1, d, h, wall)


def restaurant(p, s, v, r):
    """A big restaurant (酒家): three bays under tiers of jade-tile eaves, a gilded name board across the
    middle, dragon-red columns two storeys tall, a glazed banquet floor, a tiled roof pavilion."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall = v.get('wall', 'flat:#e9dcc2')
    G = 7.6
    if v.get('hollow'):
        # (Walked into, 2026-11-24: the ground floor's dining room is the game's. Thin walls round it, the door a real
        # opening 2.6 m wide, the floors above solid from 4.2 m.)
        t = 0.3
        p.box(wall, x0, 4.2, 0.6, x1, h, d)
        p.box(wall, x0, 0, 0.6, -1.3, 4.2, 0.6 + t)
        p.box(wall, 1.3, 0, 0.6, x1, 4.2, 0.6 + t)
        p.box(wall, -1.3, 3.0, 0.6, 1.3, 4.2, 0.6 + t)
        p.box(wall, x0, 0, d - t, x1, 4.2, d)
        p.box(wall, x0, 0, 0.6, x0 + t, 4.2, d)
        p.box(wall, x1 - t, 0, 0.6, x1, 4.2, d)
        for sx in (-1, 1):
            quad(p, 'windowDim', 'f', min(sx * 1.6, sx * (w / 2 - 0.8)), max(sx * 1.6, sx * (w / 2 - 0.8)), 0.45, 3.5, 0.59, col=WARM)
        p.box(GOLD, -1.5, 0, 0.5, -1.3, 3.2, 0.6)
        p.box(GOLD, 1.3, 0, 0.5, 1.5, 3.2, 0.6)
        p.box(GOLD, -1.5, 3.0, 0.5, 1.5, 3.2, 0.6)
        mark('door', 0.0, 0.0, 0.75, 2.6, 3.0)
    else:
        p.box(wall, x0, 0, 0.6, x1, h, d)
    # Two storeys of columns before the front, a grand door between.
    cols = [x0 + 0.4, x0 + w * 0.33, x1 - w * 0.33, x1 - 0.4]
    for cx in cols:
        p.box(RED, cx - 0.32, 0, -0.4, cx + 0.32, G, 0.24)
        p.box(GRANITE_W, cx - 0.4, 0, -0.48, cx + 0.4, 0.6, 0.32)
        p.box(GOLD, cx - 0.36, G - 0.5, -0.44, cx + 0.36, G - 0.3, 0.28)
    if not v.get('hollow'):
        quad(p, 'windowDim', 'f', x0 + 0.8, x1 - 0.8, 0.45, 3.5, 0.6, col=WARM)
        p.box(GOLD, -1.6, 0, 0.5, 1.6, 3.2, 0.6)
        p.box(RED_DK, -1.45, 0, 0.45, 1.45, 3.0, 0.55)
    eave_strip(p, x0, x1, 3.9, 0.7, JADE, 0.3)
    for c in rows(x0 + 0.8, x1 - 0.8, 2.4):
        lattice_window(p, c - 0.85, c + 0.85, 4.6, 6.8, 0.6, GOLD)
    lanterns(p, x0 + 0.9, x1 - 0.9, 3.0, -0.6, 2.2)
    # The great board between the column heads, the first tier of eave over it.
    board(p, 'name', 'f', -w * 0.3, w * 0.3, G + 0.25, G + 1.75, -0.4, 'flat:#7d1a14', 0.14)
    p.box(GOLD, -w * 0.3 - 0.15, G + 0.1, -0.6, w * 0.3 + 0.15, G + 0.25, -0.4)
    p.box(GOLD, -w * 0.3 - 0.15, G + 1.75, -0.6, w * 0.3 + 0.15, G + 1.9, -0.4)
    eave_strip(p, x0 - 0.3, x1 + 0.3, G + 2.3, 1.4, JADE, 0.55)
    # Banquet floors above.
    floors = max(1, int((h - G - 2.8) / 3.4))
    for f in range(floors):
        y = G + 2.8 + f * 3.4
        quad(p, WINDOW, 'f', x0 + 0.8, x1 - 0.8, y + 0.7, y + 2.7, 0.6)
        for c in rows(x0 + 0.8, x1 - 0.8, 1.6):
            p.box(GOLD, c - 0.8 - 0.04, y + 0.7, 0.52, c - 0.8 + 0.04, y + 2.7, 0.58)
        railing(p, x0 + 0.6, x1 - 0.6, y, -0.3, RED)
        p.box(GRANITE_W, x0 + 0.6, y - 0.12, -0.5, x1 - 0.6, y, 0.6)
    eave_strip(p, x0 - 0.2, x1 + 0.2, h - 0.7, 1.0, JADE, 0.5)
    hip(p, JADE, -w * 0.32, w * 0.32, 1.0, 7.0, h + 2.6, 2.0, ridge=YELLOW_TILE)
    for cx in (-w * 0.28, w * 0.28):
        for cz in (1.6, 6.4):
            p.box(RED, cx - 0.18, h, cz - 0.18, cx + 0.18, h + 2.6, cz + 0.18)
    vx = x1 - 0.7
    board(p, 'vertical', 'f', vx - 0.5, vx + 0.5, G + 2.9, h - 1.4, -0.4, 'flat:#c99a2e', 0.3)
    plain_sides(p, x0, x1, d, h, wall, 0.0)


def paifang(p, s, v, r):
    """A 牌楼 gate over a street, read from both ends: four red columns on stone (two in the narrow
    gates), a gilded board between the middle ones, a tiled roof over each bay, the middle one high."""
    w, h = v['w'], v['h']
    zc = v['d'] / 2
    main = v['main']          # half the middle opening
    four = v.get('four', True)
    col_h = h - 3.2
    xs = [-main - 0.3, main + 0.3] + ([-w / 2 + 0.3, w / 2 - 0.3] if four else [])
    for i, cx in enumerate(xs):
        ch = col_h if i < 2 else col_h - 1.8
        p.box(RED, cx - 0.3, 0, zc - 0.3, cx + 0.3, ch, zc + 0.3)
        p.box(GRANITE_W, cx - 0.45, 0, zc - 0.7, cx + 0.45, 0.9, zc + 0.7)
        p.box(GRANITE_W, cx - 0.2, 0.9, zc - 0.55, cx + 0.2, 1.5, zc + 0.55)
        p.box(GOLD, cx - 0.33, ch - 0.6, zc - 0.33, cx + 0.33, ch - 0.45, zc + 0.33)
    # Beams: a lintel and a frieze between the middle columns, the board between them.
    for y0, y1, m in ((col_h - 2.6, col_h - 2.35, RED_DK), (col_h - 0.5, col_h, JADE), (col_h - 0.75, col_h - 0.5, GOLD)):
        p.box(m, -main - 0.6, y0, zc - 0.25, main + 0.6, y1, zc + 0.25)
    bw = min(main * 1.2, 4.6)
    p.box(GOLD, -bw / 2 - 0.12, col_h - 2.35, zc - 0.2, bw / 2 + 0.12, col_h - 0.75, zc + 0.2)
    p.box(RED_DK, -bw / 2, col_h - 2.25, zc - 0.22, bw / 2, col_h - 0.85, zc + 0.22)
    mark('name', 0, col_h - 1.55, zc - 0.24, bw - 0.2, 1.3, (0, -1))
    mark('name_b', 0, col_h - 1.55, zc + 0.24, bw - 0.2, 1.3, (0, 1))
    # Painted brackets (dougong) under the roof: stepped gold and jade blocks.
    for c in rows(-main, main, 0.9):
        p.box(JADE_LT, c - 0.18, col_h, zc - 0.45, c + 0.18, col_h + 0.3, zc + 0.45)
        p.box(GOLD, c - 0.26, col_h + 0.3, zc - 0.6, c + 0.26, col_h + 0.5, zc + 0.6)
    hip(p, JADE, -main - 1.3, main + 1.3, zc - 1.25, zc + 1.25, col_h + 0.6, 1.7, 0.55, ridge=YELLOW_TILE)
    if four:
        for sx in (-1, 1):
            a, e = sorted((sx * (main + 0.3), sx * (w / 2 - 0.3)))
            ys = col_h - 1.8
            p.box(RED_DK, a, ys - 1.4, zc - 0.2, e, ys - 1.2, zc + 0.2)
            p.box(JADE, a, ys - 0.4, zc - 0.22, e, ys, zc + 0.22)
            hip(p, JADE, a - 0.4, e + 0.4, zc - 1.0, zc + 1.0, ys + 0.2, 1.1, 0.4, ridge=YELLOW_TILE, ends=False)


def byo(p, s, v, r):
    """The temple's hall (海安廟): a granite terrace with steps, a red-columned porch, fret-latticed
    walls, two tiers of yellow-glazed roof with a dragon-crested ridge."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    T = 1.2
    p.box(GRANITE_W, x0, 0, 0, x1, T, d)
    for k in range(6):
        p.box(GRANITE_W, -3.2, 0, -1.8 + k * 0.3, 3.2, T * (k + 1) / 6, -1.5 + k * 0.3 + 0.3)
    for sx in (-1, 1):
        p.box('flat:#d6d0c4', sx * 3.2 - 0.25, 0, -1.8, sx * 3.2 + 0.25, T + 0.9, 0.2)
    p.box('flat:#d6d0c4', x0, T, 0, x0 + 0.25, T + 0.9, d)
    p.box('flat:#d6d0c4', x1 - 0.25, T, 0, x1, T + 0.9, d)
    hx0, hx1, hz0, hz1 = x0 + 2.0, x1 - 2.0, 3.5, d - 1.5
    p.box('flat:#8d2a1f', hx0, T, hz0, hx1, T + 6.0, hz1)
    for c in rows(hx0 + 0.5, hx1 - 0.5, 3.0):
        if abs(c) < 2.0:
            p.box(GOLD, c - 1.25, T, hz0 - 0.08, c + 1.25, T + 3.6, hz0)
            p.box(RED_DK, c - 1.1, T, hz0 - 0.1, c + 1.1, T + 3.45, hz0 - 0.05)
            continue
        lattice_window(p, c - 1.1, c + 1.1, T + 0.9, T + 3.9, hz0, GOLD)
    for c in rows(hx0 - 0.6, hx1 + 0.6, 3.4):
        p.box(RED, c - 0.24, T, 1.6 - 0.24, c + 0.24, T + 5.6, 1.6 + 0.24)
        p.box(GOLD, c - 0.28, T + 5.0, 1.6 - 0.28, c + 0.28, T + 5.2, 1.6 + 0.28)
    p.box(RED_DK, hx0 - 0.6, T + 5.2, 1.3, hx1 + 0.6, T + 5.6, 1.9)
    board(p, 'name', 'f', -2.6, 2.6, T + 4.15, T + 5.15, hz0, 'flat:#1d1d1d', 0.1)
    hip(p, YELLOW_TILE, x0 + 0.4, x1 - 0.4, 0.4, d + 0.6, T + 6.0, 1.4, 0.6, ridge=JADE, ends=False)
    p.box('flat:#8d2a1f', hx0 + 1.5, T + 6.6, hz0 + 1.0, hx1 - 1.5, T + 8.4, hz1 - 1.0)
    hip(p, YELLOW_TILE, hx0 - 0.3, hx1 + 0.3, hz0 - 0.6, hz1 + 0.6, T + 8.4, 3.0, 0.8, ridge=JADE)
    # Dragons' crests on the ridge: a pearl between two curled horns.
    ry = T + 8.4 + 3.0 + 0.3
    p.cyl(GOLD, (0, ry + 0.5, (hz0 + hz1) / 2), 1, 0.35, 0.7, seg=10)
    for sx in (-1, 1):
        p.box(JADE_LT, sx * 1.0 - 0.6, ry, (hz0 + hz1) / 2 - 0.1, sx * 1.0 + 0.6, ry + 0.35, (hz0 + hz1) / 2 + 0.1)
        p.box(JADE_LT, sx * 1.5 - 0.15, ry + 0.3, (hz0 + hz1) / 2 - 0.1, sx * 1.5 + 0.15, ry + 0.9, (hz0 + hz1) / 2 + 0.1)


def byomon(p, s, v, r):
    """The temple's gate: a hall-like gate of three bays on granite, its middle bay open, red doors
    pinned back, a name board under a yellow-tiled roof."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(GRANITE_W, x0, 0, 0, x1, 0.45, d)
    m = 2.2
    for sx in (-1, 1):
        a, e = sorted((sx * m, sx * (w / 2 - 0.2)))
        p.box('flat:#8d2a1f', a, 0.45, 1.0, e, 4.8, d - 1.0)
        lattice_window(p, a + 0.6, e - 0.6, 1.6, 3.8, 1.0, GOLD)
        p.box(RED, sx * m - 0.25, 0.45, 0.6, sx * m + 0.25, 5.3, 1.1)
        p.box(RED_DK, sx * (m - 0.05) - 0.06, 0.45, 1.05, sx * (m - 0.05) + 0.06, 3.9, 2.0)
    p.box(RED_DK, -m - 0.25, 4.6, 0.6, m + 0.25, 5.3, d - 0.6)
    board(p, 'name', 'f', -1.7, 1.7, 3.95, 4.55, 0.6, 'flat:#1d1d1d', 0.1)
    hip(p, YELLOW_TILE, x0 - 0.6, x1 + 0.6, -0.5, d + 0.5, 5.3, 2.0, 0.6, ridge=JADE)


def koro(p, s, v, r):
    """A bronze incense burner on three legs in the courtyard, a lid with a knob."""
    zc = v['d'] / 2
    BR = 'flat:#5a4a32'
    p.box(GRANITE_W, -0.9, 0, zc - 0.9, 0.9, 0.35, zc + 0.9)
    for a in (0.0, 2.094, 4.189):
        lx, lz = 0.45 * math.cos(a), zc + 0.45 * math.sin(a)
        p.box(BR, lx - 0.07, 0.35, lz - 0.07, lx + 0.07, 0.9, lz + 0.07)
    p.cyl(BR, (0, 1.2, zc), 1, 0.62, 0.7, seg=14)
    p.cyl(BR, (0, 1.6, zc), 1, 0.7, 0.1, seg=14)
    for sx in (-1, 1):
        p.box(BR, sx * 0.62, 1.3, zc - 0.06, sx * 0.82, 1.75, zc + 0.06)
    p.cyl(BR, (0, 1.9, zc), 1, 0.45, 0.5, seg=12)
    p.cyl(GOLD, (0, 2.25, zc), 1, 0.12, 0.25, seg=8)


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(v['seed'])
    {'shop': shop, 'rest': restaurant, 'paifang': paifang, 'byo': byo, 'byomon': byomon, 'koro': koro}[v['style']](body, signs, v, r)
    return body, signs


def build_lo(v):
    return None


D = 14.0
VARIANTS = [
    # Shop houses (1950s-80s rebuilds of the 1890s rows).
    dict(id='shop_a', style='shop', w=6.4, h=9.6, eave=JADE, seed=1),
    dict(id='shop_b', style='shop', w=7.6, h=13.0, eave=JADE, balcony=True, seed=2),
    dict(id='shop_c', style='shop', w=8.8, h=16.2, eave=TEAL, wall='flat:#e2d6bd', balcony=True, pavilion=True, seed=3),
    dict(id='shop_d', style='shop', w=6.0, h=12.8, eave=JADE, wall='flat:#d9c9a8', board='#c99a2e', seed=4),
    dict(id='shop_e', style='shop', w=9.6, h=19.4, eave=JADE, wall='flat:#efe8d8', frame=GOLD, balcony=True, seed=5),
    dict(id='shop_f', style='shop', w=7.0, h=10.0, eave=TEAL, wall='flat:#c9b48f', board='#1d3550', seed=6),
    dict(id='shop_g', style='shop', w=10.6, h=13.0, eave=JADE, wall='flat:#e6d2c0', pavilion=True, seed=7),
    dict(id='shop_h', style='shop', w=5.4, h=9.4, eave=YELLOW_TILE, wall='flat:#e8e0cf', board='#2f6b4f', seed=8),
    # Restaurants (酒家).
    dict(id='rest_a', style='rest', w=16.0, h=17.5, seed=21),
    dict(id='rest_b', style='rest', w=13.0, h=14.0, wall='flat:#f0e6cf', seed=22),
    # The one walked into (stage 4, 2026-11-24): its dining room is the game's (tosen-street.ts).
    dict(id='hanten', style='rest', w=16.0, h=15.0, wall='flat:#efe2c6', hollow=True, seed=23),
    # Gates: the great one (12 m street) and the narrow ones (8 m).
    dict(id='paifang_a', style='paifang', w=12.6, d=2.6, h=11.6, main=2.8, seed=31),
    dict(id='paifang_b', style='paifang', w=8.6, d=2.4, h=9.8, main=3.6, four=False, seed=32),
    # The temple.
    dict(id='byo', style='byo', w=22.0, d=18.0, h=13.0, seed=41),
    dict(id='byomon', style='byomon', w=11.0, d=5.0, h=7.3, seed=42),
    dict(id='koro', style='koro', w=1.8, d=1.8, h=2.4, seed=43),
]
for _v in VARIANTS:
    _v.setdefault('d', D)
    _v['gap'] = 4.0


if __name__ == '__main__':
    run('tosen', VARIANTS, build_hi, build_lo)
    write_anchors('tosen')
