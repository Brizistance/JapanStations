// The mini-map of the in-game screen, and the things in a station worth pointing at. Drawn from the built
// station: its named areas (zones), street exits and lifts. Markers and distances are straight
// lines to the thing, not a walking path; the signs in the station do the corridor finding.

import { lineById, platformFor, stationById } from '../data/network';
import { player, where } from '../player/player';
import { stationWorld } from '../stations';
import { stationExits, type StationExit } from '../stations/exits';
import { toLocal, toWorld } from '../world/collision';
import type { V3, Zone } from '../world/builder';
import { Bi } from './Bi';
import type { Step } from '../sim/guide';
import { guideStep } from './Guide';
import { useEffect, useState } from 'react';
import { useUI } from './store';

const exitCache = new Map<string, StationExit[]>();
const exitsOf = (id: string) => exitCache.get(id) ?? (exitCache.set(id, stationExits(id)), exitCache.get(id)!);

interface Target { key: string; kind: 'exit' | 'platform' | 'guide'; label: string; color?: string; local: V3; goal: boolean }

/** A platform area's key among its station's markers. */
const platformKey = (zones: Zone[], z: Zone) => `p${zones.filter((q) => q.kind === 'platform' && q.line).indexOf(z)}`;
/** Pick a marker to head for, or drop it when it is picked already. */
function toggleMark(station: string, key: string) {
  const m = `${station}:${key}`, ui = useUI.getState();
  ui.setMark(ui.mark === m ? null : m);
}

/**
 * Whether a platform area is where the guided train leaves from. An area's name carries its platform
 * numbers ("3番線ホーム", "5・6番線ホーム"); when none of the line's areas names the platform, all of them count.
 */
function isGoalZone(zones: Zone[], z: Zone, step: Step | null): boolean {
  if (step?.kind !== 'board' || z.kind !== 'platform' || z.line !== step.leg.line.id) return false;
  const plat = String(platformFor(stationById(step.leg.from), step.leg.line, step.leg.dir, step.leg.service?.id));
  const named = (q: Zone) => Array.from(q.ja.matchAll(/\d+/g), (m) => m[0]).includes(plat);
  const own = zones.filter((q) => q.kind === 'platform' && q.line === z.line);
  return own.some(named) ? named(z) : true;
}

const mid = (z: Zone): V3 => [(z.min[0] + z.max[0]) / 2, z.min[1], (z.min[2] + z.max[2]) / 2];

/** The things worth pointing at in the station the player is in, in its own frame. */
export function targets(): Target[] {
  const st = where.station;
  if (!st || where.train) return [];
  const step = guideStep();
  const out: Target[] = [], mark = useUI.getState().mark;
  const picked = (key: string) => mark === `${st.def.id}:${key}`;
  for (const z of st.frame.zones) {
    if (z.kind !== 'platform' || !z.line) continue;
    const line = lineById(z.line), key = platformKey(st.frame.zones, z);
    out.push({ key, kind: 'platform', label: line.id, color: line.color, local: mid(z), goal: isGoalZone(st.frame.zones, z, step) || picked(key) });
  }
  for (const e of exitsOf(st.def.id)) {
    if (e.num) out.push({ key: `e${e.num}`, kind: 'exit', label: e.num, local: [(e.rect[0] + e.rect[2]) / 2, 0, (e.rect[1] + e.rect[3]) / 2], goal: picked(`e${e.num}`) });
  }
  // A walk between stations: point at the other station.
  if (step?.kind === 'walk') {
    const o = stationWorld(step.leg.to).frame, l: V3 = [0, 0, 0];
    toLocal(st.frame, [o.x, o.y, o.z], l);
    out.push({ key: 'walk', kind: 'guide', label: stationById(step.leg.to).nameJa, local: l, goal: true });
  }
  return out;
}

/** Re-render about thirty times a second: the mini-map turns with the player, which the HUD's own slow tick would show as jerks. */
function useFrames() {
  const [, set] = useState(0);
  useEffect(() => {
    let id = 0, n = 0;
    const loop = () => {
      id = requestAnimationFrame(loop);
      if (n++ % 2 === 0) set((v) => v + 1);
    };
    loop();
    return () => cancelAnimationFrame(id);
  }, []);
}

const FILL: Record<Zone['kind'], string> = { street: '#2b3138', concourse: '#46505c', passage: '#3a434e', platform: '#46505c' };
/** Metres from the player to the rim: the corner map, and the enlarged one. */
const NEAR = 46, FAR = 100;

