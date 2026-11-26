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
from detailkit import *  # noqa: E402,F401,F403

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
    """Tiled body with a navy stripe up the sign corner; every room a framed window with sheer curtains and the
    louvred vent of its air conditioner beside it; floor bands; a stone-and-glass lobby under a lit canopy; the
    escape stair and service doors behind; roof plant, a tank and the sign frame on top."""
    r = random.Random(77)
    WALL, BAND, NAVY_H, STONE_H = 'flat:#e7e3da', 'flat:#cfc8b8', 'flat:#2a3a52', 'flat:#8e8b84'
    G, FH, NF = 4.6, 3.0, 12
    x0, x1 = -BHW / 2, BHW / 2
    p.box(WALL, x0, G, 0.0, x1, BHH, BHD)
    # The navy stripe up the corner the blade sign hangs from, and a band of it at the top.
    p.box(NAVY_H, x1 - 1.4, G, -0.12, x1 + 0.12, BHH, 1.4)
    p.box(NAVY_H, x0 - 0.1, BHH - 1.6, -0.12, x1 + 0.12, BHH, BHD + 0.1)
    for k in range(NF):
        y = G + k * FH
        p.box(BAND, x0, y - 0.12, -0.08, x1 - 1.4, y + 0.12, 0.0)
        if y + FH > BHH - 1.6:
            continue
        for c in rows(x0 + 0.6, x1 - 1.8, 2.75):
            fwin(p, r, 'f', c - 0.75, c + 0.55, y + 0.75, y + 2.35, 0.0, ALU_DK, GLASS_L, mull=False, curtain=True)
            # the room's AC vent: a louvred panel flush beside the window
            wb(p, 'flat:#d6d2c6', 'f', c + 0.7, c + 1.15, y + 0.9, y + 2.2, 0.0, 0.0, 0.05)
            for j in range(6):
                wb(p, 'flat:#b9b4a6', 'f', c + 0.72, c + 1.13, y + 1.0 + j * 0.2, y + 1.06 + j * 0.2, 0.0, 0.05, 0.08)
    # Sides: rooms down the long walls, the vents, pipes; the back: the escape stair and service doors.
    for face, at in (('l', x0), ('r', x1)):
        for k in range(NF):
            y = G + k * FH
            fbands(p, BAND, face, 0.0, BHD, [y], at)
            if y + FH > BHH - 1.6:
                continue
            for c in rows(1.8, BHD - 1.0, 2.75):
                fwin(p, r, face, c - 0.6, c + 0.6, y + 0.75, y + 2.35, at, ALU_DK, GLASS_L, mull=False)
        pipe(p, face, BHD - 0.3, 0.0, BHH, at)
    side_wall(p, r, 'b', x0 + 0.4, x1 - 4.6, BHD, G, NF - 1, FH, WALL, None, kind='hotel', bay=2.75)
    ext_stair(p, 'b', x1 - 4.2, x1 - 0.4, BHD, BHH - 1.6, FH)
    service_back(p, x0, x1 - 4.4, BHD, G, r)
    meters(p, 'l', BHD - 3.0, x0, 3)
    # The lobby: a stone base, framed glass, the doors, a lit canopy, two planters and a menu stand.
    p.box(STONE_H, x0, 0, 0.0, x1, G, BHD)
    p.box(STONE_H, x0, G - 0.5, -0.2, x1, G, 0.0)
    p.box('windowDim', x0 + 0.8, 0.3, -0.06, x1 - 0.8, G - 0.7, -0.02, col='flat:#9fb6c2')
    for c in rows(x0 + 0.8, x1 - 0.8, 1.8) + [x0 + 0.8, x1 - 0.8]:
        p.box(ALU, c - 0.05, 0.3, -0.12, c + 0.05, G - 0.7, -0.05)
    p.box(ALU, x0 + 0.8, 2.6, -0.12, x1 - 0.8, 2.7, -0.05)
    p.box('light', x0 + 1.2, 2.75, 1.4, x1 - 1.2, 2.8, 4.0)          # the lobby's lit ceiling seen through the glass
    p.box('flat:#5e5f5c', -2.0, 0, -0.08, 2.0, 2.4, -0.06)
    p.box(GLASS_L, -1.8, 0.05, -0.1, 1.8, 2.35, -0.08)
    p.box(ALU, -0.03, 0, -0.14, 0.03, 2.4, -0.09)
    p.box(NAVY_H, -4.5, 3.4, -2.6, 4.5, 3.75, 0.0)
    p.box('light', -4.2, 3.36, -2.4, 4.2, 3.4, -0.2)
    for xp in (-4.3, 4.3):
        p.box(ALU, xp - 0.05, 0, -2.5, xp + 0.05, 3.4, -2.4)
    for xp in (-6.2, 5.0):
        p.box(STONE_H, xp, 0, -1.0, xp + 1.2, 0.6, -0.2)
        p.box(HEDGE, xp + 0.1, 0.6, -0.9, xp + 1.1, 1.1, -0.3)
    p.box('flat:#2b2b28', 2.6, 0, -1.4, 3.2, 1.1, -1.25)
    # The roof: parapet, plant, the tank, and the frame of the roof sign.
    roof_kit(p, r, x0, x1, 0.0, BHD, BHH, NAVY_H, cap='flat:#e7e3da', units=5)
    roof_frame(p, 'roof', x0 + 2.0, x1 - 2.0, BHH + 1.0, 0.8, 2.6, col='flat:#2a3a52')
    mark('blade', BHW / 2 - 0.6, 24.0, -0.9, 1.4, 14.0, (0, -1))
    mark('name', 0.0, 4.9 - 0.75, -0.25, 9.0, 0.6)


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


# ── The peninsula's fill (2026-11-25): where the new town lives. Flats, a school, the convention hotel, the bay mall,
# the marina's dry-boat store, the fishing village's shrine kept on Hama-dōri ──
TILE_B = 'flat:#d9cbb2'      # beige tile of the older-looking flats
TILE_W = 'flat:#e6e2d8'
COPPER = 'flat:#5f8a78'      # weathered copper roofs
GRANITE_G = 'flat:#a9a69e'
CORRUG = 'flat:#9ea6aa'


