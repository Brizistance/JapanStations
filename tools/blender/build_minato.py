# Builds Kawaminato-kō's own pieces (the 2026-11 rebuild, after a redeveloped brick port): the two red-brick
# warehouses turned shops, the old customs house with its domed corner tower, the ferry terminal (a shell you
# walk into: outside faces only, its inside is built in code), the port office, the girder bridge over the
# inlet to Kon'yahama, the flood gate in the sea wall, the lighthouse on the breakwater, the ferry, and the
# quay's railing.
#
#   blender --background --python tools/blender/build_minato.py -- [--renders <dir>]
#
# Writes assets/buildings/minato.blend, public/models/buildings/minato.glb and src/stations/anchors/minato.ts.
# Frame: front at z = 0 facing -z, origin mid-frontage on the ground (y 0); +z into the lot. A boat's y 0 is
# its waterline; the bridge's y 0 is its deck. Nothing carries a name: the game letters the boards it marks.
# Marks starting with '_' carry measurements (the terminal's doorways) for colliders.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

BRICK_R = 'flat:#8b4a37'
BRICK_RD = 'flat:#6e3a2b'
STONE_C = 'flat:#d6cfbd'
STONE_G = 'flat:#9d978b'
ROOF_S = 'flat:#4e5357'
IRON = 'flat:#2e3236'
IRON_G = 'flat:#3c5248'
COPPER = 'flat:#6f9c8a'
COPPER_D = 'flat:#55806f'
GIRDER = 'flat:#3f6f9a'
GIRDER_D = 'flat:#2f5577'
CONC = 'flat:#bdb7aa'
CONC_D = 'flat:#9d978b'
RED_L = 'flat:#c23a2b'
HULL_W = 'flat:#ecebe6'
HULL_B = 'flat:#1f4f8a'
DECK = 'flat:#8c8678'
CANOPY = 'flat:#e9ecee'
GLASS_T = 'flat:#3b5566'


def arched(p, face, a0, a1, y0, y1, at, frame=STONE_C, lit=True):
    """A tall window with a stone round arch head and a keystone."""
    c, hw = (a0 + a1) / 2, (a1 - a0) / 2
    quad(p, WINDOW if lit else 'flat:#2b3740', face, a0, a1, y0, y1, out(face, at, 0.02))
    arch(p, frame, face, a0 - 0.15, a1 + 0.15, y1, y1 + hw, y1 + hw + 0.35, at, 0.12, 8, inner=False)
    slab(p, frame, face, c - 0.18, c + 0.18, y1 + hw - 0.1, y1 + hw + 0.45, at, 0.16)
    slab(p, frame, face, a0 - 0.2, a1 + 0.2, y0 - 0.18, y0, at, 0.14)


