# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single, purely client-side SPA — a "Weekly Bullet Journal" built with React and bundled by Vite. There is **no backend, no database, and no environment variables**; all data is persisted in the browser's `localStorage`.

Services / commands (see `package.json` scripts):
- Run (dev): `npm run dev` — starts the Vite dev server on `http://localhost:5173` with HMR.
- Build: `npm run build` — produces an optimized production build in `dist/`. The `dist/` directory is gitignored; do not commit build output.
- Preview: `npm run preview` — serves the production build locally for verification.
- Test: `npm test` — runs Vitest once (`vitest run`). Use `npm run test:watch` for watch mode. Tests cover `src/utils/dateUtils.js` (leap years, week boundaries, year spans).
- Lint: none configured.

Non-obvious notes:
- No lockfile is committed (`package-lock.json` is gitignored), so `npm install` resolves fresh each time.
- The app uses React 19 with Vite 6, `@vitejs/plugin-react`, Tailwind CSS v4, and Vitest.
- All state is component-local (`useState`); persistence uses `localStorage` with keys like `M.D.YYYY`, `weekend-N`, `this-week-N`, `this-month-N`, `next-month-N`.
- `getDatesFromWeekNumber` always uses the **current calendar year** (`new Date().getFullYear()`), so tests that cover it freeze time with Vitest fake timers.
