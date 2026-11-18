// Station look: Tsumugibashi (紬橋), where the Nagisa, Kikyō and Yanagisuji lines meet.
//
// Tsumugibashi Chikagai (紬橋地下街): the widest concourse in the network stops being a hall
// and becomes a small grid of shopping streets in the silk-weaving district. Blocks of shops,
// built to the ceiling, stand between the pillar rows and the stair openings; the streets
// between them line up with the gates, the stair heads and the transfer stairs, and each has a
// name from the weaving trade on plates at the block corners. Long "warp" streets run along the
// lines, "weft" lanes cross them, and a hand loom stands at the Shuttle Crossing (杼の辻).
//
// - Ceiling: cloth on a loom. Thin warp bands in the four thread colours run the length of
//   each street, weft bands cross them every 6 m, alternately below and above (over and
//   under), with light strips between.
// - Floors: each street has a border in its own colour, so the streets can be told apart.
// - Old and new: the Nagisa (1961) side at −z has timber fascias, counters with noren, beams
//   and pipes; the Kikyō (2015) side at +z has bright glazed fronts and light slots.
// - Pillars: cream tile, a madder base and a woven band (threads over and under).
// - Exits: cream tile with a woven stripe, handrails, and a steel-and-glass entrance with a
//   woven slat screen and a madder fascia. Passages: a striped dado continuing the mural,
//   warp bands overhead, framed textile samples.
//
// Everything is derived from the concourse info (stairs, pillars, gate lines); every block is
// fitted to free floor (shrunk, or left out, if something is in the way).

import type { Builder } from '../../world/builder';
import {
  cut, exitDado, exitHandrails, FASCIA, hash, kiosk, PALETTES, passageDado, passageRails, passageWalls, SHOPS, wallBand, wallDado,
  type Brand, type Span,
} from './parts';
import type { ConcInfo, Rect, StationLook } from './types';

// ── Palette ──────────────────────────────────────────────────────────────────────────────────

const BLUE = '#1f6f9d', MADDER = '#b4472f', CREAM = '#efe6cf', INDIGO = '#2b3a67';
/** The four thread colours. */
const THREADS = [BLUE, MADDER, CREAM, INDIGO];
const TILE = 'tile:#efe6cf';
const TIMBER = 'wood:#4a3324';
const STEEL = 'metal:#5d6166';
const CLOTH = [BLUE, MADDER, INDIGO, '#d8c8a0', '#6b4a32', '#3f6f4a', '#7a1f2b', '#c9962e'];

type Era = 'old' | 'mid' | 'new';
/** Block finishes by age: timber and tile (Nagisa side), enamel, bright panels (Kikyō side). */
const STYLE: Record<Era, { body: string; fascia: string; pilaster: string; counter: string; dado: string }> = {
  old: { body: 'tile:#e4dccb', fascia: 'wood:#5a3d2b', pilaster: 'wood:#6b4a32', counter: 'wood:#7a5a3a', dado: 'tile:#c9b48a' },
  mid: { body: 'panel:#ebe5d8', fascia: 'panel:#f4efe2', pilaster: `paint:${MADDER}`, counter: 'flat:#d8d2c4', dado: `panel:${CREAM}` },
  new: { body: 'panel:#f4f2ee', fascia: 'panel:#fbfaf7', pilaster: 'metal:#c3c7cb', counter: 'flat:#e3e1dc', dado: 'panel:#e9e6df' },
};

// ── Shops ────────────────────────────────────────────────────────────────────────────────────

/** District shops of the silk quarter (invented; to be recorded in docs/worldbuilding.md). */
const DISTRICT = {
  hataya: { ja: '紬織物 はたや', en: 'Hataya Tsumugi Silks', bg: '#3b2a4a', fg: '#f1e4c8', kind: 'goods' },
  yoriito: { ja: '糸屋 よりいと', en: 'Yoriito Yarn & Thread', bg: '#f1e4c8', fg: '#b4472f', kind: 'goods' },
  ayaginu: { ja: 'きもの 綾衣', en: 'Kimono Ayaginu', bg: '#7a1f2b', fg: '#f6e7c8', kind: 'goods' },
  tsutsumiya: { ja: 'ふろしき 包み屋', en: 'Tsutsumiya Furoshiki', bg: BLUE, fg: '#ffffff', kind: 'goods' },
  someiro: { ja: '染め見本 そめいろ', en: 'Someiro Dye Bar', bg: INDIGO, fg: '#f2c14e', kind: 'cafe' },
} satisfies Record<string, Brand>;

type Front = 'glazed' | 'counter' | 'stall' | 'lockers' | 'atm' | 'photo';
type Special = 'bolts' | 'cones' | 'kimono' | 'furoshiki' | 'swatches';
interface Shop {
  brand: Brand;
  front: Front;
  special?: Special;
  /** Noren colour under the fascia (counters). */
  noren?: string;
  /** Widest unit it takes (narrow things: booths, ATMs, lockers). */
  max?: number;
}

const LOCKER_BRAND: Brand = { ja: 'コインロッカー', en: 'Coin lockers', bg: '#2b4c7e', fg: '#ffffff', kind: 'goods' };

/** Shop queues by street character. Units take the next shop that fits; queues cycle (brand signs are reused). */
const QUEUES: Record<'old' | 'silk' | 'mid' | 'new', Shop[]> = {
  old: [
    { brand: DISTRICT.hataya, front: 'glazed', special: 'bolts' },
    { brand: SHOPS.udonKawanami, front: 'counter', noren: '#7a2a12' },
    { brand: DISTRICT.ayaginu, front: 'glazed', special: 'kimono' },
    { brand: SHOPS.tsumugian, front: 'counter' },
    { brand: SHOPS.hibariPharmacy, front: 'glazed' },
    { brand: SHOPS.sobaKita, front: 'counter', noren: '#2f3a2c' },
    { brand: SHOPS.ryubundo, front: 'glazed' },
    { brand: SHOPS.namima, front: 'counter', max: 3.4 },
    { brand: SHOPS.bakeryKomugi, front: 'glazed' },
    { brand: SHOPS.minatoya, front: 'counter', noren: '#8a2b18' },
    { brand: SHOPS.akaneCoffee, front: 'glazed' },
    { brand: SHOPS.yanagiFlowers, front: 'stall' },
    { brand: SHOPS.kawaminatodo, front: 'glazed' },
    { brand: SHOPS.maruhoshiKiosk, front: 'counter', max: 3.4 },
  ],
  // The south row along Hiraori-dōri: the silk quarter's own shops first.
  silk: [
    { brand: DISTRICT.yoriito, front: 'glazed', special: 'cones' },
    { brand: DISTRICT.someiro, front: 'counter', special: 'swatches' },
    { brand: DISTRICT.tsutsumiya, front: 'stall', special: 'furoshiki' },
    { brand: SHOPS.photoMinato, front: 'photo', max: 2.6 },
    { brand: DISTRICT.hataya, front: 'glazed', special: 'bolts' },
    { brand: SHOPS.sobaMio, front: 'counter', noren: '#1f2a44' },
    { brand: SHOPS.portMart, front: 'glazed' },
  ],
  mid: [
    { brand: SHOPS.nagiCafe, front: 'glazed' },
    { brand: SHOPS.kajitsudo, front: 'counter' },
    { brand: LOCKER_BRAND, front: 'lockers' },
    { brand: SHOPS.shinkin, front: 'atm', max: 3.4 },
  ],
  new: [
    { brand: SHOPS.maruhoshiMart, front: 'glazed' },
    { brand: SHOPS.hinataBakery, front: 'glazed' },
    { brand: SHOPS.sorano, front: 'glazed' },
    { brand: SHOPS.hanaNoMinato, front: 'stall' },
    { brand: DISTRICT.ayaginu, front: 'glazed', special: 'kimono' },
    { brand: SHOPS.nagiCafe, front: 'glazed' },
    { brand: LOCKER_BRAND, front: 'lockers' },
    { brand: SHOPS.tsubameya, front: 'glazed' },
    { brand: SHOPS.kajitsudo, front: 'counter', max: 3.4 },
    { brand: SHOPS.hibariPharmacy, front: 'glazed' },
    { brand: SHOPS.shinkin, front: 'atm', max: 3.4 },
    { brand: SHOPS.ryubundo, front: 'glazed' },
  ],
};

// ── Streets and blocks ───────────────────────────────────────────────────────────────────────

interface Street {
  ja: string;
  en: string;
  /** Floor border colour (and the plates' background). */
  color: string;
  fg: string;
  r: Rect;
  axis: 'x' | 'z';
  old: boolean;
}

type Side = 'n' | 's' | 'e' | 'w';
interface Block {
  r: Rect;
  era: Era;
  /** Street each face looks onto (shops on it), or absent (a blank wall). */
  faces: Partial<Record<Side, string>>;
  /** Which shop queue its faces draw from, per face (default by era). */
  queue?: Partial<Record<Side, keyof typeof QUEUES>>;
}

interface Layout {
  streets: Record<string, Street>;
  blocks: Block[];
  loom?: { x: number; z: number };
}

