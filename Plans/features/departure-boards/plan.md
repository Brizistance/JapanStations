# Departure boards (発車標)

## Goal

The live platform board and the printed platform sign looked alike: both hung the same way
(`b.hang`), at about the same height, on the same thin backing, and both led with a coloured
platform-number block. Make the board unmistakably electronic, and make it livelier, while it
still reads only the timetable (rule 7).

Decisions (user, 2026-11-18):

- **Display by era.** Old lines (Y 1933, N 1961, A 1994) have 3-colour dot-matrix LED boards
  of the 1990s retrofit; new lines (S 2004, K 2015, M 2023) have full-colour LCDs. A platform
  board takes its platform line's style (Sumire rows on the Shiokaze LCD); the concourse board
  takes the station's oldest line's.
- **Physically different:** a deep metal case with a hood and two drop rods (`b.screen`), hung
  lower than the printed signs (centre pf + 2.45 against 2.72); LED dots bright enough to
  bloom, LCD a little less, printed signs below the bloom threshold; a header strip with the
  platform, line and a live clock.
- **Behaviour:** Japanese and English alternate every 4 s; an approach indicator (接近表示)
  showing where the next train is, from `trainStateAt`; a scrolling ticker (status, transfers,
  operator); an arrival flash (まもなく電車がまいります) and a doors-closing state (発車します).
- **Scope:** platform boards (`dep`) and the concourse board (`depAll`).

## Approach

- `src/signs/departures.ts`: a pure `depModel` / `depAllModel` (rows, status, approach,
  ticker, language) and two renderers per board, LED and LCD. Times only ever come from
  `nextDepartures` / `nextArrivals`.
- LED boards are drawn at dot resolution and thresholded to red / green / amber; the sign
  material turns each texel into a round dot (`fract(uv · grid)`), unlit dots faintly visible.
- Live boards near the player redraw at about 12 Hz so the ticker scrolls smoothly; the rest
  stay at 2 Hz.
- `src/signs/board-style.ts` holds the style per line (kept out of the themes to avoid an
  import cycle between `signs/` and `stations/`).

## Done when

Tests prove the board's times match the timetable, the approach state matches the train, and
all text fits both styles in both languages at every station; LED, LCD and Kita-Ōdōri's
concourse board look right in the preview.
