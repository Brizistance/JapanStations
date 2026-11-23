// Departure boards (発車標): the board over each platform track and the concourse summary.
// Each board is a pure model (what it shows right now, read from the timetable and the
// trains) drawn one of two ways, by the line's era (board-style.ts): a 3-colour dot-matrix
// LED or a full-colour LCD. Nothing here invents a time: every time is a timetable time.

import { LINES, OPERATOR, lineById, linesAt, stationById, terminusOf } from '../data/network';
import type { Dir, LineDef, StationDef } from '../data/types';
import { clock, formatClock, lineSim } from '../sim';
import { temperatureNow, today } from '../sim/climate';
import { WEATHER_NAME, drawWeatherIcon, typhoonNotice } from './weather-icon';
import { nextArrivals, nextDepartures, trainStateAt } from '../sim/timetable';
import { lineBoard, stationBoard, type BoardStyle } from './board-style';
import type { SignContent } from './content';
import { FONT, lineBadge, rr, text } from './draw';

type Ctx = CanvasRenderingContext2D;
type DepC = Extract<SignContent, { k: 'dep' }>;
type DepAllC = Extract<SignContent, { k: 'depAll' }>;

export const platformNo = (st: StationDef, line: LineDef, dir: Dir) => st.platforms[line.id][dir === 'down' ? 0 : 1];
/** Trains in this direction take passengers here (false at the terminus they run to). */
export const boards = (line: LineDef, st: StationDef, dir: Dir) => terminusOf(line, dir).id !== st.id;

/**
 * The next trains at one platform: the platform's own line, plus any line that runs on its
 * track and stops here (Sumire trains at the Shiokaze platforms). Boarding departures, or
 * terminating arrivals at the end of a line, in order of arrival.
 */
export function platformTrains(line: LineDef, st: StationDef, dir: Dir, now: number, count: number) {
  const lines = [line, ...LINES.filter((l) => l.shares?.line === line.id && l.stops.includes(st.id))];
  return lines
    .flatMap((l) => {
      const { tt } = lineSim(l.id);
      const stop = l.stops.indexOf(st.id), boarding = boards(l, st, dir);
      const list = boarding ? nextDepartures(tt, stop, dir, now, count) : nextArrivals(tt, stop, dir, now, count);
      return list.map((d) => ({ ...d, line: l, boarding }));
    })
    .sort((a, b) => a.arr - b.arr)
    .slice(0, count);
}

// ── Level crossings ──

/** Dev override (window.__sim.crossing): true or false forces every crossing, null follows the trains. */
export const crossingTest: { force: boolean | null } = { force: null };

/**
 * Whether the level crossing by a station is closed: from 35 s before a train of the line (either
 * way) reaches the station until 12 s after it leaves. Read from the timetable, like the boards.
 */
export function crossingActive(lineId: string, stationId: string, now: number): boolean {
  if (crossingTest.force !== null) return crossingTest.force;
  const line = LINES.find((l) => l.id === lineId), st = stationById(stationId);
  if (!line || !line.stops.includes(stationId)) return false;
  return (['down', 'up'] as const).some((dir) => platformTrains(line, st, dir, now - 12, 2).some((d) => d.arr - 35 <= now && now <= d.dep + 12));
}

// ── Model ──

/** Seconds each language stays up before the board switches. */
export const LANG_S = 4;
export const langEn = (wall: number) => Math.floor(wall / LANG_S) % 2 === 1;
/** "A train is approaching" this long before it arrives. */
const APPROACH_S = 45;
/** "Departing, doors closing" this long before it leaves. */
const CLOSING_S = 8;

export type Status = 'none' | 'wait' | 'approach' | 'boarding' | 'closing' | 'terminating';

export function statusOf(d: { arr: number; dep: number; boarding: boolean } | undefined, now: number): Status {
  if (!d) return 'none';
  if (now >= d.arr) return !d.boarding ? 'terminating' : now >= d.dep - CLOSING_S ? 'closing' : 'boarding';
  return d.arr - now < APPROACH_S ? 'approach' : 'wait';
}

