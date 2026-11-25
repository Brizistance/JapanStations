# Builds the generic buildings of a government and office district (官庁街, docs/theme-notes.md "Civic axis",
# after the streets round Kobe's city hall): joint government offices in precast grids, 1970s finned ward and
# bureau offices, a telephone exchange with its microwave tower, a stone-clad bank, glass insurance offices,
# ribbon-window company offices, and a low tiled survivor from the 1960s. Theme set: no station's name is in it.
#
#   blender --background --python tools/blender/build_civic.py -- [--renders <dir>]
#
# Writes assets/buildings/civic.blend, public/models/buildings/civic.glb and src/stations/anchors/civic.ts.
# The game letters `name` (a board over the entrance canopy) on every one, and `plate` (the stone plaque by
# the door). Every building is dressed on all four sides (street storey, windows), so any can stand on a corner.
#
#   m*  avenue buildings, 30 m deep, 26 to 31 m high (the 31 m cornice line), 18 to 30 m wide
#   b*  back-street buildings, 26 m deep, 11 to 24 m high, 14 to 24 m wide

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

GRANITE_PALE = 'flat:#e7e6e1'
NAVY = 'flat:#23395b'
WARM_C = 'flat:#ffe2b0'
GH = 4.6


def storey(p, v, base, trim):
    """The street storey on all four sides: glazed bays between piers on a low base, a fascia band; on the front
    the entrance under a flat canopy with a lit soffit, the name board over it and a plaque beside it."""
    w, d = v['w'], v['d']
    x0, x1 = -w / 2, w / 2
    p.box(base, x0, 0, 0, x1, GH, d)
    dw = 3.4
    for face, a0, a1, at in sides(x0, x1, 0, d):
        n = max(2, round((a1 - a0 - 1.2) / 4.2))
        bw = (a1 - a0 - 1.2) / n
        for k in range(n + 1):
            c = a0 + 0.6 + k * bw
            slab(p, trim, face, c - 0.3, c + 0.3, 0, GH - 0.4, at, 0.12)
        for k in range(n):
            a, e = a0 + 0.6 + k * bw + 0.3, a0 + 0.6 + (k + 1) * bw - 0.3
            if face == 'f' and a < dw / 2 + 0.4 and e > -dw / 2 - 0.4:
                continue
            g = out(face, at, 0.03)
            if face == 'b' and k % 2:
                # The back: every other bay is a service shutter.
                slab(p, 'metal:#a7acb1', face, a, e, 0, 3.2, at, 0.05)
                continue
            quad(p, GLASS_DK, face, a, e, 0.6, GH - 1.15, g)
            quad(p, 'windowDim', face, a, e, GH - 1.1, GH - 0.55, g, col=WARM_C)
            slab(p, ALU_DK, face, a, e, GH - 1.15, GH - 1.1, at, 0.06)
            slab(p, ALU_DK, face, (a + e) / 2 - 0.03, (a + e) / 2 + 0.03, 0.6, GH - 1.15, at, 0.06)
    band(p, trim, x0, x1, 0, d, GH - 0.4, GH, 0.16)
    # The entrance: a recess of dark glass doors, a canopy, the board, the plaque.
    p.box(ALU_DK, -dw / 2 - 0.1, 0, -0.06, dw / 2 + 0.1, 3.05, 0.0)
    for a, e in ((-dw / 2, -0.03), (0.03, dw / 2)):
        quad(p, GLASS_DK, 'f', a, e, 0.06, 2.5, -0.07)
        p.box(ALU, (a + e) / 2 - 0.02, 0.95, -0.12, (a + e) / 2 + 0.02, 1.45, -0.07)
    quad(p, 'windowDim', 'f', -dw / 2, dw / 2, 2.56, 3.0, -0.07, col=WARM_C)
    p.box(ALU_DK, -dw / 2 - 0.9, 3.1, -1.7, dw / 2 + 0.9, 3.28, 0.0)
    p.box('light', -dw / 2 - 0.5, 3.07, -1.4, dw / 2 + 0.5, 3.1, -0.3)
    bw2 = min(7.0, w - 5.0)
    board(p, 'name', 'f', -bw2 / 2, bw2 / 2, 3.42, 4.0, 0.0, col='flat:#f1efe8', proud=0.14)
    p.box('flat:#55585c', dw / 2 + 0.55, 1.15, -0.05, dw / 2 + 1.35, 1.75, 0.0)
    mark('plate', dw / 2 + 0.95, 1.45, -0.06, 0.74, 0.54)


def roof(p, v, r, y):
    w, d = v['w'], v['d']
    plant(p, -w / 2 + 0.4, w / 2 - 0.4, y, 0.4, d - 0.4, seed=v['seed'])


