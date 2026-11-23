// The in-game screen, in the look of the station signs: a station name sign, the clock with its
// speed, a departures board, notices, and the route map and pause screens over them.
// Everything shown is read from the network data, the timetable and the built stations.

import { useEffect, useState, type ReactNode } from 'react';
import { RAIL_STATIONS, destinationOf, isUnbuilt, lineById, linesAt, stationById, terminusOf } from '../data/network';
import type { Dir, LineDef } from '../data/types';
import { player, where } from '../player/player';
import { clock, formatClock, lineDepartures, lineSim } from '../sim';
import { temperatureNow } from '../sim/climate';
import { WEATHER_NAME, typhoonNotice, weatherIcon } from '../signs/weather-icon';
import { trainCalls } from '../sim/guide';
import { nextDepartures } from '../sim/timetable';
import { Bi } from './Bi';
import { MiniMap } from './Compass';
import { DestinationPicker, GuideCard, GuideMarker, guideStep, StepBanner, trackGuide } from './Guide';
import { WeatherIcon } from './MainMenu';
import { LineBullet, MetroMap, NumberBadge, StationPanel, useRoute, useTick } from './MetroMap';
import { Notices } from './Notices';
import { PauseMenu } from './PauseMenu';
import { capturePointer, useUI, type Speed } from './store';
import { Wheel } from './Wheel';

/** Two lines, the large one in the language chosen in Settings. */
export function Two({ ja, en }: { ja: ReactNode; en: ReactNode }) {
  const lang = useUI((s) => s.lang);
  return lang === 'ja' ? <><b>{ja}</b><span>{en}</span></> : <><b>{en}</b><span>{ja}</span></>;
}

/** The line whose platform the player is standing on, if any. */
const platformLine = (): LineDef | null => (where.zone?.kind === 'platform' && where.zone.line ? lineById(where.zone.line) : null);

const SPEEDS: [Speed, string, string, string, string][] = [
  [0, '■', 'T', '時間を止める', 'Stop the clock'],
  [1, '▶', '', '通常', 'Real time'],
  [6, '▶▶', 'F', '早送り ×6', 'Fast-forward ×6'],
];