export function statusText(s: Status, d: { arr: number; dep: number } | undefined, now: number, en: boolean): string {
  if (!d) return '';
  const m = Math.max(1, Math.ceil((d.arr - now) / 60));
  switch (s) {
    case 'wait': return en ? `Next train in about ${m} min` : `つぎの電車は 約${m}分後に到着します`;
    case 'approach': return en ? 'A train is approaching' : 'まもなく電車がまいります';
    case 'boarding': return en ? `Now boarding — departs ${formatClock(d.dep)}` : `電車が停車中です  ${formatClock(d.dep)}発`;
    case 'closing': return en ? 'Departing — doors closing' : 'まもなく発車します  ドアが閉まります';
    case 'terminating': return en ? 'Not in service — please do not board' : 'この電車にはご乗車になれません';
    default: return '';
  }
}

/**
 * Where a train bound for `st` is, in stops still to run: 0 at the platform, 1 at the
 * previous stop, 2 two stops back, fractions while running between them. Null when it is
 * further away, heading the other way, or not in service yet.
 */
export function approachOf(line: LineDef, st: StationDef, dir: Dir, train: number, now: number): number | null {
  const i = line.stops.indexOf(st.id);
  const tt = lineSim(line.id).tt;
  const s = trainStateAt(tt, train, now), p = s.phase;
  if (p.dir !== dir) return null;
  const sg = dir === 'down' ? 1 : -1;
  let away: number;
  if (p.kind === 'dwell') {
    if (p.stop < 0 || p.role === 'reverse') return null;
    away = (i - p.stop) * sg;
  } else {
    if (p.toStop < 0 || !p.inService) return null;
    // Time through the run stands in for distance: close enough for a lamp.
    const tau = ((now - tt.offset - train * tt.headway) % tt.cycle + tt.cycle) % tt.cycle;
    const f = Math.min(1, Math.max(0, (tau - p.t0) / (p.t1 - p.t0)));
    away = (i - p.toStop) * sg + (1 - f);
  }
  return away >= 0 && away <= 2 ? away + 0 : null; // + 0 turns −0 into 0
}

export interface DepRow {
  line: LineDef;
  arr: number;
  dep: number;
  train: number;
  boarding: boolean;
  dest: StationDef;
}

export interface DepModel {
  style: BoardStyle;
  station: StationDef;
  line: LineDef;
  dir: Dir;
  platform: number;
  rows: DepRow[];
  status: Status;
  /** Approach of the first train (see approachOf). */
  away: number | null;
  /** [two stops back, previous stop, this station] on the first train's line; null past the end. */
  approachStops: (StationDef | null)[];
  en: boolean;
  /** Scrolling text: both languages. */
  ticker: string;
  now: number;
  wall: number;
}

const thanks = [`${OPERATOR.nameJa}をご利用いただきありがとうございます`, `Thank you for riding ${OPERATOR.nameEn}`];
const SEP = '　◆　';

export function depModel(c: DepC, now: number, wall: number): DepModel {
  const st = stationById(c.station), line = lineById(c.line), style = lineBoard(line.id);
  const rows: DepRow[] = platformTrains(line, st, c.dir, now, style === 'led' ? 2 : 3)
    .map((d) => ({ line: d.line, arr: d.arr, dep: d.dep, train: d.train, boarding: d.boarding, dest: terminusOf(d.line, c.dir) }));
  const first = rows[0];
  const status = statusOf(first, now);
  const away = first ? approachOf(first.line, st, c.dir, first.train, now) : null;
  const ref = first?.line ?? line;
  const i = ref.stops.indexOf(st.id), sg = c.dir === 'down' ? 1 : -1;
  const back = (k: number) => {
    const j = i - sg * k;
    return j >= 0 && j < ref.stops.length ? stationById(ref.stops[j]) : null;
  };
  // Transfers: other lines here, not counting one that runs on this very track.
  const others = linesAt(st.id).filter((l) => l.id !== line.id && l.shares?.line !== line.id && line.shares?.line !== l.id);
  const ticker = [
    statusText(status, first, now, false), statusText(status, first, now, true),
    ...typhoonNotice(now),
    ...(others.length ? [`${others.map((l) => l.nameJa).join('・')}はお乗り換えです`, `Transfer here for the ${others.map((l) => l.nameEn).join(' and ')}`] : []),
    ...thanks,
  ].filter(Boolean).join(SEP);
  return {
    style, station: st, line, dir: c.dir, platform: platformNo(st, line, c.dir), rows, status, away,
    approachStops: [back(2), back(1), st], en: langEn(wall), ticker, now, wall,
  };
}

