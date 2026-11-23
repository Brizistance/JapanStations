# Builds the town side of Daigaku-mae's street (the 2026-11 rebuild), after a Hongō-style university
# quarter: the old shop houses facing the campus wall across the main road, the used-book shops in
# their "signboard architecture" (copper and mortar fronts on timber houses, 1920s-30s), a corner
# kissaten of the same years, old mid-rise blocks with shops below, and behind the back street the
# wooden boarding houses (下宿) and the sentō.
#
#   blender --background --python tools/blender/build_daigakufront.py -- [--renders <dir>] [--only id,id]
#
# Writes assets/buildings/daigakufront.blend, public/models/buildings/daigakufront.glb and
# src/stations/anchors/daigakufront.ts. Frame: front at z = 0 facing -z, origin mid-frontage, +z into
# the lot. Nothing carries a name: the game letters the marked boards.
#
#   kissa         the corner kissaten, its -x side a second street face (it stands on a corner)
#   kosho_a … e   used-book shops: open fronts with shelves inside, book carts at the front
#   mise_a … d    small shops: a set-meal canteen with noren, a stationer and copy shop, a tobacconist
#                 with a coffee counter, a print shop
#   biru_a biru_b old mid-rise blocks with shops below (the main road's taller fronts)
#   geshuku_a … c wooden boarding houses, two storeys, an outside stair, laundry on the rails
#   sento         the bath house: a karahafu gable over the door, a tall chimney behind

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

PLASTER = 'flat:#ece6d6'
MORTAR = 'flat:#b8b2a6'
MORTAR_DK = 'flat:#8f897d'
COPPER = 'flat:#5f8f7a'
COPPER_DK = 'flat:#46705f'
CEDAR = 'flat:#5a4030'
CEDAR_DK = 'flat:#3a2a1e'
ROOFTILE = 'flat:#3b3f45'
ISHI = 'flat:#9a948a'
TILE_BR = 'flat:#7a5a44'
TILE_CR = 'flat:#d8cdb4'
WFRAME = 'flat:#5b4a36'
LEAFY = 'flat:#3f6b3a'
SHELF = 'flat:#6b4a30'
BOOKS = ['flat:#7a2a22', 'flat:#2a3f5f', 'flat:#c9b48a', 'flat:#3f5a3a', 'flat:#d8cfb8', 'flat:#5a4632', 'flat:#8a6a3a', 'flat:#e6dcc6']
AWNS = ['#2f6b45', '#7a1f2b', '#1f3f7a', '#8a6a3a', '#3f4a3a']


def eave(p, x0, x1, y, z0, over=0.9, rise=0.6, mat=ROOFTILE):
    p.prism(mat, [(z0 + 0.2, y + rise), (z0 - over, y), (z0 - over, y - 0.12), (z0 + 0.2, y + rise - 0.12)], 'x', x0 - 0.15, x1 + 0.15)


def shelves(p, x0, x1, y0, y1, z, r, deep=0.35):
    """A wall of book shelves standing at z (books on its -z face)."""
    p.box(SHELF, x0, y0, z, x1, y1, z + deep)
    y = y0 + 0.08
    while y + 0.3 < y1:
        p.box(SHELF, x0, y, z - 0.02, x1, y + 0.03, z + deep)
        xx = x0 + 0.04
        while xx < x1 - 0.06:
            bw = r.uniform(0.03, 0.07)
            p.box(r.choice(BOOKS), xx, y + 0.03, z - 0.01, min(x1 - 0.04, xx + bw), y + r.uniform(0.18, 0.28), z + deep - 0.05)
            xx += bw + 0.005
        y += 0.32


