# Builds 鴎ヶ丘 Kamome-ga-oka, the foreign quarter on the bluff above Kawaminato's port (2026-11-24, stage 3 of the
# north districts; after Kobe's Kitano and Nagasaki's Minami-Yamate, everything named invented): the western
# merchants' houses (異人館) in painted clapboard with verandas, bay windows and a corner tower; the old
# consulate; the Harrington House (旧ハリントン邸, a museum: built hollow, its rooms are the game's); the Gothic
# church 川湊天主堂 (hollow too, its nave the game's); the brick mission girls' school 鴎ヶ丘女学院 with its clock
# gable; the lookout park's gazebo.
#
#   blender --background --python tools/blender/build_kamome.py -- [--renders <dir>]
#
# Writes assets/buildings/kamome.blend, public/models/buildings/kamome.glb and src/stations/anchors/kamome.ts.
# Frame as every building script's: front at z = 0 facing -z, origin mid-frontage at ground level. A hollow
# building's door is a real opening, marked 'door' (its middle at the sill).

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

SLATE = 'flat:#3d4249'
SLATE_L = 'flat:#535961'
TRIM = 'flat:#f4f1e8'
SHUT = 'flat:#2f5a46'
BRICK_R = 'flat:#8d4634'
BRICK_RD = 'flat:#6d3426'
STONE_C = 'flat:#c9c1ae'
STONE_CD = 'flat:#a39a86'
CHIMNEY = 'flat:#7a4a3a'
IRON = 'flat:#25282b'
GLASS_S = ['flat:#2f4f9a', 'flat:#a02a2a', 'flat:#c9a227', 'flat:#2f7a4a', 'flat:#6a3a8a']


def clap(p, x0, x1, y0, y1, z, col):
    """Clapboard: shadow lines up a front at z."""
    y = y0 + 0.25
    while y < y1 - 0.1:
        p.box(col, x0, y, z - 0.03, x1, y + 0.03, z)
        y += 0.24


def sash(p, x, y, z, w=1.0, h=1.7, shutters=True, face_out=-1):
    """A tall sash window with a white frame and green louvred shutters folded back."""
    quad(p, WINDOW, 'f', x - w / 2, x + w / 2, y, y + h, z - 0.01)
    p.box(TRIM, x - w / 2 - 0.08, y - 0.1, z - 0.06, x + w / 2 + 0.08, y, z)
    p.box(TRIM, x - w / 2 - 0.12, y + h, z - 0.08, x + w / 2 + 0.12, y + h + 0.14, z)
    p.box(TRIM, x - 0.03, y, z - 0.04, x + 0.03, y + h, z - 0.01)
    p.box(TRIM, x - w / 2, y + h / 2 - 0.03, z - 0.04, x + w / 2, y + h / 2 + 0.03, z - 0.01)
    if shutters:
        for s in (-1, 1):
            a = x + s * (w / 2 + 0.06)
            p.box(SHUT, min(a, a + s * w / 2), y, z - 0.05, max(a, a + s * w / 2), y + h, z - 0.02)
            for k in range(int(h / 0.12)):
                p.box('flat:#24473a', min(a, a + s * w / 2), y + 0.06 + k * 0.12, z - 0.07, max(a, a + s * w / 2), y + 0.08 + k * 0.12, z - 0.05)


def side_sashes(p, w, d, y0s, x0, x1):
    for face, a0, a1, at in sides(x0, x1, 0, d, 'lrb'):
        for y in y0s:
            for c in rows(a0 + 1.4, a1 - 1.4, 2.8):
                pt = wpt(face, c, y, at)
                quad(p, WINDOW, face, c - 0.45, c + 0.45, y, y + 1.6, out(face, at, 0.01))
                pass


def hip_roof(p, mat, x0, x1, z0, z1, y, rise, over=0.5):
    """A plain hipped roof with eaves `over` out all round, its underside boarded."""
    x0, x1, z0, z1 = x0 - over, x1 + over, z0 - over, z1 + over
    inset = min((z1 - z0) / 2, (x1 - x0) / 2 - 0.1)
    rx0, rx1, rz = x0 + inset, x1 - inset, (z0 + z1) / 2
    yt = y + rise
    p.face(mat, [(x0, y, z0), (x1, y, z0), (rx1, yt, rz), (rx0, yt, rz)], (0, 1, -1))
    p.face(mat, [(x1, y, z1), (x0, y, z1), (rx0, yt, rz), (rx1, yt, rz)], (0, 1, 1))
    p.face(mat, [(x0, y, z1), (x0, y, z0), (rx0, yt, rz)], (-1, 1, 0))
    p.face(mat, [(x1, y, z0), (x1, y, z1), (rx1, yt, rz)], (1, 1, 0))
    p.face(TRIM, [(x0, y, z0), (x0, y, z1), (x1, y, z1), (x1, y, z0)], (0, -1, 0))
    p.box(TRIM, x0, y - 0.2, z0, x1, y, z0 + 0.1)


def veranda(p, x0, x1, depth, h1, h2, cols=None, glazed=False, deck=0.45):
    """A two-storey veranda across the front: slim columns, a balustrade upstairs, a floor between; glazed in
    upstairs (a sun room) when `glazed`."""
    p.box(TRIM, x0, 0, -depth, x1, deck, 0)
    p.box(TRIM, x0, h1 - 0.25, -depth, x1, h1, 0)
    p.box(TRIM, x0, h2 - 0.3, -depth - 0.1, x1, h2, 0)
    n = cols or max(3, int((x1 - x0) / 2.6) + 1)
    for k in range(n):
        c = x0 + 0.15 + (x1 - x0 - 0.3) * k / (n - 1)
        p.box(TRIM, c - 0.13, 0.45, -depth + 0.05, c + 0.13, h2 - 0.3, -depth + 0.31)
        p.box(TRIM, c - 0.2, h1 - 0.45, -depth, c + 0.2, h1 - 0.25, -depth + 0.36)
    if glazed:
        quad(p, WINDOW, 'f', x0 + 0.3, x1 - 0.3, h1 + 0.9, h2 - 0.5, -depth + 0.15)
        for c in rows(x0 + 0.3, x1 - 0.3, 0.9):
            p.box(TRIM, c - 0.45 - 0.03, h1 + 0.9, -depth + 0.1, c - 0.45 + 0.03, h2 - 0.5, -depth + 0.18)
    p.box(TRIM, x0, h1 + 0.95, -depth + 0.1, x1, h1 + 1.02, -depth + 0.22)
    for c in rows(x0 + 0.2, x1 - 0.2, 0.22):
        p.box(TRIM, c - 0.03, h1, -depth + 0.13, c + 0.03, h1 + 0.95, -depth + 0.19)


