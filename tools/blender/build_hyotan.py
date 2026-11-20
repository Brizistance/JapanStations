# Builds Hyōtanbori's street-level set pieces (瓢箪堀, Minami nightlife district by the canal).
#
#   blender --background --python tools/blender/build_hyotan.py -- [--renders <dir>]
#
# Writes assets/buildings/hyotan.blend and public/models/buildings/hyotan.glb.
#
# Frame and helpers: see buildkit.py. One root per piece, hyotan_<id>, with one mesh. Origins and
# sizes are mirrored in src/stations/hyotanbori-street.ts, which places them and adds the
# colliders, the glowing parts (lanterns, the gourd, neon) and every name: models carry no text.
#
#   bridge    Hyōtan-bashi: vermilion lacquered parapets at z = ±ZA over a canal 2·HALF wide, the
#             red steel arch faces seen from the water, and a roofed gate over the pavement at each
#             of the four corners. Origin: middle of the road over the canal, on the pavement.
#   kaikan    Hyōtan Kaikan (瓢箪会館, the landmark): a 1930s entertainment building, KW × KD, its
#             +x side on the canal quay, with the steel stand on its roof that carries the gourd.
#   yokocho   Hyōtan Yokochō: a lane LW wide running back from the street between two rows of tiny
#             two-storey bars, under a gate. Lot YW × YD.
#   takoyaki  A takoyaki stand with an open counter and a striped awning. Lot 5 × 4.
#   izakaya   Izakaya Hyōtan: a two-storey timber house you can walk into, IW × ID (shell, front).
#   izakaya_in  its fittings: counter, stools, the kitchen behind, a raised tatami room.
#   pier      a pontoon landing 3.2 × 14 with a ticket hut and canopy, along +z from its origin.
#   boat      a canal tour boat, 2.8 × 11, deck at y = 0.

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

VERM = 'flat:#c23b22'
VERM_DK = 'flat:#9a2c1a'
LACQ = 'flat:#1a1716'
BRASS = 'flat:#b8902f'
STONE = 'flat:#8f8a80'
STONE_DK = 'flat:#6a665e'
DARK = 'flat:#1c1a19'
TILE = 'flat:#24211f'
TILE_2 = 'flat:#2e2a27'
GOLD = 'flat:#c9a227'
TIMBER = 'flat:#4a3426'
TIMBER_LT = 'flat:#8a6440'
TIMBER_DK = 'flat:#2f2219'
PLASTER = 'flat:#d9cfbd'
ROOF = 'flat:#33373a'
STEEL = 'flat:#3d4146'
WHITE = 'flat:#efece4'
CONC = 'flat:#9b978e'
TATAMI = 'flat:#b7b07a'

# Shared with src/stations/hyotanbori-street.ts.
HALF, ZA = 7.0, 19.0          # canal half width; parapets at z = ±ZA (swOut 17.5 + 1.5)
KERB = 9.9                    # the gates' inner posts, just inside the kerb (road half width 9)
KW, KD, KH = 12.0, 16.0, 22.0  # Hyōtan Kaikan
YW, YD, LW = 10.4, 20.0, 3.2   # Yokochō lot and lane
IW, ID = 8.0, 10.0             # Izakaya Hyōtan


def stick(p, mat, a, b, r, seg=6):
    d = [b[i] - a[i] for i in range(3)]
    L = math.sqrt(sum(c * c for c in d)) or 1e-6
    d = [c / L for c in d]
    ref = (0, 1, 0) if abs(d[1]) < 0.9 else (1, 0, 0)
    u = [d[1] * ref[2] - d[2] * ref[1], d[2] * ref[0] - d[0] * ref[2], d[0] * ref[1] - d[1] * ref[0]]
    n = math.sqrt(sum(c * c for c in u))
    u = [c / n for c in u]
    v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]]

    def P(o, k):
        t = 2 * math.pi * k / seg
        return tuple(o[i] + r * (math.cos(t) * u[i] + math.sin(t) * v[i]) for i in range(3))

    for k in range(seg):
        t = 2 * math.pi * (k + 0.5) / seg
        hint = tuple(math.cos(t) * u[i] + math.sin(t) * v[i] for i in range(3))
        p.face(mat, [P(a, k), P(a, k + 1), P(b, k + 1), P(b, k)], hint)


def ball(p, mat, c, r, seg=12, rings=8, sy=1.0):
    """A UV sphere (sy squashes it vertically)."""
    def P(i, j):
        th, ph = 2 * math.pi * i / seg, math.pi * j / rings - math.pi / 2
        return (c[0] + r * math.cos(ph) * math.cos(th), c[1] + r * sy * math.sin(ph), c[2] + r * math.cos(ph) * math.sin(th))

    for i in range(seg):
        for j in range(rings):
            th, ph = 2 * math.pi * (i + 0.5) / seg, math.pi * (j + 0.5) / rings - math.pi / 2
            hint = (math.cos(ph) * math.cos(th), math.sin(ph), math.cos(ph) * math.sin(th))
            pts = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]
            if j == 0:
                pts = [P(i, j), P(i + 1, j + 1), P(i, j + 1)]
            elif j == rings - 1:
                pts = [P(i, j), P(i + 1, j), P(i, j + 1)]
            p.face(mat, pts, hint)


