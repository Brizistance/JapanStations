// The Seikai region map: pick a city. Only Kawaminato can be entered; choosing it zooms the
// map into the city's dot, and the city menu's route map takes over in the same place.

import { useState } from 'react';
import { LINES, OPERATOR, STATIONS } from '../data/network';
import { CITIES, cityById, HOME_CITY, linesServing, REGION, REGION_H, REGION_LINES, REGION_W, type City, type RegionLine } from '../data/region';
import { Bi, RegionMark, usePair } from './Bi';
import { MusicToggle } from './MusicToggle';
import { useUI } from './store';

/** How long each half of the map zoom lasts; 0 when the visitor asks for less motion. */
export const zoomMs = () => (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 480);

const LABEL: Record<City['label'], { dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }> = {
  right: { dx: 34, dy: 2, anchor: 'start' },
  left: { dx: -34, dy: 2, anchor: 'end' },
  above: { dx: 0, dy: -92, anchor: 'middle' },
  below: { dx: 0, dy: 62, anchor: 'middle' },
};

function RouteSwatch({ line }: { line: RegionLine }) {
  return (
    <svg width="38" height="12" aria-hidden>
      <line x1="2" y1="6" x2="36" y2="6" stroke={line.color} strokeWidth="6" strokeLinecap="round" strokeDasharray={line.status === 'planned' ? '2 9' : undefined} />
    </svg>
  );
}