def renga(p, s, v, r):
    """A three-storey red-brick bonded warehouse (1907-1913) turned shops and restaurants: stone bands, arched
    windows, iron loading balconies and hoist doors, cast-iron stair towers at the ends, a slate roof with
    gables, glazed shopfronts in the old door bays on both long sides, lamps over the doors."""
    w, d, h = v['w'], v['d'], v['eave']
    hw = w / 2
    p.box(BRICK_R, -hw, 0, 0, hw, h, d)
    for x0, x1 in ((-hw - 0.02, -hw + 0.01), (hw - 0.01, hw + 0.02)):
        p.prism(BRICK_R, [(0, h), (d / 2, h + v['rise']), (d, h)], 'x', x0, x1)
    p.prism(ROOF_S, [(-0.5, h - 0.1), (d / 2, h + v['rise']), (d + 0.5, h - 0.1), (d + 0.5, h + 0.05), (d / 2, h + v['rise'] + 0.18), (-0.5, h + 0.05)], 'x', -hw - 0.4, hw + 0.4)
    fl = h / 3
    for y0, y1 in ((0, 0.7), (fl - 0.15, fl + 0.15), (2 * fl - 0.15, 2 * fl + 0.15), (h - 0.5, h - 0.15)):
        p.box(STONE_C, -hw - 0.06, y0, -0.06, hw + 0.06, y1, d + 0.06)
    bays = v['bays']
    bw = w / bays
    for face, at in (('f', 0.0), ('b', d)):
        sg = -1 if face == 'f' else 1
        for k in range(bays + 1):
            x = -hw + k * bw
            p.box(BRICK_RD, x - 0.4, 0.7, min(at, at + sg * 0.25), x + 0.4, h - 0.5, max(at, at + sg * 0.25))
        for k in range(bays):
            cx = -hw + (k + 0.5) * bw
            # Street storey: a shopfront in the old door bay, an awning, a lamp; every third a plain iron door.
            if (k + v['seed']) % 3:
                quad(p, 'windowDim', face, cx - 1.9, cx + 1.9, 0.7, 3.6, out(face, at, 0.02), col=WARM if k % 2 else SHOP)
                for dx in (-0.95, 0.0, 0.95):
                    slab(p, IRON_G, face, cx + dx - 0.04, cx + dx + 0.04, 0.7, 3.6, at, 0.06)
                arch(p, STONE_C, face, cx - 2.1, cx + 2.1, 3.6, 3.6 + 2.1, 6.0, at, 0.3, 10, inner=False) if fl > 5.9 else None
                p.face('flat:#2f4a3c', [(cx - 2.0, 3.65, out(face, at, 0.02)), (cx + 2.0, 3.65, out(face, at, 0.02)), (cx + 2.0, 3.25, out(face, at, 1.1)), (cx - 2.0, 3.25, out(face, at, 1.1))], (0, 0.9, -0.4 * -sg))
                p.face('flat:#2f4a3c', [(cx + 2.0, 3.65, out(face, at, 0.02)), (cx - 2.0, 3.65, out(face, at, 0.02)), (cx - 2.0, 3.25, out(face, at, 1.1)), (cx + 2.0, 3.25, out(face, at, 1.1))], (0, -0.9, 0.4 * -sg))
            else:
                slab(p, 'flat:#3e5247', face, cx - 1.7, cx + 1.7, 0.7, 3.9, at, 0.1)
                for y in (1.6, 2.8):
                    slab(p, IRON, face, cx - 1.7, cx + 1.7, y, y + 0.08, at, 0.14)
            slab(p, 'light', face, cx - 0.15, cx + 0.15, 4.1, 4.4, at, 0.5)
            # Upper floors: arched windows, or a loading door with an iron balcony and a hoist beam.
            for f in (1, 2):
                y = f * fl + 0.6
                if k % 2 == 0 and f == 1:
                    slab(p, 'flat:#3e5247', face, cx - 1.0, cx + 1.0, y, y + 2.6, at, 0.08)
                    quad(p, WINDOW, face, cx - 0.5, cx + 0.5, y + 1.2, y + 2.4, out(face, at, 0.1))
                    slab(p, IRON, face, cx - 1.5, cx + 1.5, y - 0.1, y, at, 1.2)
                    for dx in (-1.45, -0.5, 0.5, 1.45):
                        slab(p, IRON, face, cx + dx - 0.03, cx + dx + 0.03, y, y + 1.1, at, 1.2)
                    slab(p, IRON, face, cx - 1.5, cx + 1.5, y + 1.05, y + 1.12, at, 1.2)
                    slab(p, IRON, face, cx - 0.06, cx + 0.06, y + 3.0, y + 3.15, at, 1.8)
                else:
                    for dx in (-0.9, 0.9):
                        arched(p, face, cx + dx - 0.5, cx + dx + 0.5, y + 0.3, y + 2.2, at)
    # Cast-iron stair towers on the ends' fronts.
    for sx in (-1, 1):
        x = sx * (hw - 2.2)
        p.box(IRON_G, x - 1.4, 0, -2.6, x + 1.4, 0.15, -0.1)
        for k in range(int(h / 0.9)):
            y = k * 0.9
            p.box(IRON_G, x - 1.35, y, -2.55 + (k % 2) * 1.2, x + 1.35, y + 0.08, -1.35 + (k % 2) * 1.2)
        for cx, cz in ((x - 1.35, -2.55), (x + 1.35, -2.55), (x - 1.35, -0.15), (x + 1.35, -0.15)):
            p.box(IRON_G, cx - 0.06, 0, cz - 0.06, cx + 0.06, h, cz + 0.06)
    for x in (-hw + 0.2, hw - 0.2):
        for at, sg in ((0.0, -1), (d, 1)):
            p.box(IRON, x - 0.07, 0, min(at, at + sg * 0.3), x + 0.07, h, max(at, at + sg * 0.16))
    board(p, 'name', 'f', -6.0, 6.0, fl - 1.05, fl - 0.25, 0, 'flat:#2a2622', 0.1)
    board(p, 'back', 'b', -6.0, 6.0, fl - 1.05, fl - 0.25, d, 'flat:#2a2622', 0.1)
    board(p, 'num', 'f', -1.6, 1.6, h + 0.6, h + 2.0, d / 2 - 0.3, 'flat:#efe6cf', 0.05)