def chimney(p, x, z, y, h):
    p.box(CHIMNEY, x - 0.45, y - 1.0, z - 0.35, x + 0.45, y + h, z + 0.35)
    p.box(CHIMNEY, x - 0.55, y + h - 0.2, z - 0.45, x + 0.55, y + h, z + 0.45)


def ijin(p, s, v, r):
    """A merchant's house of the 1890s-1900s: painted clapboard, white trim, green shutters, a two-storey
    veranda (glazed upstairs on some), a canted bay window, a slate hipped roof with brick chimneys, and on
    some an octagonal corner tower with a pointed cap."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall, rib = v['wall'], v.get('rib', 'flat:#00000020')
    h1 = h / 2
    vd = v.get('ver', 2.4)
    vx0, vx1 = v.get('vx', (x0 + 0.6, x1 - 0.6))
    p.box(wall, x0, 0, 0, x1, h, d)
    p.box(STONE_CD, x0 - 0.05, 0, -0.05, x1 + 0.05, 0.6, d + 0.05)
    clap(p, x0, x1, 0.6, h, 0, v.get('ribc', 'flat:#00000018') if False else v.get('ribc', STONE_CD))
    for f, y in enumerate((1.1, h1 + 0.7)):
        for c in rows(x0 + 1.2, x1 - 1.2, 2.6):
            if f == 0 and abs(c) < 1.0:
                continue
            sash(p, c, y, 0.0, 1.0, 1.9)
    # The front door under the veranda: a panelled door with a fanlight.
    p.box('flat:#4a2f22', -0.7, 0.6, -0.04, 0.7, 3.0, 0)
    p.box(WINDOW, -0.7, 3.05, -0.05, 0.7, 3.4, -0.01)
    if v.get('veranda', True):
        veranda(p, vx0, vx1, vd, h1 + 0.2, h, glazed=v.get('glazed', False))
    if v.get('bay'):
        bx = v['bay']
        p.prism(wall, [(bx - 1.6, 0), (bx - 1.0, -1.0), (bx + 1.0, -1.0), (bx + 1.6, 0)], 'z', 0.6, h1)
        quad(p, WINDOW, 'f', bx - 0.8, bx + 0.8, 1.2, h1 - 0.6, -1.01)
        p.prism(SLATE, [(bx - 1.8, 0), (bx - 1.1, -1.2), (bx + 1.1, -1.2), (bx + 1.8, 0)], 'z', h1, h1 + 0.5)
    hip_roof(p, SLATE, x0, x1, 0, d, h, v.get('rise', 3.2))
    for cx, cz in v.get('chimneys', ((x0 + 2.0, d * 0.6), (x1 - 2.0, d * 0.4))):
        chimney(p, cx, cz, h + 1.4, 2.2)
    if v.get('tower'):
        tx = v['tower']
        p.cyl(wall, (tx, (h + 2.2) / 2, 1.2), 1, 2.0, h + 2.2, seg=8)
        for y in (1.2, h1 + 0.8, h + 0.4):
            for k in range(8):
                a = 2 * math.pi * (k + 0.5) / 8
                if math.sin(a) > -0.2:
                    continue
            quad(p, WINDOW, 'f', tx - 0.45, tx + 0.45, y, y + 1.4, 1.2 - 2.0)
        p.cyl(SLATE, (tx, h + 2.3, 1.2), 1, 2.25, 0.2, seg=8)
        for k in range(6):
            rr = 2.2 * (1 - k / 6)
            p.cyl(SLATE, (tx, h + 2.4 + k * 0.6 + 0.3, 1.2), 1, max(0.1, rr), 0.6, seg=8)
        p.box(IRON, tx - 0.04, h + 6.0, 1.16, tx + 0.04, h + 7.4, 1.24)
    backs(p, w, d, [h1, h], r, sides=(-1, 1), back=True)


def shell_walls(p, mat, x0, x1, z0, z1, y0, y1, t, door=None):
    """Four thin walls round a hollow storey, a gap in the front for the door (x0d, x1d, height)."""
    if door:
        a, e, dh = door
        p.box(mat, x0, y0, z0, a, y1, z0 + t)
        p.box(mat, e, y0, z0, x1, y1, z0 + t)
        p.box(mat, a, y0 + dh, z0, e, y1, z0 + t)
    else:
        p.box(mat, x0, y0, z0, x1, y1, z0 + t)
    p.box(mat, x0, y0, z1 - t, x1, y1, z1)
    p.box(mat, x0, y0, z0, x0 + t, y1, z1)
    p.box(mat, x1 - t, y0, z0, x1, y1, z1)


def harrington(p, s, v, r):
    """The Harrington House (1902): a merchant's house kept as a museum, hollow: its two storeys are walls,
    a floor between and a roof, the rooms the game's. Pale green clapboard, a two-storey veranda glazed in
    upstairs (the sun room), an octagonal tower at the +x corner, the door a real opening."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall = v['wall']
    h1 = 4.2
    t = 0.3
    shell_walls(p, wall, x0, x1, 0, d, 0, h1, t, door=(-0.75, 0.75, 2.6))
    # Upstairs: a door in the middle of the front onto the glazed veranda (the sun room).
    shell_walls(p, wall, x0, x1, 0, d, h1 + 0.25, h, t, door=(-1.0, 1.0, 2.3))
    # The floor between, a stairwell cut in it along the -x wall at the back (x0+0.3 … x0+1.6, z 5.5 … d-0.3).
    p.box(wall, x0, h1, 0, x1, h1 + 0.25, 5.5)
    p.box(wall, x0 + 1.6, h1, 5.5, x1, h1 + 0.25, d)
    p.box(wall, x0, h1, 5.5, x0 + 0.3, h1 + 0.25, d)
    mark('stair', x0 + 0.95, h1 + 0.25, 5.5, 1.3, d - 0.3 - 5.5)
    p.box(STONE_CD, x0 - 0.05, 0, -0.05, x1 + 0.05, 0.3, 0.02)
    clap(p, x0, x1, 0.4, h, 0, STONE_CD)
    for y in (1.0, h1 + 1.0):
        for c in rows(x0 + 1.2, x1 - 1.2, 2.6):
            if y < h1 and abs(c) < 1.2:
                continue
            sash(p, c, y, 0.0, 1.0, 1.9)
    p.box(TRIM, -0.95, 0, -0.08, -0.75, 2.8, 0.3)
    p.box(TRIM, 0.75, 0, -0.08, 0.95, 2.8, 0.3)
    p.box(TRIM, -0.95, 2.6, -0.08, 0.95, 2.8, 0.3)
    p.box(WINDOW, -0.75, 2.85, -0.06, 0.75, 3.3, -0.01)
    mark('door', 0.0, 0.0, 0.15, 1.5, 2.6)
    veranda(p, x0 + 0.6, x1 - 4.4, 2.6, h1 + 0.25, h, glazed=True, deck=0.28)
    # The tower on the +x corner, standing out of the roof.
    tx, tz = x1 - 1.9, 1.9
    p.cyl(wall, (tx, (h + 3.0) / 2, tz), 1, 2.2, h + 3.0, seg=8)
    for y in (1.2, h1 + 1.0, h + 0.8):
        quad(p, WINDOW, 'f', tx - 0.5, tx + 0.5, y, y + 1.5, tz - 2.04)
    for k in range(6):
        rr = 2.5 * (1 - k / 6)
        p.cyl(SLATE, (tx, h + 3.1 + k * 0.65 + 0.3, tz), 1, max(0.1, rr), 0.65, seg=8)
    p.box(IRON, tx - 0.04, h + 7.0, tz - 0.04, tx + 0.04, h + 8.8, tz + 0.04)
    p.box(IRON, tx - 0.5, h + 8.4, tz - 0.03, tx + 0.5, h + 8.48, tz + 0.03)
    hip_roof(p, SLATE, x0, x1, 0, d, h, 3.4)
    chimney(p, x0 + 2.0, d * 0.6, h + 1.4, 2.2)
    board(p, 'name', 'f', -2.4, 2.4, h1 - 0.1, h1 + 0.4, -2.65, 'flat:#2f5a46', 0.06)
    for face, a0, a1, at in sides(x0, x1, 0, d, 'lrb'):
        for y in (1.0, h1 + 1.0):
            for c in rows(a0 + 1.4, a1 - 1.4, 2.8):
                quad(p, WINDOW, face, c - 0.5, c + 0.5, y, y + 1.8, out(face, at, 0.01))


