# Shared mesh helpers for the building scripts (build_zakkyo.py, ...).
# Part, material() and G() are the same as in build_metro_car.py, which keeps its own copy.
#
# Buildings are written in the GAME frame: +x along the street frontage, y up (0 = pavement),
# +z into the plot. The front facade stands at z = 0 and faces -z; the origin is the middle
# of the frontage at ground level. Metres.

#
# What a loader finds in public/models/buildings/<kind>.glb:
#   <kind>_<id>            root (zero its position), children:
#     <..>_body            materials 'paint' (+ 'window', 'windowLit', and 'light', 'glassTint', 'beacon' where used)
#     <..>_signs           material 'signface'; extras.signs = JSON [{uv:[u0,v0,u1,v1], w, h, col}], extras.atlas_m
#   <kind>_<id>_lo         root of the simplified copy, one child mesh with 'paint', 'window', 'windowLit'
# Every material is meant to be replaced by the game. Colour is in COLOR_0 (linear) on all of them.
# 'windowLit' is the share of windows to light at night; 'signface' takes one canvas texture per
# building, drawn from extras.signs (board size in metres, background colour, atlas rect; v up, so
# use 1 - v against glTF UVs). A corner variant (corner=True) has a second street face on its -x side,
# standing 0.25 to 0.3 m outside the plot width.

import bpy
import bmesh
import json
import math
import os
import random

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
LIGHT = 'light'
# Every 'flat:#hex' / 'metal:#hex' key is baked into the vertex colour attribute 'Col' and shares
# the one material PAINT, so a building body is a single draw call. The keys in SPECIAL keep a
# material of their own. SIGNFACE is the readable face of a sign board: see sign().
PAINT = 'paint'
SIGNFACE = 'signface'
WINDOW_DARK = 'window'       # window glass that stays dark at night
WINDOW_LIT = 'windowLit'     # window glass the game may light at night (same colour by day)
BEACON = 'beacon'            # red aircraft warning lights
LIT_SHARE = 0.35
SPECIAL = ('light', 'glassTint', SIGNFACE, WINDOW_DARK, WINDOW_LIT, BEACON)
VCOL = (PAINT, SIGNFACE, WINDOW_DARK, WINDOW_LIT, BEACON)
PREVIEW = {WINDOW_DARK: (1, 1, 1, 1), WINDOW_LIT: (1, 1, 1, 1), BEACON: (1, 1, 1, 1),'light': (1.0, 0.96, 0.9, 1.0), 'glassTint': (0.62, 0.77, 0.81, 0.35), PAINT: (1, 1, 1, 1), SIGNFACE: (1, 1, 1, 1)}


def G(p):
    return (p[0], -p[2], p[1])


