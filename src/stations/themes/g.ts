// Ichō Line theme (opened 2026). The deepest line: a plain vaulted cavern for now, warm gold
// light. Its own ceiling, lights, pillars and benches come with the station looks (stage 4).

import type { LineTheme } from './types';

export const theme: LineTheme = {
  opened: 2026,
  // Ginkgo gold: warm highlights, cool deep shadows.
  grade: { warmth: 0.2, tint: 0.04, sat: 1.03, contrast: 0.14, fade: 0, shadow: [0.006, 0.004, 0.012] },
  vault: true,
  vaultMat: 'flat:#ece6d6',
  pillarHalf: 0.3,
};
