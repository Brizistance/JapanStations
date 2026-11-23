import { describe, expect, it } from 'vitest';
import { STATION_WORLDS } from '../stations';
import type { LanePart } from '../world/builder';
import { longLanes, runOns } from '../world/runon';
import { SIGNAL_CYCLE, signalState } from './signals';
import { entered, makeTraffic, routePoint, stepTraffic, warmUp, type Traffic, type Vehicle } from './system';
import { VEH, MOVING, family, timeFactor } from './vehicles';

const lane = (o: Partial<LanePart> = {}): LanePart => ({ from: [0, 0, 0], to: [200, 0, 0], speed: 11, flow: 10, use: 'all', taxi: 0.2, stops: [], halts: [], ...o });
const EIGHT = 8 * 3600;

function run(tr: Traffic, from: number, seconds: number, each?: (t: number) => void, dt = 0.05) {
  for (let t = from; t < from + seconds; t += dt) {
    stepTraffic(tr, dt, t);
    each?.(t);
  }
}

/** True if the two vehicles' footprints (shrunk by `slack` all round) do not overlap: separating axes. */
function apart(a: Vehicle, b: Vehicle, slack = 0.1): boolean {
  const dx = b.x - a.x, dz = b.z - a.z;
  for (const [ux, uz] of [[a.hx, a.hz], [-a.hz, a.hx], [b.hx, b.hz], [-b.hz, b.hx]]) {
    const ra = Math.abs(a.hx * ux + a.hz * uz) * (a.len / 2 - slack) + Math.abs(-a.hz * ux + a.hx * uz) * (a.wid / 2 - slack);
    const rb = Math.abs(b.hx * ux + b.hz * uz) * (b.len / 2 - slack) + Math.abs(-b.hz * ux + b.hx * uz) * (b.wid / 2 - slack);
    if (Math.abs(dx * ux + dz * uz) > ra + rb) return true;
  }
  return false;
}
function noOverlap(tr: Traffic, where = '') {
  const l = tr.list;
  for (let i = 0; i < l.length; i++) {
    for (let j = i + 1; j < l.length; j++) {
      if (Math.abs(l[i].x - l[j].x) > 14 || Math.abs(l[i].z - l[j].z) > 14 || Math.abs(l[i].y - l[j].y) > 3) continue;
      if (!apart(l[i], l[j])) expect.fail(`${where}: ${l[i].model} at ${l[i].x.toFixed(1)}, ${l[i].z.toFixed(1)} overlaps ${l[j].model} at ${l[j].x.toFixed(1)}, ${l[j].z.toFixed(1)}`);
    }
  }
}

/** A crossroads at (0, 0): a main road along x (lanes at z = ∓2.5), a road across it along z (x = ±2), all signalled. */
function crossroads(tee = false): LanePart[] {
  const S = 120, stop = (axis: 0 | 1) => [{ at: S - 12, axis, exit: S + 12 }];
  const main = [lane({ from: [-S, 0, -2.5], to: [S, 0, -2.5], stops: stop(0) }), lane({ from: [S, 0, 2.5], to: [-S, 0, 2.5], stops: stop(0) })];
  if (tee) {
    return [...main,
      lane({ from: [-2, 0, S], to: [-2, 0, -2.6], flow: 5, use: 'general', stops: stop(1), dead: true }),
      lane({ from: [2, 0, -2.6], to: [2, 0, S], flow: 0, use: 'general' })];
  }
  return [...main, lane({ from: [-2, 0, S], to: [-2, 0, -S], flow: 5, stops: stop(1) }), lane({ from: [2, 0, -S], to: [2, 0, S], flow: 5, stops: stop(1) })];
}

