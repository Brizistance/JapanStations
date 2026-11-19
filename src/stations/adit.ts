// Narukozaka (鳴子坂): a hillside adit. The station lies deep under the hilltop estate, but the
// slope it is named for falls away just south of it to the valley's rice fields, level with the
// concourse. So besides its exits up to the hilltop, the paid concourse has a timbered level
// tunnel (the adit) running out through the hill to a small valley entrance with its own gates,
// whose portal opens straight onto the valley floor. Above it the slope climbs in stone-walled
// rice terraces strung with naruko clappers, and a glass lift tower climbs to the hilltop.
//
// Station frame: +x along the line, the valley on the +z side (SurfaceSpec.valleyZ).

import { PLOT_X, PLOT_Z, tree as treeAt } from './surface';
import { GROUND_Y as GY_ADIT } from './kit';
import { ceilingLight, gateLine, type Ctx } from './kit';
import { linesAt } from '../data/network';

/** The adit's doorway in the concourse's +z wall, and where the slope starts. */
export const ADIT_X: [number, number] = [22, 26];
export const VALLEY_Z = 44;
/** How far the hillsides round the valley reach out past the plot. */
const HILL = 60;
/** The valley hall (gates and portal), and the face of the slope it is set into. */
const HX0 = 16, HX1 = 32, HZ0 = 48, HZ1 = 58;
const TIMBER = 'flat:#6b4a2b', STONE = 'brick:#8f8a80', ROOF = 'flat:#3b3f44';