def zeikan(p, s, v, r):
    """The old customs house (1934): a stone three-storey office round a corner tower; the tower rises
    as an octagonal drum to a green copper dome with a lantern and a clock. Arched street storey, pilasters,
    a deep cornice. The tower stands at the +x end (the corner)."""
    w, d, h = v['w'], v['d'], v['eave']
    hw = w / 2
    T = 9.0
    tx = hw - T / 2
    p.box(STONE_C, -hw, 0, 0, hw - T, h, d)
    p.box(STONE_C, hw - T, 0, 0, hw, h, d)
    p.box(STONE_G, -hw - 0.08, 0, -0.08, hw + 0.08, 1.0, d + 0.08)
    for face, a0, a1, at in sides(-hw, hw, 0, d, 'fr'):
        n = max(3, round((a1 - a0) / 3.8))
        step = (a1 - a0) / n
        for k in range(n):
            a, e = a0 + k * step + 0.6, a0 + (k + 1) * step - 0.6
            if face == 'f' and k == n // 2 - 1:
                doors(p, (a + e) / 2, 0, -0.01, min(2.4, e - a - 0.2), 3.0, BRASS)
                quad(p, 'windowDim', face, a, e, 3.1, 3.9, out(face, at, 0.01), col=SHOP)
            else:
                quad(p, WINDOW, face, a, e, 1.4, 3.9, out(face, at, 0.02))
            arch(p, STONE_G, face, a - 0.1, e + 0.1, 3.9, 3.9 + (e - a) / 2, 5.6, at, 0.3, 8, inner=False)
            for f in (1, 2):
                y = 5.4 + (f - 1) * 4.2 + 0.9
                quad(p, WINDOW, face, a + 0.2, e - 0.2, y, y + 2.4, out(face, at, 0.02))
                slab(p, STONE_G, face, a, e, y - 0.2, y, at, 0.15)
            slab(p, STONE_G, face, a0 + k * step - 0.25, a0 + k * step + 0.25, 5.6, h - 1.4, at, 0.2)
    p.box(STONE_G, -hw - 0.1, 5.4, -0.25, hw + 0.1, 5.8, d + 0.1)
    p.box(STONE_G, -hw - 0.5, h - 1.0, -0.6, hw + 0.5, h - 0.4, d + 0.5)
    p.box(STONE_C, -hw - 0.2, h - 0.4, -0.3, hw + 0.2, h + 0.6, d + 0.2)
    for face, a0, a1, at in sides(-hw, hw, 0, d, 'lb'):
        windows(p, face, a0 + 1.0, a1 - 1.0, at, 1.4, 3, 4.2, 3.6, 1.4, 2.4)
    board(p, 'name', 'f', -hw + 2.0, hw - T - 2.0, 5.85, 6.45, 0, 'flat:#2a2622', 0.12)
    # The tower: a square shaft above the cornice, the drum, the dome, the lantern.
    y = h + 0.6
    p.box(STONE_C, tx - 3.6, y, 0.9, tx + 3.6, y + 7.0, 8.1)
    for fx, fz, fn in ((tx, 0.9, (0, -1)), (tx + 3.6, 4.5, (1, 0))):
        if fn[1]:
            quad(p, WINDOW, 'f', tx - 1.0, tx + 1.0, y + 1.0, y + 4.6, 0.88)
        else:
            quad(p, WINDOW, 'r', 3.5, 5.5, y + 1.0, y + 4.6, tx + 3.62)
    p.box(STONE_G, tx - 3.9, y + 7.0, 0.6, tx + 3.9, y + 7.6, 8.4)
    p.cyl(STONE_C, (tx, y + 10.1, 4.5), 1, 3.0, 5.0, seg=8)
    mark('clock', tx, y + 10.3, 4.5 - 3.0 * math.cos(math.pi / 8) - 0.06, 2.0, 2.0, (0, -1))
    p.cyl(COPPER, (tx, y + 12.8, 4.5), 1, 3.2, 0.4, seg=8)
    for k in range(6):
        rr = 3.0 * math.cos(k / 6 * math.pi / 2)
        p.cyl(COPPER if k % 2 else COPPER_D, (tx, y + 13.0 + k * 0.55 + 0.275, 4.5), 1, max(0.4, rr), 0.55, seg=16)
    p.cyl(STONE_C, (tx, y + 17.0, 4.5), 1, 0.7, 1.4, seg=8)
    p.cyl(COPPER_D, (tx, y + 18.0, 4.5), 1, 0.85, 0.5, seg=8)
    p.box(IRON, tx - 0.04, y + 18.2, 4.46, tx + 0.04, y + 20.5, 4.54)
    for x in (-hw + 6.0, -hw + 14.0):
        p.box(ROOF_S, x - 1.4, h + 0.6, d - 6.0, x + 1.4, h + 2.6, d - 3.0)


