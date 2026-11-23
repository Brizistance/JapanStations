# Builds Kawaminato University's side of Daigaku-mae's street (the 2026-11 rebuild): the brick campus
# wall along the main road, the red-brick main gate and its gatehouse, the side gate, the main library
# (a walk-in building: outside faces only, a real doorway), the lecture halls and the student cafeteria.
#
#   blender --background --python tools/blender/build_daigaku.py -- [--renders <dir>]
#
# Writes assets/buildings/daigaku.blend, public/models/buildings/daigaku.glb and
# src/stations/anchors/daigaku.ts. Frame: front at z = 0 facing -z, origin mid-frontage, +z into the
# lot (buildkit.py, kitakit.py). Nothing carries a name: the game letters the marked boards.
#
#   wall_12 wall_6 wall_3   the campus wall: brick on a granite plinth, piers every 3 m, stone coping
#   gate         the main gate, G_W wide: two great brick piers with lanterns, smaller piers either side
#                with a pedestrian gap each, the iron leaves swung back. `_pass` is the carriage way.
#   gatehouse    the porter's lodge behind the gate: brick, a hipped slate roof, a window to the gate.
#   sidegate     a side gate SG_W wide: two piers with lamps, iron leaves open. `_pass` its opening.
#   library      the main library, LB_W x LB_D: brick Romanesque, a central tower, an arched portal.
#                `_door` is the doorway (open to the inside, which the game builds); outside faces only.
#   hall_a hall_b  lecture halls: brick, three storeys, stone bands, a slate hipped roof.
#   shokudo      the student cafeteria: a 1960s concrete frame, a glass ground storey, brick infill.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403
from build_plaza import roof_plant  # noqa: E402

RENGA = 'flat:#9a5a43'      # the station's brick (specs.ts)
RENGA_DK = 'flat:#7a4433'
RENGA_LT = 'flat:#a8664c'
ISHI = 'flat:#d6ccb6'       # stone dressings
ISHI_DK = 'flat:#a79c86'
PLINTH = 'flat:#5a5450'
SLATE = 'flat:#3e4247'
SLATE_DK = 'flat:#2e3135'
IRON = 'flat:#1f2326'
COPPER = 'flat:#5f8f7a'
OAK = 'flat:#5a3a24'
CONCR = 'flat:#b9b6ac'

G_W, G_D = 16.0, 2.6
SG_W = 6.0
LB_W, LB_D, LB_H = 60.0, 34.0, 15.5
TW_W, TW_H = 14.0, 27.0
DOOR_W, DOOR_H = 4.4, 5.2


def semi(c, y, r, n=12):
    """A half circle (x, y) from left to right over the springing line y."""
    return [(c - r * math.cos(math.pi * k / n), y + r * math.sin(math.pi * k / n)) for k in range(n + 1)]


def archwin(p, c, y0, ys, w, z, out=-1, ring=0.22, glass=WINDOW, frame=FRAME):
    """A round-headed window on a front wall at z: sash from y0 to the springing ys, a half-round head,
    a stone ring round the head and a stone sill."""
    r = w / 2
    win(p, c - r, y0, c + r, ys, z, out, frame, glass)
    d0, d1 = (z, z + out * 0.06) if out < 0 else (z, z + 0.06)
    # The glass in the head, then the stone ring standing proud.
    pts = semi(c, ys, r - 0.06)
    p.face(glass if glass != WINDOW else WINDOW_DARK, [(x, y, z + out * 0.055) for x, y in pts], (0, 0, out), WINDOW)
    outer, inner = semi(c, ys, r + ring), semi(c, ys, r)
    for k in range(len(outer) - 1):
        poly = [outer[k], outer[k + 1], inner[k + 1], inner[k]]
        p.prism(ISHI, poly, 'z', min(d0, z + out * 0.12), max(d0, z + out * 0.12))
    p.box(ISHI, c - r - 0.15, y0 - 0.18, z + out * 0.14, c + r + 0.15, y0, z)
    del d1


def coursing(p, face, a0, a1, at, ys, mat=RENGA_DK, t=0.04):
    """Thin darker courses across a brick wall (they read as brick at a distance)."""
    for y in ys:
        slab(p, mat, face, a0, a1, y, y + 0.05, at, t)


