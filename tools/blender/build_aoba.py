# Builds Aobadai's own quarter (the 2026-11 rebuild): the station's exit house on the north plaza,
# Hazuki arcade (葉月商店街) climbing north from it, and Okamori shrine on its terrace at the top.
#
#   blender --background --python tools/blender/build_aoba.py -- [--renders <dir>]
#
# Writes assets/buildings/aoba.blend, public/models/buildings/aoba.glb and src/stations/anchors/aoba.ts.
# Frame: front at z = 0 facing -z, origin mid-frontage, +z into the lot (buildkit.py, kitakit.py).
#
#   house        the exit house: EH_W × EH_D, a tiled two-storey station house, its street storey open
#                to the plaza between timber piers (the doorway is the `_door` mark); outside faces only.
#   gate         the arcade's gate: two posts AW + 0.5 apart, a gabled name board on both faces.
#   roof         the arcade's roof: AW wide (along x), AL long (along +z), a vault of frosted panels on
#                green steel hoops, banners and paper lanterns.
#   s5 s6 s7     arcade shops SD deep, open to the arcade under a board, a floor or two above.
#   torii        a granite torii TW wide.
#   stair        the stone stair up the terrace: ST_W wide, ST_RUN deep, ST_RISE high, with its side walls.
#   wall         the terrace's retaining wall: WL long, ST_RUN deep, ST_RISE high (solid), a fence on top.
#   precinct     the shrine on the terrace: PR_W × PR_D, origin at the terrace's front edge, floor at y 0.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

EH_W, EH_D, EH_G, EH_H = 18.0, 12.0, 4.2, 7.8
AW, AL, AH = 6.0, 40.75, 7.6
SD = 9.0
TW = 5.0
ST_W, ST_RUN, ST_RISE = 8.0, 6.0, 3.0
WL = 16.0
PR_W, PR_D = 38.0, 9.75

PLASTER = 'flat:#ece6d6'
CEDAR = 'flat:#5a4030'
CEDAR_DK = 'flat:#3a2a1e'
ROOFTILE = 'flat:#3b3f45'
ISHI = 'flat:#9a948a'
ISHI_DK = 'flat:#7d776d'
ISHI_LT = 'flat:#b3ada2'
SAGE = 'flat:#2f6b45'
SAGE_LT = 'flat:#6f9a7a'
VERM = 'flat:#c4402a'
LEAFY = 'flat:#3f6b3a'
WFRAME = 'flat:#5b4a36'
GOODS = ['flat:#c8102e', 'flat:#f2c230', 'flat:#1f5fa8', 'flat:#1d8a4e', 'flat:#e86a1c', 'flat:#f4f1e8', 'flat:#7a3fa0']
WALLS = ['flat:#e3dccb', 'flat:#d8cfbc', 'flat:#cfd3c8', 'flat:#b9a48c', 'flat:#e8e4d8', 'flat:#c9b9a0']


def gable(p, mat, x0, x1, z0, z1, y, rise, over=0.5):
    """A gabled roof, ridge along x."""
    zm = (z0 + z1) / 2
    p.prism(mat, [(z0 - over, y), (zm, y + rise), (z1 + over, y), (z1 + over, y - 0.12), (zm, y + rise - 0.12), (z0 - over, y - 0.12)], 'x', x0 - over, x1 + over)


