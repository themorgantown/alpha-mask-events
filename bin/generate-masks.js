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
import { createCanvas, loadImage } from 'canvas';
// Fix yargs import for ESM compatibility
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

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
function blurAlpha(data, width, height, radius) {
  const out = new Float32Array(data.length);
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
function maskToRects(mask, width, height) {
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

// Only run the main script if this file is executed directly (and arguments are available)
if (import.meta.url === `file://${process.argv[1]}` && argv) {
  (async () => {
    const output = {};
    const errors = [];
    
    for (const path of argv._) {
      try {
        // Validate file format
        if (!isSupportedImageFormat(path)) {
          console.warn(`⚠️  Skipping ${path}: Unsupported format. Supported: PNG, WebP, AVIF, GIF, BMP, TIFF`);
          continue;
        }

        console.log(`📸 Processing ${path}...`);
        const img = await loadImage(path);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const { width, height } = img;
        const imageData = ctx.getImageData(0, 0, width, height);

        // Check if image actually has transparency
        if (!hasTransparency(imageData)) {
          console.warn(`⚠️  ${path}: No transparency detected, but processing anyway...`);
        }

        let alpha = imageData.data;

        // Blur alpha channel
        const blurredAlpha = blurAlpha(alpha, width, height, argv.blur);

        // Threshold to create mask
        const mask = [];
        for (let i = 0; i < width * height; ++i) {
          mask[i] = (blurredAlpha[i] / 255) > argv.threshold ? 1 : 0;
        }

        // Convert mask to rectangles
        const rects = maskToRects(mask, width, height);

        output[path] = { width, height, rects };
        console.log(`✅ Successfully processed ${path} (${width}x${height}, ${rects.length} rectangles)`);
        
      } catch (error) {
        const errorMsg = `❌ Failed to process ${path}: ${error.message}`;
        console.error(errorMsg);
        errors.push({ path, error: error.message });
        
        // Continue processing other files instead of stopping
        continue;
      }
    }
    
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