def consulate(p, s, v, r):
    """The old consulate (1908): white stucco on a stone base, a colonnade of paired columns on both storeys,
    a pediment over the middle, a flag mast on the roof, iron gates (the game's)."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(v['wall'], x0, 0, 0, x1, h, d)
    p.box(STONE_C, x0 - 0.1, 0, -0.1, x1 + 0.1, 1.0, d + 0.1)
    h1 = h / 2
    p.box(STONE_C, x0, 0, -3.0, x1, 1.0, 0)
    for f in range(2):
        y = 1.0 + f * h1
        for c in rows(x0 + 0.6, x1 - 0.6, 3.0):
            for dx in (-0.35, 0.35):
                p.cyl(TRIM, (c + dx, y + (h1 - 1.2) / 2, -2.6), 1, 0.2, h1 - 1.2, seg=10)
        p.box(TRIM, x0, y + h1 - 1.2, -3.0, x1, y + h1 - 0.9, 0)
        for c in rows(x0 + 1.2, x1 - 1.2, 3.0):
            sash(p, c, y + 0.6, 0.0, 1.1, 2.1, shutters=False)
    p.box(TRIM, x0 + 0.6, 1.0 + h1 + 0.1, -2.9, x1 - 0.6, 1.0 + h1 + 1.1, -2.85)
    p.prism(TRIM, [(-w * 0.22, h), (0, h + 2.4), (w * 0.22, h)], 'z', -3.0, -2.6)
    p.box(TRIM, x0 - 0.2, h - 0.3, -3.1, x1 + 0.2, h, d + 0.2)
    hip_roof(p, SLATE, x0, x1, 0, d, h, 2.6, 0.3)
    p.box(IRON, 0.0, h + 2.4, d / 2, 0.08, h + 9.0, d / 2 + 0.08)
    p.box('flat:#1d3550', 0.08, h + 7.2, d / 2, 1.8, h + 8.4, d / 2 + 0.04)
    board(p, 'name', 'f', -3.0, 3.0, h + 0.4, h + 1.1, -3.0, 'flat:#2a2622', 0.08)
    backs(p, w, d, [h1, h], r, sides=(-1, 1), back=True)


def church(p, s, v, r):
    """川湊天主堂 (1879, rebuilt 1912): a Gothic church in grey stone, hollow: a nave with lancet windows
    between buttresses, a steep slate roof, the bell tower over the west door with a spire and a cross, a
    rose window over the door, the door a real opening."""
    w, d, h = v['w'], v['d'], v['h']   # w: the nave's width; d: its length; h: its eaves
    x0, x1 = -w / 2, w / 2
    t = 0.6
    T = 7.0                            # the tower's square, standing before the nave
    zt = T                             # the nave begins behind the tower
    shell_walls(p, STONE_C, x0, x1, zt, d, 0, h, t, door=(-1.2, 1.2, 4.6))
    # Buttresses and lancets down both sides; stained glass on the inner face of each.
    for c in rows(zt + 2.0, d - 2.0, 4.0):
        for sx in (-1, 1):
            xw = sx * w / 2
            p.box(STONE_CD, min(xw, xw + sx * 0.9), 0, c + 1.6, max(xw, xw + sx * 0.9), h - 1.5, c + 2.4)
            face = 'r' if sx > 0 else 'l'
            quad(p, WINDOW, face, c - 0.6, c + 0.6, 2.5, h - 2.0, xw + sx * 0.01)
            p.box(GLASS_S[int(abs(c)) % len(GLASS_S)], min(xw - sx * t - sx * 0.03, xw - sx * t), 2.5, c - 0.6, max(xw - sx * t - sx * 0.03, xw - sx * t), h - 2.0, c + 0.6)
            for k, y in enumerate((h - 2.0, h - 1.6, h - 1.3)):
                ww = 0.6 - k * 0.2
                quad(p, WINDOW, face, c - ww, c + ww, y, y + 0.4, xw + sx * 0.01)
    # The steep roof over the nave (its underside the nave's ceiling).
    p.prism(SLATE, [(x0 - 0.6, h - 0.2), (0, h + w * 0.75), (x1 + 0.6, h - 0.2), (x1 + 0.6, h - 0.5), (0, h + w * 0.75 - 0.4), (x0 - 0.6, h - 0.5)], 'z', zt, d + 0.4)
    p.prism(STONE_C, [(x0, h), (0, h + w * 0.75 - 0.3), (x1, h)], 'z', d - t, d)
    # The apse window over the altar: a tall lancet in colour.
    p.box(GLASS_S[0], -1.0, 3.0, d - t - 0.03, 1.0, h + 2.0, d - t)
    # The tower: hollow below (the porch the door opens into), solid above, belfry openings, spire, cross.
    p.box(STONE_C, -T / 2, 0, 0, -1.2, h + 9.0, T)
    p.box(STONE_C, 1.2, 0, 0, T / 2, h + 9.0, T)
    p.box(STONE_C, -1.2, 4.6, 0, 1.2, h + 9.0, T)
    for zz, sx in ((0.3, 0),):
        pass
    p.prism(STONE_CD, [(-1.6, 3.8), (0, 5.4), (1.6, 3.8)], 'z', -0.3, 0.3)
    p.box(STONE_CD, -1.6, 0, -0.3, -1.2, 3.8, 0.3)
    p.box(STONE_CD, 1.2, 0, -0.3, 1.6, 3.8, 0.3)
    mark('door', 0.0, 0.0, 0.4, 2.4, 4.6)
    p.cyl(GLASS_S[1], (0, 8.0, -0.02), 2, 1.6, 0.04, seg=16)
    p.cyl(STONE_CD, (0, 8.0, 0.0), 2, 1.85, 0.1, seg=16)
    for sx in (-1, 1):
        for zz in (0.0, T):
            p.box(STONE_CD, sx * T / 2 - 0.5, 0, zz - 0.5, sx * T / 2 + 0.5, h + 7.0, zz + 0.5)
    yb = h + 9.0
    p.box(STONE_C, -T / 2, yb, 0, T / 2, yb + 5.0, T)
    for face in ('f', 'l', 'r'):
        at = 0.0 if face == 'f' else (-T / 2 if face == 'l' else T / 2)
        for c in ((-1.4, 1.4) if face == 'f' else (T * 0.3, T * 0.7)):
            quad(p, 'flat:#1a1c1f', face, c - 0.5, c + 0.5, yb + 1.0, yb + 4.0, out(face, at, 0.01))
    p.box(STONE_CD, -T / 2 - 0.2, yb + 5.0, -0.2, T / 2 + 0.2, yb + 5.4, T + 0.2)
    pyramid(p, SLATE, -T / 2 + 0.3, T / 2 - 0.3, 0.3, T - 0.3, yb + 5.4, 11.0)
    p.box('flat:#d4a537', -0.06, yb + 16.2, T / 2 - 0.06, 0.06, yb + 18.4, T / 2 + 0.06)
    p.box('flat:#d4a537', -0.6, yb + 17.4, T / 2 - 0.06, 0.6, yb + 17.55, T / 2 + 0.06)
    board(p, 'name', 'f', -2.6, 2.6, 5.7, 6.3, -0.1, 'flat:#2a2622', 0.06)
    mark('clock', 0.0, yb + 2.5, -0.06, 1.6, 1.6)


def school(p, s, v, r):
    """鴎ヶ丘女学院 (1925): a two-storey brick school with stone bands, rows of tall sash windows, a central
    gabled entrance block rising to a clock, a hipped slate roof with dormers."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(BRICK_R, x0, 0, 0, x1, h, d)
    p.box(STONE_C, x0 - 0.05, 0, -0.05, x1 + 0.05, 0.9, d + 0.05)
    for y in (h / 2, h - 0.6):
        p.box(STONE_C, x0 - 0.05, y, -0.08, x1 + 0.05, y + 0.25, d + 0.05)
    for f, y in enumerate((1.4, h / 2 + 0.7)):
        for c in rows(x0 + 1.0, x1 - 1.0, 2.4):
            if abs(c) < 4.5:
                continue
            quad(p, WINDOW, 'f', c - 0.6, c + 0.6, y, y + 2.4, -0.01)
            p.box(STONE_C, c - 0.75, y + 2.4, -0.08, c + 0.75, y + 2.6, 0)
            p.box(TRIM, c - 0.6, y + 1.18, -0.04, c + 0.6, y + 1.22, -0.01)
    # The entrance block: brick with stone quoins, an arched door, the clock in the gable.
    p.box(BRICK_RD, -4.5, 0, -1.6, 4.5, h + 3.0, 0)
    for sx in (-1, 1):
        for y in rows(0.2, h + 2.8, 0.8):
            p.box(STONE_C, sx * 4.5 - 0.35, y - 0.2, -1.7, sx * 4.5 + 0.35, y + 0.15, -1.5)
    arch(p, STONE_C, 'f', -1.6, 1.6, 2.8, 3.8, 4.2, -1.6, 0.3, n=8)
    p.box('flat:#3a2a20', -1.4, 0, -1.65, 1.4, 2.8, -1.6)
    for c in (-2.6, 0.0, 2.6):
        quad(p, WINDOW, 'f', c - 0.55, c + 0.55, h / 2 + 0.7, h / 2 + 3.1, -1.61)
    p.prism(BRICK_RD, [(-4.8, h + 3.0), (0, h + 6.2), (4.8, h + 3.0)], 'z', -1.6, 1.0)
    p.prism(STONE_C, [(-5.0, h + 2.9), (0, h + 6.35), (5.0, h + 2.9), (4.7, h + 2.9), (0, h + 6.0), (-4.7, h + 2.9)], 'z', -1.7, -1.6)
    p.cyl(TRIM, (0, h + 4.2, -1.65), 2, 0.9, 0.06, seg=20)
    mark('clock', 0.0, h + 4.2, -1.7, 1.6, 1.6)
    board(p, 'name', 'f', -3.2, 3.2, 4.4, 5.0, -1.6, 'flat:#e8dcb8', 0.08)
    hip_roof(p, SLATE, x0, x1, 0, d, h, 4.0, 0.6)
    for c in rows(x0 + 4.0, x1 - 4.0, 7.0):
        if abs(c) < 6:
            continue
        p.box(SLATE_L, c - 0.8, h + 0.8, 1.2, c + 0.8, h + 2.2, 2.6)
        quad(p, WINDOW, 'f', c - 0.5, c + 0.5, h + 1.0, h + 2.0, 1.19)
    backs(p, w, d, [h / 2, h], r, sides=(-1, 1), back=True)