# ── The exit house ──
def house(p, s, r):
    """Street storey: timber piers on a granite plinth, open between them across the middle (the
    doorway to the stair and, later, the lift); plaster above with a band of sage tile, a row of
    sash windows for the café upstairs, a hipped roof of grey tile with a little clock gable."""
    w, d, g, h = EH_W, EH_D, EH_G, EH_H
    x0, x1 = -w / 2, w / 2
    door = (-6.0, 6.0)
    # The walls as thin outside skins (the inside is built in code).
    t = 0.3
    for a, e in ((x0, door[0]), (door[1], x1)):
        p.box(PLASTER, a, 0, 0, e, g, t)
        p.box(ISHI_DK, a - 0.02, 0, -0.04, e + 0.02, 0.5, t)
        win(p, a + 0.5, 1.0, e - 0.5, 2.8, 0, -1, WFRAME)
    p.box(PLASTER, x0, g, 0, x1, h, t)
    p.box(PLASTER, x0, 0, d - t, x1, h, d)
    p.box(PLASTER, x0, 0, 0, x0 + t, h, d)
    p.box(PLASTER, x1 - t, 0, 0, x1, h, d)
    for x in (door[0], door[1]):
        p.box(CEDAR, x - 0.22, 0, -0.12, x + 0.22, g, 0.3)
    p.box(CEDAR, door[0] - 0.22, g - 0.45, -0.12, door[1] + 0.22, g, 0.3)
    mark('_door', 0, g / 2, 0, door[1] - door[0], g)
    # A canopy over the doorway, lit underneath; the name board above it.
    p.box(ROOFTILE, door[0] - 0.6, g + 0.05, -1.8, door[1] + 0.6, g + 0.2, 0.0)
    p.box('light', door[0], g + 0.0, -1.5, door[1], g + 0.05, -1.3)
    board(p, 'name', 'f', -4.5, 4.5, g + 0.45, g + 1.35, 0, 'flat:#f4f1e8', 0.08)
    p.box(SAGE, x0, g + 0.25, -0.06, x1, g + 0.35, 0)
    for c in rows(x0 + 0.8, x1 - 0.8, 2.4):
        if abs(c) < 4.8:
            continue
        win(p, c - 0.8, g + 0.6, c + 0.8, g + 2.6, 0, -1, WFRAME)
    for face, a0, a1, at in sides(x0, x1, 0, d, 'lrb'):
        for c in rows(a0 + 1.2, a1 - 1.2, 3.0):
            quad(p, WINDOW, face, c - 0.7, c + 0.7, g + 0.8, g + 2.4, out(face, at, 0.02))
    # Roof, a gable over the door with the clock board, a weathervane.
    p.box(ROOFTILE, x0 - 0.6, h - 0.12, -0.6, x1 + 0.6, h, d + 0.6)
    p.prism(ROOFTILE, [(-0.6, h), (d / 2, h + 2.6), (d + 0.6, h)], 'x', x0 - 0.6, x1 + 0.6)
    p.prism(PLASTER, [(-2.4, h), (2.4, h), (0, h + 2.2)], 'z', -0.05, 1.5)
    p.prism(ROOFTILE, [(-2.8, h - 0.1), (0, h + 2.45), (2.8, h - 0.1), (2.8, h - 0.25), (0, h + 2.3), (-2.8, h - 0.25)], 'z', -0.35, 1.6)
    board(p, 'clock', 'f', -0.75, 0.75, h + 0.2, h + 1.7, -0.05, 'flat:#f4f1e8', 0.06)
    p.cyl(STEEL, (0, h + 3.2, d / 2), 1, 0.03, 1.4, seg=6)
    p.box(STEEL, -0.4, h + 3.6, d / 2 - 0.02, 0.4, h + 3.7, d / 2 + 0.02)
    # Back of house: AC units, meters, a drain pipe.
    for x in (x0 + 2.0, x0 + 3.2, x1 - 2.0):
        acu(p, x, 0, d + 0.4, 1)
    p.box(STEEL, x1 - 0.5, 0, d, x1 - 0.4, h, d + 0.1)