def rtowa(p):
    """A 90 m slab of flats: deep balconies front and back on every floor, tiled ends, a frame crown, a glass lobby."""
    x0, x1, z0, z1, H = -16.0, 16.0, 2.0, 18.0, 90.0
    p.box(TILE_W, x0, 0, z0, x1, H, z1)
    curtain(p, x0, x1, z0, z1, 0.0, 6.0, glass=GLASS_T, mull=WHITE_S, fh=6.0, bay=2.4, sp=0.2)
    grid(p, x0, x1, z0, z1, 6.0, H, TILE_W, fh=3.0, bay=3.2, ww=1.2, wh=1.5, sill=0.9, which='lr', body=False)
    for face, at, s in (('f', z0, -1), ('b', z1, 1)):
        for k in range(int((H - 6.0) / 3.0)):
            y = 6.0 + k * 3.0
            za, zb = (at - 1.8, at) if s < 0 else (at, at + 1.8)
            p.box(WHITE_S, x0 + 0.4, y - 0.18, za, x1 - 0.4, y, zb)
            slab(p, 'glassTint', face, x0 + 0.6, x1 - 0.6, y, y + 1.1, at, 1.75)
            quad(p, WINDOW, face, x0 + 0.8, x1 - 0.8, y + 0.2, y + 2.7, out(face, at, 0.02), col='flat:#55707e')
        for x in (x0 + 0.4, 0.0, x1 - 0.4):
            slab(p, TILE_W, face, x - 0.25, x + 0.25, 6.0, H, at, 1.8)
    p.box(WHITE_S, -6.0, 4.6, 0.0, 6.0, 5.6, 2.0)
    p.box(DARK, -1.2, 0, 1.92, 1.2, 2.6, 1.98)
    for x in (x0, x1):
        p.box(WHITE_S, x - 0.3, H, z0 - 1.8, x + 0.3, H + 4.0, z1 + 1.8)
    p.box(WHITE_S, x0 - 0.3, H + 3.4, z0 - 1.8, x1 + 0.3, H + 4.0, z0 - 1.2)
    p.box(WHITE_S, x0 - 0.3, H + 3.4, z1 + 1.2, x1 + 0.3, H + 4.0, z1 + 1.8)
    beacons(p, x0 + 1, x1 - 1, z0 + 1, z1 - 1, H)
    mark('name', 0.0, 5.1, -0.06, 10.0, 0.7)


def rtowb(p):
    """A 74 m square tower of flats in beige tile: balcony slabs all round, glass corner bays, the top floors set back."""
    x0, x1, z0, z1, H, TOPB = -11.0, 11.0, 2.0, 24.0, 74.0, 62.0
    grid(p, x0, x1, z0, z1, 6.0, TOPB, TILE_B, fh=3.1, bay=3.0, ww=2.2, wh=2.0, sill=0.5)
    p.box(TILE_B, x0, 0, z0, x1, 6.0, z1)
    curtain(p, x0 + 3, x1 - 3, z0, z1, 0.0, 5.6, glass=GLASS_T, mull=WHITE_S, fh=5.6, bay=2.4, sp=0.2, which='f')
    bands(p, WHITE_S, x0, x1, z0, z1, [6.0 + k * 3.1 for k in range(int((TOPB - 6.0) / 3.1))], t=0.2, proud=1.3)
    for cx, cz in ((x0, z0), (x1, z0), (x0, z1), (x1, z1)):
        p.box(GLASS_T, cx - 1.6, 6.0, cz - 1.6, cx + 1.6, TOPB, cz + 1.6)
    grid(p, x0 + 3, x1 - 3, z0 + 3, z1 - 3, TOPB, H, TILE_B, fh=3.1, bay=3.0, ww=2.2, wh=2.0, sill=0.5)
    p.box('flat:#8a5a44', x0 + 2.6, H, z0 + 2.6, x1 - 2.6, H + 2.2, z1 - 2.6)
    p.box('flat:#8a5a44', x0 - 0.2, TOPB, z0 - 0.2, x1 + 0.2, TOPB + 0.6, z1 + 0.2)
    beacons(p, x0 + 4, x1 - 4, z0 + 4, z1 - 4, H + 2.2)
    p.box(WHITE_S, -5.0, 4.4, 0.0, 5.0, 5.2, 2.0)
    p.box(DARK, -1.2, 0, 1.92, 1.2, 2.6, 1.98)
    # The cafe in the corner of the ground floor: its own awning.
    p.box('flat:#2f4a3a', 5.4, 3.4, 0.6, 10.6, 3.6, 2.0)
    mark('name', 0.0, 4.8, -0.06, 8.0, 0.6)
    mark('shop', 8.0, 4.3, 1.9, 5.0, 0.7)


def school(p):
    """A new-town elementary school: four white storeys of ribbon windows, a glass stair tower, the gym at one end."""
    W, D, H = 64.0, 16.0, 15.6
    x0, x1 = -W / 2, W / 2
    ribbon(p, x0, x1 - 18, 0, D, 0.0, H, WHITE_P, fh=3.8, wh=1.9, sill=0.9, chunk=3.6)
    p.box(WHITE_S, x0 - 0.2, H, -0.2, x1 - 18 + 0.2, H + 1.2, D + 0.2)
    bands(p, 'flat:#5f9ec9', x0, x1 - 18, 0, D, (3.7, 7.5, 11.3), t=0.25, proud=0.3)
    # The glass stair tower and the entrance canopy.
    p.box('glassTint', 4.0, 0, -2.0, 10.0, H + 2.6, 2.0)
    p.box(WHITE_S, 3.8, H + 2.6, -2.2, 10.2, H + 3.0, 2.2)
    p.box(WHITE_S, -6.0, 3.0, -4.0, 4.0, 3.4, 0.0)
    for x in (-5.6, 3.6):
        p.box(WHITE_S, x - 0.1, 0, -3.9, x + 0.1, 3.0, -3.7)
    p.box(DARK, -3.0, 0, -0.06, 1.0, 2.6, -0.02)
    # The gym: a hall under a shallow vault, high windows.
    gx0, gx1 = x1 - 18, x1
    p.box('flat:#d7dcde', gx0, 0, 0, gx1, 9.0, D + 6)
    ribbon(p, gx0, gx1, 0, D + 6, 6.0, 9.0, 'flat:#d7dcde', fh=3.0, wh=1.4, sill=0.8, chunk=3.0, body=False)
    n = 10
    arc = [(0 + (D + 6) * k / n, 9.0 + 2.0 * math.sin(math.pi * k / n)) for k in range(n + 1)]
    p.prism('flat:#7f8a8e', [(z, y) for z, y in arc] + [(z, y - 0.4) for z, y in arc[::-1]], 'x', gx0 - 0.3, gx1 + 0.3)
    p.prism('flat:#d7dcde', [(0.0, 9.0)] + arc + [(D + 6, 9.0)], 'x', gx0, gx1)
    # Rooftop fence.
    for x in rows(x0, x1 - 18, 2.0):
        p.box(GREY_P, x - 0.03, H + 1.2, -0.1, x + 0.03, H + 2.6, 0.0)
    p.box(GREY_P, x0, H + 2.5, -0.12, x1 - 18, H + 2.6, 0.0)
    mark('name', -14.0, H - 1.6, -0.08, 16.0, 1.4)