# ═════════════════════════ The wall ═════════════════════════
def wall(p, s, v, r):
    w = v['w']
    x0, x1 = -w / 2, w / 2
    H = 2.3
    p.box(PLINTH, x0, 0, 0.0, x1, 0.45, 0.55)
    p.box(RENGA, x0, 0.45, 0.05, x1, H, 0.5)
    for y in (0.9, 1.35, 1.8):
        p.box(RENGA_DK, x0, y, 0.03, x1, y + 0.05, 0.52)
    p.box(ISHI, x0 - 0.02, H, -0.03, x1 + 0.02, H + 0.14, 0.58)
    # Piers at both ends and every 3 m between, standing proud on both faces.
    n = max(1, round(w / 3.0))
    for k in range(n + 1):
        c = x0 + k * w / n
        a, e = max(x0, c - 0.33), min(x1, c + 0.33)
        p.box(PLINTH, a - 0.02, 0, -0.1, e + 0.02, 0.5, 0.65)
        p.box(RENGA_LT, a, 0.5, -0.08, e, H + 0.45, 0.63)
        p.box(ISHI, a - 0.06, H + 0.45, -0.14, e + 0.06, H + 0.62, 0.69)
        p.prism(ISHI, [(-0.1, H + 0.62), (0.275, H + 0.85), (0.65, H + 0.62)], 'x', a - 0.02, e + 0.02)
    # Ivy on some stretches.
    for k in range(n):
        if r.random() < 0.35:
            c = x0 + (k + 0.5) * w / n
            hw = r.uniform(0.6, 1.2)
            p.box('flat:#3f5f34', c - hw, r.uniform(0.6, 1.2), -0.04, c + hw, H - 0.05, 0.05)
            p.box('flat:#4d6f3d', c - hw * 0.6, H - 0.6, -0.07, c + hw * 0.7, H + 0.1, 0.03)


# ═════════════════════════ The main gate ═════════════════════════
def gate_pier(p, c, hw, H, lantern_=True):
    p.box(PLINTH, c - hw - 0.08, 0, -hw - 0.08, c + hw + 0.08, 0.6, hw + 0.08 + 1.0)
    p.box(RENGA, c - hw, 0.6, -hw, c + hw, H, hw + 1.0)
    for y in [1.6 + 0.8 * k for k in range(int((H - 2) / 0.8))]:
        p.box(RENGA_DK, c - hw - 0.02, y, -hw - 0.02, c + hw + 0.02, y + 0.06, hw + 1.02)
    p.box(ISHI, c - hw - 0.04, 2.6, -hw - 0.04, c + hw + 0.04, 2.85, hw + 1.04)
    p.box(ISHI, c - hw - 0.16, H, -hw - 0.16, c + hw + 0.16, H + 0.35, hw + 1.16)
    pyramid(p, ISHI_DK, c - hw - 0.06, c + hw + 0.06, -hw - 0.06, hw + 1.06, H + 0.35, 0.5)
    if lantern_:
        y = H + 0.85
        p.box(IRON, c - 0.12, y - 0.1, 0.38, c + 0.12, y + 0.35, 0.62)
        p.box(IRON, c - 0.32, y + 0.35, 0.18, c + 0.32, y + 0.45, 0.82)
        p.box('light', c - 0.26, y + 0.45, 0.24, c + 0.26, y + 1.05, 0.76)
        p.box(IRON, c - 0.34, y + 1.05, 0.16, c + 0.34, y + 1.15, 0.84)
        pyramid(p, IRON, c - 0.3, c + 0.3, 0.2, 0.8, y + 1.15, 0.3)


def leaf(p, x0, x1, z0, z1, H):
    """An iron gate leaf swung open, as a run of bars between two rails."""
    L = math.hypot(x1 - x0, z1 - z0)
    n = max(3, int(L / 0.14))
    for k in range(n + 1):
        t = k / n
        x, z = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t
        top = H - 0.25 * math.sin(math.pi * t)
        p.box(IRON, x - 0.015, 0.1, z - 0.015, x + 0.015, top, z + 0.015)
        if k % 3 == 0:
            p.box(IRON, x - 0.035, top, z - 0.035, x + 0.035, top + 0.12, z + 0.035)
    for y in (0.2, 1.0, H - 0.4):
        for k in range(n):
            t0, t1 = k / n, (k + 1) / n
            p.box(IRON, x0 + (x1 - x0) * t0 - 0.02, y, z0 + (z1 - z0) * t0 - 0.02, x0 + (x1 - x0) * t1 + 0.02, y + 0.05, z0 + (z1 - z0) * t1 + 0.02)