export interface DepAllRow {
  line: LineDef;
  dir: Dir;
  platform: number;
  dest: StationDef;
  deps: { arr: number; dep: number }[];
  status: Status;
}
export interface DepAllModel {
  style: BoardStyle;
  station: StationDef;
  rows: DepAllRow[];
  en: boolean;
  ticker: string;
  now: number;
  wall: number;
}

/** The (line, direction) pairs that board at a station: one concourse row each. */
export function depAllRows(stationId: string): { line: LineDef; dir: Dir }[] {
  const st = stationById(stationId);
  const rows: { line: LineDef; dir: Dir }[] = [];
  for (const l of linesAt(st.id)) for (const dir of ['down', 'up'] as Dir[]) if (boards(l, st, dir)) rows.push({ line: l, dir });
  return rows;
}

export function depAllModel(c: DepAllC, now: number, wall: number): DepAllModel {
  const st = stationById(c.station);
  const rows = depAllRows(st.id).map(({ line, dir }) => {
    const deps = nextDepartures(lineSim(line.id).tt, line.stops.indexOf(st.id), dir, now, 2);
    return { line, dir, platform: platformNo(st, line, dir), dest: terminusOf(line, dir), deps, status: statusOf(deps[0] && { ...deps[0], boarding: true }, now) };
  });
  const soon = [...rows].filter((r) => r.deps[0]).sort((a, b) => a.deps[0].dep - b.deps[0].dep)[0];
  const ticker = [
    ...typhoonNotice(now),
    ...(soon ? [
      `つぎの発車は ${formatClock(soon.deps[0].dep)}  ${soon.line.nameJa} ${soon.dest.nameJa}方面  ${soon.platform}番線`,
      `Next departure ${formatClock(soon.deps[0].dep)}: ${soon.line.nameEn} for ${soon.dest.nameRomaji}, track ${soon.platform}`,
    ] : []),
    ...thanks,
  ].join(SEP);
  return { style: stationBoard(st.id), station: st, rows, en: langEn(wall), ticker, now, wall };
}

// ── Shared drawing ──

const wallNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
const shortName = (l: LineDef) => l.nameEn.replace(/ Line$/, '');
const flashOn = (wall: number) => Math.floor(wall * 2) % 2 === 0;
const ROW_JA = ['先発', '次発', '次々発'], ROW_EN = ['Next', '2nd', '3rd'];

/** Text sliding right to left inside [x0, x1]; returns nothing, draws clipped. */
function ticker(ctx: Ctx, s: string, x0: number, x1: number, y: number, px: number, color: string, speed: number, wall: number, weight = 700, step = 0) {
  ctx.font = `${weight} ${Math.max(4, px)}px ${FONT}`;
  const tw = ctx.measureText(s).width, span = tw + (x1 - x0);
  let off = (wall * speed) % span;
  if (step) off = Math.floor(off / step) * step;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y - px * 0.75, x1 - x0, px * 1.5);
  ctx.clip();
  text(ctx, s, x1 - off, y, px, { color, weight });
  ctx.restore();
}

// ── LED (dot matrix) ──
// Drawn at one canvas pixel per LED, then snapped to lit/unlit; the sign material turns each
// pixel into a round dot. Rows are 17 dots (a 16-dot font and a dark gap).

