// Interactive route diagram. Everything is drawn from the network data, including
// the live train markers, which come from the same timetable the 3D trains follow.

import { useEffect, useMemo, useRef, useState } from 'react';
import { create } from 'zustand';
import { ALL_LINES, ALL_STATIONS, LINES, RAIL_LINES, RAIL_STATIONS, STATIONS, alongPolyline, destinationOf, diagramPath, diagramRuns, diagramSegment, isUnbuilt, linesAt, stationById } from '../data/network';
import type { Dir, LineDef, StationDef } from '../data/types';
import { NET, RAIL_NET, clock, formatClock, lineDepartures, lineSim, type LineDeparture } from '../sim';
import { CHANGE_S, WALK_S, findRoute, type Leg, type Route } from '../sim/route';
import { trainStateAt } from '../sim/timetable';
import { hasOwnLook } from '../stations/looks';
import { SPECS } from '../stations/specs';
import { Bi, usePair } from './Bi';
import { useUI } from './store';

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
type Slot = NonNullable<StationDef['diagram']['label']> | 'top';
type LabelAt = { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' };
/** The slots a name is moved through when its own is taken, nearest the usual ones first. */
const SLOTS: Slot[] = ['below', 'right', 'left', 'top', 'se', 'sw', 'ne', 'nw'];
function labelPos(s: StationDef, k = 1, slot?: Slot): LabelAt {
  const p = labelPos1(s, slot);
  // A larger label sits a little further out; text above the marker needs no extra room.
  return { ...p, dx: p.dx * (1 + (k - 1) * 0.4), dy: p.dy > 0 ? p.dy + (k - 1) * 22 : p.dy };
}
function labelPos1(s: StationDef, slot?: Slot): LabelAt {
  const label: Slot = slot ?? s.diagram.label ?? (linesAt(s.id).length > 1 ? 'se' : 'below');
  switch (label) {
    case 'top': return { dx: 0, dy: -42, anchor: 'middle' };
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
function badgePos(s: StationDef, i: number, inter: boolean, at: { x: number; y: number }): [number, number] {
  const { badges, label } = s.diagram, { x, y } = at;
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
/** Furthest out, as a fraction of the whole-map view; furthest in, as a multiple of the sheet's width. */
const MIN_ZOOM = 0.6, MAX_ZOOM = 8;
const LEGEND_ROWS = LINES.length + RAIL_LINES.length;
type View = { x: number; y: number; w: number };
/**
 * Screen pixels per sheet unit from which every station is named and numbered (a 19-unit name is
 * then about 11 px tall); below it only the main ones are.
 */
const DETAIL_PX = 0.6;
/**
 * Screen pixels per sheet unit past which names, badges, markers and line widths stop growing
 * (a 19-unit name stays 19 px). Zooming in further only moves stations apart, so names
 * that crowd each other come clear.
 */
const SIZE_CAP_PX = 1;
/** SVG transform that scales something by `m` about the point (x, y). */
const about = (x: number, y: number, m: number) => (m === 1 ? undefined : `translate(${x} ${y}) scale(${m}) translate(${-x} ${-y})`);
const VIEW_KEY = 'js.mapView';
/** How much larger the main stations' names are drawn on the whole-map view. */
const OVERVIEW_K = 1.4;

/** The station most lines meet at, and every line's end stops: named even on the whole-map view. */
export const HUB = STATIONS.reduce((a, b) => (linesAt(b.id).length > linesAt(a.id).length ? b : a)).id;
export const TERMINI = new Set(LINES.flatMap((l) => [l.stops[0], l.stops[l.stops.length - 1]]));
const isMajor = (id: string) => id === HUB || TERMINI.has(id) || linesAt(id).length > 1;

/** Search text with macrons, case, spaces and hyphens removed, so "odori" finds Ōdōri and "y13" finds Y-13. */
const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s\-'・]/g, '');
const SEARCH = ALL_STATIONS.map((s) => ({ s, keys: [s.nameJa, s.nameKana, s.nameRomaji, ...Object.values(s.numbers)].map(fold) }));
export function searchStations(q: string): StationDef[] {
  const f = fold(q);
  if (!f) return [];
  const starts = SEARCH.filter((e) => e.keys.some((k) => k.startsWith(f)));
  const inside = SEARCH.filter((e) => !starts.includes(e) && e.keys.some((k) => k.includes(f)));
  return [...starts, ...inside].slice(0, 7).map((e) => e.s);
}

/** A five-pointed star centred on (0, 0): the mark of a station modelled in full. */
const STAR = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 2.6 : 6.2, a = (i * Math.PI) / 5 - Math.PI / 2;
  return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
}).join(' ');

/**
 * The window onto the sheet. The map area takes whatever shape the screen gives it, so the view
 * is as wide as `w` sheet units and as tall as that shape makes it. Wheel to zoom about the
 * cursor, drag to move at any zoom, buttons for the same. A drag that moves more than a few
 * pixels swallows the click that ends it, so moving the map never selects a station.
 */
function usePanZoom() {
  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  /** Height over width of the map area on screen. */
  const [aspect, setAspect] = useState(MAP_H / MAP_W);
  /** Width of the map area in screen pixels. */
  const [widthPx, setWidthPx] = useState(800);
  const aspectRef = useRef(aspect);
  aspectRef.current = aspect;
  /** True until the visitor moves or zooms: the view then keeps showing the whole map as the window changes. */
  const [fitted, setFitted] = useState(true);
  /** The view that shows the whole sheet, centred, in an area of this shape. */
  const fit = (a: number): View => {
    const w = Math.max(MAP_W, MAP_H / a);
    return { w, x: (MAP_W - w) / 2, y: (MAP_H - w * a) / 2 };
  };
  const [view, setView] = useState<View>(() => fit(aspect));
  /** Zoom limits relative to the whole-map view; the middle of the view stays on the sheet. */
  const clampView = (v: View): View => {
    const a = aspectRef.current, full = fit(a).w;
    const w = Math.min(full / MIN_ZOOM, Math.max(MAP_W / MAX_ZOOM, v.w));
    const h = w * a;
    const cx = Math.min(MAP_W, Math.max(0, v.x + (v.w - w) / 2 + w / 2)), cy = Math.min(MAP_H, Math.max(0, v.y + (v.w * a - h) / 2 + h / 2));
    return { w, x: cx - w / 2, y: cy - h / 2 };
  };
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      // Layout size, not the bounding box: the city menu opens with a zoom animation that scales the box.
      const w = el.clientWidth, h = el.clientHeight;
      if (w > 0 && h > 0) {
        setAspect(h / w);
        setWidthPx(w);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // The area changed shape: show the whole map again if it was, else keep the same middle.
  useEffect(() => {
    setView((v) => (fitted ? fit(aspect) : clampView(v)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect]);
  const drag = useRef<{ px: number; py: number; v: View; moved: boolean } | null>(null);
  const toMap = (clientX: number, clientY: number, v: View) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: v.x + ((clientX - r.left) / r.width) * v.w, y: v.y + ((clientY - r.top) / r.height) * v.w * aspectRef.current };
  };
  const zoomAt = (f: number, cx?: number, cy?: number) => {
    setFitted(false);
    setView((v) => {
      const a = aspectRef.current;
      const c = cx === undefined || cy === undefined ? { x: v.x + v.w / 2, y: v.y + (v.w * a) / 2 } : toMap(cx, cy, v);
      const w = Math.min(fit(a).w / MIN_ZOOM, Math.max(MAP_W / MAX_ZOOM, v.w / f));
      const k = w / v.w;
      return clampView({ w, x: c.x - (c.x - v.x) * k, y: c.y - (c.y - v.y) * k });
    });
  };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setFitted(false);
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
  /** Centre on a sheet point at a scale (1 = the sheet's width fills the area). */
  const focus = (x: number, y: number, scale: number) => {
    const w = MAP_W / scale;
    setFitted(false);
    setView(clampView({ w, x: x - w / 2, y: y - (w * aspectRef.current) / 2 }));
  };
  const reset = () => {
    setFitted(true);
    setView(fit(aspectRef.current));
  };
  const full = fit(aspect).w;
  return { view, viewH: view.w * aspect, pxPerUnit: widthPx / view.w, fitted, atMin: view.w >= full / MIN_ZOOM - 1, atMax: view.w <= MAP_W / MAX_ZOOM + 1, svgRef, stageRef, handlers, zoomAt, focus, reset };
}

/**
 * Geographic view: world metres (x east, y south) drawn to scale on the same sheet as the diagram.
 * The scale is set by the network's north-south extent; room is left on the left for the bay.
 */
const WORLD = {
  x0: Math.min(...ALL_STATIONS.map((s) => s.position.x)),
  y0: Math.min(...ALL_STATIONS.map((s) => s.position.y)),
  y1: Math.max(...ALL_STATIONS.map((s) => s.position.y)),
};
const GEO_K = (MAP_H - 90) / (WORLD.y1 - WORLD.y0), GEO_X0 = 330, GEO_Y0 = 30;
const geoX = (x: number) => GEO_X0 + (x - WORLD.x0) * GEO_K;
const geoY = (y: number) => GEO_Y0 + (y - WORLD.y0) * GEO_K;
const posOf = (s: StationDef, geo: boolean) => (geo ? { x: geoX(s.position.x), y: geoY(s.position.y) } : { x: s.diagram.x, y: s.diagram.y });

/** Points along a line's real alignment between two chainages, on the geographic sheet. */
function geoSample(lineId: string, a: number, b: number): [number, number][] {
  const path = lineSim(lineId).geom.path;
  const n = Math.max(1, Math.ceil((b - a) / 25));
  return Array.from({ length: n + 1 }, (_, i) => {
    const q = path.pointAt(a + ((b - a) * i) / n);
    return [geoX(q.x), geoY(q.z)] as [number, number];
  });
}

/** A line's real alignment, sampled for the geographic view; `shared` = on another line's track. */
const geoCache = new Map<string, { pts: [number, number][]; shared: boolean }[]>();
function geoRuns(lineId: string): { pts: [number, number][]; shared: boolean }[] {
  let runs = geoCache.get(lineId);
  if (runs) return runs;
  const g = lineSim(lineId).geom, def = g.def;
  const sample = (a: number, b: number) => geoSample(lineId, a, b);
  // A main line runs on a little past its end stops, towards the cities off the map.
  const past = def.beyond ? Math.min(def.beyond.runM, GEO_PAST) : 0;
  const a = g.firstS - past, b = g.lastS + past;
  runs = [];
  if (def.shares) {
    const [lo, hi] = [def.shares.from, def.shares.to].map((id) => g.stopS[def.stops.indexOf(id)]).sort((p, q) => p - q);
    if (lo > a) runs.push({ pts: sample(a, lo), shared: false });
    runs.push({ pts: sample(lo, hi), shared: true });
    if (hi < b) runs.push({ pts: sample(hi, b), shared: false });
  } else runs.push({ pts: sample(a, b), shared: false });
  geoCache.set(lineId, runs);
  return runs;
}
/** How far past its end stops (metres) a main line is drawn in the geographic view. */
const GEO_PAST = 700;

/**
 * Label placement for the geographic view. The diagram's label slots are set by hand in the data;
 * on the real street plan stations sit wherever they sit, so each name (with its number badges)
 * is tried in eight places round its marker and takes the first that covers no other name, no
 * marker and, if it can, no line. A name with nowhere to go is left out until the map is zoomed
 * in; the station still answers to hover and click.
 */
type Box = { x0: number; y0: number; x1: number; y1: number };
const hits = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
/** Rough width of a line of text: kanji and kana are a full em wide, Latin letters a little over half. */
const textW = (t: string, size: number) => [...t].reduce((w, c) => w + (c.charCodeAt(0) > 0x2e80 ? 1 : 0.58) * size, 0);
const BADGE = 26, BADGE_GAP = 3;
interface LabelReq { id: string; x: number; y: number; r: number; big: string; small: string; size1: number; size2: number; badges: number; rank: number }
/** A placed label, in units from its station's centre: the block's corner and size, where the text starts, the two baselines. */
interface Block { bx: number; by: number; w: number; h: number; tx: number; y1: number; y2: number }
function placeLabels(reqs: LabelReq[], markers: Box[], linePts: [number, number][], m: number): { blocks: Map<string, Block>; taken: Box[] } {
  const taken = [...markers], blocks = new Map<string, Block>();
  const halfLine = 8 * m;
  const onLine = (b: Box) => linePts.some(([x, y]) => x > b.x0 - halfLine && x < b.x1 + halfLine && y > b.y0 - halfLine && y < b.y1 + halfLine);
  for (const q of [...reqs].sort((a, b) => a.rank - b.rank)) {
    const bw = q.badges ? q.badges * (BADGE + BADGE_GAP) + 3 : 0;
    const th = q.size1 + q.size2 + 3;
    const w = bw + Math.max(textW(q.big, q.size1), textW(q.small, q.size2)), h = Math.max(th, q.badges ? BADGE : 0);
    const g = q.r + 7, d = g * 0.75;
    const spots: [number, number][] = [[g, -h / 2], [-g - w, -h / 2], [-w / 2, g], [-w / 2, -g - h], [d, d], [d, -d - h], [-d - w, d], [-d - w, -d - h]];
    const boxAt = ([bx, by]: [number, number]): Box => ({ x0: q.x + (bx - 3) * m, y0: q.y + (by - 3) * m, x1: q.x + (bx + w + 3) * m, y1: q.y + (by + h + 3) * m });
    const free = spots.filter((sp) => !taken.some((t) => hits(t, boxAt(sp))));
    const spot = free.find((sp) => !onLine(boxAt(sp))) ?? free[0];
    if (!spot) continue;
    taken.push(boxAt(spot));
    const top = spot[1] + (h - th) / 2;
    blocks.set(q.id, { bx: spot[0], by: spot[1], w, h, tx: spot[0] + bw, y1: top + q.size1 * 0.86, y2: top + q.size1 + 3 + q.size2 * 0.86 });
  }
  return { blocks, taken };
}
/** Every sampled point of every line on the geographic sheet, for keeping names off the lines. */
let geoLinePts: [number, number][] | undefined;
const allGeoLinePts = () => (geoLinePts ??= ALL_LINES.flatMap((l) => geoRuns(l.id).flatMap((r) => r.pts)));

/** Named places beside a station (its park, its landmark), from the station's street spec. */
type Named = { ja: string; en: string };
function placesAt(id: string): Named[] {
  const surface = (SPECS[id] as { surface?: { parkName?: Named; landmark?: Named } } | undefined)?.surface;
  return [surface?.landmark, surface?.parkName].filter((n): n is Named => !!n);
}
const PARKS = STATIONS.filter((s) => (SPECS[s.id] as { surface?: { parkName?: Named } } | undefined)?.surface?.parkName);

/** One label per district, at the station nearest the middle of that district's stations. */
function districtAnchors(geo: boolean): { s: StationDef; x: number; y: number }[] {
  const groups = new Map<string, StationDef[]>();
  for (const s of STATIONS) groups.set(s.districtJa, [...(groups.get(s.districtJa) ?? []), s]);
  return [...groups.values()].map((g) => {
    const ps = g.map((s) => posOf(s, geo));
    const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cy = ps.reduce((a, p) => a + p.y, 0) / ps.length;
    let best = 0;
    ps.forEach((p, i) => {
      if (Math.hypot(p.x - cx, p.y - cy) < Math.hypot(ps[best].x - cx, ps[best].y - cy)) best = i;
    });
    return { s: g[best], x: ps[best].x, y: ps[best].y };
  });
}

/** Where a district name may sit, in units from its station: above and below first, then further out and to the sides. */
const DISTRICT_SPOTS: [number, number][] = [[0, -70], [0, 76], [0, -104], [0, 110], [-130, -70], [130, -70], [-130, 76], [130, 76], [0, -140], [0, 146]];

/** Every line of the diagram as closely spaced points, for keeping district names off the lines. */
let diagramLinePts: [number, number][] | undefined;
function allDiagramLinePts(): [number, number][] {
  if (diagramLinePts) return diagramLinePts;
  const out: [number, number][] = [];
  const paths = [...LINES.flatMap((l) => diagramRuns(l).map((r) => r.pts)), ...RAIL_LINES.map((l) => [...(l.beyond ? [l.beyond.diagram.up] : []), ...diagramPath(l), ...(l.beyond ? [l.beyond.diagram.down] : [])])];
  for (const pts of paths) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 8));
      for (let k = 0; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
    }
  }
  return (diagramLinePts = out);
}

