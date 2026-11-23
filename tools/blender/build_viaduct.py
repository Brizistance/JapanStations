# Builds the AR Main Line's viaduct through Kita-Ōdōri, in pieces laid end to end along x:
# brick arch bays with a shop in each face, bays with a walkway through, bays carrying the
# station's platforms and canopies, and steel girder bridges over the streets.
#
#   blender --background --python tools/blender/build_viaduct.py -- [--renders <dir>]
#
# Writes assets/buildings/viaduct.blend, public/models/buildings/viaduct.glb and
# src/stations/anchors/viaduct.ts. Frame and helpers: buildkit.py, kitakit.py.
#
# Every piece is VD deep: its front (z = 0) is the viaduct's north face, z = VD its south face.
# Rail level is RL. Four tracks at TZ; in the station bays two island platforms lie between them.
#
#   a7 a8 a9     arch bays 7, 8 and 9 m long: a shop under the arch in each face.
#   s7 s8 s9     the same, shuttered (stores and workshops).
#   p8           a bay with a public walkway right through it (PASS wide).
#   st8 stp8     station bays: platforms, canopies; stp8 has the walkway.
#   pf_<id>      any of the pieces with the platforms carried on over it (the platforms are 12 cars long).
#   hm8 hw8 he8 hl8 ho8   Kawaminato Station's five middle bays, hollow where the station is (the game
#                builds the inside: src/stations/kawaminato.ts). hm8: the walkway below, the mezzanine
#                above HALL_Y, the heads of both platform stairs' wells. hw8: shops below, the west stair's
#                well. he8: the east stair's well, the bridge door in the south face. hl8: the lift's hole.
#                ho8: the free hall, an open arch in each face.
#   g12 g16 g24  girder bridges: abutments ABUT thick at each end, GC clear under the girders.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

VD, RL = 26.0, 9.0
TZ = [2.6, 11.2, 14.8, 23.4]
PF = [(4.2, 9.6), (16.4, 21.8)]
PASS, ABUT, GC = 5.6, 1.0, 5.0
FACE = 0.9          # how deep the arches are cut into each face
PIER = 1.0
HALL_Y = 5.7        # the mezzanine's structure: solid below it in hm8 and hw8, hollow above
WELL = (17.8, 20.4)  # the platform stairs' wells, down the middle of the south island
LIFT_Z = (17.9, 20.3)
DOOR = (-3.5, -0.5, 5.85, 8.0)   # the bridge door in he8's south face: x in the bay, y
MORTAR = 'flat:#7a4334'
COPING = 'flat:#b9b3a6'
BALLAST = 'flat:#5a554e'
RAIL = 'flat:#6b6660'
GIRDER = 'flat:#4f6b5a'
GIRDER_DK = 'flat:#3f5648'
TILEW = 'flat:#e6e2d6'


def tiles(x0, x1, z0, z1, holes):
    """Rectangles (xa, xb, za, zb) covering x0 … x1, z0 … z1 less the holes (xa, xb, za, zb)."""
    xs = sorted({x0, x1} | {min(max(v, x0), x1) for h in holes for v in h[:2]})
    out = []
    for xa, xb in zip(xs, xs[1:]):
        if xb - xa < 1e-6:
            continue
        z = z0
        for za, zb in sorted((max(h[2], z0), min(h[3], z1)) for h in holes if h[0] < (xa + xb) / 2 < h[1] and h[2] < z1 and h[3] > z0):
            if za - z > 1e-6:
                out.append((xa, xb, z, za))
            z = max(z, zb)
        if z1 - z > 1e-6:
            out.append((xa, xb, z, z1))
    return out


def track(p, x0, x1, ballast=True, holes=()):
    if ballast:
        for xa, xb, za, zb in tiles(x0, x1, 0.9, VD - 0.9, holes):
            p.box(BALLAST, xa, RL - 0.4, za, xb, RL - 0.19, zb)
    for c in TZ:
        for dz in (-0.535, 0.535):
            p.box(RAIL, x0, RL - 0.19, c + dz - 0.035, x1, RL, c + dz + 0.035)   # rail head at RL: the game's trains run on these


