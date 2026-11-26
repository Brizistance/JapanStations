# Builds Shinshio's landmarks (src/stations/shinshio-street.ts): the fish market hall on the dock quay, the
# ferry terminal on the river-mouth sea wall with its pontoon, and the fishermen's harbour shrine. After a
# regional wholesale fish market (docs/theme-notes.md "Fish market town").
#
#   blender --background --python tools/blender/build_shinshio.py -- [--renders <dir>]
#
# Writes assets/buildings/shinshio.blend, public/models/buildings/shinshio.glb and src/stations/anchors/shinshio.ts.
#
#   ichiba   the wholesale hall: a 150 x 20 m steel shed under a monitor roof, open to the quay behind and
#            to the truck bays in front between low walls; the auction floor inside is walked (the game
#            lays its floor and fittings). A two-storey office at its west end carries the name.
#   terminal the ferry terminal: a 40 x 12 m two-storey building, a glass waiting hall you walk through from
#            the street door to the pier door, offices above, a lookout with a mast at one corner.
#   pontoon  the floating landing stage behind the terminal: a 26 x 7 m pontoon, a shelter, and the gangway
#            from the sea wall (front at the wall, +z out over the water).
#   jinja    the harbour shrine on a 18 x 22 m lot: a stone torii at the quay, lanterns, a stone-fenced
#            precinct and a small copper-roofed hall raised on a stone base.

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

STEEL_G = 'flat:#8c969c'
STEEL_DK = 'flat:#5d666c'
CLAD = 'flat:#b9c3c6'
CLAD_DK = 'flat:#98a3a7'
CONC = 'flat:#b8b5ad'
ROOF = 'flat:#6f7c84'
INDIGO = 'flat:#1d2f55'
CREAM = 'flat:#ece6d6'
GRANITE_S = 'flat:#a9a69f'
COPPER = 'flat:#5f9184'
WOOD = 'flat:#8a5a3a'
VERM = 'flat:#c23b22'
BOX_W = 'flat:#f1f2ef'
BOX_B = 'flat:#3b78b8'
PALLET = 'flat:#9c7a52'
WARM_LIT = 'windowDim'

# ── The hall ──
HW, HD = 150.0, 20.0          # length along the street, depth
EAVE, RIDGE = 7.2, 9.6
BAY = 7.5
OFF = 14.0                    # the office at the west end (x -75 … -61)