def gazebo(p, s, v, r):
    """The lookout's gazebo (東屋): eight white posts on a stone floor, a rail between, an eight-sided copper roof."""
    w = v['w']
    R = w / 2
    p.cyl(STONE_C, (0, 0.15, R), 1, R, 0.3, seg=8)
    for k in range(8):
        a = 2 * math.pi * (k + 0.5) / 8
        x, z = math.cos(a) * (R - 0.4), R + math.sin(a) * (R - 0.4)
        p.box(TRIM, x - 0.12, 0.3, z - 0.12, x + 0.12, 3.0, z + 0.12)
    p.cyl(TRIM, (0, 3.0, R), 1, R, 0.25, seg=8)
    for k in range(5):
        rr = (R + 0.4) * (1 - k / 5)
        p.cyl('flat:#5f8f7d', (0, 3.2 + k * 0.4, R), 1, max(0.1, rr), 0.4, seg=8)
    p.cyl(IRON, (0, 5.4, R), 1, 0.08, 0.8, seg=6)


# ── Added 2026-11-26 (the quarter flattened into a park): smaller houses of the same family, and the park's pieces ──
TIMBER = 'flat:#4a3527'


def gable_roof(p, mat, x0, x1, z0, z1, y, rise, over=0.5, axis='x', wall=TRIM):
    """A gabled roof, its ridge along `axis`, eaves `over` out; the gable ends filled in `wall`."""
    ax0, ax1, az0, az1 = x0 - over, x1 + over, z0 - over, z1 + over
    yt = y + rise
    if axis == 'x':
        zm = (az0 + az1) / 2
        p.face(mat, [(ax0, y, az0), (ax1, y, az0), (ax1, yt, zm), (ax0, yt, zm)], (0, 1, -1))
        p.face(mat, [(ax1, y, az1), (ax0, y, az1), (ax0, yt, zm), (ax1, yt, zm)], (0, 1, 1))
        p.face(wall, [(x0, y, az1), (x0, y, az0), (x0, yt, zm)], (-1, 0, 0))
        p.face(wall, [(x1, y, az0), (x1, y, az1), (x1, yt, zm)], (1, 0, 0))
    else:
        xm = (ax0 + ax1) / 2
        p.face(mat, [(ax0, y, az1), (ax0, y, az0), (xm, yt, az0), (xm, yt, az1)], (-1, 1, 0))
        p.face(mat, [(ax1, y, az0), (ax1, y, az1), (xm, yt, az1), (xm, yt, az0)], (1, 1, 0))
        p.face(wall, [(ax0, y, z0), (ax1, y, z0), (xm, yt, z0)], (0, 0, -1))
        p.face(wall, [(ax1, y, z1), (ax0, y, z1), (xm, yt, z1)], (0, 0, 1))
    p.face(TRIM, [(ax0, y, az0), (ax0, y, az1), (ax1, y, az1), (ax1, y, az0)], (0, -1, 0))