def giboshi(p, x, y, z, r=0.11):
    """The onion-shaped bronze cap of a railing post."""
    p.cyl(BRASS, (x, y + 0.03, z), 1, r, 0.06, seg=10)
    ball(p, BRASS, (x, y + 0.06 + r, z), r * 1.05, seg=10, rings=6)
    p.cyl(BRASS, (x, y + 0.06 + 2 * r, z), 1, r * 0.45, 0.08, seg=8)
    p.cyl(BRASS, (x, y + 0.06 + 2 * r + 0.1, z), 1, r * 0.16, 0.16, seg=6)


def tiled_roof(p, x0, x1, z0, z1, y, rise, axis='x', mat=ROOF):
    """A gabled roof with its ridge along `axis`, eaves at y."""
    if axis == 'x':
        zm = (z0 + z1) / 2
        p.prism(mat, [(z0, y), (z1, y), (zm, y + rise)], 'x', x0, x1)
        p.box(TIMBER_DK, x0, y - 0.1, z0, x1, y, z1)
        p.box(mat, x0, y + rise - 0.04, zm - 0.12, x1, y + rise + 0.1, zm + 0.12)
    else:
        xm = (x0 + x1) / 2
        p.prism(mat, [(x0, y), (x1, y), (xm, y + rise)], 'z', z0, z1)
        p.box(TIMBER_DK, x0, y - 0.1, z0, x1, y, z1)
        p.box(mat, xm - 0.12, y + rise - 0.04, z0, xm + 0.12, y + rise + 0.1, z1)


# ── Hyōtan-bashi ──

def parapet(p, s):
    L = HALF + 0.6
    z = s * ZA
    # Stone kerb, then a lacquered railing (kōran): posts with bronze caps, three rails, struts.
    p.box(STONE, -L, 0, z - 0.22, L, 0.18, z + 0.22)
    p.box(VERM, -L, 0.92, z - 0.08, L, 1.04, z + 0.08)
    p.box(BRASS, -L, 1.04, z - 0.05, L, 1.06, z + 0.05)
    p.box(VERM, -L, 0.54, z - 0.06, L, 0.62, z + 0.06)
    p.box(VERM, -L, 0.2, z - 0.06, L, 0.27, z + 0.06)
    n = 9
    for k in range(n):
        x = -L + 0.3 + (2 * L - 0.6) * k / (n - 1)
        p.box(VERM, x - 0.09, 0.18, z - 0.09, x + 0.09, 1.1, z + 0.09)
        p.box(BRASS, x - 0.1, 1.0, z - 0.1, x + 0.1, 1.06, z + 0.1)
        giboshi(p, x, 1.1, z, 0.09)
        if k < n - 1:
            xb = -L + 0.3 + (2 * L - 0.6) * (k + 1) / (n - 1)
            for f in (0.25, 0.5, 0.75):
                xs = x + (xb - x) * f
                p.box(VERM_DK, xs - 0.03, 0.27, z - 0.04, xs + 0.03, 0.54, z + 0.04)
    # Seen from the water: the deck's fascia with a run of lamps, the shadow under the deck, the
    # vermilion steel arch rib with its hangers, and stone abutments.
    zo = z + s * 0.3
    p.box(VERM, -L, -0.95, min(z + s * 0.2, zo + s * 0.12), L, 0.0, max(z + s * 0.2, zo + s * 0.12))
    p.box(GOLD, -L, -0.95, min(zo + s * 0.12, zo + s * 0.14), L, -0.88, max(zo + s * 0.12, zo + s * 0.14))
    for k in range(13):
        x = -L + 0.6 + (2 * L - 1.2) * k / 12
        p.box('light', x - 0.1, -0.62, min(zo + s * 0.12, zo + s * 0.16), x + 0.1, -0.42, max(zo + s * 0.12, zo + s * 0.16))
    water, crown, hw = -2.8, -1.2, HALF - 0.4
    p.face(DARK, [(-HALF, water - 0.6, z), (HALF, water - 0.6, z), (HALF, -0.95, z), (-HALF, -0.95, z)], (0, 0, s))
    n = 24
    for k in range(n):
        xa, xb = -hw + 2 * hw * k / n, -hw + 2 * hw * (k + 1) / n

        def arch(x):
            return water + (crown - water) * math.sqrt(max(0.0, 1 - (x / hw) ** 2))

        ya, yb = arch(xa), arch(xb)
        for zz, mat in ((zo, VERM), (zo - s * 0.3, VERM_DK)):
            p.face(mat, [(xa, ya - 0.22, zz), (xb, yb - 0.22, zz), (xb, yb + 0.22, zz), (xa, ya + 0.22, zz)], (0, 0, s))
        p.face(VERM_DK, [(xa, ya + 0.22, zo), (xb, yb + 0.22, zo), (xb, yb + 0.22, zo - s * 0.3), (xa, ya + 0.22, zo - s * 0.3)], (0, 1, 0))
        p.face(VERM_DK, [(xa, ya - 0.22, zo), (xb, yb - 0.22, zo), (xb, yb - 0.22, zo - s * 0.3), (xa, ya - 0.22, zo - s * 0.3)], (0, -1, 0))
        if k % 2 == 0 and 0 < k < n:
            p.box(VERM, xa - 0.05, ya + 0.22, min(zo, zo - s * 0.12), xa + 0.05, -0.95, max(zo, zo - s * 0.12))
    for x in (-HALF - 0.3, HALF + 0.3):
        p.box(STONE_DK, x - 0.3, water - 0.6, min(z, zo + s * 0.3), x + 0.3, -0.95, max(z, zo + s * 0.3))


