# Builds Tsumugibashi's street-level set pieces: the Silk Exchange (紬橋絹取引所, 1926) and the
# stone bridge the station is named after (紬橋).
#
#   blender --background --python tools/blender/build_exchange.py -- [--renders <dir>]
#
# Writes assets/buildings/exchange.blend and public/models/buildings/exchange.glb.
#
# Frame and helpers: see buildkit.py. Two roots, each one mesh:
#   exchange_hall    the building's outside: brick and stone front on the avenue, side and back
#                    walls, parapet. Origin: the middle of the frontage on the pavement, front
#                    facing -z. It has no roof or inside: the game builds the roof slab, the
#                    Exchange Hall and the rotunda (src/stations/rotunda.ts), and the dome is
#                    tsumugi_dome. W, D, EAVES and DOOR below are mirrored there.
#   exchange_inside  the trading hall and its gallery seen from inside (stage 2, src/stations/exchange.ts):
#                    linings, the drum's core, gallery, ceiling, booths, the museum's cases. Same origin.
#   exchange_bridge  both parapets of the bridge, their name posts and lamps, and the arch faces
#                    towards the canal. Origin: the middle of the road over the canal, on the
#                    pavement. HALF and ZA are mirrored in src/stations/surface.ts canalFeature().
# No signs: the building's name, the station sign and the bridge's name plates are the game's.

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

BRICK = 'flat:#8a4a3a'
BRICK_2 = 'flat:#7f4335'
STONE = 'flat:#d8cfbd'
STONE_2 = 'flat:#c4b89f'
GRANITE = 'flat:#6f6453'
GRANITE_2 = 'flat:#5f5547'
COPPER = 'flat:#5f8f7d'
BRONZE = 'flat:#5a4326'
BRASS = 'flat:#b08d3a'
DARK = 'flat:#231f1c'

# Shared with src/stations/rotunda.ts (LOT, the door).
W, D, EAVES = 46.0, 28.0, 9.2
DOOR = (14.57, 18.57)      # the doorway, x from the middle of the frontage; clear to 3.2 m
# Shared with src/stations/surface.ts.
HALF, ZA = 7.0, 38.0       # half width of the canal; the parapets stand at z = ±ZA


def stick(p, mat, a, b, r0, r1=None, seg=6):
    r1 = r0 if r1 is None else r1
    d = [b[i] - a[i] for i in range(3)]
    L = math.sqrt(sum(c * c for c in d)) or 1e-6
    d = [c / L for c in d]
    ref = (0, 1, 0) if abs(d[1]) < 0.9 else (1, 0, 0)
    u = [d[1] * ref[2] - d[2] * ref[1], d[2] * ref[0] - d[0] * ref[2], d[0] * ref[1] - d[1] * ref[0]]
    n = math.sqrt(sum(c * c for c in u))
    u = [c / n for c in u]
    v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]]

    def P(o, r, k):
        t = 2 * math.pi * k / seg
        return tuple(o[i] + r * (math.cos(t) * u[i] + math.sin(t) * v[i]) for i in range(3))

    for k in range(seg):
        t = 2 * math.pi * (k + 0.5) / seg
        hint = tuple(math.cos(t) * u[i] + math.sin(t) * v[i] for i in range(3))
        p.face(mat, [P(a, r0, k), P(a, r0, k + 1), P(b, r1, k + 1), P(b, r1, k)], hint)


def arched_window(p, xc, y0, y1, w, z, out):
    """A tall window with a round head in a stone surround, on a wall in the plane z facing `out` (±1 along z)."""
    r = w / 2
    ys = y1 - r   # springing
    e = out * 0.06
    # Surround.
    p.box(STONE, xc - r - 0.22, y0 - 0.25, z, xc + r + 0.22, y0, z + out * 0.22)
    for s in (-1, 1):
        p.box(STONE, xc + s * r, y0, z, xc + s * (r + 0.2), ys, z + out * 0.12)
    n = 10
    for k in range(n):
        a, b = math.pi * k / n, math.pi * (k + 1) / n
        pts = [(xc + r * math.cos(a), ys + r * math.sin(a), z + e * 2), (xc + (r + 0.24) * math.cos(a), ys + (r + 0.24) * math.sin(a), z + e * 2),
               (xc + (r + 0.24) * math.cos(b), ys + (r + 0.24) * math.sin(b), z + e * 2), (xc + r * math.cos(b), ys + r * math.sin(b), z + e * 2)]
        p.face(STONE if k % 2 else STONE_2, pts, (0, 0, out))
        p.face(WINDOW_DARK, [(xc, ys, z + e), (xc + r * math.cos(a), ys + r * math.sin(a), z + e), (xc + r * math.cos(b), ys + r * math.sin(b), z + e)], (0, 0, out), col=WINDOW)
    p.box(STONE, xc - 0.16, ys + r + 0.02, z, xc + 0.16, ys + r + 0.5, z + out * 0.2)   # keystone
    # Glass and bars.
    p.face(WINDOW_LIT if int(xc * 7) % 3 == 0 else WINDOW_DARK, [(xc - r, y0, z + e), (xc + r, y0, z + e), (xc + r, ys, z + e), (xc - r, ys, z + e)], (0, 0, out), col=WINDOW)
    for x in (xc - r / 3, xc + r / 3):
        p.box(BRONZE, x - 0.03, y0, z + e, x + 0.03, ys, z + e + out * 0.03)
    for y in (y0 + (ys - y0) * 0.33, y0 + (ys - y0) * 0.66, ys):
        p.box(BRONZE, xc - r, y - 0.03, z + e, xc + r, y + 0.03, z + e + out * 0.03)


