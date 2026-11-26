# Builds Umibe-shiyakusho-mae's landmarks (src/stations/umibe-street.ts): Kawaminato City Hall and the pieces
# of the seaside park in front of it. After Kobe's city hall and Higashi Yūenchi (docs/theme-notes.md "Civic axis").
#
#   blender --background --python tools/blender/build_umibe.py -- [--renders <dir>]
#
# Writes assets/buildings/umibe.blend, public/models/buildings/umibe.glb and src/stations/anchors/umibe.ts.
#
#   shiyakusho  the city hall on its 76 × 48 m lot: an 18 m forecourt, the 106 m office tower (pale granite
#               piers, navy glass) with a two-storey lobby you walk into, and the low assembly wing beside it.
#               The lobby's walls are thin and its front is clear glass: the inside is built in code.
#   monument    the sail monument on the park's sea terrace
#   bandshell   the open-air stage
#   kadan       the flower-bed crest at the head of the park's mall
#   kyukeijo    the park's rest house (a kiosk café and the toilets)
#   renga       the red-brick seafood hall on the dock quay, walked into (2026-11-25)

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

PALE = 'flat:#e7e6e1'
PALE_DK = 'flat:#cfcdc6'
NAVY = 'flat:#23395b'
NAVY_GL = 'flat:#2f4a6b'
WARM_C = 'flat:#ffe2b0'
FLOORC = 'flat:#d0cfca'

# The lot and what stands on it (model frame: front at z = 0, +z back).
W, D = 76.0, 48.0
TX0, TX1, TZ0, TZ1 = -12.0, 38.0, 18.0, 48.0      # the tower
LOB_Z = 36.0                                      # the lobby runs from the front wall back to the core
LOB_H = 8.0
DOOR = (9.0, 17.0, 3.3)                           # x0, x1, height of the open doorway
WX0, WX1, WZ0, WZ1, WH = -38.0, -14.0, 14.0, 40.0, 14.0   # the assembly wing
TOP = 100.0


