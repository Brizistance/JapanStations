// Platform announcements: while the player stands on a platform, watch both tracks' next
// train (the same timetable state the departure boards show) and announce each change:
// approaching, arrived, doors closing, or terminating here.

import type { Dir } from '../data/types';
import { lineById } from '../data/network';
import { where } from '../player/player';
import { platformNo, platformTrains, statusOf, type Status } from '../signs/departures';
import { announce, hushVoice } from './engine';
import { announcement, type Event } from './phrases';

/** The announcement a status change calls for, if any. */
export function edge(prev: Status | undefined, next: Status): Event | null {
  if (prev === undefined || prev === next) return null;
  if (next === 'approach') return 'approach'; // also right after the last train left
  if (next === 'boarding' && (prev === 'approach' || prev === 'wait')) return 'arrive';
  if (next === 'closing' && prev === 'boarding') return 'closing';
  if (next === 'terminating' && (prev === 'approach' || prev === 'wait')) return 'terminating';
  return null;
}

let here: string | null = null;
const last = new Map<string, Status>();

export function tickPlatformVoice(now: number) {
  const st = where.station?.def, zone = where.zone;
  const lineId = zone?.kind === 'platform' && !where.train ? zone.line : undefined;
  const key = st && lineId ? `${st.id}:${lineId}` : null;
  if (key !== here) {
    // New place: forget old states so nothing fires for a change we didn't see.
    here = key;
    last.clear();
    hushVoice();
  }
  if (!st || !lineId || !st.platforms[lineId]) return;
  const pl = lineById(lineId);
  for (const dir of ['down', 'up'] as Dir[]) {
    const d = platformTrains(pl, st, dir, now, 1)[0];
    const s = statusOf(d, now);
    const ev = edge(last.get(dir), s);
    last.set(dir, s);
    if (ev && d) {
      const track = platformNo(st, pl, dir);
      announce(`${key}:${dir}`, announcement(ev, st, d.line, dir, track));
    }
  }
}
