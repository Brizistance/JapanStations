# Builds the Mioya Terminal Building: the terminal department store that stands over the
# Kita-Ōdōri platforms and fronts the avenue (the hub's station building since the Umeda-style
# rebuild).
#
#   blender --background --python tools/blender/build_mioya.py -- [--renders <dir>]
#
# Writes assets/buildings/mioya.blend, public/models/buildings/mioya.glb and
# src/stations/anchors/mioya.ts. Frame and helpers: buildkit.py, kitakit.py.
#
# store   W × D, front at z = 0. A street arcade ARC deep under a public terrace at TY (the
#         terrace floor, its rails and stairs are built by the game: they are walked on). Three
#         portals, PW wide at x = −PX, 0, +PX, run back to z = RD: the metro's exits rise in them.
#         Stone above: arched windows over the terrace, nine store floors, a set-back restaurant
#         floor, a clock tower on the −x corner. Nothing carries a name: boards and clock faces
#         are marked for the game.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

W, D, H = 118.0, 55.0, 59.0
ARC, RD, AH, TY = 8.0, 21.0, 5.5, 6.0
PX, PW = 27.6, 16.0
COLS = [8.0, 13.8, 19.6, 35.6, 43.4, 51.2, 58.4]
TOWER = (-59.0, -46.0)   # the clock tower's x range; it stands on z = ARC … ARC + 13
LX, LZ = 16.0, 43.0      # the grand concourse's north lobby: half width, and the z it begins at
HV, MZ = 15.0, 12.5      # top of the nave's void; top of the terminal concourse over the lobby
DOOR = 3.13              # half width of the doorway from the terrace onto the gallery
SP, CR = 10.0, 14.6      # the nave vault's springing and crown
COPPER = 'flat:#5f9a86'
CREAM = 'flat:#e3d8bf'


def in_portal(x):
    return any(abs(x - c) < PW / 2 for c in (-PX, 0.0, PX))