def shiyakusho(p):
    T = 0.35
    # ── The lobby storey: piers and clear glass in front, stone side walls, the core behind ──
    n = 8
    bw = (TX1 - TX0) / n
    for k in range(n + 1):
        c = TX0 + k * bw
        p.box(PALE, max(TX0, c - 0.45), 0, TZ0 - 0.25, min(TX1, c + 0.45), LOB_H, TZ0 + 0.45)
    for k in range(n):
        a, e = TX0 + k * bw + 0.45, TX0 + (k + 1) * bw - 0.45
        door = a < DOOR[1] and e > DOOR[0]
        y0 = DOOR[2] if door else 0.0
        p.box('glassTint', a, y0, TZ0 + 0.06, e, LOB_H - 0.5, TZ0 + 0.12)
        for y in ([DOOR[2]] if door else [0.0, 2.6]) + [5.2, LOB_H - 0.55]:
            p.box(ALU_DK, a, y, TZ0 + 0.02, e, y + 0.08, TZ0 + 0.16)
        if not door:
            p.box(ALU_DK, (a + e) / 2 - 0.04, 0, TZ0 + 0.02, (a + e) / 2 + 0.04, LOB_H - 0.5, TZ0 + 0.16)
    p.box(PALE, TX0, LOB_H - 0.5, TZ0 - 0.25, TX1, LOB_H, TZ0 + 0.45)
    p.box(PALE, TX0, 0, TZ0, TX0 + T, LOB_H, LOB_Z)
    p.box(PALE, TX1 - T, 0, TZ0, TX1, LOB_H, LOB_Z)
    p.box(PALE_DK, TX0, 0, LOB_Z, TX1, LOB_H, TZ1)
    # (The core's other three faces: service doors and louvres at the back, windows down the sides.)
    for face, a0, a1, at in sides(TX0, TX1, LOB_Z, TZ1, 'blr'):
        for c in rows(a0 + 1, a1 - 1, 6.0):
            if face == 'b':
                slab(p, 'metal:#a7acb1', face, c - 1.8, c + 1.8, 0, 3.4, at, 0.05)
            else:
                quad(p, WINDOW, face, c - 1.6, c + 1.6, 1.0, 3.2, out(face, at, 0.03))
    for a0, a1 in ((TZ0 + 1.5, LOB_Z - 1.5),):
        for at, face in ((TX0, 'l'), (TX1, 'r')):
            for c in rows(a0, a1, 5.5):
                quad(p, WINDOW, face, c - 1.9, c + 1.9, 0.9, 6.6, out(face, at, 0.03), col=NAVY_GL)
    # The entrance canopy on two round columns, its soffit lit.
    cx = (DOOR[0] + DOOR[1]) / 2
    p.box(PALE_DK, DOOR[0] - 2.0, 3.9, TZ0 - 6.0, DOOR[1] + 2.0, 4.25, TZ0 - 0.25)
    p.box('light', DOOR[0] - 1.2, 3.86, TZ0 - 5.2, DOOR[1] + 1.2, 3.9, TZ0 - 1.0)
    for x in (DOOR[0] - 1.2, DOOR[1] + 1.2):
        p.cyl(PALE, (x, 1.95, TZ0 - 5.2), 1, 0.3, 3.9, seg=14)
    board(p, 'entrance', 'f', cx - 4.0, cx + 4.0, 4.4, 5.2, TZ0 - 5.9, col='flat:#f4f3ee', proud=0.1)
    mark('_door', cx, 0, TZ0, DOOR[1] - DOOR[0], DOOR[2])
    mark('_lobby', (TX0 + TX1) / 2, 0, (TZ0 + LOB_Z) / 2, TX1 - TX0, LOB_Z - TZ0)
    mark('_tower', (TX0 + TX1) / 2, 0, (TZ0 + TZ1) / 2, TX1 - TX0, TZ1 - TZ0)
    mark('_cols', cx, 0, TZ0 - 5.2, DOOR[1] - DOOR[0] + 2.4, 0.6)

    # ── The tower: granite piers every bay, navy glass between, solid granite corners, a dark slot up the middle ──
    p.box(NAVY, TX0 + 0.3, LOB_H, TZ0 + 0.3, TX1 - 0.3, TOP - 6, TZ1 - 0.3)
    fh = 4.0
    floors = int((TOP - 6 - LOB_H) / fh)
    for face, a0, a1, at in sides(TX0, TX1, TZ0, TZ1):
        c0, c1 = a0 + 3.2, a1 - 3.2
        nb = max(1, round((c1 - c0) / 3.125))
        b = (c1 - c0) / nb
        for i in range(floors):
            y = LOB_H + i * fh
            for k in range(nb):
                quad(p, WINDOW, face, c0 + k * b + 0.3, c0 + (k + 1) * b - 0.3, y + 1.05, y + fh - 0.25, out(face, at, -0.25), col=NAVY_GL)
            slab(p, PALE_DK, face, c0, c1, y, y + 0.9, at, -0.2)
        for k in range(nb + 1):
            c = c0 + k * b
            slab(p, PALE, face, c - 0.3, c + 0.3, LOB_H, TOP - 6, at, 0.25)
    for xa, xb in ((TX0, TX0 + 3.2), (TX1 - 3.2, TX1)):
        for za, zb in ((TZ0, TZ0 + 3.2), (TZ1 - 3.2, TZ1)):
            p.box(PALE, xa, LOB_H, za, xb, TOP, zb)
    # (The slot: the lift lobbies' window, dark from the canopy to the crown.)
    p.box(GLASS_DK, cx - 1.3, LOB_H, TZ0 - 0.3, cx + 1.3, TOP - 6, TZ0 + 0.4)
    for y in [LOB_H + fh * i for i in range(floors + 1)]:
        p.box(ALU_DK, cx - 1.3, y - 0.06, TZ0 - 0.34, cx + 1.3, y + 0.06, TZ0 - 0.3)
    # The crown: the observation floor's tall glass, a granite band, the plant screen, a helipad and the aerial.
    p.box(GLASS_DK, TX0 + 1.0, TOP - 6, TZ0 + 1.0, TX1 - 1.0, TOP, TZ1 - 1.0)
    for face, a0, a1, at in sides(TX0 + 1.0, TX1 - 1.0, TZ0 + 1.0, TZ1 - 1.0):
        for c in rows(a0 + 2.4, a1 - 2.4, 3.125):
            quad(p, WINDOW, face, c - 1.4, c + 1.4, TOP - 5.6, TOP - 0.9, out(face, at, 0.03), col=NAVY_GL)
    p.box(PALE, TX0, TOP - 6.3, TZ0, TX1, TOP - 6, TZ1)
    p.box(PALE, TX0, TOP, TZ0, TX1, TOP + 1.2, TZ1)
    p.box(NAVY, TX0 + 4, TOP + 1.2, TZ0 + 4, TX1 - 4, TOP + 5.2, TZ1 - 4)
    helipad(p, TX0 + 14, TOP + 5.2, (TZ0 + TZ1) / 2, r=7.5)
    mast(p, TX1 - 10, TOP + 5.2, (TZ0 + TZ1) / 2, 16.0, w=2.6)
    beacons(p, TX0, TX1, TZ0, TZ1, TOP + 1.2)
    board(p, 'crest', 'f', TX0 + 0.4, TX0 + 2.8, TOP - 5.2, TOP - 2.8, TZ0, col=PALE, proud=0.06)

    # ── The assembly wing: a granite box on a glazed street storey, tall slots lighting the chamber, a clerestory lantern ──
    p.box(PALE_DK, WX0 + 0.4, 0, WZ0 + 0.4, WX1 - 0.4, 4.4, WZ1 - 0.4)
    for face, a0, a1, at in sides(WX0 + 0.4, WX1 - 0.4, WZ0 + 0.4, WZ1 - 0.4, 'flb'):
        for c in rows(a0 + 0.6, a1 - 0.6, 3.6):
            quad(p, GLASS_DK, face, c - 1.5, c + 1.5, 0.5, 3.4, out(face, at, 0.03))
            quad(p, 'windowDim', face, c - 1.5, c + 1.5, 3.45, 3.95, out(face, at, 0.03), col=WARM_C)
    p.box(PALE, WX0, 4.4, WZ0, WX1, WH, WZ1)
    for face, a0, a1, at in sides(WX0, WX1, WZ0, WZ1, 'flb'):
        for c in rows(a0 + 2.0, a1 - 2.0, 2.6):
            quad(p, WINDOW, face, c - 0.35, c + 0.35, 5.6, WH - 1.4, out(face, at, 0.03), col=NAVY_GL)
    band(p, PALE_DK, WX0, WX1, WZ0, WZ1, WH - 0.5, WH, 0.25)
    p.box(GLASS_DK, WX0 + 6, WH, WZ0 + 7, WX1 - 6, WH + 2.2, WZ1 - 7)
    p.box(PALE_DK, WX0 + 5.6, WH + 2.2, WZ0 + 6.6, WX1 - 5.6, WH + 2.6, WZ1 - 6.6)
    # (Its door, and the glazed link to the tower.)
    wc = (WX0 + WX1) / 2
    p.box(ALU_DK, wc - 2.2, 3.3, WZ0 - 1.8, wc + 2.2, 3.5, WZ0 + 0.4)
    board(p, 'gikai', 'f', wc - 3.2, wc + 3.2, 4.9, 5.6, WZ0, col='flat:#f4f3ee', proud=0.1)
    p.box(GLASS_DK, WX1, 0, 22.0, TX0, 7.0, 34.0)
    quad(p, WINDOW, 'f', WX1 + 0.1, TX0 - 0.1, 0.4, 6.6, 21.97, col=NAVY_GL)
    mark('_wing', wc, 0, (WZ0 + WZ1) / 2, WX1 - WX0, WZ1 - WZ0)
    mark('_link', (WX1 + TX0) / 2, 0, 28.0, TX0 - WX1, 12.0)

    # ── The forecourt's fixed pieces: the name stone, three flagpoles, long planters at the street ──
    p.box('flat:#55585c', 24.0, 0, 3.0, 33.0, 0.35, 3.9)
    p.box(PALE, 24.3, 0.35, 3.15, 32.7, 1.75, 3.75)
    mark('name', 28.5, 1.05, 3.13, 7.8, 1.1)
    mark('_stone', 28.5, 0, 3.45, 9.0, 0.9)
    for k, x in enumerate((-3.0, -1.0, 1.0)):
        p.cyl(STEEL, (x, 6.0, 7.0), 1, 0.07, 12.0, seg=8)
        p.cyl('flat:#d9b44a', (x, 12.1, 7.0), 1, 0.12, 0.2, seg=8)
        p.box([WHITE, NAVY, 'flat:#3a6ea5'][k], x + 0.07, 9.6, 6.98, x + 2.2, 11.0, 7.02)
    mark('_flags', -1.0, 0, 7.0, 4.6, 0.5)
    for a, e in ((-37.0, -20.0), (-9.0, 4.0), (36.5, 37.5)):
        if e - a < 2:
            continue
        p.box(PALE_DK, a, 0, 0.6, e, 0.5, 2.4)
        p.box(HEDGE, a + 0.15, 0.5, 0.75, e - 0.15, 1.05, 2.25)
    mark('_planter_a', -28.5, 0, 1.5, 17.0, 1.8)
    mark('_planter_b', -2.5, 0, 1.5, 13.0, 1.8)


