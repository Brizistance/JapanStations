# Builds the default fittings found inside every station, in three eras.
#
#   blender --background --python tools/blender/build_station.py -- [--renders <dir>]
#
# Writes assets/buildings/station.blend and public/models/buildings/station.glb.
#
# Frame and helpers: see buildkit.py. One root per fitting, station_<id>, with one mesh; the origin
# is on the floor in the middle of the fitting and its front (the side a passenger faces) looks
# along -z. Machines leave their front face (z = -D/2) flat: the game draws the face as a sign
# 1 cm in front of it (src/stations/fittings.ts), and only hoods and ledges stand proud of it.
# Eras follow the year a line opened: old (before 1970), mid (1970 to 2005), new (after 2005).
# Nothing here copies a real maker's machine or livery.

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from buildkit import *  # noqa: E402,F401,F403

ERAS = ('old', 'mid', 'new')
DARK = 'flat:#2b2e33'
BLACK = 'flat:#17181b'
STEEL = 'flat:#aeb3b8'
CHROME = 'flat:#d3d6d9'
TIMBER = 'flat:#8a5a34'
TIMBER2 = 'flat:#a06b3f'
IRON = 'flat:#2f3a36'
IC_BLUE = 'flat:#2a7de1'

# Footprint (along x, along z) and height. Shared with src/stations/fittings.ts (FIT).
SIZES = {
    'vend': (1.0, 0.7, 1.83), 'tix': (1.05, 0.6, 1.95), 'tixend': (0.2, 0.6, 1.95), 'lock': (1.6, 0.6, 1.9),
    'pbench': (1.8, 1.0, 0.84), 'cbench': (1.8, 0.5, 0.45), 'bins': (1.3, 0.4, 0.96),
    'ic_in': (0.34, 0.5, 1.1), 'ic_out': (0.34, 0.5, 1.1), 'ic_charge': (0.6, 0.5, 1.55), 'ic_pad': (0.2, 0.3, 0.06),
    'gatecab': (1.6, 0.26, 1.03), 'hose': (0.75, 0.12, 2.1), 'aed': (0.42, 0.2, 1.75), 'estop': (0.3, 0.3, 1.6),
    'kiosk': (3.0, 1.6, 2.4), 'adframe': (1.4, 0.06, 1.9), 'lift': (2.2, 0.3, 2.5), 'newel': (0.5, 0.12, 1.05),
    'wc_stall': (0.95, 1.4, 2.0), 'wc_basin': (2.2, 0.5, 1.95), 'wc_urinal': (0.7, 0.36, 1.3),
}


def rounded(w, h, r, n=4):
    """Outline (x, y) of a box w wide and h high standing on y = 0, its two top corners rounded."""
    pts = [(-w / 2, 0), (w / 2, 0)]
    for k in range(n + 1):
        a = math.pi / 2 * k / n
        pts.append((w / 2 - r + r * math.cos(a), h - r + r * math.sin(a)))
    for k in range(n + 1):
        a = math.pi / 2 + math.pi / 2 * k / n
        pts.append((-w / 2 + r + r * math.cos(a), h - r + r * math.sin(a)))
    return pts


def vend(p, era, body):
    L, D, H = SIZES['vend']
    f = -D / 2
    if era == 'old':
        # Enamel cabinet with a rounded top on short legs, chrome bands round it.
        for sx in (-L / 2 + 0.06, L / 2 - 0.12):
            for sz in (f + 0.05, D / 2 - 0.11):
                p.box(BLACK, sx, 0, sz, sx + 0.06, 0.1, sz + 0.06)
        p.prism(body, [(x, y + 0.1) for x, y in rounded(L, H - 0.1, 0.09)], 'z', f, D / 2)
        for y in (0.16, 1.02):
            p.box(CHROME, -L / 2 - 0.006, y, f + 0.001, L / 2 + 0.006, y + 0.035, D / 2 + 0.006)
        p.box('flat:#e9e1c9', -L / 2 - 0.004, 1.1, f + 0.12, -L / 2, 1.6, D / 2 - 0.12)
        p.box('flat:#e9e1c9', L / 2, 1.1, f + 0.12, L / 2 + 0.004, 1.6, D / 2 - 0.12)
    elif era == 'mid':
        p.box(DARK, -L / 2 + 0.03, 0, f + 0.04, L / 2 - 0.03, 0.08, D / 2 - 0.02)
        p.box(body, -L / 2, 0.08, f, L / 2, H, D / 2)
        p.box('flat:#f1f0ea', -L / 2 - 0.004, 0.2, f + 0.08, -L / 2, H - 0.12, D / 2 - 0.08)
        p.box('flat:#f1f0ea', L / 2, 0.2, f + 0.08, L / 2 + 0.004, H - 0.12, D / 2 - 0.08)
        for k in range(6):
            y = 0.3 + k * 0.05
            for sx in (-L / 2 - 0.008, L / 2 + 0.004):
                p.box(DARK, sx, y, 0.02, sx + 0.004, y + 0.02, D / 2 - 0.12)
        p.box(DARK, -L / 2, H, f, L / 2, H + 0.02, D / 2)
    else:
        # Slim dark cabinet, a lit visor over the front, a colour band down each side.
        p.box(BLACK, -L / 2 + 0.02, 0, f + 0.03, L / 2 - 0.02, 0.06, D / 2 - 0.02)
        p.box('flat:#3a3e44', -L / 2, 0.06, f, L / 2, H, D / 2)
        p.box(body, -L / 2 - 0.004, 0.06, f, -L / 2, H, f + 0.1)
        p.box(body, L / 2, 0.06, f, L / 2 + 0.004, H, f + 0.1)
        p.box('flat:#3a3e44', -L / 2, H - 0.05, f - 0.09, L / 2, H, f)
        p.box('light', -L / 2 + 0.04, H - 0.056, f - 0.08, L / 2 - 0.04, H - 0.05, f - 0.01)
    if era == 'old':
        return
    # Proud of the drawn face: the delivery hood and the coin panel (model +x is the viewer's left).
    p.box(BLACK, -0.39, 0.15, f - 0.035, 0.39, 0.19, f)
    p.box(BLACK, -0.39, 0.33, f - 0.035, 0.39, 0.37, f)
    for sx in (-0.39, 0.36):
        p.box(BLACK, sx, 0.19, f - 0.035, sx + 0.03, 0.33, f)
    p.box(DARK, -0.37, 0.56, f - 0.022, -0.13, 0.71, f)
    p.box(CHROME, -0.34, 0.63, f - 0.028, -0.3, 0.69, f - 0.022)
    p.box(BLACK, -0.26, 0.585, f - 0.026, -0.17, 0.61, f - 0.022)


