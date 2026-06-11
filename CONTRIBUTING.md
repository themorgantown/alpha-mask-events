# Contributing to Alpha Mask Events

Thanks for your interest in improving this project! 🎉

## Getting started

```bash
git clone https://github.com/themorgantown/alpha-mask-events.git
cd alpha-mask-events
npm install
```

`canvas` is an **optional** dependency used only by the CLI. If it fails to
build on your machine, the browser library and its tests still work — see the
[CLI install notes](README.md#installing-the-clis-native-dependency) if you want
to work on the CLI.

## Development workflow

| Task | Command |
| ---- | ------- |
| Build (Rollup → `dist/`) | `npm run build` |
| Run tests | `npm test` |
| Run one test file | `node --experimental-vm-modules node_modules/.bin/jest __tests__/manager.test.js` |
| Lint | `npm run lint` |
| Regenerate test fixtures (needs `canvas`) | `npm run test:generate-images` |

Please make sure **`npm run lint`, `npm run build`, and `npm test` all pass**
before opening a pull request. CI runs the same checks on Linux, macOS, and
Windows across Node 18/20/22.

## Code style

- ES modules, 2-space indentation.
- camelCase for variables/functions, PascalCase for classes, ALL_CAPS for
  module-level constants.
- Add JSDoc (with types) to public/exported functions.
- Keep `src/index.js`, `types/index.d.ts`, and `README.md` consistent when you
  change the public API.

See [`AGENTS.md`](AGENTS.md) for a deeper architecture map.

## Pull requests

1. Fork and create a feature branch.
2. Make your change, with tests where it makes sense.
3. Update `CHANGELOG.md` under an "Unreleased" heading.
4. Open the PR with a clear description of the problem and the fix.

## Reporting bugs

Open an [issue](https://github.com/themorgantown/alpha-mask-events/issues) with:

- What you expected vs. what happened.
- A minimal reproduction (a CodePen/JSFiddle or small HTML snippet is ideal).
- Browser/OS/Node versions as relevant.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
