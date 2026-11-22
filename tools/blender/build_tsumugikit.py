# Builds Tsumugibashi's street pieces (the Senba / Kitahama-style rebuild, 2026-11):
# - tonya_a … tonya_f: the textile wholesalers of 絹問屋横丁 (the wholesalers' lane): narrow
#   two- and three-storey shops, roll-up shutters, racks and tables of cloth bolts, cartons;
# - lanegate: the steel gate over the lane's mouth (the game letters its two boards);
# - yuka: a terrace (川床) hung off the canal side of a building at its second floor;
# - span, pier, cap: the old painted-steel footbridge (歩道橋) over the main junction;
# - lift: a glazed lift tower added to the footbridge later.
#
#   blender --background --python tools/blender/build_tsumugikit.py -- [--renders <dir>]
#
# Writes assets/buildings/tsumugikit.blend, public/models/buildings/tsumugikit.glb and
# src/stations/anchors/tsumugikit.ts. Frame and helpers: buildkit.py, kitakit.py.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

TEAL = 'flat:#3f7f86'
TEAL_DK = 'flat:#2c5e63'
DECK_H = 6.0   # the footbridge's walking surface above the pavement
DW = 3.6       # its clear width
CLOTH = ['#1f3f7a', '#7a1f2b', '#b4472f', '#efe6cf', '#2b3a67', '#c9962e', '#3f6f4a', '#d8c8a0', '#6b4a32', '#1f6f9d', '#d94f8a', '#f2efe8']
CARTON = 'flat:#b08a5a'
TIMBER = 'flat:#4a3626'


def bolts(p, r, x0, x1, y, z0, z1, rows_=2):
    """Cloth bolts lying across a shelf or table, ends to the street, in rows."""
    for k in range(rows_):
        x = x0 + 0.12
        while x + 0.24 < x1:
            col = 'flat:' + r.choice(CLOTH)
            p.cyl(col, (x + 0.11, y + 0.11 + k * 0.22, (z0 + z1) / 2), 2, 0.11, z1 - z0, seg=6)
            x += 0.24


