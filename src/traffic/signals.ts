// The traffic signals' clock: read by the signal lenses (signs/draw.ts) and by the vehicles
// (traffic/system.ts), so what the lamps show is what the traffic does.

/** Length of the signal cycle in seconds, and where each road's green, yellow and red fall in it. */
export const SIGNAL_CYCLE = 60;
/**
 * State of the signals of one road at sim time t. Main road (axis 0): green 0–25, yellow 25–28, then
 * its right-turn arrow 28.5–32.5 with red, red to 60. The roads crossing it (axis 1) run half a cycle
 * later and wait 3 s for that arrow: green 33–55, yellow 55–58, so there are 2 s of all-red before the
 * main road's green. `walk` is the pedestrian head that goes with that traffic: green until 20 s into
 * the phase, flashing for 5, then red. `left` is the share of the current walk or wait still to run
 * (the countdown bars).
 */
export function signalState(axis: 0 | 1, t: number): { car: 'green' | 'yellow' | 'red'; walk: 'go' | 'flash' | 'stop'; arrow: boolean; left: number } {
  const u = (((t + (axis ? SIGNAL_CYCLE / 2 : 0)) % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  const g0 = axis ? 3 : 0;
  const car = u < g0 ? 'red' : u < 25 ? 'green' : u < 28 ? 'yellow' : 'red';
  const walk = u < g0 ? 'stop' : u < 20 ? 'go' : u < 25 ? 'flash' : 'stop';
  const wait = SIGNAL_CYCLE - 25 + g0;
  const left = walk === 'go' ? (20 - u) / (20 - g0) : walk === 'flash' ? 0 : (u < g0 ? g0 - u : SIGNAL_CYCLE - u + g0) / wait;
  return { car, walk, arrow: axis === 0 && u >= 28.5 && u < 32.5, left };
}
