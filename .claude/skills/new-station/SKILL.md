---
name: new-station
description: Rebuild or build a station's outside and its way in (streets, station building, exits, the concourse's dress). Use when the owner names a station to redesign, revamp or build, or asks for a new station street. Runs the fixed procedure in docs/station-playbook.md, starting with the owner interview.
---

# New station

The owner has named a station (in the arguments, or in their message). Build it by the playbook, not from memory.

1. Read `docs/station-playbook.md` in full. Then read only the "The rules" section of `docs/street-design.md`.
2. Find the station in `src/data/network.ts` and its spec in `src/stations/specs.ts` (grep for its id; do not read the files whole). Do playbook step 1: measure the built station and check for other lines near the plot.
3. Interview the owner with AskUserQuestion, a recommended answer first in each question:
   - the real Japanese district the outside takes after;
   - the station building, if it gets one, and where it stands;
   - the landmarks;
   - how far below ground the rebuild goes;
   - what to keep from the station as it is.
4. Give the plan in chat in a few lines, with the street grid's coordinates, and wait for a yes. No plan file.
5. Build in stages (streets and models, then the buildings you walk into and anything below ground, then the dress). After each stage run the playbook's step 7 and report: what changed, what was looked at, what was not. Stop there: the owner walks it before the next stage.
6. Before each report, go down the playbook's checklist and fix what fails. Do not report a box you did not check as done.

Keep to the project's cost rules in `CLAUDE.md`: grep before reading, no subagents unless asked, short replies.
