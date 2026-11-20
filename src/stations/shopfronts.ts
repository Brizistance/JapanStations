// Shop front presets inside stations: what stands in and before a shop depends on what it sells.
//
// A shop's kind comes from its name (frontKind), so a front always matches its sign. The props are
// Blender models (tools/blender/build_shops.py → public/models/buildings/shops.glb); glass, noren,
// neon and shutters are boxes. The callers (hub.ts shopFront, looks/parts.ts shopFace) keep their
// own fascia, sign and pilasters and hand over the opening between them.
import type { Builder } from '../world/builder';
import { GROUND_Y } from './kit';

export type FrontKind =
  | 'izakaya' | 'noodle' | 'cafe' | 'bakery' | 'sweets' | 'books' | 'drug' | 'flowers' | 'goods' | 'karaoke' | 'service' | 'conbini'
  // The silk quarter's trades (Tsumugibashi, Aizomechō).
  | 'silk' | 'kimono' | 'thread' | 'furoshiki' | 'dye';

const RULES: [RegExp, FrontKind][] = [
  [/Kimono/i, 'kimono'],
  [/Silks/i, 'silk'],
  [/Yarn|Thread/i, 'thread'],
  [/Furoshiki/i, 'furoshiki'],
  [/Dye/i, 'dye'],
  [/Izakaya|Yakiniku|Okonomiyaki/i, 'izakaya'],
  [/Ramen|Soba|Udon/i, 'noodle'],
  [/Caf[eé]|Coffee|Kissa|Tea Room|Juice/i, 'cafe'],
  [/Bakery/i, 'bakery'],
  [/Wagashi|Bento|Takoyaki|Taiyaki|Cracker|Omusubi|Market/i, 'sweets'],
  [/Books|Shob/i, 'books'],
  [/Pharmacy|Drug|100-yen/i, 'drug'],
  [/Flower|Hana no/i, 'flowers'],
  [/Gifts|Zakka/i, 'goods'],
  [/Karaoke/i, 'karaoke'],
  [/Mart|Store|Kiosk/i, 'conbini'],
];
/** The kind of front a business has, from its English name. Offices, banks and clinics are 'service'. */
export const frontKind = (en: string): FrontKind => RULES.find(([re]) => re.test(en))?.[1] ?? 'service';

/** A wall face: it runs along `axis` at `at` and faces `n` (looks/parts.ts Face). */
export interface FrontFace {
  axis: 'x' | 'z';
  at: number;
  n: 1 | -1;
}
export interface FrontShop {
  ja: string;
  en: string;
  bg: string;
  fg: string;
}

// build_shops.py SIZES: length, depth, height.
const SIZE: Record<string, [number, number, number]> = {
  aboard: [0.55, 0.45, 1.0], crates: [0.55, 0.4, 0.75], foodcase: [0.9, 0.35, 1.35], ticketm: [0.6, 0.4, 1.5], magrack: [1.0, 0.4, 1.3],
  wagon: [0.9, 0.5, 1.15], buckets: [1.2, 0.5, 0.95], brochure: [0.5, 0.3, 1.4],
};

interface Kit {
  box: (mat: string, u0: number, u1: number, y0: number, y1: number, d0: number, d1: number) => void;
  /** A model with its origin `d` out from the wall at `u`, `yy` above the floor. */
  put: (id: string, u: number, yy: number, d: number) => void;
  /** A floor prop outside the front, its back `d` out from the wall, with its collider. */
  out: (id: string, u: number, d: number) => void;
  sign: (c: Parameters<Builder['sign']>[0], u: number, yy: number, d: number, w: number, h: number) => void;
}

function kit(b: Builder, f: FrontFace, y: number): Kit {
  const N: [number, number] = f.axis === 'x' ? [0, f.n] : [f.n, 0];
  const P = (u: number, d: number): [number, number] => (f.axis === 'x' ? [u, f.at + f.n * d] : [f.at + f.n * d, u]);
  const span = (mat: string, solid: boolean, u0: number, u1: number, y0: number, y1: number, d0: number, d1: number) => {
    const p = f.at + f.n * d0, q = f.at + f.n * d1;
    if (f.axis === 'x') b.box(mat, u0, y + y0, Math.min(p, q), u1, y + y1, Math.max(p, q), solid);
    else b.box(mat, Math.min(p, q), y + y0, u0, Math.max(p, q), y + y1, u1, solid);
  };
  const put = (id: string, u: number, yy: number, d: number) => {
    const [x, z] = P(u, d), dir = b.dir(N);
    b.out.models.push({ kind: 'shops', id, pos: b.pt(x, y + yy, z), yaw: Math.atan2(-dir[0], -dir[1]) + 0, seed: 0, merge: true });
  };
  return {
    box: (mat, u0, u1, y0, y1, d0, d1) => span(mat, false, u0, u1, y0, y1, d0, d1),
    put,
    out: (id, u, d) => {
      const [l, dp, h] = SIZE[id];
      put(id, u, 0, d + dp / 2);
      span('none', true, u - l / 2, u + l / 2, 0, h, d, d + dp);
    },
    sign: (c, u, yy, d, w, h) => {
      const [x, z] = P(u, d);
      b.sign(c, x, y + yy, z, N, w, h);
    },
  };
}

