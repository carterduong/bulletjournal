# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single, purely client-side SPA — a "Weekly Bullet Journal" built with LitElement and bundled by webpack 4. There is **no backend, no database, and no environment variables**; all data is persisted in the browser's `localStorage`.

Services / commands (see `package.json` scripts):
- Run (dev): `npm run dev` — starts `webpack-dev-server` on `http://localhost:8080`. Note the `--open` flag tries to launch a system browser; in a headless VM this open step is harmless and the server still serves at port 8080.
- Build: `npm run build` — runs webpack and writes the generated bundle (`app.js`) plus copied `index.html` and `style.css` to the **repository root** (not a `dist/` folder). These generated files are git-tracked, so a normal build produces no diff; avoid committing build output changes.
- Lint / test: none configured (no lint or test scripts, no test framework).

Non-obvious notes:
- No lockfile is committed (`package-lock.json` is gitignored), so `npm install` resolves fresh each time.
- Despite webpack 4's usual OpenSSL incompatibility on Node 17+, the installed `webpack@4.47.0` builds fine on the VM's Node 22 with no `--openssl-legacy-provider` workaround needed.
- The `webpack.config.js` `devServer.contentBase` points at `./dist` (which doesn't exist); this is irrelevant because webpack serves the compiled assets from memory at `/`.