def ichiba(p):
    x0, x1 = -HW / 2, HW / 2
    # Columns on the front, middle and back lines, every bay; a deep truss line under the eaves.
    n = int(round(HW / BAY))
    for k in range(n + 1):
        x = x0 + k * BAY
        for z in (0.3, HD / 2, HD - 0.3):
            if x < x0 + OFF - 0.1 and z < HD - 1:
                continue
            p.box(STEEL_G, x - 0.2, 0, z - 0.2, x + 0.2, EAVE if z != HD / 2 else RIDGE - 1.2, z + 0.2)
    for z in (0.3, HD - 0.3):
        p.box(STEEL_DK, x0 + OFF, EAVE - 0.9, z - 0.25, x1, EAVE, z + 0.25)
    p.box(STEEL_DK, x0 + OFF, RIDGE - 1.6, HD / 2 - 0.25, x1, RIDGE - 1.2, HD / 2 + 0.25)
    # Front (the truck side): a low block wall between the bays, open above; a canopy over the bays.
    for k in range(n):
        a, e = x0 + k * BAY + 0.2, x0 + (k + 1) * BAY - 0.2
        if a < x0 + OFF:
            continue
        if k % 2 == 0:
            p.box(CONC, a, 0, 0.1, e, 1.1, 0.5)
    p.box(ROOF, x0 + OFF, EAVE, -3.0, x1, EAVE + 0.2, 0.3)
    p.box(STEEL_DK, x0 + OFF, EAVE - 0.35, -3.0, x1, EAVE, -2.85)
    # Back (the quay): open, the roof carried 5 m out over the apron on cantilevers.
    p.box(ROOF, x0, EAVE, HD - 0.3, x1, EAVE + 0.2, HD + 5.0)
    for k in range(n + 1):
        x = x0 + k * BAY
        p.prism(STEEL_DK, [(HD - 0.3, EAVE - 1.0), (HD + 5.0, EAVE - 0.05), (HD - 0.3, EAVE - 0.05)], 'x', x - 0.12, x + 0.12)
    # The monitor roof: two pitches from the eaves to the clerestory, a raised ridge over glass louvres.
    p.prism(ROOF, [(0.0, EAVE), (HD / 2 - 3.0, RIDGE - 1.2), (HD / 2 - 3.0, RIDGE - 1.0), (0.0, EAVE + 0.2)], 'x', x0, x1)
    p.prism(ROOF, [(HD, EAVE), (HD, EAVE + 0.2), (HD / 2 + 3.0, RIDGE - 1.0), (HD / 2 + 3.0, RIDGE - 1.2)], 'x', x0, x1)
    for s in (-1, 1):
        p.box('glassTint', x0, RIDGE - 1.2, HD / 2 + s * 3.0 - 0.05, x1, RIDGE - 0.2, HD / 2 + s * 3.0 + 0.05)
    p.prism(ROOF, [(HD / 2 - 3.6, RIDGE - 0.2), (HD / 2, RIDGE + 0.6), (HD / 2 + 3.6, RIDGE - 0.2), (HD / 2 + 3.6, RIDGE), (HD / 2, RIDGE + 0.8), (HD / 2 - 3.6, RIDGE)], 'x', x0, x1)
    # Gable ends: ribbed cladding from the eaves up, open below on the east, the office on the west.
    gable = [(0.0, EAVE), (HD / 2 - 3.0, RIDGE - 1.0), (HD / 2 + 3.0, RIDGE - 1.0), (HD, EAVE), (HD, EAVE + 0.01)]
    p.prism(CLAD, [(0.0, EAVE - 1.0), (HD, EAVE - 1.0), (HD, EAVE), (HD / 2 + 3.0, RIDGE - 1.0), (HD / 2 - 3.0, RIDGE - 1.0), (0.0, EAVE)], 'x', x1 - 0.15, x1)
    # Lights under the roof: long strips that glow at night over the floor.
    for z in (5.0, 15.0):
        for k in range(n):
            a = x0 + k * BAY + 1.2
            if a < x0 + OFF:
                continue
            p.box('light', a, EAVE - 1.0, z - 0.12, a + 5.0, EAVE - 0.92, z + 0.12)
    # The office: two storeys of ribbed cladding and windows, the name board over the street door.
    ox0, ox1 = x0, x0 + OFF
    p.box(CLAD, ox0, 0, 0, ox1, 7.0, HD - 1.0)
    p.box(CLAD_DK, ox0 - 0.1, 6.9, -0.1, ox1 + 0.1, 7.4, HD - 0.9)
    for y in (0.0, 3.4):
        for c in (ox0 + 2.2, ox0 + 5.6, ox0 + 9.0, ox0 + 12.0):
            if y == 0.0 and abs(c - (ox0 + 5.6)) < 0.1:
                continue
            p.box('frame' if False else ALU_DK, c - 1.0, y + 1.0, -0.06, c + 1.0, y + 2.6, 0.0)
            p.box(WINDOW, c - 0.92, y + 1.08, -0.08, c + 0.92, y + 2.52, -0.02)
        for zc in (4.0, 10.0, 16.0):
            p.box(ALU_DK, ox0 - 0.06, y + 1.0, zc - 1.0, ox0, y + 2.6, zc + 1.0)
            p.box(WINDOW, ox0 - 0.08, y + 1.08, zc - 0.92, ox0 - 0.02, y + 2.52, zc + 0.92)
    p.box(ALU_DK, ox0 + 4.4, 0, -0.08, ox0 + 6.8, 2.4, 0.0)
    p.box('glassTint', ox0 + 4.5, 0.05, -0.1, ox0 + 6.7, 2.3, -0.08)
    p.box(CLAD_DK, ox0 + 3.8, 2.4, -1.2, ox0 + 7.4, 2.55, 0.0)
    mark('name', ox0 + OFF / 2, 4.95, -0.14, 11.0, 1.0)
    mark('_office', ox0 + OFF / 2, 0, (HD - 1.0) / 2, OFF, HD - 1.0)
    mark('_floor', (ox1 + x1) / 2, 0, HD / 2, x1 - ox1, HD)
    mark('gate', x0 + OFF + 4 * BAY + BAY / 2, EAVE - 1.6, -2.95, 6.0, 0.9)
    # Fish boxes on pallets down the auction floor, in lines, with gangways between.
    import random
    rnd = random.Random(7)
    for k in range(n):
        a = x0 + k * BAY
        if a < x0 + OFF + 0.5:
            continue
        for zc in (4.0, 8.0, 12.5, 16.5):
            if rnd.random() < 0.3:
                continue
            for i in range(3):
                bx = a + 1.2 + i * 1.7
                h = 0.12 + 0.18 * rnd.randint(1, 3)
                p.box(PALLET, bx, 0, zc - 0.55, bx + 1.4, 0.12, zc + 0.55)
                p.box(BOX_W if rnd.random() < 0.7 else BOX_B, bx + 0.05, 0.12, zc - 0.5, bx + 1.35, 0.12 + h, zc + 0.5)
    mark('_boxes', (ox1 + x1) / 2, 0, HD / 2, x1 - ox1, HD - 3.0)