/** Centres of as many `pitch`-long things as fit between u0 and u1, spread evenly. */
function tile(u0: number, u1: number, pitch: number, max = 99): number[] {
  const n = Math.min(max, Math.floor((u1 - u0 + 1e-6) / pitch));
  if (n < 1) return [];
  const gap = (u1 - u0 - n * pitch) / (n + 1);
  return Array.from({ length: n }, (_, k) => u0 + gap * (k + 1) + pitch * (k + 0.5));
}

/**
 * What a shop of this kind puts outside a glazed front between x0 and x1 that stands `D` out from
 * the wall: boards, racks, wagons, a lantern. Floor props are solid and reach at most 0.5 m out.
 */
export function shopExtras(b: Builder, f: FrontFace, x0: number, x1: number, y: number, top: number, D: number, shop: FrontShop, door: number | null = x1 - 0.7) {
  const k = kit(b, f, y), kind = frontKind(shop.en);
  const end = door === null ? x1 : door - 0.6;
  switch (kind) {
    case 'izakaya':
      k.put('lantern', Math.max(x0 + 0.3, end - 0.25), Math.min(2.05, top - 0.2), D);
      if (end - x0 > 2.2) k.out('crates', x0 + 0.45, D + 0.02);
      if (end - x0 > 3.6) k.out('aboard', end - 1.1, D + 0.04);
      break;
    case 'noodle':
      k.put('lantern', x0 + 0.3, Math.min(2.05, top - 0.2), D);
      if (door !== null && end - x0 > 2.4) k.out('foodcase', x0 + 1.1, D + 0.02);
      break;
    case 'cafe':
    case 'bakery':
    case 'goods':
      if (end - x0 > 2) k.out('aboard', end - 0.5, D + 0.04);
      break;
    case 'books':
      for (const u of tile(x0 + 0.2, end - 0.2, 1.15, 2)) k.out('magrack', u, D + 0.02);
      break;
    case 'drug':
      for (const u of tile(x0 + 0.2, end - 0.2, 1.3, 3)) k.out('wagon', u, D + 0.02);
      break;
    case 'flowers':
      for (const u of tile(x0 + 0.1, end - 0.1, 1.3, 3)) k.out('buckets', u, D + 0.0);
      break;
    case 'karaoke':
      if (end - x0 > 2) k.out('aboard', x0 + 0.5, D + 0.04);
      break;
    case 'service':
      if (end - x0 > 1.6) k.out('brochure', end - 0.4, D + 0.02);
      break;
    default:
  }
  if (kind === 'sweets' || kind === 'noodle') {
    // A banner flag (のぼり) on a pole by the end of the front.
    const u = x1 - 0.12;
    k.box('metal:#9da2a8', u - 0.012, u + 0.012, 0, 1.95, D + 0.1, D + 0.124);
    k.box(`flat:${shop.bg}`, u - 0.4, u - 0.012, 0.75, 1.9, D + 0.108, D + 0.116);
    k.box(`flat:${shop.fg}`, u - 0.33, u - 0.08, 1.0, 1.7, D + 0.116, D + 0.12);
  }
}

/**
 * A whole shop front for the shop's kind in the opening between x0 and x1, from the floor `y` up
 * `top` metres, standing `D` (about 0.5) out from the wall. Solid over that footprint. `shut` draws
 * a closed roller shutter instead, whatever the shop is.
 */
