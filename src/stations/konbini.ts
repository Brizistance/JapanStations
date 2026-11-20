// Convenience stores (konbini) you can walk into.
//
// A shop is a small room made with the builder (floor, walls, an open doorway, ceiling, colliders)
// and dressed with Blender fittings (public/models/buildings/konbini.glb, tools/blender/
// build_konbini.py) and game signs. Models carry no collision, so every fitting gets a collider
// here, and the shop gets a zone so the walk test proves it can be entered.
//
// Four types, all in the same frame: the front stands on z = 0 and faces −z (the street or the
// passage), the shop runs back to z = D and from x = −W/2 to W/2, its floor at `y`.
//   corner    a stand-alone single-storey shop, fascia on the front and the −x side
//   ground    the ground floor of a building (the building above is a model with an open base)
//   kiosk     a small open-fronted shop inside a station
//   roadside  a larger shop behind a car park, with a pole sign
//
// Three invented chains. Names and colours are made up and recorded in docs/worldbuilding.md.

import type { Builder } from '../world/builder';
import { GROUND_Y, ceilingLight } from './kit';
import { roadModel } from './roads';

export type KonbiniType = 'corner' | 'ground' | 'kiosk' | 'roadside';
export type ChainId = 'maruhoshi' | 'asanagi' | 'hinode';

export const CHAINS: Record<ChainId, { ja: string; en: string; main: string; stripe: string; fg: string }> = {
  maruhoshi: { ja: 'マルホシマート', en: 'Maruhoshi Mart', main: '#0b8f6a', stripe: '#f2c230', fg: '#ffffff' },
  asanagi: { ja: 'あさなぎ', en: 'Asanagi', main: '#0e7f8c', stripe: '#f4f1e8', fg: '#ffffff' },
  hinode: { ja: 'ひのでストップ', en: 'Hinode Stop', main: '#c63d7a', stripe: '#27306b', fg: '#ffffff' },
};

/** Width, depth and ceiling height of each type's shop floor. */
export const KONBINI: Record<KonbiniType, { w: number; d: number; h: number }> = {
  corner: { w: 14, d: 9, h: 2.9 },
  ground: { w: 12, d: 10, h: 2.9 },
  kiosk: { w: 8, d: 5, h: 2.7 },
  roadside: { w: 16, d: 10, h: 2.9 },
};
/** Depth of a roadside shop's car park, in front of it. */
export const CAR_PARK = 12;

// build_konbini.py SIZES: each fitting's length (x), depth (z) and height, front towards −z.
const FIT: Record<string, [number, number, number]> = {
  gondola: [2.4, 0.9, 1.45], wallshelf: [2.4, 0.45, 1.9], fridge: [2.4, 0.75, 2.05], magrack: [2.4, 0.4, 1.35],
  counter: [3.2, 0.75, 1.0], backwall: [3.2, 0.3, 2.1], atm: [0.6, 0.6, 1.55], copier: [0.95, 0.65, 1.1],
  baskets: [0.5, 0.4, 0.75], bins: [1.6, 0.45, 0.95], polesign: [2.6, 0.4, 8.0], wheelstop: [1.8, 0.2, 0.14],
};

const WALL = 'flat:#f1f0ea', KICK = 'flat:#c9cbcc', FRAME = 'flat:#3b4046', FLOOR = 'floor:#e9e8e2';

export interface KonbiniOpts {
  type: KonbiniType;
  chain: ChainId;
  /** Floor level (default the pavement). */
  y?: number;
}

/**
 * Build one shop in the current frame (wrap it in Builder.with to place and turn it). Returns
 * nothing: everything, colliders and zone included, goes to the builder.
 */
