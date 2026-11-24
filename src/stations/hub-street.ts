// The streets of Kita-Ōdōri, the central hub: a dense terminal district in the Umeda manner
// (rebuilt 2026-11; docs/street-design.md has the owner's rules).
//
// Frame: +x east, +z south. A grid of 筋 (north–south) and 通 (east–west):
//
//   z −285 … −220   blocks either side of Tokei-suji (x 0), the avenue north from the station square
//   z −219 … −205   Ekimae-dōri, along the square's north edge
//   z −205 … −145   Kawaminato Station Square (x −94 … 96.5): a bus loop and a taxi loop off Ekimae-dōri, each
//                   round a planted island, and a paved forecourt before the building; beyond the wide streets
//                   either side, a short covered arcade (z −168 … −162) through the block
//   z −145 … −119   Kawaminato Station's brick building of 1914 (build_kawaeki.py), its great hall on the x 0 axis
//   z −119 … −106   the viaduct's 1914 widening: two more tracks and a third island (not in use yet)
//   z −106 … −80    the AR Main Line's viaduct: brick arches, girder bridges over the streets
//   z −80 … −74     Ekiura-dōri, a service lane between viaduct and terminal
//   z −74 … −19     the Mioya Terminal Building (x ±59) and the blocks either side of it
//   z −11 … 11      Kita-Ōdōri avenue
//   z 19 … 70       the front quarter: the Gate Towers either side of Yanagi-suji, big commercial fronts
//   z 73 … 82       Minami-ichiban-dōri;  z 125 … 131  Minami-niban-dōri (a local street)
//
//   x −155, −66, 66  one-way local streets          x −105  Hamate-suji (4 lanes, through)
//   x 0              Yanagi-suji (from the avenue south, ends at the terminal's door)
//   x 105            Shiomi-suji (through)          x 155   Chidori-suji (4 lanes, through)
//
// Traffic signals share one 60 s cycle (traffic/signals.ts): axis 0 is every east–west street,
// axis 1 every north–south one. Every place two streets with traffic cross is signalled; the
// local streets join the big ones by left turns only.
//
// The models are Blender-built (tools/blender/build_kitafront.py, build_mioya.py, build_gate.py,
// build_viaduct.py, build_ring.py, build_kitaarcade.py, build_kitacity.py). Where the game letters
// one, the place comes from src/stations/anchors/*.ts, written by those scripts.

import { AR_HUB_MODELS, RAIL_OPERATOR, linesAt, stationById } from '../data/network';
import type { SignContent } from '../signs/content';
import { rng, type Builder, type LanePart, type SignOpts, type V2 } from '../world/builder';
import type { Anchor, AnchorPt, Anchors } from './anchors/types';
import { GATE } from './anchors/gate';
import { KITAARCADE } from './anchors/kitaarcade';
import { INDOOR_LAMP } from '../render/lamps';
import { KAWAEKI } from './anchors/kawaeki';
import { TOKEI } from './anchors/tokei';
import { KITACITY } from './anchors/kitacity';
import { KITAFRONT } from './anchors/kitafront';
import { MIOYA } from './anchors/mioya';
import { RING } from './anchors/ring';
import { VIADUCT } from './anchors/viaduct';
import { GROUND_Y as GY, rail, stairs, vending, type Ctx } from './kit';
import { EXIT15, MIOYA_GATE, exit15Run, kawaminatoStation, mioyaGate, platformPiece } from './kawaminato';
import { KONBINI, konbini } from './konbini';
import { LIFT_DOOR, LIFT_DOOR_H, LIFT_OUT, lift } from './lift';
import { CARS, VEH } from '../traffic/vehicles';
import { PLACES, place, type PlaceKind } from './places';
import { kerbGaps, kerbRail, mark, pedSignal, poleLine, roadKit, roadModel, roadSign, shortSignal, streetLamp, trafficLane, vehicleSignal } from './roads';
import { crosswalk, fillModelLots } from './surface';
import { modelTree, type TreeKind } from './trees';

type Rect = [number, number, number, number];
type Face = 'n' | 's' | 'e' | 'w';
type Named = { ja: string; en: string };

/**
 * The stair from the food floor (B1) up into the grand concourse's lobby. hub.ts builds it and cuts its well. It
 * stands against the food floor's front wall, its foot beside the doorway from the North Passage (`HALL_DOOR`,
 * the doorway's x range) and climbs east: its z range, its foot's x, and its run for each metre of rise.
 */
export const HALL_STAIR_Z: [number, number] = [-67.4, -64.4];
export const HALL_STAIR = { foot: 1.8, pitch: 1.5 }, HALL_DOOR: [number, number] = [-8, 1.5];
/** "Reserved for future line" board. Says what kind of railway, never a service or a time. */
const RESERVED = (ja: string, en: string): SignContent => ({ k: 'label', text: `将来線予定地　${ja}`, sub: `Reserved for future line — ${en}`, fg: '#1b1f24', bg: '#ffd100' });
/** Half extents of the hub's plot. */
export const HUB_PLOT = { x: 190, z: 160, north: 285 };

const X = HUB_PLOT.x, Z = HUB_PLOT.z, ZN = HUB_PLOT.north;
/** The avenue's half width, and the building lines either side of it. */
const AV = 11, FRONT = 19;
/** A street running north–south: centre, half width of the carriageway, pavement width, lanes each way. */
interface NS { c: number; half: number; pave: number; name: Named; from: number; to: number }
const HAM: NS = { c: -105, half: 7, pave: 4, name: { ja: '浜手筋', en: 'Hamate-suji' }, from: -ZN, to: Z };
const YAN: NS = { c: 0, half: 10, pave: 6, name: { ja: '柳筋', en: 'Yanagi-suji' }, from: AV, to: Z };
const SHI: NS = { c: 105, half: 5.5, pave: 3, name: { ja: '汐見筋', en: 'Shiomi-suji' }, from: -ZN, to: Z };
const CHI: NS = { c: 155, half: 7, pave: 4, name: { ja: '千鳥筋', en: 'Chidori-suji' }, from: -ZN, to: Z };
const WIDE = [HAM, YAN, SHI, CHI];
/** The one-way local streets: centre, and the way their traffic goes (−1 north, +1 south). */
const LOCALS: { c: number; way: 1 | -1; name: Named }[] = [
  { c: -155, way: -1, name: { ja: '西小路', en: 'Nishi-kōji' } },
  { c: -66, way: -1, name: { ja: '澪屋西通', en: 'Mioya Nishi-dōri' } },
  { c: 66, way: 1, name: { ja: '澪屋東通', en: 'Mioya Higashi-dōri' } },
];
const LH = 3.25, LP = 1.5;
/** East–west streets other than the avenue: centre z, half width, pavement. */
const MIN = { z: 78, half: 4.5, pave: 3, name: { ja: '南一番通', en: 'Minami-ichiban-dōri' } };
const NIB = { z: 128, half: 3.25, pave: 1.5, name: { ja: '南二番通', en: 'Minami-niban-dōri' } };
/** Ekimae-dōri, along the station square's north edge (it took the place of Kōka-dōri, which ran where the viaduct now widens). */
const EKI = { z: -212, half: 4.5, pave: 3, name: { ja: '駅前通', en: 'Ekimae-dōri' } };
/** Tokei-suji: the avenue north from the station square, on Yanagi-suji's axis; it ends at Ekimae-dōri. */
const TOK: NS = { c: 0, half: 10, pave: 6, name: { ja: '時計筋', en: 'Tokei-suji' }, from: -ZN, to: EKI.z - EKI.half };
/** Ekimae-dōri's south kerb, and the station square's north edge behind its pavement. */
const KERB_S = EKI.z + EKI.half, SQ_N = KERB_S + EKI.pave;
/**
 * The station square's two loops off Ekimae-dōri's westbound lane, each round a planted island: in by the east
 * leg, west along the station's side (z0 … z1, the stopping kerb at z1), out by the west leg. Legs by their
 * centres [in, out], hw either side; buses west of the square's axis, taxis east of it.
 */
const LOOP = { z0: -180, z1: -172, hw: 3.5, bus: [-30, -76] as [number, number], taxi: [80, 34] as [number, number] };
/** Where a bus's middle stands at each bay, and the front of the taxi rank. */
const BUS_BAYS = [-62, -44], TAXI_K = 46;
const loopRects = ([i, o]: [number, number]): [number, number, number, number][] => [
  [o - LOOP.hw, LOOP.z0, i + LOOP.hw, LOOP.z1], [i - LOOP.hw, KERB_S, i + LOOP.hw, LOOP.z0], [o - LOOP.hw, KERB_S, o + LOOP.hw, LOOP.z0],
  // (The kerb is cut back where a bus swings in and out.)
  [i + LOOP.hw, KERB_S, i + LOOP.hw + 4, SQ_N], [o - LOOP.hw - 4, KERB_S, o - LOOP.hw, SQ_N],
];
/** The two short arcades either side of the square (what is left of Hokuei-dōri's): the walk's north and south edges. */
const ARC: [number, number] = [-168, -162];
/** The viaduct (north face, south face), the service lane south of it, the back quarter's building line. */
const VIA: [number, number] = [-106, -80], LANE_S = -74;
/** Where the viaduct's north face will stand once it is widened (stage 2), and the building line north of its service pavement. */
const NEW_N = -119, BACK = NEW_N - 3;
/** Under the viaduct's bridges: the local streets end there, at the way into the car parks in its arches. */
const UNDER = (VIA[0] + VIA[1]) / 2;
/** Kawaminato Station (AR) on the viaduct: its platforms' ends (12 cars; bay joints), and its five middle bays by their centres. */
const AR_PF: [number, number] = [-125, 127];
const AR_BAYS: Record<number, string> = { [-8]: 'ho8', 0: 'ho8', 8: 'he8', 16: 'hl8', 24: 'hs8', [-32]: 'stp8', 32: 'stp8' };
/** Of those, the hollow ones: kawaminato.ts builds what is inside them and their colliders, under the widening too. */
const AR_HOLLOW = ['ho8', 'he8', 'hl8', 'hs8'];
/** Stop lines stand this far outside a street's kerb where another crosses it (a crosswalk lies between). */
const SL = 5.2;
/** The footbridge ring and the terminal's terrace: deck level, deck width. */
const DECK = RING.pier.h, DW = RING.pier.d, RX = 19.5, RS = 14;

const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };
const NAME_FG = '#f3e3a0', NAME_BG = '#12382c';
const WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700';

const bl = (s: { c: number; half: number; pave: number }): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave];
const LOCAL_BL = LOCALS.map((l): [number, number] => [l.c - LH - LP, l.c + LH + LP]);
/** Intervals of x left between the given street corridors. */
function between(corridors: [number, number][], x0 = -X, x1 = X): [number, number][] {
  const out: [number, number][] = [];
  let from = x0;
  for (const [a, c] of [...corridors].sort((p, q) => p[0] - q[0])) {
    if (a - from > 1) out.push([from, a]);
    from = c;
  }
  if (x1 - from > 1) out.push([from, x1]);
  return out;
}

