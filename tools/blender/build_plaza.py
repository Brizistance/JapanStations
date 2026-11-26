# Builds the buildings round Kawaminato Station's plaza and the landmarks on Kita-Ōdōri avenue.
#
#   blender --background --python tools/blender/build_plaza.py -- [--renders <dir>]
#
# Writes assets/buildings/plaza.blend and public/models/buildings/plaza.glb.
#
# Frame and helpers: see buildkit.py (front at z = 0 facing -z, origin mid-frontage on the
# pavement, +z into the plot). One root per building, plaza_<id>, with one mesh. Nothing here
# carries a name: station, hotel and shop names and the clocks are game signs placed on the plain
# boards these models leave for them (stations/hub.ts), so no real business is ever copied.
# Sizes are mirrored in stations/hub.ts (PLAZA); change both together.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

STONE = 'flat:#d9cdb4'
STONE_LT = 'flat:#e6dcc6'
STONE_DK = 'flat:#6e5f4d'
GRANITE = 'flat:#4a4440'
BRASS = 'flat:#b08d3a'
BRASS_LT = 'flat:#d2b25a'
BRONZE = 'flat:#5a4630'
TIMBER = 'flat:#4a3626'
GREEN = 'flat:#12382c'
LEAFY = 'flat:#3f6b3a'
SHOP = 'flat:#3d4a4c'
WARM = 'flat:#efe0b4'
WFRAME = 'flat:#5b4a36'


def winx(p, z0, y0, z1, y1, x, out, frame=FRAME, glass=WINDOW):
    """A framed window on a wall in the plane x, facing out (+1 or -1 along x)."""
    p.box(frame, x, y0, z0, x + out * 0.05, y1, z1)
    p.box(glass, x + out * 0.05, y0 + 0.06, z0 + 0.06, x + out * 0.06, y1 - 0.06, z1 - 0.06)
    win_dress(p, z0, y0, z1, y1, None, glass, lambda a0, b0, a1, b1, n0, n1, m: p.box(m, min(x + out * n0, x + out * n1), b0, a0, max(x + out * n0, x + out * n1), b1, a1))


def rows(a0, a1, bay):
    n = max(1, round((a1 - a0) / bay))
    b = (a1 - a0) / n
    return [a0 + (i + 0.5) * b for i in range(n)]


def windows(p, face, a0, a1, at, y0, floors, fh, bay, ww, wh, sill=0.95, frame=WFRAME, glass=WINDOW):
    """A grid of windows. face 'f' front (z = at), 'b' back, 'l' the -x side (x = at), 'r' the +x side."""
    for f in range(floors):
        y = y0 + f * fh + sill
        for c in rows(a0, a1, bay):
            if face == 'f':
                win(p, c - ww / 2, y, c + ww / 2, y + wh, at, -1, frame, glass)
            elif face == 'b':
                win(p, c - ww / 2, y, c + ww / 2, y + wh, at, 1, frame, glass)
            else:
                winx(p, c - ww / 2, y, c + ww / 2, y + wh, at, -1 if face == 'l' else 1, frame, glass)


def piers(p, mat, face, a0, a1, at, y0, y1, bay, w=0.45, proud=0.18):
    """Vertical strips between the bays of a wall (same faces as windows())."""
    n = max(1, round((a1 - a0) / bay))
    b = (a1 - a0) / n
    for i in range(n + 1):
        c = a0 + i * b
        if face == 'f':
            p.box(mat, c - w / 2, y0, at - proud, c + w / 2, y1, at)
        elif face == 'b':
            p.box(mat, c - w / 2, y0, at, c + w / 2, y1, at + proud)
        elif face == 'l':
            p.box(mat, at - proud, y0, c - w / 2, at, y1, c + w / 2)
        else:
            p.box(mat, at, y0, c - w / 2, at + proud, y1, c + w / 2)


def band(p, mat, x0, x1, z0, z1, y0, y1, proud=0.12):
    """A course running right round a block."""
    p.box(mat, x0 - proud, y0, z0 - proud, x1 + proud, y1, z1 + proud)


def lamp(p, x, y, z):
    """Brass wall lantern on a front wall at z, hanging out towards the street."""
    p.box(BRASS, x - 0.04, y + 0.5, z - 0.3, x + 0.04, y + 0.56, z)
    p.box(BRASS, x - 0.14, y + 0.42, z - 0.44, x + 0.14, y + 0.5, z - 0.16)
    p.box('light', x - 0.1, y, z - 0.4, x + 0.1, y + 0.42, z - 0.2)
    p.box(BRASS, x - 0.14, y - 0.06, z - 0.44, x + 0.14, y, z - 0.16)


def planter(p, x, z, w=1.6):
    p.box(STONE_DK, x - w / 2, 0, z - 0.4, x + w / 2, 0.55, z + 0.4)
    p.box(BRASS, x - w / 2 - 0.02, 0.5, z - 0.42, x + w / 2 + 0.02, 0.55, z + 0.42)
    p.box(LEAFY, x - w / 2 + 0.1, 0.55, z - 0.3, x + w / 2 - 0.1, 1.15, z + 0.3)


