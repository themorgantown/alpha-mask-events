#!/usr/bin/env node
/**
 * Read image files with transparency support (PNG, WebP, AVIF, etc.) 
 * and emit a compact bitmask for opaque pixels as rectangles.
 * 
 * Supports all formats that node-canvas can process with alpha channels:
 * - PNG (full alpha channel support)
 * - WebP (with transparency)
 * - AVIF (with transparency) 
 * - GIF (with transparency)
 * - And other formats supported by the canvas library
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Fix yargs import for ESM compatibility
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// `canvas` is an OPTIONAL native dependency. It is loaded lazily (only when the
// CLI actually processes images) so that importing this module for its pure
// helpers — or running argument validation — never requires the native build.

// Prevent CLI execution during test imports (but allow when called via execFile)
const isTestEnvironment = process.env.NODE_ENV === 'test' && process.env.JEST_WORKER_ID !== undefined && !process.argv.includes('--out');

let argv;
// Only parse arguments when not in test environment OR when explicitly called with arguments
if (!isTestEnvironment || process.argv.includes('--out')) {
  argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <images...> --out [file] --threshold [num]')
    .demandCommand(1)
    .option('out', { type: 'string', demandOption: true })
    .option('threshold', { type: 'number', default: 0.1 })
    .option('blur', { type: 'number', default: 1, describe: 'Blur radius in pixels' })
    .parse();
}

// Simple box blur on alpha channel
export function blurAlpha(data, width, height, radius) {
  // One averaged alpha value per pixel (data is RGBA, so width*height entries).
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      let sum = 0, count = 0;
      for (let dy = -radius; dy <= radius; ++dy) {
        for (let dx = -radius; dx <= radius; ++dx) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            sum += data[(ny * width + nx) * 4 + 3];
            count++;
          }
        }
      }
      out[y * width + x] = sum / count;
    }
  }
  return out;
}

// Find rectangles of contiguous opaque pixels in each row
export function maskToRects(mask, width, height) {
  const rects = [];
  for (let y = 0; y < height; ++y) {
    let x = 0;
    while (x < width) {
      // Find start of opaque run
      while (x < width && !mask[y * width + x]) x++;
      if (x >= width) break;
      let x0 = x;
      // Find end of opaque run
      while (x < width && mask[y * width + x]) x++;
      rects.push({ x: x0, y, w: x - x0, h: 1 });
    }
  }
  // Optionally, merge vertically adjacent rectangles
  // (left as an exercise for further compression)
  return rects;
}

/**
 * Detect image format from file path or URL
 * @param {string} path - File path or URL
 * @returns {string|null} - Detected format (lowercase) or null if unknown
 */
export function detectImageFormat(path) {
  // Remove query parameters and fragments from URL
  const cleanPath = path.split('?')[0].split('#')[0];
  const extension = cleanPath.toLowerCase().split('.').pop();
  
  const formatMap = {
    'png': 'png',
    'jpg': 'jpg', 
    'jpeg': 'jpeg',
    'webp': 'webp',
    'avif': 'avif',
    'gif': 'gif',
    'bmp': 'bmp',
    'tiff': 'tiff',
    'tif': 'tiff',
    'svg': 'svg',
    'ico': 'ico'
  };
  
  return formatMap[extension] || null;
}

/**
 * Validate if the file is a supported image format with potential transparency
 * @param {string} path - File path to validate
 * @returns {boolean} - True if format is potentially supported
 */
export function isSupportedImageFormat(path) {
  // Remove query parameters and fragments, similar to detectImageFormat
  const cleanPath = path.split('?')[0].split('#')[0];
  const extension = cleanPath.toLowerCase().split('.').pop();
  
  const supportedExtensions = ['.png', '.webp', '.avif', '.gif', '.bmp', '.tiff', '.jpg', '.jpeg', '.svg', '.ico'];
  return supportedExtensions.includes(`.${extension}`);
}