def cart(p, x, z, r, w=1.4):
    """A book cart on the pavement before a shop: a sloped tray of books on legs."""
    p.box(CEDAR_DK, x - w / 2, 0, z - 0.3, x - w / 2 + 0.05, 0.75, z - 0.25)
    p.box(CEDAR_DK, x + w / 2 - 0.05, 0, z - 0.3, x + w / 2, 0.75, z - 0.25)
    p.box(CEDAR_DK, x - w / 2, 0, z + 0.25, x - w / 2 + 0.05, 0.9, z + 0.3)
    p.box(CEDAR_DK, x + w / 2 - 0.05, 0, z + 0.25, x + w / 2, 0.9, z + 0.3)
    p.face(CEDAR, [(x - w / 2, 0.75, z - 0.32), (x + w / 2, 0.75, z - 0.32), (x + w / 2, 0.92, z + 0.32), (x - w / 2, 0.92, z + 0.32)], (0, 1, -0.3))
    xx = x - w / 2 + 0.06
    while xx < x + w / 2 - 0.1:
        bw = r.uniform(0.04, 0.09)
        p.box(r.choice(BOOKS), xx, 0.78, z - 0.25, xx + bw, 0.95, z + 0.22)
        xx += bw + 0.01
    # The price card holder.
    p.box('flat:#f4f1e8', x - 0.15, 0.95, z - 0.33, x + 0.15, 1.15, z - 0.31)


def noren(p, x0, x1, y, z, col):
    n = max(2, round((x1 - x0) / 0.45))
    for k in range(n):
        a = x0 + (x1 - x0) * k / n
        p.box('flat:' + col, a + 0.02, y - 0.85, z - 0.04, a + (x1 - x0) / n - 0.02, y, z - 0.02)
    p.box(CEDAR_DK, x0 - 0.05, y, z - 0.06, x1 + 0.05, y + 0.05, z)


