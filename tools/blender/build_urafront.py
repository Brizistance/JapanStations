# Builds the fronts along Minatoura-dōri's run east to the bridge (2026-11-24, stage B of the Kawaminato-kō
# re-lay) and the two old port buildings kept in the waterfront park 湊浦緑地: a Taishō bank, a 1950s
# shipping office behind a concrete sun screen, a narrow business hotel, a scratch-tile trading house, a
# glass office over a podium, a 1970s brown-tile office, a round-cornered café, a shop-and-flats block, a
# storehouse shop (土蔵造り) and a marine-engine workshop; in the park, the brick warehouse café and the old
# customs shed (旧上屋), its steel trusses open, as a market hall. Built so no two of a block look alike.
#
#   blender --background --python tools/blender/build_urafront.py -- [--renders <dir>]
#
# Writes assets/buildings/urafront.blend, public/models/buildings/urafront.glb, src/stations/anchors/urafront.ts.
# Frame as every building script's: front at z = 0 facing -z, origin mid-frontage at ground level.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

CONC = 'flat:#c8c4ba'
CONC_D = 'flat:#a29d92'
GRAN = 'flat:#9e978a'
GRAN_D = 'flat:#7d776c'
SCRATCH = 'flat:#9a6a48'
SCRATCH_D = 'flat:#7c5338'
TILE70 = 'flat:#7a5a44'
TILE70_D = 'flat:#5e4535'
PLAST_B = 'flat:#1f1c1a'
PLAST_W = 'flat:#ece7da'
NAMAKO = 'flat:#d9d5cc'
STEEL = 'flat:#2e3236'
STEEL_G = 'flat:#56646a'
RUST = 'flat:#7b4a33'
REDBR = 'flat:#9a4f3a'
REDBR_D = 'flat:#7a3c2c'
ROOF_G = 'flat:#4b5157'
ROOF_C = 'flat:#5f8f7d'
CREAM = 'flat:#efe6cf'
NAVY = 'flat:#1d3550'


def side_windows(p, w, d, h, y0=4.0, fh=3.3):
    for face, a0, a1, at in sides(-w / 2, w / 2, 0, d, 'lr'):
        windows(p, face, a0 + 1.2, a1 - 1.2, at, y0, max(1, int((h - y0 - 0.5) / fh)), fh, 3.0, 1.2, 1.4)


def back_detail(p, w, d, h, r, y0=3.6, fh=3.3):
    ys = [y0 + k * fh for k in range(max(1, int((h - y0 - 0.5) / fh)))] + [h]
    backs(p, w, d, ys, r, sides=(-1, 1), back=True)


