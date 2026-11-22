# Builds the buildings fronting Tsumugibashi's main streets (the Senba / Kitahama-style rebuild,
# 2026-11): 1920s stone banks and exchange houses with giant columns, 1930s tapestry-brick
# "buildings" (ビルヂング), 1960s trading-company offices with ribbon windows, textile halls with
# fins and a roof sign, kimono houses with a tiled pent roof, a business hotel, glass towers set
# back above the 31 m line, and the canal-backed buildings of the east bank (finished on both
# faces; the game hangs terraces off their backs).
#
#   blender --background --python tools/blender/build_tsumugifront.py -- [--renders <dir>]
#
# Writes assets/buildings/tsumugifront.blend, public/models/buildings/tsumugifront.glb and
# src/stations/anchors/tsumugifront.ts. Frame and helpers: buildkit.py, kitakit.py.
# Nothing here carries a name: 'name', 'roof' and 'vertical' are boards the game letters.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

LINE = 31.0  # the old height line along the boulevards

# A canal-backed building's back is its canal face (canal_back), not a service yard.
_service_back = service_back
NO_BACK = [False]


def service_back(p, x0, x1, z, h, r):  # noqa: F811
    if not NO_BACK[0]:
        _service_back(p, x0, x1, z, h, r)


def ob(p, mat, x0, y0, z0, x1, y1, z1, o=0.04):
    """A band or plinth round a block: stands `o` proud of its sides and back, so no face shares a plane."""
    p.box(mat, x0 - o, y0, z0, x1 + o, y1, z1 + o)


PLASTER = 'flat:#e9e2d2'
ROOFTILE = 'flat:#3b3f45'
LATTICE = 'flat:#5a4030'
NOREN = ['#1f3f7a', '#7a1f2b', '#2b3a67', '#3f4a3a']


def ground_shops(p, s, x0, x1, h, r, door, d, wall=GRANITE):
    """A street storey of shops either side of an entrance: the shop glass set 0.3 m in, the storey's mass behind it."""
    p.box(wall, x0, 0, 0.3, x1, h, d)
    shopfronts(p, s, x0, x1, 0.3, h, r, 5.0, door, True)


