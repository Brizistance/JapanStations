// Roads that run on past the edge of a station's plot. A plot ends at an unseen wall, and the
// backdrop city beyond it has no streets of its own; so where a traffic lane meets the edge and
// nothing is in the way (another station's plot, open track), the road is carried on for a
// stretch: the backdrop keeps its buildings off it and paves it (render/world-view.ts), and the
// traffic drives in and out along it (traffic/street.ts), far enough off that nobody sees a
// vehicle appear.

import { inPlot, plotNorth } from './builder';
import { WORLD_NET } from '../sim';
import { STATION_WORLDS, type StationWorld } from '../stations';
import type { LanePart } from './builder';
import { toWorld } from './collision';
import { crossingsOf, sampleChainages, structureAt } from './structure';

/** How far a road runs on, and how wide the paving is to each side of a lane. */
export const RUN_ON = 90, RUN_ON_HALF = 3.4;

let open: { x: number; z: number }[] | null = null;
/** Every stretch of track that is open to the sky (a cut or a viaduct), as points 4 m apart; less the track either side of a level crossing, which a road runs on over. */
function openTrack() {
  if (open) return open;
  open = [];
  for (const { geom } of WORLD_NET) {
    const xings = crossingsOf(geom);
    for (const s of sampleChainages(geom)) {
      if (xings.some((c) => Math.abs(s - c.s) < 50)) continue;
      const type = structureAt(geom, s);
      if (type !== 'cut' && type !== 'viaduct') continue;
      const p = geom.path.pointAt(s);
      open.push({ x: p.x, z: p.z });
    }
  }
  return open;
}

/** True if the road can run on from frame point (x, z) in direction (ux, uz) for the whole stretch. */
function free(w: StationWorld, x: number, z: number, ux: number, uz: number): boolean {
  const p: [number, number, number] = [0, 0, 0];
  for (let d = 8; d <= RUN_ON + 16; d += 8) {
    toWorld(w.frame, [x + ux * d, 0, z + uz * d], p);
    for (const o of STATION_WORLDS) {
      if (o === w) continue;
      const dx = p[0] - o.frame.x, dz = p[2] - o.frame.z;
      if (Math.abs(dx) > 600 || Math.abs(dz) > 600) continue;
      const c = Math.cos(o.frame.yaw), s = Math.sin(o.frame.yaw);
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (inPlot(o.build.plot, lx, lz, 30)) return false;
    }
    for (const q of openTrack()) if (Math.abs(q.x - p[0]) < 40 && Math.abs(q.z - p[2]) < 40) return false;
  }
  return true;
}

const cache = new Map<StationWorld, [number, number][]>();
/** For each lane of a station, how far the road runs on before its start and after its end (0: it does not). */
export function runOns(w: StationWorld): [number, number][] {
  let out = cache.get(w);
  if (out) return out;
  const { x: px, z: pz } = w.build.plot, pn = plotNorth(w.build.plot);
  const atEdge = (p: [number, number, number], ux: number) => (Math.abs(ux) > 0.5 ? Math.abs(p[0]) > px - 2 : p[2] > pz - 2 || p[2] < -pn + 2);
  out = w.build.lanes.map((l) => {
    const dx = l.to[0] - l.from[0], dz = l.to[2] - l.from[2], n = Math.hypot(dx, dz) || 1, ux = dx / n, uz = dz / n;
    return [
      atEdge(l.from, ux) && free(w, l.from[0], l.from[2], -ux, -uz) ? RUN_ON : 0,
      atEdge(l.to, ux) && free(w, l.to[0], l.to[2], ux, uz) ? RUN_ON : 0,
    ];
  });
  cache.set(w, out);
  return out;
}

/** A station's lanes, each as long as its road runs: stop lines and the rest keep their places. */
export function longLanes(w: StationWorld): LanePart[] {
  const on = runOns(w);
  return w.build.lanes.map((l, i) => {
    const [before, after] = on[i];
    if (!before && !after) return l;
    const dx = l.to[0] - l.from[0], dz = l.to[2] - l.from[2], n = Math.hypot(dx, dz) || 1, ux = dx / n, uz = dz / n;
    return {
      ...l,
      from: [l.from[0] - ux * before, l.from[1], l.from[2] - uz * before],
      to: [l.to[0] + ux * after, l.to[1], l.to[2] + uz * after],
      stops: l.stops.map((s) => ({ ...s, at: s.at + before, exit: s.exit + before })),
      halts: l.halts.map((s) => ({ ...s, at: s.at + before })),
      yields: l.yields?.map((s) => ({ ...s, at: s.at + before })),
      gates: l.gates?.map((s) => ({ ...s, at: s.at + before })),
      avoid: l.avoid && { ...l.avoid, from: l.avoid.from + before, to: l.avoid.to + before },
    };
  });
}

/** The paving of a station's run-on roads, as rectangles in its frame (x0, z0, x1, z1). */
export function runOnStrips(w: StationWorld): [number, number, number, number][] {
  const on = runOns(w), out: [number, number, number, number][] = [];
  w.build.lanes.forEach((l, i) => {
    const dx = l.to[0] - l.from[0], dz = l.to[2] - l.from[2], n = Math.hypot(dx, dz) || 1, ux = dx / n, uz = dz / n;
    const strip = (p: [number, number, number], sx: number, sz: number) => {
      const ex = p[0] + sx * (RUN_ON + 12), ez = p[2] + sz * (RUN_ON + 12);
      const hx = Math.abs(uz) * RUN_ON_HALF, hz = Math.abs(ux) * RUN_ON_HALF;
      out.push([Math.min(p[0], ex) - hx, Math.min(p[2], ez) - hz, Math.max(p[0], ex) + hx, Math.max(p[2], ez) + hz]);
    };
    if (on[i][0]) strip(l.from, -ux, -uz);
    if (on[i][1]) strip(l.to, ux, uz);
  });
  return out;
}

/**
 * A station's run-on roads whole (the lanes' strips joined), each as its rectangle in the frame
 * and whether it runs along x: for the pavements beside it and the line down its middle.
 */
export function runOnRoads(w: StationWorld): { rect: [number, number, number, number]; alongX: boolean }[] {
  const roads = runOnStrips(w).map((rect) => ({ rect: [...rect] as [number, number, number, number], alongX: rect[2] - rect[0] > rect[3] - rect[1] }));
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < roads.length && !merged; i++) {
      for (let j = i + 1; j < roads.length && !merged; j++) {
        const a = roads[i].rect, b = roads[j].rect;
        if (roads[i].alongX !== roads[j].alongX || a[0] > b[2] + 1 || b[0] > a[2] + 1 || a[1] > b[3] + 1 || b[1] > a[3] + 1) continue;
        roads[i].rect = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
        roads.splice(j, 1);
        merged = true;
      }
    }
  }
  return roads;
}