def bank(p, s, v, r):
    """A Taishō bank: granite base, four giant pilasters with capitals, tall arched-top windows between, an
    attic with the name, a pedimented door in the middle."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(v['wall'], x0, 0, 0, x1, h, d)
    p.box(GRAN_D, x0 - 0.1, 0, -0.15, x1 + 0.1, 1.2, d)
    pil = [x0 + 0.9 + k * (w - 1.8) / 3 for k in range(4)]
    for c in pil:
        p.box(v['trim'], c - 0.55, 1.2, -0.45, c + 0.55, h - 3.2, 0)
        p.box(v['trim'], c - 0.75, h - 3.6, -0.6, c + 0.75, h - 3.2, 0)
        p.box(v['trim'], c - 0.7, 1.2, -0.55, c + 0.7, 1.6, 0)
    for k in range(3):
        a, e = pil[k] + 0.9, pil[k + 1] - 0.9
        if k == 1:
            doors(p, (a + e) / 2, 0, -0.05, 2.6, 3.2, BRASS)
            p.prism(v['trim'], [(-0.7, 4.0), (0.0, 4.0), (0.0, 4.9), (-0.7, 4.5)], 'x', a - 0.2, e + 0.2)
            quad(p, WINDOW, 'f', a + 0.3, e - 0.3, 5.4, h - 4.4, -0.01)
        else:
            quad(p, 'windowDim', 'f', a, e, 1.8, h - 4.4, -0.01, col=WARM)
            for yy in range(3):
                p.box(BRONZE, a, 2.6 + yy * 2.6, -0.05, e, 2.68 + yy * 2.6, -0.01)
        p.box(v['trim'], a - 0.1, h - 4.4, -0.12, e + 0.1, h - 4.1, 0)
    p.box(v['trim'], x0 - 0.3, h - 3.2, -0.7, x1 + 0.3, h - 2.6, d)
    board(p, 'name', 'f', x0 + 2.0, x1 - 2.0, h - 2.4, h - 0.9, 0, 'flat:#2a2622', 0.1)
    p.box(v['trim'], x0 - 0.15, h - 0.4, -0.3, x1 + 0.15, h, d)
    side_windows(p, w, d, h, 2.0, 4.2)
    back_detail(p, w, d, h, r)


def screen_office(p, s, v, r):
    """A 1950s shipping office: a concrete frame filled with a sun screen of deep fins and shelves
    (brise-soleil), a glazed ground floor set back under it on pilotis, the line's flag on the roof."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(v['wall'], x0, 4.2, 0.4, x1, h, d)
    p.box(CONC_D, x0 + 0.4, 0, 1.8, x1 - 0.4, 4.2, d)
    quad(p, 'windowDim', 'f', x0 + 0.6, x1 - 0.6, 0.2, 3.9, 1.79, col=SHOP)
    doors(p, 0, 0, 1.75, 2.4, 2.8, ALU_DK)
    for c in rows(x0 + 0.4, x1 - 0.4, 5.0):
        p.box(v['wall'], c - 0.3, 0, 0.4, c + 0.3, 4.2, 1.0)
    floors = int((h - 5.0) / 3.4)
    for f in range(floors):
        y = 4.6 + f * 3.4
        quad(p, WINDOW, 'f', x0 + 0.5, x1 - 0.5, y + 0.6, y + 2.6, 0.39)
        p.box(v['wall'], x0, y + 2.9, -0.6, x1, y + 3.1, 0.4)
    for c in rows(x0 + 0.2, x1 - 0.2, 1.4):
        p.box(v['wall'], c - 0.08, 4.4, -0.6, c + 0.08, h - 0.6, 0.4)
    p.box(v['trim'], x0 - 0.1, h - 0.6, -0.7, x1 + 0.1, h, d)
    board(p, 'name', 'f', x0 + 1.0, x1 - 1.0, 4.25, 4.95, -0.62, 'flat:#f4f1e8', 0.08)
    p.box(STEEL, x0 + 1.5, h, 2.0, x0 + 1.6, h + 6.0, 2.1)
    p.box(v.get('flag', 'flat:#c8102e'), x0 + 1.6, h + 4.6, 2.03, x0 + 3.2, h + 5.7, 2.07)
    side_windows(p, w, d, h, 4.6, 3.4)
    back_detail(p, w, d, h, r, 4.6, 3.4)


