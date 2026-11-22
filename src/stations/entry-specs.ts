// Each station's entry area (CLAUDE.md rule 9), drawn by entry.ts. Data only.

import type { StationId } from '../data/types';
import type { Finishes } from './looks/types';
import type { SHOPS } from './looks/parts';

type BrandKey = keyof typeof SHOPS;
/** The model in a station's display case (fill.ts). */
export type DisplayTheme = 'lens' | 'anchor' | 'firefly' | 'skylark' | 'crane' | 'blossom' | 'forest' | 'temple' | 'slope' | 'dogwood' | 'canal';
type Where = { in?: 'paid' | 'unpaid' };
/** Something in a ticket hall (fill.ts): in the paid area unless `in: 'unpaid'`. */
export type FillItem = Where & (
  | { k: 'shop'; brand: BrandKey; front?: 'glazed' | 'counter' | 'stall'; w?: number; awning?: boolean }
  | { k: 'kiosk'; brand: BrandKey }
  | { k: 'island'; lo: BrandKey[]; hi: BrandKey[] }
  | { k: 'benches' }
  | { k: 'vending' }
  | { k: 'waiting' }
  | { k: 'display'; theme: DisplayTheme; ja: string; en: string }
  | { k: 'gallery'; theme: 'terraces'; ja: string; en: string }
);

export type StreetForm = 'vault' | 'portal' | 'open' | 'pavilion' | 'brick' | 'slab' | 'louvre' | 'glassbox';

export interface EntrySpec {
  street: StreetForm;
  /** Main structure colour ('#rrggbb'). */
  frame: string;
  /** Accent colour ('#rrggbb'). */
  trim: string;
  well: {
    /** Stair-wall cladding material, e.g. 'tile:#2f3e56'. */
    clad: string;
    /** Cladding height above the steps (m, ≤ 2.4). */
    height: number;
    /** Stripe colour along the cladding's top edge. */
    stripe: string;
    lamps: 'wall' | 'globe' | 'strip';
    /** Handrail colour. */
    rail: string;
  };
  /** Exits whose stair comes up inside a building (Aobadai's exit house): a rail on the parapets, no street structure. */
  indoors?: string[];
  /** Ticket-hall finishes (the look's own finishes win where both set one). */
  hall: Finishes;
  /** What stands in the ticket hall: shops, services and the station's own local feature. */
  fill?: FillItem[];
  /**
   * Floor lines the stairs alone do not give (fill.ts floorLines): a line's colour along these
   * points (station frame x, z), from inside the gates to where that line's way down starts.
   */
  routes?: { line: string; pts: [number, number][] }[];
}

