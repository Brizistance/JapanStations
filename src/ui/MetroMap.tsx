// Interactive route diagram. Everything is drawn from the network data, including
// the live train markers, which come from the same timetable the 3D trains follow.

import { useEffect, useRef, useState } from 'react';
import { LINES, RAIL_LINES, RAIL_STATIONS, STATIONS, alongPolyline, destinationOf, diagramPath, diagramRuns, diagramSegment, isUnbuilt, linesAt, stationById } from '../data/network';
import type { Dir, LineDef, StationDef } from '../data/types';
import { NET, RAIL_NET, clock, formatClock, lineDepartures, lineSim, type LineDeparture } from '../sim';
import { trainStateAt } from '../sim/timetable';

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
    <span className="bullet" style={{ background: line.color, width: size, height: size, fontSize: size * (line.id.length > 1 ? 0.45 : 0.6) }}>
      {line.id}
    </span>
  );
}

/** Where to put each station's label relative to its marker (dy is the Japanese line's baseline). */
function labelPos(s: StationDef): { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' } {
  const label = s.diagram.label ?? (linesAt(s.id).length > 1 ? 'se' : 'below');
  switch (label) {
    case 'right': return { dx: 26, dy: -2, anchor: 'start' };
    case 'left': return { dx: -26, dy: -2, anchor: 'end' };
    case 'se': return { dx: 22, dy: 44, anchor: 'start' };
    case 'sw': return { dx: -22, dy: 44, anchor: 'end' };
    case 'ne': return { dx: 24, dy: -30, anchor: 'start' };
    case 'nw': return { dx: -24, dy: -38, anchor: 'end' };
    default: return { dx: 0, dy: 40, anchor: 'middle' };
  }
}

/** Top-left corner of the i-th number badge for a station. */
function badgePos(s: StationDef, i: number, inter: boolean): [number, number] {
  const { x, y, badges, label } = s.diagram;
  // A named corner: badges side by side, growing away from the marker.
  if (badges === 'ne') return [x + 20 + i * 34, y - 50];
  if (badges === 'nw') return [x - 52 - i * 34, y - 50];
  if (badges === 'sw') return [x - 52 - i * 34, y + 20];
  // Interchanges default to a stack on the left.
  if (inter) return [x - 52, i === 0 ? y - 50 : y + 20];
  // Opposite a side label, otherwise above the marker.
  if (label === 'right') return [x - 52, y - 15];
  if (label === 'left') return [x + 22, y - 15];
  return [x - 15, y - 50];
}

/** The whole diagram, in SVG units. */
const MAP_W = 1900, MAP_H = 1060;
const MIN_ZOOM = 1, MAX_ZOOM = 4;
const LEGEND_ROWS = LINES.length + RAIL_LINES.length;
type View = { x: number; y: number; w: number };

/** Keep the view inside the diagram (aspect ratio fixed by MAP_W / MAP_H). */
function clampView(v: View): View {
  const w = Math.min(MAP_W / MIN_ZOOM, Math.max(MAP_W / MAX_ZOOM, v.w));
  const h = (w * MAP_H) / MAP_W;
  return { w, x: Math.min(MAP_W - w, Math.max(0, v.x)), y: Math.min(MAP_H - h, Math.max(0, v.y)) };
}

/**
 * Wheel to zoom about the cursor, drag to pan, buttons for the same. A drag that moves more
 * than a few pixels swallows the click that ends it, so panning never selects a station.
 */