def tix(p, era, ic=False):
    """One machine of a bank against a wall (the wall at +z)."""
    L, D, H = SIZES['tix']
    f = -D / 2
    body = {'old': 'flat:#c8c2a8', 'mid': 'flat:#c9ccd0', 'new': 'flat:#e9eaeb'}[era]
    trim = {'old': 'flat:#5b6a5e', 'mid': 'flat:#8f959c', 'new': 'flat:#2b2e33'}[era]
    p.box(DARK, -L / 2, 0, f + 0.06, L / 2, 0.1, D / 2)
    p.box(body, -L / 2, 0.1, f, L / 2, H, D / 2)
    # Fins between machines, the coin ledge, the ticket tray's hood, the canopy with its light.
    for sx in (-L / 2, L / 2 - 0.02):
        p.box(trim, sx, 0.1, f - (0.2 if era == 'new' else 0.12), sx + 0.02, H, f)
    p.prism(trim, [(f, 0.78), (f - 0.14, 0.74), (f - 0.14, 0.71), (f, 0.71)], 'x', -L / 2 + 0.02, L / 2 - 0.02)
    p.box(BLACK, -0.34, 0.6, f - 0.04, 0.34, 0.63, f)
    for sx in (-0.34, 0.31):
        p.box(BLACK, sx, 0.42, f - 0.04, sx + 0.03, 0.6, f)
    if era == 'old':
        p.box(trim, -L / 2, H - 0.1, f - 0.12, L / 2, H, f)
        p.box(CHROME, -L / 2 + 0.02, 0.98, f - 0.006, L / 2 - 0.02, 1.0, f)
    else:
        p.box(trim, -L / 2, H - 0.06, f - 0.2, L / 2, H, f)
        p.box('light', -L / 2 + 0.04, H - 0.066, f - 0.18, L / 2 - 0.04, H - 0.06, f - 0.02)
    if ic:
        # The card reader: a sloped pad on the ledge, glowing blue.
        p.prism('flat:#f1f0ea', [(f - 0.02, 0.9), (f - 0.13, 0.83), (f - 0.13, 0.78), (f - 0.02, 0.78)], 'x', -0.38, -0.12)
        p.prism(IC_BLUE, [(f - 0.035, 0.895), (f - 0.118, 0.842), (f - 0.118, 0.846), (f - 0.035, 0.899)], 'x', -0.34, -0.16)


def tixend(p, era):
    L, D, H = SIZES['tixend']
    f = -D / 2
    trim = {'old': 'flat:#5b6a5e', 'mid': 'flat:#8f959c', 'new': 'flat:#2b2e33'}[era]
    p.box(trim, -L / 2, 0, f - (0.2 if era == 'new' else 0.12), L / 2, H, D / 2)


