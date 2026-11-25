// The streets north-east of Kawaminato-kō (2026-11-24, stage 2 of the north districts), in world x, z: the
// diagonal avenue 帆影大通 Hokage-ōdōri, the quay road, and the streets of the grid it cuts. Kita-Hatoba's world
// (hatoba-street.ts) draws them; their traffic is Kawaminato-kō's street's (minato-street.ts), one sim with
// the boulevard, so cars turn between them (traffic/system.ts: angled turns, chain lanes).

import type { LanePart, V3 } from '../world/builder';

export interface Street {
  id: string;
  ja: string;
  en: string;
  /** A point on its centre line and its unit heading (the way its first lane runs). */
  ax: number;
  az: number;
  ux: number;
  uz: number;
  /** Where its lanes begin and end, along the heading from (ax, az): a number, or the street it ends at. */
  s0: number | string;
  s1: number | string;
  /** Half the carriageway, each lane's distance from the centre line, the pavements' width each side. */
  half: number;
  lane: number;
  pave: number;
  /** Signal road (signs/draw.ts axis): 0 the east–west streets, 1 the rest. */
  axis: 0 | 1;
  speed: number;
}

const D30 = Math.PI / 6;
/** The avenue: its centre on the boulevard's north building line, and its heading north-west (30° off north). */
export const AVE = { ax: 700, az: -19.5, ux: -Math.sin(D30), uz: -Math.cos(D30) };
/** The avenue's centre line at z. */
export const aveX = (z: number) => AVE.ax + ((z - AVE.az) / AVE.uz) * AVE.ux;
/** 帆影広場 Hokage Hiroba: on the avenue's line past its last junction, and its radius (pedestrian). */
export const PLAZA = { x: aveX(-336), z: -336, r: 24 };
/** The avenue's cross-section, to the right of its heading: carriageways 1.5 … 8.5 each side of the median, pavements to 15. */
export const AVE_X = { median: 1.5, kerb: 8.5, edge: 15 };

export const STREETS: Street[] = [
  { id: 'ave', ja: '帆影大通', en: 'Hokage-ōdōri', ...AVE, s0: 'boulevard', s1: 'todai', half: AVE_X.kerb, lane: 5, pave: AVE_X.edge - AVE_X.kerb, axis: 1, speed: 40 / 3.6 },
  { id: 'quay', ja: '岸壁通', en: 'Ganpeki-dōri', ax: 746, az: 0, ux: 0, uz: -1, s0: 'boulevard', s1: 'kita', half: 6, lane: 2.4, pave: 2, axis: 1, speed: 30 / 3.6 },
  { id: 'hokushin', ja: '北辰通', en: 'Hokushin-dōri', ax: 175, az: -259.5, ux: 1, uz: 0, s0: 'hob', s1: 'quay', half: 3.5, lane: 1.6, pave: 2, axis: 0, speed: 30 / 3.6 },
  { id: 'todai', ja: '灯台通', en: 'Tōdai-dōri', ax: 480, az: -301, ux: 1, uz: 0, s0: 'kamome', s1: 'quay', half: 4, lane: 2, pave: 3.5, axis: 0, speed: 30 / 3.6 },
  { id: 'kamome', ja: '鴎通', en: 'Kamome-dōri', ax: 480, az: 0, ux: 0, uz: -1, s0: 'boulevard', s1: 'kita', half: 3.5, lane: 1.6, pave: 2.5, axis: 1, speed: 30 / 3.6 },
  // (Stage B of the re-lay, 2026-11-24: Kamome-dōri carried south to the boulevard; Rashin-dōri and Shioji-dōri cut the deep blocks.)
  { id: 'rashin', ja: '羅針通', en: 'Rashin-dōri', ax: 590, az: 0, ux: 0, uz: -1, s0: 'boulevard', s1: 'shioji', half: 4.5, lane: 2.25, pave: 2.5, axis: 1, speed: 30 / 3.6 },
  { id: 'shioji', ja: '汐路通', en: 'Shioji-dōri', ax: 480, az: -140, ux: 1, uz: 0, s0: 'kamome', s1: 'quay', half: 3.5, lane: 1.6, pave: 2.5, axis: 0, speed: 30 / 3.6 },
  { id: 'kita', ja: '北岸通', en: 'Kitagishi-dōri', ax: 480, az: -470, ux: 1, uz: 0, s0: 'kamome', s1: 'quay', half: 3.5, lane: 1.6, pave: 2.5, axis: 0, speed: 30 / 3.6 },
];
/** Streets the lanes cross that Kawaminato-kō lays itself: the boulevard, its back street and its two cross streets carried on north. */
export const GRID: Street[] = [
  { id: 'boulevard', ja: '湊浦通', en: 'Minatoura-dōri', ax: 0, az: 0, ux: 1, uz: 0, s0: 0, s1: 900, half: 9, lane: 2.25, pave: 10.5, axis: 0, speed: 50 / 3.6 },
  { id: 'tsuna', ja: '綱町通', en: 'Tsunamachi-dōri', ax: 0, az: -54, ux: 1, uz: 0, s0: 0, s1: 'quay', half: 4.5, lane: 2.25, pave: 2.5, axis: 0, speed: 30 / 3.6 },
  { id: 'hob', ja: '帆柱筋', en: 'Hobashira-suji', ax: 245, az: 0, ux: 0, uz: -1, s0: 0, s1: 'hokushin', half: 4.5, lane: 2.25, pave: 2.5, axis: 1, speed: 30 / 3.6 },
  { id: 'san', ja: '桟橋筋', en: 'Sanbashi-suji', ax: 395, az: 0, ux: 0, uz: -1, s0: 0, s1: 'hokushin', half: 6, lane: 3.2, pave: 4, axis: 1, speed: 30 / 3.6 },
];
const ALL = [...STREETS, ...GRID];
export const street = (id: string) => ALL.find((s) => s.id === id)!;

