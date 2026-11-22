import { describe, expect, it } from 'vitest';
import { LINES } from '../data/network';
import { lineSim } from '../sim';
import { trains, updateTrains } from '../trains/system';
import { toWorld } from '../world/collision';
import { nearestStation, player, tickPlayer } from './player';

// A frame at 60 a second: a longer step would carry the passenger clean past a thin wall.
const T = 10 * 3600, DT = 1 / 60;

describe('riding a train', () => {
  it('keeps a passenger standing in a car on board for the whole run of every line, both ways', () => {
    updateTrains(T);
    const lost: string[] = [];
    for (const line of LINES) {
      const train = trains.find((t) => t.sim.geom.def.id === line.id && t.index === 0)!;
      const { tt } = lineSim(line.id);
      let aboard = false, reported = false;
      for (let t = T; t < T + tt.cycle; t += DT) {
        updateTrains(t);
        const p = train.state.phase;
        const carrying = p.kind === 'run' ? p.inService : p.role === 'intermediate' || p.role === 'departure';
        if (!carrying) {
          aboard = false;
          continue;
        }
        if (!aboard) {
          // Step aboard: the middle of the second car, on its floor.
          const car = train.cars[1];
          updateTrains(t); // twice, so the car's last pose is this one and the first step carries nobody anywhere
          toWorld(car, [0, car.inside!.min[1] + 0.32, 0], player.body.pos);
          player.body.vy = 0;
          player.body.grounded = true;
          player.body.ride = car;
          aboard = true;
          reported = false;
        }
        tickPlayer(DT);
        if (!train.cars.includes(player.body.ride!) && !reported) {
          reported = true;
          const s = nearestStation(player.body.pos[0], player.body.pos[2]);
          const where = `${line.id} ${p.dir} near ${s.world.def.id}`;
          if (!lost.some((x) => x.startsWith(where))) lost.push(`${where} (${Math.round(s.dist)} m from its centre)`);
          aboard = false;
        }
      }
    }
    expect(lost).toEqual([]);
  }, 300_000);
});