export function shopPreset(b: Builder, f: FrontFace, x0: number, x1: number, y: number, top: number, D: number, shop: FrontShop, shut = false) {
  const k = kit(b, f, y), kind = frontKind(shop.en);
  const { box, put } = k;
  const solid = (u0: number, u1: number, h: number, d0: number, d1: number) => {
    const p = f.at + f.n * d0, q = f.at + f.n * d1;
    if (f.axis === 'x') b.block(u0, y, Math.min(p, q), u1, y + h, Math.max(p, q));
    else b.block(Math.min(p, q), y, u0, Math.max(p, q), y + h, u1);
  };
  solid(x0, x1, top, 0, D);
  if (shut) {
    box('metal:#aeb3b8', x0, x1, 0.06, top, D - 0.06, D - 0.03);
    for (let h = 0.1; h < top - 0.25; h += 0.11) box('flat:#8f959c', x0, x1, h, h + 0.015, D - 0.03, D - 0.022);
    box('flat:#6f757c', x0, x1, 0, 0.1, D - 0.07, D);
    box('flat:#6f757c', x0, x1, top - 0.22, top, D - 0.1, D);
    box('flat:#f4f1e6', (x0 + x1) / 2 - 0.15, (x0 + x1) / 2 + 0.15, 1.25, 1.67, D - 0.022, D - 0.018);
    box('flat:#c62828', (x0 + x1) / 2 - 0.11, (x0 + x1) / 2 + 0.11, 1.56, 1.62, D - 0.018, D - 0.016);
    box('flat:#3a3d41', x1 - 0.5, x1 - 0.2, 1.0, 1.06, D - 0.022, D - 0.016);
    return;
  }
  const door = x1 - 0.7, end = door - 0.5;
  /** Glass from u0 to u1 over a dark plinth, mullions about every 1.6 m. */
  const glass = (u0: number, u1: number) => {
    box('flat:#3a3d41', u0, u1, 0, 0.3, D - 0.05, D);
    box('glass', u0, u1, 0.3, top, D - 0.025, D - 0.012);
    const m = Math.round((u1 - u0) / 1.6);
    for (let i = 1; i < m; i++) box('metal:#b9bdc2', u0 + ((u1 - u0) * i) / m - 0.025, u0 + ((u1 - u0) * i) / m + 0.025, 0.3, top, D - 0.04, D);
  };
  const glassDoor = (open = false) => {
    box('metal:#b9bdc2', door - 0.5, door + 0.5, 2.1, top, D - 0.05, D);
    for (const u of [door - 0.5, door + 0.46]) box('metal:#b9bdc2', u, u + 0.04, 0, 2.1, D - 0.05, D);
    if (open) return;
    box('glassTint', door - 0.46, door + 0.46, 0, 2.1, D - 0.03, D - 0.015);
    box('metal:#b9bdc2', door - 0.05, door + 0.05, 0.9, 1.2, D - 0.015, D + 0.03);
  };
  const back = (mat: string) => box(mat, x0, x1, 0, top, 0, 0.02);
  const lit = (col = '#fff1d6') => box(`glow:${col}`, x0 + 0.1, x1 - 0.1, top - 0.05, top - 0.01, 0.05, 0.3);
  const noren = (u0: number, u1: number, h = 0.5) => {
    box('wood:#5a4636', u0 - 0.05, u1 + 0.05, top - 0.09, top - 0.05, D, D + 0.04);
    const n = Math.max(2, Math.round((u1 - u0) / 0.5)), w = (u1 - u0) / n;
    for (let i = 0; i < n; i++) box(`flat:${shop.bg}`, u0 + i * w + 0.015, u0 + (i + 1) * w - 0.015, top - 0.09 - h, top - 0.09, D + 0.01, D + 0.03);
  };

  switch (kind) {
    case 'izakaya': {
      // Timber lattice over lit paper, a sliding door under a short curtain.
      back('flat:#3a2a20');
      const bays = tile(x0, end, 1.2);
      const a = bays.length ? bays[0] - 0.6 : end, c = bays.length ? bays[bays.length - 1] + 0.6 : end;
      for (const u of bays) put('lattice', u, 0, D);
      for (const [p, q] of [[x0, a], [c, door - 0.5], [door + 0.5, x1]]) if (q - p > 0.01) box('wood:#5a4030', p, q, 0, top, D - 0.06, D);
      box('wood:#5a4030', x0, x1, 2.2, top, D - 0.06, D);
      put('slidedoor', door, 0, D);
      noren(door - 0.5, door + 0.5, 0.45);
      break;
    }
    case 'noodle': {
      // An open bar: counters with stools in the passage, pots behind, a curtain along the top.
      back('flat:#e9dcc0');
      lit();
      const bars = tile(x0 + 0.1, x1 - 0.8, 1.6);
      for (const u of bars) put('potcounter', u, 0, D - 0.2);
      if (bars.length) solid(bars[0] - 0.8, bars[bars.length - 1] + 0.8, 0.65, D, D + 0.42);
      box('wood:#5a4030', bars.length ? bars[bars.length - 1] + 0.8 : x0, x1, 0, top, D - 0.06, D);
      box('wood:#5a4030', x0, bars.length ? bars[0] - 0.8 : x0, 0, top, D - 0.06, D);
      noren(x0, x1, 0.4);
      k.out('ticketm', x1 - 0.4, D + 0.02);
      break;
    }
    case 'cafe': {
      back('flat:#4a3428');
      lit('#ffe2b0');
      glass(x0, door - 0.5);
      glassDoor();
      for (const u of tile(x0 + 0.1, end - 0.1, 1.7)) {
        put('winbar', u, 0, D - 0.25);
        put('pendant', u, top, D - 0.28);
      }
      box(`flat:${shop.bg}`, x0, x1, top - 0.2, top, D, D + 0.012);
      break;
    }
    case 'bakery': {
      back('flat:#f3e2c0');
      lit('#ffe2b0');
      glass(x0, door - 0.5);
      glassDoor();
      for (const u of tile(x0 + 0.1, end - 0.1, 1.25)) put('breadcase', u, 0, 0.24);
      // Striped awning in the shop's colour.
      box(`flat:${shop.bg}`, x0, x1, top - 0.1, top - 0.06, D, D + 0.45);
      const n = Math.max(2, Math.round((x1 - x0) / 0.5));
      for (let i = 0; i < n; i++) box(i % 2 ? 'flat:#f4f1e6' : `flat:${shop.fg}`, x0 + ((x1 - x0) * i) / n, x0 + ((x1 - x0) * (i + 1)) / n, top - 0.24, top - 0.1, D + 0.44, D + 0.45);
      break;
    }
    case 'sweets': {
      // An open counter of glass cases, boxed goods on the wall behind.
      back('flat:#f4efe2');
      lit();
      for (const u of tile(x0, x1, 1.22)) put('showcase', u, 0, D - 0.25);
      box(`flat:${shop.bg}`, x0, x1, 1.9, top, 0.02, 0.05);
      for (const u of tile(x0 + 0.2, x1 - 0.2, 0.7)) {
        box('flat:#d9d4c7', u - 0.3, u + 0.3, 1.3, 1.325, 0.02, 0.18);
        box(`flat:${['#b23a3a', '#e8e2d0', '#6aa84f', '#f2d16b'][Math.abs(Math.round(u * 3)) % 4]}`, u - 0.22, u + 0.2, 1.325, 1.6, 0.04, 0.16);
      }
      break;
    }
    case 'books': {
      back('flat:#e9e2d0');
      lit();
      glass(x0, door - 0.5);
      glassDoor(true);
      for (const u of tile(x0, x1, 1.22)) put('bookshelf', u, 0, 0.17);
      break;
    }
    case 'drug': {
      // Open front, bright, a red sale band over it; the wagons stand outside (shopExtras).
      back('flat:#ffffff');
      lit('#ffffff');
      for (const u of tile(x0, x1, 1.22)) put('shelfunit', u, 0, 0.17);
      box('flat:#ffffff', x0, x1, top - 0.32, top, D - 0.04, D);
      box('flat:#d32f2f', x0, x1, top - 0.26, top - 0.14, D, D + 0.008);
      for (const u of tile(x0 + 0.2, x1 - 0.2, 0.8)) box('flat:#ffeb3b', u - 0.16, u + 0.16, top - 0.62, top - 0.36, D - 0.02, D - 0.012);
      break;
    }
    case 'flowers': {
      back('flat:#dfeedd');
      lit();
      for (const u of tile(x0, x1, 1.22)) put('shelfunit', u, 0, 0.17);
      for (const u of tile(x0 + 0.1, x1 - 0.1, 1.3)) put('buckets', u, 0, D - 0.26);
      break;
    }
    case 'goods':
    case 'conbini': {
      back(kind === 'goods' ? 'flat:#f1ebdd' : 'flat:#f4f4f0');
      lit(kind === 'goods' ? '#fff1d6' : '#ffffff');
      glass(x0, door - 0.5);
      glassDoor();
      if (kind === 'goods') for (const u of tile(x0 + 0.1, end - 0.1, 1.3)) put('plinth', u, 0, D - 0.24);
      for (const u of tile(x0, x1, 1.22)) put('shelfunit', u, 0, 0.17);
      if (kind === 'conbini') for (const h of [0.34, 0.46]) box(`flat:${shop.bg}`, x0, door - 0.5, h, h + 0.07, D - 0.011, D - 0.008);
      break;
    }
    case 'silk':
    case 'kimono':
    case 'thread':
    case 'furoshiki': {
      // The textile trades: a glazed front, the goods on timber racks behind and a display in the window.
      back('flat:#f1e4c8');
      lit();
      glass(x0, door - 0.5);
      glassDoor();
      const deep = D >= 0.9;
      if (kind === 'silk') {
        for (const u of tile(x0, x1, 1.22)) put('boltrack', u, 0, 0.2);
        if (deep) for (const u of tile(x0 + 0.1, end - 0.1, 1.5, 2)) put('bolttable', u, 0, D - 0.32);
      } else if (kind === 'kimono') {
        for (const u of tile(x0 + 0.1, end - 0.1, 1.6)) put('kimonostand', u, 0, D - 0.2);
        if (deep) for (const u of tile(x0, x1, 1.22)) put('boltrack', u, 0, 0.2);
      } else if (kind === 'thread') {
        for (const u of tile(x0, x1, 1.22)) put('conerack', u, 0, 0.17);
      } else {
        for (const u of tile(x0 + 0.1, end - 0.1, 1.3)) put('clothsteps', u, 0, D - 0.26);
        tile(x0 + 0.2, x1 - 0.2, 0.75).forEach((u, i) => box(`flat:${['#b4472f', '#2f6fb0', '#c9962e', '#1d2c50', '#6b8f3a'][i % 5]}`, u - 0.27, u + 0.27, 1.4, 1.94, 0.02, 0.03));
      }
      box(`flat:${shop.bg}`, x0, x1, top - 0.14, top, D, D + 0.012);
      break;
    }
    case 'dye': {
      // An open counter of dye jars under a short curtain, swatches on the wall behind.
      back('flat:#f1e4c8');
      lit();
      for (const u of tile(x0, x1, 1.64)) put('dyebar', u, 0, D - 0.25);
      const cols = [['#0f1f3d', '#1b3560', '#2b4f86', '#3f6fa8', '#6f98c4', '#a9c4de'], ['#6e1f14', '#8f2d1d', '#b4472f', '#d06a3c', '#d9a63a', '#e8cf7a']];
      tile(x0 + 0.2, x1 - 0.2, 0.3).forEach((u, i) => cols.forEach((row, r) => box(`flat:${row[i % 6]}`, u - 0.12, u + 0.12, 1.25 + r * 0.45, 1.62 + r * 0.45, 0.02, 0.03)));
      noren(x0, x1, 0.35);
      break;
    }
    case 'karaoke': {
      // A closed dark front with neon bands, a lit price board and one door to the rooms upstairs.
      box('flat:#1b1320', x0, x1, 0, top, D - 0.04, D);
      for (const [h, col] of [[0.42, shop.fg], [0.52, '#ff3d9a'], [top - 0.3, '#ff3d9a'], [top - 0.2, shop.fg]] as const) box(`glow:${col}`, x0 + 0.1, door - 0.7, h, h + 0.035, D, D + 0.012);
      if (end - x0 > 1.2) put('priceboard', x0 + 0.65, 0.75, D);
      if (end - x0 > 3) put('priceboard', x0 + 1.55, 0.75, D);
      box(`glow:${shop.fg}`, door - 0.56, door + 0.56, 0, 2.16, D, D + 0.01);
      box('flat:#0d0a10', door - 0.5, door + 0.5, 0, 2.1, D + 0.01, D + 0.016);
      box('metal:#b9bdc2', door + 0.3, door + 0.34, 0.9, 1.3, D + 0.016, D + 0.05);
      k.sign({ k: 'label', text: '受付 2F', sub: 'Reception upstairs', fg: '#fff', bg: '#7b1fa2' }, door, 1.75, D + 0.02, 0.8, 0.2);
      break;
    }
    default: {
      // Offices, banks, clinics: glass with a frosted band, a desk inside.
      back('flat:#eef0f1');
      lit('#ffffff');
      glass(x0, door - 0.5);
      glassDoor();
      box('flat:#f4f6f7', x0, door - 0.5, 0.85, 1.45, D - 0.012, D - 0.009);
      box(`flat:${shop.bg === '#fff' || shop.bg === '#ffffff' ? shop.fg : shop.bg}`, x0, door - 0.5, 1.45, 1.5, D - 0.012, D - 0.008);
      for (const u of tile(x0 + 0.1, end - 0.1, 2.4, 2)) put('desk', u, 0, D - 0.26);
    }
  }
  shopExtras(b, f, x0, x1, y, top, D, shop, kind === 'noodle' || kind === 'sweets' || kind === 'drug' || kind === 'flowers' || kind === 'dye' ? null : door);
}

