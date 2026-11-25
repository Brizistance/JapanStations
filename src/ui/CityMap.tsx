// The city map (2026-11-24): the map screen's 都市 City tab, beside the route map. The real city north-up,
// dragged to move and scrolled to zoom: water and land, and closer in the streets, paving, green and
// buildings (render/city-plan.ts) with the streets' names; every line on its real alignment, the trains
// running on them now, the stations; the guided route; and where the player is. Clicking a station
// selects it for the screen's station panel (travel there, or be guided).

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { ALL_LINES, ALL_STATIONS, stationById } from '../data/network';
import { BASINS, CHANNELS, LAND } from '../data/geography';
import { clock, lineSim } from '../sim';
import { findRoute, type Route } from '../sim/route';
import { player, where } from '../player/player';
import { WORLDS } from '../stations';
import { trains } from '../trains/system';
import { planNear, planRails, type PlanKind } from '../render/city-plan';
import { sampleChainages, structureAt } from '../world/structure';
import { Bi } from './Bi';
import { useUI } from './store';

/** Which tab the map screen shows (the mini-map opens it on the city). */
export const useMapTab = create<{ tab: 'city' | 'route'; set: (tab: 'city' | 'route') => void }>((set) => ({ tab: 'city', set: (tab) => set({ tab }) }));

const FILL: Record<PlanKind, string> = { green: '#c4dbb6', pave: '#d8d3ca', road: '#ffffff', block: '#b3ab9e' };
const LAND_FILL = '#e7e3dc', WATER = '#a9cbe3';
/** Metres per pixel past which the city's detail is not drawn (the network alone). */
const DETAIL = 2.2, NAMES = 0.9;

/** Each line's whole alignment, and whether each sample is above ground. */
const lineRuns = (() => {
  let runs: { color: string; pts: number[]; under: boolean[] }[] | null = null;
  return () => {
    if (runs) return runs;
    runs = ALL_LINES.map((l) => {
      const g = lineSim(l.id).geom, pts: number[] = [], under: boolean[] = [];
      for (const s of sampleChainages(g, 20)) {
        const p = g.path.pointAt(s), t = structureAt(g, s);
        pts.push(p.x, p.z);
        under.push(!(t === 'viaduct' || t === 'cut' || (t === 'station' && g.railY(s) > -3)));
      }
      return { color: l.color, pts, under };
    });
    return runs;
  };
})();