def lock(p, era):
    L, D, H = SIZES['lock']
    f = -D / 2
    body = {'old': 'flat:#7c8a80', 'mid': 'flat:#e9e4d8', 'new': 'flat:#eceeef'}[era]
    top = {'old': 'flat:#56635a', 'mid': 'flat:#c9c3b4', 'new': 'flat:#2b2e33'}[era]
    p.box(DARK, -L / 2 + 0.02, 0, f + 0.04, L / 2 - 0.02, 0.08, D / 2)
    p.box(body, -L / 2, 0.08, f, L / 2, H, D / 2)
    # A sloped cap so nothing is left on top.
    p.prism(top, [(f - 0.01, H), (D / 2, H), (D / 2, H + 0.16)], 'x', -L / 2 - 0.01, L / 2 + 0.01)
    for sx in (-L / 2 - 0.01, L / 2 - 0.01):
        p.box(top, sx, 0.08, f - 0.012, sx + 0.02, H, f)
    if era == 'new':
        p.box('flat:#2a7de1', -L / 2 - 0.004, 1.2, f, -L / 2, 1.3, D / 2)
        p.box('flat:#2a7de1', L / 2, 1.2, f, L / 2 + 0.004, 1.3, D / 2)


def pbench(p, era):
    """Back-to-back platform bench; its long side along x, people sit facing -z and +z."""
    L, D, H = SIZES['pbench']
    if era == 'old':
        for sx in (-0.8, 0.74):
            p.box(IRON, sx, 0, -0.44, sx + 0.06, 0.05, 0.44)
            p.box(IRON, sx, 0.05, -0.04, sx + 0.06, H, 0.04)
            for s in (-1, 1):
                p.prism(IRON, [(s * 0.04, 0.36), (s * 0.46, 0.36), (s * 0.46, 0.4), (s * 0.04, 0.42)], 'x', sx, sx + 0.06)
                p.box(IRON, sx, 0.05, s * 0.4 - 0.03, sx + 0.06, 0.38, s * 0.4 + 0.03)
        for s in (-1, 1):
            for k in range(4):
                z = s * (0.1 + k * 0.095)
                p.box(TIMBER if k % 2 else TIMBER2, -L / 2, 0.42, min(z, z + s * 0.08), L / 2, 0.45, max(z, z + s * 0.08))
            for k in range(3):
                y = 0.52 + k * 0.11
                z = s * (0.07 - k * 0.012)
                p.box(TIMBER2 if k % 2 else TIMBER, -L / 2, y, min(z, z - s * 0.025), L / 2, y + 0.09, max(z, z - s * 0.025))
    else:
        # Steel beam on two blade legs, pale timber seats, a low padded back between them.
        col = 'flat:#c9a678' if era == 'new' else 'flat:#9aa0a6'
        for sx in (-0.72, 0.68):
            p.box(STEEL, sx, 0, -0.4, sx + 0.04, 0.03, 0.4)
            p.box(STEEL, sx, 0.03, -0.03, sx + 0.04, 0.4, 0.03)
        p.box(STEEL, -0.86, 0.34, -0.05, 0.86, 0.4, 0.05)
        for s in (-1, 1):
            p.box(col, -L / 2, 0.4, min(s * 0.06, s * 0.5), L / 2, 0.44, max(s * 0.06, s * 0.5))
            p.box(STEEL, -0.86, 0.36, s * 0.28 - 0.02, 0.86, 0.4, s * 0.28 + 0.02)
        p.box(DARK, -L / 2 + 0.05, 0.44, -0.05, L / 2 - 0.05, H, 0.05)
        for k in (-1, 0, 1):
            p.box(STEEL, k * 0.6 - 0.31, 0.44, -0.3, k * 0.6 - 0.29, 0.62, -0.26) if era == 'new' else None
            p.box(STEEL, k * 0.6 - 0.31, 0.44, 0.26, k * 0.6 - 0.29, 0.62, 0.3) if era == 'new' else None


def cbench(p, era):
    """Backless concourse bench."""
    L, D, H = SIZES['cbench']
    if era == 'old':
        for sx in (-0.74, 0.68):
            p.box(IRON, sx, 0, -D / 2 + 0.02, sx + 0.06, 0.04, D / 2 - 0.02)
            p.box(IRON, sx, 0.04, -0.05, sx + 0.06, 0.38, 0.05)
            p.box(IRON, sx, 0.36, -D / 2 + 0.02, sx + 0.06, 0.4, D / 2 - 0.02)
        for k in range(5):
            z = -D / 2 + k * 0.1
            p.box(TIMBER if k % 2 else TIMBER2, -L / 2, 0.4, z + 0.006, L / 2, H, z + 0.094)
    elif era == 'mid':
        for sx in (-0.74, 0.7):
            p.box(STEEL, sx, 0, -D / 2 + 0.03, sx + 0.04, 0.4, D / 2 - 0.03)
        p.box(STEEL, -0.8, 0.34, -0.04, 0.8, 0.4, 0.04)
        p.box('flat:#7f858b', -L / 2, 0.4, -D / 2, L / 2, H, D / 2)
    else:
        for sx in (-0.78, 0.76):
            p.box(STEEL, sx, 0, -D / 2 + 0.01, sx + 0.02, 0.41, D / 2 - 0.01)
        p.box('flat:#d2b48a', -L / 2, 0.39, -D / 2, L / 2, H, D / 2)
        p.box(STEEL, -L / 2, 0.37, -D / 2 + 0.03, L / 2, 0.39, D / 2 - 0.03)