export const ENTRY: Partial<Record<StationId, EntrySpec>> = {
  // ── Ichō Line ──
  // Harbour warehouses: a brick entrance house, navy tile down, brass rails.
  ikarimachi: {
    street: 'brick', frame: '#7a3b2e', trim: '#2f3e56',
    well: { clad: 'tile:#2f3e56', height: 1.6, stripe: '#c99a06', lamps: 'wall', rail: '#b08d57' },
    hall: { wall: 'tile:#e4ded2', ceil: 'panel:#dfe3e6' },
    fill: [
      { k: 'display', theme: 'anchor', ja: '錨町の港', en: 'The port of Ikarimachi', in: 'unpaid' },
      { k: 'kiosk', brand: 'tsubameya', in: 'unpaid' },
    ],
  },
  // Lighthouse avenue: a white portal banded in red, globe lamps down a white stair.
  'todai-dori': {
    street: 'portal', frame: '#f2f2ee', trim: '#b8322a',
    well: { clad: 'panel:#e9eef2', height: 2.2, stripe: '#b8322a', lamps: 'globe', rail: '#9aa0a6' },
    hall: { wall: 'panel:#eef1f3', pillar: 'tile:#c9473d' },
    fill: [
      { k: 'display', theme: 'lens', ja: '灯台のレンズ', en: 'A lighthouse lens' },
      { k: 'shop', brand: 'nagiCafe', front: 'counter', w: 4.2, awning: true },
      { k: 'benches' },
    ],
  },
  // Firefly river: a dark louvred frame with glowing yellow-green, deep green tile.
  hotarugawa: {
    street: 'louvre', frame: '#24302b', trim: '#c8d94a',
    well: { clad: 'tile:#2d3a35', height: 2.0, stripe: '#c8d94a', lamps: 'wall', rail: '#5b6b63' },
    hall: { wall: 'tile:#dfe6e1', floor: 'floor:#9aa39d', pillar: 'tile:#2d3a35' },
    fill: [
      { k: 'display', theme: 'firefly', ja: '蛍川のほたる', en: 'Fireflies of Hotarugawa' },
      { k: 'vending', in: 'unpaid' },
      { k: 'benches', in: 'unpaid' },
    ],
  },
  // Bird-clapper slope above the rice terraces: a timber pavilion, wood-lined stair.
  narukozaka: {
    street: 'pavilion', frame: '#8a5a35', trim: '#3d3a36',
    well: { clad: 'wood:#a5784f', height: 1.2, stripe: '#3d3a36', lamps: 'globe', rail: '#7a5233' },
    hall: { wall: 'tile:#efe6d6', floor: 'floor:#c8b9a0', pillar: 'wood:#a5784f' },
    fill: [
      { k: 'gallery', theme: 'terraces', ja: '鳴子坂 棚田の四季', en: 'The Narukozaka terraces through the year' },
      { k: 'shop', brand: 'narukoMarket', front: 'stall', w: 4.8 },
      { k: 'waiting' },
    ],
  },
  // Sea forest: a teal barrel vault, sea-glass tile.
  uminomori: {
    street: 'vault', frame: '#2f6f73', trim: '#e8f1ef',
    well: { clad: 'tile:#d4e6e2', height: 1.8, stripe: '#2f6f73', lamps: 'wall', rail: '#c3c7cb' },
    hall: { wall: 'tile:#e3efec', floor: 'floor:#c2cfcc' },
    fill: [
      { k: 'display', theme: 'forest', ja: '海の森ができるまで', en: 'How the sea forest grew' },
      { k: 'shop', brand: 'kajitsudo', front: 'counter', w: 3.6 },
    ],
    // The Ichō Line is down from the far end of the atrium gallery: along its east walkway.
    routes: [{ line: 'G', pts: [[26.6, 12.6], [14.2, 12.6], [14.2, 46.3], [7.8, 46.3]] }],
  },
  // South harbour heights: a cantilevered concrete slab, grey panels, a light line up the stair.
  nankodai: {
    street: 'slab', frame: '#8e9396', trim: '#c99a06',
    well: { clad: 'panel:#c9cdd0', height: 2.3, stripe: '#c99a06', lamps: 'strip', rail: '#6f7479' },
    hall: { wall: 'panel:#e2e4e6', floor: 'floor:#b9bcbf', pillar: 'panel:#8e9396' },
    fill: [
      { k: 'display', theme: 'crane', ja: '南港の荷役', en: 'Cargo work at Nankō' },
    ],
  },
  // Spring meadow: an open stair between railings and lamp posts, blossom-pink tile.
  harunodai: {
    street: 'open', frame: '#3b4a3f', trim: '#e7a0b8',
    well: { clad: 'tile:#f1e3e6', height: 1.4, stripe: '#9cbf4a', lamps: 'strip', rail: '#c3c7cb' },
    hall: { wall: 'tile:#f4ece9', floor: 'floor:#d6cdc4', pillar: 'tile:#e7c3cf' },
    fill: [
      { k: 'display', theme: 'blossom', ja: '春の春野台', en: 'Harunodai in spring' },
      { k: 'shop', brand: 'hanaNoMinato', front: 'stall', w: 3.6 },
    ],
    // The Sumire Line is up: its stairs climb from the hall's centre line at x = ±19.
    routes: [
      { line: 'M', pts: [[22.6, 2.2], [19.3, 2.2]] },
      { line: 'M', pts: [[-22.6, 2.2], [-19.3, 2.2]] },
    ],
  },
  // New skylark meadow: a glass box with rounded eaves in violet, lavender tile.
  'shin-hibarino': {
    street: 'glassbox', frame: '#4b3f6b', trim: '#c99a06',
    well: { clad: 'tile:#e6e3ee', height: 2.0, stripe: '#7b5ea7', lamps: 'globe', rail: '#9aa0a6' },
    hall: { wall: 'tile:#ece9f2', floor: 'floor:#cfccd6', pillar: 'tile:#7b5ea7' },
    fill: [
      { k: 'island', lo: ['maruhoshiMart'], hi: ['hinataBakery'] },
      { k: 'display', theme: 'skylark', ja: 'ひばりの原っぱ', en: 'The skylark meadow' },
    ],
    // The Ichō Line is down the transfer tunnel, through its door in the +z wall.
    routes: [{ line: 'G', pts: [[11.6, 9.4], [-24, 9.4], [-24, 11.9]] }],
  },

  // ── Sumire Line ──
  // Hillside terminus below the temple wood: a vermilion timber pavilion, plum tile down.
  seiran: {
    street: 'pavilion', frame: '#8a2a2a', trim: '#2b2e33',
    well: { clad: 'tile:#6b3a4e', height: 1.5, stripe: '#c2368f', lamps: 'globe', rail: '#7a5233' },
    hall: { wall: 'tile:#f2ecef', floor: 'floor:#cfc6cb', pillar: 'tile:#6b3a4e' },
    fill: [
      { k: 'display', theme: 'temple', ja: '清嵐寺の山門', en: 'The gate of Seiran-ji' },
      { k: 'shop', brand: 'tsumugian', front: 'counter', w: 3.6, awning: true },
      { k: 'benches', in: 'unpaid' },
    ],
  },
  // Dogwood street: a white glass barrel vault trimmed pink, blush tile down.
  hanamizuki: {
    street: 'vault', frame: '#e8e2da', trim: '#d98aa0',
    well: { clad: 'tile:#f6e1e7', height: 1.9, stripe: '#d98aa0', lamps: 'wall', rail: '#c3c7cb' },
    hall: { wall: 'panel:#faf6f2', floor: 'floor:#dcd4cc', pillar: 'tile:#e9b3c2' },
    fill: [
      { k: 'display', theme: 'dogwood', ja: 'はなみずき通りの春', en: 'Dogwood Street in spring' },
      { k: 'island', lo: ['bakeryKomugi'], hi: ['ryubundo'] },
      { k: 'vending', in: 'unpaid' },
    ],
  },
  // Old town by the canal: a dark timber portal banded cherry pink, indigo tile down.
  'minami-sakuragawa': {
    street: 'portal', frame: '#3a2f2a', trim: '#d97aa6',
    well: { clad: 'tile:#2f3e5c', height: 1.3, stripe: '#d97aa6', lamps: 'wall', rail: '#b08d57' },
    hall: { wall: 'tile:#eef1f4', floor: 'floor:#c9ccce', pillar: 'tile:#3a2f2a' },
    fill: [
      { k: 'display', theme: 'canal', ja: '南桜橋と堀', en: 'The canal at Minami-Sakura-bashi' },
      { k: 'shop', brand: 'namima', front: 'stall', w: 3.6 },
      { k: 'waiting', in: 'unpaid' },
    ],
  },
  // ── Yanagisuji Line ──
  // Hillside garden suburb: Exit 1 comes up inside the exit house; Exit 2 under a timber pavilion
  // trimmed in the arcade's sage, sage tile down, a cedar-slatted ticket hall over the old sage tiles.
  aobadai: {
    street: 'pavilion', frame: '#6b4f37', trim: '#4e7a5a', indoors: ['1'],
    well: { clad: 'tile:#4e7a5a', height: 1.4, stripe: '#e3d3a8', lamps: 'globe', rail: '#6b4f37' },
    hall: { ceil: 'wood:#cbb48e' },
    fill: [
      { k: 'shop', brand: 'yanagiFlowers', front: 'stall', w: 3.6 },
      { k: 'benches' },
      { k: 'vending', in: 'unpaid' },
    ],
  },
};
