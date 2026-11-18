# Builds the Kawaminato Metro car model (one fictional series, two cars: middle + cab).
#
#   blender --background --python tools/blender/build_metro_car.py -- [--renders <dir>]
#
# Writes assets/trains/metro-car.blend and public/models/metro-car.glb.
#
# Everything below is written in the GAME's car frame (see docs/conventions.md):
#   +x along the car, y up (0 = rail level), +z to the right of +x, metres.
# G() converts to Blender (Z up); the glTF exporter converts back to Y up.
#
# The dimensions at the top mirror src/trains/car.ts and src/stations/kit.ts. The game
# keeps its box colliders, so doors, floor, seats and the cab partition must stay put.
#
# Materials are named with the game's material keys (render/materials.ts). Two are
# placeholders the loader swaps per line: LINE (colour bands) and SEAT (moquette).
# Objects ending _ext follow the tunnel/station/daylight lighting; _int is the saloon.

import bpy
import bmesh
import math
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

# ── Fixed by the game ──
F = 1.10            # floor above rail (PF_H)
W = 1.40            # body half-width (CAR_HALF_W)
WI = 1.30           # inner lining half-width
HALF = 9.0          # body half-length (CAR_HALF)
DOORS = [-5.8, 0.0, 5.8]
DH = 0.65           # half door opening
DOOR_TOP = F + 1.85
CEIL = 3.35
PART_X = (7.25, 7.33)   # cab partition (cab at +x)

# ── Design ──
WIN_Y = (1.95, 2.85)
SIDE_TOP = 3.22
SILL = [(1.32, 0.72), (1.40, 1.00)]
SHOULDER = [(1.40, 3.22), (1.37, 3.33), (1.28, 3.42), (1.12, 3.48), (0.80, 3.52), (0.40, 3.55), (0.0, 3.56)]
SIGN_X = (2.1, 3.7)     # side destination display surround (the sign itself is drawn by the game)

BODY = 'metal:#d4d8db'
ROOF = 'flat:#9ea4a9'
SILLM = 'flat:#7f8a93'
DARK = 'flat:#2a2d31'
BLACK = 'flat:#16181b'
LAMP = 'flat:#0c0d0e'
BOGIE = 'flat:#1c1e21'
WHEEL = 'flat:#111111'
TYRE = 'metal:#8d9094'
GEAR = 'flat:#3a3e44'
SHOE = 'flat:#8a5a2b'
ACU = 'flat:#b7bcc0'
INNER = 'flat:#ece9e0'
TRIM = 'flat:#dcd9d0'
FLOOR = 'flat:#a7a59c'
STEEL = 'metal:#c9ccd0'
STRAP = 'flat:#f4f4f0'
YELLOW = 'flat:#e3b520'
DESK = 'flat:#30343a'
KICK = 'flat:#3a3d42'
GLASS = 'glassTint'
CLEAR = 'glass'
LIGHT = 'light'
LINE = 'LINE'
SEAT = 'SEAT'

PREVIEW = {  # colours for materials whose key has no hex in it
    'glassTint': (0.62, 0.77, 0.81, 0.25), 'glass': (0.81, 0.90, 0.93, 0.15), 'light': (1.0, 0.96, 0.9, 1.0),
    'LINE': (0.12, 0.62, 0.33, 1.0), 'SEAT': (0.12, 0.62, 0.33, 1.0),
}


def G(p):
    return (p[0], -p[2], p[1])