def bins(p, era):
    """Three recycling bins: cans, bottles, other."""
    L, D, H = SIZES['bins']
    lids = ['flat:#1565c0', 'flat:#2e7d32', 'flat:#c62828']
    if era == 'old':
        for k in range(3):
            x = (k - 1) * 0.42
            p.cyl('flat:#8f9a94', (x, 0.45, 0), 1, 0.185, 0.86, seg=12)
            p.cyl(BLACK, (x, 0.03, 0), 1, 0.17, 0.06, seg=12)
            p.cyl(lids[k], (x, 0.82, 0), 1, 0.19, 0.08, seg=12, caps=False)
            p.cyl(BLACK, (x, 0.885, 0), 1, 0.1, 0.005, seg=10)
            p.cyl(CHROME, (x, 0.9, 0), 1, 0.19, 0.03, seg=12)
    elif era == 'mid':
        for k in range(3):
            x = (k - 1) * 0.42
            p.box('flat:#9aa0a6', x - 0.19, 0, -0.19, x + 0.19, 0.9, 0.19)
            p.box(lids[k], x - 0.2, 0.9, -0.2, x + 0.2, H, 0.2)
            p.cyl(BLACK, (x, 0.66, -0.191), 2, 0.07, 0.004, seg=10)
            p.box(lids[k], x - 0.12, 0.3, -0.194, x + 0.12, 0.42, -0.19)
    else:
        # One stainless unit with three openings.
        p.box(DARK, -L / 2 + 0.03, 0, -D / 2 + 0.03, L / 2 - 0.03, 0.06, D / 2 - 0.03)
        p.box('flat:#c4c8cc', -L / 2, 0.06, -D / 2, L / 2, 0.92, D / 2)
        p.prism('flat:#c4c8cc', [(-D / 2, 0.92), (D / 2, 0.92), (D / 2, H)], 'x', -L / 2, L / 2)
        for k in range(3):
            x = (k - 1) * 0.42
            p.box(BLACK, x - 0.11, 0.62, -D / 2 - 0.004, x + 0.11, 0.72, -D / 2)
            p.box(lids[k], x - 0.16, 0.76, -D / 2 - 0.004, x + 0.16, 0.86, -D / 2)
            p.box(DARK, x + 0.205, 0.06, -D / 2 - 0.003, x + 0.215, 0.92, -D / 2) if k < 2 else None


def ic_post(p, way):
    """Stand-alone card reader post (簡易IC改札機): green head to enter, yellow to leave."""
    L, D, H = SIZES['ic_in']
    head = 'flat:#2e9e5b' if way == 'in' else 'flat:#f2c200'
    p.box(DARK, -L / 2, 0, -D / 2, L / 2, 0.04, D / 2)
    p.box('flat:#d9dcdf', -0.1, 0.04, -0.14, 0.1, 0.9, 0.14)
    # The head: a wedge sloping down towards the passenger, the pad on the slope.
    p.prism(head, [(-D / 2, 0.92), (D / 2 - 0.06, 0.92), (D / 2 - 0.06, H), (-D / 2 + 0.04, 0.99), (-D / 2, 0.97)], 'x', -L / 2, L / 2)
    p.prism(BLACK, [(-D / 2 + 0.06, 1.0), (D / 2 - 0.1, 1.098), (D / 2 - 0.1, 1.102), (-D / 2 + 0.06, 1.004)], 'x', -L / 2 + 0.03, L / 2 - 0.03)
    p.prism(IC_BLUE, [(-D / 2 + 0.1, 1.014), (D / 2 - 0.18, 1.084), (D / 2 - 0.18, 1.089), (-D / 2 + 0.1, 1.019)], 'x', -0.09, 0.09)
    p.box(head, -L / 2, 0.86, -D / 2 + 0.02, L / 2, 0.92, D / 2 - 0.08)
    p.box('light', -0.05, 1.0, D / 2 - 0.062, 0.05, 1.07, D / 2 - 0.058)


def ic_charge(p):
    """Slim card charge and balance machine."""
    L, D, H = SIZES['ic_charge']
    f = -D / 2
    p.box(DARK, -L / 2 + 0.02, 0, f + 0.04, L / 2 - 0.02, 0.08, D / 2)
    p.box('flat:#eceeef', -L / 2, 0.08, f + 0.1, L / 2, H, D / 2)
    p.box('flat:#c2185b', -L / 2, H - 0.2, f + 0.09, L / 2, H, f + 0.1)
    # Sloped console: screen above, reader pad and note slot below.
    p.prism('flat:#eceeef', [(f + 0.1, 0.8), (f, 0.86), (f, 0.94), (f + 0.1, 1.3)], 'x', -L / 2, L / 2)
    p.prism(BLACK, [(f + 0.012, 0.96), (f + 0.092, 1.25), (f + 0.088, 1.251), (f + 0.008, 0.961)], 'x', -0.22, 0.22)
    p.prism(IC_BLUE, [(f + 0.02, 0.99), (f + 0.082, 1.215), (f + 0.078, 1.216), (f + 0.016, 0.991)], 'x', -0.19, 0.19)
    p.box('flat:#f1f0ea', -0.2, 0.86, f - 0.06, 0.02, 0.9, f)
    p.box(IC_BLUE, -0.17, 0.9, f - 0.05, -0.01, 0.905, f - 0.005)
    p.box(BLACK, 0.08, 0.87, f - 0.004, 0.22, 0.89, f)
    p.box(BLACK, -0.16, 0.5, f + 0.096, 0.16, 0.6, f + 0.1)