def biz_hotel(p, s, v, r):
    """A narrow business hotel: a pale tiled slab, small paired windows up it, a lit vertical sign on the
    corner, a canopy and glass doors, an AC unit on every room's ledge."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(v['wall'], x0, 0, 0, x1, h, d)
    quad(p, 'windowDim', 'f', x0 + 0.4, x1 - 1.6, 0.2, 3.0, -0.01, col=WARM)
    doors(p, -0.6, 0, -0.03, 2.2, 2.6, ALU_DK)
    p.box(NAVY, x0, 3.1, -1.6, x1 - 1.2, 3.35, 0)
    p.box('light', x0 + 0.3, 3.05, -1.4, x1 - 1.5, 3.1, -0.3)
    y = 4.2
    while y < h - 2.0:
        for c in rows(x0 + 0.6, x1 - 1.6, 2.0):
            quad(p, WINDOW, 'f', c - 0.6, c + 0.6, y + 0.8, y + 2.0, -0.01)
            p.box(CONC_D, c - 0.7, y + 0.6, -0.35, c + 0.7, y + 0.7, 0)
            if r.random() < 0.6:
                p.box(PLAST_W, c - 0.35, y + 0.7, -0.33, c + 0.35, y + 1.2, -0.05)
        y += 2.9
    p.box(v['trim'], x0 - 0.1, h - 0.5, -0.15, x1 + 0.1, h, d)
    board(p, 'vertical', 'f', x1 - 1.3, x1 - 0.2, 4.5, h - 1.5, 0, 'flat:#f4f1e8', 0.45)
    board(p, 'name', 'f', x0 + 0.6, x1 - 1.8, 3.5, 4.0, 0, 'flat:#1d3550', 0.06)
    side_windows(p, w, d, h, 4.2, 2.9)
    back_detail(p, w, d, h, r, 4.2, 2.9)


def scratch(p, s, v, r):
    """A 1930s trading house in brown scratch tile (スクラッチタイル): vertical piers running through, terracotta
    spandrels, round-arched windows at the top floor, a stepped parapet, a shop front of bronze and glass."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(SCRATCH, x0, 0, 0, x1, h, d)
    display(p, x0 + 0.5, x1 - 0.5, 0.0, 3.4, -0.02)
    p.box(GRAN_D, x0, 0, -0.1, x1, 0.5, d)
    board(p, 'name', 'f', x0 + 0.6, x1 - 0.6, 3.6, 4.3, 0, 'flat:#e8dcb8', 0.08)
    piers = list(rows(x0 + 0.3, x1 - 0.3, 2.4))
    floors = int((h - 6.5) / 3.3)
    for f in range(floors):
        y = 4.8 + f * 3.3
        for c in piers:
            quad(p, WINDOW, 'f', c - 0.75, c + 0.75, y + 0.5, y + 2.5, -0.01)
            p.box('flat:#c49a6c', c - 0.85, y + 0.1, -0.06, c + 0.85, y + 0.45, 0)
    yt = 4.8 + floors * 3.3
    for c in piers:
        quad(p, WINDOW, 'f', c - 0.6, c + 0.6, yt + 0.4, yt + 1.8, -0.01)
        p.cyl(WINDOW, (c, yt + 1.8, -0.01), 2, 0.6, 0.02, seg=12)
    for c in piers:
        p.box(SCRATCH_D, c - 1.2 - 0.12, 4.4, -0.2, c - 1.2 + 0.12, h - 0.6, 0)
    p.box(SCRATCH_D, x1 - 0.12, 4.4, -0.2, x1, h - 0.6, 0)
    for k, (a, e) in enumerate(((x0, x1), (x0 + 1.5, x1 - 1.5), (-1.8, 1.8))):
        p.box('flat:#c49a6c', a, h - 0.6 + k * 0.6, -0.25, e, h + k * 0.6, 0.6)
    side_windows(p, w, d, h, 4.8, 3.3)
    back_detail(p, w, d, h, r, 4.8, 3.3)