def display(p, x0, x1, y0, y1, z, kick=0.55):
    """A shop display window: granite kick, brass frame, glass with a warm lit strip behind the head."""
    p.box(GRANITE, x0, y0, z - 0.1, x1, y0 + kick, z)
    p.box(BRASS, x0, y0 + kick, z - 0.09, x1, y1, z - 0.01)
    p.box(SHOP, x0 + 0.1, y0 + kick + 0.1, z - 0.1, x1 - 0.1, y1 - 0.1, z - 0.095)
    p.box(WARM, x0 + 0.1, y1 - 0.75, z - 0.105, x1 - 0.1, y1 - 0.1, z - 0.1)
    m = (x0 + x1) / 2
    if x1 - x0 > 3:
        p.box(BRASS, m - 0.04, y0 + kick, z - 0.11, m + 0.04, y1, z - 0.09)


def doors(p, x, y, z, w=2.4, h=2.7, frame=BRASS):
    """Double glass doors in a brass frame on a front wall at z."""
    p.box(frame, x - w / 2 - 0.12, y, z - 0.12, x + w / 2 + 0.12, y + h + 0.12, z)
    p.box(SHOP, x - w / 2, y + 0.05, z - 0.13, x + w / 2, y + h, z - 0.12)
    p.box(frame, x - 0.03, y, z - 0.15, x + 0.03, y + h, z - 0.12)
    for s in (-1, 1):
        p.box(BRASS_LT, x + s * 0.12 - 0.02, y + 0.9, z - 0.19, x + s * 0.12 + 0.02, y + 1.5, z - 0.15)


def roof_plant(p, x0, x1, y, z0, z1, seed=3):
    r = random.Random(seed)
    for _ in range(5):
        cx, cz = r.uniform(x0 + 3, x1 - 3), r.uniform(z0 + 3, z1 - 3)
        w, d, h = r.uniform(2, 5), r.uniform(2, 4), r.uniform(1.4, 2.8)
        p.box(CONC, cx - w / 2, y, cz - d / 2, cx + w / 2, y + h, cz + d / 2)
    tank(p, r.uniform(x0 + 4, x1 - 4), y, r.uniform(z0 + 4, z1 - 4))


# ───────────────────────── round the plaza ─────────────────────────

def hotel(p):
    W, D, H = 67.6, 48.0, 46.0
    x0, x1 = -W / 2, W / 2
    PY, TY = 8.0, 40.0  # top of the podium, foot of the recessed top floors
    # Podium: stone on a granite base, tall display windows, a brass band on top.
    p.box(STONE, x0, 0, 0, x1, PY, D)
    band(p, GRANITE, x0, x1, 0, D, 0, 0.7, 0.08)
    band(p, BRASS, x0, x1, 0, D, PY - 0.25, PY, 0.2)
    band(p, STONE_DK, x0, x1, 0, D, PY - 0.9, PY - 0.25, 0.14)
    for c in rows(x0 + 1.5, x1 - 1.5, 5.4):
        if abs(c) < 8:
            continue
        display(p, c - 2.0, c + 2.0, 0.7, 5.6, 0)
        p.box(GREEN, c - 2.2, 5.75, -1.3, c + 2.2, 5.95, 0)
        p.box(BRASS, c - 2.22, 5.72, -1.33, c + 2.22, 5.76, -1.27)
        lamp(p, c - 2.7, 3.2, 0)
    for z in rows(2, D - 2, 5.4):
        for face, x in (('l', x0), ('r', x1)):
            winx(p, z - 1.8, 1.2, z + 1.8, 5.6, x, -1 if face == 'l' else 1, BRASS, SHOP)
    # Entrance: a porte-cochère on stone columns, revolving door, side doors, planters.
    p.box(STONE_LT, -9.5, 4.9, -7.2, 9.5, 5.5, 0)
    p.box(BRASS, -9.6, 4.82, -7.3, 9.6, 4.9, 0)
    p.box(BRASS, -9.6, 5.5, -7.3, 9.6, 5.6, 0)
    for z in (-5.2, -2.0):
        p.box('light', -8.0, 4.8, z - 0.1, 8.0, 4.82, z + 0.1)
    for sx in (-8.6, -3.2, 3.2, 8.6):
        p.box(STONE_DK, sx - 0.5, 0, -6.9, sx + 0.5, 0.5, -5.9)
        p.cyl(STONE, (sx, 2.7, -6.4), 1, 0.36, 4.4, seg=14)
        p.cyl(BRASS, (sx, 4.86, -6.4), 1, 0.46, 0.1, seg=14)
    p.box(BRASS, -2.1, 0, -0.5, 2.1, 3.3, 0)
    p.cyl('glassTint', (0, 1.55, -0.5), 1, 1.7, 2.9, seg=18)
    p.cyl(BRASS, (0, 3.05, -0.5), 1, 1.78, 0.14, seg=18)
    p.cyl(BRASS, (0, 0.04, -0.5), 1, 1.78, 0.08, seg=18)
    for s in (-1, 1):
        doors(p, s * 5.2, 0, 0)
        planter(p, s * 7.2, -0.9)
        lamp(p, s * 3.0, 3.0, 0)
    p.box(GREEN, -6.5, 5.9, -0.2, 6.5, 7.2, 0)   # name plate over the entrance (game sign)
    # Shaft: bay windows between stone pilasters.
    p.box(STONE_LT, x0, PY, 0, x1, TY, D)
    FL, FH = 10, 3.2
    windows(p, 'f', x0 + 0.8, x1 - 0.8, 0, PY, FL, FH, 3.34, 2.1, 1.9)
    piers(p, STONE, 'f', x0 + 0.8, x1 - 0.8, 0, PY, TY, 3.34)
    for face, at in (('l', x0), ('r', x1)):
        windows(p, face, 1.0, D - 1.0, at, PY, FL, FH, 3.54, 2.1, 1.9)
        piers(p, STONE, face, 1.0, D - 1.0, at, PY, TY, 3.54)
    for f in range(FL):
        p.box(WINDOW, x0 + 2, PY + f * FH + 1.0, D, x1 - 2, PY + f * FH + 2.7, D + 0.05)
        band(p, STONE, x0, x1, 0, D, PY + f * FH - 0.14, PY + f * FH + 0.14, 0.1)
    band(p, BRASS, x0, x1, 0, D, TY - 0.12, TY + 0.12, 0.3)
    band(p, STONE, x0, x1, 0, D, TY - 0.7, TY - 0.12, 0.24)
    # Recessed top floors with a ribbon of glass, roof plant and the name board's frame.
    p.box(STONE_DK, x0 + 2.2, TY, 2.2, x1 - 2.2, H, D - 2.2)
    p.box(WINDOW, x0 + 3, TY + 1.0, 2.14, x1 - 3, TY + 4.4, 2.2)
    p.box(WINDOW, x0 + 2.14, TY + 1.0, 3, x0 + 2.2, TY + 4.4, D - 3)
    p.box(WINDOW, x1 - 2.2, TY + 1.0, 3, x1 - 2.14, TY + 4.4, D - 3)
    for c in rows(x0 + 3, x1 - 3, 3.34):
        p.box(BRASS, c - 0.05, TY + 1.0, 2.1, c + 0.05, TY + 4.4, 2.2)
    band(p, STONE, x0 + 2.2, x1 - 2.2, 2.2, D - 2.2, H - 0.5, H, 0.3)
    p.box(BRASS, x0, TY, 0.05, x1, TY + 1.05, 0.12)
    for c in rows(x0, x1, 2.2):
        p.box(BRASS, c - 0.03, TY, 0.04, c + 0.03, TY + 1.05, 0.13)
    roof_plant(p, x0 + 6, x1 - 6, H, 10, D - 6, 4)
    for sx in (-15, 15):
        p.box(STEEL, sx - 0.1, H, 3.0, sx + 0.1, H + 4.4, 3.2)
    p.box(GREEN, -16.5, H + 0.8, 2.8, 16.5, H + 4.4, 3.0)   # roof name board (game sign)