# ── Hazuki arcade ──
def gate(p):
    """Two green posts, a gabled board on them (read from both ways), lamps, a row of lanterns."""
    h = AW / 2 + 0.25
    for sx in (-1, 1):
        p.box(SAGE, sx * h - 0.2, 0, -0.2, sx * h + 0.2, 6.6, 0.2)
        p.box(ISHI, sx * h - 0.3, 0, -0.3, sx * h + 0.3, 0.6, 0.3)
        p.box('light', sx * h - 0.18, 4.1, -0.22, sx * h + 0.18, 4.6, 0.22)
    p.box('flat:#f4f1e8', -h + 0.3, 5.0, -0.15, h - 0.3, 6.5, 0.15)
    p.box(SAGE, -h - 0.3, 4.85, -0.2, h + 0.3, 5.0, 0.2)
    p.prism(SAGE, [(-h - 0.6, 6.5), (0, 7.6), (h + 0.6, 6.5), (h + 0.6, 6.35), (0, 7.45), (-h - 0.6, 6.35)], 'z', -0.35, 0.35)
    mark('name_f', 0, 5.75, -0.17, 2 * h - 0.8, 1.4, (0, -1))
    mark('name_b', 0, 5.75, 0.17, 2 * h - 0.8, 1.4, (0, 1))
    for c in rows(-h + 0.6, h - 0.6, 0.85):
        p.cyl('flat:#f2e4c0', (c, 4.55, 0), 1, 0.16, 0.4, seg=8)
        p.box(DARK, c - 0.01, 4.75, -0.01, c + 0.01, 4.85, 0.01)


def roof(p, s, r):
    """The vault over the arcade: hoops every 4 m on posts at the shop fronts, frosted panels, a
    ridge strip light, banners hung across every other bay, paper lanterns down both sides."""
    bays = max(1, round(AL / 4.0))
    bay = AL / bays
    hw = AW / 2
    n = 8
    prof = [(-hw + AW * k / n, AH + 1.6 * math.sin(math.pi * k / n)) for k in range(n + 1)]
    for i in range(bays + 1):
        z = i * bay
        for sx in (-1, 1):
            p.box(SAGE, sx * hw - 0.08, 0, z - 0.08, sx * hw + 0.08, AH, z + 0.08)
            p.box(ISHI, sx * hw - 0.14, 0, z - 0.14, sx * hw + 0.14, 0.3, z + 0.14)
        for (xa, ya), (xb, yb) in zip(prof[:-1], prof[1:]):
            p.face(SAGE, [(xa, ya, z - 0.06), (xb, yb, z - 0.06), (xb, yb, z + 0.06), (xa, ya, z + 0.06)], (0, 1, 0))
            p.face(SAGE, [(xa, ya - 0.14, z + 0.06), (xb, yb - 0.14, z + 0.06), (xb, yb - 0.14, z - 0.06), (xa, ya - 0.14, z - 0.06)], (0, -1, 0))
    for (xa, ya), (xb, yb) in zip(prof[:-1], prof[1:]):
        p.face('glassTint', [(xa, ya, 0), (xb, yb, 0), (xb, yb, AL), (xa, ya, AL)], (0, 1, 0))
    for sx in (-1, 1):
        p.box(SAGE, sx * hw - 0.1, AH - 0.15, 0, sx * hw + 0.1, AH, AL)
    p.box('light', -0.15, AH + 1.45, 0, 0.15, AH + 1.5, AL)
    for sx in (-1, 1):
        p.box('light', sx * (hw - 0.3) - 0.06, AH - 0.22, 0.2, sx * (hw - 0.3) + 0.06, AH - 0.18, AL - 0.2)
    for i in range(bays):
        zc = (i + 0.5) * bay
        if i % 2 == 0:
            sign(s, r.choice(['#2f6b45', '#c8102e', '#f4f1e8', '#1f5fa8', '#f2c230']), -1.4, AH - 1.4, zc - 0.03, 1.4, AH - 0.3, zc + 0.03)
        for sx in (-1, 1):
            x = sx * (hw - 0.5)
            p.box(DARK, x - 0.01, AH - 0.9, zc - 0.01, x + 0.01, AH - 0.15, zc + 0.01)
            p.cyl('light', (x, AH - 1.15, zc), 1, 0.2, 0.5, seg=8)


