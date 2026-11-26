---
name: new-station
description: Rebuild or build a station's outside and its way in (streets, station building, exits, the concourse's dress). Use when the owner names a station to redesign, revamp or build, or asks for a new station street. Runs the brief at the top of docs/station-playbook.md.
---

# New station

The owner has named a station (in the arguments, or in their message). Build it by the brief, not from memory.

1. Read only "The brief" at the top of `docs/station-playbook.md` (down to "# Reference") and the "The rules" section of `docs/street-design.md`. Grep the Reference part, including its "Traps" sections, only when a step needs it.
2. The owner gives the theme, the type of place, the landmark(s) and anything about the station itself. Ask only what blocks, in one AskUserQuestion card at most. No interview rounds, no tracks.
3. Measure (playbook "Step 1"): grep the station in `src/data/network.ts` and `src/stations/specs.ts` (do not read them whole), the built station, other lines within 200 m, and each neighbour's streets and buildings at the shared edges, converted into this station's frame. Check the map's geography over the plot and 300–500 m out (water, railway, main roads, where the neighbours lie): every edge must transition well into it.
4. Grep `docs/theme-notes.md` for the theme; research only what it lacks and save the measured sizes there. Grep `docs/model-library.md` for sets that fit.
5. Plan in chat, a few lines (CLAUDE.md rule 4): the layout type and what it takes from it (different from the neighbours on the line), the streets with widths, the landmark's lot, what each of the four edges is and how it meets the map and the neighbour, and the one-line done test. Check it against the brief's sizes table, height fall-off, irregularity and everyday-things rules. No plan file, no map drawing unless asked. Wait for a yes, then add the station's theme line to `docs/worldbuilding.md`.
6. Build in the brief's two steps, the owner walks each:
   1. **Streets and landmark:** ground, roads, junctions, pavements, crossings, signals, lights, the edges, the landmark on its lot. Other lots bare.
   2. **The fill:** every other building, yards, furniture. New regular buildings are generic by theme and go into `docs/model-library.md`.
7. After each step: `npm run typecheck`, the tests near the change (`street-rules.test.ts` and the station's own), a few views in the browser including every edge, then go down the playbook's "Before reporting" list. Report in a few lines what changed, what was looked at and what was not, and send the screenshots with SendUserFile. Stop: sign-off is the owner's.

No auditor or checker subagents unless the owner asks. Keep to the cost rules in `CLAUDE.md`: grep before reading, short replies.
