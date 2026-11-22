// The first screen: the region's name on a sign board over the live backdrop.

import { useEffect } from 'react';
import { OPERATOR, STATIONS, LINES } from '../data/network';
import { CITIES, REGION } from '../data/region';
import { Bi, RegionMark, usePair } from './Bi';
import { useUI } from './store';

export function TitleScreen() {
  const toRegion = useUI((s) => s.toRegion);
  const setSettings = useUI((s) => s.setSettings);
  const settingsOpen = useUI((s) => s.settingsOpen);
  const [big, small] = usePair(REGION.titleJa, REGION.titleEn);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && !settingsOpen && !(e.target instanceof HTMLButtonElement)) toRegion();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [toRegion, settingsOpen]);
  return (
    <div className="sg-screen sg-title">
      <div className="sg-board">
        <div className="sg-board-head">
          <RegionMark size={92} />
          <div>
            <h1>{big}</h1>
            <p>{small}</p>
          </div>
        </div>
        {/* Like the strip on a station name board, but naming the region's cities. */}
        <div className="sg-board-strip">
          {CITIES.map((c) => (
            <span key={c.id} className={c.playable ? 'here' : ''}>
              <b>{c.nameJa}</b>
              <i>{c.nameRomaji}</i>
            </span>
          ))}
        </div>
        <div className="sg-board-actions">
          <button className="sg-btn exit big" onClick={() => toRegion()} autoFocus>
            <Bi ja="はじめる" en="Start" />
          </button>
          <button className="sg-btn big" onClick={() => setSettings(true)}>
            <Bi ja="設定" en="Settings" />
          </button>
        </div>
      </div>
      <footer className="sg-title-foot">
        {REGION.nameRomaji} is a fictional region of Japan. Every city, station, line and brand here is invented.
        <span>{OPERATOR.nameEn}: {STATIONS.length} stations on {LINES.length} lines, all running to one simulated timetable.</span>
      </footer>
    </div>
  );
}