def stone(p, s, v, r):
    """A 1920s bank or exchange house: a granite plinth, giant columns over two or three floors,
    an entablature with the name on its frieze, an attic storey and a deep cornice."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall, trim = v.get('wall', STONE), v.get('trim', STONE_DK)
    ent = h - 5.5
    p.box(wall, x0, 0, 0.9, x1, h, d)
    ob(p, GRANITE, x0, 0, 0.55, x1, 1.3, d, 0.06)
    n = max(3, round(w / 4.2))
    step = w / n
    # Giant order: columns standing proud of the wall, with bases and capitals.
    for k in range(1, n):
        cx = x0 + k * step
        p.cyl(wall, (cx, (1.3 + ent - 0.8) / 2, 0.45), 1, 0.48, ent - 0.8 - 1.3, seg=12)
        p.box(trim, cx - 0.65, 1.3, -0.2, cx + 0.65, 1.8, 1.0)
        p.box(trim, cx - 0.7, ent - 0.9, -0.25, cx + 0.7, ent - 0.4, 1.0)
    # Pilasters at the ends.
    for cx in (x0 + 0.5, x1 - 0.5):
        p.box(wall, cx - 0.5, 1.3, 0.0, cx + 0.5, ent - 0.4, 0.9)
    # Tall windows between the columns: two floors over a ground floor, the middle bay a door.
    mid = n // 2
    fl = (ent - 1.8) / 3
    for k in range(n):
        a, b_ = x0 + k * step + 0.9, x0 + (k + 1) * step - 0.9
        if k == mid:
            p.box(GRANITE, a - 0.2, 0, 0.6, b_ + 0.2, 4.6, 0.9)
            doors(p, (a + b_) / 2, 0, 0.6, min(3.2, b_ - a), 3.6, BRASS)
            p.box(BRASS, a, 4.0, 0.5, b_, 4.2, 0.9)
        else:
            # A shop or a bank's hall behind tall lit glass, its board over the window.
            quad(p, 'windowDim', 'f', a, b_, 1.35, 1.8 + fl - 1.4, 0.88, col=WARM if k % 2 else SHOP)
            fascia(s, a + 0.15, b_ - 0.15, 1.8 + fl - 1.3, 1.8 + fl - 0.7, 0.87, r=r)
        for f in (1, 2):
            y0 = 1.8 + f * fl
            quad(p, WINDOW, 'f', a + 0.2, b_ - 0.2, y0 + 0.4, y0 + fl - 0.4, 0.88)
            p.box(trim, a, y0 + 0.2, 0.7, b_, y0 + 0.35, 0.95)
    # Entablature, frieze with the name, cornice, attic with small windows, parapet.
    ob(p, trim, x0, ent - 0.4, -0.3, x1, ent, d)
    board(p, 'name', 'f', -min(6.5, w / 2 - 1.5), min(6.5, w / 2 - 1.5), ent + 0.15, ent + 1.25, -0.3, 'flat:#2a2622', 0.06)
    ob(p, trim, x0, ent + 1.6, -0.75, x1, ent + 2.1, d, 0.2)
    for c in rows(x0 + 1, x1 - 1, 2.6):
        quad(p, WINDOW, 'f', c - 0.6, c + 0.6, ent + 2.6, ent + 4.0, -0.02)
    ob(p, trim, x0, h - 0.5, -0.2, x1, h, d)
    for face, a0, a1, at in sides(x0, x1, 0.9, d, 'lr'):
        windows(p, face, a0 + 1.5, a1 - 1.5, at, 1.8, int((h - 3) / 3.8), 3.8, 3.0, 1.2, 2.0)
    service_back(p, x0, x1, d, h, r)
    plant(p, x0 + 0.4, x1 - 0.4, h, 1.0, d - 0.4, v['seed'])


def brick(p, s, v, r):
    """A 1930s office "building": tapestry brick between stone piers, arched openings on the
    street, a stone band at every floor line near the top, a cornice, a name plate over the door."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall, trim = v.get('wall', BRICK), v.get('trim', STONE_LT)
    p.box(wall, x0, 0, 0, x1, h, d)
    ob(p, GRANITE, x0, 0, -0.05, x1, 0.9, d, 0.06)
    n = max(2, round(w / 4.4))
    step = w / n
    mid = n // 2
    # Ground floor: round-arched openings, the middle one the door.
    for k in range(n):
        a, b_ = x0 + k * step + 0.7, x0 + (k + 1) * step - 0.7
        if k == mid:
            doors(p, (a + b_) / 2, 0, -0.01, min(2.6, b_ - a - 0.2), 3.0, BRASS)
            quad(p, 'windowDim', 'f', a, b_, 3.1, 3.9, -0.01, col=SHOP)
        else:
            quad(p, 'windowDim', 'f', a, b_, 0.9, 3.1, -0.01, col=WARM if k % 2 else SHOP)
            fascia(s, a + 0.1, b_ - 0.1, 3.15, 3.85, -0.02, r=r)
        arch(p, trim, 'f', a, b_, 3.9, 3.9 + (b_ - a) / 2, 5.2, 0, 0.35, 8, inner=False)
    ob(p, trim, x0, 5.2, -0.25, x1, 5.6, d)
    board(p, 'name', 'f', -min(3.2, w / 2 - 1), min(3.2, w / 2 - 1), 4.4, 5.05, -0.3, 'flat:#2a2622', 0.05) if n % 2 == 0 else \
        board(p, 'name', 'f', -min(3.2, w / 2 - 1), min(3.2, w / 2 - 1), 5.7, 6.3, -0.25, 'flat:#2a2622', 0.05)
    # Upper floors: windows in pairs between piers.
    floors = int((h - 6.8) / 3.6)
    windows(p, 'f', x0 + 0.6, x1 - 0.6, 0, 6.2, floors, 3.6, step / 2, 1.3, 2.1, 0.9, frame=trim)
    piers(p, trim, 'f', x0, x1, 0, 5.6, h - 1.6, step, 0.55, 0.22)
    for face, a0, a1, at in sides(x0, x1, 0, d, 'lr'):
        windows(p, face, a0 + 1.2, a1 - 1.2, at, 1.2, int((h - 2) / 3.6), 3.6, 3.2, 1.2, 2.0, 0.9, frame=trim)
    ob(p, trim, x0, h - 2.2, -0.15, x1, h - 1.8, d)
    ob(p, trim, x0, h - 0.6, -0.55, x1, h, d, 0.15)
    service_back(p, x0, x1, d, h, r)
    plant(p, x0, x1, h, 0, d, v['seed'])