function usePanZoom() {
  const [view, setView] = useState<View>({ x: 0, y: 0, w: MAP_W });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ px: number; py: number; v: View; moved: boolean } | null>(null);
  const toMap = (clientX: number, clientY: number, v: View) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: v.x + ((clientX - r.left) / r.width) * v.w, y: v.y + ((clientY - r.top) / r.height) * ((v.w * MAP_H) / MAP_W) };
  };
  const zoomAt = (f: number, cx?: number, cy?: number) =>
    setView((v) => {
      const c = cx === undefined || cy === undefined ? { x: v.x + v.w / 2, y: v.y + (v.w * MAP_H) / MAP_W / 2 } : toMap(cx, cy, v);
      const w = Math.min(MAP_W / MIN_ZOOM, Math.max(MAP_W / MAX_ZOOM, v.w / f));
      const k = w / v.w;
      return clampView({ w, x: c.x - (c.x - v.x) * k, y: c.y - (c.y - v.y) * k });
    });
  // React's onWheel is passive, so preventDefault (to stop the page scrolling) needs a native listener.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      drag.current = { px: e.clientX, py: e.clientY, v: view, moved: false };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.px, dy = e.clientY - d.py;
      if (!d.moved && Math.hypot(dx, dy) < 5) return;
      if (!d.moved) svgRef.current?.setPointerCapture(e.pointerId);
      d.moved = true;
      const r = svgRef.current!.getBoundingClientRect();
      const k = d.v.w / r.width;
      setView(clampView({ w: d.v.w, x: d.v.x - dx * k, y: d.v.y - dy * k }));
    },
    onPointerUp: () => {
      // Keep the flag until the click that follows this pointerup has been swallowed.
      setTimeout(() => (drag.current = null), 0);
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (drag.current?.moved) e.stopPropagation();
    },
  };
  return { view, svgRef, handlers, zoomAt, reset: () => setView({ x: 0, y: 0, w: MAP_W }) };
}