/** A smooth curve through world points, as an SVG path on the geographic sheet. */
function geoCurve(pts: [number, number][]): string {
  const P = pts.map(([x, y]) => [geoX(x), geoY(y)]);
  let d = `M ${P[0][0]} ${P[0][1]}`;
  for (let i = 1; i < P.length - 1; i++) d += ` Q ${P[i][0]} ${P[i][1]}, ${(P[i][0] + P[i + 1][0]) / 2} ${(P[i][1] + P[i + 1][1]) / 2}`;
  return `${d} L ${P[P.length - 1][0]} ${P[P.length - 1][1]}`;
}
const WATER = '#d3e6f1', LAND = '#f7f6f1';
/** Reclaimed land in the bay, world metres [x0, y0, x1, y1]: the landfills the western stations stand on. */
const LANDFILL: [number, number, number, number][] = [
  [-1280, -960, 620, -570], // river-mouth landfill, north bank (Shiomi)
  [-1430, -470, 620, 300], // the bay new town and the port (Minato Center)
  [-520, 1120, 620, 1700], // south bay (Kamomehama)
  [-1250, 1130, -690, 1680], // the new island (Shin-Kamome)
];
/** The Mio-gawa: west along about z = -450 between Kita and Central, out between the landfills. */
const RIVER: [number, number][] = [[7700, -3500], [6700, -2900], [5900, -2000], [4900, -1440], [4270, -1140], [3700, -640], [3100, -420], [2300, -440], [1500, -470], [560, -515], [-1500, -515]];