def front(p):
    """Kawaminato Station's south front, 88 m: stone wings and piers round a glazed centre."""
    W, H = 88.0, 26.0
    IX, DW = 24.0, 9.0   # inner hall half-width, door half-width
    # Wings: solid stone, tall windows, an upper row, cornice.
    for s in (-1, 1):
        a, b = (s * IX, s * W / 2) if s > 0 else (s * W / 2, s * IX)
        p.box(STONE, a, 0, -0.3, b, H, 0)
        p.box(GRANITE, a, 0, -0.38, b, 0.8, -0.3)
        for c in rows(a + 1.5, b - 1.5, 6.0):
            display(p, c - 2.1, c + 2.1, 0.8, 5.2, -0.3)
            p.box(STONE_DK, c - 2.5, 5.2, -0.46, c + 2.5, 5.7, -0.3)
            p.box(STONE_DK, c - 0.35, 5.7, -0.5, c + 0.35, 6.3, -0.3)
            win(p, c - 1.5, 8.0, c + 1.5, 15.5, -0.3, -1, WFRAME)
            p.box(STONE_DK, c - 1.9, 15.5, -0.44, c + 1.9, 16.0, -0.3)
            p.box(STONE_DK, c - 1.9, 7.6, -0.48, c + 1.9, 8.0, -0.3)
            win(p, c - 1.2, 18.0, c + 1.2, 21.0, -0.3, -1, WFRAME)
            lamp(p, c - 2.95, 3.4, -0.3)
        piers(p, STONE_LT, 'f', a, b, -0.3, 0.8, 22.4, 6.0, 0.7, 0.22)
        p.box(BRASS, a, 6.9, -0.42, b, 7.1, -0.3)
    # Centre: five glazed bays between stone piers, open at the doors.
    for x in (-IX, -DW - 0.8, DW + 0.8, IX):
        p.box(STONE_LT, x - 0.9, 0, -1.0, x + 0.9, 22.4, 0.1)
        p.box(GRANITE, x - 1.0, 0, -1.1, x + 1.0, 1.0, 0.1)
        p.box(BRASS, x - 0.95, 21.9, -1.05, x + 0.95, 22.1, 0.1)
        lamp(p, x, 3.6, -1.0)
    for a, b, y0 in ((-IX + 0.9, -DW - 1.7, 0.0), (DW + 1.7, IX - 0.9, 0.0), (-DW + 0.1, DW - 0.1, 3.9)):
        p.box('glassTint', a, y0, -0.25, b, 22.4, -0.2)
        for c in rows(a, b, 2.3)[:-1]:
            m = c + (b - a) / max(1, round((b - a) / 2.3)) / 2
            p.box(BRASS, m - 0.05, y0, -0.32, m + 0.05, 22.4, -0.16)
        for y in (4.5, 9.0, 13.5, 18.0):
            if y > y0 + 0.3:
                p.box(BRASS, a, y - 0.06, -0.32, b, y + 0.06, -0.16)
        if y0 == 0.0:
            p.box(GRANITE, a, 0, -0.34, b, 0.7, -0.16)
    # Entablature across the whole front, cornice, parapet; a recess for the station's name.
    p.box(STONE, -W / 2, 22.4, -0.6, W / 2, H, 0.1)
    p.box(STONE_LT, -W / 2 - 0.2, H - 1.0, -1.0, W / 2 + 0.2, H, 0.1)
    p.box(BRASS, -W / 2 - 0.2, H - 1.1, -1.02, W / 2 + 0.2, H - 1.0, 0.1)
    p.box(STONE_DK, -W / 2, 22.4, -0.7, W / 2, 22.8, 0.1)
    p.box(GREEN, -17, 22.95, -0.66, 17, 24.85, -0.6)
    p.box(BRASS, -17.15, 22.85, -0.64, 17.15, 24.95, -0.6)
    # Clock surround over the doors (the face is the game's live clock).
    p.cyl(STONE_LT, (0, 16.0, -0.55), 2, 3.3, 0.7, seg=28)
    p.cyl(BRASS, (0, 16.0, -0.93), 2, 2.75, 0.06, seg=28)
    p.cyl(GREEN, (0, 16.0, -0.95), 2, 2.55, 0.06, seg=28)
    # Brass canopy over the doors, on rods.
    p.box(BRASS, -11, 3.75, -3.6, 11, 3.9, 0)
    p.box(STONE_LT, -10.9, 3.9, -3.5, 10.9, 4.0, 0)
    p.box('glassTint', -10.5, 3.72, -3.3, 10.5, 3.75, -0.3)
    p.box('light', -9.5, 3.66, -3.0, 9.5, 3.72, -2.7)
    for sx in (-10, -5, 5, 10):
        p.cyl(BRASS, (sx, 5.3, -1.7), 1, 0.03, 2.8, seg=6)
    p.box(BRASS, -DW + 0.1, 0, -0.34, -DW + 0.22, 3.75, 0.14)
    p.box(BRASS, DW - 0.22, 0, -0.34, DW - 0.1, 3.75, 0.14)
    for s in (-1, 1):
        planter(p, s * 12.5, -1.6, 2.0)