def ribbon_office(p, s, v, r):
    """A 1960s trading company's office: shops along the street, ribbon windows between pale
    spandrels to the height line, a set-back penthouse with the company's name on a roof frame."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall, trim = v.get('wall', WHITE), v.get('trim', ALU_DK)
    ground_shops(p, s, x0, x1, 5.0, r, 0.0 if w < 16 else x1 - 4.0, d)
    p.box(wall, x0, 5.0, 0, x1, h, d)
    ribbon(p, x0, x1, 0, d, 5.6, h - 1.0, wall, 3.6, 1.7, 1.0, 4.5, 'flr', glass=WINDOW, body=False)
    band(p, trim, x0, x1, 0, d, 5.0, 5.4, 0.3)
    ob(p, trim, x0, h - 0.6, -0.15, x1, h, d)
    board(p, 'name', 'f', x0 + 1.0, x0 + 1.0 + min(9, w - 3), 5.45, 6.35, 0, 'flat:#f4f1e8', 0.12)
    service_back(p, x0, x1, d, 5.0, r)
    # Penthouse and roof sign.
    p.box(wall, x0 + 3, h, 4, x1 - 3, h + 3.6, d - 3)
    plant(p, x0, x1, h, 0, d, v['seed'])
    roof_frame(p, 'roof', x0 + 2, x1 - 2, h, 1.2, 4.0, 'flat:#f4f1e8')


def seni(p, s, v, r):
    """A textile hall of the 1950s: buff tile, deep vertical fins the full height, a canopy over
    the entrance, a tall roof frame for the hall's name."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall, fin = v.get('wall', TILE), v.get('trim', TILE_DK)
    ground_shops(p, s, x0, x1, 4.6, r, 0.0, d)
    p.box(wall, x0, 4.6, 0, x1, h, d)
    grid(p, x0, x1, 0, d, 4.6, h - 1.0, wall, 3.6, 1.6, 1.25, 2.3, 0.8, 'flr', body=False)
    fins(p, fin, x0, x1, 0, d, 4.6, h, 1.6, 0.18, 0.7, 'f')
    p.box(ALU_DK, -3.5, 3.4, -2.6, 3.5, 3.6, 0)
    p.box('light', -3.3, 3.36, -2.4, 3.3, 3.4, -0.2)
    board(p, 'name', 'f', -4.5, 4.5, 3.65, 4.45, -2.6, 'flat:#1f2023', 0.05)
    service_back(p, x0, x1, d, 4.6, r)
    plant(p, x0, x1, h, 0, d, v['seed'])
    roof_frame(p, 'roof', x0 + 1.5, x1 - 1.5, h, 1.2, 5.5, 'flat:#1f3f7a')


