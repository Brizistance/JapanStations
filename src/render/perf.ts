// What one frame costs, for the dev readout (window.__sim.perf()): WebGL draw calls and triangles
// over every pass of the frame (scene, occlusion, shadows, post), and the smoothed time the
// frame's JavaScript took. Written by Scene.tsx.

import type { Scene } from 'three';

export const perfStats = { calls: 0, tris: 0, ms: 0, scene: null as Scene | null };