function Clock() {
  const speed = useUI((s) => s.speed), setSpeed = useUI((s) => s.setSpeed);
  const weatherNow = useUI((s) => s.weatherNow);
  return (
    <div className="hud-sign hud-clock">
      <b>{formatClock(clock.time, true)}</b>
      <div className="hud-weather" title={`${WEATHER_NAME[weatherNow][0]} ${WEATHER_NAME[weatherNow][1]} · 外気温 Outdoor temperature`}>
        <WeatherIcon d={weatherIcon(weatherNow, clock.time)} size={18} />
        <span>{temperatureNow(clock.time)}°C</span>
        <small><Two ja={WEATHER_NAME[weatherNow][0]} en={WEATHER_NAME[weatherNow][1]} /></small>
      </div>
      {typhoonNotice(clock.time).length > 0 && <div className="hud-alert" title={typhoonNotice(clock.time).join(' ')}><Two ja="台風注意" en="Typhoon caution" /></div>}
      <div className="hud-speeds">
        {SPEEDS.map(([v, icon, key, ja, en]) => (
          <button key={v} className={speed === v ? 'on' : ''} aria-pressed={speed === v} title={`${ja} ${en}${key ? ` (${key})` : ''}`} onClick={() => setSpeed(v)}>
            {icon}{key && <i>{key}</i>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The station name sign: numbers, name, and on a platform the stations either side, as on a platform name board. */
function StationSign() {
  const st = where.station, zone = where.zone;
  if (!st) return <div className="hud-sign hud-name"><div className="hud-name-main"><div className="hud-name-text"><Two ja="駅間" en="Between stations" /></div></div></div>;
  const lines = linesAt(st.def.id), line = platformLine();
  const i = line ? line.stops.indexOf(st.def.id) : -1;
  const prev = line && i > 0 ? stationById(line.stops[i - 1]) : null;
  const next = line && i >= 0 && i < line.stops.length - 1 ? stationById(line.stops[i + 1]) : null;
  // A white platform name board: kana over the name, the line's band along the foot with the stations either side.
  return (
    <button className="hud-nameboard" title="路線図 Route map (M)" onClick={() => useUI.getState().setMap(true)}>
      <div className="nb-main">
        <div className="nb-badges">{lines.map((l) => <NumberBadge key={l.id} code={st.def.numbers[l.id]} color={l.color} size={lines.length > 2 ? 30 : 38} />)}</div>
        <div className="nb-name">
          <small>{st.def.nameKana}</small>
          <Two ja={st.def.nameJa} en={st.def.nameRomaji} />
        </div>
        {zone && <div className="nb-zone"><Two ja={zone.ja} en={zone.en} /></div>}
      </div>
      {line ? (
        <div className="nb-band" style={{ background: line.color }}>
          <span>{prev && <>◀ <Two ja={prev.nameJa} en={prev.nameRomaji} /></>}</span>
          <i>{line.nameJa} {line.nameEn}</i>
          <span>{next && <><Two ja={next.nameJa} en={next.nameRomaji} /> ▶</>}</span>
        </div>
      ) : (
        <div className="nb-stripes">{lines.map((l) => <span key={l.id} style={{ background: l.color }} />)}</div>
      )}
    </button>
  );
}

/** On board: the line, where the train is going, the next stop and the speed. */
function TrainSign() {
  const train = where.train!;
  const line = train.sim.geom.def, p = train.state.phase;
  const inService = p.kind === 'run' ? p.inService : p.role !== 'reverse' && p.role !== 'arrival';
  const dest = terminusOf(line, p.dir);
  const stopIdx = p.kind === 'run' ? p.toStop : p.stop;
  const stop = stopIdx >= 0 ? stationById(line.stops[stopIdx]) : null;
  // The stops this train still calls at, with its own arrival times, as on the display over the car doors.
  const calls = trainCalls(train.tt, p, train.state.tau, clock.time);
  const step = guideStep(), alight = step?.kind === 'ride' ? step.alightStop : -1;
  const shown = calls.slice(0, 6);
  return (
    <div className="hud-sign hud-name">
      <div className="hud-name-main">
        <LineBullet line={line} size={36} />
        <div className="hud-name-text">
          <Two ja={`${line.nameJa} ${inService ? `${dest.nameJa} ゆき` : '回送'}`} en={`${line.nameEn} ${inService ? `for ${dest.nameRomaji}` : '· not in service'}`} />
        </div>
        <div className="hud-zone">
          <small>{stop ? (p.kind === 'dwell' ? 'ただいま Now at' : 'つぎは Next') : '引上線 Siding'}</small>
          {stop ? <Two ja={stop.nameJa} en={stop.nameRomaji} /> : <Two ja="折り返し中" en="Turning back" />}
        </div>
        <div className="hud-speed">{Math.round(train.state.speed * 3.6)}<small>km/h</small></div>
      </div>
      <div className="hud-name-stripes"><span style={{ background: line.color }} /></div>
      {shown.length > 0 && (
        <div className="hud-strip" style={{ '--c': line.color } as React.CSSProperties}>
          {shown.map((c, n) => {
            const s = stationById(line.stops[c.stop]), at = n === 0 && p.kind === 'dwell';
            return (
              <div key={c.stop} className={`hud-stop${n === 0 ? ' next' : ''}${c.stop === alight ? ' alight' : ''}`}>
                <i className="dot" />
                <small>{at ? '停車中' : formatClock(c.arr)}</small>
                <Two ja={s.nameJa} en={s.nameRomaji} />
                <div className="x">{linesAt(s.id).filter((l) => l !== line).map((l) => <LineBullet key={l.id} line={l} size={15} />)}</div>
                {c.stop === alight && <em>おりる Get off</em>}
              </div>
            );
          })}
          {calls.length > shown.length && <div className="hud-stop more"><i className="dot" /><small>+{calls.length - shown.length}</small></div>}
        </div>
      )}
    </div>
  );
}

/** Departures from this station: every line from the concourse, the one line from its own platform, or the guided line while being guided to a train. */
function Board() {
  const st = where.station;
  if (!st || where.train) return null;
  const step = guideStep(), mine = step?.kind === 'board' ? step.leg : null;
  const own = platformLine();
  // Away from the platforms the guide card already says which train, where and when.
  if (mine && !own) return null;
  const rows: { key: string; line: LineDef; dir: Dir; platform: number; deps: { arr: number; dep: number }[]; type?: string }[] = [];
  // On a main-line station's platform inside this station's plot (Kawaminato in Kita-Ōdōri's): that line's trains, every service type.
  const railLine = where.zone?.line ? lineById(where.zone.line) : null;
  const rail = railLine?.type === 'jr' ? RAIL_STATIONS.find((r) => r.transfer === st.def.id && r.numbers[railLine.id]) : undefined;
  if (rail && railLine) {
    const stop = railLine.stops.indexOf(rail.id);
    for (const dir of ['down', 'up'] as Dir[]) {
      const deps = lineDepartures(lineSim(railLine.id), stop, dir, clock.time, 2);
      if (deps.length > 1) rows.push({ key: railLine.id + dir, line: railLine, dir, platform: rail.platforms[railLine.id][dir === 'down' ? 0 : 1], deps, type: deps[0].service && `${deps[0].service.nameJa} ${deps[0].service.nameEn}` });
    }
  } else
  for (const line of own ? [own] : mine ? [mine.line] : linesAt(st.def.id)) {
    const { tt } = lineSim(line.id);
    const stop = line.stops.indexOf(st.def.id);
    for (const dir of ['down', 'up'] as Dir[]) {
      const deps = nextDepartures(tt, stop, dir, clock.time, 2);
      if (deps.length) rows.push({ key: line.id + dir, line, dir, platform: st.def.platforms[line.id][dir === 'down' ? 0 : 1], deps });
    }
  }
  if (!rows.length) return null;
  return (
    <div className="hud-sign hud-board">
      <div className="hud-board-title">
        <Bi ja="発車案内" en="Departures" />
        <span><Bi ja="のりば" en="Plat." /></span>
      </div>
      {rows.map((r) => {
        const t = destinationOf(r.line, r.dir), goal = r.line.beyond ? null : terminusOf(r.line, r.dir).id;
        const first = r.deps[0];
        const at = clock.time >= first.arr;
        const mins = Math.max(0, Math.ceil((first.dep - clock.time) / 60));
        return (
          <div className={`hud-row${mine && mine.line === r.line && mine.dir === r.dir ? ' mine' : ''}`} key={r.key} role="button" title={goal ? `${t.nameJa} まで案内 Guide me to ${t.nameRomaji}` : undefined} onClick={() => goal && useUI.getState().setPreview(goal)}>
            <LineBullet line={r.line} size={22} />
            <div className="dest"><Two ja={`${t.nameJa} ゆき`} en={r.type ? `${r.type} · for ${t.nameRomaji}` : `for ${t.nameRomaji}`} /></div>
            <div className="time">
              <b className={at ? 'now' : ''}>{formatClock(first.dep)}</b>
              <span>{at ? '停車中 boarding' : `${mins}分 min`}</span>
            </div>
            <div className="time later"><b>{formatClock(r.deps[1].dep)}</b></div>
            <span className="plat">{r.platform}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Frames drawn in the last half second, as a rate. Counted from the browser's own frame callback. */
function Fps() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let id = 0, n = 0, t0 = performance.now();
    const loop = (t: number) => {
      id = requestAnimationFrame(loop);
      n++;
      if (t - t0 >= 500) {
        setFps(Math.round((n * 1000) / (t - t0)));
        n = 0;
        t0 = t;
      }
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  return <div className="hud-fps"><b>{fps}</b> FPS</div>;
}

/** The station a trip from here starts at: the one the player is in, or their train's next stop. */
function hereId(): string {
  const t = where.train;
  if (!where.station && t) {
    const p = t.state.phase, stops = t.sim.geom.def.stops, i = p.kind === 'dwell' ? p.stop : p.toStop;
    if (i >= 0 && i < stops.length) return stops[i];
  }
  return where.station?.def.id ?? player.lastStation;
}

const KEYS = [['WASD', '移動', 'Move'], ['Shift', '走る', 'Run'], ['Z', 'クイックメニュー', 'Quick menu'], ['N', '案内', 'Guide me'], ['M', '路線図', 'Map'], ['Tab', 'マウス', 'Free mouse'], ['Esc', '一時停止', 'Pause']] as const;

export function Hud() {
  useTick(250);
  trackGuide();
  const pickerOpen = useUI((s) => s.pickerOpen), mapPick = useUI((s) => s.mapPick), fpsOn = useUI((s) => s.fpsOn), wheelOpen = useUI((s) => s.wheelOpen);
  const { mapOpen, settingsOpen, paused, hudHidden, locked, freeMouse, lang, setMap, setSettings, setPaused, setFreeMouse, goTo, setGuide } = useUI();
  const guide = (id: string) => {
    setGuide(id);
    setMap(false);
    capturePointer();
  };
  const preview = useUI((s) => s.preview), setPreview = useUI((s) => s.setPreview);
  // A destination picked anywhere shows its route on the map first; guidance starts on Confirm.
  useEffect(() => {
    if (mapOpen && preview) useRoute.getState().open(hereId(), preview);
    else if (!mapOpen) useRoute.getState().close();
  }, [mapOpen, preview]);
  const routeOn = useRoute((r) => r.on);
  useEffect(() => {
    if (!routeOn && preview) setPreview(null);
  }, [routeOn]);
  const [selected, setSelected] = useState<string>(player.lastStation);
  useEffect(() => {
    if (mapOpen) setSelected(where.station?.def.id ?? player.lastStation);
  }, [mapOpen]);
  const clear = !mapOpen && !settingsOpen && !paused && !pickerOpen;
  return (
    <div className="hud">
      {!hudHidden && (
        <>
          <div className="hud-top">
            <Clock />
            {where.train ? <TrainSign /> : <StationSign />}
          </div>
          <div className="hud-right">
            <GuideCard />
            <Board />
          </div>
          {clear && <GuideMarker />}
          {!mapOpen && !paused && <div className="crosshair" />}
          {clear && <MiniMap />}
          <div className="hud-bl">
            {fpsOn && <Fps />}
            {!locked && clear && (
              <div className="hud-buttons">
                <button className="sg-btn" onClick={() => setMap(true)}><Bi ja="路線図" en="Map" /></button>
                <button className="sg-btn" onClick={() => setSettings(true)}><Bi ja="設定" en="Settings" /></button>
                <button className="sg-btn" onClick={() => setPaused(true)}><Bi ja="一時停止" en="Pause" /></button>
              </div>
            )}
            <div className="hud-keys">
              {KEYS.map(([k, ja, en]) => <span key={k}><kbd>{k}</kbd> {lang === 'ja' ? ja : en}</span>)}
            </div>
          </div>
          {!locked && clear && (
            <button className="hud-capture" onClick={() => (freeMouse ? setFreeMouse(false) : capturePointer())}>
              {freeMouse ? <><kbd>Tab</kbd> <Bi ja="マウス自由 · 視点操作に戻る" en="Mouse is free · Tab or click the view to look around" /></> : <Bi ja="クリックして視点操作" en="Click the view to look around" />}
            </button>
          )}
        </>
      )}
      <Notices show={clear && !hudHidden} />
      <StepBanner show={clear && !hudHidden} />
      {pickerOpen && <DestinationPicker />}
      {wheelOpen && clear && <Wheel />}
      {hudHidden && clear && <div className="hud-hidden-note"><kbd>H</kbd> <Bi ja="表示を戻す" en="Show the display" /></div>}
      {paused && <PauseMenu />}
      {mapOpen && (
        <div className="overlay" onClick={() => setMap(false)}>
          <div className="map-wrap sheet" onClick={(e) => e.stopPropagation()}>
            <div className="map-card">
              <div className="card-title">
                {mapPick ? <Bi ja="行き先をえらぶ" en="Choose a destination · click a station or search, check the route, then confirm" /> : <Bi ja="路線図" en="Route map · select a station to travel there" />}
                <button className="btn small" onClick={() => setMap(false)}><Bi ja="とじる" en="Close (M)" /></button>
              </div>
              <MetroMap selected={selected} onSelect={(id) => (mapPick && !isUnbuilt(id) && id !== hereId() ? setPreview(id) : setSelected(id))} here={where.station?.def.id ?? null} />
            </div>
            <StationPanel id={selected} onGo={goTo} onGuide={guide} onPreview={setPreview} confirm={!!preview} />
          </div>
        </div>
      )}
    </div>
  );
}
