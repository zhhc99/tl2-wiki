# TL2 Wiki agent guide

## Repository map

- `src/App.tsx`: application shell, hash routing, data loading, and catalogue pages.
- `src/planners.tsx`: build planner and gambling calculator UI/domain rules.
- `src/data.ts`: small hand-maintained class and mechanics reference data.
- `src/i18n.ts`: shared UI translations.
- `src/styles.css`: site-wide and feature styles.
- `scripts/import-tl2-db.mjs`: SQLite-to-browser export adapter.
- `scripts/validate-data.mjs`: published-data contract checks.
- `scripts/smoke-browser.mjs`: critical browser journeys.
- `public/data/` and `public/game-icons/`: committed generated assets.
- `tl2-wiki-data/`: ignored local upstream database project.
- `docs/implementation-notes.md`: current domain rules and implementation invariants.

## Generated data boundaries

- Never edit `public/data/*.json` or `public/game-icons/` by hand.
- Do not use `cat`, unrestricted `rg`, or ordinary text diffs on generated JSON.
- Query `tl2-wiki-data/database/tl2.sqlite` with narrow SQL selecting only the
  required rows and columns.
- For a specific generated record, use a bounded `jq` selector or explicit
  `rg --no-ignore` query.
- Review data refreshes with `git diff --stat`, validators, and concise record
  summaries. Generated JSON intentionally has normal text diffs disabled.
- Do not traverse `tl2-wiki-data/` or `agent/` unless the task specifically
  concerns upstream data or local handoff state.

## Workflows

- UI, styling, copy, and navigation tasks must not run `npm run data:refresh`.
- For UI work, run `npm run check`; run the browser smoke test when a critical
  user journey changed.
- Only database-contract, importer, or data-rule work should refresh data.
- For data work, run `npm run data:refresh`, `npm run check`, then inspect a
  concise diff/stat summary.
- `npm run build` and deployment use committed browser assets and do not need
  the local SQLite database.
- Keep one formula or projection rule at one layer. Prefer the upstream data
  project for game-data interpretation and keep the web importer mechanical.

## Code expectations

- Preserve user-input and browser-boundary validation (URL, storage,
  clipboard, imports, numeric drafts, focus, and reduced motion).
- Fail fast on missing or incompatible versioned internal data; do not silently
  replace required numbers, objects, or arrays with plausible defaults.
- Reuse the shared domain types, translations, asset helpers, and search helpers
  instead of introducing local copies.
- Split code by feature boundary when a hand-written file approaches 20–30 KB;
  avoid one-function modules and framework-heavy abstractions.
- Keep generated output compact and deterministic.

