// Route guidance on the in-game screen: the destination picker, the journey strip with the next
// thing to do, the banner when the step changes, the marker in the view and the trip summary.
// Every step and time comes from sim/guide.ts, worked out from where the player really is.

import { useEffect, useRef, useState } from 'react';
import { Vector3 } from 'three';
import { LINES, alongPolyline, destinationOf, diagramRuns, diagramSegment, isUnbuilt, lineById, linesAt, stationById } from '../data/network';
import type { LineDef, StationDef } from '../data/types';
import { player, where } from '../player/player';
import { clock, formatClock } from '../sim';
import { nextStep, type Step } from '../sim/guide';
import type { Leg } from '../sim/route';
import { toWorld } from '../world/collision';
import type { V3 } from '../world/builder';
import { Bi } from './Bi';
import { targets } from './Compass';
import { Two } from './Hud';
import { HUB, LineBullet, NumberBadge, searchStations, TERMINI } from './MetroMap';
import { dom, useUI } from './store';

let memo: { key: string; step: Step | null } | null = null;

/** The current step towards the guided station, or null when guidance is off or there is no route. Worked out once a second. */
export function guideStep(): Step | null {
  const to = useUI.getState().guideTo;
  if (!to) return null;
  const train = where.train, at = where.station?.def.id ?? player.lastStation;
  const key = `${to}|${Math.floor(clock.time)}|${train ? `${train.id}:${train.state.phaseIndex}` : at}`;
  if (memo?.key !== key) {
    memo = { key, step: nextStep(to, clock.time, train ? { tt: train.sim.tt, phase: train.state.phase, tau: train.state.tau } : { station: at }) };
  }
  return memo.step;
}

export const platformOf = (leg: Extract<Leg, { kind: 'ride' }>) => stationById(leg.from).platforms[leg.line.id][leg.dir === 'down' ? 0 : 1];

/** What the player has really done since guidance began, for the summary on arriving. */
const trip = { to: null as string | null, t0: 0, from: '', lines: [] as string[] };
/** Called on every HUD tick: notes when guidance starts and each train boarded. */
export function trackGuide() {
  const to = useUI.getState().guideTo;
  if (to !== trip.to) Object.assign(trip, { to, t0: clock.time, from: where.station?.def.id ?? player.lastStation, lines: [] });
  const line = to && where.train ? where.train.sim.geom.def.id : null;
  if (line && trip.lines[trip.lines.length - 1] !== line) trip.lines.push(line);
}

const mmss = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

/** A countdown to `at`: minutes and seconds over a bar that runs down through the last five minutes, red in the last one. */
function Countdown({ at, label }: { at: number; label: [string, string] }) {
  const left = at - clock.time;
  return (
    <div className={`gj-count${left <= 60 ? ' soon' : ''}`}>
      <span><Bi ja={label[0]} en={label[1]} /></span>
      <b>{mmss(left)}</b>
      <i><u style={{ width: `${Math.max(0, Math.min(1, left / 300)) * 100}%` }} /></i>
    </div>
  );
}

/** One later stop of the journey: where a ride or a walk ends, and when. */
function Stop({ by, s, arr, last }: { by: LineDef | 'walk'; s: StationDef; arr: number; last: boolean }) {
  return (
    <div className={`gj-stop${last ? ' dest' : ''}`}>
      <i className="node" style={by === 'walk' ? undefined : { borderColor: by.color }} />
      {by === 'walk' ? <b className="walk">徒歩</b> : <LineBullet line={by} size={18} />}
      <div><Two ja={s.nameJa} en={s.nameRomaji} /></div>
      <small>{last ? '到着 arr. ' : ''}{formatClock(arr)}</small>
    </div>
  );
}

