# Builds the buildings fronting Hibarino's main road, Hibarino-dōri (the 2026-11 rebuild): a Kansai
# suburban junction town of the 1970s-2000s, grown round a viaduct station where two metro lines
# meet. Taller and busier than the hill suburbs: tenant buildings stacked with signs by the station,
# a fourteen-storey manshon tower over a row of shops, a pachinko hall, a cram school in glass, a
# clinic building of small practices, a two-storey 1970s row of shops with a tin parapet, and further
# out low flats over a shop. Pale tile and sky-blue panels, the station's colours, run through it.
#
#   blender --background --python tools/blender/build_hibarifront.py -- [--renders <dir>]
#
# Writes assets/buildings/hibarifront.blend, public/models/buildings/hibarifront.glb and
# src/stations/anchors/hibarifront.ts. Frame: front at z = 0 facing -z, origin mid-frontage; every
# piece is D deep. Nothing carries a name: boards are marked for the game to letter.

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kitakit import *  # noqa: E402,F401,F403

PALE = 'flat:#e7e9e8'
PALE_DK = 'flat:#c9cdcd'
SKY = 'flat:#5aa0d8'
SKY_DK = 'flat:#3f7fb4'
SAGE = 'flat:#8fae8f'
BEIGE = 'flat:#dcd3c0'
BRICKTILE = 'flat:#9a6a52'
TIN = 'flat:#7f8a8c'
SHUTTER = 'metal:#a7acb1'
SHUTTER_DK = 'metal:#8c9196'
LEAFY = 'flat:#3f6b3a'
AWNS = ['#2f6b45', '#7a1f2b', '#1f3f7a', '#c8102e', '#3f7fb4', '#8a6a3a']


def awning(p, x0, x1, y, col, depth=1.0, stripes=True):
    n = max(2, round((x1 - x0) / 0.9))
    for j in range(n):
        u0, u1 = x0 + (x1 - x0) * j / n, x0 + (x1 - x0) * (j + 1) / n
        c = 'flat:' + col if (j % 2 == 0 or not stripes) else 'flat:#f1ead8'
        p.face(c, [(u0, y, -0.02), (u1, y, -0.02), (u1, y - 0.5, -depth), (u0, y - 0.5, -depth)], (0, 0.9, -0.4))
        p.face(c, [(u1, y, -0.02), (u0, y, -0.02), (u0, y - 0.5, -depth), (u1, y - 0.5, -depth)], (0, -0.9, 0.4))


def shop_bay(p, s, a, e, y0, y1, r, kind='glass'):
    """One shop opening between a and e on the street storey: glass with a door, or a roller shutter."""
    if kind == 'shutter':
        p.box(SHUTTER, a, y0, -0.03, e, y1, 0.02)
        y = y0 + 0.2
        while y < y1 - 0.05:
            p.box(SHUTTER_DK, a, y, -0.045, e, y + 0.025, -0.03)
            y += 0.22
        p.box(SHUTTER_DK, a - 0.05, y1, -0.12, e + 0.05, y1 + 0.3, 0.02)
        return
    quad(p, 'windowDim', 'f', a + 0.15, e - 0.15, y0 + 0.15, y1 - 0.1, -0.02, col=WARM)
    for c in rows(a + 0.15, e - 0.15, 1.8):
        p.box(ALU, c - 0.9, y0 + 0.15, -0.05, c - 0.86, y1 - 0.1, 0)
    doors(p, (a + e) / 2 + (e - a) / 4, y0, -0.03, min(1.8, (e - a) / 2.4), 2.4, ALU)


