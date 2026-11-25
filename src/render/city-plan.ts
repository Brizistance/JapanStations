// The city mini-map's plan (ui/Compass.tsx CityMap, 2026-11-24): streets, pavements, green and building
// footprints in world x/z, gathered from what is built (every station's boxes and models) and from the
// backdrop city as world-view.ts lays it out, bucketed in 100 m cells; and the railways above ground.
// Water and land come straight from data/geography.ts.

import { STATIONS } from '../data/network';
import { WORLD_NET } from '../sim';
import { WORLDS, type StationWorld } from '../stations';
import { BUILDING_MODELS } from '../stations/buildings';
import { structureAt, sampleChainages } from '../world/structure';
import type { Anchors } from '../stations/anchors/types';
import { AIZOME } from '../stations/anchors/aizome';
import { AIZOMEFRONT } from '../stations/anchors/aizomefront';
import { AOBA } from '../stations/anchors/aoba';
import { AOBAFRONT } from '../stations/anchors/aobafront';
import { DAIGAKU } from '../stations/anchors/daigaku';
import { DAIGAKUFRONT } from '../stations/anchors/daigakufront';
import { GATE } from '../stations/anchors/gate';
import { HIBARI } from '../stations/anchors/hibari';
import { HIBARIFRONT } from '../stations/anchors/hibarifront';
import { KAWAEKI } from '../stations/anchors/kawaeki';
import { KITAARCADE } from '../stations/anchors/kitaarcade';
import { KITACITY } from '../stations/anchors/kitacity';
import { KITAFRONT } from '../stations/anchors/kitafront';
import { KONYA } from '../stations/anchors/konya';
import { MINATO } from '../stations/anchors/minato';
import { MINATOFRONT } from '../stations/anchors/minatofront';
import { MIOCHIKA } from '../stations/anchors/miochika';
import { MIOYA } from '../stations/anchors/mioya';
import { PORT } from '../stations/anchors/port';
import { RING } from '../stations/anchors/ring';
import { TOSEN } from '../stations/anchors/tosen';
import { TSUNA } from '../stations/anchors/tsuna';
import { URAFRONT } from '../stations/anchors/urafront';
import { KAMOME } from '../stations/anchors/kamome';
import { HATOBA } from '../stations/anchors/hatoba';
import { TOKEI } from '../stations/anchors/tokei';
import { TSUMUGIFRONT } from '../stations/anchors/tsumugifront';
import { TSUMUGIKIT } from '../stations/anchors/tsumugikit';
import { VIADUCT } from '../stations/anchors/viaduct';

/** What a shape is on the plan, in drawing order. */
export type PlanKind = 'green' | 'pave' | 'road' | 'block';
export interface PlanShape {
  kind: PlanKind;
  /** World x, z, x, z, … */
  pts: number[];
  /** Height of its top: drawn lowest first, so paving laid over a road shows on top of it. */
  y: number;
  /** Last draw that took it (to take each once). */
  seen: number;
}

const CELL = 100;
const DEFAULT_Y: Record<PlanKind, number> = { road: 0, pave: 0.15, green: 0.2, block: 10 };
const cells = new Map<string, PlanShape[]>();
const key = (i: number, j: number) => `${i},${j}`;

/** Add a world-space polygon to the plan. */
export function planPoly(kind: PlanKind, pts: number[], y = DEFAULT_Y[kind]) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
    z0 = Math.min(z0, pts[i + 1]); z1 = Math.max(z1, pts[i + 1]);
  }
  const s: PlanShape = { kind, pts, y, seen: -1 };
  for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) {
    for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) {
      const k = key(i, j);
      (cells.get(k) ?? cells.set(k, []).get(k)!).push(s);
    }
  }
}

/** A rectangle x0 … x1 by z0 … z1 in a frame at (fx, fz) turned by `yaw` (three.js rotation about y). */
export function planRect(kind: PlanKind, fx: number, fz: number, yaw: number, x0: number, z0: number, x1: number, z1: number, y?: number) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const w = (lx: number, lz: number) => [fx + lx * c + lz * s, fz - lx * s + lz * c];
  planPoly(kind, [...w(x0, z0), ...w(x1, z0), ...w(x1, z1), ...w(x0, z1)], y);
}

/** A building's footprint: its frontage's middle at (x, z), its front turned by `yaw`, w wide and d deep behind it. */
export function planBuilding(x: number, z: number, yaw: number, w: number, d: number) {
  planRect('block', x, z, yaw, -w / 2, 0, w / 2, d);
}

const ANCHORS: Record<string, Anchors> = {
  aizome: AIZOME, aizomefront: AIZOMEFRONT, aoba: AOBA, aobafront: AOBAFRONT, daigaku: DAIGAKU, daigakufront: DAIGAKUFRONT,
  gate: GATE, hibari: HIBARI, hibarifront: HIBARIFRONT, kawaeki: KAWAEKI, kitaarcade: KITAARCADE, kitacity: KITACITY,
  kitafront: KITAFRONT, konya: KONYA, minato: MINATO, minatofront: MINATOFRONT, miochika: MIOCHIKA, mioya: MIOYA, port: PORT,
  ring: RING, hatoba: HATOBA, tokei: TOKEI, tosen: TOSEN, tsuna: TSUNA, urafront: URAFRONT, kamome: KAMOME, tsumugifront: TSUMUGIFRONT, tsumugikit: TSUMUGIKIT, viaduct: VIADUCT,
};
/** Things on the water or too small to be a building on the plan. */
const NOT_BUILDING = /boat|barge|lorry|crane|ferry|teibo|todai|quayrail|bollard|lamp|rail|sign|bench|tree|fence|pylon|steps|dryframe|paifang|koro|hokage|gazebo/;