def godo(p, v, r):
    """Joint government offices: a precast grid of square windows, a deep cornice, flagpoles on the parapet."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    storey(p, v, GRANITE, v['trim'])
    grid(p, x0, x1, 0, d, GH, h - 1.2, v['wall'], fh=3.7, bay=3.3, ww=2.2, wh=1.9, sill=1.0, frame=v['trim'])
    p.box(v['wall'], x0, h - 1.2, 0, x1, h, d)
    band(p, v['trim'], x0, x1, 0, d, h - 1.2, h - 0.8, 0.3)
    for x in (-1.2, 0, 1.2):
        p.cyl(STEEL, (x, h + 2.5, 0.6), 1, 0.05, 5.0, seg=6)
    roof(p, v, r, h)


def fin(p, v, r):
    """A 1970s bureau office: ribbon windows behind close-set concrete fins, a blank stair tower at one end."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    storey(p, v, 'flat:#8d8a82', v['trim'])
    ribbon(p, x0, x1, 0, d, GH, h, v['wall'], fh=3.6, wh=1.9, sill=0.9)
    fins(p, v['trim'], x0 + 3.4, x1, 0, d, GH + 0.3, h - 0.3, 1.65, w=0.22, proud=0.55, which='f')
    fins(p, v['trim'], x0, x1, 0, d, GH + 0.3, h - 0.3, 3.3, w=0.22, proud=0.35, which='lrb')
    p.box(v['wall'], x0, GH, -0.5, x0 + 3.2, h + 2.6, 5.0)
    for y in [GH + 2.0 + 3.6 * i for i in range(int((h - GH - 2) / 3.6))]:
        quad(p, WINDOW, 'f', x0 + 1.2, x0 + 2.0, y, y + 1.6, -0.52)
    roof(p, v, r, h)


def denwa(p, v, r):
    """A telephone exchange: tile walls with narrow slit windows and louvre bands, a steel microwave tower on the roof."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    storey(p, v, GRANITE, v['trim'])
    grid(p, x0, x1, 0, d, GH, h, v['wall'], fh=4.4, bay=4.8, ww=0.7, wh=2.4, sill=1.1, frame=v['trim'])
    for y in [GH + 4.4 * i for i in range(1, int((h - GH) / 4.4))]:
        band(p, v['trim'], x0, x1, 0, d, y - 0.15, y + 0.15, 0.06)
    for face, a0, a1, at in sides(x0, x1, 0, d, 'f'):
        slab(p, 'flat:#6f7478', face, a1 - 5.0, a1 - 1.0, h - 3.6, h - 0.8, at, 0.08)
    p.box(v['wall'], x0, h, 0, x1, h + 1.0, 0.3)
    plant(p, x0 + 0.4, x1 - 0.4, h, 0.4, d - 0.4, seed=v['seed'])
    mast(p, 0, h, d * 0.55, 18.0, w=4.2)
    for a in (0, 1, 2):
        p.cyl(WHITE, (math.cos(a * 2.1) * 1.6, h + 9.5 + a * 2.2, d * 0.55 + math.sin(a * 2.1) * 1.6), 0 if a != 1 else 2, 0.9, 0.5, seg=12)


def bank(p, v, r):
    """A bank's regional head office: pale stone, a tall street storey of square piers, deep-set windows, a heavy cornice."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    storey(p, v, GRANITE, STONE_DK)
    grid(p, x0, x1, 0, d, GH, h - 1.6, v['wall'], fh=3.9, bay=3.0, ww=1.5, wh=2.3, sill=0.9, frame=STONE_DK)
    for face, a0, a1, at in sides(x0, x1, 0, d, 'flr'):
        n = max(2, round((a1 - a0) / 6.0))
        for k in range(n + 1):
            c = a0 + k * (a1 - a0) / n
            slab(p, v['trim'], face, max(a0, c - 0.45), min(a1, c + 0.45), 0, h - 1.6, at, 0.28)
    p.box(v['wall'], x0, h - 1.6, 0, x1, h, d)
    band(p, v['trim'], x0, x1, 0, d, h - 1.6, h - 1.1, 0.45)
    band(p, v['trim'], x0, x1, 0, d, h - 0.25, h, 0.2)
    roof(p, v, r, h)


def glass(p, v, r):
    """An insurance or trust company's office from the 1990s: a blue-green curtain wall between stone end piers."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    storey(p, v, GRANITE, ALU_DK)
    curtain(p, x0 + 1.4, x1 - 1.4, 0.15, d, GH, h - 0.8, glass=v.get('glass', GLASS_GN), mull=ALU, fh=3.8, bay=1.5, sp=0.95, which='fb')
    for xa, xb in ((x0, x0 + 1.4), (x1 - 1.4, x1)):
        grid(p, xa, xb, 0, d, GH, h, v['wall'], fh=3.8, bay=4.0, ww=1.6, wh=1.8, sill=1.0, which='lr' if xa == x0 else 'rl')
    p.box(v['wall'], x0, h - 0.8, 0, x1, h, d)
    band(p, ALU_DK, x0, x1, 0, d, h - 0.3, h, 0.12)
    roof(p, v, r, h)


def ribbons(p, v, r):
    """A company office of the 1960s: ribbon windows round every floor, tile spandrels, rounded by nothing: plain and good."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    storey(p, v, 'flat:#77736a', v['trim'])
    ribbon(p, x0, x1, 0, d, GH, h, v['wall'], fh=3.5, wh=1.6, sill=1.0)
    for y in [GH + 3.5 * i for i in range(1, int((h - GH) / 3.5) + 1)]:
        band(p, v['trim'], x0, x1, 0, d, y - 0.12, y + 0.04, 0.08)
    p.box(v['wall'], x0, h, 0, x1, h + 0.9, 0.25)
    roof(p, v, r, h)