# ═════════════════════════ The corner kissaten ═════════════════════════
def kissa(p, s, v, r):
    """A 1930s café in cream tile: arched windows, a bay window, a green awning, a tiled roof with a
    pediment. Its -x side is the corner, a second street face."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(TILE_CR, x0, 0, 0, x1, h, d)
    p.box(TILE_BR, x0 - 0.05, 0, -0.08, x1, 0.6, d)
    p.box(TILE_BR, x0 - 0.06, 3.4, -0.12, x1, 3.6, d)
    p.box(TILE_BR, x0 - 0.1, h - 0.5, -0.2, x1 + 0.05, h, d)
    # Front: the door in a little arched porch at the corner end, two arched windows, a bay.
    doors(p, x0 + 1.4, 0, 0, 1.1, 2.4, CEDAR)
    p.box(TILE_BR, x0 + 0.6, 2.4, -0.5, x0 + 2.2, 2.6, 0)
    for c in (x0 + 4.0, x0 + 6.6):
        win(p, c - 0.9, 0.9, c + 0.9, 2.9, 0.0, -1, CEDAR)
        quad(p, 'windowDim', 'f', c - 0.82, c + 0.82, 0.96, 2.84, -0.07, col=WARM)
        p.box(TILE_BR, c - 1.05, 2.9, -0.12, c + 1.05, 3.1, 0)
    bx0, bx1 = x0 + 8.0, x1 - 0.6
    p.box(CEDAR, bx0, 0.6, -0.7, bx1, 0.9, 0)
    quad(p, 'windowDim', 'f', bx0 + 0.1, bx1 - 0.1, 0.9, 2.8, -0.7, col=WARM)
    p.box(CEDAR, bx0, 2.8, -0.75, bx1, 3.0, 0)
    for c in rows(bx0, bx1, 0.9):
        p.box(CEDAR, c - 0.03, 0.9, -0.72, c + 0.03, 2.8, -0.68)
    # The awning along the front, the name board above it, the upper floor's sash windows.
    col = 'flat:#2f6b45'
    p.face(col, [(x0 + 2.4, 3.35, -0.02), (x1 - 0.2, 3.35, -0.02), (x1 - 0.2, 2.95, -1.2), (x0 + 2.4, 2.95, -1.2)], (0, 0.9, -0.4))
    p.face(col, [(x1 - 0.2, 3.35, -0.02), (x0 + 2.4, 3.35, -0.02), (x0 + 2.4, 2.95, -1.2), (x1 - 0.2, 2.95, -1.2)], (0, -0.9, 0.4))
    board(p, 'name', 'f', x0 + 2.8, x1 - 0.8, 3.75, 4.35, 0.0, 'flat:#2a2019', 0.06)
    for c in rows(x0 + 0.8, x1 - 0.8, 2.2):
        win(p, c - 0.6, 5.0, c + 0.6, 6.6, 0.0, -1, CEDAR)
        p.box(TILE_BR, c - 0.75, 4.85, -0.1, c + 0.75, 5.0, 0)
    # The corner face: an arched window and a projecting sign.
    for c in (2.5, 5.5, 8.5):
        winx(p, c - 0.8, 0.9, c + 0.8, 2.9, x0, -1, CEDAR)
        quad(p, 'windowDim', 'l', c - 0.72, c + 0.72, 0.96, 2.84, x0 - 0.07, col=WARM)
        winx(p, c - 0.6, 5.0, c + 0.6, 6.6, x0, -1, CEDAR)
    board(p, 'side', 'l', 3.0, 9.0, 3.75, 4.35, x0, 'flat:#2a2019', 0.06)
    board(p, 'vertical', 'l', 0.7, 1.5, 4.7, 7.2, x0, 'flat:#2f6b45', 0.12)
    # A tiled hipped roof, a small pediment over the front.
    p.prism(ROOFTILE, [(-0.4, h), (d / 2, h + 2.4), (d + 0.4, h)], 'x', x0 - 0.4, x1 + 0.4)
    p.prism(TILE_CR, [(x1 - 6.0, h), (x1 - 3.5, h + 1.2), (x1 - 1.0, h)], 'z', -0.22, 0.2)
    p.box('light', x0 + 1.2, 2.7, -0.55, x0 + 1.6, 2.9, -0.5)
    backs(p, w, d, [3.6, h], r, sides=(1,), back=True)


# ═════════════════════════ Used-book shops ═════════════════════════
def kosho(p, s, v, r):
    """A used-book shop in a 1920s-30s signboard front: the street storey open (shutters up), shelves
    to the ceiling inside and a central table of books, carts out front; above, a flat facade of copper
    sheet or grooved mortar with a cornice, standing in front of a timber house with a tiled roof."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    face = v.get('face', COPPER)
    trim = COPPER_DK if face == COPPER else MORTAR_DK
    # The shop: a recess 3.6 deep, open to the street.
    sd = 3.6
    p.box(PLASTER, x0, 0, sd, x1, 3.0, d)
    for sx in (-1, 1):
        a = sx * w / 2
        p.box(face, min(a, a - sx * 0.3), 0, 0, max(a, a - sx * 0.3), 3.0, sd)
    p.box('flat:#6a655c', x0 + 0.3, 0, 0, x1 - 0.3, 0.02, sd)
    shelves(p, x0 + 0.35, x1 - 0.35, 0.02, 2.9, sd - 0.35, r)
    for sx in (-1, 1):
        a = sx * (w / 2 - 0.3)
        for k in range(int(sd / 0.9)):
            zz = 0.4 + k * 0.9
            p.box(SHELF, min(a, a - sx * 0.3), 0.02, zz, max(a, a - sx * 0.3), 2.6, zz + 0.85)
    p.box(SHELF, -0.6, 0, 1.2, 0.6, 0.8, 2.4)
    for k in range(5):
        p.box(r.choice(BOOKS), -0.55 + k * 0.22, 0.8, 1.3, -0.4 + k * 0.22, 0.95, 2.3)
    # Warm light inside: a lit strip under the soffit, the soffit itself.
    p.box(PLASTER, x0, 2.9, 0, x1, 3.0, sd)
    p.box('windowDim', x0 + 0.5, 2.86, 1.0, x1 - 0.5, 2.9, 1.3, col=WARM)
    # The shutter box over the opening, then the signboard front above.
    p.box(MORTAR_DK, x0, 3.0, -0.12, x1, 3.35, 0.2)
    p.box(face, x0, 3.35, -0.05, x1, h, 0.4)
    if face == COPPER:
        for c in rows(x0, x1, 0.45):
            p.box(COPPER_DK, c - 0.015, 3.35, -0.07, c + 0.015, h - 0.6, -0.05)
    else:
        for y in [3.6 + 0.35 * k for k in range(int((h - 4.2) / 0.35))]:
            p.box(MORTAR_DK, x0, y, -0.07, x1, y + 0.03, -0.05)
    board(p, 'name', 'f', x0 + 0.4, x1 - 0.4, 3.55, 4.25, -0.05, v.get('board', 'flat:#2a2019'), 0.05)
    nwin = max(1, round((w - 1.2) / 2.2))
    for c in rows(x0 + 0.6, x1 - 0.6, (w - 1.2) / nwin):
        win(p, c - 0.6, 4.9, c + 0.6, 6.3, -0.05, -1, trim)
        if v.get('arched') and abs(c) < 1.5:
            p.box(trim, c - 0.75, 6.3, -0.2, c + 0.75, 6.55, -0.05)
    if h > 8.5:
        for c in rows(x0 + 0.6, x1 - 0.6, (w - 1.2) / nwin):
            win(p, c - 0.55, 7.2, c + 0.55, 8.2, -0.05, -1, trim)
    # Cornice and a little parapet with a pediment or a stepped top.
    p.box(trim, x0 - 0.08, h - 0.6, -0.3, x1 + 0.08, h - 0.35, 0.4)
    if v.get('peak'):
        p.prism(face, [(-1.6, h), (0, h + 0.9), (1.6, h)], 'z', -0.05, 0.3)
    p.box(face, x0, h - 0.35, -0.05, x1, h, 0.4)
    # The timber house behind the front, with its tiled roof.
    p.box(PLASTER, x0, 3.0, 0.4, x1, h - 0.6, d)
    p.prism(ROOFTILE, [(0.6, h - 0.6), ((d + 0.6) / 2, h + 1.2), (d + 0.3, h - 0.6)], 'x', x0 - 0.2, x1 + 0.2)
    # Carts out front.
    for c in rows(x0 + 0.4, x1 - 0.4, 2.2)[:2]:
        cart(p, c, -0.55, r, 1.3)
    mark('_carts', 0, 0, -0.55, w - 0.8, 0.7)
    backs(p, w, d, [3.0, h - 0.6], r, sides=(-1, 1), back=True)