def gate(p, s, v, r):
    big, small = 5.0, 7.6
    for sx in (-1, 1):
        gate_pier(p, sx * big, 0.75, 5.6)
        gate_pier(p, sx * small, 0.42, 3.2, lantern_=False)
        # The stretch between the small pier and the end of the piece: a low wall to meet the campus wall.
        a, e = sorted((sx * (small + 0.42), sx * G_W / 2))
        if e - a > 0.05:
            p.box(PLINTH, a, 0, 0, e, 0.45, 0.55)
            p.box(RENGA, a, 0.45, 0.05, e, 2.3, 0.5)
            p.box(ISHI, a, 2.3, -0.03, e, 2.44, 0.58)
        # Iron leaves swung back against the inside of the great piers; a wicket on the small gap.
        leaf(p, sx * 4.15, sx * 4.15, 1.0, 5.0, 2.6)
        leaf(p, sx * 6.3, sx * 6.4, 1.0, 2.2, 1.9)
        # The name plate on each great pier's face.
        board(p, 'plate_l' if sx < 0 else 'plate_r', 'f', sx * big - 0.38, sx * big + 0.38, 2.95, 4.95, -0.75, 'flat:#e6dcc6', 0.05)
    # A granite threshold across the carriage way, setts between.
    p.box(PLINTH, -4.25, 0, -0.1, 4.25, 0.03, 1.3)
    mark('_pass', 0, 0, 0, 8.5, 0)
    mark('_walk', 6.3, 0, 0, 1.36, 0)


def gatehouse(p, s, v, r):
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(PLINTH, x0, 0, 0, x1, 0.5, d)
    p.box(RENGA, x0 + 0.05, 0.5, 0.05, x1 - 0.05, h, d - 0.05)
    p.box(ISHI, x0, h - 0.3, -0.05, x1, h, d + 0.05)
    win(p, -1.3, 1.0, 1.3, 2.3, 0.0, -1, OAK)
    p.box(ISHI, -1.45, 0.85, -0.12, 1.45, 1.0, 0.0)
    winx(p, 1.0, 1.0, 2.6, 2.3, x0, -1, OAK)
    p.box(OAK, x1 + 0.0, 0, 1.2, x1 + 0.06, 2.2, 2.2)
    pyramid(p, SLATE, x0 - 0.4, x1 + 0.4, -0.4, d + 0.4, h, 1.6)
    p.box('light', -0.2, 2.6, -0.3, 0.2, 2.9, -0.06)
    board(p, 'name', 'f', -1.2, 1.2, 2.45, 2.75, 0.0, 'flat:#2a2019', 0.04)


def sidegate(p, s, v, r):
    for sx in (-1, 1):
        gate_pier(p, sx * 2.25, 0.45, 3.4)
        leaf(p, sx * 1.75, sx * 1.75, 0.6, 2.3, 2.0)
        a, e = sorted((sx * 2.7, sx * SG_W / 2))
        if e - a > 0.05:
            p.box(PLINTH, a, 0, 0, e, 0.45, 0.55)
            p.box(RENGA, a, 0.45, 0.05, e, 2.3, 0.5)
            p.box(ISHI, a, 2.3, -0.03, e, 2.44, 0.58)
    board(p, 'plate', 'f', -2.55, -1.95, 1.4, 2.9, -0.45, 'flat:#e6dcc6', 0.05)
    mark('_pass', 0, 0, 0, 3.6, 0)


# ═════════════════════════ The library ═════════════════════════
def wallq(p, face, a0, a1, y0, y1, at, mat=RENGA):
    quad(p, mat, face, a0, a1, y0, y1, at)