def porch(p, x0, x1, depth, h, roof=SLATE):
    """A single-storey porch: a deck, slim posts, a rail, a lean-to roof."""
    p.box(TRIM, x0, 0, -depth, x1, 0.45, 0)
    n = max(2, int((x1 - x0) / 2.4) + 1)
    for k in range(n):
        c = x0 + 0.15 + (x1 - x0 - 0.3) * k / (n - 1)
        p.box(TRIM, c - 0.1, 0.45, -depth + 0.05, c + 0.1, h, -depth + 0.25)
    p.box(TRIM, x0, h - 0.2, -depth, x1, h, 0)
    p.face(roof, [(x0 - 0.2, h, -depth - 0.3), (x1 + 0.2, h, -depth - 0.3), (x1 + 0.2, h + 0.8, 0), (x0 - 0.2, h + 0.8, 0)], (0, 1, -1))
    for a, e in ((x0, -0.9), (0.9, x1)):
        if e - a > 0.6:
            p.box(TRIM, a, 1.3, -depth + 0.1, e, 1.37, -depth + 0.2)
            for c in rows(a + 0.15, e - 0.15, 0.24):
                p.box(TRIM, c - 0.03, 0.45, -depth + 0.12, c + 0.03, 1.3, -depth + 0.18)


def cottage(p, s, v, r):
    """A gardener's or clerk's cottage: one storey and an attic under a steep gabled roof, a dormer, a porch."""
    w, d, h = v['w'], v['d'], v['eave']
    x0, x1 = -w / 2, w / 2
    wall = v['wall']
    p.box(wall, x0, 0, 0, x1, h, d)
    p.box(STONE_CD, x0 - 0.05, 0, -0.05, x1 + 0.05, 0.5, d + 0.05)
    clap(p, x0, x1, 0.5, h, 0, v['ribc'])
    for c in rows(x0 + 1.3, x1 - 1.3, 2.5):
        if abs(c) > 1.1:
            sash(p, c, 1.0, 0.0, 0.9, 1.6)
    p.box(v.get('door', '#4a2f22') if False else 'flat:#4a2f22', -0.6, 0.5, -0.04, 0.6, 2.6, 0)
    porch(p, -w * 0.3, w * 0.3, 1.8, 2.9)
    rise = v.get('rise', 3.4)
    gable_roof(p, SLATE, x0, x1, 0, d, h, rise, 0.5, 'x', wall)
    # Attic windows in the gable ends, a dormer on the front slope.
    for sx in (x0 - 0.01, x1 + 0.01):
        quad(p, WINDOW, 'l' if sx < 0 else 'r', d / 2 - 0.5, d / 2 + 0.5, h + 0.5, h + 1.8, sx)
    dz = d * 0.22
    p.box(wall, -1.0, h + 0.5, dz - 0.3, 1.0, h + 2.1, d / 2)
    quad(p, WINDOW, 'f', -0.6, 0.6, h + 0.8, h + 1.9, dz - 0.31)
    gable_roof(p, SLATE, -1.0, 1.0, dz - 0.3, d / 2, h + 2.1, 0.8, 0.25, 'z', wall)
    chimney(p, x1 - 1.6, d * 0.5, h + rise - 0.6, 1.8)
    side_sashes(p, w, d, [1.0], x0, x1)