# ── The ferry terminal ──
FW, FD = 40.0, 12.0
FDOOR = (-3.0, 3.0, 2.8)      # the street door and the pier door, the same span
F1 = 4.2                      # first floor height


def ferry(p):
    x0, x1 = -FW / 2, FW / 2
    T = 0.3
    # Ground floor: a glass waiting hall in white piers, doors front and back on one line.
    for z, face in ((0.0, -1), (FD, 1)):
        bays = 10
        bw = FW / bays
        for k in range(bays + 1):
            c = x0 + k * bw
            p.box(WHITE, max(x0, c - 0.3), 0, z - 0.3 if face < 0 else z - 0.0, min(x1, c + 0.3), F1, z + 0.0 if face < 0 else z + 0.3)
        for k in range(bays):
            a, e = x0 + k * bw + 0.3, x0 + (k + 1) * bw - 0.3
            door = a < FDOOR[1] and e > FDOOR[0]
            y0 = FDOOR[2] if door else 0.0
            zz = z - 0.08 if face < 0 else z + 0.08
            p.box('glassTint', a, y0, min(z, zz), e, F1 - 0.3, max(z, zz))
            p.box(ALU_DK, a, y0, min(z, zz) - 0.02, e, y0 + 0.08, max(z, zz) + 0.02)
    for x in (x0, x1 - T):
        p.box(WHITE, x, 0, 0, x + T, F1, FD)
    # Upper floor: white cladding with a band of windows, a deep blue fascia, the flat roof.
    p.box(WHITE, x0, F1, 0, x1, F1 + 3.6, FD)
    for c in [x0 + 2.0 + i * 3.0 for i in range(12)]:
        p.box(ALU_DK, c - 1.2, F1 + 1.0, -0.06, c + 1.2, F1 + 2.6, 0.0)
        p.box(WINDOW, c - 1.12, F1 + 1.08, -0.08, c + 1.12, F1 + 2.52, -0.02)
        p.box(ALU_DK, c - 1.2, F1 + 1.0, FD, c + 1.2, F1 + 2.6, FD + 0.06)
        p.box(WINDOW, c - 1.12, F1 + 1.08, FD + 0.02, c + 1.12, F1 + 2.52, FD + 0.08)
    p.box(INDIGO, x0 - 0.15, F1 - 0.2, -0.15, x1 + 0.15, F1 + 0.6, FD + 0.15)
    p.box(INDIGO, x0 - 0.2, F1 + 3.6, -0.2, x1 + 0.2, F1 + 4.1, FD + 0.2)
    mark('name', -6.0, F1 + 0.2, -0.17, 22.0, 0.7)
    # A canopy over the street door on two posts, no deeper than the pavement in front.
    p.box(WHITE, -4.5, 3.2, -2.6, 4.5, 3.45, 0.0)
    for x in (-4.2, 4.2):
        p.box(STEEL_DK, x - 0.1, 0, -2.5, x + 0.1, 3.2, -2.3)
    mark('_post', 4.2, 0, -2.4, 0.2, 3.2)
    p.box(WHITE, -4.5, 3.2, FD, 4.5, 3.45, FD + 3.0)
    # The lookout: a glazed room on the roof at the east end, the mast above.
    lx0, lx1 = x1 - 8.0, x1 - 1.0
    ly = F1 + 4.1
    p.box(WHITE, lx0, ly, 2.0, lx1, ly + 0.9, 9.0)
    p.box('glassTint', lx0 + 0.1, ly + 0.9, 2.1, lx1 - 0.1, ly + 2.6, 8.9)
    p.box(INDIGO, lx0 - 0.3, ly + 2.6, 1.7, lx1 + 0.3, ly + 2.9, 9.3)
    p.cyl(STEEL_G, ((lx0 + lx1) / 2, ly + 6.4, 5.5), 1, 0.08, 7.0, seg=6)
    p.box(STEEL_G, (lx0 + lx1) / 2 - 1.4, ly + 6.2, 5.47, (lx0 + lx1) / 2 + 1.4, ly + 6.28, 5.53)
    p.box('light', (lx0 + lx1) / 2 - 0.1, ly + 9.85, 5.4, (lx0 + lx1) / 2 + 0.1, ly + 10.0, 5.6)
    # Inside: warm ceiling panels the game sees through the glass at night.
    for x in (x0 + 4.0, x0 + 12.0, x0 + 20.0, x0 + 28.0, x0 + 36.0):
        p.box(WARM_LIT, x - 1.5, F1 - 0.32, 3.0, x + 1.5, F1 - 0.3, 9.0)
    mark('_hall', 0, 0, FD / 2, FW - 2 * T, FD)
    mark('_door', 0, 0, 0, FDOOR[1] - FDOOR[0], FDOOR[2])
    mark('board', -12.0, 1.9, FD - 0.6, 3.2, 1.0, (0, -1))