# ═════════════════════════ Small shops ═════════════════════════
def mise(p, s, v, r):
    """A small two-storey shop: a canteen behind noren, a stationer with a glazed front, a tobacconist
    with a coffee hatch, a print shop. Mortar or tile front, a pent roof of tile, sash windows above."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    kind = v['kind']
    wall = v.get('wall', PLASTER)
    p.box(wall, x0, 0, 0.3, x1, h, d)
    p.box(CEDAR, x0, 0, 0, x0 + 0.25, 3.0, 0.3)
    p.box(CEDAR, x1 - 0.25, 0, 0, x1, 3.0, 0.3)
    if kind == 'teishoku':
        p.box(CEDAR_DK, x0 + 0.25, 0, 0.28, x1 - 0.25, 2.8, 0.3)
        quad(p, 'windowDim', 'f', x0 + 0.4, x0 + w * 0.55, 0.9, 2.5, 0.27, col=WARM)
        doors(p, x1 - w * 0.25, 0, 0.27, 1.6, 2.3, CEDAR)
        noren(p, x1 - w * 0.25 - 0.9, x1 - w * 0.25 + 0.9, 2.4, 0.2, '#1f3f7a')
        p.box('flat:#c8102e', x0 + 0.6, 1.2, -0.3, x0 + 0.9, 1.9, 0.0)
        p.box('light', x0 + 0.62, 1.25, -0.32, x0 + 0.88, 1.85, -0.3)
    elif kind == 'stationer':
        display(p, x0 + 0.3, x1 - 2.0, 0.0, 2.7, 0.28)
        doors(p, x1 - 1.1, 0, 0.27, 1.2, 2.4, ALU)
        p.box('flat:#d9d3c2', x0 + 0.4, 0.6, 0.6, x0 + 1.4, 1.3, 1.4)
    elif kind == 'tabako':
        quad(p, 'windowDim', 'f', x0 + 0.3, x0 + 2.2, 0.9, 2.2, 0.27, col=WARM)
        p.box('flat:#c8102e', x0 + 0.3, 2.25, 0.1, x0 + 2.2, 2.55, 0.28)
        p.box(CEDAR, x0 + 0.3, 0.85, -0.25, x0 + 2.2, 0.95, 0.28)
        doors(p, x1 - 1.4, 0, 0.27, 1.6, 2.4, CEDAR)
        quad(p, 'windowDim', 'f', x0 + 2.4, x1 - 2.4, 0.6, 2.6, 0.27, col=WARM)
    else:
        display(p, x0 + 0.3, x1 - 1.8, 0.0, 2.7, 0.28)
        doors(p, x1 - 1.0, 0, 0.27, 1.1, 2.4, ALU)
        p.box('flat:#8d9399', x0 + 0.8, 0, 0.8, x0 + 2.4, 1.2, 2.0)
    eave(p, x0, x1, 3.1, 0.3)
    board(p, 'name', 'f', x0 + 0.4, x1 - 0.4, 3.6, 4.2, 0.3, v.get('board', 'flat:#f4f1e8'), 0.05)
    for c in rows(x0 + 0.5, x1 - 0.5, 2.0):
        win(p, c - 0.7, 4.7, c + 0.7, 6.0, 0.3, -1, WFRAME)
        if r.random() < 0.5:
            p.box(LEAFY, c - 0.6, 4.55, 0.0, c + 0.6, 4.75, 0.3)
    p.prism(ROOFTILE, [(0.0, h), (d / 2, h + 1.9), (d + 0.4, h)], 'x', x0 - 0.3, x1 + 0.3)
    if v.get('blade'):
        s.body = p
        blade(s, x1 - 0.3, 3.8, 6.4, 0.3, 0.6, r=r)
    backs(p, w, d, [3.1, h], r, sides=(-1, 1), back=True)


def biru(p, s, v, r):
    """An old mid-rise block (1960s-70s) on the main road: shops in a granite base, tile above with
    deep window reveals, a stair core of glass block down one edge, a roof sign frame."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall = v.get('wall', 'flat:#c9b9a0')
    p.box(wall, x0, 0, 0.0, x1, h, d)
    p.box(GRANITE, x0 - 0.02, 0, -0.06, x1 + 0.02, 3.6, 0.0)
    shopfronts(p, s, x0 + 0.2, x1 - 2.6, -0.06, 3.6, r, bay=4.8)
    doors(p, x1 - 1.4, 0, -0.06, 1.4, 2.4, ALU)
    p.box('light', x1 - 2.2, 2.7, -0.4, x1 - 0.6, 2.75, -0.1)
    floors = int((h - 4.2) / 3.1)
    for f in range(floors):
        y = 4.2 + f * 3.1
        for c in rows(x0 + 0.5, x1 - 2.8, 2.4):
            p.box(wall, c - 0.95, y + 0.5, -0.3, c + 0.95, y + 0.62, 0.0)
            quad(p, WINDOW, 'f', c - 0.8, c + 0.8, y + 0.65, y + 2.3, -0.01)
            if r.random() < 0.35:
                acu(p, c + 0.6, y + 0.12, -0.4)
        p.box(v.get('band', 'flat:#8a7a62'), x0, y - 0.1, -0.12, x1 - 2.6, y + 0.1, 0)
    p.box('flat:#d8e2e0', x1 - 2.4, 3.6, -0.2, x1 - 0.2, h + 0.6, 0.5)
    for y in range(4, int(h)):
        p.box('flat:#c4cfcd', x1 - 2.4, y, -0.22, x1 - 0.2, y + 0.04, -0.2)
    board(p, 'vertical', 'f', x1 - 2.1, x1 - 0.5, 4.4, h - 0.8, -0.2, 'flat:#f4f1e8', 0.25)
    p.box(ROOF, x0 - 0.05, h, -0.05, x1 + 0.05, h + 0.5, d + 0.05)
    roof_frame(p, 'roof', x0 + 1.5, x1 - 3.0, h + 0.5, 1.0, 2.0)
    tank(p, x0 + 2.0, h + 0.5, d - 3.0)
    backs(p, w, d, [4.2 + f * 3.1 for f in range(floors)] + [h], r, sides=(-1, 1), back=True)


