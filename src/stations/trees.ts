// Trees as Blender models (tools/blender/build_trees.py → public/models/buildings/trees.glb): twelve
// kinds common in Japan, in two sizes. The renderer draws the version for the current season
// (src/render/season.ts); evergreens look the same all year.
import type { Builder } from '../world/builder';
import { GROUND_Y } from './kit';

export type TreeKind =
  | 'ginkgo' | 'zelkova' | 'dogwood' | 'tokaede' | 'azalea' | 'cherry' | 'momiji' | 'pine' | 'camphor' | 'cedar' | 'willow' | 'bamboo';

/** Half width of each kind's collider (the trunk; a hedge or a clump is its whole foot) and its height. */
const FOOT: Record<TreeKind, [number, number]> = {
  ginkgo: [0.22, 3], zelkova: [0.28, 3], dogwood: [0.12, 2.5], tokaede: [0.18, 3], azalea: [0.4, 0.7], cherry: [0.26, 2.2],
  momiji: [0.16, 2], pine: [0.3, 2.5], camphor: [0.55, 3], cedar: [0.32, 3], willow: [0.26, 3], bamboo: [0.8, 3],
};

/** One tree at (x, z), turned by its position so that neighbours differ. `size` 'b' is the smaller form. */
/** `street`: a tree in a pavement, with an iron grate round its foot and, for the smaller form, support stakes. */
export function modelTree(b: Builder, kind: TreeKind, x: number, z: number, size: 'a' | 'b' = 'a', y = GROUND_Y, street = false) {
  if (street) {
    b.out.models.push({ kind: 'trees', id: 'grate', pos: b.pt(x, y, z), yaw: 0, seed: 0, merge: true });
    if (size === 'b') b.out.models.push({ kind: 'trees', id: 'stakes', pos: b.pt(x, y, z), yaw: ((Math.abs(Math.round(x)) % 2) * Math.PI) / 2, seed: 0, merge: true });
  }
  const turn = kind === 'azalea' ? 0 : ((Math.abs(Math.round(x * 13 + z * 7)) % 12) * Math.PI) / 6;
  b.out.models.push({ kind: 'trees', id: `${kind}_${size}`, pos: b.pt(x, y, z), yaw: turn, seed: 0, merge: true });
  const [hw, h] = FOOT[kind], k = size === 'b' ? 0.8 : 1;
  if (kind === 'azalea') b.block(x - 0.9 * k, y, z - hw, x + 0.9 * k, y + h, z + hw);
  else b.block(x - hw * k, y, z - hw * k, x + hw * k, y + h, z + hw * k);
}