def chotel(p):
    """The convention hotel on the bay road: a banquet podium, a slender 84 m slab in green glass with white fins."""
    W, D, H = 60.0, 44.0, 84.0
    p.box(STONE_P, -W / 2, 0, 0, W / 2, 12.0, D)
    curtain(p, -W / 2, W / 2, 0, D, 0.0, 12.0, glass='flat:#4d7a78', mull=WHITE_S, fh=6.0, bay=3.0, sp=0.4, spandrel=STONE_P, which='flr')
    p.box(WHITE_S, -16.0, 6.0, -8.0, 16.0, 6.8, 0.0)
    for x in (-14.0, 14.0):
        p.cyl(WHITE_S, (x, 3.0, -7.0), 1, 0.35, 6.0, seg=10)
    for xc in (-4.0, 4.0):
        p.box(DARK, xc - 1.8, 0, -0.06, xc + 1.8, 3.4, -0.02)
    x0, x1, z0, z1 = -22.0, 22.0, 10.0, 30.0
    curtain(p, x0, x1, z0, z1, 12.0, H, glass='flat:#4d7a78', mull=WHITE_S, fh=3.4, bay=2.0, sp=0.6, chunk=2)
    fins(p, WHITE_S, x0, x1, z0, z1, 12.0, H, 4.0, w=0.4, proud=0.7, which='fb')
    p.prism('glassTint', [(z0, H), (z1, H), (z1, H + 6.0)], 'x', x0, x1)
    p.box(WHITE_S, x0 - 0.5, H - 0.4, z0 - 0.5, x1 + 0.5, H, z1 + 0.5)
    beacons(p, x0 + 1, x1 - 1, z0 + 1, z1 - 1, H)
    p.box('flat:#7a8f5a',-W / 2 + 1, 12.0, 1.0, x0 - 1, 12.3, D - 1)
    mark('name', 0.0, H - 3.0, z0 - 0.75, 16.0, 2.0)
    mark('plate', 0.0, 9.0, -0.25, 14.0, 1.0)


def mall(p):
    """The bay mall: five storeys, a glass atrium at the front, white panels, the cinema's box on the roof, terraces
    stepping back towards the bay behind (front at z = 0 on the bay road, the terraces at the back)."""
    W, D, FH, NF = 124.0, 40.0, 5.0, 5
    x0, x1 = -W / 2, W / 2
    for k in range(NF):
        zb = D - k * 3.0
        y0, y1 = k * FH, (k + 1) * FH
        p.box(WHITE_P, x0, y0, 0.0, x1, y1, zb - 3.0)
        # The terrace floor's glass wall at the back and its deck, rail and planters.
        p.box('glassTint', x0 + 2, y0 + 0.2, zb - 3.05, x1 - 2, y1 - 0.4, zb - 3.0)
        for x in rows(x0 + 2, x1 - 2, 3.0):
            p.box(WHITE_S, x - 0.06, y0, zb - 3.1, x + 0.06, y1, zb - 3.0)
        p.box(TEAK, x0, y0, zb - 3.0, x1, y0 + 0.15, zb)
        slab(p, 'glassTint', 'b', x0, x1, y0 + 0.15, y0 + 1.25, zb, -0.05)
        for x in rows(x0 + 4, x1 - 4, 12.0):
            p.box('flat:#6d8a48', x - 2.0, y0 + 0.15, zb - 1.2, x + 2.0, y0 + 0.75, zb - 0.4)
    bands(p, 'flat:#c9d3d8', x0, x1, 0.0, 10.0, [k * FH - 0.4 for k in range(1, NF + 1)], t=0.4, proud=0.15)
    # The atrium: full-height glass across the middle of the front, the entrance canopy.
    p.box('glassTint', -16.0, 0, -0.4, 16.0, NF * FH + 3.0, 0.0)
    for x in rows(-16.0, 16.0, 2.0):
        p.box(WHITE_S, x - 0.08, 0, -0.5, x + 0.08, NF * FH + 3.0, -0.3)
    p.box(WHITE_S, -16.5, NF * FH + 3.0, -0.6, 16.5, NF * FH + 3.6, 8.0)
    p.box(WHITE_S, -12.0, 5.0, -6.0, 12.0, 5.5, -0.4)
    for xc in (-8.0, 0.0, 8.0):
        p.box(DARK, xc - 2.4, 0, -0.46, xc + 2.4, 3.2, -0.42)
    # Side entrances and shop windows along the ground floor.
    for xc in rows(x0 + 2, -18.0, 6.5) + rows(18.0, x1 - 2, 6.5):
        p.box(GLASS_T, xc - 2.6, 0.3, -0.06, xc + 2.6, 4.2, -0.02)
    # The cinema's windowless box on the roof.
    p.box('flat:#3a4048', 30.0, NF * FH, 2.0, 60.0, NF * FH + 10.0, 22.0)
    p.box(WHITE_S, 29.8, NF * FH + 9.6, 1.8, 60.2, NF * FH + 10.2, 22.2)
    mark('name', 0.0, NF * FH - 2.0, -0.62, 26.0, 3.0)
    mark('cinema', 45.0, NF * FH + 6.0, 1.94, 22.0, 3.0)
    mark('side', -40.0, 21.0, -0.2, 24.0, 2.4)


def boatstore(p):
    """The marina's dry-boat store: a steel shed open to the street, three tiers of racks with boats on them."""
    W, D, H = 40.0, 26.0, 15.0
    x0, x1 = -W / 2, W / 2
    for face, a0, a1, at in sides(x0, x1, 0, D, 'blr'):
        slab(p, CORRUG, face, a0, a1, 0.0, H, at, 0.0)
        for c in rows(a0, a1, 0.6):
            slab(p, 'flat:#8b9397', face, c - 0.08, c + 0.08, 0.0, H, at, 0.05)
    p.box(CORRUG, x0, H, 0, x1, H + 0.4, D)
    p.box('flat:#1f3550', x0 - 0.1, H - 1.6, -0.1, x1 + 0.1, H + 0.4, 0.0)
    for x in rows(x0, x1, 8.0) + [x0 + 0.2, x1 - 0.2]:
        p.box('flat:#3d4448', x - 0.2, 0, 0.0, x + 0.2, H - 1.6, 0.4)
    for y in (0.6, 5.0, 9.4):
        p.box('flat:#3d4448', x0, y - 0.25, 0.4, x1, y, D - 1.0)
        for xc in rows(x0 + 1, x1 - 1, 4.0):
            p.box(HULL, xc - 1.2, y, 2.0, xc + 1.2, y + 1.3, D - 3.0)
            p.box(BLUE, xc - 1.22, y + 0.5, 2.0, xc + 1.22, y + 0.65, D - 3.0)
    mark('name', 0.0, H - 0.6, -0.12, 16.0, 1.4)


