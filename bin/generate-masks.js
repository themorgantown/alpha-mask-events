#!/usr/bin/env node
/**
 * ame-generate-masks
 *
 * Read image files with transparency support (PNG, WebP, AVIF, GIF, TIFF, ...)
 * and emit a compact bitmask of opaque pixels as per-row rectangles. The output
 * is useful for server-side hit-testing or for pre-computing masks so the
 * browser library does not have to decode images at runtime.
 *
 * Image decoding is delegated to the native `canvas` package, which is declared
 * as an OPTIONAL dependency. The browser library does not need it; it is only
 * required for this command-line tool. If `canvas` is unavailable, the CLI
 * prints platform-specific installation guidance instead of crashing.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// --- Pure helpers (exported for tests; none of these require `canvas`) ---------

/**
 * Simple separable-free box blur over the alpha channel of RGBA pixel data.
 * @param {Uint8ClampedArray|Array<number>} data - RGBA pixel data
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @param {number} radius - Blur radius in pixels
 * @returns {Float32Array} Blurred alpha values (one per pixel, 0-255)
 */
export function blurAlpha(data, width, height, radius) {
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

/**
 * Convert a binary mask into contiguous horizontal runs (one rectangle per run).
 * @param {Array<number>|Uint8Array} mask - 1 for opaque, 0 for transparent
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @returns {Array<{x:number,y:number,w:number,h:number}>} Opaque rectangles
 */
export function maskToRects(mask, width, height) {
  const rects = [];
  for (let y = 0; y < height; ++y) {
    let x = 0;
    while (x < width) {
      while (x < width && !mask[y * width + x]) x++;
      if (x >= width) break;
      const x0 = x;
      while (x < width && mask[y * width + x]) x++;
      rects.push({ x: x0, y, w: x - x0, h: 1 });
    }
  }
  return rects;
}

/**
 * Detect image format from a file path or URL.
 * @param {string} filePath - File path or URL
 * @returns {string|null} Detected format (lowercase) or null if unknown
 */
export function detectImageFormat(filePath) {
  const cleanPath = filePath.split('?')[0].split('#')[0];
  const extension = cleanPath.toLowerCase().split('.').pop();

  const formatMap = {
    png: 'png',
    jpg: 'jpg',
    jpeg: 'jpeg',
    webp: 'webp',
    avif: 'avif',
    gif: 'gif',
    bmp: 'bmp',
    tiff: 'tiff',
    tif: 'tiff',
    svg: 'svg',
    ico: 'ico'
  };

  return formatMap[extension] || null;
}

/**
 * Whether the file extension is a supported image format.
 * @param {string} filePath - File path to validate
 * @returns {boolean} True if format is potentially supported
 */
export function isSupportedImageFormat(filePath) {
  const cleanPath = filePath.split('?')[0].split('#')[0];
  const extension = cleanPath.toLowerCase().split('.').pop();
  const supportedExtensions = ['png', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'tif', 'jpg', 'jpeg', 'svg', 'ico'];
  return supportedExtensions.includes(extension);
}

/**
 * Check whether image data contains any non-opaque pixel.
 * @param {{data: (Uint8ClampedArray|Array<number>)}} imageData - Canvas image data
 * @returns {boolean} True if the image has any transparency
 */
export function hasTransparency(imageData) {
  const { data } = imageData;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

/**
 * Lazily load the optional `canvas` dependency. Returns null (after printing
 * actionable, platform-specific guidance) when it cannot be loaded.
 * @returns {Promise<{createCanvas: Function, loadImage: Function}|null>}
 */
export async function loadCanvas() {
  try {
    const canvas = await import('canvas');
    return { createCanvas: canvas.createCanvas, loadImage: canvas.loadImage };
  } catch {
    const platform = process.platform;
    const hint =
      platform === 'darwin'
        ? 'macOS (Homebrew):\n    brew install pkg-config cairo pango libpng jpeg giflib librsvg'
        : platform === 'win32'
          ? 'Windows:\n    See https://github.com/Automattic/node-canvas/wiki/Installation:-Windows'
          : 'Debian/Ubuntu:\n    sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev';

    console.error(
      [
        '❌ The "canvas" package is required for the ame-generate-masks CLI but could not be loaded.',
        '',
        '   "canvas" is an OPTIONAL native dependency. The browser library does not need it.',
        '   Install the system libraries below, then reinstall:',
        '',
        `   ${hint}`,
        '',
        '   Then run:  npm install canvas',
        ''
      ].join('\n')
    );
    return null;
  }
}

/**
 * Process a list of image paths into a mask map.
 * @param {string[]} paths - Image paths to process
 * @param {{threshold:number, blur:number}} opts - Processing options
 * @param {{createCanvas: Function, loadImage: Function}} canvas - Canvas implementation
 * @returns {Promise<{output: Object, errors: Array<{path:string,error:string}>}>}
 */
export async function processImages(paths, opts, canvas) {
  const { createCanvas, loadImage } = canvas;
  const output = {};
  const errors = [];

  for (const imgPath of paths) {
    try {
      if (!isSupportedImageFormat(imgPath)) {
        console.warn(`⚠️  Skipping ${imgPath}: Unsupported format. Supported: PNG, WebP, AVIF, GIF, BMP, TIFF`);
        continue;
      }

      console.log(`📸 Processing ${imgPath}...`);
      const img = await loadImage(imgPath);
      const surface = createCanvas(img.width, img.height);
      const ctx = surface.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { width, height } = img;
      const imageData = ctx.getImageData(0, 0, width, height);

      if (!hasTransparency(imageData)) {
        console.warn(`⚠️  ${imgPath}: No transparency detected, but processing anyway...`);
      }

      const blurredAlpha = blurAlpha(imageData.data, width, height, opts.blur);

      const mask = new Uint8Array(width * height);
      for (let i = 0; i < width * height; ++i) {
        mask[i] = (blurredAlpha[i] / 255) > opts.threshold ? 1 : 0;
      }

      const rects = maskToRects(mask, width, height);
      output[imgPath] = { width, height, rects };
      console.log(`✅ Successfully processed ${imgPath} (${width}x${height}, ${rects.length} rectangles)`);
    } catch (error) {
      console.error(`❌ Failed to process ${imgPath}: ${error.message}`);
      errors.push({ path: imgPath, error: error.message });
    }
  }

  return { output, errors };
}

// --- CLI entry point -----------------------------------------------------------

async function main() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <images...> --out <file> [--threshold <num>] [--blur <num>]')
    .demandCommand(1, 'Provide at least one image path or glob.')
    .option('out', { type: 'string', demandOption: true, describe: 'Output JSON file path' })
    .option('threshold', { type: 'number', default: 0.1, describe: 'Alpha threshold (0-1); pixels above are opaque' })
    .option('blur', { type: 'number', default: 1, describe: 'Box blur radius in pixels' })
    .strict()
    .help()
    .parse();

  const canvas = await loadCanvas();
  if (!canvas) {
    process.exit(1);
  }

  const { output, errors } = await processImages(
    argv._.map(String),
    { threshold: argv.threshold, blur: argv.blur },
    canvas
  );

  if (Object.keys(output).length > 0) {
    fs.writeFileSync(argv.out, JSON.stringify(output, null, 2));
    console.log(`\n🎉 Masks written to ${argv.out}`);
    console.log(`📊 Successfully processed ${Object.keys(output).length} image(s)`);
  } else {
    console.error('\n❌ No images were successfully processed');
    process.exit(1);
  }

  if (errors.length > 0) {
    console.warn(`\n⚠️  ${errors.length} image(s) failed to process:`);
    errors.forEach(({ path: p, error }) => console.warn(`   - ${p}: ${error}`));
  }
}

// Only run as a CLI when executed directly (not when imported by tests).
const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  main();
}