const DEPTH = 1.0; // shop depth inside a block's face
const PM = 0.6; // pillar footprint margin in free()

/** `r` minus the rectangles `holes`, as pieces. */
function minus(r: Rect, holes: Rect[]): Rect[] {
  let out: Rect[] = [r];
  for (const h of holes) {
    out = out.flatMap((q): Rect[] => {
      if (h[2] <= q[0] || h[0] >= q[2] || h[3] <= q[1] || h[1] >= q[3]) return [q];
      const pieces: Rect[] = [];
      if (h[0] > q[0]) pieces.push([q[0], q[1], h[0], q[3]]);
      if (h[2] < q[2]) pieces.push([h[2], q[1], q[2], q[3]]);
      const a = Math.max(q[0], h[0]), c = Math.min(q[2], h[2]);
      if (h[1] > q[1]) pieces.push([a, q[1], c, h[1]]);
      if (h[3] < q[3]) pieces.push([a, h[3], c, q[3]]);
      return pieces;
    });
  }
  return out.filter((q) => q[2] - q[0] > 0.01 && q[3] - q[1] > 0.01);
}

const overlaps = (a: Rect, b: Rect, m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;
const inside = (x: number, z: number, r: Rect, h = 0) => x - h >= r[0] - 1e-6 && x + h <= r[2] + 1e-6 && z - h >= r[1] - 1e-6 && z + h <= r[3] + 1e-6;

/**
 * Footprints of the signs hung before the look runs (the kit's and the wayfinding signs), so
 * blocks are not built round them. The builder keeps them privately; read defensively.
 */
function signRects(i: ConcInfo): Rect[] {
  const kept = (i.b as unknown as { kept?: { min: number[]; max: number[] }[] }).kept ?? [];
  return kept
    .filter((k) => k.max[1] > i.cf + 0.5 && k.min[1] < i.cf + i.clear && k.max[0] > i.x0 && k.min[0] < i.x1 && k.max[2] > -i.cw - 0.1 && k.min[2] < i.cw + 0.1)
    .map((k): Rect => [k.min[0], k.min[2], k.max[0], k.max[2]]);
}

const area = (r: Rect) => (r[2] - r[0]) * (r[3] - r[1]);
const big = (r: Rect) => r[2] - r[0] >= 2.5 && r[3] - r[1] >= 2.5;

/** `r` with `h` taken out: the pieces either side of it across x, or across z. */
function split(r: Rect, h: Rect, acrossX: boolean): Rect[] {
  const out: Rect[] = acrossX
    ? [[r[0], r[1], Math.max(r[0], h[0]), r[3]], [Math.min(r[2], h[2]), r[1], r[2], r[3]]]
    : [[r[0], r[1], r[2], Math.max(r[1], h[1])], [r[0], Math.min(r[3], h[3]), r[2], r[3]]];
  return out.filter(big);
}

/**
 * Pieces of `r` clear of every obstacle. Each obstacle either cuts a lane right through (a
 * sign hung across a row of shops) or shaves an edge, whichever keeps more floor under shops.
 */
function carve(r: Rect, obs: Rect[]): Rect[] {
  const k = obs.findIndex((o) => overlaps(r, o));
  if (k < 0) return big(r) ? [r] : [];
  const rest = obs.slice(k + 1);
  const ways = [true, false].map((ax) => split(r, obs[k], ax).flatMap((p) => carve(p, rest)));
  const total = (ps: Rect[]) => ps.reduce((s, p) => s + area(p), 0);
  return total(ways[0]) >= total(ways[1]) ? ways[0] : ways[1];
}

/** The largest version of `r` (each side pulled in by up to 3 m) that sits on free floor. */
function fit(i: ConcInfo, r: Rect, signs: Rect[]): Rect | null {
  const ok = (q: Rect) => {
    if (!big(q)) return false;
    if (signs.some((s) => overlaps(q, s, 0.3))) return false;
    // Pillars may stand inside a block: test the floor round them.
    const ps = i.pillars.filter(([x, z]) => inside(x, z, q, 0.35)).map(([x, z]): Rect => [x - PM, z - PM, x + PM, z + PM]);
    return minus(q, ps).every((p) => i.free(p[0], p[1], p[2], p[3]));
  };
  const steps = [0, 0.5, 1, 1.5, 2, 3];
  const combos: [number, number, number, number][] = [];
  for (const a of steps) for (const b of steps) for (const c of steps) for (const d of steps) combos.push([a, b, c, d]);
  combos.sort((p, q) => p[0] + p[1] + p[2] + p[3] - (q[0] + q[1] + q[2] + q[3]));
  for (const [a, b, c, d] of combos) {
    const q: Rect = [r[0] + a, r[1] + b, r[2] - c, r[3] - d];
    if (ok(q)) return q;
  }
  return null;
}

/** Lane names for the gaps a row of blocks leaves, west to east. */
const LANES: Record<'s' | 'n', [string, string, string][]> = {
  s: [['糸屋横丁', 'Itoya-yokochō', '#d9b13a'], ['筬小路', 'Osa-kōji', '#c75b7a'], ['綜絖小路', 'Sōkō-kōji', '#8a5a3c'], ['管小路', 'Kuda-kōji', '#2f8f83'], ['撚糸小路', 'Nenshi-kōji', '#9a6fb0']],
  n: [['紬小路', 'Tsumugi-kōji', '#4fa3c7'], ['絣小路', 'Kasuri-kōji', '#9a6fb0'], ['真綿小路', 'Mawata-kōji', '#8a5a3c']],
};

const LAYOUTS = new WeakMap<ConcInfo, Layout>();

/**
 * The street plan, from the stairs, the pillar grid and the signs already hung. Blocks fill the
 * bands between stair openings and run from the two long side streets to the walls (pillars
 * inside them); the streets line up with the gate lines, the stair heads and the transfer
 * stairs, and the side streets run under the rows of hanging signs so those stay readable.
 * Wherever a sign or a wall board would end up over or behind a block, a lane is cut there.
 */
function layout(i: ConcInfo): Layout {
  const done = LAYOUTS.get(i);
  if (done) return done;
  const out: Layout = { streets: {}, blocks: [] };
  LAYOUTS.set(i, out);

  const prim = i.stairs.filter((s) => s.kind === 'platform' && s.line.id === i.line.id);
  const side = i.stairs.filter((s) => s.kind === 'platform' && s.line.id !== i.line.id);
  const tN = i.stairs.find((s) => s.kind === 'transfer' && s.rect[1] > 0);
  const tS = i.stairs.find((s) => s.kind === 'transfer' && s.rect[3] < 0);
  const rows = [...new Set(i.pillars.map((p) => p[1]))].sort((a, b) => a - b);
  const cols = [...new Set(i.pillars.map((p) => p[0]))].sort((a, b) => a - b);
  if (!prim.length || !side.length || !tN || !tS || rows.length < 6 || cols.length < 5) return out;

  const near = (a: number[], v: number) => a.reduce((p, q) => (Math.abs(q - v) < Math.abs(p - v) ? q : p));
  const HX = 3, HZ = 0.9; // margins free() keeps round stair openings
  const P0 = i.paid[0] + 3.6, P1 = i.paid[1] - 3.6; // paid floor clear of the gate lines
  const nN = Math.max(...prim.map((s) => s.rect[3])), nS = Math.min(...prim.map((s) => s.rect[1]));
  const inner = Math.min(...prim.map((s) => Math.min(Math.abs(s.rect[0]), Math.abs(s.rect[2]))));
  const outer = Math.max(...prim.map((s) => Math.max(Math.abs(s.rect[0]), Math.abs(s.rect[2]))));
  const kLo = Math.min(...side.map((s) => s.rect[1])), kHi = Math.max(...side.map((s) => s.rect[3]));
  const rowN = rows.find((z) => z > kHi + HZ) ?? i.cw; // first pillar row north of the Kikyō stairs
  const rowK = rows.find((z) => z > kLo && z < kHi + HZ) ?? kHi; // pillar row level with the Kikyō stairs
  const rowM = rows.find((z) => z > nN + HZ && z < kLo) ?? kLo - 2; // between the Nagisa and Kikyō stairs
  const rowS1 = [...rows].reverse().find((z) => z < tS.rect[1] - HZ) ?? -i.cw;
  const rowS2 = [...rows].reverse().find((z) => z < rowS1 - 1) ?? -i.cw;
  const rowC = Math.min(...rows.filter((z) => z > 0)); // rows either side of the spine
  const cW = near(cols, -(outer + HX)); // pillar column at the west stair heads
  const cC = near(cols, 0);
  const pitch = Math.min(...cols.slice(1).map((c, k) => c - cols[k]).filter((d) => d > 1));
  const cSW = near(cols, cC - pitch); // column just west of the centre
  const yLaneW = -(HX + 1.0), yLaneE = HX - 0.4; // Yokoito-kōji, the central cross street

  // The two long side streets run under the rows of hanging signs that face along the hall
  // (so they can be read from down the street); without such signs, beside the pillar rows.
  const signs = signRects(i);
  const nearStair = (s: Rect) => i.stairs.some((st) => Math.hypot(st.top[0] - (s[0] + s[2]) / 2, st.top[1] - (s[1] + s[3]) / 2) < 4);
  const facingX = signs.filter((s) => s[2] - s[0] < s[3] - s[1] && s[0] > P0 - 1 && s[2] < P1 + 1 && Math.abs(s[1]) < i.cw - 1 && Math.abs(s[3]) < i.cw - 1 && !nearStair(s));
  const southSigns = facingX.filter((s) => (s[1] + s[3]) / 2 < tS.rect[1] - HZ - 1);
  const northSigns = facingX.filter((s) => (s[1] + s[3]) / 2 > kHi + HZ + 1);
  const hiraori: Span = southSigns.length
    ? [Math.max(-i.cw + 3.5, Math.min(...southSigns.map((s) => s[1])) - 0.3), Math.min(tS.rect[1] - HZ - 2.6, Math.max(...southSigns.map((s) => s[3])) + 0.3)]
    : [rowS2 + 2.6, rowS1 - 0.4];
  const ayaori: Span = [kHi + HZ + 0.1, northSigns.length ? Math.min(i.cw - 3.5, Math.max(rowN - 0.55, ...northSigns.map((s) => s[3] + 0.3))) : rowN - 0.55];
  const sRow: Span = [-i.cw, hiraori[0]];
  const nRow: Span = [ayaori[1], i.cw];
  const sqW = cSW - PM; // west edge of the Shuttle Crossing
  const S = (ja: string, en: string, color: string, r: Rect, axis: 'x' | 'z', old: boolean, fg = '#ffffff'): Street => ({ ja, en, color, fg, r, axis, old });
  out.streets = {
    // Long streets (warp), along x.
    tateito: S('経糸通り', 'Tateito-dōri', BLUE, [P0, -rowC + 0.35, P1, rowC - 0.35], 'x', false),
    ayaori: S('綾織通り', 'Ayaori-dōri', INDIGO, [P0, ayaori[0], P1, ayaori[1]], 'x', false),
    hiraori: S('平織通り', 'Hiraori-dōri', MADDER, [P0, hiraori[0], P1, hiraori[1]], 'x', true),
    hinotsuji: S('杼の辻', 'Hi-no-tsuji', '#4a3324', [sqW, hiraori[1], yLaneE, nS - HZ], 'x', true),
    // Cross streets (weft), along z.
    yokoito: S('緯糸小路', 'Yokoito-kōji', '#5f8a3a', [yLaneW, nS - HZ, yLaneE, ayaori[0]], 'z', false),
    kase: S('綛通り', 'Kase-dōri', '#7b4f9e', [P0, hiraori[1], cW - PM, ayaori[0]], 'z', false),
    itomaki: S('糸巻通り', 'Itomaki-dōri', '#e07b39', [outer + HX, hiraori[1], P1, ayaori[0]], 'z', false),
  };

  type Plan = Block & { row?: 's' | 'n' };
  const plan: Plan[] = [
    // Between the Nagisa and Kikyō stairs, both sides of the central street.
    { r: [inner - HX + 0.6, nN + HZ + 0.2, outer - 0.6, kLo - HZ - 0.2], era: 'mid', faces: { w: 'yokoito', e: 'itomaki' } },
    { r: [-(outer - 0.6), nN + HZ + 0.2, -(inner - HX + 0.6), kLo - HZ - 0.2], era: 'mid', faces: { w: 'kase', e: 'yokoito' } },
    // Kiosk blocks at the far side of each gate street, level with the Kikyō stairs and opposite.
    { r: [P0 + 1.0, rowM + 2.8, P0 + 3.8, rowK - 0.8], era: 'mid', faces: { e: 'kase' } },
    { r: [P1 - 2.6, rowM + 2.8, P1, rowK - 0.8], era: 'mid', faces: { w: 'itomaki' } },
    { r: [P0 + 1.0, -(rowK - 0.8), P0 + 3.8, -(rowM + 2.8)], era: 'old', faces: { e: 'kase' } },
    { r: [P1 - 2.6, -(rowK - 0.8), P1, -(rowM + 2.8)], era: 'old', faces: { w: 'itomaki' } },
    // South-west of the Nagisa stairs, and between the south transfer stair and Hiraori-dōri.
    { r: [cW - PM, hiraori[1], sqW, nS - HZ - 0.05], era: 'old', faces: { w: 'kase', s: 'hiraori', e: 'hinotsuji' } },
    { r: [yLaneE, hiraori[1], tS.rect[2] - 1.0, tS.rect[1] - HZ - 0.07], era: 'old', faces: { w: 'hinotsuji', s: 'hiraori', e: '' } },
    // The south row, from Hiraori-dōri to the wall: the silk quarter's own shops.
    { r: [P0, sRow[0], P1, sRow[1]], era: 'old', faces: { n: 'hiraori' }, queue: { n: 'silk' }, row: 's' },
    // The north row, from Ayaori-dōri to the wall (Kikyō side).
    { r: [P0, nRow[0], P1, nRow[1]], era: 'new', faces: { s: 'ayaori' }, row: 'n' },
  ];
  // Keep clear: under every sign (a lane at least 3 m wide), and the way round the pillar at the
  // north transfer stair's head (4 m).
  const obs: Rect[] = signs.map((s): Rect => {
    // Boards on a long wall: room to stand and read them.
    if (s[1] <= -i.cw + 0.5) return [s[0] - 0.5, s[1], s[2] + 0.5, -i.cw + 3.5];
    if (s[3] >= i.cw - 0.5) return [s[0] - 0.5, i.cw - 3.5, s[2] + 0.5, s[3]];
    const thin = s[2] - s[0] < s[3] - s[1];
    return thin ? [s[0] - 0.95, s[1] - 0.3, s[2] + 0.95, s[3] + 0.3] : [s[0] - 0.3, s[1] - 0.95, s[2] + 0.3, s[3] + 0.95];
  });
  const cT = near(cols, tN.rect[2] + HX);
  obs.push([tN.rect[0] - HX, ayaori[0], Math.max(tN.rect[2] + HX, cT + 0.35 + 4.05), tN.rect[3] + HZ]);
  const rowBlocks: Record<'s' | 'n', Block[]> = { s: [], n: [] };
  const mids = cols.slice(1).map((c, k) => (c + cols[k]) / 2);
  // A row longer than 18 m gets a lane at the pillar-column midpoint nearest its middle.
  const splitLong = (r: Rect): Rect[] => {
    if (r[2] - r[0] <= 18) return [r];
    const m = near(mids, (r[0] + r[2]) / 2);
    return [[r[0], r[1], m - 1.6, r[3]] as Rect, [m + 1.6, r[1], r[2], r[3]] as Rect].filter(big).flatMap(splitLong);
  };
  for (const p of plan) {
    const pieces = carve(p.r, obs);
    for (const piece of p.row ? pieces.flatMap(splitLong) : pieces) {
      const r = fit(i, piece, signs);
      if (!r) continue;
      // A face cut by a lane is named after the lane (below); the plan's own faces keep theirs.
      const faces: Partial<Record<Side, string>> = {};
      const cutFace = { w: piece[0] > p.r[0] + 1e-6, s: piece[1] > p.r[1] + 1e-6, e: piece[2] < p.r[2] - 1e-6, n: piece[3] < p.r[3] - 1e-6 };
      for (const sd of ['n', 's', 'e', 'w'] as Side[]) {
        if (cutFace[sd]) faces[sd] = '';
        else if (p.faces[sd] !== undefined) faces[sd] = p.faces[sd];
      }
      const bk: Block = { r, era: p.era, faces, queue: p.queue };
      out.blocks.push(bk);
      if (p.row) rowBlocks[p.row].push(bk);
    }
  }
  // Lanes: the gaps along each row.
  for (const row of ['s', 'n'] as const) {
    const bs = rowBlocks[row].sort((a, c) => a.r[0] - c.r[0]);
    const [z0, z1] = row === 's' ? sRow : nRow;
    let k = 0;
    for (let j = 0; j <= bs.length; j++) {
      const a = j ? bs[j - 1].r[2] : P0, c = j < bs.length ? bs[j].r[0] : P1;
      // A wide gap is not a lane (the north transfer stair's surroundings).
      if (c - a < 1.5 || c - a > 6) continue;
      const end = j === 0 || j === bs.length;
      const name = end ? (j === 0 ? out.streets.kase : out.streets.itomaki) : null;
      const [ja, en, col] = name ? [name.ja, name.en, name.color] : LANES[row][k++ % LANES[row].length];
      out.streets[`${row}${j}`] = S(ja, en, col, [a, z0, c, z1], 'z', row === 's');
    }
  }

  // The loom at the Shuttle Crossing, where the central street meets Hiraori-dōri.
  const lx = (sqW + tS.rect[0] - HX) / 2, lz = (nS - HZ + hiraori[1]) / 2;
  const lr: Rect = [lx - 1.85, lz - 1.6, lx + 1.85, lz + 1.6];
  if (i.free(...lr) && !signs.some((s) => overlaps(lr, s)) && !out.blocks.some((bk) => overlaps(lr, bk.r))) out.loom = { x: lx, z: lz };
  return out;
}

/** The street a block face looks onto (for a cut face), if any. */
function streetAt(L: Layout, f: Face): Street | undefined {
  const [x, z] = fpt(f, (f.a + f.c) / 2, -1.0);
  const hit = Object.values(L.streets).filter((s) => inside(x, z, s.r));
  return hit.find((s) => s.axis === f.axis) ?? hit[0];
}

// ── Face geometry (a block's face; depth d measured inward from the face, negative = proud) ──

interface Face {
  axis: 'x' | 'z';
  at: number;
  /** +1 if the face looks towards +axis-normal (n, e), −1 (s, w). */
  sg: 1 | -1;
  a: number;
  c: number;
  n: [number, number];
}

function faceOf(r: Rect, side: Side): Face {
  if (side === 'n') return { axis: 'x', at: r[3], sg: 1, a: r[0], c: r[2], n: [0, 1] };
  if (side === 's') return { axis: 'x', at: r[1], sg: -1, a: r[0], c: r[2], n: [0, -1] };
  if (side === 'e') return { axis: 'z', at: r[2], sg: 1, a: r[1], c: r[3], n: [1, 0] };
  return { axis: 'z', at: r[0], sg: -1, a: r[1], c: r[3], n: [-1, 0] };
}

function fb(b: Builder, f: Face, mat: string, u0: number, u1: number, y0: number, y1: number, d0: number, d1: number) {
  const p = f.at - f.sg * d0, q = f.at - f.sg * d1;
  const lo = Math.min(p, q), hi = Math.max(p, q);
  if (f.axis === 'x') b.deco(mat, u0, y0, lo, u1, y1, hi);
  else b.deco(mat, lo, y0, u0, hi, y1, u1);
}
const fpt = (f: Face, u: number, d: number): [number, number] => (f.axis === 'x' ? [u, f.at - f.sg * d] : [f.at - f.sg * d, u]);
function fmesh(b: Builder, f: Face, mat: string, shape: 'cyl' | 'cone' | 'sphere', u: number, y: number, d: number, su: number, sy: number, sd: number) {
  const [x, z] = fpt(f, u, d);
  b.mesh(mat, shape, x, y, z, f.axis === 'x' ? su : sd, sy, f.axis === 'x' ? sd : su);
}
function fsign(b: Builder, f: Face, content: Parameters<Builder['sign']>[0], u: number, y: number, d: number, w: number, h: number) {
  const [x, z] = fpt(f, u, d);
  b.sign(content, x, y, z, f.n, w, h);
}

/** Shelves of goods against the back of a shop. */
function shelves(b: Builder, f: Face, u0: number, u1: number, ys: number[], d0: number, d1: number, cols: string[], h = 0.3) {
  const n = Math.max(1, Math.min(2, Math.round((u1 - u0) / 1.5))), w = (u1 - u0) / n;
  ys.forEach((y, r) => {
    fb(b, f, 'flat:#d9d4c7', u0, u1, y - 0.025, y, d0, d1);
    for (let k = 0; k < n; k++) fb(b, f, `flat:${cols[(k + r * 2) % cols.length]}`, u0 + k * w + 0.06, u0 + (k + 1) * w - 0.06, y, y + h, d0 + 0.03, d1 - 0.02);
  });
}

const signW = (w: number) => Math.max(1, Math.min(3.5, Math.floor((w - 0.5) * 2) / 2));

/** One shop unit in a block's face, u0 … u1 (inside the pilasters). */
function unit(i: ConcInfo, f: Face, u0: number, u1: number, s: Shop, era: Era) {
  const { b, cf } = i, fy = cf + FASCIA, D = DEPTH, st = STYLE[era];
  const um = (u0 + u1) / 2, w = u1 - u0;
  const goods = PALETTES[s.brand.kind];
  // Sign on the fascia, and (old side) a warm light inside.
  if (s.front === 'lockers') {
    fsign(b, f, { k: 'label', text: s.brand.ja, sub: s.brand.en, fg: s.brand.fg, bg: s.brand.bg }, um, fy + 0.32, -0.016, 1.8, 0.34);
  } else {
    fsign(b, f, { k: 'shop', ja: s.brand.ja, en: s.brand.en, bg: s.brand.bg, fg: s.brand.fg }, um, fy + 0.33, -0.016, signW(w), 0.48);
    if (era === 'old') fb(b, f, 'glow:#fff1d6', u0 + 0.1, u1 - 0.1, fy - 0.05, fy, 0.25, 0.4);
  }

  if (s.front === 'glazed') {
    const door = u1 - 0.75;
    for (const [p, q] of cut([u0, u1], [[door - 0.5, door + 0.5]])) {
      fb(b, f, 'flat:#3a3d41', p, q, cf, cf + 0.3, 0, 0.06);
      fb(b, f, 'glass', p, q, cf + 0.3, fy, 0.012, 0.024);
    }
    fb(b, f, st.pilaster, door - 0.5, door + 0.5, cf + 2.1, fy, 0, 0.05);
    fb(b, f, 'glassTint', door - 0.47, door + 0.47, cf, cf + 2.1, 0.015, 0.027);
    if (!s.special && door - 0.75 > u0 + 0.6) shelves(b, f, u0 + 0.15, door - 0.6, [cf + 1.0], D - 0.45, D - 0.01, goods, 0.7);
  } else if (s.front === 'counter') {
    fb(b, f, st.counter, u0, u1, cf, cf + 0.95, 0, 0.5);
    fb(b, f, 'wood:#9a7650', u0, u1, cf + 0.95, cf + 1.0, -0.05, 0.55);
    if (!s.special) shelves(b, f, u0 + 0.15, u1 - 0.15, [cf + 1.2, cf + 1.7], D - 0.35, D - 0.01, goods, 0.28);
    if (s.noren) {
      // Noren inside the front, under the fascia.
      const n = Math.max(3, Math.round(w / 0.7)), sw = w / n;
      fb(b, f, 'wood:#5a4636', u0, u1, fy - 0.04, fy, 0.02, 0.05);
      for (let k = 0; k < n; k++) fb(b, f, `flat:${s.noren}`, u0 + k * sw + 0.015, u0 + (k + 1) * sw - 0.015, fy - 0.55, fy - 0.04, 0.03, 0.045);
    }
  } else if (s.front === 'stall') {
    fb(b, f, 'flat:#6b5a48', u0, u1, cf, cf + 0.5, 0, 0.7);
    fb(b, f, 'flat:#6b5a48', u0, u1, cf + 0.5, cf + 0.85, 0.35, 0.7);
    if (s.brand.kind === 'flowers') {
      const n = Math.min(7, Math.floor((w - 0.3) / 0.45));
      for (let k = 0; k < n; k++) fmesh(b, f, `flat:${PALETTES.flowers[k % PALETTES.flowers.length]}`, 'sphere', u0 + 0.35 + k * 0.45, cf + 0.68, 0.18, 0.36, 0.3, 0.36);
    } else if (!s.special) shelves(b, f, u0 + 0.1, u1 - 0.1, [cf + 0.5], 0.03, 0.33, goods, 0.22);
    shelves(b, f, u0 + 0.1, u1 - 0.1, [cf + 1.3], D - 0.3, D - 0.01, goods, 0.3);
  } else if (s.front === 'lockers') {
    const n = Math.max(1, Math.floor((w - 0.1) / 1.6)), x0 = um - (n * 1.6) / 2;
    fb(b, f, st.body, u0, u1, cf, fy, 0.6, 0.62);
    fb(b, f, 'flat:#e9e4d8', x0, x0 + n * 1.6, cf, cf + 1.9, 0.02, 0.6);
    for (let k = 0; k < n; k++) fsign(b, f, { k: 'machine', v: 'locker' }, x0 + 0.8 + k * 1.6, cf + 0.95, 0.01, 1.58, 1.88);
  } else if (s.front === 'atm') {
    const n = Math.max(1, Math.min(3, Math.floor((w - 0.3) / 0.9)));
    fb(b, f, 'flat:#e7e2d6', u0, u1, cf, fy, D - 0.02, D);
    for (let k = 0; k < n; k++) {
      const p = um - (n * 0.9) / 2 + k * 0.9 + 0.05, q = p + 0.8;
      fb(b, f, 'paint:#c9ccd0', p, q, cf, cf + 1.0, 0.1, 0.8);
      fb(b, f, 'paint:#c9ccd0', p, q, cf + 1.0, cf + 1.65, 0.38, 0.8);
      fb(b, f, 'glow:#bfe4ff', p + 0.12, q - 0.12, cf + 1.1, cf + 1.45, 0.37, 0.38);
    }
  } else {
    // Photo booth in the middle of the unit.
    fb(b, f, 'paint:#e3e6ea', um - 0.5, um + 0.5, cf, cf + 2.05, 0.02, D);
    fb(b, f, 'flat:#2d4f8e', um - 0.4, um + 0.4, cf + 0.35, cf + 1.75, -0.01, 0.02);
  }

  // The silk quarter's own shops.
  if (s.special === 'bolts') {
    // Bolts of tsumugi standing in a rack, and two laid on a table in the window.
    const n = Math.max(1, Math.min(10, Math.floor((w - 1.8) / 0.3)));
    fb(b, f, TIMBER, u0 + 0.2, u0 + 0.4 + n * 0.3, cf, cf + 0.12, D - 0.4, D - 0.02);
    for (let k = 0; k < n; k++) {
      const h = 1.2 + 0.25 * hash(k, w);
      fmesh(b, f, `flat:${CLOTH[k % CLOTH.length]}`, 'cyl', u0 + 0.45 + k * 0.3, cf + 0.12 + h / 2, D - 0.2, 0.24, h, 0.24);
    }
    fb(b, f, TIMBER, u0 + 0.4, u0 + 1.8, cf, cf + 0.7, 0.3, 0.75);
    fb(b, f, `flat:${INDIGO}`, u0 + 0.5, u0 + 1.1, cf + 0.7, cf + 0.8, 0.38, 0.68);
    fb(b, f, `flat:${MADDER}`, u0 + 1.15, u0 + 1.7, cf + 0.7, cf + 0.78, 0.38, 0.68);
  } else if (s.special === 'cones') {
    // Cones of thread on two shelves, skeins hanging below.
    const n = Math.max(1, Math.min(8, Math.floor((w - 1.6) / 0.36)));
    const cols = [BLUE, MADDER, CREAM, INDIGO, '#c9962e', '#6b8f3a', '#c75b7a'];
    for (const [r, y] of [cf + 1.0, cf + 1.6].entries()) {
      fb(b, f, 'wood:#9a7650', u0 + 0.2, u0 + 0.4 + n * 0.36, y - 0.03, y, D - 0.35, D - 0.01);
      for (let k = 0; k < n; k++) fmesh(b, f, `flat:${cols[(k + r * 3) % cols.length]}`, 'cone', u0 + 0.4 + k * 0.36, y + 0.12, D - 0.18, 0.15, 0.24, 0.15);
    }
    for (let k = 0; k < Math.min(5, n); k++) fb(b, f, `flat:${cols[(k + 5) % cols.length]}`, u0 + 0.35 + k * 0.5, u0 + 0.6 + k * 0.5, cf + 0.35, cf + 0.75, D - 0.08, D - 0.02);
  } else if (s.special === 'kimono') {
    // Kimono on T-stands in the window.
    const n = w >= 4 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const u = u0 + ((k + 1) * (w - 1.2)) / (n + 1);
      const robe = k ? `flat:${INDIGO}` : 'flat:#7a1f2b';
      fb(b, f, robe, u - 0.3, u + 0.3, cf + 0.45, cf + 1.8, D - 0.52, D - 0.44);
      fb(b, f, robe, u - 0.66, u + 0.66, cf + 1.32, cf + 1.8, D - 0.51, D - 0.45);
      fb(b, f, k ? 'flat:#c9962e' : `flat:${CREAM}`, u - 0.31, u + 0.31, cf + 1.02, cf + 1.22, D - 0.53, D - 0.43);
      fb(b, f, 'metal:#9da2a8', u - 0.25, u + 0.25, cf, cf + 0.45, D - 0.5, D - 0.46);
    }
  } else if (s.special === 'furoshiki') {
    // Folded cloths on the stand, three open on the back wall.
    const n = Math.min(6, Math.floor((w - 0.4) / 0.5));
    for (let k = 0; k < n; k++) {
      const c = CLOTH[k % CLOTH.length];
      fb(b, f, `flat:${c}`, u0 + 0.25 + k * 0.5, u0 + 0.6 + k * 0.5, cf + 0.5, cf + 0.56, 0.05, 0.32);
    }
    for (let k = 0; k < 3; k++) {
      const u = u0 + ((k + 1) * w) / 4;
      fb(b, f, `flat:${[MADDER, BLUE, '#c9962e'][k]}`, u - 0.27, u + 0.27, cf + 1.7, cf + 2.24, D - 0.02, D - 0.01);
    }
  } else if (s.special === 'swatches') {
    // A wall of dyed swatches behind the counter: indigo vat shades over madder and kariyasu.
    const n = Math.min(6, Math.floor((w - 0.6) / 0.3));
    const rowsC = [['#0f1f3d', '#1b3560', '#2b4f86', '#3f6fa8', '#6f98c4', '#a9c4de'], ['#6e1f14', '#8f2d1d', MADDER, '#d06a3c', '#d9a63a', '#e8cf7a']];
    rowsC.forEach((rc, r) => {
      for (let k = 0; k < n; k++) {
        const u = um - (n * 0.3) / 2 + k * 0.3;
        fb(b, f, `flat:${rc[k]}`, u + 0.03, u + 0.27, cf + 1.25 + r * 0.55, cf + 1.7 + r * 0.55, D - 0.02, D - 0.008);
      }
    });
    for (let k = 0; k < 4; k++) fmesh(b, f, 'glass', 'cyl', u0 + 0.5 + k * ((w - 1) / 3), cf + 1.08, 0.25, 0.14, 0.16, 0.14);
  }
}