/** The journey strip: the step to do now, large, and the rest of the trip below it. */
export function GuideCard() {
  const to = useUI((s) => s.guideTo), setGuide = useUI((s) => s.setGuide), setMap = useUI((s) => s.setMap);
  const view = useUI((s) => s.guideView), setView = useUI((s) => s.setGuideView);
  const step = guideStep();
  const arrived = step?.kind === 'arrived';
  // Having arrived, the summary stays up for a while and then guidance ends by itself.
  useEffect(() => {
    if (!arrived) return;
    const id = setTimeout(() => setGuide(null), 12000);
    return () => clearTimeout(id);
  }, [arrived, setGuide]);
  if (!to) {
    return (
      <button className="hud-sign gj-prompt" onClick={() => setMap(true, true)}>
        <kbd>N</kbd>
        <span><Two ja="行き先をえらんで案内" en="Choose a destination to be guided" /></span>
      </button>
    );
  }
  const dest = stationById(to);
  let now, later: { by: LineDef | 'walk'; s: StationDef; arr: number }[] = [];
  const stops = (legs: Leg[]) => legs.map((l) => ({ by: l.kind === 'ride' ? l.line : ('walk' as const), s: stationById(l.to), arr: l.arr }));
  if (!step) now = <div className="gj-now"><div className="gj-do"><Two ja="経路が見つかりません" en="No route found" /></div></div>;
  else if (step.kind === 'off') now = <div className="gj-now"><div className="gj-do"><Two ja="この電車は回送です。駅でお降りください" en="This train is not in service. Get off at a station" /></div></div>;
  else if (step.kind === 'arrived') {
    const lines = trip.lines.map(lineById), took = Math.max(0, clock.time - trip.t0), from = stationById(trip.from);
    now = (
      <div className="gj-now arrived">
        <div className="gj-do"><small>到着しました You have arrived</small><Two ja={dest.nameJa} en={dest.nameRomaji} /></div>
        {lines.length > 0 && (
          <div className="gj-sum">
            <div><i>かかった時間 Time taken</i><b>{Math.round(took / 60)}<small>分 min</small></b></div>
            <div><i>のりかえ Changes</i><b>{lines.length - 1}<small>回</small></b></div>
            <div><i>{from.nameJa} から From {from.nameRomaji}</i><span>{lines.map((l, n) => <LineBullet key={n} line={l} size={22} />)}</span></div>
          </div>
        )}
      </div>
    );
  } else if (step.kind === 'walk') {
    const s = stationById(step.leg.to);
    now = (
      <div className="gj-now">
        <div className="gj-row">
          <span className="plat walk">徒歩</span>
          <div className="gj-do"><small>改札を出て歩く Walk outside the gates to</small><Two ja={`${s.nameJa}駅`} en={`${s.nameRomaji} Station`} /></div>
        </div>
      </div>
    );
    later = stops(step.rest);
  } else if (step.kind === 'board') {
    const { leg } = step, d = destinationOf(leg.line, leg.dir), plat = platformOf(leg);
    now = (
      <div className="gj-now" style={{ '--c': leg.line.color } as React.CSSProperties}>
        <div className="gj-row">
          <span className="plat">{plat}</span>
          <LineBullet line={leg.line} size={30} />
          <div className="gj-do"><small>{plat}番線からのる Board at platform {plat}</small><Two ja={`${leg.line.nameJa} ${d.nameJa} 方面`} en={`${leg.line.nameEn} for ${d.nameRomaji}`} /></div>
          <b className="gj-time">{formatClock(leg.dep)}</b>
        </div>
        <Countdown at={leg.dep} label={['発車まで', 'Leaves in']} />
      </div>
    );
    later = stops([leg, ...step.rest]);
  } else {
    const off = stationById(step.alight), line = where.train?.sim.geom.def;
    now = (
      <div className="gj-now" style={{ '--c': line?.color } as React.CSSProperties}>
        <div className="gj-row">
          {line && <LineBullet line={line} size={30} />}
          <div className="gj-do">
            <small>{step.here ? 'この駅でおりる Get off here' : step.stops === 1 ? 'つぎでおりる Get off at the next stop' : `${step.stops}駅先でおりる Get off in ${step.stops} stops`}</small>
            <Two ja={off.nameJa} en={off.nameRomaji} />
          </div>
          {!step.here && <b className="gj-time">{formatClock(step.at)}</b>}
        </div>
        {!step.here && <Countdown at={step.at} label={['到着まで', 'Arrives in']} />}
      </div>
    );
    later = stops(step.rest);
  }
  const arr = step && 'arr' in step ? step.arr : null;
  const done = arr && arr > trip.t0 ? Math.max(0, Math.min(1, (clock.time - trip.t0) / (arr - trip.t0))) : arrived ? 1 : 0;
  return (
    <div className="hud-sign gj">
      <div className="gj-head">
        <span className="to"><i>案内 Guide</i> <b>{dest.nameJa}</b> {dest.nameRomaji}</span>
        <span>{arr && <>{formatClock(arr)} <Bi ja="着" en="arr." /></>}</span>
        <button onClick={() => setGuide(null)} title="案内を終了 End guidance"><kbd>X</kbd> <Bi ja="終了" en="End" /></button>
      </div>
      <div className="gj-progress"><u style={{ width: `${done * 100}%` }} /></div>
      {now}
      {step && step.kind !== 'arrived' && step.kind !== 'off' && (
        <div className="gj-views">
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><Bi ja="一覧" en="List" /></button>
          <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}><Bi ja="地図" en="Map" /></button>
          <kbd>V</kbd>
        </div>
      )}
      {view === 'map' && step ? <TripMap step={step} /> : later.length > 0 && <div className="gj-later">{later.map((x, n) => <Stop key={n} {...x} last={n === later.length - 1} />)}</div>}
    </div>
  );
}