/**
 * Check if image has transparency by examining alpha channel
 * @param {ImageData} imageData - Canvas image data
 * @returns {boolean} - True if image has any transparency
 */
export function hasTransparency(imageData) {
  const { data } = imageData;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true; // Found non-opaque pixel
  }
  return false;
}

/**
 * Convert a set of images into per-image opaque-region rectangles.
 *
 * The native `canvas` module is injected so this function stays pure and
 * testable: callers pass either the real `canvas` package or a stub exposing
 * `loadImage` and `createCanvas`.
 *
 * @param {string[]} images - File paths or URLs to process.
 * @param {{ threshold?: number, blur?: number }} [opts] - Mask options.
 * @param {{ loadImage: Function, createCanvas: Function }} canvasModule - Canvas implementation.
 * @returns {Promise<{ output: Object, errors: Array<{ path: string, error: string }> }>}
 */
export async function processImages(images, opts = {}, canvasModule) {
  const { threshold = 0.1, blur = 1 } = opts;
  const { loadImage, createCanvas } = canvasModule;
  const output = {};
  const errors = [];

  for (const imagePath of images) {
    try {
      // Validate file format
      if (!isSupportedImageFormat(imagePath)) {
        // Unsupported extensions are silently skipped (no error).
        continue;
      }

      const img = await loadImage(imagePath);
      const { width, height } = img;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, width, height);

      const alpha = imageData.data;

      // Blur alpha channel
      const blurredAlpha = blurAlpha(alpha, width, height, blur);

      // Threshold to create mask
      const mask = [];
      for (let i = 0; i < width * height; ++i) {
        mask[i] = (blurredAlpha[i] / 255) > threshold ? 1 : 0;
      }

      // Convert mask to rectangles
      const rects = maskToRects(mask, width, height);

      output[imagePath] = { width, height, rects };
    } catch (error) {
      errors.push({ path: imagePath, error: error.message });
      // Continue processing other files instead of stopping
      continue;
    }
  }

  return { output, errors };
}

/**
 * Lazily load the optional native `canvas` module, printing platform-specific
 * install guidance and exiting cleanly if it is unavailable.
 * @returns {Promise<{ loadImage: Function, createCanvas: Function }>}
 */
async function loadCanvasOrExit() {
  try {
    const mod = await import('canvas');
    // CJS/ESM interop: named exports may live on the namespace or on `default`.
    const createCanvas = mod.createCanvas ?? mod.default?.createCanvas;
    const loadImage = mod.loadImage ?? mod.default?.loadImage;
    return { createCanvas, loadImage };
  } catch {
    const guide = {
      linux: 'sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev',
      darwin: 'brew install pkg-config cairo pango libpng jpeg giflib librsvg',
      win32: 'Install the build tools from https://github.com/Automattic/node-canvas/wiki/Installation:-Windows'
    }[process.platform];
    console.error('❌ The optional "canvas" package is required to generate masks but is not installed.');
    console.error('   Install it with:  npm install canvas');
    if (guide) console.error(`   System prerequisites: ${guide}`);
    process.exit(1);
  }
}

// Only run the main script if this file is executed directly (and arguments are available)
if (argv && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  (async () => {
    const canvasModule = await loadCanvasOrExit();

    for (const p of argv._) {
      console.log(`📸 Processing ${p}...`);
    }

    const { output, errors } = await processImages(
      argv._,
      { threshold: argv.threshold, blur: argv.blur },
      canvasModule
    );

    // Write output and show summary
    if (Object.keys(output).length > 0) {
      fs.writeFileSync(argv.out, JSON.stringify(output, null, 2));
      console.log(`\n🎉 Masks written to ${argv.out}`);
      console.log(`📊 Successfully processed ${Object.keys(output).length} images`);
    } else {
      console.error('\n❌ No images were successfully processed');
      process.exit(1);
    }

    if (errors.length > 0) {
      console.warn(`\n⚠️  ${errors.length} images failed to process:`);
      errors.forEach(({ path, error }) => console.warn(`   - ${path}: ${error}`));
    }
  })();
}