const LED = { r: '#ff2a14', g: '#4dff2e', o: '#ffa200' };
const LED_ROW = 17, LED_PX = 15, LED_W = 500;

/** A line colour as the nearest of the three LED colours (no blue on a 1990s board). */
export function ledOf(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx - mn < 30) return LED.o;
  let h = mx === r ? ((g - b) / (mx - mn) + 6) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
  h *= 60;
  return h < 18 || h >= 300 ? LED.r : h < 70 ? LED.o : LED.g;
}

function ledGrid(rows: number, w: number, h: number): [number, number] {
  const H = Math.max(LED_ROW * (rows + 2), Math.round((260 * h) / w));
  return [Math.round((H * w) / h), H];
}

/** Dot grid of an LED board, or null if the sign isn't one (it then uses signPixels). */
export function boardPixels(c: SignContent, w: number, h: number): [number, number] | null {
  if (c.k === 'dep' && lineBoard(c.line) === 'led') return ledGrid(2, w, h);
  if (c.k === 'depAll' && stationBoard(c.station) === 'led') return ledGrid(depAllRows(c.station).length, w, h);
  return null;
}
/** Whether a sign is drawn as LED dots (the material needs to know). */
export const isLed = (c: SignContent) => (c.k === 'dep' && lineBoard(c.line) === 'led') || (c.k === 'depAll' && stationBoard(c.station) === 'led');

const led = (ctx: Ctx, s: string, x: number, y: number, color: string, o: { maxW?: number; align?: CanvasTextAlign } = {}) =>
  text(ctx, s, x, y, LED_PX, { color, weight: 500, ...o });

/** Snap every pixel to fully lit (its hue at full brightness) or off. */
function quantize(ctx: Ctx, W: number, H: number) {
  if (typeof ctx.getImageData !== 'function') return;
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const mx = Math.max(d[i], d[i + 1], d[i + 2]);
    if (mx < 100) d[i] = d[i + 1] = d[i + 2] = 0;
    else {
      const k = 255 / mx;
      d[i] *= k;
      d[i + 1] *= k;
      d[i + 2] *= k;
    }
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function ledTrain(ctx: Ctx, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 7, y - 3, 12, 7);
  ctx.fillRect(x + 5, y - 1, 2, 5);
  ctx.fillStyle = '#000';
  for (const wx of [-5, -1, 3]) ctx.fillRect(x + wx, y - 2, 2, 2);
}