let ac: AudioContext | null = null;
/** Two soft notes when the step changes. Follows the effects volume and the mute setting. */
function chime() {
  const { muted, masterVolume, sfxVolume } = useUI.getState();
  if (muted || masterVolume * sfxVolume <= 0) return;
  try {
    ac ??= new AudioContext();
    const ctx = ac;
    [880, 1174.66].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.16;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(masterVolume * sfxVolume * 0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.55);
    });
  } catch {
    /* no audio */
  }
}

/** What the step is, leaving out the times that change as trains come and go. */
function signature(s: Step | null): string {
  if (!s) return '';
  if (s.kind === 'board') return `b:${s.leg.line.id}:${s.leg.dir}:${s.leg.from}`;
  if (s.kind === 'ride') return `r:${s.alight}`;
  if (s.kind === 'walk') return `w:${s.leg.to}`;
  return s.kind;
}

const BANNER_MS = 4500;

/** A large, brief banner (with a chime) whenever the thing to do changes. */
export function StepBanner({ show }: { show: boolean }) {
  const step = guideStep(), sig = signature(step);
  const last = useRef(''), [banner, setBanner] = useState<{ sig: string; step: Step; until: number } | null>(null);
  useEffect(() => {
    if (sig === last.current) return;
    last.current = sig;
    if (!step || step.kind === 'off') return;
    setBanner({ sig, step, until: performance.now() + BANNER_MS });
    chime();
  });
  if (!show || !banner || performance.now() > banner.until) return null;
  const s = banner.step;
  let tag: [string, string], big: [string, string], sub: [string, string], line: LineDef | null = null;
  if (s.kind === 'board') {
    const d = destinationOf(s.leg.line, s.leg.dir), plat = platformOf(s.leg);
    line = s.leg.line;
    tag = ['のりば', 'Platform'];
    big = [`${plat}番線へ`, `Go to platform ${plat}`];
    sub = [`${line.nameJa} ${d.nameJa} 方面`, `${line.nameEn} for ${d.nameRomaji}`];
  } else if (s.kind === 'ride') {
    const off = stationById(s.alight);
    line = where.train?.sim.geom.def ?? null;
    tag = ['乗車中', 'On board'];
    big = [`${off.nameJa} でおりる`, `Get off at ${off.nameRomaji}`];
    sub = [s.here ? 'この駅です' : `${s.stops}駅 · ${formatClock(s.at)} 着`, s.here ? 'This is your stop' : `${s.stops} ${s.stops === 1 ? 'stop' : 'stops'} · arrives ${formatClock(s.at)}`];
  } else if (s.kind === 'walk') {
    const o = stationById(s.leg.to);
    tag = ['徒歩', 'Walk'];
    big = [`${o.nameJa}駅へ`, `Walk to ${o.nameRomaji} Station`];
    sub = ['改札を出て歩きます', 'Outside the gates'];
  } else {
    const d = stationById(useUI.getState().guideTo ?? player.lastStation);
    tag = ['到着', 'Arrived'];
    big = ['到着しました', 'You have arrived'];
    sub = [d.nameJa, d.nameRomaji];
  }
  return (
    <div className="gj-banner" key={banner.sig}>
      <span className="tag"><Two ja={tag[0]} en={tag[1]} /></span>
      {line && <LineBullet line={line} size={34} />}
      <div><Two ja={big[0]} en={big[1]} /><small><Bi ja={sub[0]} en={sub[1]} /></small></div>
    </div>
  );
}

/**
 * A marker in the view over the thing to head for (the guided platform, a walk's next station, or
 * the exit or platform picked on the floor plan), with its distance. It points straight at it,
 * through walls and floors; it is not a path.
 */
