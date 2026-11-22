# Builds the Kita-Ōdōri Gate Towers: two towers standing either side of Yanagi-suji where it meets
# the avenue, joined near the top by a sky lobby that bridges the street.
#
#   blender --background --python tools/blender/build_gate.py -- [--renders <dir>]
#
# Writes assets/buildings/gate.blend, public/models/buildings/gate.glb and
# src/stations/anchors/gate.ts. Frame and helpers: buildkit.py, kitakit.py.
#
# towers  W wide over all, front at z = 0: a tower TW wide at each end, the street (GAP wide)
#         between them, D deep. Podiums PH high with shops and a screen cabinet each; glass
#         shafts; the sky lobby from BY0 to BY1. Nothing carries a name.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

W, D, H = 116.0, 51.0, 172.0
GAP, PH = 32.0, 14.0
BY0, BY1 = 148.0, 164.0
SZ0, SZ1 = 1.5, 42.0     # the shafts' depth
RX0, RX1, RDEEP, RH = 45.0, 50.0, 12.5, 4.6   # the metro entrance bay in each podium front: |x| range, depth, height
GLASS = 'flat:#3a5a63'
FRAME_W = 'flat:#dfe3e6'


def tower(p, s, sx, r):
    a, b_ = (GAP / 2, W / 2) if sx > 0 else (-W / 2, -GAP / 2)
    tag = 'p' if sx > 0 else 'n'
    inner = 'l' if sx > 0 else 'r'     # the wall facing the street between the towers
    xi = a if sx > 0 else b_
    # ── Podium: shops on the avenue and on Yanagi-suji, a glazed first floor, a screen ──
    ra, rb = (RX0, RX1) if sx > 0 else (-RX1, -RX0)
    for xa, xb, za in ((a, ra, 0), (rb, b_, 0), (ra, rb, RDEEP)):
        p.box(GRANITE, xa, 0, za, xb, PH, D)
    p.box(GRANITE, ra, RH, 0, rb, PH, RDEEP)
    for z in (1.5, 6.0, 10.5):
        p.box('light', ra + 1.2, RH - 0.05, z - 0.3, rb - 1.2, RH, z + 0.3)
    board(p, 'metro_' + tag, 'f', ra + 0.2, rb - 0.2, RH + 0.15, RH + 1.0, 0, 'flat:#12233a', 0.12)
    mid = (a + b_) / 2
    for xa, xb in ((a, ra - 0.2), (rb + 0.2, b_)):
        shopfronts(p, s, xa, xb, 0, 5.2, r, 5.25, door=mid if xa < mid < xb else None, awn=False)
    for face, a0, a1, at in sides(a, b_, 0, D, 'lr'):
        for c in rows(a0 + 1, a1 - 1, 6.2):
            quad(p, 'windowDim', face, c - 2.5, c + 2.5, 0.7, 4.0, out(face, at, 0.03), col=SHOP)
            slab(p, ALU_DK, face, c - 2.6, c + 2.6, 4.0, 4.2, at, 0.4)
            if face == inner:
                quad(p, WINDOW, face, c - 2.5, c + 2.5, 6.6, 12.6, out(face, at, 0.03), col=GLASS)
    for c in rows(a + 1, b_ - 1, 5.25):
        if abs(c - (a + b_) / 2) > 12:
            quad(p, WINDOW, 'f', c - 2.2, c + 2.2, 6.6, 12.6, -0.03, col=GLASS)
    band(p, FRAME_W, a, b_, 0, D, 5.5, 6.1, 0.3)
    band(p, FRAME_W, a, b_, 0, D, PH - 0.5, PH, 0.3)
    screen(p, 'screen_' + tag, 'f', (a + b_) / 2 - 10.5, (a + b_) / 2 + 10.5, 6.9, 12.9, 0, 0.4)
    c = xi + sx * 5.5
    board(p, 'name_' + tag, 'f', c - 4.2, c + 4.2, 3.9, 5.2, 0, 'flat:#20262b', 0.14)
    zc = D * 0.45
    slab(p, SCREEN, inner, zc - 9, zc + 9, 7.0, 12.6, xi, 0.4)
    mark('side_' + tag, xi - sx * 0.43, 9.8, zc, 17.4, 5.0, (-sx, 0))
    service_back(p, a, b_, D, PH, r)
    # ── Shaft: glass in a white frame, a dark slot down the front, a stepped head ──
    x0, x1 = a + 1.5, b_ - 1.5
    curtain(p, x0, x1, SZ0, SZ1, PH, BY1 + 4, GLASS, FRAME_W, 4.1, 1.5, 1.0, 3)
    for face, a0, a1, at in sides(x0, x1, SZ0, SZ1):
        for e in (a0, a1):
            slab(p, FRAME_W, face, e - 0.5, e + 0.5, PH, BY1 + 4, at, 0.35)
    m = (x0 + x1) / 2
    slab(p, GLASS_DK, 'f', m - 2.2, m + 2.2, PH, BY0, SZ0, 0.2)
    for y in [PH + 20.5 * i for i in range(1, 7)]:
        band(p, FRAME_W, x0, x1, SZ0, SZ1, y, y + 0.6, 0.35)
    curtain(p, x0 + 3, x1 - 3, SZ0 + 3, SZ1 - 3, BY1 + 4, H, GLASS, FRAME_W, 4.0, 1.5, 0.8, 3)
    fins(p, FRAME_W, x0 + 3, x1 - 3, SZ0 + 3, SZ1 - 3, H - 4, H + 3, 3.0, 0.2, 0.6)
    band(p, FRAME_W, x0, x1, SZ0, SZ1, BY1 + 3.4, BY1 + 4.2, 0.4)
    plant(p, x0 + 4, x1 - 4, H, SZ0 + 4, SZ1 - 4, 5 if sx > 0 else 9)
    beacons(p, x0 + 3, x1 - 3, SZ0 + 3, SZ1 - 3, H + 3)
    if sx > 0:
        helipad(p, m, H + 3.2, (SZ0 + SZ1) / 2, 7.0)
    else:
        mast(p, m, H + 1, (SZ0 + SZ1) / 2, 26, 3.4)
    # The podium's roof garden behind the shaft.
    p.box(HEDGE, a + 2, PH, SZ1 + 2.5, b_ - 2, PH + 0.9, SZ1 + 3.7)
    plant(p, a + 1, b_ - 1, PH, SZ1 + 4.5, D - 0.5, 15)