def stationbldg(p):
    """The Station Building's street front (67.6 m, 34 m tall): a department store over the private railway."""
    W, H = 67.6, 34.0
    x0, x1 = -W / 2, W / 2
    p.box(STONE, x0, 0, -0.3, x1, 6.4, 0)
    p.box(GRANITE, x0, 0, -0.38, x1, 0.7, -0.3)
    for c in rows(x0 + 1, x1 - 1, 5.5):
        if abs(c) < 4:
            continue
        display(p, c - 2.2, c + 2.2, 0.7, 4.6, -0.3)
        lamp(p, c - 2.75, 3.0, -0.3)
    p.box(GRANITE, -3.6, 0, -0.5, 3.6, 5.2, -0.3)
    doors(p, -1.6, 0, -0.5)
    doors(p, 1.6, 0, -0.5)
    p.box(GREEN, -3.2, 3.2, -0.56, 3.2, 4.8, -0.5)   # entrance name plate (game sign)
    p.box(BRASS, x0, 5.9, -0.5, x1, 6.4, -0.3)
    # Upper floors: a grid of fins and spandrels, windows between.
    p.box(STONE_LT, x0, 6.4, -0.2, x1, 30, 0)
    FL, FH = 6, 3.9
    windows(p, 'f', x0 + 0.7, x1 - 7.2, -0.2, 6.4, FL, FH, 3.3, 2.5, 2.3, 1.0, BRASS)
    piers(p, STONE, 'f', x0 + 0.7, x1 - 7.2, -0.2, 6.4, 30, 3.3, 0.5, 0.5)
    for f in range(1, FL):
        p.box(STONE, x0, 6.4 + f * FH - 0.25, -0.5, x1 - 7.2, 6.4 + f * FH + 0.25, -0.2)
    # A blank stone tower at one end carrying the vertical sign.
    p.box(STONE, x1 - 7.2, 6.4, -0.6, x1, H + 3, 0)
    p.box(BRASS, x1 - 7.3, H + 2.6, -0.7, x1 + 0.1, H + 3, 0)
    p.box(GREEN, x1 - 5.0, 9, -1.5, x1 - 2.2, 30, -0.6)   # vertical sign (game sign on its face)
    p.box(BRASS, x1 - 5.1, 8.9, -1.52, x1 - 2.1, 9.0, -0.6)
    p.box(BRASS, x1 - 5.1, 30, -1.52, x1 - 2.1, 30.1, -0.6)
    # Top: cornice, a set-back storey and a roof-garden trellis; the name board's frame.
    p.box(STONE, x0 - 0.2, 30, -0.8, x1 - 7.2, 30.8, 0)
    p.box(BRASS, x0 - 0.2, 29.9, -0.82, x1 - 7.2, 30, 0)
    p.box(STONE_DK, x0 + 1.5, 30.8, 1.5, x1 - 8, H, 6)
    p.box(WINDOW, x0 + 3, 31.6, 1.44, x1 - 9.5, 33.2, 1.5)
    for c in rows(x0, x1 - 7.2, 3.3):
        p.box(TIMBER, c - 0.06, 30.8, 0.2, c + 0.06, 33.0, 0.32)
    p.box(TIMBER, x0, 33.0, 0.1, x1 - 7.2, 33.14, 1.5)
    p.box(GREEN, -26, 30.9, -0.3, 18, 34.3, -0.1)   # roof name board (game sign)
    for sx in (-24, -4, 16):
        p.box(STEEL, sx - 0.08, 30.8, -0.1, sx + 0.08, 34.3, 0.05)