def timber(p, s, v, r):
    """A half-timbered house (a German trader's): white infill between dark posts and braces, a jettied upper
    floor, its gable to the lane."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    h1 = h / 2
    p.box(BRICK_R, x0, 0, 0, x1, h1, d)
    p.box(TRIM, x0 - 0.25, h1, -0.4, x1 + 0.25, h, d)
    p.box(TIMBER, x0 - 0.3, h1 - 0.15, -0.45, x1 + 0.3, h1 + 0.15, d + 0.02)
    p.box(TIMBER, x0 - 0.3, h - 0.2, -0.45, x1 + 0.3, h, -0.38)
    for c in rows(x0 - 0.1, x1 + 0.1, 1.9):
        p.box(TIMBER, c - 0.09, h1, -0.45, c + 0.09, h, -0.39)
    for c in rows(x0 + 1.4, x1 - 1.4, 3.8):
        quad(p, WINDOW, 'f', c - 0.7, c + 0.7, h1 + 0.9, h - 0.6, -0.41)
        p.box(TIMBER, c - 0.8, h1 + 0.8, -0.45, c + 0.8, h1 + 0.9, -0.39)
    for c in rows(x0 + 1.5, x1 - 1.5, 3.2):
        if abs(c) > 1.2:
            quad(p, WINDOW, 'f', c - 0.6, c + 0.6, 1.0, h1 - 0.6, -0.01)
            p.box(STONE_C, c - 0.75, 0.85, -0.06, c + 0.75, 1.0, 0)
    p.box('flat:#2f3d2c', -0.7, 0, -0.04, 0.7, 2.5, 0)
    rise = v.get('rise', 3.8)
    gable_roof(p, 'flat:#7a3b2c', x0 - 0.25, x1 + 0.25, -0.4, d, h, rise, 0.4, 'z', TRIM)
    # The gable's own timbers and a small window.
    for k in (-1, 1):
        p.face(TIMBER, [(k * 0.1 - 0.1, h, -0.42), (k * 0.1 + 0.1, h, -0.42), (k * 0.1 + 0.1, h + rise - 0.3, -0.42), (k * 0.1 - 0.1, h + rise - 0.3, -0.42)], (0, 0, -1))
    quad(p, WINDOW, 'f', -0.5, 0.5, h + 0.5, h + 1.6, -0.43)
    chimney(p, x0 + 1.5, d * 0.6, h + rise * 0.5, 2.6)
    side_sashes(p, w, d, [1.0, h1 + 0.9], x0, x1)


def manse(p, s, v, r):
    """The brick manse: red brick with stone bands and quoins, plain sashes, a hipped slate roof, a small
    columned porch."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    h1 = h / 2
    p.box(BRICK_R, x0, 0, 0, x1, h, d)
    p.box(STONE_CD, x0 - 0.05, 0, -0.05, x1 + 0.05, 0.6, d + 0.05)
    for y in (h1 - 0.1, h - 0.35):
        p.box(STONE_C, x0 - 0.06, y, -0.06, x1 + 0.06, y + 0.3, d + 0.06)
    for sx in (x0, x1):
        for k in range(int(h / 0.7)):
            p.box(STONE_C, sx - 0.3 - 0.04, 0.6 + k * 0.7, -0.05, sx + 0.3 + 0.04, 0.95 + k * 0.7, 0.3)
    for f, y in enumerate((1.2, h1 + 0.8)):
        for c in rows(x0 + 1.4, x1 - 1.4, 2.7):
            if f == 0 and abs(c) < 1.0:
                continue
            sash(p, c, y, 0.0, 1.0, 1.8, shutters=False)
            p.box(STONE_C, c - 0.65, y + 1.8, -0.07, c + 0.65, y + 2.05, 0)
    p.box('flat:#1f2b3a', -0.65, 0.6, -0.04, 0.65, 2.9, 0)
    p.box(STONE_C, -1.5, 0, -1.6, 1.5, 0.6, 0)
    for sx in (-1.25, 1.25):
        p.cyl(TRIM, (sx, 1.85, -1.3), 1, 0.16, 2.5, seg=8)
    p.box(TRIM, -1.6, 3.1, -1.7, 1.6, 3.5, 0)
    hip_roof(p, SLATE, x0, x1, 0, d, h, v.get('rise', 2.8))
    chimney(p, x0 + 1.2, d * 0.5, h + 1.2, 2.4)
    chimney(p, x1 - 1.2, d * 0.5, h + 1.2, 2.4)
    side_sashes(p, w, d, [1.2, h1 + 0.8], x0, x1)