function ledApproach(ctx: Ctx, W: number, y: number, m: DepModel) {
  const cx = [W * 0.13, W * 0.47, W * 0.82], half = W * 0.11;
  m.approachStops.forEach((s, k) => {
    const here = k === 2, lit = m.away !== null && Math.abs(2 - m.away - k) < 1e-6;
    const label = here ? (m.en ? 'This stn' : '当駅') : s ? (m.en ? s.nameRomaji : s.nameJa) : '—';
    if (lit) {
      ctx.fillStyle = LED.r;
      ctx.fillRect(cx[k] - half, y - 8, half * 2, 16);
    }
    led(ctx, label, cx[k], y, lit ? '#000' : here ? LED.g : LED.o, { align: 'center', maxW: half * 2 - 2 });
  });
  for (let k = 0; k < 2; k++) {
    ctx.fillStyle = LED.g;
    for (let x = cx[k] + half + 2; x < cx[k + 1] - half - 2; x += 3) ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  if (m.away !== null && m.away % 1 !== 0) {
    const t = 2 - m.away, k = Math.floor(t), f = t - k;
    const a = cx[k] + half + 8, b = cx[k + 1] - half - 8;
    ledTrain(ctx, Math.round(a + (b - a) * f), Math.round(y) - 1, LED.r);
  }
}

function ledDep(ctx: Ctx, W: number, H: number, m: DepModel) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const rowY = (k: number) => Math.round((H * (k + 0.5)) / 4);
  const { en, line } = m;
  // Header: line lamp, track, line name (or the approach warning), clock.
  let y = rowY(0);
  ctx.fillStyle = ledOf(line.color);
  ctx.fillRect(1, y - 6, 4, 12);
  led(ctx, en ? `Track ${m.platform}` : `${m.platform}番線`, 8, y, LED.o, { maxW: W * 0.18 });
  if (m.status === 'approach') {
    if (flashOn(m.wall)) led(ctx, en ? 'Train approaching' : 'まもなく電車がまいります', W * 0.27, y, LED.r, { maxW: W * 0.52 });
  } else led(ctx, en ? line.nameEn : line.nameJa, W * 0.27, y, LED.g, { maxW: W * 0.5 });
  led(ctx, formatClock(m.now), W - 2, y, LED.g, { align: 'right', maxW: W * 0.17 });
  // Two departures.
  m.rows.forEach((r, i) => {
    y = rowY(i + 1);
    led(ctx, en ? ROW_EN[i] : ROW_JA[i], 1, y, LED.g, { maxW: W * 0.11 });
    if (!r.boarding) led(ctx, en ? 'Terminates' : '当駅止まり', W * 0.13, y, LED.r, { maxW: W * 0.17 });
    else if (r.line.id === line.id) led(ctx, en ? 'Local' : '普通', W * 0.13, y, LED.g, { maxW: W * 0.17 });
    else led(ctx, en ? shortName(r.line) : r.line.nameJa, W * 0.13, y, ledOf(r.line.color), { maxW: W * 0.17 });
    const live = i === 0 && (m.status === 'boarding' || m.status === 'closing');
    led(ctx, formatClock(r.boarding ? r.dep : r.arr), W * 0.32, y, live ? LED.g : LED.o, { maxW: W * 0.15 });
    if (r.boarding) led(ctx, en ? r.dest.nameRomaji : r.dest.nameJa, W * 0.49, y, LED.o, { maxW: W * 0.5 });
    else led(ctx, en ? 'Please do not board' : 'ご乗車になれません', W * 0.49, y, LED.r, { maxW: W * 0.5 });
  });
  // Bottom row: where the next train is while it comes in, otherwise the ticker.
  y = rowY(3);
  if (m.away !== null && (m.status === 'wait' || m.status === 'approach')) ledApproach(ctx, W, y, m);
  else ticker(ctx, m.ticker, 0, W, y, LED_PX, LED.o, 28, m.wall, 500, 1);
  quantize(ctx, W, H);
}

function ledDepAll(ctx: Ctx, W: number, H: number, m: DepAllModel) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const n = m.rows.length, rh = H / (n + 2);
  const { en } = m;
  let y = Math.round(rh / 2);
  led(ctx, en ? 'Departures' : '発車案内', 1, y, LED.g, { maxW: W * 0.5 });
  led(ctx, formatClock(m.now), W - 2, y, LED.o, { align: 'right', maxW: W * 0.2 });
  // Today's weather and the temperature outside, as concourse boards carry.
  led(ctx, `${WEATHER_NAME[today.weather][en ? 1 : 0]} ${temperatureNow(m.now)}°C`, W * 0.53, y, LED.o, { maxW: W * 0.25 });
  m.rows.forEach((r, i) => {
    y = Math.round(rh * (i + 1.5));
    ctx.fillStyle = ledOf(r.line.color);
    ctx.fillRect(1, y - 6, 4, 12);
    led(ctx, en ? r.dest.nameRomaji : `${r.dest.nameJa}方面`, 8, y, LED.o, { maxW: W * 0.36 });
    led(ctx, en ? `Tr.${r.platform}` : `${r.platform}番線`, W * 0.46, y, LED.g, { maxW: W * 0.13 });
    r.deps.forEach((d, k) => {
      const hot = k === 0 && (r.status === 'boarding' || r.status === 'closing' || (r.status === 'approach' && flashOn(m.wall)));
      led(ctx, formatClock(d.dep), W * (0.62 + k * 0.2), y, hot ? (r.status === 'approach' ? LED.r : LED.g) : LED.o, { maxW: W * 0.17 });
    });
  });
  ticker(ctx, m.ticker, 0, W, Math.round(H - rh / 2), LED_PX, LED.o, 28, m.wall, 500, 1);
  quantize(ctx, W, H);
}