def glass(p, s, v, r):
    """A glass office over a two-storey stone podium (the 1990s redevelopment), set back above the podium."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(GRAN, x0, 0, 0, x1, 8.0, d)
    shopfronts(p, s, x0, x1, 0, 4.4, r, bay=5.0, door=0.0, awn=False)
    quad(p, WINDOW, 'f', x0 + 0.6, x1 - 0.6, 5.0, 7.4, -0.01)
    board(p, 'name', 'f', x0 + 1.0, x0 + 1.0 + min(9.0, w - 2.0), 7.55, 7.95, 0, 'flat:#1f2023', 0.05)
    curtain(p, x0 + 1.0, x1 - 1.0, 2.5, d, 8.0, h, glass=v.get('glass', GLASS_GN), fh=4.0, bay=1.6)
    p.box(ALU_DK, x0 + 0.8, h, 2.3, x1 - 0.8, h + 0.6, d)
    board(p, 'roof', 'f', x0 + 2.0, x1 - 2.0, h + 0.8, h + 2.4, 2.3, 'flat:#f4f1e8', 0.1)
    back_detail(p, w, d, 8.0, r, 4.4, 3.6)


def tile70(p, s, v, r):
    """A 1970s office in dark brown tile: deep horizontal bands of tile and slots of window between, a
    corner of bay windows, an illuminated sign box on the roof, a coffee shop on the ground floor."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(TILE70, x0, 0, 0, x1, h, d)
    shopfronts(p, s, x0, x1, 0, 3.8, r, bay=4.4, door=x1 - 2.2)
    floors = int((h - 5.0) / 3.4)
    for f in range(floors):
        y = 4.4 + f * 3.4
        quad(p, WINDOW, 'f', x0 + 0.3, x1 - 0.3, y + 1.2, y + 2.6, -0.01)
        p.box(TILE70_D, x0 - 0.05, y + 1.05, -0.3, x1 + 0.05, y + 1.2, 0)
        for c in rows(x0 + 0.3, x1 - 0.3, 1.8):
            p.box(ALU_DK, c - 0.9 - 0.03, y + 1.2, -0.03, c - 0.9 + 0.03, y + 2.6, -0.01)
    roof_frame(p, 'roof', x0 + 1.0, x1 - 1.0, h, 3.0, 2.4)
    side_windows(p, w, d, h, 4.4, 3.4)
    back_detail(p, w, d, h, r, 4.4, 3.4)


