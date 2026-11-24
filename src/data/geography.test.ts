// The water stays off the stations: inside a plot only a station's own sea (52 m off its road) or its own
// canal may be water, and that sea or canal must go on as water at the plot's edge.

import { describe, expect, it } from 'vitest';
import { isWater } from './geography';
import { STATION_WORLDS, RAIL_WORLDS } from '../stations/index';
import { SPECS } from '../stations/specs';

const SEA_Z = 52;

describe('geography', () => {
  for (const w of [...STATION_WORLDS, ...RAIL_WORLDS]) {
    it(`water keeps clear of ${w.def.id}`, () => {
      const f = w.frame, p = w.build.plot, north = p.north ?? p.z;
      const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
      const world = (lx: number, lz: number): [number, number] => [f.x + lx * c + lz * s, f.z - lx * s + lz * c];
      const sf = (SPECS as Record<string, { surface?: { right?: string; left?: string; canalAt?: number } }>)[w.def.id]?.surface;
      const own = (lx: number, lz: number) =>
        (sf?.right === 'sea' && lz > SEA_Z - 2) || (sf?.left === 'sea' && lz < -SEA_Z + 2) || (sf?.canalAt !== undefined && Math.abs(lx - sf.canalAt) < 12);
      const wet: string[] = [];
      for (let lx = -p.x + 1; lx <= p.x - 1; lx += 4)
        for (let lz = -north + 1; lz <= p.z - 1; lz += 4) if (!own(lx, lz) && isWater(...world(lx, lz))) wet.push(`(${lx.toFixed(0)}, ${lz.toFixed(0)})`);
      expect(wet.slice(0, 6), 'water on the station’s land').toEqual([]);
      const dry: string[] = [];
      if (sf?.right === 'sea') for (let lx = -p.x + 4; lx <= p.x - 4; lx += 8) if (!isWater(...world(lx, p.z + 2))) dry.push(`sea at x ${lx}`);
      if (sf?.left === 'sea') for (let lx = -p.x + 4; lx <= p.x - 4; lx += 8) if (!isWater(...world(lx, -north - 2))) dry.push(`sea at x ${lx}`);
      if (sf?.canalAt !== undefined) for (const lz of [-north - 2, p.z + 2]) if (!isWater(...world(sf.canalAt, lz))) dry.push(`canal at z ${lz}`);
      expect(dry, 'its own water runs dry past the plot').toEqual([]);
    });
  }
});