def shop(p, s, v, r):
    """A shop of the arcade: open across its front under the board, goods set out, a floor or two
    above with a window, an AC unit, a projecting sign."""
    w, d, floors = v['w'], SD, v['floors']
    x0, x1 = -w / 2, w / 2
    wall = WALLS[v['n'] % len(WALLS)]
    h = 3.8 + floors * 2.9
    p.box(wall, x0, 0, 0, x0 + 0.3, 3.8, d)
    p.box(wall, x1 - 0.3, 0, 0, x1, 3.8, d)
    p.box(DARK, x0 + 0.3, 0, d - 0.2, x1 - 0.3, 3.8, d)
    p.box('flat:#d9d2c2', x0 + 0.3, 0, 0.0, x1 - 0.3, 0.02, d - 0.2)
    p.box(wall, x0 + 0.3, 3.4, 0.0, x1 - 0.3, 3.8, d - 0.2)
    p.box('light', x0 + 0.8, 3.3, 1.4, x1 - 0.8, 3.34, 1.6)
    p.box('light', x0 + 0.8, 3.3, 4.6, x1 - 0.8, 3.34, 4.8)
    quad(p, 'windowDim', 'f', x0 + 0.3, x1 - 0.3, 0.0, 3.3, d - 0.22, col='flat:#8a7a5e')
    # Display tables out front either side of a 1.6 m way in (the street code makes them solid: SHOP_TABLE).
    for a, e in ((x0 + 0.4, -0.8), (0.8, x1 - 0.4)):
        p.box(CEDAR, a, 0, 0.3, e, 0.8, 1.4)
        n = max(1, int((e - a) / 0.34))
        for k in range(n):
            c = a + (k + 0.5) * (e - a) / n
            p.box(r.choice(GOODS), c - 0.14, 0.8, 0.4, c + 0.14, 0.8 + r.uniform(0.12, 0.3), 1.3)
    # A till counter inside, to one side.
    p.box(CEDAR, x1 - 1.5, 0, 3.2, x1 - 0.4, 0.95, 4.4)
    p.box('flat:#2b2f34', x1 - 1.2, 0.95, 3.6, x1 - 0.8, 1.15, 3.9)
    for c in rows(x0 + 0.5, x1 - 0.5, 1.6):
        p.box('flat:#6b5a48', c - 0.7, 0, d - 1.1, c + 0.7, 2.2, d - 0.25)
        for y in (0.5, 1.1, 1.7):
            p.box(r.choice(GOODS), c - 0.6, y, d - 1.14, c + 0.6, y + 0.35, d - 1.1)
    p.box(wall, x0, 3.8, 0, x1, h, d)
    fascia(s, x0 + 0.2, x1 - 0.2, 3.4, 4.4, 0, r=r)
    for i in range(floors):
        y = 4.7 + i * 2.9
        for c in rows(x0 + 0.4, x1 - 0.4, w / 2):
            win(p, c - 0.8, y + 0.3, c + 0.8, y + 1.7, 0)
        if r.random() < 0.6:
            wall_ac(p, 'z', 0, -1, y + 0.1, x1 - 0.8)
    if floors > 1 or r.random() < 0.5:
        blade(s, x0 + 0.35, 4.7, 4.7 + floors * 2.9 - 0.4, 0, 0.7, r=r)
    p.box(ROOF, x0 - 0.05, h, -0.05, x1 + 0.05, h + 0.35, d + 0.05)
    if r.random() < 0.5:
        tank(p, x0 + 1.6, h + 0.35, d - 2.0, 0.6, 1.2)
    acu(p, x1 - 1.6, h + 0.35, 2.0)
    backs(p, w, d, [3.8 + i * 2.9 for i in range(floors)] + [h], r, sides=(-1, 1), back=True, use='home')


# ── Okamori shrine ──
def torii(p):
    """A granite myōjin torii: two posts on stone feet, the tie beam, the curved top lintel, the tablet."""
    hw = TW / 2 - 0.6
    for sx in (-hw, hw):
        p.box(ISHI_DK, sx - 0.4, 0, -0.4, sx + 0.4, 0.35, 0.4)
        p.cyl(ISHI_LT, (sx, 2.4, 0), 1, 0.22, 4.1, seg=12)
    p.box(ISHI_LT, -hw - 0.5, 3.3, -0.14, hw + 0.5, 3.6, 0.14)
    p.box(ISHI_LT, -0.12, 3.6, -0.1, 0.12, 4.15, 0.1)
    p.prism(ISHI_LT, [(-TW / 2, 4.15), (TW / 2, 4.15), (TW / 2 + 0.3, 4.55), (TW / 2 + 0.2, 4.6), (0, 4.45), (-TW / 2 - 0.2, 4.6), (-TW / 2 - 0.3, 4.55)], 'z', -0.2, 0.2)
    board(p, 'name', 'f', -0.32, 0.32, 3.62, 4.12, -0.1, 'flat:#4a4440', 0.03)


