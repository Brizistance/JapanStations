// Watayamachi's wholesale centre (綿屋町センター街): the 1970 textile wholesale centre that stands in
// the middle of the avenue under the expressway, after the one in Osaka's Senba. The station's
// concourse is its basement; this file joins the two.
//
// Below ground (buildCentre): past each gate end the concourse's end wall has a doorway into a small
// lobby, from which a stair between two escalators climbs away from the station into the hall that
// stands over it. The east lobby also has the lift, which you can ride between the concourse and
// the hall floor. These are exits 3 (east, hall 2) and 4 (west, hall 3).
//
// At street level (centreAbove): the halls, the expressway's deck that is their roof and its piers
// are Blender models (tools/blender/build_watacentre.py); the inside of the two halls by the
// crossing is built here: a passage down the middle between two rows of cloth merchants' stalls.
//
// Measurements shared with the street and the exit boards are in wata-plan.ts. Station frame: +x east, +z south.

import { linesAt } from '../data/network';
import { rng, type Builder } from '../world/builder';
import { WATACENTRE } from './anchors/watacentre';
import type { AnchorPt } from './anchors/types';
import { ceilingLight, escalator, GROUND_Y, rail, stairs, type Ctx } from './kit';
import { lift } from './lift';
import { lookFor } from './looks';
import { WATA, WATA_PLOT, wataRun, wataWell } from './wata-plan';

export const CENTRE = { ja: '綿屋町センター街', en: 'Watayamachi Centre' };
const MIRROR = { rot: 2, mz: true } as const;
/** The halls' inside height, and how far in from a model's outer face its wall is taken to reach. */
const CE = 4.0, IN = 0.3, WT = 0.2;
const MADDER = '#9c2a30', COTTON = '#f1ece0', NAVY = '#27344f';
const TERRAZZO = 'floor:#cfc9bb', MOSAIC = 'tile:#8c3b35', PLASTER = 'paint:#ece6d6', STALL = 'paint:#e3dccb', TIMBER = 'wood:#6b4a30';

/** What the stalls and shop boards sell: trades, not names (the firms' names come with the streets). */
const TRADES: [string, string][] = [
  ['服地', 'Dress fabrics'], ['綿布', 'Cotton cloth'], ['ボタン・糸', 'Buttons & thread'], ['タオル', 'Towels'], ['裏地・芯地', 'Linings'],
  ['帆布', 'Canvas'], ['手芸用品', 'Handicraft supplies'], ['肌着・靴下', 'Underwear & socks'], ['呉服', 'Kimono cloth'], ['ふとん綿', 'Futon cotton'],
  ['毛糸', 'Knitting wool'], ['レース・リボン', 'Lace & ribbon'], ['作業服', 'Workwear'], ['手拭・晒', 'Tenugui & bleached cotton'], ['カーテン地', 'Curtain fabrics'],
  ['紳士服地', 'Suitings'], ['染料', 'Dyes'], ['ミシン糸', 'Sewing thread'], ['婦人服 卸', 'Ladies’ wear, wholesale'], ['子供服 卸', 'Children’s wear, wholesale'],
];
const BOARDS: [string, string][] = [[COTTON, NAVY], [NAVY, '#ffffff'], [MADDER, '#ffffff'], ['#f4f1e8', '#3a2a1e'], ['#2a2622', '#e8d9b0'], ['#f4f1e8', MADDER]];
const BOLTS = ['#f1ece0', '#b7282e', '#27344f', '#d9b44a', '#6f8f6a', '#c97b5a', '#8aa0b8', '#3d3a36', '#e8cfd3', '#f4f1e8', '#7a4a6a', '#2f6f73'];

const hallOf = (east: boolean) => WATA.halls.find((h) => h.walk && (east ? h.x0 > 0 : h.x1 < 0))!;