def hamamiya(p):
    """The fishing village's shrine, kept when the land was made: a granite torii, a stone path and lanterns, a small
    hall with a copper roof, a low stone fence round the precinct, the boatmen's anchor stone. The pine is the game's."""
    W, D = 16.0, 22.0
    x0, x1 = -W / 2, W / 2
    p.box(GRANITE_G, x0, 0, 0, x1, 0.06, D)
    for (a, e) in ((x0, -2.4), (2.4, x1)):
        p.box(GRANITE_G, a, 0, 0.0, e, 0.9, 0.4)
    p.box(GRANITE_G, x0, 0, 0.0, x0 + 0.4, 0.9, D)
    p.box(GRANITE_G, x1 - 0.4, 0, 0.0, x1, 0.9, D)
    p.box(GRANITE_G, x0, 0, D - 0.4, x1, 0.9, D)
    # The torii.
    for x in (-2.0, 2.0):
        p.cyl('flat:#b8b4aa', (x, 2.1, 1.6), 1, 0.2, 4.2, seg=12)
    p.box('flat:#b8b4aa', -2.6, 3.4, 1.42, 2.6, 3.7, 1.78)
    p.box('flat:#b8b4aa', -3.2, 4.1, 1.35, 3.2, 4.5, 1.85)
    p.box('flat:#b8b4aa', -0.3, 3.7, 1.5, 0.3, 4.1, 1.7)
    # The path and two lanterns.
    p.box('flat:#cfcac0', -0.9, 0.06, 0.4, 0.9, 0.1, 15.0)
    for x in (-2.4, 2.4):
        p.box(GRANITE_G, x - 0.35, 0.06, 8.65, x + 0.35, 0.36, 9.35)
        p.box(GRANITE_G, x - 0.12, 0.36, 8.88, x + 0.12, 1.3, 9.12)
        p.box(GRANITE_G, x - 0.3, 1.3, 8.7, x + 0.3, 1.75, 9.3)
        p.box(GRANITE_G, x - 0.42, 1.75, 8.58, x + 0.42, 1.9, 9.42)
    # The hall.
    p.box(GRANITE_G, -4.5, 0, 14.6, 4.5, 0.6, 21.0)
    p.box('flat:#8a6a4a', -3.6, 0.6, 15.6, 3.6, 3.4, 20.4)
    p.box('flat:#3a2e24', -1.6, 0.6, 15.56, 1.6, 2.6, 15.6)
    p.box('wood:#8a6a4a', -1.0, 0.6, 15.0, 1.0, 1.3, 15.5)
    for x in (-3.6, 3.6):
        p.box('flat:#6e5038', x - 0.15, 0.6, 15.0, x + 0.15, 3.4, 15.3)
    p.prism(COPPER, [(14.2, 3.2), (17.9, 5.6), (21.6, 3.2), (21.6, 3.0), (17.9, 5.35), (14.2, 3.0)], 'x', -4.8, 4.8)
    p.box(COPPER, -4.9, 5.5, 17.7, 4.9, 5.75, 18.1)
    # The anchor stone: a granite block carved with an anchor, the boatmen's offering.
    p.box(GRANITE_G, x0 + 1.2, 0.06, 5.0, x0 + 2.8, 1.6, 5.6)
    p.box('flat:#5d666c', x0 + 1.9, 0.5, 4.97, x0 + 2.1, 1.3, 5.0)
    p.box('flat:#5d666c', x0 + 1.6, 0.6, 4.97, x0 + 2.4, 0.7, 5.0)
    mark('name', x0 + 4.2, 1.1, -0.06, 2.6, 0.5)


# ── Perimeter-block flats (2026-11-25): the peninsula's blocks are wrapped in deep mid-rise flats, balconies to the
# street, open access galleries to the courtyard behind. Bars 13 m deep in lengths that tile any side to within 4 m,
# and a corner piece 14 x 14 with a second street face on its local -x side. ──
PB_D, PB_G, PB_FH = 13.0, 4.0, 3.0
PB_WALLS = ['flat:#e9e6de', 'flat:#d9cbb2', 'flat:#c9d0d3', 'flat:#e2d6c4', 'flat:#d2cfc8']
PB_ACC = ['flat:#8a5a44', 'flat:#5f7f8f', 'flat:#3d4a55', 'flat:#9a6b45', 'flat:#6d7a5a']


PB_STYLES = [
    # wall, accent, parapet kind: 'glass' (clear panels on posts), 'solid' (tiled parapet with a colour band),
    # 'panel' (frosted panels, a coloured panel in some bays)
    dict(wall='flat:#ebe8e0', acc='flat:#5f7f8f', kind='glass', tile='flat:#d8d4ca'),
    dict(wall='flat:#d9cbb2', acc='flat:#8a5a44', kind='solid', tile='flat:#c4b294'),
    dict(wall='flat:#c9d0d3', acc='flat:#3d4a55', kind='panel', tile='flat:#b3bcc0'),
    dict(wall='flat:#e2d6c4', acc='flat:#9a6b45', kind='glass', tile='flat:#cdbfa6'),
    dict(wall='flat:#d2cfc8', acc='flat:#6d7a5a', kind='panel', tile='flat:#bdb9b0'),
    dict(wall='flat:#b9876a', acc='flat:#efe7dc', kind='solid', tile='flat:#8f624b'),   # brown tile, cream trim
    dict(wall='flat:#dfe6df', acc='flat:#2f5e6e', kind='glass', tile='flat:#b2bcb4'),   # pale green, teal
    dict(wall='flat:#efe9df', acc='flat:#b0553a', kind='panel', tile='flat:#c9b9a2'),   # white, terracotta
]
DOORS = ['flat:#6b4a3a', 'flat:#2f4a6e', 'flat:#7a1f24', 'flat:#3d5a54', 'flat:#8d8a82', 'flat:#c9a227']
LAUNDRY = ['flat:#f2efe6', 'flat:#c7d6e6', 'flat:#e6c7cf', 'flat:#d9e3c5', 'flat:#f0d9a8', 'flat:#9fb7c2']
FROST = 'flat:#dfe6ea'


class FaceT:
    """One street face's frame: `along` runs a0 .. a1, `n` is the distance out from the wall plane `at` (balconies
    stand at n 0 .. depth). Turns (u, y, n) into model coordinates for the front (-z) or the left (-x) face."""

    def __init__(self, face, at):
        self.face, self.at = face, at

    def box(self, p, mat, u0, y0, n0, u1, y1, n1, col=None):
        if self.face == 'f':
            p.box(mat, u0, y0, self.at - max(n0, n1), u1, y1, self.at - min(n0, n1), col)
        else:
            p.box(mat, self.at - max(n0, n1), y0, u0, self.at - min(n0, n1), y1, u1, col)