def tonya(p, s, v, r):
    """A wholesaler's shop on the lane."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall = v.get('wall', 'flat:#d8d2c4')
    p.box(wall, x0, 0, 0, x1, h, d)
    # The open shop: a dark interior, shelves of bolts down both sides, a table out front.
    gh = 3.0
    p.box('flat:#2a2622', x0 + 0.3, 0, 0, x1 - 0.3, gh, 0.02)  # (seen past the stock)
    p.box('flat:#6f6a60', x0 + 0.25, 0, -0.05, x1 - 0.25, 0.02, 0.0)
    if v.get('closed'):
        p.box('flat:#a7acb1', x0 + 0.25, 0, -0.08, x1 - 0.25, gh, -0.04)
        for y in [0.2 + 0.25 * i for i in range(12)]:
            p.box('flat:#8c9196', x0 + 0.25, y, -0.1, x1 - 0.25, y + 0.03, -0.08)
    else:
        for xs in (x0 + 0.3, x1 - 1.0):
            p.box(TIMBER, xs, 0, -0.9, xs + 0.7, 2.4, -0.1)
            for k in range(4):
                bolts(p, r, xs, xs + 0.7, 0.3 + k * 0.52, -0.9, -0.1, 1)
        # The table of bolts on the pavement edge of the shop.
        p.box(TIMBER, x0 + 1.2, 0, -1.5, x1 - 1.2, 0.75, -0.95)
        bolts(p, r, x0 + 1.2, x1 - 1.2, 0.75, -1.45, -1.0, 2)
        # Cartons stacked by the door.
        for k in range(int(r.uniform(2, 5))):
            p.box(CARTON, x1 - 1.0, k * 0.42, -1.9, x1 - 0.4, k * 0.42 + 0.4, -1.45)
        # The shutter rolled up in its box.
        p.box('flat:#8c9196', x0 + 0.25, gh - 0.4, -0.3, x1 - 0.25, gh, 0.0)
    # Name board over the shop, an awning on some.
    board(p, 'name', 'f', x0 + 0.3, x1 - 0.3, gh + 0.1, gh + 0.9, 0, 'flat:#f4f1e8', 0.1)
    if v.get('awning'):
        p.prism('flat:' + v['awning'], [(0.0, gh + 0.05), (-1.1, gh - 0.4), (-1.1, gh - 0.3), (0.0, gh + 0.15)], 'x', x0 + 0.2, x1 - 0.2)
    # Upper floors: aluminium windows, an AC unit, a vertical sign on some.
    floors = int((h - gh - 1.2) / 2.9)
    for f in range(floors):
        y = gh + 1.2 + f * 2.9
        for c in rows(x0 + 0.6, x1 - 0.6 - (1.0 if v.get('vertical') else 0), 2.2):
            quad(p, WINDOW, 'f', c - 0.75, c + 0.75, y + 0.6, y + 2.1, -0.01)
            p.box(ALU, c - 0.8, y + 0.55, -0.06, c + 0.8, y + 0.6, 0.0)
        if r.random() < 0.6:
            p.box(ACU, x0 + 0.5, y + 0.1, -0.5, x0 + 1.3, y + 0.6, -0.02)
    if v.get('vertical'):
        board(p, 'vertical', 'f', x1 - 1.05, x1 - 0.35, gh + 1.4, h - 0.6, 0, 'flat:' + v['vertical'], 0.3)
    p.box('flat:#6f6a60', x0, h - 0.25, -0.1, x1, h, d)
    p.cyl('flat:#6f726b', (x1 - 0.15, h / 2, -0.08), 1, 0.05, h, seg=6, caps=False)


def lanegate(p, s, v, r):
    """A steel gate over the lane's mouth: two posts, a beam, a board each way, lamps."""
    w = v['w']
    for x in (-w / 2 + 0.2, w / 2 - 0.2):
        p.box(STEEL, x - 0.15, 0, -0.15, x + 0.15, 5.6, 0.15)
    p.box(TEAL_DK, -w / 2, 4.6, -0.25, w / 2, 5.8, 0.25)
    board(p, 'name_f', 'f', -w / 2 + 0.7, w / 2 - 0.7, 4.7, 5.7, -0.25, 'flat:#f4f1e8', 0.05)
    board(p, 'name_b', 'b', -w / 2 + 0.7, w / 2 - 0.7, 4.7, 5.7, 0.25, 'flat:#f4f1e8', 0.05)
    for x in (-w / 2 + 0.2, w / 2 - 0.2):
        p.box('light', x - 0.18, 4.2, -0.4, x + 0.18, 4.5, -0.15)
        p.box('light', x - 0.18, 4.2, 0.15, x + 0.18, 4.5, 0.4)


def yuka(p, s, v, r):
    """A terrace hung off a building's canal side: steel brackets, a timber deck, a rail,
    tables under parasols, a string of lanterns. Its floor is at y = 0 here; the wall is z = 0
    and the deck reaches out to −z."""
    w, D = v['w'], v['dd']
    p.box('flat:#7a5f45', -w / 2, -0.18, -D, w / 2, 0.0, 0.0)
    for x in rows(-w / 2 + 0.4, w / 2 - 0.4, 2.4):
        p.box(STEEL, x - 0.06, -0.5, -D, x + 0.06, -0.18, 0.0)
        p.face(STEEL, [(x, -0.5, -D + 0.3), (x + 0.06, -0.5, -D + 0.3), (x + 0.06, -2.2, 0.0), (x, -2.2, 0.0)], (1, 0, 0))
    # The rail.
    p.box('flat:#4a3626', -w / 2, 0.95, -D, w / 2, 1.05, -D + 0.08)
    for x in rows(-w / 2, w / 2, 0.15):
        p.box('flat:#4a3626', x - 0.015, 0, -D, x + 0.015, 0.95, -D + 0.04)
    for side in (-1, 1):
        x = side * (w / 2 - 0.04)
        p.box('flat:#4a3626', x - 0.04, 0.95, -D, x + 0.04, 1.05, 0.0)
    # Tables, stools, parasols.
    for x in rows(-w / 2 + 1.2, w / 2 - 1.2, 2.4):
        p.cyl('flat:#3a2c20', (x, 0.36, -D / 2), 1, 0.06, 0.72, seg=6)
        p.cyl('flat:#c9b48a', (x, 0.73, -D / 2), 1, 0.45, 0.04, seg=10)
        for dx in (-0.7, 0.7):
            p.cyl('flat:#3a2c20', (x + dx, 0.23, -D / 2), 1, 0.17, 0.46, seg=6)
        if r.random() < 0.6:
            p.cyl(STEEL, (x, 1.5, -D / 2), 1, 0.025, 1.6, seg=4)
            p.cyl('flat:' + r.choice(['#efe6cf', '#7a1f2b', '#1f3f7a']), (x, 2.3, -D / 2), 1, 1.0, 0.08, seg=10)
    # Lanterns on a wire along the rail.
    for x in rows(-w / 2 + 0.5, w / 2 - 0.5, 1.2):
        p.box('light', x - 0.11, 1.85, -D + 0.1, x + 0.11, 2.15, -D + 0.3)
    p.box(STEEL, -w / 2, 2.15, -D + 0.18, w / 2, 2.17, -D + 0.22)
    for side in (-1, 1):
        p.box(STEEL, side * (w / 2 - 0.05) - 0.03, 1.05, -D + 0.05, side * (w / 2 - 0.05) + 0.03, 2.2, -D + 0.11)
    # The restaurant's name on a board along the rail, red paper lanterns under the eaves of the wall.
    board(p, 'name', 'f', -min(1.6, w / 2 - 0.5), min(1.6, w / 2 - 0.5), 0.35, 0.9, -D - 0.02, 'flat:#2a2019', 0.04)
    for x in rows(-w / 2 + 0.8, w / 2 - 0.8, 1.6):
        p.cyl('flat:#c8102e', (x, 2.55, -0.45), 1, 0.17, 0.42, seg=8)
        p.box('flat:#1d1f22', x - 0.12, 2.75, -0.57, x + 0.12, 2.8, -0.33)
        p.box(STEEL, x - 0.01, 2.8, -0.46, x + 0.01, 3.2, -0.44)
    for side in (-1, 1):
        x = side * (w / 2 - 0.45)
        p.box('flat:#6b5440', x - 0.3, 0, -D + 0.2, x + 0.3, 0.45, -D + 0.75)
        p.box(HEDGE, x - 0.28, 0.45, -D + 0.22, x + 0.28, 0.8, -D + 0.73)