export function GuideMarker() {
  const ref = useRef<HTMLDivElement>(null), dist = useRef<HTMLElement>(null);
  const [goal, setGoal] = useState<{ label: string; color?: string; kind: string } | null>(null);
  useEffect(() => {
    let id = 0, n = 0, at: V3 | null = null, key = '';
    const v = new Vector3(), w: V3 = [0, 0, 0];
    const loop = () => {
      id = requestAnimationFrame(loop);
      const el = ref.current, cam = dom.camera, canvas = dom.canvas;
      if (!el) return;
      // The target is looked up a few times a second; its place on screen every frame.
      if (n++ % 12 === 0) {
        const st = where.station, t = st ? targets().find((x) => x.goal) : undefined;
        at = st && t ? [...toWorld(st.frame, [t.local[0], t.local[1] + 2.3, t.local[2]], w)] as V3 : null;
        const k = t ? `${st!.def.id}:${t.key}` : '';
        if (k !== key) {
          key = k;
          setGoal(t ? { label: t.label, color: t.color, kind: t.kind } : null);
        }
      }
      if (!at || !cam || !canvas) return void (el.style.display = 'none');
      v.set(at[0], at[1], at[2]).project(cam);
      if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) return void (el.style.display = 'none');
      el.style.display = '';
      el.style.transform = `translate(${((v.x + 1) / 2) * canvas.clientWidth}px, ${((1 - v.y) / 2) * canvas.clientHeight}px)`;
      const p = player.body.pos, d = Math.hypot(at[0] - p[0], at[2] - p[2]);
      el.classList.toggle('near', d < 6);
      if (dist.current) dist.current.textContent = `${Math.round(d)}m`;
    };
    loop();
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className="gj-marker" ref={ref} style={{ display: 'none' }}>
      {goal && <div className={goal.kind}><b style={{ background: goal.color }}>{goal.label}</b><small ref={dist} /><i /></div>}
    </div>
  );
}

/** The diagram points of a ride between two stops of a line. */
function ridePts(line: LineDef, a: number, b: number): [number, number][] {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return Array.from({ length: hi - lo }, (_, k) => diagramSegment(line, lo + k)).flat();
}
const at = (id: string): [number, number] => [stationById(id).diagram.x, stationById(id).diagram.y];

/** Where the player is on the route diagram: at their station, or along the line between two stops when riding. */
function youAt(): [number, number] {
  const train = where.train;
  if (!train) return at(where.station?.def.id ?? player.lastStation);
  const line = train.sim.geom.def, p = train.state.phase;
  if (p.kind === 'dwell') return p.stop >= 0 ? at(line.stops[p.stop]) : at(player.lastStation);
  const from = p.toStop + (p.dir === 'down' ? -1 : 1);
  if (p.toStop < 0 || from < 0 || from >= line.stops.length) return at(line.stops[Math.max(0, p.toStop)]);
  const f = Math.max(0, Math.min(1, (train.state.tau - p.t0) / (p.t1 - p.t0)));
  const q = alongPolyline(diagramSegment(line, Math.min(from, p.toStop)), p.dir === 'down' ? f : 1 - f);
  return [q.x, q.y];
}

const VW = 370, VH = 200;

/** The trip drawn on the network diagram: the lines to ride in colour, the rest faint, and a dot for the player. */
function TripMap({ step }: { step: Step }) {
  const legs: { line: LineDef | null; pts: [number, number][] }[] = [];
  const names = new Map<string, 'on' | 'change' | 'dest'>();
  const add = (l: Leg) => {
    legs.push(l.kind === 'ride' ? { line: l.line, pts: ridePts(l.line, l.fromStop, l.toStop) } : { line: null, pts: [at(l.from), at(l.to)] });
    names.set(l.to, 'change');
  };
  if (step.kind === 'board' || step.kind === 'walk') {
    names.set(step.leg.from, 'on');
    [step.leg, ...step.rest].forEach(add);
  } else if (step.kind === 'ride') {
    const train = where.train;
    if (train) {
      const line = train.sim.geom.def, p = train.state.phase;
      const cur = p.kind === 'dwell' ? p.stop : p.toStop + (p.dir === 'down' ? -1 : 1);
      if (cur >= 0 && cur < line.stops.length && cur !== step.alightStop) legs.push({ line, pts: ridePts(line, cur, step.alightStop) });
    }
    names.set(step.alight, 'change');
    step.rest.forEach(add);
  } else return null;
  const to = useUI.getState().guideTo;
  if (to) names.set(to, 'dest');
  const you = youAt();
  const all = [...legs.flatMap((l) => l.pts), you, ...[...names.keys()].map(at)];
  let x0 = Math.min(...all.map((q) => q[0])) - 70, x1 = Math.max(...all.map((q) => q[0])) + 70;
  let y0 = Math.min(...all.map((q) => q[1])) - 55, y1 = Math.max(...all.map((q) => q[1])) + 55;
  // Fill the card's shape: widen whichever way is short.
  const w = Math.max(x1 - x0, ((y1 - y0) * VW) / VH), h = (w * VH) / VW;
  x0 = (x0 + x1 - w) / 2;
  y0 = (y0 + y1 - h) / 2;
  const u = w / VW; // sheet units per screen pixel
  const d = (pts: [number, number][]) => pts.map((q) => q.join(',')).join(' ');
  return (
    <svg className="gj-map" viewBox={`${x0} ${y0} ${w} ${h}`}>
      {LINES.flatMap((l) => diagramRuns(l).map((r, i) => <polyline key={l.id + i} points={d(r.pts)} fill="none" stroke={l.color} strokeOpacity={0.3} strokeWidth={3 * u} strokeLinejoin="round" />))}
      {legs.map((l, i) => (
        <g key={i} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline points={d(l.pts)} stroke="#fff" strokeWidth={9 * u} />
          {l.line ? <polyline points={d(l.pts)} stroke={l.line.color} strokeWidth={6 * u} /> : <polyline points={d(l.pts)} stroke="#16191d" strokeWidth={4 * u} strokeDasharray={`${0.1 * u} ${7 * u}`} />}
        </g>
      ))}
      {[...names].map(([id, kind]) => {
        const [x, y] = at(id), s = stationById(id);
        return (
          <g key={id}>
            <circle cx={x} cy={y} r={(kind === 'dest' ? 6.5 : 5) * u} fill={kind === 'dest' ? '#f5c400' : '#fff'} stroke="#16191d" strokeWidth={2 * u} />
            <text x={x} y={y - 9 * u} fontSize={(kind === 'dest' ? 13 : 11.5) * u} strokeWidth={3 * u} className={kind}>{s.nameJa}</text>
          </g>
        );
      })}
      <g transform={`translate(${you[0]} ${you[1]}) scale(${u})`} className="you">
        <circle r={9} />
        <circle r={4.5} />
      </g>
    </svg>
  );
}

