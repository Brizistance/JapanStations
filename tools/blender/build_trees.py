# Builds the trees: twelve kinds common in Japanese streets, parks and shrine grounds, each with its
# own silhouette, in two sizes, and in spring, summer and autumn where the tree changes.
#
#   blender --background --python tools/blender/build_trees.py -- [--renders <dir>]
#
# Writes assets/buildings/trees.blend and public/models/buildings/trees.glb.
#
# Frame and helpers: see buildkit.py. One root per tree, trees_<kind>_<a|b>[_<sp|su|au>], with one
# mesh; the origin is at the foot of the trunk. src/stations/trees.ts places them and the renderer
# picks the season (src/render/season.ts). Evergreens have no season suffix.
# Street kinds follow the 2022 national street-tree survey (ginkgo, cherry, zelkova, flowering
# dogwood, trident maple are the five most planted).

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

BARK = 'flat:#5a4a3c'
BARK_DK = 'flat:#3a302a'
BARK_LT = 'flat:#8a7a66'
SEASONS = ('sp', 'su', 'au', 'wi')

import numpy as np  # noqa: E402  (ships with Blender)
import bpy  # noqa: E402

# ── The painted sheets ──────────────────────────────────────────────────────────────────────────
# Two pictures, painted here by script and saved beside the models: a sheet of leaf sprays (one cell
# per kind and season, with see-through gaps) and a sheet of barks (one cell per kind). The leaf
# cards and trunks below carry UVs into them; the game loads the two files (building-models.ts).
# They can be repainted by hand in Blender afterwards: the game only reads the PNGs.
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'public', 'models', 'buildings')
LN, LC = 8, 256        # leaf sheet: 8 × 8 cells of 256 px
BN, BC = 4, 256        # bark sheet: 4 × 4 cells
LEAF_CELL, BARK_CELL = {}, {}


def rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def ell(img, x, y, a, b, ang, col, alpha=1.0):
    """Fill a rotated ellipse (centre x, y; half axes a, b; all in pixels)."""
    n = img.shape[0]
    R = int(max(a, b)) + 2
    x0, x1, y0, y1 = max(0, int(x) - R), min(n, int(x) + R + 1), max(0, int(y) - R), min(n, int(y) + R + 1)
    if x0 >= x1 or y0 >= y1:
        return
    yy, xx = np.mgrid[y0:y1, x0:x1]
    c, s_ = math.cos(ang), math.sin(ang)
    u = (xx - x) * c + (yy - y) * s_
    v = -(xx - x) * s_ + (yy - y) * c
    m = (u / max(a, 0.5)) ** 2 + (v / max(b, 0.5)) ** 2 <= 1
    sub = img[y0:y1, x0:x1]
    sub[m, 0:3] = col
    sub[m, 3] = np.maximum(sub[m, 3], alpha)


def shade(col, r, lo=0.78, hi=1.08):
    k = r.uniform(lo, hi)
    return [min(1, c * k) for c in col]


def leaf_shape(img, r, shape, x, y, size, ang, col):
    if shape == 'oval':
        ell(img, x, y, size, size * 0.45, ang, col)
        ell(img, x, y, size * 0.9, size * 0.06, ang, [c * 0.75 for c in col])
    elif shape == 'fan':      # ginkgo
        for k in range(-3, 4):
            ell(img, x + size * 0.5 * math.cos(ang + k * 0.26), y + size * 0.5 * math.sin(ang + k * 0.26), size * 0.55, size * 0.2, ang + k * 0.26, col)
    elif shape == 'star':     # maples
        for k in range(-2, 3):
            ell(img, x + size * 0.45 * math.cos(ang + k * 0.62), y + size * 0.45 * math.sin(ang + k * 0.62), size * 0.55, size * 0.15, ang + k * 0.62, col)
    elif shape == 'blossom':  # five petals round a darker eye
        for k in range(5):
            a = ang + k * 1.257
            ell(img, x + size * 0.42 * math.cos(a), y + size * 0.42 * math.sin(a), size * 0.42, size * 0.3, a, col)
        ell(img, x, y, size * 0.16, size * 0.16, 0, [col[0] * 0.85, col[1] * 0.6, col[2] * 0.7])
    elif shape == 'bract':    # dogwood: four broad bracts
        for k in range(4):
            a = ang + k * 1.571
            ell(img, x + size * 0.4 * math.cos(a), y + size * 0.4 * math.sin(a), size * 0.45, size * 0.33, a, col)
        ell(img, x, y, size * 0.14, size * 0.14, 0, [0.55, 0.62, 0.3])
    elif shape == 'needle':   # pine and cedar: a fan of thin needles
        for k in range(9):
            a = ang + (k - 4) * 0.2
            ell(img, x + size * 0.5 * math.cos(a), y + size * 0.5 * math.sin(a), size * 0.55, max(1.0, size * 0.035), a, shade(col, r))
    elif shape == 'lance':    # willow and bamboo: long thin leaves
        ell(img, x, y, size, size * 0.14, ang, col)


