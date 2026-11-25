---
name: new-station
description: Rebuild or build a station's outside and its way in (streets, station building, exits, the concourse's dress). Use when the owner names a station to redesign, revamp or build, or asks for a new station street. Runs the fixed procedure in docs/station-playbook.md, starting with the owner interview.
---

# New station

The owner has named a station (in the arguments, or in their message). Build it by the playbook, not from memory.

1. Read `docs/station-playbook.md` in full. Then read only the "The rules" section of `docs/street-design.md`.
2. Round 1, one AskUserQuestion card: **redo the entire area, or not?** and **the theme** (three real Japanese districts or area types that fit this place and its neighbours; grep `docs/worldbuilding.md` for the station first), and **light or full track** (playbook "Two tracks"; recommend full for hero stations, interchanges, walk-in buildings or a new theme). On the light track, round 2's questions go in this card too. If no to the first, ask which parts change, leave the rest of the outside as it is, and carry on from 3 for those parts only (no clearing, and only the stages that apply).
3. Find the station in `src/data/network.ts` and its spec in `src/stations/specs.ts` (grep for its id; do not read the files whole). Do playbook step 1: measure the built station, check for other lines near the plot, and measure where neighbouring stations' streets and buildings meet the shared edges.
4. Grep `docs/theme-notes.md` for the theme. If it has a section, read that and skip the research; if not (or on the full track, for what the notes lack), research the real district the theme names, take measured sizes from it (playbook "Research first") and save them to `docs/theme-notes.md`. Read `docs/model-library.md` for sets that fit the theme.
5. Round 2 (full track only; already asked on the light track), one AskUserQuestion card, a recommended answer first in each question, drawn from the research:
   - rebuild the whole station, or modify it (and if modify, what to keep);
   - the station building, if it gets one, and where it stands;
   - the landmarks.

   If the edge-join test, the overlap tests and the top-down view in the playbook's "Still to build" do not exist yet, build them now. Then give the plan in chat in a few lines, with a top-down 2D map, with the street grid's coordinates, how each street joins the neighbour at the edge, any change to a neighbour's outer row, what the layout takes from the real district (it must be a layout Japan would have), and any new model sets the theme needs. Check it against the playbook's sizes table, height gradient, irregularity and everyday-buildings rules. Wait for a yes, then add the station's theme line to `docs/worldbuilding.md`. No plan file.
6. After the yes and before writing any code, run the auditor in `plan` mode (see below) on the agreed plan. Fix the plan where it fails; if a fix changes what the owner agreed to, tell them and wait for a yes.
7. Clear the outside to bare ground (playbook "The order of work", 6), then build in three stages: **the station**; **the street layout and the landmarks only**, other lots bare; **the fill** with regular buildings. On the light track with a modified station, the first two stages are one. New regular buildings are generic, by theme, and go into `docs/model-library.md`. After each stage run the playbook's step 7, then the auditor in `stage` mode (stages 1 and 2 always; stage 3 only while the overlap tests do not exist). Fix every `blocks` error and run it again until it says `PASS`; fix or name each `risk`. Then report: what changed, what was looked at, what was not, and the auditor's verdict. Stop there: the owner walks it before the next stage.
8. Before each report, go down the playbook's checklist and fix what fails. Do not report a box you did not check as done.

## The auditor

`station-auditor` (`.claude/agents/station-auditor.md`) checks for build errors and reports; it does not edit, and it does not judge looks. Spawn it with the Agent tool, `subagent_type: "station-auditor"`, and set on every call:

- `model`: the model this session runs on;
- `effort`: one step above this session's effort (low → medium, medium → high, high → xhigh, xhigh → max, max → max). If you cannot tell this session's effort, use `high`.

The prompt gives it the mode, the station id(s), the measurements from step 2, and the plan text (`plan`) or a few lines on what the stage changed (`stage`). One auditor per run, covering every station in the build. Do not tell the owner a stage is done on a `FAIL`.

Keep to the project's cost rules in `CLAUDE.md`: grep before reading, no subagents but the auditor unless asked, short replies.
