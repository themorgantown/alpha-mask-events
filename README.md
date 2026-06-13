# Alpha Mask Events

[![npm version](https://img.shields.io/npm/v/alpha-mask-events.svg)](https://www.npmjs.com/package/alpha-mask-events)
[![CI](https://github.com/themorgantown/alpha-mask-events/actions/workflows/ci.yml/badge.svg)](https://github.com/themorgantown/alpha-mask-events/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/node/v/alpha-mask-events.svg)](https://www.npmjs.com/package/alpha-mask-events)

> Make clicks fall through the **transparent** parts of an image and only land on the **opaque** pixels — so irregularly shaped PNG/WebP/AVIF elements behave naturally, without hand-authored CSS `clip-path` or SVG masks.

## Why use Alpha Mask Events?

## Highlights

- 🪶 **Zero runtime dependencies** in the browser bundle (~3 KB min). The native `canvas` package is *only* needed for the optional CLI.
- 🖼️ **Modern formats** — PNG, WebP, AVIF, SVG, plus graceful handling of GIF/JPEG/BMP/TIFF.
- 🎯 **Per-element thresholds** and live global threshold adjustment.
- 🔔 **Custom events** (`alpha-mask-over` / `alpha-mask-out`) for hover feedback.
- 🔄 **Auto-detection** of new/removed `.alpha-mask-events` elements via `MutationObserver`.
- ⚡ **Performance-aware** — `requestAnimationFrame` throttling, `ResizeObserver`, `IntersectionObserver`, and a shared image cache.
- 🧭 **CSS-transform aware** — handles rotated/scaled/skewed elements.
- 📦 **Ships ESM, CJS, and UMD** builds with TypeScript types.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Supported Image Formats](#supported-image-formats)
- [API Reference](#api-reference)
- [Custom Events](#custom-events)
- [Framework Integration](#framework-integration)
- [CLI: Pre-generating Masks](#cli-pre-generating-masks)
- [Browser Compatibility](#browser-compatibility)
- [Performance Tips](#performance-tips)
- [For AI Agents](#for-ai-agents)
- [Project Layout](#project-layout)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install alpha-mask-events
# or
yarn add alpha-mask-events
# or
pnpm add alpha-mask-events
```

> The browser library needs **no native build**. `canvas` is declared as an
> *optional* dependency and is required only if you use the
> [`ame-generate-masks` CLI](#cli-pre-generating-masks). If `canvas` fails to
> install on your platform, the library still works perfectly in the browser.

### CDN (no build step)

```html
<script src="https://cdn.jsdelivr.net/npm/alpha-mask-events@1/dist/alpha-mask-events.umd.min.js"></script>
<script>
  AlphaMaskEvents.init(); // scans and activates every .alpha-mask-events element
</script>
```

Browse versions on [jsDelivr](https://www.jsdelivr.com/package/npm/alpha-mask-events).

## Quick Start

### 1. Auto-detect (recommended)

Add the `alpha-mask-events` class to any `<img>` or element with a `background-image`:

```html
<img src="logo.png"   class="alpha-mask-events" />
<img src="hero.webp"  class="alpha-mask-events" />
<img src="avatar.avif" class="alpha-mask-events" />
<div class="alpha-mask-events" style="background-image: url('shape.png')"></div>
```

```js
import AME from 'alpha-mask-events';

AME.init(); // auto-detects all .alpha-mask-events elements (now and in the future)
```

### 2. Manual registration

```js
import AME from 'alpha-mask-events';

AME.init({ autoScan: false });          // initialize without scanning
AME.register('#logo');                   // by selector
AME.register(document.querySelector('.irregular-button'), { threshold: 0.95 });
```

## How It Works

1. For each registered element, an **off-screen canvas** is created and the
   image (respecting `background-size`/`background-position`) is drawn into it.
2. On pointer movement (throttled with `requestAnimationFrame`), the pixel under
   the cursor is sampled with `getImageData`, mapping screen → canvas
   coordinates and accounting for any CSS transform.
3. If the sampled alpha is **above** the threshold the element becomes
   interactive (`pointer-events: auto`); otherwise clicks **pass through**
   (`pointer-events: none`).
4. Transitions across the opaque/transparent boundary dispatch
   [`alpha-mask-over` / `alpha-mask-out`](#custom-events) events.

Cross-origin images are supported when served with proper CORS headers
(`crossorigin="anonymous"`); if a canvas becomes tainted, a conservative
geometric fallback is used instead of throwing.

## Supported Image Formats

| Format | Transparency | Browser support | Notes |
| ------ | ------------ | --------------- | ----- |
| **PNG**  | ✅ Full alpha | Universal | Best general choice |
| **WebP** | ✅ Full alpha | Chrome 23+, Firefox 65+, Safari 14+ | |
| **AVIF** | ✅ Full alpha | Chrome 85+, Firefox 93+, Safari 16.4+ | |
| **SVG**  | ✅ Via opacity/CSS | Modern | |
| **GIF**  | ⚠️ Binary only | Universal | On/off transparency |
| **TIFF / ICO** | ⚠️ Limited | Limited | |
| **JPEG / BMP** | ❌ None | Universal / Limited | Registered with a console warning |

## API Reference

The default export and named exports are equivalent:

```js
import AME from 'alpha-mask-events';
// or: import { init, register, unregister, setThreshold } from 'alpha-mask-events';
```

### `init(options?) → Manager`

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `threshold` | `number` | `0.999` | Alpha cutoff (0–1). Pixels with alpha **>** threshold are opaque/clickable. |
| `autoScan` | `boolean` | `true` | Auto-detect `.alpha-mask-events` elements. |
| `log` | `boolean` | `false` | Verbose console logging for debugging. |
| `useIntersectionObserver` | `boolean` | `true` | Skip hit-testing for off-screen elements. |
| `intersectionRootMargin` | `string` | `'100px'` | Root margin for the `IntersectionObserver`. |

Returns the singleton `Manager` instance.

### `register(target, opts?)`

Register an element or CSS selector for hit-testing.

- `target` — `HTMLElement | string`
- `opts.threshold` — `number` (per-element override of the global threshold)

### `unregister(target)`

Stop hit-testing and restore the element's original `pointer-events`.

### `setThreshold(value)`

Adjust the **global** threshold (0–1); applies to all registered elements.

## Custom Events

Registered elements dispatch events as the cursor crosses the opaque/transparent
boundary:

- **`alpha-mask-over`** — cursor entered an opaque region.
- **`alpha-mask-out`** — cursor left an opaque region (or the element).

Each event's `detail` contains:

| Property | Type | Description |
| -------- | ---- | ----------- |
| `element` | `HTMLElement` | The element that fired the event |
| `alpha` | `number` | Sampled alpha (0–1) at the cursor |
| `coordinates` | `{ x: number, y: number }` | Canvas-space coordinates |
| `threshold` | `number` | Threshold used for this element |

```js
const el = document.querySelector('.my-image');
el.addEventListener('alpha-mask-over', (e) => el.classList.add('hover-opaque'));
el.addEventListener('alpha-mask-out',  (e) => el.classList.remove('hover-opaque'));
```

### TypeScript

```ts
import AME, { AlphaMaskEvent } from 'alpha-mask-events';

const el = document.querySelector('.my-image') as HTMLElement;
el.addEventListener('alpha-mask-over', (event: AlphaMaskEvent) => {
  const { alpha, coordinates, threshold } = event.detail;
  console.log(`alpha=${alpha} at ${coordinates.x},${coordinates.y} (>${threshold})`);
});
```

## Framework Integration

### React

```jsx
import { useEffect, useRef } from 'react';
import AME from 'alpha-mask-events';

function TransparentButton({ imageUrl, onClick, threshold = 0.8 }) {
  const ref = useRef(null);

  useEffect(() => {
    AME.register(ref.current, { threshold });
    return () => AME.unregister(ref.current);
  }, [threshold]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: 'contain', border: 'none' }}
    />
  );
}
```

### Vue 3

```vue
<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import AME from 'alpha-mask-events';

const props = defineProps({ imageUrl: String, threshold: { type: Number, default: 0.8 } });
const btn = ref(null);

onMounted(() => AME.register(btn.value, { threshold: props.threshold }));
onBeforeUnmount(() => AME.unregister(btn.value));
</script>

<template>
  <button ref="btn" :style="{ backgroundImage: `url(${imageUrl})` }"><slot /></button>
</template>
```

### Lazy registration with IntersectionObserver

```js
import AME from 'alpha-mask-events';
AME.init({ threshold: 0.8 });

const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => (e.isIntersecting ? AME.register(e.target) : AME.unregister(e.target)));
}, { rootMargin: '100px' });

document.querySelectorAll('.alpha-mask-events').forEach((el) => io.observe(el));
```

> More patterns (product customizers, interactive infographics, maps) live in
> [`demo/examples.md`](demo/examples.md).

## CLI: Pre-generating Masks

For server-side hit-testing or to avoid decoding images at runtime, pre-compute
compact opaque-region masks with the bundled CLI.

```bash
npx ame-generate-masks <images...> --out masks.json [--threshold 0.1] [--blur 1]
```

| Option | Default | Description |
| ------ | ------- | ----------- |
| `<images...>` | — | One or more image paths or glob patterns |
| `--out` | *(required)* | Output JSON file |
| `--threshold` | `0.1` | Alpha threshold; pixels above are opaque |
| `--blur` | `1` | Box-blur radius applied to alpha before thresholding |

```bash
npx ame-generate-masks sprites/*.png --out masks.json
npx ame-generate-masks logo.png hero.webp avatar.avif --out masks.json --threshold 0.2
```

Output:

```json
{
  "logo.png": {
    "width": 256,
    "height": 256,
    "rects": [{ "x": 10, "y": 10, "w": 50, "h": 1 }]
  }
}
```

### Installing the CLI's native dependency

The CLI decodes images with [`node-canvas`](https://github.com/Automattic/node-canvas),
which needs system libraries. The library prints these instructions if `canvas`
is missing — install them, then run `npm install canvas`:

| OS | Command |
| -- | ------- |
| **Debian/Ubuntu** | `sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev` |
| **macOS (Homebrew)** | `brew install pkg-config cairo pango libpng jpeg giflib librsvg` |
| **Windows** | See the [node-canvas Windows guide](https://github.com/Automattic/node-canvas/wiki/Installation:-Windows) |

## Browser Compatibility

Chrome 50+ · Firefox 50+ · Safari 11+ · Edge 18+ · iOS Safari 11+ · Android 76+.

`ResizeObserver`, `IntersectionObserver`, and `PointerEvent` are used when
available; provide polyfills for very old browsers.

## Performance Tips

1. **Image caching is automatic** — elements sharing a `src` share one cached `Image`.
2. **Pick a sensible threshold** — higher = fewer clickable pixels.
3. **Size images to display dimensions** — smaller canvases sample faster.
4. **Unregister removed elements** — `AME.unregister(el)` (or rely on the `MutationObserver`).
5. **Pre-generate masks** with the [CLI](#cli-pre-generating-masks) for static images.

## For AI Agents

This repo is set up to be agent-friendly:

- **[`AGENTS.md`](AGENTS.md)** — architecture map, conventions, and the exact
  commands to build/test/lint. Start there.
- **[`CLAUDE.md`](CLAUDE.md)** — Claude Code–specific guidance.
- In a fresh environment, run `npm install --ignore-scripts` to get a working
  toolchain without building the native `canvas` module (it's optional and only
  used by the CLI), then `npm run lint && npm run build && npm test`.

Quick map of the public surface:

| Symbol | File | Purpose |
| ------ | ---- | ------- |
| `init` / `register` / `unregister` / `setThreshold` | `src/index.js` | Public API |
| `Manager` | `src/manager.js` | Hit-testing, observers, event dispatch |
| `ame-generate-masks` | `bin/generate-masks.js` | Offline mask generation CLI |
| Types | `types/index.d.ts` | TypeScript definitions |

## Project Layout

```
src/         Browser library (ESM source; bundled to dist/ by Rollup)
bin/         ame-generate-masks CLI (Node)
types/       TypeScript declarations
__tests__/   Jest tests (jsdom for the browser, node for the CLI)
demo/        Interactive demo (deployed to GitHub Pages)
dist/        Build output (generated; not committed)
```

## Development

```bash
npm install          # install deps (canvas is optional; safe to skip building it)
npm run build        # bundle ESM/CJS/UMD via Rollup
npm test             # run the Jest suite
npm run lint         # ESLint (src + bin)
```

Run a single test file:

```bash
node --experimental-vm-modules ./node_modules/jest/bin/jest.js __tests__/manager.test.js
```

CLI integration tests automatically **skip** when the native `canvas` module is
unavailable, so the suite stays green on every OS. CI runs lint + build + test
on Linux, macOS, and Windows across Node 18/20/22.

## Contributing

Contributions welcome! Please read [`CONTRIBUTING.md`](CONTRIBUTING.md), open an
issue to discuss substantial changes, and make sure `npm run lint`, `npm run
build`, and `npm test` all pass before submitting a PR.

## License

[MIT](LICENSE) © Daniel Morgan