def pb_street(p, rng, st, face, a0, a1, at, nf, top_set=False, depth=1.4):
    """A street face of flats: per floor a balcony slab, the parapet in the block's style, sliding doors behind,
    an AC unit and a laundry pole in every flat, washing, plants; frosted dividers between flats."""
    T = FaceT(face, at)
    n = max(2, round((a1 - a0) / 7.2))
    uw = (a1 - a0) / n
    for k in range(nf):
        y = PB_G + k * PB_FH
        top = top_set and k == nf - 1
        dp = depth + (2.0 if top else 0.0)
        T.box(p, WHITE_S, a0, y - 0.18, 0.0, a1, y, dp)
        # The parapet.
        if st['kind'] == 'solid':
            T.box(p, st['wall'], a0, y, 0.0, a1, y + 1.1, 0.14)
            T.box(p, st['acc'], a0, y + 0.82, -0.01, a1, y + 0.96, 0.15)
        else:
            panel = 'glassTint' if st['kind'] == 'glass' else FROST
            T.box(p, panel, a0 + 0.05, y + 0.08, 0.03, a1 - 0.05, y + 1.02, 0.06)
            for c in rows(a0, a1, 1.6) + [a0 + 0.03, a1 - 0.03]:
                T.box(p, ALU_DK, c - 0.025, y, 0.0, c + 0.025, y + 1.1, 0.05)
            T.box(p, st['acc'], a0, y + 1.04, -0.01, a1, y + 1.12, 0.08)
        for i in range(n):
            u0, u1 = a0 + i * uw, a0 + (i + 1) * uw
            if st['kind'] == 'panel' and rng.random() < 0.25:
                T.box(p, st['acc'], u0 + 0.1, y + 0.1, 0.0, u1 - 0.1, y + 1.0, 0.025)
            # Sliding doors and a window behind, framed.
            dn = dp
            GL = 'flat:#8aa3b1'
            T.box(p, ALU, u0 + 0.5, y + 0.05, dn, u1 - 2.0, y + 2.35, dn + 0.02)
            T.box(p, WINDOW_LIT if p.lit.random() < LIT_SHARE else WINDOW_DARK, u0 + 0.56, y + 0.1, dn - 0.005, u1 - 2.06, y + 2.29, dn + 0.015, GL)
            T.box(p, ALU, (u0 + u1 - 1.5) / 2 - 0.04, y + 0.05, dn - 0.02, (u0 + u1 - 1.5) / 2 + 0.04, y + 2.35, dn + 0.01)
            T.box(p, ALU, u1 - 1.7, y + 0.9, dn, u1 - 0.5, y + 2.35, dn + 0.02)
            T.box(p, WINDOW_LIT if p.lit.random() < LIT_SHARE else WINDOW_DARK, u1 - 1.65, y + 0.95, dn - 0.005, u1 - 0.55, y + 2.3, dn + 0.015, GL)
            # Curtains drawn to the sides of the doors, some half closed; a transom band.
            cw = rng.uniform(0.3, 1.2)
            cc = rng.choice(['flat:#efe9dc', 'flat:#e6dccb', 'flat:#dfe6ea', 'flat:#e9e1d3'])
            T.box(p, cc, u0 + 0.6, y + 0.15, dn - 0.02, u0 + 0.6 + cw, y + 2.25, dn - 0.01)
            T.box(p, cc, u1 - 2.1 - rng.uniform(0.3, 0.9), y + 0.15, dn - 0.02, u1 - 2.1, y + 2.25, dn - 0.01)
            T.box(p, st['tile'], u0 + 0.5, y + 2.35, dn - 0.01, u1 - 0.5, y + PB_FH - 0.2, dn + 0.02)
            # The AC unit on the balcony floor at the flat's end.
            T.box(p, ACU, u1 - 1.3, y, dn - 0.45, u1 - 0.4, y + 0.66, dn - 0.12)
            T.box(p, DARK, u1 - 1.2, y + 0.08, dn - 0.46, u1 - 0.66, y + 0.58, dn - 0.45)
            # The laundry pole on its brackets, washing on some.
            T.box(p, ALU, u0 + 0.4, y + 1.95, 0.55, u1 - 0.4, y + 2.0, 0.6)
            for c in (u0 + 0.45, u1 - 0.45):
                T.box(p, ALU, c - 0.02, y + 1.95, 0.0 + dn - 0.3, c + 0.02, y + 2.0, dn)
                T.box(p, ALU, c - 0.02, y + 1.95, 0.5, c + 0.02, y + 2.0, dn - 0.3)
            if rng.random() < 0.35:
                for _ in range(rng.randint(1, 3)):
                    c = rng.uniform(u0 + 0.8, u1 - 1.6)
                    w = rng.uniform(0.35, 0.9)
                    T.box(p, rng.choice(LAUNDRY), c, y + rng.uniform(1.15, 1.45), 0.56, c + w, y + 1.95, 0.6)
            if rng.random() < 0.25:
                c = rng.uniform(u0 + 0.6, u0 + 1.6)
                T.box(p, 'flat:#8a6a4a', c, y, 0.3, c + 0.4, y + 0.35, 0.7)
                T.box(p, 'flat:#4f7a3e', c - 0.1, y + 0.35, 0.25, c + 0.5, y + 0.85, 0.75)
            if i:
                T.box(p, FROST, u0 - 0.03, y, 0.15, u0 + 0.03, y + 2.1, dp)
    # End fins and the street storey.
    for c in (a0, a1):
        T.box(p, st['tile'], c - 0.2 if c == a1 else c, PB_G - 0.2, 0.0, c if c == a1 else c + 0.2, PB_G + nf * PB_FH, depth)


def pb_roof(p, rng, x0, x1, z0, z1, H, st, core=None, solar=False):
    """Roof: a parapet, the lift's machine room over the core, a water tank, an antenna, condensers, solar panels."""
    for a, b, c, d in ((x0, z0, x1, z0 + 0.2), (x0, z1 - 0.2, x1, z1), (x0, z0, x0 + 0.2, z1), (x1 - 0.2, z0, x1, z1)):
        p.box(st['tile'], a, H, b, c, H + 0.9, d)
    p.box(st['acc'], x0 - 0.02, H + 0.75, z0 - 0.02, x1 + 0.02, H + 0.9, z0 + 0.22)
    p.box('flat:#8f8d86', x0 + 0.2, H, z0 + 0.2, x1 - 0.2, H + 0.04, z1 - 0.2)
    cx = core if core is not None else (x0 + x1) / 2
    p.box(st['tile'], cx - 2.0, H, z1 - 4.6, cx + 2.0, H + 3.0, z1 - 0.6)
    p.box(st['acc'], cx - 2.1, H + 3.0, z1 - 4.7, cx + 2.1, H + 3.2, z1 - 0.5)
    tank(p, x0 + 2.0, H, z0 + (z1 - z0) / 2)
    p.cyl(STEEL, (x1 - 1.2, H + 3.0, z1 - 1.5), 1, 0.04, 6.0, seg=6)
    for y in (H + 4.4, H + 5.4):
        p.box(STEEL, x1 - 1.9, y, z1 - 1.52, x1 - 0.5, y + 0.04, z1 - 1.48)
    for k in range(rng.randint(2, 5)):
        acu(p, x0 + 4.0 + k * 1.1, H + 0.04, z0 + 1.6)
    if solar and x1 - x0 > 14:
        for xs in rows(x0 + 6.0, cx - 3.0, 2.2) + rows(cx + 3.0, x1 - 3.0, 2.2):
            p.prism('flat:#22324a', [(z0 + 3.0, H + 0.4), (z0 + 6.5, H + 0.4), (z0 + 6.5, H + 1.4)], 'x', xs - 1.0, xs + 1.0)


def pb_gallery(p, rng, x0, x1, zb, d, nf, st, skip=None):
    """The courtyard side: open access galleries with steel rails, a coloured front door and a barred kitchen window
    to every flat, gas meters, pipes down between the flats."""
    n = max(2, round((x1 - x0) / 7.2))
    uw = (x1 - x0) / n
    for k in range(nf):
        y = PB_G + k * PB_FH
        p.box(WHITE_S, x0, y - 0.18, zb, x1, y, d)
        p.box(st['wall'], x0, y, d - 0.1, x1, y + 0.45, d)
        p.box(ALU_DK, x0, y + 1.05, d - 0.06, x1, y + 1.1, d)
        for c in rows(x0, x1, 1.5):
            p.box(ALU_DK, c - 0.02, y + 0.45, d - 0.06, c + 0.02, y + 1.05, d - 0.02)
        for i in range(n):
            u0 = x0 + i * uw
            if skip and skip[0] < u0 + uw / 2 < skip[1]:
                continue
            p.box(rng.choice(DOORS), u0 + 0.8, y, zb, u0 + 1.75, y + 2.05, zb + 0.04)
            p.box(FRAME, u0 + 2.3, y + 1.0, zb, u0 + 3.6, y + 2.0, zb + 0.04)
            p.box(WINDOW_LIT if p.lit.random() < LIT_SHARE else WINDOW, u0 + 2.36, y + 1.06, zb + 0.04, u0 + 3.54, y + 1.94, zb + 0.05)
            for c in (2.6, 2.95, 3.3):
                p.box(ALU, u0 + c - 0.015, y + 1.0, zb + 0.06, u0 + c + 0.015, y + 2.0, zb + 0.1)
            p.box('flat:#d9d5c4', u0 + 1.95, y + 1.2, zb, u0 + 2.2, y + 1.7, zb + 0.18)
            if i:
                p.cyl('flat:#8d8a82', (u0, PB_G + nf * PB_FH / 2, zb + 0.15), 1, 0.06, nf * PB_FH, seg=6, caps=False)