def walkseat(p, s, v, r):
    """Café seats on the riverside walk against a building's walk storey: two tables, four stools,
    a parasol, a menu board on an easel. The wall is z = 0; the seats stand out to -z."""
    for x in (-0.85, 0.85):
        p.cyl('flat:#3a2c20', (x, 0.36, -0.75), 1, 0.05, 0.72, seg=6)
        p.cyl('flat:#e8e0cc', (x, 0.74, -0.75), 1, 0.38, 0.04, seg=10)
        for dz in (-0.55, 0.45):
            p.cyl('flat:#3a2c20', (x, 0.22, -0.75 + dz), 1, 0.16, 0.44, seg=6)
    p.cyl(STEEL, (0.0, 1.2, -0.75), 1, 0.025, 2.4, seg=4)
    p.cyl('flat:' + v['col'], (0.0, 2.3, -0.75), 1, 1.2, 0.08, seg=12)
    p.box('flat:#2a2622', 1.5, 0.0, -1.35, 1.55, 1.1, -1.3)
    p.face('flat:#1d1f22', [(1.35, 0.35, -1.42), (1.75, 0.35, -1.42), (1.75, 1.05, -1.32), (1.35, 1.05, -1.32)], (0, 0.2, -1))


def pontoon(p, s, v, r):
    """A floating landing stage for the sightseeing boats: a steel pontoon on floats, a rail on its
    water side, mooring bollards, a lit shelter with a board for the landing's name. Deck y = 0,
    along x; the walk side is z = 0, the water side z = d."""
    w, d = v['w'], v['d']
    x0, x1 = -w / 2, w / 2
    p.box('flat:#8d9094', x0, -0.35, 0, x1, 0.0, d)
    p.box('flat:#5d6166', x0 + 0.2, -0.75, 0.2, x1 - 0.2, -0.35, d - 0.2)
    p.box('flat:#e6a700', x0, -0.02, 0, x1, 0.002, 0.12)
    p.box('flat:#e6a700', x0, -0.02, d - 0.12, x1, 0.002, d)
    for x in rows(x0 + 0.3, x1 - 0.3, 1.5):
        p.box(STEEL, x - 0.025, 0, d - 0.08, x + 0.025, 1.1, d - 0.03)
    p.box(STEEL, x0, 1.05, d - 0.1, x1, 1.1, d)
    for x in (x0 + 0.8, x1 - 0.8):
        p.cyl('flat:#2e3134', (x, 0.25, d - 0.4), 1, 0.14, 0.5, seg=8)
    # The shelter.
    for x in (x0 + 1.0, x0 + 4.0):
        p.box(STEEL, x - 0.05, 0, 0.3, x + 0.05, 2.5, 0.4)
    p.box('flat:#2c5e63', x0 + 0.7, 2.5, 0.1, x0 + 4.3, 2.65, d - 0.6)
    quad(p, 'glassTint', 'f', x0 + 1.0, x0 + 4.0, 0.2, 2.4, 0.35)
    board(p, 'name', 'b', x0 + 1.2, x0 + 3.8, 2.0, 2.45, 0.42, 'flat:#f4f1e8', 0.02)