def pontoon(p):
    # The gangway from the wall (z 0) down to the pontoon at z 16; the pontoon from z 16 to 23.
    GL = 16.0
    p.prism(STEEL_G, [(0.0, 0.0), (GL, -1.1), (GL, -1.25), (0.0, -0.15)], 'z', -1.1, 1.1) if False else None
    p.box(STEEL_G, -1.1, -0.15, 0.0, 1.1, 0.0, GL)
    for s in (-1, 1):
        p.box(WHITE, s * 1.1 - 0.05, 0.0, 0.0, s * 1.1 + 0.05, 1.1, GL)
        p.box(WHITE, s * 1.1 - 0.08, 1.05, 0.0, s * 1.1 + 0.08, 1.15, GL)
    p.box(WHITE, -1.3, 2.3, 0.0, 1.3, 2.45, GL)
    for z in (0.3, GL / 2, GL - 0.3):
        for s in (-1, 1):
            p.box(WHITE, s * 1.2 - 0.06, 0.0, z - 0.06, s * 1.2 + 0.06, 2.3, z + 0.06)
    p.box(CONC, -13.0, -1.6, GL, 13.0, -0.25, GL + 7.0)
    p.box('flat:#2b2f33', -13.0, -1.9, GL + 0.1, 13.0, -1.6, GL + 6.9)
    for x in (-12.6, 12.6):
        p.box(STEEL_DK, x - 0.15, -0.25, GL + 6.4, x + 0.15, 0.5, GL + 6.7)
    for x in (-10.0, -5.0, 5.0, 10.0):
        p.cyl('flat:#2a2a2a', (x, -0.6, GL + 7.15), 0, 0.35, 1.8, seg=10)
    # The shelter on the pontoon: a white roof on four posts.
    p.box(WHITE, -4.0, 2.4, GL + 1.0, 4.0, 2.6, GL + 6.0)
    for x in (-3.7, 3.7):
        for z in (GL + 1.3, GL + 5.7):
            p.box(STEEL_DK, x - 0.08, -0.25, z - 0.08, x + 0.08, 2.4, z + 0.08)
    p.box(WOOD, -3.0, -0.25, GL + 4.9, 3.0, 0.2, GL + 5.4)
    mark('_gang', 0, 0, GL / 2, 2.2, GL)
    mark('_deck', 0, -0.25, GL + 3.5, 26.0, 7.0)