function TrainDots() {
  useTick(500);
  const dots: { key: string; x: number; y: number; color: string; moving: boolean }[] = [];
  const sims = [...NET.map((l) => ({ geom: l.geom, tt: l.tt, id: l.geom.def.id })), ...RAIL_NET.flatMap((l) => (l.services ?? []).map((sv) => ({ geom: l.geom, tt: sv.tt, id: `${l.geom.def.id}${sv.type.id}` })))];
  for (const { geom, tt, id } of sims) {
    const stub = geom.def.beyond;
    for (let k = 0; k < tt.trainCount; k++) {
      const st = trainStateAt(tt, k, clock.time);
      let p: { x: number; y: number; dx: number; dy: number };
      if (stub && (st.s < geom.firstS || st.s > geom.lastS)) {
        // Beyond an end stop of a main line: along the stub towards the map edge.
        const down = st.s > geom.lastS;
        const end = stationById(geom.def.stops[down ? geom.def.stops.length - 1 : 0]).diagram;
        const f = Math.abs(st.s - (down ? geom.lastS : geom.firstS)) / stub.runM;
        if (f > 0.98) continue; // off the map
        p = alongPolyline([[end.x, end.y], stub.diagram[down ? 'down' : 'up']], f);
        if (!down) { p.dx = -p.dx; p.dy = -p.dy; }
      } else {
        // Segment the train is on (clamped at the ends for the sidings).
        let i = 0;
        while (i < geom.stopS.length - 2 && st.s > geom.stopS[i + 1]) i++;
        const f = Math.max(-0.12, Math.min(1.12, (st.s - geom.stopS[i]) / (geom.stopS[i + 1] - geom.stopS[i])));
        p = alongPolyline(diagramSegment(geom.def, i), f);
      }
      // Offset to the side of the line by direction of travel (trains keep left).
      const side = geom.lateral(st.track, st.s) < 0 ? -1 : 1;
      dots.push({
        key: `${id}${k}`,
        x: p.x - p.dy * 9 * side,
        y: p.y + p.dx * 9 * side,
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
  const rows: { line: LineDef; dir: Dir; deps: LineDeparture[]; platform: number }[] = [];
  for (const line of linesAt(station.id)) {
    const stop = line.stops.indexOf(station.id);
    for (const dir of ['down', 'up'] as Dir[]) {
      const deps = lineDepartures(lineSim(line.id), stop, dir, clock.time, line.services ? 3 : 2);
      if (deps.length) rows.push({ line, dir, deps, platform: station.platforms[line.id][dir === 'down' ? 0 : 1] });
    }
  }
  return (
    <div className="deps">
      {rows.map((r) => {
        const t = destinationOf(r.line, r.dir);
        return (
          <div className="dep" key={r.line.id + r.dir}>
            <LineBullet line={r.line} />
            <div className="dep-dest">
              <b>{t.nameJa} 方面</b>
              <span>for {t.nameRomaji} · Platform {r.platform}</span>
            </div>
            <div className="dep-times">
              {r.deps.map((d, i) => (
                <span key={i} className={i === 0 ? 'first' : ''}>
                  {d.service && <i className="dep-type" style={{ background: d.service.color }} title={d.service.nameEn}>{d.service.nameJa}</i>}
                  {formatClock(d.dep)}
                </span>
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
      {s.transfer && (
        <p className="panel-blurb">
          <b>のりかえ</b> Walking transfer (outside the gates) to {stationById(s.transfer).nameJa} <em>{stationById(s.transfer).nameRomaji}</em>
        </p>
      )}
      <h3>つぎの電車 <em>Next departures</em></h3>
      <Departures station={s} />
      {isUnbuilt(id) && <p className="panel-blurb">この駅はまだ歩けません <em>On the timetable, but not built to walk around yet.</em></p>}
      {onGo && !isUnbuilt(id) && (
        <button className="btn primary wide" onClick={() => onGo(id)}>
          {goLabel ?? 'この駅へ移動'} <em>Go to this station</em>
        </button>
      )}
    </div>
  );
}

export function MetroMap({ selected, onSelect, here }: { selected: string | null; onSelect: (id: string) => void; here?: string | null }) {
  const { view, svgRef, handlers, zoomAt, reset } = usePanZoom();
  const zoomed = view.w < MAP_W - 1;
  return (
    <div className="map-frame">
    <svg ref={svgRef} className={`map${zoomed ? ' zoomed' : ''}`} viewBox={`${view.x} ${view.y} ${view.w} ${(view.w * MAP_H) / MAP_W}`}
      role="img" aria-label="Route map" {...handlers}>
      <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="#f7f6f1" rx="10" />
      {/* The Mio-gawa and the bay, purely decorative. The Shiokaze Line follows the river's north bank;
          the western ends of the lines run out under the bay to reclaimed land. */}
      <path d="M0 50 L 0 1000 L 120 1000 C 70 900, 40 760, 60 640 S 120 420, 70 300 S 40 120, 0 50 Z" fill="#d3e6f1" />
      <path d="M60 372 C 300 350, 520 395, 700 368 S 1000 300, 1180 330 S 1460 300, 1640 250" stroke="#d3e6f1" strokeWidth="24" fill="none" />
      <text x="30" y="700" className="map-geo" transform="rotate(-90 30 700)">川湊湾 Kawaminato Bay</text>
      <text x="300" y="376" textAnchor="middle" className="map-geo">澪川 Mio-gawa</text>
      {/* Lines in data order, so a line that runs on another's track draws its stripe on top. */}
      {LINES.flatMap((l) => diagramRuns(l).map((r, k) => (
        <polyline
          key={`${l.id}${k}`}
          points={r.pts.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none" stroke={l.color} strokeWidth={r.shared ? 5 : 13} strokeLinecap="round" strokeLinejoin="round"
          data-shared={r.shared || undefined}
        />
      )))}
      {/* Main-line railways: the black-and-white railway pattern, running off the map at both ends. */}
      {RAIL_LINES.map((l) => {
        const pts = [...(l.beyond ? [l.beyond.diagram.up] : []), ...diagramPath(l), ...(l.beyond ? [l.beyond.diagram.down] : [])];
        const d = pts.map(([x, y]) => `${x},${y}`).join(' ');
        return (
          <g key={l.id} fill="none" strokeLinejoin="round">
            <polyline points={d} stroke="#1b1f24" strokeWidth={8} />
            <polyline points={d} stroke="#fff" strokeWidth={4.5} strokeDasharray="11 11" />
            {l.beyond && (['up', 'down'] as const).map((dir) => {
              const [x, y] = l.beyond!.diagram[dir];
              return (
                <g key={dir}>
                  <text x={x + 10} y={y + 1} className="map-rail-ja">{l.beyond![dir].nameJa}方面</text>
                  <text x={x + 10} y={y + 13} className="map-rail-en">for {l.beyond![dir].nameRomaji}</text>
                </g>
              );
            })}
          </g>
        );
      })}
      {RAIL_STATIONS.filter((s) => s.transfer).map((s) => {
        const t = stationById(s.transfer!).diagram;
        return <line key={s.id} x1={s.diagram.x} y1={s.diagram.y} x2={t.x} y2={t.y} stroke="#8a8f98" strokeWidth={3} strokeDasharray="1 6" strokeLinecap="round" />;
      })}
      <TrainDots />
      {RAIL_STATIONS.map((s) => {
        const { x, y, label } = s.diagram;
        const sel = s.id === selected;
        const lp = label === 'right' ? { dx: 13, dy: 4, anchor: 'start' as const } : label === 'left' ? { dx: -13, dy: 4, anchor: 'end' as const }
          : label === 'above' ? { dx: 0, dy: -13, anchor: 'middle' as const } : { dx: 0, dy: 22, anchor: 'middle' as const };
        return (
          <g key={s.id} className={`stn${sel ? ' sel' : ''}`} onClick={() => onSelect(s.id)} tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(s.id)}>
            <circle cx={x} cy={y} r={20} fill="transparent" />
            {sel && <circle cx={x} cy={y} r={14} fill="none" stroke="#e02020" strokeWidth={3} strokeDasharray="5 4" />}
            <rect x={x - 7} y={y - 7} width={14} height={14} rx={3} fill="#fff" stroke="#1b1f24" strokeWidth={3} />
            <text x={x + lp.dx} y={y + lp.dy} textAnchor={lp.anchor}>
              <tspan className="map-rail-ja">{s.nameJa}</tspan>
              <tspan className="map-rail-en" dx={5}>{s.nameRomaji}</tspan>
            </text>
          </g>
        );
      })}
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
      <g transform={`translate(${MAP_W - 270}, ${MAP_H - 64 - LEGEND_ROWS * 30})`}>
        <rect width="250" height={LEGEND_ROWS * 30 + 44} rx="8" fill="#fff" stroke="#d9d6cc" />
        {RAIL_LINES.map((l, i) => (
          <g key={l.id} transform={`translate(16, ${20 + (LINES.length + i) * 30})`} fill="none">
            <line x1={-1} y1={6} x2={21} y2={6} stroke="#1b1f24" strokeWidth={8} />
            <line x1={-1} y1={6} x2={21} y2={6} stroke="#fff" strokeWidth={4.5} strokeDasharray="5.5 5.5" />
            <text x={30} y={5} className="map-leg-ja">{l.nameJa}</text>
            <text x={30} y={18} className="map-leg-en">{l.nameEn}</text>
          </g>
        ))}
        {LINES.map((l, i) => (
          <g key={l.id} transform={`translate(16, ${20 + i * 30})`}>
            <circle cx={10} cy={6} r={11} fill={l.color} />
            <text x={10} y={10.5} textAnchor="middle" className="map-bullet">{l.id}</text>
            <text x={30} y={5} className="map-leg-ja">{l.nameJa}</text>
            <text x={30} y={18} className="map-leg-en">{l.nameEn}</text>
          </g>
        ))}
        <g transform={`translate(16, ${22 + LEGEND_ROWS * 30})`}>
          <rect x={4} y={0} width={12} height={8} rx={2.5} fill="#fff" stroke="#555" strokeWidth={2.5} />
          <text x={30} y={8} className="map-leg-en">走行中の電車 Trains (live)</text>
        </g>
      </g>
    </svg>
      <div className="map-zoom">
        <button className="btn" onClick={() => zoomAt(1.5)} aria-label="Zoom in">＋</button>
        <button className="btn" onClick={() => zoomAt(1 / 1.5)} aria-label="Zoom out" disabled={!zoomed}>－</button>
        <button className="btn" onClick={reset} aria-label="Show the whole map" disabled={!zoomed}>全体 <em>All</em></button>
      </div>
    </div>
  );
}