// ── Behind the wall: recessed counters and shops you can walk into ───────────────────────────────
//
// Both cut into the finished wall (Builder.carve), so they are decided at the end of the build
// (Builder.later) and only where the ground behind the wall is free: below the street, and no solid
// part from 0.9 m behind the wall face (the wall itself is thinner) to the back of the room.

const ALCOVE = 1.5, ROOM = 5;
const ROOM_KINDS: FrontKind[] = ['noodle', 'cafe', 'books', 'silk'];
/** The kinds of room already made in each build: one of each per station. */
const made = new WeakMap<Builder, Set<FrontKind>>();

/** The box u0 … u1 along the face by depths d0 … d1 (negative: behind the wall), as builder x, z. */
function vol(f: FrontFace, u0: number, u1: number, d0: number, d1: number): [number, number, number, number] {
  const p = f.at + f.n * d0, q = f.at + f.n * d1;
  return f.axis === 'x' ? [u0, Math.min(p, q), u1, Math.max(p, q)] : [Math.min(p, q), u0, Math.max(p, q), u1];
}
/**
 * Whether a shop is believable behind the front between x0 and x1: nowhere to walk within `depth`
 * (3 m) behind the wall. A stair, a passage, another hall or a thin partition there means the
 * front would be a shop with no room to be one. Asked at the end of the build (Builder.later),
 * when every zone and stair exists.
 */