/** Advance a queue to the next shop that fits a unit `w` long. */
function nextShop(q: Shop[], at: { k: number }, w: number): Shop {
  for (let t = 0; t < q.length; t++) {
    const s = q[(at.k + t) % q.length];
    if ((s.max ?? 99) >= w && (s.front !== 'lockers' || w >= 1.7)) {
      at.k += t + 1;
      return s;
    }
  }
  return q[at.k++ % q.length];
}

/** A blank face: tiled dado with a woven stripe, and posters. */
function blankFace(i: ConcInfo, f: Face, era: Era, v: { k: number }) {
  const { b, cf } = i, st = STYLE[era];
  fb(b, f, 'flat:#4b4d50', f.a, f.c, cf, cf + 0.13, -0.018, 0);
  fb(b, f, st.dado, f.a, f.c, cf + 0.13, cf + 1.2, -0.008, 0);
  fb(b, f, `flat:${BLUE}`, f.a, f.c, cf + 1.2, cf + 1.25, -0.012, 0);
  const n = Math.floor((f.c - f.a - 0.6) / 3);
  for (let k = 0; k < n; k++) {
    const u = f.a + (f.c - f.a) / 2 + (k - (n - 1) / 2) * 3;
    fb(b, f, 'flat:#c9c9c4', u - 0.6, u + 0.6, cf + 0.85, cf + 2.2, -0.022, 0);
    fsign(b, f, { k: 'poster', v: v.k++ % 8 }, u, cf + 1.52, -0.03, 1.1, 1.25);
  }
}