def wires(p, x0, x1, portal=True):
    for c in TZ:
        p.box(DARK, x0, RL + 3.92, c - 0.015, x1, RL + 3.95, c + 0.015)   # contact wire at the game's WIRE_H (render/track.ts)
        p.box(DARK, x0, RL + 5.02, c - 0.015, x1, RL + 5.05, c + 0.015)
    if portal:
        m = (x0 + x1) / 2
        for z in (0.45, VD - 0.45):
            p.box(STEEL, m - 0.12, RL - 0.4, z - 0.12, m + 0.12, RL + 6.8, z + 0.12)
        p.box(STEEL, m - 0.1, RL + 6.3, 0.45, m + 0.1, RL + 6.6, VD - 0.45)
        p.box(STEEL, m - 0.06, RL + 6.9, 0.45, m + 0.06, RL + 7.0, VD - 0.45)
        for c in TZ:
            p.box(STEEL, m - 0.03, RL + 5.05, c - 0.03, m + 0.03, RL + 6.3, c + 0.03)


def parapets(p, x0, x1, mat=BRICK, holes=()):
    for z0, z1 in ((0.0, 0.4), (VD - 0.4, VD)):
        p.box(mat, x0, RL - 0.4, z0, x1, RL + 0.9, z1)
        p.box(COPING, x0, RL + 0.9, z0 - 0.06, x1, RL + 1.05, z1 + 0.06)
    for xa, xb, za, zb in tiles(x0, x1, -0.25, VD + 0.25, holes):
        p.box(COPING, xa, RL - 0.85, za, xb, RL - 0.4, zb)
    for z in (1.0, VD - 1.25):   # cable troughs
        p.box(CONC, x0, RL - 0.4, z, x1, RL - 0.02, z + 0.25)


def platforms(p, x0, x1, holes=(), col=True, bench=True, frame=True):
    """Both islands. `holes` are cut in them (stair wells, the lift); col, bench and frame are the south island's."""
    m = (x0 + x1) / 2
    for k, (a, b_) in enumerate(PF):
        for xa, xb, za, zb in tiles(x0, x1, a, b_, holes):
            p.box(CONC, xa, RL - 0.4, za, xb, RL + 1.05, zb)
            p.box('flat:#cfcbc0', xa, RL + 1.05, za, xb, RL + 1.1, zb)
        south = k == 1
        for e in (a + 0.75, b_ - 1.05):
            p.box('flat:#e6b800', x0, RL + 1.1, e, x1, RL + 1.115, e + 0.3)
        for e in (a, b_ - 0.12):
            p.box(WHITE, x0, RL + 1.1, e, x1, RL + 1.112, e + 0.12)
        # A canopy on a row of columns down the middle: a shallow butterfly roof, lights under it.
        c = (a + b_) / 2
        if col or not south:
            p.box('flat:#5d6a72', m - 0.14, RL + 1.1, c - 0.14, m + 0.14, RL + 4.4, c + 0.14)
        p.box('flat:#5d6a72', m - 0.1, RL + 4.3, a - 0.6, m + 0.1, RL + 4.55, b_ + 0.6)
        for s in (-1, 1):
            e = a - 0.9 if s < 0 else b_ + 0.9
            p.face('flat:#d7dadc', [(x0, RL + 4.55, c), (x1, RL + 4.55, c), (x1, RL + 5.05, e), (x0, RL + 5.05, e)], (0, 1, 0))
            p.face('flat:#b9bec2', [(x0, RL + 4.5, c), (x1, RL + 4.5, c), (x1, RL + 5.0, e), (x0, RL + 5.0, e)], (0, -1, 0))
            p.box('flat:#5d6a72', x0, RL + 4.92, min(e, e - s * 0.12), x1, RL + 5.12, max(e, e - s * 0.12))
        p.box('light', m - 2.2, RL + 4.38, c - 0.08, m + 2.2, RL + 4.42, c + 0.08)
        # A bench and a sign frame hanging from the canopy (the game letters it when the line is built).
        if bench or not south:
            p.box('flat:#3f6a8a', m + 1.5, RL + 1.1, c - 0.25, m + 3.1, RL + 1.55, c + 0.25)
        if frame or not south:
            p.box(DARK, m - 3.2, RL + 3.5, c - 0.05, m - 1.4, RL + 4.0, c + 0.05)


