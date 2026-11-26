# Wall detail shared by the town buildings (build_town.py) and the upgrades to Minato Center's flats and business
# hotel (build_mcenter.py) and the bay-view hotels' sides (build_bayside.py), 2026-11-25.
#
# Faces as in kitakit: 'f' front (z = at, looks -z), 'b' back (looks +z), 'l' the -x side, 'r' the +x side. `n` is a
# distance out from the wall plane.
#
# The owner's complaint the helpers answer: dark flat squares for windows, plain grids on the sides and backs, every
# block the same colour. So: framed windows of light glass with curtains, sills and a mullion; per column of windows a
# kind kept up the whole wall (a window, a pair, a narrow one, a small balcony, blank wall); AC units on brackets,
# pipes, meters, floor bands; roofs with parapets, tanks, machine rooms and aerials.

import random

from kitakit import *  # noqa: F401,F403

GLASS_L = 'flat:#93adbb'     # light window glass, a touch of sky in it
GLASS_LW = 'flat:#a9bcc4'    # paler, for frosted bathroom windows
CURTAINS = ['flat:#efe9dc', 'flat:#e6dccb', 'flat:#dfe6ea', 'flat:#e9e1d3', 'flat:#d9cfc0', 'flat:#c9d3d8', 'flat:#e8d6d0']
PIPE = 'flat:#8d8a82'
RAIL = 'flat:#6f767c'
LAUNDRY = ['flat:#f2efe6', 'flat:#c7d6e6', 'flat:#e6c7cf', 'flat:#d9e3c5', 'flat:#f0d9a8', 'flat:#9fb7c2']


def wb(p, mat, face, a0, a1, y0, y1, at, n0, n1, col=None):
    """A box along a wall from n0 to n1 metres out from it."""
    b0, b1 = out(face, at, n0), out(face, at, n1)
    if face in 'fb':
        p.box(mat, a0, y0, min(b0, b1), a1, y1, max(b0, b1), col)
    else:
        p.box(mat, min(b0, b1), y0, a0, max(b0, b1), y1, a1, col)


def pane(p, face, a0, a1, y0, y1, at, n, glass):
    """A window pane, lit at night by share."""
    quad(p, WINDOW, face, a0, a1, y0, y1, out(face, at, n + 0.01), col=glass)


def fwin(p, rng, face, a0, a1, y0, y1, at, frame=ALU, glass=GLASS_L, sill=True, mull=True, curtain=True, n=0.0):
    """A framed window: an aluminium surround, light glass, a mullion on the wide ones, a curtain drawn to one side,
    a sill under it."""
    wb(p, frame, face, a0 - 0.07, a1 + 0.07, y0 - 0.07, y1 + 0.07, at, n, n + 0.03)
    pane(p, face, a0, a1, y0, y1, at, n + 0.03, glass)
    if curtain and rng.random() < 0.8:
        w = (a1 - a0) * rng.uniform(0.18, 0.45)
        c = rng.choice(CURTAINS)
        if rng.random() < 0.5:
            quad(p, c, face, a0 + 0.02, a0 + w, y0 + 0.03, y1 - 0.03, out(face, at, n + 0.045))
        else:
            quad(p, c, face, a1 - w, a1 - 0.02, y0 + 0.03, y1 - 0.03, out(face, at, n + 0.045))
    if mull and a1 - a0 > 1.1:
        mm = (a0 + a1) / 2
        wb(p, frame, face, mm - 0.03, mm + 0.03, y0, y1, at, n + 0.03, n + 0.06)
    if sill:
        wb(p, frame, face, a0 - 0.1, a1 + 0.1, y0 - 0.12, y0 - 0.04, at, n, n + 0.12)


