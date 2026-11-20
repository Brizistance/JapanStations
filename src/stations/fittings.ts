// The default fittings inside every station, as Blender models in three eras
// (tools/blender/build_station.py → public/models/buildings/station.glb).
//
// The shared parts (kit.ts, looks/parts.ts) place them: each keeps the footprint and collider it
// had as a plain box, so no layout moves. A machine's face is still a drawn sign over the model.
import type { Builder } from '../world/builder';

/** Old: before 1970 (enamel and timber). Mid: 1970 to 2005 (beige steel). New: after 2005. */
export type Era = 'old' | 'mid' | 'new';
export const eraOf = (year: number): Era => (year < 1970 ? 'old' : year <= 2005 ? 'mid' : 'new');

// The era of the line whose hall or concourse is being built, for parts that are not told one.
let cur: Era = 'mid';
export const setEra = (year: number) => {
  cur = eraOf(year);
};
export const era = () => cur;

/** Place one model, its origin at (x, y, z) and its front towards `face`. No collider. */
export function fitting(b: Builder, id: string, x: number, y: number, z: number, face: [number, number] = [0, -1]) {
  const d = b.dir(face);
  b.out.models.push({ kind: 'station', id, pos: b.pt(x, y, z), yaw: Math.atan2(-d[0], -d[1]) + 0, seed: 0, merge: true });
}

/**
 * Stand-alone IC card reader post (簡易IC改札機), entry or exit, its pad towards `face`: for a way
 * in or out with no gate line. Solid.
 */
export function icPost(b: Builder, way: 'in' | 'out', x: number, y: number, z: number, face: [number, number]) {
  fitting(b, `ic_${way}`, x, y, z, face);
  const hx = face[0] !== 0 ? 0.25 : 0.17, hz = face[0] !== 0 ? 0.17 : 0.25;
  b.block(x - hx, y, z - hz, x + hx, y + 1.1, z + hz);
}

/** Slim MINACA charge and balance machine, 0.6 wide and 0.5 deep, its screen towards `face`. Solid. */
export function icCharge(b: Builder, x: number, y: number, z: number, face: [number, number]) {
  fitting(b, 'ic_charge', x, y, z, face);
  const hx = face[0] !== 0 ? 0.25 : 0.3, hz = face[0] !== 0 ? 0.3 : 0.25;
  b.block(x - hx, y, z - hz, x + hx, y + 1.55, z + hz);
  b.sign({ k: 'label', text: 'ICチャージ', sub: 'MINACA charge', fg: '#fff', bg: '#c2185b' }, x + face[0] * (0.25 - 0.094), y + 1.45, z + face[1] * (0.25 - 0.094), face, 0.56, 0.16);
}