def boat(p, s, v, r):
    """A canal sightseeing boat: a low white hull, a long glazed cabin with a flat roof (low enough
    for the bridges), a wheelhouse forward, its name on the hull. Along x; waterline y = 0."""
    w, d = v['w'], v['d']
    x0, x1 = -w / 2, w / 2
    hull = 'flat:#f2f1ec'
    p.box(hull, x0 + 1.0, -0.5, 0, x1 - 1.4, 0.7, d)
    p.prism(hull, [(0.0, -0.5), (0.0, 0.7), (d, 0.7), (d, -0.5)], 'x', x1 - 1.4, x1 - 1.39)
    p.face(hull, [(x1 - 1.4, -0.5, 0), (x1, 0.7, d / 2), (x1 - 1.4, 0.7, 0)], (1, 0, -1))
    p.face(hull, [(x1 - 1.4, -0.5, d), (x1 - 1.4, 0.7, d), (x1, 0.7, d / 2)], (1, 0, 1))
    p.face(hull, [(x1 - 1.4, 0.7, 0), (x1, 0.7, d / 2), (x1 - 1.4, 0.7, d)], (0, 1, 0))
    p.box('flat:#1f3f7a', x0 + 1.0, 0.45, -0.01, x1 - 1.4, 0.6, d + 0.01)
    p.box(hull, x0 + 0.4, -0.5, 0.2, x0 + 1.0, 0.7, d - 0.2)
    # The cabin.
    p.box('flat:#e3e5e6', x0 + 1.6, 0.7, 0.25, x1 - 2.4, 0.95, d - 0.25)
    for z, face in ((0.25, 'f'), (d - 0.25, 'b')):
        quad(p, 'glassTint', face, x0 + 1.6, x1 - 2.4, 0.95, 2.0, z)
        for x in rows(x0 + 1.6, x1 - 2.4, 1.3):
            p.box(ALU, x - 0.04, 0.95, z - 0.03, x + 0.04, 2.0, z + 0.03)
    p.box('flat:#e3e5e6', x0 + 1.4, 2.0, 0.1, x1 - 2.2, 2.15, d - 0.1)
    p.box('flat:#3b5566', x1 - 3.4, 2.15, 0.6, x1 - 2.4, 2.75, d - 0.6)
    board(p, 'name', 'f', x0 + 2.0, x0 + 6.0, 0.05, 0.42, 0.0, 'flat:#f2f1ec', 0.02)
    board(p, 'name_b', 'b', x0 + 2.0, x0 + 6.0, 0.05, 0.42, d, 'flat:#f2f1ec', 0.02)


def passgate(p, s, v, r):
    """A timber gate over the lane down to the riverside walk: two posts, a tiled cap, a board each
    way, red paper lanterns."""
    w = v['w']
    for x in (-w / 2 + 0.15, w / 2 - 0.15):
        p.box('flat:#4a3626', x - 0.14, 0, -0.14, x + 0.14, 3.6, 0.14)
        p.box(GRANITE, x - 0.2, 0, -0.2, x + 0.2, 0.3, 0.2)
    p.box('flat:#4a3626', -w / 2, 3.3, -0.2, w / 2, 3.6, 0.2)
    p.prism('flat:#3b3f45', [(-0.5, 3.6), (0.0, 3.95), (0.5, 3.6), (0.4, 3.55), (-0.4, 3.55)], 'x', -w / 2 - 0.3, w / 2 + 0.3)
    board(p, 'name_f', 'f', -w / 2 + 0.5, w / 2 - 0.5, 2.75, 3.25, -0.2, 'flat:#2a2019', 0.03)
    board(p, 'name_b', 'b', -w / 2 + 0.5, w / 2 - 0.5, 2.75, 3.25, 0.2, 'flat:#2a2019', 0.03)
    for x in (-w / 2 + 0.6, w / 2 - 0.6):
        for z in (-0.35, 0.35):
            p.cyl('flat:#c8102e', (x, 2.45, z), 1, 0.16, 0.4, seg=8)
            p.box(STEEL, x - 0.01, 2.65, z - 0.01, x + 0.01, 3.3, z + 0.01)