/** The stair halls below the street. `cf`: the concourse floor. */
export function buildCentre(c: Ctx, cf: number) {
  const { b, station, style } = c;
  const GY = GROUND_Y;
  const fin = lookFor(station.id).finishes ?? {};
  const wall = fin.wall ?? style.concWall, floor = fin.floor ?? style.floor, ceil = fin.ceil ?? 'ceil';
  const lines = linesAt(station.id).map((l) => l.id);
  const run = wataRun(cf);
  const [w0, w1] = WATA.well, W = w1 - w0, [d0, d1] = WATA.door;
  const L = WATA.lobby, F = WATA.foot, top = cf + 2.8, zS = WATA.lift.z, lx = WATA.lift.x;

  for (const east of [true, false]) {
    const num = east ? WATA.east : WATA.west, hall = hallOf(east);
    const exitJa = `${num}番出口 ${CENTRE.ja} ${hall.num}号館`, exitEn = `Exit ${num}: ${CENTRE.en}, Hall ${hall.num}`;
    b.with(east ? {} : MIRROR, () => {
      // ── The doorway in the concourse's end wall, and the lobby beyond ──
      b.carve(L - 0.5, cf, d0, L + 0.01, cf + 2.4, d1);
      // (The platform hall's roof beyond the concourse tops out a hand above this floor: cut it down under the
      // lobby, the flights and the lift.)
      b.carve(L, cf - 0.2, w0, F + run, cf + 0.3, zS);
      if (east) b.carve(WATA.lift.shaft[0], cf - 0.2, WATA.lift.shaft[1], WATA.lift.shaft[2], cf + 0.3, WATA.lift.shaft[3]);
      b.box(floor, F, cf - 0.2, w0, F + run, cf, w1);
      b.box(floor, L - 0.4, cf - 0.2, d0, L, cf, d1);
      b.box(floor, L, cf - 0.2, w0, F, cf, zS);
      b.box(wall, L, cf, w0 - 0.3, F, top, w0);
      // The lobby's south wall, with the lift in it at the east end (a plain wall at the west one).
      if (east) {
        b.box(wall, L, cf, zS, lx - 1.15, top, zS + 0.3);
        b.box(wall, lx + 1.15, cf, zS, F + 0.3, top, zS + 0.3);
      } else b.box(wall, L, cf, zS, F + 0.3, top, zS + 0.3);
      b.box(wall, F, cf, w1 + 0.3, F + 0.3, top, zS);
      b.box(ceil, L, top, w0 - 0.3, F, top + 0.5, zS);
      b.zone('passage', L - 0.4, cf - 0.2, w0, F, top, zS, `${num}番出口 通路`, `Exit ${num} passage`);
      ceilingLight(b, L + 0.5, F - 0.5, (w0 + w1) / 2 - 0.2, (w0 + w1) / 2 + 0.2, top);
      b.deco('flat:#4b4d50', L, cf, w0 - 0.012, F, cf + 0.13, w0);
      b.deco(MOSAIC, L, cf + 0.13, w0 - 0.012, F, cf + 1.0, w0);
      // Over the doorway on the concourse side, and hung in the unpaid hall on the way to it.
      b.sign({ k: 'guide', ja: exitJa, en: exitEn, bg: 'yellow', arrow: 'up' }, L - 0.43, cf + 2.66, (d0 + d1) / 2, [-1, 0], d1 - d0 - 0.4, 0.5);
      b.protect(L - 0.9, cf + 2.3, d0, L - 0.3, cf + 3.0, d1);
      // And inside the gates, on the way out: the kit's own exit signs know only the pavement exits.
      b.hang({ k: 'guide', ja: exitJa, en: exitEn, bg: 'yellow', arrow: 'up' }, L - 19.6, cf + 2.55, (d0 + d1) / 2 - 3.2, 4.4, 0.46, { ceil: cf + 3.0 });
      b.hang({ k: 'guide', ja: exitJa, en: exitEn, bg: 'yellow', arrow: 'up' }, L - 6.2, cf + 2.55, (d0 + d1) / 2, 4.4, 0.46, { ceil: cf + 3.0, back: { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: lines, arrow: 'up' } });

      // ── The lift: it opens north, on the lobby below and on the hall floor above ──
      if (east) {
        b.with({ t: [lx, 0, zS] }, () => lift(b, {
          mat: wall, levels: [{ y: cf, ja: '改札階', en: 'Concourse and trains' }, { y: GY, ja: `${CENTRE.ja} ${hall.num}号館 1階`, en: `${CENTRE.en}, Hall ${hall.num}` }],
        }));
        // (lift() letters its own doors. The car's way up is a place too, so the HUD keeps the station on the ride.)
        b.zone('passage', WATA.lift.shaft[0], cf - 0.2, zS, WATA.lift.shaft[2], GY + 2.6, WATA.lift.shaft[3], `${num}番出口 エレベーター`, `Exit ${num} lift`);
      }

      // ── The stair between two escalators, climbing away from the station into the hall ──
      b.with({ t: [F, 0, w0] }, () => {
        // (Local: +x up the flights from the foot at 0, z across the well from 0 to W.)
        escalator(b, { x0: 0, x1: run, z0: 0.12, z1: 1.42, yLow: cf, yHigh: GY, dir: 1 });
        stairs(b, { x0: 0, x1: run, z0: 1.55, z1: 3.05, yLow: cf, yHigh: GY, mat: 'flat:#aaa79f' });
        escalator(b, { x0: 0, x1: run, z0: 3.18, z1: 4.48, yLow: cf, yHigh: GY, dir: -1 });
        for (const [z0, z1] of [[-0.3, 0], [W, W + 0.3]]) b.box(wall, 0, cf - 0.5, z0, run + 0.3, GY - 0.01, z1);
        b.box(wall, run, cf - 0.5, 0, run + 0.3, GY - 0.01, W);
        b.hole(0, 0, run, W);
        rail(b, -0.08, -0.08, run, 0, GY);
        rail(b, -0.08, W, run, W + 0.08, GY);
        rail(b, -0.08, 0, 0, W, GY);
        // The madder band up both walls, lights over it; signs at the foot and the head.
        for (const z of [0.005, W - 0.017]) {
          for (let x = 0; x < run - 0.01; x += run / 6) {
            const y = cf + (GY - cf) * ((x + run / 12) / run);
            b.deco(MOSAIC, x, y + 0.9, z, x + run / 6, y + 1.25, z + 0.012);
          }
        }
        for (let x = 1.2; x < run - 1; x += 2.6) for (const z of [0.01, W - 0.03]) b.deco('light', x, cf + (GY - cf) * (x / run) + 2.2, z, x + 1.2, cf + (GY - cf) * (x / run) + 2.32, z + 0.02);
        b.hang(
          { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: lines, arrow: 'up' }, run + 2.2, GY + 2.75, W / 2, 3.8, 0.46,
          { ceil: GY + CE, back: { k: 'guide', ja: `出口 ${CENTRE.ja}`, en: `Exit: ${CENTRE.en}`, bg: 'yellow', arrow: 'up' } },
        );
        // (Named as an exit is everywhere: exits.ts lists it, and its place on the maps is this well.)
        b.zone('passage', L - F, cf - 0.2, 0, run, GY + 2.4, W, `${num}番出口`, `Exit ${num}`);
      });
    });
  }
}