def door2(p, xc):
    """The bay where the footbridge's glazed link meets the front: a short window below the
    gallery floor, the doorway (open: the link's glass closes it) in a stone frame above."""
    a, b = DOOR2
    p.box(STONE, xc - 1.52, 1.75, -0.22, xc + 1.52, 2.0, 0)
    for s in (-1, 1):
        p.box(STONE, min(xc + s * 1.3, xc + s * 1.5), 2.0, -0.12, max(xc + s * 1.3, xc + s * 1.5), 4.4, 0)
    p.face(WINDOW_DARK, [(xc - 1.3, 2.0, -0.06), (xc + 1.3, 2.0, -0.06), (xc + 1.3, 4.2, -0.06), (xc - 1.3, 4.2, -0.06)], (0, 0, -1), col=WINDOW)
    p.box(STONE, xc - 1.5, 4.2, -0.18, xc + 1.5, F2, 0)
    for x in (a - 0.22, b):
        p.box(STONE, x, F2, -0.16, x + 0.22, F2 + 2.4, 0)
    p.box(STONE_2, a - 0.3, F2 + 2.2, -0.2, b + 0.3, F2 + 2.5, 0)
    # The reveal's floor and sides (the wall is 0.4 m deep here).
    p.box(STONE_2, a, F2 - 0.02, 0, b, F2, 0.5)
    for x in (a, b - 0.02):
        p.box(STONE_2, x, F2, 0, x + 0.02, F2 + 2.2, 0.5)
    p.box(STONE_2, a, F2 + 2.18, 0, b, F2 + 2.2, 0.5)


def brick_wall(p, x0, x1, z, out, y0=1.2, y1=7.7, hole=None):
    """Brick between y0 and y1 in the plane z facing out, in courses of two shades with stone bands.
    `hole` (hx0, hx1, hy0, hy1) is left open."""
    n = 13
    for k in range(n):
        a, b = y0 + (y1 - y0) * k / n, y0 + (y1 - y0) * (k + 1) / n
        col = BRICK if k % 2 else BRICK_2
        parts = [(x0, x1, a, b)]
        if hole and hole[0] < x1 and hole[1] > x0 and hole[2] < b and hole[3] > a:
            hx0, hx1, hy0, hy1 = hole
            parts = [(x0, hx0, a, b), (hx1, x1, a, b)]
            if a < hy0:
                parts.append((hx0, hx1, a, min(b, hy0)))
            if b > hy1:
                parts.append((hx0, hx1, max(a, hy1), b))
        for (pa, pb, ya, yb) in parts:
            if pb - pa > 1e-3 and yb - ya > 1e-3:
                p.face(col, [(pa, ya, z), (pb, ya, z), (pb, yb, z), (pa, yb, z)], (0, 0, out))


