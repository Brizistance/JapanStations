// The city menu (Kawaminato): the route map to pick a station from, and the hour and weather
// for the visit. Reached from the region map by the map zoom; settings live in their own screen.

import { useState } from 'react';
import { HOME_STATION, LINES, OPERATOR, RAIL_LINES } from '../data/network';
import { WEATHER_NAME, weatherIcon } from '../signs/weather-icon';
import { WEATHERS, dayOfMonth, dayRange, daysIn, doyOf, monthOf, temperatureNow } from '../sim/climate';
import { clock, formatClock } from '../sim';
import { Bi } from './Bi';
import { LineBullet, MetroMap, StationPanel, useTick } from './MetroMap';
import { zoomMs } from './RegionMap';
import { MusicToggle } from './MusicToggle';
import { shownTime, useUI } from './store';

export function Logo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="48" fill="#0d3b66" />
      {[[-21, 44], [0, 56], [21, 44]].map(([dx, len], i) => (
        <path key={i} d={`M ${55 + dx} ${50 - len / 2} C ${40 + dx} 45, ${60 + dx} 55, ${45 + dx} ${50 + len / 2}`} stroke="#fff" strokeWidth="9" strokeLinecap="round" fill="none" />
      ))}
    </svg>
  );
}

export const TIME_PRESETS: [string, string, number][] = [
  ['朝', 'Dawn', 6.25],
  ['昼', 'Day', 12],
  ['夕', 'Dusk', 17.75],
  ['夜', 'Night', 21],
];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A weather pictogram (signs/weather-icon.ts) for menus and the HUD. */
export function WeatherIcon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Today's weather and temperature, and the choice of weather: Auto (by the date) or one kind held. */
export function WeatherPicker() {
  const weather = useUI((s) => s.weather), weatherNow = useUI((s) => s.weatherNow);
  const doy = useUI((s) => s.doy), year = useUI((s) => s.year);
  const setWeather = useUI((s) => s.setWeather);
  const range = dayRange(doy, weatherNow, year);
  return (
    <>
        <div className="sky-now">
          <WeatherIcon d={weatherIcon(weatherNow, clock.time)} size={34} />
          <b>{temperatureNow(clock.time)}<small>°C</small></b>
          <span>
            <Bi ja={WEATHER_NAME[weatherNow][0]} en={WEATHER_NAME[weatherNow][1]} />
            <small><Bi ja={`最高 ${range.high}° · 最低 ${range.low}°`} en={`High ${range.high}° · Low ${range.low}°`} /></small>
          </span>
        </div>
        <div className="sg-seg" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <button className={weather === 'auto' ? 'on' : ''} aria-pressed={weather === 'auto'} onClick={() => setWeather('auto')}>
            <Bi ja="自動" en="Auto" />
          </button>
          {WEATHERS.map((w) => (
            <button key={w} className={weather === w ? 'on' : ''} aria-pressed={weather === w} onClick={() => setWeather(w)}>
              <Bi ja={WEATHER_NAME[w][0]} en={WEATHER_NAME[w][1]} />
            </button>
          ))}
        </div>
        <p className="set-hint">Auto follows the date: each day brings the weather its month is likely to. Pick one to hold it.</p>
    </>
  );
}

/** The date (day steps and a month grid). The month sets the season: climate, day length, trees. */
export function DatePicker() {
  const doy = useUI((s) => s.doy);
  const setDate = useUI((s) => s.setDate), stepDay = useUI((s) => s.stepDay);
  const month = monthOf(doy), day = dayOfMonth(doy);
  return (
    <>
      <div className="sky-date">
        <button title="前の日 Previous day" onClick={() => stepDay(-1)}>◀</button>
        <b><Bi ja={`${month}月${day}日`} en={`${day} ${MONTH_EN[month - 1]}`} /></b>
        <button title="次の日 Next day" onClick={() => stepDay(1)}>▶</button>
      </div>
      <div className="sg-seg" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {MONTH_EN.map((en, i) => (
          <button key={en} className={month === i + 1 ? 'on' : ''} aria-pressed={month === i + 1} onClick={() => setDate(doyOf(i + 1, Math.min(day, daysIn(i + 1))))}>
            <Bi ja={`${i + 1}月`} en={en} />
          </button>
        ))}
      </div>
      <p className="set-hint">The month sets the climate, the length of the day and the trees.</p>
    </>
  );
}