def cafe(p, s, v, r):
    """A two-storey corner café of the 1930s: white render, a rounded glass corner on the +x side, a
    striped awning round it, steel windows upstairs, a little roof terrace with a rail."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(PLAST_W, x0, 0, 0, x1 - 2.5, h, d)
    p.cyl(PLAST_W, (x1 - 2.5, h / 2, 2.5), 1, 2.5, h, seg=20)
    p.box(PLAST_W, x1 - 2.5, 0, 2.5, x1, h, d)
    quad(p, 'windowDim', 'f', x0 + 0.4, x1 - 2.8, 0.3, 2.8, -0.01, col=WARM)
    p.cyl('windowDim', (x1 - 2.5, 1.55, 2.5), 1, 2.52, 2.5, seg=20, caps=False)
    doors(p, x0 + 1.6, 0, -0.03, 1.4, 2.4, BRASS)
    aw = v.get('awn', '#12382c')
    for j in range(8):
        u0, u1 = x0 + 0.2 + (w - 2.9) * j / 8, x0 + 0.2 + (w - 2.9) * (j + 1) / 8
        col = 'flat:' + aw if j % 2 == 0 else 'flat:#f1ead8'
        p.face(col, [(u0, 3.2, -0.02), (u1, 3.2, -0.02), (u1, 2.8, -1.2), (u0, 2.8, -1.2)], (0, 0.9, -0.4))
        p.face(col, [(u1, 3.2, -0.02), (u0, 3.2, -0.02), (u0, 2.8, -1.2), (u1, 2.8, -1.2)], (0, -0.9, 0.4))
    board(p, 'name', 'f', x0 + 0.5, x1 - 3.0, 3.35, 3.95, 0, 'flat:' + aw, 0.06)
    for c in rows(x0 + 0.6, x1 - 2.8, 1.8):
        quad(p, WINDOW, 'f', c - 0.6, c + 0.6, 4.6, 6.1, -0.01)
        p.box(STEEL, c - 0.6, 5.33, -0.04, c + 0.6, 5.37, -0.01)
    p.box(NAVY, x0, h - 0.35, -0.1, x1 - 2.5, h, d)
    for c in rows(x0 + 0.2, x1 - 0.2, 0.4):
        p.box(STEEL, c - 0.015, h, 1.0, c + 0.015, h + 1.0, 1.03)
    p.box(STEEL, x0 + 0.2, h + 0.95, 1.0, x1 - 0.2, h + 1.0, 1.06)
    for face, a0, a1, at in sides(x0, x1, 2.5, d, 'lr'):
        windows(p, face, a0 + 1.0, a1 - 1.0, at, 4.6, 1, 3.0, 2.4, 1.2, 1.5)
    backs(p, w, d, [3.6, h], r, sides=(), back=True)


def mansion(p, s, v, r):
    """Shops below, flats above (下駄履きマンション): a row of small shops with their own signs, then storeys of
    flats with deep balconies, laundry and plants, a stair core on one side."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(v['wall'], x0, 0, 1.4, x1, h, d)
    p.box(CONC_D, x0, 0, 0, x1, 3.8, 1.4)
    shopfronts(p, s, x0, x1 - 2.6, 0, 3.6, r, bay=3.6)
    p.box(CONC_D, x1 - 2.6, 0, -0.05, x1, h + 1.5, 1.4)
    for f in range(int((h - 4.6) / 2.9)):
        y = 4.0 + f * 2.9
        p.box(v['wall'], x0, y, -0.2, x1 - 2.6, y + 0.18, 1.4)
        p.box('flat:#d8d2c4', x0, y + 0.18, -0.2, x1 - 2.6, y + 1.1, -0.05)
        quad(p, 'windowDim', 'f', x0 + 0.5, x1 - 3.1, y + 0.3, y + 2.4, 1.39, col=WARM)
        for c in rows(x0 + 0.6, x1 - 3.0, 3.2):
            if r.random() < 0.5:
                p.box('flat:' + r.choice(['#e8e4da', '#7a95b8', '#c46a5a', '#e3d18a']), c - 0.6, y + 1.3, 0.5, c + 0.6, y + 2.0, 0.52)
            if r.random() < 0.5:
                p.cyl('flat:#3f6f4a', (c + 0.9, y + 1.4, 0.0), 1, 0.25, 0.5, seg=8)
        p.box(v['wall'], x1 - 2.6 - 0.2, y, -0.2, x1 - 2.6, y + 1.1, 1.4)
    p.box(CONC_D, x0, h - 0.3, -0.25, x1, h, d)
    backs(p, w, d, [3.8 + k * 2.9 for k in range(int((h - 4.6) / 2.9))] + [h], r, sides=(-1, 1), back=True)