/** What lies behind the lines: water, parks and district names. Decorative; the sim knows none of it. */
function Backdrop({ geo, detail, ja, m, taken, linePts }: { geo: boolean; detail: boolean; ja: boolean; m: number; taken: Box[]; linePts: [number, number][] }) {
  const used = [...taken];
  const pad = 9 * m;
  const onLine = (b: Box) => linePts.some(([x, y]) => x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad);
  return (
    <g>
      {geo ? (
        <>
          {/* The bay to the west and the sea along the south port. */}
          <path d={`M 0 0 L ${geoX(150)} 0 C ${geoX(420)} ${geoY(-2200)}, ${geoX(640)} ${geoY(-1500)}, ${geoX(600)} ${geoY(-900)} L ${geoX(600)} ${geoY(1900)} C ${geoX(620)} ${geoY(2900)}, ${geoX(900)} ${geoY(3800)}, ${geoX(1500)} ${geoY(3800)} L ${MAP_W} ${geoY(3800)} L ${MAP_W} ${MAP_H} L 0 ${MAP_H} Z`} fill={WATER} />
          {LANDFILL.map(([x0, y0, x1, y1], i) => (
            <rect key={i} x={geoX(x0)} y={geoY(y0)} width={(x1 - x0) * GEO_K} height={(y1 - y0) * GEO_K} rx={12} fill={LAND} />
          ))}
          <path d={geoCurve(RIVER)} stroke={WATER} strokeWidth={13} fill="none" strokeLinecap="round" />
          <text x={geoX(-1500)} y={geoY(760)} className="map-geo">川湊湾 Kawaminato Bay</text>
          <text x={geoX(1380)} y={geoY(-470) + 4} className="map-geo">澪川 Mio-gawa</text>
        </>
      ) : (
        <>
          {/* The Mio-gawa and the bay. The Shiokaze Line follows the river's north bank;
              the western ends of the lines run out under the bay to reclaimed land. */}
          <path d="M0 50 L 0 1000 L 120 1000 C 70 900, 40 760, 60 640 S 120 420, 70 300 S 40 120, 0 50 Z" fill={WATER} />
          <path d="M60 372 C 300 350, 520 395, 700 368 S 1000 300, 1180 330 S 1460 300, 1640 250" stroke={WATER} strokeWidth="24" fill="none" />
          <text x="30" y="700" className="map-geo" transform="rotate(-90 30 700)">川湊湾 Kawaminato Bay</text>
          <text x="300" y="376" textAnchor="middle" className="map-geo">澪川 Mio-gawa</text>
        </>
      )}
      {/* A green patch behind every station that has a named park. */}
      {PARKS.map((s) => {
        const p = posOf(s, geo);
        return <circle key={s.id} cx={p.x} cy={p.y} r={46} fill="#d9ead0" />;
      })}
      {/* A district name sits near its station where it covers no name, badge, marker, line or other district; else it is left out. */}
      {detail && districtAnchors(geo).map(({ s, x, y }) => {
        const name = ja ? s.districtJa : s.district;
        const half = (textW(name, 13) * 1.12 * m) / 2;
        for (const [dx, dy] of DISTRICT_SPOTS) {
          const cx = x + dx * m, cy = y + dy * m;
          const box = { x0: cx - half, y0: cy - 14 * m, x1: cx + half, y1: cy + 5 * m };
          if (used.some((t) => hits(t, box)) || onLine(box)) continue;
          used.push(box);
          return <text key={s.districtJa} x={cx} y={cy} className="map-district" transform={about(cx, cy, m)}>{name}</text>;
        }
        return null;
      })}
    </g>
  );
}

function TrainDots({ geo, m }: { geo: boolean; m: number }) {
  useTick(500);
  const dots: { key: string; x: number; y: number; color: string; moving: boolean }[] = [];
  const sims = [...NET.map((l) => ({ geom: l.geom, tt: l.tt, id: l.geom.def.id })), ...RAIL_NET.flatMap((l) => (l.services ?? []).map((sv) => ({ geom: l.geom, tt: sv.tt, id: `${l.geom.def.id}${sv.type.id}` })))];
  for (const { geom, tt, id } of sims) {
    const stub = geom.def.beyond;
    for (let k = 0; k < tt.trainCount; k++) {
      const st = trainStateAt(tt, k, clock.time);
      let p: { x: number; y: number; dx: number; dy: number };
      if (geo) {
        if (stub && (st.s < geom.firstS - GEO_PAST || st.s > geom.lastS + GEO_PAST)) continue; // off the map
        const q = geom.path.pointAt(st.s);
        p = { x: geoX(q.x), y: geoY(q.z), dx: q.tx, dy: q.tz };
      } else if (stub && (st.s < geom.firstS || st.s > geom.lastS)) {
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
        x: p.x - p.dy * 9 * m * side,
        y: p.y + p.dx * 9 * m * side,
        color: geom.def.color,
        moving: st.speed > 0.1,
      });
    }
  }
  return (
    <g>
      {dots.map((d) => (
        <rect key={d.key} x={d.x - 6} y={d.y - 4} width={12} height={8} rx={2.5} fill="#fff" stroke={d.color} strokeWidth={2.5} opacity={d.moving ? 1 : 0.75} transform={about(d.x, d.y, m)} />
      ))}
    </g>
  );
}

