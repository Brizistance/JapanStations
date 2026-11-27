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
#   exchange_tower, exchange_annex   the 2026-11-26 enlargement: the corner clock tower and the 1930s annex
#                    behind the hall. Origin and frame as exchange_hall.
#   exchange_bank    the old bank across the avenue, the station's second entrance: a stone front and portico.
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



# ── The 2026-11-26 enlargement (the station made grander): the clock tower on the crossing's corner
# and the 1930s annex behind the hall. Same frame as hall(). Shared with src/stations/rotunda.ts (TOWER, ANNEX).
TOWER = (-W / 2 - 10.0, -W / 2, 0.0, 10.0)   # x0, x1, z0, z1
TOWER_H = (24.0, 30.6, 38.0)                 # the shaft's cornice, the clock stage's, the roof's tip
ANNEX = (-W / 2, W / 2, D, D + 18.0)
ANNEX_H = 22.0
DIAL = 'flat:#f1ead8'


def _plane(p, axis, at, out):
    """A wall in the plane axis = at facing out: quad(mat, a0, a1, y0, y1, n) and box(mat, a0, a1, y0, y1, n0, n1), n out from the wall."""
    def pt(a, y, n):
        return (a, y, at + out * n) if axis == 'z' else (at + out * n, y, a)
    nrm = (0, 0, out) if axis == 'z' else (out, 0, 0)

    def quad(mat, a0, a1, y0, y1, n=0.0, col=None):
        p.face(mat, [pt(a0, y0, n), pt(a1, y0, n), pt(a1, y1, n), pt(a0, y1, n)], nrm, col=col)

    def box(mat, a0, a1, y0, y1, n0, n1):
        lo, hi = sorted((at + out * n0, at + out * n1))
        if axis == 'z':
            p.box(mat, a0, y0, lo, a1, y1, hi)
        else:
            p.box(mat, lo, y0, a0, hi, y1, a1)
    return quad, box, pt


def _window(quad, box, c, y0, y1, w, k=0):
    """A tall window in a stone frame with bronze bars."""
    box(STONE, c - w / 2 - 0.2, c + w / 2 + 0.2, y0 - 0.22, y0, 0, 0.2)
    box(STONE, c - w / 2 - 0.16, c + w / 2 + 0.16, y1, y1 + 0.3, 0, 0.14)
    for s in (-1, 1):
        box(STONE, min(c + s * w / 2, c + s * (w / 2 + 0.16)), max(c + s * w / 2, c + s * (w / 2 + 0.16)), y0, y1, 0, 0.1)
    quad(WINDOW_LIT if k % 3 == 0 else WINDOW_DARK, c - w / 2, c + w / 2, y0, y1, 0.03, col=WINDOW)
    box(BRONZE, c - 0.03, c + 0.03, y0, y1, 0.03, 0.07)
    box(BRONZE, c - w / 2, c + w / 2, y0 + (y1 - y0) * 0.62, y0 + (y1 - y0) * 0.62 + 0.06, 0.03, 0.07)


def _brick(quad, a0, a1, y0, y1, step=0.5):
    n = max(1, round((y1 - y0) / step))
    for k in range(n):
        quad(BRICK if k % 2 else BRICK_2, a0, a1, y0 + (y1 - y0) * k / n, y0 + (y1 - y0) * (k + 1) / n)