def bungalow(p, s, v, r):
    """A colonial bungalow: one storey under a broad hipped roof that covers a veranda on three sides."""
    w, d, h = v['w'], v['d'], v['h']
    vd = 2.2
    x0, x1 = -w / 2 + vd, w / 2 - vd
    wall = v['wall']
    p.box(TRIM, -w / 2, 0, -0.0, w / 2, 0.5, d)
    p.box(wall, x0, 0.5, vd, x1, h, d)
    clap(p, x0, x1, 0.5, h, vd, v['ribc'])
    for c in rows(x0 + 1.2, x1 - 1.2, 2.4):
        if abs(c) > 1.0:
            sash(p, c, 1.2, vd, 0.9, 1.7)
    p.box('flat:#4a2f22', -0.6, 0.5, vd - 0.04, 0.6, 2.7, vd)
    # Posts round the veranda, a rail between them (open at the steps).
    pts = [(c, 0.12) for c in rows(-w / 2 + 0.2, w / 2 - 0.2, 2.5)] + [(sx, z) for sx in (-w / 2 + 0.12, w / 2 - 0.12) for z in rows(2.4, d - 0.3, 2.6)]
    for (cx, cz) in pts:
        p.box(TRIM, cx - 0.09, 0.5, cz - 0.09, cx + 0.09, h, cz + 0.09)
    for a, e in ((-w / 2, -1.0), (1.0, w / 2)):
        p.box(TRIM, a, 1.35, 0.08, e, 1.42, 0.16)
        for c in rows(a + 0.15, e - 0.15, 0.24):
            p.box(TRIM, c - 0.03, 0.5, 0.09, c + 0.03, 1.35, 0.15)
    p.box(STONE_C, -1.0, 0, -0.6, 1.0, 0.25, 0)
    hip_roof(p, v.get('roof', 'flat:#5b6b5a'), -w / 2, w / 2, 0, d, h, v.get('rise', 2.6), 0.4)
    chimney(p, 0.0, d * 0.6, h + 1.6, 1.6)
    side_sashes(p, w - 2 * vd, d, [1.2], x0, x1)


def bandstand(p, s, v, r):
    """The park's bandstand: an eight-sided stone base with steps, iron columns and a fretted rail, a two-tier
    copper roof with a finial."""
    R = v['w'] / 2
    p.cyl(STONE_C, (0, 0.45, R), 1, R, 0.9, seg=8)
    p.cyl(STONE_CD, (0, 0.92, R), 1, R - 0.15, 0.06, seg=8)
    for k in range(3):
        p.box(STONE_C, -1.2, 0, -0.9 + k * 0.3 + 0.35, 1.2, 0.9 - (2 - k) * 0.3, 0.45 + 0.0)
    for k in range(8):
        a = 2 * math.pi * (k + 0.5) / 8
        x, z = math.cos(a) * (R - 0.45), R + math.sin(a) * (R - 0.45)
        p.cyl('flat:#2f4a3f', (x, 2.65, z), 1, 0.09, 3.5, seg=8)
        p.box('flat:#2f4a3f', x - 0.16, 4.2, z - 0.16, x + 0.16, 4.4, z + 0.16)
        a2 = 2 * math.pi * (k + 1.5) / 8
        x2, z2 = math.cos(a2) * (R - 0.45), R + math.sin(a2) * (R - 0.45)
        if not (math.sin((a + a2) / 2) < -0.9):
            n = 6
            for j in range(n + 1):
                fx, fz = x + (x2 - x) * j / n, z + (z2 - z) * j / n
                p.box('flat:#2f4a3f', fx - 0.025, 0.95, fz - 0.025, fx + 0.025, 1.85, fz + 0.025)
            mx, mz = (x + x2) / 2, (z + z2) / 2
            p.cyl('flat:#2f4a3f', (mx, 1.88, mz), 1, 0.06, 0.06, seg=6)
    p.cyl(TRIM, (0, 4.5, R), 1, R, 0.25, seg=8)
    for k in range(4):
        rr = (R + 0.5) * (1 - k / 5.5)
        p.cyl('flat:#5f8f7d', (0, 4.75 + k * 0.32, R), 1, rr, 0.32, seg=8)
    p.cyl(TRIM, (0, 6.3, R), 1, 1.3, 0.5, seg=8)
    for k in range(4):
        p.cyl('flat:#5f8f7d', (0, 6.7 + k * 0.3, R), 1, max(0.1, 1.7 * (1 - k / 4)), 0.3, seg=8)
    p.cyl(IRON, (0, 8.3, R), 1, 0.06, 0.9, seg=6)


