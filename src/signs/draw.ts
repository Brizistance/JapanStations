// Canvas drawing for every sign type. All text comes from the network data.

import { LINES, OPERATOR, STATIONS, diagramRuns, lineById, linesAt, stationById, terminusOf } from '../data/network';
import type { Dir, LineDef, StationDef } from '../data/types';
import { clock, formatClock, lineSim } from '../sim';
import { trainStateAt } from '../sim/timetable';
import {
  ELEVATED, KIND, OPEN_AIR, PLACE, PLOT, STREET, concourseY, mezzanineY, stationExits, stationStreet,
  type AreaFill, type Named, type OpenAirPlan, type PlanRect, type StationExit, type StationStreet,
} from '../stations/exits';
import { SPECS } from '../stations/specs';
import type { BlockStyle } from '../stations/surface';
import type { Arrow, Picto, SignContent } from './content';
import { boardPixels, boards, drawDep, drawDepAll, platformNo } from './departures';

export const FONT = '"Hiragino Sans","Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP",system-ui,sans-serif';
const NAVY = '#14233b';
type Ctx = CanvasRenderingContext2D;

const font = (ctx: Ctx, px: number, weight = 700) => {
  ctx.font = `${weight} ${Math.max(4, px)}px ${FONT}`;
};
/** Draw text shrunk horizontally to fit maxW. */
export function text(ctx: Ctx, s: string, x: number, y: number, px: number, opts: { maxW?: number; align?: CanvasTextAlign; color?: string; weight?: number } = {}) {
  font(ctx, px, opts.weight ?? 700);
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = opts.color ?? '#111';
  const w = ctx.measureText(s).width;
  if (opts.maxW && w > opts.maxW) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(opts.maxW / w, 1);
    ctx.fillText(s, 0, 0);
    ctx.restore();
    return opts.maxW;
  }
  ctx.fillText(s, x, y);
  return w;
}
export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function arrow(ctx: Ctx, cx: number, cy: number, size: number, dir: Arrow, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir]);
  const s = size / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.85, -s * 0.05);
  ctx.lineTo(s * 0.3, -s * 0.05);
  ctx.lineTo(s * 0.3, s);
  ctx.lineTo(-s * 0.3, s);
  ctx.lineTo(-s * 0.3, -s * 0.05);
  ctx.lineTo(-s * 0.85, -s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
export function lineBadge(ctx: Ctx, cx: number, cy: number, r: number, line: LineDef) {
  ctx.fillStyle = line.color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, line.id, cx, cy + r * 0.06, r * 1.25, { align: 'center', color: '#fff', weight: 800 });
}
/** Station number plate, e.g. Y over 13 in a line-coloured rounded square. */
export function numBadge(ctx: Ctx, x: number, y: number, s: number, code: string, color: string) {
  const [letter, num] = code.split('-');
  rr(ctx, x, y, s, s, s * 0.2);
  ctx.fillStyle = color;
  ctx.fill();
  rr(ctx, x + s * 0.09, y + s * 0.09, s * 0.82, s * 0.82, s * 0.13);
  ctx.fillStyle = '#fff';
  ctx.fill();
  text(ctx, letter, x + s / 2, y + s * 0.3, s * 0.34, { align: 'center', color, weight: 800 });
  text(ctx, num, x + s / 2, y + s * 0.66, s * 0.46, { align: 'center', color: '#111', weight: 800 });
}
/** Operator mark: three flowing strokes (川) in a roundel. Original design. */
export function logo(ctx: Ctx, cx: number, cy: number, r: number, bg = '#0d3b66', fg = '#fff') {
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = fg;
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = 'round';
  for (const [dx, len] of [[-0.42, 0.9], [0, 1.15], [0.42, 0.9]]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * r + r * 0.1, cy - (len * r) / 2);
    ctx.bezierCurveTo(cx + dx * r - r * 0.2, cy - r * 0.1, cx + dx * r + r * 0.2, cy + r * 0.1, cx + dx * r - r * 0.1, cy + (len * r) / 2);
    ctx.stroke();
  }
}

const neighbours = (line: LineDef, st: StationDef) => {
  const i = line.stops.indexOf(st.id);
  return {
    prev: i > 0 ? stationById(line.stops[i - 1]) : null,
    next: i < line.stops.length - 1 ? stationById(line.stops[i + 1]) : null,
  };
};

function drawName(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'name' }>) {
  const st = stationById(c.station), line = lineById(c.line);
  ctx.fillStyle = '#fbfbf8';
  ctx.fillRect(0, 0, W, H);
  const bandH = H * 0.24, top = H - bandH;
  // Name block.
  const bs = H * 0.3;
  font(ctx, H * 0.3, 800);
  const nameW = Math.min(W * 0.6, ctx.measureText(st.nameJa).width);
  const x0 = W / 2 - (nameW + bs * 1.25) / 2;
  numBadge(ctx, x0, H * 0.1, bs, st.numbers[line.id], line.color);
  text(ctx, st.nameJa, x0 + bs * 1.25, H * 0.25, H * 0.3, { maxW: W * 0.6, weight: 800 });
  text(ctx, st.nameKana, W / 2, H * 0.5, H * 0.1, { align: 'center', color: '#333', weight: 600, maxW: W * 0.9 });
  text(ctx, st.nameRomaji, W / 2, H * 0.65, H * 0.11, { align: 'center', color: '#111', weight: 700, maxW: W * 0.9 });
  // Line band with neighbours.
  ctx.fillStyle = line.color;
  ctx.fillRect(0, top, W, bandH);
  const { prev, next } = neighbours(line, st);
  const downRight = c.arrow !== 'left';
  const L = downRight ? prev : next, R = downRight ? next : prev;
  const mid = top + bandH / 2;
  if (L) {
    arrow(ctx, bandH * 0.5, mid, bandH * 0.6, 'left', '#fff');
    const w = text(ctx, L.nameJa, bandH * 1.0, mid, bandH * 0.5, { color: '#fff', maxW: W * 0.22 });
    text(ctx, L.nameRomaji, bandH * 1.15 + w, mid + bandH * 0.05, bandH * 0.3, { color: '#fff', weight: 600, maxW: W * 0.2 });
  }
  if (R) {
    arrow(ctx, W - bandH * 0.5, mid, bandH * 0.6, 'right', '#fff');
    font(ctx, bandH * 0.3, 600);
    const we = Math.min(W * 0.2, ctx.measureText(R.nameRomaji).width);
    text(ctx, R.nameRomaji, W - bandH * 1.0, mid + bandH * 0.05, bandH * 0.3, { color: '#fff', weight: 600, align: 'right', maxW: W * 0.2 });
    text(ctx, R.nameJa, W - bandH * 1.15 - we, mid, bandH * 0.5, { color: '#fff', align: 'right', maxW: W * 0.22 });
  }
}

function drawDir(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'dir' }>) {
  const st = stationById(c.station), line = lineById(c.line);
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  const p = H * 0.12;
  let x = p;
  if (c.arrow) {
    arrow(ctx, x + H * 0.3, H / 2, H * 0.55, c.arrow, '#fff');
    x += H * 0.7;
  }
  rr(ctx, x, p, H - 2 * p, H - 2 * p, H * 0.1);
  ctx.fillStyle = line.color;
  ctx.fill();
  text(ctx, String(platformNo(st, line, c.dir)), x + (H - 2 * p) / 2, H / 2 + H * 0.03, H * 0.6, { align: 'center', color: '#fff', weight: 800 });
  x += H * 0.95;
  lineBadge(ctx, x + H * 0.25, H * 0.3, H * 0.2, line);
  text(ctx, line.nameJa, x + H * 0.55, H * 0.3, H * 0.26, { color: '#fff', maxW: W * 0.25 });
  text(ctx, line.nameEn, x, H * 0.72, H * 0.17, { color: '#c9d4e3', weight: 600, maxW: W * 0.3 });
  const tx = x + W * 0.33;
  if (boards(line, st, c.dir)) {
    const t = terminusOf(line, c.dir);
    const w = text(ctx, t.nameJa, tx, H * 0.34, H * 0.4, { color: '#fff', weight: 800, maxW: W - tx - H * 0.9 });
    text(ctx, '方面', tx + w + H * 0.1, H * 0.4, H * 0.22, { color: '#fff', weight: 600 });
    text(ctx, `for ${t.nameRomaji}`, tx, H * 0.76, H * 0.2, { color: '#c9d4e3', weight: 600, maxW: W - tx - p });
  } else {
    text(ctx, '降車専用', tx, H * 0.34, H * 0.4, { color: '#ffd23f', weight: 800, maxW: W - tx - p });
    text(ctx, 'Alighting only — this platform is for arrivals', tx, H * 0.76, H * 0.17, { color: '#c9d4e3', weight: 600, maxW: W - tx - p });
  }
}

function drawGuide(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'guide' }>) {
  const bg = { navy: NAVY, white: '#fbfbf8', yellow: '#ffd100', green: '#0a7d4f' }[c.bg];
  const fg = c.bg === 'navy' || c.bg === 'green' ? '#fff' : '#111';
  const sub = c.bg === 'navy' || c.bg === 'green' ? '#c9d4e3' : '#333';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const p = H * 0.14;
  let x0 = p, x1 = W - p;
  if (c.arrow === 'right') {
    arrow(ctx, W - H * 0.45, H / 2, H * 0.6, 'right', fg);
    x1 = W - H * 0.9;
  } else if (c.arrow) {
    arrow(ctx, H * 0.45, H / 2, H * 0.6, c.arrow, fg);
    x0 = H * 0.9;
  }
  for (const id of c.badges ?? []) {
    lineBadge(ctx, x0 + H * 0.3, H / 2, H * 0.3, lineById(id));
    x0 += H * 0.72;
  }
  if (c.num) {
    rr(ctx, x1 - H * 0.72, p, H * 0.72, H - 2 * p, H * 0.08);
    ctx.fillStyle = fg;
    ctx.fill();
    text(ctx, c.num, x1 - H * 0.36, H / 2 + H * 0.02, H * 0.5, { align: 'center', color: bg, weight: 800, maxW: H * 0.6 });
    x1 -= H * 0.85;
  }
  text(ctx, c.ja, x0, H * 0.36, H * 0.38, { color: fg, weight: 800, maxW: x1 - x0 });
  text(ctx, c.en, x0, H * 0.76, H * 0.2, { color: sub, weight: 600, maxW: x1 - x0 });
}

function drawEntrance(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'entrance' }>) {
  const st = stationById(c.station);
  ctx.fillStyle = '#fbfbf8';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0d3b66';
  ctx.fillRect(0, 0, W, H * 0.12);
  logo(ctx, H * 0.55, H * 0.56, H * 0.32);
  let x = H * 1.05;
  const w = text(ctx, `${st.nameJa}駅`, x, H * 0.46, H * 0.36, { weight: 800, maxW: W * 0.5 });
  text(ctx, `${st.nameRomaji} Sta.`, x, H * 0.8, H * 0.16, { color: '#333', weight: 600, maxW: W * 0.5 });
  x += w + H * 0.25;
  for (const l of linesAt(st.id)) {
    numBadge(ctx, x, H * 0.24, H * 0.5, st.numbers[l.id], l.color);
    x += H * 0.58;
  }
  if (c.exit) {
    ctx.fillStyle = '#ffd100';
    ctx.fillRect(W - H * 0.9, H * 0.12, H * 0.9, H * 0.88);
    text(ctx, c.exit, W - H * 0.45, H * 0.5, H * 0.48, { align: 'center', weight: 800 });
    text(ctx, '出口 Exit', W - H * 0.45, H * 0.85, H * 0.13, { align: 'center', weight: 700 });
  }
}