// ── LCD (full colour) ──

/** Language crossfade: fully up most of the time, fading through black at each switch. */
function langAlpha(wall: number) {
  const t = ((wall % LANG_S) + LANG_S) % LANG_S, f = 0.35;
  return Math.max(0, Math.min(1, t / f, (LANG_S - t) / f));
}
function faded(ctx: Ctx, a: number, fn: () => void) {
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * a;
  fn();
  ctx.globalAlpha = prev;
}
function pill(ctx: Ctx, x: number, y: number, w: number, h: number, bg: string, s: string, px: number) {
  rr(ctx, x, y - h / 2, w, h, h * 0.22);
  ctx.fillStyle = bg;
  ctx.fill();
  text(ctx, s, x + w / 2, y + px * 0.04, px, { align: 'center', color: '#fff', weight: 800, maxW: w * 0.86 });
}
function lcdTrain(ctx: Ctx, x: number, y: number, h: number, color: string) {
  const w = h * 2.4;
  rr(ctx, x - w / 2, y - h / 2, w, h, h * 0.35);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = '#dfe8f3';
  ctx.fillRect(x - w * 0.36, y - h * 0.22, w * 0.62, h * 0.24);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(x + w * 0.4, y + h * 0.05, w * 0.06, h * 0.18);
}