def tower(p):
    """The clock tower: a brick shaft with stone quoins and bands, a stone clock stage with a dial on
    each face, a copper roof. It stands against the hall's west end, on the corner of the two avenues."""
    x0, x1, z0, z1 = TOWER
    H0, H1, H2 = TOWER_H
    xc, zc = (x0 + x1) / 2, (z0 + z1) / 2
    for fi, (axis, at, out, a0, a1) in enumerate([('z', z0, -1, x0, x1), ('z', z1, 1, x0, x1), ('x', x0, -1, z0, z1), ('x', x1, 1, z0, z1)]):
        quad, box, pt = _plane(p, axis, at, out)
        c = (a0 + a1) / 2
        quad(GRANITE, a0, a1, 0, 1.2)
        for y in (0.4, 0.8):
            box(GRANITE_2, a0, a1, y - 0.025, y + 0.025, 0, 0.012)
        box(GRANITE_2, a0 - 0.08, a1 + 0.08, 1.2, 1.4, 0, 0.1)
        _brick(quad, a0, a1, 1.4, H0)
        for y, h, n in ((4.4, 0.3, 0.1), (9.2, 1.0, 0.16), (14.8, 0.3, 0.1), (19.4, 0.3, 0.1)):
            box(STONE_2, a0, a1, y, y + h, 0, n)
        # Quoins at both corners, long and short in turn.
        k, y = 0, 1.4
        while y < H0 - 0.5:
            L = 0.95 if k % 2 else 0.6
            box(STONE, a0, a0 + L, y, y + 0.72, 0, 0.06)
            box(STONE, a1 - L, a1, y, y + 0.72, 0, 0.06)
            y += 0.8
            k += 1
        # Windows: one tall one a floor; the face against the hall has them only above its parapet.
        hall_side = axis == 'x' and out == 1
        for j, (ya, yb) in enumerate(((1.95, 6.3), (10.9, 13.9), (15.5, 18.5), (20.1, 23.0))):
            if hall_side and j == 0:
                continue
            if axis == 'z' and out == -1 and j == 0:
                # The tower's door on the avenue: bronze leaves in a stone arch (shut: the way in is the portal).
                box(STONE, c - 1.75, c + 1.75, 0, 4.9, 0, 0.3)
                box(DARK, c - 1.25, c + 1.25, 0, 3.6, 0.3, 0.32)
                box(BRONZE, c - 1.2, c - 0.03, 0.05, 3.1, 0.3, 0.38)
                box(BRONZE, c + 0.03, c + 1.2, 0.05, 3.1, 0.3, 0.38)
                quad(WINDOW_LIT, c - 1.2, c + 1.2, 3.2, 3.55, 0.34, col=WINDOW)
                box(STONE_2, c - 1.95, c + 1.95, 4.9, 5.3, 0, 0.42)
                continue
            if j == 3:
                for dc in (-1.5, 1.5):
                    _window(quad, box, c + dc, ya, yb, 1.4, fi + j)
            else:
                _window(quad, box, c, ya, yb, 2.2, fi + j)
        # The shaft's cornice.
        box(STONE, a0 - 0.45, a1 + 0.45, H0, H0 + 0.5, -0.2, 0.45)
        box(STONE_2, a0 - 0.2, a1 + 0.2, H0 - 0.4, H0, 0, 0.22)
        n = int((a1 - a0) / 0.6)
        for i in range(n):
            a = a0 + (a1 - a0) * (i + 0.25) / n
            box(STONE, a, a + 0.3, H0 - 0.3, H0, 0.22, 0.38)
        # The clock stage, set in 0.5 m: stone, corner piers, the dial.
        quad2, box2, pt2 = _plane(p, axis, at - out * 0.5, out)
        quad2(STONE_2, a0 + 0.5, a1 - 0.5, H0 + 0.5, H1)
        for a in (a0 + 0.5, a1 - 1.4):
            box2(STONE, a, a + 0.9, H0 + 0.5, H1, 0, 0.14)
        box2(STONE, a0 + 0.2, a1 - 0.2, H1, H1 + 0.45, -0.2, 0.42)
        yd, R = (H0 + 0.5 + H1) / 2, 2.2
        ax = 2 if axis == 'z' else 0
        p.cyl(BRONZE, pt2(c, yd, 0.08), ax, R + 0.16, 0.16, seg=28)
        p.cyl(DIAL, pt2(c, yd, 0.13), ax, R, 0.16, seg=28)
        sgn = -out if axis == 'z' else out   # which way "clockwise" runs along a, seen from outside
        for h in range(12):
            a = 2 * math.pi * h / 12
            r0 = R - (0.5 if h % 3 == 0 else 0.3)
            stick(p, DARK, pt2(c + sgn * r0 * math.sin(a), yd + r0 * math.cos(a), 0.22), pt2(c + sgn * (R - 0.1) * math.sin(a), yd + (R - 0.1) * math.cos(a), 0.22), 0.05 if h % 3 == 0 else 0.03)
        for (ang, L, r) in ((math.radians(305), R * 0.55, 0.07), (math.radians(60), R * 0.85, 0.05)):   # ten past ten
            stick(p, DARK, pt2(c, yd, 0.25), pt2(c + sgn * L * math.sin(ang), yd + L * math.cos(ang), 0.25), r)
        p.cyl(BRASS, pt2(c, yd, 0.26), ax, 0.14, 0.08, seg=10)
    # The copper roof: a steep four-sided cap, a lantern, a finial.
    b0, b1, yb, yt = 5.3, 1.3, H1 + 0.45, H2 - 4.4
    for (dx, dz) in ((0, -1), (0, 1), (-1, 0), (1, 0)):
        if dx == 0:
            pts = [(xc - b0, yb, zc + dz * b0), (xc + b0, yb, zc + dz * b0), (xc + b1, yt, zc + dz * b1), (xc - b1, yt, zc + dz * b1)]
        else:
            pts = [(xc + dx * b0, yb, zc - b0), (xc + dx * b0, yb, zc + b0), (xc + dx * b1, yt, zc + b1), (xc + dx * b1, yt, zc - b1)]
        p.face(COPPER, pts, (dx, 0.6, dz))
    p.box(COPPER, xc - b0, yb - 0.05, zc - b0, xc + b0, yb, zc + b0)
    p.box(STONE_2, xc - 1.1, yt, zc - 1.1, xc + 1.1, yt + 1.6, zc + 1.1)
    p.box(COPPER, xc - 1.4, yt + 1.6, zc - 1.4, xc + 1.4, yt + 1.8, zc + 1.4)
    stick(p, COPPER, (xc, yt + 1.8, zc), (xc, yt + 3.3, zc), 0.9, 0.08, seg=8)
    stick(p, BRASS, (xc, yt + 3.3, zc), (xc, H2, zc), 0.05)


def annex(p):
    """The 1930s annex behind the hall: five floors of offices in the same brick, plainer, with stone
    bands at the sills and a flat roof. Its north face shows only above the hall's parapet."""
    x0, x1, z0, z1 = ANNEX
    H = ANNEX_H
    for fi, (axis, at, out, a0, a1) in enumerate([('z', z0, -1, x0, x1), ('z', z1, 1, x0, x1), ('x', x0, -1, z0, z1), ('x', x1, 1, z0, z1)]):
        quad, box, pt = _plane(p, axis, at, out)
        north = axis == 'z' and out == -1
        quad(GRANITE, a0, a1, 0, 1.2)
        box(GRANITE_2, a0, a1, 1.2, 1.4, 0, 0.08)
        _brick(quad, a0, a1, 1.4, H - 1.4, 0.55)
        box(STONE, a0 - 0.3, a1 + 0.3, H - 1.4, H - 0.8, -0.1, 0.32)
        quad(STONE_2, a0, a1, H - 0.8, H)
        box(COPPER, a0 - 0.05, a1 + 0.05, H, H + 0.08, -0.4, 0.06)
        n = max(2, round((a1 - a0) / 3.83))
        for f in range(5):
            ya = 1.95 + 3.85 * f
            if north and ya < EAVES + 1.2:
                continue
            box(STONE_2, a0, a1, ya - 0.3, ya - 0.1, 0, 0.07)
            for i in range(n):
                c = a0 + (a1 - a0) * (i + 0.5) / n
                if f == 0 and axis == 'z' and out == 1 and i in (n // 2 - 1, n // 2):
                    continue
                _window(quad, box, c, ya, ya + 2.3, 1.9, fi + f * 2 + i)
        # Stone piers at the corners.
        for a in (a0, a1 - 0.7):
            box(STONE, a, a + 0.7, 1.4, H - 1.4, 0, 0.08)
        if axis == 'z' and out == 1:
            # The back door: a stone surround two bays wide, bronze doors, a lamp either side.
            c = (a0 + a1) / 2
            box(STONE, c - 3.4, c + 3.4, 0, 4.6, 0, 0.25)
            box(DARK, c - 2.4, c + 2.4, 0, 3.4, 0.25, 0.27)
            for s in (-1, 1):
                box(BRONZE, min(c + s * 0.05, c + s * 2.3), max(c + s * 0.05, c + s * 2.3), 0.05, 3.0, 0.25, 0.33)
                box(BRASS, min(c + s * 2.9, c + s * 3.1), max(c + s * 2.9, c + s * 3.1), 2.4, 3.0, 0.25, 0.5)
            box(STONE_2, c - 3.7, c + 3.7, 4.6, 5.0, 0, 0.4)
    # The roof, its stair head and two tanks.
    p.box(STONE_2, x0 + 0.4, H - 0.75, z0 + 0.4, x1 - 0.4, H - 0.6, z1 - 0.4)
    p.box(STONE_2, x1 - 12, H - 0.6, z0 + 5, x1 - 6, H + 2.4, z0 + 11)
    for dx in (0, 3.2):
        p.cyl(COPPER, (x0 + 8 + dx, H + 0.6, z0 + 9), 1, 1.2, 2.4, seg=12)


# ── The old bank across the avenue (紬橋銀行 本店, 1931): the station's second entrance. A stone front
# with a portico of six columns standing forward over the pavement, the metro's exit stair rising under it.
# Origin: the middle of the frontage on the building line, front facing -z. Shared with
# src/stations/tsumugibashi-street.ts (BANK): W, D, the portico's depth and its columns.
BANK_W, BANK_D, BANK_H = 34.0, 26.0, 13.0
PORT = 6.0                                    # the portico stands this far forward of the building line
BANK_COLS = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5]