def kura(p, s, v, r):
    """A storehouse shop (土蔵造り): thick black plaster walls, a heavy tiled roof with a deep ridge, the
    namako lattice of tiles on the lower walls, iron-shuttered windows upstairs, a shop open under a pent roof."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(PLAST_B, x0, 0, 0, x1, h, d)
    p.box(NAMAKO, x0, 0, -0.06, x1, 1.0, d)
    for c in rows(x0 + 0.1, x1 - 0.1, 0.35):
        p.box(PLAST_W, c - 0.03, 0, -0.08, c + 0.03, 1.0, -0.06)
    p.box('flat:#2a2019', x0 + 0.5, 0, -0.03, x1 - 0.5, 2.8, 0)
    quad(p, 'windowDim', 'f', x0 + 0.8, x1 - 0.8, 0.3, 2.6, -0.04, col=WARM)
    p.prism(ROOF_G, [(0.02, 3.4), (-1.1, 3.0), (-1.1, 2.9), (0.02, 3.3)], 'x', x0 - 0.1, x1 + 0.1)
    board(p, 'name', 'f', x0 + 0.6, x1 - 0.6, 3.6, 4.3, 0, 'flat:#2a2019', 0.12)
    for c in rows(x0 + 1.2, x1 - 1.2, 3.0):
        p.box(STEEL, c - 0.75, 5.0, -0.15, c + 0.75, 6.2, 0)
        p.box(PLAST_W, c - 0.85, 4.9, -0.18, c + 0.85, 5.0, 0)
    zc = d / 2
    p.prism(ROOF_G, [(-0.6, h - 0.1), (zc, h + 2.3), (d + 0.6, h - 0.1), (d + 0.6, h - 0.3), (zc, h + 2.1), (-0.6, h - 0.3)], 'x', x0 - 0.5, x1 + 0.5)
    p.box(ROOF_G, x0 - 0.6, h + 2.2, zc - 0.35, x1 + 0.6, h + 2.7, zc + 0.35)
    backs(p, w, d, [3.4, h], r, sides=(-1, 1), back=True)


def workshop(p, s, v, r):
    """A marine-engine workshop: corrugated steel over a frame, a wide roller shutter half up with an
    outboard motor on a stand inside, a sign board, a sawtooth of roof lights."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(STEEL_G, x0, 0, 0, x1, h, d)
    for c in rows(x0, x1, 0.3):
        p.box('flat:#4a565b', c - 0.04, 0.5, -0.04, c + 0.04, h - 0.4, 0)
    p.box('flat:#20262a', x0 + 0.8, 0, -0.05, x1 - 2.6, 2.4, 0)
    p.box('flat:#8d9399', x0 + 0.8, 2.4, -0.08, x1 - 2.6, 4.0, -0.02)
    p.box('flat:#c84b1c', x0 + 2.0, 0.6, 0.6, x0 + 2.6, 1.7, 1.0)
    p.box(STEEL, x0 + 2.2, 0, 0.7, x0 + 2.4, 0.6, 0.9)
    doors(p, x1 - 1.5, 0, -0.03, 1.2, 2.2, ALU_DK)
    board(p, 'name', 'f', x0 + 0.8, x1 - 0.8, 4.3, 5.1, 0, 'flat:#f4f1e8', 0.08)
    for k in range(3):
        z0 = 1.0 + k * (d - 2) / 3
        p.prism(STEEL_G, [(z0, h), (z0, h + 1.4), (z0 + (d - 2) / 3, h)], 'x', x0, x1)
        quad(p, WINDOW, 'f', x0 + 0.3, x1 - 0.3, h + 0.1, h + 1.3, z0 - 0.01)
    backs(p, w, d, [3.0, h], r, sides=(-1, 1), back=True)