function RegionSvg({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const lang = useUI((s) => s.lang);
  return (
    <svg className="map region-map" viewBox={`0 0 ${REGION_W} ${REGION_H}`} role="img" aria-label="Region map">
      <rect x="0" y="0" width={REGION_W} height={REGION_H} fill="#f7f6f1" rx="10" />
      {/* The plateau, the bay with its head to the north, the islands off Asanagi, and the Mio-gawa. Decorative. */}
      <ellipse cx="1610" cy="215" rx="270" ry="165" fill="#ece7d6" />
      <ellipse cx="1610" cy="205" rx="180" ry="105" fill="#e4dec9" />
      <path d="M 560 1060 C 520 900, 500 760, 520 640 S 600 380, 740 320 S 940 380, 985 480 S 990 700, 940 800 C 925 835, 880 850, 882 900 S 900 1000, 880 1060 Z" fill="#d3e6f1" />
      <path d="M 1660 120 C 1520 260, 1390 250, 1290 330 S 1110 450, 985 486" stroke="#d3e6f1" strokeWidth="20" fill="none" strokeLinecap="round" />
      <ellipse cx="800" cy="905" rx="36" ry="20" fill="#f7f6f1" />
      <ellipse cx="752" cy="985" rx="27" ry="16" fill="#f7f6f1" />
      <ellipse cx="826" cy="1000" rx="16" ry="10" fill="#f7f6f1" />
      <text x="745" y="640" className="map-geo region-geo">川湊湾 Kawaminato Bay</text>
      <text x="1320" y="292" className="map-geo region-geo" transform="rotate(-30 1320 292)">澪川 Mio-gawa</text>
      {/* Planned railways first, so the running one draws on top where they meet. */}
      {[...REGION_LINES].sort((a, b) => Number(a.status === 'running') - Number(b.status === 'running')).map((l) => (
        <polyline key={l.id} points={l.path.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={l.color}
          strokeWidth={l.status === 'running' ? 14 : 9} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={l.status === 'planned' ? '3 20' : undefined} opacity={l.status === 'planned' ? 0.85 : 1} />
      ))}
      {CITIES.map((c) => {
        const lp = LABEL[c.label], sel = c.id === selected;
        const [big, small] = lang === 'ja' ? [c.nameJa, c.nameRomaji] : [c.nameRomaji, c.nameJa];
        return (
          <g key={c.id} className={`stn${sel ? ' sel' : ''}`} onClick={() => onSelect(c.id)} tabIndex={0} role="button" aria-label={c.nameRomaji}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(c.id)}>
            <circle cx={c.x} cy={c.y} r={60} fill="transparent" />
            <circle cx={c.x} cy={c.y} r={c.playable ? 24 : 18} fill="#fff" stroke="#14233b" strokeWidth={c.playable ? 9 : 7} />
            {sel && <circle cx={c.x} cy={c.y} r={c.playable ? 38 : 31} fill="none" stroke="#f5c400" strokeWidth={7} />}
            <text x={c.x + lp.dx} y={c.y + lp.dy} textAnchor={lp.anchor} className="region-ja">{big}</text>
            <text x={c.x + lp.dx} y={c.y + lp.dy + 24} textAnchor={lp.anchor} className="region-en">{small}</text>
            {!c.playable && <text x={c.x + lp.dx} y={c.y + lp.dy + 46} textAnchor={lp.anchor} className="region-soon">準備中 Coming soon</text>}
          </g>
        );
      })}
      {/* Legend */}
      <g transform={`translate(1380 ${REGION_H - 60 - REGION_LINES.length * 40})`}>
        <rect x="0" y="0" width="490" height={REGION_LINES.length * 40 + 30} rx="10" fill="#fff" stroke="#d9d6cc" />
        {REGION_LINES.map((l, i) => (
          <g key={l.id} transform={`translate(22 ${36 + i * 40})`}>
            <line x1="0" y1="-5" x2="56" y2="-5" stroke={l.color} strokeWidth={l.status === 'running' ? 11 : 8} strokeLinecap="round" strokeDasharray={l.status === 'planned' ? '3 15' : undefined} />
            <text x="74" y="-2" className="map-leg-ja">{l.nameJa}</text>
            <text x="74" y="12" className="map-leg-en">{l.nameEn}{l.status === 'planned' ? ' · planned' : ''}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function CityPanel({ city, onEnter, busy }: { city: City; onEnter: () => void; busy: boolean }) {
  const [big, small] = usePair(city.nameJa, city.nameRomaji);
  const [character, characterSmall] = usePair(city.characterJa, city.characterEn);
  return (
    <div className="sg-panel city-panel">
      <div className="city-kana">{city.nameKana}</div>
      <h2>{big}</h2>
      <div className="city-romaji">{small}</div>
      <span className={`city-tag${city.playable ? ' open' : ''}`}>
        {city.playable ? <Bi ja="公開中" en="Open" /> : <Bi ja="準備中" en="Coming soon" />}
      </span>
      <p>{character}</p>
      <p className="sub">{characterSmall}</p>
      {city.playable && (
        <>
          <h3><Bi ja="市内の交通" en="In the city" /></h3>
          <div className="city-line">
            <span className="city-dot" />
            <div>
              <b>{OPERATOR.nameJa}</b> <span>{OPERATOR.nameEn}</span>
              <small>{LINES.length} lines · {STATIONS.length} stations</small>
            </div>
          </div>
        </>
      )}
      <h3><Bi ja="都市間の鉄道" en="Railways between cities" /></h3>
      {linesServing(city.id).map((l) => (
        <div key={l.id} className="city-line">
          <RouteSwatch line={l} />
          <div>
            <b>{l.nameJa}</b> <span>{l.nameEn}{l.short ? ` (${l.short})` : ''}</span>
            <small>
              {l.cities.map((id) => cityById(id).nameRomaji).join(' – ')}
              {l.status === 'planned' ? ' · 計画中 planned' : ' · timetable running'}
            </small>
          </div>
        </div>
      ))}
      {city.playable ? (
        <button className="sg-btn exit wide" disabled={busy} onClick={onEnter}>
          <Bi ja={`${city.nameJa}へ`} en={`Enter ${city.nameRomaji}`} />
        </button>
      ) : (
        <p className="sub city-note">This city is not built yet. It is on the map so the region reads as a whole.</p>
      )}
    </div>
  );
}

export function RegionMap() {
  const toCity = useUI((s) => s.toCity);
  const toTitle = useUI((s) => s.toTitle);
  const setSettings = useUI((s) => s.setSettings);
  const arrived = useUI((s) => s.zoomed);
  const [selected, setSelected] = useState(HOME_CITY);
  const [leaving, setLeaving] = useState(false);
  const home = cityById(HOME_CITY);
  const enter = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => toCity(true), zoomMs());
  };
  return (
    <div className="sg-screen">
      <header className="sg-band">
        <div className="sg-brand">
          <RegionMark size={52} />
          <div>
            <div className="sg-brand-big"><Bi ja={`${REGION.nameJa}地方`} en={`${REGION.nameRomaji} Region`} /></div>
            <div className="sg-brand-small">{REGION.titleEn}</div>
          </div>
        </div>
        <div className="sg-band-actions">
          <button className="sg-btn" onClick={toTitle}><Bi ja="← タイトル" en="Title" /></button>
          <MusicToggle inline />
          <button className="sg-btn" onClick={() => setSettings(true)}><Bi ja="設定" en="Settings" /></button>
        </div>
      </header>
      <div className="sg-row">
        <div className="sg-crumb"><b>1</b><Bi ja="都市をえらぶ" en="Choose a city" /></div>
      </div>
      <div className="sg-body">
        <div className="map-wrap">
          <div className="map-card zoom-clip">
            <div
              className={`zoom-box${leaving ? ' zoom-into' : arrived ? ' zoom-back' : ''}`}
              style={{ transformOrigin: `${(home.x / REGION_W) * 100}% ${(home.y / REGION_H) * 100}%` }}
            >
              <RegionSvg selected={selected} onSelect={setSelected} />
            </div>
          </div>
          <CityPanel city={cityById(selected)} onEnter={enter} busy={leaving} />
        </div>
      </div>
    </div>
  );
}