# ── The harbour shrine ──
JW, JD = 18.0, 22.0


def torii(p, z, w, h, mat):
    for s in (-1, 1):
        p.cyl(mat, (s * w / 2, h / 2, z), 1, 0.26, h, seg=12)
        p.cyl(mat, (s * w / 2, 0.25, z), 1, 0.36, 0.5, seg=12)
    p.box(mat, -w / 2 - 0.6, h - 1.1, z - 0.18, w / 2 + 0.6, h - 0.8, z + 0.18)
    p.prism(mat, [(z - 0.35, h - 0.15), (z + 0.35, h - 0.15), (z + 0.45, h + 0.25), (z - 0.45, h + 0.25)], 'z', 0, 0) if False else None
    p.box(mat, -w / 2 - 1.0, h - 0.2, z - 0.32, w / 2 + 1.0, h + 0.25, z + 0.32)
    p.box(mat, -0.15, h - 0.8, z - 0.14, 0.15, h - 0.2, z + 0.14)


def toro(p, x, z):
    p.box(GRANITE_S, x - 0.4, 0, z - 0.4, x + 0.4, 0.3, z + 0.4)
    p.cyl(GRANITE_S, (x, 0.9, z), 1, 0.14, 1.2, seg=8)
    p.box(GRANITE_S, x - 0.3, 1.5, z - 0.3, x + 0.3, 1.6, z + 0.3)
    p.box('windowDim', x - 0.22, 1.6, z - 0.22, x + 0.22, 2.0, z + 0.22)
    p.box(GRANITE_S, x - 0.45, 2.0, z - 0.45, x + 0.45, 2.15, z + 0.45)
    p.box(GRANITE_S, x - 0.12, 2.15, z - 0.12, x + 0.12, 2.4, z + 0.12)


