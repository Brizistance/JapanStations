import { describe, expect, it } from 'vitest';
import { LINES, STATIONS, S_BESIDE_A, linesAt } from '../data/network';
import { hallDims } from '../stations/kit';
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
  it('every interchange has its lines crossing at right angles and different depths, or side by side', () => {
    const shared = STATIONS.filter((s) => linesAt(s.id).length > 1);
    expect(shared.map((s) => s.id).sort()).toEqual(['aizomecho', 'daigaku-mae', 'kita-odori', 'tsumugibashi']);
    for (const s of shared) {
      const at = linesAt(s.id).map((l) => {
        const g = lineSim(l.id).geom, ss = g.stopS[l.stops.indexOf(s.id)];
        return { id: l.id, p: g.point(ss, 0), t: g.path.pointAt(ss) };
      });
      for (let i = 0; i < at.length; i++) {
        for (let j = i + 1; j < at.length; j++) {
          const a = at[i], b = at[j];
          const dot = a.t.tx * b.t.tx + a.t.tz * b.t.tz;
          const beside = (s.at?.[a.id] || s.at?.[b.id]) && Math.abs(dot) > 0.5;
          if (s.at?.[a.id] || s.at?.[b.id]) {
            // A line placed beside another still crosses the third at right angles, on its centreline.
            const [m, n] = s.at?.[a.id] ? [b, a] : [a, b];
            if (!beside) {
              const g = lineSim(m.id).geom;
              expect(g.path.project(n.p.x, n.p.z).dist).toBeLessThan(0.5);
              expect(Math.abs(a.p.y - b.p.y)).toBeGreaterThan(6);
              expect(Math.abs(dot)).toBeLessThan(1e-6);
              continue;
            }
          }
          if (beside) {
            // Side by side, in the hub's B4 box: parallel, same direction, same depth, 15.9 m apart.
            expect(dot).toBeGreaterThan(1 - 1e-6);
            expect(Math.abs(a.p.y - b.p.y)).toBeLessThan(1e-6);
            expect(Math.hypot(a.p.x - b.p.x, a.p.z - b.p.z)).toBeCloseTo(S_BESIDE_A, 3);
          } else {
            expect(Math.hypot(a.p.x - b.p.x, a.p.z - b.p.z)).toBeLessThan(0.5);
            expect(Math.abs(a.p.y - b.p.y)).toBeGreaterThan(6);
            expect(Math.abs(dot)).toBeLessThan(1e-6);
          }
        }
      }
    }
  });
  it('the hub box fits the line beside the Akanesuji Line', () => {
    // hub.ts places the box at A's wall + 0.5 m structure + half its 15.4 m width.
    const a = lineSim('A').geom.def, s = lineSim('S').geom.def;
    expect(hallDims(a, -20).wallZ + 0.5 + 15.4 / 2).toBeCloseTo(S_BESIDE_A, 6);
    expect(hallDims(s, -20).wallZ * 2).toBeCloseTo(15.4, 6);
  });
  it('lines that cross between stations are far enough apart in depth', () => {
    // Running tunnels are about 6 m tall; keep 7 m between rail levels wherever two lines cross
    // outside a station (inside one, the interchange test above applies).
    const step = 2;
    for (let i = 0; i < NET.length; i++) {
      for (let j = i + 1; j < NET.length; j++) {
        const ga = NET[i].geom, gb = NET[j].geom;
        for (let sa = 0; sa < ga.path.length; sa += step) {
          const p = ga.path.pointAt(sa);
          const q = gb.path.project(p.x, p.z);
          // Only where the centrelines actually meet (within a twin-tunnel width), not near misses.
          if (q.dist > 1.5 || q.s <= 0 || q.s >= gb.path.length) continue;
          const atStation = ga.stopS.some((s) => Math.abs(s - sa) < HALL_HALF) || gb.stopS.some((s) => Math.abs(s - q.s) < HALL_HALF);
          if (atStation) continue;
          expect(Math.abs(ga.railY(sa) - gb.railY(q.s)), `${ga.def.id}/${gb.def.id} at ${Math.round(p.x)},${Math.round(p.z)}`).toBeGreaterThan(7);
        }
      }
    }
  });
  it('the Akanesuji Line stays in bored tunnel end to end', () => {
    // The Akanesuji Line never surfaces: no open cut or viaduct to draw.
    const a = lineSim('A').geom;
    expect(Math.max(...a.def.railY)).toBeLessThan(-6);
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
    expect(LINES.length).toBe(4);
  });
});