def terminal(p, s, v, r):
    """The ferry terminal (1990s): a glass hall under a wave-shaped white roof that reaches out over the
    entrance, a glazed upper deck, a lookout tower with the name at the east end, a covered gangway out
    over the quay to the ferry berth. Outside faces only: the hall's inside is built in the game."""
    w, d, h = v['w'], v['d'], v['eave']
    hw = w / 2
    dx0, dx1, dh = v['door']
    # Front: glass on a low plinth, the doorway left open (no plinth across it).
    mark('_door', (dx0 + dx1) / 2, dh / 2, 0, dx1 - dx0, dh)
    for a0, a1 in ((-hw, dx0), (dx1, hw)):
        quad(p, 'windowDim', 'f', a0, a1, 0.3, 4.6, 0, col=SHOP)
        p.box(CONC_D, a0, 0, -0.1, a1, 0.3, 0.0)
    quad(p, GLASS_T, 'f', dx0, dx1, dh, 4.6, 0)
    p.box(ALU_DK, dx0 - 0.15, 0, -0.18, dx0, dh + 0.1, 0.0)
    p.box(ALU_DK, dx1, 0, -0.18, dx1 + 0.15, dh + 0.1, 0.0)
    p.box(ALU_DK, dx0 - 0.15, dh, -0.18, dx1 + 0.15, dh + 0.12, 0.0)
    for face, a0, a1, at in sides(-hw, hw, 0, d, 'lrb'):
        quad(p, 'windowDim', face, a0, a1, 0.3, 4.6, at, col=SHOP)
    for face, a0, a1, at in sides(-hw, hw, 0, d, 'flrb'):
        quad(p, WINDOW, face, a0, a1, 4.9, h, at)
        slab(p, ALU, face, a0, a1, 4.6, 4.9, at, 0.15)
        x = a0
        while x <= a1 + 0.01:
            # (No mullion down through the doorway: it starts above the door head.)
            y0 = dh + 0.12 if face == 'f' and dx0 - 0.2 < x < dx1 + 0.2 else 0.3
            slab(p, ALU_DK, face, x - 0.06, x + 0.06, y0, h, at, 0.12)
            x += 3.0
    p.face(ALU, [(-hw, h, 0), (hw, h, 0), (hw, h, d), (-hw, h, d)], (0, 1, 0))
    # The wave roof: a curved white canopy along x, out 4 m over the front and 1.5 m over the back.
    prof = []
    for k in range(13):
        t = k / 12
        z = -4.0 + t * (d + 5.5)
        prof.append((z, h + 1.2 + 2.6 * math.sin(t * math.pi) + 0.8 * t))
    top = [(z, y + 0.35) for z, y in reversed(prof)]
    p.prism(CANOPY, prof + top, 'x', -hw - 1.5, hw + 1.5)
    for x in range(int(-hw) + 3, int(hw) - 2, 6):
        p.box(ALU_DK, x - 0.12, h, -3.8, x + 0.12, h + 1.3, -3.6)
        p.box(ALU_DK, x - 0.1, 0, -3.8, x + 0.1, h + 1.2, -3.6)
    for x in range(int(-hw) + 3, int(hw) - 2, 6):
        p.box('light', x - 1.0, h + 1.05, -2.6, x + 1.0, h + 1.12, -2.2)
    board(p, 'name', 'f', dx0 - 3.0, dx1 + 3.0, 5.2, 6.3, -0.2, 'flat:#1d3550', 0.1)
    # The lookout tower at the east end.
    tx = hw - 3.0
    p.box(ALU, tx - 2.5, 0, 3.0, tx + 2.5, h + 12.0, 8.0)
    for face, a0, a1, at in sides(tx - 2.5, tx + 2.5, 3.0, 8.0, 'flrb'):
        quad(p, WINDOW, face, a0 + 0.3, a1 - 0.3, h + 8.5, h + 11.4, at)
    p.box(ALU_DK, tx - 3.0, h + 12.0, 2.5, tx + 3.0, h + 12.4, 8.5)
    p.box(IRON, tx - 0.05, h + 12.4, 5.45, tx + 0.05, h + 18.0, 5.55)
    board(p, 'tower', 'f', tx - 2.2, tx + 2.2, h + 4.0, h + 7.6, 3.0, 'flat:#f4f1e8', 0.1)
    # The gangway: a covered bridge on two legs from the upper deck out over the quay to the berth.
    gx = v['gang']
    p.box(ALU, gx - 1.6, 5.2, d, gx + 1.6, 5.5, d + 9.0)
    p.box(GLASS_T, gx - 1.6, 5.5, d, gx - 1.5, 7.8, d + 9.0)
    p.box(GLASS_T, gx + 1.5, 5.5, d, gx + 1.6, 7.8, d + 9.0)
    p.box(ALU, gx - 1.8, 7.8, d - 0.2, gx + 1.8, 8.1, d + 9.2)
    for z in (d + 3.0, d + 8.0):
        for sx in (-1, 1):
            p.box(ALU_DK, gx + sx * 1.4 - 0.15, 0, z - 0.15, gx + sx * 1.4 + 0.15, 5.2, z + 0.15)


