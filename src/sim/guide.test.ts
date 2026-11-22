import { describe, expect, it } from 'vitest';
import { LINES } from '../data/network';
import { lineSim } from './index';
import { nextStep, trainCalls } from './guide';
import { findRoute } from './route';
import { nextDepartures, trainStateAt } from './timetable';

const T = 10 * 3600;
const line = LINES[0], { tt } = lineSim(line.id), last = line.stops.length - 1;

/** A train of the first line in passenger service heading down, part-way along. */
function trainHeadingDown() {
  for (let i = 0; i < tt.trainCount; i++) {
    const st = trainStateAt(tt, i, T);
    const p = st.phase;
    if (p.kind === 'run' && p.inService && p.dir === 'down' && p.toStop >= 2 && p.toStop <= last - 2) return st;
  }
  throw new Error('no such train at this time');
}

describe('trainCalls', () => {
  it('lists the stops ahead with the times the timetable gives that train', () => {
    const st = trainHeadingDown(), p = st.phase as Extract<typeof st.phase, { kind: 'run' }>;
    const calls = trainCalls(tt, p, st.tau, T);
    expect(calls.map((c) => c.stop)).toEqual(Array.from({ length: last - p.toStop + 1 }, (_, k) => p.toStop + k));
    for (let k = 1; k < calls.length; k++) expect(calls[k].arr).toBeGreaterThan(calls[k - 1].arr);
    // The same train is the one the departure board announces at its next stop.
    const d = nextDepartures(tt, p.toStop, 'down', T, 1)[0];
    expect(d.train).toBe(st.index);
    expect(calls[0].arr).toBeCloseTo(d.arr, 6);
  });

  it('is empty for a train that is not carrying passengers', () => {
    for (let i = 0; i < tt.trainCount; i++) {
      for (let t = T; t < T + tt.cycle; t += 20) {
        const st = trainStateAt(tt, i, t), p = st.phase;
        if (p.kind === 'run' ? !p.inService : p.role === 'arrival' || p.role === 'reverse') {
          expect(trainCalls(tt, p, st.tau, t)).toEqual([]);
          return;
        }
      }
    }
    throw new Error('no out-of-service phase found');
  });
});

describe('nextStep', () => {
  it('says arrived at the destination and gives the route\'s first leg elsewhere', () => {
    expect(nextStep(line.stops[3], T, { station: line.stops[3] })).toEqual({ kind: 'arrived' });
    const step = nextStep(line.stops[last], T, { station: line.stops[0] })!;
    const r = findRoute(line.stops[0], line.stops[last], T)!;
    expect(step.kind).toBe('board');
    if (step.kind === 'board') {
      expect(step.leg).toEqual(r.legs[0]);
      expect(step.arr).toBe(r.arr);
    }
  });

  it('rides through to a destination ahead on the same train', () => {
    const st = trainHeadingDown(), p = st.phase as Extract<typeof st.phase, { kind: 'run' }>;
    const step = nextStep(line.stops[p.toStop + 1], T, { tt, phase: p, tau: st.tau })!;
    expect(step).toMatchObject({ kind: 'ride', alight: line.stops[p.toStop + 1], stops: 2, here: false, rest: [] });
  });

  it('gets off at the next stop when the destination is behind', () => {
    const st = trainHeadingDown(), p = st.phase as Extract<typeof st.phase, { kind: 'run' }>;
    const step = nextStep(line.stops[p.toStop - 1], T, { tt, phase: p, tau: st.tau })!;
    expect(step).toMatchObject({ kind: 'ride', alight: line.stops[p.toStop], stops: 1 });
    if (step.kind === 'ride') expect(step.rest.length).toBeGreaterThan(0);
  });

  it('says so on a train that is out of service', () => {
    for (let t = T; t < T + tt.cycle; t += 20) {
      const st = trainStateAt(tt, 0, t), p = st.phase;
      if (p.kind === 'run' && !p.inService) {
        expect(nextStep(line.stops[0], t, { tt, phase: p, tau: st.tau })).toEqual({ kind: 'off' });
        return;
      }
    }
    throw new Error('no out-of-service run found');
  });
});