def stair(p):
    """The stone stair up the terrace: granite treads, a handrail down the middle, stone posts."""
    n = 17
    for k in range(n):
        y0, y1 = ST_RISE * k / n, ST_RISE * (k + 1) / n
        z0 = ST_RUN * k / n
        p.box(ISHI if k % 2 else ISHI_LT, -ST_W / 2, y0, z0, ST_W / 2, y1, ST_RUN)
    for sx in (-1, 1):
        p.prism(ISHI_DK, [(0, 0), (ST_RUN, ST_RISE), (ST_RUN, ST_RISE + 0.6), (0, 0.6)], 'x', sx * ST_W / 2 - 0.35 if sx < 0 else ST_W / 2, sx * ST_W / 2 if sx < 0 else ST_W / 2 + 0.35)
    for k in range(5):
        t = k / 4
        p.cyl(ISHI_LT, (0, ST_RISE * t + 0.5, ST_RUN * t), 1, 0.05, 1.0, seg=6)
    p.face(STEEL, [(-0.03, 0.95, 0), (0.03, 0.95, 0), (0.03, ST_RISE + 0.95, ST_RUN), (-0.03, ST_RISE + 0.95, ST_RUN)], (0, 1, -0.5))
    p.box('light', -0.05, 0.6, 0.0, 0.05, 0.7, 0.1)


def wall(p, r):
    """The terrace's retaining wall: dressed granite in courses with a batter, a stone kerb, a low
    fence of stone posts on top and shrubs behind it. Solid to the terrace top."""
    p.box(ISHI_DK, -WL / 2, 0, 0.25, WL / 2, ST_RISE, ST_RUN)
    y = 0.0
    k = 0
    while y < ST_RISE - 0.05:
        bat = 0.25 * (1 - y / ST_RISE)
        xx = -WL / 2 + (0.4 if k % 2 else 0)
        while xx < WL / 2 - 0.05:
            p.box(r.choice([ISHI, ISHI_LT, ISHI]), xx + 0.02, y + 0.02, bat - 0.02, min(WL / 2, xx + 0.8) - 0.02, y + 0.33, bat + 0.3)
            xx += 0.8
        y += 0.35
        k += 1
    p.box(ISHI_LT, -WL / 2, ST_RISE, 0.0, WL / 2, ST_RISE + 0.2, 0.5)
    x = -WL / 2 + 0.2
    while x < WL / 2:
        p.box(ISHI_LT, x - 0.08, ST_RISE + 0.2, 0.2, x + 0.08, ST_RISE + 1.0, 0.36)
        x += 1.2
    p.box(ISHI_LT, -WL / 2, ST_RISE + 0.75, 0.22, WL / 2, ST_RISE + 0.85, 0.34)
    for c in rows(-WL / 2 + 0.5, WL / 2 - 0.5, 1.6):
        p.box(LEAFY, c - 0.75, ST_RISE + 0.2, 0.8, c + 0.75, ST_RISE + r.uniform(0.9, 1.4), 2.2)
    p.box('flat:#5a5248', -WL / 2, ST_RISE, 0.5, WL / 2, ST_RISE + 0.02, ST_RUN)


