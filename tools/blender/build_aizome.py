# Builds Aizomechō's own street pieces (藍染町, the old indigo dyers' quarter; rebuilt 2026-11
# after Osaka's surviving nagaya pockets): the station's machiya headhouse, the merchants' houses
# of the dyers' street, the dye works and its drying yard, the cotton wholesalers' storehouses,
# the dyers' shrine, a lane Jizō, row houses for the lanes, tiny lane shops, the lane gate, cloth
# drying across the street, and the rinsing stream.
#
#   blender --background --python tools/blender/build_aizome.py -- [--renders <dir>]
#
# Writes assets/buildings/aizome.blend, public/models/buildings/aizome.glb and
# src/stations/anchors/aizome.ts (sizes and the places of the boards the game letters; marks whose
# name starts with '_' carry a measurement, not a sign). Frame and helpers: buildkit.py, kitakit.py.
# Nothing here carries a name.
#
# Sources for how these are really built are listed in docs/street-design.md (Aizomechō).

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

TIMBER = 'flat:#3b2a1e'
TIMBER_LT = 'flat:#6b4a30'
YAKI = 'flat:#2a2622'        # charred cedar boards
YAKI_LT = 'flat:#3a342e'
PLASTER = 'flat:#ece4d2'
PLASTER_DK = 'flat:#cfc6b2'
MORTAR = 'flat:#b9b3a4'
TILE = 'flat:#3d4148'
TILE_DK = 'flat:#2c2f35'
STONE_G = 'flat:#9a9488'
STONE_GD = 'flat:#77726a'
EARTH = 'flat:#8a7a62'
INDIGO = 'flat:#24407a'
CREAM = 'flat:#f1ead8'
PAPER = 'flat:#f4ecd6'
VERM = 'flat:#b9382b'
MOSS = 'flat:#55703f'
IRON = 'flat:#26282b'
SHADES = ['#c6d4e6', '#8fa8ca', '#5574a8', '#2f4a82', '#1d2c50', '#121a30']

D_MACHI = 12.0   # depth of the dyers' street houses
D_NAGAYA = 7.2   # depth of the lane row houses
EK_W, EK_D = 26.0, 20.0          # the headhouse
EK_DOOR = (-2.6, 2.6)            # its entrance bay
YARD_W, YARD_D = 12.0, 22.0      # the dye yard behind the works
PASS = (3.6, 5.8)                # the works' through passage (x range in its 12 m front)
ST_W = 1.6                       # the stream's channel
ST_BED = -0.9


def quad2(p, mat, pts, hint):
    p.face(mat, pts, hint)
    p.face(mat, list(reversed(pts)), tuple(-h for h in hint))


def roof_x(p, x0, x1, z0, z1, eave, rise, ov=0.6, mat=TILE):
    """A tiled gable roof, ridge along x (eaves to the street and the back), rolls of tile down the slopes."""
    zc = (z0 + z1) / 2
    poly = [(z0 - ov, eave), (z1 + ov, eave), (z1 + ov, eave + 0.16), (zc, eave + rise + 0.16), (z0 - ov, eave + 0.16)]
    p.prism(mat, poly, 'x', x0, x1)
    up = [(q[0], q[1] + 0.06) for q in poly[2:]] + [(z0 - ov, eave + 0.1), (z1 + ov, eave + 0.1)]
    up = [(z0 - ov, eave + 0.1), (z1 + ov, eave + 0.1), (z1 + ov, eave + 0.22), (zc, eave + rise + 0.22), (z0 - ov, eave + 0.22)]
    x = x0 + 0.5
    while x < x1 - 0.3:
        p.prism(TILE_DK, up, 'x', x, x + 0.14)
        x += 1.0
    p.box(TILE_DK, x0 - 0.05, eave + rise + 0.1, zc - 0.2, x1 + 0.05, eave + rise + 0.46, zc + 0.2)
    for xe in (x0 - 0.05, x1 - 0.25):
        p.box(TILE_DK, xe, eave + rise + 0.05, zc - 0.32, xe + 0.3, eave + rise + 0.62, zc + 0.32)


def roof_z(p, x0, x1, z0, z1, eave, rise, ov=0.5, mat=TILE):
    """A tiled gable roof, ridge along z (a gable to the street)."""
    xc = (x0 + x1) / 2
    poly = [(x0 - ov, eave), (x1 + ov, eave), (x1 + ov, eave + 0.16), (xc, eave + rise + 0.16), (x0 - ov, eave + 0.16)]
    p.prism(mat, poly, 'z', z0, z1)
    up = [(x0 - ov, eave + 0.1), (x1 + ov, eave + 0.1), (x1 + ov, eave + 0.22), (xc, eave + rise + 0.22), (x0 - ov, eave + 0.22)]
    z = z0 + 0.5
    while z < z1 - 0.3:
        p.prism(TILE_DK, up, 'z', z, z + 0.14)
        z += 1.0
    p.box(TILE_DK, xc - 0.2, eave + rise + 0.1, z0 - 0.05, xc + 0.2, eave + rise + 0.46, z1 + 0.05)


def pent(p, x0, x1, z, y, out=1.3, drop=0.55, mat=TILE):
    """A tiled pent roof (hisashi) on the front wall at z, its top edge at y."""
    p.prism(mat, [(z, y), (z - out, y - drop), (z - out, y - drop - 0.14), (z, y - 0.14)], 'x', x0, x1)
    p.box(TILE_DK, x0, y - drop - 0.16, z - out - 0.05, x1, y - drop - 0.04, z - out + 0.06)
    x = x0 + 0.45
    while x < x1 - 0.2:
        p.prism(TILE_DK, [(z, y + 0.06), (z - out, y - drop + 0.06), (z - out, y - drop), (z, y)], 'x', x, x + 0.12)
        x += 0.9
    # Rafters under it.
    x = x0 + 0.3
    while x < x1 - 0.1:
        p.box(TIMBER, x, y - drop - 0.2, z - out + 0.1, x + 0.07, y - 0.2, z)
        x += 0.6


def koshi(p, x0, x1, y0, y1, z, step=0.13, bar=0.045, mat=TIMBER, back=PAPER):
    """A lattice (kōshi) panel on a front wall: fine vertical bars over a lit paper or dark ground."""
    if back == 'lit':
        quad(p, 'windowDim', 'f', x0, x1, y0, y1, z - 0.02, col=WARM)
    elif back:
        p.box(back, x0, y0, z - 0.03, x1, y1, z)
    p.box(mat, x0 - 0.06, y0 - 0.06, z - 0.09, x1 + 0.06, y0, z)
    p.box(mat, x0 - 0.06, y1, z - 0.09, x1 + 0.06, y1 + 0.06, z)
    x = x0
    while x < x1 - bar + 1e-6:
        p.box(mat, x, y0, z - 0.08, x + bar, y1, z - 0.04)
        x += step
    for y in (y0 + (y1 - y0) / 3, y0 + 2 * (y1 - y0) / 3):
        p.box(mat, x0, y - 0.02, z - 0.06, x1, y + 0.02, z - 0.035)


def mushiko(p, x0, x1, y0, y1, z):
    """A mushiko window: plastered bars in a low upper wall."""
    p.box('flat:#1c1d1f', x0, y0, z - 0.02, x1, y1, z + 0.02)
    p.box(PLASTER_DK, x0 - 0.1, y0 - 0.1, z - 0.05, x1 + 0.1, y0, z)
    p.box(PLASTER_DK, x0 - 0.1, y1, z - 0.05, x1 + 0.1, y1 + 0.1, z)
    x = x0
    while x < x1 - 0.05:
        p.box(PLASTER, x, y0, z - 0.06, x + 0.09, y1, z - 0.02)
        x += 0.2


def noren(p, x0, x1, top, drop, z, col, n=3, crest=False):
    """A split curtain hung from a pole across a doorway."""
    p.cyl(TIMBER_LT, ((x0 + x1) / 2, top + 0.03, z), 0, 0.025, x1 - x0 + 0.3, seg=6)
    w = (x1 - x0) / n
    for k in range(n):
        a, e = x0 + k * w + 0.02, x0 + (k + 1) * w - 0.02
        quad2(p, col, [(a, top, z), (e, top, z), (e, top - drop, z), (a, top - drop, z)], (0, 0, -1))
        if crest:
            c = (a + e) / 2
            for zz in (z - 0.012, z + 0.012):
                p.cyl(CREAM, (c, top - drop * 0.5, zz), 2, min(w, drop) * 0.3, 0.004, seg=14)
                p.cyl(col, (c, top - drop * 0.5, zz + (0.003 if zz > z else -0.003)), 2, min(w, drop) * 0.22, 0.004, seg=14)