# ═════════════════════════ Boarding houses and the bath house ═════════════════════════
def geshuku(p, s, v, r):
    """A wooden boarding house: two storeys of weatherboard under a tiled roof, a sliding glass door
    with the house's name board, an outside stair to an open gallery, rooms' windows with railings and
    laundry, a bicycle or two, potted plants by the door."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall = v.get('wall', 'flat:#8a6e52')
    p.box(wall, x0, 0, 0.0, x1, h, d)
    for y in [0.3 + 0.22 * k for k in range(int((h - 0.4) / 0.22))]:
        p.box(CEDAR_DK, x0 - 0.02, y, -0.03, x1 + 0.02, y + 0.03, 0.0)
    p.box(ISHI, x0 - 0.05, 0, -0.08, x1 + 0.05, 0.3, d)
    door = x0 + 1.4
    p.box(CEDAR, door - 0.95, 0.3, -0.06, door + 0.95, 2.3, 0.0)
    quad(p, 'windowDim', 'f', door - 0.85, door + 0.85, 0.35, 2.2, -0.07, col=WARM)
    for k in range(4):
        p.box(CEDAR, door - 0.85 + k * 0.57, 0.35, -0.09, door - 0.82 + k * 0.57, 2.2, -0.07)
    p.box('light', door - 0.15, 2.4, -0.25, door + 0.15, 2.65, -0.05)
    eave(p, door - 1.2, door + 1.2, 2.5, 0.0, 0.7, 0.35)
    board(p, 'name', 'f', door + 1.15, door + 1.55, 1.0, 2.2, 0.0, 'flat:#e9e2d2', 0.04)
    for c in rows(door + 2.0, x1 - 0.4, 2.0):
        win(p, c - 0.7, 0.9, c + 0.7, 2.1, 0.0, -1, WFRAME)
    # Upper storey: windows with low railings and laundry poles.
    fy = 2.9
    p.box(CEDAR_DK, x0, fy - 0.12, -0.25, x1, fy, 0.0)
    for c in rows(x0 + 0.5, x1 - 0.5, 2.0):
        win(p, c - 0.7, fy + 0.5, c + 0.7, fy + 1.9, 0.0, -1, WFRAME)
        p.box(IRONISH, c - 0.75, fy + 0.4, -0.4, c + 0.75, fy + 0.45, -0.36)
        for k in range(6):
            p.box(IRONISH, c - 0.72 + k * 0.29, fy, -0.4, c - 0.7 + k * 0.29, fy + 0.45, -0.38)
        if r.random() < 0.6:
            p.box('metal:#c3c7cb', c - 0.9, fy + 2.0, -0.55, c + 0.9, fy + 2.03, -0.52)
            for k in range(r.randint(1, 4)):
                cx = c - 0.7 + k * 0.4
                p.box(r.choice(['flat:#f4f1e8', 'flat:#9fb6d0', 'flat:#d94f8a', 'flat:#e6dcc6', 'flat:#3f4a3a']), cx, fy + 1.3, -0.54, cx + 0.3, fy + 1.98, -0.53)
    p.prism(ROOFTILE, [(-0.6, h), (d / 2, h + 2.0), (d + 0.6, h)], 'x', x0 - 0.5, x1 + 0.5)
    for c in (x0 + 0.6, x1 - 1.6):
        p.box(TILE_BR, c, 0.3, -0.5, c + 0.4, 0.65, -0.1)
        p.box(LEAFY, c - 0.05, 0.65, -0.55, c + 0.45, 1.2, -0.05)
    backs(p, w, d, [fy, h], r, sides=(-1,), back=True)


def sento(p, s, v, r):
    """The bath house: a karahafu (curved) gable over the entrance, noren for men and women, a tiled
    roof, a tall brick chimney behind, a small yard of firewood."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(PLASTER, x0, 0, 1.2, x1, h, d)
    p.box(ISHI, x0 - 0.05, 0, 1.1, x1 + 0.05, 0.5, d)
    p.box(CEDAR, x0, 0.5, 1.15, x1, 2.6, 1.2)
    # The porch: posts, the curved gable, the doors.
    for sx in (-1, 1):
        p.box(CEDAR_DK, sx * 3.2 - 0.15, 0, -0.2, sx * 3.2 + 0.15, 3.6, 0.1)
    n = 14
    pts = []
    for k in range(n + 1):
        t = k / n
        xx = -4.0 + 8.0 * t
        yy = 4.0 + 1.6 * math.sin(math.pi * t) ** 0.7 - 0.25 * math.sin(2 * math.pi * t) ** 2
        pts.append((xx, yy))
    for k in range(n):
        (xa, ya), (xb, yb) = pts[k], pts[k + 1]
        p.face(ROOFTILE, [(xa, ya, -0.6), (xb, yb, -0.6), (xb, yb + 0.5, 1.6), (xa, ya + 0.5, 1.6)], (0, 1, -0.2))
        p.face(CEDAR_DK, [(xa, ya, -0.6), (xb, yb, -0.6), (xb, yb - 0.2, -0.6), (xa, ya - 0.2, -0.6)], (0, 0, -1))
    p.prism(PLASTER, [(-3.4, 3.6)] + [(x, y - 0.25) for x, y in pts[2:-2]] + [(3.4, 3.6)], 'z', -0.4, 1.2)
    board(p, 'name', 'f', -1.4, 1.4, 3.75, 4.35, -0.4, 'flat:#2a2019', 0.05)
    for sx in (-1, 1):
        c = sx * 1.6
        p.box(CEDAR, c - 1.2, 0.5, 1.05, c + 1.2, 2.6, 1.15)
        quad(p, 'windowDim', 'f', c - 1.1, c + 1.1, 0.55, 2.5, 1.04, col=WARM)
        noren(p, c - 1.1, c + 1.1, 2.55, 0.95, '#1f3f7a' if sx < 0 else '#b7282e')
    mark('noren_l', -1.6, 2.1, 0.9, 2.2, 0.8)
    mark('noren_r', 1.6, 2.1, 0.9, 2.2, 0.8)
    for c in rows(x0 + 0.6, -4.6, 2.2) + rows(4.6, x1 - 0.6, 2.2):
        win(p, c - 0.7, 4.0, c + 0.7, 5.6, 1.2, -1, WFRAME)
    p.prism(ROOFTILE, [(0.6, h), (d / 2, h + 3.2), (d + 0.6, h)], 'x', x0 - 0.6, x1 + 0.6)
    # The chimney behind, to 22 m.
    cx, cz = x1 - 2.2, d - 2.2
    p.box(TILE_BR, cx - 0.9, 0, cz - 0.9, cx + 0.9, 22.0, cz + 0.9)
    for y in (8.0, 14.0, 20.0):
        p.box('flat:#5a3a2a', cx - 0.95, y, cz - 0.95, cx + 0.95, y + 0.3, cz + 0.95)
    p.box('flat:#2a2622', cx - 1.0, 21.6, cz - 1.0, cx + 1.0, 22.2, cz + 1.0)
    board(p, 'chimney', 'f', cx - 0.5, cx + 0.5, 10.0, 13.5, cz - 0.9, 'flat:#f4f1e8', 0.03)
    mark('_chimney', cx, 0, cz, 1.8, 1.8)
    backs(p, w, d, [4.0, h], r, sides=(-1, 1), back=False)