def store(p, s, v, r):
    x0, x1 = -W / 2, W / 2
    # ── The street arcade: columns, shallow arches between them, lamps under the terrace ──
    xs = sorted([-c for c in COLS] + COLS)
    for i, c in enumerate(xs):
        p.box(STONE, c - 0.5, 0, 0.2, c + 0.5, AH, 1.2)
        p.box(GRANITE, c - 0.58, 0, 0.12, c + 0.58, 0.9, 1.28)
        p.box(STONE_DK, c - 0.6, AH - 0.5, 0.1, c + 0.6, AH - 0.2, 1.3)
        mark('col%d' % i, c, 0, 0.7, 1.0, 1.0)
        lantern(p, c, 3.2, 0.2)
    for a, b_ in zip(xs[:-1], xs[1:]):
        wide = b_ - a > 12
        arch(p, STONE, 'f', a + 0.5, b_ - 0.5, 3.6 if not wide else 2.8, AH - 0.5, AH, 0.3, 0.8, 12 if wide else 8, STONE_DK)
    p.box(STONE_DK, x0, AH - 0.02, 0.0, x1, TY - 0.5, ARC)          # the terrace's soffit beam zone
    p.box(STONE, x0 - 0.2, TY - 0.55, -0.15, x1 + 0.2, TY - 0.05, 0.3)   # its edge, a stone fascia
    for c in rows(x0 + 2, x1 - 2, 4.0):
        p.box('light', c - 1.2, AH - 0.06, 3.6, c + 1.2, AH - 0.02, 4.2)
    # The arcade's back wall: shop windows between the portals, a board over each.
    cuts = [x0] + [e for c in (-PX, 0.0, PX) for e in (c - PW / 2, c + PW / 2)] + [x1]
    for a, b_ in zip(cuts[0::2], cuts[1::2]):
        p.box(STONE, a, 0, ARC, b_, AH, ARC + 0.5)
    for c in rows(x0 + 1, x1 - 1, 5.8):
        if in_portal(c - 2.6) or in_portal(c + 2.6):
            continue
        display(p, c - 2.5, c + 2.5, 0, 4.0, ARC)
        fascia(s, c - 2.4, c + 2.4, 4.15, 4.95, ARC, r.choice(['#12382c', '#2a2018', '#5a1f1f']))
    # ── The portals: deep bays to bronze doors, coffered and lit ──
    for k, c in enumerate((-PX, 0.0, PX)):
        a, b_ = c - PW / 2, c + PW / 2
        for side, xw in ((1, a), (-1, b_)):
            p.box(STONE_LT, min(xw, xw - side * 0.4), 0, ARC, max(xw, xw - side * 0.4), AH, RD)
            p.box(GRANITE, min(xw, xw + side * 0.06), 0, ARC + 0.4, max(xw, xw + side * 0.06), 0.9, RD)
            for z in (ARC + 3.2, ARC + 9.2):
                p.box(BRASS, min(xw + side * 0.02, xw + side * 0.08), 1.2, z, max(xw + side * 0.02, xw + side * 0.08), 3.9, z + 2.6)
                mark('case%d%s%d' % (k, 'a' if side > 0 else 'b', int(z)), xw + side * 0.1, 2.55, z + 1.3, 2.3, 2.4, (side, 0))
        if k == 1:
            # The middle portal is the way into the grand concourse: open right through, under a lintel with the station's board.
            p.box(STONE, a, 4.3, ARC, b_, TY, ARC + 0.5)
            board(p, 'portal1', 'f', c - 6.5, c + 6.5, 4.45, 5.4, ARC, 'flat:#12382c', 0.1)
            continue
        p.box(STONE_LT, a, 0, RD, b_, AH, RD + 0.5)
        for dx in (-5.2, -1.75, 1.75, 5.2):
            doors(p, c + dx, 0, RD, 2.9, 3.0, BRONZE)
        p.box(BRONZE, a + 0.4, 3.3, RD - 0.25, b_ - 0.4, 3.5, RD)
        board(p, 'portal%d' % k, 'f', c - 6.5, c + 6.5, 3.7, 5.0, RD, 'flat:#12382c', 0.1)
        for z in (ARC + 2.5, ARC + 6.5, ARC + 10.5):
            for dx in (-4.5, 0, 4.5):
                p.box(STONE_DK, c + dx - 1.7, AH - 0.3, z - 1.4, c + dx + 1.7, AH, z + 1.4)
                p.box('light', c + dx - 1.2, AH - 0.34, z - 0.9, c + dx + 1.2, AH - 0.3, z + 0.9)
        p.box(STONE_DK, a, AH, ARC, b_, TY, RD + 0.5)
    # The solid ground storey behind the arcade (the portals are cut out of it).
    # (and so is the grand concourse: a nave PW wide behind the middle portal, a lobby 2 LX wide at the back.)
    for a, b_, zz in ((x0, -PX - PW / 2, D), (-PX + PW / 2, -LX, D), (-LX, -PW / 2, LZ), (PW / 2, LX, LZ), (LX, PX - PW / 2, D), (PX + PW / 2, x1, D)):
        p.box(STONE, a, 0, ARC + 0.5, b_, TY, zz)
    for c in (-PX, PX):
        p.box(STONE, c - PW / 2, 0, RD + 0.5, c + PW / 2, TY, D)
    # The lobby's north wall, three doorways onto the lane behind, a canopy over each.
    edges = [-LX, -10.5, -7.5, -1.5, 1.5, 7.5, 10.5, LX]
    for a, b_ in zip(edges[0::2], edges[1::2]):
        p.box(STONE, a, 0, D - 0.5, b_, TY, D)
    for c in (-9.0, 0.0, 9.0):
        p.box(STONE, c - 1.5, 3.2, D - 0.5, c + 1.5, TY, D)
        p.box(BRONZE, c - 1.7, 3.2, D, c + 1.7, 3.4, D + 1.3)
        p.box('light', c - 1.3, 3.16, D + 0.1, c + 1.3, 3.2, D + 1.1)
    board(p, 'north', 'b', -6.0, 6.0, 3.9, 5.2, D, 'flat:#12382c', 0.1)
    # ── Above the terrace: two tall storeys of arched windows ──
    Z = ARC
    for a, b_, zz in ((x0, -LX, D), (LX, x1, D), (-LX, -PW / 2, LZ), (PW / 2, LX, LZ)):
        p.box(CREAM, a, TY, Z + 0.6, b_, H - 5, zz)
    p.box(CREAM, -PW / 2, HV, Z + 0.6, PW / 2, H - 5, LZ)
    p.box(CREAM, -LX, MZ, LZ, LX, H - 5, D)
    p.box(CREAM, -LX, TY, D - 0.5, LX, MZ, D)
    for a, b_ in ((-PW / 2, -DOOR), (DOOR, PW / 2)):
        p.box(CREAM, a, TY, Z + 0.6, b_, HV, Z + 1.1)
    p.box(CREAM, -DOOR, 10.7, Z + 0.6, DOOR, HV, Z + 1.1)
    for c in rows(x0, x1, W / 15):
        bw = W / 15
        wbox(p, STONE, 'f', c - bw / 2, c - bw / 2 + 0.8, TY, 16, Z, 0, 0.7)
        wbox(p, STONE, 'f', c + bw / 2 - 0.8, c + bw / 2, TY, 16, Z, 0, 0.7)
        arch(p, STONE, 'f', c - bw / 2 + 0.8, c + bw / 2 - 0.8, 11.6, 14.4, 16, Z, 0.7, 10, STONE_DK, inner=False)
        if abs(c) > 0.1:   # (the middle bay is the doorway from the terrace)
            quad(p, WINDOW, 'f', c - bw / 2 + 0.8, c + bw / 2 - 0.8, TY + 0.2, 10.4, Z + 0.55, col='flat:#3a4a50')
            wbox(p, BRONZE, 'f', c - 0.06, c + 0.06, TY, 10.4, Z, 0.4, 0.6)
        quad(p, WINDOW, 'f', c - bw / 2 + 0.8, c + bw / 2 - 0.8, 10.7, 14.4, Z + 0.55, col='flat:#3a4a50')
        wbox(p, BRONZE, 'f', c - bw / 2 + 0.8, c + bw / 2 - 0.8, 10.4, 10.7, Z, 0.4, 0.6)
        wbox(p, BRONZE, 'f', c - 0.06, c + 0.06, 10.7, 14.2, Z, 0.4, 0.6)
    band(p, STONE_DK, x0, x1, Z, D, 16, 16.9, 0.35)
    # ── Nine store floors: piers every bay, paired windows, banners hung between the piers ──
    FH = 4.2
    for face, a0, a1, at in sides(x0, x1, Z + 0.6, D, 'f'):
        for c in rows(a0, a1, W / 15):
            for i in range(9):
                y = 17.4 + i * FH
                for dx in (-1.75, 1.75):
                    quad(p, STONE_DK, face, c + dx - 1.3, c + dx + 1.3, y - 0.12, y + 2.72, at - 0.015)
                    quad(p, WINDOW, face, c + dx - 1.2, c + dx + 1.2, y, y + 2.6, at - 0.03)
    piers(p, STONE, 'f', x0, x1, Z + 0.6, 16.9, H - 5, W / 15, 1.0, 0.6)
    band(p, STONE_DK, x0, x1, Z + 0.6, D, H - 5.9, H - 5, 0.8)
    for k, c in enumerate((-35.4, -19.7, 19.7, 35.4)):
        slab(p, 'flat:#f4f1e8', 'f', c - 1.0, c + 1.0, 20.0, 40.0, Z + 0.6, 0.72)
        mark('banner%d' % k, c, 30.0, Z - 0.14, 2.0, 20.0)
    # The store's name across the middle bays, under the cornice; the house mark over the middle portal.
    board(p, 'name', 'f', -19.0, 19.0, 46.5, 52.0, Z + 0.6, 'flat:#12382c', 0.75)
    board(p, 'mark', 'f', -5.2, 5.2, 18.2, 23.4, Z + 0.6, 'flat:#12382c', 0.72)
    # Sides and back: windows on every floor, service docks, and at the back the train hall's tall arched lights.
    grid(p, x0, x1, Z + 0.6, D, 17.4, H - 6, CREAM, FH, 3.9, 2.4, 2.6, 0.0, 'lr', frame=STONE_DK, body=False)
    grid(p, x0, x1, Z + 0.6, D, 26.0, H - 6, CREAM, FH, 3.9, 2.4, 2.6, 0.0, 'b', frame=STONE_DK, body=False)
    grid(p, x0, x1, Z + 0.6, D, TY + 0.8, 16, CREAM, 4.6, 3.9, 2.4, 3.2, 0.0, 'lr', frame=STONE_DK, body=False)
    for c in rows(x0 + 6, x1 - 6, 10.6):
        wbox(p, STONE, 'b', c - 5.3, c - 4.3, TY, 25, D, 0, -0.5)
        arch(p, STONE, 'b', c - 4.3, c + 4.3, 19.5, 23.6, 25, D, -0.5, 10, STONE_DK, inner=False)
        quad(p, WINDOW, 'b', c - 4.3, c + 4.3, 11.5, 23.6, D + 0.04, col='flat:#3a4a50')
        for dx in (-2.15, 0, 2.15):
            wbox(p, BRONZE, 'b', c + dx - 0.07, c + dx + 0.07, 11.5, 23.4, D, -0.05, -0.2)
        wbox(p, STONE_DK, 'b', c - 4.3, c + 4.3, 11.0, 11.5, D, 0, -0.6)
    for face, a0, a1, at in sides(x0, x1, 0, D, 'lr'):
        for c in rows(a0 + ARC + 2, a1 - 2, 6.2):
            quad(p, 'windowDim', face, c - 2.4, c + 2.4, 0.8, 4.1, out(face, at, 0.03), col=SHOP)
            slab(p, BRONZE, face, c - 2.6, c + 2.6, 4.1, 4.3, at, 0.5)
    service_back(p, x0, -LX - 1, D, TY, r)
    service_back(p, LX + 1, x1, D, TY, r)
    # ── The restaurant floor, set back behind a parapet; the roof ──
    curtain(p, x0 + 3, x1 - 3, Z + 3.6, D - 3, H - 5, H, GLASS_BZ, BRASS, 5.0, 2.0, 0.5, 3)
    p.box(CREAM, x0 + 2.6, H, Z + 3.2, x1 + -2.6, H + 0.5, D - 2.6)
    plant(p, 0, x1 - 6, H + 0.5, Z + 16, D - 4, 7)
    roof_frame(p, 'roof', -20, 20, H + 0.5, Z + 5.0, 9.0, 'flat:#12382c')
    # A roof garden on the +x half: a trellis, planters, and the store's small Inari shrine.
    for c in rows(8, x1 - 8, 7.0):
        p.box(HEDGE, c - 2.4, H + 0.5, Z + 8, c + 2.4, H + 1.3, Z + 9.2)
    gx = x1 - 14
    p.box('flat:#b9b3a6', gx - 2, H + 0.5, D - 12, gx + 2, H + 0.8, D - 8)
    for sx in (-1, 1):
        p.box('flat:#c0392b', gx + sx * 1.1 - 0.09, H + 0.8, D - 11.6, gx + sx * 1.1 + 0.09, H + 3.0, D - 11.42)
    p.box('flat:#c0392b', gx - 1.5, H + 2.9, D - 11.62, gx + 1.5, H + 3.08, D - 11.4)
    p.box('flat:#c0392b', gx - 1.25, H + 2.5, D - 11.58, gx + 1.25, H + 2.62, D - 11.44)
    p.box('flat:#8a6a4a', gx - 0.6, H + 0.8, D - 9.6, gx + 0.6, H + 1.9, D - 8.6)
    pyramid(p, COPPER, gx - 0.8, gx + 0.8, D - 9.8, D - 8.4, H + 1.9, 0.7)
    # ── The clock tower ──
    ta, tb = TOWER
    tz0, tz1 = Z - 0.4, Z + 13
    TH = 80.0
    p.box(STONE, ta, TY, tz0, tb, TH, tz1)
    piers(p, STONE_LT, 'f', ta, tb, tz0, TY, TH - 16, tb - ta, 1.2, 0.3)
    for face, a0, a1, at in sides(ta, tb, tz0, tz1):
        c = (a0 + a1) / 2
        for y in [20 + i * 4.2 for i in range(9)]:
            quad(p, WINDOW, face, c - 0.9, c + 0.9, y, y + 2.6, out(face, at, 0.03))
        slab(p, STONE_DK, face, a0 - 0.3, a1 + 0.3, TH - 16.6, TH - 16, at, 0.5)
        slab(p, 'flat:#f4f1e8', face, c - 4.4, c + 4.4, TH - 13.4, TH - 4.6, at, 0.3)
        slab(p, BRASS, face, c - 4.6, c + 4.6, TH - 13.6, TH - 13.4, at, 0.36)
        slab(p, BRASS, face, c - 4.6, c + 4.6, TH - 4.6, TH - 4.4, at, 0.36)
        n = NORMAL[face]
        q = wpt(face, c, TH - 9.0, at, -0.33)
        mark('clock_' + face, q[0], q[1], q[2], 8.0, 8.0, (n[0], n[2]))
    band(p, STONE_DK, ta, tb, tz0, tz1, TH - 1.2, TH, 0.6)
    pyramid(p, COPPER, ta - 0.4, tb + 0.4, tz0 - 0.4, tz1 + 0.4, TH, 11.0)
    cxm, czm = (ta + tb) / 2, (tz0 + tz1) / 2
    p.box(STEEL, cxm - 0.07, TH + 10.5, czm - 0.07, cxm + 0.07, TH + 17, czm + 0.07)
    p.box(BEACON, cxm - 0.2, TH + 17, czm - 0.2, cxm + 0.2, TH + 17.4, czm + 0.2)
    mark('geo', PX, PW, ARC, RD, TY)
    mark('geo2', LX, LZ, HV, MZ, DOOR)