def span(p, s, v, r):
    """A 6 m bay of the footbridge's deck, along x; the deck is z 0 … DW. Two plate girders, a
    teal parapet panel each side with a rail, a lamp on the parapet, the deck's edge fascia."""
    w = v['w']
    x0, x1 = -w / 2, w / 2
    y = DECK_H
    p.box('flat:#9d9a92', x0, y - 0.25, 0, x1, y - 0.02, DW)
    for z in (0.0, DW):
        p.box(TEAL, x0, y - 1.05, z - 0.12, x1, y - 0.25, z + 0.12)
        p.box(TEAL_DK, x0, y - 1.1, z - 0.2, x1, y - 1.02, z + 0.2)
    for x in rows(x0 + 0.5, x1 - 0.5, 1.5):
        p.box(TEAL_DK, x - 0.05, y - 1.0, 0.1, x + 0.05, y - 0.3, DW - 0.1)
    # Parapets: solid lower panels, bars above, a round top rail.
    for z, n in ((0.0, -1), (DW, 1)):
        p.box(TEAL, x0, y - 0.02, z - 0.04, x1, y + 0.6, z + 0.04)
        for x in rows(x0 + 0.06, x1 - 0.06, 0.14):
            p.box(TEAL, x - 0.015, y + 0.6, z - 0.015, x + 0.015, y + 1.1, z + 0.015)
        p.cyl(TEAL_DK, (0.0, y + 1.12, z), 0, 0.04, w, seg=6)
        p.box('flat:#cfd2d4', x0, y - 0.25, z + n * 0.12, x1, y - 0.02, z + n * 0.16)
    p.box('light', -0.15, y + 0.9, DW - 0.1, 0.15, y + 1.05, DW - 0.04)


def pier(p, s, v, r):
    """A steel pier and its cap beam across the deck (z 0 … DW): stands under a span's joint."""
    y = DECK_H
    for z in (0.5, DW - 0.5):
        p.box(TEAL, -0.22, 0, z - 0.22, 0.22, y - 1.1, z + 0.22)
        p.box(GRANITE, -0.35, 0, z - 0.35, 0.35, 0.4, z + 0.35)
    p.box(TEAL_DK, -0.3, y - 1.4, -0.2, 0.3, y - 1.05, DW + 0.2)


def cap(p, s, v, r):
    """A square bay of deck at a corner of the footbridge (DW × DW), with parapets on the sides
    given ('f', 'b', 'l', 'r'), its name plate on the outside of the 'f' face."""
    y = DECK_H
    x0, x1, z0, z1 = -DW / 2, DW / 2, 0.0, DW
    p.box('flat:#9d9a92', x0, y - 0.25, z0, x1, y - 0.02, z1)
    p.box(TEAL, x0 - 0.12, y - 1.05, z0 - 0.12, x1 + 0.12, y - 0.25, z1 + 0.12)
    for face, a0, a1, at in sides(x0, x1, z0, z1, v['walls']):
        if face in 'fb':
            p.box(TEAL, a0, y - 0.02, at - 0.04, a1, y + 0.6, at + 0.04)
            for x in rows(a0 + 0.06, a1 - 0.06, 0.14):
                p.box(TEAL, x - 0.015, y + 0.6, at - 0.015, x + 0.015, y + 1.1, at + 0.015)
            p.box(TEAL_DK, a0, y + 1.08, at - 0.04, a1, y + 1.16, at + 0.04)
        else:
            p.box(TEAL, at - 0.04, y - 0.02, a0, at + 0.04, y + 0.6, a1)
            for z in rows(a0 + 0.06, a1 - 0.06, 0.14):
                p.box(TEAL, at - 0.015, y + 0.6, z - 0.015, at + 0.015, y + 1.1, z + 0.015)
            p.box(TEAL_DK, at - 0.04, y + 1.08, a0, at + 0.04, y + 1.16, a1)
    for x in (x0 + 0.4, x1 - 0.4):
        for z in (z0 + 0.4, z1 - 0.4):
            p.box(TEAL, x - 0.22, 0, z - 0.22, x + 0.22, y - 1.05, z + 0.22)
            p.box(GRANITE, x - 0.35, 0, z - 0.35, x + 0.35, 0.4, z + 0.35)