describe('traffic', () => {
  it('has a size for every moving model', () => {
    for (const id of MOVING) expect(VEH[family(id)]).toBeDefined();
  });

  it('is busiest at the rush hours and nearly gone at night', () => {
    expect(timeFactor(8 * 3600)).toBe(1);
    expect(timeFactor(18 * 3600)).toBe(1);
    expect(timeFactor(3 * 3600)).toBeLessThan(0.1);
    expect(timeFactor(13 * 3600)).toBeLessThan(1);
    expect(timeFactor(27 * 3600)).toBe(timeFactor(3 * 3600));
    const count = (t: number) => {
      const tr = makeTraffic([lane()], 3);
      warmUp(tr, t, 600);
      return tr.list.length;
    };
    expect(count(EIGHT)).toBeGreaterThan(count(3 * 3600) + 1);
    // The rush hours stand out from the day, and the day from the late evening.
    expect(timeFactor(13 * 3600)).toBeLessThan(0.7);
    expect(timeFactor(22 * 3600)).toBeLessThan(timeFactor(13 * 3600) / 2);
  });

  it('carries more or less traffic with the density setting', () => {
    const through = (level: number) => {
      const tr = makeTraffic([lane()], 6);
      let n = 0;
      for (let t = EIGHT; t < EIGHT + 900; t += 0.1) {
        const before = tr.list.length;
        stepTraffic(tr, 0.1, t, null, undefined, level);
        n += Math.max(0, tr.list.length - before);
      }
      return n;
    };
    const light = through(0.5), normal = through(1), busy = through(1.6);
    expect(normal).toBeGreaterThan(light * 1.5);
    expect(busy).toBeGreaterThan(normal * 1.25);
  });

  it('changes its mix with the hour', () => {
    const share = (hour: number, is: (model: string) => boolean) => {
      const tr = makeTraffic([lane({ use: 'general', flow: 30, taxi: 0.15 })], 8);
      const seen = new Set<Vehicle>();
      // (At full density, so that the night has enough vehicles to count.)
      for (let t = hour * 3600; t < hour * 3600 + 1800; t += 0.2) {
        stepTraffic(tr, 0.2, t, null, undefined, 1 / timeFactor(t));
        for (const v of tr.list) seen.add(v);
      }
      return [...seen].filter((v) => is(v.model)).length / seen.size;
    };
    const taxi = (m: string) => m === 'taxi', truck = (m: string) => ['truck', 'gomi', 'keitruck'].includes(m);
    expect(share(2, taxi)).toBeGreaterThan(share(13, taxi) * 2);
    expect(share(8, truck)).toBeGreaterThan(share(20, truck) * 1.4);
  });

  it('flows without vehicles ever overlapping', () => {
    const tr = makeTraffic([lane(), lane({ from: [0, 0, 4], to: [200, 0, 4], use: 'bus', flow: 4, halts: [{ at: 100, side: 0 }] })], 7);
    run(tr, EIGHT, 400, () => noOverlap(tr));
    expect(tr.list.length).toBeGreaterThan(3);
  });

  it('stops at a red signal, queues, and goes on green', () => {
    const stop = 100;
    const tr = makeTraffic([lane({ stops: [{ at: stop, axis: 0, exit: 125 }] })], 11);
    // From the start of a cycle: the main road has green.
    const t0 = Math.ceil(EIGHT / SIGNAL_CYCLE) * SIGNAL_CYCLE;
    let crossedOnRed = 0, crossedOnGreen = 0, queued = 0;
    const before = new Map<object, number>();
    run(tr, t0, SIGNAL_CYCLE * 4, (t) => {
      noOverlap(tr);
      const light = signalState(0, t).car;
      let waiting = 0;
      for (const v of tr.list) {
        const nose = v.s + v.len / 2, was = before.get(v) ?? nose;
        if (was <= stop + 0.3 && nose > stop + 0.3) (light === 'red' ? crossedOnRed++ : crossedOnGreen++);
        if (light === 'red' && v.v < 0.05 && nose <= stop + 0.3 && nose > stop - 40) waiting++;
        before.set(v, nose);
      }
      queued = Math.max(queued, waiting);
    });
    expect(crossedOnRed).toBe(0);
    expect(crossedOnGreen).toBeGreaterThan(10);
    expect(queued).toBeGreaterThan(1);
  });

  it('brakes for a person in the lane and drives on when they leave', () => {
    const tr = makeTraffic([lane()], 5);
    const person = { x: 120, y: 0, z: 0.4 };
    for (let t = EIGHT; t < EIGHT + 120; t += 0.05) {
      stepTraffic(tr, 0.05, t, person);
      for (const v of tr.list) expect(v.s + v.len / 2).toBeLessThan(person.x - 0.5);
    }
    expect(tr.list.length).toBeGreaterThan(1);
    expect(entered(tr, 0)[0].v).toBe(0);
    run(tr, EIGHT + 120, 30);
    expect(entered(tr, 0)[0].s).toBeGreaterThan(person.x);
    // Somebody on the pavement stops nobody.
    const tr2 = makeTraffic([lane()], 5);
    for (let t = EIGHT; t < EIGHT + 60; t += 0.05) stepTraffic(tr2, 0.05, t, { x: 120, y: 0, z: 4 });
    expect(entered(tr2, 0)[0]?.s ?? 999).toBeGreaterThan(125);
  });

  it('does not drive into a vehicle of a crossing lane', () => {
    // A lane across the first one, blocked by a person just past the crossing: its queue stands in the junction.
    const tr = makeTraffic([lane(), lane({ from: [100, 0, -100], to: [100, 0, 100], flow: 8 })], 9);
    const person = { x: 100, y: 0, z: 8 };
    for (let t = EIGHT; t < EIGHT + 200; t += 0.05) {
      stepTraffic(tr, 0.05, t, person);
      noOverlap(tr);
    }
  });

  it('turns left and right at a signalled crossroads without touching anything', () => {
    const tr = makeTraffic(crossroads(), 13);
    expect(tr.lanes[0].turns.map((t) => t.left).sort()).toEqual([false, true]);
    let left = 0, right = 0;
    const still = new Map<Vehicle, number>(), done = new Set<Vehicle>();
    run(tr, EIGHT, 600, () => {
      noOverlap(tr, 'crossroads');
      for (const v of tr.list) {
        const turn = v.route.turn;
        if (turn && v.s > turn.arc1 && !done.has(v)) {
          done.add(v);
          if (turn.left) left++;
          else right++;
        }
        still.set(v, v.v < 0.05 ? (still.get(v) ?? 0) + 0.05 : 0);
        if (still.get(v)! > 2 * SIGNAL_CYCLE) expect.fail(`a ${v.model} stood at ${v.x.toFixed(1)}, ${v.z.toFixed(1)}`);
      }
    });
    expect(left).toBeGreaterThan(5);
    expect(right).toBeGreaterThan(3);
    expect(tr.cleared).toBe(0);
  });

  it('keeps a right turn clear of oncoming traffic that is moving', () => {
    const tr = makeTraffic(crossroads(), 21);
    run(tr, EIGHT, 600, () => {
      for (const v of tr.list) {
        const turn = v.route.turn;
        // In the oncoming half of the junction, on its arc.
        if (!turn || turn.left || v.s <= turn.hold + 1 || v.s >= turn.arc1) continue;
        for (const o of tr.list) {
          if (!o.lane || !turn.oncoming.some((c) => c.lane === o.lane)) continue;
          const near = Math.hypot(o.x - v.x, o.z - v.z) < 3.2;
          if (near && o.v > 3) expect.fail(`a moving oncoming ${o.model} close to a right-turner at ${v.x.toFixed(1)}, ${v.z.toFixed(1)}`);
        }
      }
    });
  });

  it('sends everybody off a side street that ends at the main road, both ways', () => {
    const tr = makeTraffic(crossroads(true), 17);
    expect(tr.lanes[2].turns.length).toBe(2);
    let out = 0, onto = 0;
    const seen = new Set<Vehicle>();
    run(tr, EIGHT, 600, () => {
      noOverlap(tr, 'tee');
      for (const v of tr.list) {
        // Nobody drives off the end of the side street.
        if (v.origin.index === 2) expect(v.route.turn).not.toBeNull();
        if (seen.has(v) || !v.route.turn || v.s < v.route.turn.arc1) continue;
        seen.add(v);
        if (v.origin.index === 2) onto++;
        else out++;
      }
    });
    expect(onto).toBeGreaterThan(10);
    expect(out).toBeGreaterThan(3);
    expect(tr.cleared).toBe(0);
  });

  it('pulls a bus in to the kerb at its stop and back into its lane', () => {
    const tr = makeTraffic([lane({ use: 'bus', flow: 6, halts: [{ at: 100, side: 2.3 }] })], 3);
    let stood = 0, back = 0;
    const seen = new Set<Vehicle>();
    run(tr, EIGHT, 600, () => {
      noOverlap(tr, 'bus bay');
      for (const v of tr.list) {
        if (v.model !== 'bus') continue;
        // At the kerb, by the stop, standing.
        if (v.dwell > 0) {
          expect(v.z).toBeLessThan(-2.2);
          expect(Math.abs(v.x - 100)).toBeLessThan(1);
          if (!seen.has(v)) stood++;
          seen.add(v);
        }
        if (seen.has(v) && v.served === 1 && v.x > 150) {
          expect(Math.abs(v.z)).toBeLessThan(0.01);
          back++;
        }
      }
    });
    expect(stood).toBeGreaterThan(1);
    expect(back).toBeGreaterThan(0);
    expect(tr.cleared).toBe(0);
  });

  it('keeps a taxi stand stocked, never fuller than it is long', () => {
    const tr = makeTraffic([lane({ use: 'bus', flow: 6, taxi: 0.5, halts: [{ at: 100, side: 2.3, rank: 3 }] })], 4);
    expect(tr.list.length).toBe(3);
    let left = 0, most = 0, fewest = 9;
    const waited = new Set<Vehicle>();
    run(tr, EIGHT, 900, () => {
      noOverlap(tr, 'taxi stand');
      // On the stand: off the lane, at the kerb.
      const on = tr.list.filter((v) => v.z < -2.2);
      most = Math.max(most, on.length);
      fewest = Math.min(fewest, on.filter((v) => v.served === 0).length);
      for (const v of on) {
        expect(v.model).toBe('taxi');
        expect(v.x).toBeLessThan(106);
        waited.add(v);
      }
      for (const v of waited) {
        if (v.served === 1 && v.x > 150) {
          waited.delete(v);
          left++;
        }
      }
    });
    expect(most).toBeLessThanOrEqual(3);
    expect(most).toBeGreaterThan(1);
    expect(fewest).toBeGreaterThan(0);
    expect(left).toBeGreaterThan(2);
    expect(tr.cleared).toBe(0);
  });

  it('stops at a zebra crossing for somebody on it, and at a closed level crossing', () => {
    const zebra = makeTraffic([lane({ yields: [{ at: 97, zone: [98, -6, 103, 6] }] })], 2);
    // On the far kerb, well out of the lane, but on the crossing.
    for (let t = EIGHT; t < EIGHT + 90; t += 0.05) {
      stepTraffic(zebra, 0.05, t, { x: 100, y: 0, z: 5 });
      for (const v of zebra.list) expect(v.s + v.len / 2).toBeLessThan(97.4);
    }
    expect(zebra.list.length).toBeGreaterThan(1);
    // Beside the road but not at the crossing: nobody stops.
    const free = makeTraffic([lane({ yields: [{ at: 97, zone: [98, -6, 103, 6] }] })], 2);
    for (let t = EIGHT; t < EIGHT + 90; t += 0.05) stepTraffic(free, 0.05, t, { x: 60, y: 0, z: 5 });
    expect(entered(free, 0)[0].s).toBeGreaterThan(110);

    const gate = makeTraffic([lane({ gates: [{ at: 90, line: 'N', station: 'x' }] })], 2);
    let shut = true;
    for (let t = EIGHT; t < EIGHT + 90; t += 0.05) {
      stepTraffic(gate, 0.05, t, null, (line, station) => shut && line === 'N' && station === 'x');
      for (const v of gate.list) expect(v.s + v.len / 2).toBeLessThan(90.4);
    }
    shut = false;
    for (let t = EIGHT + 90; t < EIGHT + 120; t += 0.05) stepTraffic(gate, 0.05, t, null, () => shut);
    expect(entered(gate, 0)[0].s).toBeGreaterThan(100);
  });
});

