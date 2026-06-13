# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **`canvas` is now an `optionalDependency`** instead of a hard dependency. The
  browser library installs with no native build on any OS; `canvas` is required
  only for the `ame-generate-masks` CLI.
- The CLI now **lazily loads `canvas`** and prints platform-specific
  installation guidance (Linux/macOS/Windows) when it is unavailable, instead of
  crashing.
- ESLint now also lints `bin/`, using Node globals there and browser globals in
  `src/`.

### Added
- **Cross-platform CI** (`.github/workflows/ci.yml`): lint + build + test on
  Linux, macOS, and Windows across Node 18/20/22.
- `AGENTS.md`, `CONTRIBUTING.md`, and this `CHANGELOG.md`.
- Cross-platform unit tests for the CLI's pure logic
  (`__tests__/cli-mask-logic.test.js`), using a stub canvas.
- `engines` field (`node >= 18`) in `package.json`.

### Fixed
- Six ESLint errors in `src/manager.js` (unused `catch` bindings / empty block).
- CLI integration tests now **skip** (instead of failing) when the native
  `canvas` module is unavailable, keeping `npm test` green on every OS.
- Demo HTML: removed a duplicate `</body>` tag, updated the stale CDN version
  pin, and switched demo images to a same-origin asset for reliable rendering on
  GitHub Pages.
- Rewrote the README (real CI badge, live-demo link, accurate dependency/OS
  notes, an AI-agent section) and removed dead files (`cleanup.js`,
  `quick-test.js`, `quick-fix-test.js`, legacy `.eslintrc.js`).

## [1.0.1]

- Initial published release: browser library, `ame-generate-masks` CLI,
  multi-format support, custom events, and TypeScript types.

[Unreleased]: https://github.com/themorgantown/alpha-mask-events/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/themorgantown/alpha-mask-events/releases/tag/v1.0.1