/** Where street a's centre line meets street b's, as a distance along a; and the sine of the angle between them. */
export function meet(a: Street, b: Street): { s: number; sin: number } | null {
  const det = a.ux * b.uz - a.uz * b.ux;
  if (Math.abs(det) < 1e-6) return null;
  const dx = b.ax - a.ax, dz = b.az - a.az;
  return { s: (dx * b.uz - dz * b.ux) / det, sin: Math.abs(det) };
}
/** Distance along street a where it ends at `end` (a number, or the street it meets there), and which way past the meeting its lanes reach. */
function endAt(a: Street, end: number | string, sign: 1 | -1): { s: number; past: number } {
  if (typeof end === 'number') return { s: end, past: 0 };
  const b = street(end), m = meet(a, b)!;
  // Just past the far lane of the street it meets (or, a T on the boulevard, past its lanes as the cross streets' are).
  const reach = (b.lane + 0.6) / m.sin;
  return { s: m.s, past: sign * reach };
}
/**
 * The street's two ends as distances along it, each just past the far lane of the street it ends at: along its
 * centre line, or along a line `off` to the left of it (a lane's own, which at a slant meets the other street elsewhere).
 */
export function ends(a: Street, off = 0): [number, number] {
  const l = { ...a, ax: a.ax + a.uz * off, az: a.az - a.ux * off };
  const e0 = endAt(l, a.s0, -1), e1 = endAt(l, a.s1, 1);
  return [e0.s + e0.past, e1.s + e1.past];
}

/** Stop lines for a lane on street a, heading +1 or −1 along it, from its start at distance `from`: one before every street it crosses or meets. */
export function stopsFor(a: Street, dir: 1 | -1, from: number, to: number, only?: string[]): LanePart["stops"] {
  const out: LanePart['stops'] = [];
  for (const b of ALL) {
    if (b === a || (only && !only.includes(b.id))) continue;
    const m = meet(a, b);
    if (!m) continue;
    // (Only where b's own extent reaches: its ends, or the boulevard's.)
    const [b0, b1] = b.id === 'boulevard' ? [-1e9, 1e9] : ends(b);
    const back = meet(b, a)!.s;
    if (back < Math.min(b0, b1) - 1 || back > Math.max(b0, b1) + 1) continue;
    const t = dir > 0 ? m.s - from : from - m.s, hh = b.half / m.sin;
    if (t - hh < 4 || t > Math.abs(to - from) + 0.5) continue;
    out.push({ at: t - hh - 5.7, axis: a.axis, exit: t + hh + 0.3 });
  }
  return out.sort((p, q) => p.at - q.at);
}

/** Both lanes of a street (world x, z), chained (a vehicle turned onto one chooses again there); dead at a T, fed by turns only. */
export function streetLanes(a: Street): LanePart[] {
  const lx = a.uz, lz = -a.ux; // left of the heading
  const pt = (s: number, side: number): V3 => [a.ax + a.ux * s + lx * a.lane * side, 0, a.az + a.uz * s + lz * a.lane * side];
  const base = { speed: a.speed, flow: 0, use: 'all' as const, taxi: 0.05, halts: [], chain: true, angled: a.id === 'ave' || undefined };
  // (Each lane reaches just past the far lane of the street at either end, along its own line.)
  const [f0, f1] = ends(a, a.lane), [b0, b1] = ends(a, -a.lane);
  const fwd: LanePart = { ...base, from: pt(f0, 1), to: pt(f1, 1), stops: stopsFor(a, 1, f0, f1), dead: typeof a.s1 === 'string' };
  const back: LanePart = { ...base, from: pt(b1, -1), to: pt(b0, -1), stops: stopsFor(a, -1, b1, b0), dead: typeof a.s0 === 'string' };
  return [fwd, back];
}

/** Every lane of the north-east streets (world coordinates). */
export const northLanes = (): LanePart[] => STREETS.flatMap(streetLanes);