def balconies(p, x0, x1, y, rail, r, bay=4.2, depth=1.2, wall=PALE, zo=0.0):
    """A floor of flats on a wall at z = zo: a slab, a solid balcony front in `rail` standing `depth`
    out, sliding windows, plants, laundry, AC units."""
    f = zo - depth
    p.box('flat:#d9d9d4', x0 + 0.2, y, f, x1 - 0.2, y + 0.16, zo + 0.3)
    p.box(rail, x0 + 0.2, y + 0.16, f - 0.02, x1 - 0.2, y + 1.1, f + 0.12)
    for c in rows(x0 + 0.4, x1 - 0.4, bay):
        quad(p, WINDOW, 'f', c - bay / 2 + 0.4, c + 0.5, y + 0.4, y + 2.5, zo - 0.01)
        p.box(ALU_DK, c + 0.8, y + 0.4, zo - 0.02, c + bay / 2 - 0.3, y + 2.3, zo)
        if r.random() < 0.45:
            p.box('flat:#f4f1e8', c - 1.2, y + 1.3, f + 0.25, c - 0.4, y + 1.9, f + 0.27)
            p.box('flat:#9fb6d0', c - 0.3, y + 1.4, f + 0.25, c + 0.2, y + 1.9, f + 0.27)
        if r.random() < 0.4:
            p.box(LEAFY, c + 0.4, y + 1.1, f + 0.15, c + 0.9, y + 1.5, f + 0.45)
        if r.random() < 0.7:
            acu(p, c + bay / 2 - 0.7, y + 0.16, f + 0.6)
    p.box(wall, x0 + 0.2, y, f, x0 + 0.4, y + 2.9, zo)
    p.box(wall, x1 - 0.4, y, f, x1 - 0.2, y + 2.9, zo)