def shelter(p, w, d=2.4):
    """A bus or taxi shelter, `w` long: brass posts, glass back, timber soffit, a bench, fascia for the stop's name."""
    p.box(STONE_DK, -w / 2, 0, 0, w / 2, 0.08, d)
    for sx in (-w / 2 + 0.15, 0, w / 2 - 0.15):
        for z in (0.15, d - 0.15):
            p.box(BRASS, sx - 0.06, 0, z - 0.06, sx + 0.06, 2.6, z + 0.06)
    p.box('glassTint', -w / 2 + 0.2, 0.25, d - 0.17, w / 2 - 0.2, 2.2, d - 0.13)
    p.box(BRASS, -w / 2 + 0.15, 1.2, d - 0.18, w / 2 - 0.15, 1.25, d - 0.12)
    p.box(TIMBER, -w / 2 - 0.3, 2.6, -0.5, w / 2 + 0.3, 2.68, d + 0.3)
    p.box(STONE_LT, -w / 2 - 0.35, 2.68, -0.55, w / 2 + 0.35, 2.82, d + 0.35)
    p.box(BRASS, -w / 2 - 0.36, 2.58, -0.56, w / 2 + 0.36, 2.62, d + 0.36)
    p.box('light', -w / 2 + 1, 2.57, d / 2 - 0.08, w / 2 - 1, 2.6, d / 2 + 0.08)
    for s in (-1, 1):
        cx = s * w / 4
        p.box(TIMBER, cx - 1.3, 0.42, d - 0.75, cx + 1.3, 0.48, d - 0.3)
        for lx in (-1.1, 1.1):
            p.box(BRASS, cx + lx - 0.03, 0.08, d - 0.7, cx + lx + 0.03, 0.42, d - 0.35)
    p.box(GREEN, -w / 2 + 2.5, 2.05, -0.02, w / 2 - 2.5, 2.55, 0.02)       # stop name, street side
    p.box(GREEN, -w / 2 + 2.5, 2.05, d - 0.1, w / 2 - 2.5, 2.55, d - 0.06)   # and facing the island


def buscanopy(p):
    """Covered walk from the station doors to the bus terminal, 98 × 5 m."""
    W, D = 98.0, 5.0
    for c in rows(-W / 2, W / 2, 7.0):
        for z in (0.5, D - 0.5):
            p.box(STONE_DK, c - 0.28, 0, z - 0.28, c + 0.28, 0.6, z + 0.28)
            p.cyl(BRASS, (c, 2.4, z), 1, 0.1, 3.6, seg=8)
            p.cyl(BRASS_LT, (c, 4.16, z), 1, 0.18, 0.08, seg=8)
        p.box(BRASS, c - 0.05, 4.1, 0.5, c + 0.05, 4.2, D - 0.5)
        p.box('light', c - 0.4, 4.05, D / 2 - 0.1, c + 0.4, 4.1, D / 2 + 0.1)
    p.box(STONE_LT, -W / 2 - 0.5, 4.2, -0.4, W / 2 + 0.5, 4.42, D + 0.4)
    p.box(BRASS, -W / 2 - 0.52, 4.16, -0.42, W / 2 + 0.52, 4.2, D + 0.42)
    p.box(TIMBER, -W / 2, 4.14, 0, W / 2, 4.2, D)
    p.box('glassTint', -W / 2 + 1, 4.42, D / 2 - 0.9, W / 2 - 1, 4.46, D / 2 + 0.9)


def kiosk(p):
    """A small ticket and information kiosk, 4 × 3 m."""
    p.box(STONE_DK, -2.1, 0, -0.1, 2.1, 0.5, 3.1)
    p.box(STONE, -2.0, 0.5, 0, 2.0, 2.9, 3.0)
    display(p, -1.6, 1.6, 1.0, 2.3, 0, 0.08)
    p.box(TIMBER, -1.8, 0.95, -0.35, 1.8, 1.02, 0)
    winx(p, 0.6, 1.1, 2.4, 2.3, -2.0, -1, BRASS, SHOP)
    winx(p, 0.6, 1.1, 2.4, 2.3, 2.0, 1, BRASS, SHOP)
    p.box(GREEN, -1.6, 2.4, -0.04, 1.6, 2.8, 0)
    p.box(BRASS, -2.5, 2.9, -0.7, 2.5, 3.0, 3.5)
    p.box(STONE_LT, -2.4, 3.0, -0.6, 2.4, 3.16, 3.4)
    p.box(BRASS, -0.6, 3.16, 1.0, 0.6, 3.5, 2.0)
    lamp(p, -1.85, 1.9, 0)
    lamp(p, 1.85, 1.9, 0)