/** Compact network diagram, used on fare boards. */
function drawDiagram(ctx: Ctx, x: number, y: number, w: number, h: number, here?: string) {
  const xs = STATIONS.map((s) => s.diagram.x), ys = STATIONS.map((s) => s.diagram.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const sc = Math.min(w / (maxX - minX + 160), h / (maxY - minY + 90));
  const ox = x + (w - (maxX - minX) * sc) / 2 - minX * sc, oy = y + (h - (maxY - minY) * sc) / 2 - minY * sc;
  const P = (s: StationDef) => [ox + s.diagram.x * sc, oy + s.diagram.y * sc];
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const l of LINES) {
    ctx.strokeStyle = l.color;
    for (const r of diagramRuns(l)) {
      // A line on another's track is a narrow stripe inside it.
      ctx.lineWidth = (r.shared ? 3.5 : 9) * sc;
      ctx.beginPath();
      r.pts.forEach(([dx, dy], i) => {
        const px = ox + dx * sc, py = oy + dy * sc;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
      ctx.stroke();
    }
  }
  const hereSt = here ? stationById(here) : null;
  for (const s of STATIONS) {
    const [px, py] = P(s);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = s.id === here ? '#e02020' : '#222';
    ctx.lineWidth = 2.5 * sc;
    ctx.beginPath();
    ctx.arc(px, py, 8 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Beside the marker on a vertical stretch of line, otherwise below it.
    const side = s.diagram.label === 'right' ? 1 : s.diagram.label === 'left' ? -1 : 0;
    const align = side > 0 ? 'left' : side < 0 ? 'right' : 'center';
    const tx = px + side * 14 * sc, ty = side ? py : py + 24 * sc;
    text(ctx, s.nameJa, tx, ty, 17 * sc, { align, weight: 700, color: '#111' });
    if (hereSt && s.id !== here) {
      // Fare by rough distance, in the usual 50-yen steps: realistic-looking, deterministic.
      const d = Math.hypot(s.position.x - hereSt.position.x, s.position.y - hereSt.position.y);
      const fare = d < 900 ? 190 : d < 1800 ? 240 : d < 3000 ? 290 : d < 4500 ? 340 : 390;
      text(ctx, String(fare), tx, ty + 18 * sc, 14 * sc, { align, weight: 700, color: '#c0392b' });
    } else if (hereSt) {
      text(ctx, '当駅', tx, ty + 18 * sc, 13 * sc, { align, weight: 800, color: '#e02020' });
    }
  }
}

function drawFareMap(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'faremap' }>) {
  ctx.fillStyle = '#f7f7f2';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0d3b66';
  ctx.fillRect(0, 0, W, H * 0.13);
  logo(ctx, H * 0.09, H * 0.065, H * 0.05, '#fff', '#0d3b66');
  text(ctx, 'きっぷ運賃表', H * 0.18, H * 0.07, H * 0.075, { color: '#fff' });
  text(ctx, `Fares from ${stationById(c.station).nameRomaji}  (yen)`, W - H * 0.05, H * 0.07, H * 0.055, { color: '#dfe8f3', align: 'right', weight: 600 });
  drawDiagram(ctx, 0, H * 0.13, W, H * 0.87, c.station);
}

function drawShop(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'shop' }>) {
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  if (c.vertical) {
    const chars = [...c.ja];
    const size = Math.min(W * 0.72, (H * 0.94) / chars.length);
    chars.forEach((ch, i) => {
      const y = H / 2 + (i - (chars.length - 1) / 2) * size;
      if (ch === 'ー') {
        ctx.fillStyle = c.fg;
        ctx.fillRect(W / 2 - size * 0.05, y - size * 0.4, size * 0.1, size * 0.8);
      } else text(ctx, ch, W / 2, y, size * 0.92, { align: 'center', color: c.fg, weight: 800 });
    });
    return;
  }
  if (c.en) {
    text(ctx, c.ja, W / 2, H * 0.42, H * 0.5, { align: 'center', color: c.fg, weight: 800, maxW: W * 0.92 });
    text(ctx, c.en, W / 2, H * 0.82, H * 0.2, { align: 'center', color: c.fg, weight: 600, maxW: W * 0.92 });
  } else text(ctx, c.ja, W / 2, H / 2, H * 0.6, { align: 'center', color: c.fg, weight: 800, maxW: W * 0.92 });
}

const POSTERS: { bg: [string, string]; fg: string; ja: string; en: string; tag: string }[] = [
  { bg: ['#0b6fa4', '#0a2f5c'], fg: '#fff', ja: '川湊水族館', en: 'Kawaminato Aquarium', tag: '川湊港駅 徒歩5分' },
  { bg: ['#ff7aa2', '#ffd1dc'], fg: '#3a0d1e', ja: 'ICカード ミナカ', en: 'MINACA — tap and go', tag: 'チャージは券売機で' },
  { bg: ['#f2e9d0', '#e3c98a'], fg: '#5a2d0c', ja: '柳筋まつり', en: 'Yanagisuji Festival', tag: '十月 第二土曜・日曜' },
  { bg: ['#9fd8a4', '#e8f6e0'], fg: '#14401c', ja: 'ひばり野の丘に住む', en: 'Hibarino Hills Residences', tag: '雲雀野駅 徒歩8分' },
  { bg: ['#7b1e28', '#3d0f14'], fg: '#f6e7c8', ja: '川湊大学 公開講座', en: 'Kawaminato University Open Lectures', tag: '受講生募集中' },
  { bg: ['#fff7cc', '#ffe066'], fg: '#222', ja: '歩きスマホは危険です', en: 'Please do not use your phone while walking', tag: '川湊メトロ マナー向上運動' },
  { bg: ['#151515', '#3a2a00'], fg: '#ffcf4a', ja: '瓢箪堀 グルメ横丁', en: 'Hyotanbori Gourmet Alley', tag: '瓢箪堀駅 2番出口すぐ' },
  { bg: ['#1c355e', '#274b82'], fg: '#fff', ja: '港の朝市', en: 'Harbour Morning Market', tag: '毎週日曜 朝6時から' },
];

function drawPoster(ctx: Ctx, W: number, H: number, v: number) {
  const p = POSTERS[v % POSTERS.length];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, p.bg[0]);
  g.addColorStop(1, p.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = p.fg;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(W * (0.15 + 0.2 * i), H * (0.3 + 0.12 * ((i * 7 + v) % 4)), H * (0.1 + 0.03 * ((i + v) % 3)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const portrait = H > W;
  text(ctx, p.ja, W / 2, H * (portrait ? 0.56 : 0.4), portrait ? W * 0.15 : H * 0.26, { align: 'center', color: p.fg, weight: 800, maxW: W * 0.9 });
  text(ctx, p.en, W / 2, H * (portrait ? 0.68 : 0.66), portrait ? W * 0.065 : H * 0.11, { align: 'center', color: p.fg, weight: 600, maxW: W * 0.9 });
  text(ctx, p.tag, W / 2, H * 0.9, portrait ? W * 0.06 : H * 0.09, { align: 'center', color: p.fg, weight: 600, maxW: W * 0.9 });
  ctx.strokeStyle = '#d8d8d8';
  ctx.lineWidth = Math.max(2, W * 0.012);
  ctx.strokeRect(0, 0, W, H);
}

function drawMachine(ctx: Ctx, W: number, H: number, v: string) {
  const fill = (c: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = c;
    ctx.fillRect(x * W, y * H, w * W, h * H);
  };
  if (v === 'ticket' || v === 'charge') {
    fill('#d7dade', 0, 0, 1, 1);
    fill(v === 'ticket' ? '#0d3b66' : '#c2185b', 0, 0, 1, 0.12);
    text(ctx, v === 'ticket' ? 'きっぷ  Tickets' : 'チャージ  IC Charge', W / 2, H * 0.06, H * 0.055, { align: 'center', color: '#fff', maxW: W * 0.9 });
    fill('#10202f', 0.1, 0.18, 0.8, 0.3);
    fill('#2a7de1', 0.13, 0.2, 0.74, 0.26);
    for (let i = 0; i < 6; i++) fill('#fff', 0.16 + (i % 3) * 0.24, 0.24 + Math.floor(i / 3) * 0.1, 0.2, 0.07);
    fill('#30343a', 0.12, 0.55, 0.3, 0.05);
    fill('#30343a', 0.55, 0.55, 0.32, 0.03);
    fill('#ffd100', 0.55, 0.6, 0.32, 0.02);
    fill('#1b1e22', 0.2, 0.72, 0.6, 0.1);
    fill('#b9bdc2', 0, 0.9, 1, 0.1);
  } else if (v === 'vending' || v === 'vending2') {
    const body = v === 'vending' ? '#d32f2f' : '#1565c0';
    fill(body, 0, 0, 1, 1);
    fill('#f4f7fa', 0.07, 0.05, 0.86, 0.5);
    const cols = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#6d4c41', '#fb8c00', '#00acc1', '#8e24aa'];
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 8; i++) {
        fill(cols[(i * 3 + r * 5) % cols.length], 0.1 + i * 0.1, 0.07 + r * 0.16, 0.07, 0.11);
        fill(r === 1 ? '#e53935' : '#1e88e5', 0.1 + i * 0.1, 0.185 + r * 0.16, 0.07, 0.015);
      }
    }
    fill('#111', 0.62, 0.6, 0.26, 0.1);
    fill('#222', 0.12, 0.8, 0.76, 0.12);
    text(ctx, v === 'vending' ? 'つめた〜い' : 'あったか〜い', W * 0.32, H * 0.65, H * 0.04, { align: 'center', color: '#fff' });
  } else if (v === 'locker') {
    fill('#e9e4d8', 0, 0, 1, 1);
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = '#8b8778';
        ctx.lineWidth = W * 0.008;
        ctx.strokeRect((0.02 + i * 0.245) * W, (0.03 + r * 0.24) * H, 0.225 * W, 0.22 * H);
        fill('#f57c00', 0.2 + i * 0.245, 0.12 + r * 0.24, 0.03, 0.04);
      }
    }
  } else if (v === 'elevator') {
    fill('#b9bec4', 0, 0, 1, 1);
    fill('#8f959c', 0.08, 0.14, 0.4, 0.86);
    fill('#8f959c', 0.52, 0.14, 0.4, 0.86);
    fill('#0d3b66', 0, 0, 1, 0.11);
    text(ctx, 'エレベーター  Elevator', W / 2, H * 0.055, H * 0.055, { align: 'center', color: '#fff', maxW: W * 0.9 });
  } else if (v === 'door') {
    fill('#cfd3d6', 0, 0, 1, 1);
    ctx.strokeStyle = '#8b9096';
    ctx.lineWidth = W * 0.02;
    ctx.strokeRect(W * 0.04, H * 0.03, W * 0.92, H * 0.97);
    fill('#555', 0.8, 0.5, 0.08, 0.02);
    text(ctx, '関係者以外立入禁止', W / 2, H * 0.3, H * 0.05, { align: 'center', color: '#c62828', maxW: W * 0.8 });
    text(ctx, 'Staff only', W / 2, H * 0.37, H * 0.04, { align: 'center', color: '#444', weight: 600 });
  } else {
    // Station office window.
    fill('#e8eaec', 0, 0, 1, 1);
    fill('#9fc3d6', 0.06, 0.2, 0.88, 0.5);
    fill('#0d3b66', 0, 0, 1, 0.14);
    text(ctx, '駅長室・ご案内  Station Office', W / 2, H * 0.07, H * 0.07, { align: 'center', color: '#fff', maxW: W * 0.92 });
  }
}