/**
 * The mini-map: a round plan of the level the player is on, turned so that the way they face is
 * up. Exits, platforms and the guide's target that lie off the map sit on its rim, towards where
 * they are, with their distance. Click it to enlarge; click an exit or a platform to head for it.
 */
export function MiniMap() {
  const on = useUI((s) => s.planOn), mark = useUI((s) => s.mark);
  const [big, setBig] = useState(false);
  useFrames();
  const st = where.station;
  if (!on || !st || where.train) return null;
  const R = big ? FAR : NEAR;
  const me: V3 = [0, 0, 0];
  toLocal(st.frame, player.body.pos, me);
  const y = me[1];
  const area = (z: Zone) => (z.max[0] - z.min[0]) * (z.max[2] - z.min[2]);
  const reach = (x0: number, z0: number, x1: number, z1: number) => Math.hypot(Math.max(x0 - me[0], 0, me[0] - x1), Math.max(z0 - me[2], 0, me[2] - z1)) < R;
  // The areas on this level that reach into the circle, largest first so the small ones draw on top.
  const zones = st.frame.zones.filter((z) => y >= z.min[1] - 0.6 && y <= z.max[1] + 0.6 && reach(z.min[0], z.min[2], z.max[0], z.max[2])).sort((a, b) => area(b) - area(a));
  const step = guideStep();
  const c = Math.cos(st.frame.yaw), s = Math.sin(st.frame.yaw);
  // Directions in the station's frame, as degrees clockwise from the frame's −z.
  const deg = (wx: number, wz: number) => (Math.atan2(wx * c - wz * s, -(wx * s + wz * c)) * 180) / Math.PI;
  const facing = deg(-Math.sin(player.yaw), -Math.cos(player.yaw)), north = deg(0, -1);
  // Text stays upright while the plan turns under it.
  const upright = (x: number, z: number) => `rotate(${facing} ${x} ${z})`;
  const rim = (angleDeg: number, r: number): [number, number] => {
    const a = ((angleDeg - facing) * Math.PI) / 180;
    return [Math.sin(a) * r, -Math.cos(a) * r];
  };
  const marks = targets().map((t) => {
    const dx = t.local[0] - me[0], dz = t.local[2] - me[2];
    return { ...t, dist: Math.hypot(dx, dz), angle: (Math.atan2(dx, -dz) * 180) / Math.PI, dy: t.local[1] - y };
  });
  // On the rim: what is off the map, and a platform on another level only when it is the one to head for.
  const outside = marks.filter((m) => m.dist > R * 0.86 && (m.kind !== 'platform' || m.goal || Math.abs(m.dy) < 2));
  const zone = where.zone;
  const [nx, ny] = rim(north, R * 0.9);
  return (
    <div className={`hud-mini${big ? ' big' : ''}`} onClick={() => setBig(!big)} title="クリックで拡大・縮小 Click to enlarge or shrink">
      <svg viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`} style={{ '--u': R / NEAR } as React.CSSProperties}>
        <defs><clipPath id="mini-clip"><circle r={R} /></clipPath></defs>
        <circle r={R} fill="#1d2126" />
        <g clipPath="url(#mini-clip)">
          <g transform={`rotate(${-facing}) translate(${-me[0]} ${-me[2]})`}>
            {zones.map((z, i) => {
              const line = z.kind === 'platform' && z.line ? lineById(z.line) : null;
              const key = line ? platformKey(st.frame.zones, z) : '';
              const goal = !!line && (isGoalZone(st.frame.zones, z, step) || mark === `${st.def.id}:${key}`);
              const w = z.max[0] - z.min[0], d = z.max[2] - z.min[2];
              // The label goes on the part of the platform nearest the player, so it is on the map.
              const lx = Math.max(z.min[0] + 3, Math.min(z.max[0] - 3, me[0])), lz = z.min[2] + d / 2;
              return (
                <g key={i} className={line ? 'pick' : ''} onClick={line ? (e) => (e.stopPropagation(), toggleMark(st.def.id, key)) : undefined}>
                  <rect x={z.min[0]} y={z.min[2]} width={w} height={d} fill={line ? line.color : FILL[z.kind]} fillOpacity={line ? 0.6 : 1} stroke={goal ? '#f5c400' : '#16191d'} strokeWidth={goal ? 1.4 : 0.5} />
                  {line && <text x={lx} y={lz} dy="0.36em" className="pl" transform={upright(lx, lz)}>{line.id}</text>}
                </g>
              );
            })}
            {st.build.ramps.filter((r) => Math.abs(y - r.yLow) < 0.8 || Math.abs(y - r.yHigh) < 0.8).map((r, i) => {
              // Stairs and escalators that start on this level, with the way they lead from here.
              const up = Math.abs(y - r.yLow) < 0.8;
              const x0 = Math.min(r.x0, r.x1), z0 = Math.min(r.z0, r.z1), w = Math.abs(r.x1 - r.x0), d = Math.abs(r.z1 - r.z0);
              if (!reach(x0, z0, x0 + w, z0 + d)) return null;
              return (
                <g key={`r${i}`}>
                  <rect x={x0} y={z0} width={w} height={d} fill="#8793a1" stroke="#16191d" strokeWidth={0.4} />
                  <text x={x0 + w / 2} y={z0 + d / 2} dy="0.36em" className="st" transform={upright(x0 + w / 2, z0 + d / 2)}>{up ? '▲' : '▼'}</text>
                </g>
              );
            })}
            {st.build.lifts.filter((f) => y > f.levels[0] - 0.6 && y < f.levels[f.levels.length - 1] + 0.6).map((f, i) => {
              const cx = (f.min[0] + f.max[0]) / 2, cz = (f.min[1] + f.max[1]) / 2;
              return (
                <g key={`l${i}`}>
                  <rect x={f.min[0]} y={f.min[1]} width={f.max[0] - f.min[0]} height={f.max[1] - f.min[1]} fill="#fff" stroke="#16191d" strokeWidth={0.4} />
                  <text x={cx} y={cz} dy="0.36em" className="ev" transform={upright(cx, cz)}>EV</text>
                </g>
              );
            })}
            {marks.filter((m) => m.kind === 'exit' && m.dist <= R * 0.86).map((m) => (
              <g key={m.key} className="pick" opacity={Math.abs(m.dy) < 3 || m.goal ? 1 : 0.6} transform={upright(m.local[0], m.local[2])} onClick={(e) => (e.stopPropagation(), toggleMark(st.def.id, m.key))}>
                <rect x={m.local[0] - 3.6} y={m.local[2] - 3.6} width={7.2} height={7.2} rx={1} fill="#f5c400" stroke={m.goal ? '#fff' : 'none'} strokeWidth={1.2} />
                <text x={m.local[0]} y={m.local[2]} dy="0.36em" className="ex">{m.label}</text>
              </g>
            ))}
          </g>
        </g>
        <circle r={R - 0.6} fill="none" stroke="#16191d" strokeWidth={1.2} />
        <text x={nx} y={ny} dy="0.36em" className="n">N</text>
        {outside.map((m) => {
          const [x, z] = rim(m.angle, R * 0.84);
          const w = m.kind === 'guide' ? 5 + m.label.length * 5.5 : 9;
          return (
            <g key={m.key} className={`rim pick${m.goal ? ' goal' : ''}`} transform={`translate(${x} ${z}) scale(${R / NEAR})`} onClick={m.kind === 'guide' ? undefined : (e) => (e.stopPropagation(), toggleMark(st.def.id, m.key))}>
              <rect x={-w / 2} y={-4.5} width={w} height={9} rx={m.kind === 'platform' ? 4.5 : 1.5} fill={m.kind === 'exit' ? '#f5c400' : m.kind === 'guide' ? '#fff' : m.color} />
              <text y={0} dy="0.36em" className={m.kind === 'platform' ? 'rp' : 'ex'}>{m.label}</text>
              <text y={8.6} className="rd">{Math.round(m.dist)}m{m.dy > 2 ? '▲' : m.dy < -2 ? '▼' : ''}</text>
            </g>
          );
        })}
        <path d="M0 -4.6 L3.4 3.4 L0 1.6 L-3.4 3.4 Z" fill="#fff" stroke="#16191d" strokeWidth={0.7} transform={`scale(${R / NEAR})`} />
      </svg>
      <div className="hud-mini-foot">
        <span>{zone ? <Bi ja={zone.ja} en={zone.en} /> : null}</span>
        <kbd>P</kbd>
      </div>
    </div>
  );
}