# ───────────────────────── landmarks on the avenue ─────────────────────────

def depato(p):
    """Department store on the corner facing the station: 1930s stone, a rounded corner tower. 40 × 40 m, 38 m."""
    W, D, H = 40.0, 40.0, 38.0
    x0, x1 = -W / 2, W / 2
    R = 6.0      # corner radius, at the front on the -x side
    G1, TOP = 7.2, 32.0
    stone = 'flat:#d8c9a8'
    p.box(stone, x0, 0, R, x1, TOP, D)
    p.box(stone, x0 + R, 0, 0, x1, TOP, R)
    p.cyl(stone, (x0 + R, (TOP + 6) / 2, R), 1, R, TOP + 6, seg=28)
    p.cyl(GRANITE, (x0 + R, 0.4, R), 1, R + 0.08, 0.8, seg=28)
    p.cyl(BRASS, (x0 + R, G1, R), 1, R + 0.2, 0.3, seg=28)
    p.cyl(stone, (x0 + R, TOP + 0.2, R), 1, R + 0.35, 0.8, seg=28)
    p.cyl(BRASS, (x0 + R, TOP + 6.1, R), 1, R + 0.25, 0.3, seg=28)
    p.cyl(GREEN, (x0 + R, TOP + 7.2, R), 1, R - 1.2, 2.0, seg=20)
    p.cyl(BRASS, (x0 + R, TOP + 8.6, R), 1, R - 3.2, 0.9, seg=16)
    p.cyl(BRASS, (x0 + R, TOP + 12, R), 1, 0.08, 6, seg=6)
    for f in range(7):
        y = G1 + 0.3 + f * 4.1
        if y + 2.6 < TOP + 5:
            p.cyl(WINDOW, (x0 + R, y + 2.0, R), 1, R + 0.05, 2.4, seg=28, caps=False)
    for k in range(14):
        a = math.pi + k * (math.pi / 2) / 13 * 1.0 + 0.0
        a = math.pi * (1.0 + 0.5 * k / 13)
        p.box(stone, x0 + R + (R + 0.1) * math.cos(a) - 0.22, G1, R + (R + 0.1) * math.sin(a) - 0.22,
              x0 + R + (R + 0.1) * math.cos(a) + 0.22, TOP + 5.9, R + (R + 0.1) * math.sin(a) + 0.22)
    # Corner entrance under the tower.
    a = math.pi * 1.25
    ex, ez = x0 + R + (R + 0.1) * math.cos(a), R + (R + 0.1) * math.sin(a)
    p.cyl(BRASS, (x0 + R, 5.2, R), 1, R + 1.6, 0.25, seg=28)
    p.cyl(GREEN, (x0 + R, 5.45, R), 1, R + 1.5, 0.25, seg=28)
    p.cyl(SHOP, (ex + 0.25, 2.2, ez + 0.25), 1, 1.9, 4.2, seg=14)
    p.cyl(BRASS, (ex + 0.25, 4.4, ez + 0.25), 1, 2.0, 0.2, seg=14)

    def street_face(length, skip):
        """One street front in front-face coordinates, leaving `skip` metres at the tower end."""
        a0, a1 = -length / 2 + skip, length / 2
        p.box(GRANITE, a0, 0, -0.08, a1, 0.8, 0)
        for c in rows(a0 + 0.6, a1 - 0.6, 5.6):
            display(p, c - 2.3, c + 2.3, 0.8, 5.4, 0)
            p.box(GREEN, c - 2.5, 5.55, -1.4, c + 2.5, 5.75, 0)
            p.box(BRASS, c - 2.52, 5.52, -1.43, c + 2.52, 5.56, -1.37)
            lamp(p, c - 2.8, 3.3, 0)
        p.box(BRASS, a0, G1 - 0.15, -0.2, a1, G1 + 0.15, 0)
        windows(p, 'f', a0 + 0.4, a1 - 0.4, 0, G1, 6, 4.1, 3.9, 2.6, 2.5, 1.0, WFRAME)
        piers(p, 'flat:#cbbb98', 'f', a0 + 0.4, a1 - 0.4, 0, G1, TOP, 3.9, 0.7, 0.3)
        for f in range(1, 6):
            p.box('flat:#cbbb98', a0, G1 + f * 4.1 - 0.3, -0.16, a1, G1 + f * 4.1 + 0.3, 0)
        p.box(stone, a0, TOP - 0.2, -0.6, a1, TOP + 0.7, 0)
        p.box(BRASS, a0, TOP - 0.32, -0.62, a1, TOP - 0.2, 0)

    street_face(W, R)
    p.turned(x0, D)
    street_face(D, 0)       # the tower end of the side face is at +length/2: trimmed below
    p.turned(None, 0)
    windows(p, 'r', R, D - 1, x1, G1, 6, 4.1, 3.9, 2.6, 2.5, 1.0, WFRAME)
    # Set-back top storey, roof sign frame.
    p.box('flat:#cbbb98', x0 + R + 2, TOP, 3, x1 - 2, H, D - 3)
    p.box(WINDOW, x0 + R + 4, TOP + 1.2, 2.94, x1 - 3, TOP + 4.4, 3.0)
    band(p, stone, x0 + R + 2, x1 - 2, 3, D - 3, H - 0.5, H, 0.3)
    for sx in (2, 10, 18):
        p.box(STEEL, sx - 0.08, H, 5.0, sx + 0.08, H + 5.6, 5.16)
        p.box(STEEL, sx - 0.06, H, 5.1, sx + 0.06, H + 0.1, 9.0)
    p.box(GREEN, 1, H + 1.4, 4.8, 19, H + 5.6, 5.0)   # roof sign (game sign)
    roof_plant(p, x0 + R + 6, x1 - 6, H, 12, D - 6, 9)