export function shopFits(b: Builder, f: FrontFace, x0: number, x1: number, y: number, depth = 3): boolean {
  const v = vol(f, x0 + 0.3, x1 - 0.3, -depth, -0.6);
  const p = b.pt(v[0], y + 0.3, v[1]), q = b.pt(v[2], y + 2.2, v[3]);
  const lo = [0, 1, 2].map((a) => Math.min(p[a], q[a])), hi = [0, 1, 2].map((a) => Math.max(p[a], q[a]));
  // The space the shop itself faces may be drawn wider than its walls: that zone counts only if
  // there really is a floor to stand on behind the wall.
  const w = vol(f, (x0 + x1) / 2 - 0.2, (x0 + x1) / 2 + 0.2, 0.6, 1.0), o = b.pt((w[0] + w[2]) / 2, y + 1, (w[1] + w[3]) / 2);
  const floored = () => b.out.boxes.some((q) => q.solid && q.mat !== 'none' && Math.abs(q.max[1] - (lo[1] - 0.3)) < 0.06
    && q.min[0] < hi[0] - 0.3 && q.max[0] > lo[0] + 0.3 && q.min[2] < hi[2] - 0.3 && q.max[2] > lo[2] + 0.3);
  for (const z of b.out.zones) {
    if (![0, 1, 2].every((a) => z.min[a] < hi[a] - 0.05 && z.max[a] > lo[a] + 0.05)) continue;
    const own = [0, 1, 2].every((a) => o[a] > z.min[a] && o[a] < z.max[a]);
    if (!own || floored()) return false;
  }
  return !b.out.ramps.some((r) => r.x0 < hi[0] && r.x1 > lo[0] && r.z0 < hi[2] && r.z1 > lo[2] && r.yLow < hi[1] + 1 && r.yHigh > lo[1] - 1);
}