/** The search box and list of the destination picker: type a name or a station number, Enter. */
export function DestinationSearch({ onPick }: { onPick: (id: string) => void }) {
  const lang = useUI((s) => s.lang);
  const [q, setQ] = useState(''), [sel, setSel] = useState(0);
  const here = where.station?.def.id ?? player.lastStation;
  const list = (q.trim() ? searchStations(q) : [HUB, ...TERMINI].map(stationById)).filter((s) => !isUnbuilt(s.id) && s.id !== here).slice(0, 8);
  const i = Math.min(sel, list.length - 1);
  return (
    <>
      <input
        autoFocus value={q} placeholder={lang === 'ja' ? '駅名・駅番号 (例: odori, Y13)' : 'Station name or number (e.g. odori, Y13)'} aria-label="Destination"
        onChange={(e) => (setQ(e.target.value), setSel(0))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') (e.preventDefault(), setSel(Math.min(list.length - 1, i + 1)));
          else if (e.key === 'ArrowUp') (e.preventDefault(), setSel(Math.max(0, i - 1)));
          else if (e.key === 'Enter' && list[i]) onPick(list[i].id);
        }}
      />
      <div className="gj-picks">
        {!q.trim() && <small><Bi ja="主な駅" en="Main stations" /></small>}
        {list.map((s, n) => (
          <button key={s.id} className={n === i ? 'on' : ''} onMouseEnter={() => setSel(n)} onClick={() => onPick(s.id)}>
            <span className="badges">{linesAt(s.id).map((l) => <NumberBadge key={l.id} code={s.numbers[l.id]} color={l.color} size={28} />)}</span>
            <span className="name"><Two ja={s.nameJa} en={s.nameRomaji} /></span>
          </button>
        ))}
        {q.trim() && !list.length && <small><Bi ja="見つかりません" en="No station found" /></small>}
      </div>
    </>
  );
}

/** The destination picker over the game: the search alone, without the map. */
export function DestinationPicker() {
  const setPicker = useUI((s) => s.setPicker);
  return (
    <div className="gj-picker-scrim" onMouseDown={(e) => e.target === e.currentTarget && setPicker(false)}>
      <div className="gj-picker" role="dialog" aria-label="Choose a destination">
        <div className="gj-head"><span className="to"><i>案内 Guide</i> <b><Bi ja="行き先をえらぶ" en="Choose a destination" /></b></span></div>
        <DestinationSearch onPick={(id) => useUI.getState().setPreview(id)} />
        <p><kbd>↑</kbd><kbd>↓</kbd> <Bi ja="えらぶ" en="choose" /> · <kbd>Enter</kbd> <Bi ja="案内開始" en="start" /> · <kbd>Esc</kbd> <Bi ja="とじる" en="close" /></p>
      </div>
    </div>
  );
}
