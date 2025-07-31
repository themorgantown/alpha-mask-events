# Test Images Setup Guide

This directory contains test images for the alpha-mask-events project. These images are used to test support for various image formats with transparency.

## Required Test Images

### Core Transparency Test Images (100x100 pixels)

1. **`transparent.png`** - PNG with alpha channel
   - Should have regions with different alpha values (0, 128, 255)
   - Pattern: Checkerboard or simple shapes work well

2. **`transparent.webp`** - WebP with alpha channel  
   - Same transparency pattern as PNG
   - Ensures WebP transparency detection works

3. **`transparent.avif`** - AVIF with alpha channel
   - Same transparency pattern as PNG
   - Tests latest image format support

4. **`transparent.gif`** - GIF with binary transparency
   - Only fully transparent (0) and fully opaque (255) pixels
   - Tests limited transparency format

5. **`opaque.jpg`** - JPEG without transparency
   - Fully opaque image (all alpha = 255)
   - Tests non-transparent format handling

6. **`opaque.png`** - PNG without transparency
   - All pixels should have alpha = 255
   - Tests edge case of transparent format without transparency

### Extended Test Images

7. **`complex.png`** (200x200 pixels)
   - Complex transparency patterns with gradients
   - Semi-transparent regions
   - Tests real-world scenarios

8. **`icon.svg`** - SVG with transparency
   - Simple SVG with transparent elements
   - Tests vector format support

## Creating Test Images

### Using ImageMagick (recommended)

```bash
# Create base transparent PNG (100x100 with checkerboard transparency)
magick -size 100x100 pattern:checkerboard -alpha set -channel A -fx "(i+j)%2*0.5+0.5" transparent.png

# Convert to other formats
magick transparent.png transparent.webp
magick transparent.png transparent.avif  # Requires AVIF support
magick transparent.png transparent.gif

# Create opaque images
magick -size 100x100 xc:red opaque.jpg
magick -size 100x100 xc:blue opaque.png

# Create complex transparency pattern
magick -size 200x200 gradient: -alpha set -channel A -fx "cos((i-100)*pi/50)*cos((j-100)*pi/50)*0.5+0.5" complex.png
```

### Using Canvas (Node.js script)

A Node.js script using the canvas library to generate test images:

```javascript
// See create-test-images.js in this directory
```

## Testing Usage

These images are referenced in the test files:
- `__tests__/format-support.test.js`
- `__tests__/cli-format-support.test.js`
- `__tests__/manager.test.js`

The paths should be: `__tests__/fixtures/[filename]`

## Browser Compatibility Notes

- **PNG**: Universal support
- **WebP**: Chrome 23+, Firefox 65+, Safari 14+
- **AVIF**: Chrome 85+, Firefox 93+, Safari 16.4+
- **GIF**: Universal support (binary transparency only)
- **JPEG**: Universal support (no transparency)
- **SVG**: Modern browsers (IE9+)
