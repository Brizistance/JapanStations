// Platform departure boards: a platform shared by two lines (Sumire trains at the Shiokaze
// platforms) must list both lines' trains, with times read from each line's timetable.

import { describe, expect, it } from 'vitest';
import { STATIONS, lineById, stationById } from '../data/network';
import { lineSim } from '../sim';
import { nextDepartures } from '../sim/timetable';
import { stationExits } from '../stations/exits';
import { SPECS } from '../stations/specs';
import type { Picto, SignContent } from './content';
import { drawSign, platformTrains, signSize } from './draw';
import { LINES, linesAt } from '../data/network';
import { formatClock } from '../sim';
import { nextArrivals, trainStateAt } from '../sim/timetable';
import { themeFor } from '../stations/themes';
import { BOARD, lineBoard, stationBoard } from './board-style';
import { depAllModel, depAllRows, depModel, drawDep, drawDepAll } from './departures';

const S = lineById('S'), M = lineById('M');

describe('platform departure boards', () => {
  for (const id of ['daigaku-mae', 'hanamizuki']) {
    for (const dir of ['down', 'up'] as const) {
      it(`${id} (${dir}): Shiokaze platform lists Sumire trains too, in order, at their real times`, () => {
        const st = stationById(id);
        const mDeps = new Set(nextDepartures(lineSim('M').tt, M.stops.indexOf(id), dir, 36000, 20).map((d) => d.dep));
        const sDeps = new Set(nextDepartures(lineSim('S').tt, S.stops.indexOf(id), dir, 36000, 20).map((d) => d.dep));
        let sawM = 0;
        // Sample the board every 20 s for an hour.
        for (let t = 36000; t < 39600; t += 20) {
          const rows = platformTrains(S, st, dir, t, 2);
          expect(rows.length).toBe(2);
          expect(rows[0].arr).toBeLessThanOrEqual(rows[1].arr);
          for (const r of rows) {
            expect(r.boarding).toBe(true);
            expect(r.dep).toBeGreaterThanOrEqual(t);
            expect((r.line.id === 'M' ? mDeps : sDeps).has(r.dep)).toBe(true);
            if (r.line.id === 'M') sawM++;
          }
        }
        expect(sawM).toBeGreaterThan(0);
      });
    }
  }
  it('a station the Sumire Line passes without stopping lists no Sumire trains', () => {
    for (let t = 36000; t < 39600; t += 60) {
      for (const dir of ['down', 'up'] as const) {
        expect(platformTrains(S, stationById('tomyobori'), dir, t, 2).every((r) => r.line.id === 'S')).toBe(true);
      }
    }
  });
});

// ── Wayfinding sign layout ──
// There is no canvas in the test environment, so signs are drawn into a recording stand-in that
// tracks the transform and measures text roughly as a Japanese font would (a kanji or kana is
// 1 em, anything else 0.6 em). That is enough to prove the layout keeps every piece of text on
// the sign and clear of every other.

interface TextBox { s: string; px: number; x0: number; y0: number; x1: number; y1: number }