/** A model's footprint size, or null if it is not a building (or not known). */
export function modelSize(kind: string, id: string): { w: number; d: number; h: number } | null {
  const base = id.replace(/_lo$/, '');
  if (NOT_BUILDING.test(base)) return null;
  const a = ANCHORS[kind]?.[base] ?? BUILDING_MODELS.find((m) => m.kind === kind && m.id === base);
  if (!a || a.h < 4 || a.w * a.d < 30) return null;
  return a;
}

function addWorld(w: StationWorld) {
  const { x: fx, z: fz, yaw } = w.frame;
  for (const b of w.build.boxes) {
    if (b.mat === 'none') continue;
    const [x0, y0, z0] = b.min, [x1, y1, z1] = b.max, wx = x1 - x0, wz = z1 - z0;
    let kind: PlanKind | null = null;
    if (b.mat.startsWith('asphalt') && y1 > -0.15 && y1 < 0.08 && wx * wz > 2) kind = 'road';
    else if ((b.mat.startsWith('paver') || b.mat.startsWith('setts') || b.mat === 'concrete' || b.mat.startsWith('flat:#b9b3a6')) && y1 > -0.05 && y1 < 0.3 && wx * wz > 4) kind = 'pave';
    else if (/grass|lawn|turf|green:/.test(b.mat) && y1 > -0.2 && y1 < 0.8 && wx * wz > 4) kind = 'green';
    else if (y0 < 1 && y1 > 3.5 && Math.min(wx, wz) > 2 && wx * wz > 12 && b.min[1] > -2) kind = 'block';
    if (kind) planRect(kind, fx, fz, yaw, x0, z0, x1, z1, kind === 'block' ? Math.max(y1, 4) : y1);
  }
  const c = Math.cos(yaw), s = Math.sin(yaw);
  // Polygons laid at an angle (a diagonal avenue, a round plaza).
  for (const p of w.build.polys ?? []) {
    const kind: PlanKind | null = p.mat.startsWith('asphalt') && p.y1 < 0.08 ? 'road' : /paver|setts|tile|concrete|#b9b3a6/.test(p.mat) && p.y1 < 0.3 ? 'pave' : /grass|lawn|turf|green:/.test(p.mat) ? 'green' : null;
    if (kind) planPoly(kind, p.pts.flatMap(([x, z]) => [fx + x * c + z * s, fz - x * s + z * c]), p.y1);
  }
  for (const m of w.build.models) {
    if (m.pos[1] < -1 || m.pos[1] > 2) continue;
    const x = fx + m.pos[0] * c + m.pos[2] * s, z = fz - m.pos[0] * s + m.pos[2] * c;
    // (Minatoura-bashi's deck is the road over the inlet.)
    if (m.kind === 'minato' && m.id === 'bridge') {
      const a = MINATO.bridge;
      planRect('road', x, z, yaw + m.yaw, -a.w / 2, -a.d / 2 + 2.5, a.w / 2, a.d / 2 - 2.5);
      planRect('pave', x, z, yaw + m.yaw, -a.w / 2, -a.d / 2, a.w / 2, -a.d / 2 + 2.5);
      planRect('pave', x, z, yaw + m.yaw, -a.w / 2, a.d / 2 - 2.5, a.w / 2, a.d / 2);
      continue;
    }
    const a = modelSize(m.kind, m.id);
    if (a) planBuilding(x, z, yaw + m.yaw, a.w, a.d);
  }
}

let stationsIn = false;
function ensureStations() {
  if (stationsIn) return;
  stationsIn = true;
  for (const w of WORLDS) addWorld(w);
}

let stamp = 0;
/** The plan's shapes with any part within `r` of (x, z), each once. */
export function planNear(x: number, z: number, r: number): PlanShape[] {
  ensureStations();
  const out: PlanShape[] = [];
  stamp++;
  for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) {
    for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
      for (const s of cells.get(key(i, j)) ?? []) {
        if (s.seen === stamp) continue;
        s.seen = stamp;
        out.push(s);
      }
    }
  }
  return out.sort((a, b) => a.y - b.y);
}

/** The railways above ground (cuttings, viaducts, the main line on its bank): each run as a polyline in its line's colour. */
let rails: { color: string; pts: number[] }[] | null = null;
export function planRails() {
  if (rails) return rails;
  rails = [];
  for (const { geom } of WORLD_NET) {
    let run: number[] = [];
    const flush = () => {
      if (run.length >= 4) rails!.push({ color: geom.def.color, pts: run });
      run = [];
    };
    for (const s of sampleChainages(geom, 8)) {
      const t = structureAt(geom, s);
      const above = t === 'viaduct' || t === 'cut' || (t === 'station' && geom.railY(s) > -3);
      if (!above) { flush(); continue; }
      const p = geom.path.pointAt(s);
      run.push(p.x, p.z);
    }
    flush();
  }
  return rails;
}

/** Every station's place and name, for the labels. */
export const PLAN_STATIONS = STATIONS.map((s) => ({ x: s.position.x, z: s.position.y, ja: s.nameJa, en: s.nameRomaji }));