/** What stands in for a shop that does not fit: framed posters along the wall between x0 and x1. */
export function posterWall(b: Builder, f: FrontFace, x0: number, x1: number, y: number, seed = 0) {
  const N: [number, number] = f.axis === 'x' ? [0, f.n] : [f.n, 0], dir = b.dir(N);
  tile(x0, x1, 2.2).forEach((u, i) => {
    const at = (d: number): [number, number] => (f.axis === 'x' ? [u, f.at + f.n * d] : [f.at + f.n * d, u]);
    const [mx, mz] = at(0.008), [sx, sz] = at(0.03);
    b.out.models.push({ kind: 'station', id: 'adframe_mid', pos: b.pt(mx, y + 1.55, mz), yaw: Math.atan2(-dir[0], -dir[1]) + 0, seed: 0, merge: true });
    b.sign({ k: 'poster', v: Math.abs(Math.round(seed + i * 3 + u)) % 8 }, sx, y + 1.55, sz, N, 1.25, 1.75);
  });
}

function groundFree(b: Builder, f: FrontFace, x0: number, x1: number, y: number, depth: number): boolean {
  if (b.pt(0, y + 3.6, 0)[1] > GROUND_Y - 0.8 || !shopFits(b, f, x0, x1, y)) return false;
  const [xa, za, xb, zb] = vol(f, x0 - 0.35, x1 + 0.35, -depth - 0.35, -0.9);
  return !b.solidIn(xa, y - 0.28, za, xb, y + 3.4, zb);
}
/** Cut the opening and build the shell: floor, back and side walls, ceiling. */
function shell(b: Builder, f: FrontFace, x0: number, x1: number, y: number, top: number, depth: number, wall: string, floor: string) {
  const c = vol(f, x0, x1, -depth, 0.07);
  b.carve(c[0], y + 0.002, c[1], c[2], y + top, c[3]);
  const part = (mat: string, u0: number, u1: number, y0: number, y1: number, d0: number, d1: number) => {
    const v = vol(f, u0, u1, d0, d1);
    b.box(mat, v[0], y + y0, v[1], v[2], y + y1, v[3]);
  };
  part(floor, x0, x1, -0.3, 0, -depth, 0);
  part(wall, x0 - 0.2, x1 + 0.2, 0, top, -depth - 0.2, -depth);
  part(wall, x0 - 0.2, x0, 0, top, -depth, -0.02);
  part(wall, x1, x1 + 0.2, 0, top, -depth, -0.02);
  part('ceil', x0 - 0.2, x1 + 0.2, top, top + 0.2, -depth - 0.2, -0.02);
}

/**
 * A counter set back 1.5 m into the wall for a noodle bar or a sweets counter, so its customers
 * stand off the passage. False (nothing built) for other kinds or where the ground is not free.
 */
export function shopAlcove(b: Builder, f: FrontFace, x0: number, x1: number, y: number, top: number, shop: FrontShop): boolean {
  const kind = frontKind(shop.en);
  if ((kind !== 'noodle' && kind !== 'sweets') || !groundFree(b, f, x0, x1, y, ALCOVE)) return false;
  shell(b, f, x0, x1, y, top, ALCOVE, 'flat:#e9dcc0', 'tile:#b9b4a6');
  shopPreset(b, { ...f, at: f.at - f.n * ALCOVE }, x0, x1, y, top, 0.5, shop);
  return true;
}

/**
 * A shop you can walk into behind the front between x0 and x1: a standing noodle bar, a cafe or a
 * bookshop, 5 m deep, its glass front `D` out from the wall. One of each kind per station. False
 * (nothing built) for other kinds, narrow fronts, or where the ground is not free.
 */