def bank(p):
    x0, x1 = -BANK_W / 2, BANK_W / 2
    H = BANK_H
    # ── Front wall behind the portico: stone, pilasters behind the columns, tall windows, the bronze door ──
    quad, box, pt = _plane(p, 'z', 0.0, -1)
    quad(GRANITE, x0, x1, 0, 1.3)
    quad(STONE, x0, x1, 1.3, H)
    for y in (0.45, 0.9):
        box(GRANITE_2, x0, x1, y - 0.025, y + 0.025, 0, 0.012)
    for xc in BANK_COLS:
        box(STONE_2, xc - 0.55, xc + 0.55, 0, 10.4, 0, 0.18)
    for i in range(5):
        c = (BANK_COLS[i] + BANK_COLS[i + 1]) / 2
        if i == 2:
            box(STONE_2, c - 1.9, c + 1.9, 0, 5.6, 0, 0.3)
            box(DARK, c - 1.4, c + 1.4, 0, 4.4, 0.3, 0.32)
            for sgn in (-1, 1):
                box(BRONZE, min(c + sgn * 0.04, c + sgn * 1.35), max(c + sgn * 0.04, c + sgn * 1.35), 0.05, 3.7, 0.3, 0.4)
            quad(WINDOW_LIT, c - 1.35, c + 1.35, 3.8, 4.35, 0.35, col=WINDOW)
            box(STONE, c - 2.2, c + 2.2, 5.6, 6.0, 0, 0.45)
            _window(quad, box, c, 6.7, 9.6, 2.4, 0)
        else:
            _window(quad, box, c, 2.0, 5.4, 2.4, i)
            _window(quad, box, c, 6.7, 9.6, 2.4, i + 1)
    # The end bays, outside the portico: rusticated stone with one window each.
    for sgn in (-1, 1):
        c = sgn * (BANK_W / 2 - 1.7)
        for y in [1.3 + 0.75 * k for k in range(1, 12)]:
            box(STONE_2, c - 1.7, c + 1.7, y - 0.03, y + 0.03, 0, 0.015)
        _window(quad, box, c, 2.2, 5.2, 1.4, 1)
        _window(quad, box, c, 6.9, 9.4, 1.4, 2)
    # ── The portico: columns on low plinths, capitals, the entablature, a pediment with the bank's roundel ──
    zc = -PORT + 0.9
    for xc in BANK_COLS:
        p.box(GRANITE, xc - 0.85, 0, zc - 0.85, xc + 0.85, 0.5, zc + 0.85)
        p.cyl(STONE, (xc, 0.62, zc), 1, 0.74, 0.24, seg=16)
        stick(p, STONE, (xc, 0.74, zc), (xc, 9.7, zc), 0.62, 0.52, seg=16)
        p.cyl(STONE_2, (xc, 9.8, zc), 1, 0.66, 0.2, seg=16)
        p.box(STONE, xc - 0.8, 9.9, zc - 0.8, xc + 0.8, 10.4, zc + 0.8)
    ex0, ex1 = BANK_COLS[0] - 1.1, BANK_COLS[-1] + 1.1
    p.box(STONE, ex0, 10.4, -PORT, ex1, 11.3, 0)
    p.box(STONE_2, ex0, 11.3, -PORT, ex1, 12.1, 0)
    p.box(STONE, ex0 - 0.35, 12.1, -PORT - 0.35, ex1 + 0.35, 12.5, 0)
    n = int((ex1 - ex0) / 0.7)
    for i in range(n):
        a = ex0 + (ex1 - ex0) * (i + 0.25) / n
        p.box(STONE, a, 11.85, -PORT - 0.18, a + 0.35, 12.1, -PORT)
    p.prism(STONE_2, [(ex0 - 0.35, 12.5), (ex1 + 0.35, 12.5), (0, 16.2)], 'z', -PORT - 0.1, -0.2)
    for (xa, xb) in ((ex0 - 0.35, 0.0), (0.0, ex1 + 0.35)):
        ya, yb = (12.5, 16.2) if xa < 0 else (16.2, 12.5)
        p.face(STONE, [(xa, ya, -PORT - 0.4), (xb, yb, -PORT - 0.4), (xb, yb + 0.4, -PORT - 0.4), (xa, ya + 0.4, -PORT - 0.4)], (0, 0, -1))
        p.face(COPPER, [(xa, ya + 0.4, -PORT - 0.4), (xb, yb + 0.4, -PORT - 0.4), (xb, yb + 0.4, 0.0), (xa, ya + 0.4, 0.0)], (-1 if xa < 0 else 1, 2, 0))
    p.cyl(BRONZE, (0, 13.9, -PORT - 0.16), 2, 1.05, 0.14, seg=20)
    p.cyl(BRASS, (0, 13.9, -PORT - 0.2), 2, 0.8, 0.14, seg=20)
    # The portico's ceiling: coffers.
    for i in range(5):
        c = (BANK_COLS[i] + BANK_COLS[i + 1]) / 2
        p.box(STONE_2, c - 1.9, 10.25, -PORT + 1.9, c + 1.9, 10.4, -0.5)
        p.box('light', c - 0.5, 10.2, -PORT / 2 - 0.5, c + 0.5, 10.25, -PORT / 2 + 0.5)
    # ── Cornice, attic and parapet across the whole front; sides and back in brick with stone bands ──
    box(STONE, x0 - 0.3, x1 + 0.3, H - 0.6, H, -0.2, 0.4)
    quad(STONE_2, x0, x1, H, H + 2.2)
    box(COPPER, x0, x1, H + 2.2, H + 2.3, -0.4, 0.08)
    for fi, (axis, at, out, a0, a1) in enumerate([('z', BANK_D, 1, x0, x1), ('x', x0, -1, 0.0, BANK_D), ('x', x1, 1, 0.0, BANK_D)]):
        quad, box, pt = _plane(p, axis, at, out)
        quad(GRANITE, a0, a1, 0, 1.3)
        _brick(quad, a0, a1, 1.3, H - 0.6, 0.55)
        box(STONE, a0 - 0.2, a1 + 0.2, H - 0.6, H, -0.1, 0.3)
        quad(STONE_2, a0, a1, H, H + 2.2)
        box(STONE_2, a0, a1, 5.9, 6.2, 0, 0.08)
        m = max(2, round((a1 - a0) / 4.6))
        for i in range(m):
            c = a0 + (a1 - a0) * (i + 0.5) / m
            _window(quad, box, c, 2.2, 5.2, 1.8, fi + i)
            _window(quad, box, c, 7.0, 9.8, 1.8, fi + i + 1)
        for a in (a0, a1 - 0.8):
            box(STONE, a, a + 0.8, 1.3, H - 0.6, 0, 0.08)
    # The roof and the banking hall's lantern light.
    p.box(STONE_2, x0 + 0.4, H + 1.0, 0.4, x1 - 0.4, H + 1.15, BANK_D - 0.4)
    p.box(STONE_2, -7, H + 1.15, 7, 7, H + 2.6, 19)
    p.prism(COPPER, [(-7.3, H + 2.6), (7.3, H + 2.6), (0, H + 4.6)], 'z', 6.7, 19.3)


