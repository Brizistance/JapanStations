# Builds Minato Center's landmarks (src/stations/minatocenter-street.ts), in the bay new town after Yokohama's
# Minato Mirai 21 (docs/theme-notes.md "Bay new town").
#
#   blender --background --python tools/blender/build_mcenter.py -- [--renders <dir>]
#
# Writes assets/buildings/mcenter.blend, public/models/buildings/mcenter.glb and src/stations/anchors/mcenter.ts.
#
#   tower  みなとセンタータワー: a 175 m office tower on a four-storey podium, with a lit lantern crown. The podium
#          is L-shaped round the station's glass atrium, which the game builds in code on its forecourt
#          (minatocenter-atrium.ts): the front at z = 0 is the forecourt's back, the notch at the +x end
#          (local x > TX) is where the atrium stands, the podium's wing carried on behind it.
#   hall   川湊国際展示場: an exhibition hall, a 66 x 48 m shed under a shallow vault with a glass entrance
#          hall across its front and a canopy over the forecourt steps.
#   wheel  渚の大観覧車: a 60 m Ferris wheel on an A-frame, 32 gondolas, a boarding deck and ticket booth.
#   hotel  the bay hotel on the avenue: a 100 m slab bowed to the street on a podium with a porte-cochere.
#   office the avenue's 62 m glass office on a stone podium of shops.
#   resi   a 102 m residential tower with white balconies all round (north of the Mall).
#   bhotel a 12-storey business hotel with a vertical sign.
#   soko   the old red-brick warehouse kept from the port, now a cafe and hall.
#
# All three face the street with their front at z = 0 (front facing -z), origin mid-frontage.

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403
from build_road import tube  # noqa: E402

GLASS_T = 'flat:#41667f'     # the tower's blue glass
WHITE_S = 'flat:#eef0ee'     # white steel and panels
WHITE_P = 'flat:#e2e4e1'
GREY_P = 'flat:#b9bec0'
STONE_P = 'flat:#cfcabe'
CLAD_H = 'flat:#d6dbdd'
ROOF_H = 'flat:#9aa5ab'
NAVY = 'flat:#1f3550'
BLUE = 'flat:#1673c9'

# ── The tower ──
TW, TD = 124.0, 64.0            # the podium's whole lot: local x -62 … 62, z 0 … 64
PH = 18.0                       # podium height
TX = -21.6                      # the notch: local x < TX is the atrium (front part) and the wing behind it
NZ = 24.4                       # the wing behind the atrium starts here
SH = (-18.0, 24.0, 20.0, 62.0)  # the shaft: x0, x1, z0, z1
TOP = 175.0


