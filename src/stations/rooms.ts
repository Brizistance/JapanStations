// The concourse level's walls: the spine's long and end walls, the rooms outside it (transfer
// bays, a second spine, cross passages) and the walls and portal round every stair opening.
//
// Plan geometry only (station frame, rectangles [x0, z0, x1, z1]); concourse() in build.ts
// turns the result into boxes, zones and the ConcInfo a look sees.
//
// Walls are planned per area edge. Two areas that touch exactly are open to each other along the
// stretch where they touch. Two areas a wall's thickness apart (≤ 0.45 m) share one wall, built
// by the earlier area (the spine first, then rooms in order) and filling the gap exactly; a
// mouth is a gap in it. Any other edge gets a wall of the area's default thickness, outwards.

import type { LineDef } from '../data/types';
import type { Mouth, Rect, StairInfo, Stairwell, WallFace, WallOpening } from './looks/types';

type Span = [number, number];
type Axis = 'x' | 'z';

/** A room outside the spine, as a composer describes it. */
export interface RoomSpec {
  kind: 'transfer bay' | 'spine' | 'cross passage';
  rect: Rect;
  ja: string;
  en: string;
  zone: 'concourse' | 'passage';
  /**
   * Gaps in the wall between this room and an area listed before it (`to`: −1 the spine, else a
   * room index), given in this room's own edge. Rooms that touch exactly need no mouth.
   */
  mouths: Mouth[];
  /** The stair openings inside it. */
  stairs: StairInfo[];
}

/** One side of a rectangle: the line `at` across `axis`, from u0 to u1 along it, facing out along n. */
interface Edge {
  axis: Axis;
  at: number;
  n: 1 | -1;
  u0: number;
  u1: number;
}

const edgesOf = (r: Rect): Edge[] => [
  { axis: 'x', at: r[1], n: -1, u0: r[0], u1: r[2] },
  { axis: 'x', at: r[3], n: 1, u0: r[0], u1: r[2] },
  { axis: 'z', at: r[0], n: -1, u0: r[1], u1: r[3] },
  { axis: 'z', at: r[2], n: 1, u0: r[1], u1: r[3] },
];

/** `spans` with `g` taken out. */
function minus(spans: Span[], g: Span): Span[] {
  return spans.flatMap(([a, c]): Span[] => (g[1] <= a || g[0] >= c ? [[a, c]] : [...(g[0] > a ? [[a, g[0]] as Span] : []), ...(g[1] < c ? [[g[1], c] as Span] : [])]))
    .filter(([a, c]) => c - a > 0.01);
}
const within = (spans: Span[], g: Span): Span[] =>
  spans.map(([a, c]): Span => [Math.max(a, g[0]), Math.min(c, g[1])]).filter(([a, c]) => c - a > 0.01);

/** A plan rectangle for a band beside edge e: along u0 … u1, from the edge out to depth t. */
function band(e: Edge, u0: number, u1: number, d0: number, d1: number): Rect {
  const p = e.at + e.n * d0, q = e.at + e.n * d1;
  const [a, c] = p < q ? [p, q] : [q, p];
  return e.axis === 'x' ? [u0, a, u1, c] : [a, u0, c, u1];
}

/** How far beyond the room the shared wall reaches, for gaps given in either area's edge. */
const SHARED = 0.45;

export interface WallPlan {
  /** Wall boxes to build (plan), full height. */
  walls: Rect[];
  /** Floor under the gaps in shared walls (the mouths), which belongs to neither area. */
  floor: Rect[];
  /** Inner faces of each area's walls (index 0 the spine, then the rooms). */
  faces: WallFace[][];
  /** Every way out of each room (index into `rooms`), its own and the other side's mouths. */
  mouths: Mouth[][];
  /** Gaps in the spine's long walls, sorted by x. */
  openings: WallOpening[];
}

/**
 * Plan the walls of the spine (half width `cw`, x0 … x1, long walls `spineT` thick unless a room
 * sits closer) and of the rooms beyond it. `exits` are the exit doorways in the long walls;
 * `open` are stretches of the long walls left out onto floor the composer builds itself.
 */