/** One block: solid, to the ceiling, a ring of shop units on every face that has a street. */
function block(i: ConcInfo, L: Layout, bk: Block, ptr: Record<string, { k: number }>, v: { k: number }) {
  const { b, cf } = i, top = cf + i.clear, fy = cf + FASCIA, D = DEPTH, st = STYLE[bk.era];
  const r = bk.r;
  i.claim(...r);
  b.block(r[0], cf, r[1], r[2], top, r[3]);
  const atWall = (sd: Side) => (sd === 'n' && r[3] >= i.cw - 0.01) || (sd === 's' && r[1] <= -i.cw + 0.01);
  const shopSide = (sd: Side) => bk.faces[sd] !== undefined && !atWall(sd);
  // The core, set back behind the shops.
  const core: Rect = [r[0] + (shopSide('w') ? D : 0), r[1] + (shopSide('s') ? D : 0), r[2] - (shopSide('e') ? D : 0), r[3] - (shopSide('n') ? D : 0)];
  b.deco(st.body, core[0], cf, core[1], core[2], top, core[3]);

  for (const sd of ['n', 's', 'e', 'w'] as Side[]) {
    if (atWall(sd)) continue;
    const f = faceOf(r, sd);
    if (!shopSide(sd)) {
      blankFace(i, f, bk.era, v);
      continue;
    }
    const key = bk.faces[sd]!;
    const street = key ? L.streets[key] : streetAt(L, f);
    const len = f.c - f.a;
    const cr = len >= 5 ? 1.0 : 0.5;
    // Fascia the whole length, corner piers, a pier over each pillar inside the shop ring.
    fb(b, f, st.fascia, f.a, f.c, fy, top, 0, D);
    fb(b, f, st.body, f.a, f.a + cr, cf, fy, 0, D);
    fb(b, f, st.body, f.c - cr, f.c, cf, fy, 0, D);
    const piers: Span[] = i.pillars
      .filter(([x, z]) => inside(x, z, r, 0.35))
      .filter(([x, z]) => Math.abs((f.axis === 'x' ? z : x) - f.at) < D + 0.36)
      .map(([x, z]): Span => {
        const u = f.axis === 'x' ? x : z;
        return [u - 0.45, u + 0.45];
      });
    for (const [p, q] of piers) fb(b, f, st.body, p, q, cf, fy, 0, D);
    // Street name plates at the corners.
    if (street) {
      const plate = { k: 'label' as const, text: street.ja, sub: street.en, fg: street.fg, bg: street.color };
      const ends = len >= 6 ? [f.a + cr / 2 + 0.05, f.c - cr / 2 - 0.05] : [f.c - cr / 2];
      for (const u of ends) fsign(b, f, plate, u, fy + 0.3, -0.016, Math.min(0.95, cr * 0.95), 0.3);
    }
    // Units between the piers.
    const qk = bk.queue?.[sd] ?? bk.era;
    const q = QUEUES[qk];
    ptr[qk] ??= { k: 0 };
    for (const [p, c] of cut([f.a + cr, f.c - cr], piers)) {
      const seg = c - p;
      if (seg < 1.6) {
        fb(b, f, st.body, p, c, cf, fy, 0, D);
        continue;
      }
      const n = Math.max(1, Math.round(seg / (bk.era === 'old' ? 5 : 6)));
      const w = seg / n;
      for (let k = 0; k < n; k++) {
        const u0 = p + k * w, u1 = u0 + w;
        // Pilasters between units (one per joint).
        fb(b, f, st.pilaster, u0, u0 + 0.12, cf, fy, 0, D);
        if (k === n - 1) fb(b, f, st.pilaster, u1 - 0.12, u1, cf, fy, 0, D);
        unit(i, f, u0 + 0.12, u1 - (k === n - 1 ? 0.12 : 0), nextShop(q, ptr[qk], w), bk.era);
      }
    }
  }
}