def tower(p):
    # The podium: shops at the foot behind glass, three office floors over a white band.
    for (x0, x1, z0, z1) in ((TX, TW / 2, 0.0, TD), (-TW / 2, TX, NZ, TD)):
        p.box(WHITE_P, x0, 0, z0, x1, PH, z1)
        curtain(p, x0, x1, z0, z1, 0.0, 5.5, glass=GLASS_T, mull=WHITE_S, fh=5.5, bay=1.8, sp=0.2, spandrel=WHITE_P)
        curtain(p, x0, x1, z0, z1, 6.5, PH - 0.8, glass=GLASS_T, mull=WHITE_S, fh=3.6, bay=1.8, sp=0.9, spandrel=WHITE_P)
        bands(p, WHITE_S, x0, x1, z0, z1, (5.5, PH - 0.8), t=1.0, proud=0.3)
        p.box(WHITE_S, x0 - 0.3, PH, z0 - 0.3, x1 + 0.3, PH + 1.2, z1 + 0.3)
    # A canopy along the forecourt front, and the doors under it.
    p.box(WHITE_S, TX + 2, 4.2, -4.0, TW / 2 - 2, 4.6, 0.0)
    for x in rows(TX + 4, TW / 2 - 4, 9.0):
        p.box(WHITE_S, x - 0.15, 0, -3.9, x + 0.15, 4.2, -3.6)
    for xc in (TW / 2 - 18, 12.0):
        p.box(DARK, xc - 3.0, 0, -0.06, xc + 3.0, 3.6, -0.02)
    mark('_door', 12.0, 0, 0, 6.0, 3.6)
    mark('name', 25.0, 9.0, -0.35, 22.0, 2.2)
    # The roof garden on the podium round the shaft: planting strips and a rail.
    x0, x1, z0, z1 = SH
    plant(p, TX + 2, x0 - 3, PH + 1.2, 4, TD - 4, seed=5)
    plant(p, x1 + 3, TW / 2 - 2, PH + 1.2, 4, TD - 4, seed=7)
    # The shaft: blue glass between white fins, set-back corners.
    c = 3.0
    p.box(GLASS_DK, x0 + c, PH, z0, x1 - c, TOP, z1)
    p.box(GLASS_DK, x0, PH, z0 + c, x1, TOP, z1 - c)
    curtain(p, x0 + c, x1 - c, z0, z1, PH, TOP, glass=GLASS_T, mull=WHITE_S, fh=4.2, bay=2.4, sp=0.9, chunk=2, which='fb')
    curtain(p, x0, x1, z0 + c, z1 - c, PH, TOP, glass=GLASS_T, mull=WHITE_S, fh=4.2, bay=2.4, sp=0.9, chunk=2, which='lr')
    fins(p, WHITE_S, x0 + c, x1 - c, z0, z1, PH, TOP, 7.2, w=0.5, proud=0.7, which='fb')
    fins(p, WHITE_S, x0, x1, z0 + c, z1 - c, PH, TOP, 7.2, w=0.5, proud=0.7, which='lr')
    for (a, e) in ((x0, x0 + c), (x1 - c, x1)):
        for (g, h) in ((z0, z0 + c), (z1 - c, z1)):
            p.box(WHITE_S, a + 0.2, PH, g + 0.2, e - 0.2, TOP, h - 0.2)
    # The lantern crown: a lit glass drum on a white collar, an inner core, a mast with beacons.
    p.box(WHITE_S, x0 - 0.5, TOP, z0 - 0.5, x1 + 0.5, TOP + 1.6, z1 + 0.5)
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    p.cyl('glassTint', (cx, TOP + 9.0, cz), 1, 15.0, 14.8, seg=24)
    p.cyl(LIGHT, (cx, TOP + 9.0, cz), 1, 13.6, 14.0, seg=24)
    for k in range(12):
        a = 2 * math.pi * k / 12
        x, z = cx + 15.1 * math.cos(a), cz + 15.1 * math.sin(a)
        p.box(WHITE_S, x - 0.25, TOP + 1.6, z - 0.25, x + 0.25, TOP + 16.4, z + 0.25)
    p.cyl(WHITE_S, (cx, TOP + 17.0, cz), 1, 16.0, 1.2, seg=24)
    p.cyl(WHITE_S, (cx, TOP + 23.0, cz), 1, 0.6, 11.0, seg=8)
    p.box(BEACON, cx - 0.4, TOP + 28.3, cz - 0.4, cx + 0.4, TOP + 29.1, cz + 0.4)
    beacons(p, x0, x1, z0, z1, TOP + 1.6)
    # Lit floors by night: a band of lit panes at the crown's foot.
    for face, a0, a1, at in sides(x0 + c, x1 - c, z0, z1, 'fb') + sides(x0, x1, z0 + c, z1 - c, 'lr'):
        quad(p, LIGHT, face, a0 + 0.5, a1 - 0.5, TOP - 1.2, TOP - 0.9, out(face, at, 0.75))
    mark('_shaft', cx, 0, cz, x1 - x0, z1 - z0)


# ── The exhibition hall ──
HW_, HD_ = 66.0, 56.0
SHED = 8.0          # the shed begins behind the entrance hall
EH = 15.0           # the shed's eaves
VR = 4.0            # the vault's rise over the eaves
EG = 11.0           # the entrance hall's height


def hall(p):
    x0, x1 = -HW_ / 2, HW_ / 2
    # The shed: ribbed metal cladding, a clerestory band, a shallow vault.
    p.box(CLAD_H, x0, 0, SHED, x1, EH, HD_)
    for x in rows(x0 + 1.5, x1 - 1.5, 3.0):
        for face, at in (('f', SHED), ('b', HD_)):
            slab(p, GREY_P, face, x - 0.06, x + 0.06, 0.6, EH - 1.6, at, 0.12)
    for face, a0, a1, at in sides(x0, x1, SHED, HD_, 'lr'):
        for z in rows(a0 + 1.5, a1 - 1.5, 3.0):
            slab(p, GREY_P, face, z - 0.06, z + 0.06, 0.6, EH - 1.6, at, 0.12)
    bands(p, WHITE_S, x0, x1, SHED, HD_, (EH - 1.6,), t=1.6, proud=0.05)
    for face, a0, a1, at in sides(x0, x1, SHED, HD_):
        quad(p, 'windowDim', face, a0 + 1, a1 - 1, EH - 1.4, EH - 0.4, out(face, at, 0.08), col='flat:#cfd9de')
    n = 12
    arc = [(SHED + (HD_ - SHED) * k / n, EH + VR * math.sin(math.pi * k / n)) for k in range(n + 1)]
    p.prism(ROOF_H, arc, 'x', x0 - 0.6, x1 + 0.6, caps=True)
    for x in rows(x0 + 3, x1 - 3, 11.0):
        poly = [(z, y + 0.25) for (z, y) in arc] + [(z, y + 0.05) for (z, y) in arc[::-1]]
        p.prism(WHITE_S, poly, 'x', x - 0.2, x + 0.2)
    # Service doors on the sides.
    for xs in (x0, x1):
        for z in (24.0, 40.0):
            p.box(GREY_P, xs - 0.1, 0, z - 3.0, xs + 0.1, 5.0, z + 3.0)
    # The entrance hall: glass across the front under a thin white roof, white steel posts.
    ex0, ex1 = -26.0, 26.0
    p.box('glassTint', ex0, 0, 0.0, ex1, EG, 0.15)
    p.box('glassTint', ex0, 0, 0.0, ex0 + 0.15, EG, SHED)
    p.box('glassTint', ex1 - 0.15, 0, 0.0, ex1, EG, SHED)
    p.box(WHITE_P, ex0, EG, 0.0, ex1, EG + 0.2, SHED)
    for x in rows(ex0, ex1, 4.0):
        p.box(WHITE_S, x - 0.12, 0, -0.12, x + 0.12, EG, 0.12)
    for y in (3.6, 7.3):
        p.box(WHITE_S, ex0, y, -0.1, ex1, y + 0.12, 0.05)
    p.box(WHITE_P, ex0, 0, 0.0, ex1, 0.05, SHED)
    for xc in (-8.0, 0.0, 8.0):
        p.box(DARK, xc - 2.0, 0, -0.08, xc + 2.0, 3.3, -0.05)
    # The forecourt canopy on tall white posts.
    p.box(WHITE_S, -18.0, 8.5, -9.0, 18.0, 8.9, 0.0)
    for x in (-16.0, -6.0, 6.0, 16.0):
        p.cyl(WHITE_S, (x, 4.25, -8.0), 1, 0.25, 8.5, seg=10)
    mark('name', 0.0, EH - 3.6, SHED - 0.1, 30.0, 2.4)
    mark('_door', 0.0, 0, 0, 28.0, 3.3)