def old(p, v, r):
    """A low survivor from before the district was rebuilt: three floors in brown tile, steel sashes, a tank on the roof."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    storey(p, v, 'flat:#6b655c', v['trim'])
    grid(p, x0, x1, 0, d, GH, h, v['wall'], fh=3.2, bay=2.6, ww=1.8, wh=1.4, sill=0.9, frame=v['trim'])
    band(p, v['trim'], x0, x1, 0, d, h - 0.2, h, 0.25)
    tank(p, x0 + 3, h, d * 0.4)
    p.box(ROOF, x1 - 5, h, d * 0.5, x1 - 1, h + 2.6, d * 0.5 + 4)


def hotel(p, v, r):
    """A business hotel: brown tile, a small window to every room, a blank lift tower with the name down it."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    storey(p, v, GRANITE, v['trim'])
    grid(p, x0 + 3.6, x1, 0, d, GH, h, v['wall'], fh=2.95, bay=2.9, ww=1.3, wh=1.5, sill=0.9, frame=v['trim'])
    p.box(v['wall'], x0, GH, -0.3, x0 + 3.6, h + 3.0, d)
    board(p, 'vertical', 'f', x0 + 1.0, x0 + 2.6, GH + 6.0, h - 1.0, -0.3, col='flat:#f1efe8', proud=0.12)
    band(p, v['trim'], x0, x1, 0, d, h - 0.25, h, 0.2)
    roof(p, v, r, h)


STYLES = dict(hotel=hotel, godo=godo, fin=fin, denwa=denwa, bank=bank, glass=glass, ribbon=ribbons, old=old)


def V(i, style, w, h, seed, d=30.0, **kw):
    return dict(id=i, style=style, w=w, d=d, h=h, seed=seed, gap=8.0, **kw)


VARIANTS = [
    V('m30', 'godo', 30.0, 31.0, 1, wall='flat:#d8d4c8', trim='flat:#b3ad9c'),
    V('m30b', 'glass', 30.0, 31.0, 2, wall='flat:#e7e6e1', glass=GLASS_BL),
    V('m24', 'fin', 24.0, 30.0, 3, wall='flat:#c9c6bd', trim='flat:#e2dfd6'),
    V('m24b', 'bank', 24.0, 27.0, 4, wall='flat:#e0d8c6', trim='flat:#cfc6b0'),
    V('m24c', 'hotel', 24.0, 31.0, 8, wall='flat:#b89a7c', trim='flat:#8a6a4a'),
    V('m20', 'denwa', 20.0, 28.0, 5, wall='flat:#cdbfa6', trim='flat:#a8977c'),
    V('m20b', 'ribbon', 20.0, 29.0, 6, wall='flat:#dfe3e2', trim='flat:#5d6166'),
    V('m18', 'glass', 18.0, 31.0, 7, wall='flat:#d9d5c4', glass=GLASS_GN),
    V('b24', 'ribbon', 24.0, 22.0, 11, d=26.0, wall='flat:#e6dfcc', trim='flat:#27344f'),
    V('b20', 'godo', 20.0, 19.0, 12, d=26.0, wall='flat:#c9c2ae', trim='flat:#9a927e'),
    V('b18', 'glass', 18.0, 24.0, 13, d=26.0, wall='flat:#e7e6e1', glass=GLASS_BZ),
    V('b18b', 'fin', 18.0, 20.0, 14, d=26.0, wall='flat:#b9b6ac', trim='flat:#dcd9d0'),
    V('b14', 'bank', 14.0, 16.0, 15, d=26.0, wall='flat:#d6ccb6', trim='flat:#bfb49c'),
    V('b14b', 'old', 14.0, 11.0, 16, d=26.0, wall='flat:#7d5a44', trim='flat:#d8ccb2'),
]


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(v['seed'] * 7 + 1)
    STYLES[v['style']](body, v, r)
    return body, signs


def build_lo(v):
    """No simplified copy: a plain box reads as a placeholder from across the park."""
    return None


if __name__ == '__main__':
    run('civic', VARIANTS, build_hi, build_lo)
    write_anchors('civic')
