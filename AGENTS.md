# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single, purely client-side SPA — a "Weekly Bullet Journal" built with React and bundled by Vite. There is **no backend, no database, and no environment variables**; all data is persisted in the browser's `localStorage`.

Services / commands (see `package.json` scripts):
- Run (dev): `npm run dev` — starts the Vite dev server on `http://localhost:5173` with HMR.
- Build: `npm run build` — produces an optimized production build in `dist/`. The `dist/` directory is gitignored; do not commit build output.
- Preview: `npm run preview` — serves the production build locally for verification.
- Lint / test: none configured (no lint or test scripts, no test framework).

Non-obvious notes:
- No lockfile is committed (`package-lock.json` is gitignored), so `npm install` resolves fresh each time.
- The app uses React 19 with Vite 6 and `@vitejs/plugin-react`.
- All state is component-local (`useState`); persistence uses `localStorage` with keys like `M.D.YYYY`, `weekend-N`, `this-week-N`, `this-month-N`, `next-month-N`.
