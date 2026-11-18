// One theme per line, keyed by line id. A line without one keeps the kit's default look.

import { theme as a } from './a';
import { theme as k } from './k';
import { theme as m } from './m';
import { theme as n } from './n';
import { theme as s } from './s';
import type { LineTheme } from './types';
import { theme as y } from './y';

const THEMES: Record<string, LineTheme> = { Y: y, N: n, A: a, S: s, K: k, M: m };

const NONE: Partial<LineTheme> = {};

export function themeFor(lineId: string): Partial<LineTheme> {
  return THEMES[lineId] ?? NONE;
}

export type { HallInfo, LineTheme } from './types';