def spray(r, shape, cols, twig, n=5, per=11, size=14, flowers=None, hang=False):
    """One cell: twigs running out from the middle (or hanging down), leaves along them."""
    img = np.zeros((LC, LC, 4), dtype=np.float32)
    cols = [rgb(c) for c in cols]
    for t in range(n):
        if hang:
            x, y, ang = LC * (0.12 + 0.76 * (t + r.uniform(0.2, 0.8)) / n), LC * 0.97, -math.pi / 2 + r.uniform(-0.08, 0.08)
            length = LC * r.uniform(0.75, 0.94)
        else:
            ang = 2 * math.pi * (t + r.uniform(-0.3, 0.3)) / n
            x, y, length = LC / 2, LC / 2, LC * r.uniform(0.3, 0.46)
        ell(img, x + math.cos(ang) * length / 2, y + math.sin(ang) * length / 2, length / 2, 1.6, ang, rgb(twig))
        for k in range(per):
            f = (k + r.uniform(0.2, 0.9)) / per
            px, py = x + math.cos(ang) * length * f, y + math.sin(ang) * length * f
            side = 1 if k % 2 else -1
            la = ang + side * r.uniform(0.5, 1.1) if not hang else ang + side * r.uniform(0.15, 0.45)
            s_ = size * r.uniform(0.75, 1.2) * (1.05 - 0.3 * f)
            if flowers and r.random() < flowers[1]:
                leaf_shape(img, r, flowers[0], px + math.cos(la) * s_ * 0.6, py + math.sin(la) * s_ * 0.6, s_ * 0.9, r.uniform(0, 6.3), shade(rgb(r.choice(flowers[2])), r, 0.92, 1.05))
            else:
                leaf_shape(img, r, shape, px + math.cos(la) * s_ * 0.7, py + math.sin(la) * s_ * 0.7, s_, la, shade(r.choice(cols), r))
    if not hang:
        # Fill between the twigs so that a card reads as a mass of leaves, not a star.
        for _ in range(int(n * per * 0.9)):
            a_, d_ = r.uniform(0, 2 * math.pi), LC * 0.44 * math.sqrt(r.random())
            px, py = LC / 2 + d_ * math.cos(a_), LC / 2 + d_ * math.sin(a_)
            if flowers and r.random() < flowers[1]:
                leaf_shape(img, r, flowers[0], px, py, size * r.uniform(0.7, 1.0), r.uniform(0, 6.3), shade(rgb(r.choice(flowers[2])), r, 0.92, 1.05))
            else:
                leaf_shape(img, r, shape, px, py, size * r.uniform(0.75, 1.15), r.uniform(0, 6.3), shade(r.choice(cols), r))
    return img


def scatter(r, shape, cols, n=46, size=9):
    """Fallen leaves or petals lying on the ground: sparse, all over the cell."""
    img = np.zeros((LC, LC, 4), dtype=np.float32)
    for _ in range(n):
        leaf_shape(img, r, shape, r.uniform(8, LC - 8), r.uniform(8, LC - 8), size * r.uniform(0.7, 1.2), r.uniform(0, 6.3), shade(rgb(r.choice(cols)), r))
    return img


