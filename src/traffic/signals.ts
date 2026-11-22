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
/**
 * A signal's road: 0 the main road, 1 the road crossing it; 2 and 3 the same at a scramble junction.
 * A scramble keeps the same 60 s cycle (so it stays in step with its neighbours) but shares it out
 * differently: main road green 0–20 (yellow to 23), crossing road green 26–42 (yellow to 45), then
 * every car red while people cross every way at once: walk 47–56, flashing to 59. Nobody walks with
 * the traffic there.
 */
export type SigAxis = 0 | 1 | 2 | 3;

export function signalState(axis: SigAxis, t: number): { car: 'green' | 'yellow' | 'red'; walk: 'go' | 'flash' | 'stop'; arrow: boolean; left: number } {
  if (axis > 1) {
    const u = ((t % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
    const [g0, g1, y1] = axis === 2 ? [0, 20, 23] : [26, 42, 45];
    const car = u >= g0 && u < g1 ? 'green' : u >= g1 && u < y1 ? 'yellow' : 'red';
    const walk = u >= 47 && u < 56 ? 'go' : u >= 56 && u < 59 ? 'flash' : 'stop';
    const left = walk === 'go' ? (56 - u) / 9 : walk === 'flash' ? 0 : (u < 47 ? 47 - u : SIGNAL_CYCLE - u + 47) / (SIGNAL_CYCLE - 12);
    return { car, walk, arrow: false, left };
  }
  const u = (((t + (axis ? SIGNAL_CYCLE / 2 : 0)) % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  const g0 = axis ? 3 : 0;
  const car = u < g0 ? 'red' : u < 25 ? 'green' : u < 28 ? 'yellow' : 'red';
  const walk = u < g0 ? 'stop' : u < 20 ? 'go' : u < 25 ? 'flash' : 'stop';
  const wait = SIGNAL_CYCLE - 25 + g0;
  const left = walk === 'go' ? (20 - u) / (20 - g0) : walk === 'flash' ? 0 : (u < g0 ? g0 - u : SIGNAL_CYCLE - u + g0) / wait;
  return { car, walk, arrow: axis === 0 && u >= 28.5 && u < 32.5, left };
}