def ac(p, face, a, y, at, pipe_to=None):
    """An air-conditioning outdoor unit on a steel bracket, its pipe run in a duct cover up the wall."""
    wb(p, STEEL, face, a - 0.4, a - 0.36, y - 0.05, y, at, 0.0, 0.44)
    wb(p, STEEL, face, a + 0.36, a + 0.4, y - 0.05, y, at, 0.0, 0.44)
    wb(p, ACU, face, a - 0.42, a + 0.42, y, y + 0.62, at, 0.04, 0.4)
    wb(p, DARK, face, a - 0.32, a + 0.12, y + 0.1, y + 0.52, at, 0.4, 0.41)
    wb(p, 'flat:#ece9df', face, a + 0.46, a + 0.56, y + 0.1, pipe_to if pipe_to else y + 1.3, at, 0.0, 0.08)


def pipe(p, face, a, y0, y1, at, col=PIPE, r=0.06):
    wb(p, col, face, a - r, a + r, y0, y1, at, 0.04, 0.04 + 2 * r)
    for y in [y0 + 0.5 + k * 3.0 for k in range(int((y1 - y0) / 3.0))]:
        wb(p, col, face, a - r - 0.03, a + r + 0.03, y, y + 0.06, at, 0.0, 0.06 + 2 * r)


def meters(p, face, a, at, n=2):
    """Gas and electricity meters in a little row at the foot of a wall, a conduit up from them."""
    for k in range(n):
        wb(p, 'flat:#d9d6cc', face, a + k * 0.5, a + k * 0.5 + 0.36, 1.2, 1.7, at, 0.0, 0.2)
        wb(p, DARK, face, a + k * 0.5 + 0.08, a + k * 0.5 + 0.28, 1.45, 1.6, at, 0.2, 0.205)
    wb(p, 'flat:#bdbab0', face, a + 0.12, a + 0.2, 1.7, 3.6, at, 0.0, 0.06)
    wb(p, 'flat:#d4b04a', face, a - 0.6, a - 0.2, 0.0, 0.5, at, 0.0, 0.3)   # the gas pipe's yellow riser


def juliet(p, face, a0, a1, y, at, rail=RAIL):
    """A small balcony: a slab 0.9 m out, a railing of bars, sometimes a plant pot or a drying rack."""
    wb(p, 'flat:#dcdad2', face, a0, a1, y - 0.16, y, at, 0.0, 0.9)
    wb(p, rail, face, a0, a1, y + 1.0, y + 1.06, at, 0.84, 0.9)
    for c in rows(a0, a1, 0.3):
        quad(p, rail, face, c - 0.015, c + 0.015, y, y + 1.0, out(face, at, 0.88))
    for c in (a0 + 0.02, a1 - 0.04):
        wb(p, rail, face, c, c + 0.03, y, y + 1.06, at, 0.0, 0.9)


def solid_balcony(p, rng, face, a0, a1, y, at, wall, acc=None, depth=1.2):
    """A balcony with a solid parapet: the slab, the parapet in the wall colour, a drain pipe, washing over it."""
    wb(p, wall, face, a0, a1, y - 0.18, y + 1.05, at, depth - 0.12, depth)
    wb(p, 'flat:#dcdad2', face, a0, a1, y - 0.18, y, at, 0.0, depth)
    for c in (a0, a1 - 0.12):
        wb(p, wall, face, c, c + 0.12, y, y + 1.05, at, 0.0, depth)
    if acc:
        wb(p, acc, face, a0, a1, y + 0.9, y + 1.05, at, depth, depth + 0.01)
    if rng.random() < 0.45:
        for _ in range(rng.randint(1, 3)):
            c = rng.uniform(a0 + 0.3, a1 - 1.0)
            wb(p, rng.choice(LAUNDRY), face, c, c + rng.uniform(0.4, 0.9), y + 0.75, y + 1.5, at, depth - 0.1, depth + 0.02)


def fbands(p, mat, face, a0, a1, ys, at, t=0.22, n=0.06):
    for y in ys:
        wb(p, mat, face, a0, a1, y - t / 2, y + t / 2, at, 0.0, n)