export function shopRoom(b: Builder, f: FrontFace, x0: number, x1: number, y: number, top: number, D: number, shop: FrontShop): boolean {
  const kind = frontKind(shop.en);
  const done = made.get(b) ?? new Set<FrontKind>();
  if (!ROOM_KINDS.includes(kind) || done.has(kind) || x1 - x0 < 5.5 || !groundFree(b, f, x0, x1, y, ROOM)) return false;
  made.set(b, done.add(kind));
  type RoomKind = 'noodle' | 'cafe' | 'books' | 'silk';
  const wall = { noodle: 'flat:#e9dcc0', cafe: 'flat:#4a3428', books: 'flat:#e9e2d0', silk: 'flat:#f1e4c8' }[kind as RoomKind];
  const floor = { noodle: 'tile:#8f8676', cafe: 'wood:#7a5a3c', books: 'tile:#b9b4a6', silk: 'wood:#9a7650' }[kind as RoomKind];
  shell(b, f, x0, x1, y, top, ROOM, wall, floor);
  const k = kit(b, f, y), { box } = k;
  const solid = (u0: number, u1: number, h: number, d0: number, d1: number) => {
    const v = vol(f, Math.min(u0, u1), Math.max(u0, u1), d0, d1);
    b.block(v[0], y, v[1], v[2], y + h, v[3]);
  };
  /** A model facing out to the passage (0), into the room (2), or along the wall towards +u (1) or −u (3). */
  const N: [number, number] = f.axis === 'x' ? [0, f.n] : [f.n, 0], U: [number, number] = f.axis === 'x' ? [1, 0] : [0, 1];
  const prop = (id: string, u: number, d: number, turn: 0 | 1 | 2 | 3 = 0, yy = 0) => {
    const v: [number, number] = turn === 0 ? N : turn === 2 ? [-N[0], -N[1]] : turn === 1 ? U : [-U[0], -U[1]];
    const dir = b.dir(v), p = f.at + f.n * d;
    b.out.models.push({ kind: 'shops', id, pos: f.axis === 'x' ? b.pt(u, y + yy, p) : b.pt(p, y + yy, u), yaw: Math.atan2(-dir[0], -dir[1]) + 0, seed: 0, merge: true });
  };
  const back = -ROOM, door = x1 - 1.3;
  // Lights along the room, and the front on the passage.
  for (const d of [-1.4, -3.6]) box('light', x0 + 0.6, x1 - 0.6, top - 0.03, top, d - 0.1, d + 0.1);
  if (kind === 'noodle') {
    // Open to the passage under a curtain; the counter along the back, a standing shelf on one side.
    box('wood:#5a4636', x0 - 0.05, x1 + 0.05, top - 0.09, top - 0.05, D, D + 0.04);
    const n = Math.max(2, Math.round((x1 - x0) / 0.5)), w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) box(`flat:${shop.bg}`, x0 + i * w + 0.015, x0 + (i + 1) * w - 0.015, top - 0.54, top - 0.09, D + 0.01, D + 0.03);
    const bars = tile(x0 + 0.1, x1 - 0.1, 1.6);
    for (const u of bars) prop('potcounter', u, back + 0.4);
    solid(x0, x1, 1.05, back, back + 0.66);
    if (bars.length) solid(bars[0] - 0.75, bars[bars.length - 1] + 0.75, 0.62, back + 0.66, back + 1.05);
    for (const d of [-1.2, -2.9]) prop('winbar', x0 + 0.28, d, 3);
    solid(x0, x0 + 0.78, 1.05, -3.75, -0.35);
    prop('ticketm', x1 - 0.4, -0.5, 3);
    solid(x1 - 0.62, x1, 1.5, -0.82, -0.18);
    box('glow:#fff1d6', x0 + 0.2, x1 - 0.2, 1.6, 1.64, back + 0.02, back + 0.3);
    k.sign({ k: 'label', text: '食券をお買い求めください', sub: 'Buy a meal ticket first', fg: '#3a2a20', bg: '#f6efe0' }, x1 - 0.64, 1.75, -0.5, 0.6, 0.16);
  } else {
    // Glass front with an open doorway.
    for (const [p, q] of [[x0, door - 0.6], [door + 0.6, x1]]) {
      if (q - p < 0.05) continue;
      box('flat:#3a3d41', p, q, 0, 0.3, D - 0.05, D);
      box('glass', p, q, 0.3, top, D - 0.025, D - 0.012);
      solid(p, q, top, D - 0.06, D);
      const m = Math.round((q - p) / 1.6);
      for (let i = 1; i < m; i++) box('metal:#b9bdc2', p + ((q - p) * i) / m - 0.025, p + ((q - p) * i) / m + 0.025, 0.3, top, D - 0.04, D);
    }
    for (const u of [door - 0.6, door + 0.56]) box('metal:#b9bdc2', u, u + 0.04, 0, top, D - 0.05, D);
    box('metal:#b9bdc2', door - 0.6, door + 0.6, 2.15, top, D - 0.05, D);
    if (kind === 'cafe') {
      // A bar along the window, tables down one side, the counter and its shelves at the back.
      for (const u of tile(x0 + 0.1, door - 0.7, 1.7)) {
        prop('winbar', u, D - 0.3);
        solid(u - 0.8, u + 0.8, 1.05, D - 0.06, D - 0.62);
      }
      for (const d of [-1.3, -2.9]) {
        prop('table', x0 + 0.55, d, 1);
        solid(x0 + 0.15, x0 + 0.95, 0.85, d - 0.75, d + 0.75);
        prop('pendant', x0 + 0.55, d, 0, top);
      }
      const cases = tile(x0 + 1.6, x1 - 0.3, 1.22, 3);
      for (const u of cases) prop('showcase', u, back + 1.25);
      if (cases.length) solid(cases[0] - 0.61, cases[cases.length - 1] + 0.61, 1.1, back + 1.0, back + 1.5);
      for (const u of tile(x0 + 1.6, x1 - 0.3, 1.22)) prop('shelfunit', u, back + 0.17);
      solid(x0 + 1.6, x1, 1.8, back, back + 0.34);
      box(`flat:${shop.bg}`, x0, x1, top - 0.3, top, back + 0.34, back + 0.36);
    } else if (kind === 'silk') {
      // Bolts on racks round the walls, tables of cloth on a tatami step, kimono in the window.
      for (const u of tile(x0 + 0.4, x1 - 0.4, 1.22)) prop('boltrack', u, back + 0.2);
      solid(x0, x1, 1.7, back, back + 0.4);
      for (const d of tile(back + 0.6, -0.3, 1.22)) prop('boltrack', x0 + 0.2, d, 1);
      solid(x0, x0 + 0.4, 1.7, back, -0.3);
      const um = (x0 + x1) / 2;
      for (const d of [-1.9, -3.1]) {
        prop('bolttable', um, d, d < -2.5 ? 2 : 0);
        solid(um - 0.6, um + 0.6, 0.75, d - 0.25, d + 0.25);
      }
      for (const u of tile(x0 + 0.2, door - 0.8, 1.6)) {
        prop('kimonostand', u, D - 0.3);
        solid(u - 0.66, u + 0.66, 1.8, D - 0.42, D - 0.06);
      }
    } else {
      // Shelves round the walls, two racks back to back in the middle.
      for (const u of tile(x0 + 0.4, x1 - 0.4, 1.22)) prop('bookshelf', u, back + 0.17);
      solid(x0, x1, 2.0, back, back + 0.34);
      for (const d of tile(back + 0.5, -0.2, 1.22)) {
        prop('bookshelf', x0 + 0.17, d, 1);
        if (d < -1.6) prop('bookshelf', x1 - 0.17, d, 3);
      }
      solid(x0, x0 + 0.34, 2.0, back, -0.2);
      solid(x1 - 0.34, x1, 2.0, back, -1.7);
      const um = (x0 + x1) / 2 - 0.5;
      for (const u of [um - 0.6, um + 0.6]) {
        prop('magrack', u, -2.2, 0);
        prop('magrack', u, -2.62, 2);
      }
      solid(um - 1.12, um + 1.12, 1.3, -2.83, -2.0);
    }
    shopExtras(b, f, x0, x1, y, top, D, shop, door);
  }
  const z = vol(f, x0, x1, -ROOM, 0);
  b.zone('passage', z[0], y - 0.2, z[1], z[2], y + 2.4, z[3], shop.ja, shop.en);
  return true;
}