// ── Ceiling and floor ────────────────────────────────────────────────────────────────────────

/** Pieces of a run along `axis` at cross position `at`, from p to q, clear of pillars. */
function clearRun(i: ConcInfo, axis: 'x' | 'z', at: number, p: number, q: number, half: number): Span[] {
  const solid = layout(i).blocks
    .map((bk) => bk.r)
    .filter((r) => (axis === 'x' ? at + half > r[1] && at - half < r[3] : at + half > r[0] && at - half < r[2]))
    .map((r): Span => (axis === 'x' ? [r[0] - 0.05, r[2] + 0.05] : [r[1] - 0.05, r[3] + 0.05]));
  const gaps = i.pillars
    .filter(([x, z]) => Math.abs((axis === 'x' ? z : x) - at) < 0.36 + half)
    .map(([x, z]): Span => {
      const u = axis === 'x' ? x : z;
      return [u - 0.42, u + 0.42];
    });
  return cut([p, q], [...gaps, ...solid]);
}

/** A thin strip along `axis` at `at`, from p to q, y0 … y1, `w` wide, broken round pillars. */
function strip(i: ConcInfo, mat: string, axis: 'x' | 'z', at: number, p: number, q: number, y0: number, y1: number, w: number, gaps: Span[] = []) {
  for (const [a, c] of clearRun(i, axis, at, p, q, w / 2)) {
    for (const [s, e] of cut([a, c], gaps)) {
      if (axis === 'x') i.b.deco(mat, s, y0, at - w / 2, e, y1, at + w / 2);
      else i.b.deco(mat, at - w / 2, y0, s, at + w / 2, y1, e);
    }
  }
}