def corner_gate(p, x, s):
    """A roofed gate over the pavement at one bridge corner: posts at z = s·KERB and s·ZA."""
    za, zb = s * KERB, s * (ZA + 0.05)
    lo, hi = min(za, zb), max(za, zb)
    for z in (za, zb):
        p.box(LACQ, x - 0.38, 0, z - 0.38, x + 0.38, 0.5, z + 0.38)
        p.box(BRASS, x - 0.3, 0.5, z - 0.3, x + 0.3, 0.6, z + 0.3)
        p.cyl(VERM, (x, 2.95, z), 1, 0.24, 4.7, seg=12)
        p.cyl(BRASS, (x, 1.0, z), 1, 0.26, 0.08, seg=12)
    # Tie beam (nuki), its wedges, the lintel (kasagi) with upturned ends, and a small roof.
    p.box(VERM, x - 0.14, 4.2, lo - 0.5, x + 0.14, 4.48, hi + 0.5)
    for z in (za, zb):
        p.box(VERM_DK, x - 0.17, 4.18, z - 0.06, x + 0.17, 4.5, z + 0.06)
    p.box(VERM, x - 0.22, 5.1, lo - 0.75, x + 0.22, 5.42, hi + 0.75)
    p.prism(LACQ, [(lo - 0.95, 5.42), (hi + 0.95, 5.42), (hi + 1.15, 5.68), (lo - 1.15, 5.68)], 'x', x - 0.3, x + 0.3)
    tiled_roof(p, x - 0.75, x + 0.75, lo - 1.1, hi + 1.1, 5.72, 0.5, axis='z')
    # The middle post between beam and lintel carries the name plaque (lettered by the game).
    zm = (za + zb) / 2
    p.box(VERM, x - 0.1, 4.48, zm - 0.1, x + 0.1, 5.1, zm + 0.1)
    p.box(LACQ, x - 0.12, 4.52, zm - 0.95, x + 0.12, 5.06, zm + 0.95)
    p.box(GOLD, x - 0.13, 4.5, zm - 0.98, x + 0.13, 4.54, zm + 0.98)
    p.box(GOLD, x - 0.13, 5.04, zm - 0.98, x + 0.13, 5.08, zm + 0.98)
    # Lantern hooks under the tie beam (the lanterns are the game's).
    for f in (0.3, 0.7):
        z = za + (zb - za) * f
        p.box(LACQ, x - 0.02, 3.7, z - 0.02, x + 0.02, 4.2, z + 0.02)


def bridge(p):
    for s in (-1, 1):
        parapet(p, s)
        for x in (-HALF - 0.6, HALF + 0.6):
            corner_gate(p, x, s)


# ── Hyōtan Kaikan ──