/** Date, time of day and weather for this visit. All apply live to the view behind the menu. */
function SkyPicker() {
  const setTime = useUI((s) => s.setTime);
  const t = shownTime(), now = ((t % 86400) + 86400) % 86400;
  return (
    <div className="sg-panel">
      <h3><Bi ja="日付" en="Date" /></h3>
      <DatePicker />
      <h3><Bi ja="時刻" en="Time of day" /></h3>
      <div className="sky-time">
        <b>{formatClock(t)}</b>
        <input type="range" min={0} max={86400 - 900} step={900} value={Math.floor(now / 900) * 900} aria-label="Time of day" onChange={(e) => setTime(Number(e.target.value))} />
      </div>
      <div className="sg-seg" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {TIME_PRESETS.map(([ja, en, h]) => (
          <button key={en} onClick={() => setTime(h * 3600)}><Bi ja={ja} en={en} /></button>
        ))}
      </div>
      <p className="set-hint">The clock keeps running from the hour you pick, and the trains follow it.</p>
      <h3><Bi ja="天気" en="Weather" /></h3>
      <WeatherPicker />
    </div>
  );
}

/** Every line with its real headway, from the timetable data. */
function LineList() {
  return (
    <div className="sg-panel">
      <h3><Bi ja="運行中の路線" en="Lines running" /></h3>
      <div className="line-list">
        {[...LINES, ...RAIL_LINES].map((l) => (
          <div key={l.id} className="city-line">
            <LineBullet line={l} size={26} />
            <div>
              <b>{l.nameJa}</b> <span>{l.nameEn}</span>
              <small>{l.stops.length} stations · every {Math.round(l.service.headwayS / (l.services?.length ?? 1) / 60)} min{l.type === 'jr' ? ' · map and timetable only' : ''}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MainMenu() {
  const start = useUI((s) => s.start);
  const toRegion = useUI((s) => s.toRegion);
  const setSettings = useUI((s) => s.setSettings);
  const arrived = useUI((s) => s.zoomed);
  const [selected, setSelected] = useState<string>(HOME_STATION);
  const [tab, setTab] = useState<'map' | 'sky'>('map');
  const [leaving, setLeaving] = useState(false);
  useTick(1000);
  const back = () => {
    if (leaving) return;
    // The zoom out starts from the route map, so show it first.
    if (tab !== 'map') return toRegion(false);
    setLeaving(true);
    setTimeout(() => toRegion(true), zoomMs());
  };
  return (
    <div className="sg-screen">
      <header className="sg-band">
        <div className="sg-brand">
          <Logo size={52} />
          <div>
            <div className="sg-brand-big"><Bi ja={OPERATOR.nameJa} en={OPERATOR.nameEn} /></div>
            <div className="sg-brand-small">
              <b>{formatClock(clock.time)}</b> ただいま平常どおり運転しています · Good service on all lines
            </div>
          </div>
        </div>
        <div className="sg-band-actions">
          <button className="sg-btn" onClick={back}><Bi ja="← 西海地方" en="Region map" /></button>
          <MusicToggle inline />
          <button className="sg-btn" onClick={() => setSettings(true)}><Bi ja="設定" en="Settings" /></button>
        </div>
      </header>
      <div className="sg-row">
        <nav className="sg-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'map'} className={tab === 'map' ? 'on' : ''} onClick={() => setTab('map')}><Bi ja="路線図" en="Route map" /></button>
          <button role="tab" aria-selected={tab === 'sky'} className={tab === 'sky' ? 'on' : ''} onClick={() => setTab('sky')}><Bi ja="時刻と天気" en="Time and weather" /></button>
        </nav>
        <button className="sg-btn exit" onClick={() => start(HOME_STATION)}><Bi ja="はじめる" en="Start exploring" /></button>
      </div>
      <div className="sg-body">
        {tab === 'map' && (
          <div className="map-wrap">
            <div className="map-card zoom-clip">
              <div className={`zoom-box${leaving ? ' zoom-out' : arrived ? ' zoom-in' : ''}`}>
                <MetroMap selected={selected} onSelect={setSelected} />
              </div>
            </div>
            <StationPanel id={selected} onGo={start} goLabel={['この駅からはじめる', 'Start from this station']} />
          </div>
        )}
        {tab === 'sky' && (
          <div className="sky-wrap">
            <SkyPicker />
            <LineList />
          </div>
        )}
      </div>
    </div>
  );
}