def screens(p, x0, x1):
    """A glazed wind screen on each parapet along the platforms."""
    for z in (0.2, VD - 0.2):
        for c in rows(x0, x1, 2.0):
            p.box('flat:#5d6a72', c - 1.0, RL + 1.05, z - 0.04, c - 0.92, RL + 3.2, z + 0.04)
        p.box('flat:#5d6a72', x0, RL + 3.2, z - 0.05, x1, RL + 3.3, z + 0.05)
        quad(p, 'glassTint', 'f', x0, x1, RL + 1.05, RL + 3.2, z)


def face_arch(p, s, face, at, x0, x1, kind, r, yt=RL - 0.85):
    """One face of an arch bay: brick piers, the arch, and what is under it. The wall stands to yt."""
    a, b_ = x0 + PIER, x1 - PIER
    wbox(p, BRICK, face, x0, a, 0, yt, at, 0, FACE)
    wbox(p, BRICK, face, b_, x1, 0, yt, at, 0, FACE)
    wbox(p, COPING, face, x0, a, 2.75, 2.95, at, -0.06, FACE)
    wbox(p, COPING, face, b_, x1, 2.75, 2.95, at, -0.06, FACE)
    arch(p, BRICK, face, a, b_, 2.95, 5.6, yt, at, FACE, 12, BRICK_DK, inner=False)
    # A ring of darker brick round the arch.
    c, R = (a + b_) / 2, (b_ - a) / 2
    n = 12
    for k in range(n):
        t0, t1 = math.pi * k / n, math.pi * (k + 1) / n
        pts = []
        for t, rr in ((t0, R), (t1, R), (t1, R + 0.35), (t0, R + 0.35)):
            pts.append(wpt(face, c - rr * math.cos(t), 2.95 + (2.65 / R) * rr * math.sin(t), at, -0.03))
        p.face(BRICK_DK if k % 2 else MORTAR, pts, NORMAL[face])
    if kind == 'pass':
        return
    if kind == 'glaze':
        # The station hall's window: a kick wall, steel mullions and a transom, glass.
        wbox(p, KICK, face, a, b_, 0, 0.6, at, FACE - 0.2, FACE)
        for cx in [a + (b_ - a) * i / 4 for i in range(5)]:
            wbox(p, 'flat:#3a3d42', face, cx - 0.04, cx + 0.04, 0.6, 5.7, at, FACE - 0.14, FACE)
        for y in (0.6, 2.95):
            wbox(p, 'flat:#3a3d42', face, a, b_, y, y + 0.08, at, FACE - 0.14, FACE)
        quad(p, 'glassTint', face, a, b_, 0.6, 5.7, wpt(face, 0, 0, at, FACE - 0.07)[2])
        return
    back = FACE
    wbox(p, 'flat:#3a3d42', face, a, b_, 0, 5.7, at, back, back + 0.1)
    if kind == 'shut':
        wbox(p, 'flat:#a7acb1', face, a + 0.3, b_ - 0.3, 0, 3.6, at, back - 0.08, back)
        for y in [0.35 * i + 0.3 for i in range(9)]:
            wbox(p, 'flat:#8c9196', face, a + 0.3, b_ - 0.3, y, y + 0.03, at, back - 0.1, back - 0.08)
        wbox(p, BRICK_DK, face, a, b_, 3.6, 5.7, at, back - 0.06, back)
        q = wpt(face, c + 1.6, 4.1, at, back - 0.1)
        wall_lamp(p, 'z', q[2], -1 if face == 'f' else 1, 4.1, c + 1.6)
        return
    # A shop: a glazed front with a door, a fascia board, a lamp, something standing outside.
    wbox(p, KICK, face, a + 0.2, b_ - 0.2, 0, 0.5, at, back - 0.1, back)
    q0 = wpt(face, 0, 0, at, back - 0.06)
    quad(p, 'windowDim', face, a + 0.3, c + 0.6, 0.5, 2.9, q0[2], col='flat:#6a5a3e')
    wbox(p, 'flat:#4a3626', face, c + 0.8, c + 1.8, 0, 2.2, at, back - 0.08, back)
    wbox(p, WARM, face, a + 0.3, b_ - 0.3, 2.9, 3.0, at, back - 0.12, back)
    zf = wpt(face, 0, 0, at, back - 0.3)[2]
    zb = wpt(face, 0, 0, at, back - 0.02)[2]
    (sign if face == 'f' else sign_back)(s, r.choice(SIGN_COLOURS), a + 0.5, 3.15, min(zf, zb), b_ - 0.5, 3.95, max(zf, zb))
    lz = wpt(face, 0, 0, at, back)[2]
    wall_lamp(p, 'z', lz, -1 if face == 'f' else 1, 4.3, c - 1.5)
    if r.random() < 0.6:
        wbox(p, VEND, face, b_ - 1.5, b_ - 0.5, 0, 1.83, at, back - 0.75, back - 0.05)
        wbox(p, 'light', face, b_ - 1.42, b_ - 0.58, 0.75, 1.7, at, back - 0.77, back - 0.75)