def kaikan(p):
    x0, x1 = -KW / 2, KW / 2
    GF = 4.4
    # Ground floor: a lacquered frame, glazed shop fronts, a canopy along the front and the canal side.
    p.box(TILE, x0, 0, 0.3, x1, KH, KD)
    for x in (x0, x0 + 4.0, x1 - 4.0, x1):
        p.box(VERM, x - 0.25, 0, -0.05, x + 0.25, GF, 0.35)
    p.box('glassTint', x0 + 0.25, 0.4, 0.2, x1 - 0.25, GF - 0.6, 0.26)
    p.box(LACQ, x0, 0, 0.05, x1, 0.4, 0.3)
    p.box(GOLD, x0, GF - 0.62, 0.0, x1, GF - 0.5, 0.3)
    p.box(LACQ, x0 - 0.2, GF - 0.5, -1.6, x1 + 0.2, GF - 0.3, 0.3)
    for k in range(12):
        x = x0 + 0.5 + k * (KW - 1.0) / 11
        p.box('light', x - 0.12, GF - 0.52, -1.3, x + 0.12, GF - 0.5, -1.06)
    # Canal side (+x): the same, glazed between lacquered piers.
    for z in (0.3, 5.5, 10.7, KD):
        p.box(VERM, x1 - 0.35, 0, z - 0.25, x1 + 0.05, GF, z + 0.25)
    p.box('glassTint', x1 - 0.06, 0.4, 0.55, x1 - 0.0, GF - 0.6, KD - 0.25)
    p.box(LACQ, x1 - 0.3, GF - 0.5, 0.3, x1 + 1.6, GF - 0.3, KD)
    # Upper floors: dark tile, gold string courses, a run of windows per floor, a corner tower of
    # vertical windows on the canal corner, and a stepped parapet in the manner of the 1930s.
    fl = (KH - GF - 1.2) / 5
    for i in range(5):
        y = GF + i * fl
        p.box(GOLD, x0 - 0.05, y, -0.05, x1 + 0.05, y + 0.12, KD)
        for xa in (x0 + 0.8, x0 + 3.4, x0 + 6.0):
            win(p, xa, y + 0.9, xa + 2.2, y + fl - 0.6, 0.3, glass=WINDOW_LIT)
        for za in (1.5, 5.5, 9.5, 13.0):
            p.box(STEEL, x1 + 0.0, y + 0.85, za - 0.05, x1 + 0.06, y + fl - 0.55, za + 2.25)
            p.box(WINDOW_LIT, x1 + 0.06, y + 0.92, za + 0.02, x1 + 0.08, y + fl - 0.62, za + 2.18)
    # Canal corner: a projecting bay of vertical glass, gold ribs, rising past the roof.
    cx0, cx1 = x1 - 3.4, x1 + 0.3
    p.box(TILE_2, cx0, GF, -0.6, cx1, KH + 3.0, 0.3)
    for x in (cx0 + 0.6, cx0 + 1.5, cx0 + 2.4, cx0 + 3.2):
        p.box(WINDOW_LIT, x - 0.25, GF + 0.6, -0.64, x + 0.25, KH + 1.8, -0.6)
        p.box(GOLD, x - 0.33, GF + 0.6, -0.68, x - 0.27, KH + 2.4, -0.6)
    p.box(GOLD, cx0 - 0.1, KH + 2.4, -0.7, cx1 + 0.1, KH + 3.2, 0.4)
    # The front's sign frame for the vertical name board (lettered by the game).
    p.box(STEEL, x0 + 0.6, GF + 0.6, -0.9, x0 + 0.75, KH - 1.0, -0.1)
    p.box(LACQ, x0 + 0.2, GF + 0.8, -1.1, x0 + 1.15, KH - 1.2, -0.95)
    # Parapet, stepped in the middle of the front.
    p.box(TILE_2, x0, KH, 0.0, x1, KH + 1.0, 0.35)
    p.box(TILE_2, x0 + 3.5, KH + 1.0, 0.0, x0 + 7.5, KH + 1.8, 0.35)
    p.box(GOLD, x0, KH + 0.95, -0.05, x1, KH + 1.05, 0.4)
    for z in (KD - 0.35,):
        p.box(TILE_2, x0, KH, z, x1, KH + 1.0, KD)
    for x in (x0, x1 - 0.35):
        p.box(TILE_2, x, KH, 0, x + 0.35, KH + 1.0, KD)
    p.box(CONC, x0 + 0.35, KH - 0.05, 0.35, x1 - 0.35, KH + 0.05, KD - 0.35)
    # Roof stand for the gourd: four lattice legs, ring beams and a platform, centred at z = 8.
    zc, r = 8.0, 3.0
    top = KH + 3.6
    legs = [(-r, zc - r), (r, zc - r), (r, zc + r), (-r, zc + r)]
    for x, z in legs:
        stick(p, STEEL, (x, KH, z), (x * 0.6, top, zc + (z - zc) * 0.6), 0.14)
    for h in (KH + 1.2, KH + 2.4, top):
        f = 1 - 0.4 * (h - KH) / (top - KH)
        pts = [(x * f, h, zc + (z - zc) * f) for x, z in legs]
        for i in range(4):
            stick(p, STEEL, pts[i], pts[(i + 1) % 4], 0.07)
    for i in range(4):
        a, b = legs[i], legs[(i + 1) % 4]
        stick(p, STEEL, (a[0], KH, a[1]), (b[0] * 0.76, KH + 2.4, zc + (b[1] - zc) * 0.76), 0.05)
    p.cyl(STEEL, (0, top + 0.1, zc), 1, 2.2, 0.2, seg=16)
    p.cyl(GOLD, (0, top + 0.22, zc), 1, 2.25, 0.05, seg=16)
    # Floodlights on the stand's corners, aimed up at the gourd.
    for x, z in legs:
        p.box(STEEL, x * 0.6 - 0.2, top + 0.2, zc + (z - zc) * 0.6 - 0.2, x * 0.6 + 0.2, top + 0.5, zc + (z - zc) * 0.6 + 0.2)
        p.box('light', x * 0.6 - 0.16, top + 0.5, zc + (z - zc) * 0.6 - 0.16, x * 0.6 + 0.16, top + 0.52, zc + (z - zc) * 0.6 + 0.16)
    # Water tank and a stair house at the back of the roof.
    tank(p, x0 + 1.6, KH, KD - 2.0)
    p.box(CONC, x1 - 4.0, KH, KD - 3.5, x1 - 1.0, KH + 2.8, KD - 0.5)


# ── Hyōtan Yokochō ──

