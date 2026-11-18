# Conventions

## Workflow

- **Keep it loose.** Iterate on working things and avoid heavy process.
- **Plan docs for features and stations only.** Write `Plans/<area>/<name>/plan.md` (for example `Plans/stations/kitahama-bashi/plan.md` or `Plans/features/route-diagram/plan.md`), then wait for approval before building. Bug fixes and tweaks skip this step.
- **When a decision is made, update the relevant doc** in `docs/`, so the docs don't drift from reality.
- **Custom skills:** once a workflow has been repeated two or three times (adding a station, adding a line), turn it into a project skill in `.claude/skills/`. Planned skills: `new-station`, `new-line`.

## Code

_TBD once the project is scaffolded._ Defaults until then:

- TypeScript with strict mode
- File names: `kebab-case.ts`, components `PascalCase.tsx`
- Station and line IDs: lowercase ASCII slugs (`kitahama-bashi`), with no macrons in IDs

## Text

- Display romaji uses macrons (Ō, ū). IDs and file names never do.
- Japanese text is stored as UTF-8 in data files, not escaped.
