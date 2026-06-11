# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository. This is
the vendor-neutral companion to `CLAUDE.md`.

## What this project is

`alpha-mask-events` is a small browser library that makes pointer events fall
through the **transparent** pixels of an image and only register on the
**opaque** pixels. It does this by sampling the image's alpha channel on an
off-screen canvas and toggling each element's CSS `pointer-events` between
`auto` and `none`. A companion Node CLI pre-computes masks offline.

## Repository map

| Path | What it is | Notes |
| ---- | ---------- | ----- |
| `src/index.js` | Public API: `init`, `register`, `unregister`, `setThreshold` | Thin wrapper over `Manager` |
| `src/manager.js` | The `Manager` class — all hit-testing logic | The heart of the library |
| `bin/generate-masks.js` | `ame-generate-masks` CLI | Lazy-loads the optional `canvas` package |
| `types/index.d.ts` | TypeScript declarations | Keep in sync with the public API |
| `rollup.config.js` | Bundles `src/` to ESM/CJS/UMD in `dist/` | `dist/` is generated, not committed |
| `__tests__/` | Jest tests | jsdom env for browser code, node env for the CLI |
| `demo/` | Interactive demo deployed to GitHub Pages | Plain HTML/JS |
| `eslint.config.js` | Flat ESLint config | Browser globals for `src`, Node globals for `bin` |

## Commands

```bash
npm install            # canvas is OPTIONAL; install may skip building it
npm run build          # Rollup → dist/
npm test               # Jest (ESM via --experimental-vm-modules)
npm run lint           # ESLint over src + bin

# single test file
node --experimental-vm-modules node_modules/.bin/jest __tests__/manager.test.js
```

All three of `lint`, `build`, and `test` must pass before committing. CI runs
them on Linux, macOS, and Windows (Node 18/20/22).

## The `canvas` dependency — read this first

`canvas` is a **native** module (Cairo/Pango/etc.) and is declared as an
**`optionalDependency`**. It is used **only** by the CLI, never by the browser
library or the browser tests.

- A fresh `npm install` may leave `canvas` unbuilt/absent on machines without
  the system libraries. **That is expected and fine.**
- `jsdom` *optionally* requires `canvas`; a **half-installed** `canvas` (JS
  present, native binary missing) breaks jsdom and therefore **every** test
  suite. If tests fail with `Cannot find module '../build/Release/canvas.node'`,
  remove the broken module (`rm -rf node_modules/canvas`) or install its
  system libraries — do **not** "fix" it by mocking jsdom.
- The CLI integration tests (`__tests__/generate-masks.test.js`) detect the
  real `canvas` via `createRequire` and **skip** themselves when it is
  unavailable, so `npm test` stays green everywhere.
- If you add code that needs `canvas`, load it lazily (see `loadCanvas()` in
  `bin/generate-masks.js`) and degrade gracefully when it is missing.

## Conventions

- **ES modules only** (`"type": "module"`). Use `import`/`export`.
- **2-space indentation**, camelCase for vars/functions, PascalCase for classes,
  ALL_CAPS for module-level constants.
- **JSDoc** every exported/public function with parameter and return types.
- Keep the **public API** (`src/index.js`), the **types** (`types/index.d.ts`),
  and the **README** in sync when changing behavior.
- Prefer **optional catch bindings** (`catch { ... }`) when the error is unused
  (ESLint forbids unused vars).
- Browser code must guard modern APIs (`PointerEvent`, `ResizeObserver`,
  `IntersectionObserver`) for absence.

## Testing notes

- Browser tests run under **jsdom** and mock `Image`, canvas contexts, and the
  observers — see `jest.setup.js` and `__tests__/__mocks__/`.
- The Jest `moduleNameMapper` maps `^canvas$` to a mock, so in-process tests
  never touch the native module. Child-process CLI tests do (hence the skip).
- Pure CLI logic (`blurAlpha`, `maskToRects`, `hasTransparency`,
  `processImages`) is unit-tested with a stub canvas in
  `__tests__/cli-mask-logic.test.js` — extend that for new logic.

## Before you open a PR

1. `npm run lint && npm run build && npm test` — all green.
2. Update `types/index.d.ts`, `README.md`, and `CHANGELOG.md` if the public
   surface changed.
3. Do **not** commit `dist/` or `node_modules/`.