def tower(p, s, v, r):
    """A modern office: a stone-framed podium of glass to the 31 m line with a colonnade on the
    street, and a glass tower set back above it."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    frame, glass = v.get('wall', STONE_LT), v.get('glass', GLASS_BL)
    p.box(GRANITE, x0, 0, 2.0, x1, 7.0, d)
    for c in rows(x0 + 0.5, x1 - 0.5, 4.8):
        p.box(frame, c - 0.4, 0, 0, c + 0.4, 7.0, 0.8)
    quad(p, 'windowDim', 'f', x0 + 1, x1 - 1, 0.3, 6.2, 1.98, col=SHOP)
    doors(p, 0, 0, 1.98, 3.0, 3.0, ALU)
    ob(p, frame, x0, 7.0, 0, x1, 7.6, d)
    board(p, 'name', 'f', -min(5, w / 2 - 1.5), min(5, w / 2 - 1.5), 6.95, 7.55, -0.05, 'flat:#20262b', 0.05)
    curtain(p, x0, x1, 0, d, 7.6, LINE - 1.0, glass, frame, 4.0, 1.5, 1.2, 3)
    fins(p, frame, x0, x1, 0, d, 7.6, LINE - 1.0, 4.8, 0.6, 0.3, 'f')
    ob(p, frame, x0, LINE - 1.0, 0, x1, LINE, d)
    e = 4.0
    curtain(p, x0 + 1.5, x1 - 1.5, e, d - 1.0, LINE, h, glass, ALU, 4.0, 1.5, 1.0, 3)
    p.box(HEDGE, x0 + 0.5, LINE, 0.6, x1 - 0.5, LINE + 0.8, e - 0.4)
    band(p, frame, x0 + 1.5, x1 - 1.5, e, d - 1.0, h - 0.6, h, 0.2)
    service_back(p, x0, x1, d, 7.0, r)
    plant(p, x0 + 1.5, x1 - 1.5, h, e, d - 1.0, v['seed'])
    beacons(p, x0 + 1.5, x1 - 1.5, e, d - 1.0, h + 1.1)


def kimono(p, s, v, r):
    """A kimono house: a timber-latticed shop front under a tiled pent roof, the shop's noren,
    plastered upper floors with lattice windows, a board for the name along the eaves."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(PLASTER, x0, 0, 0, x1, h, d)
    ob(p, GRANITE, x0, 0, -0.05, x1, 0.4, d, 0.05)
    # The shop front: dark timber posts, lattice panels, the open bay with its noren.
    for c in rows(x0 + 0.2, x1 - 0.2, 1.8):
        p.box(LATTICE, c - 0.08, 0, -0.12, c + 0.08, 3.1, 0.0)
    quad(p, 'windowDim', 'f', x0 + 0.3, x1 - 0.3, 0.4, 2.9, -0.02, col=WARM)
    for k in range(int((w - 0.6) / 0.12)):
        xx = x0 + 0.3 + k * 0.12
        if abs(xx) < 1.6:
            continue
        p.box(LATTICE, xx, 0.5, -0.1, xx + 0.04, 2.9, -0.06)
    col = 'flat:' + r.choice(NOREN)
    for k in range(4):
        p.box(col, -1.5 + k * 0.76, 1.7, -0.25, -1.5 + k * 0.76 + 0.72, 2.85, -0.22)
    p.box(LATTICE, x0, 2.9, -0.3, x1, 3.1, 0.0)
    # The pent roof (hisashi), tiles over a timber fascia.
    p.prism(ROOFTILE, [(0.0, 3.9), (-1.4, 3.25), (-1.4, 3.1), (0.0, 3.75)], 'x', x0 - 0.1, x1 + 0.1)
    p.box(LATTICE, x0 - 0.1, 3.05, -1.45, x1 + 0.1, 3.15, -1.35)
    board(p, 'name', 'f', -min(4.0, w / 2 - 0.8), min(4.0, w / 2 - 0.8), 4.15, 5.05, 0, 'flat:#2a2019', 0.1)
    # Upper floors: lattice windows, a balcony rail.
    floors = int((h - 5.4) / 3.2)
    for f in range(floors):
        y = 5.4 + f * 3.2
        for c in rows(x0 + 0.8, x1 - 0.8, 2.6):
            quad(p, WINDOW, 'f', c - 0.9, c + 0.9, y + 0.7, y + 2.3, -0.01)
            for k in range(7):
                p.box(LATTICE, c - 0.9 + k * 0.3, y + 0.7, -0.07, c - 0.9 + k * 0.3 + 0.04, y + 2.3, -0.02)
        p.box(ROOFTILE, x0 - 0.03, y - 0.1, -0.15, x1 + 0.03, y + 0.05, 0.0)
    p.box(ROOFTILE, x0 - 0.3, h - 0.3, -0.6, x1 + 0.3, h, d + 0.3)
    for face, a0, a1, at in sides(x0, x1, 0, d, 'lr'):
        windows(p, face, a0 + 1.5, a1 - 1.5, at, 4.6, max(1, floors), 3.2, 3.0, 1.0, 1.4)
    service_back(p, x0, x1, d, 4.0, r)
    plant(p, x0, x1, h, 0, d, v['seed'])