def cloth_drop(p, x, y, z, w, length, k, along='x'):
    """One dyed length hanging from y, seen from both sides; some carry a band left white by the resist."""
    col = 'flat:' + SHADES[k % len(SHADES)]
    if along == 'x':
        pts = [(x - w / 2, y, z), (x + w / 2, y, z), (x + w / 2, y - length, z), (x - w / 2, y - length, z)]
        quad2(p, col, pts, (0, 0, -1))
        if k % 3 == 0:
            for zz in (z - 0.008, z + 0.008):
                quad2(p, CREAM, [(x - w / 2, y - length * 0.3, zz), (x + w / 2, y - length * 0.3, zz), (x + w / 2, y - length * 0.36, zz), (x - w / 2, y - length * 0.36, zz)], (0, 0, -1))
    else:
        pts = [(x, y, z - w / 2), (x, y, z + w / 2), (x, y - length, z + w / 2), (x, y - length, z - w / 2)]
        quad2(p, col, pts, (1, 0, 0))
        if k % 3 == 0:
            for xx in (x - 0.008, x + 0.008):
                quad2(p, CREAM, [(xx, y - length * 0.3, z - w / 2), (xx, y - length * 0.3, z + w / 2), (xx, y - length * 0.36, z + w / 2), (xx, y - length * 0.36, z - w / 2)], (1, 0, 0))


def pots(p, x, z, r, n=3):
    """Doorstep plants: terracotta and glazed pots with a tuft each."""
    for k in range(n):
        xx = x + k * 0.36
        hh = 0.22 + r.random() * 0.2
        p.cyl(r.choice(['flat:#a85f3c', 'flat:#3f5a78', 'flat:#77726a']), (xx, hh / 2, z), 1, 0.13, hh, seg=8)
        p.cyl(r.choice(['flat:#3f6b3a', 'flat:#55703f', 'flat:#2e5a3c']), (xx, hh + 0.2 + r.random() * 0.2, z), 1, 0.17, 0.4 + r.random() * 0.3, seg=6)


def lantern_box(p, x, y, z, w=0.3, h=0.5):
    """A paper lantern (andon) with a dark cap and foot."""
    # (Soft-lit paper, not a bare light: a face this size would glare.)
    p.box('windowDim', x - w / 2, y, z - w / 2, x + w / 2, y + h, z + w / 2, col=WARM)
    p.box(TIMBER, x - w / 2 - 0.02, y + h, z - w / 2 - 0.02, x + w / 2 + 0.02, y + h + 0.05, z + w / 2 + 0.02)
    p.box(TIMBER, x - w / 2 - 0.02, y - 0.05, z - w / 2 - 0.02, x + w / 2 + 0.02, y, z + w / 2 + 0.02)


def boards_side(p, x, z0, z1, y0, y1, o):
    """Charred cedar boards with battens on a side wall at x facing o."""
    p.box(YAKI, min(x, x + o * 0.04), y0, z0, max(x, x + o * 0.04), y1, z1)
    z = z0 + 0.3
    while z < z1 - 0.1:
        p.box(YAKI_LT, min(x + o * 0.04, x + o * 0.065), y0, z, max(x + o * 0.04, x + o * 0.065), y1, z + 0.05)
        z += 0.45


# ── The dyers' street: merchants' houses (machiya) ────────────────────────────────────────────