function drawMural(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'mural' }>) {
  const col = c.color;
  if (c.v === 'mist') {
    // Kasumidani: ridgelines one behind another, each paler, with mist lying in the valleys.
    ctx.fillStyle = '#eef1f3';
    ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.14 + k * 0.15;
      ctx.beginPath();
      ctx.moveTo(0, H);
      const base = H * (0.3 + k * 0.11);
      for (let i = 0; i <= 48; i++) {
        const x = (i / 48) * W;
        const y = base - H * 0.09 * (Math.sin(i * 0.37 + k * 1.9) + 0.6 * Math.sin(i * 0.91 + k * 0.7));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.fill();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#eef1f3';
      ctx.fillRect(0, base + H * 0.035, W, H * 0.025);
    }
    ctx.globalAlpha = 1;
    return;
  }
  if (c.v === 'aster') {
    // Shiondai: asters (紫苑), lilac rays round a yellow disc, on tall stems.
    ctx.fillStyle = '#f6f4f9';
    ctx.fillRect(0, 0, W, H);
    const r = H / 9;
    for (let i = 0; i < 26; i++) {
      const cx = ((i * 0.618) % 1) * W, cy = H * (0.18 + ((i * 0.382) % 1) * 0.5);
      ctx.strokeStyle = '#6f8f5a';
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * 0.3, H);
      ctx.stroke();
      ctx.fillStyle = col;
      for (let p = 0; p < 16; p++) {
        const a = (p / 16) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.42, r * 0.1, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e8b830';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (c.v === 'weave') {
    // Tsumugi: woven kasuri stripes.
    ctx.fillStyle = '#f1e9da';
    ctx.fillRect(0, 0, W, H);
    const cols = [col, '#27344f', '#b4472f', '#d9b25a', '#5d7d6b'];
    const n = 48;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = cols[(i * 7) % cols.length];
      ctx.globalAlpha = 0.85;
      ctx.fillRect((i / n) * W, 0, (W / n) * (0.35 + 0.5 * ((i * 13) % 5) / 5), H);
    }
    ctx.globalAlpha = 0.5;
    for (let j = 0; j < 14; j++) {
      ctx.fillStyle = j % 2 ? '#f1e9da' : '#27344f';
      ctx.fillRect(0, (j / 14) * H, W, H / 60);
    }
    ctx.globalAlpha = 1;
  } else if (c.v === 'waves') {
    // Seigaiha wave scales.
    ctx.fillStyle = '#f4f8fb';
    ctx.fillRect(0, 0, W, H);
    const r = H / 5;
    ctx.lineWidth = r * 0.09;
    for (let row = 0; row < 12; row++) {
      for (let i = -1; i < W / r + 1; i++) {
        const cx = i * r * 2 + (row % 2 ? r : 0), cy = row * r * 0.5 + r;
        for (let k = 3; k >= 1; k--) {
          ctx.fillStyle = k % 2 ? '#f4f8fb' : col;
          ctx.strokeStyle = col;
          ctx.beginPath();
          ctx.arc(cx, cy, (r * k) / 3, Math.PI, 0);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
  } else if (c.v === 'gourds') {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = col;
    const s = H / 3.2;
    for (let i = 0; i < W / s + 1; i++) {
      for (let j = 0; j < 3; j++) {
        const cx = i * s + (j % 2 ? s / 2 : 0) + s * 0.3, cy = j * s * 1.05 + s * 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy + s * 0.14, s * 0.2, 0, Math.PI * 2);
        ctx.arc(cx, cy - s * 0.13, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - s * 0.02, cy - s * 0.32, s * 0.04, s * 0.1);
      }
    }
  } else if (c.v === 'pines') {
    ctx.fillStyle = '#efe6cf';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const cx = (i + 0.5) * (W / 9), cy = H * (0.55 + 0.1 * (i % 2));
      ctx.fillStyle = '#5b3a1e';
      ctx.fillRect(cx - H * 0.02, cy, H * 0.04, H * 0.4);
      ctx.fillStyle = col;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(cx + (k - 1) * H * 0.12, cy - k * H * 0.09 * (k === 1 ? 1.6 : 0.4), H * 0.2, H * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(W * 0.86, H * 0.25, H * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.v === 'hills') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#bfe3f5');
    g.addColorStop(1, '#f4fbff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ['#9ccc9c', '#6bb07a', col].forEach((cc, k) => {
      ctx.fillStyle = cc;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += W / 40) ctx.lineTo(x, H * (0.5 + 0.13 * k) + Math.sin(x / (W * 0.08) + k * 2) * H * 0.1);
      ctx.lineTo(W, H);
      ctx.fill();
    });
  } else if (c.v === 'gulls') {
    // Gulls wheeling over a pale sea.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#eaf4f8');
    g.addColorStop(1, '#c4dde8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, H * 0.82, W, H * 0.18);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const x = ((i * 0.618) % 1) * W, y = H * (0.14 + 0.55 * ((i * 0.377) % 1)), s = H * (0.07 + 0.06 * ((i * 5) % 4) / 4);
      ctx.lineWidth = s * 0.14;
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.6, x, y);
      ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.6, x + s, y);
      ctx.stroke();
    }
  } else if (c.v === 'threads') {
    // Cotton skeins: long drooping threads in a few dyed colours.
    ctx.fillStyle = '#f6f1e6';
    ctx.fillRect(0, 0, W, H);
    const cols = [col, '#27344f', '#d9b25a', '#f6f1e6', col];
    for (let i = 0; i < 90; i++) {
      const x = (i / 90) * W;
      ctx.strokeStyle = cols[Math.floor(i / 6) % cols.length];
      ctx.lineWidth = H * 0.012;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + H * 0.05, H * 0.4, x - H * 0.05, H * 0.6, x + H * 0.02 * Math.sin(i), H);
      ctx.stroke();
    }
    ctx.fillStyle = '#5b4a3a';
    ctx.fillRect(0, H * 0.06, W, H * 0.035);
  } else if (c.v === 'moon') {
    // Full moon over a slope, pampas grass in front.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#141b33');
    g.addColorStop(1, '#2c3a63');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(W * 0.72, H * 0.36, H * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d1224';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, H * 0.55);
    ctx.quadraticCurveTo(W * 0.5, H * 0.75, W, H * 0.88);
    ctx.lineTo(W, H);
    ctx.fill();
    ctx.strokeStyle = '#e9e2c8';
    ctx.lineWidth = H * 0.01;
    for (let i = 0; i < 40; i++) {
      const x = (i / 40) * W, base = H * (0.6 + 0.28 * (x / W));
      ctx.beginPath();
      ctx.moveTo(x, base + H * 0.1);
      ctx.quadraticCurveTo(x + H * 0.02, base - H * 0.1, x + H * (0.06 + 0.04 * (i % 3)), base - H * 0.2);
      ctx.stroke();
    }
  } else if (c.v === 'kerria') {
    // Yamabuki: five-petalled yellow flowers on arching green stems.
    ctx.fillStyle = '#f7f5e8';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#5d8a3a';
    ctx.lineWidth = H * 0.014;
    for (let i = 0; i < 12; i++) {
      const x = (i / 12) * W;
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.quadraticCurveTo(x + W * 0.03, H * 0.3, x + W * 0.09, H * (0.25 + 0.2 * (i % 3)));
      ctx.stroke();
    }
    for (let i = 0; i < 46; i++) {
      const x = ((i * 0.618) % 1) * W, y = H * (0.12 + 0.72 * ((i * 0.377) % 1)), r = H * (0.045 + 0.02 * (i % 3));
      ctx.fillStyle = col;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + i;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#b8791a';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (c.v === 'sunset') {
    // Yūnagi: the evening calm. A low sun over a flat bay, its path broken into ripples.
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
    g.addColorStop(0, '#f7d9a8');
    g.addColorStop(1, '#f2a25c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const sx = W * 0.62, hz = H * 0.62;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(sx, hz, H * 0.2, Math.PI, 0);
    ctx.fill();
    const sea = ctx.createLinearGradient(0, hz, 0, H);
    sea.addColorStop(0, '#5e7f99');
    sea.addColorStop(1, '#2c4660');
    ctx.fillStyle = sea;
    ctx.fillRect(0, hz, W, H - hz);
    ctx.fillStyle = '#f8c27a';
    for (let i = 0; i < 16; i++) {
      const y = hz + H * 0.03 + i * H * 0.022, w = H * (0.34 - i * 0.016) * (0.7 + 0.3 * ((i * 7) % 3) / 2);
      ctx.globalAlpha = 0.85 - i * 0.045;
      ctx.fillRect(sx - w / 2 + Math.sin(i * 2.3) * H * 0.02, y, w, H * 0.009);
    }
    ctx.globalAlpha = 1;
    // A distant breakwater and lighthouse.
    ctx.fillStyle = '#2a3442';
    ctx.fillRect(W * 0.06, hz - H * 0.012, W * 0.3, H * 0.014);
    ctx.fillRect(W * 0.33, hz - H * 0.13, H * 0.035, H * 0.13);
  } else if (c.v === 'namako') {
    // Namako-kabe: square dark tiles set on the diagonal, with raised white plaster joints.
    ctx.fillStyle = '#f3f0e8';
    ctx.fillRect(0, 0, W, H);
    const s = H / 4.2;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(Math.PI / 4);
    const n = Math.ceil(Math.hypot(W, H) / s / 2) + 1;
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        ctx.fillStyle = col;
        ctx.fillRect(i * s + s * 0.09, j * s + s * 0.09, s * 0.82, s * 0.82);
      }
    }
    ctx.restore();
    // Top band of white plaster, as on a storehouse wall.
    ctx.fillStyle = '#f3f0e8';
    ctx.fillRect(0, 0, W, H * 0.12);
    ctx.fillStyle = '#c9c3b5';
    ctx.fillRect(0, H * 0.12, W, H * 0.012);
  } else if (c.v === 'lanterns') {
    // Paper lanterns strung along a canal at dusk, doubled in the water.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#241a2e');
    g.addColorStop(0.55, '#3b2a3a');
    g.addColorStop(0.56, '#1b2230');
    g.addColorStop(1, '#10151f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const lantern = (x: number, y: number, r: number, a: number) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.75, r, 0, 0, Math.PI * 2);
      ctx.fill();
      if (a < 1) return; // reflections: just the glow
      ctx.fillStyle = '#2a1c18';
      ctx.fillRect(x - r * 0.45, y - r * 1.08, r * 0.9, r * 0.16);
      ctx.fillRect(x - r * 0.45, y + r * 0.92, r * 0.9, r * 0.16);
    };
    // Two strings of lanterns, sagging between posts; the water line is at 56 % of the height.
    const water = H * 0.56, r = H * 0.075, n = Math.max(6, Math.round(W / (H * 0.42)));
    for (let row = 0; row < 2; row++) {
      const top = H * (0.08 + row * 0.2);
      const sag = (x: number) => top + Math.abs(Math.sin((x / W) * Math.PI * (n / 3))) * H * 0.05;
      ctx.strokeStyle = '#6b5a50';
      ctx.lineWidth = H * 0.008;
      ctx.beginPath();
      for (let x = 0; x <= W; x += W / 120) (x ? ctx.lineTo(x, sag(x)) : ctx.moveTo(x, sag(x)));
      ctx.stroke();
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.25 + row * 0.5) / n) * W, y = sag(x) + r * 1.15;
        lantern(x, y, r, 1);
        // Reflection: mirrored about the water line, squashed, faint and a little wobbly.
        const ry = water + (water - y) * 0.55;
        ctx.save();
        ctx.translate(x + Math.sin(i * 1.7) * H * 0.012, ry);
        ctx.scale(1, 0.5);
        lantern(0, 0, r, 0.42);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  } else if (c.v === 'sakura') {
    // Cherry trees along an embankment: a pink canopy, petals falling on the water.
    ctx.fillStyle = '#eef3f6';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#9fc4d6';
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
    ctx.fillStyle = '#7fa36a';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.8);
    ctx.lineTo(0, H * 0.66);
    ctx.lineTo(W, H * 0.6);
    ctx.lineTo(W, H * 0.8);
    ctx.fill();
    for (let i = 0; i < 10; i++) {
      const x = (i + 0.4) * (W / 10), base = H * (0.66 - 0.06 * (x / W));
      ctx.fillStyle = '#4a3a33';
      ctx.fillRect(x - H * 0.015, base - H * 0.24, H * 0.03, H * 0.24);
      for (let k = 0; k < 7; k++) {
        const a = k * 0.9 + i;
        ctx.fillStyle = k % 2 ? col : '#f7d6df';
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * H * 0.09, base - H * 0.3 + Math.sin(a) * H * 0.07, H * (0.08 + 0.02 * (k % 3)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#f7d6df';
    for (let i = 0; i < 70; i++) {
      const x = ((i * 0.618) % 1) * W, y = H * (0.45 + 0.5 * ((i * 0.377) % 1));
      ctx.fillRect(x, y, H * 0.012, H * 0.008);
    }
  } else if (c.v === 'maple') {
    // Momiji: scattered five-lobed maple leaves in autumn reds and golds on warm cream.
    ctx.fillStyle = '#f4ece0';
    ctx.fillRect(0, 0, W, H);
    const cols = [col, '#e07a2e', '#d9a441', '#9c2a22'];
    const hash = (n: number) => {
      const v = Math.sin(n * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };
    const leaf = (x: number, y: number, r: number, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      // Palmate: five slender pointed lobes fanning from the stalk, the lowest pair shortest.
      for (const [t, len] of [[0, 1], [-0.95, 0.85], [0.95, 0.85], [-1.85, 0.55], [1.85, 0.55]]) {
        ctx.save();
        ctx.rotate(t);
        const L = r * len, wd = r * 0.3 * len;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-wd, -L * 0.45, 0, -L);
        ctx.quadraticCurveTo(wd, -L * 0.45, 0, 0);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillRect(-r * 0.035, 0, r * 0.07, r * 0.6); // stalk
      ctx.restore();
    };
    for (let i = 0; i < Math.round(W / (H * 0.16)); i++) {
      const x = hash(i + 1) * W, y = H * (0.14 + 0.72 * hash(i + 101));
      ctx.fillStyle = cols[Math.floor(hash(i + 201) * cols.length)];
      leaf(x, y, H * (0.08 + 0.05 * hash(i + 301)), (hash(i + 401) - 0.5) * 2.4);
    }
  } else if (c.v === 'stars') {
    // Night sky over the ridge: star field, a few constellation lines and the observatory dome.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b1230');
    g.addColorStop(1, '#27325a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < (W / H) * 90; i++) {
      const x = ((i * 0.618) % 1) * W, y = ((i * 0.7548) % 1) * H * 0.78;
      ctx.globalAlpha = 0.4 + 0.6 * ((i * 0.31) % 1);
      ctx.fillRect(x, y, H * 0.006, H * 0.006);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = H * 0.006;
    for (let c0 = 0; c0 < Math.max(2, Math.round(W / (H * 1.6))); c0++) {
      const ox = (c0 + 0.3) * (W / Math.max(2, Math.round(W / (H * 1.6)))), pts: [number, number][] = [];
      for (let k = 0; k < 5; k++) pts.push([ox + (k - 2) * H * 0.14 + Math.sin(k * 2.1 + c0) * H * 0.05, H * (0.2 + 0.1 * Math.cos(k * 1.7 + c0))]);
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      for (const [x, y] of pts) {
        ctx.beginPath();
        ctx.arc(x, y, H * 0.014, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The ridge and the observatory.
    ctx.fillStyle = '#060a1c';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += W / 40) ctx.lineTo(x, H * (0.86 - 0.06 * Math.sin((x / W) * Math.PI)));
    ctx.lineTo(W, H);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.8, H * 0.07, Math.PI, 0);
    ctx.fill();
  } else if (c.v === 'dogwood') {
    // Hanamizuki: four-bracted dogwood flowers, white and pink, on a sage-green ground.
    ctx.fillStyle = '#b9cba9';
    ctx.fillRect(0, 0, W, H);
    const flower = (x: number, y: number, r: number, a: number, fill: string) => {
      ctx.fillStyle = fill;
      for (let k = 0; k < 4; k++) {
        const t = a + (k * Math.PI) / 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(t) * r * 0.55, y + Math.sin(t) * r * 0.55, r * 0.55, r * 0.36, t, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#7a9a3a';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    };
    const hash = (n: number) => {
      const v = Math.sin(n * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };
    // Leaves behind, then the flowers: big four-bracted heads, mostly white, some pink.
    ctx.fillStyle = '#7f9f68';
    for (let i = 0; i < Math.round(W / (H * 0.22)); i++) {
      ctx.beginPath();
      ctx.ellipse(hash(i + 1) * W, H * (0.08 + 0.84 * hash(i + 51)), H * 0.11, H * 0.045, hash(i + 91) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < Math.round(W / (H * 0.42)); i++) {
      const x = hash(i + 501) * W, y = H * (0.2 + 0.6 * hash(i + 601));
      flower(x, y, H * (0.13 + 0.06 * hash(i + 701)), hash(i + 801) * 1.5, hash(i + 901) < 0.35 ? col : '#fbfaf6');
    }
  } else if (c.v === 'skyline') {
    // The bay new town: glass towers mirrored in the water.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#dcebf5');
    g.addColorStop(0.62, '#f3f8fb');
    g.addColorStop(0.63, col);
    g.addColorStop(1, '#0d3f73');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const water = H * 0.62;
    for (let x = 0, i = 0; x < W; i++) {
      const w = H * (0.09 + 0.07 * ((i * 0.618) % 1)), h = H * (0.18 + 0.36 * ((i * 0.7548) % 1));
      ctx.fillStyle = i % 3 === 0 ? col : i % 3 === 1 ? '#5f87ab' : '#9fb7cc';
      ctx.fillRect(x, water - h, w - H * 0.012, h);
      // Window bands.
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let y = water - h + H * 0.02; y < water - H * 0.01; y += H * 0.035) ctx.fillRect(x + H * 0.008, y, w - H * 0.028, H * 0.008);
      // Reflection.
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, water + H * 0.01, w - H * 0.012, h * 0.45);
      ctx.globalAlpha = 1;
      x += w;
    }
  } else if (c.v === 'ripples') {
    // A spring welling up: concentric rings spreading on still water.
    ctx.fillStyle = '#eaf5f5';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = col;
    const n = Math.max(3, Math.round(W / (H * 1.1)));
    for (let i = 0; i < n; i++) {
      const cx = ((i + 0.5) / n) * W + Math.sin(i * 2.3) * H * 0.2, cy = H * (0.5 + 0.18 * Math.sin(i * 1.7));
      for (let k = 1; k <= 7; k++) {
        ctx.globalAlpha = 1 - k / 8;
        ctx.lineWidth = H * (0.02 - k * 0.002);
        ctx.beginPath();
        ctx.ellipse(cx, cy, H * 0.07 * k, H * 0.035 * k, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  } else if (c.v === 'violet') {
    // Sumire: small wild violets in clumps of heart-shaped leaves, on a pale spring green.
    ctx.fillStyle = '#eef2e6';
    ctx.fillRect(0, 0, W, H);
    const hash = (n: number) => {
      const v = Math.sin(n * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };
    const heart = (x: number, y: number, r: number, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, r);
      ctx.bezierCurveTo(-r * 1.2, r * 0.2, -r * 0.6, -r * 0.9, 0, -r * 0.35);
      ctx.bezierCurveTo(r * 0.6, -r * 0.9, r * 1.2, r * 0.2, 0, r);
      ctx.fill();
      ctx.restore();
    };
    const clumps = Math.round(W / (H * 0.55));
    for (let i = 0; i < clumps; i++) {
      const cx = ((i + 0.5 + 0.4 * (hash(i + 1) - 0.5)) / clumps) * W, cy = H * (0.62 + 0.2 * hash(i + 21));
      ctx.fillStyle = '#5f8a4a';
      for (let k = 0; k < 6; k++) heart(cx + (hash(i * 7 + k) - 0.5) * H * 0.3, cy + hash(i * 5 + k) * H * 0.12, H * 0.07, (hash(i * 3 + k) - 0.5) * 1.6);
      for (let k = 0; k < 4; k++) {
        // A violet: two upper petals, two side, one lower with a pale throat; on a thin stem.
        const fx = cx + (hash(i * 11 + k) - 0.5) * H * 0.4, fy = cy - H * (0.18 + 0.2 * hash(i * 13 + k)), r = H * 0.055;
        ctx.strokeStyle = '#6f8f55';
        ctx.lineWidth = H * 0.008;
        ctx.beginPath();
        ctx.moveTo(fx, fy + r);
        ctx.quadraticCurveTo(fx + r, fy + H * 0.15, fx, cy);
        ctx.stroke();
        ctx.fillStyle = col;
        for (const [dx, dy, rx, ry] of [[-0.5, -0.7, 0.45, 0.6], [0.5, -0.7, 0.45, 0.6], [-0.85, 0.05, 0.5, 0.38], [0.85, 0.05, 0.5, 0.38], [0, 0.6, 0.55, 0.5]]) {
          ctx.beginPath();
          ctx.ellipse(fx + dx * r, fy + dy * r, rx * r, ry * r, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#f5f0c8';
        ctx.beginPath();
        ctx.arc(fx, fy + r * 0.2, r * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (c.v === 'bellflower') {
    // Kikyō: five-pointed balloon-flower stars in violet, with buds, on pale lilac.
    ctx.fillStyle = '#f1edf6';
    ctx.fillRect(0, 0, W, H);
    const hash = (n: number) => {
      const v = Math.sin(n * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };
    const n = Math.round(W / (H * 0.38));
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.2 + 0.6 * hash(i + 1)) / n) * W, y = H * (0.25 + 0.5 * hash(i + 41));
      const r = H * (0.12 + 0.05 * hash(i + 81)), a = hash(i + 121) * 1.2;
      // Stem and a bud.
      ctx.strokeStyle = '#6f8f55';
      ctx.lineWidth = H * 0.012;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + r * 0.4, y + r * 1.4, x - r * 0.2, H);
      ctx.stroke();
      ctx.fillStyle = '#a98bd0';
      ctx.beginPath();
      ctx.ellipse(x + r * 1.1, y + r * 0.9, r * 0.22, r * 0.32, 0.4, 0, Math.PI * 2);
      ctx.fill();
      // The flower: a pentagonal star with rounded points and a darker vein to each tip.
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const t = a + (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.62 : r;
        ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3e2466';
      ctx.lineWidth = H * 0.006;
      for (let k = 0; k < 5; k++) {
        const t = a + (k / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(t) * r * 0.85, y + Math.sin(t) * r * 0.85);
        ctx.stroke();
      }
      ctx.fillStyle = '#f4f0c8';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (c.v === 'willow') {
    // Gilded willow: long gold fronds on deep green, for the hub.
    ctx.fillStyle = '#12382c';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    for (let i = 0; i < 60; i++) {
      const x = (i / 60) * W + W / 120, len = H * (0.55 + 0.4 * ((i * 37) % 10) / 10);
      ctx.lineWidth = H * 0.006;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x + H * 0.05, len / 2, x - H * 0.015, len);
      ctx.stroke();
      for (let k = 1; k < 12; k++) {
        ctx.beginPath();
        ctx.ellipse(x + (k % 2 ? 1 : -1) * H * 0.022, (len * k) / 12, H * 0.03, H * 0.008, k % 2 ? 1.0 : -1.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // Leaves (willow / ginkgo) scattered on a pale ground.
    ctx.fillStyle = '#f5f3ea';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    for (let i = 0; i < 26; i++) {
      const x = (i / 26) * W + W / 52;
      ctx.lineWidth = H * 0.008;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      const len = H * (0.5 + 0.4 * ((i * 37) % 10) / 10);
      ctx.quadraticCurveTo(x + H * 0.06, len / 2, x - H * 0.02, len);
      ctx.stroke();
      for (let k = 1; k < 9; k++) {
        ctx.beginPath();
        ctx.ellipse(x + (k % 2 ? 1 : -1) * H * 0.03, (len * k) / 9, H * 0.035, H * 0.012, k % 2 ? 0.9 : -0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// ───────────────────────── wayfinding ─────────────────────────

const YELLOW = '#ffd100';

/** Width of s at px (measured large, so the 4 px font floor does not distort it). */
function measure(ctx: Ctx, s: string, px: number, weight = 700) {
  font(ctx, 100, weight);
  return (ctx.measureText(s).width * px) / 100;
}

/** Exit number in a rounded square, as on Japanese exit signs; '' is an unnumbered entrance. */
function exitBadge(ctx: Ctx, x: number, y: number, s: number, num: string, fg = YELLOW, bg = '#111') {
  rr(ctx, x, y, s, s, s * 0.16);
  ctx.fillStyle = bg;
  ctx.fill();
  if (num) text(ctx, num, x + s / 2, y + s * 0.53, s * 0.74, { align: 'center', color: fg, weight: 800, maxW: s * 0.84 });
  else {
    text(ctx, '出入口', x + s / 2, y + s * 0.4, s * 0.28, { align: 'center', color: fg, weight: 800, maxW: s * 0.86 });
    text(ctx, 'Entrance', x + s / 2, y + s * 0.73, s * 0.17, { align: 'center', color: fg, weight: 600, maxW: s * 0.86 });
  }
}

/**
 * Landmarks in a box, as many as stay legible: each one Japanese over English, or all of them
 * run together on one Japanese and one English line, whichever lets the text be larger.
 */
function landmarks(ctx: Ctx, near: Named[], x: number, y: number, w: number, h: number, fg: string, sub: string) {
  if (!near.length || w <= 0 || h <= 0) return;
  // Text may be squeezed to 85 % of its width before it has to get smaller.
  const jaFit = (s: string) => w / (measure(ctx, s, 1, 800) * 0.85);
  const enFit = (s: string) => w / (measure(ctx, s, 1, 600) * 0.85);
  const size = (k: number) => {
    const list = near.slice(0, k);
    const uS = Math.min(h / (k * 1.9), ...list.map((n) => jaFit(n.ja)));
    const uJ = Math.min(h / 1.9, jaFit(list.map((n) => n.ja).join('・')));
    return uJ > uS * 1.15 ? { u: uJ, joined: true } : { u: uS, joined: false };
  };
  // More landmarks only while the text stays above 42 % of the one-landmark size (and a fifth of
  // the box): a low strip shows just the first, a wall board all of them.
  const minU = Math.max(9, h * 0.2, size(1).u * 0.42);
  let k = near.length, u = 0, joined = false;
  for (; k >= 1; k--) {
    ({ u, joined } = size(k));
    if (u >= minU || k === 1) break;
  }
  const list = near.slice(0, k);
  const lines = joined ? [{ ja: list.map((n) => n.ja).join('・'), en: list.map((n) => n.en).join(' · ') }] : list;
  const top = y + (h - lines.length * 1.9 * u) / 2;
  lines.forEach((n, i) => {
    const y0 = top + i * 1.9 * u;
    const e = Math.min(u * 0.56, enFit(n.en));
    text(ctx, n.ja, x, y0 + u * 0.6, u, { color: fg, weight: 800, maxW: w });
    text(ctx, n.en, x, y0 + u * 1.15 + u * 0.4, e, { color: sub, weight: 600, maxW: w });
  });
}

interface RowColours {
  fg: string;
  sub: string;
  badgeFg: string;
  badgeBg: string;
  rule: string;
}

/** Exits laid out in a grid of cells (badge + landmarks) whose shape suits the box. */
function exitRows(ctx: Ctx, exits: StationExit[], x: number, y: number, w: number, h: number, col: RowColours) {
  const n = exits.length;
  if (!n) return;
  // Columns: the count that gives the largest cell at about 3.2 : 1.
  let cols = 1, best = -1;
  for (let k = 1; k <= n; k++) {
    const score = Math.min(h / Math.ceil(n / k), w / k / 3.2);
    if (score > best + 1e-6) [cols, best] = [k, score];
  }
  const rows = Math.ceil(n / cols), cw = w / cols, ch = h / rows;
  ctx.fillStyle = col.rule;
  const t = Math.max(1, Math.min(cw, ch) * 0.012);
  for (let r = 1; r < rows; r++) ctx.fillRect(x, y + r * ch - t / 2, w, t);
  for (let k = 1; k < cols; k++) ctx.fillRect(x + k * cw - t / 2, y, t, h);
  exits.forEach((e, i) => {
    const cx = x + (i % cols) * cw, cy = y + Math.floor(i / cols) * ch;
    const pad = Math.min(ch, cw) * 0.08;
    const bs = Math.min(ch * 0.8, cw * 0.24);
    exitBadge(ctx, cx + pad, cy + (ch - bs) / 2, bs, e.num, col.badgeFg, col.badgeBg);
    const tx = cx + pad + bs * 1.22;
    landmarks(ctx, e.near, tx, cy + pad, cx + cw - pad - tx, ch - 2 * pad, col.fg, col.sub);
  });
}

function drawExits(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'exits' }>) {
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, 0, W, H);
  const exits = stationExits(c.station).filter((e) => !c.only || c.only.includes(e.num));
  const p = Math.min(W, H) * 0.05;
  let x0 = p, x1 = W - p, y0 = p;
  if (H >= W * 0.3) {
    // A board tall enough for a header: 出口案内 Exit information, and the arrow beside it.
    const hh = Math.min(H * 0.13, W * 0.11);
    const w = text(ctx, '出口案内', p, p + hh * 0.48, hh * 0.62, { weight: 800, maxW: W * 0.5 });
    text(ctx, 'Exit information', p + w + hh * 0.3, p + hh * 0.56, hh * 0.32, { weight: 600, color: '#222', maxW: Math.max(1, W - 2 * p - w - hh * (c.arrow ? 1.4 : 0.3)) });
    if (c.arrow) arrow(ctx, W - p - hh * 0.45, p + hh * 0.48, hh * 0.8, c.arrow, '#111');
    ctx.fillStyle = '#111';
    ctx.fillRect(p, p + hh, W - 2 * p, Math.max(2, hh * 0.05));
    y0 = p + hh * 1.2;
  } else if (c.arrow) {
    // A strip: the arrow in its own column at the end it points to (left for up and down).
    const a = Math.min(H * 0.8, W * 0.15);
    if (c.arrow === 'right') {
      arrow(ctx, W - p - a / 2, H / 2, a, 'right', '#111');
      x1 -= a + p;
    } else {
      arrow(ctx, p + a / 2, H / 2, a, c.arrow, '#111');
      x0 += a + p;
    }
  }
  if (!exits.length) {
    text(ctx, '出口', (x0 + x1) / 2, y0 + (H - p - y0) * 0.4, (H - p - y0) * 0.45, { align: 'center', weight: 800, maxW: x1 - x0 });
    text(ctx, 'Exit', (x0 + x1) / 2, y0 + (H - p - y0) * 0.8, (H - p - y0) * 0.22, { align: 'center', weight: 600, maxW: x1 - x0 });
    return;
  }
  exitRows(ctx, exits, x0, y0, x1 - x0, H - p - y0, { fg: '#111', sub: '#2a2a2a', badgeFg: YELLOW, badgeBg: '#111', rule: 'rgba(0,0,0,0.35)' });
}

// ── Pictograms ──

const PICTO_CAPTION: Record<Picto, Named> = {
  toilet: { ja: 'お手洗い', en: 'Toilets' },
  lift: { ja: 'エレベーター', en: 'Lift' },
  locker: { ja: 'コインロッカー', en: 'Coin lockers' },
  tickets: { ja: 'きっぷうりば', en: 'Tickets' },
  office: { ja: '駅事務室', en: 'Station office' },
  info: { ja: '案内所', en: 'Information' },
  stairs: { ja: '階段', en: 'Stairs' },
  escalator: { ja: 'エスカレーター', en: 'Escalator' },
  bus: { ja: 'バスのりば', en: 'Buses' },
  taxi: { ja: 'タクシーのりば', en: 'Taxis' },
};

/** A standing figure in the public-sign style: head, torso (or dress), arms, legs. */
function figure(ctx: Ctx, cx: number, top: number, h: number, dress = false) {
  ctx.beginPath();
  ctx.arc(cx, top + h * 0.1, h * 0.1, 0, Math.PI * 2);
  ctx.fill();
  if (dress) {
    ctx.beginPath();
    ctx.moveTo(cx - h * 0.11, top + h * 0.24);
    ctx.lineTo(cx + h * 0.11, top + h * 0.24);
    ctx.lineTo(cx + h * 0.21, top + h * 0.66);
    ctx.lineTo(cx - h * 0.21, top + h * 0.66);
    ctx.closePath();
    ctx.fill();
    for (const s of [-1, 1]) ctx.fillRect(cx + s * h * 0.075 - h * 0.035, top + h * 0.64, h * 0.07, h * 0.36);
  } else {
    rr(ctx, cx - h * 0.13, top + h * 0.23, h * 0.26, h * 0.4, h * 0.05);
    ctx.fill();
    for (const s of [-1, 1]) ctx.fillRect(cx + s * h * 0.065 - h * 0.05, top + h * 0.6, h * 0.1, h * 0.4);
  }
  for (const s of [-1, 1]) {
    rr(ctx, cx + s * (dress ? 0.16 : 0.19) * h - h * 0.035, top + h * 0.25, h * 0.07, h * 0.32, h * 0.03);
    ctx.fill();
  }
}

/** One pictogram: white symbol on a navy square at (x, y), size s. Symbols drawn on a 100-unit grid. */
function pictogram(ctx: Ctx, v: Picto, x: number, y: number, s: number) {
  rr(ctx, x, y, s, s, s * 0.08);
  ctx.fillStyle = NAVY;
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 100, s / 100);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const poly = (pts: number[][]) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();
  };
  switch (v) {
    case 'toilet':
      figure(ctx, 29, 16, 70);
      figure(ctx, 71, 16, 70, true);
      ctx.fillRect(48.5, 14, 3, 74);
      break;
    case 'lift':
      ctx.lineWidth = 5;
      rr(ctx, 22, 30, 56, 60, 4);
      ctx.stroke();
      figure(ctx, 50, 40, 44);
      poly([[36, 12], [44, 24], [28, 24]]);
      poly([[56, 12], [72, 12], [64, 24]]);
      break;
    case 'locker':
      rr(ctx, 20, 14, 60, 74, 3);
      ctx.fill();
      ctx.fillStyle = NAVY;
      ctx.fillRect(48.5, 18, 3, 66);
      for (const yy of [38, 62]) ctx.fillRect(24, yy, 52, 3);
      for (const [kx, ky] of [[42, 28], [72, 28], [42, 52], [72, 52], [42, 76], [72, 76]]) {
        ctx.beginPath();
        ctx.arc(kx, ky - 2, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(kx - 1, ky - 1, 2, 5);
      }
      break;
    case 'tickets':
      ctx.save();
      ctx.translate(50, 52);
      ctx.rotate(-0.22);
      rr(ctx, -34, -20, 68, 40, 4);
      ctx.fill();
      ctx.fillStyle = NAVY;
      ctx.fillRect(-34, 8, 68, 4);
      text(ctx, '¥', 0, -4, 30, { align: 'center', color: NAVY, weight: 800 });
      ctx.restore();
      ctx.fillStyle = '#fff';
      poly([[18, 90], [30, 70], [44, 74], [36, 90]]); // the hand taking it
      break;
    case 'office':
      // Staff member, cap on, behind the counter window.
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, 76, 56);
      figure(ctx, 50, 22, 70);
      ctx.fillRect(38, 20, 24, 5);
      ctx.fillRect(34, 24, 32, 3);
      ctx.fillRect(8, 66, 84, 8);
      ctx.fillStyle = NAVY;
      ctx.fillRect(10, 74, 80, 26);
      break;
    case 'info':
      ctx.beginPath();
      ctx.arc(50, 24, 10, 0, Math.PI * 2);
      ctx.fill();
      rr(ctx, 41, 40, 18, 44, 2);
      ctx.fill();
      ctx.fillRect(33, 40, 12, 7);
      ctx.fillRect(33, 79, 34, 7);
      break;
    case 'stairs': {
      const pts: number[][] = [[12, 88]];
      for (let i = 0; i < 5; i++) pts.push([12 + i * 15, 76 - i * 12], [27 + i * 15, 76 - i * 12]);
      pts.push([88, 28], [88, 88]);
      poly(pts);
      figure(ctx, 52, 8, 46);
      break;
    }
    case 'escalator':
      poly([[8, 90], [30, 90], [80, 44], [94, 44], [94, 30], [72, 30], [22, 76], [8, 76]]);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(14, 64);
      ctx.lineTo(70, 18);
      ctx.stroke();
      figure(ctx, 50, 14, 42);
      break;
    case 'bus':
      rr(ctx, 20, 12, 60, 70, 8);
      ctx.fill();
      ctx.fillRect(14, 30, 6, 14);
      ctx.fillRect(80, 30, 6, 14);
      for (const wx of [24, 64]) ctx.fillRect(wx, 82, 12, 10);
      ctx.fillStyle = NAVY;
      ctx.fillRect(28, 18, 44, 6);
      ctx.fillRect(26, 28, 48, 26);
      for (const hx of [31, 69]) {
        ctx.beginPath();
        ctx.arc(hx, 68, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'taxi':
      rr(ctx, 38, 14, 24, 10, 2);
      ctx.fill();
      poly([[30, 30], [70, 30], [80, 50], [20, 50]]);
      rr(ctx, 12, 48, 76, 26, 6);
      ctx.fill();
      for (const wx of [18, 70]) ctx.fillRect(wx, 74, 12, 12);
      ctx.fillStyle = NAVY;
      poly([[34, 34], [66, 34], [72, 47], [28, 47]]);
      for (const hx of [24, 76]) {
        ctx.beginPath();
        ctx.arc(hx, 60, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      text(ctx, 'TAXI', 50, 19.5, 7, { align: 'center', color: NAVY, weight: 800, maxW: 21 });
      break;
  }
  ctx.restore();
}

function drawPicto(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'picto' }>) {
  ctx.fillStyle = '#fbfbf8';
  ctx.fillRect(0, 0, W, H);
  const cap = PICTO_CAPTION[c.v];
  if (H > W * 1.15) {
    // Tall: symbol on top, then the caption, then the arrow.
    const p = W * 0.07, s = W - 2 * p;
    let y = p;
    pictogram(ctx, c.v, p, y, s);
    y += s + p;
    const rest = H - p - y;
    const capH = c.label ? (c.arrow ? rest * 0.55 : rest) : 0;
    if (c.label && capH > 0) {
      text(ctx, cap.ja, W / 2, y + capH * 0.35, Math.min(capH * 0.42, W * 0.2), { align: 'center', weight: 800, maxW: W - 2 * p });
      text(ctx, cap.en, W / 2, y + capH * 0.78, Math.min(capH * 0.24, W * 0.12), { align: 'center', weight: 600, color: '#333', maxW: W - 2 * p });
    }
    if (c.arrow && rest - capH > 0) {
      const a = Math.min(rest - capH, s) * 0.8;
      arrow(ctx, W / 2, y + capH + (rest - capH) / 2, a, c.arrow, NAVY);
    }
    return;
  }
  // Wide or square: [arrow] symbol [caption] [arrow]. On a near-square sign with an arrow the
  // symbol shrinks to make room for it.
  const p = H * 0.07;
  const s = c.arrow ? Math.min(H - 2 * p, (W - 3 * p) / 1.75) : H - 2 * p;
  let x0 = p, x1 = W - p;
  if (c.arrow) {
    const a = s * 0.75;
    if (c.arrow === 'left') {
      arrow(ctx, x0 + a / 2, H / 2, a, 'left', NAVY);
      x0 += a + p;
    } else {
      arrow(ctx, x1 - a / 2, H / 2, a, c.arrow, NAVY);
      x1 -= a + p;
    }
  }
  const caption = c.label && x1 - x0 - s > s * 0.8;
  // Without a caption the symbol sits in the middle of the room it has.
  const sx = caption ? x0 : (x0 + x1 - s) / 2;
  pictogram(ctx, c.v, sx, (H - s) / 2, s);
  if (caption) {
    const tx = sx + s + p * 1.5, tw = x1 - tx;
    text(ctx, cap.ja, tx, H * 0.4, Math.min(s * 0.4, tw / Math.max(1, [...cap.ja].length) / 0.85), { weight: 800, maxW: tw });
    text(ctx, cap.en, tx, H * 0.74, s * 0.22, { weight: 600, color: '#333', maxW: tw });
  }
}

// ── Station map (構内図) ──

interface MapLevel {
  y: number;
  kind: 'street' | 'concourse' | 'mezz' | 'platform';
  /** Lines sharing one set of platforms at this level (Sumire at Shiokaze's) form a group. */
  groups: { lines: LineDef[]; platforms: number[] }[];
}

/** The station's levels from the data, top to bottom. */
function stationLevels(st: StationDef): MapLevel[] {
  const elevated = stationStreet(st.id).kind === 'elevated';
  const levels: MapLevel[] = [{ y: elevated ? 0.2 : 0.15, kind: 'street', groups: [] }];
  if (!elevated) levels.push({ y: concourseY(st.id), kind: 'concourse', groups: [] });
  const mz = mezzanineY(st.id);
  if (mz !== null) levels.push({ y: mz, kind: 'mezz', groups: [] });
  for (const l of linesAt(st.id)) {
    const y = Math.round((l.railY[l.stops.indexOf(st.id)] + 1.1) * 10) / 10;
    let lv = levels.find((q) => q.kind === 'platform' && Math.abs(q.y - y) < 0.05);
    if (!lv) levels.push((lv = { y, kind: 'platform', groups: [] }));
    const pf = [...st.platforms[l.id]];
    const g = lv.groups.find((q) => q.platforms.join() === pf.join());
    if (g) g.lines.push(l);
    else lv.groups.push({ lines: [l], platforms: pf });
  }
  return levels.sort((a, b) => b.y - a.y);
}

/** Title bar shared by the station and area maps. */
function mapTitle(ctx: Ctx, W: number, th: number, ja: string, en: string, st: StationDef) {
  ctx.fillStyle = '#0d3b66';
  ctx.fillRect(0, 0, W, th);
  const p = th * 0.2;
  logo(ctx, p + th * 0.3, th / 2, th * 0.3, '#fff', '#0d3b66');
  // Station numbers at the right; the title and the station name share what is left between.
  const ls = linesAt(st.id), bs = th * 0.66;
  let r = W - p;
  for (const l of [...ls].reverse()) {
    r -= bs;
    numBadge(ctx, r, (th - bs) / 2, bs, st.numbers[l.id], l.color);
    r -= bs * 0.12;
  }
  let x = p + th * 0.75;
  const room = Math.max(1, r - p - x - th * 0.3);
  const jaW = measure(ctx, ja, th * 0.48, 800), enW = measure(ctx, en, th * 0.26, 600);
  const nameNat = Math.max(measure(ctx, `${st.nameJa}駅`, th * 0.4, 800), measure(ctx, `${st.nameRomaji} Sta.`, th * 0.22, 600));
  const k = Math.min(1, room / (jaW + th * 0.2 + enW + nameNat));
  x += text(ctx, ja, x, th * 0.5, th * 0.48, { color: '#fff', weight: 800, maxW: Math.max(1, jaW * k) }) + th * 0.2 * k;
  text(ctx, en, x, th * 0.56, th * 0.26, { color: '#dfe8f3', weight: 600, maxW: Math.max(1, enW * k) });
  const nameW = Math.max(1, nameNat * k);
  text(ctx, `${st.nameJa}駅`, r - p, th * 0.38, th * 0.4, { color: '#fff', weight: 800, align: 'right', maxW: nameW });
  text(ctx, `${st.nameRomaji} Sta.`, r - p, th * 0.76, th * 0.22, { color: '#dfe8f3', weight: 600, align: 'right', maxW: nameW });
}

/** Schematic stair between two levels: a flight of steps rising left to right. */
function stairGlyph(ctx: Ctx, x: number, yTop: number, yBot: number, w: number) {
  const n = 5, dx = w / n, dy = (yBot - yTop) / n;
  ctx.strokeStyle = '#4b4f55';
  ctx.lineWidth = Math.max(1.5, w * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, yBot);
  for (let i = 0; i < n; i++) {
    ctx.lineTo(x + i * dx, yBot - (i + 1) * dy);
    ctx.lineTo(x + (i + 1) * dx, yBot - (i + 1) * dy);
  }
  ctx.stroke();
}

/** Schematic escalator: a sloping band with a chevron. */
function escalatorGlyph(ctx: Ctx, x: number, yTop: number, yBot: number, w: number) {
  const t = Math.max(3, w * 0.16);
  ctx.fillStyle = '#7b8189';
  ctx.beginPath();
  ctx.moveTo(x, yBot);
  ctx.lineTo(x + w * 0.2, yBot);
  ctx.lineTo(x + w, yTop + t);
  ctx.lineTo(x + w, yTop);
  ctx.lineTo(x + w * 0.8, yTop);
  ctx.lineTo(x, yBot - t);
  ctx.closePath();
  ctx.fill();
}

function drawStationMap(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'stationmap' }>) {
  const st = stationById(c.station);
  ctx.fillStyle = '#f7f7f2';
  ctx.fillRect(0, 0, W, H);
  const th = Math.min(H * 0.12, W * 0.09);
  mapTitle(ctx, W, th, '構内図', 'Station map', st);
  const levels = stationLevels(st);
  const exits = stationExits(st.id);
  const elevated = stationStreet(st.id).kind === 'elevated';
  const p = Math.min(W, H) * 0.035;
  const top = th + p, rowH = (H - p - top) / levels.length;
  const lw = Math.min(W * 0.3, rowH * 3.2), dx0 = p + lw + p, dx1 = W - p, dw = dx1 - dx0;
  const bandTop = (i: number) => top + i * rowH + rowH * 0.3, bh = rowH * 0.44;
  const above = levels.filter((l) => l.y > 1).length;
  let below = 0;
  // Exits spread along the street band (its first third when the gates share it); the stairs to
  // them drawn under each.
  const span = elevated ? 0.34 : 1;
  const exitX = (i: number) => dx0 + dw * span * ((i + 0.5) / exits.length);

  levels.forEach((lv, i) => {
    const by = bandTop(i), cy = by + bh / 2;
    // Floor name.
    let code: string, ja: string, en: string;
    if (lv.kind === 'street') [code, ja, en] = elevated ? ['1F', '1階 改札・出入口', 'Street level'] : ['GL', '地上', 'Street level'];
    else if (lv.y > 1) [code, ja, en] = [`${above - i + 1}F`, `${above - i + 1}階 ホーム`, 'Platforms'];
    else {
      below++;
      [code, ja, en] = lv.kind === 'concourse' ? [`B${below}`, `地下${below}階 改札階`, 'Concourse']
        : lv.kind === 'mezz' ? [`B${below}`, `地下${below}階 のりかえ通路`, 'Transfer passage'] : [`B${below}`, `地下${below}階 ホーム`, 'Platforms'];
    }
    const cs = Math.min(bh, lw * 0.3);
    rr(ctx, p, cy - cs / 2, cs * 1.1, cs, cs * 0.12);
    ctx.fillStyle = '#3b4046';
    ctx.fill();
    text(ctx, code, p + cs * 0.55, cy, cs * 0.5, { align: 'center', color: '#fff', weight: 800, maxW: cs });
    const lx = p + cs * 1.3, lwText = lw - cs * 1.3;
    text(ctx, ja, lx, cy - bh * 0.17, Math.min(bh * 0.32, rowH * 0.2), { weight: 800, maxW: lwText });
    text(ctx, en, lx, cy + bh * 0.24, Math.min(bh * 0.2, rowH * 0.13), { weight: 600, color: '#444', maxW: lwText });

    // The level itself.
    if (lv.kind === 'platform') {
      const gw = dw / lv.groups.length;
      lv.groups.forEach((g, k) => {
        const gx = dx0 + k * gw + (k ? p * 0.3 : 0), w = gw - (lv.groups.length > 1 ? p * 0.3 : 0);
        ctx.fillStyle = g.lines[0].color;
        ctx.fillRect(gx, by, w, bh);
        const r = bh * 0.3;
        let x = gx + bh * 0.2;
        for (const l of g.lines) {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(x + r, cy, r * 1.12, 0, Math.PI * 2);
          ctx.fill();
          lineBadge(ctx, x + r, cy, r, l);
          x += r * 2.4;
        }
        const tw = gx + w - x - bh * 0.2;
        const pf = `${g.platforms.join('・')}番線`;
        if (tw < measure(ctx, pf, bh * 0.36, 800) * 0.8) {
          // A narrow band (three lines side by side at the hub): the badge names the line, so
          // just the platform numbers, as large as fit.
          text(ctx, pf, x, cy, Math.min(bh * 0.42, tw / (measure(ctx, pf, 1, 800) * 0.85)), { color: '#fff', weight: 800, maxW: tw });
        } else {
          text(ctx, pf, x, cy - bh * 0.17, bh * 0.36, { color: '#fff', weight: 800, maxW: tw });
          text(ctx, `${g.lines.map((l) => l.nameJa).join('・')}  ${g.lines.map((l) => l.nameEn).join(' / ')}`, x, cy + bh * 0.25, bh * 0.2, { color: '#fff', weight: 600, maxW: tw });
        }
      });
    } else {
      ctx.fillStyle = lv.kind === 'street' ? '#e2e9da' : lv.kind === 'mezz' ? '#ece8df' : '#e3eaf2';
      ctx.fillRect(dx0, by, dw, bh);
      ctx.strokeStyle = '#9aa0a6';
      ctx.lineWidth = Math.max(1, bh * 0.03);
      ctx.strokeRect(dx0, by, dw, bh);
      if (lv.kind === 'street') {
        const bs = Math.min(bh * 0.78, ((dw * span) / exits.length) * 0.8);
        exits.forEach((e, k) => exitBadge(ctx, exitX(k) - bs / 2, cy - bs / 2, bs, e.num, '#111', YELLOW));
      }
      if (lv.kind === 'mezz') text(ctx, 'のりかえ通路  Transfer passage', dx0 + dw / 2, cy, bh * 0.3, { align: 'center', weight: 700, maxW: dw * 0.9 });
      if (lv.kind === 'concourse' || (lv.kind === 'street' && elevated)) {
        // Ticket gates, and You are here on the unpaid side of them.
        const gx = dx0 + dw * (elevated ? 0.74 : 0.5);
        ctx.fillStyle = '#3b4046';
        for (let k = -2; k <= 2; k++) ctx.fillRect(gx + k * bh * 0.14 - bh * 0.025, by + bh * 0.15, bh * 0.05, bh * 0.4);
        text(ctx, '改札  Gates', gx, by + bh * 0.78, bh * 0.2, { align: 'center', weight: 700, maxW: dw * 0.25 });
        const hx = dx0 + dw * (elevated ? 0.48 : 0.16), hr = bh * 0.16;
        ctx.fillStyle = '#e02020';
        ctx.beginPath();
        ctx.arc(hx, by + bh * 0.32, hr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(hx, by + bh * 0.32, hr * 0.4, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, '現在地  You are here', hx, by + bh * 0.76, bh * 0.2, { align: 'center', color: '#e02020', weight: 800, maxW: dw * (elevated ? 0.2 : 0.3) });
      }
    }

    // Links to the level below: exit stairs from the street, stairs (and escalators to an
    // island platform or the mezzanine) between the others.
    const next = levels[i + 1];
    if (!next) return;
    const yTop = by + bh, yBot = bandTop(i + 1), gap = yBot - yTop;
    if (gap < 4) return;
    const gw = Math.min(gap * 1.3, dw * 0.08);
    if (lv.kind === 'street' && next.kind === 'concourse') {
      exits.forEach((_, k) => stairGlyph(ctx, exitX(k) - gw / 2, yTop + gap * 0.12, yBot - gap * 0.12, gw));
      return;
    }
    // Island platforms and the mezzanine are reached by stair + escalator; an elevated station's
    // platforms by stairs only.
    const esc = next.kind === 'mezz' || lv.kind === 'mezz' || (!elevated && next.groups.some((g) => g.lines.some((l) => l.platformType === 'island')));
    const mx = dx0 + dw * 0.5;
    stairGlyph(ctx, mx - gw * (esc ? 1.2 : 0.5), yTop + gap * 0.12, yBot - gap * 0.12, gw);
    if (esc) escalatorGlyph(ctx, mx + gw * 0.2, yTop + gap * 0.12, yBot - gap * 0.12, gw);
  });
}

// ── Area map (周辺図) ──

const BLOCK_FILL: Record<BlockStyle, string> = {
  office: '#cdd6df', mixed: '#e6dccb', neon: '#ddc9d4', apartment: '#e9e0cc', house: '#efe6d2', oldtown: '#dfcfb0',
  godown: '#e6e3dc', warehouse: '#d9c2b4', campus: '#e2cfc0', park: '#c4e2b4', sea: '#e3dfd3', dome: '#dde9ec',
};
const WATER = '#a9d1ea', ROAD = '#ffffff', ROAD_EDGE = '#c4bfb2';

/** Canvas rectangle [x0, y0, x1, y1] the map is drawn in. */
type Box = [number, number, number, number];

const hits = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/**
 * A map label: Japanese over English on a translucent white backing, centred on (x, y), kept
 * inside the map and nudged up or down off anything already placed. Left out if there is no
 * room (labels go in order of importance).
 */
function mapLabel(ctx: Ctx, n: Named, x0: number, y0: number, px: number, maxW: number, box: Box, placed: Box[], color = '#111') {
  const w = Math.min(maxW, box[2] - box[0] - px, Math.max(measure(ctx, n.ja, px, 800), measure(ctx, n.en, px * 0.6, 600)));
  const x = Math.min(Math.max(x0, box[0] + w / 2 + px * 0.3), box[2] - w / 2 - px * 0.3);
  const at = (dy: number): [number, Box] => {
    const y = Math.min(Math.max(y0 + dy, box[1] + px * 0.8), box[3] - px * 1.05);
    return [y, [x - w / 2 - px * 0.25, y - px * 0.75, x + w / 2 + px * 0.25, y + px]];
  };
  const fit = [0, -1, 1, -2, 2].map((k) => at(k * px * 1.9)).find(([, b]) => !placed.some((q) => hits(q, b)));
  if (!fit) return;
  const [y, b] = fit;
  placed.push(b);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  rr(ctx, x - w / 2 - px * 0.25, y - px * 0.75, w + px * 0.5, px * 1.75, px * 0.2);
  ctx.fill();
  text(ctx, n.ja, x, y - px * 0.12, px, { align: 'center', color, weight: 800, maxW: w });
  text(ctx, n.en, x, y + px * 0.68, px * 0.6, { align: 'center', color: '#333', weight: 600, maxW: w });
}

function drawAreaMap(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'areamap' }>) {
  const st = stationById(c.station);
  ctx.fillStyle = '#f7f7f2';
  ctx.fillRect(0, 0, W, H);
  const th = Math.min(H * 0.12, W * 0.09);
  mapTitle(ctx, W, th, '周辺図', 'Area map', st);
  const p = Math.min(W, H) * 0.03;
  const bx = p, by = th + p, bw = W - 2 * p, bh = H - th - 2 * p;
  const plan = stationStreet(st.id);
  if (plan.kind === 'hub') {
    // The hub's street is not laid out by surface(); list its exits instead of inventing a plan.
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx, by, bw, bh);
    exitRows(ctx, plan.exits, bx + p, by + p, bw - 2 * p, bh - 2 * p, { fg: '#111', sub: '#333', badgeFg: '#111', badgeBg: YELLOW, rule: 'rgba(0,0,0,0.18)' });
    return;
  }
  // Station frame → canvas: x along the line to the right, +z down.
  const X = PLOT.x, Z = PLOT.z;
  const sc = Math.min(bw / (2 * X), bh / (2 * Z));
  const ox = bx + bw / 2, oy = by + bh / 2;
  const P = (x: number, z: number): [number, number] => [ox + x * sc, oy + z * sc];
  const R = (x0: number, z0: number, x1: number, z1: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(ox + Math.min(x0, x1) * sc, oy + Math.min(z0, z1) * sc, Math.abs(x1 - x0) * sc, Math.abs(z1 - z0) * sc);
  };
  const lp = Math.max(9, Math.min(sc * 7, H * 0.04)); // label size
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox - X * sc, oy - Z * sc, 2 * X * sc, 2 * Z * sc);
  ctx.clip();
  R(-X, -Z, X, Z, '#ebe8df');
  const m: MapCtx = { R, P, sc, lp, box: [...P(-X, -Z), ...P(X, Z)], placed: [] };
  const spec = SPECS[st.id];
  if (plan.kind === 'street') areaStreet(ctx, st, plan, m);
  else if (spec.kind === 'elevated' && spec.layout) areaOpenAir(ctx, st, plan.exits, m, OPEN_AIR[spec.layout]);
  else areaElevated(ctx, st, plan.exits, m);
  ctx.restore();
  ctx.strokeStyle = '#9aa0a6';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - X * sc, oy - Z * sc, 2 * X * sc, 2 * Z * sc);
}

/** What the area-map helpers share: plan → canvas, scale, label size, the map box, and what is placed. */
interface MapCtx {
  R: (x0: number, z0: number, x1: number, z1: number, fill: string) => void;
  P: (x: number, z: number) => [number, number];
  sc: number;
  lp: number;
  box: Box;
  placed: Box[];
}

/** Exit openings and their number badges, set out from the opening onto the block side. */
function areaExits(ctx: Ctx, exits: StationExit[], m: MapCtx) {
  const bs = Math.max(m.lp * 1.5, m.sc * 7);
  for (const e of exits) {
    const [x0, z0, x1, z1] = e.rect;
    m.R(x0, z0, x1, z1, '#3b4046');
    const [cx, cz] = m.P((x0 + x1) / 2, (z0 + z1) / 2);
    const [dx, dz] = e.side ? [0, e.side * bs * 0.75] : [-bs * 0.75, 0];
    const x = cx + dx - bs / 2, y = cz + dz - bs / 2;
    exitBadge(ctx, x, y, bs, e.num, '#111', YELLOW);
    m.placed.push([x, y, x + bs, y + bs]);
  }
}

/** You are here: the station under the street, with the operator's mark. */
function areaStation(ctx: Ctx, st: StationDef, box: PlanRect, m: MapCtx) {
  const { P, lp } = m;
  const [ax, az] = P(box[0], box[1]), [bx, bz] = P(box[2], box[3]);
  ctx.fillStyle = 'rgba(13,59,102,0.16)';
  ctx.fillRect(ax, az, bx - ax, bz - az);
  ctx.strokeStyle = '#0d3b66';
  ctx.lineWidth = Math.max(1.5, lp * 0.15);
  ctx.setLineDash([lp * 0.5, lp * 0.35]);
  ctx.strokeRect(ax, az, bx - ax, bz - az);
  ctx.setLineDash([]);
  const cx = (ax + bx) / 2, cz = (az + bz) / 2;
  logo(ctx, cx - lp * 2.6, cz, lp * 0.8);
  text(ctx, `${st.nameJa}駅`, cx - lp * 1.6, cz - lp * 0.2, lp, { weight: 800, color: '#0d3b66', maxW: (bx - ax) * 0.5 });
  text(ctx, '現在地 You are here', cx - lp * 1.6, cz + lp * 0.75, lp * 0.6, { weight: 800, color: '#e02020', maxW: (bx - ax) * 0.55 });
  m.placed.push([cx - lp * 3.5, cz - lp * 0.8, cx - lp * 1.6 + (bx - ax) * 0.55, cz + lp * 1.1]);
}

function areaStreet(ctx: Ctx, st: StationDef, plan: Extract<StationStreet, { kind: 'street' }>, m: MapCtx) {
  const { R, P, sc, lp } = m;
  const s = plan.surface, X = PLOT.x, Z = PLOT.z, rw = s.roadHalf, sw = plan.swOut;
  const { crossHalf, aveHalf, seaZ, canalHalf } = STREET;
  const canal = s.canalAt;
  // Cross streets and building blocks, as surface() lays them out.
  const streets = s.cross.filter((x) => x !== canal).map((x) => [x - crossHalf, x + crossHalf]);
  if (s.avenue) streets.push([-aveHalf, aveHalf]);
  streets.sort((a, b) => a[0] - b[0]);
  const edges = [-X + 1, ...streets.flatMap(([a, b]) => [a - 3, b + 3]), X - 1];
  if (canal !== undefined) edges.splice(edges.findIndex((e) => e > canal), 0, canal - 10, canal + 10);
  const blocks: [number, number][] = [];
  for (let i = 0; i < edges.length; i += 2) if (edges[i + 1] - edges[i] >= 6) blocks.push([edges[i], edges[i + 1]]);
  // Plain block names are placed after the named places, so they give way when space is short.
  const labels: { n: Named; x: number; z: number; plain?: boolean }[] = [];

  for (const side of [-1, 1] as const) {
    const style = side < 0 ? s.left : s.right;
    const far = side * Z, near = side * sw;
    if (style === 'sea') {
      R(-X, near, X, side * seaZ, BLOCK_FILL.sea);
      R(-X, side * seaZ, X, far, WATER);
      if (s.waterfront === 'promenade') {
        R(-X, side * (seaZ - 9), X, side * (seaZ - 0.4), '#d7c3a6');
        labels.push({ n: s.promenadeName ?? PLACE.promenade, x: 0, z: side * (seaZ - 14) });
        labels.push({ n: PLACE.sea, x: 60, z: side * (seaZ + Z) / 2, plain: true });
      } else {
        const [f0, f1] = STREET.ferry;
        R(f0, side * (sw + 8), f1, side * (seaZ - 8), '#c9d5df');
        labels.push({ n: s.quayName ?? PLACE.ferry, x: (f0 + f1) / 2, z: side * (sw + seaZ) / 2 });
        labels.push({ n: KIND.sea, x: 70, z: side * (seaZ + Z) / 2, plain: true });
      }
      continue;
    }
    for (const [xa, xb] of blocks) {
      const arcadeLot = side < 0 && s.arcadeAt !== undefined && Math.abs(xb + 3 + crossHalf - s.arcadeAt) < 1;
      const kind: BlockStyle = arcadeLot ? 'oldtown' : style === 'park' ? 'house' : style;
      R(xa, near, xb, far, BLOCK_FILL[kind]);
    }
    if (style === 'park') {
      const [p0, p1] = STREET.park;
      R(p0, side * (sw + 1.5), p1, side * (sw + STREET.parkDepth), BLOCK_FILL.park);
      labels.push({ n: s.parkName ?? KIND.park, x: (p0 + p1) / 2, z: side * (sw + STREET.parkDepth / 2) });
    } else if (style === 'dome') {
      const { cx, dz, r } = STREET.dome;
      R(-X, near, X, far, BLOCK_FILL.dome);
      const [px, pz] = P(cx, side * (sw + dz));
      ctx.fillStyle = '#b9d3dc';
      ctx.strokeStyle = '#0f7a8a';
      ctx.lineWidth = Math.max(1.5, sc * 0.8);
      ctx.beginPath();
      ctx.arc(px, pz, r * sc, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      labels.push({ n: KIND.dome, x: cx, z: side * (sw + 24) });
    } else if (style === 'campus') {
      labels.push({ n: s.campusName ?? KIND.campus, x: -40, z: side * (sw + 22) });
    } else {
      // Name the block kind on the widest block clear of the exits.
      const clear = blocks.filter(([a, b]) => !plan.exits.some((e) => e.side === side && e.rect[2] > a && e.rect[0] < b));
      const [a, b] = (clear.length ? clear : blocks).reduce((w, q) => (q[1] - q[0] > w[1] - w[0] ? q : w));
      labels.push({ n: KIND[style], x: (a + b) / 2, z: side * (sw + 22), plain: true });
    }
  }
  // Roads over the blocks: cross streets, the main road (over any canal: the bridge).
  const seaSide = s.right === 'sea' ? 1 : s.left === 'sea' ? -1 : 0;
  for (const [a, b] of streets) {
    const z0 = seaSide < 0 ? -seaZ : -Z, z1 = seaSide > 0 ? seaZ : Z;
    R(a, z0, b, z1, ROAD);
  }
  if (canal !== undefined) {
    for (const side of [-1, 1]) R(canal - canalHalf, side * (sw + 1.5), canal + canalHalf, side * Z, WATER);
    labels.push({ n: s.canalName ?? PLACE.canal, x: canal, z: -(rw + sw) / 2 - 1 });
  }
  R(-X, -rw, X, rw, ROAD);
  for (const side of [-1, 1]) R(-X, side * rw - 0.3, X, side * rw + 0.3, ROAD_EDGE);
  if (s.arcadeAt !== undefined) {
    const a = s.arcadeAt, h = STREET.arcadeHalf;
    R(a - h, -Z + 2, a + h, -sw - 1, '#e7b49b');
    for (let z = -sw - 6; z > -Z + 2; z -= 6) R(a - h, z - 0.4, a + h, z + 0.4, '#b9482b');
    labels.push({ n: s.arcadeName ?? PLACE.arcade, x: a, z: -(sw + Z) / 2 });
  }
  areaStation(ctx, st, plan.box, m);
  areaExits(ctx, plan.exits, m);
  for (const l of [...labels.filter((q) => !q.plain), ...labels.filter((q) => q.plain)]) {
    const [x, y] = P(l.x, l.z);
    mapLabel(ctx, l.n, x, y, lp, 70 * sc, m.box, m.placed);
  }
}

/** Kasumidani and Shiondai: their own plans (exits.ts OPEN_AIR). */
function areaOpenAir(ctx: Ctx, st: StationDef, exits: StationExit[], m: MapCtx, plan: OpenAirPlan) {
  const { R, P, sc, lp } = m;
  const line = linesAt(st.id)[0];
  const fill: Record<AreaFill, string> = {
    house: BLOCK_FILL.house, apartment: BLOCK_FILL.apartment, road: '#d6d3cb', plaza: '#f3f1ea',
    track: '#c3c7cc', green: BLOCK_FILL.park, shop: '#d9d2e6', deck: '#b9b0d6',
  };
  for (const a of plan.areas) {
    R(a.r[0], a.r[1], a.r[2], a.r[3], fill[a.fill]);
    if (a.fill === 'track') R(a.r[0], -1, a.r[2], 1, line.color);
  }
  areaStation(ctx, st, plan.box, m);
  areaExits(ctx, exits, m);
  const icon = (v: Picto, [x, z]: [number, number]) => {
    const [px, pz] = P(x, z), s = Math.max(lp * 1.4, sc * 6);
    pictogram(ctx, v, px - s / 2, pz - s / 2, s);
    m.placed.push([px - s / 2, pz - s / 2, px + s / 2, pz + s / 2]);
  };
  icon('bus', plan.bus);
  if (plan.taxi) icon('taxi', plan.taxi);
  for (const a of plan.areas) {
    if (!a.label) continue;
    const [px, pz] = P((a.r[0] + a.r[2]) / 2, (a.r[1] + a.r[3]) / 2);
    mapLabel(ctx, a.label, px, pz, lp, 70 * sc, m.box, m.placed);
  }
}

function areaElevated(ctx: Ctx, st: StationDef, exits: StationExit[], m: MapCtx) {
  const { R, P, sc, lp } = m;
  const X = PLOT.x, Z = PLOT.z, E = ELEVATED;
  const line = linesAt(st.id)[0];
  R(-126, E.houses[0], 124, E.houses[1], BLOCK_FILL.house);
  R(-126, E.apartments[0], 124, E.apartments[1], BLOCK_FILL.apartment);
  R(-X, E.road[0], X, E.road[1], ROAD);
  R(E.crossSt[0], E.road[1], E.crossSt[1], Z, ROAD);
  R(-X, E.back[0], X, E.back[1], ROAD);
  // The viaduct, in the line's colour, and the station under it.
  R(-X, -5.2, X, 5.2, '#c3c7cc');
  R(-X, -1, X, 1, line.color);
  const [c0, c1, cw] = E.concourse;
  R(c0, -cw, c1, cw, '#dfe6ef');
  R(-26, cw, 60, E.road[0], '#f3f1ea'); // station plaza
  R(E.store[0], E.store[1], E.store[2], E.store[3], '#0b8f6a');
  for (const [a, b] of E.bikes) R(a, E.bikeZ[0], b, E.bikeZ[1], '#9aa0a6');
  const icon = (v: Picto, x: number, z: number) => {
    const [px, pz] = P(x, z), s = Math.max(lp * 1.4, sc * 6);
    pictogram(ctx, v, px - s / 2, pz - s / 2, s);
    m.placed.push([px - s / 2, pz - s / 2, px + s / 2, pz + s / 2]);
  };
  icon('bus', (E.bus[0] + E.bus[2]) / 2, (E.bus[1] + E.bus[3]) / 2);
  icon('taxi', (E.taxi[0] + E.taxi[2]) / 2, (E.taxi[1] + E.taxi[3]) / 2);
  const label = (n: Named, x: number, z: number) => {
    const [px, pz] = P(x, z);
    mapLabel(ctx, n, px, pz, lp, 70 * sc, m.box, m.placed);
  };
  areaStation(ctx, st, [c0, -cw, c1, cw], m);
  areaExits(ctx, exits, m);
  label(PLACE.mart, (E.store[0] + E.store[2]) / 2, (E.store[1] + E.store[3]) / 2);
  label(PLACE.bikes, (E.bikes[1][0] + E.bikes[1][1]) / 2, -12);
  label(PLACE.plaza, 20, 17);
  label(KIND.house, -70, -45);
  label(KIND.apartment, -40, 49);
  label({ ja: line.nameJa, en: line.nameEn }, 95, -12);
}

function drawClock(ctx: Ctx, W: number, H: number) {
  // Plain railway clock: white face, black batons, red second hand. Reads the sim clock.
  const t = ((clock.time % 43200) + 43200) % 43200;
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2;
  ctx.fillStyle = '#1b1f24';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fbfbf8';
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.92, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillRect(-R * (big ? 0.025 : 0.01), -R * 0.86, R * (big ? 0.05 : 0.02), R * (big ? 0.18 : 0.07));
    ctx.restore();
  }
  const hand = (frac: number, len: number, w: number, col: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(frac * Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fillRect(-R * w / 2, -R * len, R * w, R * (len + 0.14));
    ctx.restore();
  };
  hand(t / 43200, 0.5, 0.07, '#111');
  hand((t % 3600) / 3600, 0.78, 0.05, '#111');
  hand(Math.floor(t % 60) / 60, 0.8, 0.018, '#d0211c');
  ctx.fillStyle = '#d0211c';
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

function drawDest(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'dest' }>) {
  ctx.fillStyle = '#060606';
  ctx.fillRect(0, 0, W, H);
  if (c.dir === 'none') {
    text(ctx, '回送', W * 0.3, H / 2, H * 0.62, { align: 'center', color: '#ff8f00' });
    text(ctx, 'Not in service', W * 0.7, H / 2, H * 0.3, { align: 'center', color: '#ff8f00', weight: 600, maxW: W * 0.5 });
    return;
  }
  const line = lineById(c.line), t = terminusOf(line, c.dir);
  ctx.fillStyle = line.color;
  ctx.fillRect(0, 0, W * 0.22, H);
  text(ctx, '普通', W * 0.11, H * 0.36, H * 0.42, { align: 'center', color: '#fff', maxW: W * 0.2 });
  text(ctx, 'Local', W * 0.11, H * 0.78, H * 0.24, { align: 'center', color: '#fff', weight: 600, maxW: W * 0.2 });
  text(ctx, t.nameJa, W * 0.61, H * 0.38, H * 0.5, { align: 'center', color: '#ffb300', maxW: W * 0.74 });
  text(ctx, t.nameRomaji, W * 0.61, H * 0.8, H * 0.22, { align: 'center', color: '#ffb300', weight: 600, maxW: W * 0.74 });
}

function drawLcd(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'lcd' }>) {
  const line = lineById(c.line);
  const { tt } = lineSim(c.line);
  const st = trainStateAt(tt, c.train, clock.time);
  const p = st.phase;
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = line.color;
  ctx.fillRect(0, 0, W, H * 0.2);
  const inService = p.kind === 'run' ? p.inService : p.role !== 'reverse' && p.role !== 'arrival';
  const dest = terminusOf(line, p.dir);
  text(ctx, inService ? `${line.nameJa}  ${dest.nameJa} ゆき` : line.nameJa, H * 0.12, H * 0.105, H * 0.13, { color: '#fff', maxW: W * 0.55 });
  text(ctx, inService ? `${line.nameEn} for ${dest.nameRomaji}` : line.nameEn, W - H * 0.12, H * 0.105, H * 0.1, { color: '#fff', align: 'right', weight: 600, maxW: W * 0.4 });
  let label = '', ja = '', en = '', num = '';
  const stopIdx = p.kind === 'run' ? p.toStop : p.stop;
  if (stopIdx >= 0 && (p.kind === 'dwell' || p.inService)) {
    const s = stationById(line.stops[stopIdx]);
    ja = s.nameJa;
    en = s.nameRomaji;
    num = s.numbers[line.id];
    const terminating = p.kind === 'dwell' ? p.role === 'arrival' : dest.id === s.id;
    label = p.kind === 'dwell' ? (terminating ? '終点  Last stop' : 'ただいま  Now at') : terminating ? 'つぎは 終点  Next (last stop)' : 'つぎは  Next';
  } else {
    label = '';
    ja = '回送';
    en = 'Not in service';
  }
  text(ctx, label, H * 0.15, H * 0.36, H * 0.12, { color: '#9fb3c8', weight: 600 });
  let x = H * 0.15;
  if (num) {
    numBadge(ctx, x, H * 0.47, H * 0.4, num, line.color);
    x += H * 0.5;
  }
  text(ctx, ja, x, H * 0.62, H * 0.34, { color: '#fff', weight: 800, maxW: W * 0.45 });
  text(ctx, en, W - H * 0.15, H * 0.66, H * 0.17, { color: '#dfe8f3', weight: 600, align: 'right', maxW: W * 0.4 });
  if (p.kind === 'dwell' && p.doors) text(ctx, 'ドアが開きます  Doors open', W / 2, H * 0.9, H * 0.1, { color: '#ffb300', align: 'center', weight: 600 });
}

/**
 * Floor mark (stations/floor.ts), seen from standing height at a slant, so: few elements, bold,
 * white on a dark tile framed in the line's colour. A tile is opaque, so it fills the whole sign.
 * Tall (a big mark, read lengthwise as you walk onto it): arrow, badge, platform numbers or
 * のりかえ, then the small Japanese and English. Square or wide: the same in a row, or just the
 * arrow and badge (the small badge repeated along a band).
 */
function drawFloormark(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'floormark' }>) {
  const line = c.line ? lineById(c.line) : null;
  const m = Math.min(W, H);
  ctx.fillStyle = line?.color ?? '#5b6168';
  ctx.fillRect(0, 0, W, H);
  const f = m * 0.07;
  rr(ctx, f, f, W - 2 * f, H - 2 * f, m * 0.08);
  ctx.fillStyle = '#1d2228';
  ctx.fill();
  const nums = c.nums?.length ? c.nums.join('・') : null;
  const main = c.transfer ? 'のりかえ' : nums ?? c.text ?? null;
  const ja = c.transfer ? line?.nameJa : nums ? 'のりば' : c.sub;
  const en = c.transfer ? 'Transfer' : nums ? `Platform${c.nums!.length > 1 ? 's' : ''} ${c.nums!.join('·')}` : undefined;
  const dir = c.arrow ?? 'up';
  const badge = (x: number, y: number, r: number) => {
    if (!line) return;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, r * 1.12, 0, Math.PI * 2);
    ctx.fill();
    lineBadge(ctx, x, y, r, line);
  };
  const inW = W - 2 * f;
  if (H >= W * 1.2) {
    if (!main) {
      arrow(ctx, W / 2, H * 0.3, Math.min(H * 0.34, inW * 0.8), dir, '#fff');
      badge(W / 2, H * 0.7, Math.min(H * 0.13, inW * 0.3));
      return;
    }
    arrow(ctx, W / 2, H * 0.17, Math.min(H * 0.22, inW * 0.7), dir, '#fff');
    badge(W / 2, H * 0.385, Math.min(H * 0.085, inW * 0.26));
    const big = c.transfer ? H * 0.11 : H * 0.17;
    text(ctx, main, W / 2, H * 0.58, big, { align: 'center', color: '#fff', weight: 800, maxW: inW * 0.86 });
    if (ja) text(ctx, ja, W / 2, H * 0.755, H * 0.07, { align: 'center', color: '#fff', weight: 700, maxW: inW * 0.86 });
    if (en) text(ctx, en, W / 2, H * 0.86, H * 0.055, { align: 'center', color: '#d5dbe2', weight: 700, maxW: inW * 0.86 });
    return;
  }
  if (!main) {
    arrow(ctx, W / 2, H * 0.31, Math.min(H * 0.4, inW * 0.7), dir, '#fff');
    badge(W / 2, H * 0.72, Math.min(H * 0.17, inW * 0.3));
    return;
  }
  arrow(ctx, f + inW * 0.12, H / 2, Math.min(H * 0.6, inW * 0.2), dir, '#fff');
  badge(f + inW * 0.32, H * 0.42, Math.min(H * 0.17, inW * 0.08));
  const x = f + inW * 0.44, maxW = inW * 0.53;
  text(ctx, main, x, H * 0.4, c.transfer ? H * 0.24 : H * 0.34, { color: '#fff', weight: 800, maxW });
  if (ja) text(ctx, ja, x, H * 0.7, H * 0.11, { color: '#fff', weight: 700, maxW });
  if (en) text(ctx, en, x, H * 0.84, H * 0.09, { color: '#d5dbe2', weight: 700, maxW });
}

export function drawSign(ctx: Ctx, W: number, H: number, c: SignContent) {
  ctx.clearRect(0, 0, W, H);
  switch (c.k) {
    case 'name': return drawName(ctx, W, H, c);
    case 'dir': return drawDir(ctx, W, H, c);
    case 'guide': return drawGuide(ctx, W, H, c);
    case 'entrance': return drawEntrance(ctx, W, H, c);
    case 'faremap': return drawFareMap(ctx, W, H, c);
    case 'shop': return drawShop(ctx, W, H, c);
    case 'poster': return drawPoster(ctx, W, H, c.v);
    case 'machine': return drawMachine(ctx, W, H, c.v);
    case 'mural': return drawMural(ctx, W, H, c);
    case 'label':
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, W, H);
      text(ctx, c.text, W / 2, c.sub ? H * 0.4 : H / 2, H * (c.sub ? 0.46 : 0.6), { align: 'center', color: c.fg, weight: 800, maxW: W * 0.92 });
      if (c.sub) text(ctx, c.sub, W / 2, H * 0.8, H * 0.22, { align: 'center', color: c.fg, weight: 600, maxW: W * 0.92 });
      return;
    case 'exits': return drawExits(ctx, W, H, c);
    case 'picto': return drawPicto(ctx, W, H, c);
    case 'stationmap': return drawStationMap(ctx, W, H, c);
    case 'areamap': return drawAreaMap(ctx, W, H, c);
    case 'clock': return drawClock(ctx, W, H);
    case 'dep': return drawDep(ctx, W, H, c);
    case 'depAll': return drawDepAll(ctx, W, H, c);
    case 'dest': return drawDest(ctx, W, H, c);
    case 'lcd': return drawLcd(ctx, W, H, c);
    case 'floormark': return drawFloormark(ctx, W, H, c);
  }
}

/** Pixel size for a sign of w × h metres. */
export function signPixels(w: number, h: number): [number, number] {
  const ppm = Math.min(360, Math.max(110, 900 / Math.max(w, h)));
  const W = Math.min(1024, Math.max(64, Math.round(w * ppm)));
  return [W, Math.max(32, Math.round((W * h) / w))];
}

export { OPERATOR };

/** Canvas size for a sign: one pixel per LED on a dot-matrix board, signPixels otherwise. */
export function signSize(c: SignContent, w: number, h: number): [number, number] {
  return boardPixels(c, w, h) ?? signPixels(w, h);
}

export { isLed, platformTrains } from './departures';