def renga(p, s, v, r):
    """The park's brick warehouse (c. 1911), now a café: red brick in English bond, iron shutters folded
    open on every bay, an arcade of arched doors on the long front, a slate gable roof, a glass café box
    and a timber deck before it, the house number on the gable."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(REDBR, x0, 0, 0, x1, h, d)
    p.box(GRAN_D, x0 - 0.1, 0, -0.1, x1 + 0.1, 0.6, d + 0.1)
    bays = list(rows(x0 + 1.0, x1 - 1.0, 4.0))
    for c in bays:
        quad(p, 'windowDim', 'f', c - 1.2, c + 1.2, 0.6, 3.2, -0.01, col=WARM)
        arch(p, REDBR_D, 'f', c - 1.4, c + 1.4, 3.2, 3.6, 4.0, 0.0, 0.25, n=8)
        # The iron shutters, folded open flat beside each door.
        p.box(STEEL, c - 1.95, 0.6, -0.12, c - 1.45, 3.3, -0.06)
        p.box(STEEL, c + 1.45, 0.6, -0.12, c + 1.95, 3.3, -0.06)
        quad(p, WINDOW, 'f', c - 0.8, c + 0.8, 5.6, 7.6, -0.01)
        p.box(STEEL, c - 1.05, 5.5, -0.1, c - 0.85, 7.7, -0.04)
        p.box(STEEL, c + 0.85, 5.5, -0.1, c + 1.05, 7.7, -0.04)
        p.box(REDBR_D, c - 0.95, 7.6, -0.08, c + 0.95, 7.9, 0)
    for c in [x0 + 0.25, x1 - 0.25] + [c - 2.0 for c in bays[1:]]:
        p.box(REDBR_D, c - 0.25, 0.6, -0.2, c + 0.25, h, 0)
    p.box(CREAM, x0 - 0.05, 4.4, -0.12, x1 + 0.05, 4.6, d + 0.05)
    p.box(REDBR_D, x0 - 0.2, h - 0.5, -0.3, x1 + 0.2, h, d + 0.2)
    zc = d / 2
    p.prism('flat:#3c4248', [(-0.5, h), (zc, h + 4.2), (d + 0.5, h), (d + 0.5, h - 0.2), (zc, h + 4.0), (-0.5, h - 0.2)], 'x', x0 - 0.4, x1 + 0.4)
    # The gable ends in brick.
    p.prism(REDBR, [(0, h), (zc, h + 4.0), (d, h)], 'x', x0, x0 + 0.3)
    p.prism(REDBR, [(0, h), (zc, h + 4.0), (d, h)], 'x', x1 - 0.3, x1)
    mark('number', x1 + 0.02, h + 1.4, zc, 1.6, 1.6, (1, 0))
    board(p, 'name', 'f', -6.0, 6.0, 4.75, 5.4, 0, 'flat:#2a2622', 0.1)
    # The café's glass box and deck on the front, under the arcade's middle.
    p.box('flat:#d8cdb4', -9.0, 0, -6.0, 9.0, 0.25, 0)
    for c in rows(-8.5, 8.5, 3.4):
        p.box('flat:' + r.choice(['#12382c', '#7a1f2b', '#f1ead8']), c - 1.2, 2.3, -4.6, c + 1.2, 2.4, -2.2)
        p.box(STEEL, c - 0.03, 0.25, -3.43, c + 0.03, 2.3, -3.37)
    backs(p, w, d, [4.4, h], r, sides=(-1, 1), back=True)


def uwaya(p, s, v, r):
    """The old customs shed (旧上屋, 1930), now a market hall: a long open shed of riveted steel trusses on
    steel columns, its sides glazed between the columns, a low-pitched roof with a clerestory down the
    ridge, roller doors folded up, the stall awnings inside."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box('flat:#8f8a7f', x0, 0, 0, x1, 0.25, d)
    cols = list(rows(x0, x1, 6.0)) + [x1 - 0.2]
    for c in [x0 + 0.2] + cols:
        for zz in (0.2, d - 0.2):
            p.box(STEEL_G, c - 0.2, 0, zz - 0.2, c + 0.2, h, zz + 0.2)
    for c in [x0 + 0.2] + cols:
        p.prism(STEEL_G, [(0, h), (d / 2, h + 3.0), (d, h), (d, h - 0.3), (d / 2, h + 2.7), (0, h - 0.3)], 'x', c - 0.12, c + 0.12)
        for k in range(1, 6):
            zz = d * k / 6
            yy = h + 3.0 * (1 - abs(zz - d / 2) / (d / 2))
            p.box(STEEL_G, c - 0.05, h - 0.3, zz - 0.05, c + 0.05, yy, zz + 0.05)
    p.prism(ROOF_C, [(-0.6, h - 0.15), (d / 2 - 1.5, h + 2.25), (d / 2 - 1.5, h + 2.1), (-0.6, h - 0.3)], 'x', x0 - 0.4, x1 + 0.4)
    p.prism(ROOF_C, [(d / 2 + 1.5, h + 2.25), (d + 0.6, h - 0.15), (d + 0.6, h - 0.3), (d / 2 + 1.5, h + 2.1)], 'x', x0 - 0.4, x1 + 0.4)
    p.box(ROOF_C, x0 - 0.4, h + 3.6, d / 2 - 1.8, x1 + 0.4, h + 3.75, d / 2 + 1.8)
    for zz in (d / 2 - 1.5, d / 2 + 1.5):
        quad(p, WINDOW, 'f', x0, x1, h + 2.2, h + 3.6, zz)
    # The long sides glazed between columns, the doors up (dark openings) on every third bay.
    for k, c in enumerate(cols[:-1]):
        a, e = c + 0.25, c + 5.75
        if k % 3 == 1:
            p.box('flat:#2a2622', a, 0.25, -0.02, e, h - 1.0, 0.0)
            p.box(STEEL, a, h - 1.0, -0.1, e, h - 0.4, 0.0)
        else:
            quad(p, 'windowDim', 'f', a, e, 0.8, h - 0.6, -0.01, col=WARM)
            p.box(STEEL_G, a, 2.6, -0.06, e, 2.7, -0.01)
        p.box('flat:' + r.choice(['#7a1f2b', '#1f3f7a', '#8a6a2c', '#12382c']), a + 0.6, 2.5, 2.0, e - 0.6, 2.6, 4.0)
    p.box(STEEL_G, x0, h - 0.5, -0.25, x1, h, 0.25)
    board(p, 'name', 'f', -7.0, 7.0, h - 0.45, h + 0.6, -0.26, 'flat:#e8dcb8', 0.1)
    for face, a0, a1, at in sides(x0, x1, 0, d, 'b'):
        windows(p, face, a0 + 1.0, a1 - 1.0, at, 0.8, 1, 3.0, 6.0, 4.2, 0.0)


