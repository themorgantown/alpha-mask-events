# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test/Lint Commands
- Build: `npm run build`
- Test all: `npm test`
- Run single test: `node --experimental-vm-modules node_modules/.bin/jest __tests__/filename.test.js`
- Lint: `npm run lint`

## Code Style Guidelines
- Use ES modules (`import`/`export`) - project has `"type": "module"`
- Add JSDoc comments for functions with parameter types
- Use TypeScript interfaces in types/index.d.ts for public API
- Format: 2-space indentation
- Naming: camelCase for variables/functions, PascalCase for classes
- Error handling: Use try/catch blocks with conditional logging based on `log` flag
- Constants declared at module top level (ALL_CAPS for global constants)
- Browser compatibility: Include fallbacks for modern APIs (e.g., PointerEvent)
- Use null checks with `&&` operator for conditional execution
- Export both named exports and a default object in public API modules