export function planWalls(
  x0: number, x1: number, cw: number, spineT: number, exits: { s: 1 | -1; x0: number; x1: number; num: string }[], rooms: RoomSpec[],
  open: { s: 1 | -1; x0: number; x1: number }[] = [],
): WallPlan {
  const areas = [{ rect: [x0, -cw, x1, cw] as Rect, t: spineT }, ...rooms.map((r) => ({ rect: r.rect, t: 0.2 }))];
  const gaps: Mouth[] = [
    ...exits.map((e): Mouth => ({ axis: 'x', at: e.s * cw, u0: e.x0, u1: e.x1, to: -2 })),
    ...open.map((g): Mouth => ({ axis: 'x', at: g.s * cw, u0: g.x0, u1: g.x1, to: -2 })),
    ...rooms.flatMap((r) => r.mouths),
  ];
  const out: WallPlan = { walls: [], floor: [], faces: areas.map(() => []), mouths: rooms.map((r) => [...r.mouths]), openings: [] };

  areas.forEach((A, k) => {
    // Built pieces per edge, for the corners.
    const built: { e: Edge; pieces: { u0: number; u1: number; t: number }[] }[] = [];
    for (const e of edgesOf(A.rect)) {
      let walled: Span[] = [[e.u0, e.u1]];
      const skip: Span[] = [], thick: { s: Span; t: number }[] = [];
      areas.forEach((B, j) => {
        if (j === k) return;
        const f = edgesOf(B.rect).find((q) => q.axis === e.axis && q.n === -e.n)!;
        const ov: Span = [Math.max(e.u0, f.u0), Math.min(e.u1, f.u1)];
        if (ov[1] - ov[0] < 0.01) return;
        const d = (f.at - e.at) * e.n;
        if (Math.abs(d) < 0.01) {
          // They meet: open, and each records the other as a way through.
          walled = minus(walled, ov);
          if (k > 0) out.mouths[k - 1].push({ axis: e.axis, at: e.at, u0: ov[0], u1: ov[1], to: j - 1 });
        } else if (d > 0 && d <= SHARED) {
          if (j < k) skip.push(ov);
          else thick.push({ s: ov, t: d });
        }
      });
      for (const g of gaps) {
        const d = (g.at - e.at) * e.n;
        if (g.axis === e.axis && d >= -0.01 && d <= SHARED + 0.01) walled = minus(walled, [g.u0, g.u1]);
      }
      for (const [u0, u1] of walled) out.faces[k].push({ axis: e.axis, at: e.at, n: -e.n as 1 | -1, u0, u1 });
      // What this area builds: its walled stretches, less those an earlier neighbour builds; as
      // thick as the gap to a later neighbour, else the default. Under a gap, floor.
      let mine = walled;
      for (const s of skip) mine = minus(mine, s);
      const pieces: { u0: number; u1: number; t: number }[] = [];
      let rest = mine;
      for (const { s, t } of thick) {
        for (const [u0, u1] of within(rest, s)) pieces.push({ u0, u1, t });
        rest = minus(rest, s);
        // Gaps in the shared wall: floor across the wall's thickness.
        let open: Span[] = [s];
        for (const w of walled) open = minus(open, w);
        for (const [a, c] of open) out.floor.push(band(e, a, c, 0, t));
      }
      for (const [u0, u1] of rest) pieces.push({ u0, u1, t: A.t });
      for (const p of pieces) out.walls.push(band(e, p.u0, p.u1, 0, p.t));
      built.push({ e, pieces });
    }
    // Close each outside corner where walls meet.
    const xs = built.filter((q) => q.e.axis === 'x'), zs = built.filter((q) => q.e.axis === 'z');
    for (const a of xs) {
      for (const c of zs) {
        const cx = c.e.at, cz = a.e.at;
        const pa = a.pieces.find((p) => Math.abs(p.u0 - cx) < 0.01 || Math.abs(p.u1 - cx) < 0.01);
        const pc = c.pieces.find((p) => Math.abs(p.u0 - cz) < 0.01 || Math.abs(p.u1 - cz) < 0.01);
        if (!pa || !pc) continue;
        const qx = cx + c.e.n * pc.t, qz = cz + a.e.n * pa.t;
        out.walls.push([Math.min(cx, qx), Math.min(cz, qz), Math.max(cx, qx), Math.max(cz, qz)]);
      }
    }
  });

  // Mouths given by a room into an earlier room also belong to that room, in its own edge.
  rooms.forEach((r, k) => {
    for (const m of r.mouths) {
      if (m.to < 0) continue;
      const e = edgesOf(rooms[m.to].rect).filter((q) => q.axis === m.axis).sort((p, q) => Math.abs(p.at - m.at) - Math.abs(q.at - m.at))[0];
      out.mouths[m.to].push({ axis: m.axis, at: e.at, u0: m.u0, u1: m.u1, to: k });
    }
  });
  out.openings = [
    ...exits.map((e): WallOpening => ({ s: e.s, x0: e.x0, x1: e.x1, kind: 'exit', num: e.num })),
    ...open.map((g): WallOpening => ({ s: g.s, x0: g.x0, x1: g.x1, kind: 'open' })),
    ...rooms.flatMap((r, k) => r.mouths.filter((m) => m.to === -1 && m.axis === 'x').map((m): WallOpening => ({ s: m.at > 0 ? 1 : -1, x0: m.u0, x1: m.u1, kind: 'bay', room: k }))),
  ].sort((a, c) => a.x0 - c.x0 || a.s - c.s);
  return out;
}