def lift(p, s, v, r):
    """A glazed lift tower beside the footbridge: steel corners, glass sides, a roof; doorways
    in the front (z = 0) at the pavement and at deck level (src/stations/lift.ts is the car)."""
    w, d = 2.9, 2.9
    x0, x1 = -w / 2, w / 2
    top = DECK_H + 3.1
    for x in (x0, x1 - 0.14):
        for z in (0.0, d - 0.14):
            p.box(ALU_DK, x, 0, z, x + 0.14, top, z + 0.14)
    for face, a0, a1, at in sides(x0, x1, 0.0, d, 'blr'):
        quad(p, 'glassTint', face, a0 + 0.14, a1 - 0.14, 0.2, top - 0.2, out(face, at, -0.02))
        for y in (2.4, DECK_H, DECK_H + 2.4):
            slab(p, ALU_DK, face, a0, a1, y - 0.08, y + 0.08, at, 0.04)
    # The front: glass but for the two doorways.
    for y0, y1 in ((2.3, DECK_H - 0.1), (DECK_H + 2.3, top - 0.2)):
        quad(p, 'glassTint', 'f', x0 + 0.14, x1 - 0.14, y0, y1, -0.02)
    for y in (0.0, DECK_H):
        p.box(ALU_DK, -0.7, y + 2.15, -0.06, 0.7, y + 2.3, 0.0)
    p.box(ALU_DK, x0 - 0.15, top, -0.15, x1 + 0.15, top + 0.3, d + 0.15)
    board(p, 'sign', 'f', -0.9, 0.9, top - 0.75, top - 0.25, 0, 'flat:#1f5fae', 0.05)


VARIANTS = [
    dict(id='tonya_a', fn=tonya, w=5.4, d=9.0, h=7.6, awning='#1f3f7a'),
    dict(id='tonya_b', fn=tonya, w=6.4, d=9.0, h=10.4, vertical='#7a1f2b', wall='flat:#c9c6bd'),
    dict(id='tonya_c', fn=tonya, w=4.6, d=9.0, h=7.6, closed=True, wall='flat:#e0dace'),
    dict(id='tonya_d', fn=tonya, w=7.2, d=9.0, h=10.4, awning='#3f6f4a', wall='flat:#d4cbb8'),
    dict(id='tonya_e', fn=tonya, w=5.8, d=9.0, h=10.4, vertical='#1f6f9d', wall='flat:#e6e2d8'),
    dict(id='tonya_f', fn=tonya, w=6.0, d=9.0, h=7.6, awning='#b35a1c', wall='flat:#cdc4b0'),
    dict(id='lanegate', fn=lanegate, w=6.0, d=0.5, h=5.8),
    dict(id='yuka', fn=yuka, w=8.0, d=0.0, h=3.2, dd=3.2),
    dict(id='yuka_s', fn=yuka, w=6.0, d=0.0, h=3.2, dd=2.6),
    dict(id='yuka_l', fn=yuka, w=10.0, d=0.0, h=3.2, dd=3.4),
    dict(id='walkseat', fn=walkseat, w=3.6, d=1.5, h=2.4, col='#efe6cf'),
    dict(id='walkseat_b', fn=walkseat, w=3.6, d=1.5, h=2.4, col='#7a1f2b'),
    dict(id='pontoon', fn=pontoon, w=12.0, d=2.6, h=2.7),
    dict(id='boat', fn=boat, w=16.0, d=3.4, h=2.8),
    dict(id='passgate', fn=passgate, w=4.4, d=0.5, h=4.0),
    dict(id='span', fn=span, w=6.4, d=DW, h=DECK_H + 1.2),
    dict(id='pier', fn=pier, w=0.6, d=DW, h=DECK_H),
    dict(id='cap', fn=cap, w=DW, d=DW, h=DECK_H + 1.2, walls=''),
    dict(id='lift', fn=lift, w=2.9, d=2.9, h=DECK_H + 3.4),
]
for _v in VARIANTS:
    _v['gap'] = 4.0


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    v['fn'](body, signs, v, random.Random(sum(map(ord, v['id']))))
    return body, signs


if __name__ == '__main__':
    run('tsumugikit', VARIANTS, build_hi, lambda v: None)
    write_anchors('tsumugikit')
