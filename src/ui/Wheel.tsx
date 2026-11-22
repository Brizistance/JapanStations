// The quick menu: hold Z for a ring of actions, move the mouse towards one, let go. It saves
// remembering a key for each. The mouse stays captured; the ring reads how far it has moved.

import { useEffect, useState } from 'react';
import { Two } from './Hud';
import { useUI } from './store';

type UIState = ReturnType<typeof useUI.getState>;

/** How far the mouse has moved since the ring opened, in pixels (kept within the ring). */
export const wheelMove = { x: 0, y: 0 };
const REACH = 150, DEAD = 34;

export function moveWheel(dx: number, dy: number) {
  wheelMove.x += dx;
  wheelMove.y += dy;
  const d = Math.hypot(wheelMove.x, wheelMove.y);
  if (d > REACH) {
    wheelMove.x *= REACH / d;
    wheelMove.y *= REACH / d;
  }
}

/** Clockwise from the top. `key` is the action's own key, shown as a reminder. */
export const WHEEL: { ja: string; en: string; key: string; run: (ui: UIState) => void }[] = [
  { ja: '路線図', en: 'Route map', key: 'M', run: (ui) => ui.setMap(true) },
  { ja: '行き先を地図でえらぶ', en: 'Guide: pick on map', key: 'N', run: (ui) => ui.setMap(true, true) },
  { ja: '行き先をさがす', en: 'Guide: search', key: '', run: (ui) => ui.setPicker(true) },
  { ja: 'ミニマップ', en: 'Mini-map', key: 'P', run: (ui) => ui.setPlan(!ui.planOn) },
  { ja: '一時停止', en: 'Pause', key: 'Esc', run: (ui) => ui.setPaused(true) },
  { ja: '設定', en: 'Settings', key: 'G', run: (ui) => ui.setSettings(true) },
  { ja: '表示を隠す', en: 'Hide display', key: 'H', run: (ui) => ui.toggleHud() },
  { ja: 'マウスを自由に', en: 'Free mouse', key: 'Tab', run: (ui) => ui.setFreeMouse(true) },
];

/** The action the mouse points at, or -1 near the middle. */
export function wheelIndex(): number {
  if (Math.hypot(wheelMove.x, wheelMove.y) < DEAD) return -1;
  const a = Math.atan2(wheelMove.x, -wheelMove.y), n = WHEEL.length;
  return ((Math.round(a / ((2 * Math.PI) / n)) % n) + n) % n;
}

export function Wheel() {
  const [, set] = useState(0);
  useEffect(() => {
    let id = 0;
    const loop = () => {
      id = requestAnimationFrame(loop);
      set((v) => v + 1);
    };
    loop();
    return () => cancelAnimationFrame(id);
  }, []);
  const sel = wheelIndex(), n = WHEEL.length;
  const pick = (i: number) => {
    const ui = useUI.getState();
    ui.setWheel(false);
    WHEEL[i].run(ui);
  };
  return (
    <div className="wheel-scrim">
      <div className="wheel">
        {WHEEL.map((w, i) => {
          const a = (i / n) * 2 * Math.PI;
          return (
            <button key={w.en} className={i === sel ? 'on' : ''} style={{ left: `${50 + Math.sin(a) * 39}%`, top: `${50 - Math.cos(a) * 39}%` }} onClick={() => pick(i)}>
              <Two ja={w.ja} en={w.en} />
              {w.key && <kbd>{w.key}</kbd>}
            </button>
          );
        })}
        <div className="wheel-hub">
          <i style={{ transform: `translate(${wheelMove.x * 0.3}px, ${wheelMove.y * 0.3}px)` }} />
          <small><kbd>Z</kbd> をはなして決定<br />Release Z to choose</small>
        </div>
      </div>
    </div>
  );
}
