// The pause screen (Esc): the clock stands still, the mouse is free. One place with a tab for
// everything: the game (resume, date and season, time of day, weather, clock speed), the route map, guidance, settings and
// the keys.

import { useState } from 'react';
import { linesAt, stationById } from '../data/network';
import { player, where } from '../player/player';
import { clock, formatClock } from '../sim';
import { Bi } from './Bi';
import { DestinationSearch } from './Guide';
import { DatePicker, TIME_PRESETS, WeatherPicker } from './MainMenu';
import { MetroMap, NumberBadge, StationPanel } from './MetroMap';
import { SettingsBody } from './Settings';
import { shownTime, useUI, type Speed } from './store';

const SPEED_LABEL: [Speed, string, string][] = [[0, '停止', 'Stopped'], [1, '通常', 'Real time'], [6, '早送り ×6', 'Fast ×6']];
type Tab = 'game' | 'map' | 'guide' | 'settings' | 'controls';
const TABS: [Tab, string, string][] = [['game', 'ゲーム', 'Game'], ['map', '路線図', 'Route map'], ['guide', '案内', 'Guide'], ['settings', '設定', 'Settings'], ['controls', '操作', 'Controls']];

function Game() {
  const { speed, setSpeed, setTime, setPaused, toMenu, lang } = useUI();
  const t = shownTime(), now = ((t % 86400) + 86400) % 86400;
  return (
    <div className="pause-body">
      <div className="pause-actions">
        <button className="sg-btn exit big" autoFocus onClick={() => setPaused(false)}><Bi ja="つづける" en="Resume" /></button>
        <button className="sg-btn warn" onClick={toMenu}><Bi ja="メニューへ戻る" en="Back to the menu" /></button>
      </div>
      <div className="pause-side">
        <h3><Bi ja="日付" en="Date" /></h3>
        <DatePicker />
        <h3><Bi ja="時刻" en="Time of day" /></h3>
        <div className="sky-time">
          <b>{formatClock(t)}</b>
          <input type="range" min={0} max={86400 - 900} step={900} value={Math.floor(now / 900) * 900} aria-label="Time of day" onChange={(e) => setTime(Number(e.target.value))} />
        </div>
        <div className="sg-seg" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {TIME_PRESETS.map(([ja, en, h]) => <button key={en} onClick={() => setTime(h * 3600)}><Bi ja={ja} en={en} /></button>)}
        </div>
        <h3><Bi ja="天気" en="Weather" /></h3>
        <WeatherPicker />
        <h3><Bi ja="時間の速さ" en="Clock speed" /></h3>
        <div className="sg-seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {SPEED_LABEL.map(([v, ja, en]) => (
            <button key={v} className={speed === v ? 'on' : ''} aria-pressed={speed === v} onClick={() => setSpeed(v)}><Bi ja={ja} en={en} /></button>
          ))}
        </div>
        <p className="set-hint">{lang === 'ja' ? '再開すると、この速さで時計と電車が動きます。' : 'On resume the clock and the trains run at this speed.'}</p>
      </div>
    </div>
  );
}

export function PauseMenu() {
  const { setPaused, goTo, setGuide, guideTo } = useUI();
  const [tab, setTab] = useState<Tab>('game');
  const here = where.station?.def.id ?? player.lastStation;
  const [selected, setSelected] = useState<string>(here);
  const st = stationById(here);
  const guide = (id: string) => {
    setGuide(id);
    setPaused(false);
  };
  const dest = guideTo ? stationById(guideTo) : null;
  return (
    <div className="pause" role="dialog" aria-label="Paused">
      <div className={`pause-board${tab === 'map' ? ' wide' : ''}`}>
        <div className="pause-head">
          <div>
            <h2><Bi ja="一時停止" en="Paused" /></h2>
            <p>
              {linesAt(st.id).map((l) => <NumberBadge key={l.id} code={st.numbers[l.id]} color={l.color} size={30} />)}
              <span><Bi ja={st.nameJa} en={st.nameRomaji} /></span>
            </p>
          </div>
          <b>{formatClock(clock.time)}</b>
        </div>
        <nav className="sg-tabs pause-tabs" role="tablist">
          {TABS.map(([id, ja, en]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}><Bi ja={ja} en={en} /></button>
          ))}
          <button className="resume" onClick={() => setPaused(false)}><Bi ja="つづける" en="Resume" /> <kbd>Esc</kbd></button>
        </nav>
        {tab === 'game' && <Game />}
        {tab === 'map' && (
          <div className="pause-map map-wrap">
            <div className="map-card">
              <MetroMap selected={selected} onSelect={setSelected} here={where.station?.def.id ?? null} />
            </div>
            <StationPanel id={selected} onGo={goTo} onGuide={guide} onPreview={(id) => useUI.getState().setPreview(id)} />
          </div>
        )}
        {tab === 'guide' && (
          <div className="pause-guide">
            {dest && (
              <div className="pause-guiding">
                <span><i>案内中 Guiding to</i> <b>{dest.nameJa}</b> {dest.nameRomaji}</span>
                <button className="sg-btn" onClick={() => setGuide(null)}><Bi ja="案内を終了" en="End guidance" /></button>
              </div>
            )}
            <h3><Bi ja="行き先をえらぶ" en="Choose a destination" /></h3>
            <DestinationSearch onPick={(id) => useUI.getState().setPreview(id)} />
            <p className="set-hint">Picking a station shows the route on the map first; guidance starts when you confirm.</p>
          </div>
        )}
        {tab === 'settings' && <div className="settings embedded"><SettingsBody /></div>}
        {tab === 'controls' && <div className="settings embedded"><SettingsBody only="controls" /></div>}
      </div>
    </div>
  );
}