export function hubStreet(c: Ctx, seed: number, dir: [number, number], cf: number) {
  const { b } = c;
  const st = c.station;
  const r = rng(seed);
  const lines = linesAt(st.id).map((l) => l.id);
  const holes: Rect[] = b.out.holes.map((q) => [...q] as Rect);
  /** The well of the stair up from Willow Court into the terminal's concourse (not a street exit). */
  const hallStair = holes.find((q) => Math.abs(q[1] - HALL_STAIR_Z[0]) < 0.01 && Math.abs(q[3] - HALL_STAIR_Z[1]) < 0.01);
  const nearHole = (x: number, z: number, m: number) => holes.some((q) => x > q[0] - m && x < q[2] + m && z > q[1] - m && z < q[3] + m);

  const at = (face: Face, x: number, z: number, fn: () => void) => b.with({ ...FRAME[face], t: [x, 0, z] }, fn);
  const signAt = (p: AnchorPt, content: SignContent, o?: SignOpts) => b.sign(content, p[0], p[1] + GY, p[2], [p[5], p[6]], p[3], p[4], o);
  const label = (p: AnchorPt, text: string, sub: string | undefined, bg = NAME_BG, fg = NAME_FG) => signAt(p, { k: 'label', text, sub, fg, bg });
  const upright = (p: AnchorPt, ja: string, bg: string, fg = '#ffffff') => signAt(p, { k: 'shop', ja, bg, fg, vertical: true });
  /** A one-off model with its front at (x, z) facing `face`, its collider, and whatever the game puts on it. */
  const piece = (kind: string, A: Anchors, id: string, face: Face, x: number, z: number, fn?: (a: Anchor) => void, solid = true) =>
    at(face, x, z, () => {
      const a = A[id];
      b.model(kind, id, 0, GY, 0, 1);
      if (solid) b.block(-a.w / 2, GY, 0, a.w / 2, GY + Math.max(a.h, 3), a.d);
      fn?.(a);
    });
  /** Rows of street models packing a rectangle, fronts on its `face` side, each further row behind the last. */
  const fillRect = (x0: number, z0: number, x1: number, z1: number, face: Face, kinds: string[], lo = false) => {
    if (x1 - x0 < 4.6 || z1 - z0 < 8) return;
    const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
    b.with(FRAME[face], () => {
      let z = f0;
      for (let k = 0; k < 6 && f1 - z > 8.5; k++) {
        const lots = fillModelLots(b, r, a, e, z, f1 + 2.01, { noBack: true, kinds, lo });
        if (!lots.length) break;
        z = Math.max(...lots.map((l) => l[3])) + 0.8;
      }
    });
  };
  const BIZ = ['office', 'zakkyo', 'manshon'], SMALL = ['zakkyo', 'manshon'], LOW = ['shophouse', 'machi'];

  // ── Ground: asphalt everywhere, pavement over it but for the carriageways and the exit stairs ──
  const carriage: Rect[] = [
    [-X, -AV, X, AV],
    ...WIDE.map((s): Rect => [s.c - s.half, s.from, s.c + s.half, s.to]),
    ...LOCALS.map((l): Rect => [l.c - LH, VIA[0], l.c + LH, Z]),
    [TOK.c - TOK.half, TOK.from, TOK.c + TOK.half, TOK.to],
    [-X, MIN.z - MIN.half, X, MIN.z + MIN.half], [-X, NIB.z - NIB.half, X, NIB.z + NIB.half], [-X, EKI.z - EKI.half, X, EKI.z + EKI.half],
    ...loopRects(LOOP.bus), ...loopRects(LOOP.taxi),
  ];
  b.slab('asphalt', -X, -ZN, X, Z, -0.6, 0, holes);
  b.slab('paver', -X, -ZN, X, Z, 0, GY, [...holes, ...carriage]);
  b.zone('street', -X, -0.3, -ZN, X, 80, Z, '北大通・川湊駅前', 'Kita-Ōdōri — Kawaminato Station district');
  b.block(-X - 1, -1, -ZN - 1, -X, 60, Z + 1);
  b.block(X, -1, -ZN - 1, X + 1, 60, Z + 1);
  b.block(-X, -1, -ZN - 1, X, 60, -ZN);
  b.block(-X, -1, Z, X, 60, Z + 1);
  b.out.district = { radius: 620, old: [0, 0], oldRadius: 0, towers: 22 };

  // ═════════════════════════ Roads ═════════════════════════

  /** Where a north–south street's own paint and trees stop for a crossing: the avenue, the other 通, the viaduct. */
  const crossings = (s: { c: number; from: number; to: number }): [number, number][] => [
    [-AV - 9, AV + 9], [MIN.z - MIN.half - 8, MIN.z + MIN.half + 8], [NIB.z - NIB.half - 3, NIB.z + NIB.half + 3],
    [EKI.z - EKI.half - 8, EKI.z + EKI.half + 8],
  ];
  const clearOf = (u: number, spans: [number, number][], m = 0) => !spans.some(([p, q]) => u > p - m && u < q + m);

  // ── The avenue and the four wide streets across it: the road kit (signals, bus stops, taxi stand, traffic) ──
  const BUS_X: [number, number] = [34, -44], TAXI_AT = 44;
  const streetsX = WIDE.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  for (let x = -X; x < X; x += 6) {
    if (streetsX.some(([a, e]) => x + 1.5 > a - 9 && x + 1.5 < e + 9)) continue;
    for (const z of [-AV / 2, AV / 2]) b.deco(WHITE, x, 0.004, z - 0.07, x + 3, 0.01, z + 0.07);
  }
  for (const s of WIDE) {
    const [a, e] = [s.c - s.half, s.c + s.half];
    // Lane lines and a yellow centre line between its crossings; crosswalks and stop lines at the avenue.
    for (let z = s.from + 1; z < s.to - 2; z += 6) {
      if (!clearOf(z + 1.5, crossings(s))) continue;
      for (const x of [s.c - s.half / 2, s.c + s.half / 2]) b.deco(WHITE, x - 0.07, 0.004, z, x + 0.07, 0.01, z + 3);
      b.deco(YELLOW, s.c - 0.08, 0.004, z, s.c + 0.08, 0.01, z + 6);
    }
    for (const x of [a - 4, e + 4]) crosswalk(b, x, 0, 2 * AV - 0.6, 4, true);
    for (const sz of s === YAN ? [1] : [1, -1]) crosswalk(b, s.c, sz * (AV + 3.2), 2 * s.half - 0.4, 4, false);
    b.deco(WHITE, a - 7.2, 0.004, -AV, a - 6.8, 0.01, 0);
    b.deco(WHITE, e + 6.8, 0.004, 0, e + 7.2, 0.01, AV);
  }
  const lanes0 = b.out.lanes.length;
  roadKit(b, {
    X, Z, reach: [ZN, Z], rw: AV, swOut: FRONT, streets: streetsX, seed, name: { ja: st.nameJa, en: st.nameRomaji }, at: { id: st.id, dir }, tees: [1], shared: true, lamp: 'lamp_led', busy: 0.85, taxi: 0.3,
    junctions: [{ ja: '北大通浜手', en: 'Kita-Ōdōri Hamate' }, { ja: '川湊駅前', en: 'Kawaminato Sta.' }, { ja: '北大通汐見', en: 'Kita-Ōdōri Shiomi' }, { ja: '北大通千鳥', en: 'Kita-Ōdōri Chidori' }],
    roads: { main: { ja: '北大通', en: 'Kita-Ōdōri' }, cross: WIDE.map((s) => s.name) },
    flows: [0.5, 0.8, 0.35, 0.5], busX: BUS_X, taxiX: TAXI_AT,
  });

  // ── Minami-ichiban-dōri and Ekimae-dōri: two lanes, a signal wherever a street with traffic crosses ──
  let jn = 0;
  /**
   * A signalled junction of a north–south street (centre cx, half width hx; `ways` the headings of
   * its traffic, +1 south) and an east–west one (centre cz, half width hz). Crosswalks on the arms
   * given, stop lines, a signal on the far left corner for each way in, pedestrian heads.
   */
  const junction = (cx: number, hx: number, ways: (1 | -1)[], cz: number, hz: number, name: Named, arms: { n?: boolean; s?: boolean } = { n: true, s: true }) => {
    const wideNS = hx > 4.6, flat = true, both = ways.length > 1, style = cx === YAN.c ? 'shared' as const : 'new' as const;
    // The crosswalks over the north–south street (walk with the east–west traffic), and over the east–west one.
    for (const sz of [-1, 1] as const) {
      if (!(sz < 0 ? arms.n : arms.s)) continue;
      const zc = cz + sz * (hz + 2.6);
      crosswalk(b, cx, zc, 2 * hx - 0.4, 3, false);
      pedSignal(b, cx - hx - 0.8, zc + sz * 2.0, [1, 0], 0, { flat, button: !wideNS, speaker: wideNS });
      pedSignal(b, cx + hx + 0.8, zc + sz * 2.0, [-1, 0], 0, { flat, button: !wideNS, speaker: wideNS });
    }
    for (const sx of [-1, 1] as const) {
      const xc = cx + sx * (hx + 2.6);
      crosswalk(b, xc, cz, 2 * hz - 0.4, 3, true);
      pedSignal(b, xc + sx * 2.0, cz - hz - 0.8, [0, 1], 1, { flat });
      pedSignal(b, xc + sx * 2.0, cz + hz + 0.8, [0, -1], 1, { flat });
    }
    // East–west traffic (axis 0): stop lines, and a signal beyond the junction on its left.
    for (const sx of [1, -1] as const) {
      const lz = -sx; // its half of the road: eastbound keeps to the north
      const xs = cx - sx * (hx + SL);
      b.deco(WHITE, Math.min(xs, xs - sx * 0.35), 0.004, Math.min(cz, cz + lz * (hz - 0.2)), Math.max(xs, xs - sx * 0.35), 0.01, Math.max(cz, cz + lz * (hz - 0.2)));
      vehicleSignal(b, cx + sx * (hx + 1.9), cz + lz * (hz + 1.5), [sx, 0], hz + 1.5 - hz / 2, 0, name, { style, back: true });
    }
    // North–south traffic (axis 1).
    for (const sz of ways) {
      if (!(sz > 0 ? arms.n : arms.s)) continue;
      const lx = sz; // southbound keeps to the east
      const zs = cz - sz * (hz + SL);
      b.deco(WHITE, Math.min(cx, cx + lx * (hx - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(cx, cx + lx * (hx - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      // (Set back from the corner: the kerb is cut off there for turning traffic.)
      if (wideNS) vehicleSignal(b, cx + lx * (hx + 1.6), cz + sz * (hz + 2.0), [0, sz], hx + 1.6 - hx / 2, 1, name, { style, back: both });
      else shortSignal(b, cx + lx * (hx + 1.5), cz + sz * (hz + 1.9), [0, sz], 1, name);
    }
    // 隅切り: the four corners are cut off, paved flush with the road.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      if (!(sz < 0 ? arms.n : arms.s)) continue;
      for (let k = 0; k < 4; k++) {
        const u = 1.6 - k * 0.4, v = (k + 1) * 0.4;
        b.deco('asphalt', Math.min(cx + sx * hx, cx + sx * (hx + u)), GY, Math.min(cz + sz * (hz + v - 0.4), cz + sz * (hz + v)), Math.max(cx + sx * hx, cx + sx * (hx + u)), GY + 0.004, Math.max(cz + sz * (hz + v - 0.4), cz + sz * (hz + v)));
      }
    }
    roadModel(b, 'sigbox', cx - hx - 2.6, GY, cz - hz - 3.2, [0, 1]);
    b.block(cx - hx - 2.96, GY, cz - hz - 3.46, cx - hx - 2.24, GY + 1.56, cz - hz - 2.94);
    jn++;
  };
  /** Stops along an east–west lane heading sx for the streets crossing it. */
  const stopsX = (sx: 1 | -1, cross: { c: number; half: number }[]): LanePart['stops'] =>
    cross.map(({ c: cx, half }) => {
      const t = sx > 0 ? cx + X : X - cx;
      return { at: t - half - SL - 0.5, axis: 0 as const, exit: t + half + SL };
    }).sort((p, q) => p.at - q.at);
  const localX = LOCALS.map((l) => ({ c: l.c, half: LH }));
  const sideRoad = (s: { z: number; half: number; name: Named }, cross: { c: number; half: number }[], lamp: 'lamp_shop' | 'lamp_suzuran', flow: number, halts: [LanePart['halts'], LanePart['halts']]) => {
    const boxes = cross.map(({ c: cx, half }): [number, number] => [cx - half - 8, cx + half + 8]);
    for (let x = -X + 1; x < X - 3; x += 6) if (clearOf(x + 1.5, boxes)) b.deco(WHITE, x, 0.004, s.z - 0.07, x + 3, 0.01, s.z + 0.07);
    for (const e of [-1, 1]) {
      let from = -X;
      for (const [p, q] of [...boxes].sort((m, n) => m[0] - n[0]).concat([[X, X]])) {
        if (p - from > 1) b.deco(WHITE, from, 0.004, s.z + e * (s.half - 0.6) - 0.05, p + 3, 0.01, s.z + e * (s.half - 0.6) + 0.05);
        from = q - 3;
      }
    }
    for (const sx of [1, -1] as const) {
      trafficLane(b, -sx * X, s.z - sx * 2.25, sx * X, s.z - sx * 2.25, { speed: 30 / 3.6, flow, use: 'all', taxi: 0.2, stops: stopsX(sx, cross), halts: halts[sx > 0 ? 0 : 1] });
      // Lamps on its left kerb, staggered between the two sides; a 30 limit past each wide street.
      for (let x = -X + (sx > 0 ? 9 : 21); x < X - 4; x += 24) {
        if (clearOf(x, boxes, 1) && clearOf(x, LOCAL_BL, 2)) streetLamp(b, lamp, x, s.z - sx * (s.half + 0.6), [0, sx]);
      }
      for (const w of [HAM, SHI]) {
        const x = w.c + sx * (w.half + 16);
        roadSign(b, 'speed30', x, s.z - sx * (s.half + 0.5), [-sx, 0], 0.6);
        mark(b, 'ahead', x + sx * 10, s.z - sx * 2.25, [sx, 0], 1.2, 4.4);
      }
    }
  };
  const MIN_NAMES: Named[] = [
    { ja: '南一番 西小路', en: 'Minami-ichiban Nishi-kōji' }, { ja: '南一番 浜手', en: 'Minami-ichiban Hamate' }, { ja: '澪屋西通南', en: 'Mioya Nishi-dōri South' },
    { ja: '柳筋南一番', en: 'Yanagi-suji Minami-ichiban' }, { ja: '澪屋東通南', en: 'Mioya Higashi-dōri South' }, { ja: '南一番 汐見', en: 'Minami-ichiban Shiomi' }, { ja: '南一番 千鳥', en: 'Minami-ichiban Chidori' },
  ];
  const minCross = [...WIDE.map((s) => ({ c: s.c, half: s.half, ways: [1, -1] as (1 | -1)[] })), ...LOCALS.map((l) => ({ c: l.c, half: LH, ways: [l.way] }))].sort((p, q) => p.c - q.c);
  minCross.forEach((q, i) => junction(q.c, q.half, q.ways, MIN.z, MIN.half, MIN_NAMES[i]));
  sideRoad(MIN, minCross, 'lamp_shop', 3.2, [[], []]);
  const kokCross = [HAM, TOK, SHI, CHI];
  const KOK_NAMES: Named[] = [{ ja: '駅前通浜手', en: 'Ekimae-dōri Hamate' }, { ja: '川湊駅北口', en: 'Kawaminato Sta. North' }, { ja: '駅前通汐見', en: 'Ekimae-dōri Shiomi' }, { ja: '駅前通千鳥', en: 'Ekimae-dōri Chidori' }];
  // (Tokei-suji ends here: traffic comes in from the north only, and the square lies to the south.)
  kokCross.forEach((s, i) => junction(s.c, s.half, s === TOK ? [1] : [1, -1], EKI.z, EKI.half, KOK_NAMES[i], s === TOK ? { n: true, s: false } : undefined));
  // Ekimae-dōri's eastbound buses stop at its north kerb; westbound, they turn into the square's loop.
  const BUS_K = 44, ekiLanes = b.out.lanes.length;
  sideRoad(EKI, kokCross, 'lamp_suzuran', 2.6, [[{ at: BUS_K + X, side: 0.8 }], []]);
  {
    // The square's loops: off the westbound lane by a left turn down the east leg, west along the station's
    // side (buses to a bay, taxis to the rank), up the west leg and back onto the lane by a left turn.
    const lz = EKI.z + 2.25, zs = LOOP.z1 - 3.2, west = b.out.lanes[ekiLanes + 1];
    const way = ([i, o]: [number, number]) => [b.pt(i, 0, lz), b.pt(i, 0, zs), b.pt(o, 0, zs), b.pt(o, 0, lz)];
    west.detours = [
      ...BUS_BAYS.map((x) => ({ via: way(LOOP.bus), r: 5, rEnds: 9, speed: 4.5, who: 'bus' as const, share: 0.4, halt: b.pt(x, 0, zs) })),
      { via: way(LOOP.taxi), r: 5, rEnds: 8, speed: 4.5, who: 'taxi' as const, share: 0.5, halt: b.pt(TAXI_K, 0, zs), rank: 4 },
    ];
  }

  // The wide streets' lanes were laid by the kit with a stop at the avenue only: add the other signals.
  for (const l of b.out.lanes.slice(lanes0)) {
    const dz = l.to[2] - l.from[2];
    if (Math.abs(l.to[0] - l.from[0]) > 0.1 || Math.abs(dz) < 1) continue;
    const uz = Math.sign(dz), more: LanePart['stops'] = [];
    for (const s of [MIN, EKI]) {
      const t = (s.z - l.from[2]) * uz;
      if (t - s.half - SL < 6 || t + s.half + SL > Math.abs(dz) - 4) continue;
      more.push({ at: t - s.half - SL - 0.5, axis: 1, exit: t + s.half + SL });
    }
    l.stops = [...l.stops, ...more].sort((p, q) => p.at - q.at);
  }

  // ── The local streets: one way, a lane each, joining the big streets by left turns ──
  for (const [i, l] of LOCALS.entries()) {
    const x = l.c, north = l.way < 0;
    // South of the avenue: in from the plot's edge (northbound) or out to it (southbound), a signal at Minami-ichiban.
    // (Its lanes stop a metre short of the avenue's median: whoever comes out turns left into the near
    // side, whoever goes in has turned left off it. traffic/system.ts works the turns out.)
    const zs = Z + 1.5, MED = 1.0, kN = UNDER, tMin = north ? zs - MIN.z : MIN.z - MED;
    const minStop = { at: tMin - MIN.half - SL - 0.5, axis: 1 as const, exit: tMin + MIN.half + SL };
    const minor = { speed: 6, use: 'minor' as const, taxi: 0, halts: [] };
    if (north) {
      // South of the avenue: in from the plot's edge, a signal at Minami-ichiban, out onto the avenue.
      trafficLane(b, x, zs, x, MED, { ...minor, flow: 1.6, stops: [minStop, { at: zs - FRONT - 0.6, axis: 0, exit: zs - MED }], dead: true });
      // North of it: fed by left turns off the avenue, and in under the viaduct.
      trafficLane(b, x, -MED, x, UNDER, { ...minor, flow: 0, stops: [] });
    } else {
      trafficLane(b, x, MED, x, zs, { ...minor, flow: 0, stops: [minStop] });
      // (Nothing feeds it now that the street ends under the viaduct: it stays for whoever is set down there.)
      trafficLane(b, x, kN, x, -MED, { ...minor, flow: 0, stops: [{ at: -FRONT - 0.6 - kN, axis: 0, exit: -MED - kN }], dead: true });
    }
    // Paint and signs: edge lines, 止まれ and a stop sign where it gives way, one-way boards at its ends.
    for (const [z0, z1] of [[FRONT, MIN.z - MIN.half - 6], [MIN.z + MIN.half + 6, NIB.z - NIB.half], [NIB.z + NIB.half, Z], [VIA[1], -FRONT]]) {
      for (const e of [-1, 1]) b.deco(WHITE, x + e * (LH - 0.6) - 0.05, 0.004, z0, x + e * (LH - 0.6) + 0.05, 0.01, z1);
    }
    const kerb = x + l.way * (LH + 0.5), far = x - l.way * (LH + 0.5);
    for (const zm of north ? [FRONT + 0.4] : [-FRONT - 0.4]) {
      const s = l.way;
      b.deco(WHITE, x - LH + 0.5, 0.004, Math.min(zm, zm + s * 0.3) - (north ? 0 : 0), x + LH - 0.5, 0.01, Math.max(zm, zm + s * 0.3));
      mark(b, 'stop', x, zm - s * 3.4, [0, s], 2.2, 3.2);
      roadSign(b, 'stop', kerb, zm - s * 1.0, [0, -s]);
    }
    // 一方通行 at the way in, 進入禁止 facing whoever would drive in the wrong way.
    const inZ = north ? [Z - 6, -FRONT - 3] : [FRONT + 3, VIA[1] + 3], outZ = north ? [FRONT + 4, VIA[1] + 1.2] : [Z - 6, -FRONT - 4];
    for (const z of inZ) {
      roadModel(b, 'signpole', far, GY, z, [0, -l.way]);
      b.block(far - 0.06, GY, z - 0.06, far + 0.06, GY + 2, z + 0.06);
      b.sign({ k: 'roadsign', v: l.way * (far - x) > 0 ? 'oneway-l' : 'oneway-r' }, far, GY + 2.72, z - l.way * 0.05, [0, -l.way], 0.9, 0.3);
      b.sign({ k: 'roadsign', v: 'back-rect' }, far, GY + 2.72, z + l.way * 0.05, [0, l.way], 0.9, 0.3);
      roadSign(b, 'speed30', kerb, z + l.way * 6, [0, -l.way], 0.6);
    }
    for (const z of outZ) roadSign(b, 'noentry', far, z, [0, l.way], 0.66);
    for (let z = FRONT + 22; z < Z - 6; z += 26) if (clearOf(z, [[MIN.z - 14, MIN.z + 14], [NIB.z - 7, NIB.z + 7]])) streetLamp(b, 'lamp_small', far, z, [l.way * (x - far) > 0 ? 1 : -1, 0]);
    for (let z = -FRONT - 14; z > LANE_S; z -= 24) streetLamp(b, 'lamp_small', far, z, [x > far ? 1 : -1, 0]);
    void i;
  }
  // Minami-niban-dōri: a quiet street with no through traffic. A stop line and 止まれ wherever it meets another.
  {
    const cross = [...WIDE.map(bl), ...LOCAL_BL].sort((p, q) => p[0] - q[0]);
    for (const [a, e] of between(cross)) {
      for (const k of [-1, 1]) b.deco(WHITE, a + 1.5, 0.004, NIB.z + k * (NIB.half - 0.6) - 0.05, e - 1.5, 0.01, NIB.z + k * (NIB.half - 0.6) + 0.05);
      if (e - a < 16) continue;
      for (const [xs, sx] of [[e - 2.2, 1], [a + 2.2, -1]] as const) {
        if (Math.abs(xs) > X - 8) continue;
        b.deco(WHITE, Math.min(xs, xs + sx * 0.3), 0.004, NIB.z - NIB.half + 0.5, Math.max(xs, xs + sx * 0.3), 0.01, NIB.z + NIB.half - 0.5);
        mark(b, 'stop', xs - sx * 3.4, NIB.z, [sx, 0], 2.2, 3.2);
        roadSign(b, 'stop', xs - sx * 0.6, NIB.z - sx * (NIB.half + 0.5), [-sx, 0]);
      }
      for (let x = a + 12; x < e - 8; x += 24) streetLamp(b, 'lamp_small', x, NIB.z + NIB.half + 0.5, [0, -1]);
    }
    poleLine(b, { axis: 'x', from: -X + 6, to: X - 6, at: NIB.z - NIB.half - 0.6, road: 1, step: 26, skip: (u) => !clearOf(u, cross, 2), drops: 0.8, name: { ja: st.nameJa, en: st.nameRomaji } });
  }

  // ── Nothing of the kit's stands in a street's mouth; the avenue's median; its kerb rail ──
  const mouths: Rect[] = [...WIDE.flatMap((s): Rect[] => [[s.c - s.half - 0.3, AV - 0.2, s.c + s.half + 0.3, FRONT + 0.2], ...(s === YAN ? [] : [[s.c - s.half - 0.3, -FRONT - 0.2, s.c + s.half + 0.3, -AV + 0.2] as Rect])]),
    ...LOCALS.flatMap((l): Rect[] => [[l.c - LH - 1.2, AV - 0.2, l.c + LH + 1.2, FRONT + 0.2], [l.c - LH - 1.2, -FRONT - 0.2, l.c + LH + 1.2, -AV + 0.2]]),
    // (The mouths of the square's loops on Ekimae-dōri's south pavement.)
    ...[LOOP.bus, LOOP.taxi].flatMap(([i, o]): Rect[] => [[i - LOOP.hw - 0.5, KERB_S - 0.3, i + LOOP.hw + 4.5, SQ_N + 0.3], [o - LOOP.hw - 4.5, KERB_S - 0.3, o + LOOP.hw + 0.5, SQ_N + 0.3]])];
  for (const [x0, z0, x1, z1] of mouths) {
    const inside = (v: number[]) => v[0] > x0 && v[0] < x1 && v[2] > z0 && v[2] < z1;
    // (What stands on the ground there goes; signal heads hang over a mouth from poles outside it, and stay.)
    b.out.models = b.out.models.filter((m) => !(inside(m.pos) && m.kind === 'road' && m.pos[1] < GY + 1));
    b.out.signs = b.out.signs.filter((sg) => !(inside(sg.pos) && sg.normal !== null && sg.pos[1] > GY + 0.3 && (sg.pos[1] < GY + 4.6 || sg.content.k === 'roadboard')));
    b.out.boxes = b.out.boxes.filter((bx) => {
      const post = bx.max[1] < GY + 7 && bx.max[0] - bx.min[0] < 2.6 && bx.max[2] - bx.min[2] < 2.6;
      return !(bx.min[1] > -0.05 && bx.max[1] > 0.3 && post && inside([(bx.min[0] + bx.max[0]) / 2, 0, (bx.min[2] + bx.max[2]) / 2]));
    });
  }
  const zonesAv = streetsX.map(([a, e]): [number, number] => [a - 9, e + 9]);
  {
    let from = -X;
    for (const [p, q] of [...zonesAv, [X, X] as [number, number]]) {
      for (let x = from + 6; x + 6 <= p - 3; x += 6) {
        b.model('kitacity', 'median', x + 3, 0, 0, 0);
        b.out.models[b.out.models.length - 1].merge = true;
      }
      if (p - 3 - (from + 6) >= 6) b.block(from + 6, 0, -0.4, from + 6 + Math.floor((p - 9 - from) / 6) * 6, 1.1, 0.4);
      from = q - 3;
    }
  }
  const gaps = kerbGaps(streetsX, BUS_X, TAXI_AT);
  for (const s of [-1, 1] as const) {
    const zr = s * (AV + 0.3);
    const open = [...streetsX.map(([a, e]) => [a - 7, e + 7]), ...LOCAL_BL.map(([a, e]) => [a - 0.6, e + 0.6]), ...gaps.filter((k) => k.s === s).map((k) => [k.x0, k.x1])].sort((p, q) => p[0] - q[0]);
    let x = -X;
    for (const [from, to] of open.concat([[X, X]])) {
      for (let xa = x; xa + 2.5 <= from; xa += 2.5) {
        b.block(xa, GY, zr - 0.04, xa + 2.5, GY + 0.9, zr + 0.04);
        kerbRail(b, xa + 1.25, zr);
      }
      x = Math.max(x, to);
    }
  }

  // ── Trees and lamps down the wide streets ──
  let tn = 0;
  const tree = (x: number, z: number, kind: TreeKind) => modelTree(b, kind, x, z, tn++ % 3 ? 'a' : 'b', GY, true);
  const kerbClear = (x: number, s: number) => clearOf(x, zonesAv) && clearOf(x, LOCAL_BL, 3) && !nearHole(x, s * (AV + 2), 5)
    && !gaps.some((k) => k.s === s && x > k.x0 - 2 && x < k.x1 + 2) && !(Math.abs(x) > RX - 3 && Math.abs(x) < RX + DW + 12 && s > 0) && !(Math.abs(x) < RX + DW + 4);
  for (const s of [-1, 1]) for (let x = -X + 8; x < X; x += 18) if (kerbClear(x, s)) tree(x, s * (AV + 1.7), 'ginkgo');
  for (const s of WIDE) {
    const kind: TreeKind = s === YAN ? 'willow' : s === SHI ? 'dogwood' : 'zelkova';
    const lamp = s === YAN ? 'lamp_hw' : 'lamp_led';
    const spans = [...crossings(s), [NEW_N - 3, VIA[1] + 3] as [number, number]];
    for (const sx of [-1, 1]) {
      const x = s.c + sx * (s.half + 1.5);
      for (let z = s.from + 10; z < s.to - 5; z += 15) {
        if (!clearOf(z, spans, 2) || nearHole(x, z, 4)) continue;
        tree(x, z, kind);
        if (Math.abs(Math.round(z / 15)) % 2 === (sx > 0 ? 0 : 1) && clearOf(z + 7, spans, 2) && !nearHole(x, z + 7, 3)) streetLamp(b, lamp, s.c + sx * (s.half + 0.9), z + 7, [-sx, 0]);
      }
    }
  }

  // ═════════════════════════ The AR viaduct ═════════════════════════
  {
    const VD = VIADUCT.a8.d, [PASS, , , ABUT] = [5.6, 0, 0, 1.0];
    const spans: { c: number; id: string }[] = [
      { c: HAM.c, id: 'g24' }, { c: CHI.c, id: 'g24' }, { c: SHI.c, id: 'g16' }, ...LOCALS.map((l) => ({ c: l.c, id: 'g12' })),
    ].sort((p, q) => p.c - q.c);
    const girderRange = spans.map((g) => [g.c - VIADUCT[g.id].w / 2, g.c + VIADUCT[g.id].w / 2]);
    /** A piece under the platforms is its `pf_` twin (build_viaduct.py); its colliders are the plain piece's. */
    const underPf = (x: number) => x > AR_PF[0] && x < AR_PF[1];
    let pfCount = 0;
    /** The 1914 widening along the old viaduct's north side (build_viaduct.py n<id>): the piece that stands beside each of the old ones. */
    const northOf = (base: string) => (base.startsWith('g') ? `n${base}` : base === 'p8' || base === 'stp8' ? 'np8' : base === 'ho8' || base === 'he8' ? 'nh8' : AR_HOLLOW.includes(base) ? 'nc8' : /^[as]\d$/.test(base) ? `n${base}` : 'ns8');
    const putNorth = (base: string, x: number) => {
      const nb = northOf(base), id = underPf(x) && VIADUCT[`pf_${nb}`] ? `pf_${nb}` : nb, w = VIADUCT[id].w;
      b.model('viaduct', id, x, GY, NEW_N, Math.floor(r() * 90));
      if (nb.startsWith('ng')) {
        for (const e of [-1, 1]) b.block(Math.min(x + e * w / 2, x + e * (w / 2 - ABUT)), GY, NEW_N, Math.max(x + e * w / 2, x + e * (w / 2 - ABUT)), 8, VIA[0]);
        const p = VIADUCT[id].pts.clear_f;
        if (Math.abs(x) > KAWAEKI.main.w / 2) b.sign({ k: 'label', text: '桁下 4.7m', sub: 'Clearance 4.7 m', fg: '#1f2023', bg: '#e6a700' }, x + p[0], p[1] + GY, NEW_N + p[2], [p[5], p[6]], p[3], p[4]);
      } else if (nb === 'nh8' || nb === 'nc8') {
        // The station's passage and concourse: kawaminato.ts.
      } else if (nb === 'np8') {
        // The walkway carries on through it.
        for (const e of [-1, 1]) b.block(Math.min(x + e * w / 2, x + e * PASS / 2), GY, NEW_N, Math.max(x + e * w / 2, x + e * PASS / 2), 8, VIA[0]);
        b.block(x - PASS / 2, GY + 3.3, NEW_N, x + PASS / 2, 8, VIA[0]);
        b.zone('passage', x - PASS / 2, GY - 0.2, NEW_N, x + PASS / 2, GY + 3.2, VIA[0], '高架下 連絡通路', 'Walkway under the tracks');
      } else b.block(x - w / 2, GY, NEW_N, x + w / 2, 8, VIA[0]);
    };
    const putPiece = (base: string, x: number) => {
      const id = underPf(x) && VIADUCT[`pf_${base}`] ? `pf_${base}` : base;
      b.model('viaduct', id, x, GY, VIA[0], Math.floor(r() * 90));
      const w = VIADUCT[id].w;
      putNorth(base, x);
      // Under the platforms: the canopy column at the piece's middle on the south island, and the bench beside it (build_viaduct.py platforms()).
      if (underPf(x)) {
        const pf = GY + 10.1, zc = VIA[0] + 19.1;
        platformPiece(b, x, base, pfCount++);
        if (base !== 'hl8') b.block(x - 0.14, pf, zc - 0.14, x + 0.14, pf + 3.3, zc + 0.14);
        if (base !== 'hl8') b.block(x + 1.5, pf, zc - 0.25, x + 3.1, pf + 0.45, zc + 0.25);
      }
      if (base.startsWith('g')) {
        for (const e of [-1, 1]) b.block(Math.min(x + e * w / 2, x + e * (w / 2 - ABUT)), GY, VIA[0], Math.max(x + e * w / 2, x + e * (w / 2 - ABUT)), 8, VIA[0] + VD);
        const g = VIADUCT[id].pts;
        for (const k of ['clear_b']) {
          const p = g[k];
          b.sign({ k: 'label', text: '桁下 4.7m', sub: 'Clearance 4.7 m', fg: '#1f2023', bg: '#e6a700' }, x + p[0], p[1] + GY, VIA[0] + p[2], [p[5], p[6]], p[3], p[4]);
        }
      } else if (AR_HOLLOW.includes(base)) {
        // The station's passage and concourse: kawaminato.ts builds what is inside and its colliders.
      } else if (base.includes('p')) {
        const top = 8;
        for (const e of [-1, 1]) b.block(Math.min(x + e * w / 2, x + e * PASS / 2), GY, VIA[0], Math.max(x + e * w / 2, x + e * PASS / 2), top, VIA[0] + VD);
        b.zone('passage', x - PASS / 2, GY - 0.2, VIA[0], x + PASS / 2, GY + 3.2, VIA[0] + VD, '高架下 連絡通路', 'Walkway under the tracks');
        // (North, the station building stands against the viaduct: no walkway comes out there but the station's own passage.)
        const inEki = Math.abs(x) < KAWAEKI.main.w / 2;
        for (const [z, n] of [[NEW_N - 0.05, -1], [VIA[1] + 0.05, 1]] as const) {
          if (n < 0 && inEki) continue; // (there it runs on through the station building: its mouth on the square has the sign)
          b.sign({ k: 'guide', ja: n < 0 ? '北大通・澪屋・地下鉄' : '川湊駅前広場・駅前通', en: n < 0 ? 'Kita-Ōdōri / Mioya / Metro' : 'Station Square / Ekimae-dōri', bg: 'white', arrow: 'up' }, x, GY + 5.9, z, [0, n], 4.6, 0.5);
        }
      } else b.block(x - w / 2, GY, VIA[0], x + w / 2, 8, VIA[0] + VD);
    };
    for (const g of spans) putPiece(g.id, g.c);
    // Between the bridges: arch bays 7, 8 and 9 m long. The station's platforms lie over the terminal's block.
    for (const [a, e] of between(girderRange as [number, number][])) {
      const L = Math.round(e - a), station = a > -70 && e < 70;
      let n = Math.max(1, Math.round(L / 8));
      while (Math.abs(L - 8 * n) > n) n += L > 8 * n ? 1 : -1;
      const odd = L - 8 * n;
      let x = a;
      for (let k = 0; k < n; k++) {
        const w = 8 + (k < Math.abs(odd) ? Math.sign(odd) : 0);
        const mid = x + w / 2;
        const pass = !station && w === 8 && k === Math.floor(n / 2) && L > 24;
        putPiece(station ? AR_BAYS[Math.round(mid)] ?? 'st8' : pass ? 'p8' : `${r() < 0.3 ? 's' : 'a'}${w}`, mid);
        x += w;
      }
    }
    kawaminatoStation(b, { ends: AR_PF, style: c.style });
    // Beyond the plot it runs on, drawn simply.
    // (East 300 m; west only as far as the line runs straight, where its curve to the river begins.)
    for (const sx of [-1, 1]) {
      const run = (sx > 0 ? AR_HUB_MODELS.east : AR_HUB_MODELS.west) - X;
      b.clearScenery(Math.min(sx * X, sx * (X + run)), VIA[0] - 5, Math.max(sx * X, sx * (X + run)), VIA[1] + 5);
      for (let x = X + 4; x < X + run; x += 8) {
        b.model('viaduct', 'a8_lo', sx * x, GY, VIA[0], 0);
        b.out.models[b.out.models.length - 1].merge = true;
      }
    }
    // The station's name on the viaduct's south face, west of the bridge from Mioya.
    {
      const ar = stationById('kawaminato');
      b.sign({ k: 'label', text: `${ar.nameJa}駅`, sub: `${ar.nameRomaji} Station — AR Main Line`, fg: '#ffffff', bg: '#3a3d41' }, -12, GY + 7.2, VIA[1] + 0.3, [0, 1], 14, 1.3);
    }
    // Ekiura-dōri: the lane between the viaduct's arches and the backs of the avenue's blocks.
    b.deco('flat:#77736b', -X, GY + 0.002, VIA[1], X, GY + 0.012, LANE_S);
    b.deco('flat:#5d5852', -X, GY + 0.012, (VIA[1] + LANE_S) / 2 - 0.1, X, GY + 0.016, (VIA[1] + LANE_S) / 2 + 0.1);
    for (let x = -X + 10; x < X - 4; x += 21) if (clearOf(x, girderRange as [number, number][], 1)) streetLamp(b, 'lamp_small', x, LANE_S - 0.4, [0, -1]);
    b.zone('street', -X, GY - 0.2, VIA[1], X, GY + 6, LANE_S, '駅裏通', 'Ekiura-dōri', true);
  }

  // ═════════════════════════ The Mioya Terminal Building ═════════════════════════
  {
    const A = MIOYA.store, [PX, PW, ARCD, RD] = A.pts.geo;
    const zf = -FRONT, zArc = zf - ARCD, zRec = zf - RD, zBack = zf - A.d, hx = A.w / 2;
    b.model('mioya', 'store', 0, GY, zf, 1);
    b.out.models[b.out.models.length - 1].yaw += Math.PI;
    // Its mass, less the rooms inside it (build_mioya.py leaves the same): the two side portals, and the grand
    // concourse behind the middle one: a nave PW wide and HV high, a lobby 2 LX wide at the back with the
    // private railway's concourse over it (to MZ), a doorway from the terrace onto the galleries.
    const [LX, LZ, HV, MZ, DOOR] = A.pts.geo2, HW = PW / 2, zL = zf - LZ;
    for (const [a, e, zn] of [[-hx, -PX - HW, zBack], [-PX + HW, -LX, zBack], [-LX, -HW, zL], [HW, LX, zL], [LX, PX - HW, zBack], [PX + HW, hx, zBack]]) b.block(a, GY, zn, e, DECK, zArc);
    for (const p of [-PX, PX]) b.block(p - HW, GY, zBack, p + HW, DECK, zRec);
    const doorsN = [-LX, -10.5, -7.5, -1.5, 1.5, 7.5, 10.5, LX];
    for (let i = 0; i < doorsN.length; i += 2) b.block(doorsN[i], GY, zBack, doorsN[i + 1], DECK, zBack + 0.5);
    for (const sx of [-1, 1]) {
      b.block(Math.min(sx * LX, sx * hx), DECK, zBack, Math.max(sx * LX, sx * hx), A.h, zArc);
      b.block(Math.min(sx * HW, sx * LX), DECK, zL, Math.max(sx * HW, sx * LX), A.h, zArc);
      b.block(Math.min(sx * DOOR, sx * HW), DECK, zArc - 1.1, Math.max(sx * DOOR, sx * HW), HV, zArc);
    }
    b.block(-HW, HV, zL, HW, A.h, zArc);
    b.block(-LX, MZ, zBack, LX, A.h, zL);
    // (The level-2 north wall, less the doorway of the AR station's bridge.)
    {
      const [d0, d1] = MIOYA_GATE.door;
      b.block(-LX, DECK, zBack, d0, MZ, zBack + 0.5);
      b.block(d1, DECK, zBack, LX, MZ, zBack + 0.5);
      b.block(d0, DECK + MIOYA_GATE.doorH, zBack, d1, MZ, zBack + 0.5);
    }
    b.block(-DOOR, 10.7, zArc - 1.1, DOOR, HV, zArc);
    for (const [k, p] of Object.entries(A.pts)) if (k.startsWith('col')) b.block(-p[0] - 0.5, GY, zf - 1.2, -p[0] + 0.5, DECK - 0.5, zf - 0.2);
    b.with({ rot: 2, t: [0, 0, zf] }, () => {
      const p = A.pts;
      label(p.name, '澪屋百貨店', 'MIOYA DEPARTMENT STORE');
      label(p.roof, '澪屋', 'MIOYA — Kawaminato Terminal');
      label(p.mark, '澪', undefined);
      for (const f of 'fblr') signAt(p[`clock_${f}`], { k: 'clock' }, { dynamic: true });
      ['初夏の味めぐり', '全館 大感謝祭', '川湊 うまいもの市', '屋上ビアテラス'].forEach((t, i) => upright(p[`banner${i}`], t, ['#c8102e', '#12382c', '#1f3f7a', '#b35a1c'][i]));
      signAt(p.portal1, { k: 'entrance', station: st.id });
      label(p.portal0, '澪屋百貨店 東玄関', 'Mioya — East Entrance');
      label(p.portal2, '澪屋百貨店 西玄関', 'Mioya — West Entrance');
      let v = 11;
      for (const [k, q] of Object.entries(p)) if (k.startsWith('case')) signAt(q, { k: 'poster', v: (v += 5) });
      label(p.north, '澪屋 北口', 'Mioya — North Entrance · Metro Kita-Ōdōri');
      const hp = MIOYA.hall.pts;
      signAt(hp.clock, { k: 'clock' }, { dynamic: true });
      label(hp.term, '私鉄線のりば（予定地）', 'Private railway terminal — not yet built', '#12382c', '#f3e3a0');
      // (Narrowed to the west two thirds: the AR station's Mioya Gate has the east third. The store is placed turned, so x is mirrored.)
      signAt([4.25, hp.reserved[1], hp.reserved[2], 15, hp.reserved[4], hp.reserved[5], hp.reserved[6]], RESERVED('私鉄線のりば', 'private railway terminal'));
    });

    // ── The grand concourse ──
    {
      b.model('mioya', 'hall', 0, GY, zf, 1);
      b.out.models[b.out.models.length - 1].yaw += Math.PI;
      const F = 'floor:#d6cebb', GW = 2.5, gx = HW - GW;
      const well = hallStair ? [hallStair] : [];
      b.slab(F, -HW, zL, HW, zArc - 0.5, GY, GY + 0.012, well, false);
      b.slab(F, -LX, zBack + 0.5, LX, zL, GY, GY + 0.012, well, false);
      for (const sx of [-1, 1]) b.deco('floor:#5b5146', sx * (HW - 1.2) - 0.15, GY + 0.012, zL, sx * (HW - 1.2) + 0.15, GY + 0.016, zArc - 0.5);
      // The stair down to Willow Court and the metro comes up in the lobby: a rail round its well.
      if (hallStair) {
        const [x0, z0, x1, z1] = hallStair;
        // (It climbs east: the well is shut at its west end, open at the stair's head.)
        rail(b, x0, z0 - 0.08, x1, z0, GY);
        rail(b, x0, z1, x1, z1 + 0.08, GY);
        rail(b, x0 - 0.08, z0, x0, z1, GY);
        const down: SignContent = { k: 'guide', ja: `地下鉄 ${st.nameJa}駅`, en: `Metro: ${st.nameRomaji} Station`, bg: 'navy', badges: lines, arrow: 'down' };
        for (const n of [-1, 1] as const) {
          const zs = n < 0 ? z0 - 0.09 : z1 + 0.09, xm = (x0 + x1) / 2;
          b.deco('flat:#12233a', xm - 2.7, GY + 0.3, Math.min(zs, zs + n * 0.05), xm + 2.7, GY + 0.94, Math.max(zs, zs + n * 0.05));
          b.sign(down, xm, GY + 0.62, zs + n * 0.06, [0, n], 5.2, 0.5);
        }
      }
      // Galleries at the deck level down both sides of the nave, a bridge across its south end to the terrace door,
      // the terminal concourse over the lobby; a stair up from the nave floor to each gallery.
      const GT = DECK - 0.3, zB = -31, ST: [number, number] = [-35, -45.3], LAND = 2;
      b.box(F, -HW, GT, zB, HW, DECK, zArc - 1.1);
      b.box(F, -DOOR, GT, zArc - 1.1, DOOR, DECK, zArc);
      b.box(F, -LX, DECK - 0.5, zBack + 0.5, LX, DECK, zL);
      rail(b, -gx, zB - 0.08, gx, zB, DECK);
      rail(b, -gx, zL, gx, zL + 0.08, DECK);
      for (const sx of [-1, 1]) {
        const xi = sx * gx, xs = sx * (gx - 1.8);
        b.box(F, Math.min(xi, sx * HW), GT, zL, Math.max(xi, sx * HW), DECK, zB);
        b.box(F, Math.min(xs, xi), GT, ST[1] - LAND, Math.max(xs, xi), DECK, ST[1]);
        b.with({ rot: 3 }, () => stairs(b, { x0: -ST[0], x1: -ST[1], z0: Math.min(xs, xi), z1: Math.max(xs, xi), yLow: GY, yHigh: DECK, mat: 'floor:#cfc6b4' }));
        for (const [z0, z1] of [[zL, ST[1] - LAND], [ST[1], zB]]) rail(b, Math.min(xi, xi - sx * 0.08), z0, Math.max(xi, xi - sx * 0.08), z1, DECK);
        rail(b, Math.min(xs, xs - sx * 0.08), ST[1] - LAND, Math.max(xs, xs - sx * 0.08), ST[1], DECK);
        rail(b, Math.min(xs, xi), ST[1] - LAND - 0.08, Math.max(xs, xi), ST[1] - LAND, DECK);
      }
      // A lift against the lobby's east wall: the food floor and metro below, the concourse, the gallery level.
      b.with({ rot: 3, t: [LX - LIFT_OUT.d, 0, zL - 6.5] }, () => lift(b, { levels: [
        { y: cf, ja: '地下1階 食品館・地下鉄', en: 'B1 Food Floor / Metro' }, { y: GY, ja: '1階 大コンコース', en: '1F Grand Concourse' }, { y: DECK, ja: '2階 回廊・テラス', en: '2F Gallery / Terrace' },
      ] }));
      // The private railway's gate line: a hoarding across the concourse, the gates' place marked on the floor.
      // (It keeps the west two thirds; the AR station's Mioya Gate has the east third: kawaminato.ts.)
      const HX = MIOYA_GATE.x[0] - 0.5;
      b.box('flat:#f4f4f0', -12, DECK, zBack + 3.2, HX, DECK + 1.25, zBack + 3.32);
      b.deco('flat:#e8a400', -12, DECK + 0.93, zBack + 3.32, HX, DECK + 1.13, zBack + 3.34);
      b.sign({ k: 'label', text: '改札予定位置', sub: 'Future ticket gates', fg: '#1b1f24', bg: '#ffd100' }, (HX - 12) / 2, DECK + 0.012, zBack + 5.4, null, 9, 1.4, { top: [0, -1] });
      mioyaGate(b, DECK, zBack, zBack + 3.2);
      // Ways on: over the lobby's doors, and on the edge of the concourse above, facing the nave.
      b.sign({ k: 'guide', ja: '駅裏通・川湊駅（AR線）・駅前広場', en: 'Ekiura-dōri / Kawaminato Sta. (AR) / Station Square', bg: 'white', arrow: 'up' }, 0, GY + 4.1, zBack + 0.52, [0, 1], 9, 0.6);
      b.sign({ k: 'guide', ja: `地下鉄 ${st.nameJa}駅・北口`, en: `Metro: ${st.nameRomaji} Station / North Entrance`, bg: 'navy', badges: lines, arrow: 'up' }, 0, DECK - 0.25, zL + 0.1, [0, 1], 8, 0.44);
      b.sign({ k: 'guide', ja: '北大通・柳筋', en: 'Kita-Ōdōri avenue / Yanagi-suji', bg: 'yellow', arrow: 'up' }, 0, DECK - 0.25, zB - 0.1, [0, -1], 6, 0.44);
      b.zone('concourse', -LX, GY - 0.2, zBack, LX, GY + 5.2, zArc, '澪屋 大コンコース', 'Mioya — Grand Concourse', true);
      b.zone('concourse', -HW, DECK - 0.2, zL, HW, DECK + 4, zArc, '大コンコース 回廊', 'Grand Concourse gallery', true);
      b.zone('concourse', -LX, DECK - 0.2, zBack, LX, DECK + 5, zL, '2階 私鉄線コンコース（予定地）', 'Level 2 — future private railway concourse');
    }
    // The terrace over the arcade (the deck level): its floor, the rail along its edge, a stair down at each end.
    const T0 = 46, T1 = 56.4, TZ: [number, number] = [-26, -23.4];
    b.slab('floor:#d6cebb', -hx, zArc, hx, zf, DECK - 0.5, DECK, [[-T1, TZ[0], -T0, TZ[1]], [T0, TZ[0], T1, TZ[1]]]);
    const edge = [-hx, -RX - DW, -RX, RX, RX + DW, hx];
    for (let i = 0; i < edge.length; i += 2) rail(b, edge[i], zf - 0.08, edge[i + 1], zf, DECK);
    for (const sx of [-1, 1]) {
      rail(b, Math.min(sx * hx, sx * (hx - 0.08)), zArc, Math.max(sx * hx, sx * (hx - 0.08)), zf, DECK);
      b.with({ rot: sx > 0 ? 2 : 0 }, () => {
        const [z0, z1] = sx > 0 ? [-TZ[1], -TZ[0]] : TZ;
        stairs(b, { x0: -T1, x1: -T0, z0, z1, yLow: GY, yHigh: DECK, mat: 'floor:#cfc6b4' });
        rail(b, -T1, z1, -T0 - 1.2, z1 + 0.08, DECK);
        rail(b, -T1, z0 - 0.08, -T0 - 1.2, z0, DECK);
        rail(b, -T1 - 0.08, z0, -T1, z1, DECK);
      });
    }
    b.zone('passage', -hx, DECK - 0.2, zArc, hx, DECK + 3.4, zf, '澪屋テラス', 'Mioya Terrace', true);
    for (let x = -52; x <= 52; x += 13) if (Math.abs(Math.abs(x) - 51) > 6 && Math.abs(Math.abs(x) - RX - DW / 2) > 4) {
      roadModel(b, 'bench_s', x, DECK, zArc + 1.0, [0, 1]);
      b.block(x - 0.95, DECK, zArc + 0.7, x + 0.95, DECK + 0.5, zArc + 1.3);
    }
    b.zone('street', -hx, GY - 0.2, zArc, hx, DECK - 0.5, zf, '澪屋アーケード', 'Mioya arcade', false);
  }

  // ═════════════════════════ The footbridge ring ═════════════════════════
  {
    const SR = RING.stairroof.w, LWD = RING.lift.w, zS: [number, number] = [RS, RS + DW], DM = 'floor:#a9a69e';
    // Decks: one over the avenue at each side of the junction, one across Yanagi-suji between them.
    for (const sx of [-1, 1]) b.box(DM, Math.min(sx * RX, sx * (RX + DW)), DECK - 0.5, -FRONT, Math.max(sx * RX, sx * (RX + DW)), DECK, zS[1]);
    b.box(DM, -RX, DECK - 0.5, zS[0], RX, DECK, zS[1]);
    rail(b, -RX - DW, zS[1], RX + DW, zS[1] + 0.08, DECK);
    rail(b, -RX, zS[0] - 0.08, RX, zS[0], DECK);
    for (const sx of [-1, 1]) {
      const xo = sx * (RX + DW), xi = sx * RX;
      rail(b, Math.min(xi, xi - sx * 0.08), -FRONT, Math.max(xi, xi - sx * 0.08), zS[0], DECK);
      for (const [z0, z1] of [[-FRONT, -14.3], [-12.7, 12.7], [14.3, zS[1] - 2.6]]) rail(b, Math.min(xo, xo + sx * 0.08), z0, Math.max(xo, xo + sx * 0.08), z1, DECK);
      // A stair down along the avenue's south pavement, under its own roof; lifts north and south.
      b.with({ rot: sx > 0 ? 2 : 0 }, () => {
        const [z0, z1] = sx > 0 ? [-zS[1], -zS[1] + 2.6] : [zS[1] - 2.6, zS[1]];
        stairs(b, { x0: -RX - DW - SR, x1: -RX - DW, z0, z1, yLow: GY, yHigh: DECK, mat: 'floor:#cfc6b4' });
        b.model('ring', 'stairroof', -RX - DW - SR, GY, z0, 0);
      });
      for (const z of [-13.5, 13.5]) {
        at(sx > 0 ? 'w' : 'e', xo, z, () => {
          b.model('ring', 'lift', 0, GY, 0, 0);
          lift(b, { bare: true, levels: [{ y: GY, ja: '地上', en: 'Street' }, { y: DECK, ja: '歩道橋', en: 'Footbridge' }] });
          void LWD;
          const p = RING.lift.pts;
          for (const k of ['sign0', 'sign1']) signAt(p[k], { k: 'label', text: 'エレベーター', sub: 'Lift', fg: '#ffffff', bg: '#1f5fae' });
        });
      }
      // Piers on the pavements, the deck's girders, a glazed roof.
      for (const z of [-12.3, 12.3]) {
        b.with({ rot: 1, t: [sx > 0 ? RX + DW : -RX, 0, z] }, () => b.model('ring', 'pier', 0, GY, 0, 0));
        b.block(sx * (RX + DW / 2) - 0.45, GY, z - 0.45, sx * (RX + DW / 2) + 0.45, DECK - 0.5, z + 0.45);
      }
      for (let z = -FRONT + 3; z < zS[1] - 1; z += 6) {
        b.with({ rot: 1, t: [sx > 0 ? RX + DW : -RX, 0, z] }, () => {
          b.model('ring', 'girder', 0, DECK, 0, 0);
          b.model('ring', 'canopy', 0, DECK, 0, 0);
        });
      }
      b.model('ring', 'pier', sx * 12.3, GY, zS[0], 0);
      b.block(sx * 12.3 - 0.45, GY, zS[0] + DW / 2 - 0.45, sx * 12.3 + 0.45, DECK - 0.5, zS[0] + DW / 2 + 0.45);
    }
    for (let x = -RX + 3.25; x < RX; x += 6.5) {
      b.model('ring', 'girder', x, DECK, zS[0], 0);
      b.model('ring', 'canopy', x, DECK, zS[0], 0);
    }
    const way: Named = { ja: '北大通歩道橋', en: 'Kita-Ōdōri footbridge' };
    for (const sx of [-1, 1]) for (const n of [-1, 1] as const) b.sign({ k: 'label', text: way.ja, sub: way.en, fg: '#ffffff', bg: '#55707a' }, sx * (RX + DW / 2) + n * (DW / 2 + 0.16), DECK - 0.22, 0, [n, 0], 8, 0.36);
    b.sign({ k: 'guide', ja: '澪屋・地下鉄 北大通駅', en: 'Mioya / Metro Kita-Ōdōri', bg: 'white', arrow: 'up' }, 0, DECK + 2.3, zS[0] - 0.1, [0, 1], 6, 0.5);
    b.zone('passage', -RX - DW, DECK - 0.2, -FRONT, RX + DW, DECK + 3.4, zS[1], way.ja, way.en, true);
  }

  // ═════════════════════════ The avenue's fronts ═════════════════════════
  const scr = (p: AnchorPt, v: number) => signAt(p, { k: 'screen', v });
  // The Gate Towers, either side of Yanagi-suji, joined over it by the sky lobby.
  {
    const A = GATE.towers, gap = A.pts.geo[0];
    at('n', 0, FRONT, () => {
      b.model('gate', 'towers', 0, GY, 0, 1);
      // (Each podium front has a bay where a metro exit comes up: build_gate.py RX0 … RH.)
      const [r0, r1, rd, rh] = A.pts.recess;
      for (const sx of [-1, 1]) {
        for (const [xa, xb, za, y0] of [[gap / 2, r0, 0, GY], [r1, A.w / 2, 0, GY], [r0, r1, rd, GY], [r0, r1, 0, GY + rh]]) b.block(Math.min(sx * xa, sx * xb), y0, za, Math.max(sx * xa, sx * xb), A.h, A.d);
      }
      const p = A.pts;
      for (const k of ['metro_n', 'metro_p']) signAt(p[k], { k: 'entrance', station: st.id, exit: k === 'metro_n' ? '11' : '12' });
      scr(p.screen_n, 3);
      scr(p.screen_p, 17);
      scr(p.side_n, 29);
      scr(p.side_p, 8);
      label(p.name_n, '北大通ゲートタワー 西館', 'Kita-Ōdōri Gate Tower West', '#20262b', '#ffffff');
      label(p.name_p, '北大通ゲートタワー 東館', 'Kita-Ōdōri Gate Tower East', '#20262b', '#ffffff');
      label(p.bridge, 'SKY GATE 天空ロビー', undefined, '#dfe3e6', '#20262b');
    });
  }
  // South side, facing north across the avenue; north side, facing south. Behind each, a row on the street at its back.
  const front = (id: string, face: 'n' | 's', x0: number, x1: number, fn: (p: Record<string, AnchorPt>) => void, off = 0) => {
    const a = KITAFRONT[id], xc = off || (x0 + x1) / 2;
    piece('kitafront', KITAFRONT, id, face, xc, face === 'n' ? FRONT : -FRONT, (q) => fn(q.pts));
    return a.d;
  };
  const south = between([...WIDE.map(bl), ...LOCAL_BL]), north = between([...[HAM, SHI, CHI].map(bl), ...LOCAL_BL]);
  const S_FRONTS: [string, (p: Record<string, AnchorPt>) => void][] = [
    ['office_a', (p) => label(p.name, '北大通センタービル', 'Kita-Ōdōri Center Building', '#20262b', '#ffffff')],
    ['denki', (p) => { scr(p.screen, 21); upright(p.name, 'カミナリ電機', '#c8102e'); label(p.side, 'カミナリ電機', 'KAMINARI DENKI', '#c8102e', '#ffffff'); label(p.roof, 'カミナリ電機 川湊本店', 'KAMINARI DENKI — Kawaminato Main Store', '#c8102e', '#ffffff'); }],
    ['amuse', (p) => scr(p.screen, 40)],
    ['', () => undefined], ['', () => undefined],
    ['kaikan', (p) => { label(p.name, '川湊座', 'KAWAMINATO-ZA', '#f4f1e8', '#5a1f1f'); label(p.band, '川湊座 ロードショー・演芸', 'Kawaminato-za — Cinema and Stage', '#f4f1e8', '#1f2023'); for (let k = 0; k < 5; k++) signAt(p[`poster${k}`], { k: 'poster', v: 14 + k * 9 }); }],
    ['bank', (p) => { label(p.name, '澪標銀行 本店', 'MIOTSUKUSHI BANK — Head Office', '#2a2622', '#e8dcc0'); label(p.crown, '澪標銀行', 'MIOTSUKUSHI BANK', '#d9cdb4', '#2a2622'); }],
    ['office_d', (p) => label(p.roof, '千鳥スクエア', 'CHIDORI SQUARE', '#f2c230', '#1f2023')],
  ];
  south.forEach(([x0, x1], i) => {
    const [id, fn] = S_FRONTS[i];
    const back = MIN.z - MIN.half - MIN.pave;
    if (!id) return; // the Gate Towers' blocks
    const d = front(id, 'n', x0, x1, fn);
    fillRect(x0 + 0.3, FRONT + d + 1.2, x1 - 0.3, back, 's', SMALL);
  });
  const N_FRONTS: [string, (p: Record<string, AnchorPt>) => void][] = [
    ['office_c', (p) => label(p.name, '北栄ビル', 'HOKUEI BUILDING', '#ecebe6', '#1f2023')],
    ['office_b', (p) => label(p.name, '浜手ビルヂング', 'Hamate Building', '#2a2622', '#e8dcc0')],
    ['termhotel', (p) => { label(p.name, 'ホテル澪屋', 'HOTEL MIOYA'); label(p.crown, 'HOTEL MIOYA', undefined, '#e6dcc6', '#2a2622'); }],
    ['', () => undefined],
    ['vision', (p) => { scr(p.screen, 33); label(p.name, 'キタモード', 'KITA MODE', '#1a1c20', '#ffffff'); label(p.roof, 'KITA MODE', 'キタモード', '#c8102e', '#ffffff'); }],
    ['shinbun', (p) => { scr(p.ticker, 5); scr(p.screen, 26); label(p.name, '川湊新報', 'Kawaminato Shinpō', '#f4f1e8', '#1f2023'); }],
    ['hotel', (p) => { label(p.name, '東雲イン 川湊駅前', 'Shinonome Inn Kawaminato Ekimae', '#2a2018', '#f4f1e8'); upright(p.vertical, '東雲イン', '#f4f1e8', '#1f3f7a'); label(p.roof, '東雲イン', 'SHINONOME INN', '#1f3f7a', '#ffffff'); }],
  ];
  north.forEach(([x0, x1], i) => {
    const [id, fn] = N_FRONTS[i];
    if (!id) return; // the terminal building
    // (The westernmost block has room for the car park tower beside its office.)
    const d = i === 0
      ? (piece('kitafront', KITAFRONT, 'parking', 's', x1 - 3.3, -FRONT, (q) => { label(q.pts.name, 'P', 'タワーパーキング', '#1f5fae', '#ffffff'); label(q.pts.side, 'P', 'Tower Parking', '#1f5fae', '#ffffff'); label(q.pts.rates, '満 / 空', 'Full / Spaces', '#f4f1e8', '#1f2023'); }),
        front(id, 's', x0, x1, fn, x0 + 0.3 + KITAFRONT[id].w / 2))
      : front(id, 's', x0, x1, fn);
    fillRect(x0 + 0.3, LANE_S, x1 - 0.3, -FRONT - d - 1.2, 'n', SMALL);
  });

  // ═════════════════════════ South of Minami-ichiban-dōri ═════════════════════════
  /** Ground already spoken for inside the blocks (lanes, lots of parks and shrines): the gap filler keeps off it. */
  const reserved: Rect[] = [];
  /** The blocks' interiors, building line to building line: what is left free in them is put to use below. */
  const interiors: Rect[] = [];
  south.forEach(([x0, x1], i) => { if (S_FRONTS[i][0]) interiors.push([x0, FRONT, x1, MIN.z - MIN.half - MIN.pave]); });
  north.forEach(([x0, x1], i) => { if (N_FRONTS[i][0]) interiors.push([x0, LANE_S, x1, -FRONT]); });
  {
    const z0 = MIN.z + MIN.half + MIN.pave, z1 = NIB.z - NIB.half - NIB.pave, z2 = NIB.z + NIB.half + NIB.pave;
    // Yanagi-suji's own fronts: a colonnaded street storey, a cornice at the old 31 m line, towers set back above it.
    const SUJI: Record<number, [string, string, string][][]> = {
      3: [[['suji_a', '澪標銀行 柳筋支店', 'Miotsukushi Bank — Yanagi-suji'], ['suji_b', '柳テラス', 'YANAGI TERRACE']], [['suji_c', '川湊海上ビル', 'Kawaminato Kaijō Building'], ['suji_d', '柳筋会館', 'Yanagi-suji Kaikan']]],
      4: [[['suji_e', '北大通証券', 'Kita-Ōdōri Securities'], ['suji_f', '楊柳堂 本店', 'Yōryūdō — Main Store']], [['suji_g', '川湊ガスビル', 'Kawaminato Gas Building'], ['suji_h', 'みお生命 柳筋ビル', 'Mio Life Yanagi-suji Building']]],
    };
    south.forEach(([x0, x1], i) => {
      let a = x0 + 0.3, e = x1 - 0.3;
      interiors.push([x0, z0, x1, z1], [x0, z2, x1, Z]);
      const suji = SUJI[i];
      if (suji) {
        const face: Face = i === 3 ? 'e' : 'w', xf = i === 3 ? x1 : x0, D = KITAFRONT.suji_a.d;
        for (const [k, [za, zb]] of ([[z0, z1], [z2, Z]] as [number, number][]).entries()) {
          const row = suji[k], len = row.reduce((t, [id]) => t + KITAFRONT[id].w, 0);
          let z = (za + zb - len) / 2;
          for (const [id, ja, en] of row) {
            const w = KITAFRONT[id].w;
            piece('kitafront', KITAFRONT, id, face, xf, z + w / 2, (q) => label(q.pts.name, ja, en, '#2a2622', '#e8dcc0'));
            z += w;
          }
        }
        if (i === 3) e = x1 - D - 0.8;
        else a = x0 + D + 0.8;
      }
      // A place of its own on some blocks: a police box, a convenience store, a bicycle park, a pocket park.
      let from = a;
      const lot = (kind: PlaceKind, xf: number, zf: number, ja: string, en: string) => {
        const { w, d } = PLACES[kind];
        at('n', xf + w / 2, zf, () => place(b, { kind, ja, en }));
        reserved.push([xf, zf, xf + w, zf + d]);
        return w + 0.8;
      };
      if (i === 2) from += lot('koban', from, z0, '北大通南交番', 'Kita-Ōdōri Minami Kōban');
      if (i === 5) from += lot('vending', from, z0, 'ドリンクコーナー', 'Drinks corner');
      if (i === 4) {
        const k = KONBINI.corner;
        at('n', from + k.w / 2, z0, () => konbini(b, { type: 'corner', chain: 'asanagi' }));
        reserved.push([from, z0, from + k.w, z0 + k.d]);
        fillRect(from, z0 + k.d + 0.8, from + k.w, (z0 + z1) / 2 - 0.5, 'n', LOW);
        from += k.w + 0.8;
      }
      if (i === 1) {
        piece('kitacity', KITACITY, 'bikepark', 'n', from + 6, z0, (q) => label(q.pts.name, '北大通南 自転車駐車場', 'Bicycle parking', '#1f5fae', '#ffffff'));
        from += 12.8;
      }
      const mid = (z0 + z1) / 2 + 3;
      fillRect(from, z0, e, mid - 0.8, 'n', BIZ);
      fillRect(a, mid + 0.8, e, z1, 's', SMALL);
      // The lane between the two rows.
      if (e - a > 12) {
        b.deco('flat:#5d5852', a, GY + 0.002, mid - 0.8, e, GY + 0.01, mid + 0.8);
        streetLamp(b, 'lamp_small', (a + e) / 2, mid + 0.6, [0, -1]);
        reserved.push([a, mid - 0.8, e, mid + 0.8]);
      }
      // South of Minami-niban-dōri, to the plot's edge.
      let f2 = a;
      if (i === 3) f2 += lot('shrine', f2, z2, '柳森稲荷', 'Yanagimori Inari');
      if (i === 6) f2 += lot('park', f2, z2, '汐見ポケットパーク', 'Shiomi Pocket Park');
      fillRect(f2, z2, e, Z - 0.6, 'n', i % 2 ? ['manshon', 'zakkyo', 'machi'] : BIZ);
    });
  }

  // ═════════════════════════ North of the tracks: the station's site, its square, Ekimae-dōri, Tokei-suji ═════════════════════════
  // (The grand station, Plans/stations/kawaminato-grand.md. Still to come: everything inside the building but its hall.)
  {
    const south = between([HAM, SHI, CHI].map(bl));
    const [bx0, bx1] = south[1]; // the long block: the station building and its square
    const EK_N = EKI.z - EKI.half - EKI.pave, SITE_N = -145;
    // (The viaduct's widening stands on z NEW_N … VIA[0]; a service pavement runs along its new face.)
    reserved.push([-X, BACK, X, VIA[0]]);
    // The station building (build_kawaeki.py): 1914 red brick, three domes. Its middle pavilion is the great
    // hall, hollow from its three arched doors right through to the station's central passage under the tracks
    // (kawaminato.ts). The wings and the east end pavilion each have a way through at street level, where a
    // walkway under the tracks comes out behind the building; nothing else of them is entered.
    const WAY = 4, EKI_HX = KAWAEKI.main.w / 2;
    piece('kawaeki', KAWAEKI, 'main', 'n', 0, SITE_N, (m) => {
      const D = m.d, q = m.pts, [CXP, PROJ_C, EX0, PROJ_E] = q._geo;
      const HX = q._hall[3] / 2, HH = q._hall[4], DX = q._doors[3] / 2, BX = q._back[3] / 2;
      // Colliders: the wings and end pavilions, but for the ways through them where a walkway under the tracks
      // comes out behind the building; round the hall, its walls, the door piers and the back wall.
      const TUN = ['_tun0', '_tun1', '_tun2'].map((k) => q[k]);
      const solid = (x0: number, x1: number, z0: number, z1: number) => {
        let e = x0;
        for (const t of TUN.filter((t) => t[0] > x0 && t[0] < x1 && t[2] <= z0 + 0.01).sort((u, v) => u[0] - v[0])) {
          b.block(e, GY, z0, t[0] - t[3] / 2, GY + 19, z1);
          b.block(t[0] - t[3] / 2, GY + t[4], z0, t[0] + t[3] / 2, GY + 19, z1);
          e = t[0] + t[3] / 2;
        }
        b.block(e, GY, z0, x1, GY + 19, z1);
      };
      for (const t of TUN) {
        const [x0, x1, z0] = [t[0] - t[3] / 2, t[0] + t[3] / 2, t[2]];
        b.deco('floor:#c9bfae', x0, GY + 0.012, z0, x1, GY + 0.018, D);
        b.sign({ k: 'guide', ja: '駅裏通・北大通・澪屋', en: 'Ekiura-dōri / Kita-Ōdōri / Mioya', bg: 'white', arrow: 'up' }, t[0], GY + 5.55, z0 - 0.02, [0, -1], Math.min(4.2, t[3]), 0.5);
        b.zone('passage', x0, GY - 0.2, z0, x1, GY + t[4], D, `${stationById('kawaminato').nameJa}駅 通り抜け通路`, `${stationById('kawaminato').nameRomaji} Station — way through to Ekiura-dōri`, false);
      }
      for (const sx of [-1, 1]) {
        solid(Math.min(sx * HX, sx * EKI_HX), Math.max(sx * HX, sx * EKI_HX), 0, D);
        solid(Math.min(sx * EX0, sx * EKI_HX), Math.max(sx * EX0, sx * EKI_HX), -PROJ_E, 0);
        b.block(Math.min(sx * HX, sx * CXP), GY, -PROJ_C, Math.max(sx * HX, sx * CXP), GY + HH, 0);
        b.block(Math.min(sx * DX, sx * CXP), GY, -PROJ_C, Math.max(sx * DX, sx * CXP), GY + HH, -PROJ_C + 1);
        b.block(Math.min(sx * BX, sx * HX), GY, D - 0.6, Math.max(sx * BX, sx * HX), GY + HH, D);
      }
      for (const k of ['_pier0', '_pier1']) b.block(q[k][0] - q[k][3] / 2, GY, -PROJ_C, q[k][0] + q[k][3] / 2, GY + HH, -PROJ_C + 1);
      b.block(-BX, GY + q._back[4], D - 0.6, BX, GY + HH, D);
      // The hall: a stone floor with a border, lamps under the ceiling, the station's name and the clock outside.
      // (Round the well of the metro's Exit 15, which comes up in the hall's south-east corner: hub.ts exit15().)
      const [wx0, wx1] = EXIT15.x, wz0 = EXIT15.foot - exit15Run(cf) - SITE_N, wz1 = EXIT15.open - SITE_N;
      for (const [x0, z0, x1, z1] of [[-HX, -PROJ_C, HX, wz0], [-HX, wz0, wx0, D], [wx1, wz0, HX, D], [wx0, wz1, wx1, D]]) b.deco('floor:#cfc8b8', x0, GY + 0.002, z0, x1, GY + 0.012, z1);
      for (const sx of [-1, 1]) b.deco('flat:#8f6a52', Math.min(sx * (HX - 1.4), sx * (HX - 1.0)), GY + 0.012, -PROJ_C + 1, Math.max(sx * (HX - 1.4), sx * (HX - 1.0)), GY + 0.016, sx > 0 ? wz0 - 0.4 : EXIT15.lift.z - 1.15 - SITE_N - 0.4);
      const ar = stationById('kawaminato');
      // Its dress. Globes hung in three rows; a stone dado and a cornice band round the side walls; a paved
      // round in the floor's middle; benches by the walls. On the west wall the departures, on the east the
      // ticket office's windows.
      const STONE = 'flat:#ddd6c6', Z0 = -PROJ_C + 1, Z1 = D - 0.6;
      for (const z of [7, 14, 21]) for (const x of [-8, 0, 8]) {
        b.deco('metal:#8a7a52', x - 0.025, GY + HH - 2.4, z - 0.025, x + 0.025, GY + HH, z + 0.025);
        b.mesh(INDOOR_LAMP, 'sphere', x, GY + HH - 2.7, z, 0.42, 0.42, 0.42);
      }
      for (const sx of [-1, 1]) {
        const xw = sx * HX, xi = sx * (HX - 0.06);
        b.deco(STONE, Math.min(xw, xi), GY, Z0, Math.max(xw, xi), GY + 1.5, Z1);
        b.deco(STONE, Math.min(xw, sx * (HX - 0.14)), GY + 1.5, Z0, Math.max(xw, sx * (HX - 0.14)), GY + 1.66, Z1);
        b.deco(STONE, Math.min(xw, sx * (HX - 0.2)), GY + 7.6, Z0, Math.max(xw, sx * (HX - 0.2)), GY + 8.0, Z1);
        // (Pilasters at the bays of the ceiling's beams.)
        for (const z of [3.5, 10.5, 17.5, 24.4]) b.deco(STONE, Math.min(xw, sx * (HX - 0.18)), GY + 1.66, z - 0.45, Math.max(xw, sx * (HX - 0.18)), GY + 7.6, z + 0.45);
        for (const z of [7]) { // (the south corners hold the metro's Exit 15 and its lift)
          roadModel(b, 'bench_s', sx * (HX - 0.75), GY, z, [-sx, 0]);
          b.block(Math.min(sx * (HX - 1.05), sx * (HX - 0.45)), GY, z - 0.95, Math.max(sx * (HX - 1.05), sx * (HX - 0.45)), GY + 0.5, z + 0.95);
        }
      }
      for (const [rr, mat] of [[5.2, 'flat:#8f6a52'], [4.8, 'flat:#e3ddd0'], [2.2, 'flat:#8f6a52'], [1.8, 'flat:#cfc8b8']] as const) {
        for (let k = -8; k < 8; k++) {
          const za = (k * rr) / 8, zb = ((k + 1) * rr) / 8, hw = Math.sqrt(Math.max(0, rr * rr - Math.max(za * za, zb * zb)));
          if (hw > 0.05) b.deco(mat, -hw, GY + 0.012 + (5.3 - rr) * 0.0008, 14 + za, hw, GY + 0.014 + (5.3 - rr) * 0.0008, 14 + zb);
        }
      }
      b.deco('flat:#17181b', -HX + 0.06, GY + 3.0, 11.0, -HX + 0.12, GY + 5.4, 17.0);
      b.sign({ k: 'ardep', station: ar.id, line: 'AR' }, -HX + 0.13, GY + 4.2, 14, [1, 0], 5.8, 2.1, { dynamic: true });
      b.sign({ k: 'label', text: '発車のご案内', sub: 'Departures', fg: '#3a2a20', bg: '#ddd6c6' }, -HX + 0.02, GY + 5.9, 14, [1, 0], 4.2, 0.6);
      for (const z of [12.3, 14, 15.7]) {
        b.deco('metal:#8a7a52', HX - 0.2, GY + 1.0, z - 0.8, HX - 0.06, GY + 2.5, z + 0.8);
        b.deco('glow:#f2e3bd', HX - 0.22, GY + 1.1, z - 0.7, HX - 0.2, GY + 2.4, z + 0.7);
        b.deco(STONE, HX - 0.5, GY + 0.95, z - 0.85, HX - 0.06, GY + 1.02, z + 0.85);
      }
      b.sign({ k: 'label', text: 'きっぷうりば・ご案内', sub: 'Tickets and information', fg: '#3a2a20', bg: '#ddd6c6' }, HX - 0.02, GY + 5.9, 14, [-1, 0], 4.6, 0.6);
      signAt(q.name, { k: 'label', text: `${ar.nameJa}駅`, sub: `${ar.nameRomaji} Station`, fg: '#3a2a20', bg: '#ddd6c6' });
      b.sign({ k: 'clock' }, q.clock[0], q.clock[1] + GY, q.clock[2], [q.clock[5], q.clock[6]], q.clock[3], q.clock[4]);
      b.zone('concourse', -HX, GY - 0.2, -PROJ_C + 1, HX, GY + HH, D, `${ar.nameJa}駅 大広間`, `${ar.nameRomaji} Station — Great Hall`, false);
    }, false);
    reserved.push([bx0, SITE_N - 3, bx1, NEW_N]);
    // The station square. Before the building a paved forecourt, banded, the whole block wide; north of it the
    // two loops round their planted islands, and between them the walk on the axis from the middle door to Tokei-suji.
    const PAVE = 'flat:#b9b2a4', BAND = 'flat:#8f6a52', loops = [LOOP.bus, LOOP.taxi];
    const midX: [number, number] = [LOOP.bus[0] + LOOP.hw, LOOP.taxi[1] - LOOP.hw];
    b.deco(PAVE, bx0, GY + 0.002, LOOP.z1, bx1, GY + 0.01, SITE_N);
    for (const [a, e] of [[bx0, LOOP.bus[1] - LOOP.hw], midX, [LOOP.taxi[0] + LOOP.hw, bx1]]) b.deco(PAVE, a, GY + 0.002, SQ_N, e, GY + 0.01, LOOP.z1);
    for (let x = bx0 + 6; x < bx1 - 2; x += 12) b.deco(BAND, x, GY + 0.01, LOOP.z1 + 1, x + 0.5, GY + 0.014, SITE_N - (Math.abs(x) < 14 ? 2.5 : 1));
    b.deco(BAND, bx0 + 1, GY + 0.01, LOOP.z1 + 0.5, bx1 - 1, GY + 0.014, LOOP.z1 + 1);
    b.deco('flat:#d8d2c4', -WAY, GY + 0.01, SQ_N, WAY, GY + 0.016, SITE_N - 2.5);
    // Lamps: two rows across the forecourt, a pair every 12 m down the axis walk.
    for (const [z, x0] of [[LOOP.z1 + 5, bx0 + 9], [SITE_N - 8, bx0 + 21]]) for (let x = x0; x < bx1 - 6; x += 24) if (Math.abs(x) > WAY + 3) streetLamp(b, 'lamp_led', x, z, [0, 1]);
    for (let z = SQ_N + 5; z < LOOP.z1; z += 12) for (const sx of [-1, 1]) streetLamp(b, 'lamp_park', sx * (WAY + 1.5), z, [-sx, 0]);
    for (const [k, [i, o]] of loops.entries()) {
      // The island: lawn inside a paved border, zelkovas, lamps on the edge that faces the stopping kerb.
      const ia = o + LOOP.hw, ie = i - LOOP.hw;
      b.deco('flat:#5f8a4e', ia + 1.5, GY + 0.002, SQ_N + 1.5, ie - 1.5, GY + 0.03, LOOP.z0 - 1.5);
      for (let x = ia + 5.5; x < ie - 4; x += 9.5) for (const z of [SQ_N + 7, LOOP.z0 - 7]) modelTree(b, 'zelkova', x, z, tn++ % 3 ? 'a' : 'b', GY, false);
      for (let x = ia + 4; x < ie - 2; x += 10.5) streetLamp(b, 'lamp_park', x, LOOP.z0 - 0.7, [0, 1]);
      // Paint: a broken line down the carriageway, a stop line where the way out meets Ekimae-dōri; no way in there.
      for (let x = ia + 3; x < ie - 5; x += 6) b.deco(WHITE, x, 0.004, (LOOP.z0 + LOOP.z1) / 2 - 0.06, x + 3, 0.01, (LOOP.z0 + LOOP.z1) / 2 + 0.06);
      b.deco(WHITE, o - LOOP.hw + 0.3, 0.004, KERB_S + 0.3, o + LOOP.hw - 0.3, 0.01, KERB_S + 0.6);
      roadSign(b, 'stop', o + LOOP.hw + 0.5, SQ_N + 1.0, [0, 1], 0.8);
      roadSign(b, 'noentry', o - LOOP.hw - 0.5, SQ_N + 0.8, [0, -1], 0.66);
      // (Who may turn in: a board on a pole at the way in, read from Ekimae-dōri.)
      const px = i + LOOP.hw + 5.2, pz = SQ_N + 0.8;
      roadModel(b, 'signpole', px, GY, pz, [0, -1]);
      b.block(px - 0.06, GY, pz - 0.06, px + 0.06, GY + 2.6, pz + 0.06);
      b.sign({ k: 'label', text: k ? 'タクシー' : 'バス', sub: k ? 'Taxis only' : 'Buses only', fg: '#ffffff', bg: '#0d3b66' }, px, GY + 2.3, pz - 0.07, [0, -1], 1.5, 0.5);
    }
    // Bus bays on the forecourt's kerb: a shelter per bay (open to the kerb), the stop's pole by the bus's front door.
    const sz = LOOP.z1 + 1.4;
    const shelter = (bx: number) => {
      roadModel(b, 'shelter', bx, GY, sz, [0, -1]);
      b.block(bx - 1.95, GY, sz + 0.65, bx + 1.95, GY + 2.45, sz + 0.75);
      for (const e of [-1, 1]) b.block(bx + e * 1.9 - 0.05, GY, sz + 0.05, bx + e * 1.9 + 0.05, GY + 2.45, sz + 0.7);
    };
    for (const [k, at0] of BUS_BAYS.entries()) {
      const bx = at0 + 2.5;
      shelter(bx);
      roadModel(b, 'busstop', bx - 2.7, GY, LOOP.z1 + 0.6, [0, -1]);
      b.block(bx - 2.78, GY, LOOP.z1 + 0.52, bx - 2.62, GY + 2.6, LOOP.z1 + 0.68);
      const to = stationById(['midorizaka', 'tsumugibashi'][k]);
      b.sign({ k: 'label', text: `${k + 1}番のりば ${to.nameJa}方面`, sub: `Bus ${k + 1} — ${to.nameRomaji}`, fg: '#fff', bg: '#0d3b66' }, bx, GY + 2.82, sz - 0.87, [0, -1], 2.4, 0.5);
    }
    // The taxi rank: its sign at the front of the queue, a shelter for those waiting.
    shelter(TAXI_K + 2.5);
    roadModel(b, 'signpole', TAXI_K - 1.5, GY, LOOP.z1 + 0.6, [0, -1]);
    b.block(TAXI_K - 1.56, GY, LOOP.z1 + 0.54, TAXI_K - 1.44, GY + 2, LOOP.z1 + 0.66);
    b.sign({ k: 'label', text: 'タクシーのりば', sub: 'Taxi', fg: '#111', bg: '#ffd100' }, TAXI_K - 1.5, GY + 2.4, LOOP.z1 + 0.55, [0, -1], 2.2, 0.55);
    b.zone('street', bx0, GY - 0.2, SQ_N, bx1, GY + 40, SITE_N, '川湊駅前広場', 'Kawaminato Station Square', false);
    reserved.push([bx0, SQ_N, bx1, SITE_N]);

    // Tokei-suji: four lanes painted, a traffic lane each way, trees and lamps; it ends at Ekimae-dōri, facing the station.
    for (let z = TOK.from + 1; z < TOK.to - 12; z += 6) {
      for (const x of [-TOK.half / 2, TOK.half / 2]) b.deco(WHITE, x - 0.07, 0.004, z, x + 0.07, 0.01, z + 3);
      b.deco(YELLOW, -0.08, 0.004, z, 0.08, 0.01, z + 6);
    }
    {
      const z0 = -ZN - 1.5, zEnd = EKI.z - 1.0, lx = TOK.half / 4;
      // Southbound (keeps to the east): a signal at Ekimae-dōri, then everybody turns left into it.
      trafficLane(b, lx, z0, lx, zEnd, { speed: 40 / 3.6, flow: 2.2, use: 'all', taxi: 0.25, halts: [], stops: [{ at: EKI.z - EKI.half - SL - 0.5 - z0, axis: 1, exit: zEnd - z0 }], dead: true });
      // Northbound: fed by left turns off Ekimae-dōri.
      trafficLane(b, -lx, zEnd, -lx, z0, { speed: 40 / 3.6, flow: 0, use: 'all', taxi: 0.25, halts: [], stops: [] });
    }
    for (const sx of [-1, 1]) {
      const x = sx * (TOK.half + 1.5);
      for (let z = TOK.from + 10; z < EK_N - 14; z += 15) {
        tree(x, z, 'camphor');
        if (Math.abs(Math.round(z / 15)) % 2 === (sx > 0 ? 0 : 1)) streetLamp(b, 'lamp_hw', sx * (TOK.half + 0.9), z + 7, [-sx, 0]);
      }
    }

    // South of Ekimae-dōri, either side of the square. Through the block beyond Hamate-suji and the one beyond
    // Shiomi-suji runs a short covered arcade, in line with the forecourt: what is left of Hokuei-dōri's, whose
    // middle the station building took. The west one ends at a game hall; the east one runs through to Chidori-suji.
    // On the arcades' north side stand the capsule hotel and the karaoke tower that used to face Kōka-dōri.
    const NIGHT = ['zakkyo', 'shophouse', 'machi'];
    const SD = KITAARCADE.sa.d, RB = KITAARCADE.roof.w, zc = (ARC[0] + ARC[1]) / 2, rowN = (SQ_N + ARC[0]) / 2;
    const arcade = (xa: number, xe: number, x1: number, name: Named, gates: [number, Face][], sp: [string, (p: Record<string, AnchorPt>) => void], n0: number) => {
      // Its south side: low shops open to it, a pachinko hall among them; behind them rows backing onto the tracks' service pavement.
      let x = xa + 0.1, k = n0;
      while (xe - x >= 6) {
        const id = xe - x >= 12 && k % 7 === 3 ? 'pachi' : `s${'abcde'[k % 5]}`, w = KITAARCADE[id].w;
        piece('kitaarcade', KITAARCADE, id, 'n', x + w / 2, ARC[1], (m) => { if (id === 'pachi') label(m.pts.name, 'パーラー 七福', 'PARLOR SHICHIFUKU', '#c8102e', '#ffe9a0'); });
        b.out.models[b.out.models.length - 1].seed = k;
        x += w + 0.05;
        k++;
      }
      fillRect(xa + 0.1, ARC[1] + SD + 0.9, xe - 0.1, BACK, 's', SMALL);
      // Its north side: the special front, then taller mixed buildings of bars and small offices.
      const q = KITACITY[sp[0]];
      piece('kitacity', KITACITY, sp[0], 's', xa + 0.2 + q.w / 2, ARC[0], (m) => sp[1](m.pts));
      fillRect(xa + 0.6 + q.w, rowN + 0.4, xe - 0.1, ARC[0], 's', NIGHT);
      // The walk itself: paving, the roof bay by bay, a gate at each open end.
      b.deco('floor:#c9bfae', xa, GY + 0.002, ARC[0], x1, GY + 0.014, ARC[1]);
      for (let u = Math.ceil(xa); u < x1 - 1; u += 3) b.deco(u % 2 ? 'flat:#b3a892' : 'flat:#8f6a52', u, GY + 0.014, zc - 0.5, u + 1.5, GY + 0.018, zc + 0.5);
      for (let u = xa + RB / 2 + 0.5; u < x1 - RB / 2 + 0.6; u += RB) {
        b.model('kitaarcade', 'roof', u, GY, ARC[0], Math.round(u));
        b.out.models[b.out.models.length - 1].seed = Math.abs(Math.round(u / RB));
        for (const z of [ARC[0] + 0.14, ARC[1] - 0.14]) b.block(u - 0.12, GY, z - 0.12, u + 0.12, GY + 3, z + 0.12);
      }
      for (const [gx, f] of gates) {
        at(f, gx, zc, () => {
          b.model('kitaarcade', 'gate', 0, GY, 0, 0);
          const g = KITAARCADE.gate, hw = g.w / 2 - 0.25;
          for (const s of [-1, 1]) b.block(s * hw - 0.16, GY, -0.16, s * hw + 0.16, GY + 3, 0.16);
          for (const key of ['name_f', 'name_b']) label(g.pts[key], name.ja, name.en, '#f4f1e8', '#3f6a5a');
        });
      }
      b.zone('street', xa, GY - 0.2, ARC[0], x1, GY + 9, ARC[1], name.ja, name.en, false);
      reserved.push([xa, ARC[0], x1, ARC[1]]);
    };
    for (const [i, [a, e]] of south.entries()) {
      if (i === 1) continue;
      interiors.push([a, SQ_N, e, BACK]);
      if (i === 0) {
        // Beyond Hamate-suji: a row facing the square across it, the arcade's mouth between its buildings.
        const END = -178, ROW = e - 14.5;
        fillRect(ROW, SQ_N + 0.3, e - 0.3, ARC[0] - 0.2, 'e', BIZ);
        fillRect(ROW, ARC[1] + 0.2, e - 0.3, BACK, 'e', BIZ);
        fillRect(a + 0.3, SQ_N, ROW - 0.8, rowN - 0.4, 'n', BIZ);
        piece('kitaarcade', KITAARCADE, 'game', 'e', END, zc, (m) => { const n = [...m.pts.name] as AnchorPt; n[3] = 5.6; label(n, 'ゲーム ポンポン', 'GAME PONPON', '#1f5fa8', '#ffffff'); });
        arcade(END, ROW - 0.8, e, { ja: '北栄西商店街', en: 'Hokuei Nishi Shopping Arcade' }, [[e - 0.6, 'w']],
          ['capsule', (p) => { label(p.name, 'カプセル&サウナ 湯けむり', 'Capsule & Sauna Yukemuri', '#2f4a5a', '#ffffff'); upright(p.vertical, 'サウナ', '#c8102e'); }], 0);
      } else if (i === 2) {
        fillRect(a + 0.3, SQ_N, e - 0.3, rowN - 0.4, 'n', BIZ);
        arcade(a + 0.1, e - 0.1, e, { ja: '北栄東商店街', en: 'Hokuei Higashi Shopping Arcade' }, [[a + 0.6, 'e'], [e - 0.6, 'w']],
          ['karaoke', (p) => label(p.name, 'カラオケ 歌舟', 'KARAOKE UTABUNE', '#c8102e', '#ffffff')], 4);
      } else {
        const mid = (SQ_N + BACK) / 2;
        fillRect(a + 0.3, mid + 0.4, e - 0.3, BACK, 's', BIZ);
        fillRect(a + 0.3, SQ_N, e - 0.3, mid - 0.4, 'n', BIZ);
      }
    }
    // North of it. Facing the station across the square, and down Tokei-suji either side, blocks of the 1910s–30s
    // kept to the old 31 m line (build_tokei.py), listed from the avenue's corner outwards; stock rows elsewhere.
    const FACING: Record<'e' | 'w', [string, string, string][]> = {
      e: [['railhq', `${RAIL_OPERATOR.nameJa} 本社`, `${RAIL_OPERATOR.nameEn} — Head Office`], ['post', '川湊中央郵便局', 'Kawaminato Central Post Office']],
      w: [['life', 'みお生命 本館', 'Mio Life — Main Building'], ['chamber', '川湊商工会議所', 'Kawaminato Chamber of Commerce and Industry']],
    };
    const AVENUE: Record<'e' | 'w', [string, string, string][]> = {
      e: [['tk_a', '時計筋ビルヂング', 'Tokei-suji Building'], ['tk_b', '川湊倶楽部', 'Kawaminato Club']],
      w: [['tk_c', '川湊商船ビル', 'Kawaminato Shōsen Building'], ['tk_d', '北栄会館', 'Hokuei Kaikan']],
    };
    const northB = between([HAM, TOK, SHI, CHI].map(bl));
    for (const [a, e] of northB) {
      const onTok = Math.abs(a - (TOK.c + TOK.half + TOK.pave)) < 0.1 ? 'w' : Math.abs(e - (TOK.c - TOK.half - TOK.pave)) < 0.1 ? 'e' : null;
      const rowS = EK_N - 24;
      if (onTok) {
        const sg = onTok === 'e' ? -1 : 1, xf = onTok === 'e' ? e : a, D = TOKEI.tk_a.d;
        const name = (q: Anchor, ja: string, en: string) => label(q.pts.name, ja, en, '#2a2622', '#e8dcc0');
        let x = xf + sg * 0.3, z = -ZN + 0.8;
        for (const [id, ja, en] of FACING[onTok]) {
          const w = TOKEI[id].w;
          piece('tokei', TOKEI, id, 's', x + sg * w / 2, EK_N, (q) => name(q, ja, en));
          x += sg * (w + 0.8);
        }
        for (const [id, ja, en] of AVENUE[onTok]) {
          const w = TOKEI[id].w;
          piece('tokei', TOKEI, id, onTok, xf, z + w / 2, (q) => name(q, ja, en));
          z += w + 0.8;
        }
        if (onTok === 'e') fillRect(a + 0.3, -ZN + 0.6, e - D - 0.8, rowS - 0.8, 's', SMALL);
        else fillRect(a + D + 0.8, -ZN + 0.6, e - 0.3, rowS - 0.8, 's', SMALL);
      } else {
        fillRect(a + 0.3, rowS, e - 0.3, EK_N, 's', BIZ);
        fillRect(a + 0.3, -ZN + 0.6, e - 0.3, rowS - 0.8, 's', SMALL);
      }
      interiors.push([a, -ZN, e, EK_N]);
    }
    // The eastbound bus stop on Ekimae-dōri: a shelter on its north pavement.
    const stopK = (x: number, n: 1 | -1, text: string, sub: string) => {
      const z = EKI.z - n * (EKI.half + 0.5);
      roadModel(b, 'busstop', x, GY, z, [0, n]);
      b.block(x - 0.1, GY, z - 0.1, x + 0.1, GY + 2.2, z + 0.1);
      b.sign({ k: 'label', text, sub, fg: '#1f2023', bg: '#f4f4f0' }, x, GY + 1.5, z + n * 0.05, [0, n], 0.5, 0.82);
    };
    stopK(BUS_K + 6.5, 1, '川湊駅北口', 'Kawaminato Sta. North · Bus stop');
    at('s', BUS_K - 2, EK_N + 2.9, () => {
      b.model('kitacity', 'busbay', 0, GY, 0, 0);
      b.block(-5.6, GY, 0.9, 5.6, GY + 2.4, 1.3);
      for (const k of ['stop', 'stopb']) label(KITACITY.busbay.pts[k], '川湊駅北口', 'Kawaminato Sta. North', '#f4f1e8', '#1f2023');
    });
  }


  // ═════════════════════════ Lifts down to Miochika by exits 13 and 14 ═════════════════════════
  // (South of each exit's stair, on the same pavement: the car opens north, onto the pavement above and into the exit's lobby below.)
  for (const sx of [-1, 1]) {
    const xc = sx * 60.4, zf = 59.45;
    b.carve(xc - LIFT_DOOR / 2, cf, zf - 0.65, xc + LIFT_DOOR / 2, cf + LIFT_DOOR_H, zf + 0.01);
    at('n', xc, zf, () => lift(b, { levels: [{ y: cf, ja: 'みおちか・地下鉄', en: 'Miochika / Metro' }, { y: GY, ja: '地上', en: 'Street' }] }));
  }

  // ═════════════════════════ What is left over inside the blocks ═════════════════════════
  // No bare paving between or behind buildings: every free patch of a block is found and put to the
  // use a Japanese city would make of it, by its size. Big: a coin car park, or a pocket park or
  // shrine. Middling: a row of tiny shops with a lane before them, a bicycle park, a service yard.
  // Narrow: a dressed back lane.
  {
    const solid = b.out.boxes.filter((q) => q.solid && q.min[1] < GY + 1.2 && q.max[1] > GY + 0.4);
    let n = 0, parks = 0, shrines = 0;
    const thing = (id: string, x: number, z: number, f: V2, hw: number, hd: number, hgt: number) => {
      roadModel(b, id, x, GY, z, f);
      b.block(x - hw, GY, z - hd, x + hw, GY + hgt, z + hd);
    };
    const laneDress = (x0: number, z0: number, w: number, d: number) => {
      const alongX = w >= d, len = alongX ? w : d, wid = alongX ? d : w;
      const P = (u: number, v: number): V2 => (alongX ? [x0 + u, z0 + v] : [x0 + v, z0 + u]);
      const R = (mat: string, u0: number, v0: number, u1: number, v1: number, y0: number, y1: number, hard = false) => {
        const [ax, az] = P(u0, v0), [cx, cz] = P(u1, v1);
        (hard ? b.box : b.deco).call(b, mat, Math.min(ax, cx), y0, Math.min(az, cz), Math.max(ax, cx), y1, Math.max(az, cz));
      };
      R('flat:#5d5852', 0, 0, len, wid, GY + 0.002, GY + 0.011);
      R('flat:#3f3b37', 0, wid / 2 - 0.08, len, wid / 2 + 0.08, GY + 0.011, GY + 0.015);
      for (let u = 3; u < len - 2; u += 7) {
        const k = Math.floor(r() * 4);
        if (k === 0) R('flat:#c8b23a', u, 0.15, u + 0.9, 0.5, GY, GY + 0.3 + Math.floor(r() * 3) * 0.3, true); // beer crates
        else if (k === 1) R('flat:#c9c8c0', u, 0.1, u + 0.9, 0.45, GY, GY + 0.7, true); // an AC unit on the ground
        else if (k === 2) R('flat:#4f7a8a', u, wid - 0.75, u + 1.2, wid - 0.15, GY, GY + 1.0, true); // a wheeled bin
        else {
          const [px, pz] = P(u, wid - 0.4), dd = b.dir(alongX ? [1, 0] : [0, 1]);
          b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(px, GY, pz), yaw: Math.atan2(-dd[0], -dd[1]), seed: 0, merge: true });
        }
      }
      for (let u = 5; u < len - 3; u += 14) {
        const [px, pz] = P(u, 0.25);
        streetLamp(b, 'lamp_small', px, pz, alongX ? [0, 1] : [1, 0]);
      }
    };
    const coinPark = (x0: number, z0: number, w: number, d: number) => {
      b.deco('asphalt', x0, GY, z0, x0 + w, GY + 0.012, z0 + d);
      b.deco('flat:#e9e9e4', x0, GY + 0.012, z0, x0 + w, GY + 0.016, z0 + 0.12);
      const rows = d >= 17 ? 2 : 1;
      for (let k = 0; k < rows; k++) {
        const zb = k ? z0 + 0.4 : z0 + d - 5.6, zt = zb + 5.2;
        for (let x = x0 + 0.5; x + 2.5 <= x0 + w - 0.4; x += 2.6) {
          for (const xl of [x, x + 2.5]) b.deco('flat:#e9e9e4', xl, GY + 0.012, zb, xl + 0.1, GY + 0.016, zt);
          b.deco('flat:#d6a21a', x + 0.5, GY + 0.012, (k ? zb + 1.1 : zt - 1.3), x + 2.1, GY + 0.12, (k ? zb + 1.3 : zt - 1.1));
          if (r() < 0.45) {
            const id = CARS[Math.floor(r() * CARS.length)], [len, wid, hgt] = VEH[id.split('_')[0]];
            const zc = (zb + zt) / 2;
            roadModel(b, id, x + 1.3, GY, zc, [0, k ? -1 : 1]);
            b.block(x + 1.3 - wid / 2, GY, zc - len / 2, x + 1.3 + wid / 2, GY + hgt, zc + len / 2);
          }
        }
      }
      // The pay machine under its sign, a drinks machine beside it.
      b.box('flat:#f2c230', x0 + 0.3, GY, z0 + 0.3, x0 + 0.9, GY + 1.4, z0 + 0.8);
      b.box('flat:#5f6266', x0 + 1.2, GY, z0 + 0.3, x0 + 1.3, GY + 3.2, z0 + 0.4);
      for (const f of [-1, 1] as const) b.sign({ k: 'label', text: 'P', sub: '24h コインパーキング', fg: '#fff', bg: '#1f5fa8' }, x0 + 1.25, GY + 2.7, z0 + 0.35 + f * 0.06, [0, f], 1.1, 0.9);
      if (w > 9) vending(b, x0 + 2.4, GY, z0 + 0.5, [0, 1], 'vending2', 'new');
    };
    const bikeYard = (x0: number, z0: number, w: number, d: number) => {
      const alongX = w >= d, len = alongX ? w : d, wid = alongX ? d : w;
      b.deco('flat:#8f8a80', x0, GY + 0.002, z0, x0 + w, GY + 0.011, z0 + d);
      const dd = b.dir(alongX ? [0, 1] : [1, 0]);
      for (const v of wid > 6.5 ? [1.2, wid - 1.2] : [1.2]) {
        for (let u = 1; u < len - 0.8 && u < 30; u += 0.62) {
          if (r() < 0.25) continue;
          const [px, pz] = alongX ? [x0 + u, z0 + v] : [x0 + v, z0 + u];
          b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(px, GY, pz), yaw: Math.atan2(-dd[0], -dd[1]), seed: 0, merge: true });
        }
        const [ax, az] = alongX ? [x0 + 0.8, z0 + v - 0.9] : [x0 + v - 0.9, z0 + 0.8], [cx, cz] = alongX ? [x0 + Math.min(len, 30) - 0.6, z0 + v + 0.9] : [x0 + v + 0.9, z0 + Math.min(len, 30) - 0.6];
        b.block(ax, GY, az, cx, GY + 1.0, cz);
      }
      b.box('flat:#5f6266', x0 + 0.3, GY, z0 + 0.3, x0 + 0.4, GY + 2.6, z0 + 0.4);
      for (const f of [-1, 1] as const) b.sign({ k: 'label', text: '駐輪場', sub: 'Bicycle parking', fg: '#fff', bg: '#1f5fa8' }, x0 + 0.35, GY + 2.2, z0 + 0.35 + f * 0.06, [0, f], 1.2, 0.6);
    };
    const yard = (x0: number, z0: number, w: number, d: number) => {
      b.deco('flat:#8f8a80', x0, GY + 0.002, z0, x0 + w, GY + 0.011, z0 + d);
      const alongX = w >= d;
      // A van backed in, bins in a row, crates, yellow lines; a mesh fence along one side.
      const [len, wid, hgt] = VEH.van;
      if (alongX) {
        roadModel(b, 'van', x0 + 3.2, GY, z0 + d / 2, [1, 0]);
        b.block(x0 + 3.2 - len / 2, GY, z0 + d / 2 - wid / 2, x0 + 3.2 + len / 2, GY + hgt, z0 + d / 2 + wid / 2);
        b.box('metal:#8d9399', x0 + 0.2, GY, z0 + d - 0.12, x0 + w - 0.2, GY + 1.8, z0 + d - 0.06);
        for (let x = x0 + 7; x < x0 + w - 1.4 && x < x0 + 16; x += 1.4) b.box(['flat:#4f7a8a', 'flat:#3f6b3a', 'flat:#6b6f72'][Math.floor(r() * 3)], x, GY, z0 + 0.2, x + 1.2, GY + 1.0, z0 + 0.85);
        for (let x = x0 + 7.5; x < x0 + w - 1; x += 2.2) b.deco('flat:#e6a700', x, GY + 0.011, z0 + 1.6, x + 1.2, GY + 0.015, z0 + 1.72);
      } else {
        roadModel(b, 'van', x0 + w / 2, GY, z0 + 3.2, [0, 1]);
        b.block(x0 + w / 2 - wid / 2, GY, z0 + 3.2 - len / 2, x0 + w / 2 + wid / 2, GY + hgt, z0 + 3.2 + len / 2);
        b.box('metal:#8d9399', x0 + w - 0.12, GY, z0 + 0.2, x0 + w - 0.06, GY + 1.8, z0 + d - 0.2);
        for (let z = z0 + 7; z < z0 + d - 1.4 && z < z0 + 16; z += 1.4) b.box(['flat:#4f7a8a', 'flat:#3f6b3a', 'flat:#6b6f72'][Math.floor(r() * 3)], x0 + 0.2, GY, z, x0 + 0.85, GY + 1.0, z + 1.2);
      }
      for (let k = 0; k < 3; k++) b.box('flat:#c8b23a', x0 + w - 1.1, GY, z0 + d - 1.4 - k * 0.5, x0 + w - 0.6, GY + 0.3 * (3 - k), z0 + d - 1.0 - k * 0.5);
    };
    const shopLane = (x0: number, z0: number, w: number, d: number) => {
      const SD = KITAARCADE.sa.d, SW = KITAARCADE.sa.w;
      if (w >= d) {
        for (let x = x0 + 0.2, k = n; x + SW <= x0 + w - 0.2; x += SW + 0.05, k++) piece('kitaarcade', KITAARCADE, `s${'abcde'[k % 5]}`, 's', x + SW / 2, z0 + SD);
        laneDress(x0, z0 + SD, w, d - SD);
      } else {
        for (let z = z0 + 0.2, k = n; z + SW <= z0 + d - 0.2; z += SW + 0.05, k++) piece('kitaarcade', KITAARCADE, `s${'abcde'[k % 5]}`, 'e', x0 + SD, z + SW / 2);
        laneDress(x0 + SD, z0, w - SD, d);
      }
    };
    for (const [bx0, bz0, bx1, bz1] of interiors) {
      const W = Math.floor(bx1 - bx0), D = Math.floor(bz1 - bz0);
      if (W < 3 || D < 3) continue;
      const occ = new Uint8Array(W * D);
      const fill = (x0: number, z0: number, x1: number, z1: number) => {
        for (let j = Math.max(0, Math.floor(z0 - bz0)); j < Math.min(D, Math.ceil(z1 - bz0)); j++) {
          for (let i = Math.max(0, Math.floor(x0 - bx0)); i < Math.min(W, Math.ceil(x1 - bx0)); i++) occ[j * W + i] = 1;
        }
      };
      for (const q of solid) if (q.max[0] > bx0 && q.min[0] < bx1 && q.max[2] > bz0 && q.min[2] < bz1) fill(q.min[0] - 0.2, q.min[2] - 0.2, q.max[0] + 0.2, q.max[2] + 0.2);
      for (const q of reserved) fill(q[0], q[1], q[2], q[3]);
      for (const q of holes) fill(q[0] - 3, q[1] - 3, q[2] + 3, q[3] + 3);
      for (let iter = 0; iter < 16; iter++) {
        // The largest free rectangle: the tallest-bar method over a histogram of free cells.
        const hgt = new Int32Array(W);
        let best = { a: 0, x: 0, z: 0, w: 0, d: 0 };
        for (let j = 0; j < D; j++) {
          for (let i = 0; i < W; i++) hgt[i] = occ[j * W + i] ? 0 : hgt[i] + 1;
          const stack: number[] = [];
          for (let i = 0; i <= W; i++) {
            const cur = i < W ? hgt[i] : 0;
            while (stack.length && hgt[stack[stack.length - 1]] >= cur) {
              const top = stack.pop()!, left = stack.length ? stack[stack.length - 1] + 1 : 0, w = i - left, d = hgt[top];
              // (Prefer compact patches over long slivers of the same area.)
              const score = w * d * (Math.min(w, d) >= 3 ? 1 : 0) + Math.min(w, d);
              if (Math.min(w, d) >= 3 && score > best.a) best = { a: score, x: left, z: j - d + 1, w, d };
            }
            stack.push(i);
          }
        }
        if (best.w * best.d < 18) break;
        let { w, d } = best;
        const x0 = bx0 + best.x, z0 = bz0 + best.z, short = Math.min(w, d), long = Math.max(w, d);
        if (short >= 12 && long >= 14) {
          if (parks < 2 && w >= PLACES.park.w + 1 && d >= PLACES.park.d + 1 && n % 3 === 1) {
            ({ w, d } = PLACES.park);
            at('n', x0 + w / 2, z0, () => place(b, { kind: 'park', ja: ['千鳥児童遊園', '浜手ひろば'][parks], en: ['Chidori Children\'s Park', 'Hamate Square'][parks] }));
            parks++;
          } else if (!shrines && w >= PLACES.shrine.w + 1 && d >= PLACES.shrine.d + 1 && n % 3 === 2) {
            ({ w, d } = PLACES.shrine);
            at('n', x0 + w / 2, z0, () => place(b, { kind: 'shrine', ja: '北栄稲荷', en: 'Hokuei Inari' }));
            shrines++;
          } else {
            w = Math.min(w, 24);
            d = Math.min(d, 22);
            coinPark(x0 + 0.3, z0 + 0.3, w - 0.6, d - 0.6);
          }
        } else if (short >= 9.5) shopLane(x0, z0, w, d);
        else if (short >= 5) (n % 2 ? bikeYard : yard)(x0 + 0.2, z0 + 0.2, w - 0.4, d - 0.4);
        else laneDress(x0, z0, w, d);
        fill(x0, z0, x0 + w, z0 + d);
        n++;
      }
    }
  }

  // ═════════════════════════ Past the plot's edge ═════════════════════════
  // Every street that reaches the edge runs on OUT metres, with its pavements, lamps and trees, between
  // rows of buildings (simplified copies; a cross street half way), and the haze takes it from there.
  // Yanagi-suji is left alone: Tsumugibashi's boulevard arrives along it.
  {
    const OUT = 200, CROSS = 100, CW = 3.5;
    type Edge = { c: number; half: number; pave: number; wide: boolean; tree?: TreeKind };
    const roadOut = (alongZ: boolean, s: 1 | -1, q: Edge) => {
      const lim = alongZ ? (s > 0 ? Z : ZN) : X, u0 = s > 0 ? lim : -lim - OUT, u1 = u0 + OUT;
      const R = (mat: string, v0: number, v1: number, y0: number, y1: number, a = u0, e = u1) => (alongZ ? b.deco(mat, q.c + v0, y0, a, q.c + v1, y1, e) : b.deco(mat, a, y0, q.c + v0, e, y1, q.c + v1));
      R('asphalt', -q.half, q.half, -0.03, 0.004);
      for (const k of [-1, 1]) R('paver', Math.min(k * q.half, k * (q.half + q.pave)), Math.max(k * q.half, k * (q.half + q.pave)), -0.03, GY);
      if (q.wide) R('flat:#e6a700', -0.08, 0.08, 0.004, 0.01);
      for (let u = u0 + 2; u + 3 < u1; u += 6) {
        if (q.wide) for (const k of [-1, 1]) R('flat:#e9e9e4', k * q.half / 2 - 0.07, k * q.half / 2 + 0.07, 0.004, 0.01, u, u + 3);
        else R('flat:#e9e9e4', -0.07, 0.07, 0.004, 0.01, u, u + 3);
      }
      for (let u = u0 + 12, k = 0; u < u1 - 6; u += 26, k++) {
        if (Math.abs(u - (s > 0 ? lim + CROSS : -lim - CROSS)) < 8) continue;
        const side = k % 2 ? 1 : -1, v = side * (q.half + 0.8);
        const [px, pz] = alongZ ? [q.c + v, u] : [u, q.c + v];
        roadModel(b, q.wide ? 'lamp_led' : 'lamp_small', px, GY, pz, alongZ ? [-side, 0] : [0, -side]);
        if (q.tree) for (const kk of [-1, 1]) {
          const [tx, tz] = alongZ ? [q.c + kk * (q.half + 1.5), u + 9] : [u + 9, q.c + kk * (q.half + 1.5)];
          modelTree(b, q.tree, tx, tz, 'b', GY, false);
        }
      }
    };
    const pack = (alongZ: boolean, s: 1 | -1, a: number, e: number) => {
      // The ground between two streets beyond the edge: rows fronting each, back to back; a cross street half way out.
      const lim = alongZ ? (s > 0 ? Z : ZN) : X, mid = (a + e) / 2;
      for (const [d0, d1] of [[0.5, CROSS - CW], [CROSS + CW, OUT]]) {
        const u0 = s > 0 ? lim + d0 : -lim - d1, u1 = s > 0 ? lim + d1 : -lim - d0;
        if (alongZ) {
          fillRect(a + 0.2, u0, mid - 0.4, u1, 'w', BIZ, true);
          fillRect(mid + 0.4, u0, e - 0.2, u1, 'e', BIZ, true);
        } else {
          fillRect(u0, a + 0.2, u1, mid - 0.4, 'n', BIZ, true);
          fillRect(u0, mid + 0.4, u1, e - 0.2, 's', BIZ, true);
        }
      }
      const uc = s > 0 ? lim + CROSS : -lim - CROSS;
      if (alongZ) b.deco('asphalt', a - 20, -0.03, uc - CW, e + 20, 0.004, uc + CW);
      else b.deco('asphalt', uc - CW, -0.03, a - 20, uc + CW, 0.004, e + 20);
    };
    const wideE = (st2: NS): Edge => ({ c: st2.c, half: st2.half, pave: st2.pave, wide: true, tree: st2 === SHI ? 'dogwood' : st2 === TOK ? 'camphor' : 'zelkova' });
    const localE = (cx: number): Edge => ({ c: cx, half: LH, pave: LP, wide: false });
    const m0 = b.out.models.length;
    // North and south.
    for (const s of [-1, 1] as const) {
      const through = s > 0 ? [HAM, SHI, CHI] : [HAM, TOK, SHI, CHI], locals = s > 0 ? LOCALS.map((q) => q.c) : [];
      for (const q of through) roadOut(true, s, wideE(q));
      for (const cx of locals) roadOut(true, s, localE(cx));
      const corridors = [...through.map(bl), ...(s > 0 ? [...LOCAL_BL, bl(YAN)] : [])];
      const keepOff: [number, number] = s > 0 ? [LOCAL_BL[1][0], LOCAL_BL[2][1]] : [0, 0];
      for (const [a, e] of between(corridors)) {
        if (s > 0 && a >= keepOff[0] - 0.1 && e <= keepOff[1] + 0.1) continue; // Tsumugibashi's boulevard
        pack(true, s, a, e);
        b.clearScenery(a - 9, s > 0 ? Z : -ZN - OUT - 2, e + 9, s > 0 ? Z + OUT + 2 : -ZN);
      }
    }
    // East and west.
    const ew: Edge[] = [
      { c: 0, half: AV, pave: FRONT - AV, wide: true, tree: 'ginkgo' }, { c: MIN.z, half: MIN.half, pave: MIN.pave, wide: false },
      { c: NIB.z, half: NIB.half, pave: NIB.pave, wide: false }, { c: EKI.z, half: EKI.half, pave: EKI.pave, wide: false },
    ];
    const corrEW: [number, number][] = [[EKI.z - EKI.half - EKI.pave, EKI.z + EKI.half + EKI.pave], [BACK, LANE_S], [-FRONT, FRONT], [MIN.z - MIN.half - MIN.pave, MIN.z + MIN.half + MIN.pave], [NIB.z - NIB.half - NIB.pave, NIB.z + NIB.half + NIB.pave]];
    for (const s of [-1, 1] as const) {
      for (const q of ew) roadOut(false, s, q);
      // (Ekiura-dōri runs on too, along the viaduct.)
      b.deco('flat:#77736b', s > 0 ? X : -X - OUT, -0.03, VIA[1], s > 0 ? X + OUT : -X, GY + 0.002, LANE_S);
      for (const [a, e] of between(corrEW, -ZN, Z)) pack(false, s, a, e);
      b.clearScenery(s > 0 ? X : -X - OUT - 2, -ZN, s > 0 ? X + OUT + 2 : -X, Z);
    }
    for (let k = m0; k < b.out.models.length; k++) if (b.out.models[k].kind === 'road' || b.out.models[k].kind === 'trees') b.out.models[k].merge = true;
  }

  // ═════════════════════════ At the kerb: furniture, drinks machines, the metro's pylons ═════════════════════════
  {
    const K: [string, number, number][] = [['bikerack', 4.1, 1.1], ['postbox', 0.5, 1.2], ['planter', 1.8, 0.9], ['bench_s', 1.9, 0.6], ['phonebox', 1.05, 2.4], ['planter', 1.8, 0.9]];
    const item = (x: number, z: number, alongX: boolean, f: V2) => {
      const [id, w, hgt] = K[Math.floor(r() * K.length)];
      if (nearHole(x, z, 3)) return;
      roadModel(b, id, x, GY, z, f);
      b.block(x - (alongX ? w / 2 : 0.4), GY, z - (alongX ? 0.4 : w / 2), x + (alongX ? w / 2 : 0.4), GY + hgt, z + (alongX ? 0.4 : w / 2));
    };
    // Minami-ichiban-dōri and the wide streets: something at the kerb every block.
    const corridors = [...WIDE.map(bl), ...LOCAL_BL];
    for (const [a, e] of between(corridors)) {
      if (e - a < 16) continue;
      for (const s of [-1, 1]) for (const x of [a + 5 + r() * 3, e - 5 - r() * 3]) item(x, MIN.z + s * (MIN.half + 0.9), true, [0, s]);
    }
    for (const s of [HAM, CHI, YAN]) {
      for (const sx of [-1, 1]) for (const z of [34, 52, 96, 112, 146, -40, -58, -132, -150]) {
        if (z < s.from || !clearOf(z, crossings(s), 2)) continue;
        item(s.c + sx * (s.half + 0.9), z + r() * 3, false, [sx, 0]);
      }
    }
    // Drinks machines against blank flanks: beside the viaduct's bridges on Ekiura-dōri.
    for (const x of [-120, -90, 76, 118]) {
      for (let k = 0; k < 2 + Math.floor(r() * 2); k++) vending(b, x + k * 1.05, GY, VIA[1] + 0.4, [0, 1], r() < 0.5 ? 'vending' : 'vending2', 'new');
    }
    // A station pylon on the pavement by each metro exit.
    const P = KITACITY.pylon.pts;
    /** Which exit a stair's opening is: 1–8 on the avenue, 9 in the terminal's portal, 10 on Yanagi-suji, 11–12 in the Gate Towers' bases, 13–14 on the local streets beside them. */
    const NUM = (q: Rect) => Math.abs(q[1]) < 20 && Math.abs(q[0]) > 60
      ? String((q[0] > 0 ? 0 : 4) + (Math.abs(q[0]) > 110 ? 2 : 0) + (q[1] < 0 ? 1 : 2))
      : q[1] < 0 ? '9' : Math.abs(q[0]) < 20 ? '10' : Math.abs(q[0]) < 55 ? (q[0] < 0 ? '11' : '12') : q[0] < 0 ? '13' : '14';
    for (const q of holes) {
      if (q === hallStair || (Math.abs(q[0] - EXIT15.x[0]) < 0.01 && q[1] < VIA[1])) continue; // (Exit 15 comes up inside Kawaminato Station's great hall: hub.ts exit15())
      const num = NUM(q), avenue = Math.abs(q[1]) < 20 && Math.abs(q[0]) > 60;
      const xm = (q[0] + q[2]) / 2;
      const [px, pz, f]: [number, number, Face] = avenue ? [q[0] - 1.6, (q[1] + q[3]) / 2, 'w'] : num === '9' ? [q[2] + 1.4, q[3] + 2.2, 's']
        : num === '10' ? [q[2] + 1.2, q[1] - 1.4, 'n'] : num === '11' || num === '12' ? [xm - Math.sign(xm) * 3.8, FRONT - 1.3, 'n'] : [xm, q[1] - 1.8, 'n'];
      at(f, px, pz, () => {
        b.model('kitacity', 'pylon', 0, GY, 0, 0);
        b.block(-0.62, GY, -0.16, 0.62, GY + 4.2, 0.16);
        for (const k of ['f', 'b']) {
          const p = P[k];
          b.sign({ k: 'guide', ja: `${st.nameJa}駅`, en: `${st.nameRomaji} Sta.`, bg: 'navy', badges: lines, num }, p[0], p[1] + GY + 0.95, p[2], [p[5], p[6]], p[3], 0.5);
          b.sign({ k: 'areamap', station: st.id }, p[0], p[1] + GY - 0.3, p[2], [p[5], p[6]], p[3], 1.5);
        }
      });
    }
  }
}
