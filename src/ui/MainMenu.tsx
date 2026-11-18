import { useState } from 'react';
import { HOME_STATION, LINES, OPERATOR, STATIONS } from '../data/network';
import { clock, formatClock } from '../sim';
import { EffectSwitches, PresetButtons, PresetHint } from './GraphicsSettings';
import { LineBullet, MetroMap, StationPanel, useTick } from './MetroMap';
import { useUI } from './store';

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

export function Controls() {
  const rows: [string, string, string][] = [
    ['W A S D', '移動', 'Move'],
    ['マウス', '視点', 'Look (click the view to capture the mouse)'],
    ['Space', 'ジャンプ', 'Jump'],
    ['Shift', '走る', 'Run'],
    ['M', '路線図・駅へ移動', 'Route map / teleport'],
    ['F', '早送り', 'Fast-forward time ×6'],
    ['G', '画質設定', 'Graphics settings'],
    ['R', '最寄り駅に戻る', 'Respawn at nearest station'],
    ['Esc', 'マウス解放', 'Release the mouse'],
    ['← → / Q E', '視点 (キーボード)', 'Turn with the keyboard'],
  ];
  return (
    <table className="keys">
      <tbody>
        {rows.map(([k, ja, en]) => (
          <tr key={k}>
            <td><kbd>{k}</kbd></td>
            <td>{ja}</td>
            <td className="muted">{en}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MainMenu() {
  const start = useUI((s) => s.start);
  const [selected, setSelected] = useState<string>(HOME_STATION);
  const [tab, setTab] = useState<'map' | 'controls' | 'about'>('map');
  useTick(1000);
  return (
    <div className="menu">
      <header className="menu-top">
        <div className="brand">
          <Logo />
          <div>
            <div className="brand-ja">{OPERATOR.nameJa}</div>
            <div className="brand-en">{OPERATOR.nameEn}</div>
          </div>
        </div>
        <div className="menu-clock">
          <span>{formatClock(clock.time)}</span>
          <em>ただいま平常どおり運転しています · Good service on all lines</em>
        </div>
      </header>
      <div className="menu-body">
        <aside className="menu-side">
          <h1>
            {OPERATOR.cityJa}の地下鉄を歩く
            <em>Walk, ride and explore the {OPERATOR.city} subway</em>
          </h1>
          <button className="btn primary big" onClick={() => start(HOME_STATION)}>
            はじめる <em>Start exploring</em>
          </button>
          <nav className="menu-nav">
            <button className={tab === 'map' ? 'on' : ''} onClick={() => setTab('map')}>路線図 <em>Route map</em></button>
            <button className={tab === 'controls' ? 'on' : ''} onClick={() => setTab('controls')}>操作方法 <em>Controls</em></button>
            <button className={tab === 'about' ? 'on' : ''} onClick={() => setTab('about')}>ご案内 <em>About</em></button>
          </nav>
          <div className="menu-quality" role="group" aria-label="Graphics quality">
            <span>画質 <em>Graphics</em></span>
            <PresetButtons />
            <PresetHint />
            <details className="gfx-advanced">
              <summary>詳細設定 <em>Advanced · also in game with G</em></summary>
              <EffectSwitches />
            </details>
          </div>
          <div className="menu-lines">
            {LINES.map((l) => (
              <div key={l.id} className="menu-line">
                <LineBullet line={l} size={26} />
                <div>
                  <b>{l.nameJa}</b> <span>{l.nameEn}</span>
                  <small>{l.stops.length} stations · every {Math.round(l.service.headwayS / 60)} min</small>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <main className="menu-main">
          {tab === 'map' && (
            <div className="map-wrap">
              <div className="map-card">
                <div className="card-title">路線図 <em>Route map — select a station</em></div>
                <MetroMap selected={selected} onSelect={setSelected} />
              </div>
              <StationPanel id={selected} onGo={start} goLabel="この駅からはじめる" />
            </div>
          )}
          {tab === 'controls' && (
            <div className="card">
              <div className="card-title">操作方法 <em>Controls</em></div>
              <Controls />
              <p className="muted">
                Trains run to a timetable. Wait on the platform, board through the open doors, and ride — the map (M) lets you jump to any station.
              </p>
            </div>
          )}
          {tab === 'about' && (
            <div className="card">
              <div className="card-title">ご案内 <em>About</em></div>
              <p>
                {OPERATOR.nameEn} is a fictional subway in the invented city of {OPERATOR.city}. Every station, line and brand here is made up;
                the design language is inspired by real Japanese metro systems.
              </p>
              <p className="muted">
                {STATIONS.length} stations · {LINES.length} lines · trains, departure boards and this map all run from one simulated timetable.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
