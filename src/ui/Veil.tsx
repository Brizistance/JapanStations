// The short cover over the 3D view (not the menus) for changes that would cut visibly: a new
// time of day (the trains jump to the timetable) and a new season (the stations' trees are
// rebuilt). Dip to dark, run the queued work, let two frames draw, fade back. The sky itself
// eases on its own (Scene.tsx), so it is still changing as the cover lifts.

import { useEffect, useState } from 'react';
import { runVeiled, useUI, veilState } from './store';

const IN_MS = 150;
const HOLD_MS = 150; // after the last change, so a dragged slider keeps it up
const OUT_MS = 300;

export function Veil() {
  const veil = useUI((s) => s.veil);
  const [phase, setPhase] = useState<'off' | 'dark' | 'out'>('off');

  useEffect(() => {
    if (veil === 0) return;
    let live = true;
    const timers: number[] = [];
    const after = (ms: number, fn: () => void) => timers.push(window.setTimeout(() => live && fn(), ms));
    setPhase('dark');
    after(veilState.dark ? 0 : IN_MS, () => {
      veilState.dark = true;
      runVeiled();
      // Two frames at the new state (setTimeout, so a hidden tab still finishes), then lift.
      after(HOLD_MS + 34, () => {
        veilState.dark = false;
        setPhase('out');
        after(OUT_MS, () => setPhase('off'));
      });
    });
    return () => {
      live = false;
      for (const t of timers) clearTimeout(t);
    };
  }, [veil]);

  if (phase === 'off') return null;
  return <div className={`veil${phase === 'dark' ? ' dark' : ''}`} aria-hidden="true" />;
}