def kowan(p, s, v, r):
    """The port office (1990s): a stone-framed podium and six floors of glass with horizontal sun fins,
    a set-back top with a radar mast. Its corner on the cross street is the -x end."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(GRANITE, x0, 0, 1.5, x1, 5.0, d)
    for c in rows(x0 + 0.5, x1 - 0.5, 4.5):
        p.box(STONE_LT, c - 0.4, 0, 0, c + 0.4, 5.0, 0.8)
    quad(p, 'windowDim', 'f', x0 + 1, x1 - 1, 0.3, 4.6, 1.48, col=SHOP)
    for face, a0, a1, at in sides(x0, x1, 1.5, d, 'l'):
        quad(p, 'windowDim', face, a0 + 0.5, a1 - 0.5, 0.3, 4.6, at, col=SHOP)
    doors(p, 0, 0, 1.48, 3.0, 3.0, ALU)
    p.box(STONE_LT, x0 - 0.1, 5.0, -0.1, x1 + 0.1, 5.6, d + 0.1)
    board(p, 'name', 'f', -6.0, 6.0, 5.0, 5.55, -0.1, 'flat:#1d3550', 0.05)
    curtain(p, x0, x1, 0, d, 5.6, h - 4.0, GLASS_BL, STONE_LT, 3.6, 1.5, 1.2, 3)
    for k in range(int((h - 9.6) / 3.6) + 1):
        y = 5.6 + k * 3.6 + 3.2
        p.box(ALU, x0 - 0.6, y, -0.6, x1 + 0.6, y + 0.15, 0)
        p.box(ALU, x0 - 0.6, y, 0, x0, y + 0.15, d)
    curtain(p, x0 + 3.0, x1 - 3.0, 3.0, d - 2.0, h - 4.0, h, GLASS_BL, ALU, 4.0, 1.5, 1.0, 3)
    p.box(STONE_LT, x0, h - 4.3, 0, x1, h - 4.0, d)
    p.box(IRON, -0.1, h, d / 2 - 0.1, 0.1, h + 8.0, d / 2 + 0.1)
    p.box(ALU, -1.8, h + 7.0, d / 2 - 0.15, 1.8, h + 7.3, d / 2 + 0.15)
    service_back(p, x0, x1, d, 5.0, r)


def bridge(p, s, v, r):
    """The low girder bridge over the inlet, level with the streets at both ends: a concrete deck on three
    spans of shallow blue steel plate girders just clear of the water, round piers, a steel railing on both
    sides with lamp posts. Its length runs along x, its width along z, centred on the origin; y 0 is the
    carriageway (the pavements 0.15 above it, as on the street)."""
    L, W = v['w'], v['d']
    hl, hw = L / 2, W / 2
    p.box(CONC, -hl, -0.45, -hw, hl, 0.0, hw)
    for z in (-hw + 1.2, -hw / 3, hw / 3, hw - 1.2):
        p.box(GIRDER, -hl, -1.0, z - 0.2, hl, -0.45, z + 0.2)
        p.box(GIRDER_D, -hl, -1.05, z - 0.35, hl, -0.98, z + 0.35)
    p.box(GIRDER_D, -hl, -1.0, -hw, hl, -0.45, -hw + 0.08)
    p.box(GIRDER_D, -hl, -1.0, hw - 0.08, hl, -0.45, hw)
    for k in range(1, v['spans']):
        x = -hl + k * L / v['spans']
        for z in (-hw / 2, hw / 2):
            p.cyl(CONC_D, (x, -5.0, z), 1, 0.9, 7.8, seg=14)
        p.box(CONC_D, x - 0.8, -1.3, -hw, x + 0.8, -1.0, hw)
    for sz in (-1, 1):
        z = sz * (hw - 0.15)
        p.box(CONC_D, -hl, 0.15, z - 0.15, hl, 0.45, z + 0.15)
        p.box(GIRDER, -hl, 1.2, z - 0.06, hl, 1.3, z + 0.06)
        x = -hl + 0.1
        while x < hl:
            p.box(GIRDER_D, x - 0.03, 0.45, z - 0.03, x + 0.03, 1.2, z + 0.03)
            x += 0.25
        for k in range(int(L / 16) + 1):
            x = -hl + 4 + k * 16
            if x > hl - 2:
                break
            p.box(GIRDER_D, x - 0.08, 0.45, z - 0.08, x + 0.08, 7.0, z + 0.08)
            p.box(GIRDER_D, x - 0.05, 6.9, min(z, z - sz * 1.4), x + 0.05, 7.0, max(z, z - sz * 1.4))
            p.box('light', x - 0.25, 6.75, min(z - sz * 1.55, z - sz * 1.15), x + 0.25, 6.9, max(z - sz * 1.55, z - sz * 1.15))
    # Pavements (2.5 m, kerbed), a yellow centre line.
    for sz in (-1, 1):
        p.box('flat:#b8b2a6', -hl, 0.0, min(sz * (hw - 0.3), sz * (hw - 2.5)), hl, 0.15, max(sz * (hw - 0.3), sz * (hw - 2.5)))
    p.box('flat:#e6a700', -hl, 0.0, -0.08, hl, 0.012, 0.08)
    board(p, 'name', 'f', hl - 3.0, hl - 0.6, 0.55, 1.1, -hw - 0.05, 'flat:#e9e2d2', 0.05)


def rikko(p, s, v, r):
    """A flood gate (陸閘) where a road passes the sea wall: two concrete posts carrying the rail of a steel
    sliding leaf, the leaf rolled back alongside the wall, a hazard band and a warning lamp. Opening along x
    (`w` wide), the leaf parked at +x."""
    w = v['w']
    hw = w / 2
    for sx in (-1, 1):
        x = sx * (hw + 0.6)
        p.box(CONC, x - 0.6, 0, -0.6, x + 0.6, 3.4, 0.6)
        p.box('flat:#e6a700', x - 0.62, 0.6, -0.62, x + 0.62, 0.9, 0.62)
        p.box('flat:#1f2023', x - 0.62, 0.9, -0.62, x + 0.62, 1.2, 0.62)
        p.box('light', x - 0.15, 3.4, -0.15, x + 0.15, 3.7, 0.15)
    p.box(GIRDER_D, hw + 1.2, 0, -1.5, hw + 1.2 + w, 0.12, -1.2)
    lx = hw + 1.4
    p.box('flat:#5f6e66', lx, 0.1, -1.45, lx + w, 2.4, -1.25)
    for k in range(int(w / 1.5) + 1):
        x = lx + k * w / int(w / 1.5)
        p.box('flat:#46524b', x - 0.06, 0.1, -1.5, x + 0.06, 2.4, -1.2)
    p.box('flat:#46524b', lx, 2.3, -1.5, lx + w, 2.45, -1.2)
    for x in (lx + 0.6, lx + w - 0.6):
        p.cyl(IRON, (x, 0.12, -1.35), 0, 0.12, 0.3, seg=8)
    board(p, 'name', 'f', -hw - 1.2, -hw, 2.0, 2.8, -0.6, 'flat:#e9e2d2', 0.05)


def todai(p, s, v, r):
    """A red lighthouse at a breakwater's end: a tapering round tower on a concrete base, a gallery, the
    lantern room, a vent cap."""
    p.cyl(CONC, (0, 1.0, 0), 1, 3.0, 2.0, seg=16)
    for k in range(8):
        rr = 1.7 - k * 0.07
        p.cyl(RED_L if k % 4 != 3 else 'flat:#ecebe6', (0, 2.0 + k * 1.6 + 0.8, 0), 1, rr, 1.6, seg=16)
    y = 2.0 + 8 * 1.6
    p.cyl(IRON, (0, y + 0.1, 0), 1, 1.6, 0.2, seg=16)
    p.cyl(IRON, (0, y + 0.7, 0), 1, 1.6, 0.06, seg=16, caps=False)
    p.cyl('light', (0, y + 1.0, 0), 1, 0.8, 1.4, seg=12)
    p.cyl(RED_L, (0, y + 2.0, 0), 1, 1.0, 0.5, seg=12)
    p.cyl(IRON, (0, y + 2.6, 0), 1, 0.2, 0.7, seg=8)


def teibo(p, s, v, r):
    """A stretch of breakwater: a concrete crown wall on a mound of tetrapod-like blocks, along x."""
    L = v['w']
    p.box(CONC, -L / 2, -1.2, -2.5, L / 2, 2.2, 2.5)
    p.box(CONC_D, -L / 2, 2.2, 1.0, L / 2, 3.2, 2.5)
    rr = random.Random(v['seed'])
    for k in range(int(L / 1.6)):
        x = -L / 2 + 0.8 + k * 1.6
        for z in (-3.4, 3.4):
            y = -0.6 + rr.random() * 0.8
            p.box(CONC_D if rr.random() < 0.5 else CONC, x - 0.7, y, z - 0.7, x + 0.7, y + 1.3, z + 0.7)


def ferry(p, s, v, r):
    """A car ferry moored side-on: white hull with a blue band, a bow visor, three decks of cabin with
    window rows, a bridge, a funnel in the line's colours. Length along x."""
    L, B = v['w'], v['d']
    hl, hb = L / 2, B / 2
    p.prism(HULL_W, [(-hl, 4.5), (-hl + 1.5, -2.5), (hl - 6.0, -2.5), (hl, 4.8), (hl, 5.2), (-hl, 5.0)], 'z', -hb, hb)
    p.box(HULL_B, -hl + 0.6, 1.6, -hb - 0.02, hl - 2.2, 2.6, hb + 0.02)
    p.box('flat:#7a2b24', -hl + 1.4, -2.0, -hb - 0.01, hl - 5.0, -1.2, hb + 0.01)
    p.box(DECK, -hl + 0.5, 5.0, -hb + 0.3, hl - 1.0, 5.15, hb - 0.3)
    for k, (x0, x1) in enumerate(((-hl + 6, hl - 8), (-hl + 9, hl - 12), (-hl + 14, hl - 16))):
        y = 5.15 + k * 2.6
        p.box(HULL_W, x0, y, -hb + 0.8 + k * 0.4, x1, y + 2.6, hb - 0.8 - k * 0.4)
        for face, at in (('f', -hb + 0.8 + k * 0.4), ('b', hb - 0.8 - k * 0.4)):
            quad(p, WINDOW, face, x0 + 0.8, x1 - 0.8, y + 1.0, y + 1.9, out(face, at, 0.01))
    y = 5.15 + 3 * 2.6
    p.box(HULL_W, hl - 22, y, -hb + 1.5, hl - 16, y + 2.4, hb - 1.5)
    quad(p, WINDOW, 'r', -hb + 1.8, hb - 1.8, y + 1.0, y + 2.0, hl - 15.99)
    p.box(HULL_B, -hl + 16, y, -1.6, -hl + 20, y + 4.5, 1.6)
    p.box('flat:#c8102e', -hl + 16, y + 3.2, -1.62, -hl + 20, y + 3.8, 1.62)
    board(p, 'name', 'f', -hl + 4.0, -hl + 16.0, 3.0, 4.2, -hb, 'flat:#ecebe6', 0.02)