def tenant(p, s, v, r):
    """A 1980s tenant building by the station (ekimae zakkyo): grey-white tile, a glass street storey
    (a drugstore or a café), one wide window band per floor with a board under it for each tenant,
    a tall sign tower down one edge, an outside stair at the back, a roof sign frame."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall = v.get('wall', PALE)
    p.box(wall, x0, 0, 0, x1, h, d)
    p.box(KICK, x0, 0, -0.04, x1, 0.35, d)
    shop_bay(p, s, x0 + 0.3, x1 - 2.6, 0.2, 3.3, r)
    doors(p, x1 - 1.5, 0, -0.03, 1.3, 2.4, ALU)  # the stair to the tenants
    p.box('light', x1 - 2.3, 2.75, -0.3, x1 - 0.6, 2.8, -0.1)
    p.box(v.get('trim', SKY), x0 - 0.05, 3.45, -1.1, x1 + 0.05, 3.6, 0)
    p.box('light', x0 + 0.3, 3.41, -0.9, x1 - 0.3, 3.45, -0.7)
    board(p, 'name', 'f', x0 + 0.4, x1 - 2.8, 3.7, 4.5, 0, 'flat:#f4f1e8', 0.08)
    floors = int((h - 5.0) / 3.3)
    for f in range(floors):
        y = 4.9 + f * 3.3
        quad(p, WINDOW, 'f', x0 + 0.4, x1 - 2.8, y + 0.9, y + 2.7, -0.01)
        for c in rows(x0 + 0.4, x1 - 2.8, 1.8):
            p.box(ALU_DK, c - 0.92, y + 0.9, -0.04, c - 0.88, y + 2.7, -0.01)
        board(p, 'tenant%d' % f, 'f', x0 + 0.6, x1 - 3.0, y + 0.1, y + 0.75, 0, 'flat:#f4f1e8', 0.05)
    # The sign tower: a frame of boards stacked one per floor.
    p.box(ALU_DK, x1 - 2.5, 4.6, -0.9, x1 - 2.35, h + 2.0, -0.75)
    p.box(ALU_DK, x1 - 0.35, 4.6, -0.9, x1 - 0.2, h + 2.0, -0.75)
    board(p, 'vertical', 'f', x1 - 2.3, x1 - 0.4, 4.8, h + 1.8, -0.75, 'flat:#f4f1e8', 0.2)
    p.box(ROOF, x0 - 0.05, h, -0.05, x1 + 0.05, h + 0.5, d + 0.05)
    roof_frame(p, 'roof', x0 + 0.8, x1 - 3.0, h + 0.5, 1.2, 2.2)
    tank(p, x0 + 2.0, h + 0.5, d - 3.0)
    backs(p, w, d, [3.6] + [4.9 + f * 3.3 for f in range(floors)] + [h], r, sides=(-1, 1), back=True, fire=True, use='office')


def tower(p, s, v, r):
    """A fourteen-storey manshon tower of the 2000s over a two-storey podium of shops: pale tile with
    sky-blue balcony panels in vertical stripes, a glazed entrance hall at one end, a crown of louvres."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    pod = 7.2
    p.box(GRANITE, x0, 0, 0, x1, pod, d)
    p.box(PALE_DK, x0, 3.6, -0.06, x1, 3.75, 0)
    n = max(2, round((w - 5.0) / 6.0))
    step = (w - 5.0) / n
    for k in range(n):
        a, e = x0 + 0.3 + k * step, x0 + 0.3 + (k + 1) * step - 0.3
        shop_bay(p, s, a, e, 0.1, 3.3, r)
        fascia(s, a + 0.1, e - 0.1, 2.9, 3.45, -0.02, r=r)
        quad(p, 'windowDim', 'f', a + 0.2, e - 0.2, 4.1, 6.6, -0.02, col='flat:#e9efe8')  # first-floor shops: a clinic, a school
        board(p, 'upper%d' % k, 'f', a + 0.3, e - 0.3, 6.7, 7.1, 0, 'flat:#f4f1e8', 0.04)
    # The flats' hall: tall glass, a canopy.
    ex = x1 - 4.7
    quad(p, 'windowDim', 'f', ex, x1 - 0.3, 0.1, 6.8, -0.02, col='flat:#f2ead6')
    doors(p, ex + 2.2, 0, -0.03, 2.0, 2.5, ALU)
    p.box(ALU, ex - 0.2, 3.3, -2.2, x1 - 0.1, 3.45, 0)
    p.box('light', ex, 3.26, -2.0, x1 - 0.3, 3.3, -1.8)
    board(p, 'plate', 'f', ex + 0.4, x1 - 0.7, 3.6, 4.2, 0, 'flat:#e9e2d2', 0.04)
    # The tower, set back 1.2 m behind the podium's front.
    floors = int((h - pod - 2.0) / 2.95)
    p.box(PALE, x0 + 0.6, pod, 1.2, x1 - 0.6, h, d)
    for f in range(floors):
        y = pod + 0.3 + f * 2.95
        balconies(p, x0 + 0.6, x1 - 0.6, y, SKY if f % 3 else PALE_DK, r, 4.0, 1.2, PALE, zo=1.2)
    for c in rows(x0 + 0.6, x1 - 0.6, 8.0):
        p.box(PALE, c - 0.35, pod, -0.05, c + 0.35, h, 1.2)
    p.box(ALU_DK, x0 + 0.6, h, 1.0, x1 - 0.6, h + 2.2, d)
    for c in rows(x0 + 0.8, x1 - 0.8, 0.5):
        p.box(ALU, c - 0.05, h + 0.2, 0.95, c + 0.05, h + 2.0, 1.0)
    backs(p, w, d, [3.75, pod] + [pod + 0.3 + f * 2.95 for f in range(0, floors, 2)] + [h], r, sides=(-1, 1), back=True)