/** Sub-ranges of a … e left by the gaps (each [from, to]). */
function spans(a: number, e: number, gaps: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  let at = a;
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (g0 > at) out.push([at, Math.min(g0, e)]);
    at = Math.max(at, g1);
  }
  if (at < e) out.push([at, e]);
  return out.filter(([p, q]) => q - p > 0.05);
}

/** The centre at street level: every hall, the deck over them and its piers. `cf`: the concourse floor. */
export function centreAbove(c: Ctx, cf: number) {
  const { b, station } = c;
  const GY = GROUND_Y, z0 = WATA.z0, z1 = WATA.z1;
  const lines = linesAt(station.id).map((l) => l.id);
  for (let x = -WATA_PLOT.x + WATA.span / 2; x < WATA_PLOT.x; x += WATA.span) b.model('watacentre', 'deck', x, GY, z0, 0);
  for (const x of WATA.piers) {
    b.model('watacentre', 'pier', x, GY, z0, 0);
    for (const k of ['_colA', '_colB']) {
      const p = WATACENTRE.pier.pts[k];
      b.block(x - p[3] / 2, GY, z0 + p[2] - p[4] / 2, x + p[3] / 2, GY + WATACENTRE.pier.h - 1.3, z0 + p[2] + p[4] / 2);
    }
  }

  WATA.halls.forEach((h, hi) => {
    const A = WATACENTRE[h.id], xc = (h.x0 + h.x1) / 2;
    const r = rng(station.id.length * 97 + h.num * 13);
    const sign = (p: AnchorPt, content: Parameters<Builder['sign']>[0]) => b.sign(content, xc + p[0], GY + p[1], z0 + p[2], [p[5], p[6]], p[3], p[4]);
    const trade = (k: number) => TRADES[(hi * 7 + k * 3) % TRADES.length];
    b.model('watacentre', h.id, xc, GY, z0, 1);
    const east = h.x0 > 0, num = east ? WATA.east : WATA.west;
    for (const [key, p] of Object.entries(A.pts)) {
      if (key.startsWith('shop')) {
        const k = Number(key.slice(5)) + (key[4] === 'S' ? 5 : 0), [bg, fg] = BOARDS[(hi + k) % BOARDS.length], [ja, en] = trade(k);
        sign(p, { k: 'label', text: ja, sub: en, fg, bg });
      } else if (key.startsWith('name')) sign(p, { k: 'label', text: CENTRE.ja, sub: CENTRE.en, fg: COTTON, bg: '#8c3b35' });
      else if (key.startsWith('num')) sign(p, { k: 'label', text: `${h.num}号館`, sub: `Hall ${h.num}`, fg: NAVY, bg: COTTON });
      else if (key.startsWith('ent')) {
        if (h.walk) sign(p, { k: 'entrance', station: station.id, exit: num });
        else sign(p, { k: 'label', text: '出入口', sub: 'Entrance', fg: NAVY, bg: COTTON });
      }
    }
    if (!h.walk) {
      b.block(h.x0, GY, z0, h.x1, GY + A.h, z1);
      return;
    }

    // ── A hall you walk into: colliders for the model's walls, and everything inside ──
    const doors = (tag: string): [number, number][] => Object.entries(A.pts).filter(([k]) => k.startsWith(`_door${tag}`)).map(([, p]) => [xc + p[0] - p[3] / 2, xc + p[0] + p[3] / 2]);
    const endGap = (tag: string): [number, number] => {
      const p = A.pts[`_end${tag}`];
      return [z0 + p[2] - p[3] / 2, z0 + p[2] + p[3] / 2];
    };
    const doorH = A.pts._doorN0[4], endH = A.pts._endW[4];
    const xi0 = h.x0 + IN, xi1 = h.x1 - IN, zi0 = z0 + IN, zi1 = z1 - IN;
    const wallMat = (ax: number, az: number, ex: number, ez: number, y0 = GY, y1 = GY + CE) => {
      if (y0 < GY + 1.0) b.box(MOSAIC, ax, y0, az, ex, Math.min(y1, GY + 1.0), ez);
      if (y1 > GY + 1.0) b.box(PLASTER, ax, Math.max(y0, GY + 1.0), az, ex, y1, ez);
    };
    for (const [tag, zo, zi] of [['N', z0, zi0], ['S', z1, zi1]] as const) {
      const gaps = doors(tag), s = tag === 'N' ? 1 : -1;
      for (const [a, e] of spans(h.x0, h.x1, gaps)) {
        b.block(a, GY, Math.min(zo, zi), e, GY + A.h, Math.max(zo, zi));
        wallMat(Math.max(a, xi0), Math.min(zi, zi + s * WT), Math.min(e, xi1), Math.max(zi, zi + s * WT));
      }
      for (const [a, e] of gaps) wallMat(a, Math.min(zi, zi + s * WT), e, Math.max(zi, zi + s * WT), GY + doorH);
    }
    for (const [tag, xo, xi] of [['W', h.x0, xi0], ['E', h.x1, xi1]] as const) {
      const [g0, g1] = endGap(tag), s = tag === 'W' ? 1 : -1;
      for (const [a, e] of [[z0, g0], [g1, z1]]) {
        b.block(Math.min(xo, xi), GY, a, Math.max(xo, xi), GY + A.h, e);
        wallMat(Math.min(xi, xi + s * WT), Math.max(a, zi0), Math.max(xi, xi + s * WT), Math.min(e, zi1));
      }
      wallMat(Math.min(xi, xi + s * WT), g0, Math.max(xi, xi + s * WT), g1, GY + endH);
      // Inside over each end doorway: the way to the trains.
      b.sign({ k: 'guide', ja: `地下鉄 ${station.nameJa}駅`, en: `Subway: ${station.nameRomaji} Sta.`, bg: 'navy', badges: lines, arrow: 'up' }, xi + s * (WT + 0.02), GY + endH + 0.3, (g0 + g1) / 2, [s, 0], g1 - g0 - 0.6, 0.44);
    }
    const well = wataWell(cf, east);
    const cut: number[][] = [[well[0] - 0.1, well[1] - 0.1, well[2] + 0.1, well[3] + 0.1], ...(east ? [WATA.lift.shaft] : [])];
    b.slab(TERRAZZO, xi0, zi0, xi1, zi1, GY + 0.002, GY + 0.014, cut, false);
    b.box('ceil', xi0, GY + CE, zi0, xi1, GY + CE + 0.2, zi1, false);
    for (let x = xi0 + 2; x + 2.6 < xi1; x += 4.6) for (const zc of [-6.9, -2.6, 2.2, 6.9]) ceilingLight(b, x, x + 2.6, zc - 0.15, zc + 0.15, GY + CE);
    b.zone('concourse', xi0 + WT, GY - 0.2, zi0 + WT, xi1 - WT, GY + CE, zi1 - WT, `${CENTRE.ja} ${h.num}号館`, `${CENTRE.en}, Hall ${h.num}`);

    // ── The stalls: one to a bay along both long walls, open to the passage ──
    const bay = A.pts._bay[3], n = A.pts._bay[4], DEPTH = 3.2;
    const [bx0, , bx1] = well;
    for (const s of [-1, 1] as const) {
      const zw = s < 0 ? zi0 + WT : zi1 - WT, zf = zw - s * DEPTH, gaps = doors(s < 0 ? 'N' : 'S');
      const za = Math.min(zw, zf), zb = Math.max(zw, zf);
      for (let k = 0; k < n; k++) {
        const a = Math.max(xi0 + WT, h.x0 + k * bay), e = Math.min(xi1 - WT, h.x0 + (k + 1) * bay);
        if (gaps.some(([g0, g1]) => a < g1 + 0.4 && e > g0 - 0.4)) continue;
        // Beside the stair's well (north wall) there is no room for a stall: the wall carries the thread mural.
        if (s < 0 && a < (east ? bx1 : -WATA.lobby) + 1.2 && e > (east ? WATA.lobby : bx0) - 1.2) continue;
        for (const x of [a, e]) b.box(STALL, x - 0.06, GY, za, x + 0.06, GY + CE, zb);
        b.box(STALL, a, GY + 2.5, Math.min(zf, zf + s * 0.14), e, GY + CE, Math.max(zf, zf + s * 0.14));
        const [ja, en] = trade(k + (s > 0 ? 5 : 0)), [bg, fg] = BOARDS[(hi + k + (s > 0 ? 2 : 0)) % BOARDS.length];
        b.sign({ k: 'label', text: ja, sub: en, fg, bg }, (a + e) / 2, GY + 2.95, zf - s * 0.02, [0, -s], e - a - 0.5, 0.62);
        // Shelves of bolts on the back wall, a cutting table with more, a lamp over it.
        for (let row = 0; row < 4; row++) {
          const y = GY + 0.35 + row * 0.62;
          b.deco(TIMBER, a + 0.15, y - 0.04, Math.min(zw, zw - s * 0.5), e - 0.15, y, Math.max(zw, zw - s * 0.5));
          for (let x = a + 0.22; x + 0.2 < e - 0.2; x += 0.24) {
            if (r() < 0.12) continue;
            b.deco(`flat:${BOLTS[Math.floor(r() * BOLTS.length)]}`, x, y, Math.min(zw - s * 0.04, zw - s * 0.46), x + 0.2, y + 0.3 + r() * 0.22, Math.max(zw - s * 0.04, zw - s * 0.46));
          }
        }
        const tz = (zw + zf) / 2 - s * 0.3, ta = a + 0.9, te = e - 0.9;
        b.box(TIMBER, ta, GY + 0.72, tz - 0.45, te, GY + 0.8, tz + 0.45);
        b.block(ta, GY, tz - 0.45, te, GY + 0.8, tz + 0.45);
        for (const [px, pz] of [[ta + 0.06, tz - 0.39], [te - 0.06, tz + 0.39], [ta + 0.06, tz + 0.39], [te - 0.06, tz - 0.39]]) b.deco(TIMBER, px - 0.04, GY, pz - 0.04, px + 0.04, GY + 0.72, pz + 0.04);
        for (let x = ta + 0.15; x + 0.9 < te; x += 1.05) b.deco(`flat:${BOLTS[Math.floor(r() * BOLTS.length)]}`, x, GY + 0.8, tz - 0.32 + r() * 0.1, x + 0.85, GY + 0.92 + r() * 0.08, tz - 0.1 + r() * 0.3);
        b.mesh('metal:#2b2e33', 'cyl', (a + e) / 2, GY + (2.5 + CE) / 2, tz, 0.03, CE - 2.5, 0.03);
        b.mesh('light', 'sphere', (a + e) / 2, GY + 2.4, tz, 0.4, 0.3, 0.4);
      }
    }
    // The hanging-thread mural on the north wall beside the well, and the centre's name facing the stair's head.
    b.sign({ k: 'mural', v: 'threads', color: '#b7282e' }, (bx0 + bx1) / 2 + (east ? -1.5 : 1.5), GY + 2.3, zi0 + WT + 0.02, [0, 1], bx1 - bx0 + 4, 2.4);
  });
}