def monument(p):
    """Two white sails leaning into the wind on a granite plinth: the port's opening remembered."""
    p.cyl('flat:#8d8a82', (0, 0.3, 3.0), 1, 3.6, 0.6, seg=24)
    p.cyl(PALE, (0, 0.75, 3.0), 1, 2.6, 0.3, seg=24)
    for sx, hgt, lean in ((-1, 15.0, 0.9), (1, 11.0, -0.6)):
        x = sx * 0.9
        pts = [(1.4, 0.9), (4.6, 0.9), (3.0 + lean, hgt)]
        p.prism(WHITE, pts, 'x', x - 0.12, x + 0.12)
    p.cyl(STEEL, (0, 8.0, 3.0), 1, 0.09, 14.4, seg=8)
    mark('plaque', 0, 0.62, -0.62, 1.6, 0.36)


def bandshell(p):
    """The open-air stage: a platform under a shell roof, wings each side, facing the lawn (−z)."""
    w, d = 16.0, 9.0
    p.box('flat:#b9b6ac', -w / 2, 0, 1.0, w / 2, 0.9, d)
    p.box('wood:#8a6a4a', -w / 2 + 0.3, 0.9, 1.2, w / 2 - 0.3, 0.94, d - 0.4)
    for k in range(3):
        p.box('flat:#a39c8c', -3.0, 0, 0.1 + k * 0.3, 3.0, 0.9 - 0.3 - k * 0.3 + 0.3, 0.4 + k * 0.3)
    p.box(PALE, -w / 2, 0.9, d - 0.4, w / 2, 5.2, d)
    for sx in (-1, 1):
        p.box(PALE, min(sx * (w / 2 - 0.4), sx * w / 2), 0.9, 4.0, max(sx * (w / 2 - 0.4), sx * w / 2), 5.0, d)
    # The shell: a quarter vault from the back wall forward.
    n = 8
    for k in range(n):
        a0, a1 = math.pi / 2 * k / n, math.pi / 2 * (k + 1) / n
        z0, y0 = d - 6.5 * math.sin(a0), 5.2 + 2.2 * (1 - math.cos(a0)) * 0 + 1.8 * math.sin(a0)
        z1, y1 = d - 6.5 * math.sin(a1), 5.2 + 1.8 * math.sin(a1)
        p.face(WHITE, [(-w / 2, y0, z0), (w / 2, y0, z0), (w / 2, y1, z1), (-w / 2, y1, z1)], (0, 1, -0.3))
        p.face(PALE_DK, [(-w / 2, y0 - 0.05, z0), (w / 2, y0 - 0.05, z0), (w / 2, y1 - 0.05, z1), (-w / 2, y1 - 0.05, z1)], (0, -1, 0.3))
    p.box('light', -5.0, 6.7, 3.0, 5.0, 6.76, 3.3)
    mark('name', 0, 4.3, d - 0.42, 6.0, 0.7)
    mark('_stage', 0, 0, (1.0 + d) / 2, w, d - 1.0)