def bark(r, kind):
    rng = np.random.default_rng(r.randrange(1 << 30))
    n = BC

    def smooth(v, k):
        ker = np.ones(k) / k
        return np.convolve(np.concatenate([v, v, v]), ker, mode='same')[n:2 * n]

    cols_ = smooth(rng.random(n), 5) * 0.6 + smooth(rng.random(n), 17) * 0.4
    rows_ = smooth(rng.random(n), 5) * 0.6 + smooth(rng.random(n), 23) * 0.4
    wob = (smooth(rng.random(n), 31) * 14).astype(int)
    yy, xx = np.mgrid[0:n, 0:n]
    furrow = cols_[(xx + wob[yy]) % n]
    band = rows_[(yy + wob[xx]) % n]
    fine = rng.random((n, n))
    if kind in ('ginkgo', 'zelkova_old', 'camphor', 'tokaede', 'willow'):
        v, base = 0.45 + 1.1 * (furrow - 0.5) + 0.12 * (fine - 0.5), {'ginkgo': '#8f8a7c', 'camphor': '#6f5f4c', 'tokaede': '#7c6f5e', 'willow': '#6a5d4c'}.get(kind, '#857f72')
    elif kind == 'cherry':
        v, base = 0.5 + 0.5 * (band - 0.5) + 0.1 * (fine - 0.5), '#4a3630'
        v = v + 0.35 * ((rows_[(yy * 3) % n] > 0.56) & (cols_[(xx * 2) % n] > 0.42))   # pale lenticel dashes
    elif kind == 'pine':
        v, base = 0.55 + 1.3 * (furrow - 0.5) * (0.6 + band) + 0.1 * (fine - 0.5), '#4f3d33'
        v = v - 0.3 * (np.abs(furrow - 0.5) < 0.03) - 0.2 * (np.abs(band - 0.5) < 0.02)
    elif kind == 'cedar':
        v, base = 0.5 + 0.5 * (cols_[(xx * 4 + wob[yy]) % n] - 0.5) + 0.25 * (fine - 0.5), '#7a4f3a'
    elif kind == 'bamboo':
        v, base = 0.55 + 0.15 * (furrow - 0.5), '#86a544'
        node = (yy % 64)
        v = v - 0.35 * (node < 3) + 0.25 * ((node >= 3) & (node < 7))
    else:   # zelkova, dogwood, momiji: smooth and mottled
        v, base = 0.5 + 0.3 * (smooth(rng.random(n), 41)[(xx + yy // 3) % n] - 0.5) + 0.1 * (fine - 0.5), {'momiji': '#7d7b6a', 'dogwood': '#6c6258'}.get(kind, '#8d8a80')
    v = np.clip(v, 0.15, 1.0)
    img = np.ones((n, n, 4), dtype=np.float32)
    for k, c in enumerate(rgb(base)):
        img[:, :, k] = np.clip(c * (0.55 + 0.9 * v), 0, 1)
    return img


def save(name, arr):
    h, w = arr.shape[0], arr.shape[1]
    img = bpy.data.images.new(name, w, h, alpha=True)
    img.pixels.foreach_set(arr.ravel())
    img.filepath_raw = os.path.join(OUT, name + '.png')
    img.file_format = 'PNG'
    img.save()
    print('PAINTED', img.filepath_raw)


def paint_sheets():
    r = random.Random(101)
    twig = '#5a4636'
    G = {'sp': ['#a9cf62', '#9cc35a', '#b8d86e'], 'su': ['#5f9a3c', '#4f8a3a', '#6aa544'], 'dk': ['#2f5a3a', '#366343', '#2a5234']}
    specs = {
        ('ginkgo', 'sp'): dict(shape='fan', cols=G['sp']), ('ginkgo', 'su'): dict(shape='fan', cols=G['su']),
        ('ginkgo', 'au'): dict(shape='fan', cols=['#e8c02a', '#f0cf3a', '#d9ad22']),
        ('zelkova', 'sp'): dict(shape='oval', cols=G['sp'], size=11, per=14), ('zelkova', 'su'): dict(shape='oval', cols=G['su'], size=11, per=14),
        ('zelkova', 'au'): dict(shape='oval', cols=['#c9772e', '#b8642a', '#d98f3a'], size=11, per=14),
        ('dogwood', 'sp'): dict(shape='oval', cols=['#8fbf5a', '#7fb35a'], size=12, flowers=('bract', 0.6, ['#f6f1f0', '#f1e6e8', '#eeb2c6'])),
        ('dogwood', 'su'): dict(shape='oval', cols=['#5c9a45', '#52903f'], size=13), ('dogwood', 'au'): dict(shape='oval', cols=['#a8452e', '#b85a32', '#8f3a2a'], size=13),
        ('tokaede', 'sp'): dict(shape='star', cols=['#9fca62', '#aed46c']), ('tokaede', 'su'): dict(shape='star', cols=['#4f8f3f', '#458438', '#5b9a47']),
        ('tokaede', 'au'): dict(shape='star', cols=['#d9682a', '#e8a32a', '#c9502a']),
        ('azalea', 'sp'): dict(shape='oval', cols=['#3f7a3f', '#4a8a45'], size=8, per=16, n=7, flowers=('blossom', 0.35, ['#d9418c', '#e85aa0', '#c8327a'])),
        ('azalea', 'su'): dict(shape='oval', cols=['#3f7a3f', '#4a8a45', '#35683a'], size=8, per=16, n=7),
        ('azalea', 'au'): dict(shape='oval', cols=['#3f7a3f', '#5a7a3a', '#35683a'], size=8, per=16, n=7),
        ('cherry', 'sp'): dict(shape='oval', cols=['#b8c98a'], size=7, per=13, n=6, flowers=('blossom', 0.86, ['#f6d9e2', '#f1c8d6', '#f9e6ec', '#fbeef2'])),
        ('cherry', 'su'): dict(shape='oval', cols=['#4f8a3a', '#467f36', '#5a9642'], size=14), ('cherry', 'au'): dict(shape='oval', cols=['#b8642e', '#c9772e', '#a8502a', '#d9a03a'], size=13, per=7),
        ('momiji', 'sp'): dict(shape='star', cols=['#b9d65a', '#c8dc6a', '#d9a05a'], size=11, per=13), ('momiji', 'su'): dict(shape='star', cols=['#5d9a3f', '#52903a'], size=11, per=13),
        ('momiji', 'au'): dict(shape='star', cols=['#c8301e', '#d9452a', '#b0281c', '#e0602a'], size=11, per=13),
        ('willow', 'sp'): dict(shape='lance', cols=['#b8d96a', '#c4e078'], hang=True, n=7, per=22, size=11),
        ('willow', 'su'): dict(shape='lance', cols=['#8fbf5a', '#82b450', '#9cc866'], hang=True, n=7, per=22, size=11),
        ('willow', 'au'): dict(shape='lance', cols=['#c9b84a', '#b8a83e', '#d6c65a'], hang=True, n=7, per=18, size=11),
        # Winter: bare twigs for every tree that drops its leaves; the hedge stays green.
        ('twig', ''): dict(shape='lance', cols=['#5a4636', '#6a5444', '#4a3a2e'], n=9, per=9, size=10),
        ('willow', 'wi'): dict(shape='lance', cols=['#8a7a4a', '#7a6a40'], hang=True, n=7, per=5, size=6),
        ('azalea', 'wi'): dict(shape='oval', cols=['#3a6a3a', '#4a703a', '#35603a'], size=8, per=16, n=7),
        ('pine', ''): dict(shape='needle', cols=G['dk'], n=7, per=6, size=30), ('cedar', ''): dict(shape='needle', cols=['#2f5a3f', '#28503a', '#366346'], n=8, per=9, size=17),
        ('camphor', ''): dict(shape='oval', cols=['#3f7a3f', '#4a8a45', '#6fa04a', '#356e38'], size=12, per=14, n=6),
        ('bamboo', ''): dict(shape='lance', cols=['#6f9a3a', '#82ad45', '#5c8a34'], n=6, per=7, size=20),
    }
    sheet = np.zeros((LN * LC, LN * LC, 4), dtype=np.float32)
    cells = [(k, spray(r, v['shape'], v['cols'], '#7fa03a' if k[0] == 'bamboo' else twig, n=v.get('n', 7) + (4 if v.get('hang') else 0), per=v.get('per', 12), size=v.get('size', 15),
                       flowers=v.get('flowers'), hang=v.get('hang', False))) for k, v in specs.items()]
    cells += [(('fall', 'yellow'), scatter(r, 'fan', ['#e8c02a', '#f0cf3a', '#d9ad22'])), (('fall', 'red'), scatter(r, 'star', ['#c8301e', '#d9682a', '#e8a32a'])),
              (('fall', 'brown'), scatter(r, 'oval', ['#c9772e', '#b8642a', '#a8502a'])), (('fall', 'petal'), scatter(r, 'oval', ['#f6d9e2', '#f9e6ec', '#f1c8d6'], n=90, size=5))]
    for i, (key, img) in enumerate(cells):
        # Colour the see-through pixels like the leaves round them, so far-off copies do not go dark at the edges.
        solid = img[:, :, 3] > 0
        mean = img[solid][:, 0:3].mean(axis=0) if solid.any() else np.array([0.3, 0.5, 0.3])
        img[~solid, 0:3] = mean
        cx, cy = i % LN, i // LN
        sheet[cy * LC:(cy + 1) * LC, cx * LC:(cx + 1) * LC] = img
        LEAF_CELL[key] = (cx, cy)
    save('trees_leaves', sheet)
    barks = np.ones((BN * BC, BN * BC, 4), dtype=np.float32)
    for i, kind in enumerate(['ginkgo', 'zelkova', 'dogwood', 'tokaede', 'cherry', 'momiji', 'pine', 'camphor', 'cedar', 'willow', 'bamboo']):
        cx, cy = i % BN, i // BN
        barks[cy * BC:(cy + 1) * BC, cx * BC:(cx + 1) * BC] = bark(r, kind)
        BARK_CELL[kind] = (cx, cy)
    BARK_CELL['azalea'] = BARK_CELL['dogwood']
    save('trees_bark', barks)


# What is being built now: its leaf cell, its bark cell, the season.
CUR = dict(leaf=(0, 0), bark=(0, 0), kind='', season='su')


def uvface(p, mat, pts, uvs, hint, col='flat:#ffffff'):
    f = p.face(mat, pts, hint, col=col)
    if f is None or len(f.loops) != len(uvs):
        return
    uvs = list(uvs)
    if p.reversed:
        uvs.reverse()
    for lp, uv in zip(f.loops, uvs):
        lp[p.uv].uv = uv


def cell_uv(cell, n, m=0.004):
    u0, v0 = cell[0] / n + m, cell[1] / n + m
    u1, v1 = (cell[0] + 1) / n - m, (cell[1] + 1) / n - m
    return [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]


def card(p, c, right, up, hw, hh, cell, tint):
    """One leaf card: a flat quad centred on c carrying the kind's leaf spray."""
    pts = [tuple(c[i] + sx * right[i] * hw + sy * up[i] * hh for i in range(3)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    nrm = (right[1] * up[2] - right[2] * up[1], right[2] * up[0] - right[0] * up[2], right[0] * up[1] - right[1] * up[0])
    g = int(255 * tint)
    uvface(p, 'leafcard', pts, cell_uv(cell, LN), nrm, col='flat:#%02x%02x%02x' % (g, g, g))


def tube(p, mat, a, b, r0, r1=None, seg=6):
    """A tapering trunk or branch from a to b, wrapped in the kind's bark (`mat` is kept for its tone only)."""
    r1 = r0 if r1 is None else r1
    d = [b[i] - a[i] for i in range(3)]
    L = math.sqrt(sum(c * c for c in d)) or 1e-6
    d = [c / L for c in d]
    ref = (0, 1, 0) if abs(d[1]) < 0.9 else (1, 0, 0)
    u = [d[1] * ref[2] - d[2] * ref[1], d[2] * ref[0] - d[0] * ref[2], d[0] * ref[1] - d[1] * ref[0]]
    n = math.sqrt(sum(c * c for c in u))
    u = [c / n for c in u]
    v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]]
    cx, cy = CUR['bark']
    m = 0.006
    v0, v1 = cy / BN + m, cy / BN + m + (1 / BN - 2 * m) * min(1.0, max(0.25, L / 4.0))

    def P(o, r, k):
        t = 2 * math.pi * k / seg
        return tuple(o[i] + r * (math.cos(t) * u[i] + math.sin(t) * v[i]) for i in range(3))

    for k in range(seg):
        t = 2 * math.pi * (k + 0.5) / seg
        hint = tuple(math.cos(t) * u[i] + math.sin(t) * v[i] for i in range(3))
        ua, ub = cx / BN + m + (1 / BN - 2 * m) * k / seg, cx / BN + m + (1 / BN - 2 * m) * (k + 1) / seg
        uvface(p, 'bark', [P(a, r0, k), P(a, r0, k + 1), P(b, r1, k + 1), P(b, r1, k)], [(ua, v0), (ub, v0), (ub, v1), (ua, v1)], hint)


def solid_blob(p, mat, c, rx, ry, rz, seg=6, rings=3):
    def P(i, j):
        if i == 0:
            return (c[0], c[1] + ry, c[2])
        if i == rings:
            return (c[0], c[1] - ry, c[2])
        th = math.pi * i / rings
        ph = 2 * math.pi * (j % seg) / seg
        return (c[0] + rx * math.sin(th) * math.cos(ph), c[1] + ry * math.cos(th), c[2] + rz * math.sin(th) * math.sin(ph))

    for i in range(rings):
        for j in range(seg):
            th = math.pi * (i + 0.5) / rings
            ph = 2 * math.pi * (j + 0.5) / seg
            p.face(mat, [P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j)], (math.sin(th) * math.cos(ph), math.cos(th), math.sin(th) * math.sin(ph)))


def blob(p, mat, c, rx, ry, rz, seg=7, rings=4, r=None):
    """A mass of leaves centred on c: a small dark core that keeps the crown from looking empty, and
    leaf cards scattered through and over it. A tall narrow mass (a willow's curtain) hangs its cards."""
    if max(rx, ry, rz) < 0.2:      # a single flower on a hedge
        solid_blob(p, mat, c, rx, ry, rz, 5, 2)
        return
    rr = random.Random(hash((round(c[0], 2), round(c[1], 2), round(c[2], 2))) & 0xffffff)
    h = mat.split('#')[1]
    dark = 'flat:#%02x%02x%02x' % tuple(int(int(h[i:i + 2], 16) * 0.62) for i in (0, 2, 4))
    hang = ry > 1.8 * max(rx, rz)
    flat = ry < 0.45 * max(rx, rz)
    bare = CUR['season'] == 'wi' and CUR['kind'] != 'azalea' and (CUR['kind'], '') not in LEAF_CELL
    if not hang and not bare:
        solid_blob(p, dark, c, rx * 0.5, ry * 0.5, rz * 0.5)
    cell = CUR['leaf']
    n = max(5, min(16, int(3.2 * (rx * ry * rz) ** 0.33 * (1.6 if not flat else 1.2)) + 4))
    for _ in range(n):
        ph, ct = rr.uniform(0, 2 * math.pi), rr.uniform(-0.55, 1.0)
        st = math.sqrt(max(0, 1 - ct * ct))
        dirv = (st * math.cos(ph), ct, st * math.sin(ph))
        f = rr.uniform(0.55, 1.0)
        pos = (c[0] + dirv[0] * rx * f, c[1] + dirv[1] * ry * f, c[2] + dirv[2] * rz * f)
        tint = rr.uniform(0.78, 1.0) * (0.86 + 0.14 * max(0, ct))
        if hang:
            # A curtain: tall cards hanging, turned round the trunk.
            right = (-math.sin(ph), 0, math.cos(ph))
            card(p, (pos[0], c[1] + rr.uniform(-0.1, 0.1) * ry, pos[2]), right, (0, 1, 0), max(0.45, rx * 1.3), ry * rr.uniform(0.85, 1.0), cell, tint)
            continue
        nrm = dirv if not flat else (dirv[0] * 0.35, 0.94, dirv[2] * 0.35)
        nrm = tuple(nrm[i] + rr.uniform(-0.35, 0.35) for i in range(3))
        ln = math.sqrt(sum(q * q for q in nrm)) or 1
        nrm = tuple(q / ln for q in nrm)
        ref = (0, 1, 0) if abs(nrm[1]) < 0.85 else (1, 0, 0)
        right = (ref[1] * nrm[2] - ref[2] * nrm[1], ref[2] * nrm[0] - ref[0] * nrm[2], ref[0] * nrm[1] - ref[1] * nrm[0])
        lr = math.sqrt(sum(q * q for q in right)) or 1
        right = tuple(q / lr for q in right)
        up = (nrm[1] * right[2] - nrm[2] * right[1], nrm[2] * right[0] - nrm[0] * right[2], nrm[0] * right[1] - nrm[1] * right[0])
        roll = rr.uniform(0, 2 * math.pi)
        cr, sr = math.cos(roll), math.sin(roll)
        r2 = tuple(right[i] * cr + up[i] * sr for i in range(3))
        u2 = tuple(-right[i] * sr + up[i] * cr for i in range(3))
        size = max(0.5, min(1.5, 0.62 * max(rx, rz))) * rr.uniform(0.8, 1.15)
        card(p, pos, r2, u2, size, size, cell, tint)


def fallen(p, k):
    """Leaves or petals lying round the foot of the tree, in the seasons that drop them."""
    kind, season = CUR['kind'], CUR['season']
    what = None
    if season == 'au':
        what = {'ginkgo': 'yellow', 'momiji': 'red', 'tokaede': 'red', 'dogwood': 'red', 'zelkova': 'brown', 'cherry': 'brown', 'willow': 'yellow'}.get(kind)
    elif season == 'sp' and kind == 'cherry':
        what = 'petal'
    if not what:
        return
    cell = LEAF_CELL[('fall', what)]
    rad = {'ginkgo': 2.0, 'cherry': 3.6, 'zelkova': 3.2, 'willow': 3.0}.get(kind, 2.4) * k
    for i, (dx, dz) in enumerate(((-0.5, -0.5), (0.5, -0.5), (-0.5, 0.5), (0.5, 0.5))):
        x, z = dx * rad, dz * rad
        pts = [(x - rad / 2, 0.02 + i * 0.002, z - rad / 2), (x + rad / 2, 0.02 + i * 0.002, z - rad / 2), (x + rad / 2, 0.02 + i * 0.002, z + rad / 2), (x - rad / 2, 0.02 + i * 0.002, z + rad / 2)]
        uvs = cell_uv(cell, LN)
        uvface(p, 'leafcard', pts, uvs[i:] + uvs[:i], (0, 1, 0), col='flat:#e6e6e6')


def leaves(season, sp, su, au):
    # Winter: bare. The colour only tints the twig cards.
    return {'sp': sp, 'su': su, 'au': au, 'wi': ['#6a5a4c', '#75655a']}[season]


def pick(r, cols):
    return 'flat:' + r.choice(cols)


def ginkgo(p, k, season, seed):
    """Narrow cone on a straight trunk; fan leaves turn clear yellow."""
    r = random.Random(seed)
    cols = leaves(season, ['#a9cf62', '#9cc35a'], ['#5f9a3c', '#548f38', '#6aa544'], ['#e8c02a', '#f0cf3a', '#d9ad22'])
    H = 10.5 * k
    tube(p, BARK_LT, (0, 0, 0), (0, H * 0.9, 0), 0.2 * k, 0.05 * k)
    n = 9
    for i in range(n):
        t = i / (n - 1)
        y = H * (0.3 + 0.68 * t)
        rad = (1.9 - 1.5 * t) * k
        a = i * 2.4 + seed
        blob(p, pick(r, cols), (0.35 * k * math.cos(a), y, 0.35 * k * math.sin(a)), rad, 0.95 * k, rad, r=True)
    for i in range(4):
        a = i * math.pi / 2 + 0.5
        tube(p, BARK_LT, (0, H * 0.34, 0), (1.3 * k * math.cos(a), H * 0.5, 1.3 * k * math.sin(a)), 0.07 * k, 0.03 * k, seg=5)


def zelkova(p, k, season, seed):
    """Vase: a short trunk fanning into a wide, flat-topped crown."""
    r = random.Random(seed)
    cols = leaves(season, ['#a8cc6a', '#9cc35a'], ['#4f8a3a', '#467f36', '#5a9642'], ['#c9772e', '#b8642a', '#d98f3a'])
    H = 11 * k
    tube(p, BARK_LT, (0, 0, 0), (0, H * 0.3, 0), 0.26 * k, 0.2 * k)
    n = 7
    for i in range(n):
        a = i * 2 * math.pi / n + seed
        ex, ez = 3.2 * k * math.cos(a), 3.2 * k * math.sin(a)
        tube(p, BARK_LT, (0, H * 0.28, 0), (ex * 0.55, H * 0.6, ez * 0.55), 0.13 * k, 0.07 * k, seg=5)
        tube(p, BARK_LT, (ex * 0.55, H * 0.6, ez * 0.55), (ex, H * 0.82, ez), 0.07 * k, 0.03 * k, seg=5)
        blob(p, pick(r, cols), (ex, H * 0.84, ez), 2.1 * k, 1.2 * k, 2.1 * k, r=True)
    for i in range(3):
        a = i * 2.1 + seed
        blob(p, pick(r, cols), (1.1 * k * math.cos(a), H * 0.92, 1.1 * k * math.sin(a)), 2.4 * k, 1.1 * k, 2.4 * k, r=True)


def dogwood(p, k, season, seed):
    """Small tree in flat tiers; white or pink bracts in spring, red leaves in autumn."""
    r = random.Random(seed)
    bloom = ['#f6f1f0', '#f1e6e8'] if seed % 2 else ['#eeb2c6', '#e9a0ba']
    cols = leaves(season, bloom, ['#5c9a45', '#52903f'], ['#a8452e', '#b85a32', '#8f3a2a'])
    H = 5 * k
    tube(p, BARK, (0, 0, 0), (0, H * 0.85, 0), 0.1 * k, 0.03 * k)
    for t, rad in ((0.45, 1.7), (0.65, 1.4), (0.85, 0.95)):
        for i in range(4):
            a = i * math.pi / 2 + t * 5 + seed
            x, z = rad * 0.6 * k * math.cos(a), rad * 0.6 * k * math.sin(a)
            tube(p, BARK, (0, H * (t - 0.05), 0), (x, H * t, z), 0.04 * k, 0.02 * k, seg=4)
            blob(p, pick(r, cols), (x, H * t + 0.1, z), rad * 0.62 * k, 0.32 * k, rad * 0.62 * k, seg=6, rings=3, r=True)
            if season == 'sp':
                blob(p, 'flat:#7fb35a', (x * 0.7, H * t - 0.12, z * 0.7), rad * 0.4 * k, 0.16 * k, rad * 0.4 * k, seg=5, rings=2)


def tokaede(p, k, season, seed):
    """Trident maple: a medium oval crown on a clean trunk; orange and yellow in autumn."""
    r = random.Random(seed)
    cols = leaves(season, ['#9fca62', '#aed46c'], ['#4f8f3f', '#458438', '#5b9a47'], ['#d9682a', '#e8a32a', '#c9502a'])
    H = 8.5 * k
    tube(p, BARK, (0, 0, 0), (0, H * 0.45, 0), 0.16 * k, 0.11 * k)
    for i in range(3):
        a = i * 2.09 + seed
        tube(p, BARK, (0, H * 0.4, 0), (1.2 * k * math.cos(a), H * 0.62, 1.2 * k * math.sin(a)), 0.08 * k, 0.03 * k, seg=5)
    for i in range(8):
        a = i * 2.4 + seed
        t = i / 7
        rad = (1.5 + 0.5 * math.sin(t * math.pi)) * k
        blob(p, pick(r, cols), (0.9 * k * math.cos(a) * (1 - t * 0.5), H * (0.55 + 0.4 * t), 0.9 * k * math.sin(a) * (1 - t * 0.5)), rad, 1.25 * k, rad, r=True)


def azalea(p, k, season, seed):
    """Clipped azalea hedge, 1.8 m long: magenta flowers in spring."""
    r = random.Random(seed)
    L = 1.8 * k
    blob(p, 'flat:#3f7a3f', (0, 0.36, 0), L / 2, 0.36, 0.42, seg=8, rings=4, r=True)
    p.box('flat:#35683a', -L / 2 + 0.1, 0, -0.32, L / 2 - 0.1, 0.3, 0.32)
    if season == 'sp':
        for i in range(16):
            a, b_ = r.uniform(0, 2 * math.pi), r.uniform(0.25, 1.2)
            x, y, z = (L / 2 - 0.05) * math.sin(b_) * math.cos(a), 0.36 + 0.37 * math.cos(b_), 0.43 * math.sin(b_) * math.sin(a)
            blob(p, pick(r, ['#d9418c', '#e85aa0', '#c8327a']), (x, y, z), 0.09, 0.07, 0.09, seg=5, rings=2)


def cherry(p, k, season, seed):
    """Somei-yoshino: a low fork and a wide spreading crown; clouds of pale pink in spring."""
    r = random.Random(seed)
    cols = leaves(season, ['#f6d9e2', '#f1c8d6', '#f9e6ec'], ['#4f8a3a', '#467f36', '#5a9642'], ['#b8642e', '#c9772e', '#a8502a'])
    H = 7.5 * k
    tube(p, BARK_DK, (0, 0, 0), (0, H * 0.25, 0), 0.24 * k, 0.2 * k)
    n = 6
    for i in range(n):
        a = i * 2 * math.pi / n + seed * 0.7
        ex, ez = 3.6 * k * math.cos(a), 3.6 * k * math.sin(a)
        mid = (ex * 0.45, H * 0.52, ez * 0.45)
        tube(p, BARK_DK, (0, H * 0.24, 0), mid, 0.13 * k, 0.07 * k, seg=5)
        tube(p, BARK_DK, mid, (ex, H * 0.62, ez), 0.07 * k, 0.03 * k, seg=5)
        blob(p, pick(r, cols), (ex * 0.95, H * 0.68, ez * 0.95), 1.9 * k, 1.0 * k, 1.9 * k, r=True)
        blob(p, pick(r, cols), (ex * 0.5, H * 0.8, ez * 0.5), 1.8 * k, 1.0 * k, 1.8 * k, r=True)
    blob(p, pick(r, cols), (0, H * 0.94, 0), 2.0 * k, 0.9 * k, 2.0 * k, r=True)


def momiji(p, k, season, seed):
    """Japanese maple: a low layered dome on a leaning trunk; scarlet in autumn."""
    r = random.Random(seed)
    cols = leaves(season, ['#b9d65a', '#c8dc6a', '#d9a05a'], ['#5d9a3f', '#52903a'], ['#c8301e', '#d9452a', '#b0281c'])
    H = 4.6 * k
    tube(p, BARK, (0, 0, 0), (0.3 * k, H * 0.4, 0.1 * k), 0.12 * k, 0.08 * k)
    for i in range(5):
        a = i * 1.257 + seed
        x, z = 0.3 * k + 1.5 * k * math.cos(a), 0.1 * k + 1.5 * k * math.sin(a)
        tube(p, BARK, (0.3 * k, H * 0.4, 0.1 * k), (x, H * 0.62, z), 0.05 * k, 0.02 * k, seg=4)
        blob(p, pick(r, cols), (x, H * 0.66, z), 1.25 * k, 0.4 * k, 1.25 * k, seg=6, rings=3, r=True)
        blob(p, pick(r, cols), (x * 0.55 + 0.1, H * 0.82, z * 0.55), 1.1 * k, 0.36 * k, 1.1 * k, seg=6, rings=3, r=True)
    blob(p, pick(r, cols), (0.3 * k, H * 0.96, 0.1 * k), 0.95 * k, 0.32 * k, 0.95 * k, seg=6, rings=3, r=True)


def pine(p, k, season, seed):
    """Black pine trained garden-style: a bent dark trunk carrying flat pads of needles."""
    r = random.Random(seed)
    cols = ['#2f5a3a', '#366343', '#2a5234']
    pts = [(0, 0, 0), (0.5 * k, 1.6 * k, 0.1 * k), (-0.1 * k, 3.1 * k, 0.4 * k), (0.6 * k, 4.6 * k, 0.0), (0.2 * k, 5.8 * k, -0.2 * k)]
    for i, (a, b_) in enumerate(zip(pts, pts[1:])):
        tube(p, BARK_DK, a, b_, (0.2 - i * 0.035) * k, (0.165 - i * 0.035) * k)
    for i, base in enumerate(pts[1:]):
        for s in (-1, 1) if i < 3 else (1,):
            a = i * 1.9 + seed + (0 if s > 0 else math.pi)
            ex, ez = base[0] + (2.0 - i * 0.35) * k * math.cos(a), base[2] + (2.0 - i * 0.35) * k * math.sin(a)
            tube(p, BARK_DK, base, (ex, base[1] + 0.25 * k, ez), 0.06 * k, 0.025 * k, seg=4)
            blob(p, pick(r, cols), (ex, base[1] + 0.42 * k, ez), 1.15 * k, 0.26 * k, 1.0 * k, seg=7, rings=3, r=True)
    blob(p, pick(r, cols), (pts[-1][0], pts[-1][1] + 0.25 * k, pts[-1][2]), 1.0 * k, 0.3 * k, 1.0 * k, seg=7, rings=3, r=True)


def camphor(p, k, season, seed):
    """Camphor: a massive short trunk under a very broad, heavy evergreen crown."""
    r = random.Random(seed)
    cols = ['#3f7a3f', '#4a8a45', '#6fa04a', '#356e38']
    H = 12 * k
    tube(p, BARK, (0, 0, 0), (0, H * 0.28, 0), 0.55 * k, 0.42 * k, seg=8)
    for i in range(5):
        a = i * 1.257 + seed
        tube(p, BARK, (0, H * 0.26, 0), (2.6 * k * math.cos(a), H * 0.55, 2.6 * k * math.sin(a)), 0.22 * k, 0.1 * k, seg=5)
    for i in range(8):
        a = i * 2 * math.pi / 8 + seed
        blob(p, pick(r, cols), (3.6 * k * math.cos(a), H * 0.6, 3.6 * k * math.sin(a)), 2.7 * k, 1.9 * k, 2.7 * k, r=True)
    for i in range(4):
        a = i * math.pi / 2 + 0.6
        blob(p, pick(r, cols), (1.6 * k * math.cos(a), H * 0.82, 1.6 * k * math.sin(a)), 2.8 * k, 1.8 * k, 2.8 * k, r=True)


def cedar(p, k, season, seed):
    """Japanese cedar: a tall straight trunk and a narrow dark column in tiers."""
    r = random.Random(seed)
    cols = ['#2f5a3f', '#28503a', '#366346']
    H = 15 * k
    tube(p, 'flat:#6a4a3a', (0, 0, 0), (0, H * 0.95, 0), 0.3 * k, 0.05 * k, seg=7)
    n = 8
    for i in range(n):
        t = i / (n - 1)
        y = H * (0.3 + 0.66 * t)
        rad = (2.0 - 1.6 * t) * k
        p.prism(pick(r, cols), [(-rad, y - 0.7 * k), (rad, y - 0.7 * k), (rad * 0.35, y + 1.0 * k), (-rad * 0.35, y + 1.0 * k)], 'z', -rad * 0.6, rad * 0.6)
        p.prism(pick(r, cols), [(-rad * 0.6, y - 0.6 * k), (rad * 0.6, y - 0.6 * k), (rad * 0.3, y + 1.0 * k), (-rad * 0.3, y + 1.0 * k)], 'z', -rad, rad)
        blob(p, pick(r, cols), (0, y + 0.1 * k, 0), rad * 1.05, 0.9 * k, rad * 1.05)


def willow(p, k, season, seed):
    """Weeping willow: branches arching out, then curtains of leaf hanging nearly to the ground."""
    r = random.Random(seed)
    cols = leaves(season, ['#b8d96a', '#c4e078'], ['#8fbf5a', '#82b450', '#9cc866'], ['#c9b84a', '#b8a83e', '#d6c65a'])
    H = 8 * k
    tube(p, BARK, (0, 0, 0), (0.2 * k, H * 0.42, 0), 0.22 * k, 0.15 * k)
    n = 9
    for i in range(n):
        a = i * 2 * math.pi / n + seed
        rad = r.uniform(2.2, 3.1) * k
        ex, ez = 0.2 * k + rad * math.cos(a), rad * math.sin(a)
        top = H * r.uniform(0.82, 0.96)
        tube(p, BARK, (0.2 * k, H * 0.4, 0), (ex * 0.6, top, ez * 0.6), 0.07 * k, 0.03 * k, seg=4)
        blob(p, pick(r, cols), (ex * 0.6, top, ez * 0.6), 1.3 * k, 0.6 * k, 1.3 * k, seg=6, rings=3, r=True)
        drop = H * r.uniform(0.5, 0.68)
        blob(p, pick(r, cols), (ex, top - drop / 2, ez), 0.5 * k, drop / 2, 0.5 * k, seg=5, rings=4)
        blob(p, pick(r, cols), (ex * 0.82 + 0.25 * k * math.sin(a), top - drop * 0.42, ez * 0.82 + 0.25 * k * math.cos(a)), 0.4 * k, drop * 0.42, 0.4 * k, seg=5, rings=4)


def bamboo(p, k, season, seed):
    """A clump of bamboo: thin green canes leaning out, tufts of leaf high up."""
    r = random.Random(seed)
    for i in range(11):
        a, rad = r.uniform(0, 2 * math.pi), r.uniform(0.1, 0.9) * k
        h = r.uniform(5.5, 8.5) * k
        lean = r.uniform(0.2, 0.9) * k
        x, z = rad * math.cos(a), rad * math.sin(a)
        tx, tz = x + lean * math.cos(a), z + lean * math.sin(a)
        tube(p, 'flat:#7fa03a', (x, 0, z), (tx, h, tz), 0.045 * k, 0.02 * k, seg=5)
        for t in (0.72, 0.86, 0.98):
            blob(p, pick(r, ['#6f9a3a', '#82ad45', '#5c8a34']), (x + (tx - x) * t + r.uniform(-0.3, 0.3), h * t, z + (tz - z) * t + r.uniform(-0.3, 0.3)),
                 0.6 * k, 0.32 * k, 0.6 * k, seg=5, rings=2, r=True)


KINDS = {'ginkgo': (ginkgo, True), 'zelkova': (zelkova, True), 'dogwood': (dogwood, True), 'tokaede': (tokaede, True), 'azalea': (azalea, True),
         'cherry': (cherry, True), 'momiji': (momiji, True), 'pine': (pine, False), 'camphor': (camphor, False), 'cedar': (cedar, False),
         'willow': (willow, True), 'bamboo': (bamboo, False)}
SIZES = {'a': (1.0, 3), 'b': (0.8, 8)}

def make(fn, kind, k, season, seed):
    def build(p):
        CUR.update(kind=kind, season=season, bark=BARK_CELL[kind], leaf=LEAF_CELL.get((kind, season)) or LEAF_CELL.get((kind, '')) or LEAF_CELL[('twig', '')])
        fn(p, k, season, seed)
        fallen(p, k)
    return build


def grate(p):
    """Cast-iron tree grate, 1.4 m square, flush with the pavement round a street tree's foot."""
    iron = 'flat:#3a3d41'
    for s_ in (-1, 1):
        p.box(iron, -0.7, 0, s_ * 0.7 - 0.03, 0.7, 0.03, s_ * 0.7 + 0.03)
        p.box(iron, s_ * 0.7 - 0.03, 0, -0.7, s_ * 0.7 + 0.03, 0.03, 0.7)
    for i in range(-5, 6):
        if abs(i) < 2:
            continue
        p.box(iron, i * 0.12 - 0.025, 0.005, -0.7, i * 0.12 + 0.025, 0.025, 0.7)
    for i in (-5, -4, -3, -2, 2, 3, 4, 5):
        p.box(iron, -0.2, 0.005, i * 0.12 - 0.025, 0.2, 0.025, i * 0.12 + 0.025)
    p.box('flat:#5a4a3c', -0.2, 0, -0.2, 0.2, 0.012, 0.2)


def stakes(p):
    """Support for a young tree: two posts and a cross tie with a rubber band round the trunk."""
    wood = 'flat:#b8a07a'
    for sx in (-0.45, 0.45):
        p.cyl(wood, (sx, 0.9, 0), 1, 0.04, 1.8, seg=6)
    p.cyl(wood, (0, 1.45, 0), 0, 0.035, 1.0, seg=6)
    p.cyl('flat:#2b2e33', (0, 1.45, 0), 1, 0.2, 0.06, seg=8, caps=False)


PROPS = {'grate': grate, 'stakes': stakes}
for _kind, (_fn, _seasonal) in KINDS.items():
    for _sz, (_k, _seed) in SIZES.items():
        for _s in (SEASONS if _seasonal else ('',)):
            PROPS['%s_%s%s' % (_kind, _sz, '_' + _s if _s else '')] = make(_fn, _kind, _k, _s, _seed)


def build_hi(v):
    body = Part()
    PROPS[v['id']](body)
    return body, None


if __name__ == '__main__':
    paint_sheets()
    run('trees', [dict(id=k, w=8, gap=2) for k in PROPS], build_hi, lambda v: None)
