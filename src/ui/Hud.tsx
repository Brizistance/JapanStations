import { useEffect, useState } from 'react';
import { linesAt, stationById, terminusOf } from '../data/network';
import type { Dir } from '../data/types';
import { player, where } from '../player/player';
import { clock, formatClock, lineSim } from '../sim';
import { nextDepartures } from '../sim/timetable';
import { Controls } from './MainMenu';
import { GraphicsPanel } from './GraphicsSettings';
import { LineBullet, MetroMap, NumberBadge, StationPanel, useTick } from './MetroMap';
import { capturePointer, useUI } from './store';

function Location() {
  const st = where.station, zone = where.zone, train = where.train;
  if (train) {
    const line = train.sim.geom.def;
    const p = train.state.phase;
    const inService = p.kind === 'run' ? p.inService : p.role !== 'reverse' && p.role !== 'arrival';
    const dest = terminusOf(line, p.dir);
    const stopIdx = p.kind === 'run' ? p.toStop : p.stop;
    const stop = stopIdx >= 0 ? stationById(line.stops[stopIdx]) : null;
    return (
      <div className="hud-loc">
        <LineBullet line={line} size={30} />
        <div>
          <b>{line.nameJa} {inService ? `${dest.nameJa} ゆき` : '回送'}</b>
          <span>{line.nameEn} {inService ? `for ${dest.nameRomaji}` : '— not in service'}</span>
        </div>
        <div className="hud-next">
          {stop ? (
            <>
              <small>{p.kind === 'dwell' ? 'ただいま Now at' : 'つぎは Next'}</small>
              <b>{stop.nameJa}</b>
              <span>{stop.nameRomaji}</span>
            </>
          ) : (
            <>
              <small>引上線 Siding</small>
              <b>折り返し中</b>
              <span>Turning back</span>
            </>
          )}
        </div>
        <div className="hud-speed">{Math.round(train.state.speed * 3.6)}<small>km/h</small></div>
      </div>
    );
  }
  if (!st) return <div className="hud-loc"><div><b>駅間</b><span>Between stations</span></div></div>;
  return (
    <div className="hud-loc">
      {linesAt(st.def.id).map((l) => (
        <NumberBadge key={l.id} code={st.def.numbers[l.id]} color={l.color} size={38} />
      ))}
      <div>
        <b>{st.def.nameJa}</b>
        <span>{st.def.nameRomaji}</span>
      </div>
      {zone && (
        <div className="hud-zone">
          <b>{zone.ja}</b>
          <span>{zone.en}</span>
        </div>
      )}
    </div>
  );
}

function Board() {
  const st = where.station;
  if (!st || where.train) return null;
  const rows: { key: string; line: ReturnType<typeof linesAt>[number]; dir: Dir; platform: number; deps: { arr: number; dep: number }[] }[] = [];
  for (const line of linesAt(st.def.id)) {
    const { tt } = lineSim(line.id);
    const stop = line.stops.indexOf(st.def.id);
    for (const dir of ['down', 'up'] as Dir[]) {
      const deps = nextDepartures(tt, stop, dir, clock.time, 2);
      if (deps.length) rows.push({ key: line.id + dir, line, dir, platform: st.def.platforms[line.id][dir === 'down' ? 0 : 1], deps });
    }
  }
  return (
    <div className="hud-board">
      <div className="hud-board-title">発車案内 <em>Departures</em></div>
      {rows.map((r) => {
        const t = terminusOf(r.line, r.dir);
        const first = r.deps[0];
        const at = clock.time >= first.arr;
        const mins = Math.max(0, Math.ceil((first.dep - clock.time) / 60));
        return (
          <div className="hud-row" key={r.key}>
            <LineBullet line={r.line} size={20} />
            <span className="plat">{r.platform}</span>
            <div className="dest"><b>{t.nameJa}</b><span>{t.nameRomaji}</span></div>
            <div className="time">
              <b className={at ? 'now' : ''}>{formatClock(first.dep)}</b>
              <span>{at ? '停車中 boarding' : `${mins}分 min`}</span>
            </div>
            <div className="time later"><b>{formatClock(r.deps[1].dep)}</b></div>
          </div>
        );
      })}
    </div>
  );
}

export function Hud() {
  useTick(250);
  const { mapOpen, gfxOpen, locked, fast, setMap, setGfxOpen, goTo, toMenu } = useUI();
  const [selected, setSelected] = useState<string>(player.lastStation);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    if (mapOpen) setSelected(where.station?.def.id ?? player.lastStation);
  }, [mapOpen]);
  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-clock">
          <b>{formatClock(clock.time, true)}</b>
          {fast && <span className="fast">▶▶ ×6</span>}
        </div>
        <Location />
      </div>
      <Board />
      {!mapOpen && <div className="crosshair" />}
      <div className="hud-keys">
        <span><kbd>WASD</kbd> 移動</span>
        <span><kbd>Shift</kbd> 走る</span>
        <span><kbd>Space</kbd> ジャンプ</span>
        <span><kbd>M</kbd> 路線図</span>
        <span><kbd>F</kbd> 早送り</span>
        <span><kbd>G</kbd> 画質</span>
      </div>
      <div className="hud-buttons">
        <button className="btn" onClick={() => setMap(true)}>路線図 <em>Map</em></button>
        <button className="btn" onClick={() => setGfxOpen(!gfxOpen)}>画質 <em>Graphics</em></button>
        <button className="btn" onClick={() => setHelp((h) => !h)}>操作 <em>Help</em></button>
        <button className="btn" onClick={toMenu}>メニュー <em>Menu</em></button>
      </div>
      {!locked && !mapOpen && !help && !gfxOpen && (
        <button className="hud-capture" onClick={capturePointer}>
          クリックして視点操作 <em>Click the view to look around · Esc to release</em>
        </button>
      )}
      {help && (
        <div className="overlay" onClick={() => setHelp(false)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <div className="card-title">操作方法 <em>Controls</em></div>
            <Controls />
            <button className="btn primary" onClick={() => setHelp(false)}>とじる <em>Close</em></button>
          </div>
        </div>
      )}
      {gfxOpen && <GraphicsPanel />}
      {mapOpen && (
        <div className="overlay" onClick={() => setMap(false)}>
          <div className="map-wrap sheet" onClick={(e) => e.stopPropagation()}>
            <div className="map-card">
              <div className="card-title">
                路線図 <em>Route map — select a station to travel there</em>
                <button className="btn small" onClick={() => setMap(false)}>とじる <em>Close (M)</em></button>
              </div>
              <MetroMap selected={selected} onSelect={setSelected} here={where.station?.def.id ?? null} />
            </div>
            <StationPanel id={selected} onGo={goTo} />
          </div>
        </div>
      )}
    </div>
  );
}