def pachinko(p, s, v, r):
    """A pachinko hall: a windowless box faced in panels, a glass entrance under a deep canopy lined
    with lights, a band of lit panels across the top of the front, a big roof sign frame."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall = v.get('wall', 'flat:#d9d4c8')
    p.box(wall, x0, 0, 0, x1, h, d)
    p.box(KICK, x0, 0, -0.04, x1, 0.35, d)
    # Entrance: glass doors in the middle, display windows either side.
    quad(p, 'windowDim', 'f', -4.0, 4.0, 0.2, 3.2, -0.02, col='flat:#f7efd8')
    for c in (-2.4, 0.0, 2.4):
        doors(p, c, 0, -0.03, 1.8, 2.5, ALU)
    for a, e in ((x0 + 0.6, -4.6), (4.6, x1 - 0.6)):
        p.box('flat:#c8102e', a, 0.35, -0.06, e, 3.3, 0)
        board(p, 'poster', 'f', a + 0.4, e - 0.4, 0.9, 2.9, -0.06, 'flat:#f4f1e8', 0.03)
    p.box('flat:#2a2d31', x0 + 0.3, 3.5, -3.0, x1 - 0.3, 3.9, 0)
    for xx in rows(x0 + 0.6, x1 - 0.6, 0.6):
        p.box('light', xx - 0.08, 3.46, -2.8, xx + 0.08, 3.5, -0.4)
    p.box('flat:#2a2d31', x0, 4.2, -0.4, x1, h - 0.8, 0)
    board(p, 'name', 'f', x0 + 1.0, x1 - 1.0, 4.6, h - 1.3, -0.4, 'flat:#f4f1e8', 0.1)
    p.box('flat:#e6a700', x0, h - 0.8, -0.5, x1, h - 0.5, 0)
    p.box(ROOF, x0 - 0.05, h, -0.05, x1 + 0.05, h + 0.4, d + 0.05)
    roof_frame(p, 'roof', x0 + 1.5, x1 - 1.5, h + 0.4, 1.5, 3.4)
    for k in range(4):
        acu(p, x0 + 2.0 + k * 1.4, h + 0.4, d - 2.0)
    backs(p, w, d, [h], r, sides=(-1, 1), back=True)


def juku(p, s, v, r):
    """A cram school of the 2000s: a glass front between sky-blue fins, white panels at the sides,
    a lit board on every floor, bicycles' racks under a canopy."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(PALE, x0, 0, 0, x1, h, d)
    p.box(KICK, x0, 0, -0.04, x1, 0.3, d)
    floors = int((h - 0.5) / 3.4)
    quad(p, 'windowDim', 'f', x0 + 0.5, x1 - 0.5, 0.3, 3.0, -0.02, col='flat:#eef3f6')
    doors(p, x0 + 2.2, 0, -0.03, 2.0, 2.5, ALU)
    for f in range(1, floors):
        y = f * 3.4
        quad(p, 'windowLit', 'f', x0 + 0.5, x1 - 0.5, y + 0.5, y + 3.1, -0.01)
        board(p, 'floor%d' % f, 'f', x0 + 0.7, x0 + 4.2, y + 0.1, y + 0.45, -0.2, 'flat:#f4f1e8', 0.03)
    for c in rows(x0 + 0.5, x1 - 0.5, 2.4):
        p.box(SKY, c - 1.2 - 0.12, 0.3, -0.6, c - 1.2 + 0.12, h, 0)
    p.box(SKY, x1 - 0.62, 0.3, -0.6, x1 - 0.38, h, 0)
    p.box(SKY_DK, x0 - 0.05, h - 0.6, -0.65, x1 + 0.05, h, 0)
    board(p, 'name', 'f', x0 + 0.5, x1 - 0.5, 3.1, 3.4, -0.62, 'flat:#f4f1e8', 0.06)
    p.box(ROOF, x0, h, 0, x1, h + 0.3, d)
    acu(p, x0 + 1.5, h + 0.3, d - 2.0)
    backs(p, w, d, [3.4 * f for f in range(1, floors)] + [h], r, sides=(-1, 1), back=True)