describe('street lanes', () => {
  const withLanes = STATION_WORLDS.filter((w) => w.build.lanes.length);

  it('exist on most streets', () => {
    expect(withLanes.length).toBeGreaterThan(30);
  });

  it('keep left', () => {
    for (const w of withLanes) {
      for (const l of w.build.lanes) {
        // (A small street's single one-way lane has no other way to keep left of.)
        if (l.use === 'minor') continue;
        // A lane and one going the other way on the same road: this one lies to the left of the other.
        const dx = l.to[0] - l.from[0], dz = l.to[2] - l.from[2], n = Math.hypot(dx, dz);
        const opp = w.build.lanes.find((o) => o.use !== 'minor' && (o.to[0] - o.from[0]) * dx + (o.to[2] - o.from[2]) * dz < 0
          && Math.abs((o.from[0] - l.from[0]) * dz - (o.from[2] - l.from[2]) * dx) / n < 30);
        if (!opp) continue;
        // Left of the direction (dx, dz), seen from above with x east and z south, is (dz, −dx).
        const side = ((l.from[0] - opp.to[0]) * dz - (l.from[2] - opp.to[2]) * dx) / n;
        expect(side, `${w.def.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('and the turns between them are clear of everything solid', () => {
    for (const w of withLanes) {
      const solids = w.build.boxes.filter((b) => b.solid);
      const hits = (x0: number, z0: number, x1: number, z1: number, y: number) =>
        solids.find((b) => b.max[1] > y + 0.25 && b.min[1] < y + 1.4 && b.min[0] < x1 && b.max[0] > x0 && b.min[2] < z1 && b.max[2] > z0);
      const tr = makeTraffic(w.build.lanes, 1);
      for (const { part: l, turns, busRoute, rankRoute } of tr.lanes) {
        const half = l.use === 'cycle' ? 0.4 : l.use === 'general' ? 0.95 : 1.3, y = l.from[1];
        const x0 = Math.min(l.from[0], l.to[0]), x1 = Math.max(l.from[0], l.to[0]);
        const z0 = Math.min(l.from[2], l.to[2]), z1 = Math.max(l.from[2], l.to[2]);
        const alongX = x1 - x0 > z1 - z0;
        // The lane's corridor, short of the plot's edge walls.
        const hit = alongX ? hits(x0 + 1.5, z0 - half, x1 - 1.5, z1 + half, y) : hits(x0 - half, z0 + 1.5, x1 + half, z1 - 1.5, y);
        if (hit) expect.fail(`${w.def.id}: lane ${l.from} → ${l.to} runs into a box at ${hit.min} … ${hit.max}`);
        // The bays by the kerb, as wide as a bus or a taxi.
        for (const [route, wide] of [[busRoute, 1.3], [rankRoute, 0.95]] as const) {
          if (!route || route.pieces.length < 2) continue;
          for (let s = route.pieces[1].start; s <= route.pieces[6].start; s += 0.5) {
            const [x, z] = routePoint(route, s);
            const h = alongX ? hits(x - 0.5, z - wide, x + 0.5, z + wide, y) : hits(x - wide, z - 0.5, x + wide, z + 0.5, y);
            if (h) expect.fail(`${w.def.id}: a bay at ${x.toFixed(1)}, ${z.toFixed(1)} runs into a box at ${h.min} … ${h.max}`);
          }
        }
        for (const t of turns) {
          for (let s = t.arc0; s <= t.arc1; s += 0.5) {
            const [x, z] = routePoint(t.route, s);
            const h = hits(x - 0.9, z - 0.9, x + 0.9, z + 0.9, y);
            if (h) expect.fail(`${w.def.id}: a turn at ${x.toFixed(1)}, ${z.toFixed(1)} runs into a box at ${h.min} … ${h.max}`);
          }
        }
      }
    }
  });

  it('run on past the plot edge at most stations', () => {
    const n = withLanes.filter((w) => runOns(w).some(([before, after]) => before || after)).length;
    expect(n).toBeGreaterThan(25);
    // All four signalled stations among them.
    for (const id of ['kita-odori', 'tsumugibashi', 'hyotanbori', 'minamihorie']) {
      const w = withLanes.find((s) => s.def.id === id)!;
      expect(runOns(w).filter(([before, after]) => before || after).length, id).toBeGreaterThan(1);
    }
  });

  it('carry traffic through every signalled junction for ten minutes without a knot', () => {
    for (const w of withLanes.filter((s) => s.build.lanes.some((l) => l.stops.length))) {
      const tr = makeTraffic(longLanes(w), 5);
      const still = new Map<Vehicle, number>();
      let turned = 0;
      const seen = new Set<Vehicle>();
      run(tr, EIGHT, 600, () => {
        noOverlap(tr, w.def.id);
        for (const v of tr.list) {
          // (A taxi waiting on the stand is not stuck.)
          still.set(v, v.v < 0.05 && !((v.route.merge || v.route.slow) && v.served === 0) ? (still.get(v) ?? 0) + 0.1 : 0);
          if (still.get(v)! > 2 * SIGNAL_CYCLE) expect.fail(`${w.def.id}: a ${v.model} stood at ${v.x.toFixed(1)}, ${v.z.toFixed(1)}`);
          if (v.route.turn && v.s > v.route.turn.arc1 && !seen.has(v)) {
            seen.add(v);
            turned++;
          }
        }
      }, 0.1);
      expect(tr.cleared, `${w.def.id}: vehicles cleared from a knot`).toBe(0);
      expect(turned, `${w.def.id}: vehicles that turned`).toBeGreaterThan(3);
    }
  }, 120000);

  it('take buses and taxis round the Hibarino rotary and back onto the main road', () => {
    const w = withLanes.find((s) => s.def.id === 'hibarino')!;
    const tr = makeTraffic(longLanes(w), 5);
    const routes = new Set(tr.lanes.flatMap((l) => l.detours.map((d) => d.route)));
    expect(routes.size, 'detour routes').toBe(4);
    const round = new Set<Vehicle>(), served = new Set<Vehicle>();
    run(tr, EIGHT, 900, () => {
      noOverlap(tr, 'hibarino');
      for (const v of tr.list) if (routes.has(v.route)) {
        if (v.served > 0) served.add(v);
        if (v.s > v.route.len - 60) round.add(v);
      }
    }, 0.1);
    expect(tr.cleared, 'vehicles cleared from a knot').toBe(0);
    expect(served.size, 'vehicles that stopped in the rotary').toBeGreaterThan(4);
    expect(round.size, 'vehicles back on the main road').toBeGreaterThan(4);
  }, 120000);
});
