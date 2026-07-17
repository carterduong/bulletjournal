# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single, purely client-side SPA — a "Weekly Bullet Journal" built with React and bundled by Vite. There is **no backend, no database, and no environment variables**; all data is persisted in the browser's `localStorage`.

**Package manager:** pnpm (pinned via `packageManager` in `package.json`). Use `pnpm` for all installs and scripts — do not use npm or yarn.

Services / commands (see `package.json` scripts):
- Install: `pnpm install`
- Run (dev): `pnpm dev` — starts the Vite dev server on `http://localhost:5173` with HMR.
- Build: `pnpm build` — produces an optimized production build in `dist/`. The `dist/` directory is gitignored; do not commit build output.
- Preview: `pnpm preview` — serves the production build locally for verification.
- Test: `pnpm test` — runs Vitest once (`vitest run`). Use `pnpm test:watch` for watch mode. Tests cover `src/utils/dateUtils.ts` (leap years, week boundaries, year spans).
- Typecheck: included in `pnpm build` via `tsc -b`.
- Lint: none configured.

Non-obvious notes:
- `pnpm-lock.yaml` is committed; `package-lock.json` / `yarn.lock` are gitignored.
- The app uses React 19 with TypeScript, Vite 6, `@vitejs/plugin-react`, Tailwind CSS v4, and Vitest.
- All state is component-local (`useState`); persistence uses `localStorage` with keys like `M.D.YYYY`, `weekend-N`, `this-week-N`, `this-month-N`, `next-month-N`.
- `getDatesFromWeekNumber` always uses the **current calendar year** (`new Date().getFullYear()`), so tests that cover it freeze time with Vitest fake timers.
