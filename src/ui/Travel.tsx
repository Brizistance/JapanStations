// The teleport transition: fade to dark with the station's name card, move the player
// while the screen is covered, let a few frames draw there (shaders and textures for the
// new view are prepared out of sight), then fade back in.

import { useEffect, useState } from 'react';
import { linesAt, stationById } from '../data/network';
import { clearInput, teleport } from '../player/player';
import { NumberBadge } from './MetroMap';
import { useUI } from './store';

const COVER_MS = 250;
const HOLD_MS = 700; // from the start until the reveal begins, if the new view is ready
const REVEAL_MS = 300;
const WARM_FRAMES = 3;

const frames = (n: number) =>
  new Promise<void>((done) => {
    const step = (left: number) => (left <= 0 ? done() : requestAnimationFrame(() => step(left - 1)));
    step(n);
  });
const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

export function Travel() {
  const travel = useUI((s) => s.travel);
  const [shown, setShown] = useState<{ id: string; dark: boolean } | null>(null);

  useEffect(() => {
    if (!travel) return;
    let live = true;
    const t0 = performance.now();
    // Mount transparent, then go dark on the next frame so the fade runs.
    setShown((s) => ({ id: travel.id, dark: s?.dark ?? false }));
    requestAnimationFrame(() => live && setShown({ id: travel.id, dark: true }));
    void (async () => {
      await wait(COVER_MS);
      if (!live) return;
      teleport(travel.id);
      clearInput();
      if (useUI.getState().mode !== 'play') useUI.setState({ mode: 'play' });
      await frames(WARM_FRAMES);
      await wait(Math.max(0, HOLD_MS - (performance.now() - t0)));
      if (!live) return;
      clearInput();
      setShown({ id: travel.id, dark: false });
      useUI.getState().endTravel(travel.seq);
      await wait(REVEAL_MS);
      // endTravel ended this effect (live is false by now); unmount unless a new trip went dark.
      setShown((s) => (s && !s.dark ? null : s));
    })();
    return () => {
      live = false;
    };
  }, [travel]);

  if (!shown) return null;
  const st = stationById(shown.id);
  const lines = linesAt(shown.id);
  return (
    <div className={`travel${shown.dark ? ' dark' : ''}`} aria-live="polite">
      <div className="travel-board">
        <div className="travel-head">
          <div className="travel-badges">
            {lines.map((l) => <NumberBadge key={l.id} code={st.numbers[l.id]} color={l.color} size={40} />)}
          </div>
          <div className="travel-name">
            <small>{st.nameKana}</small>
            <b>{st.nameJa}</b>
            <span>{st.nameRomaji}</span>
          </div>
        </div>
        <div className="travel-strip">{lines.map((l) => <i key={l.id} style={{ background: l.color }} />)}</div>
      </div>
    </div>
  );
}
