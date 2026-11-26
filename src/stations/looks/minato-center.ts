// Station look: Minato Center (N-01), the Nagisa Line's western terminus under the bay new town (rebuilt
// 2026-11-25; restyled the same day to match the atrium). The concourse, the stairs, Exit 1's corridor and the
// platforms take the atrium's language (minatocenter-atrium.ts): white enamel walls with a Nagisa-blue line, a
// ceiling of white fins in a slow wave with light lines between them, round white columns with a blue band, digital
// posters, and an LED portal at the gate line. The bay mural stays on the platforms' buffer-end wall.

import { defaultLook } from './default';
import { exitDado, posterRow, roundPillar } from './parts';
import type { ConcInfo, StationLook } from './types';

const BLUE = '#1673c9', WHITE = 'paint:#f8f8f6', ENAMEL = 'paint:#eef1f3';
type Span = [number, number];

/** True if u lies in none of the spans (grown by m). */
const clear = (u: number, spans: Span[], m = 0) => !spans.some(([p, q]) => u > p - m && u < q + m);

/** The ceiling's fin depth at (x, z): a slow, shallow wave (kept above the hung signs, which reach cf + 2.86). */
const finDrop = (x: number, z: number) => 0.04 + 0.08 * (0.5 + 0.5 * Math.sin(x * 0.32 + z * 0.15));