def hq(p):
    """Head office tower with a stepped crown. 44 × 44 m, 120 m to the top of the crown."""
    W, D = 44.0, 44.0
    x0, x1 = -W / 2, W / 2
    BASE, S1, S2, S3 = 12.0, 96.0, 108.0, 116.0
    stone = 'flat:#cfc6b4'
    dark = 'flat:#2a3238'
    # Stone base with a tall brass entrance and display windows.
    p.box(stone, x0, 0, 0, x1, BASE, D)
    band(p, GRANITE, x0, x1, 0, D, 0, 0.9, 0.08)
    band(p, BRASS, x0, x1, 0, D, BASE - 0.3, BASE, 0.25)
    for c in rows(x0 + 1, x1 - 1, 6.0):
        if abs(c) < 5:
            continue
        display(p, c - 2.2, c + 2.2, 0.9, 7.6, 0)
        lamp(p, c - 2.9, 3.6, 0)
    p.box(GRANITE, -4.6, 0, -0.5, 4.6, 10.2, 0)
    p.box(BRASS, -3.6, 0, -0.56, 3.6, 8.8, -0.5)
    p.box(SHOP, -3.3, 3.2, -0.6, 3.3, 8.5, -0.56)
    for sx in (-2.2, 0, 2.2):
        p.box(BRASS, sx - 0.05, 3.2, -0.63, sx + 0.05, 8.5, -0.58)
    doors(p, -1.7, 0, -0.56, 2.6, 3.0)
    doors(p, 1.7, 0, -0.56, 2.6, 3.0)
    p.box(BRASS, -5.4, 3.5, -2.2, 5.4, 3.7, -0.5)
    p.box(GREEN, -3.2, 9.0, -0.56, 3.2, 10.0, -0.5)   # name plate (game sign)
    for s in (-1, 1):
        planter(p, s * 6.6, -1.0, 2.0)
        lamp(p, s * 4.9, 4.2, -0.5)

    def tier(inset, y0, y1, bay):
        a0, a1, b0, b1 = x0 + inset, x1 - inset, inset, D - inset
        p.box(dark, a0 + 0.3, y0, b0 + 0.3, a1 - 0.3, y1, b1 - 0.3)
        seg = 8.4
        n = max(1, round((y1 - y0) / seg))
        for i in range(n):
            ya, yb = y0 + i * (y1 - y0) / n + 0.5, y0 + (i + 1) * (y1 - y0) / n
            for c in rows(a0, a1, bay):
                p.box(WINDOW, c - bay * 0.32, ya, b0 + 0.22, c + bay * 0.32, yb, b0 + 0.3)
                p.box(WINDOW, c - bay * 0.32, ya, b1 - 0.3, c + bay * 0.32, yb, b1 - 0.22)
            for c in rows(b0, b1, bay):
                p.box(WINDOW, a0 + 0.22, ya, c - bay * 0.32, a0 + 0.3, yb, c + bay * 0.32)
                p.box(WINDOW, a1 - 0.3, ya, c - bay * 0.32, a1 - 0.22, yb, c + bay * 0.32)
        for face, lo, hi, at in (('f', a0, a1, b0), ('b', a0, a1, b1), ('l', b0, b1, a0), ('r', b0, b1, a1)):
            piers(p, stone, face, lo, hi, at, y0, y1, bay, bay * 0.3, 0.0 if face in ('f', 'l') else 0.0)
        for cx, cz in ((a0, b0), (a1, b0), (a0, b1), (a1, b1)):
            p.box(stone, cx - 1.0, y0, cz - 1.0, cx + 1.0, y1 + 0.8, cz + 1.0)
        band(p, stone, a0, a1, b0, b1, y1 - 0.6, y1 + 0.5, 0.2)
        band(p, BRASS, a0, a1, b0, b1, y1 + 0.5, y1 + 0.7, 0.24)

    tier(0.0, BASE, S1, 2.2)
    tier(4.5, S1, S2, 2.2)
    tier(9.5, S2, S3, 2.5)
    # Crown: a lit lantern and a brass spire.
    p.box(stone, x0 + 14, S3, 14, x1 - 14, 120, D - 14)
    p.box('light', x0 + 14.6, S3 + 0.8, 13.9, x1 - 14.6, 119.2, 14.0)
    p.box('light', x0 + 14.6, S3 + 0.8, D - 14.0, x1 - 14.6, 119.2, D - 13.9)
    p.box('light', x0 + 13.9, S3 + 0.8, 14.6, x0 + 14.0, 119.2, D - 14.6)
    p.box('light', x1 - 14.0, S3 + 0.8, 14.6, x1 - 13.9, 119.2, D - 14.6)
    band(p, BRASS, x0 + 14, x1 - 14, 14, D - 14, 119.6, 120, 0.3)
    p.cyl(BRASS, (0, 123, D / 2), 1, 1.2, 6, seg=10)
    p.cyl(BRASS, (0, 131, D / 2), 1, 0.25, 10, seg=8)
    p.box(BEACON, -0.25, 136, D / 2 - 0.25, 0.25, 136.5, D / 2 + 0.25)