def hotel(p, s, v, r):
    """A business hotel: a narrow tiled slab, a small lobby door, a tall board down the front."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall = v.get('wall', 'flat:#d6d0c2')
    p.box(wall, x0, 0, 0, x1, h, d)
    p.box(GRANITE, x0 - 0.04, 0, -0.05, x1 + 0.04, 4.2, 0.4)
    quad(p, 'windowDim', 'f', x0 + 0.8, x1 - 0.8, 0.4, 3.6, -0.06, col=SHOP)
    doors(p, -1.5, 0, -0.06, 2.4, 2.8, ALU)
    p.box(ALU_DK, -3.6, 3.2, -1.8, 0.6, 3.4, 0)
    board(p, 'name', 'f', x0 + 0.8, x1 - 0.8, 3.65, 4.15, -0.05, 'flat:#1f2023', 0.05)
    grid(p, x0, x1 - 1.6, 0, d, 4.4, h - 1.0, wall, 3.0, 2.0, 1.2, 1.5, 0.9, 'flr', body=False)
    board(p, 'vertical', 'f', x1 - 1.4, x1 - 0.2, 6.0, h - 3.0, 0, 'flat:#f4f1e8', 0.35)
    service_back(p, x0, x1, d, 4.2, r)
    plant(p, x0, x1, h, 0, d, v['seed'])


STYLES = {'stone': stone, 'brick': brick, 'ribbon': ribbon_office, 'seni': seni, 'tower': tower, 'kimono': kimono, 'hotel': hotel}


WALK = -2.15  # the riverside walk, below the street (tsumugibashi-street.ts PROM − GROUND_Y)
CAFE_COL = ['#7a1f2b', '#1f3f7a', '#3f6f4a', '#2a2019', '#b35a1c']


def canal_back(p, s, v, r):
    """The back of a canal-backed building (faces +z, onto the water). Below the street, a storey
    of cafés opening onto the riverside walk, 0.5 m out over the old bank; at the street, windows
    behind grilles; at the second floor a row of doors where the game hangs a terrace; above,
    framed windows with sills, a band at every floor, air-conditioners, balconies on the top
    floor, drainpipes, ivy."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    trim = v.get('trim', STONE_DK)
    top = min(h, LINE)
    zb = d + 0.03  # the face's own plane, just proud of the body
    # ── The walk storey: a stone base, café fronts in bays, a board for one name. ──
    p.box('flat:#8d8371', x0, WALK - 0.4, d, x1, 0.0, d + 0.5)
    bays = max(2, round((w - 1.0) / 3.4))
    bw = (w - 1.0) / bays
    col = 'flat:' + r.choice(CAFE_COL)
    for k in range(bays):
        a, b_ = x0 + 0.5 + k * bw + 0.15, x0 + 0.5 + (k + 1) * bw - 0.15
        quad(p, 'windowDim', 'b', a, b_, WALK + 0.15, -0.55, d + 0.52, col=WARM)
        for xx in (a, b_ - 0.08):
            p.box(LATTICE, xx, WALK, d + 0.5, xx + 0.08, -0.45, d + 0.58)
        p.box(LATTICE, a, -0.55, d + 0.5, b_, -0.45, d + 0.58)
        if k % 2 == 0:
            for j in range(3):
                p.box(col, (a + b_) / 2 - 0.75 + j * 0.5, -1.25, d + 0.6, (a + b_) / 2 - 0.29 + j * 0.5, -0.5, d + 0.62)
        else:
            p.box('flat:#2a2622', a + 0.1, WALK + 0.15, d + 0.53, b_ - 0.1, WALK + 0.6, d + 0.55)
    # A canvas awning the length of the storey; the café's board on the street-level band above it.
    p.prism(col, [(d + 0.5, -0.05), (d + 1.6, -0.55), (d + 1.6, -0.45), (d + 0.5, 0.05)], 'x', x0 + 0.3, x1 - 0.3)
    board(p, 'cafe', 'b', -min(3.0, w / 2 - 1.0), min(3.0, w / 2 - 1.0), 0.1, 0.9, d + 0.5, 'flat:#2a2019', 0.08)
    # ── Street level: windows behind iron grilles. ──
    for c in rows(x0 + 1.0, x1 - 1.0, 3.0):
        quad(p, WINDOW, 'b', c - 0.8, c + 0.8, 1.2, 3.3, zb)
        p.box(FRAME, c - 0.9, 1.1, d, c + 0.9, 1.2, d + 0.12)
        for k in range(6):
            p.box('flat:#2e3134', c - 0.75 + k * 0.3, 1.2, d + 0.06, c - 0.72 + k * 0.3, 3.3, d + 0.09)
    ob(p, trim, x0, 4.1, d - 0.2, x1, 4.4, d, 0.12)
    # ── The terrace floor: glazed doors, a lamp over each. ──
    for c in rows(x0 + 1.5, x1 - 1.5, 3.4):
        quad(p, 'windowDim', 'b', c - 1.0, c + 1.0, 4.4, 6.9, zb, col=WARM)
        p.box(FRAME, c - 1.05, 6.9, d, c + 1.05, 7.05, d + 0.1)
        p.box(FRAME, c - 0.03, 4.4, d, c + 0.03, 6.9, d + 0.06)
        p.box('light', c - 0.15, 7.2, d + 0.05, c + 0.15, 7.5, d + 0.2)
    # ── Above: framed windows, sills, bands, AC units; balconies on the top floor. ──
    fl = 3.6
    n = int((top - 8.0) / fl) if top > 9 else 0
    for f in range(n):
        y = 8.0 + f * fl
        ob(p, trim, x0, y - 0.15, d - 0.2, x1, y, d, 0.06)
        for c in rows(x0 + 1.0, x1 - 1.0, 3.0):
            quad(p, WINDOW, 'b', c - 0.7, c + 0.7, y + 0.8, y + 2.8, zb)
            p.box(FRAME, c - 0.78, y + 0.72, d, c + 0.78, y + 0.8, d + 0.1)
            p.box(FRAME, c - 0.78, y + 2.8, d, c + 0.78, y + 2.88, d + 0.06)
            for xx in (c - 0.78, c + 0.7):
                p.box(FRAME, xx, y + 0.8, d, xx + 0.08, y + 2.8, d + 0.06)
            if r.random() < 0.18:
                p.box(ACU, c + 0.85, y + 0.3, d + 0.02, c + 1.45, y + 0.8, d + 0.32)
        if f == n - 1 and n >= 2:
            for c in rows(x0 + 1.5, x1 - 1.5, 6.0):
                p.box(CONC, c - 2.2, y, d, c + 2.2, y + 0.18, d + 1.1)
                for xx in rows(c - 2.15, c + 2.15, 0.25):
                    p.box(STEEL, xx - 0.015, y + 0.18, d + 1.05, xx + 0.015, y + 1.15, d + 1.08)
                p.box(STEEL, c - 2.2, y + 1.12, d + 1.0, c + 2.2, y + 1.18, d + 1.1)
    for xx in (x0 + 0.25, x1 - 0.25):
        p.cyl('flat:#6f726b', (xx, top / 2, d + 0.12), 1, 0.07, top, seg=6, caps=False)
    # Ivy climbing from the street up one corner beside the drainpipe: small leaves in a column that
    # thins as it rises, on some buildings only.
    if r.random() < 0.6:
        edge = x1 - 0.45 if r.random() < 0.5 else x0 + 0.45
        inward = -1 if edge > 0 else 1
        hmax = r.uniform(6.0, min(top - 1, 13.0))
        y = 0.2
        k = 0
        while y < hmax:
            spread = 1.4 * (1 - y / hmax) + 0.3
            for _ in range(3):
                cx = edge + inward * r.uniform(0.0, spread)
                sz = r.uniform(0.18, 0.34)
                col = r.choice(['flat:#2f5a2c', 'flat:#3f6b3a', 'flat:#4d7a3e'])
                quad(p, col, 'b', cx - sz, cx + sz, y, y + sz * 1.6, d + 0.06 + (k % 5) * 0.003)
                k += 1
            y += 0.35
    mark('terrace', 0.0, 4.4, d, w, 0.0, (0, 1))