def hall(p, s, v, r):
    """The inside of the grand concourse (the store model leaves the room; this dresses it): pilasters,
    store doorways and their boards along the nave, blind arches at gallery level, a coffered barrel
    vault with ribs and chandeliers, ceilings and lights for the lobby and the terminal concourse over it."""
    HW = PW / 2
    z0, z1 = ARC + 0.5, LZ
    bays = rows(z0 + 0.5, z1, 6.9)
    for face, at, sx in (('l', HW, 1), ('r', -HW, -1)):
        slab(p, GRANITE, face, z0, z1, 0, 0.9, at, 0.06)
        slab(p, STONE_DK, face, z0, z1, SP - 0.5, SP, at, 0.4)
        for c in bays:
            slab(p, STONE, face, c - 3.45, c - 2.85, 0, SP - 0.5, at, 0.3)
            if c > RD + 1:
                quad(p, 'windowDim', face, c - 2.5, c + 2.5, 0.9, 4.2, out(face, at, 0.03), col=SHOP)
                slab(p, BRASS, face, c - 2.6, c + 2.6, 4.2, 4.38, at, 0.14)
                slab(p, BRASS, face, c - 0.05, c + 0.05, 0.9, 4.2, at, 0.08)
                xa, xb = (at - 0.14, at - 0.02) if sx > 0 else (at + 0.02, at + 0.14)
                sign(s, r.choice(['#12382c', '#2a2018', '#5a1f1f', '#1f3f7a']), xa, 4.5, c - 2.3, xb, 5.3, c + 2.3)
            quad(p, WINDOW, face, c - 2.2, c + 2.2, TY + 0.5, 8.1, out(face, at, 0.03), col='flat:#4a4034')
            arch(p, STONE, face, c - 2.2, c + 2.2, 8.1, 9.2, SP - 0.5, out(face, at, 0.12), 0.12, 8, STONE_DK, inner=False)
        slab(p, STONE, face, z1 - 0.5, z1, 0, SP - 0.5, at, 0.3)
    # The vault: fourteen strips from wall to wall, alternately shaded; a rib at every pilaster.
    n = 14
    prof = [(-HW + 2 * HW * k / n, SP + (CR - SP) * math.sin(math.pi * k / n)) for k in range(n + 1)]
    for k, ((xa, ya), (xb, yb)) in enumerate(zip(prof[:-1], prof[1:])):
        p.face('flat:#e8dfc8' if k % 2 else 'flat:#d9cdb0', [(xa, ya, z0), (xb, yb, z0), (xb, yb, z1), (xa, ya, z1)], (0, -1, 0))
        for c in [b_ - 3.15 for b_ in bays] + [z1 - 0.25]:
            p.face(STONE, [(xa, ya - 0.3, c - 0.3), (xb, yb - 0.3, c - 0.3), (xb, yb - 0.3, c + 0.3), (xa, ya - 0.3, c + 0.3)], (0, -1, 0))
            for zz, hz in ((c - 0.3, -1), (c + 0.3, 1)):
                p.face(STONE, [(xa, ya - 0.3, zz), (xb, yb - 0.3, zz), (xb, yb, zz), (xa, ya, zz)], (0, 0, hz))
    for c in bays:
        p.box(DARK, -0.03, 9.3, c - 0.03, 0.03, CR, c + 0.03)
        p.cyl(BRASS, (0, 9.2, c), 1, 1.3, 0.14, seg=16)
        p.cyl(WARM, (0, 9.05, c), 1, 1.0, 0.2, seg=16)   # (a frosted bowl: only the small lamps round it are lit)
        for a in range(6):
            t = a * math.pi / 3
            p.cyl('light', (1.3 * math.cos(t), 9.45, c + 1.3 * math.sin(t)), 1, 0.16, 0.34, seg=8)
    # The clock on the south wall over the terrace door; the board over the opening onto the terminal concourse.
    mark('clock', 0, 12.6, ARC + 1.12, 2.4, 2.4, (0, 1))
    mark('term', 0, 13.5, LZ - 0.02, 9.0, 1.1, (0, -1))
    # Lights under the galleries, the lobby's ceiling, the terminal concourse's ceiling and its shuttered windows.
    for sx in (-1, 1):
        for c in bays:
            p.box('light', sx * 6.75 - 0.5, 5.44, c - 0.9, sx * 6.75 + 0.5, 5.48, c + 0.9)
    p.face(CREAM, [(-LX, 5.46, LZ), (LX, 5.46, LZ), (LX, 5.46, D - 0.5), (-LX, 5.46, D - 0.5)], (0, -1, 0))
    for cx in rows(-LX + 1, LX - 1, 5.0):
        for cz in (LZ + 3.0, D - 3.5):
            p.box('light', cx - 1.2, 5.4, cz - 0.3, cx + 1.2, 5.46, cz + 0.3)
            p.box('light', cx - 1.2, MZ - 0.06, cz - 0.3, cx + 1.2, MZ - 0.01, cz + 0.3)
    for sx in (-1, 1):
        slab(p, 'flat:#a7acb1', 'f', min(sx * 9.5, sx * 14.5), max(sx * 9.5, sx * 14.5), TY, TY + 2.6, D - 0.5, 0.08)
        for y in [TY + 0.25 + 0.3 * i for i in range(8)]:
            slab(p, 'flat:#8c9196', 'f', min(sx * 9.5, sx * 14.5), max(sx * 9.5, sx * 14.5), y, y + 0.03, D - 0.5, 0.1)
    mark('reserved', 0, TY + 3.7, D - 0.53, 16.0, 1.4, (0, -1))
    slab(p, STONE_DK, 'f', -LX, LX, MZ - 0.5, MZ - 0.1, D - 0.5, 0.2)


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    (store if v['id'] == 'store' else hall)(body, signs, v, random.Random(12))
    return body, signs


if __name__ == '__main__':
    run('mioya', [dict(id='store', w=W, d=D, h=H, gap=40.0), dict(id='hall', w=W, d=D, h=HV)], build_hi, lambda v: None)
    write_anchors('mioya')
