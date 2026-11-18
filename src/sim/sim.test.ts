import { describe, expect, it } from 'vitest';
import { LINES, STATIONS, linesAt } from '../data/network';
import { NET, carPose, lineSim, type CarPose } from './index';
import { CAR_PITCH, FLAT_M, HALL_HALF, TAIL_END } from './geometry';
import { nextDepartures, platformDoorOpen, trainStateAt } from './timetable';

describe('network data', () => {
  it('every station lies on the alignment of each line that serves it', () => {
    for (const l of NET) l.geom.stopError.forEach((e) => expect(e).toBeLessThan(0.5));
  });
  it('every station is served by a line and numbered on it', () => {
    for (const s of STATIONS) {
      const ls = linesAt(s.id);
      expect(ls.length).toBeGreaterThan(0);
      for (const l of ls) expect(s.numbers[l.id]).toMatch(new RegExp(`^${l.id}-\\d\\d$`));
    }
  });
  it('stations sit on straight track with room for the turnback sidings', () => {
    for (const l of NET) {
      const g = l.geom;
      for (const s of g.stopS) {
        const a = g.path.pointAt(s - HALL_HALF - 10), b = g.path.pointAt(s + HALL_HALF + 10);
        expect(Math.abs(a.tx - b.tx) + Math.abs(a.tz - b.tz)).toBeLessThan(1e-6);
      }
      expect(g.firstS).toBeGreaterThan(TAIL_END);
      expect(g.path.length - g.lastS).toBeGreaterThan(TAIL_END);
      for (let i = 1; i < g.stopS.length; i++) expect(g.stopS[i] - g.stopS[i - 1]).toBeGreaterThan(2 * FLAT_M + 100);
    }
  });
  it('the interchange has both lines at the same point, at different depths', () => {
    const y = lineSim('Y').geom, n = lineSim('N').geom;
    const py = y.point(y.stopS[2], 0), pn = n.point(n.stopS[2], 0);
    expect(Math.hypot(py.x - pn.x, py.z - pn.z)).toBeLessThan(0.5);
    expect(Math.abs(py.y - pn.y)).toBeGreaterThan(6);
  });
});

describe('timetable', () => {
  it('cycle is a whole number of headways and phases are contiguous', () => {
    for (const { tt } of NET) {
      expect(tt.cycle).toBe(tt.trainCount * tt.headway);
      expect(tt.phases[0].t0).toBe(0);
      expect(tt.phases[tt.phases.length - 1].t1).toBe(tt.cycle);
      for (let i = 1; i < tt.phases.length; i++) expect(tt.phases[i].t0).toBe(tt.phases[i - 1].t1);
    }
  });
  it('trains move continuously: no jumps in position, and within speed limits', () => {
    const pa: CarPose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, pb = { ...pa };
    for (const { tt, geom } of NET) {
      const dt = 0.25;
      for (let t = 0; t < tt.cycle; t += dt) {
        const a = trainStateAt(tt, 0, t), b = trainStateAt(tt, 0, t + dt);
        carPose(geom, a, 0, pa);
        carPose(geom, b, 0, pb);
        const d = Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z);
        expect(d).toBeLessThan(geom.def.service.maxSpeed * dt * 1.05 + 0.01);
      }
    }
  });
  it('trains on a line never come within a train length of each other', () => {
    for (const { tt, geom } of NET) {
      const len = geom.def.service.cars * CAR_PITCH;
      const p: CarPose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, q = { ...p };
      for (let t = 0; t < tt.cycle; t += 1) {
        const states = Array.from({ length: tt.trainCount }, (_, k) => trainStateAt(tt, k, t));
        for (let i = 0; i < states.length; i++) {
          for (let j = i + 1; j < states.length; j++) {
            // Compare car centres: trains on parallel tracks may pass, so use true 3D distance.
            const mid = (geom.def.service.cars - 1) / 2;
            carPose(geom, states[i], Math.floor(mid), p);
            carPose(geom, states[j], Math.floor(mid), q);
            const d = Math.hypot(p.x - q.x, p.z - q.z);
            const sameTrackish = Math.abs(states[i].s - states[j].s) < len;
            if (sameTrackish) expect(d).toBeGreaterThan(2 * geom.def.trackOffset - 0.2);
          }
        }
      }
    }
  });
  it('a train is at the platform with doors open before each listed departure', () => {
    for (const { tt, geom } of NET) {
      for (let stop = 0; stop < geom.stopS.length; stop++) {
        for (const dir of ['down', 'up'] as const) {
          const deps = nextDepartures(tt, stop, dir, 36000, 3);
          const boards = !(dir === 'down' ? stop === geom.stopS.length - 1 : stop === 0);
          expect(deps.length).toBe(boards ? 3 : 0);
          for (const d of deps) {
            expect(d.dep).toBeGreaterThanOrEqual(36000);
            const st = trainStateAt(tt, d.train, d.dep - 8);
            expect(st.phase.kind).toBe('dwell');
            expect(Math.abs(st.s - geom.stopS[stop])).toBeLessThan(1e-6);
            expect(st.doorOpen).toBe(1);
            expect(platformDoorOpen(tt, stop, dir, d.dep - 8)).toBe(1);
            expect(trainStateAt(tt, d.train, d.dep - 0.5).doorOpen).toBe(0);
          }
        }
      }
    }
  });
  it('headways are regular', () => {
    for (const { tt } of NET) {
      const deps = nextDepartures(tt, 1, 'down', 0, 5);
      for (let i = 1; i < deps.length; i++) expect(deps[i].dep - deps[i - 1].dep).toBe(tt.headway);
    }
    expect(LINES.length).toBe(2);
  });
});