def bar_front(p, x0, x1, face, z0, z1, k):
    """One tiny bar's front on the lane: the wall plane is x = x0 (face +1 looks +x)."""
    xf = x0
    o = face
    # Ground floor: a timber frame, a lattice sliding door or a counter window, an eave.
    p.box(TIMBER_DK, xf - o * 0.02, 0, z0, xf + o * 0.18, 2.6, z0 + 0.12)
    p.box(TIMBER_DK, xf - o * 0.02, 0, z1 - 0.12, xf + o * 0.18, 2.6, z1)
    lo, hi = min(xf, xf + o * 0.06), max(xf, xf + o * 0.06)
    if k % 3 == 1:
        # A counter window with a ledge.
        p.box(PLASTER, lo, 0, z0 + 0.12, hi, 0.95, z1 - 0.12)
        p.box(TIMBER_LT, min(xf, xf + o * 0.32), 0.95, z0 + 0.2, max(xf, xf + o * 0.32), 1.0, z1 - 0.2)
        p.box('flat:#5a3a20', lo - 0.01, 1.0, z0 + 0.2, hi - 0.01, 2.2, z1 - 0.2)
    else:
        # A lattice door (kōshi) with paper behind it, lit, and a solid wall panel beside it.
        zm = z0 + 0.12 + 1.0
        p.box('light', lo - 0.01, 0.1, z0 + 0.18, hi - 0.01, 2.15, zm - 0.04)
        for zz in [z0 + 0.18 + i * 0.09 for i in range(int((zm - z0 - 0.22) / 0.09))]:
            p.box(TIMBER, min(xf, xf + o * 0.08), 0.1, zz, max(xf, xf + o * 0.08), 2.15, zz + 0.03)
        p.box(TIMBER, min(xf, xf + o * 0.08), 1.1, z0 + 0.18, max(xf, xf + o * 0.08), 1.14, zm - 0.04)
        p.box(PLASTER if k % 2 else TIMBER_LT, lo, 0, zm, hi, 2.6, z1 - 0.12)
    # Noren rod and an eave.
    p.box(LACQ, min(xf, xf + o * 0.22), 2.18, z0 + 0.15, max(xf, xf + o * 0.22), 2.22, z1 - 0.15)
    p.prism(ROOF, [(0, 2.6), (0.75, 2.42), (0.75, 2.47), (0, 2.68)] if o > 0 else [(0, 2.68), (-0.75, 2.47), (-0.75, 2.42), (0, 2.6)], 'z', z0, z1)
    if o < 0:
        pass
    # The fascia board for the bar's name (lettered by the game).
    p.box(TIMBER_DK, min(xf, xf + o * 0.1), 2.72, z0 + 0.2, max(xf, xf + o * 0.1), 3.12, z1 - 0.2)
    # Upper floor: a window with a railing, a small air conditioner, a pipe.
    p.box(PLASTER if k % 2 == 0 else 'flat:#b5aa96', lo, 2.6, z0, hi, 5.6, z1)
    zw = (z0 + z1) / 2
    p.box(TIMBER_DK, min(xf, xf + o * 0.06), 3.5, zw - 0.7, max(xf, xf + o * 0.06), 4.9, zw + 0.7)
    p.box(WINDOW_LIT, min(xf, xf + o * 0.07), 3.58, zw - 0.62, max(xf, xf + o * 0.07), 4.82, zw + 0.62)
    p.box(STEEL, min(xf, xf + o * 0.3), 3.5, zw - 0.75, max(xf, xf + o * 0.3), 3.56, zw + 0.75)
    for zz in (zw - 0.7, zw - 0.35, zw, zw + 0.35, zw + 0.7):
        p.box(STEEL, min(xf + o * 0.26, xf + o * 0.3), 3.56, zz - 0.015, max(xf + o * 0.26, xf + o * 0.3), 4.1, zz + 0.015)
    if k % 2 == 0:
        p.box(WHITE, min(xf, xf + o * 0.28), 4.95, z0 + 0.25, max(xf, xf + o * 0.28), 5.45, z0 + 0.95)
    stick(p, 'flat:#5b4636', (xf + o * 0.12, 0.0, z1 - 0.2), (xf + o * 0.12, 5.6, z1 - 0.2), 0.04)


def yokocho(p):
    h = LW / 2
    depth = (YW - LW) / 2
    n = 6
    step = (YD - 1.0) / n
    for o in (-1, 1):
        xf = o * h          # the lane-side wall plane
        xb = o * (h + depth)
        # The building mass behind the fronts, its roof and the street ends.
        p.box(TILE_2, min(xf + o * 0.06, xb), 0, 0.0, max(xf + o * 0.06, xb), 5.6, YD)
        tiled_roof(p, min(xf - o * 0.5, xb), max(xf - o * 0.5, xb), 0, YD, 5.6, 1.1, axis='z')
        for k in range(n):
            z0 = 0.5 + k * step
            bar_front(p, xf, None, -o, z0, z0 + step, k + (3 if o > 0 else 0))
        # The street front of each row: a timber shop face with an eave.
        p.box(TIMBER_DK, min(xf, xb), 0, -0.1, max(xf, xb), 3.0, 0.0)
        p.box(PLASTER, min(xf, xb) + 0.2, 3.0, -0.08, max(xf, xb) - 0.2, 5.4, 0.0)
        p.prism(ROOF, [(-0.9, 2.95), (0.0, 3.3), (0.0, 3.36), (-0.9, 3.01)], 'x', min(xf, xb), max(xf, xb))
    # Overhead: wires and a few bars across the lane, and a dead end at the back with a small
    # shrine shelf and a lamp.
    for z in (3.0, 7.0, 11.0, 15.0):
        stick(p, LACQ, (-h, 4.3, z), (h, 4.1, z + 0.6), 0.012, seg=4)
    p.box(TILE_2, -h, 0, YD - 0.2, h, 5.6, YD)
    p.box(TIMBER_DK, -0.6, 1.4, YD - 0.5, 0.6, 1.5, YD - 0.2)
    p.box(TIMBER_LT, -0.45, 1.5, YD - 0.45, 0.45, 2.1, YD - 0.25)
    p.prism(ROOF, [(-0.6, 2.1), (0.6, 2.1), (0.0, 2.4)], 'z', YD - 0.6, YD - 0.2)
    # The lane gate: two black posts, a lintel carrying the lane's name board (the game's), lantern hooks.
    for x in (-h + 0.15, h - 0.15):
        p.box(LACQ, x - 0.14, 0, -0.5, x + 0.14, 4.2, -0.22)
    p.box(LACQ, -h - 0.2, 4.2, -0.55, h + 0.2, 4.4, -0.17)
    p.box(TIMBER_DK, -h + 0.1, 3.35, -0.5, h - 0.1, 4.2, -0.4)
    p.prism(ROOF, [(-0.95, 4.35), (0.2, 4.35), (0.2, 4.4), (-0.4, 4.75), (-1.0, 4.42)], 'x', -h - 0.5, h + 0.5)
    # Pavement of the lane: worn stone setts.
    for z in range(0, int(YD)):
        p.box('flat:#5d5852' if z % 2 else 'flat:#67615a', -h, 0.0, z, h, 0.02, z + 1)