def side_wall(p, x, out, z0, z1):
    """A wall in the plane x facing out (±1 along x): granite base, brick, a band, cornice."""
    def q(z, y):
        return (x, y, z)
    p.face(GRANITE, [q(z0, 0), q(z1, 0), q(z1, 1.2), q(z0, 1.2)], (out, 0, 0))
    n = 13
    for k in range(n):
        a, b = 1.2 + 6.5 * k / n, 1.2 + 6.5 * (k + 1) / n
        p.face(BRICK if k % 2 else BRICK_2, [q(z0, a), q(z1, a), q(z1, b), q(z0, b)], (out, 0, 0))
    x0, x1 = min(x, x + out * 0.3), max(x, x + out * 0.3)
    p.box(STONE, x0, 7.7, z0 - 0.3, x1, 8.3, z1 + 0.3)
    p.box(STONE_2, min(x, x + out * 0.1), 4.4, z0, max(x, x + out * 0.1), 4.7, z1)
    # Parapet.
    p.box(STONE_2, min(x, x - out * 0.4), 8.3, z0, max(x, x - out * 0.4), EAVES + 1.0, z1)
    # Windows: plain tall ones in stone frames.
    m = int((z1 - z0) // 5)
    for k in range(m):
        zc = z0 + (z1 - z0) * (k + 0.5) / m
        xa, xb = min(x + out * 0.02, x + out * 0.1), max(x + out * 0.02, x + out * 0.1)
        p.box(STONE, xa, 1.75, zc - 1.1, xb, 6.3, zc + 1.1)
        xa, xb = min(x + out * 0.1, x + out * 0.13), max(x + out * 0.1, x + out * 0.13)
        p.box(WINDOW, xa, 1.95, zc - 0.9, xb, 6.1, zc + 0.9)
        xa, xb = min(x + out * 0.13, x + out * 0.16), max(x + out * 0.13, x + out * 0.16)
        p.box(BRONZE, xa, 1.95, zc - 0.03, xb, 6.1, zc + 0.03)
        p.box(BRONZE, xa, 4.0, zc - 0.9, xb, 4.06, zc + 0.9)


def hall(p):
    x0, x1 = -W / 2, W / 2
    d0, d1 = DOOR
    dc = (d0 + d1) / 2
    # ── Front: rusticated granite base, left open at the door ──
    for (a, b) in ((x0, d0), (d1, x1)):
        for k in range(4):
            ya, yb = 0.3 * k, 0.3 * (k + 1)
            p.box(GRANITE if k % 2 else GRANITE_2, a, ya, -0.18 + 0.02 * k, b, yb - 0.02, 0)
        p.face(GRANITE, [(a, 0, 0), (b, 0, 0), (b, 1.2, 0), (a, 1.2, 0)], (0, 0, -1))
    # Brick above, leaving the doorway (clear to 3.2) and the fanlight over it.
    brick_wall(p, x0, d0 - 0.6, 0, -1, hole=(DOOR2[0], DOOR2[1], F2, F2 + 2.2))
    brick_wall(p, d1 + 0.6, x1, 0, -1)
    # Bays between stone pilasters: eight windows, and the entrance bay.
    pil = [x0 + 0.5]
    step = 5.1
    while pil[-1] + step < d0 - 1.0:
        pil.append(pil[-1] + step)
    pil += [d0 - 1.1, d1 + 1.1]
    while pil[-1] + step < x1 - 0.4:
        pil.append(pil[-1] + step)
    if x1 - 0.5 - pil[-1] > 2.5:
        pil.append(x1 - 0.5)
    for x in pil:
        p.box(STONE, x - 0.4, 1.2, -0.26, x + 0.4, 7.4, 0)
        p.box(STONE_2, x - 0.5, 1.2, -0.32, x + 0.5, 1.5, 0)
        p.box(STONE_2, x - 0.5, 7.1, -0.34, x + 0.5, 7.7, 0)
        for y in (2.6, 3.9, 5.2):
            p.box(STONE_2, x - 0.41, y, -0.27, x + 0.41, y + 0.05, 0)
    for a, b in zip(pil, pil[1:]):
        if a >= d0 - 1.2 and b <= d1 + 1.2:
            continue
        if b - a < 3.0:
            continue
        if abs((a + b) / 2 - (DOOR2[0] + DOOR2[1]) / 2) < 0.5:
            door2(p, (a + b) / 2)
            continue
        arched_window(p, (a + b) / 2, 2.0, 6.7, min(2.6, b - a - 1.6), -0.02, -1)
    # String course, cornice with dentils, attic and parapet with a copper coping.
    # (Not across the doorway.)
    for a, b in ((x0, d0 - 0.7), (d1 + 0.7, x1)):
        p.box(STONE_2, a, 1.2, -0.1, b, 1.36, 0)
    p.box(STONE, x0 - 0.2, 7.7, -0.5, x1 + 0.2, 8.0, 0)
    p.box(STONE_2, x0 - 0.3, 8.0, -0.7, x1 + 0.3, 8.3, 0)
    k = 0
    x = x0
    while x < x1:
        p.box(STONE, x, 7.45, -0.42, x + 0.22, 7.7, 0)
        x += 0.5
        k += 1
    p.box(STONE, x0, 8.3, -0.12, x1, EAVES + 1.0, 0.4)
    p.box(COPPER, x0 - 0.06, EAVES + 1.0, -0.2, x1 + 0.06, EAVES + 1.12, 0.48)
    for x in pil:
        p.box(STONE_2, x - 0.45, 8.3, -0.2, x + 0.45, EAVES + 1.0, 0)

    # ── Entrance bay: stone portal, columns in pairs, a pediment over the cornice ──
    # Wall of the bay in stone, with the door and its fanlight cut out.
    p.box(STONE, d0 - 0.7, 0, -0.06, d0, 7.7, 0)
    p.box(STONE, d1, 0, -0.06, d1 + 0.7, 7.7, 0)
    p.box(STONE, d0, 3.2, -0.06, d1, 3.32, 0)        # lintel (the station sign sits above it)
    p.box(DARK, d0, 3.32, -0.03, d1, 4.2, 0)           # board for the station sign
    p.box(STONE, d0, 4.2, -0.06, d1, 4.8, 0)
    p.box(DARK, d0 - 2.2, 4.82, -0.03, d1 + 2.2, 6.0, 0)   # board for the building's name
    p.box(STONE, d0 - 2.6, 6.0, -0.06, d1 + 2.6, 7.7, 0)
    for s, xe in ((-1, d0 - 0.7), (1, d1 + 0.7)):
        p.box(STONE, min(xe, xe + s * 1.9), 0, -0.06, max(xe, xe + s * 1.9), 4.82, 0)
    # Fanlight glow at the back of the door reveal, above head height (the hall is behind).
    for s, xc in ((-1, d0 - 1.55), (1, d1 + 1.55)):
        for off in (-0.42, 0.42):
            cx = xc + off
            p.box(GRANITE, cx - 0.5, 0, -1.15, cx + 0.5, 0.5, -0.15)
            p.cyl(STONE_2, (cx, 0.58, -0.65), 1, 0.36, 0.16, seg=14)
            p.cyl(STONE, (cx, 3.3, -0.65), 1, 0.29, 5.3, seg=14)
            p.cyl(STONE_2, (cx, 6.02, -0.65), 1, 0.36, 0.16, seg=14)
            p.box(STONE_2, cx - 0.42, 6.1, -1.07, cx + 0.42, 6.3, -0.23)
    p.box(STONE, d0 - 2.6, 6.3, -1.15, d1 + 2.6, 7.0, 0)
    p.box(STONE_2, d0 - 2.75, 7.0, -1.3, d1 + 2.75, 7.25, 0)
    # Pediment.
    pa, pb, pk = d0 - 2.75, d1 + 2.75, 9.6
    for z, hint in ((-1.3, -1), (-0.0, 1)):
        p.face(STONE, [(pa, 7.25, z), (pb, 7.25, z), (dc, pk, z)], (0, 0, hint))
    p.face(COPPER, [(pa, 7.25, -1.3), (dc, pk, -1.3), (dc, pk, 0), (pa, 7.25, 0)], (-0.5, 1, 0))
    p.face(COPPER, [(pb, 7.25, -1.3), (dc, pk, -1.3), (dc, pk, 0), (pb, 7.25, 0)], (0.5, 1, 0))
    p.face(STONE_2, [(pa, 7.25, -1.3), (pb, 7.25, -1.3), (pb, 7.25, 0), (pa, 7.25, 0)], (0, -1, 0))
    # A roundel in the pediment: a spool of thread, the exchange's mark.
    p.cyl(BRASS, (dc, 8.0, -1.33), 2, 0.5, 0.06, seg=20)
    p.cyl(GRANITE, (dc, 8.0, -1.36), 2, 0.36, 0.04, seg=20)
    p.box(BRASS, dc - 0.2, 7.78, -1.4, dc + 0.2, 7.84, -1.36)
    p.box(BRASS, dc - 0.2, 8.16, -1.4, dc + 0.2, 8.22, -1.36)
    p.box(BRASS, dc - 0.12, 7.84, -1.4, dc + 0.12, 8.16, -1.36)
    # Steps of the portal are flush with the pavement (the door must stay level); two bronze lamps.
    for s in (-1, 1):
        x = dc + s * 3.9
        p.box(GRANITE, x - 0.3, 0, -1.9, x + 0.3, 0.9, -1.3)
        stick(p, BRONZE, (x, 0.9, -1.6), (x, 2.7, -1.6), 0.06, 0.04, seg=8)
        p.cyl(BRASS, (x, 2.74, -1.6), 1, 0.1, 0.08, seg=8)
        p.cyl('light', (x, 2.98, -1.6), 1, 0.18, 0.4, seg=8)
        p.cyl(BRONZE, (x, 3.22, -1.6), 1, 0.2, 0.06, seg=8)
    # Flagpoles on the parapet either side of the pediment.
    for s in (-1, 1):
        stick(p, BRASS, (dc + s * 4.4, EAVES + 1.0, 0.1), (dc + s * 4.4, EAVES + 5.0, 0.1), 0.05, 0.03, seg=6)

    # ── Sides and back ──
    side_wall(p, x0, -1, 0, D)
    side_wall(p, x1, 1, 0, D)
    p.face(GRANITE, [(x0, 0, D), (x1, 0, D), (x1, 1.2, D), (x0, 1.2, D)], (0, 0, 1))
    brick_wall(p, x0, x1, D, 1)
    p.box(STONE, x0 - 0.3, 7.7, D, x1 + 0.3, 8.3, D + 0.3)
    p.box(STONE_2, x0, 8.3, D - 0.4, x1, EAVES + 1.0, D)
    for k in range(8):
        xc = x0 + W * (k + 0.5) / 8
        p.box(STONE, xc - 1.1, 1.75, D + 0.02, xc + 1.1, 6.3, D + 0.1)
        p.box(WINDOW, xc - 0.9, 1.95, D + 0.1, xc + 0.9, 6.1, D + 0.13)
    # Corner quoins.
    for cx_, cz_ in ((x0, 0), (x1, 0), (x0, D), (x1, D)):
        sx, sz = (-1 if cx_ < 0 else 1), (-1 if cz_ == 0 else 1)
        for k in range(11):
            y = 1.2 + k * 0.59
            big = k % 2
            ex = 0.9 if big else 0.55
            p.box(STONE, min(cx_ - sx * ex, cx_ + sx * 0.06), y, min(cz_ - sz * (1.45 - ex), cz_ + sz * 0.06),
                  max(cx_ - sx * ex, cx_ + sx * 0.06), y + 0.55, max(cz_ - sz * (1.45 - ex), cz_ + sz * 0.06))


def lamp_post(p, x, y, z, h=2.6):
    stick(p, BRONZE, (x, y, z), (x, y + h, z), 0.07, 0.045, seg=8)
    p.cyl(BRASS, (x, y + 0.06, z), 1, 0.12, 0.12, seg=8)
    p.cyl(BRASS, (x, y + h + 0.03, z), 1, 0.1, 0.06, seg=8)
    p.cyl('light', (x, y + h + 0.28, z), 1, 0.2, 0.26, seg=8)
    p.cyl('light', (x, y + h + 0.28, z), 1, 0.14, 0.4, seg=8)
    p.cyl(BRONZE, (x, y + h + 0.5, z), 1, 0.22, 0.05, seg=8)
    p.cyl(BRONZE, (x, y + h + 0.58, z), 1, 0.05, 0.12, seg=6)


def bridge(p):
    L = HALF + 0.6
    for s in (-1, 1):
        z = s * ZA
        # Parapet: plinth, turned balusters, a moulded rail. 0.24 thick (the name plate is the game's, on its road face).
        p.box(STONE_2, -L, 0, z - 0.12, L, 0.2, z + 0.12)
        p.box(STONE, -L, 0.9, z - 0.14, L, 1.05, z + 0.14)
        p.box(STONE_2, -L, 1.05, z - 0.1, L, 1.1, z + 0.1)
        n = 34
        for k in range(n):
            x = -L + 0.5 + (2 * L - 1.0) * k / (n - 1)
            if abs(x) < 1.5:
                continue   # the solid panel that carries the name plate
            p.cyl(STONE, (x, 0.55, z), 1, 0.07, 0.7, seg=7, caps=False)
            p.cyl(STONE, (x, 0.5, z), 1, 0.1, 0.16, seg=7)
        p.box(STONE, -1.5, 0.2, z - 0.1, 1.5, 0.9, z + 0.1)
        # Name posts (親柱) at the four corners, each with a bronze lamp; two more lamps on the rail.
        for x in (-L, L):
            p.box(GRANITE, x - 0.42, 0, z - 0.42, x + 0.42, 0.3, z + 0.42)
            p.box(STONE, x - 0.34, 0.3, z - 0.34, x + 0.34, 1.55, z + 0.34)
            p.box(STONE_2, x - 0.42, 1.55, z - 0.42, x + 0.42, 1.7, z + 0.42)
            p.box(STONE, x - 0.26, 1.7, z - 0.26, x + 0.26, 1.82, z + 0.26)
            lamp_post(p, x, 1.82, z, 1.5)
        for x in (-3.4, 3.4):
            p.box(STONE, x - 0.2, 0.2, z - 0.2, x + 0.2, 1.2, z + 0.2)
            lamp_post(p, x, 1.2, z, 1.3)
        # The arch, seen from the canal: a spandrel wall of coursed stone, voussoirs, a keystone.
        zo = z + s * 0.3
        water, spring, crown, hw = -3.0, -2.6, -0.75, 5.4
        n = 28
        for k in range(n):
            xa, xb = -L + 2 * L * k / n, -L + 2 * L * (k + 1) / n

            def arch(x):
                if abs(x) >= hw:
                    return water - 0.6
                return spring + (crown - spring) * math.sqrt(1 - (x / hw) ** 2)

            ya, yb = arch(xa), arch(xb)
            for c in range(5):
                ta, tb = c / 5, (c + 1) / 5
                p.face(STONE_2 if (c + k // 3) % 2 else 'flat:#b3a688',
                       [(xa, ya + (0.0 - ya) * ta, zo), (xb, yb + (0.0 - yb) * ta, zo), (xb, yb + (0.0 - yb) * tb, zo), (xa, ya + (0.0 - ya) * tb, zo)], (0, 0, s))
            if abs((xa + xb) / 2) < hw:
                # Voussoir ring and the dark of the vault behind it.
                p.face(STONE if k % 2 else GRANITE, [(xa, ya, zo + s * 0.03), (xb, yb, zo + s * 0.03), (xb, yb + 0.42, zo + s * 0.03), (xa, ya + 0.42, zo + s * 0.03)], (0, 0, s))
                p.face('flat:#3a362f', [(xa, water - 0.6, zo - s * 0.25), (xb, water - 0.6, zo - s * 0.25), (xb, yb, zo - s * 0.25), (xa, ya, zo - s * 0.25)], (0, 0, s))
                # Daylight at the far end of the vault: a smaller arch, pale, with the water's colour under it.
                f = 0.58
                fa, fb = water + (ya - water) * f, water + (yb - water) * f
                p.face('flat:#8c9a98', [(xa * f, water + 0.25, zo - s * 0.24), (xb * f, water + 0.25, zo - s * 0.24), (xb * f, fb, zo - s * 0.24), (xa * f, fa, zo - s * 0.24)], (0, 0, s))
                p.face('flat:#3f5a60', [(xa * f, water - 0.6, zo - s * 0.24), (xb * f, water - 0.6, zo - s * 0.24), (xb * f, water + 0.25, zo - s * 0.24), (xa * f, water + 0.25, zo - s * 0.24)], (0, 0, s))
                p.face(GRANITE_2, [(xa, ya, zo), (xb, yb, zo), (xb, yb, zo - s * 0.25), (xa, ya, zo - s * 0.25)], (0, -1, 0))
        p.box(STONE, -0.3, crown - 0.1, min(zo, zo + s * 0.1), 0.3, crown + 0.62, max(zo, zo + s * 0.1))
        # A stone band under the parapet, and cutwaters at the springings.
        p.box(STONE, -L, -0.16, min(z, zo + s * 0.08), L, 0, max(z, zo + s * 0.08))
        for x in (-hw - 0.5, hw + 0.5):
            p.box(GRANITE, x - 0.5, water - 0.6, min(zo, zo + s * 0.5), x + 0.5, spring + 0.2, max(zo, zo + s * 0.5))



# ── Inside (stage 2 of the 2026-11 rebuild) ─────────────────────────────────────────────────────
# The building's own frame (origin mid-frontage on the pavement, +z into the lot). Shared with
# src/stations/exchange.ts: F2, CEIL, CORE, the void, the stair well, DOOR2, the lift.
F2, CEIL = 4.6, 8.9                       # the gallery floor; the ceiling under the roof slab
CORE = (-20.55, 2.65, 2.2, 25.4)          # the rotunda's drum, squared (rotunda.ts colliders): x0, x1, z0, z1
VOID = (2.65, 19.1, 3.4, 24.6)            # the hall's open middle under the ceiling's laylight
WELL = (2.45, 12.17, 10.3, 17.3)          # the Grand Stair's well in the floor (rotunda.ts XS, XT, CZ ± SH)
DOOR2 = (-16.05, -13.65)                  # the second-floor door in the front, for the footbridge's link
STAIR2 = (10.5, 19.1, 21.8, 24.2)         # the stair up to the gallery: x0, x1 (climbing +x), z0, z1
LIFT = (20.25, 22.55, 0.4, 2.7)           # the lift's shaft
COLS = [(6.0, 3.4), (10.0, 3.4), (6.0, 24.6), (10.0, 24.6), (19.1, 8.5), (19.1, 13.0), (19.1, 17.5), (19.1, 3.4)]
PLASTER = 'flat:#efe8d8'
WOOD = 'flat:#5a3d2b'
WOOD_LT = 'flat:#7a5a3a'
MARBLE = 'flat:#e3dccb'
SKY = 'flat:#d6e2e8'
CLOTHS = ['#7a1f2b', '#1f3f7a', '#b4472f', '#2b3a67', '#c9962e', '#3f6f4a', '#efe6cf', '#d94f8a']


def pilasters(p, face, a0, a1, at, y0, y1, step, skip=()):
    """Flat stone pilasters on an inside wall, none in the `skip` spans (doorways)."""
    x = a0 + step / 2
    while x < a1 - 0.3:
        if any(s0 - 0.5 < x < s1 + 0.5 for s0, s1 in skip):
            x += step
            continue
        if face in 'fb':
            z0, z1 = (at, at + 0.12) if face == 'f' else (at - 0.12, at)
            p.box(STONE, x - 0.3, y0, z0, x + 0.3, y1, z1)
        else:
            x0_, x1_ = (at, at + 0.12) if face == 'l' else (at - 0.12, at)
            p.box(STONE, x0_, y0, x - 0.3, x1_, y1, x + 0.3)
        x += step


def inside(p):
    """The trading hall and the gallery, as seen from inside: wall linings with windows, the drum's
    squared core with the arch over the Grand Stair, the gallery on columns with a bronze
    balustrade, the coffered ceiling with its laylight, the brokers' booths, the price board's
    frame, an info desk, a café corner, the museum's cases. No colliders: the game's."""
    x0, x1, z0, z1 = -22.5, 22.5, 0.5, 27.5
    cx0, cx1, cz0, cz1 = CORE
    # ── Wall linings (thin boxes just inside the outer walls), with the two doors left open ──
    d0, d1 = DOOR
    segs = [(x0, DOOR2[0], 0, CEIL), (DOOR2[0], DOOR2[1], 0, F2), (DOOR2[0], DOOR2[1], F2 + 2.2, CEIL),
            (DOOR2[1], d0, 0, CEIL), (d0, d1, 3.2, CEIL), (d1, x1, 0, CEIL)]
    for a, b, ya, yb in segs:
        p.box(PLASTER, a, ya, z0 - 0.1, b, yb, z0)
    p.box(PLASTER, x0, 0, z1, x1, CEIL, z1 + 0.1)
    p.box(PLASTER, x1, 0, z0, x1 + 0.1, CEIL, z1)
    p.box(PLASTER, x0 - 0.1, 0, z0, x0, CEIL, z1)
    # Timber dado on both floors, a picture rail, pilasters.
    for y, (g0, g1) in ((0.0, (d0, d1)), (F2, DOOR2)):
        p.box(WOOD, x0, y, z0, g0, y + 1.1, z0 + 0.03)
        p.box(WOOD, g1, y, z0, x1, y + 1.1, z0 + 0.03)
        p.box(WOOD, x0, y, z1 - 0.03, x1, y + 1.1, z1)
        p.box(WOOD, x1 - 0.03, y, z0, x1, y + 1.1, z1)
        p.box(WOOD, x0, y, z0, x0 + 0.03, y + 1.1, z1)
    pilasters(p, 'f', x0, x1, z0, 0, CEIL, 5.1, skip=((d0, d1), DOOR2))
    pilasters(p, 'b', x0, x1, z1, 0, CEIL, 5.1)
    pilasters(p, 'r', z0, z1, x1, 0, CEIL, 5.6)
    # Windows from inside: the front's tall bays (as the outside, hall()), the side's.
    pil = [-W / 2 + 0.5]
    while pil[-1] + 5.1 < d0 - 1.0:
        pil.append(pil[-1] + 5.1)
    pil += [d0 - 1.1, d1 + 1.1]
    while pil[-1] + 5.1 < W / 2 - 0.4:
        pil.append(pil[-1] + 5.1)
    for a, b in zip(pil, pil[1:]):
        if (a >= d0 - 1.2 and b <= d1 + 1.2) or b - a < 3.0:
            continue
        xc, r = (a + b) / 2, min(2.6, b - a - 1.6) / 2
        if abs(xc - (DOOR2[0] + DOOR2[1]) / 2) < 0.5:
            p.face(SKY, [(xc - r, 2.0, z0 + 0.04), (xc + r, 2.0, z0 + 0.04), (xc + r, 4.2, z0 + 0.04), (xc - r, 4.2, z0 + 0.04)], (0, 0, 1))
            continue
        p.face(SKY, [(xc - r, 2.0, z0 + 0.04), (xc + r, 2.0, z0 + 0.04), (xc + r, 6.4, z0 + 0.04), (xc - r, 6.4, z0 + 0.04)], (0, 0, 1))
        p.box(BRONZE, xc - r, 4.0, z0, xc + r, 4.06, z0 + 0.06)
        for xx in (xc - r - 0.08, xc + r, xc - r / 3 - 0.03, xc + r / 3 - 0.03):
            p.box(BRONZE, xx, 2.0, z0, xx + (0.08 if abs(xx - xc) > r - 0.01 else 0.06), 6.4, z0 + 0.07)
        for yy in (1.92, 6.4):
            p.box(STONE_2, xc - r - 0.2, yy, z0, xc + r + 0.2, yy + 0.1, z0 + 0.1)
    for k in range(5):
        zc = 28.0 * (k + 0.5) / 5
        p.face(SKY, [(x1 - 0.04, 1.95, zc - 0.9), (x1 - 0.04, 1.95, zc + 0.9), (x1 - 0.04, 6.1, zc + 0.9), (x1 - 0.04, 6.1, zc - 0.9)], (-1, 0, 0))
        for zz in (zc - 0.98, zc + 0.9, zc - 0.03):
            p.box(BRONZE, x1 - 0.07, 1.95, zz, x1, 6.1, zz + (0.06 if abs(zz - zc) < 0.1 else 0.08))
        for yy in (1.87, 4.0, 6.1):
            p.box(STONE_2 if yy != 4.0 else BRONZE, x1 - 0.1, yy, zc - 1.0, x1, yy + (0.08 if yy != 4.0 else 0.05), zc + 1.0)
    # ── The drum's squared core: stone faces, the arch over the Grand Stair on its east face ──
    _, _, wz0, wz1 = WELL
    p.box(STONE, cx0, 0, cz0 - 0.1, cx1, CEIL, cz0)
    p.box(STONE, cx0, 0, cz1, cx1, CEIL, cz1 + 0.1)
    p.box(STONE, cx0 - 0.1, 0, cz0, cx0, CEIL, cz1)
    for a, b, ya in ((cz0, wz0, 0.0), (wz1, cz1, 0.0), (wz0, wz1, 3.95)):
        p.box(STONE, cx1, ya, a, cx1 + 0.1, CEIL, b)
    p.box(STONE_2, cx1, 3.95, wz0 - 0.35, cx1 + 0.3, 4.3, wz1 + 0.35)   # lintel over the stair's opening
    for zz in (wz0 - 0.35, wz1):
        p.box(STONE_2, cx1, 0, zz, cx1 + 0.35, 3.95, zz + 0.35)
    p.box(STONE_2, cx1, 4.3, wz0 - 0.4, cx1 + 0.2, 4.6, wz1 + 0.4)
    for face, a0, a1, at in (('f', cx0, cx1, cz0 - 0.1), ('b', cx0, cx1, cz1 + 0.1), ('l', cz0, cz1, cx0 - 0.1)):
        pilasters(p, face, a0, a1, at, 0, CEIL, 4.6)
    # A woven hanging on the drum's face opposite the door from the footbridge.
    dc2 = (DOOR2[0] + DOOR2[1]) / 2
    for k in range(9):
        xa = dc2 - 2.7 + k * 0.6
        p.box('flat:' + CLOTHS[k % len(CLOTHS)], xa, F2 + 0.5, cz0 - 0.16, xa + 0.6, F2 + 3.6, cz0 - 0.12)
    p.box(WOOD, dc2 - 2.85, F2 + 3.6, cz0 - 0.2, dc2 + 2.85, F2 + 3.7, cz0 - 0.1)
    # ── The closed ends of the ring at street level (staff doors) ──
    for za, zb in ((z0, cz0), (cz1, z1)):
        p.box(PLASTER, cx1, 0, za, cx1 + 0.1, F2, zb)
        p.box(WOOD, cx1 + 0.1, 0, (za + zb) / 2 - 0.5, cx1 + 0.14, 2.1, (za + zb) / 2 + 0.5)
    # ── The gallery: slabs, the soffit, a stone fascia and a bronze balustrade round the void ──
    vx0, vx1, vz0, vz1 = VOID
    slabs = [(x0, cx1, z0, cz0), (cx1, x1, z0, vz0), (x0, cx0, cz0, cz1), (x0, cx1, cz1, z1), (cx1, x1, vz1, z1), (vx1, x1, vz0, vz1)]
    for a, b, c, d in slabs:
        p.box(MARBLE, a, F2 - 0.3, c, b, F2, d)
    edges = [('x', vx0, vx1, vz0), ('x', vx0, vx1, vz1), ('z', vz0, vz1, vx1)]
    for axis, a, b, at in edges:
        if axis == 'x':
            p.box(STONE_2, a, F2 - 0.6, at - 0.15, b, F2 + 0.02, at + 0.15)
            p.box(BRONZE, a, F2 + 1.0, at - 0.06, b, F2 + 1.08, at + 0.06)
            x = a + 0.15
            while x < b:
                p.box(BRONZE, x - 0.02, F2, at - 0.02, x + 0.02, F2 + 1.0, at + 0.02)
                x += 0.15
        else:
            for sa, sb in ((a, STAIR2[2]), (STAIR2[3], b)):
                p.box(STONE_2, at - 0.15, F2 - 0.6, sa, at + 0.15, F2 + 0.02, sb)
                p.box(BRONZE, at - 0.06, F2 + 1.0, sa, at + 0.06, F2 + 1.08, sb)
            z = a + 0.15
            while z < b:
                if not (STAIR2[2] < z < STAIR2[3]):
                    p.box(BRONZE, at - 0.02, F2, z - 0.02, at + 0.02, F2 + 1.0, z + 0.02)
                z += 0.15
    for (cx, cz) in COLS:
        p.cyl(MARBLE, (cx, (F2 - 0.6) / 2, cz), 1, 0.32, F2 - 0.6, seg=14)
        p.box(STONE_2, cx - 0.42, 0, cz - 0.42, cx + 0.42, 0.35, cz + 0.42)
        p.box(BRASS, cx - 0.45, F2 - 0.85, cz - 0.45, cx + 0.45, F2 - 0.6, cz + 0.45)
    # ── The ceiling: coffers in timber, the laylight over the void ──
    p.box(PLASTER, x0, CEIL, z0, x1, CEIL + 0.1, z1)
    x = vx0 + 0.6
    while x + 1.8 < vx1:
        z = vz0 + 0.6
        while z + 1.8 < vz1:
            lit = (int((x - vx0) / 2.0) + int((z - vz0) / 2.0)) % 2 == 0
            p.box('light' if lit else 'flat:#c9d3d6', x + 0.15, CEIL - 0.02, z + 0.15, x + 1.65, CEIL, z + 1.65)
            z += 2.0
        x += 2.0
    for xx in [vx0 + 0.6 + 2.0 * k for k in range(int((vx1 - vx0) / 2.0) + 1)]:
        p.box(WOOD_LT, xx - 0.08, CEIL - 0.3, vz0, xx + 0.08, CEIL, vz1)
    for zz in [vz0 + 0.6 + 2.0 * k for k in range(int((vz1 - vz0) / 2.0) + 1)]:
        p.box(WOOD_LT, vx0, CEIL - 0.3, zz - 0.08, vx1, CEIL, zz + 0.08)
    # ── The trading floor: brokers' booths in two rows, an info desk, a café corner ──
    for zr, xs in ((4.2, (3.2, 5.6, 8.0, 10.4)),):
        for xb in xs:
            p.box(WOOD, xb, 0, zr, xb + 2.0, 1.05, zr + 1.2)
            p.box(WOOD_LT, xb - 0.05, 1.05, zr - 0.05, xb + 2.05, 1.1, zr + 1.25)
            p.box('flat:#22262b', xb + 0.2, 1.1, zr + 0.95, xb + 1.8, 1.9, zr + 1.0)
            p.cyl(WOOD, (xb + 1.0, 0.3, zr - 0.45), 1, 0.2, 0.6, seg=8)
    p.box(WOOD, 21.0, 0, 8.0, 22.0, 1.05, 12.0)
    p.box(MARBLE, 20.95, 1.05, 7.95, 22.05, 1.12, 12.05)
    for xt in (4.4, 7.4):
        for zt in (20.0, 22.8):
            p.cyl(WOOD, (xt, 0.37, zt), 1, 0.05, 0.74, seg=6)
            p.cyl(MARBLE, (xt, 0.76, zt), 1, 0.42, 0.04, seg=12)
            for dx in (-0.6, 0.6):
                p.cyl('flat:#7a1f2b', (xt + dx, 0.23, zt), 1, 0.17, 0.46, seg=8)
    p.box(WOOD, 20.2, 0, 13.0, 22.4, 1.05, 18.5)
    p.box(MARBLE, 20.15, 1.05, 12.95, 22.45, 1.12, 18.55)
    # ── The price board: a dark frame of rows of slates on the back wall, above the gallery ──
    p.box(WOOD, 4.0, 5.8, z1 - 0.12, 17.0, 8.5, z1)
    for row in range(6):
        y = 6.0 + row * 0.36
        for col in range(12):
            xx = 4.3 + col * 1.04
            p.box('flat:#f4f1e8' if (row + col) % 5 else 'flat:#e8d9b0', xx, y, z1 - 0.15, xx + 0.94, y + 0.28, z1 - 0.12)
    # A clock face's dark surround over the front door, inside.
    p.box(WOOD, (d0 + d1) / 2 - 0.8, 5.9, z0, (d0 + d1) / 2 + 0.8, 7.5, z0 + 0.08)
    # ── The silk museum's cases on the gallery: along the west and back walls and the east wall ──
    def case(a, b, along, at, out):
        """A wall case from a to b along `along` ('x' or 'z'), its back on the wall at `at`, 0.6 deep."""
        lo, hi = (at, at + out * 0.6) if out > 0 else (at + out * 0.6, at)
        if along == 'x':
            p.box(WOOD, a, F2, lo, b, F2 + 0.8, hi)
            p.box('glassTint', a, F2 + 0.8, lo, b, F2 + 2.1, hi)
            p.box(WOOD, a, F2 + 2.1, lo, b, F2 + 2.2, hi)
            x = a + 0.6
            while x < b - 0.5:
                col = 'flat:' + CLOTHS[int(x * 3) % len(CLOTHS)]
                p.box(col, x - 0.35, F2 + 1.0, (lo + hi) / 2 - 0.02, x + 0.35, F2 + 1.9, (lo + hi) / 2 + 0.02)
                p.box(col, x - 0.55, F2 + 1.65, (lo + hi) / 2 - 0.02, x + 0.55, F2 + 1.85, (lo + hi) / 2 + 0.02)
                x += 1.3
        else:
            p.box(WOOD, lo, F2, a, hi, F2 + 0.8, b)
            p.box('glassTint', lo, F2 + 0.8, a, hi, F2 + 2.1, b)
            p.box(WOOD, lo, F2 + 2.1, a, hi, F2 + 2.2, b)
            z = a + 0.5
            while z < b - 0.4:
                col = 'flat:' + CLOTHS[int(z * 5) % len(CLOTHS)]
                p.cyl(col, ((lo + hi) / 2, F2 + 0.95, z), 0, 0.14, 0.5, seg=8)
                p.cyl(col, ((lo + hi) / 2, F2 + 1.25, z), 0, 0.14, 0.5, seg=8)
                z += 0.7
    case(cz0 + 0.5, cz1 - 0.5, 'z', x0, 1)
    case(x0 + 1.0, cx1 - 0.5, 'x', z1, -1)
    case(4.0, 17.0, 'x', z1, -1)
    case(vz0 + 0.8, STAIR2[2] - 0.6, 'z', x1, -1)


PROPS = {'hall': (hall, W + 4), 'inside': (inside, W + 4), 'bridge': (bridge, 18)}


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('exchange', [dict(id=k, w=w, gap=6.0) for k, (_, w) in PROPS.items()], build_hi, lambda v: None)