IRONISH = 'flat:#3a3d41'
STYLES = {'kissa': kissa, 'kosho': kosho, 'mise': mise, 'biru': biru, 'geshuku': geshuku, 'sento': sento}


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(sum(map(ord, v['id'])) * 11)
    if v.get('mirror'):
        # Built mirrored in x (the corner on the +x side). Only for pieces whose names are all marks
        # (no lettered sign faces, which would read backwards); the marks are mirrored to match.
        body.xf = lambda q: (-q[0], q[1], q[2])
        body.xfh = lambda h: (-h[0], h[1], h[2])
    STYLES[v['style']](body, signs, v, r)
    if v.get('mirror'):
        for q in ANCH[v['id']]['pts'].values():
            q[0], q[5] = -q[0], -q[5]
    return body, signs


def build_lo(v):
    return None


D = 13.0
PIECES = [
    dict(id='kissa', style='kissa', w=12.0, d=D, h=8.0),
    dict(id='kissa_r', style='kissa', w=12.0, d=D, h=8.0, mirror=True),
    dict(id='kosho_a', style='kosho', w=5.5, d=D, h=7.6, face=COPPER, peak=True),
    dict(id='kosho_b', style='kosho', w=6.5, d=D, h=8.0, face=MORTAR),
    dict(id='kosho_c', style='kosho', w=4.6, d=D, h=7.2, face=MORTAR, board='flat:#f4f1e8'),
    dict(id='kosho_d', style='kosho', w=7.4, d=D, h=9.6, face=COPPER, arched=True),
    dict(id='kosho_e', style='kosho', w=6.0, d=D, h=8.4, face='flat:#c9b9a0', peak=True, board='flat:#f4f1e8'),
    dict(id='mise_a', style='mise', kind='teishoku', w=7.0, d=D, h=7.0, blade=True),
    dict(id='mise_b', style='mise', kind='stationer', w=6.0, d=D, h=7.2, wall='flat:#e3dccb'),
    dict(id='mise_c', style='mise', kind='tabako', w=5.4, d=D, h=6.8, wall=MORTAR, blade=True),
    dict(id='mise_d', style='mise', kind='print', w=6.6, d=D, h=7.0, board='flat:#2a2019'),
    dict(id='biru_a', style='biru', w=14.0, d=D, h=17.0),
    dict(id='biru_b', style='biru', w=11.0, d=D, h=14.0, wall='flat:#d6cdbd', band='flat:#6f8f7a'),
    dict(id='geshuku_a', style='geshuku', w=10.0, d=10.0, h=6.2),
    dict(id='geshuku_b', style='geshuku', w=12.0, d=10.0, h=6.4, wall='flat:#7a604a'),
    dict(id='geshuku_c', style='geshuku', w=8.0, d=10.0, h=6.0, wall='flat:#9a8066'),
    dict(id='sento', style='sento', w=18.0, d=13.0, h=6.6),
]


if __name__ == '__main__':
    _a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if '--only' in _a:
        _keep = _a[_a.index('--only') + 1].split(',')
        PIECES = [q for q in PIECES if q['id'] in _keep]
    for _v in PIECES:
        _v.setdefault('gap', 3.0)
    run('daigakufront', PIECES, build_hi, build_lo)
    write_anchors('daigakufront')
