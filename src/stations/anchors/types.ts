// Places on a Blender-built model where the game puts a sign, a clock or a screen, written out by
// the model's build script (tools/blender/kitakit.py `mark`).

/** Centre x, y, z in the model's frame (front at z = 0 facing −z), width, height, and the way it faces (x, z). */
export type AnchorPt = number[];

export interface Anchor {
  w: number;
  d: number;
  h: number;
  pts: Record<string, AnchorPt>;
}

export type Anchors = Record<string, Anchor>;