export function buildAdit(c: Ctx, cf: number, cw: number) {
  const { b, station, style } = c;
  const [ax0, ax1] = ADIT_X;
  const X = PLOT_X, Z = PLOT_Z;
  const hallTop = cf + 3.6;

  // ── The adit: a level tunnel lined in timber frames ──
  b.box(style.floor, ax0, cf - 0.5, cw, ax1, cf, HZ0);
  b.box('flat:#d9d2c3', ax0 - 0.3, cf, cw, ax0, cf + 3.2, HZ0);
  b.box('flat:#d9d2c3', ax1, cf, cw, ax1 + 0.3, cf + 3.2, HZ0);
  b.box('flat:#d9d2c3', ax0 - 0.3, cf + 2.8, cw, ax1 + 0.3, cf + 3.2, HZ0);
  for (let z = cw + 1.5; z < HZ0 - 0.5; z += 3) {
    b.deco(TIMBER, ax0, cf, z - 0.12, ax0 + 0.18, cf + 2.8, z + 0.12);
    b.deco(TIMBER, ax1 - 0.18, cf, z - 0.12, ax1, cf + 2.8, z + 0.12);
    b.deco(TIMBER, ax0, cf + 2.6, z - 0.12, ax1, cf + 2.8, z + 0.12);
    if (Math.round((z - cw - 1.5) / 3) % 2 === 0) ceilingLight(b, ax0 + 1.6, ax1 - 1.6, z + 0.6, z + 2.4, cf + 2.8);
  }
  // Tactile guide strip and a gold line down the middle.
  b.deco('flat:#e2b100', (ax0 + ax1) / 2 - 0.15, cf, cw, (ax0 + ax1) / 2 + 0.15, cf + 0.01, HZ0);
  b.deco(`paint:${c.line.color}`, ax0 + 0.18, cf + 1.0, cw, ax0 + 0.2, cf + 1.1, HZ0);
  b.deco(`paint:${c.line.color}`, ax1 - 0.2, cf + 1.0, cw, ax1 - 0.18, cf + 1.1, HZ0);
  // Across the tunnel (it runs along z): the valley side read walking in, the way back on the other face.
  b.with({ rot: 1, t: [(ax0 + ax1) / 2, 0, cw + 2] }, () =>
    b.hang({ k: 'guide', ja: '改札・のりば', en: 'Ticket gates / Trains', bg: 'navy', arrow: 'up' }, 0, cf + 2.25, 0, 3.4, 0.42, {
      ceil: cf + 2.8, back: { k: 'guide', ja: '谷口(田園側)', en: 'Valley entrance', bg: 'yellow', arrow: 'up' },
    }));
  b.zone('passage', ax0, cf - 0.5, cw, ax1, cf + 2.8, HZ0, '谷口連絡通路', 'Valley passage');

  // ── The valley hall: gates across it, the portal onto the fields ──
  b.box(style.floor, HX0, cf - 0.5, HZ0, HX1, cf, HZ1);
  // Back wall, with the doorway from the adit.
  b.box(style.concWall, HX0 - 0.3, cf, HZ0 - 0.3, ax0 - 0.3, hallTop, HZ0);
  b.box(style.concWall, ax1 + 0.3, cf, HZ0 - 0.3, HX1 + 0.3, hallTop, HZ0);
  b.box(style.concWall, ax0 - 0.3, cf + 2.8, HZ0 - 0.3, ax1 + 0.3, hallTop, HZ0);
  b.box(style.concWall, HX0 - 0.3, cf, HZ0, HX0, hallTop, HZ1);
  b.box(style.concWall, HX1, cf, HZ0, HX1 + 0.3, hallTop, HZ1);
  b.box('ceil', HX0 - 0.3, hallTop, HZ0 - 0.3, HX1 + 0.3, hallTop + 0.4, HZ1 + 1.2);
  for (let x = HX0 + 2; x + 2 <= HX1 - 1; x += 4) ceilingLight(b, x, x + 2, HZ0 + 6, HZ0 + 6.3, hallTop);
  b.with({ rot: 1, t: [(ax0 + ax1) / 2, 0, HZ0 + 2.5] }, () => gateLine(c, cf, 8, linesAt(station.id).map((l) => l.id), 3.6));
  // Front: glazed screen either side of the open portal, timber posts and a deep canopy.
  const px0 = 19, px1 = 29;
  for (const [xa, xb] of [[HX0 - 0.3, px0], [px1, HX1 + 0.3]]) {
    b.box('flat:#2b2f34', xa, cf, HZ1 - 0.15, xb, hallTop, HZ1);
    b.deco('glass', xa + 0.2, cf + 0.3, HZ1 - 0.02, xb - 0.2, hallTop - 0.3, HZ1 + 0.02);
  }
  b.box(STONE, HX0 - 0.3, hallTop + 0.4, HZ1 - 0.15, HX1 + 0.3, hallTop + 1.4, HZ1 + 0.3);
  b.sign({ k: 'mural', ...style.mural }, HX0 + 0.03, cf + 1.9, (HZ1 + HZ0 + 6) / 2, [1, 0], 3.6, 2.2);
  b.zone('concourse', HX0, cf - 0.5, HZ0, HX1, hallTop, HZ1, '鳴子坂駅 谷口', 'Narukozaka — valley entrance');

  // ── Outside: the slope, the valley floor and the lift tower, all in daylight ──
  b.open(() => {
    // Rice terraces stepping down from the hilltop street to the portal's face.
    for (let i = 0; i < 7; i++) {
      const z0 = VALLEY_Z + 2 * i, z1 = z0 + 2, top = -2 * (i + 1);
      // Over the valley hall and the adit, the terrace stands on their roofs. It runs on past the
      // plot into the end hillsides, so no gap opens under the street at the valley's corners.
      const runs: [number, number, number][] = z0 >= HZ0
        ? [[-X - HILL, HX0 - 0.6, cf - 0.6], [HX0 - 0.6, HX1 + 0.6, hallTop + 1.4], [HX1 + 0.6, X + HILL, cf - 0.6]]
        : [[-X - HILL, ax0 - 0.3, cf - 0.6], [ax0 - 0.3, ax1 + 0.3, cf + 3.6], [ax1 + 0.3, X + HILL, cf - 0.6]];
      for (const [xa, xb, bot] of runs) {
        b.box(STONE, xa, bot, z0, xb, top - 0.3, z1);
        b.box(i % 2 ? 'water' : 'flat:#7a9a4a', xa, top - 0.3, z0, xb, top, z1 - 0.3);
        b.box('flat:#8a7a52', xa, top - 0.3, z1 - 0.3, xb, top + 0.12, z1);
      }
      // Naruko clappers on a string across the terrace, west of the portal.
      const sy = top + 0.9, sz = z0 + 1;
      b.deco('flat:#d8cfb8', -70, sy, sz - 0.01, 8, sy + 0.01, sz + 0.01);
      for (let x = -68; x < 8; x += 2.5) {
        b.deco('flat:#c9a35a', x - 0.2, sy - 0.32, sz - 0.02, x + 0.2, sy - 0.02, sz + 0.02);
        for (const dx of [-0.12, 0, 0.12]) b.deco('flat:#9c7a3a', x + dx - 0.03, sy - 0.3, sz + 0.02, x + dx + 0.03, sy - 0.12, sz + 0.06);
      }
      for (const x of [-70, -31, 8]) b.deco(TIMBER, x - 0.05, top, sz - 0.05, x + 0.05, sy + 0.1, sz + 0.05);
    }
    // Timber portal canopy and the entrance sign.
    b.deco(TIMBER, px0 - 1, hallTop + 0.1, HZ1, px1 + 1, hallTop + 0.4, HZ1 + 3.2);
    b.deco(ROOF, px0 - 1.2, hallTop + 0.4, HZ1, px1 + 1.2, hallTop + 0.6, HZ1 + 3.4);
    for (const x of [px0 - 0.8, px1 + 0.6]) b.box(TIMBER, x, cf, HZ1 + 2.8, x + 0.2, hallTop + 0.1, HZ1 + 3.0);
    b.sign({ k: 'entrance', station: station.id }, (px0 + px1) / 2, hallTop + 1.0, HZ1 + 0.32, [0, 1], 7, 0.9);

    // The valley floor: a plaza at the portal, a farm road south, paddies either side.
    b.box('grass', -X, cf - 0.6, HZ1, X, cf - 0.2, Z);
    b.box('paver', 6, cf - 0.2, HZ1, 42, cf, HZ1 + 10);
    b.box('paver', 19, cf - 0.2, HZ1 + 10, 29, cf, Z);
    for (const [xa, xb] of [[-X + 2, 4], [44, X - 2]]) {
      for (let x = xa; x + 10 <= xb; x += 12) {
        for (let z = HZ1 + 4; z + 8 <= Z - 2; z += 10) {
          // A flooded paddy under young rice: dark water between dense green rows, a low bund round it.
          b.deco('flat:#4f6a58', x, cf - 0.2, z, x + 11, cf - 0.12, z + 9);
          for (let r = z + 0.5; r < z + 8.8; r += 0.55) b.deco('flat:#7aa83e', x + 0.4, cf - 0.12, r, x + 10.6, cf + 0.22, r + 0.22);
          for (const [a0, a1, c0, c1] of [[x, x + 11, z - 0.25, z], [x, x + 11, z + 9, z + 9.25], [x - 0.25, x, z, z + 9], [x + 11, x + 11.25, z, z + 9]]) {
            b.deco('flat:#8aa04f', a0, cf - 0.2, c0, a1, cf + 0.05, c1);
          }
        }
      }
    }
    // Farmhouses with dark tile roofs.
    for (const [x, z] of [[-96, 74], [-58, 76], [78, 72], [108, 76]]) {
      b.box('flat:#d8cdb4', x - 5, cf - 0.2, z - 4, x + 5, cf + 3.2, z + 4);
      b.box(ROOF, x - 5.6, cf + 3.2, z - 4.6, x + 5.6, cf + 4.0, z + 4.6);
      b.box(ROOF, x - 4.4, cf + 4.0, z - 2.6, x + 4.4, cf + 4.6, z + 2.6);
    }
    // The lift tower up the slope to the hilltop (not in service yet), rising out of the
    // terraces: glass front, steel frame, a lit car near the top.
    const lx0 = 36, lx1 = 39.2, lz0 = VALLEY_Z + 0.4, lz1 = lz0 + 3.2;
    b.box('flat:#2b2f34', lx0, cf, lz0, lx1, 3.6, lz0 + 0.12);
    b.box('flat:#2b2f34', lx0, cf, lz0, lx0 + 0.12, 3.6, lz1);
    b.box('flat:#2b2f34', lx1 - 0.12, cf, lz0, lx1, 3.6, lz1);
    b.box('glass', lx0 + 0.12, cf, lz1 - 0.06, lx1 - 0.12, 3.6, lz1);
    b.deco('glow:#fff3d6', lx0 + 0.4, -1.8, lz1 - 0.5, lx1 - 0.4, 0.4, lz1 - 0.1);
    b.deco(ROOF, lx0 - 0.3, 3.6, lz0 - 0.3, lx1 + 0.3, 3.9, lz1 + 0.3);

    // The valley's other sides: terraced hillsides rising from the fields to the hilltop street
    // beyond the far side and both ends, so the valley reads as a valley and the city stands back
    // on its rim. Each step: a grass bank sloping up, then a flooded paddy with rows of rice and a
    // raised bund at its outer edge. The backdrop city keeps off them.
    const L = HILL, n = Math.ceil(-cf / 2), h = -cf / n, d = L / n;
    const GREENS = ['flat:#6f8a3a', 'flat:#7a9442', 'flat:#65803a', 'flat:#82994a'];
    let seed = 421;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
    const hill = (z0: number, z1: number) => {
      // Local frame: x runs out from the valley edge (0) to the hilltop (L), z along the edge.
      // Each terrace is cut into plots 14–28 m long whose edges and levels do not line up, as
      // real terraces follow the slope's contours.
      for (let pz = z0; pz < z1 - 0.5;) {
        const qz = Math.min(z1, pz + 14 + rnd() * 14);
        const tree = rnd() < 0.35 ? Math.floor(rnd() * n) : -1;
        for (let k = 0; k < n; k++) {
          const j = k === n - 1 ? 0 : (rnd() - 0.5) * 1.6, x0 = k * d + (k ? j : 0), x1 = (k + 1) * d + (k === n - 1 ? 0 : j * 0.5);
          const yk = cf + k * h, top = cf + (k + 1) * h + (k === n - 1 ? 0 : (rnd() - 0.5) * 0.3), bank = 1.2 + rnd() * 0.8;
          b.slant(GREENS[Math.floor(rnd() * GREENS.length)], x0, yk - 0.25 - h - 0.6, pz, x0 + bank, yk - 0.25, qz, top - yk);
          b.deco('flat:#5a4a36', x0 + bank, cf - 0.6, pz, x1, top - 0.3, qz);
          b.deco('flat:#4f6a58', x0 + bank, top - 0.3, pz, x1 - 0.3, top - 0.25, qz);
          for (let x = x0 + bank + 0.3; x < x1 - 0.5; x += 0.55) b.deco('flat:#7aa83e', x, top - 0.25, pz + 0.3, x + 0.22, top + 0.1, qz - 0.3);
          // The bund, and rice standing tall along the outer edge where it shows from below.
          b.deco('flat:#8aa04f', x1 - 0.3, top - 0.3, pz, x1, top - 0.1, qz);
          b.deco('flat:#86b84a', x0 + bank - 0.1, top - 0.25, pz + 0.3, x0 + bank + 0.35, top + 0.35, qz - 0.3);
          if (k === tree) b.with({ t: [0, top - 0.25 - GY_ADIT, 0] }, () => treeAt(b, (x0 + x1) / 2, (pz + qz) / 2, 3.5 + rnd() * 2));
        }
        pz = qz;
      }
    };
    b.with({ rot: 1, t: [0, 0, Z] }, () => hill(-X - L, X + L)); // far side: local x → +z
    // The ends run on through the far corners (overlapping the far side), so the hillsides meet
    // the street all round their outer edge and no gap opens under the city at a corner.
    b.with({ t: [X, 0, 0] }, () => hill(VALLEY_Z, Z + L)); // +x end
    b.with({ rot: 2, t: [-X, 0, 0] }, () => hill(-Z - L, -VALLEY_Z)); // −x end (rotated: z flips)
    // Past the plot the street has no edge of its own: a masonry face up to it along the slope's top.
    for (const [x0, x1] of [[-X - L, -X], [X, X + L]]) b.deco(STONE, x0, cf - 0.6, VALLEY_Z - 0.4, x1, 0.15, VALLEY_Z + 0.05);
    b.clearScenery(-X - L, Z, X + L, Z + L);
    b.clearScenery(X, VALLEY_Z - 4, X + L, Z + L);
    b.clearScenery(-X - L, VALLEY_Z - 4, -X, Z + L);

    // Edges of the walkable valley: the plot boundary, below street level.
    b.block(-X - 1, cf - 1, HZ1, -X, 0, Z + 1);
    b.block(X, cf - 1, HZ1, X + 1, 0, Z + 1);
    b.block(-X, cf - 1, Z, X, 0, Z + 1);
    b.zone('street', -X, cf - 0.3, HZ1, X, cf + 30, Z, '鳴子坂 田園口', 'Narukozaka — valley fields');
  });
}