# ── The Ferris wheel ──
WW, WD = 70.0, 24.0
HUB = 38.0
R = 30.0
NG = 32
GONDOLA = ['flat:#e8f1f7', 'flat:#f6d7e1', 'flat:#dcefd9', 'flat:#fbeac4']


def wheel(p):
    hz = 12.0
    # The legs: two A-frames, one each side of the wheel, to the axle.
    for z in (hz - 2.2, hz + 2.2):
        for sx in (-1, 1):
            tube(p, WHITE_S, (sx * 15.0, 0.0, z + (-1 if z < hz else 1) * 4.0), (0.0, HUB, z), 0.7, seg=10)
        tube(p, WHITE_S, (-9.0, 15.0, z + (-1 if z < hz else 1) * 2.4), (9.0, 15.0, z + (-1 if z < hz else 1) * 2.4), 0.35, seg=8)
    p.cyl(GREY_P, (0.0, HUB, hz), 2, 1.6, 6.0, seg=16)
    # Two rims and the spokes, white; a lit ring for the night.
    for z in (hz - 1.6, hz + 1.6):
        p.ring(WHITE_S, (0.0, HUB, z), R, 0.35, seg=64, sub=6)
        for k in range(NG):
            a = 2 * math.pi * k / NG
            tube(p, WHITE_S, (0.0, HUB, z), (R * math.cos(a), HUB + R * math.sin(a), z), 0.09, seg=5)
    p.ring(LIGHT, (0.0, HUB, hz), R - 0.9, 0.12, seg=64, sub=4)
    for k in range(NG):
        a = 2 * math.pi * k / NG
        x, y = R * math.cos(a), HUB + R * math.sin(a)
        tube(p, WHITE_S, (x, y, hz - 1.6), (x, y, hz + 1.6), 0.12, seg=6)
        # Each gondola hangs below its pin.
        col = GONDOLA[k % len(GONDOLA)]
        p.box(col, x - 1.1, y - 3.2, hz - 1.0, x + 1.1, y - 1.2, hz + 1.0)
        p.box('glassTint', x - 1.12, y - 2.7, hz - 1.02, x + 1.12, y - 1.6, hz + 1.02)
        p.box(GREY_P, x - 0.1, y - 1.2, hz - 0.1, x + 0.1, y, hz + 0.1)
    # The boarding deck under the wheel's foot, its stairs, the ticket booth and the turnstiles.
    p.box(STONE_P, -9.0, 0, 4.0, 9.0, 1.2, 20.0)
    for i in range(6):
        p.box(STONE_P, -3.0, 0, 4.0 - 0.3 * (i + 1), 3.0, 1.2 - 0.2 * i - 0.2, 4.0 - 0.3 * i)
    p.box(WHITE_P, -9.0, 1.2, 4.0, 9.0, 1.3, 4.1)
    p.box(NAVY, 10.5, 0, 6.0, 15.5, 3.0, 10.0)
    p.box(WHITE_S, 10.2, 3.0, 5.7, 15.8, 3.3, 10.3)
    p.box('glassTint', 10.48, 1.0, 6.5, 10.52, 2.4, 9.5)
    mark('name', 13.0, 3.9, 5.6, 5.0, 0.9)
    mark('_deck', 0.0, 0.0, 12.0, 18.0, 16.0)


# ── Stage 3: the fill's own pieces (the avenue's hotel and office, the north side's towers, the old warehouse) ──
from build_tower import extrude  # noqa: E402