STYLES = {'bank': bank, 'screen': screen_office, 'bizhotel': biz_hotel, 'scratch': scratch, 'glass': glass, 'tile70': tile70,
          'cafe': cafe, 'mansion': mansion, 'kura': kura, 'workshop': workshop, 'renga': renga, 'uwaya': uwaya}


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(v['seed'])
    STYLES[v['style']](body, signs, v, r)
    return body, signs


def build_lo(v):
    return None


VARIANTS = [
    dict(id='bank', style='bank', w=19.0, d=13.4, h=16.0, wall='flat:#d6cfbd', trim='flat:#b9b09b', seed=1),
    dict(id='screen', style='screen', w=18.0, d=13.4, h=22.0, wall='flat:#cfcbc0', trim='flat:#9a958a', seed=2),
    dict(id='bizhotel', style='bizhotel', w=9.0, d=13.4, h=27.0, wall='flat:#e1dcd0', trim='flat:#8a8f94', seed=3),
    dict(id='scratch', style='scratch', w=14.0, d=13.4, h=18.5, seed=4),
    dict(id='glass', style='glass', w=22.0, d=13.4, h=38.0, seed=5),
    dict(id='tile70', style='tile70', w=13.0, d=13.4, h=21.0, seed=6),
    dict(id='cafe', style='cafe', w=10.0, d=12.0, h=7.6, seed=7),
    dict(id='mansion', style='mansion', w=12.0, d=12.0, h=19.6, wall='flat:#e6e1d4', seed=8),
    dict(id='mansion_b', style='mansion', w=15.0, d=12.0, h=14.0, wall='flat:#d9cbb4', seed=18),
    dict(id='kura', style='kura', w=8.0, d=11.0, h=7.4, seed=9),
    dict(id='workshop', style='workshop', w=10.0, d=12.0, h=6.6, seed=10),
    dict(id='renga', style='renga', w=40.0, d=16.0, h=11.0, seed=21),
    dict(id='uwaya', style='uwaya', w=36.0, d=18.0, h=7.5, seed=22),
]
for _v in VARIANTS:
    _v['gap'] = 6.0


if __name__ == '__main__':
    run('urafront', VARIANTS, build_hi, build_lo)
    write_anchors('urafront')