def bridge(p, s, v, r):
    """A low arched footbridge over the pond: a timber deck in short steps, white rails."""
    w, d = v['w'], v['d']
    n = 10
    for k in range(n):
        z0, z1 = d * k / n, d * (k + 1) / n
        y = 0.15 + 0.75 * math.sin(math.pi * (k + 0.5) / n)
        p.box('flat:#8a6a4c', -w / 2, y - 0.18, z0, w / 2, y, z1)
        for sx in (-w / 2 + 0.06, w / 2 - 0.06):
            p.box(TRIM, sx - 0.05, y, z0, sx + 0.05, y + 0.95, z0 + 0.1)
            p.box(TRIM, sx - 0.04, y + 0.88, z0, sx + 0.04, y + 0.95, z1)
            p.box(TRIM, sx - 0.03, y + 0.45, z0, sx + 0.03, y + 0.5, z1)
    for z in (0.3, d - 0.3):
        p.box(STONE_CD, -w / 2 - 0.15, 0, z - 0.3, w / 2 + 0.15, 0.3, z + 0.3)


def pergola(p, s, v, r):
    """A rose pergola: white posts in pairs, beams and rafters over a path, climbers on it."""
    w, d = v['w'], v['d']
    for c in rows(-w / 2 + 0.2, w / 2 - 0.2, 2.4):
        for z in (0.15, d - 0.15):
            p.box(TRIM, c - 0.09, 0, z - 0.09, c + 0.09, 2.6, z + 0.09)
        p.box(TRIM, c - 0.05, 2.75, -0.3, c + 0.05, 2.9, d + 0.3)
        p.box('flat:#4f7a48', c - 0.25, 1.9 + (hash(round(c * 10)) % 3) * 0.1, 0.0, c + 0.25, 2.75, 0.32)
        p.box('flat:#c8527a', c - 0.18, 2.3, -0.02, c + 0.18, 2.6, 0.04)
    for z in (0.15, d - 0.15):
        p.box(TRIM, -w / 2 - 0.3, 2.6, z - 0.07, w / 2 + 0.3, 2.75, z + 0.07)
    p.box('flat:#4f7a48', -w / 2, 2.9, 0.2, w / 2, 3.02, d - 0.2)


STYLES = {'ijin': ijin, 'harrington': harrington, 'consulate': consulate, 'church': church, 'school': school, 'gazebo': gazebo,
          'cottage': cottage, 'timber': timber, 'manse': manse, 'bungalow': bungalow, 'bandstand': bandstand, 'bridge': bridge, 'pergola': pergola}


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(v['seed'])
    STYLES[v['style']](body, signs, v, r)
    return body, signs


def build_lo(v):
    return None


VARIANTS = [
    dict(id='ijin_a', style='ijin', w=15.0, d=12.0, h=8.6, wall='flat:#dfe8df', ribc='flat:#c3cec4', bay=-4.5, vx=(-1.5, 6.9), seed=1),
    dict(id='ijin_b', style='ijin', w=14.0, d=11.0, h=8.4, wall='flat:#f2eee0', ribc='flat:#d9d3c0', glazed=True, tower=4.6, seed=2),
    dict(id='ijin_c', style='ijin', w=17.0, d=12.0, h=8.8, wall='flat:#e7d3a8', ribc='flat:#cdb88e', ver=2.8, seed=3),
    dict(id='ijin_d', style='ijin', w=13.0, d=11.0, h=8.2, wall='flat:#c9d6e2', ribc='flat:#adbccb', veranda=False, bay=0.0, chimneys=((-4.5, 6.0),), seed=4),
    dict(id='ryoji', style='consulate', w=19.0, d=13.0, h=10.0, wall='flat:#f1eee6', seed=5),
    dict(id='harrington', style='harrington', w=16.0, d=13.0, h=8.6, wall='flat:#d7e6d6', seed=6),
    dict(id='church', style='church', w=14.0, d=36.0, h=11.0, seed=7),
    dict(id='school', style='school', w=46.0, d=14.0, h=10.0, seed=8),
    dict(id='gazebo', style='gazebo', w=7.0, d=7.0, h=6.0, seed=9),
    # (2026-11-26: the park quarter's own houses and park pieces.)
    dict(id='ijin_e', style='ijin', w=12.0, d=10.0, h=8.0, wall='flat:#ecd3cf', ribc='flat:#d3b6b1', bay=3.4, vx=(-5.4, 1.2), seed=10),
    dict(id='ijin_f', style='ijin', w=11.0, d=10.0, h=8.0, wall='flat:#d9e3cc', ribc='flat:#bccab0', glazed=True, tower=-3.5, chimneys=((3.2, 6.0),), seed=11),
    dict(id='cot_a', style='cottage', w=10.0, d=8.5, h=6.8, eave=3.4, wall='flat:#f1ead6', ribc='flat:#d8cfb8', seed=12),
    dict(id='cot_b', style='cottage', w=9.0, d=8.0, h=6.4, eave=3.2, rise=3.2, wall='flat:#cfdde6', ribc='flat:#b3c4cf', seed=13),
    dict(id='timber', style='timber', w=11.0, d=9.5, h=6.4, seed=14),
    dict(id='manse', style='manse', w=12.5, d=10.0, h=7.6, seed=15),
    dict(id='bungalow', style='bungalow', w=14.0, d=10.5, h=3.8, wall='flat:#efe9da', ribc='flat:#d6cfbc', seed=16),
    dict(id='bandstand', style='bandstand', w=9.0, d=9.0, h=9.0, seed=17),
    dict(id='bridge', style='bridge', w=3.0, d=10.0, h=1.9, seed=18),
    dict(id='pergola', style='pergola', w=12.0, d=3.0, h=3.0, seed=19),
]
for _v in VARIANTS:
    _v['gap'] = 8.0


if __name__ == '__main__':
    run('kamome', VARIANTS, build_hi, build_lo)
    write_anchors('kamome')