def library(p, s, v, r):
    w, d, H = LB_W, LB_D, LB_H
    x0, x1 = -w / 2, w / 2
    zf = 2.0                 # the wings' front wall; the tower stands forward of it at z 0
    tx0, tx1 = -TW_W / 2, TW_W / 2
    dx0, dx1 = -DOOR_W / 2, DOOR_W / 2
    # ── The wings: outside faces only (front, back, ends), a plinth, stone bands, a cornice ──
    for a, e in ((x0, tx0), (tx1, x1)):
        wallq(p, 'f', a, e, 0, H, zf)
        p.box(PLINTH, a, 0, zf - 0.12, e, 0.9, zf)
        for y in (5.0, 10.5):
            p.box(ISHI, a, y, zf - 0.18, e, y + 0.3, zf)
        p.box(ISHI, a, H - 0.5, zf - 0.4, e, H, zf)
        coursing(p, 'f', a, e, zf, [1.6 + 0.9 * k for k in range(15) if not (4.6 < 1.6 + 0.9 * k < 5.4 or 10.1 < 1.6 + 0.9 * k < 10.9)])
        # Pilasters on the bay lines; ground floor square windows, the reading room's tall arches, attic windows.
        bays = rows(a + 0.6, e - 0.6, 4.0)
        bw = (e - a - 1.2) / len(bays)
        for k in range(len(bays) + 1):
            c = a + 0.6 + k * bw
            p.box(RENGA_LT, c - 0.35, 0.9, zf - 0.22, c + 0.35, H - 0.5, zf)
        for c in bays:
            win(p, c - 0.8, 1.6, c + 0.8, 4.2, zf, -1, FRAME)
            p.box(ISHI, c - 0.95, 1.42, zf - 0.14, c + 0.95, 1.6, zf)
            archwin(p, c, 6.0, 8.9, 2.0, zf)
            archwin(p, c, 11.3, 13.4, 1.3, zf, ring=0.16)
    wallq(p, 'b', x0, x1, 0, H, d)
    for face, at in (('l', x0), ('r', x1)):
        wallq(p, face, zf, d, 0, H, at)
        for y in (5.0, 10.5):
            slab(p, ISHI, face, zf, d, y, y + 0.3, at, 0.18)
        slab(p, PLINTH, face, zf, d, 0, 0.9, at, 0.12)
        slab(p, ISHI, face, zf, d, H - 0.5, H, at, 0.4)
        for c in rows(zf + 1, d - 1, 4.0):
            winx(p, c - 0.8, 1.6, c + 0.8, 4.2, at, -1 if face == 'l' else 1, FRAME)
            winx(p, c - 1.0, 6.0, c + 1.0, 9.6, at, -1 if face == 'l' else 1, FRAME)
            winx(p, c - 0.65, 11.3, c + 0.65, 13.6, at, -1 if face == 'l' else 1, FRAME)
    for c in rows(x0 + 1, x1 - 1, 4.0):
        win(p, c - 0.8, 1.6, c + 0.8, 4.2, d, 1, FRAME)
        win(p, c - 1.0, 6.0, c + 1.0, 9.6, d, 1, FRAME)
    slab(p, PLINTH, 'b', x0, x1, 0, 0.9, d, 0.12)
    slab(p, ISHI, 'b', x0, x1, H - 0.5, H, d, 0.4)
    # A slate hipped roof over the wings (the tower rises through it).
    p.prism(SLATE, [(zf - 0.4, H), (zf + 5.5, H + 4.2), (d - 5.5, H + 4.2), (d + 0.4, H)], 'x', x0 - 0.4, x1 + 0.4)
    for sx in (-1, 1):
        e = sx * (w / 2 + 0.4)
        p.face(SLATE, [(e, H, zf - 0.4), (e, H, d + 0.4), (e - sx * 5.0, H + 4.2, d - 5.5), (e - sx * 5.0, H + 4.2, zf + 5.5)], (sx, 0.6, 0))
    for c in rows(x0 + 4, x1 - 4, 7.0):
        if abs(c) > TW_W / 2 + 1.5:
            p.box(SLATE_DK, c - 0.7, H + 0.8, zf + 1.6, c + 0.7, H + 2.2, zf + 2.6)
            win(p, c - 0.45, H + 1.0, c + 0.45, H + 2.0, zf + 1.6, -1, FRAME)
    # ── The tower: forward to z 0, up to TW_H; the portal in its foot ──
    tz1 = zf + 8.0
    wallq(p, 'f', tx0, dx0 - 0.9, 0, TW_H, 0.0)
    wallq(p, 'f', dx1 + 0.9, tx1, 0, TW_H, 0.0)
    wallq(p, 'f', dx0 - 0.9, dx1 + 0.9, DOOR_H + 2.4, TW_H, 0.0)
    for face, at in (('l', tx0), ('r', tx1)):
        wallq(p, face, 0.0, zf, 0, H, at)
        wallq(p, face, 0.0, tz1, H, TW_H, at)
    wallq(p, 'b', tx0, tx1, H, TW_H, tz1)
    p.box(PLINTH, tx0, 0, -0.14, tx1, 0.9, 0.0)
    for y in (5.0, 10.5, 19.6):
        p.box(ISHI, tx0 - 0.1, y, -0.2, tx1 + 0.1, y + 0.32, 0.0)
    for sx in (-1, 1):
        c = sx * (TW_W / 2 - 0.5)
        p.box(ISHI, c - 0.5, 0, -0.3, c + 0.5, TW_H + 0.4, 0.4)
    # The portal: a deep round arch of stone in a brick frame, the opening real. Its reveals are faces
    # looking into the opening; the vestibule beyond is the game's.
    pr = 1.1   # how far the frame stands out
    for sx in (-1, 1):
        a = sx * (DOOR_W / 2 + 0.9)
        p.box(ISHI, min(a, sx * DOOR_W / 2), 0, -pr, max(a, sx * DOOR_W / 2), DOOR_H, 0.0)
    outer, inner = semi(0, DOOR_H, DOOR_W / 2 + 0.9), semi(0, DOOR_H, DOOR_W / 2)
    for k in range(len(outer) - 1):
        p.prism(ISHI, [outer[k], outer[k + 1], inner[k + 1], inner[k]], 'z', -pr, 0.0)
    # Spandrels over the arch to a cornice on the frame.
    top = DOOR_H + DOOR_W / 2 + 1.3
    for sx in (-1, 1):
        poly = [(sx * (DOOR_W / 2 + 0.9), DOOR_H)] + [(sx * q[0] if sx > 0 else q[0], q[1]) for q in (semi(0, DOOR_H, DOOR_W / 2 + 0.9)[::-1] if sx > 0 else semi(0, DOOR_H, DOOR_W / 2 + 0.9))]
        del poly
    p.box(RENGA_DK, dx0 - 0.9, DOOR_H + DOOR_W / 2 + 0.9, -pr, dx1 + 0.9, top, 0.0)
    for sx in (-1, 1):
        # The corners between the arch ring and the frame's top, filled in brick.
        for k in range(6):
            t = (k + 0.5) / 6
            ang = math.pi / 2 * t
            xa = (DOOR_W / 2 + 0.9) * math.cos(ang)
            ya = DOOR_H + (DOOR_W / 2 + 0.9) * math.sin(ang)
            xs = sorted((sx * xa, sx * (DOOR_W / 2 + 0.9)))
            p.box(RENGA_DK, xs[0], ya, -pr, xs[1], DOOR_H + DOOR_W / 2 + 0.9, 0.0)
    p.box(ISHI, dx0 - 1.1, top, -pr - 0.2, dx1 + 1.1, top + 0.35, 0.0)
    board(p, 'name', 'f', dx0 - 0.6, dx1 + 0.6, top + 0.55, top + 1.35, 0.0, 'flat:#e6dcc6', 0.06)
    # Reveals of the opening through the wall thickness (0.0 … zf) and the soffit.
    for sx in (-1, 1):
        p.face(ISHI, [(sx * DOOR_W / 2, 0, -pr), (sx * DOOR_W / 2, 0, zf), (sx * DOOR_W / 2, DOOR_H, zf), (sx * DOOR_W / 2, DOOR_H, -pr)], (-sx, 0, 0))
    for k in range(len(inner) - 1):
        (xa, ya), (xb, yb) = inner[k], inner[k + 1]
        p.face(ISHI, [(xa, ya, -pr), (xb, yb, -pr), (xb, yb, zf), (xa, ya, zf)], (-(xa + xb) / 2, -((ya + yb) / 2 - DOOR_H), 0))
    # Lamps either side of the portal.
    for sx in (-1, 1):
        c = sx * (DOOR_W / 2 + 1.6)
        p.box(IRON, c - 0.1, 3.0, -pr - 0.5, c + 0.1, 3.1, -pr)
        p.box('light', c - 0.2, 2.4, -pr - 0.7, c + 0.2, 3.0, -pr - 0.3)
        p.box(IRON, c - 0.24, 3.0, -pr - 0.74, c + 0.24, 3.08, -pr - 0.26)
    # Steps up to the portal? No: the floor runs level in (the playbook: no plinth across the floor).
    # The tower's upper storeys: tall paired arches, a clock roundel, a belfry stage, a pyramid roof.
    for c in (-2.4, 2.4):
        archwin(p, c, 12.0, 17.0, 1.6, 0.0)
    p.box(ISHI_DK, -1.9, 20.6, -0.2, 1.9, 24.4, 0.0)
    mark('clock', 0.0, 22.5, -0.24, 3.2, 3.2)
    for face, at, sgn in (('f', 0.0, -1), ('b', tz1, 1)):
        for c in (-4.0, 0.0, 4.0):
            p.box(DARK, c - 0.7, 24.8, at + sgn * 0.01, c + 0.7, 26.4, at + sgn * 0.02)
    for face, at in (('l', tx0), ('r', tx1)):
        for c in (2.0, 5.0, 8.0):
            slab(p, DARK, face, c - 0.6, c + 0.6, 24.8, 26.4, at, 0.02)
    p.box(ISHI, tx0 - 0.3, TW_H, -0.3, tx1 + 0.3, TW_H + 0.5, tz1 + 0.3)
    pyramid(p, COPPER, tx0 - 0.2, tx1 + 0.2, -0.2, tz1 + 0.2, TW_H + 0.5, 6.0)
    p.box(IRON, -0.05, TW_H + 6.4, tz1 / 2 - 0.05, 0.05, TW_H + 8.0, tz1 / 2 + 0.05)
    mark('_door', 0, 0, 0, DOOR_W, DOOR_H)
    mark('_tower', 0, 0, tz1 / 2, TW_W, tz1)
    mark('_front', 0, 0, zf, w, d - zf)
    backs(p, w, d, [5.0, 10.5, H], r, sides=(), back=True)