// ── Stairwells ───────────────────────────────────────────────────────────────────────────────

/** A wall face this close to a stair's side (or closer) serves as that side; the strip between is closed off. */
const CLOSE_OFF = 2.4;
/** Stairwell walls stand this far outside the opening (the glass rails are inside) and are this thick. */
const OFF = 0.1, WT = 0.18;
/** Portal: the jambs' depth along the stair, their least width, and the fascia's underside above the floor. */
const JAMB_D = 0.3, JAMB_W = 0.3, FASCIA = 2.35;

export interface StairwellPlan extends Stairwell {
  /** Plan boxes for the fascia band (cf + 2.35 up to the ceiling). */
  fasciaRect: Rect;
  /** The fascia's colour, and a stripe colour along its foot (transfer stairs). */
  color: string;
  stripe: string | null;
}

/**
 * The walls and portal for each stair. `faces` are the inner faces of the walls already planned
 * (spine and rooms): a side within 2.4 m of one uses it rather than a wall of its own. `room`
 * says which area each stair stands in; in a room that is all stairwell (`enclosed`, a transfer
 * bay) every side uses the room's walls, however far, and only the portal is added.
 */
export function planStairwells(stairs: StairInfo[], faces: WallFace[], room: (s: StairInfo) => number, enclosed: (s: StairInfo) => boolean, cf: number, ceil: number): StairwellPlan[] {
  type U = { st: StairInfo; ax: Axis; u0: number; u1: number; v0: number; v1: number; hs: 1 | -1 };
  // Work along the stair (u) and across it (v); map back at the end.
  const toRect = (ax: Axis, u0: number, v0: number, u1: number, v1: number): Rect =>
    ax === 'x' ? [Math.min(u0, u1), Math.min(v0, v1), Math.max(u0, u1), Math.max(v0, v1)] : [Math.min(v0, v1), Math.min(u0, u1), Math.max(v0, v1), Math.max(u0, u1)];
  const us: U[] = stairs.map((st) => {
    const ax: Axis = Math.abs(st.down[0]) > 0.5 ? 'x' : 'z';
    const r = st.rect;
    const [u0, v0, u1, v1] = ax === 'x' ? [r[0], r[1], r[2], r[3]] : [r[1], r[0], r[3], r[2]];
    const du = ax === 'x' ? st.down[0] : st.down[1];
    return { st, ax, u0, u1, v0, v1, hs: du < 0 ? 1 : -1 };
  });
  const perp = (ax: Axis): Axis => (ax === 'x' ? 'z' : 'x');

  const plans = us.map((s): StairwellPlan & { closedAt: number; vLo: number; vHi: number } => {
    const walls: Rect[] = [];
    const len = s.u1 - s.u0;
    // Each long side: a wall face close by, facing the stair, along nearly all of it?
    const near = (side: -1 | 1): number | null => {
      const edge = side < 0 ? s.v0 : s.v1;
      let best: number | null = null;
      for (const f of faces) {
        if (f.axis !== s.ax || f.n !== -side) continue;
        const d = (f.at - edge) * side;
        const ov = Math.min(s.u1, f.u1) - Math.max(s.u0, f.u0);
        if (d < 0 || (d >= CLOSE_OFF && !enclosed(s.st)) || ov < len - 0.5) continue;
        if (best === null || Math.abs(f.at - edge) < Math.abs(best - edge)) best = f.at;
      }
      return best;
    };
    const lo = near(-1), hi = near(1);
    const vLo = lo ?? s.v0 - OFF - WT, vHi = hi ?? s.v1 + OFF + WT;
    // The closed end, unless a wall across stands right there.
    const cu = s.hs > 0 ? s.u0 : s.u1, cn = -s.hs;
    const endFace = faces.find((f) => f.axis === perp(s.ax) && f.n === s.hs && (f.at - cu) * cn >= 0 && (f.at - cu) * cn <= OFF + WT + 0.15 && f.u0 <= vLo + 0.01 && f.u1 >= vHi - 0.01);
    const closedAt = endFace ? endFace.at : cu + cn * (OFF + WT);
    const hu = s.hs > 0 ? s.u1 : s.u0;
    // A side wall unless the face is right there; a strip wider than that between the wall and
    // the face is closed off at both ends (the closed end and the jamb run on to the face).
    if (lo === null || s.v0 - OFF - lo > 0.5) walls.push(toRect(s.ax, closedAt, s.v0 - OFF - WT, hu, s.v0 - OFF));
    if (hi === null || hi - s.v1 - OFF > 0.5) walls.push(toRect(s.ax, closedAt, s.v1 + OFF, hu, s.v1 + OFF + WT));
    if (!endFace) walls.push(toRect(s.ax, cu + cn * OFF, vLo, closedAt, vHi));
    // Portal: a jamb each side of the opening (none where a wall face is at the opening's edge),
    // and the fascia across, from the head back into the stairwell.
    const pa = hu - s.hs * (JAMB_D - 0.05), pb = hu + s.hs * 0.05;
    const jambs: Rect[] = [];
    const jLo = lo !== null ? lo : Math.min(vLo, s.v0 - OFF - JAMB_W);
    const jHi = hi !== null ? hi : Math.max(vHi, s.v1 + OFF + JAMB_W);
    if (s.v0 - OFF - jLo > 0.05) jambs.push(toRect(s.ax, pa, jLo, pb, s.v0 - OFF));
    if (jHi - (s.v1 + OFF) > 0.05) jambs.push(toRect(s.ax, pa, s.v1 + OFF, pb, jHi));
    const fasciaRect = toRect(s.ax, pa, jLo, pb, jHi);
    const platform = s.st.kind === 'platform';
    const front = pb;
    const n: [number, number] = s.ax === 'x' ? [s.hs, 0] : [0, s.hs];
    const vm = (s.v0 + s.v1) / 2;
    return {
      stair: s.st, walls, room: room(s.st),
      footprint: toRect(s.ax, closedAt, jLo, pb, jHi),
      portal: {
        at: s.ax === 'x' ? [hu, vm] : [vm, hu],
        n,
        w: s.v1 - s.v0 + 2 * OFF,
        jambs,
        fascia: { axis: perp(s.ax), at: front, n: s.hs, u0: jLo, u1: jHi, y0: cf + FASCIA, y1: ceil },
      },
      fasciaRect,
      color: platform ? s.st.line.color : '#f2f2ee',
      stripe: platform ? null : s.st.line.color,
      closedAt, vLo, vHi,
    };
  });

  // Two stairwells back to back with a gap too narrow to use: fill it.
  for (let i = 0; i < us.length; i++) {
    for (let j = i + 1; j < us.length; j++) {
      const a = us[i], c = us[j], pa = plans[i], pc = plans[j];
      if (a.ax !== c.ax || a.hs === c.hs) continue;
      // hs < 0: head at u0, closed end at u1. That one must lie below the other in u.
      const [plo, phi] = a.hs < 0 ? [pa, pc] : [pc, pa];
      const gap = phi.closedAt - plo.closedAt;
      const v0 = Math.max(pa.vLo, pc.vLo), v1 = Math.min(pa.vHi, pc.vHi);
      if (gap <= 0 || gap >= CLOSE_OFF || v1 - v0 < 1) continue;
      const fill = toRect(a.ax, plo.closedAt, v0, phi.closedAt, v1);
      plo.walls.push(fill);
      plo.footprint = union(plo.footprint, fill);
    }
  }
  return plans.map((p) => ({
    stair: p.stair, walls: p.walls, footprint: p.footprint, room: p.room, portal: p.portal,
    fasciaRect: p.fasciaRect, color: p.color, stripe: p.stripe,
  }));
}

const union = (a: Rect, c: Rect): Rect => [Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[2], c[2]), Math.max(a[3], c[3])];

/** Room name for a transfer bay. */
export const bayName = (l: LineDef) => ({ ja: `${l.nameJa} のりかえ階段`, en: `Transfer stairs: ${l.nameEn}` });