/** Named streets: the long street areas of every station (not its forecourt), one label each. */
const streetNames = (() => {
  let out: { x: number; z: number; ang: number; ja: string; en: string }[] | null = null;
  return () => {
    if (out) return out;
    out = [];
    const seen = new Set<string>();
    for (const w of WORLDS) {
      const { x: fx, z: fz, yaw } = w.frame, c = Math.cos(yaw), s = Math.sin(yaw);
      for (const zn of w.frame.zones) {
        if (zn.kind !== 'street' || zn.max[1] < -1 || /駅|ホーム|広場|公園|浜$/.test(zn.ja)) continue;
        const dx = zn.max[0] - zn.min[0], dz = zn.max[2] - zn.min[2], long = Math.max(dx, dz), short = Math.min(dx, dz);
        if (long < 40 || long < short * 3) continue;
        const k = `${w.def.id}:${zn.ja}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const lx = (zn.min[0] + zn.max[0]) / 2, lz = (zn.min[2] + zn.max[2]) / 2;
        const ja = zn.ja.replace(/（.*）/, ''), en = zn.en.split(' — ')[0];
        out.push({ x: fx + lx * c + lz * s, z: fz - lx * s + lz * c, ang: (dx >= dz ? 0 : Math.PI / 2) - yaw, ja, en });
      }
    }
    return out;
  };
})();

/** Where the map opens: the whole network. */
function networkView(w: number, h: number) {
  const xs = ALL_STATIONS.map((s) => s.position.x), zs = ALL_STATIONS.map((s) => s.position.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, mpp: Math.max((x1 - x0) / (w * 0.9), (z1 - z0) / (h * 0.9)) };
}

let routeMemo: { key: string; route: Route | null } | null = null;
/** The guided route from here, worked out once a second. */
function guidedRoute(): Route | null {
  const to = useUI.getState().guideTo, from = where.station?.def.id ?? player.lastStation;
  if (!to || to === from) return null;
  const key = `${from}|${to}|${Math.floor(clock.time)}`;
  if (routeMemo?.key !== key) routeMemo = { key, route: findRoute(from, to, clock.time) };
  return routeMemo.route;
}

export function CityMap({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const view = useRef<{ cx: number; cz: number; mpp: number } | null>(null);
  const sel = useRef(selected);
  sel.current = selected;
  const pick = useRef(onSelect);
  pick.current = onSelect;

  useEffect(() => {
    const cv = ref.current!;
    const g = cv.getContext('2d')!;
    let raf = 0, dpr = 1, W = 0, H = 0;
    const fit = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      view.current ??= networkView(W, H);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(cv);
    fit();
    const toScreen = (x: number, z: number): [number, number] => {
      const v = view.current!;
      return [(x - v.cx) / v.mpp + W / 2, (z - v.cz) / v.mpp + H / 2];
    };
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const v = view.current;
      if (!v || !W) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = WATER; g.fillRect(0, 0, W, H);
      // The world, metres → pixels.
      g.save();
      g.translate(W / 2, H / 2); g.scale(1 / v.mpp, 1 / v.mpp); g.translate(-v.cx, -v.cz);
      const px = v.mpp;
      const poly = (pts: number[] | number[][], fill: string) => {
        g.beginPath();
        if (typeof pts[0] === 'number') {
          const f = pts as number[];
          g.moveTo(f[0], f[1]);
          for (let i = 2; i < f.length; i += 2) g.lineTo(f[i], f[i + 1]);
        } else (pts as number[][]).forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b)));
        g.closePath(); g.fillStyle = fill; g.fill();
      };
      for (const l of LAND) poly(l.pts, LAND_FILL);
      for (const b of BASINS) poly(b.pts, WATER);
      g.strokeStyle = WATER; g.lineJoin = 'round'; g.lineCap = 'round';
      for (const c of CHANNELS) {
        g.lineWidth = c.width;
        g.beginPath(); c.pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke();
      }
      // Close in: the city itself, fading in.
      if (v.mpp < DETAIL) {
        g.globalAlpha = Math.min(1, (DETAIL - v.mpp) / (DETAIL * 0.4));
        const r = Math.hypot(W, H) * v.mpp * 0.55;
        for (const s of planNear(v.cx, v.cz, r)) poly(s.pts, FILL[s.kind]);
        g.globalAlpha = 1;
      }
      // The lines on their real alignments: bold where above ground, lighter in tunnel when close in.
      const close = v.mpp < DETAIL;
      for (const l of lineRuns()) {
        for (const under of [true, false]) {
          g.strokeStyle = l.color;
          g.globalAlpha = under && close ? 0.35 : 1;
          g.lineWidth = (close ? (under ? 3 : 4) : 3.5) * px;
          g.beginPath();
          let on = false;
          for (let i = 0; i < l.under.length; i++) {
            if (l.under[i] !== under) { on = false; continue; }
            if (!on) g.moveTo(l.pts[2 * i], l.pts[2 * i + 1]); else g.lineTo(l.pts[2 * i], l.pts[2 * i + 1]);
            on = true;
          }
          g.stroke();
        }
      }
      g.globalAlpha = 1;
      if (close) for (const r of planRails()) {
        g.strokeStyle = r.color; g.lineWidth = 4 * px;
        g.beginPath();
        for (let i = 0; i < r.pts.length; i += 2) (i ? g.lineTo(r.pts[i], r.pts[i + 1]) : g.moveTo(r.pts[i], r.pts[i + 1]));
        g.stroke();
      }
      // The guided route: each leg along its line, the walks between straight.
      const route = guidedRoute();
      if (route) {
        g.strokeStyle = '#f5c400'; g.lineWidth = 9 * px; g.globalAlpha = 0.85;
        for (const leg of route.legs) {
          g.beginPath();
          if (leg.kind === 'walk') {
            const a = stationById(leg.from).position, b = stationById(leg.to).position;
            g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
          } else {
            const geom = lineSim(leg.line.id).geom, s0 = geom.stopS[leg.fromStop], s1 = geom.stopS[leg.toStop], n = Math.max(2, Math.ceil(Math.abs(s1 - s0) / 20));
            for (let i = 0; i <= n; i++) {
              const p = geom.path.pointAt(s0 + ((s1 - s0) * i) / n);
              (i ? g.lineTo(p.x, p.z) : g.moveTo(p.x, p.z));
            }
          }
          g.stroke();
        }
        g.globalAlpha = 1;
      }
      g.restore();
      // Trains running now: a dot each in its line's colour.
      for (const t of trains) {
        const car = t.cars[Math.floor(t.cars.length / 2)];
        if (!car) continue;
        const [sx, sy] = toScreen(car.x, car.z);
        if (sx < -10 || sy < -10 || sx > W + 10 || sy > H + 10) continue;
        g.beginPath(); g.arc(sx, sy, 4.5, 0, Math.PI * 2);
        g.fillStyle = t.sim.geom.def.color; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.stroke();
      }
      // Street names, close in.
      if (v.mpp < NAMES) {
        g.font = '700 12px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (const s of streetNames()) {
          const [sx, sy] = toScreen(s.x, s.z);
          if (sx < -100 || sy < -40 || sx > W + 100 || sy > H + 40) continue;
          let a = s.ang;
          while (a > Math.PI / 2) a -= Math.PI;
          while (a < -Math.PI / 2) a += Math.PI;
          g.save(); g.translate(sx, sy); g.rotate(a);
          g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.fillStyle = '#4a4f57';
          const t = `${s.ja}  ${s.en}`;
          g.strokeText(t, 0, 0); g.fillText(t, 0, 0);
          g.restore();
        }
      }
      // Stations.
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      for (const s of ALL_STATIONS) {
        const [sx, sy] = toScreen(s.position.x, s.position.y);
        if (sx < -60 || sy < -30 || sx > W + 60 || sy > H + 30) continue;
        const on = s.id === sel.current;
        g.beginPath(); g.arc(sx, sy, on ? 8 : 5.5, 0, Math.PI * 2);
        g.fillStyle = '#fff'; g.fill(); g.lineWidth = on ? 3.5 : 2.2; g.strokeStyle = on ? '#e2a400' : '#1f2328'; g.stroke();
        g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.92)'; g.fillStyle = '#1f2328';
        g.font = `800 ${on ? 14 : 12}px system-ui, sans-serif`;
        g.strokeText(s.nameJa, sx, sy - 11); g.fillText(s.nameJa, sx, sy - 11);
        if (v.mpp < 6 || on) {
          g.font = '600 10px system-ui, sans-serif';
          g.strokeText(s.nameRomaji, sx, sy + 19); g.fillText(s.nameRomaji, sx, sy + 19);
        }
      }
      // The player: an arrow the way they face.
      const [mx, my] = toScreen(player.body.pos[0], player.body.pos[2]);
      g.save(); g.translate(mx, my); g.rotate(-player.yaw);
      g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 8); g.lineTo(0, 4); g.lineTo(-8, 8); g.closePath();
      g.fillStyle = '#e2381b'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
      g.restore();
    };
    draw();

    // Drag to move, scroll to zoom about the pointer, click a station to select it.
    let drag: { x: number; y: number; moved: boolean } | null = null;
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, moved: false };
      cv.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag || !view.current) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (!drag.moved) return;
      view.current.cx -= dx * view.current.mpp; view.current.cz -= dy * view.current.mpp;
      drag.x = e.clientX; drag.y = e.clientY;
    };
    const up = (e: PointerEvent) => {
      const d = drag;
      drag = null;
      if (!d || d.moved || !view.current) return;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let best: string | null = null, bd = 14;
      for (const s of ALL_STATIONS) {
        const [sx, sy] = toScreen(s.position.x, s.position.y), dd = Math.hypot(sx - x, sy - y);
        if (dd < bd) { bd = dd; best = s.id; }
      }
      if (best) pick.current(best);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = view.current;
      if (!v) return;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left - W / 2, y = e.clientY - r.top - H / 2;
      const wx = v.cx + x * v.mpp, wz = v.cz + y * v.mpp;
      v.mpp = Math.min(networkView(W, H).mpp * 1.6, Math.max(0.12, v.mpp * Math.exp(e.deltaY * 0.0015)));
      v.cx = wx - x * v.mpp; v.cz = wz - y * v.mpp;
    };
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('wheel', wheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('wheel', wheel);
    };
  }, []);

  const recentre = (close: boolean) => {
    const cv = ref.current;
    if (!cv) return;
    view.current = close ? { cx: player.body.pos[0], cz: player.body.pos[2], mpp: 300 / Math.min(cv.clientWidth, cv.clientHeight) } : networkView(cv.clientWidth, cv.clientHeight);
  };
  return (
    <div className="city-map">
      <canvas ref={ref} />
      <div className="city-map-tools">
        <button className="btn small" onClick={() => recentre(true)}><Bi ja="現在地" en="Where I am" /></button>
        <button className="btn small" onClick={() => recentre(false)}><Bi ja="全体" en="Whole city" /></button>
      </div>
      <div className="city-map-hint"><Bi ja="ドラッグで移動 · ホイールで拡大縮小 · 駅をクリック" en="Drag to move · scroll to zoom · click a station" /></div>
    </div>
  );
}