def precinct(p, s, r):
    """On the terrace: a gravel court, a granite path between stone lanterns and lion-dogs, the water
    basin under its roof, the worship hall of plain cedar under a copper-green roof with the main
    hall behind it, an ema rack, the shrine office's little window."""
    x0, x1 = -PR_W / 2, PR_W / 2
    d = PR_D
    p.box('flat:#b9b3a4', x0, 0, 0, x1, 0.03, d)
    p.box(ISHI_LT, -1.2, 0.03, 0, 1.2, 0.06, d - 4.0)
    for o in (-1, 1):
        lx, lz = o * 2.4, 1.6
        p.box(ISHI_DK, lx - 0.35, 0, lz - 0.35, lx + 0.35, 0.25, lz + 0.35)
        p.cyl(ISHI, (lx, 0.85, lz), 1, 0.13, 1.2, seg=8)
        p.box(ISHI, lx - 0.3, 1.45, lz - 0.3, lx + 0.3, 1.55, lz + 0.3)
        p.box('light', lx - 0.17, 1.55, lz - 0.17, lx + 0.17, 1.85, lz + 0.17)
        p.prism(ISHI_DK, [(lx - 0.42, 1.85), (lx + 0.42, 1.85), (lx + 0.1, 2.15), (lx - 0.1, 2.15)], 'z', lz - 0.42, lz + 0.42)
        fx, fz = o * 2.0, 3.6
        p.box(ISHI_DK, fx - 0.35, 0, fz - 0.5, fx + 0.35, 0.8, fz + 0.5)
        p.box(ISHI_LT, fx - 0.2, 0.8, fz - 0.3, fx + 0.2, 1.3, fz + 0.25)
        p.box(ISHI_LT, fx - 0.16, 1.3, fz - 0.4, fx + 0.16, 1.65, fz - 0.1)
    bx, bz = x0 + 6.0, 3.0
    p.box(ISHI, bx - 0.8, 0, bz - 0.45, bx + 0.8, 0.65, bz + 0.45)
    p.box('flat:#3a5a7a', bx - 0.68, 0.6, bz - 0.33, bx + 0.68, 0.63, bz + 0.33)
    for ox in (-1.0, 1.0):
        for oz in (-0.7, 0.7):
            p.box(CEDAR, bx + ox - 0.06, 0, bz + oz - 0.06, bx + ox + 0.06, 2.2, bz + oz + 0.06)
    gable(p, 'flat:#5f8f7b', bx - 1.1, bx + 1.1, bz - 0.8, bz + 0.8, 2.2, 0.7, 0.3)
    mark('_basin', bx, 0.5, bz, 2.4, 1.8)
    # The worship hall (haiden) and the main hall behind.
    hz, hw, hd = d - 5.6, 4.0, 4.0
    p.box(ISHI_DK, -hw - 0.4, 0, hz - 0.4, hw + 0.4, 0.5, hz + hd)
    for k in range(3):
        p.box(ISHI, -1.4, 0, hz - 0.4 - 0.3 * (3 - k), 1.4, 0.17 * (k + 1), hz - 0.4 - 0.3 * (2 - k))
    p.box(CEDAR, -hw, 0.5, hz + 0.6, hw, 3.6, hz + hd)
    for c in rows(-hw, hw, 2.0):
        p.box(CEDAR_DK, c - 0.14, 0.5, hz - 0.1, c + 0.14, 3.6, hz + 0.18)
    quad(p, 'windowDim', 'f', -hw + 0.4, hw - 0.4, 0.6, 3.2, hz + 0.58, col=WARM)
    for c in rows(-hw + 0.4, hw - 0.4, 0.4):
        p.box(CEDAR_DK, c - 0.02, 0.6, hz + 0.54, c + 0.02, 3.2, hz + 0.58)
    p.box(CEDAR, -1.0, 0.5, hz + 0.0, 1.0, 1.3, hz + 0.6)
    gable(p, 'flat:#5f8f7b', -hw, hw, hz - 0.4, hz + hd, 3.6, 1.8, 0.9)
    p.prism('flat:#5f8f7b', [(-1.6, 3.4), (0, 4.4), (1.6, 3.4)], 'z', hz - 1.6, hz)
    p.cyl('flat:#c9a23a', (0, 3.0, hz - 0.3), 1, 0.18, 0.3, seg=10)
    p.box('flat:#f4f1e8', -0.04, 1.2, hz - 0.32, 0.04, 3.0, hz - 0.28)
    mz = d - 1.4
    p.box(ISHI_DK, -2.2, 0, mz - 1.4, 2.2, 0.9, d)
    p.box(CEDAR, -1.6, 0.9, mz - 1.0, 1.6, 3.4, d - 0.2)
    gable(p, 'flat:#4f7a6a', -1.6, 1.6, mz - 1.0, d - 0.2, 3.4, 1.5, 0.6)
    for o in (-0.6, 0.6):
        p.box(CEDAR_DK, o - 0.05, 4.6, mz - 0.2, o + 0.05, 5.4, mz + 0.0)
    # The ema rack and the shrine office.
    ex, ez = x1 - 6.0, 3.4
    for oz in (-1.5, 1.5):
        p.box(CEDAR, ex - 0.06, 0, ez + oz - 0.06, ex + 0.06, 1.9, ez + oz + 0.06)
    p.box(CEDAR, ex - 0.05, 1.2, ez - 1.6, ex + 0.05, 1.26, ez + 1.6)
    zz = ez - 1.4
    while zz < ez + 1.4:
        p.box(r.choice(['flat:#e8d9b0', 'flat:#e0cfa0']), ex - 0.07, 0.95, zz - 0.07, ex - 0.04, 1.2, zz + 0.07)
        zz += 0.18
    p.prism(ROOFTILE, [(ex - 0.4, 1.9), (ex + 0.4, 1.9), (ex, 2.15)], 'z', ez - 1.8, ez + 1.8)
    ox = x1 - 2.2
    p.box(PLASTER, ox - 1.8, 0, d - 4.5, ox + 1.8, 2.8, d - 0.3)
    quad(p, 'windowDim', 'f', ox - 1.0, ox + 0.8, 0.9, 1.8, d - 4.52, col=WARM)
    gable(p, ROOFTILE, ox - 1.8, ox + 1.8, d - 4.5, d - 0.3, 2.8, 1.0, 0.4)
    mark('_hall', 0, 1.5, hz + 2.0, 2 * hw + 0.8, hd + 0.4)
    mark('_office', ox, 1.4, d - 2.4, 3.6, 4.2)