# ═════════════════════════ Lecture halls and the cafeteria ═════════════════════════
def hall(p, s, v, r):
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(RENGA, x0, 0, 0, x1, h, d)
    p.box(PLINTH, x0 - 0.05, 0, -0.12, x1 + 0.05, 0.8, d + 0.05)
    fl = [0.8, 4.6, 8.4]
    for y in fl[1:]:
        p.box(ISHI, x0 - 0.04, y - 0.2, -0.16, x1 + 0.04, y + 0.05, d + 0.04)
    p.box(ISHI, x0 - 0.3, h - 0.45, -0.4, x1 + 0.3, h, d + 0.3)
    bays = rows(x0 + 0.8, x1 - 0.8, 3.6)
    door_c = v.get('door', 0.0)
    for c in bays:
        for k, y in enumerate(fl):
            if k == 0 and abs(c - door_c) < 2.6:
                continue
            if k == 2 and v.get('round'):
                archwin(p, c, y + 0.9, y + 2.5, 1.5, 0.0, ring=0.16)
            else:
                win(p, c - 0.75, y + 0.8, c + 0.75, y + 3.0, 0.0, -1, FRAME)
                p.box(ISHI, c - 0.9, y + 3.0, -0.12, c + 0.9, y + 3.25, 0.0)
    for c in rows(x0 + 0.8, x1 - 0.8, 3.6):
        p.box(RENGA_LT, c - 1.8 - 0.25, 0.8, -0.14, c - 1.8 + 0.25, h - 0.45, 0.0)
    # The entrance: a stone porch with two columns, a pediment, the doors.
    c = door_c
    p.box(ISHI, c - 2.6, 0, -2.4, c + 2.6, 0.18, 0.0)
    for sx in (-1, 1):
        p.cyl(ISHI, (c + sx * 2.1, 2.0, -2.0), 1, 0.25, 3.8, seg=10)
    p.box(ISHI, c - 2.6, 3.9, -2.4, c + 2.6, 4.4, 0.0)
    p.prism(ISHI, [(c - 2.7, 4.4), (c, 5.4), (c + 2.7, 4.4)], 'z', -2.45, 0.0)
    doors(p, c, 0.18, 0.0, 2.2, 2.8, OAK)
    board(p, 'name', 'f', c - 1.8, c + 1.8, 3.95, 4.35, -2.4, 'flat:#e6dcc6', 0.04)
    for sx in (-1, 1):
        p.box('light', c + sx * 1.3 - 0.12, 3.2, -0.3, c + sx * 1.3 + 0.12, 3.6, -0.06)
    # Slate hipped roof.
    rh = 3.2
    p.prism(SLATE, [(-0.35, h), (rh * 1.3, h + rh), (d - rh * 1.3, h + rh), (d + 0.35, h)], 'x', x0 - 0.35, x1 + 0.35)
    for sx in (-1, 1):
        e = sx * (w / 2 + 0.35)
        p.face(SLATE, [(e, h, -0.35), (e, h, d + 0.35), (e - sx * rh * 1.3, h + rh, d - rh * 1.3), (e - sx * rh * 1.3, h + rh, rh * 1.3)], (sx, 0.6, 0))
    backs(p, w, d, fl[1:] + [h], r, sides=(-1, 1), back=True)