function recorder(W: number, H: number) {
  let m = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const texts: TextBox[] = [];
  let px = 10;
  const em = (s: string) => [...s].reduce((w, ch) => w + (ch.charCodeAt(0) >= 0x2e80 ? 1 : 0.6), 0);
  const noop = () => {};
  const ctx = {
    canvas: { width: W, height: H },
    fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: '', lineJoin: '', globalAlpha: 1,
    textAlign: 'left' as CanvasTextAlign, textBaseline: 'middle',
    set font(f: string) { px = Number(/([\d.]+)px/.exec(f)![1]); },
    get font() { return `${px}px`; },
    measureText: (s: string) => ({ width: em(s) * px }),
    save: () => stack.push([...m]),
    restore: () => { m = stack.pop()!; },
    translate: (x: number, y: number) => { m = [m[0], m[1], m[2], m[3], m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; },
    scale: (sx: number, sy: number) => { m = [m[0] * sx, m[1] * sx, m[2] * sy, m[3] * sy, m[4], m[5]]; },
    rotate: (a: number) => {
      const c = Math.cos(a), s = Math.sin(a);
      m = [m[0] * c + m[2] * s, m[1] * c + m[3] * s, m[2] * c - m[0] * s, m[3] * c - m[1] * s, m[4], m[5]];
    },
    fillText(s: string, x: number, y: number) {
      const w = em(s) * px;
      const xa = this.textAlign === 'center' ? x - w / 2 : this.textAlign === 'right' ? x - w : x;
      const pts = [[xa, y - px / 2], [xa + w, y - px / 2], [xa, y + px / 2], [xa + w, y + px / 2]]
        .map(([a, b]) => [m[0] * a + m[2] * b + m[4], m[1] * a + m[3] * b + m[5]]);
      const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
      const sx = Math.hypot(m[0], m[1]), sy = Math.hypot(m[2], m[3]);
      texts.push({ s, px: px * Math.min(sx, sy), x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
    },
    createLinearGradient: () => ({ addColorStop: noop }),
    fillRect: noop, strokeRect: noop, clearRect: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, ellipse: noop, roundRect: noop, rect: noop, clip: noop, fill: noop, stroke: noop, setLineDash: noop,
    bezierCurveTo: noop, quadraticCurveTo: noop,
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

function draw(c: SignContent, w: number, h: number) {
  const [W, H] = signSize(c, w, h);
  const { ctx, texts } = recorder(W, H);
  drawSign(ctx, W, H, c);
  return { W, H, texts };
}

/** Every text inside the sign (half a pixel of slack) and clear of every other. */
function expectTidy(label: string, W: number, H: number, texts: TextBox[], opts: { overlap?: boolean } = {}) {
  for (const t of texts) {
    expect(t.x0 >= -0.5 && t.y0 >= -0.5 && t.x1 <= W + 0.5 && t.y1 <= H + 0.5, `${label}: "${t.s}" off the sign`).toBe(true);
  }
  if (opts.overlap === false) return;
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      // Boxes are a full em tall; glyphs fill about 85 % of it, so a sliver of overlap is fine.
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      expect(ox > 0.5 && oy > 0.15 * Math.min(a.px, b.px), `${label}: "${a.s}" overlaps "${b.s}"`).toBe(false);
    }
  }
}

describe('wayfinding sign layout', () => {
  const ids = STATIONS.map((s) => s.id);

  it('exit boards fit every size they are hung at, for every station', () => {
    // A full board is never smaller than 2.4 × 0.6; a one- or two-exit pointer can be 1.0 × 0.3.
    const full: [number, number][] = [[3.6, 0.5], [3.0, 0.45], [2.4, 0.6], [2.0, 1.0], [1.2, 1.6], [1.6, 2.0]];
    const sizes: [number, number][] = [...full, [1.0, 0.3], [0.9, 0.9]];
    let smallest = Infinity, where = '';
    for (const id of ids) {
      const nums = stationExits(id).map((e) => e.num);
      const variants: SignContent[] = [
        { k: 'exits', station: id },
        { k: 'exits', station: id, arrow: 'left' },
        { k: 'exits', station: id, only: nums.slice(0, 2), arrow: 'right' },
        { k: 'exits', station: id, only: nums.slice(-1), arrow: 'up' },
      ];
      for (const c of variants) {
        for (const [w, h] of c.k === 'exits' && c.only ? sizes : full) {
          const { W, H, texts } = draw(c, w, h);
          expectTidy(`${id} ${JSON.stringify(c.k === 'exits' && c.only)} ${c.k === 'exits' && c.arrow} ${w}×${h}`, W, H, texts);
          // Every exit row shows its number and at least its first landmark.
          for (const e of stationExits(id).filter((q) => c.k !== 'exits' || !c.only || c.only.includes(q.num))) {
            if (e.num) expect(texts.some((t) => t.s === e.num)).toBe(true);
            expect(texts.some((t) => t.s.startsWith(e.near[0].ja))).toBe(true);
          }
          const ja = texts.filter((t) => stationExits(id).some((e) => e.near.some((n) => t.s.startsWith(n.ja))));
          for (const t of ja) {
            if (t.px / (W / w) < smallest) [smallest, where] = [t.px / (W / w), `${id} ${w}×${h} ${JSON.stringify(c)} "${t.s}"`];
          }
        }
      }
    }
    // Landmark text never smaller than about 2.5 cm on the sign.
    expect(smallest, where).toBeGreaterThan(0.025);
  });

  it('pictograms fit with and without captions and arrows', () => {
    const vs: Picto[] = ['toilet', 'lift', 'locker', 'tickets', 'office', 'info', 'stairs', 'escalator', 'bus', 'taxi'];
    const sizes: [number, number][] = [[0.5, 0.5], [1.8, 0.5], [2.4, 0.45], [0.5, 0.9], [0.6, 0.6]];
    for (const v of vs) {
      for (const [w, h] of sizes) {
        for (const label of [false, true]) {
          for (const arrow of [undefined, 'left', 'right', 'up'] as const) {
            const { W, H, texts } = draw({ k: 'picto', v, label, arrow }, w, h);
            expectTidy(`${v} ${w}×${h} ${label} ${arrow}`, W, H, texts);
          }
        }
      }
    }
  });

  it('station maps and area maps keep their text on the sign', () => {
    const sizes: [number, number][] = [[1.2, 1.6], [1.6, 1.2], [2.4, 1.2], [0.9, 1.2], [2.0, 1.4]];
    for (const id of ids) {
      for (const [w, h] of sizes) {
        const sm = draw({ k: 'stationmap', station: id }, w, h);
        expectTidy(`stationmap ${id} ${w}×${h}`, sm.W, sm.H, sm.texts);
        // Every platform number and every exit is on the map.
        for (const [, pf] of Object.entries(stationById(id).platforms)) expect(sm.texts.some((t) => t.s.startsWith(`${pf.join('・')}番線`))).toBe(true);
        for (const e of stationExits(id)) if (e.num) expect(sm.texts.some((t) => t.s === e.num)).toBe(true);
        const am = draw({ k: 'areamap', station: id }, w, h);
        expectTidy(`areamap ${id} ${w}×${h}`, am.W, am.H, am.texts);
        for (const e of stationExits(id)) if (e.num) expect(am.texts.some((t) => t.s === e.num)).toBe(true);
        // A map of a decent size names the park, arcade and canal bridge the street really has.
        const spec = SPECS[id];
        if (w * h >= 1.9 && (spec.kind === 'underground' || spec.kind === 'interchange')) {
          const s = spec.surface;
          const named = [s.left === 'park' || s.right === 'park' ? s.parkName : undefined, s.arcadeAt !== undefined ? s.arcadeName : undefined, s.canalAt !== undefined ? s.canalName : undefined];
          for (const n of named) if (n) expect(am.texts.some((t) => t.s === n.ja), `areamap ${id} ${w}×${h}: ${n.en}`).toBe(true);
        }
      }
    }
  });
});

// ── Departure boards (発車標) ──

describe('departure boards', () => {
  it('each line has a board style, and the style table agrees with the line themes', () => {
    for (const l of LINES) {
      expect(BOARD[l.id], l.id).toBeDefined();
      expect(BOARD[l.id].opened, l.id).toBe(themeFor(l.id).opened);
      expect(lineBoard(l.id), l.id).toBe(BOARD[l.id].opened < 2000 ? 'led' : 'lcd');
    }
    expect(stationBoard('kita-odori')).toBe('led');
  });

  /** Every (station, line, dir) platform that has a board. */
  const platforms = STATIONS.flatMap((st) => linesAt(st.id).filter((l) => st.platforms[l.id] && !l.shares).flatMap((l) => (['down', 'up'] as const).map((dir) => ({ st, line: l, dir }))));

  it('shows only timetable times, and the approach lamp follows the real train', () => {
    let lit = 0;
    for (const { st, line, dir } of platforms) {
      // Every time this platform could show: departures (or terminating arrivals) of its own line and of any line on its track.
      const times = new Set<string>();
      for (const l of [line, ...LINES.filter((x) => x.shares?.line === line.id && x.stops.includes(st.id))]) {
        const { tt } = lineSim(l.id), stop = l.stops.indexOf(st.id);
        for (const d of [...nextDepartures(tt, stop, dir, 36000, 40), ...nextArrivals(tt, stop, dir, 36000, 40)]) times.add(formatClock(d.dep)).add(formatClock(d.arr));
      }
      for (let t = 36000; t < 39600; t += 37) {
        const c = { k: 'dep' as const, station: st.id, line: line.id, dir };
        const m = depModel(c, t, 0);
        // The board's rows are the platform's next trains, in order.
        expect(m.rows.map((r) => r.arr)).toEqual(platformTrains(line, st, dir, t, m.rows.length).map((r) => r.arr));
        const [W, H] = signSize(c, 3.4, 0.72);
        const { ctx, texts } = recorder(W, H);
        drawDep(ctx, W, H, c, 0, t);
        for (const s of texts.map((x) => x.s).filter((s) => /^\d\d:\d\d$/.test(s))) {
          expect(s === formatClock(t) || times.has(s), `${st.id} ${line.id} ${dir} @${t}: ${s}`).toBe(true);
        }
        // Boarding means the train is here.
        if (m.status === 'boarding' || m.status === 'closing') expect(m.away).toBe(0);
        if (m.away === null) continue;
        lit++;
        const r = m.rows[0], i = r.line.stops.indexOf(st.id), sg = dir === 'down' ? 1 : -1;
        const p = trainStateAt(lineSim(r.line.id).tt, r.train, t).phase;
        expect(p.dir).toBe(dir);
        if (p.kind === 'dwell') expect(p.stop).toBe(i - sg * m.away);
        // Running: away is in (n, n + 1] where n stops remain after the one it is running to.
        else expect(p.toStop).toBe(i - sg * (Math.ceil(m.away) - 1));
      }
    }
    expect(lit).toBeGreaterThan(100);
  });

  it('keeps every board tidy in both styles and both languages, at every station', () => {
    const tidy = (label: string, c: SignContent, w: number, h: number, ticker: (now: number, wall: number) => string) => {
      const [W, H] = signSize(c, w, h);
      for (const now of [36000, 36100, 36230, 36290]) {
        for (const wall of [1, 5]) {
          const { ctx, texts } = recorder(W, H);
          if (c.k === 'dep') drawDep(ctx, W, H, c, wall, now);
          else if (c.k === 'depAll') drawDepAll(ctx, W, H, c, wall, now);
          // The ticker scrolls through the board's edges on purpose.
          const tk = ticker(now, wall);
          expectTidy(`${label} @${now} ${wall > 4 ? 'en' : 'ja'}`, W, H, texts.filter((t) => t.s !== tk));
        }
      }
    };
    for (const { st, line, dir } of platforms) {
      const c = { k: 'dep' as const, station: st.id, line: line.id, dir };
      for (const [w, h] of [[3.4, 0.72], [3.0, 0.72]]) tidy(`dep ${st.id} ${line.id} ${dir} ${w}`, c, w, h, (now, wall) => depModel(c, now, wall).ticker);
    }
    for (const st of STATIONS) {
      if (!depAllRows(st.id).length) continue;
      const c = { k: 'depAll' as const, station: st.id };
      tidy(`depAll ${st.id}`, c, 2.6, 1.12, (now, wall) => depAllModel(c, now, wall).ticker);
    }
  });
});
