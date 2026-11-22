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
5. After the yes and before writing any code, run the auditor in `plan` mode (see below) on the agreed plan. Fix the plan where it fails; if a fix changes what the owner agreed to, tell them and wait for a yes.
6. Build in stages (streets and models, then the buildings you walk into and anything below ground, then the dress). After each stage run the playbook's step 7, then the auditor in `stage` mode. Fix every `blocks` error and run it again until it says `PASS`; fix or name each `risk`. Then report: what changed, what was looked at, what was not, and the auditor's verdict. Stop there: the owner walks it before the next stage.
7. Before each report, go down the playbook's checklist and fix what fails. Do not report a box you did not check as done.

## The auditor

`station-auditor` (`.claude/agents/station-auditor.md`) checks for build errors and reports; it does not edit, and it does not judge looks. Spawn it with the Agent tool, `subagent_type: "station-auditor"`, and set on every call:

- `model`: the model this session runs on;
- `effort`: one step above this session's effort (low → medium, medium → high, high → xhigh, xhigh → max, max → max). If you cannot tell this session's effort, use `high`.

The prompt gives it the mode, the station id(s), the measurements from step 2, and the plan text (`plan`) or a few lines on what the stage changed (`stage`). One auditor per run, covering every station in the build. Do not tell the owner a stage is done on a `FAIL`.

Keep to the project's cost rules in `CLAUDE.md`: grep before reading, no subagents but the auditor unless asked, short replies.