# ── Stage 2b of the 2026-11-26 rebuild: the landmarks of the canal town (src/stations/tsumugi-land.ts) ──
# 澪大橋 Mio-ōhashi (1932): the stonework of Yanagi-suji's bridge over the Mio-gawa. The deck is the game's.
# Origin: the middle of the road at the south abutment, on the pavement; the bridge runs to -z. Shared: GB.
GB_L, GB_HW = 80.5, 16.3
GB_PIERS = (GB_L / 3, 2 * GB_L / 3)
GB_SPRING, GB_RISE, GB_BELT = -2.75, 1.5, -0.25


def gbridge(p):
    spans = [(0.0, GB_PIERS[0] - 2.0), (GB_PIERS[0] + 2.0, GB_PIERS[1] - 2.0), (GB_PIERS[1] + 2.0, GB_L)]

    def arch(t):
        return GB_SPRING + GB_RISE * math.sqrt(max(0.0, 1 - (2 * t - 1) ** 2))
    n = 16
    for (a, b) in spans:
        for i in range(n):
            t0, t1 = i / n, (i + 1) / n
            z0, z1 = -(a + (b - a) * t0), -(a + (b - a) * t1)
            y0, y1 = arch(t0), arch(t1)
            for s in (-1, 1):
                x = s * GB_HW
                p.face(GRANITE if i % 2 else GRANITE_2, [(x, y0, z0), (x, y1, z1), (x, GB_BELT, z1), (x, GB_BELT, z0)], (s, 0, 0))
                # The arch ring, a paler band following the curve.
                xr = s * (GB_HW + 0.06)
                p.face(STONE_2, [(xr, y0, z0), (xr, y1, z1), (xr, y1 + 0.45, z1), (xr, y0 + 0.45, z0)], (s, 0, 0))
            p.face(STONE_2, [(-GB_HW, y0, z0), (GB_HW, y0, z0), (GB_HW, y1, z1), (-GB_HW, y1, z1)], (0, -1, 0))
        zc = -(a + b) / 2
        for s in (-1, 1):
            p.box(STONE, min(s * GB_HW, s * (GB_HW + 0.2)), GB_SPRING + GB_RISE - 0.1, zc - 0.4, max(s * GB_HW, s * (GB_HW + 0.2)), GB_BELT, zc + 0.4)
    for zp in GB_PIERS:
        p.box(GRANITE, -GB_HW - 0.9, -3.7, -zp - 2.0, GB_HW + 0.9, GB_BELT, -zp + 2.0)
        for s in (-1, 1):
            # A rounded cutwater on each face, and the pedestal's corbel above it.
            p.cyl(GRANITE_2, (s * (GB_HW + 0.9), (-3.7 + GB_SPRING + 0.9) / 2, -zp), 1, 2.0, GB_SPRING + 0.9 + 3.7, seg=12)
            p.box(STONE_2, min(s * GB_HW, s * (GB_HW + 1.0)), GB_BELT - 0.5, -zp - 1.0, max(s * GB_HW, s * (GB_HW + 1.0)), GB_BELT, -zp + 1.0)
    for s in (-1, 1):
        xa, xb = min(s * (GB_HW - 0.7), s * (GB_HW + 0.3)), max(s * (GB_HW - 0.7), s * (GB_HW + 0.3))
        p.box(STONE, xa, GB_BELT, -GB_L, xb, 0.0, 0.0)                    # the belt course
        p.box(STONE_2, xa + 0.15, 0.0, -GB_L, xb - 0.15, 0.22, 0.0)        # the balustrade's plinth
        p.box(STONE, xa + 0.1, 0.82, -GB_L, xb - 0.1, 1.02, 0.0)           # its rail
        xm = (xa + xb) / 2
        z = -0.6
        while z > -GB_L + 0.4:
            if all(abs(z + zz) > 0.9 for zz in (0.0, GB_PIERS[0], GB_PIERS[1], GB_L)):
                p.box(STONE_2, xm - 0.09, 0.22, z - 0.09, xm + 0.09, 0.82, z + 0.09)
            z -= 0.55
        # Pedestals over the piers and at both ends, a bronze standard with three globes on each.
        for zz in (0.0, GB_PIERS[0], GB_PIERS[1], GB_L):
            p.box(STONE, xm - 0.6, 0.0, -zz - 0.7, xm + 0.6, 1.5, -zz + 0.7)
            p.box(STONE_2, xm - 0.7, 1.5, -zz - 0.8, xm + 0.7, 1.68, -zz + 0.8)
            stick(p, BRONZE, (xm, 1.68, -zz), (xm, 4.6, -zz), 0.11, 0.07, seg=8)
            for (dx, dz, dy) in ((0, 0, 0.45), (0, -0.55, 0), (0, 0.55, 0)):
                if dz:
                    stick(p, BRONZE, (xm, 4.25, -zz), (xm, 4.4, -zz + dz), 0.04)
                p.cyl('light', (xm + dx, 4.75 + dy, -zz + dz), 1, 0.2, 0.42, seg=8)
        # The four end pylons: granite, a stone cap, a bronze lantern.
        for zz in (2.2, -GB_L - 2.2):
            x0, x1 = min(s * (GB_HW + 0.2), s * (GB_HW + 2.6)), max(s * (GB_HW + 0.2), s * (GB_HW + 2.6))
            p.box(GRANITE, x0, 0.0, zz - 1.2, x1, 5.0, zz + 1.2)
            for y in (1.0, 2.0, 3.0, 4.0):
                p.box(GRANITE_2, x0 - 0.01, y - 0.03, zz - 1.21, x1 + 0.01, y + 0.03, zz + 1.21)
            p.box(STONE, x0 - 0.2, 5.0, zz - 1.4, x1 + 0.2, 5.35, zz + 1.4)
            p.box(BRONZE, (x0 + x1) / 2 - 0.35, 5.35, zz - 0.35, (x0 + x1) / 2 + 0.35, 5.5, zz + 0.35)
            p.box('light', (x0 + x1) / 2 - 0.28, 5.5, zz - 0.28, (x0 + x1) / 2 + 0.28, 6.2, zz + 0.28)
            p.box(BRONZE, (x0 + x1) / 2 - 0.4, 6.2, zz - 0.4, (x0 + x1) / 2 + 0.4, 6.35, zz + 0.4)