def face_bridge(p, s, face, at, x0, x1, r):
    """he8's south face: a glazed arch, and over it the wall with the door of the bridge from Mioya's level 2."""
    yt, top = 5.75, RL - 0.85
    face_arch(p, s, face, at, x0, x1, 'glaze', r, yt=yt)
    xa, xb, ya, yb = DOOR
    for a, b_, y0, y1 in ((x0, xa, yt, top), (xb, x1, yt, top), (xa, xb, yb, top), (xa, xb, yt, ya)):
        if b_ - a > 0.01 and y1 - y0 > 0.01:
            wbox(p, BRICK, face, a, b_, y0, y1, at, 0, FACE)
    for a, b_ in ((xa - 0.15, xa), (xb, xb + 0.15)):
        wbox(p, COPING, face, a, b_, ya, yb + 0.15, at, -0.06, FACE)
    wbox(p, COPING, face, xa - 0.15, xb + 0.15, yb, yb + 0.15, at, -0.06, FACE)


def hall_piers(p, x0, x1):
    """A hollow bay's structure: a brick pier under each track at both of its ends."""
    for a, b_ in ((x0, x0 + 0.35), (x1 - 0.35, x1)):
        for c in TZ:
            p.box(BRICK, a, 0, c - 0.5, b_, RL - 0.85, c + 0.5)
            p.box(COPING, a - 0.04, 2.75, c - 0.54, b_ + 0.04, 2.95, c + 0.54)


