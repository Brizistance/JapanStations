import { describe, expect, it } from 'vitest';
import { K_BESIDE_N, LINES, STATIONS, S_BESIDE_A, lineById, linesAt } from '../data/network';
import { hallDims } from '../stations/kit';
import { NET, carPose, lineSim, type CarPose } from './index';
import { CAR_PITCH, FLAT_M, HALL_HALF, TAIL_END } from './geometry';
import { nextDepartures, platformDoorOpen, trainStateAt } from './timetable';

/** Do these two lines run on the same track somewhere (through-running)? */
const sharesTrack = (a: string, b: string) => lineById(a).shares?.line === b || lineById(b).shares?.line === a;

/**
 * Is chainage s on a through-running line's shared section, including the approaches where its
 * track merges into (and leaves) the host's? The host's own chainage is mapped by projection.
 */
function onSharedSection(g: (typeof NET)[number]['geom'], s: number): boolean {
  const APPROACH = 450;
  for (const m of NET) {
    const sh = m.geom.def.shares;
    if (!sh) continue;
    const s0 = m.geom.stopS[m.geom.def.stops.indexOf(sh.from)] - APPROACH;
    const s1 = m.geom.stopS[m.geom.def.stops.indexOf(sh.to)] + APPROACH;
    if (g === m.geom) return s >= s0 && s <= s1;
    if (g.def.id === sh.line) {
      const p = g.path.pointAt(s), q = m.geom.path.project(p.x, p.z);
      if (q.dist < 20 && q.s >= s0 && q.s <= s1) return true;
    }
  }
  return false;
}

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
    expect(shared.map((s) => s.id).sort()).toEqual(['aizomecho', 'daigaku-mae', 'hanamizuki', 'hibarino', 'kawaminato-ko', 'kita-odori', 'midorizaka', 'tomyobori', 'tsumugibashi', 'watayamachi']);
    for (const s of shared) {
      const at = linesAt(s.id).map((l) => {
        const g = lineSim(l.id).geom, ss = g.stopS[l.stops.indexOf(s.id)];
        return { id: l.id, p: g.point(ss, 0), t: g.path.pointAt(ss) };
      });
      for (let i = 0; i < at.length; i++) {
        for (let j = i + 1; j < at.length; j++) {
          const a = at[i], b = at[j];
          const dot = a.t.tx * b.t.tx + a.t.tz * b.t.tz;
          if (sharesTrack(a.id, b.id) && !s.at?.[a.id] && !s.at?.[b.id]) {
            // Through-running: the same platform, so the same point, direction and depth.
            expect(Math.hypot(a.p.x - b.p.x, a.p.z - b.p.z)).toBeLessThan(0.05);
            expect(dot).toBeGreaterThan(1 - 1e-6);
            expect(Math.abs(a.p.y - b.p.y)).toBeLessThan(1e-6);
            continue;
          }
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
            // Side by side: parallel, same direction, same depth, one hall wall + 0.5 m + the other's apart.
            expect(dot).toBeGreaterThan(1 - 1e-6);
            expect(Math.abs(a.p.y - b.p.y)).toBeLessThan(1e-6);
            // Halls next to each other, or with a third parallel hall between them (A | S | M at the hub).
            const gap = (x: typeof a, y: typeof a) => hallDims(lineById(x.id), x.p.y).wallZ + 0.5 + hallDims(lineById(y.id), y.p.y).wallZ;
            const d = Math.hypot(a.p.x - b.p.x, a.p.z - b.p.z);
            const between = at.find((c) => c !== a && c !== b && Math.abs(c.t.tx * a.t.tx + c.t.tz * a.t.tz) > 0.5
              && Math.hypot(a.p.x - c.p.x, a.p.z - c.p.z) > 1 && Math.hypot(b.p.x - c.p.x, b.p.z - c.p.z) > 1 && Math.abs(Math.hypot(a.p.x - c.p.x, a.p.z - c.p.z) + Math.hypot(c.p.x - b.p.x, c.p.z - b.p.z) - d) < 1e-3);
            expect(d).toBeCloseTo(between ? gap(a, between) + gap(between, b) : gap(a, b), 3);
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
  it('the Kikyō Line runs beside the Nagisa Line at Tsumugibashi by the same rule', () => {
    expect(hallDims(lineById('N'), -11.5).wallZ + 0.5 + hallDims(lineById('K'), -11.5).wallZ).toBeCloseTo(K_BESIDE_N, 6);
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
          // A through-running line merges into its host's track: skip the shared section and its approaches.
          if (onSharedSection(ga, sa) || onSharedSection(gb, q.s)) continue;
          // Only where the centrelines actually meet (within a twin-tunnel width), not near misses.
          if (q.dist > 1.5 || q.s <= 0 || q.s >= gb.path.length) continue;
          const atStation = ga.stopS.some((s) => Math.abs(s - sa) < HALL_HALF) || gb.stopS.some((s) => Math.abs(s - q.s) < HALL_HALF);
          if (atStation) continue;
          expect(Math.abs(ga.railY(sa) - gb.railY(q.s)), `${ga.def.id}/${gb.def.id} at ${Math.round(p.x)},${Math.round(p.z)}`).toBeGreaterThan(7);
        }
      }
    }
  });
  it('a through-running line lies exactly on the host line track over the shared section', () => {
    for (const { geom: g } of NET) {
      const sh = g.def.shares;
      if (!sh) continue;
      const h = lineSim(sh.line).geom;
      const s0 = g.stopS[g.def.stops.indexOf(sh.from)], s1 = g.stopS[g.def.stops.indexOf(sh.to)];
      for (let s = s0; s <= s1; s += 5) {
        const p = g.path.pointAt(s), q = h.path.project(p.x, p.z);
        expect(q.dist, `${g.def.id} off ${h.def.id} at ${Math.round(s)}`).toBeLessThan(0.05);
        expect(Math.abs(g.railY(s) - h.railY(q.s)), `${g.def.id} rail level at ${Math.round(s)}`).toBeLessThan(0.02);
      }
      // It passes the host's stations in between without stopping, and stops at both ends.
      for (const id of g.def.passes ?? []) expect(g.def.stops).not.toContain(id);
    }
  });
  it('the Akanesuji Line stays underground from Shiosai-kōen to Hoshimine', () => {
    // Open only at the ends: Shin-Kamome (viaduct on the island), Kasumidani (cutting) and Shiondai (viaduct).
    const a = lineSim('A').geom;
    const h = a.def.stops.indexOf('hoshimine');
    expect(Math.max(...a.def.railY.slice(1, h + 1))).toBeLessThan(-6);
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
  it('through-running trains never meet the host line trains on the shared track', () => {
    for (const m of NET) {
      const sh = m.geom.def.shares;
      if (!sh) continue;
      const host = lineSim(sh.line);
      const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
      const span = (m.tt.cycle * host.tt.cycle) / gcd(m.tt.cycle, host.tt.cycle);
      const len = m.geom.def.service.cars * CAR_PITCH;
      const mid = Math.floor((m.geom.def.service.cars - 1) / 2);
      const p: CarPose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, q = { ...p };
      let closest = Infinity;
      for (let t = 0; t < span; t += 1) {
        for (let i = 0; i < m.tt.trainCount; i++) {
          const a = trainStateAt(m.tt, i, t);
          if (!onSharedSection(m.geom, a.s) || a.track === 'xoverStart' || a.track === 'xoverEnd') continue;
          carPose(m.geom, a, mid, p);
          for (let j = 0; j < host.tt.trainCount; j++) {
            const b = trainStateAt(host.tt, j, t);
            // Same direction on the shared section means the same track (both lines run "down" the same way).
            if (b.track !== a.track) continue;
            carPose(host.geom, b, mid, q);
            const d = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
            closest = Math.min(closest, d);
            expect(d, `${m.geom.def.id} train ${i} and ${sh.line} train ${j} at t=${t}`).toBeGreaterThan(len + 20);
          }
        }
      }
      expect(closest).toBeLessThan(Infinity);
    }
  });
  it('headways are regular', () => {
    for (const { tt } of NET) {
      const deps = nextDepartures(tt, 1, 'down', 0, 5);
      for (let i = 1; i < deps.length; i++) expect(deps[i].dep - deps[i - 1].dep).toBe(tt.headway);
    }
    expect(LINES.length).toBe(6);
  });
});