def side_wall(p, rng, face, a0, a1, at, y0, nf, fh, wall, acc, kind='flats', glass=GLASS_L, frame=ALU, band=None, bay=3.2):
    """A side or back wall that reads as lived in, not a grid. Per column of bays one kind of opening kept up the
    wall; AC units under some windows; floor bands; a downpipe at each end, meters by the foot of one."""
    cols = rows(a0 + 0.9, a1 - 0.9, bay)
    kinds = {'flats': ['win', 'win', 'pair', 'narrow', 'balc', 'blank'],
             'hotel': ['win', 'win', 'narrow', 'narrow', 'balc'],
             'office': ['wide', 'wide', 'win'],
             'old': ['win', 'narrow', 'pair', 'blank']}[kind]
    plan = [rng.choice(kinds) for _ in cols]
    # (a stripe of the accent colour up one column on the bigger walls)
    if acc and len(cols) >= 3 and rng.random() < 0.7:
        k = rng.randrange(len(cols))
        plan[k] = 'stripe'
        c = cols[k]
        wb(p, acc, face, c - bay / 2 + 0.25, c + bay / 2 - 0.25, y0, y0 + nf * fh, at, 0.0, 0.05)
    if band:
        fbands(p, band, face, a0, a1, [y0 + k * fh for k in range(nf + 1)], at)
    for i, c in enumerate(cols):
        kd = plan[i]
        for k in range(nf):
            y = y0 + k * fh
            if kd == 'blank':
                continue
            if kd == 'stripe':
                fwin(p, rng, face, c - 0.35, c + 0.35, y + 1.0, y + 2.2, at, frame, GLASS_LW, curtain=False, n=0.05)
                continue
            if kd == 'win':
                fwin(p, rng, face, c - 0.8, c + 0.8, y + 0.95, y + 2.25, at, frame, glass)
            elif kd == 'wide':
                fwin(p, rng, face, c - bay / 2 + 0.3, c + bay / 2 - 0.3, y + 0.85, y + fh - 0.6, at, frame, glass, curtain=False)
            elif kd == 'pair':
                fwin(p, rng, face, c - 1.1, c - 0.15, y + 1.1, y + 2.2, at, frame, glass, mull=False)
                fwin(p, rng, face, c + 0.15, c + 1.1, y + 1.1, y + 2.2, at, frame, GLASS_LW, mull=False, curtain=False)
            elif kd == 'narrow':
                fwin(p, rng, face, c - 0.4, c + 0.4, y + 1.0, y + 2.3, at, frame, glass, mull=False)
            elif kd == 'balc':
                fwin(p, rng, face, c - 0.9, c + 0.9, y + 0.1, y + 2.3, at, frame, glass)
                if k:
                    juliet(p, face, c - 1.2, c + 1.2, y, at)
            if kind != 'office' and kd in ('win', 'narrow', 'pair') and k and rng.random() < 0.3:
                ac(p, face, c + (1.4 if c + 1.9 < a1 else -1.4), y + 0.1, at)
    for c in (a0 + 0.25, a1 - 0.25):
        pipe(p, face, c, 0.0, y0 + nf * fh, at)
    meters(p, face, a0 + 1.0, at, 2 + rng.randrange(3))