def bridge(p):
    """The sky lobby: a two-storey steel box truss between the shafts, glazed, lit underneath."""
    x0, x1 = -GAP / 2 - 1.5, GAP / 2 + 1.5
    z0, z1 = 7.0, 37.0
    p.box(GLASS_DK, x0, BY0, z0, x1, BY1, z1)
    for face, a0, a1, at in sides(x0, x1, z0, z1, 'fb'):
        n = 5
        bw = (a1 - a0) / n
        for k in range(n):
            xa, xb = a0 + k * bw, a0 + (k + 1) * bw
            for (ya, yb) in ((BY0 + 1.2, BY0 + 7.4), (BY0 + 8.6, BY1 - 1.2)):
                quad(p, WINDOW, face, xa + 0.3, xb - 0.3, ya, yb, out(face, at, 0.03), col=GLASS)
            # The truss's diagonals, alternately rising and falling.
            o = out(face, at, 0.25)
            lo, hi = (BY0 + 0.6, BY1 - 0.6) if k % 2 == 0 else (BY1 - 0.6, BY0 + 0.6)
            p.face(FRAME_W, [(xa, lo - 0.35, o), (xa, lo + 0.35, o), (xb, hi + 0.35, o), (xb, hi - 0.35, o)], NORMAL[face])
            slab(p, FRAME_W, face, xa - 0.3, xa + 0.3, BY0, BY1, at, 0.3)
        slab(p, FRAME_W, face, a1 - 0.3, a1 + 0.3, BY0, BY1, at, 0.3)
        for y in (BY0, BY0 + 7.6, BY1 - 1.0):
            slab(p, FRAME_W, face, a0, a1, y, y + 1.0, at, 0.3)
    # The underside, seen from the street 148 m below: a coffered soffit with rings of light.
    for cx in (-9.0, 0.0, 9.0):
        for cz in (z0 + 7.5, z1 - 7.5):
            p.cyl('light', (cx, BY0 - 0.03, cz), 1, 2.6, 0.06, seg=20)
            p.cyl(GLASS_DK, (cx, BY0 - 0.05, cz), 1, 2.0, 0.1, seg=20)
    # The open deck on its roof: a parapet of glass, a ring walk round a skylight.
    for face, a0, a1, at in sides(x0, x1, z0, z1, 'fb'):
        quad(p, 'glassTint', face, a0, a1, BY1, BY1 + 1.6, at)
    p.box(FRAME_W, -6, BY1, (z0 + z1) / 2 - 6, 6, BY1 + 0.5, (z0 + z1) / 2 + 6)
    p.box('light', -5, BY1 + 0.5, (z0 + z1) / 2 - 5, 5, BY1 + 0.56, (z0 + z1) / 2 + 5)
    board(p, 'bridge', 'f', -9, 9, BY0 + 7.7, BY0 + 8.5, z0, FRAME_W, 0.34)


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(4)
    tower(body, signs, -1, r)
    tower(body, signs, 1, r)
    bridge(body)
    mark('geo', GAP, PH, SZ0, SZ1, BY0)
    mark('recess', RX0, RX1, RDEEP, RH, 0)
    return body, signs


if __name__ == '__main__':
    run('gate', [dict(id='towers', w=W, d=D, h=H)], build_hi, lambda v: None)
    write_anchors('gate')