def kadan(p):
    """A round flower bed banked up towards the back: rings of flowers round the city's crest in white stone."""
    R = 5.0
    for k, (rr, col) in enumerate(((5.0, HEDGE), (4.5, 'flat:#c8102e'), (3.6, 'flat:#f2c230'), (2.7, 'flat:#f4f1e8'), (1.8, 'flat:#d94f8a'), (0.9, PALE))):
        p.cyl(col, (0, 0.2 + k * 0.12, R + k * 0.25), 1, rr, 0.4 + k * 0.24, seg=28)
    p.box(PALE_DK, -5.3, 0, R * 2 - 0.3, 5.3, 1.9, R * 2 + 0.3)
    mark('label', 0, 0.45, -0.05, 2.4, 0.4)
    mark('_bed', 0, 0, R, 2 * R, 2 * R)


def kyukeijo(p):
    """The park's rest house: a glazed pavilion under a wide flat roof, a kiosk window, the toilets at one end."""
    w, d, h = 14.0, 8.0, 3.4
    p.box(PALE_DK, -w / 2 + 0.6, 0, 0.8, w / 2 - 0.6, h, d - 0.6)
    for a, e in ((-6.0, -2.4), (-2.2, 1.4)):
        quad(p, GLASS_DK, 'f', a, e, 0.5, 2.7, 0.77)
        quad(p, 'windowDim', 'f', a, e, 2.75, 3.1, 0.77, col=WARM_C)
    p.box('wood:#8a6a4a', -1.9, 0.95, 0.45, 1.1, 1.05, 0.8)
    p.box(NAVY, 1.9, 0, 0.74, 6.2, h, 0.8)
    for c in (3.0, 5.1):
        p.box(PALE, c - 0.45, 0, 0.7, c + 0.45, 2.1, 0.76)
    p.box(WHITE, -w / 2, h, 0, w / 2, h + 0.3, d)
    p.box('light', -6.0, h - 0.04, 0.15, 1.4, h, 0.6)
    for x in (-w / 2 + 0.3, w / 2 - 0.3):
        p.box(STEEL, x - 0.08, 0, 0.12, x + 0.08, h, 0.28)
    board(p, 'name', 'f', -5.0, 0.4, h + 0.36, h + 1.0, 0.3, col='flat:#f4f3ee', proud=0.1)
    mark('toilet', 4.05, 2.6, 0.72, 2.6, 0.5)