def quayrail(p, s, v, r):
    """The quay edge's railing: granite posts with two iron chains... drawn as rails, a 4 m bay."""
    w = v['w']
    for x in (-w / 2 + 0.15, w / 2 - 0.15):
        p.box(STONE_G, x - 0.15, 0, -0.15, x + 0.15, 1.0, 0.15)
        p.box(STONE_C, x - 0.18, 1.0, -0.18, x + 0.18, 1.08, 0.18)
    for y in (0.5, 0.9):
        p.box(IRON, -w / 2 + 0.3, y - 0.025, -0.025, w / 2 - 0.3, y + 0.025, 0.025)


STYLES = {'renga': renga, 'zeikan': zeikan, 'terminal': terminal, 'kowan': kowan, 'bridge': bridge, 'rikko': rikko,
          'todai': todai, 'teibo': teibo, 'ferry': ferry, 'quayrail': quayrail}

VARIANTS = [
    dict(id='renga_1', style='renga', w=44.0, d=22.0, eave=13.5, rise=3.4, bays=9, seed=1),
    dict(id='renga_2', style='renga', w=46.0, d=22.0, eave=13.5, rise=3.4, bays=9, seed=2),
    dict(id='zeikan', style='zeikan', w=40.0, d=27.0, eave=15.0, seed=3),
    dict(id='terminal', style='terminal', w=54.0, d=24.0, eave=9.0, door=(-8.0, 0.0, 3.4), gang=12.0, seed=4),
    dict(id='kowan', style='kowan', w=44.0, d=26.0, h=30.0, seed=5),
    dict(id='bridge', style='bridge', w=46.0, d=19.0, h=7.0, spans=3, seed=6),
    dict(id='rikko', style='rikko', w=19.0, d=3.0, h=3.7, seed=7),
    dict(id='todai', style='todai', w=6.0, d=6.0, h=18.0, seed=8),
    dict(id='teibo', style='teibo', w=40.0, d=8.0, h=3.2, seed=9),
    dict(id='ferry', style='ferry', w=60.0, d=12.0, h=18.0, seed=10),
    dict(id='quayrail', style='quayrail', w=4.0, d=0.4, h=1.1, seed=11),
]
for _v in VARIANTS:
    _v['gap'] = 12.0
    _v.setdefault('h', _v.get('eave', 0) + _v.get('rise', 0) + 4)


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(v['seed'] * 131 + 7)
    STYLES[v['style']](body, signs, v, r)
    return body, signs


if __name__ == '__main__':
    run('minato', VARIANTS, build_hi, lambda v: None)
    write_anchors('minato')