def srgb(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def colour_of(name):
    """Linear RGBA of a material key such as 'flat:#c9bda6'."""
    if '#' in name:
        h = name.split('#')[1]
        if len(h) == 3:
            h = ''.join(ch * 2 for ch in h)
        return tuple(srgb(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)
    return PREVIEW.get(name, (1, 0, 1, 1))


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
        if name in VCOL:
            vc = m.node_tree.nodes.new('ShaderNodeVertexColor')
            vc.layer_name = 'Col'
            m.node_tree.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
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
        self.col = self.bm.loops.layers.float_color.new('Col')
        self.uv = self.bm.loops.layers.uv.new('UVMap')
        self.sl = self.bm.faces.layers.int.new('sign')   # sign rect index + 1 on SIGNFACE faces
        self.rects = []        # sign boards: dict(w, h, col), metres
        self.xf = None         # optional point transform, see turned()
        self.xfh = None
        self.body = None       # on a signs Part: the Part that receives the board boxes
        self.reversed = False
        self.lit = random.Random(7)

    def turned(self, x_face, length):
        """Draw what follows on the -x side wall instead of the front: local x runs along the wall
        (the +x end at the street corner), local z = 0 is the plane x = x_face. turned(None) ends it."""
        if x_face is None:
            self.xf = self.xfh = None
            return
        self.xf = lambda q: (x_face + q[2], q[1], length / 2 - q[0])
        self.xfh = lambda h: (h[2], h[1], -h[0])

    def sign_rect(self, w, h, col):
        self.rects.append(dict(w=round(w, 3), h=round(h, 3), col=col))
        return len(self.rects) - 1

    def signface(self, i, col, ptsuv, hint):
        """One readable face of sign board i; ptsuv = [(point, (u, v) within the board)]."""
        f = self.face(SIGNFACE, [q for q, _ in ptsuv], hint, col='flat:' + col)
        if f is None or len(f.loops) != len(ptsuv):
            return
        uvs = [uv for _, uv in ptsuv]
        if self.reversed:
            uvs.reverse()
        for lp, uv in zip(f.loops, uvs):
            lp[self.uv].uv = uv
        f[self.sl] = i + 1

    def mi(self, name):
        if name not in self.mats:
            self.mats.append(name)
        return self.mats.index(name)

    def face(self, mat, pts, hint, col=None):
        if self.xf:
            pts = [self.xf(q) for q in pts]
            hint = self.xfh(hint)
        self.reversed = False
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
            self.reversed = True
        f = self.bm.faces.new([self.bm.verts.new(G(p)) for p in clean])
        f.material_index = self.mi(mat if mat in SPECIAL else PAINT)
        c = colour_of(col or mat)
        for lp in f.loops:
            lp[self.col] = c
        return f

    def box(self, mat, x0, y0, z0, x1, y1, z1, col=None):
        if mat == WINDOW:   # windows get their own materials so the game can light a share of them at night
            col = WINDOW
            mat = WINDOW_LIT if self.lit.random() < LIT_SHARE else WINDOW_DARK
        x0, x1 = min(x0, x1), max(x0, x1)
        y0, y1 = min(y0, y1), max(y0, y1)
        z0, z1 = min(z0, z1), max(z0, z1)
        self.face(mat, [(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], (1, 0, 0), col)
        self.face(mat, [(x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)], (-1, 0, 0), col)
        self.face(mat, [(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], (0, 1, 0), col)
        self.face(mat, [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0), col)
        self.face(mat, [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1), col)
        self.face(mat, [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], (0, 0, -1), col)

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
        meta, S = self.pack_signs()
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        for m in self.mats:
            me.materials.append(material(m))
        try:
            me.color_attributes.active_color_name = 'Col'
            me.color_attributes.render_color_index = 0
        except Exception as e:
            print('colour attribute:', name, e)
        ob = bpy.data.objects.new(name, me)
        ob.parent = parent
        if meta:   # exported as glTF extras
            ob['signs'] = json.dumps(meta)
            ob['atlas_m'] = round(S, 3)
        return ob

    def pack_signs(self):
        """Lay every sign board out in one square atlas and turn the per-board UVs into atlas UVs.

        Returns the boards as [{uv: [u0, v0, u1, v1], w, h, col}] (Blender UVs, v up; glTF stores 1 - v)
        and the side of the atlas in metres."""
        if not self.rects:
            return None, 0.0
        pad = 0.06
        order = sorted(range(len(self.rects)), key=lambda i: -self.rects[i]['h'])
        S = max(math.sqrt(sum((r['w'] + pad) * (r['h'] + pad) for r in self.rects)) * 1.1,
                max(r['w'] for r in self.rects) + pad, max(r['h'] for r in self.rects) + pad)
        while True:
            x = y = shelf = 0.0
            pos, ok = {}, True
            for i in order:
                r = self.rects[i]
                if x + r['w'] + pad > S:
                    x, y, shelf = 0.0, y + shelf, 0.0
                if y + r['h'] + pad > S:
                    ok = False
                    break
                pos[i] = (x + pad / 2, y + pad / 2)
                x += r['w'] + pad
                shelf = max(shelf, r['h'] + pad)
            if ok:
                break
            S *= 1.12
        for f in self.bm.faces:
            i = f[self.sl] - 1
            if i < 0:
                continue
            r, (px, py) = self.rects[i], pos[i]
            for lp in f.loops:
                a, b = lp[self.uv].uv
                lp[self.uv].uv = ((px + a * r['w']) / S, (py + b * r['h']) / S)
        meta = []
        for i, r in enumerate(self.rects):
            px, py = pos[i]
            meta.append(dict(uv=[round(px / S, 5), round(py / S, 5), round((px + r['w']) / S, 5), round((py + r['h']) / S, 5)],
                             w=r['w'], h=r['h'], col=r['col']))
        return meta, S



def look(cam, loc, target):
    from mathutils import Vector
    cam.location = G(loc)
    d = Vector(G(target)) - Vector(G(loc))
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


# ── Shared by the building scripts ──

WINDOW = 'flat:#2b3740'
SHOPGLASS = 'flat:#4a5a5e'
FRAME = 'flat:#3a3d42'
DARK = 'flat:#1d1f22'
CONC = 'flat:#8d8f8c'
ROOF = 'flat:#6c7074'
KICK = 'flat:#4d4f52'
TANK = 'flat:#d9d5c4'
ACU = 'flat:#c9c8c0'
STEEL = 'metal:#8d9094'
INK_LIGHT = 'flat:#f7f4ea'
INK_DARK = 'flat:#1f2023'
VEND = 'flat:#e9e7e0'
HEDGE = 'flat:#3f6b3a'

SIGN_COLOURS = ['#c8102e', '#f2c230', '#1f5fa8', '#1d8a4e', '#f4f1e8', '#e86a1c', '#26282c', '#d94f8a', '#7a3fa0', '#0e8f9c']

LO_Z = 150.0   # where the simplified copies stand in the .blend, clear of the preview cameras


def lum(hexcol):
    h = hexcol.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return 0.299 * r + 0.587 * g + 0.114 * b


def sign(s, col, x0, y0, z0, x1, y1, z1, glyphs=True):
    """A sign board. The blocks stand in for lettering (drawn by the game later) on the faces people read."""
    (s.body or s).box('flat:' + col, x0, y0, z0, x1, y1, z1)
    if not glyphs:
        return
    # The readable faces go to the signs Part with UVs into a per-building atlas: u runs left to
    # right as a passer-by reads the board, v runs up. A projecting board is readable from both sides
    # and both share one atlas rect. With +x on the viewer's left when facing the front, that means:
    e = 0.006
    if (x1 - x0) < (z1 - z0):
        i = s.sign_rect(z1 - z0, y1 - y0, col)
        s.signface(i, col, [((x1 + e, y0, z1), (0, 0)), ((x1 + e, y0, z0), (1, 0)), ((x1 + e, y1, z0), (1, 1)), ((x1 + e, y1, z1), (0, 1))], (1, 0, 0))
        s.signface(i, col, [((x0 - e, y0, z0), (0, 0)), ((x0 - e, y0, z1), (1, 0)), ((x0 - e, y1, z1), (1, 1)), ((x0 - e, y1, z0), (0, 1))], (-1, 0, 0))
    else:
        i = s.sign_rect(x1 - x0, y1 - y0, col)
        z = z0 - e
        s.signface(i, col, [((x1, y0, z), (0, 0)), ((x0, y0, z), (1, 0)), ((x0, y1, z), (1, 1)), ((x1, y1, z), (0, 1))], (0, 0, -1))


def win(p, x0, y0, x1, y1, z, out=-1, frame=FRAME, glass=WINDOW):
    """A framed window standing a few centimetres proud of a wall in the plane z, facing out (-1 = street)."""
    p.box(frame, x0, y0, z, x1, y1, z + out * 0.05)
    p.box(glass, x0 + 0.06, y0 + 0.06, z + out * 0.05, x1 - 0.06, y1 - 0.06, z + out * 0.06)
    if x1 - x0 > 1.1:
        m = (x0 + x1) / 2
        p.box(frame, m - 0.025, y0, z + out * 0.05, m + 0.025, y1, z + out * 0.075)


def tank(p, x, y, z, r=0.85, h=1.65):
    """Rooftop water tank on a steel stand, centred on (x, z) with its feet at y."""
    d = r * 0.76
    for dx in (-d, d):
        for dz in (-d, d):
            p.box(STEEL, x + dx - 0.04, y, z + dz - 0.04, x + dx + 0.04, y + 1.4, z + dz + 0.04)
    p.box(STEEL, x - r, y + 1.4, z - r, x + r, y + 1.48, z + r)
    p.cyl(TANK, (x, y + 1.48 + h / 2, z), 1, r, h, seg=14)


def acu(p, x, y, z, out=-1):
    """Air-conditioning outdoor unit, 0.9 wide from x, standing on y, its fan face at z looking out."""
    p.box(ACU, x, y, z, x + 0.9, y + 0.7, z - out * 0.34)
    p.box(DARK, x + 0.1, y + 0.08, z, x + 0.62, y + 0.62, z + out * 0.01)


def render_views(scene, out, kind, span, height):
    cam_data = bpy.data.cameras.new('preview')
    cam = bpy.data.objects.new('preview', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    r = scene.render
    r.engine = 'BLENDER_WORKBENCH'
    r.resolution_x, r.resolution_y = 1400, 900
    sh = scene.display.shading
    sh.light = 'STUDIO'
    sh.color_type = 'VERTEX'
    try:
        sh.show_cavity = True
        sh.show_shadows = True
    except Exception:
        pass
    world = bpy.data.worlds.new('preview')
    world.color = (0.55, 0.62, 0.70)
    scene.world = world
    cx = span / 2
    d = max(span * 1.15, height * 1.5, 22)
    views = {
        'front': ((cx - d * 0.55, height * 0.45, -d), (cx, height * 0.5, 0), 35),
        'street': ((cx - span * 0.4 - 3, 1.6, -8), (cx, height * 0.4, 0), 18),
        'back': ((cx + d * 0.55, height * 0.6, d + 10), (cx, height * 0.5, 10), 35),
        'roofs': ((cx + d * 0.4, height + d * 0.5, -d * 0.6), (cx, height, 6), 35),
        'lo': ((cx - d * 0.55, height * 0.45, LO_Z - d), (cx, height * 0.5, LO_Z), 35),
    }
    for name, (loc, target, lens) in views.items():
        look(cam, loc, target)
        cam_data.lens = lens
        cam_data.clip_end = 800
        r.filepath = os.path.join(out, '%s_%s.png' % (kind, name))
        bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)


def run(kind, variants, build_hi, build_lo):
    """Build every variant in a row, export public/models/buildings/<kind>.glb and save the .blend.

    build_hi(v) returns (body, signs) Parts; build_lo(v) returns one Part or None.
    Roots: <kind>_<id> with <...>_body and <...>_signs, and <kind>_<id>_lo with one mesh.
    """
    import sys
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    renders = argv[argv.index('--renders') + 1] if '--renders' in argv else None

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    col = bpy.data.collections.new(kind)
    scene.collection.children.link(col)

    objs = []
    x = 0.0
    for v in variants:
        x += v.get('pre', 0.0)
        cx = x + v['w'] / 2
        name = '%s_%s' % (kind, v['id'])
        root = bpy.data.objects.new(name, None)
        root.location = G((cx, 0, 0))
        made = [root]
        body, signs = build_hi(v)
        has_signs = bool(signs) and len(signs.bm.faces) > 0
        made.append(body.finish(name + '_body', root))
        if has_signs:
            made.append(signs.finish(name + '_signs', root))
        lo = build_lo(v)
        if lo:
            lo_root = bpy.data.objects.new(name + '_lo', None)
            lo_root.location = G((cx, 0, LO_Z))
            made += [lo_root, lo.finish(name + '_lo_mesh', lo_root)]
        for ob in made:
            col.objects.link(ob)
        objs += made
        x += v['w'] + v.get('gap', 0.15)
    bpy.context.view_layer.update()

    height = 0.0
    for ob in objs:
        if ob.type == 'MESH':
            ob.data.calc_loop_triangles()
            height = max([height] + [vt.co.z for vt in ob.data.vertices])
            print('STAT', ob.name, len(ob.data.loop_triangles), 'tris', len(ob.data.materials), 'materials')

    blend = os.path.join(ROOT, 'assets', 'buildings', kind + '.blend')
    glb = os.path.join(ROOT, 'public', 'models', 'buildings', kind + '.glb')
    os.makedirs(os.path.dirname(blend), exist_ok=True)
    os.makedirs(os.path.dirname(glb), exist_ok=True)

    for ob in bpy.context.view_layer.objects:
        ob.select_set(ob in objs)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_extras=True)
    print('EXPORTED', glb, os.path.getsize(glb))

    if renders:
        os.makedirs(renders, exist_ok=True)
        render_views(scene, renders, kind, x, height)

    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    print('SAVED', blend)