# ── Takoyaki stand ──

def takoyaki(p):
    W, D = 5.0, 4.0
    x0, x1 = -W / 2, W / 2
    p.box(PLASTER, x0, 0, 1.4, x1, 3.4, D)
    for x in (x0, x1 - 0.2):
        p.box(PLASTER, x, 0, 0, x + 0.2, 3.4, 1.4)
    # Counter with the griddles: dark iron plates, each with rows of round pits.
    p.box('flat:#7a4b2a', x0 + 0.2, 0, 0.0, x1 - 0.2, 0.95, 0.9)
    p.box(STEEL, x0 + 0.3, 0.95, 0.05, x1 - 0.3, 1.0, 0.85)
    for gx in (-1.3, 0.0, 1.3):
        p.box('flat:#1d1b1a', gx - 0.55, 1.0, 0.15, gx + 0.55, 1.06, 0.75)
        for i in range(5):
            for j in range(3):
                p.box('flat:#b9732f', gx - 0.45 + i * 0.22, 1.06, 0.22 + j * 0.2, gx - 0.33 + i * 0.22, 1.1, 0.34 + j * 0.2)
    p.box('glassTint', x0 + 0.25, 1.1, 0.05, x1 - 0.25, 1.5, 0.08)
    # Kitchen behind: a shelf, a fridge, a fan hood.
    p.box(STEEL, x0 + 0.3, 0, 2.6, x0 + 1.2, 1.9, 3.3)
    p.box(WHITE, x0 + 1.5, 0.9, 3.2, x1 - 0.4, 1.0, 3.6)
    p.box(STEEL, -0.9, 2.5, 0.6, 0.9, 2.9, 1.3)
    # Striped awning and a fascia board for the name (the game's), the roof slab.
    n = 10
    for k in range(n):
        xa, xb = x0 - 0.2 + (W + 0.4) * k / n, x0 - 0.2 + (W + 0.4) * (k + 1) / n
        p.face(VERM if k % 2 == 0 else WHITE, [(xa, 2.55, -1.1), (xb, 2.55, -1.1), (xb, 3.05, 0.0), (xa, 3.05, 0.0)], (0, 1, -0.5))
        p.face(VERM if k % 2 == 0 else WHITE, [(xb, 2.55, -1.1), (xa, 2.55, -1.1), (xa, 2.35, -1.1), (xb, 2.35, -1.1)], (0, 0, -1))
    p.box(LACQ, x0, 3.05, -0.05, x1, 3.95, 0.05)
    p.box(ROOF, x0 - 0.1, 3.4, 0, x1 + 0.1, 3.6, D)
    # The big ball on the roof on a short stand, with a dark sauce cap and green flecks.
    p.box(STEEL, -0.08, 3.6, 1.6, 0.08, 4.2, 1.76)
    ball(p, 'flat:#c98a45', (0, 5.2, 1.7), 1.05, seg=16, rings=10)
    ball(p, 'flat:#5b2a12', (0, 5.55, 1.7), 0.92, seg=16, rings=8, sy=0.55)
    for i in range(10):
        a = 2 * math.pi * i / 10
        p.box('flat:#4f7a2a', 0.5 * math.cos(a) - 0.05, 6.02, 1.7 + 0.5 * math.sin(a) - 0.05, 0.5 * math.cos(a) + 0.05, 6.06, 1.7 + 0.5 * math.sin(a) + 0.05)


# ── Izakaya Hyōtan ──

DOOR = (-1.0, 0.8)   # the doorway's x range on the front; mirrored in hyotanbori-street.ts


