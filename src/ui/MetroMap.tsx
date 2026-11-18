// Interactive route diagram. Everything is drawn from the network data, including
// the live train markers, which come from the same timetable the 3D trains follow.

import { useEffect, useState } from 'react';
import { LINES, STATIONS, linesAt, stationById, terminusOf } from '../data/network';
import type { Dir, LineDef, StationDef } from '../data/types';
import { NET, clock, formatClock, lineSim } from '../sim';
import { nextDepartures, trainStateAt } from '../sim/timetable';

export function useTick(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export function NumberBadge({ code, color, size = 34 }: { code: string; color: string; size?: number }) {
  const [letter, num] = code.split('-');
  return (
    <span className="numbadge" style={{ borderColor: color, width: size, height: size, fontSize: size * 0.36 }}>
      <b style={{ color }}>{letter}</b>
      <i>{num}</i>
    </span>
  );
}

export function LineBullet({ line, size = 22 }: { line: LineDef; size?: number }) {
  return (
    <span className="bullet" style={{ background: line.color, width: size, height: size, fontSize: size * 0.6 }}>
      {line.id}
    </span>
  );
}

/** Where to put each station's label relative to its marker. */
function labelPos(s: StationDef): { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' } {
  if (linesAt(s.id).length > 1) return { dx: 22, dy: 44, anchor: 'start' };
  if (s.diagram.label === 'right') return { dx: 26, dy: -2, anchor: 'start' };
  return { dx: 0, dy: 40, anchor: 'middle' };
}

/** Top-left corner of the i-th number badge for a station. */
function badgePos(s: StationDef, i: number, inter: boolean): [number, number] {
  const { x, y, badges, label } = s.diagram;
  if (inter) {
    // Interchanges: stacked on the left by default, or side by side in a free corner.
    if (badges === 'ne') return [x + 20 + i * 34, y - 50];
    if (badges === 'nw') return [x - 52 - i * 34, y - 50];
    return [x - 52, i === 0 ? y - 50 : y + 20];
  }
  // Left of the marker when the label is on the right, otherwise above it.
  return label === 'right' ? [x - 52, y - 15] : [x - 15, y - 50];
}

function TrainDots() {
  useTick(500);
  const dots: { key: string; x: number; y: number; color: string; moving: boolean }[] = [];
  for (const { geom, tt } of NET) {
    const stops = geom.def.stops.map(stationById);
    for (let k = 0; k < tt.trainCount; k++) {
      const st = trainStateAt(tt, k, clock.time);
      // Segment the train is on (clamped at the ends for the sidings).
      let i = 0;
      while (i < geom.stopS.length - 2 && st.s > geom.stopS[i + 1]) i++;
      const f = Math.max(-0.12, Math.min(1.12, (st.s - geom.stopS[i]) / (geom.stopS[i + 1] - geom.stopS[i])));
      const a = stops[i].diagram, b = stops[i + 1].diagram;
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      // Offset to the side of the line by direction of travel (trains keep left).
      const side = geom.lateral(st.track, st.s) < 0 ? -1 : 1;
      dots.push({
        key: `${geom.def.id}${k}`,
        x: a.x + dx * f - (dy / len) * 9 * side,
        y: a.y + dy * f + (dx / len) * 9 * side,
        color: geom.def.color,
        moving: st.speed > 0.1,
      });
    }
  }
  return (
    <g>
      {dots.map((d) => (
        <rect key={d.key} x={d.x - 6} y={d.y - 4} width={12} height={8} rx={2.5} fill="#fff" stroke={d.color} strokeWidth={2.5} opacity={d.moving ? 1 : 0.75} />
      ))}
    </g>
  );
}

function Departures({ station }: { station: StationDef }) {
  useTick(1000);
  const rows: { line: LineDef; dir: Dir; times: number[]; platform: number }[] = [];
  for (const line of linesAt(station.id)) {
    const { tt } = lineSim(line.id);
    const stop = line.stops.indexOf(station.id);
    for (const dir of ['down', 'up'] as Dir[]) {
      const deps = nextDepartures(tt, stop, dir, clock.time, 2);
      if (deps.length) rows.push({ line, dir, times: deps.map((d) => d.dep), platform: station.platforms[line.id][dir === 'down' ? 0 : 1] });
    }
  }
  return (
    <div className="deps">
      {rows.map((r) => {
        const t = terminusOf(r.line, r.dir);
        return (
          <div className="dep" key={r.line.id + r.dir}>
            <LineBullet line={r.line} />
            <div className="dep-dest">
              <b>{t.nameJa} 方面</b>
              <span>for {t.nameRomaji} · Platform {r.platform}</span>
            </div>
            <div className="dep-times">
              {r.times.map((x, i) => (
                <span key={i} className={i === 0 ? 'first' : ''}>{formatClock(x)}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StationPanel({ id, onGo, goLabel }: { id: string; onGo?: (id: string) => void; goLabel?: string }) {
  const s = stationById(id);
  const lines = linesAt(id);
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-badges">
          {lines.map((l) => (
            <NumberBadge key={l.id} code={s.numbers[l.id]} color={l.color} size={40} />
          ))}
        </div>
        <div>
          <div className="panel-kana">{s.nameKana}</div>
          <h2>{s.nameJa}</h2>
          <div className="panel-romaji">{s.nameRomaji}</div>
        </div>
      </div>
      <div className="panel-lines">
        {lines.map((l) => (
          <span key={l.id} className="chip" style={{ borderColor: l.color }}>
            <LineBullet line={l} size={18} /> {l.nameJa} <em>{l.nameEn}</em>
          </span>
        ))}
      </div>
      <p className="panel-blurb">
        <b>{s.districtJa}</b> {s.district} — {s.blurb}
      </p>
      <h3>つぎの電車 <em>Next departures</em></h3>
      <Departures station={s} />
      {onGo && (
        <button className="btn primary wide" onClick={() => onGo(id)}>
          {goLabel ?? 'この駅へ移動'} <em>Go to this station</em>
        </button>
      )}
    </div>
  );
}

export function MetroMap({ selected, onSelect, here }: { selected: string | null; onSelect: (id: string) => void; here?: string | null }) {
  return (
    <svg className="map" viewBox="40 20 1040 560" role="img" aria-label="Route map">
      <rect x="40" y="20" width="1040" height="560" fill="#f7f6f1" rx="10" />
      {/* The Mio-gawa and the bay, purely decorative. The Shiokaze Line follows the river's north bank. */}
      <path d="M40 215 C 260 190, 420 240, 620 205 S 900 120, 1080 150" stroke="#d3e6f1" strokeWidth="26" fill="none" />
      <path d="M40 150 L 40 470 C 70 440, 95 390, 92 320 S 70 190, 40 150 Z" fill="#d3e6f1" />
      <text x="56" y="330" className="map-geo" transform="rotate(-90 56 330)">川湊湾 Kawaminato Bay</text>
      <text x="255" y="212" textAnchor="middle" className="map-geo">澪川 Mio-gawa</text>
      {LINES.map((l) => (
        <polyline
          key={l.id}
          points={l.stops.map((id) => `${stationById(id).diagram.x},${stationById(id).diagram.y}`).join(' ')}
          fill="none" stroke={l.color} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round"
        />
      ))}
      <TrainDots />
      {STATIONS.map((s) => {
        const ls = linesAt(s.id);
        const lp = labelPos(s);
        const x = s.diagram.x, y = s.diagram.y;
        const sel = s.id === selected;
        const inter = ls.length > 1;
        return (
          <g key={s.id} className={`stn${sel ? ' sel' : ''}`} onClick={() => onSelect(s.id)} tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(s.id)}>
            <circle cx={x} cy={y} r={34} fill="transparent" />
            {sel && <circle cx={x} cy={y} r={inter ? 24 : 20} fill="none" stroke="#e02020" strokeWidth={3} strokeDasharray="5 4" />}
            <circle cx={x} cy={y} r={inter ? 15 : 11} fill="#fff" stroke={inter ? '#1b1f24' : ls[0].color} strokeWidth={inter ? 5 : 4.5} />
            {here === s.id && <circle cx={x} cy={y} r={5.5} fill="#e02020" />}
            {ls.map((l, i) => {
              const [bx, by] = badgePos(s, i, inter);
              const [letter, num] = s.numbers[l.id].split('-');
              return (
                <g key={l.id} transform={`translate(${bx}, ${by})`}>
                  <rect width={30} height={30} rx={6} fill="#fff" stroke={l.color} strokeWidth={3.5} />
                  <text x={15} y={12.5} className="map-badge-l" fill={l.color}>{letter}</text>
                  <text x={15} y={25} className="map-badge-n">{num}</text>
                </g>
              );
            })}
            <text x={x + lp.dx} y={y + lp.dy} textAnchor={lp.anchor} className="map-ja">{s.nameJa}</text>
            <text x={x + lp.dx} y={y + lp.dy + 16} textAnchor={lp.anchor} className="map-en">{s.nameRomaji}</text>
          </g>
        );
      })}
      {/* Legend */}
      <g transform={`translate(800, ${536 - LINES.length * 30})`}>
        <rect width="250" height={LINES.length * 30 + 44} rx="8" fill="#fff" stroke="#d9d6cc" />
        {LINES.map((l, i) => (
          <g key={l.id} transform={`translate(16, ${20 + i * 30})`}>
            <circle cx={10} cy={6} r={11} fill={l.color} />
            <text x={10} y={10.5} textAnchor="middle" className="map-bullet">{l.id}</text>
            <text x={30} y={5} className="map-leg-ja">{l.nameJa}</text>
            <text x={30} y={18} className="map-leg-en">{l.nameEn}</text>
          </g>
        ))}
        <g transform={`translate(16, ${22 + LINES.length * 30})`}>
          <rect x={4} y={0} width={12} height={8} rx={2.5} fill="#fff" stroke="#555" strokeWidth={2.5} />
          <text x={30} y={8} className="map-leg-en">走行中の電車 Trains (live)</text>
        </g>
      </g>
    </svg>
  );
}