export function konbini(b: Builder, o: KonbiniOpts) {
  const { w: W, d: D, h: H } = KONBINI[o.type];
  const chain = CHAINS[o.chain];
  const y = o.y ?? GROUND_Y;
  const under = y < -1;
  const kind = under ? 'konbiniu' : 'konbini';
  const top = y + H;
  const x0 = -W / 2, x1 = W / 2;
  /** A fitting at (x, z) with its front towards f; `solid` adds its collider. */
  const fit = (id: string, x: number, z: number, f: [number, number] = [0, -1], yy = y) => {
    const d = b.dir(f);
    b.out.models.push({ kind, id, pos: b.pt(x, yy, z), yaw: Math.atan2(-d[0], -d[1]) + 0, seed: 0, merge: true });
    const [l, dp, hh] = FIT[id];
    const hx = f[0] !== 0 ? dp / 2 : l / 2, hz = f[0] !== 0 ? l / 2 : dp / 2;
    b.block(x - hx, yy, z - hz, x + hx, yy + hh, z + hz);
  };
  /** The chain's fascia: a band in its colour with a stripe, and its name. `n` is the way it faces. */
  const fascia = (a0: number, a1: number, at: number, ya: number, yb: number, face: 'front' | 'left') => {
    const e = 0.14;
    if (face === 'front') {
      b.box(`flat:${chain.main}`, a0, ya, at - e, a1, yb, at);
      b.deco(`flat:${chain.stripe}`, a0, ya + 0.08, at - e - 0.01, a1, ya + 0.2, at);
      b.deco(`flat:${chain.stripe}`, a0, yb - 0.2, at - e - 0.01, a1, yb - 0.08, at);
      b.sign({ k: 'shop', ja: chain.ja, en: chain.en, bg: chain.main, fg: chain.fg }, (a0 + a1) / 2, (ya + yb) / 2, at - e - 0.012, [0, -1], Math.min(a1 - a0 - 0.8, 6.4), yb - ya - 0.5);
    } else {
      b.box(`flat:${chain.main}`, at - e, ya, a0, at, yb, a1);
      b.deco(`flat:${chain.stripe}`, at - e - 0.01, ya + 0.08, a0, at, ya + 0.2, a1);
      b.deco(`flat:${chain.stripe}`, at - e - 0.01, yb - 0.2, a0, at, yb - 0.08, a1);
      b.sign({ k: 'shop', ja: chain.ja, en: chain.en, bg: chain.main, fg: chain.fg }, at - e - 0.012, (ya + yb) / 2, (a0 + a1) / 2, [-1, 0], Math.min(a1 - a0 - 0.8, 6.4), yb - ya - 0.5);
    }
  };

  // ── Shell: floor, ceiling, back and side walls ──
  const stand = o.type === 'corner' || o.type === 'roadside';
  b.box(FLOOR, x0, y - 0.3, 0, x1, y + (under ? 0.006 : 0.03), D);
  b.box('ceil', x0, top, 0, x1, top + 0.2, D);
  b.box(WALL, x0, y, D, x1, top + 0.2, D + 0.2);
  for (const s of [-1, 1]) b.box(WALL, Math.min(s * W / 2, s * (W / 2 + 0.2)), y, 0, Math.max(s * W / 2, s * (W / 2 + 0.2)), top + 0.2, D + 0.2);
  for (let z = 1.2; z < D - 0.6; z += 2.2) for (let x = x0 + 1.2; x + 2.4 < x1; x += 3.6) ceilingLight(b, x, x + 2.4, z - 0.15, z + 0.15, top);
  // A stripe of the chain's colour round the walls under the ceiling.
  b.deco(`flat:${chain.main}`, x0, top - 0.32, D - 0.012, x1, top - 0.2, D);
  for (const s of [-1, 1]) b.deco(`flat:${chain.main}`, Math.min(s * W / 2, s * (W / 2 - 0.012)), top - 0.32, 0, Math.max(s * W / 2, s * (W / 2 - 0.012)), top - 0.2, D);

  // ── Front: an open shutter line for a kiosk; otherwise glass with an open doorway ──
  const big = D >= 8;
  const doorX = big ? x1 - 3.4 : 0; // the doorway's middle
  const FY = o.type === 'ground' ? y + 4.0 : top + 0.9; // top of the fascia
  if (o.type === 'kiosk') {
    b.box(FRAME, x0 - 0.2, top - 0.25, -0.3, x1 + 0.2, top + 0.2, 0);
    fascia(x0, x1, -0.3, top + 0.2, top + 0.95, 'front');
    for (const s of [-1, 1]) b.deco(FRAME, Math.min(s * W / 2, s * (W / 2 + 0.2)), y, -0.3, Math.max(s * W / 2, s * (W / 2 + 0.2)), top + 0.2, 0);
  } else {
    for (const [a, c] of [[x0, doorX - 0.9], [doorX + 0.9, x1]]) {
      if (c - a < 0.3) continue;
      b.block(a, y, -0.1, c, top, 0);
      b.deco(KICK, a, y, -0.1, c, y + 0.45, 0);
      b.deco('glass', a, y + 0.45, -0.06, c, top - 0.05, -0.04);
      b.deco(FRAME, a, top - 0.08, -0.1, c, top, 0);
      for (let x = a; x <= c + 0.01; x += Math.max(1.2, (c - a) / Math.max(1, Math.round((c - a) / 2.2)))) b.deco(FRAME, x - 0.04, y + 0.45, -0.1, x + 0.04, top, 0);
      // Posters low on the glass, as shops have.
      if (c - a > 3) for (let x = a + 1.2; x < c - 0.8; x += 2.4) b.sign({ k: 'poster', v: Math.abs(Math.round(x * 3 + W)) }, x, y + 1.25, -0.11, [0, -1], 0.7, 1.0);
    }
    // The doorway: frame, a mat, and a lintel sign.
    for (const s of [-1, 1]) b.deco(FRAME, doorX + s * 0.9 - 0.05, y, -0.12, doorX + s * 0.9 + 0.05, top, 0.02);
    b.deco(FRAME, doorX - 0.9, top - 0.3, -0.12, doorX + 0.9, top, 0.02);
    b.deco('flat:#3a3d42', doorX - 0.8, y, -0.9, doorX + 0.8, y + 0.035, 0.6);
    fascia(x0 - (stand ? 0.2 : 0), x1 + (stand ? 0.2 : 0), -0.1, top, FY, 'front');
  }
  if (stand) {
    // A stand-alone shop: a flat roof with plant, and the fascia carried round the −x side.
    b.box(WALL, x0 - 0.2, top + 0.2, -0.1, x1 + 0.2, FY, D + 0.2);
    b.deco(KICK, x0 - 0.3, FY, -0.2, x1 + 0.3, FY + 0.12, D + 0.3);
    b.deco('flat:#c9c8c0', x1 - 4, FY + 0.12, D - 3, x1 - 1.5, FY + 0.9, D - 1.2);
    b.deco('flat:#c9c8c0', x0 + 2, FY + 0.12, D - 2.6, x0 + 3.2, FY + 0.8, D - 1.4);
    fascia(-0.1, D + 0.2, x0 - 0.2, top, FY, 'left');
  }

  // ── Fittings ──
  // Drinks fridges along the back wall.
  const nF = Math.floor((W - 0.3) / 2.4);
  for (let i = 0; i < nF; i++) fit('fridge', x0 + 0.15 + 1.2 + i * 2.4, D - 0.375);
  if (big) {
    // Till on the +x side just inside the door, facing the shop; its back wall behind the staff.
    fit('counter', x1 - 1.35, 2.5, [-1, 0]);
    fit('backwall', x1 - 0.15, 2.5, [-1, 0]);
    b.sign({ k: 'label', text: 'レジ', sub: 'Till', fg: '#fff', bg: chain.main }, x1 - 1.35, top - 0.5, 2.5, [-1, 0], 1.4, 0.3);
    // Gondola rows parallel to the front, leaving the till side clear.
    const nG = Math.floor((W - 5.8) / 2.4);
    for (let z = 3.0; z + 0.45 < D - 0.75 - 1.2; z += 2.2) for (let i = 0; i < nG; i++) fit('gondola', x0 + 1.9 + 1.2 + i * 2.4, z);
    // Magazines along the front window, cash machine and copier on the −x wall, baskets by the door.
    const nM = Math.floor((doorX - 0.9 - x0 - 0.4) / 2.4);
    for (let i = 0; i < Math.min(nM, 3); i++) fit('magrack', x0 + 0.3 + 1.2 + i * 2.4, 0.22, [0, 1]);
    fit('atm', x0 + 0.32, 1.5, [1, 0]);
    fit('copier', x0 + 0.34, 2.7, [1, 0]);
    for (let z = 4.4; z + 2.4 < D - 0.8; z += 2.4) fit('wallshelf', x0 + 0.24, z + 1.2, [1, 0]);
    fit('baskets', doorX - 1.3, 0.9, [0, 1]);
    fit('bins', doorX - 2.6, -0.42);
  } else {
    // Kiosk: the till along the +x side, one gondola, shelves on the −x wall.
    fit('counter', x1 - 0.9, 2.1, [-1, 0]);
    fit('gondola', -1.0, 2.3);
    fit('wallshelf', x0 + 0.24, 2.2, [1, 0]);
    fit('baskets', x0 + 0.5, 0.4, [0, 1]);
  }

  // ── Roadside: a car park in front with a pole sign ──
  if (o.type === 'roadside') {
    b.deco('asphalt', x0 - 0.2, y, -CAR_PARK, x1 + 0.2, y + 0.02, -1.4);
    for (let i = 0; i <= 5; i++) {
      const x = x0 + 1 + i * 2.7;
      b.deco('flat:#e9e9e4', x - 0.05, y + 0.02, -6.4, x + 0.05, y + 0.026, -1.6);
      if (i < 5) fit('wheelstop', x + 1.35, -2.0);
    }
    fit('polesign', x0 + 1.4, -CAR_PARK + 0.8);
    for (const s of [-1, 1] as const) b.sign({ k: 'shop', ja: chain.ja, en: chain.en, bg: chain.main, fg: chain.fg }, x0 + 1.4, y + 6.7, -CAR_PARK + 0.8 + s * 0.19, [0, s], 2.5, 2.5);
    roadModel(b, 'kei_w', x0 + 3.7, 0, -4.0, [0, -1]);
    b.block(x0 + 2.9, y, -5.8, x0 + 4.5, y + 1.7, -2.2);
    roadModel(b, 'sedan_s', x0 + 9.1, 0, -4.2, [0, 1]);
    b.block(x0 + 8.2, y, -6.5, x0 + 10, y + 1.5, -1.9);
  }

  b.zone('passage', x0, y - 0.2, 0, x1, top, D, chain.ja, `${chain.en} (convenience store)`, !under);
}