def izakaya(p):
    x0, x1 = -IW / 2, IW / 2
    GF = 3.2
    # Shell: side and back walls (timber outside, plaster inside), the upper floor, a tiled roof.
    for x, o in ((x0, -1), (x1, 1)):
        p.box(TIMBER, min(x, x + o * 0.2), 0, 0, max(x, x + o * 0.2), 6.4, ID)
        p.box(PLASTER, min(x, x - o * 0.02), 0, 0.1, max(x, x - o * 0.02), GF, ID - 0.1)
    p.box(TIMBER, x0, 0, ID, x1, 6.4, ID + 0.2)
    p.box(PLASTER, x0, 0, ID - 0.02, x1, GF, ID)
    # Front, ground floor: dark posts, a lattice front either side of the door, a low stone base.
    for a, c in ((x0, DOOR[0]), (DOOR[1], x1)):
        p.box(STONE_DK, a, 0, -0.05, c, 0.4, 0.15)
        p.box(PLASTER, a, 0.4, 0.05, c, GF, 0.15)
        p.box('light', a + 0.15, 0.9, -0.02, c - 0.15, 2.4, 0.05)
        for x in [a + 0.2 + i * 0.1 for i in range(int((c - a - 0.3) / 0.1))]:
            p.box(TIMBER_DK, x, 0.85, -0.08, x + 0.035, 2.45, -0.02)
        p.box(TIMBER_DK, a, 0.82, -0.09, c, 0.88, 0.0)
        p.box(TIMBER_DK, a, 2.42, -0.09, c, 2.48, 0.0)
    for x in (x0, DOOR[0] - 0.12, DOOR[1], x1 - 0.12):
        p.box(TIMBER_DK, x, 0, -0.1, x + 0.12, GF, 0.15)
    p.box(TIMBER_DK, DOOR[0], 2.3, -0.1, DOOR[1], GF, 0.15)
    # A noren rod over the door, a lower eave, the name board's frame (the game letters it).
    p.box(LACQ, DOOR[0] - 0.1, 2.22, -0.2, DOOR[1] + 0.1, 2.27, -0.15)
    p.prism(ROOF, [(-1.0, GF + 0.05), (0.0, GF + 0.45), (0.0, GF + 0.52), (-1.05, GF + 0.12)], 'x', x0 - 0.2, x1 + 0.2)
    p.box(TIMBER_DK, x0 + 0.8, GF + 0.55, -0.15, x1 - 0.8, GF + 1.25, -0.05)
    # Upper floor: plaster with a timber grille window, a cedar ball (sugidama) on a bracket.
    p.box(PLASTER, x0, GF, 0.0, x1, 6.4, 0.12)
    p.box(TIMBER_DK, x0 + 1.0, 4.2, -0.06, x1 - 1.0, 5.7, 0.0)
    p.box(WINDOW_LIT, x0 + 1.1, 4.3, -0.07, x1 - 1.1, 5.6, -0.06)
    for x in [x0 + 1.15 + i * 0.16 for i in range(int((IW - 2.3) / 0.16))]:
        p.box(TIMBER_DK, x, 4.3, -0.14, x + 0.05, 5.6, -0.07)
    p.box(TIMBER_DK, x1 - 0.6, 3.9, -0.7, x1 - 0.5, 4.0, 0.0)
    ball(p, 'flat:#5f6b3a', (x1 - 0.55, 3.55, -0.65), 0.32, seg=12, rings=8)
    # Roof: tiled, gable to the street.
    tiled_roof(p, x0 - 0.4, x1 + 0.4, -0.6, ID + 0.6, 6.4, 2.0, axis='z')
    p.box(TIMBER_DK, x0 - 0.4, 6.4, -0.62, x1 + 0.4, 6.5, -0.5)


def izakaya_in(p):
    """The inside, in the shop's frame: an L counter on the left with stools, the kitchen behind it,
    a raised tatami room with two low tables on the right, menu slips along the walls."""
    x0, x1 = -IW / 2, IW / 2
    # Counter along z on the left, returning across the back.
    p.box(TIMBER_DK, x0 + 1.6, 0, 1.6, x0 + 2.1, 1.0, 7.6)
    p.box(TIMBER_LT, x0 + 1.5, 1.0, 1.5, x0 + 2.3, 1.08, 7.7)
    p.box(TIMBER_DK, x0 + 1.6, 0, 7.1, x0 + 4.2, 1.0, 7.6)
    p.box(TIMBER_LT, x0 + 1.5, 1.0, 7.0, x0 + 4.3, 1.08, 7.7)
    for z in (2.2, 3.2, 4.2, 5.2, 6.2):
        p.cyl(TIMBER_LT, (x0 + 2.75, 0.68, z), 1, 0.2, 0.06, seg=10)
        p.cyl(STEEL, (x0 + 2.75, 0.33, z), 1, 0.04, 0.66, seg=6)
    for x in (x0 + 2.8, x0 + 3.7):
        p.cyl(TIMBER_LT, (x, 0.68, 8.2), 1, 0.2, 0.06, seg=10)
        p.cyl(STEEL, (x, 0.33, 8.2), 1, 0.04, 0.66, seg=6)
    # Kitchen: steel worktops, a fridge, shelves of bottles, an extractor hood, a pot of oden.
    p.box(STEEL, x0 + 0.2, 0, 1.2, x0 + 0.9, 0.9, 8.6)
    p.box(STEEL, x0 + 0.2, 0, 8.6, x0 + 4.4, 0.9, 9.8)
    p.box(STEEL, x0 + 0.25, 1.4, 2.0, x0 + 0.9, 2.4, 6.0)
    p.cyl('flat:#8a8d90', (x0 + 1.85, 1.2, 4.2), 1, 0.28, 0.24, seg=12)
    for z in [1.6 + i * 0.25 for i in range(18)]:
        p.box(['flat:#2f5a35', 'flat:#7a3b1a', 'flat:#d9c27a'][int(z * 4) % 3], x0 + 0.25, 1.72, z, x0 + 0.38, 2.05, z + 0.1)
    p.box(TIMBER_DK, x0 + 0.2, 1.7, 1.4, x0 + 0.45, 1.72, 6.4)
    # Menu slips (blank: the game letters only signs) above the counter.
    for z in [1.7 + i * 0.32 for i in range(16)]:
        p.box(WHITE, x0 + 2.22, 2.2, z, x0 + 2.24, 2.75, z + 0.24)
    # Tatami room: a raised platform with a timber edge, two low tables, cushions.
    p.box(TIMBER_LT, x1 - 3.4, 0, 2.0, x1 - 0.2, 0.42, 9.8)
    p.box(TATAMI, x1 - 3.3, 0.42, 2.1, x1 - 0.25, 0.44, 9.75)
    for zc in (4.0, 7.6):
        p.box(TIMBER_DK, x1 - 2.4, 0.44, zc - 0.7, x1 - 1.2, 0.78, zc + 0.7)
        p.box(TIMBER_LT, x1 - 2.45, 0.78, zc - 0.75, x1 - 1.15, 0.82, zc + 0.75)
        for dx, dz in ((-1.1, -0.4), (-1.1, 0.4), (0.1, -0.4), (0.1, 0.4)):
            p.box('flat:#6a2a2a', x1 - 1.8 + dx - 0.3, 0.44, zc + dz - 0.3, x1 - 1.8 + dx + 0.3, 0.52, zc + dz + 0.3)
    # Paper lanterns' fittings under the ceiling (the lit bodies are the game's).
    for z in (2.5, 5.0, 7.5):
        p.box(LACQ, -0.02, 2.75, z - 0.02, 0.02, 3.2, z + 0.02)