def shokudo(p, s, v, r):
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    # Ground storey: glass between concrete columns, warm inside.
    p.box(CONCR, x0, 0, 1.2, x1, 4.2, d)
    for c in rows(x0, x1, 5.0) + [x0 + 0.3, x1 - 0.3]:
        p.box(CONCR, c - 0.3, 0, -0.3, c + 0.3, h, 0.3)
    quad(p, 'windowDim', 'f', x0 + 0.3, x1 - 0.3, 0.2, 3.9, 1.19, col=WARM)
    for c in rows(x0 + 0.3, x1 - 0.3, 2.5):
        p.box(FRAME, c - 0.03, 0.2, 1.1, c + 0.03, 3.9, 1.19)
    p.box(CONCR, x0 - 0.2, 4.2, -1.5, x1 + 0.2, 4.6, 1.3)
    p.box('light', x0 + 0.5, 4.16, -1.2, x1 - 0.5, 4.2, -0.9)
    doors(p, v.get('door', 0.0), 0, 1.15, 3.0, 2.6, ALU)
    # Upper storey: brick infill with a strip of windows, a deep concrete fascia.
    p.box(RENGA, x0 + 0.3, 4.6, 0.4, x1 - 0.3, h - 0.8, d)
    quad(p, WINDOW, 'f', x0 + 0.6, x1 - 0.6, 5.4, 7.0, 0.39)
    for c in rows(x0 + 0.6, x1 - 0.6, 1.8):
        p.box(FRAME, c - 0.03, 5.4, 0.3, c + 0.03, 7.0, 0.39)
    p.box(CONCR, x0 - 0.3, h - 0.8, -0.4, x1 + 0.3, h, d + 0.2)
    board(p, 'name', 'f', x0 + 2.0, x0 + 12.0, h - 0.7, h - 0.1, -0.4, 'flat:#f4f1e8', 0.04)
    roof_plant(p, x0, x1, h, 1.0, d - 1.0, seed=v['seed'])
    backs(p, w, d, [4.6, h], r, sides=(-1, 1), back=True)