def pb_ground(p, rng, x0, x1, zf, st, lobby=0.0, drive=None):
    """The street storey: a lobby with a mailbox wall and a canopy, shopfront glass elsewhere, planters."""
    for a, b in ([(x0, x1)] if drive is None else [(x0, drive[0]), (drive[1], x1)]):
        p.box(st['tile'], a, 0, zf, b, PB_G, PB_D - 1.2)
    segs = [(x0 + 0.6, x1 - 0.6)] if drive is None else [(x0 + 0.6, drive[0] - 0.4), (drive[1] + 0.4, x1 - 0.6)]
    for a, b in segs:
        if b - a < 2:
            continue
        p.box('windowDim', a, 0.3, zf - 0.05, b, 3.4, zf, 'flat:#9fb6c2')
        p.box(ALU, a, 2.55, zf - 0.09, b, 2.63, zf - 0.04)
        for c in rows(a, b, 1.5):
            p.box(ALU, c - 0.03, 0.3, zf - 0.09, c + 0.03, 3.4, zf - 0.04)
        for c in rows(a, b, 3.0) + [a, b]:
            p.box(st['tile'], c - 0.14, 0, zf - 0.12, c + 0.14, PB_G, zf)
    p.box(st['acc'], x0, 3.5, zf - 0.14, x1, PB_G - 0.2, zf)
    if lobby is not None:
        # The lobby: recessed glass doors, the mailbox wall seen through them, a canopy, two planters.
        p.box(GLASS_T, lobby - 2.2, 0, zf + 1.2, lobby + 2.2, 3.2, zf + 1.25)
        p.box(st['tile'], lobby - 2.4, 0, zf - 0.13, lobby - 2.2, PB_G, zf + 1.25)
        p.box(st['tile'], lobby + 2.2, 0, zf - 0.13, lobby + 2.4, PB_G, zf + 1.25)
        p.box('flat:#cfcac0', lobby - 2.2, 0, zf - 0.13, lobby + 2.2, 0.02, zf + 1.2)
        p.box('flat:#9aa0a6', lobby - 1.6, 0.9, zf + 2.6, lobby + 1.6, 2.2, zf + 2.9)
        p.box(DARK, lobby - 0.6, 0, zf + 1.18, lobby + 0.6, 2.4, zf + 1.2)
        p.box(WHITE_S, lobby - 3.0, 3.0, -0.4, lobby + 3.0, 3.25, zf)
        p.box(st['acc'], lobby - 3.0, 3.0, -0.45, lobby + 3.0, 3.25, -0.4)
        for c in (lobby - 4.2, lobby + 3.0):
            p.box(st['tile'], c, 0, -0.6, c + 1.2, 0.6, 0.2)
            p.box(HEDGE, c + 0.1, 0.6, -0.5, c + 1.1, 1.1, 0.1)


def pbar(p, W, nf, si, seed, drive=False):
    st = PB_STYLES[si % len(PB_STYLES)]
    rng = random.Random(seed)
    x0, x1, zf, zb = -W / 2, W / 2, 1.4, PB_D - 1.2
    H = PB_G + nf * PB_FH
    top_set = st['kind'] == 'solid'
    dv = (-3.2, 3.2) if drive else None
    # The body (the passage cut through two storeys where cars drive in).
    if drive:
        y2 = PB_G + PB_FH
        for a, b in ((x0, dv[0]), (dv[1], x1)):
            p.box(st['wall'], a, PB_G, zf, b, y2, zb)
        p.box(st['wall'], x0, y2, zf, x1, H - (PB_FH if top_set else 0), zb)
        for xc in dv:
            p.box('flat:#cfcac0', xc - 0.2 if xc > 0 else xc, 0, zf - 0.2, xc if xc > 0 else xc + 0.2, y2, PB_D)
        p.box('flat:#cfcac0', dv[0], y2 - 0.5, zf - 0.2, dv[1], y2, PB_D)
        p.box(LIGHT, -0.6, y2 - 0.52, 4.0, 0.6, y2 - 0.5, 9.0)
        mark('gate', 0.0, y2 - 1.1, zf - 0.25, 5.2, 0.8)
    else:
        p.box(st['wall'], x0, PB_G, zf, x1, H - (PB_FH if top_set else 0), zb)
    if top_set:
        p.box(st['wall'], x0, H - PB_FH, zf + 2.0, x1, H, zb)
    pb_ground(p, rng, x0, x1, zf, st, lobby=x0 + 4.6 if drive else 0.0, drive=dv)
    pb_street(p, rng, st, 'f', x0, x1, zf, nf, top_set)
    # The stair and lift core: a glazed tower on the courtyard side.
    core = 0.0 if not drive else x1 - 5.0
    pb_gallery(p, rng, x0, x1, zb, PB_D, nf, st, skip=(core - 2.4, core + 2.4))
    p.box('glassTint', core - 2.2, 0, zb, core + 2.2, H + 0.6, PB_D + 0.9)
    for y in [PB_G + k * PB_FH for k in range(nf + 1)]:
        p.box(st['tile'], core - 2.25, y - 0.25, zb, core + 2.25, y, PB_D + 0.95)
    for c in (core - 2.25, core + 2.1):
        p.box(st['tile'], c, 0, zb, c + 0.15, H + 0.6, PB_D + 0.95)
    # Ends: windows in tile surrounds, a bay window up the middle on the tall blocks.
    side_wall(p, rng, 'l', zf + 0.4, zb - 0.4, x0, PB_G, nf, PB_FH, st['wall'], st['acc'], band=st['tile'], bay=2.9)
    side_wall(p, rng, 'r', zf + 0.4, zb - 0.4, x1, PB_G, nf, PB_FH, st['wall'], st['acc'], band=st['tile'], bay=2.9)
    if nf >= 10:
        for s in (-1, 1):
            xs = x1 if s > 0 else x0
            p.box(st['tile'], min(xs, xs + s * 0.6), PB_G, 5.0, max(xs, xs + s * 0.6), H - 1.0, 8.2)
            for k in range(nf):
                y = PB_G + k * PB_FH
                p.box(ALU, min(xs + s * 0.6, xs + s * 0.62), y + 0.84, 5.24, max(xs + s * 0.6, xs + s * 0.62), y + 2.36, 7.96)
                p.box(WINDOW_LIT if p.lit.random() < LIT_SHARE else WINDOW_DARK, min(xs + s * 0.62, xs + s * 0.64), y + 0.9, 5.3, max(xs + s * 0.62, xs + s * 0.64), y + 2.3, 7.9, GLASS_L)
    for c in (x0 + 0.1, x1 - 0.1):
        p.cyl('flat:#8d8a82', (c, H / 2, zb - 0.3), 1, 0.05, H, seg=6, caps=False)
    pb_roof(p, rng, x0, x1, zf if not top_set else zf + 2.0, zb, H, st, core=core, solar=si % 3 == 2)