def ic_pad(p):
    """The reader pad on a gate cabinet: origin under its middle, the passenger comes from -z."""
    p.prism('flat:#f1f0ea', [(-0.15, 0), (0.15, 0), (0.15, 0.06), (-0.15, 0.025)], 'x', -0.1, 0.1)
    p.prism(IC_BLUE, [(-0.12, 0.031), (0.12, 0.059), (0.12, 0.063), (-0.12, 0.035)], 'x', -0.075, 0.075)


def gatecab(p):
    """Ticket gate cabinet: its length along x (the way people walk), a card pad at each end."""
    L, D, H = SIZES['gatecab']
    p.box(DARK, -L / 2, 0, -D / 2 + 0.02, L / 2, 0.06, D / 2 - 0.02)
    p.box('flat:#c4c8cc', -L / 2, 0.06, -D / 2, L / 2, 1.0, D / 2)
    for s in (-1, 1):
        p.cyl('flat:#c4c8cc', (s * L / 2, 0.53, 0), 1, D / 2, 0.94, seg=10)
        p.cyl('flat:#3a3f45', (s * L / 2, 1.015, 0), 1, D / 2, 0.03, seg=10)
        # The pad slopes up away from the end the passenger comes from.
        x0, x1 = (s * 0.74, s * 0.4)
        p.prism('flat:#f1f0ea', [(x0, 1.03), (x1, 1.03), (x1, 1.075), (x0, 1.04)], 'z', -0.105, 0.105)
        p.prism(IC_BLUE, [(x0 - s * 0.03, 1.046), (x1 + s * 0.03, 1.074), (x1 + s * 0.03, 1.079), (x0 - s * 0.03, 1.051)], 'z', -0.075, 0.075)
        # Ticket slot and the dark panel the flap folds into.
        p.box(BLACK, s * 0.2, 1.03, -0.06, s * 0.32, 1.036, 0.06)
        for sz in (-D / 2 - 0.004, D / 2):
            p.box('flat:#3a3f45', s * 0.02 if s > 0 else -0.3, 0.2, sz, s * 0.3 if s > 0 else -0.02, 0.9, sz + 0.004)
    p.box('flat:#3a3f45', -L / 2, 1.0, -D / 2, L / 2, 1.03, D / 2)


def hose(p):
    """Fire-hose cabinet on a wall (the wall at +z, the origin on the floor): box, lamp, alarm button."""
    w, d, _ = SIZES['hose']
    f = -d
    p.box('flat:#c62828', -w / 2, 0.45, f, w / 2, 1.55, 0)
    p.box('flat:#a31f1f', -w / 2 + 0.03, 0.48, f - 0.006, -0.012, 1.52, f)
    p.box('flat:#a31f1f', 0.012, 0.48, f - 0.006, w / 2 - 0.03, 1.52, f)
    p.box(CHROME, w / 2 - 0.12, 0.9, f - 0.03, w / 2 - 0.08, 1.1, f - 0.006)
    p.cyl('flat:#8f1b1b', (0, 1.77, -0.03), 2, 0.085, 0.06, seg=12)
    p.cyl('light', (0, 1.77, -0.075), 2, 0.06, 0.03, seg=12)
    p.box('flat:#c62828', -0.09, 1.9, -0.06, 0.09, 2.08, 0)
    p.cyl('flat:#f4f1e6', (0, 1.99, -0.066), 2, 0.04, 0.012, seg=10)


def aed(p):
    """Defibrillator cabinet on a wall (the wall at +z): a white box with a window at chest height."""
    w, d, _ = SIZES['aed']
    p.box('flat:#f1f0ea', -w / 2, 1.0, -d, w / 2, 1.5, 0)
    p.box('flat:#e8791c', -w / 2, 1.5, -d, w / 2, 1.56, 0)
    p.box('flat:#b8d8e8', -w / 2 + 0.05, 1.08, -d - 0.004, w / 2 - 0.05, 1.42, -d)
    p.box('flat:#e8791c', -0.1, 1.14, -d + 0.03, 0.1, 1.36, -d + 0.031)
    p.box(CHROME, w / 2 - 0.045, 1.2, -d - 0.02, w / 2 - 0.025, 1.3, -d - 0.004)
    p.cyl('flat:#e8791c', (0, 1.66, -0.05), 2, 0.05, 0.08, seg=10)