def bay(p, s, v, r):
    w = v['w']
    x0, x1 = -w / 2, w / 2
    kind = v['kind']
    holes = v.get('holes', ())
    if kind in ('pass', 'mezz'):
        h = PASS / 2
        up = HALL_Y if kind == 'mezz' else RL - 0.85
        for a, b_ in ((x0, -h), (h, x1)):
            p.box(BRICK_DK, a, 0, FACE, b_, up, VD - FACE)
        p.box(BRICK_DK, -h, 3.3, FACE, h, up, VD - FACE)
        for sx in (-1, 1):
            p.box(TILEW, min(sx * h, sx * (h - 0.06)), 0, FACE, max(sx * h, sx * (h - 0.06)), 3.3, VD - FACE)
            p.box('flat:#3f6a8a', min(sx * (h - 0.06), sx * (h - 0.08)), 1.1, FACE, max(sx * (h - 0.06), sx * (h - 0.08)), 1.3, VD - FACE)
        p.box('flat:#d9d6cc', -h, 3.24, FACE, h, 3.3, VD - FACE)
        for z in [3.5 + 3.8 * i for i in range(6)]:
            p.box('light', -0.7, 3.2, z - 0.12, 0.7, 3.24, z + 0.12)
        mark('pass', 0, 0, 0, PASS, VD)
    elif kind == 'conc':
        # A bay kept for the station's concourse: each arch stands open to a hoarding CD in, where the gates will be.
        CD = 3.0
        p.box(BRICK_DK, x0, 0, FACE + CD, x1, RL - 0.85, VD - FACE - CD)
        for a, b_ in ((x0, x0 + PIER), (x1 - PIER, x1)):
            p.box(BRICK_DK, a, 0, FACE, b_, RL - 0.85, VD - FACE)
        p.box(BRICK_DK, x0 + PIER, 5.7, FACE, x1 - PIER, RL - 0.85, VD - FACE)
        for face, at, tag in (('f', 0.0, 'res_f'), ('b', VD, 'res_b')):
            wbox(p, 'flat:#f4f4f0', face, x0 + PIER, x1 - PIER, 0, 2.5, at, FACE + CD - 0.12, FACE + CD)
            wbox(p, 'flat:#e8a400', face, x0 + PIER, x1 - PIER, 1.9, 2.1, at, FACE + CD - 0.14, FACE + CD - 0.12)
            wbox(p, 'flat:#d9d6cc', face, x0 + PIER, x1 - PIER, 5.64, 5.7, at, FACE, FACE + CD)
            wbox(p, 'light', face, -1.2, 1.2, 5.58, 5.64, at, FACE + 1.2, FACE + 1.5)
            q = wpt(face, 0, 3.7, at, FACE + CD - 0.02)
            mark(tag, q[0], q[1], q[2], 5.4, 1.1, (NORMAL[face][0], NORMAL[face][2]))
        mark('conc', 0, 0, 0, CD + FACE, VD)
    elif kind == 'flight':
        p.box(BRICK_DK, x0, 0, FACE, x1, HALL_Y, VD - FACE)
    elif kind == 'hall':
        hall_piers(p, x0, x1)
    else:
        p.box(BRICK_DK, x0, 0, FACE, x1, RL - 0.85, VD - FACE)
    if kind == 'hall':
        for face, at, fk in (('f', 0, v['faces'][0]), ('b', VD, v['faces'][1])):
            (face_bridge(p, s, face, at, x0, x1, r) if fk == 'bridge' else face_arch(p, s, face, at, x0, x1, fk, r))
    else:
        fk = 'pass' if kind in ('conc', 'mezz') else 'shop' if kind == 'flight' else kind
        face_arch(p, s, 'f', 0, x0, x1, fk, r)
        face_arch(p, s, 'b', VD, x0, x1, 'shut' if fk == 'shop' and r.random() < 0.3 else fk, r)
    parapets(p, x0, x1, holes=holes)
    track(p, x0, x1, holes=holes)
    wires(p, x0, x1)
    if v.get('st'):
        platforms(p, x0, x1, holes, v.get('col', True), v.get('bench', True), v.get('frame', True))
        screens(p, x0, x1)


def girder(p, s, v, r):
    w = v['w']
    x0, x1 = -w / 2, w / 2
    for a, b_ in ((x0, x0 + ABUT), (x1 - ABUT, x1)):
        p.box(BRICK, a, 0, 0, b_, GC - 0.3, VD)
        p.box(COPING, a - 0.05, GC - 0.3, -0.1, b_ + 0.05, GC, VD + 0.1)
        for z in (0.0, VD - 0.3):
            p.box(BRICK_DK, a - 0.12, 0, z, b_ + 0.12, 1.0, z + 0.3)
    # Plate girders: one at each face rising above the rails, four under the deck; stiffeners; a deck plate.
    for z0, z1, top in ((0.0, 0.45, RL + 1.0), (VD - 0.45, VD, RL + 1.0), (6.7, 7.1, RL - 0.5), (12.8, 13.2, RL - 0.5), (18.9, 19.3, RL - 0.5)):
        p.box(GIRDER, x0, GC, z0, x1, top, z1)
        p.box(GIRDER_DK, x0, GC - 0.06, z0 - 0.12, x1, GC + 0.06, z1 + 0.12)
        p.box(GIRDER_DK, x0, top - 0.06, z0 - 0.12, x1, top + 0.06, z1 + 0.12)
    for c in rows(x0, x1, 1.6):
        for z, sgn in ((0.0, -1), (VD, 1)):
            p.box(GIRDER_DK, c - 0.8 - 0.04, GC + 0.06, min(z, z + sgn * 0.1), c - 0.8 + 0.04, RL + 0.94, max(z, z + sgn * 0.1))
    p.box(GIRDER_DK, x0, RL - 0.5, 0.45, x1, RL - 0.2, VD - 0.45)
    for c in rows(x0, x1, 3.2):
        p.box(GIRDER_DK, c - 0.1, GC + 0.6, 0.45, c + 0.1, RL - 0.5, VD - 0.45)
    # Hazard stripes along the bottom flange, a clearance board on each face, lamps under the deck.
    for z, face in ((0.0, 'f'), (VD, 'b')):
        n = max(4, int(w / 1.2))
        for k in range(n):
            slab(p, 'flat:#e6a700' if k % 2 else DARK, face, x0 + k * w / n, x0 + (k + 1) * w / n, GC, GC + 0.3, z, 0.14)
        board(p, 'clear_' + face, face, -1.7, 1.7, GC + 0.9, GC + 1.7, z, 'flat:#e6a700', 0.16)
    for z in (3.6, 10.0, 16.0, 22.4):
        for c in rows(x0 + ABUT, x1 - ABUT, 5.0):
            p.box('light', c - 0.9, GC + 0.52, z - 0.09, c + 0.9, GC + 0.6, z + 0.09)
    track(p, x0, x1, ballast=False)
    wires(p, x0, x1, portal=w > 14)
    # Walkways on brackets outside the face girders.
    for z, sgn in ((0.0, -1), (VD, 1)):
        p.box(STEEL, x0, RL - 0.2, min(z, z + sgn * 0.9), x1, RL - 0.14, max(z, z + sgn * 0.9))
        p.box(STEEL, x0, RL + 0.86, z + sgn * 0.86, x1, RL + 0.9, z + sgn * 0.9)
        for c in rows(x0, x1, 2.0):
            p.box(STEEL, c - 0.02, RL - 0.14, z + sgn * 0.86, c + 0.02, RL + 0.9, z + sgn * 0.9)
    if v.get('st'):
        platforms(p, x0, x1)
        screens(p, x0, x1)