def bank(p):
    """Old bank from the city's early years: a columned stone front with a clock in the pediment. 26 × 30 m, 16 m."""
    W, D = 26.0, 30.0
    x0, x1 = -W / 2, W / 2
    stone = 'flat:#cfc4ab'
    # Steps, then the body set back behind a row of columns.
    for i in range(3):
        p.box(STONE_DK if i == 0 else stone, x0 + 1.5 - 0.0, 0, -2.0 + i * 0.45, x1 - 1.5, 0.9 - i * 0.3 if False else (i + 1) * 0.3, 0.6)
    p.box(stone, x0, 0, 0.6, x1, 12.0, D)
    band(p, GRANITE, x0, x1, 0.6, D, 0, 1.0, 0.08)
    for c in rows(x0 + 2.2, x1 - 2.2, 3.6):
        p.box(STONE_DK, c - 0.75, 0.9, -1.1, c + 0.75, 1.3, 0.3)
        p.cyl('flat:#ddd3bc', (c, 5.8, -0.4), 1, 0.52, 9.0, seg=16)
        p.cyl(stone, (c, 10.45, -0.4), 1, 0.66, 0.3, seg=16)
        p.box(stone, c - 0.75, 10.6, -1.15, c + 0.75, 10.9, 0.35)
    wins = rows(x0 + 2.2, x1 - 2.2, 3.6)
    for i in range(len(wins) - 1):
        m = (wins[i] + wins[i + 1]) / 2
        if abs(m) < 1.0:
            continue
        win(p, m - 1.0, 2.2, m + 1.0, 7.4, 0.6, -1, BRONZE)
        p.box(STONE_DK, m - 1.3, 7.4, 0.46, m + 1.3, 7.8, 0.6)
    # Bronze doors in a brass surround, lanterns either side.
    p.box(BRASS, -1.75, 0.9, 0.44, 1.75, 6.3, 0.6)
    p.box(BRONZE, -1.5, 0.9, 0.4, 1.5, 5.4, 0.44)
    p.box(BRASS, -0.03, 0.9, 0.36, 0.03, 5.4, 0.4)
    for s in (-1, 1):
        for y in (1.6, 3.0, 4.4):
            p.box(BRASS, s * 0.75 - 0.5, y, 0.37, s * 0.75 + 0.5, y + 0.9, 0.4)
            p.box(BRONZE, s * 0.75 - 0.42, y + 0.08, 0.36, s * 0.75 + 0.42, y + 0.82, 0.37)
        lamp(p, s * 2.5, 3.6, 0.6)
    p.box(GREEN, -1.5, 5.55, 0.4, 1.5, 6.2, 0.44)   # name plate (game sign)
    # Entablature, pediment with the clock's surround, attic.
    p.box(stone, x0 - 0.2, 10.9, -1.3, x1 + 0.2, 12.2, D + 0.2)
    p.box(BRASS, x0 - 0.25, 12.2, -1.35, x1 + 0.25, 12.32, D + 0.25)
    p.box(STONE_DK, x0, 11.2, -1.36, x1, 11.9, -1.3)
    p.prism(stone, [(x0 - 0.2, 12.32), (x1 + 0.2, 12.32), (0, 16.0)], 'z', -1.3, 1.5)
    p.prism('flat:#ddd3bc', [(x0 + 1.6, 12.6), (x1 - 1.6, 12.6), (0, 15.3)], 'z', -1.36, -1.3)
    p.cyl(BRASS, (0, 13.75, -1.4), 2, 1.0, 0.08, seg=20)
    p.cyl('flat:#f4efe2', (0, 13.75, -1.44), 2, 0.86, 0.04, seg=20)
    p.box(stone, x0 + 2, 12.3, 3, x1 - 2, 15.2, D - 2)
    band(p, stone, x0 + 2, x1 - 2, 3, D - 2, 14.8, 15.2, 0.25)
    # Sides and back: pilasters and tall windows.
    for face, at in (('l', x0), ('r', x1)):
        piers(p, 'flat:#ddd3bc', face, 2.0, D - 1.0, at, 1.0, 10.9, 4.0, 0.9, 0.25)
        windows(p, face, 2.0, D - 1.0, at, 1.0, 1, 9.9, 4.0, 1.8, 5.2, 1.4, BRONZE)
    windows(p, 'b', x0 + 1, x1 - 1, D, 1.0, 2, 4.6, 4.0, 1.8, 2.4, 1.2, BRONZE)


PROPS = {
    'hotel': (hotel, 67.6), 'front': (front, 88), 'stationbldg': (stationbldg, 67.6),
    'busshelter': (lambda p: shelter(p, 12.0), 12), 'taxishelter': (lambda p: shelter(p, 16.0, 2.2), 16),
    'buscanopy': (buscanopy, 98), 'kiosk': (kiosk, 5), 'depato': (depato, 40), 'hq': (hq, 44), 'bank': (bank, 26),
}


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('plaza', [dict(id=k, w=w, gap=8.0) for k, (_, w) in PROPS.items()], build_hi, lambda v: None)