/** The parts of a z-street's length that x-streets do not already cover. */
function crossGaps(L: Layout, s: Street): Span[] {
  if (s.axis === 'x') return [];
  return Object.values(L.streets)
    .filter((o) => o.axis === 'x' && overlaps(o.r, s.r, -0.01))
    .map((o): Span => [o.r[1], o.r[3]]);
}

/** Warp bands along a street and weft bands across it, over and under, plus old-side beams and pipes. */
function weaveCeiling(i: ConcInfo, L: Layout, s: Street) {
  const top = i.cf + i.clear;
  const ax = s.axis, [u0, u1] = ax === 'x' ? [s.r[0], s.r[2]] : [s.r[1], s.r[3]];
  const [v0, v1] = ax === 'x' ? [s.r[1], s.r[3]] : [s.r[0], s.r[2]];
  const W = v1 - v0, len = u1 - u0;
  const gaps = crossGaps(L, s);
  const nw = W >= 5 ? 4 : W >= 3.5 ? 3 : 2;
  for (let k = 0; k < nw; k++) {
    const v = v0 + ((k + 1) * W) / (nw + 1);
    strip(i, `flat:${THREADS[k % 4]}`, ax, v, u0 + 0.2, u1 - 0.2, top - 0.2, top - 0.17, 0.1, gaps);
  }
  // Wefts every 6 m, alternately under and over the warps.
  const nf = Math.floor((len - 1) / 6);
  for (let k = 0; k <= nf; k++) {
    const u = u0 + (len - nf * 6) / 2 + k * 6;
    if (gaps.some(([a, c]) => u > a - 0.2 && u < c + 0.2)) continue;
    const y = k % 2 ? top - 0.15 : top - 0.26;
    strip(i, `flat:${k % 2 ? CREAM : s.color}`, ax === 'x' ? 'z' : 'x', u, v0 + 0.15, v1 - 0.15, y, y + 0.03, 0.14);
  }
  if (!s.old || ax !== 'x' || len < 20) return;
  // Old streets: downstand beams on the pillar grid and a pair of pipes along the street.
  const cols = [...new Set(i.pillars.map((p) => p[0]))].filter((x) => x > u0 + 1 && x < u1 - 1);
  for (const x of cols) i.b.deco('flat:#d6cdb8', x - 0.15, top - 0.4, v0, x + 0.15, top, v1);
  const pz = v1 - 0.9;
  for (const [k, mat] of ['paint:#8c949b', 'paint:#a33b2f'].entries()) strip(i, mat, 'x', pz + k * 0.14, u0 + 0.3, u1 - 0.3, top - 0.24, top - 0.14, 0.1);
}

/** A woven border on the floor along both long edges of a street, broken at crossings and openings. */
function floorBorder(i: ConcInfo, L: Layout, s: Street) {
  const { b, cf } = i;
  const ax = s.axis, [u0, u1] = ax === 'x' ? [s.r[0], s.r[2]] : [s.r[1], s.r[3]];
  const [v0, v1] = ax === 'x' ? [s.r[1], s.r[3]] : [s.r[0], s.r[2]];
  const others = Object.values(L.streets).filter((o) => o !== s && o.axis !== ax && overlaps(o.r, s.r, -0.01));
  const gaps: Span[] = others.map((o) => (ax === 'x' ? [o.r[0], o.r[2]] : [o.r[1], o.r[3]]));
  const edges = [v0 + 0.6, v1 - 0.6];
  const solid = [...L.blocks.map((bk) => bk.r), ...(L.loom ? [[L.loom.x - 1.9, L.loom.z - 1.65, L.loom.x + 1.9, L.loom.z + 1.65] as Rect] : [])];
  for (const v of edges) {
    const holeGaps: Span[] = i.holes.filter((h) => (ax === 'x' ? v > h[1] - 0.6 && v < h[3] + 0.6 : v > h[0] - 0.6 && v < h[2] + 0.6)).map((h): Span => (ax === 'x' ? [h[0] - 0.5, h[2] + 0.5] : [h[1] - 0.5, h[3] + 0.5]));
    const solidGaps: Span[] = solid.filter((r) => (ax === 'x' ? v > r[1] - 0.2 && v < r[3] + 0.2 : v > r[0] - 0.2 && v < r[2] + 0.2)).map((r): Span => (ax === 'x' ? [r[0], r[2]] : [r[1], r[3]]));
    for (const [p, q] of cut([u0 + 0.3, u1 - 0.3], [...gaps, ...holeGaps, ...solidGaps])) {
      if (q - p < 0.8) continue;
      const box = (mat: string, w0: number, w1: number, y: number) =>
        ax === 'x' ? b.deco(mat, p, cf, v + w0, q, cf + y, v + w1) : b.deco(mat, v + w0, cf, p, v + w1, cf + y, q);
      box(`flat:${s.color}`, -0.15, 0.15, 0.004);
      box(`flat:${CREAM}`, -0.035, 0.035, 0.006);
    }
  }
}

// ── The loom ─────────────────────────────────────────────────────────────────────────────────

/**
 * A hand loom (takabata) on a plinth, warp along x: the weaver's bench and the cloth beam at
 * +x, the warp beam at −x, heddles and the reed between, a half-woven cloth and a shuttle.
 * Glass rail round it; plaques on both long sides.
 */