def iryo(p, s, v, r):
    """A clinic building (iryō biru): four floors of small practices in beige tile, a pharmacy at the
    foot, a column of small boards by the door listing each floor, a glass-block stair down the side."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    wall = v.get('wall', BEIGE)
    p.box(wall, x0, 0, 0, x1, h, d)
    p.box(KICK, x0, 0, -0.04, x1, 0.4, d)
    shop_bay(p, s, x0 + 0.3, x1 - 3.0, 0.3, 3.0, r)
    board(p, 'name', 'f', x0 + 0.4, x1 - 3.2, 3.15, 3.8, 0, 'flat:#f4f1e8', 0.08)
    p.box('flat:#1d8a4e', x0 + 0.2, 3.25, -0.75, x0 + 0.7, 3.75, -0.55)
    p.box('light', x0 + 0.3, 3.35, -0.77, x0 + 0.6, 3.65, -0.75)
    doors(p, x1 - 1.6, 0, -0.03, 1.6, 2.4, ALU)
    board(p, 'directory', 'f', x1 - 2.8, x1 - 2.45, 0.6, 2.4, -0.02, 'flat:#f4f1e8', 0.03)
    floors = int((h - 4.2) / 3.2)
    for f in range(floors):
        y = 4.2 + f * 3.2
        quad(p, 'windowLit', 'f', x0 + 0.5, x1 - 3.2, y + 0.7, y + 2.2, -0.01)
        p.box(SAGE, x0 + 0.3, y + 0.4, -0.12, x1 - 3.0, y + 0.6, 0)
        board(p, 'floor%d' % f, 'f', x0 + 0.6, x1 - 3.4, y + 2.35, y + 2.85, 0, 'flat:#f4f1e8', 0.04)
    p.box('flat:#d8e2e0', x1 - 2.8, 3.0, -0.3, x1 - 0.2, h + 0.8, 0.6)
    for y in range(4, int(h)):
        p.box('flat:#c4cfcd', x1 - 2.8, y, -0.32, x1 - 0.2, y + 0.04, -0.3)
    p.box(ROOF, x0 - 0.05, h, -0.05, x1 + 0.05, h + 0.4, d + 0.05)
    acu(p, x0 + 1.5, h + 0.4, d - 2.0)
    backs(p, w, d, [3.0] + [4.2 + f * 3.2 for f in range(floors)] + [h], r, sides=(-1, 1), back=True)


def tinya(p, s, v, r):
    """A 1970s row of two-storey shops under one tin parapet: shutters and glass by turns, a sign board
    along the whole front, small sash windows above with their AC units, a corrugated side wall."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box('flat:#cfc8b8', x0, 0, 0.3, x1, h - 0.8, d)
    p.box(TIN, x0, 0, 0, x1, h, 0.3)
    n = max(2, round(w / 4.5))
    step = w / n
    for k in range(n):
        a, e = x0 + k * step + 0.2, x0 + (k + 1) * step - 0.2
        shop_bay(p, s, a, e, 0.1, 2.9, r, 'shutter' if (k + v['seed']) % 3 == 1 else 'glass')
        if (k + v['seed']) % 2 == 0:
            awning(p, a, e, 3.0, AWNS[(k + v['seed']) % len(AWNS)], 0.9, stripes=False)
        board(p, 'shop%d' % k, 'f', a + 0.15, e - 0.15, 3.1, 3.75, 0, 'flat:#f4f1e8', 0.06)
        for c in rows(a + 0.3, e - 0.3, 2.0):
            win(p, c - 0.6, 4.4, c + 0.6, 5.6, 0, -1, FRAME)
        acu(p, e - 0.6, 4.2, -0.5)
    for yy in range(0, int(h * 4)):
        p.box('flat:#6f7a7c', x0, yy * 0.25, -0.33, x1, yy * 0.25 + 0.03, -0.3)
    backs(p, w, d, [3.0, h - 0.8], r, sides=(-1, 1), back=True)