function lcdDep(ctx: Ctx, W: number, H: number, m: DepModel) {
  const { en, line } = m, a = langAlpha(m.wall);
  ctx.fillStyle = '#05080d';
  ctx.fillRect(0, 0, W, H);
  // Header bar.
  const hh = H * 0.17;
  ctx.fillStyle = '#111923';
  ctx.fillRect(0, 0, W, hh);
  ctx.fillStyle = line.color;
  ctx.fillRect(0, hh, W, H * 0.015);
  lineBadge(ctx, hh * 0.55, hh / 2, hh * 0.34, line);
  faded(ctx, a, () => text(ctx, en ? `Track ${m.platform}` : `${m.platform}番線`, hh * 1.05, hh / 2, hh * 0.55, { color: '#fff', weight: 800, maxW: W * 0.13 }));
  if (m.status === 'approach') {
    text(ctx, en ? 'A train is approaching' : 'まもなく電車がまいります', W * 0.24, hh / 2, hh * 0.5, { color: flashOn(m.wall) ? '#ffd23f' : '#6e5a1c', weight: 800, maxW: W * 0.56 });
  } else {
    faded(ctx, a, () => text(ctx, en ? `${line.nameEn} — Departures` : `${line.nameJa}  発車標`, W * 0.24, hh / 2, hh * 0.45, { color: '#c9d4e3', weight: 700, maxW: W * 0.56 }));
  }
  text(ctx, formatClock(m.now), W - hh * 0.3, hh / 2, hh * 0.6, { color: '#fff', weight: 800, align: 'right', maxW: W * 0.14 });
  // Departures.
  const top = hh + H * 0.025, rowH = H * 0.16;
  for (let k = 0; k < 3; k++) {
    const y = top + rowH * (k + 0.5);
    if (k > 0) {
      ctx.fillStyle = '#1a2431';
      ctx.fillRect(W * 0.02, top + rowH * k - 1, W * 0.96, 2);
    }
    const r = m.rows[k];
    if (!r) continue;
    const live = k === 0 && (m.status === 'boarding' || m.status === 'closing');
    if (live) {
      ctx.fillStyle = '#3ddc6a';
      ctx.fillRect(0, y - rowH * 0.4, W * 0.006, rowH * 0.8);
    }
    faded(ctx, a, () => {
      text(ctx, en ? ROW_EN[k] : ROW_JA[k], W * 0.02, y, rowH * 0.42, { color: k === 0 ? '#7CFC6A' : '#8da2b8', maxW: W * 0.07 });
      const [bg, s] = !r.boarding ? ['#7a1f1f', en ? 'Terminates' : '当駅止まり']
        : r.line.id === line.id ? ['#34445a', en ? 'Local' : '普通'] : [r.line.color, en ? shortName(r.line) : r.line.nameJa];
      pill(ctx, W * 0.1, y, W * 0.105, rowH * 0.72, bg, s, rowH * 0.42);
    });
    text(ctx, formatClock(r.boarding ? r.dep : r.arr), W * 0.225, y, rowH * 0.74, { color: live ? '#7CFC6A' : '#fff', weight: 800, maxW: W * 0.11 });
    faded(ctx, a, () => {
      if (r.boarding) {
        text(ctx, en ? r.dest.nameRomaji : r.dest.nameJa, W * 0.35, y, rowH * 0.7, { color: '#fff', weight: 800, maxW: W * 0.38 });
        text(ctx, en ? r.dest.nameJa : r.dest.nameRomaji, W * 0.98, y + rowH * 0.04, rowH * 0.42, { color: '#a9bacb', weight: 600, align: 'right', maxW: W * 0.2 });
      } else {
        text(ctx, en ? 'Not in service' : 'ご乗車になれません', W * 0.35, y, rowH * 0.55, { color: '#ffb300', weight: 800, maxW: W * 0.38 });
      }
    });
  }
  // Approach strip: the last two stops and this one, with the next train on it.
  const a0 = top + rowH * 3 + H * 0.005, ah = H * 0.15;
  ctx.fillStyle = '#0a0f16';
  ctx.fillRect(0, a0, W, ah);
  faded(ctx, a, () => text(ctx, en ? 'Approach' : '接近', W * 0.02, a0 + ah / 2, ah * 0.32, { color: '#8da2b8', maxW: W * 0.08 }));
  const nx = [W * 0.22, W * 0.51, W * 0.8], ly = a0 + ah * 0.34;
  const trainX = m.away === null ? null : nx[0] + (nx[2] - nx[0]) * ((2 - m.away) / 2);
  ctx.fillStyle = '#2b3746';
  ctx.fillRect(W * 0.14, ly - ah * 0.04, W * 0.72, ah * 0.08);
  if (trainX !== null) {
    // The stretch still to run, lit in the line colour.
    ctx.fillStyle = (m.rows[0]?.line ?? line).color;
    ctx.fillRect(trainX, ly - ah * 0.04, nx[2] - trainX, ah * 0.08);
  }
  m.approachStops.forEach((s, k) => {
    const here = k === 2;
    ctx.fillStyle = here ? line.color : '#3b4a5e';
    ctx.beginPath();
    ctx.arc(nx[k], ly, ah * (here ? 0.13 : 0.1), 0, Math.PI * 2);
    ctx.fill();
    const label = here ? (en ? 'This station' : '当駅') : s ? (en ? s.nameRomaji : s.nameJa) : '—';
    faded(ctx, a, () => text(ctx, label, nx[k], a0 + ah * 0.76, ah * 0.3, { align: 'center', color: here ? '#fff' : '#c9d4e3', weight: here ? 800 : 600, maxW: W * 0.24 }));
  });
  if (trainX !== null) lcdTrain(ctx, trainX, ly, ah * 0.34, (m.rows[0]?.line ?? line).color);
  // Ticker.
  const t0 = a0 + ah;
  ctx.fillStyle = '#0e131b';
  ctx.fillRect(0, t0, W, H - t0);
  ticker(ctx, m.ticker, 0, W, t0 + (H - t0) / 2, (H - t0) * 0.6, '#ffc640', H * 0.55, m.wall);
}