function loom(i: ConcInfo, x: number, z: number) {
  const { b, cf } = i;
  i.claim(x - 1.85, z - 1.6, x + 1.85, z + 1.6);
  const y0 = cf + 0.25;
  // Plinth, its top edge, and an invisible collider over the loom.
  b.box('flat:#4a3a2e', x - 1.5, cf, z - 1.25, x + 1.5, y0, z + 1.25);
  b.deco('flat:#d8c8a0', x - 1.52, y0 - 0.04, z - 1.27, x + 1.52, y0, z + 1.27);
  b.block(x - 1.5, y0, z - 1.25, x + 1.5, cf + 2.4, z + 1.25);
  // Glass rail.
  const g0 = x - 1.85, g1 = x + 1.85, h0 = z - 1.6, h1 = z + 1.6, gy = cf + 0.95;
  b.box('glass', g0, cf, h0, g1, gy, h0 + 0.03);
  b.box('glass', g0, cf, h1 - 0.03, g1, gy, h1);
  b.box('glass', g0, cf, h0, g0 + 0.03, gy, h1);
  b.box('glass', g1 - 0.03, cf, h0, g1, gy, h1);
  b.deco('metal:#b9bdc2', g0 - 0.02, gy, h0 - 0.02, g1 + 0.02, gy + 0.04, h0 + 0.05);
  b.deco('metal:#b9bdc2', g0 - 0.02, gy, h1 - 0.05, g1 + 0.02, gy + 0.04, h1 + 0.02);
  b.deco('metal:#b9bdc2', g0 - 0.02, gy, h0, g0 + 0.05, gy + 0.04, h1);
  b.deco('metal:#b9bdc2', g1 - 0.05, gy, h0, g1 + 0.02, gy + 0.04, h1);
  const plaque = { k: 'label' as const, text: '紬の機', sub: 'The Tsumugi Loom', fg: '#f4efe2', bg: '#4a3324' };
  b.sign(plaque, x, cf + 0.7, h0 - 0.012, [0, -1], 0.9, 0.3);
  b.sign(plaque, x, cf + 0.7, h1 + 0.012, [0, 1], 0.9, 0.3);

  // Frame: tall posts at the back (−x), short at the front, side rails, the overhead frame.
  const bx = x - 1.2, fx = x + 1.15, zs = 0.8;
  for (const sz of [-1, 1]) {
    const pz = z + sz * zs;
    b.deco(TIMBER, bx - 0.06, y0, pz - 0.06, bx + 0.06, y0 + 2.12, pz + 0.06);
    b.deco(TIMBER, fx - 0.05, y0, pz - 0.05, fx + 0.05, y0 + 0.95, pz + 0.05);
    b.deco(TIMBER, bx, y0 + 0.7, pz - 0.04, fx, y0 + 0.8, pz + 0.04);
    b.deco(TIMBER, bx, y0 + 2.02, pz - 0.05, x + 0.1, y0 + 2.12, pz + 0.05);
  }
  b.deco(TIMBER, bx - 0.06, y0 + 2.02, z - zs - 0.06, bx + 0.06, y0 + 2.14, z + zs + 0.06);
  b.deco(TIMBER, x - 0.02, y0 + 2.02, z - zs - 0.06, x + 0.1, y0 + 2.14, z + zs + 0.06);
  // Warp beam (back) and cloth beam (front) with the cloth rolled on it.
  b.deco(TIMBER, bx + 0.08, y0 + 0.62, z - zs, bx + 0.22, y0 + 0.76, z + zs);
  b.deco(TIMBER, fx - 0.16, y0 + 0.72, z - zs, fx - 0.04, y0 + 0.84, z + zs);
  // Warp: fine threads in the four colours, upper and lower shed.
  const wy = y0 + 0.86, n = 16;
  for (let k = 0; k < n; k++) {
    const tz = z - 0.6 + (k * 1.2) / (n - 1), up = k % 2 ? 0.05 : 0;
    b.deco(`flat:${THREADS[Math.floor(k / 2) % 4]}`, bx + 0.15, wy + up, tz - 0.006, x + 0.25, wy + up + 0.012, tz + 0.006);
  }
  // The woven cloth from the reed to the cloth beam: warp stripes of the four colours.
  for (let k = 0; k < 4; k++) b.deco(`flat:${THREADS[k]}`, x + 0.25, wy - 0.01, z - 0.6 + k * 0.3, fx - 0.1, wy + 0.005, z - 0.3 + k * 0.3);
  b.deco(`flat:${INDIGO}`, fx - 0.19, y0 + 0.69, z - 0.66, fx - 0.01, y0 + 0.87, z + 0.66);
  // Heddle bars hung from the overhead frame, and the reed (beater).
  for (const [hx, hy] of [[x - 0.35, wy + 0.42], [x - 0.15, wy + 0.32]] as [number, number][]) {
    b.deco('wood:#8a6a48', hx - 0.02, hy, z - 0.7, hx + 0.02, hy + 0.04, z + 0.7);
    b.deco('wood:#8a6a48', hx - 0.02, hy - 0.5, z - 0.7, hx + 0.02, hy - 0.46, z + 0.7);
    b.deco('flat:#2b2d30', hx - 0.005, hy + 0.04, z - 0.01, hx + 0.005, y0 + 2.02, z + 0.01);
  }
  b.deco('wood:#8a6a48', x + 0.18, wy - 0.3, z - 0.72, x + 0.24, wy + 0.4, z - 0.66);
  b.deco('wood:#8a6a48', x + 0.18, wy - 0.3, z + 0.66, x + 0.24, wy + 0.4, z + 0.72);
  b.deco('wood:#8a6a48', x + 0.18, wy + 0.36, z - 0.72, x + 0.24, wy + 0.42, z + 0.72);
  b.deco('flat:#c9b48a', x + 0.2, wy - 0.26, z - 0.66, x + 0.22, wy + 0.36, z + 0.66);
  // Shuttle lying in the shed, with its bobbin.
  b.deco('wood:#a8662f', x + 0.06, wy + 0.02, z - 0.2, x + 0.12, wy + 0.07, z + 0.2);
  b.deco(`flat:${CREAM}`, x + 0.07, wy + 0.03, z - 0.08, x + 0.11, wy + 0.075, z + 0.08);
  // Bench and treadles at the front.
  b.deco(TIMBER, fx + 0.05, y0, z - 0.45, fx + 0.3, y0 + 0.45, z + 0.45);
  for (const tz of [-0.2, 0.2]) b.deco('wood:#8a6a48', x + 0.3, y0 + 0.02, z + tz - 0.05, fx - 0.1, y0 + 0.06, z + tz + 0.05);
}

// ── The unpaid halls ───────────────────────────────────────────────────────────────────────

/** Information counter (long side along z, signs facing ±x). */
function infoCounter(i: ConcInfo, x: number, z: number): boolean {
  const { b, cf } = i, hx = 0.45, hz = 1.2;
  if (!i.free(x - hx, z - hz, x + hx, z + hz, 1.0)) return false;
  i.claim(x - hx - 0.8, z - hz - 0.8, x + hx + 0.8, z + hz + 0.8);
  b.box(TILE, x - hx, cf, z - hz, x + hx, cf + 1.05, z + hz);
  b.deco(TIMBER, x - hx - 0.03, cf + 1.05, z - hz - 0.03, x + hx + 0.03, cf + 1.1, z + hz + 0.03);
  b.deco(`flat:${BLUE}`, x - hx - 0.006, cf + 0.7, z - hz - 0.006, x + hx + 0.006, cf + 0.76, z + hz + 0.006);
  b.deco(`flat:${MADDER}`, x - hx - 0.006, cf + 0.8, z - hz - 0.006, x + hx + 0.006, cf + 0.83, z + hz + 0.006);
  b.deco(STEEL, x - 0.03, cf + 1.1, z - 0.03, x + 0.03, cf + 1.75, z + 0.03);
  b.deco('flat:#2b3a67', x - 0.03, cf + 1.75, z - 0.7, x + 0.03, cf + 2.15, z + 0.7);
  for (const s of [-1, 1] as const) b.sign({ k: 'label', text: 'ご案内', sub: 'Information', fg: '#ffffff', bg: INDIGO }, x + s * 0.035, cf + 1.95, z, [s, 0], 1.3, 0.36);
  return true;
}