# The street storey's height by style, where its sides are otherwise blank.
GROUND_H = {'ribbon': 5.0, 'seni': 4.6, 'tower': 6.4, 'hotel': 4.2, 'kimono': 3.2}


def ground_sides(p, s, v, r):
    """Shop windows round the corner on both sides of the street storey, a canopy over each."""
    h = GROUND_H.get(v['style'])
    if not h:
        return
    w, d = v['w'], v['d']
    for face, a0, a1, at in sides(-w / 2, w / 2, 0.6, d, 'lr'):
        for c in rows(a0 + 1.2, a1 - 1.2, 5.0):
            quad(p, 'windowDim', face, c - 1.9, c + 1.9, 0.45, h - 1.1, out(face, at, 0.03), col=WARM if r.random() < 0.5 else SHOP)
            slab(p, ALU_DK, face, c - 2.0, c + 2.0, h - 1.05, h - 0.9, at, 0.4)


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(sum(map(ord, v['id'])))
    NO_BACK[0] = bool(v.get('canal'))
    STYLES[v['style']](body, signs, v, r)
    ground_sides(body, signs, v, r)
    if v.get('canal'):
        canal_back(body, signs, v, r)
    return body, signs


def build_lo(v):
    """A plain massing copy for the far city (rarely used: the fronts are near)."""
    return None


