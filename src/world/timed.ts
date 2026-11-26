// Things in the world that are there only at some times of day or year (world/builder.ts Build.stalls).
import { monthOf, today } from '../sim/climate';

/** Summer festival evenings: July and August, 17:00–22:00 (the game's month and clock). */
export function festivalOn(time: number): boolean {
  const m = monthOf(today.doy), h = (((time / 3600) % 24) + 24) % 24;
  return (m === 7 || m === 8) && h >= 17 && h < 22;
}

export function timedOn(when: 'festival', time: number): boolean {
  return when === 'festival' ? festivalOn(time) : true;
}