function unpaidHalls(i: ConcInfo) {
  i.ends.forEach((e, k) => {
    // Near the end wall, between pillar rows, clear of the ways from the gates to the exits.
    const x = e.g + (e.hi ? 1 : -1) * 12.6;
    const zs = [...new Set(i.pillars.map((q) => q[1]))].filter((z) => z > 6).sort((a, c) => a - c);
    const z = zs.length > 1 ? (zs[0] + zs[1]) / 2 : 13.7;
    if (k === 0) {
      infoCounter(i, x, z);
      kiosk(i, x, -z, { w: 3, d: 1.6, brand: SHOPS.hinataBakery, margin: 0.3 });
    } else {
      kiosk(i, x, z, { w: 3, d: 1.6, brand: SHOPS.hanaNoMinato, margin: 0.3 });
      kiosk(i, x, -z, { w: 3, d: 1.6, brand: SHOPS.kajitsudo, margin: 0.3 });
    }
  });
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const look: StationLook = {
  finishes: { wall: 'tile:#f2ece0', floor: 'floor:#d3ccbe', pillar: TILE, ceil: 'paint:#ddd6c6' },
  posters: false,
  skirting: false,

  lights(i) {
    const L = layout(i), top = i.cf + i.clear;
    const lit = (axis: 'x' | 'z', at: number, p: number, q: number, w: number, gaps: Span[] = []) =>
      strip(i, 'light', axis, at, p, q, top - 0.02, top, w, gaps);
    // Streets: light strips between the warp bands (two in the wide streets).
    for (const s of Object.values(L.streets)) {
      const ax = s.axis, [u0, u1] = ax === 'x' ? [s.r[0], s.r[2]] : [s.r[1], s.r[3]];
      const [v0, v1] = ax === 'x' ? [s.r[1], s.r[3]] : [s.r[0], s.r[2]];
      const W = v1 - v0, gaps = crossGaps(L, s);
      const at = W >= 5 ? [v0 + W * 0.3, v1 - W * 0.3] : [(v0 + v1) / 2];
      for (const v of at) lit(ax, v, u0 + 0.4, u1 - 0.4, s.old ? 0.12 : 0.2, gaps);
    }
    // Over each stair opening.
    for (const h of i.holes) lit('x', (h[1] + h[3]) / 2, h[0] + 0.3, h[2] - 0.3, 0.16);
    // Unpaid halls: strips across the hall's length, and the whole paid floor if no plan was made.
    for (const e of i.ends) {
      const [p, q] = e.hi ? [e.g + 4.5, i.x1 - 2] : [i.x0 + 2, e.g - 4.5];
      for (const z of [-24, -15, -6, 6, 15, 24].filter((z) => Math.abs(z) < i.cw - 2)) lit('x', z, p, q, 0.16);
    }
    if (!L.blocks.length) for (const z of [-0.75, -0.4, 0.4, 0.75].map((f) => f * i.cw)) lit('x', z, i.paid[0] + 4, i.paid[1] - 4, 0.16);
  },

  pillar(i, x, z, y0, y1) {
    const L = layout(i);
    // Pillars inside a block are behind its shops.
    if (L.blocks.some((bk) => inside(x, z, bk.r, 0.35))) return;
    const { b } = i, h = 0.4;
    b.deco(TILE, x - h, y0, z - h, x + h, y1, z + h);
    b.deco(`flat:${MADDER}`, x - h - 0.012, y0, z - h - 0.012, x + h + 0.012, y0 + 0.15, z + h + 0.012);
    const paid = x > i.paid[0] && x < i.paid[1];
    if (!paid) return;
    // Woven band: a blue thread under madder bars, an indigo thread over them.
    b.deco(`flat:${BLUE}`, x - h - 0.006, y0 + 2.04, z - h - 0.006, x + h + 0.006, y0 + 2.1, z + h + 0.006);
    b.deco(`flat:${MADDER}`, x - h - 0.012, y0 + 1.96, z - 0.05, x + h + 0.012, y0 + 2.2, z + 0.05);
    b.deco(`flat:${MADDER}`, x - 0.05, y0 + 1.96, z - h - 0.012, x + 0.05, y0 + 2.2, z + h + 0.012);
    b.deco(`flat:${INDIGO}`, x - h - 0.018, y0 + 2.13, z - h - 0.018, x + h + 0.018, y0 + 2.17, z + h + 0.018);
  },

  concourse(i) {
    const L = layout(i);
    // Long walls: cream tile dado, a madder cap and a woven frieze.
    for (const s of [-1, 1] as const) {
      wallDado(i, s, { mat: 'tile:#e6dcc4', top: 1.2, cap: `paint:${MADDER}`, frieze: `flat:${BLUE}`, friezeY: [2.42, 2.48] });
      wallBand(i, s, 2.52, 2.55, `flat:${MADDER}`, { inset: 0.012 });
    }
    // Blocks first (they claim their floor), then the loom, the ceilings and floors, the unpaid halls.
    const ptr: Record<string, { k: number }> = {};
    const v = { k: 0 };
    for (const bk of L.blocks) block(i, L, bk, ptr, v);
    if (L.loom) loom(i, L.loom.x, L.loom.z);
    for (const s of Object.values(L.streets)) {
      weaveCeiling(i, L, s);
      floorBorder(i, L, s);
    }
    unpaidHalls(i);
  },

  exit(e) {
    const { b, cf, ext } = e, L = ext + 4;
    exitDado(e, { mat: TILE, top: 1.1, steps: 4 });
    // Woven stripe above the dado on the side wall and the lobby's back wall.
    THREADS.forEach((c, k) => {
      const y = cf + 1.16 + k * 0.05;
      b.deco(`flat:${c}`, -4, y, 0, -3.988, y + 0.03, L);
      b.deco(`flat:${c}`, -4, y, L - 0.012, 0, y + 0.03, L);
    });
    for (let z = 0.6; z < L - 0.3; z += 1.2) b.deco(`flat:${MADDER}`, -4, cf + 1.13, z, -3.984, cf + 1.35, z + 0.06);
    exitHandrails(e, ['far']);
  },

  canopy(e) {
    const { b, ext, run, gy } = e;
    const z0 = ext + 0.6, z1 = ext + 4.6, x0 = -0.6, x1 = run + 0.7, ry = gy + 2.5;
    // Steel posts and a glass roof in a steel frame.
    for (const [px, pz] of [[0, ext + 1.05], [0, ext + 4.15], [run, ext + 1.05], [run, ext + 4.15]]) b.deco(STEEL, px - 0.06, gy, pz - 0.06, px + 0.06, ry, pz + 0.06);
    b.deco('glassTint', x0, ry + 0.04, z0, x1, ry + 0.08, z1);
    b.deco(STEEL, x0, ry, z0, x1, ry + 0.12, z0 + 0.1);
    b.deco(STEEL, x0, ry, z1 - 0.1, x1, ry + 0.12, z1);
    b.deco(STEEL, x0, ry, z0, x0 + 0.1, ry + 0.12, z1);
    // Madder fascia round the front and sides.
    b.deco(`paint:${MADDER}`, x1 - 0.06, ry + 0.12, z0 - 0.02, x1, ry + 0.42, z1 + 0.02);
    b.deco(`paint:${MADDER}`, x0, ry + 0.12, z0 - 0.02, x1, ry + 0.42, z0 + 0.04);
    b.deco(`paint:${MADDER}`, x0, ry + 0.12, z1 - 0.04, x1, ry + 0.42, z1 + 0.02);
    // Board behind the entrance sign.
    b.deco('flat:#22262b', run - 0.04, gy + 1.88, ext + 1.1, run + 0.05, gy + 2.52, ext + 4.1);
    // Woven screens on both side walls: horizontal slats behind, vertical slats in front.
    for (const [zc, s] of [[ext + 1.05, -1], [ext + 4.15, 1]] as [number, number][]) {
      THREADS.slice(0, 3).forEach((c, k) => {
        const y = gy + 1.25 + k * 0.42;
        b.deco(`flat:${c}`, 0.1, y, zc - 0.015, run - 0.1, y + 0.1, zc + 0.015);
      });
      const n = Math.max(3, Math.round(run / 2.2));
      for (let k = 0; k <= n; k++) {
        const x = 0.1 + ((run - 0.3) * k) / n;
        b.deco(`flat:${THREADS[(k + 1) % 4]}`, x, gy + 1.05, zc + s * 0.02, x + 0.08, gy + 2.4, zc + s * 0.05);
      }
    }
  },

  passage(p) {
    const { b, pf, zc0, zc1 } = p, top = pf + 2.8;
    passageDado(p, { mat: TILE, top: 1.0, cap: `paint:${MADDER}` });
    // Woven stripes along the dado, continuing the mural's pattern.
    for (const w of passageWalls(p)) {
      for (const [a, c] of w.runs) {
        if (c - a < 1.5) continue;
        [BLUE, MADDER, INDIGO].forEach((col, k) => {
          const y = pf + 0.5 + k * 0.14, z = w.f > 0 ? [w.z, w.z + 0.012] : [w.z - 0.012, w.z];
          b.deco(`flat:${col}`, a, y, z[0], c, y + 0.06, z[1]);
        });
      }
    }
    passageRails(p);
    // Warp bands along the ceiling, wefts across every 3 m.
    [zc0 + 0.5, zc0 + 1.1, zc1 - 1.1, zc1 - 0.5].forEach((z, k) => b.deco(`flat:${THREADS[k]}`, -25.9, top - 0.13, z - 0.05, 3.9, top - 0.1, z + 0.05));
    for (let x = -24.5, k = 0; x < 3; x += 3, k++) {
      const y = k % 2 ? top - 0.09 : top - 0.17;
      b.deco(`flat:${k % 2 ? CREAM : BLUE}`, x - 0.07, y, zc0 + 0.2, x + 0.07, y + 0.03, zc1 - 0.2);
    }
    // Framed textile samples on the long zc0 wall between the doorways.
    for (const w of passageWalls(p).filter((q) => q.f > 0)) {
      for (const [a, c] of w.runs) {
        if (c - a < 6) continue;
        const n = Math.floor((c - a - 2) / 3.2);
        for (let k = 0; k < n; k++) {
          const x = a + (c - a) / 2 + (k - (n - 1) / 2) * 3.2, col = CLOTH[k % CLOTH.length];
          b.deco(TIMBER, x - 0.36, pf + 1.3, w.z, x + 0.36, pf + 2.0, w.z + 0.03);
          b.deco(`flat:${col}`, x - 0.3, pf + 1.36, w.z + 0.03, x + 0.3, pf + 1.94, w.z + 0.04);
          b.deco(`flat:${THREADS[(k + 1) % 4]}`, x - 0.3, pf + 1.58, w.z + 0.04, x + 0.3, pf + 1.66, w.z + 0.045);
        }
      }
    }
  },
};