def pcorner(p, nf, si, seed):
    """The corner piece: balconies to the front (-z) and to the left (-x), the other two sides against its neighbours."""
    st = PB_STYLES[si % len(PB_STYLES)]
    rng = random.Random(seed)
    S, i = 14.0, 1.4
    x0, x1, z0, z1 = -S / 2, S / 2, 0.0, S
    H = PB_G + nf * PB_FH
    p.box(st['wall'], x0 + i, PB_G, z0 + i, x1, H, z1)
    p.box(st['tile'], x0 + i, 0, z0 + i, x1, PB_G, z1)
    p.box('windowDim', x0 + i + 0.4, 0.3, z0 + i - 0.05, x1 - 0.6, 3.4, z0 + i, 'flat:#9fb6c2')
    p.box('windowDim', x0 + i - 0.05, 0.3, z0 + i + 0.4, x0 + i, 3.4, z1 - 0.6, 'flat:#9fb6c2')
    for c in rows(x0 + i + 0.4, x1 - 0.6, 1.5):
        p.box(ALU, c - 0.03, 0.3, z0 + i - 0.09, c + 0.03, 3.4, z0 + i - 0.04)
    for c in rows(z0 + i + 0.4, z1 - 0.6, 1.5):
        p.box(ALU, x0 + i - 0.09, 0.3, c - 0.03, x0 + i - 0.04, 3.4, c + 0.03)
    p.box(st['acc'], x0 + i - 0.14, 3.5, z0 + i - 0.14, x1, PB_G - 0.2, z0 + i)
    p.box(st['acc'], x0 + i - 0.14, 3.5, z0 + i, x0 + i, PB_G - 0.2, z1)
    # A corner shop's canopy on the ground floor.
    p.box(st['acc'], x0 - 0.2, 3.0, -0.8, x1, 3.3, z0 + i)
    p.box(st['acc'], x0 - 0.8, 3.0, z0 - 0.8, x0 + i, 3.3, z1)
    pb_street(p, rng, st, 'f', x0, x1, z0 + i, nf)
    pb_street(p, rng, st, 'l', z0 + i, z1, x0 + i, nf)
    # The corner itself: a glazed bay rising the full height.
    p.box('glassTint', x0 - 0.2, PB_G, z0 - 0.2, x0 + 1.6, H, z0 + 1.6)
    side_wall(p, rng, 'r', z0 + i + 0.4, z1 - 0.4, x1, PB_G, nf, PB_FH, st['wall'], st['acc'], band=st['tile'], bay=2.9)
    side_wall(p, rng, 'b', x0 + i + 0.4, x1 - 0.4, z1, PB_G, nf, PB_FH, st['wall'], None, band=st['tile'], bay=2.9)
    for c in (x1 - 0.3,):
        p.cyl('flat:#8d8a82', (c, H / 2, z1 + 0.08), 1, 0.05, H, seg=6, caps=False)
    pb_roof(p, rng, x0 + i, x1, z0 + i, z1, H, st, core=x1 - 3.5, solar=False)


def pbar_fn(W, nf, k, drive=False):
    return lambda p: pbar(p, W, nf, k, 100 + k * 7 + nf, drive)


def pcorner_fn(nf, k):
    return lambda p: pcorner(p, nf, k, 300 + k * 11 + nf)


def pb_lo(W, nf, si, d=PB_D):
    st = PB_STYLES[si % len(PB_STYLES)]
    return dict(wall=st['wall'], W=W, D=d, H=PB_G + nf * PB_FH, y0=PB_G, nf=nf, fh=PB_FH, cap=st['tile'], base=st['tile'], band=WHITE_S, z0=0.0)


PB_VARIANTS = []
for _k, (_W, (_nf, _t)) in enumerate([(W, h) for W in (16, 20, 24, 28, 32) for h in ((8, 'l'), (12, 'h'))]):
    PB_VARIANTS.append(dict(id='pb%d%s' % (_W, _t), w=float(_W), d=PB_D + 1.0, h=PB_G + _nf * PB_FH + 6.0, fn=pbar_fn(float(_W), _nf, _k), gap=6.0, lo=pb_lo(float(_W), _nf, _k)))
for _k, (_nf, _t) in enumerate(((8, 'l'), (12, 'h'))):
    PB_VARIANTS.append(dict(id='pg%s' % _t, w=24.0, d=PB_D + 1.0, h=PB_G + _nf * PB_FH + 6.0, fn=pbar_fn(24.0, _nf, _k + 1, True), gap=6.0, lo=pb_lo(24.0, _nf, _k + 1)))
for _k, (_nf, _t) in enumerate(((10, 'l'), (14, 'h'))):
    PB_VARIANTS.append(dict(id='pc%s' % _t, w=14.0, d=14.0, h=PB_G + _nf * PB_FH + 3.4, fn=pcorner_fn(_nf, _k + 2), gap=6.0, lo=pb_lo(14.0, _nf, _k + 2, d=14.0)))


# ── The north waterfront (2026-11-25): a barrier at the courtyard car parks' drive-throughs, the two towers of flats
# behind the mall that mark Minato Center from across the river mouth, the terrace restaurant and the rowing club ──


def gatebar(p):
    """A car-park barrier: the arm's housing, a striped arm 4.6 m long (down), the resident-card post beside it."""
    p.box('flat:#e8e6df', -0.3, 0, -0.3, 0.3, 1.05, 0.3)
    p.box('flat:#c8102e', -0.32, 0.8, -0.32, 0.32, 0.9, 0.32)
    for k in range(6):
        p.box('flat:#c8102e' if k % 2 else 'flat:#f2f2ee', 0.3 + k * 0.75, 0.88, -0.04, 0.3 + (k + 1) * 0.75, 0.96, 0.04)
    p.box(ALU_DK, -1.3, 0, -0.12, -1.1, 1.2, 0.12)
    p.box('flat:#2b2e33', -1.35, 1.2, -0.18, -1.05, 1.55, 0.18)
    p.box(SCREEN, -1.36, 1.3, -0.12, -1.35, 1.48, 0.12)


BT_H = 132.0


