# Builds Tsumugibashi's own models: the rotunda under the Silk Exchange, its dome, the Great Loom,
# silk-quarter shopfronts and furniture.
#
#   blender --background --python tools/blender/build_tsumugi.py -- [--renders <dir>]
#
# Writes assets/buildings/tsumugi.blend and public/models/buildings/tsumugi.glb.
#
# Frame and helpers: see buildkit.py. Each model is one root, tsumugi_<id>, with one mesh
# (materials 'paint', 'light' and 'glassTint'). No signs: shop names and labels are drawn by the
# game on the plain boards left for them (stations/rotunda.ts).
#
# rotunda, dome and loom share one origin: the centre of the rotunda's floor. Their dimensions
# (R, the column ring, the openings, the heights) are mirrored in src/stations/rotunda.ts, which
# builds the colliders. The shell faces inwards only; the dome is what shows above the roof.
# Everything else has its origin in the middle of its footprint on the floor; a shopfront's is the
# middle of its frontage, which faces -z.

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

CREAM = 'flat:#d6c6a2'
CREAM_2 = 'flat:#c6b48c'
STONE = 'flat:#b3a688'
COFFER = ['flat:#2f4470', 'flat:#263a63']
GLASS = 'flat:#9fb4b8'
STONE_DK = 'flat:#6f6453'
BRASS = 'flat:#b08d3a'
BRASS_LT = 'flat:#d2b25a'
BRONZE = 'flat:#6b4f2c'
BRONZE_LT = 'flat:#8f6d3c'
TIMBER = 'flat:#4a3324'
TIMBER_LT = 'flat:#7a5a3c'
BLUE, MADDER, INDIGO, THREAD_CREAM = 'flat:#1f6f9d', 'flat:#b4472f', 'flat:#2b3a67', 'flat:#efe6cf'
THREADS = [BLUE, MADDER, THREAD_CREAM, INDIGO]
CLOTH = [BLUE, MADDER, INDIGO, 'flat:#d8c8a0', 'flat:#6b4a32', 'flat:#3f6f4a', 'flat:#7a1f2b', 'flat:#c9962e']
COPPER = ['flat:#5f8f7d', 'flat:#578573', 'flat:#6a9a88']
LEAF = ['flat:#4f7a45', 'flat:#3f6a3a', 'flat:#628c50']

# Shared with src/stations/rotunda.ts.
R = 11.0
COL_R = 9.9
COL_A = [math.radians(22.5 + 45 * k) for k in range(8)]
ENT, HALL = 8.6, 9.6
PW, SH = 1.75, 3.5
SPRING, DOME_RISE, OCULUS = 15.2, 5.9, 2.4
STREET = 5.65          # the pavement above the rotunda floor
ROOF = STREET + 9.5    # top of the building's roof slab


def stick(p, mat, a, b, r0, r1=None, seg=6):
    """A tapered tube from a to b."""
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


def pol(r, a, y):
    return (r * math.cos(a), y, r * math.sin(a))


def annulus(p, mat, r0, r1, y, up, a0=0.0, a1=2 * math.pi, seg=64, mat2=None):
    """A flat ring at height y, facing up or down; mat2 alternates with mat by segment."""
    for k in range(seg):
        a, b = a0 + (a1 - a0) * k / seg, a0 + (a1 - a0) * (k + 1) / seg
        m = mat2 if (mat2 and k % 2) else mat
        p.face(m, [pol(r0, a, y), pol(r1, a, y), pol(r1, b, y), pol(r0, b, y)], (0, 1 if up else -1, 0))


def band(p, mat, r, y0, y1, inward, a0=0.0, a1=2 * math.pi, seg=64, mat2=None, every=2):
    """A cylindrical band of radius r from y0 to y1, facing the axis or away from it."""
    for k in range(seg):
        a, b = a0 + (a1 - a0) * k / seg, a0 + (a1 - a0) * (k + 1) / seg
        m = (a + b) / 2
        s = -1 if inward else 1
        mm = mat2 if (mat2 and k % every == 0) else mat
        p.face(mm, [pol(r, a, y0), pol(r, b, y0), pol(r, b, y1), pol(r, a, y1)], (s * math.cos(m), 0, s * math.sin(m)))