def auditorium(p, s, v, r):
    """The auditorium closing the ginkgo avenue: brick wings with tall arched windows either side of a
    clock tower; a deep pointed-arch porch in the tower's foot, oak doors at its back (not walked into)."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    T, TH, zt = 12.0, 34.0, -2.5          # the tower's width and height, its front forward of the wings
    tx0, tx1 = -T / 2, T / 2
    # The wings: solid brick, a plinth, stone bands, the hall's tall arched windows, a cornice.
    p.box(RENGA, x0, 0, 0, x1, h, d)
    p.box(PLINTH, x0 - 0.06, 0, -0.12, x1 + 0.06, 1.0, d + 0.06)
    for y in (1.0, 9.8):
        p.box(ISHI, x0 - 0.05, y, -0.16, x1 + 0.05, y + 0.3, d + 0.05)
    p.box(ISHI, x0 - 0.4, h - 0.6, -0.45, x1 + 0.4, h, d + 0.4)
    for a, e in ((x0, tx0), (tx1, x1)):
        for c in rows(a + 0.8, e - 0.8, 3.4):
            archwin(p, c, 2.4, 8.0, 1.8, 0.0)
            archwin(p, c, 10.8, 12.0, 1.1, 0.0, ring=0.14)
        for c in rows(a + 0.8, e - 0.8, 3.4)[:-1]:
            p.box(RENGA_LT, c + 1.45, 1.0, -0.18, c + 1.95, h - 0.6, 0.0)
    for face, at in (('l', x0), ('r', x1)):
        for c in rows(1.0, d - 1.0, 3.4):
            winx(p, c - 0.9, 2.4, c + 0.9, 8.6, at, -1 if face == 'l' else 1, FRAME)
    # Hipped slate roof over the wings.
    rh = 4.0
    p.prism(SLATE, [(-0.45, h), (rh * 1.2, h + rh), (d - rh * 1.2, h + rh), (d + 0.45, h)], 'x', x0 - 0.45, x1 + 0.45)
    for sx in (-1, 1):
        e = sx * (w / 2 + 0.45)
        p.face(SLATE, [(e, h, -0.45), (e, h, d + 0.45), (e - sx * rh * 1.2, h + rh, d - rh * 1.2), (e - sx * rh * 1.2, h + rh, rh * 1.2)], (sx, 0.6, 0))
    # The tower: forward of the wings, to TH; corner buttresses in stone-capped brick.
    p.box(RENGA, tx0, 0, zt, tx1, TH, 6.0)
    p.box(PLINTH, tx0 - 0.08, 0, zt - 0.14, tx1 + 0.08, 1.0, 6.0)
    for y in (9.8, 19.6, 27.2):
        p.box(ISHI, tx0 - 0.1, y, zt - 0.2, tx1 + 0.1, y + 0.34, 6.1)
    for sx in (-1, 1):
        c = sx * (T / 2 - 0.4)
        p.box(RENGA_DK, c - 0.6, 0, zt - 0.9, c + 0.6, TH + 1.2, zt + 0.6)
        p.box(ISHI, c - 0.66, TH + 1.2, zt - 0.96, c + 0.66, TH + 1.5, zt + 0.66)
    # The porch: a tall pointed arch cut deep into the tower's front (stepped faces), doors at its back.
    aw, ah, ad = 5.2, 9.0, 2.2
    p.box(SLATE_DK, -aw / 2, 0, zt - 0.02, aw / 2, ah, zt + 0.02 + 0.001)
    for k, (hw, y0) in enumerate(((aw / 2, ah), (aw / 2 - 0.5, ah + 1.0), (aw / 2 - 1.2, ah + 1.8), (aw / 2 - 2.0, ah + 2.3))):
        p.box(ISHI, -hw - 0.35, y0 - (0.0 if k == 0 else 1.0), zt - 0.12, -hw, y0, zt)
        p.box(ISHI, hw, y0 - (0.0 if k == 0 else 1.0), zt - 0.12, hw + 0.35, y0, zt)
    p.box(ISHI, -aw / 2 - 0.35, 0, zt - 0.12, -aw / 2, ah, zt)
    p.box(ISHI, aw / 2, 0, zt - 0.12, aw / 2 + 0.35, ah, zt)
    p.box(ISHI, -aw / 2 - 0.6, 0, zt - ad, aw / 2 + 0.6, 0.2, zt)
    doors(p, 0, 0.2, zt + 0.03 - 0.0, 3.2, 4.0, OAK)
    p.box('windowDim', -aw / 2 + 0.3, 4.6, zt + 0.0, aw / 2 - 0.3, ah - 0.2, zt + 0.03)
    for c in (-1.2, 0.0, 1.2):
        p.box(FRAME, c - 0.04, 4.6, zt - 0.01, c + 0.04, ah - 0.2, zt + 0.0)
    board(p, 'name', 'f', -3.4, 3.4, 11.6, 12.4, zt, 'flat:#e6dcc6', 0.06)
    for sx in (-1, 1):
        p.box('light', sx * 3.4 - 0.15, 3.4, zt - 0.4, sx * 3.4 + 0.15, 3.9, zt - 0.1)
    # Upper tower: tall paired windows, the clock, a belfry stage, a copper pyramid with a finial.
    for c in (-2.2, 2.2):
        archwin(p, c, 14.0, 18.6, 1.6, zt)
    p.box(ISHI_DK, -2.3, 21.2, zt - 0.2, 2.3, 25.6, zt)
    mark('clock', 0.0, 23.4, zt - 0.24, 3.8, 3.8)
    for face, at, sgn in (('f', zt, -1), ('b', 6.0, 1)):
        for c in (-3.2, 0.0, 3.2):
            p.box(DARK, c - 0.8, 28.2, at + sgn * 0.01, c + 0.8, 32.4, at + sgn * 0.02)
    for face, at in (('l', tx0), ('r', tx1)):
        for c in (0.0, 3.0):
            slab(p, DARK, face, c - 0.6, c + 0.6, 28.2, 32.4, at, 0.02)
    p.box(ISHI, tx0 - 0.3, TH, zt - 0.3, tx1 + 0.3, TH + 0.5, 6.3)
    pyramid(p, COPPER, tx0 - 0.2, tx1 + 0.2, zt - 0.2, 6.2, TH + 0.5, 7.5)
    p.box(IRON, -0.05, TH + 7.8, (zt + 6.0) / 2 - 0.05, 0.05, TH + 10.0, (zt + 6.0) / 2 + 0.05)
    mark('_tower', 0, 0, (zt + 6.0) / 2, T, 6.0 - zt)
    backs(p, w, d, [9.8, h], r, sides=(-1, 1), back=True)


STYLES = {'wall': wall, 'gate': gate, 'gatehouse': gatehouse, 'sidegate': sidegate, 'library': library, 'hall': hall, 'shokudo': shokudo, 'auditorium': auditorium}


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(sum(map(ord, v['id'])) * 13)
    STYLES[v['style']](body, signs, v, r)
    return body, signs


def build_lo(v):
    return None


PIECES = [
    dict(id='wall_12', style='wall', w=12.0, d=0.7, h=2.8),
    dict(id='wall_6', style='wall', w=6.0, d=0.7, h=2.8),
    dict(id='wall_3', style='wall', w=3.0, d=0.7, h=2.8),
    dict(id='gate', style='gate', w=G_W, d=G_D, h=6.4),
    dict(id='gatehouse', style='gatehouse', w=5.0, d=4.0, h=3.6),
    dict(id='sidegate', style='sidegate', w=SG_W, d=1.5, h=3.8),
    dict(id='library', style='library', w=LB_W, d=LB_D, h=LB_H, gap=8.0),
    dict(id='hall_a', style='hall', w=38.0, d=22.0, h=12.6, door=0.0, seed=3, gap=6.0),
    dict(id='hall_b', style='hall', w=30.0, d=20.0, h=12.6, door=-5.4, round=True, seed=4, gap=6.0),
    dict(id='shokudo', style='shokudo', w=32.0, d=22.0, h=8.6, door=-6.0, seed=5),
    dict(id='auditorium', style='auditorium', w=44.0, d=22.0, h=14.5, seed=6, gap=8.0),
]


if __name__ == '__main__':
    # `--only id,id` builds just those pieces, for close renders (do not keep that .glb).
    _a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if '--only' in _a:
        _keep = _a[_a.index('--only') + 1].split(',')
        PIECES = [q for q in PIECES if q['id'] in _keep]
    run('daigaku', PIECES, build_hi, build_lo)
    write_anchors('daigaku')