# 川湊市公会堂 Kawaminato Public Hall (1918): red brick banded in stone, a great arched window over the doors,
# copper-domed corner towers, a copper mansard. Origin: mid-front on the building line, front facing -z. Shared: PH.
PH_W, PH_D, PH_H = 36.0, 46.0, 15.0


def _banded(quad, box, a0, a1, y0, y1):
    """Brick with a stone band every 1.5 m: the public hall's stripes."""
    y, k = y0, 0
    while y < y1 - 1e-3:
        yb = min(y1, y + (0.3 if k % 2 else 1.2))
        quad(STONE if k % 2 else (BRICK if (k // 2) % 2 else BRICK_2), a0, a1, y, yb)
        y, k = yb, k + 1


def pubhall(p):
    x0, x1 = -PH_W / 2, PH_W / 2
    H = PH_H
    for fi, (axis, at, out, a0, a1) in enumerate([('z', 0.0, -1, x0, x1), ('z', PH_D, 1, x0, x1), ('x', x0, -1, 0.0, PH_D), ('x', x1, 1, 0.0, PH_D)]):
        quad, box, pt = _plane(p, axis, at, out)
        front = fi == 0
        quad(GRANITE, a0, a1, 0, 1.4)
        _banded(quad, box, a0, a1, 1.4, H - 0.7)
        box(STONE, a0 - 0.35, a1 + 0.35, H - 0.7, H, -0.1, 0.5)
        n = int((a1 - a0) / 0.8)
        for i in range(n):
            a = a0 + (a1 - a0) * (i + 0.25) / n
            box(STONE_2, a, a + 0.4, H - 1.0, H - 0.7, 0, 0.3)
        quad(STONE_2, a0, a1, H, H + 1.0)
        m = max(3, round((a1 - a0) / 4.5))
        for i in range(m):
            c = a0 + (a1 - a0) * (i + 0.5) / m
            if front and abs(c) < 8.5:
                continue
            for j, (ya, yb) in enumerate(((2.2, 4.9), (6.5, 9.4), (11.0, 13.4))):
                _window(quad, box, c, ya, yb, 1.9, fi + i + j)
    # The entrance bay: stone, standing forward, three bronze doors under the great arch, a curved pediment.
    BX, BZ = 7.5, -1.6
    p.box(STONE, -BX, 0, BZ, BX, H + 1.0, 0.2)
    for xc in (-4.4, 0.0, 4.4):
        p.box(DARK, xc - 1.5, 0, BZ - 0.02, xc + 1.5, 4.2, BZ)
        for s in (-1, 1):
            p.box(BRONZE, min(xc + s * 0.04, xc + s * 1.4), 0.05, BZ - 0.1, max(xc + s * 0.04, xc + s * 1.4), 3.5, BZ - 0.02)
        p.face(WINDOW_LIT, [(xc - 1.4, 3.55, BZ - 0.05), (xc + 1.4, 3.55, BZ - 0.05), (xc + 1.4, 4.15, BZ - 0.05), (xc - 1.4, 4.15, BZ - 0.05)], (0, 0, -1), col=WINDOW)
    p.box(STONE_2, -BX - 0.3, 4.8, BZ - 0.5, BX + 0.3, 5.3, 0)
    arched_window(p, 0.0, 6.0, 14.2, 9.0, BZ, -1)
    for xc in (-6.3, 6.3):
        stick(p, STONE_2, (xc, 5.3, BZ - 0.45), (xc, 14.0, BZ - 0.45), 0.45, 0.38, seg=12)
        p.box(STONE, xc - 0.6, 14.0, BZ - 1.0, xc + 0.6, 14.5, BZ + 0.1)
    p.box(STONE, -BX - 0.4, H + 1.0, BZ - 0.5, BX + 0.4, H + 1.5, 0.4)
    seg = 10
    for i in range(seg):
        a, b = math.pi * i / seg, math.pi * (i + 1) / seg
        p.face(STONE_2, [(0, H + 1.5, BZ - 0.3), (-BX * math.cos(a), H + 1.5 + 3.4 * math.sin(a), BZ - 0.3), (-BX * math.cos(b), H + 1.5 + 3.4 * math.sin(b), BZ - 0.3)], (0, 0, -1))
        p.face(COPPER, [(-BX * math.cos(a), H + 1.5 + 3.4 * math.sin(a), BZ - 0.3), (-BX * math.cos(b), H + 1.5 + 3.4 * math.sin(b), BZ - 0.3),
                        (-BX * math.cos(b), H + 1.5 + 3.4 * math.sin(b), 6.0), (-BX * math.cos(a), H + 1.5 + 3.4 * math.sin(a), 6.0)], (-math.cos((a + b) / 2), math.sin((a + b) / 2), 0))
    p.cyl(BRONZE, (0, H + 2.9, BZ - 0.36), 2, 1.1, 0.1, seg=20)
    p.cyl(DIAL, (0, H + 2.9, BZ - 0.4), 2, 0.9, 0.1, seg=20)
    # Corner towers on the front: square, a stone belvedere, a copper dome in three steps and a finial.
    for s in (-1, 1):
        cx, cz, hw = s * (PH_W / 2 - 2.0), 2.0, 2.6
        for (axis, at, out, a0, a1) in [('z', cz - hw, -1, cx - hw, cx + hw), ('z', cz + hw, 1, cx - hw, cx + hw), ('x', cx - hw, -1, cz - hw, cz + hw), ('x', cx + hw, 1, cz - hw, cz + hw)]:
            quad, box, pt = _plane(p, axis, at, out)
            quad(GRANITE, a0, a1, 0, 1.4)
            _banded(quad, box, a0, a1, 1.4, H + 1.0)
            quad(STONE, a0, a1, H + 1.0, H + 4.2)
            box(STONE_2, a0 - 0.25, a1 + 0.25, H + 4.2, H + 4.6, -0.1, 0.3)
            c = (a0 + a1) / 2
            _window(quad, box, c, H + 1.6, H + 3.6, 1.3, 0)
            for (ya, yb) in ((2.2, 4.9), (6.5, 9.4), (11.0, 13.4)):
                _window(quad, box, c, ya, yb, 1.5, 1)
        for k, (r, h) in enumerate(((2.9, 1.0), (2.3, 1.0), (1.5, 0.9))):
            p.cyl(COPPER, (cx, H + 4.6 + sum(v[1] for v in ((2.9, 1.0), (2.3, 1.0), (1.5, 0.9))[:k]) + h / 2, cz), 1, r, h, seg=14)
        stick(p, BRASS, (cx, H + 7.5, cz), (cx, H + 9.6, cz), 0.12, 0.03)
    # The copper mansard and the flat behind it.
    ins, yt = 4.5, H + 5.0
    for (dx, dz) in ((0, -1), (0, 1), (-1, 0), (1, 0)):
        if dx == 0:
            zf = 0.0 if dz < 0 else PH_D
            pts = [(x0, H + 1.0, zf), (x1, H + 1.0, zf), (x1 - ins, yt, zf - dz * ins), (x0 + ins, yt, zf - dz * ins)]
        else:
            xf = x0 if dx < 0 else x1
            pts = [(xf, H + 1.0, 0.0), (xf, H + 1.0, PH_D), (xf - dx * ins, yt, PH_D - ins), (xf - dx * ins, yt, ins)]
        p.face(COPPER, pts, (dx, 0.8, dz))
    p.box(COPPER, x0 + ins, yt - 0.05, ins, x1 - ins, yt, PH_D - ins)


# 絹蔵 a silk storehouse on the canal landing: white plaster over a tiled dado, a tiled gable roof, the
# gable to the quay. Origin: mid-front on the building line, front facing -z. Shared: KURA.
KURA_W, KURA_D, KURA_H = 9.6, 11.0, 6.2
PLASTER_W = 'flat:#ece8dc'
TILE_DK = 'flat:#3a3d40'


def kura(p):
    x0, x1 = -KURA_W / 2, KURA_W / 2
    H = KURA_H
    for fi, (axis, at, out, a0, a1) in enumerate([('z', 0.0, -1, x0, x1), ('z', KURA_D, 1, x0, x1), ('x', x0, -1, 0.0, KURA_D), ('x', x1, 1, 0.0, KURA_D)]):
        quad, box, pt = _plane(p, axis, at, out)
        quad(GRANITE, a0, a1, 0, 0.4)
        quad(TILE_DK, a0, a1, 0.4, 1.9)
        # The dado's raised white joints (namako), as a square lattice.
        for y in (0.9, 1.4):
            box(PLASTER_W, a0, a1, y - 0.04, y + 0.04, 0, 0.03)
        a = a0 + 0.5
        while a < a1 - 0.2:
            box(PLASTER_W, a - 0.04, a + 0.04, 0.4, 1.9, 0, 0.03)
            a += 0.5
        box(PLASTER_W, a0, a1, 1.9, 2.05, 0, 0.06)
        quad(PLASTER_W, a0, a1, 2.05, H)
        if fi >= 2:
            for c in (a0 + (a1 - a0) * 0.3, a0 + (a1 - a0) * 0.7):
                box(PLASTER_W, c - 0.55, c + 0.55, 3.9, 5.0, 0, 0.12)
                box(DARK, c - 0.4, c + 0.4, 4.05, 4.85, 0.12, 0.14)
                for s in (-1, 1):
                    box('flat:#2c2f31', min(c + s * 0.42, c + s * 0.8), max(c + s * 0.42, c + s * 0.8), 4.0, 4.9, 0.1, 0.2)
    for zf, out in ((0.0, -1), (KURA_D, 1)):
        p.face(PLASTER_W, [(x0, H, zf), (x1, H, zf), (0, H + 2.5, zf)], (0, 0, out))
    # The front: a heavy plastered door under a tiled pent roof, a shuttered window in the gable.
    p.box(PLASTER_W, -1.5, 0.4, -0.16, 1.5, 3.1, 0)
    p.box(DARK, -1.05, 0.4, -0.18, 1.05, 2.7, -0.16)
    for s in (-1, 1):
        p.box('flat:#2c2f31', min(s * 1.08, s * 1.9), 0.45, -0.28, max(s * 1.08, s * 1.9), 2.75, -0.18)
    p.prism(TILE_DK, [(-0.02, 3.5), (-1.2, 3.15), (-1.2, 3.25), (-0.02, 3.62)], 'x', -2.2, 2.2)
    p.box(PLASTER_W, -0.6, 4.6, -0.12, 0.6, 5.7, 0)
    p.box(DARK, -0.42, 4.75, -0.14, 0.42, 5.55, -0.12)
    p.cyl(BRASS, (0, H + 1.2, -0.03), 2, 0.42, 0.05, seg=14)
    # The roof: dark tiles, a deep overhang, a ridge.
    ov = 0.7
    for s in (-1, 1):
        p.prism(TILE_DK, [(s * (KURA_W / 2 + ov), H - 0.2), (0, H + 2.75), (0, H + 3.0), (s * (KURA_W / 2 + ov), H + 0.05)], 'z', -ov, KURA_D + ov)
    p.box('flat:#2c2f31', -0.25, H + 2.95, -ov - 0.05, 0.25, H + 3.3, KURA_D + ov + 0.05)


# ── The Mio-gawa riverfront (2026-11-26): a lamp standard, boats, the beacon, the footbridges over the canal mouths ──
WOOD = 'flat:#5a4032'
WOOD_2 = 'flat:#7a5a40'
HULL_W = 'flat:#e9e6dc'
GLASS_D = 'flat:#2f4a5a'


def lampstd(p):
    """A bronze standard with three globes on a stone base: origin at its foot."""
    p.box(STONE, -0.35, 0.0, -0.35, 0.35, 0.5, 0.35)
    p.box(STONE_2, -0.42, 0.5, -0.42, 0.42, 0.6, 0.42)
    stick(p, BRONZE, (0, 0.6, 0), (0, 3.9, 0), 0.1, 0.06, seg=8)
    p.cyl(BRASS, (0, 0.7, 0), 1, 0.15, 0.2, seg=8)
    for (dx, dy) in ((0, 0.45), (-0.55, 0), (0.55, 0)):
        if dx:
            stick(p, BRONZE, (0, 3.55, 0), (dx, 3.7, 0), 0.04)
        p.cyl('light', (dx, 4.05 + dy, 0), 1, 0.2, 0.42, seg=8)
        p.cyl(BRONZE, (dx, 4.29 + dy, 0), 1, 0.08, 0.06, seg=6)


def _hull(p, mat, L, Wd, y0, y1, bow=2.4):
    """A hull along x, pointed at both ends: origin amidships on the waterline."""
    h, w = L / 2, Wd / 2
    p.box(mat, -h + bow, y0, -w, h - bow, y1, w)
    for s in (-1, 1):
        a, t = s * (h - bow), s * h
        for q in (-1, 1):
            p.face(mat, [(a, y0, q * w), (t, y0 + 0.25, 0), (t, y1 + 0.2, 0), (a, y1, q * w)], (s, 0, q))
        p.face(mat, [(a, y1, -w), (a, y1, w), (t, y1 + 0.2, 0), (t, y1 + 0.2, 0)], (0, 1, 0))
        p.face(mat, [(a, y0, -w), (a, y0, w), (t, y0 + 0.25, 0), (t, y0 + 0.25, 0)], (0, -1, 0))


def yakata(p):
    """A roofed pleasure boat (屋形船), 14 m: a dark timber hull, a long cabin of paper screens, lanterns under the eaves."""
    _hull(p, WOOD, 14.0, 3.2, -0.4, 0.55)
    p.box(WOOD_2, -4.6, 0.55, -1.45, 4.6, 0.62, 1.45)
    p.box('flat:#efe6cf', -4.2, 0.62, -1.3, 4.2, 2.0, 1.3)
    x = -4.2
    while x < 4.21:
        for q in (-1, 1):
            p.box(WOOD, x - 0.05, 0.62, q * 1.3 - 0.03, x + 0.05, 2.0, q * 1.3 + 0.03)
        x += 1.05
    for q in (-1, 1):
        p.box(WOOD, -4.2, 1.25, q * 1.32 - 0.02, 4.2, 1.31, q * 1.32 + 0.02)
    p.box('flat:#3a3f44', -4.7, 2.0, -1.7, 4.7, 2.12, 1.7)
    p.box('flat:#2e3236', -4.4, 2.12, -1.0, 4.4, 2.3, 1.0)
    x = -4.0
    while x < 4.01:
        for q in (-1, 1):
            p.cyl('light', (x, 1.78, q * 1.6), 1, 0.13, 0.3, seg=6)
        x += 1.0
    p.box(WOOD_2, -6.0, 0.55, -0.9, -4.7, 0.6, 0.9)
    p.box(WOOD_2, 4.7, 0.55, -0.9, 6.0, 0.6, 0.9)


def waterbus(p):
    """A low water bus, 18 m: a white hull with a blue band, a long glazed cabin, an open stern deck."""
    _hull(p, HULL_W, 18.0, 4.2, -0.4, 0.7, bow=3.0)
    p.box('flat:#1f5fae', -6.0, 0.25, -2.12, 6.0, 0.5, 2.12)
    p.box(GLASS_D, -6.5, 0.7, -1.8, 3.5, 1.9, 1.8)
    x = -6.5
    while x < 3.51:
        for q in (-1, 1):
            p.box(HULL_W, x - 0.06, 0.7, q * 1.8 - 0.03, x + 0.06, 1.9, q * 1.8 + 0.03)
        x += 1.25
    p.box(HULL_W, -6.7, 1.9, -1.95, 3.7, 2.05, 1.95)
    p.box('light', -6.3, 1.82, -1.6, 3.3, 1.86, 1.6)
    for q in (-1, 1):
        p.box('flat:#c9ccd0', 3.7, 1.45, q * 1.95 - 0.03, 6.0, 1.5, q * 1.95 + 0.03)
        for x in (3.7, 4.85, 6.0):
            p.box('flat:#c9ccd0', x - 0.03, 0.7, q * 1.95 - 0.03, x + 0.03, 1.5, q * 1.95 + 0.03)


def rowboat(p):
    _hull(p, WOOD_2, 4.4, 1.3, -0.15, 0.3, bow=1.1)
    for x in (-0.7, 0.6):
        p.box(WOOD, x - 0.12, 0.2, -0.6, x + 0.12, 0.24, 0.6)


def joyato(p):
    """A stone harbour lantern (常夜灯), 5.6 m: a stepped base, a tapering shaft, the light chamber, a hipped cap."""
    for i, (hw, y0, y1) in enumerate(((1.3, 0.0, 0.35), (1.05, 0.35, 0.7), (0.8, 0.7, 1.05))):
        p.box(GRANITE if i % 2 else GRANITE_2, -hw, y0, -hw, hw, y1, hw)
    for (a, b, ya, yb) in ((0.62, 0.5, 1.05, 2.4), (0.5, 0.42, 2.4, 3.6)):
        for (nx, nz) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if nx:
                p.face(STONE_2, [(nx * a, ya, -a), (nx * a, ya, a), (nx * b, yb, b), (nx * b, yb, -b)], (nx, 0, 0))
            else:
                p.face(STONE_2, [(-a, ya, nz * a), (a, ya, nz * a), (b, yb, nz * b), (-b, yb, nz * b)], (0, 0, nz))
    p.box(STONE, -0.7, 3.6, -0.7, 0.7, 3.78, 0.7)
    for (x, z) in ((-0.5, -0.5), (0.5, -0.5), (-0.5, 0.5), (0.5, 0.5)):
        p.box(STONE, x - 0.09, 3.78, z - 0.09, x + 0.09, 4.6, z + 0.09)
    p.box('light', -0.4, 3.8, -0.4, 0.4, 4.58, 0.4)
    p.box(STONE, -0.8, 4.6, -0.8, 0.8, 4.74, 0.8)
    for (nx, nz) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        if nx:
            p.face(GRANITE, [(nx * 0.9, 4.74, -0.9), (nx * 0.9, 4.74, 0.9), (0, 5.4, 0), (0, 5.4, 0)], (nx, 1, 0))
        else:
            p.face(GRANITE, [(-0.9, 4.74, nz * 0.9), (0.9, 4.74, nz * 0.9), (0, 5.4, 0), (0, 5.4, 0)], (0, 1, nz))
    p.box(BRONZE, -0.08, 5.35, -0.08, 0.08, 5.65, 0.08)


def moutharch(span):
    """The stone faces and balustrades of a footbridge 4 m wide over a canal mouth: an arch along x, origin mid-deck at street level."""
    def make(p):
        h, n = span / 2, 20
        spring, crown, belt = -2.75, -0.75, -0.35

        def arch(t):
            return spring + (crown - spring) * math.sqrt(max(0.0, 1 - (2 * t - 1) ** 2))
        for q in (-1, 1):
            z = q * 2.0
            for i in range(n):
                t0, t1 = i / n, (i + 1) / n
                x0, x1 = -h + span * t0, -h + span * t1
                y0, y1 = arch(t0), arch(t1)
                p.face(GRANITE if i % 2 else GRANITE_2, [(x0, y0, z), (x1, y1, z), (x1, belt, z), (x0, belt, z)], (0, 0, q))
                zr = q * 2.05
                p.face(STONE_2, [(x0, y0, zr), (x1, y1, zr), (x1, y1 + 0.35, zr), (x0, y0 + 0.35, zr)], (0, 0, q))
            za, zb = min(q * 1.7, q * 2.15), max(q * 1.7, q * 2.15)
            p.box(STONE, -h, belt, za, h, 0.0, zb)
            p.box(STONE_2, -h, 0.0, za + 0.1, h, 0.2, zb - 0.1)
            p.box(STONE, -h, 0.8, za + 0.06, h, 1.0, zb - 0.06)
            zm = (za + zb) / 2
            x = -h + 0.8
            while x < h - 0.7:
                p.box(STONE_2, x - 0.08, 0.2, zm - 0.08, x + 0.08, 0.8, zm + 0.08)
                x += 0.5
            for x in (-h, h):
                p.box(STONE, x - 0.4, 0.0, zm - 0.4, x + 0.4, 1.35, zm + 0.4)
                p.box(STONE_2, x - 0.47, 1.35, zm - 0.47, x + 0.47, 1.5, zm + 0.47)
            p.box(STONE, -0.3, crown, za - 0.05, 0.3, belt, zb + 0.05)
        for i in range(n):
            t0, t1 = i / n, (i + 1) / n
            x0, x1 = -h + span * t0, -h + span * t1
            p.face(STONE_2, [(x0, arch(t0), -2.0), (x0, arch(t0), 2.0), (x1, arch(t1), 2.0), (x1, arch(t1), -2.0)], (0, -1, 0))
    return make


PROPS = {'hall': (hall, W + 4), 'inside': (inside, W + 4), 'bridge': (bridge, 18), 'tower': (tower, 16), 'annex': (annex, W + 4), 'bank': (bank, BANK_W + 4), 'gbridge': (gbridge, 40), 'pubhall': (pubhall, PH_W + 4), 'kura': (kura, KURA_W + 2), 'lampstd': (lampstd, 2), 'yakata': (yakata, 15), 'waterbus': (waterbus, 19), 'rowboat': (rowboat, 5), 'joyato': (joyato, 3), 'arch14': (moutharch(14.0), 15), 'arch24': (moutharch(24.0), 25)}


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('exchange', [dict(id=k, w=w, gap=6.0) for k, (_, w) in PROPS.items()], build_hi, lambda v: None)