def column(p, cx, cz, h, r=0.5):
    """Fluted stone column with a brass base and capital."""
    p.box(STONE_DK, cx - r - 0.14, 0, cz - r - 0.14, cx + r + 0.14, 0.3, cz + r + 0.14)
    p.cyl(BRASS, (cx, 0.37, cz), 1, r + 0.08, 0.14, seg=20)
    p.cyl(BRASS_LT, (cx, 0.47, cz), 1, r + 0.03, 0.06, seg=20)
    y0, y1 = 0.5, h - 0.62
    seg = 28
    for k in range(seg):
        ra, rb = (r, r - 0.04) if k % 2 == 0 else (r - 0.04, r)
        a, b = 2 * math.pi * k / seg, 2 * math.pi * (k + 1) / seg
        m = (a + b) / 2
        p.face(CREAM, [(cx + ra * math.cos(a), y0, cz + ra * math.sin(a)), (cx + rb * math.cos(b), y0, cz + rb * math.sin(b)),
                       (cx + rb * math.cos(b), y1, cz + rb * math.sin(b)), (cx + ra * math.cos(a), y1, cz + ra * math.sin(a))], (math.cos(m), 0, math.sin(m)))
    # A woven band a third of the way up: the station's four threads.
    for i, t in enumerate(THREADS):
        p.cyl(t, (cx, 2.3 + i * 0.07, cz), 1, r + 0.012, 0.05, seg=20)
    p.cyl(BRASS_LT, (cx, h - 0.59, cz), 1, r + 0.03, 0.06, seg=20)
    p.cyl(BRASS, (cx, h - 0.47, cz), 1, r + 0.1, 0.18, seg=20)
    p.cyl(BRASS, (cx, h - 0.31, cz), 1, r + 0.2, 0.14, seg=20)
    p.box(STONE, cx - r - 0.3, h - 0.24, cz - r - 0.3, cx + r + 0.3, h, cz + r + 0.3)