def srgb(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    if '#' in name:
        h = name.split('#')[1]
        if len(h) == 3:
            h = ''.join(ch * 2 for ch in h)
        col = tuple(srgb(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)
    else:
        col = PREVIEW.get(name, (1, 0, 1, 1))
    metal = name.startswith('metal')
    m.diffuse_color = col
    m.metallic = 0.9 if metal else 0.0
    m.roughness = 0.35 if metal else 0.6
    try:
        m.use_nodes = True
    except Exception:
        pass
    try:
        bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value = col
        bsdf.inputs['Metallic'].default_value = m.metallic
        bsdf.inputs['Roughness'].default_value = m.roughness
        bsdf.inputs['Alpha'].default_value = col[3]
        if name == LIGHT:
            bsdf.inputs['Emission Color'].default_value = col
            bsdf.inputs['Emission Strength'].default_value = 3.0
    except Exception as e:
        print('material nodes:', name, e)
    if col[3] < 1:
        for attr, val in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
            try:
                setattr(m, attr, val)
            except Exception:
                pass
    return m


class Part:
    """Accumulates faces in game coordinates; every face gets an 'outward' hint so winding is never guessed."""

    def __init__(self):
        self.bm = bmesh.new()
        self.mats = []

    def mi(self, name):
        if name not in self.mats:
            self.mats.append(name)
        return self.mats.index(name)

    def face(self, mat, pts, hint):
        clean = []
        for p in pts:
            if not clean or max(abs(p[k] - clean[-1][k]) for k in range(3)) > 1e-6:
                clean.append(tuple(p))
        if len(clean) > 1 and max(abs(clean[0][k] - clean[-1][k]) for k in range(3)) <= 1e-6:
            clean.pop()
        if len(clean) < 3:
            return
        n = [0.0, 0.0, 0.0]
        for i, a in enumerate(clean):
            b = clean[(i + 1) % len(clean)]
            n[0] += (a[1] - b[1]) * (a[2] + b[2])
            n[1] += (a[2] - b[2]) * (a[0] + b[0])
            n[2] += (a[0] - b[0]) * (a[1] + b[1])
        if n[0] * n[0] + n[1] * n[1] + n[2] * n[2] < 1e-12:
            return
        if n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0:
            clean.reverse()
        f = self.bm.faces.new([self.bm.verts.new(G(p)) for p in clean])
        f.material_index = self.mi(mat)

    def box(self, mat, x0, y0, z0, x1, y1, z1):
        x0, x1 = min(x0, x1), max(x0, x1)
        y0, y1 = min(y0, y1), max(y0, y1)
        z0, z1 = min(z0, z1), max(z0, z1)
        self.face(mat, [(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], (1, 0, 0))
        self.face(mat, [(x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)], (-1, 0, 0))
        self.face(mat, [(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], (0, 1, 0))
        self.face(mat, [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0))
        self.face(mat, [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1))
        self.face(mat, [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], (0, 0, -1))

    def prism(self, mat, poly, axis, a0, a1, caps=True):
        """Extrude a 2D polygon. axis 'x': poly is (z, y). axis 'z': poly is (x, y)."""
        area = sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))
        sgn = 1 if area > 0 else -1

        def P(q, a):
            return (a, q[1], q[0]) if axis == 'x' else (q[0], q[1], a)

        for i, p in enumerate(poly):
            q = poly[(i + 1) % len(poly)]
            na, nb = sgn * (q[1] - p[1]), -sgn * (q[0] - p[0])
            hint = (0, nb, na) if axis == 'x' else (na, nb, 0)
            self.face(mat, [P(p, a0), P(q, a0), P(q, a1), P(p, a1)], hint)
        if caps:
            lo, hi = min(a0, a1), max(a0, a1)
            ax = (1, 0, 0) if axis == 'x' else (0, 0, 1)
            self.face(mat, [P(p, hi) for p in poly], ax)
            self.face(mat, [P(p, lo) for p in poly], (-ax[0], 0, -ax[2]))

    def cyl(self, mat, c, axis, r, length, seg=12, caps=True, capmat=None):
        """Cylinder centred on c along game axis 0/1/2."""
        u, v = [(1, 2), (2, 0), (0, 1)][axis]

        def P(k, t):
            a = 2 * math.pi * k / seg
            p = list(c)
            p[axis] += t
            p[u] += r * math.cos(a)
            p[v] += r * math.sin(a)
            return tuple(p)

        h = length / 2
        for k in range(seg):
            a = 2 * math.pi * (k + 0.5) / seg
            hint = [0, 0, 0]
            hint[u], hint[v] = math.cos(a), math.sin(a)
            self.face(mat, [P(k, -h), P(k + 1, -h), P(k + 1, h), P(k, h)], hint)
        if caps:
            for t in (-h, h):
                hint = [0, 0, 0]
                hint[axis] = t
                self.face(capmat or mat, [P(k, t) for k in range(seg)], hint)

    def ring(self, mat, c, R, r, seg=10, sub=4):
        """Torus lying in the x-y plane (a strap handle)."""
        def P(i, j):
            a, b = 2 * math.pi * i / seg, 2 * math.pi * j / sub
            rr = R + r * math.cos(b)
            return (c[0] + rr * math.cos(a), c[1] + rr * math.sin(a), c[2] + r * math.sin(b))

        for i in range(seg):
            for j in range(sub):
                a, b = 2 * math.pi * (i + 0.5) / seg, 2 * math.pi * (j + 0.5) / sub
                hint = (math.cos(a) * math.cos(b), math.sin(a) * math.cos(b), math.sin(b))
                self.face(mat, [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], hint)

    def grid(self, s, z, xs, ys, cell, out):
        """A wall in the plane z = s*z, cut into cells. cell(xc, yc) → material or None (hole)."""
        for i in range(len(xs) - 1):
            for j in range(len(ys) - 1):
                m = cell((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2)
                if m:
                    self.face(m, [(xs[i], ys[j], s * z), (xs[i + 1], ys[j], s * z), (xs[i + 1], ys[j + 1], s * z), (xs[i], ys[j + 1], s * z)], (0, 0, s * out))

    def finish(self, name, parent):
        bm = self.bm
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
        limit = math.radians(32)
        for f in bm.faces:
            f.smooth = True
        for e in bm.edges:
            fs = e.link_faces
            sharp = len(fs) != 2 or fs[0].material_index != fs[1].material_index
            if not sharp:
                try:
                    sharp = e.calc_face_angle() > limit
                except ValueError:
                    sharp = True
            e.smooth = not sharp
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        for m in self.mats:
            me.materials.append(material(m))
        ob = bpy.data.objects.new(name, me)
        ob.parent = parent
        return ob


# ── Layout helpers ──

def bays(kind):
    """Window panes per car as (x0, x1). The cab is at +x on the cab car."""
    panes = []
    for lo, hi in ((-5.15, -0.65), (0.65, 5.15)):
        a, b, mid = lo + 0.42, hi - 0.42, (lo + hi) / 2
        panes += [(a, mid - 0.035), (mid + 0.035, b)]
    panes.append((-8.55, -6.90))
    panes.append((7.75, 8.70) if kind == 'cab' else (6.90, 8.55))
    return sorted(panes)


def in_any(x, spans):
    return any(a < x < b for a, b in spans)


DOOR_SPANS = [(d - DH, d + DH) for d in DOORS]


def top_y(z):
    """Roof height over |z| (outer skin)."""
    z = abs(z)
    pts = SHOULDER[::-1]  # increasing z
    for (z0, y0), (z1, y1) in zip(pts, pts[1:]):
        if z0 <= z <= z1:
            return y0 + (y1 - y0) * (z - z0) / (z1 - z0) if z1 > z0 else y1
    return SIDE_TOP


def bot_y(z):
    z = abs(z)
    (z0, y0), (z1, y1) = SILL
    return y0 if z <= z0 else y0 + (y1 - y0) * (z - z0) / (z1 - z0)


def nose_x(z, y):
    x = 9.30 - 0.22 * abs(z / W) ** 3
    if y > 1.9:
        x -= 0.07 * (y - 1.9)
    if y < 1.25:
        x -= 0.22 * (1.25 - y)
    return x


NOSE_Z = [0.0, 0.30, 0.38, 0.40, 0.74, 0.80, 0.98, 1.12, 1.20, 1.28, 1.32, 1.37, 1.40]
NOSE_Z = sorted(set([-z for z in NOSE_Z] + NOSE_Z))
NOSE_Y = [0.72, 0.90, 1.00, 1.25, 1.34, 1.56, 1.64, 1.80, 1.92, 2.05, 2.50, 2.95, 3.16, 3.30, 3.60]


def nose_cell(zc, yc):
    if 2.05 < yc < 2.95 and abs(zc) < 1.20:
        return BLACK if 0.30 < zc < 0.38 else GLASS
    if 1.92 < yc < 3.16:
        return BLACK
    if 1.64 < yc < 1.80 and 0.74 < abs(zc) < 1.12:
        return LAMP
    if 1.34 < yc < 1.56:
        return LINE
    if yc < 1.00:
        return DARK
    return BODY


# ── Exterior ──

def shell(p, kind):
    panes = bays(kind)
    xs = {-HALF, HALF, SIGN_X[0], SIGN_X[1]}
    for a, b in DOOR_SPANS + panes:
        xs |= {a, b}
    xs = sorted(xs)
    ys = [1.00, F, 1.74, 1.90, WIN_Y[0], WIN_Y[1], DOOR_TOP, 3.10, 3.20, SIDE_TOP]
    mullions = [(-2.935, -2.865), (2.865, 2.935)]

    def cell(xc, yc):
        if in_any(xc, DOOR_SPANS) and F < yc < DOOR_TOP:
            return None
        if WIN_Y[0] < yc < WIN_Y[1]:
            if in_any(xc, panes):
                return None
            if in_any(xc, mullions):
                return DARK
        if SIGN_X[0] < xc < SIGN_X[1] and DOOR_TOP < yc < 3.20:
            return BLACK
        if 3.10 < yc < 3.20:
            return LINE
        if 1.74 < yc < 1.90:
            return LINE
        return BODY

    for s in (1, -1):
        p.grid(s, W, xs, ys, cell, 1)
        # Sill tuck and roof shoulder.
        (z0, y0), (z1, y1) = SILL
        p.face(SILLM, [(-HALF, y0, s * z0), (HALF, y0, s * z0), (HALF, y1, s * z1), (-HALF, y1, s * z1)], (0, -0.3, s))
        for k, ((za, ya), (zb, yb)) in enumerate(zip(SHOULDER, SHOULDER[1:])):
            p.face(BODY if k < 2 else ROOF, [(-HALF, ya, s * za), (HALF, ya, s * za), (HALF, yb, s * zb), (-HALF, yb, s * zb)], (0, 1, s * 0.5))
        # Rain gutter.
        p.box(BODY, -HALF + 0.05, SIDE_TOP - 0.012, s * W, HALF - 0.05, SIDE_TOP + 0.012, s * (W + 0.014))
        # Window reveals, glass; door frames.
        for a, b in panes:
            y0, y1 = WIN_Y
            p.face(DARK, [(a, y0, s * WI), (a, y1, s * WI), (a, y1, s * W), (a, y0, s * W)], (1, 0, 0))
            p.face(DARK, [(b, y0, s * WI), (b, y1, s * WI), (b, y1, s * W), (b, y0, s * W)], (-1, 0, 0))
            p.face(DARK, [(a, y0, s * WI), (b, y0, s * WI), (b, y0, s * W), (a, y0, s * W)], (0, 1, 0))
            p.face(DARK, [(a, y1, s * WI), (b, y1, s * WI), (b, y1, s * W), (a, y1, s * W)], (0, -1, 0))
            p.face(GLASS, [(a, y0, s * 1.385), (b, y0, s * 1.385), (b, y1, s * 1.385), (a, y1, s * 1.385)], (0, 0, s))
        for a, b in DOOR_SPANS:
            p.face(STEEL, [(a, F, s * WI), (a, DOOR_TOP, s * WI), (a, DOOR_TOP, s * W), (a, F, s * W)], (1, 0, 0))
            p.face(STEEL, [(b, F, s * WI), (b, DOOR_TOP, s * WI), (b, DOOR_TOP, s * W), (b, F, s * W)], (-1, 0, 0))
            p.face(STEEL, [(a, DOOR_TOP, s * WI), (b, DOOR_TOP, s * WI), (b, DOOR_TOP, s * W), (a, DOOR_TOP, s * W)], (0, -1, 0))
            p.face(STEEL, [(a, F, s * WI), (b, F, s * WI), (b, F, s * W), (a, F, s * W)], (0, 1, 0))
    # Underside.
    p.face(DARK, [(-HALF, 0.72, -1.32), (HALF, 0.72, -1.32), (HALF, 0.72, 1.32), (-HALF, 0.72, 1.32)], (0, -1, 0))


def gangway_end(p, q, e):
    """Outer end wall with a gangway door at x = e*9 (p: exterior, q: interior)."""
    x, xi = e * HALF, e * (HALF - 0.1)
    up = [(-W, 3.05), (W, 3.05)] + SHOULDER + [(-z, y) for z, y in SHOULDER[-2::-1]]
    p.face(BODY, [(x, y, z) for z, y in up], (e, 0, 0))
    for s in (1, -1):
        p.face(BODY, [(x, y, s * z) for z, y in [(0.5, 0.72), (1.32, 0.72), (1.40, 1.00), (1.40, 3.05), (0.5, 3.05)]], (e, 0, 0))
        q.face(INNER, [(xi, F, s * 0.5), (xi, F, s * WI), (xi, CEIL, s * WI), (xi, CEIL, s * 0.5)], (-e, 0, 0))
        q.face(TRIM, [(xi, F, s * 0.5), (x, F, s * 0.5), (x, 3.05, s * 0.5), (xi, 3.05, s * 0.5)], (0, 0, -s))
        # Bellows side.
        p.box(DARK, x, F, s * 0.5, e * (HALF + 0.25), 3.05, s * 0.6)
    p.face(BODY, [(x, 0.72, -0.5), (x, 0.72, 0.5), (x, F, 0.5), (x, F, -0.5)], (e, 0, 0))
    q.face(INNER, [(xi, 3.05, -0.5), (xi, 3.05, 0.5), (xi, CEIL, 0.5), (xi, CEIL, -0.5)], (-e, 0, 0))
    q.face(TRIM, [(xi, 3.05, -0.5), (x, 3.05, -0.5), (x, 3.05, 0.5), (xi, 3.05, 0.5)], (0, -1, 0))
    q.face(STEEL, [(xi, F, -0.5), (x, F, -0.5), (x, F, 0.5), (xi, F, 0.5)], (0, 1, 0))
    p.box(DARK, x, 3.05, -0.6, e * (HALF + 0.25), 3.15, 0.6)
    p.box(STEEL, x, F - 0.05, -0.5, e * (HALF + 0.25), F, 0.5)
    # Bellows ribs.
    for k in range(3):
        xr = e * (HALF + 0.05 + k * 0.08)
        for s in (1, -1):
            p.box(BLACK, xr, F - 0.08, s * 0.6, xr + e * 0.03, 3.18, s * 0.64)
        p.box(BLACK, xr, 3.15, -0.64, xr + e * 0.03, 3.19, 0.64)
    # Drawbar.
    p.box(BOGIE, x - e * 0.4, 0.58, -0.07, e * (HALF + 0.25), 0.72, 0.07)


def nose(p, q):
    """Cab front at +x: a raked, plan-curved surface over the body cross-section."""
    def y_at(z, j):
        return min(max(NOSE_Y[j], bot_y(z)), top_y(z))

    nz, ny = len(NOSE_Z), len(NOSE_Y)
    for i in range(nz - 1):
        za, zb = NOSE_Z[i], NOSE_Z[i + 1]
        for j in range(ny - 1):
            m = nose_cell((za + zb) / 2, (NOSE_Y[j] + NOSE_Y[j + 1]) / 2)
            ya0, ya1, yb0, yb1 = y_at(za, j), y_at(za, j + 1), y_at(zb, j), y_at(zb, j + 1)
            p.face(m, [(nose_x(za, ya0), ya0, za), (nose_x(zb, yb0), yb0, zb), (nose_x(zb, yb1), yb1, zb), (nose_x(za, ya1), ya1, za)], (1, 0, 0))
            # Inner skin of the cab front (the glass is double-sided, so it is left open).
            if m != GLASS:
                k = WI / W

                def I(z, y):
                    yy = min(max(y, F), CEIL)
                    return (nose_x(z, y) - 0.07, yy, z * k)

                q.face(DESK if m in (BLACK, LAMP, DARK) else INNER, [I(za, ya0), I(zb, yb0), I(zb, yb1), I(za, ya1)], (-1, 0, 0))
        # Collar back to the body: roof and underside.
        yt0, yt1 = top_y(za), top_y(zb)
        p.face(ROOF if abs(za + zb) / 2 < 1.28 else BODY, [(HALF, yt0, za), (HALF, yt1, zb), (nose_x(zb, yt1), yt1, zb), (nose_x(za, yt0), yt0, za)], (0, 1, (za + zb) * 0.3))
        yb0, yb1 = bot_y(za), bot_y(zb)
        p.face(DARK, [(HALF, yb0, za), (HALF, yb1, zb), (nose_x(zb, yb1), yb1, zb), (nose_x(za, yb0), yb0, za)], (0, -1, (za + zb) * 0.3))
    for s in (1, -1):
        for j in range(ny - 1):
            y0, y1 = y_at(W, j), y_at(W, j + 1)
            m = nose_cell(s * 1.39, (NOSE_Y[j] + NOSE_Y[j + 1]) / 2)
            p.face(BODY if m == GLASS else m, [(HALF, y0, s * W), (HALF, y1, s * W), (nose_x(W, y1), y1, s * W), (nose_x(W, y0), y0, s * W)], (0, 0, s))
    # Inner collar: carry the lining, floor and ceiling out to the inner skin.
    xe = 8.95
    for s in (1, -1):
        for j in range(ny - 1):
            y0, y1 = min(max(NOSE_Y[j], F), CEIL), min(max(NOSE_Y[j + 1], F), CEIL)
            q.face(INNER, [(xe, y0, s * WI), (xe, y1, s * WI), (nose_x(W, NOSE_Y[j + 1]) - 0.07, y1, s * WI), (nose_x(W, NOSE_Y[j]) - 0.07, y0, s * WI)], (0, 0, -s))
    k = WI / W
    for i in range(nz - 1):
        za, zb = NOSE_Z[i], NOSE_Z[i + 1]
        q.face(FLOOR, [(xe, F, za * k), (xe, F, zb * k), (nose_x(zb, bot_y(zb)) - 0.07, F, zb * k), (nose_x(za, bot_y(za)) - 0.07, F, za * k)], (0, 1, 0))
        q.face(INNER, [(xe, CEIL, za * k), (xe, CEIL, zb * k), (nose_x(zb, top_y(zb)) - 0.07, CEIL, zb * k), (nose_x(za, top_y(za)) - 0.07, CEIL, za * k)], (0, -1, 0))

    # Destination display housing (the display itself is a live sign in the game).
    p.box(BLACK, 9.12, 2.955, -0.80, 9.225, 3.205, 0.80)
    # Wiper on the driver's side.
    p.box(LAMP, nose_x(-0.45, 2.1) + 0.005, 2.06, -0.47, nose_x(-0.45, 2.1) + 0.02, 2.60, -0.44)
    # Coupler and skirt.
    p.box(BOGIE, 8.6, 0.56, -0.11, 9.34, 0.74, 0.11)
    p.cyl(BOGIE, (9.40, 0.65, 0), 0, 0.13, 0.14, 10)
    for s in (1, -1):
        p.prism(DARK, [(8.55, 0.24), (9.02, 0.24), (9.16, 0.72), (8.55, 0.72)], 'z', s * 0.45, s * 1.30)
    # Radio antenna.
    p.cyl(DARK, (8.2, 3.60, 0.35), 1, 0.05, 0.12, 8)
    p.cyl(STEEL, (8.2, 3.76, 0.35), 1, 0.008, 0.22, 6)


def bogie(p, bx):
    for s in (1, -1):
        # Side frame, dropped between the axles.
        p.prism(BOGIE, [(bx - 1.32, 0.40), (bx - 1.32, 0.56), (bx - 0.55, 0.56), (bx - 0.40, 0.46), (bx + 0.40, 0.46), (bx + 0.55, 0.56),
                        (bx + 1.32, 0.56), (bx + 1.32, 0.40), (bx + 0.62, 0.40), (bx + 0.45, 0.28), (bx - 0.45, 0.28), (bx - 0.62, 0.40)], 'z', s * 0.93, s * 1.05)
        # Air spring on the frame.
        p.cyl(DARK, (bx, 0.59, s * 0.99), 1, 0.26, 0.26, 14)
        for wx in (-0.95, 0.95):
            x = bx + wx
            p.cyl(WHEEL, (x, 0.43, s * 0.72), 2, 0.43, 0.12, 22, capmat=TYRE)
            p.cyl(WHEEL, (x, 0.43, s * (0.72 - 0.075)), 2, 0.46, 0.03, 22)      # flange
            p.box(GEAR, x - 0.16, 0.30, s * 1.05, x + 0.16, 0.56, s * 1.16)    # axlebox
            p.cyl(TYRE, (x, 0.43, s * 1.17), 2, 0.10, 0.03, 10)
        # Third-rail shoe on its beam.
        p.box(SHOE, bx - 0.62, 0.20, s * 1.16, bx + 0.62, 0.32, s * 1.22)
        p.box(GEAR, bx - 0.20, 0.13, s * 1.22, bx + 0.20, 0.19, s * 1.36)
    for wx in (-0.95, 0.95):
        p.cyl(TYRE, (bx + wx, 0.43, 0), 2, 0.085, 1.44, 10, caps=False)
        p.box(BOGIE, bx + wx * 0.52 - 0.22, 0.26, -0.50, bx + wx * 0.52 + 0.22, 0.60, 0.20)   # traction motor
    p.box(BOGIE, bx - 0.18, 0.36, -0.93, bx + 0.18, 0.60, 0.93)   # transom
    p.box(DARK, bx - 0.30, 0.60, -0.60, bx + 0.30, 0.72, 0.60)    # bolster


def underfloor(p):
    for s, boxes in ((1, [(-3.5, -1.9, 0.20), (-1.7, -0.3, 0.26), (0.0, 1.5, 0.16), (1.8, 3.5, 0.24)]),
                     (-1, [(-3.5, -2.3, 0.26), (-2.0, 0.2, 0.18), (0.5, 2.0, 0.24), (2.3, 3.5, 0.20)])):
        for k, (a, b, y0) in enumerate(boxes):
            p.box(DARK if k % 2 else GEAR, a, y0, s * 0.55, b, 0.72, s * 1.28)
            p.box(BOGIE, a + 0.12, y0 + 0.08, s * 1.28, b - 0.12, 0.64, s * 1.292)   # access cover
    p.box(BOGIE, -3.6, 0.42, -0.5, 3.6, 0.72, 0.5)
    for s in (1, -1):   # air tanks
        p.cyl(STEEL, (s * 4.15, 0.48, s * 0.55), 0, 0.17, 0.9, 12)


def roof_gear(p):
    for x in (-4.5, 4.5):
        p.prism(ACU, [(-0.90, 3.50), (0.90, 3.50), (0.90, 3.72), (0.78, 3.82), (-0.78, 3.82), (-0.90, 3.72)], 'x', x - 1.8, x + 1.8)
        for fx in (-0.85, 0.85):
            p.cyl(DARK, (x + fx, 3.825, 0), 1, 0.52, 0.012, 20)
            p.cyl(ACU, (x + fx, 3.83, 0), 1, 0.14, 0.02, 10)
        for s in (1, -1):
            p.box(DARK, x - 1.5, 3.60, s * 0.90, x + 1.5, 3.70, s * 0.905)
    for x in (-8.0, -1.5, 1.5):   # roof ribs
        p.box(ROOF, x - 0.03, 3.50, -0.8, x + 0.03, 3.575, 0.8)


# ── Interior ──

def seat_spans(kind):
    out = [(-5.0, -0.8), (0.8, 5.0), (-8.8, -6.6)]
    out.append((6.6, 7.1) if kind == 'cab' else (6.6, 8.8))
    return out


def interior(q, kind):
    cab = kind == 'cab'
    x0, x1 = -(HALF - 0.1), (8.95 if cab else HALF - 0.1)
    sal1 = PART_X[0] if cab else x1    # end of the saloon
    panes = bays(kind)

    xs = {x0, x1}
    for a, b in DOOR_SPANS + panes:
        xs |= {a, b}
    xs = sorted(xs)
    ys = [F, WIN_Y[0], WIN_Y[1], DOOR_TOP, CEIL]

    def cell(xc, yc):
        if in_any(xc, DOOR_SPANS) and yc < DOOR_TOP:
            return None
        if WIN_Y[0] < yc < WIN_Y[1] and in_any(xc, panes):
            return None
        return INNER

    for s in (1, -1):
        q.grid(s, WI, xs, ys, cell, -1)
        # Display bezel over each door (the LCD is a live sign).
        for d in DOORS:
            q.box(BOGIE, d - 0.66, 2.96, s * 1.293, d + 0.66, 3.34, s * WI)
            q.face(YELLOW, [(d - DH, F + 0.003, s * 1.10), (d + DH, F + 0.003, s * 1.10), (d + DH, F + 0.003, s * WI), (d - DH, F + 0.003, s * WI)], (0, 1, 0))

    q.face(FLOOR, [(x0, F, -WI), (x1, F, -WI), (x1, F, WI), (x0, F, WI)], (0, 1, 0))
    q.face(INNER, [(x0, CEIL, -WI), (x1, CEIL, -WI), (x1, CEIL, WI), (x0, CEIL, WI)], (0, -1, 0))
    # Ceiling: light strips and a central air duct.
    for z in (-0.45, 0.45):
        q.box(LIGHT, -8.4, CEIL - 0.02, z - 0.07, min(8.4, sal1 - 0.2), CEIL, z + 0.07)
    q.box(TRIM, -8.5, CEIL - 0.035, -0.20, min(8.5, sal1 - 0.1), CEIL, 0.20)
    for x in [v * 0.9 - 8.1 for v in range(19)]:
        if x < sal1 - 0.6:
            q.box('flat:#b9b6ad', x, CEIL - 0.037, -0.12, x + 0.5, CEIL - 0.035, 0.12)

    for s in (1, -1):
        # Coves over the window bays.
        cove = [(-5.15, -0.65), (0.65, 5.15), (x0, -6.45)]
        if not cab:
            cove.append((6.45, x1))
        for a, b in cove:
            q.prism(TRIM, [(s * WI, 2.97), (s * WI, CEIL), (s * 1.06, CEIL)], 'x', a, b)
        for a, b in seat_spans(kind):
            # Bench: cushion and back as one profile, on a recessed plinth.
            q.prism(SEAT, [(s * z, y) for z, y in [(1.30, 1.36), (0.92, 1.36), (0.86, 1.41), (0.86, 1.50), (0.89, 1.53), (1.15, 1.53), (1.20, 1.98), (1.23, 2.02), (1.30, 2.02)]], 'x', a, b)
            q.box(KICK, a + 0.03, F, s * 1.00, b - 0.03, 1.36, s * WI)
            # End screens with a glazed top, and a pole up to the ceiling.
            for xe, t in ((a, -0.03), (b, 0.03)):
                q.box(TRIM, xe, F, s * 0.86, xe + t, 1.80, s * WI)
                q.box(CLEAR, xe + t * 0.3, 1.80, s * 0.88, xe + t * 0.7, 2.25, s * WI)
                q.cyl(STEEL, (xe + t / 2, (1.80 + CEIL) / 2, s * 0.86), 1, 0.017, CEIL - 1.80, 8, caps=False)
            # Luggage rack.
            if b - a > 1.5:
                for z in (1.00, 1.10, 1.20):
                    q.cyl(STEEL, ((a + b) / 2, 2.905, s * z), 0, 0.011, b - a - 0.1, 6, caps=False)
                n = max(2, round((b - a) / 1.4) + 1)
                for k in range(n):
                    xb = a + 0.06 + (b - a - 0.12) * k / (n - 1)
                    q.prism(STEEL, [(s * WI, 2.80), (s * WI, 2.92), (s * 0.98, 2.92), (s * 0.98, 2.895)], 'x', xb - 0.01, xb + 0.01)
        # Grab rail with hangers and straps.
        r1 = min(8.6, sal1 - 0.15)
        q.cyl(STEEL, ((-8.6 + r1) / 2, 3.02, s * 0.74), 0, 0.016, r1 + 8.6, 8)
        x = -8.4
        while x < r1:
            q.cyl(STEEL, (x, (3.02 + CEIL) / 2, s * 0.74), 1, 0.012, CEIL - 3.02, 6, caps=False)
            x += 2.1
        x = -8.2
        while x < r1 - 0.2:
            if not any(abs(x - d) < 0.7 for d in DOORS):
                q.box(STRAP, x - 0.013, 2.80, s * 0.74 - 0.003, x + 0.013, 3.01, s * 0.74 + 0.003)
                q.ring(STRAP, (x, 2.735, s * 0.74), 0.062, 0.011)
            x += 0.55

    if cab:
        a, b = PART_X
        q.box(INNER, a, F, -WI, b, 2.05, WI)
        q.box(INNER, a, 3.00, -WI, b, CEIL, WI)
        for s in (1, -1):
            q.box(INNER, a, 2.05, s * 1.10, b, 3.00, s * WI)
        q.box(INNER, a, 2.05, 0.42, b, 3.00, 0.50)     # cab door post
        q.face(CLEAR, [((a + b) / 2, 2.05, -1.10), ((a + b) / 2, 2.05, 1.10), ((a + b) / 2, 3.00, 1.10), ((a + b) / 2, 3.00, -1.10)], (-1, 0, 0))
        q.box(STEEL, a - 0.03, 2.10, 0.56, a, 2.14, 0.90)   # cab door handle
        # Driver's desk, controller and seat (driver on the left).
        q.prism(DESK, [(8.12, F), (8.12, 1.84), (8.36, 1.99), (8.93, 1.99), (8.93, F)], 'z', -1.26, 1.26)
        q.prism(BOGIE, [(8.40, 1.99), (8.44, 2.06), (8.80, 2.03), (8.80, 1.99)], 'z', -1.0, -0.2)   # instrument hood
        q.box(BOGIE, 8.20, 1.90, -0.74, 8.30, 2.02, -0.66)
        q.cyl(STEEL, (8.25, 2.04, -0.70), 2, 0.022, 0.16, 8)
        q.box(KICK, 7.66, 1.50, -0.86, 8.04, 1.60, -0.44)
        q.box(KICK, 7.58, 1.60, -0.86, 7.66, 2.15, -0.44)
        q.cyl(BOGIE, (7.85, 1.30, -0.65), 1, 0.04, 0.40, 8)


# ── Assembly ──

def build_car(kind, offset_z):
    root = bpy.data.objects.new('car_' + kind, None)
    root.location = G((0, 0, offset_z))
    p, q = Part(), Part()
    shell(p, kind)
    gangway_end(p, q, -1)
    if kind == 'cab':
        nose(p, q)
    else:
        gangway_end(p, q, 1)
    bogie(p, -6.0)
    bogie(p, 6.0)
    underfloor(p)
    roof_gear(p)
    interior(q, kind)
    obs = [root, p.finish('car_%s_ext' % kind, root), q.finish('car_%s_int' % kind, root)]
    return obs


def look(cam, loc, target):
    from mathutils import Vector
    cam.location = G(loc)
    d = Vector(G(target)) - Vector(G(loc))
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def render_views(scene, out):
    cam_data = bpy.data.cameras.new('preview')
    cam = bpy.data.objects.new('preview', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    r = scene.render
    r.engine = 'BLENDER_WORKBENCH'
    r.resolution_x, r.resolution_y = 1400, 800
    sh = scene.display.shading
    sh.light = 'STUDIO'
    sh.color_type = 'MATERIAL'
    try:
        sh.show_cavity = True
        sh.show_shadows = False
    except Exception:
        pass
    world = bpy.data.worlds.new('preview')
    world.color = (0.32, 0.34, 0.37)
    scene.world = world
    views = {
        # name: (location, target, lens, clip_start)   (game coords; the cab car sits at z = -6)
        'cab_three_quarter': ((17.5, 3.2, -11.5), (5.5, 1.9, -6), 40, 0.1),
        'cab_front': ((16.0, 2.0, -6.0), (9.0, 2.0, -6), 55, 0.1),
        'mid_side': ((0.0, 2.2, 15.0), (0.0, 2.0, 0), 35, 0.1),
        'mid_three_quarter': ((-14.5, 4.2, 6.5), (-3.0, 1.8, 0), 40, 0.1),
        'bogie': ((-8.2, 0.9, 3.2), (-6.0, 0.5, 0.6), 35, 0.1),
        'saloon': ((-8.2, 2.7, 0.15), (2.0, 2.2, 0.0), 16, 0.05),
        'saloon_seats': ((-4.3, 2.75, -0.5), (-1.5, 2.0, 1.3), 18, 0.05),
        'cab_saloon': ((3.4, 2.7, -6.2), (9.0, 2.3, -6.0), 20, 0.05),
        'cab_inside': ((7.5, 2.75, -5.6), (9.0, 2.0, -6.3), 14, 0.05),
    }
    for name, (loc, target, lens, clip) in views.items():
        look(cam, loc, target)
        cam_data.lens = lens
        cam_data.clip_start = clip
        r.filepath = os.path.join(out, name + '.png')
        bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    renders = argv[argv.index('--renders') + 1] if '--renders' in argv else None

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    col = bpy.data.collections.new('Train')
    scene.collection.children.link(col)

    objs = []
    for kind, off in (('mid', 0.0), ('cab', -6.0)):
        for ob in build_car(kind, off):
            col.objects.link(ob)
            objs.append(ob)
    bpy.context.view_layer.update()

    stats = {}
    for ob in objs:
        if ob.type == 'MESH':
            ob.data.calc_loop_triangles()
            xs = [v.co.x for v in ob.data.vertices]
            ys = [v.co.y for v in ob.data.vertices]
            zs = [v.co.z for v in ob.data.vertices]
            stats[ob.name] = {'tris': len(ob.data.loop_triangles), 'x': (round(min(xs), 3), round(max(xs), 3)),
                              'width': (round(min(ys), 3), round(max(ys), 3)), 'height': (round(min(zs), 3), round(max(zs), 3))}
    for k, v in stats.items():
        print('STAT', k, v)

    blend = os.path.join(ROOT, 'assets', 'trains', 'metro-car.blend')
    glb = os.path.join(ROOT, 'public', 'models', 'metro-car.glb')
    os.makedirs(os.path.dirname(blend), exist_ok=True)
    os.makedirs(os.path.dirname(glb), exist_ok=True)

    for ob in bpy.context.view_layer.objects:
        ob.select_set(ob in objs)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_yup=True, export_apply=True)
    print('EXPORTED', glb, os.path.getsize(glb))

    if renders:
        os.makedirs(renders, exist_ok=True)
        render_views(scene, renders)

    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    print('SAVED', blend)


main()