def estop(p):
    """Platform emergency stop button on its own post, with a staff telephone box below it."""
    p.box(DARK, -0.15, 0, -0.15, 0.15, 0.03, 0.15)
    p.box('flat:#f2c200', -0.05, 0.03, -0.05, 0.05, 1.6, 0.05)
    for y in (0.2, 0.5):
        p.box(BLACK, -0.052, y, -0.052, 0.052, y + 0.12, 0.052)
    p.box('flat:#f2c200', -0.13, 1.15, -0.13, 0.13, 1.5, -0.05)
    p.box('flat:#c62828', -0.11, 1.17, -0.134, 0.11, 1.48, -0.13)
    p.cyl('flat:#e53935', (0, 1.3, -0.15), 2, 0.055, 0.04, seg=12)
    p.cyl('flat:#f1f0ea', (0, 1.3, -0.137), 2, 0.075, 0.012, seg=12)
    p.box('flat:#8f959c', -0.11, 0.78, -0.12, 0.11, 1.08, -0.05)
    p.box(BLACK, -0.07, 0.84, -0.124, 0.07, 1.02, -0.12)
    p.cyl('light', (0, 1.56, -0.09), 2, 0.035, 0.04, seg=8)


def kiosk(p):
    """Island kiosk 3 × 1.6 m: counters and goods racks on both long sides. The fascia is the game's."""
    L, D, H = SIZES['kiosk']
    import random
    r = random.Random(11)
    packs = ['flat:#d94f4f', 'flat:#e8c93a', 'flat:#2f6fb0', 'flat:#3f8f5a', 'flat:#f0efe8', 'flat:#e8791c', 'flat:#8b5fb0', 'flat:#d9a3b0']
    p.box('flat:#3a3d41', -L / 2 - 0.02, 0, -D / 2 + 0.13, L / 2 + 0.02, 0.1, D / 2 - 0.13)
    p.box('flat:#f4f1e6', -L / 2, 0.1, -D / 2 + 0.15, L / 2, 0.95, D / 2 - 0.15)
    for sx in (-L / 2, L / 2 - 0.08):
        p.box('flat:#f4f1e6', sx, 0.95, -D / 2 + 0.15, sx + 0.08, H, D / 2 - 0.15)
    p.box('flat:#f4f1e6', -L / 2, 1.9, -D / 2 + 0.15, L / 2, H, D / 2 - 0.15)
    p.box('flat:#e9e4d8', -L / 2 + 0.08, 0.95, -0.03, L / 2 - 0.08, 1.9, 0.03)
    for s in (-1, 1):
        zf = s * D / 2
        z0, z1 = sorted((zf, zf - s * 0.17))
        p.box('flat:#9a7650', -L / 2, 0.95, z0, L / 2, 1.0, z1)
        # Racks under the counter: magazines and sweets in steps.
        for k in range(3):
            y = 0.2 + k * 0.24
            za, zb = sorted((zf - s * (0.02 + k * 0.04), zf - s * 0.15))
            p.box('flat:#c9cbcc', -L / 2 + 0.06, y, za, L / 2 - 0.06, y + 0.02, zb)
            x = -L / 2 + 0.08
            while x < L / 2 - 0.25:
                w = r.uniform(0.12, 0.24)
                p.box(r.choice(packs), x, y + 0.02, za, x + w, y + 0.02 + r.uniform(0.12, 0.2), zb)
                x += w + 0.02
        # On the counter: a till, a rack of gum, newspapers; shelves of goods behind.
        p.box(DARK, -L / 2 + 0.2, 1.0, min(zf - s * 0.02, zf - s * 0.3), -L / 2 + 0.55, 1.18, max(zf - s * 0.02, zf - s * 0.3))
        p.box('flat:#f0efe8', 0.5, 1.0, min(zf - s * 0.01, zf - s * 0.3), 1.1, 1.06, max(zf - s * 0.01, zf - s * 0.3))
        for k in range(3):
            y = 1.1 + k * 0.26
            za, zb = sorted((s * 0.05, s * 0.2))
            p.box('flat:#c9cbcc', -L / 2 + 0.1, y, za, L / 2 - 0.1, y + 0.02, zb)
            x = -L / 2 + 0.12
            while x < L / 2 - 0.25:
                w = r.uniform(0.1, 0.2)
                p.box(r.choice(packs), x, y + 0.02, za, x + w, y + 0.02 + r.uniform(0.12, 0.2), zb)
                x += w + 0.015
        p.box('light', -L / 2 + 0.2, 1.88, min(zf - s * 0.2, zf - s * 0.45), L / 2 - 0.2, 1.9, max(zf - s * 0.2, zf - s * 0.45))
        # The shutter's box under the fascia.
        p.box('flat:#aeb3b8', -L / 2, 1.82, min(zf - s * 0.15, zf - s * 0.02), L / 2, 1.95, max(zf - s * 0.15, zf - s * 0.02))