function lcdDepAll(ctx: Ctx, W: number, H: number, m: DepAllModel) {
  const { en } = m, a = langAlpha(m.wall);
  ctx.fillStyle = '#070c14';
  ctx.fillRect(0, 0, W, H);
  const hh = H * 0.13;
  ctx.fillStyle = '#0d3b66';
  ctx.fillRect(0, 0, W, hh);
  faded(ctx, a, () => text(ctx, en ? 'Departures' : '発車案内', hh * 0.4, hh / 2, hh * 0.5, { color: '#fff', maxW: W * 0.5 }));
  text(ctx, formatClock(m.now), W - hh * 0.4, hh / 2, hh * 0.62, { color: '#fff', align: 'right', weight: 800, maxW: W * 0.2 });
  // Today's weather and the temperature outside, as concourse boards carry.
  drawWeatherIcon(ctx, today.weather, m.now, W * 0.55, hh * 0.17, hh * 0.66, '#fff');
  text(ctx, `${temperatureNow(m.now)}°C`, W * 0.55 + hh * 0.85, hh / 2, hh * 0.52, { color: '#fff', weight: 800, maxW: W * 0.1 });
  faded(ctx, a, () => text(ctx, WEATHER_NAME[today.weather][en ? 1 : 0], W * 0.66 + hh * 0.85, hh / 2, hh * 0.4, { color: '#cfe0f2', weight: 600, maxW: W * 0.1 }));
  const top = hh + H * 0.01, bottom = H * 0.86;
  const n = Math.max(m.rows.length, 2), rh = (bottom - top) / n;
  const px = Math.min(rh * 0.42, H * 0.075);
  m.rows.forEach((r, i) => {
    const y = top + rh * (i + 0.5);
    if (i > 0) {
      ctx.fillStyle = '#16202d';
      ctx.fillRect(W * 0.02, top + rh * i - 1, W * 0.96, 2);
    }
    lineBadge(ctx, H * 0.06, y, Math.min(rh * 0.3, H * 0.045), r.line);
    faded(ctx, a, () => {
      text(ctx, en ? `for ${r.dest.nameRomaji}` : `${r.dest.nameJa} 方面`, H * 0.13, y, px, { color: '#fff', weight: 800, maxW: W * 0.32 });
      text(ctx, en ? `Track ${r.platform}` : `${r.platform}番線`, W * 0.46, y, px * 0.8, { color: '#cfd8e3', maxW: W * 0.12 });
    });
    r.deps.forEach((d, k) => {
      const live = k === 0 && (r.status === 'boarding' || r.status === 'closing');
      text(ctx, formatClock(d.dep), W * (0.6 + k * 0.13), y, px * 1.1, { color: live ? '#7CFC6A' : k === 0 ? '#fff' : '#8da2b8', weight: 800, maxW: W * 0.11 });
    });
    if (r.status === 'boarding' || r.status === 'closing') faded(ctx, a, () => pill(ctx, W * 0.86, y, W * 0.12, px * 1.2, '#1f7a3a', en ? 'Boarding' : '停車中', px * 0.62));
    else if (r.status === 'approach' && flashOn(m.wall)) faded(ctx, a, () => pill(ctx, W * 0.86, y, W * 0.12, px * 1.2, '#b37a00', en ? 'Arriving' : '接近', px * 0.62));
  });
  const t0 = H * 0.88;
  ctx.fillStyle = '#0e131b';
  ctx.fillRect(0, t0, W, H - t0);
  ticker(ctx, m.ticker, 0, W, t0 + (H - t0) / 2, (H - t0) * 0.6, '#ffc640', H * 0.3, m.wall);
}

// ── Entry points ──

export function drawDep(ctx: Ctx, W: number, H: number, c: DepC, wall = wallNow(), now = clock.time) {
  const m = depModel(c, now, wall);
  if (m.style === 'led') ledDep(ctx, W, H, m);
  else lcdDep(ctx, W, H, m);
}

export function drawDepAll(ctx: Ctx, W: number, H: number, c: DepAllC, wall = wallNow(), now = clock.time) {
  const m = depAllModel(c, now, wall);
  if (m.style === 'led') ledDepAll(ctx, W, H, m);
  else lcdDepAll(ctx, W, H, m);
}