function Departures({ station }: { station: StationDef }) {
  useTick(1000);
  const lang = useUI((s) => s.lang);
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
        const dest = lang === 'ja' ? [`${t.nameJa} 方面`, `for ${t.nameRomaji}`] : [`for ${t.nameRomaji}`, `${t.nameJa} 方面`];
        return (
          <div className="dep" key={r.line.id + r.dir}>
            <LineBullet line={r.line} />
            <div className="dep-dest">
              <b>{dest[0]}</b>
              <span>{dest[1]} · Platform {r.platform}</span>
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

/** The route finder's state, shared by the map (which picks stations) and the panel beside it. */
type RouteState = {
  on: boolean;
  from: string | null;
  to: string | null;
  /** Which end the next station picked on the map fills. */
  field: 'from' | 'to';
  open: (from?: string | null, to?: string | null) => void;
  close: () => void;
  pick: (id: string) => void;
  setField: (f: 'from' | 'to') => void;
  swap: () => void;
};
export const useRoute = create<RouteState>((set) => ({
  on: false, from: null, to: null, field: 'from',
  open: (from = null, to = null) => set({ on: true, from, to, field: from ? 'to' : 'from' }),
  close: () => set({ on: false }),
  pick: (id) => set((s) => (s.field === 'from' ? { from: id, field: 'to' } : { to: id, field: s.from ? 'to' : 'from' })),
  setField: (field) => set({ field }),
  swap: () => set((s) => ({ from: s.to, to: s.from })),
}));

/** The route between the two chosen stations, leaving now; recomputed as the clock runs. */
function useRouteResult(): Route | null {
  const { on, from, to } = useRoute();
  useTick(1000);
  return on && from && to && from !== to ? findRoute(from, to, clock.time) : null;
}

/** The map points of one leg of a route, along the line it rides. */
function legPoints(leg: Leg, geo: boolean): [number, number][] {
  if (leg.kind === 'walk') return [leg.from, leg.to].map((id) => { const p = posOf(stationById(id), geo); return [p.x, p.y] as [number, number]; });
  const lo = Math.min(leg.fromStop, leg.toStop), hi = Math.max(leg.fromStop, leg.toStop);
  const g = lineSim(leg.line.id).geom;
  if (geo) return geoSample(leg.line.id, g.stopS[lo], g.stopS[hi]);
  return Array.from({ length: hi - lo }, (_, k) => diagramSegment(leg.line, lo + k)).flat();
}

function RoutePanel({ onGo, onGuide, confirm }: { onGo?: (id: string) => void; onGuide?: (id: string) => void; confirm?: boolean }) {
  const rt = useRoute();
  const route = useRouteResult();
  const canGuide = !!(confirm && onGuide && route && route.legs.length && rt.to && !isUnbuilt(rt.to));
  // Enter confirms the previewed trip.
  useEffect(() => {
    if (!canGuide) return;
    const key = (e: KeyboardEvent) => e.key === 'Enter' && !(e.target instanceof HTMLInputElement) && onGuide!(useRoute.getState().to!);
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [canGuide, onGuide]);
  const ja = useUI((s) => s.lang) === 'ja';
  const name = (id: string): [string, string] => {
    const s = stationById(id);
    return ja ? [s.nameJa, s.nameRomaji] : [s.nameRomaji, s.nameJa];
  };
  const field = (f: 'from' | 'to', labelJa: string, labelEn: string) => {
    const id = rt[f];
    return (
      <button className={`route-field${rt.field === f ? ' on' : ''}`} disabled={confirm} onClick={() => rt.setField(f)} aria-pressed={rt.field === f}>
        <small><Bi ja={labelJa} en={labelEn} /></small>
        {id ? <><b>{name(id)[0]}</b> <span>{name(id)[1]}</span></> : <i><Bi ja="地図で駅をえらぶ" en="Pick a station on the map" /></i>}
      </button>
    );
  };
  const rides = route ? route.legs.filter((l) => l.kind === 'ride').length : 0;
  return (
    <div className="panel route">
      <div className="route-head">
        <h2>{confirm ? <Bi ja="この経路で案内しますか" en="Confirm your trip" /> : <Bi ja="経路検索" en="Route finder" />}</h2>
        <button className="btn small" onClick={rt.close}>{confirm ? <Bi ja="やめる" en="Cancel" /> : <Bi ja="とじる" en="Close" />}</button>
      </div>
      <div className="route-fields">
        {field('from', confirm ? '現在地' : '出発', confirm ? 'From here' : 'From')}
        {field('to', confirm ? '行き先' : '到着', confirm ? 'Destination' : 'To')}
        {!confirm && <button className="btn small route-swap" onClick={rt.swap} aria-label="Swap start and end">⇅</button>}
      </div>
      {rt.from && rt.to && rt.from === rt.to && <p className="panel-blurb"><Bi ja="出発と到着が同じ駅です" en="Start and end are the same station." /></p>}
      {rt.from && rt.to && rt.from !== rt.to && !route && <p className="panel-blurb"><Bi ja="経路が見つかりません" en="No route found." /></p>}
      {confirm && rt.to && isUnbuilt(rt.to) && <p className="panel-blurb"><Bi ja="この駅はまだ歩けません" en="Not built to walk around yet, so no guidance there." /></p>}
      {canGuide && (
        <button className="btn primary wide route-confirm" autoFocus onClick={() => onGuide!(rt.to!)}>
          <Bi ja="案内を開始" en="Start guidance" /> <kbd>Enter</kbd>
        </button>
      )}
      {route && route.legs.length > 0 && (
        <>
          <div className="route-sum">
            <b>{formatClock(route.dep)} → {formatClock(route.arr)}</b>
            <span>{Math.ceil((route.arr - route.dep) / 60)} 分 min · のりかえ {Math.max(0, rides - 1)} 回 {rides - 1 === 1 ? 'change' : 'changes'}</span>
            {confirm && <span className="route-next">{route.legs[0].kind === 'walk' ? '徒歩から Starts with a walk' : `つぎの電車 First train in ${Math.max(0, Math.ceil((route.legs[0].dep - clock.time) / 60))} 分 min`}</span>}
          </div>
          <ol className="route-legs">
            {route.legs.map((leg, n) => {
              if (leg.kind === 'walk') {
                return (
                  <li key={n} className="walk">
                    <span className="route-walk">徒歩</span>
                    <div>
                      <b>{name(leg.to)[0]}</b> <span>{name(leg.to)[1]}</span>
                      <small>Walk outside the gates · {WALK_S / 60} 分 min allowed</small>
                    </div>
                  </li>
                );
              }
              const dest = destinationOf(leg.line, leg.dir);
              const platform = stationById(leg.from).platforms[leg.line.id][leg.dir === 'down' ? 0 : 1];
              return (
                <li key={n}>
                  <LineBullet line={leg.line} />
                  <div>
                    <b>{ja ? leg.line.nameJa : leg.line.nameEn}</b>
                    {leg.service && <i className="dep-type" style={{ background: leg.service.color }} title={leg.service.nameEn}>{leg.service.nameJa}</i>}
                    <small>{ja ? `${dest.nameJa} 方面 for ${dest.nameRomaji}` : `for ${dest.nameRomaji} ${dest.nameJa} 方面`} · Platform {platform}</small>
                    <div className="route-time"><em>{formatClock(leg.dep)}</em> {name(leg.from)[0]}</div>
                    <div className="route-time"><em>{formatClock(leg.arr)}</em> {name(leg.to)[0]}</div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="route-note">
            Next trains from now, from the timetable. Allowed: {CHANGE_S / 60} min to change trains, {WALK_S / 60} min for a walk between stations.
          </p>
          {!confirm && onGuide && rt.to && !isUnbuilt(rt.to) && (
            <button className="btn primary wide" onClick={() => onGuide(rt.to!)}>
              <Bi ja="ここから案内する" en="Guide me there from where I am" />
            </button>
          )}
          {!confirm && onGo && rt.from && !isUnbuilt(rt.from) && (
            <button className={`btn wide${onGuide ? '' : ' primary'}`} onClick={() => onGo(rt.from!)}>
              <Bi ja="出発駅へ移動" en="Go to the start station" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function StationPanel({ id, onGo, goLabel, onGuide, onPreview, confirm }: { id: string; onGo?: (id: string) => void; goLabel?: [ja: string, en: string]; onGuide?: (id: string) => void; onPreview?: (id: string) => void; confirm?: boolean }) {
  const s = stationById(id);
  const lines = linesAt(id);
  const [big, small] = usePair(s.nameJa, s.nameRomaji);
  const [dBig, dSmall] = usePair(s.districtJa, s.district);
  const lang = useUI((u) => u.lang);
  const places = placesAt(id);
  const rt = useRoute();
  if (rt.on) return <RoutePanel onGo={onGo} onGuide={onGuide} confirm={confirm} />;
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
          <h2>{big}</h2>
          <div className="panel-romaji">{small}</div>
        </div>
      </div>
      <div className="panel-lines">
        {lines.map((l) => (
          <span key={l.id} className="chip" style={{ borderColor: l.color }}>
            <LineBullet line={l} size={18} /> <Bi ja={l.nameJa} en={l.nameEn} />
          </span>
        ))}
      </div>
      {(id === HUB || hasOwnLook(id)) && (
        <div className="panel-marks">
          {id === HUB && <span><Bi ja="中央駅" en="Central hub" /></span>}
          {hasOwnLook(id) && <span>★ <Bi ja="細部まで再現" en="Modelled in full" /></span>}
        </div>
      )}
      <p className="panel-blurb">
        <b>{dBig}</b> {dSmall} — {s.blurb}
      </p>
      {places.length > 0 && (
        <p className="panel-blurb">
          <b><Bi ja="近くの名所" en="Nearby" /></b>{' '}
          {places.map((n) => (lang === 'ja' ? `${n.ja} ${n.en}` : `${n.en} ${n.ja}`)).join(' · ')}
        </p>
      )}
      {s.transfer && (
        <p className="panel-blurb">
          <b><Bi ja="のりかえ" en="Transfer" /></b> Walking transfer (outside the gates) to <Bi ja={stationById(s.transfer).nameJa} en={stationById(s.transfer).nameRomaji} />
        </p>
      )}
      <h3><Bi ja="つぎの電車" en="Next departures" /></h3>
      <Departures station={s} />
      {isUnbuilt(id) && <p className="panel-blurb"><Bi ja="この駅はまだ歩けません" en="On the timetable, but not built to walk around yet." /></p>}
      <div className="route-open">
        <button className="btn small" onClick={() => rt.open(id, null)}><Bi ja="ここから経路" en="Route from here" /></button>
        <button className="btn small" onClick={() => rt.open(null, id)}><Bi ja="ここまで経路" en="Route to here" /></button>
      </div>
      {onGuide && !isUnbuilt(id) && (
        <button className="btn primary wide" onClick={() => (onPreview ?? onGuide)(id)}>
          <Bi ja="この駅まで案内" en="Guide me to this station" />
        </button>
      )}
      {onGo && !isUnbuilt(id) && (
        <button className={`btn wide${onGuide ? '' : ' primary'}`} onClick={() => onGo(id)}>
          <Bi ja={goLabel?.[0] ?? 'この駅へ移動'} en={goLabel?.[1] ?? 'Go to this station'} />
        </button>
      )}
    </div>
  );
}

export function MetroMap({ selected, onSelect, here }: { selected: string | null; onSelect: (id: string) => void; here?: string | null }) {
  const { view, viewH, pxPerUnit, fitted, atMin, atMax, svgRef, stageRef, handlers, zoomAt, focus, reset } = usePanZoom();
  // The legend is pinned over the map's corner: shown unless the map area is small, until the visitor chooses.
  const [legendPref, setLegend] = useState<boolean | null>(null);
  const legend = legendPref ?? pxPerUnit * view.w >= 900;
  const lang = useUI((s) => s.lang);
  const [pinned, setPinned] = useState<string | null>(null);
  const [peek, setPeek] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [geo, setGeoState] = useState(() => localStorage.getItem(VIEW_KEY) === 'geo');
  const setGeo = (g: boolean) => {
    setGeoState(g);
    localStorage.setItem(VIEW_KEY, g ? 'geo' : 'diagram');
    reset(); // the two views put stations in different places
  };
  const at = (s: StationDef) => posOf(s, geo);
  const rt = useRoute();
  const route = useRouteResult();
  // Every station a route passes, and the ones where the traveller gets on, off or changes.
  const onRoute = new Set<string>(), routeEnds = new Set<string>();
  for (const leg of route?.legs ?? []) {
    routeEnds.add(leg.from).add(leg.to);
    if (leg.kind === 'ride') leg.line.stops.slice(Math.min(leg.fromStop, leg.toStop), Math.max(leg.fromStop, leg.toStop) + 1).forEach((id) => onRoute.add(id));
    else onRoute.add(leg.from).add(leg.to);
  }
  const choose = (id: string) => (rt.on ? rt.pick(id) : onSelect(id));
  const endMark = (id: string, x: number, y: number) => {
    if (!rt.on || (id !== rt.from && id !== rt.to)) return null;
    const start = id === rt.from;
    return (
      <g pointerEvents="none">
        <circle cx={x} cy={y} r={17} fill={start ? '#14233b' : '#e02020'} stroke="#fff" strokeWidth={3} />
        <text x={x} y={y + 5.5} textAnchor="middle" className="map-end">{start ? '発' : '着'}</text>
      </g>
    );
  };
  const zoom = MAP_W / view.w;
  const detail = pxPerUnit >= DETAIL_PX;
  // 1 until the cap, then shrinking in sheet units so sizes hold still on screen.
  const m = Math.min(1, SIZE_CAP_PX / pxPerUnit);
  // Lines go on thinning on screen past the cap (13 px at the cap, about 7 px at four times that), leaving room round the stations.
  const lm = m * Math.min(1, (SIZE_CAP_PX / pxPerUnit) ** 0.4);
  const ja = lang === 'ja';
  const pair = (a: string, b: string): [string, string] => (ja ? [a, b] : [b, a]);
  // The highlighted line: the one under the pointer, else the one clicked.
  const lit = peek ?? pinned;
  const litLine = lit ? ALL_LINES.find((l) => l.id === lit) : undefined;
  const onLit = (id: string) => (route ? onRoute.has(id) : rt.on && (id === rt.from || id === rt.to) ? true : !litLine || litLine.stops.includes(id));
  const fade = (lineId: string) => (route || (lit && lit !== lineId) ? 0.13 : 1);
  const lineHandlers = (id: string) => ({
    onPointerEnter: () => setPeek(id),
    onPointerLeave: () => setPeek(null),
    onClick: () => setPinned((p) => (p === id ? null : id)),
  });
  const stnHandlers = (id: string) => ({
    onClick: () => choose(id),
    onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && choose(id),
    onPointerEnter: () => setHover(id),
    onPointerLeave: () => setHover(null),
    onFocus: () => setHover(id),
    onBlur: () => setHover(null),
  });
  const results = searchStations(query);
  const goTo = (id: string) => {
    const d = at(stationById(id));
    focus(d.x, d.y, Math.max(zoom, 2.2));
  };
  const pick = (s: StationDef) => {
    choose(s.id);
    goTo(s.id);
    setQuery('');
  };
  const hov = hover ? stationById(hover) : null;
  // Whole-map view: only the main stations are named, in larger type. Zoomed in: everything.
  const isNamed = (id: string) => (route ? routeEnds.has(id) || (detail && onRoute.has(id))
    : detail || isMajor(id) || id === selected || id === here || (!!litLine && litLine.stops.includes(id)));
  // The real city is crowded at its centre, so the geographic view enlarges the names less.
  const nameK = (id: string) => (!detail && isMajor(id) ? (geo ? 1.12 : OVERVIEW_K) : 1);
  const markerR = (id: string) => (id === HUB ? 19 : linesAt(id).length > 1 ? 15 : detail || isNamed(id) ? 11 : 8);
  const routeKey = route ? route.legs.map((l) => `${l.from}>${l.to}`).join() : '';
  const auto = useMemo(() => {
    if (!geo) return null;
    const pt = (s: StationDef) => posOf(s, true);
    const markers = [
      ...STATIONS.map((s) => ({ p: pt(s), r: markerR(s.id) + 3 })),
      ...RAIL_STATIONS.map((s) => ({ p: pt(s), r: 10 })),
    ].map(({ p, r }) => ({ x0: p.x - r * m, y0: p.y - r * m, x1: p.x + r * m, y1: p.y + r * m }));
    const rank = (id: string) => (id === selected || id === here || routeEnds.has(id) ? 0 : id === HUB ? 1 : linesAt(id).length > 1 ? 2 : TERMINI.has(id) ? 3 : 5);
    const reqs: LabelReq[] = [
      ...STATIONS.filter((s) => isNamed(s.id)).map((s) => {
        const k = nameK(s.id), [big, small] = pair(s.nameJa, s.nameRomaji);
        return { id: s.id, ...pt(s), r: markerR(s.id), big, small, size1: (ja ? 19 : 15) * k, size2: (ja ? 11.5 : 12.5) * k,
          badges: detail || s.id === selected ? linesAt(s.id).length : 0, rank: rank(s.id) };
      }),
      ...RAIL_STATIONS.map((s) => {
        const [big, small] = pair(s.nameJa, s.nameRomaji);
        return { id: s.id, ...pt(s), r: 9, big, small, size1: 13, size2: 10.5, badges: 0, rank: s.id === selected || routeEnds.has(s.id) ? 0 : 4 };
      }),
    ];
    return placeLabels(reqs, markers, allGeoLinePts(), m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, m, ja, detail, selected, here, lit, routeKey]);
  // Diagram view: each name keeps the slot set by hand in the data unless it would cover a line, a marker, a
  // badge or another name there (long romaji in English-first mode, mostly); then it moves to the first slot
  // that is clear. `taken` is everything placed, so district names keep clear of it all.
  const diagram = useMemo(() => {
    const taken: Box[] = [], slots = new Map<string, LabelAt>();
    if (geo) return { taken, slots };
    const box = (cx: number, cy: number, x0: number, y0: number, x1: number, y1: number, pad: number): Box =>
      ({ x0: cx + (x0 - pad) * m, y0: cy + (y0 - pad) * m, x1: cx + (x1 + pad) * m, y1: cy + (y1 + pad) * m });
    const span = (anchor: 'start' | 'middle' | 'end', dx: number, w: number): [number, number] => (anchor === 'start' ? [dx, dx + w] : anchor === 'end' ? [dx - w, dx] : [dx - w / 2, dx + w / 2]);
    for (const s of STATIONS) {
      const { x, y } = s.diagram, r = markerR(s.id), inter = linesAt(s.id).length > 1;
      taken.push(box(x, y, -r, -r, r, r, 3));
      if (detail || s.id === selected) linesAt(s.id).forEach((_, i) => {
        const [bx, by] = badgePos(s, i, inter, { x, y });
        taken.push(box(x, y, bx - x, by - y, bx - x + 30, by - y + 30, 2));
      });
    }
    for (const s of RAIL_STATIONS) {
      const { x, y, label } = s.diagram;
      taken.push(box(x, y, -9, -9, 9, 9, 2));
      const w = textW(s.nameJa, 13) + 5 + textW(s.nameRomaji, 10.5);
      const [x0, x1] = span(label === 'right' ? 'start' : label === 'left' ? 'end' : 'middle', label === 'right' ? 13 : label === 'left' ? -13 : 0, w);
      const dy = label === 'right' || label === 'left' ? 4 : label === 'above' ? -13 : 22;
      taken.push(box(x, y, x0, dy - 12, x1, dy + 3, 1));
    }
    const linePts = allDiagramLinePts(), pad = 8 * m;
    // Covering another name, badge or marker is far worse than sitting on a line.
    const cost = (b: Box) => (taken.some((t) => hits(t, b)) ? 10 : 0) + (linePts.some(([px, py]) => px > b.x0 - pad && px < b.x1 + pad && py > b.y0 - pad && py < b.y1 + pad) ? 1 : 0);
    const rank = (id: string) => (id === selected || id === here ? 0 : id === HUB ? 1 : linesAt(id).length > 1 ? 2 : 3);
    for (const s of STATIONS.filter((st) => isNamed(st.id)).sort((a, b) => rank(a.id) - rank(b.id))) {
      const { x, y } = s.diagram, k = nameK(s.id), [big, small] = pair(s.nameJa, s.nameRomaji);
      const size1 = (ja ? 19 : 15) * k, size2 = (ja ? 11.5 : 12.5) * k;
      const w = Math.max(textW(big, size1), textW(small, size2));
      const nameBox = (lp: LabelAt, margin: number) => {
        const [x0, x1] = span(lp.anchor, lp.dx, w);
        return box(x, y, x0, lp.dy - size1 * 0.85, x1, lp.dy + 16 * k + 3, margin);
      };
      const own = labelPos(s, k);
      // The hand-set slot wins ties, then the slots in order.
      const lp = [own, ...SLOTS.map((slot) => labelPos(s, k, slot))].map((c, i) => ({ c, v: cost(nameBox(c, 0)) + i * 0.01 })).sort((a, b) => a.v - b.v)[0].c;
      slots.set(s.id, lp);
      taken.push(nameBox(lp, 3));
    }
    return { taken, slots };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, m, ja, detail, selected, here, lit, routeKey]);
  const hovP = hov && at(hov);
  const hovAt = hovP && { fx: (hovP.x - view.x) / view.w, fy: (hovP.y - view.y) / viewH };
  const keyRows: { key: string; ja: string; en: string }[] = [
    { key: 'train', ja: '走行中の電車', en: 'Trains (live)' },
    { key: 'inter', ja: 'のりかえ駅', en: 'Interchange' },
    { key: 'star', ja: '細部まで再現', en: 'Modelled in full' },
    ...(here ? [{ key: 'here', ja: '現在地', en: 'You are here' }] : []),
  ];
  const legendH = LEGEND_ROWS * 30 + 22 + keyRows.length * 22;
  return (
    <div className="map-frame">
      <div className="map-tools">
        <div className="map-search">
          <input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a station"
            placeholder={ja ? '駅名・駅番号でさがす  Find a station' : 'Find a station or number  駅をさがす'}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && results[0]) pick(results[0]);
              if (e.key === 'Escape') setQuery('');
            }}
          />
          {query.trim() && (
            <ul className="map-results">
              {results.map((s) => {
                const [big, small] = pair(s.nameJa, s.nameRomaji);
                return (
                  <li key={s.id}>
                    <button onClick={() => pick(s)}>
                      {linesAt(s.id).map((l) => <NumberBadge key={l.id} code={s.numbers[l.id]} color={l.color} size={28} />)}
                      <b>{big}</b> <span>{small}</span>
                    </button>
                  </li>
                );
              })}
              {!results.length && <li className="none">見つかりません · No station found</li>}
            </ul>
          )}
        </div>
        <button className={`map-route${rt.on ? ' on' : ''}`} aria-pressed={rt.on} onClick={() => (rt.on ? rt.close() : rt.open(here ?? selected))}>
          <Bi ja="経路" en="Route" />
        </button>
        <div className="map-view" role="group" aria-label="Map view">
          <button className={geo ? '' : 'on'} aria-pressed={!geo} onClick={() => setGeo(false)}><Bi ja="路線図" en="Diagram" /></button>
          <button className={geo ? 'on' : ''} aria-pressed={geo} onClick={() => setGeo(true)}><Bi ja="地図" en="Geographic" /></button>
        </div>
        <div className="map-lines" role="group" aria-label="Highlight a line">
          {ALL_LINES.map((l) => (
            <button key={l.id} className={`map-line${pinned === l.id ? ' on' : ''}`} aria-pressed={pinned === l.id}
              title={`${l.nameJa} ${l.nameEn}`} {...lineHandlers(l.id)}>
              <LineBullet line={l} size={24} />
            </button>
          ))}
        </div>
      </div>
      <div className="map-stage" ref={stageRef}>
        <svg ref={svgRef} className={`map${ja ? '' : ' en-first'}`} viewBox={`${view.x} ${view.y} ${view.w} ${viewH}`}
          role="img" aria-label="Route map" {...handlers}>
          <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="#f7f6f1" rx="10" />
          <Backdrop geo={geo} detail={detail} ja={ja} m={m} taken={auto?.taken ?? diagram.taken} linePts={geo ? allGeoLinePts() : allDiagramLinePts()} />
          {/* Lines in data order, so a line that runs on another's track draws its stripe on top. */}
          {LINES.flatMap((l) => (geo ? geoRuns(l.id) : diagramRuns(l)).map((r, k) => (
            <polyline
              key={`${l.id}${k}`}
              points={r.pts.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none" stroke={l.color} strokeWidth={(r.shared ? 5 : 13) * lm} strokeLinecap="round" strokeLinejoin="round"
              data-shared={r.shared || undefined} opacity={fade(l.id)}
            />
          )))}
          {/* Main-line railways: the black-and-white railway pattern, running off the map at both ends. */}
          {RAIL_LINES.map((l) => {
            const pts = geo ? geoRuns(l.id).flatMap((r) => r.pts) : [...(l.beyond ? [l.beyond.diagram.up] : []), ...diagramPath(l), ...(l.beyond ? [l.beyond.diagram.down] : [])];
            const d = pts.map(([x, y]) => `${x},${y}`).join(' ');
            return (
              <g key={l.id} fill="none" strokeLinejoin="round" opacity={fade(l.id)}>
                <polyline points={d} stroke="#1b1f24" strokeWidth={8 * lm} />
                <polyline points={d} stroke="#fff" strokeWidth={4.5 * lm} strokeDasharray={`${11 * m} ${11 * m}`} />
                {l.beyond && (['up', 'down'] as const).map((dir) => {
                  const [x, y] = geo ? pts[dir === 'up' ? 0 : pts.length - 1] : l.beyond!.diagram[dir];
                  const [big, small] = pair(`${l.beyond![dir].nameJa}方面`, `for ${l.beyond![dir].nameRomaji}`);
                  return (
                    <g key={dir} transform={about(x, y, m)}>
                      <text x={x + 10} y={y + 1} className="map-rail-ja">{big}</text>
                      <text x={x + 10} y={y + 13} className="map-rail-en">{small}</text>
                    </g>
                  );
                })}
              </g>
            );
          })}
          {/* The route found: each ride in its line's colour over a white casing, a walk as dots. */}
          {route?.legs.map((leg, n) => {
            const d = legPoints(leg, geo).map(([x, y]) => `${x},${y}`).join(' ');
            return (
              <g key={n} fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polyline points={d} stroke="#fff" strokeWidth={23 * lm} />
                {leg.kind === 'ride' ? <polyline points={d} stroke={leg.line.color} strokeWidth={15 * lm} />
                  : <polyline points={d} stroke="#14233b" strokeWidth={7 * m} strokeDasharray={`1 ${12 * m}`} />}
              </g>
            );
          })}
          {/* A walk between two stations outside the gates: a white link with a dark edge. */}
          {RAIL_STATIONS.filter((s) => s.transfer).map((s) => {
            const t = at(stationById(s.transfer!)), f = at(s);
            const p = { x1: f.x, y1: f.y, x2: t.x, y2: t.y, strokeLinecap: 'round' as const };
            return (
              <g key={s.id} opacity={lit || route ? 0.3 : 1}>
                <line {...p} stroke="#1b1f24" strokeWidth={10 * m} />
                <line {...p} stroke="#fff" strokeWidth={5 * m} />
              </g>
            );
          })}
          <TrainDots geo={geo} m={m} />
          {RAIL_STATIONS.map((s) => {
            const { label } = s.diagram, { x, y } = at(s);
            const sel = s.id === selected;
            const lp = label === 'right' ? { dx: 13, dy: 4, anchor: 'start' as const } : label === 'left' ? { dx: -13, dy: 4, anchor: 'end' as const }
              : label === 'above' ? { dx: 0, dy: -13, anchor: 'middle' as const } : { dx: 0, dy: 22, anchor: 'middle' as const };
            const [big, small] = pair(s.nameJa, s.nameRomaji);
            const blk = auto?.blocks.get(s.id);
            return (
              <g key={s.id} className={`stn${sel ? ' sel' : ''}`} tabIndex={0} opacity={onLit(s.id) ? 1 : 0.2} transform={about(x, y, m)} {...stnHandlers(s.id)}>
                <circle cx={x} cy={y} r={20} fill="transparent" />
                {sel && <circle cx={x} cy={y} r={14} fill="none" stroke="#e02020" strokeWidth={3} strokeDasharray="5 4" />}
                <rect x={x - 7} y={y - 7} width={14} height={14} rx={3} fill="#fff" stroke="#1b1f24" strokeWidth={3} />
                {!geo && (
                  <text x={x + lp.dx} y={y + lp.dy} textAnchor={lp.anchor}>
                    <tspan className="map-rail-ja">{big}</tspan>
                    <tspan className="map-rail-en" dx={5}>{small}</tspan>
                  </text>
                )}
                {blk && (
                  <>
                    <text x={x + blk.tx} y={y + blk.y1} className="map-rail-ja">{big}</text>
                    <text x={x + blk.tx} y={y + blk.y2} className="map-rail-en">{small}</text>
                  </>
                )}
                {endMark(s.id, x, y)}
              </g>
            );
          })}
          {STATIONS.map((s) => {
            const ls = linesAt(s.id);
            const { x, y } = at(s);
            const sel = s.id === selected, isHere = here === s.id;
            const inter = ls.length > 1, hub = s.id === HUB, major = isMajor(s.id);
            const named = isNamed(s.id), k = nameK(s.id), r = markerR(s.id);
            const lp = diagram.slots.get(s.id) ?? labelPos(s, k);
            // Geographic view: the name and badges go where placeLabels found room, or nowhere.
            const blk = auto?.blocks.get(s.id);
            const [big, small] = pair(s.nameJa, s.nameRomaji);
            return (
              <g key={s.id} className={`stn${sel ? ' sel' : ''}`} tabIndex={0} opacity={onLit(s.id) ? 1 : 0.2} transform={about(x, y, m)}
                style={{ '--k': k } as React.CSSProperties} {...stnHandlers(s.id)}>
                <circle cx={x} cy={y} r={34} fill="transparent" />
                {isHere && <circle cx={x} cy={y} r={r + 12} className="map-here" />}
                {sel && <circle cx={x} cy={y} r={r + 9} fill="none" stroke="#e02020" strokeWidth={3} strokeDasharray="5 4" />}
                <circle cx={x} cy={y} r={r} fill="#fff" stroke={inter ? '#1b1f24' : ls[0].color} strokeWidth={inter ? 5 : 4.5} />
                {hub && <circle cx={x} cy={y} r={11} fill="none" stroke="#1b1f24" strokeWidth={2.5} />}
                {isHere ? <circle cx={x} cy={y} r={5.5} fill="#e02020" />
                  : detail && hasOwnLook(s.id) && <polygon points={STAR} transform={`translate(${x} ${y})`} fill="#14233b" />}
                {(detail || sel) && (!geo || blk) && ls.map((l, i) => {
                  const [bx, by] = blk ? [x + blk.bx + i * (BADGE + BADGE_GAP), y + blk.by + (blk.h - BADGE) / 2] : badgePos(s, i, inter, { x, y });
                  const [letter, num] = s.numbers[l.id].split('-');
                  return (
                    <g key={l.id} transform={`translate(${bx}, ${by})${blk ? ` scale(${BADGE / 30})` : ''}`}>
                      <rect width={30} height={30} rx={6} fill="#fff" stroke={l.color} strokeWidth={3.5} />
                      <text x={15} y={12.5} className="map-badge-l" fill={l.color}>{letter}</text>
                      <text x={15} y={25} className="map-badge-n">{num}</text>
                    </g>
                  );
                })}
                {endMark(s.id, x, y)}
                {named && !geo && (
                  <>
                    <text x={x + lp.dx} y={y + lp.dy} textAnchor={lp.anchor} className="map-ja">{big}</text>
                    <text x={x + lp.dx} y={y + lp.dy + 16 * k} textAnchor={lp.anchor} className="map-en">{small}</text>
                  </>
                )}
                {blk && (
                  <>
                    <text x={x + blk.tx} y={y + blk.y1} className="map-ja">{big}</text>
                    <text x={x + blk.tx} y={y + blk.y2} className="map-en">{small}</text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
        {hov && hovAt && hovAt.fx >= 0 && hovAt.fx <= 1 && hovAt.fy >= 0 && hovAt.fy <= 1 && (
          <div className={`map-hover${hovAt.fy < 0.32 ? ' below' : ''}`}
            style={{ left: `${Math.min(0.84, Math.max(0.16, hovAt.fx)) * 100}%`, top: `${hovAt.fy * 100}%` }}>
            <div className="map-hover-badges">
              {linesAt(hov.id).map((l) => <NumberBadge key={l.id} code={hov.numbers[l.id]} color={l.color} size={32} />)}
            </div>
            <div>
              <small>{hov.nameKana}</small>
              <b>{ja ? hov.nameJa : hov.nameRomaji}</b>
              <span>{ja ? hov.nameRomaji : hov.nameJa}</span>
              <i>{linesAt(hov.id).map((l) => (ja ? l.nameJa : l.nameEn)).join(' · ')}{hasOwnLook(hov.id) ? ' · ★' : ''}</i>
              {placesAt(hov.id).map((n) => <i key={n.ja}>{ja ? n.ja : n.en}</i>)}
            </div>
          </div>
        )}
        {legend && (
          <svg className="map-legend" viewBox={`0 0 250 ${legendH}`} role="group" aria-label="Legend">
          {/* Legend: the line rows highlight their line, like the buttons above the map. */}
          <g>
            <rect width="250" height={legendH} rx="8" fill="#fff" stroke="#d9d6cc" />
            {ALL_LINES.map((l, i) => {
              const rail = RAIL_LINES.includes(l);
              const [big, small] = pair(l.nameJa, l.nameEn);
              return (
                <g key={l.id} transform={`translate(16, ${20 + i * 30})`} className="map-leg-row" opacity={fade(l.id) < 1 ? 0.4 : 1} {...lineHandlers(l.id)}>
                  <rect x={-8} y={-10} width={234} height={30} rx={6} fill={pinned === l.id ? '#f1eee4' : 'transparent'} />
                  {rail ? (
                    <g fill="none">
                      <line x1={-1} y1={6} x2={21} y2={6} stroke="#1b1f24" strokeWidth={8} />
                      <line x1={-1} y1={6} x2={21} y2={6} stroke="#fff" strokeWidth={4.5} strokeDasharray="5.5 5.5" />
                    </g>
                  ) : (
                    <>
                      <circle cx={10} cy={6} r={11} fill={l.color} />
                      <text x={10} y={10.5} textAnchor="middle" className="map-bullet">{l.id}</text>
                    </>
                  )}
                  <text x={30} y={5} className="map-leg-ja">{big}</text>
                  <text x={30} y={18} className="map-leg-en">{small}</text>
                </g>
              );
            })}
            {keyRows.map((row, i) => (
              <g key={row.key} transform={`translate(16, ${24 + LEGEND_ROWS * 30 + i * 22})`}>
                {row.key === 'train' && <rect x={4} y={0} width={12} height={8} rx={2.5} fill="#fff" stroke="#555" strokeWidth={2.5} />}
                {row.key === 'inter' && <circle cx={10} cy={4} r={7} fill="#fff" stroke="#1b1f24" strokeWidth={3} />}
                {row.key === 'star' && <polygon points={STAR} transform="translate(10 4)" fill="#14233b" />}
                {row.key === 'here' && <circle cx={10} cy={4} r={5.5} fill="#e02020" />}
                <text x={30} y={8} className="map-leg-en">{ja ? `${row.ja} ${row.en}` : `${row.en} ${row.ja}`}</text>
              </g>
            ))}
          </g>
          </svg>
        )}
        <div className="map-zoom">
          <button className="btn" onClick={() => zoomAt(1.5)} aria-label="Zoom in" disabled={atMax}>＋</button>
          <button className="btn" onClick={() => zoomAt(1 / 1.5)} aria-label="Zoom out" disabled={atMin}>－</button>
          <button className="btn" onClick={reset} aria-label="Show the whole map" disabled={fitted}><Bi ja="全体" en="All" /></button>
          <button className="btn" onClick={() => setLegend(!legend)} aria-pressed={legend}><Bi ja="凡例" en="Legend" /></button>
          {here && <button className="btn" onClick={() => goTo(here)}><Bi ja="現在地" en="Here" /></button>}
          {rt.on && !route && <span className="map-hint"><Bi ja="地図で駅をえらぶ" en="Pick stations on the map" /></span>}
          {!detail && !rt.on && <span className="map-hint"><Bi ja="拡大すると全駅を表示" en="Zoom in for every station" /></span>}
        </div>
      </div>
    </div>
  );
}