SHOP_VARS = [dict(id='s%d%s' % (w, k), w=float(w), floors=f, n=n) for n, (w, k, f) in enumerate(
    [(5, 'a', 1), (6, 'a', 2), (7, 'a', 1), (5, 'b', 2), (6, 'b', 1), (7, 'b', 2), (6, 'c', 3)])]
VARIANTS = [dict(id='house', w=EH_W, d=EH_D, h=EH_H), dict(id='gate', w=AW + 1.2, d=0.4, h=7.6), dict(id='roof', w=AW, d=AL, h=AH + 1.6)] + \
    [dict(v, d=SD, h=3.8 + v['floors'] * 2.9) for v in SHOP_VARS] + \
    [dict(id='torii', w=TW, d=0.5, h=4.6), dict(id='stair', w=ST_W + 0.7, d=ST_RUN, h=ST_RISE), dict(id='wall', w=WL, d=ST_RUN, h=ST_RISE),
     dict(id='precinct', w=PR_W, d=PR_D, h=6.0)]
for _v in VARIANTS:
    _v['gap'] = 6.0


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(sum(map(ord, v['id'])) * 5)
    k = v['id']
    if k == 'house':
        house(body, signs, r)
    elif k == 'gate':
        gate(body)
    elif k == 'roof':
        roof(body, signs, r)
    elif k == 'torii':
        torii(body)
    elif k == 'stair':
        stair(body)
    elif k == 'wall':
        wall(body, r)
    elif k == 'precinct':
        precinct(body, signs, r)
    else:
        shop(body, signs, v, r)
    return body, signs


def build_lo(v):
    return None


if __name__ == '__main__':
    run('aoba', VARIANTS, build_hi, build_lo)
    write_anchors('aoba')