const WINDOWS = { bolts: 'win_bolts', kimono: 'win_kimono', cones: 'win_cones', furoshiki: 'win_cloths', swatches: 'win_swatch' };
/**
 * The inside of a narrow show window for one of the silk quarter's trades: metre-wide display
 * models side by side between x0 and x1, their backs `d` out from the wall (0.11 deep). Returns
 * how many fitted (none under a metre).
 */
export function showWindow(b: Builder, f: FrontFace, x0: number, x1: number, y: number, what: keyof typeof WINDOWS, d = 0): number {
  const k = kit(b, f, y), us = tile(x0, x1, 1.0);
  for (const u of us) k.put(WINDOWS[what], u, 0, d);
  return us.length;
}
/** The same for any other shop, by what it sells: sample dishes, books, or boxed goods. */
export function showWindowFor(b: Builder, f: FrontFace, x0: number, x1: number, y: number, shop: FrontShop, d = 0): number {
  const kind = frontKind(shop.en);
  const id = ['noodle', 'izakaya', 'cafe', 'bakery', 'sweets'].includes(kind) ? 'win_food' : kind === 'books' ? 'win_books' : 'win_goods';
  const k = kit(b, f, y), us = tile(x0, x1, 1.0);
  for (const u of us) k.put(id, u, 0, d);
  return us.length;
}

const INSET = 0.6;
/**
 * A full shop front for a wall that has no room in front of it: the front is set 0.6 m into the
 * wall, its glass flush with the wall face. False (nothing built) where the ground is not free.
 */
export function shopInset(b: Builder, f: FrontFace, x0: number, x1: number, y: number, top: number, shop: FrontShop): boolean {
  if (b.pt(0, y + 3.6, 0)[1] > GROUND_Y - 0.8 || !shopFits(b, f, x0, x1, y)) return false;
  const v = vol(f, x0 - 0.2, x1 + 0.2, -INSET - 0.25, -0.45);
  if (b.solidIn(v[0], y + 0.1, v[1], v[2], y + top, v[3])) return false;
  shell(b, f, x0, x1, y, top, INSET, 'flat:#f1ebdd', 'tile:#b9b4a6');
  shopPreset(b, { ...f, at: f.at - f.n * INSET }, x0, x1, y, top, INSET - 0.02, shop);
  return true;
}