# ── The red-brick seafood hall on the dock quay (2026-11-25): a Meiji bonded warehouse turned into a fish shop and a
# seafood restaurant, walked into. Its walls are outside faces only, with real openings at the two quay doors and the
# lane door; the inside is built in code (umibe-street.ts). Same build as the port's warehouses (build_port.py).
R_BRICK = 'flat:#8b4a37'
R_BRICK_D = 'flat:#6e3a2b'
R_STONE = 'flat:#c9c1b0'
R_ROOF = 'flat:#5b5f62'
R_IRON = 'flat:#2a2d30'
RW, RD, RH, RRISE = 44.0, 22.0, 9.0, 3.2
R_BAYS = 8
R_DOORS = (-8.25, 8.25)          # quay doors (centres), 3.4 x 3.6
R_BACK = -2.75                   # the lane door (centre), 2.2 x 2.6
R_DW, R_DH, R_BW, R_BH = 3.4, 3.6, 2.2, 2.6


def renga(p):
    hw = RW / 2
    bw = RW / R_BAYS

    def wall(face, at, a0, a1, gaps):
        """An outside wall from a0 to a1 at `at`, with door openings (centre, width, height)."""
        cuts = sorted(gaps)
        x = a0
        for c, w, h in cuts:
            quad(p, R_BRICK, face, x, c - w / 2, 0, RH, at)
            quad(p, R_BRICK, face, c - w / 2, c + w / 2, h, RH, at)
            x = c + w / 2
        quad(p, R_BRICK, face, x, a1, 0, RH, at)

    wall('f', 0.0, -hw, hw, [(c, R_DW, R_DH) for c in R_DOORS])
    wall('b', RD, -hw, hw, [(R_BACK, R_BW, R_BH)])
    wall('l', -hw, 0.0, RD, [])
    wall('r', hw, 0.0, RD, [])
    # The door reveals: brick returns through the wall's thickness, so the openings read as deep.
    for c, w, h, z0, z1 in [(c, R_DW, R_DH, 0.0, 0.45) for c in R_DOORS] + [(R_BACK, R_BW, R_BH, RD - 0.45, RD)]:
        p.box(R_BRICK_D, c - w / 2 - 0.02, 0, z0, c - w / 2, h, z1)
        p.box(R_BRICK_D, c + w / 2, 0, z0, c + w / 2 + 0.02, h, z1)
        p.box(R_STONE, c - w / 2 - 0.3, h, -0.12 if z0 == 0 else RD, c + w / 2 + 0.3, h + 0.45, 0.0 if z0 == 0 else RD + 0.12)
    # Gable ends, the roof.
    for x0, x1 in ((-hw - 0.02, -hw), (hw, hw + 0.02)):
        p.prism(R_BRICK, [(0, RH), (RD / 2, RH + RRISE), (RD, RH)], 'x', x0, x1)
    ov = 0.5
    p.prism(R_ROOF, [(-ov, RH - 0.1), (RD / 2, RH + RRISE), (RD + ov, RH - 0.1), (RD + ov, RH + 0.05), (RD / 2, RH + RRISE + 0.18), (-ov, RH + 0.05)], 'x', -hw - ov, hw + ov)
    # Stone bands and pilasters on the outside faces only.
    for y0, y1 in ((0, 0.6), (RH / 2 - 0.15, RH / 2 + 0.15), (RH - 0.45, RH - 0.15)):
        p.box(R_STONE, -hw - 0.06, y0, -0.06, hw + 0.06, y1, 0.0) if y0 else None
        p.box(R_STONE, -hw - 0.06, y0, RD, hw + 0.06, y1, RD + 0.06) if y0 else None
        p.box(R_STONE, -hw - 0.06, y0, 0.0, -hw, y1, RD)
        p.box(R_STONE, hw, y0, 0.0, hw + 0.06, y1, RD)
    for k in range(R_BAYS + 1):
        x = -hw + k * bw
        for z0, z1 in ((-0.22, 0.0), (RD, RD + 0.22)):
            p.box(R_BRICK_D, x - 0.35, 0.6 if not any(abs(x - c) < R_DW / 2 + 0.4 for c in R_DOORS) else R_DH + 0.45, z0, x + 0.35, RH - 0.45, z1)
    # Windows: lit panes in iron frames on both floors, but not over the doors' openings.
    for k in range(R_BAYS):
        cx = -hw + (k + 0.5) * bw
        for y in (1.3, RH / 2 + 0.8):
            if y < 2 and any(abs(cx - c) < R_DW for c in R_DOORS):
                continue
            for dx in (-0.9, 0.9):
                p.box(R_IRON, cx + dx - 0.5, y, -0.09, cx + dx + 0.5, y + 1.5, -0.01)
                quad(p, WINDOW, 'f', cx + dx - 0.42, cx + dx + 0.42, y + 0.06, y + 1.44, -0.1)
                if y > 2:
                    p.box(R_IRON, cx + dx - 0.5, y, RD + 0.01, cx + dx + 0.5, y + 1.5, RD + 0.09)
                    quad(p, WINDOW, 'b', cx + dx - 0.42, cx + dx + 0.42, y + 0.06, y + 1.44, RD + 0.1)
    # Canopies over the quay doors, lamps over them, the name board between.
    for c in R_DOORS:
        p.box(R_IRON, c - 2.4, R_DH + 0.6, -1.8, c + 2.4, R_DH + 0.72, 0.0)
        p.box('light', c - 0.2, R_DH + 0.45, -1.2, c + 0.2, R_DH + 0.6, -0.8)
    p.box(R_IRON, -5.0, R_DH + 1.0, -0.14, 5.0, R_DH + 2.2, -0.02)
    mark('name', 0, R_DH + 1.6, -0.15, 9.6, 1.0)
    mark('_hall', 0, 0, RD / 2, RW, RD)
    mark('_doorw', R_DOORS[0], 0, 0, R_DW, R_DH)
    mark('_doore', R_DOORS[1], 0, 0, R_DW, R_DH)
    mark('_back', R_BACK, 0, RD, R_BW, R_BH, (0, 1))


VARIANTS = [
    dict(id='shiyakusho', w=W, d=D, h=TOP + 5.2, fn=shiyakusho, gap=20.0),
    dict(id='monument', w=8.0, d=6.0, h=15.0, fn=monument, gap=10.0),
    dict(id='bandshell', w=16.0, d=9.0, h=7.0, fn=bandshell, gap=10.0),
    dict(id='kadan', w=10.6, d=10.3, h=2.0, fn=kadan, gap=10.0),
    dict(id='kyukeijo', w=14.0, d=8.0, h=4.4, fn=kyukeijo, gap=10.0),
    dict(id='renga', w=RW, d=RD, h=RH + RRISE + 0.2, fn=renga, gap=10.0),
]


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    v['fn'](body)
    return body, signs


def build_lo(v):
    """No simplified copy: a plain box reads as a placeholder from across the park."""
    return None


if __name__ == '__main__':
    run('umibe', VARIANTS, build_hi, build_lo)
    write_anchors('umibe')