D = 20.0
FRONTS = [
    # Stone banks and exchange houses (Kitahama, 1918–1930).
    dict(id='stone_a', style='stone', w=24.0, h=22.0, seed=3),
    dict(id='stone_b', style='stone', w=18.0, h=19.0, wall=STONE_LT, trim='flat:#7d7361', seed=5),
    dict(id='stone_c', style='stone', w=15.0, h=24.0, wall='flat:#cfc3a8', trim=GRANITE, seed=7),
    dict(id='stone_d', style='stone', w=21.0, h=26.0, wall='flat:#e0d8c6', trim='flat:#5a5248', seed=9),
    # Brick "buildings" (1925–1937).
    dict(id='brick_a', style='brick', w=16.0, h=28.0, seed=11),
    dict(id='brick_b', style='brick', w=21.0, h=31.0, wall='flat:#7a4a32', trim=STONE, seed=13),
    dict(id='brick_c', style='brick', w=13.5, h=22.0, wall='flat:#a0603e', trim='flat:#efe6cf', seed=15),
    dict(id='brick_d', style='brick', w=11.0, h=19.0, wall='flat:#6e3a2d', trim='flat:#d8ccb2', seed=17),
    dict(id='brick_e', style='brick', w=19.0, h=25.0, wall='flat:#8f5a3f', trim='flat:#c4b89f', seed=19),
    # Trading companies' offices (1958–1972).
    dict(id='ribbon_a', style='ribbon', w=26.0, h=31.0, seed=21),
    dict(id='ribbon_b', style='ribbon', w=18.0, h=31.0, wall='flat:#c9c6bd', trim='flat:#5d6166', seed=23),
    dict(id='ribbon_c', style='ribbon', w=14.0, h=27.0, wall='flat:#dfe3e2', trim='flat:#3f6a5a', seed=25),
    dict(id='ribbon_d', style='ribbon', w=22.0, h=31.0, wall='flat:#e8e1cf', trim='flat:#7a1f2b', seed=27),
    # Textile halls (1950s).
    dict(id='seni_a', style='seni', w=22.0, h=31.0, seed=29),
    dict(id='seni_b', style='seni', w=16.0, h=28.0, wall='flat:#d9cfb8', trim='flat:#8a6a4a', seed=31),
    # Towers over the height line (1990s–2020s).
    dict(id='tower_a', style='tower', w=24.0, h=72.0, seed=33),
    dict(id='tower_b', style='tower', w=20.0, h=55.0, wall='flat:#cfd2d4', glass=GLASS_GN, seed=35),
    dict(id='tower_c', style='tower', w=26.0, h=88.0, wall='flat:#b9b3a6', glass=GLASS_BZ, seed=37),
    # Kimono houses and small merchants.
    dict(id='kimono_a', style='kimono', w=12.0, h=14.0, seed=39),
    dict(id='kimono_b', style='kimono', w=9.5, h=11.6, seed=41),
    dict(id='kimono_c', style='kimono', w=7.5, h=11.6, seed=43),
    # A business hotel.
    dict(id='hotel_a', style='hotel', w=11.0, h=40.0, seed=45),
    dict(id='hotel_b', style='hotel', w=9.0, h=34.0, wall='flat:#e4ddd0', seed=47),
]
for _v in FRONTS:
    _v.setdefault('d', D)
    _v['gap'] = 10.0

# The east bank of Tsumugi-bori: fronts on Tsumugibori-suji, backs on the canal (13 m deep).
CANAL = [
    dict(id='canal_a', style='stone', w=17.0, h=18.0, seed=51, canal=True),
    dict(id='canal_b', style='brick', w=15.0, h=24.0, wall='flat:#8a4b3a', trim=STONE_LT, seed=53, canal=True),
    dict(id='canal_c', style='ribbon', w=19.0, h=28.0, wall='flat:#e3ded2', trim='flat:#5d6166', seed=55, canal=True),
    dict(id='canal_d', style='brick', w=13.0, h=19.0, wall='flat:#a0603e', trim='flat:#efe6cf', seed=57, canal=True),
    dict(id='canal_e', style='kimono', w=12.0, h=14.0, seed=59, canal=True),
    dict(id='canal_f', style='stone', w=21.0, h=24.0, wall='flat:#e0d8c6', trim='flat:#5a5248', seed=61, canal=True),
]
for _v in CANAL:
    _v['d'] = 13.0
    _v['gap'] = 10.0


if __name__ == '__main__':
    run('tsumugifront', FRONTS + CANAL, build_hi, build_lo)
    write_anchors('tsumugifront')
