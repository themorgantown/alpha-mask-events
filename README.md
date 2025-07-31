# Alpha Mask Events

[![npm version](https://img.shields.io/npm/v/alpha-mask-events.svg)](https://www.npmjs.com/package/alpha-mask-events)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/themorgantown/alpha-mask-events)

> Enable click-through on transparent parts of images (PNG, WebP, AVIF, etc.) and background-images, making irregularly shaped UI elements behave naturally.

![Demo GIF](https://example.com/demo-of-alpha-mask-events.gif) 

## Why use Alpha Mask Events?

Ever been frustrated when:
- You had to use CSS clip-paths or complex SVG masks to make irregularly shaped elements clickable only on their visible parts?
- You wanted to stack elements and have clicks "fall through" the transparent regions?
- You just want to show the 'hand' cursor on SOLID parts of images? 

This lightweight library solves these problems with minimal setup and supports all modern image formats with transparency.

## Supported Image Formats

### ✅ Full Transparency Support
- **PNG** - Universal browser support, full alpha channel
- **WebP** - Modern browsers (Chrome 23+, Firefox 65+, Safari 14+), full alpha channel  
- **AVIF** - Latest browsers (Chrome 85+, Firefox 93+, Safari 16.4+), full alpha channel
- **SVG** - Modern browsers, transparency via CSS/opacity

### ⚠️ Limited Transparency Support  
- **GIF** - Universal support, binary transparency only
- **TIFF** - Limited browser support, some transparency capability
- **ICO** - Limited browser support, basic transparency

### ❌ No Transparency (processed with warnings)
- **JPEG/JPG** - Universal support, no transparency
- **BMP** - Limited support, no transparency

## Table of Contents
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Use Cases](#use-cases)
- [API Reference](#api-reference)
- [CLI Usage](#cli-usage)
- [Advanced Examples](#advanced-examples)
- [Browser Compatibility](#browser-compatibility)
- [Performance Tips](#performance-tips)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install alpha-mask-events
# or
yarn add alpha-mask-events
```

## Quick Start

### Method 1: Auto-detect images (recommended)

Add `.alpha-mask-events` class to any image or element with background-image:

```html
<img src="logo.png" class="alpha-mask-events" />
<img src="hero.webp" class="alpha-mask-events" />
<img src="avatar.avif" class="alpha-mask-events" />
<div class="alpha-mask-events" style="background-image: url('shape.png')"></div>
<div class="alpha-mask-events" style="background-image: url('icon.webp')"></div>
```

Initialize the library:

```js
import AME from 'alpha-mask-events';

// Initialize and auto-detect all elements with .alpha-mask-events class
AME.init();
```

### Method 2: Manual Registration

```js
import AME from 'alpha-mask-events';

// Initialize without auto-detection
const manager = AME.init({ autoScan: false });

// Register specific elements
AME.register('#logo');
AME.register(document.querySelector('.irregular-button'));
```

## CDN via JsDelivr

Grab the `<script>` code here: https://www.jsdelivr.com/package/npm/alpha-mask-events

JS: 
```
AlphaMaskEvents.init(); // Scan and activate all .alpha-mask-events
AlphaMaskEvents.register(document.querySelector('#myImg'), { threshold: 0.95 });
```

HTML: 
```
<img src="sprite.png" class="alpha-mask-events">
```


## Use Cases

### Interactive Maps with Irregularly Shaped Regions

```html
<div class="map-container">
  <img src="map-background.jpg" style="width: 100%; height: auto;" />
  <img src="region1.png" class="alpha-mask-events region" data-region="north" />
  <img src="region2.png" class="alpha-mask-events region" data-region="south" />
</div>

<script>
  import AME from 'alpha-mask-events';
  
  // Initialize click-through behavior
  AME.init();
  
  // Add click handlers to regions
  document.querySelectorAll('.region').forEach(region => {
    region.addEventListener('click', () => {
      alert(`You clicked the ${region.dataset.region} region!`);
    });
  });
</script>
```

### Dynamic UI with Overlapping Elements

```js
// Create a layered UI where clicks pass through transparent areas
const layers = document.querySelectorAll('.ui-layer');
layers.forEach(layer => AME.register(layer));

// Dynamically adjust threshold based on user interaction
document.getElementById('sensitivity-slider').addEventListener('change', (e) => {
  AME.setThreshold(e.target.value / 100);
});
```

### Shape-Conforming Buttons

Make clickable areas match the actual visible shape of buttons:

```html
<button class="shaped-button alpha-mask-events">
  <img src="button-shape.png" alt="Custom Button" />
  <span class="button-text">Click Me</span>
</button>

<style>
  .shaped-button {
    position: relative;
    background: transparent;
    border: none;
    padding: 0;
  }
  .button-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    pointer-events: none; /* Let clicks go through to the image */
  }
</style>
```

## API Reference

### init(options)
Initialize click-through manager on the page.

- **options** (object)
  - **threshold** (number, optional): Transparency cutoff (0–1). Pixels with alpha ≤ threshold are click-through. Default: `0.999`
  - **autoScan** (boolean, optional): Auto-detect elements with `.alpha-mask-events` class. Default: `true`
  - **log** (boolean, optional): Enable console logs for debugging. Default: `false`

Returns the manager instance.

### register(target, opts)
Register an element or selector for click-through.

- **target** (HTMLElement|string): Element or CSS selector
- **opts** (object, optional)
  - **threshold** (number, optional): Per-element transparency cutoff. Default: global threshold

### unregister(target)
Stop hit-testing and restore normal pointer behavior on the element.

- **target** (HTMLElement|string): Element or CSS selector

### setThreshold(value)
Adjust global transparency threshold.

- **value** (number): New threshold (0–1), where lower values make more pixels click-through

## Custom Events

Alpha Mask Events dispatches custom events when the mouse cursor transitions between opaque and transparent regions of registered elements.

### alpha-mask-over
Fired when the cursor moves from a transparent region to an opaque region (or enters an opaque region from outside the element).

### alpha-mask-out  
Fired when the cursor moves from an opaque region to a transparent region (or leaves an opaque region by exiting the element).

### Event Object Properties

Both events include a `detail` object with the following properties:

- **element** (HTMLElement): The element that triggered the event
- **alpha** (number): The alpha value (0-1) at the cursor position
- **coordinates** (object): Canvas coordinates `{ x: number, y: number }` where the event occurred
- **threshold** (number): The threshold value used for this element

### Usage Example

```javascript
import AME from 'alpha-mask-events';

// Initialize and register an element
AME.init();
const element = document.querySelector('.my-image');

// Listen for opacity transition events
element.addEventListener('alpha-mask-over', (event) => {
  console.log('Mouse entered opaque region');
  console.log('Alpha value:', event.detail.alpha);
  console.log('Coordinates:', event.detail.coordinates);
  console.log('Threshold:', event.detail.threshold);

  // Add visual feedback
  element.classList.add('hover-opaque');
});

element.addEventListener('alpha-mask-out', (event) => {
  console.log('Mouse left opaque region');
  
  // Remove visual feedback
  element.classList.remove('hover-opaque');
});
```

### TypeScript Support

```typescript
import AME, { AlphaMaskEvent } from 'alpha-mask-events';

const element = document.querySelector('.my-image') as HTMLElement;

element.addEventListener('alpha-mask-over', (event: AlphaMaskEvent) => {
  // TypeScript knows about event.detail properties
  const { alpha, coordinates, threshold, element } = event.detail;
  console.log(`Alpha: ${alpha}, Coords: ${coordinates.x},${coordinates.y}`);
});
```

## CLI Usage

Generate compact masks for opaque regions in transparent images (useful for server-side optimizations).

```bash
npx ame-generate-masks <images...> --out <file> [options]
```

**Supported formats**: PNG, WebP, AVIF, GIF, BMP, TIFF

**Examples:**
```bash
# Process multiple PNG files
npx ame-generate-masks sprites/*.png --out masks.json

# Process mixed formats with custom threshold
npx ame-generate-masks logo.png hero.webp avatar.avif --out masks.json --threshold 0.2

# Process with blur for smoother edges
npx ame-generate-masks button.png --out button-mask.json --blur 2
```

**Options:**
- **<images...>**: One or more image paths or glob patterns
- **--out** (string, required): Path to output JSON file
- **--threshold** (number, default: `0.1`): Opaque mask threshold (0–1)
- **--blur** (number, default: `1`): Box blur radius in pixels applied to alpha channel before thresholding

**Output format:**
```json
{
  "logo.png": {
    "width": 256,
    "height": 256,
    "rects": [
      { "x": 10, "y": 10, "w": 50, "h": 1 },
      { "x": 8, "y": 11, "w": 54, "h": 1 }
    ]
  },
  "hero.webp": {
    "width": 800,
    "height": 600,
    "rects": [...]
  }
}
```

## Advanced Examples

### React Integration

```jsx
import React, { useEffect, useRef } from 'react';
import AME from 'alpha-mask-events';

function TransparentButton({ imageUrl, onClick, threshold = 0.8 }) {
  const buttonRef = useRef(null);
  
  useEffect(() => {
    if (buttonRef.current) {
      // Register the element when component mounts
      AME.register(buttonRef.current, { threshold });
      
      // Clean up when component unmounts
      return () => {
        AME.unregister(buttonRef.current);
      };
    }
  }, [threshold]);
  
  return (
    <button 
      ref={buttonRef} 
      onClick={onClick}
      style={{ 
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        border: 'none',
        padding: '20px'
      }}
    />
  );
}

// Usage
function App() {
  useEffect(() => {
    AME.init({ log: process.env.NODE_ENV === 'development' });
  }, []);
  
  return (
    <div>
      <TransparentButton 
        imageUrl="/irregular-button.png"
        onClick={() => console.log('Button clicked!')}
        threshold={0.5}
      />
    </div>
  );
}
```

### Vue Integration

```vue
<template>
  <button 
    ref="transparentBtn"
    class="transparent-btn"
    @click="handleClick"
    :style="{ backgroundImage: `url(${imageUrl})` }"
  >
    <slot></slot>
  </button>
</template>

<script>
import AME from 'alpha-mask-events';

export default {
  props: {
    imageUrl: String,
    threshold: {
      type: Number,
      default: 0.8
    }
  },
  
  mounted() {
    // Initialize AME if this is the first component
    if (!this.$AME) {
      this.$AME = AME.init({ log: process.env.NODE_ENV === 'development' });
    }
    
    // Register this button
    AME.register(this.$refs.transparentBtn, { threshold: this.threshold });
  },
  
  beforeDestroy() {
    AME.unregister(this.$refs.transparentBtn);
  },
  
  methods: {
    handleClick() {
      this.$emit('click');
    }
  }
}
</script>

<style scoped>
.transparent-btn {
  background-size: contain;
  background-repeat: no-repeat;
  border: none;
  padding: 20px;
  cursor: pointer;
}
</style>
```

### Dynamic Content and Intersection Observer

For dynamic content or long pages, combine with IntersectionObserver for better performance:

```js
import AME from 'alpha-mask-events';

// Initialize
AME.init({ threshold: 0.8 });

// Setup IntersectionObserver to only process visible elements
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const el = entry.target;
    
    if (entry.isIntersecting) {
      // Element is visible, register it
      AME.register(el);
    } else {
      // Element is off-screen, unregister to save resources
      AME.unregister(el);
    }
  });
}, { rootMargin: '100px' });

// Observe all transparency-enabled elements
document.querySelectorAll('.alpha-mask-events').forEach(el => {
  observer.observe(el);
});
```

## Browser Compatibility

- Chrome 50+
- Firefox 50+
- Safari 11+
- Edge 18+
- iOS Safari 11+
- Android Browser 76+

Polyfill required for:
- `ResizeObserver` (for older browsers)
- `PointerEvent` (falls back to `touch` events on older mobile browsers)

## Performance Tips

1. **Use appropriate threshold values**:
   - Higher values (closer to 1.0) make fewer pixels click-through
   - Lower values (closer to 0.0) make more pixels click-through

2. **Optimize image sizes**:
   - Large images take longer to process
   - Consider resizing images to actual displayed dimensions

3. **Unregister elements when not needed**:
   - Use `AME.unregister()` for elements being removed from DOM

4. **Use the CLI tool for static masks**:
   - For static images, pre-generate mask data
   - Load JSON masks instead of analyzing images at runtime

## Development

- **Build**: `npm run build` (uses Rollup)
- **Test**: `npm test` (Jest)
- **Lint**: `npm run lint`

## Testing

The library includes comprehensive tests to ensure reliability:

### Browser Library Tests (`manager.test.js`)

- **Element Registration**: Verifies elements can be added to and removed from the registry
- **Threshold Management**: Tests that `setThreshold` updates all registered elements
- **Auto-scanning**: Confirms that `.alpha-mask-events` elements are automatically detected
- **Event Handling**: Validates pointer event handling infrastructure

### CLI Tool Tests (`generate-masks.test.js`)

- **Mask Generation**: Tests creation of JSON-based rectangle masks from PNG transparency
- **Output Validation**: Ensures generated masks contain proper width, height and rectangle data
- **Error Handling**: Verifies appropriate error when no images are provided
- **User Feedback**: Confirms proper success messages are displayed

Run all tests with `npm test`.

## Contributing

Contributions welcome! Please open an issue or pull request on GitHub.

## License

MIT