BRICK_R = 'flat:#9a4a36'
BRICK_D = 'flat:#6e3426'
IRON = 'flat:#3d4448'
SAND = 'flat:#d8cfbd'


def strips(p, pts, y0, y1, fh, glass=GLASS_T, out_m=0.03):
    """Windows floor by floor on every edge of a convex plan (a lit share at night), set a hair proud."""
    cx, cz = sum(q[0] for q in pts) / len(pts), sum(q[1] for q in pts) / len(pts)
    n = max(1, int((y1 - y0) / fh))
    for i, a in enumerate(pts):
        b = pts[(i + 1) % len(pts)]
        nx, nz = (a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cz
        L = math.hypot(nx, nz) or 1.0
        ox, oz = nx / L * out_m, nz / L * out_m
        for f in range(n):
            ya, yb = y0 + f * fh + 0.9, y0 + (f + 1) * fh - 0.1
            mat = WINDOW_LIT if p.lit.random() < LIT_SHARE else WINDOW_DARK
            p.face(mat, [(a[0] + ox, ya, a[1] + oz), (b[0] + ox, ya, b[1] + oz), (b[0] + ox, yb, b[1] + oz), (a[0] + ox, yb, a[1] + oz)], (nx, 0, nz), glass)


def arc_plan(x0, x1, z_front, z_back, bulge, seg=14):
    """A D-shaped plan: a flat back at z_back, a front bowed out towards -z by `bulge`."""
    pts = []
    for k in range(seg + 1):
        t = k / seg
        x = x0 + (x1 - x0) * t
        pts.append((x, z_front - bulge * math.sin(math.pi * t)))
    pts += [(x1, z_back), (x0, z_back)]
    return pts[::-1]


# The bay hotel: a two-storey podium with a porte-cochere, a 100 m slab bowed towards the avenue, white balcony bands.
HTW, HTD, HTH = 40.0, 30.0, 100.0


def hotel(p):
    p.box(SAND, -HTW / 2, 0, 2.0, HTW / 2, 9.0, HTD)
    curtain(p, -HTW / 2, HTW / 2, 2.0, HTD, 0.0, 9.0, glass=GLASS_T, mull=WHITE_S, fh=4.5, bay=2.0, sp=0.3, spandrel=SAND, which='flr')
    p.box(WHITE_S, -14.0, 5.2, -6.0, 14.0, 5.8, 2.0)
    for x in (-12.0, 12.0):
        for z in (-5.0,):
            p.cyl(WHITE_S, (x, 2.6, z), 1, 0.3, 5.2, seg=10)
    for xc in (-3.0, 3.0):
        p.box(DARK, xc - 1.6, 0, 1.92, xc + 1.6, 3.2, 1.98)
    plan = arc_plan(-17.0, 17.0, 6.0, 26.0, 4.5)
    extrude(p, GLASS_DK, plan, 9.0, HTH)
    strips(p, plan, 9.0, HTH - 3.0, 3.3)
    for k in range(int((HTH - 12.0) / 3.3)):
        y = 9.0 + (k + 1) * 3.3
        ring = [(x, z) for (x, z) in arc_plan(-17.4, 17.4, 5.6, 26.4, 4.9)]
        extrude(p, WHITE_S, ring, y - 0.12, y + 0.08, top=False)
    extrude(p, WHITE_S, arc_plan(-17.4, 17.4, 5.6, 26.4, 4.9), HTH - 3.0, HTH + 1.5)
    beacons(p, -16.0, 16.0, 8.0, 25.0, HTH + 1.5)
    mark('name', 0.0, HTH - 1.4, 1.0, 16.0, 2.2)
    mark('plate', 0.0, 6.6, -6.05, 10.0, 0.7)


# The avenue's office: a stone podium of shops, a 62 m glass block with white fins set back above it.
OFW, OFD, OFH = 34.0, 36.0, 62.0


def office(p):
    p.box(STONE_P, -OFW / 2, 0, 0, OFW / 2, 12.0, OFD)
    for xc in rows(-OFW / 2 + 1, OFW / 2 - 1, 5.6):
        p.box(GLASS_T, xc - 2.3, 0.3, -0.06, xc + 2.3, 4.6, -0.02)
        p.box(GLASS_T, xc - 2.3, 6.0, -0.06, xc + 2.3, 10.6, -0.02)
    bands(p, WHITE_S, -OFW / 2, OFW / 2, 0, OFD, (4.9, 11.2), t=0.6, proud=0.2)
    x0, x1, z0, z1 = -OFW / 2 + 3, OFW / 2 - 3, 4.0, OFD - 2
    curtain(p, x0, x1, z0, z1, 12.0, OFH, glass=GLASS_T, mull=WHITE_S, fh=3.9, bay=1.8, sp=0.8, chunk=2)
    fins(p, WHITE_S, x0, x1, z0, z1, 12.0, OFH, 3.6, w=0.35, proud=0.6)
    p.box(WHITE_S, x0 - 0.4, OFH, z0 - 0.4, x1 + 0.4, OFH + 2.0, z1 + 0.4)
    mark('name', 0.0, OFH - 2.6, z0 - 0.75, 14.0, 1.6)
    mark('plate', -OFW / 2 + 6.0, 5.6, -0.25, 9.0, 0.9)
    mark('shop', OFW / 2 - 7.0, 5.6, -0.25, 9.0, 0.9)


# The residential tower: 33 floors of flats with deep white balconies all round, a two-storey glass lobby.
RSW, RSD, RSH = 30.0, 30.0, 102.0


def resi(p):
    x0, x1, z0, z1 = -13.0, 13.0, 2.0, 28.0
    p.box(GLASS_DK, x0 + 1.4, 0, z0 + 1.4, x1 - 1.4, RSH, z1 - 1.4)
    curtain(p, x0 + 1.4, x1 - 1.4, z0 + 1.4, z1 - 1.4, 7.0, RSH, glass='flat:#55707e', mull=WHITE_S, fh=3.0, bay=2.6, sp=0.7, chunk=2)
    curtain(p, x0 + 1.4, x1 - 1.4, z0 + 1.4, z1 - 1.4, 0.0, 7.0, glass=GLASS_T, mull=WHITE_S, fh=7.0, bay=2.6, sp=0.2)
    for k in range(int((RSH - 7.0) / 3.0)):
        y = 7.0 + k * 3.0
        p.box(WHITE_S, x0, y - 0.18, z0, x1, y, z1)
        for face, a0, a1, at in sides(x0, x1, z0, z1):
            slab(p, 'glassTint', face, a0 + 0.2, a1 - 0.2, y, y + 1.05, at, -0.05)
    p.box(WHITE_S, x0, RSH, z0, x1, RSH + 3.0, z1)
    beacons(p, x0 + 1, x1 - 1, z0 + 1, z1 - 1, RSH + 3.0)
    mark('name', 0.0, 4.6, z0 + 1.3, 9.0, 0.8)


# The business hotel: a narrow 12-storey slab, a vertical sign up one corner, a glass lobby.
BHW, BHD, BHH = 16.0, 22.0, 41.0


def bhotel(p):
    grid(p, -BHW / 2, BHW / 2, 0.0, BHD, 4.6, BHH, 'flat:#e7e3da', fh=3.0, bay=2.6, ww=1.6, wh=1.5, sill=0.9)
    p.box('flat:#e7e3da', -BHW / 2, 0, 0.0, BHW / 2, 4.6, BHD)
    p.box(GLASS_T, -BHW / 2 + 0.8, 0.2, -0.05, BHW / 2 - 0.8, 4.2, 0.0)
    p.box(DARK, -1.2, 0, -0.08, 1.2, 2.6, -0.04)
    p.box('flat:#2a3a52', -BHW / 2, BHH, 0.0, BHW / 2, BHH + 1.2, BHD)
    mark('blade', BHW / 2 - 0.6, 24.0, -0.9, 1.4, 14.0, (0, -1))
    mark('name', 0.0, 4.9, -0.2, 9.0, 0.8)


# The old warehouse: a 1920s two-storey red-brick store kept from the port, now a cafe and hall.
SKW, SKD, SKH = 48.0, 18.0, 12.5


def soko(p):
    x0, x1 = -SKW / 2, SKW / 2
    p.box(BRICK_R, x0, 0, 0, x1, SKH, SKD)
    p.box(SAND, x0 - 0.2, 0, -0.2, x1 + 0.2, 0.6, SKD + 0.2)
    bands(p, BRICK_D, x0, x1, 0, SKD, (6.0, SKH - 1.0), t=0.35, proud=0.12)
    p.box(BRICK_D, x0 - 0.3, SKH, -0.3, x1 + 0.3, SKH + 0.6, SKD + 0.3)
    # Pilasters every bay, an arched window in each on both floors, iron shutters folded back.
    for face, a0, a1, at in sides(x0, x1, 0, SKD):
        for c in rows(a0 + 0.5, a1 - 0.5, 4.0):
            slab(p, BRICK_D, face, c - 2.05, c - 1.65, 0.6, SKH, at, 0.25)
            for (y0, y1, lit) in ((0.9, 4.6, True), (7.0, 10.2, False)):
                mat = 'windowDim' if lit else WINDOW_DARK
                quad(p, mat, face, c - 1.0, c + 1.0, y0, y1, out(face, at, 0.02), col='flat:#7a5a36' if lit else 'flat:#2b3740')
                quad(p, SAND, face, c - 1.15, c + 1.15, y1, y1 + 0.35, out(face, at, 0.03))
                quad(p, IRON, face, c - 1.6, c - 1.05, y0, y1, out(face, at, 0.05))
                quad(p, IRON, face, c + 1.05, c + 1.6, y0, y1, out(face, at, 0.05))
    # A modern glass entrance in the middle of the front, its canopy, and a hoist beam at the top.
    p.box('glassTint', -3.0, 0.6, -1.2, 3.0, 5.4, 0.0)
    p.box(IRON, -3.6, 5.4, -2.6, 3.6, 5.6, 0.0)
    p.box(IRON, -0.15, SKH - 1.6, -1.4, 0.15, SKH - 1.3, 0.0)
    mark('name', 0.0, SKH - 2.5, -0.32, 14.0, 1.4)
    mark('_door', 0.0, 0.6, -1.2, 6.0, 4.8)


# ── Stage 4: small pieces of the new town's dress ──
STAINLESS = 'metal:#c9ced3'
ORANGE = 'flat:#e8622a'


def sculpt(p):
    """A stainless sculpture of three rising wave arcs on a low granite plinth (the forecourt's)."""
    p.box(STONE_P, -2.2, 0, -1.4, 2.2, 0.45, 1.4)
    for k, (h, r) in enumerate(((4.6, 2.0), (3.6, 1.6), (2.6, 1.2))):
        z = -0.6 + k * 0.6
        n = 14
        for i in range(n):
            a0, a1 = math.pi * i / n, math.pi * (i + 1) / n
            x0, y0 = -r * math.cos(a0), 0.45 + (h - 0.45) * math.sin(a0)
            x1, y1 = -r * math.cos(a1), 0.45 + (h - 0.45) * math.sin(a1)
            tube(p, STAINLESS, (x0 + k * 0.5 - 0.5, y0, z), (x1 + k * 0.5 - 0.5, y1, z), 0.09, seg=6)
    mark('plaque', 0.0, 0.25, -1.42, 0.8, 0.22)


def buoy(p):
    """A lifebuoy in its box on a post at the sea wall."""
    p.box(WHITE_S, -0.06, 0, -0.06, 0.06, 1.2, 0.06)
    p.box('flat:#f2f2ee', -0.42, 1.2, -0.14, 0.42, 2.05, 0.06)
    p.ring(ORANGE, (0.0, 1.62, -0.16), 0.3, 0.07, seg=16, sub=6)
    for a in (0.4, 2.0, 3.6, 5.2):
        p.box(WHITE_S, 0.3 * math.cos(a) - 0.05, 1.62 + 0.3 * math.sin(a) - 0.05, -0.24, 0.3 * math.cos(a) + 0.05, 1.62 + 0.3 * math.sin(a) + 0.05, -0.08)
    p.box(BLUE, -0.42, 1.95, -0.15, 0.42, 2.05, -0.14)


def scope(p):
    """A coin-operated telescope on a post (the pier's)."""
    p.cyl(GREY_P, (0.0, 0.55, 0.0), 1, 0.12, 1.1, seg=10)
    p.box(GREY_P, -0.22, 0, -0.22, 0.22, 0.08, 0.22)
    p.box(NAVY, -0.16, 1.1, -0.2, 0.16, 1.42, 0.2)
    p.cyl(NAVY, (0.0, 1.3, -0.38), 2, 0.1, 0.4, seg=10)
    p.cyl(NAVY, (0.0, 1.3, 0.3), 2, 0.07, 0.25, seg=8)


# ── The peninsula's waterfronts (2026-11-25): the point's lookout, the marina, the water-bus, the convention centre,
# the resort hotel ──
TEAK = 'flat:#9a6b45'
HULL = 'flat:#f3f3ef'


def lookout(p):
    """A lighthouse-style lookout on the point: a white tapering tower, a glazed lantern room at 18 m, a gallery."""
    p.box(STONE_P, -5.0, 0, -5.0, 5.0, 0.5, 5.0)
    for k in range(9):
        y0, y1 = 0.5 + k * 2.0, 0.5 + (k + 1) * 2.0
        r = 3.0 - k * 0.12
        p.cyl(WHITE_S if k % 3 else 'flat:#2f5f9a', (0.0, (y0 + y1) / 2, 0.0), 1, r, y1 - y0, seg=20)
    p.cyl(WHITE_S, (0.0, 18.7, 0.0), 1, 3.4, 0.4, seg=20)
    for k in range(20):
        a = 2 * math.pi * k / 20
        p.box(GREY_P, 3.3 * math.cos(a) - 0.04, 18.9, 3.3 * math.sin(a) - 0.04, 3.3 * math.cos(a) + 0.04, 19.9, 3.3 * math.sin(a) + 0.04)
    p.cyl('glassTint', (0.0, 20.6, 0.0), 1, 2.2, 3.2, seg=16)
    p.cyl(LIGHT, (0.0, 20.6, 0.0), 1, 1.0, 1.2, seg=12)
    p.cyl('flat:#2f5f9a', (0.0, 22.5, 0.0), 1, 2.5, 0.6, seg=16)
    p.cyl('flat:#2f5f9a', (0.0, 23.4, 0.0), 1, 1.2, 1.2, seg=12)
    p.box(DARK, -0.8, 0.5, -3.05, 0.8, 2.8, -2.9)
    mark('plaque', 0.0, 1.6, -5.05, 1.4, 0.4)


def clubhouse(p):
    """The marina's clubhouse: two white storeys, a teak deck to the water, a flagpole."""
    p.box(WHITE_S, -12.0, 0, 0, 12.0, 7.6, 12.0)
    curtain(p, -12.0, 12.0, 0, 12.0, 0.0, 7.6, glass=GLASS_T, mull=WHITE_S, fh=3.8, bay=2.4, sp=0.4, which='fb', spandrel=WHITE_S)
    p.box(TEAK, -12.0, 3.6, 12.0, 12.0, 3.8, 15.0)
    p.box(WHITE_S, -12.3, 7.6, -0.3, 12.3, 8.0, 15.0)
    for x in (-11.8, 0.0, 11.8):
        p.box(WHITE_S, x - 0.12, 0, 14.8, x + 0.12, 7.6, 15.0)
    p.cyl(WHITE_S, (13.5, 6.0, 1.0), 1, 0.08, 12.0, seg=6)
    p.box(DARK, -1.4, 0, -0.06, 1.4, 2.7, -0.02)
    mark('name', 0.0, 6.0, -0.06, 12.0, 1.0)


def yacht(p):
    """A small sailing yacht, its length along z, mast and furled sail."""
    p.box(HULL, -1.6, 0.0, 0.6, 1.6, 0.95, 9.4)
    p.box(HULL, -1.1, 0.2, 9.4, 1.1, 0.95, 10.0)
    p.box(BLUE, -1.62, 0.55, 0.6, 1.62, 0.65, 9.4)
    p.box(TEAK, -1.7, 0.9, 0.5, 1.7, 1.0, 9.5)
    p.box(HULL, -1.2, 1.0, 3.5, 1.2, 2.0, 7.0)
    p.box('glassTint', -1.22, 1.4, 3.6, 1.22, 1.85, 6.9)
    p.cyl(WHITE_S, (0.0, 7.5, 5.0), 1, 0.08, 13.0, seg=6)
    p.box('flat:#1f3550', -0.15, 2.4, 5.0, 0.15, 2.8, 9.0)


def waterbus(p):
    """A water-bus: a low white hull with a long glazed cabin."""
    p.prism(HULL, [(-2.5, 1.2), (2.5, 1.2), (2.1, 0.0), (-2.1, 0.0)], 'z', 0.0, 20.0)
    p.box(HULL, -2.1, 1.2, 3.0, 2.1, 3.4, 16.0)
    p.box('glassTint', -2.12, 1.8, 3.2, 2.12, 3.0, 15.8)
    p.box(BLUE, -2.52, 0.9, 0.0, 2.52, 1.2, 20.0)
    p.box(WHITE_S, -1.8, 3.4, 4.0, 1.8, 3.6, 15.0)


def wbterm(p):
    """The water-bus landing's glass pavilion under a wave roof."""
    p.box('glassTint', -8.0, 0, 0.0, 8.0, 4.2, 10.0)
    for x in rows(-8.0, 8.0, 2.0):
        p.box(WHITE_S, x - 0.06, 0, -0.05, x + 0.06, 4.2, 0.05)
    n = 10
    arc = [(-9.0 + 18.0 * k / n, 4.4 + 0.9 * math.sin(math.pi * k / n * 2)) for k in range(n + 1)]
    poly = [(x, y) for x, y in arc] + [(x, y + 0.3) for x, y in arc[::-1]]
    p.prism(WHITE_S, poly, 'z', -1.5, 11.5)
    p.box(DARK, -1.2, 0, -0.06, 1.2, 2.6, -0.02)
    mark('name', 0.0, 3.6, -0.08, 8.0, 0.7)


def convention(p):
    """The convention centre on the west shore: a long glass front under a sweeping sail roof, halls behind."""
    W, D = 90.0, 64.0
    p.box(CLAD_H, -W / 2, 0, 12.0, W / 2, 18.0, D)
    bands(p, WHITE_S, -W / 2, W / 2, 12.0, D, (17.0,), t=1.0, proud=0.1)
    for x in rows(-W / 2 + 2, W / 2 - 2, 4.0):
        slab(p, GREY_P, 'b', x - 0.08, x + 0.08, 1.0, 16.0, D, 0.12)
    # The front foyer: glass 14 m high, the roof sweeping up from the halls and out over the forecourt.
    p.box('glassTint', -W / 2, 0, 0.0, W / 2, 14.0, 0.2)
    for x in rows(-W / 2, W / 2, 3.0):
        p.box(WHITE_S, x - 0.1, 0, -0.1, x + 0.1, 14.0, 0.1)
    for y in (4.6, 9.3):
        p.box(WHITE_S, -W / 2, y, -0.1, W / 2, y + 0.15, 0.1)
    p.box(WHITE_P, -W / 2, 0, 0.0, W / 2, 0.05, 12.0)
    for side in (-1, 1):
        p.box('glassTint', side * W / 2 - 0.1, 0, 0.0, side * W / 2 + 0.1, 14.0, 12.0)
    n = 16
    curve = [(-8.0 + 30.0 * k / n, 16.5 - 6.0 * (k / n) ** 2 + 4.0 * math.sin(math.pi * k / n)) for k in range(n + 1)]
    poly = [(z, y) for z, y in curve] + [(z, y - 0.6) for z, y in curve[::-1]]
    p.prism(WHITE_S, poly, 'x', -W / 2 - 2.0, W / 2 + 2.0)
    for x in rows(-W / 2, W / 2, 12.0):
        p.box(WHITE_S, x - 0.25, 0, -7.5, x + 0.25, 15.5, -7.0)
    for xc in (-20.0, 0.0, 20.0):
        p.box(DARK, xc - 3.0, 0, -0.08, xc + 3.0, 3.3, -0.04)
    mark('name', 0.0, 11.2, -0.12, 34.0, 2.2)


def rhotel(p):
    """The resort hotel facing the sea: a 120 m slab, every floor a balcony band, a stepped top, a spa podium."""
    W, D, H = 50.0, 22.0, 120.0
    p.box(SAND, -W / 2 - 6, 0, 0, W / 2 + 6, 10.0, D + 8)
    curtain(p, -W / 2 - 6, W / 2 + 6, 0, D + 8, 0.0, 10.0, glass=GLASS_T, mull=WHITE_S, fh=5.0, bay=2.4, sp=0.3, spandrel=SAND, which='flr')
    x0, x1, z0, z1 = -W / 2, W / 2, 3.0, D + 3.0
    p.box(GLASS_DK, x0 + 1.4, 10.0, z0 + 1.4, x1 - 1.4, H, z1 - 1.4)
    curtain(p, x0 + 1.4, x1 - 1.4, z0 + 1.4, z1 - 1.4, 10.0, H, glass='flat:#4d7186', mull=WHITE_S, fh=3.2, bay=3.0, sp=0.7, chunk=2)
    for k in range(int((H - 10.0) / 3.2)):
        y = 10.0 + k * 3.2
        top_cut = max(0.0, (y - (H - 18.0)) * 1.2)
        p.box(WHITE_S, x0 + top_cut, y - 0.16, z0, x1 - top_cut, y, z1)
        slab(p, 'glassTint', 'f', x0 + top_cut + 0.2, x1 - top_cut - 0.2, y, y + 1.05, z0, -0.05)
    p.box(WHITE_S, x0 + 20, H, z0 + 2, x1 - 20, H + 4.0, z1 - 2)
    beacons(p, x0 + 21, x1 - 21, z0 + 3, z1 - 3, H + 4.0)
    mark('name', 0.0, H - 4.0, z0 - 0.3, 20.0, 2.6)
    mark('plate', 0.0, 7.0, -0.25, 12.0, 0.9)


VARIANTS = [
    dict(id='tower', w=TW, d=TD, h=TOP + 30.0, fn=tower, gap=12.0),
    dict(id='hall', w=HW_, d=HD_, h=EH + VR + 1.0, fn=hall, gap=12.0),
    dict(id='wheel', w=WW, d=WD, h=HUB + R + 2.0, fn=wheel, gap=12.0),
    dict(id='hotel', w=HTW, d=HTD, h=HTH + 2.0, fn=hotel, gap=12.0),
    dict(id='office', w=OFW, d=OFD, h=OFH + 2.0, fn=office, gap=12.0),
    dict(id='resi', w=RSW, d=RSD, h=RSH + 3.0, fn=resi, gap=12.0),
    dict(id='bhotel', w=BHW, d=BHD, h=BHH + 1.2, fn=bhotel, gap=12.0),
    dict(id='soko', w=SKW, d=SKD, h=SKH + 0.6, fn=soko, gap=12.0),
    dict(id='sculpt', w=4.4, d=2.8, h=4.7, fn=sculpt, gap=3.0),
    dict(id='buoy', w=0.9, d=0.3, h=2.1, fn=buoy, gap=2.0),
    dict(id='scope', w=0.5, d=0.8, h=1.5, fn=scope, gap=2.0),
    dict(id='lookout', w=10.0, d=10.0, h=24.0, fn=lookout, gap=6.0),
    dict(id='clubhouse', w=27.0, d=15.0, h=12.0, fn=clubhouse, gap=6.0),
    dict(id='yacht', w=4.0, d=10.0, h=14.0, fn=yacht, gap=4.0),
    dict(id='waterbus', w=5.0, d=20.0, h=3.6, fn=waterbus, gap=4.0),
    dict(id='wbterm', w=18.0, d=10.0, h=5.6, fn=wbterm, gap=6.0),
    dict(id='convention', w=94.0, d=64.0, h=22.0, fn=convention, gap=12.0),
    dict(id='rhotel', w=62.0, d=30.0, h=124.0, fn=rhotel, gap=12.0),
]


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    v['fn'](body)
    return body, signs


def build_lo(v):
    return None


if __name__ == '__main__':
    run('mcenter', VARIANTS, build_hi, build_lo)
    write_anchors('mcenter')