def machiya(p, s, v, r):
    """A two-storey merchant's house, eaves to the street: a latticed ground floor with an entrance
    bay and its noren, a pent roof, a low plastered upper floor with mushiko windows (or a timber
    one with lattice), a tiled roof, a board for the shop's name and a lantern by the door."""
    w, d = v['w'], v['d']
    x0, x1 = -w / 2, w / 2
    g, e2 = 2.9, v.get('eave', 5.2)
    rise = v.get('rise', 2.3)
    upper = v.get('upper', 'mushiko')
    wall2 = PLASTER if upper == 'mushiko' else YAKI
    p.box(STONE_GD, x0, 0, -0.06, x1, 0.25, d)
    p.box(YAKI, x0, 0.25, 0, x1, g, d)
    p.box(wall2, x0, g, 0, x1, e2, d)
    # Posts every bay; the door's bay is the one named.
    n = max(2, round(w / 1.9))
    bay = w / n
    door = v.get('door', n // 2)
    for k in range(n + 1):
        cx = x0 + k * bay
        p.box(TIMBER, cx - 0.08, 0.25, -0.1, cx + 0.08, e2 if upper != 'mushiko' else g, 0.02)
    for k in range(n):
        a, e = x0 + k * bay + 0.1, x0 + (k + 1) * bay - 0.1
        if k == door:
            quad(p, 'windowDim', 'f', a, e, 0.25, 2.25, -0.01, col=WARM)
            for xm in (a + (e - a) / 2,):
                p.box(TIMBER, xm - 0.03, 0.25, -0.05, xm + 0.03, 2.25, -0.01)
            p.box(TIMBER, a, 2.25, -0.08, e, 2.4, 0.0)
            noren(p, a + 0.05, e - 0.05, 2.22, 0.95, -0.2, 'flat:' + v.get('noren', '#24407a'), 3, crest=True)
            p.box(STONE_G, a - 0.1, 0, -0.75, e + 0.1, 0.12, -0.06)
        elif k == v.get('degoshi', -1):
            # A projecting lattice bay.
            p.box(TIMBER, a - 0.05, 0.5, -0.38, e + 0.05, 0.62, 0)
            koshi(p, a, e, 0.62, 2.3, -0.3, back='lit')
            p.box(TIMBER, a - 0.05, 2.3, -0.38, e + 0.05, 2.42, 0)
        else:
            p.box(YAKI_LT, a, 0.25, -0.04, e, 0.8, 0)
            koshi(p, a, e, 0.86, 2.4, -0.02, back='lit' if (k + v['seed']) % 2 else PAPER)
    p.box(TIMBER, x0, g - 0.2, -0.12, x1, g, 0.0)
    pent(p, x0 - 0.15, x1 + 0.15, 0.0, g + 0.75)
    # Upper floor.
    if upper == 'mushiko':
        for c in rows(x0 + 0.5, x1 - 0.5, 2.6):
            mushiko(p, c - 0.9, c + 0.9, g + 1.05, e2 - 0.45, 0.0)
    else:
        for c in rows(x0 + 0.4, x1 - 0.4, bay * 2):
            quad(p, WINDOW, 'f', c - bay * 0.8, c + bay * 0.8, g + 1.0, e2 - 0.35, -0.01)
            koshi(p, c - bay * 0.8, c + bay * 0.8, g + 1.0, e2 - 0.35, -0.02, step=0.16, back=None)
    p.box(TIMBER, x0, e2 - 0.18, -0.1, x1, e2, 0.0)
    roof_x(p, x0 - 0.12, x1 + 0.12, 0, d, e2, rise)
    for xe, o in ((x0, -1), (x1, 1)):
        p.prism(wall2, [(0, e2), (d, e2), (d / 2, e2 + rise)], 'x', xe - 0.02 * o, xe)
        boards_side(p, xe, 0, d, 0.25, g + 0.6, o)
    # The shop's board on the pent roof, a lantern by the door.
    bc = x0 + (door + 0.5) * bay
    board(p, 'name', 'f', bc - min(1.5, bay), bc + min(1.5, bay), g + 0.95, g + 1.6, -0.75, 'flat:#2a2019', 0.06)
    p.box(TIMBER, bc - 0.05, g + 0.5, -0.8, bc + 0.05, g + 0.95, -0.7)
    lx = x0 + (door + 1) * bay
    p.box(TIMBER, lx - 0.03, 1.9, -0.32, lx + 0.03, 1.95, 0)
    lantern_box(p, lx, 1.35, -0.3, 0.26, 0.5)
    pots(p, x0 + 0.5, -0.3, r, 2 + v['seed'] % 3)
    # Back: a lean-to and wall clutter.
    backs(p, w, d, [g, e2], r, sides=(), back=True)


# ── The headhouse ────────────────────────────────────────────────────────────────────────────

def ekisha(p, s, v, r):
    """The station's headhouse: a big merchant's house on the dyers' street. A latticed ground
    floor with a wide entrance under a great noren, a deep pent roof, a full upper floor of
    lattice windows, a heavy tiled roof with a cross gable over the door, and a plastered
    storehouse wing at each end whose flank carries the station's name."""
    w, d = EK_W, EK_D
    x0, x1 = -w / 2, w / 2
    g, e2, rise = 3.5, 7.2, 3.4
    wing = 4.6
    a0, a1 = x0 + wing, x1 - wing   # the timber house between the two plastered wings
    da, de = EK_DOOR
    # The plinth runs round the house but not across the floor or the doorway: the hall's floor is the street's.
    for xa, xb in ((x0, da - 0.16), (de + 0.16, x1)):
        p.box(STONE_GD, xa, 0, -0.08, xb, 0.3, 0.2)
    p.box(STONE_GD, x0, 0, d - 0.2, x1, 0.3, d)
    # The timber house's front and back walls (the wings close its sides, the game builds the inside).
    for xa, xb, ya in ((a0, da, 0.3), (de, a1, 0.3), (da, de, 2.95)):
        p.box(YAKI, xa, ya, 0, xb, e2, 0.15)
    p.box(YAKI, a0, 0.3, d - 0.15, a1, e2, d)
    # Ground floor: posts, lattice bays, the open entrance.
    n = 8
    bay = (a1 - a0) / n
    for k in range(n + 1):
        cx = a0 + k * bay
        if EK_DOOR[0] + 0.2 < cx < EK_DOOR[1] - 0.2:
            continue
        p.box(TIMBER, cx - 0.11, 0.3, -0.14, cx + 0.11, e2, 0.02)
    for k in range(n):
        a, e = a0 + k * bay + 0.13, a0 + (k + 1) * bay - 0.13
        if e > EK_DOOR[0] and a < EK_DOOR[1]:
            continue
        p.box(YAKI_LT, a, 0.3, -0.05, e, 0.95, 0)
        koshi(p, a, e, 1.0, 2.85, -0.03, back='lit')
    p.box(TIMBER, da - 0.16, 0.0, -0.2, da + 0.02, g, 0.02)
    p.box(TIMBER, de - 0.02, 0.0, -0.2, de + 0.16, g, 0.02)
    p.box(TIMBER, da - 0.16, 2.95, -0.22, de + 0.16, 3.25, 0.02)
    mark('_door', 0, 1.5, 0, de - da, 2.95)
    p.box(STONE_G, da - 0.6, 0, -1.6, de + 0.6, 0.02, 0.2)
    noren(p, da + 0.1, de - 0.1, 2.92, 1.25, -0.42, INDIGO, 5, crest=True)
    mark('noren', 0, 2.3, -0.44, de - da - 0.2, 1.25)
    p.box(TIMBER, a0, g - 0.25, -0.16, a1, g, 0.0)
    pent(p, a0 - 0.1, a1 + 0.1, 0.0, g + 0.95, out=1.7, drop=0.7)
    # Upper floor: lattice windows bay by bay, a rail under them.
    for k in range(n):
        a, e = a0 + k * bay + 0.25, a0 + (k + 1) * bay - 0.25
        quad(p, WINDOW, 'f', a, e, g + 1.55, e2 - 0.5, -0.01)
        koshi(p, a, e, g + 1.55, e2 - 0.5, -0.02, step=0.17, back=None)
    p.box(TIMBER, a0, g + 1.3, -0.2, a1, g + 1.42, 0.0)
    p.box(TIMBER, a0, e2 - 0.22, -0.14, a1, e2, 0.0)
    roof_x(p, a0 - 0.1, a1 + 0.1, 0, d, e2, rise, ov=0.9)
    # The cross gable over the entrance, with the station's board under it.
    gw = 4.2
    roof_z(p, -gw, gw, -1.1, d / 2, e2 + 0.2, 2.5, ov=0.5)
    p.prism(PLASTER, [(-gw + 0.2, e2 + 0.2), (gw - 0.2, e2 + 0.2), (0, e2 + 2.55)], 'z', -0.5, -0.42)
    p.box(TIMBER, -gw + 0.2, e2 + 0.05, -0.56, gw - 0.2, e2 + 0.25, -0.4)
    p.box(TIMBER, -0.1, e2 + 0.25, -0.56, 0.1, e2 + 2.3, -0.44)
    p.box(TIMBER, -gw / 2, e2 + 1.2, -0.56, gw / 2, e2 + 1.34, -0.44)
    board(p, 'name', 'f', -3.4, 3.4, g + 1.05, g + 2.05, -1.25, 'flat:#2a2019', 0.1)
    for xx in (-3.0, 3.0):
        p.box(TIMBER, xx - 0.06, g + 0.45, -1.3, xx + 0.06, g + 1.05, -1.18)
    board(p, 'crest', 'f', -0.75, 0.75, e2 + 0.42, e2 + 1.15, -0.56, 'flat:#f1ead8', 0.04)
    # The plastered wings (kura): namako tiles below, a thick tiled roof with its gable to the street.
    for sx, tag in ((-1, 'l'), (1, 'r')):
        b0, b1 = (x0, a0) if sx < 0 else (a1, x1)
        # (Outside faces only: the hall inside runs through under the wings.)
        def shell(mat, pr, y0, y1):
            xa, xb, za, zb = b0 - pr, b1 + pr, -0.25 - pr, d + pr
            p.face(mat, [(xa, y0, za), (xb, y0, za), (xb, y1, za), (xa, y1, za)], (0, 0, -1))
            p.face(mat, [(xa, y0, zb), (xb, y0, zb), (xb, y1, zb), (xa, y1, zb)], (0, 0, 1))
            xs = xa if sx < 0 else xb
            p.face(mat, [(xs, y0, za), (xs, y0, zb), (xs, y1, zb), (xs, y1, za)], (sx, 0, 0))
            p.face(mat, [(xa, y1, za), (xb, y1, za), (xb, y1, zb), (xa, y1, zb)], (0, 1, 0))
        shell(PLASTER, 0.0, 0.3, e2 + 0.6)
        shell('flat:#34373c', 0.03, 0.3, 1.9)
        y = 0.3
        while y < 1.9:
            shell(PLASTER, 0.045, y, y + 0.05)
            y += 0.4
        xx = b0 + 0.35
        while xx < b1:
            p.box(PLASTER, xx, 0.3, -0.295, xx + 0.05, 1.9, -0.28)
            xx += 0.42
        zz = 0.2
        xe = x0 - 0.045 if sx < 0 else x1 + 0.03
        while zz < d:
            p.box(PLASTER, xe, 0.3, zz, xe + 0.015, 1.9, zz + 0.05)
            zz += 0.42
        roof_z(p, b0, b1, -0.25, d, e2 + 0.6, 1.5, ov=0.45)
        p.prism(PLASTER, [(b0, e2 + 0.6), (b1, e2 + 0.6), ((b0 + b1) / 2, e2 + 2.05)], 'z', -0.27, -0.2)
        # An iron-shuttered window up in the gable wall, a small one below.
        c = (b0 + b1) / 2
        for yy in (2.6, 5.0):
            p.box(PLASTER_DK, c - 0.7, yy - 0.1, -0.33, c + 0.7, yy + 1.3, -0.25)
            p.box('flat:#1c1d1f', c - 0.45, yy + 0.05, -0.35, c + 0.45, yy + 1.15, -0.33)
            for o in (-1, 1):
                p.box('flat:#2f3236', c + o * 0.5, yy, -0.42, c + o * 0.95, yy + 1.2, -0.34)
        # The flank: the station's name high on the plaster, a vertical board near the street corner.
        fx = x0 if sx < 0 else x1
        face = 'l' if sx < 0 else 'r'
        board(p, 'side_' + tag, face, 5.0, 15.0, 4.2, 5.7, fx, 'flat:#2a2019', 0.08)
        board(p, 'post_' + tag, face, 0.5, 1.5, 2.3, 6.0, fx, 'flat:#f1ead8', 0.1)
        for zz in (7.0, 13.0):
            ox = fx - 0.06 if sx < 0 else fx + 0.02
            p.box(PLASTER_DK, ox, 2.3, zz - 0.6, ox + 0.04, 3.5, zz + 0.6)
            p.box('flat:#1c1d1f', ox - (0.02 if sx < 0 else -0.02), 2.4, zz - 0.45, ox + 0.04 - (0.02 if sx < 0 else -0.02), 3.4, zz + 0.45)
    # Lanterns either side of the door, a low fence (komayose) under the lattice.
    for xx in (da - 0.6, de + 0.6):
        p.box(TIMBER, xx - 0.04, 2.5, -0.5, xx + 0.04, 2.56, 0)
        lantern_box(p, xx, 1.75, -0.48, 0.34, 0.7)
    for sx in (-1, 1):
        fa, fe = (a0 + 0.3, da - 1.0) if sx < 0 else (de + 1.0, a1 - 0.3)
        p.box(TIMBER, fa, 0.62, -0.62, fe, 0.7, -0.56)
        xx = fa
        while xx < fe:
            p.box(TIMBER, xx, 0.0, -0.62, xx + 0.06, 0.7, -0.56)
            xx += 0.3
    # The back: a plastered wall with a tiled coping, windows, the yard door.
    backs(p, w, d, [g, e2], r, sides=(), back=True)


# ── The dye works and its yard ───────────────────────────────────────────────────────────────

def works(p, s, v, r):
    """The dye works' street front: a merchant's house with a wide open shop bay showing bolts of
    cloth, and at one end a passage right through to the yard behind."""
    w, d = v['w'], v['d']
    x0, x1 = -w / 2, w / 2
    g, e2, rise = 3.0, 5.4, 2.2
    pa, pe = PASS
    mark('_pass', (pa + pe) / 2, 1.3, 0, pe - pa, 2.6)
    p.box(STONE_GD, x0, 0, -0.06, pa, 0.25, d)
    p.box(STONE_GD, pe, 0, -0.06, x1, 0.25, d)
    p.box(YAKI, x0, 0.25, 0, pa, g, d)
    p.box(YAKI, pe, 0.25, 0, x1, g, d)
    p.box(YAKI, pa, 2.6, 0, pe, g, d)
    p.box(PLASTER, x0, g, 0, x1, e2, d)
    p.box(STONE_G, pa, 0.0, -0.4, pe, 0.03, d + 0.3)
    for cx in (x0, -3.0, 0.2, pa, pe, x1):
        p.box(TIMBER, cx - 0.09, 0.25, -0.11, cx + 0.09, g, 0.02)
    # Lattice bay, then the open shop: a raised floor, shelves of bolts, a counter, the noren.
    p.box(YAKI_LT, x0 + 0.1, 0.25, -0.04, -3.1, 0.8, 0)
    koshi(p, x0 + 0.1, -3.1, 0.86, 2.4, -0.02, back='lit')
    p.box('flat:#14110e', -2.9, 0.25, 2.4, pa - 0.1, 2.6, 2.45)
    p.box(TIMBER_LT, -2.9, 0.25, 0.05, pa - 0.1, 0.6, 2.4)
    p.box('light', -2.6, 2.5, 0.4, pa - 0.4, 2.56, 0.6)
    for y in (1.0, 1.5, 2.0):
        p.box(TIMBER_LT, -2.8, y, 2.05, pa - 0.2, y + 0.04, 2.4)
        xx = -2.7
        k = int(y * 10)
        while xx < pa - 0.5:
            p.cyl('flat:' + SHADES[(k + int(xx * 7)) % len(SHADES)], (xx + 0.2, y + 0.15, 2.22), 2, 0.11, 0.3, seg=8)
            xx += 0.3
    p.box(TIMBER, -2.2, 0.6, 0.9, 0.0, 1.0, 1.4)
    for k in range(4):
        p.box('flat:' + SHADES[(k * 2 + 1) % len(SHADES)], -2.1 + k * 0.5, 1.0, 0.95, -1.7 + k * 0.5, 1.08, 1.35)
    p.box(TIMBER, -2.9, 2.4, -0.09, pa - 0.1, 2.6, 0.0)
    noren(p, -2.8, 0.1, 2.38, 0.8, -0.18, INDIGO, 4, crest=True)
    noren(p, 0.3, pa - 0.2, 2.38, 0.8, -0.18, 'flat:#f1ead8', 3)
    # The passage: its own short noren, a lamp, the yard's name on a post.
    noren(p, pa + 0.1, pe - 0.1, 2.58, 0.55, -0.1, 'flat:#1d2c50', 3)
    p.box('light', (pa + pe) / 2 - 0.2, 2.5, d / 2 - 0.2, (pa + pe) / 2 + 0.2, 2.56, d / 2 + 0.2)
    board(p, 'yard', 'f', pe + 0.12, pe + 0.5, 0.9, 2.3, -0.02, 'flat:#f1ead8', 0.05)
    p.box(TIMBER, x0, g - 0.2, -0.12, x1, g, 0.0)
    pent(p, x0 - 0.15, x1 + 0.15, 0.0, g + 0.75)
    for c in rows(x0 + 0.5, x1 - 0.5, 2.8):
        mushiko(p, c - 0.95, c + 0.95, g + 1.05, e2 - 0.45, 0.0)
    p.box(TIMBER, x0, e2 - 0.18, -0.1, x1, e2, 0.0)
    roof_x(p, x0 - 0.12, x1 + 0.12, 0, d, e2, rise)
    for xe, o in ((x0, -1), (x1, 1)):
        p.prism(PLASTER, [(0, e2), (d, e2), (d / 2, e2 + rise)], 'x', xe - 0.02 * o, xe)
        boards_side(p, xe, 0, d, 0.25, g + 0.6, o)
    board(p, 'name', 'f', -2.9, 0.2, g + 0.95, g + 1.65, -0.75, 'flat:#24407a', 0.06)
    p.box(TIMBER, -1.4, g + 0.5, -0.8, -1.3, g + 0.95, -0.7)
    lantern_box(p, 0.2, 1.35, -0.3, 0.26, 0.5)
    # The back wall towards the yard: boards, a wide opening from the dye room.
    p.box(YAKI_LT, x0, 0.25, d, pa, g, d + 0.04)
    quad(p, 'windowDim', 'b', x0 + 1.0, pa - 1.0, 0.3, 2.3, d + 0.05, col=WARM)


def yard(p, s, v, r):
    """The drying yard: a long earth yard between board fences. Vats sunk in the floor under a
    lean-to, a well and a rinsing trough, and tall poles with crossbars from which the dyed lengths
    hang to dry; two lengths stretched low between posts."""
    w, d = YARD_W, YARD_D
    x0, x1 = -w / 2, w / 2
    p.box(EARTH, x0, 0.0, 0, x1, 0.02, d)
    # Fences on the two long sides and the end.
    for xe, o in ((x0, 1), (x1, -1)):
        p.box(YAKI, min(xe, xe + o * 0.1), 0, 0, max(xe, xe + o * 0.1), 2.2, d)
        z = 0.2
        while z < d:
            p.box(YAKI_LT, min(xe + o * 0.1, xe + o * 0.13), 0, z, max(xe + o * 0.1, xe + o * 0.13), 2.2, z + 0.05)
            z += 0.5
        p.box(TILE_DK, xe - 0.12, 2.2, 0, xe + 0.12, 2.3, d)
    p.box(YAKI, x0, 0, d - 0.1, x1, 2.2, d)
    p.box(TILE_DK, x0, 2.2, d - 0.2, x1, 2.3, d + 0.02)
    # The vat shed along the -x fence: posts, a tin roof, eight vats in two rows, lids and a paddle.
    # (The works' passage comes out at the +x side, which stays clear for the first few metres.)
    sx1, sz0, sz1 = x0 + 3.6, 1.0, 10.6
    mark('_shed', (x0 + sx1) / 2, 1.3, (sz0 + sz1) / 2, sx1 - x0, sz1 - sz0)
    for z in (sz0, (sz0 + sz1) / 2, sz1):
        p.box(TIMBER, sx1 - 0.07, 0, z - 0.07, sx1 + 0.07, 2.7, z + 0.07)
    p.prism('flat:#6b6f72', [(x0 + 0.1, 3.3), (sx1 + 0.4, 2.7), (sx1 + 0.4, 2.76), (x0 + 0.1, 3.36)], 'z', sz0 - 0.3, sz1 + 0.3)
    p.box(TIMBER, sx1 - 0.07, 2.56, sz0 - 0.1, sx1 + 0.07, 2.7, sz1 + 0.1)
    p.box('flat:#6f6657', x0 + 0.1, 0.02, sz0, sx1, 0.1, sz1)
    for i in range(2):
        for k in range(4):
            cx, cz = x0 + 1.05 + i * 1.5, sz0 + 1.2 + k * 2.3
            p.cyl('flat:#5a4a3a', (cx, 0.2, cz), 1, 0.52, 0.22, seg=14)
            p.cyl('flat:#10162a', (cx, 0.3, cz), 1, 0.44, 0.03, seg=14)
            if (i + k) % 3 == 0:
                p.cyl('flat:#5b6fa6', (cx + 0.1, 0.32, cz - 0.05), 1, 0.2, 0.02, seg=10)
            if (i * 4 + k) % 4 == 1:
                p.cyl(TIMBER_LT, (cx, 0.36, cz), 1, 0.5, 0.05, seg=14)
    p.cyl(TIMBER_LT, (sx1 - 0.3, 1.0, sz1 - 0.4), 1, 0.03, 2.0, seg=6)
    p.box('light', sx1 - 1.5, 2.5, (sz0 + sz1) / 2 - 0.15, sx1 - 1.2, 2.56, (sz0 + sz1) / 2 + 0.15)
    # The well and the rinsing trough by the +x fence, past the passage's mouth.
    wx, wz = x1 - 1.3, 9.2
    mark('_well', wx, 1.0, wz, 1.8, 1.4)
    p.cyl(STONE_G, (wx, 0.4, wz), 1, 0.6, 0.8, seg=12)
    p.cyl('flat:#1b2530', (wx, 0.8, wz), 1, 0.48, 0.02, seg=12)
    for o in (-1, 1):
        p.box(TIMBER, wx + o * 0.7 - 0.05, 0, wz - 0.05, wx + o * 0.7 + 0.05, 2.1, wz + 0.05)
    p.box(TIMBER, wx - 0.8, 2.05, wz - 0.05, wx + 0.8, 2.15, wz + 0.05)
    p.prism(TILE, [(wz - 0.7, 2.15), (wz + 0.7, 2.15), (wz, 2.55)], 'x', wx - 0.9, wx + 0.9)
    mark('_trough', x1 - 1.2, 0.3, 6.1, 1.4, 3.4)
    p.box(STONE_G, x1 - 1.9, 0, 4.4, x1 - 0.5, 0.55, 7.8)
    p.box('flat:#3a5a7a', x1 - 1.78, 0.45, 4.52, x1 - 0.62, 0.5, 7.68)
    for k in range(3):
        p.cyl(TIMBER_LT, (x1 - 2.3, 0.2, 4.8 + k * 0.5), 1, 0.17, 0.4, seg=8)
    # The drying poles: pairs across the yard with a crossbar high up, lengths hanging from the bar.
    mark('_poles', 0, 3.5, 15.5, 6.4, 11)
    k = 0
    for z in (11.5, 14.2, 16.9, 19.6):
        for xx in (-3.2, 3.2):
            p.cyl(TIMBER_LT, (xx, 3.6, z), 1, 0.08, 7.2, seg=8)
            p.box(STONE_GD, xx - 0.2, 0, z - 0.2, xx + 0.2, 0.2, z + 0.2)
        p.cyl(TIMBER_LT, (0, 7.0, z), 0, 0.045, 7.4, seg=6)
        p.cyl(TIMBER_LT, (0, 4.6, z), 0, 0.045, 6.8, seg=6)
        xx = -2.8
        while xx < 2.9:
            if r.random() < 0.85:
                cloth_drop(p, xx, 7.0, z, 0.38, 3.4 + r.random() * 2.6, k)
            k += 1
            xx += 0.52
    # Two lengths stretched low down the middle between end posts (shinshi-bari), their bamboo stretchers.
    for xx, kk in ((-0.9, 3), (1.6, 1)):
        for z in (0.8, 10.4):
            p.box(TIMBER, xx - 0.05, 0, z - 0.05, xx + 0.05, 1.3, z + 0.05)
        quad2(p, 'flat:' + SHADES[kk], [(xx - 0.19, 1.2, 1.0), (xx + 0.19, 1.2, 1.0), (xx + 0.19, 1.12, 10.2), (xx - 0.19, 1.12, 10.2)], (0, 1, 0))
        z = 1.4
        while z < 10.0:
            p.box('flat:#c9b98a', xx - 0.22, 1.1, z, xx + 0.22, 1.115, z + 0.012)
            z += 0.45
    # Buckets, a handcart of bolts.
    p.box(TIMBER_LT, -4.6, 0.35, 12.0, -3.8, 0.42, 13.6)
    for zz in (12.2, 13.4):
        p.cyl(IRON, (-4.2, 0.3, zz), 0, 0.3, 0.06, seg=10)
    for k in range(5):
        p.cyl('flat:' + SHADES[(k + 2) % len(SHADES)], (-4.2, 0.55, 12.25 + k * 0.28), 0, 0.12, 0.7, seg=8)


# ── The cotton wholesalers' storehouses ──────────────────────────────────────────────────────

def kura_row(p, s, v, r):
    """Three plastered storehouses, gables to the street: namako tiling below, heavy doors under a
    pent roof, an iron-shuttered window in the gable. The third is open as a small museum."""
    w, d = v['w'], v['d']
    n = 3
    kw = (w - 0.3 * (n - 1)) / n
    for k in range(n):
        a = -w / 2 + k * (kw + 0.3)
        e = a + kw
        c = (a + e) / 2
        h = 5.6 + (k % 2) * 0.5
        p.box(PLASTER, a, 0, 0, e, h, d)
        p.box(STONE_GD, a - 0.04, 0, -0.04, e + 0.04, 0.35, d + 0.04)
        p.box('flat:#34373c', a - 0.02, 0.35, -0.02, e + 0.02, 1.7, d + 0.02)
        y = 0.35
        while y < 1.7:
            p.box(PLASTER, a - 0.035, y, -0.035, e + 0.035, y + 0.05, d + 0.035)
            y += 0.34
        xx = a + 0.3
        while xx < e:
            p.box(PLASTER, xx, 0.35, -0.035, xx + 0.05, 1.7, -0.02)
            xx += 0.36
        roof_z(p, a, e, 0, d, h, 1.5, ov=0.35)
        p.prism(PLASTER, [(a, h), (e, h), (c, h + 1.45)], 'z', -0.02, 0.05)
        # Doors: thick plastered leaves folded open either side of a boarded or glazed doorway.
        p.box(PLASTER_DK, c - 1.0, 0.35, -0.1, c + 1.0, 2.55, 0)
        if k == n - 1:
            quad(p, 'windowDim', 'f', c - 0.7, c + 0.7, 0.4, 2.3, -0.11, col=WARM)
            p.box(TIMBER, c - 0.03, 0.4, -0.13, c + 0.03, 2.3, -0.11)
        else:
            p.box('flat:#3a2a1e', c - 0.7, 0.4, -0.12, c + 0.7, 2.3, -0.1)
            for y in (0.9, 1.6):
                p.box(IRON, c - 0.7, y, -0.14, c + 0.7, y + 0.06, -0.12)
        for o in (-1, 1):
            p.box('flat:#2f3236', c + o * 0.75, 0.4, -0.3, c + o * 0.95, 2.3, -0.1)
        pent(p, c - 1.3, c + 1.3, 0.0, 3.2, out=0.8, drop=0.35)
        p.box(PLASTER_DK, c - 0.6, 3.7, -0.08, c + 0.6, 4.8, 0)
        p.box('flat:#1c1d1f', c - 0.4, 3.82, -0.1, c + 0.4, 4.68, -0.08)
        for o in (-1, 1):
            p.box('flat:#2f3236', c + o * 0.45, 3.8, -0.17, c + o * 0.8, 4.7, -0.09)
        board(p, 'name%d' % k, 'f', c - 0.2, c + 0.2, 2.65, 3.6 if False else 2.66, 0, 'flat:#f1ead8', 0.01)
        board(p, 'plate%d' % k, 'f', a + 0.15, a + 0.5, 0.9, 2.2, -0.02, 'flat:#f1ead8', 0.05)
        # The house's mark in a ring up in the gable.
        p.cyl('flat:#1d2c50', (c, h + 0.55, -0.03), 2, 0.34, 0.02, seg=16)
        p.cyl(PLASTER, (c, h + 0.55, -0.045), 2, 0.25, 0.02, seg=16)
    pots(p, -w / 2 + 0.4, -0.35, r, 3)


# ── The dyers' shrine and the lane Jizō ─────────────────────────────────────────────────────

def shrine(p, s, v, r):
    """A small Inari shrine in its precinct: a stone fence along the lane, a vermilion torii, a
    paved path between stone lanterns and foxes, a water basin, a rack hung with indigo votive
    cloths, the little hall on its stone base."""
    w, d = v['w'], v['d']
    x0, x1 = -w / 2, w / 2
    p.box('flat:#a09a8c', x0, 0, 0, x1, 0.02, d)
    p.box(STONE_G, -0.9, 0.02, 0, 0.9, 0.04, d - 4.6)
    # Stone fence (tamagaki) with the gap at the torii; board fences round the rest.
    for a, e in ((x0, -1.9), (1.9, x1)):
        p.box(STONE_GD, a, 0, -0.1, e, 0.35, 0.2)
        xx = a + 0.12
        while xx < e - 0.1:
            p.box(STONE_G, xx, 0.35, -0.03, xx + 0.16, 1.15, 0.13)
            xx += 0.3
        p.box(STONE_G, a, 0.9, 0.0, e, 0.98, 0.1)
    for xe, o in ((x0, 1), (x1, -1)):
        p.box(YAKI, min(xe, xe + o * 0.1), 0, 0.2, max(xe, xe + o * 0.1), 1.9, d)
    p.box(YAKI, x0, 0, d - 0.1, x1, 1.9, d)
    # Torii: two round posts, the tie beam, the top lintels, the tablet.
    for o in (-1, 1):
        p.cyl(VERM, (o * 1.5, 1.75, 1.0), 1, 0.14, 3.5, seg=12)
        p.cyl('flat:#1c1d1f', (o * 1.5, 0.2, 1.0), 1, 0.18, 0.4, seg=12)
    p.box(VERM, -1.85, 2.7, 0.92, 1.85, 2.88, 1.08)
    p.box(VERM, -2.2, 3.45, 0.88, 2.2, 3.66, 1.12)
    p.box('flat:#1c1d1f', -2.35, 3.66, 0.84, 2.35, 3.8, 1.16)
    board(p, 'name', 'f', -0.3, 0.3, 2.9, 3.43, 0.9, 'flat:#2a2019', 0.03)
    board(p, 'post', 'f', -2.45, -2.05, 0.4, 1.9, -0.1, 'flat:#b9b3a4', 0.02)
    # Stone lanterns, foxes on plinths.
    for o in (-1, 1):
        lx, lz = o * 1.7, 3.6
        p.box(STONE_GD, lx - 0.3, 0, lz - 0.3, lx + 0.3, 0.2, lz + 0.3)
        p.cyl(STONE_G, (lx, 0.75, lz), 1, 0.11, 1.1, seg=8)
        p.box(STONE_G, lx - 0.26, 1.3, lz - 0.26, lx + 0.26, 1.4, lz + 0.26)
        p.box('light', lx - 0.15, 1.4, lz - 0.15, lx + 0.15, 1.7, lz + 0.15)
        for q in (-1, 1):
            p.box(STONE_G, lx + q * 0.17 - 0.03, 1.4, lz - 0.2, lx + q * 0.17 + 0.03, 1.7, lz + 0.2)
        p.box(STONE_GD, lx - 0.34, 1.7, lz - 0.34, lx + 0.34, 1.82, lz + 0.34)
        p.cyl(STONE_G, (lx, 1.95, lz), 1, 0.09, 0.2, seg=6)
        fx, fz = o * 1.5, 7.2
        p.box(STONE_GD, fx - 0.3, 0, fz - 0.45, fx + 0.3, 0.7, fz + 0.45)
        p.box('flat:#e9e6de', fx - 0.14, 0.7, fz - 0.25, fx + 0.14, 1.15, fz + 0.2)
        p.box('flat:#e9e6de', fx - 0.11, 1.15, fz - 0.33, fx + 0.11, 1.45, fz - 0.08)
        p.box(VERM, fx - 0.15, 1.05, fz - 0.27, fx + 0.15, 1.15, fz - 0.05)
    # The water basin under its little roof.
    bx, bz = x0 + 2.0, 4.6
    p.box(STONE_G, bx - 0.6, 0, bz - 0.4, bx + 0.6, 0.6, bz + 0.4)
    p.box('flat:#3a5a7a', bx - 0.48, 0.52, bz - 0.28, bx + 0.48, 0.56, bz + 0.28)
    for ox in (-0.75, 0.75):
        for oz in (-0.55, 0.55):
            p.box(TIMBER, bx + ox - 0.05, 0, bz + oz - 0.05, bx + ox + 0.05, 1.9, bz + oz + 0.05)
    roof_x(p, bx - 0.95, bx + 0.95, bz - 0.7, bz + 0.7, 1.9, 0.5, ov=0.2)
    # The rack of votive cloths: indigo strips knotted on three rails.
    rx, rz = x1 - 1.0, 6.0
    mark('_rack', rx, 1.0, rz, 0.3, 4.0)
    for zz in (rz - 2.0, rz + 2.0):
        p.box(TIMBER, rx - 0.05, 0, zz - 0.05, rx + 0.05, 2.1, zz + 0.05)
    k = 0
    for y in (1.0, 1.5, 2.0):
        p.box(TIMBER, rx - 0.03, y, rz - 2.0, rx + 0.03, y + 0.05, rz + 2.0)
        zz = rz - 1.85
        while zz < rz + 1.85:
            cloth_drop(p, rx - 0.04, y, zz, 0.1, 0.3 + r.random() * 0.14, k, along='z')
            k += 1
            zz += 0.14
    p.prism(TILE, [(rx - 0.35, 2.1), (rx + 0.35, 2.1), (rx, 2.35)], 'z', rz - 2.2, rz + 2.2)
    # The hall: stone base and steps, vermilion posts, white walls, a copper-green roof, the offering box.
    hz = d - 4.4
    mark('_hall', 0, 1.5, hz + 1.9, 3.4, 3.4)
    p.box(STONE_GD, -1.9, 0, hz, 1.9, 0.6, hz + 3.6)
    for k in range(3):
        p.box(STONE_G, -1.0, 0, hz - 0.3 * (3 - k), 1.0, 0.2 * (k + 1), hz - 0.3 * (2 - k))
    p.box('flat:#f1ede2', -1.3, 0.6, hz + 1.1, 1.3, 2.7, hz + 3.3)
    for ox in (-1.35, 1.35):
        for oz in (0.25, 1.1, 3.3):
            p.box(VERM, ox - 0.08, 0.6, hz + oz - 0.08, ox + 0.08, 2.7, hz + oz + 0.08)
    p.box(VERM, -1.45, 2.55, hz + 0.17, 1.45, 2.75, hz + 3.4)
    quad(p, 'windowDim', 'f', -0.7, 0.7, 0.75, 2.3, hz + 1.08, col=WARM)
    koshi(p, -0.7, 0.7, 0.75, 2.3, hz + 1.07, step=0.14, mat=VERM, back=None)
    roof_x(p, -1.9, 1.9, hz - 0.1, hz + 3.7, 2.75, 1.5, ov=0.45, mat='flat:#4f7f72')
    p.box(TIMBER, -0.45, 0.6, hz + 0.3, 0.45, 1.05, hz + 0.8)
    p.cyl('flat:#b08d3a', (0, 2.45, hz + 0.5), 1, 0.12, 0.2, seg=8)
    quad2(p, 'flat:#b9382b', [(-0.04, 2.35, hz + 0.5), (0.04, 2.35, hz + 0.5), (0.04, 1.2, hz + 0.5), (-0.04, 1.2, hz + 0.5)], (0, 0, -1))
    # Small red torii donated in a row by the path, nobori poles.
    for k in range(3):
        zz = 9.0 + k * 0.5 if d > 13 else 8.0
        _ = zz
    for o in (-1, 1):
        p.cyl('flat:#d8d4c8', (o * 2.6, 1.9, 1.6), 1, 0.03, 3.8, seg=6)
        quad2(p, VERM if o < 0 else CREAM, [(o * 2.6, 3.7, 1.63), (o * 2.6, 3.7, 2.13), (o * 2.6, 1.3, 2.13), (o * 2.6, 1.3, 1.63)], (1, 0, 0))


def jizo(p, s, v, r):
    """A lane Jizō: a stone step, a little wooden shrine box with a tiled roof, the statue in its red bib, flowers."""
    p.box(STONE_GD, -0.6, 0, 0, 0.6, 0.35, 0.8)
    p.box(TIMBER, -0.5, 0.35, 0.15, 0.5, 1.45, 0.8)
    p.box('flat:#1c1a17', -0.4, 0.45, 0.13, 0.4, 1.35, 0.16)
    p.box(STONE_G, -0.13, 0.45, 0.28, 0.13, 0.95, 0.5)
    p.cyl(STONE_G, (0, 1.06, 0.39), 1, 0.12, 0.22, seg=8)
    p.box(VERM, -0.15, 0.78, 0.25, 0.15, 0.96, 0.29)
    for o in (-1, 1):
        p.box(TIMBER, o * 0.5 - 0.04, 0.35, 0.05, o * 0.5 + 0.04, 1.45, 0.13)
        p.cyl('flat:#6f8f9c', (o * 0.3, 0.52, 0.2), 1, 0.04, 0.14, seg=6)
        p.cyl('flat:#d9b23a' if o > 0 else 'flat:#c66a8a', (o * 0.3, 0.68, 0.2), 1, 0.07, 0.12, seg=6)
    roof_x(p, -0.62, 0.62, 0.0, 0.85, 1.45, 0.32, ov=0.12)
    p.box('light', -0.06, 1.2, 0.2, 0.06, 1.3, 0.3)


# ── Row houses for the lanes ─────────────────────────────────────────────────────────────────

NAGAYA_WALLS = ['flat:#b9b3a4', 'flat:#c9bfa6', 'flat:#8f8a7c', 'flat:#3a342e', 'flat:#a39a84']
DOOR_COLS = ['flat:#5a4030', 'flat:#3a4a55', 'flat:#6b2f2a', 'flat:#3f4a3a', 'flat:#2a2622']


def nagaya(p, s, v, r):
    """A pre-war row of houses under one roof: each a door and a latticed window below, a railed
    window above, with pots, a letter box and an air conditioner; some are now small shops."""
    w, d = v['w'], v['d']
    n = v['n']
    uw = w / n
    x0 = -w / 2
    g, e2, rise = 2.7, 5.3, 1.7
    shops = v.get('shops', {})
    p.box(STONE_GD, x0, 0, -0.03, x0 + w, 0.18, d)
    for k in range(n):
        a, e = x0 + k * uw, x0 + (k + 1) * uw
        wall = NAGAYA_WALLS[(k + v['seed']) % len(NAGAYA_WALLS)]
        p.box(wall, a, 0.18, 0, e, e2, d)
        p.box(TIMBER, a - 0.05, 0.18, -0.06, a + 0.05, e2, 0.02)
        kind = shops.get(k)
        if kind:
            # A converted house: a glazed front, a board, an A-board's worth of light.
            quad(p, 'windowDim', 'f', a + 0.25, e - 0.25, 0.3, 2.3, -0.02, col=WARM)
            p.box(TIMBER_LT if kind == 'cafe' else 'flat:#e9e2d2', a + 0.2, 0.18, -0.05, e - 0.2, 0.32, 0)
            for xm in (a + uw * 0.42, a + uw * 0.7):
                p.box(TIMBER, xm - 0.025, 0.3, -0.05, xm + 0.025, 2.3, -0.02)
            p.box(TIMBER, a + 0.2, 2.3, -0.06, e - 0.2, 2.42, 0)
            board(p, 'name%d' % k, 'f', a + 0.5, e - 0.5, 2.48, 2.92, -0.02, 'flat:#f1ead8' if kind == 'cafe' else 'flat:#2a2019', 0.05)
            if kind == 'cafe':
                noren(p, a + 0.4, a + uw * 0.42 - 0.05, 2.28, 0.45, -0.12, 'flat:#7a5a3a', 2)
            lantern_box(p, e - 0.3, 1.5, -0.2, 0.2, 0.36)
        else:
            dx = a + 0.3 if k % 2 == 0 else e - 1.15
            p.box(DOOR_COLS[(k * 3 + v['seed']) % len(DOOR_COLS)], dx, 0.18, -0.04, dx + 0.85, 2.05, 0)
            p.box('flat:#cfd3cf', dx + 0.12, 1.0, -0.05, dx + 0.73, 1.85, -0.04)
            wa, we = (dx + 1.1, e - 0.3) if k % 2 == 0 else (a + 0.3, dx - 0.25)
            p.box(wall, wa - 0.05, 0.85, -0.25, we + 0.05, 0.95, 0)
            koshi(p, wa, we, 0.95, 2.1, -0.18, step=0.15, back='lit' if (k + v['seed']) % 3 == 0 else PAPER)
            p.box(TIMBER, wa - 0.05, 2.1, -0.25, we + 0.05, 2.2, 0)
            # A red letter box, the meter, the house's plate.
            p.box('flat:#b9382b' if k % 3 else 'flat:#5f6266', dx + (0.95 if k % 2 == 0 else -0.3), 1.1, -0.1, dx + (1.2 if k % 2 == 0 else -0.05), 1.42, 0)
            pots(p, wa + 0.1, -0.3, r, 2 + (k + v['seed']) % 3)
        # Upper floor: a window with a timber rail, laundry poles on some, an air conditioner on others.
        ua, ue = a + 0.5, e - 0.5
        quad(p, WINDOW, 'f', ua, ue, g + 0.95, e2 - 0.55, -0.01)
        p.box(TIMBER, ua - 0.06, g + 0.85, -0.04, ue + 0.06, g + 0.95, 0)
        p.box(TIMBER, (ua + ue) / 2 - 0.03, g + 0.95, -0.03, (ua + ue) / 2 + 0.03, e2 - 0.55, -0.01)
        p.box(TIMBER, ua - 0.1, g + 1.35, -0.34, ue + 0.1, g + 1.41, -0.28)
        xx = ua - 0.1
        while xx < ue + 0.1:
            p.box(TIMBER, xx, g + 0.75, -0.34, xx + 0.04, g + 1.35, -0.3)
            xx += 0.22
        p.box(TIMBER, ua - 0.1, g + 0.72, -0.36, ue + 0.1, g + 0.78, 0)
        if (k + v['seed']) % 3 == 1:
            p.cyl('flat:#c9c8c0', ((ua + ue) / 2, e2 - 0.4, -0.5), 0, 0.02, ue - ua, seg=6)
            for j in range(3):
                cc = ['flat:#e9e6de', 'flat:#8fa8ca', 'flat:#d9c2a0'][j]
                quad2(p, cc, [(ua + 0.2 + j * 0.6, e2 - 0.42, -0.5), (ua + 0.65 + j * 0.6, e2 - 0.42, -0.5), (ua + 0.65 + j * 0.6, e2 - 1.1, -0.5), (ua + 0.2 + j * 0.6, e2 - 1.1, -0.5)], (0, 0, -1))
        elif (k + v['seed']) % 3 == 2:
            wall_ac(p, 'z', 0, -1, g + 0.05, e - 0.6)
    p.box(TIMBER, x0 + w - 0.05, 0.18, -0.06, x0 + w + 0.05, e2, 0.02)
    pent(p, x0 - 0.1, x0 + w + 0.1, 0.0, g + 0.6, out=0.9, drop=0.38)
    roof_x(p, x0 - 0.1, x0 + w + 0.1, 0, d, e2, rise, ov=0.5)
    for xe, o in ((x0, -1), (x0 + w, 1)):
        p.prism(MORTAR, [(0, e2), (d, e2), (d / 2, e2 + rise)], 'x', xe - 0.02 * o, xe)
    backs(p, w, d, [g, e2], r, sides=(-1, 1), back=True)


def mise(p, s, v, r):
    """Two tiny lane shops under one tiled roof: an open counter each, short noren, a lantern."""
    w, d = v['w'], v['d']
    x0 = -w / 2
    g, rise = 3.0, 1.2
    p.box(STONE_GD, x0, 0, -0.03, x0 + w, 0.15, d)
    p.box(YAKI, x0, 0.15, 0.9, x0 + w, g, d)
    cols = v['cols']
    for k in range(2):
        a, e = x0 + k * w / 2, x0 + (k + 1) * w / 2
        for cx in (a + 0.08, e - 0.08):
            p.box(TIMBER, cx - 0.08, 0.15, -0.04, cx + 0.08, g, 0.9)
        p.box(TIMBER_LT, a + 0.2, 0.15, 0.2, e - 1.2, 1.0, 0.75)
        p.box(TIMBER, a + 0.15, 1.0, 0.1, e - 1.15, 1.06, 0.85)
        quad(p, 'windowDim', 'f', a + 0.16, e - 0.16, 0.2, 2.4, 0.88, col=WARM)
        p.box('light', a + 0.4, 2.4, 0.3, e - 0.4, 2.45, 0.5)
        p.box(TIMBER, a, 2.4, -0.06, e, 2.6, 0.0)
        noren(p, a + 0.2, e - 0.2, 2.38, 0.5, -0.1, 'flat:' + cols[k], 4)
        board(p, 'name%d' % k, 'f', a + 0.5, e - 0.5, 2.68, 3.1, -0.02, 'flat:#f1ead8' if k else 'flat:#2a2019', 0.05)
        for j in range(3):
            p.cyl(['flat:#a85f3c', 'flat:#e9e2d2', 'flat:#3f5a78'][j], (a + 0.5 + j * 0.4, 1.14, 0.45), 1, 0.09, 0.16, seg=8)
        lantern_box(p, e - 0.25, 1.6, -0.15, 0.22, 0.42)
    roof_x(p, x0 - 0.1, x0 + w + 0.1, 0, d, g, rise, ov=0.6)
    for xe, o in ((x0, -1), (x0 + w, 1)):
        p.prism(YAKI, [(0, g), (d, g), (d / 2, g + rise)], 'x', xe - 0.02 * o, xe)
    backs(p, w, d, [g], r, sides=(), back=True)


# ── The lane gate, cloth across the street, the stream ───────────────────────────────────────

def gate(p, s, v, r):
    """The gate of the noren lane: two posts, a tiled beam, a long noren hung clear of heads, lanterns."""
    hw = v['w'] / 2 - 0.2
    for o in (-1, 1):
        p.box(STONE_GD, o * hw - 0.22, 0, -0.22, o * hw + 0.22, 0.3, 0.22)
        p.box(TIMBER, o * hw - 0.14, 0.3, -0.14, o * hw + 0.14, 4.0, 0.14)
        p.box(TIMBER, o * hw - 0.04, 2.9, -0.5, o * hw + 0.04, 2.96, -0.14)
        lantern_box(p, o * hw, 2.35, -0.45, 0.3, 0.55)
    p.box(TIMBER, -hw - 0.5, 3.55, -0.12, hw + 0.5, 3.8, 0.12)
    p.box(TIMBER, -hw - 0.3, 3.05, -0.08, hw + 0.3, 3.2, 0.08)
    roof_x(p, -hw - 0.7, hw + 0.7, -0.5, 0.5, 4.0, 0.45, ov=0.15)
    noren(p, -hw + 0.2, hw - 0.2, 3.03, 0.8, 0.0, INDIGO, 4, crest=True)
    board(p, 'name', 'f', -1.0, 1.0, 3.24, 3.52, -0.1, 'flat:#f1ead8', 0.04)
    board(p, 'back', 'b', -1.0, 1.0, 3.24, 3.52, 0.1, 'flat:#f1ead8', 0.04)


def cloths(p, s, v, r):
    """Dyed lengths drying across the street: a bamboo pole from eave to eave, the cloth hanging from it."""
    hw = v['w'] / 2
    y = v.get('y', 4.9)
    p.cyl('flat:#b9a970', (0, y, 0), 0, 0.03, 2 * hw, seg=6)
    n = v['n']
    for k in range(n):
        x = -hw + 1.5 + k * (2 * hw - 3.0) / (n - 1)
        cloth_drop(p, x, y, 0, 0.38, v['len'][k % len(v['len'])], v['seed'] + k * 2)


def stream(p, s, v, r):
    """One length of the rinsing stream beside the street: coursed stone walls, a kerb and a low
    kerb on the street side (z < 0; the rail is its own piece), mossy stones and reeds in the bed. The game adds the water."""
    hw = v['w'] / 2
    p.box(STONE_GD, -hw, ST_BED - 0.1, 0, hw, ST_BED, ST_W)
    for z, o in ((0.0, 1), (ST_W, -1)):
        y = ST_BED
        k = 0
        while y < -0.01:
            p.box(STONE_G if k % 2 else STONE_GD, -hw, y, min(z, z + o * (0.12 if k % 2 else 0.1)), hw, min(0.0, y + 0.3), max(z, z + o * (0.12 if k % 2 else 0.1)))
            y += 0.3
            k += 1
    p.box(STONE_G, -hw, 0.0, -0.22, hw, 0.14, 0.02)
    p.box(STONE_G, -hw, 0.0, ST_W - 0.02, hw, 0.1, ST_W + 0.14)
    for k in range(4):
        x = -hw + 0.6 + r.random() * (2 * hw - 1.2)
        z = 0.25 + r.random() * (ST_W - 0.5)
        p.cyl(STONE_G if k % 2 else MOSS, (x, ST_BED + 0.08, z), 1, 0.16 + r.random() * 0.1, 0.16, seg=7)
    for k in range(3):
        x = -hw + 0.4 + r.random() * (2 * hw - 0.8)
        for j in range(3):
            p.box(MOSS, x + j * 0.06, ST_BED, ST_W - 0.2 - j * 0.03, x + j * 0.06 + 0.02, ST_BED + 0.7 + r.random() * 0.3, ST_W - 0.18 - j * 0.03)


def rail(p, s, v, r):
    """Two metres of the low timber rail along the stream's kerb: posts and one bar."""
    for x in (-0.5, 0.5):
        p.box(TIMBER, x - 0.05, 0.14, -0.05, x + 0.05, 0.7, 0.05)
    p.box(TIMBER, -1.0, 0.56, -0.03, 1.0, 0.63, 0.03)


STYLES = {'rail': rail, 'machiya': machiya, 'ekisha': ekisha, 'works': works, 'yard': yard, 'kura': kura_row, 'shrine': shrine, 'jizo': jizo,
          'nagaya': nagaya, 'mise': mise, 'gate': gate, 'cloths': cloths, 'stream': stream}

VARIANTS = [
    dict(id='ekisha', style='ekisha', w=EK_W, d=EK_D, h=11.0, seed=1),
    dict(id='machiya_a', style='machiya', w=11.0, d=D_MACHI, h=7.6, seed=3, degoshi=1, noren='#24407a'),
    dict(id='machiya_b', style='machiya', w=9.0, d=D_MACHI, h=7.4, seed=4, upper='timber', eave=5.5, rise=2.0, noren='#1d2c50'),
    dict(id='machiya_c', style='machiya', w=7.5, d=D_MACHI, h=7.4, seed=5, door=1, noren='#f1ead8'),
    dict(id='machiya_d', style='machiya', w=10.0, d=D_MACHI, h=7.9, seed=6, upper='timber', eave=5.8, rise=2.2, degoshi=4, door=1, noren='#5574a8'),
    dict(id='machiya_e', style='machiya', w=12.5, d=D_MACHI, h=7.6, seed=7, degoshi=0, noren='#7a1f2b'),
    dict(id='machiya_f', style='machiya', w=6.0, d=D_MACHI, h=7.0, seed=8, door=0, eave=4.9, rise=2.0, noren='#2f4a82'),
    dict(id='works', style='works', w=12.0, d=10.0, h=7.6, seed=9),
    dict(id='yard', style='yard', w=YARD_W, d=YARD_D, h=7.3, seed=10),
    dict(id='kura', style='kura', w=12.6, d=8.0, h=7.6, seed=11),
    dict(id='shrine', style='shrine', w=14.0, d=15.0, h=4.5, seed=12),
    dict(id='jizo', style='jizo', w=1.4, d=0.9, h=1.8, seed=13),
    dict(id='nagaya_a', style='nagaya', w=14.4, d=D_NAGAYA, h=7.0, n=4, seed=14),
    dict(id='nagaya_b', style='nagaya', w=10.8, d=D_NAGAYA, h=7.0, n=3, seed=15, shops={1: 'zakka'}),
    dict(id='nagaya_c', style='nagaya', w=18.0, d=D_NAGAYA, h=7.0, n=5, seed=16, shops={0: 'cafe', 3: 'zakka'}),
    dict(id='nagaya_d', style='nagaya', w=7.2, d=D_NAGAYA, h=7.0, n=2, seed=17),
    dict(id='nagaya_e', style='nagaya', w=12.0, d=D_NAGAYA, h=7.0, n=3, seed=18, shops={2: 'cafe'}),
    dict(id='mise_a', style='mise', w=7.2, d=5.5, h=4.3, seed=19, cols=['#24407a', '#7a1f2b']),
    dict(id='mise_b', style='mise', w=7.2, d=5.5, h=4.3, seed=20, cols=['#f1ead8', '#2f4a2c']),
    dict(id='mise_c', style='mise', w=6.0, d=5.5, h=4.3, seed=21, cols=['#1d2c50', '#b35a1c']),
    dict(id='gate', style='gate', w=3.4, d=0.6, h=4.6, seed=22),
    dict(id='cloths_a', style='cloths', w=6.8, d=0.1, h=5.0, seed=0, n=7, len=[1.8, 2.4, 1.5, 2.1, 2.6]),
    dict(id='cloths_b', style='cloths', w=6.8, d=0.1, h=5.0, seed=3, n=6, len=[2.5, 1.7, 2.2, 1.4]),
    dict(id='cloths_c', style='cloths', w=5.0, d=0.1, h=5.0, seed=1, n=4, len=[1.6, 2.0, 1.4]),
    dict(id='rail', style='rail', w=2.0, d=0.1, h=0.7, seed=2),
    dict(id='stream', style='stream', w=6.0, d=ST_W, h=0.7, seed=23),
    dict(id='stream_b', style='stream', w=6.0, d=ST_W, h=0.7, seed=24),
]
for _v in VARIANTS:
    _v['gap'] = 6.0


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(v['seed'] * 131 + 7)
    STYLES[v['style']](body, signs, v, r)
    return body, signs


if __name__ == '__main__':
    run('aizome', VARIANTS, build_hi, lambda v: None)
    write_anchors('aizome')