def adframe(p, era):
    """Poster frame on a wall (the wall at +z); the origin is the poster's centre. Opening 1.25 × 1.75."""
    w, h = 1.25, 1.75
    col = {'old': 'flat:#5a4632', 'mid': 'flat:#c9c9c4', 'new': 'flat:#16181b'}[era]
    t = {'old': 0.07, 'mid': 0.04, 'new': 0.05}[era]
    d = {'old': 0.05, 'mid': 0.035, 'new': 0.05}[era]
    p.box(col, -w / 2 - t, -h / 2 - t, -d, -w / 2, h / 2 + t, 0)
    p.box(col, w / 2, -h / 2 - t, -d, w / 2 + t, h / 2 + t, 0)
    p.box(col, -w / 2, h / 2, -d, w / 2, h / 2 + t, 0)
    p.box(col, -w / 2, -h / 2 - t, -d, w / 2, -h / 2, 0)
    if era == 'old':
        p.box('flat:#e9e1c9', -0.3, h / 2 + t, -d, 0.3, h / 2 + t + 0.1, 0)
    elif era == 'new':
        p.box('light', -w / 2, h / 2 + 0.012, -d - 0.004, w / 2, h / 2 + 0.03, -d)
    else:
        p.box('flat:#aeb3b8', -w / 2 - t - 0.01, h / 2 + t, -d - 0.02, w / 2 + t + 0.01, h / 2 + t + 0.03, 0)
        p.box('light', -w / 2, h / 2 + t - 0.006, -d - 0.018, w / 2, h / 2 + t, -d)


def lift(p, era):
    """Lift entrance on a shaft's face (the shaft at +z): frame, two doors with windows, call panel."""
    L, D, H = SIZES['lift']
    frame = {'old': 'flat:#56635a', 'mid': 'flat:#8f959c', 'new': 'flat:#2b2e33'}[era]
    door = {'old': 'flat:#b9b49e', 'mid': 'flat:#c4c8cc', 'new': 'flat:#d9dcdf'}[era]
    p.box('flat:#b9bec4', -L / 2, 0, -0.04, L / 2, H, 0)
    for sx in (-0.62, 0.5):
        p.box(frame, sx, 0, -0.12, sx + 0.12, 2.22, -0.04)
    p.box(frame, -0.62, 2.1, -0.12, 0.62, 2.22, -0.04)
    for s in (-1, 1):
        x0, x1 = sorted((s * 0.004, s * 0.5))
        p.box(door, x0, 0.02, -0.07, x1, 2.1, -0.04)
        xa, xb = sorted((s * 0.12, s * 0.38))
        p.box('flat:#22303a', xa, 1.0, -0.074, xb, 1.75, -0.07)
    p.box(BLACK, -0.004, 0.02, -0.072, 0.004, 2.1, -0.07)
    p.box(CHROME, -0.5, 0, -0.14, 0.5, 0.015, -0.04)
    # Indicator over the door, the call panel to its right.
    p.box(BLACK, -0.22, 2.26, -0.06, 0.22, 2.38, -0.04)
    p.box('light', -0.05, 2.29, -0.064, 0.05, 2.35, -0.06)
    p.box(CHROME, -0.86, 0.9, -0.06, -0.72, 1.25, -0.04)
    for y in (1.0, 1.12):
        p.cyl('flat:#f2c200' if y > 1.05 else 'flat:#f1f0ea', (-0.79, y, -0.066), 2, 0.025, 0.012, seg=8)
    p.box('flat:#f2c200', -0.5, 0, -0.5, 0.5, 0.004, -0.14)


def newel(p):
    """End of an escalator's balustrade: the handrail turning down over a steel skirt. Along x, the flight at +x."""
    p.box('flat:#b4b9be', -0.5, 0, -0.04, 0, 0.5, 0.04)
    p.box('glassTint', -0.42, 0.5, -0.012, 0, 0.94, 0.012)
    p.box('flat:#17181b', -0.45, 0.94, -0.045, 0, 1.0, 0.045)
    p.cyl('flat:#17181b', (-0.45, 0.72, 0), 2, 0.28, 0.09, seg=14)
    p.cyl('flat:#b4b9be', (-0.45, 0.72, 0), 2, 0.22, 0.094, seg=14)


def wc_stall(p):
    """Toilet cubicle seen from outside: partitions, a closed door with its lock sign. Door at -z."""
    L, D, H = SIZES['wc_stall']
    wall = 'flat:#d6dbd8'
    for sx in (-L / 2, L / 2 - 0.03):
        p.box(wall, sx, 0.12, -D / 2, sx + 0.03, H, D / 2)
        p.box(STEEL, sx, 0, -D / 2 + 0.05, sx + 0.03, 0.12, -D / 2 + 0.09)
    p.box(wall, -L / 2, 0.12, -D / 2, -L / 2 + 0.16, H, -D / 2 + 0.03)
    p.box(wall, L / 2 - 0.16, 0.12, -D / 2, L / 2, H, -D / 2 + 0.03)
    p.box('flat:#e9ecea', -L / 2 + 0.17, 0.14, -D / 2 + 0.004, L / 2 - 0.17, H - 0.04, -D / 2 + 0.03)
    p.box(STEEL, -L / 2, H, -D / 2, L / 2, H + 0.04, -D / 2 + 0.04)
    p.box(CHROME, L / 2 - 0.27, 0.98, -D / 2 - 0.02, L / 2 - 0.2, 1.06, -D / 2 + 0.004)
    p.box('flat:#c62828', L / 2 - 0.26, 1.09, -D / 2, L / 2 - 0.21, 1.12, -D / 2 + 0.003)


