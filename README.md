# Alpha Mask Events

[![npm version](https://img.shields.io/npm/v/alpha-mask-events.svg)](https://www.npmjs.com/package/alpha-mask-events)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/themorgantown/alpha-mask-events)

> Enable click-through on transparent parts of PNGs and background-images, making irregularly shaped UI elements behave naturally.

![Demo GIF](https://example.com/demo-of-alpha-mask-events.gif) 

## Why use Alpha Mask Events?

Ever been frustrated when:
- You had to use CSS clip-paths or complex SVG masks to make irregularly shaped elements clickable only on their visible parts?
- You wanted to stack elements and have clicks "fall through" the transparent regions?
- You just want to show the 'hand' cursor on SOLID parts of images? 

This lightweight library solves these problems with minimal setup.

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
<div class="alpha-mask-events" style="background-image: url('shape.png')"></div>
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

## CLI Usage

Generate compact masks for opaque regions in PNG files (useful for server-side optimizations).

```bash
npx ame-generate-masks <images...> --out <file> [options]
```

- **<images...>**: One or more image paths or glob patterns
- **--out** (string, required): Path to output JSON file
- **--threshold** (number, default: `0.1`): Opaque mask threshold (0–1)
- **--blur** (number, default: `1`): Box blur radius in pixels applied to alpha channel before thresholding

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
   - Use `CT.unregister()` for elements being removed from DOM

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