# ── Pier and boat ──

def pier(p):
    W, L = 3.2, 14.0
    # Pontoon: planks over a dark float, a rail on the water side, bollards.
    p.box('flat:#2a2827', 0, -0.4, 0, W, 0.0, L)
    for k in range(int(L / 0.3)):
        p.box(TIMBER_LT if k % 2 else 'flat:#7c5a3a', 0.05, 0.0, k * 0.3, W - 0.05, 0.05, k * 0.3 + 0.28)
    for z in range(0, int(L) + 1, 2):
        p.box(VERM, W - 0.12, 0.05, z - 0.05, W - 0.02, 1.05, z + 0.05)
    p.box(VERM, W - 0.14, 0.95, 0, W, 1.05, L)
    p.box(VERM, W - 0.12, 0.5, 0, W - 0.04, 0.55, L)
    for z in (1.0, L - 1.0):
        p.cyl(LACQ, (W - 0.5, 0.3, z), 1, 0.13, 0.5, seg=10)
        p.cyl(LACQ, (W - 0.5, 0.58, z), 1, 0.18, 0.06, seg=10)
    # Ticket hut at the far end (the stair comes down at the near end, z = 0) and a canopy on
    # posts over the boarding stretch.
    p.box(TIMBER, 0.2, 0.05, L - 2.6, 2.2, 2.4, L - 0.3)
    p.box(WINDOW_LIT, 2.2, 1.0, L - 2.2, 2.22, 2.0, L - 0.7)
    p.box(TIMBER_LT, 2.2, 0.95, L - 2.3, 2.5, 1.0, L - 0.6)
    tiled_roof(p, 0.0, 2.5, L - 2.9, L, 2.4, 0.6, axis='x')
    for z in (3.0, 6.5, 10.0):
        for x in (0.3, W - 0.4):
            p.box(LACQ, x - 0.06, 0.05, z - 0.06, x + 0.06, 2.6, z + 0.06)
    p.box(LACQ, 0.1, 2.6, 2.6, W - 0.2, 2.72, 10.4)
    p.prism(ROOF, [(-0.2, 2.72), (W + 0.1, 2.72), (W + 0.1, 2.78), (W / 2, 3.1), (-0.2, 2.78)], 'z', 2.4, 10.6)
    for z in (4.0, 6.5, 9.0):
        p.box('light', W / 2 - 0.3, 2.58, z - 0.05, W / 2 + 0.3, 2.6, z + 0.05)


def boat(p):
    W, L = 2.8, 11.0
    # Hull: a flat-bottomed boat with a raked bow, white over vermilion.
    p.prism(WHITE, [(-L / 2, -0.4), (L / 2 - 1.2, -0.4), (L / 2, 0.3), (L / 2, 0.45), (-L / 2, 0.45)], 'x', -W / 2, W / 2)
    p.box(VERM, -W / 2 - 0.02, -0.15, -L / 2, W / 2 + 0.02, 0.0, L / 2 - 0.6)
    p.box(TIMBER_LT, -W / 2 + 0.1, 0.45, -L / 2 + 0.3, W / 2 - 0.1, 0.5, L / 2 - 0.8)
    # Benches down both sides, a low cabin roof on posts, a steering stand at the stern.
    for z in [-L / 2 + 1.5 + i * 1.1 for i in range(7)]:
        for s in (-1, 1):
            p.box(TIMBER, s * (W / 2 - 0.25) - 0.2, 0.5, z - 0.25, s * (W / 2 - 0.25) + 0.2, 0.92, z + 0.25)
    for z in (-L / 2 + 1.0, L / 2 - 2.0):
        for s in (-1, 1):
            p.box(STEEL, s * (W / 2 - 0.08) - 0.04, 0.5, z - 0.04, s * (W / 2 - 0.08) + 0.04, 2.1, z + 0.04)
    p.box('glassTint', -W / 2, 2.1, -L / 2 + 0.9, W / 2, 2.16, L / 2 - 1.9)
    p.box(VERM, -W / 2 - 0.05, 2.04, -L / 2 + 0.85, W / 2 + 0.05, 2.1, L / 2 - 1.85)
    p.box(STEEL, -0.3, 0.5, -L / 2 + 0.4, 0.3, 1.3, -L / 2 + 0.8)


PROPS = {
    'bridge': (bridge, 2 * HALF + 4), 'kaikan': (kaikan, KW + 3), 'takoyaki': (takoyaki, 5.5),
    'izakaya': (izakaya, IW + 1), 'izakaya_in': (izakaya_in, IW + 1), 'pier': (pier, 4), 'boat': (boat, 3.5),
}


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('hyotan', [dict(id=k, w=w, gap=3.0) for k, (_, w) in PROPS.items()], build_hi, lambda v: None)