def wc_basin(p):
    """Wash counter against a wall (the wall at +z): three basins, taps, a mirror above."""
    L, D, H = SIZES['wc_basin']
    p.box('flat:#e9ecea', -L / 2, 0.74, -D / 2, L / 2, 0.82, D / 2)
    p.box('flat:#b9bec4', -L / 2 + 0.05, 0.2, -D / 2 + 0.12, L / 2 - 0.05, 0.74, D / 2)
    for k in (-1, 0, 1):
        x = k * 0.7
        p.box('flat:#f6f7f6', x - 0.24, 0.822, -D / 2 + 0.06, x + 0.24, 0.826, D / 2 - 0.12)
        p.box('flat:#cfd6d4', x - 0.19, 0.826, -D / 2 + 0.1, x + 0.19, 0.829, D / 2 - 0.16)
        p.box(CHROME, x - 0.015, 0.82, D / 2 - 0.1, x + 0.015, 0.96, D / 2 - 0.07)
        p.box(CHROME, x - 0.015, 0.93, D / 2 - 0.2, x + 0.015, 0.96, D / 2 - 0.07)
    p.box('flat:#9fb7c2', -L / 2 + 0.1, 1.05, D / 2 - 0.02, L / 2 - 0.1, 1.85, D / 2)
    p.box(STEEL, -L / 2 + 0.07, 1.02, D / 2 - 0.03, L / 2 - 0.07, 1.05, D / 2)
    p.box(STEEL, -L / 2 + 0.07, 1.85, D / 2 - 0.03, L / 2 - 0.07, 1.88, D / 2)
    p.box('light', -L / 2 + 0.1, 1.9, D / 2 - 0.1, L / 2 - 0.1, 1.94, D / 2)


def wc_urinal(p):
    """Wall urinal with a privacy wing (the wall at +z)."""
    L, D, H = SIZES['wc_urinal']
    p.box('flat:#f6f7f6', -0.19, 0.3, -D / 2 + 0.08, 0.19, 1.15, D / 2)
    p.box('flat:#f6f7f6', -0.19, 0.3, -D / 2, 0.19, 0.5, -D / 2 + 0.08)
    p.box('flat:#cfd6d4', -0.14, 0.5, -D / 2 + 0.075, 0.14, 1.08, -D / 2 + 0.08)
    p.box(CHROME, -0.03, 1.15, D / 2 - 0.06, 0.03, 1.28, D / 2)
    p.box('flat:#d6dbd8', L / 2 - 0.03, 0.35, -D / 2 - 0.1, L / 2, 1.3, D / 2)


PROPS = {}
for _e in ERAS:
    PROPS['adframe_' + _e] = (lambda p, e=_e: adframe(p, e), 'adframe')
    PROPS['lift_' + _e] = (lambda p, e=_e: lift(p, e), 'lift')
for _k, _f in (('gatecab', gatecab), ('hose', hose), ('aed', aed), ('estop', estop), ('kiosk', kiosk), ('newel', newel),
               ('wc_stall', wc_stall), ('wc_basin', wc_basin), ('wc_urinal', wc_urinal)):
    PROPS[_k] = (_f, _k)
for _e in ERAS:
    PROPS['vend_a_' + _e] = (lambda p, e=_e: vend(p, e, 'flat:#c62828' if e != 'old' else 'flat:#b3392f'), 'vend')
    PROPS['vend_b_' + _e] = (lambda p, e=_e: vend(p, e, 'flat:#1565c0' if e != 'old' else 'flat:#e6dcc0'), 'vend')
    PROPS['tix_' + _e] = (lambda p, e=_e: tix(p, e), 'tix')
    PROPS['tixic_' + _e] = (lambda p, e=_e: tix(p, e, True), 'tix')
    PROPS['tixend_' + _e] = (lambda p, e=_e: tixend(p, e), 'tixend')
    PROPS['lock_' + _e] = (lambda p, e=_e: lock(p, e), 'lock')
    PROPS['pbench_' + _e] = (lambda p, e=_e: pbench(p, e), 'pbench')
    PROPS['cbench_' + _e] = (lambda p, e=_e: cbench(p, e), 'cbench')
    PROPS['bins_' + _e] = (lambda p, e=_e: bins(p, e), 'bins')
PROPS['ic_in'] = (lambda p: ic_post(p, 'in'), 'ic_in')
PROPS['ic_out'] = (lambda p: ic_post(p, 'out'), 'ic_out')
PROPS['ic_charge'] = (ic_charge, 'ic_charge')
PROPS['ic_pad'] = (ic_pad, 'ic_pad')


def build_hi(v):
    body = Part()
    PROPS[v['id']][0](body)
    return body, None


if __name__ == '__main__':
    run('station', [dict(id=k, w=SIZES[s][0], gap=1.0) for k, (_, s) in PROPS.items()], build_hi, lambda v: None)