def roof_kit(p, rng, x0, x1, z0, z1, H, acc, cap=None, stair=True, tank_on=True, aerial=True, units=3):
    """A flat roof: a capped parapet, the stair or lift house, an elevated water tank, condenser units, an aerial."""
    cap = cap or acc
    for a, b, c, d in ((x0, z0, x1, z0 + 0.22), (x0, z1 - 0.22, x1, z1), (x0, z0, x0 + 0.22, z1), (x1 - 0.22, z0, x1, z1)):
        p.box(cap, a, H, b, c, H + 0.95, d)
    p.box('flat:#8f8d86', x0 + 0.22, H, z0 + 0.22, x1 - 0.22, H + 0.04, z1 - 0.22)
    w, d = x1 - x0, z1 - z0
    if stair:
        sx = x0 + w * rng.uniform(0.55, 0.7)
        p.box('flat:#d8d4ca', sx - 1.8, H, z1 - 4.4, sx + 1.8, H + 2.9, z1 - 0.8)
        p.box(acc, sx - 1.9, H + 2.9, z1 - 4.5, sx + 1.9, H + 3.1, z1 - 0.7)
        p.box(FRAME, sx - 0.45, H, z1 - 4.42, sx + 0.45, H + 2.1, z1 - 4.4)
    if tank_on and w > 8:
        tank(p, x0 + min(2.6, w * 0.2), H, z0 + d * 0.62)
    for k in range(units):
        acu(p, x0 + 1.2 + k * 1.15, H + 0.04, z0 + 1.2)
    if aerial:
        ax = x1 - 1.3
        p.cyl(STEEL, (ax, H + 2.6, z0 + 2.0), 1, 0.035, 5.2, seg=6)
        for y in (H + 3.8, H + 4.6):
            p.box(STEEL, ax - 0.7, y, z0 + 1.98, ax + 0.7, y + 0.035, z0 + 2.02)
        if rng.random() < 0.5:
            p.cyl('flat:#e9e7e0', (ax - 1.6, H + 1.2, z0 + 2.4), 1, 0.35, 0.08, seg=10)


def ext_stair(p, face, a0, a1, at, y_top, fh, col='flat:#6f767c'):
    """An outside steel escape stair down a wall: landings every floor, a cage of rails, the flights between."""
    w = a1 - a0
    for k in range(int(y_top / fh) + 1):
        y = k * fh
        if y > y_top:
            break
        wb(p, col, face, a0, a1, y - 0.12, y, at, 0.0, 1.2)
        wb(p, col, face, a0, a1, y + 1.0, y + 1.05, at, 1.15, 1.2)
        for c in rows(a0, a1, 0.5):
            wb(p, col, face, c - 0.015, c + 0.015, y, y + 1.0, at, 1.16, 1.19)
        if k:
            # the flight: a sloped stringer from the landing below, alternating sides
            m = 18
            for j in range(m):
                t = j / m
                u = a0 + (t if k % 2 else 1 - t) * w
                wb(p, col, face, u - w / (2 * m), u + w / (2 * m), y - fh + t * fh - 0.08, y - fh + t * fh, at, 0.1, 1.1)
    for c in (a0, a1 - 0.08):
        wb(p, col, face, c, c + 0.08, 0.0, y_top + 1.05, at, 1.12, 1.2)


def lo_slab(wall, W, D, H, y0, nf, fh, cap=None, base=None, band=None, z0=0.0):
    """The simplified copy of a block for 190 m and beyond (buildkit's LOD, see building-models.ts lodModels): the
    body, a band of separate panes per floor on all four walls, floor lines, a parapet. Faces stand 0.25 m off the
    wall so the depth buffer still parts them far off."""
    p = Part()
    x0, x1 = -W / 2, W / 2
    p.box(wall, x0, 0, z0, x1, H, D)
    if base:
        p.box(base, x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, y0, D + 0.05)
        lo_band(p, x0 + 0.6, 0.4, z0 - 0.3, x1 - 0.6, y0 - 1.0, z0 - 0.05)
    for k in range(nf):
        y = y0 + k * fh
        lo_band(p, x0 + 0.5, y + 0.8, z0 - 0.25, x1 - 0.5, y + fh - 0.45, z0)
        lo_band(p, x0 + 0.5, y + 0.8, D, x1 - 0.5, y + fh - 0.45, D + 0.25)
        lo_band(p, x0 - 0.25, y + 0.8, z0 + 0.8, x0, y + fh - 0.45, D - 0.8)
        lo_band(p, x1, y + 0.8, z0 + 0.8, x1 + 0.25, y + fh - 0.45, D - 0.8)
        if band and k:
            p.box(band, x0 - 0.35, y - 0.15, z0 - 0.4, x1 + 0.35, y + 0.15, D + 0.4)
    if cap:
        p.box(cap, x0, H, z0, x1, H + 0.9, D)
    return p