PIECES = (
    [dict(id='%s%d' % (k, w), w=float(w), kind=kind) for w in (7, 8, 9) for k, kind in (('a', 'shop'), ('s', 'shut'))]
    + [dict(id='p8', w=8.0, kind='pass'), dict(id='st8', w=8.0, kind='shop', st=True), dict(id='stp8', w=8.0, kind='pass', st=True)]
    + [dict(id='g%d' % w, w=float(w), kind='girder') for w in (12, 16, 24)]
)
# The platforms carried on over the other pieces, and Kawaminato Station's five middle bays.
PIECES += [dict(q, id='pf_' + q['id'], st=True) for q in PIECES if not q.get('st')]
PIECES += [
    dict(id='hm8', w=8.0, kind='mezz', st=True, bench=False, holes=[(-4.0, -2.5) + WELL, (2.5, 4.0) + WELL]),
    dict(id='hw8', w=8.0, kind='flight', st=True, col=False, bench=False, frame=False, holes=[(-2.0, 4.0) + WELL]),
    dict(id='he8', w=8.0, kind='hall', faces=('glaze', 'bridge'), st=True, col=False, bench=False, frame=False, holes=[(-4.0, 2.0) + WELL]),
    dict(id='hl8', w=8.0, kind='hall', faces=('glaze', 'glaze'), st=True, frame=False, holes=[(-3.6, -1.3) + LIFT_Z]),
    dict(id='ho8', w=8.0, kind='hall', faces=('pass', 'pass'), st=True),
]


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(dict(v, d=VD, h=RL))
    r = random.Random(sum(map(ord, v['id'])))
    (girder if v['kind'] == 'girder' else bay)(body, signs, v, r)
    return body, signs


def build_lo(v):
    """Past the plot's edges the viaduct is drawn as a plain run of brick and track."""
    if v['id'] != 'a8':
        return None
    p = Part()
    w = v['w']
    p.box(BRICK, -w / 2, 0, 0, w / 2, RL - 0.85, VD)
    for z in (-0.02, VD + 0.02):
        p.face(DARK, [(-w / 2 + 1, 0, z), (w / 2 - 1, 0, z), (w / 2 - 1, 4.6, z), (-w / 2 + 1, 4.6, z)], (0, 0, -1 if z < 1 else 1))
    parapets(p, -w / 2, w / 2)
    track(p, -w / 2, w / 2)
    wires(p, -w / 2, w / 2)
    return p


if __name__ == '__main__':
    run('viaduct', [dict(q, gap=3.0) for q in PIECES], build_hi, build_lo)
    mark('geo', VD, RL, PASS, ABUT, GC)
    write_anchors('viaduct')
