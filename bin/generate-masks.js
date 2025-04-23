#!/usr/bin/env node
/**
 * Read PNG files and emit a compact bitmask for opaque pixels as rectangles.
 */

import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';
// Fix yargs import for ESM compatibility
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <images...> --out [file] --threshold [num]')
  .demandCommand(1)
  .option('out', { type: 'string', demandOption: true })
  .option('threshold', { type: 'number', default: 0.1 })
  .option('blur', { type: 'number', default: 1, describe: 'Blur radius in pixels' })
  .parse();

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

(async () => {
  const output = {};
  for (const path of argv._) {
    const img = await loadImage(path);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { width, height } = img;
    const imageData = ctx.getImageData(0, 0, width, height);
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
  }
  fs.writeFileSync(argv.out, JSON.stringify(output, null, 2));
  console.log(`Masks written to ${argv.out}`);
})();