def rotunda(p):
    # ── Floor: rings in stone, a madder band round the loom, an indigo band inside the columns ──
    annulus(p, CREAM, 0, 3.0, 0.012, True, seg=48)
    annulus(p, MADDER, 3.0, 3.25, 0.012, True, seg=48)
    annulus(p, CREAM, 3.25, 7.6, 0.012, True, seg=48, mat2=CREAM_2)
    annulus(p, INDIGO, 7.6, 7.85, 0.012, True, seg=48)
    annulus(p, STONE, 7.85, R + 0.5, 0.012, True, seg=48)
    # Warp lines radiating from the loom, in the four threads.
    for k in range(24):
        a = 2 * math.pi * k / 24
        da = 0.012
        p.face(THREADS[k % 4], [pol(3.3, a - da, 0.016), pol(7.55, a - da * 0.45, 0.016), pol(7.55, a + da * 0.45, 0.016), pol(3.3, a + da, 0.016)], (0, 1, 0))

    # ── Wall: built bay by bay, leaving the passage (north) and the Grand Stair (east) open ──
    north, east = -math.pi / 2, 0.0
    hn, he = math.asin(PW / R), math.asin(SH / R)
    cuts = sorted(set([2 * math.pi * k / 96 - math.pi for k in range(97)] + [north - hn, north + hn, east - he, east + he]))
    for a, b in zip(cuts, cuts[1:]):
        if b - a < 1e-6:
            continue
        m = (a + b) / 2
        base = 3.2 if abs(m - north) < hn else ENT if abs(m - east) < he else 0.0
        hint = (-math.cos(m), 0, -math.sin(m))

        def strip(mat, y0, y1, r=R):
            if y1 > y0:
                p.face(mat, [pol(r, a, y0), pol(r, b, y0), pol(r, b, y1), pol(r, a, y1)], hint)

        strip(STONE_DK, max(base, 0), 1.2)
        strip(BRASS, max(base, 1.2), 1.26, R - 0.01)
        bay = int((m + math.pi) / (2 * math.pi / 24)) % 2
        strip(CREAM if bay else CREAM_2, max(base, 1.26), ENT)
        strip(STONE, max(base, ENT), HALL)
        strip(CREAM_2, HALL, SPRING)
    # Jambs and soffits of the two openings, 0.9 m deep.
    for c, h, top in ((north, hn, 3.2), (east, he, ENT)):
        for s in (-1, 1):
            a = c + s * h
            q0, q1 = pol(R, a, 0), pol(R + 0.9, a, 0)
            t = (-s * -math.sin(a), 0, -s * math.cos(a))
            p.face(STONE, [q0, q1, (q1[0], top, q1[2]), (q0[0], top, q0[2])], t)
        n = 8
        for k in range(n):
            a, b = c - h + 2 * h * k / n, c - h + 2 * h * (k + 1) / n
            p.face(STONE, [pol(R, a, top), pol(R, b, top), pol(R + 0.9, b, top), pol(R + 0.9, a, top)], (0, -1, 0))
    # A brass line over the passage mouth, and a stone architrave round it.
    for s in (-1, 1):
        a = north + s * (hn + 0.012)
        p.face(BRASS, [pol(R - 0.02, a - 0.006, 0), pol(R - 0.02, a + 0.006, 0), pol(R - 0.02, a + 0.006, 3.32), pol(R - 0.02, a - 0.006, 3.32)], (-math.cos(a), 0, -math.sin(a)))
    band(p, BRASS, R - 0.02, 3.2, 3.32, True, a0=north - hn, a1=north + hn, seg=6)

    # ── Columns and the entablature they carry ──
    for a in COL_A:
        column(p, COL_R * math.cos(a), COL_R * math.sin(a), ENT)
    annulus(p, STONE, 9.2, R, ENT, False)
    band(p, STONE, 9.2, ENT, 9.25, True)
    annulus(p, STONE, 9.0, 9.2, 9.25, False)
    band(p, STONE, 9.0, 9.25, HALL, True)
    annulus(p, STONE, 9.0, R, HALL, True)
    band(p, BRASS, 9.19, ENT + 0.08, ENT + 0.14, True)
    # Frieze: the four threads woven round the hall, over and under.
    for k in range(64):
        a, b = 2 * math.pi * k / 64, 2 * math.pi * (k + 1) / 64
        m = (a + b) / 2
        y = ENT + 0.3 + (0.12 if k % 2 else 0.0)
        p.face(THREADS[(k // 2) % 4], [pol(9.185, a, y), pol(9.185, b, y), pol(9.185, b, y + 0.2), pol(9.185, a, y + 0.2)], (-math.cos(m), 0, -math.sin(m)))
    # A cove of light on top of the cornice.
    annulus(p, 'light', 9.25, 9.4, HALL + 0.02, True)

    # ── Upper drum: sixteen tall lay-lights in stone surrounds, pilasters between ──
    for k in range(16):
        c = 2 * math.pi * (k + 0.5) / 16
        w = 2 * math.pi / 16
        band(p, GLASS, R - 0.03, HALL + 1.0, SPRING - 1.5, True, a0=c - w * 0.3, a1=c + w * 0.3, seg=4)
        # Arched head, stepped.
        for i, f in enumerate((0.24, 0.15)):
            band(p, GLASS, R - 0.03, SPRING - 1.5 + i * 0.35, SPRING - 1.15 + i * 0.35, True, a0=c - w * f, a1=c + w * f, seg=3)
        # Glazing bars.
        for f in (-0.1, 0.1):
            band(p, BRASS, R - 0.06, HALL + 1.0, SPRING - 1.5, True, a0=c + w * f - 0.004, a1=c + w * f + 0.004, seg=1)
        for y in (HALL + 2.4, HALL + 3.6):
            band(p, BRASS, R - 0.06, y, y + 0.05, True, a0=c - w * 0.3, a1=c + w * 0.3, seg=4)
        a = 2 * math.pi * k / 16
        band(p, STONE, R - 0.14, HALL, SPRING, True, a0=a - 0.035, a1=a + 0.035, seg=2)
    band(p, STONE, R - 0.2, SPRING - 0.35, SPRING, True)
    annulus(p, STONE, R - 0.2, R, SPRING - 0.35, False)
    band(p, BRASS, R - 0.21, SPRING - 0.2, SPRING - 0.14, True)

    # ── Dome, from inside: sixteen ribs, coffers between, a ring of light at the oculus ──
    t1 = math.acos(OCULUS / (R - 0.2))
    segs, stacks = 64, 9
    for j in range(stacks):
        ta, tb = t1 * j / stacks, t1 * (j + 1) / stacks
        ra, rb = (R - 0.2) * math.cos(ta), (R - 0.2) * math.cos(tb)
        ya, yb = SPRING + DOME_RISE * math.sin(ta) / math.sin(t1), SPRING + DOME_RISE * math.sin(tb) / math.sin(t1)
        for k in range(segs):
            a, b = 2 * math.pi * k / segs, 2 * math.pi * (k + 1) / segs
            m = (a + b) / 2
            rib = k % 4 == 0
            mat = CREAM if rib else COFFER[(j + k // 4) % 2]
            ins = 0.0 if rib else 0.1   # coffers sit back from the ribs
            p.face(mat, [pol(ra + ins, a, ya), pol(ra + ins, b, ya), pol(rb + ins, b, yb), pol(rb + ins, a, yb)], (-math.cos(m), -0.6, -math.sin(m)))
        if j in (2, 5):
            band(p, BRASS, ra - 0.02, ya - 0.05, ya + 0.05, True)
    top = SPRING + DOME_RISE
    band(p, BRASS, OCULUS, top - 0.1, top + 0.5, True, seg=32)
    annulus(p, 'light', 0, OCULUS * 0.6, top + 0.5, False, seg=32)
    annulus(p, GLASS, OCULUS * 0.6, OCULUS, top + 0.5, False, seg=32)
    for k in range(8):
        a = 2 * math.pi * k / 8
        stick(p, BRASS, pol(0, a, top + 0.44), pol(OCULUS, a, top + 0.44), 0.035, seg=5)


def dome(p):
    """What stands above the Silk Exchange's roof: the top of the drum, the copper dome, the lantern."""
    r = R + 0.5
    # Roof plate round the drum (the building's roof slab has a square hole for it).
    for k in range(64):
        a, b = 2 * math.pi * k / 64, 2 * math.pi * (k + 1) / 64
        da, db = (R + 1.0) / max(abs(math.cos(a)), abs(math.sin(a))), (R + 1.0) / max(abs(math.cos(b)), abs(math.sin(b)))
        p.face(STONE_DK, [pol(r, a, ROOF + 0.01), pol(da, a, ROOF + 0.01), pol(db, b, ROOF + 0.01), pol(r, b, ROOF + 0.01)], (0, 1, 0))
    band(p, STONE, r, STREET + 9.0, SPRING + 0.9, False)
    band(p, STONE_DK, r + 0.12, SPRING + 0.6, SPRING + 0.9, False)
    annulus(p, STONE_DK, r, r + 0.12, SPRING + 0.9, True)
    annulus(p, STONE_DK, r, r + 0.12, SPRING + 0.6, False)
    y0 = SPRING + 0.9
    t1 = math.acos((OCULUS + 0.4) / r)
    segs, stacks = 64, 10
    for j in range(stacks):
        ta, tb = t1 * j / stacks, t1 * (j + 1) / stacks
        ra, rb = r * math.cos(ta), r * math.cos(tb)
        ya, yb = y0 + (DOME_RISE + 0.3) * math.sin(ta) / math.sin(t1), y0 + (DOME_RISE + 0.3) * math.sin(tb) / math.sin(t1)
        for k in range(segs):
            a, b = 2 * math.pi * k / segs, 2 * math.pi * (k + 1) / segs
            m = (a + b) / 2
            rib = k % 4 == 0
            mat = 'flat:#4c7667' if rib else COPPER[(k // 4 + j) % 3]
            out = 0.06 if rib else 0.0
            p.face(mat, [pol(ra + out, a, ya), pol(ra + out, b, ya), pol(rb + out, b, yb), pol(rb + out, a, yb)], (math.cos(m), 0.6, math.sin(m)))
    top = y0 + DOME_RISE + 0.3
    # Lantern: a glazed drum with a small copper cap and a finial.
    ro = OCULUS + 0.4
    band(p, 'flat:#4c7667', ro, top, top + 0.3, False, seg=16)
    band(p, 'glassTint', ro - 0.1, top + 0.3, top + 1.7, False, seg=16)
    for k in range(16):
        a = 2 * math.pi * k / 16
        stick(p, 'flat:#4c7667', pol(ro - 0.08, a, top + 0.3), pol(ro - 0.08, a, top + 1.7), 0.05, seg=4)
    band(p, 'flat:#4c7667', ro + 0.15, top + 1.7, top + 1.9, False, seg=16)
    annulus(p, 'flat:#4c7667', 0, ro + 0.15, top + 1.7, False, seg=16)
    for k in range(16):
        a, b = 2 * math.pi * k / 16, 2 * math.pi * (k + 1) / 16
        m = (a + b) / 2
        p.face(COPPER[k % 3], [pol(ro + 0.15, a, top + 1.9), pol(ro + 0.15, b, top + 1.9), (0, top + 3.0, 0)], (math.cos(m), 1, math.sin(m)))
    stick(p, BRASS_LT, (0, top + 2.9, 0), (0, top + 4.3, 0), 0.06, 0.02, seg=6)
    p.cyl(BRASS_LT, (0, top + 3.5, 0), 1, 0.16, 0.3, seg=8)


def loom(p):
    """The Great Loom: a bronze hand loom on a stone plinth, its warp rising to the oculus."""
    p.box(STONE_DK, -1.9, 0, -1.3, 1.9, 0.24, 1.3)
    p.box(BRASS, -1.92, 0.24, -1.32, 1.92, 0.28, 1.32)
    p.box('flat:#3a2a1e', -0.8, 0.06, -1.31, 0.8, 0.22, -1.3)
    p.box('flat:#3a2a1e', -0.8, 0.06, 1.3, 0.8, 0.22, 1.31)
    # Frame: four posts, rails at the top and the knee, a cross bar under the castle.
    for sx in (-1.5, 1.5):
        for sz in (-0.95, 0.95):
            p.box(BRONZE, sx - 0.08, 0.28, sz - 0.08, sx + 0.08, 2.5, sz + 0.08)
            p.cyl(BRASS_LT, (sx, 2.56, sz), 1, 0.11, 0.12, seg=8)
        p.box(BRONZE, sx - 0.06, 2.3, -0.95, sx + 0.06, 2.44, 0.95)
        p.box(BRONZE, sx - 0.06, 0.8, -0.95, sx + 0.06, 0.92, 0.95)
    for sz in (-0.95, 0.95):
        p.box(BRONZE, -1.5, 2.3, sz - 0.06, 1.5, 2.44, sz + 0.06)
    # Cloth beam (front), warp beam (back), breast beam.
    p.cyl(BRONZE_LT, (0, 0.86, -0.95), 0, 0.13, 3.1, seg=12)
    p.cyl(BRONZE_LT, (0, 1.25, 0.95), 0, 0.2, 3.1, seg=14)
    for sx in (-1.38, 1.38):
        p.cyl(BRASS, (sx, 1.25, 0.95), 0, 0.3, 0.05, seg=14)
    # Woven cloth from the breast beam back to the reed, in stripes of the four threads.
    n = 28
    for k in range(n):
        x0, x1 = -1.25 + 2.5 * k / n, -1.25 + 2.5 * (k + 1) / n
        p.box(THREADS[(k // 2) % 4] if k % 7 else THREAD_CREAM, x0, 1.0, -0.9, x1, 1.015, -0.1)
    # The reed and two heddle frames, hung from the castle.
    p.box(BRASS, -1.3, 0.92, -0.12, 1.3, 1.34, -0.07)
    for i, z in enumerate((0.15, 0.4)):
        y = 1.0 + i * 0.12
        p.box(BRONZE_LT, -1.3, y, z - 0.02, 1.3, y + 0.05, z + 0.02)
        p.box(BRONZE_LT, -1.3, y + 0.7, z - 0.02, 1.3, y + 0.75, z + 0.02)
        for k in range(27):
            x = -1.25 + 2.5 * k / 26
            p.box(BRASS_LT, x - 0.004, y + 0.05, z - 0.004, x + 0.004, y + 0.7, z + 0.004)
        for sx in (-1.1, 1.1):
            stick(p, BRASS, (sx, y + 0.75, z), (sx, 2.3, z), 0.012, seg=4)
    # Warp from the heddles back over the warp beam.
    for k in range(27):
        x = -1.25 + 2.5 * k / 26
        stick(p, THREADS[k % 4], (x, 1.02, -0.1), (x, 1.44, 0.9), 0.008, seg=3)
    # Treadles and a shuttle left on the cloth.
    for x in (-0.5, 0, 0.5):
        p.box(BRONZE, x - 0.07, 0.3, -0.7, x + 0.07, 0.36, 0.5)
    p.box(TIMBER_LT, -0.2, 1.016, -0.6, 0.25, 1.06, -0.5)
    # The warp carried up to the oculus: forty-eight threads from a brass ring over the loom.
    top = SPRING + DOME_RISE + 0.3
    for k in range(48):
        a = 2 * math.pi * k / 48
        lo = (1.25 * math.cos(a), 2.62, 0.8 * math.sin(a))
        hi = pol(OCULUS - 0.15, a, top)
        stick(p, THREADS[k % 4], lo, hi, 0.014, 0.01, seg=3)
    for k in range(32):
        a, b = 2 * math.pi * k / 32, 2 * math.pi * (k + 1) / 32
        stick(p, BRASS_LT, (1.25 * math.cos(a), 2.62, 0.8 * math.sin(a)), (1.25 * math.cos(b), 2.62, 0.8 * math.sin(b)), 0.03, seg=5)
    for sx in (-1.5, 1.5):
        for sz in (-0.95, 0.95):
            stick(p, BRASS, (sx, 2.6, sz), (sx * 0.8, 2.62, sz * 0.8), 0.02, seg=4)


def seat(p):
    """A round bench: timber slats on a stone drum, a brass band."""
    p.cyl(STONE_DK, (0, 0.2, 0), 1, 0.5, 0.4, seg=16)
    p.cyl(BRASS, (0, 0.41, 0), 1, 0.52, 0.03, seg=16)
    for k in range(24):
        a, b = 2 * math.pi * k / 24 + 0.02, 2 * math.pi * (k + 1) / 24 - 0.02
        m = TIMBER_LT if k % 2 else TIMBER
        pts = [pol(0.28, a, 0.47), pol(0.75, a, 0.47), pol(0.75, b, 0.47), pol(0.28, b, 0.47)]
        p.face(m, pts, (0, 1, 0))
        p.face(m, [pol(0.75, a, 0.42), pol(0.75, b, 0.42), pol(0.75, b, 0.47), pol(0.75, a, 0.47)], (math.cos((a + b) / 2), 0, math.sin((a + b) / 2)))
    p.cyl(STONE_DK, (0, 0.62, 0), 1, 0.26, 0.4, seg=12)
    p.cyl(BRASS_LT, (0, 0.84, 0), 1, 0.28, 0.04, seg=12)


def planter(p):
    r = random.Random(5)
    p.cyl(STONE_DK, (0, 0.35, 0), 1, 0.5, 0.7, seg=12)
    p.cyl(BRASS, (0, 0.68, 0), 1, 0.52, 0.04, seg=12)
    p.cyl('flat:#3a2f28', (0, 0.71, 0), 1, 0.44, 0.02, seg=12)
    stick(p, TIMBER, (0, 0.7, 0), (0.04, 1.5, 0.02), 0.05, 0.035, seg=6)
    for k in range(8):
        a = 2 * math.pi * k / 8
        c = (0.04 + 0.26 * math.cos(a) * r.uniform(0.6, 1), 1.4 + r.uniform(0, 0.7), 0.02 + 0.26 * math.sin(a) * r.uniform(0.6, 1))
        rad = r.uniform(0.24, 0.36)
        col = r.choice(LEAF)
        p.cyl(col, c, 1, rad, rad * 0.9, seg=7)
        p.cyl(col, (c[0], c[1] + rad * 0.6, c[2]), 1, rad * 0.62, rad * 0.4, seg=7)


def lamp(p):
    """A bronze lamp standard with three globes."""
    p.cyl(BRONZE, (0, 0.09, 0), 1, 0.2, 0.18, seg=10)
    p.cyl(BRASS, (0, 0.2, 0), 1, 0.15, 0.05, seg=10)
    stick(p, BRONZE, (0, 0.2, 0), (0, 2.9, 0), 0.07, 0.045, seg=8)
    p.cyl(BRASS, (0, 1.3, 0), 1, 0.075, 0.06, seg=8)
    p.cyl(BRASS, (0, 2.9, 0), 1, 0.09, 0.08, seg=8)
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.5
        e = (0.42 * math.cos(a), 3.0, 0.42 * math.sin(a))
        stick(p, BRONZE, (0, 2.8, 0), e, 0.03, 0.025, seg=5)
        p.cyl(BRASS, (e[0], 3.04, e[2]), 1, 0.07, 0.06, seg=8)
        p.cyl('light', (e[0], 3.22, e[2]), 1, 0.15, 0.2, seg=8)
        p.cyl('light', (e[0], 3.22, e[2]), 1, 0.11, 0.3, seg=8)
    p.cyl('light', (0, 3.35, 0), 1, 0.17, 0.24, seg=8)
    p.cyl('light', (0, 3.35, 0), 1, 0.12, 0.34, seg=8)
    p.cyl(BRASS, (0, 3.56, 0), 1, 0.04, 0.1, seg=6)


def bolts(p, x0, x1, y, z, r, n, seed):
    """A row of cloth bolts lying on a shelf, ends towards the street."""
    rr = random.Random(seed)
    for k in range(n):
        x = x0 + (x1 - x0) * (k + 0.5) / n
        p.cyl(rr.choice(CLOTH), (x, y + r, z), 2, r, 0.5, seg=8, capmat=CREAM)


def shop_back(p, w, h, d, wallcol):
    """Back, sides, floor strip and soffit of a shallow shop behind its front."""
    p.face(wallcol, [(-w / 2, 0, d), (w / 2, 0, d), (w / 2, h, d), (-w / 2, h, d)], (0, 0, -1))
    for s in (-1, 1):
        p.face(wallcol, [(s * w / 2, 0, 0), (s * w / 2, 0, d), (s * w / 2, h, d), (s * w / 2, h, 0)], (-s, 0, 0))
    p.face(TIMBER, [(-w / 2, 0.02, 0), (w / 2, 0.02, 0), (w / 2, 0.02, d), (-w / 2, 0.02, d)], (0, 1, 0))
    p.face(wallcol, [(-w / 2, h, 0), (w / 2, h, 0), (w / 2, h, d), (-w / 2, h, d)], (0, -1, 0))


def shop_timber(p):
    """An old silk merchant's front: timber posts, lattice, noren, bolts of cloth on shelves."""
    w, h, d = 4.4, 3.1, 0.9
    shop_back(p, w, h, d, 'flat:#e3d8bf')
    for x in (-w / 2, -0.7, 0.7, w / 2 - 0.14):
        p.box(TIMBER, x, 0, -0.06, x + 0.14, h, 0.08)
    p.box(TIMBER, -w / 2, 2.25, -0.1, w / 2, 2.4, 0.08)
    p.box('flat:#2a2019', -w / 2 + 0.1, 2.42, -0.08, w / 2 - 0.1, 2.98, -0.04)   # the name board (the game writes on it)
    p.box(TIMBER, -w / 2, 2.98, -0.14, w / 2, h, 0.1)
    p.box(TIMBER_LT, -w / 2 - 0.05, h, -0.3, w / 2 + 0.05, h + 0.06, 0.1)
    # Noren over the doorway: five indigo strips, each with a cream mark.
    for k in range(5):
        x = -0.56 + k * 0.224
        p.box(INDIGO, x + 0.01, 1.55, -0.02, x + 0.214, 2.25, -0.012)
        p.box(THREAD_CREAM, x + 0.08, 1.8, -0.024, x + 0.144, 1.95, -0.02)
    # Lattice (kōshi) over a stone sill on the left; shelves of bolts on the right.
    p.box(STONE_DK, -w / 2 + 0.14, 0, -0.04, -0.7, 0.5, 0.06)
    for k in range(13):
        x = -w / 2 + 0.2 + k * 0.105
        p.box(TIMBER, x, 0.5, -0.03, x + 0.04, 2.25, 0.01)
    for y in (1.1, 1.7):
        p.box(TIMBER, -w / 2 + 0.14, y, -0.035, -0.7, y + 0.04, 0.012)
    p.face('light', [(-w / 2 + 0.14, 0.5, 0.3), (-0.7, 0.5, 0.3), (-0.7, 2.25, 0.3), (-w / 2 + 0.14, 2.25, 0.3)], (0, 0, -1))
    p.box(STONE_DK, 0.84, 0, -0.04, w / 2 - 0.14, 0.45, 0.5)
    for i, y in enumerate((0.45, 1.05, 1.65)):
        p.box(TIMBER_LT, 0.84, y, 0.1, w / 2 - 0.14, y + 0.04, 0.7)
        bolts(p, 0.9, w / 2 - 0.2, y + 0.04, 0.4, 0.11, 6, 31 + i)
    p.face('light', [(0.84, 2.2, 0.1), (w / 2 - 0.14, 2.2, 0.1), (w / 2 - 0.14, 2.2, 0.7), (0.84, 2.2, 0.7)], (0, -1, 0))
    # A paper lantern beside the door.
    p.cyl(TIMBER, (-0.86, 2.0, -0.2), 1, 0.11, 0.04, seg=8)
    p.cyl('light', (-0.86, 1.78, -0.2), 1, 0.1, 0.4, seg=8)
    p.cyl(TIMBER, (-0.86, 1.56, -0.2), 1, 0.11, 0.04, seg=8)
    stick(p, TIMBER, (-0.86, 2.02, -0.2), (-0.86, 2.2, -0.05), 0.012, seg=4)


def shop_glass(p):
    """A bright glazed front: brass frame, kimono on stands behind the glass."""
    w, h, d = 4.4, 3.1, 0.9
    shop_back(p, w, h, d, 'flat:#f4efe2')
    p.box(STONE_DK, -w / 2, 0, -0.05, w / 2, 0.3, 0.05)
    for x in (-w / 2, -0.75, 0.75 - 0.07, w / 2 - 0.07):
        p.box(BRASS, x, 0.3, -0.05, x + 0.07, 2.4, 0.03)
    p.box(BRASS, -w / 2, 2.36, -0.05, w / 2, 2.42, 0.03)
    p.box('flat:#f6f3ea', -w / 2, 2.42, -0.09, w / 2, 3.0, -0.03)       # the name board
    p.box(BRASS, -w / 2, 3.0, -0.11, w / 2, h, 0.03)
    for x0, x1 in ((-w / 2 + 0.07, -0.75), (0.75, w / 2 - 0.07)):
        p.face('glassTint', [(x0, 0.3, -0.01), (x1, 0.3, -0.01), (x1, 2.36, -0.01), (x0, 2.36, -0.01)], (0, 0, -1))
    # Kimono on T stands, two each side.
    for i, x in enumerate((-1.75, -1.15, 1.15, 1.75)):
        c = CLOTH[(i * 3 + 1) % len(CLOTH)]
        p.box(BRASS, x - 0.015, 0.3, 0.44, x + 0.015, 1.9, 0.47)
        p.box(c, x - 0.26, 0.55, 0.38, x + 0.26, 1.82, 0.44)
        p.box(c, x - 0.52, 1.5, 0.39, x + 0.52, 1.82, 0.43)
        p.box(CLOTH[(i * 3 + 4) % len(CLOTH)], x - 0.26, 1.12, 0.37, x + 0.26, 1.3, 0.38)
    p.face('light', [(-w / 2 + 0.1, h - 0.03, 0.1), (w / 2 - 0.1, h - 0.03, 0.1), (w / 2 - 0.1, h - 0.03, 0.6), (-w / 2 + 0.1, h - 0.03, 0.6)], (0, -1, 0))
    # The doorway: a rug of the four threads on the floor.
    for k, t in enumerate(THREADS):
        p.box(t, -0.6 + k * 0.3, 0.02, 0.05, -0.3 + k * 0.3, 0.03, 0.75)


def shop_enamel(p):
    """A thread and yarn counter: cream enamel, a madder stripe, cones of thread in racks."""
    w, h, d = 4.4, 3.1, 0.9
    shop_back(p, w, h, d, 'flat:#ece4d0')
    p.box('flat:#f1ead8', -w / 2, 0, -0.04, w / 2, 0.95, 0.5)
    p.box(MADDER, -w / 2, 0.6, -0.046, w / 2, 0.72, -0.04)
    p.box(TIMBER_LT, -w / 2 - 0.03, 0.95, -0.12, w / 2 + 0.03, 1.0, 0.52)
    for x in (-w / 2, w / 2 - 0.1):
        p.box('flat:#f1ead8', x, 0, -0.04, x + 0.1, h, 0.06)
    p.box(MADDER, -w / 2, 2.42, -0.09, w / 2, 3.0, -0.03)               # the name board
    p.box('flat:#f1ead8', -w / 2, 3.0, -0.1, w / 2, h, 0.06)
    p.box('flat:#f1ead8', -w / 2, 2.3, -0.06, w / 2, 2.42, 0.06)
    # Racks of thread cones on the back wall, and a row on the counter.
    rr = random.Random(9)
    for y in (1.3, 1.65, 2.0):
        p.box(TIMBER_LT, -w / 2 + 0.2, y, d - 0.22, w / 2 - 0.2, y + 0.03, d - 0.02)
        for k in range(22):
            x = -w / 2 + 0.3 + k * 0.18
            stick(p, rr.choice(CLOTH), (x, y + 0.03, d - 0.12), (x, y + 0.27, d - 0.12), 0.06, 0.02, seg=6)
    for k in range(9):
        x = -1.8 + k * 0.2
        stick(p, rr.choice(CLOTH), (x, 1.0, 0.25), (x, 1.24, 0.25), 0.06, 0.02, seg=6)
    # Scales and a till on the counter.
    p.box(BRASS, 1.0, 1.0, 0.15, 1.4, 1.04, 0.4)
    stick(p, BRASS, (1.2, 1.04, 0.27), (1.2, 1.4, 0.27), 0.015, seg=4)
    p.box(BRASS, 0.95, 1.38, 0.26, 1.45, 1.4, 0.28)
    p.box('flat:#2a2019', 1.6, 1.0, 0.12, 1.95, 1.22, 0.42)
    p.face('light', [(-w / 2 + 0.1, 2.28, 0.1), (w / 2 - 0.1, 2.28, 0.1), (w / 2 - 0.1, 2.28, 0.6), (-w / 2 + 0.1, 2.28, 0.6)], (0, -1, 0))


def stall(p):
    """A market stall for remnants: trestle table, bolts and baskets, a striped awning."""
    p.box(TIMBER_LT, -1.2, 0.78, -0.55, 1.2, 0.84, 0.55)
    for sx in (-1.05, 1.05):
        for sz in (-0.45, 0.45):
            p.box(TIMBER, sx - 0.04, 0, sz - 0.04, sx + 0.04, 0.78, sz + 0.04)
        p.box(TIMBER, sx - 0.03, 0.3, -0.45, sx + 0.03, 0.36, 0.45)
    p.box(INDIGO, -1.2, 0.3, -0.56, 1.2, 0.78, -0.55)
    for k, t in enumerate(THREADS):
        p.box(t, -1.2, 0.34 + k * 0.09, -0.565, 1.2, 0.38 + k * 0.09, -0.56)
    bolts(p, -1.1, 0.3, 0.84, -0.1, 0.1, 7, 3)
    bolts(p, -1.0, 0.2, 1.04, -0.1, 0.1, 6, 4)
    for x in (0.55, 0.95):
        p.cyl(TIMBER_LT, (x, 0.96, 0.0), 1, 0.17, 0.24, seg=10)
        rr = random.Random(int(x * 10))
        for k in range(5):
            p.cyl(rr.choice(CLOTH), (x + rr.uniform(-0.08, 0.08), 1.1, rr.uniform(-0.08, 0.08)), 1, 0.06, 0.1, seg=6)
    # Awning on four poles, striped in the four threads, a valance at the front.
    for sx in (-1.25, 1.25):
        for sz in (-0.6, 0.6):
            p.box(TIMBER, sx - 0.03, 0, sz - 0.03, sx + 0.03, 2.35 if sz > 0 else 2.15, sz + 0.03)
    n = 12
    for k in range(n):
        x0, x1 = -1.4 + 2.8 * k / n, -1.4 + 2.8 * (k + 1) / n
        c = THREADS[k % 4]
        for s in (1, -1):
            p.face(c, [(x0, 2.13, -0.8), (x1, 2.13, -0.8), (x1, 2.37, 0.7), (x0, 2.37, 0.7)], (0, s, 0))
        p.box(c, x0, 1.93, -0.81, x1, 2.13, -0.8)
    p.cyl('light', (0, 1.95, 0), 1, 0.09, 0.22, seg=8)
    stick(p, TIMBER, (0, 2.06, 0), (0, 2.25, 0), 0.01, seg=4)


PROPS = {
    'rotunda': (rotunda, 26), 'dome': (dome, 28), 'loom': (loom, 6), 'seat': (seat, 2), 'planter': (planter, 2), 'lamp': (lamp, 2),
    'shop_timber': (shop_timber, 5), 'shop_glass': (shop_glass, 5), 'shop_enamel': (shop_enamel, 5), 'stall': (stall, 3.4),
}


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('tsumugi', [dict(id=k, w=w, gap=1.5) for k, (_, w) in PROPS.items()], build_hi, lambda v: None)