def kominka(p, s, v, r):
    """Low flats over a shop away from the station (1990s): a shop in brick tile with a striped awning,
    two floors of flats with balconies in sage, a pitched metal roof edge."""
    w, d, h = v['w'], v['d'], v['h']
    x0, x1 = -w / 2, w / 2
    p.box(BRICKTILE, x0, 0, 0.3, x1, 3.6, d)
    p.box(v.get('wall', 'flat:#e6e1d4'), x0, 3.6, 0.3, x1, h, d)
    shop_bay(p, s, x0 + 0.3, x1 - 2.4, 0.1, 3.0, r)
    awning(p, x0 + 0.2, x1 - 2.2, 3.2, v.get('awn', AWNS[v['seed'] % len(AWNS)]))
    board(p, 'name', 'f', x0 + 0.5, x1 - 2.6, 3.3, 3.95, 0.3, 'flat:#f4f1e8', 0.06)
    doors(p, x1 - 1.2, 0, 0.28, 1.0, 2.4, ALU)
    floors = int((h - 3.8) / 2.9)
    for f in range(floors):
        balconies(p, x0, x1, 3.8 + f * 2.9, SAGE, r, 4.2, 0.9, v.get('wall', 'flat:#e6e1d4'), zo=0.3)
    p.prism('flat:#4f5a5e', [(-0.6, h), (d / 2, h + 1.6), (d + 0.4, h)], 'x', x0 - 0.3, x1 + 0.3)
    backs(p, w, d, [3.6] + [3.8 + f * 2.9 for f in range(floors)] + [h], r, sides=(-1, 1), back=True)


STYLES = {'tenant': tenant, 'tower': tower, 'pachinko': pachinko, 'juku': juku, 'iryo': iryo, 'tinya': tinya, 'kominka': kominka}


def build_hi(v):
    body, signs = Part(), Part()
    signs.body = body
    begin(v)
    r = random.Random(sum(map(ord, v['id'])) * 11)
    STYLES[v['style']](body, signs, v, r)
    return body, signs


def build_lo(v):
    return None


D = 16.0
FRONTS = [
    dict(id='tenant_a', style='tenant', w=11.0, h=27.0, seed=1),
    dict(id='tenant_b', style='tenant', w=9.0, h=21.0, wall='flat:#dfe3e2', trim='flat:#3f5a78', seed=2),
    dict(id='tenant_c', style='tenant', w=13.0, h=31.0, wall='flat:#e9e4d8', trim=SKY_DK, seed=3),
    dict(id='tower_a', style='tower', w=26.0, h=48.0, seed=11),
    dict(id='tower_b', style='tower', w=21.0, h=42.0, seed=12),
    dict(id='pachinko_a', style='pachinko', w=24.0, h=11.0, seed=21),
    dict(id='juku_a', style='juku', w=10.0, h=17.5, seed=31),
    dict(id='juku_b', style='juku', w=12.0, h=14.1, seed=32),
    dict(id='iryo_a', style='iryo', w=12.0, h=17.0, seed=41),
    dict(id='iryo_b', style='iryo', w=10.0, h=13.8, wall='flat:#e8e4da', seed=42),
    dict(id='tinya_a', style='tinya', w=18.0, h=7.6, seed=51),
    dict(id='tinya_b', style='tinya', w=13.5, h=7.4, seed=52),
    dict(id='tinya_c', style='tinya', w=9.0, h=7.2, seed=53),
    dict(id='kominka_a', style='kominka', w=10.0, h=10.0, seed=61),
    dict(id='kominka_b', style='kominka', w=12.5, h=12.9, wall='flat:#e1e6e2', awn='#2f6b45', seed=62),
    dict(id='kominka_c', style='kominka', w=8.5, h=10.0, wall='flat:#ece6d6', awn='#7a1f2b', seed=63),
]
for _v in FRONTS:
    _v.setdefault('d', D)
    _v['gap'] = 8.0


if __name__ == '__main__':
    run('hibarifront', FRONTS, build_hi, build_lo)
    write_anchors('hibarifront')