export const look: StationLook = {
  ...defaultLook,
  finishes: { wall: ENAMEL, floor: 'floor:#d4d9dc', ceil: 'paint:#f2f3f1', pillar: WHITE },
  posters: false,

  pillar(i, x, z, y0, y1) {
    roundPillar(i, x, z, y0, y1, { mat: WHITE, band: BLUE, bandY: i.cf + 1.15, half: 0.42 });
  },

  lights(i: ConcInfo) {
    const { b, cf, clear: h, x0, x1, cw } = i, top = cf + h;
    // White fins running along the hall, 0.9 m apart, broken at the gate lines, the stairwells and the pillars; a light
    // line in every third gap.
    const gates: Span[] = i.ends.map((e): Span => [e.g - 2.8, e.g + 2.8]);
    // (Kept 1 m off the long walls: the shop and room signs stand 0.6 m out from them.)
    for (let z = -cw + 1.0, k = 0; z < cw - 0.9; z += 0.9, k++) {
      const wells = i.stairwells.filter(({ footprint: f }) => z > f[1] - 0.3 && z < f[3] + 0.3).map(({ footprint: f }): Span => [f[0] - 0.3, f[2] + 0.3]);
      const pil = i.pillars.filter(([, pz]) => Math.abs(pz - z) < 0.6).map(([px]): Span => [px - 0.55, px + 0.55]);
      const gaps = [...gates, ...wells, ...pil];
      for (let x = x0 + 0.3; x < x1 - 0.3; x += 1.5) {
        const e = Math.min(x + 1.5, x1 - 0.3);
        if (!clear((x + e) / 2, gaps, 0.75)) continue;
        b.deco(WHITE, x, top - finDrop(x + 0.75, z), z - 0.035, e, top, z + 0.035);
        if (k % 3 === 1) b.deco('light', x, top - 0.02, z + 0.4, e, top, z + 0.5);
      }
    }
    // Over the gate lines: an LED ribbon across the ceiling.
    for (const e of i.ends) {
      b.deco('glow:#7cc4ff', e.g - 1.6, top - 0.015, -cw, e.g - 1.3, top, cw);
      b.deco('glow:#7cc4ff', e.g + 1.3, top - 0.015, -cw, e.g + 1.6, top, cw);
    }
  },

  concourse(i) {
    // (Dressed as a new hall, with a pale accent: a white enamel dado and no old pipes and battens, to match the atrium.)
    defaultLook.concourse?.({ ...i, era: Math.max(i.era, 2015), style: { ...i.style, wall: ENAMEL, concWall: ENAMEL, pillar: WHITE, accent: '#dfe5ea' } });
    const { b, cf, cw, x0, x1, clear: h } = i, top = cf + h;
    for (const s of [-1, 1] as const) {
      const gaps = i.openings.filter((o) => o.s === s).map((o): Span => [o.x0, o.x1]);
      const face = s > 0 ? cw : -cw, d = s > 0 ? -1 : 1;
      // The blue line at hand height, broken by every opening (the walls themselves are white enamel: specs.ts).
      let from = x0;
      for (const [a, e] of [...gaps.sort((p, q) => p[0] - q[0]), [x1, x1] as Span]) {
        if (a - from > 0.5) b.deco(`paint:${BLUE}`, from, cf + 1.05, Math.min(face, face + d * 0.015), a, cf + 1.15, Math.max(face, face + d * 0.015));
        from = Math.max(from, e);
      }
      // Digital posters along the paid side's walls.
      posterRow(i, s, i.paid[0] + 2, i.paid[1] - 2, { digital: true, pitch: 6 });
      // The gate line's portal: tall LED strips on both walls either side of it.
      for (const e of i.ends) for (const dx of [-1.45, 1.45]) {
        const x = e.g + dx;
        b.deco('light', x - 0.04, cf + 0.25, Math.min(face, face + d * 0.03), x + 0.04, top - 0.05, Math.max(face, face + d * 0.03));
      }
    }
  },

  exit(e) {
    // White enamel with a blue line, as the concourse (no tiled dado); light lines down the corridor's ceiling.
    exitDado(e, { mat: WHITE, top: 1.05, cap: `paint:${BLUE}` });
    const { b, cf, ext } = e;
    if (ext > 0.5) for (let z = 0.6; z < ext - 0.5; z += 2.4) b.deco('light', -2.3, cf + 2.48, z, -1.7, cf + 2.5, z + 1.6);
  },

  platform(h) {
    const { b, pf, wallZ, H, P } = h;
    // The band along both walls, and the bay mural across the buffer-end wall (−x, where the line ends).
    for (const s of [-1, 1] as const) {
      for (const [a, e] of h.wallRuns(s)) {
        const z0 = s > 0 ? wallZ - 0.02 : -wallZ, z1 = s > 0 ? wallZ : -wallZ + 0.02;
        b.deco(`paint:${BLUE}`, a, pf + 2.2, z0, e, pf + 2.42, z1);
        b.deco('paint:#9ec3e6', a, pf + 2.46, z0, e, pf + 2.5, z1);
      }
    }
    b.sign({ k: 'mural', v: 'skyline', color: BLUE }, -H + 0.04, pf + 1.9, 0, [1, 0], Math.min(2 * wallZ - 2, 14), 2.4);
    // Continuous light lines over each platform, in white trays, broken where a stair or a hung sign's mount is.
    for (const s of [-1, 1]) {
      const z = h.island ? s * 1.2 : (s * (h.pe + wallZ)) / 2;
      for (let x = -P + 1; x < P - 1; x += 2) {
        if (h.blocked(x, x + 2, 0.2)) continue;
        const y = h.ceilAt(x + 1);
        b.deco(WHITE, x, y - 0.06, z - 0.18, x + 2, y, z + 0.18);
        b.deco('light', x + 0.05, y - 0.075, z - 0.08, x + 1.95, y - 0.06, z + 0.08);
      }
    }
    // The end-of-line board over each platform's end barrier.
    const x = -P + 1.6;
    for (const s of [-1, 1]) {
      const z = h.island ? 0 : (s * (h.pe + h.wallZ)) / 2;
      h.b.hang({ k: 'label', text: '渚線 終点 みなとセンター', sub: 'Minato Center — end of the Nagisa Line', fg: '#fff', bg: BLUE },
        x, pf + 2.6, z, 3.6, 0.52, { ceil: h.ceilAt(x) });
      if (h.island) break;
    }
  },
};