def btow(p):
    """A 132 m tower of flats: a square plan with its corners cut, balcony bands all round, a lit frame crown."""
    S, c = 26.0, 4.0
    plan = [(-S / 2 + c, 1.0), (S / 2 - c, 1.0), (S / 2, 1.0 + c), (S / 2, S - c), (S / 2 - c, S), (-S / 2 + c, S), (-S / 2, S - c), (-S / 2, 1.0 + c)]
    inner = [(x * 0.9, 1.0 + (z - 1.0) * 0.9 + S * 0.05) for x, z in plan]
    extrude(p, 'flat:#55707e', inner, 0.0, BT_H)
    strips(p, inner, 8.0, BT_H - 6.0, 3.1, glass='flat:#55707e', out_m=0.03)
    for k in range(int((BT_H - 8.0) / 3.1)):
        y = 8.0 + k * 3.1
        extrude(p, WHITE_S, plan, y - 0.2, y, top=False)
        extrude(p, 'glassTint', plan, y, y + 1.05, top=False)
    extrude(p, 'flat:#e2e4e1', plan, 0.0, 8.0)
    p.box(GLASS_T, -8.0, 0.2, 0.95, 8.0, 7.0, 1.0)
    p.box(WHITE_S, -9.0, 4.0, -3.0, 9.0, 4.4, 1.0)
    for k in range(4):
        y = BT_H + k * 2.5
        r = S / 2 - 1.0 - k * 1.2
        p.box(WHITE_S, -r, y, 1.0 + S / 2 - r, r, y + 0.4, 1.0 + S / 2 + r)
    for sx in (-1, 1):
        for sz in (-1, 1):
            p.box(WHITE_S, sx * (S / 2 - 2.0) - 0.3, BT_H - 6.0, 1.0 + S / 2 + sz * (S / 2 - 2.0) - 0.3, sx * (S / 2 - 2.0) + 0.3, BT_H + 10.0, 1.0 + S / 2 + sz * (S / 2 - 2.0) + 0.3)
    p.box(LIGHT, -4.0, BT_H + 8.5, 1.0 + S / 2 - 4.0, 4.0, BT_H + 9.0, 1.0 + S / 2 + 4.0)
    beacons(p, -S / 2 + 2, S / 2 - 2, 3.0, S - 1.0, BT_H + 10.0)
    mark('name', 0.0, 6.0, -0.12, 14.0, 0.9)


def pavilion(p):
    """A terrace restaurant on the river-mouth promenade: a glass box under a deep flat roof, a timber deck."""
    W, D = 24.0, 8.0
    p.box(TEAK, -W / 2 - 2, 0, -0.5, W / 2 + 2, 0.3, D + 3.0)
    p.box('glassTint', -W / 2 + 2, 0.3, 1.5, W / 2 - 2, 4.0, D - 0.5)
    p.box(WHITE_S, -W / 2 + 2, 0.3, D - 0.5, W / 2 - 2, 4.0, D)
    for x in rows(-W / 2 + 2, W / 2 - 2, 2.0):
        p.box(WHITE_S, x - 0.05, 0.3, 1.45, x + 0.05, 4.0, 1.55)
    p.box(WHITE_S, -W / 2 - 2, 4.0, -0.5, W / 2 + 2, 4.5, D + 3.0)
    for x in (-W / 2 - 1.6, W / 2 + 1.6):
        for z in (0.0, D + 2.5):
            p.box(WHITE_S, x - 0.12, 0.3, z - 0.12, x + 0.12, 4.0, z + 0.12)
    for x in rows(-W / 2, W / 2, 3.0):
        p.cyl(WHITE_S, (x, 0.3 + 0.36, -0.1 + 0.4), 1, 0.45, 0.04, seg=12)
        p.cyl(ALU_DK, (x, 0.3 + 0.18, 0.3), 1, 0.04, 0.36, seg=6)
    p.box(DARK, -1.0, 0.3, D + 0.0, 1.0, 2.6, D + 0.04)
    mark('name', 0.0, 4.25, -0.52, 10.0, 0.4)


def boathouse(p):
    """The rowing club's boathouse: a long gabled shed with three big doors to the water, the club room above one end."""
    W, D, E = 30.0, 10.4, 5.0
    p.box('flat:#ebe7dc', -W / 2, 0, 0, W / 2, E, D)
    p.prism('flat:#3d4a55', [(-0.6, E - 0.2), (D / 2, E + 3.2), (D + 0.6, E - 0.2), (D + 0.6, E - 0.4), (D / 2, E + 2.95), (-0.6, E - 0.4)], 'x', -W / 2 - 0.4, W / 2 + 0.4)
    p.prism('flat:#ebe7dc', [(0.0, E), (D / 2, E + 3.0), (D, E)], 'x', -W / 2, W / 2)
    for xc in (-9.0, 0.0, 9.0):
        p.box('flat:#5d666c', xc - 3.6, 0, -0.05, xc + 3.6, 3.8, 0.0)
        for y in rows(0.2, 3.7, 0.4):
            p.box('flat:#4d555b', xc - 3.6, y - 0.02, -0.07, xc + 3.6, y + 0.02, -0.05)
    for xc in rows(-W / 2 + 1, W / 2 - 1, 3.0):
        p.box(WINDOW, xc - 0.6, E - 1.0, D, xc + 0.6, E - 0.2, D + 0.04)
    p.box(DARK, W / 2 - 3.0, 0, D, W / 2 - 1.8, 2.2, D + 0.04)
    mark('name', 0.0, 4.4, -0.08, 12.0, 0.6)


VARIANTS = [
    dict(id='tower', w=TW, d=TD, h=TOP + 30.0, fn=tower, gap=12.0),
    dict(id='hall', w=HW_, d=HD_, h=EH + VR + 1.0, fn=hall, gap=12.0),
    dict(id='wheel', w=WW, d=WD, h=HUB + R + 2.0, fn=wheel, gap=12.0),
    dict(id='hotel', w=HTW, d=HTD, h=HTH + 2.0, fn=hotel, gap=12.0),
    dict(id='office', w=OFW, d=OFD, h=OFH + 2.0, fn=office, gap=12.0),
    dict(id='resi', w=RSW, d=RSD, h=RSH + 3.0, fn=resi, gap=12.0),
    dict(id='bhotel', w=BHW, d=BHD, h=BHH + 1.2, fn=bhotel, gap=12.0, lo=dict(wall='flat:#e7e3da', W=BHW, D=BHD, H=BHH, y0=4.6, nf=12, fh=3.0, cap='flat:#2a3a52', base='flat:#8e8b84')),
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
    dict(id='rtowa', w=33.0, d=20.0, h=94.0, fn=rtowa, gap=12.0),
    dict(id='rtowb', w=25.2, d=25.2, h=76.2, fn=rtowb, gap=12.0),
    dict(id='school', w=64.0, d=22.0, h=19.0, fn=school, gap=12.0),
    dict(id='chotel', w=60.0, d=44.0, h=90.0, fn=chotel, gap=12.0),
    dict(id='mall', w=124.0, d=40.0, h=35.0, fn=mall, gap=12.0),
    dict(id='boatstore', w=40.0, d=26.0, h=15.4, fn=boatstore, gap=8.0),
    dict(id='hamamiya', w=16.0, d=22.0, h=5.8, fn=hamamiya, gap=6.0),
    dict(id='gatebar', w=6.0, d=0.6, h=1.6, fn=gatebar, gap=3.0),
    dict(id='btow', w=26.0, d=28.0, h=BT_H + 11.0, fn=btow, gap=12.0),
    dict(id='pavilion', w=28.0, d=11.5, h=4.6, fn=pavilion, gap=6.0),
    dict(id='boathouse', w=31.0, d=11.0, h=8.4, fn=boathouse, gap=6.0),
] + PB_VARIANTS


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    v['fn'](body)
    return body, signs


def build_lo(v):
    return lo_slab(**v['lo']) if 'lo' in v else None


if __name__ == '__main__':
    run('mcenter', VARIANTS, build_hi, build_lo)
    write_anchors('mcenter')
