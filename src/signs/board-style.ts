// What a line's departure boards (発車標) are built as, by its era. Old lines got 3-colour
// dot-matrix LED boards in the 1990s retrofit; lines opened since 2000 have full-colour LCDs.
// Kept here rather than in the line themes so signs/ doesn't import the station builders.
// `opened` must match the line's theme (checked in boards.test.ts).

import { linesAt } from '../data/network';
import type { LineId, StationId } from '../data/types';

export type BoardStyle = 'led' | 'lcd';

export const BOARD: Record<LineId, { style: BoardStyle; opened: number }> = {
  Y: { style: 'led', opened: 1933 },
  N: { style: 'led', opened: 1961 },
  A: { style: 'led', opened: 1994 },
  S: { style: 'lcd', opened: 2004 },
  K: { style: 'lcd', opened: 2015 },
  M: { style: 'lcd', opened: 2023 },
  G: { style: 'lcd', opened: 2026 },
};

export const lineBoard = (id: LineId): BoardStyle => BOARD[id]?.style ?? 'lcd';

/** A concourse board was put up with the station's oldest line. */
export function stationBoard(id: StationId): BoardStyle {
  const oldest = [...linesAt(id)].sort((a, b) => (BOARD[a.id]?.opened ?? 9999) - (BOARD[b.id]?.opened ?? 9999))[0];
  return oldest ? lineBoard(oldest.id) : 'lcd';
}