def jinja(p):
    x0, x1 = -JW / 2, JW / 2
    # A granite torii at the front (the quay), the approach paving, lanterns either side.
    torii(p, 1.2, 4.2, 4.6, GRANITE_S)
    p.box('flat:#c9c4b8', -1.2, 0, 0, 1.2, 0.03, 15.0)
    for z in (4.5, 9.0):
        for s in (-1, 1):
            toro(p, s * 2.6, z)
    # The stone fence round the precinct, open at the torii.
    for s in (-1, 1):
        p.box(GRANITE_S, s * JW / 2 - 0.2, 0, 0.2, s * JW / 2 + 0.2, 1.1, JD)
        p.box(GRANITE_S, s * 2.4 if s > 0 else x0, 0, 0.0, x1 if s > 0 else -2.4, 1.1, 0.4)
    p.box(GRANITE_S, x0, 0, JD - 0.4, x1, 1.1, JD)
    # Komainu plinths by the hall's steps.
    for s in (-1, 1):
        p.box(GRANITE_S, s * 2.4 - 0.45, 0, 11.6, s * 2.4 + 0.45, 1.0, 12.5)
        p.box('flat:#8e8a80', s * 2.4 - 0.3, 1.0, 11.75, s * 2.4 + 0.3, 1.8, 12.35)
    # The hall: a stone base, a timber body in vermilion and white, a copper roof with a deep front eave.
    bx0, bx1, bz0, bz1 = -3.6, 3.6, 13.5, 20.5
    p.box(GRANITE_S, bx0 - 0.6, 0, bz0 - 0.6, bx1 + 0.6, 0.9, bz1 + 0.6)
    for i, y in enumerate((0.3, 0.6)):
        p.box(GRANITE_S, -1.2, 0, bz0 - 1.5 + i * 0.5, 1.2, y, bz0 - 0.6)
    p.box(CREAM, bx0, 0.9, bz0, bx1, 3.6, bz1)
    for x in (bx0, -1.2, 1.2, bx1):
        p.box(VERM, x - 0.15, 0.9, bz0 - 0.15, x + 0.15, 3.7, bz0 + 0.15)
    p.box(VERM, bx0 - 0.1, 3.4, bz0 - 0.2, bx1 + 0.1, 3.7, bz1 + 0.1)
    p.box(WOOD, -1.05, 0.9, bz0 - 0.05, 1.05, 3.0, bz0)
    p.prism(COPPER, [(bz0 - 2.4, 3.55), ((bz0 + bz1) / 2, 6.0), (bz1 + 0.8, 3.7), (bz1 + 0.8, 3.95), ((bz0 + bz1) / 2, 6.3), (bz0 - 2.4, 3.8)], 'x', bx0 - 1.0, bx1 + 1.0)
    p.box(COPPER, -0.25, 6.0, bz0 - 0.5, 0.25, 6.4, bz1 + 0.5)
    # A sacred rope and paper streamers across the front.
    p.box('flat:#d9c48a', bx0 + 0.2, 3.15, bz0 - 0.32, bx1 - 0.2, 3.3, bz0 - 0.2)
    for x in (-2.0, 0.0, 2.0):
        p.box(WHITE, x - 0.1, 2.75, bz0 - 0.3, x + 0.1, 3.15, bz0 - 0.26)
    # The offering box and the hand-washing basin.
    p.box(WOOD, -0.8, 0, bz0 - 2.2, 0.8, 0.8, bz0 - 1.6)
    p.box(GRANITE_S, 4.5, 0, 6.0, 6.5, 0.7, 7.2)
    p.box('flat:#4f6d78', 4.6, 0.68, 6.1, 6.4, 0.71, 7.1)
    for x in (4.6, 6.4):
        for z in (6.0, 7.2):
            p.box(WOOD, x - 0.08, 0, z - 0.08, x + 0.08, 2.4, z + 0.08)
    p.prism(WOOD, [(5.4, 2.4), (6.6, 3.0), (7.8, 2.4), (7.8, 2.55), (6.6, 3.15), (5.4, 2.55)], 'x', 4.2, 6.8)
    mark('plaque', 0, 3.6, 1.2 - 0.34, 0.6, 0.9)
    mark('_hall', 0, 0, (bz0 + bz1) / 2, bx1 - bx0 + 1.2, bz1 - bz0 + 1.2)
    mark('_torii', 0, 0, 1.2, 4.2, 0.8)


VARIANTS = [
    dict(id='ichiba', w=HW, d=HD, h=RIDGE + 0.8, fn=ichiba, gap=10.0),
    dict(id='terminal', w=FW, d=FD, h=F1 + 14.0, fn=ferry, gap=10.0),
    dict(id='pontoon', w=26.0, d=23.0, h=2.6, fn=pontoon, gap=10.0),
    dict(id='jinja', w=JW, d=JD, h=6.4, fn=jinja, gap=10.0),
]


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    v['fn'](body)
    return body, signs


def build_lo(v):
    return None


if __name__ == '__main__':
    run('shinshio', VARIANTS, build_hi, build_lo)
    write_anchors('shinshio')
